<?php
declare(strict_types=1);
// Access rules for the PHP development server, which does not read .htaccess.
$path = rawurldecode((string) (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'));
$segments = array_values(array_filter(explode('/', str_replace('\\', '/', $path)), static fn (string $part): bool => $part !== ''));
foreach ($segments as $segment) {
    if ($segment[0] === '.') {
        http_response_code(404);
        exit('Not found.');
    }
}
if (in_array(strtolower($segments[0] ?? ''), ['signout', 'logout'], true)) {
    require __DIR__ . '/logout.php';
    exit;
}
if (in_array(strtolower($segments[0] ?? ''), ['app', 'data', 'database', 'tests', 'scratch', 'vendor', 'node_modules'], true)) {
    http_response_code(404);
    exit('Not found.');
}
return false;
