<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

final class PropertyCatalog
{
    public static function categories(): array
    {
        return [
            'Land' => [
                'Commercial Lot',
                'Residential Lot',
                'Industrial Lot',
                'Agricultural',
                'Raw Land',
                'Farm / Agribusiness',
                'Commercial',
                'Industrial',
                'Residential',
                'Logistics',
            ],
            'Building' => [
                'Commercial',
                'Office',
                'Industrial / Warehouse',
                'Residential',
                'Hospitality / Tourism',
                'Mixed-Use',
                'Retail / Storefront',
                'Warehouse / Storage',
                'Corporate Office',
                'Apartment Building',
                'Special Purpose',
            ],
        ];
    }

    public static function categoryTooltips(): array
    {
        return [
            'Land' => 'Parcels, raw land, agricultural, or lot developments.',
            'Building' => 'Commercial buildings, offices, warehouses, residential, or built structures.',
        ];
    }

    public static function criteria(bool $includeInactive = false): array
    {
        $criteria = [
            'spatial_accessibility' => 'Spatial Accessibility',
            'infrastructure_readiness' => 'Infrastructure Readiness',
            'property_cost_market_competitiveness' => 'Property Cost and Market Competitiveness',
            'nearby_businesses' => 'Nearby Businesses',
            'risk_constraints' => 'Risk Constraints',
        ];
        if ($includeInactive) {
            $criteria['zoning_compatibility'] = 'CLUP & Land-Use Regulations (Mandatory Eligibility Screening)';
            $criteria['economic_viability'] = 'Property Cost and Market Competitiveness (Legacy Alias)';
            $criteria['environmental_safety'] = 'Environmental Safety (Legacy)';
        }
        return $criteria;
    }

