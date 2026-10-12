<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/Support/PropertyCatalog.php';
require_once __DIR__ . '/../app/Support/PropertyAssessment.php';
require_once __DIR__ . '/../app/Support/AutomaticPropertyAssessment.php';

use App\Support\PropertyCatalog;
use App\Support\AutomaticPropertyAssessment;

function assertCondition(bool $cond, string $msg): void {
    if (!$cond) {
        throw new RuntimeException("Assertion failed: $msg");
    }
    echo "✅ PASS: $msg\n";
}

echo "=== Running Property Type Land & Building Verification Suite ===\n";

// 1. Check primary categories
$categories = PropertyCatalog::categories();
assertCondition(count($categories) === 2, "PropertyCatalog has exactly 2 primary categories");
assertCondition(isset($categories['Land']), "PropertyCatalog contains 'Land'");
assertCondition(isset($categories['Building']), "PropertyCatalog contains 'Building'");

// 2. Check tooltips
$tooltips = PropertyCatalog::categoryTooltips();
assertCondition(isset($tooltips['Land']) && !empty($tooltips['Land']), "Tooltip for 'Land' exists");
assertCondition(isset($tooltips['Building']) && !empty($tooltips['Building']), "Tooltip for 'Building' exists");

// 3. Normalization checks
[$catLand, $subLand] = PropertyCatalog::normalizeCategory('Land', 'Commercial Lot, Agricultural', 'commercial');
assertCondition($catLand === 'Land', "Normalized category is 'Land'");
assertCondition($subLand === 'Commercial Lot, Agricultural', "Normalized subcategories for Land match");

[$catBuilding, $subBuilding] = PropertyCatalog::normalizeCategory('Building', 'Commercial, Office', 'commercial');
assertCondition($catBuilding === 'Building', "Normalized category is 'Building'");
assertCondition($subBuilding === 'Commercial, Office', "Normalized subcategories for Building match");

// 4. Legacy backward compatibility
[$catLegacyLand] = PropertyCatalog::normalizeCategory('Vacant Land', null, 'commercial');
assertCondition($catLegacyLand === 'Land', "Legacy 'Vacant Land' normalizes to 'Land'");

[$catLegacyCommercial] = PropertyCatalog::normalizeCategory('Commercial', null, 'commercial');
assertCondition($catLegacyCommercial === 'Building', "Legacy 'Commercial' normalizes to 'Building'");

[$catLegacyOffice] = PropertyCatalog::normalizeCategory('Office', null, 'office');
assertCondition($catLegacyOffice === 'Building', "Legacy 'Office' normalizes to 'Building'");

// 5. Invalid subcategory rejection
$rejected = false;
try {
    PropertyCatalog::normalizeCategory('Land', 'Office', 'commercial');
} catch (InvalidArgumentException $e) {
    $rejected = true;
}
assertCondition($rejected, "Subcategory 'Office' is rejected for 'Land'");

$rejectedBuilding = false;
try {
    PropertyCatalog::normalizeCategory('Building', 'Raw Land', 'commercial');
} catch (InvalidArgumentException $e) {
    $rejectedBuilding = true;
}
assertCondition($rejectedBuilding, "Subcategory 'Raw Land' is rejected for 'Building'");

// 6. Exercise real repository normalization without bootstrap, migrations,
// live writes, assessment audit records or an external database connection.
require_once __DIR__ . '/../app/Support/helpers.php';
require_once __DIR__ . '/../app/Support/JsonData.php';
require_once __DIR__ . '/../app/Repositories/PropertyRepository.php';
$repo = new \App\Repositories\PropertyRepository(new class extends PDO { public function __construct() {} });
$normalize = new ReflectionMethod($repo, 'normalizePropertyPayload');
$normalize->setAccessible(true);

$createdBuilding = $normalize->invoke($repo, [
    'property_name' => 'Test Building Listing ' . bin2hex(random_bytes(4)),
    'category' => 'Building',
    'subcategory' => 'Commercial, Office',
    'price' => 5000000,
    'land_area' => 1200,
    'land_area_unit' => 'sqm',
    'lat' => 16.615,
    'lng' => 120.316,
    'status' => 'Available',
    'listing_purpose' => 'sale',
    'barangay' => 'Catbangen',
]);

assertCondition($createdBuilding['category'] === 'Building', "Repository created property with category 'Building'");
assertCondition(str_contains($createdBuilding['subcategory'], 'Commercial'), "Repository created property with subcategory 'Commercial'");

$createdLand = $normalize->invoke($repo, [
    'property_name' => 'Test Land Listing ' . bin2hex(random_bytes(4)),
    'category' => 'Land',
    'subcategory' => 'Commercial Lot',
    'price' => 2500000,
    'land_area' => 800,
    'land_area_unit' => 'sqm',
    'lat' => 16.615,
    'lng' => 120.316,
    'status' => 'Available',
    'listing_purpose' => 'sale',
    'barangay' => 'Catbangen',
]);

assertCondition($createdLand['category'] === 'Land', "Repository created property with category 'Land'");
assertCondition(str_contains($createdLand['subcategory'], 'Commercial Lot'), "Repository created property with subcategory 'Commercial Lot'");

echo "All Land & Building tests passed successfully!\n";
