<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;
use Throwable;

require_once __DIR__ . '/PropertyEvidenceFiles.php';
require_once __DIR__ . '/NearbyBusinessScreening.php';

/** Parcel geometry and staff observations are context, never submitted assessment scores. */
final class PropertyParcel
{
    public const MAX_AREA_HECTARES = 99999999.9999; // properties.area DECIMAL(12, 4)
    public const SAN_FERNANDO_EXTENT = [
        'min_lat' => 16.540000,
        'max_lat' => 16.720000,
        'min_lng' => 120.260000,
        'max_lng' => 120.450000,
    ];
    private const EARTH_RADIUS = 6371008.8;

    public static function isInSanFernandoExtent(?float $lat, ?float $lng): bool
    {
        if ($lat === null || $lng === null) {
            return false;
        }
        return $lat >= self::SAN_FERNANDO_EXTENT['min_lat']
            && $lat <= self::SAN_FERNANDO_EXTENT['max_lat']
            && $lng >= self::SAN_FERNANDO_EXTENT['min_lng']
            && $lng <= self::SAN_FERNANDO_EXTENT['max_lng'];
    }

    public static function extentValidationWarning(?float $lat, ?float $lng): ?string
    {
        if ($lat === null || $lng === null) {
            return null;
        }
        if (!self::isInSanFernandoExtent($lat, $lng)) {
            return sprintf(
                'Geographic extent warning: Recorded coordinates (%.6f, %.6f) lie outside the San Fernando City municipal coverage extent (16.54°N–16.72°N, 120.26°E–120.45°E). Local GIS hazard layers, business registry radius queries, and official CLUP zoning clearance cannot be evaluated and are withheld for locations outside city coverage.',
                $lat,
                $lng
            );
        }
        return null;
    }
    private const OBSERVATIONS = [
        'road_frontage' => ['yes', 'no', 'not_verified', 'unknown'],
        'road_surface' => ['paved', 'unpaved', 'gravel', 'other', 'not_verified', 'unknown'],
        'electricity' => ['available', 'unavailable', 'not_verified', 'connected', 'not_connected', 'unknown', 'grid_reliable', 'solar_battery', 'generator_only', 'grid_unconnected', 'no_supply'],
        'water' => ['available', 'unavailable', 'not_verified', 'connected', 'not_connected', 'unknown', 'piped_reliable', 'deepwell_tested', 'limited_intermittent', 'available_unconnected'],
        'internet' => ['available', 'unavailable', 'not_verified', 'connected', 'not_connected', 'unknown', 'fiber_reliable', 'fixed_wireless', 'satellite_reliable', 'mobile_data_stable', 'available_uninstalled'],
        'drainage' => ['adequate', 'adequate_functional', 'minor_improvements', 'inadequate', 'unavailable', 'not_verified', 'unknown'],
    ];

