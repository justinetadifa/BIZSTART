<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../app/bootstrap.php';

use App\Support\PropertyAssessmentService;
use App\Support\PropertyAssessment;
use App\Support\PropertyCatalog;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) {
        throw new RuntimeException("Assertion failed: $message");
    }
    $checks++;
};

echo "=== Running LOCUS-SF MCE / IAI Refactor Verification Suite ===\n";

// 1. Verify Taxonomy and Renaming
$criteriaLabels = PropertyCatalog::criteria();
$check(
    isset($criteriaLabels['economic_viability']) && $criteriaLabels['economic_viability'] === 'Land Valuation / Economic Context',
    'Criterion economic_viability must be renamed to Land Valuation / Economic Context'
);
$check(
    isset($criteriaLabels['nearby_businesses']) && $criteriaLabels['nearby_businesses'] === 'Economic Activity / Business Environment',
    'Criterion nearby_businesses must be renamed to Economic Activity / Business Environment'
);

// 2. Criteria Configuration and Weights sum = 100%
$defaultWeights = PropertyAssessmentService::getCriteriaWeights();
$check(count($defaultWeights) === 6, 'Must have 6 active criteria');
$check(abs(array_sum($defaultWeights) - 100.0) < 0.0001, 'Active weights must sum to exactly 100%');
$check($defaultWeights['spatial_accessibility'] === 20.0, 'Accessibility weight is 20%');
$check($defaultWeights['infrastructure_readiness'] === 20.0, 'Infrastructure weight is 20%');
$check($defaultWeights['economic_viability'] === 20.0, 'Economic weight is 20%');
$check($defaultWeights['zoning_compatibility'] === 15.0, 'Zoning weight is 15%');
$check($defaultWeights['nearby_businesses'] === 10.0, 'Business environment weight is 10%');
$check($defaultWeights['risk_constraints'] === 15.0, 'Risk weight is 15%');

// Weight sum validation failure check
$invalidWeights = $defaultWeights;
$invalidWeights['spatial_accessibility'] = 25.0; // sum = 105
$threw = false;
try {
    PropertyAssessmentService::validateWeights($invalidWeights);
} catch (DomainException | InvalidArgumentException $e) {
    $threw = true;
}
$check($threw, 'validateWeights must reject weights that do not sum to 100%');

// 3. Mathematical Consistency: IAI = Σ(Score * Weight / 100), No Double Counting
// Given scores (6 criteria):
// access: 90 (wt 20 -> 18)
// infra: 85 (wt 20 -> 17)
// econ: 78 (wt 20 -> 15.6)
// zoning: 100 (wt 15 -> 15)
// businesses: 80 (wt 10 -> 8)
// risk: 82 (wt 15 -> 12.3)
// Total = 18 + 17 + 15.6 + 15 + 8 + 12.3 = 85.9
$sampleScores = [
    'spatial_accessibility' => 90.0,
    'infrastructure_readiness' => 85.0,
    'economic_viability' => 78.0,
    'zoning_compatibility' => 100.0,
    'nearby_businesses' => 80.0,
    'risk_constraints' => 82.0,
];

$assessment = PropertyAssessmentService::evaluate([
    'scores' => $sampleScores,
    'zoning_status' => 'permitted',
]);

$check($assessment['status'] === 'complete', 'Valid permitted property must have status complete');
$check($assessment['iaiScore'] === 85.9, 'IAI composite score must equal exact weighted sum: 85.9');
$check($assessment['mceScore'] === 85.9, 'MCE score equals IAI score (not a separate competing score)');

// Check breakdown
$criteriaBreakdown = $assessment['criteria'];
$check(count($criteriaBreakdown) === 6, 'Breakdown must contain all 6 criteria');
$byKey = array_column($criteriaBreakdown, null, 'key');
$check($byKey['spatial_accessibility']['weighted_score'] === 18.0, 'Accessibility contribution is 18.0');
$check($byKey['infrastructure_readiness']['weighted_score'] === 17.0, 'Infra contribution is 17.0');
$check($byKey['economic_viability']['weighted_score'] === 15.6, 'Econ contribution is 15.6');

// 4. Zoning as Mandatory Eligibility Constraint
// Prohibited zoning check
$prohibitedAssessment = PropertyAssessmentService::evaluate([
    'scores' => $sampleScores,
    'zoning_status' => 'prohibited',
]);
$check($prohibitedAssessment['status'] === 'not_suitable', 'Prohibited zoning must set status to not_suitable');
$check($prohibitedAssessment['iaiScore'] === null, 'Prohibited zoning must withhold IAI (null)');
$check($prohibitedAssessment['mceScore'] === null, 'Prohibited zoning must withhold MCE (null)');
$check(!empty($prohibitedAssessment['reason']), 'Prohibited zoning must provide explanatory reason');
$check($prohibitedAssessment['eligibility']['zoning'] === 'prohibited', 'Eligibility zoning must be prohibited');

// Conditional zoning check
$conditionalAssessment = PropertyAssessmentService::evaluate([
    'scores' => $sampleScores,
    'zoning_status' => 'conditional',
]);
$check($conditionalAssessment['status'] === 'conditional', 'Conditional zoning must set status to conditional');
$check($conditionalAssessment['iaiScore'] === 85.9, 'Conditional zoning allows IAI computation');
$check(!empty($conditionalAssessment['note']), 'Conditional zoning must display city review note');

