<?php
declare(strict_types=1);

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/auth-validation.php';

/** Environment values override the server's private configuration. */
function sfc_city_staff_setting(string $environmentVariable, string $configKey): mixed
{
    $environment = getenv($environmentVariable);
    if ($environment !== false) {
        return $environment;
    }
    return sfc_security_config()['security']['city_staff'][$configKey] ?? null;
}

function sfc_city_staff_configured_passkey(): string
{
    return sfc_auth_string(sfc_city_staff_setting('SFC_CITY_STAFF_PASSKEY', 'passkey'));
}

function sfc_city_staff_authorized_email_policy(): array
{
    $list = static function (mixed $value): array {
        $values = is_array($value) ? $value : explode(',', sfc_auth_string($value));
        return array_values(array_unique(array_filter(array_map(
            static fn (mixed $item): string => strtolower(sfc_auth_string($item)),
            $values
        ))));
    };
    return [
        'emails' => $list(sfc_city_staff_setting('SFC_CITY_STAFF_EMAILS', 'authorized_emails')),
        'domains' => $list(sfc_city_staff_setting('SFC_CITY_STAFF_EMAIL_DOMAINS', 'authorized_email_domains')),
    ];
}

function sfc_city_staff_official_email_valid(string $email): bool
{
    $email = strtolower(trim($email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
        return false;
    }
    $policy = sfc_city_staff_authorized_email_policy();
    if (in_array($email, $policy['emails'], true)) {
        return true;
    }
    $domain = substr($email, (int) strrpos($email, '@') + 1);
    if (in_array($domain, $policy['domains'], true)) {
        return true;
    }
    // Demo identities are accepted only on a loopback development request, and
    // an explicit allowlist replaces this default just like the configured key.
    return $policy['emails'] === [] && $policy['domains'] === []
        && sfc_security_is_local() && $domain === 'sfcelerate.local';
}

/** Invalid expiry settings fail closed; date-only values last through that day. */
function sfc_city_staff_passkey_unexpired(): bool
{
    $configuredExpiry = sfc_city_staff_setting('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT', 'passkey_expires_at');
    if ($configuredExpiry !== null && !is_string($configuredExpiry)) {
        return false;
    }
    $expiry = sfc_auth_string($configuredExpiry);
    if ($expiry === '') {
        return true;
    }
    try {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/D', $expiry)) {
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', $expiry, new DateTimeZone('Asia/Manila'));
            if ($date === false || $date->format('Y-m-d') !== $expiry) {
                return false;
            }
            return $date->setTime(23, 59, 59)->getTimestamp() >= time();
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/D', $expiry)) {
            return false;
        }
        $date = new DateTimeImmutable($expiry);
        $errors = DateTimeImmutable::getLastErrors();
        return ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0))
            && $date->getTimestamp() > time();
    } catch (Exception) {
        return false;
    }
}

function sfc_city_staff_onboarding_enabled(): bool
{
    $policy = sfc_city_staff_authorized_email_policy();
    return (sfc_city_staff_configured_passkey() !== '' || sfc_security_is_local())
        && ($policy['emails'] !== [] || $policy['domains'] !== [] || sfc_security_is_local());
}

function sfc_city_staff_passkey_valid(string $submitted): bool
{
    $submitted = trim($submitted);
    if ($submitted === '' || !sfc_city_staff_passkey_unexpired()) {
        return false;
    }
    $configured = sfc_city_staff_configured_passkey();
    if ($configured !== '') {
        return hash_equals($configured, $submitted);
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

function sfc_city_staff_department(string $submitted): ?string
{
    return match (strtoupper(trim($submitted))) {
        'CICTO' => 'CICTO',
        'ASSESSOR', 'CITY ASSESSOR' => 'ASSESSOR',
        'LEBDO' => 'LEBDO',
        default => null,
    };
}

/** Validate every field before attempting to create a privileged account. */
function sfc_city_staff_activation_field_errors(array $payload): array
{
    $errors = sfc_registration_field_errors($payload, 'admin');
    foreach (['password', 'confirm_password'] as $field) {
        if (!is_string($payload[$field] ?? null)) {
            $errors[$field] = 'This field is required.';
        }
    }
    $department = sfc_auth_string($payload['department'] ?? '');
    if ($department === '') {
        $errors['department'] = 'This field is required.';
    } elseif (sfc_city_staff_department($department) === null) {
        $errors['department'] = 'Choose CICTO, City Assessor, or LEBDO.';
    }
    $email = sfc_auth_string($payload['email'] ?? '');
    if (!isset($errors['email']) && !sfc_city_staff_official_email_valid($email)) {
        $errors['email'] = 'Use an authorized official email address.';
    }
    $passkey = sfc_auth_string($payload['city_passkey'] ?? '');
    if ($passkey === '') {
        $errors['city_passkey'] = 'This field is required.';
    } elseif (!sfc_city_staff_passkey_valid($passkey)) {
        $errors['city_passkey'] = 'Invalid or expired city passkey.';
    }
    return $errors;
}

function sfc_activate_city_staff(array $payload): array
{
    require_once __DIR__ . '/auth.php';
    require_once __DIR__ . '/RequestRateLimiter.php';
    sfc_start_session();
    sfc_require_csrf_form();
    $rateLimitDirectory = (string) (sfc_security_config()['security']['rate_limit_path'] ?? '');
    $limiter = new App\Support\RequestRateLimiter($rateLimitDirectory);
    if (!$limiter->consume('city-staff-activation:' . (string) ($_SERVER['REMOTE_ADDR'] ?? 'cli'), 12, 900)) {
        throw new SfcAuthValidationException(['city_passkey' => 'Too many activation attempts. Try again in 15 minutes.']);
    }
    $errors = sfc_city_staff_activation_field_errors($payload);
    if ($errors !== []) {
        throw new SfcAuthValidationException($errors);
    }
    $email = strtolower(sfc_auth_string($payload['email'] ?? ''));
    if (sfc_user_repository()->findByEmail($email) !== null) {
        $errors['email'] = 'An account with this email already exists. Sign in instead.';
    }
    if ($errors !== []) {
        throw new SfcAuthValidationException($errors);
    }
    // Privileged activation always requires both authorization checks, even for
    // non-browser callers. Invalid configuration never falls back in production.
    if (!sfc_city_staff_onboarding_enabled()) {
        throw new SfcAuthValidationException(['city_passkey' => 'Invalid or expired city passkey.']);
    }
    $firstName = sfc_auth_string($payload['first_name']);
    $lastName = sfc_auth_string($payload['last_name']);
    $user = sfc_user_repository()->create(
        'admin', $firstName . ' ' . $lastName, $email, $payload['password'],
        sfc_city_staff_department(sfc_auth_string($payload['department'])),
        sfc_account_privacy_payload($payload['privacy_consent'] ?? false)
            + ['firstName' => $firstName, 'lastName' => $lastName]
    );
    sfc_user_repository()->touchActivity((int) $user['id'], true);
    session_regenerate_id(true);
    unset($_SESSION['sfc_csrf_token']);
    $_SESSION['sfc_user'] = sfc_user_session_payload($user);
    $_SESSION['sfc_authenticated_at'] = time();
    $_SESSION['sfc_last_activity_at'] = time();
    $_SESSION['sfc_last_db_touch_at'] = time();
    $_SESSION['sfc_welcome_mode'] = 'new';
    sfc_csrf_token();
    return $user;
}
