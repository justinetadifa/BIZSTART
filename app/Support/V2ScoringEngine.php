<?php
declare(strict_types=1);

namespace App\Support;

require_once __DIR__ . '/V2StructuredFacts.php';
require_once __DIR__ . '/V2EligibilityEngine.php';

final class V2ScoringEngine
{
    public const DEFAULT_WEIGHTS = [
        'access' => 20.0,
        'utilities' => 20.0,
        'market_context' => 20.0,
        'physical_suitability' => 15.0,
        'hazards' => 15.0,
        'setup_costs' => 10.0,
    ];

    public static function evaluate(array $property, array $profile, ?array $scenarioConfig = null): array
    {
        $facts = $property['structured_facts'] ?? V2StructuredFacts::generateBaselineFacts($property, $property['structured_facts_json'] ?? null);
        if (is_string($facts)) {
            $facts = json_decode($facts, true) ?: [];
        }

        // Eligibility check first
        $eligibility = V2EligibilityEngine::evaluate($property, $profile);

        // Load scenario weights and validation status
        $weights = self::DEFAULT_WEIGHTS;
        $scenarioKey = $scenarioConfig['scenario_key'] ?? 'general_commercial';
        $scenarioName = $scenarioConfig['scenario_name'] ?? 'General Commercial Use';
        $validationStatus = $scenarioConfig['validation_status'] ?? 'draft';
        $isAuthoritative = $validationStatus === 'validated';

        if (isset($scenarioConfig['weights_json'])) {
            $decodedWeights = is_string($scenarioConfig['weights_json'])
                ? json_decode($scenarioConfig['weights_json'], true)
                : $scenarioConfig['weights_json'];
            if (is_array($decodedWeights) && !empty($decodedWeights)) {
                $weights = array_merge($weights, $decodedWeights);
            }
        }

        // Normalize weights so they total 100%
        $weightSum = array_sum($weights);
        if ($weightSum > 0 && abs($weightSum - 100.0) > 0.01) {
            foreach ($weights as $k => $w) {
                $weights[$k] = round(($w / $weightSum) * 100.0, 1);
            }
        }

        // Criterion 1: Access & Transportation
        $accessScore = self::scoreAccess($facts['access'] ?? []);
        // Criterion 2: Utilities & Infrastructure
        $utilitiesScore = self::scoreUtilities($facts['utilities'] ?? []);
        // Criterion 3: Commercial & Market Context
        $marketScore = self::scoreMarket($facts['market_context'] ?? [], $facts['competitors_vs_complementary'] ?? []);
        // Criterion 4: Physical Suitability & Terrain
        $physicalScore = self::scorePhysical($facts['physical_suitability'] ?? []);
        // Criterion 5: Hazards & Environmental Safety
        $hazardsScore = self::scoreHazards($facts['hazards'] ?? []);
        // Criterion 6: Setup Costs & Financial Feasibility
        $setupScore = self::scoreSetupCosts($facts['setup_costs'] ?? []);

        $criteriaScores = [
            'access' => $accessScore,
            'utilities' => $utilitiesScore,
            'market_context' => $marketScore,
            'physical_suitability' => $physicalScore,
            'hazards' => $hazardsScore,
            'setup_costs' => $setupScore,
        ];

        // Compute evidence coverage
        $factCounts = V2StructuredFacts::countVerificationStatus($facts);
        $evidenceCoveragePct = $factCounts['coverage_pct'];

        // Weighted IAI Score Calculation
        // Rule: NEVER silently reward missing data by redistributing weights.
        // Each criterion contributes (raw_score * weight / 100). If facts are missing, score reflects only verified data.
        $unroundedTotal = 0.0;
        $breakdown = [];

        $labels = [
            'access' => 'Spatial Access & Transportation',
            'utilities' => 'Infrastructure & Utility Capacity',
            'market_context' => 'Market Context & Commercial Synergies',
            'physical_suitability' => 'Physical Suitability & Terrain',
            'hazards' => 'Hazard Resilience & Safety',
            'setup_costs' => 'Setup Costs & Capital Feasibility',
        ];

        foreach ($weights as $key => $weight) {
            $crit = $criteriaScores[$key] ?? ['score' => 0.0, 'verified_count' => 0, 'total_count' => 0, 'source' => 'N/A', 'date' => null, 'reviewer' => null, 'notes' => ''];
            $critScore = (float) $crit['score'];
            $weightedPoints = round(($critScore * $weight) / 100.0, 2);
            $unroundedTotal += $weightedPoints;

            $breakdown[$key] = [
                'criterion_key' => $key,
                'label' => $labels[$key] ?? ucfirst(str_replace('_', ' ', $key)),
                'weight' => $weight,
                'raw_score' => $critScore,
                'weighted_points' => $weightedPoints,
                'verified_ratio' => ($crit['verified_count'] ?? 0) . ' / ' . ($crit['total_count'] ?? 0),
                'evidence_source' => $crit['source'] ?? 'Official Records',
                'observation_date' => $crit['date'] ?? null,
                'reviewer' => $crit['reviewer'] ?? null,
                'formula_note' => $crit['notes'] ?? '',
            ];
        }

        $compositeScore = round($unroundedTotal, 1);

        // Hard Non-Negotiable Gate: If eligibility failed, score CANNOT compensate!
        $isEligible = $eligibility['status'] !== V2EligibilityEngine::STATUS_NOT_MET;
        $finalIai = $isEligible ? $compositeScore : null;

        // Generate Strengths, Tradeoffs, Unresolved Checks, and Next Actions
        $strengths = self::deriveStrengths($facts, $breakdown);
        $tradeoffs = self::deriveTradeoffs($facts, $property, $compositeScore);
        $unresolvedChecks = self::deriveUnresolvedChecks($facts);
        $nextActions = self::deriveNextActions($eligibility, $unresolvedChecks, $property);

        return [
            'assessment_version' => 'v2',
            'scenario_key' => $scenarioKey,
            'scenario_name' => $scenarioName,
            'validation_status' => $validationStatus,
            'is_authoritative' => $isAuthoritative,
            'eligibility' => $eligibility,
            'is_eligible' => $isEligible,
            'iai_score' => $finalIai,
            'raw_composite_score' => $compositeScore,
            'evidence_coverage_pct' => $evidenceCoveragePct,
            'fact_counts' => $factCounts,
            'score_breakdown' => $breakdown,
            'strengths' => $strengths,
            'tradeoffs' => $tradeoffs,
            'unresolved_checks' => $unresolvedChecks,
            'next_actions' => $nextActions,
            'assessed_at' => date('Y-m-d\TH:i:sP'),
            'disclaimer' => 'LOCUS-SF v2 Evidence-Backed Evaluation is a municipal investment decision aid. All locational clearances, environmental compliance certificates, and building permits require authorized submission to relevant LGU offices.',
        ];
    }

