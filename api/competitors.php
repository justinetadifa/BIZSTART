<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__) . '/app/Support/NearbyBusinesses.php';
require_once dirname(__DIR__) . '/app/Support/SurroundingsRadar.php';

use App\Support\SurroundingsRadar;
use App\Support\NearbyBusinesses;

api_handle(function (array $container): array {
    $rawLat = $_GET['lat'] ?? null;
    $rawLng = $_GET['lng'] ?? null;

    if ($rawLat !== null && $rawLng !== null && is_numeric($rawLat) && is_numeric($rawLng)) {
        $lat = (float) $rawLat;
        $lng = (float) $rawLng;
        $radius = isset($_GET['radius']) && is_numeric($_GET['radius']) ? (int) $_GET['radius'] : 500;
        $businessType = is_string($_GET['type'] ?? null) ? trim((string) $_GET['type']) : 'cafe';

        try {
            return SurroundingsRadar::search($lat, $lng, $radius, $businessType);
        } catch (Throwable $e) {
            return [
                503,
                [
                    'error' => 'Unable to load nearby data. ' . $e->getMessage(),
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
