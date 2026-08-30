<?php
declare(strict_types=1);

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

register_shutdown_function(static function (): void {
    $error = error_get_last();
    if (!$error) {
        return;
    }

    $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
    if (!in_array($error['type'] ?? 0, $fatalTypes, true)) {
        return;
    }

    if (!headers_sent()) {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        api_raw_json_response([
            'error' => 'Fatal PHP error.',
            'details' => $error['message'] ?? 'Unknown fatal error.',
            'file' => $error['file'] ?? null,
            'line' => $error['line'] ?? null,
        ], 500);
    }
});

require_once __DIR__ . '/../app/Support/auth.php';

$container = require __DIR__ . '/../app/bootstrap.php';

function app_container(): array
{
    global $container;
    return $container;
}

function api_handle(callable $callback): void
{
    try {
        $result = $callback(app_container());

        if (
            is_array($result) &&
            isset($result[0], $result[1]) &&
            count($result) === 2 &&
            is_int($result[0]) &&
            is_array($result[1])
        ) {
            respond_json($result[1], $result[0]);
            return;
        }

        if (is_array($result)) {
            respond_json($result);
            return;
        }

        respond_json(['error' => 'Invalid API response.'], 500);
    } catch (InvalidArgumentException $exception) {
        respond_json(['error' => $exception->getMessage()], 400);
    } catch (OutOfBoundsException $exception) {
        respond_json(['error' => $exception->getMessage()], 404);
    } catch (Throwable $exception) {
        respond_json([
            'error' => $exception->getMessage(),
            'type' => get_class($exception),
        ], 500);
    }
}