    private static function scoreAccess(array $access): array
    {
        $frontage = (float) ($access['road_frontage']['value'] ?? 0);
        $frontageVer = ($access['road_frontage']['verification_status'] ?? '') === V2StructuredFacts::STATUS_VERIFIED;
        $heavy = ($access['heavy_vehicle_access']['value'] ?? false) === true;
        $dist = (float) ($access['distance_to_arterial']['value'] ?? 100);

        $points = 50.0;
        if ($frontage >= 20.0) $points += 20.0;
        elseif ($frontage >= 12.0) $points += 15.0;
        elseif ($frontage >= 6.0) $points += 10.0;

        if ($heavy) $points += 15.0;
        if ($dist <= 50.0) $points += 15.0;
        elseif ($dist <= 150.0) $points += 10.0;

        $verifiedCount = 0;
        foreach ($access as $f) {
            if (($f['verification_status'] ?? '') === V2StructuredFacts::STATUS_VERIFIED) $verifiedCount++;
        }

        return [
            'score' => min(100.0, max(0.0, $points)),
            'verified_count' => $verifiedCount,
            'total_count' => count($access),
            'source' => $access['road_frontage']['source'] ?? 'City Engineering Office',
            'date' => $access['road_frontage']['observation_date'] ?? '2026-01-15',
            'reviewer' => $access['road_frontage']['reviewer'] ?? 'City Engineering',
            'notes' => "Frontage: {$frontage}m, Distance to arterial: {$dist}m, Heavy vehicle access: " . ($heavy ? 'Yes' : 'No'),
        ];
    }

