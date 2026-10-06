<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    if (!in_array(request_method(), ['GET', 'HEAD'], true)) {
        return [405, ['error' => 'Method not allowed.']];
    }

    if ((int) $container['pdo']->query('SELECT 1')->fetchColumn() !== 1) {
        throw new RuntimeException('Health check failed.');
    }
    return [
        'status' => 'ok',
        'timestamp' => gmdate(DATE_ATOM),
    ];
});
