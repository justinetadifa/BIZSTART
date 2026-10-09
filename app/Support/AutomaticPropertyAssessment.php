<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;
use Throwable;

require_once __DIR__ . '/PropertyAssessment.php';

/** Reads trusted, versioned local evidence; request data can never supply scores or layers. */
final class AutomaticPropertyAssessment
{
    public const VERSION = 'locus-auto-v1';
    private const EARTH_RADIUS = 6371008.8;
    private const METRICS = [
        'spatial_accessibility' => ['roads', 'road_distance_m', 'Distance to mapped road', 'm'],
        'infrastructure_readiness' => ['utilities', 'utility_status', 'Verified utility service', null],
        'economic_viability' => ['valuation', 'bir_value_sqm', 'BIR zonal value', 'PHP/m²'],
        'nearby_businesses' => ['businesses', 'business_count', 'Operating businesses within radius', 'businesses'],
        'zoning_compatibility' => ['zoning', 'zoning_status', 'Category compatibility with zoning', null],
        'risk_constraints' => ['hazards', 'hazard_status', 'Mapped hazard exposure', null],
        'environmental_safety' => ['environment', 'environment_status', 'Verified environmental classification', null],
    ];
    private array $config;
    private array $loaded = [];

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public static function configured(): self
    {
        $config = require dirname(__DIR__) . '/config.php';
        return new self($config['automatic_assessment'] ?? require dirname(__DIR__) . '/assessment-sources.php');
    }

    public static function presentStored(array $criteria, array $metadata = [], array $history = []): array
    {
        $scores = PropertyAssessment::scores($criteria);
        if (($metadata['assessmentMode'] ?? '') === 'automatic' && ($metadata['assessmentVersion'] ?? '') === self::VERSION) {
            // Recompute totals from stored server criteria, while retaining the original evidence snapshot.
            return array_merge($metadata, $scores, [
                'assessmentMethod' => (string) ($metadata['assessmentMethod'] ?? ''),
                'automaticAssessment' => $metadata, 'legacyAssessment' => $history ?: null,
            ]);
        }
        return array_merge($scores, [
            'assessmentMode' => 'legacy_manual', 'assessmentVersion' => null, 'criteriaDetails' => [], 'spatialContext' => [],
            'completedCount' => count(array_filter($scores['assessmentCriteria'], static fn ($value): bool => $value !== null)),
            'totalCount' => 7, 'automaticAssessment' => null, 'legacyAssessment' => $history ?: null,
        ]);
    }

