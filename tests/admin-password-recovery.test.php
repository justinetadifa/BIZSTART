<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/AdminPasswordRecovery.php';

use App\Support\AdminPasswordRecovery;

// No configured database or bootstrap is loaded. Every write is in memory.
final class RecoveryTestPdo extends PDO
{
    public ?Closure $beforeRecoveryWrite = null;

    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        if (str_starts_with($query, 'UPDATE users SET password_hash') && $this->beforeRecoveryWrite !== null) {
            $callback = $this->beforeRecoveryWrite;
            $this->beforeRecoveryWrite = null;
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
$pdo = new RecoveryTestPdo('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec('CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, role TEXT, department TEXT, account_status TEXT, identity_verification_status TEXT, password_hash TEXT, name TEXT, phone TEXT)');
$originalPassword = 'Fixture-original-598!';
$newPassword = 'Fixture-rotated-845!';
$originalHash = password_hash($originalPassword, PASSWORD_DEFAULT);
$fixtures = [
    [1, 'cicto@example.test', 'admin', 'CICTO', 'active', 'verified'],
    [2, 'assessor@example.test', 'admin', 'ASSESSOR', 'active', 'verified'],
    [3, 'lebdo@example.test', 'admin', 'LEBDO', 'active', 'verified'],
    [4, 'investor@example.test', 'investor', null, 'active', 'verified'],
    [5, 'seller@example.test', 'seller', null, 'active', 'verified'],
    [6, 'suspended@example.test', 'admin', 'CICTO', 'suspended', 'verified'],
    [7, 'disabled@example.test', 'admin', 'CICTO', 'disabled', 'verified'],
    [8, 'inactive@example.test', 'admin', 'CICTO', 'inactive', 'verified'],
    [9, 'pending@example.test', 'admin', 'CICTO', 'active', 'pending'],
    [10, 'unverified@example.test', 'admin', 'CICTO', 'active', 'unverified'],
    [11, 'rejected@example.test', 'admin', 'CICTO', 'active', 'rejected'],
    [12, 'identity-suspended@example.test', 'admin', 'CICTO', 'active', 'suspended'],
    [13, 'identity-disabled@example.test', 'admin', 'CICTO', 'active', 'disabled'],
];
$insert = $pdo->prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
foreach ($fixtures as $fixture) {
    $insert->execute([...$fixture, $originalHash, 'Preserved staff name', '09171234567']);
}
$snapshot = static fn (): array => $pdo->query('SELECT * FROM users ORDER BY id')->fetchAll();
$recovery = new AdminPasswordRecovery($pdo);
$rejectUnchanged = static function (Closure $action, string $message) use ($snapshot, $check): void {
    $before = $snapshot();
    $rejected = false;
    try { $action(); } catch (InvalidArgumentException|RuntimeException) { $rejected = true; }
    $check($rejected && $snapshot() === $before, $message);
};

$before = $snapshot();
$account = $recovery->eligibleAccount(' CICTO@EXAMPLE.TEST ');
$check((int) $account['id'] === 1 && $snapshot() === $before, 'Eligibility check must normalize email and make no changes.');
foreach (array_slice($fixtures, 3) as $fixture) {
    $rejectUnchanged(static fn () => $recovery->reset($fixture[1], $newPassword, $newPassword), 'An ineligible account was changed: ' . $fixture[1]);
}
foreach (['unknown@example.test', 'invalid-email', str_repeat('a', 191) . '@example.test'] as $email) {
    $rejectUnchanged(static fn () => $recovery->reset($email, $newPassword, $newPassword), 'Unknown or malformed email must not create an account.');
}
foreach (sfc_demo_credentials() as $credential) {
    $password = $credential['password'];
    $rejectUnchanged(static fn () => $recovery->reset('cicto@example.test', $password, $password), 'Demonstration credentials must be rejected.');
}
foreach (['short', str_repeat('x', 73), 'fixture' . "\0" . 'password', str_repeat('é', 37)] as $password) {
    $rejectUnchanged(static fn () => $recovery->reset('cicto@example.test', $password, $password), 'Invalid password must not change a record.');
}
$rejectUnchanged(static fn () => $recovery->reset('cicto@example.test', $newPassword, 'Mismatch-845!'), 'Confirmation mismatch must not change a record.');
$rejectUnchanged(static fn () => $recovery->reset('cicto@example.test', $originalPassword, $originalPassword), 'Recovery must require a different password.');

foreach (array_slice($fixtures, 0, 3) as $fixture) {
    $before = $snapshot();
    $result = $recovery->reset($fixture[1], $newPassword, $newPassword);
    $after = $snapshot();
    $index = $fixture[0] - 1;
    $check(password_verify($newPassword, $after[$index]['password_hash']) && !password_verify($originalPassword, $after[$index]['password_hash']), 'Recovered password must authenticate and replace the old credential.');
    $after[$index]['password_hash'] = $before[$index]['password_hash'];
    $check($after === $before, 'Recovery changed information other than the targeted password hash.');
    $check(!isset($result['password_hash']) && $result['department'] === $fixture[3], 'Operator result must preserve the department and exclude password hashes.');
}

// Simulate a suspension after eligibility was read, before the conditional write.
$beforeHash = $snapshot()[0]['password_hash'];
$pdo->beforeRecoveryWrite = static function (PDO $pdo): void {
    $pdo->exec("UPDATE users SET account_status = 'suspended' WHERE id = 1");
};
$rejected = false;
try { $recovery->reset('cicto@example.test', 'Fixture-race-946!', 'Fixture-race-946!'); } catch (RuntimeException) { $rejected = true; }
$check($rejected && $snapshot()[0]['password_hash'] === $beforeHash && $snapshot()[0]['account_status'] === 'suspended', 'Concurrent suspension must remain effective and prevent the reset.');

// Simulate another operator changing the password after eligibility was read.
$concurrentPassword = 'Fixture-other-operator-739!';
$concurrentHash = password_hash($concurrentPassword, PASSWORD_DEFAULT);
$pdo->beforeRecoveryWrite = static function (PDO $pdo) use ($concurrentHash): void {
    $statement = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = 2');
    $statement->execute(['hash' => $concurrentHash]);
};
$rejected = false;
try { $recovery->reset('assessor@example.test', 'Fixture-race-847!', 'Fixture-race-847!'); } catch (RuntimeException) { $rejected = true; }
$check($rejected && $snapshot()[1]['password_hash'] === $concurrentHash, 'A concurrent password reset must not be overwritten.');
$check(count($snapshot()) === count($fixtures), 'Recovery must not add or delete accounts.');

echo "PASS: $checks admin recovery checks; active verified admin only, passwords rotate without access changes, concurrent changes protected; isolated in-memory database.\n";
