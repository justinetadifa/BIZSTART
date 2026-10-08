<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once dirname(__DIR__) . '/app/Core/Database.php';
require_once dirname(__DIR__) . '/app/Support/AdminPasswordRecovery.php';

use App\Core\Database;
use App\Support\AdminPasswordRecovery;

$arguments = array_slice($argv, 1);
if ($arguments === ['--help']) {
    echo "Usage: php scripts/reset-admin-password.php --email=EXISTING_EMAIL [--check]\n";
    echo "       php scripts/reset-admin-password.php --email=EXISTING_EMAIL --apply --password-stdin\n";
    echo "Default: read-only eligibility check. Reset: supply password and confirmation as two stdin lines.\n";
    echo "Use a non-echoing input pipe; passwords must never appear in command arguments or shell history.\n";
    echo "Only an existing active, verified administrator can be recovered. No accounts are created.\n";
    exit;
}

$email = null;
$apply = false;
$check = false;
$passwordStdin = false;
foreach ($arguments as $argument) {
    if (str_starts_with($argument, '--email=') && $email === null) {
        $email = substr($argument, 8);
    } elseif ($argument === '--apply' && !$apply) {
        $apply = true;
    } elseif ($argument === '--check' && !$check) {
        $check = true;
    } elseif ($argument === '--password-stdin' && !$passwordStdin) {
        $passwordStdin = true;
    } else {
        fwrite(STDERR, "Invalid arguments. Use --help; passwords are accepted only through stdin.\n");
        exit(2);
    }
}
if ($email === null || ($apply && $check) || $apply !== $passwordStdin) {
    fwrite(STDERR, "Supply --email and choose --check or --apply --password-stdin. Use --help.\n");
    exit(2);
}

try {
    $password = $confirmation = null;
    if ($apply) {
        if (!function_exists('stream_isatty') || stream_isatty(STDIN)) {
            throw new RuntimeException('Use a non-echoing pipe for password input. Direct terminal input is refused.');
        }
        $first = fgets(STDIN);
        $second = fgets(STDIN);
        if ($first === false || $second === false) {
            throw new RuntimeException('Supply the new password and its confirmation as two stdin lines.');
        }
        $password = rtrim($first, "\r\n");
        $confirmation = rtrim($second, "\r\n");
        AdminPasswordRecovery::passwordHash($password, $confirmation);
        unset($first, $second);
    }
    // Avoid bootstrap.php: recovery must never migrate, seed or create a database.
    $config = require dirname(__DIR__) . '/app/config.php';
    $databaseConfig = $config['db'];
    $databaseConfig['auto_create'] = false;
    $pdo = (new Database($databaseConfig))->pdo();
    $recovery = new AdminPasswordRecovery($pdo);
    $account = $apply
        ? $recovery->reset($email, $password, $confirmation)
        : $recovery->eligibleAccount($email);
    unset($password, $confirmation);
    echo ($apply ? 'Password reset completed' : 'Read-only check: eligible administrator') . ' for ' . $account['email'] . ".\n";
    echo "Role, department and access status were preserved.\n";
    if (!$apply) { echo "No records changed. Reset requires --apply --password-stdin.\n"; }
} catch (Throwable $exception) {
    unset($password, $confirmation);
    fwrite(STDERR, $exception instanceof PDOException ? "Database operation failed. Verify the deployment configuration and users schema.\n" : $exception->getMessage() . "\n");
    exit(1);
}
