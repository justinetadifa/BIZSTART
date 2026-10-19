<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/Support/PropertyAssessmentService.php';
require_once __DIR__ . '/../app/Support/auth.php';

use App\Support\PropertyAssessmentService;

echo "=======================================================\n";
echo "  LOCUS-SF MCE Weight Adjustment & Control Test Suite\n";
echo "=======================================================\n\n";

$passedCount = 0;
$failedCount = 0;

function assertCondition(bool $condition, string $description): void
{
    global $passedCount, $failedCount;
    if ($condition) {
        $passedCount++;
        echo "  [PASS] {$description}\n";
    } else {
        $failedCount++;
        echo "  [FAIL] {$description}\n";
    }
}

// TEST 1: Baseline and Discrepancy Reporting
echo "Test 1: Baseline Configuration & Manuscript Discrepancy\n";
$baseline = PropertyAssessmentService::baselineWeights();
assertCondition(isset($baseline['spatial_accessibility']) && $baseline['spatial_accessibility'] === 25.0, "Baseline spatial accessibility is 25.0%");
assertCondition(isset($baseline['infrastructure_readiness']) && $baseline['infrastructure_readiness'] === 25.0, "Baseline infrastructure readiness is 25.0%");
assertCondition(isset($baseline['property_cost_market_competitiveness']) && $baseline['property_cost_market_competitiveness'] === 20.0, "Baseline property cost is 20.0%");
assertCondition(isset($baseline['nearby_businesses']) && $baseline['nearby_businesses'] === 15.0, "Baseline nearby businesses is 15.0%");
assertCondition(isset($baseline['risk_constraints']) && $baseline['risk_constraints'] === 15.0, "Baseline risk constraints is 15.0%");
assertCondition(array_sum($baseline) === 100.0, "Baseline weights sum to exactly 100.0%");

$docSix = PropertyAssessmentService::documentedSixCriterionWeights();
assertCondition($docSix['zoning_compatibility'] === 15.0, "Documented 6-criterion draft includes zoning at 15.0%");
assertCondition(array_sum($docSix) === 100.0, "Documented 6-criterion draft sums to 100.0%");

$disc = PropertyAssessmentService::discrepancyNote();
assertCondition(!empty($disc['has_discrepancy']), "Discrepancy flag is true");
assertCondition(str_contains($disc['rationale'], 'non-compensatory eligibility gate'), "Rationale explains zoning non-compensatory eligibility gate");
assertCondition(str_contains($disc['rationale'], 'Risk Constraints'), "Rationale explains consolidation of environmental safety");

// TEST 2: Validation of Adjustable Weights
echo "\nTest 2: Validation of Adjustable Weights\n";

// Valid custom weights summing to 100%
$validCustom = [
    'spatial_accessibility' => 20.0,
    'infrastructure_readiness' => 30.0,
    'property_cost_market_competitiveness' => 20.0,
    'nearby_businesses' => 15.0,
    'risk_constraints' => 15.0,
];
$validated = PropertyAssessmentService::validateAdjustableWeights($validCustom);
assertCondition($validated['spatial_accessibility'] === 20.0 && $validated['infrastructure_readiness'] === 30.0, "Valid custom weights validated correctly");
assertCondition(array_sum($validated) === 100.0, "Validated weights sum to 100.0%");

// Sum != 100% rejected
$invalidSum = $validCustom;
$invalidSum['spatial_accessibility'] = 25.0; // sum = 105%
$sumRejected = false;
try {
    PropertyAssessmentService::validateAdjustableWeights($invalidSum);
} catch (DomainException $e) {
    $sumRejected = true;
    assertCondition(str_contains($e->getMessage(), 'must sum to exactly 100.00%'), "Sum exceeding 100% rejected with clear error message");
}
assertCondition($sumRejected, "Weights summing to 105% were rejected");

// Out of bounds weight rejected (< 5%)
$tooLow = $validCustom;
$tooLow['nearby_businesses'] = 3.0;
$tooLow['spatial_accessibility'] = 32.0;
$lowRejected = false;
try {
    PropertyAssessmentService::validateAdjustableWeights($tooLow);
} catch (DomainException $e) {
    $lowRejected = true;
    assertCondition(str_contains($e->getMessage(), 'below the minimum permitted threshold of 5.0%'), "Weight below 5% rejected");
}
assertCondition($lowRejected, "Weight below 5.0% was rejected");

// Out of bounds weight rejected (> 60%)
$tooHigh = $validCustom;
$tooHigh['spatial_accessibility'] = 65.0;
$tooHigh['infrastructure_readiness'] = 5.0;
$tooHigh['property_cost_market_competitiveness'] = 10.0;
$tooHigh['nearby_businesses'] = 10.0;
$tooHigh['risk_constraints'] = 10.0;
$highRejected = false;
try {
    PropertyAssessmentService::validateAdjustableWeights($tooHigh);
} catch (DomainException $e) {
    $highRejected = true;
    assertCondition(str_contains($e->getMessage(), 'exceeds the maximum permitted threshold of 60.0%'), "Weight above 60% rejected");
}
assertCondition($highRejected, "Weight above 60.0% was rejected");

