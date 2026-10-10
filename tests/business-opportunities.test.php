<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/app/Support/BusinessOpportunities.php';
require_once dirname(__DIR__) . '/app/Support/PropertyAssessment.php';

use App\Support\BusinessOpportunities;
use App\Support\PropertyAssessment;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) {
        throw new RuntimeException("Assertion failed: $message");
    }
    $checks++;
};

echo "=== Running LOCUS-SF Business Opportunities & Matching Test Suite ===\n";

// 1. Catalog integrity check
$catalog = BusinessOpportunities::catalog();
$check(count($catalog) >= 15, "Catalog contains comprehensive profiles (got " . count($catalog) . ")");
$profileIds = array_column($catalog, 'id');

// Required business types check
$requiredTypes = [
    'convenience_store', 'grocery', 'bakery', 'eatery', 'cafe',
    'printing', 'school_supplies', 'laundry', 'water_refilling',
    'salon_barbershop', 'repair_shop', 'courier', 'hardware',
    'accommodation', 'tour_services',
];
foreach ($requiredTypes as $reqType) {
    $check(in_array($reqType, $profileIds, true), "Catalog contains required business: {$reqType}");
}

// 2. Draft rule status check (seed relationships marked draft requiring validation)
foreach ($catalog as $item) {
    $check($item['reviewStatus'] === 'draft', "Seed relationship {$item['id']} marked as draft");
    $check(!empty($item['version']), "Profile {$item['id']} has explicit version");
    $check(!empty($item['ruleSource']), "Profile {$item['id']} has rule source");
    $check(isset(BusinessOpportunities::SECTORS[$item['sector']]), "Profile {$item['id']} belongs to valid sector");
    $check(!empty($item['activityCenters']), "Profile {$item['id']} specifies relevant activity centers");
    $check(!empty($item['explanationTemplate']), "Profile {$item['id']} specifies explanation template");
}

// 3. Test Evaluation on a sample property with known anchors
$plazaProperty = [
    'id' => 10,
    'name' => 'Commercial Lot Near City Hall',
    'lat' => 16.6159,
    'lng' => 120.3209,
    'area' => 0.05, // 500 sqm
    'clupProfile' => ['zoningClassification' => 'General Commercial'],
    'utilities' => ['electricity', 'water', 'telecom'],
    'nearbyBusinesses' => [
        [
            'id' => 'anchor-1',
            'name' => 'City Hall of San Fernando',
            'category' => 'Local Government & Public Hall',
            'categoryKey' => 'townhall',
            'categoryGroup' => 'civic',
            'lat' => 16.6162,
            'lng' => 120.3212,
            'source' => 'City Commercial Registry',
            'date' => '2026-01-01',
            'status' => 'operating',
        ],
        [
            'id' => 'anchor-2',
            'name' => 'Saint Louis College',
            'category' => 'College & Higher Education',
            'categoryKey' => 'college',
            'categoryGroup' => 'education',
            'lat' => 16.6175,
            'lng' => 120.3215,
            'source' => 'City Commercial Registry',
            'date' => '2026-01-01',
            'status' => 'operating',
        ],
        [
            'id' => 'duplicate-anchor',
            'name' => 'Saint Louis College',
            'category' => 'College & Higher Education',
            'categoryKey' => 'college',
            'categoryGroup' => 'education',
            'lat' => 16.61751,
            'lng' => 120.32152,
            'source' => 'OpenStreetMap',
            'date' => '2026-01-01',
            'status' => 'operating',
        ],
        [
            'id' => 'far-anchor',
            'name' => 'Faraway Industrial Plant',
            'category' => 'Heavy Industrial',
            'categoryKey' => 'industrial',
            'lat' => 16.6260, // ~1.1km away
            'lng' => 120.3209,
            'source' => 'City Commercial Registry',
            'date' => '2026-01-01',
            'status' => 'operating',
        ],
    ],
    'criteriaDetails' => [
        'risk_constraints' => ['raw' => ['hazard_status' => 'low']],
        'zoning_compatibility' => ['raw' => ['zoning_status' => 'permitted']],
    ],
];

