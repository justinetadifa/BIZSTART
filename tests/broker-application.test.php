<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Core/SchemaManager.php';
require_once dirname(__DIR__) . '/app/Repositories/SellerProfileRepository.php';
require_once dirname(__DIR__) . '/app/Repositories/UserRepository.php';
require_once dirname(__DIR__) . '/app/Repositories/BrokerMailRepository.php';
require_once dirname(__DIR__) . '/app/Support/BrokerMailer.php';
require_once dirname(__DIR__) . '/app/Support/BrokerEmailService.php';
require_once dirname(__DIR__) . '/app/Support/BrokerApplicationService.php';

use App\Core\SchemaManager;
use App\Repositories\SellerProfileRepository;
use App\Repositories\UserRepository;
use App\Repositories\BrokerMailRepository;
use App\Support\BrokerDocuments;
use App\Support\BrokerApplicationService;
use App\Support\BrokerEmailService;
use App\Support\BrokerMailer;

if (!function_exists('imagecreatefromstring')) {
    throw new RuntimeException('Run this test with GD enabled, e.g. php -d extension=gd tests/broker-application.test.php.');
}
$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$reject = static function (callable $action, string $message) use ($check): void {
    try { $action(); } catch (InvalidArgumentException) { $check(true, $message); return; }
    throw new RuntimeException($message);
};
$config = require dirname(__DIR__) . '/app/config.php';
$db = $config['db'];
if (($config['app']['environment'] ?? '') !== 'local' || !in_array($db['host'], ['127.0.0.1', 'localhost', '::1'], true)) {
    throw new RuntimeException('Broker application integration requires a local MySQL server.');
}
$options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false];
$dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $db['host'], (int) ($db['port'] ?? 3306));
$server = new PDO($dsn, (string) $db['user'], (string) $db['pass'], $options);
$testName = 'locus_broker_application_test_' . bin2hex(random_bytes(8));
$documentsDirectory = sys_get_temp_dir() . '/locus-broker-documents-' . bin2hex(random_bytes(8));
mkdir($documentsDirectory);
$documents = new BrokerDocuments($documentsDirectory);
$paths = [];
$created = false;
$fixture = static function (string $content) use (&$paths, $documentsDirectory): string {
    $path = $documentsDirectory . '/fixture-' . bin2hex(random_bytes(8));
    file_put_contents($path, $content);
    $paths[] = $path;
    return $path;
};
$newDocument = static function (string $side) use (&$paths, $documents): array {
    $id = bin2hex(random_bytes(32));
    $path = $documents->pathForId($id);
    $image = imagecreatetruecolor(32, 20);
    imagefilledrectangle($image, 0, 0, 31, 19, imagecolorallocate($image, 255, 255, 255));
    imagestring($image, 1, 2, 4, $side, imagecolorallocate($image, 10, 30, 50));
    imagepng($image, $path);
    imagedestroy($image);
    $paths[] = $path;
    $metadata = $documents->validateImage($path);
    return ['id' => $id, 'mime' => $metadata['mime'], 'size' => $metadata['size'], 'sha256' => hash_file('sha256', $path), 'label' => 'PRC ID ' . $side];
};
try {
    $front = $newDocument('front');
    $back = $newDocument('back');
    $check($documents->validateImage($documents->pathForId($front['id']))['mime'] === 'image/png', 'Valid image metadata was not detected.');
    $reject(fn () => $documents->stage(['prc_front' => ['error' => UPLOAD_ERR_OK, 'tmp_name' => $documents->pathForId($front['id']), 'name' => 'identity.jpg', 'type' => 'image/jpeg', 'size' => 1]]), 'A local file bypassed the HTTP upload boundary.');
    $reject(fn () => $documents->validateImage($fixture('<?php echo "not an image";')), 'Executable bytes were accepted as a PRC document.');
    $reject(fn () => $documents->validateImage($fixture('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), 'SVG was accepted as a PRC document.');
    $reject(fn () => $documents->validateImage($fixture(base64_decode('R0lGODlhAQABAIAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', true))), 'GIF was accepted as a PRC document.');
    $reject(fn () => $documents->validateImage($fixture(str_repeat('x', BrokerDocuments::MAX_BYTES + 1))), 'Oversized document was accepted.');
    $validBytes = file_get_contents($documents->pathForId($front['id']));
    $reject(fn () => $documents->validateImage($fixture(substr($validBytes, 0, 45))), 'Truncated PNG passed real decoding.');
    $reject(fn () => $documents->pathForId('../secret'), 'Document path traversal was accepted.');
    $check(!array_key_exists('sha256', $documents->publicMetadata($front)), 'Frontend metadata disclosed integrity details.');

    $server->exec('CREATE DATABASE `' . $testName . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $created = true;
    $pdo = new PDO($dsn . ';dbname=' . $testName, (string) $db['user'], (string) $db['pass'], $options);
    SchemaManager::ensure($pdo);
    $pdo->exec("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ONLY_FULL_GROUP_BY,NO_ENGINE_SUBSTITUTION'");
    $users = new UserRepository($pdo);
    $profiles = new SellerProfileRepository($pdo, $documents);
    $mailConfig = ['app' => ['environment' => 'local', 'url' => 'http://127.0.0.1'], 'mail' => ['support_contact' => 'support@example.test']];
    $email = new BrokerEmailService(new BrokerMailRepository($pdo), new BrokerMailer($mailConfig), $mailConfig);
    $workflow = new BrokerApplicationService($pdo, $profiles, $documents, $email);
    $GLOBALS['container'] = ['pdo' => $pdo, 'users' => $users, 'sellerProfiles' => $profiles];
    $insert = $pdo->prepare('INSERT INTO users (role,name,email,password_hash,department,identity_verification_status,broker_review_authorized) VALUES (:role,:name,:email,\'unusable-test-password\',:department,:identity,:grant)');
    $addUser = static function (string $role, string $name, ?string $department = null, int $grant = 0) use ($insert, $pdo): int {
        $insert->execute(['role' => $role, 'name' => $name, 'email' => strtolower(str_replace(' ', '.', $name)) . '@example.test', 'department' => $department, 'identity' => $role === 'admin' ? 'verified' : 'pending', 'grant' => $grant]);
        return (int) $pdo->lastInsertId();
    };
    $applicant = $addUser('seller', 'Application Broker');
    $other = $addUser('seller', 'Another Applicant');
    $ict = $addUser('admin', 'Technical Admin', 'CICTO', 1);
    $ungranted = $addUser('admin', 'Unassigned Assessor', 'ASSESSOR', 0);
    $reviewer = $addUser('admin', 'Authorized Assessor', 'ASSESSOR', 1);
    $lebdo = $addUser('admin', 'Authorized Lebdo', 'LEBDO', 1);
    $payload = ['seller_type' => 'broker', 'legal_name' => 'Application Broker', 'phone' => '09171234567', 'address_line' => 'Test address', 'city' => 'San Fernando, La Union', 'authorization_basis' => 'Licensed real estate broker', 'prc_registration_no' => '00012345', 'prc_valid_until' => '2099-12-31'];
    $reject(fn () => $workflow->saveForUser($applicant, $payload, [], true), 'Submission without both PRC documents succeeded.');
    $check($profiles->findByUserId($applicant) === null && !$pdo->inTransaction(), 'A failed submission left a profile or open transaction.');
    $reject(fn () => $profiles->createOrUpdateForUser($applicant, $payload + ['prc_front_json' => json_encode($front), 'prc_back_json' => json_encode($back)], true), 'Browser-supplied document metadata bypassed protected upload validation.');
    $draft = $profiles->createOrUpdateForUser($applicant, $payload, false, ['front' => $front]);
    $reject(fn () => $workflow->saveForUser($applicant, $payload, [], true), 'A one-sided document submission succeeded.');
    $check($profiles->findByUserId($applicant)['frontDocument']['id'] === $front['id'], 'A failed submission removed the previous document.');
    $profiles->createOrUpdateForUser($applicant, $payload, false, ['back' => $back]);
    $submitted = $workflow->saveForUser($applicant, $payload, [], true);
    $check($submitted['applicationStatus'] === 'pending_review' && $submitted['applicationRevision'] === 1, 'Submission did not enter review with a new revision.');
    $check($submitted['emailStatus']['status'] === 'unconfigured' && $submitted['emailStatus']['sentAt'] === null, 'Unconfigured email was reported as delivered.');
    $duplicateSubmit = $workflow->saveForUser($applicant, $payload, [], true);
    $check($duplicateSubmit['applicationRevision'] === 1 && $duplicateSubmit['submittedAt'] === $submitted['submittedAt'] && (int) $pdo->query('SELECT COUNT(*) FROM broker_mail_outbox')->fetchColumn() === 1, 'An unchanged repeated submission generated another revision or receipt.');
    $check(count($profiles->queue('pending_review')) === 1, 'Pending queue omitted the submitted broker under strict SQL grouping.');
    $check(!str_contains(json_encode($submitted), $documentsDirectory), 'Profile response exposed a private filesystem path.');
    $unchanged = $workflow->saveForUser($applicant, ['display_name' => 'Broker Display'], [], false);
    $check($unchanged['frontDocument']['id'] === $front['id'] && $unchanged['backDocument']['id'] === $back['id'] && $unchanged['applicationRevision'] === 1, 'An unrelated save lost private documents or advanced the revision.');
    $reject(fn () => $profiles->review($applicant, 'verified', $ict, 'Technical approval', true), 'ICT bypassed reviewer separation through the repository.');
    $reject(fn () => $profiles->review($applicant, 'verified', $ungranted, 'Ungrant approval', true), 'Ungrant CAO reviewer was allowed to approve.');
    $reject(fn () => $profiles->review($applicant, 'verified', $reviewer, 'Checked documents', false), 'Approval without explicit PRC verification was allowed.');
    $reject(fn () => $profiles->review($applicant, 'verified', $reviewer, '', true), 'Approval without a documented reason was allowed.');
    $reject(fn () => $profiles->review($applicant, 'rejected', $reviewer, ''), 'Rejection without a documented reason was allowed.');
    $reject(fn () => $profiles->review($applicant, 'blocked', $reviewer, 'Attempted block without findings'), 'Blocking without documented findings was allowed.');
    $correction = $workflow->review($applicant, 'corrections_requested', $reviewer, 'Please replace the unclear front image.', 'The submitted name is partially obscured.');
    $check($correction['applicationStatus'] === 'corrections_requested' && $users->findById($applicant)['accountStatus'] === 'active', 'Correction request wrongly rejected or blocked the account.');
    $check(count($correction['reviewHistory']) === 1 && $correction['reviewHistory'][0]['reviewerUserId'] === $reviewer && $correction['reviewHistory'][0]['applicationRevision'] === 1, 'The review audit history is incomplete.');
    $outboxCount = (int) $pdo->query('SELECT COUNT(*) FROM broker_mail_outbox')->fetchColumn();
    $duplicate = $workflow->review($applicant, 'corrections_requested', $reviewer, 'Please replace the unclear front image.', 'The submitted name is partially obscured.');
    $check($duplicate['duplicateDecision'] && count($duplicate['reviewHistory']) === 1 && (int) $pdo->query('SELECT COUNT(*) FROM broker_mail_outbox')->fetchColumn() === $outboxCount, 'Duplicate review generated another event or email.');
    $replacement = $newDocument('replacement');
    $profiles->createOrUpdateForUser($applicant, [], false, ['front' => $replacement]);
    $resubmitted = $workflow->saveForUser($applicant, [], [], true);
    $check($resubmitted['applicationRevision'] === 2 && $resubmitted['applicationStatus'] === 'pending_review', 'Corrections did not create a fresh application revision.');
    $reject(fn () => $workflow->review($applicant, 'verified', $reviewer, 'Stale approval attempt', null, true, 1), 'A stale review approved a replaced document revision.');
    $historic = $profiles->documentMetadataForUser($applicant, 'front', $front['id']);
    $check(($historic['id'] ?? null) === $front['id'] && is_file($documents->pathForId($front['id'])), 'Document replacement lost the audited previous document.');
    $check($profiles->documentMetadataForUser($other, 'front', $front['id']) === null, 'Another applicant resolved a private document by its storage identifier.');
    $approved = $workflow->review($applicant, 'verified', $lebdo, 'Current PRC registration and both ID sides checked.', 'PRC registration and submitted credentials agree.', true);
    $check($approved['applicationStatus'] === 'verified' && $approved['emailVerifiedAt'] === null && $users->findById($applicant)['identityVerificationStatus'] === 'verified', 'Application approval incorrectly changed email ownership.');
    $check(!sfc_broker_can_submit($users->findById($applicant)), 'Approved but unverified email unlocked broker privileges.');
    $pdo->exec('UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = ' . $applicant);
    $check(sfc_broker_can_submit($users->findById($applicant)), 'Verified email plus approved current documents did not unlock broker privileges.');
    $tamperPath = $documents->pathForId($replacement['id']);
    $savedBytes = file_get_contents($tamperPath);
    file_put_contents($tamperPath, str_repeat('x', strlen($savedBytes)));
    $reject(fn () => $documents->assertStored($replacement), 'Tampering bypassed private document integrity validation.');
    file_put_contents($tamperPath, $savedBytes);
    $renamed = $workflow->saveForUser($applicant, ['legal_name' => 'Updated Broker Name'], [], false);
    $check($renamed['applicationStatus'] === 'pending_review' && $renamed['applicationRevision'] === 3 && !sfc_broker_can_submit($users->findById($applicant)), 'Approved credentials changed without a fresh review.');
    $pdo->exec("UPDATE seller_profiles SET prc_valid_until = '2020-01-01' WHERE user_id = " . $applicant);
    $reject(fn () => $workflow->review($applicant, 'verified', $reviewer, 'Attempted expired approval', null, true), 'Expired PRC documents were approved.');
    $check($profiles->findByUserId($applicant)['applicationStatus'] === 'pending_review', 'A failed review mutated the application status.');
    $workflow->review($applicant, 'corrections_requested', $reviewer, 'Provide a current PRC ID.', 'The recorded expiration date is in the past.');
    $workflow->saveForUser($applicant, ['prc_valid_until' => '2099-12-31'], [], true);
    $rejected = $workflow->review($applicant, 'rejected', $reviewer, 'The submitted credentials could not be confirmed.', 'Application requires further supporting information.');
    $check($rejected['applicationStatus'] === 'rejected' && $users->findById($applicant)['accountStatus'] === 'active', 'Rejection silently blocked authenticated access.');
    $beforeSession = sfc_user_session_payload($users->findById($applicant));
    $blocked = $workflow->review($applicant, 'blocked', $reviewer, 'Confirmed registration mismatch after documented review.', 'The official registration response belongs to a different person.');
    $blockedUser = $users->findById($applicant);
    $check($blocked['applicationStatus'] === 'rejected' && $blockedUser['accountStatus'] === 'blocked' && $blockedUser['sessionVersion'] === $beforeSession['sessionVersion'] + 1, 'Blocking failed to persist account status and revoke the session version atomically.');
    $check(!sfc_account_can_authenticate($blockedUser) && !sfc_session_matches_user($beforeSession, $blockedUser), 'A blocked account retained active authenticated access.');
    $reject(fn () => $workflow->saveForUser($applicant, [], [], true), 'A blocked account resubmitted its application.');
    $reject(fn () => $workflow->review($applicant, 'verified', $reviewer, 'Attempted unblock through approval', null, true), 'An application review bypassed account blocking.');
    $check(count($profiles->queue('blocked')) === 1 && $blocked['reviewHistory'][0]['decision'] === 'blocked', 'Blocked queue or audit decision conflated blocking with rejection.');
    $duplicateBlock = $workflow->review($applicant, 'blocked', $reviewer, 'Confirmed registration mismatch after documented review.', 'The official registration response belongs to a different person.');
    $check($duplicateBlock['duplicateDecision'] && $users->findById($applicant)['sessionVersion'] === $blockedUser['sessionVersion'], 'Duplicate blocking changed session version again.');
    $check($email->status($applicant)['delivery']['status'] === 'unconfigured', 'A saved blocked decision incorrectly showed sent email.');
    $pdo->beginTransaction();
    $otherPayload = array_replace($payload, ['legal_name' => 'Another Applicant', 'phone' => '09171234568', 'prc_registration_no' => '12346']);
    $profiles->createOrUpdateForUser($other, $otherPayload, false, ['front' => $newDocument('other-front'), 'back' => $newDocument('other-back')]);
    $workflow->saveForUser($other, [], [], true);
    $check($pdo->inTransaction(), 'The workflow committed a transaction owned by its caller.');
    $pdo->rollBack();
    $workflow->discardStagedForUser($other);
    $check($profiles->findByUserId($other) === null, 'Outer transaction rollback retained a partial application.');
    $legacyId = $addUser('seller', 'Legacy Reviewed Broker');
    $legacyPayload = array_replace($payload, ['legal_name' => 'Legacy Reviewed Broker', 'phone' => '09171234570', 'prc_registration_no' => '12347']);
    $profiles->createOrUpdateForUser($legacyId, $legacyPayload);
    $pdo->exec("UPDATE seller_profiles SET application_status='verified', review_notes='Original documented approval', reviewed_at='2024-06-15 10:30:00', reviewed_by_user_id=" . $reviewer . ' WHERE user_id=' . $legacyId);
    $legacyOutboxBefore = (int) $pdo->query('SELECT COUNT(*) FROM broker_mail_outbox')->fetchColumn();
    $legacyUpdated = $workflow->saveForUser($legacyId, ['display_name' => 'Legacy Display'], [], false);
    $legacyAudit = $legacyUpdated['reviewHistory'][0] ?? [];
    $check(count($legacyUpdated['reviewHistory']) === 1 && ($legacyAudit['source'] ?? '') === 'legacy_review' && $legacyAudit['decision'] === 'verified' && $legacyAudit['reason'] === 'Original documented approval' && $legacyAudit['createdAt'] === '2024-06-15 10:30:00' && $legacyAudit['reviewerUserId'] === $reviewer, 'An existing documented review was lost or rewritten during first profile mutation.');
    $legacyUpdated = $workflow->saveForUser($legacyId, ['display_name' => 'Legacy Display Again'], [], false);
    $check(count($legacyUpdated['reviewHistory']) === 1 && (int) $pdo->query('SELECT COUNT(*) FROM broker_mail_outbox')->fetchColumn() === $legacyOutboxBefore, 'Preserving a legacy review generated duplicate history or a historical decision email.');
    $reject(fn () => $workflow->review($legacyId, 'verified', $reviewer, 'Original documented approval', null, true), 'Legacy approval was treated as a fresh duplicate approval without required documents.');
    $legacyDocs = ['front' => $newDocument('legacy-front'), 'back' => $newDocument('legacy-back')];
    $resubmittedLegacy = $profiles->createOrUpdateForUser($legacyId, ['prc_registration_no' => '12348'], true, $legacyDocs);
    $check($resubmittedLegacy['applicationStatus'] === 'pending_review' && $resubmittedLegacy['reviewedAt'] === null && count($resubmittedLegacy['reviewHistory']) === 1 && $resubmittedLegacy['reviewHistory'][0]['reason'] === 'Original documented approval', 'Credential resubmission erased the legacy review evidence.');

    // Two connections reproduce an outer profile transaction that already has a
    // REPEATABLE READ snapshot before another session changes the application.
    $concurrentId = $addUser('seller', 'Concurrent Broker');
    $concurrentPayload = array_replace($payload, ['legal_name' => 'Concurrent Broker', 'phone' => '09171234571', 'prc_registration_no' => '12349']);
    $profiles->createOrUpdateForUser($concurrentId, $concurrentPayload, true, ['front' => $newDocument('concurrent-front'), 'back' => $newDocument('concurrent-back')]);
    $peer = new PDO($dsn . ';dbname=' . $testName, (string) $db['user'], (string) $db['pass'], $options);
    $peerProfiles = new SellerProfileRepository($peer, $documents);
    $pdo->beginTransaction();
    $oldSnapshot = $profiles->findByUserId($concurrentId);
    $concurrentFront = $newDocument('concurrent-replacement');
    $peerUpdated = $peerProfiles->createOrUpdateForUser($concurrentId, [], false, ['front' => $concurrentFront]);
    $check($oldSnapshot['applicationRevision'] === 1 && $peerUpdated['applicationRevision'] === 2, 'The stale-snapshot fixture did not replace a live application revision.');
    $currentSave = $workflow->saveForUser($concurrentId, ['display_name' => 'Concurrent Display'], [], false);
    $check($currentSave['applicationRevision'] === 2 && $currentSave['frontDocument']['id'] === $concurrentFront['id'], 'An outer transaction snapshot overwrote a concurrently replaced PRC document.');
    $pdo->commit();

    $pdo->beginTransaction();
    $profiles->findByUserId($concurrentId);
    $peerProfiles->review($concurrentId, 'corrections_requested', $reviewer, 'A current credential clarification is needed.', false, 'Further review is required.');
    $currentSave = $workflow->saveForUser($concurrentId, ['display_name' => 'Concurrent Display Updated'], [], false);
    $check($currentSave['applicationStatus'] === 'corrections_requested' && $currentSave['reviewNotes'] === 'A current credential clarification is needed.' && count($currentSave['reviewHistory']) === 1 && $currentSave['reviewHistory'][0]['source'] === 'review', 'A stale outer snapshot erased a concurrent documented review or imported it as legacy.');
    $pdo->commit();

    $pdo->beginTransaction();
    $pdo->query('SELECT broker_review_authorized FROM users WHERE id = ' . $reviewer)->fetchColumn();
    $peer->exec('UPDATE users SET broker_review_authorized = 0 WHERE id = ' . $reviewer);
    $reject(fn () => $workflow->review($concurrentId, 'rejected', $reviewer, 'Revoked reviewer stale snapshot attempt'), 'A stale transaction snapshot restored a revoked reviewer grant.');
    $pdo->rollBack();
    $peer->exec('UPDATE users SET broker_review_authorized = 1 WHERE id = ' . $reviewer);

    $pdo->beginTransaction();
    $profiles->findByUserId($concurrentId);
    $peerProfiles->review($concurrentId, 'blocked', $reviewer, 'Documented block from another session.', false, 'Confirmed mismatch after authorized review.');
    $reject(fn () => $workflow->saveForUser($concurrentId, ['display_name' => 'Attempted stale save'], [], false), 'A stale outer transaction snapshot bypassed a concurrent account block.');
    $pdo->rollBack();
    $check($profiles->findByUserId($concurrentId)['accountStatus'] === 'blocked' && $profiles->findByUserId($concurrentId)['reviewHistory'][0]['decision'] === 'blocked', 'The blocked account or its concurrent audit event was overwritten.');
} finally {
    if (isset($pdo) && $pdo->inTransaction()) { $pdo->rollBack(); }
    if ($created) { $server->exec('DROP DATABASE `' . $testName . '`'); }
    foreach ($paths as $path) { if (is_file($path)) { unlink($path); } }
    if (is_dir($documentsDirectory)) { rmdir($documentsDirectory); }
}
echo "Passed {$checks} broker application integration checks (disposable database/private temporary documents only).\n";
