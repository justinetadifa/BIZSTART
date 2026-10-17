<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';

use App\Support\PropertyScreening;
use App\Support\PropertyAssessment;
use App\Support\NearbyBusinessScreening;
use App\Repositories\PropertyRepository;

$checks = 0;
$check = static function (bool $ok, string $message) use (&$checks): void {
    if (!$ok) { throw new RuntimeException($message); }
    $checks++;
};
$nearby = NearbyBusinessScreening::evaluate(['business_type' => 'cafe', 'radius_m' => 500,
    'reference_lat' => 16.6159, 'reference_lng' => 120.3209,
    'counts' => ['places' => 30, 'businesses' => 20, 'competitors' => 5, 'complementary' => 5, 'anchors' => 3],
    'source' => 'Synthetic observations', 'observed_at' => '2026-10-17', 'coverage' => 'local_only']);
$observations = [
    'road_access' => 'frontage', 'road_surface_passability' => 'paved', 'carriageway_width' => 8, 'distance_to_major_road' => 50,
    'electricity_arrangement' => 'grid_reliable', 'water_supply' => 'piped_reliable', 'internet_telecom' => 'fiber_reliable', 'drainage_conditions' => 'adequate_functional',
    'offered_space_scope' => 'entire_land', 'comparable_market_price' => 10000, 'nearby_screening' => $nearby,
    'flood_susceptibility' => 'none', 'active_fault' => 'none', 'landslide_susceptibility' => 'none',
    'storm_surge' => 'none', 'liquefaction_susceptibility' => 'none', 'tsunami_exposure' => 'none',
];
$property = ['id' => 950000010, 'price' => 1000000, 'listingPurpose' => 'sale', 'area' => .01, 'lat' => 16.6159, 'lng' => 120.3209,
    'clupProfile' => ['zoningClassification' => 'C-1', 'proposedActivity' => 'retail_convenience'],
    'parcel' => ['surveyAreaSqm' => 100, 'referencePoint' => ['label' => 'location', 'lat' => 16.6159, 'lng' => 120.3209], 'observations' => $observations]];
