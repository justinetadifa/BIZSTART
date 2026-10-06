<?php
declare(strict_types=1);

require_once __DIR__ . '/security.php';

function sfc_city_staff_configured_passkey(): string
{
    $configured = getenv('SFC_CITY_STAFF_PASSKEY');
    return $configured === false ? '' : trim($configured);
}

function sfc_city_staff_onboarding_enabled(): bool
{
    return sfc_city_staff_configured_passkey() !== '' || sfc_security_is_local();
}

function sfc_city_staff_passkey_valid(string $submitted): bool
{
    $submitted = trim($submitted);
    $configured = sfc_city_staff_configured_passkey();
    if ($configured !== '') {
        return $submitted !== '' && hash_equals($configured, $submitted);
    }
    if (!sfc_security_is_local() || $submitted === '') {
        return false;
    }

    // Demo access is available only on an explicitly local, loopback request.
    $submitted = strtoupper($submitted);
    foreach (['SFC-STAFF-2026', 'SFC-ADMIN-2026', 'SFC-CICTO-2026', 'SFC-CAO-2026', 'SFC-ASSESSOR-2026', 'SFC-LEBDO-2026'] as $demo) {
        if (hash_equals($demo, $submitted)) {
            return true;
        }
    }
    return false;
}
