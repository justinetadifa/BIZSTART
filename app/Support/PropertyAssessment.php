<?php
declare(strict_types=1);

namespace App\Support;

require_once __DIR__ . '/PropertyCatalog.php';
require_once __DIR__ . '/PropertyAssessmentService.php';

final class PropertyAssessment
{
    // Provisional LOCUS-SF 6-criterion weights totaling exactly 100%
    public const WEIGHTS = [
        'spatial_accessibility' => 20,
        'infrastructure_readiness' => 20,
        'economic_viability' => 20,
        'nearby_businesses' => 10,
        'zoning_compatibility' => 15,
        'risk_constraints' => 15,
    ];

    public static function normalize(mixed $criteria): array
    {
        return PropertyAssessmentService::normalize($criteria);
    }

    public static function evaluate(array $criteria, mixed $optionsOrComplete = [], array $options = []): array
    {
        if (is_array($optionsOrComplete)) {
            $options = array_merge($optionsOrComplete, $options);
        }
        return PropertyAssessmentService::evaluate($criteria, $options);
    }

    public static function scores(array $criteria, mixed $optionsOrComplete = [], array $options = []): array
    {
        if (is_array($optionsOrComplete)) {
            $options = array_merge($optionsOrComplete, $options);
        }
        $result = PropertyAssessmentService::evaluate($criteria, $options);
        return [
            'assessmentCriteria' => $result['assessmentCriteria'],
            'assessmentComplete' => $result['assessmentComplete'],
            'assessmentStatus' => $result['status'],
            'eligibility' => $result['eligibility'],
            'mceScore' => $result['mceScore'],
            'iaiScore' => $result['iaiScore'],
            'assessmentMethod' => $result['assessmentMethod'],
            'assessmentWeights' => $result['assessmentWeights'],
            'methodology' => $result['methodology'],
            'weightStatus' => $result['weight_status'],
            'criteria' => $result['criteria'],
            'criteriaBreakdown' => $result['criteria'],
            'missingRequirements' => $result['missing_requirements'],
            'policyAlignment' => $result['policy_alignment'],
            'reason' => $result['reason'] ?? null,
            'note' => $result['note'] ?? null,
        ];
    }

    public static function evaluateSpatialAccessibility(mixed $input, array $options = []): array
    {
        return PropertyAssessmentService::evaluateSpatialAccessibility($input, $options);
    }

    public static function evaluateInfrastructureReadiness(mixed $input, array $options = []): array
    {
        return PropertyAssessmentService::evaluateInfrastructureReadiness($input, $options);
    }

    public static function evaluateEconomicViability(mixed $input, array $options = []): array
    {
        return PropertyAssessmentService::evaluateEconomicViability($input, $options);
    }

    public static function evaluateNearbyBusinesses(mixed $input, array $options = []): array
    {
        return PropertyAssessmentService::evaluateNearbyBusinesses($input, $options);
    }

    public static function evaluateZoningCompatibility(mixed $input, array $options = []): array
    {
        return PropertyAssessmentService::evaluateZoningCompatibility($input, $options);
    }

    public static function evaluateRiskConstraints(mixed $input, array $options = []): array
    {
        return PropertyAssessmentService::evaluateRiskConstraints($input, $options);
    }

    public static function ranks(array $properties): array
    {
        return PropertyAssessmentService::ranks($properties);
    }

    public static function policyAdjustmentPercent(): float
    {
        $configPath = dirname(__DIR__) . '/config.php';
        if (!is_file($configPath)) {
            return 0.0;
        }
        $config = require $configPath;
        $policy = $config['policy'] ?? [];
        if (($policy['priority_modifier_approved'] ?? false) !== true || trim((string) ($policy['priority_modifier_approval_reference'] ?? '')) === '') {
            return 0.0;
        }
        $percent = (float) ($policy['policy_priority_adjustment_percent'] ?? 0.0);
        return is_finite($percent) ? max(0.0, min(100.0, $percent)) : 0.0;
    }

    /**
     * Evaluates policy alignment separately from physical site suitability.
     * The physical IAI is not inflated by policy modifiers.
     */
    public static function evaluateWithPolicy(?float $baseIai, bool $isPriority, ?string $sector = null): array
    {
        $percent = self::policyAdjustmentPercent();
        return [
            'baseIai' => $baseIai,
            'isPriority' => $isPriority,
            'prioritySector' => $sector,
            'adjustmentPercent' => $isPriority ? $percent : 0.0,
            'adjustmentPoints' => $baseIai === null ? null : 0.0,
            'finalIai' => $baseIai,
            'regulatoryNote' => 'Priority sector incentives are statutory benefits evaluated by LEBDO / CSF-IPAC, kept separate from physical site suitability.',
        ];
    }
}
