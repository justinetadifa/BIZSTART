<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;
use PDO;
use RuntimeException;

require_once __DIR__ . '/auth.php';

/** Operator recovery changes a credential, never grants or reactivates access. */
final class AdminPasswordRecovery
{
    public function __construct(private PDO $pdo)
    {
    }

    public function eligibleAccount(string $email): array
    {
        $email = strtolower(trim($email));
        if (strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Supply the existing administrator email address.');
        }
        $statement = $this->pdo->prepare(
            'SELECT id, email, role, department, account_status, identity_verification_status, password_hash
             FROM users WHERE email = :email LIMIT 1'
        );
        $statement->execute(['email' => $email]);
        $account = $statement->fetch(PDO::FETCH_ASSOC);
        if (!is_array($account)) {
            throw new RuntimeException('No existing account matches this email. No account was created.');
        }
        if ($account['role'] !== 'admin'
            || $account['account_status'] !== 'active'
            || $account['identity_verification_status'] !== 'verified') {
            throw new RuntimeException('Recovery requires an existing active, verified administrator. No access was changed.');
        }
        return $account;
    }

    public static function passwordHash(string $password, string $confirmation): string
    {
        if (mb_strlen($password) < 8 || strlen($password) > 72 || str_contains($password, "\0")) {
            throw new InvalidArgumentException('Use a password of at least 8 characters and at most 72 bytes, without null characters.');
        }
        if (!hash_equals($password, $confirmation)) {
            throw new InvalidArgumentException('The password and confirmation do not match.');
        }
        foreach (\sfc_demo_credentials() as $credential) {
            if (hash_equals((string) $credential['password'], $password)) {
                throw new InvalidArgumentException('Choose a new private password; public demonstration passwords cannot be used.');
            }
        }
        return password_hash($password, PASSWORD_DEFAULT);
    }

    public function reset(string $email, string $password, string $confirmation): array
    {
        $hash = self::passwordHash($password, $confirmation);
        $account = $this->eligibleAccount($email);
        if (password_verify($password, (string) $account['password_hash'])) {
            throw new InvalidArgumentException('Choose a password different from the current password.');
        }
        // Recheck eligibility and the original hash in the same write. A concurrent
        // suspension, role change or password reset must not be overwritten.
        $statement = $this->pdo->prepare(
            "UPDATE users SET password_hash = :new_hash
             WHERE id = :id AND role = 'admin' AND account_status = 'active'
               AND identity_verification_status = 'verified' AND password_hash = :original_hash"
        );
        $statement->execute([
            'new_hash' => $hash,
            'id' => (int) $account['id'],
            'original_hash' => (string) $account['password_hash'],
        ]);
        if ($statement->rowCount() !== 1) {
            throw new RuntimeException('The account changed during recovery. Inspect its current access before trying again.');
        }
        // Do not return either password hash to an operator-facing caller.
        unset($account['password_hash']);
        return $account;
    }
}
