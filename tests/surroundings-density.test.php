<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/SurroundingsRadar.php';

use App\Support\SurroundingsRadar;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException('Assertion failed: ' . $message); }
    $checks++;
};
$temporary = sys_get_temp_dir() . '/locus-density-' . bin2hex(random_bytes(8));
mkdir($temporary, 0700);
$lat = 16.6159;
$lng = 120.3209;
$north = static fn (float $meters): float => $lat + rad2deg($meters / 6371000);
$east = static fn (float $meters): float => $lng + rad2deg($meters / (6371000 * cos(deg2rad($lat))));
$point = static function (string $id, string $name, float $latitude, string $category = 'cafe', string $status = 'operating', string $note = '') use ($lng): array {
    return ['type' => 'Feature', 'id' => $id, 'geometry' => ['type' => 'Point', 'coordinates' => [$lng, $latitude]],
        'properties' => ['name' => $name, 'categoryKey' => $category, 'businessType' => $category, 'status' => $status, 'note' => $note]];
};
$emptyCollection = ['type' => 'FeatureCollection', 'features' => []];
$offline = static function (): array { throw new RuntimeException('Private provider connection error must not be exposed.'); };
$options = static function (string $name, callable $fetcher) use ($temporary): array {
    $directory = $temporary . '/' . $name;
    if (!is_dir($directory)) { mkdir($directory, 0700); }
    return ['cache_directory' => $directory . '/cache', 'data_directory' => $directory, 'fetcher' => $fetcher];
};

