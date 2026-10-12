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

    /** Validate the nearby endpoint's optional reference point before directory fallback. */
    public static function queryParameters(array $query): ?array
    {
        if (!array_key_exists('lat', $query) && !array_key_exists('lng', $query)) {
            return null;
        }
        $lat = $query['lat'] ?? null;
        $lng = $query['lng'] ?? null;
        if (!is_scalar($lat) || !is_scalar($lng) || !is_numeric($lat) || !is_numeric($lng)
            || !is_finite((float) $lat) || !is_finite((float) $lng) || abs((float) $lat) > 90 || abs((float) $lng) > 180
        ) {
            throw new InvalidArgumentException('Provide both valid latitude and longitude for nearby search.');
        }
        $radius = $query['radius'] ?? 500;
        if (!is_scalar($radius) || !is_numeric($radius) || !is_finite((float) $radius)
            || (float) $radius < 100 || (float) $radius > 1500 || floor((float) $radius) !== (float) $radius
        ) {
            throw new InvalidArgumentException('Nearby search radius must be a whole number between 100 and 1500 meters.');
        }
        return [
            'lat' => (float) $lat,
            'lng' => (float) $lng,
            'radius' => (int) $radius,
            'type' => is_string($query['type'] ?? null) ? trim($query['type']) : 'cafe',
        ];
    }

    /**
     * Search establishments and road segments within $radiusMeters of ($lat, $lng).
     */
    public static function search(float $lat, float $lng, int $radiusMeters = 500, string $businessType = 'cafe', array $options = []): array
    {
        if (!is_finite($lat) || abs($lat) > 90 || !is_finite($lng) || abs($lng) > 180) {
            throw new InvalidArgumentException('Invalid latitude or longitude coordinates.');
        }

        $radiusMeters = max(100, min(1500, $radiusMeters));
        $cacheDir = $options['cache_directory'] ?? dirname(__DIR__, 2) . '/data/cache/radar';
        $dataDir = $options['data_directory'] ?? dirname(__DIR__, 2) . '/data';
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0775, true);
        }

        // Coordinates are stored with six decimal places. Do not reuse another
        // reference point's distances merely because both round to four digits.
        $cacheKey = sprintf('radar_v2_%.6f_%.6f_%d.json', $lat, $lng, $radiusMeters);
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
                        return self::frameResult($cached, $lat, $lng, $radiusMeters);
                    }
                }
            }
        }

        // 2. Fetch from Overpass
        $osmData = null;
        try {
            $osmData = isset($options['fetcher']) ? ($options['fetcher'])($lat, $lng, $radiusMeters) : self::queryOverpass($lat, $lng, $radiusMeters);
            if (!is_array($osmData) || !is_array($osmData['elements'] ?? null)) {
                $osmData = null;
            }
        } catch (Throwable $e) {
            $osmData = null;
        }

        // 3. A stale cache is usable only for this exact reference point. A
        // neighboring search cannot cover the entire requested circle.
        if ($osmData === null) {
            $fallbackFile = is_file($cachePath) ? $cachePath : null;
            if ($fallbackFile !== null) {
                $raw = @file_get_contents($fallbackFile);
                if ($raw !== false) {
                    $cached = json_decode($raw, true);
                    if (is_array($cached) && isset($cached['features'])) {
                        $cached['cached'] = true;
                        $cached['stale'] = true;
                        $cached['warning'] = 'Showing older mapped records. Live nearby data is unavailable; operating status and inventory completeness are unverified.';
                        return self::frameResult($cached, $lat, $lng, $radiusMeters);
                    }
                }
            }
        }

        // 4. Load local verified records
        $localFeatures = self::loadLocalRecords($lat, $lng, $radiusMeters, $dataDir);

        // If Overpass failed and we have no cache and no local records, return clean empty result
        if ($osmData === null && empty($localFeatures)) {
            return self::frameResult([
                'type' => 'FeatureCollection',
                'features' => [],
                'roads' => [
                    'status' => 'Unavailable',
                    'geojson' => [
                        'type' => 'FeatureCollection',
                        'features' => [],
                    ],
                    'source' => 'Local commercial inventory',
                    'date' => gmdate('Y-m-d'),
                ],
                'center' => [$lat, $lng],
                'radius' => $radiusMeters,
                'source' => 'Local commercial inventory',
                'retrievalDate' => gmdate('Y-m-d'),
                'cached' => false,
                'stale' => false,
                'coverage' => 'local_only',
                'warning' => 'Live nearby data is unavailable and the local inventory has no matches. This does not establish zero businesses in the area.',
            ], $lat, $lng, $radiusMeters);
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
                'source' => $osmData !== null ? 'OpenStreetMap contributors (via Overpass API)' : 'Local commercial inventory',
                'date' => gmdate('Y-m-d'),
            ],
            'center' => [$lat, $lng],
            'radius' => $radiusMeters,
            'source' => $osmData !== null ? 'OpenStreetMap & local commercial inventory' : 'Local commercial inventory',
            'retrievalDate' => gmdate('Y-m-d'),
            'cached' => false,
            'stale' => false,
            'coverage' => $osmData !== null ? 'mapped_only' : 'local_only',
            'warning' => $osmData === null ? 'Live nearby data is unavailable. Showing matches from the local inventory; coverage is incomplete.'
                : (!empty($osmData['remark']) ? 'The map provider returned partial results. Nearby inventory and operating status remain unverified.' : null),
        ];
        $result = self::frameResult($result, $lat, $lng, $radiusMeters);

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
                if (is_array($decoded) && is_array($decoded['elements'] ?? null)) {
                    return $decoded;
                }
            }

            $lastError = "Overpass error ($mirror HTTP $statusCode" . ($curlError ? ": $curlError" : '') . ")";
        }

        throw new RuntimeException($lastError);
    }

    private static function loadLocalRecords(float $lat, float $lng, int $radiusMeters, ?string $dataDir = null): array
    {
        $dataDir ??= dirname(__DIR__, 2) . '/data';
        $results = [];
        $seen = [];

        // 1. Check data/competitors.json
        $compFile = $dataDir . '/competitors.json';
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
                    if ($dist <= ($radiusMeters + 0.000001) && !self::isClosed($f['properties'] ?? [])) {
                        $props = $f['properties'] ?? [];
                        $props['source'] = $props['source'] ?? 'Local Store Locator';
                        $props['distanceMeters'] = round($dist, 1);
                        $props['verified'] = (bool) ($props['verified'] ?? isset($props['locationSource']));
                        $props['status'] = ($props['status'] ?? '') === 'existing' ? 'operating' : ($props['status'] ?? 'unknown');
                        $props['businessType'] ??= 'fast_food';
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
        $commFile = $dataDir . '/commercial-directory.json';
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
                    if ($dist <= ($radiusMeters + 0.000001) && !self::isClosed($f['properties'] ?? [])) {
                        $props = $f['properties'] ?? [];
                        $name = $props['name'] ?? '';
                        $id = $f['id'] ?? $name;
                        if (isset($seen[$id])) {
                            continue;
                        }
                        $seen[$id] = true;
                        $props['source'] ??= 'Local Commercial Directory';
                        $props['distanceMeters'] = round($dist, 1);
                        $props['verified'] = (bool) ($props['verified'] ?? false);
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
            if ($id === null || !is_array($tags) || self::isClosed($tags)
                || strtolower((string) ($tags['opening_hours'] ?? '')) === 'closed'
                || in_array(strtolower((string) ($tags['disused'] ?? $tags['abandoned'] ?? '')), ['yes', 'true', '1'], true)
            ) {
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
            if ($distance > ($radiusMeters + 0.000001)) {
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
                    'nameGenerated' => !isset($tags['name']) && !isset($tags['brand']),
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
        $seen = [];
        // Deduplicate all source pairs, preserving first-source precedence and
        // separate merchants or branches at different locations.
        foreach (array_merge($local, $osm) as $feature) {
            $coords = self::pointCoordinates($feature);
            if ($coords === null || self::isClosed($feature['properties'] ?? [])) {
                continue;
            }
            $name = self::placeName((string) ($feature['properties']['name'] ?? ''));
            $id = $feature['id'] ?? $feature['properties']['id'] ?? null;
            if ($id !== null && isset($seen[(string) $id])) {
                continue;
            }
            $duplicate = false;
            foreach ($merged as $existing) {
                $other = self::pointCoordinates($existing);
                $otherName = self::placeName((string) ($existing['properties']['name'] ?? ''));
                if (empty($feature['properties']['nameGenerated']) && empty($existing['properties']['nameGenerated'])
                    && $name !== '' && $otherName !== '' && min(strlen($name), strlen($otherName)) >= 3
                    && (str_contains($name, $otherName) || str_contains($otherName, $name))
                    && self::distance($coords[1], $coords[0], $other[1], $other[0]) < 35.0
                ) { $duplicate = true; break; }
            }
            if ($duplicate) {
                continue;
            }
            if ($id !== null) { $seen[(string) $id] = true; }
            $merged[] = $feature;
        }
        return $merged;
    }

    private static function frameResult(array $result, float $lat, float $lng, int $radiusMeters): array
    {
        $features = [];
        foreach ($result['features'] ?? [] as $feature) {
            if (!is_array($feature)) { continue; }
            $coords = self::pointCoordinates($feature);
            if ($coords === null) { continue; }
            $distance = self::distance($lat, $lng, $coords[1], $coords[0]);
            if ($distance > $radiusMeters + 0.000001) { continue; }
            $feature['properties']['distanceMeters'] = round($distance, 1);
            $feature['properties']['isBusiness'] = self::isBusiness($feature['properties'] ?? []);
            $features[] = $feature;
        }
        $features = self::mergeEstablishments($features, []);
        usort($features, static fn (array $a, array $b): int => $a['properties']['distanceMeters'] <=> $b['properties']['distanceMeters']);
        $roads = [];
        foreach ($result['roads']['geojson']['features'] ?? [] as $road) {
            if (!is_array($road)) { continue; }
            $distance = self::roadDistance($road, $lat, $lng);
            if ($distance !== null && $distance <= $radiusMeters + 0.000001) {
                $road['properties']['distanceMeters'] = round($distance, 1);
                $roads[] = $road;
            }
        }
        $result['features'] = $features;
        $result['roads']['geojson'] = ['type' => 'FeatureCollection', 'features' => $roads];
        $result['roads']['status'] = $roads !== [] ? 'Available'
            : (($result['roads']['status'] ?? '') === 'Unavailable' ? 'Unavailable' : 'None nearby');
        $result['center'] = [$lat, $lng];
        $result['radius'] = $radiusMeters;
        $result['radiusMeters'] = $radiusMeters;
        $result['coverage'] = ($result['coverage'] ?? '') === 'local_only' ? 'local_only' : 'mapped_only';
        $businesses = array_filter($features, static fn (array $feature): bool => self::isBusiness($feature['properties'] ?? []));
        $operating = array_filter($businesses, static fn (array $feature): bool => in_array(strtolower((string) ($feature['properties']['status'] ?? '')), ['operating', 'existing'], true));
        $area = M_PI * ($radiusMeters / 1000) ** 2;
        $result['metrics'] = [
            'observedPlaceCount' => count($features),
            'observedBusinessCount' => count($businesses),
            'observedOperatingBusinessCount' => count($operating),
            'roadSegmentCount' => count($roads),
            'searchAreaSqKm' => $area,
            'observedBusinessesPerSqKm' => round(count($businesses) / $area, 2),
            'businessesPerSqKm' => null,
            'completeInventory' => false,
        ];
        $result['coverageNote'] = 'These are observed mapped places in a straight-line circle, not a complete operating-business inventory. Zero matches do not prove that no businesses exist.';
        return $result;
    }

    private static function pointCoordinates(array $feature): ?array
    {
        $coords = $feature['geometry']['coordinates'] ?? null;
        if (($feature['geometry']['type'] ?? null) !== 'Point' || !is_array($coords) || count($coords) < 2
            || !is_numeric($coords[0]) || !is_numeric($coords[1])
        ) { return null; }
        $lng = (float) $coords[0]; $lat = (float) $coords[1];
        return is_finite($lat) && is_finite($lng) && abs($lat) <= 90 && abs($lng) <= 180 ? [$lng, $lat] : null;
    }

    private static function placeName(string $name): string
    {
        return trim((string) preg_replace('/[^a-z0-9]+/', ' ', strtolower($name)));
    }

    private static function isClosed(array $properties): bool
    {
        $status = strtolower(trim((string) ($properties['status'] ?? $properties['operating_status'] ?? '')));
        return in_array($status, ['closed', 'temporarily_closed', 'permanently_closed', 'disused', 'demolished', 'abandoned'], true)
            || preg_match('/\b(?:temporarily|permanently)?\s*closed\b/i', (string) ($properties['note'] ?? '')) === 1;
    }

    private static function isBusiness(array $properties): bool
    {
        $category = strtolower((string) ($properties['categoryKey'] ?? $properties['businessType'] ?? $properties['category'] ?? $properties['amenity'] ?? ''));
        return $category !== '' && !in_array($category, ['school', 'college', 'university', 'townhall', 'courthouse', 'police', 'fire_station', 'place_of_worship', 'community_centre', 'library', 'toilets', 'parking', 'motorcycle_parking', 'bicycle_parking', 'bench', 'waste_basket', 'drinking_water', 'fountain', 'grave_yard', 'viewpoint', 'recycling', 'atm'], true);
    }

    private static function roadDistance(array $road, float $lat, float $lng): ?float
    {
        $geometry = $road['geometry'] ?? [];
        $lines = ($geometry['type'] ?? '') === 'LineString' ? [$geometry['coordinates'] ?? []]
            : (($geometry['type'] ?? '') === 'MultiLineString' ? ($geometry['coordinates'] ?? []) : []);
        $minimum = INF;
        $scaleX = M_PI / 180 * self::EARTH_RADIUS * cos(deg2rad($lat));
        $scaleY = M_PI / 180 * self::EARTH_RADIUS;
        foreach ($lines as $line) {
            if (!is_array($line)) { continue; }
            for ($index = 1; $index < count($line); $index++) {
                $a = $line[$index - 1]; $b = $line[$index];
                if (!is_array($a) || !is_array($b) || count($a) < 2 || count($b) < 2
                    || !is_numeric($a[0]) || !is_numeric($a[1]) || !is_numeric($b[0]) || !is_numeric($b[1])
                    || abs((float) $a[0]) > 180 || abs((float) $b[0]) > 180 || abs((float) $a[1]) > 90 || abs((float) $b[1]) > 90
                ) { continue; }
                $ax = ($a[0] - $lng) * $scaleX; $ay = ($a[1] - $lat) * $scaleY;
                $bx = ($b[0] - $lng) * $scaleX; $by = ($b[1] - $lat) * $scaleY;
                $dx = $bx - $ax; $dy = $by - $ay;
                $lengthSquared = $dx ** 2 + $dy ** 2;
                $t = $lengthSquared > 0 ? max(0, min(1, -($ax * $dx + $ay * $dy) / $lengthSquared)) : 0;
                $minimum = min($minimum, hypot($ax + $t * $dx, $ay + $t * $dy));
            }
        }
        return is_finite($minimum) ? $minimum : null;
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
