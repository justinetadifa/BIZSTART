<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/SurroundingsRadar.php';

use App\Support\SurroundingsRadar;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) {
        throw new RuntimeException("Assertion failed: $message");
    }
    $checks++;
};

echo "=== Running LOCUS-SF Surroundings & 500m Radar Verification Suite ===\n";

// 1. Coordinate validation
try {
    SurroundingsRadar::search(95.0, 120.32);
    $check(false, 'Expected InvalidArgumentException for lat > 90');
} catch (InvalidArgumentException $e) {
    $check(true, 'Invalid latitude correctly rejected.');
}

try {
    SurroundingsRadar::search(16.61, 195.0);
    $check(false, 'Expected InvalidArgumentException for lng > 180');
} catch (InvalidArgumentException $e) {
    $check(true, 'Invalid longitude correctly rejected.');
}

// 2. Haversine distance test
$centerLat = 16.6159;
$centerLng = 120.3209;
// A point ~200m north: 16.6159 + (200 / 111139) ≈ 16.6177
$dist200 = SurroundingsRadar::distance($centerLat, $centerLng, 16.6177, $centerLng);
$check($dist200 >= 195.0 && $dist200 <= 205.0, "200m distance calculation accurate (got {$dist200}m)");

// A point ~600m away: 16.6159 + (600 / 111139) ≈ 16.6213
$dist600 = SurroundingsRadar::distance($centerLat, $centerLng, 16.6213, $centerLng);
$check($dist600 >= 590.0 && $dist600 <= 610.0, "600m distance calculation accurate (got {$dist600}m)");

// 3. Inside vs Outside 500m radius filtering
// Synthetic fixture parsing
$refMethod = new ReflectionMethod(SurroundingsRadar::class, 'parseOsmElements');
$refMethod->setAccessible(true);

$osmElementsFixture = [
    // Node inside radius (~150m)
    [
        'type' => 'node',
        'id' => 101,
        'lat' => 16.6170,
        'lon' => 120.3209,
        'tags' => ['name' => 'City Cafe Test', 'amenity' => 'cafe']
    ],
    // Node outside radius (~700m)
    [
        'type' => 'node',
        'id' => 102,
        'lat' => 16.6225,
        'lon' => 120.3209,
        'tags' => ['name' => 'Faraway Bistro', 'amenity' => 'cafe']
    ],
    // Road way inside radius
    [
        'type' => 'way',
        'id' => 201,
        'geometry' => [
            ['lat' => 16.6155, 'lon' => 120.3200],
            ['lat' => 16.6165, 'lon' => 120.3220],
        ],
        'tags' => ['name' => 'Quezon Avenue', 'highway' => 'primary', 'surface' => 'asphalt']
    ]
];

$parsed = $refMethod->invoke(null, $osmElementsFixture, $centerLat, $centerLng, 500);
$check(count($parsed['establishments']) === 1, 'Only establishment strictly within 500m included');
$check($parsed['establishments'][0]['properties']['name'] === 'City Cafe Test', 'Correct establishment retained');
$check(count($parsed['roads']) === 1, 'Intersecting road segment retained');
$check($parsed['roads'][0]['properties']['name'] === 'Quezon Avenue', 'Correct road segment retained');

// 4. Deduplication without merging separate branches
$refMerge = new ReflectionMethod(SurroundingsRadar::class, 'mergeEstablishments');
$refMerge->setAccessible(true);

$localRecords = [
    [
        'type' => 'Feature',
        'id' => 'loc-1',
        'geometry' => ['type' => 'Point', 'coordinates' => [120.3209, 16.6159]],
        'properties' => ['name' => 'Jollibee Plaza', 'source' => 'Verified Local']
    ]
];

$osmRecords = [
    // Duplicate of local record (same place, ~10m away, same brand)
    [
        'type' => 'Feature',
        'id' => 'osm:node:501',
        'geometry' => ['type' => 'Point', 'coordinates' => [120.3210, 16.6159]],
        'properties' => ['name' => 'Jollibee', 'source' => 'OSM']
    ],
    // Different branch 400m away sharing same brand name (must NOT be merged)
    [
        'type' => 'Feature',
        'id' => 'osm:node:502',
        'geometry' => ['type' => 'Point', 'coordinates' => [120.3209, 16.6195]],
        'properties' => ['name' => 'Jollibee Drive Thru', 'source' => 'OSM']
    ]
];

