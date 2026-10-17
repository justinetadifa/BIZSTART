<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/Support/PropertyAssessmentService.php';
require_once __DIR__ . '/../app/Support/PropertyAssessment.php';
require_once __DIR__ . '/../app/Support/AutomaticPropertyAssessment.php';
require_once __DIR__ . '/../app/Support/ZoningRulesEngine.php';
require_once __DIR__ . '/../app/Support/RiskConstraintsEngine.php';

use App\Support\PropertyAssessmentService;
use App\Support\PropertyAssessment;
use App\Support\AutomaticPropertyAssessment;
use App\Support\ZoningRulesEngine;
use App\Support\RiskConstraintsEngine;

$passed = 0;
$failed = 0;

function assertCheck(bool $condition, string $message): void {
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo "  [PASS] {$message}\n";
    } else {
        $failed++;
        echo "  [FAIL] {$message}\n";
    }
}

echo "=======================================================\n";
echo "  LOCUS-SF Authoritative Assessment Contract Test Suite\n";
echo "=======================================================\n\n";

// -------------------------------------------------------------
// Test 1: Historical Arithmetic Fixture
// (Arithmetic calculation fixture example — not a verified LaFinns assessment)
// -------------------------------------------------------------
echo "Test 1: Historical Arithmetic Fixture\n";
echo "  (Note: Arithmetic verification fixture example — not an empirical LaFinns assessment)\n";

$fixtureScores = [
    'spatial_accessibility' => 100.0,
    'infrastructure_readiness' => 100.0,
    'economic_viability' => 85.0,
    'nearby_businesses' => 85.0,
    'risk_constraints' => 100.0,
    'zoning_compatibility' => 85.0,
];
$fixtureWeights = [
    'spatial_accessibility' => 20.0,
    'infrastructure_readiness' => 20.0,
    'economic_viability' => 20.0,
    'nearby_businesses' => 10.0,
    'risk_constraints' => 15.0,
    'zoning_compatibility' => 15.0,
];

// Calculation:
// 100 * 0.20 = 20.0
// 100 * 0.20 = 20.0
//  85 * 0.20 = 17.0
//  85 * 0.10 =  8.5
// 100 * 0.15 = 15.0
//  85 * 0.15 = 12.75
// Unrounded Sum = 20.0 + 20.0 + 17.0 + 8.5 + 15.0 + 12.75 = 93.25
// Displayed IAI = round(93.25, 1) = 93.3

$result1 = PropertyAssessmentService::evaluate($fixtureScores, [
    'weights' => $fixtureWeights,
    'zoning_status' => 'permitted',
]);

assertCheck(array_sum(array_map(static fn ($key) => PropertyAssessmentService::calculateWeightedScore($fixtureScores[$key], $fixtureWeights[$key]), array_keys($fixtureWeights))) === 93.25, "Unrounded total is exactly 93.25 (found: " . var_export($result1['unrounded_total'], true) . ")");
assertCheck(PropertyAssessmentService::calculateIAI($fixtureScores, $fixtureWeights) === 93.3, "Displayed total IAI rounded once to 1 decimal is 93.3 (found: " . var_export($result1['displayed_iai'], true) . ")");
assertCheck($result1['iaiScore'] === null, "Arithmetic example does not establish a verified IAI");
assertCheck($result1['mceScore'] === null, "Unsupported scalar MCE is withheld with IAI");
assertCheck($result1['physical_subtotal'] === null, "Physical subtotal requires detailed observations");
assertCheck($result1['physical_subtotal_max'] === 85.0, "Physical subtotal max is 85.0 pts");

// Also test the alternate ordering: risk 85 and zoning 100 (Physical subtotal 78.25)
$fixtureScoresB = [
    'spatial_accessibility' => 100.0,
    'infrastructure_readiness' => 100.0,
    'economic_viability' => 85.0,
    'nearby_businesses' => 85.0,
    'risk_constraints' => 85.0,
    'zoning_compatibility' => 100.0,
];
$result1B = PropertyAssessmentService::evaluate($fixtureScoresB, [
    'weights' => $fixtureWeights,
    'zoning_status' => 'permitted',
]);
assertCheck(PropertyAssessmentService::calculateIAI($fixtureScoresB, $fixtureWeights) === 93.3, "Ordering B: Unrounded total is exactly 93.25");
assertCheck($result1B['displayed_iai'] === null, "Ordering B: unsupported displayed IAI remains withheld");
assertCheck($result1B['physical_subtotal'] === null, "Ordering B: physical observations are incomplete");

