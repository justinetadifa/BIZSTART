<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';
require_once dirname(__DIR__) . '/app/Core/SchemaManager.php';

use App\Core\SchemaManager;
use App\Repositories\PropertyRepository;
use App\Support\AutomaticPropertyAssessment;
use App\Support\PropertyAssessmentService as MCE;
use App\Support\PropertyScreening;

// Run real SQL against an isolated database. Only MySQL's already-created DDL
// is skipped so the production migration's preservation path can execute.
$pdo = new class extends PDO {
    public function __construct() { parent::__construct('sqlite::memory:'); $this->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); }
    public function exec(string $statement): int|false {
        if (str_contains($statement, 'CREATE TABLE IF NOT EXISTS criteria_config')) { return 0; }
        return parent::exec($statement);
    }
};
$pdo->exec('CREATE TABLE criteria_config (id INTEGER PRIMARY KEY, criterion_key TEXT UNIQUE, display_name TEXT, weight REAL, is_active INTEGER, is_required INTEGER, scoring_method TEXT, validation_status TEXT, source_reference TEXT, description TEXT, sort_order INTEGER)');
$pdo->exec('CREATE TABLE audit_logs (id INTEGER PRIMARY KEY, actor_id INTEGER, action_type TEXT, entity_type TEXT, entity_id INTEGER, metadata TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)');
$insert = $pdo->prepare('INSERT INTO criteria_config (criterion_key,display_name,weight,is_active,is_required,scoring_method,validation_status,source_reference,description,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)');
foreach (MCE::DEFAULT_CRITERIA_CONFIG as $row) {
    $insert->execute([$row['criterion_key'], $row['display_name'], $row['weight'], (int) $row['is_active'], (int) $row['is_required'], $row['scoring_method'], $row['validation_status'], $row['source_reference'], $row['description'], $row['sort_order']]);
}
MCE::configureDatabase($pdo);
$checks = 0;
$check = static function (bool $ok, string $message) use (&$checks): void { if (!$ok) { throw new RuntimeException($message); } $checks++; };
$reject = static function (callable $call, string $message) use ($check): void {
    try { $call(); } catch (DomainException|PDOException|RuntimeException) { $check(true, $message); return; }
    $check(false, $message);
};
$baseline = MCE::baselineWeights();
$custom = array_replace($baseline, ['spatial_accessibility' => 40.0, 'infrastructure_readiness' => 10.0, 'nearby_businesses' => 10.0, 'risk_constraints' => 20.0]);
$repository = new PropertyRepository($pdo);
$normalize = new ReflectionMethod($repository, 'normalizePropertyPayload');
$normalize->setAccessible(true);
$payload = ['name' => 'Isolated live-weight fixture', 'property_type' => 'commercial', 'category' => 'Land',
    'price' => 1000000, 'land_area' => 100, 'land_area_unit' => 'sqm', 'lat' => 16.6159, 'lng' => 120.3209,
    'contactMode' => 'open_listing', 'road_access' => 'frontage', 'road_surface_passability' => 'paved', 'carriageway_width' => 8, 'distance_to_major_road' => 50];
