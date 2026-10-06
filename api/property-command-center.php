<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    $user = sfc_current_user();
    if (($user['role'] ?? '') === 'admin' && !sfc_can_manage_properties($user)) {
        return [403, ['error' => 'A recognized city department account is required.']];
    }
    $propertyId = int_or_null($_GET['id'] ?? $_GET['propertyId'] ?? null);
    if ($propertyId === null || $propertyId < 1) {
        throw new InvalidArgumentException('A valid property id is required.');
    }

    return [
        'commandCenter' => $container['commandCenter']->build($propertyId, $user),
    ];
});