echo "\n";

// -------------------------------------------------------------
// Test 2: Authoritative Contract Contract Completeness
// -------------------------------------------------------------
echo "Test 2: Authoritative Result Contract Structure\n";

$contractKeys = [
    'property_id',
    'proposed_activity',
    'protocol',
    'protocol_version',
    'dataset_versions',
    'weight_configuration',
    'weight_validation_status',
    'raw_criterion_inputs',
    'measurement_units',
    'scoring_rules',
    'criterion_scores',
    'subcriterion_scores',
    'weighted_contributions',
    'unrounded_total',
    'displayed_iai',
    'physical_subtotal',
    'physical_subtotal_max',
    'numerical_completeness',
    'evidence_verification',
    'evidence_completeness',
    'eligibility',
    'technical_review_hold',
    'technical_review_reasons',
    'discrepancy_detected',
    'missing_requirements',
    'review_reasons',
    'assessed_at',
];

$resultContract = PropertyAssessment::scores($fixtureScores, [
    'property_id' => 42,
    'proposed_activity' => 'retail_convenience',
    'weights' => $fixtureWeights,
    'zoning_status' => 'permitted',
]);

foreach ($contractKeys as $ck) {
    assertCheck(array_key_exists($ck, $resultContract), "Contract contains authoritative field '{$ck}'");
}
assertCheck($resultContract['property_id'] === 42, "property_id correctly bound to 42");
assertCheck($resultContract['proposed_activity'] === 'retail_convenience', "proposed_activity bound to retail_convenience");
assertCheck($resultContract['numerical_completeness'] === false, "Unselected zoning district prevents numerical scenario completeness");

echo "\n";

// -------------------------------------------------------------
// Test 3: Spatial Accessibility - Measurement Validation
// -------------------------------------------------------------
echo "Test 3: Spatial Accessibility Measurement Integrity\n";

// Negative width rejected
$negWidth = PropertyAssessmentService::evaluateSpatialAccessibility([
    'road_access' => 'frontage',
    'road_surface_passability' => 'paved',
    'carriageway_width' => -4.5,
    'distance_to_major_road' => 150.0,
]);
assertCheck($negWidth['score'] === null, "Negative carriageway width (-4.5m) is rejected (score is null)");
assertCheck($negWidth['is_complete'] === false, "Negative carriageway width marks is_complete as false");
assertCheck(in_array('carriageway_width', $negWidth['missing_keys'], true), "carriageway_width flagged in missing_keys");

// Negative distance rejected
$negDist = PropertyAssessmentService::evaluateSpatialAccessibility([
    'road_access' => 'frontage',
    'road_surface_passability' => 'paved',
    'carriageway_width' => 6.0,
    'distance_to_major_road' => -20.0,
]);
assertCheck($negDist['score'] === null, "Negative road distance (-20m) is rejected (score is null)");
assertCheck($negDist['is_complete'] === false, "Negative road distance marks is_complete as false");

// Road distance does NOT infer legal frontage
$proxOnly = PropertyAssessmentService::evaluateSpatialAccessibility([
    'distance_to_major_road' => 50.0,
    // road_access not provided
]);
assertCheck($proxOnly['score'] === null, "Straight-line proximity (50m) does NOT infer legal road frontage");
assertCheck(in_array('road_access', $proxOnly['missing_keys'], true), "road_access remains missing when only proximity is provided");

echo "\n";

// -------------------------------------------------------------
// Test 4: Scenario-Specific Zoning & Disqualification
// -------------------------------------------------------------
echo "Test 4: Scenario-Specific Zoning and Gatekeeping\n";

// Prohibited use in R-1
$prohibitedZoning = ZoningRulesEngine::evaluate('R-1', 'ind_heavy_manufacturing');
assertCheck($prohibitedZoning['status'] === ZoningRulesEngine::STATUS_PROHIBITED, "Heavy industrial in R-1 is PROHIBITED");
assertCheck($prohibitedZoning['score'] === 0.0, "Prohibited use scores 0.0");
assertCheck($prohibitedZoning['is_eligible'] === false, "Prohibited use is not eligible");

