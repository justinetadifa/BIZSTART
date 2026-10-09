<?php
declare(strict_types=1);

namespace App\Support;

final class PropertyHazardScreening
{
    private static ?array $cachedHazards = null;
    private static ?array $cachedEnvironment = null;

    public static function evaluate(?float $lat, ?float $lng, ?array $boundary = null): array
    {
        if ($lat === null || $lng === null || abs($lat) > 90 || abs($lng) > 180 || ($lat === 0.0 && $lng === 0.0)) {
            return [
                'flood' => [
                    'status' => 'not_assessed',
                    'badge' => 'NOT ASSESSED',
                    'color' => 'gray',
                    'details' => 'Location coordinates not provided.',
                    'source' => 'City spatial dataset',
                    'reference' => null,
                ],
                'fault' => [
                    'status' => 'not_assessed',
                    'badge' => 'NOT ASSESSED',
                    'color' => 'gray',
                    'distance_km' => null,
                    'proximity' => 'Not assessed',
                    'details' => 'Location coordinates not provided.',
                    'source' => 'City spatial dataset',
                    'reference' => null,
                ],
                'environment' => [
                    'status' => 'not_assessed',
                    'badge' => 'NOT ASSESSED',
                    'color' => 'gray',
                    'details' => 'Not assessed',
                    'source' => 'CENRO & DENR-EMB Region 1',
                    'reference' => null,
                ],
                'source' => 'City spatial dataset',
                'status_label' => 'Not assessed',
                'validated' => false,
            ];
        }

        $hazardsData = self::loadHazards();
        $envData = self::loadEnvironment();

        // 1. Flood evaluation
        $floodResult = [
            'status' => 'not_assessed',
            'badge' => 'NOT ASSESSED',
            'color' => 'gray',
            'details' => 'Not assessed',
            'source' => 'MGB Region 1 Geo-Hazard Assessment',
            'reference' => 'MGB-R1-SFC-HAZ2026',
        ];

        if ($hazardsData !== null) {
            foreach ($hazardsData['features'] ?? [] as $feature) {
                if (($feature['properties']['hazard_type'] ?? '') !== 'flood') {
                    continue;
                }
                $geom = $feature['geometry'] ?? [];
                if (($geom['type'] ?? '') === 'Polygon' && isset($geom['coordinates'][0])) {
                    if (self::pointInPolygon([$lng, $lat], $geom['coordinates'][0])) {
                        $hzStatus = strtolower((string) ($feature['properties']['hazard_status'] ?? ''));
                        if ($hzStatus === 'high') {
                            $floodResult = [
                                'status' => 'high',
                                'badge' => 'HIGH',
                                'color' => 'red',
                                'details' => 'Property intersects a mapped high-susceptibility zone.',
                                'source' => (string) ($feature['properties']['source'] ?? 'MGB Region 1 Geo-Hazard Assessment'),
                                'reference' => (string) ($feature['properties']['reference'] ?? 'MGB-R1-SFC-FL01'),
                            ];
                        } elseif ($hzStatus === 'moderate') {
                            $floodResult = [
                                'status' => 'moderate',
                                'badge' => 'MODERATE',
                                'color' => 'amber',
                                'details' => 'Property intersects a mapped moderate flood susceptibility zone.',
                                'source' => (string) ($feature['properties']['source'] ?? 'MGB Region 1 Geo-Hazard Assessment'),
                                'reference' => (string) ($feature['properties']['reference'] ?? 'MGB-R1-SFC-FL02'),
                            ];
                        } else {
                            $floodResult = [
                                'status' => 'low',
                                'badge' => 'LOW',
                                'color' => 'green',
                                'details' => (string) ($feature['properties']['description'] ?? 'Elevated alluvial terrace with well-drained storm catchment.'),
                                'source' => (string) ($feature['properties']['source'] ?? 'MGB Region 1 Geo-Hazard Assessment'),
                                'reference' => (string) ($feature['properties']['reference'] ?? 'MGB-R1-SFC-FL02'),
                            ];
                        }
                        break;
                    }
                }
            }
        }

        // 2. Fault line screening
        $faultResult = [
            'status' => 'not_assessed',
            'badge' => 'NOT ASSESSED',
            'color' => 'gray',
            'distance_km' => null,
            'proximity' => 'Not assessed',
            'details' => 'No active fault data available.',
            'source' => 'PHIVOLCS Active Faults Map of the Philippines',
            'reference' => 'PHIVOLCS-WIFS-2025',
        ];

        if ($hazardsData !== null) {
            $minFaultDist = PHP_FLOAT_MAX;
            $insideFaultZone = false;
            $faultFeatureProps = [];

            foreach ($hazardsData['features'] ?? [] as $feature) {
                if (($feature['properties']['hazard_type'] ?? '') !== 'fault') {
                    continue;
                }
                $geom = $feature['geometry'] ?? [];
                if (($geom['type'] ?? '') === 'Polygon' && isset($geom['coordinates'][0])) {
                    $isInside = self::pointInPolygon([$lng, $lat], $geom['coordinates'][0]);
                    if ($isInside && ($feature['properties']['hazard_status'] ?? '') === 'high') {
                        $insideFaultZone = true;
                        $faultFeatureProps = $feature['properties'];
                    }
                    if (($feature['properties']['hazard_status'] ?? '') === 'high') {
                        foreach ($geom['coordinates'][0] as $vertex) {
                            $dist = self::haversineKm($lat, $lng, (float) $vertex[1], (float) $vertex[0]);
                            if ($dist < $minFaultDist) {
                                $minFaultDist = $dist;
                                $faultFeatureProps = $feature['properties'];
                            }
                        }
                    }
                }
            }

            if ($insideFaultZone) {
                $faultResult = [
                    'status' => 'high',
                    'badge' => 'HIGH',
                    'color' => 'red',
                    'distance_km' => 0.0,
                    'proximity' => '0.0 km (Within active fault corridor)',
                    'details' => 'Property intersects active tectonic fault buffer corridor.',
                    'source' => (string) ($faultFeatureProps['source'] ?? 'PHIVOLCS Active Faults Map'),
                    'reference' => (string) ($faultFeatureProps['reference'] ?? 'PHIVOLCS-Q1-WIFS-2025'),
                ];
            } elseif ($minFaultDist < 100.0) {
                $roundedKm = round($minFaultDist, 1);
                $status = $roundedKm < 1.0 ? 'moderate' : 'low';
                $badge = $roundedKm < 1.0 ? 'MODERATE' : 'LOW';
                $color = $roundedKm < 1.0 ? 'amber' : 'green';
                $faultResult = [
                    'status' => $status,
                    'badge' => $badge,
                    'color' => $color,
                    'distance_km' => $roundedKm,
                    'proximity' => $roundedKm . ' km',
                    'details' => $roundedKm . ' km from nearest mapped fault',
                    'source' => (string) ($faultFeatureProps['source'] ?? 'PHIVOLCS Active Faults Map of the Philippines'),
                    'reference' => (string) ($faultFeatureProps['reference'] ?? 'PHIVOLCS-WIFS-2025'),
                ];
            } else {
                $faultResult = [
                    'status' => 'low',
                    'badge' => 'LOW',
                    'color' => 'green',
                    'distance_km' => null,
                    'proximity' => 'No mapped fault identified within the configured screening area.',
                    'details' => 'No mapped fault identified within the configured screening area.',
                    'source' => 'PHIVOLCS Active Faults Map of the Philippines',
                    'reference' => 'PHIVOLCS-WIFS-2025',
                ];
            }
        }

        // 3. Environmental screening
        $envResult = [
            'status' => 'not_assessed',
            'badge' => 'NOT ASSESSED',
            'color' => 'gray',
            'details' => 'No recorded restriction',
            'source' => 'CENRO & DENR-EMB Region 1',
            'reference' => 'DENR-ECC-SFC-2026',
        ];

        if ($envData !== null) {
            $matchedEnv = false;
            foreach ($envData['features'] ?? [] as $feature) {
                $geom = $feature['geometry'] ?? [];
                if (($geom['type'] ?? '') === 'Polygon' && isset($geom['coordinates'][0])) {
                    if (self::pointInPolygon([$lng, $lat], $geom['coordinates'][0])) {
                        $matchedEnv = true;
                        $envStatus = $feature['properties']['environment_status'] ?? 'verified_clear';
                        $isClear = $envStatus === 'verified_clear';
                        $envResult = [
                            'status' => $isClear ? 'clear' : 'restricted',
                            'badge' => $isClear ? 'LOW' : 'MODERATE',
                            'color' => $isClear ? 'green' : 'amber',
                            'details' => $isClear ? 'No recorded restriction' : (string) ($feature['properties']['classification'] ?? 'Environmental restriction'),
                            'source' => (string) ($feature['properties']['source'] ?? 'CENRO & DENR-EMB Region 1'),
                            'reference' => (string) ($feature['properties']['reference'] ?? 'DENR-ECC-SFC-2026'),
                        ];
                        break;
                    }
                }
            }
            if (!$matchedEnv) {
                $envResult = [
                    'status' => 'clear',
                    'badge' => 'LOW',
                    'color' => 'green',
                    'details' => 'No recorded restriction',
                    'source' => 'CENRO & DENR-EMB Region 1',
                    'reference' => 'DENR-ECC-SFC-2026',
                ];
            }
        }

        return [
            'flood' => $floodResult,
            'fault' => $faultResult,
            'environment' => $envResult,
            'source' => 'City spatial dataset',
            'status_label' => 'City validated',
            'validated' => true,
        ];
    }

