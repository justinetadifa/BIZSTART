<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    $method = request_method();
    $user = sfc_current_user();

    if ($method === 'GET' && (isset($_GET['zone']) || isset($_GET['zoning_classification']) || isset($_GET['activity']) || isset($_GET['proposed_activity']))) {
        $zone = string_or_null($_GET['zone'] ?? $_GET['zoning_classification'] ?? null);
        $act = string_or_null($_GET['activity'] ?? $_GET['proposed_activity'] ?? null);
        $conditions = is_array($_GET['conditions'] ?? null) ? $_GET['conditions'] : [];
        return [
            'evaluation' => \App\Support\ZoningRulesEngine::evaluate($zone, $act, $conditions),
            'engineVersion' => \App\Support\ZoningRulesEngine::VERSION,
            'sourcePriority' => 1,
            'generatedAt' => gmdate(DATE_ATOM),
        ];
    }

    if ($method === 'GET' && !isset($_GET['propertyId'])) {
        $catalog = $container['clup']->catalog();
        $catalog['zoningDistricts'] = \App\Support\ZoningRulesEngine::getOfficialDistricts();
        $catalog['activityCatalog'] = \App\Support\ZoningRulesEngine::getHierarchicalUseCatalog();
        $catalog['rulesEngineVersion'] = \App\Support\ZoningRulesEngine::VERSION;
        return ['catalog' => $catalog];
    }

    $input = $method === 'POST' ? read_json_input() : $_GET;
    if ($method === 'POST' && (isset($input['zone']) || isset($input['zoning_classification'])) && (isset($input['activity']) || isset($input['proposed_activity']))) {
        $zone = string_or_null($input['zone'] ?? $input['zoning_classification'] ?? null);
        $act = string_or_null($input['activity'] ?? $input['proposed_activity'] ?? null);
        $conditions = is_array($input['conditions'] ?? null) ? $input['conditions'] : [];
        return [
            'evaluation' => \App\Support\ZoningRulesEngine::evaluate($zone, $act, $conditions),
            'engineVersion' => \App\Support\ZoningRulesEngine::VERSION,
            'sourcePriority' => 1,
            'generatedAt' => gmdate(DATE_ATOM),
        ];
    }
    $persist = $method === 'POST' && filter_var($input['persist'] ?? false, FILTER_VALIDATE_BOOLEAN);
    if ($persist && $user === null) {
        return [401, ['error' => 'Sign in before saving a CLUP evaluation snapshot.']];
    }

    $pairs = [];
    if (is_array($input['pairs'] ?? null)) {
        foreach ($input['pairs'] as $pair) {
            if (!is_array($pair)) {
                throw new InvalidArgumentException('Each batch item must contain a candidate site and proposed use.');
            }
            $pairs[] = $pair;
        }
    } elseif (is_array($input['propertyIds'] ?? null)) {
        $use = string_or_null($input['investmentType'] ?? $input['proposedUseCode'] ?? null);
        foreach ($input['propertyIds'] as $propertyId) {
            $pairs[] = ['propertyId' => $propertyId, 'investmentType' => $use];
        }
    } else {
        $pairs[] = $input;
    }

    if ($pairs === [] || count($pairs) > 100) {
        throw new InvalidArgumentException('Evaluate between 1 and 100 candidate site/use pairs per request.');
    }

    $evaluations = [];
    foreach ($pairs as $pair) {
        $propertyId = int_or_null($pair['propertyId'] ?? null);
        $use = string_or_null($pair['investmentType'] ?? $pair['proposedUseCode'] ?? null);
        if ($propertyId === null || $propertyId < 1 || $use === null) {
            throw new InvalidArgumentException('Candidate site and proposed investment use are required for every evaluation.');
        }

        $property = $container['properties']->find($propertyId, $user);
        $result = $persist
            ? $container['clup']->persistEvaluation($property, $use, $user)
            : $container['clup']->evaluate($property, $use);
        $evaluations[$propertyId . ':' . $result['proposedInvestmentType']] = $result;
    }

    $response = [
        'evaluations' => $evaluations,
        'count' => count($evaluations),
        'engineVersion' => \App\Support\ClupComplianceService::ENGINE_VERSION,
        'generatedAt' => gmdate(DATE_ATOM),
    ];
    if (count($evaluations) === 1) {
        $response['compliance'] = reset($evaluations);
    }
    return $response;
});
