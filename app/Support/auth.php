<?php
declare(strict_types=1);

use App\Repositories\UserRepository;
use App\Repositories\SellerProfileRepository;

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/auth-validation.php';

function sfc_start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        $secure = sfc_request_is_https();
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_samesite', 'Lax');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function sfc_csrf_token(): string
{
    sfc_start_session();
    $token = $_SESSION['sfc_csrf_token'] ?? null;
    if (!is_string($token) || strlen($token) < 32) {
        $token = bin2hex(random_bytes(32));
        $_SESSION['sfc_csrf_token'] = $token;
    }
    return $token;
}

function sfc_verify_csrf_token(mixed $token): bool
{
    $expected = sfc_csrf_token();
    return is_string($token) && $token !== '' && hash_equals($expected, $token);
}

function sfc_verify_csrf_request(): bool
{
    $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
    $body = $_POST['_csrf'] ?? null;
    return sfc_verify_csrf_token(is_string($header) && $header !== '' ? $header : $body);
}

function sfc_require_csrf_form(): void
{
    if (!sfc_verify_csrf_request()) {
        throw new InvalidArgumentException('Your security token expired. Refresh the page and try again.');
    }
}

function sfc_app_container(): array
{
    static $container = null;
    if ($container === null) {
        $globalContainer = $GLOBALS['container'] ?? null;
        if (is_array($globalContainer) && isset($globalContainer['users'])) {
            $container = $globalContainer;
        } else {
            $container = require dirname(__DIR__) . '/bootstrap.php';
        }
    }

    return $container;
}

function sfc_user_repository(): UserRepository
{
    return sfc_app_container()['users'];
}

function sfc_seller_profile_repository(): SellerProfileRepository
{
    return sfc_app_container()['sellerProfiles'];
}

function sfc_demo_credentials(): array
{
    return [
        'admin' => [
            'email' => 'admin@sfcelerate.local',
            'password' => 'Admin123!',
            'name' => 'SFC Admin (CICTO)',
        ],
        'assessor' => [
            'email' => 'assessor@sfcelerate.local',
            'password' => 'Admin123!',
            'name' => 'City Assessor',
        ],
        'lebdo' => [
            'email' => 'lebdo@sfcelerate.local',
            'password' => 'Admin123!',
            'name' => 'LEBDO Officer',
        ],
        'seller' => [
            'email' => 'seller@sfcelerate.local',
            'password' => 'Seller123!',
            'name' => 'Seller Studio',
        ],
        'investor' => [
            'email' => 'investor@sfcelerate.local',
            'password' => 'Investor123!',
            'name' => 'Investor Resident Hub',
        ],
    ];
}

