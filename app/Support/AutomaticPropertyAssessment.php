<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;
use PDO;
use DomainException;
use Throwable;

require_once __DIR__ . '/PropertyAssessment.php';
require_once __DIR__ . '/PropertyParcel.php';

/** Reads trusted, versioned local evidence; request data can never supply scores or layers. */
final class AutomaticPropertyAssessment
{
    public const VERSION = 'locus-observations-v3';
    private const EARTH_RADIUS = 6371008.8;
    private const METRICS = [
        'spatial_accessibility' => ['roads', 'road_distance_m', 'Distance to mapped road', 'm'],
        'infrastructure_readiness' => ['utilities', 'utility_status', 'Mapped service coverage (not a parcel connection)', null],
        'economic_viability' => ['valuation', 'bir_value_sqm', 'BIR zonal value (Economic Context)', 'PHP/m²'],
        'nearby_businesses' => ['businesses', 'business_count', 'Operating businesses within radius (Economic Activity)', 'businesses'],
        'zoning_compatibility' => ['zoning', 'zoning_status', 'Recorded zoning district', null],
        'risk_constraints' => ['hazards', 'hazard_status', 'Mapped hazard exposure', null],
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
        if (($metadata['protocol_version'] ?? '') !== PropertyAssessmentService::METHODOLOGY_VERSION) {
            $safe = PropertyAssessment::scores([], ['assessed_at' => $metadata['assessed_at'] ?? $metadata['generatedAt'] ?? null]);
            return array_merge($safe, [
                'status' => 'historical_review_required', 'assessmentStatus' => 'historical_review_required',
                'protocol' => $metadata['protocol'] ?? $metadata['assessmentVersion'] ?? 'legacy-unversioned',
                'protocol_version' => $metadata['protocol_version'] ?? $metadata['assessmentVersion'] ?? 'legacy-unversioned',
                'assessmentMode' => 'historical', 'assessmentVersion' => $metadata['assessmentVersion'] ?? null,
                'historical_snapshot' => ['assessmentCriteria' => $criteria, 'metadata' => $metadata],
                'legacyAssessment' => $history ?: null, 'rank_eligible' => false, 'comparison_key' => null,
                'reason' => 'Historical snapshot retained. A new assessment under the current protocol requires explicit recalculation.',
                'review_reasons' => ['Historical protocol or missing version; excluded from current comparable rankings.'],
                'assessed_at' => $metadata['assessed_at'] ?? $metadata['generatedAt'] ?? null,
            ]);
        }
        try {
        $scores = PropertyAssessment::scores($metadata['raw_criterion_inputs'] ?? [], [
            'property_id' => $metadata['property_id'] ?? null, 'proposed_activity' => $metadata['proposed_activity'] ?? '',
            'zoning_district' => $metadata['eligibility']['district'] ?? '',
            'weights' => $metadata['weight_configuration'] ?? [],
            'criteria_details' => $metadata['criteriaDetails'] ?? [],
            'stored_iai' => $metadata['displayed_iai'] ?? null,
            'assessed_at' => $metadata['assessed_at'] ?? null,
        ]);
        } catch (DomainException $error) {
            $safe = PropertyAssessment::scores([]);
            return array_merge($safe, ['status' => 'review_required', 'assessmentStatus' => 'review_required',
                'weight_configuration' => $metadata['weight_configuration'] ?? [], 'weights_valid' => false,
                'discrepancy_detected' => true, 'discrepancy_review_required' => true,
                'discrepancy_message' => 'Stored weight configuration is invalid: ' . $error->getMessage(),
                'review_reasons' => ['Stored weight configuration is invalid: ' . $error->getMessage()],
                'assessed_at' => $metadata['assessed_at'] ?? null, 'automaticAssessment' => $metadata,
                'historical_snapshot' => ['assessmentCriteria' => $criteria, 'metadata' => $metadata], 'legacyAssessment' => $history]);
        }
        // The persisted numeric criteria are another copy of the same snapshot, not an alternate scoring source.
        $copiesDisagree = $criteria != ($metadata['criterion_scores'] ?? [])
            || ($metadata['criterion_scores'] ?? []) != $scores['criterion_scores'];
        foreach (['iaiScore', 'mceScore', 'iai', 'iai_score', 'mce_score', 'displayed_iai'] as $key) {
            if (isset($metadata[$key]) && $scores['unrounded_total'] !== null
                && (!is_numeric($metadata[$key]) || !is_finite((float) $metadata[$key])
                    || abs((float) $metadata[$key] - round($scores['unrounded_total'], 1, PHP_ROUND_HALF_UP)) > PropertyAssessmentService::TOTAL_TOLERANCE)) { $copiesDisagree = true; }
        }
        if ($copiesDisagree) {
            $scores = array_merge($scores, ['status' => 'review_required', 'assessmentStatus' => 'review_required',
                'discrepancy_detected' => true, 'discrepancy_review_required' => true,
                'discrepancy_message' => 'Persisted criterion copies disagree; review the original snapshot.',
                'iaiScore' => null, 'mceScore' => null, 'iai' => null, 'iai_score' => null, 'mce_score' => null,
                'displayed_iai' => null, 'assessmentComplete' => false, 'is_complete' => false, 'rank_eligible' => false]);
        }
        return array_merge($metadata, $scores, ['automaticAssessment' => $metadata, 'legacyAssessment' => $history ?: null]);
    }

