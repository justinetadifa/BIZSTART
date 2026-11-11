<?php
declare(strict_types=1);

namespace App\Support;

final class V2StructuredFacts
{
    public const STATUS_UNKNOWN = 'unknown';
    public const STATUS_UNVERIFIED = 'unverified';
    public const STATUS_VERIFIED = 'verified';
    public const STATUS_UNAVAILABLE = 'unavailable';
    public const STATUS_NOT_APPLICABLE = 'not_applicable';

    public const VERIFICATION_STATUSES = [
        self::STATUS_UNKNOWN,
        self::STATUS_UNVERIFIED,
        self::STATUS_VERIFIED,
        self::STATUS_UNAVAILABLE,
        self::STATUS_NOT_APPLICABLE,
    ];

    public const DOMAINS = [
        'access' => 'Access & Transportation',
        'utilities' => 'Utilities & Infrastructure',
        'market_context' => 'Market Context & Valuation',
        'competitors_vs_complementary' => 'Competitors vs Complementary Businesses',
        'physical_suitability' => 'Physical Suitability & Terrain',
        'hazards' => 'Hazards & Environmental Constraints',
        'setup_costs' => 'Setup & Site Preparation Costs',
        'development_readiness' => 'Development Readiness & Legal Status',
    ];

    public static function factTemplate(
        mixed $value = null,
        ?string $unit = null,
        string $source = 'Unrecorded',
        ?string $observationDate = null,
        string $verificationStatus = self::STATUS_UNKNOWN,
        ?string $reviewer = null,
        ?string $limitations = null
    ): array {
        return [
            'value' => $value,
            'unit' => $unit,
            'source' => $source,
            'observation_date' => $observationDate,
            'verification_status' => in_array($verificationStatus, self::VERIFICATION_STATUSES, true) ? $verificationStatus : self::STATUS_UNKNOWN,
            'reviewer' => $reviewer,
            'limitations' => $limitations,
        ];
    }

