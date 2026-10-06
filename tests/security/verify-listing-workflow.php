<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__, 2) . '/app/Support/auth.php';
require_once dirname(__DIR__, 2) . '/app/Support/PropertyCatalog.php';
require_once dirname(__DIR__, 2) . '/app/Support/PropertyAssessment.php';
require_once dirname(__DIR__, 2) . '/api/_listing-policy.php';

use App\Support\PropertyCatalog;
use App\Support\PropertyAssessment;

$checks = 0;
function listing_check(bool $condition, string $message): void
{
    global $checks;
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $checks++;
}
function listing_reject(callable $callback, string $message): void
{
    try {
        $callback();
    } catch (InvalidArgumentException $exception) {
        listing_check(true, $message);
        return;
    }
    listing_check(false, $message);
}

$cicto = ['id' => 1, 'role' => 'admin', 'department' => 'CICTO'];
$assessor = ['id' => 2, 'role' => 'admin', 'department' => 'ASSESSOR'];
$unknownDepartment = ['id' => 99, 'role' => 'admin', 'department' => 'UNKNOWN'];
$broker = ['id' => 3, 'role' => 'seller', 'name' => 'Workflow Test', 'email' => 'workflow@example.test', 'identityVerificationStatus' => 'verified'];
$existing = ['id' => 20, 'sellerUserId' => 3, 'sellerIdentityStatus' => 'verified', 'sellerBrokerVerified' => true, 'approvalState' => 'approved'];
listing_check(count(PropertyCatalog::categories()) === 13, 'All requested categories are available.');
listing_check(sfc_can_manage_properties($assessor) && !sfc_can_review_brokers($assessor) && !sfc_can_manage_properties($unknownDepartment), 'Only known departments receive data permissions; CICTO governs reviews.');
listing_reject(fn () => PropertyCatalog::normalizeCategory('Retail', 'Warehouse', 'commercial'), 'Subcategory cannot belong to another category.');
$criteria = array_fill_keys(array_keys(PropertyCatalog::criteria()), 80);
$scores = PropertyAssessment::scores($criteria);
listing_check($scores['mceScore'] === 80.0 && $scores['iaiScore'] === 80.0, 'Equal department scores yield the expected MCE and IAI.');
$criteria['environmental_safety'] = null;
listing_check(PropertyAssessment::scores($criteria)['mceScore'] === null, 'An unknown criterion never receives a fabricated rank.');
listing_reject(fn () => PropertyAssessment::normalize(['risk_constraints' => 101]), 'Out-of-range assessment is rejected.');
$rankMap = PropertyAssessment::ranks([['id' => 1, 'mceScore' => 80.0, 'iaiScore' => 60.0], ['id' => 2, 'mceScore' => 80.0, 'iaiScore' => 70.0], ['id' => 3, 'mceScore' => 50.0, 'iaiScore' => 70.0]]);
listing_check($rankMap[1]['mceRank'] === 1 && $rankMap[2]['mceRank'] === 1 && $rankMap[3]['mceRank'] === 3 && $rankMap[1]['iaiRank'] === 3, 'Ties share a rank and MCE/IAI rankings are independent.');
$payload = sfc_listing_payload(['approval_state' => 'approved', 'sellerUserId' => 99, 'assessmentCriteria' => array_fill_keys(array_keys(PropertyCatalog::criteria()), 100), 'reviewNote' => 'Self-approved', 'contactMode' => 'broker', 'contactBrokerUserId' => 99], $broker, false, $existing);
listing_check($payload['approval_state'] === 'pending_review' && $payload['seller_user_id'] === 3 && !isset($payload['sellerUserId']), 'Broker cannot approve or reassign a submission.');
listing_check($payload['assessmentCriteria'] === [] && !isset($payload['reviewNote']) && $payload['contactBrokerUserId'] === 3, 'Broker cannot forge an assessment, reviewer note or contact broker.');
listing_reject(fn () => sfc_listing_payload([], array_replace($broker, ['identityVerificationStatus' => 'pending']), true), 'Unverified broker cannot submit.');
listing_reject(fn () => sfc_listing_payload(['approval_state' => 'approved', 'reviewNote' => 'Checked'], $assessor, false, array_replace($existing, ['approvalState' => 'pending_review'])), 'Assessor cannot publish a listing.');
listing_reject(fn () => sfc_listing_payload(['approval_state' => 'approved', 'reviewNote' => 'Checked'], $cicto, false, array_replace($existing, ['approvalState' => 'pending_review', 'sellerIdentityStatus' => 'pending', 'sellerBrokerVerified' => false])), 'CICTO cannot publish an unverified broker submission.');
listing_reject(fn () => sfc_listing_payload(['approval_state' => 'APPROVED', 'reviewNote' => 'Checked'], $cicto, false, array_replace($existing, ['approvalState' => 'pending_review', 'sellerBrokerVerified' => false])), 'Uppercase approval still requires a verified broker.');
listing_reject(fn () => sfc_listing_payload(['approvalState' => 'approved_typo'], $cicto, false, $existing), 'An invalid review status cannot become approved.');
listing_check(sfc_listing_payload(['approval_state' => 'approved', 'reviewNote' => 'City records checked'], $cicto, false, array_replace($existing, ['approvalState' => 'pending_review', 'sellerUserId' => null, 'createdByUserId' => 1]))['approval_state'] === 'approved', 'The main CICTO account can publish a city-created listing with a recorded review.');
listing_reject(fn () => sfc_listing_payload(['approval_state' => 'approved', 'reviewNote' => 'Checked'], $cicto, false, array_replace($existing, ['approvalState' => 'pending_review', 'sellerUserId' => 1])), 'CICTO cannot approve an owned listing.');
listing_reject(fn () => sfc_listing_payload(['approval_state' => 'rejected'], $cicto, false, array_replace($existing, ['approvalState' => 'pending_review'])), 'A listing decision requires a reviewer message.');
listing_check(sfc_listing_payload(['description' => 'Updated'], $assessor, false, $existing)['approval_state'] === 'pending_review', 'Changed published data requires another review.');
listing_check(sfc_listing_payload(['approval_state' => 'approved', 'reviewNote' => 'Title and site checked'], $cicto, false, array_replace($existing, ['approvalState' => 'pending_review']))['approval_state'] === 'approved', 'CICTO can approve a verified submission with a message.');

