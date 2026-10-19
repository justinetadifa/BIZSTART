<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';

use App\Support\ZoningRulesEngine;
use App\Repositories\PropertyRepository;

$data = ZoningRulesEngine::getScreeningData();
if (in_array('--json', $argv, true)) { echo json_encode($data, JSON_THROW_ON_ERROR); exit; }
$checks = 0;
$check = static function (bool $ok, string $message) use (&$checks): void {
    if (!$ok) { throw new RuntimeException($message); } $checks++;
};
$check($data['screening_only'] && !$data['is_official_city_rule'] && $data['evidence_status'] === 'UNVERIFIED', 'A reference matrix cannot authenticate parcel compliance.');
$check($data['source_review_date'] === '2026-07-15' && str_starts_with($data['source_url'], 'https://archives.sanfernandocity.gov.ph/'), 'Evidence context retains its dated inventory and official source URL.');
$check($data['weight'] === 0.0 && count($data['evidence_gaps']) > 0, 'The zoning gate contributes no points and retains evidence gaps.');
$pairs = 0;
foreach ($data['rules'] as $zone => $activities) {
    foreach ($activities as $activity => $reference) {
        $evaluated = ZoningRulesEngine::evaluate($zone, $activity);
        $lookup = ZoningRulesEngine::lookupRule($zone, $activity);
        $check($reference['score'] === $evaluated['score'] && $reference['status'] === $evaluated['status'], 'Exported reference agrees with PHP: ' . $zone . '/' . $activity);
        $check(!$lookup['is_official_city_rule'] && !$evaluated['is_official_city_rule'], 'Coded rules do not claim official authentication.');
        $pairs++;
    }
}
$check($pairs === 522, 'Every configured district/activity combination is exported.');
$conditional = ZoningRulesEngine::evaluate('R-1', 'food_cafe', ['scale'=>true, 'height'=>true, 'setback'=>true, 'pollution'=>true]);
$check($conditional['status'] === 'conditional' && !$conditional['conditions_met'] && count($conditional['outstanding_requirements']) > 0, 'Applicant toggles cannot clear conditional requirements.');
$check(ZoningRulesEngine::evaluate('C-2', 'institutional')['score'] === null, 'A broad activity group cannot substitute for an exact activity.');
$check(ZoningRulesEngine::evaluate('C-2', 'inst_school')['status'] === 'undetermined', 'An unmapped school/commercial pair stays undetermined rather than becoming prohibited or allowed.');

// Exercise real save normalization with a PDO stub: no connection or database writes.
$repository = new PropertyRepository(new class extends PDO { public function __construct() {} });
$normalize = new ReflectionMethod($repository, 'normalizePropertyPayload');
$normalize->setAccessible(true);
$base = ['name'=>'Zoning logic fixture', 'property_type'=>'commercial', 'category'=>'Land', 'subcategory'=>'Commercial Lot',
    'price'=>1000000, 'land_area'=>100, 'land_area_unit'=>'sqm', 'lat'=>16.6159, 'lng'=>120.3209, 'contactMode'=>'open_listing',
    'zoning_classification'=>'C-1', 'proposed_activity'=>'inst_school', 'existing_land_use'=>'Institutional',
    'clup_allowed_uses'=>['inst_school'], 'clup_conditional_uses'=>['Reported source note']];
$saved = $normalize->invoke($repository, $base);
$check($saved['zoning_score'] === 100, 'An exact pair calculates its compatibility rating.');
foreach ([['proposed_activity'=>''], ['zoning_classification'=>''], ['proposed_activity'=>'institutional'], ['zoning_classification'=>'UNKNOWN']] as $clearing) {
    $edited = $normalize->invoke($repository, $clearing + ['zoning_score'=>100], $saved);
    $check($edited['zoning_score'] === null, 'Missing or unknown scenario clears the stale rating despite a forged submitted score.');
}
$unrelated = $normalize->invoke($repository, ['description'=>'Unrelated edit'], $saved);
$check($unrelated['clup_allowed_uses_json'] === $saved['clup_allowed_uses_json'], 'Unrelated edits retain previously reported use entries.');
$check($unrelated['clup_conditional_uses_json'] === $saved['clup_conditional_uses_json'], 'Unrelated edits retain reported clearance notes.');
$prohibited = $normalize->invoke($repository, ['zoning_classification'=>'R-1', 'proposed_activity'=>'ind_heavy_manufacturing',
    'clup_allowed_uses'=>['ind_heavy_manufacturing'], 'zoning_score'=>100], $saved);
$check($prohibited['zoning_score'] === 0, 'Reported allowed-use entries cannot override a restricted rule.');
$new = $normalize->invoke($repository, array_replace($base, ['proposed_activity'=>'', 'category'=>'Land', 'zoning_score'=>100]));
$check($new['zoning_score'] === null, 'Existing institutional use or a property category cannot invent a proposed activity.');
echo "Zoning intake: {$checks} reference-parity, provenance and save/clear checks passed; no database connection or writes.\n";