// Missing required criterion rejected
$missingReq = $validCustom;
unset($missingReq['nearby_businesses']);
$missingReq['spatial_accessibility'] = 35.0;
$missingRejected = false;
try {
    PropertyAssessmentService::validateAdjustableWeights($missingReq);
} catch (DomainException $e) {
    $missingRejected = true;
    assertCondition(str_contains($e->getMessage(), 'cannot be omitted or disabled'), "Omitted required criterion rejected");
}
assertCondition($missingRejected, "Missing required criterion was rejected");

// Deactivating required criterion rejected
$deactRejected = false;
try {
    PropertyAssessmentService::validateAdjustableWeights($validCustom, ['nearby_businesses' => false]);
} catch (DomainException $e) {
    $deactRejected = true;
    assertCondition(str_contains($e->getMessage(), 'cannot be deactivated'), "Deactivation of required criterion rejected");
}
assertCondition($deactRejected, "Silently disabled required criterion was rejected");

// TEST 3: Weight Preview Simulation (Zero DB Mutation)
echo "\nTest 3: Weight Preview Simulation\n";
$preview = PropertyAssessmentService::previewWeights($validCustom);
assertCondition(!empty($preview['is_valid']), "Preview result is marked valid");
assertCondition(count($preview['criteria_rows']) === 5, "Preview includes all 5 criteria rows");
assertCondition($preview['criteria_rows'][0]['proposed_weight'] === 20.0, "Preview row shows proposed weight");
assertCondition($preview['criteria_rows'][0]['weight_delta'] === -5.0, "Preview row shows weight delta (-5.0%)");
assertCondition(isset($preview['total_iai_delta']), "Preview calculates overall IAI delta");

// TEST 4: Permission & Authorization Controls
echo "\nTest 4: Permission & Authorization Controls\n";
$cictoUser = ['role' => 'admin', 'department' => 'CICTO', 'accountStatus' => 'active', 'identityVerificationStatus' => 'verified'];
$caoUser = ['role' => 'admin', 'department' => 'CAO', 'accountStatus' => 'active', 'identityVerificationStatus' => 'verified'];
$lebdoUser = ['role' => 'admin', 'department' => 'LEBDO', 'accountStatus' => 'active', 'identityVerificationStatus' => 'verified'];
$caoGrantedUser = ['role' => 'admin', 'department' => 'CAO', 'mceConfigAuthorized' => true, 'accountStatus' => 'active', 'identityVerificationStatus' => 'verified'];
$sellerUser = ['role' => 'seller', 'accountStatus' => 'active', 'identityVerificationStatus' => 'verified'];
$investorUser = ['role' => 'investor', 'accountStatus' => 'active', 'identityVerificationStatus' => 'verified'];
$unverifiedCicto = ['role' => 'admin', 'department' => 'CICTO', 'accountStatus' => 'active', 'identityVerificationStatus' => 'unverified'];

assertCondition(sfc_can_configure_mce_weights($cictoUser) === true, "CICTO technical administrator is authorized to configure MCE weights");
assertCondition(sfc_can_configure_mce_weights($caoUser) === false, "Standard CAO assessor is NOT authorized to configure MCE weights");
assertCondition(sfc_can_configure_mce_weights($lebdoUser) === false, "Standard LEBDO officer is NOT authorized to configure MCE weights");
assertCondition(sfc_can_configure_mce_weights($caoGrantedUser) === true, "Explicitly authorized CAO officer IS authorized to configure MCE weights");
assertCondition(sfc_can_configure_mce_weights($sellerUser) === false, "Seller is NOT authorized to configure MCE weights");
assertCondition(sfc_can_configure_mce_weights($investorUser) === false, "Investor is NOT authorized to configure MCE weights");
assertCondition(sfc_can_configure_mce_weights($unverifiedCicto) === false, "Unverified admin is NOT authorized to configure MCE weights");

// TEST 5: Apply Weights & Version Tracking
echo "\nTest 5: Apply Weights & Version Tracking\n";

// Rejection on missing reason or source reference
$noReasonRejected = false;
try {
    PropertyAssessmentService::applyWeights($validCustom, '', 'CPDO Committee on Economic Development');
} catch (DomainException $e) {
    $noReasonRejected = true;
    assertCondition(str_contains($e->getMessage(), 'documented reason'), "Missing reason rejected");
}
assertCondition($noReasonRejected, "Empty reason was rejected");

