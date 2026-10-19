<?php
declare(strict_types=1);

namespace App\Support;

final class ClimateRiskService
{
    /** Configured reference point, not an authenticated station coverage assessment. */
    private const STATION = [
        'name' => 'BFP San Fernando City Central Station',
        'address' => 'Gov. Luna St, Barangay II, San Fernando City, La Union',
        'lat' => 16.6158,
        'lng' => 120.3168,
    ];

    public static function evaluate(array $property): array
    {
        $flood = $property['subcriterion_scores']['risk_constraints']['flood_susceptibility']
            ?? $property['criteriaDetails']['risk_constraints']['subcriteria']['flood_susceptibility'] ?? [];
        $raw = strtolower(trim((string) ($flood['raw_status'] ?? '')));
        $labels = ['none' => 'No exposure reported', 'low' => 'Low susceptibility', 'moderate' => 'Moderate susceptibility',
            'high' => 'High susceptibility', 'very_high' => 'Very high susceptibility', 'critical' => 'Critical finding'];
        $available = isset($labels[$raw]);
        $authenticated = ($flood['evidence_status'] ?? '') === 'authenticated';
        $overlay = dirname(__DIR__, 2) . '/data/assessment/hazards.geojson';
        $layers = is_readable($overlay) ? json_decode((string) file_get_contents($overlay), true) : null;
        $hasOverlay = false;
        foreach ($layers['features'] ?? [] as $feature) {
            if (in_array($feature['properties']['hazard_type'] ?? $feature['properties']['type'] ?? '', ['flood'], true)) {
                $hasOverlay = true;
                break;
            }
        }
        $lat = $property['lat'] ?? null;
        $lng = $property['lng'] ?? null;
        $hasLocation = is_numeric($lat) && is_numeric($lng) && is_finite((float) $lat) && is_finite((float) $lng)
            && abs((float) $lat) <= 90 && abs((float) $lng) <= 180 && !((float) $lat === 0.0 && (float) $lng === 0.0);
        $distance = $hasLocation ? self::distance((float) $lat, (float) $lng) : null;
        return [
            'available' => $available || $hasLocation,
            'flood_factor' => [
                'available' => $available, 'raw_status' => $raw ?: null,
                'label' => $labels[$raw] ?? 'Not assessed',
                'score' => $available && is_numeric($flood['score'] ?? null) ? (float) $flood['score'] : null,
                'score_max' => 100, 'evidence_status' => $authenticated ? 'authenticated' : ($available ? 'reported_unverified' : 'not_assessed'),
                'source' => $flood['source'] ?? $flood['evidence'][0]['source'] ?? null,
                'reference' => $flood['evidence'][0]['reference'] ?? null,
                'date' => $flood['date'] ?? $flood['evidence'][0]['verifiedAt'] ?? null,
                'coverage' => $flood['coverage'] ?? null,
                'description' => $available ? 'Finding from the recorded Risk Constraints assessment.' : 'A property-specific flood finding has not been recorded.',
                'has_overlay' => $hasOverlay,
            ],
            'fire_factor' => [
                'available' => $hasLocation, 'score' => null, 'label' => 'Station distance reference',
                'distance_to_station_m' => $distance !== null ? round($distance) : null,
                'distance_to_station_formatted' => $distance === null ? null : ($distance >= 1000 ? number_format($distance / 1000, 1) . ' km' : number_format($distance) . ' m'),
                'nearest_fire_station' => self::STATION['name'], 'station_address' => self::STATION['address'],
                'location_basis' => ($property['hasExactLocation'] ?? true) === false ? 'Approximate location reference' : 'Recorded location reference',
                'source' => 'LOCUS-SF configured station reference',
                'description' => 'Straight-line distance to the configured station point. Route, dispatch time, hydrant access and fire compliance have not been verified.',
            ],
        ];
    }

    private static function distance(float $lat, float $lng): float
    {
        $dLat = deg2rad(self::STATION['lat'] - $lat);
        $dLng = deg2rad(self::STATION['lng'] - $lng);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat)) * cos(deg2rad(self::STATION['lat'])) * sin($dLng / 2) ** 2;
        return 6371000.0 * 2 * atan2(sqrt($a), sqrt(max(0.0, 1.0 - $a)));
    }
}