function sfc_login(string $role, string $email, string $password): bool
{
    sfc_start_session();
    $email = strtolower(trim($email));
    $_SESSION['sfc_login_errors'] = [];
    if ($email === '') {
        $_SESSION['sfc_login_errors']['email'] = 'This field is required.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
        $_SESSION['sfc_login_errors']['email'] = 'Enter a valid email address.';
    }
    if (trim($password) === '') {
        $_SESSION['sfc_login_errors']['password'] = 'This field is required.';
    }
    if ($_SESSION['sfc_login_errors'] !== []) {
        return false;
    }
    require_once __DIR__ . '/RequestRateLimiter.php';
    $rateLimitDirectory = (string) (sfc_security_config()['security']['rate_limit_path'] ?? '');
    $limiter = new App\Support\RequestRateLimiter($rateLimitDirectory);
    if (!$limiter->consume('account-login:' . (string) ($_SERVER['REMOTE_ADDR'] ?? 'cli'), 30, 900)) {
        $_SESSION['sfc_login_errors']['email'] = 'Too many sign-in attempts. Try again in 15 minutes.';
        return false;
    }
    $user = sfc_user_repository()->findByEmail($email);
    // Perform password work for unknown emails too; never expose hashes or credential state.
    $hash = (string) ($user['passwordHash'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
    $passwordMatches = password_verify($password, $hash);
    if ($user === null) {
        $_SESSION['sfc_login_errors']['email'] = 'No account was found with this email.';
        return false;
    }
    if (!$passwordMatches) {
        $_SESSION['sfc_login_errors']['password'] = 'Incorrect password.';
        return false;
    }
    if ($user['role'] !== $role) {
        $_SESSION['sfc_login_errors']['email'] = 'Sign in through the correct account portal.';
        return false;
    }
    if (!sfc_account_can_authenticate($user)) {
        $_SESSION['sfc_login_errors']['account_status'] = sfc_account_access_message($user);
        return false;
    }

    session_regenerate_id(true);
    unset($_SESSION['sfc_csrf_token']);
    $_SESSION['sfc_user'] = sfc_user_session_payload($user);
    $_SESSION['sfc_authenticated_at'] = time();
    $_SESSION['sfc_last_activity_at'] = time();
    $_SESSION['sfc_last_db_touch_at'] = time();
    $_SESSION['sfc_welcome_mode'] = 'returning';
    sfc_user_repository()->touchActivity((int) $user['id'], true);
    sfc_csrf_token();
    return true;
}

function sfc_login_errors(): array
{
    sfc_start_session();
    return is_array($_SESSION['sfc_login_errors'] ?? null) ? $_SESSION['sfc_login_errors'] : [];
}

function sfc_uses_default_demo_password(array $user): bool
{
    if (sfc_security_is_local()) {
        return false;
    }

    $email = strtolower(trim((string) ($user['email'] ?? '')));
    $hash = (string) ($user['passwordHash'] ?? '');
    foreach (sfc_demo_credentials() as $credential) {
        if ($email === $credential['email'] && password_verify($credential['password'], $hash)) {
            return true;
        }
    }

    return $email === 'maria.santos@sfcelerate.local'
        && password_verify(sfc_demo_credentials()['investor']['password'], $hash);
}

function sfc_account_can_authenticate(array $user): bool
{
    $status = strtolower((string) ($user['accountStatus'] ?? 'active'));
    $identity = strtolower((string) ($user['identityVerificationStatus'] ?? 'unverified'));
    return $status === 'active'
        && !in_array($identity, ['suspended', 'disabled'], true)
        && (($user['role'] ?? '') !== 'admin' || $identity === 'verified')
        && !sfc_uses_default_demo_password($user);
}

function sfc_account_access_message(array $user): string
{
    $status = strtolower((string) ($user['accountStatus'] ?? 'active'));
    $identity = strtolower((string) ($user['identityVerificationStatus'] ?? 'unverified'));
    if ($status === 'suspended' || $identity === 'suspended') {
        return 'This account is suspended. Contact CICTO for assistance.';
    }
    if (in_array($status, ['disabled', 'inactive'], true) || $identity === 'disabled') {
        return 'This account is disabled. Contact CICTO for assistance.';
    }
    if (($user['role'] ?? '') === 'admin' && $identity !== 'verified') {
        return 'This City Staff account has not been activated. Contact CICTO for assistance.';
    }
    return 'This account cannot sign in. Contact CICTO for assistance.';
}

function sfc_privacy_consent_text(): string
{
    return 'By proceeding, I consent to the collection and processing of my personal and property data by the City Government of San Fernando in accordance with the Data Privacy Act of 2012 (RA 10173) for the purpose of the LOCUS-SF system.';
}

function sfc_privacy_consent_version(): string
{
    return '2026-10-06';
}

function sfc_account_privacy_payload(mixed $consent): array
{
    if (!sfc_auth_consent($consent)) {
        throw new SfcAuthValidationException(['privacy_consent' => 'Please agree to the Privacy Notice.']);
    }
    return [
        'privacyConsentAt' => gmdate('Y-m-d H:i:s'),
        'privacyConsentVersion' => sfc_privacy_consent_version(),
        'privacyConsentText' => sfc_privacy_consent_text(),
    ];
}

function sfc_registration_payload(array $payload): array
{
    // Retain full-name compatibility for existing service callers; the new forms
    // provide separate first and last names and are validated separately.
    if (!array_key_exists('first_name', $payload) && !array_key_exists('last_name', $payload)) {
        $parts = preg_split('/\s+/', sfc_auth_string($payload['name'] ?? ''), 2);
        $payload['first_name'] = $parts[0] ?? '';
        $payload['last_name'] = $parts[1] ?? '';
    }
    $payload['confirm_password'] ??= $payload['confirmPassword'] ?? '';
    $payload['privacy_consent'] ??= $payload['privacyConsent'] ?? false;
    $payload['adult_confirmation'] ??= $payload['adultConfirmation'] ?? false;
    $payload['address_line'] ??= $payload['address'] ?? '';
    foreach (['first_name', 'last_name', 'email', 'phone', 'address_line', 'city', 'profession', 'company_name', 'prc_registration_no', 'prc_valid_until'] as $field) {
        $payload[$field] = sfc_auth_string($payload[$field] ?? '');
    }
    $payload['email'] = strtolower($payload['email']);
    $payload['password'] = is_string($payload['password'] ?? null) ? $payload['password'] : '';
    $payload['confirm_password'] = is_string($payload['confirm_password'] ?? null) ? $payload['confirm_password'] : '';
    return $payload;
}

function sfc_registration_check_email(array $payload, array &$errors): void
{
    if (!isset($errors['email']) && sfc_user_repository()->findByEmail($payload['email']) !== null) {
        $errors['email'] = 'An account with this email already exists. Sign in instead.';
    }
}

function sfc_register_investor(string $name, string $email, string $password, string $confirmPassword, array $details = []): array
{
    sfc_start_session();
    $details = sfc_registration_payload(array_replace($details, ['name' => $name, 'email' => $email, 'password' => $password, 'confirm_password' => $confirmPassword]));
    $errors = sfc_registration_field_errors($details, 'investor');
    sfc_registration_check_email($details, $errors);
    if ($errors !== []) {
        throw new SfcAuthValidationException($errors);
    }
    $privacy = sfc_account_privacy_payload($details['privacy_consent']);
    $name = $details['first_name'] . ' ' . $details['last_name'];
    $user = sfc_user_repository()->create('investor', $name, $details['email'], $password, null, $privacy + [
        'firstName' => $details['first_name'], 'lastName' => $details['last_name'],
        'phone' => $details['phone'] ?: null, 'address' => $details['address_line'] ?: null,
        'profession' => $details['profession'] ?: null, 'city' => $details['city'] ?: null,
        'adultConfirmedAt' => gmdate('Y-m-d H:i:s'),
    ]);
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

function sfc_register_admin(string $name, string $email, string $password, string $confirmPassword, ?string $department = null): array
{
    sfc_start_session();

    // Administrative privileges can only be granted by an existing administrator.
    // Keep this check in the service so future callers cannot reopen public signup.
    if (!sfc_can_review_brokers()) {
        throw new InvalidArgumentException('Administrator accounts must be provisioned by an authorized administrator.');
    }
    sfc_require_csrf_form();

    $name = trim($name);
    $email = strtolower(trim($email));
    $department = $department !== null ? trim($department) : '';
    if ($department === '') {
        $department = 'CICTO';
    }
    $department = sfc_admin_department(['role' => 'admin', 'department' => $department]);
    if ($department === null) {
        throw new InvalidArgumentException('Choose CICTO, ASSESSOR, or LEBDO.');
    }

    if ($name === '') {
        throw new InvalidArgumentException('Your full name is required.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('A valid email address is required.');
    }
    if (strlen($password) < 8) {
        throw new InvalidArgumentException('Password must be at least 8 characters.');
    }
    if ($password !== $confirmPassword) {
        throw new InvalidArgumentException('Password confirmation does not match.');
    }

    return sfc_user_repository()->create('admin', $name, $email, $password, $department);
}

function sfc_register_seller(array $payload): array
{
    sfc_start_session();
    $payload = sfc_registration_payload($payload);
    $errors = sfc_registration_field_errors($payload, 'seller');
    sfc_registration_check_email($payload, $errors);
    $repository = sfc_seller_profile_repository();
    $errors += $repository->registrationDuplicateErrors($payload);
    if ($errors !== []) {
        throw new SfcAuthValidationException($errors);
    }
    $name = $payload['first_name'] . ' ' . $payload['last_name'];
    $email = $payload['email'];
    $password = $payload['password'];
    $privacy = sfc_account_privacy_payload($payload['privacy_consent']);
    $payload['seller_type'] = 'broker';
    $payload['legal_name'] = $name;
    $payload['authorization_basis'] = trim((string) ($payload['authorization_basis'] ?? 'Licensed real estate broker'));
    $repository->validateRegistrationPayload($payload, ['name' => $name, 'identityVerificationStatus' => 'pending']);
    $pdo = sfc_app_container()['pdo'];
    $pdo->beginTransaction();
    try {
        $user = sfc_user_repository()->create('seller', $name, $email, $password, null, $privacy + [
            'phone' => $payload['phone'], 'address' => $payload['address_line'],
            'firstName' => $payload['first_name'], 'lastName' => $payload['last_name'], 'city' => $payload['city'],
        ]);
        $profile = $repository->createOrUpdateForUser((int) $user['id'], $payload, true);
        $user = sfc_user_repository()->updateIdentityVerificationStatus((int) $user['id'], 'pending');
        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $exception;
    }
    session_regenerate_id(true);
    unset($_SESSION['sfc_csrf_token']);
    $_SESSION['sfc_user'] = sfc_user_session_payload($user);
    $_SESSION['sfc_authenticated_at'] = time();
    $_SESSION['sfc_last_activity_at'] = time();
    $_SESSION['sfc_last_db_touch_at'] = time();
    $_SESSION['sfc_welcome_mode'] = 'new';
    sfc_csrf_token();

    $container = sfc_app_container();
    $adminIds = array_values(array_filter(array_map(
        static fn (array $admin): int => (int) ($admin['id'] ?? 0),
        array_filter($container['users']->allByRole('admin'), 'sfc_can_review_brokers')
    )));
    if ($adminIds !== []) {
        $container['notifications']->createForUsers($adminIds, [
            'category' => 'operational',
            'kind' => 'seller_application',
            'priority' => 'high',
            'tone' => 'info',
            'icon' => 'seller',
            'title' => 'New broker application',
            'body' => sprintf(
                '%s submitted a PRC registration for CICTO review.',
                $profile['legalName'] ?: $user['name']
            ),
            'actionLabel' => 'Review seller',
            'actionUrl' => 'admin-dashboard.php',
            'actorUserId' => (int) $user['id'],
            'meta' => [
                'sellerUserId' => (int) $user['id'],
                'applicationStatus' => $profile['applicationStatus'] ?? 'pending_review',
            ],
        ]);
    }

    return [
        'user' => $user,
        'profile' => $profile,
    ];
}

function sfc_logout(): void
{
    sfc_start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
}

function sfc_inactivity_timeout_seconds(?string $role = null): int
{
    return match ($role) {
        'admin' => 900,      // 15 minutes for LGU municipal administrators (high security)
        'seller' => 1800,    // 30 minutes for property sellers
        'investor' => 1800,  // 30 minutes for investors & residents
        default => 1800,
    };
}

function sfc_touch_session(): bool
{
    sfc_start_session();
    $sessionUser = $_SESSION['sfc_user'] ?? null;
    if (!is_array($sessionUser)) {
        return false;
    }
    $now = time();
    $role = (string) ($sessionUser['role'] ?? 'guest');
    $timeout = sfc_inactivity_timeout_seconds($role);
    $lastActivityAt = (int) ($_SESSION['sfc_last_activity_at'] ?? $now);

    if (($now - $lastActivityAt) > $timeout) {
        sfc_logout();
        return false;
    }

    $_SESSION['sfc_last_activity_at'] = $now;
    $userId = (int) ($sessionUser['id'] ?? 0);
    if ($userId > 0) {
        $lastDbTouch = (int) ($_SESSION['sfc_last_db_touch_at'] ?? 0);
        if (($now - $lastDbTouch) >= 60) {
            $_SESSION['sfc_last_db_touch_at'] = $now;
            try {
                sfc_user_repository()->touchActivity($userId, false);
            } catch (Throwable) {
            }
        }
    }
    return true;
}

function sfc_current_user(): ?array
{
    sfc_start_session();
    $now = time();
    $authenticatedAt = (int) ($_SESSION['sfc_authenticated_at'] ?? $now);
    $lastActivityAt = (int) ($_SESSION['sfc_last_activity_at'] ?? $now);
    $sessionRole = isset($_SESSION['sfc_user']['role']) ? (string) $_SESSION['sfc_user']['role'] : null;
    $timeout = sfc_inactivity_timeout_seconds($sessionRole);

    if (($now - $lastActivityAt) > $timeout || ($now - $authenticatedAt) > 43200) {
        sfc_logout();
        return null;
    }
    $_SESSION['sfc_last_activity_at'] = $now;
    $sessionUser = $_SESSION['sfc_user'] ?? null;
    if (!is_array($sessionUser)) {
        return null;
    }

    $userId = isset($sessionUser['id']) ? (int) $sessionUser['id'] : 0;
    if ($userId > 0) {
        $lastDbTouch = (int) ($_SESSION['sfc_last_db_touch_at'] ?? 0);
        if (($now - $lastDbTouch) >= 60) {
            $_SESSION['sfc_last_db_touch_at'] = $now;
            try {
                sfc_user_repository()->touchActivity($userId, false);
            } catch (Throwable) {
            }
        }
    }
    if ($userId > 0) {
        $user = sfc_user_repository()->findById($userId);
        if ($user !== null) {
            if (!sfc_account_can_authenticate($user)) {
                sfc_logout();
                return null;
            }
            $_SESSION['sfc_user'] = sfc_user_session_payload($user);
            return $_SESSION['sfc_user'];
        }
    }

    $email = isset($sessionUser['email']) ? (string) $sessionUser['email'] : '';
    if ($email !== '') {
        $user = sfc_user_repository()->findByEmail($email);
        if ($user !== null) {
            if (!sfc_account_can_authenticate($user)) {
                sfc_logout();
                return null;
            }
            $_SESSION['sfc_user'] = sfc_user_session_payload($user);
            return $_SESSION['sfc_user'];
        }
    }

    unset($_SESSION['sfc_user']);
    return null;
}

function sfc_current_role(): ?string
{
    return sfc_current_user()['role'] ?? null;
}

function sfc_has_role(string|array $roles): bool
{
    $current = sfc_current_role();
    if ($current === null) {
        return false;
    }

    $allowed = is_array($roles) ? $roles : [$roles];
    return in_array($current, $allowed, true);
}

function sfc_admin_department(?array $user = null): ?string
{
    $user ??= sfc_current_user();
    if (($user['role'] ?? '') !== 'admin') {
        return null;
    }
    $department = strtoupper(trim((string) ($user['department'] ?? '')));
    return match ($department) {
        '', 'CICTO', 'ICT', 'CITY INFORMATION AND COMMUNICATIONS TECHNOLOGY OFFICE', 'CITY PLANNING AND DEVELOPMENT OFFICE (CPDO)' => 'CICTO',
        'ASSESSOR', 'ASSESSORS', "CITY ASSESSOR'S OFFICE", 'CITY ASSESSORS OFFICE' => 'ASSESSOR',
        'LEBDO', 'LOCAL ECONOMIC AND BUSINESS DEVELOPMENT OFFICE' => 'LEBDO',
        default => null,
    };
}

function sfc_can_review_brokers(?array $user = null): bool
{
    return sfc_admin_department($user) === 'CICTO';
}

function sfc_can_manage_properties(?array $user = null): bool
{
    return in_array(sfc_admin_department($user), ['CICTO', 'ASSESSOR', 'LEBDO'], true);
}

function sfc_broker_can_submit(?array $user = null): bool
{
    $user ??= sfc_current_user();
    $status = strtolower((string) ($user['identityVerificationStatus'] ?? $user['identity_verification_status'] ?? ''));
    if (($user['role'] ?? '') !== 'seller' || $status !== 'verified' || !sfc_account_can_authenticate($user)) {
        return false;
    }
    $profile = sfc_seller_profile_repository()->findByUserId((int) ($user['id'] ?? 0));
    $today = (new DateTimeImmutable('now', new DateTimeZone('Asia/Manila')))->format('Y-m-d');
    return $profile !== null
        && ($profile['sellerType'] ?? '') === 'broker'
        && ($profile['applicationStatus'] ?? '') === 'verified'
        && preg_match('/^[0-9]{1,20}$/', (string) ($profile['prcRegistrationNo'] ?? '')) === 1
        && !empty($profile['prcValidUntil'])
        && $profile['prcValidUntil'] >= $today;
}

function sfc_require_role(string $role, string $redirectPath): void
{
    if (!sfc_has_role($role)) {
        header('Location: ' . $redirectPath);
        exit;
    }
}

function sfc_require_any_role(array $roles, string $redirectPath): void
{
    if (!sfc_has_role($roles)) {
        header('Location: ' . $redirectPath);
        exit;
    }
}

function sfc_user_session_payload(array $user): array
{
    return [
        'id' => (int) ($user['id'] ?? 0),
        'role' => (string) ($user['role'] ?? 'guest'),
        'name' => (string) ($user['name'] ?? ''),
        'firstName' => (string) ($user['firstName'] ?? preg_split('/\s+/', trim((string) ($user['name'] ?? '')), 2)[0] ?? ''),
        'lastName' => (string) ($user['lastName'] ?? ''),
        'department' => (string) ($user['department'] ?? ''),
        'email' => (string) ($user['email'] ?? ''),
        'phone' => $user['phone'] ?? null,
        'address' => $user['address'] ?? null,
        'city' => $user['city'] ?? null,
        'profession' => $user['profession'] ?? null,
        'adultConfirmedAt' => $user['adultConfirmedAt'] ?? null,
        'accountStatus' => (string) ($user['accountStatus'] ?? 'active'),
        'profileImageUrl' => $user['profileImageUrl'] ?? null,
        'privacyConsentAt' => $user['privacyConsentAt'] ?? null,
        'privacyConsentVersion' => $user['privacyConsentVersion'] ?? null,
        'identityVerificationStatus' => (string) ($user['identityVerificationStatus'] ?? 'unverified'),
        'identityVerifiedAt' => (string) ($user['identityVerifiedAt'] ?? ''),
    ];
}