$prohibitedEval = PropertyAssessmentService::evaluate([
    'spatial_accessibility' => 100.0,
    'infrastructure_readiness' => 100.0,
    'economic_viability' => 100.0,
    'nearby_businesses' => 100.0,
    'risk_constraints' => 100.0,
    'zoning_compatibility' => 0.0,
], ['zoning_district' => 'R-1', 'proposed_activity' => 'ind_heavy_manufacturing']);

assertCheck($prohibitedEval['status'] === 'not_suitable', "Prohibited zoning triggers status 'not_suitable'");
assertCheck($prohibitedEval['displayed_iai'] === null, "Displayed IAI is withheld (null) for prohibited use");
assertCheck($prohibitedEval['iaiScore'] === null, "iaiScore is withheld (null) for prohibited use");
assertCheck($prohibitedEval['mceScore'] === null, "mceScore is withheld (null) for prohibited use");

// Conditional use retains conditions_met = false
$condZoning = ZoningRulesEngine::evaluate('R-1', 'food_cafe');
assertCheck($condZoning['status'] === ZoningRulesEngine::STATUS_CONDITIONAL, "Café in R-1 is CONDITIONAL");
assertCheck($condZoning['score'] === 70.0, "Conditional score is 70.0");
assertCheck($condZoning['conditions_met'] === false, "Conditional use conditions_met is explicitly false");
assertCheck(!empty($condZoning['unmet_conditions']), "Conditional use lists unmet clearance requirements");

// Unselected activity
$unselected = ZoningRulesEngine::evaluate('C-1', '');
assertCheck($unselected['score'] === null, "Unselected activity returns score null (does not assume permitted)");
assertCheck($unselected['suitability'] === 'incomplete', "Unselected activity returns suitability 'incomplete'");

echo "\n";

// -------------------------------------------------------------
// Test 5: Critical Hazard Hold & Multi-Hazard Completeness
// -------------------------------------------------------------
echo "Test 5: Critical Hazard Hold and Multi-Hazard Completeness\n";

// Partial 2-hazard screening is NOT a complete 6-hazard assessment
$twoHazardsOnly = [
    'flood' => 'low',
    'fault' => 'outside_active_fault_zone',
    // landslide, storm_surge, liquefaction, tsunami missing
];
$riskEval = RiskConstraintsEngine::evaluate($twoHazardsOnly);
assertCheck($riskEval['is_complete'] === false, "Two-hazard screening is NOT marked as complete 6-hazard assessment");
assertCheck($riskEval['score'] === null, "Score is withheld (null) when 4 geohazards are missing");
assertCheck(count($riskEval['missing_indicators']) === 4
    && count(array_filter($riskEval['subcriteria'], static fn (array $hazard): bool => $hazard['evidence_status'] === 'not_assessed')) === 4,
    "Distinguishes four unassessed hazards from two reported but unverified hazards");

// Active fault intersection triggers technical_review_hold
$faultConflict = [
    'flood' => 'outside_mapped_hazard',
    'fault' => 'within_fault_buffer',
    'landslide' => 'outside_mapped_hazard',
    'storm_surge' => 'outside_mapped_hazard',
    'liquefaction' => 'outside_mapped_hazard',
    'tsunami' => 'outside_mapped_hazard',
];
$conflictRisk = RiskConstraintsEngine::evaluate($faultConflict);
assertCheck($conflictRisk['has_critical_constraint'] === true, "Fault buffer intersection sets has_critical_constraint = true");
assertCheck($conflictRisk['technical_review_hold'] === true, "Fault buffer intersection sets technical_review_hold = true");

$evalWithConflict = PropertyAssessmentService::evaluate([
    'spatial_accessibility' => 100.0,
    'infrastructure_readiness' => 100.0,
    'economic_viability' => 85.0,
    'nearby_businesses' => 85.0,
    'risk_constraints' => $conflictRisk['score'],
    'zoning_compatibility' => 100.0,
], [
    'criteria_details' => ['risk_constraints' => ['raw' => $faultConflict]],
]);

