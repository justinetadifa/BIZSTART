<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if (!in_array('--integration', $argv, true)) {
    echo "Run with --integration to check visit recipients using disposable local fixtures.\n";
    exit;
}
require_once dirname(__DIR__) . '/app/Support/auth.php';
$container = require dirname(__DIR__) . '/app/bootstrap.php';
if (($container['config']['app']['environment'] ?? '') !== 'local') { throw new RuntimeException('Use a local database only.'); }
$pdo = $container['pdo'];
$users = [];
$properties = [];
$suffix = bin2hex(random_bytes(8));
$checks = 0;

function visit_check(bool $condition, string $message): void
{
    global $checks;
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
}
function visit_rejects(callable $action, string $message): void
{
    try { $action(); } catch (InvalidArgumentException) { visit_check(true, $message); return; }
    throw new RuntimeException($message);
}
function visit_user(string $role, string $label, ?string $department = null): array
{
    global $container, $users, $suffix;
    $user = $container['users']->create($role, 'Visit fixture ' . $label, 'visit-' . $suffix . '-' . count($users) . '@example.test', bin2hex(random_bytes(16)), $department);
    $users[] = $user['id'];
    return $user;
}
function visit_property(array $actor, array $extra = []): array
{
    global $container, $properties, $pdo, $suffix;
    $property = $container['properties']->create($extra + [
        'name' => 'Visit fixture ' . $suffix . '-' . count($properties), 'property_type' => 'commercial', 'category' => 'Land', 'subcategory' => 'Commercial',
        'description' => 'Disposable visit recipient verification.', 'area' => .1, 'price' => 1000000, 'lat' => 16.6159, 'lng' => 120.3188, 'approval_state' => 'pending_review',
    ], $actor);
    $properties[] = $property['id'];
    // Fixture approval does not change any existing listing.
    $pdo->prepare("UPDATE properties SET approval_state = 'approved' WHERE id = ?")->execute([$property['id']]);
    return $property;
}

