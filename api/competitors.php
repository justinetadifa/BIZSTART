<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    $dataFile = dirname(__DIR__) . '/data/competitors.json';
    if (!is_file($dataFile)) {
        return ['type' => 'FeatureCollection', 'features' => []];
    }
    $raw = (string) file_get_contents($dataFile);
    $data = json_decode($raw, true);
    if (!is_array($data) || !isset($data['type'])) {
        return ['type' => 'FeatureCollection', 'features' => []];
    }
    return $data;
});
