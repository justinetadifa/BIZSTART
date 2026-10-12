<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

use App\Support\RiskConstraintsEngine;
use App\Support\PropertyAssessmentService;
use App\Support\PropertyAssessment;
use App\Support\PropertyCatalog;
use App\Support\PropertyParcel;

$testsPassed = 0;
$testsFailed = 0;

function assertCondition(bool $condition, string $message): void {
    global $testsPassed, $testsFailed;
    if ($condition) {
        $testsPassed++;
        echo "PASS: {$message}\n";
    } else {
        $testsFailed++;
        echo "FAIL: {$message}\n";
    }
}

echo "=== Running LOCUS-SF Step 3 Risk Constraints & 6-Criterion MCE Test Suite ===\n\n";

// 1. ENGINE & METADATA TESTS
echo "--- 1. Engine & Methodology Metadata ---\n";
assertCondition(RiskConstraintsEngine::WEIGHT === 15.0, "RiskConstraintsEngine overall MCE weight is 15.0%");
assertCondition(str_contains(RiskConstraintsEngine::VERSION, 'v2.0'), "RiskConstraintsEngine version reflects v2.0");
assertCondition(count(RiskConstraintsEngine::SUBCRITERIA) === 6, "RiskConstraintsEngine defines exactly 6 subcriteria");

$subcriteriaWeights = 0.0;
foreach (RiskConstraintsEngine::SUBCRITERIA as $key => $meta) {
    $subcriteriaWeights += $meta['weight'];
}
assertCondition(abs($subcriteriaWeights - 100.0) < 0.001, "Internal subcriteria weights sum to exactly 100.0% ({$subcriteriaWeights}%)");

assertCondition(RiskConstraintsEngine::SUBCRITERIA['flood_susceptibility']['weight'] === 25.0, "Flood Susceptibility weight is 25.0%");
assertCondition(RiskConstraintsEngine::SUBCRITERIA['flood_susceptibility']['agency'] === 'DENR-MGB', "Flood Susceptibility attributed to DENR-MGB");

assertCondition(RiskConstraintsEngine::SUBCRITERIA['active_fault']['weight'] === 25.0, "Active Fault / Ground Rupture weight is 25.0%");
assertCondition(RiskConstraintsEngine::SUBCRITERIA['active_fault']['agency'] === 'DOST-PHIVOLCS', "Active Fault attributed to DOST-PHIVOLCS");

assertCondition(RiskConstraintsEngine::SUBCRITERIA['landslide_susceptibility']['weight'] === 15.0, "Landslide Susceptibility weight is 15.0%");
assertCondition(RiskConstraintsEngine::SUBCRITERIA['landslide_susceptibility']['agency'] === 'DENR-MGB', "Landslide Susceptibility attributed to DENR-MGB");

assertCondition(RiskConstraintsEngine::SUBCRITERIA['storm_surge']['weight'] === 15.0, "Storm Surge Exposure weight is 15.0%");
assertCondition(RiskConstraintsEngine::SUBCRITERIA['storm_surge']['agency'] === 'DOST-PAGASA', "Storm Surge attributed to DOST-PAGASA");

assertCondition(RiskConstraintsEngine::SUBCRITERIA['liquefaction_susceptibility']['weight'] === 10.0, "Liquefaction Susceptibility weight is 10.0%");
assertCondition(RiskConstraintsEngine::SUBCRITERIA['liquefaction_susceptibility']['agency'] === 'DOST-PHIVOLCS', "Liquefaction Susceptibility attributed to DOST-PHIVOLCS");

assertCondition(RiskConstraintsEngine::SUBCRITERIA['tsunami_exposure']['weight'] === 10.0, "Tsunami Exposure weight is 10.0%");
assertCondition(RiskConstraintsEngine::SUBCRITERIA['tsunami_exposure']['agency'] === 'DOST-PHIVOLCS', "Tsunami Exposure attributed to DOST-PHIVOLCS");