    private static function loadHazards(): ?array
    {
        if (self::$cachedHazards !== null) {
            return self::$cachedHazards;
        }
        $path = dirname(__DIR__, 2) . '/data/assessment/hazards.geojson';
        if (is_file($path)) {
            $json = file_get_contents($path);
            if ($json !== false) {
                self::$cachedHazards = json_decode($json, true);
                return self::$cachedHazards;
            }
        }
        return null;
    }

    private static function loadEnvironment(): ?array
    {
        if (self::$cachedEnvironment !== null) {
            return self::$cachedEnvironment;
        }
        $path = dirname(__DIR__, 2) . '/data/assessment/environment.geojson';
        if (is_file($path)) {
            $json = file_get_contents($path);
            if ($json !== false) {
                self::$cachedEnvironment = json_decode($json, true);
                return self::$cachedEnvironment;
            }
        }
        return null;
    }

    private static function pointInPolygon(array $point, array $polygon): bool
    {
        $x = $point[0]; // lng
        $y = $point[1]; // lat
        $inside = false;
        $n = count($polygon);
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $xi = $polygon[$i][0];
            $yi = $polygon[$i][1];
            $xj = $polygon[$j][0];
            $yj = $polygon[$j][1];
            $intersect = (($yi > $y) !== ($yj > $y)) && ($x < ($xj - $xi) * ($y - $yi) / ($yj - $yi) + $xi);
            if ($intersect) {
                $inside = !$inside;
            }
        }
        return $inside;
    }

    private static function haversineKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadius * $c;
    }
}
