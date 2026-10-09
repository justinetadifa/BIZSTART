<?php
declare(strict_types=1);

namespace App\Support;

/**
 * Service to discover and format nearby businesses and commercial anchors
 * for parcels and candidate properties across San Fernando City, La Union.
 */
final class NearbyBusinesses
{
    private const EARTH_RADIUS_METERS = 6371000.0;
    private const WALKING_SPEED_METERS_PER_MIN = 80.0; // 4.8 km/h brisk pedestrian pace

    /** @var array<string, array>|null */
    private static ?array $cachedDirectory = null;

    /**
     * Category mapping for clean executive display, icons, and theme color styles.
     */
    private const CATEGORY_MAP = [
        'fast_food' => ['name' => 'Fast Food & QSR', 'group' => 'dining', 'color' => 'amber', 'icon' => 'utensils'],
        'restaurant' => ['name' => 'Restaurant & Dining', 'group' => 'dining', 'color' => 'amber', 'icon' => 'utensils'],
        'cafe' => ['name' => 'Café & Beverage', 'group' => 'dining', 'color' => 'amber', 'icon' => 'coffee'],
        'bakery' => ['name' => 'Bakery & Pastry', 'group' => 'dining', 'color' => 'amber', 'icon' => 'coffee'],
        'pastry' => ['name' => 'Bakery & Pastry', 'group' => 'dining', 'color' => 'amber', 'icon' => 'coffee'],
        'bank' => ['name' => 'Banking & Financial', 'group' => 'financial', 'color' => 'blue', 'icon' => 'landmark'],
        'pawnbroker' => ['name' => 'Financial & Pawnshop', 'group' => 'financial', 'color' => 'blue', 'icon' => 'landmark'],
        'money_transfer' => ['name' => 'Remittance & Finance', 'group' => 'financial', 'color' => 'blue', 'icon' => 'landmark'],
        'pharmacy' => ['name' => 'Pharmacy & Medicine', 'group' => 'healthcare', 'color' => 'emerald', 'icon' => 'cross'],
        'chemist' => ['name' => 'Pharmacy & Health', 'group' => 'healthcare', 'color' => 'emerald', 'icon' => 'cross'],
        'dentist' => ['name' => 'Dental Care', 'group' => 'healthcare', 'color' => 'emerald', 'icon' => 'cross'],
        'doctors' => ['name' => 'Medical Clinic', 'group' => 'healthcare', 'color' => 'emerald', 'icon' => 'cross'],
        'clinic' => ['name' => 'Medical Clinic', 'group' => 'healthcare', 'color' => 'emerald', 'icon' => 'cross'],
        'hospital' => ['name' => 'Hospital & Healthcare', 'group' => 'healthcare', 'color' => 'emerald', 'icon' => 'cross'],
        'optician' => ['name' => 'Optical Clinic', 'group' => 'healthcare', 'color' => 'emerald', 'icon' => 'cross'],
        'supermarket' => ['name' => 'Supermarket & Grocery', 'group' => 'retail', 'color' => 'purple', 'icon' => 'shopping-bag'],
        'convenience' => ['name' => 'Convenience Retail', 'group' => 'retail', 'color' => 'purple', 'icon' => 'shopping-bag'],
        'marketplace' => ['name' => 'Public Market & Retail', 'group' => 'retail', 'color' => 'purple', 'icon' => 'shopping-bag'],
        'mall' => ['name' => 'Commercial Mall & Plaza', 'group' => 'retail', 'color' => 'purple', 'icon' => 'shopping-bag'],
        'department_store' => ['name' => 'Department Store', 'group' => 'retail', 'color' => 'purple', 'icon' => 'shopping-bag'],
        'hotel' => ['name' => 'Hotel & Lodging', 'group' => 'hospitality', 'color' => 'cyan', 'icon' => 'building'],
        'hostel' => ['name' => 'Hostel & Lodging', 'group' => 'hospitality', 'color' => 'cyan', 'icon' => 'building'],
        'hardware' => ['name' => 'Hardware & Supplies', 'group' => 'trade', 'color' => 'slate', 'icon' => 'wrench'],
        'doityourself' => ['name' => 'DIY & Hardware', 'group' => 'trade', 'color' => 'slate', 'icon' => 'wrench'],
        'building_materials' => ['name' => 'Building Materials', 'group' => 'trade', 'color' => 'slate', 'icon' => 'wrench'],
        'car_parts' => ['name' => 'Auto Supply & Parts', 'group' => 'automotive', 'color' => 'slate', 'icon' => 'wrench'],
        'car_repair' => ['name' => 'Vehicle Service & Repair', 'group' => 'automotive', 'color' => 'slate', 'icon' => 'wrench'],
        'motorcycle_repair' => ['name' => 'Motorcycle Repair & Parts', 'group' => 'automotive', 'color' => 'slate', 'icon' => 'wrench'],
        'bicycle' => ['name' => 'Bicycle & Mobility', 'group' => 'automotive', 'color' => 'slate', 'icon' => 'wrench'],
        'fuel' => ['name' => 'Fuel & Energy Station', 'group' => 'automotive', 'color' => 'amber', 'icon' => 'gas'],
        'school' => ['name' => 'Educational Institution', 'group' => 'education', 'color' => 'indigo', 'icon' => 'graduation-cap'],
        'college' => ['name' => 'College & Higher Education', 'group' => 'education', 'color' => 'indigo', 'icon' => 'graduation-cap'],
        'office' => ['name' => 'Commercial Office', 'group' => 'civic', 'color' => 'slate', 'icon' => 'briefcase'],
        'townhall' => ['name' => 'Local Government & Public Hall', 'group' => 'civic', 'color' => 'slate', 'icon' => 'landmark'],
        'courthouse' => ['name' => 'Judicial / Government Office', 'group' => 'civic', 'color' => 'slate', 'icon' => 'landmark'],
        'police' => ['name' => 'Police & Public Safety', 'group' => 'civic', 'color' => 'blue', 'icon' => 'shield'],
        'fire_station' => ['name' => 'Emergency & Fire Station', 'group' => 'civic', 'color' => 'rose', 'icon' => 'shield'],
        'place_of_worship' => ['name' => 'Place of Worship', 'group' => 'civic', 'color' => 'slate', 'icon' => 'church'],
        'beauty' => ['name' => 'Beauty & Personal Care', 'group' => 'services', 'color' => 'rose', 'icon' => 'sparkles'],
        'hairdresser' => ['name' => 'Salon & Grooming', 'group' => 'services', 'color' => 'rose', 'icon' => 'sparkles'],
        'laundry' => ['name' => 'Laundry & Dry Cleaning', 'group' => 'services', 'color' => 'cyan', 'icon' => 'sparkles'],
        'clothes' => ['name' => 'Apparel & Clothing', 'group' => 'retail', 'color' => 'purple', 'icon' => 'shopping-bag'],
        'shoes' => ['name' => 'Footwear & Apparel', 'group' => 'retail', 'color' => 'purple', 'icon' => 'shopping-bag'],
        'electronics' => ['name' => 'Electronics & Tech', 'group' => 'retail', 'color' => 'blue', 'icon' => 'monitor'],
        'computer' => ['name' => 'Computer & Tech Services', 'group' => 'retail', 'color' => 'blue', 'icon' => 'monitor'],
        'books' => ['name' => 'Books & Stationeries', 'group' => 'retail', 'color' => 'indigo', 'icon' => 'book'],
        'furniture' => ['name' => 'Home & Furniture', 'group' => 'retail', 'color' => 'amber', 'icon' => 'store'],
        'telecommunication' => ['name' => 'Telecommunications & Mobile', 'group' => 'services', 'color' => 'blue', 'icon' => 'phone'],
        'travel_agency' => ['name' => 'Travel & Logistics', 'group' => 'services', 'color' => 'cyan', 'icon' => 'globe'],
    ];

