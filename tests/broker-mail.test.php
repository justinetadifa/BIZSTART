<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

// The child is a bounded, authenticated loopback SMTP capture. It has no relay capability.
if (($argv[1] ?? '') === '--capture-child') {
    $server = stream_socket_server('tcp://127.0.0.1:0', $errno, $error);
    if (!$server) { exit(2); }
    $address = stream_socket_get_name($server, false);
    echo substr($address, (int) strrpos($address, ':') + 1) . "\n";
    fflush(STDOUT);
    $path = $argv[2];
    $deadline = time() + 45;
    while (time() < $deadline && ($connection = @stream_socket_accept($server, 2))) {
        stream_set_timeout($connection, 5);
        fwrite($connection, "220 localhost broker-mail capture\r\n");
        $authStep = 0;
        $authenticated = false;
        while (($line = fgets($connection)) !== false) {
            $command = strtoupper(strtok(trim($line), ' ') ?: '');
            if ($authStep === 1) { $authStep = 2; fwrite($connection, "334 UGFzc3dvcmQ6\r\n"); continue; }
            if ($authStep === 2) { $authStep = 0; $authenticated = true; fwrite($connection, "235 2.7.0 Authenticated\r\n"); continue; }
            if ($command === 'EHLO' || $command === 'HELO') { fwrite($connection, "250-localhost\r\n250-AUTH LOGIN\r\n250 SIZE 10485760\r\n"); }
            elseif ($command === 'AUTH') { $authStep = 1; fwrite($connection, "334 VXNlcm5hbWU6\r\n"); }
            elseif ($command === 'DATA') {
                if (!$authenticated) { fwrite($connection, "530 Authentication required\r\n"); continue; }
                fwrite($connection, "354 End with a period\r\n");
                $message = '';
                while (($data = fgets($connection)) !== false && rtrim($data, "\r\n") !== '.') {
                    $message .= str_starts_with($data, '..') ? substr($data, 1) : $data;
                }
                file_put_contents($path, json_encode(['authenticated' => $authenticated, 'message' => $message], JSON_THROW_ON_ERROR) . "\n", FILE_APPEND);
                fwrite($connection, "250 2.0.0 Captured locally\r\n");
            } elseif ($command === 'QUIT') { fwrite($connection, "221 Goodbye\r\n"); break; }
            else { fwrite($connection, "250 OK\r\n"); }
        }
        fclose($connection);
    }
    fclose($server);
    exit(0);
}

require_once dirname(__DIR__) . '/app/Repositories/BrokerMailRepository.php';
require_once dirname(__DIR__) . '/app/Support/BrokerMailer.php';
require_once dirname(__DIR__) . '/app/Support/BrokerEmailService.php';

use App\Repositories\BrokerMailRepository;
use App\Support\BrokerMailer;
use App\Support\BrokerEmailService;
use App\Support\BrokerEmailRateLimitException;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$rejects = static function (callable $action, string $message) use ($check): void {
    try { $action(); } catch (InvalidArgumentException) { $check(true, $message); return; }
    throw new RuntimeException($message);
};
$pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec('CREATE TABLE users (id INTEGER PRIMARY KEY,role TEXT,name TEXT,email TEXT,email_verified_at TEXT NULL,application_status TEXT DEFAULT \'pending_review\',account_status TEXT DEFAULT \'active\')');
$pdo->exec('CREATE TABLE email_verification_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,email TEXT,token_hash TEXT UNIQUE,expires_at TEXT,used_at TEXT NULL,created_at TEXT)');
$pdo->exec('CREATE TABLE broker_mail_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,kind TEXT,dedupe_key TEXT UNIQUE,recipient_email TEXT,payload_json TEXT,status TEXT DEFAULT \'pending\',attempts INTEGER DEFAULT 0,last_error TEXT NULL,next_attempt_at TEXT NULL,locked_at TEXT NULL,sent_at TEXT NULL,created_at TEXT,updated_at TEXT)');
for ($id = 1; $id <= 6; $id++) {
    $insert = $pdo->prepare('INSERT INTO users(id,role,name,email) VALUES(?,\'seller\',\'Synthetic Broker\',?)');
    $insert->execute([$id, 'broker' . $id . '@example.test']);
}
$ratePath = sys_get_temp_dir() . '/sfc-broker-mail-' . bin2hex(random_bytes(8));
$config = ['app' => ['environment' => 'local', 'url' => 'http://localhost/sfcelerate-bizstart'],
    'security' => ['rate_limit_path' => $ratePath], 'mail' => ['smtp_host' => '127.0.0.1', 'smtp_port' => 1025,
        'smtp_username' => 'capture-user', 'smtp_password' => 'synthetic-capture-password', 'smtp_auth' => true,
        'smtp_encryption' => 'none', 'from_email' => 'noreply@example.test', 'support_contact' => 'support@example.test',
        'verification_ttl_seconds' => 86400, 'max_attempts' => 2]];
