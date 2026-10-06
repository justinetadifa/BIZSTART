<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    if (!sfc_can_review_brokers()) {
        return [403, ['error' => 'Only CICTO can create city department accounts.']];
    }
    if (request_method() !== 'POST') {
        return [405, ['error' => 'Method not allowed.']];
    }
    $input = read_request_input();
    $user = sfc_register_admin(
        (string) ($input['name'] ?? ''),
        (string) ($input['email'] ?? ''),
        (string) ($input['password'] ?? ''),
        (string) ($input['confirm_password'] ?? ''),
        (string) ($input['department'] ?? '')
    );
    return [201, ['user' => sfc_user_session_payload($user)]];
});
