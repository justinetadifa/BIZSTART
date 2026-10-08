<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Support/JsonData.php';
require_once dirname(__DIR__) . '/app/Support/PropertyParcel.php';
require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';
require_once dirname(__DIR__) . '/app/Core/SchemaManager.php';
require_once dirname(__DIR__) . '/api/_listing-policy.php';

use App\Support\PropertyParcel;
use App\Repositories\PropertyRepository;
use App\Core\SchemaManager;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); } $checks++;
};
$reject = static function (callable $operation) use ($check): void {
    try { $operation(); } catch (InvalidArgumentException) { $check(true, 'Invalid input rejected.'); return; }
    throw new RuntimeException('Invalid parcel input was accepted.');
};
$feature = static fn (array $ring): array => ['type' => 'Feature', 'properties' => [], 'geometry' => ['type' => 'Polygon', 'coordinates' => [$ring]]];
$rectangle = $feature([[120.32, 16.61], [120.321, 16.61], [120.321, 16.611], [120.32, 16.611], [120.32, 16.61]]);
// Independent analytic spherical rectangle area; does not reproduce the ring implementation.
$expected = 6371008.8 ** 2 * deg2rad(.001) * (sin(deg2rad(16.611)) - sin(deg2rad(16.61)));
$boundary = PropertyParcel::boundary($rectangle);
$check(abs(PropertyParcel::area($boundary) - $expected) < .001, 'Boundary area differs from the analytic rectangle.');
$check(abs(PropertyParcel::area(PropertyParcel::boundary($feature(array_reverse($rectangle['geometry']['coordinates'][0])))) - $expected) < .001, 'Ring orientation changed calculated area.');
$parcel = PropertyParcel::fromPayload(['boundary' => json_encode($rectangle), 'calculated_area_sqm' => 999999999, 'reference_lat' => '16.61000049', 'reference_lng' => '120.32000049', 'reference_label' => 'South entrance', 'electricity' => 'available', 'internet' => 'not_verified', 'bir_zonal_value' => '1,200', 'bir_source' => 'Observed BIR record', 'bir_date' => '2026-10-07']);
$check($parcel['estimatedAreaSqm'] === round($expected, 2) && $parcel['surveyAreaSqm'] === null, 'Client area was trusted or estimate became a survey.');
$check($parcel['referencePoint'] === ['label' => 'South entrance', 'lat' => 16.61, 'lng' => 120.32], 'Labeled reference point did not preserve storage precision.');
$check($parcel['observations']['bir_zonal_value'] === 1200.0 && $parcel['observations']['internet'] === 'not_verified', 'Typed observations were lost.');
$survey = PropertyParcel::fromPayload(['land_area' => '.325', 'land_area_unit' => 'hectares'], $parcel);
$check($survey['surveyAreaSqm'] === 3250.0 && $survey['estimatedAreaSqm'] === $parcel['estimatedAreaSqm'], 'Survey and calculated area were not kept separate.');
$cleared = PropertyParcel::fromPayload(['land_area' => '', 'land_area_unit' => 'sqm'], $survey);
$check($cleared['surveyAreaSqm'] === null && $cleared['boundary']['geometry'] === $survey['boundary']['geometry'], 'Clearing survey evidence removed the boundary.');
$check(json_encode(PropertyParcel::fromPayload([], $survey)) === json_encode($survey), 'Unrelated edits erased parcel context.');
$check(PropertyParcel::fromPayload(['land_area' => null, 'land_area_unit' => 'sqm'], $survey)['surveyAreaSqm'] === 3250.0, 'Null area reinterpreted an existing measurement.');

