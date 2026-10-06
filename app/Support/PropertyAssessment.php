<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

require_once __DIR__ . '/PropertyCatalog.php';

final class PropertyAssessment
{
    // Provisional LOCUS-SF weights; a department must explicitly enter each criterion.
    public const WEIGHTS = [
        'spatial_accessibility' => 20,
        'infrastructure_readiness' => 20,
        'economic_viability' => 20,
        'nearby_businesses' => 10,
        'zoning_compatibility' => 15,
        'risk_constraints' => 10,
        'environmental_safety' => 5,
    ];

    public static function normalize(mixed $criteria): array
    {
        if (is_string($criteria)) {
            $criteria = json_decode($criteria, true);
        }
        if ($criteria !== null && !is_array($criteria)) {
            throw new InvalidArgumentException('Assessment criteria must be an object.');
        }
        $criteria = $criteria ?? [];
        $normalized = [];
        foreach (PropertyCatalog::criteria() as $key => $label) {
            $value = $criteria[$key] ?? null;
            if ($value === null || $value === '') {
                $normalized[$key] = null;
                continue;
            }
            if (!is_numeric($value) || !is_finite((float) $value) || (float) $value < 0 || (float) $value > 100) {
                throw new InvalidArgumentException($label . ' must be a score from 0 to 100.');
            }
            $normalized[$key] = round((float) $value, 1);
        }
        return $normalized;
    }

    public static function scores(array $criteria): array
    {
        $criteria = self::normalize($criteria);
        $complete = !in_array(null, $criteria, true);
        $mce = null;
        $iai = null;
        if ($complete) {
            $weightedTotal = 0;
            foreach (self::WEIGHTS as $key => $weight) {
                $weightedTotal += $criteria[$key] * $weight;
            }
            $mce = round($weightedTotal / 100, 1);
            $iai = round($mce * 0.60 + $criteria['economic_viability'] * 0.20 + $criteria['infrastructure_readiness'] * 0.20, 1);
        }
        return [
            'assessmentCriteria' => $criteria,
            'assessmentComplete' => $complete,
            'mceScore' => $mce,
            'iaiScore' => $iai,
            'assessmentMethod' => 'Provisional LOCUS-SF departmental assessment. All criteria: 100 is most favorable, including risk constraints. MCE uses weights 20/20/20/10/15/10/5. IAI = 60% MCE + 20% economic viability + 20% infrastructure readiness. Rankings cover assessed, approved listings; tied scores share a rank.',
            'assessmentWeights' => self::WEIGHTS,
        ];
    }

    public static function ranks(array $properties): array
    {
        $rankMap = [];
        foreach (['mceScore' => 'mceRank', 'iaiScore' => 'iaiRank'] as $scoreKey => $rankKey) {
            $scored = array_values(array_filter($properties, static fn (array $property): bool => isset($property[$scoreKey])));
            usort($scored, static fn (array $a, array $b): int => $b[$scoreKey] <=> $a[$scoreKey]);
            $previousScore = null;
            $rank = 0;
            foreach ($scored as $index => $property) {
                if ($previousScore !== $property[$scoreKey]) {
                    $rank = $index + 1;
                }
                $rankMap[(int) $property['id']][$rankKey] = $rank;
                $previousScore = $property[$scoreKey];
            }
        }
        return $rankMap;
    }

    public static function policyAdjustmentPercent(): float
    {
        $config = require dirname(__DIR__) . '/config.php';
        return (float) ($config['policy']['policy_priority_adjustment_percent'] ?? 10.0);
    }

    public static function evaluateWithPolicy(?float $baseIai, bool $isPriority): array
    {
        $percent = self::policyAdjustmentPercent();
        if ($baseIai === null) {
            return [
                'baseIai' => null,
                'isPriority' => $isPriority,
                'adjustmentPercent' => $isPriority ? $percent : 0.0,
                'adjustmentPoints' => null,
                'finalIai' => null,
            ];
        }
        $adjustment = $isPriority ? round($baseIai * ($percent / 100), 1) : 0.0;
        $finalIai = min(100.0, round($baseIai + $adjustment, 1));
        return [
            'baseIai' => $baseIai,
            'isPriority' => $isPriority,
            'adjustmentPercent' => $isPriority ? $percent : 0.0,
            'adjustmentPoints' => $adjustment,
            'finalIai' => $finalIai,
        ];
    }
}
