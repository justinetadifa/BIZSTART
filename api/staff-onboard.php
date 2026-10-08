<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/../app/Support/staff-onboarding.php';

api_handle(function (array $container): array {
    if (request_method() !== 'POST') {
        return [405, ['error' => 'Method not allowed.']];
    }

    try {
        $user = sfc_activate_city_staff(read_request_input());
    } catch (SfcAuthValidationException $exception) {
        $errors = $exception->errors();
        $status = isset($errors['email'])
            && $errors['email'] === 'An account with this email already exists. Sign in instead.' ? 409 : 422;
        if (($errors['city_passkey'] ?? '') === 'Too many activation attempts. Try again in 15 minutes.') {
            $status = 429;
        }
        return [$status, ['error' => $exception->getMessage(), 'errors' => $errors]];
    }
    return [201, [
        'success' => true,
        'message' => 'Official account activated.',
        'user' => sfc_user_session_payload($user),
        'redirect' => rtrim(str_replace('\\', '/', dirname(dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/api/staff-onboard.php')))), '/.') . '/admin-dashboard.php',
    ]];
});
