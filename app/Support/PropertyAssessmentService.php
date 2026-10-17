<?php
declare(strict_types=1);

namespace App\Support;

use DomainException;
use InvalidArgumentException;
use PDO;
use Throwable;

require_once __DIR__ . '/PropertyCatalog.php';
require_once __DIR__ . '/AssessmentEvidence.php';
require_once __DIR__ . '/RiskConstraintsEngine.php';
require_once __DIR__ . '/ZoningRulesEngine.php';

/**
 * Authoritative LOCUS-SF Multi-Criteria Evaluation (MCE) and Investment Attractiveness Index (IAI) Service.
 *
 * MCE is the evaluation methodology/process.
 * IAI is the composite 0–100 index produced by MCE:
 *   IAI = Σ(normalized criterion score × criterion weight ÷ 100)
 *
 * Methodological Principles:
 * 1. Single composite score: No double counting of components.
 * 2. Hard constraint: Zoning eligibility check governs before MCE weighting.
 *    - Prohibited land use -> not_suitable (IAI = null).
 *    - Conditional land use -> conditional (IAI calculated, clearance note attached).
 *    - Permitted land use -> complete (IAI calculated).
 * 3. Completeness rule: If any required criterion is missing or unverified, IAI = null.
 * 4. Separate policy incentives: Regulatory incentives are evaluated separately
 *    from physical site suitability and never inflate the physical IAI score.
 * 5. Configurable weights: Read from database criteria_config or centralized configuration.
 * 6. Sensitivity analysis: Supports alternate weight scenarios without mutating property data.
 */
final class PropertyAssessmentService
{
    public const METHODOLOGY_VERSION = 'LOCUS-SF MCE v3.0 — Five-Criterion Investment Attractiveness Model with Mandatory Zoning Eligibility';
    public const WEIGHT_TOLERANCE = 0.000001;
    public const TOTAL_TOLERANCE = 0.000001;
    public const DEFAULT_WEIGHTS = [
        'spatial_accessibility' => 25.0,
        'infrastructure_readiness' => 25.0,
        'property_cost_market_competitiveness' => 20.0,
        'nearby_businesses' => 15.0,
        'risk_constraints' => 15.0,
    ];
    public const LEGACY_METHODOLOGY_VERSION = 'LOCUS-SF MCE v1.1 (Legacy 7-Criterion)';
    public const PROVISIONAL_V2_METHODOLOGY_VERSION = 'locus-detailed-v3.0-provisional';
    public const WEIGHT_STATUS_PROVISIONAL = 'Provisional / Subject to LGU validation';
    public const WEIGHT_STATUS_VALIDATED = 'Expert / LGU Validated';
    public const THRESHOLD_SOURCE_RUBRIC = 'LOCUS-SF operational scoring rubric — subject to expert validation';

    public const RISK_CONSTRAINTS_VERSION = RiskConstraintsEngine::VERSION;
    public const RISK_CONSTRAINTS_VALIDATION_STATUS = RiskConstraintsEngine::VALIDATION_STATUS;
    public const RISK_CONSTRAINTS_WEIGHT = RiskConstraintsEngine::WEIGHT;

    public const SPATIAL_ACCESSIBILITY_VERSION = 'LOCUS-SF Spatial Accessibility Operational Rubric v3.0 (Provisional)';
    public const INFRASTRUCTURE_READINESS_VERSION = 'LOCUS-SF Infrastructure Readiness Operational Rubric v3.0 (Provisional)';
    public const INFRASTRUCTURE_VALIDATION_STATUS = 'Provisional / Awaiting Technical & LGU Validation';

    public const PROPERTY_COST_MARKET_COMPETITIVENESS_VERSION = 'LOCUS-SF Property Cost and Market Competitiveness Rubric v3.0 (Provisional)';
    public const ECONOMIC_VIABILITY_VERSION = self::PROPERTY_COST_MARKET_COMPETITIVENESS_VERSION;
    public const ECONOMIC_VALIDATION_STATUS = 'Provisional / Awaiting Market Comparables & LGU Validation';

    public const NEARBY_BUSINESSES_VERSION = 'LOCUS-SF Nearby Businesses & Commercial Environment Rubric v3.0 (Provisional)';
    public const NEARBY_VALIDATION_STATUS = 'Provisional / Awaiting BPLO Commercial Census Benchmarks';

    public const ZONING_RULES_VERSION = ZoningRulesEngine::VERSION;
    public const ZONING_WEIGHT = ZoningRulesEngine::ZONING_WEIGHT; // 0.0 — Mandatory eligibility gate; does not contribute a numerical score to IAI

    public const NEARBY_BUSINESSES_SUBCRITERIA = [
        'commercial_activity' => [
            'key' => 'commercial_activity',
            'label' => 'Commercial Activity',
            'weight' => 25.0,
            'source' => 'City BPLO Commercial Registry & Business Permits Census',
            'description' => 'Operating business density and commercial concentration within 500 meters',
            'validation_status' => self::NEARBY_VALIDATION_STATUS,
        ],
        'complementary_businesses' => [
            'key' => 'complementary_businesses',
            'label' => 'Complementary Businesses',
            'weight' => 30.0,
            'source' => 'Local Commercial Directory & Verified POI Dataset',
            'description' => 'Foot-traffic generators, offices, civic institutions, and mutually supportive establishments',
            'validation_status' => self::NEARBY_VALIDATION_STATUS,
        ],
        'competitive_pressure' => [
            'key' => 'competitive_pressure',
            'label' => 'Competitive Pressure',
            'weight' => 30.0,
            'source' => 'Verified Direct Competitor Registry',
            'description' => 'Density and spatial distribution of direct sector competitors within 500 meters',
            'validation_status' => self::NEARBY_VALIDATION_STATUS,
        ],
        'activity_anchors' => [
            'key' => 'activity_anchors',
            'label' => 'Activity Anchors',
            'weight' => 15.0,
            'source' => 'Major Malls, Transport Terminals & Public Market Centers',
            'description' => 'Proximity and connectivity to major regional activity centers and commercial hubs',
            'validation_status' => self::NEARBY_VALIDATION_STATUS,
        ],
    ];

    /**
     * Authoritative Infrastructure Readiness subcategories and provisional operational weights (v2).
     * Weights total exactly 100.0%:
     * - Electricity: 35%
     * - Water Supply: 30%
     * - Internet & Telecommunications: 20%
     * - Drainage Conditions: 15%
     */
    public const INFRASTRUCTURE_SUBCATEGORIES_V2 = [
        'electricity' => [
            'key' => 'electricity',
            'label' => 'Electricity',
            'weight' => 35.0,
            'source' => 'LUECO verified service grid & on-site renewable energy records',
            'description' => 'Grid electricity supply (LUECO), solar with battery, or on-site generation',
            'validation_status' => self::INFRASTRUCTURE_VALIDATION_STATUS,
            'rules' => [
                'grid_reliable' => ['score' => 100.0, 'label' => 'Reliable and sufficient grid connection'],
                'solar_battery' => ['score' => 90.0, 'label' => 'Reliable adequate solar with battery storage'],
                'generator_only' => ['score' => 40.0, 'label' => 'Generator-only supply'],
                'grid_unconnected' => ['score' => 40.0, 'label' => 'Grid available nearby but unconnected'],
                'no_supply' => ['score' => 0.0, 'label' => 'No operational electric supply'],
                'unknown' => ['score' => null, 'label' => 'Unknown / not yet verified'],
            ],
        ],
        'water' => [
            'key' => 'water',
            'label' => 'Water Supply',
            'weight' => 30.0,
            'source' => 'MSFWD / MLUWD service coverage & verified potable well records',
            'description' => 'Piped water connection (MLUWD), tested deep well, or local waterworks',
            'validation_status' => self::INFRASTRUCTURE_VALIDATION_STATUS,
            'rules' => [
                'piped_reliable' => ['score' => 100.0, 'label' => 'Reliable and sufficient piped supply'],
                'deepwell_tested' => ['score' => 90.0, 'label' => 'Verified sufficient and suitably tested deep well'],
                'limited_intermittent' => ['score' => 60.0, 'label' => 'Limited / intermittent supply'],
                'available_unconnected' => ['score' => 40.0, 'label' => 'Water main available nearby but unconnected'],
                'unavailable' => ['score' => 0.0, 'label' => 'Unavailable / no water supply'],
                'unknown' => ['score' => null, 'label' => 'Unknown / not yet verified'],
            ],
        ],
        'internet' => [
            'key' => 'internet',
            'label' => 'Internet & Telecommunications',
            'weight' => 20.0,
            'source' => 'National / Local Telecom broadband coverage records',
            'description' => 'Fiber optic, fixed wireless, satellite, or mobile broadband connectivity',
            'validation_status' => self::INFRASTRUCTURE_VALIDATION_STATUS,
            'rules' => [
                'fiber_reliable' => ['score' => 100.0, 'label' => 'Reliable fiber connection'],
                'fixed_wireless' => ['score' => 85.0, 'label' => 'Fixed wireless broadband'],
                'satellite_reliable' => ['score' => 75.0, 'label' => 'Reliable satellite connection'],
                'mobile_data_stable' => ['score' => 70.0, 'label' => 'Stable mobile data (4G/5G)'],
                'available_uninstalled' => ['score' => 40.0, 'label' => 'Broadband available nearby but uninstalled'],
                'unavailable' => ['score' => 0.0, 'label' => 'Unavailable / telecom dead zone'],
                'unknown' => ['score' => null, 'label' => 'Unknown / not yet verified'],
            ],
        ],
        'drainage' => [
            'key' => 'drainage',
            'label' => 'Drainage Conditions',
            'weight' => 15.0,
            'source' => 'City Engineering Office stormwater & drainage network records',
            'description' => 'Functional stormwater drainage, curb-and-gutter, or natural outfall capacity',
            'validation_status' => self::INFRASTRUCTURE_VALIDATION_STATUS,
            'rules' => [
                'adequate_functional' => ['score' => 100.0, 'label' => 'Adequate and fully functional'],
                'minor_improvements' => ['score' => 70.0, 'label' => 'Minor improvements required'],
                'inadequate' => ['score' => 35.0, 'label' => 'Inadequate drainage'],
                'unavailable' => ['score' => 0.0, 'label' => 'Unavailable / no drainage system'],
                'unknown' => ['score' => null, 'label' => 'Unknown / not yet verified'],
            ],
        ],
    ];

    /**
     * Defined Spatial Accessibility subcriteria and their provisional operational weights.
     * Weights total exactly 100.0%.
     *
     * Subcriteria:
     * 1. Road Access (30%): Direct frontage (100), Right-of-way (80), No confirmed access (0), Unknown (incomplete)
     * 2. Road Surface & Passability (25%): Paved/all-weather (100), Gravel/all-weather (75), Unpaved/seasonal (40), Impassable (0), Unknown (incomplete)
     * 3. Usable Carriageway Width (25%): >= 6m (100), 4 to <6m (80), 2 to <4m (50), <2m (20), Missing (incomplete)
     * 4. Major Road Proximity (20%): <= 200m (100), >200 to 500m (85), >500 to 1,000m (65), >1,000m (40), Missing (incomplete)
     */
    public const SPATIAL_ACCESSIBILITY_SUBCRITERIA = [
        'road_access' => [
            'key' => 'road_access',
            'label' => 'Road Access',
            'weight' => 30.0,
            'description' => 'Legal and physical frontage / access right-of-way',
            'rules' => [
                'frontage' => ['score' => 100.0, 'label' => 'Direct road frontage'],
                'right_of_way' => ['score' => 80.0, 'label' => 'Documented right-of-way'],
                'no_access' => ['score' => 0.0, 'label' => 'No confirmed legal access'],
                'unknown' => ['score' => null, 'label' => 'Unknown / not yet verified'],
            ],
        ],
        'road_surface_passability' => [
            'key' => 'road_surface_passability',
            'label' => 'Road Surface & Passability',
            'weight' => 25.0,
            'description' => 'Pavement surface and year-round vehicular passability',
            'rules' => [
                'paved' => ['score' => 100.0, 'label' => 'Paved and passable year-round'],
                'gravel' => ['score' => 75.0, 'label' => 'Gravel / all-weather'],
                'unpaved' => ['score' => 40.0, 'label' => 'Unpaved / seasonal'],
                'impassable' => ['score' => 0.0, 'label' => 'Impassable'],
                'unknown' => ['score' => null, 'label' => 'Unknown / not yet verified'],
            ],
        ],
        'carriageway_width' => [
            'key' => 'carriageway_width',
            'label' => 'Usable Carriageway Width',
            'weight' => 25.0,
            'unit' => 'meters',
            'description' => 'Clear roadway carriageway width for vehicular traffic',
            'bands' => [
                ['min' => 6.0, 'max' => null, 'score' => 100.0, 'label' => 'At least 6 m (100)'],
                ['min' => 4.0, 'max' => 6.0, 'score' => 80.0, 'label' => '4 – under 6 m (80)'],
                ['min' => 2.0, 'max' => 4.0, 'score' => 50.0, 'label' => '2 – under 4 m (50)'],
                ['min' => 0.0, 'max' => 2.0, 'score' => 20.0, 'label' => 'Under 2 m (20)'],
            ],
        ],
        'distance_to_major_road' => [
            'key' => 'distance_to_major_road',
            'label' => 'Major Road Proximity',
            'weight' => 20.0,
            'unit' => 'meters',
            'description' => 'Proximity to nearest major commercial arterial or national highway',
            'bands' => [
                ['min' => 0.0, 'max' => 200.0, 'score' => 100.0, 'label' => 'Up to 200 m (100)'],
                ['min' => 200.0, 'max' => 500.0, 'score' => 85.0, 'label' => 'Above 200 – 500 m (85)'],
                ['min' => 500.0, 'max' => 1000.0, 'score' => 65.0, 'label' => 'Above 500 – 1,000 m (65)'],
                ['min' => 1000.0, 'max' => null, 'score' => 40.0, 'label' => 'Over 1,000 m (40)'],
            ],
        ],
    ];

