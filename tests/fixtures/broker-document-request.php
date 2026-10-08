<?php
declare(strict_types=1);

// CLI harness executes the actual endpoint against the parent's disposable DB.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$root = dirname(__DIR__, 2);
require_once $root . '/app/Support/helpers.php';
require_once $root . '/app/Support/auth.php';
require_once $root . '/app/Repositories/UserRepository.php';
require_once $root . '/app/Repositories/SellerProfileRepository.php';
require_once $root . '/api/_request.php';
require_once $root . '/app/Repositories/BrokerMailRepository.php';
require_once $root . '/app/Support/BrokerMailer.php';
require_once $root . '/app/Support/BrokerEmailService.php';
$pdo = new PDO($input['dsn'], $input['username'], $input['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]);
$documents = new App\Support\BrokerDocuments($input['directory']);
$container = ['pdo' => $pdo, 'users' => new App\Repositories\UserRepository($pdo), 'sellerProfiles' => new App\Repositories\SellerProfileRepository($pdo, $documents), 'brokerDocuments' => $documents];
$safeConfig = ['app' => ['environment' => 'local'], 'mail' => []];
$container['brokerEmail'] = new App\Support\BrokerEmailService(new App\Repositories\BrokerMailRepository($pdo), new App\Support\BrokerMailer($safeConfig), $safeConfig);
$_SERVER['REQUEST_METHOD'] = $input['method'] ?? 'GET';
session_save_path($input['directory']);
sfc_start_session();
if (!empty($input['actor'])) {
    $_SESSION['sfc_user'] = sfc_user_session_payload($container['users']->findById((int) $input['actor']));
    $_SESSION['sfc_authenticated_at'] = time();
    $_SESSION['sfc_last_activity_at'] = time();
    $_SESSION['sfc_last_db_touch_at'] = time();
}
$_GET = $input['query'];
if ($input['csrf'] ?? true) { $_SERVER['HTTP_X_CSRF_TOKEN'] = sfc_csrf_token(); }
ob_start();
register_shutdown_function(static function (): void {
    $body = ob_get_clean();
    if (session_status() === PHP_SESSION_ACTIVE) { session_destroy(); }
    echo json_encode(['status' => http_response_code() ?: 200, 'body' => base64_encode((string) $body)], JSON_THROW_ON_ERROR);
});
$endpoint = $input['endpoint'] ?? 'broker-document';
if (!in_array($endpoint, ['broker-document', 'seller-profiles', 'messages', 'visit-logs', 'document-requests', 'property-command-center'], true)) { throw new RuntimeException('Unsupported test endpoint.'); }
$source = file_get_contents($root . '/api/' . $endpoint . '.php');
$source = str_replace("require __DIR__ . '/_bootstrap.php';", '', $source);
eval(substr($source, 5));
