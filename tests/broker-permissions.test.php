<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Repositories/UserRepository.php';
require_once dirname(__DIR__) . '/app/Repositories/SellerProfileRepository.php';
require_once dirname(__DIR__) . '/app/Core/SchemaManager.php';

use App\Core\SchemaManager;
use App\Repositories\UserRepository;
use App\Repositories\SellerProfileRepository;
use App\Support\BrokerDocuments;

$config = require dirname(__DIR__) . '/app/config.php';
$db = $config['db'];
if (($config['app']['environment'] ?? '') !== 'local' || !in_array($db['host'], ['127.0.0.1', 'localhost', '::1'], true)) {
    throw new RuntimeException('Permission integration requires local MySQL.');
}
$options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false];
$dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $db['host'], (int) ($db['port'] ?? 3306));
$server = new PDO($dsn, (string) $db['user'], (string) $db['pass'], $options);
$database = 'locus_broker_permission_test_' . bin2hex(random_bytes(8));
$directory = sys_get_temp_dir() . '/locus-broker-permissions-' . bin2hex(random_bytes(8));
mkdir($directory);
session_save_path($directory);
$checks = 0;
$created = false;
$documentPaths = [];
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$reject = static function (callable $operation, string $message) use ($check): void {
    try { $operation(); } catch (InvalidArgumentException) { $check(true, $message); return; }
    throw new RuntimeException($message);
};
try {
    $server->exec('CREATE DATABASE `' . $database . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $created = true;
    $pdo = new PDO($dsn . ';dbname=' . $database, (string) $db['user'], (string) $db['pass'], $options);
    SchemaManager::ensure($pdo);
    $users = new UserRepository($pdo);
    $documents = new BrokerDocuments($directory);
    $profiles = new SellerProfileRepository($pdo, $documents);
    $GLOBALS['container'] = ['pdo' => $pdo, 'users' => $users, 'sellerProfiles' => $profiles];
    $password = 'Permission-test-' . bin2hex(random_bytes(8));
    $ict = $users->create('admin', 'ICT administrator', 'ict@example.test', $password, 'CICTO');
    $cao = $users->create('admin', 'CAO reviewer', 'cao@example.test', $password, 'ASSESSOR');
    $lebdo = $users->create('admin', 'LEBDO reviewer', 'lebdo@example.test', $password, 'LEBDO');
    $broker = $users->create('seller', 'Applicant Broker', 'broker@gmail.com', $password);
    $investor = $users->create('investor', 'Investor', 'investor@example.test', $password);
    $otherBroker = $users->create('seller', 'Another applicant', 'other-broker@example.test', $password);
    foreach ([$ict, $cao, $lebdo, $broker, $investor] as $user) {
        $check(!sfc_can_review_brokers($user), 'An account gained review authority by default.');
    }
    $check(sfc_can_administer_city($ict) && !sfc_can_administer_city($cao), 'Technical administration separation failed.');
    $check(sfc_can_review_listings($ict) && !sfc_can_review_listings($cao), 'Existing listing governance changed.');
    $reject(fn () => $users->setBrokerReviewAuthorization($ict['id'], true, $ict), 'ICT granted itself broker review.');
    $reject(fn () => $users->setBrokerReviewAuthorization($cao['id'], true, $lebdo), 'A non-ICT account granted reviewer access.');
    $reject(fn () => $users->setBrokerReviewAuthorization($broker['id'], true, $ict), 'A seller received reviewer access.');
    $cao = $users->setBrokerReviewAuthorization($cao['id'], true, $ict);
    $lebdo = $users->setBrokerReviewAuthorization($lebdo['id'], true, $ict);
    $check(sfc_can_review_brokers($cao) && sfc_can_review_brokers($lebdo), 'Explicit CAO/LEBDO grants were ineffective.');
    $check(sfc_can_review_brokers(array_replace($cao, ['department' => 'CAO'])), 'CAO department alias failed.');
    $check(!sfc_can_review_brokers(array_replace($cao, ['identityVerificationStatus' => 'pending'])), 'An unactivated staff account could review.');
    $check(!sfc_can_review_brokers(array_replace($cao, ['accountStatus' => 'blocked'])), 'A blocked staff account could review.');
    $check(!sfc_can_review_brokers(array_replace($ict, ['brokerReviewAuthorized' => true])), 'Generic super admin bypassed reviewer separation.');
    $cao = $users->setBrokerReviewAuthorization($cao['id'], false, $ict);
    $check(!sfc_can_review_brokers($cao), 'Revoked permission still allowed review.');
    $check((int) $pdo->query("SELECT COUNT(*) FROM audit_logs WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.eventType')) = 'BROKER_REVIEW_PERMISSION'")->fetchColumn() === 3, 'Permission changes were not audited.');

    $metadata = [];
    foreach (['front', 'back'] as $side) {
        $id = bin2hex(random_bytes(32));
        $path = $documents->pathForId($id);
        file_put_contents($path, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr4sAAAAASUVORK5CYII=', true));
        $documentPaths[] = $path;
        $metadata[$side] = ['id' => $id, 'mime' => 'image/png', 'size' => filesize($path), 'sha256' => hash_file('sha256', $path)];
    }
    $payload = ['seller_type' => 'broker', 'legal_name' => 'Applicant Broker', 'phone' => '09170000123', 'address_line' => 'San Fernando', 'city' => 'San Fernando', 'authorization_basis' => 'Licensed real estate broker', 'prc_registration_no' => '98765001', 'prc_valid_until' => '2030-12-31'];
    $profiles->createOrUpdateForUser($broker['id'], $payload, true, $metadata);
    $cao = $users->setBrokerReviewAuthorization($cao['id'], true, $ict);
    $profiles->review($broker['id'], 'verified', $cao['id'], 'PRC details and both images checked.', true);
    $broker = $users->findById($broker['id']);
    $check(!sfc_broker_can_submit($broker), 'Review approval bypassed email verification.');
    $pdo->exec('UPDATE users SET email_verified_at = UTC_TIMESTAMP() WHERE id = ' . $broker['id']);
    $broker = $users->findById($broker['id']);
    $check(sfc_broker_can_submit($broker), 'A complete approved verified broker was denied.');
    $pdo->exec('UPDATE seller_profiles SET prc_back_json = NULL WHERE user_id = ' . $broker['id']);
    $check(!sfc_broker_can_submit($broker), 'Missing private ID side retained broker privileges.');
    $restore = $pdo->prepare('UPDATE seller_profiles SET prc_back_json = :metadata WHERE user_id = :id');
    $restore->execute(['metadata' => json_encode($metadata['back']), 'id' => $broker['id']]);
    $pdo->exec("UPDATE seller_profiles SET application_status = 'corrections_requested' WHERE user_id = " . $broker['id']);
    $check(!sfc_broker_can_submit($broker), 'Correction status retained broker privileges.');
    $pdo->exec("UPDATE seller_profiles SET application_status = 'verified', prc_valid_until = '2000-01-01' WHERE user_id = " . $broker['id']);
    $check(!sfc_broker_can_submit($broker), 'Expired credentials retained broker privileges.');
    $pdo->exec("UPDATE seller_profiles SET prc_valid_until = '2030-12-31' WHERE user_id = " . $broker['id']);

    // Exercise real session refresh and durable revocation, including later restoration.
    sfc_start_session();
    $authenticate = static function (array $user): void {
        $_SESSION['sfc_user'] = sfc_user_session_payload($user);
        $_SESSION['sfc_authenticated_at'] = time();
        $_SESSION['sfc_last_activity_at'] = time();
        $_SESSION['sfc_last_db_touch_at'] = time();
    };
    $authenticate($broker);
    $check((sfc_current_user()['id'] ?? null) === $broker['id'], 'An active broker session failed.');
    $oldSession = sfc_user_session_payload($broker);
    $profiles->review($broker['id'], 'blocked', $cao['id'], 'Documented credentials mismatch.', false, 'PRC registration confirmed to belong to a different person.');
    $blocked = $users->findById($broker['id']);
    $check($blocked['accountStatus'] === 'blocked' && $blocked['sessionVersion'] === $broker['sessionVersion'] + 1, 'Blocking did not advance session revocation.');
    $check(!sfc_account_can_authenticate($blocked) && !sfc_broker_can_submit($blocked), 'Blocked account retained authenticated privileges.');
    $check(sfc_current_user() === null && !isset($_SESSION['sfc_user']), 'An already authenticated blocked session survived refresh.');
    $pdo->exec("UPDATE users SET account_status = 'active', identity_verification_status = 'verified' WHERE id = " . $broker['id']);
    $authenticate($oldSession);
    $check(sfc_current_user() === null, 'A revoked session revived after account restoration.');
    $fresh = $users->findById($broker['id']);
    $authenticate($fresh);
    $check((sfc_current_user()['id'] ?? null) === $broker['id'], 'A new session could not authenticate after restoration.');
    $authenticate($lebdo);
    $users->setBrokerReviewAuthorization($lebdo['id'], false, $ict);
    $check(!sfc_can_review_brokers(sfc_current_user()), 'An active session retained revoked reviewer authority.');

    $documentRequest = static function (?int $actor, array $query, string $method = 'GET', string $endpoint = 'broker-document', bool $csrf = true) use ($dsn, $database, $db, $directory): array {
        $process = proc_open([PHP_BINARY, __DIR__ . '/fixtures/broker-document-request.php'], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        if (!is_resource($process)) { throw new RuntimeException('Unable to start document endpoint check.'); }
        fwrite($pipes[0], json_encode(['dsn' => $dsn . ';dbname=' . $database, 'username' => $db['user'], 'password' => $db['pass'], 'directory' => $directory, 'actor' => $actor, 'query' => $query, 'method' => $method, 'endpoint' => $endpoint, 'csrf' => $csrf], JSON_THROW_ON_ERROR));
        fclose($pipes[0]);
        $output = stream_get_contents($pipes[1]); fclose($pipes[1]);
        $error = stream_get_contents($pipes[2]); fclose($pipes[2]);
        $exit = proc_close($process);
        if ($exit !== 0 || $error !== '') { throw new RuntimeException('Private endpoint check failed: ' . $error); }
        return json_decode($output, true, 512, JSON_THROW_ON_ERROR);
    };
    $query = ['userId' => $broker['id'], 'side' => 'front', 'documentId' => $metadata['front']['id']];
    foreach ([null, $investor['id'], $ict['id'], $lebdo['id'], $otherBroker['id']] as $actor) {
        $check($documentRequest($actor, $query)['status'] === 403, 'A guest, investor, ICT or revoked reviewer read a private PRC image.');
    }
    foreach ([$broker['id'], $cao['id']] as $actor) {
        $result = $documentRequest($actor, $query);
        $check($result['status'] === 200 && hash_equals(hash_file('sha256', $documentPaths[0]), hash('sha256', base64_decode($result['body'], true))), 'Applicant or granted reviewer could not read their authorized PRC image.');
    }
    $check($documentRequest($cao['id'], array_replace($query, ['documentId' => str_repeat('0', 64)]))['status'] === 404, 'An unrelated document ID was accepted.');
    $check($documentRequest($cao['id'], array_replace($query, ['side' => '../front']))['status'] === 400, 'Document side accepted traversal.');
    $check($documentRequest($cao['id'], $query, 'HEAD')['body'] === '', 'HEAD leaked private image body.');
    $check($documentRequest($cao['id'], $query, 'POST')['status'] === 405, 'Document endpoint accepted writes.');
    foreach ([null, $investor['id'], $ict['id'], $lebdo['id'], $broker['id']] as $actor) {
        $check($documentRequest($actor, [], 'PATCH', 'seller-profiles')['status'] === 403, 'An unauthorized API actor could attempt broker review.');
    }
    $check($documentRequest($cao['id'], [], 'PATCH', 'seller-profiles', false)['status'] === 419, 'Broker review API bypassed CSRF.');
    $check($documentRequest($ict['id'], ['scope' => 'queue'], 'GET', 'seller-profiles')['status'] === 403, 'ICT read the private review queue.');
    $check($documentRequest($cao['id'], ['scope' => 'queue'], 'GET', 'seller-profiles')['status'] === 200, 'A granted reviewer could not read the queue.');
    foreach (['messages', 'visit-logs', 'document-requests', 'property-command-center'] as $endpoint) {
        $check($documentRequest($otherBroker['id'], ['id' => 1, 'propertyId' => 1], 'GET', $endpoint)['status'] === 403, 'An unverified applicant accessed broker coordination records.');
    }
    $pdo->exec("UPDATE users SET account_status = 'blocked', session_version = session_version + 1 WHERE id = " . $broker['id']);
    $check($documentRequest($broker['id'], $query)['status'] === 403, 'A blocked applicant retained private document access.');
    echo 'Broker permission checks passed (' . $checks . " checks; disposable MySQL only).\n";
} finally {
    if (session_status() === PHP_SESSION_ACTIVE) { session_destroy(); }
    if ($created) { $server->exec('DROP DATABASE `' . $database . '`'); }
    foreach ($documentPaths as $path) { if (is_file($path)) { unlink($path); } }
    foreach (glob($directory . '/sess_*') ?: [] as $path) { unlink($path); }
    if (is_dir($directory)) { rmdir($directory); }
}
