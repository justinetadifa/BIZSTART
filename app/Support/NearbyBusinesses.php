<?php
declare(strict_types=1);

namespace App\Support;

require_once __DIR__ . '/SurroundingsRadar.php';

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
        'shopping_mall' => ['name' => 'Commercial Mall & Plaza', 'group' => 'retail', 'color' => 'purple', 'icon' => 'shopping-bag'],
        'commercial_complex' => ['name' => 'Commercial Complex & Center', 'group' => 'retail', 'color' => 'purple', 'icon' => 'building'],
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
    public static function directory(?string $dataDirectory = null): array
    {
        if ($dataDirectory === null && self::$cachedDirectory !== null) {
            return self::$cachedDirectory;
        }

        $directory = [];
        $dataDir = $dataDirectory ?? dirname(__DIR__, 2) . '/data';

        // 1. Primary: Load verified 2026 San Fernando City Commercial & Civic Directory
        $commercialDirFile = $dataDir . '/commercial-directory.json';
        if (is_file($commercialDirFile)) {
            $raw = @file_get_contents($commercialDirFile);
            if ($raw !== false) {
                $dirData = json_decode($raw, true);
                if (is_array($dirData) && isset($dirData['features']) && is_array($dirData['features'])) {
                    foreach ($dirData['features'] as $feature) {
                        $props = $feature['properties'] ?? [];
                        $name = trim((string) ($props['name'] ?? ''));
                        $coords = $feature['geometry']['coordinates'] ?? null;
                        if ($name === '' || !self::validCoordinates($feature) || self::isClosed($props)) {
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
                            'status' => self::status($props),
                            'barangay' => $props['barangay'] ?? null,
                            'address' => $props['address'] ?? null,
                            'note' => $props['note'] ?? null,
                            'source' => $props['source'] ?? 'Local Commercial Directory',
                            'footprint' => $props['footprint'] ?? (($feature['geometry']['type'] ?? '') === 'Polygon' ? $feature['geometry'] : null),
                            'bplo_no' => $props['bplo_no'] ?? null,
                            'osm_id' => $props['osm_id'] ?? null,
                        ];
                    }
                }
            }
        }

        // 2. Load official BPLO assessment registry records
        $bploFile = $dataDir . '/assessment/businesses.geojson';
        if (is_file($bploFile)) {
            $raw = @file_get_contents($bploFile);
            if ($raw !== false) {
                $bploData = json_decode($raw, true);
                if (is_array($bploData) && isset($bploData['features']) && is_array($bploData['features'])) {
                    foreach ($bploData['features'] as $feature) {
                        $props = $feature['properties'] ?? [];
                        $name = trim((string) ($props['name'] ?? ''));
                        $coords = self::representativePoint($feature);
                        if ($name === '' || $coords === null || self::isClosed($props)) {
                            continue;
                        }
                        $lng = (float) $coords[0];
                        $lat = (float) $coords[1];
                        if (!is_finite($lat) || !is_finite($lng) || abs($lat) > 90 || abs($lng) > 180) {
                            continue;
                        }
                        $rawCat = strtolower(trim((string) ($props['categoryKey'] ?? $props['category'] ?? 'commercial')));
                        $key = strtolower($name) . '|' . round($lat, 4) . '|' . round($lng, 4);
                        if (!isset($directory[$key])) {
                            $meta = self::CATEGORY_MAP[$rawCat] ?? [
                                'name' => ucwords(str_replace('_', ' ', $rawCat ?: 'Commercial Establishment')),
                                'group' => 'commercial',
                                'color' => 'slate',
                                'icon' => 'store',
                            ];
                            $directory[$key] = [
                                'id' => $props['id'] ?? ('bplo-' . md5($key)),
                                'name' => $name,
                                'category' => $meta['name'],
                                'categoryKey' => $rawCat,
                                'categoryGroup' => $meta['group'],
                                'categoryColor' => $meta['color'],
                                'icon' => $meta['icon'],
                                'lat' => $lat,
                                'lng' => $lng,
                                'status' => self::status($props),
                                'barangay' => $props['barangay'] ?? null,
                                'address' => $props['address'] ?? null,
                                'note' => $props['note'] ?? null,
                                'source' => 'San Fernando City BPLO Registry',
                                'footprint' => $props['footprint'] ?? (($feature['geometry']['type'] ?? '') === 'Polygon' ? $feature['geometry'] : null),
                                'bplo_no' => $props['bplo_no'] ?? null,
                            ];
                        }
                    }
                }
            }
        }

        // 2. Load competitor store-locator records
        $compFile = $dataDir . '/competitors.json';
        if (is_file($compFile)) {
            $raw = @file_get_contents($compFile);
            if ($raw !== false) {
                $compData = json_decode($raw, true);
                if (is_array($compData) && isset($compData['features']) && is_array($compData['features'])) {
                    foreach ($compData['features'] as $feature) {
                        $props = $feature['properties'] ?? [];
                        $name = trim((string) ($props['name'] ?? ''));
                        $coords = $feature['geometry']['coordinates'] ?? null;
                        if ($name === '' || !self::validCoordinates($feature) || self::isClosed($props)) {
                            continue;
                        }
                        $lng = (float) $coords[0];
                        $lat = (float) $coords[1];
                        if (!is_finite($lat) || !is_finite($lng) || abs($lat) > 90 || abs($lng) > 180) {
                            continue;
                        }
                        // Skip if locator note says temporarily closed
                        $note = strtolower((string) ($props['note'] ?? ''));
                        $status = self::status($props);
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
                                'source' => $props['source'] ?? 'Local Store Locator',
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
        $radarFiles = glob($dataDir . '/cache/radar/*.json') ?: [];
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
                if ($name === '' || !self::validCoordinates($feature) || self::isClosed($props)) {
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
                // A nearby different merchant is useful context. Only suppress
                // records identifying the same establishment at that location.
                $alreadyCovered = false;
                $normalizedName = self::normalizedName($name);
                foreach ($directory as $existing) {
                    $existingName = self::normalizedName($existing['name']);
                    if (!($props['nameGenerated'] ?? false) && min(strlen($normalizedName), strlen($existingName)) >= 3
                        && (str_contains($normalizedName, $existingName) || str_contains($existingName, $normalizedName))
                        && self::distance($lat, $lng, $existing['lat'], $existing['lng']) <= 45.0
                    ) {
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
                        'status' => self::status($props),
                        'note' => $props['note'] ?? null,
                        'source' => $props['source'] ?? 'Mapped place record',
                    ];
                }
            }
        }

        if ($dataDirectory === null) { self::$cachedDirectory = $directory; }
        return $directory;
    }

    private static function normalizedName(string $name): string
    {
        $name = preg_replace("/['’`]/u", '', strtolower($name));
        return trim((string) preg_replace('/[^a-z0-9]+/', ' ', (string) $name));
    }

    /** Match the subject by establishment identity, or a nearby matching name. */
    public static function isSubjectEstablishment(array $property, array $entry): bool
    {
        // A listing id and a business id belong to different namespaces.
        foreach (['osm_id', 'bplo_no', 'establishment_id'] as $key) {
            $subjectId = trim((string) ($property[$key] ?? ''));
            $placeId = trim((string) ($entry[$key] ?? ($key === 'establishment_id' ? ($entry['id'] ?? '') : '')));
            if ($subjectId !== '' && $subjectId === $placeId) {
                return true;
            }
        }
        foreach (['lat', 'lng'] as $key) {
            if (!is_numeric($property[$key] ?? null) || !is_numeric($entry[$key] ?? null)
                || !is_finite((float) $property[$key]) || !is_finite((float) $entry[$key])
                || abs((float) $property[$key]) > ($key === 'lat' ? 90 : 180)
                || abs((float) $entry[$key]) > ($key === 'lat' ? 90 : 180)) {
                return false;
            }
        }
        $distance = self::distance((float) $property['lat'], (float) $property['lng'], (float) $entry['lat'], (float) $entry['lng']);
        $withinFootprint = !empty($entry['footprint']['coordinates'])
            && SurroundingsRadar::polygonDistance($entry['footprint']['coordinates'], (float) $property['lat'], (float) $property['lng']) <= 5.0;
        if ($distance > 120.0 && !$withinFootprint) {
            return false;
        }
        $canonical = static function (string $name): string {
            $name = self::normalizedName($name);
            $name = preg_replace('/(?:\s+(?:land|lot|property|site|building|college|school|inc|corporation|corp|campus))+$/', '', $name);
            return str_replace(' ', '', (string) $name);
        };
        $placeName = $canonical((string) ($entry['name'] ?? ''));
        $genericNames = ['commercial', 'residential', 'industrial', 'property', 'building', 'school', 'college', 'business', 'vacantland', 'commercialspace', 'warehouse', 'office', 'untitled'];
        if (strlen($placeName) < 6 || in_array($placeName, $genericNames, true)) {
            return false;
        }
        foreach (['name', 'subname', 'propertySubname', 'establishment_name', 'business_name'] as $key) {
            $name = $canonical((string) ($property[$key] ?? ''));
            if (strlen($name) >= 6 && $name === $placeName) {
                return true;
            }
        }
        return false;
    }

    public static function representativePoint(array $feature): ?array
    {
        $coords = $feature['geometry']['coordinates'] ?? null;
        $type = $feature['geometry']['type'] ?? '';
        if ($type === 'Point' && is_array($coords) && count($coords) >= 2
            && is_numeric($coords[0]) && is_numeric($coords[1])
        ) {
            $lng = (float) $coords[0];
            $lat = (float) $coords[1];
            return is_finite($lat) && is_finite($lng) && abs($lat) <= 90 && abs($lng) <= 180 ? [$lng, $lat] : null;
        }
        if ($type === 'Polygon' && is_array($coords) && !empty($coords[0])) {
            $sumLat = 0.0;
            $sumLng = 0.0;
            $count = 0;
            foreach ($coords[0] as $pt) {
                if (is_array($pt) && count($pt) >= 2 && is_numeric($pt[0]) && is_numeric($pt[1])) {
                    $sumLng += (float) $pt[0];
                    $sumLat += (float) $pt[1];
                    $count++;
                }
            }
            if ($count > 0) {
                return [$sumLng / $count, $sumLat / $count];
            }
        }
        $footprint = $feature['properties']['footprint'] ?? null;
        if (is_array($footprint) && ($footprint['type'] ?? '') === 'Polygon' && !empty($footprint['coordinates'][0])) {
            $sumLat = 0.0;
            $sumLng = 0.0;
            $count = 0;
            foreach ($footprint['coordinates'][0] as $pt) {
                if (is_array($pt) && count($pt) >= 2 && is_numeric($pt[0]) && is_numeric($pt[1])) {
                    $sumLng += (float) $pt[0];
                    $sumLat += (float) $pt[1];
                    $count++;
                }
            }
            if ($count > 0) {
                return [$sumLng / $count, $sumLat / $count];
            }
        }
        return null;
    }

    private static function validCoordinates(array $feature): bool
    {
        return self::representativePoint($feature) !== null;
    }

    private static function status(array $properties): string
    {
        $status = strtolower(trim((string) ($properties['status'] ?? $properties['operating_status'] ?? 'unknown')));
        return match ($status) {
            'operating', 'existing' => 'operating',
            'under_development', 'construction', 'planned', 'proposed' => 'under_development',
            default => 'unknown',
        };
    }

    private static function isClosed(array $properties): bool
    {
        $status = strtolower(trim((string) ($properties['status'] ?? $properties['operating_status'] ?? '')));
        return in_array($status, ['closed', 'temporarily_closed', 'permanently_closed', 'disused', 'abandoned', 'demolished'], true)
            || preg_match('/\b(?:temporarily|permanently)?\s*closed\b/i', (string) ($properties['note'] ?? '')) === 1;
    }

    /**
     * Classify establishment as competitor, complementary, commercial anchor, etc.
     * Malls and major retail plazas are treated as commercial anchors unless the proposed
     * activity is specifically a regional mall.
     *
     * @return array{classification: string, classificationLabel: string, isAnchor: bool}
     */
    public static function classifyEstablishment(array $properties, ?string $proposedActivity = 'general'): array
    {
        $name = strtolower(trim((string) ($properties['name'] ?? '')));
        $categoryKey = strtolower(trim((string) ($properties['categoryKey'] ?? $properties['businessType'] ?? '')));
        $category = strtolower(trim((string) ($properties['category'] ?? '')));
        $proposedActivity = strtolower(trim((string) ($proposedActivity ?? 'general')));

        $isMallOrComplex = in_array($categoryKey, ['mall', 'shopping_mall', 'commercial_complex', 'department_store'], true)
            || str_contains($category, 'mall')
            || str_contains($category, 'commercial complex')
            || str_contains($name, 'sm city')
            || str_contains($name, 'robinsons')
            || str_contains($name, 'manna mall')
            || str_contains($name, 'csi city mall');

        if ($isMallOrComplex) {
            $isAnchor = true;
            $classification = in_array($proposedActivity, ['mall', 'shopping_mall'], true) ? 'competitor' : 'commercial_anchor';
            $label = $classification === 'competitor' ? 'Direct Competitor (Regional Mall)' : 'Commercial Activity Anchor';
            return ['classification' => $classification, 'classificationLabel' => $label, 'isAnchor' => $isAnchor];
        }

        if (in_array($categoryKey, ['supermarket', 'marketplace'], true)) {
            $classification = in_array($proposedActivity, ['supermarket', 'grocery'], true) ? 'competitor' : 'commercial_anchor';
            return [
                'classification' => $classification,
                'classificationLabel' => $classification === 'competitor' ? 'Direct Competitor' : 'Commercial Activity Anchor',
                'isAnchor' => true,
            ];
        }

        if (in_array($proposedActivity, ['', 'general', 'commercial', 'land', 'unspecified'], true)) {
            return ['classification' => 'nearby_place', 'classificationLabel' => 'Nearby place', 'isAnchor' => false];
        }

        $classified = SurroundingsRadar::classifyEstablishment(
            array_merge($properties, ['businessType' => $categoryKey]), $proposedActivity
        );
        return $classified['classification'] === 'other'
            ? ['classification' => 'nearby_place', 'classificationLabel' => 'Nearby place', 'isAnchor' => false]
            : $classified;
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
            $classInfo = self::classifyEstablishment($biz, 'general');
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
                    'footprint' => $biz['footprint'] ?? null,
                    'bplo_no' => $biz['bplo_no'] ?? null,
                    'osm_id' => $biz['osm_id'] ?? null,
                    'classification' => $classInfo['classification'],
                    'classificationLabel' => $classInfo['classificationLabel'],
                    'isAnchor' => $classInfo['isAnchor'],
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
     * @param string|null $proposedActivity
     * @return array
     */
    public static function find(array|float $propertyOrLat, ?float $lng = null, int $limit = 8, float $radiusMeters = 2000.0, ?string $proposedActivity = null, ?string $dataDirectory = null): array
    {
        if (is_array($propertyOrLat)) {
            $lat = (float) ($propertyOrLat['lat'] ?? 0);
            $lng = (float) ($propertyOrLat['lng'] ?? 0);
            $proposedActivity = $proposedActivity ?? (string) ($propertyOrLat['proposed_activity'] ?? $propertyOrLat['investmentType'] ?? 'general');
        } else {
            $lat = (float) $propertyOrLat;
            $lng = (float) ($lng ?? 0);
            $proposedActivity = $proposedActivity ?? 'general';
        }

        if ($lat === 0.0 || $lng === 0.0 || !is_finite($lat) || !is_finite($lng) || abs($lat) > 90 || abs($lng) > 180) {
            return [];
        }

        $directory = self::directory($dataDirectory);
        $matches = [];

        foreach ($directory as $entry) {
            if (is_array($propertyOrLat) && self::isSubjectEstablishment($propertyOrLat, $entry)) {
                continue;
            }
            $dist = self::distance($lat, $lng, $entry['lat'], $entry['lng']);
            if (!empty($entry['footprint']['coordinates'])) {
                $polyDist = SurroundingsRadar::polygonDistance($entry['footprint']['coordinates'], $lat, $lng);
                if (is_finite($polyDist)) {
                    $entry['boundaryDistanceMeters'] = round($polyDist, 1);
                }
            }
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

                $classInfo = self::classifyEstablishment($entry, $proposedActivity);
                $entry['classification'] = $classInfo['classification'];
                $entry['classificationLabel'] = $classInfo['classificationLabel'];
                $entry['isAnchor'] = $classInfo['isAnchor'];

                $matches[] = $entry;
            }
        }

        usort($matches, static fn (array $a, array $b): int => $a['distanceMeters'] <=> $b['distanceMeters']);

        return array_slice($matches, 0, max(1, min(50, $limit)));
    }
}
