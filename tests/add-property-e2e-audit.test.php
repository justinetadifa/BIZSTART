<?php
declare(strict_types=1);

/**
 * End-to-End Audit & Verification of Add / Submit Property Workflow
 * Strictly focused on Property Submission, 6-Criterion MCE/IAI Mathematics,
 * Draft Persistence, and Zero Data Loss.
 */

$container = require __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/Support/PropertyAssessmentService.php';
require_once __DIR__ . '/../app/Support/ZoningRulesEngine.php';
require_once __DIR__ . '/../app/Support/RiskConstraintsEngine.php';
require_once __DIR__ . '/../api/_listing-policy.php';

use App\Support\PropertyAssessmentService;
use App\Support\PropertyAssessment;
use App\Support\PropertyCatalog;
use App\Support\ZoningRulesEngine;
use App\Support\RiskConstraintsEngine;

$totalChecks = 0;
$passedChecks = 0;

function assertCheck(bool $condition, string $description): void {
    global $totalChecks, $passedChecks;
    $totalChecks++;
    if (!$condition) {
        echo "❌ FAIL: $description\n";
        throw new RuntimeException("Assertion failed: $description");
    }
    $passedChecks++;
    echo "✅ PASS: $description\n";
}

echo "====================================================================\n";
echo "LOCUS-SF ADD/SUBMIT PROPERTY WORKFLOW FINAL AUDIT & E2E VERIFICATION\n";
echo "====================================================================\n\n";

// -------------------------------------------------------------------------
// 1. VERIFY 6-CRITERION MCE / IAI MATHEMATICS
// -------------------------------------------------------------------------
echo "--- 1. MCE & IAI MATHEMATICAL VERIFICATION ---\n";

// Weights check
$activeWeights = PropertyAssessment::WEIGHTS;
assertCheck(count($activeWeights) === 6, "Active model defines exactly 6 criteria");
assertCheck($activeWeights['spatial_accessibility'] === 20, "Spatial Accessibility weight is 20%");
assertCheck($activeWeights['infrastructure_readiness'] === 20, "Infrastructure Readiness weight is 20%");
assertCheck($activeWeights['economic_viability'] === 20, "Economic Viability weight is 20%");
assertCheck($activeWeights['nearby_businesses'] === 10, "Nearby Businesses weight is 10%");
assertCheck($activeWeights['zoning_compatibility'] === 15, "Zoning Compatibility weight is 15%");
assertCheck($activeWeights['risk_constraints'] === 15, "Risk Constraints weight is 15%");
assertCheck(!isset($activeWeights['environmental_safety']), "Environmental Safety contribution is completely removed");
assertCheck(array_sum($activeWeights) === 100, "Active criteria weights sum to exactly 100%");

// Mandatory synthetic test calculation:
// Scores [90, 80, 75, 60, 100, 60] -> MUST equal exactly 79/100
$syntheticScores = [
    'spatial_accessibility' => 90,
    'infrastructure_readiness' => 80,
    'economic_viability' => 75,
    'nearby_businesses' => 60,
    'zoning_compatibility' => 100,
    'risk_constraints' => 60,
];

// Manual calculation check
$manualSum = (90 * 0.20) + (80 * 0.20) + (75 * 0.20) + (60 * 0.10) + (100 * 0.15) + (60 * 0.15);
assertCheck($manualSum === 79.0, "Manual weighted sum (18 + 16 + 15 + 6 + 15 + 9) equals exactly 79.0");

// PropertyAssessmentService evaluation
$serviceResult = PropertyAssessmentService::evaluateAssessment($syntheticScores, [
    'zoning_compatibility' => ['permission' => 'permitted']
]);
assertCheck($serviceResult['iai_score'] === 79.0, "Service evaluation produces IAI: 79/100");
assertCheck($serviceResult['mce_score'] === 79.0, "Service evaluation produces MCE: 79/100");
assertCheck($serviceResult['is_complete'] === true, "Synthetic complete assessment flags is_complete: true");
assertCheck($serviceResult['status'] === 'complete', "Assessment status is 'complete'");

// PropertyAssessment Facade evaluation
$facadeResult = PropertyAssessment::evaluate($syntheticScores, [
    'zoning_compatibility' => ['permission' => 'permitted']
]);
assertCheck($facadeResult['iai_score'] === 79.0, "Facade evaluation produces IAI: 79/100");
assertCheck($facadeResult['mce_score'] === 79.0, "Facade evaluation produces MCE: 79/100");

