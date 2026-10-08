<?php
declare(strict_types=1);

namespace App\Repositories;

use InvalidArgumentException;
use PDO;
use PDOException;
use App\Support\BrokerDocuments;

require_once dirname(__DIR__) . '/Support/auth-validation.php';
require_once dirname(__DIR__) . '/Support/BrokerDocuments.php';

final class SellerProfileRepository
{
    private const SELLER_TYPES = ['individual', 'company', 'broker'];
    private const APPLICATION_STATUSES = ['draft', 'pending_review', 'verified', 'corrections_requested', 'rejected', 'suspended'];

    private PDO $pdo;
    private BrokerDocuments $documents;

    public function __construct(PDO $pdo, ?BrokerDocuments $documents = null)
    {
        $this->pdo = $pdo;
        $this->documents = $documents ?? new BrokerDocuments();
    }

    public function findByUserId(int $userId, bool $lock = false): ?array
    {
        if ($userId < 1) {
            return null;
        }
        if ($lock) { return $this->currentProfileForUser($userId); }

        $statement = $this->pdo->prepare(
            'SELECT
                sp.user_id,
                sp.seller_type,
                sp.legal_name,
                sp.display_name,
                sp.phone,
                sp.company_name,
                sp.business_registration_no,
                sp.government_id_no,
                sp.prc_registration_no,
                sp.prc_valid_until,
                sp.prc_front_json,
                sp.prc_back_json,
                sp.application_revision,
                sp.address_line,
                sp.barangay,
                sp.city,
                sp.authorization_basis,
                sp.application_status,
                sp.review_notes,
                sp.submitted_at,
                sp.reviewed_at,
                sp.reviewed_by_user_id,
                sp.created_at,
                sp.updated_at,
                u.name AS user_name,
                u.email AS user_email,
                u.profile_image_url,
                u.identity_verification_status,
                u.identity_verified_at,
                u.email_verified_at,
                u.account_status,
                reviewer.name AS reviewed_by_name,
                COUNT(DISTINCT p.id) AS listing_count,
                SUM(CASE WHEN LOWER(COALESCE(p.approval_state, \'\')) = \'pending_review\' THEN 1 ELSE 0 END) AS pending_listing_count
             FROM seller_profiles sp
             INNER JOIN users u ON u.id = sp.user_id
             LEFT JOIN users reviewer ON reviewer.id = sp.reviewed_by_user_id
             LEFT JOIN properties p ON p.seller_user_id = sp.user_id
             WHERE sp.user_id = :user_id
             GROUP BY
                sp.user_id,
                sp.seller_type,
                sp.legal_name,
                sp.display_name,
                sp.phone,
                sp.company_name,
                sp.business_registration_no,
                sp.government_id_no,
                sp.prc_registration_no,
                sp.prc_valid_until,
                sp.prc_front_json,
                sp.prc_back_json,
                sp.application_revision,
                sp.address_line,
                sp.barangay,
                sp.city,
                sp.authorization_basis,
                sp.application_status,
                sp.review_notes,
                sp.submitted_at,
                sp.reviewed_at,
                sp.reviewed_by_user_id,
                sp.created_at,
                sp.updated_at,
                u.name,
                u.email,
                u.profile_image_url,
                u.identity_verification_status,
                u.identity_verified_at,
                u.email_verified_at,
                u.account_status,
                reviewer.name
             LIMIT 1'
        );
        $statement->execute(['user_id' => $userId]);

        $row = $statement->fetch();
        return is_array($row) ? $this->hydrate($row, true) : null;
    }

    /** Current reads bypass an earlier REPEATABLE READ snapshot during mutations. */
    private function currentProfileForUser(int $userId): ?array
    {
        $account = $this->pdo->prepare('SELECT name, email, profile_image_url, identity_verification_status, identity_verified_at, email_verified_at, account_status FROM users WHERE id = :id FOR UPDATE');
        $account->execute(['id' => $userId]);
        $user = $account->fetch();
        if (!is_array($user)) { return null; }
        $statement = $this->pdo->prepare('SELECT * FROM seller_profiles WHERE user_id = :id FOR UPDATE');
        $statement->execute(['id' => $userId]);
        $row = $statement->fetch();
        if (!is_array($row)) { return null; }
        $row = array_merge($row, $user, ['user_name' => $user['name'], 'user_email' => $user['email'], 'reviewed_by_name' => null]);
        if (!empty($row['reviewed_by_user_id'])) {
            $reviewer = $this->pdo->prepare('SELECT name FROM users WHERE id = :id');
            $reviewer->execute(['id' => $row['reviewed_by_user_id']]);
            $row['reviewed_by_name'] = $reviewer->fetchColumn() ?: null;
        }
        // Counts are presentation data; never lock unrelated listings or reviewers.
        $counts = $this->pdo->prepare('SELECT COUNT(*) AS listing_count, SUM(CASE WHEN approval_state = \'pending_review\' THEN 1 ELSE 0 END) AS pending_listing_count FROM properties WHERE seller_user_id = :id');
        $counts->execute(['id' => $userId]);
        $row = array_merge($row, $counts->fetch() ?: []);
        return $this->hydrate($row, true, true);
    }

    public function findOrInitializeByUser(array $user): array
    {
        $userId = (int) ($user['id'] ?? 0);
        $profile = $this->findByUserId($userId);
        if ($profile !== null) {
            return $profile;
        }

        return $this->defaultProfile($this->sellerUser($userId, $user));
    }

    public function queue(?string $status = null): array
    {
        $where = '';
        $params = [];
        if ($status !== null && strtolower(trim($status)) !== 'all') {
            if (strtolower(trim($status)) === 'blocked') {
                $where = "WHERE u.account_status = 'blocked'";
            } else {
                $where = 'WHERE sp.application_status = :application_status';
                $params['application_status'] = $this->normalizeApplicationStatus($status);
            }
        }

        $statement = $this->pdo->prepare(
            'SELECT
                sp.user_id,
                sp.seller_type,
                sp.legal_name,
                sp.display_name,
                sp.phone,
                sp.company_name,
                sp.business_registration_no,
                sp.government_id_no,
                sp.prc_registration_no,
                sp.prc_valid_until,
                sp.prc_front_json,
                sp.prc_back_json,
                sp.application_revision,
                sp.address_line,
                sp.barangay,
                sp.city,
                sp.authorization_basis,
                sp.application_status,
                sp.review_notes,
                sp.submitted_at,
                sp.reviewed_at,
                sp.reviewed_by_user_id,
                sp.created_at,
                sp.updated_at,
                u.name AS user_name,
                u.email AS user_email,
                u.profile_image_url,
                u.identity_verification_status,
                u.identity_verified_at,
                u.email_verified_at,
                u.account_status,
                reviewer.name AS reviewed_by_name,
                COUNT(DISTINCT p.id) AS listing_count,
                SUM(CASE WHEN LOWER(COALESCE(p.approval_state, \'\')) = \'pending_review\' THEN 1 ELSE 0 END) AS pending_listing_count
             FROM seller_profiles sp
             INNER JOIN users u ON u.id = sp.user_id
             LEFT JOIN users reviewer ON reviewer.id = sp.reviewed_by_user_id
             LEFT JOIN properties p ON p.seller_user_id = sp.user_id
             ' . ($where !== '' ? $where . " AND sp.seller_type = 'broker'" : "WHERE sp.seller_type = 'broker'") . '
             GROUP BY
                sp.user_id,
                sp.seller_type,
                sp.legal_name,
                sp.display_name,
                sp.phone,
                sp.company_name,
                sp.business_registration_no,
                sp.government_id_no,
                sp.prc_registration_no,
                sp.prc_valid_until,
                sp.prc_front_json,
                sp.prc_back_json,
                sp.application_revision,
                sp.address_line,
                sp.barangay,
                sp.city,
                sp.authorization_basis,
                sp.application_status,
                sp.review_notes,
                sp.submitted_at,
                sp.reviewed_at,
                sp.reviewed_by_user_id,
                sp.created_at,
                sp.updated_at,
                u.name,
                u.email,
                u.profile_image_url,
                u.identity_verification_status,
                u.identity_verified_at,
                u.email_verified_at,
                u.account_status,
                reviewer.name
             ORDER BY
                CASE sp.application_status
                    WHEN \'pending_review\' THEN 0
                    WHEN \'corrections_requested\' THEN 1
                    WHEN \'rejected\' THEN 2
                    WHEN \'verified\' THEN 3
                    WHEN \'suspended\' THEN 4
                    ELSE 5
                END,
                COALESCE(sp.submitted_at, sp.updated_at, sp.created_at) DESC,
                sp.user_id DESC'
        );
        $statement->execute($params);

        return array_map(
            fn (array $row): array => $this->hydrate($row, true),
            $statement->fetchAll()
        );
    }

    public function createOrUpdateForUser(int $userId, array $payload, bool $submit = false, array $documents = []): array
    {
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) { $this->pdo->beginTransaction(); }
        try {
            $lock = $this->pdo->prepare('SELECT id FROM users WHERE id = :id FOR UPDATE');
            $lock->execute(['id' => $userId]);
            $user = $this->sellerUser($userId, null, true);
            $existing = $this->findByUserId($userId, true);
            $normalized = $this->normalizePayload($payload, $user, $existing, $submit, $documents);

            $this->assertUniqueFields($normalized, $userId);
            if ($existing !== null) { $this->preserveLegacyReview($existing); }

            if ($existing === null) {
                $statement = $this->pdo->prepare(
                    'INSERT INTO seller_profiles (
                        user_id, seller_type, legal_name, display_name, phone, company_name,
                        business_registration_no, government_id_no, address_line, barangay, city,
                        prc_registration_no, prc_valid_until,
                        prc_front_json, prc_back_json, application_revision,
                        authorization_basis, application_status, review_notes, submitted_at,
                        reviewed_at, reviewed_by_user_id
                     ) VALUES (
                        :user_id, :seller_type, :legal_name, :display_name, :phone, :company_name,
                        :business_registration_no, :government_id_no, :address_line, :barangay, :city,
                        :prc_registration_no, :prc_valid_until,
                        :prc_front_json, :prc_back_json, :application_revision,
                        :authorization_basis, :application_status, :review_notes, :submitted_at,
                        :reviewed_at, :reviewed_by_user_id
                     )'
                );
                $this->executeProfileStatement($statement, array_merge(['user_id' => $userId], $normalized));
            } else {
                $statement = $this->pdo->prepare(
                    'UPDATE seller_profiles
                     SET seller_type = :seller_type,
                         legal_name = :legal_name,
                         display_name = :display_name,
                         phone = :phone,
                         company_name = :company_name,
                         business_registration_no = :business_registration_no,
                         government_id_no = :government_id_no,
                         prc_registration_no = :prc_registration_no,
                         prc_valid_until = :prc_valid_until,
                         prc_front_json = :prc_front_json,
                         prc_back_json = :prc_back_json,
                         application_revision = :application_revision,
                         address_line = :address_line,
                         barangay = :barangay,
                         city = :city,
                         authorization_basis = :authorization_basis,
                         application_status = :application_status,
                         review_notes = :review_notes,
                         submitted_at = :submitted_at,
                         reviewed_at = :reviewed_at,
                         reviewed_by_user_id = :reviewed_by_user_id
                     WHERE user_id = :user_id'
                );
                $this->executeProfileStatement($statement, array_merge(['user_id' => $userId], $normalized));
            }

            $profile = $this->findByUserId($userId, true);
            if ($profile === null) {
                throw new InvalidArgumentException('Unable to save the seller verification profile.');
            }
            if ($ownsTransaction) { $this->pdo->commit(); }
            return $profile;
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) { $this->pdo->rollBack(); }
            throw $exception;
        }
    }

    private function executeProfileStatement(\PDOStatement $statement, array $params): void
    {
        try {
            $statement->execute($params);
        } catch (PDOException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 1062) {
                foreach ([
                    'uniq_seller_profiles_prc' => ['prc_registration_no', 'This PRC registration number is already associated with another account.'],
                    'uniq_seller_profiles_phone' => ['phone', 'This contact number is already associated with another broker account.'],
                    'uniq_seller_profiles_business_reg' => ['business_registration_no', 'This business registration number is already associated with another account.'],
                    'uniq_seller_profiles_government_id' => ['government_id_no', 'This government ID number is already associated with another account.'],
                ] as $constraint => [$field, $message]) {
                    if (str_contains($exception->getMessage(), $constraint)) {
                        throw new \SfcAuthValidationException([$field => $message]);
                    }
                }
            }
            throw $exception;
        }
    }

    public function registrationDuplicateErrors(array $payload): array
    {
        $errors = [];
        $prc = \sfc_normalize_prc_number(\sfc_auth_string($payload['prc_registration_no'] ?? ''));
        if (preg_match('/^[0-9]{1,20}$/', $prc) === 1) {
            $statement = $this->pdo->prepare('SELECT user_id FROM seller_profiles WHERE prc_canonical_no = :value LIMIT 1');
            $statement->execute(['value' => $prc]);
            if ($statement->fetch()) {
                $errors['prc_registration_no'] = 'This PRC registration number is already associated with another account.';
            }
        }
        $phone = \sfc_auth_string($payload['phone'] ?? '');
        if ($phone !== '') {
            $statement = $this->pdo->prepare('SELECT user_id FROM seller_profiles WHERE phone = :value LIMIT 1');
            $statement->execute(['value' => $phone]);
            if ($statement->fetch()) {
                $errors['phone'] = 'This contact number is already associated with another broker account.';
            }
        }
        return $errors;
    }

    public function review(int $userId, string $status, ?int $reviewedByUserId = null, ?string $reviewNotes = null, bool $prcChecked = false, ?string $findings = null, ?int $expectedRevision = null): array
    {
        $decision = match (strtolower(trim($status))) {
            'approved', 'approve', 'verified' => 'verified',
            'request_corrections', 'corrections_requested' => 'corrections_requested',
            'reject', 'rejected' => 'rejected',
            'block', 'blocked', 'suspended' => 'blocked',
            default => throw new InvalidArgumentException('Choose approve, request corrections, reject, or block.'),
        };
        $reason = string_or_null($reviewNotes);
        $findings = string_or_null($findings);
        if ($reason === null || mb_strlen($reason) > 5000 || mb_strlen((string) $findings) > 5000) {
            throw new InvalidArgumentException('Document your decision with a reason (up to 5,000 characters).');
        }
        if ($decision === 'blocked' && $findings === null) {
            throw new InvalidArgumentException('Document the confirmed review findings before blocking account access.');
        }
        if ($decision === 'verified' && !$prcChecked) {
            throw new InvalidArgumentException('Confirm that you checked the broker registration with PRC.');
        }
        if ($reviewedByUserId === null || $reviewedByUserId < 1 || $reviewedByUserId === $userId) {
            throw new InvalidArgumentException('An authorized independent broker reviewer is required.');
        }
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) { $this->pdo->beginTransaction(); }
        try {
            // Application writes and reviews acquire the applicant account before the profile.
            $account = $this->pdo->prepare('SELECT id, role, account_status FROM users WHERE id = :id FOR UPDATE');
            $account->execute(['id' => $userId]);
            $applicant = $account->fetch();
            if (!is_array($applicant) || $applicant['role'] !== 'seller') { throw new InvalidArgumentException('Broker account not found.'); }
            // Lock current privileges so revocation cannot race a decision from a stale session.
            $reviewer = $this->pdo->prepare('SELECT id, role, department, broker_review_authorized, account_status, identity_verification_status FROM users WHERE id = :id FOR UPDATE');
            $reviewer->execute(['id' => $reviewedByUserId]);
            $reviewerUser = $reviewer->fetch();
            if (!is_array($reviewerUser) || ($reviewerUser['account_status'] ?? '') !== 'active' || !\sfc_can_review_brokers($reviewerUser)) {
                throw new InvalidArgumentException('An explicitly authorized CAO or LEBDO reviewer is required.');
            }
            $lock = $this->pdo->prepare('SELECT user_id FROM seller_profiles WHERE user_id = :id FOR UPDATE');
            $lock->execute(['id' => $userId]);
            $profile = $this->findByUserId($userId, true);
            if ($profile === null || $profile['sellerType'] !== 'broker') {
                throw new InvalidArgumentException('Broker application not found.');
            }
            $this->preserveLegacyReview($profile);
            if ($expectedRevision !== null && $expectedRevision !== $profile['applicationRevision']) {
                throw new InvalidArgumentException('This application changed after you opened it. Refresh the queue and review the current documents.');
            }
            if ($profile['applicationStatus'] === 'draft') {
                throw new InvalidArgumentException('The applicant must submit the application before review.');
            }
            if (($profile['accountStatus'] ?? '') === 'blocked' && $decision !== 'blocked') {
                throw new InvalidArgumentException('This account is blocked. An authorized account administrator must restore access before a new application review.');
            }
            $last = $this->pdo->prepare('SELECT id, reviewer_user_id, decision, reason, findings, application_revision, snapshot_json FROM broker_application_reviews WHERE user_id = :id ORDER BY id DESC LIMIT 1 FOR UPDATE');
            $last->execute(['id' => $userId]);
            $previous = $last->fetch();
            $previousSnapshot = is_array($previous) ? json_decode((string) ($previous['snapshot_json'] ?? ''), true) : null;
            if (is_array($previous) && ($previousSnapshot['source'] ?? '') !== 'legacy_review' && (int) $previous['reviewer_user_id'] === $reviewedByUserId && (int) $previous['application_revision'] === $profile['applicationRevision'] && $previous['decision'] === $decision && $previous['reason'] === $reason && (string) ($previous['findings'] ?? '') === (string) $findings) {
                if ($ownsTransaction) { $this->pdo->commit(); }
                $profile['reviewId'] = (int) $previous['id'];
                $profile['duplicateDecision'] = true;
                return $profile;
            }
            if ($decision === 'verified') {
                $this->validateBrokerCredentials($profile['legalName'], $profile['prcRegistrationNo'], $profile['prcValidUntil']);
                foreach (['front', 'back'] as $side) {
                    $metadata = $this->documentMetadataForUser($userId, $side);
                    if ($metadata === null) { throw new InvalidArgumentException('Both PRC ID images are required before approval. Request corrections for missing documents.'); }
                    $this->documents->assertStored($metadata);
                }
            }
            $applicationStatus = $decision === 'blocked' ? 'rejected' : $decision;
            $reviewedAt = gmdate('Y-m-d H:i:s');
            $statement = $this->pdo->prepare('UPDATE seller_profiles SET application_status = :status, review_notes = :reason, reviewed_at = :reviewed_at, reviewed_by_user_id = :reviewer WHERE user_id = :id');
            $statement->execute(['id' => $userId, 'status' => $applicationStatus, 'reason' => $reason, 'reviewed_at' => $reviewedAt, 'reviewer' => $reviewedByUserId]);
            $identity = match ($decision) { 'verified' => 'verified', 'corrections_requested' => 'pending', default => 'rejected' };
            $statement = $this->pdo->prepare('UPDATE users SET identity_verification_status = :identity, identity_verified_at = :verified_at' . ($decision === 'blocked' ? ', account_status = \'blocked\', session_version = session_version + 1' : '') . ' WHERE id = :id');
            $statement->execute(['id' => $userId, 'identity' => $identity, 'verified_at' => $decision === 'verified' ? $reviewedAt : null]);
            $snapshot = [
                'legalName' => $profile['legalName'], 'prcRegistrationNo' => $profile['prcRegistrationNo'], 'prcValidUntil' => $profile['prcValidUntil'],
                'frontDocument' => $this->documentMetadataForUser($userId, 'front'), 'backDocument' => $this->documentMetadataForUser($userId, 'back'), 'prcChecked' => $prcChecked,
            ];
            $statement = $this->pdo->prepare('INSERT INTO broker_application_reviews (user_id, reviewer_user_id, application_revision, decision, reason, findings, snapshot_json, created_at) VALUES (:id, :reviewer, :revision, :decision, :reason, :findings, :snapshot, :created_at)');
            $statement->execute(['id' => $userId, 'reviewer' => $reviewedByUserId, 'revision' => $profile['applicationRevision'], 'decision' => $decision, 'reason' => $reason, 'findings' => $findings, 'snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR), 'created_at' => $reviewedAt]);
            $reviewId = (int) $this->pdo->lastInsertId();
            $updated = $this->findByUserId($userId, true);
            if ($ownsTransaction) { $this->pdo->commit(); }
            $updated['reviewId'] = $reviewId;
            $updated['duplicateDecision'] = false;
            return $updated;
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) { $this->pdo->rollBack(); }
            throw $exception;
        }
    }

    public function reviewHistory(int $userId, bool $lock = false): array
    {
        $locking = $lock && $this->pdo->inTransaction();
        $statement = $this->pdo->prepare($locking
            ? 'SELECT br.* FROM broker_application_reviews br WHERE br.user_id = :id ORDER BY br.id DESC FOR UPDATE'
            : 'SELECT br.*, u.name AS reviewer_name FROM broker_application_reviews br LEFT JOIN users u ON u.id = br.reviewer_user_id WHERE br.user_id = :id ORDER BY br.id DESC');
        $statement->execute(['id' => $userId]);
        return array_map(function (array $row) use ($locking): array {
            if ($locking) {
                $reviewer = $this->pdo->prepare('SELECT name FROM users WHERE id = :id');
                $reviewer->execute(['id' => $row['reviewer_user_id']]);
                $row['reviewer_name'] = $reviewer->fetchColumn() ?: null;
            }
            $snapshot = json_decode((string) ($row['snapshot_json'] ?? ''), true);
            return [
                'id' => (int) $row['id'], 'reviewerUserId' => (int) $row['reviewer_user_id'], 'reviewerName' => $row['reviewer_name'] ?? null,
                'applicationRevision' => (int) $row['application_revision'], 'decision' => $row['decision'], 'reason' => $row['reason'], 'findings' => $row['findings'], 'createdAt' => $row['created_at'],
                'source' => (string) ($snapshot['source'] ?? 'review'),
                'frontDocument' => $this->documents->publicMetadata($snapshot['frontDocument'] ?? null), 'backDocument' => $this->documents->publicMetadata($snapshot['backDocument'] ?? null),
            ];
        }, $statement->fetchAll());
    }

    /** Raw metadata is internal only; callers must authorize document reads. */
    public function documentMetadataForUser(int $userId, string $side, ?string $documentId = null): ?array
    {
        if (!in_array($side, ['front', 'back'], true)) { throw new InvalidArgumentException('Choose the front or back PRC image.'); }
        $lock = $this->pdo->inTransaction() ? ' FOR UPDATE' : '';
        $statement = $this->pdo->prepare('SELECT prc_' . $side . '_json AS metadata FROM seller_profiles WHERE user_id = :id' . $lock);
        $statement->execute(['id' => $userId]);
        $metadata = $this->decodeDocument($statement->fetchColumn());
        if ($documentId === null || ($metadata['id'] ?? null) === $documentId) { return $metadata; }
        // Historic credentials remain available solely within the same applicant's audit history.
        $statement = $this->pdo->prepare('SELECT snapshot_json FROM broker_application_reviews WHERE user_id = :id ORDER BY id DESC' . $lock);
        $statement->execute(['id' => $userId]);
        foreach ($statement->fetchAll() as $row) {
            $snapshot = json_decode((string) ($row['snapshot_json'] ?? ''), true);
            $document = $snapshot[$side . 'Document'] ?? null;
            if (is_array($document) && ($document['id'] ?? null) === $documentId) { return $document; }
        }
        return null;
    }

    private function sellerUser(int $userId, ?array $fallback = null, bool $lock = false): array
    {
        if ($userId < 1) {
            throw new InvalidArgumentException('A valid seller account is required.');
        }

        if (is_array($fallback) && (int) ($fallback['id'] ?? 0) === $userId && ($fallback['role'] ?? null) === 'seller') {
            return [
                'id' => $userId,
                'role' => 'seller',
                'name' => (string) ($fallback['name'] ?? ''),
                'email' => (string) ($fallback['email'] ?? ''),
                'profileImageUrl' => string_or_null($fallback['profileImageUrl'] ?? null),
                'identityVerificationStatus' => (string) ($fallback['identityVerificationStatus'] ?? 'unverified'),
                'identityVerifiedAt' => $fallback['identityVerifiedAt'] ?? null,
                'accountStatus' => $fallback['accountStatus'] ?? 'active',
                'emailVerifiedAt' => $fallback['emailVerifiedAt'] ?? null,
            ];
        }

        $statement = $this->pdo->prepare(
            'SELECT id, role, name, email, profile_image_url, identity_verification_status, identity_verified_at, account_status, email_verified_at
             FROM users
             WHERE id = :id
             LIMIT 1' . ($lock ? ' FOR UPDATE' : '')
        );
        $statement->execute(['id' => $userId]);
        $row = $statement->fetch();
        if (!is_array($row) || ($row['role'] ?? null) !== 'seller') {
            throw new InvalidArgumentException('Seller account not found.');
        }

        return [
            'id' => (int) ($row['id'] ?? 0),
            'role' => 'seller',
            'name' => (string) ($row['name'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
            'profileImageUrl' => string_or_null($row['profile_image_url'] ?? null),
            'identityVerificationStatus' => (string) ($row['identity_verification_status'] ?? 'unverified'),
            'identityVerifiedAt' => $row['identity_verified_at'] !== null ? (string) $row['identity_verified_at'] : null,
            'accountStatus' => (string) ($row['account_status'] ?? 'active'),
            'emailVerifiedAt' => $row['email_verified_at'] ?? null,
        ];
    }

    private function normalizePayload(array $payload, array $user, ?array $existing, bool $submit, array $documents = [], bool $requireDocuments = true): array
    {
        if (in_array($user['accountStatus'] ?? '', ['blocked', 'disabled', 'suspended'], true)) {
            throw new InvalidArgumentException('This account cannot update or submit a broker application. Contact support.');
        }
        $sellerType = $this->normalizeSellerType((string) ($payload['seller_type'] ?? $payload['sellerType'] ?? ($existing['sellerType'] ?? 'individual')));
        $legalName = string_or_null($payload['legal_name'] ?? $payload['legalName'] ?? null)
            ?? string_or_null($existing['legalName'] ?? null)
            ?? string_or_null($user['name'] ?? null);
        $displayName = string_or_null($payload['display_name'] ?? $payload['displayName'] ?? null)
            ?? string_or_null($existing['displayName'] ?? null);
        $phone = string_or_null($payload['phone'] ?? null) ?? string_or_null($existing['phone'] ?? null);
        $companyName = string_or_null($payload['company_name'] ?? $payload['companyName'] ?? null)
            ?? string_or_null($existing['companyName'] ?? null);
        $businessRegistrationNo = string_or_null($payload['business_registration_no'] ?? $payload['businessRegistrationNo'] ?? null)
            ?? string_or_null($existing['businessRegistrationNo'] ?? null);
        $governmentIdNo = string_or_null($payload['government_id_no'] ?? $payload['governmentIdNo'] ?? null)
            ?? string_or_null($existing['governmentIdNo'] ?? null);
        $prcRegistrationNo = string_or_null($payload['prc_registration_no'] ?? $payload['prcRegistrationNo'] ?? null)
            ?? string_or_null($existing['prcRegistrationNo'] ?? null);
        $prcValidUntil = string_or_null($payload['prc_valid_until'] ?? $payload['prcValidUntil'] ?? null)
            ?? string_or_null($existing['prcValidUntil'] ?? null);
        if ($prcValidUntil !== null) {
            if (!preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/', $prcValidUntil)) {
                throw new InvalidArgumentException('Enter the valid-until date on your PRC ID.');
            }
            $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $prcValidUntil);
            if ($date === false || $date->format('Y-m-d') !== $prcValidUntil) {
                throw new InvalidArgumentException('Enter the valid-until date on your PRC ID.');
            }
        }
        $addressLine = string_or_null($payload['address_line'] ?? $payload['addressLine'] ?? null)
            ?? string_or_null($existing['addressLine'] ?? null);
        $barangay = string_or_null($payload['barangay'] ?? null) ?? string_or_null($existing['barangay'] ?? null);
        $city = string_or_null($payload['city'] ?? null)
            ?? string_or_null($existing['city'] ?? null)
            ?? 'San Fernando, La Union';
        $authorizationBasis = string_or_null($payload['authorization_basis'] ?? $payload['authorizationBasis'] ?? null)
            ?? string_or_null($existing['authorizationBasis'] ?? null);

        $applicationStatus = $existing['applicationStatus'] ?? $this->identityToApplicationStatus((string) ($user['identityVerificationStatus'] ?? 'unverified'));
        $reviewNotes = string_or_null($existing['reviewNotes'] ?? null);
        $submittedAt = $existing['submittedAt'] ?? null;
        $reviewedAt = $existing['reviewedAt'] ?? null;
        $reviewedByUserId = $existing['reviewedByUserId'] ?? null;
        $profileUserId = (int) ($user['id'] ?? 0);
        $frontDocument = $documents['front'] ?? ($existing !== null && $profileUserId > 0 ? $this->documentMetadataForUser($profileUserId, 'front') : null);
        $backDocument = $documents['back'] ?? ($existing !== null && $profileUserId > 0 ? $this->documentMetadataForUser($profileUserId, 'back') : null);
        foreach ($documents as $document) { $this->documents->assertStored($document); }
        $applicationRevision = (int) ($existing['applicationRevision'] ?? 0);

        foreach ([[$legalName, 190], [$phone, 60], [$addressLine, 255], [$city, 120], [$companyName, 190], [$businessRegistrationNo, 120], [$governmentIdNo, 120], [$authorizationBasis, 190], [$displayName, 190], [$barangay, 120], [$prcRegistrationNo, 40]] as [$value, $limit]) {
            if (mb_strlen((string) $value) > $limit) {
                throw new InvalidArgumentException('A broker profile field exceeds its maximum length.');
            }
        }
        if ($existing !== null && ($existing['applicationStatus'] ?? '') === 'suspended') {
            throw new InvalidArgumentException('This account is suspended. Contact support.');
        }
        // License changes and replacements must receive a fresh documented review.
        if ($existing !== null && in_array($applicationStatus, ['verified', 'pending_review'], true) && (
            $legalName !== ($existing['legalName'] ?? null)
            || \sfc_normalize_prc_number((string) $prcRegistrationNo) !== \sfc_normalize_prc_number((string) ($existing['prcRegistrationNo'] ?? ''))
            || $prcValidUntil !== ($existing['prcValidUntil'] ?? null)
            || $sellerType !== ($existing['sellerType'] ?? null)
            || $documents !== []
        )) {
            $submit = true;
        }

        if ($submit) {
            $this->validateSubmissionFields(
                $sellerType,
                $legalName,
                $phone,
                $sellerType === 'broker' ? $prcRegistrationNo : $governmentIdNo,
                $addressLine,
                $city,
                $authorizationBasis,
                $businessRegistrationNo
            );
            if ($sellerType === 'broker') {
                $this->validateBrokerCredentials($legalName, $prcRegistrationNo, $prcValidUntil);
                if ($requireDocuments) {
                    $errors = [];
                    if ($frontDocument === null) { $errors['prc_front'] = 'Upload the front of your PRC ID before submitting.'; }
                    if ($backDocument === null) { $errors['prc_back'] = 'Upload the back of your PRC ID before submitting.'; }
                    if ($errors !== []) { throw new \SfcAuthValidationException($errors); }
                    $this->documents->assertStored($frontDocument);
                    $this->documents->assertStored($backDocument);
                }
            }
            $unchangedPending = $existing !== null && $applicationStatus === 'pending_review'
                && $sellerType === ($existing['sellerType'] ?? null)
                && $legalName === ($existing['legalName'] ?? null)
                && $displayName === ($existing['displayName'] ?? null)
                && $phone === ($existing['phone'] ?? null)
                && $companyName === ($existing['companyName'] ?? null)
                && $businessRegistrationNo === ($existing['businessRegistrationNo'] ?? null)
                && $governmentIdNo === ($existing['governmentIdNo'] ?? null)
                && $prcRegistrationNo === ($existing['prcRegistrationNo'] ?? null)
                && $prcValidUntil === ($existing['prcValidUntil'] ?? null)
                && $addressLine === ($existing['addressLine'] ?? null)
                && $barangay === ($existing['barangay'] ?? null)
                && $city === ($existing['city'] ?? null)
                && $authorizationBasis === ($existing['authorizationBasis'] ?? null)
                && ($frontDocument['id'] ?? null) === ($existing['frontDocument']['id'] ?? null)
                && ($backDocument['id'] ?? null) === ($existing['backDocument']['id'] ?? null);
            if (!$unchangedPending) {
                $applicationStatus = 'pending_review';
                $reviewNotes = null;
                $submittedAt = gmdate('Y-m-d H:i:s');
                $reviewedAt = null;
                $reviewedByUserId = null;
                $applicationRevision++;
            }
        } elseif ($existing === null) {
            $applicationStatus = 'draft';
        }

        return [
            'seller_type' => $sellerType,
            'legal_name' => $legalName,
            'display_name' => $displayName,
            'phone' => $phone,
            'company_name' => $companyName,
            'business_registration_no' => $businessRegistrationNo,
            'government_id_no' => $governmentIdNo,
            'prc_registration_no' => $prcRegistrationNo,
            'prc_valid_until' => $prcValidUntil,
            'prc_front_json' => $frontDocument !== null ? json_encode($frontDocument, JSON_THROW_ON_ERROR) : null,
            'prc_back_json' => $backDocument !== null ? json_encode($backDocument, JSON_THROW_ON_ERROR) : null,
            'application_revision' => $applicationRevision,
            'address_line' => $addressLine,
            'barangay' => $barangay,
            'city' => $city,
            'authorization_basis' => $authorizationBasis,
            'application_status' => $applicationStatus,
            'review_notes' => $reviewNotes,
            'submitted_at' => $submittedAt,
            'reviewed_at' => $reviewedAt,
            'reviewed_by_user_id' => $reviewedByUserId,
        ];
    }

    private function validateSubmissionFields(
        string $sellerType,
        ?string $legalName,
        ?string $phone,
        ?string $governmentIdNo,
        ?string $addressLine,
        ?string $city,
        ?string $authorizationBasis,
        ?string $businessRegistrationNo
    ): void {
        if ($legalName === null) {
            throw new InvalidArgumentException('A legal or business name is required.');
        }
        if ($phone === null) {
            throw new InvalidArgumentException('A seller contact number is required.');
        }
        if (!preg_match('/^[+()0-9 .-]{7,30}$/', $phone)) {
            throw new InvalidArgumentException('Enter a valid contact number.');
        }
        if ($governmentIdNo === null) {
            throw new InvalidArgumentException('A PRC registration or identity number is required.');
        }
        if ($addressLine === null) {
            throw new InvalidArgumentException('A business or mailing address is required.');
        }
        if ($city === null) {
            throw new InvalidArgumentException('A city is required.');
        }
        if ($authorizationBasis === null) {
            throw new InvalidArgumentException('Please describe your authority to represent the property.');
        }
        if ($sellerType === 'company' && $businessRegistrationNo === null) {
            throw new InvalidArgumentException('A business registration or broker license number is required for this seller type.');
        }
    }

    private function assertUniqueFields(array $payload, int $userId): void
    {
        $this->assertUniqueValue('phone', $payload['phone'], $userId, 'That phone number is already attached to another seller account.');
        $this->assertUniqueValue('government_id_no', $payload['government_id_no'], $userId, 'That government ID or license number is already attached to another seller account.');
        $this->assertUniqueValue('business_registration_no', $payload['business_registration_no'], $userId, 'That business registration number is already attached to another seller account.');
        $this->assertUniqueValue('prc_registration_no', $payload['prc_registration_no'], $userId, 'This PRC registration number is already associated with another account.');
    }

    private function assertUniqueValue(string $column, ?string $value, int $userId, string $message): void
    {
        if ($value === null) {
            return;
        }

        $statement = $this->pdo->prepare(
            sprintf(
                'SELECT user_id
                 FROM seller_profiles
                 WHERE %s = :value
                   AND user_id <> :user_id
                 LIMIT 1',
                $column === 'prc_registration_no' ? 'prc_canonical_no' : $column
            )
        );
        $statement->execute([
            'value' => $column === 'prc_registration_no' ? \sfc_normalize_prc_number($value) : $value,
            'user_id' => $userId,
        ]);

        if ($statement->fetch()) {
            throw new \SfcAuthValidationException([$column => $message]);
        }
    }

    private function defaultProfile(array $user): array
    {
        return [
            'userId' => (int) ($user['id'] ?? 0),
            'sellerType' => 'individual',
            'legalName' => (string) ($user['name'] ?? ''),
            'displayName' => (string) ($user['name'] ?? ''),
            'phone' => null,
            'companyName' => null,
            'businessRegistrationNo' => null,
            'governmentIdNo' => null,
            'prcRegistrationNo' => null,
            'prcValidUntil' => null,
            'frontDocument' => null,
            'backDocument' => null,
            'applicationRevision' => 0,
            'reviewHistory' => [],
            'addressLine' => null,
            'barangay' => null,
            'city' => 'San Fernando, La Union',
            'authorizationBasis' => null,
            'applicationStatus' => $this->identityToApplicationStatus((string) ($user['identityVerificationStatus'] ?? 'unverified')),
            'reviewNotes' => null,
            'submittedAt' => null,
            'reviewedAt' => null,
            'reviewedByUserId' => null,
            'reviewedByName' => null,
            'createdAt' => null,
            'updatedAt' => null,
            'name' => (string) ($user['name'] ?? ''),
            'email' => (string) ($user['email'] ?? ''),
            'profileImageUrl' => string_or_null($user['profileImageUrl'] ?? null),
            'identityVerificationStatus' => (string) ($user['identityVerificationStatus'] ?? 'unverified'),
            'identityVerifiedAt' => $user['identityVerifiedAt'] ?? null,
            'emailVerifiedAt' => $user['emailVerifiedAt'] ?? null,
            'accountStatus' => $user['accountStatus'] ?? 'active',
            'listingCount' => 0,
            'pendingListingCount' => 0,
            'hasProfile' => false,
        ];
    }

    private function hydrate(array $row, bool $hasProfile, bool $lock = false): array
    {
        return [
            'userId' => (int) ($row['user_id'] ?? 0),
            'sellerType' => $this->normalizeSellerType((string) ($row['seller_type'] ?? 'individual')),
            'legalName' => $row['legal_name'] !== null ? (string) $row['legal_name'] : '',
            'displayName' => $row['display_name'] !== null ? (string) $row['display_name'] : null,
            'phone' => $row['phone'] !== null ? (string) $row['phone'] : null,
            'companyName' => $row['company_name'] !== null ? (string) $row['company_name'] : null,
            'businessRegistrationNo' => $row['business_registration_no'] !== null ? (string) $row['business_registration_no'] : null,
            'governmentIdNo' => $row['government_id_no'] !== null ? (string) $row['government_id_no'] : null,
            'prcRegistrationNo' => $row['prc_registration_no'] ?? null,
            'prcValidUntil' => $row['prc_valid_until'] ?? null,
            'frontDocument' => $this->documents->publicMetadata($this->decodeDocument($row['prc_front_json'] ?? null)),
            'backDocument' => $this->documents->publicMetadata($this->decodeDocument($row['prc_back_json'] ?? null)),
            'applicationRevision' => (int) ($row['application_revision'] ?? 0),
            'reviewHistory' => $this->reviewHistory((int) ($row['user_id'] ?? 0), $lock),
            'addressLine' => $row['address_line'] !== null ? (string) $row['address_line'] : null,
            'barangay' => $row['barangay'] !== null ? (string) $row['barangay'] : null,
            'city' => $row['city'] !== null ? (string) $row['city'] : 'San Fernando, La Union',
            'authorizationBasis' => $row['authorization_basis'] !== null ? (string) $row['authorization_basis'] : null,
            'applicationStatus' => $this->normalizeApplicationStatus((string) ($row['application_status'] ?? 'draft')),
            'reviewNotes' => $row['review_notes'] !== null ? (string) $row['review_notes'] : null,
            'submittedAt' => $row['submitted_at'] !== null ? (string) $row['submitted_at'] : null,
            'reviewedAt' => $row['reviewed_at'] !== null ? (string) $row['reviewed_at'] : null,
            'reviewedByUserId' => isset($row['reviewed_by_user_id']) ? int_or_null($row['reviewed_by_user_id']) : null,
            'reviewedByName' => $row['reviewed_by_name'] !== null ? (string) $row['reviewed_by_name'] : null,
            'createdAt' => $row['created_at'] !== null ? (string) $row['created_at'] : null,
            'updatedAt' => $row['updated_at'] !== null ? (string) $row['updated_at'] : null,
            'name' => (string) ($row['user_name'] ?? ''),
            'email' => (string) ($row['user_email'] ?? ''),
            'profileImageUrl' => string_or_null($row['profile_image_url'] ?? null),
            'identityVerificationStatus' => (string) ($row['identity_verification_status'] ?? 'unverified'),
            'identityVerifiedAt' => $row['identity_verified_at'] !== null ? (string) $row['identity_verified_at'] : null,
            'emailVerifiedAt' => $row['email_verified_at'] ?? null,
            'accountStatus' => $row['account_status'] ?? 'active',
            'listingCount' => (int) ($row['listing_count'] ?? 0),
            'pendingListingCount' => (int) ($row['pending_listing_count'] ?? 0),
            'hasProfile' => $hasProfile,
        ];
    }

    private function normalizeSellerType(string $sellerType): string
    {
        $normalized = strtolower(trim($sellerType));
        return in_array($normalized, self::SELLER_TYPES, true) ? $normalized : 'individual';
    }

    public function validateRegistrationPayload(array $payload, array $user): void
    {
        $this->normalizePayload($payload, $user, null, true, [], false);
    }

    private function validateBrokerCredentials(?string $name, ?string $prc, ?string $validUntil): void
    {
        if ($name === null || trim($name) === '') { throw new InvalidArgumentException('Enter the broker’s full name.'); }
        if ($prc === null || preg_match('/^[0-9]{1,20}$/', $prc) !== 1) { throw new InvalidArgumentException('Enter a valid PRC registration number.'); }
        $expiry = $validUntil !== null ? \DateTimeImmutable::createFromFormat('!Y-m-d', $validUntil) : false;
        if ($expiry === false || $expiry->format('Y-m-d') !== $validUntil || $validUntil < (new \DateTimeImmutable('now', new \DateTimeZone('Asia/Manila')))->format('Y-m-d')) {
            throw new InvalidArgumentException('Enter the valid-until date on your current PRC ID. Request corrections for expired credentials.');
        }
    }

    private function decodeDocument(mixed $value): ?array
    {
        if (!is_string($value) || $value === '') { return null; }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : null;
    }

    /** Preserve only actually recorded legacy decisions before mutable columns change. */
    private function preserveLegacyReview(array $profile): void
    {
        if (($profile['reviewHistory'] ?? []) !== [] || empty($profile['reviewedAt']) || empty($profile['reviewedByUserId'])) { return; }
        $snapshot = [
            'source' => 'legacy_review', 'legalName' => $profile['legalName'], 'prcRegistrationNo' => $profile['prcRegistrationNo'], 'prcValidUntil' => $profile['prcValidUntil'],
            'frontDocument' => $this->documentMetadataForUser($profile['userId'], 'front'), 'backDocument' => $this->documentMetadataForUser($profile['userId'], 'back'),
        ];
        $statement = $this->pdo->prepare('INSERT INTO broker_application_reviews (user_id, reviewer_user_id, application_revision, decision, reason, findings, snapshot_json, created_at) VALUES (:id, :reviewer, :revision, :decision, :reason, NULL, :snapshot, :created_at)');
        $statement->execute([
            'id' => $profile['userId'], 'reviewer' => $profile['reviewedByUserId'], 'revision' => $profile['applicationRevision'],
            'decision' => $profile['applicationStatus'], 'reason' => $profile['reviewNotes'] ?? '', 'snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR), 'created_at' => $profile['reviewedAt'],
        ]);
    }

    private function normalizeApplicationStatus(string $status): string
    {
        $normalized = strtolower(trim($status));
        return in_array($normalized, self::APPLICATION_STATUSES, true) ? $normalized : 'draft';
    }

    private function identityToApplicationStatus(string $identityStatus): string
    {
        return match (strtolower(trim($identityStatus))) {
            'verified' => 'verified',
            'rejected' => 'rejected',
            'suspended' => 'suspended',
            'pending' => 'pending_review',
            default => 'draft',
        };
    }
}
