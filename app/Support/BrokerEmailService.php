<?php
declare(strict_types=1);

namespace App\Support;

use App\Repositories\BrokerMailRepository;
use InvalidArgumentException;
use RuntimeException;
use PDOException;
use Throwable;

require_once __DIR__ . '/RequestRateLimiter.php';

class BrokerEmailRateLimitException extends RuntimeException
{
    public function __construct(public int $retryAfter = 60)
    {
        parent::__construct('Please wait before requesting another verification link.');
    }
}

final class BrokerEmailService
{
    public function __construct(private BrokerMailRepository $repository, private BrokerMailer $mailer, private array $config)
    {
    }

    /** Persist within an existing submission transaction; network delivery happens in the worker. */
    public function applicationReceived(array $user, int $revision): array
    {
        $account = $this->repository->user((int) $user['id']);
        return $this->delivery($this->repository->enqueue($account, 'application_received',
            'broker-received-' . $account['id'] . '-' . max(1, $revision), [], $this->configured()));
    }

    /** Stable review IDs prevent retries from producing duplicate decision notifications. */
    public function applicationDecision(array $user, array $event): array
    {
        $decision = (string) ($event['decision'] ?? '');
        if ($decision === 'verified') { $decision = 'approved'; }
        if (!in_array($decision, ['approved', 'corrections_requested', 'rejected', 'blocked'], true) || (int) ($event['id'] ?? 0) < 1) {
            throw new InvalidArgumentException('A documented review decision is required for this notification.');
        }
        $account = $this->repository->user((int) $user['id']);
        $configured = $this->configured() && ($decision !== 'blocked' || $this->supportContact() !== '');
        return $this->delivery($this->repository->enqueue($account, $decision, 'broker-review-' . (int) $event['id'],
            ['reason' => (string) ($event['reason'] ?? '')], $configured));
    }

    public function status(int $userId): array
    {
        $user = $this->repository->user($userId);
        try {
            $latest = $this->repository->latest($userId);
            $verification = $this->repository->latest($userId, true);
        } catch (PDOException) {
            return [
                'verified' => !empty($user['email_verified_at']), 'emailVerifiedAt' => $user['email_verified_at'] ?: null,
                'delivery' => ['id' => null, 'kind' => null, 'status' => 'enqueue_failed', 'attempts' => 0, 'sentAt' => null,
                    'lastError' => 'Your application is saved. Email delivery tracking is temporarily unavailable; contact support.'],
                'canResend' => false, 'retryAfter' => 0, 'mailConfigured' => $this->configured(),
                'message' => 'Your application is saved. Email delivery tracking is temporarily unavailable; contact support.',
            ];
        }
        $retryAfter = $verification ? max(0, strtotime((string) $verification['created_at'] . ' UTC') + 60 - time()) : 0;
        $verified = !empty($user['email_verified_at']);
        $delivery = $latest ? $this->delivery($latest) : null;
        return [
            'verified' => $verified, 'emailVerifiedAt' => $user['email_verified_at'] ?: null,
            'delivery' => $delivery, 'canResend' => !$verified && $retryAfter === 0,
            'retryAfter' => $retryAfter, 'mailConfigured' => $this->configured(),
            'message' => $verified ? 'Your email address is verified. Application review remains a separate step.'
                : (($delivery['status'] ?? '') === 'sent' && !in_array($delivery['kind'], ['verification', 'application_received'], true)
                    ? 'Your latest application update was accepted by the mail service. Email verification is still required; request a verification link from your broker account.'
                    : $this->deliveryMessage($delivery['status'] ?? ($this->configured() ? 'none' : 'unconfigured'))),
        ];
    }

    public function resend(array $user, string $ip = ''): array
    {
        $id = (int) ($user['id'] ?? 0);
        if ($ip !== '') {
            $limiter = new RequestRateLimiter((string) ($this->config['security']['rate_limit_path']
                ?? dirname(__DIR__, 2) . '/data/cache/rate-limits'));
            if (!$limiter->consume('broker-verification-ip:' . $ip, 10, 3600)) {
                throw new BrokerEmailRateLimitException(3600);
            }
        }
        return $this->repository->transaction(function () use ($id): array {
            $account = $this->repository->user($id, true);
            if (!empty($account['email_verified_at'])) { return $this->status($id); }
            $latest = $this->repository->latest($id, true);
            $retryAfter = $latest ? max(0, strtotime((string) $latest['created_at'] . ' UTC') + 60 - time()) : 0;
            if ($retryAfter > 0) { throw new BrokerEmailRateLimitException($retryAfter); }
            $this->repository->enqueue($account, 'verification', 'broker-verify-' . $id . '-' . bin2hex(random_bytes(16)), [], $this->configured());
            return $this->status($id) + ['queued' => true];
        });
    }

