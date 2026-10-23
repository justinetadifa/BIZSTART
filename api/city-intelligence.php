<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__) . '/app/Support/CityIntelligenceService.php';

api_handle(function (array $container): array {
    if (!in_array(request_method(), ['GET', 'HEAD'], true)) {
        return [405, ['error' => 'Method not allowed. Only GET and HEAD requests are permitted.']];
    }

    $user = sfc_current_user();
    if ($user === null || ($user['role'] ?? '') !== 'admin') {
        return [403, ['error' => 'City department administration role (CAO, LEBDO, or CICTO) is required.']];
    }

    $filters = [
        'date_range' => filter_input(INPUT_GET, 'date_range', FILTER_DEFAULT) ?: 'all',
        'start_date' => filter_input(INPUT_GET, 'start_date', FILTER_DEFAULT),
        'end_date' => filter_input(INPUT_GET, 'end_date', FILTER_DEFAULT),
        'barangay' => filter_input(INPUT_GET, 'barangay', FILTER_DEFAULT) ?: 'all',
        'property_type' => filter_input(INPUT_GET, 'property_type', FILTER_DEFAULT) ?: 'all',
        'status' => filter_input(INPUT_GET, 'status', FILTER_DEFAULT) ?: 'all',
    ];

    $intelligenceService = new \App\Support\CityIntelligenceService($container['pdo']);
    $data = $intelligenceService->getDashboardData($filters, $user);

    return [
        'success' => true,
        'data' => $data,
    ];
});
