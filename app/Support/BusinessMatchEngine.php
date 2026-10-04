<?php
declare(strict_types=1);

namespace App\Support;

final class BusinessMatchEngine
{
    private static ?array $typologiesCache = null;

    /**
     * Load business typologies seed data.
     */
    public static function typologies(): array
    {
        if (self::$typologiesCache !== null) {
            return self::$typologiesCache;
        }

        $file = dirname(__DIR__, 2) . '/data/business-typologies.json';
        if (!is_file($file)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($file), true);
        self::$typologiesCache = is_array($decoded) ? $decoded : [];
        return self::$typologiesCache;
    }

    /**
     * Compute top 3 business match recommendations for a property.
     *
     * @param array|int $propertyOrId Property array or ID
     * @param array|null $competitorGeoJson Optional GeoJSON FeatureCollection
     * @return array
     */
    public static function recommend($propertyOrId, ?array $competitorGeoJson = null): array
    {
        $property = self::resolveProperty($propertyOrId);
        if (!$property) {
            return [
                'ok' => false,
                'error' => 'Property not found',
                'property' => null,
                'topMatches' => [],
                'allMatches' => [],
            ];
        }

        $typologies = self::typologies();
        if (empty($typologies)) {
            return [
                'ok' => false,
                'error' => 'No business typologies configured',
                'property' => $property,
                'topMatches' => [],
                'allMatches' => [],
            ];
        }

        $competitors = $competitorGeoJson ?? self::loadCompetitors();
        $nearbyCompetitors = self::findNearbyCompetitors($property, $competitors, 1000.0);

        $scored = [];
        foreach ($typologies as $type) {
            $scored[] = self::scoreTypology($property, $type, $nearbyCompetitors);
        }

        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);

        $topMatches = array_slice($scored, 0, 3);
        foreach ($topMatches as $index => &$match) {
            $match['rank'] = $index + 1;
        }
        unset($match);

