<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/PropertyBusinessProfiles.php';

use App\Support\PropertyAssessment;
use App\Support\PropertyBusinessProfiles;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$keys = array_keys(PropertyAssessment::WEIGHTS);
$ratings = array_combine($keys, [100, 80, 60, 40, 20, 0, 100]);
$assessment = PropertyAssessment::scores($ratings) + [
    'assessmentMode' => 'automatic', 'assessmentVersion' => 'SYNTHETIC-test', 'ruleVersion' => 'SYNTHETIC-rule',
    'generatedAt' => '2026-01-01T00:00:00Z', 'inputs' => ['category' => 'Land', 'landArea' => .25],
    'criteriaDetails' => ['zoning_compatibility' => ['raw' => ['zoning_classification' => 'Synthetic zone', 'zoning_status' => 'permitted']]],
];
$rules = [];
foreach ($ratings as $key => $rating) {
    $rules[$key] = ['operator' => 'bands', 'reference' => 'SYNTHETIC score mapping only',
        'bands' => [['max' => $rating, 'rating' => $rating, 'reason' => 'Synthetic supporting evidence: ' . $key,
            'concern' => $key === 'risk_constraints' ? 'Synthetic risk requires review' : '']]];
    if ($rating < 100) {
        $rules[$key]['bands'][] = ['max' => 100, 'rating' => 100, 'reason' => 'Synthetic upper band: ' . $key, 'concern' => ''];
    }
}
$profile = ['id' => 'synthetic-a', 'label' => 'Synthetic option A',
    'approval_reference' => 'SYNTHETIC TEST ONLY', 'source_reference' => 'Synthetic evidence only',
    'eligibility_reference' => 'Synthetic eligibility only',
    'eligibility' => ['categories' => ['Land'], 'zoning_classifications' => ['Synthetic zone'],
        'zoning_statuses' => ['permitted', 'conditional'], 'minimum_area_ha' => .1, 'maximum_area_ha' => 1],
    'criteria_rules' => $rules];
$config = ['approved' => true, 'approval_reference' => 'SYNTHETIC TEST ONLY', 'version' => 'SYNTHETIC-v1',
    'method_reference' => 'Synthetic method only', 'source_reference' => 'Synthetic sources only',
    'score_scale_reference' => 'Synthetic comparable scale only', 'weights' => PropertyAssessment::WEIGHTS,
    'profiles' => [$profile]];

$pending = PropertyBusinessProfiles::configured()->evaluate($assessment);
$check($pending['status'] === 'pending' && $pending['matches'] === [] && !$pending['metadata']['approved'], 'The shipped unapproved method must never return scores.');
$check($pending['weights'] === PropertyAssessment::WEIGHTS && $pending['pendingReasons'] !== [], 'Pending preview retains weights and explains the approval requirement.');
$missing = $assessment;
$missing['assessmentCriteria']['environmental_safety'] = null;
$missing['assessmentComplete'] = false;
$out = (new PropertyBusinessProfiles($config))->evaluate($missing);
$check($out['status'] === 'pending' && $out['matches'] === [] && $out['completedCount'] === 6, 'Incomplete evidence must prevent business scores even when profiles are approved.');
$check($out['missingCriteria'][0]['key'] === 'environmental_safety' && $out['missingCriteria'][0]['nextAction'] !== '', 'Missing evidence needs a criterion-specific action.');
$legacy = $assessment; $legacy['assessmentMode'] = 'legacy_manual';
$check((new PropertyBusinessProfiles($config))->evaluate($legacy)['matches'] === [], 'Legacy manual scores cannot drive the new business preview.');
$out = (new PropertyBusinessProfiles($config))->evaluate($assessment);
$check($out['status'] === 'ready' && count($out['matches']) === 1 && $out['matches'][0]['score'] === 60.0, 'Independent weighted ratings 100/80/60/40/20/0/100 must yield 60.0, not IAI 64.0.');
$check($out['matches'][0]['criteria'][5]['rating'] === 0.0 && $out['matches'][0]['criteria'][5]['contribution'] === 0.0, 'A real measured zero is a valid rating.');
$check(count($out['matches'][0]['criteria']) === 7 && count($out['matches'][0]['reasons']) === 7 && $out['matches'][0]['concerns'] === ['Synthetic risk requires review'], 'Complete score breakdown, documented reasons and concerns are returned.');
$check($out['metadata']['approvalReference'] === 'SYNTHETIC TEST ONLY' && $out['metadata']['assessmentRuleVersion'] === 'SYNTHETIC-rule', 'Method and evidence provenance must accompany matches.');
$boundary = $assessment;
$boundary['assessmentCriteria'] = array_fill_keys($keys, 0);
$zeroConfig = $config;
foreach ($zeroConfig['profiles'][0]['criteria_rules'] as &$rule) {
    $rule['bands'] = [['max' => 100, 'rating' => 0, 'reason' => 'Synthetic zero result', 'concern' => '']];
}
unset($rule);
$check((new PropertyBusinessProfiles($zeroConfig))->evaluate($boundary)['matches'][0]['score'] === 0.0, 'A complete zero result must not be withheld.');

