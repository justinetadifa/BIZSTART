<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/Support/PropertyAssessmentService.php';

use App\Support\PropertyAssessmentService;

$failures = 0;
$testsRun = 0;

function assertCondition(bool $condition, string $message): void {
    global $failures, $testsRun;
    $testsRun++;
    if (!$condition) {
        echo "❌ FAIL: {$message}\n";
        $failures++;
    } else {
        echo "✅ PASS: {$message}\n";
    }
}

echo "=== LOCUS-SF Step 3 Infrastructure Readiness Unit Tests ===\n\n";

// 1. Central Configuration & Metadata
$subcats = PropertyAssessmentService::INFRASTRUCTURE_SUBCATEGORIES_V2;
assertCondition(isset($subcats['electricity'], $subcats['water'], $subcats['internet'], $subcats['drainage']), "All 4 subcategories defined in INFRASTRUCTURE_SUBCATEGORIES_V2");

$weightSum = $subcats['electricity']['weight'] + $subcats['water']['weight'] + $subcats['internet']['weight'] + $subcats['drainage']['weight'];
assertCondition(abs($weightSum - 100.0) < 0.001, "Subcategory weights sum exactly to 100.0% (actual: {$weightSum}%)");
assertCondition($subcats['electricity']['weight'] === 35.0, "Electricity weight is centrally configured to 35.0%");
assertCondition($subcats['water']['weight'] === 30.0, "Water Supply weight is centrally configured to 30.0%");
assertCondition($subcats['internet']['weight'] === 20.0, "Internet & Telecom weight is centrally configured to 20.0%");
assertCondition($subcats['drainage']['weight'] === 15.0, "Drainage weight is centrally configured to 15.0%");

assertCondition(str_contains(PropertyAssessmentService::INFRASTRUCTURE_READINESS_VERSION, 'Provisional'), "Version indicates provisional status");
assertCondition(str_contains(PropertyAssessmentService::INFRASTRUCTURE_VALIDATION_STATUS, 'Awaiting Technical & LGU Validation'), "Validation status states awaiting technical/LGU validation");

// 2. Exact User Mockup Condition Calculation
// Electricity: generator_only (40 pts)
// Water: piped_reliable (100 pts)
// Internet: fiber_reliable (100 pts)
// Drainage: adequate_functional (100 pts)
$mockupInput = [
    'electricity' => 'generator_only',
    'water' => 'piped_reliable',
    'internet' => 'fiber_reliable',
    'drainage' => 'adequate_functional',
];
$mockupRes = PropertyAssessmentService::evaluateInfrastructureReadiness($mockupInput);

assertCondition($mockupRes['is_complete'] === true, "Mockup assessment is complete");
assertCondition($mockupRes['score'] === 79.0, "Mockup score is exactly 79.0 / 100 (actual: {$mockupRes['score']})");
assertCondition($mockupRes['iai_contribution'] === 19.75, "Mockup IAI contribution is exactly 19.75 pts (79 * 0.25) (actual: {$mockupRes['iai_contribution']})");
assertCondition($mockupRes['subcategories']['electricity']['weighted_score'] === 14.00, "Electricity weighted score is 14.00 pts (40 * 0.35)");
assertCondition($mockupRes['subcategories']['water']['weighted_score'] === 30.00, "Water weighted score is 30.00 pts (100 * 0.30)");
assertCondition($mockupRes['subcategories']['internet']['weighted_score'] === 20.00, "Internet weighted score is 20.00 pts (100 * 0.20)");
assertCondition($mockupRes['subcategories']['drainage']['weighted_score'] === 15.00, "Drainage weighted score is 15.00 pts (100 * 0.15)");
assertCondition($mockupRes['verification_status'] === 'applicant_reported', "Unverified input marked as applicant_reported");

// Generator Cross-Criteria Considerations
assertCondition(!empty($mockupRes['cross_criteria_considerations']['economic_viability']), "Generator-only records Economic Viability consideration note");
assertCondition(!empty($mockupRes['cross_criteria_considerations']['environmental_safety']), "Generator-only records Environmental Safety consideration note");

