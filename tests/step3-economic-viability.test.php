<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/Support/PropertyAssessmentService.php';
require_once __DIR__ . '/../app/Support/PropertyAssessment.php';

use App\Support\PropertyAssessmentService;
use App\Support\PropertyAssessment;

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

echo "=== LOCUS-SF Step 3 Economic Viability Unit Tests ===\n\n";

// 1. Central Configuration & Metadata
$weights = PropertyAssessmentService::weights();
assertCondition(isset($weights['economic_viability']), "economic_viability weight exists in active configuration");
assertCondition($weights['economic_viability'] === 20.0, "economic_viability weight is preserved at exactly 20.0% of MCE");
assertCondition(str_contains(PropertyAssessmentService::ECONOMIC_VIABILITY_VERSION, 'Provisional'), "ECONOMIC_VIABILITY_VERSION indicates provisional status");
assertCondition(str_contains(PropertyAssessmentService::ECONOMIC_VALIDATION_STATUS, 'Awaiting Market Comparables'), "ECONOMIC_VALIDATION_STATUS mentions awaiting market comparables");

// 2. Exact Mockup Calculations (Sale listing)
// Asking ₱9,000,000, Area 1,000 m², BIR ₱7,000/m²
$mockupInput = [
    'listing_purpose' => 'sale',
    'asking_price' => 9000000.0,
    'land_area' => 1000.0,
    'bir_zonal_value' => 7000.0,
];
$mockupRes = PropertyAssessmentService::evaluateEconomicViability($mockupInput);

$p = $mockupRes['pricing_analysis'];
assertCondition($p['asking_price_per_sqm'] === 9000.0, "Asking price per sqm is exactly ₱9,000/m² (actual: {$p['asking_price_per_sqm']})");
assertCondition($p['bir_total_reference'] === 7000000.0, "Total BIR zonal reference value is exactly ₱7,000,000 (actual: {$p['bir_total_reference']})");
assertCondition($p['asking_vs_bir_percent'] === 28.6, "Asking price is 28.6% higher than BIR zonal reference (actual: {$p['asking_vs_bir_percent']}%)");
assertCondition($mockupRes['is_complete'] === false, "Assessment is incomplete when verified comparable market benchmark is missing");
assertCondition($mockupRes['score'] === null, "Score is null (not arbitrary 85 or full score) when market comparables are missing");
assertCondition($mockupRes['iai_contribution'] === null, "IAI contribution is null when score is incomplete");
assertCondition(in_array('Verified local comparable market benchmark', $mockupRes['missing_requirements']), "Missing requirements includes market benchmark");
assertCondition($mockupRes['verification_status'] === 'applicant_reported', "Unverified input marked as applicant_reported");

// 3. Lease Listing Calculations
$leaseInput = [
    'listing_purpose' => 'lease',
    'lease_price' => 50000.0,
    'land_area' => 1000.0,
    'bir_zonal_value' => 7000.0,
];
$leaseRes = PropertyAssessmentService::evaluateEconomicViability($leaseInput);
$lp = $leaseRes['pricing_analysis'];
assertCondition($lp['lease_price_per_sqm'] === 50.0, "Monthly lease rate per sqm is exactly ₱50/m² / month (actual: {$lp['lease_price_per_sqm']})");
assertCondition($lp['bir_total_reference'] === 7000000.0, "Total BIR reference calculated correctly for lease property");

// 4. Dual Sale or Lease Listing (both metrics separate)
$dualInput = [
    'listing_purpose' => 'sale_or_lease',
    'asking_price' => 9000000.0,
    'lease_price' => 50000.0,
    'land_area' => 1000.0,
    'bir_zonal_value' => 7000.0,
];
$dualRes = PropertyAssessmentService::evaluateEconomicViability($dualInput);
$dp = $dualRes['pricing_analysis'];
assertCondition($dp['asking_price_per_sqm'] === 9000.0, "Dual listing computes sale asking price per sqm: ₱9,000");
assertCondition($dp['lease_price_per_sqm'] === 50.0, "Dual listing computes monthly lease rate per sqm: ₱50");

