<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/NearbyBusinesses.php';
require_once dirname(__DIR__) . '/app/Support/ClimateRiskService.php';
require_once dirname(__DIR__) . '/app/Support/BusinessOpportunities.php';
use App\Support\NearbyBusinesses as Nearby;
use App\Support\ClimateRiskService as Climate;
use App\Support\BusinessOpportunities as Opportunities;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$subject = ['id' => 216, 'name' => "LA FINN'S SCHOLASTICA", 'lat' => 16.627922, 'lng' => 120.325776];
$self = ['id' => 'osm-self', 'name' => 'La Finns Scholastica College', 'lat' => 16.628100, 'lng' => 120.325900, 'categoryKey' => 'college'];
$other = ['id' => 216, 'name' => 'Pig Out', 'lat' => 16.628110, 'lng' => 120.325950, 'categoryKey' => 'restaurant'];
$branch = array_merge($self, ['id' => 'other-branch', 'lat' => 16.633, 'name' => 'La Finns Scholastica College']);
$check(Nearby::isSubjectEstablishment($subject, $self), 'Apostrophe, spacing and college suffix resolve the nearby subject.');
$check(!Nearby::isSubjectEstablishment($subject, $other), 'An unrelated merchant remains even when its numeric id matches the listing id.');
$check(!Nearby::isSubjectEstablishment($subject, $branch), 'A separate branch outside the local matching tolerance remains nearby.');
$check(!Nearby::isSubjectEstablishment($subject, array_merge($self, ['name' => 'La Finns Scholastica Norte'])), 'Distinct branch names are not stripped.');
$check(Nearby::isSubjectEstablishment(array_merge($subject, ['osm_id' => 'node/123']), array_merge($other, ['osm_id' => 'node/123'])), 'Explicit establishment identity wins over different recorded names.');
$check(!Nearby::isSubjectEstablishment(['name' => 'Land', 'lat' => 16.628, 'lng' => 120.326], array_merge($other, ['name' => 'Land'])), 'Generic property names cannot exclude a merchant.');
$check(!Nearby::isSubjectEstablishment(array_merge($subject, ['name' => 'Commercial Property']), array_merge($self, ['name' => 'Commercial Building'])), 'Long generic descriptors cannot be mistaken for establishment identity.');
$check(Nearby::classifyEstablishment($other, 'general')['classification'] === 'nearby_place', 'An unspecified use cannot declare every establishment complementary.');
$check(Nearby::classifyEstablishment(['name' => 'Unnamed', 'categoryKey' => ''], 'cafe')['classification'] !== 'competitor', 'An empty category cannot match every proposed activity.');

$directory = sys_get_temp_dir() . '/locus-subject-' . bin2hex(random_bytes(8));
mkdir($directory);
try {
    $features = array_map(static fn ($item): array => ['type' => 'Feature', 'geometry' => ['type' => 'Point', 'coordinates' => [$item['lng'], $item['lat']]], 'properties' => $item], [$self, $other, $branch]);
    file_put_contents($directory . '/commercial-directory.json', json_encode(['features' => $features], JSON_THROW_ON_ERROR));
    $nearby = Nearby::find($subject, null, 2, 2500, null, $directory);
    $check(count($nearby) === 2 && $nearby[0]['name'] === 'Pig Out', 'Subject exclusion happens before the limit; the nearest genuine neighbor is retained.');
    $check($nearby[1]['id'] === 'other-branch', 'A real branch fills the remaining result slot.');
    $check(Nearby::find(['lat' => 100, 'lng' => 120], null, 2, 2500, null, $directory) === [], 'Out-of-range coordinates are rejected.');
} finally {
    unlink($directory . '/commercial-directory.json');
    rmdir($directory);
}

$opportunities = Opportunities::evaluate(array_merge($subject, ['nearbyBusinesses' => [$self, $other], 'zoning_classification' => 'C-2']), 500);
$encoded = json_encode($opportunities);
$check(!str_contains($encoded, 'La Finns Scholastica College'), 'The opportunity analysis also excludes the subject from its input inventory.');

$scores = ['spatial_accessibility' => 100, 'infrastructure_readiness' => 100, 'property_cost_market_competitiveness' => 50, 'nearby_businesses' => 79, 'risk_constraints' => 67.5];
$weights = ['spatial_accessibility' => 25, 'infrastructure_readiness' => 25, 'property_cost_market_competitiveness' => 20, 'nearby_businesses' => 15, 'risk_constraints' => 15];
$hazards = ['flood_susceptibility' => 'high', 'active_fault' => 'none', 'landslide_susceptibility' => 'low', 'storm_surge' => 'none', 'liquefaction_susceptibility' => 'moderate', 'tsunami_exposure' => 'high'];
$property = array_merge($subject, [
    'barangay' => 'Biday', 'protocol_version' => 'LOCUS-SF MCE v3.0', 'assessmentStatus' => 'technical_review_hold',
    'assessmentComplete' => false, 'evidence_completeness' => false, 'numerical_completeness' => true, 'weights_valid' => true,
    'displayed_iai' => null, 'iaiScore' => 82, 'mceScore' => 82, 'technical_review_hold' => true,
    'technical_review_reasons' => ['High flood susceptibility requires technical review.', 'High tsunami exposure requires technical review.'],
    'criterion_scores' => $scores, 'weight_configuration' => $weights,
    'weighted_contributions' => array_map(static fn ($score, $weight): float => $score * $weight / 100, $scores, $weights),
    'subcriterion_scores' => ['risk_constraints' => array_map(static fn ($status): array => ['raw_status' => $status, 'evidence_status' => 'reported_unverified', 'score' => $status === 'high' ? 25 : 100], $hazards)],
]);
// array_map with multiple arrays produces numeric keys; restore the criterion identifiers.
$property['weighted_contributions'] = array_combine(array_keys($scores), $property['weighted_contributions']);
$property['climateRisk'] = Climate::evaluate($property);
$check($property['climateRisk']['flood_factor']['label'] === 'High susceptibility', 'Climate context agrees with the recorded high flood finding.');
$check($property['climateRisk']['flood_factor']['evidence_status'] === 'reported_unverified', 'Recorded high susceptibility does not imply authenticated evidence.');
$check($property['climateRisk']['fire_factor']['score'] === null, 'Straight-line station distance does not invent a fire risk score.');
$check($property['climateRisk']['fire_factor']['distance_to_station_m'] > 1000, 'The recorded location is used for distance, without replacing it with a barangay centroid.');
$check(!str_contains(json_encode($property['climateRisk']), 'Compliant') && !isset($property['climateRisk']['fire_factor']['response_time_est']), 'Fire compliance and response times are not manufactured.');
$missing = Climate::evaluate(['barangay' => 'Madaydegdeg']);
$check($missing['flood_factor']['score'] === null && $missing['fire_factor']['distance_to_station_m'] === null, 'A barangay name alone supplies neither flood susceptibility nor station distance.');
$check(Climate::evaluate(['lat' => 95, 'lng' => 120])['fire_factor']['available'] === false, 'Invalid coordinates cannot yield an emergency access reference.');
if (in_array('--json', $argv, true)) {
    $property['nearbyBusinesses'] = Nearby::find($subject, null, 12, 2500);
    echo json_encode($property, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
} else {
    echo "Property context consistency: {$checks} checks passed.\n";
}
