<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/app/Support/ZoningRulesEngine.php';
require_once dirname(__DIR__) . '/app/Support/RiskConstraintsEngine.php';
require_once dirname(__DIR__) . '/app/Support/PropertyAssessment.php';
require_once dirname(__DIR__) . '/app/Support/PropertyCatalog.php';
require_once dirname(__DIR__) . '/app/Support/AssessmentEvidence.php';
require_once dirname(__DIR__) . '/app/Support/PropertyAssessmentService.php';

use App\Support\PropertyAssessmentService as Assessment;
use App\Support\ZoningRulesEngine as Zoning;

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

echo "====================================================================\n";
echo "LOCUS-SF MCE v3.0 — Five-Criterion Investment Attractiveness Model\n";
echo "Authoritative Mathematical & Screening Verification Test Suite\n";
echo "====================================================================\n\n";

// -------------------------------------------------------------------------
// TEST CASE A: Canonical MCE Calculation
// -------------------------------------------------------------------------
echo "--- TEST CASE A: Canonical MCE Calculation (80.8 / 100) ---\n";
$scoresA = [
    'spatial_accessibility' => 90.0,
    'infrastructure_readiness' => 80.0,
    'property_cost_market_competitiveness' => 75.0,
    'nearby_businesses' => 70.0,
    'risk_constraints' => 85.0,
];

// Verify weights configuration: 25/25/20/15/15, zoning 0.0
$weights = Assessment::DEFAULT_WEIGHTS;
assertCheck($weights['spatial_accessibility'] === 25.0, "Spatial Accessibility weight is 25.0%");
assertCheck($weights['infrastructure_readiness'] === 25.0, "Infrastructure Readiness weight is 25.0%");
assertCheck($weights['property_cost_market_competitiveness'] === 20.0, "Property Cost & Market Competitiveness weight is 20.0%");
assertCheck($weights['nearby_businesses'] === 15.0, "Nearby Businesses weight is 15.0%");
assertCheck($weights['risk_constraints'] === 15.0, "Risk Constraints weight is 15.0%");
assertCheck(($weights['zoning_compatibility'] ?? 0.0) === 0.0, "Zoning Compatibility weight in MCE is exactly 0.0%");

// Individual weighted contributions:
$cSA = Assessment::calculateWeightedScore($scoresA['spatial_accessibility'], 25.0);
$cIR = Assessment::calculateWeightedScore($scoresA['infrastructure_readiness'], 25.0);
$cPCMC = Assessment::calculateWeightedScore($scoresA['property_cost_market_competitiveness'], 20.0);
$cNB = Assessment::calculateWeightedScore($scoresA['nearby_businesses'], 15.0);
$cRC = Assessment::calculateWeightedScore($scoresA['risk_constraints'], 15.0);

assertCheck(abs($cSA - 22.50) < 1e-6, "SA contribution: 90.0 × 0.25 = 22.50 pts (got {$cSA})");
assertCheck(abs($cIR - 20.00) < 1e-6, "IR contribution: 80.0 × 0.25 = 20.00 pts (got {$cIR})");
assertCheck(abs($cPCMC - 15.00) < 1e-6, "PCMC contribution: 75.0 × 0.20 = 15.00 pts (got {$cPCMC})");
assertCheck(abs($cNB - 10.50) < 1e-6, "NB contribution: 70.0 × 0.15 = 10.50 pts (got {$cNB})");
assertCheck(abs($cRC - 12.75) < 1e-6, "RC contribution: 85.0 × 0.15 = 12.75 pts (got {$cRC})");

$totalA = $cSA + $cIR + $cPCMC + $cNB + $cRC;
assertCheck(abs($totalA - 80.75) < 1e-6, "Unrounded sum: 22.50 + 20.00 + 15.00 + 10.50 + 12.75 = 80.75 pts");

$roundedA = round($totalA, 1, PHP_ROUND_HALF_UP);
assertCheck($roundedA === 80.8, "Rounded total IAI (half-up to 1 decimal): 80.8 / 100 (got {$roundedA})");

