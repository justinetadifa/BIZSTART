<?php
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');

require_once __DIR__ . '/../app/Support/security.php';
sfc_enforce_transport_security();

if (!function_exists('api_raw_json_response')) {
    function api_raw_json_response(array $payload, int $status = 200): void
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
        }

        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}

$apiDebug = false;

register_shutdown_function(static function () use (&$apiDebug): void {
    $error = error_get_last();
    if (!$error) {
        return;
    }

    $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
    if (!in_array($error['type'] ?? 0, $fatalTypes, true)) {
        return;
    }

    error_log(sprintf(
        '[LOCUS-SF API fatal] %s in %s:%d',
        (string) ($error['message'] ?? 'Unknown fatal error'),
        (string) ($error['file'] ?? 'unknown file'),
        (int) ($error['line'] ?? 0)
    ));

    if (!headers_sent()) {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        $payload = ['error' => 'Internal server error.'];
        if ($apiDebug) {
            $payload = [
                'error' => 'Fatal PHP error.',
                'details' => $error['message'] ?? 'Unknown fatal error.',
                'file' => $error['file'] ?? null,
                'line' => $error['line'] ?? null,
            ];
        }
        api_raw_json_response($payload, 500);
    }
});

$apiConfig = require __DIR__ . '/../app/config.php';
$apiDebug = (bool) ($apiConfig['app']['debug'] ?? false);

require_once __DIR__ . '/../app/Support/auth.php';

$container = require __DIR__ . '/../app/bootstrap.php';

require_once __DIR__ . '/_request.php';
