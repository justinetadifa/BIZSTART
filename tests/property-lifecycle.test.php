<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';
require_once dirname(__DIR__) . '/app/Repositories/AuditLogRepository.php';
require_once dirname(__DIR__) . '/app/Support/JsonData.php';
require_once dirname(__DIR__) . '/app/Core/SchemaManager.php';
require_once dirname(__DIR__) . '/api/_listing-policy.php';

use App\Core\SchemaManager;
use App\Repositories\AuditLogRepository;
use App\Repositories\PropertyRepository;
use App\Support\AutomaticPropertyAssessment;
use App\Support\PropertyParcel;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$reject = static function (callable $operation, string $message) use ($check): void {
    try { $operation(); } catch (InvalidArgumentException) { $check(true, $message); return; }
    throw new RuntimeException($message);
};
$repository = new PropertyRepository(new class extends PDO { public function __construct() {} });
$normalize = new ReflectionMethod($repository, 'normalizePropertyPayload');
$normalize->setAccessible(true);
$base = ['name' => 'Optional property geometry test', 'property_type' => 'commercial', 'category' => 'Land', 'approval_state' => 'pending_review', 'price' => 1000000];
$area = $normalize->invoke($repository, $base + ['land_area' => 2500, 'land_area_unit' => 'sqm']);
$check($area['area'] === .25 && $area['lat'] === null && $area['lng'] === null, 'Area-only properties must keep unknown coordinates null.');
$areaAssessment = json_decode($area['automatic_assessment_json'], true);
$check($areaAssessment['mceScore'] === null && $areaAssessment['completedCount'] === 0 && str_contains($areaAssessment['criteriaDetails']['risk_constraints']['justification'], 'exact location'), 'Area-only properties must await location evidence without invented spatial scores.');
$check(json_decode($area['parcel_json'], true)['areaMethod'] === 'declared', 'Entered area must be identified as declared unless a survey source is selected.');
$location = $normalize->invoke($repository, $base + ['lat' => 16.61, 'lng' => 120.32]);
$check($location['area'] === null && $location['price_per_sqm'] === 0, 'Location-only properties must not invent area or price per square metre.');
$locationAssessment = json_decode($location['automatic_assessment_json'], true);
$check($locationAssessment['inputs']['landArea'] === null && ($locationAssessment['criteriaDetails']['economic_viability']['raw']['bir_total_value'] ?? null) === null, 'Location-only valuation must retain unknown area and total reference value.');
$check($normalize->invoke($repository, ['description' => 'Unrelated update'], $area)['area'] === .25, 'Partial edits must retain a declared area.');
$check($normalize->invoke($repository, ['description' => 'Unrelated update'], $location)['area'] === null, 'Partial edits must retain an unknown area.');
$survey = PropertyParcel::fromPayload(['land_area' => 1.5, 'land_area_unit' => 'ha', 'area_method' => 'survey']);
$check($survey['surveyAreaSqm'] === 15000.0 && $survey['areaMethod'] === 'survey', 'Recorded survey area must retain its selected source and unit.');
$reject(fn () => PropertyParcel::fromPayload(['area_method' => 'official_verified']), 'Area source must be validated.');
foreach ([[], ['lat' => 16.61], ['lng' => 120.32], ['land_area' => 0], ['land_area' => -1], ['land_area' => 1000, 'lat' => 'bad', 'lng' => 'bad'], ['land_area' => 1000, 'lat' => 91, 'lng' => 120.32]] as $invalid) {
    $reject(fn () => $normalize->invoke($repository, $base + $invalid), 'Missing, partial or invalid location/area must be rejected.');
}
$check(AutomaticPropertyAssessment::normalizeInputs(['lat' => 16.61, 'lng' => 120.32])['landArea'] === null, 'Assessment previews must not default unknown area to 500 m².');
$check(AutomaticPropertyAssessment::configured()->evaluate(['land_area' => 2500, 'land_area_unit' => 'sqm'])['mceScore'] === null, 'Assessment previews must accept area-only input with pending scores.');
$staff = ['id' => 1, 'role' => 'admin', 'department' => 'CICTO'];
$broker = ['id' => 3, 'role' => 'seller', 'identityVerificationStatus' => 'verified', 'name' => 'Test broker', 'email' => 'broker@example.test'];
$policy = sfc_listing_payload(['area_method' => 'declared', 'deleted_at' => '2026-10-08', 'isDeleted' => true], $broker, true);
$check($policy['area_method'] === 'declared' && !isset($policy['deleted_at'], $policy['isDeleted']), 'Broker payload must allow the area source and reject lifecycle metadata injection.');
$reject(fn () => $repository->delete(1, $broker), 'Brokers cannot use city soft deletion.');
$reject(fn () => $repository->restore(1, $broker), 'Brokers cannot restore city-deleted listings.');
$reject(fn () => $repository->setAvailability(1, 'bogus', $staff), 'Invalid availability must be rejected.');

