<?php
declare(strict_types=1);

namespace App\Support;

use PHPMailer\PHPMailer\PHPMailer;
use RuntimeException;

require_once dirname(__DIR__) . '/ThirdParty/PHPMailer/src/Exception.php';
require_once dirname(__DIR__) . '/ThirdParty/PHPMailer/src/PHPMailer.php';
require_once dirname(__DIR__) . '/ThirdParty/PHPMailer/src/SMTP.php';

/** Authenticated SMTP only; unauthenticated/plaintext transport is loopback capture only. */
class BrokerMailer
{
    public function __construct(private array $config)
    {
    }

    public function isConfigured(): bool
    {
        $mail = $this->config['mail'] ?? [];
        $host = trim((string) ($mail['smtp_host'] ?? ''));
        $encryption = strtolower((string) ($mail['smtp_encryption'] ?? 'tls'));
        $auth = (bool) ($mail['smtp_auth'] ?? true);
        $capture = ($this->config['app']['environment'] ?? 'production') === 'local'
            && in_array($host, ['127.0.0.1', '::1', 'localhost'], true);
        return $host !== '' && !preg_match('/[\s;\/]/', $host)
            && filter_var($mail['from_email'] ?? '', FILTER_VALIDATE_EMAIL) !== false
            && (int) ($mail['smtp_port'] ?? 587) > 0 && (int) ($mail['smtp_port'] ?? 587) <= 65535
            && (in_array($encryption, ['tls', 'ssl'], true) || ($capture && $encryption === 'none'))
            && (($auth && trim((string) ($mail['smtp_username'] ?? '')) !== ''
                && (string) ($mail['smtp_password'] ?? '') !== '') || ($capture && !$auth));
    }

    /** Returning means the SMTP server accepted the message, not that a user read it. */
    public function send(string $recipient, string $name, string $subject, string $body, string $dedupeKey): void
    {
        if (!$this->isConfigured()) {
            throw new RuntimeException('Email delivery is not configured.');
        }
        $settings = $this->config['mail'];
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->SMTPDebug = 0;
        $mail->Host = (string) $settings['smtp_host'];
        $mail->Port = (int) ($settings['smtp_port'] ?? 587);
        $mail->SMTPAuth = (bool) ($settings['smtp_auth'] ?? true);
        $mail->Username = (string) ($settings['smtp_username'] ?? '');
        $mail->Password = (string) ($settings['smtp_password'] ?? '');
        $encryption = strtolower((string) ($settings['smtp_encryption'] ?? 'tls'));
        $mail->SMTPSecure = $encryption === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS
            : ($encryption === 'tls' ? PHPMailer::ENCRYPTION_STARTTLS : '');
        $mail->SMTPAutoTLS = $encryption !== 'none';
        $mail->Timeout = 30;
        $mail->Timelimit = 30;
        $mail->CharSet = PHPMailer::CHARSET_UTF8;
        $mail->Encoding = PHPMailer::ENCODING_BASE64;
        $mail->XMailer = '';
        $mail->setFrom((string) $settings['from_email'], (string) ($settings['from_name'] ?? 'LOCUS-SF'));
        $support = trim((string) ($settings['support_contact'] ?? ''));
        if (filter_var($support, FILTER_VALIDATE_EMAIL)) {
            $mail->addReplyTo($support, 'LOCUS-SF support');
        }
        $mail->addAddress($recipient, $name);
        $mail->isHTML(false);
        $mail->Subject = $subject;
        $mail->Body = $body;
        $domain = substr((string) $settings['from_email'], (int) strrpos((string) $settings['from_email'], '@') + 1);
        $mail->MessageID = '<locus-' . hash('sha256', $dedupeKey) . '@' . $domain . '>';
        $mail->send();
    }
}
