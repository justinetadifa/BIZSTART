<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

use App\Support\PropertyAssessmentService;

api_handle(function (array $container): array {
    if (!headers_sent()) { header('Cache-Control: private, no-store, max-age=0'); }
    if (request_method() !== 'GET') { return [405, ['ok' => false, 'error' => 'Method not allowed.']]; }
    $user = sfc_current_user();
    if ($user === null) { return [401, ['ok' => false, 'error' => 'Authentication required.']]; }
    if (!sfc_can_manage_properties($user) && !sfc_broker_can_submit($user)) {
        return [403, ['ok' => false, 'error' => 'Property management or approved broker access is required.']];
    }
    return [200, ['ok' => true] + PropertyAssessmentService::publicWeightConfiguration($container['pdo'])];
});
