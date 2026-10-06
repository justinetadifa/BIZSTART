<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    $method = request_method();
    $user = sfc_current_user();
    if ($user === null || (($user['role'] ?? '') === 'admin' && !sfc_can_manage_properties($user))) {
        return [403, ['error' => 'Sign in to view supporting evidence.']];
    }

    if ($method === 'GET') {
        $propertyId = int_or_null($_GET['propertyId'] ?? null);
        if ($propertyId === null || $propertyId < 1) {
            throw new InvalidArgumentException('A valid property id is required.');
        }

        // Apply listing visibility before loading its supporting evidence.
        $container['properties']->find($propertyId, $user);

        return [
            'state' => $container['properties']->dueDiligenceState($propertyId),
        ];
    }

    if ($method !== 'POST') {
        return [405, ['error' => 'Method not allowed.']];
    }

    $input = read_json_input();
    $propertyId = int_or_null($input['propertyId'] ?? null);
    if ($propertyId === null || $propertyId < 1) {
        throw new InvalidArgumentException('A valid property id is required.');
    }

    if (!sfc_can_manage_properties($user)) {
        return [403, ['error' => 'Only city departments can record a due diligence assessment.']];
    }

    $container['properties']->find($propertyId, $user);

    $state = $input['state'] ?? [];
    if (!is_array($state)) {
        throw new InvalidArgumentException('Due diligence state must be an object.');
    }

    $beforeState = $container['properties']->dueDiligenceState($propertyId);
    $afterState = $container['properties']->saveDueDiligenceState($propertyId, $state, $user);
    $container['line']->onDueDiligenceUpdated($propertyId, $beforeState, $afterState, $user);

    return [
        'state' => $afterState,
    ];
});
