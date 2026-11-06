<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once dirname(__DIR__) . '/app/Support/InvestmentSearch.php';
require_once dirname(__DIR__) . '/app/Support/PropertyAssessment.php';
require_once dirname(__DIR__) . '/app/Support/PropertyParcel.php';

use App\Support\InvestmentSearch as Search;
use App\Support\PropertyAssessment;
use App\Support\PropertyParcel;

$checks = 0;
$check = static function (bool $ok, string $label) use (&$checks): void {
    if (!$ok) throw new RuntimeException($label);
    $checks++;
};

// These are synthetic listing observations passed through the real presenters, not live findings.
$assessment = PropertyAssessment::scores(['risk_constraints' => ['flood' => 'high', 'fault' => 'within_fault_buffer']]);
$utilities = PropertyParcel::normalizeUtilities([
    'electricity_status' => 'connected', 'electricity_provider' => 'Synthetic electric provider',
    'electricity_primary_supply' => 'Synthetic grid supply', 'electricity_backup' => 'Synthetic generator',
    'water_status' => 'connected', 'water_source' => 'Synthetic piped source',
    'internet_status' => 'connected', 'internet_providers' => ['Synthetic provider'],
    'internet_types' => ['Synthetic fiber'], 'internet_technology' => 'Synthetic wired connection',
    'internet_quality' => 'strong', 'download_speed_mbps' => 75,
]);
$property = array_merge($assessment, [
    'id' => 999001, 'name' => 'Synthetic mapping regression fixture', 'city' => 'San Fernando, La Union',
    'category' => 'Land', 'subcategory' => 'Commercial Lot', 'listingPurpose' => 'sale',
    'price' => null, 'area' => .05, 'areaKnown' => true, 'utilities' => $utilities,
    'listingVerificationStatus' => 'partially_verified', 'sellerIdentityStatus' => 'verified',
    'authorityToSellVerified' => false, 'documentsReviewedAt' => '2026-10-15T08:00:00+08:00',
    'siteVerifiedAt' => '', 'lastConfirmedAvailableAt' => '2026-10-16T09:00:00+08:00',
    'clupProfile' => ['zoningClassification' => 'Synthetic district', 'existingLandUse' => 'Synthetic land use',
        'statusLabel' => 'Pending city validation', 'sourceReference' => 'Synthetic source only', 'verifiedAt' => null],
]);
$before = serialize($property);
$card = Search::card($property, []);
$check(serialize($property) === $before, 'Rendering details does not mutate existing assessments or listing facts.');
foreach (['flood', 'fault'] as $kind) {
    $finding = $assessment['hazardScreening'][$kind];
    $check(str_contains($card['details']['hazards'], ucfirst($kind) . ': ' . $finding['status']), 'Hazard status uses the shared assessment presenter: ' . $kind);
    $check(str_contains($card['details']['hazards'], 'evidence status: ' . $finding['evidence_status']), 'Hazard verification state remains visible: ' . $kind);
}
$check($assessment['hazardScreening']['technical_review_hold'] === true && str_contains($card['details']['hazards'], 'Technical review hold: yes'), 'A real presenter technical-review hold remains visible.');
$check(str_contains($card['details']['hazards'], 'Validated: no'), 'Unverified screening is not presented as validated.');
$check(str_contains($card['details']['hazards'], $assessment['hazardScreening']['status_label']), 'Overall hazard screening status is preserved.');
$check(str_contains($card['details']['internet'], 'Synthetic provider') && str_contains($card['details']['internet'], 'Synthetic fiber'), 'Normalized internet provider and connection-type arrays are mapped.');
$check(str_contains($card['details']['internet'], 'Synthetic wired connection') && str_contains($card['details']['internet'], '75'), 'Recorded internet technology and speed are retained.');
$check(str_contains($card['details']['electricity'], 'Synthetic generator') && str_contains($card['details']['electricity'], 'Synthetic electric provider'), 'Normalized electricity supply and provider fields are mapped.');
$check(str_contains($card['details']['water'], 'Synthetic piped source'), 'Normalized water source is mapped.');
$check(str_contains($card['details']['zoning'], 'Synthetic district') && str_contains($card['details']['zoning'], 'Pending city validation'), 'Recorded zoning and pending validation are both preserved.');
$check(str_contains($card['details']['zoning'], 'Synthetic land use') && str_contains($card['details']['zoning'], 'Synthetic source only'), 'Other recorded zoning-profile facts remain available.');
$partialZone = $property;
$partialZone['clupProfile']['zoningClassification'] = null;
$partial = Search::card($partialZone, []);
$check(str_contains($partial['details']['zoning'], Search::MISSING) && str_contains($partial['details']['zoning'], 'Synthetic source only'), 'A missing zoning classification retains other recorded profile facts.');
foreach (['status' => 'listingVerificationStatus', 'sellerIdentityStatus' => 'sellerIdentityStatus', 'authorityToSellVerified' => 'authorityToSellVerified', 'documentsReviewedAt' => 'documentsReviewedAt', 'siteVerifiedAt' => 'siteVerifiedAt', 'lastConfirmedAvailableAt' => 'lastConfirmedAvailableAt'] as $publicKey => $propertyKey) {
    $check($card['verification'][$publicKey] === $property[$propertyKey], 'Verification value remains exact: ' . $publicKey);
}
$unknownUtility = Search::card(array_replace($property, ['utilities' => PropertyParcel::normalizeUtilities([])]), []);
$check(str_contains($unknownUtility['details']['internet'], Search::MISSING), 'An unknown normalized utility still uses the required missing-information sentence.');

echo "Property assistant detail mapping: {$checks} checks passed." . PHP_EOL;