$noSourceRejected = false;
try {
    PropertyAssessmentService::applyWeights($validCustom, 'Weight adjustment for commercial priority', '');
} catch (DomainException $e) {
    $noSourceRejected = true;
    assertCondition(str_contains($e->getMessage(), 'valid source or consultation reference'), "Missing source reference rejected");
}
assertCondition($noSourceRejected, "Empty source reference was rejected");

// Valid application
$applyResult = PropertyAssessmentService::applyWeights(
    $validCustom,
    'City Council Economic Committee consultation on infrastructure priority',
    'CPDO Res. 2026-08 (Preliminary Study)',
    ['id' => 1, 'name' => 'Justine Admin']
);
assertCondition(!empty($applyResult['ok']), "Weights successfully applied");
assertCondition(!empty($applyResult['version']) && str_starts_with($applyResult['version'], 'MCE-CFG-'), "Configuration version identifier generated: {$applyResult['version']}");
assertCondition($applyResult['validation_status'] === PropertyAssessmentService::WEIGHT_STATUS_PROVISIONAL, "Validation status accurately labeled as Provisional / Subject to LGU validation");

// Verify active weights match newly applied weights
$activeNow = PropertyAssessmentService::weights();
assertCondition($activeNow['spatial_accessibility'] === 20.0, "Active spatial accessibility weight updated to 20.0%");
assertCondition($activeNow['infrastructure_readiness'] === 30.0, "Active infrastructure readiness weight updated to 30.0%");

// Verify that evaluation reflects the newly applied weights
$sampleScores = [
    'spatial_accessibility' => 100.0,
    'infrastructure_readiness' => 100.0,
    'property_cost_market_competitiveness' => 100.0,
    'nearby_businesses' => 100.0,
    'risk_constraints' => 100.0,
];
$evalNew = PropertyAssessmentService::evaluate($sampleScores, [
    'zoning_status' => 'permitted',
    'allow_scalar_completion' => true,
]);
assertCondition($evalNew['weighted_contributions']['spatial_accessibility'] === 20.0, "New contribution for SA is 20.0 pts (was 25.0)");
assertCondition($evalNew['weighted_contributions']['infrastructure_readiness'] === 30.0, "New contribution for IR is 30.0 pts (was 25.0)");
assertCondition($evalNew['displayed_iai'] === 100.0, "Total IAI remains 100.0 out of 100");

// TEST 6: Hard Constraints & Prohibited Activities Cannot Be Overridden
echo "\nTest 6: Favorable Weights Cannot Override Hard Constraints or Missing Evidence\n";
// Prohibited zoning still yields null displayed_iai despite 100% scores on all physical criteria
$prohibitedEval = PropertyAssessmentService::evaluate($sampleScores, [
    'zoning_status' => 'prohibited',
    'allow_scalar_completion' => true,
]);
assertCondition($prohibitedEval['displayed_iai'] === null, "Prohibited use retains displayed_iai = null despite favorable weights");
assertCondition($prohibitedEval['eligibility']['status'] === 'not_suitable', "Prohibited use status is not_suitable");

// Missing evidence still yields null displayed_iai
$incompleteScores = [
    'spatial_accessibility' => 90.0,
    // infrastructure_readiness is missing
    'property_cost_market_competitiveness' => 75.0,
    'nearby_businesses' => 70.0,
    'risk_constraints' => 85.0,
];
$incompleteEval = PropertyAssessmentService::evaluate($incompleteScores, [
    'zoning_status' => 'permitted',
    'allow_scalar_completion' => true,
]);
assertCondition($incompleteEval['displayed_iai'] === null, "Missing required criterion retains displayed_iai = null");

// TEST 7: Controlled Baseline Restoration
echo "\nTest 7: Controlled Baseline Restoration\n";
$restoreResult = PropertyAssessmentService::restoreBaseline(
    'Restoring official defended baseline configuration',
    ['id' => 1, 'name' => 'Justine Admin']
);
assertCondition(!empty($restoreResult['ok']), "Baseline restoration succeeded");
assertCondition(!empty($restoreResult['is_baseline']), "Restoration marked as baseline");
$activeAfterRestore = PropertyAssessmentService::weights();
assertCondition($activeAfterRestore['spatial_accessibility'] === 25.0, "Restored spatial accessibility weight is 25.0%");
assertCondition($activeAfterRestore['infrastructure_readiness'] === 25.0, "Restored infrastructure readiness weight is 25.0%");
assertCondition($activeAfterRestore['property_cost_market_competitiveness'] === 20.0, "Restored property cost weight is 20.0%");
assertCondition($activeAfterRestore['nearby_businesses'] === 15.0, "Restored nearby businesses weight is 15.0%");
assertCondition($activeAfterRestore['risk_constraints'] === 15.0, "Restored risk constraints weight is 15.0%");

echo "\n=======================================================\n";
echo "  RESULTS: {$passedCount} PASSED, {$failedCount} FAILED\n";
echo "=======================================================\n";

if ($failedCount > 0) {
    exit(1);
}
