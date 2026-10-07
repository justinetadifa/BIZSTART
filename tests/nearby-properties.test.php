<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/PropertyNearby.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/api/_listing-policy.php';

use App\Support\PropertyNearby;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void { if (!$condition) { throw new RuntimeException($message); } $checks++; };
$reject = static function (callable $operation) use ($check): void { try { $operation(); } catch (InvalidArgumentException) { $check(true, 'Rejected invalid input.'); return; } throw new RuntimeException('Invalid nearby input was accepted.'); };
$items = [['name' => 'Public market', 'type' => 'Retail', 'distanceKm' => '0.65', 'imageUrl' => 'assets/uploads/nearby/example.png']];
$normalized = PropertyNearby::normalize($items);
$check($normalized[0]['distanceKm'] === 0.65 && $normalized[0]['imageUrl'] === $items[0]['imageUrl'], 'Nearby information was lost.');
$check(PropertyNearby::normalize([]) === [] && PropertyNearby::normalize(null) === [], 'Optional nearby places became required.');
foreach ([array_fill(0, 7, $items[0]), [['name' => '']], [['name' => ['Invalid']]], [['name' => 'Place', 'distanceKm' => -1]], [['name' => 'Place', 'distanceKm' => INF]], [['name' => 'Place', 'imageUrl' => 'javascript:alert(1)']], [['name' => 'Place', 'imageUrl' => 'assets/uploads/nearby/../../file.php']], [['name' => 'Place', 'imageUrl' => 'https://name:password@example.test/a.png']], '{invalid'] as $invalid) {
    $reject(static fn () => PropertyNearby::normalize($invalid));
}
$broker = ['id' => 99, 'role' => 'seller', 'name' => 'Fixture Broker', 'email' => 'fixture@example.test', 'identityVerificationStatus' => 'verified'];
$filtered = sfc_listing_payload(['nearbyProperties' => $items, 'assessmentCriteria' => ['nearby_businesses' => 100], 'approval_state' => 'approved'], $broker, true);
$check($filtered['nearbyProperties'] === $items && $filtered['assessmentCriteria'] === [] && $filtered['approval_state'] === 'pending_review', 'Nearby evidence granted assessment or review authority.');

if (in_array('--integration', $argv, true)) {
    $container = require dirname(__DIR__) . '/app/bootstrap.php';
    if (($container['config']['app']['environment'] ?? '') !== 'local') { throw new RuntimeException('Use the local database only.'); }
    $pdo = $container['pdo'];
    $actor = $pdo->query("SELECT id, name, department FROM users WHERE role = 'admin' AND department = 'CICTO' ORDER BY id LIMIT 1")->fetch();
    if (!$actor) { throw new RuntimeException('A local CICTO fixture is required.'); }
    $actor['role'] = 'admin';
    $id = null;
    try {
        $created = $container['properties']->create(['name' => 'Nearby fixture ' . bin2hex(random_bytes(6)), 'property_type' => 'commercial', 'category' => 'Land', 'description' => 'Temporary nearby property persistence verification.', 'barangay' => 'Biday', 'price' => 1000000, 'land_area' => 1000, 'land_area_unit' => 'sqm', 'lat' => 16.61, 'lng' => 120.32, 'approval_state' => 'pending_review', 'nearbyProperties' => $items], $actor);
        $id = $created['id'];
        $check($created['nearbyProperties'] === $normalized && $created['mceScore'] === null && $created['iaiScore'] === null, 'Evidence failed to persist or fabricated an assessment.');
        $updated = $container['properties']->update($id, ['description' => 'Updated fixture description.'], $actor);
        $check($updated['nearbyProperties'] === $normalized, 'Unrelated edits erased nearby places.');
        $cleared = $container['properties']->update($id, ['nearbyProperties' => []], $actor);
        $check($cleared['nearbyProperties'] === [], 'Removing nearby places did not persist.');
    } finally {
        if ($id !== null) {
            $statement = $pdo->prepare("DELETE FROM audit_logs WHERE entity_type = 'PROPERTY' AND entity_id = :id");
            $statement->execute(['id' => $id]);
            $statement = $pdo->prepare("DELETE FROM properties WHERE id = :id AND approval_state = 'pending_review'");
            $statement->execute(['id' => $id]);
        }
    }
}
echo "Nearby property checks passed: $checks\n";
