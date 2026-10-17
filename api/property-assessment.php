<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__) . '/app/Support/AutomaticPropertyAssessment.php';

header('Cache-Control: private, no-store');
api_handle(function (array $container): array {
    if (request_method() !== 'GET') { return [405, ['error' => 'Method not allowed.']]; }
    $id = int_or_null($_GET['id'] ?? null);
    $activity = $_GET['activity'] ?? '';
    if ($id === null || $id < 1 || !is_string($activity) || strlen($activity) > 120) {
        throw new InvalidArgumentException('Provide a property id and a proposed activity code.');
    }
    // find enforces the same publication, ownership and guest-preview permissions as Property Details.
    $property = $container['properties']->find($id, sfc_current_user());
    return ['assessment' => \App\Support\AutomaticPropertyAssessment::scenario($property, $activity)];
});
