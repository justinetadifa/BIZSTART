<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if (in_array('--help', $argv, true)) {
    echo "Usage: php scripts/process-broker-mail.php [--limit=20]\nProcess queued broker mail using configured SMTP. Run regularly from the scheduler.\n";
    exit(0);
}
$options = getopt('', ['limit:']);
$limit = max(1, min(100, (int) ($options['limit'] ?? 20)));
try {
    // A scheduled delivery job must not seed accounts, migrate schema, or bootstrap unrelated services.
    require_once dirname(__DIR__) . '/app/Core/Database.php';
    require_once dirname(__DIR__) . '/app/Repositories/BrokerMailRepository.php';
    require_once dirname(__DIR__) . '/app/Support/BrokerMailer.php';
    require_once dirname(__DIR__) . '/app/Support/BrokerEmailService.php';
    $config = require dirname(__DIR__) . '/app/config.php';
    $dbConfig = $config['db'];
    $dbConfig['auto_create'] = false;
    $pdo = (new App\Core\Database($dbConfig))->pdo();
    $service = new App\Support\BrokerEmailService(
        new App\Repositories\BrokerMailRepository($pdo), new App\Support\BrokerMailer($config), $config
    );
    $recovery = $service->reconcilePending($limit);
    $result = $service->deliverPending($limit);
    $result['recovered'] = ['decisions' => $recovery['decisions'], 'received' => $recovery['received']];
    $result['recoveryFailed'] = $recovery['failed'];
    echo json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES) . "\n";
    exit(!$result['mailConfigured'] ? 2 : ($result['failed'] > 0 || $recovery['failed'] > 0 ? 1 : 0));
} catch (Throwable) {
    fwrite(STDERR, "Broker mail processing could not finish. Check database availability and mail configuration.\n");
    exit(1);
}
