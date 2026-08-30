<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

use App\Support\JsonData;

api_handle(function (array $container): array {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return [405, ['error' => 'Method not allowed.']];
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

    return [
        'property' => $container['properties']->updateBarangay($propertyId, $barangay),
    ];
});

