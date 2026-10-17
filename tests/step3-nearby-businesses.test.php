<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/app/Support/PropertyAssessmentService.php';
require_once dirname(__DIR__) . '/app/Support/PropertyAssessment.php';

use App\Support\PropertyAssessmentService;
use App\Support\PropertyAssessment;

$passed = 0;
$total = 0;

function assertTest(bool $condition, string $message): void {
    global $passed, $total;
    $total++;
    if (!$condition) {
        echo "❌ FAIL: {$message}\n";
        throw new RuntimeException("Assertion failed: {$message}");
    }
    echo "✅ PASS: {$message}\n";
    $passed++;
}

echo "=== LOCUS-SF Step 3 Nearby Businesses Backend Unit Tests ===\n\n";

$service = new PropertyAssessmentService();

// 1. Methodology & Subcriteria Configuration
assertTest(
    defined('App\Support\PropertyAssessmentService::NEARBY_BUSINESSES_SUBCRITERIA'),
    'NEARBY_BUSINESSES_SUBCRITERIA constant is defined'
);

$subcrit = PropertyAssessmentService::NEARBY_BUSINESSES_SUBCRITERIA;
assertTest(count($subcrit) === 4, 'Exactly 4 subcriteria configured for Nearby Businesses');
assertTest(isset($subcrit['commercial_activity']) && $subcrit['commercial_activity']['weight'] === 25.0, 'Commercial Activity subcriterion is 25%');
assertTest(isset($subcrit['complementary_businesses']) && $subcrit['complementary_businesses']['weight'] === 30.0, 'Complementary Businesses subcriterion is 30%');
assertTest(isset($subcrit['competitive_pressure']) && $subcrit['competitive_pressure']['weight'] === 30.0, 'Competitive Pressure subcriterion is 30%');
assertTest(isset($subcrit['activity_anchors']) && $subcrit['activity_anchors']['weight'] === 15.0, 'Activity Anchors subcriterion is 15%');

$sumWeights = array_sum(array_column($subcrit, 'weight'));
assertTest(abs($sumWeights - 100.0) < 0.0001, 'Internal subcriteria weights sum to exactly 100%');

assertTest(
    str_contains(PropertyAssessmentService::NEARBY_BUSINESSES_VERSION, 'Provisional'),
    'NEARBY_BUSINESSES_VERSION indicates Provisional status'
);

assertTest(
    str_contains(PropertyAssessmentService::NEARBY_VALIDATION_STATUS, 'BPLO Commercial Census Benchmarks'),
    'NEARBY_VALIDATION_STATUS states awaiting BPLO Commercial Census Benchmarks'
);

// 2. MCE Weight Verification
assertTest(
    PropertyAssessment::WEIGHTS['nearby_businesses'] === 10,
    'Nearby businesses weight is preserved at exactly 10% of overall MCE'
);

// 3. Provisional / Missing Benchmarks Handling (Must NOT Invent Numerical Thresholds)
$unbenchmarkedInput = [
    'business_type' => 'cafe',
    'mapped_count' => 40,
    'competitors_count' => 9,
    'complementary_count' => 25,
    'roads_count' => 12,
];
$eval = $service->evaluateNearbyBusinesses($unbenchmarkedInput);

assertTest($eval['is_complete'] === false, 'Assessment is incomplete without certified commercial benchmarks');
assertTest($eval['score'] === null, 'Score is strictly null (not an invented 70 or 85) without benchmarks');
assertTest($eval['iai_contribution'] === null, 'IAI contribution is null when score is incomplete');
assertTest($eval['status_label'] === 'Assessment Incomplete', 'Status label is Assessment Incomplete');
assertTest(str_contains($eval['missing_requirements'][0], 'BPLO') && str_contains($eval['missing_requirements'][0], 'benchmarks'), 'Missing requirements notes BPLO commercial benchmarks requirement');
assertTest(isset($eval['disclaimer']), 'Includes methodological disclaimer');