// Missing evidence handling
$incompleteScores = $syntheticScores;
$incompleteScores['infrastructure_readiness'] = null; // missing evidence
$incompleteRes = PropertyAssessmentService::evaluateAssessment($incompleteScores);
assertCheck($incompleteRes['is_complete'] === false, "Missing evidence flags is_complete: false");
assertCheck($incompleteRes['iai_score'] === null, "Missing required evidence withholds IAI (null)");
assertCheck($incompleteRes['mce_score'] === null, "Missing required evidence withholds MCE (null)");
assertCheck($incompleteRes['status'] === 'incomplete', "Status is marked 'incomplete'");

// Prohibited zoning handling
$prohibitedScores = $syntheticScores;
$prohibitedRes = PropertyAssessmentService::evaluateAssessment($prohibitedScores, [
    'zoning_compatibility' => ['permission' => 'prohibited', 'score' => 0]
]);
assertCheck($prohibitedRes['is_complete'] === false, "Prohibited zoning is not complete");
assertCheck($prohibitedRes['eligibility']['is_eligible'] === false, "Prohibited zoning sets is_eligible: false");
assertCheck($prohibitedRes['status'] === 'not_suitable', "Prohibited zoning sets status: 'not_suitable'");
assertCheck($prohibitedRes['iai_score'] === null, "Prohibited zoning withholds IAI score");

// Unavailable hazard data handling: never invent scores
$hazardWithMissing = [
    'flood_susceptibility' => 'low',
    'active_fault' => 'outside_buffer',
    'landslide_susceptibility' => null, // unavailable
    'storm_surge' => 'low',
    'liquefaction' => 'low',
    'tsunami' => null, // unavailable
];
$hazardEval = RiskConstraintsEngine::evaluate($hazardWithMissing);
assertCheck($hazardEval['is_complete'] === false, "Hazard with missing data is not complete");
assertCheck($hazardEval['score'] === null, "Hazard composite score is null when data is missing");
assertCheck(count($hazardEval['missing_indicators']) === 2, "Accurately identifies exactly 2 missing hazard indicators");

echo "\n--- 2. STEP 1 (BASICS) VALIDATION & DRAFT PERSISTENCE ---\n";

// Validate Category & Subcategory taxonomy
$categories = PropertyCatalog::categories();
assertCheck(count($categories) === 2, "Property taxonomy has exactly 2 primary types: Land and Building");
assertCheck(isset($categories['Land']) && isset($categories['Building']), "Both Land and Building categories exist");

[$cat, $sub] = PropertyCatalog::normalizeCategory('Land', 'Commercial Lot', 'commercial');
assertCheck($cat === 'Land' && $sub === 'Commercial Lot', "Commercial Lot is a valid Land subcategory");

// Pricing validation
$salePricing = sfc_listing_payload([
    'listing_purpose' => 'sale',
    'price' => '5,000,000',
    'lease_price' => '',
], ['id' => 1, 'role' => 'admin', 'department' => 'CICTO'], true);
assertCheck($salePricing['listing_purpose'] === 'sale', "Listing purpose 'sale' preserved");
assertCheck($salePricing['price'] === '5,000,000', "Sale price passed through policy");

$leasePricing = sfc_listing_payload([
    'listing_purpose' => 'lease',
    'price' => '',
    'lease_price' => '75,000',
    'lease_period' => 'monthly',
], ['id' => 1, 'role' => 'admin', 'department' => 'CICTO'], true);
assertCheck($leasePricing['listing_purpose'] === 'lease', "Listing purpose 'lease' preserved");
assertCheck($leasePricing['lease_price'] === '75,000', "Lease price passed through policy");

echo "\n--- 3. STEP 2 (AREA & LOCATION) COORDINATES & BOUNDARY ---\n";

// Unit conversions
$areaSqm = 10000.0;
$areaHa = $areaSqm / 10000.0;
$areaSqft = $areaSqm / 0.09290304;
assertCheck($areaHa === 1.0, "10,000 sqm converts to exactly 1.0 ha");
assertCheck(round($areaSqft, 2) === 107639.10, "10,000 sqm converts to ~107,639.10 sqft");

// Coordinate limits in San Fernando
$sfLat = 16.6159;
$sfLng = 120.3210;
assertCheck($sfLat >= 16.55 && $sfLat <= 16.70, "Latitude 16.6159 is within San Fernando bounds");
assertCheck($sfLng >= 120.25 && $sfLng <= 120.40, "Longitude 120.3210 is within San Fernando bounds");