foreach ([
    '{invalid', $feature([[0, 0], [1, 0], [1, 1], [0, 1]]),
    $feature([[0, 0], [1, 1], [0, 1], [1, 0], [0, 0]]),
    $feature([[0, 0], [2, 0], [1, 0], [1, 1], [0, 0]]),
    $feature([[0, 0], [1, 0], [1, 1], [1, 0], [0, 0]]),
    $feature([[0, 0], [1, 0], [2, 0], [0, 0]]),
    $feature([[181, 0], [180, 0], [180, 1], [181, 0]]),
    $feature([['0', 0], [1, 0], [1, 1], ['0', 0]]),
    $feature([[179, 0], [-179, 0], [-179, 1], [179, 0]]),
    ['type' => 'Feature', 'geometry' => ['type' => 'Polygon', 'coordinates' => [$rectangle['geometry']['coordinates'][0], $rectangle['geometry']['coordinates'][0]]]],
] as $invalid) { $reject(static fn () => PropertyParcel::boundary($invalid)); }
foreach ([['reference_lat' => 91, 'reference_lng' => 120], ['reference_lat' => 16.61], ['road_frontage' => 'maybe'], ['water' => ['available']], ['bir_zonal_value' => -10], ['bir_date' => '2026-02-30'], ['evidence_reference' => ['score' => 100]], ['land_area' => -2], ['land_area' => 'abc'], ['land_area' => 1, 'land_area_unit' => 'acres']] as $invalid) {
    $reject(static fn () => PropertyParcel::fromPayload($invalid));
}

$repository = new PropertyRepository(new class extends PDO { public function __construct() {} });
$normalize = new ReflectionMethod($repository, 'normalizePropertyPayload');
$normalize->setAccessible(true);
$base = ['name' => 'Synthetic parcel fixture', 'property_type' => 'commercial', 'category' => 'Land', 'lat' => 16.61, 'lng' => 120.32, 'boundary' => json_encode($rectangle), 'approval_state' => 'pending_review'];
$row = $normalize->invoke($repository, $base);
$savedParcel = json_decode($row['parcel_json'], true, 512, JSON_THROW_ON_ERROR);
$check($row['area'] === round(round($expected, 2) / 10000, 4), 'Effective property area did not use its boundary estimate.');
$check($row['price'] === null && $row['price_per_sqm'] === null && $row['description'] === '', 'Optional asking price or description acquired invented values.');
$check(json_decode($row['owner_contact_json'], true)['name'] === '', 'Optional city contact acquired an invented name.');
$surveyRow = $normalize->invoke($repository, array_replace($base, ['land_area' => '3,250', 'land_area_unit' => 'sqm', 'price' => 1000000]));
$check($surveyRow['area'] === .325 && json_decode($surveyRow['parcel_json'], true)['estimatedAreaSqm'] === $savedParcel['estimatedAreaSqm'], 'Survey area did not take precedence without replacing its estimate.');
$update = $normalize->invoke($repository, ['description' => ''], $surveyRow);
$check($update['parcel_json'] === $surveyRow['parcel_json'], 'An unrelated update changed persisted parcel evidence.');
$clearPrice = $normalize->invoke($repository, ['price' => ''], $surveyRow);
$check($clearPrice['price'] === null && $clearPrice['price_per_sqm'] === null, 'Optional price cannot be cleared.');
$reject(static fn () => $normalize->invoke($repository, array_replace($base, ['price' => -1])));
$withoutBoundary = $normalize->invoke($repository, array_replace($base, ['boundary' => '']));
$check($withoutBoundary['area'] === null && $withoutBoundary['lat'] === 16.61, 'An exact location must allow an optional boundary and unknown area.');
$clearedBoundary = $normalize->invoke($repository, ['boundary' => ''], $row);
$check($clearedBoundary['area'] === null && json_decode($clearedBoundary['parcel_json'], true)['boundary'] === null, 'Clearing an estimated boundary must retain the exact location without inventing an area.');
$reject(static fn () => PropertyParcel::boundary(['type' => 'Feature', 'geometry' => 'Polygon']));
$reject(static fn () => PropertyParcel::fromPayload(['land_area' => 1, 'land_area_unit' => []]));
$broker = ['id' => 99, 'role' => 'seller', 'name' => 'Fixture Broker', 'email' => 'fixture@example.test', 'identityVerificationStatus' => 'verified'];
$filtered = sfc_listing_payload($base + ['road_frontage' => 'yes', 'assessmentCriteria' => ['risk_constraints' => 100], 'parcel_json' => '{}', 'calculated_area_sqm' => 99999], $broker, true);
$check(isset($filtered['boundary'], $filtered['road_frontage']) && !isset($filtered['assessmentCriteria'], $filtered['parcel_json'], $filtered['calculated_area_sqm']) && $filtered['approval_state'] === 'pending_review', 'Context fields granted scoring or listing approval authority.');
$context = PropertyParcel::context(require dirname(__DIR__) . '/app/assessment-sources.php');
$check($context['flood']['status'] === 'Not assessed' && $context['faults']['status'] === 'Not assessed' && $context['flood']['geojson']['features'] === [], 'Missing source data was treated as a hazard clearance.');

