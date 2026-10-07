<?php
declare(strict_types=1);

use App\Repositories\UserRepository;
use App\Repositories\SellerProfileRepository;

require_once __DIR__ . '/security.php';

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
    $user = sfc_user_repository()->authenticate($email, $password, $role);
    if ($user === null || !sfc_account_can_authenticate($user)) {
        return false;
    }

    session_regenerate_id(true);
    unset($_SESSION['sfc_csrf_token']);
    $_SESSION['sfc_user'] = sfc_user_session_payload($user);
    $_SESSION['sfc_authenticated_at'] = time();
    $_SESSION['sfc_last_activity_at'] = time();
    $_SESSION['sfc_last_db_touch_at'] = time();
    sfc_user_repository()->touchActivity((int) $user['id'], true);
    sfc_csrf_token();
    return true;
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
    return strtolower((string) ($user['identityVerificationStatus'] ?? 'unverified')) !== 'suspended'
        && !sfc_uses_default_demo_password($user);
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
    if (!filter_var($consent, FILTER_VALIDATE_BOOLEAN)) {
        throw new InvalidArgumentException('Please read and accept the data privacy consent to continue.');
    }
    return [
        'privacyConsentAt' => gmdate('Y-m-d H:i:s'),
        'privacyConsentVersion' => sfc_privacy_consent_version(),
        'privacyConsentText' => sfc_privacy_consent_text(),
    ];
}

function sfc_register_investor(string $name, string $email, string $password, string $confirmPassword, array $details = []): array
{
    sfc_start_session();

    $name = trim($name);
    $email = strtolower(trim($email));

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

    $privacy = sfc_account_privacy_payload($details['privacy_consent'] ?? $details['privacyConsent'] ?? false);
    $phone = trim((string) ($details['phone'] ?? ''));
    $address = trim((string) ($details['address'] ?? $details['address_line'] ?? ''));
    if ($phone !== '' && !preg_match('/^[+()0-9 .-]{7,30}$/', $phone)) {
        throw new InvalidArgumentException('Enter a valid contact number.');
    }
    if (mb_strlen($address) > 255) {
        throw new InvalidArgumentException('Address must be at most 255 characters.');
    }
    $user = sfc_user_repository()->create('investor', $name, $email, $password, null, $privacy + ['phone' => $phone ?: null, 'address' => $address ?: null]);
    sfc_user_repository()->touchActivity((int) $user['id'], true);
    session_regenerate_id(true);
    unset($_SESSION['sfc_csrf_token']);
    $_SESSION['sfc_user'] = sfc_user_session_payload($user);
    $_SESSION['sfc_authenticated_at'] = time();
    $_SESSION['sfc_last_activity_at'] = time();
    $_SESSION['sfc_last_db_touch_at'] = time();
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

    $name = trim((string) ($payload['name'] ?? ''));
    $email = strtolower(trim((string) ($payload['email'] ?? '')));
    $password = (string) ($payload['password'] ?? '');
    $confirmPassword = (string) ($payload['confirm_password'] ?? $payload['confirmPassword'] ?? '');

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

    $privacy = sfc_account_privacy_payload($payload['privacy_consent'] ?? $payload['privacyConsent'] ?? false);
    $payload['seller_type'] = 'broker';
    $payload['legal_name'] = $name;
    $payload['authorization_basis'] = trim((string) ($payload['authorization_basis'] ?? 'Licensed real estate broker'));
    $repository = sfc_seller_profile_repository();
    $repository->validateRegistrationPayload($payload, ['name' => $name, 'identityVerificationStatus' => 'pending']);
    $pdo = sfc_app_container()['pdo'];
    $pdo->beginTransaction();
    try {
        $user = sfc_user_repository()->create('seller', $name, $email, $password, null, $privacy + [
            'phone' => trim((string) ($payload['phone'] ?? '')),
            'address' => trim((string) ($payload['address_line'] ?? '')),
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
    if (($user['role'] ?? '') !== 'seller' || ($user['identityVerificationStatus'] ?? '') !== 'verified') {
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
        'department' => (string) ($user['department'] ?? ''),
        'email' => (string) ($user['email'] ?? ''),
        'phone' => $user['phone'] ?? null,
        'address' => $user['address'] ?? null,
        'profileImageUrl' => $user['profileImageUrl'] ?? null,
        'privacyConsentAt' => $user['privacyConsentAt'] ?? null,
        'privacyConsentVersion' => $user['privacyConsentVersion'] ?? null,
        'identityVerificationStatus' => (string) ($user['identityVerificationStatus'] ?? 'unverified'),
        'identityVerifiedAt' => (string) ($user['identityVerifiedAt'] ?? ''),
    ];
}