    /**
     * Default provisional criteria configuration.
     * Weights sum to exactly 100.0%.
     */
    public const DEFAULT_CRITERIA_CONFIG = [
        'spatial_accessibility' => [
            'criterion_key' => 'spatial_accessibility',
            'display_name' => 'Spatial Accessibility',
            'weight' => 25.0,
            'is_active' => true,
            'is_required' => true,
            'scoring_method' => 'bands',
            'validation_status' => self::WEIGHT_STATUS_PROVISIONAL,
            'source_reference' => 'City road centerline & DPWH Atlas 2026',
            'description' => 'Distance to mapped road centerline and accessibility network',
            'missing_label' => 'Distance to mapped road / road centerline network',
            'sort_order' => 1,
        ],
        'infrastructure_readiness' => [
            'criterion_key' => 'infrastructure_readiness',
            'display_name' => 'Infrastructure Readiness',
            'weight' => 25.0,
            'is_active' => true,
            'is_required' => true,
            'scoring_method' => 'lookup',
            'validation_status' => self::WEIGHT_STATUS_PROVISIONAL,
            'source_reference' => 'LUECO & MSFWD verified service maps',
            'description' => 'Verified availability of power, water, telecom and drainage connections',
            'missing_label' => 'Utility verification (power, water, telecom, drainage connectivity)',
            'sort_order' => 2,
        ],
        'property_cost_market_competitiveness' => [
            'criterion_key' => 'property_cost_market_competitiveness',
            'display_name' => 'Property Cost and Market Competitiveness',
            'weight' => 20.0,
            'is_active' => true,
            'is_required' => true,
            'scoring_method' => 'bands',
            'validation_status' => self::WEIGHT_STATUS_PROVISIONAL,
            'source_reference' => 'Required: suitable market comparables; BIR/LGU references are descriptive only',
            'description' => 'Offered unit price per m² against documented local comparable market benchmarks; no business profitability inference',
            'missing_label' => 'Suitable market comparables with compatible price units and area scope',
            'sort_order' => 3,
        ],
        'nearby_businesses' => [
            'criterion_key' => 'nearby_businesses',
            'display_name' => 'Nearby Businesses',
            'weight' => 15.0,
            'is_active' => true,
            'is_required' => true,
            'scoring_method' => 'bands',
            'validation_status' => self::WEIGHT_STATUS_PROVISIONAL,
            'source_reference' => 'BPLO Business Registry 2026-Q1',
            'description' => 'Operating business density and surrounding economic commercial environment',
            'missing_label' => 'Economic activity / business registry inventory',
            'sort_order' => 4,
        ],
        'risk_constraints' => [
            'criterion_key' => 'risk_constraints',
            'display_name' => 'Risk Constraints',
            'weight' => 15.0,
            'is_active' => true,
            'is_required' => true,
            'scoring_method' => 'lookup',
            'validation_status' => self::WEIGHT_STATUS_PROVISIONAL,
            'source_reference' => 'DENR-MGB, DOST-PHIVOLCS & PAGASA Multi-Hazard Spatial Screening',
            'description' => 'Multi-hazard susceptibility screening (flood, active faults, landslide, storm surge, liquefaction, tsunami)',
            'missing_label' => 'Hazard susceptibility assessment (flood, active faults, geohazards)',
            'sort_order' => 5,
        ],
        'zoning_compatibility' => [
            'criterion_key' => 'zoning_compatibility',
            'display_name' => 'CLUP & Land-Use Regulations',
            'weight' => 0.0,
            'is_active' => true,
            'is_required' => true,
            'scoring_method' => 'lookup',
            'validation_status' => self::WEIGHT_STATUS_PROVISIONAL,
            'source_reference' => 'San Fernando City Ordinance 2018-06 & amendments / CPDO CLUP',
            'description' => 'Mandatory non-compensatory CLUP zoning compatibility screening',
            'missing_label' => 'CLUP / zoning classification validation',
            'sort_order' => 6,
        ],
        'economic_viability' => [
            'criterion_key' => 'economic_viability',
            'display_name' => 'Property Cost and Market Competitiveness (Legacy Alias)',
            'weight' => 0.0,
            'is_active' => false,
            'is_required' => false,
            'scoring_method' => 'bands',
            'validation_status' => self::WEIGHT_STATUS_PROVISIONAL,
            'source_reference' => 'Legacy alias for property_cost_market_competitiveness',
            'description' => 'Backward-compatible alias for Property Cost and Market Competitiveness',
            'missing_label' => 'Suitable market comparables with compatible price units',
            'sort_order' => 7,
        ],
        'environmental_safety' => [
            'criterion_key' => 'environmental_safety',
            'display_name' => 'Environmental Safety (Legacy)',
            'weight' => 0.0,
            'is_active' => false,
            'is_required' => false,
            'scoring_method' => 'lookup',
            'validation_status' => self::WEIGHT_STATUS_PROVISIONAL,
            'source_reference' => 'CENRO & DENR-EMB Environmental Classification',
            'description' => 'Decommissioned criterion — consolidated with Risk Constraints to avoid double-counting',
            'missing_label' => 'Environmental classification verification (legacy)',
            'sort_order' => 8,
        ],
    ];

    private static ?array $cachedConfig = null;

    /**
     * Retrieve active criteria configuration from database or static fallback.
     * Automatically validates that enabled criteria weights sum to exactly 100%.
     */
    public static function getCriteriaConfig(?PDO $pdo = null, bool $forceRefresh = false): array
    {
        if ($pdo === null && self::$cachedConfig !== null && !$forceRefresh) {
            return self::$cachedConfig;
        }

        $config = self::DEFAULT_CRITERIA_CONFIG;

        if ($pdo !== null) {
            try {
                $statement = $pdo->query(
                    'SELECT criterion_key, display_name, weight, is_active, is_required, scoring_method, validation_status, source_reference, description, sort_order
                     FROM criteria_config
                     ORDER BY sort_order ASC, id ASC'
                );
                $rows = $statement ? $statement->fetchAll(PDO::FETCH_ASSOC) : [];
                if (!empty($rows)) {
                    $loaded = [];
                    foreach ($rows as $row) {
                        $key = (string) $row['criterion_key'];
                        $defaultMeta = self::DEFAULT_CRITERIA_CONFIG[$key] ?? [];
                        $loaded[$key] = [
                            'criterion_key' => $key,
                            'display_name' => (string) ($row['display_name'] ?? ($defaultMeta['display_name'] ?? $key)),
                            'weight' => (float) $row['weight'],
                            'is_active' => (bool) $row['is_active'],
                            'is_required' => (bool) ($row['is_required'] ?? false),
                            'scoring_method' => (string) ($row['scoring_method'] ?? 'bands'),
                            'validation_status' => (string) ($row['validation_status'] ?? self::WEIGHT_STATUS_PROVISIONAL),
                            'source_reference' => (string) ($row['source_reference'] ?? ($defaultMeta['source_reference'] ?? '')),
                            'description' => (string) ($row['description'] ?? ($defaultMeta['description'] ?? '')),
                            'missing_label' => $defaultMeta['missing_label'] ?? "Verification for {$key}",
                            'sort_order' => (int) ($row['sort_order'] ?? 0),
                        ];
                    }
                    if (!empty($loaded)) {
                        $config = array_merge($config, $loaded);
                    }
                }
            } catch (Throwable) {
                // Fall back to default criteria configuration
            }
        }

        $activeWeights = [];
        foreach ($config as $key => $item) {
            if ($item['is_active']) {
                $activeWeights[$key] = $item['weight'];
            }
        }
        self::validateWeights($activeWeights);

        if ($pdo === null) { self::$cachedConfig = $config; }
        return $config;
    }

    /**
     * Clear cached criteria configuration.
     */
    public static function clearConfigCache(): void
    {
        self::$cachedConfig = null;
    }

    /**
     * Validate that enabled criteria weights total exactly 100%.
     * Validates finite non-negative numbers and exact sum within numerical tolerance.
     */
    public static function validateWeights(array $weights): void
    {
        if (empty($weights)) {
            throw new DomainException("MCE criteria weights configuration cannot be empty.");
        }
        foreach ($weights as $key => $weight) {
            if (is_bool($weight) || !is_numeric($weight) || !is_finite((float) $weight) || (float) $weight < 0.0) {
                throw new DomainException("Criterion weight for '{$key}' must be a finite, non-negative number.");
            }
        }
        $sum = array_sum(array_map('floatval', $weights));
        if (abs($sum - 100.0) > self::WEIGHT_TOLERANCE) {
            throw new DomainException("MCE criteria weights must sum to exactly 100%. Current sum: {$sum}%.");
        }

        $activeCanonical = ['spatial_accessibility', 'infrastructure_readiness', 'property_cost_market_competitiveness', 'nearby_businesses', 'risk_constraints'];
        $activeWithAlias = ['spatial_accessibility', 'infrastructure_readiness', 'economic_viability', 'nearby_businesses', 'risk_constraints'];
        $legacy6 = ['spatial_accessibility', 'infrastructure_readiness', 'economic_viability', 'nearby_businesses', 'risk_constraints', 'zoning_compatibility'];
        $legacy6WithPcmc = ['spatial_accessibility', 'infrastructure_readiness', 'property_cost_market_competitiveness', 'nearby_businesses', 'risk_constraints', 'zoning_compatibility'];
        $legacy7 = ['spatial_accessibility', 'infrastructure_readiness', 'economic_viability', 'nearby_businesses', 'risk_constraints', 'zoning_compatibility', 'environmental_safety'];

        $keys = array_keys($weights);
        sort($keys);
        $check = static function (array $expected) use ($keys): bool {
            sort($expected);
            return $keys === $expected;
        };

        if ($check($activeCanonical) || $check($activeWithAlias) || $check($legacy6) || $check($legacy6WithPcmc) || $check($legacy7)) {
            return;
        }

        if (isset($weights['zoning_compatibility']) && (float) $weights['zoning_compatibility'] === 0.0) {
            $withoutZoning = $weights;
            unset($withoutZoning['zoning_compatibility']);
            $keysWithout = array_keys($withoutZoning);
            sort($keysWithout);
            $checkWithout = static function (array $expected) use ($keysWithout): bool {
                sort($expected);
                return $keysWithout === $expected;
            };
            if ($checkWithout($activeCanonical) || $checkWithout($activeWithAlias)) {
                return;
            }
        }

        throw new DomainException('Active weights must contain the protocol criterion keys totaling 100%.');
    }

    /**
     * Extract key-to-weight dictionary from active configuration.
     */
    public static function weights(?PDO $pdo = null): array
    {
        $config = self::getCriteriaConfig($pdo);
        $weights = [];
        foreach ($config as $key => $meta) {
            if ($meta['is_active']) {
                $weights[$key] = (float) $meta['weight'];
            }
        }
        return $weights;
    }

    /**
     * Alias for weights(?PDO $pdo = null).
     */
    public static function getCriteriaWeights(?PDO $pdo = null): array
    {
        return self::weights($pdo);
    }

    /**
     * Calculate individual weighted score contribution.
     */
    public static function calculateWeightedScore(float $score, float $weight): float
    {
        return ($score * $weight) / 100.0;
    }

    /**
     * Calculate final IAI from normalized criterion scores and weights.
     * Returns null if any required criterion is missing.
     */
    public static function calculateIAI(array $normalizedScores, ?array $weights = null): ?float
    {
        $weights = $weights ?? self::weights();
        self::validateWeights($weights);
        $total = 0.0;
        foreach ($weights as $key => $weight) {
            $score = $normalizedScores[$key] ?? null;
            if ($score === null && $key === 'property_cost_market_competitiveness') {
                $score = $normalizedScores['economic_viability'] ?? null;
            } elseif ($score === null && $key === 'economic_viability') {
                $score = $normalizedScores['property_cost_market_competitiveness'] ?? null;
            }
            if ($key === 'zoning_compatibility' && (float) $weight === 0.0 && $score === null) {
                continue;
            }
            if (!is_numeric($score) || !is_finite((float) $score) || $score < 0 || $score > 100) {
                return null;
            }
            $total += ((float) $score * (float) $weight) / 100.0;
        }
        return round(max(0.0, min(100.0, $total)), 1, PHP_ROUND_HALF_UP);
    }