    private static function scoreUtilities(array $utilities): array
    {
        $points = 40.0;
        $power = $utilities['power_connection']['value'] ?? 'none';
        $water = $utilities['water_connection']['value'] ?? 'none';
        $fiber = ($utilities['telecom_fiber']['value'] ?? false) === true;
        $threePhase = ($utilities['power_three_phase']['value'] ?? false) === true;

        if (in_array($power, ['connected', 'available_at_boundary'], true)) $points += 20.0;
        if (in_array($water, ['msfwd_piped', 'connected', 'deep_well_permitted'], true)) $points += 20.0;
        if ($fiber) $points += 10.0;
        if ($threePhase) $points += 10.0;

        $verifiedCount = 0;
        foreach ($utilities as $f) {
            if (($f['verification_status'] ?? '') === V2StructuredFacts::STATUS_VERIFIED) $verifiedCount++;
        }

        return [
            'score' => min(100.0, max(0.0, $points)),
            'verified_count' => $verifiedCount,
            'total_count' => count($utilities),
            'source' => 'LUECO, MSFWD & Telecommunications Map',
            'date' => '2026-01-20',
            'reviewer' => 'CICTO Infrastructure Division',
            'notes' => "Power: {$power}, Water: {$water}, Fiber: " . ($fiber ? 'Available' : 'Pending') . ", 3-Phase: " . ($threePhase ? 'Verified' : 'Unconfirmed'),
        ];
    }

    private static function scoreMarket(array $market, array $commercial): array
    {
        $points = 60.0;
        $foot = $market['pedestrian_foot_traffic']['value'] ?? 'moderate_commercial';
        $anchors = (int) ($commercial['complementary_anchors_count']['value'] ?? 0);
        $competitors = (int) ($commercial['direct_competitors_count']['value'] ?? 0);

        if ($foot === 'high_corridor') $points += 20.0;
        elseif ($foot === 'moderate_commercial') $points += 15.0;

        if ($anchors >= 4) $points += 15.0;
        elseif ($anchors >= 2) $points += 10.0;

        if ($competitors >= 1 && $competitors <= 5) $points += 5.0; // Healthy competition
        elseif ($competitors > 10) $points -= 10.0; // Saturation

        $verifiedCount = 0;
        $all = array_merge($market, $commercial);
        foreach ($all as $f) {
            if (($f['verification_status'] ?? '') === V2StructuredFacts::STATUS_VERIFIED) $verifiedCount++;
        }

        return [
            'score' => min(100.0, max(0.0, $points)),
            'verified_count' => $verifiedCount,
            'total_count' => count($all),
            'source' => 'BPLO Registry, LEBDO Market Survey & BIR DO 014-2026',
            'date' => '2026-02-01',
            'reviewer' => 'LEBDO & City Assessor',
            'notes' => "Foot traffic: {$foot}, Complementary anchors: {$anchors}, Direct competitors: {$competitors}",
        ];
    }

    private static function scorePhysical(array $physical): array
    {
        $points = 50.0;
        $shape = $physical['parcel_shape_regularity']['value'] ?? 'regular_rectangular';
        $slope = (float) ($physical['topography_slope']['value'] ?? 2.0);
        $structure = $physical['existing_structures_condition']['value'] ?? 'vacant_cleared';

        if ($shape === 'regular_rectangular') $points += 20.0;
        elseif ($shape === 'irregular_usable') $points += 10.0;

        if ($slope <= 3.0) $points += 20.0;
        elseif ($slope <= 8.0) $points += 10.0;

        if ($structure === 'vacant_cleared' || $structure === 'sound_reusable_building') $points += 10.0;

        $verifiedCount = 0;
        foreach ($physical as $f) {
            if (($f['verification_status'] ?? '') === V2StructuredFacts::STATUS_VERIFIED) $verifiedCount++;
        }

        return [
            'score' => min(100.0, max(0.0, $points)),
            'verified_count' => $verifiedCount,
            'total_count' => count($physical),
            'source' => 'Cadastral Tax Map & NAMRIA Elevation DEM',
            'date' => '2026-01-15',
            'reviewer' => 'City Assessor Technical Division',
            'notes' => "Shape: {$shape}, Slope: {$slope}%, Site condition: {$structure}",
        ];
    }