$evalA = Assessment::evaluate($scoresA, [
    'allow_scalar_completion' => true,
    'zoning_status' => 'permitted',
    'proposed_activity' => 'retail_convenience',
    'zoning_district' => 'C-1',
]);
assertCheck($evalA['assessmentStatus'] === 'complete', "Assessment status is 'complete'");
assertCheck($evalA['rank_eligible'] === true, "Rank eligible is true");
assertCheck($evalA['displayed_iai'] === 80.8, "Evaluated displayed_iai is 80.8");
assertCheck($evalA['unrounded_total'] === 80.75, "Evaluated unrounded_total is 80.75");
assertCheck($evalA['weighted_contributions']['zoning_compatibility'] === null, "Zoning contribution is null (0.0% weight)");
assertCheck($evalA['physical_subtotal_max'] === 100.0, "Physical subtotal max is 100.0 pts");

// -------------------------------------------------------------------------
// TEST CASE B: Near-Optimal Site (92.5 / 100)
// -------------------------------------------------------------------------
echo "\n--- TEST CASE B: Near-Optimal Site (92.5 / 100) ---\n";
$scoresB = [
    'spatial_accessibility' => 100.0,
    'infrastructure_readiness' => 100.0,
    'property_cost_market_competitiveness' => 85.0,
    'nearby_businesses' => 85.0,
    'risk_constraints' => 85.0,
];

$cB_SA = Assessment::calculateWeightedScore($scoresB['spatial_accessibility'], 25.0);
$cB_IR = Assessment::calculateWeightedScore($scoresB['infrastructure_readiness'], 25.0);
$cB_PCMC = Assessment::calculateWeightedScore($scoresB['property_cost_market_competitiveness'], 20.0);
$cB_NB = Assessment::calculateWeightedScore($scoresB['nearby_businesses'], 15.0);
$cB_RC = Assessment::calculateWeightedScore($scoresB['risk_constraints'], 15.0);

assertCheck(abs($cB_SA - 25.00) < 1e-6, "Near-optimal SA: 100.0 × 0.25 = 25.00 pts");
assertCheck(abs($cB_IR - 25.00) < 1e-6, "Near-optimal IR: 100.0 × 0.25 = 25.00 pts");
assertCheck(abs($cB_PCMC - 17.00) < 1e-6, "Near-optimal PCMC: 85.0 × 0.20 = 17.00 pts");
assertCheck(abs($cB_NB - 12.75) < 1e-6, "Near-optimal NB: 85.0 × 0.15 = 12.75 pts");
assertCheck(abs($cB_RC - 12.75) < 1e-6, "Near-optimal RC: 85.0 × 0.15 = 12.75 pts");

$totalB = $cB_SA + $cB_IR + $cB_PCMC + $cB_NB + $cB_RC;
assertCheck(abs($totalB - 92.50) < 1e-6, "Near-optimal sum: 25.00 + 25.00 + 17.00 + 12.75 + 12.75 = 92.50 pts");
$roundedB = round($totalB, 1, PHP_ROUND_HALF_UP);
assertCheck($roundedB === 92.5, "Near-optimal displayed IAI: 92.5 / 100");

$evalB = Assessment::evaluate($scoresB, [
    'allow_scalar_completion' => true,
    'zoning_status' => 'permitted',
    'proposed_activity' => 'retail_convenience',
    'zoning_district' => 'C-1',
]);
assertCheck($evalB['assessmentStatus'] === 'complete', "Site B status is 'complete'");
assertCheck($evalB['rank_eligible'] === true, "Site B rank_eligible is true");
assertCheck($evalB['displayed_iai'] === 92.5, "Site B displayed_iai is 92.5");

// -------------------------------------------------------------------------
// TEST CASE C: Mandatory CLUP / Zoning Eligibility Gate Matrix
// -------------------------------------------------------------------------
echo "\n--- TEST CASE C: Zoning Eligibility Gate Matrix ---\n";

// 1. Permitted: complete, displayed_iai calculated, rank_eligible true
$evalC_Permitted = Assessment::evaluate($scoresA, [
    'allow_scalar_completion' => true,
    'zoning_status' => 'permitted',
    'proposed_activity' => 'retail_convenience',
    'zoning_district' => 'C-1',
]);
assertCheck($evalC_Permitted['assessmentStatus'] === 'complete', "1. Permitted -> status is 'complete'");
assertCheck($evalC_Permitted['displayed_iai'] === 80.8, "1. Permitted -> displayed_iai calculated (80.8)");
assertCheck($evalC_Permitted['rank_eligible'] === true, "1. Permitted -> rank_eligible is true");
assertCheck($evalC_Permitted['eligibility']['zoning'] === 'permitted', "1. Permitted -> eligibility.zoning is 'permitted'");

