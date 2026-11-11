<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once dirname(__DIR__) . '/app/Core/Database.php';

// Exercise the real login controllers without stopping MySQL or touching accounts.
if (($argv[1] ?? '') === '--login-outage') {
    $role = $argv[2] ?? '';
    if (!in_array($role, ['admin', 'investor', 'seller'], true)) { exit(2); }
    session_save_path($argv[3]);
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_SERVER['SCRIPT_NAME'] = '/' . $role . '-login.php';
    $_SERVER['REMOTE_ADDR'] = 'database-outage-test-' . bin2hex(random_bytes(8));
    require_once dirname(__DIR__) . '/app/Support/auth.php';
    require_once dirname(__DIR__) . '/app/Repositories/UserRepository.php';

    final class UnavailableAccountPdo extends PDO
    {
        public function __construct() {}
        public function prepare(string $query, array $options = []): PDOStatement|false
        {
            throw new App\Core\DatabaseUnavailableException('PRIVATE_DATABASE_DETAILS', 0, new PDOException('PRIVATE_DRIVER_DETAILS'));
        }
    }
    $GLOBALS['container'] = ['users' => new App\Repositories\UserRepository(new UnavailableAccountPdo())];
    $_POST = [
        'mode' => 'login', 'email' => 'outage-check@example.test',
        'password' => 'PRIVATE_PASSWORD_FIXTURE', '_csrf' => sfc_csrf_token(),
    ];
    ob_start();
    require dirname(__DIR__) . '/' . $role . '-login.php';
    $body = (string) ob_get_clean();
    $result = [
        'status' => http_response_code(),
        'has_form' => str_contains($body, 'data-account-form'),
        'has_alert' => str_contains($body, 'role="alert">Account services are temporarily unavailable.'),
        'leaks_details' => preg_match('/PRIVATE_DATABASE_DETAILS|PRIVATE_DRIVER_DETAILS|PRIVATE_PASSWORD_FIXTURE|Fatal error|Stack trace|SQLSTATE|PDOException/', $body) === 1,
        'authenticated' => isset($_SESSION['sfc_user']),
    ];
    session_destroy();
    echo json_encode($result, JSON_THROW_ON_ERROR);
    exit;
}

$checks = 0;
$check = static function (bool $passed, string $message) use (&$checks): void {
    if (!$passed) { throw new RuntimeException($message); }
    $checks++;
};

// Reserve then close an ephemeral port to exercise an actual refused connection.
$socket = stream_socket_server('tcp://127.0.0.1:0', $socketError, $socketMessage);
if ($socket === false) { throw new RuntimeException('Cannot allocate a local test port.'); }
$port = (int) substr(strrchr((string) stream_socket_get_name($socket, false), ':'), 1);
fclose($socket);
try {
    (new App\Core\Database([
        'host' => '127.0.0.1', 'port' => $port, 'name' => 'outage_fixture',
        'user' => 'fixture', 'pass' => 'fixture', 'auto_create' => false,
    ]))->pdo();
    throw new RuntimeException('An unavailable database unexpectedly connected.');
} catch (App\Core\DatabaseUnavailableException $exception) {
    $check($exception instanceof RuntimeException, 'Existing runtime exception handling must remain compatible.');
    $check($exception->getPrevious() instanceof PDOException, 'Driver diagnostics must remain available to server-side handlers.');
}

$sessionDirectory = sys_get_temp_dir() . '/locus-database-outage-' . bin2hex(random_bytes(8));
if (!mkdir($sessionDirectory, 0700)) { throw new RuntimeException('Cannot create isolated sessions.'); }
try {
    foreach (['admin', 'investor', 'seller'] as $role) {
        $process = proc_open([PHP_BINARY, __FILE__, '--login-outage', $role, $sessionDirectory], [
            0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w'],
        ], $pipes, dirname(__DIR__));
        if (!is_resource($process)) { throw new RuntimeException('Cannot run isolated login test.'); }
        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]); fclose($pipes[1]);
        $stderr = stream_get_contents($pipes[2]); fclose($pipes[2]);
        $code = proc_close($process);
        $check($code === 0, $role . ' outage controller failed: ' . $stderr);
        $result = json_decode($stdout, true, 512, JSON_THROW_ON_ERROR);
        $check($result['status'] === 503, $role . ' outage must return HTTP 503.');
        $check($result['has_form'] && $result['has_alert'], $role . ' must retain a usable form and explain the outage.');
        $check(!$result['leaks_details'], $role . ' exposed connection details or a submitted password.');
        $check(!$result['authenticated'], $role . ' authenticated despite an unavailable database.');
    }
} finally {
    foreach (glob($sessionDirectory . '/sess_*') ?: [] as $file) { unlink($file); }
    rmdir($sessionDirectory);
}
echo 'Database outage checks passed (' . $checks . " checks; no account/database writes).\n";