// 5. Verified Comparable Market Benchmark Scoring
// 5.1 Aligned within ±5%
$compInput100 = [
    'listing_purpose' => 'sale',
    'asking_price' => 9000000.0,
    'land_area' => 1000.0,
    'bir_zonal_value' => 7000.0,
    'comparable_market_price' => 9000.0,
];
$compRes100 = PropertyAssessmentService::evaluateEconomicViability($compInput100, ['is_verified' => true]);
assertCondition($compRes100['is_complete'] === true, "Complete when verified comparable market benchmark is provided");
assertCondition($compRes100['score'] === 100.0, "Score is 100.0 for asking price aligned with market benchmark (actual: {$compRes100['score']})");
assertCondition($compRes100['iai_contribution'] === 20.00, "IAI contribution is 20.00 pts for 100.0 score (20% weight)");
assertCondition($compRes100['verification_status'] === 'verified', "Verification status is verified");

// 5.2 Moderate premium (10% higher than market)
$compInput85 = [
    'listing_purpose' => 'sale',
    'asking_price' => 9900000.0, // ₱9,900/sqm vs ₱9,000/sqm = +10%
    'land_area' => 1000.0,
    'bir_zonal_value' => 7000.0,
    'comparable_market_price' => 9000.0,
];
$compRes85 = PropertyAssessmentService::evaluateEconomicViability($compInput85, ['is_verified' => true]);
assertCondition($compRes85['score'] === 85.0, "Score is 85.0 for moderate 10% premium over market benchmark");
assertCondition($compRes85['iai_contribution'] === 17.00, "IAI contribution is 17.00 pts for 85.0 score");

// 6. Area Discrepancy Prevention
$discInput = [
    'listing_purpose' => 'sale',
    'asking_price' => 9000000.0,
    'land_area' => 1000.0,
    'bir_zonal_value' => 7000.0,
    'comparable_market_price' => 9000.0,
    'area_discrepancy' => true,
];
$discRes = PropertyAssessmentService::evaluateEconomicViability($discInput, ['is_verified' => true]);
assertCondition($discRes['is_complete'] === false, "Assessment is incomplete when area discrepancy is flagged");
assertCondition($discRes['score'] === null, "Score is null when area discrepancy is flagged");
assertCondition(str_contains($discRes['explanation'], 'Area discrepancy flagged'), "Explanation warns about area discrepancy");

// 7. No Arbitrary Scoring Based on BIR Zonal Values Alone
$highBirInput = [
    'listing_purpose' => 'sale',
    'asking_price' => 50000000.0,
    'land_area' => 1000.0,
    'bir_zonal_value' => 45000.0, // Very high BIR zonal value
];
$highBirRes = PropertyAssessmentService::evaluateEconomicViability($highBirInput);
assertCondition($highBirRes['score'] === null, "High BIR zonal value does NOT fabricate a score without verified market comparables");

// 8. Backwards Compatibility with Scalar Scores
$scalarRes = PropertyAssessmentService::evaluateEconomicViability(80.0);
assertCondition($scalarRes['is_complete'] === true, "Scalar score evaluates complete");
assertCondition($scalarRes['score'] === 80.0, "Scalar score returns exact value 80.0");
assertCondition($scalarRes['iai_contribution'] === 16.00, "Scalar score returns exact IAI contribution 16.00 pts (80 * 0.20)");

// 9. Facade Integration
$facadeRes = PropertyAssessment::evaluateEconomicViability($mockupInput);
assertCondition($facadeRes['pricing_analysis']['asking_price_per_sqm'] === 9000.0, "PropertyAssessment facade delegates cleanly");

