<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/PropertyAssessment.php';

use App\Support\PropertyAssessment;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void { if (!$condition) { throw new RuntimeException($message); } $checks++; };
$keys = array_keys(PropertyAssessment::WEIGHTS);
$check(array_sum(PropertyAssessment::WEIGHTS) === 100, 'MCE weights do not sum to 100.');
foreach ([0.0, 100.0] as $boundary) {
    $scores = PropertyAssessment::scores(array_fill_keys($keys, $boundary));
    $check($scores['mceScore'] === $boundary && $scores['iaiScore'] === $boundary && $scores['assessmentComplete'], 'A complete boundary assessment is inaccurate.');
}
// Independent calculation: 100*.20 + 80*.20 + 60*.20 + 40*.10 + 20*.15 + 0*.15 = 55.
$mixed = array_combine($keys, [100, 80, 60, 40, 20, 0]);
$scores = PropertyAssessment::scores($mixed);
$check($scores['mceScore'] === 55.0 && $scores['iaiScore'] === 55.0, 'MCE composite score must equal IAI without double counting.');
$check($scores['assessmentStatus'] === 'conditional', 'Zoning score of 20 should flag conditional status.');

// Zoning constraint: prohibited land use (score 0 or explicit prohibited) must yield not_suitable and null IAI
$prohibited = PropertyAssessment::scores(array_replace($mixed, ['zoning_compatibility' => 0]));
$check($prohibited['assessmentStatus'] === 'not_suitable' && $prohibited['iaiScore'] === null, 'Prohibited zoning must disqualify property with null IAI.');
$check(!empty($prohibited['reason']), 'Prohibited zoning must provide explicit disqualification reason.');

// MCE = 73.49 rounds to 73.5: 73.4 * 0.85 + 74.0 * 0.15 = 73.49 -> 73.5
$rounding = array_combine($keys, [73.4, 73.4, 73.4, 73.4, 73.4, 74.0]);
$scores = PropertyAssessment::scores($rounding);
$check($scores['mceScore'] === 73.5 && $scores['iaiScore'] === 73.5, 'Half-tenth rounding is inconsistent.');
$missing = $mixed;
unset($missing['risk_constraints']);
$scores = PropertyAssessment::scores($missing);
$check(!$scores['assessmentComplete'] && $scores['assessmentStatus'] === 'incomplete' && $scores['mceScore'] === null && $scores['iaiScore'] === null, 'Missing input fabricated an assessment.');
$check(count($scores['missingRequirements']) >= 1, 'Incomplete assessment must list missing requirements.');
foreach ([-0.1, 100.1, INF, 'not numeric'] as $invalid) {
    try { PropertyAssessment::scores(array_replace($mixed, ['risk_constraints' => $invalid])); }
    catch (InvalidArgumentException) { $check(true, 'Out-of-range input rejected.'); continue; }
    throw new RuntimeException('Invalid assessment input was accepted.');
}
$first = PropertyAssessment::scores(array_fill_keys($keys, 80.01));
$second = PropertyAssessment::scores(array_fill_keys($keys, 80.04));
$ranks = PropertyAssessment::ranks([['id' => 1] + $first, ['id' => 2] + $second, ['id' => 3] + PropertyAssessment::scores(array_fill_keys($keys, 70)), ['id' => 4] + PropertyAssessment::scores([])]);
$check($ranks[1]['mceRank'] === 1 && $ranks[2]['mceRank'] === 1 && $ranks[3]['mceRank'] === 3 && !isset($ranks[4]), 'Near-equal rounded scores or missing scores received incorrect ranks.');
if (in_array('--json-fixtures', $argv, true)) {
    $fixtures = [array_fill_keys($keys, 0), array_fill_keys($keys, 100), $mixed, $rounding, $missing];
    mt_srand(7345);
    for ($index = 0; $index < 500; $index++) {
        $fixtures[] = array_combine($keys, array_map(static fn (string $key): float => mt_rand(0, 1000) / 10, $keys));
    }
    echo json_encode(['weights' => PropertyAssessment::WEIGHTS, 'fixtures' => array_map(static fn (array $criteria): array => PropertyAssessment::scores($criteria), $fixtures)], JSON_THROW_ON_ERROR);
} else {
    echo "Property assessment checks passed: $checks\n";
}
