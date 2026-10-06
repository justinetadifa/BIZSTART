<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

use App\Support\JsonData;
use App\Support\SiteMetrics;
use App\Support\PropertyCatalog;

require_once __DIR__ . '/../app/Support/SiteMetrics.php';
require_once __DIR__ . '/../app/Support/PropertyCatalog.php';

api_handle(function (array $container): array {
    $meta = JsonData::meta();
    $user = sfc_current_user();
    SiteMetrics::recordVisit($container['pdo']);
    $properties = $container['properties']->all($user);
    $propertyIds = array_values(array_filter(array_map(
        static fn (array $property): int => (int) ($property['id'] ?? 0),
        $properties
    )));
    $voteSummaries = $container['votes']->summaryMap($propertyIds);
    $messageSummaries = $container['messages']->propertySummaryMap($propertyIds);
    $properties = $container['decisionEngine']->decorateProperties($properties, [
        'voteSummaries' => $voteSummaries,
        'messageSummaries' => $messageSummaries,
    ]);
    $properties = array_map(
        static fn (array $property): array => $container['clup']->decorateProperty($property),
        $properties
    );
    $meta['services'] = $container['external']->describeServices($meta['services'] ?? []);
    $meta['services']['maps']['viewport'] = $container['properties']->mapViewport($properties);
    $meta['decisionPersonas'] = $container['decisionEngine']->personas();
    $meta['clup'] = $container['clup']->catalog();

    return [
        'meta' => $meta,
        'properties' => $properties,
        'stats' => SiteMetrics::summary($container['pdo']),
        'categories' => PropertyCatalog::categories(),
        'criteria' => PropertyCatalog::criteria(),
        'policy' => $container['config']['policy'] ?? [
            'ordinance_number' => 'Ordinance No. 2024-41',
            'policy_priority_adjustment_percent' => 10.0,
            'incentive_thresholds' => [
                'tier1_min_capital' => 15000000.0,
                'tier2_min_capital' => 3000000.0,
            ],
        ],
        'publicPreview' => $user === null,
        'generatedAt' => gmdate(DATE_ATOM),
    ];
});