// 2. Conditional: conditional status, displayed_iai calculated, rank_eligible false (withheld)
$evalC_Conditional = Assessment::evaluate($scoresA, [
    'allow_scalar_completion' => true,
    'zoning_status' => 'conditional',
    'proposed_activity' => 'food_cafe',
    'zoning_district' => 'R-1',
]);
assertCheck($evalC_Conditional['assessmentStatus'] === 'conditional', "2. Conditional -> status is 'conditional'");
assertCheck($evalC_Conditional['displayed_iai'] === 80.8, "2. Conditional -> displayed_iai is calculated for advisory comparison (80.8)");
assertCheck($evalC_Conditional['rank_eligible'] === false, "2. Conditional -> rank_eligible is FALSE (withheld until cleared)");
assertCheck($evalC_Conditional['eligibility']['conditions_met'] === false, "2. Conditional -> eligibility.conditions_met is false");
assertCheck(!empty($evalC_Conditional['missing_requirements']), "2. Conditional -> outstanding conditions flagged in missing requirements");

// 3. Prohibited: not_suitable, displayed_iai null, rank_eligible false (non-compensatory gate)
$evalC_Prohibited = Assessment::evaluate($scoresA, [
    'allow_scalar_completion' => true,
    'zoning_status' => 'prohibited',
    'proposed_activity' => 'ind_heavy_manufacturing',
    'zoning_district' => 'R-1',
]);
assertCheck($evalC_Prohibited['assessmentStatus'] === 'not_suitable', "3. Prohibited -> status is 'not_suitable'");
assertCheck($evalC_Prohibited['iai'] === null, "3. Prohibited -> iai is NULL (non-compensatory gate)");
assertCheck($evalC_Prohibited['displayed_iai'] === null, "3. Prohibited -> displayed_iai is NULL");
assertCheck($evalC_Prohibited['rank_eligible'] === false, "3. Prohibited -> rank_eligible is FALSE");
assertCheck($evalC_Prohibited['eligibility']['is_eligible'] === false, "3. Prohibited -> eligibility.is_eligible is false");

// 4. Undetermined / Unverified: incomplete, displayed_iai null, rank_eligible false
$evalC_Undetermined = Assessment::evaluate($scoresA, [
    'allow_scalar_completion' => true,
    'zoning_status' => 'undetermined',
    'proposed_activity' => 'retail_convenience',
    'zoning_district' => 'Unknown',
]);
assertCheck($evalC_Undetermined['assessmentStatus'] === 'incomplete', "4. Undetermined -> status is 'incomplete'");
assertCheck($evalC_Undetermined['displayed_iai'] === null, "4. Undetermined -> displayed_iai is NULL");
assertCheck($evalC_Undetermined['rank_eligible'] === false, "4. Undetermined -> rank_eligible is FALSE");

// -------------------------------------------------------------------------
// TEST CASE D: Property Cost & Market Competitiveness (PCMC) Rubric & Lease
// -------------------------------------------------------------------------
echo "\n--- TEST CASE D: PCMC Unit Rent Calculation & Rubric ---\n";

// Subcase D1: Asking rent ₱250/m² vs benchmark ₱300/m²
// Deviation = (250 - 300) / 300 = -50 / 300 = -16.6667% (5% to 20% below benchmark)
// Rubric: 5% to 20% below benchmark -> 90.0 pts (highly competitive)
// Weighted contribution (20% weight) = 90.0 × 0.20 = 18.00 pts
$pcmcInputLease = [
    'listing_purpose' => 'lease',
    'land_area' => 500,
    'offered_space_scope' => 'entire_land',
    'lease_price' => 125000, // 125,000 / 500 = 250 PHP/m²/month
    'comparable_lease_price' => 300, // 300 PHP/m²/month
    'comparable_unit' => 'PHP/m2/month',
    'comparable_source' => 'Verified San Fernando Commercial Lease Comparables',
    'comparables_suitable' => true,
];

