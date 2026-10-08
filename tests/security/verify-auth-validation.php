<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__, 2) . '/app/Support/auth.php';

$checks = 0;
function validation_check(bool $passed, string $message): void
{
    global $checks;
    if (!$passed) { throw new RuntimeException($message); }
    $checks++;
}

$today = (new DateTimeImmutable('now', new DateTimeZone('Asia/Manila')))->format('Y-m-d');
$investor = [
    'first_name' => 'Ada', 'last_name' => 'Rivera', 'email' => 'ada@example.test',
    'password' => 'Strong123!', 'confirm_password' => 'Strong123!',
    'privacy_consent' => '1', 'adult_confirmation' => '1',
];
$broker = $investor + [
    'phone' => '09171234567', 'address_line' => '10 City Avenue', 'city' => 'San Fernando',
    'prc_registration_no' => '00123456', 'prc_valid_until' => $today,
];
validation_check(sfc_registration_field_errors($investor, 'investor') === [], 'Optional investor details became required.');
validation_check(sfc_registration_field_errors($broker, 'seller') === [], 'A license valid today was rejected.');
foreach (['first_name', 'last_name', 'email', 'password', 'confirm_password'] as $field) {
    $errors = sfc_registration_field_errors(array_replace($investor, [$field => '']), 'investor');
    validation_check(($errors[$field] ?? '') === 'This field is required.', 'Missing investor field was not identified: ' . $field);
}
foreach (['phone', 'address_line', 'city', 'prc_registration_no', 'prc_valid_until'] as $field) {
    $errors = sfc_registration_field_errors(array_replace($broker, [$field => '']), 'seller');
    validation_check(($errors[$field] ?? '') === 'This field is required.', 'Missing broker field was not identified: ' . $field);
}
$invalid = [
    'email' => 'not-an-email', 'password' => 'short', 'confirm_password' => 'different',
    'privacy_consent' => false, 'adult_confirmation' => false, 'phone' => 'not a number',
];
$errors = sfc_registration_field_errors(array_replace($investor, $invalid), 'investor');
validation_check(count($errors) === 6, 'Invalid registration did not aggregate affected fields.');
validation_check($errors['email'] === 'Enter a valid email address.', 'Invalid email wording changed.');
validation_check($errors['password'] === 'Password must be at least 8 characters.', 'Password minimum was not enforced.');
validation_check($errors['confirm_password'] === 'Passwords do not match.', 'Password mismatch wording changed.');
foreach ([false, null, '', '0', 'false', [], ['1']] as $consent) {
    $errors = sfc_registration_field_errors(array_replace($investor, ['privacy_consent' => $consent, 'adult_confirmation' => $consent]), 'investor');
    validation_check(isset($errors['privacy_consent'], $errors['adult_confirmation']), 'Malformed or missing affirmative consent was accepted.');
}
foreach ([12345678, [], null, true] as $password) {
    $errors = sfc_registration_field_errors(array_replace($investor, ['password' => $password, 'confirm_password' => $password]), 'investor');
    validation_check(isset($errors['password'], $errors['confirm_password']), 'A non-string password bypassed validation.');
}
foreach (['2020-01-01', '2030-02-30', '2030-13-01', '2030-01-01' . "\0" . 'x'] as $date) {
    $errors = sfc_registration_field_errors(array_replace($broker, ['prc_valid_until' => $date]), 'seller');
    validation_check(isset($errors['prc_valid_until']), 'Expired or malformed calendar date was accepted.');
}
validation_check(sfc_registration_field_errors(array_replace($broker, ['prc_valid_until' => '2020-01-01']), 'seller')['prc_valid_until'] === 'PRC registration has expired.', 'Expired-license message changed.');
foreach (['abc', '-123', str_repeat('1', 21)] as $prc) {
    validation_check(isset(sfc_registration_field_errors(array_replace($broker, ['prc_registration_no' => $prc]), 'seller')['prc_registration_no']), 'Invalid PRC format was accepted.');
}
validation_check(sfc_normalize_prc_number(' 00123456 ') === '123456', 'Zero padding bypasses PRC normalization.');
validation_check(sfc_normalize_prc_number('000') === '0', 'All-zero PRC normalization is inconsistent.');
validation_check(isset(sfc_registration_field_errors(array_replace($investor, ['password' => str_repeat('a', 73), 'confirm_password' => str_repeat('a', 73)]), 'investor')['password']), 'Bcrypt truncation limit was not enforced.');
validation_check(isset(sfc_registration_field_errors(array_replace($investor, ['password' => "abcdefgh\0x", 'confirm_password' => "abcdefgh\0x"]), 'investor')['password']), 'Null byte could reach password hashing.');
validation_check(isset(sfc_registration_field_errors(array_replace($broker, ['phone' => '+(  ) .--']), 'seller')['phone']), 'A contact number with no digits was accepted.');
foreach (['first_name' => 70, 'last_name' => 70, 'profession' => 120, 'city' => 120, 'address_line' => 255, 'company_name' => 190] as $field => $length) {
    validation_check(isset(sfc_registration_field_errors(array_replace($broker, [$field => str_repeat('x', $length + 1)]), 'seller')[$field]), 'Storage length limit was not validated: ' . $field);
}
$empty = sfc_registration_field_errors([], 'seller');
validation_check(count($empty) === 11, 'Empty broker form does not expose all required field errors.');
$exception = new SfcAuthValidationException($empty);
validation_check($exception instanceof InvalidArgumentException && $exception->errors() === $empty, 'Form exception contract is incompatible.');
validation_check(!sfc_account_can_authenticate(['role' => 'admin', 'identityVerificationStatus' => 'pending']), 'Unactivated staff may authenticate.');
validation_check(sfc_account_can_authenticate(['role' => 'seller', 'identityVerificationStatus' => 'pending']), 'Pending brokers may not view their status.');
foreach (['suspended', 'disabled', 'inactive', 'unactivated', 'pending', 'unknown'] as $status) {
    validation_check(!sfc_account_can_authenticate(['role' => 'investor', 'accountStatus' => $status]), 'Inactive account status was accepted: ' . $status);
}

