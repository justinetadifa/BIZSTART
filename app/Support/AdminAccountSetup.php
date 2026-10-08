<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;
use PDO;
use PDOException;
use RuntimeException;

require_once __DIR__ . '/auth.php';

/** An operator's private configuration can create one staff account, once. */
final class AdminAccountSetup
{
    public static function ensure(PDO $pdo, array $settings): array
    {
        $email = is_string($settings['email'] ?? null) ? strtolower(trim($settings['email'])) : '';
        $name = is_string($settings['name'] ?? null) ? trim($settings['name']) : '';
        $hash = is_string($settings['password_hash'] ?? null) ? $settings['password_hash'] : '';
        $department = $settings['department'] ?? 'CICTO';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190
            || $name === '' || mb_strlen($name) > 140
            || !in_array($department, ['CICTO', 'ASSESSOR', 'LEBDO'], true)) {
            throw new InvalidArgumentException('Private administrator setup requires a valid email, name and city department.');
        }
        if ($hash === '' || strlen($hash) > 255 || (password_get_info($hash)['algoName'] ?? 'unknown') === 'unknown') {
            throw new InvalidArgumentException('Private administrator setup requires a PHP password_hash result.');
        }
        $existing = self::find($pdo, $email);
        if ($existing !== null) { return self::existingResult($existing); }

        // Repeated requests preserve the account without expensive password work.
        // A new credential must still be checked against each distinct public default.
        $demoPasswords = array_unique(array_column(\sfc_demo_credentials(), 'password'));
        foreach ($demoPasswords as $demoPassword) {
            if (password_verify((string) $demoPassword, $hash)) {
                throw new InvalidArgumentException('Private administrator setup cannot use public demonstration passwords.');
            }
        }

        $statement = $pdo->prepare(
            "INSERT INTO users (role, name, department, email, password_hash,
                identity_verification_status, identity_verified_at)
             VALUES ('admin', :name, :department, :email, :password_hash,
                'verified', CURRENT_TIMESTAMP)"
        );
        try {
            $statement->execute([
                'name' => $name,
                'department' => $department,
                'email' => $email,
                'password_hash' => $hash,
            ]);
        } catch (PDOException $exception) {
            // A simultaneous first request may have created the same email.
            // Only that unique-email race is treated as an existing account.
            if ((string) $exception->getCode() === '23000') {
                $existing = self::find($pdo, $email);
                if ($existing !== null) { return self::existingResult($existing); }
            }
            throw $exception;
        }
        return ['created' => true, 'id' => (int) $pdo->lastInsertId(), 'email' => $email];
    }

    private static function find(PDO $pdo, string $email): ?array
    {
        $statement = $pdo->prepare(
            'SELECT * FROM users WHERE email = :email LIMIT 1'
        );
        $statement->execute(['email' => $email]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }

    private static function existingResult(array $account): array
    {
        if ($account['role'] !== 'admin') {
            throw new RuntimeException('The configured administrator email belongs to another account role. No account was changed.');
        }
        if (($account['account_status'] ?? 'active') !== 'active' || $account['identity_verification_status'] !== 'verified') {
            throw new RuntimeException('The configured staff account is inactive or unverified. Private setup will not reactivate it.');
        }
        // Operator configuration never resets a previously created account.
        return ['created' => false, 'id' => (int) $account['id'], 'email' => (string) $account['email']];
    }
}
