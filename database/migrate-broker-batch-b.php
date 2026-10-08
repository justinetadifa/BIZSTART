<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Core/Database.php';
require_once dirname(__DIR__) . '/app/Core/BrokerSchemaManager.php';

use App\Core\BrokerSchemaManager;
use App\Core\Database;
use App\Core\SchemaManager;

$arguments = array_slice($argv, 1);
if (in_array('--help', $arguments, true)) {
    echo "Usage: php database/migrate-broker-batch-b.php [--dry-run|--apply]\n";
    echo "Adds private-document, reviewer, verification and mail schema without granting or verifying accounts.\n";
    exit;
}
if (array_diff($arguments, ['--dry-run', '--apply']) !== [] || count(array_unique($arguments)) > 1) {
    fwrite(STDERR, "Choose --dry-run or --apply.\n"); exit(2);
}
$apply = in_array('--apply', $arguments, true);
$config = require dirname(__DIR__) . '/app/config.php';
$db = $config['db'];
$db['auto_create'] = false;
try {
    // Bypass bootstrap, automatic seeding and unrelated legacy migrations.
    $pdo = (new Database($db))->pdo();
    foreach (['users', 'seller_profiles'] as $table) {
        if (!SchemaManager::tableExists($pdo, $table)) { throw new RuntimeException('Initialize the application schema before this migration.'); }
    }
    echo ($apply ? 'Batch B migration' : 'Batch B read-only inspection') . ': ' . $pdo->query('SELECT DATABASE()')->fetchColumn() . "\n";
    $expected = [
        'users' => ['email_verified_at', 'broker_review_authorized', 'session_version'],
        'seller_profiles' => ['prc_front_json', 'prc_back_json', 'application_revision'],
    ];
    $changes = [];
    foreach ($expected as $table => $columns) {
        foreach ($columns as $column) {
            if (!SchemaManager::columnExists($pdo, $table, $column)) { $changes[] = 'Add ' . $table . '.' . $column; }
        }
    }
    foreach (['broker_application_reviews', 'email_verification_tokens', 'broker_mail_outbox'] as $table) {
        if (!SchemaManager::tableExists($pdo, $table)) { $changes[] = 'Create ' . $table; }
    }
    if (SchemaManager::tableExists($pdo, 'email_verification_tokens') && !SchemaManager::columnExists($pdo, 'email_verification_tokens', 'email')) {
        $changes[] = 'Bind verification tokens to recipient email';
    }
    foreach ($changes as $change) { echo '  ' . $change . "\n"; }
    if ($changes === []) { echo "Batch B schema is current.\n"; }
    $missingDocs = SchemaManager::columnExists($pdo, 'seller_profiles', 'prc_front_json')
        ? ' AND (prc_front_json IS NULL OR prc_back_json IS NULL)' : '';
    echo 'Broker profiles requiring both ID images: ' . $pdo->query("SELECT COUNT(*) FROM seller_profiles WHERE seller_type = 'broker'" . $missingDocs)->fetchColumn() . "\n";
    echo "Existing email ownership and reviewer authority are not inferred. Approved records remain approved, but broker privileges require verified email and both private documents.\n";
    if (!$apply) { echo "No records changed. Use --apply for the listed schema changes.\n"; exit; }
    // Compare every pre-existing field, including assessment/formula payloads and timestamps.
    $snapshots = [];
    foreach (['users', 'seller_profiles', 'properties'] as $table) {
        if (!SchemaManager::tableExists($pdo, $table)) { continue; }
        $columns = $pdo->query('SHOW COLUMNS FROM ' . $table)->fetchAll(PDO::FETCH_COLUMN);
        $select = implode(',', array_map(static fn (string $column): string => '`' . $column . '`', $columns));
        $key = $table === 'seller_profiles' ? 'user_id' : 'id';
        $sql = 'SELECT ' . $select . ' FROM ' . $table . ' ORDER BY ' . $key;
        $rows = $pdo->query($sql)->fetchAll();
        $snapshots[$table] = ['sql' => $sql, 'count' => count($rows), 'hash' => hash('sha256', serialize($rows))];
    }
    BrokerSchemaManager::ensure($pdo);
    BrokerSchemaManager::ensure($pdo); // Re-running must be harmless.
    foreach ($snapshots as $table => $snapshot) {
        $rows = $pdo->query($snapshot['sql'])->fetchAll();
        if ($snapshot['hash'] !== hash('sha256', serialize($rows))) { throw new RuntimeException('Pre-existing ' . $table . ' fields changed during migration; investigate before proceeding.'); }
        echo 'Preserved ' . $snapshot['count'] . ' ' . $table . " records and their pre-existing fields.\n";
    }
    echo "Batch B schema applied. No accounts were automatically verified, blocked or granted reviewer access.\n";
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . "\n"); exit(1);
}