// 4. Test Radius boundary enforcement (500m)
$eval500 = BusinessOpportunities::evaluate($plazaProperty, 500.0);
$check($eval500['status'] === 'supported', "Evaluation returns supported opportunities");
$check($eval500['radiusMeters'] === 500, "Radius is recorded as 500m");
$check(str_contains($eval500['screeningRadiusLabel'], '500-meter straight-line screening radius'), "Explicit straight-line label used");
$check(str_contains($eval500['analysisOrigin'], '16.6159'), "Analysis origin coordinates shown");

// Check deduplication: duplicate 'Saint Louis College' should be merged/deduped
$check($eval500['totalPlacesInRadius'] === 2, "Places in 500m radius deduplicated (got {$eval500['totalPlacesInRadius']})");

// 5. Check Never Force Three Results (at most 3 supported matches)
$check(count($eval500['supportedMatches']) <= 3, "Never exceeds 3 supported suggestions");
$check(count($eval500['supportedMatches']) >= 1, "At least 1 candidate generated from townhall & college");

// 6. Check Competitor wording: "No competitors recorded in this dataset" when count is 0
$firstMatch = $eval500['supportedMatches'][0];
$check(!empty($firstMatch['explanation']), "Match has evidence-based explanation");
$check(!empty($firstMatch['statusLabel']), "Match has status label (Draft screening · Unvalidated)");
$check(!empty($firstMatch['mainUnresolvedNotice']), "Match has main unresolved requirement notice");
if ($firstMatch['competitorsCount'] === 0) {
    $check($firstMatch['competitorsNotice'] === 'No competitors recorded in this dataset', "Competitor notice does not claim no competition");
}

// 7. Test Zoning Conflict Exclusion
$industrialOnlyProperty = $plazaProperty;
$industrialOnlyProperty['clupProfile']['zoningClassification'] = 'Heavy Industrial Zone';
$evalIndustrial = BusinessOpportunities::evaluate($industrialOnlyProperty, 500.0);
// Retail & Eatery should be excluded from recommendations due to Heavy Industrial zoning
$supportedIds = array_column($evalIndustrial['supportedMatches'], 'id');
$check(!in_array('eatery', $supportedIds, true), "Eatery excluded from Heavy Industrial property");
$check(!in_array('convenience_store', $supportedIds, true), "Convenience store excluded from Heavy Industrial property");
$check(count($evalIndustrial['confirmedConflicts']) > 0, "Confirmed conflicts are logged and explained");

// 8. Test Unknown / Missing Evidence handling
$unrecordedProperty = [
    'id' => 99,
    'name' => 'Unrecorded Land',
    'lat' => 16.6159,
    'lng' => 120.3209,
    'area' => null,
    'clupProfile' => ['zoningClassification' => null],
    'utilities' => null,
    'nearbyBusinesses' => $plazaProperty['nearbyBusinesses'],
];
$evalMissing = BusinessOpportunities::evaluate($unrecordedProperty, 500.0);
if (!empty($evalMissing['supportedMatches'])) {
    $missingSample = $evalMissing['supportedMatches'][0];
    $check($missingSample['areaStatus'] === 'Unknown (unrecorded)', "Missing area labeled Unknown");
    $check(in_array('Utility connections unconfirmed', $missingSample['missingEvidence'], true), "Missing utilities labeled unconfirmed");
}

// 9. Test Zero results (no anchors in radius)
$isolatedProperty = [
    'id' => 100,
    'name' => 'Isolated Parcel',
    'lat' => 16.5000,
    'lng' => 120.2000,
    'nearbyBusinesses' => [],
];
$evalEmpty = BusinessOpportunities::evaluate($isolatedProperty, 500.0);
$check(count($evalEmpty['supportedMatches']) === 0, "Never forces 3 results when no evidence supports matches");
$check($evalEmpty['status'] === 'no_candidates', "Status indicates no candidates");

// 10. Verify MCE / IAI formulas remain completely unmodified
$sampleRatings = ['spatial_accessibility' => 80, 'infrastructure_readiness' => 80, 'economic_viability' => 80,
    'nearby_businesses' => 80, 'zoning_compatibility' => 80, 'risk_constraints' => 80, 'environmental_safety' => 80];
$assessment = PropertyAssessment::scores($sampleRatings);
$check($assessment['mceScore'] === 80.0, "MCE score formula unchanged (expected 80.0)");
$check($assessment['iaiScore'] === 80.0, "IAI score formula unchanged (expected 80.0)");

echo "✅ ALL BUSINESS OPPORTUNITIES CHECKS PASSED: $checks assertions verified.\n";