    /** Matches repository storage: hectares; square metre aliases divide by 10,000. */
    public static function normalizeInputs(array $input): array
    {
        $lat = self::number($input['lat'] ?? null);
        $lng = self::number($input['lng'] ?? null);
        if (($lat === null) !== ($lng === null) || ($lat !== null && ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180))
            || (isset($input['lat']) && $input['lat'] !== '' && $lat === null) || (isset($input['lng']) && $input['lng'] !== '' && $lng === null)) {
            throw new InvalidArgumentException('Provide both valid latitude and longitude, or leave both blank.');
        }
        $rawArea = $input['land_area'] ?? $input['landArea'] ?? $input['area'] ?? null;
        if ($rawArea === null || $rawArea === '') {
            $area = null;
        } else {
            $area = self::number(is_string($rawArea) ? str_replace(',', '', trim($rawArea)) : $rawArea);
            $unit = strtolower(trim((string) ($input['land_area_unit'] ?? $input['landAreaUnit'] ?? 'ha')));
            if (in_array($unit, ['sqm', 'm2', 'square_meter', 'square_meters'], true) && $area !== null) {
                $area /= 10000;
            }
            if ($area === null || $area <= 0 || round($area, 4) <= 0) {
                throw new InvalidArgumentException('Land area must be greater than zero.');
            }
        }
        if ($lat === null && $area === null) {
            throw new InvalidArgumentException('Enter a positive area size or select the exact property location.');
        }
        [$category, $subcategory] = PropertyCatalog::normalizeCategory(
            isset($input['category']) ? (string) $input['category'] : null,
            isset($input['subcategory']) ? (string) $input['subcategory'] : null,
            (string) ($input['property_type'] ?? $input['type'] ?? 'Land')
        );
        return ['lat' => $lat === null ? null : round($lat, 6), 'lng' => $lng === null ? null : round($lng, 6), 'category' => $category, 'subcategory' => $subcategory, 'landArea' => $area === null ? null : round($area, 4), 'landAreaUnit' => 'hectares'];
    }

    public function evaluate(array $input): array
    {
        $inputs = self::normalizeInputs($input);
        $point = [$inputs['lng'], $inputs['lat']];
        $method = is_array($this->config['method'] ?? null) ? $this->config['method'] : [];
        $approved = ($method['approved'] ?? false) === true && is_string($method['version'] ?? null) && trim($method['version']) !== ''
            && is_string($method['approval_reference'] ?? null) && trim($method['approval_reference']) !== '';
        $criteria = [];
        $details = [];
        $context = [];
        foreach (self::METRICS as $key => [$layerKey, $metric, $label, $unit]) {
            $measurement = $inputs['lat'] === null
                ? ['raw' => [], 'evidence' => [], 'missingData' => ['An exact property location is needed to assess city evidence layers.'], 'justification' => 'Area size is recorded. Spatial assessment will be available after the exact location is added.']
                : $this->measure($layerKey, $point, $inputs);
            $missing = $measurement['missingData'];
            $score = null;
            $ruleText = null;
            if (!$approved) {
                $missing[] = 'A department-approved, versioned conversion method and approval reference are required.';
            } elseif (!$missing) {
                [$score, $ruleText, $ruleError] = $this->convert($measurement['raw'], $method['rules'][$key] ?? null, $metric);
                if ($ruleError !== null) {
                    $missing[] = $ruleError;
                }
            }
            $criteria[$key] = $score;
            $justification = $measurement['justification'];
            if ($ruleText !== null) {
                $justification .= ' ' . $ruleText;
            }
            if ($missing) {
                $justification .= ' Pending: ' . implode(' ', $missing);
            }
            $details[$key] = [
                'label' => PropertyCatalog::criteria()[$key], 'weight' => PropertyAssessment::WEIGHTS[$key],
                'score' => $score, 'status' => $score === null ? 'missing_data' : 'ready',
                'raw' => $measurement['raw'], 'evidence' => $measurement['evidence'],
                'justification' => trim($justification), 'missingData' => array_values(array_unique($missing)),
                'conversion' => $ruleText,
            ];
            $context[] = ['key' => $metric, 'label' => $label, 'value' => $measurement['raw'][$metric] ?? null, 'unit' => $unit,
                'status' => $measurement['missingData'] ? 'missing_data' : 'ready',
                'justification' => $measurement['justification'], 'evidence' => $measurement['evidence']];
            if ($layerKey === 'businesses') {
                $context[] = ['key' => 'nearest_business_distance_m', 'label' => 'Nearest observed operating business', 'value' => $measurement['raw']['nearest_business_distance_m'] ?? null,
                    'unit' => 'm', 'status' => isset($measurement['raw']['nearest_business_distance_m']) ? 'ready' : 'missing_data',
                    'justification' => 'Observed mapped points only; an incomplete inventory does not establish that other businesses are absent.', 'evidence' => $measurement['evidence']];
            }
        }
        $scores = PropertyAssessment::scores($criteria);
        return array_merge($scores, [
            'assessmentMode' => 'automatic', 'assessmentVersion' => self::VERSION,
            'assessmentMethod' => 'Automatic evidence-based assessment. Distances use WGS84 coordinates and a spherical great-circle model (Earth radius 6,371,008.8 m). Scores require verified coverage and an approved conversion rule. All seven criteria are required. MCE = Σ(score × weight)/100, rounded to one decimal. IAI = 60% rounded MCE + 20% economic viability + 20% infrastructure readiness, rounded to one decimal. This model is decision support; it does not issue zoning, hazard or investment clearance.',
            'completedCount' => count(array_filter($criteria, static fn ($value): bool => $value !== null)), 'totalCount' => 7,
            'inputs' => $inputs, 'criteriaDetails' => $details, 'spatialContext' => $context,
            'generatedAt' => gmdate('c'), 'ruleVersion' => $approved ? (string) $method['version'] : null,
            'ruleApprovalReference' => $approved ? (string) $method['approval_reference'] : null,
            'ruleFingerprint' => $approved ? hash('sha256', json_encode($method, JSON_THROW_ON_ERROR)) : null,
        ]);
    }

    private function measure(string $key, array $point, array $input): array
    {
        $result = ['raw' => [], 'evidence' => [], 'missingData' => [], 'justification' => ''];
        [$layer, $error] = $this->layer($key);
        if ($error !== null) {
            $result['missingData'][] = $error;
            return $result;
        }
        $manifest = $layer['manifest'];
        $result['evidence'][] = ['layer' => $key, 'source' => $manifest['source'], 'version' => $manifest['version'],
            'reference' => $manifest['reference'], 'verifiedAt' => $manifest['verified_at'], 'sha256' => $manifest['sha256']];
        if (!self::contains($point, $manifest['coverage'])) {
            $result['missingData'][] = 'The site falls outside the verified ' . $key . ' coverage.';
            return $result;
        }
        $features = $layer['features'];
        if ($key === 'roads') {
            $nearest = self::nearest($point, $features, ['LineString', 'MultiLineString']);
            if ($nearest === null || ($manifest['complete'] ?? false) !== true || !self::bufferCovered($point, $manifest['coverage'], $nearest['distance'])) {
                $result['missingData'][] = 'A complete mapped road inventory covering the nearest-road search radius is required.';
                return $result;
            }
            $result['raw'] = ['road_distance_m' => $nearest['distance'], 'road_feature_id' => $nearest['id']];
            $result['justification'] = 'Nearest verified road centreline is ' . round($nearest['distance'], 2) . ' m away; straight-line proximity does not confirm a legal entrance or travel route.';
        } elseif ($key === 'businesses') {
            $radius = self::number($this->config['business_radius_m'] ?? null);
            if ($radius === null || $radius <= 0 || $radius > 50000) {
                $result['missingData'][] = 'A valid business search radius (greater than 0 and at most 50,000 m) is required.';
                return $result;
            }
            $active = array_values(array_filter($features, static fn ($feature): bool => ($feature['properties']['operating_status'] ?? null) === 'operating' && ($feature['geometry']['type'] ?? '') === 'Point'));
            $count = 0;
            foreach ($active as $feature) {
                if (self::distance($point, $feature['geometry']['coordinates']) <= $radius) {
                    $count++;
                }
            }
            $nearest = self::nearest($point, $active, ['Point']);
            $result['raw'] = ['observed_business_count' => $count, 'business_radius_m' => $radius, 'nearest_business_distance_m' => $nearest['distance'] ?? null];
            $result['justification'] = $count . ' verified operating business points observed within ' . $radius . ' m.';
            if (($manifest['complete'] ?? false) !== true || !self::bufferCovered($point, $manifest['coverage'], $radius)) {
                $result['missingData'][] = 'A complete operating-business inventory covering the entire search circle is required; partial pins cannot measure business density.';
            } else {
                $result['raw']['business_count'] = $count;
            }
        } else {
            $matches = array_values(array_filter($features, static fn ($feature): bool => self::contains($point, $feature['geometry'])));
            if ($key === 'hazards') {
                if (($manifest['complete'] ?? false) !== true || !is_array($manifest['hazard_types'] ?? null) || !$manifest['hazard_types']) {
                    $result['missingData'][] = 'Verified complete hazard coverage identifying all evaluated hazard types is required; an empty overlay does not mean safe.';
                    return $result;
                }
                $requiredTypes = $this->config['method']['rules']['risk_constraints']['required_hazard_types'] ?? [];
                if (!is_array($requiredTypes) || !$requiredTypes || array_diff($requiredTypes, $manifest['hazard_types'])) {
                    $result['missingData'][] = 'Complete verified coverage for every hazard type named in the approved risk rule is required.';
                    return $result;
                }
                $statuses = [];
                foreach ($matches as $feature) {
                    $status = trim((string) ($feature['properties']['hazard_status'] ?? ''));
                    if ($status === '' || !in_array($feature['properties']['hazard_type'] ?? null, $manifest['hazard_types'], true)) {
                        $result['missingData'][] = 'A containing hazard polygon has no verified hazard classification.';
                        return $result;
                    }
                    $statuses[] = $status;
                }
                $statuses = array_values(array_unique($statuses ?: ['outside_mapped_hazards']));
                $result['raw'] = ['hazard_status' => $statuses, 'evaluated_hazard_types' => array_values($manifest['hazard_types'])];
                $result['justification'] = 'Within verified complete coverage for ' . implode(', ', $manifest['hazard_types']) . '; mapped classifications: ' . implode(', ', $statuses) . '. This is not a safety certification.';
                return $result;
            }
            if (count($matches) !== 1) {
                $result['missingData'][] = count($matches) ? 'Overlapping ' . $key . ' polygons give an ambiguous classification; resolve the authoritative boundary.' : 'No authoritative ' . $key . ' polygon supplies a classification at this site.';
                return $result;
            }
            $properties = $matches[0]['properties'];
            if ($key === 'valuation') {
                $value = self::number($properties['bir_value_sqm'] ?? null);
                if (($manifest['authority'] ?? '') !== 'BIR' || $value === null || $value <= 0 || trim((string) ($manifest['effective_date'] ?? '')) === '' || !self::categoryMatches($input['category'], $properties['applicable_categories'] ?? [])) {
                    $result['missingData'][] = 'A dated BIR zonal valuation polygon applicable to the selected category, with a positive PHP/m² value, is required. Asking price is not a valuation source.';
                    return $result;
                }
                $result['raw'] = ['bir_value_sqm' => $value, 'bir_total_value' => $input['landArea'] === null ? null : round($value * $input['landArea'] * 10000, 2), 'valuation_effective_date' => $manifest['effective_date']];
                $result['justification'] = 'Verified BIR zonal value is PHP ' . $value . '/m², effective ' . $manifest['effective_date']
                    . ($input['landArea'] === null ? '; total value awaits an area size.' : '; reference total = value × ' . ($input['landArea'] * 10000) . ' m².')
                    . ' This baseline is not a market appraisal or proof of viability.';
            } elseif ($key === 'zoning') {
                $status = null;
                foreach (['allowed_categories' => 'permitted', 'conditional_categories' => 'conditional', 'restricted_categories' => 'prohibited'] as $field => $classification) {
                    if (self::categoryMatches($input['category'], $properties[$field] ?? [])) {
                        if ($status !== null) {
                            $result['missingData'][] = 'The zoning source assigns conflicting category permissions.';
                            return $result;
                        }
                        $status = $classification;
                    }
                }
                if ($status === null) {
                    $result['missingData'][] = 'The verified zoning polygon has no explicit permission mapping for the selected category.';
                    return $result;
                }
                $result['raw'] = ['zoning_status' => $status, 'zoning_classification' => $properties['zone'] ?? null];
                $result['justification'] = 'Selected category is ' . $status . ' under the mapped zoning permissions; a site-specific clearance remains required.';
            } else {
                $field = $key === 'utilities' ? 'utility_status' : 'environment_status';
                $value = trim((string) ($properties[$field] ?? ''));
                if ($value === '') {
                    $result['missingData'][] = 'The containing ' . $key . ' polygon has no verified classification.';
                    return $result;
                }
                $result['raw'] = [$field => $value];
                $result['justification'] = 'Verified mapped classification: ' . $value . '; service connection or environmental permits require separate confirmation.';
            }
        }
        return $result;
    }

    private function layer(string $key): array
    {
        if (isset($this->loaded[$key])) {
            return $this->loaded[$key];
        }
        $manifest = $this->config['layers'][$key] ?? null;
        $fail = fn (string $message): array => $this->loaded[$key] = [null, $message];
        if (!is_array($manifest) || ($manifest['verified'] ?? false) !== true) {
            return $fail('A verified ' . $key . ' dataset has not been configured.');
        }
        foreach (['source', 'version', 'reference', 'verified_by', 'verified_at', 'sha256'] as $required) {
            if (!is_string($manifest[$required] ?? null) || trim($manifest[$required]) === '') {
                return $fail('The ' . $key . ' dataset lacks source provenance, version, verification or fingerprint metadata.');
            }
        }
        if (($manifest['crs'] ?? '') !== 'EPSG:4326' || !self::validGeometry($manifest['coverage'] ?? null, ['Polygon', 'MultiPolygon'])) {
            return $fail('Verified WGS84 polygon coverage is required for the ' . $key . ' dataset.');
        }
        if ($key === 'hazards') {
            foreach ($manifest['hazard_types'] ?? [] as $hazardType) {
                if (!is_string($hazardType) || trim($hazardType) === '') {
                    return $fail('The hazard coverage manifest must name valid hazard types.');
                }
            }
        }
        try {
            $directory = realpath((string) ($this->config['data_directory'] ?? ''));
            $filename = $manifest['file'] ?? null;
            if (!is_string($filename) || $filename === '' || preg_match('/(^[\\\\\/]|^[a-zA-Z]:|:|\.\.)/', $filename) || $directory === false) {
                return $fail('The ' . $key . ' dataset must be a local file inside the configured assessment data directory.');
            }
            $path = realpath($directory . DIRECTORY_SEPARATOR . $filename);
            if ($path === false || !str_starts_with(strtolower($path), strtolower($directory . DIRECTORY_SEPARATOR)) || !is_file($path) || filesize($path) > 20000000) {
                return $fail('The ' . $key . ' dataset is missing, outside its data directory or too large.');
            }
            $json = file_get_contents($path);
            if ($json === false || !hash_equals(strtolower((string) $manifest['sha256']), hash('sha256', $json))) {
                return $fail('The ' . $key . ' dataset fingerprint differs from the verified source version.');
            }
            $data = json_decode($json, true, 128, JSON_THROW_ON_ERROR);
            if (($data['type'] ?? '') !== 'FeatureCollection' || !is_array($data['features'] ?? null) || count($data['features']) > 20000 || isset($data['crs'])) {
                return $fail('The ' . $key . ' dataset must be a bounded WGS84 GeoJSON FeatureCollection.');
            }
            $allowed = match ($key) {
                'roads' => ['LineString', 'MultiLineString'], 'businesses' => ['Point'], default => ['Polygon', 'MultiPolygon'],
            };
            foreach ($data['features'] as $feature) {
                if (!is_array($feature) || ($feature['type'] ?? '') !== 'Feature' || !is_array($feature['properties'] ?? null) || !self::validProperties($key, $feature['properties']) || !self::validGeometry($feature['geometry'] ?? null, $allowed)) {
                    return $fail('The ' . $key . ' dataset contains an invalid or unsupported feature geometry.');
                }
            }
            return $this->loaded[$key] = [['manifest' => $manifest, 'features' => $data['features']], null];
        } catch (Throwable) {
            return $fail('The verified ' . $key . ' dataset cannot be decoded; repair its local source file.');
        }
    }

    private function convert(array $raw, mixed $rule, string $defaultMetric): array
    {
        $error = 'A valid approved conversion rule for this criterion is required.';
        if (!is_array($rule) || ($rule['metric'] ?? '') !== $defaultMetric) {
            return [null, null, $error];
        }
        $value = $raw[$defaultMetric] ?? null;
        if (($rule['operator'] ?? '') === 'lookup') {
            $values = is_array($value) ? $value : [$value];
            $scores = [];
            $parts = [];
            foreach ($values as $item) {
                if (!is_string($item) || !is_array($rule['values'] ?? null) || !array_key_exists($item, $rule['values'])) {
                    return [null, null, 'The verified classification has no explicit approved score mapping.'];
                }
                $score = self::number($rule['values'][$item]);
                if ($score === null || $score < 0 || $score > 100) {
                    return [null, null, $error];
                }
                $scores[] = $score;
                $parts[] = $item . ' = ' . $score;
            }
            if (!$scores || (count($scores) > 1 && ($rule['aggregate'] ?? '') !== 'minimum')) {
                return [null, null, 'Overlapping hazard classifications require an approved minimum-score aggregation rule.'];
            }
            return [round(min($scores), 1), 'Approved lookup: ' . implode('; ', $parts) . (count($scores) > 1 ? '; minimum governs.' : '.'), null];
        }
        if (($rule['operator'] ?? '') !== 'bands' || self::number($value) === null || !is_array($rule['bands'] ?? null) || !$rule['bands']) {
            return [null, null, $error];
        }
        $previous = -INF;
        $selected = null;
        $formula = [];
        foreach ($rule['bands'] as $band) {
            $max = self::number($band['max'] ?? null);
            $score = self::number($band['score'] ?? null);
            if ($max === null || $max <= $previous || $score === null || $score < 0 || $score > 100) {
                return [null, null, $error];
            }
            $formula[] = $defaultMetric . ' ≤ ' . $max . ' → ' . $score;
            if ($selected === null && $value <= $max) {
                $selected = $score;
            }
            $previous = $max;
        }
        if (array_key_exists('otherwise', $rule)) {
            $otherwise = self::number($rule['otherwise']);
            if ($otherwise === null || $otherwise < 0 || $otherwise > 100) {
                return [null, null, $error];
            }
            $formula[] = 'otherwise → ' . $otherwise;
            $selected ??= $otherwise;
        }
        return $selected === null ? [null, null, 'The measurement is outside the explicitly approved score bands.'] : [round($selected, 1), 'Approved bands (first matching inclusive limit): ' . implode('; ', $formula) . '.', null];
    }

    private static function categoryMatches(string $selectedCategory, array $allowedList): bool
    {
        if (in_array($selectedCategory, $allowedList, true)) {
            return true;
        }
        $legacyAliases = [
            'Vacant Land' => ['Land', 'Agricultural', 'Residential Lot', 'Commercial Lot', 'Industrial Lot', 'Raw Land'],
            'Commercial' => ['Retail', 'Commercial Building', 'Storefront'],
            'Office' => ['BPO', 'IT-BPM', 'Corporate Office'],
            'Industrial / Warehouse' => ['Industrial', 'Warehouse', 'Logistics'],
            'Hospitality / Tourism' => ['Hospitality', 'Hotel', 'Resort'],
            'Mixed-Use' => ['Mixed Use', 'Commercial-Residential'],
            'Residential' => ['Multifamily', 'Housing'],
            'Special Purpose' => ['Institutional', 'Note/Loan', 'Note / Loan'],
        ];
        $aliases = $legacyAliases[$selectedCategory] ?? [];
        foreach ($aliases as $alias) {
            if (in_array($alias, $allowedList, true)) {
                return true;
            }
        }
        foreach ($allowedList as $item) {
            if (isset($legacyAliases[$item]) && in_array($selectedCategory, (array) $legacyAliases[$item], true)) {
                return true;
            }
        }
        return false;
    }

    private static function number(mixed $value): ?float
    {
        return !is_bool($value) && is_numeric($value) && is_finite((float) $value) ? (float) $value : null;
    }

    private static function validProperties(string $key, array $properties): bool
    {
        $strings = match ($key) {
            'utilities' => ['utility_status'], 'businesses' => ['operating_status'],
            'hazards' => ['hazard_type', 'hazard_status'], 'environment' => ['environment_status'], default => [],
        };
        foreach ($strings as $field) {
            if (isset($properties[$field]) && !is_string($properties[$field])) { return false; }
        }
        $lists = match ($key) {
            'valuation' => ['applicable_categories'], 'zoning' => ['allowed_categories', 'conditional_categories', 'restricted_categories'], default => [],
        };
        foreach ($lists as $field) {
            if (!isset($properties[$field])) { continue; }
            if (!is_array($properties[$field])) { return false; }
            foreach ($properties[$field] as $value) { if (!is_string($value)) { return false; } }
        }
        return true;
    }

    public static function distance(array $a, array $b): float
    {
        $lat1 = deg2rad($a[1]); $lat2 = deg2rad($b[1]);
        $h = sin(($lat2 - $lat1) / 2) ** 2 + cos($lat1) * cos($lat2) * sin(deg2rad($b[0] - $a[0]) / 2) ** 2;
        return 2 * self::EARTH_RADIUS * asin(sqrt(max(0, min(1, $h))));
    }

    public static function segmentDistance(array $point, array $a, array $b): float
    {
        $length = self::distance($a, $b) / self::EARTH_RADIUS;
        if ($length < 1e-12) { return self::distance($point, $a); }
        $delta = self::distance($a, $point) / self::EARTH_RADIUS;
        $bearing = static function (array $from, array $to): float {
            $lat1 = deg2rad($from[1]); $lat2 = deg2rad($to[1]); $dlng = deg2rad($to[0] - $from[0]);
            return atan2(sin($dlng) * cos($lat2), cos($lat1) * sin($lat2) - sin($lat1) * cos($lat2) * cos($dlng));
        };
        $diff = $bearing($a, $point) - $bearing($a, $b);
        $along = atan2(sin($delta) * cos($diff), cos($delta));
        if ($along < 0 || $along > $length) { return min(self::distance($point, $a), self::distance($point, $b)); }
        return abs(asin(max(-1, min(1, sin($delta) * sin($diff))))) * self::EARTH_RADIUS;
    }

    private static function nearest(array $point, array $features, array $allowed): ?array
    {
        $nearest = null;
        foreach ($features as $index => $feature) {
            $geometry = $feature['geometry'];
            if (!in_array($geometry['type'], $allowed, true)) { continue; }
            $distance = INF;
            if ($geometry['type'] === 'Point') { $distance = self::distance($point, $geometry['coordinates']); }
            else {
                $lines = $geometry['type'] === 'LineString' ? [$geometry['coordinates']] : $geometry['coordinates'];
                foreach ($lines as $line) {
                    for ($i = 1; $i < count($line); $i++) { $distance = min($distance, self::segmentDistance($point, $line[$i - 1], $line[$i])); }
                }
            }
            if ($nearest === null || $distance < $nearest['distance']) { $nearest = ['distance' => $distance, 'id' => $feature['id'] ?? (string) $index]; }
        }
        return $nearest;
    }

    public static function contains(array $point, array $geometry): bool
    {
        if (!in_array($geometry['type'] ?? '', ['Polygon', 'MultiPolygon'], true)) { return false; }
        $polygons = $geometry['type'] === 'Polygon' ? [$geometry['coordinates']] : $geometry['coordinates'];
        foreach ($polygons as $polygon) {
            if (!self::ringContains($point, $polygon[0])) { continue; }
            $hole = false;
            foreach (array_slice($polygon, 1) as $ring) { if (self::ringContains($point, $ring)) { $hole = true; break; } }
            if (!$hole) { return true; }
        }
        return false;
    }

    private static function ringContains(array $point, array $ring): bool
    {
        $inside = false;
        for ($i = 1; $i < count($ring); $i++) {
            [$x1, $y1] = $ring[$i - 1]; [$x2, $y2] = $ring[$i];
            $cross = ($point[0] - $x1) * ($y2 - $y1) - ($point[1] - $y1) * ($x2 - $x1);
            if (abs($cross) < 1e-12 && $point[0] >= min($x1, $x2) && $point[0] <= max($x1, $x2) && $point[1] >= min($y1, $y2) && $point[1] <= max($y1, $y2)) { return true; }
            if (($y1 > $point[1]) !== ($y2 > $point[1]) && $point[0] < ($x2 - $x1) * ($point[1] - $y1) / ($y2 - $y1) + $x1) { $inside = !$inside; }
        }
        return $inside;
    }

    public static function bufferCovered(array $point, array $geometry, float $radius): bool
    {
        $polygons = ($geometry['type'] ?? '') === 'Polygon' ? [$geometry['coordinates']] : ($geometry['coordinates'] ?? []);
        foreach ($polygons as $polygon) {
            if (!self::contains($point, ['type' => 'Polygon', 'coordinates' => $polygon])) { continue; }
            $distance = INF;
            foreach ($polygon as $ring) {
                for ($i = 1; $i < count($ring); $i++) { $distance = min($distance, self::coverageSegmentDistance($point, $ring[$i - 1], $ring[$i])); }
            }
            if ($distance >= $radius) { return true; }
        }
        return false;
    }

    /** Conservative spherical distance to a GeoJSON edge interpolated in longitude/latitude. */
    private static function coverageSegmentDistance(array $point, array $a, array $b): float
    {
        // Great-circle edges bow away from straight GeoJSON boundaries. Bound haversine
        // from below instead, so a covered circle can never cross those boundaries.
        $sinc = static fn (float $angle): float => $angle === 0.0 ? 1.0 : sin($angle / 2) / ($angle / 2);
        $latScale = $sinc(deg2rad(max(abs($point[1] - $a[1]), abs($point[1] - $b[1]))));
        $lngScale = $sinc(deg2rad(max(abs($point[0] - $a[0]), abs($point[0] - $b[0]))))
            * sqrt(max(0.0, cos(deg2rad($point[1])) * min(cos(deg2rad($a[1])), cos(deg2rad($b[1])))));
        $ax = deg2rad($a[0] - $point[0]) * $lngScale;
        $ay = deg2rad($a[1] - $point[1]) * $latScale;
        $bx = deg2rad($b[0] - $point[0]) * $lngScale;
        $by = deg2rad($b[1] - $point[1]) * $latScale;
        $dx = $bx - $ax;
        $dy = $by - $ay;
        $lengthSquared = $dx * $dx + $dy * $dy;
        $fraction = $lengthSquared > 0.0 ? max(0.0, min(1.0, -($ax * $dx + $ay * $dy) / $lengthSquared)) : 0.0;
        return self::EARTH_RADIUS * hypot($ax + $fraction * $dx, $ay + $fraction * $dy);
    }

    private static function validGeometry(mixed $geometry, array $allowed): bool
    {
        if (!is_array($geometry) || !in_array($geometry['type'] ?? '', $allowed, true) || !is_array($geometry['coordinates'] ?? null)) { return false; }
        $pointValid = static fn ($point): bool => is_array($point) && isset($point[0], $point[1]) && self::number($point[0]) !== null && self::number($point[1]) !== null && abs((float) $point[0]) <= 180 && abs((float) $point[1]) <= 90;
        if (array_keys($geometry['coordinates']) !== ($geometry['coordinates'] ? range(0, count($geometry['coordinates']) - 1) : [])) { return false; }
        if ($geometry['type'] === 'Point') { return $pointValid($geometry['coordinates']); }
        if ($geometry['type'] === 'MultiPolygon') {
            foreach ($geometry['coordinates'] as $polygonPart) {
                if (!is_array($polygonPart) || !$polygonPart || array_keys($polygonPart) !== range(0, count($polygonPart) - 1)) { return false; }
            }
        }
        $lines = match ($geometry['type']) {
            'LineString' => [$geometry['coordinates']], 'MultiLineString', 'Polygon' => $geometry['coordinates'],
            'MultiPolygon' => array_merge(...($geometry['coordinates'] ?: [[]])),
        };
        if (!$lines || count($lines) > 20000) { return false; }
        $polygon = in_array($geometry['type'], ['Polygon', 'MultiPolygon'], true);
        foreach ($lines as $line) {
            if (!is_array($line) || count($line) < ($polygon ? 4 : 2) || count($line) > 20000) { return false; }
            foreach ($line as $i => $point) {
                if (!$pointValid($point) || ($i > 0 && abs($point[0] - $line[$i - 1][0]) > 180)) { return false; }
            }
            if ($polygon && array_slice($line[0], 0, 2) !== array_slice($line[count($line) - 1], 0, 2)) { return false; }
            if ($polygon) {
                $twiceArea = 0.0;
                for ($i = 1; $i < count($line); $i++) { $twiceArea += $line[$i - 1][0] * $line[$i][1] - $line[$i][0] * $line[$i - 1][1]; }
                if (abs($twiceArea) < 1e-12) { return false; }
            }
        }
        return true;
    }
}
