<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

/**
 * Authoritative Multi-Hazard Risk Constraints Engine for LOCUS-SF (City of San Fernando, La Union).
 *
 * Evaluates physical site hazard constraints using authoritative evidence from:
 * 1. DENR-MGB: Flood Susceptibility & Rain-Induced Landslide Susceptibility
 * 2. DOST-PHIVOLCS: Active Faults & Ground Rupture Buffer, Liquefaction Susceptibility, Tsunami Exposure
 * 3. DOST-PAGASA: Storm Surge Exposure
 *
 * Scoring Rubric (Centrally configured, provisional pending technical & LGU validation):
 * - Confirmed No Mapped Exposure / Outside: 100.0
 * - Low Susceptibility: 85.0
 * - Moderate Susceptibility: 60.0
 * - High Susceptibility: 25.0
 * - Very High Susceptibility: 0.0
 * - Unverified / Unavailable: null (Never treated as "no hazard")
 *
 * Critical Site Constraint:
 * Active fault trace intersection or exclusion corridor conflict triggers an irrevocable
 * Critical Site Constraint flag requiring competent geological review, independent of composite score.
 */
final class RiskConstraintsEngine
{
    public const VERSION = 'LOCUS-SF Risk Constraints Multi-Hazard Rubric v2.0 (Provisional)';
    public const VALIDATION_STATUS = 'Provisional / Awaiting Technical & LGU Validation';
    public const WEIGHT = 15.0; // 15% of overall MCE in the 6-criterion model

    /**
     * Six official hazard subcriteria with provisional operational weights totaling 100.0%:
     */
    public const SUBCRITERIA = [
        'flood_susceptibility' => [
            'key' => 'flood_susceptibility',
            'label' => 'Flood Susceptibility',
            'weight' => 25.0,
            'agency' => 'DENR-MGB',
            'source' => 'DENR-MGB 1:10,000 Geohazard Survey / CDRRMO Local Drainage Inundation Map',
            'description' => 'Susceptibility to riverine and pluvial inundation during extreme precipitation events',
            'required' => true,
        ],
        'active_fault' => [
            'key' => 'active_fault',
            'label' => 'Active Fault / Ground Rupture',
            'weight' => 25.0,
            'agency' => 'DOST-PHIVOLCS',
            'source' => 'DOST-PHIVOLCS Active Faults Map of the Philippines & Valley Fault System',
            'description' => 'Active fault trace proximity and mandated 5-meter exclusion buffer corridor',
            'required' => true,
        ],
        'landslide_susceptibility' => [
            'key' => 'landslide_susceptibility',
            'label' => 'Landslide Susceptibility',
            'weight' => 15.0,
            'agency' => 'DENR-MGB',
            'source' => 'DENR-MGB Rain-Induced Landslide Susceptibility Map',
            'description' => 'Slope stability and mass-movement hazard in upland and coastal bluff terrains',
            'required' => true,
        ],
        'storm_surge' => [
            'key' => 'storm_surge',
            'label' => 'Storm Surge Exposure',
            'weight' => 15.0,
            'agency' => 'DOST-PAGASA',
            'source' => 'DOST-PAGASA Storm Surge Inundation Advisory & Inundation Map',
            'description' => 'Coastal storm surge inundation risk during severe tropical cyclones',
            'required' => true,
        ],
        'liquefaction_susceptibility' => [
            'key' => 'liquefaction_susceptibility',
            'label' => 'Liquefaction Susceptibility',
            'weight' => 10.0,
            'agency' => 'DOST-PHIVOLCS',
            'source' => 'DOST-PHIVOLCS Liquefaction Susceptibility Map of Region 1',
            'description' => 'Soil strength loss under cyclic seismic shaking in saturated alluvial deposits',
            'required' => true,
        ],
        'tsunami_exposure' => [
            'key' => 'tsunami_exposure',
            'label' => 'Tsunami Exposure',
            'weight' => 10.0,
            'agency' => 'DOST-PHIVOLCS',
            'source' => 'DOST-PHIVOLCS Tsunami Hazard Map of Region 1',
            'description' => 'Seismogenic coastal tsunami run-up and inundation vulnerability zone',
            'required' => true,
        ],
    ];

    /**
     * Standard provisional susceptibility-to-suitability scoring scale
     */
    public const SUSCEPTIBILITY_SCORES = [
        'none' => ['score' => 100.0, 'label' => 'Confirmed no mapped exposure'],
        'outside_mapped' => ['score' => 100.0, 'label' => 'Confirmed outside mapped hazard zone'],
        'low' => ['score' => 85.0, 'label' => 'Low susceptibility / minor exposure'],
        'moderate' => ['score' => 60.0, 'label' => 'Moderate susceptibility'],
        'high' => ['score' => 25.0, 'label' => 'High susceptibility (Engineering intervention required)'],
        'very_high' => ['score' => 0.0, 'label' => 'Very High susceptibility / Critical hazard'],
        'critical' => ['score' => 0.0, 'label' => 'Critical hazard (Direct active fault corridor conflict)'],
    ];