$repository = new BrokerMailRepository($pdo);
$missingConfig = array_replace_recursive($config, ['mail' => ['smtp_host' => '', 'smtp_username' => '', 'smtp_password' => '']]);
$unconfigured = new BrokerEmailService($repository, new BrokerMailer($missingConfig), $missingConfig);
$received = $unconfigured->applicationReceived(['id' => 1], 1);
$check($received['status'] === 'unconfigured' && $received['sentAt'] === null, 'Unconfigured mail must never claim to be sent.');
$duplicate = $unconfigured->applicationReceived(['id' => 1], 1);
$check($duplicate['id'] === $received['id'] && (int) $pdo->query('SELECT COUNT(*) FROM broker_mail_outbox')->fetchColumn() === 1, 'Submission receipt deduplication failed.');
$check($unconfigured->deliverPending()['mailConfigured'] === false && (int) $pdo->query('SELECT COUNT(*) FROM email_verification_tokens')->fetchColumn() === 0, 'Unconfigured delivery must not issue an unreachable link.');
$check($unconfigured->status(1)['message'] === 'Email delivery is not configured. Your application is saved. Contact support for assistance.', 'Missing SMTP must be visible without a misleading sent message.');
$pdo->beginTransaction();
$unconfigured->applicationReceived(['id' => 2], 1);
$check($pdo->inTransaction(), 'Enqueue must preserve the caller transaction.');
$pdo->rollBack();
$check($repository->latest(2) === null, 'Notification should roll back with an abandoned submission.');

class CapturingBrokerMailer extends BrokerMailer
{
    public array $messages = [];
    public bool $fail = false;
    public function isConfigured(): bool { return true; }
    public function send(string $recipient, string $name, string $subject, string $body, string $dedupeKey): void
    {
        if ($this->fail) { throw new RuntimeException('Synthetic SMTP rejection'); }
        $this->messages[] = compact('recipient', 'subject', 'body', 'dedupeKey');
    }
}
$capture = new CapturingBrokerMailer($config);
$service = new BrokerEmailService($repository, $capture, $config);
$check($service->deliverPending()['sent'] === 1, 'Previously unconfigured notifications should deliver after configuration.');
$message = $capture->messages[0];
$check(str_contains($message['body'], 'Your LOCUS-SF broker application has been received and is awaiting review. We will notify you by email once a decision has been made.'), 'Receipt wording changed.');
$check(preg_match('/#token=([a-f0-9]{64})/', $message['body'], $match) === 1, 'Unverified application receipt must contain a verification link.');
$token = $match[1];
$hash = (string) $pdo->query('SELECT token_hash FROM email_verification_tokens ORDER BY id DESC LIMIT 1')->fetchColumn();
$check(hash_equals(hash('sha256', $token), $hash) && $hash !== $token, 'Verification token must be stored hashed.');
$check(!str_contains((string) $pdo->query('SELECT payload_json FROM broker_mail_outbox LIMIT 1')->fetchColumn(), $token), 'Outbox must not store raw verification tokens.');
$check($service->verify($token)['verified'] === true, 'Valid token should verify email ownership.');
$rejects(fn () => $service->verify($token), 'A used link was accepted twice.');
$rejects(fn () => $service->verify('bad'), 'Malformed verification code accepted.');
$check($pdo->query('SELECT application_status FROM users WHERE id=1')->fetchColumn() === 'pending_review', 'Email verification must not approve an application.');
$check($service->status(1)['verified'] && !$service->status(1)['canResend'], 'Verified email status is not independent from review.');
$check(!isset($service->status(1)['delivery']['payload_json']), 'Delivery status exposed private message data.');