    public static function fromPayload(array $payload, array $existing = []): array
    {
        $boundary = array_key_exists('boundary', $payload)
            ? self::boundary($payload['boundary']) : self::boundary($existing['boundary'] ?? null);
        $estimated = $boundary === null ? null : round(self::area($boundary), 2);
        $survey = $existing['surveyAreaSqm'] ?? null;
        $areaMethod = $existing['areaMethod'] ?? ($survey === null ? 'declared' : 'survey');
        // Explicit null retains historical area, matching the existing property PATCH contract.
        $area = $payload['land_area'] ?? $payload['area'] ?? null;
        if ($area !== null) {
            $areaMethod = $payload['area_method'] ?? 'declared';
            $survey = self::optionalNumber($area, 'Recorded survey area');
            $rawUnit = $payload['land_area_unit'] ?? $payload['landAreaUnit'] ?? 'ha';
            if (!is_string($rawUnit)) { throw new InvalidArgumentException('Choose square meters or hectares for the survey area.'); }
            $unit = strtolower(trim($rawUnit));
            if (!in_array($unit, ['ha', 'hectare', 'hectares', 'sqm', 'm2', 'square_meter', 'square_meters'], true)) {
                throw new InvalidArgumentException('Choose square meters or hectares for the survey area.');
            }
            if ($survey !== null && in_array($unit, ['ha', 'hectare', 'hectares'], true)) { $survey *= 10000; }
            if ($survey !== null && !is_finite($survey)) { throw new InvalidArgumentException('Land area must be a finite number.'); }
            if ($survey !== null && $survey <= 0) { throw new InvalidArgumentException('Recorded survey area must be greater than zero.'); }
        }
        if (array_key_exists('area_method', $payload)) { $areaMethod = $payload['area_method']; }
        if (!is_string($areaMethod) || !in_array($areaMethod, ['declared', 'survey'], true)) {
            throw new InvalidArgumentException('Choose declared area or recorded survey for the area source.');
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
        if (array_key_exists('nearby_screening', $payload)) {
            $raw = $payload['nearby_screening'];
            if ($raw === '' || $raw === null) { unset($observations['nearby_screening']); }
            else {
                if (is_string($raw)) {
                    try { $raw = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
                    catch (\JsonException) { throw new InvalidArgumentException('Nearby screening data could not be read. Run the nearby search again.'); }
                }
                if (!is_array($raw)) { throw new InvalidArgumentException('Nearby screening requires recorded observations.'); }
                $screening = NearbyBusinessScreening::evaluate($raw);
                $record = $screening['observations'];
                $businessType = $payload['radar_business_type'] ?? $payload['radarBusinessType'] ?? $record['business_type'];
                if ($businessType !== $record['business_type']) {
                    throw new InvalidArgumentException('Nearby observations use another business type. Run the search again for this scenario.');
                }
                if ($reference === null || abs((float) $record['reference_lat'] - $reference['lat']) > .0000005
                    || abs((float) $record['reference_lng'] - $reference['lng']) > .0000005) {
                    throw new InvalidArgumentException('Nearby observations refer to another point. Run the search again for this location.');
                }
                $observations['nearby_screening'] = $screening;
            }
        } elseif (isset($observations['nearby_screening']) && $reference !== ($existing['referencePoint'] ?? null)) {
            unset($observations['nearby_screening']);
        }
        foreach (self::OBSERVATIONS as $key => $allowed) {
            if (!array_key_exists($key, $payload)) { continue; }
            if (!is_string($payload[$key]) || !in_array($payload[$key], $allowed, true)) {
                throw new InvalidArgumentException('Choose a valid ' . str_replace('_', ' ', $key) . ' observation.');
            }
            $val = $payload[$key];
            if ($val === 'connected') $val = 'available';
            elseif ($val === 'not_connected') $val = 'unavailable';
            elseif ($val === 'unknown') $val = 'not_verified';
            $observations[$key] = $val;
        }
        if (array_key_exists('bir_zonal_value', $payload)) {
            $value = self::optionalNumber($payload['bir_zonal_value'], 'BIR zonal reference');
            if ($value !== null && $value <= 0) { throw new InvalidArgumentException('BIR zonal reference must be greater than zero.'); }
            $observations['bir_zonal_value'] = $value;
        }
        if (array_key_exists('comparable_market_price', $payload)) {
            $value = self::optionalNumber($payload['comparable_market_price'], 'Comparable market price');
            if ($value !== null && $value <= 0) { throw new InvalidArgumentException('Comparable market price must be greater than zero.'); }
            $observations['comparable_market_price'] = $value;
        }
        if (array_key_exists('comparable_lease_price', $payload)) {
            $value = self::optionalNumber($payload['comparable_lease_price'], 'Comparable lease price');
            if ($value !== null && $value <= 0) { throw new InvalidArgumentException('Comparable lease price must be greater than zero.'); }
            $observations['comparable_lease_price'] = $value;
        }
        if (array_key_exists('offered_area_sqm', $payload)) {
            $value = self::optionalNumber($payload['offered_area_sqm'], 'Offered space area');
            if ($value !== null && $value <= 0) { throw new InvalidArgumentException('Offered space area must be greater than zero.'); }
            $observations['offered_area_sqm'] = $value;
        }
        if (array_key_exists('security_deposit_months', $payload)) {
            $value = self::optionalNumber($payload['security_deposit_months'], 'Security deposit');
            if ($value !== null && $value < 0) { throw new InvalidArgumentException('Security deposit months cannot be negative.'); }
            $observations['security_deposit_months'] = $value;
        }
        if (array_key_exists('advance_rent_months', $payload)) {
            $value = self::optionalNumber($payload['advance_rent_months'], 'Advance rent');
            if ($value !== null && $value < 0) { throw new InvalidArgumentException('Advance rent months cannot be negative.'); }
            $observations['advance_rent_months'] = $value;
        }
        if (array_key_exists('additional_purchase_costs', $payload)) {
            $value = self::optionalNumber($payload['additional_purchase_costs'], 'Additional purchase costs');
            if ($value !== null && $value < 0) { throw new InvalidArgumentException('Additional purchase costs cannot be negative.'); }
            $observations['additional_purchase_costs'] = $value;
        }
        if (array_key_exists('lgu_valuation_amount', $payload)) {
            $value = self::optionalNumber($payload['lgu_valuation_amount'], 'LGU valuation amount');
            if ($value !== null && $value <= 0) { throw new InvalidArgumentException('LGU valuation amount must be greater than zero.'); }
            $observations['lgu_valuation_amount'] = $value;
        }
        foreach ([
            'electricity_arrangement', 'water_supply', 'internet_telecom', 'drainage_conditions',
            'comparable_unit', 'rent_period', 'currency',
            'flood_susceptibility', 'active_fault', 'landslide_susceptibility', 'storm_surge', 'liquefaction_susceptibility', 'tsunami_exposure',
            'sale_price_mode', 'lease_price_mode',
            'offered_space_scope', 'utilities_included',
            'bir_source', 'bir_date', 'evidence_reference', 'environmental_reference',
            'comparable_source', 'lgu_valuation_type',
            'road_access', 'road_surface_passability', 'carriageway_width', 'distance_to_major_road',
            'access_route_condition', 'distance_to_highway', 'assessed_market_value', 'commercial_corridor', 'nearby_analysis_origin',
            'spatial_evidence_source', 'spatial_evidence_date', 'spatial_evidence_reference',
            'utility_evidence_source', 'utility_evidence_date', 'utility_evidence_reference',
            'economic_evidence_source', 'economic_evidence_date', 'economic_evidence_reference',
            'nearby_evidence_source', 'nearby_evidence_date', 'nearby_evidence_reference',
            'zoning_evidence_source', 'zoning_evidence_date', 'zoning_evidence_reference',
            'hazard_evidence_source', 'hazard_evidence_date', 'hazard_evidence_reference',
            'environmental_evidence_source', 'environmental_evidence_date', 'environmental_evidence_reference',
            'drainage_service', 'wastewater_service', 'waste_collection_service',
            'sensitive_habitats', 'protected_area_overlap', 'documented_contamination',
        ] as $key) {
            if (array_key_exists($key, $payload)) {
                if (in_array($key, ['carriageway_width', 'distance_to_major_road', 'distance_to_highway'], true)) {
                    $measurement = self::optionalNumber($payload[$key], str_replace('_', ' ', $key));
                    if ($measurement !== null && $measurement < 0) { throw new InvalidArgumentException('Distances and widths must be non-negative.'); }
                    $observations[$key] = $measurement;
                } else {
                    $observations[$key] = self::text($payload[$key], str_replace('_', ' ', $key), 3000);
                }
            }
        }
        $hazardFindingMap = [
            'hazard_finding_flood' => 'flood_susceptibility',
            'hazard_finding_landslide' => 'landslide_susceptibility',
            'hazard_finding_fault' => 'active_fault',
            'hazard_finding_surge' => 'storm_surge',
            'hazard_finding_liquefaction' => 'liquefaction_susceptibility',
            'hazard_finding_tsunami' => 'tsunami_exposure',
        ];
        foreach ($hazardFindingMap as $field => $obsKey) {
            if (array_key_exists($field, $payload) && is_string($payload[$field])) {
                $observations[$obsKey] = self::text($payload[$field], str_replace('_', ' ', $obsKey), 3000);
            }
        }
        if (array_key_exists('nearby_businesses_score', $payload) && is_numeric($payload['nearby_businesses_score'])) {
            $observations['nearby_businesses_score'] = (float) $payload['nearby_businesses_score'];
            $observations['nearby_businesses'] = (float) $payload['nearby_businesses_score'];
        }
        if (array_key_exists('bir_date', $payload)) {
            $date = self::text($payload['bir_date'], 'BIR reference date', 10);
            if ($date !== '' && (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/D', $date, $parts) || !checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1]))) {
                throw new InvalidArgumentException('Enter a valid BIR reference date.');
            }
            $observations['bir_date'] = $date;
        }
        $utilities = isset($payload['utilities']) && is_array($payload['utilities'])
            ? self::normalizeUtilities($payload['utilities'], $existing['utilities'] ?? null)
            : (isset($payload['electricity']) || isset($payload['water']) || isset($payload['internet']) || isset($payload['electricity_sources']) || isset($payload['water_sources']) || isset($payload['internet_providers']) || isset($payload['electricity_status']) || isset($payload['water_status']) || isset($payload['internet_status'])
                ? self::normalizeUtilities($payload, $existing['utilities'] ?? null)
                : ($existing['utilities'] ?? null));

        if ($utilities !== null) {
            $observations['electricity'] = $utilities['electricity']['status'];
            $observations['water'] = $utilities['water']['status'];
            $observations['internet'] = $utilities['internet']['status'];
        }

        $refLat = $reference['lat'] ?? null;
        $refLng = $reference['lng'] ?? null;
        $extentWarning = self::extentValidationWarning($refLat, $refLng);

        $result = ['boundary' => $boundary, 'estimatedAreaSqm' => $estimated,
            'surveyAreaSqm' => $survey === null ? null : round((float) $survey, 2), 'areaMethod' => $areaMethod,
            'referencePoint' => $reference, 'observations' => $observations,
            'extent_warning' => $extentWarning,
            'attachments' => PropertyEvidenceFiles::normalizeAttachments($payload['evidence_attachments'] ?? $existing['attachments'] ?? [])];
        if ($utilities !== null) {
            $result['utilities'] = $utilities;
        }
        return $result;
    }

    public static function normalizeUtilities(array $payload, mixed $existing = null): array
    {
        $existing = is_array($existing) ? $existing : [];
        $elecRaw = $payload['electricity_status'] ?? $payload['electricity'] ?? $existing['electricity']['connection_status'] ?? $existing['electricity']['status'] ?? 'not_verified';
        $waterRaw = $payload['water_status'] ?? $payload['water'] ?? $existing['water']['connection_status'] ?? $existing['water']['status'] ?? 'not_verified';
        $internetRaw = $payload['internet_status'] ?? $payload['internet'] ?? $existing['internet']['connection_status'] ?? $existing['internet']['status'] ?? 'not_verified';

        $mapStatus = static fn (mixed $s): string => match (is_string($s) ? strtolower(trim($s)) : '') {
            'connected', 'available' => 'available',
            'not_connected', 'unavailable' => 'unavailable',
            default => 'not_verified',
        };

        $elecStatus = $mapStatus($elecRaw);
        $waterStatus = $mapStatus($waterRaw);
        $internetStatus = $mapStatus($internetRaw);

        $cleanList = static function (mixed $items): array {
            if (!is_array($items)) {
                return [];
            }
            return array_values(array_unique(array_filter(array_map('trim', array_map('strval', $items)), static fn ($s) => $s !== '')));
        };

        $elecSources = $payload['electricity_sources'] ?? $existing['electricity']['sources'] ?? [];
        $waterSources = $payload['water_sources'] ?? $existing['water']['sources'] ?? [];
        $internetProviders = $payload['internet_providers'] ?? $existing['internet']['providers'] ?? [];
        $internetTypes = $payload['internet_types'] ?? $existing['internet']['connection_types'] ?? [];
        $qualityInput = array_key_exists('internet_quality', $payload) ? $payload['internet_quality'] : ($existing['internet']['quality'] ?? 'Not verified');
        $internetQuality = match (is_string($qualityInput) ? strtolower(trim($qualityInput)) : '') {
            'strong' => 'Strong',
            'moderate' => 'Moderate',
            'weak' => 'Weak',
            default => 'Not verified',
        };
        $speed = null;
        if ($internetStatus === 'available') {
            $speedInput = array_key_exists('download_speed_mbps', $payload) ? $payload['download_speed_mbps'] : ($existing['internet']['download_speed_mbps'] ?? null);
            if ($speedInput !== null && !(is_string($speedInput) && trim($speedInput) === '')) {
                if ((!is_string($speedInput) && !is_int($speedInput) && !is_float($speedInput))
                    || !is_numeric($speedInput) || !is_finite((float) $speedInput) || (float) $speedInput < 0 || (float) $speedInput > 10000
                ) {
                    throw new InvalidArgumentException('Internet download speed must be blank or a finite number between 0 and 10,000 Mbps.');
                }
                $speed = round((float) $speedInput, 1);
            }
        }

        return [
            'electricity' => [
                'status' => $elecStatus,
                'connection_status' => (string) $elecRaw,
                'primary_supply' => self::text($payload['electricity_primary_supply'] ?? $existing['electricity']['primary_supply'] ?? '', 'Electricity primary supply', 120),
                'provider' => self::text($payload['electricity_provider'] ?? $existing['electricity']['provider'] ?? '', 'Electricity provider', 120),
                'backup_supply' => self::text($payload['electricity_backup'] ?? $existing['electricity']['backup_supply'] ?? '', 'Electricity backup supply', 120),
                'capacity' => self::text($payload['electricity_capacity'] ?? $existing['electricity']['capacity'] ?? '', 'Electricity capacity', 120),
                'sources' => $elecStatus === 'available' ? $cleanList($elecSources) : [],
            ],
            'water' => [
                'status' => $waterStatus,
                'connection_status' => (string) $waterRaw,
                'source' => self::text($payload['water_source'] ?? $existing['water']['source'] ?? '', 'Water source', 120),
                'provider' => self::text($payload['water_provider'] ?? $existing['water']['provider'] ?? '', 'Water provider', 120),
                'capacity_reliability' => self::text($payload['water_capacity'] ?? $existing['water']['capacity_reliability'] ?? '', 'Water capacity/reliability', 120),
                'sources' => $waterStatus === 'available' ? $cleanList($waterSources) : [],
            ],
            'internet' => [
                'status' => $internetStatus,
                'connection_status' => (string) $internetRaw,
                'technology' => $internetStatus === 'available' ? self::text($payload['internet_technology'] ?? $existing['internet']['technology'] ?? '', 'Internet technology', 120) : '',
                'providers' => $internetStatus === 'available' ? $cleanList($internetProviders) : [],
                'connection_types' => $internetStatus === 'available' ? $cleanList($internetTypes) : [],
                'quality' => $internetStatus === 'available' ? $internetQuality : 'Not verified',
                'download_speed_mbps' => $speed,
            ],
            'additional_services' => [
                'drainage' => self::text($payload['drainage_service'] ?? $existing['additional_services']['drainage'] ?? '', 'Drainage service', 120),
                'wastewater' => self::text($payload['wastewater_service'] ?? $existing['additional_services']['wastewater'] ?? '', 'Wastewater service', 120),
                'waste_collection' => self::text($payload['waste_collection_service'] ?? $existing['additional_services']['waste_collection'] ?? '', 'Waste collection service', 120),
            ],
        ];
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
        $hazardAgencyMap = [
            'flood' => ['type' => 'flood', 'agency' => 'DENR-MGB', 'source' => 'DENR-MGB 1:10,000 Geohazard Survey / CDRRMO Local Drainage Inundation Map'],
            'faults' => ['type' => 'fault', 'agency' => 'DOST-PHIVOLCS', 'source' => 'DOST-PHIVOLCS Active Faults Map of the Philippines & Valley Fault System'],
            'landslide' => ['type' => 'landslide', 'agency' => 'DENR-MGB', 'source' => 'DENR-MGB Rain-Induced Landslide Susceptibility Map'],
            'storm_surge' => ['type' => 'storm_surge', 'agency' => 'DOST-PAGASA', 'source' => 'DOST-PAGASA Storm Surge Inundation Advisory & Inundation Map'],
            'liquefaction' => ['type' => 'liquefaction', 'agency' => 'DOST-PHIVOLCS', 'source' => 'DOST-PHIVOLCS Liquefaction Susceptibility Map of Region 1'],
            'tsunami' => ['type' => 'tsunami', 'agency' => 'DOST-PHIVOLCS', 'source' => 'DOST-PHIVOLCS Tsunami Hazard Map of Region 1'],
        ];

        foreach (['flood', 'faults', 'landslide', 'storm_surge', 'liquefaction', 'tsunami', 'roads'] as $key) {
            $allowed = $key === 'roads' ? ['LineString', 'MultiLineString'] : ($key === 'faults' ? ['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'] : ['Polygon', 'MultiPolygon']);
            $source = self::loadSource($config, $key, $allowed);
            if ($source === null && $key !== 'roads' && $hazards !== null) {
                $type = $hazardAgencyMap[$key]['type'] ?? $key;
                $types = $hazards['manifest']['hazard_types'] ?? [];
                $matchingTypes = array_values(array_filter($types, static fn ($value): bool => is_string($value) && preg_match('/(^|[_\s-])' . $type . '([_\s-]|$)/i', $value) === 1));
                if ($matchingTypes !== []) {
                    $source = $hazards;
                    $source['features'] = array_values(array_filter($hazards['features'], static fn ($feature): bool => in_array($feature['properties']['hazard_type'] ?? null, $matchingTypes, true)));
                }
            }
            $manifest = $source['manifest'] ?? [];
            $defaultMeta = $hazardAgencyMap[$key] ?? [];
            $entry = [
                'status' => $source === null ? 'Not assessed' : 'Available',
                'geojson' => ['type' => 'FeatureCollection', 'features' => $source['features'] ?? []],
                'source' => $manifest['source'] ?? ($defaultMeta['source'] ?? null),
                'agency' => $manifest['agency'] ?? ($defaultMeta['agency'] ?? null),
                'reference' => $manifest['reference'] ?? null,
                'date' => $manifest['effective_date'] ?? $manifest['verified_at'] ?? '2026-Q1',
                'verifiedAt' => $manifest['verified_at'] ?? null,
                'version' => $manifest['version'] ?? null,
                'coverage' => $manifest['coverage'] ?? null,
                'complete' => ($manifest['complete'] ?? false) === true,
                'message' => $source === null ? 'Not assessed. Add verified source data and confirm its coverage.' : 'Review the parcel against the stated source coverage.',
            ];
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
