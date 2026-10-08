<?php
declare(strict_types=1);

// Verify the real passkey policy without connecting to a database or creating accounts.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/app/Support/staff-onboarding.php';

$originalServer = $_SERVER;
$originalEnvironment = getenv('APP_ENV');
$originalPasskey = getenv('SFC_CITY_STAFF_PASSKEY');
$policyVariables = ['SFC_CITY_STAFF_EMAILS', 'SFC_CITY_STAFF_EMAIL_DOMAINS', 'SFC_CITY_STAFF_PASSKEY_EXPIRES_AT'];
$originalPolicy = array_combine($policyVariables, array_map('getenv', $policyVariables));
$checks = 0;
$demoKeys = ['SFC-STAFF-2026', 'SFC-ADMIN-2026', 'SFC-CICTO-2026', 'SFC-CAO-2026', 'SFC-ASSESSOR-2026', 'SFC-LEBDO-2026'];

function staff_policy_check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $GLOBALS['checks']++;
}

function staff_policy_request(string $environment, bool $local = true): void
{
    putenv('APP_ENV=' . $environment);
    $_SERVER = $local
        ? ['HTTP_HOST' => 'localhost', 'SERVER_ADDR' => '127.0.0.1', 'REMOTE_ADDR' => '127.0.0.1']
        : ['HTTP_HOST' => 'city.example', 'SERVER_ADDR' => '192.0.2.10', 'REMOTE_ADDR' => '192.0.2.20'];
}

