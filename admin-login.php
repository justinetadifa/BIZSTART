<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
require_once __DIR__ . '/app/Support/account-view.php';

$context = sfc_web_context();
$error = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    try {
        if (($_POST['mode'] ?? '') === 'signup') {
            http_response_code(403);
            throw new InvalidArgumentException('City accounts are provisioned by CICTO.');
        }
        sfc_require_csrf_form();
        if (!sfc_login('admin', (string) ($_POST['email'] ?? ''), (string) ($_POST['password'] ?? ''))) {
            throw new InvalidArgumentException('Email or password is incorrect.');
        }
        header('Location: ' . sfc_path('/admin-dashboard.php'));
        exit;
    } catch (InvalidArgumentException $exception) {
        $error = $exception->getMessage();
    }
}
sfc_render_account_page($context, 'admin', 'login', $error);