// 4. Certified Benchmarks Evaluation (10% Contribution: Score * 0.10)
$benchmarkedInput = [
    'business_type' => 'cafe',
    'mapped_count' => 40,
    'competitors_count' => 9,
    'complementary_count' => 25,
    'benchmarks' => [
        'commercial_activity' => 80.0,
        'complementary_businesses' => 90.0,
        'competitive_pressure' => 70.0,
        'activity_anchors' => 80.0,
    ],
    'is_verified' => true,
];
$benchEval = $service->evaluateNearbyBusinesses($benchmarkedInput);

assertTest($benchEval['is_complete'] === true, 'Assessment is complete when certified benchmarks are provided');
// Expected score: 80*0.25 + 90*0.30 + 70*0.30 + 80*0.15 = 20 + 27 + 21 + 12 = 80.0
assertTest($benchEval['score'] === 80.0, 'Calculates exact normalized score: 80.0 / 100');
// 80.0 * 0.10 = 8.00 pts
assertTest($benchEval['iai_contribution'] === 8.00, 'IAI contribution is exactly 8.00 pts (80.0 * 0.10)');
assertTest($benchEval['status_label'] === 'Verified Benchmark Score', 'Status label is Verified Benchmark Score');
assertTest($benchEval['subcriteria']['commercial_activity']['score'] === 80.0, 'Commercial Activity subcriterion score is 80.0');
assertTest($benchEval['subcriteria']['complementary_businesses']['score'] === 90.0, 'Complementary Businesses subcriterion score is 90.0');
assertTest($benchEval['subcriteria']['competitive_pressure']['score'] === 70.0, 'Competitive Pressure subcriterion score is 70.0');
assertTest($benchEval['subcriteria']['activity_anchors']['score'] === 80.0, 'Activity Anchors subcriterion score is 80.0');

// 5. Scalar Score Input Compatibility
$scalarEval = $service->evaluateNearbyBusinesses(85.0);
assertTest($scalarEval['is_complete'] === true, 'Scalar score evaluates to complete');
assertTest($scalarEval['score'] === 85.0, 'Scalar score preserved at 85.0');
assertTest($scalarEval['iai_contribution'] === 8.50, 'Scalar score 85.0 contributes 8.50 pts (85 * 0.10)');

// 6. Normalization & Evaluation Integration
$normFloat = $service->normalizeCriterion('nearby_businesses', $benchmarkedInput);
assertTest($normFloat === 80.0, 'normalizeCriterion returns 80.0 float score');

$normScores = PropertyAssessmentService::normalize(['nearby_businesses' => $benchmarkedInput]);
assertTest($normScores['nearby_businesses'] === 80.0, 'normalize() maps nearby_businesses to 80.0');

$evalResult = PropertyAssessmentService::evaluate(['nearby_businesses' => $benchmarkedInput]);
assertTest($evalResult['assessmentCriteria']['nearby_businesses'] === null, 'Scenario-free nearby observations cannot establish an activity-specific score');
$nearbyCriterion = array_values(array_filter($evalResult['criteria'], fn($c) => $c['key'] === 'nearby_businesses'))[0] ?? null;
assertTest($nearbyCriterion !== null && $nearbyCriterion['score'] === null, 'Criterion breakdown also withholds the scenario-free nearby score');
assertTest($nearbyCriterion['weight'] === 10.0, 'evaluate() weight is 10.0%');

// 7. PropertyAssessment Facade Delegation
$facadeEval = PropertyAssessment::evaluateNearbyBusinesses($benchmarkedInput);
assertTest($facadeEval['score'] === 80.0, 'PropertyAssessment facade delegates evaluateNearbyBusinesses correctly');
assertTest($facadeEval['iai_contribution'] === 8.00, 'PropertyAssessment facade returns matching IAI contribution');

echo "\nSummary: {$passed}/{$total} assertions passed.\n";
echo "✅ All Nearby Businesses PHP backend tests passed successfully!\n";