    /**
     * Authoritative Spatial Accessibility evaluation engine (Provisional Operational Scoring).
     * Evaluates 4 subcriteria with provisional internal weights totalling 100%:
     * 1. Road Access (30%): Direct frontage (100), Right-of-way (80), No confirmed access (0), Unknown (incomplete)
     * 2. Road Surface & Passability (25%): Paved/all-weather (100), Gravel/all-weather (75), Unpaved/seasonal (40), Impassable (0), Unknown (incomplete)
     * 3. Usable Carriageway Width (25%): >= 6m (100), 4 to <6m (80), 2 to <4m (50), <2m (20), Missing (incomplete)
     * 4. Major Road Proximity (20%): <= 200m (100), >200 to 500m (85), >500 to 1,000m (65), >1,000m (40), Missing (incomplete)
     *
     * Formula:
     *   Spatial Accessibility Score = (Road Access × 0.30) + (Passability × 0.25) + (Width × 0.25) + (Proximity × 0.20)
     *   IAI Contribution = Spatial Accessibility Score × 0.25 (since Spatial Accessibility has a 25% MCE weight)
     */
    public static function evaluateSpatialAccessibility(mixed $input, array $options = []): array
    {
        if (!is_array($input)) { $input = []; }
        // 1. If numeric score passed directly (e.g. 85 or 100 from legacy/mock)

        $subcatsInput = is_array($input) ? $input : [];

        // 1. Road Access (30%)
        $rawAccess = $subcatsInput['road_access'] ?? $subcatsInput['access_type'] ?? null;
        if ($rawAccess === null && isset($subcatsInput['road_frontage'])) {
            $rf = strtolower(trim((string) $subcatsInput['road_frontage']));
            if ($rf === 'yes') $rawAccess = 'frontage';
            elseif ($rf === 'no') $rawAccess = 'no_access';
            elseif (in_array($rf, ['not_verified', 'unknown'], true)) $rawAccess = 'unknown';
        }
        $accessKey = match (strtolower(trim((string) $rawAccess))) {
            'frontage', 'direct', 'direct_frontage', 'direct_road_frontage' => 'frontage',
            'right_of_way', 'row', 'documented_row', 'documented_right_of_way' => 'right_of_way',
            'no_access', 'none', 'no', 'landlocked', 'no_legal_access' => 'no_access',
            default => 'unknown',
        };
        $accessScore = self::SPATIAL_ACCESSIBILITY_SUBCRITERIA['road_access']['rules'][$accessKey]['score'];
        $accessLabel = self::SPATIAL_ACCESSIBILITY_SUBCRITERIA['road_access']['rules'][$accessKey]['label'];

        // 2. Road Surface & Passability (25%)
        $rawSurface = $subcatsInput['road_surface_passability'] ?? $subcatsInput['road_passability'] ?? $subcatsInput['road_surface'] ?? null;
        $surfaceKey = match (strtolower(trim((string) $rawSurface))) {
            'paved', 'paved_all_weather', 'paved_and_passable', 'concrete', 'asphalt' => 'paved',
            'gravel', 'gravel_all_weather' => 'gravel',
            'unpaved', 'unpaved_seasonal', 'dirt', 'rough' => 'unpaved',
            'impassable', 'blocked' => 'impassable',
            default => 'unknown',
        };
        $surfaceScore = self::SPATIAL_ACCESSIBILITY_SUBCRITERIA['road_surface_passability']['rules'][$surfaceKey]['score'];
        $surfaceLabel = self::SPATIAL_ACCESSIBILITY_SUBCRITERIA['road_surface_passability']['rules'][$surfaceKey]['label'];

        // 3. Usable Carriageway Width (25%)
        $rawWidth = $subcatsInput['carriageway_width'] ?? $subcatsInput['carriageway_width_m'] ?? $subcatsInput['road_width'] ?? $subcatsInput['access_road_width'] ?? null;
        $widthScore = null;
        $widthLabel = 'Incomplete';
        $widthVal = null;
        if ($rawWidth !== null && $rawWidth !== '' && is_numeric($rawWidth)) {
            $widthVal = (float) $rawWidth;
            if (!is_finite($widthVal) || $widthVal < 0.0) {
                $widthScore = null;
                $widthLabel = 'Invalid measurement (negative or nonfinite)';
            } elseif ($widthVal >= 6.0) {
                $widthScore = 100.0;
                $widthLabel = 'At least 6 m (100)';
            } elseif ($widthVal >= 4.0) {
                $widthScore = 80.0;
                $widthLabel = '4 – under 6 m (80)';
            } elseif ($widthVal >= 2.0) {
                $widthScore = 50.0;
                $widthLabel = '2 – under 4 m (50)';
            } else {
                $widthScore = 20.0;
                $widthLabel = 'Under 2 m (20)';
            }
        }

        // 4. Major Road Proximity (20%)
        // Straight-line road proximity is distinguished from legal access, road width, passability, and travel time.
        // Legal frontage is never inferred from road proximity alone.
        $rawDistance = $subcatsInput['distance_to_major_road'] ?? $subcatsInput['distance_to_major_road_m'] ?? $subcatsInput['major_road_distance'] ?? $subcatsInput['road_distance_m'] ?? $subcatsInput['distance_to_road_m'] ?? null;
        if ($rawDistance === null && isset($subcatsInput['distance_to_highway']) && is_numeric($subcatsInput['distance_to_highway'])) {
            $rawDistance = $subcatsInput['distance_to_highway'];
        }
        $distanceScore = null;
        $distanceLabel = 'Incomplete';
        $distanceVal = null;
        if ($rawDistance !== null && $rawDistance !== '' && is_numeric($rawDistance)) {
            $distanceVal = (float) $rawDistance;
            if (!is_finite($distanceVal) || $distanceVal < 0.0) {
                $distanceScore = null;
                $distanceLabel = 'Invalid measurement (negative or nonfinite)';
            } elseif ($distanceVal <= 200.0) {
                $distanceScore = 100.0;
                $distanceLabel = 'Up to 200 m (100)';
            } elseif ($distanceVal <= 500.0) {
                $distanceScore = 85.0;
                $distanceLabel = 'Above 200 – 500 m (85)';
            } elseif ($distanceVal <= 1000.0) {
                $distanceScore = 65.0;
                $distanceLabel = 'Above 500 – 1,000 m (65)';
            } else {
                $distanceScore = 40.0;
                $distanceLabel = 'Over 1,000 m (40)';
            }
        }

        $missing = [];
        $missingKeys = [];
        if ($accessScore === null) {
            $missing[] = 'Road access';
            $missingKeys[] = 'road_access';
        }
        if ($surfaceScore === null) {
            $missing[] = 'Road surface and passability';
            $missingKeys[] = 'road_surface_passability';
        }
        if ($widthScore === null) {
            $missing[] = ($widthLabel === 'Invalid measurement (negative or nonfinite)') ? 'Valid usable carriageway width (non-negative)' : 'Usable carriageway width';
            $missingKeys[] = 'carriageway_width';
        }
        if ($distanceScore === null) {
            $missing[] = ($distanceLabel === 'Invalid measurement (negative or nonfinite)') ? 'Valid distance to major road (non-negative)' : 'Distance to major road';
            $missingKeys[] = 'distance_to_major_road';
        }

        $subcriteria = [
            'road_access' => [
                'key' => 'road_access',
                'label' => 'Road access',
                'value' => $rawAccess,
                'status' => $accessKey,
                'score' => $accessScore,
                'weight' => 30.0,
                'weighted_score' => $accessScore !== null ? round($accessScore * 0.30, 2) : null,
                'rule' => $accessLabel,
            ],
            'road_surface_passability' => [
                'key' => 'road_surface_passability',
                'label' => 'Road surface and passability',
                'value' => $rawSurface,
                'status' => $surfaceKey,
                'score' => $surfaceScore,
                'weight' => 25.0,
                'weighted_score' => $surfaceScore !== null ? round($surfaceScore * 0.25, 2) : null,
                'rule' => $surfaceLabel,
            ],
            'carriageway_width' => [
                'key' => 'carriageway_width',
                'label' => 'Usable carriageway width',
                'value' => $widthVal,
                'score' => $widthScore,
                'weight' => 25.0,
                'weighted_score' => $widthScore !== null ? round($widthScore * 0.25, 2) : null,
                'rule' => $widthLabel,
            ],
            'distance_to_major_road' => [
                'key' => 'distance_to_major_road',
                'label' => 'Distance to major road',
                'value' => $distanceVal,
                'score' => $distanceScore,
                'weight' => 20.0,
                'weighted_score' => $distanceScore !== null ? round($distanceScore * 0.20, 2) : null,
                'rule' => $distanceLabel,
            ],
        ];

        $isVerified = (bool) ($options['is_verified'] ?? false);
        $verificationStatus = $isVerified ? 'verified' : 'applicant_reported';

        if (!empty($missing)) {
            return [
                'score' => null,
                'is_complete' => false,
                'iai_contribution' => null,
                'verification_status' => $verificationStatus,
                'missing_subcriteria' => $missing,
                'missing_keys' => $missingKeys,
                'subcriteria' => $subcriteria,
                'formula' => 'Spatial Accessibility (25% MCE weight) = (Road Access × 0.30) + (Passability × 0.25) + (Width × 0.25) + (Proximity × 0.20)',
                'methodology_version' => self::SPATIAL_ACCESSIBILITY_VERSION,
                'disclaimer' => 'Illustrative scores from proposed rules, not verified LGU findings. The actual IAI requires city review and all criteria.',
                'explanation' => 'Assessment incomplete: Provide all four required inputs (' . implode(', ', $missing) . ') before a provisional score can be calculated.',
            ];
        }

        $calculatedScore = ($accessScore * 0.30) + ($surfaceScore * 0.25) + ($widthScore * 0.25) + ($distanceScore * 0.20);
        $finalScore = max(0.0, min(100.0, $calculatedScore));
        $iaiContribution = round($finalScore * 0.25, 2);

        return [
            'score' => $finalScore,
            'is_complete' => true,
            'iai_contribution' => $iaiContribution,
            'verification_status' => $verificationStatus,
            'missing_subcriteria' => [],
            'missing_keys' => [],
            'subcriteria' => $subcriteria,
            'formula' => 'Spatial Accessibility (25% MCE weight) = (Road Access × 0.30) + (Passability × 0.25) + (Width × 0.25) + (Proximity × 0.20)',
            'methodology_version' => self::SPATIAL_ACCESSIBILITY_VERSION,
            'disclaimer' => 'Illustrative scores from proposed rules, not verified LGU findings. The actual IAI requires city review and all criteria.',
            'explanation' => sprintf(
                'Spatial Accessibility Score = %s/100 (Road Access: %.1f, Passability: %.1f, Width: %.1f, Proximity: %.1f). IAI Contribution: %.2f pts (25%% weight). Verification: %s.',
                number_format($finalScore, 1),
                $accessScore * 0.30,
                $surfaceScore * 0.25,
                $widthScore * 0.25,
                $distanceScore * 0.20,
                $iaiContribution,
                $verificationStatus
            ),
        ];
    }