    /** Evaluate a selected use against the same persisted observations; never save a simulation. */
    public static function scenario(array $property, string $activity): array
    {
        $current = ($property['protocol_version'] ?? '') === PropertyAssessmentService::METHODOLOGY_VERSION;
        $result = PropertyAssessment::scores($current ? ($property['raw_criterion_inputs'] ?? []) : [], [
            'property_id' => $property['id'] ?? $property['property_id'] ?? null,
            'proposed_activity' => $activity,
            'zoning_district' => $property['clupProfile']['zoningClassification'] ?? $property['eligibility']['district'] ?? '',
            'weights' => $current ? $property['weight_configuration'] : PropertyAssessment::WEIGHTS,
            'criteria_details' => $current ? ($property['criteriaDetails'] ?? []) : [],
        ]);
        if (!empty($property['discrepancy_detected'])) {
            foreach (['displayed_iai', 'iaiScore', 'mceScore', 'iai', 'iai_score', 'mce_score'] as $key) { $result[$key] = null; }
            $result['assessmentComplete'] = $result['is_complete'] = $result['rank_eligible'] = false;
            $result['status'] = $result['assessmentStatus'] = 'review_required';
            $result['discrepancy_detected'] = true;
            $result['review_reasons'][] = 'Resolve the stored assessment discrepancy before evaluating scenarios.';
        }
        return $result;
    }