// Unverified / missing zoning check
$unverifiedAssessment = PropertyAssessmentService::evaluate([
    'scores' => $sampleScores,
    'zoning_status' => 'unverified',
]);
$check($unverifiedAssessment['status'] === 'incomplete', 'Unverified zoning must result in incomplete assessment');
$hasZoningMissing = false;
foreach ($unverifiedAssessment['missing_requirements'] as $req) {
    if (stripos($req, 'zoning') !== false || stripos($req, 'CLUP') !== false) {
        $hasZoningMissing = true;
        break;
    }
}
$check($hasZoningMissing, 'Missing requirements must list zoning validation');

// 5. Completeness Rule
// Missing required criterion (e.g. risk_constraints is null)
$incompleteScores = $sampleScores;
$incompleteScores['risk_constraints'] = null;
$incompleteAssessment = PropertyAssessmentService::evaluate([
    'scores' => $incompleteScores,
    'zoning_status' => 'permitted',
]);
$check($incompleteAssessment['status'] === 'incomplete', 'Missing criterion must produce incomplete status');
$check($incompleteAssessment['iaiScore'] === null, 'Missing criterion must withhold IAI score (null)');
$check($incompleteAssessment['assessmentComplete'] === false, 'assessmentComplete flag must be false');
$check(!empty($incompleteAssessment['missing_requirements']), 'Missing requirements list must be populated');

// 6. Policy Alignment is Separate from Physical Site Attractiveness
$policyAssessment = PropertyAssessmentService::evaluate([
    'scores' => $sampleScores,
    'zoning_status' => 'permitted',
    'is_priority' => true,
    'priority_sector' => 'IT-BPM',
]);
// Site IAI remains 85.9, not boosted by policy modifier
$check($policyAssessment['iaiScore'] === 85.9, 'Physical site IAI must NOT be boosted by priority sector');
$check($policyAssessment['policy_alignment']['priority_sector'] === true, 'Policy alignment records priority sector flag');
$check($policyAssessment['policy_alignment']['sector'] === 'IT-BPM', 'Policy alignment records sector name');

// 7. Sensitivity Analysis (Alternate Weight Scenarios)
// Scenario A: Provisional weights (already tested -> 85.9)
// Scenario B: Equal weights (100 / 6 = 16.6667% each)
$equalWeights = [];
foreach (array_keys($sampleScores) as $key) {
    $equalWeights[$key] = 100.0 / 6.0;
}
$scenarioB = PropertyAssessmentService::evaluate([
    'scores' => $sampleScores,
    'zoning_status' => 'permitted',
    'weights' => $equalWeights,
]);
// Average score = (90 + 85 + 78 + 100 + 80 + 82) / 6 = 515 / 6 = 85.833... -> rounded to 85.8
$check($scenarioB['status'] === 'complete', 'Scenario B evaluates successfully');
$check($scenarioB['iaiScore'] === 85.8, 'Scenario B produces mathematically expected equal-weighted composite score: 85.8');
$check(abs($scenarioB['assessmentWeights']['spatial_accessibility'] - (100.0 / 6.0)) < 0.001, 'Scenario B uses equal weights');

// 8. Normalization Helpers
// Distance normalization test: road <= 50m -> 100, <= 150m -> 85, <= 300m -> 70, > 300m -> 50
$check(PropertyAssessmentService::normalize('spatial_accessibility', 45) === 100.0, 'Road 45m normalizes to 100');
$check(PropertyAssessmentService::normalize('spatial_accessibility', 120) === 85.0, 'Road 120m normalizes to 85');
$check(PropertyAssessmentService::normalize('spatial_accessibility', 250) === 70.0, 'Road 250m normalizes to 70');
$check(PropertyAssessmentService::normalize('spatial_accessibility', 500) === 50.0, 'Road 500m normalizes to 50');

// Hazard susceptibility normalization test: None -> 100, Low -> 85, Moderate -> 60, High -> 25
$check(PropertyAssessmentService::normalize('risk_constraints', 'none') === 100.0, 'None/clear hazard normalizes to 100');
$check(PropertyAssessmentService::normalize('risk_constraints', 'low') === 85.0, 'Low hazard normalizes to 85');
$check(PropertyAssessmentService::normalize('risk_constraints', 'moderate') === 60.0, 'Moderate hazard normalizes to 60');
$check(PropertyAssessmentService::normalize('risk_constraints', 'high') === 25.0, 'High hazard normalizes to 25');

// 9. Delegated PropertyAssessment compatibility wrapper
$delegated = PropertyAssessment::evaluate($sampleScores, true, [
    'zoning_status' => 'permitted',
    'is_priority' => true,
    'priority_sector' => 'Agribusiness',
]);
$check($delegated['assessmentStatus'] === 'complete', 'Delegated evaluate returns complete');
$check($delegated['iaiScore'] === 85.9, 'Delegated evaluate matches IAI 85.9');;
$check($delegated['policyAlignment']['priority_sector'] === true, 'Delegated policy alignment preserved');

echo "All LOCUS-SF MCE / IAI Refactor checks passed successfully! (Total checks: $checks)\n";
