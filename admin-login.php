<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
require_once __DIR__ . '/app/Support/account-view.php';
require_once __DIR__ . '/app/Support/staff-onboarding.php';

$context = sfc_web_context();
$mode = in_array($_POST['mode'] ?? $_GET['mode'] ?? 'login', ['activate', 'signup'], true) ? 'activate' : 'login';
$error = '';
$fieldErrors = [];
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    try {
        sfc_require_csrf_form();
        if ($mode === 'activate') {
            sfc_activate_city_staff($_POST);
        } elseif (!sfc_login('admin', sfc_auth_string($_POST['email'] ?? ''), is_string($_POST['password'] ?? null) ? $_POST['password'] : '')) {
            throw new SfcAuthValidationException(sfc_login_errors());
        }
        header('Location: ' . sfc_path('/admin-dashboard.php'), true, 303);
        exit;
    } catch (SfcAuthValidationException $exception) {
        $fieldErrors = $exception->errors();
        $error = (string) ($fieldErrors['account_status'] ?? $fieldErrors['_form'] ?? '');
    } catch (InvalidArgumentException $exception) {
        $error = $exception->getMessage();
    } catch (\App\Core\DatabaseUnavailableException $exception) {
        error_log('[LOCUS-SF] Database unavailable during city account access.');
        http_response_code(503);
        header('Retry-After: 30');
        $error = 'Account services are temporarily unavailable. Please try again shortly.';
    }
}
sfc_render_account_page($context, 'admin', $mode, $error, $fieldErrors);
