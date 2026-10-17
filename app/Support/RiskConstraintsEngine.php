<?php
declare(strict_types=1);

namespace App\Support;

require_once __DIR__ . '/AssessmentEvidence.php';

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
            return is_finite($num) && $num >= 0 && $num <= 100 ? $num : null;
        }

        $str = strtolower(trim((string) $value));

        // Active fault ground rupture specific mappings
        if ($subcriterionKey === 'active_fault') {
            if (in_array($str, ['conflict', 'intersects', 'trace_conflict', 'within_buffer', 'within_fault_buffer', 'active_fault_conflict', 'ground_rupture_zone', 'critical', 'very_high'], true)) {
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
            if (in_array($str, ['none', 'none_mapped', 'outside_mapped', 'outside_buffer', 'outside_active_fault_zone', 'outside_fault_zone', 'clear', 'safe_distance', 'no_exposure'], true)) {
                return 100.0;
            }
        }

        // Generic categorical matches
        if (in_array($str, ['none', 'none_mapped', 'outside_mapped', 'outside_buffer', 'outside_active_fault_zone', 'outside_fault_zone', 'outside_mapped_hazard', 'clear', 'no_exposure', 'safe', 'confirmed_none'], true)) {
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
        $raw = is_array($input) ? ($input['subcriteria'] ?? $input) : [];
        $subs = $missing = $warnings = $reasons = [];
        $total = 0.0;
        $numeric = $verified = true;
        $hold = false;
        foreach (self::SUBCRITERIA as $key => $meta) {
            $alias = str_replace(['_susceptibility', '_exposure'], '', $key);
            $item = $raw[$key] ?? $raw[$alias] ?? ($key === 'active_fault' ? $raw['fault'] ?? null : null);
            $observation = is_array($item) ? $item : ['status' => $item];
            $status = $observation['status'] ?? $observation['susceptibility'] ?? null;
            $evidence = $observation['evidence'] ?? [];
            $auth = AssessmentEvidence::complete(is_array($evidence) ? $evidence : []);
            $state = $observation['assessment_state'] ?? null;
            $na = $state === 'not_applicable' && trim((string) ($observation['justification'] ?? '')) !== '' && $auth;
            $score = $na ? null : self::normalizeSusceptibility($status, $key);
            if ($state === 'missing_coverage' || $state === 'not_assessed' || $state === 'not_applicable') {
                $score = null;
            }
            $critical = $observation['critical_constraint'] ?? false;
            // Only explicit reported intersections trigger the fault gate. "outside_buffer" never does.
            $faultConflict = $key === 'active_fault' && in_array($status, ['conflict', 'intersects', 'trace_conflict',
                'within_buffer', 'within_fault_buffer', 'active_fault_conflict', 'ground_rupture_zone', 'critical'], true);
            if ($faultConflict || $critical) {
                $hold = true;
                $criticalMsg = 'CRITICAL SITE CONSTRAINT: Active fault conflict / buffer corridor identified by DOST-PHIVOLCS. Geotechnical review required.';
                $reasons[] = $criticalMsg;
            }
            if ($score !== null && $score <= 25.0) {
                $hold = true;
                $reasons[] = $meta['label'] . ': reported critical or high hazard finding; site-specific technical review required.';
                $warnings[] = $meta['label'] . ': elevated hazard finding';
            }
            $evidenceState = $na ? 'not_applicable' : ($score !== null ? ($auth ? 'assessed_verified' : 'reported_unverified')
                : ($state === 'missing_coverage' ? 'missing_coverage' : ($item === null ? 'not_assessed' : 'reported_unverified')));
            // Documented N/A is preserved, but no replacement score or silent renormalization is invented.
            $numeric = $numeric && $score !== null;
            $verified = $verified && ($auth && ($score !== null || $na));
            if ($score === null) { $missing[] = $meta['label']; }
            $weighted = $score === null ? null : $score * $meta['weight'] / 100.0;
            $total += $weighted ?? 0.0;
            $subs[$key] = ['key' => $key, 'label' => $meta['label'], 'agency' => $meta['agency'],
                'weight' => $meta['weight'], 'score' => $score, 'weighted_score' => $weighted,
                'raw_status' => $status, 'status_label' => $score === null ? 'Not scored' : self::formatStatusLabel($status, $score, $key),
                'evidence_status' => $evidenceState, 'is_verified' => $auth, 'evidence' => $evidence,
                'justification' => $observation['justification'] ?? null, 'date' => $observation['date'] ?? null,
                'coverage' => $observation['coverage'] ?? null, 'source' => $observation['source'] ?? null];
        }
        $hasAnyEvidence = false;
        foreach (self::SUBCRITERIA as $k => $m) {
            $checkItem = $raw[$k] ?? null;
            if (is_array($checkItem) && !empty($checkItem['evidence'])) { $hasAnyEvidence = true; break; }
        }
        $isComplete = $hasAnyEvidence ? ($numeric && $verified) : $numeric;
        $iaiContribution = $numeric ? round($total * self::WEIGHT / 100.0, 2) : null;
        $criticalConstraint = null;
        foreach ($reasons as $r) {
            if (str_contains($r, 'CRITICAL SITE CONSTRAINT')) {
                $criticalConstraint = $r;
                break;
            }
        }
        if ($criticalConstraint === null && isset($reasons[0])) {
            $criticalConstraint = $reasons[0];
        }

        return ['score' => $numeric ? $total : null, 'is_complete' => $isComplete,
            'numerical_completeness' => $numeric, 'evidence_complete' => $verified, 'subcriteria' => $subs,
            'weight' => self::WEIGHT, 'iai_contribution' => $iaiContribution,
            'has_critical_constraint' => $hold, 'technical_review_hold' => $hold,
            'technical_review_reasons' => $reasons, 'critical_constraint' => $criticalConstraint,
            'high_hazard_warnings' => $warnings, 'missing_indicators' => $missing,
            'methodology' => self::VERSION, 'validation_status' => self::VALIDATION_STATUS,
            'formula' => 'Sum of all six hazard scores × their provisional weights / 100; no missing-hazard renormalization.',
            'explanation' => $numeric && (!$hasAnyEvidence || $verified) ? 'All six hazards have applicable authenticated evidence.'
                : 'Partial hazard findings only. Missing verified coverage. Unknown coverage is not evidence of safety.'];
    }
}
