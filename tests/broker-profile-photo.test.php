<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/profile.php';
require_once dirname(__DIR__) . '/app/Repositories/SellerProfileRepository.php';
require_once dirname(__DIR__) . '/app/Repositories/UserRepository.php';
require_once dirname(__DIR__) . '/app/Core/SchemaManager.php';
require_once dirname(__DIR__) . '/app/Repositories/BrokerMailRepository.php';
require_once dirname(__DIR__) . '/app/Support/BrokerMailer.php';
require_once dirname(__DIR__) . '/app/Support/BrokerEmailService.php';
require_once dirname(__DIR__) . '/app/Support/BrokerApplicationService.php';

use App\Core\SchemaManager;
use App\Repositories\SellerProfileRepository;
use App\Repositories\UserRepository;

// Exercise the actual photo read/write paths in a disposable database only.
$config = require dirname(__DIR__) . '/app/config.php';
$db = $config['db'];
if (($config['app']['environment'] ?? '') !== 'local' || !in_array($db['host'], ['127.0.0.1', 'localhost', '::1'], true)) {
    throw new RuntimeException('Broker photo integration requires a local MySQL server.');
}
$options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false];
$dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $db['host'], (int) ($db['port'] ?? 3306));
$server = new PDO($dsn, (string) $db['user'], (string) $db['pass'], $options);
$testName = 'locus_broker_photo_test_' . bin2hex(random_bytes(8));
$sessions = sys_get_temp_dir() . '/locus-broker-photo-sessions-' . bin2hex(random_bytes(8));
mkdir($sessions);
$documentsDirectory = sys_get_temp_dir() . '/locus-broker-photo-documents-' . bin2hex(random_bytes(8));
mkdir($documentsDirectory);
$documentPaths = [];
$documents = new App\Support\BrokerDocuments($documentsDirectory);
$documentMetadata = [];
foreach (['front', 'back'] as $side) {
    $documentId = bin2hex(random_bytes(32));
    $documentPath = $documents->pathForId($documentId);
    file_put_contents($documentPath, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr4sAAAAASUVORK5CYII=', true));
    $documentPaths[] = $documentPath;
    $documentMetadata[$side] = ['id' => $documentId, 'mime' => 'image/png', 'size' => filesize($documentPath), 'sha256' => hash_file('sha256', $documentPath), 'label' => 'PRC ID ' . $side];
}
session_save_path($sessions);
$created = false;
$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
try {
    $server->exec('CREATE DATABASE `' . $testName . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $created = true;
    $pdo = new PDO($dsn . ';dbname=' . $testName, (string) $db['user'], (string) $db['pass'], $options);
    SchemaManager::ensure($pdo);
    $pdo->exec("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ONLY_FULL_GROUP_BY,NO_ENGINE_SUBSTITUTION'");
    $users = new UserRepository($pdo);
    $profiles = new SellerProfileRepository($pdo, $documents);
    $mailConfig = ['app' => ['environment' => 'local', 'url' => 'http://127.0.0.1'], 'mail' => []];
    $brokerEmail = new App\Support\BrokerEmailService(new App\Repositories\BrokerMailRepository($pdo), new App\Support\BrokerMailer($mailConfig), $mailConfig);
    $brokerApplications = new App\Support\BrokerApplicationService($pdo, $profiles, $documents, $brokerEmail);
    $GLOBALS['container'] = ['pdo' => $pdo, 'users' => $users, 'sellerProfiles' => $profiles, 'brokerApplications' => $brokerApplications, 'brokerEmail' => $brokerEmail];
    $insert = $pdo->prepare('INSERT INTO users (role, name, email, password_hash, profile_image_url) VALUES (\'seller\', :name, :email, \'unusable-fixture-password\', :photo)');
    // No files are created: these paths represent persisted upload metadata.
    $photo = 'assets/uploads/profiles/photo-test-' . bin2hex(random_bytes(8)) . '.png';
    $insert->execute(['name' => 'Photo Broker', 'email' => 'photo@example.test', 'photo' => $photo]);
    $id = (int) $pdo->lastInsertId();
    $user = $users->findById($id);
    $check($profiles->findOrInitializeByUser($user)['profileImageUrl'] === $photo, 'A default seller profile must retain its account photo.');
    $check($profiles->findOrInitializeByUser(['id' => $id])['profileImageUrl'] === $photo, 'Database-backed initialization must retain the photo without a session fallback.');
    $broker = $profiles->createOrUpdateForUser($id, [
        'seller_type' => 'broker', 'legal_name' => 'Photo Broker', 'phone' => '09171234567',
        'address_line' => 'Test address', 'city' => 'San Fernando, La Union',
        'authorization_basis' => 'Licensed real estate broker', 'prc_registration_no' => '00012345', 'prc_valid_until' => '2099-12-31',
    ], true, $documentMetadata);
    $check($broker['profileImageUrl'] === $photo, 'Submitting verification must return the stored photo.');
    $check($profiles->findByUserId($id)['profileImageUrl'] === $photo, 'Individual profile lookup must include the photo.');
    $check($profiles->queue('pending_review')[0]['profileImageUrl'] === $photo, 'The admin pending queue must include the photo under strict SQL grouping.');
    $pdo->exec("UPDATE seller_profiles SET application_status = 'verified' WHERE user_id = " . $id);
    $check($profiles->queue('verified')[0]['profileImageUrl'] === $photo, 'Previously reviewed brokers must include their photos.');

    $replacement = 'assets/uploads/profiles/photo-replacement-' . bin2hex(random_bytes(8)) . '.webp';
    $user = $users->updateProfile($id, 'Photo Broker', '09171234567', 'Test address', $replacement);
    $check($profiles->queue('all')[0]['profileImageUrl'] === $replacement, 'Replacing a photo must appear in the next admin queue response.');
    $check($profiles->findByUserId($id)['profileImageUrl'] === $replacement, 'Photo replacement must appear in individual lookups.');
    $_POST['_csrf'] = sfc_csrf_token();
    $result = sfc_update_own_profile($user, ['privacy_consent' => '1']);
    $check($result['user']['profileImageUrl'] === $replacement && $result['brokerProfile']['profileImageUrl'] === $replacement, 'Saving other profile details must preserve the photo in both response objects.');
    $check($result['brokerProfile']['applicationStatus'] === 'verified', 'A photo-only save must preserve broker verification.');
    $result = sfc_update_own_profile($result['user'], ['remove_photo' => '1', 'name' => 'Updated Broker']);
    $check($result['user']['profileImageUrl'] === null && $result['brokerProfile']['profileImageUrl'] === null, 'Removing the photo must clear both objects in the same save response.');
    $check($result['brokerProfile']['name'] === 'Updated Broker', 'The save response must reflect the updated account, not the pre-save join.');
    $check($profiles->queue('all')[0]['profileImageUrl'] === null, 'A removed photo must disappear from the admin queue.');
    $check($profiles->findByUserId($id)['profileImageUrl'] === null, 'A removed photo must disappear from individual lookups.');
    $check($result['brokerProfile']['applicationStatus'] === 'pending_review', 'Identity edits must still return verified brokers to review.');
    $insert->execute(['name' => 'No Photo', 'email' => 'no-photo@example.test', 'photo' => null]);
    $check($profiles->findOrInitializeByUser($users->findById((int) $pdo->lastInsertId()))['profileImageUrl'] === null, 'New accounts without photos must retain a null fallback.');
} finally {
    if (session_status() === PHP_SESSION_ACTIVE) { session_destroy(); }
    rmdir($sessions);
    foreach ($documentPaths as $documentPath) { if (is_file($documentPath)) { unlink($documentPath); } }
    rmdir($documentsDirectory);
    if ($created) { $server->exec('DROP DATABASE `' . $testName . '`'); }
}
echo "Passed {$checks} broker profile photo integration checks.\n";
