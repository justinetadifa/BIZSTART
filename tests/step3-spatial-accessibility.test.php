<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/Support/PropertyAssessmentService.php';
require_once __DIR__ . '/../app/Support/PropertyAssessment.php';

use App\Support\PropertyAssessmentService;
use App\Support\PropertyAssessment;

echo "=== Running LOCUS-SF Step 3 Spatial Accessibility Verification Tests ===\n\n";

$passCount = 0;

function assertCondition(bool $cond, string $msg): void {
    global $passCount;
    if (!$cond) {
        echo "❌ FAIL: {$msg}\n";
        exit(1);
    }
    $passCount++;
    echo "✅ PASS: {$msg}\n";
}

// 1. Methodology Version & Centrally Configurable Rules
$version = PropertyAssessmentService::SPATIAL_ACCESSIBILITY_VERSION;
assertCondition(strpos($version, 'Provisional') !== false, 'Methodology version is marked as Provisional');
assertCondition(isset(PropertyAssessmentService::SPATIAL_ACCESSIBILITY_SUBCRITERIA['road_access']), 'Road access subcriterion configured');
assertCondition(isset(PropertyAssessmentService::SPATIAL_ACCESSIBILITY_SUBCRITERIA['road_surface_passability']), 'Road surface subcriterion configured');
assertCondition(isset(PropertyAssessmentService::SPATIAL_ACCESSIBILITY_SUBCRITERIA['carriageway_width']), 'Carriageway width subcriterion configured');
assertCondition(isset(PropertyAssessmentService::SPATIAL_ACCESSIBILITY_SUBCRITERIA['distance_to_major_road']), 'Distance to major road subcriterion configured');

// Verify weights sum to 1.0 (100%)
$weights = PropertyAssessmentService::SPATIAL_ACCESSIBILITY_SUBCRITERIA;
$sumWeights = $weights['road_access']['weight'] + $weights['road_surface_passability']['weight'] +
              $weights['carriageway_width']['weight'] + $weights['distance_to_major_road']['weight'];
assertCondition(abs($sumWeights - 100.0) < 0.0001, 'Internal subcriteria weights sum to exactly 100% (30% + 25% + 25% + 20%)');

// 2. Complete Example Calculation
// Road Access: frontage (100 * 0.30 = 30)
// Road Surface: paved (100 * 0.25 = 25)
// Usable Carriageway Width: 6m (100 * 0.25 = 25)
// Distance to major road: 250m (85 * 0.20 = 17)
// Total = 30 + 25 + 25 + 17 = 97.0 / 100
// IAI Contribution (25% MCE weight) = 97.0 * 0.25 = 24.25
$completeInput = [
    'road_access' => 'frontage',
    'road_surface_passability' => 'paved',
    'carriageway_width' => 6.0,
    'distance_to_major_road' => 250.0
];
$resultComplete = PropertyAssessmentService::evaluateSpatialAccessibility($completeInput);
assertCondition($resultComplete['is_complete'] === true, 'Complete input marks is_complete = true');
assertCondition(abs($resultComplete['score'] - 97.0) < 0.01, 'Complete input scores exactly 97.0/100');
assertCondition(abs($resultComplete['iai_contribution'] - 24.25) < 0.01, 'Complete input contributes exactly 24.25 points to IAI');
assertCondition($resultComplete['verification_status'] === 'applicant_reported', 'Applicant input produces preliminary applicant_reported status');
assertCondition(count($resultComplete['missing_subcriteria']) === 0, 'No missing subcriteria in complete input');

// Check subcriteria breakdown
$sub = $resultComplete['subcriteria'];
assertCondition($sub['road_access']['score'] === 100.0 && $sub['road_access']['weighted_score'] === 30.0, 'Road access score = 100, weighted = 30.0');
assertCondition($sub['road_surface_passability']['score'] === 100.0 && $sub['road_surface_passability']['weighted_score'] === 25.0, 'Road surface score = 100, weighted = 25.0');
assertCondition($sub['carriageway_width']['score'] === 100.0 && $sub['carriageway_width']['weighted_score'] === 25.0, 'Carriageway width score = 100, weighted = 25.0');
assertCondition($sub['distance_to_major_road']['score'] === 85.0 && $sub['distance_to_major_road']['weighted_score'] === 17.0, 'Distance score = 85, weighted = 17.0');

// 3. Partial Conditions Calculation
// Road Access: frontage (100 * 0.30 = 30)
// Road Surface: unpaved (40 * 0.25 = 10)
// Usable Carriageway Width: 2m (50 * 0.25 = 12.5)
// Distance to major road: 250m (85 * 0.20 = 17)
// Total = 30 + 10 + 12.5 + 17 = 69.5 / 100
// IAI Contribution = 69.5 * 0.25 = 17.38
$partialInput = [
    'road_access' => 'frontage',
    'road_surface_passability' => 'unpaved',
    'carriageway_width' => 2.0,
    'distance_to_major_road' => 250.0
];
$resultPartial = PropertyAssessmentService::evaluateSpatialAccessibility($partialInput);
assertCondition($resultPartial['is_complete'] === true, 'Partial input with all valid answers is complete');
assertCondition(abs($resultPartial['score'] - 69.5) < 0.01, 'Partial input scores exactly 69.5/100');
assertCondition(abs($resultPartial['iai_contribution'] - 17.38) < 0.01, 'Partial input contributes exactly 17.38 points to IAI');

