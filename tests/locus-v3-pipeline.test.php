<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/AutomaticPropertyAssessment.php';

use App\Support\AssessmentEvidence;
use App\Support\AutomaticPropertyAssessment as Automatic;
use App\Support\PropertyAssessmentService as Assessment;
use App\Support\RiskConstraintsEngine as Risk;
use App\Support\ZoningRulesEngine as Zoning;

$checks = 0;
$check = static function (bool $ok, string $label) use (&$checks): void {
    if (!$ok) { throw new RuntimeException($label); }
    $checks++;
};
$root = dirname(__DIR__) . '/data/assessment/authentication';
$created = !is_dir($root);
if ($created) { mkdir($root, 0777, true); }
$record = 'synthetic-test-' . bin2hex(random_bytes(8)) . '.json';
$hash = hash('sha256', 'Synthetic protocol fixture; not an empirical property assessment.');
file_put_contents($root . '/' . $record, json_encode([
    'decision' => 'authenticated', 'evidence_sha256' => $hash, 'reviewed_by' => 'Synthetic test reviewer',
    'reviewed_at' => '2026-10-16T00:00:00Z', 'supporting_record' => 'Synthetic fixture only; no real agency approval.',
], JSON_THROW_ON_ERROR));
try {
    $evidence = ['source' => 'Synthetic evidence only', 'version' => 'fixture-v1', 'layer' => 'fixture',
        'sha256' => $hash, 'provenance_status' => 'authenticated', 'authentication_record' => $record];
    $check(AssessmentEvidence::authenticated($evidence), 'Recorded synthetic review authenticates its bound fixture hash.');
    $assertion = $evidence; unset($assertion['authentication_record']);
    $check(!AssessmentEvidence::authenticated($assertion), 'Agency, dates and hash alone cannot authenticate evidence.');
    $check(!AssessmentEvidence::authenticated(array_replace($evidence, ['sha256' => str_repeat('0', 64)])), 'Review must bind the evidence fingerprint.');

    $fixture = ['spatial_accessibility' => 100, 'infrastructure_readiness' => 100,
        'property_cost_market_competitiveness' => 85, 'economic_viability' => 85,
        'nearby_businesses' => 85, 'risk_constraints' => 100, 'zoning_compatibility' => 85];
    $check(Assessment::calculateIAI($fixture) === 94.8, 'Definitive arithmetic example: 94.75 rounds half-up to 94.8.');
    $sum = 0.0;
    foreach (Assessment::DEFAULT_WEIGHTS as $key => $weight) { $sum += Assessment::calculateWeightedScore($fixture[$key], $weight); }
    $check($sum === 94.75, 'Arithmetic sum retains 94.75 before display rounding.');
    $check(Assessment::calculateWeightedScore(88.888888, 15) === 88.888888 * 15 / 100, 'Intermediate contributions retain precision.');

    $raw = [
        'spatial_accessibility' => ['road_access' => 'frontage', 'road_surface_passability' => 'paved', 'carriageway_width' => 6, 'distance_to_major_road' => 100],
        'infrastructure_readiness' => ['electricity' => 'grid_reliable', 'water' => 'piped_reliable', 'internet' => 'fiber_reliable', 'drainage' => 'adequate_functional'],
        'economic_viability' => ['land_area' => 100, 'offered_space_scope' => 'entire_land', 'asking_price' => 1150000,
            'comparable_market_price' => 10000, 'comparable_unit' => 'PHP/m2', 'comparable_source' => 'Synthetic comparable evidence', 'comparables_suitable' => true],
        'nearby_businesses' => ['commercial_activity' => 85, 'complementary_businesses' => 85, 'competitive_pressure' => 85,
            'activity_anchors' => 85, 'proposed_activity' => 'retail_convenience', 'has_certified_benchmarks' => true, 'sufficient_source_data' => true,
            'business_radius_m' => 500, 'inventory_version' => 'synthetic-v1', 'coverage_complete' => true,
            'operating_status_evidence' => 'synthetic verified inventory', 'benchmark_rule_id' => 'synthetic-benchmark-v1'],
        'risk_constraints' => [], 'zoning_compatibility' => ['zoning_classification' => 'C-1'],
    ];
    foreach (Risk::SUBCRITERIA as $key => $_) { $raw['risk_constraints'][$key] = ['status' => 'outside_mapped_hazard', 'evidence' => [$evidence]]; }
    $details = [];
    foreach ($raw as $key => $value) {
        $details[$key] = ['raw' => $value, 'evidence' => [array_replace($evidence,
            ['scope' => 'criterion_observations', 'criterion' => $key, 'input_sha256' => AssessmentEvidence::inputHash($value)])]];
    }
    $details['zoning_compatibility']['evidence'] = [array_replace($evidence, ['scope' => 'zoning_district', 'district' => 'C-1', 'property_id' => 999001]), array_replace($evidence, ['scope' => 'zoning_rule', 'rule_version' => Zoning::VERSION, 'district' => 'C-1', 'activity' => 'retail_convenience'])];
    $registerClaims = static function (array $records) use ($root, $record): void {
        $review = json_decode(file_get_contents($root . '/' . $record), true);
        foreach ($records as $item) {
            $review['claims'][] = array_intersect_key($item, array_flip(['scope', 'criterion', 'input_sha256', 'district', 'property_id', 'activity', 'rule_version']));
        }
        file_put_contents($root . '/' . $record, json_encode($review, JSON_THROW_ON_ERROR));
    };
    foreach ($details as $detail) { $registerClaims($detail['evidence']); }
    $options = ['property_id' => 999001, 'proposed_activity' => 'retail_convenience', 'zoning_district' => 'C-1', 'criteria_details' => $details];
    $result = Assessment::evaluate($raw, $options);
    $check($result['assessmentStatus'] === 'complete', 'Fully evidenced synthetic observations complete under v3.');
    $check($result['criterion_scores']['economic_viability'] === 85.0, 'Existing comparable rubric evaluates a 15% premium at 85.');
    $check($result['unrounded_total'] === 94.75 && $result['displayed_iai'] === 94.8, 'Known five-criterion weighted calculation is 94.8.');
    $check($result['physical_subtotal'] === 94.75 && $result['physical_subtotal_max'] === 100.0, 'Physical subtotal is separate from scenario index.');
    $check($result['rank_eligible'] && $result['numerical_completeness'] && $result['evidence_completeness'], 'Completeness and eligibility are explicit.');
    $check($result['methodology_validation'] !== $result['evidence_completeness'], 'Methodology validation remains separate from evidence.');
    $coverageOnly = $options; $coverageOnly['criteria_details']['infrastructure_readiness']['evidence'] = [$evidence];
    $check(Assessment::evaluate([], $coverageOnly)['iaiScore'] === null, 'Authenticated service coverage cannot certify separately reported parcel connections.');
    $edited = $options; $edited['criteria_details']['spatial_accessibility']['raw']['carriageway_width'] = 3;
    $check(Assessment::evaluate([], $edited)['iaiScore'] === null, 'Changed observations cannot reuse an old authentication record.');
    $edited['criteria_details']['spatial_accessibility']['evidence'][0]['input_sha256'] = AssessmentEvidence::inputHash($edited['criteria_details']['spatial_accessibility']['raw']);
    $check(Assessment::evaluate([], $edited)['iaiScore'] === null, 'Changing an evidence fingerprint assertion does not manufacture a recorded review.');
    $wrongDistrict = $options; $wrongDistrict['criteria_details']['zoning_compatibility']['evidence'][0]['property_id'] = 999002;
    $check(Assessment::evaluate([], $wrongDistrict)['iaiScore'] === null, 'District authentication is bound to the assessed property.');
    foreach (['property_id', 'proposed_activity', 'protocol_version', 'dataset_versions', 'weight_configuration', 'weight_validation_status',
        'raw_criterion_inputs', 'measurement_units', 'scoring_rules', 'criterion_scores', 'subcriterion_scores', 'weighted_contributions',
        'eligibility', 'missing_requirements', 'review_reasons', 'unrounded_total', 'displayed_iai', 'assessed_at'] as $key) {
        $check(array_key_exists($key, $result), 'Contract field: ' . $key);
    }

    $unknown = $options; $unknown['criteria_details']['spatial_accessibility']['evidence'] = [$assertion];
    $unverified = Assessment::evaluate($raw, $unknown);
    $check($unverified['numerical_completeness'] && !$unverified['evidence_completeness'] && $unverified['iaiScore'] === null, 'Calculable scores do not imply verification.');
    $reported = Assessment::evaluate($fixture, ['zoning_district' => 'C-1', 'proposed_activity' => 'retail_convenience']);
    $check($reported['iaiScore'] === null && !$reported['evidence_completeness'], 'Direct numeric scores cannot substitute for observations.');
    $missing = $options; $missing['criteria_details']['spatial_accessibility']['raw'] = [];
    $check(Assessment::evaluate([], $missing)['iaiScore'] === null, 'Missing required criterion withholds total.');
    $partial = $options; unset($partial['criteria_details']['risk_constraints']['raw']['tsunami_exposure']);
    $partialResult = Assessment::evaluate([], $partial);
    $check($partialResult['iaiScore'] === null && $partialResult['criterion_scores']['risk_constraints'] === null, 'Missing hazard layer withholds risk and IAI.');
    $check(count($partialResult['subcriterion_scores']['risk_constraints']) === 6, 'Partial hazard findings retain six explicit evidence states.');
    $two = Risk::evaluate(['flood' => 'low', 'fault' => 'low']);
    $check($two['score'] === null && !$two['is_complete'], 'Flood/fault screening is not complete six-hazard assessment.');
    $faultOutside = Risk::evaluate(['fault' => 'outside_buffer']);
    $check(!$faultOutside['technical_review_hold'], 'Outside buffer does not accidentally match an intersection.');
    $unknownHazard = Risk::evaluate(['flood' => 'unknown_outside_coverage']);
    $check($unknownHazard['subcriteria']['flood_susceptibility']['score'] === null, 'Unknown containing outside text is never favorable.');
    $hold = $options; $hold['criteria_details']['risk_constraints']['raw']['active_fault']['status'] = 'within_fault_buffer';
    $held = Assessment::evaluate([], $hold);
    $check($held['technical_review_hold'] && $held['iaiScore'] === null && !$held['rank_eligible'], 'Critical hazard propagates visible hold and rank exclusion.');
    $check($held['hazardScreening']['technical_review_hold'] && !$held['hazardScreening']['validated'], 'Map-card hazard compatibility fields use the same review hold.');
    $check(!$partialResult['hazardScreening']['validated'], 'Partial hazard coverage cannot be labelled a validated map-card screening.');

    $prohibited = Assessment::evaluate($raw, array_replace($options, ['zoning_district' => 'R-1', 'proposed_activity' => 'ind_heavy_manufacturing']));
    $check($prohibited['assessmentStatus'] === 'not_suitable' && $prohibited['iaiScore'] === null && !$prohibited['rank_eligible'], 'Prohibited use cannot receive composite or rank.');
    $conditionalOptions = array_replace($options, ['zoning_district' => 'R-1', 'proposed_activity' => 'food_cafe']);
    $conditionalOptions['criteria_details']['nearby_businesses']['raw']['proposed_activity'] = 'food_cafe';
    $conditionalOptions['criteria_details']['zoning_compatibility']['evidence'][1]['district'] = 'R-1';
    $conditionalOptions['criteria_details']['zoning_compatibility']['evidence'][1]['activity'] = 'food_cafe';
    $conditionalOptions['criteria_details']['zoning_compatibility']['evidence'][0]['district'] = 'R-1';
    $conditionalOptions['criteria_details']['nearby_businesses']['evidence'][0]['input_sha256'] = AssessmentEvidence::inputHash($conditionalOptions['criteria_details']['nearby_businesses']['raw']);
    $registerClaims($conditionalOptions['criteria_details']['zoning_compatibility']['evidence']);
    $registerClaims($conditionalOptions['criteria_details']['nearby_businesses']['evidence']);
    $conditional = Assessment::evaluate([], $conditionalOptions);
    $check($conditional['assessmentStatus'] === 'conditional' && $conditional['iaiScore'] === 94.8, 'Conditional scenario retains explanatory index.');
    $check(!$conditional['rank_eligible'] && !$conditional['eligibility']['conditions_met'] && count($conditional['eligibility']['outstanding_requirements']) > 0, 'Conditional score does not clear requirements or create an actionable rank.');
    $unselected = Assessment::evaluate($raw, array_replace($options, ['proposed_activity' => '']));
    $check($unselected['iaiScore'] === null && $unselected['physical_subtotal'] === null, 'Unselected activity withholds final IAI and business-specific subtotal.');
    $check(Zoning::evaluate('unrecorded district', 'food_cafe')['score'] === null, 'Unknown district cannot assume C-1.');
    $check(Zoning::evaluate('C-1', 'possibly a cafe factory')['score'] === null, 'Similar activity words do not establish permission.');

    foreach ([-1, INF, NAN] as $invalid) {
        $spatial = $raw['spatial_accessibility']; $spatial['distance_to_major_road'] = $invalid;
        $check(Assessment::evaluateSpatialAccessibility($spatial)['score'] === null, 'Reject invalid road distance.');
    }
    $check(Assessment::evaluateSpatialAccessibility(['road_distance_m' => 1])['score'] === null, 'Road proximity never infers legal frontage.');
    $check(Assessment::evaluateInfrastructureReadiness('power_water_telecom')['score'] === null, 'Utility polygon label cannot supply parcel readiness.');
    $unconnected = $raw['infrastructure_readiness']; $unconnected['electricity'] = 'grid_unconnected';
    $check(Assessment::evaluateInfrastructureReadiness($unconnected)['score'] === 79.0, 'Detailed unconnected electricity differs from operational connection.');
    foreach (['wrong_keys', 'negative', 'infinite', 'wrong_sum', 'boolean', 'nonnumeric'] as $case) {
        $weights = Assessment::DEFAULT_WEIGHTS;
        if ($case === 'wrong_keys') { unset($weights['nearby_businesses']); $weights['invented'] = 10; }
        if ($case === 'negative') { $weights['nearby_businesses'] = -10; $weights['spatial_accessibility'] = 40; }
        if ($case === 'infinite') { $weights['nearby_businesses'] = INF; }
        if ($case === 'wrong_sum') { $weights['nearby_businesses'] = 11; }
        if ($case === 'boolean') { $weights['nearby_businesses'] = true; }
        if ($case === 'nonnumeric') { $weights['nearby_businesses'] = 'ten'; }
        $caught = false;
        try { Assessment::evaluate([], ['weights' => $weights]); } catch (DomainException) { $caught = true; }
        $check($caught, 'Reject invalid weight configuration: ' . $case);
    }
    $birOnly = Assessment::evaluateEconomicViability(['land_area' => 100, 'asking_price' => 1000000, 'bir_zonal_value' => 5000]);
    $check($birOnly['score'] === null && $birOnly['pricingAnalysis']['asking_price_per_sqm'] === 10000.0, 'Economic information without comparables remains descriptive.');
    $noPrice = $raw['economic_viability']; unset($noPrice['asking_price']);
    $check(Assessment::evaluateEconomicViability($noPrice, ['is_verified' => true])['score'] === null, 'Missing asking price cannot default to 0% market difference.');
    $badUnit = $raw['economic_viability']; $badUnit['comparable_unit'] = 'USD/m2';
    $check(Assessment::evaluateEconomicViability($badUnit, ['is_verified' => true])['score'] === null, 'Incompatible comparable units withhold score.');
    $boundary = $raw['economic_viability']; $boundary['asking_price'] = 1050040;
    $check(Assessment::evaluateEconomicViability($boundary, ['is_verified' => true])['score'] === 85.0, 'A 5.004% premium uses the unrounded comparison before the 5% rubric boundary.');
    $noInventory = $raw['nearby_businesses']; unset($noInventory['inventory_version']);
    $check(Assessment::evaluateNearbyBusinesses($noInventory, ['is_verified' => true])['score'] === null, 'Nearby scoring requires versioned complete inventory.');

    $custom = Assessment::DEFAULT_WEIGHTS; $custom['zoning_compatibility'] = 20; $custom['spatial_accessibility'] = 5;
    $customResult = Assessment::evaluate($raw, array_replace($options, ['weights' => $custom]));
    $check($customResult['physical_subtotal_max'] === 80.0 && $customResult['weighted_contributions']['zoning_compatibility'] === 20.0, 'Configured zoning weight supplies subtotal and contribution.');
    $check($customResult['comparison_key'] !== $result['comparison_key'], 'Different weights cannot share ranking cohort.');
    $preciseOptions = $options;
    $preciseOptions['criteria_details']['nearby_businesses']['raw']['commercial_activity'] = 85.001;
    $preciseOptions['criteria_details']['nearby_businesses']['evidence'][0]['input_sha256'] = AssessmentEvidence::inputHash($preciseOptions['criteria_details']['nearby_businesses']['raw']);
    $registerClaims($preciseOptions['criteria_details']['nearby_businesses']['evidence']);
    $precise = Assessment::evaluate([], $preciseOptions);
    $preciseRanks = Assessment::ranks([array_merge($result, ['id' => 1]), array_merge($precise, ['id' => 2])]);
    $check($precise['displayed_iai'] === $result['displayed_iai'] && $precise['unrounded_total'] > $result['unrounded_total']
        && $preciseRanks[2]['iaiRank'] === 1 && $preciseRanks[1]['iaiRank'] === 2, 'Ranking retains intermediate precision even when displayed totals tie.');
    $stored = array_merge($result, ['assessmentVersion' => Automatic::VERSION]);
    $presented = Automatic::presentStored($result['criterion_scores'], $stored);
    $check($presented['iaiScore'] === $result['iaiScore'] && $presented['assessed_at'] === $result['assessed_at'], 'Stored presentation uses same calculation and timestamp.');
    $badStored = $stored; $badStored['displayed_iai'] = 80;
    $mismatch = Automatic::presentStored($result['criterion_scores'], $badStored);
    $check($mismatch['discrepancy_detected'] && $mismatch['iaiScore'] === null && !$mismatch['rank_eligible'], 'Stored total discrepancy withholds score and rank.');
    $badAlias = $stored; $badAlias['mceScore'] = 80;
    $check(Automatic::presentStored($result['criterion_scores'], $badAlias)['iaiScore'] === null, 'Conflicting compatibility total aliases also require review.');
    $property = array_merge($stored, ['id' => 999001, 'name' => 'Synthetic protocol example', 'clupProfile' => ['zoningClassification' => 'C-1']]);
    $scenario = Automatic::scenario($property, 'retail_convenience');
    $check($scenario['iaiScore'] === $result['iaiScore'], 'Server scenario consumes same observations, evidence and weights.');
    $historicalMeta = ['assessmentVersion' => 'locus-auto-v1', 'iaiScore' => 93.3, 'generatedAt' => '2025-01-01T00:00:00Z'];
    $historic = Automatic::presentStored($fixture, $historicalMeta, ['snapshots' => [['original' => true]]]);
    $check($historic['historical_snapshot']['metadata'] === $historicalMeta && $historic['historical_snapshot']['assessmentCriteria'] === $fixture, 'Historical metadata and scores preserved exactly.');
    $check($historic['protocol_version'] === 'locus-auto-v1' && $historic['iaiScore'] === null && !$historic['rank_eligible'], 'Historical protocol cannot be mixed with v3 ranks.');

    $ranks = Assessment::ranks([
        array_merge($result, ['id' => 1]), array_merge($held, ['id' => 2]), array_merge($prohibited, ['id' => 3]),
        array_merge($conditional, ['id' => 4]), array_merge($customResult, ['id' => 5]), array_merge($historic, ['id' => 6]),
        array_merge($mismatch, ['id' => 7]), array_merge($unverified, ['id' => 8]),
    ]);
    $check($ranks[1]['iaiRank'] === 1 && $ranks[5]['iaiRank'] === 1 && $ranks[1]['rankComparisonKey'] !== $ranks[5]['rankComparisonKey'], 'Incompatible complete assessments rank in separate labelled cohorts.');
    foreach ([2, 3, 4, 6, 7, 8] as $id) { $check($ranks[$id]['iaiRank'] === null, 'Withhold ineligible rank: ' . $id); }

    $auto = Automatic::configured()->evaluate(['lat' => 16.61, 'lng' => 120.32, 'land_area' => 100, 'land_area_unit' => 'sqm']);
    $check($auto['iaiScore'] === null && !$auto['evidence_completeness'], 'Production source claims cannot establish a verified score.');
    $check($auto['protocol_version'] === Assessment::METHODOLOGY_VERSION, 'GIS observations feed the selected shared protocol.');
    $check(!empty($auto['raw_criterion_inputs']['spatial_accessibility']['road_distance_m']), 'Unverified mapped measurements remain available descriptively.');

    if (in_array('--json', $argv, true)) {
        echo json_encode(['complete' => $property, 'held' => $held, 'incomplete' => $partialResult, 'conditional' => $conditional,
            'historical' => $historic, 'discrepancy' => $mismatch, 'scenario' => $scenario, 'checks' => $checks], JSON_THROW_ON_ERROR);
    } else { echo "LOCUS v3 pipeline: {$checks} calculation and evidence checks passed. No database writes.\n"; }
} finally {
    unlink($root . '/' . $record);
    if ($created) { rmdir($root); }
}
