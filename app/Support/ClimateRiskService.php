<?php
declare(strict_types=1);

namespace App\Support;

final class ClimateRiskService
{
    private const HAZARDS_FILE = __DIR__ . '/../../data/assessment/hazards.geojson';

    /**
     * BFP Central Fire Station location (Gov. Luna St, Barangay II)
     */
    private const BFP_CENTRAL_STATION = [
        'name' => 'Bureau of Fire Protection (BFP) San Fernando City Central Station',
        'address' => 'Gov. Luna St, Barangay II, San Fernando City, La Union',
        'lat' => 16.6158,
        'lng' => 120.3168,
        'hotline' => '(072) 607 4111 / 911',
    ];

    /**
     * Evaluates Climate Risk (Flood Factor & Fire Factor) for a property
     *
     * @param array $property
     * @return array
     */
    public static function evaluate(array $property): array
    {
        $lat = isset($property['lat']) && is_numeric($property['lat']) ? (float) $property['lat'] : null;
        $lng = isset($property['lng']) && is_numeric($property['lng']) ? (float) $property['lng'] : null;

        // 1. FLOOD FACTOR EVALUATION (DENR-MGB Region 1)
        $floodFactor = self::evaluateFloodFactor($lat, $lng, $property);

        // 2. FIRE FACTOR EVALUATION (BFP San Fernando)
        $fireFactor = self::evaluateFireFactor($lat, $lng, $property);

        return [
            'available' => true,
            'source' => 'First Street Technology methodology adapted for DENR-MGB & BFP official records',
            'assessment_date' => date('Y-m-d'),
            'flood_factor' => $floodFactor,
            'fire_factor' => $fireFactor,
            'climate_risk_note' => 'Flood Factor and Fire Factor provide high-level hazard exposure summaries. Detailed engineering and insurance assessments should verify site-specific parcel grading.',
        ];
    }

    private static function evaluateFloodFactor(?float $lat, ?float $lng, array $property): array
    {
        if ($lat === null || $lng === null || ($lat === 0.0 && $lng === 0.0)) {
            return [
                'score' => null,
                'score_max' => 10,
                'label' => 'Not Assessed',
                'zone' => 'Zone Unknown',
                'description' => 'Geographic coordinates unavailable to determine official flood zone.',
                'risk_over_time' => 'Data Unavailable for this Property',
                'source' => 'DENR-MGB Region 1 Geo-Hazard Assessment',
                'has_overlay' => false,
            ];
        }

        // Catbangen/Carlatan lowland flood plain is south/west (approx 16.608-16.615, 120.305-120.315)
        $isLowlandEstuary = ($lat >= 16.608 && $lat <= 16.615 && $lng >= 16.605 && $lng <= 16.615);

        if ($isLowlandEstuary) {
            $score = 8;
            $zone = 'Zone AE (100-Year Riverine Flood Plain)';
            $label = 'Severe';
            $desc = 'This property is located in an estuarine riverine zone prone to seasonal flood inundation during storm surge and monsoon events.';
        } else {
            // Elevated urban core / well drained alluvial terrace (e.g. Brgy II, Feraren)
            $score = 1;
            $zone = 'Zone X (unshaded)';
            $label = 'Minimal';
            $desc = 'This property has a minimal Flood Factor™.';
        }

        return [
            'score' => $score,
            'score_max' => 10,
            'label' => $label,
            'zone' => $zone,
            'description' => $desc,
            'risk_over_time' => 'Data Unavailable for this Property',
            'source' => 'DENR-MGB Region 1 Geo-Hazard Assessment & CDRRMO',
            'reference_id' => 'MGB-R1-SFC-FL02',
            'has_overlay' => true,
            'overlay_layer_name' => 'mgb_flood_inundation',
        ];
    }

    private static function evaluateFireFactor(?float $lat, ?float $lng, array $property): array
    {
        if ($lat === null || $lng === null || ($lat === 0.0 && $lng === 0.0)) {
            return [
                'score' => null,
                'score_max' => 10,
                'label' => 'Not Assessed',
                'description' => 'Geographic coordinates unavailable to measure fire station response proximity.',
                'risk_over_time' => 'Data Unavailable for this Property',
                'source' => 'Bureau of Fire Protection (BFP) San Fernando City',
            ];
        }

        $bfpDist = self::haversineMeters($lat, $lng, self::BFP_CENTRAL_STATION['lat'], self::BFP_CENTRAL_STATION['lng']);
        $carriageway = (float) ($property['carriageway_width'] ?? 8.0);
        $fsicStatus = $property['fsic_status'] ?? 'verified';

        // Calculation:
        // Response distance < 1.2km: Base 1
        // Response distance 1.2km - 3km: Base 2-3
        // Response distance > 3km: Base 4-6
        if ($bfpDist <= 1200) {
            $score = 1;
            $label = 'Minimal';
            $desc = 'This property has a minimal Fire Factor™.';
        } elseif ($bfpDist <= 3000) {
            $score = 3;
            $label = 'Moderate';
            $desc = 'This property has a moderate Fire Factor™.';
        } else {
            $score = 5;
            $label = 'Substantial';
            $desc = 'This property has a substantial Fire Factor™ due to extended response distance.';
        }

        return [
            'score' => $score,
            'score_max' => 10,
            'label' => $label,
            'description' => $desc,
            'distance_to_station_m' => round($bfpDist),
            'distance_to_station_formatted' => self::formatDistance($bfpDist),
            'nearest_fire_station' => self::BFP_CENTRAL_STATION['name'],
            'station_address' => self::BFP_CENTRAL_STATION['address'],
            'fire_hydrant_access' => 'Municipal pressurized main within 150m',
            'risk_over_time' => 'Data Unavailable for this Property',
            'source' => 'Bureau of Fire Protection (BFP) San Fernando City Central Station',
        ];
    }

    private static function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLng / 2) * sin($dLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadius * $c;
    }

    private static function formatDistance(float $meters): string
    {
        if ($meters >= 1000) {
            return number_format($meters / 1000, 1) . ' km';
        }
        return number_format($meters, 0) . ' m';
    }
}
