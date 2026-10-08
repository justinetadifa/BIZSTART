<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Repositories/SellerProfileRepository.php';
require_once dirname(__DIR__) . '/app/Support/profile.php';

function account_check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $GLOBALS['account_checks'] = ($GLOBALS['account_checks'] ?? 0) + 1;
}

function account_rejects(callable $action, string $message): void
{
    try {
        $action();
    } catch (InvalidArgumentException) {
        account_check(true, $message);
        return;
    }
    throw new RuntimeException($message);
}

final class AccountTestPdo extends PDO { public function __construct() {} }
$repository = new App\Repositories\SellerProfileRepository(new AccountTestPdo());
$validUntil = (new DateTimeImmutable('tomorrow'))->format('Y-m-d');
$payload = [
    'seller_type' => 'broker', 'legal_name' => 'Sample Broker', 'phone' => '09171234567',
    'address_line' => 'San Fernando, La Union', 'city' => 'San Fernando',
    'authorization_basis' => 'Licensed real estate broker',
    'prc_registration_no' => '123456', 'prc_valid_until' => $validUntil,
];
$user = ['name' => 'Sample Broker', 'identityVerificationStatus' => 'pending'];
$repository->validateRegistrationPayload($payload, $user);
account_check(true, 'A complete PRC submission was rejected.');
foreach (['prc_registration_no', 'prc_valid_until', 'phone', 'address_line'] as $missing) {
    account_rejects(fn () => $repository->validateRegistrationPayload(array_replace($payload, [$missing => '']), $user), 'Missing field accepted: ' . $missing);
}
account_rejects(fn () => $repository->validateRegistrationPayload(array_replace($payload, ['prc_registration_no' => 'fake']), $user), 'A nonnumeric PRC registration was accepted.');
account_rejects(fn () => $repository->validateRegistrationPayload(array_replace($payload, ['prc_valid_until' => '2020-01-01']), $user), 'An expired PRC ID was accepted.');
account_rejects(fn () => $repository->validateRegistrationPayload(array_replace($payload, ['prc_valid_until' => '2030-02-30']), $user), 'An invalid calendar date was accepted.');
account_rejects(fn () => $repository->validateRegistrationPayload(array_replace($payload, ['phone' => 'not a phone']), $user), 'An invalid phone was accepted.');
account_rejects(fn () => $repository->validateRegistrationPayload(array_replace($payload, ['legal_name' => str_repeat('a', 191)]), $user), 'Oversized identity data was accepted.');
foreach ([false, '0', null, 'false', ''] as $consent) {
    account_rejects(fn () => sfc_account_privacy_payload($consent), 'Consent was assumed without an affirmative choice.');
}
$consent = sfc_account_privacy_payload('1');
account_check($consent['privacyConsentText'] === sfc_privacy_consent_text() && $consent['privacyConsentVersion'] === sfc_privacy_consent_version() && $consent['privacyConsentAt'] !== '', 'Consent evidence is incomplete.');
foreach (['CICTO', 'ASSESSOR', 'LEBDO'] as $department) {
    $admin = ['role' => 'admin', 'department' => $department];
    account_check(sfc_can_manage_properties($admin), 'A city department cannot manage listings.');
    account_check(sfc_can_review_brokers($admin) === ($department === 'CICTO'), 'A department has incorrect broker review privileges.');
}
account_check(!sfc_can_review_brokers(['role' => 'seller', 'department' => 'CICTO']), 'A broker can review applications.');
account_check(!sfc_can_manage_properties(['role' => 'admin', 'department' => 'Unknown']), 'An unknown department can manage properties.');
$method = new ReflectionMethod($repository, 'normalizePayload');
$method->setAccessible(true);
$existing = ['sellerType' => 'broker', 'legalName' => 'Sample Broker', 'phone' => '09171234567', 'addressLine' => 'San Fernando, La Union', 'city' => 'San Fernando', 'authorizationBasis' => 'Licensed real estate broker', 'applicationStatus' => 'verified', 'prcRegistrationNo' => '123456', 'prcValidUntil' => $validUntil, 'reviewNotes' => 'Checked by CICTO'];
$edited = $method->invoke($repository, ['prc_registration_no' => '654321'], $user, $existing, false);
account_check($edited['application_status'] === 'pending_review' && $edited['reviewed_by_user_id'] === null, 'A broker kept verification after swapping PRC credentials.');
$formatted = $method->invoke($repository, ['prc_registration_no' => '00123456'], $user, $existing, false);
account_check($formatted['prc_registration_no'] === '00123456' && $formatted['application_status'] === 'verified', 'A license formatting edit changed its identity or lost the displayed zero padding.');
$unchanged = $method->invoke($repository, ['applicationStatus' => 'verified'], $user, array_replace($existing, ['applicationStatus' => 'pending_review']), false);
account_check($unchanged['application_status'] === 'pending_review', 'A broker can set their own verification or an unrelated profile edit removed them from the queue.');
account_rejects(fn () => $method->invoke($repository, $payload, $user, array_replace($existing, ['applicationStatus' => 'suspended']), true), 'A suspended broker could edit credentials.');
account_check(sfc_store_profile_photo(null) === null, 'Optional photo uploads are required.');
account_rejects(fn () => sfc_store_profile_photo(['error' => UPLOAD_ERR_OK, 'tmp_name' => __FILE__]), 'A local file bypassed the HTTP upload boundary.');
echo 'Account workflow checks passed (' . $GLOBALS['account_checks'] . " checks; no database writes).\n";
