<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';

use App\Repositories\PropertyRepository;
use App\Support\PropertyAssessmentService;
use App\Support\AutomaticPropertyAssessment;

$checks = 0;
$check = static function (bool $ok, string $message) use (&$checks): void { if (!$ok) { throw new RuntimeException($message); } $checks++; };
$repository = new PropertyRepository(new class extends PDO { public function __construct() {} });
$normalize = new ReflectionMethod($repository, 'normalizePropertyPayload');
$normalize->setAccessible(true);
$base = ['name' => 'Synthetic persistence fixture', 'property_type' => 'commercial', 'category' => 'Land',
    'description' => 'Synthetic persistence fixture only.', 'price' => 1000000, 'land_area' => 2500,
    'land_area_unit' => 'sqm', 'lat' => 16.61, 'lng' => 120.32, 'contactMode' => 'open_listing', 'approval_state' => 'pending_review'];
$row = $normalize->invoke($repository, $base);
$metadata = json_decode($row['automatic_assessment_json'], true, 512, JSON_THROW_ON_ERROR);
$check($metadata['protocol_version'] === PropertyAssessmentService::METHODOLOGY_VERSION, 'New snapshots select v3 explicitly.');
$check($metadata['iaiScore'] === null, 'New records do not fabricate a score.');
$historic = $row;
$historic['assessment_json'] = json_encode(array_fill_keys(array_keys(PropertyAssessmentService::DEFAULT_WEIGHTS), 80));
$historic['automatic_assessment_json'] = json_encode(['assessmentVersion' => 'locus-auto-v1', 'iaiScore' => 80, 'generatedAt' => '2025-01-01T00:00:00Z']);
$historic['legacy_assessment_json'] = json_encode(['earlier_original' => true]);
$unchanged = $normalize->invoke($repository, ['description' => 'Changed description only.'], $historic);
$check($unchanged['assessment_json'] === $historic['assessment_json'], 'Unrelated edits preserve historical criterion JSON.');
$check($unchanged['automatic_assessment_json'] === $historic['automatic_assessment_json'], 'Unrelated edits preserve historical metadata verbatim.');
$sparseHistory = $historic;
$sparseHistory['parcel_json'] = '{}';
$sparseHistory['assessment_json'] = "{ \"economic_viability\": 80.00 }";
$sparseHistory['automatic_assessment_json'] = '{"assessmentVersion":"locus-auto-v1","inputs":{"landArea":999}}';
$sparseEdit = $normalize->invoke($repository, ['description' => 'Only the description changed.'], $sparseHistory);
$check($sparseEdit['automatic_assessment_json'] === $sparseHistory['automatic_assessment_json'], 'Default normalization or older metadata disagreement cannot implicitly reassess a historical record.');
$check($sparseEdit['assessment_json'] === $sparseHistory['assessment_json'], 'Unrelated edits preserve original criterion JSON bytes, including formatting and precision.');
$new = $normalize->invoke($repository, ['recalculate_assessment' => true], $historic);
$history = json_decode($new['legacy_assessment_json'], true);
$check($history['earlier_original'] === true, 'Reassessment preserves earlier history records.');
$check($history['snapshots'][0]['metadata'] === json_decode($historic['automatic_assessment_json'], true), 'Explicit reassessment captures exact original metadata.');
$check($history['snapshots'][0]['assessmentCriteria'] === json_decode($historic['assessment_json'], true), 'Explicit reassessment captures exact original scores.');
$newer = $normalize->invoke($repository, ['recalculate_assessment' => true], $new);
$laterHistory = json_decode($newer['legacy_assessment_json'], true);
$check(count($laterHistory['snapshots']) === 2 && $laterHistory['snapshots'][0] === $history['snapshots'][0], 'Subsequent reassessment appends and never overwrites old snapshots.');
$detail = $normalize->invoke($repository, ['electricity_arrangement' => 'grid_unconnected', 'water_supply' => 'piped_reliable',
    'internet_telecom' => 'fiber_reliable', 'drainage_conditions' => 'adequate_functional', 'road_access' => 'frontage',
    'road_surface_passability' => 'paved', 'carriageway_width' => 6, 'distance_to_major_road' => 100], $row);
$detailed = json_decode($detail['automatic_assessment_json'], true);
$check($detailed['raw_criterion_inputs']['infrastructure_readiness']['electricity'] === 'grid_unconnected', 'Existing detailed utility input feeds the shared evaluator.');
$check($detailed['criterion_scores']['infrastructure_readiness'] === 79.0, 'Unconnected detailed service uses the same provisional rubric as the server calculation.');
$check($detailed['criterion_scores']['spatial_accessibility'] === 100.0 && !$detailed['evidence_completeness'], 'Detailed spatial observations are calculable while evidence stays unverified.');
$forged = $normalize->invoke($repository, ['zoning_score' => 100, 'infrastructure_readiness_score' => 100, 'assessmentCriteria' => ['risk_constraints' => 100]], $row);
$f = json_decode($forged['assessment_json'], true);
$check($f['zoning_compatibility'] === null && $f['risk_constraints'] === null, 'Submitted aggregate scores cannot replace observations or an explicit use.');
$invalid = $metadata; $invalid['weight_configuration'] = ['invented' => 100];
$safe = AutomaticPropertyAssessment::presentStored($metadata['criterion_scores'], $invalid);
$check(!$safe['weights_valid'] && $safe['iaiScore'] === null && $safe['assessmentStatus'] === 'review_required', 'Corrupt saved weights produce a visible review requirement instead of a property-page exception.');
echo "LOCUS v3 persistence: {$checks} checks passed; no database connection or writes.\n";
