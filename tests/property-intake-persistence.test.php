<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Support/PropertyParcel.php';
require_once dirname(__DIR__) . '/api/_listing-policy.php';

use App\Support\PropertyParcel;

$checks = 0;
$check = static function (bool $ok, string $message) use (&$checks): void {
    if (!$ok) { throw new RuntimeException($message); }
    $checks++;
};
$actor = ['id' => 999000001, 'role' => 'seller', 'name' => 'Synthetic broker',
    'email' => 'broker@example.test', 'identityVerificationStatus' => 'verified'];
$reported = ['offered_space_scope' => 'part_property', 'offered_area_sqm' => '100',
    'security_deposit_months' => '2', 'advance_rent_months' => '1', 'utilities_included' => 'included',
    'additional_purchase_costs' => '150000', 'comparable_lease_price' => '300'];
$payload = sfc_listing_payload($reported + ['approval_state' => 'approved', 'site_verified' => true,
    'clup_verified' => true, 'assessmentCriteria' => ['economic_viability' => 100],
    'automatic_assessment_json' => '{"iaiScore":100}', 'parcel_json' => '{}'], $actor, true);
foreach ($reported as $field => $value) {
    $check(($payload[$field] ?? null) === $value, 'Broker policy retains reported ' . $field);
}
$check($payload['approval_state'] === 'pending_review', 'Reported observations never grant broker approval.');
$check($payload['site_verified'] === false && $payload['clup_verified'] === false, 'Reported observations never grant verification.');
$check(!isset($payload['assessmentCriteria'], $payload['automatic_assessment_json'], $payload['parcel_json']), 'Submitted score and assessment snapshots cannot replace server results.');
$parcel = PropertyParcel::fromPayload($payload);
foreach (['offered_space_scope' => 'part_property', 'offered_area_sqm' => 100.0,
    'security_deposit_months' => 2.0, 'advance_rent_months' => 1.0, 'utilities_included' => 'included',
    'additional_purchase_costs' => 150000.0, 'comparable_lease_price' => 300.0] as $field => $expected) {
    $check($parcel['observations'][$field] === $expected, 'Saved parcel preserves ' . $field);
}
$untouched = PropertyParcel::fromPayload(sfc_listing_payload(['description' => 'Unrelated edit'], $actor, false), $parcel);
$check($untouched['observations'] === $parcel['observations'], 'Unrelated edit retains financial observations.');
$clearing = array_fill_keys(['offered_area_sqm', 'security_deposit_months', 'advance_rent_months',
    'additional_purchase_costs', 'comparable_lease_price'], '');
$cleared = PropertyParcel::fromPayload(sfc_listing_payload($clearing, $actor, false), $parcel);
foreach ($clearing as $field => $_) {
    $check($cleared['observations'][$field] === null, 'Clearing ' . $field . ' removes the saved measurement.');
}
foreach (['offered_area_sqm', 'security_deposit_months', 'advance_rent_months',
    'additional_purchase_costs', 'comparable_lease_price'] as $field) {
    try {
        PropertyParcel::fromPayload(sfc_listing_payload([$field => '-1'], $actor, true));
        throw new RuntimeException('Negative broker financial input accepted: ' . $field);
    } catch (InvalidArgumentException $expected) { $checks++; }
}
echo "Property intake persistence: {$checks} broker policy, save/edit/clear and validation checks passed; no database writes.\n";