    /**
     * Authoritative Infrastructure Readiness evaluation engine.
     * Evaluates subcategories: Power (30%), Water (30%), Telecom (20%), Road Connectivity (20%).
     *
     * Rules:
     * - Case A: Perfect readiness (all verified connected) = 100/100.
     * - Case B: Partial readiness = proportional weighted sum of subcategory states.
     * - Case C: Unavailable service = assigned configured penalty score (0.0).
     * - Case D: Unverified / unknown = marks missing requirement, score = null (prevents unearned points).
     * - Legitimate Not Applicable (N/A) = proportionally re-weighted over applicable subcategories.
     */
    public static function evaluateInfrastructureReadiness(mixed $input, array $options = []): array
    {
        if (!is_array($input)) { $input = []; }
        $subcatsInput = is_array($input) ? $input : [];

        // Legacy 4-tuple compatibility when flat string status is supplied without drainage
        $isLegacyFlat4Tuple = isset($subcatsInput['road_connectivity'])
            && !isset($subcatsInput['drainage'])
            && (is_string($subcatsInput['power'] ?? null) || is_string($subcatsInput['road_connectivity'] ?? null) || is_string($subcatsInput['water'] ?? null));

        if ($isLegacyFlat4Tuple) {
            $isVerified = (bool) ($options['is_verified'] ?? false);
            $verificationStatus = $isVerified ? 'verified' : 'applicant_reported';

            // Power (30%)
            $normP = strtolower(trim((string) ($subcatsInput['power'] ?? '')));
            $pKey = match ($normP) {
                'connected', 'grid', 'grid_reliable', 'reliable' => 'connected',
                'generator_only', 'generator' => 'generator_only',
                'available_unconnected' => 'available_unconnected',
                'unavailable', 'none', 'disconnected' => 'unavailable',
                'unverified', 'unknown', '' => 'unknown',
                default => 'unknown',
            };
            $pScore = match ($pKey) {
                'connected' => 100.0,
                'generator_only', 'available_unconnected' => 50.0,
                'unavailable' => 0.0,
                default => null,
            };

            // Water (30%)
            $normW = strtolower(trim((string) ($subcatsInput['water'] ?? '')));
            $wKey = match ($normW) {
                'connected', 'piped', 'piped_reliable' => 'connected',
                'available_unconnected' => 'available_unconnected',
                'deepwell', 'deep_well' => 'deepwell',
                'limited_intermittent', 'intermittent' => 'limited_intermittent',
                'unavailable', 'none' => 'unavailable',
                'unverified', 'unknown', '' => 'unknown',
                default => 'unknown',
            };
            $wScore = match ($wKey) {
                'connected' => 100.0,
                'deepwell' => 75.0,
                'available_unconnected' => 50.0,
                'limited_intermittent' => 40.0,
                'unavailable' => 0.0,
                default => null,
            };

            // Telecom (20%)
            $normT = strtolower(trim((string) ($subcatsInput['telecom'] ?? '')));
            $tKey = match ($normT) {
                'connected', 'fiber', 'fiber_reliable' => 'connected',
                'mobile_broadband', 'mobile', '4g', '5g' => 'mobile_broadband',
                'available_unconnected' => 'available_unconnected',
                'unavailable', 'none' => 'unavailable',
                'unverified', 'unknown', '' => 'unknown',
                default => 'unknown',
            };
            $tScore = match ($tKey) {
                'connected' => 100.0,
                'mobile_broadband' => 75.0,
                'available_unconnected' => 50.0,
                'unavailable' => 0.0,
                default => null,
            };

            // Road Connectivity (20%)
            $normR = strtolower(trim((string) ($subcatsInput['road_connectivity'] ?? '')));
            $rKey = match ($normR) {
                'connected', 'paved', 'paved_row' => 'connected',
                'unpaved_row', 'unpaved' => 'unpaved_row',
                'available_unconnected' => 'available_unconnected',
                'unavailable', 'none', 'no_access' => 'unavailable',
                'unverified', 'unknown', '' => 'unknown',
                default => 'unknown',
            };
            $rScore = match ($rKey) {
                'connected' => 100.0,
                'unpaved_row' => 60.0,
                'available_unconnected' => 50.0,
                'unavailable' => 0.0,
                default => null,
            };

            $missing = [];
            $missingKeys = [];
            if ($pScore === null) { $missing[] = 'Power Supply'; $missingKeys[] = 'power'; }
            if ($wScore === null) { $missing[] = 'Water Supply'; $missingKeys[] = 'water'; }
            if ($tScore === null) { $missing[] = 'Telecommunications'; $missingKeys[] = 'telecom'; }
            if ($rScore === null) { $missing[] = 'Road Connectivity'; $missingKeys[] = 'road_connectivity'; }

            $subcategoriesBreakdown = [
                'power' => [
                    'key' => 'power',
                    'label' => 'Power Supply',
                    'status' => $pKey,
                    'score' => $pScore,
                    'weight' => 30.0,
                    'weighted_score' => $pScore !== null ? round($pScore * 0.30, 2) : null,
                    'rule' => 'Legacy power supply rubric',
                ],
                'water' => [
                    'key' => 'water',
                    'label' => 'Water Supply',
                    'status' => $wKey,
                    'score' => $wScore,
                    'weight' => 30.0,
                    'weighted_score' => $wScore !== null ? round($wScore * 0.30, 2) : null,
                    'rule' => 'Legacy water supply rubric',
                ],
                'telecom' => [
                    'key' => 'telecom',
                    'label' => 'Telecommunications',
                    'status' => $tKey,
                    'score' => $tScore,
                    'weight' => 20.0,
                    'weighted_score' => $tScore !== null ? round($tScore * 0.20, 2) : null,
                    'rule' => 'Legacy telecommunications rubric',
                ],
                'road_connectivity' => [
                    'key' => 'road_connectivity',
                    'label' => 'Road Connectivity',
                    'status' => $rKey,
                    'score' => $rScore,
                    'weight' => 20.0,
                    'weighted_score' => $rScore !== null ? round($rScore * 0.20, 2) : null,
                    'rule' => 'Legacy road connectivity rubric',
                ],
            ];

            if (!empty($missing)) {
                return [
                    'score' => null,
                    'is_complete' => false,
                    'iai_contribution' => null,
                    'verification_status' => $verificationStatus,
                    'missing_subcategories' => $missing,
                    'missing_keys' => $missingKeys,
                    'subcategories' => $subcategoriesBreakdown,
                    'cross_criteria_considerations' => [],
                    'formula' => 'Infrastructure Readiness Score = (Power × 0.30) + (Water × 0.30) + (Telecom × 0.20) + (Road × 0.20)',
                    'subcriteria' => $subcategoriesBreakdown,
                ];
            }

            $score = ($pScore * 0.30) + ($wScore * 0.30) + ($tScore * 0.20) + ($rScore * 0.20);
            return [
                'score' => round($score, 1),
                'is_complete' => true,
                'iai_contribution' => round($score * 0.20, 2),
                'verification_status' => $verificationStatus,
                'missing_subcategories' => [],
                'missing_keys' => [],
                'subcategories' => $subcategoriesBreakdown,
                'cross_criteria_considerations' => [],
                'formula' => 'Infrastructure Readiness Score = (Power × 0.30) + (Water × 0.30) + (Telecom × 0.20) + (Road × 0.20)',
                'subcriteria' => $subcategoriesBreakdown,
            ];
        }

        // 4. New Operational Rubric (Electricity 35%, Water 30%, Internet 20%, Drainage 15%)
        $isVerified = (bool) ($options['is_verified'] ?? false);
        $verificationStatus = $isVerified ? 'verified' : 'applicant_reported';

        // 4.1 Electricity (35%)
        $rawElec = $subcatsInput['electricity'] ?? $subcatsInput['electricity_arrangement'] ?? $subcatsInput['power'] ?? null;
        $elecProvider = is_array($rawElec) ? ($rawElec['provider'] ?? '') : ($subcatsInput['electricity_provider'] ?? '');
        $elecVal = is_array($rawElec) ? ($rawElec['status'] ?? $rawElec['arrangement'] ?? $rawElec['primary_supply'] ?? '') : (string) $rawElec;
        $normElec = strtolower(trim($elecVal));
        $elecKey = match ($normElec) {
            'grid_reliable', 'grid', 'reliable_grid', 'connected', 'lueco', 'lueco_grid', 'reliable and sufficient grid', 'reliable and sufficient grid connection' => 'grid_reliable',
            'solar_battery', 'solar', 'solar_adequate', 'solar_with_battery', 'reliable adequate solar with battery', 'reliable adequate solar with battery storage' => 'solar_battery',
            'generator_only', 'generator', 'generator_supply', 'off_grid_generator', 'generator-only', 'generator-only supply' => 'generator_only',
            'grid_unconnected', 'available_unconnected', 'grid_available', 'unconnected', 'grid available but unconnected', 'grid available nearby but unconnected' => 'grid_unconnected',
            'no_supply', 'unavailable', 'none', 'disconnected', 'no operational supply', 'no operational electric supply' => 'no_supply',
            'unknown', 'not_verified', 'unverified', 'pending', '' => 'unknown',
            default => 'unknown',
        };
        $elecMeta = self::INFRASTRUCTURE_SUBCATEGORIES_V2['electricity']['rules'][$elecKey] ?? self::INFRASTRUCTURE_SUBCATEGORIES_V2['electricity']['rules']['unknown'];
        $elecScore = $elecMeta['score'];
        $elecLabel = $elecMeta['label'];

        // 4.2 Water Supply (30%)
        $rawWater = $subcatsInput['water'] ?? $subcatsInput['water_supply'] ?? null;
        $waterProvider = is_array($rawWater) ? ($rawWater['provider'] ?? '') : ($subcatsInput['water_provider'] ?? '');
        $waterVal = is_array($rawWater) ? ($rawWater['status'] ?? $rawWater['source'] ?? '') : (string) $rawWater;
        $normWater = strtolower(trim($waterVal));
        $waterKey = match ($normWater) {
            'piped_reliable', 'piped', 'mluwd', 'connected', 'reliable adequate piped supply', 'reliable and sufficient piped supply' => 'piped_reliable',
            'deepwell_tested', 'deep_well', 'deepwell', 'tested_well', 'verified sufficient and suitably tested deep well' => 'deepwell_tested',
            'limited_intermittent', 'intermittent', 'limited', 'delivery_storage', 'limited/intermittent', 'limited / intermittent supply' => 'limited_intermittent',
            'available_unconnected', 'unconnected', 'main_nearby', 'available but unconnected', 'water main available nearby but unconnected' => 'available_unconnected',
            'unavailable', 'none', 'no_water', 'unavailable / no water supply' => 'unavailable',
            'unknown', 'not_verified', 'unverified', 'pending', '' => 'unknown',
            default => 'unknown',
        };
        $waterMeta = self::INFRASTRUCTURE_SUBCATEGORIES_V2['water']['rules'][$waterKey] ?? self::INFRASTRUCTURE_SUBCATEGORIES_V2['water']['rules']['unknown'];
        $waterScore = $waterMeta['score'];
        $waterLabel = $waterMeta['label'];

        // 4.3 Internet & Telecommunications (20%)
        $rawNet = $subcatsInput['internet'] ?? $subcatsInput['internet_telecom'] ?? $subcatsInput['telecom'] ?? null;
        $netProvider = is_array($rawNet) ? ($rawNet['provider'] ?? '') : ($subcatsInput['internet_provider'] ?? '');
        $netVal = is_array($rawNet) ? ($rawNet['status'] ?? $rawNet['technology'] ?? '') : (string) $rawNet;
        $normNet = strtolower(trim($netVal));
        $netKey = match ($normNet) {
            'fiber_reliable', 'fiber', 'connected', 'reliable fiber', 'reliable fiber connection' => 'fiber_reliable',
            'fixed_wireless', 'wireless_broadband', 'wireless', 'fixed wireless broadband' => 'fixed_wireless',
            'satellite_reliable', 'satellite', 'starlink', 'reliable satellite', 'reliable satellite connection' => 'satellite_reliable',
            'mobile_data_stable', 'mobile_broadband', 'mobile', 'lte', '5g', '4g', 'stable mobile data', 'stable mobile data (4g/5g)' => 'mobile_data_stable',
            'available_uninstalled', 'available_unconnected', 'uninstalled', 'available but uninstalled', 'broadband available nearby but uninstalled' => 'available_uninstalled',
            'unavailable', 'none', 'dead_zone', 'unavailable / telecom dead zone' => 'unavailable',
            'unknown', 'not_verified', 'unverified', 'pending', '' => 'unknown',
            default => 'unknown',
        };
        $netMeta = self::INFRASTRUCTURE_SUBCATEGORIES_V2['internet']['rules'][$netKey] ?? self::INFRASTRUCTURE_SUBCATEGORIES_V2['internet']['rules']['unknown'];
        $netScore = $netMeta['score'];
        $netLabel = $netMeta['label'];

        // 4.4 Drainage Conditions (15%)
        $rawDrainage = $subcatsInput['drainage'] ?? $subcatsInput['drainage_conditions'] ?? $subcatsInput['drainage_condition'] ?? $subcatsInput['drainage_service'] ?? null;
        $drainageVal = is_array($rawDrainage) ? ($rawDrainage['status'] ?? $rawDrainage['condition'] ?? '') : (string) $rawDrainage;
        $normDrainage = strtolower(trim($drainageVal));
        $drainageKey = match ($normDrainage) {
            'adequate_functional', 'adequate', 'functional', 'connected', 'adequate functional', 'adequate and fully functional' => 'adequate_functional',
            'minor_improvements', 'minor_improvements_required', 'minor', 'moderate', 'minor improvements required' => 'minor_improvements',
            'inadequate', 'poor', 'insufficient', 'inadequate drainage' => 'inadequate',
            'unavailable', 'none', 'no_drainage', 'unavailable / no drainage system' => 'unavailable',
            'unknown', 'not_verified', 'unverified', 'pending', '' => 'unknown',
            default => 'unknown',
        };
        $drainageMeta = self::INFRASTRUCTURE_SUBCATEGORIES_V2['drainage']['rules'][$drainageKey] ?? self::INFRASTRUCTURE_SUBCATEGORIES_V2['drainage']['rules']['unknown'];
        $drainageScore = $drainageMeta['score'];
        $drainageLabel = $drainageMeta['label'];

        // Check for missing / unknown required conditions
        $missing = [];
        $missingKeys = [];
        if ($elecScore === null) {
            $missing[] = 'Electricity';
            $missingKeys[] = 'electricity';
        }
        if ($waterScore === null) {
            $missing[] = 'Water Supply';
            $missingKeys[] = 'water';
        }
        if ($netScore === null) {
            $missing[] = 'Internet & Telecommunications';
            $missingKeys[] = 'internet';
        }
        if ($drainageScore === null) {
            $missing[] = 'Drainage Conditions';
            $missingKeys[] = 'drainage';
        }

        $subcategoriesBreakdown = [
            'electricity' => [
                'key' => 'electricity',
                'label' => 'Electricity',
                'status' => $elecKey,
                'score' => $elecScore,
                'weight' => 35.0,
                'weighted_score' => $elecScore !== null ? round($elecScore * 0.35, 2) : null,
                'rule' => $elecLabel,
                'source' => self::INFRASTRUCTURE_SUBCATEGORIES_V2['electricity']['source'],
                'provider' => $elecProvider,
            ],
            'water' => [
                'key' => 'water',
                'label' => 'Water Supply',
                'status' => $waterKey,
                'score' => $waterScore,
                'weight' => 30.0,
                'weighted_score' => $waterScore !== null ? round($waterScore * 0.30, 2) : null,
                'rule' => $waterLabel,
                'source' => self::INFRASTRUCTURE_SUBCATEGORIES_V2['water']['source'],
                'provider' => $waterProvider,
            ],
            'internet' => [
                'key' => 'internet',
                'label' => 'Internet & Telecommunications',
                'status' => $netKey,
                'score' => $netScore,
                'weight' => 20.0,
                'weighted_score' => $netScore !== null ? round($netScore * 0.20, 2) : null,
                'rule' => $netLabel,
                'source' => self::INFRASTRUCTURE_SUBCATEGORIES_V2['internet']['source'],
                'provider' => $netProvider,
            ],
            'drainage' => [
                'key' => 'drainage',
                'label' => 'Drainage Conditions',
                'status' => $drainageKey,
                'score' => $drainageScore,
                'weight' => 15.0,
                'weighted_score' => $drainageScore !== null ? round($drainageScore * 0.15, 2) : null,
                'rule' => $drainageLabel,
                'source' => self::INFRASTRUCTURE_SUBCATEGORIES_V2['drainage']['source'],
            ],
        ];

        // Generator-only cross-criteria considerations (recorded without double-penalizing infrastructure)
        $crossCriteria = [];
        if ($elecKey === 'generator_only') {
            $crossCriteria = [
                'economic_viability' => [
                    'criterion_key' => 'economic_viability',
                    'subcriterion' => 'Operating Expenditures (OPEX)',
                    'note' => 'Generator-only electricity implies continuous recurring fuel (diesel/gasoline) and generator maintenance expenditures; separately recorded for Economic Viability operating cost assessment without double-penalizing physical infrastructure.',
                ],
                'environmental_safety' => [
                    'criterion_key' => 'environmental_safety',
                    'subcriterion' => 'Emissions, Noise & Hazardous Storage',
                    'note' => 'Generator-only operation entails combustion emissions, acoustic noise, and requires safe fuel containment/storage facilities on site; flagged for Environmental Safety evaluation without arbitrary score deductions.',
                ],
            ];
        }

        if (!empty($missing)) {
            return [
                'score' => null,
                'is_complete' => false,
                'iai_contribution' => null,
                'verification_status' => $verificationStatus,
                'missing_subcategories' => $missing,
                'missing_keys' => $missingKeys,
                'subcategories' => $subcategoriesBreakdown,
                'cross_criteria_considerations' => $crossCriteria,
                'formula' => 'Infrastructure Readiness (25% MCE weight) = (Electricity × 0.35) + (Water × 0.30) + (Internet × 0.20) + (Drainage × 0.15)',
                'methodology_version' => self::INFRASTRUCTURE_READINESS_VERSION,
                'validation_status' => self::INFRASTRUCTURE_VALIDATION_STATUS,
                'disclaimer' => 'Provisional operational scoring demonstration awaiting technical/LGU validation. Does not establish official LGU assessment.',
                'explanation' => 'Infrastructure assessment incomplete: Missing required conditions for (' . implode(', ', $missing) . ').',
            ];
        }

        $calculatedScore = ($elecScore * 0.35) + ($waterScore * 0.30) + ($netScore * 0.20) + ($drainageScore * 0.15);
        $finalScore = max(0.0, min(100.0, $calculatedScore));
        $iaiContribution = round($finalScore * 0.25, 2);

        $explanation = sprintf(
            'Infrastructure Readiness Score = %s/100 (Electricity: %.2f, Water: %.2f, Internet: %.2f, Drainage: %.2f). IAI Contribution: %.2f pts (25%% weight). Verification: %s.',
            number_format($finalScore, 1),
            $elecScore * 0.35,
            $waterScore * 0.30,
            $netScore * 0.20,
            $drainageScore * 0.15,
            $iaiContribution,
            $verificationStatus
        );

        return [
            'score' => $finalScore,
            'is_complete' => true,
            'iai_contribution' => $iaiContribution,
            'verification_status' => $verificationStatus,
            'missing_subcategories' => [],
            'missing_keys' => [],
            'subcategories' => $subcategoriesBreakdown,
            'cross_criteria_considerations' => $crossCriteria,
            'formula' => 'Infrastructure Readiness (25% MCE weight) = (Electricity × 0.35) + (Water × 0.30) + (Internet × 0.20) + (Drainage × 0.15)',
            'methodology_version' => self::INFRASTRUCTURE_READINESS_VERSION,
            'validation_status' => self::INFRASTRUCTURE_VALIDATION_STATUS,
            'disclaimer' => 'Provisional operational scoring demonstration awaiting technical/LGU validation. Does not establish official LGU assessment.',
            'explanation' => $explanation,
        ];
    }

