<?php
declare(strict_types=1);

// Unit coverage deliberately avoids bootstrap.php, migrations and a database.
require_once __DIR__ . '/../app/Support/helpers.php';
require_once __DIR__ . '/../app/Support/SimpleCache.php';
require_once __DIR__ . '/../app/Support/PropertyCatalog.php';
require_once __DIR__ . '/../app/Support/ExternalServices.php';

use App\Support\ExternalServices;
use App\Support\SimpleCache;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $checks++;
};
$offline = new ExternalServices([], []);

foreach (['Calabugao', 'Barangay Calabugao', 'Baranggay Calabugao', 'Brgy. Calabugao', 'Bgy Calabugao', 'Calabugao, San Fernando City, La Union', 'Calabugao · East Upland'] as $query) {
    $search = $offline->geocodeSearch($query, [
        ['id' => 10, 'name' => 'Calabugao listing', 'barangay' => 'Calabugao', 'lat' => 16.616596, 'lng' => 120.317211],
    ]);
    $result = $search['results'][0] ?? [];
    $check(($result['kind'] ?? '') === 'barangay' && ($result['barangay'] ?? '') === 'Calabugao', 'Canonical barangay must lead: ' . $query);
    $check(($result['lat'] ?? null) === 16.6215 && ($result['lng'] ?? null) === 120.3892, 'Barangay search must use its reference, never an unrelated listing pin: ' . $query);
    $check(($result['approximate'] ?? false) === true && ($result['accuracy'] ?? '') === 'barangay_center' && isset($result['source']), 'Barangay accuracy and source must be explicit.');
    $check(!isset($result['bounds']), 'Local reference points must not claim invented barangay boundaries.');
}

foreach (['Barangay I' => 'Barangay I', 'Barangay II' => 'Barangay II', 'Barangay III' => 'Barangay III', 'Barangay IV' => 'Barangay IV', 'Brgy 4' => 'Barangay IV', 'Barangay 2' => 'Barangay II'] as $query => $expected) {
    $results = $offline->geocodeSearch($query)['results'];
    $check(count($results) === 1 && $results[0]['barangay'] === $expected, 'Numbered barangays must not match substrings of other Roman numerals: ' . $query);
    $check($results[0]['label'] === $expected, 'Avoid duplicated Barangay labels.');
}
$check(($offline->geocodeSearch('Sibuan Otong')['results'][0]['barangay'] ?? null) === 'Sibuan-Otong', 'Spaces and hyphens must normalize consistently.');
$partial = $offline->geocodeSearch('Dalumpinas')['results'];
$check(count($partial) === 2 && $partial[0]['match'] === 'partial' && $partial[1]['match'] === 'partial', 'Ambiguous searches must expose both matches for selection.');
$check($offline->geocodeSearch('Cal')['results'][0]['barangay'] === 'Calabugao', 'Prefix matching must find Calabugao.');
$check($offline->geocodeSearch('not-an-existing-barangay')['results'] === [], 'Unknown names must not resolve to arbitrary barangays.');
$check($offline->geocodeSearch('')['results'] === [], 'Empty searches must not expose arbitrary listings.');

$listing = ['id' => 34, 'name' => 'Zambrano Building', 'barangay' => 'Catbangen', 'lat' => 16.616596, 'lng' => 120.317211];
$propertyResult = $offline->geocodeSearch('Zambrano', [$listing])['results'][0];
$check($propertyResult['kind'] === 'property' && $propertyResult['propertyId'] === 34 && !isset($propertyResult['barangay']), 'A named property must remain a property result, not a barangay navigation target.');
$check($propertyResult['lat'] === $listing['lat'] && $propertyResult['lng'] === $listing['lng'], 'Listing search must preserve all entered coordinate digits.');
$invalidListing = $listing;
$invalidListing['lat'] = 14.61;
$check($offline->geocodeSearch('Zambrano', [$invalidListing])['results'] === [], 'Exclude listings outside the local search viewport.');

$cacheDirectory = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'locus-location-tests-' . bin2hex(random_bytes(6));
$cache = new SimpleCache($cacheDirectory);
$configured = new ExternalServices(['services' => [
    'cache' => ['path' => $cacheDirectory],
    'location' => ['locationiq_key' => 'test-fixtures-only'],
]], []);