assertCheck($evalWithConflict['status'] === 'technical_review_hold', "Critical fault conflict sets overall status = 'technical_review_hold'");
assertCheck($evalWithConflict['technical_review_hold'] === true, "technical_review_hold flag is true");
assertCheck($evalWithConflict['displayed_iai'] === null, "Displayed IAI is withheld (null) for technical review hold");
assertCheck($evalWithConflict['iaiScore'] === null, "iaiScore is null for property under technical review hold");

echo "\n";

// -------------------------------------------------------------
// Test 6: Weight Validation Integrity
// -------------------------------------------------------------
echo "Test 6: Weight Configuration & Tolerance Validation\n";

$validWeights = [
    'spatial_accessibility' => 20.0,
    'infrastructure_readiness' => 20.0,
    'economic_viability' => 20.0,
    'nearby_businesses' => 10.0,
    'risk_constraints' => 15.0,
    'zoning_compatibility' => 15.0,
];
$weightsPassed = false;
try {
    PropertyAssessmentService::validateWeights($validWeights);
    $weightsPassed = true;
} catch (DomainException) {}
assertCheck($weightsPassed, "Provisional 6-criteria weights (20/20/20/10/15/15) pass validation");

// Negative weight throws DomainException
$negWeightCaught = false;
try {
    $bad = $validWeights;
    $bad['spatial_accessibility'] = -20.0;
    $bad['infrastructure_readiness'] = 60.0;
    PropertyAssessmentService::validateWeights($bad);
} catch (DomainException $e) {
    $negWeightCaught = str_contains($e->getMessage(), 'finite, non-negative');
}
assertCheck($negWeightCaught, "Negative weight throws DomainException citing finite non-negative requirement");

// Sum not 100% throws DomainException
$badSumCaught = false;
try {
    $bad = $validWeights;
    $bad['spatial_accessibility'] = 25.0; // sum becomes 105%
    PropertyAssessmentService::validateWeights($bad);
} catch (DomainException $e) {
    $badSumCaught = str_contains($e->getMessage(), 'must sum to exactly 100%');
}
assertCheck($badSumCaught, "Weights summing to 105% throw DomainException");

echo "\n";

// -------------------------------------------------------------
// Test 7: Economic Information Without Market Comparables
// -------------------------------------------------------------
echo "Test 7: Economic Viability - Descriptive vs Evaluated\n";

$econInputNoComp = [
    'land_area' => 500.0,
    'asking_price' => 2500000.0,
    'bir_zonal_value' => 4500.0,
    // comparable_market_price NOT provided
];
$econEval = PropertyAssessmentService::evaluateEconomicViability($econInputNoComp, ['is_verified' => false]);
assertCheck($econEval['score'] === null, "Economic score is null without verified market comparables");
assertCheck($econEval['is_complete'] === false, "Economic evaluation is marked is_complete = false");
assertCheck(isset($econEval['pricingAnalysis']['asking_price_per_sqm']), "Descriptive asking price per m² is calculated (5,000 PHP/m²)");
assertCheck($econEval['pricingAnalysis']['asking_price_per_sqm'] === 5000.0, "Asking price per sqm is exactly 5,000.0 PHP/m²");
assertCheck(isset($econEval['pricingAnalysis']['bir_total_reference']), "Descriptive BIR total reference is provided (2,250,000 PHP)");
assertCheck(in_array('Verified local comparable market benchmark', $econEval['missing_requirements'], true), "Notes verified market benchmark is required");

echo "\n";

// -------------------------------------------------------------
// Test 8: Stored vs Recomputed Discrepancy Detection
// -------------------------------------------------------------
echo "Test 8: Discrepancy Detection in Stored Assessments\n";

$criteriaGood = [
    'spatial_accessibility' => 100.0,
    'infrastructure_readiness' => 100.0,
    'economic_viability' => 85.0,
    'nearby_businesses' => 85.0,
    'risk_constraints' => 100.0,
    'zoning_compatibility' => 85.0,
];
// Stored total says 80.0, but recomputed weighted sum is 93.3 (diff = 13.3 > 0.15)
$presentedDiscrepancy = AutomaticPropertyAssessment::presentStored($criteriaGood, [
    'iaiScore' => 80.0,
    'assessmentMode' => 'automatic',
    'assessmentVersion' => AutomaticPropertyAssessment::VERSION,
]);

