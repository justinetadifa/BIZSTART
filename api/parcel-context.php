<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__) . '/app/Support/PropertyParcel.php';

header('Cache-Control: private, no-store');
api_handle(function (array $container): array {
    if (request_method() !== 'GET') { return [405, ['error' => 'Method not allowed.']]; }
    $user = sfc_current_user();
    if ($user === null || (!sfc_can_manage_properties($user) && !sfc_broker_can_submit($user))) {
        return [403, ['error' => 'A city department or verified broker account is required to review parcel source data.']];
    }
    return ['context' => \App\Support\PropertyParcel::context($container['config']['automatic_assessment'] ?? [])];
});
