<?php
declare(strict_types=1);

/** Security configuration has no database or session dependency. */
function sfc_security_config(): array
{
    return require dirname(__DIR__) . '/config.php';
}

function sfc_security_is_local(): bool
{
    if ((sfc_security_config()['app']['environment'] ?? 'production') !== 'local') {
        return false;
    }
    if (PHP_SAPI === 'cli' && !isset($_SERVER['HTTP_HOST'])) {
        return true;
    }
    $host = strtolower((string) (parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST) ?: ''));
    return in_array($host, ['localhost', '127.0.0.1', '[::1]', '::1'], true)
        && in_array((string) ($_SERVER['SERVER_ADDR'] ?? ''), ['127.0.0.1', '::1'], true)
        && in_array((string) ($_SERVER['REMOTE_ADDR'] ?? ''), ['127.0.0.1', '::1'], true);
}

function sfc_request_is_https(): bool
{
    $https = strtolower(trim((string) ($_SERVER['HTTPS'] ?? '')));
    if ($https !== '' && !in_array($https, ['off', '0'], true)) {
        return true;
    }
    $config = sfc_security_config();
    $trusted = $config['security']['trusted_proxies'] ?? [];
    $remoteAddress = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    if (!is_array($trusted) || $remoteAddress === '' || !in_array($remoteAddress, $trusted, true)) {
        return false;
    }
    // The listed proxy must overwrite this header, never append client input.
    return strtolower(trim((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))) === 'https';
}

function sfc_secure_redirect_url(): ?string
{
    $config = sfc_security_config();
    $origin = parse_url((string) ($config['app']['url'] ?? ''));
    if (!is_array($origin) || ($origin['scheme'] ?? '') !== 'https' || empty($origin['host'])
        || isset($origin['user']) || isset($origin['pass']) || isset($origin['query']) || isset($origin['fragment'])) {
        return null;
    }
    $host = (string) $origin['host'];
    if (!preg_match('/^(?:[a-z0-9.-]+|\[[a-f0-9:]+\])$/iD', $host)) {
        return null;
    }
    $uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
    if ($uri === '' || $uri[0] !== '/' || preg_match('/[\x00-\x20\x7f]/', $uri)) {
        $uri = '/';
    }
    return 'https://' . $host . (isset($origin['port']) ? ':' . (int) $origin['port'] : '') . $uri;
}

function sfc_enforce_transport_security(): void
{
    static $applied = false;
    if ($applied || (PHP_SAPI === 'cli' && !isset($_SERVER['HTTP_HOST']))) {
        return;
    }
    $applied = true;
    $config = sfc_security_config();
    if (($config['app']['environment'] ?? 'production') === 'production') {
        ini_set('display_errors', '0');
        ini_set('display_startup_errors', '0');
    }
    ini_set('log_errors', '1');
    if (headers_sent()) {
        return;
    }
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()');
    $csp = "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'";
    $forceHttps = !sfc_security_is_local() && (bool) ($config['security']['force_https'] ?? false);
    if ($forceHttps && sfc_request_is_https()) {
        $maxAge = max(0, min(31536000, (int) ($config['security']['hsts_max_age'] ?? 31536000)));
        header('Strict-Transport-Security: max-age=' . $maxAge);
        $csp .= '; upgrade-insecure-requests';
    }
    header('Content-Security-Policy: ' . $csp);
    if (!$forceHttps || sfc_request_is_https()) {
        return;
    }
    $url = sfc_secure_redirect_url();
    header('Cache-Control: no-store');
    if ($url === null) {
        http_response_code(503);
        header('Content-Type: text/plain; charset=utf-8');
        exit('Secure site URL configuration is required.');
    }
    if (!in_array(strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')), ['GET', 'HEAD'], true)) {
        http_response_code(400);
        header('Content-Type: text/plain; charset=utf-8');
        exit('HTTPS is required. Open the secure site and try again.');
    }
    header('Location: ' . $url, true, 308);
    exit;
}