if (in_array('--integration', $argv, true)) {
    $container = require dirname(__DIR__, 2) . '/app/bootstrap.php';
    listing_reject(fn () => $container['properties']->all($unknownDepartment), 'An unknown department cannot access the city listing repository.');
    listing_check($container['messages']->inbox($unknownDepartment) === [] && $container['documentRequests']->inbox($unknownDepartment) === [], 'An unknown department cannot read operational inboxes.');
    listing_reject(fn () => $container['messages']->clearThread(1, $assessor), 'Assessors cannot clear governed conversations.');
    $accessMethod = new ReflectionMethod($container['visits'], 'canResolveAccess');
    $accessMethod->setAccessible(true);
    listing_check($accessMethod->invoke($container['visits'], $unknownDepartment) === false && $accessMethod->invoke($container['visits'], $assessor) === true, 'Site visits accept recognized departments only.');
    $all = $container['properties']->all($cicto);
    $preview = $container['properties']->all(null);
    $approved = array_values(array_filter($all, static fn (array $property): bool => $property['approvalState'] === 'approved'));
    listing_check(count($preview) === min(3, count($approved)), 'Guest catalogue contains only three approved previews.');
    foreach ($preview as $property) {
        listing_check($property['ownerContact'] === null && $property['brokerContact'] === null && $property['reviewNote'] === '' && $property['documentStatuses'] === [], 'Guest preview excludes contacts and private evidence.');
        listing_check($container['properties']->find($property['id'], null)['id'] === $property['id'], 'Visible previews remain addressable.');
    }
    $visibleIds = array_column($preview, 'id');
    foreach ($container['showcase']->all(null) as $item) {
        listing_check(empty($item['relatedPropertyId']) || in_array($item['relatedPropertyId'], $visibleIds, true), 'Anonymous showcase cards cannot reveal hidden property listings.');
    }
    foreach ($all as $property) {
        if (!in_array($property['id'], $visibleIds, true)) {
            try {
                $container['properties']->find($property['id'], null);
                listing_check(false, 'Hidden property ID must not be accessible to a guest.');
            } catch (OutOfBoundsException) {
                listing_check(true, 'Hidden property ID rejects anonymous direct access.');
            }
        }
    }
    if (in_array('--write', $argv, true)) {
        $actor = $container['pdo']->query("SELECT id, name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1")->fetch();
        if (!$actor) {
            throw new RuntimeException('A local city staff fixture is required.');
        }
        $actor += ['role' => 'admin', 'department' => 'CICTO'];
        $createdId = null;
        try {
            $created = $container['properties']->create([
                'name' => 'Workflow test ' . bin2hex(random_bytes(5)), 'property_type' => 'commercial',
                'category' => 'Land', 'subcategory' => 'Agricultural', 'description' => 'Temporary local workflow verification.',
                'barangay' => 'Catbangen', 'land_area' => 2500, 'land_area_unit' => 'sqm', 'price' => 1000000,
                'lat' => 16.61, 'lng' => 120.32, 'approval_state' => 'pending_review',
                'assessmentCriteria' => array_fill_keys(array_keys(PropertyCatalog::criteria()), 80), 'assessmentTags' => ['AGRICULTURAL'],
            ], $actor);
            $createdId = $created['id'];
            listing_check($created['category'] === 'Land' && $created['subcategory'] === 'Agricultural' && $created['area'] === .25, 'Taxonomy and square-meter area survive a repository write.');
            listing_check($created['createdByUserId'] === (int) $actor['id'] && $created['sellerUserId'] === null, 'City creator is stored without a submitting broker.');
            listing_check($created['mceScore'] === 80.0 && $created['iaiScore'] === 80.0 && $created['mceRank'] === null, 'Stored assessment scores round trip without ranking unpublished listings.');
            listing_check($created['tags'] === [] && $created['facilities'] === [] && $created['ownerContact']['phone'] === '' && $created['ownerContact']['email'] === '', 'New records do not invent amenities or phone/email contacts.');
            $updated = $container['properties']->update($createdId, ['category' => 'Industrial', 'subcategory' => 'Warehouse', 'assessmentCriteria' => [], 'assessmentTags' => ['INDUSTRIAL']], $actor);
            listing_check($updated['category'] === 'Industrial' && $updated['subcategory'] === 'Warehouse' && $updated['mceScore'] === null && $updated['assessmentTags'] === ['INDUSTRIAL'], 'Changed category and cleared assessment persist.');
            App\Support\AutoSeeder::seedIfNeeded($container['pdo']);
            listing_check($container['properties']->find($createdId, $actor)['sellerUserId'] === null, 'AutoSeeder never transfers a city listing to the demo broker.');
        } finally {
            if ($createdId !== null) {
                // Delete only this uniquely created pending fixture and its test audit records.
                $cleanup = $container['pdo']->prepare('DELETE FROM audit_logs WHERE entity_type = :entity_type AND entity_id = :entity_id');
                $cleanup->execute(['entity_type' => 'PROPERTY', 'entity_id' => $createdId]);
                $cleanup = $container['pdo']->prepare('DELETE FROM properties WHERE id = :id AND approval_state = :state');
                $cleanup->execute(['id' => $createdId, 'state' => 'pending_review']);
            }
        }
        $demoId = $container['pdo']->query("SELECT id FROM users WHERE email = 'seller@sfcelerate.local'")->fetchColumn();
        if ($demoId) {
            $container['pdo']->beginTransaction();
            try {
                $statement = $container['pdo']->prepare("UPDATE users SET identity_verification_status = 'suspended' WHERE id = :id");
                $statement->execute(['id' => $demoId]);
                $seedUsers = new ReflectionMethod(App\Support\AutoSeeder::class, 'seedUsers');
                $seedUsers->setAccessible(true);
                $seedUsers->invoke(null, $container['pdo']);
                $statement = $container['pdo']->prepare('SELECT identity_verification_status FROM users WHERE id = :id');
                $statement->execute(['id' => $demoId]);
                listing_check($statement->fetchColumn() === 'suspended', 'AutoSeeder preserves an existing CICTO suspension.');
            } finally {
                $container['pdo']->rollBack();
            }
        }
    }
}
echo sprintf("PASS: %d listing workflow checks%s.\n", $checks, in_array('--integration', $argv, true) ? ' including live catalogue access' : '');
