<?php
declare(strict_types=1);

// Isolated authentication regression checks. The fake PDO never touches a database.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$_SERVER['HTTP_HOST'] = 'security-check.example';
$_SERVER['REMOTE_ADDR'] = 'auth-regression-' . bin2hex(random_bytes(8));
$_SERVER['HTTPS'] = 'on';
$_SERVER['REQUEST_METHOD'] = 'POST';
putenv('APP_ENV=production');

require_once dirname(__DIR__, 2) . '/app/Repositories/UserRepository.php';
require_once dirname(__DIR__, 2) . '/app/Support/auth.php';

final class AuthTestPdo extends PDO
{
    public array $users = [];
    public int $insertions = 0;
    public ?PDOException $insertFailure = null;
    public int $queries = 0;

    public function __construct() {}

    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        $this->queries++;
        return new AuthTestStatement($this, $query);
    }

    public function lastInsertId(?string $name = null): string|false
    {
        return (string) max(array_keys($this->users));
    }
}

final class AuthTestStatement extends PDOStatement
{
    private array|false $row = false;

    public function __construct(private AuthTestPdo $testPdo, private string $query) {}

    public function execute(?array $params = null): bool
    {
        $params ??= [];
        if (str_starts_with(ltrim($this->query), 'INSERT')) {
            if ($this->testPdo->insertFailure !== null) {
                throw $this->testPdo->insertFailure;
            }
            $id = max(array_keys($this->testPdo->users)) + 1;
            $this->testPdo->users[$id] = $params + ['id' => $id];
            $this->testPdo->insertions++;
            return true;
        }
        $this->row = false;
        foreach ($this->testPdo->users as $user) {
            if ((isset($params['id']) && $user['id'] === (int) $params['id'])
                || (isset($params['email']) && strtolower($user['email']) === strtolower((string) $params['email']))) {
                $this->row = $user;
                break;
            }
        }
        return true;
    }

    public function fetch(int $mode = PDO::FETCH_DEFAULT, int $cursorOrientation = PDO::FETCH_ORI_NEXT, int $cursorOffset = 0): mixed
    {
        return $this->row;
    }
}

