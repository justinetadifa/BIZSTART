<?php
declare(strict_types=1);

// Exercise the real request dispatcher without opening a database connection.
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/api/_request.php';

$container = [];
$apiDebug = false;
$csrfValid = false;
$csrfChecks = 0;
$checks = 0;

function sfc_verify_csrf_request(): bool
{
    $GLOBALS['csrfChecks']++;
    return (bool) $GLOBALS['csrfValid'];
}

function security_check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $GLOBALS['checks']++;
}

function security_request(string $method, mixed $override = null, bool $validToken = false, bool $queryOverride = false): void
{
    $_SERVER = ['REQUEST_METHOD' => $method];
    $_POST = [];
    $_GET = [];
    if ($override !== null) {
        if ($queryOverride) {
            $_GET['_method'] = $override;
        } else {
            $_POST['_method'] = $override;
        }
    }
    $GLOBALS['csrfValid'] = $validToken;
    $GLOBALS['csrfChecks'] = 0;
    http_response_code(200);
}

function security_dispatch(callable $callback): array
{
    ob_start();
    try {
        api_handle($callback);
        $body = (string) ob_get_contents();
    } finally {
        ob_end_clean();
    }
    return [http_response_code(), json_decode($body, true, 512, JSON_THROW_ON_ERROR)];
}

foreach (['GET', 'HEAD', 'OPTIONS'] as $override) {
    foreach ([false, true] as $queryOverride) {
        security_request('POST', $override, false, $queryOverride);
        $called = false;
        [$status] = security_dispatch(static function () use (&$called): array {
            $called = true;
            return ['ok' => true];
        });
        security_check($status === 419 && !$called && $csrfChecks === 1, 'POST override bypassed CSRF: ' . $override);

        security_request('POST', $override, true, $queryOverride);
        [$status] = security_dispatch(static function () use (&$called): array {
            $called = true;
            return ['ok' => true];
        });
        security_check($status === 400 && !$called, 'Safe method override reached the callback: ' . $override);
    }
}

foreach (['PUT', 'PATCH', 'DELETE'] as $override) {
    foreach ([false, true] as $queryOverride) {
        security_request('POST', strtolower($override), true, $queryOverride);
        [$status, $payload] = security_dispatch(static fn (): array => ['method' => request_method()]);
        security_check($status === 200 && $payload['method'] === $override && $csrfChecks === 1, 'Legitimate override failed: ' . $override);

        security_request('POST', $override, false, $queryOverride);
        $called = false;
        [$status] = security_dispatch(static function () use (&$called): array {
            $called = true;
            return ['ok' => true];
        });
        security_check($status === 419 && !$called, 'Unsafe override accepted without a token: ' . $override);
    }
}

foreach (['POST', 'PUT', 'PATCH', 'DELETE'] as $method) {
    security_request($method);
    $called = false;
    [$status] = security_dispatch(static function () use (&$called): array {
        $called = true;
        return ['ok' => true];
    });
    security_check($status === 419 && !$called, 'Raw unsafe method accepted without a token: ' . $method);
}

foreach (['GET', 'HEAD'] as $method) {
    security_request($method, 'DELETE');
    [$status, $payload] = security_dispatch(static fn (): array => ['method' => request_method()]);
    security_check($status === 200 && $payload['method'] === $method && $csrfChecks === 0, 'Safe transport request was changed by an override: ' . $method);
}

security_request('OPTIONS');
$called = false;
[$status, $payload] = security_dispatch(static function () use (&$called): array {
    $called = true;
    return ['unexpected' => true];
});
security_check($status === 200 && $payload === ['ok' => true] && !$called && $csrfChecks === 0, 'OPTIONS preflight should return before route execution.');

security_request('POST', ['GET'], true);
[$status] = security_dispatch(static fn (): array => ['ok' => true]);
security_check($status === 400, 'Array method override was accepted.');

security_request('POST', 'TRACE', true);
[$status] = security_dispatch(static fn (): array => ['ok' => true]);
security_check($status === 400, 'Unsupported method override was accepted.');

// Evaluate only the health route registration; the application bootstrap is deliberately excluded.
$healthSource = (string) file_get_contents(dirname(__DIR__) . '/api/health.php');
$routeOffset = strpos($healthSource, 'api_handle(');
security_check($routeOffset !== false, 'Health route registration is missing.');
$healthRoute = substr($healthSource, (int) $routeOffset);
$queries = [];
$container['pdo'] = new class($queries) {
    private array $queries;

    public function __construct(array &$queries)
    {
        $this->queries = &$queries;
    }

    public function query(string $sql): object
    {
        $this->queries[] = $sql;
        return new class {
            public function fetchColumn(): int
            {
                return 1;
            }
        };
    }
};

security_request('GET');
ob_start();
try {
    eval($healthRoute);
    $healthPayload = json_decode((string) ob_get_contents(), true, 512, JSON_THROW_ON_ERROR);
} finally {
    ob_end_clean();
}
security_check(http_response_code() === 200 && $healthPayload['status'] === 'ok', 'Health check failed.');
security_check(array_keys($healthPayload) === ['status', 'timestamp'], 'Public health response exposed internal information.');
security_check($queries === ['SELECT 1'], 'Health check queried database metadata.');

security_request('POST', null, true);
$queries = [];
ob_start();
try {
    eval($healthRoute);
    $healthPayload = json_decode((string) ob_get_contents(), true, 512, JSON_THROW_ON_ERROR);
} finally {
    ob_end_clean();
}
security_check(http_response_code() === 405 && $queries === [], 'Health endpoint accepted a state-changing method.');

echo sprintf("API security checks passed (%d checks; no database connection or writes).\n", $checks);
