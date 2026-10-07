<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../app/Support/PropertyAssessment.php';

use App\Support\PropertyAssessment;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$policy = (require __DIR__ . '/../app/config.php')['policy'];
$check($policy['ordinance_number'] === 'Ordinance No. 2024-41', 'Ordinance identity changed.');
$check(count($policy['priority_sectors']) === 7, 'Public sector summary is incomplete.');
$check($policy['incentives_verified'] === true, 'Verified ordinance thresholds must be enabled.');
$thresholds = $policy['incentive_thresholds'];
$check($thresholds['tier1_min_capital'] === 15000000.0 && $thresholds['tier1_exemption_years'] === 1, 'Section 19 exemption threshold or term is inaccurate.');
$check($thresholds['tier2_min_capital'] === 3000000.0 && $thresholds['tier2_max_capital'] === 14999999.0 && $thresholds['tier2_discount_percent'] === 10, 'Section 19 discount boundaries or rate are inaccurate.');
$check($policy['priority_modifier_approved'] === false && PropertyAssessment::policyAdjustmentPercent() === 0.0, 'An unapproved research modifier changed IAI.');
foreach ([0.0, 80.0, 95.0, 100.0] as $base) {
    foreach ([true, false] as $priority) {
        $result = PropertyAssessment::evaluateWithPolicy($base, $priority);
        $check($result['baseIai'] === $base && $result['finalIai'] === $base && $result['adjustmentPercent'] === 0.0 && $result['adjustmentPoints'] === 0.0, 'Priority alignment must not alter the departmental score without approval.');
    }
}
$result = PropertyAssessment::evaluateWithPolicy(null, true);
$check($result['baseIai'] === null && $result['finalIai'] === null && $result['adjustmentPoints'] === null, 'An unassessed site received a policy score.');
$titles = array_column($policy['compliance'], 'title');
$check(in_array('Local workforce · 70%', $titles, true) && in_array('CSR commitment · 5%', $titles, true), 'Verified workforce or CSR requirements are missing.');
echo "Policy support checks passed: $checks\n";
