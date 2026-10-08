<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/../app/Support/profile.php';

api_handle(function (array $container): array {
    $user = sfc_current_user();
    if ($user === null) {
        return [403, ['error' => 'Sign in to manage your profile.']];
    }
    if (request_method() === 'GET') {
        return [
            'user' => $user,
            'brokerProfile' => $user['role'] === 'seller' ? $container['sellerProfiles']->findOrInitializeByUser($user) : null,
            'consentText' => sfc_privacy_consent_text(),
            'consentVersion' => sfc_privacy_consent_version(),
        ];
    }
    if (request_method() !== 'POST') {
        return [405, ['error' => 'Method not allowed.']];
    }
    return sfc_update_own_profile($user, read_request_input(), $_FILES['profile_photo'] ?? null, $_FILES);
});
