<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $propertyId = int_or_null($_GET['propertyId'] ?? null);
        if ($propertyId === null || $propertyId < 1) {
            throw new InvalidArgumentException('A valid property id is required.');
        }

        return [
            'scenarios' => $container['scenarios']->listByProperty($propertyId),
        ];
    }

    if ($method !== 'POST') {
        return [405, ['error' => 'Method not allowed.']];
    }

    $input = read_json_input();
    $propertyId = int_or_null($input['propertyId'] ?? null);
    $name = string_or_null($input['name'] ?? null);

    if ($propertyId === null || $propertyId < 1) {
        throw new InvalidArgumentException('A valid property id is required.');
    }
    if ($name === null) {
        throw new InvalidArgumentException('A scenario name is required.');
    }

    return [
        'scenario' => $container['scenarios']->create([
            'propertyId' => $propertyId,
            'name' => $name,
            'createdBy' => string_or_null($input['createdBy'] ?? null),
            'budget' => int_or_null($input['budget'] ?? null),
            'sector' => string_or_null($input['sector'] ?? null),
            'size' => float_or_null($input['size'] ?? null),
            'weights' => is_array($input['weights'] ?? null) ? $input['weights'] : [],
            'assumptions' => is_array($input['assumptions'] ?? null) ? $input['assumptions'] : [],
            'results' => is_array($input['results'] ?? null) ? $input['results'] : [],
        ]),
    ];
});