try {
    $check(SurroundingsRadar::queryParameters([]) === null, 'Legacy directory explicitly remains available without coordinates.');
    $parameters = SurroundingsRadar::queryParameters(['lat' => '0', 'lng' => '0', 'radius' => '500', 'type' => ' retail ']);
    $check($parameters === ['lat' => 0.0, 'lng' => 0.0, 'radius' => 500, 'type' => 'retail'], 'Valid zero coordinates and whole-meter radius preserve endpoint contract.');
    foreach ([['lat' => 16.6], ['lng' => 120.3], ['lat' => null, 'lng' => 120.3], ['lat' => [], 'lng' => 120.3],
        ['lat' => 'garbage', 'lng' => 120.3], ['lat' => '1e309', 'lng' => 120.3], ['lat' => 91, 'lng' => 120.3],
        ['lat' => 16.6, 'lng' => -181], ['lat' => 16.6, 'lng' => 120.3, 'radius' => 99],
        ['lat' => 16.6, 'lng' => 120.3, 'radius' => 1501], ['lat' => 16.6, 'lng' => 120.3, 'radius' => 500.5],
        ['lat' => 16.6, 'lng' => 120.3, 'radius' => []], ['lat' => 16.6, 'lng' => 120.3, 'radius' => '1e309']] as $query) {
        try { SurroundingsRadar::queryParameters($query); $check(false, 'Malformed nearby request must not return whole-city directory.'); }
        catch (InvalidArgumentException $expected) { $check(true, 'Invalid nearby reference/radius rejected before directory fallback.'); }
    }

    $fixtureOptions = $options('inventory', static fn (): array => ['elements' => [
        ['type' => 'node', 'id' => 1, 'lat' => $north(10), 'lon' => $lng, 'tags' => ['name' => 'Bean House', 'amenity' => 'cafe']],
        ['type' => 'node', 'id' => 2, 'lat' => $north(30), 'lon' => $lng, 'tags' => ['name' => 'Mapped Restaurant', 'amenity' => 'restaurant']],
        ['type' => 'node', 'id' => 3, 'lat' => $north(40), 'lon' => $lng, 'tags' => ['amenity' => 'cafe']],
        ['type' => 'node', 'id' => 4, 'lat' => $north(45), 'lon' => $lng, 'tags' => ['amenity' => 'cafe']],
        ['type' => 'node', 'id' => 5, 'lat' => $north(20), 'lon' => $lng, 'tags' => ['name' => 'Closed Cafe', 'amenity' => 'cafe', 'opening_hours' => 'closed']],
        ['type' => 'node', 'id' => 6, 'lat' => $north(500.5), 'lon' => $lng, 'tags' => ['name' => 'Beyond Boundary', 'amenity' => 'cafe']],
        ['type' => 'node', 'id' => 7, 'lat' => $north(20), 'lon' => $lng, 'tags' => ['name' => 'Disused Cafe', 'amenity' => 'cafe', 'disused' => 'yes']],
        ['type' => 'way', 'id' => 10, 'tags' => ['highway' => 'primary', 'name' => 'Crossing Road'],
            'geometry' => [['lat' => $lat, 'lon' => $east(-800)], ['lat' => $lat, 'lon' => $east(800)]]],
        ['type' => 'way', 'id' => 11, 'tags' => ['highway' => 'service', 'name' => 'Outside Road'],
            'geometry' => [['lat' => $north(700), 'lon' => $east(-800)], ['lat' => $north(700), 'lon' => $east(800)]]],
    ]]);
    file_put_contents($fixtureOptions['data_directory'] . '/competitors.json', json_encode(['type' => 'FeatureCollection', 'features' => [
        $point('locator-bean', 'Bean House', $lat),
        $point('locator-closed', 'Closed Local', $north(10), 'cafe', 'existing', 'Temporarily closed for renovation'),
    ]]));
    file_put_contents($fixtureOptions['data_directory'] . '/commercial-directory.json', json_encode(['type' => 'FeatureCollection', 'features' => [
        $point('directory-bean', 'Bean-House', $north(5)),
        $point('directory-bread', 'Bread Shop', $lat, 'bakery'),
        $point('directory-branch', 'Bean House Downtown Branch', $north(400)),
        $point('directory-hall', 'City Hall', $north(100), 'townhall'),
        $point('directory-closed', 'Permanently Closed Merchant', $lat, 'retail', 'permanently_closed'),
        $point('outside', 'Local Outside Circle', $north(500.5)),
    ]]));
    $result = SurroundingsRadar::search($lat, $lng, 500, 'cafe', $fixtureOptions);
    $names = array_column(array_column($result['features'], 'properties'), 'name');
    $check(count($result['features']) === 7, 'Merged inventory counts only unique in-circle, nonclosed places.');
    $check(in_array('Bread Shop', $names, true), 'Distinct colocated merchant is not lost through proximity deduplication.');
    $check(in_array('Bean House Downtown Branch', $names, true), 'Separate same-brand branch remains counted.');
    $check(count(array_filter($names, static fn ($name): bool => $name === 'Bean House' || $name === 'Bean-House')) === 1, 'Locator, directory and OSM records of one shop count once.');
    $check(count(array_filter($names, static fn ($name): bool => $name === 'Local Cafe')) === 2, 'Unnamed nearby shops are not collapsed into a fabricated shared identity.');
    $check(!in_array('Closed Cafe', $names, true) && !in_array('Disused Cafe', $names, true) && !in_array('Closed Local', $names, true), 'Closed status, note, hours and disused records are excluded.');
    $check(!in_array('Beyond Boundary', $names, true) && !in_array('Local Outside Circle', $names, true), 'A point half a meter beyond 500m is excluded from both sources.');
    $check($result['metrics']['observedPlaceCount'] === 7 && $result['metrics']['observedBusinessCount'] === 6, 'Civic amenities remain places but do not inflate observed business counts.');
    $check(count(array_filter($result['features'], static fn ($feature): bool => $feature['properties']['isBusiness'])) === 6, 'Explicit per-feature business flag supports exact client radius refiltering.');
    $check($result['metrics']['observedOperatingBusinessCount'] === 3, 'Mapped businesses with unknown operating status do not become confirmed operating businesses.');
    $check(abs($result['metrics']['searchAreaSqKm'] - M_PI * 0.25) < 0.00000001, 'Density denominator converts meters to square kilometers before calculating circle area.');
    $check($result['metrics']['observedBusinessesPerSqKm'] === round(6 / (M_PI * 0.25), 2), 'Observed density uses unique business count divided by correct area.');
    $check($result['metrics']['businessesPerSqKm'] === null && !$result['metrics']['completeInventory'], 'Incomplete mapped inventory does not invent authoritative operating-business density.');
    $check($result['coverage'] === 'mapped_only' && $result['radiusMeters'] === 500 && $result['center'] === [$lat, $lng], 'Response states exact reference point, meters and incomplete mapped coverage.');
    $check(count($result['roads']['geojson']['features']) === 1 && $result['metrics']['roadSegmentCount'] === 1, 'Road crossing circle counts even with endpoints outside; entirely outside road does not.');
    $check($result['roads']['geojson']['features'][0]['properties']['distanceMeters'] === 0.0, 'Road proximity measures segment distance, not distance to nearest endpoint.');

    $cacheOptions = $options('cache', $offline);
    $cached = ['type' => 'FeatureCollection', 'features' => [$point('near', 'Cached Cafe', $north(50)), $point('far', 'Cached Outside', $north(500.5))],
        'roads' => ['status' => 'Available', 'geojson' => $emptyCollection], 'center' => [1, 2], 'radius' => 1500,
        'coverage' => 'complete', 'source' => 'Fixture', 'cached' => false, 'stale' => false];
    mkdir($cacheOptions['cache_directory']);
    $cachePath = $cacheOptions['cache_directory'] . sprintf('/radar_v2_%.6f_%.6f_500.json', $lat, $lng);
    file_put_contents($cachePath, json_encode($cached));
    $fresh = SurroundingsRadar::search($lat, $lng, 500, 'cafe', $cacheOptions);
    $check($fresh['cached'] && !$fresh['stale'] && count($fresh['features']) === 1, 'Fresh cached records are revalidated and filtered to current radius.');
    $check($fresh['center'] === [$lat, $lng] && $fresh['radius'] === 500, 'Stored cache center and radius never replace requested reference.');
    $check(abs($fresh['features'][0]['properties']['distanceMeters'] - 50) < 0.1, 'Cached distances are recomputed against actual reference point.');
    $check($fresh['coverage'] === 'mapped_only' && !$fresh['metrics']['completeInventory'], 'Legacy complete cache label cannot bypass inventory completeness.');
    $cacheBeforeLocal = file_get_contents($cachePath);
    file_put_contents($cacheOptions['data_directory'] . '/commercial-directory.json', json_encode(['type' => 'FeatureCollection', 'features' => [
        $point('local-fast', 'Immediate Local Cafe', $north(80)), $point('local-far', 'Outside Local Cafe', $north(600)),
    ]]));
    $localFetches = 0;
    $localOnly = SurroundingsRadar::search($lat, $lng, 500, 'cafe', array_replace($cacheOptions, [
        'local_only' => true,
        'fetcher' => static function () use (&$localFetches): array { $localFetches++; return ['elements' => []]; },
    ]));
    $check($localFetches === 0, 'Immediate local search never waits for the live provider.');
    $check(array_column(array_column($localOnly['features'], 'properties'), 'name') === ['Immediate Local Cafe'], 'Immediate search filters the local directory to the exact radius instead of returning another provider cache.');
    $check($localOnly['metrics']['observedBusinessCount'] === 1 && $localOnly['coverage'] === 'local_only', 'Immediate inventory supplies truthful calculated metrics.');
    $check($localOnly['screening']['is_complete'] && !$localOnly['screening']['is_verified'], 'Local inventory supplies a separate provisional screening score.');
    $check($localOnly['screening']['observations']['counts']['businesses'] === 1 && $localOnly['screening']['observations']['business_type'] === 'cafe', 'Screening uses the filtered inventory and selected business profile.');
    $check($localOnly['roads']['status'] === 'Unavailable', 'Local directory cannot claim live road coverage.');
    $check(file_get_contents($cachePath) === $cacheBeforeLocal, 'Immediate local lookup never overwrites a live-provider cache.');
    unlink($cacheOptions['data_directory'] . '/commercial-directory.json');
    touch($cachePath, time() - 90000);
    clearstatcache(true, $cachePath);
    $stale = SurroundingsRadar::search($lat, $lng, 500, 'cafe', $cacheOptions);
    $check($stale['cached'] && $stale['stale'] && count($stale['features']) === 1, 'Exact-reference stale fallback retains correct filtering.');
    $check(!str_contains($stale['warning'], 'Private provider'), 'Provider internals never leak into stale-result explanation.');
    $shifted = SurroundingsRadar::search($north(3), $lng, 500, 'cafe', $cacheOptions);
    $check(!$shifted['cached'] && count($shifted['features']) === 0, 'A nearby point sharing four-decimal key cannot reuse a different search circle.');
    $check($shifted['center'] === [$north(3), $lng], 'Small reference-point change is preserved precisely.');
    $check(str_contains($shifted['warning'], 'does not establish zero'), 'Offline empty inventory explains unavailable coverage instead of claiming zero businesses.');

    $fetches = 0;
    $precisionOptions = $options('precision', static function () use (&$fetches): array { $fetches++; return ['elements' => []]; });
    SurroundingsRadar::search($lat, $lng, 500, 'cafe', $precisionOptions);
    SurroundingsRadar::search($north(3), $lng, 500, 'cafe', $precisionOptions);
    $check($fetches === 2, 'Sub-four-decimal reference movements produce independent searches.');
    $liveEmpty = SurroundingsRadar::search($lat, $lng, 1000, 'cafe', $precisionOptions);
    $check($liveEmpty['metrics']['observedBusinessesPerSqKm'] === 0.0 && $liveEmpty['metrics']['businessesPerSqKm'] === null, 'Empty successful map query distinguishes observed zero from unknown complete density.');
    $check($liveEmpty['screening']['score'] === null, 'Empty observations cannot produce a screening rating.');
    $check(abs($liveEmpty['metrics']['searchAreaSqKm'] - M_PI) < 0.00000001, 'A 1000m search circle covers pi square kilometers.');
    $partial = SurroundingsRadar::search($lat, $lng, 500, 'cafe', $options('partial', static fn (): array => ['elements' => [], 'remark' => 'runtime error: timeout']));
    $check(str_contains((string) $partial['warning'], 'partial'), 'Provider partial response is disclosed.');
    $malformed = SurroundingsRadar::search($lat, $lng, 500, 'cafe', $options('malformed', static fn (): array => ['elements' => 'invalid']));
    $check($malformed['coverage'] === 'local_only' && $malformed['roads']['status'] === 'Unavailable', 'Malformed provider response becomes truthful unavailable coverage.');

    echo "Surroundings density checks passed: {$checks}\n";
} finally {
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($temporary, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($files as $file) {
        if ($file->isDir()) { rmdir($file->getPathname()); } else { unlink($file->getPathname()); }
    }
    rmdir($temporary);
}