$pcmcRes = Assessment::evaluatePropertyCostMarketCompetitiveness($pcmcInputLease, ['is_verified' => true]);
assertCheck($pcmcRes['is_complete'] === true, "PCMC lease evaluation is complete");
assertCheck(abs(($pcmcRes['pricingAnalysis']['lease_price_per_sqm'] ?? 0.0) - 250.0) < 1e-4, "Asking unit rent is 250.0 PHP/m²");
assertCheck(abs(($pcmcRes['pricingAnalysis']['lease_vs_market_percent'] ?? 0.0) - (-16.67)) < 0.1, "Market deviation is ~ -16.67%");
assertCheck($pcmcRes['score'] === 90.0, "Score under 5-20% below rubric band is exactly 90.0 pts");

$pcmcContrib = Assessment::calculateWeightedScore($pcmcRes['score'], 20.0);
assertCheck(abs($pcmcContrib - 18.00) < 1e-6, "PCMC MCE contribution is 18.00 pts (90.0 × 0.20)");

// Subcase D2: Full Rubric Band Verification
$bands = [
    ['diff' => 0.0,   'expected' => 100.0, 'label' => 'At market (±5%)'],
    ['diff' => 4.0,   'expected' => 100.0, 'label' => '+4% above (±5%)'],
    ['diff' => -4.0,  'expected' => 100.0, 'label' => '-4% below (±5%)'],
    ['diff' => 10.0,  'expected' => 85.0,  'label' => '+10% above (5% to 15% above)'],
    ['diff' => 20.0,  'expected' => 70.0,  'label' => '+20% above (15% to 30% above)'],
    ['diff' => 35.0,  'expected' => 50.0,  'label' => '+35% above (>30% above)'],
    ['diff' => -10.0, 'expected' => 90.0,  'label' => '-10% below (5% to 20% below)'],
    ['diff' => -25.0, 'expected' => 75.0,  'label' => '-25% below (>20% below)'],
];

foreach ($bands as $b) {
    $benchmark = 10000.0;
    $askingPerSqm = $benchmark * (1.0 + ($b['diff'] / 100.0));
    $inputBand = [
        'land_area' => 100,
        'asking_price' => $askingPerSqm * 100,
        'comparable_market_price' => $benchmark,
        'comparable_unit' => 'PHP/m2',
        'comparable_source' => 'Test comparable source',
        'comparables_suitable' => true,
    ];
    $res = Assessment::evaluatePropertyCostMarketCompetitiveness($inputBand, ['is_verified' => true]);
    assertCheck($res['score'] === $b['expected'], "Rubric {$b['label']} scores {$b['expected']} pts (got {$res['score']})");
}

// Subcase D3: Missing benchmark -> Score null, status incomplete
$pcmcMissingBenchmark = [
    'land_area' => 500,
    'asking_price' => 5000000,
    'comparables_suitable' => false,
];
$pcmcMissingRes = Assessment::evaluatePropertyCostMarketCompetitiveness($pcmcMissingBenchmark, ['is_verified' => true]);
assertCheck($pcmcMissingRes['score'] === null, "Missing benchmark results in score = null");
assertCheck($pcmcMissingRes['is_complete'] === false, "Missing benchmark sets is_complete = false");

// -------------------------------------------------------------------------
// TEST CASE E: Backwards-Compatibility Alias Integrity
// -------------------------------------------------------------------------
echo "\n--- TEST CASE E: Backwards-Compatibility Alias Integrity ---\n";
// Ensure evaluateEconomicViability() returns identical results to evaluatePropertyCostMarketCompetitiveness()
$resViaEv = Assessment::evaluateEconomicViability($pcmcInputLease, ['is_verified' => true]);
assertCheck($resViaEv['score'] === $pcmcRes['score'], "evaluateEconomicViability() produces identical score (90.0)");
assertCheck(($resViaEv['methodology_version'] ?? '') === ($pcmcRes['methodology_version'] ?? ''), "Both methods use the definitive LOCUS-SF methodology");

echo "\n====================================================================\n";
echo "SUMMARY: {$passed} PASSED, {$failed} FAILED\n";
echo "====================================================================\n";

if ($failed > 0) {
    exit(1);
}
exit(0);
