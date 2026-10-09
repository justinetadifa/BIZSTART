<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

final class PropertyCatalog
{
    public static function categories(): array
    {
        return [
            'Vacant Land' => ['Agricultural', 'Residential Lot', 'Commercial Lot', 'Industrial Lot', 'Raw Land', 'Farm / Agribusiness'],
            'Commercial' => ['Retail / Storefront', 'Shopping Center', 'Restaurant / Dining', 'Bank / Financial', 'Commercial Building', 'Auto / Service Center'],
            'Office' => ['BPO / IT-BPM', 'Corporate Office', 'Medical Office', 'Business Center', 'Coworking Space'],
            'Industrial / Warehouse' => ['Warehouse / Storage', 'Logistics / Distribution', 'Factory / Manufacturing', 'Light Industrial', 'Cold Storage'],
            'Residential' => ['Apartment Building', 'Condominium', 'Housing Development', 'Townhouse / Multi-Unit', 'Residential Compound'],
            'Hospitality / Tourism' => ['Hotel', 'Resort', 'Ecotourism', 'Lodging / Inn', 'Bed & Breakfast'],
            'Mixed-Use' => ['Commercial-Residential', 'Office-Commercial', 'Mixed Commercial Complex'],
            'Special Purpose' => ['Institutional / Government', 'Educational / School', 'Healthcare / Hospital', 'Sports / Recreation', 'Infrastructure / Utility', 'Parking Facility'],
        ];
    }

    public static function categoryTooltips(): array
    {
        return [
            'Vacant Land' => 'Undeveloped lot or parcel.',
            'Commercial' => 'Shops, retail spaces, and commercial buildings.',
            'Office' => 'Offices, BPO/IT-BPM spaces, and business centers.',
            'Industrial / Warehouse' => 'Factories, warehouses, logistics, and industrial properties.',
            'Residential' => 'Apartments, condominiums, housing, and residential developments.',
            'Hospitality / Tourism' => 'Hotels, resorts, lodging, and tourism-related properties.',
            'Mixed-Use' => 'A combination of commercial, residential, office, or other compatible uses.',
            'Special Purpose' => 'Institutional or specialized properties that do not fit the standard categories.',
        ];
    }

    public static function criteria(): array
    {
        return [
            'spatial_accessibility' => 'Spatial accessibility',
            'infrastructure_readiness' => 'Infrastructure readiness',
            'economic_viability' => 'Economic viability',
            'nearby_businesses' => 'Nearby businesses',
            'zoning_compatibility' => 'Zoning compatibility',
            'risk_constraints' => 'Risk constraints',
            'environmental_safety' => 'Environmental safety',
        ];
    }

    public static function contextTags(): array
    {
        return ['BEACH', 'AGRICULTURAL', 'CITY CENTER', 'HIGHWAY', 'PORT', 'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'TOURISM'];
    }

    public static function normalizeCategory(?string $category, ?string $subcategory, string $legacyType): array
    {
        $legacyAliases = [
            'Land' => 'Vacant Land',
            'Retail' => 'Commercial',
            'Industrial' => 'Industrial / Warehouse',
            'Hospitality' => 'Hospitality / Tourism',
            'Mixed Use' => 'Mixed-Use',
            'Multifamily' => 'Residential',
            'Senior Living' => 'Residential',
            'Mobile Home Park' => 'Residential',
            'Self Storage' => 'Industrial / Warehouse',
            'Note/Loan' => 'Special Purpose',
            'Note / Loan' => 'Special Purpose',
            'Business for Sale' => 'Commercial',
        ];

        if ($category === null || trim($category) === '') {
            $category = match (strtolower(trim($legacyType))) {
                'logistics', 'manufacturing' => 'Industrial / Warehouse',
                'hotel', 'hospitality' => 'Hospitality / Tourism',
                'bpo', 'office' => 'Office',
                'residential' => 'Residential',
                'commercial', 'retail' => 'Commercial',
                'mixed_use', 'mixed use' => 'Mixed-Use',
                default => 'Vacant Land',
            };
        } else {
            $category = trim($category);
            if (isset($legacyAliases[$category])) {
                $category = $legacyAliases[$category];
            }
        }

        $categories = self::categories();
        if (!array_key_exists($category, $categories)) {
            throw new InvalidArgumentException('Choose a valid property category.');
        }
        $subcategory = $subcategory === null || trim($subcategory) === '' ? null : trim($subcategory);
        if ($subcategory !== null) {
            $parts = array_values(array_unique(array_filter(
                array_map('trim', explode(',', $subcategory)),
                static fn (string $item): bool => $item !== ''
            )));
            if (empty($parts)) {
                $subcategory = null;
            } else {
                foreach ($parts as $part) {
                    if (!in_array($part, $categories[$category], true)) {
                        throw new InvalidArgumentException('Choose a subcategory belonging to the selected category.');
                    }
                }
                $subcategory = implode(', ', $parts);
            }
        }
        return [$category, $subcategory];
    }

    public static function clupUseTypes(?\PDO $pdo = null): array
    {
        if ($pdo !== null) {
            try {
                $rows = $pdo->query("SELECT code, label, category, description FROM clup_use_types WHERE is_active = 1 ORDER BY label")->fetchAll(\PDO::FETCH_ASSOC);
                if (!empty($rows)) {
                    return $rows;
                }
            } catch (\Throwable) {}
        }
        return [
            ['code' => 'residential', 'label' => 'Residential', 'category' => 'residential', 'description' => 'Housing, subdivisions, condominiums, and apartment developments.'],
            ['code' => 'commercial', 'label' => 'Commercial', 'category' => 'commercial', 'description' => 'Retail, service, and commercial-center development.'],
            ['code' => 'bpo', 'label' => 'Office / IT-BPM', 'category' => 'office', 'description' => 'Offices, BPO/IT-BPM spaces, business centers, and knowledge-sector use.'],
            ['code' => 'industrial', 'label' => 'Industrial', 'category' => 'industrial', 'description' => 'Manufacturing, logistics, warehousing, and industrial operations.'],
            ['code' => 'agricultural', 'label' => 'Agricultural', 'category' => 'agricultural', 'description' => 'Farming, agro-industrial, cultivation, and agricultural production.'],
            ['code' => 'institutional', 'label' => 'Institutional', 'category' => 'institutional', 'description' => 'Government, public facilities, civic, and community institutions.'],
            ['code' => 'hotel', 'label' => 'Tourism / Hospitality', 'category' => 'tourism', 'description' => 'Hotels, resorts, lodging, and visitor-serving accommodations.'],
            ['code' => 'mixed_use', 'label' => 'Mixed-Use', 'category' => 'mixed_use', 'description' => 'Integrated compatible commercial, residential, office, or other uses.'],
            ['code' => 'special_use', 'label' => 'Special Use / Other', 'category' => 'special_use', 'description' => 'Institutional, utility, or specialized properties not fitting standard zones.'],
        ];
    }

    public static function barangays(): array
    {
        $path = dirname(__DIR__, 2) . '/data/barangays.json';
        if (is_file($path)) {
            $data = json_decode((string) file_get_contents($path), true);
            if (is_array($data['barangays'] ?? null)) {
                return $data['barangays'];
            }
        }
        return [];
    }
}
