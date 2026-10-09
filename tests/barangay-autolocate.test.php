<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/Support/PropertyCatalog.php';

use App\Support\PropertyCatalog;
use App\Support\ExternalServices;

$passed = 0;
$total = 0;

function assertCheck(bool $condition, string $message): void {
    global $passed, $total;
    $total++;
    if (!$condition) {
        echo "❌ FAIL: {$message}\n";
        exit(1);
    }
    $passed++;
    echo "✅ PASS: {$message}\n";
}

echo "=== Verifying Barangay Auto-Locate and Coordinate Resolution ===\n\n";

// 1. Data integrity
$jsonFile = __DIR__ . '/../data/barangays.json';
assertCheck(file_exists($jsonFile), 'data/barangays.json exists');

$data = json_decode((string)file_get_contents($jsonFile), true);
assertCheck(is_array($data) && isset($data['barangays']), 'data/barangays.json has valid JSON schema');

$barangays = $data['barangays'];
assertCheck(count($barangays) === 59, 'Contains all 59 official barangays of San Fernando City (found ' . count($barangays) . ')');

foreach ($barangays as $name => $info) {
    assertCheck(
        isset($info['lat'], $info['lng'], $info['district'])
        && is_numeric($info['lat'])
        && is_numeric($info['lng'])
        && $info['lat'] >= 16.54 && $info['lat'] <= 16.68
        && $info['lng'] >= 120.28 && $info['lng'] <= 120.45,
        "Barangay '{$name}' has valid San Fernando coordinates ({$info['lat']}, {$info['lng']})"
    );
}

// 2. PropertyCatalog API
$catalogBarangays = PropertyCatalog::barangays();
assertCheck(count($catalogBarangays) === 59, 'PropertyCatalog::barangays() returns 59 barangays');
assertCheck(isset($catalogBarangays['Catbangen']), "PropertyCatalog has 'Catbangen'");
assertCheck(isset($catalogBarangays['Barangay I']), "PropertyCatalog has 'Barangay I'");
assertCheck(isset($catalogBarangays['Poro']), "PropertyCatalog has 'Poro'");
assertCheck(isset($catalogBarangays['Sevilla']), "PropertyCatalog has 'Sevilla'");

// 3. Fallback search / geocoding resolver
$extServices = new ExternalServices([]);
$catbangenSearch = $extServices->geocodeSearch('Catbangen');
assertCheck(!empty($catbangenSearch['results']), 'ExternalServices::geocodeSearch finds Catbangen');
assertCheck(abs($catbangenSearch['results'][0]['lat'] - 16.6155) < 0.001, 'Catbangen resolved to latitude ~16.6155');
assertCheck(abs($catbangenSearch['results'][0]['lng'] - 120.3135) < 0.001, 'Catbangen resolved to longitude ~120.3135');

$brgy4Search = $extServices->geocodeSearch('Barangay IV');
assertCheck(!empty($brgy4Search['results']), 'ExternalServices::geocodeSearch finds Barangay IV');
assertCheck(abs($brgy4Search['results'][0]['lat'] - 16.6143) < 0.001, 'Barangay IV resolved to latitude ~16.6143');

// 4. Client-side integration checks
$pwJs = (string)file_get_contents(__DIR__ . '/../assets/js/property-wizard.js');
assertCheck(strpos($pwJs, 'BARANGAY_COORDINATES') !== false, 'property-wizard.js contains BARANGAY_COORDINATES');
assertCheck(strpos($pwJs, 'proceedToBarangay') !== false, 'property-wizard.js contains proceedToBarangay()');
assertCheck(strpos($pwJs, 'lookupBarangay') !== false, 'property-wizard.js contains lookupBarangay()');

$adminLocJs = (string)file_get_contents(__DIR__ . '/../assets/js/admin-location.js');
assertCheck(strpos($adminLocJs, 'proceedToBarangay') !== false, 'admin-location.js contains proceedToBarangay()');
assertCheck(strpos($adminLocJs, 'BARANGAY_COORDINATES') !== false, 'admin-location.js contains BARANGAY_COORDINATES');

$pwView = (string)file_get_contents(__DIR__ . '/../app/Support/property-wizard-view.php');
assertCheck(strpos($pwView, 'id="pwBarangayOptions"') !== false, 'property-wizard-view.php contains datalist pwBarangayOptions');

$parcelHtml = (string)file_get_contents(__DIR__ . '/../new-parcel-registration.html');
assertCheck(strpos($parcelHtml, 'BARANGAY_COORDS') !== false, 'new-parcel-registration.html contains BARANGAY_COORDS');
assertCheck(strpos($parcelHtml, 'proceedToBarangay') !== false, 'new-parcel-registration.html contains proceedToBarangay()');

echo "\nVerification Summary: {$passed}/{$total} checks passed successfully!\n";
