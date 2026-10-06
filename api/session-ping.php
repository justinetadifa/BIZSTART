<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    $user = sfc_current_user();
    if ($user === null) {
        return [401, [
            'ok' => false,
            'expired' => true,
            'message' => 'Session has expired due to inactivity.',
        ]];
    }

    $touched = sfc_touch_session();
    if (!$touched) {
        return [401, [
            'ok' => false,
            'expired' => true,
            'message' => 'Session could not be renewed.',
        ]];
    }

    $role = (string) ($user['role'] ?? 'guest');
    $timeout = sfc_inactivity_timeout_seconds($role);

    return [200, [
        'ok' => true,
        'user' => $user['name'] ?? '',
        'role' => $role,
        'timeoutSeconds' => $timeout,
        'remainingSeconds' => $timeout,
        'timestamp' => time(),
    ]];
});
