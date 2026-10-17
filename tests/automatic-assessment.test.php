<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/AutomaticPropertyAssessment.php';
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';
require_once dirname(__DIR__) . '/api/_listing-policy.php';

use App\Support\AutomaticPropertyAssessment as Automatic;
use App\Support\PropertyAssessment;
use App\Repositories\PropertyRepository;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void { if (!$condition) { throw new RuntimeException($message); } $checks++; };
$pending = static function (array $assessment, string $criterion) use ($check): void {
    $check($assessment['assessmentCriteria'][$criterion] === null && $assessment['mceScore'] === null && $assessment['iaiScore'] === null, 'Missing evidence must keep criterion and both totals null: ' . $criterion);
    $check($assessment['criteriaDetails'][$criterion]['missingData'] !== [], 'Missing evidence needs an actionable explanation: ' . $criterion);
};
$directory = sys_get_temp_dir() . '/locus-auto-test-' . bin2hex(random_bytes(8));
mkdir($directory);
$files = [];
$polygon = static fn (float $left, float $bottom, float $right, float $top): array => ['type' => 'Polygon', 'coordinates' => [[[$left, $bottom], [$right, $bottom], [$right, $top], [$left, $top], [$left, $bottom]]]];
$coverage = $polygon(120.2, 16.5, 120.4, 16.7);
$feature = static fn (array $geometry, array $properties = []): array => ['type' => 'Feature', 'geometry' => $geometry, 'properties' => $properties];
$writeLayer = static function (string $key, array $features) use ($directory, &$files, $coverage): array {
    $file = $key . '-' . bin2hex(random_bytes(4)) . '.geojson';
    $json = json_encode(['type' => 'FeatureCollection', 'features' => $features], JSON_THROW_ON_ERROR);
    file_put_contents($directory . '/' . $file, $json);
    $files[] = $directory . '/' . $file;
    return ['file' => $file, 'verified' => true, 'source' => 'SYNTHETIC TEST DATA ONLY', 'version' => 'fixture-v1',
        'reference' => 'Synthetic reference; not city evidence', 'verified_by' => 'Test runner', 'verified_at' => '2026-01-01',
        'sha256' => hash('sha256', $json), 'crs' => 'EPSG:4326', 'coverage' => $coverage, 'complete' => true];
};

