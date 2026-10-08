<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once dirname(__DIR__) . '/app/Core/Database.php';
require_once dirname(__DIR__) . '/app/Core/SchemaManager.php';

use App\Core\Database;
use App\Core\SchemaManager;

$arguments = array_slice($argv, 1);
if (in_array('--help', $arguments, true)) {
    echo "Usage: php database/migrate-city-workspaces.php [--dry-run|--apply]\n";
    echo "Default is read-only inspection. --apply runs the existing idempotent SchemaManager without demo seeding.\n";
    exit;
}
if (array_diff($arguments, ['--dry-run', '--apply']) !== [] || (in_array('--dry-run', $arguments, true) && in_array('--apply', $arguments, true))) {
    fwrite(STDERR, "Choose --dry-run or --apply.\n");
    exit(2);
}
$apply = in_array('--apply', $arguments, true);
$config = require dirname(__DIR__) . '/app/config.php';
// Avoid bootstrap.php: a dry run must not auto-create, migrate or seed.
$databaseConfig = $config['db'];
$databaseConfig['auto_create'] = false;

try {
    $pdo = (new Database($databaseConfig))->pdo();
    $requirements = [
        'site_metrics' => ['metric', 'value', 'updated_at'],
        'users' => ['department', 'first_name', 'last_name', 'account_status', 'phone', 'address_line', 'city', 'profession', 'adult_confirmed_at', 'profile_image_url', 'privacy_consent_at', 'privacy_consent_version', 'privacy_consent_text'],
        'seller_profiles' => ['prc_registration_no', 'prc_canonical_no', 'prc_valid_until', 'application_status', 'review_notes', 'reviewed_by_user_id'],
        'properties' => ['category', 'subcategory', 'assessment_json', 'automatic_assessment_json', 'legacy_assessment_json', 'assessment_tags_json', 'nearby_properties_json', 'contact_mode', 'contact_broker_user_id', 'review_note', 'created_by_user_id'],
    ];
    $pending = [];
    foreach ($requirements as $table => $columns) {
        if (!SchemaManager::tableExists($pdo, $table)) { $pending[] = 'Create table ' . $table; continue; }
        foreach ($columns as $column) {
            if (!SchemaManager::columnExists($pdo, $table, $column)) { $pending[] = 'Add ' . $table . '.' . $column; }
        }
    }
    $index = $pdo->prepare("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'seller_profiles' AND index_name = 'uniq_seller_profiles_prc' AND non_unique = 0");
    $index->execute();
    if ((int) $index->fetchColumn() === 0) { $pending[] = 'Add unique broker PRC index'; }
    $index = $pdo->prepare("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'seller_profiles' AND index_name = 'uniq_seller_profiles_prc_canonical' AND non_unique = 0");
    $index->execute();
    if ((int) $index->fetchColumn() === 0) { $pending[] = 'Add unique canonical broker PRC index'; }
    if (SchemaManager::columnExists($pdo, 'seller_profiles', 'prc_registration_no')) {
        $duplicates = (int) $pdo->query("SELECT COUNT(*) FROM (SELECT CASE WHEN prc_registration_no REGEXP '^[0-9]{1,20}$' THEN COALESCE(NULLIF(TRIM(LEADING '0' FROM prc_registration_no), ''), '0') ELSE prc_registration_no END AS canonical FROM seller_profiles WHERE prc_registration_no IS NOT NULL GROUP BY canonical HAVING COUNT(*) > 1) AS duplicates")->fetchColumn();
        if ($duplicates > 0) { throw new RuntimeException('Duplicate PRC registrations require review before migration. No records were changed.'); }
    }
    if (SchemaManager::tableExists($pdo, 'users')) {
        $normalize = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND (department IS NULL OR TRIM(department) = '' OR department = 'City Planning and Development Office (CPDO)')")->fetchColumn();
        if ($normalize > 0) { $pending[] = 'Normalize ' . $normalize . ' legacy administrator department(s) to CICTO'; }
    }
    echo ($apply ? 'Migration' : 'Dry run') . ' for ' . (string) $pdo->query('SELECT DATABASE()')->fetchColumn() . ":\n";
    foreach ($pending as $change) { echo '  ' . $change . "\n"; }
    if ($pending === []) { echo "  City workspace columns and PRC index are current.\n"; }
    if (!$apply) { echo "Read-only inspection complete. Use --apply to run SchemaManager.\n"; exit; }
    SchemaManager::ensure($pdo);
    echo "SchemaManager completed. Listings, accounts, consent and PRC credentials were not seeded or cleared.\n";
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}