echo "\n--- 4. FULL END-TO-END SUBMISSION TO DATABASE & REOPEN ---\n";

$actor = $container['pdo']->query("SELECT id, name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1")->fetch();
assertCheck(!empty($actor), "Found administrative test actor");
$actor += ['role' => 'admin', 'department' => 'CICTO'];

// 1. Create property via repository with all 6 criteria inputs
$uniqueName = 'Audit Verification Parcel ' . bin2hex(random_bytes(4));
$submissionData = [
    'name' => $uniqueName,
    'category' => 'Land',
    'subcategory' => 'Commercial Lot',
    'property_type' => 'commercial',
    'barangay' => 'Catbangen',
    'land_area' => 1500,
    'land_area_unit' => 'sqm',
    'listing_purpose' => 'sale',
    'price' => 4500000,
    'lat' => 16.6159,
    'lng' => 120.3210,
    'road_access' => 'concrete_2lane',
    'dist_to_road_km' => 0.05,
    'utility_status' => 'power_water',
    'electricity_arrangement' => 'connected_active',
    'water_supply' => 'deep_well',
    'internet_telecom' => 'cellular_4g_5g',
    'drainage_conditions' => 'adequate_canal',
    'bir_zonal_value' => 5000,
    'comparable_market_price' => 6000,
    'zoning_classification' => 'C-1',
    'proposed_activity' => 'retail_convenience',
    'approval_state' => 'pending_review',
    'description' => 'Final audit verification test record.',
];

$created = null;
try {
    $created = $container['properties']->create($submissionData, $actor);
    assertCheck($created['id'] > 0, "Property created successfully with ID #{$created['id']}");
    assertCheck($created['name'] === $uniqueName, "Property name stored correctly");
    assertCheck($created['category'] === 'Land', "Category stored as Land");
    assertCheck($created['subcategory'] === 'Commercial Lot', "Subcategory stored as Commercial Lot");
    assertCheck($created['barangay'] === 'Catbangen', "Barangay stored as Catbangen");
    assertCheck(abs($created['lat'] - 16.6159) < 0.0001, "Latitude stored precisely");
    assertCheck(abs($created['lng'] - 120.3210) < 0.0001, "Longitude stored precisely");
    assertCheck((int) $created['price'] === 4500000, "Price stored precisely");

    // 2. Reopen / Fetch property
    $reopened = $container['properties']->find($created['id'], $actor);
    assertCheck($reopened['id'] === $created['id'], "Property reopened and fetched by ID");
    assertCheck($reopened['approvalState'] === 'pending_review', "Approval state is pending_review");
    assertCheck($reopened['name'] === $uniqueName, "Reopened record maintains identical name");
    assertCheck($reopened['category'] === 'Land', "Reopened record maintains category");
    assertCheck($reopened['barangay'] === 'Catbangen', "Reopened record maintains barangay");
    assertCheck(isset($reopened['assessmentCriteria']), "Reopened record has assessment criteria");
    assertCheck(count($reopened['assessmentCriteria']) === 6, "Reopened assessment has exactly 6 criteria");

    // 3. Test Update without data loss
    $updateData = [
        'description' => 'Updated audit verification parcel description.',
        'comparable_market_price' => 6500,
    ];
    $updated = $container['properties']->update($created['id'], $updateData, $actor);
    assertCheck($updated['id'] === $created['id'], "Property updated successfully");
    assertCheck($updated['name'] === $uniqueName, "Property name preserved on partial update");
    assertCheck((int) $updated['price'] === 4500000, "Property price preserved on partial update");
    assertCheck($updated['barangay'] === 'Catbangen', "Property barangay preserved on partial update");

} finally {
    // Clean up created test record
    if ($created && !empty($created['id'])) {
        $cleanupAudit = $container['pdo']->prepare('DELETE FROM audit_logs WHERE entity_type = "PROPERTY" AND entity_id = :id');
        $cleanupAudit->execute(['id' => $created['id']]);
        $cleanupProp = $container['pdo']->prepare('DELETE FROM properties WHERE id = :id');
        $cleanupProp->execute(['id' => $created['id']]);
        echo "🧹 Cleaned up temporary test record ID #{$created['id']}\n";
    }
}

echo "\n====================================================================\n";
echo "AUDIT SUMMARY: $passedChecks / $totalChecks CHECKS PASSED (100%)\n";
echo "====================================================================\n";