foreach (['approval_reference', 'version', 'method_reference', 'source_reference', 'score_scale_reference'] as $field) {
    $bad = $config; $bad[$field] = '';
    $check((new PropertyBusinessProfiles($bad))->evaluate($assessment)['matches'] === [], 'Missing documented ' . $field . ' must prevent ranking.');
}
$bad = $config; $bad['approved'] = false;
$check((new PropertyBusinessProfiles($bad))->evaluate($assessment)['matches'] === [], 'Unapproved explicit test mappings must not be used.');
foreach (['missing_key', 'extra_key', 'changed_weight'] as $fault) {
    $bad = $config;
    if ($fault === 'missing_key') { unset($bad['weights']['environmental_safety']); }
    elseif ($fault === 'extra_key') { $bad['weights']['eighth_criterion'] = 0; }
    else { $bad['weights']['spatial_accessibility'] = 21; }
    $check((new PropertyBusinessProfiles($bad))->evaluate($assessment)['matches'] === [], 'Incompatible comparison weights must stay pending: ' . $fault);
}
foreach (['missing_rule', 'uncovered_band', 'descending_band', 'invalid_rating', 'missing_reason', 'missing_eligibility', 'duplicate_id'] as $fault) {
    $bad = $config;
    if ($fault === 'missing_rule') { unset($bad['profiles'][0]['criteria_rules']['environmental_safety']); }
    elseif ($fault === 'uncovered_band') { $bad['profiles'][0]['criteria_rules']['environmental_safety']['bands'][0]['max'] = 99; }
    elseif ($fault === 'descending_band') { $bad['profiles'][0]['criteria_rules']['spatial_accessibility']['bands'][] = ['max' => 90, 'rating' => 50, 'reason' => 'Synthetic', 'concern' => '']; }
    elseif ($fault === 'invalid_rating') { $bad['profiles'][0]['criteria_rules']['spatial_accessibility']['bands'][0]['rating'] = 101; }
    elseif ($fault === 'missing_reason') { $bad['profiles'][0]['criteria_rules']['spatial_accessibility']['bands'][0]['reason'] = ''; }
    elseif ($fault === 'missing_eligibility') { unset($bad['profiles'][0]['eligibility']['categories']); }
    else { $bad['profiles'][] = $bad['profiles'][0]; }
    $check((new PropertyBusinessProfiles($bad))->evaluate($assessment)['status'] === 'pending', 'Invalid profile configuration must fail closed: ' . $fault);
}
foreach (['category', 'area', 'zone', 'prohibited', 'missing_zone'] as $fault) {
    $excluded = $assessment;
    if ($fault === 'category') { $excluded['inputs']['category'] = 'Office'; }
    elseif ($fault === 'area') { $excluded['inputs']['landArea'] = .05; }
    elseif ($fault === 'zone') { $excluded['criteriaDetails']['zoning_compatibility']['raw']['zoning_classification'] = 'Other zone'; }
    elseif ($fault === 'prohibited') { $excluded['criteriaDetails']['zoning_compatibility']['raw']['zoning_status'] = 'prohibited'; }
    else { unset($excluded['criteriaDetails']['zoning_compatibility']['raw']['zoning_classification']); }
    $out = (new PropertyBusinessProfiles($config))->evaluate($excluded);
    $check($out['status'] === 'no_eligible_matches' && $out['matches'] === [], 'Eligibility must exclude an unsupported business option: ' . $fault);
}
$conditional = $assessment;
$conditional['criteriaDetails']['zoning_compatibility']['raw']['zoning_status'] = 'conditional';
$out = (new PropertyBusinessProfiles($config))->evaluate($conditional);
$check(count($out['matches'][0]['concerns']) === 2 && str_contains($out['matches'][0]['concerns'][0], 'conditional'), 'Conditional zoning must retain a clearance concern.');
$rankConfig = $config; $rankConfig['profiles'] = [];
foreach (['b' => 70, 'a' => 70, 'c' => 90, 'd' => 40] as $suffix => $rating) {
    $entry = $profile; $entry['id'] = 'synthetic-' . $suffix;
    foreach ($entry['criteria_rules'] as &$rule) {
        $rule['bands'] = [['max' => 100, 'rating' => $rating, 'reason' => 'Synthetic ranking fixture', 'concern' => '']];
    }
    unset($rule); $rankConfig['profiles'][] = $entry;
}
$out = (new PropertyBusinessProfiles($rankConfig))->evaluate($assessment);
$check(array_column($out['matches'], 'id') === ['synthetic-c', 'synthetic-a', 'synthetic-b'] && array_column($out['matches'], 'rank') === [1, 2, 3], 'Top three ranking must be bounded and deterministic for equal scores.');
echo "Property business profile checks passed: $checks\n";
