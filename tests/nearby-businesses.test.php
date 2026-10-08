<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/app/Support/NearbyBusinesses.php';

use App\Support\NearbyBusinesses;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) {
        throw new RuntimeException("Assertion failed: $message");
    }
    $checks++;
};

echo "=== Running LOCUS-SF Nearby Businesses Verification Suite ===\n";

// 1. Directory integrity
$dir = NearbyBusinesses::directory();
$check(count($dir) > 50, 'Directory should contain real San Fernando business records');
$sample = reset($dir);
$check(isset($sample['name'], $sample['category'], $sample['lat'], $sample['lng'], $sample['icon']), 'Record contains all required display fields');

// 2. Empty or invalid coordinates
$empty1 = NearbyBusinesses::find(0.0, 0.0);
$check(empty($empty1), '0,0 coordinates return empty array');

$empty2 = NearbyBusinesses::find(['lat' => null, 'lng' => null]);
$check(empty($empty2), 'null property coordinates return empty array');

// 3. Known property coordinates in downtown San Fernando (e.g., Property 10: 16.6175, 120.3190)
$results = NearbyBusinesses::find(16.6175, 120.3190, 8, 1500.0);
$check(count($results) > 0, 'Found nearby businesses within 1.5km of downtown property');
$check(count($results) <= 8, 'Limit was respected');

// 4. Sorted ascending by distance
for ($i = 1; $i < count($results); $i++) {
    $check($results[$i]['distanceMeters'] >= $results[$i - 1]['distanceMeters'], 'Results must be sorted ascending by distance');
}

// 5. Check formatting
$closest = $results[0];
$check(is_string($closest['distanceFormatted']) && $closest['distanceFormatted'] !== '', 'distanceFormatted is populated');
$check(is_string($closest['walkingFormatted']) && $closest['walkingFormatted'] !== '', 'walkingFormatted is populated');
$check(is_int($closest['walkingMinutes']) && $closest['walkingMinutes'] >= 1, 'walkingMinutes is a positive integer');
$check(in_array($closest['status'], ['operating', 'under_development'], true), 'status is valid');

// 6. Property array overload
$propResults = NearbyBusinesses::find(['lat' => 16.6175, 'lng' => 120.3190], null, 5);
$check(count($propResults) === min(5, count($results)), 'Array overload matches direct coordinate query');

echo "Nearby Businesses checks passed: {$checks}\n";
