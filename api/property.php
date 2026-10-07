<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_listing-policy.php';
require_once dirname(__DIR__) . '/app/Support/PropertyNearby.php';

api_handle(function (array $container): array {
    $method = request_method();
    $user = sfc_current_user();
    $propertyId = int_or_null($_GET['id'] ?? null);
    if ($propertyId === null || $propertyId < 1) {
        throw new InvalidArgumentException('A valid property id is required.');
    }
    if ($method === 'GET') {
        $property = $container['properties']->find($propertyId, $user);
        $property = $container['decisionEngine']->decorateProperty($property, [
            'voteSummary' => $container['votes']->summaryMap([$propertyId])[$propertyId] ?? [],
            'messageSummary' => $container['messages']->propertySummaryMap([$propertyId])[$propertyId] ?? [],
        ]);
        return ['property' => $container['clup']->decorateProperty($property, string_or_null($_GET['investmentType'] ?? null))];
    }
    if (!in_array($method, ['PUT', 'PATCH', 'DELETE'], true)) {
        return [405, ['error' => 'Method not allowed.']];
    }
    if ($user === null || (!sfc_can_manage_properties($user) && ($user['role'] ?? '') !== 'seller')) {
        return [403, ['error' => 'A department or approved broker account is required.']];
    }
    if (($user['role'] ?? '') === 'seller') {
        if (!sfc_broker_can_submit($user)) {
            return [403, ['error' => 'Your broker account is awaiting CICTO approval.']];
        }
        if (!$container['properties']->isOwnedBySeller($propertyId, (int) $user['id'])) {
            return [403, ['error' => 'You may only manage your own listings.']];
        }
    }
    $before = $container['properties']->find($propertyId, $user);
    if ($method === 'DELETE') {
        $property = $container['properties']->update($propertyId, ['approval_state' => 'archived'], $user);
        return ['propertyId' => $propertyId, 'property' => $property];
    }
    $payload = sfc_listing_payload(read_request_input(), $user, false, $before);
    $payload = \App\Support\PropertyNearby::withUploads($payload, $_FILES);
    $image = store_uploaded_property_image($_FILES['image_file'] ?? null);
    if ($image !== null) {
        $payload['image_path'] = $image;
    }
    $property = $container['properties']->update($propertyId, $payload, $user);
    if (($before['approvalState'] ?? '') !== ($property['approvalState'] ?? '') && !empty($property['sellerUserId']) && ($user['role'] ?? '') === 'admin') {
        $container['notifications']->createForUsers([(int) $property['sellerUserId']], [
            'category' => 'operational', 'kind' => 'listing_review', 'priority' => 'normal', 'tone' => $property['approvalState'] === 'approved' ? 'success' : 'info',
            'icon' => 'propertyinfo', 'title' => 'Listing ' . str_replace('_', ' ', $property['approvalState']),
            'body' => $property['reviewNote'] ?: $property['name'], 'actionLabel' => 'View listings', 'actionUrl' => 'seller-dashboard.php',
            'actorUserId' => (int) $user['id'], 'propertyId' => $propertyId,
        ]);
    }
    $container['line']->onListingUpdated($before, $property, $user);
    return ['property' => $container['clup']->decorateProperty($container['decisionEngine']->decorateProperty($property))];
});