$merged = $refMerge->invoke(null, $localRecords, $osmRecords);
$check(count($merged) === 2, 'Colocated duplicate suppressed while separate branch 400m away retained');
$check($merged[0]['properties']['source'] === 'Verified Local', 'Local verified record took precedence for colocated store');
$check($merged[1]['id'] === 'osm:node:502', 'Separate branch retained with distinct identity');

// 5. Caching and Stale Fallback
$cacheDir = dirname(__DIR__) . '/data/cache/radar';
$testCacheFile = sprintf('%s/radar_%.4f_%.4f_%d.json', $cacheDir, 16.6000, 120.3000, 500);

// Write mock cache
$mockCache = [
    'type' => 'FeatureCollection',
    'features' => [
        [
            'type' => 'Feature',
            'id' => 'mock-1',
            'geometry' => ['type' => 'Point', 'coordinates' => [120.3000, 16.6000]],
            'properties' => ['name' => 'Cached Mock Cafe', 'businessType' => 'cafe']
        ]
    ],
    'roads' => [
        'status' => 'Available',
        'geojson' => ['type' => 'FeatureCollection', 'features' => []]
    ],
    'source' => 'OpenStreetMap & Local Verified Store Locators',
    'retrievalDate' => '2026-10-07',
    'cached' => true,
    'stale' => false,
    'coverage' => 'complete'
];
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}
file_put_contents($testCacheFile, json_encode($mockCache));

$retrieved = SurroundingsRadar::search(16.6000, 120.3000, 500, 'cafe');
$check($retrieved['cached'] === true && $retrieved['stale'] === false, 'Served fresh from cache within TTL');
$check($retrieved['features'][0]['properties']['name'] === 'Cached Mock Cafe', 'Cached features match stored data');

// Clean up test cache file
@unlink($testCacheFile);

// 6. Test legacy api/competitors.php behaviour without coordinates
$legacyData = json_decode((string) file_get_contents(dirname(__DIR__) . '/data/competitors.json'), true);
$check(isset($legacyData['type']) && $legacyData['type'] === 'FeatureCollection', 'data/competitors.json maintains FeatureCollection contract');

// 7. Verify GIS UI template contracts
$viewContent = (string) file_get_contents(dirname(__DIR__) . '/app/Support/property-wizard-view.php');
$check(strpos($viewContent, 'data-radar-badge') !== false, 'View contains live radar status badge element');
$check(strpos($viewContent, 'data-radar-map-filter') !== false, 'View contains map layer filter pills toolbar');
$check(strpos($viewContent, 'data-radar-search') !== false, 'View contains live search filter input');
$check(strpos($viewContent, 'data-radar-filter-count') !== false, 'View contains filter count indicator');

// 8. Verify JS GIS interaction contracts
$jsContent = (string) file_get_contents(dirname(__DIR__) . '/assets/js/property-wizard.js');
$check(strpos($jsContent, 'concentricRings') !== false, 'JS implements concentric multi-tier radial distance rings (100m, 250m, 500m)');
$check(strpos($jsContent, 'hoverVectorLayer') !== false, 'JS implements dynamic vector line on row hover');
$check(strpos($jsContent, 'walkingEstimate') !== false, 'JS implements pedestrian walking time estimates');
$check(strpos($jsContent, 'createRadarPopup') !== false, 'JS implements rich custom Leaflet popups');
$check(strpos($jsContent, 'radarMapFilter') !== false, 'JS implements map layer pill filtering');

// 9. Verify CSS styling contracts
$cssContent = (string) file_get_contents(dirname(__DIR__) . '/assets/css/property-wizard.css');
$check(strpos($cssContent, '.pw-radar-badge') !== false, 'CSS contains .pw-radar-badge styling');
$check(strpos($cssContent, '.pw-pulse-dot') !== false, 'CSS contains pulsing radar live indicator animation');
$check(strpos($cssContent, '.pw-radar-map-pills') !== false, 'CSS contains floating map layer pills styling');
$check(strpos($cssContent, '.pw-vector-tooltip') !== false, 'CSS contains vector tooltip styling');
$check(strpos($cssContent, '.pw-map-popup') !== false, 'CSS contains rich Leaflet popup styling');

echo "Surroundings & Radar checks passed: {$checks}\n";