try {
    // Exact local queries must return without attempting a network request,
    // even when live geocoding is configured and its cache is empty.
    $exact = $configured->geocodeSearch('Baranggay Calabugao');
    $check($exact['live'] === false && $exact['results'][0]['barangay'] === 'Calabugao', 'Exact local search must be network-independent.');

    $query = 'Civic Plaza';
    $cacheKey = 'location-sf-v2-' . sha1(mb_strtolower($query . ', San Fernando, La Union, Philippines'));
    $entry = [
        'lat' => '16.615852', 'lon' => '120.316482',
        'display_name' => 'Civic Plaza, San Fernando, La Union, Philippines',
        'address' => ['city' => 'San Fernando', 'state' => 'La Union', 'country_code' => 'ph'],
        'boundingbox' => ['16.6158', '16.616', '120.3164', '120.3166'],
    ];
    $outside = array_replace($entry, ['lat' => '15.032', 'lon' => '120.69']);
    $otherCity = array_replace($entry, ['address' => ['city' => 'San Juan', 'state' => 'La Union', 'country_code' => 'ph']]);
    $otherCountry = array_replace($entry, ['address' => ['country_code' => 'us']]);
    $notFinite = array_replace($entry, ['lat' => 'NaN']);
    $malformedBounds = array_replace($entry, ['lat' => '16.62', 'boundingbox' => ['16.7', '16.4', '120.7', '120.1']]);
    $cache->put($cacheKey, [$entry, $entry, $outside, $otherCity, $otherCountry, $notFinite, $malformedBounds], 600);

    $live = $configured->geocodeSearch($query);
    $check($live['live'] === true && count($live['results']) === 2, 'Provider results must reject duplicates, invalid coordinates and nonlocal matches.');
    $check($live['results'][0]['bounds'] === [[16.6158, 120.3164], [16.616, 120.3166]], 'Convert provider bounds to Leaflet latitude/longitude corners.');
    $check(!isset($live['results'][1]['bounds']), 'Malformed provider bounds must be omitted.');
    $check($live['results'][0]['source'] === 'LocationIQ' && $live['results'][0]['accuracy'] === 'geocoded_reference' && $live['results'][0]['approximate'], 'Provider coordinates must retain their source and reference accuracy.');
    $check($live['results'][0]['lat'] === 16.615852 && $live['results'][0]['lng'] === 120.316482, 'Provider coordinates must retain their decimal precision.');

    $firstUsersListing = array_replace($listing, ['name' => 'Civic Plaza private listing']);
    $first = $configured->geocodeSearch($query, [$firstUsersListing]);
    $second = $configured->geocodeSearch($query, []);
    $check($first['results'][0]['kind'] === 'property', 'Current caller local matches must appear with cached provider results.');
    $check(count(array_filter($second['results'], static fn (array $result): bool => $result['kind'] === 'property')) === 0, 'A shared geocode cache must not retain another caller’s property results.');
    $check($cache->get($cacheKey)[0] === $entry, 'The shared cache must contain only raw external results.');

    $failedQuery = 'Unavailable civic address';
    $failedKey = 'location-sf-v2-' . sha1(mb_strtolower($failedQuery . ', San Fernando, La Union, Philippines'));
    $cache->put($failedKey, ['error' => 'Provider unavailable'], 600);
    $failed = $configured->geocodeSearch($failedQuery);
    $check($failed['live'] === false && str_contains($failed['note'], 'Barangay search still works') && !isset($failed['error']), 'Provider failure must preserve local fallback and avoid exposing service internals.');
    $check($configured->geocodeSearch('Calabugao')['results'][0]['barangay'] === 'Calabugao', 'Barangay search must still work after provider failure.');
} finally {
    foreach (glob($cacheDirectory . DIRECTORY_SEPARATOR . '*.json') ?: [] as $file) {
        unlink($file);
    }
    if (is_dir($cacheDirectory)) {
        rmdir($cacheDirectory);
    }
}

echo "Location search: {$checks} checks passed.\n";
