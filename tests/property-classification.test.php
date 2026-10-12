<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../app/Support/helpers.php';
require_once __DIR__ . '/../app/Support/JsonData.php';
require_once __DIR__ . '/../app/Repositories/PropertyRepository.php';

use App\Support\PropertyCatalog;
use App\Repositories\PropertyRepository;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$reject = static function (callable $operation, string $message) use ($check): void {
    try { $operation(); } catch (InvalidArgumentException) { $check(true, $message); return; }
    throw new RuntimeException($message);
};
$catalog = PropertyCatalog::classificationCatalog();
$check($catalog['categories'] === PropertyCatalog::categories(), 'The client catalog must use the authoritative server classifications.');
$check(array_keys($catalog['categories']) === ['Land', 'Building'], 'The shared catalog must not introduce new categories.');
$check(count($catalog['categories']['Land']) === 10 && count($catalog['categories']['Building']) === 11, 'The shared catalog must expose every available canonical classification.');

foreach ($catalog['categories'] as $category => $classifications) {
    foreach ($classifications as $classification) {
        $check(PropertyCatalog::normalizeCategory($category, $classification, 'commercial') === [$category, $classification], 'Every advertised canonical choice must pass validation: ' . $category . '/' . $classification);
    }
    $check(PropertyCatalog::normalizeCategory($category, implode(', ', $classifications), 'commercial') === [$category, implode(', ', $classifications)], 'All same-category choices must coexist without losing their order.');
    foreach ([null, '', '   ', ', ,'] as $blank) {
        $check(PropertyCatalog::normalizeCategory($category, $blank, 'commercial') === [$category, null], 'Optional blank classifications must remain null.');
    }
}
foreach ($catalog['categoryAliases'] as $alias => $canonical) {
    $check(PropertyCatalog::normalizeCategory($alias, null, 'commercial') === [$canonical, null], 'Every advertised category alias must normalize: ' . $alias);
}
foreach ($catalog['subcategoryAliases'] as $category => $aliases) {
    foreach ($aliases as $alias => $canonical) {
        $check(PropertyCatalog::normalizeCategory($category, $alias, 'commercial') === [$category, $canonical], 'Every advertised subtype alias must normalize: ' . $category . '/' . $alias);
    }
}
foreach ($catalog['legacySubcategoryAliases'] as $legacyCategory => $aliases) {
    foreach ($aliases as $alias => $canonical) {
        $canonicalCategory = $catalog['categoryAliases'][$legacyCategory];
        $check(PropertyCatalog::normalizeCategory($legacyCategory, $alias, 'commercial') === [$canonicalCategory, $canonical], 'Legacy category context must preserve its original meaning: ' . $legacyCategory . '/' . $alias);
    }
}

$check(PropertyCatalog::normalizeCategory(' building ', ' commercial , STOREfront, Retail, Office, corporate   office, ', 'commercial') === ['Building', 'Commercial, Retail / Storefront, Office, Corporate Office'], 'Aliases and duplicate choices must normalize with consistent casing and spacing.');
$check(PropertyCatalog::normalizeCategory('Land', 'Commercial Lot, Agricultural, Commercial Lot', 'commercial') === ['Land', 'Commercial Lot, Agricultural'], 'Comma-delimited classifications must deduplicate without reordering the primary choice.');
$check(PropertyCatalog::normalizeCategory(null, 'Commercial Lot, Raw Land', 'commercial') === ['Land', 'Commercial Lot, Raw Land'], 'Missing legacy category must infer Land from unambiguous valid land choices.');
$check(PropertyCatalog::normalizeCategory('', 'Office, Commercial', 'agricultural') === ['Building', 'Office, Commercial'], 'Missing category must infer Building when every supplied tag is compatible.');
$check(PropertyCatalog::normalizeCategory(null, 'Commercial', 'commercial') === ['Building', 'Commercial'], 'Ambiguous classification must retain the established legacy-type fallback.');
$check(PropertyCatalog::normalizeCategory(null, 'Commercial', 'agricultural') === ['Land', 'Commercial'], 'Ambiguous classification must not arbitrarily choose Building.');
$check(PropertyCatalog::normalizeCategory(null, null, 'commercial') === ['Building', null], 'Absent classification must retain legacy type compatibility.');
$check(PropertyCatalog::normalizeCategory(null, null, 'agricultural') === ['Land', null], 'Absent agricultural classification must retain land compatibility.');

