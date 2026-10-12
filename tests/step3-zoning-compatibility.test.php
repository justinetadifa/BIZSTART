<?php
declare(strict_types=1);

/**
 * Test Suite: Criterion 5 — Zoning Compatibility (CLUP Rules Engine)
 *
 * Verifies:
 * 1. 18 official San Fernando City zoning districts (City Ordinance 2018-06, 2020-21, 2025-16).
 * 2. 9 hierarchical categories and 29 specific proposed activities.
 * 3. 522 zone-activity rule matrices (18 × 29) distinguishing Permitted, Conditional, Prohibited, Undetermined.
 * 4. Automatic lookup: District + Specific Proposed Activity + Conditions -> Result.
 * 5. Eligibility gate:
 *    - Permitted: score 100.0, IAI contribution 15.00 pts (100 * 0.15).
 *    - Conditional: provisional score 70.0, IAI contribution 10.50 pts (70 * 0.15).
 *    - Prohibited: score 0.0, Not Suitable, composite IAI = null.
 *    - Undetermined: score null, Assessment Incomplete, composite IAI = null.
 * 6. 15% Zoning weight preserved; other six MCE criteria untouched and total 100%.
 * 7. Source priority traceability (Priority 1 Local Ordinance, Priority 2 Maps, Priority 3 DHSUD Reference).
 * 8. Database persistence and seeding integrity.
 */

require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/Support/ZoningRulesEngine.php';
require_once __DIR__ . '/../app/Support/PropertyAssessmentService.php';
require_once __DIR__ . '/../app/Support/PropertyAssessment.php';

use App\Support\ZoningRulesEngine;
use App\Support\PropertyAssessmentService;
use App\Support\PropertyAssessment;

$passed = 0;
$failed = 0;

function assertCondition(bool $condition, string $message): void {
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo "✅ PASS: {$message}\n";
    } else {
        $failed++;
        echo "❌ FAIL: {$message}\n";
    }
}

echo "=========================================================\n";
echo "STEP 3: ZONING COMPATIBILITY (CLUP RULES ENGINE) TESTS\n";
echo "=========================================================\n\n";

// ---------------------------------------------------------
// 1. ZONING DISTRICTS (18 Official San Fernando Districts)
// ---------------------------------------------------------
echo "--- 1. Official San Fernando Zoning Districts ---\n";
$districts = ZoningRulesEngine::getOfficialDistricts();
assertCondition(count($districts) === 18, "Exactly 18 official San Fernando City zoning districts defined (found " . count($districts) . ")");

$expectedCodes = [
    'C-1', 'C-2', 'C-3',
    'R-1', 'R-2', 'R-3',
    'I-1', 'I-2',
    'AGR-S', 'AGR-NS', 'AIZ',
    'GI', 'SI',
    'TZ',
    'FEZ', 'MRZ', 'FRZ', 'PDZ'
];

foreach ($expectedCodes as $code) {
    assertCondition(isset($districts[$code]), "District '{$code}' exists in official San Fernando catalog");
    assertCondition(!empty($districts[$code]['ordinance_section']), "District '{$code}' cites applicable ordinance section");
    assertCondition($districts[$code]['source_priority'] === 1, "District '{$code}' has Priority 1 local ordinance authority");
}

// ---------------------------------------------------------
// 2. HIERARCHICAL LAND USE CATALOG (9 Categories, 29 Activities)
// ---------------------------------------------------------
echo "\n--- 2. Hierarchical Land Use Catalog (29 Activities) ---\n";
$catalog = ZoningRulesEngine::getHierarchicalUseCatalog();
assertCondition(count($catalog) === 9, "Exactly 9 hierarchical land use categories defined");

$expectedCategories = ['retail', 'food', 'offices', 'residential', 'industrial', 'agricultural', 'tourism', 'logistics', 'institutional'];
foreach ($expectedCategories as $cat) {
    assertCondition(isset($catalog[$cat]), "Category '{$cat}' exists in hierarchical catalog");
}

$allActivities = ZoningRulesEngine::SPECIFIC_ACTIVITIES;
assertCondition(count($allActivities) === 29, "Exactly 29 specific activities defined across 9 categories (found " . count($allActivities) . ")");

