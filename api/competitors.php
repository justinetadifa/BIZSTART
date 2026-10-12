<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__) . '/app/Support/NearbyBusinesses.php';
require_once dirname(__DIR__) . '/app/Support/SurroundingsRadar.php';

use App\Support\SurroundingsRadar;
use App\Support\NearbyBusinesses;

api_handle(function (array $container): array {
    $parameters = SurroundingsRadar::queryParameters($_GET);
    if ($parameters !== null) {
        try {
            return SurroundingsRadar::search($parameters['lat'], $parameters['lng'], $parameters['radius'], $parameters['type']);
        } catch (Throwable $e) {
            return [
                503,
                [
                    'error' => 'Unable to load nearby data. Please retry.',
                    'canRetry' => true,
                    'type' => 'FeatureCollection',
                    'features' => [],
                    'roads' => [
                        'status' => 'Unavailable',
                        'geojson' => ['type' => 'FeatureCollection', 'features' => []],
                    ],
                ]
            ];
        }
    }

    // If explicit legacy test raw file requested
    if (isset($_GET['legacy_raw'])) {
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
    }

    // Default: Return the comprehensive, verified, active San Fernando commercial directory GeoJSON
    return NearbyBusinesses::asGeoJson();
});
