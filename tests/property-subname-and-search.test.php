<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/Repositories/PropertyRepository.php';
require_once __DIR__ . '/../app/Core/SchemaManager.php';
require_once __DIR__ . '/../app/Support/PropertyCatalog.php';

use App\Repositories\PropertyRepository;
use App\Core\SchemaManager;
use App\Core\Database;

$passed = 0;
$total = 0;

function assertTest(bool $condition, string $message): void {
    global $passed, $total;
    $total++;
    if (!$condition) {
        echo "❌ FAIL: {$message}\n";
        exit(1);
    }
    $passed++;
    echo "✅ PASS: {$message}\n";
}

echo "=== Verifying Property Subname & Barangay Map Search ===\n\n";

// 1. Database schema verification
$container = require __DIR__ . '/../app/bootstrap.php';
$pdo = $container['pdo'];
$columns = $pdo->query("SHOW COLUMNS FROM properties LIKE 'subname'")->fetchAll();
assertTest(count($columns) === 1, "properties table has 'subname' column in database");
assertTest(stripos($columns[0]['Type'], 'varchar') !== false, "properties.subname column is VARCHAR type");

// 2. Repository verification
$repo = $container['properties'];
$admin = ['id' => 1, 'role' => 'admin', 'department' => 'CICTO'];
$testSubname = "Phase 2 · Corner Lot Commercial Hub";
$propData = [
    'property_name' => 'Subname Automated Test Property',
    'subname' => $testSubname,
    'category' => 'Building',
    'subcategory' => 'Commercial',
    'listing_purpose' => 'sale',
    'price' => 12500000,
    'barangay' => 'Catbangen',
    'city' => 'San Fernando City',
    'province' => 'La Union',
    'status' => 'available',
    'contact_name' => 'Test Agent',
    'contact_email' => 'test@example.com',
    'contact_phone' => '09171234567',
    'lat' => 16.6155,
    'lng' => 120.3135,
    'land_area' => 850
];

$created = $repo->create($propData, $admin);
assertTest(!empty($created['id']), "Property created successfully via PropertyRepository");
assertTest(($created['subname'] ?? '') === $testSubname, "Created property contains correct subname in response");
assertTest(($created['propertySubname'] ?? '') === $testSubname, "Created property contains propertySubname alias");

// Fetch back from database
$fetched = $repo->find((int)$created['id']);
assertTest($fetched !== null, "Created property found by ID");
assertTest(($fetched['subname'] ?? '') === $testSubname, "Fetched property preserves stored subname: '{$fetched['subname']}'");

// Update subname
$updatedSubname = "Tower A · Prime Penthouse Suite";
$updated = $repo->update((int)$created['id'], ['subname' => $updatedSubname]);
assertTest(($updated['subname'] ?? '') === $updatedSubname, "Property update successfully modifies subname to: '{$updated['subname']}'");

// 3. UI Template verification
$wizardView = (string)file_get_contents(__DIR__ . '/../app/Support/property-wizard-view.php');
assertTest(strpos($wizardView, 'name="property_subname"') !== false, "property-wizard-view.php has input with name='property_subname'");
assertTest(strpos($wizardView, 'data-preview-subname') !== false, "property-wizard-view.php has preview element data-preview-subname");

$wizardCss = (string)file_get_contents(__DIR__ . '/../assets/css/property-wizard.css');
assertTest(strpos($wizardCss, '.pw-preview-subname') !== false, "property-wizard.css styles .pw-preview-subname");

// 4. Client JS verification
$pwJs = (string)file_get_contents(__DIR__ . '/../assets/js/property-wizard.js');
assertTest(strpos($pwJs, "field('property_subname')") !== false, "property-wizard.js references field('property_subname')");
assertTest(strpos($pwJs, "data-preview-subname") !== false, "property-wizard.js updates data-preview-subname in preview()");
assertTest(strpos($pwJs, "subname") !== false, "property-wizard.js includes subname in submission payload");

// Barangay search immediacy verification in property-wizard.js
assertTest(strpos($pwJs, "searchInput?.addEventListener('input'") !== false, "property-wizard.js attaches immediate 'input' listener to location search");
assertTest(strpos($pwJs, "searchInput?.addEventListener('change'") !== false, "property-wizard.js attaches 'change' listener to location search");
assertTest(strpos($pwJs, "lookupBarangay(query)") !== false, "property-wizard.js checks local barangay cache first without slow network wait");

// Admin location script verification
$adminLocJs = (string)file_get_contents(__DIR__ . '/../assets/js/admin-location.js');
assertTest(strpos($adminLocJs, "input.addEventListener('input'") !== false, "admin-location.js attaches immediate 'input' listener to search input");
assertTest(strpos($adminLocJs, "input.addEventListener('change'") !== false, "admin-location.js attaches 'change' listener to search input");
assertTest(strpos($adminLocJs, "proceedToBarangay(query)") !== false, "admin-location.js checks local barangay cache first");

// Cleanup test property
$pdo->prepare("DELETE FROM properties WHERE id = ?")->execute([$created['id']]);

echo "\nVerification Summary: {$passed}/{$total} tests passed successfully!\n";