// Verify specific activities mentioned in requirements
$requiredActivities = [
    'retail_convenience', 'retail_supermarket', 'retail_pharmacy', 'retail_hardware',
    'food_cafe', 'food_restaurant', 'food_bakery', 'food_processing',
    'office_professional', 'office_bpo', 'office_government',
    'res_detached', 'res_apartments', 'res_condominium',
    'ind_light_manufacturing', 'ind_heavy_manufacturing',
    'agri_crop_production', 'agri_livestock', 'agri_aquaculture', 'agri_processing',
    'tour_hotel', 'tour_resort', 'tour_recreation',
    'log_warehouse', 'log_distribution_center', 'log_transport_terminal',
    'inst_school', 'inst_hospital', 'inst_government_facility'
];

foreach ($requiredActivities as $act) {
    assertCondition(isset($allActivities[$act]), "Required activity '{$act}' is present in activity catalog");
}

// ---------------------------------------------------------
// 3. RULE ENGINE MATRIX & COMBINATIONS (522 Rules)
// ---------------------------------------------------------
echo "\n--- 3. Rule Engine Lookup & Combinations (522 Rules) ---\n";
$allRules = ZoningRulesEngine::getAllRules();
assertCondition(count($allRules) === 18, "All 18 districts mapped in rule table");

$totalCombinations = 0;
foreach ($allRules as $zoneCode => $actMap) {
    $totalCombinations += count($actMap);
}
assertCondition($totalCombinations === 522, "Exactly 18 × 29 = 522 combinations comprehensively mapped without gaps (found {$totalCombinations})");

// ---------------------------------------------------------
// 4. ELIGIBILITY GATING & SCORE VERIFICATION
// ---------------------------------------------------------
echo "\n--- 4. Eligibility Gate & Score Verification ---\n";

// A. Permitted: C-1 + retail_convenience -> 100 score, 15.00 IAI pts
$evalPermitted = ZoningRulesEngine::evaluate('C-1', 'retail_convenience');
assertCondition($evalPermitted['status'] === 'permitted', "C-1 + retail_convenience is Permitted");
assertCondition($evalPermitted['score'] === 100.0, "Permitted score is exactly 100.0");
assertCondition($evalPermitted['is_eligible'] === true, "Permitted use is eligible");
assertCondition($evalPermitted['iai_contribution'] === 15.00, "Permitted IAI contribution is exactly 15.00 pts (100 * 0.15)");
assertCondition($evalPermitted['source_priority'] === 1, "Source priority is 1 (Local Ordinance)");
assertCondition(str_contains($evalPermitted['ordinance_section'], '2018-06'), "Cites City Ordinance 2018-06");

// B. Conditional: R-1 + retail_convenience -> 70 provisional score, 10.50 IAI pts, conditions
$evalConditional = ZoningRulesEngine::evaluate('R-1', 'retail_convenience');
assertCondition($evalConditional['status'] === 'conditional', "R-1 + retail_convenience is Conditional");
assertCondition($evalConditional['score'] === 70.0, "Conditional provisional score is exactly 70.0");
assertCondition($evalConditional['is_eligible'] === true, "Conditional use is eligible (provisional)");
assertCondition($evalConditional['iai_contribution'] === 10.50, "Conditional IAI contribution is exactly 10.50 pts (70 * 0.15)");
assertCondition(!empty($evalConditional['restrictions']), "Conditional use provides required restrictions list");

// C. Prohibited: R-1 + ind_heavy_manufacturing -> 0 score, Not Suitable, IAI = null
$evalProhibited = ZoningRulesEngine::evaluate('R-1', 'ind_heavy_manufacturing');
assertCondition($evalProhibited['status'] === 'prohibited', "R-1 + ind_heavy_manufacturing is Prohibited");
assertCondition($evalProhibited['score'] === 0.0, "Prohibited score is 0.0");
assertCondition($evalProhibited['is_eligible'] === false, "Prohibited use is NOT eligible");
assertCondition($evalProhibited['suitability'] === 'not_suitable', "Prohibited suitability is 'not_suitable'");
assertCondition($evalProhibited['iai_contribution'] === null, "Prohibited IAI contribution is null");