$expiryToken = bin2hex(random_bytes(32));
$repository->issueToken(2, hash('sha256', $expiryToken), 3600);
$pdo->exec("UPDATE email_verification_tokens SET expires_at='2000-01-01 00:00:00' WHERE user_id=2");
$rejects(fn () => $service->verify($expiryToken), 'Expired link accepted.');
$oldToken = bin2hex(random_bytes(32));
$newToken = bin2hex(random_bytes(32));
$repository->issueToken(2, hash('sha256', $oldToken), 3600);
$repository->issueToken(2, hash('sha256', $newToken), 3600);
$rejects(fn () => $service->verify($oldToken), 'Resent link did not invalidate the previous token.');
$pdo->exec("UPDATE users SET email='changed@example.test' WHERE id=2");
$rejects(fn () => $service->verify($newToken), 'A link sent to an old email verified a changed address.');
$rejects(fn () => $repository->issueToken(2, hash('sha256', bin2hex(random_bytes(32))), 3600, 'broker2@example.test'), 'A stale queued recipient must not issue a token for a changed email.');

$capture->fail = true;
$approval = $service->applicationDecision(['id' => 3], ['id' => 31, 'decision' => 'verified', 'reason' => 'Reviewed credentials']);
$again = $service->applicationDecision(['id' => 3], ['id' => 31, 'decision' => 'approved', 'reason' => 'Reviewed credentials']);
$check($approval['id'] === $again['id'], 'Decision notification deduplication failed.');
$pdo->exec("UPDATE users SET application_status='verified' WHERE id=3");
$check($service->deliverPending()['failed'] === 1, 'SMTP error must become a persisted failure.');
$failed = $service->status(3)['delivery'];
$check($failed['status'] === 'failed' && $failed['sentAt'] === null && $failed['attempts'] === 1, 'Failed SMTP was mislabeled as sent.');
$check($pdo->query('SELECT application_status FROM users WHERE id=3')->fetchColumn() === 'verified', 'SMTP failure discarded an application decision.');
$check($service->deliverPending()['failed'] === 0, 'Retry backoff was ignored.');
$service->retryDelivery($approval['id']);
$capture->fail = false;
$check($service->deliverPending()['sent'] === 1 && $service->status(3)['delivery']['status'] === 'sent', 'Manual retry did not deliver the saved notification.');
$service->retryDelivery($approval['id']);
$check($service->deliverPending()['sent'] === 0, 'Already sent notification was duplicated by retry.');
$approvedMessage = $capture->messages[1]['body'];
$check(str_contains($approvedMessage, 'Your LOCUS-SF broker application has been approved. You may now sign in and access your broker account.') && str_contains($approvedMessage, 'Email ownership verification is still required'), 'Approval must include the specified wording and preserve email gate.');

$service->resend(['id' => 4], '192.0.2.4');
try { $service->resend(['id' => 4], '192.0.2.4'); throw new RuntimeException('Per-user resend limit ignored.'); }
catch (BrokerEmailRateLimitException $limited) { $check($limited->retryAfter > 0, 'Per-user resend rate limit must provide retry delay.'); }
$ipLimited = false;
for ($attempt = 0; $attempt < 12; $attempt++) {
    try { $service->resend(['id' => 4], '192.0.2.5'); }
    catch (BrokerEmailRateLimitException $limited) { if ($limited->retryAfter === 3600) { $ipLimited = true; break; } }
}
$check($ipLimited, 'Per-IP resend rate limiting failed.');
$service->applicationDecision(['id' => 4], ['id' => 41, 'decision' => 'corrections_requested', 'reason' => 'Please upload a clearer back image']);
$service->applicationDecision(['id' => 4], ['id' => 42, 'decision' => 'rejected', 'reason' => 'Credentials could not be confirmed']);
$service->applicationDecision(['id' => 4], ['id' => 43, 'decision' => 'blocked', 'reason' => 'Confirmed documented review finding']);
$check($service->deliverPending()['sent'] === 4, 'Verification, correction, rejection, and blocking notifications must all be deliverable.');
$blockMessage = end($capture->messages)['body'];
$check(str_contains($blockMessage, 'Following a review of your submitted credentials, your broker application has been declined and your account access has been blocked. Reason: Confirmed documented review finding. If you believe this decision is incorrect, please contact support@example.test.'), 'Blocking notification must include the reviewed reason and configured support contact.');
$noSupportConfig = array_replace_recursive($config, ['mail' => ['support_contact' => '']]);
$noSupportService = new BrokerEmailService($repository, $capture, $noSupportConfig);
$noSupportService->applicationDecision(['id' => 6], ['id' => 61, 'decision' => 'blocked', 'reason' => 'Documented authorized finding']);
$check($noSupportService->deliverPending()['unconfigured'] === 1 && $noSupportService->status(6)['delivery']['attempts'] === 0,
    'Missing blocking support contact must wait without consuming SMTP retry attempts.');
