<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    $layer = isset($_GET['layer']) && is_string($_GET['layer']) ? trim($_GET['layer']) : null;
    $path = dirname(__DIR__) . '/data/assessment/hazards.geojson';
    if (!is_file($path)) {
        return ['type' => 'FeatureCollection', 'features' => []];
    }

    $raw = (string) file_get_contents($path);
    $data = json_decode($raw, true);
    if (!is_array($data) || !isset($data['features']) || !is_array($data['features'])) {
        return ['type' => 'FeatureCollection', 'features' => []];
    }

    if ($layer !== null && $layer !== '') {
        $data['features'] = array_values(array_filter($data['features'], static function (array $feature) use ($layer): bool {
            $props = $feature['properties'] ?? [];
            return ($props['hazard_type'] ?? '') === $layer;
        }));
    }

    return $data;
});