// 2. PROVISIONAL SUSCEPTIBILITY-TO-SUITABILITY SCORING SCALE
echo "\n--- 2. Susceptibility-to-Suitability Scoring Scale ---\n";
assertCondition(RiskConstraintsEngine::normalizeSusceptibility('none') === 100.0, "Confirmed no mapped exposure scores 100.0");
assertCondition(RiskConstraintsEngine::normalizeSusceptibility('outside_mapped') === 100.0, "Outside mapped hazard scores 100.0");
assertCondition(RiskConstraintsEngine::normalizeSusceptibility('low') === 85.0, "Low susceptibility scores 85.0");
assertCondition(RiskConstraintsEngine::normalizeSusceptibility('moderate') === 60.0, "Moderate susceptibility scores 60.0");
assertCondition(RiskConstraintsEngine::normalizeSusceptibility('high') === 25.0, "High susceptibility scores 25.0");
assertCondition(RiskConstraintsEngine::normalizeSusceptibility('very_high') === 0.0, "Very high susceptibility scores 0.0");
assertCondition(RiskConstraintsEngine::normalizeSusceptibility(null) === null, "Null susceptibility returns null (never assumed zero or safe)");
assertCondition(RiskConstraintsEngine::normalizeSusceptibility('') === null, "Empty string returns null");

// 3. ACTIVE FAULT GROUND RUPTURE CRITICAL CONSTRAINT
echo "\n--- 3. Active Fault Critical Site Constraint ---\n";
$faultConflictInput = [
    'flood_susceptibility' => 'none', // 100
    'active_fault' => 'conflict',     // 0 (triggers critical constraint)
    'landslide_susceptibility' => 'none', // 100
    'storm_surge' => 'none',         // 100
    'liquefaction_susceptibility' => 'none', // 100
    'tsunami_exposure' => 'none',    // 100
];
$faultConflictResult = RiskConstraintsEngine::evaluate($faultConflictInput);
assertCondition($faultConflictResult['has_critical_constraint'] === true, "Active fault conflict sets has_critical_constraint to true");
assertCondition(!empty($faultConflictResult['critical_constraint']), "Active fault conflict includes descriptive critical_constraint message");
assertCondition(str_contains($faultConflictResult['critical_constraint'], 'CRITICAL SITE CONSTRAINT'), "Message contains CRITICAL SITE CONSTRAINT");
assertCondition(str_contains($faultConflictResult['critical_constraint'], 'DOST-PHIVOLCS'), "Message attributes to DOST-PHIVOLCS");
// Score without fault is 75.0 (since fault is 0 out of 25 pts, other 75 pts are full)
assertCondition($faultConflictResult['score'] === 75.0, "Composite score accurately calculated as 75.0 without cancelling critical flag");
assertCondition($faultConflictResult['iai_contribution'] === 11.25, "15% MCE contribution is 11.25 pts (75 * 0.15)");

// Test active fault buffer corridor conflict
$faultBufferInput = [
    'flood_susceptibility' => 'low',
    'active_fault' => 'within_buffer',
    'landslide_susceptibility' => 'low',
    'storm_surge' => 'low',
    'liquefaction_susceptibility' => 'low',
    'tsunami_exposure' => 'low',
];
$faultBufferResult = RiskConstraintsEngine::evaluate($faultBufferInput);
assertCondition($faultBufferResult['has_critical_constraint'] === true, "within_buffer triggers has_critical_constraint = true");
assertCondition($faultBufferResult['subcriteria']['active_fault']['score'] === 0.0, "Active fault within buffer scores 0.0");