    public static function contextTags(): array
    {
        return ['BEACH', 'AGRICULTURAL', 'CITY CENTER', 'HIGHWAY', 'PORT', 'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'TOURISM'];
    }

    /** Shared canonical classifications and explicit legacy aliases for API and form clients. */
    public static function classificationCatalog(): array
    {
        $legacyAliases = [
            'Vacant Land' => 'Land',
            'Commercial Lot' => 'Land',
            'Residential Lot' => 'Land',
            'Industrial Lot' => 'Land',
            'Raw Land' => 'Land',
            'Agricultural' => 'Land',
            'Commercial' => 'Building',
            'Retail' => 'Building',
            'Office' => 'Building',
            'Industrial' => 'Building',
            'Industrial / Warehouse' => 'Building',
            'Hospitality' => 'Building',
            'Hospitality / Tourism' => 'Building',
            'Mixed Use' => 'Building',
            'Mixed-Use' => 'Building',
            'Residential' => 'Building',
            'Multifamily' => 'Building',
            'Senior Living' => 'Building',
            'Mobile Home Park' => 'Building',
            'Self Storage' => 'Building',
            'Special Purpose' => 'Building',
            'Note/Loan' => 'Building',
            'Note / Loan' => 'Building',
            'Business for Sale' => 'Building',
        ];

        $legacySubcategoryMap = [
            'Land' => [
                'Farm' => 'Farm / Agribusiness',
                'Ranch' => 'Farm / Agribusiness',
                'Islands' => 'Raw Land',
                'Timber' => 'Raw Land',
                'Hunting/Recreational' => 'Raw Land',
            ],
            'Building' => [
                'Storefront' => 'Retail / Storefront',
                'Retail' => 'Retail / Storefront',
                'Shopping Center' => 'Commercial',
                'Restaurant / Dining' => 'Commercial',
                'Restaurant' => 'Commercial',
                'Bar' => 'Commercial',
                'Bank / Financial' => 'Commercial',
                'Bank' => 'Commercial',
                'Auto / Service Center' => 'Commercial',
                'Auto Shop' => 'Commercial',
                'Convenience Store' => 'Retail / Storefront',
                'Gas Station' => 'Commercial',
                'Grocery Store' => 'Retail / Storefront',
                'Pharmacy/Drug' => 'Retail / Storefront',
                'Commercial Building' => 'Commercial',
                'Warehouse' => 'Warehouse / Storage',
                'Logistics / Distribution' => 'Industrial / Warehouse',
                'Distribution' => 'Industrial / Warehouse',
                'Factory / Manufacturing' => 'Industrial / Warehouse',
                'Factory' => 'Industrial / Warehouse',
                'Manufacturing' => 'Industrial / Warehouse',
                'Light Industrial' => 'Industrial / Warehouse',
                'Cold Storage' => 'Industrial / Warehouse',
                'Flex' => 'Industrial / Warehouse',
                'R&D' => 'Industrial / Warehouse',
                'BPO / IT-BPM' => 'Office',
                'BPO' => 'Office',
                'Traditional Office' => 'Office',
                'Executive Office' => 'Corporate Office',
                'Creative Office' => 'Office',
                'Medical Office' => 'Office',
                'Business Center' => 'Office',
                'Coworking Space' => 'Office',
                'Student Housing' => 'Residential',
                'Single Family Rental Portfolio' => 'Residential',
                'RV Park' => 'Residential',
                'Condominium' => 'Residential',
                'Housing Development' => 'Residential',
                'Townhouse / Multi-Unit' => 'Residential',
                'Residential Compound' => 'Residential',
                'Hotel' => 'Hospitality / Tourism',
                'Resort' => 'Hospitality / Tourism',
                'Ecotourism' => 'Hospitality / Tourism',
                'Lodging / Inn' => 'Hospitality / Tourism',
                'Motel' => 'Hospitality / Tourism',
                'Bed & Breakfast' => 'Hospitality / Tourism',
                'Casino' => 'Hospitality / Tourism',
                'Commercial-Residential' => 'Mixed-Use',
                'Office-Commercial' => 'Mixed-Use',
                'Mixed Commercial Complex' => 'Mixed-Use',
                'Institutional / Government' => 'Special Purpose',
                'Educational / School' => 'Special Purpose',
                'Healthcare / Hospital' => 'Special Purpose',
                'Sports / Recreation' => 'Special Purpose',
                'Infrastructure / Utility' => 'Special Purpose',
                'Parking Facility' => 'Special Purpose',
            ],
        ];

        // These were accepted by the original, broader category catalog. Their
        // meaning is defined by the explicit old category, never by Building or
        // Land alone; a new Building + Commercial Lot pair remains invalid.
        $legacyContextAliases = [
            'Vacant Land' => ['Commercial' => 'Commercial Lot', 'Industrial' => 'Industrial Lot', 'Residential' => 'Residential Lot', 'Logistics' => 'Industrial Lot'],
            'Commercial' => ['Commercial Lot' => 'Commercial'],
            'Retail' => ['Commercial Lot' => 'Commercial'],
            'Business for Sale' => ['Commercial Lot' => 'Commercial'],
            'Industrial / Warehouse' => ['Industrial Lot' => 'Industrial / Warehouse', 'Logistics' => 'Industrial / Warehouse'],
            'Industrial' => ['Industrial Lot' => 'Industrial / Warehouse', 'Logistics' => 'Industrial / Warehouse'],
            'Self Storage' => ['Industrial Lot' => 'Industrial / Warehouse', 'Logistics' => 'Industrial / Warehouse'],
            'Residential' => ['Residential Lot' => 'Residential'],
            'Multifamily' => ['Residential Lot' => 'Residential'],
            'Senior Living' => ['Residential Lot' => 'Residential'],
            'Mobile Home Park' => ['Residential Lot' => 'Residential'],
        ];

        return [
            'categories' => self::categories(),
            'categoryAliases' => $legacyAliases,
            'subcategoryAliases' => $legacySubcategoryMap,
            'legacySubcategoryAliases' => $legacyContextAliases,
        ];
    }

    public static function normalizeCategory(?string $category, ?string $subcategory, string $legacyType): array
    {
        $catalog = self::classificationCatalog();
        $categories = $catalog['categories'];
        $categoryInput = $category === null ? '' : self::classificationKey($category);
        $contextAliases = [];
        foreach ($catalog['legacySubcategoryAliases'] as $legacyCategory => $aliases) {
            if (self::classificationKey($legacyCategory) === $categoryInput) {
                $contextAliases = $aliases;
                break;
            }
        }
        $parts = $subcategory === null ? [] : array_values(array_filter(
            array_map('trim', explode(',', $subcategory)),
            static fn (string $item): bool => $item !== ''
        ));

        if ($categoryInput === '') {
            // A missing historical category can be inferred only if every
            // supplied classification is valid for the same single category.
            $candidates = [];
            if ($parts !== []) {
                foreach ($categories as $candidate => $allowed) {
                    $valid = true;
                    foreach ($parts as $part) {
                        if (self::resolveClassification($part, $allowed, $catalog['subcategoryAliases'][$candidate]) === null) {
                            $valid = false;
                            break;
                        }
                    }
                    if ($valid) {
                        $candidates[] = $candidate;
                    }
                }
            }
            $category = count($candidates) === 1 ? $candidates[0] : match (strtolower(trim($legacyType))) {
                'commercial', 'retail', 'office', 'bpo', 'industrial', 'warehouse', 'manufacturing', 'logistics', 'hotel', 'hospitality', 'residential', 'mixed_use', 'mixed use' => 'Building',
                default => 'Land',
            };
        } else {
            $category = null;
            foreach (array_keys($categories) as $canonical) {
                if (self::classificationKey($canonical) === $categoryInput) {
                    $category = $canonical;
                    break;
                }
            }
            if ($category === null) {
                foreach ($catalog['categoryAliases'] as $alias => $canonical) {
                    if (self::classificationKey($alias) === $categoryInput) {
                        $category = $canonical;
                        break;
                    }
                }
            }
            if ($category === null) {
                throw new InvalidArgumentException('Choose a valid property category.');
            }
        }

        $normalizedParts = [];
        foreach ($parts as $part) {
            $resolved = self::resolveClassification($part, $categories[$category], $contextAliases + $catalog['subcategoryAliases'][$category]);
            if ($resolved === null) {
                throw new InvalidArgumentException('Choose a subcategory belonging to the selected category.');
            }
            $normalizedParts[] = $resolved;
        }
        return [$category, $normalizedParts === [] ? null : implode(', ', array_unique($normalizedParts))];
    }

    private static function classificationKey(string $value): string
    {
        return strtolower(trim((string) preg_replace('/\s+/', ' ', $value)));
    }

    private static function resolveClassification(string $value, array $allowed, array $aliases): ?string
    {
        $key = self::classificationKey($value);
        // Category-specific historical aliases take precedence where an old
        // generic label now also appears as a canonical option.
        foreach ($aliases as $alias => $canonical) {
            if (self::classificationKey($alias) === $key && in_array($canonical, $allowed, true)) {
                return $canonical;
            }
        }
        foreach ($allowed as $canonical) {
            if (self::classificationKey($canonical) === $key) {
                return $canonical;
            }
        }
        return null;
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
