<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

use App\Support\JsonData;

api_handle(function (array $container): array {
    $meta = JsonData::meta();
    $user = sfc_current_user();
    $properties = $container['properties']->all($user);
    $meta['services'] = $container['external']->describeServices($meta['services'] ?? []);
    $meta['services']['maps']['viewport'] = $container['properties']->mapViewport($properties);

    return [
        'meta' => $meta,
        'properties' => $properties,
        'stats' => [
            'activeInquiries' => (int) ($meta['dashboard']['activeInquiries'] ?? 0),
            'globalReach' => (int) ($meta['dashboard']['globalReach'] ?? 0),
            'marketSnapshot' => $meta['services']['marketData'] ?? null,
        ],
        'generatedAt' => gmdate(DATE_ATOM),
    ];
});