try {
    $cicto = visit_user('admin', 'CICTO', 'CICTO');
    $unknown = visit_user('admin', 'Unknown', 'Unknown');
    $owner = visit_user('seller', 'Owner A');
    $contact = visit_user('seller', 'Contact B');
    $replacement = visit_user('seller', 'Contact C');
    $investor = visit_user('investor', 'Investor');
    $secondInvestor = visit_user('investor', 'Second investor');
    $thirdInvestor = visit_user('investor', 'Third investor');
    foreach ([$owner, $contact, $replacement] as $broker) {
        $container['sellerProfiles']->createOrUpdateForUser($broker['id'], [
            'seller_type' => 'broker', 'legal_name' => $broker['name'], 'phone' => '09' . str_pad((string) $broker['id'], 9, '0', STR_PAD_LEFT),
            'address_line' => 'San Fernando', 'city' => 'San Fernando', 'authorization_basis' => 'Licensed real estate broker',
            'prc_registration_no' => (string) random_int(10000000, 99999999), 'prc_valid_until' => '2099-12-31',
        ], true);
        $container['sellerProfiles']->review($broker['id'], 'verified', $cicto['id'], 'Disposable test verification');
        $container['users']->updateIdentityVerificationStatus($broker['id'], 'verified');
    }
    $payload = [
        'investmentPurpose' => 'Retail', 'primaryStartAt' => '2030-01-01T09:00', 'primaryEndAt' => '2030-01-01T10:00',
        'secondaryStartAt' => '2030-01-02T09:00', 'secondaryEndAt' => '2030-01-02T10:00',
    ];

    $city = visit_property($cicto, ['contactMode' => 'broker', 'contactBrokerUserId' => $contact['id']]);
    $visit = $container['visits']->propose($city['id'], $investor, $payload);
    $conversation = $container['messages']->thread($visit['threadId'], $investor);
    visit_check($visit['sellerUserId'] === $contact['id'] && $conversation['thread']['sellerUserId'] === $contact['id'], 'City-owned listing did not route thread and visit to broker B.');
    visit_check($container['visits']->findByThread($visit['threadId'], $contact)['id'] === $visit['id'], 'Assigned broker cannot retrieve the site visit.');
    visit_check($container['visits']->findById($visit['id'], $owner) === null, 'Unrelated owner can read assigned broker site visit.');
    visit_check($container['visits']->findById($visit['id'], $secondInvestor) === null, 'Another investor can read the visit.');
    visit_rejects(fn () => $container['visits']->applyAction($visit['id'], $owner, ['action' => 'confirm']), 'Unrelated owner can confirm another broker visit.');
    $confirmed = $container['visits']->applyAction($visit['id'], $contact, ['action' => 'confirm', 'selection' => 'primary']);
    visit_check($confirmed['status'] === 'confirmed', 'Assigned contact broker cannot confirm a city-owned visit.');
    visit_check($container['visits']->findById($visit['id'], $unknown) === null, 'Unknown department can view visit logistics.');
    visit_rejects(fn () => $container['visits']->applyAction($visit['id'], $unknown, ['action' => 'markvisited']), 'Unknown department can act on site visits.');

    $owned = visit_property($cicto, ['seller_user_id' => $owner['id'], 'contactMode' => 'broker', 'contactBrokerUserId' => $contact['id']]);
    $inquiry = $container['messages']->sendToProperty($owned['id'], $investor, 'A private inquiry to broker B.');
    $container['properties']->update($owned['id'], ['contactBrokerUserId' => $replacement['id']], $cicto);
    $pinned = $container['visits']->propose($owned['id'], $investor, $payload);
    visit_check($pinned['threadId'] === $inquiry['thread']['id'] && $pinned['sellerUserId'] === $contact['id'], 'Visit proposal transferred a pinned inquiry to owner A or replacement C.');
    visit_check($container['visits']->findByThread($pinned['threadId'], $contact)['id'] === $pinned['id'], 'Pinned broker B cannot read their visit after reassignment.');
    visit_check($container['visits']->findById($pinned['id'], $replacement) === null, 'Replacement broker can read a pinned visit.');
    visit_rejects(fn () => $container['messages']->thread($pinned['threadId'], $owner), 'Owner A can read broker B visit thread.');
    $newVisit = $container['visits']->propose($owned['id'], $secondInvestor, $payload);
    visit_check($newVisit['sellerUserId'] === $replacement['id'], 'A new investor visit did not reach replacement broker C.');
    visit_rejects(fn () => $container['visits']->propose($owned['id'], $investor, $payload), 'Duplicate logistics record was accepted.');

    $container['sellerProfiles']->review($replacement['id'], 'suspended', $cicto['id'], 'Disposable test suspension');
    visit_rejects(fn () => $container['visits']->propose($owned['id'], $thirdInvestor, $payload), 'A new visit reached a suspended assigned contact.');
    $empty = $pdo->prepare('SELECT COUNT(*) FROM message_threads WHERE property_id = ? AND investor_user_id = ?');
    $empty->execute([$owned['id'], $thirdInvestor['id']]);
    visit_check((int) $empty->fetchColumn() === 0, 'An invalid contact left an orphaned logistics thread.');

    $directOwned = visit_property($cicto, ['seller_user_id' => $owner['id'], 'contactMode' => 'broker', 'contactBrokerUserId' => $contact['id']]);
    $direct = $container['visits']->propose($directOwned['id'], $investor, $payload);
    visit_check($direct['sellerUserId'] === $contact['id'], 'A direct proposal used submitting owner A instead of assigned broker B.');
    $openOwned = visit_property($cicto, ['seller_user_id' => $owner['id'], 'contactMode' => 'open_listing']);
    $ownerVisit = $container['visits']->propose($openOwned['id'], $investor, $payload);
    visit_check($ownerVisit['sellerUserId'] === $owner['id'], 'Broker-owned open listing no longer routes to its submitting broker.');
    $cityOpen = visit_property($cicto, ['contactMode' => 'open_listing']);
    visit_rejects(fn () => $container['visits']->propose($cityOpen['id'], $investor, $payload), 'City open listing created a visit with no coordinator.');
    $pdo->prepare("UPDATE properties SET approval_state = 'pending_review' WHERE id = ?")->execute([$directOwned['id']]);
    visit_rejects(fn () => $container['visits']->propose($directOwned['id'], $secondInvestor, $payload), 'An unapproved property accepted a visit proposal.');
    $invalidWindow = visit_property($cicto, ['contactMode' => 'broker', 'contactBrokerUserId' => $contact['id']]);
    visit_rejects(fn () => $container['visits']->propose($invalidWindow['id'], $investor, array_replace($payload, ['primaryEndAt' => ''])), 'A visit with incomplete windows was accepted.');
    $empty->execute([$invalidWindow['id'], $investor['id']]);
    visit_check((int) $empty->fetchColumn() === 0, 'Invalid visit windows left an orphaned thread.');
} finally {
    $pdo->beginTransaction();
    try {
        if ($users !== []) {
            $marks = implode(',', array_fill(0, count($users), '?'));
            $pdo->prepare('DELETE FROM notifications WHERE user_id IN (' . $marks . ') OR actor_user_id IN (' . $marks . ')')->execute(array_merge($users, $users));
            $pdo->prepare('DELETE FROM audit_logs WHERE actor_id IN (' . $marks . ')')->execute($users);
        }
        if ($properties !== []) {
            $pdo->prepare('DELETE FROM properties WHERE id IN (' . implode(',', array_fill(0, count($properties), '?')) . ')')->execute($properties);
        }
        if ($users !== []) {
            $pdo->prepare('DELETE FROM users WHERE id IN (' . implode(',', array_fill(0, count($users), '?')) . ')')->execute($users);
        }
        $pdo->commit();
    } catch (Throwable $exception) { $pdo->rollBack(); throw $exception; }
}
echo "Visit workflow passed ($checks checks; exact disposable fixtures removed).\n";