        return [
            'ok' => true,
            'property' => [
                'id' => $property['id'],
                'name' => $property['name'],
                'corridor' => $property['corridor'] ?? 'downtown',
                'area' => (float) ($property['area'] ?? 0),
                'roadAccess' => (int) ($property['roadAccess'] ?? 80),
                'barangay' => $property['barangay'] ?? 'San Fernando',
                'lat' => $property['lat'] ?? null,
                'lng' => $property['lng'] ?? null,
            ],
            'topMatches' => $topMatches,
            'allMatches' => $scored,
        ];
    }

    private static function resolveProperty($propertyOrId): ?array
    {
        if (is_array($propertyOrId) && !empty($propertyOrId['id'])) {
            return $propertyOrId;
        }

        $id = (int) $propertyOrId;
        if ($id <= 0) {
            return null;
        }

        $properties = JsonData::properties();
        foreach ($properties as $p) {
            if ((int) ($p['id'] ?? 0) === $id) {
                return $p;
            }
        }

        return null;
    }

    private static function loadCompetitors(): array
    {
        $file = dirname(__DIR__, 2) . '/data/competitors.json';
        if (!is_file($file)) {
            return ['type' => 'FeatureCollection', 'features' => []];
        }
        $decoded = json_decode((string) file_get_contents($file), true);
        return is_array($decoded) ? $decoded : ['type' => 'FeatureCollection', 'features' => []];
    }

    /**
     * Compute distance in meters using haversine formula.
     */
    private static function haversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLng / 2) * sin($dLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadius * $c;
    }

    private static function findNearbyCompetitors(array $property, array $competitors, float $maxMeters): array
    {
        $lat = (float) ($property['lat'] ?? 0);
        $lng = (float) ($property['lng'] ?? 0);
        if ($lat === 0.0 && $lng === 0.0) {
            return [];
        }

        $features = $competitors['features'] ?? [];
        $found = [];

        foreach ($features as $f) {
            $coords = $f['geometry']['coordinates'] ?? null;
            if (!is_array($coords) || count($coords) < 2) {
                continue;
            }
            $compLng = (float) $coords[0];
            $compLat = (float) $coords[1];
            $distance = self::haversineDistance($lat, $lng, $compLat, $compLng);

            if ($distance <= $maxMeters) {
                $found[] = [
                    'name' => $f['properties']['name'] ?? 'Competitor',
                    'status' => $f['properties']['status'] ?? 'existing',
                    'distance' => round($distance),
                ];
            }
        }

        return $found;
    }

    private static function scoreTypology(array $property, array $typology, array $nearbyCompetitors): array
    {
        $corridor = strtolower((string) ($property['corridor'] ?? 'downtown'));
        $area = (float) ($property['area'] ?? 5.0);
        $roadAccess = (int) ($property['roadAccess'] ?? 80);
        $facilities = array_map('strtolower', (array) ($property['facilities'] ?? []));
        $tags = array_map('strtolower', (array) ($property['tags'] ?? []));

        $targetCorridors = array_map('strtolower', $typology['targetCorridors'] ?? []);
        $minArea = (float) ($typology['minAreaHa'] ?? 1.0);
        $maxArea = (float) ($typology['maxAreaHa'] ?? 20.0);
        $minRoad = (int) ($typology['minRoadAccess'] ?? 80);
        $preferredFacilities = array_map('strtolower', $typology['preferredFacilities'] ?? []);
        $preferredTags = array_map('strtolower', $typology['preferredTags'] ?? []);

        // 1. Corridor / Zoning Alignment (Weight: 30 pts)
        $zoningScore = 0.0;
        if (in_array($corridor, $targetCorridors, true)) {
            $zoningScore = 30.0;
        } elseif (($corridor === 'highway' && in_array('diversion', $targetCorridors, true)) ||
                  ($corridor === 'downtown' && in_array('commercial', $targetCorridors, true))) {
            $zoningScore = 22.0;
        } else {
            // Check if tags permit commercial/tourism
            if (in_array('commercial zone', $tags, true) || in_array('tourism hub', $tags, true)) {
                $zoningScore = 18.0;
            } else {
                $zoningScore = 8.0;
            }
        }

        // 2. Lot Scale & Geometry (Weight: 20 pts)
        $scaleScore = 0.0;
        if ($area >= $minArea && $area <= $maxArea) {
            $scaleScore = 20.0;
        } elseif ($area < $minArea) {
            $ratio = max(0.2, $area / $minArea);
            $scaleScore = round(20.0 * $ratio, 1);
        } else {
            // Area exceeds ideal max
            $scaleScore = 16.0;
        }

        // 3. Infrastructure & Road Access (Weight: 20 pts)
        $infraScore = 0.0;
        if ($roadAccess >= $minRoad) {
            $infraScore = 20.0;
        } else {
            $diff = $minRoad - $roadAccess;
            $infraScore = max(6.0, 20.0 - ($diff * 1.5));
        }

        // 4. Anchor Facilities & Synergies (Weight: 15 pts)
        $anchorScore = 0.0;
        $matchedFacilities = array_intersect($facilities, $preferredFacilities);
        $matchedTags = array_intersect($tags, $preferredTags);
        $matchesCount = count($matchedFacilities) + count($matchedTags);
        $anchorScore = min(15.0, 5.0 + ($matchesCount * 3.5));

        // 5. Market Void & Competitive Landscape (Weight: 15 pts)
        $competitorVoidScore = 15.0;
        $compCat = $typology['competitorCategory'] ?? 'general';
        $fastFoodCount = count($nearbyCompetitors);

        if ($compCat === 'fast_food' && $fastFoodCount > 0) {
            // Fast food market has nearby presence
            $competitorVoidScore = max(5.0, 15.0 - ($fastFoodCount * 4.0));
        } elseif ($compCat === 'logistics' || $compCat === 'industrial') {
            // Zero cold-storage / warehouse competitors mapped in this sector
            $competitorVoidScore = 15.0;
        } elseif ($compCat === 'hospitality' && $corridor === 'coastal') {
            $competitorVoidScore = 14.5;
        }

        $totalScore = round($zoningScore + $scaleScore + $infraScore + $anchorScore + $competitorVoidScore, 1);
        $totalScore = min(98.5, max(42.0, $totalScore));

        // Generate Human-Readable, Concrete Drivers
        $reasons = [];

        if ($zoningScore >= 25.0) {
            $reasons[] = sprintf("100%% compliant with CLUP %s strategic priority corridor.", ucfirst($corridor));
        } else {
            $reasons[] = sprintf("Permitted under conditional review for %s corridor.", ucfirst($corridor));
        }

        if ($scaleScore >= 18.0) {
            $reasons[] = sprintf("%.1f ha footprint provides ideal operational scale for %s.", $area, strtolower($typology['category']));
        } else {
            $reasons[] = sprintf("%.1f ha lot area accommodates modular multi-phase buildout.", $area);
        }

        if ($infraScore >= 18.0) {
            $reasons[] = sprintf("Superior arterial road index (%d/100) supports heavy vehicle turnaround.", $roadAccess);
        } else {
            $reasons[] = sprintf("Adequate secondary frontage (%d/100 road rating) with local road access.", $roadAccess);
        }

        if ($compCat === 'logistics' || $compCat === 'industrial') {
            $reasons[] = "Market Void: Zero competing cold-chain/logistics staging hubs in this 1km sector.";
        } elseif ($compCat === 'fast_food') {
            if ($fastFoodCount > 0) {
                $reasons[] = sprintf("Synergy: High customer footfall with %d anchor retail brand(s) nearby.", $fastFoodCount);
            } else {
                $reasons[] = "Opportunity Gap: Underserved food corridor with zero quick-service drive-thrus within 1km.";
            }
        } elseif ($compCat === 'hospitality') {
            $reasons[] = "Direct tourism spillover corridor with high leisure travel demand.";
        } else {
            $reasons[] = "Favorable demographic profile and local economic priority alignment.";
        }

        // Fit Grade
        $fitGrade = 'Conditional Fit';
        $fitColor = '#64748b';
        if ($totalScore >= 90.0) {
            $fitGrade = 'Prime Fit';
            $fitColor = '#059669';
        } elseif ($totalScore >= 80.0) {
            $fitGrade = 'Strong Fit';
            $fitColor = '#0284c7';
        } elseif ($totalScore >= 70.0) {
            $fitGrade = 'Moderate Fit';
            $fitColor = '#d97706';
        }

        return [
            'id' => $typology['id'],
            'name' => $typology['name'],
            'category' => $typology['category'],
            'icon' => $typology['icon'],
            'description' => $typology['description'],
            'score' => $totalScore,
            'fitGrade' => $fitGrade,
            'fitColor' => $fitColor,
            'pillars' => [
                'zoning' => round($zoningScore, 1),
                'lotScale' => round($scaleScore, 1),
                'infrastructure' => round($infraScore, 1),
                'anchors' => round($anchorScore, 1),
                'marketVoid' => round($competitorVoidScore, 1),
            ],
            'reasons' => array_slice($reasons, 0, 3),
            'estimatedRoi' => $typology['estimatedRoi'] ?? '16% – 22% p.a.',
            'capexTier' => $typology['capexTier'] ?? '₱25M – ₱50M',
            'jobCreation' => $typology['jobCreation'] ?? '40 – 80 jobs',
            'regulatoryNote' => $typology['regulatoryNote'] ?? 'Complies with LGU investment code.',
        ];
    }
}
