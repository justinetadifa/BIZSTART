<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
if (!in_array('--integration', $argv, true)) {
    echo "Run with --integration to verify inquiry routing using disposable local fixtures.\n";
    exit;
}

require_once dirname(__DIR__) . '/app/Support/auth.php';
$container = require dirname(__DIR__) . '/app/bootstrap.php';
$pdo = $container['pdo'];
$users = [];
$propertyIds = [];
$checks = 0;
$suffix = bin2hex(random_bytes(6));

function inquiry_check(bool $condition, string $message): void
{
    global $checks;
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $checks++;
}

function inquiry_rejects(callable $action, string $message): void
{
    try {
        $action();
    } catch (InvalidArgumentException) {
        inquiry_check(true, $message);
        return;
    }
    throw new RuntimeException($message);
}

function inquiry_user(string $role, string $name): array
{
    global $container, $users, $suffix;
    $user = $container['users']->create($role, $name, "inquiry-$suffix-" . count($users) . '@example.test', bin2hex(random_bytes(16)), $role === 'admin' ? 'CICTO' : null);
    $users[] = $user['id'];
    return $user;
}

function inquiry_property(array $actor, array $extra = []): array
{
    global $container, $propertyIds, $suffix;
    $property = $container['properties']->create($extra + [
        'name' => 'Inquiry fixture ' . $suffix . ' ' . count($propertyIds),
        'property_type' => 'commercial', 'category' => 'Land', 'subcategory' => 'Commercial',
        'description' => 'Disposable inquiry routing verification.', 'area' => .1, 'price' => 1000000,
        'lat' => 16.6159, 'lng' => 120.3188, 'approval_state' => 'pending_review',
    ], $actor);
    $propertyIds[] = $property['id'];
    return $property;
}