    public function verify(string $token): array
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $token)) {
            throw new InvalidArgumentException('This verification link is invalid, expired, or has already been used. Request a new link from your broker account.');
        }
        return $this->repository->consumeToken(hash('sha256', $token));
    }

    public function retryDelivery(int $id): array
    {
        return $this->delivery($this->repository->retry($id));
    }

    /** Rebuild missing outbox rows from committed application/review records, with the original keys. */
    public function reconcilePending(int $limit = 20): array
    {
        $remaining = max(1, min(100, $limit));
        $counts = ['decisions' => 0, 'received' => 0, 'failed' => 0];
        $decisions = $this->repository->missingDecisionNotifications($remaining);
        foreach ($decisions as $event) {
            $remaining--;
            try {
                $this->applicationDecision(['id' => (int) $event['user_id']], $event);
                $counts['decisions']++;
            } catch (Throwable) { $counts['failed']++; }
        }
        if ($remaining > 0) {
            foreach ($this->repository->missingReceiptNotifications($remaining) as $submission) {
                try {
                    $this->applicationReceived(['id' => (int) $submission['user_id']], (int) $submission['application_revision']);
                    $counts['received']++;
                } catch (Throwable) { $counts['failed']++; }
            }
        }
        return $counts;
    }

    public function deliverPending(int $limit = 20): array
    {
        if (!$this->configured()) {
            $count = $this->repository->markUnconfigured();
            return ['sent' => 0, 'failed' => 0, 'unconfigured' => $count, 'mailConfigured' => false];
        }
        $maxAttempts = max(1, min(20, (int) ($this->config['mail']['max_attempts'] ?? 6)));
        $counts = ['sent' => 0, 'failed' => 0, 'unconfigured' => 0, 'mailConfigured' => true];
        foreach ($this->repository->awaitingIds($limit, $maxAttempts) as $id) {
            $row = $this->repository->claim($id);
            if (!$row) { continue; }
            if ($row['kind'] === 'blocked' && $this->supportContact() === '') {
                $this->repository->finish($id, 'unconfigured', 'A support contact must be configured for this notification.');
                $counts['unconfigured']++;
                continue;
            }
            try {
                $user = $this->repository->user((int) $row['user_id']);
                if (!hash_equals((string) $user['email'], (string) $row['recipient_email'])) {
                    throw new RuntimeException('The recipient email changed.');
                }
                $link = null;
                if (in_array($row['kind'], ['verification', 'application_received'], true) && empty($user['email_verified_at'])) {
                    $token = bin2hex(random_bytes(32));
                    $ttl = max(300, min(604800, (int) ($this->config['mail']['verification_ttl_seconds'] ?? 86400)));
                    $this->repository->issueToken((int) $user['id'], hash('sha256', $token), $ttl, (string) $row['recipient_email']);
                    $link = $this->verificationBaseUrl() . '/verify-email.php#token=' . $token;
                }
                [$subject, $body] = $this->message($row, $user, $link);
                $this->mailer->send((string) $row['recipient_email'], (string) $user['name'], $subject, $body, (string) $row['dedupe_key']);
                $this->repository->finish($id, 'sent');
                $counts['sent']++;
            } catch (Throwable) {
                // Never expose transport diagnostics, credentials, full messages, or links in UI/logs.
                $retryAt = (int) $row['attempts'] < $maxAttempts
                    ? gmdate('Y-m-d H:i:s', time() + min(86400, 60 * (2 ** min(10, (int) $row['attempts'] - 1)))) : null;
                $this->repository->finish($id, 'failed', 'Email delivery failed. Your application decision is saved; delivery can be retried.', $retryAt);
                $counts['failed']++;
            }
        }
        return $counts;
    }

    private function configured(): bool
    {
        return $this->mailer->isConfigured() && $this->verificationBaseUrl() !== null;
    }

    private function verificationBaseUrl(): ?string
    {
        $url = rtrim(trim((string) ($this->config['app']['url'] ?? '')), '/');
        $parts = parse_url($url);
        if (!is_array($parts) || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])
            || isset($parts['query']) || isset($parts['fragment']) || preg_match('/[\x00-\x20\x7f]/', $url)) { return null; }
        $scheme = $parts['scheme'] ?? '';
        if ($scheme !== 'https' && !(($this->config['app']['environment'] ?? 'production') === 'local'
            && $scheme === 'http' && in_array($parts['host'], ['localhost', '127.0.0.1', '[::1]'], true))) { return null; }
        return $url;
    }

    private function supportContact(): string
    {
        return trim((string) ($this->config['mail']['support_contact'] ?? ''));
    }

    private function delivery(array $row): array
    {
        return ['id' => (int) $row['id'], 'kind' => (string) $row['kind'], 'status' => (string) $row['status'],
            'attempts' => (int) $row['attempts'], 'sentAt' => $row['sent_at'] ?: null, 'lastError' => $row['last_error'] ?: null];
    }

    private function deliveryMessage(string $status): string
    {
        return match ($status) {
            'sent' => 'The latest email was accepted by the mail service. Open the verification link to confirm your address.',
            'failed' => 'Email delivery failed. Your application is saved. Request a new link or contact support.',
            'unconfigured' => 'Email delivery is not configured. Your application is saved. Contact support for assistance.',
            'pending', 'sending' => 'Your email is queued for delivery. Check this page again for its delivery status.',
            default => 'Verify your email address to access broker privileges after your application is approved.',
        };
    }

    private function message(array $row, array $user, ?string $link): array
    {
        $payload = json_decode((string) $row['payload_json'], true, 512, JSON_THROW_ON_ERROR);
        $reason = trim((string) ($payload['reason'] ?? ''));
        $body = match ($row['kind']) {
            'application_received' => 'Your LOCUS-SF broker application has been received and is awaiting review. We will notify you by email once a decision has been made.',
            'verification' => 'Please verify ownership of your email address for your LOCUS-SF broker account. Email verification and application approval are separate requirements.',
            'approved' => 'Your LOCUS-SF broker application has been approved. You may now sign in and access your broker account.',
            'corrections_requested' => 'Your LOCUS-SF broker application requires corrections before review can be completed. Reason: ' . $reason . ' Sign in to your broker account to update your application and submit it again.',
            'rejected' => 'Following an authorized review, your LOCUS-SF broker application has been declined. Reason: ' . $reason . ($this->supportContact() !== '' ? ' If you believe this decision is incorrect, please contact ' . $this->supportContact() . '.' : ''),
            'blocked' => 'Following a review of your submitted credentials, your broker application has been declined and your account access has been blocked. Reason: ' . $reason . '. If you believe this decision is incorrect, please contact ' . $this->supportContact() . '.',
            default => throw new InvalidArgumentException('Unknown notification type.'),
        };
        if ($link !== null) {
            $hours = max(300, min(604800, (int) ($this->config['mail']['verification_ttl_seconds'] ?? 86400))) / 3600;
            $body .= "\n\nYou must also verify your email address before broker privileges are enabled. Open this link and select Verify email:\n" . $link
                . "\n\nThis link can be used once and expires in " . rtrim(rtrim(number_format($hours, 2, '.', ''), '0'), '.') . ' hours. Requesting another delivered verification link replaces earlier links.';
        } elseif ($row['kind'] === 'approved' && empty($user['email_verified_at'])) {
            $body .= "\n\nEmail ownership verification is still required before broker privileges are enabled. Sign in to request a verification link.";
        }
        $title = match ($row['kind']) {
            'application_received' => 'Application received', 'verification' => 'Verify your email address',
            'approved' => 'Application approved', 'corrections_requested' => 'Corrections requested',
            'rejected' => 'Application declined', 'blocked' => 'Account access blocked',
            default => 'Broker application update',
        };
        return ['LOCUS-SF: ' . $title, 'Dear ' . trim((string) $user['name']) . ",\n\n" . $body . "\n\nLOCUS-SF application review team"];
    }
}