// 10. Leasable floor space calculation for Lease (uses actual leasable area, not total land area)
$leasableInput = [
    'listing_purpose' => 'lease',
    'lease_price' => 50000.0,
    'land_area' => 1000.0,
    'offered_area_sqm' => 250.0,
    'security_deposit_months' => 2.0,
    'advance_rent_months' => 1.0,
    'utilities_included' => 'included',
    'comparable_lease_price' => 200.0,
];
$leasableRes = PropertyAssessmentService::evaluateEconomicViability($leasableInput, ['is_verified' => true]);
$lsp = $leasableRes['pricing_analysis'];
assertCondition($lsp['lease_price_per_sqm'] === 200.0, "Monthly lease rent calculated using actual leasable space: ₱200/m²/month (actual: {$lsp['lease_price_per_sqm']})");
assertCondition($lsp['known_upfront_costs'] === 150000.0, "Known upfront costs calculated: ₱150,000 (actual: {$lsp['known_upfront_costs']})");
assertCondition($lsp['price_competitiveness_ratio'] === 1.0, "Price-competitiveness ratio is exactly 1.0x (actual: {$lsp['price_competitiveness_ratio']})");
assertCondition($leasableRes['score'] === 100.0, "Verified lease benchmark score is 100.0 for matching market rate");
assertCondition($leasableRes['iai_contribution'] === 20.00, "IAI contribution is 20.00 pts for 100.0 score");

// 11. Sale property with additional purchase / improvement costs
$saleCostsInput = [
    'listing_purpose' => 'sale',
    'asking_price' => 9000000.0,
    'land_area' => 1000.0,
    'additional_purchase_costs' => 150000.0,
];
$saleCostsRes = PropertyAssessmentService::evaluateEconomicViability($saleCostsInput);
assertCondition($saleCostsRes['pricing_analysis']['known_upfront_costs'] === 150000.0, "Sale upfront outlay reflects known additional purchase/improvement costs");

// 12. Price on Request (asking_price null)
$requestInput = [
    'listing_purpose' => 'sale',
    'asking_price' => null,
    'land_area' => 1000.0,
    'bir_zonal_value' => 7000.0,
];
$requestRes = PropertyAssessmentService::evaluateEconomicViability($requestInput);
assertCondition($requestRes['pricing_analysis']['asking_price_per_sqm'] === null, "Price on request leaves asking price per sqm null without error");
assertCondition($requestRes['is_complete'] === false, "Price on request assessment is incomplete");

// 13. Competitiveness Rubric Multi-Tier Verification
// 13.1 Substantial Premium (+20% higher)
$compInput70 = [
    'listing_purpose' => 'sale',
    'asking_price' => 10800000.0, // ₱10,800/sqm vs ₱9,000 = +20%
    'land_area' => 1000.0,
    'comparable_market_price' => 9000.0,
];
$compRes70 = PropertyAssessmentService::evaluateEconomicViability($compInput70, ['is_verified' => true]);
assertCondition($compRes70['score'] === 70.0, "Score is 70.0 for substantial 20% premium over market benchmark");

// 13.2 Elevated asking price (>30% higher)
$compInput50 = [
    'listing_purpose' => 'sale',
    'asking_price' => 13500000.0, // ₱13,500/sqm vs ₱9,000 = +50%
    'land_area' => 1000.0,
    'comparable_market_price' => 9000.0,
];
$compRes50 = PropertyAssessmentService::evaluateEconomicViability($compInput50, ['is_verified' => true]);
assertCondition($compRes50['score'] === 50.0, "Score is 50.0 for elevated asking price > 30% above market benchmark");

// 13.3 Discounted asking price (< -5%)
$compInput75 = [
    'listing_purpose' => 'sale',
    'asking_price' => 7200000.0, // ₱7,200/sqm vs ₱9,000 = -20%
    'land_area' => 1000.0,
    'comparable_market_price' => 9000.0,
];
$compRes75 = PropertyAssessmentService::evaluateEconomicViability($compInput75, ['is_verified' => true]);
assertCondition($compRes75['score'] === 75.0, "Score is 75.0 for discounted asking price below market benchmark");

