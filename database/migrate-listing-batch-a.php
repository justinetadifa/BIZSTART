<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once dirname(__DIR__) . '/app/Core/Database.php';
require_once dirname(__DIR__) . '/app/Core/SchemaManager.php';

use App\Core\Database;
use App\Core\SchemaManager;

$arguments = array_slice($argv, 1);
if (in_array('--help', $arguments, true)) {
    echo "Usage: php database/migrate-listing-batch-a.php [--dry-run|--apply]\n";
    echo "Reports existing zero prices and Batch A schema changes. Never converts zero prices or seeds records.\n";
    exit;
}
if (array_diff($arguments, ['--dry-run', '--apply']) !== [] || count(array_unique($arguments)) > 1) {
    fwrite(STDERR, "Choose --dry-run or --apply.\n");
    exit(2);
}
$apply = in_array('--apply', $arguments, true);
$config = require dirname(__DIR__) . '/app/config.php';
$db = $config['db'];
$db['auto_create'] = false;

try {
    // Do not bootstrap: inspection must not auto-migrate or seed the catalogue.
    $pdo = (new Database($db))->pdo();
    if (!SchemaManager::tableExists($pdo, 'properties')) {
        throw new RuntimeException('The properties table is missing. Initialize the application schema first.');
    }
    echo ($apply ? 'Batch A migration' : 'Batch A read-only inspection') . ': ' . $pdo->query('SELECT DATABASE()')->fetchColumn() . "\n";
    $zeros = $pdo->query('SELECT id, name, status FROM properties WHERE price = 0 ORDER BY id')->fetchAll();
    echo 'Existing zero-price records requiring human review: ' . count($zeros) . "\n";
    foreach ($zeros as $row) {
        echo '  ' . json_encode($row, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . "\n";
    }
    echo "Zero prices are preserved. Confirm their meaning with the record owner before any separate correction.\n";
    $expected = [
        'listing_purpose', 'lease_price', 'lease_period', 'lease_price_unit',
        'archived_at', 'archived_by_user_id',
    ];
    $pending = [];
    foreach ($expected as $column) {
        if (!SchemaManager::columnExists($pdo, 'properties', $column)) { $pending[] = 'Add properties.' . $column; }
    }
    $columns = $pdo->query("SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'properties' AND COLUMN_NAME IN ('price', 'price_per_sqm')")->fetchAll();
    foreach ($columns as $column) {
        if ($column['IS_NULLABLE'] !== 'YES') { $pending[] = 'Allow NULL for properties.' . $column['COLUMN_NAME']; }
        if ($column['COLUMN_NAME'] === 'price_per_sqm' && strtolower($column['DATA_TYPE']) !== 'bigint') { $pending[] = 'Widen properties.price_per_sqm to BIGINT'; }
    }
    $index = $pdo->query("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'properties' AND index_name = 'idx_properties_archived_at'")->fetchColumn();
    if ((int) $index === 0) { $pending[] = 'Add properties archive index'; }
    foreach ($pending as $change) { echo '  ' . $change . "\n"; }
    if ($pending === []) { echo "Batch A columns are current.\n"; }
    if (!$apply) { echo "No records changed. Use --apply to apply the listed schema changes.\n"; exit; }
    SchemaManager::ensureListingManagement($pdo);
    echo "Batch A schema applied. Existing prices, review states, availability, BIR values and assessment records were preserved.\n";
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . "\n");
    exit(1);
}
