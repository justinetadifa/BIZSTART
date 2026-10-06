<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/auth.php';

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$reason = (string) ($_POST['reason'] ?? $_GET['reason'] ?? '');
$isTimeout = $reason === 'timeout';

if ($method !== 'POST' && !$isTimeout) {
    header('Allow: POST');
    http_response_code(405);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Method not allowed.';
    exit;
}

if ($method === 'POST' && !$isTimeout && !sfc_verify_csrf_request()) {
    http_response_code(419);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Invalid or expired security token. Refresh the page and try again.';
    exit;
}

// Identify user role before clearing the session so we redirect to the correct login portal
$userRole = sfc_current_role();
sfc_logout();

if ($isTimeout) {
    $redirectUrl = match ($userRole) {
        'admin' => './admin-login.php?reason=timeout',
        'seller' => './seller-login.php?reason=timeout',
        'investor' => './investor-login.php?reason=timeout',
        default => './index.php?reason=timeout',
    };
    header('Location: ' . $redirectUrl);
    exit;
}

header('Location: ./index.php');
exit;