if (in_array('--integration', $argv, true)) {
    // Every fixture is rolled back, including identity/consent evidence.
    $container = require dirname(__DIR__, 2) . '/app/bootstrap.php';
    $pdo = $container['pdo'];
    $suffix = bin2hex(random_bytes(8));
    $pdo->beginTransaction();
    try {
        $profile = sfc_account_privacy_payload(true) + [
            'firstName' => 'Ada', 'lastName' => 'Rivera', 'phone' => '09171234567',
            'profession' => 'Architect', 'city' => 'San Fernando', 'adultConfirmedAt' => gmdate('Y-m-d H:i:s'),
        ];
        $created = $container['users']->create('investor', 'Ada Rivera', 'auth-validation-' . $suffix . '@example.test', 'Strong123!', null, $profile);
        validation_check($created['firstName'] === 'Ada' && $created['lastName'] === 'Rivera' && $created['profession'] === 'Architect' && $created['city'] === 'San Fernando', 'Registration details were not persisted.');
        validation_check(!empty($created['adultConfirmedAt']) && !empty($created['privacyConsentAt']), 'Registration consent evidence was not persisted.');
        try {
            $container['users']->create('seller', 'Duplicate Email', strtoupper($created['email']), 'Strong123!');
            throw new RuntimeException('A cross-role duplicate email was accepted.');
        } catch (SfcAuthValidationException $exception) {
            validation_check(isset($exception->errors()['email']), 'Cross-role duplicate email is not field-specific.');
        }
        $numeric = (string) random_int(100000000, 999999999);
        $first = $container['users']->create('seller', 'First Broker', 'auth-first-' . $suffix . '@example.test', 'Strong123!');
        $second = $container['users']->create('seller', 'Second Broker', 'auth-second-' . $suffix . '@example.test', 'Strong123!');
        $third = $container['users']->create('seller', 'No License', 'auth-third-' . $suffix . '@example.test', 'Strong123!');
        $insert = $pdo->prepare('INSERT INTO seller_profiles (user_id, seller_type, prc_registration_no) VALUES (:user_id, :seller_type, :prc)');
        $insert->execute(['user_id' => $first['id'], 'seller_type' => 'broker', 'prc' => '000' . $numeric]);
        $insert->execute(['user_id' => $third['id'], 'seller_type' => 'broker', 'prc' => null]);
        $canonical = $pdo->prepare('SELECT prc_canonical_no FROM seller_profiles WHERE user_id = :id');
        $canonical->execute(['id' => $first['id']]);
        validation_check($canonical->fetchColumn() === $numeric, 'Database PRC normalization differs from application normalization.');
        $canonical->execute(['id' => $third['id']]);
        validation_check($canonical->fetchColumn() === null, 'An absent PRC identifier became an all-zero registration.');
        $duplicateErrors = $container['sellerProfiles']->registrationDuplicateErrors(['prc_registration_no' => $numeric]);
        validation_check(($duplicateErrors['prc_registration_no'] ?? '') === 'This PRC registration number is already associated with another account.', 'Padded legacy PRC duplicate was not detected.');
        validation_check(!isset($container['sellerProfiles']->registrationDuplicateErrors(['prc_registration_no' => '0'])['prc_registration_no']), 'An account without PRC collided with an all-zero number.');
        try {
            // Bypass the pre-check to simulate two requests reaching the write together.
            $insert->execute(['user_id' => $second['id'], 'seller_type' => 'broker', 'prc' => $numeric]);
            throw new RuntimeException('The canonical unique PRC index allowed a concurrent duplicate.');
        } catch (PDOException $exception) {
            validation_check((int) ($exception->errorInfo[1] ?? 0) === 1062 && str_contains($exception->getMessage(), 'uniq_seller_profiles_prc_canonical'), 'PRC uniqueness was not enforced by the canonical index.');
        }
        $executor = new ReflectionMethod($container['sellerProfiles'], 'executeProfileStatement');
        $executor->setAccessible(true);
        try {
            $executor->invoke($container['sellerProfiles'], $insert, ['user_id' => $second['id'], 'seller_type' => 'broker', 'prc' => $numeric]);
            throw new RuntimeException('A concurrent PRC insert passed the repository write guard.');
        } catch (SfcAuthValidationException $exception) {
            validation_check(($exception->errors()['prc_registration_no'] ?? '') === 'This PRC registration number is already associated with another account.', 'Concurrent canonical PRC conflict leaked database internals.');
        }
        $brokerPayload = array_replace($broker, ['seller_type' => 'broker', 'prc_registration_no' => $numeric, 'phone' => '09' . (string) random_int(100000000, 999999999), 'authorization_basis' => 'Licensed real estate broker']);
        try {
            $container['sellerProfiles']->createOrUpdateForUser($second['id'], $brokerPayload, true);
            throw new RuntimeException('Broker repository accepted a duplicate PRC.');
        } catch (SfcAuthValidationException $exception) {
            validation_check(isset($exception->errors()['prc_registration_no']), 'Broker duplicate leaked database internals.');
        }
        $preserved = $pdo->prepare('SELECT prc_registration_no FROM seller_profiles WHERE user_id = :id');
        $preserved->execute(['id' => $first['id']]);
        validation_check($preserved->fetchColumn() === '000' . $numeric, 'Canonical uniqueness overwrote the displayed PRC credential.');
    } finally {
        if ($pdo->inTransaction()) { $pdo->rollBack(); }
    }
}
echo sprintf("PASS: %d authentication validation checks%s.\n", $checks, in_array('--integration', $argv, true) ? ' including rolled-back database fixtures' : ' without database writes');
