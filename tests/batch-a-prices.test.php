<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/ListingPresentation.php';
require_once dirname(__DIR__) . '/app/Support/DecisionEngineService.php';
require_once dirname(__DIR__) . '/app/Support/GoogleEarthService.php';

use App\Support\DecisionEngineService;
use App\Support\ListingPresentation;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$components = static fn (array $decision): array => array_column($decision['components'], 'score', 'key');
$engine = new DecisionEngineService();
$base = [
    'id' => 1, 'name' => 'Synthetic acquisition fixture', 'listingPurpose' => 'sale',
    'price' => 50000000, 'salePrice' => 50000000, 'pricePerSqm' => 1000,
    'area' => 5.0, 'assessedValueSqm' => 800, 'marketScore' => 80,
    'type' => 'commercial', 'corridor' => 'downtown', 'roadAccess' => 90,
    'distToRoadKm' => .2, 'utilityStatus' => 'full_ready', 'zoningScore' => 90,
    'approvalState' => 'approved', 'status' => 'Available',
    'sellerIdentityStatus' => 'verified', 'listingVerificationStatus' => 'verified',
    'dueDiligencePct' => 90, 'documentCompletenessPct' => 100,
    'documentsReviewedAt' => gmdate('Y-m-d H:i:s'), 'siteVerifiedAt' => gmdate('Y-m-d H:i:s'),
    'lastConfirmedAvailableAt' => gmdate('Y-m-d H:i:s'), 'groundTruthVisitCount' => 1,
    'mceScore' => 81.25, 'iaiScore' => 79.5, 'assessmentCriteria' => ['spatial_fit' => 80],
];
$known = $engine->build($base);
$check(is_int($known['score']) && $components($known)['financial'] === 56, 'Known sale prices must retain the established financial formula.');
$check(is_int($components($known)['personal']), 'Known acquisition cost must support persona budget fit.');
$decorated = $engine->decorateProperty($base);
$check($decorated['mceScore'] === $base['mceScore'] && $decorated['iaiScore'] === $base['iaiScore'] && $decorated['assessmentCriteria'] === $base['assessmentCriteria'], 'Pricing decoration must preserve approved MCE/IAI results and criteria.');

$missing = array_replace($base, ['salePrice' => null, 'price' => null, 'pricePerSqm' => null]);
$leaseOnly = array_replace($base, ['listingPurpose' => 'lease', 'leasePrice' => 25000, 'leasePeriod' => 'month', 'leasePriceUnit' => 'total']);
$explicitNull = array_replace($base, ['salePrice' => null]);
$dualMissing = array_replace($missing, ['listingPurpose' => 'sale_or_lease', 'leasePrice' => 25000, 'leasePeriod' => 'year', 'leasePriceUnit' => 'sqm']);
foreach (['missing sale' => $missing, 'lease only with historical sale price' => $leaseOnly, 'explicit null overriding legacy price' => $explicitNull, 'dual purpose without sale ask' => $dualMissing] as $case => $property) {
    $decision = $engine->build($property);
    $check($decision['score'] === null && $decision['statusKey'] === 'needs_verification', "$case must not become a bargain or receive an acquisition rank.");
    $check($decision['nextAction']['target'] === 'messaging' && str_contains(strtolower($decision['nextAction']['label']), 'pricing'), "$case must offer a way to confirm pricing.");
    $check($components($decision)['financial'] === null && $components($decision)['personal'] === null, "$case must leave acquisition financial and budget-fit scores unknown.");
    foreach ($decision['personas'] as $persona) {
        $parts = $components($persona);
        $check($persona['score'] === null && $parts['financial'] === null && $parts['personal'] === null, "$case must stay unknown for every investor persona.");
    }
    foreach (['demand', 'readiness', 'location', 'risk'] as $key) {
        $check($components($decision)[$key] === $components($known)[$key], "$case must retain independent $key evidence.");
    }
}
$check(ListingPresentation::salePrice($explicitNull) === null && ListingPresentation::salePrice($leaseOnly) === null, 'Explicit NULL and lease-only purpose must prevent fallback to a historical purchase amount.');
$legacy = $base;
unset($legacy['salePrice'], $legacy['listingPurpose']);
$check($engine->build($legacy)['score'] === $known['score'], 'Existing positively priced records must remain compatible with the legacy price field.');
$dual = array_replace($base, ['listingPurpose' => 'sale_or_lease', 'leasePrice' => 999999999, 'leasePeriod' => 'day', 'leasePriceUnit' => 'sqm']);
$check($engine->build($dual) === $known, 'Rental amount and recurring terms must not be folded into acquisition calculations.');
$zero = array_replace($base, ['salePrice' => 0, 'price' => 0, 'pricePerSqm' => 0]);
$zeroDecision = $engine->build($zero);
$check(ListingPresentation::salePrice($zero) === 0.0 && ListingPresentation::prices($zero)['Sale price'] === 'PHP 0', 'A recorded zero must stay distinct from a missing ask in presentation.');
$check($zeroDecision['score'] === null && $components($zeroDecision)['financial'] === null, 'A legacy zero must not divide by zero or receive a fabricated acquisition recommendation.');
$unknownArea = array_replace($base, ['area' => null, 'pricePerSqm' => null]);
$check($engine->build($unknownArea)['score'] === null && $components($engine->build($unknownArea))['financial'] === null, 'Known total asking price with unknown land area must not fabricate a per-square-metre benchmark.');
$check(ListingPresentation::prices($missing)['Sale price'] === 'Price on request', 'Missing prices must be stated consistently in exported presentation.');
$leaseLabels = ListingPresentation::prices($dualMissing);
$check($leaseLabels['Sale price'] === 'Price on request' && str_contains($leaseLabels['Lease price'], '25,000') && str_ends_with($leaseLabels['Lease price'], '/ year'), 'Dual-purpose presentation must keep the missing sale ask and rental period separate.');

$earth = new App\Support\GoogleEarthService();
$export = $earth->buildKml([array_replace($dualMissing, ['lat' => 16.61, 'lng' => 120.32])]);
$check(str_contains($export, 'For Sale or Lease') && str_contains($export, 'Price on request') && str_contains($export, 'PHP 25,000 / m² / year'), 'KML must display separate sale and lease prices with recurring units.');
$xml = simplexml_load_string($export);
$check($xml !== false, 'Pricing exports must remain valid KML XML.');
$xml->registerXPathNamespace('k', 'http://www.opengis.net/kml/2.2');
$check((string) $xml->xpath('//k:Data[@name="sale_price"]/k:value')[0] === 'Price on request', 'KML machine-readable sale price must retain the missing-price label.');
$check((string) $xml->xpath('//k:Data[@name="lease_price"]/k:value')[0] === 'PHP 25,000 / m² / year', 'KML machine-readable lease price must include units and period.');
$kmz = $earth->buildKmzBinary($export);
if (class_exists(ZipArchive::class)) {
    $check(is_string($kmz) && str_starts_with($kmz, 'PK'), 'KMZ must package the updated KML without discarding pricing information.');
}

echo sprintf("Batch A pricing checks passed: %d\n", $checks);
