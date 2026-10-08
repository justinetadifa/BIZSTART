<?php
declare(strict_types=1);

/**
 * Verification test for:
 * 1. Print Dossier & Executive Information formatting
 * 2. Nearby Businesses directory, calculation, and UI integration
 */

require_once dirname(__DIR__) . '/app/Support/NearbyBusinesses.php';

use App\Support\NearbyBusinesses;

$failures = 0;
$checks = 0;

function assertCheck(bool $condition, string $message): void {
    global $failures, $checks;
    $checks++;
    if (!$condition) {
        $failures++;
        echo "❌ FAIL: {$message}\n";
    } else {
        echo "✅ PASS: {$message}\n";
    }
}

echo "=== Verifying Print Information & Nearby Businesses ===\n\n";

// 1. Verify NearbyBusinesses class against City Hall / Plaza coordinates
$plazaLat = 16.6158;
$plazaLng = 120.3168;

$nearby = NearbyBusinesses::find($plazaLat, $plazaLng, 12, 1500.0);
assertCheck(is_array($nearby) && count($nearby) > 0, "NearbyBusinesses::find returns commercial establishments for City Plaza area");
assertCheck(count($nearby) <= 12, "NearbyBusinesses respects maximum limit of 12");

// Check ascending distance order
$lastDistance = -1;
$isSorted = true;
foreach ($nearby as $biz) {
    if ($biz['distanceMeters'] < $lastDistance) {
        $isSorted = false;
        break;
    }
    $lastDistance = $biz['distanceMeters'];
}
assertCheck($isSorted, "Nearby businesses are ordered by ascending distance");

// Check required schema fields
$first = $nearby[0] ?? [];
assertCheck(!empty($first['name']), "First business has a non-empty name ('{$first['name']}')");
assertCheck(!empty($first['category']), "First business has a readable category ('{$first['category']}')");
assertCheck(!empty($first['distanceFormatted']), "First business has formatted distance ('{$first['distanceFormatted']}')");
assertCheck(!empty($first['walkingFormatted']), "First business has formatted walking time ('{$first['walkingFormatted']}')");
assertCheck(!empty($first['icon']), "First business has an icon ('{$first['icon']}')");
assertCheck(!empty($first['categoryColor']), "First business has a color class ('{$first['categoryColor']}')");
assertCheck(is_float($first['lat']) && is_float($first['lng']), "First business has numeric coordinates");

// 2. Verify API response decoration
$apiUrl = 'http://localhost/sfcelerate-bizstart/api/property.php?id=10';
$rawApiResponse = @file_get_contents($apiUrl);
if ($rawApiResponse !== false) {
    $apiData = json_decode($rawApiResponse, true);
    assertCheck(is_array($apiData) && isset($apiData['property']), "API returns valid property payload");
    $prop = $apiData['property'] ?? [];
    assertCheck(isset($prop['nearbyBusinesses']) && is_array($prop['nearbyBusinesses']), "API decorates property with 'nearbyBusinesses'");
    assertCheck(count($prop['nearbyBusinesses']) > 0, "Property 10 has nearby businesses populated");
} else {
    echo "⚠️ NOTICE: Local HTTP server not reachable via file_get_contents; skipping live HTTP check.\n";
}

// 3. Verify CSS Print Media Rules in assets/css/city-minimal.css
$cssPath = dirname(__DIR__) . '/assets/css/city-minimal.css';
assertCheck(file_exists($cssPath), "city-minimal.css exists");
$cssContent = file_get_contents($cssPath);

assertCheck(strpos($cssContent, '@media print') !== false, "CSS contains @media print rules");
assertCheck(strpos($cssContent, 'size: A4 portrait') !== false, "CSS specifies A4 portrait page size");
assertCheck(strpos($cssContent, '.city-print-dossier-header') !== false, "CSS defines .city-print-dossier-header");
assertCheck(strpos($cssContent, '.city-print-dossier-footer') !== false, "CSS defines .city-print-dossier-footer");
assertCheck(strpos($cssContent, '.city-print-trigger-btn') !== false, "CSS defines .city-print-trigger-btn");
assertCheck(strpos($cssContent, '.nearby-businesses-section') !== false, "CSS defines .nearby-businesses-section");
assertCheck(strpos($cssContent, 'print-color-adjust: exact') !== false, "CSS forces print color fidelity");

// 4. Verify JavaScript Integration in assets/js/city-workspace.js
$jsPath = dirname(__DIR__) . '/assets/js/city-workspace.js';
assertCheck(file_exists($jsPath), "city-workspace.js exists");
$jsContent = file_get_contents($jsPath);

assertCheck(strpos($jsContent, 'function printHeaderMarkup') !== false, "city-workspace.js defines printHeaderMarkup");
assertCheck(strpos($jsContent, 'function printFooterMarkup') !== false, "city-workspace.js defines printFooterMarkup");
assertCheck(strpos($jsContent, 'function printButtonMarkup') !== false, "city-workspace.js defines printButtonMarkup");
assertCheck(strpos($jsContent, 'function nearbyBusinessesMarkup') !== false, "city-workspace.js defines nearbyBusinessesMarkup");
assertCheck(strpos($jsContent, 'window.print()') !== false, "city-workspace.js binds window.print()");
assertCheck(strpos($jsContent, 'data-locate-biz') !== false, "city-workspace.js binds map locate handler");

// 5. Verify property-details.php print navigation handling
$phpDetailsPath = dirname(__DIR__) . '/property-details.php';
$phpDetailsContent = file_get_contents($phpDetailsPath);
assertCheck(strpos($phpDetailsContent, 'print:tw-hidden') !== false, "property-details.php hides navigation during print");

echo "\nVerification Summary: {$checks} checks, {$failures} failures.\n";
if ($failures > 0) {
    exit(1);
}
echo "All print formatting and nearby businesses checks passed successfully!\n";
