<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

final class PropertyCatalog
{
    public static function categories(): array
    {
        return [
            'Retail' => ['Bank', 'Convenience Store', 'Day Care/Nursery', 'QSR/Fast Food', 'Gas Station', 'Grocery Store', 'Pharmacy/Drug', 'Restaurant', 'Bar', 'Storefront', 'Shopping Center', 'Auto Shop'],
            'Multifamily' => ['Student Housing', 'Single Family Rental Portfolio', 'RV Park', 'Apartment Building'],
            'Office' => ['Traditional Office', 'Executive Office', 'Medical Office', 'Creative Office'],
            'Industrial' => ['Distribution', 'Flex', 'Warehouse', 'Logistics', 'R&D'],
            'Hospitality' => ['Hotel', 'Motel', 'Casino'],
            'Mixed Use' => [],
            'Land' => ['Agricultural', 'Residential', 'Commercial', 'Industrial', 'Logistics', 'Islands', 'Farm', 'Ranch', 'Timber', 'Hunting/Recreational'],
            'Self Storage' => [],
            'Mobile Home Park' => [],
            'Senior Living' => [],
            'Special Purpose' => ['Telecom/Data Center', 'Sports/Entertainment', 'Marina', 'Golf Course', 'School', 'Religious/Church', 'Garage/Parking', 'Car Wash', 'Airport'],
            'Note/Loan' => [],
            'Business for Sale' => ['Business Only', 'Business and Building'],
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
        if ($category === null || trim($category) === '') {
            $category = match ($legacyType) {
                'logistics', 'manufacturing' => 'Industrial',
                'hotel' => 'Hospitality',
                'bpo' => 'Office',
                default => 'Land',
            };
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
}