    /**
     * Legacy evaluation fallback for property records or suites specifying road_connectivity without drainage.
     */
    /**
     * Authoritative Property Cost and Market Competitiveness evaluation engine (Criterion 3, 20% MCE weight).
     * Evaluates property pricing against documented local comparable market benchmarks.
     * Permanently renamed from Economic Viability to reflect strict pricing/cost focus without profitability claims.
     *
     * Core Methodological Principles:
     * - Focus strictly on property pricing and documented market comparisons, NOT business profitability, ROI, or revenue predictions.
     * - BIR Zonal Valuation is a statutory tax floor/reference, NOT a market benchmark or proof of viability.
     * - Higher BIR zonal values DO NOT automatically produce higher scores.
     * - A valid score requires documented, comparable market evidence and authorized verification.
     * - If verified market comparables are missing or Price on Request, the assessment is explicitly marked Incomplete.
     */
    public static function evaluatePropertyCostMarketCompetitiveness(mixed $input, array $options = []): array
    {
        if (!is_array($input)) { $input = []; }
        $isVerified = (bool) ($options['is_verified'] ?? false);
        $verificationStatus = $isVerified ? 'verified' : 'applicant_reported';

        $data = is_array($input) ? $input : [];

        foreach (['land_area', 'offered_area_sqm', 'leasable_area_sqm', 'bir_zonal_value', 'asking_price', 'price', 'lease_price',
            'security_deposit_months', 'advance_rent_months', 'additional_purchase_costs', 'comparable_market_price', 'comparable_lease_price', 'lgu_valuation_amount'] as $field) {
            if (isset($data[$field]) && (!is_numeric($data[$field]) || !is_finite((float) $data[$field]) || $data[$field] < 0)) { $data[$field] = null; }
        }
        // Parse financial & property parameters
        $landArea = isset($data['land_area']) && is_numeric($data['land_area']) && (float) $data['land_area'] > 0
            ? (float) $data['land_area']
            : null;

        $offeredScope = (string) ($data['offered_space_scope'] ?? '');
        if ($offeredScope === 'entire_land') {
            $offeredArea = $landArea;
        } elseif (isset($data['offered_area_sqm']) && is_numeric($data['offered_area_sqm']) && (float) $data['offered_area_sqm'] > 0) {
            $offeredScope = $offeredScope ?: 'part_property';
            $offeredArea = (float) $data['offered_area_sqm'];
        } elseif (isset($data['leasable_area_sqm']) && is_numeric($data['leasable_area_sqm']) && (float) $data['leasable_area_sqm'] > 0) {
            $offeredScope = $offeredScope ?: 'part_property';
            $offeredArea = (float) $data['leasable_area_sqm'];
        } else {
            $offeredScope = $offeredScope ?: 'entire_land';
            $offeredArea = $offeredScope === 'entire_land' ? $landArea : null;
        }

        $birZonal = isset($data['bir_zonal_value']) && is_numeric($data['bir_zonal_value']) && (float) $data['bir_zonal_value'] > 0
            ? (float) $data['bir_zonal_value']
            : null;

        $askingPrice = isset($data['asking_price']) && is_numeric($data['asking_price']) && (float) $data['asking_price'] > 0
            ? (float) $data['asking_price']
            : (isset($data['price']) && is_numeric($data['price']) && (float) $data['price'] > 0 ? (float) $data['price'] : null);

        $leasePrice = isset($data['lease_price']) && is_numeric($data['lease_price']) && (float) $data['lease_price'] > 0
            ? (float) $data['lease_price']
            : null;
        if (($data['sale_price_mode'] ?? '') === 'request') { $askingPrice = null; }
        if (($data['lease_price_mode'] ?? '') === 'request') { $leasePrice = null; }

        $purpose = strtolower(trim((string) ($data['listing_purpose'] ?? 'sale')));
        if (!in_array($purpose, ['sale', 'lease', 'sale_or_lease'], true)) {
            $purpose = 'sale';
        }

        $depositMonths = isset($data['security_deposit_months']) && is_numeric($data['security_deposit_months']) && (float) $data['security_deposit_months'] >= 0
            ? (float) $data['security_deposit_months']
            : null;

        $advanceMonths = isset($data['advance_rent_months']) && is_numeric($data['advance_rent_months']) && (float) $data['advance_rent_months'] >= 0
            ? (float) $data['advance_rent_months']
            : null;

        $utilitiesIncluded = !empty($data['utilities_included']) ? (string) $data['utilities_included'] : null;

        $additionalCosts = isset($data['additional_purchase_costs']) && is_numeric($data['additional_purchase_costs']) && (float) $data['additional_purchase_costs'] >= 0
            ? (float) $data['additional_purchase_costs']
            : null;

        $comparableMarket = isset($data['comparable_market_price']) && is_numeric($data['comparable_market_price']) && (float) $data['comparable_market_price'] > 0
            ? (float) $data['comparable_market_price']
            : null;

        $comparableLease = isset($data['comparable_lease_price']) && is_numeric($data['comparable_lease_price']) && (float) $data['comparable_lease_price'] > 0
            ? (float) $data['comparable_lease_price']
            : null;

        $lguValType = !empty($data['lgu_valuation_type']) ? (string) $data['lgu_valuation_type'] : null;
        $lguValAmount = isset($data['lgu_valuation_amount']) && is_numeric($data['lgu_valuation_amount']) && (float) $data['lgu_valuation_amount'] > 0
            ? (float) $data['lgu_valuation_amount']
            : null;

        $areaDiscrepancy = !empty($data['area_discrepancy']) || (!empty($data['discrepancy_percent']) && (float) $data['discrepancy_percent'] > 25.0);

        // Compute metrics
        // Asking price per m² uses offered area (or recorded land area if offering entire property)
        $askingPricePerSqm = ($askingPrice !== null && $offeredArea !== null && $offeredArea > 0) ? ($askingPrice / $offeredArea) : null;
        // Monthly comparisons require compatible terms. Annual rent divides by 12;
        // daily rent needs a contractual monthly basis rather than an assumed 30 days.
        $rentPeriod = (string) ($data['lease_period'] ?? $data['rent_period'] ?? 'month');
        $leaseUnit = (string) ($data['lease_price_unit'] ?? 'total');
        $monthlyFactor = $rentPeriod === 'month' ? 1.0 : ($rentPeriod === 'year' ? 1.0 / 12.0 : null);
        $monthlyRent = $leasePrice !== null && $monthlyFactor !== null
            ? ($leaseUnit === 'sqm' ? ($offeredArea !== null ? $leasePrice * $offeredArea * $monthlyFactor : null) : $leasePrice * $monthlyFactor)
            : null;
        $leasePricePerSqm = ($monthlyRent !== null && $offeredArea !== null && $offeredArea > 0) ? $monthlyRent / $offeredArea : null;
        // BIR zonal valuation is statutory tax reference on recorded land area
        $birTotalRef = ($birZonal !== null && $landArea !== null) ? round($birZonal * $landArea, 2) : null;

        $askingVsBirPct = ($askingPricePerSqm !== null && $birZonal !== null)
            ? round((($askingPricePerSqm - $birZonal) / $birZonal) * 100.0, 1)
            : null;

        $askingVsMarketPct = ($askingPricePerSqm !== null && $comparableMarket !== null && $comparableMarket > 0)
            ? round((($askingPricePerSqm - $comparableMarket) / $comparableMarket) * 100.0, 2)
            : null;

        $leaseVsMarketPct = ($leasePricePerSqm !== null && $comparableLease !== null && $comparableLease > 0)
            ? round((($leasePricePerSqm - $comparableLease) / $comparableLease) * 100.0, 2)
            : null;

        // Known upfront outlay calculation
        $months = ($depositMonths ?? 0.0) + ($advanceMonths ?? 0.0);
        $leaseUpfrontCosts = $monthlyRent !== null && ($depositMonths !== null || $advanceMonths !== null)
            ? round($months * $monthlyRent, 2) : null;
        $saleAdditionalCosts = $additionalCosts !== null ? round($additionalCosts, 2) : null;
        // An offer for sale OR lease has two alternative outlays, never their sum.
        $knownUpfrontCosts = $purpose === 'sale' ? $saleAdditionalCosts : ($purpose === 'lease' ? $leaseUpfrontCosts : null);

        // Price competitiveness ratio: Asking unit price / Comparable benchmark rate
        $competitivenessRatio = null;
        $activeDiffPct = null;
        if ($purpose === 'lease') {
            if ($leasePricePerSqm !== null && $comparableLease !== null && $comparableLease > 0) {
                $competitivenessRatio = round($leasePricePerSqm / $comparableLease, 4);
                $activeDiffPct = (($leasePricePerSqm - $comparableLease) / $comparableLease) * 100.0;
            }
        } else {
            if ($askingPricePerSqm !== null && $comparableMarket !== null && $comparableMarket > 0) {
                $competitivenessRatio = round($askingPricePerSqm / $comparableMarket, 4);
                $activeDiffPct = (($askingPricePerSqm - $comparableMarket) / $comparableMarket) * 100.0;
            } elseif ($purpose === 'sale_or_lease' && $leasePricePerSqm !== null && $comparableLease !== null && $leasePricePerSqm > 0) {
                $competitivenessRatio = round($leasePricePerSqm / $comparableLease, 4);
                $activeDiffPct = $leaseVsMarketPct;
            }
        }

        $pricingAnalysis = [
            'listing_purpose' => $purpose,
            'land_area_sqm' => $landArea,
            'offered_space_scope' => $offeredScope,
            'offered_area_sqm' => $offeredArea,
            'asking_price' => $askingPrice,
            'asking_price_per_sqm' => $askingPricePerSqm,
            'lease_price' => $leasePrice,
            'lease_price_per_sqm' => $leasePricePerSqm,
            'security_deposit_months' => $depositMonths,
            'advance_rent_months' => $advanceMonths,
            'utilities_included' => $utilitiesIncluded,
            'additional_purchase_costs' => $additionalCosts,
            'known_upfront_costs' => $knownUpfrontCosts,
            'sale_additional_costs' => $saleAdditionalCosts,
            'lease_upfront_costs' => $leaseUpfrontCosts,
            'lease_period' => $rentPeriod,
            'lease_price_unit' => $leaseUnit,
            'monthly_total_rent' => $monthlyRent,
            'bir_zonal_value' => $birZonal,
            'bir_total_reference' => $birTotalRef,
            'bir_date' => $data['bir_date'] ?? null,
            'bir_source' => $data['bir_source'] ?? null,
            'asking_vs_bir_percent' => $askingVsBirPct,
            'comparable_market_price' => $comparableMarket,
            'comparable_lease_price' => $comparableLease,
            'comparable_source' => $data['comparable_source'] ?? null,
            'asking_vs_market_percent' => $askingVsMarketPct,
            'lease_vs_market_percent' => $leaseVsMarketPct,
            'price_competitiveness_ratio' => $competitivenessRatio,
            'lgu_valuation_type' => $lguValType,
            'lgu_valuation_amount' => $lguValAmount,
            'area_discrepancy_flagged' => $areaDiscrepancy,
        ];

        // Missing requirements tracking
        $missing = [];
        if ($landArea === null && $offeredArea === null) {
            $missing[] = 'Valid property land area';
        }
        if ($purpose === 'lease' && !isset($data['offered_area_sqm']) && ($data['offered_space_scope'] ?? '') !== 'entire_land') {
            $missing[] = 'Relevant offered lease area with explicit scope';
        }
        $hasComparableBenchmark = ($purpose === 'lease' && $comparableLease !== null) || ($comparableMarket !== null);
        if (!$hasComparableBenchmark || $competitivenessRatio === null || $activeDiffPct === null) {
            $missing[] = 'Verified local comparable market benchmark';
        }
        $expectedUnit = $purpose === 'lease' ? 'PHP/m2/month' : 'PHP/m2';
        if (($data['comparable_unit'] ?? '') !== $expectedUnit || trim((string) ($data['comparable_source'] ?? '')) === ''
            || ($data['comparables_suitable'] ?? false) !== true || ($data['currency'] ?? 'PHP') !== 'PHP'
            || ($purpose === 'lease' && $monthlyFactor === null)) {
            $missing[] = 'Suitable comparable evidence with compatible currency, area basis and rent period';
        }
        if (!$isVerified) {
            $missing[] = 'Authorized CAO/LEBDO valuation verification';
        }

        $hasSuspiciousArea = ($landArea !== null && $landArea < 0.5) || ($offeredScope !== 'entire_land' && $offeredArea !== null && $offeredArea < 0.5);
        $hasAreaExceeded = ($offeredScope === 'part_property' && $landArea !== null && $offeredArea !== null && $offeredArea > $landArea);
        $hasSuspiciousPrice = ($askingPrice !== null && $askingPrice <= 0) || ($leasePrice !== null && $leasePrice <= 0);
        if ($hasSuspiciousArea || $hasAreaExceeded || $hasSuspiciousPrice) {
            $missing[] = 'Plausible and consistent property area and pricing';
        }

        // Methodological check:
        // A difference from BIR zonal valuation does NOT by itself establish a score.
        // If comparable market benchmark or official verification is missing, or area discrepancy is unresolved:
        if ($areaDiscrepancy || !empty($missing)) {
            $discrepancyMsg = $areaDiscrepancy
                ? 'Area discrepancy flagged: Recorded area differs significantly from mapped plot boundary. Cost metrics are preliminary until parcel survey verification.'
                : ($hasAreaExceeded
                    ? 'Reasonableness warning: Leasable unit area exceeds total recorded parcel land area. Choose Entire Building if multi-story or adjust leasable space.'
                    : ($hasSuspiciousArea
                        ? 'Reasonableness warning: Property area is suspiciously small. Verify property area and units.'
                        : ($hasSuspiciousPrice
                            ? 'Reasonableness warning: Asking price or rent cannot be zero or negative.'
                            : 'Assessment incomplete: A difference from statutory BIR zonal valuation does not by itself establish overpricing, profitability, or investment suitability. A verified comparable market benchmark and authorized CAO/LEBDO verification are required for an authoritative score.')));

            return [
                'score' => null,
                'is_complete' => false,
                'iai_contribution' => null,
                'verification_status' => $verificationStatus,
                'missing_requirements' => $missing,
                'pricing_analysis' => $pricingAnalysis,
                'pricingAnalysis' => $pricingAnalysis,
                'formula' => 'Property Cost and Market Competitiveness (20% MCE weight) — Price Competitiveness vs Verified Local Market Benchmark',
                'methodology_version' => self::PROPERTY_COST_MARKET_COMPETITIVENESS_VERSION,
                'validation_status' => self::ECONOMIC_VALIDATION_STATUS,
                'disclaimer' => 'A difference from BIR zonal valuation does not by itself establish overpricing, profitability, or investment suitability. A verified market benchmark is still needed for a price-competitiveness assessment.',
                'explanation' => $discrepancyMsg,
            ];
        }

        // When verified comparable market benchmark is present and verified:
        // Authoritative price-competitiveness scoring rubric:
        // - Within +/- 5% of market benchmark: 100.0 (Highly competitive market alignment)
        // - 5% to 15% above market: 85.0 (Moderate premium over market)
        // - 15% to 30% above market: 70.0 (Substantial premium over market)
        // - > 30% above market: 50.0 (Significantly elevated asking price)
        // - 5% to 20% below market: 90.0 (Competitive discount below market)
        // - More than 20% below market: 75.0 (Deep discount below market; title & encumbrance review required)
        $compPct = $activeDiffPct;
        if ($compPct >= -5.0 && $compPct <= 5.0) {
            $score = 100.0;
            $rubricNote = 'Asking price is aligned within ±5% of verified market comparables (highly competitive).';
        } elseif ($compPct > 5.0 && $compPct <= 15.0) {
            $score = 85.0;
            $rubricNote = 'Asking price reflects a moderate 5% to 15% premium over local market comparables.';
        } elseif ($compPct > 15.0 && $compPct <= 30.0) {
            $score = 70.0;
            $rubricNote = 'Asking price reflects a substantial 15% to 30% premium over local market comparables.';
        } elseif ($compPct > 30.0) {
            $score = 50.0;
            $rubricNote = 'Asking price is significantly elevated (>30% above verified market comparables).';
        } elseif ($compPct < -5.0 && $compPct >= -20.0) {
            $score = 90.0;
            $rubricNote = 'Asking price reflects a competitive discount of 5% to 20% below verified market comparables.';
        } else {
            $score = 75.0;
            $rubricNote = 'Asking price is deeply discounted (>20% below verified market benchmark); requires title, encumbrance, and physical condition review.';
        }

        $iaiContribution = round($score * 0.20, 2);

        return [
            'score' => $score,
            'is_complete' => true,
            'iai_contribution' => $iaiContribution,
            'verification_status' => 'verified',
            'missing_requirements' => [],
            'pricing_analysis' => $pricingAnalysis,
            'pricingAnalysis' => $pricingAnalysis,
            'formula' => 'Property Cost and Market Competitiveness (20% MCE weight) = Price Competitiveness Score × 0.20',
            'methodology_version' => self::PROPERTY_COST_MARKET_COMPETITIVENESS_VERSION,
            'validation_status' => self::ECONOMIC_VALIDATION_STATUS,
            'disclaimer' => 'A difference from BIR zonal valuation does not by itself establish overpricing, profitability, or investment suitability. A verified market benchmark is still needed for a price-competitiveness assessment.',
            'explanation' => "Property Cost and Market Competitiveness Score = {$score}/100. IAI Contribution: {$iaiContribution} pts (20% weight). {$rubricNote}",
        ];
    }

    /**
     * Backward-compatible alias for evaluatePropertyCostMarketCompetitiveness.
     */
    public static function evaluateEconomicViability(mixed $input, array $options = []): array
    {
        return self::evaluatePropertyCostMarketCompetitiveness($input, $options);
    }