// 4. UNASSESSED / MISSING DATA INTEGRITY (NO FABRICATED CLEARANCES)
echo "\n--- 4. Data Completeness & Missing Indicator Integrity ---\n";
$incompleteInput = [
    'flood_susceptibility' => 'low',
    'active_fault' => 'low',
    // landslide missing
    'storm_surge' => 'low',
    'liquefaction_susceptibility' => 'low',
    'tsunami_exposure' => null, // tsunami unassessed
];
$incompleteResult = RiskConstraintsEngine::evaluate($incompleteInput);
assertCondition($incompleteResult['is_complete'] === false, "Incomplete input sets is_complete to false");
assertCondition($incompleteResult['score'] === null, "Incomplete input results in null composite score");
assertCondition($incompleteResult['iai_contribution'] === null, "Incomplete input results in null IAI contribution");
assertCondition(count($incompleteResult['missing_indicators']) === 2, "Missing indicators count is 2");
assertCondition(in_array('Landslide Susceptibility', $incompleteResult['missing_indicators'], true), "Landslide listed as missing");
assertCondition(in_array('Tsunami Exposure', $incompleteResult['missing_indicators'], true), "Tsunami listed as missing");
assertCondition(str_contains($incompleteResult['explanation'], 'Missing verified coverage'), "Explanation notes missing verified coverage");

// 5. PERFECT SITE / ALL CLEAR SCREENING
echo "\n--- 5. All Clear Multi-Hazard Screening ---\n";
$clearInput = [
    'flood_susceptibility' => 'none',
    'active_fault' => 'none',
    'landslide_susceptibility' => 'none',
    'storm_surge' => 'none',
    'liquefaction_susceptibility' => 'none',
    'tsunami_exposure' => 'none',
];
$clearResult = RiskConstraintsEngine::evaluate($clearInput);
assertCondition($clearResult['is_complete'] === true, "Complete clear input is_complete is true");
assertCondition($clearResult['score'] === 100.0, "All clear scores 100.0");
assertCondition($clearResult['iai_contribution'] === 15.0, "15% MCE contribution is exactly 15.0 pts");
assertCondition($clearResult['has_critical_constraint'] === false, "No critical constraint on clear parcel");
assertCondition(empty($clearResult['high_hazard_warnings']), "No high hazard warnings on clear parcel");

// 6. HIGH HAZARD WARNING PROPAGATION
echo "\n--- 6. High Hazard Warning Propagation ---\n";
$highHazardsInput = [
    'flood_susceptibility' => 'high', // 25
    'active_fault' => '500m-5km',     // 60
    'landslide_susceptibility' => 'high', // 25
    'storm_surge' => 'moderate',     // 60
    'liquefaction_susceptibility' => 'low', // 85
    'tsunami_exposure' => 'high',     // 25
];
$highHazardsResult = RiskConstraintsEngine::evaluate($highHazardsInput);
assertCondition($highHazardsResult['is_complete'] === true, "High hazards input is complete");
// Weights:
// flood: 25 * 0.25 = 6.25
// fault: 60 * 0.25 = 15.00
// landslide: 25 * 0.15 = 3.75
// storm surge: 60 * 0.15 = 9.00
// liquefaction: 85 * 0.10 = 8.50
// tsunami: 25 * 0.10 = 2.50
// Total = 6.25 + 15.00 + 3.75 + 9.00 + 8.50 + 2.50 = 45.0
assertCondition($highHazardsResult['score'] === 45.0, "High hazards composite score is 45.0");
assertCondition($highHazardsResult['iai_contribution'] === 6.75, "High hazards 15% MCE contribution is 6.75 pts (45 * 0.15)");
assertCondition(count($highHazardsResult['high_hazard_warnings']) === 3, "High hazard warnings identified 3 elevated hazards");
assertCondition(str_contains(implode('; ', $highHazardsResult['high_hazard_warnings']), 'Flood Susceptibility'), "Flood warned as elevated hazard");
assertCondition(str_contains(implode('; ', $highHazardsResult['high_hazard_warnings']), 'Landslide Susceptibility'), "Landslide warned as elevated hazard");
assertCondition(str_contains(implode('; ', $highHazardsResult['high_hazard_warnings']), 'Tsunami Exposure'), "Tsunami warned as elevated hazard");