// 3. Perfect Infrastructure
$perfectInput = [
    'electricity' => 'grid_reliable',
    'water' => 'piped_reliable',
    'internet' => 'fiber_reliable',
    'drainage' => 'adequate_functional',
];
$perfectRes = PropertyAssessmentService::evaluateInfrastructureReadiness($perfectInput);
assertCondition($perfectRes['is_complete'] === true, "Perfect input is complete");
assertCondition($perfectRes['score'] === 100.0, "Perfect score is 100.0 / 100");
assertCondition($perfectRes['iai_contribution'] === 25.00, "Perfect IAI contribution is 25.00 pts (100 * 0.25)");
assertCondition(empty($perfectRes['cross_criteria_considerations']), "No generator cross-criteria notes for reliable grid");

// 4. Alternative realistic conditions
// Solar w/ battery (90) + Deep well (90) + Fixed wireless (85) + Minor improvements (70)
// Weighted: 90*0.35 + 90*0.30 + 85*0.20 + 70*0.15 = 31.5 + 27.0 + 17.0 + 10.5 = 86.0
$altInput = [
    'electricity' => 'solar_battery',
    'water' => 'deepwell_tested',
    'internet' => 'fixed_wireless',
    'drainage' => 'minor_improvements',
];
$altRes = PropertyAssessmentService::evaluateInfrastructureReadiness($altInput);
assertCondition($altRes['score'] === 86.0, "Alternative condition score is 86.0 / 100 (actual: {$altRes['score']})");
assertCondition($altRes['iai_contribution'] === 21.50, "Alternative IAI contribution is 21.50 pts (86 * 0.25) (actual: {$altRes['iai_contribution']})");

// 5. Incomplete / Unknown inputs handling
$incompleteInput = [
    'electricity' => 'unknown',
    'water' => 'piped_reliable',
    'internet' => 'fiber_reliable',
    'drainage' => 'adequate_functional',
];
$incompleteRes = PropertyAssessmentService::evaluateInfrastructureReadiness($incompleteInput);
assertCondition($incompleteRes['is_complete'] === false, "Assessment with unknown electricity is incomplete");
assertCondition($incompleteRes['score'] === null, "Incomplete assessment score is null (NOT 0 or full score)");
assertCondition($incompleteRes['iai_contribution'] === null, "Incomplete assessment IAI contribution is null");
assertCondition(in_array('Electricity', $incompleteRes['missing_subcategories']), "Electricity listed in missing_subcategories");

// 6. Provider neutrality
$inputWithProviderA = [
    'electricity' => ['status' => 'grid_reliable', 'provider' => 'LUECO'],
    'water' => ['status' => 'piped_reliable', 'provider' => 'MLUWD'],
    'internet' => ['status' => 'fiber_reliable', 'provider' => 'PLDT Enterprise'],
    'drainage' => 'adequate_functional',
];
$inputWithProviderB = [
    'electricity' => ['status' => 'grid_reliable', 'provider' => 'Self-Generated / Other'],
    'water' => ['status' => 'piped_reliable', 'provider' => 'Private Commercial Waterworks'],
    'internet' => ['status' => 'fiber_reliable', 'provider' => 'Local Neighborhood ISP'],
    'drainage' => 'adequate_functional',
];
$resA = PropertyAssessmentService::evaluateInfrastructureReadiness($inputWithProviderA);
$resB = PropertyAssessmentService::evaluateInfrastructureReadiness($inputWithProviderB);
assertCondition($resA['score'] === $resB['score'], "Provider name does not alter calculation score ({$resA['score']} vs {$resB['score']})");

// 7. Official verification by CAO / LEBDO personnel
$verifiedRes = PropertyAssessmentService::evaluateInfrastructureReadiness($mockupInput, ['is_verified' => true]);
assertCondition($verifiedRes['verification_status'] === 'verified', "Verified option sets verification_status to 'verified'");

// 8. Legacy 4-tuple compatibility (road_connectivity without drainage)
$legacyInput = [
    'power' => ['status' => 'connected'],
    'water' => ['status' => 'connected'],
    'telecom' => ['status' => 'connected'],
    'road_connectivity' => ['status' => 'paved'],
];
$legacyRes = PropertyAssessmentService::evaluateInfrastructureReadiness($legacyInput);
assertCondition($legacyRes['score'] === null, "Legacy tuple cannot replace required drainage observation");
assertCondition($legacyRes['is_complete'] === false, "Incomplete legacy service tuple is withheld under the selected protocol");

echo "\nSummary: " . ($testsRun - $failures) . "/{$testsRun} assertions passed.\n";
if ($failures > 0) {
    echo "❌ {$failures} test(s) failed.\n";
    exit(1);
} else {
    echo "✅ All Infrastructure Readiness PHP backend tests passed successfully!\n";
    exit(0);
}
