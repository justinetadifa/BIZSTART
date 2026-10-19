<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/PropertyAssessmentService.php';
use App\Support\PropertyAssessmentService as Assessment;
$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$base = ['land_area' => 5950, 'offered_space_scope' => 'entire_land', 'asking_price' => 350000000,
    'comparable_market_price' => 15000, 'comparable_unit' => 'PHP/m2', 'comparables_suitable' => true];
$reported = Assessment::evaluatePropertyCostMarketCompetitiveness($base);
$preview = Assessment::evaluatePropertyCostMarketCompetitiveness($base, ['preview_only' => true]);
$verified = Assessment::evaluatePropertyCostMarketCompetitiveness($base + ['comparable_source' => 'Synthetic comparable fixture'], ['is_verified' => true]);
$check($reported['score'] === null && $reported['is_complete'] === false, 'A comparison without source verification remains unreleased.');
$check(abs($preview['pricing_analysis']['asking_price_per_sqm'] - 58823.5294117647) < 0.000001, 'The exact offered area is used, not a rounded stored price per sqm.');
$check(abs($preview['pricing_analysis']['active_difference_percent'] - 292.156862745098) < 0.000001, 'The price premium retains full calculation precision.');
$check($preview['score'] === 50.0 && $preview['iai_contribution'] === 10.0 && $preview['is_provisional'], 'The LA Finn inputs give a provisional 50 rating and 10 points at 20%.');
$check($verified['score'] === 50.0, 'The same inputs use the same band after verification.');

$boundaries = [
    [-20.0001, 75.0], [-20, 90.0], [-5.0001, 90.0], [-5, 100.0], [0, 100.0], [5, 100.0],
    [5.0001, 85.0], [15, 85.0], [15.0001, 70.0], [30, 70.0], [30.004, 50.0], [292.16, 50.0],
];
$boundaryResults = [];
foreach ($boundaries as [$difference, $expected]) {
    $input = ['land_area' => 100, 'asking_price' => 10000 * (1 + $difference / 100) * 100,
        'comparable_market_price' => 10000, 'comparable_source' => 'Synthetic boundary fixture',
        'comparable_unit' => 'PHP/m2', 'comparables_suitable' => true];
    $result = Assessment::evaluatePropertyCostMarketCompetitiveness($input, ['is_verified' => true]);
    $check($result['score'] === $expected, "Exact band boundary {$difference}% uses the correct score.");
    $check($result['pricing_analysis']['matched_band']['score'] === $result['score'], 'Calculation and explanation share the same band definition.');
    $boundaryResults[] = $result;
}
$leaseInput = ['listing_purpose' => 'lease', 'lease_price' => 60000, 'lease_period' => 'month', 'lease_price_unit' => 'total',
    'land_area' => 5000, 'offered_area_sqm' => 250, 'offered_space_scope' => 'part_property',
    'comparable_lease_price' => 200, 'comparable_unit' => 'PHP/m2/month', 'comparable_source' => 'Synthetic rent fixture', 'comparables_suitable' => true];
$lease = Assessment::evaluatePropertyCostMarketCompetitiveness($leaseInput, ['is_verified' => true]);
$check($lease['pricing_analysis']['active_unit_price'] === 240.0 && $lease['pricing_analysis']['comparison_basis'] === 'lease', 'Lease comparisons use the offered floor area and monthly rent.');
$check($lease['score'] === 70.0 && $lease['iai_contribution'] === 14.0, 'A 20% lease premium contributes 14 of 20 points.');
$annual = Assessment::evaluatePropertyCostMarketCompetitiveness(array_replace($leaseInput, ['lease_price' => 720000, 'lease_period' => 'year']), ['is_verified' => true]);
$check($annual['pricing_analysis']['active_unit_price'] === 240.0, 'Annual rent is normalized before comparison.');
$dual = Assessment::evaluatePropertyCostMarketCompetitiveness(array_replace($leaseInput, ['listing_purpose' => 'sale_or_lease']), ['is_verified' => true]);
$check($dual['pricing_analysis']['comparison_basis'] === 'lease', 'A dual listing without a sale comparison identifies its lease basis.');
$incompatible = Assessment::evaluatePropertyCostMarketCompetitiveness(array_replace($leaseInput, ['comparable_unit' => 'PHP/m2']), ['preview_only' => true]);
$check($incompatible['score'] === null, 'A sale comparable cannot score monthly rent.');
$missing = Assessment::evaluatePropertyCostMarketCompetitiveness(array_replace($base, ['comparable_market_price' => null]), ['preview_only' => true]);
$check($missing['score'] === null && $missing['pricing_analysis']['matched_band'] === null, 'A missing comparable cannot produce a score band.');
$request = Assessment::evaluatePropertyCostMarketCompetitiveness($base + ['sale_price_mode' => 'request'], ['preview_only' => true]);
$check($request['score'] === null && $request['pricing_analysis']['active_unit_price'] === null, 'Price on request does not revive a stale asking price.');
if (in_array('--json', $argv, true)) {
    echo json_encode(compact('preview', 'reported', 'verified', 'lease', 'annual', 'dual', 'incompatible', 'missing', 'request', 'boundaryResults') + ['metadata' => Assessment::propertyCostScoringMetadata()], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
} else {
    echo "Property cost explanation: {$checks} engine and boundary checks passed.\n";
}
