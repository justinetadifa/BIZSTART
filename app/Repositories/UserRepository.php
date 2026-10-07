<?php
declare(strict_types=1);

namespace App\Repositories;

use InvalidArgumentException;
use PDO;
use PDOException;

final class UserRepository
{
    private const IDENTITY_VERIFICATION_STATUSES = ['unverified', 'pending', 'verified', 'rejected', 'suspended'];

    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findById(int $userId): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT *
             FROM users
             WHERE id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $userId]);

        $row = $statement->fetch();
        return is_array($row) ? $this->hydrate($row) : null;
    }

    public function findByEmail(string $email): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT *
             FROM users
             WHERE LOWER(email) = LOWER(:email)
             LIMIT 1'
        );
        $statement->execute(['email' => trim($email)]);

        $row = $statement->fetch();
        return is_array($row) ? $this->hydrate($row) : null;
    }

    public function authenticate(string $email, string $password, ?string $role = null): ?array
    {
        $user = $this->findByEmail($email);
        if ($user === null) {
            return null;
        }

        if ($role !== null && $user['role'] !== $role) {
            return null;
        }

        $hash = (string) ($user['passwordHash'] ?? '');
        if ($hash === '' || !password_verify($password, $hash)) {
            return null;
        }

        return $user;
    }

    public function create(string $role, string $name, string $email, string $password, ?string $department = null, array $profile = []): array
    {
        $name = trim($name);
        $email = strtolower(trim($email));
        $department = $department !== null ? trim($department) : null;
        if ($department === '') {
            $department = null;
        }

        if (!in_array($role, ['admin', 'investor', 'seller'], true)) {
            throw new InvalidArgumentException('Invalid account role.');
        }
        if ($name === '' || mb_strlen($name) > 140) {
            throw new InvalidArgumentException('Name is required.');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
            throw new InvalidArgumentException('A valid email address is required.');
        }
        if (strlen($password) < 8) {
            throw new InvalidArgumentException('Password must be at least 8 characters.');
        }

        $statement = $this->pdo->prepare(
            'INSERT INTO users (role, name, department, email, password_hash, identity_verification_status, identity_verified_at,
                phone, address_line, privacy_consent_at, privacy_consent_version, privacy_consent_text)
             VALUES (:role, :name, :department, :email, :password_hash, :identity_verification_status, :identity_verified_at,
                :phone, :address_line, :privacy_consent_at, :privacy_consent_version, :privacy_consent_text)'
        );

        try {
            $identityStatus = match ($role) {
                'admin' => 'verified',
                'seller' => 'pending',
                default => 'unverified',
            };
            $statement->execute([
                'role' => $role,
                'name' => $name,
                'department' => $department,
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'identity_verification_status' => $identityStatus,
                'identity_verified_at' => $identityStatus === 'verified' ? gmdate('Y-m-d H:i:s') : null,
                'phone' => $profile['phone'] ?? null,
                'address_line' => $profile['address'] ?? null,
                'privacy_consent_at' => $profile['privacyConsentAt'] ?? null,
                'privacy_consent_version' => $profile['privacyConsentVersion'] ?? null,
                'privacy_consent_text' => $profile['privacyConsentText'] ?? null,
            ]);
        } catch (PDOException $exception) {
            if ((int) $exception->getCode() === 23000) {
                throw new InvalidArgumentException('That email is already registered.');
            }

            throw $exception;
        }

        $userId = (int) $this->pdo->lastInsertId();
        $user = $this->findById($userId);

        if ($user === null) {
            throw new InvalidArgumentException('Unable to create the account.');
        }

        return $user;
    }

    public function updateIdentityVerificationStatus(int $userId, string $status): array
    {
        $normalized = $this->normalizeIdentityVerificationStatus($status);

        $statement = $this->pdo->prepare(
            'UPDATE users
             SET identity_verification_status = :identity_verification_status,
                 identity_verified_at = :identity_verified_at
             WHERE id = :id'
        );
        $statement->execute([
            'id' => $userId,
            'identity_verification_status' => $normalized,
            'identity_verified_at' => $normalized === 'verified' ? gmdate('Y-m-d H:i:s') : null,
        ]);

        $user = $this->findById($userId);
        if ($user === null) {
            throw new InvalidArgumentException('User not found.');
        }

        return $user;
    }

    public function allByRole(string $role): array
    {
        $statement = $this->pdo->prepare(
            'SELECT *
             FROM users
             WHERE role = :role
             ORDER BY name ASC, email ASC'
        );
        $statement->execute(['role' => $role]);

        return array_map([$this, 'hydrate'], $statement->fetchAll());
    }

    public function firstByRole(string $role): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT *
             FROM users
             WHERE role = :role
             ORDER BY id ASC
             LIMIT 1'
        );
        $statement->execute(['role' => $role]);

        $row = $statement->fetch();
        return is_array($row) ? $this->hydrate($row) : null;
    }

    public function defaultSellerId(): ?int
    {
        return $this->firstByRole('seller')['id'] ?? null;
    }

    public function updateProfile(int $userId, string $name, ?string $phone, ?string $address, ?string $imageUrl): array
    {
        $name = trim($name);
        $phone = $phone !== null && trim($phone) !== '' ? trim($phone) : null;
        $address = $address !== null && trim($address) !== '' ? trim($address) : null;
        if ($name === '' || mb_strlen($name) > 140) {
            throw new InvalidArgumentException('Enter your full name (up to 140 characters).');
        }
        if ($phone !== null && (!preg_match('/^[+()0-9 .-]{7,30}$/', $phone))) {
            throw new InvalidArgumentException('Enter a valid contact number.');
        }
        if ($address !== null && mb_strlen($address) > 255) {
            throw new InvalidArgumentException('Address must be at most 255 characters.');
        }
        if ($imageUrl !== null && !preg_match('#^assets/uploads/profiles/[a-zA-Z0-9.-]+\.(?:jpg|png|webp|gif)$#', $imageUrl)) {
            throw new InvalidArgumentException('Profile photos must be uploaded through your account.');
        }
        $statement = $this->pdo->prepare('UPDATE users SET name = :name, phone = :phone, address_line = :address, profile_image_url = :image WHERE id = :id');
        $statement->execute(['id' => $userId, 'name' => $name, 'phone' => $phone, 'address' => $address, 'image' => $imageUrl]);
        return $this->findById($userId) ?? throw new InvalidArgumentException('Account not found.');
    }

    public function recordPrivacyConsent(int $userId, string $version, string $text): array
    {
        $statement = $this->pdo->prepare('UPDATE users SET privacy_consent_at = :consented_at, privacy_consent_version = :version, privacy_consent_text = :consent_text WHERE id = :id');
        $statement->execute(['id' => $userId, 'consented_at' => gmdate('Y-m-d H:i:s'), 'version' => $version, 'consent_text' => $text]);
        return $this->findById($userId) ?? throw new InvalidArgumentException('Account not found.');
    }

    public function touchActivity(int $userId, bool $touchLogin = false): void
    {
        if ($userId <= 0) {
            return;
        }

        $now = gmdate('Y-m-d H:i:s');
        if ($touchLogin) {
            $statement = $this->pdo->prepare(
                'UPDATE users
                 SET last_login_at = :login_at,
                     last_active_at = :active_at
                 WHERE id = :id'
            );
            $statement->execute(['id' => $userId, 'login_at' => $now, 'active_at' => $now]);
        } else {
            $statement = $this->pdo->prepare(
                'UPDATE users
                 SET last_active_at = :active_at
                 WHERE id = :id'
            );
            $statement->execute(['id' => $userId, 'active_at' => $now]);
        }
    }

    public function allInvestorsWithActivity(?int $currentUserId = null): array
    {
        $statement = $this->pdo->prepare(
            'SELECT *
             FROM users
             WHERE role = :role
             ORDER BY COALESCE(last_active_at, last_login_at, created_at) DESC, id DESC'
        );
        $statement->execute(['role' => 'investor']);
        $rows = $statement->fetchAll();
        if (empty($rows)) {
            return [];
        }

        $investorIds = array_map(static fn (array $row): int => (int) $row['id'], $rows);
        $inPlaceholders = implode(',', array_fill(0, count($investorIds), '?'));

        $shortlistsByInvestor = [];
        $shortlistStmt = $this->pdo->prepare(
            "SELECT s.investor_user_id, s.property_id, s.created_at AS shortlisted_at,
                    p.name AS property_name, p.category, p.barangay, p.price, p.area, p.status, p.image_url
             FROM property_shortlists s
             INNER JOIN properties p ON p.id = s.property_id
             WHERE s.investor_user_id IN ({$inPlaceholders})
             ORDER BY s.created_at DESC"
        );
        $shortlistStmt->execute($investorIds);
        foreach ($shortlistStmt->fetchAll() as $sRow) {
            $invId = (int) $sRow['investor_user_id'];
            $shortlistsByInvestor[$invId][] = [
                'propertyId' => (int) $sRow['property_id'],
                'propertyName' => (string) ($sRow['property_name'] ?? 'Property'),
                'category' => (string) ($sRow['category'] ?? ''),
                'barangay' => (string) ($sRow['barangay'] ?? 'San Fernando'),
                'price' => (float) ($sRow['price'] ?? 0),
                'area' => (float) ($sRow['area'] ?? 0),
                'status' => (string) ($sRow['status'] ?? 'Available'),
                'imageUrl' => (string) ($sRow['image_url'] ?? ''),
                'shortlistedAt' => (string) ($sRow['shortlisted_at'] ?? ''),
            ];
        }

        $visitsByInvestor = [];
        $visitStmt = $this->pdo->prepare(
            "SELECT v.id, v.investor_user_id, v.property_id, v.investment_purpose, v.status,
                    v.primary_start_at, v.primary_end_at, v.counter_start_at, v.counter_end_at,
                    v.confirmed_start_at, v.confirmed_end_at, v.visited_at, v.created_at,
                    p.name AS property_name, p.barangay AS property_barangay
             FROM visit_logs v
             INNER JOIN properties p ON p.id = v.property_id
             WHERE v.investor_user_id IN ({$inPlaceholders})
             ORDER BY COALESCE(v.updated_at, v.created_at) DESC"
        );
        $visitStmt->execute($investorIds);
        foreach ($visitStmt->fetchAll() as $vRow) {
            $invId = (int) $vRow['investor_user_id'];
            $visitsByInvestor[$invId][] = [
                'id' => (int) $vRow['id'],
                'propertyId' => (int) $vRow['property_id'],
                'propertyName' => (string) ($vRow['property_name'] ?? 'Property'),
                'propertyBarangay' => (string) ($vRow['property_barangay'] ?? ''),
                'investmentPurpose' => (string) ($vRow['investment_purpose'] ?? ''),
                'status' => (string) ($vRow['status'] ?? 'proposed'),
                'primaryStartAt' => (string) ($vRow['primary_start_at'] ?? ''),
                'primaryEndAt' => (string) ($vRow['primary_end_at'] ?? ''),
                'counterStartAt' => $vRow['counter_start_at'] !== null ? (string) $vRow['counter_start_at'] : null,
                'counterEndAt' => $vRow['counter_end_at'] !== null ? (string) $vRow['counter_end_at'] : null,
                'confirmedStartAt' => $vRow['confirmed_start_at'] !== null ? (string) $vRow['confirmed_start_at'] : null,
                'confirmedEndAt' => $vRow['confirmed_end_at'] !== null ? (string) $vRow['confirmed_end_at'] : null,
                'visitedAt' => $vRow['visited_at'] !== null ? (string) $vRow['visited_at'] : null,
                'createdAt' => (string) ($vRow['created_at'] ?? ''),
            ];
        }

        $docRequestsByInvestor = [];
        $docStmt = $this->pdo->prepare(
            "SELECT r.id, r.requester_user_id, r.property_id, r.document_name, r.note,
                    r.status, r.response_note, r.created_at, r.resolved_at,
                    p.name AS property_name, p.barangay AS property_barangay
             FROM property_document_requests r
             INNER JOIN properties p ON p.id = r.property_id
             WHERE r.requester_user_id IN ({$inPlaceholders})
             ORDER BY r.created_at DESC"
        );
        $docStmt->execute($investorIds);
        foreach ($docStmt->fetchAll() as $dRow) {
            $invId = (int) $dRow['requester_user_id'];
            $docRequestsByInvestor[$invId][] = [
                'id' => (int) $dRow['id'],
                'propertyId' => (int) $dRow['property_id'],
                'propertyName' => (string) ($dRow['property_name'] ?? 'Property'),
                'propertyBarangay' => (string) ($dRow['property_barangay'] ?? ''),
                'documentName' => (string) ($dRow['document_name'] ?? ''),
                'note' => $dRow['note'] !== null ? (string) $dRow['note'] : null,
                'status' => (string) ($dRow['status'] ?? 'requested'),
                'responseNote' => $dRow['response_note'] !== null ? (string) $dRow['response_note'] : null,
                'createdAt' => (string) ($dRow['created_at'] ?? ''),
                'resolvedAt' => $dRow['resolved_at'] !== null ? (string) $dRow['resolved_at'] : null,
            ];
        }

        $threadsByInvestor = [];
        $threadStmt = $this->pdo->prepare(
            "SELECT t.id, t.investor_user_id, t.property_id, t.subject, t.last_message_at, t.created_at,
                    p.name AS property_name,
                    (SELECT COUNT(*) FROM property_messages m WHERE m.thread_id = t.id) AS message_count
             FROM message_threads t
             INNER JOIN properties p ON p.id = t.property_id
             WHERE t.investor_user_id IN ({$inPlaceholders})
             ORDER BY COALESCE(t.last_message_at, t.created_at) DESC"
        );
        $threadStmt->execute($investorIds);
        foreach ($threadStmt->fetchAll() as $tRow) {
            $invId = (int) $tRow['investor_user_id'];
            $threadsByInvestor[$invId][] = [
                'id' => (int) $tRow['id'],
                'propertyId' => (int) $tRow['property_id'],
                'propertyName' => (string) ($tRow['property_name'] ?? 'Property'),
                'subject' => (string) ($tRow['subject'] ?? 'Property Inquiry'),
                'messageCount' => (int) ($tRow['message_count'] ?? 0),
                'lastMessageAt' => $tRow['last_message_at'] !== null ? (string) $tRow['last_message_at'] : null,
                'createdAt' => (string) ($tRow['created_at'] ?? ''),
            ];
        }

        $votesByInvestor = [];
        $voteStmt = $this->pdo->prepare(
            "SELECT voter_user_id, COUNT(*) AS vote_count
             FROM property_votes
             WHERE voter_user_id IN ({$inPlaceholders})
             GROUP BY voter_user_id"
        );
        $voteStmt->execute($investorIds);
        foreach ($voteStmt->fetchAll() as $vRow) {
            $votesByInvestor[(int) $vRow['voter_user_id']] = (int) $vRow['vote_count'];
        }

        $now = time();
        $manilaTz = new \DateTimeZone('Asia/Manila');
        $utcTz = new \DateTimeZone('UTC');
        $investors = [];
        foreach ($rows as $row) {
            $hydrated = $this->hydrate($row);
            $userId = $hydrated['id'];
            $lastActiveTimestamp = !empty($hydrated['lastActiveAt']) ? strtotime($hydrated['lastActiveAt'] . ' UTC') : 0;
            $lastLoginTimestamp = !empty($hydrated['lastLoginAt']) ? strtotime($hydrated['lastLoginAt'] . ' UTC') : 0;
            $createdTimestamp = !empty($hydrated['createdAt']) ? strtotime($hydrated['createdAt'] . ' UTC') : 0;

            $formatDate = static function (int $ts) use ($manilaTz, $utcTz): string {
                return (new \DateTimeImmutable('@' . $ts))->setTimezone($manilaTz)->format('M j, Y g:i A');
            };

            $isCurrent = ($currentUserId !== null && $userId === $currentUserId);
            $isOnline = $isCurrent || ($lastActiveTimestamp > 0 && ($now - $lastActiveTimestamp) <= 900);
            $isRecentToday = !$isOnline && ($lastActiveTimestamp > 0 && ($now - $lastActiveTimestamp) <= 86400);

            if ($isOnline) {
                $presenceState = 'online';
                $presenceLabel = 'Active now';
            } elseif ($isRecentToday) {
                $presenceState = 'recent';
                $diffMins = max(1, (int) round(($now - $lastActiveTimestamp) / 60));
                if ($diffMins < 60) {
                    $presenceLabel = "Active {$diffMins}m ago";
                } else {
                    $diffHours = (int) round($diffMins / 60);
                    $presenceLabel = "Active {$diffHours}h ago";
                }
            } elseif ($lastActiveTimestamp > 0) {
                $presenceState = 'offline';
                $presenceLabel = 'Last active ' . $formatDate($lastActiveTimestamp);
            } elseif ($lastLoginTimestamp > 0) {
                $presenceState = 'offline';
                $presenceLabel = 'Last logged in ' . $formatDate($lastLoginTimestamp);
            } else {
                $presenceState = 'offline';
                $presenceLabel = 'Registered ' . $formatDate($createdTimestamp);
            }

            $invShortlists = $shortlistsByInvestor[$userId] ?? [];
            $invVisits = $visitsByInvestor[$userId] ?? [];
            $invDocRequests = $docRequestsByInvestor[$userId] ?? [];
            $invThreads = $threadsByInvestor[$userId] ?? [];
            $invVotes = $votesByInvestor[$userId] ?? 0;

            $investors[] = array_merge($hydrated, [
                'isOnline' => $isOnline,
                'presenceState' => $presenceState,
                'presenceLabel' => $presenceLabel,
                'shortlistsCount' => count($invShortlists),
                'shortlists' => $invShortlists,
                'visitsCount' => count($invVisits),
                'visits' => $invVisits,
                'documentRequestsCount' => count($invDocRequests),
                'documentRequests' => $invDocRequests,
                'threadsCount' => count($invThreads),
                'threads' => $invThreads,
                'votesCount' => $invVotes,
            ]);
        }

        return $investors;
    }

    private function hydrate(array $row): array
    {
        $identityVerifiedAt = $row['identity_verified_at'] ?? null;
        $department = isset($row['department']) && $row['department'] !== null && trim((string) $row['department']) !== ''
            ? (string) $row['department']
            : null;

        return [
            'id' => (int) ($row['id'] ?? 0),
            'role' => (string) ($row['role'] ?? 'guest'),
            'name' => (string) ($row['name'] ?? ''),
            'department' => $department,
            'email' => (string) ($row['email'] ?? ''),
            'phone' => $row['phone'] ?? null,
            'address' => $row['address_line'] ?? null,
            'profileImageUrl' => $row['profile_image_url'] ?? null,
            'privacyConsentAt' => $row['privacy_consent_at'] ?? null,
            'privacyConsentVersion' => $row['privacy_consent_version'] ?? null,
            'passwordHash' => (string) ($row['password_hash'] ?? ''),
            'identityVerificationStatus' => $this->normalizeIdentityVerificationStatus((string) ($row['identity_verification_status'] ?? 'unverified')),
            'identityVerifiedAt' => $identityVerifiedAt !== null ? (string) $identityVerifiedAt : null,
            'lastLoginAt' => $row['last_login_at'] !== null ? (string) $row['last_login_at'] : null,
            'lastActiveAt' => $row['last_active_at'] !== null ? (string) $row['last_active_at'] : null,
            'createdAt' => (string) ($row['created_at'] ?? ''),
            'updatedAt' => (string) ($row['updated_at'] ?? ''),
        ];
    }

    private function normalizeIdentityVerificationStatus(string $status): string
    {
        $normalized = strtolower(trim($status));
        if (!in_array($normalized, self::IDENTITY_VERIFICATION_STATUSES, true)) {
            return 'unverified';
        }

        return $normalized;
    }
}
