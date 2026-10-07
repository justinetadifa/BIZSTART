<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Support/JsonData.php';
require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';
require_once dirname(__DIR__) . '/app/Repositories/AuditLogRepository.php';
require_once dirname(__DIR__) . '/app/Core/SchemaManager.php';

use App\Core\SchemaManager;
use App\Repositories\AuditLogRepository;
use App\Repositories\PropertyRepository;
use App\Support\AutomaticPropertyAssessment;
use App\Support\PropertyAssessment;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};

// The default checks need no database and cannot change catalogue data.
$repository = new PropertyRepository(new class extends PDO { public function __construct() {} });
$normalize = new ReflectionMethod($repository, 'normalizePropertyPayload');
$normalize->setAccessible(true);
$base = [
    'name' => 'Synthetic precision fixture', 'property_type' => 'commercial', 'category' => 'Land',
    'description' => 'Synthetic persistence test only.', 'price' => 1000000, 'land_area' => 2500,
    'land_area_unit' => 'sqm', 'lat' => 16.61000049, 'lng' => 120.32000049,
    'approval_state' => 'pending_review', 'contactMode' => 'open_listing',
];
$row = $normalize->invoke($repository, $base);
$metadata = json_decode($row['automatic_assessment_json'], true, 512, JSON_THROW_ON_ERROR);
$check($row['lat'] === 16.61 && $row['lng'] === 120.32, 'Repository coordinates must match six-decimal storage.');
$check($metadata['inputs']['lat'] === $row['lat'] && $metadata['inputs']['lng'] === $row['lng'], 'Assessment must describe the persisted point.');
$preview = AutomaticPropertyAssessment::configured()->evaluate($base);
$check($preview['inputs'] === $metadata['inputs'] && $preview['assessmentCriteria'] === $metadata['assessmentCriteria'], 'Preview and persisted assessment must use identical normalized inputs.');
$smallArea = $normalize->invoke($repository, array_replace($base, ['land_area' => .6]));
$check($smallArea['area'] === .0001 && $smallArea['price_per_sqm'] === 1000000, 'Price per square metre must use the actual rounded hectare value.');
$legacy = $row;
$legacy['assessment_json'] = json_encode(array_fill_keys(array_keys(PropertyAssessment::WEIGHTS), 80), JSON_THROW_ON_ERROR);
$legacy['automatic_assessment_json'] = null;
$legacy['legacy_assessment_json'] = null;
$unitOnly = $normalize->invoke($repository, ['land_area' => null, 'land_area_unit' => 'sqm'], $legacy);
$check($unitOnly['area'] === .25 && $unitOnly['automatic_assessment_json'] === null, 'Null area must not reinterpret existing hectares using a posted unit.');
$samePoint = $normalize->invoke($repository, ['lat' => 16.61000049, 'lng' => 120.32000049], $legacy);
$check($samePoint['automatic_assessment_json'] === null && $samePoint['legacy_assessment_json'] === null, 'Changes below storage precision must not convert a historical manual assessment.');
$automatic = $normalize->invoke($repository, ['recalculate_assessment' => true], $legacy);
$snapshot = $automatic['automatic_assessment_json'];
$unchanged = $normalize->invoke($repository, ['description' => 'Updated description', 'automatic_assessment_json' => '{}', 'assessmentCriteria' => []], $automatic);
$check($unchanged['automatic_assessment_json'] === $snapshot && $unchanged['legacy_assessment_json'] === $automatic['legacy_assessment_json'], 'Nonspatial edits and forged metadata must preserve recorded evidence and history.');

