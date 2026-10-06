<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/../app/Support/staff-onboarding.php';

api_handle(function (array $container): array {
    if (request_method() !== 'POST') {
        return [405, ['error' => 'Method not allowed.']];
    }

    if (!sfc_city_staff_onboarding_enabled()) {
        return [403, ['error' => 'Staff account activation is unavailable. Contact CICTO for access.']];
    }

    $input = read_request_input();
    if (!sfc_city_staff_passkey_valid((string) ($input['city_passkey'] ?? ''))) {
        return [403, [
            'error' => 'Invalid Municipal Authorization Passkey. Please request the official onboarding passkey from CICTO or your department head.',
        ]];
    }

    $rawDept = strtoupper(trim((string) ($input['department'] ?? '')));
    $department = match ($rawDept) {
        'CICTO', 'ICT' => 'CICTO',
        'ASSESSOR', 'ASSESSORS', 'CAO' => 'ASSESSOR',
        'LEBDO' => 'LEBDO',
        default => null,
    };

    if ($department === null) {
        return [422, ['error' => 'Please select an authorized department (CICTO, Assessors, or LEBDO).']];
    }

    $name = trim((string) ($input['name'] ?? ''));
    if ($name === '' || mb_strlen($name) < 2) {
        return [422, ['error' => 'Please enter your complete official name.']];
    }
    if (mb_strlen($name) > 140) {
        return [422, ['error' => 'Name cannot exceed 140 characters.']];
    }

    $email = strtolower(trim((string) ($input['email'] ?? '')));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return [422, ['error' => 'Please enter a valid official email address.']];
    }
    if (mb_strlen($email) > 190) {
        return [422, ['error' => 'Email cannot exceed 190 characters.']];
    }

    $password = (string) ($input['password'] ?? '');
    $confirmPassword = (string) ($input['confirm_password'] ?? '');
    if (strlen($password) < 8) {
        return [422, ['error' => 'Password must be at least 8 characters long.']];
    }
    if ($password !== $confirmPassword) {
        return [422, ['error' => 'Password confirmation does not match.']];
    }

    $existing = $container['users']->findByEmail($email);
    if ($existing !== null) {
        return [409, ['error' => 'An account with this email address already exists.']];
    }

    $user = $container['users']->create('admin', $name, $email, $password, $department);

    // Establish authenticated session for the newly onboarded municipal officer
    sfc_start_session();
    session_regenerate_id(true);
    unset($_SESSION['sfc_csrf_token']);
    $_SESSION['sfc_user'] = sfc_user_session_payload($user);
    $_SESSION['sfc_authenticated_at'] = time();
    $_SESSION['sfc_last_activity_at'] = time();
    sfc_csrf_token();

    return [201, [
        'success' => true,
        'message' => sprintf('Official account created for %s (%s).', $user['name'], $department),
        'user' => sfc_user_session_payload($user),
        'redirect' => rtrim(str_replace('\\', '/', dirname(dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/api/staff-onboard.php')))), '/.') . '/admin-dashboard.php',
    ]];
});
