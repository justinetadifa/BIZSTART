<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;
use RuntimeException;
use Throwable;

final class SurroundingsRadar
{
    private const EARTH_RADIUS = 6371000.0; // meters

    private const OVERPASS_MIRRORS = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://z.overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
    ];

    /**
     * Compute Haversine distance in meters between two lat/lng coordinates.
     */
    public static function distance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * (sin($dLng / 2) ** 2);
        $c = 2 * atan2(sqrt($a), sqrt(max(0.0, 1.0 - $a)));
        return self::EARTH_RADIUS * $c;
    }

    /**
     * Search establishments and road segments within $radiusMeters of ($lat, $lng).
     */
    public static function search(float $lat, float $lng, int $radiusMeters = 500, string $businessType = 'cafe'): array
    {
        if (!is_finite($lat) || abs($lat) > 90 || !is_finite($lng) || abs($lng) > 180) {
            throw new InvalidArgumentException('Invalid latitude or longitude coordinates.');
        }

        $radiusMeters = max(100, min(1500, $radiusMeters));
        $cacheDir = dirname(__DIR__, 2) . '/data/cache/radar';
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0775, true);
        }

        $cacheKey = sprintf('radar_%.4f_%.4f_%d.json', $lat, $lng, $radiusMeters);
        $cachePath = $cacheDir . '/' . $cacheKey;
        $now = time();

        // 1. Check fresh cache (valid for 24 hours)
        if (is_file($cachePath)) {
            $mtime = filemtime($cachePath) ?: 0;
            $raw = @file_get_contents($cachePath);
            if ($raw !== false) {
                $cached = json_decode($raw, true);
                if (is_array($cached) && isset($cached['features'])) {
                    if (($now - $mtime) < 86400) {
                        $cached['cached'] = true;
                        $cached['stale'] = false;
                        return $cached;
                    }
                }
            }
        }

        // 2. Fetch from Overpass
        $osmData = null;
        $fetchError = null;
        try {
            $osmData = self::queryOverpass($lat, $lng, $radiusMeters);
        } catch (Throwable $e) {
            $fetchError = $e->getMessage();
        }

        // 3. Fallback to stale or nearby cache if Overpass fails
        if ($osmData === null) {
            $fallbackFile = is_file($cachePath) ? $cachePath : null;
            if ($fallbackFile === null && is_dir($cacheDir)) {
                $candidates = glob($cacheDir . '/radar_*_*_' . $radiusMeters . '.json') ?: [];
                foreach ($candidates as $cand) {
                    if (preg_match('/radar_([0-9.]+)_\d*([0-9.]+)_' . $radiusMeters . '\.json/', basename($cand), $m)) {
                        $cLat = (float) $m[1];
                        $cLng = (float) $m[2];
                        if (self::distance($lat, $lng, $cLat, $cLng) <= 80.0) {
                            $fallbackFile = $cand;
                            break;
                        }
                    }
                }
            }
            if ($fallbackFile !== null) {
                $raw = @file_get_contents($fallbackFile);
                if ($raw !== false) {
                    $cached = json_decode($raw, true);
                    if (is_array($cached) && isset($cached['features'])) {
                        $cached['cached'] = true;
                        $cached['stale'] = true;
                        $cached['warning'] = 'Showing offline cached results: ' . ($fetchError ?? 'Geographic service unavailable');
                        return $cached;
                    }
                }
            }
        }

        // 4. Load local verified records
        $localFeatures = self::loadLocalRecords($lat, $lng, $radiusMeters);

        // If Overpass failed and we have no cache and no local records, return clean empty result
        if ($osmData === null && empty($localFeatures)) {
            return [
                'type' => 'FeatureCollection',
                'features' => [],
                'roads' => [
                    'status' => 'Unavailable',
                    'geojson' => [
                        'type' => 'FeatureCollection',
                        'features' => [],
                    ],
                    'source' => 'San Fernando City Commercial Registry',
                    'date' => gmdate('Y-m-d'),
                ],
                'center' => [$lat, $lng],
                'radius' => $radiusMeters,
                'source' => 'San Fernando City Commercial Registry',
                'retrievalDate' => gmdate('Y-m-d'),
                'cached' => false,
                'stale' => false,
                'coverage' => 'local_only',
                'warning' => 'No recorded commercial establishments within ' . $radiusMeters . 'm.',
            ];
        }

        // 5. Parse OSM elements into GeoJSON
        $parsed = self::parseOsmElements($osmData['elements'] ?? [], $lat, $lng, $radiusMeters);

        // 6. Merge local verified records with OSM establishments (deduplicate)
        $allEstablishments = self::mergeEstablishments($localFeatures, $parsed['establishments']);

        $result = [
            'type' => 'FeatureCollection',
            'features' => $allEstablishments,
            'roads' => [
                'status' => !empty($parsed['roads']) ? 'Available' : ($osmData !== null ? 'None nearby' : 'Unavailable'),
                'geojson' => [
                    'type' => 'FeatureCollection',
                    'features' => $parsed['roads'],
                ],
                'source' => $osmData !== null ? 'OpenStreetMap contributors (via Overpass API)' : 'San Fernando City Commercial Registry',
                'date' => gmdate('Y-m-d'),
            ],
            'center' => [$lat, $lng],
            'radius' => $radiusMeters,
            'source' => $osmData !== null ? 'OpenStreetMap & Local Verified Store Locators' : 'San Fernando City Commercial Registry',
            'retrievalDate' => gmdate('Y-m-d'),
            'cached' => false,
            'stale' => false,
            'coverage' => $osmData !== null ? 'complete' : 'local_only',
        ];

        // Save to cache
        @file_put_contents($cachePath, json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        return $result;
    }

    private static function queryOverpass(float $lat, float $lng, int $radiusMeters): array
    {
        $buffer = $radiusMeters + 30; // slight buffer for geometry intersection
        $query = sprintf(
            '[out:json][timeout:8];(nwr(around:%d,%.6f,%.6f)["amenity"];nwr(around:%d,%.6f,%.6f)["shop"];nwr(around:%d,%.6f,%.6f)["tourism"];nwr(around:%d,%.6f,%.6f)["office"];nwr(around:%d,%.6f,%.6f)["commercial"];nwr(around:%d,%.6f,%.6f)["industrial"];way(around:%d,%.6f,%.6f)["highway"];);out body geom;',
            $buffer, $lat, $lng,
            $buffer, $lat, $lng,
            $buffer, $lat, $lng,
            $buffer, $lat, $lng,
            $buffer, $lat, $lng,
            $buffer, $lat, $lng,
            $buffer, $lat, $lng
        );

        $lastError = 'Overpass mirrors unreachable';
        $mirrors = array_slice(self::OVERPASS_MIRRORS, 0, 2);
        foreach ($mirrors as $mirror) {
            $ch = curl_init($mirror);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
            curl_setopt($ch, CURLOPT_USERAGENT, 'LOCUS-SF-Radar/1.0 (San Fernando La Union Urban Intelligence; contact@sfcelerate.local)');
            curl_setopt($ch, CURLOPT_POSTFIELDS, 'data=' . urlencode($query));

            $response = curl_exec($ch);
            $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($statusCode === 200 && is_string($response) && $response !== '') {
                $decoded = json_decode($response, true);
                if (is_array($decoded) && isset($decoded['elements'])) {
                    return $decoded;
                }
            }

            $lastError = "Overpass error ($mirror HTTP $statusCode" . ($curlError ? ": $curlError" : '') . ")";
        }

        throw new RuntimeException($lastError);
    }

    private static function loadLocalRecords(float $lat, float $lng, int $radiusMeters): array
    {
        $baseDir = dirname(__DIR__, 2);
        $results = [];
        $seen = [];

        // 1. Check data/competitors.json
        $compFile = $baseDir . '/data/competitors.json';
        if (is_file($compFile)) {
            $raw = (string) @file_get_contents($compFile);
            $data = json_decode($raw, true);
            if (is_array($data) && isset($data['features']) && is_array($data['features'])) {
                foreach ($data['features'] as $f) {
                    if (($f['geometry']['type'] ?? '') !== 'Point') {
                        continue;
                    }
                    $coords = $f['geometry']['coordinates'] ?? null;
                    if (!is_array($coords) || count($coords) < 2) {
                        continue;
                    }
                    $fLng = (float) $coords[0];
                    $fLat = (float) $coords[1];
                    $dist = self::distance($lat, $lng, $fLat, $fLng);
                    if ($dist <= ($radiusMeters + 1.0)) {
                        $props = $f['properties'] ?? [];
                        $props['source'] = 'Local Verified Store Locator';
                        $props['distanceMeters'] = round($dist, 1);
                        $props['verified'] = true;
                        $f['properties'] = $props;
                        $id = $f['id'] ?? ($props['name'] ?? null);
                        if ($id) {
                            $seen[$id] = true;
                        }
                        $results[] = $f;
                    }
                }
            }
        }

        // 2. Check data/commercial-directory.json
        $commFile = $baseDir . '/data/commercial-directory.json';
        if (is_file($commFile)) {
            $raw = (string) @file_get_contents($commFile);
            $data = json_decode($raw, true);
            if (is_array($data) && isset($data['features']) && is_array($data['features'])) {
                foreach ($data['features'] as $f) {
                    if (($f['geometry']['type'] ?? '') !== 'Point') {
                        continue;
                    }
                    $coords = $f['geometry']['coordinates'] ?? null;
                    if (!is_array($coords) || count($coords) < 2) {
                        continue;
                    }
                    $fLng = (float) $coords[0];
                    $fLat = (float) $coords[1];
                    $dist = self::distance($lat, $lng, $fLat, $fLng);
                    if ($dist <= ($radiusMeters + 1.0)) {
                        $props = $f['properties'] ?? [];
                        $name = $props['name'] ?? '';
                        $id = $f['id'] ?? $name;
                        if (isset($seen[$id])) {
                            continue;
                        }
                        $seen[$id] = true;
                        $props['source'] = 'San Fernando City Commercial Registry';
                        $props['distanceMeters'] = round($dist, 1);
                        $props['verified'] = true;
                        $f['properties'] = $props;
                        $results[] = $f;
                    }
                }
            }
        }

        return $results;
    }

    private static function parseOsmElements(array $elements, float $centerLat, float $centerLng, int $radiusMeters): array
    {
        $establishments = [];
        $roads = [];
        $seenOsmIds = [];

        foreach ($elements as $el) {
            $type = $el['type'] ?? '';
            $id = $el['id'] ?? null;
            $tags = $el['tags'] ?? [];
            if ($id === null) {
                continue;
            }

            $osmId = "osm:{$type}:{$id}";
            if (isset($seenOsmIds[$osmId])) {
                continue;
            }
            $seenOsmIds[$osmId] = true;

            // 1. Check if road (highway)
            if ($type === 'way' && isset($tags['highway'])) {
                $geom = $el['geometry'] ?? [];
                if (is_array($geom) && count($geom) >= 2) {
                    $coordinates = [];
                    foreach ($geom as $pt) {
                        if (isset($pt['lat'], $pt['lon'])) {
                            $coordinates[] = [(float) $pt['lon'], (float) $pt['lat']];
                        }
                    }
                    if (count($coordinates) >= 2) {
                        $roads[] = [
                            'type' => 'Feature',
                            'id' => $osmId,
                            'geometry' => [
                                'type' => 'LineString',
                                'coordinates' => $coordinates,
                            ],
                            'properties' => [
                                'id' => $osmId,
                                'name' => (string) ($tags['name'] ?? self::formatHighwayName($tags['highway'])),
                                'highway' => (string) $tags['highway'],
                                'surface' => (string) ($tags['surface'] ?? 'unknown'),
                                'status' => 'Available',
                                'note' => 'Mapped street segment: ' . ($tags['highway'] ?? 'road'),
                                'source' => 'OpenStreetMap contributors',
                            ],
                        ];
                    }
                }
                continue;
            }

            // 2. Check if establishment / business feature
            $businessType = self::detectBusinessType($tags);
            if ($businessType === null) {
                continue;
            }

            // Determine coordinates
            $ptLat = null;
            $ptLng = null;
            if ($type === 'node' && isset($el['lat'], $el['lon'])) {
                $ptLat = (float) $el['lat'];
                $ptLng = (float) $el['lon'];
            } elseif (in_array($type, ['way', 'relation'], true)) {
                $geom = $el['geometry'] ?? ($el['center'] ?? null);
                if (is_array($geom) && isset($geom['lat'], $geom['lon'])) {
                    $ptLat = (float) $geom['lat'];
                    $ptLng = (float) $geom['lon'];
                } elseif (is_array($geom) && count($geom) > 0) {
                    $sumLat = 0.0;
                    $sumLng = 0.0;
                    $count = 0;
                    foreach ($geom as $p) {
                        if (isset($p['lat'], $p['lon'])) {
                            $sumLat += (float) $p['lat'];
                            $sumLng += (float) $p['lon'];
                            $count++;
                        }
                    }
                    if ($count > 0) {
                        $ptLat = $sumLat / $count;
                        $ptLng = $sumLng / $count;
                    }
                }
            }

            if ($ptLat === null || $ptLng === null) {
                continue;
            }

            $distance = self::distance($centerLat, $centerLng, $ptLat, $ptLng);
            if ($distance > ($radiusMeters + 1.0)) {
                continue;
            }

            $name = (string) ($tags['name'] ?? ($tags['brand'] ?? self::formatFallbackName($businessType)));
            $establishments[] = [
                'type' => 'Feature',
                'id' => $osmId,
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [$ptLng, $ptLat],
                ],
                'properties' => [
                    'id' => $osmId,
                    'name' => $name,
                    'businessType' => $businessType,
                    'category' => $businessType,
                    'status' => 'unknown', // treat unverified operating status as unknown
                    'note' => ucfirst(str_replace('_', ' ', $businessType)),
                    'source' => 'OpenStreetMap contributors',
                    'distanceMeters' => round($distance, 1),
                    'tags' => array_keys($tags),
                ],
            ];
        }

        return ['establishments' => $establishments, 'roads' => $roads];
    }

    private static function mergeEstablishments(array $local, array $osm): array
    {
        $merged = [];
        $localPositions = [];

        // Add verified local records first
        foreach ($local as $loc) {
            $coords = $loc['geometry']['coordinates'] ?? [0, 0];
            $localPositions[] = [
                'name' => strtolower((string) ($loc['properties']['name'] ?? '')),
                'lng' => (float) $coords[0],
                'lat' => (float) $coords[1],
            ];
            $merged[] = $loc;
        }

        // Add OSM records unless they match a local verified record spatially (< 30m with similar name)
        foreach ($osm as $osmItem) {
            $coords = $osmItem['geometry']['coordinates'] ?? [0, 0];
            $oLng = (float) $coords[0];
            $oLat = (float) $coords[1];
            $oName = strtolower((string) ($osmItem['properties']['name'] ?? ''));

            $isDuplicateOfLocal = false;
            foreach ($localPositions as $locPos) {
                $dist = self::distance($oLat, $oLng, $locPos['lat'], $locPos['lng']);
                if ($dist < 35.0 && (str_contains($oName, $locPos['name']) || str_contains($locPos['name'], $oName))) {
                    $isDuplicateOfLocal = true;
                    break;
                }
            }

            if (!$isDuplicateOfLocal) {
                $merged[] = $osmItem;
            }
        }

        return $merged;
    }

    private static function detectBusinessType(array $tags): ?string
    {
        if (isset($tags['amenity'])) {
            return strtolower((string) $tags['amenity']);
        }
        if (isset($tags['shop'])) {
            return strtolower((string) $tags['shop']);
        }
        if (isset($tags['tourism'])) {
            return strtolower((string) $tags['tourism']);
        }
        if (isset($tags['office'])) {
            return 'office';
        }
        if (isset($tags['craft'])) {
            return strtolower((string) $tags['craft']);
        }
        if (isset($tags['commercial'])) {
            return 'commercial';
        }
        if (isset($tags['industrial'])) {
            return 'industrial';
        }
        return null;
    }

    private static function formatHighwayName(string $highway): string
    {
        return match ($highway) {
            'primary' => 'Primary Arterial Road',
            'secondary' => 'Secondary City Road',
            'tertiary' => 'Tertiary Collector Road',
            'residential' => 'Residential Street',
            'service' => 'Service Road / Access Lane',
            'trunk' => 'National Highway / Expressway',
            default => 'Local Road (' . ucfirst(str_replace('_', ' ', $highway)) . ')',
        };
    }

    private static function formatFallbackName(string $type): string
    {
        return 'Local ' . ucfirst(str_replace('_', ' ', $type));
    }
}