// 14. PropertyParcel observation normalization
require_once __DIR__ . '/../app/Support/PropertyParcel.php';
$parcelPayload = [
    'land_area' => '1000',
    'land_area_unit' => 'sqm',
    'offered_space_scope' => 'part_property',
    'offered_area_sqm' => '250',
    'security_deposit_months' => '2',
    'advance_rent_months' => '1',
    'utilities_included' => 'included',
    'additional_purchase_costs' => '150000',
    'comparable_lease_price' => '200',
];
$normalizedParcel = \App\Support\PropertyParcel::fromPayload($parcelPayload);
$obs = $normalizedParcel['observations'];
assertCondition($obs['offered_space_scope'] === 'part_property', "PropertyParcel preserves offered_space_scope");
assertCondition($obs['offered_area_sqm'] === 250.0, "PropertyParcel normalizes offered_area_sqm as float 250.0");
assertCondition($obs['security_deposit_months'] === 2.0, "PropertyParcel normalizes security_deposit_months as float 2.0");
assertCondition($obs['advance_rent_months'] === 1.0, "PropertyParcel normalizes advance_rent_months as float 1.0");
assertCondition($obs['utilities_included'] === 'included', "PropertyParcel preserves utilities_included");
assertCondition($obs['additional_purchase_costs'] === 150000.0, "PropertyParcel normalizes additional_purchase_costs as float 150000.0");
assertCondition($obs['comparable_lease_price'] === 200.0, "PropertyParcel normalizes comparable_lease_price as float 200.0");

// 15. User Specific Acceptance Test Case:
// Monthly rent: ₱25,000, Leasable area: 100 m², Comparable rent: ₱300/m²/month, Security deposit: 2 months, Advance rent: 1 month
// Expected results:
// - Monthly rent per m² = ₱250.
// - Price difference = 16.67% below comparable benchmark.
// - Price-competitiveness ratio = 0.8333.
// - Known upfront outlay = ₱75,000.
$userAcceptanceInput = [
    'listing_purpose' => 'lease',
    'lease_price' => 25000.0,
    'land_area' => 500.0,
    'offered_space_scope' => 'part_property',
    'offered_area_sqm' => 100.0,
    'comparable_lease_price' => 300.0,
    'security_deposit_months' => 2.0,
    'advance_rent_months' => 1.0,
];
$userAcceptanceRes = PropertyAssessmentService::evaluateEconomicViability($userAcceptanceInput, ['is_verified' => true]);
$uap = $userAcceptanceRes['pricing_analysis'];

assertCondition($uap['lease_price_per_sqm'] === 250.0, "User Acceptance: Monthly rent per m² is ₱250 (actual: {$uap['lease_price_per_sqm']})");
assertCondition($uap['lease_vs_market_percent'] === -16.67, "User Acceptance: Price difference is 16.67% below benchmark (actual: {$uap['lease_vs_market_percent']}%)");
assertCondition($uap['price_competitiveness_ratio'] === 0.8333, "User Acceptance: Price-competitiveness ratio is 0.8333 (actual: {$uap['price_competitiveness_ratio']})");
assertCondition($uap['known_upfront_costs'] === 75000.0, "User Acceptance: Known upfront outlay is ₱75,000 (actual: {$uap['known_upfront_costs']})");
assertCondition($userAcceptanceRes['is_complete'] === true, "User Acceptance: Assessment is complete with verified lease benchmark");
assertCondition($userAcceptanceRes['score'] === 75.0, "User Acceptance: Score is 75.0 for discounted lease rate (actual: {$userAcceptanceRes['score']})");
assertCondition($userAcceptanceRes['iai_contribution'] === 15.00, "User Acceptance: IAI contribution is 15.00 pts (75.0 * 0.20)");

echo "\nSummary: " . ($testsRun - $failures) . "/{$testsRun} assertions passed.\n";
if ($failures > 0) {
    echo "❌ {$failures} test(s) failed.\n";
    exit(1);
} else {
    echo "✅ All Economic Viability PHP backend tests passed successfully!\n";
    exit(0);
}