if (in_array('--integration', $argv, true)) {
    // Connect without bootstrap, auto-migration, auto-creation of the app DB or seeding.
    // Every SQL mutation is directed at a newly created, uniquely named test database.
    $config = require dirname(__DIR__) . '/app/config.php';
    $db = $config['db'];
    if (($config['app']['environment'] ?? '') !== 'local' || !in_array((string) ($db['host'] ?? ''), ['127.0.0.1', 'localhost', '::1'], true)) {
        throw new RuntimeException('Isolated persistence integration requires a local MySQL server.');
    }
    $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false];
    $dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $db['host'], (int) ($db['port'] ?? 3306));
    $server = new PDO($dsn, (string) $db['user'], (string) $db['pass'], $options);
    $testName = 'locus_assessment_test_' . bin2hex(random_bytes(8));
    $createdDatabase = false;
    try {
        $server->exec('CREATE DATABASE `' . $testName . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $createdDatabase = true;
        $pdo = new PDO($dsn . ';dbname=' . $testName, (string) $db['user'], (string) $db['pass'], $options);
        $pdo->exec("SET time_zone = '+00:00'");
        SchemaManager::ensure($pdo);
        $pdo->exec("INSERT INTO users (role, name, department, email, password_hash) VALUES ('admin', 'Synthetic city tester', 'CICTO', 'synthetic@example.test', 'unusable-fixture-password')");
        $actor = ['id' => (int) $pdo->lastInsertId(), 'role' => 'admin', 'department' => 'CICTO', 'name' => 'Synthetic city tester'];
        $repository = new PropertyRepository($pdo, new AuditLogRepository($pdo));
        $property = $repository->create($base + ['assessmentCriteria' => array_fill_keys(array_keys(PropertyAssessment::WEIGHTS), 100)], $actor);
        $id = $property['id'];
        $check($property['assessmentMode'] === 'automatic' && $property['automaticAssessment']['inputs']['lat'] === $property['lat'] && $property['automaticAssessment']['inputs']['landArea'] === $property['area'], 'Actual MySQL create must retain the generated spatial snapshot.');
        $statement = $pdo->prepare('SELECT automatic_assessment_json FROM properties WHERE id = :id');
        $statement->execute(['id' => $id]);
        $savedJson = (string) $statement->fetchColumn();
        $updated = $repository->update($id, ['description' => 'Changed synthetic description'], $actor);
        $statement->execute(['id' => $id]);
        $check($statement->fetchColumn() === $savedJson && $updated['automaticAssessment'] === $property['automaticAssessment'], 'Actual nonspatial update must preserve automatic evidence byte for byte.');
        $audit = json_decode((string) $pdo->query('SELECT metadata FROM audit_logs ORDER BY id DESC LIMIT 1')->fetchColumn(), true, 512, JSON_THROW_ON_ERROR);
        $check($audit['after']['automaticAssessment'] === $property['automaticAssessment'], 'The audit log must contain the same authoritative snapshot.');

        $legacyJson = $legacy['assessment_json'];
        $statement = $pdo->prepare('UPDATE properties SET assessment_json = :criteria, automatic_assessment_json = NULL, legacy_assessment_json = NULL WHERE id = :id');
        $statement->execute(['criteria' => $legacyJson, 'id' => $id]);
        // Simulate a deployment from the schema before the two new nullable columns.
        $pdo->exec('ALTER TABLE properties DROP COLUMN automatic_assessment_json, DROP COLUMN legacy_assessment_json');
        SchemaManager::ensure($pdo);
        SchemaManager::ensure($pdo);
        $statement = $pdo->prepare('SELECT assessment_json, automatic_assessment_json, legacy_assessment_json FROM properties WHERE id = :id');
        $statement->execute(['id' => $id]);
        $migrated = $statement->fetch();
        $check($migrated['assessment_json'] === $legacyJson && $migrated['automatic_assessment_json'] === null && $migrated['legacy_assessment_json'] === null, 'Repeated schema migration must preserve manual criteria without bulk conversion.');
        $historical = $repository->find($id, $actor);
        $check($historical['assessmentMode'] === 'legacy_manual' && $historical['mceScore'] === 80.0, 'Migrated historical score must remain labeled and readable.');
        $approved = $repository->update($id, ['approval_state' => 'approved', 'reviewNote' => 'Synthetic review only', 'assessmentCriteria' => []], $actor);
        $check($approved['assessmentMode'] === 'legacy_manual' && $approved['mceScore'] === 80.0 && $approved['automaticAssessment'] === null, 'Approval-only write must preserve the historical manual score.');
        $recalculated = $repository->update($id, ['recalculate_assessment' => true], $actor);
        $check($recalculated['assessmentMode'] === 'automatic' && (float) $recalculated['legacyAssessment']['assessmentCriteria']['economic_viability'] === 80.0, 'Explicit recalculation must archive the original manual score.');
        $changed = $repository->update($id, ['lat' => 16.62, 'nearbyProperties' => [['name' => 'Synthetic nearby context', 'distanceKm' => .5]]], $actor);
        $check($changed['automaticAssessment']['inputs']['lat'] === 16.62 && $changed['legacyAssessment'] === $recalculated['legacyAssessment'] && $changed['nearbyProperties'][0]['name'] === 'Synthetic nearby context', 'Spatial recalculation must retain immutable manual history and nearby context.');
        $beforeFailure = $pdo->query('SELECT COUNT(*) FROM properties')->fetchColumn();
        $rejected = false;
        try { $repository->create(array_replace($base, ['lat' => 91]), $actor); }
        catch (InvalidArgumentException) { $rejected = true; }
        $check($rejected && $pdo->query('SELECT COUNT(*) FROM properties')->fetchColumn() === $beforeFailure, 'Invalid assessment input must be rejected without leaving a partial listing.');
    } finally {
        if ($createdDatabase) {
            // The identifier is generated above; never derive a cleanup target from configuration.
            if (!preg_match('/^locus_assessment_test_[a-f0-9]{16}$/D', $testName) || $testName === ($db['name'] ?? '')) {
                throw new RuntimeException('Refusing to clean up an unexpected database name.');
            }
            $pdo = null;
            $server->exec('DROP DATABASE `' . $testName . '`');
        }
    }
}

echo "Assessment persistence checks passed: $checks (" . (in_array('--integration', $argv, true) ? 'isolated temporary MySQL database removed' : 'no database writes') . ").\n";
