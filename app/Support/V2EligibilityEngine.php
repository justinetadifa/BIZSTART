<?php
declare(strict_types=1);

namespace App\Support;

require_once __DIR__ . '/V2StructuredFacts.php';
require_once __DIR__ . '/ZoningRulesEngine.php';

final class V2EligibilityEngine
{
    public const STATUS_MEETS = 'meets_screened_requirements';
    public const STATUS_CONDITIONAL = 'conditional';
    public const STATUS_NOT_MET = 'does_not_meet_requirements';
    public const STATUS_INSUFFICIENT = 'insufficient_information';

    public const LABELS = [
        self::STATUS_MEETS => 'Meets screened requirements',
        self::STATUS_CONDITIONAL => 'Conditional',
        self::STATUS_NOT_MET => 'Does not meet requirements',
        self::STATUS_INSUFFICIENT => 'Insufficient information',
    ];

    public static function evaluate(array $property, array $profile): array
    {
        $facts = $property['structured_facts'] ?? V2StructuredFacts::generateBaselineFacts($property, $property['structured_facts_json'] ?? null);
        if (is_string($facts)) {
            $facts = json_decode($facts, true) ?: [];
        }

        $checks = [];
        $failedReasons = [];
        $insufficientReasons = [];
        $conditionalReasons = [];
        $passedReasons = [];

        $intendedBusiness = trim((string) ($profile['intended_business'] ?? 'Commercial General'));
        $transactionType = strtolower(trim((string) ($profile['transaction_type'] ?? 'lease')));
        $totalBudget = (float) ($profile['total_setup_budget'] ?? 0);
        $requiredArea = (float) ($profile['required_usable_area'] ?? 0);
        $timeline = (string) ($profile['opening_timeline'] ?? '3_to_6_months');
        $essentialReqs = is_array($profile['essential_operational_requirements'] ?? null)
            ? $profile['essential_operational_requirements']
            : [];

        // 1. Mandatory Zoning Compatibility Check
        $zoningDistrict = (string) ($property['zoning_classification'] ?? 'C-1 Commercial');
        $zoningStatus = 'permitted';
        $zoningReason = 'Commercial activity evaluated against recorded CLUP zoning rules.';

        if (!empty($intendedBusiness)) {
            $zoningEval = ZoningRulesEngine::evaluate($zoningDistrict, $intendedBusiness);
            $zoningStatus = $zoningEval['status'] ?? 'permitted';
            $zoningReason = $zoningEval['explanation'] ?? ($zoningEval['reason'] ?? 'Zoning compatibility screened.');
        }

        if ($zoningStatus === 'prohibited') {
            $failedReasons[] = "Intended business '{$intendedBusiness}' is prohibited in recorded zoning district ({$zoningDistrict}).";
            $checks[] = [
                'name' => 'CLUP Zoning Compatibility',
                'status' => 'failed',
                'message' => "Prohibited use in {$zoningDistrict}: {$zoningReason}",
                'source' => 'CPDO CLUP 2026-2035 Zoning Ordinance',
                'is_mandatory' => true,
            ];
        } elseif ($zoningStatus === 'conditional') {
            $conditionalReasons[] = "Permitted conditionally in {$zoningDistrict}: Requires CPDO Locational Clearance, neighborhood notice, and site review.";
            $checks[] = [
                'name' => 'CLUP Zoning Compatibility',
                'status' => 'conditional',
                'message' => "Conditional use in {$zoningDistrict}: {$zoningReason}",
                'source' => 'CPDO CLUP 2026-2035 Zoning Ordinance',
                'is_mandatory' => true,
            ];
        } elseif ($zoningStatus === 'permitted') {
            $passedReasons[] = "Zoning compatibility verified: '{$intendedBusiness}' is a permitted use in {$zoningDistrict}.";
            $checks[] = [
                'name' => 'CLUP Zoning Compatibility',
                'status' => 'passed',
                'message' => "Permitted use in {$zoningDistrict}.",
                'source' => 'CPDO CLUP 2026-2035 Zoning Ordinance',
                'is_mandatory' => true,
            ];
        } else {
            $insufficientReasons[] = "Zoning compatibility undetermined for '{$intendedBusiness}' under {$zoningDistrict}; CPDO locational clearance review required.";
            $checks[] = [
                'name' => 'CLUP Zoning Compatibility',
                'status' => 'undetermined',
                'message' => "Unclassified business activity. Formal CPDO locational clearance review required.",
                'source' => 'CPDO CLUP 2026-2035 Zoning Ordinance',
                'is_mandatory' => true,
            ];
        }

        // 2. Active Fault Line Statutory Setback Check (5 meters mandatory)
        $faultDistanceFact = $facts['hazards']['fault_line_distance'] ?? null;
        $faultDist = is_numeric($faultDistanceFact['value'] ?? null) ? (float) $faultDistanceFact['value'] : 1000.0;
        $faultSetbackFact = $facts['hazards']['fault_statutory_setback_passed'] ?? null;
        $faultPassed = $faultDist >= 5.0 && ($faultSetbackFact['value'] ?? true) === true;

        if (!$faultPassed) {
            $failedReasons[] = "Violates statutory 5-meter active fault rupture setback under PHIVOLCS guidelines (distance: {$faultDist}m).";
            $checks[] = [
                'name' => 'PHIVOLCS Active Fault Setback',
                'status' => 'failed',
                'message' => "Property is within the mandatory 5m active fault rupture setback ({$faultDist}m recorded).",
                'source' => 'DOST-PHIVOLCS & CDRRMO Hazard Screening',
                'is_mandatory' => true,
            ];
        } else {
            $passedReasons[] = "Fault rupture setback satisfied: Property is {$faultDist}m from nearest mapped active fault.";
            $checks[] = [
                'name' => 'PHIVOLCS Active Fault Setback',
                'status' => 'passed',
                'message' => "Complies with statutory 5m setback ({$faultDist}m distance recorded).",
                'source' => 'DOST-PHIVOLCS & CDRRMO',
                'is_mandatory' => true,
            ];
        }

        // 3. Required Usable Area Check
        $usableAreaFact = $facts['physical_suitability']['usable_area'] ?? null;
        $usableArea = is_numeric($usableAreaFact['value'] ?? null)
            ? (float) $usableAreaFact['value']
            : (isset($property['area']) ? ((float) $property['area']) * 10000 : 1000.0);

        if ($requiredArea > 0) {
            if ($usableArea < $requiredArea) {
                $failedReasons[] = "Available usable area (" . number_format($usableArea, 0) . " m²) is less than required minimum (" . number_format($requiredArea, 0) . " m²).";
                $checks[] = [
                    'name' => 'Usable Area Requirement',
                    'status' => 'failed',
                    'message' => "Area (" . number_format($usableArea, 0) . " m²) is below required " . number_format($requiredArea, 0) . " m².",
                    'source' => $usableAreaFact['source'] ?? 'Cadastral Survey',
                    'is_mandatory' => true,
                ];
            } else {
                $passedReasons[] = "Usable area satisfied: " . number_format($usableArea, 0) . " m² available (exceeds required " . number_format($requiredArea, 0) . " m²).";
                $checks[] = [
                    'name' => 'Usable Area Requirement',
                    'status' => 'passed',
                    'message' => "Available " . number_format($usableArea, 0) . " m² meets required " . number_format($requiredArea, 0) . " m².",
                    'source' => $usableAreaFact['source'] ?? 'Cadastral Survey',
                    'is_mandatory' => true,
                ];
            }
        }

        // 4. Setup Budget Check (Acquisition / Lease + Setup Expenses)
        if ($totalBudget > 0) {
            $propPrice = (float) ($property['price'] ?? 0);
            $propLease = (float) ($property['lease_price'] ?? 0);
            $initialCost = 0.0;

            if ($transactionType === 'buy') {
                $initialCost = $propPrice > 0 ? $propPrice : 0.0;
            } else {
                // Lease: 1st year lease (12 months) + security deposit estimate (2 months)
                $monthly = $propLease > 0 ? $propLease : ($propPrice > 0 ? round($propPrice * 0.007, 2) : 25000.0);
                $initialCost = $monthly * 14;
            }

            $setupCostFact = $facts['setup_costs']['total_setup_cost_est'] ?? null;
            $estSetupCost = is_numeric($setupCostFact['value'] ?? null) ? (float) $setupCostFact['value'] : 250000.0;
            $projectTotalRequired = $initialCost + $estSetupCost;

            if ($initialCost > 0 && $projectTotalRequired > $totalBudget) {
                $failedReasons[] = "Estimated initial capital and setup cost (PHP " . number_format($projectTotalRequired, 2) . ") exceeds total investor budget (PHP " . number_format($totalBudget, 2) . ").";
                $checks[] = [
                    'name' => 'Total Setup Budget',
                    'status' => 'failed',
                    'message' => "Total required (PHP " . number_format($projectTotalRequired, 2) . ") exceeds budget (PHP " . number_format($totalBudget, 2) . ").",
                    'source' => 'Pricing & Setup Cost Estimates',
                    'is_mandatory' => true,
                ];
            } else {
                $passedReasons[] = "Setup budget viable: Total estimated investment (PHP " . number_format($projectTotalRequired, 2) . ") is within budget (PHP " . number_format($totalBudget, 2) . ").";
                $checks[] = [
                    'name' => 'Total Setup Budget',
                    'status' => 'passed',
                    'message' => "Estimated investment (PHP " . number_format($projectTotalRequired, 2) . ") fits within budget.",
                    'source' => 'Pricing & Setup Cost Estimates',
                    'is_mandatory' => true,
                ];
            }
        }

        // 5. Essential Operational Requirements Check
        $reqMap = [
            'power_three_phase' => [
                'fact' => $facts['utilities']['power_three_phase'] ?? null,
                'label' => '3-Phase Power Capacity',
                'pass_cond' => fn ($f) => ($f['value'] ?? null) === true,
            ],
            'water_connection' => [
                'fact' => $facts['utilities']['water_connection'] ?? null,
                'label' => 'Piped Water Supply (MSFWD)',
                'pass_cond' => fn ($f) => in_array($f['value'] ?? '', ['msfwd_piped', 'connected', 'deep_well_permitted'], true),
            ],
            'heavy_vehicle_access' => [
                'fact' => $facts['access']['heavy_vehicle_access'] ?? null,
                'label' => 'Heavy Vehicle Delivery Truck Access',
                'pass_cond' => fn ($f) => ($f['value'] ?? null) === true,
            ],
            'telecom_fiber' => [
                'fact' => $facts['utilities']['telecom_fiber'] ?? null,
                'label' => 'High-Speed Fiber Telecommunications',
                'pass_cond' => fn ($f) => ($f['value'] ?? null) === true,
            ],
            'outside_high_flood' => [
                'fact' => $facts['hazards']['flood_hazard_level'] ?? null,
                'label' => 'Outside High Flood Hazard Zone',
                'pass_cond' => fn ($f) => !in_array(strtolower((string) ($f['value'] ?? '')), ['high', 'high_frequent', 'severe'], true),
            ],
            'clean_title' => [
                'fact' => $facts['development_readiness']['title_status'] ?? null,
                'label' => 'Clean Land Title (TCT)',
                'pass_cond' => fn ($f) => in_array(strtolower((string) ($f['value'] ?? '')), ['clean_tct', 'clean', 'verified'], true),
            ],
            'max_slope_10pct' => [
                'fact' => $facts['physical_suitability']['topography_slope'] ?? null,
                'label' => 'Gentle Slope (<= 10%)',
                'pass_cond' => fn ($f) => is_numeric($f['value'] ?? null) && (float) $f['value'] <= 10.0,
            ],
        ];

        foreach ($essentialReqs as $reqKey) {
            if (!isset($reqMap[$reqKey])) continue;
            $meta = $reqMap[$reqKey];
            $fact = $meta['fact'];
            $label = $meta['label'];

            if ($fact === null || ($fact['verification_status'] ?? '') === V2StructuredFacts::STATUS_UNKNOWN) {
                $insufficientReasons[] = "Essential requirement '{$label}' status is unknown; technical review required.";
                $checks[] = [
                    'name' => $label,
                    'status' => 'unknown',
                    'message' => "Information not recorded. Technical inspection required.",
                    'source' => $fact['source'] ?? 'Pending Inspection',
                    'is_mandatory' => true,
                ];
            } elseif (($fact['verification_status'] ?? '') === V2StructuredFacts::STATUS_UNVERIFIED) {
                $passes = ($meta['pass_cond'])($fact);
                if (!$passes) {
                    $failedReasons[] = "Essential requirement '{$label}' is unverified and reported as not meeting criteria.";
                    $checks[] = [
                        'name' => $label,
                        'status' => 'failed',
                        'message' => "Unverified report indicates requirement is not satisfied.",
                        'source' => $fact['source'] ?? 'Self-Reported',
                        'is_mandatory' => true,
                    ];
                } else {
                    $insufficientReasons[] = "Essential requirement '{$label}' is reported by broker/owner but awaits authorized technical verification.";
                    $checks[] = [
                        'name' => $label,
                        'status' => 'unverified',
                        'message' => "Self-reported as compliant, but requires authorized LGU/utility verification.",
                        'source' => $fact['source'] ?? 'Self-Reported',
                        'is_mandatory' => true,
                    ];
                }
            } elseif (($fact['verification_status'] ?? '') === V2StructuredFacts::STATUS_UNAVAILABLE) {
                $insufficientReasons[] = "Essential requirement '{$label}' data is unavailable from the reporting agency.";
                $checks[] = [
                    'name' => $label,
                    'status' => 'unavailable',
                    'message' => "Official records unavailable. On-site technical assessment required.",
                    'source' => $fact['source'] ?? 'Agency Records',
                    'is_mandatory' => true,
                ];
            } else {
                // Verified
                $passes = ($meta['pass_cond'])($fact);
                if (!$passes) {
                    $failedReasons[] = "Verified failure: Mandatory requirement '{$label}' is confirmed not satisfied.";
                    $checks[] = [
                        'name' => $label,
                        'status' => 'failed',
                        'message' => "Confirmed not satisfied by {$fact['reviewer']} ({$fact['source']}).",
                        'source' => $fact['source'] ?? 'Official Verification',
                        'is_mandatory' => true,
                    ];
                } else {
                    $passedReasons[] = "Verified satisfied: Mandatory requirement '{$label}' confirmed.";
                    $checks[] = [
                        'name' => $label,
                        'status' => 'passed',
                        'message' => "Confirmed satisfied by {$fact['reviewer']}.",
                        'source' => $fact['source'] ?? 'Official Verification',
                        'is_mandatory' => true,
                    ];
                }
            }
        }

        // 6. Opening Timeline Check
        if ($timeline === 'immediate') {
            $turnoverFact = $facts['development_readiness']['estimated_turnover_months'] ?? null;
            $turnoverMonths = is_numeric($turnoverFact['value'] ?? null) ? (float) $turnoverFact['value'] : 0.0;
            if ($turnoverMonths > 3.0) {
                $failedReasons[] = "Project requires immediate opening (< 3 months), but site turnover requires ~" . round($turnoverMonths) . " months.";
                $checks[] = [
                    'name' => 'Opening Timeline',
                    'status' => 'failed',
                    'message' => "Estimated turnover (" . round($turnoverMonths) . " months) exceeds immediate opening window.",
                    'source' => $turnoverFact['source'] ?? 'Property Readiness',
                    'is_mandatory' => true,
                ];
            }
        }

        // Final Status Determination
        if (!empty($failedReasons)) {
            $status = self::STATUS_NOT_MET;
        } elseif (!empty($insufficientReasons)) {
            $status = self::STATUS_INSUFFICIENT;
        } elseif (!empty($conditionalReasons)) {
            $status = self::STATUS_CONDITIONAL;
        } else {
            $status = self::STATUS_MEETS;
        }

        $explanations = array_merge($failedReasons, $insufficientReasons, $conditionalReasons, $passedReasons);

        return [
            'status' => $status,
            'status_label' => self::LABELS[$status] ?? 'Unknown',
            'can_rank' => $status === self::STATUS_MEETS || $status === self::STATUS_CONDITIONAL,
            'failed_reasons' => $failedReasons,
            'insufficient_reasons' => $insufficientReasons,
            'conditional_reasons' => $conditionalReasons,
            'passed_reasons' => $passedReasons,
            'explanations' => $explanations,
            'checks' => $checks,
            'unresolved_count' => count($insufficientReasons),
        ];
    }
}