// Source verification uses uniquely named temporary files, never application evidence.
$fixtureDirectory = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'locus-parcel-' . bin2hex(random_bytes(8));
mkdir($fixtureDirectory);
try {
    $road = ['type' => 'Feature', 'properties' => ['name' => 'Synthetic road'], 'geometry' => ['type' => 'LineString', 'coordinates' => [[120.32, 16.61], [120.321, 16.611]]]];
    $json = json_encode(['type' => 'FeatureCollection', 'features' => [$road]], JSON_THROW_ON_ERROR);
    file_put_contents($fixtureDirectory . DIRECTORY_SEPARATOR . 'source.geojson', $json);
    $manifest = ['file' => 'source.geojson', 'verified' => true, 'source' => 'Synthetic test source', 'version' => 'test-v1', 'reference' => 'Synthetic fixture', 'verified_by' => 'Test', 'verified_at' => '2026-10-07', 'sha256' => hash('sha256', $json), 'crs' => 'EPSG:4326', 'complete' => true, 'coverage' => $rectangle['geometry']];
    $config = ['data_directory' => $fixtureDirectory, 'layers' => ['roads' => $manifest, 'faults' => $manifest]];
    $verified = PropertyParcel::context($config);
    $check($verified['roads']['status'] === 'Available' && count($verified['roads']['geojson']['features']) === 1 && $verified['roads']['source'] === 'Synthetic test source', 'Verified road source and provenance were not exposed.');
    $check($verified['faults']['status'] === 'Not assessed' && $verified['faults']['bufferMeters'] === null, 'A fault review threshold was invented.');
    $config['parcel_context']['fault_buffer'] = ['meters' => 25, 'approved' => true, 'approval_reference' => 'Synthetic office threshold'];
    $check(PropertyParcel::context($config)['faults']['bufferMeters'] === 25.0, 'An explicit approved fault threshold was not retained.');
    $config['layers']['roads']['file'] = '../source.geojson';
    $check(PropertyParcel::context($config)['roads']['status'] === 'Not assessed', 'Source path traversal was permitted.');
    $config['layers']['roads'] = $manifest;
    file_put_contents($fixtureDirectory . DIRECTORY_SEPARATOR . 'source.geojson', $json . ' ');
    $check(PropertyParcel::context($config)['roads']['status'] === 'Not assessed', 'A changed source fingerprint was accepted.');
} finally {
    unlink($fixtureDirectory . DIRECTORY_SEPARATOR . 'source.geojson');
    rmdir($fixtureDirectory);
}