// 7. SIX-CRITERION MCE ARCHITECTURE & WEIGHT SUM
echo "\n--- 7. Six-Criterion MCE Weights Configuration ---\n";
$defaultConfig = PropertyAssessmentService::DEFAULT_CRITERIA_CONFIG;
$activeCriteria = array_filter($defaultConfig, static fn ($c) => !empty($c['is_active']));
assertCondition(count($activeCriteria) === 6, "Exactly 6 active criteria in PropertyAssessmentService::DEFAULT_CRITERIA_CONFIG");

$activeSum = 0.0;
foreach ($activeCriteria as $key => $meta) {
    $activeSum += (float) $meta['weight'];
}
assertCondition(abs($activeSum - 100.0) < 0.001, "Active criteria weights sum to exactly 100.0% ({$activeSum}%)");

assertCondition($defaultConfig['spatial_accessibility']['weight'] === 20.0, "Spatial Accessibility weight is 20.0%");
assertCondition($defaultConfig['infrastructure_readiness']['weight'] === 20.0, "Infrastructure Readiness weight is 20.0%");
assertCondition($defaultConfig['economic_viability']['weight'] === 20.0, "Economic Viability weight is 20.0%");
assertCondition($defaultConfig['nearby_businesses']['weight'] === 10.0, "Nearby Businesses weight is 10.0%");
assertCondition($defaultConfig['zoning_compatibility']['weight'] === 15.0, "Zoning Compatibility weight is 15.0%");
assertCondition($defaultConfig['risk_constraints']['weight'] === 15.0, "Risk Constraints weight is 15.0%");
assertCondition($defaultConfig['environmental_safety']['weight'] === 0.0, "Environmental Safety weight is 0.0%");
assertCondition($defaultConfig['environmental_safety']['is_active'] === false, "Environmental Safety is_active is false");
assertCondition($defaultConfig['environmental_safety']['is_required'] === false, "Environmental Safety is_required is false");

// PropertyAssessment::WEIGHTS
assertCondition(count(PropertyAssessment::WEIGHTS) === 6, "PropertyAssessment::WEIGHTS contains exactly 6 criteria");
assertCondition(array_sum(PropertyAssessment::WEIGHTS) === 100, "PropertyAssessment::WEIGHTS sum is 100");
assertCondition(PropertyAssessment::WEIGHTS['risk_constraints'] === 15, "PropertyAssessment::WEIGHTS['risk_constraints'] is 15");

// PropertyCatalog::criteria()
$catalogActive = PropertyCatalog::criteria();
assertCondition(count($catalogActive) === 6, "PropertyCatalog::criteria() returns 6 active criteria by default");
assertCondition(!isset($catalogActive['environmental_safety']), "PropertyCatalog::criteria() excludes environmental_safety");
$catalogAll = PropertyCatalog::criteria(true);
assertCondition(count($catalogAll) === 7, "PropertyCatalog::criteria(true) includes legacy 7 criteria");
assertCondition(isset($catalogAll['environmental_safety']), "PropertyCatalog::criteria(true) includes environmental_safety");

// 8. FULL SIX-CRITERION PROPERTY ASSESSMENT COMPOSITE EVALUATION
echo "\n--- 8. Full Six-Criterion Property Assessment Evaluation ---\n";
$fullEvaluationInput = [
    'spatial_accessibility' => 80.0,       // 20% -> 16.0 pts
    'infrastructure_readiness' => 70.0,    // 20% -> 14.0 pts
    'economic_viability' => 85.0,          // 20% -> 17.0 pts
    'nearby_businesses' => 60.0,           // 10% -> 6.0 pts
    'zoning_compatibility' => 100.0,       // 15% -> 15.0 pts
    'risk_constraints' => [                // 15%
        'flood_susceptibility' => 'low',   // 85 * 0.25 = 21.25
        'active_fault' => 'low',           // 85 * 0.25 = 21.25
        'landslide_susceptibility' => 'none', // 100 * 0.15 = 15.00
        'storm_surge' => 'low',            // 85 * 0.15 = 12.75
        'liquefaction_susceptibility' => 'low', // 85 * 0.10 = 8.50
        'tsunami_exposure' => 'none',      // 100 * 0.10 = 10.00
        // Risk subtotal = 21.25 + 21.25 + 15.00 + 12.75 + 8.50 + 10.00 = 88.75 -> 88.8 / 100
        // Risk MCE contribution (15%) = 88.8 * 0.15 = 13.32 pts
    ],
];

