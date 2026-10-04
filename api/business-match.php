<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

use App\Support\BusinessMatchEngine;

api_handle(function (array $container): array {
    $propertyId = (int) ($_GET['property_id'] ?? $_GET['id'] ?? 0);
    if ($propertyId <= 0) {
        // Return catalog of typologies if no specific property requested
        return [
            'ok' => true,
            'typologies' => BusinessMatchEngine::typologies(),
        ];
    }

    $recommendation = BusinessMatchEngine::recommend($propertyId);
    if (!$recommendation['ok']) {
        http_response_code(404);
        return $recommendation;
    }

    return $recommendation;
});
