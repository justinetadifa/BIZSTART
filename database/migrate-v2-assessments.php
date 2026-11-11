<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once dirname(__DIR__) . '/app/Core/Database.php';
require_once dirname(__DIR__) . '/app/Core/SchemaManager.php';
require_once dirname(__DIR__) . '/app/Core/V2SchemaManager.php';

use App\Core\Database;
use App\Core\SchemaManager;
use App\Core\V2SchemaManager;

$arguments = array_slice($argv, 1);
if (in_array('--help', $arguments, true)) {
    echo "Usage: php database/migrate-v2-assessments.php [--dry-run|--apply]\n";
    echo "Default is read-only inspection. --apply runs V2SchemaManager to add structured evidence, investor project profiles, and v2 evaluation schema.\n";
    exit;
}

if (array_diff($arguments, ['--dry-run', '--apply']) !== [] || (in_array('--dry-run', $arguments, true) && in_array('--apply', $arguments, true))) {
    fwrite(STDERR, "Choose --dry-run or --apply.\n");
    exit(2);
}

$apply = in_array('--apply', $arguments, true);
$config = require dirname(__DIR__) . '/app/config.php';
$databaseConfig = $config['db'];
$databaseConfig['auto_create'] = false;

try {
    $pdo = (new Database($databaseConfig))->pdo();
    $requirements = [
        'properties' => [
            'structured_facts_json',
            'v2_assessment_json',
            'v2_eligibility_status',
            'v2_iai_score',
        ],
    ];

    $pending = [];
    foreach ($requirements as $table => $columns) {
        if (!SchemaManager::tableExists($pdo, $table)) {
            $pending[] = 'Create table ' . $table;
            continue;
        }
        foreach ($columns as $column) {
            if (!SchemaManager::columnExists($pdo, $table, $column)) {
                $pending[] = 'Add ' . $table . '.' . $column;
            }
        }
    }

    foreach (['investor_project_profiles', 'v2_scoring_configurations', 'property_assessment_versions'] as $table) {
        if (!SchemaManager::tableExists($pdo, $table)) {
            $pending[] = 'Create table ' . $table;
        }
    }

    echo ($apply ? 'V2 Migration' : 'V2 Dry Run') . ' for ' . (string) $pdo->query('SELECT DATABASE()')->fetchColumn() . ":\n";
    foreach ($pending as $change) {
        echo '  ' . $change . "\n";
    }

    if ($pending === []) {
        echo "  V2 structured evidence and evaluation schema is already current.\n";
    }

    if (!$apply) {
        echo "Read-only inspection complete. Use --apply to execute migration.\n";
        exit;
    }

    V2SchemaManager::ensure($pdo);
    echo "Migration applied successfully.\n";
} catch (\Throwable $e) {
    fwrite(STDERR, "Migration failed: " . $e->getMessage() . "\n");
    exit(1);
}

