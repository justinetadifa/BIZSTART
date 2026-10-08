<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/AdminAccountSetup.php';
require_once dirname(__DIR__) . '/app/Repositories/UserRepository.php';

use App\Support\AdminAccountSetup;
use App\Repositories\UserRepository;

// Setup tests never load configuration or connect to a real database.
final class SetupTestPdo extends PDO
{
    public ?Closure $beforeInsert = null;

    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        if (str_starts_with($query, 'INSERT INTO users') && $this->beforeInsert !== null) {
            $callback = $this->beforeInsert;
            $this->beforeInsert = null;
            $callback($this);
        }
        return parent::prepare($query, $options);
    }
}

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$pdo = new SetupTestPdo('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE COLLATE NOCASE, role TEXT, name TEXT, department TEXT, account_status TEXT DEFAULT 'active', identity_verification_status TEXT, identity_verified_at TEXT, password_hash TEXT, last_login_at TEXT, last_active_at TEXT)");
$snapshot = static fn (): array => $pdo->query('SELECT * FROM users ORDER BY id')->fetchAll();
$password = 'Fixture-private-account-739!';
$settings = ['email' => 'new-admin@example.test', 'name' => 'City Administrator', 'password_hash' => password_hash($password, PASSWORD_DEFAULT), 'department' => 'CICTO'];
$result = AdminAccountSetup::ensure($pdo, $settings);
$rows = $snapshot();
$check($result['created'] === true && count($rows) === 1 && $result['id'] === (int) $rows[0]['id'], 'First setup must create exactly one administrator.');
$check($rows[0]['role'] === 'admin' && $rows[0]['department'] === 'CICTO' && $rows[0]['account_status'] === 'active' && $rows[0]['identity_verification_status'] === 'verified' && $rows[0]['identity_verified_at'] !== null, 'New administrator must have the configured department and verified active access.');
$check(password_verify($password, $rows[0]['password_hash']), 'The configured private password must authenticate.');
$check(!isset($result['password_hash']), 'Setup must never return a password hash.');

$before = $snapshot();
$changedSettings = array_replace($settings, ['email' => ' NEW-ADMIN@EXAMPLE.TEST ', 'name' => 'Changed name', 'department' => 'LEBDO', 'password_hash' => password_hash('Fixture-other-config-847!', PASSWORD_DEFAULT)]);
$result = AdminAccountSetup::ensure($pdo, $changedSettings);
$check($result['created'] === false && $snapshot() === $before, 'Repeat setup must preserve every field, including the existing password and department.');
$result = AdminAccountSetup::ensure($pdo, array_replace($settings, ['password_hash' => password_hash(sfc_demo_credentials()['admin']['password'], PASSWORD_DEFAULT)]));
$check($result['created'] === false && $snapshot() === $before, 'A changed configuration must never replace an existing private credential with a demonstration password.');

$rejectUnchanged = static function (array $settings, string $message) use ($pdo, $snapshot, $check): void {
    $before = $snapshot();
    $rejected = false;
    try { AdminAccountSetup::ensure($pdo, $settings); } catch (InvalidArgumentException|RuntimeException) { $rejected = true; }
    $check($rejected && $snapshot() === $before, $message);
};
foreach (sfc_demo_credentials() as $credential) {
    $rejectUnchanged(array_replace($settings, ['email' => 'reject-demo@example.test', 'password_hash' => password_hash($credential['password'], PASSWORD_DEFAULT)]), 'Public demonstration passwords must never create production administrator access.');
}
foreach ([
    ['email' => 'not-an-email'], ['email' => str_repeat('a', 191) . '@example.test'],
    ['name' => ''], ['name' => str_repeat('a', 141)], ['department' => 'GUEST'],
    ['password_hash' => 'plaintext-password'], ['password_hash' => ''], ['password_hash' => null],
] as $invalid) {
    $rejectUnchanged(array_replace($settings, $invalid), 'Invalid setup configuration must not change accounts.');
}

$insert = $pdo->prepare('INSERT INTO users (email, role, name, department, account_status, identity_verification_status, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)');
foreach ([
    ['investor@example.test', 'investor', 'active', 'verified'],
    ['seller@example.test', 'seller', 'active', 'verified'],
    ['suspended@example.test', 'admin', 'suspended', 'verified'],
    ['disabled@example.test', 'admin', 'disabled', 'verified'],
    ['inactive@example.test', 'admin', 'inactive', 'verified'],
    ['pending@example.test', 'admin', 'active', 'pending'],
    ['unverified@example.test', 'admin', 'active', 'unverified'],
    ['identity-suspended@example.test', 'admin', 'active', 'suspended'],
    ['identity-disabled@example.test', 'admin', 'active', 'disabled'],
] as [$email, $role, $status, $verification]) {
    $insert->execute([$email, $role, 'Preserved account', 'ASSESSOR', $status, $verification, $settings['password_hash']]);
    $rejectUnchanged(array_replace($settings, ['email' => $email]), 'Existing role or status must never be overridden by setup: ' . $email);
}

// A simultaneous request inserting the same eligible email must remain idempotent.
$raceSettings = array_replace($settings, ['email' => 'race-admin@example.test']);
$pdo->beforeInsert = static function (PDO $pdo) use ($raceSettings): void {
    AdminAccountSetup::ensure($pdo, array_replace($raceSettings, ['department' => 'LEBDO']));
};
$result = AdminAccountSetup::ensure($pdo, $raceSettings);
$check($result['created'] === false && (int) $pdo->query("SELECT COUNT(*) FROM users WHERE email = 'race-admin@example.test'")->fetchColumn() === 1, 'Concurrent initial setup must leave one administrator.');
$check($pdo->query("SELECT department FROM users WHERE email = 'race-admin@example.test'")->fetchColumn() === 'LEBDO', 'Concurrent setup must preserve the account created by the first request.');

// An email claimed by another role during setup cannot be promoted.
$collisionSettings = array_replace($settings, ['email' => 'race-investor@example.test']);
$pdo->beforeInsert = static function (PDO $pdo) use ($collisionSettings): void {
    $statement = $pdo->prepare("INSERT INTO users (email, role, name, department, account_status, identity_verification_status, password_hash) VALUES (:email, 'investor', 'Concurrent investor', NULL, 'active', 'unverified', :hash)");
    $statement->execute(['email' => $collisionSettings['email'], 'hash' => $collisionSettings['password_hash']]);
};
$rejected = false;
try { AdminAccountSetup::ensure($pdo, $collisionSettings); } catch (RuntimeException) { $rejected = true; }
$check($rejected && $pdo->query("SELECT role FROM users WHERE email = 'race-investor@example.test'")->fetchColumn() === 'investor', 'A concurrent non-admin email collision must not grant administrator access.');

// Older deployments may have no account_status column. Their account model
// treats that missing field as active; recovery must not require a migration.
$legacy = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$legacy->exec('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE COLLATE NOCASE, role TEXT, name TEXT, department TEXT, identity_verification_status TEXT, identity_verified_at TEXT, password_hash TEXT)');
$legacySettings = array_replace($settings, ['email' => 'legacy-admin@example.test']);
$legacyResult = AdminAccountSetup::ensure($legacy, $legacySettings);
$legacyRows = $legacy->query('SELECT * FROM users ORDER BY id')->fetchAll();
$check($legacyResult['created'] === true && count($legacyRows) === 1 && $legacyRows[0]['identity_verification_status'] === 'verified' && password_verify($password, $legacyRows[0]['password_hash']), 'A legacy users table must support verified administrator creation without schema changes.');
$legacyResult = AdminAccountSetup::ensure($legacy, array_replace($legacySettings, ['department' => 'LEBDO', 'password_hash' => $changedSettings['password_hash']]));
$check($legacyResult['created'] === false && $legacy->query('SELECT * FROM users ORDER BY id')->fetchAll() === $legacyRows, 'Repeat legacy setup must preserve the original password and department.');
$legacy->exec("UPDATE users SET identity_verification_status = 'suspended' WHERE email = 'legacy-admin@example.test'");
$legacyRows = $legacy->query('SELECT * FROM users ORDER BY id')->fetchAll();
$rejected = false;
try { AdminAccountSetup::ensure($legacy, $legacySettings); } catch (RuntimeException) { $rejected = true; }
$check($rejected && $legacy->query('SELECT * FROM users ORDER BY id')->fetchAll() === $legacyRows, 'Missing account_status must not allow a suspended legacy identity to reactivate.');

// Exercise the real production sign-in path against only the in-memory users.
$originalEnvironment = getenv('APP_ENV');
$originalServer = $_SERVER;
$originalSessionPath = session_save_path();
$sessionDirectory = sys_get_temp_dir() . '/locus-setup-auth-' . bin2hex(random_bytes(8));
mkdir($sessionDirectory);
session_save_path($sessionDirectory);
putenv('APP_ENV=production');
$_SERVER['HTTP_HOST'] = 'locus-sf.site';
$_SERVER['SERVER_ADDR'] = '203.0.113.10';
$_SERVER['REMOTE_ADDR'] = 'setup-auth-' . bin2hex(random_bytes(8));
$_SERVER['HTTPS'] = 'on';
$counterPath = sfc_security_config()['security']['rate_limit_path'] . DIRECTORY_SEPARATOR . hash('sha256', 'account-login:' . $_SERVER['REMOTE_ADDR']) . '.json';
$GLOBALS['container'] = ['pdo' => $pdo, 'users' => new UserRepository($pdo)];
try {
    $check(!sfc_security_is_local(), 'Sign-in fixture must use production access policy.');
    $check(sfc_login('admin', $settings['email'], $password), 'A privately configured administrator must sign in using the real production authentication path.');
    $check(($_SESSION['sfc_user']['role'] ?? null) === 'admin' && ($_SESSION['sfc_user']['department'] ?? null) === 'CICTO', 'Production sign-in must retain administrator department access.');
    $check(!sfc_login('admin', $settings['email'], 'Incorrect-fixture-password'), 'Production sign-in must refuse incorrect credentials.');
    $insert->execute(['admin@sfcelerate.local', 'admin', 'Public demonstration staff', 'CICTO', 'active', 'verified', password_hash(sfc_demo_credentials()['admin']['password'], PASSWORD_DEFAULT)]);
    $check(!sfc_login('admin', 'admin@sfcelerate.local', sfc_demo_credentials()['admin']['password']), 'Private administrator setup must not relax the production demonstration password block.');
} finally {
    if (session_status() === PHP_SESSION_ACTIVE) { session_destroy(); }
    foreach (glob($sessionDirectory . '/sess_*') ?: [] as $file) { unlink($file); }
    rmdir($sessionDirectory);
    if (is_file($counterPath)) { unlink($counterPath); }
    session_save_path($originalSessionPath);
    $_SERVER = $originalServer;
    putenv($originalEnvironment === false ? 'APP_ENV' : 'APP_ENV=' . $originalEnvironment);
}

echo "PASS: $checks private administrator setup checks; one verified account, repeat setup preserves passwords and access, production sign-in works while public defaults remain blocked; isolated in-memory database.\n";