$assessmentResult = PropertyAssessmentService::evaluateAssessment($fullEvaluationInput);
assertCondition($assessmentResult['is_complete'] === true, "Assessment is complete without requiring environmental_safety");
assertCondition($assessmentResult['methodology_version'] === PropertyAssessmentService::METHODOLOGY_VERSION, "Methodology version is LOCUS-SF MCE v2.0 (Provisional 6-Criterion)");
assertCondition(count($assessmentResult['scores']) === 6, "Scores array has 6 active criteria");
assertCondition(!isset($assessmentResult['scores']['environmental_safety']), "Scores array does not contain environmental_safety");

// Check MCE calculation:
// 16.0 + 14.0 + 17.0 + 6.0 + 15.0 + 13.31 = 81.31
assertCondition(isset($assessmentResult['iai_score']), "Assessment has iai_score calculated");
assertCondition($assessmentResult['iai_score'] > 80.0 && $assessmentResult['iai_score'] < 83.0, "IAI score is in expected ~81.3 pts range ({$assessmentResult['iai_score']})");

// 9. LEGACY ASSESSMENT PRESERVATION TEST
echo "\n--- 9. Legacy 7-Criterion Assessment Preservation ---\n";
$legacyAssessmentInput = [
    'spatial_accessibility' => 80.0,
    'infrastructure_readiness' => 70.0,
    'economic_viability' => 80.0,
    'nearby_businesses' => 60.0,
    'zoning_compatibility' => 70.0,
    'risk_constraints' => 80.0,
    'environmental_safety' => 75.0,
];
$legacyWeights = [
    'spatial_accessibility' => 20.0,
    'infrastructure_readiness' => 20.0,
    'economic_viability' => 20.0,
    'nearby_businesses' => 10.0,
    'zoning_compatibility' => 10.0,
    'risk_constraints' => 10.0,
    'environmental_safety' => 10.0,
];
$legacyResult = PropertyAssessmentService::evaluateAssessment($legacyAssessmentInput, [
    'weights' => $legacyWeights,
    'methodology' => PropertyAssessmentService::LEGACY_METHODOLOGY_VERSION,
]);
assertCondition($legacyResult['methodology_version'] === PropertyAssessmentService::LEGACY_METHODOLOGY_VERSION, "Legacy methodology version preserved as LOCUS-SF MCE v1.1 (Legacy 7-Criterion)");
assertCondition(isset($legacyResult['scores']['environmental_safety']), "Legacy calculation retains environmental_safety");
assertCondition($legacyResult['scores']['environmental_safety'] === 75.0, "Legacy environmental_safety score preserved");

// 10. PROPERTY PARCEL CONTEXT HAZARD LAYERS
echo "\n--- 10. PropertyParcel Hazard Layers ---\n";
$testConfig = [
    'data_directory' => __DIR__ . '/../data',
    'layers' => [],
];
$parcelContext = PropertyParcel::context($testConfig);
$expectedLayers = ['flood', 'faults', 'landslide', 'storm_surge', 'liquefaction', 'tsunami', 'roads'];
foreach ($expectedLayers as $layerKey) {
    assertCondition(isset($parcelContext[$layerKey]), "PropertyParcel::context recognizes layer '{$layerKey}'");
    assertCondition(isset($parcelContext[$layerKey]['status']), "Layer '{$layerKey}' has status defined");
    assertCondition(isset($parcelContext[$layerKey]['geojson']), "Layer '{$layerKey}' has GeoJSON FeatureCollection");
}

echo "\n=======================================================\n";
echo "SUMMARY: {$testsPassed} PASSED, {$testsFailed} FAILED\n";
echo "=======================================================\n";

if ($testsFailed > 0) {
    exit(1);
}