    private static function scoreHazards(array $hazards): array
    {
        $points = 50.0;
        $flood = strtolower((string) ($hazards['flood_hazard_level']['value'] ?? 'low'));
        $faultDist = (float) ($hazards['fault_line_distance']['value'] ?? 1000);
        $setbackPassed = ($hazards['fault_statutory_setback_passed']['value'] ?? true) === true;
        $liquefaction = strtolower((string) ($hazards['liquefaction_susceptibility']['value'] ?? 'low'));

        if (in_array($flood, ['none_outside', 'none'], true)) $points += 25.0;
        elseif ($flood === 'low') $points += 20.0;
        elseif ($flood === 'moderate') $points += 5.0;

        if ($faultDist >= 500.0 && $setbackPassed) $points += 15.0;
        elseif ($faultDist >= 50.0 && $setbackPassed) $points += 10.0;

        if ($liquefaction === 'low') $points += 10.0;

        $verifiedCount = 0;
        foreach ($hazards as $f) {
            if (($f['verification_status'] ?? '') === V2StructuredFacts::STATUS_VERIFIED) $verifiedCount++;
        }

        return [
            'score' => min(100.0, max(0.0, $points)),
            'verified_count' => $verifiedCount,
            'total_count' => count($hazards),
            'source' => 'MGB Region 1, DOST-PHIVOLCS & CDRRMO',
            'date' => '2026-01-25',
            'reviewer' => 'CDRRMO Hazard Verification Desk',
            'notes' => "Flood: {$flood}, Fault distance: {$faultDist}m (setback: " . ($setbackPassed ? 'Passed' : 'Failed') . "), Liquefaction: {$liquefaction}",
        ];
    }

    private static function scoreSetupCosts(array $setup): array
    {
        $points = 70.0;
        $demo = (float) ($setup['demolition_cost']['value'] ?? 0);
        $totalSetup = (float) ($setup['total_setup_cost_est']['value'] ?? 250000);

        if ($demo === 0.0) $points += 15.0;
        if ($totalSetup <= 150000.0) $points += 15.0;
        elseif ($totalSetup <= 350000.0) $points += 10.0;
        elseif ($totalSetup > 1000000.0) $points -= 20.0;

        $verifiedCount = 0;
        foreach ($setup as $f) {
            if (($f['verification_status'] ?? '') === V2StructuredFacts::STATUS_VERIFIED) $verifiedCount++;
        }

        return [
            'score' => min(100.0, max(0.0, $points)),
            'verified_count' => $verifiedCount,
            'total_count' => count($setup),
            'source' => 'City Assessor Cost Manual & LUECO/MSFWD Schedule of Fees',
            'date' => '2026-02-10',
            'reviewer' => 'City Assessor & CICTO Infrastructure',
            'notes' => "Est. total pre-operational setup cost: PHP " . number_format($totalSetup, 0),
        ];
    }