$old = $normalize->invoke($repository, $payload);
$oldMeta = json_decode($old['automatic_assessment_json'], true, 512, JSON_THROW_ON_ERROR);
$originalVersion = MCE::publicWeightConfiguration()['version'];
$applied = MCE::applyWeights($custom, 'Prioritize access for new listings', 'Isolated test committee', null, $pdo, $originalVersion);
$check(MCE::weights() === $custom && MCE::weights($pdo) === $custom, 'All evaluation paths immediately use the same committed allocation.');
$public = MCE::publicWeightConfiguration();
$check(array_keys($public) === ['weights', 'version'] && $public['version'] === $applied['version'], 'The form receives the exact committed version without audit or identity details.');
SchemaManager::ensureCriteriaConfigTable($pdo);
$check(MCE::weights() === $custom, 'Repeated schema initialization preserves configured weights.');
$new = $normalize->invoke($repository, $payload);
$newMeta = json_decode($new['automatic_assessment_json'], true, 512, JSON_THROW_ON_ERROR);
$check($newMeta['configuration_version'] === $applied['version'], 'New property snapshots record the current configuration version.');
$check($newMeta['weighted_contributions']['spatial_accessibility'] === 40.0 && $newMeta['weight_configuration']['infrastructure_readiness'] === 10.0, 'New property calculations use the latest allocation at save time.');
$check($newMeta['criteriaDetails']['spatial_accessibility']['iai_contribution'] === 40.0 && $newMeta['criteriaDetails']['spatial_accessibility']['weight'] === 40.0, 'Detailed explanation agrees with the weighted score.');
$check($newMeta['iaiScore'] === null && !$newMeta['rank_eligible'], 'Weight changes never substitute for missing evidence.');
$unchanged = $normalize->invoke($repository, ['description' => 'Unrelated edit'], $old);
$check($unchanged['automatic_assessment_json'] === $old['automatic_assessment_json'], 'Unrelated edits preserve the original assessment snapshot.');
$oldPresented = AutomaticPropertyAssessment::presentStored(json_decode($old['assessment_json'], true), $oldMeta);
$check($oldPresented['weight_configuration']['spatial_accessibility'] === 25.0, 'Reloading an existing assessment retains its historical weights.');
$screeningProperty = ['lat' => $payload['lat'], 'lng' => $payload['lng'], 'parcel' => json_decode($new['parcel_json'], true), 'weight_configuration' => $newMeta['weight_configuration']];
$screening = PropertyScreening::fromProperty($screeningProperty);
$check($screening['criteria']['spatial_accessibility']['contribution'] === 40.0 && str_contains($screening['formula'], '40%'), 'Saved provisional screening and its formula use the snapshot allocation.');
$scores = array_combine(array_keys($baseline), [100, 0, 50, 25, 75]);
$evaluation = MCE::evaluate($scores, ['allow_scalar_completion' => true, 'zoning_status' => 'permitted']);
$check($evaluation['displayed_iai'] === 67.5, 'Independent weighted example: 100*.40 + 0*.10 + 50*.20 + 25*.10 + 75*.20 = 67.5.');
$blocked = MCE::evaluate($scores, ['allow_scalar_completion' => true, 'zoning_status' => 'prohibited']);
$check($blocked['displayed_iai'] === null && !$blocked['rank_eligible'], 'Custom weights never override prohibited zoning.');
$reject(fn () => MCE::applyWeights($baseline, 'Stale editor must not overwrite', 'Test reference', null, $pdo, $originalVersion), 'A stale editor cannot overwrite a newer configuration.');
$check(MCE::weights() === $custom, 'Stale save rejection leaves the current allocation unchanged.');
foreach ([-.01, .01] as $delta) {
    $reject(fn () => MCE::validateAdjustableWeights(array_replace($baseline, ['spatial_accessibility' => 25 + $delta])), 'Totals of 99.99% and 100.01% are rejected.');
}
foreach ([[25.001, 24.999], [4.999, 45.001], [60.001, 4.999]] as [$spatial, $infra]) {
    $reject(fn () => MCE::validateAdjustableWeights(array_replace($baseline, ['spatial_accessibility' => $spatial, 'infrastructure_readiness' => $infra])), 'Server rejects extra precision instead of silently rounding submitted weights.');
}
$reject(fn () => MCE::applyWeights($baseline, 'Adjustment without source', '', null, $pdo), 'A documented source must be supplied by the caller.');
$unknown = array_replace($baseline, ['spatial_accessibility' => 20.0, 'invented' => 5.0]);
$reject(fn () => MCE::validateAdjustableWeights($unknown), 'An unknown criterion cannot consume part of the 100%.');
$reject(fn () => MCE::validateAdjustableWeights($baseline + ['zoning_compatibility' => 'not numeric']), 'Malformed zoning input is rejected.');
$reject(fn () => MCE::validateAdjustableWeights($baseline + ['economic_viability' => 50]), 'Conflicting duplicate aliases cannot be silently ignored.');
$pdo->exec("CREATE TRIGGER fail_criterion BEFORE UPDATE ON criteria_config WHEN NEW.criterion_key = 'nearby_businesses' BEGIN SELECT RAISE(ABORT, 'synthetic storage failure'); END");
$reject(fn () => MCE::applyWeights($baseline, 'Test rollback mid-allocation', 'Test reference', null, $pdo), 'A failed criterion update cannot report success.');
$check(MCE::weights() === $custom && (int) $pdo->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn() === 1, 'Partial updates roll back together with the audit record.');
$pdo->exec('DROP TRIGGER fail_criterion');
$pdo->exec("CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs BEGIN SELECT RAISE(ABORT, 'synthetic audit failure'); END");
$reject(fn () => MCE::restoreBaseline('Restore with unavailable audit', null, $pdo), 'An audit persistence failure cannot report success.');
$check(MCE::weights() === $custom, 'Audit failure rolls back the weight change.');
$pdo->exec('DROP TRIGGER fail_audit');
$restore = MCE::restoreBaseline('Restore isolated baseline', null, $pdo, $applied['version']);
$check(MCE::weights() === $baseline && MCE::publicWeightConfiguration()['version'] === $restore['version'], 'Baseline restoration persists a new version with matching weights.');
$check(count(MCE::getWeightConfigurationDetails()['history']) === 2, 'Both successful changes remain in the audit history.');
MCE::configureDatabase(null);
echo "MCE live configuration: {$checks} checks passed; isolated SQLite only, no application database or cache writes.\n";