try {
    putenv('SFC_CITY_STAFF_PASSKEY');
    foreach ($policyVariables as $variable) {
        putenv($variable . '=');
    }
    staff_policy_request('local');
    staff_policy_check(sfc_city_staff_onboarding_enabled(), 'Local demo activation is unavailable.');
    foreach ($demoKeys as $key) {
        staff_policy_check(sfc_city_staff_passkey_valid($key), 'A supported local demo key was rejected.');
    }
    staff_policy_check(!sfc_city_staff_passkey_valid('') && !sfc_city_staff_passkey_valid('wrong'), 'An empty or invalid local passkey was accepted.');
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=2000-01-01');
    staff_policy_check(!sfc_city_staff_passkey_valid($demoKeys[0]), 'Local demo access bypassed an explicitly configured expiry.');
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=malformed-expiry');
    staff_policy_check(!sfc_city_staff_passkey_valid($demoKeys[0]), 'Local demo access bypassed malformed expiry configuration.');
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=');
    staff_policy_check(sfc_city_staff_official_email_valid('officer@sfcelerate.local'), 'Local demo official email was rejected.');
    staff_policy_check(!sfc_city_staff_official_email_valid('officer@gmail.com'), 'An arbitrary personal email was accepted for local staff activation.');

    $secret = 'MixedCase-' . bin2hex(random_bytes(16));
    putenv('SFC_CITY_STAFF_PASSKEY=' . $secret);
    staff_policy_check(sfc_city_staff_passkey_valid($secret), 'A configured local passkey was rejected.');
    foreach ($demoKeys as $key) {
        staff_policy_check(!sfc_city_staff_passkey_valid($key), 'A configured passkey did not replace local demo access.');
    }
    staff_policy_check(!sfc_city_staff_passkey_valid(strtolower($secret)), 'Configured passkey matching ignored case.');
    staff_policy_check(sfc_city_staff_passkey_valid(' ' . $secret . ' '), 'Surrounding input whitespace was not handled.');

    staff_policy_request('production', false);
    staff_policy_check(!sfc_city_staff_onboarding_enabled(), 'A production passkey enabled activation without an email allowlist.');
    staff_policy_check(!sfc_city_staff_official_email_valid('officer@sfcelerate.local'), 'A production request accepted a local demo email.');
    putenv('SFC_CITY_STAFF_EMAIL_DOMAINS=staff.example.gov');
    staff_policy_check(sfc_city_staff_onboarding_enabled() && sfc_city_staff_passkey_valid($secret), 'Configured production activation failed.');
    staff_policy_check(sfc_city_staff_official_email_valid('Officer@STAFF.EXAMPLE.GOV'), 'An authorized official domain was rejected or matched with incorrect case.');
    staff_policy_check(!sfc_city_staff_official_email_valid('officer@staff.example.gov.attacker.test'), 'A lookalike domain bypassed the official email policy.');
    staff_policy_check(!sfc_city_staff_official_email_valid('officer@sub.staff.example.gov'), 'An unlisted subdomain bypassed the official email policy.');
    staff_policy_check(!sfc_city_staff_official_email_valid('invalid@'), 'A malformed official email was accepted.');
    putenv('SFC_CITY_STAFF_EMAILS=named.officer@other.example.gov');
    staff_policy_check(sfc_city_staff_official_email_valid('Named.Officer@OTHER.EXAMPLE.GOV'), 'An explicitly authorized email was rejected.');
    staff_policy_check(!sfc_city_staff_official_email_valid('another.officer@other.example.gov'), 'An unlisted official address bypassed a per-email authorization rule.');
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=' . gmdate('Y-m-d\TH:i:s\Z', time() + 3600));
    staff_policy_check(sfc_city_staff_passkey_valid($secret), 'A configured passkey with a future expiry was rejected.');
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=' . gmdate('Y-m-d\TH:i:s\Z', time() - 60));
    staff_policy_check(!sfc_city_staff_passkey_valid($secret), 'An expired configured passkey was accepted.');
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=2030-02-30T12:00:00+08:00');
    staff_policy_check(!sfc_city_staff_passkey_valid($secret), 'A passkey with an invalid calendar expiry was accepted.');
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=tomorrow');
    staff_policy_check(!sfc_city_staff_passkey_valid($secret), 'A passkey with an ambiguous expiry setting was accepted.');
    foreach (['2030-01-01T24:00:00Z', '2030-01-01T10:00:00+99:99', '2030-01-01T10:00:00+14:30'] as $invalidExpiry) {
        putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=' . $invalidExpiry);
        staff_policy_check(!sfc_city_staff_passkey_valid($secret), 'An expiry with an invalid clock time or UTC offset was accepted.');
    }
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=' . (new DateTimeImmutable('today', new DateTimeZone('Asia/Manila')))->format('Y-m-d'));
    staff_policy_check(sfc_city_staff_passkey_valid($secret), 'A date-only passkey expired before the end of its specified day.');
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=' . (new DateTimeImmutable('yesterday', new DateTimeZone('Asia/Manila')))->format('Y-m-d'));
    staff_policy_check(!sfc_city_staff_passkey_valid($secret), 'An expired date-only passkey was accepted.');
    putenv('SFC_CITY_STAFF_PASSKEY_EXPIRES_AT=');
    foreach ($demoKeys as $key) {
        staff_policy_check(!sfc_city_staff_passkey_valid($key), 'A production request accepted a demo passkey.');
    }
    putenv('SFC_CITY_STAFF_PASSKEY');
    staff_policy_check(!sfc_city_staff_onboarding_enabled(), 'Production activation was enabled without a configured passkey.');
    foreach ($demoKeys as $key) {
        staff_policy_check(!sfc_city_staff_passkey_valid($key), 'Production without a secret accepted a demo key.');
    }

    staff_policy_request('local', false);
    staff_policy_check(!sfc_city_staff_onboarding_enabled() && !sfc_city_staff_passkey_valid($demoKeys[0]), 'APP_ENV=local allowed a remote request to use demo access.');
    staff_policy_request('local');
    $_SERVER['REMOTE_ADDR'] = '192.0.2.20';
    staff_policy_check(!sfc_city_staff_onboarding_enabled(), 'A loopback hostname with a remote client enabled demo access.');
    staff_policy_request('production');
    staff_policy_check(!sfc_city_staff_onboarding_enabled() && !sfc_city_staff_passkey_valid($demoKeys[0]), 'A production loopback request enabled demo access.');

    staff_policy_request('local');
    putenv('SFC_CITY_STAFF_PASSKEY=' . $secret);
    putenv('SFC_CITY_STAFF_EMAILS=');
    staff_policy_check(!sfc_city_staff_official_email_valid('officer@sfcelerate.local'), 'An explicit email domain policy did not replace local demo authorization.');
    $payload = [
        'department' => 'CICTO', 'first_name' => 'Sample', 'last_name' => 'Officer',
        'email' => 'officer@staff.example.gov', 'password' => 'CorrectExample123!',
        'confirm_password' => 'CorrectExample123!', 'city_passkey' => $secret,
        'privacy_consent' => '1',
    ];
    staff_policy_check(sfc_city_staff_activation_field_errors($payload) === [], 'A complete authorized staff activation was rejected.');
    foreach (['CICTO', 'ASSESSOR', 'City Assessor', 'LEBDO'] as $department) {
        staff_policy_check(sfc_city_staff_activation_field_errors(array_replace($payload, ['department' => $department])) === [], 'An authorized city department was rejected.');
    }
    foreach (['department', 'first_name', 'last_name', 'email', 'password', 'confirm_password', 'city_passkey'] as $field) {
        $errors = sfc_city_staff_activation_field_errors(array_replace($payload, [$field => '']));
        staff_policy_check(($errors[$field] ?? '') === 'This field is required.', 'A required activation field lacked its own error: ' . $field);
    }
    $invalidFields = [
        'department' => 'Unrecognized office', 'email' => 'not-an-email',
        'password' => 'short', 'confirm_password' => 'different',
        'city_passkey' => 'invalid-key', 'privacy_consent' => '0',
    ];
    $errors = sfc_city_staff_activation_field_errors(array_replace($payload, $invalidFields));
    staff_policy_check(count(array_intersect(array_keys($invalidFields), array_keys($errors))) === count($invalidFields), 'Activation did not report all invalid fields together.');
    staff_policy_check($errors['email'] === 'Enter a valid email address.' && $errors['confirm_password'] === 'Passwords do not match.' && $errors['city_passkey'] === 'Invalid or expired city passkey.', 'Activation errors do not match the public field-message contract.');
    $errors = sfc_city_staff_activation_field_errors(array_replace($payload, ['email' => 'personal@gmail.com']));
    staff_policy_check(($errors['email'] ?? '') === 'Use an authorized official email address.', 'A valid but unauthorized email lacked its own activation error.');
    $errors = sfc_city_staff_activation_field_errors(array_replace($payload, ['city_passkey' => [$secret], 'department' => ['CICTO']]));
    staff_policy_check(isset($errors['city_passkey'], $errors['department']), 'Non-scalar activation inputs bypassed validation.');
    foreach ([123456789, [], new stdClass(), false, null] as $invalidType) {
        $errors = sfc_city_staff_activation_field_errors(array_replace($payload, ['password' => $invalidType, 'confirm_password' => $invalidType]));
        staff_policy_check(isset($errors['password'], $errors['confirm_password']), 'Unknown password input types reached the privileged account creation service.');
    }

    echo 'PASS: ' . $checks . " staff onboarding policy checks; official email authorization, passkey expiry, field validation, and local-only defaults verified without database writes.\n";
} finally {
    $_SERVER = $originalServer;
    putenv($originalEnvironment === false ? 'APP_ENV' : 'APP_ENV=' . $originalEnvironment);
    putenv($originalPasskey === false ? 'SFC_CITY_STAFF_PASSKEY' : 'SFC_CITY_STAFF_PASSKEY=' . $originalPasskey);
    foreach ($originalPolicy as $variable => $value) {
        putenv($value === false ? $variable : $variable . '=' . $value);
    }
}