if (in_array('--integration', $argv, true)) {
    $config = require dirname(__DIR__) . '/app/config.php'; $db = $config['db'];
    if (($config['app']['environment'] ?? '') !== 'local' || !in_array($db['host'], ['127.0.0.1', 'localhost', '::1'], true)) { throw new RuntimeException('Use isolated local MySQL only.'); }
    $dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $db['host'], $db['port']);
    $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false];
    $server = new PDO($dsn, $db['user'], $db['pass'], $options);
    $testName = 'locus_parcel_test_' . bin2hex(random_bytes(8)); $created = false;
    try {
        $server->exec('CREATE DATABASE `' . $testName . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'); $created = true;
        $pdo = new PDO($dsn . ';dbname=' . $testName, $db['user'], $db['pass'], $options);
        SchemaManager::ensure($pdo);
        $repository = new PropertyRepository($pdo);
        $property = $repository->create($base + ['reference_lat' => 16.6105, 'reference_lng' => 120.3205, 'reference_label' => 'Gate', 'road_frontage' => 'yes']);
        $check($property['parcel']['boundary']['geometry'] === $savedParcel['boundary']['geometry'] && $property['price'] === null && $property['description'] === '', 'Actual MySQL create lost parcel geometry or optional fields.');
        $check($property['parcel']['referencePoint']['label'] === 'Gate' && $property['parcel']['observations']['road_frontage'] === 'yes', 'Actual MySQL create lost reference point or observations.');
        $changed = $repository->update($property['id'], ['land_area' => 3250, 'land_area_unit' => 'sqm']);
        $check($changed['area'] === .325 && (float) $changed['parcel']['surveyAreaSqm'] === 3250.0 && $changed['parcel']['estimatedAreaSqm'] === $property['parcel']['estimatedAreaSqm'], 'Actual MySQL update merged survey area with estimate.');
        $unchanged = $repository->update($property['id'], ['description' => 'Optional later detail']);
        $check($unchanged['parcel'] === $changed['parcel'], 'Actual MySQL unrelated update erased parcel context.');
        $staff = ['role' => 'admin', 'department' => 'CICTO'];
        $pdo->exec("INSERT INTO users (role, name, email, password_hash) VALUES ('seller', 'Parcel broker fixture', 'parcel-broker@example.test', 'unusable-fixture-password')");
        $broker = ['id' => (int) $pdo->lastInsertId(), 'role' => 'seller', 'identityVerificationStatus' => 'verified'];
        $attachment = ['id' => str_repeat('a', 32), 'label' => 'Private site visit.pdf', 'mime' => 'application/pdf', 'size' => 120, 'uploadedAt' => '2026-10-07T12:00:00+00:00'];
        $withEvidence = $repository->create($base + ['evidence_attachments' => [$attachment], 'seller_user_id' => $broker['id']], $staff);
        $check($withEvidence['parcel']['attachments'] === [$attachment], 'Staff create response lost private evidence metadata.');
        $brokerUpdate = $repository->update($withEvidence['id'], ['description' => 'Broker change'], ['role' => 'seller']);
        $check(!isset($brokerUpdate['parcel']['attachments']), 'Broker mutation response exposed private evidence metadata.');
        $staffRead = $repository->find($withEvidence['id'], $staff);
        $check($staffRead['parcel']['attachments'] === [$attachment], 'Broker mutation erased persisted private evidence.');
        $archived = $repository->archive($withEvidence['id'], $broker);
        $check(!isset($archived['parcel']['attachments']), 'Broker archive response exposed private evidence metadata.');
        $staffUpdate = $repository->update($withEvidence['id'], ['description' => 'Staff change'], $staff);
        $check($staffUpdate['parcel']['attachments'] === [$attachment], 'Staff mutation response lost private evidence metadata.');
        $pdo->exec('ALTER TABLE properties DROP COLUMN parcel_json');
        SchemaManager::ensure($pdo); SchemaManager::ensure($pdo);
        $check($pdo->query('SELECT parcel_json FROM properties WHERE id=' . (int) $property['id'])->fetchColumn() === null, 'Repeated nullable migration did not preserve historical rows.');
    } finally {
        if ($created) {
            if (!preg_match('/^locus_parcel_test_[a-f0-9]{16}$/D', $testName) || $testName === $db['name']) { throw new RuntimeException('Unexpected cleanup target.'); }
            $server->exec('DROP DATABASE `' . $testName . '`');
        }
    }
}
echo "Parcel wizard checks passed: $checks\n";
