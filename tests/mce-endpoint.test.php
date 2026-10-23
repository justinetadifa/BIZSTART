<?php
declare(strict_types=1);

/**
 * End-to-end integration test for api/mce-weights.php
 * Verifies GET payload schema, CSRF authentication, preview simulation,
 * weight application, and baseline restoration.
 */

// Initialize container and session before any output
$container = require dirname(__DIR__) . '/app/bootstrap.php';
$GLOBALS['container'] = $container;

require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Support/PropertyAssessmentService.php';

sfc_start_session();

// Find or construct an active CICTO admin in the repository
$pdo = $container['pdo'];
$userRepo = $container['users'];

// Check if an admin exists
$stmt = $pdo->prepare("SELECT * FROM users WHERE role = 'admin' AND department = 'CICTO' AND account_status = 'active' LIMIT 1");
$stmt->execute();
$adminRecord = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$adminRecord) {
    // Create an active CICTO admin for the test
    $stmt = $pdo->prepare(
        "INSERT INTO users (email, role, name, department, account_status, identity_verification_status, identity_verified_at, password_hash, created_at, updated_at)
         VALUES (:email, 'admin', :name, 'CICTO', 'active', 'verified', :verified_at, :hash, :created_at, :updated_at)"
    );
    $now = gmdate('Y-m-d H:i:s');
    $stmt->execute([
        'email' => 'cicto.test.admin@sfcelerate.local',
        'name' => 'CICTO Test Administrator',
        'verified_at' => $now,
        'hash' => password_hash('TestPass123!', PASSWORD_DEFAULT),
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $adminId = (int) $pdo->lastInsertId();
    $adminRecord = $userRepo->findById($adminId);
}

// Log in the test admin into the session
$_SESSION['sfc_user'] = [
    'id' => (int) $adminRecord['id'],
    'role' => 'admin',
    'department' => 'CICTO',
    'name' => (string) ($adminRecord['name'] ?? 'CICTO Administrator'),
    'email' => (string) $adminRecord['email'],
    'sessionVersion' => (int) ($adminRecord['session_version'] ?? $adminRecord['sessionVersion'] ?? 0),
];
$_SESSION['sfc_authenticated_at'] = time();
$_SESSION['sfc_last_activity_at'] = time();

$csrfToken = sfc_csrf_token();

$checks = 0;
function endpoint_assert(bool $condition, string $message): void {
    if (!$condition) {
        throw new RuntimeException("Assertion failed: {$message}");
    }
    echo "  [PASS] {$message}\n";
    $GLOBALS['checks']++;
}

echo "=======================================================\n";
echo "  LOCUS-SF MCE API Endpoint Integration Test Suite\n";
echo "=======================================================\n\n";

function dispatch_mce_api(string $method, array $body = [], array $headers = []): array {
    $_SERVER['REQUEST_METHOD'] = $method;
    $_SERVER['CONTENT_TYPE'] = 'application/json';
    $_SERVER['HTTP_ACCEPT'] = 'application/json';
    $_POST = [];
    $_GET = [];

    // Reset headers
    unset($_SERVER['HTTP_X_CSRF_TOKEN'], $_SERVER['HTTP_X_XSRF_TOKEN']);
    foreach ($headers as $k => $v) {
        $_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $k))] = $v;
    }

    $rawJson = json_encode($body);
    $GLOBALS['sfc_test_raw_input'] = $rawJson;

    ob_start();
    try {
        require dirname(__DIR__) . '/api/mce-weights.php';
        $output = (string) ob_get_contents();
    } finally {
        ob_end_clean();
        unset($GLOBALS['sfc_test_raw_input']);
    }

    $decoded = json_decode($output, true);
    return is_array($decoded) ? $decoded : ['raw' => $output];
}

echo "Test 1: GET api/mce-weights.php Schema & Structure\n";
$getResponse = dispatch_mce_api('GET');

endpoint_assert(($getResponse['ok'] ?? false) === true, "GET response ok is true");
endpoint_assert(!empty($getResponse['can_configure']), "Admin user can configure weights");
endpoint_assert(!empty($getResponse['csrfToken']), "CSRF token is returned in response");
endpoint_assert(!empty($getResponse['details']), "Details object is provided for frontend");
endpoint_assert(is_array($getResponse['details']['current']), "details.current is an associative array");