// D. Undetermined: Missing or unrecognized zone -> status undetermined, score null, IAI = null
$evalUndetermined = ZoningRulesEngine::evaluate('UNKNOWN_ZONE', 'retail_convenience');
assertCondition($evalUndetermined['status'] === 'undetermined', "Unrecognized zone returns Undetermined");
assertCondition($evalUndetermined['score'] === null, "Undetermined score is null");
assertCondition($evalUndetermined['is_eligible'] === false, "Undetermined is NOT eligible");
assertCondition($evalUndetermined['suitability'] === 'incomplete', "Undetermined suitability is 'incomplete'");
assertCondition($evalUndetermined['iai_contribution'] === null, "Undetermined IAI contribution is null");

// E. Protected Zones: MRZ (Mangrove Sanctuary) + industrial -> Prohibited
$evalMRZ = ZoningRulesEngine::evaluate('MRZ', 'ind_light_manufacturing');
assertCondition($evalMRZ['status'] === 'prohibited', "Mangrove Sanctuary (MRZ) + industrial is strictly Prohibited");
assertCondition($evalMRZ['is_eligible'] === false, "Protected zone commercial/industrial is disqualified");

// F. Freeport Economic Zone (FEZ) + BPO -> Permitted under Masterplan
$evalFEZ = ZoningRulesEngine::evaluate('FEZ', 'office_bpo');
assertCondition($evalFEZ['status'] === 'permitted', "Poro Point Freeport (FEZ) + BPO is Permitted under Masterplan");
assertCondition($evalFEZ['score'] === 100.0, "FEZ Permitted score is 100.0");

// ---------------------------------------------------------
// 5. MCE COMPOSITE EVALUATION & CRITERIA WEIGHTS
// ---------------------------------------------------------
echo "\n--- 5. MCE Composite Integration & 15% Weight Retained ---\n";
$criteriaConfig = PropertyAssessmentService::getCriteriaConfig();
assertCondition(isset($criteriaConfig['zoning_compatibility']), "Zoning compatibility exists in MCE criteria config");
assertCondition($criteriaConfig['zoning_compatibility']['weight'] === 15.0, "Zoning compatibility weight is exactly 15.0% (found {$criteriaConfig['zoning_compatibility']['weight']}%)");

// Verify all 7 criteria sum to exactly 100%
$weights = PropertyAssessmentService::weights();
$weightSum = array_sum($weights);
assertCondition(abs($weightSum - 100.0) < 0.001, "All 7 MCE criteria weights sum to exactly 100.0% (sum: {$weightSum}%)");

// Test Composite Assessment with Permitted Zoning
$compPermitted = PropertyAssessmentService::evaluate([
    'spatial_accessibility' => 80.0,
    'infrastructure_readiness' => 85.0,
    'economic_viability' => 90.0,
    'nearby_businesses' => 75.0,
    'zoning_compatibility' => ['zone_code' => 'C-1', 'use_code' => 'retail_convenience'],
    'risk_constraints' => 80.0,
    'environmental_safety' => 80.0,
]);
$critMapPermitted = array_column($compPermitted['criteria'], null, 'key');
assertCondition($compPermitted['eligibility']['is_eligible'] === true, "Composite assessment with Permitted zoning is Eligible");
assertCondition($compPermitted['status'] === 'complete', "Assessment status is 'complete'");
assertCondition($compPermitted['iaiScore'] !== null, "IAI score is calculated: {$compPermitted['iaiScore']}");
assertCondition($critMapPermitted['zoning_compatibility']['score'] === 100.0, "Zoning criterion score in composite is 100.0");
assertCondition($critMapPermitted['zoning_compatibility']['weighted_score'] === 15.0, "Zoning weighted score in composite is 15.0 pts (100 * 0.15)");

// Test Composite Assessment with Conditional Zoning
$compConditional = PropertyAssessmentService::evaluate([
    'spatial_accessibility' => 80.0,
    'infrastructure_readiness' => 85.0,
    'economic_viability' => 90.0,
    'nearby_businesses' => 75.0,
    'zoning_compatibility' => ['zone_code' => 'R-1', 'use_code' => 'retail_convenience'],
    'risk_constraints' => 80.0,
    'environmental_safety' => 80.0,
]);
$critMapConditional = array_column($compConditional['criteria'], null, 'key');
assertCondition($compConditional['eligibility']['is_eligible'] === true, "Composite assessment with Conditional zoning is Eligible");
assertCondition($compConditional['status'] === 'conditional', "Assessment status is 'conditional'");
assertCondition($critMapConditional['zoning_compatibility']['score'] === 70.0, "Zoning criterion score in composite is 70.0");
assertCondition($critMapConditional['zoning_compatibility']['weighted_score'] === 10.5, "Zoning weighted score in composite is 10.5 pts (70 * 0.15)");