try {
    $reviewer = inquiry_user('admin', 'Inquiry fixture CICTO');
    $owner = inquiry_user('seller', 'Inquiry fixture owner');
    $contact = inquiry_user('seller', 'Inquiry fixture contact');
    $replacement = inquiry_user('seller', 'Inquiry fixture replacement');
    $investor = inquiry_user('investor', 'Inquiry fixture investor');
    $secondInvestor = inquiry_user('investor', 'Inquiry fixture second investor');
    $thirdInvestor = inquiry_user('investor', 'Inquiry fixture third investor');
    foreach ([$owner, $contact, $replacement] as $broker) {
        $container['sellerProfiles']->createOrUpdateForUser($broker['id'], [
            'seller_type' => 'broker', 'legal_name' => $broker['name'], 'phone' => '09' . str_pad((string) $broker['id'], 9, '0', STR_PAD_LEFT),
            'address_line' => 'San Fernando, La Union', 'city' => 'San Fernando',
            'authorization_basis' => 'Licensed real estate broker',
            'prc_registration_no' => (string) random_int(10000000, 99999999),
            'prc_valid_until' => '2099-12-31',
        ], true);
        $container['sellerProfiles']->review($broker['id'], 'verified', $reviewer['id'], 'Disposable test verification');
        $container['users']->updateIdentityVerificationStatus($broker['id'], 'verified');
    }

    $cityListing = inquiry_property($reviewer, ['contactMode' => 'broker', 'contactBrokerUserId' => $contact['id']]);
    $first = $container['messages']->sendToProperty($cityListing['id'], $investor, 'City listing inquiry');
    $threadId = $first['thread']['id'];
    inquiry_check($first['thread']['sellerUserId'] === $contact['id'] && $first['message']['recipientUserId'] === $contact['id'], 'A city listing inquiry did not reach its contact broker.');
    inquiry_check(count($container['messages']->propertyConversation($cityListing['id'], $contact)['messages']) === 1, 'The assigned broker cannot read the city listing inquiry.');
    inquiry_check(in_array($threadId, array_column($container['messages']->inbox($contact), 'id'), true), 'The assigned broker inquiry is missing from their inbox.');
    inquiry_check($container['messages']->propertyConversation($cityListing['id'], $owner)['messages'] === [], 'An unrelated broker can read private inquiries.');
    inquiry_rejects(fn () => $container['messages']->thread($threadId, $owner), 'An unrelated broker can access a private thread.');
    $reply = $container['messages']->replyToThread($threadId, $contact, 'Contact broker reply');
    inquiry_check($reply['message']['recipientUserId'] === $investor['id'], 'Contact broker reply did not reach the investor.');

    $container['properties']->update($cityListing['id'], ['contactBrokerUserId' => $replacement['id']], $reviewer);
    $continued = $container['messages']->sendToProperty($cityListing['id'], $investor, 'Continue the original inquiry');
    inquiry_check($continued['thread']['id'] === $threadId && $continued['message']['recipientUserId'] === $contact['id'], 'A reassignment transferred an existing private inquiry.');
    inquiry_check($container['messages']->propertyConversation($cityListing['id'], $replacement)['messages'] === [], 'A newly assigned broker received old private messages.');
    inquiry_rejects(fn () => $container['messages']->thread($threadId, $replacement), 'A newly assigned broker can access the previous broker thread.');
    $newInquiry = $container['messages']->sendToProperty($cityListing['id'], $secondInvestor, 'New inquiry after reassignment');
    inquiry_check($newInquiry['thread']['sellerUserId'] === $replacement['id'], 'A new inquiry did not reach the newly assigned broker.');
    inquiry_check(count($container['messages']->propertyConversation($cityListing['id'], $contact)['threads']) === 1 && count($container['messages']->propertyConversation($cityListing['id'], $replacement)['threads']) === 1, 'Brokers can see threads assigned to another broker.');

    $container['sellerProfiles']->review($replacement['id'], 'suspended', $reviewer['id'], 'Disposable test suspension');
    inquiry_rejects(fn () => $container['messages']->sendToProperty($cityListing['id'], $thirdInvestor, 'A new inquiry to a suspended broker'), 'A new inquiry can reach a suspended contact broker.');

    $ownedOpen = inquiry_property($reviewer, ['seller_user_id' => $owner['id'], 'contactMode' => 'open_listing']);
    $ownerInquiry = $container['messages']->sendToProperty($ownedOpen['id'], $investor, 'Broker-owned open listing inquiry');
    inquiry_check($ownerInquiry['message']['recipientUserId'] === $owner['id'], 'A broker-owned open listing no longer routes to its submitting broker.');

    $ownedAssigned = inquiry_property($reviewer, ['seller_user_id' => $owner['id'], 'contactMode' => 'broker', 'contactBrokerUserId' => $contact['id']]);
    $assignedInquiry = $container['messages']->sendToProperty($ownedAssigned['id'], $investor, 'Contact broker selected by the city');
    inquiry_check($assignedInquiry['message']['recipientUserId'] === $contact['id'], 'The selected contact broker did not override the submitting broker for a new inquiry.');
    inquiry_check($container['messages']->propertyConversation($ownedAssigned['id'], $owner)['messages'] === [], 'The submitting broker can read inquiries sent to another contact broker.');

    $cityOpen = inquiry_property($reviewer, ['contactMode' => 'open_listing']);
    inquiry_rejects(fn () => $container['messages']->sendToProperty($cityOpen['id'], $investor, 'No broker contact assigned'), 'A city open listing created an inquiry without a recipient.');
} finally {
    // These IDs are created exclusively by this run; existing records are untouched.
    $pdo->beginTransaction();
    try {
        if ($users !== []) {
            $statement = $pdo->prepare('DELETE FROM audit_logs WHERE actor_id IN (' . implode(',', array_fill(0, count($users), '?')) . ')');
            $statement->execute($users);
        }
        if ($propertyIds !== []) {
            $statement = $pdo->prepare('DELETE FROM properties WHERE id IN (' . implode(',', array_fill(0, count($propertyIds), '?')) . ')');
            $statement->execute($propertyIds);
        }
        if ($users !== []) {
            $statement = $pdo->prepare('DELETE FROM users WHERE id IN (' . implode(',', array_fill(0, count($users), '?')) . ')');
            $statement->execute($users);
        }
        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}
echo "Inquiry workflow passed ($checks checks; all local fixtures removed).\n";