    /**
     * Authoritative Nearby Businesses / Business Environment evaluation.
     *
     * Evaluates 4 provisional subcriteria (weights sum to 100%):
     * 1. Commercial Activity (25%)
     * 2. Complementary Businesses (30%)
     * 3. Competitive Pressure (30%)
     * 4. Activity Anchors (15%)
     *
     * Formula:
     *   Nearby Businesses Score = (Commercial Activity × 0.25) + (Complementary × 0.30) + (Competitive Pressure × 0.30) + (Activity Anchors × 0.15)
     *   IAI Contribution = Nearby Businesses Score × 0.15 (since Nearby Businesses has a 15% MCE weight)
     *
     * In accordance with methodological standards:
     * Scores are calculated ONLY when documented scoring benchmarks and sufficient source data exist.
     * Otherwise, shows Assessment Incomplete. Numerical scoring thresholds are never fabricated.
     */
    public static function evaluateNearbyBusinesses(mixed $input, array $options = []): array
    {
        if (is_numeric($input) || (is_array($input) && isset($input['score']) && is_numeric($input['score']))) {
            $score = is_numeric($input) ? (float) $input : (float) $input['score'];
            if (is_finite($score) && $score >= 0.0 && $score <= 100.0) {
                return [
                    'score' => $score,
                    'is_complete' => true,
                    'status_label' => 'Historical / Scalar Score',
                    'iai_contribution' => round($score * 0.15, 2),
                    'verification_status' => 'reported_unverified',
                    'missing_requirements' => [],
                    'subcriteria' => [
                        'commercial_activity' => ['label' => 'Commercial Activity', 'score' => $score, 'weight' => 25.0, 'weighted_score' => round($score * 0.25, 2), 'rule' => 'Scalar score'],
                        'complementary_businesses' => ['label' => 'Complementary Businesses', 'score' => $score, 'weight' => 30.0, 'weighted_score' => round($score * 0.30, 2), 'rule' => 'Scalar score'],
                        'competitive_pressure' => ['label' => 'Competitive Pressure', 'score' => $score, 'weight' => 30.0, 'weighted_score' => round($score * 0.30, 2), 'rule' => 'Scalar score'],
                        'activity_anchors' => ['label' => 'Activity Anchors', 'score' => $score, 'weight' => 15.0, 'weighted_score' => round($score * 0.15, 2), 'rule' => 'Scalar score'],
                    ],
                    'formula' => 'Nearby Businesses (15% MCE weight) = (Commercial Activity × 0.25) + (Complementary × 0.30) + (Competitive Pressure × 0.30) + (Activity Anchors × 0.15)',
                    'methodology_version' => self::NEARBY_BUSINESSES_VERSION,
                    'validation_status' => self::NEARBY_VALIDATION_STATUS,
                    'disclaimer' => 'Scalar score preserved for backward compatibility.',
                    'explanation' => "Nearby Businesses score: {$score}/100. IAI Contribution: " . round($score * 0.15, 2) . " pts (15% weight).",
                ];
            }
        }

        if (!is_array($input)) { $input = []; }

        $data = is_array($input) ? $input : [];
        $benchmarks = $data['benchmarks'] ?? [];
        $hasCertifiedBenchmarks = (bool) ($options['verified_benchmarks'] ?? $options['scoring_benchmarks_available'] ?? $data['has_certified_benchmarks'] ?? (!empty($benchmarks) && !empty($data['is_verified'])));
        $hasSufficientSourceData = (bool) ($options['sufficient_source_data'] ?? $data['sufficient_source_data'] ?? (!empty($data['is_verified']) || !empty($options['is_verified'])));

        // Check if explicit subcriterion scores were provided under certified benchmarks
        $comm = $data['commercial_activity'] ?? $data['commercial_activity_score'] ?? ($benchmarks['commercial_activity'] ?? null);
        $compl = $data['complementary_businesses'] ?? $data['complementary_businesses_score'] ?? ($benchmarks['complementary_businesses'] ?? null);
        $comp = $data['competitive_pressure'] ?? $data['competitive_pressure_score'] ?? ($benchmarks['competitive_pressure'] ?? null);
        $anchor = $data['activity_anchors'] ?? $data['activity_anchors_score'] ?? ($benchmarks['activity_anchors'] ?? null);

        $hasAllScores = $comm !== null && $compl !== null && $comp !== null && $anchor !== null
            && is_numeric($comm) && is_numeric($compl) && is_numeric($comp) && is_numeric($anchor);
        if ($hasAllScores) {
            foreach ([$comm, $compl, $comp, $anchor] as $value) {
                $hasAllScores = $hasAllScores && is_numeric($value) && is_finite((float) $value) && $value >= 0 && $value <= 100;
            }
        }

        $isVerified = ($options['is_verified'] ?? false) || !empty($data['is_verified']);
        $hasInventory = !empty($benchmarks) || (!empty($data['inventory_version']) && !empty($data['coverage_complete']));
        if ($hasAllScores && ($hasCertifiedBenchmarks || ($isVerified && !empty($benchmarks))) && $hasInventory) {
            $commScore = max(0.0, min(100.0, (float) $comm));
            $complScore = max(0.0, min(100.0, (float) $compl));
            $compScore = max(0.0, min(100.0, (float) $comp));
            $anchorScore = max(0.0, min(100.0, (float) $anchor));

            $compositeScore = ($commScore * 0.25) + ($complScore * 0.30) + ($compScore * 0.30) + ($anchorScore * 0.15);
            $iaiContribution = round($compositeScore * 0.15, 2);

            return [
                'score' => $compositeScore,
                'is_complete' => true,
                'status_label' => 'Verified Benchmark Score',
                'iai_contribution' => $iaiContribution,
                'verification_status' => 'verified_bplo_census',
                'missing_requirements' => [],
                'subcriteria' => [
                    'commercial_activity' => ['label' => 'Commercial Activity', 'score' => $commScore, 'weight' => 25.0, 'weighted_score' => round($commScore * 0.25, 2), 'rule' => 'Verified BPLO Commercial Activity Density'],
                    'complementary_businesses' => ['label' => 'Complementary Businesses', 'score' => $complScore, 'weight' => 30.0, 'weighted_score' => round($complScore * 0.30, 2), 'rule' => 'Verified Foot-traffic & Complementary Support'],
                    'competitive_pressure' => ['label' => 'Competitive Pressure', 'score' => $compScore, 'weight' => 30.0, 'weighted_score' => round($compScore * 0.30, 2), 'rule' => 'Verified Sector Competitive Pressure'],
                    'activity_anchors' => ['label' => 'Activity Anchors', 'score' => $anchorScore, 'weight' => 15.0, 'weighted_score' => round($anchorScore * 0.15, 2), 'rule' => 'Verified Hub & Anchor Proximity'],
                ],
                'formula' => 'Nearby Businesses (15% MCE weight) = (Commercial Activity × 0.25) + (Complementary × 0.30) + (Competitive Pressure × 0.30) + (Activity Anchors × 0.15)',
                'methodology_version' => self::NEARBY_BUSINESSES_VERSION,
                'validation_status' => self::NEARBY_VALIDATION_STATUS,
                'disclaimer' => 'Zero mapped establishments must not imply that no businesses exist. Nearby observed places do not establish customer demand.',
                'explanation' => "Nearby Businesses composite score: {$compositeScore}/100. IAI Contribution: {$iaiContribution} pts (15% weight).",
            ];
        }

        // Missing documented scoring benchmarks or insufficient certified source data
        $missing = [];
        if (!$hasCertifiedBenchmarks && empty($benchmarks)) {
            $missing[] = 'Documented BPLO commercial scoring benchmarks';
        }
        if (!$hasSufficientSourceData) {
            $missing[] = 'Complete operating inventory coverage verification';
        }
        if (!$isVerified && !in_array('Authenticated inventory and benchmark evidence', $missing, true)) {
            $missing[] = 'Authenticated inventory and benchmark evidence';
        }
        if (empty($missing)) {
            $missing[] = 'Documented BPLO commercial scoring benchmarks';
        }

        return [
            'score' => null,
            'is_complete' => false,
            'status_label' => 'Assessment Incomplete',
            'iai_contribution' => null,
            'verification_status' => 'pending_census_benchmarks',
            'missing_requirements' => $missing,
            'subcriteria' => [
                'commercial_activity' => ['label' => 'Commercial Activity', 'score' => null, 'weight' => 25.0, 'weighted_score' => null, 'rule' => 'Awaiting certified commercial census benchmarks'],
                'complementary_businesses' => ['label' => 'Complementary Businesses', 'score' => null, 'weight' => 30.0, 'weighted_score' => null, 'rule' => 'Awaiting documented business classification standards'],
                'competitive_pressure' => ['label' => 'Competitive Pressure', 'score' => null, 'weight' => 30.0, 'weighted_score' => null, 'rule' => 'Awaiting documented competitive pressure thresholds'],
                'activity_anchors' => ['label' => 'Activity Anchors', 'score' => null, 'weight' => 15.0, 'weighted_score' => null, 'rule' => 'Awaiting verified activity anchor proximity benchmarks'],
            ],
            'formula' => 'Nearby Businesses (15% MCE weight) = (Commercial Activity × 0.25) + (Complementary × 0.30) + (Competitive Pressure × 0.30) + (Activity Anchors × 0.15)',
            'methodology_version' => self::NEARBY_BUSINESSES_VERSION,
            'validation_status' => self::NEARBY_VALIDATION_STATUS,
            'disclaimer' => 'Zero mapped establishments must not imply that no businesses exist. Nearby observed places do not establish customer demand or official business-density scoring without verified BPLO census coverage.',
            'explanation' => 'Assessment Incomplete: Score and explanation appear after the required inventory coverage, classifications, and scoring benchmarks are verified.',
        ];
    }

    /**
     * Evaluate Zoning Compatibility using the comprehensive database-driven
     * many-to-many zoning–land-use rules engine.
     *
     * Official Source Priority:
     * 1. San Fernando City Ordinance 2018-06 and amendments (2020-21, 2025-16).
     * 2. Official City Zoning Map schedules.
     * 3. DHSUD Model Zoning Ordinance (supplementary reference only).
     *
     * Eligibility Gate:
     * - Permitted: Score 100.0, eligible, IAI contribution = 15.00 pts (100 * 0.15).
     * - Conditional: Score 70.0, eligible, IAI contribution = 10.50 pts (70 * 0.15).
     * - Prohibited: Score 0.0, NOT eligible (Disqualified / Not Suitable; final IAI = null).
     * - Undetermined: Score null, NOT eligible (Assessment Incomplete; final IAI = null).
     */
    public static function evaluateZoningCompatibility(mixed $input, array $options = []): array
    {
        $input = is_array($input) ? $input : [];
        return ZoningRulesEngine::evaluate($input['zone_code'] ?? $input['zoning_classification'] ?? '',
            $options['proposed_activity'] ?? $input['proposed_activity'] ?? $input['use_code'] ?? '');
    }

    /**
     * Authoritative Risk Constraints Multi-Hazard Evaluation (Criterion 6).
     *
     * Evaluates six official hazard subcriteria with provisional operational weights totaling 100.0%:
     * 1. Flood Susceptibility (25%) — DENR-MGB
     * 2. Active Fault / Ground Rupture (25%) — DOST-PHIVOLCS
     * 3. Landslide Susceptibility (15%) — DENR-MGB
     * 4. Storm Surge Exposure (15%) — DOST-PAGASA
     * 5. Liquefaction Susceptibility (10%) — DOST-PHIVOLCS
     * 6. Tsunami Exposure (10%) — DOST-PHIVOLCS
     *
     * In the 6-criterion model:
     * - Criterion weight: 15.0%
     * - IAI contribution: score * 0.15 pts
     * - Critical active fault ground rupture triggers irrevocable Critical Site Constraint flag.
     */
    public static function evaluateRiskConstraints(mixed $input, array $options = []): array
    {
        return RiskConstraintsEngine::evaluate($input, $options);
    }

    /**
     * Normalize a single raw indicator according to operational scoring rubric.
     */
    public static function normalizeCriterion(string $criterionKey, mixed $rawIndicator): ?float
    {
        if (is_array($rawIndicator)) {
            $result = match ($criterionKey) {
                'spatial_accessibility' => self::evaluateSpatialAccessibility($rawIndicator),
                'infrastructure_readiness' => self::evaluateInfrastructureReadiness($rawIndicator),
                'property_cost_market_competitiveness', 'economic_viability' => self::evaluatePropertyCostMarketCompetitiveness($rawIndicator),
                'nearby_businesses' => self::evaluateNearbyBusinesses($rawIndicator),
                'risk_constraints' => self::evaluateRiskConstraints($rawIndicator),
                'zoning_compatibility' => self::evaluateZoningCompatibility($rawIndicator),
                default => ['score' => null],
            };
            return $result['score'];
        }

        if ($criterionKey === 'risk_constraints') {
            return RiskConstraintsEngine::normalizeSusceptibility($rawIndicator);
        }

        if ($criterionKey === 'spatial_accessibility' && is_numeric($rawIndicator)) {
            $dist = (float) $rawIndicator;
            if ($dist <= 50.0) { return 100.0; }
            if ($dist <= 150.0) { return 85.0; }
            if ($dist <= 300.0) { return 70.0; }
            return 50.0;
        }

        // Scalar normalization preserves a reported score only; it never interprets a distance or service polygon.
        return is_numeric($rawIndicator) && is_finite((float) $rawIndicator) && $rawIndicator >= 0 && $rawIndicator <= 100
            ? (float) $rawIndicator : null;
    }

    /**
     * Normalize raw criteria input into standard 0.0 - 100.0 score dictionary.
     * Can also be called as normalize(string $key, mixed $rawIndicator).
     */
    public static function normalize(mixed $criteria, mixed $secondArg = null): mixed
    {
        if (is_string($criteria) && $secondArg !== null) {
            return self::normalizeCriterion($criteria, $secondArg);
        }
        if (is_string($criteria)) {
            $criteria = json_decode($criteria, true);
        }
        if ($criteria !== null && !is_array($criteria)) {
            throw new InvalidArgumentException('Assessment criteria must be an object or array.');
        }
        $criteria = $criteria ?? [];
        $normalized = [];
        foreach (array_keys(self::DEFAULT_CRITERIA_CONFIG) as $key) {
            $label = self::DEFAULT_CRITERIA_CONFIG[$key]['display_name'];
            $meta = self::DEFAULT_CRITERIA_CONFIG[$key];
            $value = $criteria[$key] ?? null;
            if ($value === null && $key === 'property_cost_market_competitiveness') {
                $value = $criteria['economic_viability'] ?? null;
            } elseif ($value === null && $key === 'economic_viability') {
                $value = $criteria['property_cost_market_competitiveness'] ?? null;
            }
            if ($value === null || $value === '') {
                if (empty($meta['is_active']) && !array_key_exists($key, $criteria)) {
                    continue;
                }
                $normalized[$key] = null;
                continue;
            }
            if (is_array($value) && $key === 'spatial_accessibility') {
                $spatial = self::evaluateSpatialAccessibility($value);
                $normalized[$key] = $spatial['score'];
                continue;
            }
            if (is_array($value) && $key === 'infrastructure_readiness') {
                $infra = self::evaluateInfrastructureReadiness($value);
                $normalized[$key] = $infra['score'];
                continue;
            }
            if (is_array($value) && ($key === 'property_cost_market_competitiveness' || $key === 'economic_viability')) {
                $econ = self::evaluatePropertyCostMarketCompetitiveness($value);
                $normalized[$key] = $econ['score'];
                continue;
            }
            if (is_array($value) && $key === 'nearby_businesses') {
                $nearby = self::evaluateNearbyBusinesses($value);
                $normalized[$key] = $nearby['score'];
                continue;
            }
            if (is_array($value) && $key === 'zoning_compatibility') {
                $zoning = self::evaluateZoningCompatibility($value);
                $normalized[$key] = $zoning['score'];
                continue;
            }
            if (is_array($value) && $key === 'risk_constraints') {
                $risk = self::evaluateRiskConstraints($value);
                $normalized[$key] = $risk['score'];
                continue;
            }
            if (is_string($value) && !is_numeric($value)) {
                $converted = self::normalizeCriterion($key, $value);
                if ($converted !== null) {
                    $normalized[$key] = $converted;
                    continue;
                }
            }
            if (!is_numeric($value) || !is_finite((float) $value) || (float) $value < 0 || (float) $value > 100) {
                throw new InvalidArgumentException("{$label} must be a score from 0 to 100.");
            }
            $normalized[$key] = (float) $value;
        }
        return $normalized;
    }

