<?php
declare(strict_types=1);

namespace App\Support;

use App\Repositories\SellerProfileRepository;
use InvalidArgumentException;
use PDO;

/** Keeps application/document and account decisions atomic, independently of SMTP. */
final class BrokerApplicationService
{
    private array $stagedByUser = [];

    public function __construct(private PDO $pdo, private SellerProfileRepository $profiles, private BrokerDocuments $documents, private ?BrokerEmailService $email = null) {}

    public function saveForUser(int $userId, array $payload, array $files = [], bool $submit = false): array
    {
        $user = $this->user($userId);
        if (($user['role'] ?? '') !== 'seller' || in_array($user['accountStatus'], ['blocked', 'disabled', 'suspended'], true)) {
            throw new InvalidArgumentException('An active seller account is required to update a broker application.');
        }
        $staged = $this->documents->stage($files);
        foreach ($staged as $document) { $this->stagedByUser[$userId][$document['id']] = $document; }
        $ownsTransaction = !$this->pdo->inTransaction();
        try {
            if ($ownsTransaction) { $this->pdo->beginTransaction(); }
            $lock = $this->pdo->prepare('SELECT id, role, account_status FROM users WHERE id = :id FOR UPDATE');
            $lock->execute(['id' => $userId]);
            $lockedUser = $lock->fetch();
            if (!is_array($lockedUser) || $lockedUser['role'] !== 'seller' || $lockedUser['account_status'] !== 'active') {
                throw new InvalidArgumentException('An active seller account is required to update a broker application.');
            }
            $previous = $this->profiles->findByUserId($userId, true);
            $profile = $this->profiles->createOrUpdateForUser($userId, $payload, $submit, $staged);
            $identity = match ($profile['applicationStatus']) {
                'verified' => 'verified', 'pending_review', 'corrections_requested' => 'pending', 'rejected' => 'rejected', 'suspended' => 'suspended', default => 'unverified',
            };
            $statement = $this->pdo->prepare('UPDATE users SET identity_verification_status = :status, identity_verified_at = CASE WHEN :verified = 1 THEN COALESCE(identity_verified_at, CURRENT_TIMESTAMP) ELSE NULL END WHERE id = :id');
            $statement->execute(['id' => $userId, 'status' => $identity, 'verified' => $identity === 'verified' ? 1 : 0]);
            $emailStatus = null;
            if ($profile['applicationStatus'] === 'pending_review' && $profile['applicationRevision'] > (int) ($previous['applicationRevision'] ?? 0)) {
                $emailStatus = $this->enqueueReceived($this->user($userId), $profile['applicationRevision']);
            }
            $profile = $this->profiles->findByUserId($userId, true);
            if ($emailStatus !== null) { $profile['emailStatus'] = $emailStatus; }
            if ($ownsTransaction) {
                $this->pdo->commit();
                unset($this->stagedByUser[$userId]);
            }
            return $profile;
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) { $this->pdo->rollBack(); }
            $this->documents->discard($staged);
            foreach ($staged as $document) { unset($this->stagedByUser[$userId][$document['id']]); }
            throw $exception;
        }
    }

    public function review(int $userId, string $decision, int $reviewerId, string $reason, ?string $findings = null, bool $prcChecked = false, ?int $expectedRevision = null): array
    {
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) { $this->pdo->beginTransaction(); }
        try {
            $profile = $this->profiles->review($userId, $decision, $reviewerId, $reason, $prcChecked, $findings, $expectedRevision);
            if (!$profile['duplicateDecision']) {
                $event = $profile['reviewHistory'][0] ?? [];
                $profile['emailStatus'] = $this->enqueueDecision($this->user($userId), $event);
            }
            if ($ownsTransaction) { $this->pdo->commit(); }
            return $profile;
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) { $this->pdo->rollBack(); }
            throw $exception;
        }
    }

    /** Outer registration/profile transactions call this only after rollback. */
    public function discardStagedForUser(int $userId): void
    {
        $this->documents->discard($this->stagedByUser[$userId] ?? []);
        unset($this->stagedByUser[$userId]);
    }

    public function finalizeStagedForUser(int $userId): void
    {
        unset($this->stagedByUser[$userId]);
    }

    private function user(int $userId, bool $lock = false): array
    {
        $statement = $this->pdo->prepare('SELECT id, role, name, email, email_verified_at, account_status FROM users WHERE id = :id' . (($lock || $this->pdo->inTransaction()) ? ' FOR UPDATE' : ''));
        $statement->execute(['id' => $userId]);
        $row = $statement->fetch();
        if (!is_array($row)) { throw new InvalidArgumentException('Broker account not found.'); }
        return ['id' => (int) $row['id'], 'role' => $row['role'], 'name' => $row['name'], 'email' => $row['email'], 'emailVerifiedAt' => $row['email_verified_at'], 'accountStatus' => $row['account_status']];
    }

    private function enqueueReceived(array $user, int $revision): array
    {
        try {
            if ($this->email === null) { return $this->queueUnavailable(); }
            return $this->email->applicationReceived($user, $revision);
        } catch (\Throwable) {
            error_log('Broker application was saved, but its received notification could not be queued.');
            return $this->queueUnavailable();
        }
    }

    private function enqueueDecision(array $user, array $event): array
    {
        try {
            if ($this->email === null) { return $this->queueUnavailable(); }
            return $this->email->applicationDecision($user, $event);
        } catch (\Throwable) {
            error_log('Broker review was saved, but its notification could not be queued.');
            return $this->queueUnavailable();
        }
    }

    private function queueUnavailable(): array
    {
        return ['id' => null, 'status' => 'enqueue_failed', 'attempts' => 0, 'sentAt' => null, 'lastError' => 'The application was saved. Its email notification could not be queued; contact support.'];
    }
}