    /** Hectares retain parcel JSON precision: six decimals equal 0.01 square meters. */
    public static function normalizeInputs(array $input): array
    {
        $lat = self::number($input['lat'] ?? null);
        $lng = self::number($input['lng'] ?? null);
        if (($lat === null) !== ($lng === null) || ($lat !== null && ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180))
            || (isset($input['lat']) && $input['lat'] !== '' && $lat === null) || (isset($input['lng']) && $input['lng'] !== '' && $lng === null)) {
            throw new InvalidArgumentException('Provide both valid latitude and longitude, or leave both blank.');
        }
        $parcel = is_array($input['parcel'] ?? null) ? $input['parcel'] : [];
        $parcelArea = self::number($parcel['surveyAreaSqm'] ?? $parcel['estimatedAreaSqm'] ?? null);
        $rawArea = $parcelArea !== null && $parcelArea > 0 ? $parcelArea : ($input['land_area'] ?? $input['landArea'] ?? $input['area'] ?? null);
        if ($rawArea === null || $rawArea === '') {
            $area = null;
        } else {
            $area = self::number(is_string($rawArea) ? str_replace(',', '', trim($rawArea)) : $rawArea);
            $unit = $parcelArea !== null && $parcelArea > 0 ? 'sqm' : strtolower(trim((string) ($input['land_area_unit'] ?? $input['landAreaUnit'] ?? 'ha')));
            if (in_array($unit, ['sqm', 'm2', 'square_meter', 'square_meters'], true) && $area !== null) {
                $area /= 10000;
            }
            if ($area === null || $area <= 0) {
                throw new InvalidArgumentException('Land area must be greater than zero.');
            }
            if (!is_finite($area) || $area > PropertyParcel::MAX_AREA_HECTARES) {
                throw new InvalidArgumentException('Land area exceeds the supported maximum of 99,999,999.9999 hectares.');
            }
            if (round($area, 4) <= 0) {
                throw new InvalidArgumentException('Land area must be at least 0.5 square meters.');
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
        return ['lat' => $lat === null ? null : round($lat, 6), 'lng' => $lng === null ? null : round($lng, 6), 'category' => $category, 'subcategory' => $subcategory, 'landArea' => $area === null ? null : round($area, 6), 'landAreaUnit' => 'hectares'];
    }

    public function evaluate(array $input, ?PDO $pdo = null): array
    {
        $inputs = self::normalizeInputs($input);
        $point = [$inputs['lng'], $inputs['lat']];
        $details = $context = [];
        $observations = is_array($input['observations'] ?? null) ? $input['observations'] : [];
        foreach (self::METRICS as $key => [$layerKey, $metric, $label, $unit]) {
            $measurement = $inputs['lat'] === null
                ? ['raw' => [], 'evidence' => [], 'missingData' => ['Exact location is required.'], 'justification' => 'Location unrecorded; exact location is required.']
                : $this->measure($layerKey, $point, $inputs);
            $raw = array_merge($measurement['raw'], is_array($observations[$key] ?? null) ? $observations[$key] : []);
            $details[$key] = ['raw' => $raw, 'evidence' => $measurement['evidence'],
                'missingData' => $measurement['missingData'], 'justification' => $measurement['justification']];
            $context[] = ['key' => $metric, 'label' => $label, 'value' => $measurement['raw'][$metric] ?? null, 'unit' => $unit,
                'status' => $measurement['missingData'] ? 'missing_data' : 'source_reported',
                'justification' => $measurement['justification'], 'evidence' => $measurement['evidence']];
        }
        $scores = PropertyAssessment::scores([], [
            'pdo' => $pdo, 'property_id' => $input['property_id'] ?? null, 'proposed_activity' => $input['proposed_activity'] ?? '',
            'zoning_district' => $input['zoning_district'] ?? $details['zoning_compatibility']['raw']['zoning_classification'] ?? '',
            'criteria_details' => $details,
        ]);
        return array_merge($scores, [
            'assessmentMode' => 'automatic_observations', 'assessmentVersion' => self::VERSION,
            'inputs' => $inputs, 'observation_inputs' => $observations, 'spatialContext' => $context, 'generatedAt' => $scores['assessed_at'],
            'completedCount' => count(array_filter($scores['criterion_scores'], static fn ($v): bool => $v !== null)),
            'totalCount' => count(PropertyAssessment::WEIGHTS),
            'ruleVersion' => PropertyAssessmentService::METHODOLOGY_VERSION,
        ]);
    }

    /** Convert persisted observations to rubric inputs without inferring connection or verification. */
    public static function observations(array $parcel, array $financial): array
    {
        $o = $parcel['observations'] ?? [];
        $u = $parcel['utilities'] ?? [];
        $service = static function (string $key, array $aliases) use ($o, $u): mixed {
            foreach ($aliases as $alias) { if (isset($o[$alias]) && $o[$alias] !== '') { return $o[$alias]; } }
            $record = $u[$key] ?? [];
            // Broad "available" claims never establish a connected, reliable service.
            return $record['connection_status'] ?? $o[$key] ?? null;
        };
        return [
            'spatial_accessibility' => array_intersect_key($o, array_flip(['road_access', 'road_surface_passability', 'carriageway_width', 'distance_to_major_road'])),
            'infrastructure_readiness' => [
                'electricity' => $service('electricity', ['electricity_arrangement']),
                'water' => $service('water', ['water_supply']), 'internet' => $service('internet', ['internet_telecom']),
                'drainage' => $o['drainage_conditions'] ?? $o['drainage_service'] ?? $u['additional_services']['drainage'] ?? null,
            ],
            'economic_viability' => array_merge($o, $financial),
            'nearby_businesses' => [], // General mapped counts cannot supply benchmarked business-specific subcriteria.
            'risk_constraints' => array_intersect_key($o, array_flip(['flood_susceptibility', 'active_fault', 'landslide_susceptibility', 'storm_surge', 'liquefaction_susceptibility', 'tsunami_exposure'])),
        ];
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
            'reference' => $manifest['reference'], 'verifiedAt' => $manifest['verified_at'], 'sha256' => $manifest['sha256'],
            'provenance_status' => AssessmentEvidence::status($manifest), 'authentication_record' => $manifest['authentication_record'] ?? null];
        if (!AssessmentEvidence::authenticated($manifest)) {
            $result['missingData'][] = 'Source provenance has no authenticated review record; measurements are descriptive only.';
        }
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
            $result['justification'] = 'Nearest mapped road centreline is ' . round($nearest['distance'], 2) . ' m away; straight-line proximity does not confirm a legal entrance or travel route.';
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
            $result['justification'] = $count . ' source-reported operating business points observed within ' . $radius . ' m.';
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
                $hazards = [];
                foreach ($manifest['hazard_types'] as $type) {
                    $statuses = [];
                    foreach ($matches as $feature) {
                        if (($feature['properties']['hazard_type'] ?? '') === $type) { $statuses[] = $feature['properties']['hazard_status'] ?? null; }
                    }
                    $hazards[$type] = ['status' => count($statuses) === 1 ? $statuses[0] : (count($statuses) === 0 ? 'outside_mapped_hazard' : null),
                        'assessment_state' => count($statuses) > 1 ? 'not_assessed' : 'assessed', 'evidence' => $result['evidence']];
                }
                $result['raw'] = $hazards;
                $result['justification'] = 'Partial spatial screening for: ' . implode(', ', $manifest['hazard_types']) . '. Missing types remain unassessed.';
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
                $result['justification'] = 'Source-reported BIR zonal value is PHP ' . $value . '/m², effective ' . $manifest['effective_date']
                    . ($input['landArea'] === null ? '; total value awaits an area size.' : '; reference total = value × ' . ($input['landArea'] * 10000) . ' m².')
                    . ' This baseline is not a market appraisal or proof of viability.';
            } elseif ($key === 'zoning') {
                $result['raw'] = ['zoning_classification' => $properties['zone'] ?? null];
                $result['justification'] = 'Recorded district only. Category tags do not establish permission for an investor activity.';
            } else {
                $field = $key === 'utilities' ? 'utility_status' : 'environment_status';
                $value = trim((string) ($properties[$field] ?? ''));
                if ($value === '') {
                    $result['missingData'][] = 'The containing ' . $key . ' polygon has no verified classification.';
                    return $result;
                }
                $result['raw'] = [$field => $value];
                $result['justification'] = 'Source-reported mapped classification: ' . $value . '; service connection or environmental permits require separate confirmation.';
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
        if (!is_array($manifest)) {
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

    private static function categoryMatches(string $selectedCategory, array $allowedList): bool
    {
        if (in_array($selectedCategory, $allowedList, true)) {
            return true;
        }
        $legacyAliases = [
            'Land' => ['Vacant Land', 'Agricultural', 'Residential Lot', 'Commercial Lot', 'Industrial Lot', 'Raw Land', 'Farm / Agribusiness'],
            'Vacant Land' => ['Land', 'Agricultural', 'Residential Lot', 'Commercial Lot', 'Industrial Lot', 'Raw Land', 'Farm / Agribusiness'],
            'Building' => ['Commercial', 'Retail', 'Commercial Building', 'Storefront', 'Office', 'BPO', 'IT-BPM', 'Corporate Office', 'Industrial / Warehouse', 'Industrial', 'Warehouse', 'Logistics', 'Hospitality / Tourism', 'Hospitality', 'Hotel', 'Resort', 'Mixed-Use', 'Mixed Use', 'Commercial-Residential', 'Residential', 'Multifamily', 'Housing', 'Special Purpose', 'Institutional'],
            'Commercial' => ['Building', 'Retail', 'Commercial Building', 'Storefront'],
            'Office' => ['Building', 'BPO', 'IT-BPM', 'Corporate Office'],
            'Industrial / Warehouse' => ['Building', 'Industrial', 'Warehouse', 'Logistics'],
            'Hospitality / Tourism' => ['Building', 'Hospitality', 'Hotel', 'Resort'],
            'Mixed-Use' => ['Building', 'Mixed Use', 'Commercial-Residential'],
            'Residential' => ['Building', 'Multifamily', 'Housing'],
            'Special Purpose' => ['Building', 'Institutional', 'Note/Loan', 'Note / Loan'],
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
