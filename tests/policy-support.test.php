<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/Support/PropertyAssessment.php';

use App\Support\PropertyAssessment;

$config = require __DIR__ . '/../app/config.php';

// 1. Verify central config structure
assert(isset($config['policy']), 'policy array must exist in app/config.php');
assert($config['policy']['ordinance_number'] === 'Ordinance No. 2024-41', 'Ordinance number must match Ordinance No. 2024-41');
assert($config['policy']['policy_priority_adjustment_percent'] === 10.0, 'Policy priority adjustment must be 10.0%');
assert(isset($config['policy']['priority_sectors']) && count($config['policy']['priority_sectors']) === 7, 'Must have 7 priority sectors');
assert($config['policy']['incentive_thresholds']['tier1_min_capital'] == 15000000, 'Tier 1 min capital must be 15M');
assert($config['policy']['incentive_thresholds']['tier2_min_capital'] == 3000000, 'Tier 2 min capital must be 3M');

// 2. Verify PropertyAssessment::policyAdjustmentPercent()
$percent = PropertyAssessment::policyAdjustmentPercent();
assert($percent === 10.0, "policyAdjustmentPercent() expected 10.0, got {$percent}");

// 3. Verify evaluateWithPolicy with priority sector
$resultPriority = PropertyAssessment::evaluateWithPolicy(80.0, true);
assert($resultPriority['baseIai'] === 80.0, 'baseIai should be 80.0');
assert($resultPriority['isPriority'] === true, 'isPriority should be true');
assert($resultPriority['adjustmentPercent'] === 10.0, 'adjustmentPercent should be 10.0');
assert($resultPriority['adjustmentPoints'] === 8.0, 'adjustmentPoints should be 8.0 (10% of 80)');
assert($resultPriority['finalIai'] === 88.0, 'finalIai should be 88.0');

// 4. Verify capping at 100
$resultCap = PropertyAssessment::evaluateWithPolicy(95.0, true);
assert($resultCap['adjustmentPoints'] === 9.5, 'adjustmentPoints should be 9.5');
assert($resultCap['finalIai'] === 100.0, "finalIai should be capped at 100.0, got {$resultCap['finalIai']}");

// 5. Verify non-priority behavior
$resultStandard = PropertyAssessment::evaluateWithPolicy(85.0, false);
assert($resultStandard['isPriority'] === false, 'isPriority should be false');
assert($resultStandard['adjustmentPercent'] === 0.0, 'adjustmentPercent should be 0.0');
assert($resultStandard['adjustmentPoints'] === 0.0, 'adjustmentPoints should be 0.0');
assert($resultStandard['finalIai'] === 85.0, 'finalIai should equal baseIai for non-priority');

// 6. Verify null handling
$resultNull = PropertyAssessment::evaluateWithPolicy(null, true);
assert($resultNull['baseIai'] === null, 'baseIai should be null');
assert($resultNull['finalIai'] === null, 'finalIai should be null');

echo "PASS: Policy support unit tests passed successfully (7 checks).\n";