    /**
     * Normalize individual susceptibility status to numeric score.
     */
    public static function normalizeSusceptibility(mixed $value, string $subcriterionKey = ''): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            $num = (float) $value;
            return max(0.0, min(100.0, round($num, 1)));
        }

        $str = strtolower(trim((string) $value));

        // Active fault ground rupture specific mappings
        if ($subcriterionKey === 'active_fault') {
            if (in_array($str, ['conflict', 'intersects', 'trace_conflict', 'within_buffer', 'ground_rupture_zone', 'critical', 'very_high'], true)) {
                return 0.0;
            }
            if (in_array($str, ['high', 'high_proximity', '<500m', 'near_trace'], true)) {
                return 25.0;
            }
            if (in_array($str, ['moderate', 'mod', '500m-5km'], true)) {
                return 60.0;
            }
            if (in_array($str, ['low', 'low_proximity', '>5km'], true)) {
                return 85.0;
            }
            if (in_array($str, ['none', 'none_mapped', 'outside_mapped', 'outside_buffer', 'clear', 'safe_distance', 'no_exposure'], true)) {
                return 100.0;
            }
        }

        // Generic categorical matches
        if (in_array($str, ['none', 'none_mapped', 'outside_mapped', 'outside_buffer', 'clear', 'no_exposure', 'safe', 'confirmed_none'], true)) {
            return 100.0;
        }
        if (in_array($str, ['low', 'low_susceptibility', 'low_exposure'], true)) {
            return 85.0;
        }
        if (in_array($str, ['moderate', 'mod', 'medium', 'moderate_susceptibility', 'moderate_exposure'], true)) {
            return 60.0;
        }
        if (in_array($str, ['high', 'high_susceptibility', 'high_exposure'], true)) {
            return 25.0;
        }
        if (in_array($str, ['very_high', 'very_high_susceptibility', 'extreme', 'critical', 'very_high_exposure'], true)) {
            return 0.0;
        }

        return null;
    }

    /**
     * Format susceptibility label for display.
     */
    public static function formatStatusLabel(mixed $value, ?float $score, string $subcriterionKey = ''): string
    {
        if ($score === null) {
            return 'Not assessed / awaiting authoritative layer verification';
        }
        if ($subcriterionKey === 'active_fault' && $score === 0.0) {
            return 'Critical: Intersects trace or buffer corridor';
        }
        if ($score >= 100.0) {
            return 'Confirmed no mapped exposure (100)';
        }
        if ($score >= 85.0) {
            return 'Low susceptibility (85)';
        }
        if ($score >= 60.0) {
            return 'Moderate susceptibility (60)';
        }
        if ($score >= 25.0) {
            return 'High susceptibility (25)';
        }
        return 'Very high susceptibility (0)';
    }

    /**
     * Primary Evaluation Engine:
     * Evaluates six subcriteria, checks completeness, applies active fault critical gate,
     * calculates weighted composite score, and attaches technical evidence.
     */
    public static function evaluate(mixed $input, array $options = []): array
    {
        if (is_numeric($input)) {
            $score = max(0.0, min(100.0, round((float) $input, 1)));
            return [
                'score' => $score,
                'is_complete' => true,
                'weight' => self::WEIGHT,
                'iai_contribution' => round($score * (self::WEIGHT / 100.0), 2),
                'subcriteria' => [],
                'has_critical_constraint' => false,
                'critical_constraint' => null,
                'high_hazard_warnings' => [],
                'missing_indicators' => [],
                'methodology' => self::VERSION,
                'validation_status' => self::VALIDATION_STATUS,
                'formula' => "Direct score: {$score} (15% MCE weight)",
                'explanation' => "Evaluated at {$score} / 100.",
            ];
        }

        $rawDict = is_array($input) ? $input : [];
        if (isset($rawDict['subcriteria']) && is_array($rawDict['subcriteria'])) {
            $rawDict = $rawDict['subcriteria'];
        }

        // Support spatial context arrays with hazard_status
        if (isset($rawDict['hazard_status']) && is_array($rawDict['hazard_status'])) {
            $rawStatusList = $rawDict['hazard_status'];
            // Map legacy list into subcriteria if present
            foreach ($rawStatusList as $item) {
                $strItem = strtolower((string) $item);
                if (str_contains($strItem, 'flood')) {
                    $rawDict['flood_susceptibility'] = str_contains($strItem, 'high') ? 'high' : (str_contains($strItem, 'mod') ? 'moderate' : 'low');
                }
                if (str_contains($strItem, 'fault')) {
                    $rawDict['active_fault'] = str_contains($strItem, 'high') || str_contains($strItem, 'corridor') ? 'high' : 'low';
                }
                if (str_contains($strItem, 'landslide')) {
                    $rawDict['landslide_susceptibility'] = str_contains($strItem, 'high') ? 'high' : (str_contains($strItem, 'outside') ? 'none' : 'low');
                }
            }
        }

        $evaluatedSubcriteria = [];
        $missingIndicators = [];
        $highHazardWarnings = [];
        $hasCriticalFaultConflict = false;
        $weightedTotal = 0.0;
        $isComplete = true;

        foreach (self::SUBCRITERIA as $key => $meta) {
            $aliasKey = str_replace(['_susceptibility', '_exposure'], '', $key);
            $rawVal = $rawDict[$key] ?? ($rawDict[$aliasKey] ?? ($key === 'active_fault' ? ($rawDict['fault'] ?? ($rawDict['faults'] ?? null)) : null));
            $overlap = false;
            $sourceRef = $meta['source'];
            $date = $options['dates'][$key] ?? null;
            $coverage = 'City of San Fernando, La Union';

            if (is_array($rawVal)) {
                $overlap = (bool) ($rawVal['overlap'] ?? false);
                $sourceRef = (string) ($rawVal['source'] ?? $meta['source']);
                $date = (string) ($rawVal['date'] ?? $date ?? '');
                $coverage = (string) ($rawVal['coverage'] ?? $coverage);
                $rawVal = $rawVal['status'] ?? $rawVal['susceptibility'] ?? $rawVal['score'] ?? null;
            }

            $score = self::normalizeSusceptibility($rawVal, $key);

            // Special check: active fault conflict
            if ($key === 'active_fault') {
                $rawStr = is_string($rawVal) ? strtolower(trim($rawVal)) : '';
                if ($rawStr === 'conflict' || $rawStr === 'intersects' || $rawStr === 'trace_conflict' || $rawStr === 'within_buffer' || $rawStr === 'critical' || ($overlap && $rawStr === 'high')) {
                    $hasCriticalFaultConflict = true;
                    $score = 0.0;
                }
            }

            if ($score === null) {
                $isComplete = false;
                $missingIndicators[] = $meta['label'];
                $weightedScore = null;
            } else {
                $weightedScore = round(($score * $meta['weight']) / 100.0, 2);
                $weightedTotal += $weightedScore;

                if ($score <= 25.0) {
                    $highHazardWarnings[] = "{$meta['label']} is evaluated at {$score} / 100 (" . self::formatStatusLabel($rawVal, $score, $key) . ")";
                }
            }

            $evaluatedSubcriteria[$key] = [
                'key' => $key,
                'label' => $meta['label'],
                'agency' => $meta['agency'],
                'weight' => $meta['weight'],
                'score' => $score,
                'weighted_score' => $weightedScore,
                'raw_status' => is_scalar($rawVal) ? (string) $rawVal : 'unspecified',
                'status_label' => self::formatStatusLabel($rawVal, $score, $key),
                'source' => $sourceRef,
                'date' => $date ?: '2026-Q1',
                'coverage' => $coverage,
                'overlap' => $overlap,
                'is_verified' => $score !== null,
            ];
        }

        $compositeScore = $isComplete ? round(max(0.0, min(100.0, $weightedTotal)), 1) : null;
        $iaiContribution = $compositeScore !== null ? round($compositeScore * (self::WEIGHT / 100.0), 2) : null;

        $criticalConstraintMessage = null;
        if ($hasCriticalFaultConflict) {
            $criticalConstraintMessage = 'CRITICAL SITE CONSTRAINT: Parcel intersects authoritative active fault trace or mandated 5-meter exclusion buffer corridor (DOST-PHIVOLCS). Mandatory geological hazard review required; structural development prohibited or strictly conditioned upon competent structural clearance.';
        }

        $formula = 'Risk Constraints Score = Σ(Subcriterion Score × Subcriterion Weight ÷ 100): '
            . 'Flood (25%) + Fault (25%) + Landslide (15%) + Storm Surge (15%) + Liquefaction (10%) + Tsunami (10%).';

        $explanation = $isComplete
            ? "Multi-hazard spatial screening complete. Weighted score: {$compositeScore} / 100 across all 6 authoritative hazard indicators (15% MCE contribution = {$iaiContribution} pts)."
            : "Hazard screening incomplete: Missing verified coverage for: " . implode(', ', $missingIndicators) . ". Unknown or unassessed layers do not constitute safety.";

        return [
            'score' => $compositeScore,
            'is_complete' => $isComplete,
            'weight' => self::WEIGHT,
            'iai_contribution' => $iaiContribution,
            'subcriteria' => $evaluatedSubcriteria,
            'has_critical_constraint' => $hasCriticalFaultConflict,
            'critical_constraint' => $criticalConstraintMessage,
            'high_hazard_warnings' => $highHazardWarnings,
            'missing_indicators' => $missingIndicators,
            'methodology' => self::VERSION,
            'validation_status' => self::VALIDATION_STATUS,
            'formula' => $formula,
            'explanation' => $explanation,
            'evaluated_at' => gmdate(DATE_ATOM),
        ];
    }
}
