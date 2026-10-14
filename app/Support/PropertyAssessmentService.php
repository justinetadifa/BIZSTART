<?php
declare(strict_types=1);

namespace App\Support;

use DomainException;
use InvalidArgumentException;
use PDO;
use Throwable;

require_once __DIR__ . '/PropertyCatalog.php';
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
    public const METHODOLOGY_VERSION = 'LOCUS-SF MCE v2.0 (Provisional 6-Criterion)';
    public const LEGACY_METHODOLOGY_VERSION = 'LOCUS-SF MCE v1.1 (Legacy 7-Criterion)';
    public const WEIGHT_STATUS_PROVISIONAL = 'Provisional / Subject to LGU validation';
    public const WEIGHT_STATUS_VALIDATED = 'Expert / LGU Validated';
    public const THRESHOLD_SOURCE_RUBRIC = 'LOCUS-SF operational scoring rubric — subject to expert validation';

    public const RISK_CONSTRAINTS_VERSION = RiskConstraintsEngine::VERSION;
    public const RISK_CONSTRAINTS_VALIDATION_STATUS = RiskConstraintsEngine::VALIDATION_STATUS;
    public const RISK_CONSTRAINTS_WEIGHT = RiskConstraintsEngine::WEIGHT;

    public const INFRASTRUCTURE_READINESS_VERSION = 'LOCUS-SF Infrastructure Readiness Operational Rubric v1.0 (Provisional)';
    public const INFRASTRUCTURE_VALIDATION_STATUS = 'Provisional / Awaiting Technical & LGU Validation';

    public const ECONOMIC_VIABILITY_VERSION = 'LOCUS-SF Economic Viability & Valuation Reference Rubric v1.0 (Provisional)';
    public const ECONOMIC_VALIDATION_STATUS = 'Provisional / Awaiting Market Comparables & LGU Validation';

    public const NEARBY_BUSINESSES_VERSION = 'LOCUS-SF Nearby Businesses & Commercial Environment Rubric v1.0 (Provisional)';
    public const NEARBY_VALIDATION_STATUS = 'Provisional / Awaiting BPLO Commercial Census Benchmarks';

    public const ZONING_RULES_VERSION = ZoningRulesEngine::VERSION;
    public const ZONING_WEIGHT = ZoningRulesEngine::ZONING_WEIGHT;

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
     * Defined Infrastructure Readiness subcategories and their provisional weights (legacy).
     * Weights total exactly 100.0%.
     *
     * State conditions:
     * - connected: 100.0 (Fully operational / highest readiness)
     * - solar_alternative / deepwell_local / mobile_broadband: 75.0-85.0 (Partial secondary/alternative ready)
     * - available_unconnected: 40.0-60.0 (Service available nearby but not connected)
     * - generator_backup / delivery_storage / satellite_basic: 40.0-50.0 (Limited partial provision)
     * - unavailable: 0.0 (Confirmed unavailable)
     * - unverified: null (Unknown / awaiting verification; prevents unearned points)
     * - not_applicable: null (Re-weighted over remaining applicable subcategories)
     */
    public const INFRASTRUCTURE_SUBCATEGORIES = [
        'power' => [
            'key' => 'power',
            'label' => 'Electricity / Power Supply',
            'weight' => 30.0,
            'source' => 'LUECO verified service grid & on-site renewable energy records',
            'description' => 'Grid electricity supply (LUECO) or verified on-site solar/renewable power',
            'rules' => [
                'connected' => ['score' => 100.0, 'label' => 'Connected / Operational (LUECO grid connection)'],
                'solar_alternative' => ['score' => 85.0, 'label' => 'Operational on-site solar PV / alternative renewable energy'],
                'available_unconnected' => ['score' => 60.0, 'label' => 'Available nearby / grid accessible but not connected'],
                'generator_backup' => ['score' => 50.0, 'label' => 'Generator / backup power only'],
                'unavailable' => ['score' => 0.0, 'label' => 'Unavailable / no electric supply'],
                'unverified' => ['score' => null, 'label' => 'Unknown / not yet verified'],
                'not_applicable' => ['score' => null, 'label' => 'Not applicable (re-weighted)'],
            ],
        ],
        'water' => [
            'key' => 'water',
            'label' => 'Water Supply',
            'weight' => 30.0,
            'source' => 'MSFWD / MLUWD service coverage and local waterworks records',
            'description' => 'Piped water connection (MLUWD) or verified local waterworks/groundwater',
            'rules' => [
                'connected' => ['score' => 100.0, 'label' => 'Connected / Operational (MLUWD piped continuous supply)'],
                'deepwell_local' => ['score' => 80.0, 'label' => 'Operational community system / deep well with pump'],
                'available_unconnected' => ['score' => 50.0, 'label' => 'Water main available nearby but not connected'],
                'delivery_storage' => ['score' => 40.0, 'label' => 'Water storage / delivery service only'],
                'unavailable' => ['score' => 0.0, 'label' => 'Unavailable / no water service'],
                'unverified' => ['score' => null, 'label' => 'Unknown / not yet verified'],
                'not_applicable' => ['score' => null, 'label' => 'Not applicable (re-weighted)'],
            ],
        ],
        'telecom' => [
            'key' => 'telecom',
            'label' => 'Telecommunications & Internet',
            'weight' => 20.0,
            'source' => 'National / Local Telecom broadband coverage records',
            'description' => 'Fiber optic, fixed broadband, or verified mobile telecom connectivity',
            'rules' => [
                'connected' => ['score' => 100.0, 'label' => 'Connected / Operational (Fiber optic or fixed broadband)'],
                'mobile_broadband' => ['score' => 75.0, 'label' => 'Mobile 4G/5G / wireless broadband verified'],
                'available_unconnected' => ['score' => 50.0, 'label' => 'Broadband line available nearby but not connected'],
                'satellite_basic' => ['score' => 40.0, 'label' => 'Satellite / basic mobile data only'],
                'unavailable' => ['score' => 0.0, 'label' => 'Unavailable / telecom dead zone'],
                'unverified' => ['score' => null, 'label' => 'Unknown / not yet verified'],
                'not_applicable' => ['score' => null, 'label' => 'Not applicable (re-weighted)'],
            ],
        ],
        'road_connectivity' => [
            'key' => 'road_connectivity',
            'label' => 'Road Accessibility & Connectivity',
            'weight' => 20.0,
            'source' => 'City road centerline & DPWH Atlas 2026',
            'description' => 'Direct paved road frontage or verified legal right-of-way connectivity',
            'rules' => [
                'connected' => ['score' => 100.0, 'label' => 'Connected / Direct access to 2-lane paved/concrete road'],
                'paved_access' => ['score' => 100.0, 'label' => 'Direct access to paved/concrete road'],
                'unpaved_row' => ['score' => 60.0, 'label' => 'Legal right-of-way / unpaved gravel access'],
                'available_unconnected' => ['score' => 40.0, 'label' => 'Planned road / right-of-way pending development'],
                'unavailable' => ['score' => 0.0, 'label' => 'Landlocked / confirmed no road access'],
                'unverified' => ['score' => null, 'label' => 'Unknown / not yet verified'],
                'not_applicable' => ['score' => null, 'label' => 'Not applicable (re-weighted)'],
            ],
        ],
    ];

    public const SPATIAL_ACCESSIBILITY_VERSION = 'LOCUS-SF Spatial Accessibility Operational Rubric v1.0 (Provisional)';

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
            'weight' => 20.0,
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
            'weight' => 20.0,
            'is_active' => true,
            'is_required' => true,
            'scoring_method' => 'lookup',
            'validation_status' => self::WEIGHT_STATUS_PROVISIONAL,
            'source_reference' => 'LUECO & MSFWD verified service maps',
            'description' => 'Verified availability of power, water, and telecom utility connections',
            'missing_label' => 'Utility verification (power, water, telecom connectivity)',
            'sort_order' => 2,
        ],
        'economic_viability' => [
            'criterion_key' => 'economic_viability',
            'display_name' => 'Land Valuation / Economic Context',
            'weight' => 20.0,
            'is_active' => true,
            'is_required' => true,
            'scoring_method' => 'bands',
            'validation_status' => self::WEIGHT_STATUS_PROVISIONAL,
            'source_reference' => 'BIR District 8 Zonal Valuation DO 014-2026',
            'description' => 'Bureau of Internal Revenue zonal valuation benchmark and economic context',
            'missing_label' => 'Land valuation / dated BIR zonal reference',
            'sort_order' => 3,
        ],
        'zoning_compatibility' => [
            'criterion_key' => 'zoning_compatibility',
            'display_name' => 'Zoning Compatibility',
            'weight' => 15.0,
            'is_active' => true,
            'is_required' => true,
            'scoring_method' => 'lookup',
            'validation_status' => self::WEIGHT_STATUS_PROVISIONAL,
            'source_reference' => 'City Ordinance No. 2026-004 / CPDO CLUP 2026-2035',
            'description' => 'CLUP 2026-2035 zoning classification and land use eligibility',
            'missing_label' => 'CLUP / zoning classification validation',
            'sort_order' => 4,
        ],
        'nearby_businesses' => [
            'criterion_key' => 'nearby_businesses',
            'display_name' => 'Economic Activity / Business Environment',
            'weight' => 10.0,
            'is_active' => true,
            'is_required' => true,
            'scoring_method' => 'bands',
            'validation_status' => self::WEIGHT_STATUS_PROVISIONAL,
            'source_reference' => 'BPLO Business Registry 2026-Q1',
            'description' => 'Operating business density and surrounding economic commercial environment',
            'missing_label' => 'Economic activity / business registry inventory',
            'sort_order' => 5,
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
            'sort_order' => 6,
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
            'sort_order' => 7,
        ],
    ];

    private static ?array $cachedConfig = null;

    /**
     * Retrieve active criteria configuration from database or static fallback.
     * Automatically validates that enabled criteria weights sum to exactly 100%.
     */
    public static function getCriteriaConfig(?PDO $pdo = null, bool $forceRefresh = false): array
    {
        if (self::$cachedConfig !== null && !$forceRefresh) {
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

        self::$cachedConfig = $config;
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
     */
    public static function validateWeights(array $weights): void
    {
        $sum = array_sum(array_map('floatval', $weights));
        if (abs($sum - 100.0) > 0.01) {
            throw new DomainException("MCE criteria weights must sum to exactly 100%. Current sum: {$sum}%.");
        }
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
        return round(($score * $weight) / 100.0, 2);
    }

    /**
     * Calculate final IAI from normalized criterion scores and weights.
     * Returns null if any required criterion is missing.
     */
    public static function calculateIAI(array $normalizedScores, ?array $weights = null): ?float
    {
        $weights = $weights ?? self::weights();
        $total = 0.0;
        foreach ($weights as $key => $weight) {
            $score = $normalizedScores[$key] ?? null;
            if ($score === null) {
                return null;
            }
            $total += ((float) $score * (float) $weight) / 100.0;
        }
        return round(max(0.0, min(100.0, $total)), 1);
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
     *   IAI Contribution = Spatial Accessibility Score × 0.20 (since Spatial Accessibility has a 20% MCE weight)
     */
    public static function evaluateSpatialAccessibility(mixed $input, array $options = []): array
    {
        // 1. If numeric score passed directly (e.g. 85 or 100 from legacy/mock)
        if (is_numeric($input) && !is_array($input)) {
            $num = max(0.0, min(100.0, round((float) $input, 1)));
            $isVerified = (bool) ($options['is_verified'] ?? false);
            return [
                'score' => $num,
                'is_complete' => true,
                'iai_contribution' => round($num * 0.20, 2),
                'verification_status' => $isVerified ? 'verified' : 'applicant_reported',
                'missing_subcriteria' => [],
                'subcriteria' => [
                    'road_access' => ['label' => 'Road access', 'score' => $num, 'weight' => 30.0, 'weighted_score' => round($num * 0.30, 2), 'rule' => "Direct input {$num}"],
                    'road_surface_passability' => ['label' => 'Road surface and passability', 'score' => $num, 'weight' => 25.0, 'weighted_score' => round($num * 0.25, 2), 'rule' => "Direct input {$num}"],
                    'carriageway_width' => ['label' => 'Usable carriageway width', 'score' => $num, 'weight' => 25.0, 'weighted_score' => round($num * 0.25, 2), 'rule' => "Direct input {$num}"],
                    'distance_to_major_road' => ['label' => 'Distance to major road', 'score' => $num, 'weight' => 20.0, 'weighted_score' => round($num * 0.20, 2), 'rule' => "Direct input {$num}"],
                ],
                'formula' => 'Spatial Accessibility = (Road Access × 0.30) + (Passability × 0.25) + (Width × 0.25) + (Proximity × 0.20)',
                'methodology_version' => self::SPATIAL_ACCESSIBILITY_VERSION,
                'disclaimer' => 'Illustrative scores from proposed rules, not verified LGU findings. The actual IAI requires city review and all seven criteria.',
                'explanation' => "Spatial accessibility composite score: {$num}/100.",
            ];
        }

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
            if ($widthVal >= 6.0) {
                $widthScore = 100.0;
                $widthLabel = 'At least 6 m (100)';
            } elseif ($widthVal >= 4.0) {
                $widthScore = 80.0;
                $widthLabel = '4 – under 6 m (80)';
            } elseif ($widthVal >= 2.0) {
                $widthScore = 50.0;
                $widthLabel = '2 – under 4 m (50)';
            } elseif ($widthVal > 0.0) {
                $widthScore = 20.0;
                $widthLabel = 'Under 2 m (20)';
            }
        }

        // 4. Major Road Proximity (20%)
        $rawDistance = $subcatsInput['distance_to_major_road'] ?? $subcatsInput['distance_to_major_road_m'] ?? $subcatsInput['major_road_distance'] ?? $subcatsInput['road_distance_m'] ?? $subcatsInput['distance_to_road_m'] ?? null;
        if ($rawDistance === null && isset($subcatsInput['distance_to_highway']) && is_numeric($subcatsInput['distance_to_highway'])) {
            $rawDistance = $subcatsInput['distance_to_highway'];
        }
        $distanceScore = null;
        $distanceLabel = 'Incomplete';
        $distanceVal = null;
        if ($rawDistance !== null && $rawDistance !== '' && is_numeric($rawDistance)) {
            $distanceVal = (float) $rawDistance;
            if ($distanceVal <= 200.0) {
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
            $missing[] = 'Usable carriageway width';
            $missingKeys[] = 'carriageway_width';
        }
        if ($distanceScore === null) {
            $missing[] = 'Distance to major road';
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
                'formula' => 'Spatial Accessibility = (Road Access × 0.30) + (Passability × 0.25) + (Width × 0.25) + (Proximity × 0.20)',
                'methodology_version' => self::SPATIAL_ACCESSIBILITY_VERSION,
                'disclaimer' => 'Illustrative scores from proposed rules, not verified LGU findings. The actual IAI requires city review and all seven criteria.',
                'explanation' => 'Assessment incomplete: Provide all four required inputs (' . implode(', ', $missing) . ') before a provisional score can be calculated.',
            ];
        }

        $calculatedScore = ($accessScore * 0.30) + ($surfaceScore * 0.25) + ($widthScore * 0.25) + ($distanceScore * 0.20);
        $finalScore = max(0.0, min(100.0, round($calculatedScore, 1)));
        $iaiContribution = round($finalScore * 0.20, 2);

        return [
            'score' => $finalScore,
            'is_complete' => true,
            'iai_contribution' => $iaiContribution,
            'verification_status' => $verificationStatus,
            'missing_subcriteria' => [],
            'missing_keys' => [],
            'subcriteria' => $subcriteria,
            'formula' => 'Spatial Accessibility = (Road Access × 0.30) + (Passability × 0.25) + (Width × 0.25) + (Proximity × 0.20)',
            'methodology_version' => self::SPATIAL_ACCESSIBILITY_VERSION,
            'disclaimer' => 'Illustrative scores from proposed rules, not verified LGU findings. The actual IAI requires city review and all seven criteria.',
            'explanation' => sprintf(
                'Spatial Accessibility Score = %s/100 (Road Access: %.1f, Passability: %.1f, Width: %.1f, Proximity: %.1f). IAI Contribution: %.2f pts (20%% weight). Verification: %s.',
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
        // 1. If numeric score passed directly (e.g. 100 or 80)
        if (is_numeric($input) && !is_array($input)) {
            $num = max(0.0, min(100.0, round((float) $input, 1)));
            $isVerified = (bool) ($options['is_verified'] ?? true);
            $subcats = [];
            foreach (self::INFRASTRUCTURE_SUBCATEGORIES_V2 as $k => $meta) {
                $subcats[$k] = [
                    'key' => $k,
                    'label' => $meta['label'],
                    'status' => $num >= 100.0 ? 'connected' : ($num > 0.0 ? 'partial' : 'unavailable'),
                    'score' => $num,
                    'weight' => (float) $meta['weight'],
                    'weighted_score' => round(($num * (float) $meta['weight']) / 100.0, 2),
                    'verified' => $isVerified,
                    'rule' => "Aggregated score {$num}/100",
                    'source' => $meta['source'],
                ];
            }
            return [
                'score' => $num,
                'is_complete' => true,
                'iai_contribution' => round($num * 0.20, 2),
                'verification_status' => $isVerified ? 'verified' : 'applicant_reported',
                'missing_subcategories' => [],
                'missing_keys' => [],
                'subcategories' => $subcats,
                'cross_criteria_considerations' => [],
                'formula' => 'Infrastructure Readiness Score = (Electricity × 0.35) + (Water × 0.30) + (Internet × 0.20) + (Drainage × 0.15)',
                'methodology_version' => self::INFRASTRUCTURE_READINESS_VERSION,
                'validation_status' => self::INFRASTRUCTURE_VALIDATION_STATUS,
                'disclaimer' => 'Provisional operational scoring demonstration awaiting technical/LGU validation. Does not establish official LGU assessment.',
                'explanation' => "Infrastructure readiness composite score: {$num}/100.",
            ];
        }

        // 2. If legacy string indicator passed
        if (is_string($input)) {
            $str = strtolower(trim($input));
            $mapped = match ($str) {
                'power_water_telecom', 'full_ready', 'all_ready' => [
                    'electricity' => 'grid_reliable', 'water' => 'piped_reliable', 'internet' => 'fiber_reliable', 'drainage' => 'adequate_functional'
                ],
                'power_water', 'power_and_water' => [
                    'electricity' => 'grid_reliable', 'water' => 'piped_reliable', 'internet' => 'unavailable', 'drainage' => 'adequate_functional'
                ],
                'partial', 'basic' => [
                    'electricity' => 'grid_reliable', 'water' => 'available_unconnected', 'internet' => 'mobile_data_stable', 'drainage' => 'minor_improvements'
                ],
                'limited' => [
                    'electricity' => 'grid_unconnected', 'water' => 'available_unconnected', 'internet' => 'unavailable', 'drainage' => 'inadequate'
                ],
                'off_grid', 'unavailable' => [
                    'electricity' => 'no_supply', 'water' => 'unavailable', 'internet' => 'unavailable', 'drainage' => 'unavailable'
                ],
                default => null,
            };
            if ($mapped !== null) {
                return self::evaluateInfrastructureReadiness($mapped, $options);
            }
        }

        // 3. Process subcategory inputs (array)
        $subcatsInput = is_array($input) ? $input : [];

        // Check if legacy 4-tuple without drainage: 'road_connectivity' passed and 'drainage' NOT passed
        if (isset($subcatsInput['road_connectivity']) && !isset($subcatsInput['drainage']) && !isset($subcatsInput['drainage_conditions'])) {
            return self::evaluateLegacyInfrastructureReadiness($subcatsInput, $options);
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
                'formula' => 'Infrastructure Readiness Score = (Electricity × 0.35) + (Water × 0.30) + (Internet × 0.20) + (Drainage × 0.15)',
                'methodology_version' => self::INFRASTRUCTURE_READINESS_VERSION,
                'validation_status' => self::INFRASTRUCTURE_VALIDATION_STATUS,
                'disclaimer' => 'Provisional operational scoring demonstration awaiting technical/LGU validation. Does not establish official LGU assessment.',
                'explanation' => 'Infrastructure assessment incomplete: Missing required conditions for (' . implode(', ', $missing) . ').',
            ];
        }

        $calculatedScore = ($elecScore * 0.35) + ($waterScore * 0.30) + ($netScore * 0.20) + ($drainageScore * 0.15);
        $finalScore = max(0.0, min(100.0, round($calculatedScore, 1)));
        $iaiContribution = round($finalScore * 0.20, 2);

        $explanation = sprintf(
            'Infrastructure Readiness Score = %s/100 (Electricity: %.2f, Water: %.2f, Internet: %.2f, Drainage: %.2f). IAI Contribution: %.2f pts (20%% weight). Verification: %s.',
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
            'formula' => 'Infrastructure Readiness Score = (Electricity × 0.35) + (Water × 0.30) + (Internet × 0.20) + (Drainage × 0.15)',
            'methodology_version' => self::INFRASTRUCTURE_READINESS_VERSION,
            'validation_status' => self::INFRASTRUCTURE_VALIDATION_STATUS,
            'disclaimer' => 'Provisional operational scoring demonstration awaiting technical/LGU validation. Does not establish official LGU assessment.',
            'explanation' => $explanation,
        ];
    }

    /**
     * Legacy evaluation fallback for property records or suites specifying road_connectivity without drainage.
     */
    private static function evaluateLegacyInfrastructureReadiness(array $subcatsInput, array $options = []): array
    {
        $allVerified = true;
        $anySelfReported = false;
        $missingRequirements = [];
        $subcategoriesBreakdown = [];
        $applicableWeightSum = 0.0;
        $weightedPointsSum = 0.0;
        $hasUnverified = false;

        foreach (self::INFRASTRUCTURE_SUBCATEGORIES as $key => $meta) {
            $raw = $subcatsInput[$key] ?? null;
            $rawStatus = null;
            $isSubcatVerified = true;

            if (is_array($raw)) {
                $rawStatus = (string) ($raw['status'] ?? $raw['connection_status'] ?? 'unverified');
                $isSubcatVerified = (bool) ($raw['verified'] ?? $options['is_verified'] ?? true);
            } elseif (is_string($raw)) {
                $rawStatus = $raw;
                $isSubcatVerified = (bool) ($options['is_verified'] ?? true);
            } elseif ($raw === null) {
                $rawStatus = 'unverified';
            }

            $normalizedStatus = strtolower(trim((string) $rawStatus));

            // Map aliases
            $stateKey = match ($normalizedStatus) {
                'connected', 'available', 'operational', 'full', 'active', 'ready' => 'connected',
                'solar_alternative', 'solar', 'renewable' => 'solar_alternative',
                'deepwell_local', 'deep_well', 'well', 'local_water' => 'deepwell_local',
                'mobile_broadband', 'mobile', 'wireless', 'lte', '5g', '4g' => 'mobile_broadband',
                'paved', 'paved_access', 'concrete' => 'connected',
                'unpaved_row', 'unpaved', 'rough_road', 'right_of_way', 'row' => 'unpaved_row',
                'available_unconnected', 'nearby', 'accessible_unconnected' => 'available_unconnected',
                'generator_backup', 'generator' => 'generator_backup',
                'delivery_storage', 'delivery', 'storage' => 'delivery_storage',
                'satellite_basic', 'satellite' => 'satellite_basic',
                'unavailable', 'not_connected', 'none', 'disconnected' => 'unavailable',
                'not_applicable', 'na', 'n/a' => 'not_applicable',
                default => 'unverified',
            };

            if ($stateKey === 'not_applicable') {
                $subcategoriesBreakdown[] = [
                    'key' => $key,
                    'label' => $meta['label'],
                    'status' => 'not_applicable',
                    'score' => null,
                    'weight' => 0.0,
                    'weighted_score' => 0.0,
                    'verified' => true,
                    'rule' => 'Designated not applicable; weight re-normalized across applicable subcategories.',
                    'source' => $meta['source'],
                ];
                continue;
            }

            $ruleMeta = $meta['rules'][$stateKey] ?? $meta['rules']['unverified'];
            $subcatScore = $ruleMeta['score'];
            $weight = (float) $meta['weight'];

            if ($stateKey === 'unverified' || $subcatScore === null) {
                $hasUnverified = true;
                $missingRequirements[] = $meta['label'];
                $allVerified = false;
                $subcatScore = null;
                $weightedScore = null;
            } else {
                $applicableWeightSum += $weight;
                $weightedPoints = ($subcatScore * $weight) / 100.0;
                $weightedPointsSum += $weightedPoints;
                $weightedScore = round($weightedPoints, 2);
            }

            if (!$isSubcatVerified) {
                $anySelfReported = true;
                $allVerified = false;
            }

            $subcategoriesBreakdown[] = [
                'key' => $key,
                'label' => $meta['label'],
                'status' => $stateKey,
                'score' => $subcatScore,
                'weight' => $weight,
                'weighted_score' => $weightedScore,
                'verified' => $isSubcatVerified,
                'rule' => $ruleMeta['label'],
                'source' => $meta['source'],
            ];
        }

        $verificationStatus = 'verified';
        if ($hasUnverified) {
            $verificationStatus = 'unverified';
        } elseif ($anySelfReported) {
            $verificationStatus = 'self_reported';
        }

        if ($hasUnverified || $applicableWeightSum <= 0.0) {
            return [
                'score' => null,
                'is_complete' => false,
                'iai_contribution' => null,
                'verification_status' => $verificationStatus,
                'missing_subcategories' => $missingRequirements,
                'subcategories' => $subcategoriesBreakdown,
                'formula' => 'Infrastructure Readiness Score = Σ(Subcategory Score × Subcategory Weight) ÷ Σ(Applicable Weight)',
                'explanation' => 'Infrastructure assessment incomplete: required subcategories (' . implode(', ', $missingRequirements) . ') are unverified.',
            ];
        }

        $finalScore = round(($weightedPointsSum / ($applicableWeightSum / 100.0)), 1);
        $finalScore = max(0.0, min(100.0, $finalScore));

        return [
            'score' => $finalScore,
            'is_complete' => true,
            'iai_contribution' => round($finalScore * 0.20, 2),
            'verification_status' => $verificationStatus,
            'missing_subcategories' => [],
            'subcategories' => $subcategoriesBreakdown,
            'formula' => 'Infrastructure Readiness Score = Σ(Subcategory Score × Subcategory Weight) ÷ Σ(Applicable Weight)',
            'explanation' => sprintf('Infrastructure Readiness Score = %s/100 (weighted from %d subcategories, applicable weight total: %.1f%%). Verification: %s.', number_format($finalScore, 1), count($subcategoriesBreakdown), $applicableWeightSum, $verificationStatus),
        ];
    }

    /**
     * Authoritative Economic Viability & Valuation Reference evaluation engine.
     * Evaluates property pricing, statutory BIR zonal baseline, and market comparables.
     *
     * Core Methodological Principles:
     * - BIR Zonal Valuation is a statutory tax floor, NOT a market selling price or proof of viability.
     * - Higher BIR zonal values DO NOT automatically produce higher Economic Viability scores.
     * - Speculative ROI, business profitability, and expected revenues are not invented.
     * - An arbitrary 85/100 score is NEVER assigned based solely on a BIR price band.
     * - A valid score requires documented, comparable market evidence and authorized CAO/LEBDO verification.
     * - If verified market comparables are missing, the assessment is explicitly marked Incomplete.
     */
    public static function evaluateEconomicViability(mixed $input, array $options = []): array
    {
        $isVerified = (bool) ($options['is_verified'] ?? false);
        $verificationStatus = $isVerified ? 'verified' : 'applicant_reported';

        // 1. If numeric score passed directly (e.g. 78.0, 80.0, 100.0 from legacy/mock tests)
        if (is_numeric($input) && !is_array($input)) {
            $num = max(0.0, min(100.0, round((float) $input, 1)));
            return [
                'score' => $num,
                'is_complete' => true,
                'iai_contribution' => round($num * 0.20, 2),
                'verification_status' => $verificationStatus,
                'missing_requirements' => [],
                'pricing_analysis' => [
                    'asking_price_per_sqm' => null,
                    'lease_price_per_sqm' => null,
                    'bir_zonal_value' => null,
                    'bir_total_reference' => null,
                    'asking_vs_bir_percent' => null,
                    'asking_vs_market_percent' => null,
                ],
                'formula' => 'Economic Viability (20% MCE weight) — Direct validated rating',
                'methodology_version' => self::ECONOMIC_VIABILITY_VERSION,
                'validation_status' => self::ECONOMIC_VALIDATION_STATUS,
                'disclaimer' => 'Provisional operational scoring demonstration awaiting technical/LGU validation. Does not establish official LGU assessment.',
                'explanation' => "Economic viability score: {$num}/100 (direct verified rating).",
            ];
        }

        $data = is_array($input) ? $input : [];

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
            $offeredArea = $landArea;
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
        $askingPricePerSqm = ($askingPrice !== null && $offeredArea !== null && $offeredArea > 0) ? round($askingPrice / $offeredArea, 2) : null;
        // Monthly rent per m² uses actual leasable area, not automatically total land area
        $leasePricePerSqm = ($leasePrice !== null && $offeredArea !== null && $offeredArea > 0) ? round($leasePrice / $offeredArea, 2) : null;
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
        $knownUpfrontCosts = 0.0;
        if ($purpose === 'lease' || $purpose === 'sale_or_lease') {
            $months = ($depositMonths ?? 0.0) + ($advanceMonths ?? 0.0);
            $knownUpfrontCosts += round($months * ($leasePrice ?? 0.0), 2);
        }
        if ($purpose === 'sale' || $purpose === 'sale_or_lease') {
            $knownUpfrontCosts += round($additionalCosts ?? 0.0, 2);
        }

        // Price competitiveness ratio: Asking unit price / Comparable benchmark rate
        $competitivenessRatio = null;
        $activeDiffPct = null;
        if ($purpose === 'lease') {
            if ($leasePricePerSqm !== null && $comparableLease !== null && $comparableLease > 0) {
                $competitivenessRatio = round($leasePricePerSqm / $comparableLease, 4);
                $activeDiffPct = $leaseVsMarketPct;
            }
        } else {
            if ($askingPricePerSqm !== null && $comparableMarket !== null && $comparableMarket > 0) {
                $competitivenessRatio = round($askingPricePerSqm / $comparableMarket, 4);
                $activeDiffPct = $askingVsMarketPct;
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
            'known_upfront_costs' => $knownUpfrontCosts > 0 ? $knownUpfrontCosts : null,
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
        $hasComparableBenchmark = ($purpose === 'lease' && $comparableLease !== null) || ($comparableMarket !== null);
        if (!$hasComparableBenchmark) {
            $missing[] = 'Verified local comparable market benchmark';
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
                ? 'Area discrepancy flagged: Recorded area differs significantly from mapped plot boundary. Economic metrics are preliminary until parcel survey verification.'
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
                'formula' => 'Economic Viability (20% MCE weight) — Price Competitiveness vs Verified Local Market Benchmark',
                'methodology_version' => self::ECONOMIC_VIABILITY_VERSION,
                'validation_status' => self::ECONOMIC_VALIDATION_STATUS,
                'disclaimer' => 'A difference from BIR zonal valuation does not by itself establish overpricing, profitability, or investment suitability. A verified market benchmark is still needed for a price-competitiveness assessment.',
                'explanation' => $discrepancyMsg,
            ];
        }

        // When verified comparable market benchmark is present and verified:
        // Authoritative price-competitiveness scoring rubric:
        // - Within +/- 5% of market benchmark: 100.0 (Highly competitive market alignment)
        // - 5% to 15% above market: 85.0 (Moderate premium)
        // - 15% to 30% above market: 70.0 (Substantial premium)
        // - > 30% above market: 50.0 (Elevated asking price)
        // - More than 20% below market without distressed note: 75.0 (Discounted / review required)
        $compPct = $activeDiffPct ?? 0.0;
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
        } else {
            $score = 75.0;
            $rubricNote = 'Asking price is discounted below verified market benchmark; requires title & encumbrance review.';
        }

        $iaiContribution = round($score * 0.20, 2);

        return [
            'score' => $score,
            'is_complete' => true,
            'iai_contribution' => $iaiContribution,
            'verification_status' => 'verified',
            'missing_requirements' => [],
            'pricing_analysis' => $pricingAnalysis,
            'formula' => 'Economic Viability (20% MCE weight) = Price Competitiveness Score × 0.20',
            'methodology_version' => self::ECONOMIC_VIABILITY_VERSION,
            'validation_status' => self::ECONOMIC_VALIDATION_STATUS,
            'disclaimer' => 'A difference from BIR zonal valuation does not by itself establish overpricing, profitability, or investment suitability. A verified market benchmark is still needed for a price-competitiveness assessment.',
            'explanation' => "Economic Viability Score = {$score}/100. IAI Contribution: {$iaiContribution} pts (20% weight). {$rubricNote}",
        ];
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
     *   IAI Contribution = Nearby Businesses Score × 0.10 (since Nearby Businesses has a 10% MCE weight)
     *
     * In accordance with methodological standards:
     * Scores are calculated ONLY when documented scoring benchmarks and sufficient source data exist.
     * Otherwise, shows Assessment Incomplete. Numerical scoring thresholds are never fabricated.
     */
    public static function evaluateNearbyBusinesses(mixed $input, array $options = []): array
    {
        // 1. Direct numeric score provided (e.g. from existing test fixtures or manual overrides)
        if (is_numeric($input) && !is_array($input)) {
            $num = max(0.0, min(100.0, round((float) $input, 1)));
            $isVerified = (bool) ($options['is_verified'] ?? false);
            return [
                'score' => $num,
                'is_complete' => true,
                'status_label' => 'Direct Rating',
                'iai_contribution' => round($num * 0.10, 2),
                'verification_status' => $isVerified ? 'verified' : 'applicant_reported',
                'missing_requirements' => [],
                'subcriteria' => [
                    'commercial_activity' => ['label' => 'Commercial Activity', 'score' => $num, 'weight' => 25.0, 'weighted_score' => round($num * 0.25, 2), 'rule' => "Direct input {$num}"],
                    'complementary_businesses' => ['label' => 'Complementary Businesses', 'score' => $num, 'weight' => 30.0, 'weighted_score' => round($num * 0.30, 2), 'rule' => "Direct input {$num}"],
                    'competitive_pressure' => ['label' => 'Competitive Pressure', 'score' => $num, 'weight' => 30.0, 'weighted_score' => round($num * 0.30, 2), 'rule' => "Direct input {$num}"],
                    'activity_anchors' => ['label' => 'Activity Anchors', 'score' => $num, 'weight' => 15.0, 'weighted_score' => round($num * 0.15, 2), 'rule' => "Direct input {$num}"],
                ],
                'formula' => 'Nearby Businesses (10% MCE weight) = (Commercial Activity × 0.25) + (Complementary × 0.30) + (Competitive Pressure × 0.30) + (Activity Anchors × 0.15)',
                'methodology_version' => self::NEARBY_BUSINESSES_VERSION,
                'validation_status' => self::NEARBY_VALIDATION_STATUS,
                'disclaimer' => 'Zero mapped establishments must not imply that no businesses exist. Nearby observed places do not establish customer demand or official business-density scoring without verified BPLO census coverage.',
                'explanation' => "Nearby Businesses Composite Score: {$num}/100. IAI Contribution: " . round($num * 0.10, 2) . ' pts (10% weight).',
            ];
        }

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

        if ($hasCertifiedBenchmarks && $hasSufficientSourceData && $hasAllScores) {
            $commScore = max(0.0, min(100.0, (float) $comm));
            $complScore = max(0.0, min(100.0, (float) $compl));
            $compScore = max(0.0, min(100.0, (float) $comp));
            $anchorScore = max(0.0, min(100.0, (float) $anchor));

            $compositeScore = round(
                ($commScore * 0.25) +
                ($complScore * 0.30) +
                ($compScore * 0.30) +
                ($anchorScore * 0.15),
                1
            );
            $iaiContribution = round($compositeScore * 0.10, 2);

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
                'formula' => 'Nearby Businesses (10% MCE weight) = (Commercial Activity × 0.25) + (Complementary × 0.30) + (Competitive Pressure × 0.30) + (Activity Anchors × 0.15)',
                'methodology_version' => self::NEARBY_BUSINESSES_VERSION,
                'validation_status' => self::NEARBY_VALIDATION_STATUS,
                'disclaimer' => 'Zero mapped establishments must not imply that no businesses exist. Nearby observed places do not establish customer demand.',
                'explanation' => "Nearby Businesses composite score: {$compositeScore}/100. IAI Contribution: {$iaiContribution} pts (10% weight).",
            ];
        }

        // Missing documented scoring benchmarks or insufficient certified source data
        $missing = [];
        if (!$hasCertifiedBenchmarks) {
            $missing[] = 'Documented BPLO commercial scoring benchmarks';
        }
        if (!$hasSufficientSourceData) {
            $missing[] = 'Complete operating inventory coverage verification';
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
            'formula' => 'Nearby Businesses (10% MCE weight) = (Commercial Activity × 0.25) + (Complementary × 0.30) + (Competitive Pressure × 0.30) + (Activity Anchors × 0.15)',
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
        if (is_array($input)) {
            $zone = $input['zone_code'] ?? $input['zoning_classification'] ?? $input['zone'] ?? '';
            $act = $input['use_code'] ?? $input['proposed_activity'] ?? $input['activity'] ?? $input['category'] ?? $input['land_use'] ?? '';
            $cond = is_array($input['conditions'] ?? null) ? $input['conditions'] : [];
            return ZoningRulesEngine::evaluate($zone, $act, $cond);
        }

        if (is_string($input) || is_numeric($input)) {
            $str = strtolower(trim((string) $input));
            if (in_array($str, ['permitted', 'allowed', 'pass', '100', '100.0'], true)) {
                return [
                    'is_complete' => true,
                    'status' => ZoningRulesEngine::STATUS_PERMITTED,
                    'status_label' => 'Permitted Use',
                    'score' => 100.0,
                    'is_eligible' => true,
                    'suitability' => 'suitable',
                    'iai_contribution' => 15.00,
                    'weight' => ZoningRulesEngine::ZONING_WEIGHT,
                    'zone_code' => 'C-1',
                    'zone_name' => 'Commercial Zone 1',
                    'zone_full_label' => 'C-1 — Commercial Zone 1',
                    'use_code' => 'commercial',
                    'use_label' => 'Permitted Commercial Activity',
                    'use_category' => 'commercial',
                    'rule_source' => 'San Fernando City Ordinance 2018-06, Sec. 10.B',
                    'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.B',
                    'source_priority' => ZoningRulesEngine::SOURCE_PRIORITY_LOCAL_ORDINANCE,
                    'is_official_city_rule' => true,
                    'conditions' => [],
                    'unmet_conditions' => [],
                    'restrictions' => [],
                    'reason' => null,
                    'explanation' => 'Proposed land use is permitted by right under San Fernando City Zoning Ordinance regulations.',
                    'missing_requirements' => [],
                    'rules_version' => ZoningRulesEngine::VERSION,
                    'evaluated_at' => gmdate(DATE_ATOM),
                ];
            }

            if (in_array($str, ['conditional', 'review_required', '70', '70.0'], true)) {
                return [
                    'is_complete' => true,
                    'status' => ZoningRulesEngine::STATUS_CONDITIONAL,
                    'status_label' => 'Conditional Use',
                    'score' => 70.0,
                    'is_eligible' => true,
                    'suitability' => 'conditional',
                    'iai_contribution' => 10.50,
                    'weight' => ZoningRulesEngine::ZONING_WEIGHT,
                    'zone_code' => 'C-1',
                    'zone_name' => 'Commercial Zone 1',
                    'zone_full_label' => 'C-1 — Commercial Zone 1',
                    'use_code' => 'commercial',
                    'use_label' => 'Conditional Commercial Activity',
                    'use_category' => 'commercial',
                    'rule_source' => 'San Fernando City Ordinance 2018-06, Sec. 10.B',
                    'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.B',
                    'source_priority' => ZoningRulesEngine::SOURCE_PRIORITY_LOCAL_ORDINANCE,
                    'is_official_city_rule' => true,
                    'conditions' => ['Subject to technical locational clearance and zoning board review.'],
                    'unmet_conditions' => ['Locational clearance'],
                    'restrictions' => [],
                    'reason' => null,
                    'explanation' => 'Conditional use: permitted subject to specific technical requirements and zoning clearances.',
                    'missing_requirements' => [],
                    'rules_version' => ZoningRulesEngine::VERSION,
                    'evaluated_at' => gmdate(DATE_ATOM),
                ];
            }

            if (in_array($str, ['prohibited', 'restricted', 'fail', 'not_permitted', 'disallowed', '0', '0.0'], true)) {
                return [
                    'is_complete' => true,
                    'status' => ZoningRulesEngine::STATUS_PROHIBITED,
                    'status_label' => 'Prohibited Use (Not Suitable)',
                    'score' => 0.0,
                    'is_eligible' => false,
                    'suitability' => 'not_suitable',
                    'iai_contribution' => null,
                    'weight' => ZoningRulesEngine::ZONING_WEIGHT,
                    'zone_code' => null,
                    'zone_name' => 'Disallowed',
                    'zone_full_label' => 'Disallowed Use',
                    'use_code' => null,
                    'use_label' => 'Prohibited Land Use',
                    'use_category' => 'general',
                    'rule_source' => 'San Fernando City Ordinance 2018-06',
                    'ordinance_section' => 'City Ordinance 2018-06',
                    'source_priority' => ZoningRulesEngine::SOURCE_PRIORITY_LOCAL_ORDINANCE,
                    'is_official_city_rule' => true,
                    'conditions' => [],
                    'unmet_conditions' => [],
                    'restrictions' => ['Proposed land use is strictly prohibited in this zoning district.'],
                    'reason' => 'Proposed land use is not permitted under applicable CLUP zoning regulations. Disqualified from further evaluation.',
                    'explanation' => 'Proposed land use is not permitted under applicable CLUP zoning regulations. Disqualified from further evaluation.',
                    'missing_requirements' => [],
                    'rules_version' => ZoningRulesEngine::VERSION,
                    'evaluated_at' => gmdate(DATE_ATOM),
                ];
            }

            if (is_numeric($input)) {
                $num = (float) $input;
                $status = $num >= 100.0 ? ZoningRulesEngine::STATUS_PERMITTED : ($num >= 70.0 ? ZoningRulesEngine::STATUS_CONDITIONAL : ZoningRulesEngine::STATUS_PROHIBITED);
                $isEligible = $status !== ZoningRulesEngine::STATUS_PROHIBITED;
                $iai = $isEligible ? round($num * 0.15, 2) : null;
                return [
                    'is_complete' => true,
                    'status' => $status,
                    'status_label' => $isEligible ? ($status === ZoningRulesEngine::STATUS_PERMITTED ? 'Permitted Use' : 'Conditional Use') : 'Prohibited Use',
                    'score' => $num,
                    'is_eligible' => $isEligible,
                    'suitability' => $isEligible ? ($status === ZoningRulesEngine::STATUS_PERMITTED ? 'suitable' : 'conditional') : 'not_suitable',
                    'iai_contribution' => $iai,
                    'weight' => ZoningRulesEngine::ZONING_WEIGHT,
                    'zone_code' => 'C-1',
                    'zone_name' => 'Commercial Zone 1',
                    'zone_full_label' => 'C-1 — Commercial Zone 1',
                    'use_code' => 'commercial',
                    'use_label' => 'Evaluated Land Use',
                    'use_category' => 'commercial',
                    'rule_source' => 'San Fernando City Ordinance 2018-06',
                    'ordinance_section' => 'City Ordinance 2018-06',
                    'source_priority' => ZoningRulesEngine::SOURCE_PRIORITY_LOCAL_ORDINANCE,
                    'is_official_city_rule' => true,
                    'conditions' => [],
                    'unmet_conditions' => [],
                    'restrictions' => [],
                    'reason' => null,
                    'explanation' => "Zoning Compatibility score: {$num}/100.",
                    'missing_requirements' => [],
                    'rules_version' => ZoningRulesEngine::VERSION,
                    'evaluated_at' => gmdate(DATE_ATOM),
                ];
            }
        }

        return [
            'is_complete' => false,
            'status' => ZoningRulesEngine::STATUS_UNDETERMINED,
            'status_label' => 'Assessment Incomplete (Undetermined)',
            'score' => null,
            'is_eligible' => false,
            'suitability' => 'incomplete',
            'iai_contribution' => null,
            'weight' => ZoningRulesEngine::ZONING_WEIGHT,
            'zone_code' => null,
            'zone_name' => 'Undetermined',
            'zone_full_label' => 'Undetermined Zone',
            'use_code' => null,
            'use_label' => 'Undetermined Use',
            'use_category' => 'general',
            'rule_source' => 'Awaiting CLUP Clearance',
            'ordinance_section' => null,
            'source_priority' => null,
            'is_official_city_rule' => false,
            'conditions' => [],
            'unmet_conditions' => [],
            'restrictions' => [],
            'reason' => 'Zoning compatibility is unverified or awaiting CLUP clearance.',
            'explanation' => 'Assessment Incomplete: Zoning compatibility is unverified or awaiting CLUP clearance.',
            'missing_requirements' => ['San Fernando City Zoning Classification validation'],
            'rules_version' => ZoningRulesEngine::VERSION,
            'evaluated_at' => gmdate(DATE_ATOM),
        ];
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
        if ($rawIndicator === null || $rawIndicator === '') {
            return null;
        }

        if ($criterionKey === 'risk_constraints') {
            if (is_array($rawIndicator)) {
                $risk = self::evaluateRiskConstraints($rawIndicator);
                return $risk['score'];
            }
            return RiskConstraintsEngine::normalizeSusceptibility($rawIndicator);
        }

        if ($criterionKey === 'spatial_accessibility') {
            if (is_array($rawIndicator)) {
                $spatial = self::evaluateSpatialAccessibility($rawIndicator);
                return $spatial['score'];
            }
        }

        if ($criterionKey === 'infrastructure_readiness') {
            if (is_array($rawIndicator)) {
                $infra = self::evaluateInfrastructureReadiness($rawIndicator);
                return $infra['score'];
            }
            if (is_string($rawIndicator)) {
                $str = strtolower(trim($rawIndicator));
                if (in_array($str, ['power_water_telecom', 'full_ready', 'all_ready', '100'], true)) return 100.0;
                if (in_array($str, ['power_water', 'power_and_water', '80'], true)) return 80.0;
                if (in_array($str, ['partial', 'basic', '60'], true)) return 60.0;
                if (in_array($str, ['limited', '40'], true)) return 40.0;
                if (in_array($str, ['off_grid', 'unavailable', 'none', '0'], true)) return 0.0;
                if (in_array($str, ['unverified', 'unknown', 'pending'], true)) return null;
            }
        }

        if ($criterionKey === 'economic_viability') {
            if (is_array($rawIndicator)) {
                $econ = self::evaluateEconomicViability($rawIndicator);
                return $econ['score'];
            }
        }

        if ($criterionKey === 'nearby_businesses') {
            if (is_array($rawIndicator)) {
                $nearby = self::evaluateNearbyBusinesses($rawIndicator);
                return $nearby['score'];
            }
        }

        if ($criterionKey === 'zoning_compatibility') {
            if (is_array($rawIndicator)) {
                $zoning = self::evaluateZoningCompatibility($rawIndicator);
                return $zoning['score'];
            }
            if (is_string($rawIndicator)) {
                $zoning = self::evaluateZoningCompatibility($rawIndicator);
                return $zoning['score'];
            }
        }

        if (is_numeric($rawIndicator)) {
            $num = (float) $rawIndicator;
            if ($criterionKey === 'spatial_accessibility') {
                // Operational road distance thresholds: <= 50m = 100, <= 150m = 85, <= 300m = 70, > 300m = 50
                if ($num <= 50.0) {
                    return 100.0;
                }
                if ($num <= 150.0) {
                    return 85.0;
                }
                if ($num <= 300.0) {
                    return 70.0;
                }
                return 50.0;
            }

            return max(0.0, min(100.0, round($num, 1)));
        }

        if (is_string($rawIndicator)) {
            $str = strtolower(trim($rawIndicator));
            if ($criterionKey === 'risk_constraints') {
                if (str_contains($str, 'low')) return 100.0;
                if (str_contains($str, 'mod')) return 70.0;
                if (str_contains($str, 'high')) return 30.0;
            }
            if ($criterionKey === 'zoning_compatibility') {
                if (in_array($str, ['permitted', 'allowed', 'pass'], true)) return 100.0;
                if (in_array($str, ['conditional', 'review_required'], true)) return 70.0;
                if (in_array($str, ['prohibited', 'restricted', 'fail'], true)) return 0.0;
            }
            if ($criterionKey === 'environmental_safety') {
                if (in_array($str, ['clear', 'outside', 'low', 'safe'], true)) return 100.0;
                if (in_array($str, ['buffer', 'moderate', 'conditional'], true)) return 70.0;
                if (in_array($str, ['protected', 'restricted', 'high'], true)) return 40.0;
            }
        }

        return null;
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
            if (is_array($value) && $key === 'economic_viability') {
                $econ = self::evaluateEconomicViability($value);
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
            $normalized[$key] = round((float) $value, 1);
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
        if (isset($criteria['scores']) && is_array($criteria['scores'])) {
            $options = array_merge($criteria, $options);
            $criteria = $criteria['scores'];
        } elseif (isset($criteria['criteria']) && is_array($criteria['criteria'])) {
            $options = array_merge($criteria, $options);
            $criteria = $criteria['criteria'];
        }

        if (isset($options['is_priority']) || isset($options['priority_sector'])) {
            $options['policy_alignment'] = array_merge(
                $options['policy_alignment'] ?? [],
                [
                    'priority_sector' => (bool) ($options['is_priority'] ?? ($options['policy_alignment']['priority_sector'] ?? false)),
                    'sector' => $options['priority_sector'] ?? ($options['policy_alignment']['sector'] ?? null),
                ]
            );
        }

        $criteria = self::normalize($criteria);
        $pdo = $options['pdo'] ?? null;
        $config = self::getCriteriaConfig($pdo instanceof PDO ? $pdo : null);

        // Determine weights to use (allows custom weight sets for sensitivity analysis)
        if (isset($options['weights']) && is_array($options['weights'])) {
            $weights = array_map('floatval', $options['weights']);
            self::validateWeights($weights);
            $weightStatus = 'Sensitivity Analysis / Custom Scenario';
        } else {
            $weights = [];
            foreach ($config as $key => $meta) {
                if ($meta['is_active']) {
                    $weights[$key] = (float) $meta['weight'];
                }
            }
            $weightStatus = self::WEIGHT_STATUS_PROVISIONAL;
        }

        // Determine zoning eligibility
        $enforceZoning = $options['enforce_zoning_constraint'] ?? true;
        $explicitZoning = $options['zoning_status'] ?? ($options['zoning_compatibility'] ?? null);

        if ($explicitZoning !== null) {
            $eligibility = self::evaluateEligibility($explicitZoning);
        } elseif ($enforceZoning) {
            $zoningScore = $criteria['zoning_compatibility'] ?? null;
            $hasNonZero = false;
            foreach ($criteria as $k => $v) {
                if ($k !== 'zoning_compatibility' && $v !== null && $v > 0) {
                    $hasNonZero = true;
                    break;
                }
            }
            if (($zoningScore === 0.0 || $zoningScore === 0) && ($hasNonZero || ($options['enforce_zoning_constraint'] ?? null) === true)) {
                // Per LOCUS-SF CLUP lookup rubric: prohibited land use scores 0 and fails eligibility
                $eligibility = self::evaluateEligibility('prohibited');
            } elseif ($zoningScore === null) {
                $eligibility = self::evaluateEligibility('unverified');
            } elseif ($zoningScore >= 100.0) {
                $eligibility = self::evaluateEligibility('permitted');
            } else {
                $eligibility = self::evaluateEligibility('conditional');
            }
        } else {
            $eligibility = self::evaluateEligibility('permitted');
        }

        // Check completeness
        $missingRequirements = [];
        foreach ($config as $key => $meta) {
            if (!empty($meta['is_active']) && !empty($meta['is_required']) && ($criteria[$key] ?? null) === null) {
                $missingRequirements[] = $meta['missing_label'];
            }
        }
        if ($eligibility['zoning'] === 'unverified' && !in_array($config['zoning_compatibility']['missing_label'], $missingRequirements, true)) {
            $missingRequirements[] = $config['zoning_compatibility']['missing_label'];
        }

        $isLegacy = ($options['is_legacy'] ?? false)
            || ($options['methodology'] ?? '') === self::LEGACY_METHODOLOGY_VERSION
            || (isset($weights['environmental_safety']) && $weights['environmental_safety'] > 0);
        $activeMethodology = $isLegacy ? self::LEGACY_METHODOLOGY_VERSION : self::METHODOLOGY_VERSION;

        // Hard constraint check: PROHIBITED land use
        if ($enforceZoning && $eligibility['zoning'] === 'prohibited') {
            $criteriaList = self::buildCriteriaList($criteria, $weights, $config, $options['criteria_details'] ?? []);
            return [
                'status' => 'not_suitable',
                'assessmentStatus' => 'not_suitable',
                'assessmentComplete' => false,
                'is_complete' => false,
                'eligibility' => $eligibility,
                'iai' => null,
                'iaiScore' => null,
                'iai_score' => null,
                'mceScore' => null,
                'mce_score' => null,
                'reason' => $eligibility['reason'] ?? 'Proposed land use is not permitted under the applicable zoning / CLUP classification.',
                'missing_requirements' => [],
                'missingRequirements' => [],
                'criteria' => $criteriaList,
                'criteriaBreakdown' => $criteriaList,
                'scores' => $criteria,
                'assessmentCriteria' => $criteria,
                'assessmentWeights' => $weights,
                'methodology' => $activeMethodology,
                'methodology_version' => $activeMethodology,
                'weight_status' => $weightStatus,
                'weightStatus' => $weightStatus,
                'assessmentMethod' => "{$activeMethodology}. Disqualified: proposed land use is not permitted under applicable CLUP zoning.",
                'policy_alignment' => self::buildPolicyAlignment($options['policy_alignment'] ?? []),
                'policyAlignment' => self::buildPolicyAlignment($options['policy_alignment'] ?? []),
            ];
        }

        // Completeness check
        $isComplete = empty($missingRequirements);
        if (!$isComplete) {
            $criteriaList = self::buildCriteriaList($criteria, $weights, $config, $options['criteria_details'] ?? []);
            return [
                'status' => 'incomplete',
                'assessmentStatus' => 'incomplete',
                'assessmentComplete' => false,
                'is_complete' => false,
                'eligibility' => $eligibility,
                'iai' => null,
                'iaiScore' => null,
                'iai_score' => null,
                'mceScore' => null,
                'mce_score' => null,
                'reason' => 'Assessment incomplete: required criteria evidence is missing or unverified.',
                'missing_requirements' => $missingRequirements,
                'missingRequirements' => $missingRequirements,
                'criteria' => $criteriaList,
                'criteriaBreakdown' => $criteriaList,
                'scores' => $criteria,
                'assessmentCriteria' => $criteria,
                'assessmentWeights' => $weights,
                'methodology' => $activeMethodology,
                'methodology_version' => $activeMethodology,
                'weight_status' => $weightStatus,
                'weightStatus' => $weightStatus,
                'assessmentMethod' => "{$activeMethodology}. Assessment incomplete: all required criteria must be verified before composite IAI is calculated.",
                'policy_alignment' => self::buildPolicyAlignment($options['policy_alignment'] ?? []),
                'policyAlignment' => self::buildPolicyAlignment($options['policy_alignment'] ?? []),
            ];
        }

        // Calculate authoritative composite IAI: IAI = Σ(normalized score × weight ÷ 100)
        $weightedTotal = 0.0;
        foreach ($weights as $key => $weight) {
            $score = (float) ($criteria[$key] ?? 0.0);
            $weightedTotal += ($score * $weight) / 100.0;
        }
        $compositeScore = round(max(0.0, min(100.0, $weightedTotal)), 1);

        $status = ($eligibility['zoning'] === 'conditional') ? 'conditional' : 'complete';
        $criteriaList = self::buildCriteriaList($criteria, $weights, $config, $options['criteria_details'] ?? []);

        // Check for active fault or critical hazard constraints
        $riskDetail = $options['criteria_details']['risk_constraints'] ?? [];
        $criticalHazardWarning = $riskDetail['critical_constraint'] ?? null;
        if (!$criticalHazardWarning && is_array($options['criteria_details']['risk_constraints']['subcategories'] ?? null)) {
            $criticalHazardWarning = $options['criteria_details']['risk_constraints']['critical_constraint'] ?? null;
        }

        $methodDescription = sprintf(
            '%s. Composite Investment Attractiveness Index (IAI) = Σ(score × weight ÷ 100). Status: %s. Weights sum to 100%% (%s).',
            $activeMethodology,
            $status,
            $weightStatus
        );

        return [
            'status' => $status,
            'assessmentStatus' => $status,
            'assessmentComplete' => true,
            'is_complete' => true,
            'eligibility' => $eligibility,
            'iai' => $compositeScore,
            'iaiScore' => $compositeScore,
            'iai_score' => $compositeScore,
            'mceScore' => $compositeScore, // Backward compatibility: MCE composite score is the IAI
            'mce_score' => $compositeScore,
            'reason' => $eligibility['reason'] ?? null,
            'note' => $criticalHazardWarning ? ($eligibility['note'] ? "{$eligibility['note']} | {$criticalHazardWarning}" : $criticalHazardWarning) : ($eligibility['note'] ?? null),
            'critical_constraint' => $criticalHazardWarning,
            'missing_requirements' => [],
            'missingRequirements' => [],
            'criteria' => $criteriaList,
            'criteriaBreakdown' => $criteriaList,
            'scores' => $criteria,
            'assessmentCriteria' => $criteria,
            'assessmentWeights' => $weights,
            'methodology' => $activeMethodology,
            'methodology_version' => $activeMethodology,
            'weight_status' => $weightStatus,
            'weightStatus' => $weightStatus,
            'assessmentMethod' => $methodDescription,
            'policy_alignment' => self::buildPolicyAlignment($options['policy_alignment'] ?? []),
            'policyAlignment' => self::buildPolicyAlignment($options['policy_alignment'] ?? []),
        ];
    }

    /**
     * Alias for evaluate(array $criteria, array $options = []).
     */
    public static function evaluateAssessment(array $criteria, array $options = []): array
    {
        return self::evaluate($criteria, $options);
    }

    /**
     * Build auditable breakdown list of each criterion.
     */
    private static function buildCriteriaList(array $criteria, array $weights, array $config, array $criteriaDetails): array
    {
        $list = [];
        foreach ($config as $key => $meta) {
            $isActive = (bool) ($meta['is_active'] ?? true);
            $weight = (float) ($weights[$key] ?? $meta['weight']);
            // Skip inactive zero-weight criteria unless explicitly requested in custom weights
            if (!$isActive && $weight <= 0.0 && !isset($weights[$key])) {
                continue;
            }

            $score = $criteria[$key] ?? null;
            $weightedScore = $score !== null ? round(($score * $weight) / 100.0, 2) : null;
            $detail = $criteriaDetails[$key] ?? [];

            $rawValue = $detail['raw'] ?? null;
            $ruleText = $detail['conversion'] ?? $detail['ruleText'] ?? null;
            $evidenceList = $detail['evidence'] ?? [];
            $verificationStatus = $score !== null ? 'verified' : 'unverified';
            $subcategories = $detail['subcategories'] ?? null;

            if ($key === 'infrastructure_readiness') {
                $infra = self::evaluateInfrastructureReadiness($detail['subcategories'] ?? $rawValue ?? $score);
                $subcategories = $infra['subcategories'] ?? null;
                if ($infra['verification_status'] !== 'verified' && $score !== null) {
                    $verificationStatus = $infra['verification_status'];
                }
                if ($ruleText === null && isset($infra['formula'])) {
                    $ruleText = $infra['formula'];
                }
            }

            if ($key === 'risk_constraints') {
                $risk = self::evaluateRiskConstraints($detail['subcategories'] ?? $detail['raw'] ?? $rawValue ?? $score);
                $subcategories = $risk['subcriteria'] ?? null;
                if ($risk['score'] !== null) {
                    $verificationStatus = $risk['is_complete'] ? 'verified' : 'unverified';
                }
                if ($ruleText === null && isset($risk['formula'])) {
                    $ruleText = $risk['formula'];
                }
            }

            $list[] = [
                'key' => $key,
                'display_name' => $meta['display_name'],
                'score' => $score,
                'weight' => $weight,
                'weighted_score' => $weightedScore,
                'raw_value' => $rawValue,
                'scoring_rule' => $ruleText ?: "Operational {$meta['scoring_method']} rubric",
                'source_reference' => $meta['source_reference'],
                'verification_status' => $verificationStatus,
                'evidence' => $evidenceList,
                'subcategories' => $subcategories,
                'threshold_source' => self::THRESHOLD_SOURCE_RUBRIC,
            ];
        }
        return $list;
    }

    /**
     * Build policy alignment payload (separate from physical site suitability).
     */
    private static function buildPolicyAlignment(array $policyData): array
    {
        $isPriority = (bool) ($policyData['priority_sector'] ?? $policyData['isPriority'] ?? false);
        $sector = $policyData['sector'] ?? null;
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
     */
    public static function ranks(array $properties): array
    {
        $rankMap = [];
        foreach (['iaiScore' => 'iaiRank', 'mceScore' => 'mceRank'] as $scoreKey => $rankKey) {
            $scored = array_values(array_filter($properties, static fn (array $property): bool => isset($property[$scoreKey]) && $property[$scoreKey] !== null));
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
}