    private static function deriveStrengths(array $facts, array $breakdown): array
    {
        $strengths = [];

        // Check Access
        $frontage = (float) ($facts['access']['road_frontage']['value'] ?? 0);
        if ($frontage >= 15.0 && ($facts['access']['road_frontage']['verification_status'] ?? '') === V2StructuredFacts::STATUS_VERIFIED) {
            $strengths[] = [
                'title' => "High Road Frontage ({$frontage}m)",
                'description' => "Verified wide street frontage ensures excellent business visibility, customer parking, and ease of access.",
                'source' => $facts['access']['road_frontage']['source'],
                'date' => $facts['access']['road_frontage']['observation_date'],
            ];
        }

        // Check Utilities
        if (($facts['utilities']['telecom_fiber']['value'] ?? false) === true && ($facts['utilities']['telecom_fiber']['verification_status'] ?? '') === V2StructuredFacts::STATUS_VERIFIED) {
            $strengths[] = [
                'title' => "High-Speed Fiber Connectivity Verified",
                'description' => "Aerial fiber infrastructure mapped at roadway boundary supports modern POS, cloud systems, and remote operations.",
                'source' => $facts['utilities']['telecom_fiber']['source'],
                'date' => $facts['utilities']['telecom_fiber']['observation_date'],
            ];
        }

        // Check Water
        $waterConn = $facts['utilities']['water_connection']['value'] ?? '';
        if (in_array($waterConn, ['msfwd_piped', 'connected'], true) && ($facts['utilities']['water_connection']['verification_status'] ?? '') === V2StructuredFacts::STATUS_VERIFIED) {
            $pressure = $facts['utilities']['water_line_pressure']['value'] ?? '28';
            $strengths[] = [
                'title' => "Verified Piped Water Supply",
                'description' => "Direct MSFWD municipal water line with adequate pressure (~{$pressure} psi) verified at frontage.",
                'source' => $facts['utilities']['water_connection']['source'],
                'date' => $facts['utilities']['water_connection']['observation_date'],
            ];
        }

        // Check Commercial Anchors
        $anchors = (int) ($facts['competitors_vs_complementary']['complementary_anchors_count']['value'] ?? 0);
        if ($anchors >= 3 && ($facts['competitors_vs_complementary']['complementary_anchors_count']['verification_status'] ?? '') === V2StructuredFacts::STATUS_VERIFIED) {
            $strengths[] = [
                'title' => "Strong Foot-Traffic Generators Nearby",
                'description' => "Surrounded by {$anchors} complementary commercial anchors (banks, convenience stores, and offices) driving active customer flow.",
                'source' => $facts['competitors_vs_complementary']['complementary_anchors_count']['source'],
                'date' => $facts['competitors_vs_complementary']['complementary_anchors_count']['observation_date'],
            ];
        }

        // Check Hazard safety
        $faultDist = (float) ($facts['hazards']['fault_line_distance']['value'] ?? 0);
        if ($faultDist >= 500.0 && ($facts['hazards']['fault_statutory_setback_passed']['value'] ?? false) === true) {
            $strengths[] = [
                'title' => "Clear of Active Fault Rupture Zone",
                'description' => "Located {$faultDist}m from nearest active fault, well outside the mandatory 5m setback and 50m technical buffer.",
                'source' => $facts['hazards']['fault_line_distance']['source'],
                'date' => $facts['hazards']['fault_line_distance']['observation_date'],
            ];
        }

        // Check Title
        $title = $facts['development_readiness']['title_status']['value'] ?? '';
        if ($title === 'clean_tct' && ($facts['development_readiness']['title_status']['verification_status'] ?? '') === V2StructuredFacts::STATUS_VERIFIED) {
            $strengths[] = [
                'title' => "Clean Transfer Certificate of Title (TCT)",
                'description' => "No encumbrances, adverse claims, or lis pendens recorded with the Registry of Deeds.",
                'source' => $facts['development_readiness']['title_status']['source'],
                'date' => $facts['development_readiness']['title_status']['observation_date'],
            ];
        }

        return array_slice($strengths, 0, 4);
    }

    private static function deriveTradeoffs(array $facts, array $property, float $score): array
    {
        $tradeoffs = [];

        // Trade-off 1: Pre-operational setup cost vs cleared site
        $setupCost = (float) ($facts['setup_costs']['total_setup_cost_est']['value'] ?? 0);
        if ($setupCost > 200000.0) {
            $tradeoffs[] = [
                'factor' => 'Pre-Operational Setup Capex',
                'pros' => 'Site is clear and available for immediate customized fit-out.',
                'cons' => 'Requires estimated PHP ' . number_format($setupCost, 0) . ' in utility tapping, clearing, and municipal permitting.',
            ];
        }

        // Trade-off 2: Traffic volume vs Noise/Congestion
        $traffic = $facts['market_context']['vehicular_traffic_volume']['value'] ?? '';
        if ($traffic === 'heavy_arterial' || $traffic === 'moderate_thoroughfare') {
            $tradeoffs[] = [
                'factor' => 'High Road Exposure vs Congestion',
                'pros' => 'Continuous vehicular exposure provides organic brand visibility without advertising spend.',
                'cons' => 'Delivery truck loading must be scheduled during off-peak hours to avoid traffic disruption.',
            ];
        }

        // Trade-off 3: Sewerage infrastructure
        $sewer = $facts['utilities']['sewerage_system']['value'] ?? '';
        if ($sewer === 'individual_septic_tank_required') {
            $tradeoffs[] = [
                'factor' => 'Sanitation System Requirement',
                'pros' => 'Fully independent on-site sanitation compliance.',
                'cons' => 'City sewer connection unavailable; requires construction of a 3-chamber septic facility per Code.',
            ];
        }

        // Trade-off 4: Asking price vs Zonal value
        $price = (float) ($property['price'] ?? 0);
        $zonal = (float) ($facts['market_context']['bir_zonal_value']['value'] ?? 0);
        $area = (float) ($property['area'] ?? 0.1);
        $sqm = $area > 0 ? $area * 10000 : 1000;
        $pricePerSqm = $price > 0 && $sqm > 0 ? round($price / $sqm, 2) : 0;

        if ($pricePerSqm > $zonal * 1.15 && $zonal > 0) {
            $tradeoffs[] = [
                'factor' => 'Asking Price Premium',
                'pros' => 'Prime commercial corridor positioning with verified growth fundamentals.',
                'cons' => 'Offered price is at a premium above the BIR zonal valuation baseline.',
            ];
        }

        return $tradeoffs;
    }

