<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Core/Database.php';
require_once dirname(__DIR__) . '/app/Core/SchemaMigrationRunner.php';

use App\Core\Database;
use App\Core\SchemaMigrationRunner;

$config = require dirname(__DIR__) . '/app/config.php';
$pdo = (new Database($config['db']))->pdo();

// Only a unique metadata row and temporary files are changed by these tests.
if (($argv[1] ?? '') === '--worker') {
    $ran = SchemaMigrationRunner::run($pdo, $argv[2], [$argv[3]], static function () use ($argv): void {
        usleep(200000);
        file_put_contents($argv[4], "migration\n", FILE_APPEND | LOCK_EX);
    });
    echo $ran ? 'ran' : 'skipped';
    exit;
}

$checks = 0;
$check = static function (bool $ok, string $message) use (&$checks): void {
    if (!$ok) { throw new RuntimeException($message); }
    $checks++;
};
$nonce = bin2hex(random_bytes(8));
$scope = 'regression-' . $nonce;
$directory = sys_get_temp_dir() . '/locus-schema-' . $nonce;
mkdir($directory, 0700);
$source = $directory . '/schema.php';
$log = $directory . '/executions.txt';
$calls = 0;
$migration = static function () use (&$calls): void { $calls++; };
try {
    file_put_contents($source, 'revision-one');
    $check(SchemaMigrationRunner::run($pdo, $scope, [$source], $migration), 'A new source revision must run.');
    $check($calls === 1, 'Initial setup did not execute exactly once.');
    $check(!SchemaMigrationRunner::run($pdo, $scope, [$source], $migration), 'Unchanged source must skip setup.');
    $check($calls === 1, 'A repeated request re-executed migrations.');

    file_put_contents($source, 'revision-two');
    $check(SchemaMigrationRunner::run($pdo, $scope, [$source], $migration), 'Changed source must run even with identical file timestamps.');
    $check($calls === 2, 'Source changes did not execute exactly once.');

    file_put_contents($source, 'revision-three');
    try {
        SchemaMigrationRunner::run($pdo, $scope, [$source], static function (): void {
            throw new RuntimeException('Synthetic interrupted migration');
        });
        throw new RuntimeException('An interrupted migration was swallowed.');
    } catch (RuntimeException $error) {
        $check($error->getMessage() === 'Synthetic interrupted migration', 'The original migration error must propagate.');
    }
    $check(SchemaMigrationRunner::run($pdo, $scope, [$source], $migration), 'Failed setup must remain retryable and release its lock.');
    $check($calls === 3, 'Retry did not finish setup.');

    file_put_contents($source, 'revision-four');
    $workers = [];
    for ($i = 0; $i < 2; $i++) {
        $process = proc_open([PHP_BINARY, __FILE__, '--worker', $scope, $source, $log], [
            0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w'],
        ], $pipes, dirname(__DIR__));
        if (!is_resource($process)) { throw new RuntimeException('Cannot start concurrent migration worker.'); }
        fclose($pipes[0]);
        $workers[] = [$process, $pipes];
    }
    $outcomes = [];
    foreach ($workers as [$process, $pipes]) {
        $outcomes[] = stream_get_contents($pipes[1]); fclose($pipes[1]);
        $error = stream_get_contents($pipes[2]); fclose($pipes[2]);
        $check(proc_close($process) === 0, 'Concurrent setup failed: ' . $error);
    }
    sort($outcomes);
    $check($outcomes === ['ran', 'skipped'], 'Concurrent requests must apply one migration and reuse its result.');
    $check(count(file($log, FILE_IGNORE_NEW_LINES)) === 1, 'Concurrent callbacks executed more than once.');
    echo 'Schema migration runner: ' . $checks . " checks passed (including source changes, retry and concurrency).\n";
} finally {
    $cleanup = $pdo->prepare('DELETE FROM app_schema_versions WHERE scope = :scope');
    $cleanup->execute(['scope' => $scope]);
    foreach ([$source, $log] as $file) { if (is_file($file)) unlink($file); }
    rmdir($directory);
}