    /**
     * Compute Haversine straight-line distance in meters.
     */
    public static function distance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * (sin($dLng / 2) ** 2);
        $c = 2 * atan2(sqrt($a), sqrt(max(0.0, 1.0 - $a)));
        return self::EARTH_RADIUS_METERS * $c;
    }

    /**
     * Load all verified commercial establishments and points of interest.
     *
     * @return array<string, array>
     */
    public static function directory(): array
    {
        if (self::$cachedDirectory !== null) {
            return self::$cachedDirectory;
        }

        $directory = [];
        $baseDir = dirname(__DIR__, 2);

        // 1. Primary: Load verified 2026 San Fernando City Commercial & Civic Directory
        $commercialDirFile = $baseDir . '/data/commercial-directory.json';
        if (is_file($commercialDirFile)) {
            $raw = @file_get_contents($commercialDirFile);
            if ($raw !== false) {
                $dirData = json_decode($raw, true);
                if (is_array($dirData) && isset($dirData['features']) && is_array($dirData['features'])) {
                    foreach ($dirData['features'] as $feature) {
                        $props = $feature['properties'] ?? [];
                        $name = trim((string) ($props['name'] ?? ''));
                        $coords = $feature['geometry']['coordinates'] ?? null;
                        if ($name === '' || !is_array($coords) || count($coords) < 2) {
                            continue;
                        }
                        $lng = (float) $coords[0];
                        $lat = (float) $coords[1];
                        if (!is_finite($lat) || !is_finite($lng) || abs($lat) > 90 || abs($lng) > 180) {
                            continue;
                        }
                        $rawCat = strtolower(trim((string) ($props['categoryKey'] ?? $props['category'] ?? $props['businessType'] ?? 'commercial')));
                        $meta = self::CATEGORY_MAP[$rawCat] ?? [
                            'name' => ucwords(str_replace('_', ' ', $rawCat ?: 'Commercial Establishment')),
                            'group' => 'commercial',
                            'color' => 'slate',
                            'icon' => 'store',
                        ];
                        $key = strtolower($name) . '|' . round($lat, 4) . '|' . round($lng, 4);
                        $directory[$key] = [
                            'id' => $props['id'] ?? $feature['id'] ?? ('biz-' . md5($key)),
                            'name' => $name,
                            'category' => $meta['name'],
                            'categoryKey' => $rawCat,
                            'categoryGroup' => $meta['group'],
                            'categoryColor' => $meta['color'],
                            'icon' => $meta['icon'],
                            'lat' => $lat,
                            'lng' => $lng,
                            'status' => 'operating',
                            'barangay' => $props['barangay'] ?? null,
                            'address' => $props['address'] ?? null,
                            'note' => $props['note'] ?? null,
                            'source' => 'San Fernando City Commercial Registry',
                        ];
                    }
                }
            }
        }

        // 2. Load competitor store-locator records
        $compFile = $baseDir . '/data/competitors.json';
        if (is_file($compFile)) {
            $raw = @file_get_contents($compFile);
            if ($raw !== false) {
                $compData = json_decode($raw, true);
                if (is_array($compData) && isset($compData['features']) && is_array($compData['features'])) {
                    foreach ($compData['features'] as $feature) {
                        $props = $feature['properties'] ?? [];
                        $name = trim((string) ($props['name'] ?? ''));
                        $coords = $feature['geometry']['coordinates'] ?? null;
                        if ($name === '' || !is_array($coords) || count($coords) < 2) {
                            continue;
                        }
                        $lng = (float) $coords[0];
                        $lat = (float) $coords[1];
                        if (!is_finite($lat) || !is_finite($lng) || abs($lat) > 90 || abs($lng) > 180) {
                            continue;
                        }
                        // Skip if locator note says temporarily closed
                        $note = strtolower((string) ($props['note'] ?? ''));
                        $status = ($props['status'] ?? '') === 'existing' ? 'operating' : 'under_development';
                        if (str_contains($note, 'temporarily closed') || str_contains($note, 'closed')) {
                            // Don't surface closed locations as operating
                            continue;
                        }
                        $key = strtolower($name) . '|' . round($lat, 4) . '|' . round($lng, 4);
                        if (!isset($directory[$key])) {
                            $directory[$key] = [
                                'id' => $feature['id'] ?? ('comp-' . md5($key)),
                                'name' => $name,
                                'category' => 'Commercial Anchor (QSR)',
                                'categoryKey' => 'fast_food',
                                'categoryGroup' => 'dining',
                                'categoryColor' => 'amber',
                                'icon' => 'utensils',
                                'lat' => $lat,
                                'lng' => $lng,
                                'status' => $status,
                                'note' => $props['note'] ?? null,
                                'source' => 'Verified Brand Locator',
                            ];
                        }
                    }
                }
            }
        }

        // Excluded non-commercial or invalid POI categories
        $excludedCategories = [
            'toilets', 'parking', 'motorcycle_parking', 'bicycle_parking',
            'waste_basket', 'bench', 'drinking_water', 'fountain', 'grave_yard',
            'viewpoint', 'atm', 'vending_machine', 'recycling',
        ];

        // 3. Load supplementary cached radar datasets with strict quality filtering
        $radarFiles = glob($baseDir . '/data/cache/radar/*.json') ?: [];
        foreach ($radarFiles as $file) {
            $raw = @file_get_contents($file);
            if ($raw === false) {
                continue;
            }
            $data = json_decode($raw, true);
            if (!is_array($data) || !isset($data['features']) || !is_array($data['features'])) {
                continue;
            }
            foreach ($data['features'] as $feature) {
                $props = $feature['properties'] ?? [];
                $name = trim((string) ($props['name'] ?? ''));
                $coords = $feature['geometry']['coordinates'] ?? null;
                if ($name === '' || !is_array($coords) || count($coords) < 2) {
                    continue;
                }
                $lng = (float) $coords[0];
                $lat = (float) $coords[1];
                if (!is_finite($lat) || !is_finite($lng) || abs($lat) > 90 || abs($lng) > 180) {
                    continue;
                }
                $rawCat = strtolower(trim((string) ($props['category'] ?? $props['businessType'] ?? 'commercial')));
                if (in_array($rawCat, $excludedCategories, true)) {
                    continue;
                }
                // Filter out generic placeholder names
                if (preg_match('/^Local (Toilets|Parking|Motorcycle parking|Car repair|Furniture|Doctors|Community centre|Convenience|Industrial)/i', $name)) {
                    continue;
                }
                // Check if already covered by verified directory within 45m
                $alreadyCovered = false;
                foreach ($directory as $existing) {
                    if (self::distance($lat, $lng, $existing['lat'], $existing['lng']) <= 45.0) {
                        $alreadyCovered = true;
                        break;
                    }
                }
                if ($alreadyCovered) {
                    continue;
                }
                $key = strtolower($name) . '|' . round($lat, 4) . '|' . round($lng, 4);
                if (!isset($directory[$key])) {
                    $meta = self::CATEGORY_MAP[$rawCat] ?? [
                        'name' => ucwords(str_replace('_', ' ', $rawCat ?: 'Commercial Establishment')),
                        'group' => 'commercial',
                        'color' => 'slate',
                        'icon' => 'store',
                    ];
                    $directory[$key] = [
                        'id' => $props['id'] ?? ('biz-' . md5($key)),
                        'name' => $name,
                        'category' => $meta['name'],
                        'categoryKey' => $rawCat,
                        'categoryGroup' => $meta['group'],
                        'categoryColor' => $meta['color'],
                        'icon' => $meta['icon'],
                        'lat' => $lat,
                        'lng' => $lng,
                        'status' => 'operating',
                        'note' => $props['note'] ?? null,
                        'source' => 'San Fernando Commercial Registry',
                    ];
                }
            }
        }

        self::$cachedDirectory = $directory;
        return $directory;
    }

    /**
     * Export the verified directory as a GeoJSON FeatureCollection for frontend maps.
     *
     * @return array
     */
    public static function asGeoJson(): array
    {
        $dir = self::directory();
        $features = [];

        foreach ($dir as $biz) {
            $features[] = [
                'type' => 'Feature',
                'id' => $biz['id'],
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [(float) $biz['lng'], (float) $biz['lat']],
                ],
                'properties' => [
                    'id' => $biz['id'],
                    'name' => $biz['name'],
                    'category' => $biz['category'],
                    'categoryKey' => $biz['categoryKey'],
                    'categoryGroup' => $biz['categoryGroup'],
                    'categoryColor' => $biz['categoryColor'],
                    'icon' => $biz['icon'],
                    'status' => $biz['status'],
                    'barangay' => $biz['barangay'] ?? null,
                    'address' => $biz['address'] ?? null,
                    'note' => $biz['note'] ?? null,
                    'source' => $biz['source'] ?? 'Verified Commercial Directory',
                ],
            ];
        }

        return [
            'type' => 'FeatureCollection',
            'features' => $features,
            'count' => count($features),
            'generated' => date('Y-m-d'),
        ];
    }

    /**
     * Find nearby businesses for a given property array or coordinates.
     *
     * @param array|float $propertyOrLat
     * @param float|null $lng
     * @param int $limit
     * @param float $radiusMeters
     * @return array
     */
    public static function find(array|float $propertyOrLat, ?float $lng = null, int $limit = 8, float $radiusMeters = 2000.0): array
    {
        if (is_array($propertyOrLat)) {
            $lat = (float) ($propertyOrLat['lat'] ?? 0);
            $lng = (float) ($propertyOrLat['lng'] ?? 0);
        } else {
            $lat = (float) $propertyOrLat;
            $lng = (float) ($lng ?? 0);
        }

        if ($lat === 0.0 || $lng === 0.0 || !is_finite($lat) || !is_finite($lng)) {
            return [];
        }

        $directory = self::directory();
        $matches = [];

        foreach ($directory as $entry) {
            $dist = self::distance($lat, $lng, $entry['lat'], $entry['lng']);
            if ($dist <= $radiusMeters) {
                $distRounded = round($dist);
                $distKm = round($dist / 1000.0, 2);
                $walkingMinutes = max(1, (int) round($dist / self::WALKING_SPEED_METERS_PER_MIN));
                $walkingFormatted = $dist < 100
                    ? '< 1 min walk'
                    : ($dist <= 1200 ? "{$walkingMinutes} min walk" : round($dist / 400.0) . ' min drive');

                $entry['distanceMeters'] = $distRounded;
                $entry['distanceKm'] = $distKm;
                $entry['distanceFormatted'] = $dist < 1000 ? "{$distRounded} m" : "{$distKm} km";
                $entry['walkingMinutes'] = $walkingMinutes;
                $entry['walkingFormatted'] = $walkingFormatted;
                $matches[] = $entry;
            }
        }

        usort($matches, static fn (array $a, array $b): int => $a['distanceMeters'] <=> $b['distanceMeters']);

        return array_slice($matches, 0, max(1, min(50, $limit)));
    }
}