if (in_array('--integration', $argv, true)) {
    // Use a disposable database; never seed or modify the configured catalogue.
    $config = require dirname(__DIR__) . '/app/config.php';
    $db = $config['db'];
    if (($config['app']['environment'] ?? '') !== 'local' || !in_array((string) ($db['host'] ?? ''), ['127.0.0.1', 'localhost', '::1'], true)) {
        throw new RuntimeException('Isolated lifecycle integration requires a local MySQL server.');
    }
    $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false];
    $dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $db['host'], (int) ($db['port'] ?? 3306));
    $server = new PDO($dsn, (string) $db['user'], (string) $db['pass'], $options);
    $testName = 'locus_lifecycle_test_' . bin2hex(random_bytes(8));
    $created = false;
    try {
        $server->exec('CREATE DATABASE `' . $testName . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $created = true;
        $pdo = new PDO($dsn . ';dbname=' . $testName, (string) $db['user'], (string) $db['pass'], $options);
        $pdo->exec("SET time_zone = '+00:00'");
        SchemaManager::ensure($pdo);
        // Simulate nullable columns from an older, lower-precision deployment.
        $pdo->exec('ALTER TABLE properties MODIFY lat DECIMAL(10, 2) NULL, MODIFY lng DECIMAL(10, 2) NULL, MODIFY area DECIMAL(12, 2) NOT NULL');
        SchemaManager::ensure($pdo);
        $columns = $pdo->query("SELECT COLUMN_NAME, NUMERIC_SCALE, IS_NULLABLE FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'properties' AND COLUMN_NAME IN ('lat', 'lng', 'area')")->fetchAll(PDO::FETCH_UNIQUE);
        $check((int) $columns['lat']['NUMERIC_SCALE'] === 6 && (int) $columns['lng']['NUMERIC_SCALE'] === 6 && (int) $columns['area']['NUMERIC_SCALE'] === 4 && count(array_filter($columns, static fn (array $column): bool => $column['IS_NULLABLE'] === 'YES')) === 3, 'Legacy migrations must preserve the required precision and allow unknown location or area.');
        $pdo->exec("INSERT INTO users (role, name, department, email, password_hash) VALUES ('admin', 'Synthetic city tester', 'CICTO', 'staff@example.test', 'unusable-fixture-password')");
        $staff = ['id' => (int) $pdo->lastInsertId(), 'name' => 'Synthetic city tester', 'role' => 'admin', 'department' => 'CICTO'];
        $pdo->exec("INSERT INTO users (role, name, email, password_hash) VALUES ('seller', 'Synthetic broker', 'broker@example.test', 'unusable-fixture-password')");
        $broker['id'] = (int) $pdo->lastInsertId();
        $repository = new PropertyRepository($pdo, new AuditLogRepository($pdo));
        $area = $repository->create(array_replace($base, ['name' => 'Lifecycle area fixture ' . bin2hex(random_bytes(5)), 'land_area' => 2500, 'land_area_unit' => 'sqm', 'approval_state' => 'approved']), $staff);
        $location = $repository->create(array_replace($base, ['name' => 'Lifecycle point fixture ' . bin2hex(random_bytes(5)), 'lat' => 16.61, 'lng' => 120.32, 'seller_user_id' => $broker['id']]), $broker);
        $check($repository->find($area['id'], $staff)['lat'] === null && $repository->find($location['id'], $staff)['area'] === null, 'Nullable coordinates and area must survive real MySQL storage.');
        $check($area['hasExactLocation'] === false && $location['areaKnown'] === false && $location['pricePerSqm'] === 0, 'Public property flags must accurately identify unknown size and location.');
        $mapConfidence = array_column($area['investmentReadiness']['pillars']['spatial']['indicators'], null, 'key')['map_confidence'];
        $check($mapConfidence['normalizedScore'] === null && $mapConfidence['missing'] === true, 'Unknown coordinates must remain missing in readiness indicators.');
        $check($repository->mapViewport([$area]) === null && $repository->mapViewport([$area, $location])['center']['lat'] === 16.61, 'Unknown locations must be excluded from map bounds.');
        $investor = ['id' => 999999, 'role' => 'investor'];
        $check($repository->find($area['id'], $investor)['id'] === $area['id'], 'Approved available area-only listings must remain accessible.');
        $check($repository->find($location['id'], $broker)['id'] === $location['id'] && !in_array($location['id'], array_column($repository->all($investor), 'id'), true), 'Brokers may access their pending submissions while investors cannot.');
        $otherBroker = array_replace($broker, ['id' => 999998]);
        $check(!in_array($location['id'], array_column($repository->all($otherBroker), 'id'), true), 'Brokers cannot read another broker\'s pending listing.');
        $unavailable = $repository->setAvailability($area['id'], 'Unavailable', $staff);
        $check($unavailable['status'] === 'Unavailable' && !$unavailable['lastConfirmedAvailableAt'] && $unavailable['approvalState'] === 'approved', 'Availability changes must preserve review status without falsely confirming availability.');
        try { $repository->find($area['id'], $investor); throw new RuntimeException('Unavailable listing leaked to investor.'); } catch (OutOfBoundsException) { $check(true, 'Unavailable listing is hidden from investors.'); }
        $availed = $repository->setAvailability($area['id'], 'Availed', $staff);
        $check($availed['status'] === 'Availed' && !in_array($area['id'], array_column($repository->all($investor), 'id'), true), 'Availed properties must leave the public catalogue.');
        $repository->delete($area['id'], $staff);
        $deleted = $repository->find($area['id'], $staff);
        $check($deleted['isDeleted'] === true && $deleted['deletedAt'] !== null && $deleted['status'] === 'Availed', 'Recently deleted must preserve prior availability and record a deletion time.');
        $check((int) $pdo->query('SELECT COUNT(*) FROM property_due_diligence WHERE property_id = ' . (int) $area['id'])->fetchColumn() === 1, 'Soft deletion must preserve supporting property records.');
        $repository->delete($location['id'], $staff);
        $check(!in_array($location['id'], array_column($repository->all($broker), 'id'), true), 'City-deleted listings must be hidden even from their submitting broker.');
        try { $repository->find($location['id'], $broker); throw new RuntimeException('Deleted listing leaked to its broker.'); } catch (OutOfBoundsException) { $check(true, 'Broker direct access to city-deleted listings is rejected.'); }
        $reject(fn () => $repository->update($area['id'], ['description' => 'Deleted edit'], $staff), 'Deleted properties must reject direct edits until restored.');
        $reject(fn () => $repository->delete($area['id'], $staff), 'Repeated deletion must be rejected.');
        $restored = $repository->restore($area['id'], $staff);
        $check(!$restored['isDeleted'] && $restored['deletedAt'] === null && $restored['approvalState'] === 'pending_review' && $restored['status'] === 'Availed', 'Restore must retain availability and require review before public visibility.');
        $reject(fn () => $repository->restore($area['id'], $staff), 'Repeated restore must be rejected.');
        $available = $repository->setAvailability($area['id'], 'Available', $staff);
        $check((bool) $available['lastConfirmedAvailableAt'] && $available['approvalState'] === 'pending_review', 'Making a restored property available must not bypass review.');
        $check(!in_array($area['id'], array_column($repository->all($investor), 'id'), true) && !in_array($area['id'], array_column($repository->all(null), 'id'), true), 'Restored listings awaiting review must be hidden from investors and guest previews.');
        $events = $pdo->query('SELECT metadata FROM audit_logs WHERE entity_type = \'PROPERTY\' AND entity_id = ' . (int) $area['id'])->fetchAll(PDO::FETCH_COLUMN);
        $types = array_map(static fn (string $value): string => json_decode($value, true)['eventType'] ?? '', $events);
        $check(in_array('LISTING_DELETE', $types, true) && in_array('LISTING_RESTORE', $types, true), 'Deletion and restore must retain separate audited events.');
        $lastAudit = json_decode((string) end($events), true, 512, JSON_THROW_ON_ERROR);
        $check($lastAudit['after']['lat'] === null && $lastAudit['after']['area'] === .25 && $lastAudit['after']['automaticAssessment'] === $area['automaticAssessment'], 'Lifecycle audits must preserve nullable geometry and the authoritative assessment snapshot.');
    } finally {
        if ($created) {
            if (!preg_match('/^locus_lifecycle_test_[a-f0-9]{16}$/D', $testName) || $testName === ($db['name'] ?? '')) {
                throw new RuntimeException('Refusing to clean up an unexpected database name.');
            }
            $pdo = null;
            $server->exec('DROP DATABASE `' . $testName . '`');
        }
    }
}
echo "Property lifecycle checks passed: $checks\n";
