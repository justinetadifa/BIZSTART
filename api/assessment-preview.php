<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__) . '/app/Support/AutomaticPropertyAssessment.php';

header('Cache-Control: private, no-store');

api_handle(function (array $container): array {
    if (request_method() !== 'GET') {
        return [405, ['error' => 'Method not allowed.']];
    }
    $user = sfc_current_user();
    if ($user === null || (!sfc_can_manage_properties($user) && !sfc_broker_can_submit($user))) {
        return [403, ['error' => 'A city department or verified broker account is required to preview automatic assessment.']];
    }
    // Only spatial inputs are read. Scores, source manifests and evidence are server-owned.
    $input = array_intersect_key($_GET, array_flip(['lat', 'lng', 'category', 'subcategory', 'land_area', 'land_area_unit']));
    foreach ($input as $value) {
        if (!is_scalar($value)) {
            throw new InvalidArgumentException('Assessment inputs must contain scalar values.');
        }
    }
    return ['assessment' => \App\Support\AutomaticPropertyAssessment::configured()->evaluate($input)];
});
