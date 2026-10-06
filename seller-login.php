<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
require_once __DIR__ . '/app/Support/account-view.php';

$context = sfc_web_context();
$mode = in_array($_GET['mode'] ?? $_POST['mode'] ?? 'login', ['signup', 'register'], true) ? 'signup' : 'login';
$error = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    try {
        sfc_require_csrf_form();
        if ($mode === 'signup') {
            sfc_register_seller($_POST);
        } elseif (!sfc_login('seller', (string) ($_POST['email'] ?? ''), (string) ($_POST['password'] ?? ''))) {
            throw new InvalidArgumentException('Email or password is incorrect.');
        }
        header('Location: ' . sfc_path('/seller-dashboard.php'));
        exit;
    } catch (InvalidArgumentException $exception) {
        $error = $exception->getMessage();
    }
}
sfc_render_account_page($context, 'seller', $mode, $error);
