<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_listing-policy.php';

use App\Support\JsonData;

api_handle(function (array $container): array {
    if (request_method() !== 'POST') {
        return [405, ['error' => 'Method not allowed.']];
    }

    $user = sfc_current_user();
    if (!sfc_can_manage_properties($user)) {
        return [403, ['error' => 'Only admin accounts can update a candidate site barangay.']];
    }

    $input = read_json_input();
    $propertyId = int_or_null($input['propertyId'] ?? null);
    if ($propertyId === null || $propertyId < 1) {
        throw new InvalidArgumentException('A valid property id is required.');
    }

    $barangay = string_or_null($input['barangay'] ?? null);
    $allowed = JsonData::meta()['barangays'] ?? [];
    if ($barangay !== null && !in_array($barangay, $allowed, true)) {
        throw new InvalidArgumentException('Barangay is not part of the approved list.');
    }

    $existing = $container['properties']->find($propertyId, $user);
    $payload = sfc_listing_payload(['barangay' => $barangay], $user, false, $existing);
    return ['property' => $container['properties']->update($propertyId, $payload, $user)];
});