$current = $getResponse['details']['current'];
$expectedKeys = ['spatial_accessibility', 'infrastructure_readiness', 'property_cost_market_competitiveness', 'nearby_businesses', 'risk_constraints'];
foreach ($expectedKeys as $k) {
    endpoint_assert(isset($current[$k]), "details.current includes '{$k}'");
    endpoint_assert(isset($current[$k]['weightPercent']), "'{$k}' has weightPercent");
    endpoint_assert($current[$k]['weightPercent'] >= 5.0 && $current[$k]['weightPercent'] <= 60.0, "'{$k}' weightPercent within permitted range");
    endpoint_assert((float) $current[$k]['rangeMin'] === 5.0 && (float) $current[$k]['rangeMax'] === 60.0, "'{$k}' defines permitted bounds 5.0% - 60.0%");
    endpoint_assert(!empty($current[$k]['label']), "'{$k}' has non-empty human label");
}

endpoint_assert(!empty($getResponse['details']['version']), "details.version is populated: " . $getResponse['details']['version']);
endpoint_assert(is_string($getResponse['details']['discrepancy']), "details.discrepancy is a formatted rationale string");
endpoint_assert(is_array($getResponse['details']['baseline']), "details.baseline dictionary is populated");
endpoint_assert(is_array($getResponse['configuration']), "Backwards-compatible 'configuration' object is also present");

echo "\nTest 2: POST preview Action & Simulation Comparative Model\n";
$previewResponse = dispatch_mce_api('POST', [
    'action' => 'preview',
    'weights' => [
        'spatial_accessibility' => 20.0,
        'infrastructure_readiness' => 30.0,
        'property_cost_market_competitiveness' => 20.0,
        'nearby_businesses' => 15.0,
        'risk_constraints' => 15.0,
    ],
    'csrf_token' => $csrfToken,
], ['X-CSRF-Token' => $csrfToken]);

endpoint_assert(($previewResponse['ok'] ?? false) === true, "Preview response ok is true");
endpoint_assert(!empty($previewResponse['preview']), "Preview payload present");
endpoint_assert(is_array($previewResponse['preview']['simulations']), "preview.simulations is an array");
endpoint_assert(count($previewResponse['preview']['simulations']) >= 4, "preview.simulations contains at least 4 standard corridor profiles");

$sim = $previewResponse['preview']['simulations'][0];
endpoint_assert(!empty($sim['profile']), "Simulation profile has human name: " . ($sim['profile'] ?? ''));
endpoint_assert(isset($sim['baselineScore'], $sim['proposedScore'], $sim['delta']), "Simulation profile includes baseline, proposed, and delta scores");

endpoint_assert(is_array($previewResponse['preview']['criteria_rows']), "preview.criteria_rows is present");
endpoint_assert(count($previewResponse['preview']['criteria_rows']) === 5, "preview.criteria_rows has 5 rows");

echo "\nTest 3: POST apply Action & Source Reference Handling\n";
$applyResponse = dispatch_mce_api('POST', [
    'action' => 'apply',
    'weights' => [
        'spatial_accessibility' => 20.0,
        'infrastructure_readiness' => 30.0,
        'property_cost_market_competitiveness' => 20.0,
        'nearby_businesses' => 15.0,
        'risk_constraints' => 15.0,
    ],
    'reason' => 'CICTO Priority Infrastructure Corridor Revision 2026',
    'reference' => 'CSFP CLUP 2017-2027 Section 4.2',
    'csrf_token' => $csrfToken,
], ['X-CSRF-Token' => $csrfToken]);

endpoint_assert(($applyResponse['ok'] ?? false) === true, "Apply response ok is true");
endpoint_assert((float) $applyResponse['weights']['spatial_accessibility'] === 20.0, "Applied spatial accessibility is 20.0%");
endpoint_assert((float) $applyResponse['weights']['infrastructure_readiness'] === 30.0, "Applied infrastructure readiness is 30.0%");

echo "\nTest 4: POST restore_baseline Action\n";
$restoreResponse = dispatch_mce_api('POST', [
    'action' => 'restore_baseline',
    'reason' => 'Restored official approved LOCUS-SF v3.0 baseline weights',
    'csrf_token' => $csrfToken,
], ['X-CSRF-Token' => $csrfToken]);

endpoint_assert(($restoreResponse['ok'] ?? false) === true, "Restore baseline ok is true");
endpoint_assert((float) $restoreResponse['weights']['spatial_accessibility'] === 25.0, "Restored spatial accessibility is 25.0%");
endpoint_assert((float) $restoreResponse['weights']['infrastructure_readiness'] === 25.0, "Restored infrastructure readiness is 25.0%");

echo "\n=======================================================\n";
echo "  RESULTS: {$checks} PASSED, 0 FAILED\n";
echo "=======================================================\n";