$result = PropertyScreening::fromProperty($property);
$check($result['completed_count'] === 5 && $result['score'] !== null, 'Five saved criteria produce a numeric preview.');
$sum = array_sum(array_column($result['criteria'], 'contribution'));
$check($result['score'] === round($sum, 1) && $result['unrounded_total'] === $sum, 'Weighted total uses full precision and rounds once.');
$check($result['criteria']['nearby_businesses']['contribution'] === 13.875, 'Nearby contributes the full precision 15%, not a rounded display value.');
$check($result['status'] === 'provisional' && !$result['is_verified'] && !$result['rank_eligible'], 'The preview cannot authenticate evidence or rank a listing.');
$cost = ['land_area' => 100, 'asking_price' => 1000000, 'comparable_market_price' => 10000];
$check(PropertyAssessment::evaluatePropertyCostMarketCompetitiveness($cost)['score'] === null, 'Official valuation still requires compatible evidence and verification.');
$preview = PropertyAssessment::evaluatePropertyCostMarketCompetitiveness($cost, ['preview_only' => true]);
$check($preview['score'] === 100.0 && $preview['verification_status'] === 'applicant_reported' && $preview['is_provisional'], 'The price preview computes without pretending to verify the comparable.');
foreach ([['currency' => 'USD'], ['comparable_unit' => 'PHP/hectare'], ['asking_price' => null], ['comparable_market_price' => null]] as $invalid) {
    $check(PropertyAssessment::evaluatePropertyCostMarketCompetitiveness(array_replace($cost, $invalid), ['preview_only' => true])['score'] === null, 'Incompatible or missing valuation inputs cannot become a preview.');
}
$forged = $property; $forged['iaiScore'] = 100; $forged['screeningAssessment'] = ['score' => 100];
$forged['parcel']['observations']['nearby_screening']['score'] = 100;
$check(PropertyScreening::fromProperty($forged)['score'] === $result['score'], 'Ratings and snapshots submitted by a client do not replace recomputation.');
$missing = $property; $missing['parcel']['observations']['comparable_market_price'] = null; $missing['parcel']['observations']['bir_zonal_value'] = 10000;
$partial = PropertyScreening::fromProperty($missing);
$check($partial['score'] === null && $partial['completed_count'] === 4 && str_contains($partial['reason'], 'Cost & market'), 'Incomplete inputs identify the missing criterion and never use BIR as market evidence.');
$stale = $property; $stale['lat'] = 16.62;
$check(PropertyScreening::fromProperty($stale)['criteria']['nearby_businesses']['score'] === null, 'Moved property reference invalidates the nearby snapshot.');
$hold = $property; $hold['parcel']['observations']['active_fault'] = 'critical';
$held = PropertyScreening::fromProperty($hold);
$check($held['score'] === null && $held['status'] === 'technical_review_hold' && $held['completed_count'] === 5, 'A high average cannot hide a critical hazard.');
$prohibited = $property; $prohibited['clupProfile'] = ['zoningClassification' => 'R-1', 'proposedActivity' => 'ind_heavy_manufacturing'];
$check(PropertyScreening::fromProperty($prohibited)['status'] === 'prohibited' && PropertyScreening::fromProperty($prohibited)['score'] === null, 'Prohibited zoning withholds the overall result and states the reason.');
$unknownZone = $property; $unknownZone['clupProfile'] = [];
$pending = PropertyScreening::fromProperty($unknownZone);
$check($pending['score'] === $result['score'] && $pending['status'] === 'zoning_pending', 'Five numerical criteria remain visible with an explicit zoning pending label.');
$outside = $property; $outside['lat'] = 14.5995;
$check(PropertyScreening::fromProperty($outside)['score'] === null && PropertyScreening::fromProperty($outside)['status'] === 'location_needed', 'Out of coverage coordinates cannot support a local score.');
$discrepancy = $property; $discrepancy['parcel']['estimatedAreaSqm'] = 200;
$check(PropertyScreening::fromProperty($discrepancy)['criteria']['property_cost_market_competitiveness']['score'] === null, 'Survey and boundary area discrepancy also withholds the saved price preview.');
$check(str_contains(implode(' ', PropertyScreening::fromProperty($discrepancy)['criteria']['property_cost_market_competitiveness']['missing']), 'difference exceeds 25%'), 'Saved preview retains an explicit area discrepancy reason instead of an empty missing-input list.');

// Exercise the actual repository save normalizer without database writes.
$repository = new PropertyRepository(new class extends PDO { public function __construct() {} });
$normalize = new ReflectionMethod($repository, 'normalizePropertyPayload');
$normalize->setAccessible(true);
$payload = array_merge($observations, ['name' => 'Synthetic complete property', 'property_type' => 'commercial', 'category' => 'Land', 'subcategory' => 'Commercial Lot',
    'price' => 1000000, 'land_area' => 100, 'land_area_unit' => 'sqm', 'lat' => 16.6159, 'lng' => 120.3209,
    'reference_lat' => 16.6159, 'reference_lng' => 120.3209, 'reference_label' => 'location',
    'zoning_classification' => 'C-1', 'proposed_activity' => 'retail_convenience', 'contactMode' => 'open_listing']);
$saved = $normalize->invoke($repository, $payload);
$savedProperty = ['price' => $saved['price'], 'area' => $saved['area'], 'lat' => $saved['lat'], 'lng' => $saved['lng'],
    'clupProfile' => $property['clupProfile'], 'parcel' => json_decode($saved['parcel_json'], true)];
$check(PropertyScreening::fromProperty($savedProperty)['score'] === $result['score'], 'Actual save normalization preserves the five observations used for the listing preview.');
$metadata = json_decode($saved['automatic_assessment_json'], true);
$check($metadata['iaiScore'] === null && !$metadata['rank_eligible'], 'A preview never changes the official IAI or ranking fields.');
$edited = $normalize->invoke($repository, ['description' => 'Unrelated edit'], $saved);
$check($edited['parcel_json'] === $saved['parcel_json'], 'Unrelated edits preserve the screening observations.');
echo "Property screening: {$checks} calculation, gates and save/reload checks passed; no database writes. Score {$result['score']}.\n";