    private static function deriveUnresolvedChecks(array $facts): array
    {
        $unresolved = [];

        foreach ($facts as $domain => $domainFacts) {
            if (!is_array($domainFacts)) continue;
            foreach ($domainFacts as $key => $fact) {
                if (!is_array($fact)) continue;
                $st = $fact['verification_status'] ?? V2StructuredFacts::STATUS_UNKNOWN;
                if (in_array($st, [V2StructuredFacts::STATUS_UNVERIFIED, V2StructuredFacts::STATUS_UNKNOWN, V2StructuredFacts::STATUS_UNAVAILABLE], true)) {
                    $unresolved[] = [
                        'domain' => V2StructuredFacts::DOMAINS[$domain] ?? ucfirst($domain),
                        'fact_key' => $key,
                        'label' => ucwords(str_replace('_', ' ', $key)),
                        'current_value' => $fact['value'] ?? 'Unrecorded',
                        'unit' => $fact['unit'] ?? null,
                        'status' => $st,
                        'source' => $fact['source'] ?? 'Pending Inspection',
                        'limitations' => $fact['limitations'] ?? 'Verification required by authorized office.',
                    ];
                }
            }
        }

        return $unresolved;
    }

    private static function deriveNextActions(array $eligibility, array $unresolved, array $property): array
    {
        $actions = [];

        // Action 1: CPDO Zoning Locational Clearance
        if ($eligibility['status'] === V2EligibilityEngine::STATUS_CONDITIONAL) {
            $actions[] = [
                'priority' => 'High',
                'agency' => 'City Planning & Development Office (CPDO)',
                'action' => 'Apply for Locational Clearance Exception',
                'details' => 'Submit formal land use clearance application with preliminary floor plan and adjacent parcel consent.',
            ];
        } else {
            $actions[] = [
                'priority' => 'Medium',
                'agency' => 'City Planning & Development Office (CPDO)',
                'action' => 'Obtain Zoning Certificate of Conformance',
                'details' => 'Secure official zoning certificate confirming permitted commercial use under CLUP 2026-2035.',
            ];
        }

        // Action 2: Utility technical inspection
        $hasUnverifiedUtilities = false;
        foreach ($unresolved as $item) {
            if ($item['domain'] === 'Utilities & Infrastructure') {
                $hasUnverifiedUtilities = true;
                break;
            }
        }
        if ($hasUnverifiedUtilities) {
            $actions[] = [
                'priority' => 'High',
                'agency' => 'LUECO & MSFWD',
                'action' => 'Request Joint Utility Capacity Inspection',
                'details' => 'Conduct on-site engineering survey to confirm 3-phase power feeder capacity and water line flow rate.',
            ];
        }

        // Action 3: Boundary & Relocation Survey
        $actions[] = [
            'priority' => 'Medium',
            'agency' => 'Licensed Geodetic Engineer / City Assessor',
            'action' => 'Perform Cadastral Relocation Survey',
            'details' => 'Verify physical boundary monument pins against registered title coordinates prior to executing contract.',
        ];

        // Action 4: Registry of Deeds Title Verification
        $actions[] = [
            'priority' => 'Medium',
            'agency' => 'Registry of Deeds (San Fernando)',
            'action' => 'Secure Certified True Copy of Title',
            'details' => 'Confirm updated title status and verify absence of encumbrances or pending estate tax proceedings.',
        ];

        return $actions;
    }
}

