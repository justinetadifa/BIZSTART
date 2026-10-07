<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';

function test_assert(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException("Assertion failed: {$message}");
    }
    $GLOBALS['investor_checks'] = ($GLOBALS['investor_checks'] ?? 0) + 1;
}

$container = sfc_app_container();
$pdo = $container['pdo'];
$usersRepo = $container['users'];

// 1. Verify schema columns
$stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'last_login_at'");
test_assert($stmt->rowCount() === 1, 'Column last_login_at must exist in users table');

$stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'last_active_at'");
test_assert($stmt->rowCount() === 1, 'Column last_active_at must exist in users table');

// 2. Query all investors with activity
$investors = $usersRepo->allInvestorsWithActivity();
test_assert(is_array($investors), 'allInvestorsWithActivity must return an array');
test_assert(count($investors) >= 1, 'Should return at least 1 investor from database');

// Verify every item is role investor
foreach ($investors as $inv) {
    test_assert(($inv['role'] ?? '') === 'investor', 'Returned record must have role investor');
    test_assert(isset($inv['isOnline']), 'isOnline must be set');
    test_assert(isset($inv['presenceState']), 'presenceState must be set');
    test_assert(isset($inv['presenceLabel']), 'presenceLabel must be set');
    test_assert(isset($inv['shortlistsCount']) && is_array($inv['shortlists']), 'shortlists and count must be present');
    test_assert(isset($inv['visitsCount']) && is_array($inv['visits']), 'visits and count must be present');
    test_assert(isset($inv['documentRequestsCount']) && is_array($inv['documentRequests']), 'documentRequests and count must be present');
    test_assert(isset($inv['threadsCount']) && is_array($inv['threads']), 'threads and count must be present');
}

// 3. Test presence tracking calculations with disposable updates
$firstInvestor = $investors[0];
$testId = (int) $firstInvestor['id'];

// Touch activity to NOW (online)
$usersRepo->touchActivity($testId, true);
$refreshed = $usersRepo->allInvestorsWithActivity();
$found = null;
foreach ($refreshed as $item) {
    if ((int) $item['id'] === $testId) {
        $found = $item;
        break;
    }
}
test_assert($found !== null, 'Target investor must be found');
test_assert($found['isOnline'] === true, 'Recently touched investor must have isOnline = true');
test_assert($found['presenceState'] === 'online', 'Recently touched investor must have presenceState = online');
test_assert($found['presenceLabel'] === 'Active now', 'Recently touched investor must have presenceLabel = Active now');

// Set activity to 3 hours ago (recent)
$threeHoursAgo = gmdate('Y-m-d H:i:s', time() - 10800);
$pdo->prepare('UPDATE users SET last_active_at = :act WHERE id = :id')->execute(['act' => $threeHoursAgo, 'id' => $testId]);
$refreshedRecent = $usersRepo->allInvestorsWithActivity();
$foundRecent = null;
foreach ($refreshedRecent as $item) {
    if ((int) $item['id'] === $testId) {
        $foundRecent = $item;
        break;
    }
}
test_assert($foundRecent['isOnline'] === false, 'Activity 3h ago must have isOnline = false');
test_assert($foundRecent['presenceState'] === 'recent', 'Activity 3h ago must have presenceState = recent');
test_assert(str_contains($foundRecent['presenceLabel'], 'Active'), 'Activity 3h ago must mention Active');

// Set activity to 3 days ago (offline)
$threeDaysAgo = gmdate('Y-m-d H:i:s', time() - 259200);
$pdo->prepare('UPDATE users SET last_active_at = :act WHERE id = :id')->execute(['act' => $threeDaysAgo, 'id' => $testId]);
$refreshedOffline = $usersRepo->allInvestorsWithActivity();
$foundOffline = null;
foreach ($refreshedOffline as $item) {
    if ((int) $item['id'] === $testId) {
        $foundOffline = $item;
        break;
    }
}
test_assert($foundOffline['isOnline'] === false, 'Activity 3d ago must have isOnline = false');
test_assert($foundOffline['presenceState'] === 'offline', 'Activity 3d ago must have presenceState = offline');

// 4. Test API endpoint access control
// Guest access blocked
$_SESSION = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require dirname(__DIR__) . '/api/admin-investors.php';
$guestRes = json_decode(ob_get_clean(), true);
test_assert(isset($guestRes['error']), 'Guest request to admin-investors must return error');

// Investor access blocked
$_SESSION['sfc_user'] = ['id' => $testId, 'role' => 'investor', 'name' => 'Investor User'];
$_SESSION['sfc_authenticated_at'] = time();
$_SESSION['sfc_last_activity_at'] = time();
ob_start();
require dirname(__DIR__) . '/api/admin-investors.php';
$invRes = json_decode(ob_get_clean(), true);
test_assert(isset($invRes['error']), 'Investor request to admin-investors must return error');

// Admin access succeeds
$admin = $usersRepo->firstByRole('admin');
test_assert($admin !== null, 'Admin user must exist in DB');
$_SESSION['sfc_user'] = sfc_user_session_payload($admin);
$_SESSION['sfc_authenticated_at'] = time();
$_SESSION['sfc_last_activity_at'] = time();
ob_start();
require dirname(__DIR__) . '/api/admin-investors.php';
$adminRes = json_decode(ob_get_clean(), true);
test_assert(!empty($adminRes['ok']), 'Admin request to admin-investors must return ok = true');
test_assert(isset($adminRes['investors']) && is_array($adminRes['investors']), 'Admin response must contain investors array');
test_assert(isset($adminRes['summary']) && isset($adminRes['summary']['total']), 'Admin response must contain summary object');

echo "Admin investor tracking and presence tests passed (" . ($GLOBALS['investor_checks'] ?? 0) . " checks).\n";
