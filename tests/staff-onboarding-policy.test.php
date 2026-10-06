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
    staff_policy_request('local');
    staff_policy_check(sfc_city_staff_onboarding_enabled(), 'Local demo activation is unavailable.');
    foreach ($demoKeys as $key) {
        staff_policy_check(sfc_city_staff_passkey_valid($key), 'A supported local demo key was rejected.');
    }
    staff_policy_check(!sfc_city_staff_passkey_valid('') && !sfc_city_staff_passkey_valid('wrong'), 'An empty or invalid local passkey was accepted.');

    $secret = 'MixedCase-' . bin2hex(random_bytes(16));
    putenv('SFC_CITY_STAFF_PASSKEY=' . $secret);
    staff_policy_check(sfc_city_staff_passkey_valid($secret), 'A configured local passkey was rejected.');
    foreach ($demoKeys as $key) {
        staff_policy_check(!sfc_city_staff_passkey_valid($key), 'A configured passkey did not replace local demo access.');
    }
    staff_policy_check(!sfc_city_staff_passkey_valid(strtolower($secret)), 'Configured passkey matching ignored case.');
    staff_policy_check(sfc_city_staff_passkey_valid(' ' . $secret . ' '), 'Surrounding input whitespace was not handled.');

    staff_policy_request('production', false);
    staff_policy_check(sfc_city_staff_onboarding_enabled() && sfc_city_staff_passkey_valid($secret), 'Configured production activation failed.');
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

    echo 'PASS: ' . $checks . " staff onboarding policy checks; configured secrets override demos, and public defaults are blocked outside local development.\n";
} finally {
    $_SERVER = $originalServer;
    putenv($originalEnvironment === false ? 'APP_ENV' : 'APP_ENV=' . $originalEnvironment);
    putenv($originalPasskey === false ? 'SFC_CITY_STAFF_PASSKEY' : 'SFC_CITY_STAFF_PASSKEY=' . $originalPasskey);
}
