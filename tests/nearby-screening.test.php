<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/PropertyParcel.php';
require_once dirname(__DIR__) . '/api/_listing-policy.php';

use App\Support\NearbyBusinessScreening as Screening;
use App\Support\PropertyParcel;

$checks = 0;
$check = static function (bool $ok, string $message) use (&$checks): void {
    if (!$ok) { throw new RuntimeException($message); }
    $checks++;
};
$input = ['business_type' => 'cafe', 'radius_m' => 500, 'reference_lat' => 16.6159, 'reference_lng' => 120.3209,
    'counts' => ['places' => 30, 'businesses' => 20, 'competitors' => 5, 'complementary' => 5, 'anchors' => 3],
    'source' => 'Synthetic inventory', 'observed_at' => '2026-10-17T00:00:00Z', 'coverage' => 'local_only'];
$score = Screening::evaluate($input);
$check($score['score'] === 92.5, 'Weighted 25/30/30/15 score is 92.5.');
$check($score['iai_contribution'] === 13.88, '15% contribution is rounded only at the end.');
$check($score['is_verified'] === false && $score['verification_status'] === 'reported_unverified', 'Screening never implies verification.');
$check(Screening::evaluate($score + ['isVerified' => true]) === $score, 'Round trip recomputes the same screening.');
$forged = $score; $forged['score'] = 100; $forged['is_verified'] = true; $forged['iai_contribution'] = 15;
$check(Screening::evaluate($forged) === $score, 'Injected score and verification flags are discarded.');
$more = $input; $more['counts']['businesses'] = 25;
$check(Screening::evaluate($more)['subcriteria']['commercial_activity']['score'] === 100.0, 'Activity saturates at its disclosed reference.');
$empty = $input; $empty['counts'] = array_fill_keys(array_keys($input['counts']), 0);
$pending = Screening::evaluate($empty);
$check($pending['score'] === null && $pending['iai_contribution'] === null && !$pending['is_complete'], 'No mapped businesses stays pending, never zero or perfect.');
$allCompete = $input; $allCompete['counts']['competitors'] = 20;
$check((float) Screening::evaluate($allCompete)['subcriteria']['competitive_pressure']['score'] === 0.0, 'All competing businesses produces zero competition suitability.');
foreach (['radius_m' => 1000, 'business_type' => 'unsupported'] as $key => $value) {
    $copy = $input; $copy[$key] = $value;
    $check(Screening::evaluate($copy)['score'] === null, 'Unsupported radius/profile cannot reuse this model.');
}
foreach ([['businesses', 31], ['competitors', 21], ['anchors', 30], ['places', -1], ['places', '30'], ['places', INF]] as [$key, $value]) {
    $copy = $input; $copy['counts'][$key] = $value;
    try { Screening::evaluate($copy); throw new RuntimeException('Invalid counts accepted.'); }
    catch (InvalidArgumentException) { $checks++; }
}
$features = [];
foreach ([['isBusiness' => true, 'classification' => 'competitor'], ['isBusiness' => true, 'classification' => 'complementary'],
    ['isBusiness' => false, 'classification' => 'complementary'], ['isBusiness' => true, 'classification' => 'complementary', 'isAnchor' => true]] as $p) {
    $features[] = ['properties' => $p];
}
$counts = Screening::fromRadar(['features' => $features], 16.6159, 120.3209, 500, 'cafe')['observations']['counts'];
$check($counts === ['places' => 4, 'businesses' => 3, 'competitors' => 1, 'complementary' => 2, 'anchors' => 1], 'Civic places do not inflate businesses; anchors are separate from complementary places.');
$actor = ['id' => 999000001, 'role' => 'seller', 'name' => 'Synthetic broker', 'email' => 'broker@example.test', 'identityVerificationStatus' => 'verified'];
$payload = sfc_listing_payload(['nearby_screening' => json_encode($forged), 'reference_lat' => 16.6159, 'reference_lng' => 120.3209, 'reference_label' => 'location'], $actor, false);
$parcel = PropertyParcel::fromPayload($payload);
$check($parcel['observations']['nearby_screening'] === $score, 'Broker save retains raw observations and recomputes the provisional model.');
$check(!isset($parcel['observations']['nearby_businesses'], $parcel['observations']['nearby_businesses_score']), 'Screening never supplies the official aggregate.');
$check(PropertyParcel::fromPayload([], $parcel)['observations']['nearby_screening'] === $score, 'Unrelated edit retains the snapshot.');
$check(!isset(PropertyParcel::fromPayload(['nearby_screening' => ''], $parcel)['observations']['nearby_screening']), 'Clearing the snapshot removes the saved score.');
$check(!isset(PropertyParcel::fromPayload(['reference_lat' => 16.62, 'reference_lng' => 120.32], $parcel)['observations']['nearby_screening']), 'Moving reference invalidates a saved scan.');
foreach (['{broken', 'null', '[]'] as $bad) {
    try { PropertyParcel::fromPayload(['nearby_screening' => $bad], $parcel); throw new RuntimeException('Invalid snapshot accepted.'); }
    catch (InvalidArgumentException) { $checks++; }
}
try {
    PropertyParcel::fromPayload(['nearby_screening' => $score, 'reference_lat' => 16.62, 'reference_lng' => 120.32], $parcel);
    throw new RuntimeException('Another reference accepted.');
} catch (InvalidArgumentException) { $checks++; }
try {
    PropertyParcel::fromPayload(['nearby_screening' => $score, 'radar_business_type' => 'industrial'], $parcel);
    throw new RuntimeException('Another business profile accepted.');
} catch (InvalidArgumentException) { $checks++; }
echo "Nearby screening: {$checks} calculation, validation and persistence checks passed; no database writes.\n";