    /**
     * Evaluate zoning eligibility constraint.
     *
     * @param string|array|null $zoningStatus Status string ('permitted', 'conditional', 'prohibited', 'unverified')
     *                                        or array containing 'zoning_status' / 'clupProfile'
     */
    public static function evaluateEligibility(mixed $zoningStatus): array
    {
        if (is_array($zoningStatus)) {
            $zoningStatus = $zoningStatus['zoning_status']
                ?? $zoningStatus['zoningStatus']
                ?? $zoningStatus['status']
                ?? $zoningStatus['permission']
                ?? $zoningStatus['clupProfile']['status']
                ?? null;
        }

        $normalized = strtolower(trim((string) ($zoningStatus ?? '')));

        if (in_array($normalized, ['prohibited', 'restricted', 'fail', 'not_permitted', 'disallowed'], true)) {
            return [
                'zoning' => 'prohibited',
                'is_eligible' => false,
                'status' => 'not_suitable',
                'reason' => 'Proposed land use is not permitted under the applicable zoning / CLUP classification.',
                'note' => null,
            ];
        }

        if (in_array($normalized, ['conditional', 'review_required', 'variance_required'], true)) {
            return [
                'zoning' => 'conditional',
                'is_eligible' => true,
                'status' => 'conditional',
                'reason' => null,
                'note' => 'Conditional compatibility — requires zoning clearance or further city review.',
            ];
        }

        if (in_array($normalized, ['permitted', 'allowed', 'pass', 'conforming'], true)) {
            return [
                'zoning' => 'permitted',
                'is_eligible' => true,
                'status' => 'complete',
                'reason' => null,
                'note' => null,
            ];
        }

        return [
            'zoning' => 'unverified',
            'is_eligible' => false,
            'status' => 'incomplete',
            'reason' => 'Zoning compatibility is unverified or awaiting CLUP clearance.',
            'note' => null,
        ];
    }

    /**
     * Compute authoritative MCE and IAI evaluation.
     *
     * @param array $criteria Raw or normalized criterion scores
     * @param array $options  Evaluation options:
     *                        - 'weights': Custom weights for sensitivity analysis (array)
     *                        - 'zoning_status': Explicit zoning status ('permitted', 'conditional', 'prohibited')
     *                        - 'enforce_zoning_constraint': bool (default true)
     *                        - 'criteria_details': array of rich spatial evidence details from AutomaticPropertyAssessment
     *                        - 'policy_alignment': array of priority sector metadata
     *                        - 'pdo': PDO connection for reading criteria_config
     */
    public static function evaluate(array $criteria, array $options = []): array
    {
        if (isset($criteria['scores']) || isset($criteria['criteria'])) {
            $options = array_merge($criteria, $options);
            $criteria = $criteria['scores'] ?? $criteria['criteria'];
        }
        $assessedAt = $options['assessed_at'] ?? gmdate(DATE_ATOM);
        $weights = $options['weights'] ?? self::weights(($options['pdo'] ?? null) instanceof PDO ? $options['pdo'] : null);
        if (!isset($weights['zoning_compatibility'])) {
            $weights['zoning_compatibility'] = 0.0;
        }
        self::validateWeights($weights);
        $weights = array_map('floatval', $weights);
        $config = self::DEFAULT_CRITERIA_CONFIG;
        $details = $options['criteria_details'] ?? [];
        $raw = $scores = $subscores = $rules = $units = $verification = $contributions = [];
        $missing = $review = $datasets = [];
        $physical = 0.0;
        $physicalComplete = true;
        $physicalVerified = true;
        $total = 0.0;
        $numericComplete = true;
        $evidenceComplete = true;
        $hold = !empty($options['technical_review_hold']);
        $holdReasons = [];
        $activity = trim((string) ($options['proposed_activity'] ?? ''));
        $district = trim((string) ($options['zoning_district'] ?? ''));
        $zoningInput = $details['zoning_compatibility']['raw'] ?? $criteria['zoning_compatibility'] ?? null;
        if (is_array($zoningInput)) {
            if ($district === '') {
                $district = trim((string) ($zoningInput['zone_code'] ?? $zoningInput['district'] ?? $zoningInput['zoning_classification'] ?? ''));
            }
            if ($activity === '') {
                $activity = trim((string) ($zoningInput['use_code'] ?? $zoningInput['activity'] ?? $zoningInput['proposed_activity'] ?? ''));
            }
        }

        $hasStructuredObservations = false;
        foreach ($criteria as $critVal) {
            if (is_array($critVal)) { $hasStructuredObservations = true; break; }
        }
        $allowScalar = !empty($options['scores']) || !empty($options['allow_scalar_completion'])
            || is_array($criteria['zoning_compatibility'] ?? null) || is_array($options['zoning_compatibility'] ?? null)
            || ($hasStructuredObservations && empty($options['criteria_details']));
        $zoningOption = $options['zoning_compatibility'] ?? null;
        if (is_array($zoningOption)) {
            $zStatus = strtolower(trim((string) ($zoningOption['permission'] ?? $zoningOption['status'] ?? '')));
            $zScore = isset($zoningOption['score']) ? (float) $zoningOption['score'] : ($zStatus === 'permitted' ? 100.0 : ($zStatus === 'conditional' ? 70.0 : 0.0));
            $zEligible = in_array($zStatus, ['permitted', 'conditional'], true);
            $zoning = [
                'status' => $zStatus,
                'score' => $zScore,
                'is_eligible' => $zEligible,
                'unmet_conditions' => $zStatus === 'conditional' ? ['Recorded zoning conditions require review and clearance.'] : [],
                'required_conditions' => [],
                'note' => $zStatus === 'conditional' ? 'Conditional zoning requires city review.' : 'Evaluated from explicit zoning options.',
                'source_priority' => 1,
                'reference' => 'Specified zoning options',
            ];
            if ($zStatus === 'prohibited') {
                $zoning['reason'] = 'Proposed use is not permitted in this zone.';
            }
        } elseif ($activity !== '' && $district === '') {
            $zoning = ZoningRulesEngine::evaluate('', $activity, $options['zoning_conditions'] ?? []);
        } elseif (($district === '' || $activity === '') && isset($options['zoning_status']) && $allowScalar) {
            $zStatus = strtolower(trim((string) $options['zoning_status']));
            if ($zStatus === 'unverified' || $zStatus === 'undetermined') {
                $zScore = null;
                $zEligible = false;
            } elseif ($zStatus === 'prohibited') {
                $zScore = 0.0;
                $zEligible = false;
            } else {
                $zInputScore = isset($criteria['zoning_compatibility']) && is_numeric($criteria['zoning_compatibility'])
                    ? (float) $criteria['zoning_compatibility'] : null;
                $zScore = $zInputScore ?? ($zStatus === 'permitted' ? 100.0 : ($zStatus === 'conditional' ? 70.0 : null));
                $zEligible = in_array($zStatus, ['permitted', 'conditional'], true);
            }
            $zoning = [
                'status' => $zStatus,
                'score' => $zScore,
                'is_eligible' => $zEligible,
                'unmet_conditions' => $zStatus === 'conditional' ? ['Recorded zoning conditions require review and clearance.'] : [],
                'required_conditions' => [],
                'note' => $zStatus === 'conditional' ? 'Conditional zoning requires city review.' : 'Evaluated from explicit zoning status.',
                'source_priority' => 1,
                'reference' => 'Specified zoning status',
            ];
        } elseif (is_numeric($zoningInput) && $allowScalar) {
            $numZScore = (float) $zoningInput;
            $zStatus = $numZScore >= 100.0 ? 'permitted' : ($numZScore > 0.0 ? 'conditional' : 'undetermined');
            $zoning = [
                'status' => $zStatus,
                'score' => $numZScore,
                'is_eligible' => $numZScore > 0.0,
                'unmet_conditions' => $zStatus === 'conditional' ? ['Recorded zoning conditions require review and clearance.'] : [],
                'required_conditions' => [],
                'note' => $zStatus === 'conditional' ? 'Conditional zoning requires city review.' : 'Numeric zoning input.',
                'source_priority' => 1,
                'reference' => 'Reported numeric score',
            ];
            if ($zStatus === 'undetermined') {
                $zoning['reason'] = 'Numeric zero alone is not a recorded prohibited-use rule.';
            }
        } else {
            $zoning = ZoningRulesEngine::evaluate($district, $activity, $options['zoning_conditions'] ?? []);
        }

        $eligibility = self::evaluateEligibility($zoning['status']);
        $eligibility['district'] = $district ?: null;
        $eligibility['proposed_activity'] = $activity ?: null;
        $eligibility['conditions_met'] = $zoning['status'] === 'permitted';
        $eligibility['outstanding_requirements'] = $zoning['unmet_conditions'] ?? $zoning['required_conditions'] ?? [];
        if ($eligibility['zoning'] === 'conditional' && !$eligibility['outstanding_requirements']) {
            $eligibility['outstanding_requirements'] = ['Recorded zoning conditions require review and clearance.'];
        }

        $hasEvidenceTree = false;
        foreach ($details as $d) {
            if (!empty($d['evidence'])) { $hasEvidenceTree = true; break; }
        }
        if (!empty($options['require_evidence'])) { $hasEvidenceTree = true; }

        $hasStructuredObservations = false;
        foreach ($criteria as $critVal) {
            if (is_array($critVal)) { $hasStructuredObservations = true; break; }
        }
        $isUnsupportedScalar = !$hasStructuredObservations && !$allowScalar && empty($options['criteria_details']);

        if ($hasEvidenceTree) {
            $evidenceComplete = true;
        } elseif ($isUnsupportedScalar) {
            $evidenceComplete = false;
        } else {
            $evidenceComplete = true;
        }

        foreach ($weights as $key => $weight) {
            $detail = is_array($details[$key] ?? null) ? $details[$key] : [];
            if (empty($detail) && $key === 'property_cost_market_competitiveness' && isset($details['economic_viability'])) {
                $detail = $details['economic_viability'];
            } elseif (empty($detail) && $key === 'economic_viability' && isset($details['property_cost_market_competitiveness'])) {
                $detail = $details['property_cost_market_competitiveness'];
            }
            $input = $detail['raw'] ?? $criteria[$key] ?? null;
            if ($input === null && $key === 'property_cost_market_competitiveness') {
                $input = $details['economic_viability']['raw'] ?? $criteria['economic_viability'] ?? null;
            } elseif ($input === null && $key === 'economic_viability') {
                $input = $details['property_cost_market_competitiveness']['raw'] ?? $criteria['property_cost_market_competitiveness'] ?? null;
            }
            $raw[$key] = $input;
            $evidence = is_array($detail['evidence'] ?? null) ? $detail['evidence'] : [];
            $authenticated = AssessmentEvidence::complete($evidence);
            if ($key !== 'zoning_compatibility') {
                $authenticated = $authenticated && AssessmentEvidence::supportsObservations($evidence, $key, $input);
            }
            if ($key === 'zoning_compatibility') {
                $roles = array_column($evidence, 'scope');
                $authenticated = $authenticated && in_array('zoning_district', $roles, true) && in_array('zoning_rule', $roles, true);
                $matchingRule = false;
                $matchingDistrict = false;
                foreach ($evidence as $record) {
                    if (($record['scope'] ?? '') === 'zoning_district' && ($record['district'] ?? '') === $district
                        && ($record['property_id'] ?? null) === ($options['property_id'] ?? null)) { $matchingDistrict = true; }
                    if (($record['scope'] ?? '') === 'zoning_rule' && ($record['rule_version'] ?? '') === ZoningRulesEngine::VERSION
                        && ($record['district'] ?? '') === $district && ($record['activity'] ?? '') === $activity) { $matchingRule = true; }
                }
                $authenticated = $authenticated && $matchingRule && $matchingDistrict;
            }
            foreach ($evidence as $item) {
                if (is_array($item) && isset($item['layer'], $item['version'])) {
                    $datasets[$item['layer']] = ['version' => $item['version'], 'sha256' => $item['sha256'] ?? null,
                        'provenance_status' => AssessmentEvidence::status($item)];
                }
            }
            $engineOptions = ['is_verified' => $authenticated];
            // Detailed observations select one rubric. Aggregate scores never supply missing observations.
            $evaluation = match ($key) {
                'spatial_accessibility' => self::evaluateSpatialAccessibility(is_array($input) ? $input : null, $engineOptions),
                'infrastructure_readiness' => self::evaluateInfrastructureReadiness(is_array($input) ? $input : null, $engineOptions),
                'property_cost_market_competitiveness', 'economic_viability' => self::evaluatePropertyCostMarketCompetitiveness(is_array($input) ? $input : null, $engineOptions),
                'nearby_businesses' => self::evaluateNearbyBusinesses(is_array($input) || is_numeric($input) ? $input : null, $engineOptions),
                'risk_constraints' => self::evaluateRiskConstraints(is_array($input) || is_numeric($input) ? $input : null, $engineOptions),
                'zoning_compatibility' => $zoning,
                'environmental_safety' => [
                    'score' => is_numeric($input) ? (float) $input : 80.0,
                    'is_complete' => true,
                    'subcriteria' => [],
                    'methodology' => self::LEGACY_METHODOLOGY_VERSION,
                ],
                default => ['score' => null],
            };
            if ($key === 'nearby_businesses' && is_array($input) && isset($input['proposed_activity']) && (($input['proposed_activity'] ?? '') !== $activity || $activity === '')) {
                $evaluation['score'] = null;
                $evaluation['missing_requirements'][] = 'Business-environment observations for the explicitly selected activity';
            }
            $reported = !is_array($input) && is_numeric($input) && is_finite((float) $input)
                && (float) $input >= 0 && (float) $input <= 100 ? (float) $input : null;
            $score = $evaluation['score'] ?? ($key === 'zoning_compatibility' ? $zoning['score'] : $reported);
            $scores[$key] = $score;
            $observationsComplete = ($key === 'zoning_compatibility')
                ? ($zoning['score'] !== null && $zoning['status'] !== 'undetermined')
                : (($evaluation['score'] ?? null) !== null || $reported !== null);
            $verified = ($authenticated || (!$hasEvidenceTree && $allowScalar)) && $observationsComplete;
            if ($key === 'risk_constraints') {
                $verified = $verified && ($evaluation['evidence_complete'] ?? false || (!$hasEvidenceTree && $allowScalar));
                $hold = $hold || !empty($evaluation['technical_review_hold']);
                $holdReasons = array_merge($holdReasons, $evaluation['technical_review_reasons'] ?? []);
            }
            $verification[$key] = ['status' => $verified ? 'authenticated' : ($evidence || (is_array($input) ? $input !== [] : $input !== null) ? 'reported_unverified' : 'not_assessed'),
                'observations_complete' => $observationsComplete, 'evidence' => $evidence];
            if ($hasEvidenceTree) {
                $evidenceComplete = $evidenceComplete && $authenticated;
            }
            $numericComplete = $numericComplete && $score !== null;
            $subscores[$key] = $evaluation['subcriteria'] ?? $evaluation['subcategories'] ?? [];
            $rules[$key] = $evaluation['methodology_version'] ?? $evaluation['methodology'] ?? $evaluation['rules_version'] ?? self::METHODOLOGY_VERSION;
            $units[$key] = match ($key) {
                'spatial_accessibility' => ['carriageway_width' => 'm', 'distance_to_major_road' => 'm (straight line; travel time unassessed)'],
                'property_cost_market_competitiveness', 'economic_viability' => ['asking_price' => 'PHP', 'lease_price' => 'PHP/month', 'offered_area_sqm' => 'm²',
                    'comparable_market_price' => 'PHP/m²', 'comparable_lease_price' => 'PHP/m²/month'],
                'nearby_businesses' => ['business_radius_m' => 'm', 'observed_business_count' => 'establishments'],
                default => 'categorical observation',
            };
            $contributions[$key] = ($key === 'zoning_compatibility' && (float) $weight === 0.0)
                ? null
                : ($score === null ? null : $score * $weight / 100.0);
            $total += $contributions[$key] ?? 0.0;
            if ($key !== 'zoning_compatibility') {
                $physicalComplete = $physicalComplete && $observationsComplete && !empty($detail);
                $physicalVerified = $physicalVerified && $verified;
                $physical += $contributions[$key] ?? 0.0;
            }
            if (!$observationsComplete) { $missing[] = $config[$key]['missing_label'] ?? 'Required criterion observations'; }
            if (!$verified) { $missing[] = ($config[$key]['display_name'] ?? $key) . ': authenticated applicable evidence'; }
            foreach ($evaluation['missing_requirements'] ?? $evaluation['missing_indicators'] ?? [] as $requirement) {
                $missing[] = $requirement;
            }
            $details[$key] = array_merge($detail, $evaluation, ['raw' => $input, 'score' => $score, 'weight' => $weight,
                'iai_contribution' => $contributions[$key], 'verification_status' => $verification[$key]['status']]);
            $details[$key]['label'] = $config[$key]['display_name'] ?? $key;
            $details[$key]['formula'] = "Contribution = criterion score × {$weight} / 100. Scoring rule: {$rules[$key]}.";
            $details[$key]['explanation'] = $score === null ? 'Required criterion observations or applicable scoring evidence are incomplete.'
                : "Provisional criterion score {$score}/100; configured weight {$weight}%; contribution {$contributions[$key]} points.";
            $details[$key]['evaluated_at'] = $assessedAt;
            $details[$key]['measurement_justification'] = $detail['measurement_justification'] ?? $detail['justification'] ?? '';
            $details[$key]['justification'] = trim($details[$key]['measurement_justification'] . ' ' . $details[$key]['explanation']
                . ' Evidence state: ' . $verification[$key]['status'] . '.');
        }
        if (array_key_exists('property_cost_market_competitiveness', $scores) && !array_key_exists('economic_viability', $scores)) {
            $scores['economic_viability'] = $scores['property_cost_market_competitiveness'];
            $contributions['economic_viability'] = $contributions['property_cost_market_competitiveness'] ?? null;
            $subscores['economic_viability'] = $subscores['property_cost_market_competitiveness'] ?? [];
            $rules['economic_viability'] = $rules['property_cost_market_competitiveness'] ?? self::METHODOLOGY_VERSION;
            $units['economic_viability'] = $units['property_cost_market_competitiveness'] ?? [];
            $verification['economic_viability'] = $verification['property_cost_market_competitiveness'] ?? [];
            $details['economic_viability'] = $details['property_cost_market_competitiveness'] ?? [];
        } elseif (array_key_exists('economic_viability', $scores) && !array_key_exists('property_cost_market_competitiveness', $scores)) {
            $scores['property_cost_market_competitiveness'] = $scores['economic_viability'];
            $contributions['property_cost_market_competitiveness'] = $contributions['economic_viability'] ?? null;
            $subscores['property_cost_market_competitiveness'] = $subscores['economic_viability'] ?? [];
            $rules['property_cost_market_competitiveness'] = $rules['economic_viability'] ?? self::METHODOLOGY_VERSION;
            $units['property_cost_market_competitiveness'] = $units['economic_viability'] ?? [];
            $verification['property_cost_market_competitiveness'] = $verification['economic_viability'] ?? [];
            $details['property_cost_market_competitiveness'] = $details['economic_viability'] ?? [];
        }
        $assessmentWeights = $weights;
        if (isset($assessmentWeights['property_cost_market_competitiveness']) && !isset($assessmentWeights['economic_viability'])) {
            $assessmentWeights['economic_viability'] = $assessmentWeights['property_cost_market_competitiveness'];
        }
        $unrounded = $numericComplete ? $total : null;
        $candidate = $unrounded === null ? null : round($unrounded, 1, PHP_ROUND_HALF_UP);
        $stored = $options['stored_iai'] ?? null;
        $discrepancy = $candidate !== null && is_numeric($stored)
            && (!is_finite((float) $stored) || abs((float) $stored - $candidate) > self::TOTAL_TOLERANCE);
        if ($discrepancy) { $review[] = 'Stored total differs from recomputed total; assessment review required.'; }
        if ($hold) { $review = array_merge($review, $holdReasons ?: ['Critical hazard finding requires technical review.']); }
        if ($eligibility['zoning'] === 'conditional') {
            $missing = array_merge($missing, $eligibility['outstanding_requirements']);
        }
        $hasStructuredObservations = false;
        foreach ($criteria as $critVal) {
            if (is_array($critVal)) { $hasStructuredObservations = true; break; }
        }
        $isUnsupportedScalar = !$hasStructuredObservations && !$allowScalar && empty($options['criteria_details']);

        $complete = !$isUnsupportedScalar && $numericComplete && ($evidenceComplete || (!$hasEvidenceTree && $allowScalar)) && $eligibility['is_eligible'] && !$hold && !$discrepancy;
        $status = $eligibility['zoning'] === 'prohibited' ? 'not_suitable'
            : ($hold ? 'technical_review_hold' : ($discrepancy ? 'review_required'
                : (!$complete ? 'incomplete' : ($eligibility['zoning'] === 'conditional' ? 'conditional' : 'complete'))));
        $iai = $complete ? $candidate : null;
        $missing = array_values(array_unique($missing));
        $review = array_values(array_unique($review));
        $list = [];
        foreach ($weights as $key => $weight) {
            $list[] = ['key' => $key, 'display_name' => $config[$key]['display_name'] ?? $key, 'score' => $scores[$key],
                'weight' => $weight, 'weighted_score' => $contributions[$key], 'raw_value' => $raw[$key],
                'scoring_rule' => $rules[$key], 'source_reference' => $config[$key]['source_reference'] ?? 'LOCUS-SF Criteria Specification',
                'verification_status' => $verification[$key]['status'], 'evidence' => $verification[$key]['evidence'],
                'subcategories' => $subscores[$key], 'threshold_source' => self::THRESHOLD_SOURCE_RUBRIC];
        }
        ksort($weights);
        ksort($datasets);
        $methodologyVersion = $options['methodology_version'] ?? $options['methodology'] ?? self::METHODOLOGY_VERSION;
        $protocolVersion = $options['protocol_version'] ?? $options['protocol'] ?? $methodologyVersion;
        $comparisonKey = hash('sha256', json_encode([$methodologyVersion, $weights, $activity, $datasets], JSON_THROW_ON_ERROR));
        $policy = self::buildPolicyAlignment($options['policy_alignment'] ?? $options);
        return [
            'property_id' => $options['property_id'] ?? null, 'proposed_activity' => $activity ?: null,
            'protocol' => $protocolVersion, 'protocol_version' => $protocolVersion,
            'dataset_versions' => $datasets, 'weight_configuration' => $weights,
            'weight_validation_status' => self::WEIGHT_STATUS_PROVISIONAL, 'weights_valid' => true,
            'weight_tolerance' => self::WEIGHT_TOLERANCE, 'raw_criterion_inputs' => $raw, 'measurement_units' => $units,
            'scoring_rules' => $rules, 'criterion_scores' => $scores, 'subcriterion_scores' => $subscores,
            'weighted_contributions' => $contributions, 'unrounded_total' => $unrounded, 'displayed_iai' => $iai,
            'physical_subtotal' => $physicalComplete ? $physical : null,
            'physical_subtotal_max' => 100.0 - ($weights['zoning_compatibility'] ?? 0.0),
            'physical_evidence_complete' => $physicalVerified, 'numerical_completeness' => $numericComplete,
            'evidence_verification' => $verification, 'evidence_completeness' => $evidenceComplete,
            'methodology_validation' => 'provisional; no authenticated elicitation or approval record supplied',
            'eligibility' => $eligibility, 'technical_review_hold' => $hold,
            'technical_review_reasons' => $holdReasons, 'discrepancy_detected' => $discrepancy,
            'discrepancy_review_required' => $discrepancy, 'discrepancy_message' => $discrepancy ? $review[0] : null,
            'missing_requirements' => $missing, 'review_reasons' => $review,
            'assessed_at' => $assessedAt, 'comparison_key' => $comparisonKey,
            // Conditions remain outstanding; a conditional index is explanatory and does not receive an actionable rank.
            'rank_eligible' => $complete && $status === 'complete',
            'status' => $status, 'assessmentStatus' => $status, 'assessmentComplete' => $complete, 'is_complete' => $complete,
            'iai' => $iai, 'iaiScore' => $iai, 'iai_score' => $iai, 'mceScore' => $iai, 'mce_score' => $iai,
            'scores' => $scores, 'assessmentCriteria' => $scores, 'assessmentWeights' => $assessmentWeights,
            'hazardScreening' => self::presentHazards($subscores['risk_constraints'], $verification['risk_constraints']['status'] === 'authenticated', $hold),
            'criteria' => $list, 'criteriaBreakdown' => $list, 'criteriaDetails' => $details,
            'methodology' => $methodologyVersion, 'methodology_version' => $methodologyVersion,
            'weight_status' => self::WEIGHT_STATUS_PROVISIONAL, 'weightStatus' => self::WEIGHT_STATUS_PROVISIONAL,
            'assessmentMethod' => $methodologyVersion . '. Sum(score × weight / 100); display once with decimal half-up rounding to one place.',
            'missingRequirements' => $missing, 'reason' => $review[0] ?? ($complete ? null : $eligibility['reason'] ?? 'Required observations or evidence are incomplete.'),
            'note' => $eligibility['note'], 'policy_alignment' => $policy, 'policyAlignment' => $policy,
        ];
    }

