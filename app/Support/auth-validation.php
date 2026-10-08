<?php
declare(strict_types=1);

/** Safe, field-specific messages for authentication forms. */
final class SfcAuthValidationException extends InvalidArgumentException
{
    public function __construct(private array $fieldErrors)
    {
        parent::__construct((string) (reset($fieldErrors) ?: 'Please check the highlighted fields.'));
    }

    public function errors(): array
    {
        return $this->fieldErrors;
    }
}

function sfc_auth_string(mixed $value): string
{
    return is_string($value) || is_numeric($value) ? trim((string) $value) : '';
}

function sfc_auth_consent(mixed $value): bool
{
    return is_scalar($value) && filter_var($value, FILTER_VALIDATE_BOOLEAN);
}

/** Canonical numeric identifiers prevent accounts differing only in zero padding. */
function sfc_normalize_prc_number(string $number): string
{
    $number = trim($number);
    return preg_match('/^[0-9]{1,20}$/', $number) === 1 ? (ltrim($number, '0') ?: '0') : $number;
}

/** Pure validation also lets non-browser callers enforce the same form contract. */
function sfc_registration_field_errors(array $payload, string $role): array
{
    $errors = [];
    $limits = ['first_name' => 70, 'last_name' => 70, 'city' => 120, 'profession' => 120, 'address_line' => 255, 'company_name' => 190];
    foreach (['first_name', 'last_name', 'email', 'password', 'confirm_password'] as $field) {
        if (sfc_auth_string($payload[$field] ?? '') === '' || (in_array($field, ['password', 'confirm_password'], true) && !is_string($payload[$field] ?? null))) {
            $errors[$field] = 'This field is required.';
        }
    }
    foreach ($limits as $field => $limit) {
        if (mb_strlen(sfc_auth_string($payload[$field] ?? '')) > $limit) {
            $errors[$field] = sprintf('Enter no more than %d characters.', $limit);
        }
    }
    if (mb_strlen(sfc_auth_string($payload['first_name'] ?? '') . ' ' . sfc_auth_string($payload['last_name'] ?? '')) > 140) {
        $errors['last_name'] = 'Your full name must be at most 140 characters.';
    }
    $email = sfc_auth_string($payload['email'] ?? '');
    if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190)) {
        $errors['email'] = 'Enter a valid email address.';
    }
    $password = is_string($payload['password'] ?? null) ? $payload['password'] : '';
    $confirmation = is_string($payload['confirm_password'] ?? null) ? $payload['confirm_password'] : '';
    if ($password !== '' && mb_strlen($password) < 8) {
        $errors['password'] = 'Password must be at least 8 characters.';
    } elseif (str_contains($password, "\0")) {
        $errors['password'] = 'Enter a valid password.';
    } elseif (strlen($password) > 72) {
        // PASSWORD_DEFAULT currently uses bcrypt, which silently truncates past 72 bytes.
        $errors['password'] = 'Password must be at most 72 bytes.';
    }
    if ($confirmation !== '' && $password !== $confirmation) {
        $errors['confirm_password'] = 'Passwords do not match.';
    }
    $phone = sfc_auth_string($payload['phone'] ?? '');
    if ($phone !== '' && (!preg_match('/^[+()0-9 .-]{7,30}$/', $phone) || preg_match_all('/[0-9]/', $phone) < 7)) {
        $errors['phone'] = 'Enter a valid contact number.';
    }
    if (!sfc_auth_consent($payload['privacy_consent'] ?? false)) {
        $errors['privacy_consent'] = 'Please agree to the Privacy Notice.';
    }
    if ($role === 'investor' && !sfc_auth_consent($payload['adult_confirmation'] ?? false)) {
        $errors['adult_confirmation'] = 'Please confirm that you are 18 years old or above.';
    }
    if ($role === 'seller') {
        foreach (['phone', 'address_line', 'city', 'prc_registration_no', 'prc_valid_until'] as $field) {
            if (sfc_auth_string($payload[$field] ?? '') === '') {
                $errors[$field] = 'This field is required.';
            }
        }
        $prc = sfc_auth_string($payload['prc_registration_no'] ?? '');
        if ($prc !== '' && preg_match('/^[0-9]{1,20}$/', $prc) !== 1) {
            $errors['prc_registration_no'] = 'Enter a valid PRC registration number.';
        }
        $validUntil = sfc_auth_string($payload['prc_valid_until'] ?? '');
        if ($validUntil !== '') {
            $date = preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/', $validUntil) === 1
                ? DateTimeImmutable::createFromFormat('!Y-m-d', $validUntil, new DateTimeZone('Asia/Manila')) : false;
            if ($date === false || $date->format('Y-m-d') !== $validUntil) {
                $errors['prc_valid_until'] = 'Enter a valid PRC validity date.';
            } elseif ($validUntil < (new DateTimeImmutable('now', new DateTimeZone('Asia/Manila')))->format('Y-m-d')) {
                $errors['prc_valid_until'] = 'PRC registration has expired.';
            }
        }
    }
    return $errors;
}
