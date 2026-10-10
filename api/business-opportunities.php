<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__) . '/app/Support/NearbyBusinesses.php';
require_once dirname(__DIR__) . '/app/Support/BusinessOpportunities.php';

api_handle(function (array $container): array {
    $method = request_method();
    if ($method !== 'GET') {
        return [405, ['error' => 'Method not allowed.']];
    }

    // If requesting full catalog
    if (!empty($_GET['catalog'])) {
        return [
            'catalog' => \App\Support\BusinessOpportunities::catalog(),
            'sectors' => \App\Support\BusinessOpportunities::SECTORS,
            'ruleVersion' => \App\Support\BusinessOpportunities::RULE_VERSION,
            'ruleSource' => \App\Support\BusinessOpportunities::RULE_SOURCE,
        ];
    }

    $propertyId = int_or_null($_GET['property_id'] ?? $_GET['id'] ?? null);
    if ($propertyId === null || $propertyId < 1) {
        throw new InvalidArgumentException('A valid property id is required.');
    }

    $user = sfc_current_user();
    $property = $container['properties']->find($propertyId, $user);
    if (!$property) {
        return [404, ['error' => 'Property not found.']];
    }

    $property = $container['decisionEngine']->decorateProperty($property);
    $decorated = $container['clup']->decorateProperty($property);
    $radius = isset($_GET['radius']) ? max(100.0, min(1500.0, (float) $_GET['radius'])) : \App\Support\BusinessOpportunities::DEFAULT_RADIUS_METERS;

    $evaluation = \App\Support\BusinessOpportunities::evaluate($decorated, $radius);

    return [
        'evaluation' => $evaluation,
        'catalog' => \App\Support\BusinessOpportunities::catalog(),
        'sectors' => \App\Support\BusinessOpportunities::SECTORS,
    ];
});
