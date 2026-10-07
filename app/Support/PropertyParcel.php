<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;
use Throwable;

require_once __DIR__ . '/PropertyEvidenceFiles.php';

/** Parcel geometry and staff observations are context, never submitted assessment scores. */
final class PropertyParcel
{
    private const EARTH_RADIUS = 6371008.8;
    private const OBSERVATIONS = [
        'road_frontage' => ['yes', 'no', 'not_verified'],
        'road_surface' => ['paved', 'unpaved', 'gravel', 'other', 'not_verified'],
        'electricity' => ['available', 'unavailable', 'not_verified'],
        'water' => ['available', 'unavailable', 'not_verified'],
        'internet' => ['available', 'unavailable', 'not_verified'],
    ];

    public static function fromPayload(array $payload, array $existing = []): array
    {
        $boundary = array_key_exists('boundary', $payload)
            ? self::boundary($payload['boundary']) : self::boundary($existing['boundary'] ?? null);
        $estimated = $boundary === null ? null : round(self::area($boundary), 2);
        $survey = $existing['surveyAreaSqm'] ?? null;
        // Explicit null retains historical area, matching the existing property PATCH contract.
        $area = $payload['land_area'] ?? $payload['area'] ?? null;
        if ($area !== null) {
            $survey = self::optionalNumber($area, 'Recorded survey area');
            $rawUnit = $payload['land_area_unit'] ?? $payload['landAreaUnit'] ?? 'ha';
            if (!is_string($rawUnit)) { throw new InvalidArgumentException('Choose square meters or hectares for the survey area.'); }
            $unit = strtolower(trim($rawUnit));
            if (!in_array($unit, ['ha', 'hectare', 'hectares', 'sqm', 'm2', 'square_meter', 'square_meters'], true)) {
                throw new InvalidArgumentException('Choose square meters or hectares for the survey area.');
            }
            if ($survey !== null && in_array($unit, ['ha', 'hectare', 'hectares'], true)) { $survey *= 10000; }
            if ($survey !== null && $survey <= 0) { throw new InvalidArgumentException('Recorded survey area must be greater than zero.'); }
        }
        $reference = $existing['referencePoint'] ?? null;
        if (array_key_exists('reference_lat', $payload) || array_key_exists('reference_lng', $payload)) {
            $lat = self::optionalNumber($payload['reference_lat'] ?? null, 'Reference latitude');
            $lng = self::optionalNumber($payload['reference_lng'] ?? null, 'Reference longitude');
            if (($lat === null) !== ($lng === null) || ($lat !== null && (abs($lat) > 90 || abs($lng) > 180))) {
                throw new InvalidArgumentException('Choose a valid reference point for the surroundings radar.');
            }
            $reference = $lat === null ? null : ['label' => self::text($payload['reference_label'] ?? 'Property entrance', 'Reference point label', 120), 'lat' => round($lat, 6), 'lng' => round($lng, 6)];
        } elseif (array_key_exists('reference_label', $payload) && $reference !== null) {
            $reference['label'] = self::text($payload['reference_label'], 'Reference point label', 120);
        }
        $observations = is_array($existing['observations'] ?? null) ? $existing['observations'] : [];
        foreach (self::OBSERVATIONS as $key => $allowed) {
            if (!array_key_exists($key, $payload)) { continue; }
            if (!is_string($payload[$key]) || !in_array($payload[$key], $allowed, true)) {
                throw new InvalidArgumentException('Choose a valid ' . str_replace('_', ' ', $key) . ' observation.');
            }
            $observations[$key] = $payload[$key];
        }
        if (array_key_exists('bir_zonal_value', $payload)) {
            $value = self::optionalNumber($payload['bir_zonal_value'], 'BIR zonal reference');
            if ($value !== null && $value <= 0) { throw new InvalidArgumentException('BIR zonal reference must be greater than zero.'); }
            $observations['bir_zonal_value'] = $value;
        }
        foreach (['bir_source', 'evidence_reference', 'environmental_reference'] as $key) {
            if (array_key_exists($key, $payload)) { $observations[$key] = self::text($payload[$key], str_replace('_', ' ', $key), 3000); }
        }
        if (array_key_exists('bir_date', $payload)) {
            $date = self::text($payload['bir_date'], 'BIR reference date', 10);
            if ($date !== '' && (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/D', $date, $parts) || !checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1]))) {
                throw new InvalidArgumentException('Enter a valid BIR reference date.');
            }
            $observations['bir_date'] = $date;
        }
        return ['boundary' => $boundary, 'estimatedAreaSqm' => $estimated,
            'surveyAreaSqm' => $survey === null ? null : round((float) $survey, 2),
            'referencePoint' => $reference, 'observations' => $observations,
            'attachments' => PropertyEvidenceFiles::normalizeAttachments($payload['evidence_attachments'] ?? $existing['attachments'] ?? [])];
    }

    /** A single simple closed outer ring; no client properties or calculated area are trusted. */
    public static function boundary(mixed $value): ?array
    {
        if ($value === null || $value === '') { return null; }
        if (is_string($value)) {
            if (strlen($value) > 150000) { throw new InvalidArgumentException('The parcel boundary is too large.'); }
            try { $value = json_decode($value, true, 16, JSON_THROW_ON_ERROR); }
            catch (Throwable) { throw new InvalidArgumentException('The parcel boundary must be valid GeoJSON.'); }
        }
        if (!is_array($value) || ($value['type'] ?? '') !== 'Feature' || isset($value['crs']) || !is_array($value['geometry'] ?? null)
            || ($value['geometry']['type'] ?? '') !== 'Polygon' || isset($value['geometry']['crs'])
            || !is_array($value['geometry']['coordinates'] ?? null) || count($value['geometry']['coordinates']) !== 1) {
            throw new InvalidArgumentException('Draw one closed parcel polygon without holes.');
        }
        $ring = $value['geometry']['coordinates'][0] ?? null;
        if (!is_array($ring) || !self::isList($ring) || count($ring) < 4 || count($ring) > 1001) {
            throw new InvalidArgumentException('A parcel boundary needs 3 to 1,000 vertices and a closing point.');
        }
        $points = [];
        foreach ($ring as $point) {
            if (!is_array($point) || !self::isList($point) || count($point) !== 2
                || !is_int($point[0]) && !is_float($point[0]) || !is_int($point[1]) && !is_float($point[1])
                || !is_finite((float) $point[0]) || !is_finite((float) $point[1]) || abs($point[0]) > 180 || abs($point[1]) > 90) {
                throw new InvalidArgumentException('Boundary coordinates must be WGS84 longitude and latitude.');
            }
            $points[] = [(float) $point[0], (float) $point[1]];
        }
        $count = count($points) - 1;
        if ($points[0] !== $points[$count]) { throw new InvalidArgumentException('Close the parcel boundary before saving.'); }
        $unique = [];
        for ($i = 0; $i < $count; $i++) {
            $key = json_encode($points[$i], JSON_PRESERVE_ZERO_FRACTION);
            if (isset($unique[$key]) || abs($points[$i][0] - $points[$i + 1][0]) > 180) {
                throw new InvalidArgumentException('Remove repeated vertices or unsupported boundary edges.');
            }
            $unique[$key] = true;
            // Reject an adjacent edge that doubles back over its predecessor.
            $previous = $points[($i + $count - 1) % $count];
            $next = $points[($i + 1) % $count];
            if (abs(self::cross($previous, $points[$i], $next)) < 1e-14
                && (($previous[0] - $points[$i][0]) * ($next[0] - $points[$i][0]) + ($previous[1] - $points[$i][1]) * ($next[1] - $points[$i][1])) > 0) {
                throw new InvalidArgumentException('The parcel boundary cannot double back over itself.');
            }
            for ($j = 0; $j < $i - 1; $j++) {
                if ($i === $count - 1 && $j === 0) { continue; }
                if (self::segmentsIntersect($points[$i], $points[$i + 1], $points[$j], $points[$j + 1])) {
                    throw new InvalidArgumentException('The parcel boundary cannot cross or touch itself.');
                }
            }
        }
        $feature = ['type' => 'Feature', 'properties' => (object) [], 'geometry' => ['type' => 'Polygon', 'coordinates' => [$points]]];
        if (self::area($feature) < 0.01) { throw new InvalidArgumentException('The drawn boundary must enclose a measurable area.'); }
        return $feature;
    }

    /** Spherical GeoJSON area using the same ring formula and mean Earth radius as Turf. */
    public static function area(array $boundary): float
    {
        $ring = $boundary['geometry']['coordinates'][0];
        $count = count($ring) - 1;
        $sum = 0.0;
        for ($i = 0; $i < $count; $i++) {
            $previous = $ring[($i + $count - 1) % $count];
            $next = $ring[($i + 1) % $count];
            $sum += deg2rad($next[0] - $previous[0]) * sin(deg2rad($ring[$i][1]));
        }
        return abs($sum * self::EARTH_RADIUS * self::EARTH_RADIUS / 2);
    }

    private static function cross(array $a, array $b, array $c): float
    {
        return ($b[0] - $a[0]) * ($c[1] - $a[1]) - ($b[1] - $a[1]) * ($c[0] - $a[0]);
    }

    private static function segmentsIntersect(array $a, array $b, array $c, array $d): bool
    {
        if (max($a[0], $b[0]) < min($c[0], $d[0]) || max($c[0], $d[0]) < min($a[0], $b[0])
            || max($a[1], $b[1]) < min($c[1], $d[1]) || max($c[1], $d[1]) < min($a[1], $b[1])) { return false; }
        $first = self::cross($a, $b, $c); $second = self::cross($a, $b, $d);
        $third = self::cross($c, $d, $a); $fourth = self::cross($c, $d, $b);
        $epsilon = 1e-14;
        return (($first >= -$epsilon && $second <= $epsilon) || ($second >= -$epsilon && $first <= $epsilon))
            && (($third >= -$epsilon && $fourth <= $epsilon) || ($fourth >= -$epsilon && $third <= $epsilon));
    }

    private static function optionalNumber(mixed $value, string $label): ?float
    {
        if ($value === null || $value === '') { return null; }
        if (is_string($value)) { $value = str_replace(',', '', trim($value)); }
        if (!is_numeric($value) || !is_finite((float) $value)) { throw new InvalidArgumentException($label . ' must be a valid number.'); }
        return (float) $value;
    }

    private static function isList(array $value): bool
    {
        return array_keys($value) === ($value === [] ? [] : range(0, count($value) - 1));
    }

    private static function text(mixed $value, string $label, int $limit): string
    {
        if (!is_string($value) || strlen($value) > $limit) { throw new InvalidArgumentException($label . ' must be short text.'); }
        return trim($value);
    }

    /** Only verified local sources are published; existing illustration overlays are excluded. */
    public static function context(array $config): array
    {
        $result = [];
        $hazards = self::loadSource($config, 'hazards', ['Polygon', 'MultiPolygon']);
        foreach (['flood', 'faults', 'roads'] as $key) {
            $allowed = $key === 'roads' ? ['LineString', 'MultiLineString'] : ($key === 'faults' ? ['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'] : ['Polygon', 'MultiPolygon']);
            $source = self::loadSource($config, $key, $allowed);
            if ($source === null && $key !== 'roads' && $hazards !== null) {
                $type = $key === 'flood' ? 'flood' : 'fault';
                $types = $hazards['manifest']['hazard_types'] ?? [];
                $matchingTypes = array_values(array_filter($types, static fn ($value): bool => is_string($value) && preg_match('/(^|[_\s-])' . $type . '([_\s-]|$)/i', $value) === 1));
                if ($matchingTypes !== []) {
                    $source = $hazards;
                    $source['features'] = array_values(array_filter($hazards['features'], static fn ($feature): bool => in_array($feature['properties']['hazard_type'] ?? null, $matchingTypes, true)));
                }
            }
            $manifest = $source['manifest'] ?? [];
            $entry = ['status' => $source === null ? 'Not assessed' : 'Available',
                'geojson' => ['type' => 'FeatureCollection', 'features' => $source['features'] ?? []],
                'source' => $manifest['source'] ?? null, 'reference' => $manifest['reference'] ?? null,
                'date' => $manifest['effective_date'] ?? $manifest['verified_at'] ?? null,
                'verifiedAt' => $manifest['verified_at'] ?? null, 'version' => $manifest['version'] ?? null,
                'coverage' => $manifest['coverage'] ?? null, 'complete' => ($manifest['complete'] ?? false) === true,
                'message' => $source === null ? 'Not assessed. Add verified source data and confirm its coverage.' : 'Review the parcel against the stated source coverage.'];
            if ($key === 'faults') {
                $buffer = $config['parcel_context']['fault_buffer'] ?? [];
                $meters = is_numeric($buffer['meters'] ?? null) ? (float) $buffer['meters'] : null;
                $approved = ($buffer['approved'] ?? false) === true && is_string($buffer['approval_reference'] ?? null) && trim($buffer['approval_reference']) !== '' && $meters !== null && $meters > 0 && $meters <= 50000;
                $entry['bufferMeters'] = $approved ? $meters : null;
                $entry['bufferApproved'] = $approved;
                $entry['bufferReference'] = $approved ? $buffer['approval_reference'] : null;
                if ($source !== null && !$approved && array_filter($source['features'], static fn ($feature): bool => in_array($feature['geometry']['type'], ['LineString', 'MultiLineString'], true))) {
                    $entry['status'] = 'Not assessed';
                    $entry['message'] = 'Not assessed. The relevant office must confirm the fault review buffer.';
                }
            }
            $result[$key] = $entry;
        }
        return $result;
    }

    private static function loadSource(array $config, string $key, array $allowed): ?array
    {
        $manifest = $config['layers'][$key] ?? null;
        if (!is_array($manifest) || ($manifest['verified'] ?? false) !== true || ($manifest['crs'] ?? '') !== 'EPSG:4326') { return null; }
        foreach (['source', 'version', 'reference', 'verified_by', 'verified_at', 'sha256'] as $required) {
            if (!is_string($manifest[$required] ?? null) || trim($manifest[$required]) === '') { return null; }
        }
        if (!self::sourceGeometry($manifest['coverage'] ?? null, ['Polygon', 'MultiPolygon'])) { return null; }
        try {
            $directory = realpath((string) ($config['data_directory'] ?? ''));
            $file = $manifest['file'] ?? null;
            if ($directory === false || !is_string($file) || $file === '' || preg_match('/(^[\\\\\/]|^[a-zA-Z]:|:|\.\.)/', $file)) { return null; }
            $path = realpath($directory . DIRECTORY_SEPARATOR . $file);
            if ($path === false || !str_starts_with(strtolower($path), strtolower($directory . DIRECTORY_SEPARATOR)) || !is_file($path) || filesize($path) > 20000000) { return null; }
            $json = file_get_contents($path);
            if ($json === false || !hash_equals(strtolower($manifest['sha256']), hash('sha256', $json))) { return null; }
            $data = json_decode($json, true, 128, JSON_THROW_ON_ERROR);
            if (($data['type'] ?? '') !== 'FeatureCollection' || isset($data['crs']) || !is_array($data['features'] ?? null) || !self::isList($data['features']) || count($data['features']) > 20000) { return null; }
            foreach ($data['features'] as $feature) {
                if (!is_array($feature) || ($feature['type'] ?? '') !== 'Feature' || !is_array($feature['properties'] ?? null) || !self::sourceGeometry($feature['geometry'] ?? null, $allowed)) { return null; }
                if ($key === 'hazards' && (!is_string($feature['properties']['hazard_type'] ?? null) || !is_string($feature['properties']['hazard_status'] ?? null))) { return null; }
            }
            return ['manifest' => $manifest, 'features' => $data['features']];
        } catch (Throwable) { return null; }
    }

    private static function sourceGeometry(mixed $geometry, array $allowed): bool
    {
        if (!is_array($geometry) || !in_array($geometry['type'] ?? '', $allowed, true) || isset($geometry['crs']) || !is_array($geometry['coordinates'] ?? null) || !self::isList($geometry['coordinates'])) { return false; }
        $coordinates = $geometry['coordinates'];
        $lines = match ($geometry['type']) {
            'LineString' => [$coordinates], 'Polygon', 'MultiLineString' => $coordinates,
            'MultiPolygon' => self::polygonRings($coordinates), default => [],
        };
        $polygon = in_array($geometry['type'], ['Polygon', 'MultiPolygon'], true);
        if (!$lines || count($lines) > 20000) { return false; }
        foreach ($lines as $line) {
            if (!is_array($line) || !self::isList($line) || count($line) < ($polygon ? 4 : 2) || count($line) > 20000) { return false; }
            foreach ($line as $i => $point) {
                if (!is_array($point) || !self::isList($point) || count($point) < 2 || !is_numeric($point[0]) || !is_numeric($point[1]) || !is_finite((float) $point[0]) || !is_finite((float) $point[1]) || abs((float) $point[0]) > 180 || abs((float) $point[1]) > 90 || ($i > 0 && abs($point[0] - $line[$i - 1][0]) > 180)) { return false; }
            }
            if ($polygon && array_slice($line[0], 0, 2) !== array_slice($line[count($line) - 1], 0, 2)) { return false; }
            if ($polygon) {
                $twiceArea = 0.0;
                $origin = $line[0];
                for ($i = 1; $i < count($line); $i++) {
                    $twiceArea += ($line[$i - 1][0] - $origin[0]) * ($line[$i][1] - $origin[1]) - ($line[$i][0] - $origin[0]) * ($line[$i - 1][1] - $origin[1]);
                }
                if (abs($twiceArea) < 1e-12) { return false; }
            }
        }
        return true;
    }

    private static function polygonRings(array $polygons): array
    {
        $rings = [];
        foreach ($polygons as $polygon) {
            if (!is_array($polygon) || !self::isList($polygon) || !$polygon) { return []; }
            foreach ($polygon as $ring) { $rings[] = $ring; }
        }
        return $rings;
    }
}
