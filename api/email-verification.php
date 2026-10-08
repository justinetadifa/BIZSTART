<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

use App\Support\BrokerEmailRateLimitException;

header('Cache-Control: no-store');
api_handle(function (array $container): array {
    $user = sfc_current_user();
    if ($user === null || ($user['role'] ?? '') !== 'seller') {
        return [403, ['error' => 'Sign in to your broker account to manage email verification.']];
    }
    $service = $container['brokerEmail'];
    if (request_method() === 'GET') { return $service->status((int) $user['id']); }
    if (request_method() !== 'POST') { return [405, ['error' => 'Method not allowed.']]; }
    $input = read_request_input();
    if (($input['action'] ?? 'resend') !== 'resend') {
        return [400, ['error' => 'Unknown email verification action.']];
    }
    try {
        return $service->resend($user, (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    } catch (BrokerEmailRateLimitException $exception) {
        header('Retry-After: ' . $exception->retryAfter);
        return [429, ['error' => $exception->getMessage(), 'retryAfter' => $exception->retryAfter]];
    }
});