try {
    $input = ['lat' => 16.61, 'lng' => 120.32, 'category' => 'Land', 'land_area' => 2500, 'land_area_unit' => 'sqm'];
    $config = ['data_directory' => $directory, 'business_radius_m' => 1000, 'layers' => [
        'roads' => $writeLayer('roads', [$feature(['type' => 'LineString', 'coordinates' => [[120.31, 16.61], [120.33, 16.61]]])]),
        'utilities' => $writeLayer('utilities', [$feature($coverage, ['utility_status' => 'power_water'])]),
        'valuation' => array_merge($writeLayer('valuation', [$feature($coverage, ['bir_value_sqm' => 3500, 'applicable_categories' => ['Land']])]), ['authority' => 'BIR', 'effective_date' => '2026-01-01']),
        'businesses' => $writeLayer('businesses', [$feature(['type' => 'Point', 'coordinates' => [120.321, 16.61]], ['operating_status' => 'operating']), $feature(['type' => 'Point', 'coordinates' => [120.322, 16.61]], ['operating_status' => 'closed'])]),
        'zoning' => $writeLayer('zoning', [$feature($coverage, ['zone' => 'Synthetic zone', 'conditional_categories' => ['Land']])]),
        'hazards' => array_merge($writeLayer('hazards', [$feature($coverage, ['hazard_type' => 'flood', 'hazard_status' => 'high'])]), ['hazard_types' => ['flood', 'fault']]),
    ], 'method' => ['approved' => true, 'version' => 'SYNTHETIC-fixture-v1', 'approval_reference' => 'SYNTHETIC TEST ONLY; not an approved city method', 'rules' => [
        'spatial_accessibility' => ['metric' => 'road_distance_m', 'operator' => 'bands', 'bands' => [['max' => 100, 'score' => 100]], 'otherwise' => 50],
        'infrastructure_readiness' => ['metric' => 'utility_status', 'operator' => 'lookup', 'values' => ['power_water' => 80]],
        'economic_viability' => ['metric' => 'bir_value_sqm', 'operator' => 'bands', 'bands' => [['max' => 5000, 'score' => 60]], 'otherwise' => 40],
        'nearby_businesses' => ['metric' => 'business_count', 'operator' => 'bands', 'bands' => [['max' => 1, 'score' => 40]], 'otherwise' => 70],
        'zoning_compatibility' => ['metric' => 'zoning_status', 'operator' => 'lookup', 'values' => ['conditional' => 20, 'permitted' => 100, 'prohibited' => 0]],
        'risk_constraints' => ['metric' => 'hazard_status', 'operator' => 'lookup', 'aggregate' => 'minimum', 'required_hazard_types' => ['flood', 'fault'], 'values' => ['high' => 0, 'low' => 20, 'outside_mapped_hazards' => 100]],
    ]]];
    $auto = (new Automatic($config))->evaluate($input);
    $check(!$auto['assessmentComplete'] && $auto['mceScore'] === null && $auto['iaiScore'] === null, 'Broad GIS measurements and asserted approvals cannot substitute for the detailed protocol.');
    // Test zoning prohibited constraint
    $prohibitedLayer = $writeLayer('zoning_prohibited', [$feature($coverage, ['zone' => 'Synthetic restricted zone', 'restricted_categories' => ['Land']])]);
    $prohibitedConfig = $config;
    $prohibitedConfig['layers']['zoning'] = $prohibitedLayer;
    $prohibitedAuto = (new Automatic($prohibitedConfig))->evaluate($input);
    $check($prohibitedAuto['eligibility']['zoning'] === 'unverified' && $prohibitedAuto['iaiScore'] === null, 'Category restrictions do not establish district-specific permission for an unselected activity.');
    $check($auto['inputs']['landArea'] === .25 && $auto['criteriaDetails']['economic_viability']['raw']['bir_total_value'] === 8750000.0, 'Square metres normalize to hectares and BIR reference total uses actual area.');
    $preciseArea = (new Automatic($config))->evaluate(array_replace($input, ['land_area' => 1.49]));
    $check($preciseArea['inputs']['landArea'] === .000149 && $preciseArea['criteriaDetails']['economic_viability']['raw']['bir_total_value'] === 5215.0, 'BIR total value uses the exact 1.49 square meters from parcel precision, not rounded legacy hectares.');
    $precision = Automatic::normalizeInputs(array_replace($input, ['lat' => 16.61000049, 'lng' => 120.32000051]));
    $check($precision['lat'] === 16.61 && $precision['lng'] === 120.320001, 'Preview coordinates must use the six decimal places persisted by the property schema.');
    $check($auto['criteriaDetails']['nearby_businesses']['raw']['business_count'] === 1, 'Closed points must not count as operating businesses.');
    $check($auto['criteriaDetails']['spatial_accessibility']['raw']['road_distance_m'] < 1, 'Point on mapped road should be within a metre of its great-circle centreline.');
    $check($auto['ruleVersion'] === \App\Support\PropertyAssessmentService::METHODOLOGY_VERSION && strlen($auto['dataset_versions']['roads']['sha256']) === 64 && count($auto['criteriaDetails']['zoning_compatibility']['evidence']) === 1, 'Evidence and approved method need reproducible fingerprints.');
    $check($auto['criterion_scores']['economic_viability'] === null && $auto['criterion_scores']['zoning_compatibility'] === null, 'BIR value and category tags cannot invent an economic or zoning score.');
    $posted = (new Automatic($config))->evaluate($input + ['assessmentCriteria' => array_fill_keys(array_keys(PropertyAssessment::WEIGHTS), 100), 'price' => 1, 'bir_value_sqm' => 1]);
    $check($posted['assessmentCriteria'] === $auto['assessmentCriteria'] && $posted['mceScore'] === null, 'Client scores, price and raw valuation cannot influence automatic scores.');
    $check(abs(Automatic::distance([0, 0], [90, 0]) - 10007557.221) < .001, 'Haversine quarter equator distance differs from independent spherical constant.');
    $check(abs(Automatic::segmentDistance([0, 1], [-1, 0], [1, 0]) - 111195.0802) < .01, 'Point-line cross-track distance is inaccurate.');
    $check(abs(Automatic::segmentDistance([2, 0], [-1, 0], [1, 0]) - Automatic::distance([2, 0], [1, 0])) < .001, 'Point outside segment must use nearest endpoint.');
    $check(Automatic::segmentDistance([0, 1], [0, 0], [0, 0]) === Automatic::distance([0, 1], [0, 0]), 'Degenerate segment must be handled.');
    $hole = $coverage; $hole['coordinates'][] = $polygon(120.31, 16.60, 120.33, 16.62)['coordinates'][0];
    $check(!Automatic::contains([120.32, 16.61], $hole) && Automatic::contains([120.3, 16.6], $hole), 'Polygon holes must exclude sites.');
    $check(Automatic::contains([120.2, 16.6], $coverage) && !Automatic::bufferCovered([120.2, 16.6], $coverage, 1), 'Boundary point belongs to polygon but does not cover a positive search radius.');
    $check(Automatic::contains([120.3, 16.7], $coverage) && !Automatic::bufferCovered([120.3, 16.7], $coverage, 1), 'A horizontal GeoJSON boundary cannot certify a positive search radius because its great-circle chord bows away.');
    $check(!Automatic::bufferCovered([120.3, 16.69999], $coverage, 2) && Automatic::bufferCovered([120.3, 16.69999], $coverage, 1), 'Coverage must measure the straight GeoJSON edge: a site about 1.11 m inside cannot cover a 2 m circle.');
    $multi = ['type' => 'MultiPolygon', 'coordinates' => [$coverage['coordinates'], $polygon(121, 17, 121.1, 17.1)['coordinates']]];
    $check(Automatic::contains([121.05, 17.05], $multi) && Automatic::bufferCovered([120.32, 16.61], $multi, 1000), 'MultiPolygon coverage must support containing parts and full buffers.');
    foreach (['lat' => INF, 'lng' => 181, 'land_area' => -1, 'category' => 'Unknown'] as $field => $invalid) {
        try { (new Automatic($config))->evaluate(array_replace($input, [$field => $invalid])); }
        catch (InvalidArgumentException) { $check(true, 'Invalid input rejected.'); continue; }
        throw new RuntimeException('Invalid spatial input was accepted: ' . $field);
    }
    $without = $config; $without['method']['approved'] = false;
    $out = (new Automatic($without))->evaluate($input);
    $check($out['completedCount'] === 0 && $out['mceScore'] === null && isset($out['raw_criterion_inputs']['spatial_accessibility']['road_distance_m']), 'Raw evidence may be ready while every unapproved conversion remains pending.');
    foreach (['version', 'approval_reference'] as $field) {
        $without = $config; $without['method'][$field] = '';
        $pending((new Automatic($without))->evaluate($input), 'spatial_accessibility');
    }
    $without = $config; $without['layers'] = [];
    $out = (new Automatic($without))->evaluate($input);
    $check($out['completedCount'] === 0 && $out['mceScore'] === null && $out['iaiScore'] === null, 'No configured layers must never create defaults.');
    foreach (array_keys($config['layers']) as $layerKey) {
        $without = $config; unset($without['layers'][$layerKey]);
        $criterion = ['roads' => 'spatial_accessibility', 'utilities' => 'infrastructure_readiness', 'valuation' => 'economic_viability', 'businesses' => 'nearby_businesses', 'zoning' => 'zoning_compatibility', 'hazards' => 'risk_constraints'][$layerKey];
        $pending((new Automatic($without))->evaluate($input), $criterion);
    }
    foreach ([['verified', false], ['sha256', str_repeat('0', 64)], ['version', ''], ['crs', 'EPSG:3857'], ['file', '../outside.geojson'], ['file', 'https://example.test/roads.geojson'], ['coverage', ['type' => 'Point', 'coordinates' => [120.32, 16.61]]]] as [$field, $value]) {
        $without = $config; $without['layers']['roads'][$field] = $value;
        $pending((new Automatic($without))->evaluate($input), 'spatial_accessibility');
    }
    $without = $config; $without['layers']['businesses']['complete'] = false;
    $out = (new Automatic($without))->evaluate($input); $pending($out, 'nearby_businesses');
    $check($out['criteriaDetails']['nearby_businesses']['raw']['observed_business_count'] === 1 && !isset($out['criteriaDetails']['nearby_businesses']['raw']['business_count']), 'Partial inventory exposes observed points but never a definitive density metric.');
    $without = $config; $without['layers']['businesses']['coverage'] = $polygon(120.319, 16.60, 120.33, 16.62);
    $pending((new Automatic($without))->evaluate($input), 'nearby_businesses');
    $without = $config; $without['layers']['hazards']['complete'] = false;
    $pending((new Automatic($without))->evaluate($input), 'risk_constraints');
    $without = $config; $without['layers']['hazards']['hazard_types'] = ['flood'];
    $pending((new Automatic($without))->evaluate($input), 'risk_constraints');
    $without = $config; $without['layers']['hazards'] = array_merge($writeLayer('hazards-empty', []), ['hazard_types' => ['flood', 'fault']]);
    $check((new Automatic($without))->evaluate($input)['assessmentCriteria']['risk_constraints'] === null, 'Empty flood/fault coverage cannot supply the missing four hazards.');
    $without['layers']['hazards']['complete'] = false; $pending((new Automatic($without))->evaluate($input), 'risk_constraints');
    $without = $config; $without['layers']['hazards'] = array_merge($writeLayer('hazards-overlap', [$feature($coverage, ['hazard_type' => 'flood', 'hazard_status' => 'high']), $feature($coverage, ['hazard_type' => 'fault', 'hazard_status' => 'low'])]), ['hazard_types' => ['flood', 'fault']]);
    $check((new Automatic($without))->evaluate($input)['technical_review_hold'] === true, 'Partial high-hazard findings propagate a hold without aggregating a full risk score.');
    unset($without['method']['rules']['risk_constraints']['aggregate']); $pending((new Automatic($without))->evaluate($input), 'risk_constraints');
    $without = $config; $without['layers']['valuation']['authority'] = 'asking price'; $pending((new Automatic($without))->evaluate($input), 'economic_viability');
    $without = $config; $without['layers']['valuation']['effective_date'] = ''; $pending((new Automatic($without))->evaluate($input), 'economic_viability');
    $without = $config; $without['layers']['utilities'] = $writeLayer('utilities-overlap', [$feature($coverage, ['utility_status' => 'power_water']), $feature($coverage, ['utility_status' => 'off_grid'])]);
    $pending((new Automatic($without))->evaluate($input), 'infrastructure_readiness');
    $without = $config; $without['method']['rules']['economic_viability']['bands'] = [['max' => 5000, 'score' => 60], ['max' => 4000, 'score' => 100]]; $pending((new Automatic($without))->evaluate($input), 'economic_viability');
    $without = $config; $without['method']['rules']['economic_viability']['bands'][0]['score'] = 101; $pending((new Automatic($without))->evaluate($input), 'economic_viability');
    $without = $config; unset($without['method']['rules']['infrastructure_readiness']['values']['power_water']); $pending((new Automatic($without))->evaluate($input), 'infrastructure_readiness');
    $outside = (new Automatic($config))->evaluate(array_replace($input, ['lat' => 18]));
    $check($outside['completedCount'] === 0, 'Outside verified coverage all criteria stay pending.');
    $wrongCategory = (new Automatic($config))->evaluate(array_replace($input, ['category' => 'Retail'])); $pending($wrongCategory, 'economic_viability'); $pending($wrongCategory, 'zoning_compatibility');
    $cicto = ['id' => 1, 'role' => 'admin', 'department' => 'CICTO'];
    $broker = ['id' => 3, 'role' => 'seller', 'name' => 'Test', 'email' => 'test@example.test', 'identityVerificationStatus' => 'verified'];
    foreach ([$cicto, $broker] as $user) {
        $payload = sfc_listing_payload(['assessmentCriteria' => [100], 'automaticAssessment' => $auto, 'automatic_assessment_json' => '{}', 'criteriaDetails' => [], 'recalculate_assessment' => true], $user, true);
        foreach (['assessmentCriteria', 'automaticAssessment', 'automatic_assessment_json', 'criteriaDetails'] as $field) {
            $check(!array_key_exists($field, $payload), 'Neither city nor broker requests can inject numeric criteria or metadata: ' . $field);
        }
        $check($payload['recalculate_assessment'] === ($user['role'] === 'admin'), 'Only city staff can explicitly request recalculation.');
    }
    // Exercise actual repository normalization without a database connection or persistent writes.
    $pdo = new class extends PDO { public function __construct() {} };
    $repository = new PropertyRepository($pdo);
    $normalize = new ReflectionMethod($repository, 'normalizePropertyPayload');
    $normalize->setAccessible(true);
    $base = ['name' => 'Synthetic test', 'property_type' => 'commercial', 'category' => 'Land', 'description' => 'Synthetic test data.', 'price' => 1000000,
        'land_area' => 2500, 'land_area_unit' => 'sqm', 'lat' => 16.61, 'lng' => 120.32, 'contactMode' => 'open_listing', 'approval_state' => 'pending_review'];
    $row = $normalize->invoke($repository, $base + ['assessmentCriteria' => array_fill_keys(array_keys(PropertyAssessment::WEIGHTS), 100), 'automatic_assessment_json' => json_encode($auto)]);
    $storedAuto = json_decode($row['automatic_assessment_json'], true);
    $check($row['area'] === .25 && $storedAuto['assessmentMode'] === 'automatic_observations' && $storedAuto['inputs']['landArea'] === .25, 'Repository normalizes area exactly like preview and generates its own metadata.');
    $check($storedAuto['criteriaDetails'] !== $auto['criteriaDetails'], 'Repository does not accept the posted synthetic automatic metadata.');
    $legacyCriteria = array_fill_keys(array_keys(PropertyAssessment::WEIGHTS), 80);
    $legacyRow = $row; $legacyRow['assessment_json'] = json_encode($legacyCriteria); $legacyRow['automatic_assessment_json'] = null; $legacyRow['legacy_assessment_json'] = null;
    $approval = $normalize->invoke($repository, ['approval_state' => 'approved', 'reviewNote' => 'Reviewed', 'assessmentCriteria' => array_fill_keys(array_keys(PropertyAssessment::WEIGHTS), 100)], $legacyRow);
    $check($approval['assessment_json'] === $legacyRow['assessment_json'] && $approval['automatic_assessment_json'] === null, 'Approval-only PATCH preserves manual history and ignores forged scores.');
    $recalculated = $normalize->invoke($repository, ['recalculate_assessment' => true], $legacyRow);
    $history = json_decode($recalculated['legacy_assessment_json'], true);
    $check((float) ($history['snapshots'][0]['assessmentCriteria']['property_cost_market_competitiveness'] ?? $history['snapshots'][0]['assessmentCriteria']['economic_viability'] ?? 0) === 80.0 && $recalculated['automatic_assessment_json'] !== null, 'Explicit recalculation stores historical manual criteria separately.');
    $changed = $normalize->invoke($repository, ['lat' => 16.62], $legacyRow);
    $check(json_decode($changed['automatic_assessment_json'], true)['inputs']['lat'] === 16.62 && $changed['legacy_assessment_json'] !== null, 'Changed coordinates recalculate from server and preserve manual history.');
    $changedAgain = $normalize->invoke($repository, ['land_area' => 5000, 'land_area_unit' => 'sqm'], $recalculated);
    $check(json_decode($changedAgain['legacy_assessment_json'], true)['snapshots'][0] === $history['snapshots'][0] && json_decode($changedAgain['automatic_assessment_json'], true)['inputs']['landArea'] === .5, 'Subsequent automatic recalculations preserve immutable manual history.');
    $unitOnly = $normalize->invoke($repository, ['land_area_unit' => 'sqm'], $legacyRow);
    $check($unitOnly['area'] === .25 && $unitOnly['automatic_assessment_json'] === null, 'An area-unit-only PATCH cannot divide existing hectares a second time.');
    $present = Automatic::presentStored($legacyCriteria);
    $check($present['assessmentMode'] === 'historical' && $present['historical_snapshot']['assessmentCriteria'] === $legacyCriteria && $present['mceScore'] === null, 'Historical manual score is explicitly labeled and remains available.');
    $present = Automatic::presentStored($auto['assessmentCriteria'], $auto, $history);
    $check($present['assessmentMode'] === 'automatic_observations' && $present['criteriaDetails'] === $auto['criteriaDetails'] && $present['legacyAssessment'] === $history && $present['mceScore'] === null, 'Hydration exposes authoritative evidence and retained manual history.');
    echo in_array('--json-fixture', $argv, true) ? json_encode(['assessment' => $auto], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE) : "Automatic assessment checks passed: $checks (synthetic layers; no database mutations).\n";
} finally {
    foreach ($files as $file) { if (is_file($file)) { unlink($file); } }
    rmdir($directory);
}
