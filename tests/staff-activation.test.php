<?php
declare(strict_types=1);

// Exercise the actual API dispatcher, activation service, and repository without
// opening a database or creating persistent user records.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Repositories/UserRepository.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Support/staff-onboarding.php';
require_once dirname(__DIR__) . '/api/_request.php';

final class StaffActivationPdo extends PDO
{
    public array $users = [];
    public int $insertions = 0;
    public int $queries = 0;
    public bool $duplicateOnInsert = false;

    public function __construct() {}

    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        return new StaffActivationStatement($this, $query);
    }

    public function lastInsertId(?string $name = null): string|false
    {
        return (string) max(array_keys($this->users));
    }
}

final class StaffActivationStatement extends PDOStatement
{
    private array|false $row = false;

    public function __construct(private StaffActivationPdo $pdo, private string $query) {}

    public function execute(?array $params = null): bool
    {
        $params ??= [];
        $this->pdo->queries++;
        if (str_starts_with(ltrim($this->query), 'INSERT')) {
            if ($this->pdo->duplicateOnInsert) {
                $this->pdo->duplicateOnInsert = false;
                $exception = new PDOException('Duplicate entry on uniq_users_email: private database diagnostic', 23000);
                $exception->errorInfo = ['23000', 1062, 'private database diagnostic'];
                throw $exception;
            }
            $id = count($this->pdo->users) + 1;
            $this->pdo->users[$id] = $params + [
                'id' => $id, 'account_status' => 'active',
                'last_login_at' => null, 'last_active_at' => null,
                'created_at' => gmdate('Y-m-d H:i:s'), 'updated_at' => gmdate('Y-m-d H:i:s'),
            ];
            $this->pdo->insertions++;
            return true;
        }
        if (str_starts_with(ltrim($this->query), 'UPDATE')) {
            $id = (int) ($params['id'] ?? 0);
            if (isset($this->pdo->users[$id])) {
                $this->pdo->users[$id]['last_login_at'] = $params['login_at'] ?? null;
                $this->pdo->users[$id]['last_active_at'] = $params['active_at'] ?? null;
            }
            return true;
        }
        $this->row = false;
        foreach ($this->pdo->users as $user) {
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

function staff_activation_check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $GLOBALS['staffActivationChecks']++;
}

function staff_activation_dispatch(array $input, string $method = 'POST', bool $csrf = true, bool $reuseIp = false): array
{
    if (!$reuseIp) {
        $_SERVER['REMOTE_ADDR'] = $GLOBALS['staffActivationIpPrefix'] . dechex(++$GLOBALS['staffActivationIpIndex']) . '::1';
    }
    $_SERVER['REQUEST_METHOD'] = $method;
    $_POST = $input + ['_csrf' => $csrf ? sfc_csrf_token() : 'invalid'];
    $rateLimitPath = (string) sfc_security_config()['security']['rate_limit_path'];
    $GLOBALS['staffActivationCounterFiles'][] = $rateLimitPath . DIRECTORY_SEPARATOR
        . hash('sha256', 'city-staff-activation:' . $_SERVER['REMOTE_ADDR']) . '.json';
    http_response_code(200);
    ob_start();
    try {
        eval($GLOBALS['staffActivationRoute']);
        $body = (string) ob_get_contents();
        return [http_response_code(), json_decode($body, true, 512, JSON_THROW_ON_ERROR), $body];
    } finally {
        ob_end_clean();
    }
}

$variables = ['APP_ENV', 'SFC_CITY_STAFF_PASSKEY', 'SFC_CITY_STAFF_EMAILS', 'SFC_CITY_STAFF_EMAIL_DOMAINS', 'SFC_CITY_STAFF_PASSKEY_EXPIRES_AT'];
$originalEnvironment = array_combine($variables, array_map('getenv', $variables));
$originalServer = $_SERVER;
$originalPost = $_POST;
$originalSavePath = session_save_path();
$sessionDirectory = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'locus-staff-activation-' . bin2hex(random_bytes(8));
mkdir($sessionDirectory, 0700);
session_save_path($sessionDirectory);
$staffActivationChecks = 0;
$staffActivationIpIndex = 0;
$staffActivationIpPrefix = '2001:db8:' . bin2hex(random_bytes(2)) . ':' . bin2hex(random_bytes(2)) . ':';
$staffActivationCounterFiles = [];
$source = (string) file_get_contents(dirname(__DIR__) . '/api/staff-onboard.php');
$offset = strpos($source, 'api_handle(');
staff_activation_check($offset !== false, 'Staff activation API registration is missing.');
$staffActivationRoute = substr($source, (int) $offset);
$pdo = new StaffActivationPdo();
$container = ['users' => new App\Repositories\UserRepository($pdo)];
$apiDebug = false;
$secret = bin2hex(random_bytes(20));
$password = 'Example-' . bin2hex(random_bytes(12));

try {
    putenv('APP_ENV=production');
    putenv('SFC_CITY_STAFF_PASSKEY=' . $secret);
    putenv('SFC_CITY_STAFF_EMAILS=');
    putenv('SFC_CITY_STAFF_EMAIL_DOMAINS=staff.example.gov');
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=');
    $_SERVER = [
        'HTTP_HOST' => 'staff.example.gov', 'REMOTE_ADDR' => '192.0.2.1', 'SERVER_ADDR' => '192.0.2.2',
        'HTTPS' => 'on', 'CONTENT_TYPE' => 'application/x-www-form-urlencoded',
        'SCRIPT_NAME' => '/api/staff-onboard.php',
    ];
    sfc_start_session();
    $_SESSION = [];
    $payload = [
        'department' => 'CICTO', 'first_name' => 'Sample', 'last_name' => 'Officer',
        'email' => 'officer@staff.example.gov', 'password' => $password,
        'confirm_password' => $password, 'city_passkey' => $secret, 'privacy_consent' => '1',
    ];

    [$status] = staff_activation_dispatch($payload, 'POST', false);
    staff_activation_check($status === 419 && $pdo->queries === 0, 'Invalid CSRF reached staff validation or database access.');
    [$status] = staff_activation_dispatch([], 'GET');
    staff_activation_check($status === 405 && $pdo->insertions === 0, 'GET created a staff account.');

    $invalid = [
        'department' => 'unknown', 'email' => 'officer@personal.example',
        'city_passkey' => 'wrong', 'privacy_consent' => false,
        'first_name' => [], 'last_name' => new stdClass(),
        'password' => 123456789, 'confirm_password' => 123456789,
    ];
    foreach ($invalid as $field => $value) {
        $beforeQueries = $pdo->queries;
        [$status, $response, $body] = staff_activation_dispatch(array_replace($payload, [$field => $value]));
        staff_activation_check($status === 422 && isset($response['errors'][$field]), 'Invalid staff field lacked its API error: ' . $field);
        staff_activation_check($pdo->queries === $beforeQueries && $pdo->insertions === 0, 'Invalid staff input reached account persistence: ' . $field);
        staff_activation_check(!str_contains($body, $secret) && !str_contains($body, $password) && !isset($response['details']) && !isset($response['user']), 'A rejected activation disclosed credentials or account data.');
    }
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=2000-01-01');
    [$status, $response] = staff_activation_dispatch($payload);
    staff_activation_check($status === 422 && ($response['errors']['city_passkey'] ?? '') === 'Invalid or expired city passkey.' && $pdo->insertions === 0, 'Expired passkey created privileged access.');
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=');

    $oldSessionId = session_id();
    $oldCsrf = sfc_csrf_token();
    foreach (['CICTO', 'City Assessor', 'LEBDO'] as $index => $department) {
        [$status, $response, $body] = staff_activation_dispatch(array_replace($payload, [
            'department' => $department, 'email' => 'officer' . $index . '@staff.example.gov',
            'role' => 'investor', 'account_status' => 'disabled', 'identity_verification_status' => 'unverified',
        ]));
        staff_activation_check($status === 201 && $pdo->insertions === $index + 1, 'Authorized department activation failed.');
        $user = $response['user'];
        staff_activation_check($user['role'] === 'admin' && $user['identityVerificationStatus'] === 'verified' && $user['accountStatus'] === 'active', 'Activated account did not receive the authorized active and verified state.');
        staff_activation_check($user['department'] === (['CICTO', 'ASSESSOR', 'LEBDO'][$index]) && sfc_account_can_authenticate($user), 'Activated staff cannot authenticate for their department.');
        staff_activation_check($user['firstName'] === 'Sample' && $user['lastName'] === 'Officer' && !empty($user['privacyConsentAt']), 'Activation did not preserve identity and consent.');
        $row = $pdo->users[$user['id']];
        staff_activation_check($row['password_hash'] !== $password && password_verify($password, $row['password_hash']), 'Activation did not securely hash the submitted password.');
        staff_activation_check(!str_contains($body, $secret) && !str_contains($body, $password) && !isset($user['passwordHash']), 'Successful API activation disclosed private credentials.');
        staff_activation_check($_SESSION['sfc_user']['id'] === $user['id'] && ($_SESSION['sfc_welcome_mode'] ?? '') === 'new', 'Activation did not establish the new account session.');
    }
    staff_activation_check(session_id() !== $oldSessionId && sfc_csrf_token() !== $oldCsrf, 'Activation did not rotate the session and CSRF token.');

    [$status, $response] = staff_activation_dispatch(array_replace($payload, ['email' => 'OFFICER0@STAFF.EXAMPLE.GOV']));
    staff_activation_check($status === 409 && ($response['errors']['email'] ?? '') === 'An account with this email already exists. Sign in instead.' && $pdo->insertions === 3, 'Duplicate activation email created an account.');
    $pdo->duplicateOnInsert = true;
    [$status, $response, $body] = staff_activation_dispatch(array_replace($payload, ['email' => 'concurrent@staff.example.gov']));
    staff_activation_check($status === 409 && isset($response['errors']['email']) && $pdo->insertions === 3 && !str_contains($body, 'private database diagnostic'), 'A duplicate email race leaked persistence diagnostics or created an account.');

    [$status] = staff_activation_dispatch(array_replace($payload, ['city_passkey' => 'wrong']));
    for ($attempt = 1; $attempt < 12; $attempt++) {
        [$status] = staff_activation_dispatch(array_replace($payload, ['city_passkey' => 'wrong']), 'POST', true, true);
    }
    staff_activation_check($status === 422, 'Activation throttled earlier than its configured attempt budget.');
    [$status, $response] = staff_activation_dispatch($payload, 'POST', true, true);
    staff_activation_check($status === 429 && isset($response['errors']['city_passkey']) && $pdo->insertions === 3, 'Activation attempts were not throttled across shared IP requests.');
} finally {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
    foreach (glob($sessionDirectory . DIRECTORY_SEPARATOR . 'sess_*') ?: [] as $file) {
        unlink($file);
    }
    rmdir($sessionDirectory);
    session_save_path($originalSavePath);
    foreach (array_unique($staffActivationCounterFiles) as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
    foreach ($originalEnvironment as $variable => $value) {
        putenv($value === false ? $variable : $variable . '=' . $value);
    }
    $_SERVER = $originalServer;
    $_POST = $originalPost;
}
echo 'PASS: ' . $staffActivationChecks . " staff activation integration checks; real service/repository/API tested with in-memory persistence.\n";