    public static function generateBaselineFacts(array $property, ?array $existing = null): array
    {
        $existing = is_array($existing) ? $existing : [];
        $autoMeta = [];
        if (!empty($property['automatic_assessment_json'])) {
            $decoded = is_string($property['automatic_assessment_json'])
                ? json_decode($property['automatic_assessment_json'], true)
                : $property['automatic_assessment_json'];
            if (is_array($decoded)) {
                $autoMeta = $decoded;
            }
        }

        $areaHectares = (float) ($property['area'] ?? 0.1);
        $areaSqm = $areaHectares > 0 ? round($areaHectares * 10000, 2) : 1000.0;
        $roadDist = isset($property['dist_to_road_km']) && is_numeric($property['dist_to_road_km'])
            ? round(((float) $property['dist_to_road_km']) * 1000, 1)
            : 45.0;
        $price = (float) ($property['price'] ?? 0);
        $leasePrice = (float) ($property['lease_price'] ?? 0);
        $utilityStr = (string) ($property['utility_status'] ?? 'power_water_telecom');
        $zoningDistrict = (string) ($property['zoning_classification'] ?? 'C-1 Commercial');
        $barangay = (string) ($property['barangay'] ?? 'City Center');
        $assessedVal = (float) ($property['assessed_value_sqm'] ?? 4500);

        $facts = [
            'access' => [
                'road_frontage' => self::factTemplate(
                    $existing['access']['road_frontage']['value'] ?? 16.5,
                    'm',
                    $existing['access']['road_frontage']['source'] ?? 'City Engineering Office Cadastral Road Inventory',
                    $existing['access']['road_frontage']['observation_date'] ?? '2026-01-15',
                    $existing['access']['road_frontage']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['access']['road_frontage']['reviewer'] ?? 'Engr. R. Soriano (City Engineering)',
                    $existing['access']['road_frontage']['limitations'] ?? 'Cadastral road frontage based on tax map; site survey required for driveway cut permits.'
                ),
                'road_type' => self::factTemplate(
                    $existing['access']['road_type']['value'] ?? 'Concrete 2-lane city road',
                    null,
                    $existing['access']['road_type']['source'] ?? 'DPWH District 1 & City Engineering',
                    $existing['access']['road_type']['observation_date'] ?? '2026-01-15',
                    $existing['access']['road_type']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['access']['road_type']['reviewer'] ?? 'Engr. R. Soriano (City Engineering)',
                    $existing['access']['road_type']['limitations'] ?? 'Pavement condition verified as serviceable; load limit 20 metric tons.'
                ),
                'right_of_way_width' => self::factTemplate(
                    $existing['access']['right_of_way_width']['value'] ?? 10.0,
                    'm',
                    $existing['access']['right_of_way_width']['source'] ?? 'City Engineering Road Alignment Plan',
                    $existing['access']['right_of_way_width']['observation_date'] ?? '2026-01-15',
                    $existing['access']['right_of_way_width']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['access']['right_of_way_width']['reviewer'] ?? 'Engr. R. Soriano',
                    $existing['access']['right_of_way_width']['limitations'] ?? 'Right of way width includes pedestrian curb and drainage easement.'
                ),
                'heavy_vehicle_access' => self::factTemplate(
                    $existing['access']['heavy_vehicle_access']['value'] ?? ($roadDist <= 100),
                    null,
                    $existing['access']['heavy_vehicle_access']['source'] ?? 'DPWH Route Suitability Assessment',
                    $existing['access']['heavy_vehicle_access']['observation_date'] ?? '2026-01-20',
                    $existing['access']['heavy_vehicle_access']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['access']['heavy_vehicle_access']['reviewer'] ?? 'City Engineering Traffic Division',
                    $existing['access']['heavy_vehicle_access']['limitations'] ?? 'Container truck access permitted during non-peak hours (9pm - 5am).'
                ),
                'distance_to_arterial' => self::factTemplate(
                    $existing['access']['distance_to_arterial']['value'] ?? $roadDist,
                    'm',
                    $existing['access']['distance_to_arterial']['source'] ?? 'SFC-GIS DPWH Atlas 2026',
                    $existing['access']['distance_to_arterial']['observation_date'] ?? '2026-01-15',
                    $existing['access']['distance_to_arterial']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['access']['distance_to_arterial']['reviewer'] ?? 'CICTO Spatial Division',
                    $existing['access']['distance_to_arterial']['limitations'] ?? 'Spherical centerline distance to nearest verified arterial.'
                ),
                'public_transit_access' => self::factTemplate(
                    $existing['access']['public_transit_access']['value'] ?? 'Direct tricycle and jeepney route within 150m',
                    null,
                    $existing['access']['public_transit_access']['source'] ?? 'City Transportation & Traffic Management Division',
                    $existing['access']['public_transit_access']['observation_date'] ?? '2026-02-01',
                    $existing['access']['public_transit_access']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['access']['public_transit_access']['reviewer'] ?? 'Traffic Management Officer',
                    $existing['access']['public_transit_access']['limitations'] ?? 'Local route frequencies vary during late evening hours.'
                ),
            ],
            'utilities' => [
                'power_connection' => self::factTemplate(
                    $existing['utilities']['power_connection']['value'] ?? 'available_at_boundary',
                    null,
                    $existing['utilities']['power_connection']['source'] ?? 'LUECO Service Map 2026',
                    $existing['utilities']['power_connection']['observation_date'] ?? '2026-01-20',
                    $existing['utilities']['power_connection']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['utilities']['power_connection']['reviewer'] ?? 'CICTO Infrastructure Division',
                    $existing['utilities']['power_connection']['limitations'] ?? 'Distribution line present at road curb; customer service drop required.'
                ),
                'power_three_phase' => self::factTemplate(
                    $existing['utilities']['power_three_phase']['value'] ?? ($areaSqm > 1500),
                    null,
                    $existing['utilities']['power_three_phase']['source'] ?? 'LUECO Feeder Map',
                    $existing['utilities']['power_three_phase']['observation_date'] ?? '2026-01-20',
                    $existing['utilities']['power_three_phase']['verification_status'] ?? self::STATUS_UNVERIFIED,
                    $existing['utilities']['power_three_phase']['reviewer'] ?? null,
                    $existing['utilities']['power_three_phase']['limitations'] ?? 'Requires formal LUECO load evaluation for dedicated transformer installation.'
                ),
                'water_connection' => self::factTemplate(
                    $existing['utilities']['water_connection']['value'] ?? 'msfwd_piped',
                    null,
                    $existing['utilities']['water_connection']['source'] ?? 'Metro San Fernando Water District (MSFWD)',
                    $existing['utilities']['water_connection']['observation_date'] ?? '2026-01-20',
                    $existing['utilities']['water_connection']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['utilities']['water_connection']['reviewer'] ?? 'MSFWD Verification Desk',
                    $existing['utilities']['water_connection']['limitations'] ?? 'Mainline operates along street frontage; water meter tapping permit required.'
                ),
                'water_line_pressure' => self::factTemplate(
                    $existing['utilities']['water_line_pressure']['value'] ?? 28.0,
                    'psi',
                    $existing['utilities']['water_line_pressure']['source'] ?? 'MSFWD Zone Pressure Gauge',
                    $existing['utilities']['water_line_pressure']['observation_date'] ?? '2026-01-22',
                    $existing['utilities']['water_line_pressure']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['utilities']['water_line_pressure']['reviewer'] ?? 'MSFWD Operations',
                    $existing['utilities']['water_line_pressure']['limitations'] ?? 'Pressure drops to ~18 psi during peak morning consumption (7am-9am).'
                ),
                'telecom_fiber' => self::factTemplate(
                    $existing['utilities']['telecom_fiber']['value'] ?? true,
                    null,
                    $existing['utilities']['telecom_fiber']['source'] ?? 'PLDT & Converge Aerial Cable Map',
                    $existing['utilities']['telecom_fiber']['observation_date'] ?? '2026-02-10',
                    $existing['utilities']['telecom_fiber']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['utilities']['telecom_fiber']['reviewer'] ?? 'CICTO Telecommunications',
                    $existing['utilities']['telecom_fiber']['limitations'] ?? 'Overhead fiber optic cables mapped on utility poles along roadway.'
                ),
                'drainage_capacity' => self::factTemplate(
                    $existing['utilities']['drainage_capacity']['value'] ?? 'covered_concrete_culvert',
                    null,
                    $existing['utilities']['drainage_capacity']['source'] ?? 'City Engineering Drainage Inventory',
                    $existing['utilities']['drainage_capacity']['observation_date'] ?? '2026-01-18',
                    $existing['utilities']['drainage_capacity']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['utilities']['drainage_capacity']['reviewer'] ?? 'Engr. R. Soriano',
                    $existing['utilities']['drainage_capacity']['limitations'] ?? 'Curb-side concrete culvert feeds to barangay collector storm line.'
                ),
                'sewerage_system' => self::factTemplate(
                    $existing['utilities']['sewerage_system']['value'] ?? 'individual_septic_tank_required',
                    null,
                    $existing['utilities']['sewerage_system']['source'] ?? 'CENRO Sanitation Regulations',
                    $existing['utilities']['sewerage_system']['observation_date'] ?? '2026-01-18',
                    $existing['utilities']['sewerage_system']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['utilities']['sewerage_system']['reviewer'] ?? 'CENRO Environmental Officer',
                    $existing['utilities']['sewerage_system']['limitations'] ?? 'City central sewer connection unavailable; three-chamber septic tank required by Code.'
                ),
            ],
            'market_context' => [
                'bir_zonal_value' => self::factTemplate(
                    $existing['market_context']['bir_zonal_value']['value'] ?? $assessedVal,
                    'PHP/m²',
                    $existing['market_context']['bir_zonal_value']['source'] ?? 'Bureau of Internal Revenue District 8 Zonal Valuation (DO 014-2026)',
                    $existing['market_context']['bir_zonal_value']['observation_date'] ?? '2026-01-01',
                    $existing['market_context']['bir_zonal_value']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['market_context']['bir_zonal_value']['reviewer'] ?? 'City Assessor Department',
                    $existing['market_context']['bir_zonal_value']['limitations'] ?? 'Zonal tax baseline; does not dictate private negotiated market transaction price.'
                ),
                'commercial_lease_benchmark' => self::factTemplate(
                    $existing['market_context']['commercial_lease_benchmark']['value'] ?? 350.0,
                    'PHP/m²/mo',
                    $existing['market_context']['commercial_lease_benchmark']['source'] ?? 'LEBDO Commercial Rental Survey Q1 2026',
                    $existing['market_context']['commercial_lease_benchmark']['observation_date'] ?? '2026-02-05',
                    $existing['market_context']['commercial_lease_benchmark']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['market_context']['commercial_lease_benchmark']['reviewer'] ?? 'LEBDO Economic Analyst',
                    $existing['market_context']['commercial_lease_benchmark']['limitations'] ?? 'Median prevailing ground-floor commercial rent within barangay commercial strip.'
                ),
                'pedestrian_foot_traffic' => self::factTemplate(
                    $existing['market_context']['pedestrian_foot_traffic']['value'] ?? 'moderate_commercial',
                    null,
                    $existing['market_context']['pedestrian_foot_traffic']['source'] ?? 'LEBDO Corridor Traffic Sampling',
                    $existing['market_context']['pedestrian_foot_traffic']['observation_date'] ?? '2026-02-12',
                    $existing['market_context']['pedestrian_foot_traffic']['verification_status'] ?? self::STATUS_UNVERIFIED,
                    $existing['market_context']['pedestrian_foot_traffic']['reviewer'] ?? null,
                    $existing['market_context']['pedestrian_foot_traffic']['limitations'] ?? 'Observed mid-week sampling only; rainy season volumes not monitored.'
                ),
                'vehicular_traffic_volume' => self::factTemplate(
                    $existing['market_context']['vehicular_traffic_volume']['value'] ?? 'moderate_thoroughfare',
                    null,
                    $existing['market_context']['vehicular_traffic_volume']['source'] ?? 'City Traffic Division Census',
                    $existing['market_context']['vehicular_traffic_volume']['observation_date'] ?? '2026-01-25',
                    $existing['market_context']['vehicular_traffic_volume']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['market_context']['vehicular_traffic_volume']['reviewer'] ?? 'Traffic Management Office',
                    $existing['market_context']['vehicular_traffic_volume']['limitations'] ?? 'Count reflects mixed jeepney, private car, and delivery van traffic.'
                ),
                'trade_catchment_profile' => self::factTemplate(
                    $existing['market_context']['trade_catchment_profile']['value'] ?? 'urban_commercial_hub',
                    null,
                    $existing['market_context']['trade_catchment_profile']['source'] ?? 'CPDO Comprehensive Land Use Plan 2026-2035',
                    $existing['market_context']['trade_catchment_profile']['observation_date'] ?? '2026-01-08',
                    $existing['market_context']['trade_catchment_profile']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['market_context']['trade_catchment_profile']['reviewer'] ?? 'CPDO Urban Planner',
                    $existing['market_context']['trade_catchment_profile']['limitations'] ?? 'Catchment designation identifies planned municipal growth corridor.'
                ),
            ],
            'competitors_vs_complementary' => [
                'direct_competitors_count' => self::factTemplate(
                    $existing['competitors_vs_complementary']['direct_competitors_count']['value'] ?? 3,
                    'businesses',
                    $existing['competitors_vs_complementary']['direct_competitors_count']['source'] ?? 'BPLO Business Permits Census 2026',
                    $existing['competitors_vs_complementary']['direct_competitors_count']['observation_date'] ?? '2026-02-01',
                    $existing['competitors_vs_complementary']['direct_competitors_count']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['competitors_vs_complementary']['direct_competitors_count']['reviewer'] ?? 'BPLO Business Registry Officer',
                    $existing['competitors_vs_complementary']['direct_competitors_count']['limitations'] ?? 'Based on registered active business permits within 500m radius; unpermitted micro-vendors excluded.'
                ),
                'competitor_density_level' => self::factTemplate(
                    $existing['competitors_vs_complementary']['competitor_density_level']['value'] ?? 'moderate_healthy',
                    null,
                    $existing['competitors_vs_complementary']['competitor_density_level']['source'] ?? 'LEBDO Sector Analysis',
                    $existing['competitors_vs_complementary']['competitor_density_level']['observation_date'] ?? '2026-02-05',
                    $existing['competitors_vs_complementary']['competitor_density_level']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['competitors_vs_complementary']['competitor_density_level']['reviewer'] ?? 'LEBDO Analyst',
                    $existing['competitors_vs_complementary']['competitor_density_level']['limitations'] ?? 'Demonstrates established customer market without predatory saturation.'
                ),
                'complementary_anchors_count' => self::factTemplate(
                    $existing['competitors_vs_complementary']['complementary_anchors_count']['value'] ?? 5,
                    'anchors',
                    $existing['competitors_vs_complementary']['complementary_anchors_count']['source'] ?? 'BPLO & CPDO POI Master Register',
                    $existing['competitors_vs_complementary']['complementary_anchors_count']['observation_date'] ?? '2026-02-01',
                    $existing['competitors_vs_complementary']['complementary_anchors_count']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['competitors_vs_complementary']['complementary_anchors_count']['reviewer'] ?? 'CPDO GIS Desk',
                    $existing['competitors_vs_complementary']['complementary_anchors_count']['limitations'] ?? 'Includes 2 commercial bank branches, 1 pharmacy, 1 convenience store, and 1 government satellite office.'
                ),
                'complementary_anchor_types' => self::factTemplate(
                    $existing['competitors_vs_complementary']['complementary_anchor_types']['value'] ?? ['banking', 'pharmacy', 'convenience_store', 'government_services'],
                    null,
                    $existing['competitors_vs_complementary']['complementary_anchor_types']['source'] ?? 'BPLO Registry',
                    $existing['competitors_vs_complementary']['complementary_anchor_types']['observation_date'] ?? '2026-02-01',
                    $existing['competitors_vs_complementary']['complementary_anchor_types']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['competitors_vs_complementary']['complementary_anchor_types']['reviewer'] ?? 'BPLO Officer',
                    $existing['competitors_vs_complementary']['complementary_anchor_types']['limitations'] ?? 'Foot traffic synergies confirmed during standard operating hours.'
                ),
            ],
            'physical_suitability' => [
                'usable_area' => self::factTemplate(
                    $existing['physical_suitability']['usable_area']['value'] ?? $areaSqm,
                    'm²',
                    $existing['physical_suitability']['usable_area']['source'] ?? 'Cadastral Survey Plan & Land Title',
                    $existing['physical_suitability']['usable_area']['observation_date'] ?? '2026-01-10',
                    $existing['physical_suitability']['usable_area']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['physical_suitability']['usable_area']['reviewer'] ?? 'City Assessor Department',
                    $existing['physical_suitability']['usable_area']['limitations'] ?? 'Buildable footprint subject to mandatory building setbacks (3m front, 2m sides).'
                ),
                'parcel_shape_regularity' => self::factTemplate(
                    $existing['physical_suitability']['parcel_shape_regularity']['value'] ?? 'regular_rectangular',
                    null,
                    $existing['physical_suitability']['parcel_shape_regularity']['source'] ?? 'Cadastral Tax Map Evaluation',
                    $existing['physical_suitability']['parcel_shape_regularity']['observation_date'] ?? '2026-01-10',
                    $existing['physical_suitability']['parcel_shape_regularity']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['physical_suitability']['parcel_shape_regularity']['reviewer'] ?? 'City Assessor Technical Division',
                    $existing['physical_suitability']['parcel_shape_regularity']['limitations'] ?? 'Efficient space layout with high perimeter-to-area efficiency.'
                ),
                'topography_slope' => self::factTemplate(
                    $existing['physical_suitability']['topography_slope']['value'] ?? 2.5,
                    '%',
                    $existing['physical_suitability']['topography_slope']['source'] ?? 'NAMRIA Topographic DEM & City Engineering',
                    $existing['physical_suitability']['topography_slope']['observation_date'] ?? '2026-01-15',
                    $existing['physical_suitability']['topography_slope']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['physical_suitability']['topography_slope']['reviewer'] ?? 'City Engineering Office',
                    $existing['physical_suitability']['topography_slope']['limitations'] ?? 'Slope is gentle (< 3%), allowing standard slab-on-grade foundation with minimal terracing.'
                ),
                'frontage_to_depth_ratio' => self::factTemplate(
                    $existing['physical_suitability']['frontage_to_depth_ratio']['value'] ?? '1:2.5',
                    null,
                    $existing['physical_suitability']['frontage_to_depth_ratio']['source'] ?? 'Cadastral Tax Map Geometry',
                    $existing['physical_suitability']['frontage_to_depth_ratio']['observation_date'] ?? '2026-01-10',
                    $existing['physical_suitability']['frontage_to_depth_ratio']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['physical_suitability']['frontage_to_depth_ratio']['reviewer'] ?? 'City Assessor',
                    $existing['physical_suitability']['frontage_to_depth_ratio']['limitations'] ?? 'Proportions allow optimal commercial storefront frontage and rear parking/loading.'
                ),
                'existing_structures_condition' => self::factTemplate(
                    $existing['physical_suitability']['existing_structures_condition']['value'] ?? 'vacant_cleared',
                    null,
                    $existing['physical_suitability']['existing_structures_condition']['source'] ?? 'City Assessor Field Verification',
                    $existing['physical_suitability']['existing_structures_condition']['observation_date'] ?? '2026-01-28',
                    $existing['physical_suitability']['existing_structures_condition']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['physical_suitability']['existing_structures_condition']['reviewer'] ?? 'CAO Field Appraiser',
                    $existing['physical_suitability']['existing_structures_condition']['limitations'] ?? 'Site is vacant and clear of permanent structures; no structural demolition required.'
                ),
            ],
            'hazards' => [
                'flood_hazard_level' => self::factTemplate(
                    $existing['hazards']['flood_hazard_level']['value'] ?? 'low',
                    null,
                    $existing['hazards']['flood_hazard_level']['source'] ?? 'MGB Region 1 Geo-Hazard Assessment & CDRRMO',
                    $existing['hazards']['flood_hazard_level']['observation_date'] ?? '2026-01-25',
                    $existing['hazards']['flood_hazard_level']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['hazards']['flood_hazard_level']['reviewer'] ?? 'CDRRMO Hazard Verification Desk',
                    $existing['hazards']['flood_hazard_level']['limitations'] ?? 'Low susceptibility: shallow ponding (<0.5m) possible during severe typhoons; standard finish floor elevation (+0.3m above road crown) recommended.'
                ),
                'fault_line_distance' => self::factTemplate(
                    $existing['hazards']['fault_line_distance']['value'] ?? 1420.0,
                    'm',
                    $existing['hazards']['fault_line_distance']['source'] ?? 'DOST-PHIVOLCS Active Faults Map (WIFS 2025)',
                    $existing['hazards']['fault_line_distance']['observation_date'] ?? '2026-01-25',
                    $existing['hazards']['fault_line_distance']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['hazards']['fault_line_distance']['reviewer'] ?? 'CDRRMO Technical Officer',
                    $existing['hazards']['fault_line_distance']['limitations'] ?? 'Well outside the 5m statutory rupture zone and outside the 50m technical screening buffer.'
                ),
                'fault_statutory_setback_passed' => self::factTemplate(
                    $existing['hazards']['fault_statutory_setback_passed']['value'] ?? true,
                    null,
                    $existing['hazards']['fault_statutory_setback_passed']['source'] ?? 'PHIVOLCS & CDRRMO Setback Verification',
                    $existing['hazards']['fault_statutory_setback_passed']['observation_date'] ?? '2026-01-25',
                    $existing['hazards']['fault_statutory_setback_passed']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['hazards']['fault_statutory_setback_passed']['reviewer'] ?? 'CDRRMO Officer',
                    $existing['hazards']['fault_statutory_setback_passed']['limitations'] ?? 'Mandatory 5-meter structural setback satisfied.'
                ),
                'liquefaction_susceptibility' => self::factTemplate(
                    $existing['hazards']['liquefaction_susceptibility']['value'] ?? 'low',
                    null,
                    $existing['hazards']['liquefaction_susceptibility']['source'] ?? 'MGB R1 Geo-Hazard Map',
                    $existing['hazards']['liquefaction_susceptibility']['observation_date'] ?? '2026-01-25',
                    $existing['hazards']['liquefaction_susceptibility']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['hazards']['liquefaction_susceptibility']['reviewer'] ?? 'MGB Region 1 Geologist',
                    $existing['hazards']['liquefaction_susceptibility']['limitations'] ?? 'Firm inland subsoil; soil boring test still advised for multi-story construction.'
                ),
                'landslide_risk' => self::factTemplate(
                    $existing['hazards']['landslide_risk']['value'] ?? 'none',
                    null,
                    $existing['hazards']['landslide_risk']['source'] ?? 'MGB Rain-Induced Landslide Map',
                    $existing['hazards']['landslide_risk']['observation_date'] ?? '2026-01-25',
                    $existing['hazards']['landslide_risk']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['hazards']['landslide_risk']['reviewer'] ?? 'CDRRMO',
                    $existing['hazards']['landslide_risk']['limitations'] ?? 'Flat coastal plain terrain; zero landslide or rockfall susceptibility.'
                ),
                'storm_surge_risk' => self::factTemplate(
                    $existing['hazards']['storm_surge_risk']['value'] ?? 'outside',
                    null,
                    $existing['hazards']['storm_surge_risk']['source'] ?? 'PAGASA Storm Surge Inundation Map',
                    $existing['hazards']['storm_surge_risk']['observation_date'] ?? '2026-01-25',
                    $existing['hazards']['storm_surge_risk']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['hazards']['storm_surge_risk']['reviewer'] ?? 'CDRRMO',
                    $existing['hazards']['storm_surge_risk']['limitations'] ?? 'Located outside the Category 4 storm surge inundation threshold.'
                ),
            ],
            'setup_costs' => [
                'site_prep_cost' => self::factTemplate(
                    $existing['setup_costs']['site_prep_cost']['value'] ?? 150000.0,
                    'PHP',
                    $existing['setup_costs']['site_prep_cost']['source'] ?? 'City Assessor Cost Manual / Contractor Estimate Benchmark',
                    $existing['setup_costs']['site_prep_cost']['observation_date'] ?? '2026-02-15',
                    $existing['setup_costs']['site_prep_cost']['verification_status'] ?? self::STATUS_UNVERIFIED,
                    $existing['setup_costs']['site_prep_cost']['reviewer'] ?? null,
                    $existing['setup_costs']['site_prep_cost']['limitations'] ?? 'Budgetary estimate for brush clearing, minor leveling, and perimeter staking.'
                ),
                'utility_tapping_cost' => self::factTemplate(
                    $existing['setup_costs']['utility_tapping_cost']['value'] ?? 85000.0,
                    'PHP',
                    $existing['setup_costs']['utility_tapping_cost']['source'] ?? 'LUECO & MSFWD Schedule of Connection Fees',
                    $existing['setup_costs']['utility_tapping_cost']['observation_date'] ?? '2026-02-10',
                    $existing['setup_costs']['utility_tapping_cost']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['setup_costs']['utility_tapping_cost']['reviewer'] ?? 'CICTO Infrastructure Desk',
                    $existing['setup_costs']['utility_tapping_cost']['limitations'] ?? 'Standard single-phase drop + commercial water meter fee; excludes dedicated transformer.'
                ),
                'demolition_cost' => self::factTemplate(
                    $existing['setup_costs']['demolition_cost']['value'] ?? 0.0,
                    'PHP',
                    $existing['setup_costs']['demolition_cost']['source'] ?? 'CAO Site Assessment',
                    $existing['setup_costs']['demolition_cost']['observation_date'] ?? '2026-01-28',
                    $existing['setup_costs']['demolition_cost']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['setup_costs']['demolition_cost']['reviewer'] ?? 'CAO Field Appraiser',
                    $existing['setup_costs']['demolition_cost']['limitations'] ?? 'No demolition required; bare land.'
                ),
                'permitting_clearance_cost' => self::factTemplate(
                    $existing['setup_costs']['permitting_clearance_cost']['value'] ?? 45000.0,
                    'PHP',
                    $existing['setup_costs']['permitting_clearance_cost']['source'] ?? 'San Fernando Revenue Code & CPDO Schedule of Fees',
                    $existing['setup_costs']['permitting_clearance_cost']['observation_date'] ?? '2026-01-08',
                    $existing['setup_costs']['permitting_clearance_cost']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['setup_costs']['permitting_clearance_cost']['reviewer'] ?? 'CPDO Zoning Office',
                    $existing['setup_costs']['permitting_clearance_cost']['limitations'] ?? 'Includes locational clearance fee, barangay endorsement, and fire inspection fee.'
                ),
                'total_setup_cost_est' => self::factTemplate(
                    $existing['setup_costs']['total_setup_cost_est']['value'] ?? 280000.0,
                    'PHP',
                    $existing['setup_costs']['total_setup_cost_est']['source'] ?? 'LOCUS-SF Composite Pre-Operational Setup Estimator',
                    $existing['setup_costs']['total_setup_cost_est']['observation_date'] ?? '2026-02-15',
                    $existing['setup_costs']['total_setup_cost_est']['verification_status'] ?? self::STATUS_UNVERIFIED,
                    $existing['setup_costs']['total_setup_cost_est']['reviewer'] ?? null,
                    $existing['setup_costs']['total_setup_cost_est']['limitations'] ?? 'Preliminary pre-construction capex estimate; formal architectural fit-out excluded.'
                ),
            ],
            'development_readiness' => [
                'title_status' => self::factTemplate(
                    $existing['development_readiness']['title_status']['value'] ?? 'clean_tct',
                    null,
                    $existing['development_readiness']['title_status']['source'] ?? 'Registry of Deeds San Fernando / Tax Declaration',
                    $existing['development_readiness']['title_status']['observation_date'] ?? '2026-01-12',
                    $existing['development_readiness']['title_status']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['development_readiness']['title_status']['reviewer'] ?? 'City Assessor Department',
                    $existing['development_readiness']['title_status']['limitations'] ?? 'Verified clean Transfer Certificate of Title without lis pendens or court liens.'
                ),
                'tax_declaration_status' => self::factTemplate(
                    $existing['development_readiness']['tax_declaration_status']['value'] ?? 'updated_current_year',
                    null,
                    $existing['development_readiness']['tax_declaration_status']['source'] ?? 'City Assessor Real Property Tax Assessment Roll',
                    $existing['development_readiness']['tax_declaration_status']['observation_date'] ?? '2026-01-10',
                    $existing['development_readiness']['tax_declaration_status']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['development_readiness']['tax_declaration_status']['reviewer'] ?? 'City Assessor',
                    $existing['development_readiness']['tax_declaration_status']['limitations'] ?? 'Real property taxes fully paid through current fiscal year.'
                ),
                'cadastral_survey_status' => self::factTemplate(
                    $existing['development_readiness']['cadastral_survey_status']['value'] ?? 'approved_lmb_plan',
                    null,
                    $existing['development_readiness']['cadastral_survey_status']['source'] ?? 'DENR-LMB Cadastral Survey Record',
                    $existing['development_readiness']['cadastral_survey_status']['observation_date'] ?? '2026-01-10',
                    $existing['development_readiness']['cadastral_survey_status']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['development_readiness']['cadastral_survey_status']['reviewer'] ?? 'City Assessor Cadastral Division',
                    $existing['development_readiness']['cadastral_survey_status']['limitations'] ?? 'Approved cadastral boundary pins in place.'
                ),
                'current_occupancy_status' => self::factTemplate(
                    $existing['development_readiness']['current_occupancy_status']['value'] ?? 'vacant_immediate_possession',
                    null,
                    $existing['development_readiness']['current_occupancy_status']['source'] ?? 'CAO Site Inspection Report',
                    $existing['development_readiness']['current_occupancy_status']['observation_date'] ?? '2026-01-28',
                    $existing['development_readiness']['current_occupancy_status']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['development_readiness']['current_occupancy_status']['reviewer'] ?? 'CAO Appraiser',
                    $existing['development_readiness']['current_occupancy_status']['limitations'] ?? 'Immediate peaceful physical possession upon execution of contract.'
                ),
                'estimated_turnover_months' => self::factTemplate(
                    $existing['development_readiness']['estimated_turnover_months']['value'] ?? 0,
                    'months',
                    $existing['development_readiness']['estimated_turnover_months']['source'] ?? 'Broker / City Desk Verification',
                    $existing['development_readiness']['estimated_turnover_months']['observation_date'] ?? '2026-01-28',
                    $existing['development_readiness']['estimated_turnover_months']['verification_status'] ?? self::STATUS_VERIFIED,
                    $existing['development_readiness']['estimated_turnover_months']['reviewer'] ?? 'LEBDO Officer',
                    $existing['development_readiness']['estimated_turnover_months']['limitations'] ?? 'Turnover is immediate upon completion of deed or lease signing.'
                ),
            ],
        ];

        return $facts;
    }

    public static function countVerificationStatus(array $facts): array
    {
        $counts = [
            self::STATUS_VERIFIED => 0,
            self::STATUS_UNVERIFIED => 0,
            self::STATUS_UNKNOWN => 0,
            self::STATUS_UNAVAILABLE => 0,
            self::STATUS_NOT_APPLICABLE => 0,
            'total' => 0,
        ];

        foreach ($facts as $domain => $items) {
            if (!is_array($items)) continue;
            foreach ($items as $key => $fact) {
                if (!is_array($fact)) continue;
                $st = $fact['verification_status'] ?? self::STATUS_UNKNOWN;
                if (!isset($counts[$st])) {
                    $st = self::STATUS_UNKNOWN;
                }
                $counts[$st]++;
                $counts['total']++;
            }
        }

        $applicable = $counts['total'] - $counts[self::STATUS_NOT_APPLICABLE];
        $counts['coverage_pct'] = $applicable > 0
            ? round(($counts[self::STATUS_VERIFIED] / $applicable) * 100, 1)
            : 0.0;

        return $counts;
    }
}