foreach ([
    ['Building', 'Commercial Lot'], ['Building', 'Office, Commercial Lot'], ['Building', 'Raw Land'],
    ['Building', 'Industrial Lot'], ['Building', 'Residential Lot'], ['Land', 'Office'],
    ['Land', 'Commercial Lot, Office'], ['Building', 'Unknown classification'],
    ['Unknown category', 'Commercial'], [null, 'Commercial Lot, Office'], ['', 'Invalid classification'],
] as [$category, $classification]) {
    $reject(static fn () => PropertyCatalog::normalizeCategory($category, $classification, 'commercial'), 'Invalid or cross-category choices must be rejected, including any invalid extra tag.');
}

// A PDO subclass with no constructor connection turns any accidental SQL into
// a test failure; these calls use the actual repository normalization path.
$repository = new PropertyRepository(new class extends PDO { public function __construct() {} });
$normalize = new ReflectionMethod($repository, 'normalizePropertyPayload');
$normalize->setAccessible(true);
$base = ['name' => 'Isolated classification fixture', 'property_type' => 'commercial', 'category' => 'Building', 'subcategory' => 'Commercial, Office', 'approval_state' => 'pending_review', 'land_area' => 1000, 'land_area_unit' => 'sqm'];
$stored = $normalize->invoke($repository, $base);
$check($stored['category'] === 'Building' && $stored['subcategory'] === 'Commercial, Office', 'Repository must accept all valid primary and additional classifications.');
$check($normalize->invoke($repository, ['subcategory' => null], $stored)['subcategory'] === null, 'Explicit null must clear the optional classification rather than restore old data.');
$check($normalize->invoke($repository, ['description' => 'Partial update'], $stored)['subcategory'] === 'Commercial, Office', 'An omitted field must preserve the existing classification.');
$check($normalize->invoke($repository, ['subcategory' => [' Office ', 'Commercial', 'Office']], $stored)['subcategory'] === 'Office, Commercial', 'Valid array classifications must normalize without duplicate entries.');

$historical = array_replace($stored, ['category' => 'Building', 'subcategory' => 'Commercial Lot']);
$repaired = $normalize->invoke($repository, ['category' => 'Building', 'subcategory' => 'Commercial'], $historical);
$check($repaired['subcategory'] === 'Commercial', 'A strictly valid user-selected repair must not fail while comparing invalid historical tags.');
$reject(static fn () => $normalize->invoke($repository, ['subcategory' => 'Commercial Lot'], $historical), 'An invalid historical classification must not authorize invalid new payloads.');
$invalidOldCategory = array_replace($historical, ['category' => 'Old unsupported category']);
$check($normalize->invoke($repository, ['category' => 'Building', 'subcategory' => 'Office'], $invalidOldCategory)['subcategory'] === 'Office', 'Explicit valid repair must also work when the historical category is unsupported.');

foreach ([['Office', ['not text']], [true], [12], ['Commercial Lot'], 'Commercial, Commercial Lot', 123, true] as $invalid) {
    $reject(static fn () => $normalize->invoke($repository, array_replace($base, ['subcategory' => $invalid])), 'Malformed and cross-category repository input must raise validation errors.');
}
$reject(static fn () => $normalize->invoke($repository, array_replace($base, ['category' => ['Building']])), 'Malformed category objects/arrays must not be cast into labels.');
echo "Property classification: {$checks} isolated checks passed; no database writes.\n";
