<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';

function sfc_store_profile_photo(?array $file): ?string
{
    if ($file === null || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException('Photo upload failed. Choose a JPG, PNG, or WEBP up to 2 MB.');
    }
    $temporary = $file['tmp_name'] ?? null;
    if (!is_string($temporary) || !is_uploaded_file($temporary)) {
        throw new InvalidArgumentException('Upload a valid profile photo.');
    }
    $metadata = public_image_file_metadata($temporary);
    if ($metadata['size'] > 2 * 1024 * 1024 || $metadata['width'] * $metadata['height'] > 4000000 || !in_array($metadata['mime'], ['image/jpeg', 'image/png', 'image/webp'], true)) {
        throw new InvalidArgumentException('Use a JPG, PNG, or WEBP up to 2 MB and 4 megapixels.');
    }
    return store_uploaded_public_image($file, 'profiles');
}

function sfc_update_own_profile(array $user, array $payload, ?array $photo = null, array $files = []): array
{
    sfc_require_csrf_form();
    $userId = (int) ($user['id'] ?? 0);
    if ($userId < 1) {
        throw new InvalidArgumentException('Sign in to update your profile.');
    }
    $container = sfc_app_container();
    $current = $container['users']->findById($userId);
    if ($current === null || !sfc_account_can_authenticate($current)) {
        throw new InvalidArgumentException('Account is unavailable.');
    }
    $consentOnly = ($payload['action'] ?? '') === 'consent';
    $needsConsent = ($current['privacyConsentVersion'] ?? null) !== sfc_privacy_consent_version();
    if ($needsConsent || $consentOnly) {
        sfc_account_privacy_payload($payload['privacy_consent'] ?? $payload['privacyConsent'] ?? false);
    }
    if ($consentOnly) {
        $updated = $container['users']->recordPrivacyConsent($userId, sfc_privacy_consent_version(), sfc_privacy_consent_text());
        $_SESSION['sfc_user'] = sfc_user_session_payload($updated);
        return ['user' => $_SESSION['sfc_user']];
    }
    $name = trim((string) ($payload['name'] ?? $current['name']));
    $phone = trim((string) ($payload['phone'] ?? $current['phone'] ?? ''));
    $address = trim((string) ($payload['address'] ?? $payload['address_line'] ?? $current['address'] ?? ''));
    if ($name === '' || mb_strlen($name) > 140) {
        throw new InvalidArgumentException('Enter your complete name (up to 140 characters).');
    }
    if ($phone !== '' && !preg_match('/^[+()0-9 .-]{7,30}$/', $phone)) {
        throw new InvalidArgumentException('Enter a valid contact number.');
    }
    if (mb_strlen($address) > 255) {
        throw new InvalidArgumentException('Address must be at most 255 characters.');
    }
    $profile = null;
    $newImage = sfc_store_profile_photo($photo);
    $image = $newImage ?? ($current['profileImageUrl'] ?? null);
    if (filter_var($payload['remove_photo'] ?? false, FILTER_VALIDATE_BOOLEAN) && $newImage === null) {
        $image = null;
    }
    $pdo = $container['pdo'];
    $pdo->beginTransaction();
    try {
        if ($current['role'] === 'seller') {
            $existing = $container['sellerProfiles']->findByUserId($userId, true)
                ?? $container['sellerProfiles']->findOrInitializeByUser($current);
            $brokerPayload = $payload + [
                'seller_type' => $existing['sellerType'],
                'city' => $existing['city'],
                'authorization_basis' => $existing['authorizationBasis'] ?? 'Licensed real estate broker',
            ];
            $brokerPayload['legal_name'] = $name;
            $brokerPayload['phone'] = $phone;
            $brokerPayload['address_line'] = $address;
            $submit = ($payload['action'] ?? '') === 'submit_prc';
            if ($submit) {
                $brokerPayload['seller_type'] = 'broker';
            }
            $profile = $container['brokerApplications']->saveForUser($userId, $brokerPayload, $files, $submit);
            $status = match ($profile['applicationStatus']) {
                'verified' => 'verified', 'rejected' => 'rejected', 'suspended' => 'suspended', 'pending_review', 'corrections_requested' => 'pending', default => 'unverified',
            };
            $container['users']->updateIdentityVerificationStatus($userId, $status);
        }
        $updated = $container['users']->updateProfile($userId, $name, $phone ?: null, $address ?: null, $image);
        if ($needsConsent) {
            $updated = $container['users']->recordPrivacyConsent($userId, sfc_privacy_consent_version(), sfc_privacy_consent_text());
        }
        if ($profile !== null) {
            $profile = $container['sellerProfiles']->findByUserId($userId);
        }
        $pdo->commit();
        if ($current['role'] === 'seller') { $container['brokerApplications']->finalizeStagedForUser($userId); }
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($current['role'] === 'seller') { $container['brokerApplications']->discardStagedForUser($userId); }
        // Only the server-generated file from this request can be removed.
        if ($newImage !== null && preg_match('#^assets/uploads/profiles/[a-zA-Z0-9.-]+\.(jpg|png|webp)$#', $newImage)) {
            $createdPhoto = dirname(__DIR__, 2) . '/' . $newImage;
            if (is_file($createdPhoto)) {
                unlink($createdPhoto);
            }
        }
        throw $exception;
    }
    if (($current['profileImageUrl'] ?? null) !== $image) {
        $previousImage = $current['profileImageUrl'] ?? null;
        if (is_string($previousImage) && preg_match('#^assets/uploads/profiles/[a-zA-Z0-9.-]+\.(jpg|png|webp)$#', $previousImage)) {
            $previousPhoto = dirname(__DIR__, 2) . '/' . $previousImage;
            if (is_file($previousPhoto)) {
                unlink($previousPhoto);
            }
        }
    }
    $_SESSION['sfc_user'] = sfc_user_session_payload($updated);
    if ($profile !== null) { $profile['emailStatus'] = $container['brokerEmail']->status($userId); }
    return ['user' => $_SESSION['sfc_user'], 'brokerProfile' => $profile];
}
