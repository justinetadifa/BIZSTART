<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

use App\Support\BusinessMatchEngine;

api_handle(function (array $container): array {
    if (request_method() !== 'GET') {
        return [405, ['error' => 'Method not allowed.']];
    }

    $propertyId = (int) ($_GET['property_id'] ?? $_GET['id'] ?? 0);
    if ($propertyId <= 0) {
        // Return catalog of typologies if no specific property requested
        return [
            'ok' => true,
            'typologies' => BusinessMatchEngine::typologies(),
        ];
    }

    $property = $container['properties']->find($propertyId, sfc_current_user());
    $recommendation = BusinessMatchEngine::recommend($property);
    if (!$recommendation['ok']) {
        http_response_code(404);
        return $recommendation;
    }

    return $recommendation;
});