// Test Hard Gate: Composite Assessment with Prohibited Zoning -> Not Suitable, IAI = null
$compProhibited = PropertyAssessmentService::evaluate([
    'spatial_accessibility' => 80.0,
    'infrastructure_readiness' => 85.0,
    'economic_viability' => 90.0,
    'nearby_businesses' => 75.0,
    'zoning_compatibility' => ['zone_code' => 'R-1', 'use_code' => 'ind_heavy_manufacturing'],
    'risk_constraints' => 80.0,
    'environmental_safety' => 80.0,
]);
assertCondition($compProhibited['status'] === 'not_suitable', "Prohibited zoning triggers 'not_suitable' hard gate");
assertCondition($compProhibited['iaiScore'] === null, "Prohibited zoning withholds final IAI (iaiScore === null)");
assertCondition($compProhibited['mceScore'] === null, "Prohibited zoning withholds MCE score (mceScore === null)");
assertCondition(str_contains($compProhibited['reason'] ?? '', 'not permitted'), "Rejection reason explicitly states use is not permitted");

// Test Hard Gate: Composite Assessment with Undetermined Zoning -> Incomplete, IAI = null
$compUndetermined = PropertyAssessmentService::evaluate([
    'spatial_accessibility' => 80.0,
    'infrastructure_readiness' => 85.0,
    'economic_viability' => 90.0,
    'nearby_businesses' => 75.0,
    'zoning_compatibility' => ['zone_code' => 'MISSING_SOURCE', 'use_code' => 'retail_convenience'],
    'risk_constraints' => 80.0,
    'environmental_safety' => 80.0,
]);
assertCondition($compUndetermined['status'] === 'incomplete', "Undetermined zoning yields 'incomplete' status");
assertCondition($compUndetermined['iaiScore'] === null, "Undetermined zoning withholds final IAI (iaiScore === null)");

// ---------------------------------------------------------
// 6. DATABASE SEEDING & INTEGRITY
// ---------------------------------------------------------
echo "\n--- 6. Database Seeding & Schema Integrity ---\n";
if (isset($GLOBALS['pdo'])) {
    $pdo = $GLOBALS['pdo'];
    $seedResult = ZoningRulesEngine::seedOfficialRules($pdo);
    assertCondition($seedResult['zones_count'] === 18, "Database seeded with 18 zones");
    assertCondition($seedResult['rules_seeded'] === 522, "Database seeded with 522 zone-use rules");

    // Check database count
    $stmt = $pdo->query('SELECT COUNT(*) FROM clup_zone_use_rules');
    $dbRulesCount = (int) $stmt->fetchColumn();
    assertCondition($dbRulesCount >= 522, "Database contains {$dbRulesCount} active zone-use rules");

    // Verify foreign keys join cleanly
    $stmt = $pdo->query('
        SELECT r.permission_status, z.zone_code, u.code AS use_code, r.conditions_json
        FROM clup_zone_use_rules r
        JOIN clup_zones z ON r.zone_id = z.id
        JOIN clup_use_types u ON r.use_code = u.code
        WHERE z.zone_code = "C-1" AND u.code = "retail_convenience"
    ');
    $dbRule = $stmt->fetch(PDO::FETCH_ASSOC);
    assertCondition($dbRule !== false, "Joined rule for C-1 + retail_convenience exists in database");
    assertCondition($dbRule['permission_status'] === 'permitted', "Database permission is 'permitted'");
    $conds = json_decode($dbRule['conditions_json'] ?? '[]', true);
    assertCondition($conds['source_priority'] === 1, "Database rule confirms Priority 1 Local Ordinance");
}

echo "\n=========================================================\n";
echo "SUMMARY: {$passed} PASSED, {$failed} FAILED\n";
echo "=========================================================\n";

if ($failed > 0) {
    exit(1);
}