$check($service->deliverPending()['sent'] === 1, 'Configuring support contact must resume the saved blocking notification.');
$unsafe = array_replace_recursive($config, ['app' => ['environment' => 'production'], 'mail' => ['smtp_auth' => false]]);
$check(!(new BrokerMailer($unsafe))->isConfigured(), 'Production must reject unauthenticated/plaintext SMTP.');
$unsafe = array_replace_recursive($config, ['mail' => ['smtp_host' => 'external.example.test', 'smtp_auth' => false]]);
$check(!(new BrokerMailer($unsafe))->isConfigured(), 'Local capture exception must stay on loopback.');
$unsafe = array_replace_recursive($config, ['app' => ['url' => 'http://external.example.test']]);
$unsafeService = new BrokerEmailService($repository, $capture, $unsafe);
$check(!$unsafeService->status(5)['mailConfigured'], 'Verification origin must use HTTPS outside local loopback.');

// Exercise the real maintained SMTP implementation against a local authenticated mailbox capture.
$captureFile = tempnam(sys_get_temp_dir(), 'sfc-mail-capture-');
$pipes = [];
$process = proc_open([PHP_BINARY, __FILE__, '--capture-child', $captureFile],
    [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
try {
    $check(is_resource($process), 'Unable to start local SMTP capture.');
    stream_set_timeout($pipes[1], 5);
    $port = (int) fgets($pipes[1]);
    $check($port > 0, 'Local SMTP capture did not start.');
    $smtpConfig = array_replace_recursive($config, ['mail' => ['smtp_port' => $port]]);
    $smtpService = new BrokerEmailService($repository, new BrokerMailer($smtpConfig), $smtpConfig);
    $smtpService->applicationReceived(['id' => 5], 1);
    $check($smtpService->deliverPending()['sent'] === 1, 'Actual authenticated SMTP capture delivery failed.');
    $captured = json_decode(trim((string) file_get_contents($captureFile)), true, 512, JSON_THROW_ON_ERROR);
    $mime = (string) $captured['message'];
    $body = base64_decode(trim(explode("\r\n\r\n", $mime, 2)[1]), true);
    $check($captured['authenticated'] && str_contains($mime, 'To: Synthetic Broker <broker5@example.test>')
        && is_string($body) && str_contains($body, 'Your LOCUS-SF broker application has been received'), 'Captured mail failed authentication, recipient, or wording check.');
    $check(str_contains($mime, 'Message-ID: <locus-') && preg_match('/#token=([a-f0-9]{64})/', $body, $smtpToken) === 1, 'Real SMTP mail lacks stable message identity or verification URL.');
    $check($smtpService->verify($smtpToken[1])['verified'], 'The link captured through real SMTP must be usable.');
} finally {
    if (is_resource($process)) { proc_terminate($process); }
    foreach ($pipes as $pipe) { if (is_resource($pipe)) { fclose($pipe); } }
    if (is_resource($process)) { proc_close($process); }
    if (is_file($captureFile)) { unlink($captureFile); }
    if (is_dir($ratePath)) {
        foreach (glob($ratePath . '/*.json') ?: [] as $path) { unlink($path); }
        rmdir($ratePath);
    }
}
if (in_array('--integration', $argv, true)) {
    require_once dirname(__DIR__) . '/app/Core/BrokerSchemaManager.php';
    $appConfig = require dirname(__DIR__) . '/app/config.php';
    $db = $appConfig['db'];
    if (($appConfig['app']['environment'] ?? '') !== 'local'
        || !in_array((string) $db['host'], ['127.0.0.1', 'localhost', '::1'], true)) {
        throw new RuntimeException('Mail integration requires a local MySQL server and a disposable database.');
    }
    $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false];
    $dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $db['host'], (int) ($db['port'] ?? 3306));
    $server = new PDO($dsn, (string) $db['user'], (string) $db['pass'], $options);
    $testName = 'locus_broker_mail_test_' . bin2hex(random_bytes(8));
    try {
        $server->exec('CREATE DATABASE `' . $testName . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $mysql = new PDO($dsn . ';dbname=' . $testName, (string) $db['user'], (string) $db['pass'], $options);
        $mysql->exec("SET time_zone='+00:00'");
        $mysql->exec("CREATE TABLE users(id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,role VARCHAR(20) NOT NULL,name VARCHAR(190) NOT NULL,email VARCHAR(190) NOT NULL,account_status VARCHAR(20) NOT NULL DEFAULT 'active',application_status VARCHAR(30) NOT NULL DEFAULT 'pending_review') ENGINE=InnoDB");
        $mysql->exec("CREATE TABLE seller_profiles(user_id INT NOT NULL PRIMARY KEY,seller_type VARCHAR(20) DEFAULT 'broker',application_status VARCHAR(30) DEFAULT 'pending_review',submitted_at DATETIME NULL) ENGINE=InnoDB");
        App\Core\BrokerSchemaManager::ensure($mysql);
        App\Core\BrokerSchemaManager::ensure($mysql);
        $check((int) $mysql->getAttribute(PDO::ATTR_EMULATE_PREPARES) === 0, 'MySQL smoke must use native prepared statements.');
        $mysql->exec("INSERT INTO users(role,name,email) VALUES('seller','MySQL Synthetic Broker','mysql-broker@example.test'),('seller','MySQL Synthetic Broker Two','mysql-broker-two@example.test')");
        $mysqlRepo = new BrokerMailRepository($mysql);
        $mysqlCapture = new CapturingBrokerMailer($config);
        $mysqlService = new BrokerEmailService($mysqlRepo, $mysqlCapture, $config);
        $queued = $mysqlService->applicationReceived(['id' => 1], 1);
        $duplicate = $mysqlService->applicationReceived(['id' => 1], 1);
        $check($queued['id'] === $duplicate['id'] && $queued['status'] === 'pending', 'Native MySQL receipt enqueue or unique dedupe failed.');
        $check($mysqlService->deliverPending()['sent'] === 1 && $mysqlService->status(1)['delivery']['attempts'] === 1, 'MySQL claim and finish delivery failed.');
        $check(preg_match('/#token=([a-f0-9]{64})/', $mysqlCapture->messages[0]['body'], $nativeToken) === 1, 'MySQL-backed receipt did not create a verification URL.');
        $check($mysqlService->verify($nativeToken[1])['verified'] && $mysqlService->status(1)['verified'], 'MySQL token consume or timestamp persistence failed.');
        $rejects(fn () => $mysqlService->verify($nativeToken[1]), 'MySQL accepted a used token.');
        $mysql->beginTransaction();
        $mysqlService->applicationReceived(['id' => 2], 1);
        $check($mysql->inTransaction(), 'MySQL enqueue must not commit the caller transaction.');
        $mysql->rollBack();
        $check($mysqlRepo->latest(2) === null, 'MySQL enqueue rollback failed.');
        $mysqlCapture->fail = true;
        $review = $mysqlService->applicationDecision(['id' => 2], ['id' => 200, 'decision' => 'approved', 'reason' => 'Authorized review']);
        $mysql->exec("UPDATE users SET application_status='verified' WHERE id=2");
        $check($mysqlService->deliverPending()['failed'] === 1 && $mysqlService->status(2)['delivery']['status'] === 'failed', 'MySQL SMTP rejection must persist failure.');
        $check($mysql->query('SELECT application_status FROM users WHERE id=2')->fetchColumn() === 'verified', 'MySQL mail failure changed saved decision.');
        $mysqlService->retryDelivery($review['id']);
        $mysqlCapture->fail = false;
        $check($mysqlService->deliverPending()['sent'] === 1, 'MySQL retry claim failed.');
        $mysqlService->resend(['id' => 2]);
        try { $mysqlService->resend(['id' => 2]); throw new RuntimeException('MySQL user lock rate limit failed.'); }
        catch (BrokerEmailRateLimitException $exception) { $check($exception->retryAfter > 0, 'MySQL resend lock must preserve retry time.'); }
        // Reproduce a queue-table outage inside the independently committed decision transaction.
        $mysql->exec('RENAME TABLE broker_mail_outbox TO broker_mail_outbox_unavailable');
        $mysql->beginTransaction();
        $mysql->exec("UPDATE users SET application_status='rejected' WHERE id=2");
        $mysql->exec("INSERT INTO broker_application_reviews(id,user_id,reviewer_user_id,application_revision,decision,reason)
            VALUES(201,2,1,1,'rejected','Synthetic saved decision during mail outage')");
        try {
            $mysqlService->applicationDecision(['id' => 2], ['id' => 201, 'decision' => 'rejected', 'reason' => 'Synthetic saved decision during mail outage']);
            throw new RuntimeException('Synthetic queue outage did not reject INSERT.');
        } catch (PDOException) { $check($mysql->inTransaction(), 'Mail INSERT failure must not terminate the review transaction.'); }
        $mysql->commit();
        $check($mysql->query('SELECT application_status FROM users WHERE id=2')->fetchColumn() === 'rejected', 'Saved MySQL decision must survive a missing mail table.');
        $outageStatus = $mysqlService->status(2);
        $check($outageStatus['delivery']['status'] === 'enqueue_failed' && $outageStatus['delivery']['sentAt'] === null
            && !$outageStatus['canResend'], 'Missing outbox status must return a safe truthful state after decision commit.');
        $mysql->exec('RENAME TABLE broker_mail_outbox_unavailable TO broker_mail_outbox');
        $mysql->exec("INSERT INTO seller_profiles(user_id,application_revision,submitted_at) VALUES(1,0,UTC_TIMESTAMP()),(2,2,UTC_TIMESTAMP())");
        $recovered = $mysqlService->reconcilePending(1);
        $check($recovered['decisions'] === 1 && $recovered['received'] === 0 && $recovered['failed'] === 0,
            'Bounded recovery must reconstruct the missed saved decision first.');
        $check($mysqlRepo->byKey('broker-review-201') !== null, 'Recovery must preserve the original unique review notification key.');
        $recovered = $mysqlService->reconcilePending(1);
        $check($recovered['received'] === 1 && $recovered['decisions'] === 0, 'Next bounded recovery pass must reconstruct the missed submission receipt.');
        $check($mysqlRepo->byKey('broker-received-2-2') !== null && $mysqlRepo->byKey('broker-received-1-0') === null,
            'Receipt recovery must include current submitted revisions and skip legacy revision-zero records.');
        $recovered = $mysqlService->reconcilePending(10);
        $check($recovered === ['decisions' => 0, 'received' => 0, 'failed' => 0], 'Repeated reconciliation must not duplicate previously queued mail.');
        $historyInsert = $mysql->prepare('INSERT INTO broker_application_reviews(id,user_id,reviewer_user_id,application_revision,decision,reason,snapshot_json) VALUES(?,2,1,0,\'verified\',\'Synthetic historical review\',?)');
        $historyInsert->execute([202, json_encode(['source' => 'legacy_review'], JSON_THROW_ON_ERROR)]);
        $historyInsert->execute([203, json_encode(['prcChecked' => true], JSON_THROW_ON_ERROR)]);
        $recovered = $mysqlService->reconcilePending(10);
        $check($recovered['decisions'] === 1 && $mysqlRepo->byKey('broker-review-202') === null,
            'Imported legacy review history must never trigger historical notification delivery.');
        $check($mysqlRepo->byKey('broker-review-203') !== null,
            'An explicitly made Batch B decision for a legacy revision-zero applicant must still recover.');
        $mysql->beginTransaction();
        $snapshotEmail = $mysql->query('SELECT email FROM users WHERE id=2')->fetchColumn();
        $concurrent = new PDO($dsn . ';dbname=' . $testName, (string) $db['user'], (string) $db['pass'], $options);
        $concurrent->exec("UPDATE users SET email='current-recipient@example.test',email_verified_at=UTC_TIMESTAMP() WHERE id=2");
        $mysqlService->applicationDecision(['id' => 2], ['id' => 204, 'decision' => 'approved', 'reason' => 'Current read regression']);
        $currentUser = $mysqlRepo->user(2);
        $mysql->commit();
        $currentRow = $mysqlRepo->byKey('broker-review-204');
        $check($snapshotEmail !== 'current-recipient@example.test' && $currentRow['recipient_email'] === 'current-recipient@example.test'
            && !empty($currentUser['email_verified_at']),
            'Queueing inside an older transaction snapshot must read the current locked recipient and email ownership.');
        $concurrent = null;
        echo "Disposable MySQL mail smoke passed; native prepares, schema, tokens, retries, and decisions verified.\n";
    } finally {
        $mysql = null;
        $server->exec('DROP DATABASE IF EXISTS `' . $testName . '`');
    }
}
echo 'Broker mail checks passed (' . $checks . " checks; isolated databases and authenticated loopback SMTP capture only).\n";