function auth_test_require(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function auth_test_session(?array $user): void
{
    sfc_start_session();
    $_SESSION = [];
    if ($user !== null) {
        $_SESSION['sfc_user'] = sfc_user_session_payload($user);
        $_SESSION['sfc_authenticated_at'] = time();
        $_SESSION['sfc_last_activity_at'] = time();
    }
    $_POST = ['_csrf' => sfc_csrf_token()];
}

function auth_test_blocked(callable $action, string $message): void
{
    $blocked = false;
    try {
        $action();
    } catch (InvalidArgumentException) {
        $blocked = true;
    }
    auth_test_require($blocked, $message);
}

$testPdo = new AuthTestPdo();
$loginPassword = bin2hex(random_bytes(16));
$testPdo->users = [
    1 => ['id' => 1, 'role' => 'admin', 'name' => 'Existing Administrator', 'email' => 'admin@example.test', 'password_hash' => password_hash($loginPassword, PASSWORD_DEFAULT), 'identity_verification_status' => 'verified'],
    2 => ['id' => 2, 'role' => 'investor', 'name' => 'Investor', 'email' => 'investor@example.test', 'password_hash' => password_hash($loginPassword, PASSWORD_DEFAULT)],
    3 => ['id' => 3, 'role' => 'seller', 'name' => 'Suspended Seller', 'email' => 'suspended@example.test', 'password_hash' => password_hash($loginPassword, PASSWORD_DEFAULT), 'identity_verification_status' => 'suspended'],
    4 => ['id' => 4, 'role' => 'seller', 'name' => 'Pending Broker', 'email' => 'pending@example.test', 'password_hash' => password_hash($loginPassword, PASSWORD_DEFAULT), 'identity_verification_status' => 'pending'],
    5 => ['id' => 5, 'role' => 'investor', 'name' => 'Disabled Investor', 'email' => 'disabled@example.test', 'password_hash' => password_hash($loginPassword, PASSWORD_DEFAULT), 'account_status' => 'disabled'],
    6 => ['id' => 6, 'role' => 'admin', 'name' => 'Unactivated Staff', 'email' => 'unactivated@example.test', 'password_hash' => password_hash($loginPassword, PASSWORD_DEFAULT), 'identity_verification_status' => 'pending'],
];
$GLOBALS['container'] = ['users' => new App\Repositories\UserRepository($testPdo)];
$sessionDirectory = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'locus-auth-check-' . bin2hex(random_bytes(8));
mkdir($sessionDirectory, 0700);
session_save_path($sessionDirectory);
$registration = static fn (): array => sfc_register_admin('New Administrator', 'new-admin@example.test', $loginPassword, $loginPassword);

try {
    auth_test_session(null);
    auth_test_blocked($registration, 'Guest registration must be rejected.');
    auth_test_require($testPdo->insertions === 0, 'Guest registration wrote an account.');

    auth_test_session(['id' => 2, 'role' => 'investor']);
    auth_test_blocked($registration, 'Investor registration must be rejected.');
    auth_test_require($testPdo->insertions === 0, 'Investor registration wrote an account.');

    // A forged administrator role in session must be refreshed from the repository.
    auth_test_session(['id' => 2, 'role' => 'admin']);
    auth_test_blocked($registration, 'A forged session role was trusted.');

    auth_test_session(['id' => 1, 'role' => 'admin']);
    $_POST['_csrf'] = 'invalid';
    auth_test_blocked($registration, 'Administrator provisioning needs CSRF verification.');
    auth_test_require($testPdo->insertions === 0, 'Invalid CSRF wrote an account.');

    $_POST['_csrf'] = sfc_csrf_token();
    $created = $registration();
    auth_test_require($created['role'] === 'admin' && $testPdo->insertions === 1, 'Authorized provisioning failed.');
    auth_test_require($_SESSION['sfc_user']['id'] === 1, 'Provisioning replaced the existing administrator session.');

    auth_test_session(null);
    $oldSessionId = session_id();
    auth_test_require(sfc_login('admin', 'admin@example.test', $loginPassword), 'Normal administrator login failed.');
    auth_test_require(session_id() !== $oldSessionId, 'Login did not rotate the session ID.');
    auth_test_require($_SESSION['sfc_user']['role'] === 'admin', 'Login did not establish administrator role.');
    auth_test_require($_SESSION['sfc_welcome_mode'] === 'returning', 'Login did not mark the returning-user welcome.');
    auth_test_require(!sfc_login('investor', '', ''), 'Empty login fields were accepted.');
    auth_test_require(sfc_login_errors() === ['email' => 'This field is required.', 'password' => 'This field is required.'], 'Required login errors are not field-specific.');
    auth_test_require(!sfc_login('investor', 'not-an-email', $loginPassword) && sfc_login_errors()['email'] === 'Enter a valid email address.', 'Malformed login email was accepted.');
    auth_test_require(!sfc_login('investor', 'missing@example.test', $loginPassword) && sfc_login_errors()['email'] === 'No account was found with this email.', 'Missing-email message is incorrect.');
    auth_test_require(!sfc_login('admin', 'admin@example.test', 'wrong-password'), 'An invalid password was accepted.');
    auth_test_require(sfc_login_errors() === ['password' => 'Incorrect password.'], 'Incorrect-password message reveals credential state.');
    auth_test_require(!sfc_login('admin', 'investor@example.test', $loginPassword), 'An investor logged in as admin.');
    auth_test_require(!sfc_login('seller', 'suspended@example.test', $loginPassword), 'A suspended account could log in.');
    auth_test_require(str_contains(sfc_login_errors()['account_status'] ?? '', 'suspended'), 'Suspension was not reported after credential validation.');
    auth_test_require(!sfc_login('seller', 'suspended@example.test', 'wrong-password') && sfc_login_errors() === ['password' => 'Incorrect password.'], 'Account suspension was disclosed before correct credentials.');
    auth_test_require(!sfc_login('investor', 'disabled@example.test', $loginPassword) && str_contains(sfc_login_errors()['account_status'] ?? '', 'disabled'), 'A disabled investor could sign in.');
    auth_test_require(!sfc_login('admin', 'unactivated@example.test', $loginPassword) && str_contains(sfc_login_errors()['account_status'] ?? '', 'not been activated'), 'An unactivated staff account could sign in.');
    auth_test_require(sfc_login('seller', 'pending@example.test', $loginPassword), 'Pending brokers cannot view verification status.');
    auth_test_require(!sfc_broker_can_submit($_SESSION['sfc_user']), 'Pending brokers may submit listings.');
    auth_test_require(!sfc_broker_can_submit(['id' => 4, 'role' => 'seller', 'identityVerificationStatus' => 'verified', 'accountStatus' => 'disabled']), 'Disabled explicit broker passed the listing guard.');
    auth_test_session(['id' => 3, 'role' => 'seller']);
    auth_test_require(sfc_current_user() === null, 'Suspension did not revoke an existing session.');
    auth_test_session(['id' => 5, 'role' => 'investor']);
    auth_test_require(sfc_current_user() === null, 'Disabling an account did not revoke its existing session.');

    try {
        sfc_user_repository()->create('investor', 'Duplicate Account', 'ADMIN@EXAMPLE.TEST', $loginPassword);
        throw new RuntimeException('Case-insensitive duplicate email was accepted.');
    } catch (SfcAuthValidationException $exception) {
        auth_test_require($exception->errors() === ['email' => 'An account with this email already exists. Sign in instead.'], 'Duplicate email is not attached to the email field.');
    }
    $race = new PDOException('Duplicate entry for key uniq_users_email', 23000);
    $race->errorInfo = ['23000', 1062, 'Duplicate entry for key uniq_users_email'];
    $testPdo->insertFailure = $race;
    try {
        sfc_user_repository()->create('investor', 'Concurrent Account', 'concurrent@example.test', $loginPassword);
        throw new RuntimeException('A concurrent duplicate email was accepted.');
    } catch (SfcAuthValidationException $exception) {
        auth_test_require(array_key_exists('email', $exception->errors()), 'Concurrent duplicate leaked a database error.');
    } finally {
        $testPdo->insertFailure = null;
    }

    $_SERVER['REMOTE_ADDR'] = 'auth-throttle-' . bin2hex(random_bytes(8));
    for ($attempt = 0; $attempt < 30; $attempt++) {
        auth_test_require(!sfc_login('investor', 'missing@example.test', $loginPassword), 'An unknown email was authenticated.');
    }
    $queryCount = $testPdo->queries;
    auth_test_require(!sfc_login('investor', 'missing@example.test', $loginPassword) && str_contains(sfc_login_errors()['email'] ?? '', 'Too many'), 'IP throttle did not block attempt 31.');
    auth_test_require($queryCount === $testPdo->queries, 'Throttled login queried credential storage.');

    foreach (sfc_demo_credentials() as $credential) {
        $demoUser = ['email' => $credential['email'], 'passwordHash' => password_hash($credential['password'], PASSWORD_DEFAULT)];
        auth_test_require(sfc_uses_default_demo_password($demoUser), 'A default demo password was usable outside local development.');
        $demoUser['passwordHash'] = password_hash($loginPassword, PASSWORD_DEFAULT);
        auth_test_require(!sfc_uses_default_demo_password($demoUser), 'A rotated demo account was rejected.');
    }

    $page = file_get_contents(dirname(__DIR__, 2) . '/admin-login.php');
    auth_test_require(!str_contains($page, 'sfc_register_admin('), 'The public login page still provisions administrators.');
    auth_test_require(!str_contains($page, '?mode=signup'), 'The admin page advertises signup.');
    auth_test_require(!str_contains($page, sfc_demo_credentials()['admin']['password']), 'The admin page publishes demo credentials.');
    echo "PASS: guest/investor/forged role blocked; CSRF required; authorized provisioning preserves session; login rotates session; production demo defaults and suspended accounts blocked.\n";
} finally {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
    foreach (glob($sessionDirectory . DIRECTORY_SEPARATOR . 'sess_*') ?: [] as $sessionFile) {
        unlink($sessionFile);
    }
    rmdir($sessionDirectory);
}