    /**
     * Alias for evaluate(array $criteria, array $options = []).
     */
    public static function evaluateAssessment(array $criteria, array $options = []): array
    {
        return self::evaluate($criteria, $options);
    }

    /** Compatibility presentation for map cards and filters, derived only from the shared assessment. */
    private static function presentHazards(array $hazards, bool $criterionVerified, bool $hold): array
    {
        $presented = [];
        $verifiedCount = 0;
        foreach ($hazards as $hazard) {
            if (($hazard['evidence_status'] ?? '') === 'assessed_verified') { $verifiedCount++; }
        }
        foreach (['flood' => 'flood_susceptibility', 'fault' => 'active_fault'] as $key => $indicator) {
            $item = $hazards[$indicator] ?? [];
            $verified = ($item['evidence_status'] ?? '') === 'assessed_verified';
            $status = $item['raw_status'] ?? 'not_assessed';
            $score = $item['score'] ?? null;
            $presented[$key] = [
                'status' => $status,
                'badge' => $verified ? strtoupper(str_replace('_', ' ', (string) $status)) : ($score === null ? 'NOT ASSESSED' : 'UNVERIFIED'),
                'color' => $score !== null && $score <= 25 ? 'red' : ($verified ? 'amber' : 'gray'),
                'details' => $item['status_label'] ?? 'Not assessed',
                'evidence_status' => $item['evidence_status'] ?? 'not_assessed',
                'source' => $item['evidence'][0]['source'] ?? null,
                'reference' => $item['evidence'][0]['reference'] ?? null,
                'distance_km' => null, 'proximity' => 'Distance not measured',
            ];
        }
        return array_merge($presented, ['validated' => $criterionVerified && $verifiedCount === 6 && !$hold,
            'status_label' => $hold ? 'Technical review hold' : "{$verifiedCount}/6 authenticated hazard findings; no clearance implied",
            'technical_review_hold' => $hold, 'source' => 'Recorded shared assessment']);
    }

    /**
     * Build policy alignment payload (separate from physical site suitability).
     */
    private static function buildPolicyAlignment(array $policyData): array
    {
        $isPriority = (bool) ($policyData['is_priority'] ?? $policyData['isPriority'] ?? (!empty($policyData['priority_sector']) && $policyData['priority_sector'] !== false));
        $sector = $policyData['sector'] ?? (is_string($policyData['priority_sector'] ?? null) ? $policyData['priority_sector'] : null);
        $businessType = $policyData['business_type'] ?? $policyData['businessType'] ?? null;

        return [
            'priority_sector' => $isPriority,
            'sector' => $sector,
            'business_type' => $businessType,
            'incentive_eligibility' => $isPriority
                ? 'Potentially eligible for review under City Investment and Incentives Code (Ord. No. 2024-41, §19).'
                : 'Standard LGU business requirements apply; no priority incentive mapped.',
            'reviewing_office' => 'Local Economic and Business Development Office (LEBDO) / CSF-IPAC',
            'regulatory_note' => 'Policy alignment and statutory incentives are evaluated separately by the city and do not modify the physical site Investment Attractiveness Index (IAI).',
        ];
    }

    /**
     * Calculate rankings for a list of properties.
     * Withholds ranks (null) for prohibited, incomplete, and review-held properties.
     */
    public static function ranks(array $properties): array
    {
        $groups = [];
        $ranks = [];
        foreach ($properties as $property) {
            $id = (int) $property['id'];
            $ranks[$id] = ['iaiRank' => null, 'mceRank' => null];
            if (($property['rank_eligible'] ?? false) !== true
                || ($property['assessmentStatus'] ?? '') !== 'complete'
                || !empty($property['technical_review_hold']) || !empty($property['discrepancy_detected'])
                || empty($property['comparison_key']) || !is_numeric($property['unrounded_total'] ?? null)
                || !is_finite((float) $property['unrounded_total'])) { continue; }
            $groups[$property['comparison_key']][] = $property;
        }
        foreach ($groups as $key => $group) {
            usort($group, static fn (array $a, array $b): int => ($b['unrounded_total'] <=> $a['unrounded_total']) ?: ($a['id'] <=> $b['id']));
            $previous = null;
            $rank = 0;
            foreach ($group as $index => $property) {
                if ($previous === null || abs($previous - $property['unrounded_total']) > 1e-9) { $rank = $index + 1; }
                $ranks[(int) $property['id']] = ['iaiRank' => $rank, 'mceRank' => $rank, 'rankComparisonKey' => $key];
                $previous = $property['unrounded_total'];
            }
        }
        return $ranks;
    }
}
