<?php
declare(strict_types=1);

namespace App\Core;

use PDO;
use RuntimeException;

/** Run local automatic migrations once per database and source revision. */
final class SchemaMigrationRunner
{
    public static function run(PDO $pdo, string $scope, array $sources, callable $migrate): bool
    {
        $hash = hash_init('sha256');
        foreach ($sources as $source) {
            $contents = file_get_contents($source);
            if ($contents === false) {
                throw new RuntimeException('Unable to read a database migration source.');
            }
            hash_update($hash, basename($source) . "\0" . $contents . "\0");
        }
        $fingerprint = hash_final($hash);
        $pdo->exec('CREATE TABLE IF NOT EXISTS app_schema_versions (
            scope VARCHAR(100) NOT NULL PRIMARY KEY,
            fingerprint CHAR(64) NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB');
        $read = $pdo->prepare('SELECT fingerprint FROM app_schema_versions WHERE scope = :scope');
        $current = static function () use ($read, $scope): string {
            $read->execute(['scope' => $scope]);
            return (string) $read->fetchColumn();
        };
        if (hash_equals($fingerprint, $current())) {
            return false;
        }

        $database = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
        $lockName = 'locus-schema-' . substr(hash('sha256', $database . ':' . $scope), 0, 48);
        $lock = $pdo->prepare('SELECT GET_LOCK(:name, 15)');
        $lock->execute(['name' => $lockName]);
        if ((int) $lock->fetchColumn() !== 1) {
            throw new RuntimeException('Database setup is in progress. Please try again shortly.');
        }
        try {
            // Another request may have completed setup while this one waited.
            if (hash_equals($fingerprint, $current())) {
                return false;
            }
            $migrate();
            $write = $pdo->prepare('INSERT INTO app_schema_versions (scope, fingerprint)
                VALUES (:scope, :fingerprint)
                ON DUPLICATE KEY UPDATE fingerprint = VALUES(fingerprint), applied_at = CURRENT_TIMESTAMP');
            $write->execute(['scope' => $scope, 'fingerprint' => $fingerprint]);
            return true;
        } finally {
            $release = $pdo->prepare('SELECT RELEASE_LOCK(:name)');
            $release->execute(['name' => $lockName]);
        }
    }
}
