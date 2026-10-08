<?php
declare(strict_types=1);

namespace App\Repositories;

use InvalidArgumentException;
use OutOfBoundsException;
use PDO;
use PDOException;
use Throwable;

class BrokerMailRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function user(int $id, bool $lock = false): array
    {
        // An outer profile/review transaction may already have an older consistent-read snapshot.
        // A locking read sees the current address/ownership state and respects its mutation lock.
        $statement = $this->pdo->prepare('SELECT id, role, name, email, email_verified_at FROM users WHERE id = :id'
            . (($lock || $this->pdo->inTransaction()) && $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : ''));
        $statement->execute(['id' => $id]);
        $user = $statement->fetch(PDO::FETCH_ASSOC);
        if (!$user || $user['role'] !== 'seller') {
            throw new OutOfBoundsException('Broker account not found.');
        }
        return $user;
    }

    public function transaction(callable $action): mixed
    {
        $owned = !$this->pdo->inTransaction();
        if ($owned) { $this->pdo->beginTransaction(); }
        try {
            $result = $action();
            if ($owned) { $this->pdo->commit(); }
            return $result;
        } catch (Throwable $error) {
            if ($owned && $this->pdo->inTransaction()) { $this->pdo->rollBack(); }
            throw $error;
        }
    }

    public function enqueue(array $user, string $kind, string $key, array $payload, bool $configured): array
    {
        $statement = $this->pdo->prepare('INSERT INTO broker_mail_outbox
            (user_id,kind,dedupe_key,recipient_email,payload_json,status,created_at,updated_at)
            VALUES (:user_id,:kind,:dedupe_key,:recipient_email,:payload_json,:status,:created_at,:updated_at)');
        try {
            $now = gmdate('Y-m-d H:i:s');
            $statement->execute([
                'user_id' => (int) $user['id'], 'kind' => $kind, 'dedupe_key' => $key,
                'recipient_email' => (string) $user['email'],
                'payload_json' => json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                'status' => $configured ? 'pending' : 'unconfigured', 'created_at' => $now, 'updated_at' => $now,
            ]);
        } catch (PDOException $exception) {
            if ($exception->getCode() !== '23000' || !$this->byKey($key)) { throw $exception; }
        }
        return $this->byKey($key) ?? throw new \RuntimeException('Email notification could not be queued.');
    }

    public function byKey(string $key): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM broker_mail_outbox WHERE dedupe_key = :key');
        $statement->execute(['key' => $key]);
        return $statement->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function latest(int $userId, bool $verificationOnly = false): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM broker_mail_outbox WHERE user_id = :user_id'
            . ($verificationOnly ? " AND kind IN ('verification','application_received')" : '')
            . ' ORDER BY created_at DESC,id DESC LIMIT 1');
        $statement->execute(['user_id' => $userId]);
        return $statement->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** Tokens exist only as SHA-256 hashes. Issuing a new link invalidates earlier links. */
    public function issueToken(int $userId, string $hash, int $ttlSeconds, ?string $recipient = null): void
    {
        $this->transaction(function () use ($userId, $hash, $ttlSeconds, $recipient): void {
            $user = $this->user($userId, true);
            if ($recipient !== null && !hash_equals((string) $user['email'], $recipient)) {
                throw new InvalidArgumentException('The recipient email changed before the verification link was issued.');
            }
            $now = gmdate('Y-m-d H:i:s');
            $invalidate = $this->pdo->prepare('UPDATE email_verification_tokens SET used_at = :used_at WHERE user_id = :user_id AND used_at IS NULL');
            $invalidate->execute(['used_at' => $now, 'user_id' => $userId]);
            $insert = $this->pdo->prepare('INSERT INTO email_verification_tokens (user_id,email,token_hash,expires_at,created_at)
                VALUES (:user_id,:email,:hash,:expires_at,:created_at)');
            $insert->execute(['user_id' => $userId, 'email' => $user['email'], 'hash' => $hash,
                'expires_at' => gmdate('Y-m-d H:i:s', time() + $ttlSeconds), 'created_at' => $now]);
        });
    }

    public function consumeToken(string $hash): array
    {
        return $this->transaction(function () use ($hash): array {
            $select = $this->pdo->prepare('SELECT user_id,email FROM email_verification_tokens WHERE token_hash = :hash');
            $select->execute(['hash' => $hash]);
            $token = $select->fetch(PDO::FETCH_ASSOC);
            $id = (int) ($token['user_id'] ?? 0);
            if (!$id) { throw new InvalidArgumentException('This verification link is invalid, expired, or has already been used. Request a new link from your broker account.'); }
            $user = $this->user($id, true);
            if (!hash_equals((string) $token['email'], (string) $user['email'])) {
                throw new InvalidArgumentException('The email address for this link has changed. Request a new verification link.');
            }
            $now = gmdate('Y-m-d H:i:s');
            $consume = $this->pdo->prepare('UPDATE email_verification_tokens SET used_at = :used_at
                WHERE token_hash = :hash AND used_at IS NULL AND expires_at > :now');
            $consume->execute(['used_at' => $now, 'hash' => $hash, 'now' => $now]);
            if ($consume->rowCount() !== 1) {
                throw new InvalidArgumentException('This verification link is invalid, expired, or has already been used. Request a new link from your broker account.');
            }
            $update = $this->pdo->prepare('UPDATE users SET email_verified_at = COALESCE(email_verified_at,:verified_at) WHERE id = :id');
            $update->execute(['verified_at' => $now, 'id' => $id]);
            return ['verified' => true, 'userId' => $id];
        });
    }

    public function awaitingIds(int $limit, int $maxAttempts): array
    {
        // A process that died after claiming work can be recovered after its bounded SMTP timeout.
        $recover = $this->pdo->prepare("UPDATE broker_mail_outbox SET status='failed',locked_at=NULL,last_error=:error,next_attempt_at=:now,updated_at=:updated
            WHERE status='sending' AND locked_at < :stale");
        $recover->execute(['error' => 'The previous delivery attempt was interrupted; it can be retried.',
            'now' => gmdate('Y-m-d H:i:s'), 'updated' => gmdate('Y-m-d H:i:s'), 'stale' => gmdate('Y-m-d H:i:s', time() - 900)]);
        $select = $this->pdo->prepare("SELECT id FROM broker_mail_outbox
            WHERE status IN ('pending','failed','unconfigured') AND attempts < :max_attempts
            AND (next_attempt_at IS NULL OR next_attempt_at <= :now) ORDER BY id LIMIT " . max(1, min(100, $limit)));
        $select->execute(['max_attempts' => $maxAttempts, 'now' => gmdate('Y-m-d H:i:s')]);
        return array_map('intval', $select->fetchAll(PDO::FETCH_COLUMN));
    }

    public function claim(int $id): ?array
    {
        $now = gmdate('Y-m-d H:i:s');
        $update = $this->pdo->prepare("UPDATE broker_mail_outbox SET status='sending',attempts=attempts+1,locked_at=:locked,updated_at=:updated
            WHERE id=:id AND status IN ('pending','failed','unconfigured') AND (next_attempt_at IS NULL OR next_attempt_at <= :now)");
        $update->execute(['locked' => $now, 'updated' => $now, 'id' => $id, 'now' => $now]);
        if ($update->rowCount() !== 1) { return null; }
        $select = $this->pdo->prepare('SELECT * FROM broker_mail_outbox WHERE id=:id');
        $select->execute(['id' => $id]);
        return $select->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function finish(int $id, string $status, ?string $error = null, ?string $retryAt = null): void
    {
        if (!in_array($status, ['sent', 'failed', 'unconfigured'], true)) { throw new InvalidArgumentException('Invalid delivery outcome.'); }
        $statement = $this->pdo->prepare('UPDATE broker_mail_outbox SET status=:status,last_error=:error,next_attempt_at=:retry_at,
            locked_at=NULL,sent_at=:sent_at,updated_at=:updated_at'
            . ($status === 'unconfigured' ? ',attempts=CASE WHEN attempts > 0 THEN attempts-1 ELSE 0 END' : '')
            . ' WHERE id=:id AND status=\'sending\'');
        $now = gmdate('Y-m-d H:i:s');
        $statement->execute(['status' => $status, 'error' => $error, 'retry_at' => $retryAt,
            'sent_at' => $status === 'sent' ? $now : null, 'updated_at' => $now, 'id' => $id]);
    }

    public function markUnconfigured(): int
    {
        $statement = $this->pdo->prepare("UPDATE broker_mail_outbox SET status='unconfigured',last_error=:error,updated_at=:now
            WHERE status IN ('pending','failed')");
        $statement->execute(['error' => 'Email delivery is not configured. Contact the support team.', 'now' => gmdate('Y-m-d H:i:s')]);
        return $statement->rowCount();
    }

    public function retry(int $id): array
    {
        $statement = $this->pdo->prepare("UPDATE broker_mail_outbox SET status='pending',attempts=0,next_attempt_at=NULL,last_error=NULL,updated_at=:now
            WHERE id=:id AND status IN ('failed','unconfigured')");
        $statement->execute(['id' => $id, 'now' => gmdate('Y-m-d H:i:s')]);
        $select = $this->pdo->prepare('SELECT * FROM broker_mail_outbox WHERE id=:id');
        $select->execute(['id' => $id]);
        $row = $select->fetch(PDO::FETCH_ASSOC);
        if (!$row) { throw new OutOfBoundsException('Email notification not found.'); }
        return $row;
    }

    /** Recover durable review events whose notification insert failed; each pass is bounded. */
    public function missingDecisionNotifications(int $limit): array
    {
        $key = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql'
            ? "CONCAT('broker-review-',br.id)" : "'broker-review-' || br.id";
        $source = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql'
            ? "JSON_UNQUOTE(JSON_EXTRACT(br.snapshot_json,'$.source'))" : "json_extract(br.snapshot_json,'$.source')";
        $select = $this->pdo->prepare('SELECT br.id,br.user_id,br.decision,br.reason FROM broker_application_reviews br
            INNER JOIN users u ON u.id=br.user_id AND u.role=\'seller\'
            WHERE br.decision IN (\'verified\',\'approved\',\'corrections_requested\',\'rejected\',\'blocked\')
            AND COALESCE(' . $source . ',\'\') <> \'legacy_review\'
            AND NOT EXISTS (SELECT 1 FROM broker_mail_outbox m WHERE m.dedupe_key=' . $key . ')
            ORDER BY br.id LIMIT ' . max(1, min(100, $limit)));
        $select->execute();
        return $select->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Legacy revision-zero approvals are deliberately not treated as newly submitted applications. */
    public function missingReceiptNotifications(int $limit): array
    {
        $key = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql'
            ? "CONCAT('broker-received-',sp.user_id,'-',sp.application_revision)"
            : "'broker-received-' || sp.user_id || '-' || sp.application_revision";
        $select = $this->pdo->prepare('SELECT sp.user_id,sp.application_revision FROM seller_profiles sp
            INNER JOIN users u ON u.id=sp.user_id AND u.role=\'seller\'
            WHERE sp.seller_type=\'broker\' AND sp.application_status=\'pending_review\'
            AND sp.application_revision > 0 AND sp.submitted_at IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM broker_mail_outbox m WHERE m.dedupe_key=' . $key . ')
            ORDER BY sp.user_id LIMIT ' . max(1, min(100, $limit)));
        $select->execute();
        return $select->fetchAll(PDO::FETCH_ASSOC);
    }
}