// 4. Missing Inputs Handling
$missingInput = [
    'road_access' => 'frontage',
    'road_surface_passability' => 'paved',
    'carriageway_width' => null, // missing width!
    'distance_to_major_road' => 250.0
];
$resultMissing = PropertyAssessmentService::evaluateSpatialAccessibility($missingInput);
assertCondition($resultMissing['is_complete'] === false, 'Missing width marks is_complete = false');
assertCondition($resultMissing['score'] === null, 'Missing width produces score = null (Assessment incomplete)');
assertCondition($resultMissing['iai_contribution'] === null, 'Missing width produces iai_contribution = null');
assertCondition(in_array('carriageway_width', $resultMissing['missing_keys'], true), 'missing_keys lists carriageway_width');
assertCondition(in_array('Usable carriageway width', $resultMissing['missing_subcriteria'], true), 'missing_subcriteria lists Usable carriageway width');

// 5. Unknown Selection Handling
$unknownInput = [
    'road_access' => 'unknown',
    'road_surface_passability' => 'paved',
    'carriageway_width' => 6.0,
    'distance_to_major_road' => 100.0
];
$resultUnknown = PropertyAssessmentService::evaluateSpatialAccessibility($unknownInput);
assertCondition($resultUnknown['is_complete'] === false, 'Unknown road access marks is_complete = false');
assertCondition($resultUnknown['score'] === null, 'Unknown road access produces score = null');
assertCondition(in_array('road_access', $resultUnknown['missing_keys'], true), 'missing_keys lists road_access');
assertCondition(in_array('Road access', $resultUnknown['missing_subcriteria'], true), 'missing_subcriteria lists Road access');

// 6. Usable Carriageway Width Bands
$widthCases = [
    [10.0, 100.0],
    [6.0, 100.0],
    [5.9, 80.0],
    [4.0, 80.0],
    [3.9, 50.0],
    [2.0, 50.0],
    [1.9, 20.0],
    [1.0, 20.0],
    [0.5, 20.0]
];
foreach ($widthCases as [$width, $expectedScore]) {
    $res = PropertyAssessmentService::evaluateSpatialAccessibility([
        'road_access' => 'frontage',
        'road_surface_passability' => 'paved',
        'carriageway_width' => $width,
        'distance_to_major_road' => 100.0
    ]);
    assertCondition($res['subcriteria']['carriageway_width']['score'] === $expectedScore, "Width {$width}m correctly scores {$expectedScore}");
}

// 7. Major Road Proximity Bands
$distCases = [
    [50.0, 100.0],
    [200.0, 100.0],
    [201.0, 85.0],
    [500.0, 85.0],
    [501.0, 65.0],
    [1000.0, 65.0],
    [1001.0, 40.0],
    [2500.0, 40.0]
];
foreach ($distCases as [$dist, $expectedScore]) {
    $res = PropertyAssessmentService::evaluateSpatialAccessibility([
        'road_access' => 'frontage',
        'road_surface_passability' => 'paved',
        'carriageway_width' => 6.0,
        'distance_to_major_road' => $dist
    ]);
    assertCondition($res['subcriteria']['distance_to_major_road']['score'] === $expectedScore, "Distance {$dist}m correctly scores {$expectedScore}");
}

// 8. GIS Measurement Preference & Verification Status
$resGis = PropertyAssessmentService::evaluateSpatialAccessibility($completeInput, ['is_verified' => true]);
assertCondition($resGis['verification_status'] === 'verified', 'Verified option sets verification_status = verified');

// 9. Backward Compatibility with Legacy Scalar Distance in normalizeCriterion
$legacyRes50 = PropertyAssessmentService::normalizeCriterion('spatial_accessibility', 50.0);
assertCondition(abs($legacyRes50 - 100.0) < 0.01, 'Legacy scalar distance 50m normalizes to 100.0 score');
$legacyRes150 = PropertyAssessmentService::normalizeCriterion('spatial_accessibility', 150.0);
assertCondition(abs($legacyRes150 - 85.0) < 0.01, 'Legacy scalar distance 150m normalizes to 85.0 score');

// 10. PropertyAssessment Facade delegates properly
$facadeRes = PropertyAssessment::evaluateSpatialAccessibility($completeInput);
assertCondition($facadeRes['score'] === $resultComplete['score'], 'PropertyAssessment facade delegates correctly to PropertyAssessmentService');

echo "\n=======================================================\n";
echo "  All {$passCount} PHP Spatial Accessibility Tests Passed Successfully!\n";
echo "=======================================================\n";
