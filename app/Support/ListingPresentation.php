<?php

declare(strict_types=1);

namespace App\Support;

/** Price text shared by summaries and downloadable property records. */
final class ListingPresentation
{
    public static function purpose(array $property): string
    {
        return match ($property['listingPurpose'] ?? 'sale') {
            'lease' => 'For Lease',
            'sale_or_lease' => 'For Sale or Lease',
            default => 'For Sale',
        };
    }

    public static function salePrice(array $property): ?float
    {
        if (($property['listingPurpose'] ?? 'sale') === 'lease') { return null; }
        return self::amount(array_key_exists('salePrice', $property) ? $property['salePrice'] : ($property['price'] ?? null));
    }

    public static function prices(array $property): array
    {
        $purpose = $property['listingPurpose'] ?? 'sale';
        $result = [];
        if ($purpose !== 'lease') { $result['Sale price'] = self::money(self::salePrice($property)); }
        if ($purpose !== 'sale') {
            $amount = self::amount($property['leasePrice'] ?? null);
            $period = in_array($property['leasePeriod'] ?? '', ['day', 'month', 'year'], true) ? $property['leasePeriod'] : 'month';
            $result['Lease price'] = $amount === null ? 'Price on request' : self::money($amount)
                . (($property['leasePriceUnit'] ?? 'total') === 'sqm' ? ' / m²' : '') . ' / ' . $period;
        }
        return $result;
    }

    public static function money(?float $amount): string
    {
        return $amount === null ? 'Price on request' : 'PHP ' . number_format($amount, floor($amount) === $amount ? 0 : 2);
    }

    private static function amount(mixed $value): ?float
    {
        return $value !== null && $value !== '' && is_numeric($value) && is_finite((float) $value) && (float) $value >= 0 ? (float) $value : null;
    }
}