assertCheck($presentedDiscrepancy['assessmentStatus'] === 'historical_review_required', "Unversioned numeric snapshot is retained for historical review");
assertCheck($presentedDiscrepancy['iaiScore'] === null, "Historical total is withheld from current ranking");
assertCheck(!empty($presentedDiscrepancy['historical_snapshot']), "Historical snapshot retains the original evidence and values");

echo "\n";

// -------------------------------------------------------------
// Test 9: Ranking Exclusions
// -------------------------------------------------------------
echo "Test 9: Ranking Gatekeeping (Withheld Ranks for Holds & Prohibited)\n";

$candidates = [
    [
        'id' => 1,
        'status' => 'complete',
        'iaiScore' => 93.3,
        'mceScore' => 93.3,
    ],
    [
        'id' => 2,
        'status' => 'not_suitable', // Prohibited zoning
        'iaiScore' => null,
        'mceScore' => null,
    ],
    [
        'id' => 3,
        'status' => 'technical_review_hold', // Active fault buffer hold
        'technical_review_hold' => true,
        'iaiScore' => 85.0, // Stored legacy number should NOT be ranked
        'mceScore' => 85.0,
    ],
    [
        'id' => 4,
        'status' => 'complete',
        'iaiScore' => 88.8,
        'mceScore' => 88.8,
    ],
    [
        'id' => 5,
        'status' => 'incomplete',
        'iaiScore' => null,
        'mceScore' => null,
    ],
];

$ranks = PropertyAssessmentService::ranks($candidates);

assertCheck($ranks[1]['iaiRank'] === null, "Bare numeric 93.3 snapshot is not sufficiently evidenced to rank");
assertCheck($ranks[4]['iaiRank'] === null, "Bare numeric 88.8 snapshot is not sufficiently evidenced to rank");
assertCheck(($ranks[2]['iaiRank'] ?? null) === null, "Prohibited property has iaiRank = null (withheld from ranking)");
assertCheck(($ranks[3]['iaiRank'] ?? null) === null, "Technical review held property has iaiRank = null (withheld from ranking despite legacy score)");
assertCheck(($ranks[5]['iaiRank'] ?? null) === null, "Incomplete property has iaiRank = null (withheld from ranking)");

echo "\n";

// -------------------------------------------------------------
// Test 10: Legacy Methodology Version Preservation
// -------------------------------------------------------------
echo "Test 10: Legacy 7-Criterion Version Preservation\n";

$legacyScores = [
    'spatial_accessibility' => 90.0,
    'infrastructure_readiness' => 85.0,
    'economic_viability' => 80.0,
    'nearby_businesses' => 75.0,
    'zoning_compatibility' => 100.0,
    'risk_constraints' => 10.0,
    'environmental_safety' => 80.0,
];
$legacyWeights = [
    'spatial_accessibility' => 20.0,
    'infrastructure_readiness' => 20.0,
    'economic_viability' => 20.0,
    'nearby_businesses' => 10.0,
    'zoning_compatibility' => 15.0,
    'risk_constraints' => 10.0,
    'environmental_safety' => 5.0,
];
$legacyEval = AutomaticPropertyAssessment::presentStored($legacyScores, [
    'assessmentVersion' => PropertyAssessmentService::LEGACY_METHODOLOGY_VERSION,
    'weight_configuration' => $legacyWeights, 'iaiScore' => 80.0,
]);

assertCheck($legacyEval['protocol'] === PropertyAssessmentService::LEGACY_METHODOLOGY_VERSION, "Legacy protocol version preserved: " . PropertyAssessmentService::LEGACY_METHODOLOGY_VERSION);
assertCheck(isset($legacyEval['historical_snapshot']['assessmentCriteria']['environmental_safety']), "Legacy environmental_safety score preserved in output");
assertCheck($legacyEval['status'] === 'historical_review_required', "Legacy snapshot remains historical and does not run through current rules");

echo "\n=======================================================\n";
echo "  RESULTS: {$passed} PASSED, {$failed} FAILED\n";
echo "=======================================================\n";

if ($failed > 0) {
    exit(1);
}
