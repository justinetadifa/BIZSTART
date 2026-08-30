<?php
declare(strict_types=1);

use App\Repositories\UserRepository;

function sfc_start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
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

function sfc_demo_credentials(): array
{
    return [
        'admin' => [
            'email' => 'admin@sfcelerate.local',
            'password' => 'Admin123!',
            'name' => 'SFC Admin',
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
    if ($user === null) {
        return false;
    }

    $_SESSION['sfc_user'] = sfc_user_session_payload($user);
    return true;
}

function sfc_register_investor(string $name, string $email, string $password, string $confirmPassword): array
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

    $user = sfc_user_repository()->create('investor', $name, $email, $password);
    $_SESSION['sfc_user'] = sfc_user_session_payload($user);

    return $user;
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

function sfc_current_user(): ?array
{
    sfc_start_session();
    $sessionUser = $_SESSION['sfc_user'] ?? null;
    if (!is_array($sessionUser)) {
        return null;
    }

    $userId = isset($sessionUser['id']) ? (int) $sessionUser['id'] : 0;
    if ($userId > 0) {
        $user = sfc_user_repository()->findById($userId);
        if ($user !== null) {
            $_SESSION['sfc_user'] = sfc_user_session_payload($user);
            return $_SESSION['sfc_user'];
        }
    }

    $email = isset($sessionUser['email']) ? (string) $sessionUser['email'] : '';
    if ($email !== '') {
        $user = sfc_user_repository()->findByEmail($email);
        if ($user !== null) {
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
        'email' => (string) ($user['email'] ?? ''),
        'identityVerificationStatus' => (string) ($user['identityVerificationStatus'] ?? 'unverified'),
        'identityVerifiedAt' => (string) ($user['identityVerifiedAt'] ?? ''),
    ];
}
