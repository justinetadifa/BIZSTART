<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/JsonData.php';
require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';

use App\Repositories\PropertyRepository;
use App\Support\AutomaticPropertyAssessment;
use App\Support\PropertyParcel;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$reject = static function (callable $operation, string $message) use ($check): void {
    try { $operation(); } catch (InvalidArgumentException $expected) { $check(true, $message); return; }
    throw new RuntimeException($message);
};
// This PDO never connects. Accidental SQL is a test failure, with no live writes.
$repository = new PropertyRepository(new class extends PDO { public function __construct() {} });
$normalize = new ReflectionMethod($repository, 'normalizePropertyPayload');
$effectivePrice = new ReflectionMethod($repository, 'effectivePricePerSqm');
$auditSnapshot = new ReflectionMethod($repository, 'auditSnapshot');
$normalize->setAccessible(true);
$effectivePrice->setAccessible(true);
$auditSnapshot->setAccessible(true);
$base = ['name' => 'Isolated exact parcel fixture', 'property_type' => 'commercial', 'category' => 'Land',
    'subcategory' => 'Commercial Lot', 'approval_state' => 'pending_review', 'land_area_unit' => 'sqm', 'price' => 1490];
$row = $normalize->invoke($repository, $base + ['land_area' => 1.49]);
$parcel = json_decode($row['parcel_json'], true, 512, JSON_THROW_ON_ERROR);
$assessment = json_decode($row['automatic_assessment_json'], true, 512, JSON_THROW_ON_ERROR);
$check($row['area'] === 0.0001, 'Legacy hectare storage precision remains unchanged.');
$check($parcel['surveyAreaSqm'] === 1.49 && $parcel['areaMethod'] === 'declared', 'Declared parcel area retains its exact square-meter value and source.');
$check($row['price_per_sqm'] === 1000, 'Stored asking price per sqm uses 1490 / 1.49, not 1490 / 1.');
$check($assessment['inputs']['landArea'] === 0.000149, 'Automatic valuation retains exact parcel area at centimeter-squared precision.');
$check($effectivePrice->invoke($repository, array_replace($row, ['price_per_sqm' => 1490])) === 1000, 'Public review price recomputes exact parcel denominator even if old derived price was wrong.');
$snapshot = $auditSnapshot->invoke($repository, $row);
$check($snapshot['area'] === 0.000149 && $snapshot['pricePerSqm'] === 1000, 'Audited review area and price use exact parcel precision together.');
$edited = $normalize->invoke($repository, ['land_area' => 1.48, 'land_area_unit' => 'sqm', 'price' => 1480], $row);
$check($edited['area'] === $row['area'] && $edited['price_per_sqm'] === 1000, 'Exact changes within one legacy hectare increment update derived pricing.');
$check(json_decode($edited['automatic_assessment_json'], true)['inputs']['landArea'] === 0.000148, 'Exact changes within one legacy hectare increment recalculate automatic valuation.');
$historical = $row;
$oldMetadata = $assessment;
$oldMetadata['inputs']['landArea'] = 0.0001;
$historical['automatic_assessment_json'] = json_encode($oldMetadata);
$repaired = $normalize->invoke($repository, ['description' => 'Review existing exact parcel'], $historical);
$check(json_decode($repaired['automatic_assessment_json'], true)['inputs']['landArea'] === 0.000149, 'Saving historical rounded valuation repairs its area input without changing the parcel.');
$check($effectivePrice->invoke($repository, ['area' => 0.25, 'price' => 2500000]) === 1000, 'Historical records without parcel area retain legacy hectare fallback.');
$check($effectivePrice->invoke($repository, ['area' => 0.25, 'price' => 2500000, 'parcel_json' => '{"surveyAreaSqm":null,"estimatedAreaSqm":1.25}']) === 2000000, 'Boundary-only parcels use exact mapped estimate before legacy hectare fallback.');
$check($effectivePrice->invoke($repository, ['area' => 0.25, 'price' => 2500000, 'parcel_json' => '{"surveyAreaSqm":1.25,"estimatedAreaSqm":2000}']) === 2000000, 'Recorded declared/survey area takes precedence over mapped boundary estimate.');
$check($effectivePrice->invoke($repository, ['area' => 0.25, 'price' => 2500000, 'listing_purpose' => 'lease']) === null, 'Lease-only listing does not acquire sale-price density.');
$check($effectivePrice->invoke($repository, ['area' => 0.0001, 'price' => PHP_INT_MAX]) === PHP_INT_MAX, 'Exactly one sqm preserves maximum integer without float conversion.');
$minimum = $normalize->invoke($repository, array_replace($base, ['land_area' => 0.5, 'price' => 1000]));
$check($minimum['price_per_sqm'] === 2000 && json_decode($minimum['automatic_assessment_json'], true)['inputs']['landArea'] === 0.00005, 'Minimum representable area uses exact half-square-meter pricing and valuation.');
$maximum = $normalize->invoke($repository, array_replace($base, ['land_area' => PropertyParcel::MAX_AREA_HECTARES, 'land_area_unit' => 'ha']));
$check($maximum['area'] === PropertyParcel::MAX_AREA_HECTARES, 'Largest valid DECIMAL(12,4) hectare area is accepted.');

foreach ([INF, NAN, '1e309', 100000000, 99999999.99995] as $invalid) {
    $reject(fn () => $normalize->invoke($repository, array_replace($base, ['land_area' => $invalid, 'land_area_unit' => 'ha'])), 'Nonfinite and out-of-database-range hectares must reject before persistence.');
}
$reject(fn () => PropertyParcel::fromPayload(['land_area' => '1e308', 'land_area_unit' => 'ha']), 'Unit multiplication overflow must reject explicitly before JSON serialization.');
$reject(fn () => $normalize->invoke($repository, array_replace($base, ['land_area' => 0.49])), 'Area below representable minimum must not silently store zero hectares.');
$reject(fn () => $normalize->invoke($repository, array_replace($base, ['land_area' => 0.5, 'price' => PHP_INT_MAX])), 'Derived per-sqm BIGINT overflow must reject instead of wrapping negative.');
$preview = AutomaticPropertyAssessment::normalizeInputs(['category' => 'Land', 'land_area' => 1.49, 'land_area_unit' => 'sqm']);
$check($preview['landArea'] === 0.000149, 'Assessment preview and saved property use identical exact area precision.');
$parcelPreview = AutomaticPropertyAssessment::normalizeInputs(['category' => 'Land', 'area' => 0.0001, 'parcel' => ['surveyAreaSqm' => 1.49]]);
$check($parcelPreview['landArea'] === 0.000149, 'Existing property assessment input prefers positive parcel area over rounded legacy column.');
foreach ([INF, '1e309', 100000000, 0.000049] as $invalid) {
    $reject(fn () => AutomaticPropertyAssessment::normalizeInputs(['category' => 'Land', 'landArea' => $invalid]), 'Preview obeys finite, DB upper bound and representability lower bound.');
}

echo "Property numeric precision: {$checks} isolated checks passed; no database writes.\n";
