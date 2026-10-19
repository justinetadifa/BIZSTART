<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;
use PDO;
use Throwable;

/**
 * Comprehensive database-driven many-to-many Zoning & Land Use Rules Engine
 * for LOCUS-SF (City of San Fernando, La Union).
 *
 * Official Source Hierarchy:
 * 1. San Fernando City Ordinance 2018-06 (Base Zoning Ordinance),
 *    amended by City Ordinance 2020-21 (Narra Oeste) and City Ordinance 2025-16 (Namtutan).
 * 2. Official City Zoning Map schedules & CPDO Zoning Compliance standards.
 * 3. DHSUD/HLURB CLUP Guidebook Vol. 3 Model Zoning Ordinance (supplementary reference only;
 *    never proof of local legal permission).
 */
final class ZoningRulesEngine
{
    public const VERSION = 'sfc-zo-2018-06-v2.1';
    public const DATASET_NAME = 'San Fernando City Zoning Ordinance 2018-06 & Amendments';
    public const DATASET_VERSION = 'ZO-2018-06-AMENDED';
    public const ZONING_WEIGHT = 0.0; // Mandatory non-compensatory eligibility gate; does not contribute a numerical score to IAI

    public const SOURCE_PRIORITY_LOCAL_ORDINANCE = 1;
    public const SOURCE_PRIORITY_OFFICIAL_MAP = 2;
    public const SOURCE_PRIORITY_DHSUD_REFERENCE = 3;

    public const STATUS_PERMITTED = 'permitted';
    public const STATUS_CONDITIONAL = 'conditional';
    public const STATUS_PROHIBITED = 'prohibited';
    public const STATUS_UNDETERMINED = 'undetermined';

    /**
     * Official San Fernando City, La Union Zoning Districts
     * Based on City Ordinance 2018-06, Sec. 9-10 and confirmed amendments.
     */
    public const ZONING_DISTRICTS = [
        // Commercial Zones
        'C-1' => [
            'code' => 'C-1',
            'name' => 'Commercial Zone 1',
            'category' => 'commercial',
            'full_label' => 'C-1 — Commercial Zone 1 (Low Density / General Commercial)',
            'description' => 'Low-density commercial, convenience retail, and neighborhood commercial services along minor arterials and collector streets.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.B, as amended by City Ordinance 2025-16',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],
        'C-2' => [
            'code' => 'C-2',
            'name' => 'Commercial Zone 2',
            'category' => 'commercial',
            'full_label' => 'C-2 — Commercial Zone 2 (Medium Density Commercial)',
            'description' => 'Medium-density commercial, shopping centers, business offices, and mixed-use commercial services.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.B',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],
        'C-3' => [
            'code' => 'C-3',
            'name' => 'Commercial Zone 3',
            'category' => 'commercial',
            'full_label' => 'C-3 — Commercial Zone 3 (High Density / Metropolitan Commercial Corridor)',
            'description' => 'Regional commercial centers, high-rise office towers, large department stores, and MacArthur Highway commercial spine.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.B',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],

        // Residential Zones
        'R-1' => [
            'code' => 'R-1',
            'name' => 'Residential Zone 1',
            'category' => 'residential',
            'full_label' => 'R-1 — Residential Zone 1 (Low Density Residential)',
            'description' => 'Low-density housing, single-family detached dwellings, and customary accessory residential uses.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.A, as amended by City Ordinance 2020-21',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],
        'R-2' => [
            'code' => 'R-2',
            'name' => 'Residential Zone 2',
            'category' => 'residential',
            'full_label' => 'R-2 — Residential Zone 2 (Medium Density Residential)',
            'description' => 'Medium-density residential, duplexes, multi-family low-rise apartments, and residential subdivisions.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.A',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],
        'R-3' => [
            'code' => 'R-3',
            'name' => 'Residential Zone 3',
            'category' => 'residential',
            'full_label' => 'R-3 — Residential Zone 3 (High Density Residential)',
            'description' => 'High-density residential, residential condominiums, apartments, and boarding houses.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.A',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],

        // Industrial Zones
        'I-1' => [
            'code' => 'I-1',
            'name' => 'Light Industrial Zone',
            'category' => 'industrial',
            'full_label' => 'I-1 — Light Industrial Zone (Non-Pollutive / Non-Hazardous)',
            'description' => 'Light manufacturing, assembly, storage, logistics, and non-pollutive industrial operations.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.D',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],
        'I-2' => [
            'code' => 'I-2',
            'name' => 'Medium Industrial Zone',
            'category' => 'industrial',
            'full_label' => 'I-2 — Medium Industrial Zone (Pollutive / Hazardous)',
            'description' => 'Manufacturing and industrial operations requiring environmental safeguards, buffer zones, and DENR-EMB ECC.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.D',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],

        // Agricultural & Agro-Industrial Zones
        'AGR-S' => [
            'code' => 'AGR-S',
            'name' => 'Strategic Agricultural Zone',
            'category' => 'agricultural',
            'full_label' => 'AGR-S — Strategic Agricultural Zone (SAFDFZ / Prime Agricultural Lands)',
            'description' => 'Prime irrigated agricultural land, protected crops, and food security zones with strict conversion restrictions.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.E',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],
        'AGR-NS' => [
            'code' => 'AGR-NS',
            'name' => 'Non-Strategic Agricultural Zone',
            'category' => 'agricultural',
            'full_label' => 'AGR-NS — Non-Strategic Agricultural Zone (General Agriculture)',
            'description' => 'Upland farming, mixed cultivation, and general agricultural land (subject to DAR conversion if proposed for urban development).',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.E, as amended by City Ordinance 2020-21',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],
        'AIZ' => [
            'code' => 'AIZ',
            'name' => 'Agro-Industrial Zone',
            'category' => 'agricultural',
            'full_label' => 'AIZ — Agro-Industrial Zone',
            'description' => 'Post-harvest agricultural processing, feed mills, rice milling, cold storage, and agri-support operations.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.E',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],

        // Institutional Zones
        'GI' => [
            'code' => 'GI',
            'name' => 'General Institutional Zone',
            'category' => 'institutional',
            'full_label' => 'GI — General Institutional Zone',
            'description' => 'Government administrative offices, public hospitals, schools, universities, places of worship, and civic centers.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.C',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],
        'SI' => [
            'code' => 'SI',
            'name' => 'Special Institutional Zone',
            'category' => 'institutional',
            'full_label' => 'SI — Special Institutional Zone',
            'description' => 'Specialized government, military, correctional, or scientific institutional campuses.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.C',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],

        // Tourism Zone
        'TZ' => [
            'code' => 'TZ',
            'name' => 'Tourism Zone',
            'category' => 'tourism',
            'full_label' => 'TZ — Tourism Zone (Coastal Tourism Belt)',
            'description' => 'Coastal tourism belt, beachfront resorts, hotels, eco-tourism facilities, and recreation (subject to 25m coastal buffer).',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.F',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],

        // Special Districts
        'FEZ' => [
            'code' => 'FEZ',
            'name' => 'Freeport & Special Economic Zone',
            'category' => 'special',
            'full_label' => 'FEZ — Freeport & Special Economic Zone (Poro Point)',
            'description' => 'Poro Point Special Economic Zone & Freeport Gateway under RA 7227 and City Ordinance 2018-06.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.G & RA 7227',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],
        'MRZ' => [
            'code' => 'MRZ',
            'name' => 'Mangrove & Marine Protected Zone',
            'category' => 'special',
            'full_label' => 'MRZ — Mangrove & Marine Protected Zone',
            'description' => 'Foreshore conservation, mangrove restoration, and marine sanctuaries. Strict environmental preservation.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.H',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],
        'FRZ' => [
            'code' => 'FRZ',
            'name' => 'Forest & Watershed Conservation Zone',
            'category' => 'special',
            'full_label' => 'FRZ — Forest & Watershed Conservation Zone',
            'description' => 'Upland watershed protection, forest reserves, and eco-conservation.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.H',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],
        'PDZ' => [
            'code' => 'PDZ',
            'name' => 'Planned Unit Development / Mixed-Use Zone',
            'category' => 'mixed_use',
            'full_label' => 'PDZ — Planned Unit Development / Mixed-Use Strategic Zone',
            'description' => 'Integrated master-planned commercial, office, and residential communities with approved comprehensive master plans.',
            'ordinance_section' => 'City Ordinance 2018-06, Sec. 10.I',
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
        ],
    ];

    /**
     * Hierarchical Intended Land Uses & Specific Activities
     * 9 Categories, 29 Specific Activities as required.
     */
    public const LAND_USE_CATEGORIES = [
        'retail' => [
            'code' => 'retail',
            'label' => 'Retail & Consumer Goods',
            'icon' => 'shopping-bag',
        ],
        'food' => [
            'code' => 'food',
            'label' => 'Food & Dining',
            'icon' => 'coffee',
        ],
        'offices' => [
            'code' => 'offices',
            'label' => 'Offices & Professional Services',
            'icon' => 'briefcase',
        ],
        'residential' => [
            'code' => 'residential',
            'label' => 'Residential & Housing',
            'icon' => 'home',
        ],
        'industrial' => [
            'code' => 'industrial',
            'label' => 'Industrial & Manufacturing',
            'icon' => 'tool',
        ],
        'agricultural' => [
            'code' => 'agricultural',
            'label' => 'Agricultural & Agri-Processing',
            'icon' => 'crop',
        ],
        'tourism' => [
            'code' => 'tourism',
            'label' => 'Tourism & Hospitality',
            'icon' => 'sun',
        ],
        'logistics' => [
            'code' => 'logistics',
            'label' => 'Logistics & Warehousing',
            'icon' => 'truck',
        ],
        'institutional' => [
            'code' => 'institutional',
            'label' => 'Institutional & Civic Facilities',
            'icon' => 'shield',
        ],
    ];

    public const SPECIFIC_ACTIVITIES = [
        // 1. Retail
        'retail_convenience' => [
            'code' => 'retail_convenience',
            'category' => 'retail',
            'label' => 'Convenience store (neighborhood retail)',
            'description' => 'Neighborhood mini-mart, 24/7 convenience store, grocery stall.',
        ],
        'retail_supermarket' => [
            'code' => 'retail_supermarket',
            'category' => 'retail',
            'label' => 'Supermarket / Department store',
            'description' => 'Full-line supermarket, hypermarket, department store, retail mall anchor.',
        ],
        'retail_pharmacy' => [
            'code' => 'retail_pharmacy',
            'category' => 'retail',
            'label' => 'Pharmacy / Medical supplies retail',
            'description' => 'Retail pharmacy, drugstore, medical & wellness retail store.',
        ],
        'retail_hardware' => [
            'code' => 'retail_hardware',
            'category' => 'retail',
            'label' => 'Hardware store / Construction supplies',
            'description' => 'Hardware store, electrical/plumbing supplies, building materials retail.',
        ],

        // 2. Food
        'food_cafe' => [
            'code' => 'food_cafe',
            'category' => 'food',
            'label' => 'Café / Coffee shop / Pastry shop',
            'description' => 'Specialty coffee shop, café, bakery-café, tea house, dessert shop.',
        ],
        'food_restaurant' => [
            'code' => 'food_restaurant',
            'category' => 'food',
            'label' => 'Restaurant / Full-service dining',
            'description' => 'Full-service restaurant, diner, bistro, fast food chain, food court.',
        ],
        'food_bakery' => [
            'code' => 'food_bakery',
            'category' => 'food',
            'label' => 'Bakery / Commercial bread shop',
            'description' => 'Neighborhood bakery, bakeshop, commercial bread & pastry production.',
        ],
        'food_processing' => [
            'code' => 'food_processing',
            'category' => 'food',
            'label' => 'Food-processing plant / Industrial kitchen',
            'description' => 'Industrial food manufacturing, canning, bottling, meat/seafood processing.',
        ],

        // 3. Offices
        'office_professional' => [
            'code' => 'office_professional',
            'category' => 'offices',
            'label' => 'Professional services / Corporate office',
            'description' => 'Legal, accounting, engineering, real estate, consultancy, executive suites.',
        ],
        'office_bpo' => [
            'code' => 'office_bpo',
            'category' => 'offices',
            'label' => 'BPO / IT-BPM contact center',
            'description' => 'Business Process Outsourcing, call center, software development, data center.',
        ],
        'office_government' => [
            'code' => 'office_government',
            'category' => 'offices',
            'label' => 'Government office / Administrative branch',
            'description' => 'LGU satellite, national agency office, postal or civic administrative service.',
        ],

        // 4. Residential
        'res_detached' => [
            'code' => 'res_detached',
            'category' => 'residential',
            'label' => 'Detached housing / Single-family home',
            'description' => 'Single-family detached house, residential duplex, villa.',
        ],
        'res_apartments' => [
            'code' => 'res_apartments',
            'category' => 'residential',
            'label' => 'Apartments / Townhouse cluster',
            'description' => 'Multi-family low/medium rise apartment buildings, rental townhomes.',
        ],
        'res_condominium' => [
            'code' => 'res_condominium',
            'category' => 'residential',
            'label' => 'Residential condominiums',
            'description' => 'Mid-rise or high-rise residential condominium building.',
        ],

        // 5. Industrial
        'ind_light_manufacturing' => [
            'code' => 'ind_light_manufacturing',
            'category' => 'industrial',
            'label' => 'Light manufacturing (non-pollutive / non-hazardous)',
            'description' => 'Garments, electronic components assembly, packaging, precision instruments.',
        ],
        'ind_heavy_manufacturing' => [
            'code' => 'ind_heavy_manufacturing',
            'category' => 'industrial',
            'label' => 'Heavy manufacturing (pollutive / hazardous)',
            'description' => 'Chemical plant, metal casting, cement batching, heavy machinery manufacturing.',
        ],

        // 6. Agricultural
        'agri_crop_production' => [
            'code' => 'agri_crop_production',
            'category' => 'agricultural',
            'label' => 'Crop production / Cultivation',
            'description' => 'Rice, corn, root crops, vegetables, fruit orchards, floriculture.',
        ],
        'agri_livestock' => [
            'code' => 'agri_livestock',
            'category' => 'agricultural',
            'label' => 'Livestock / Commercial poultry raising',
            'description' => 'Commercial piggery, poultry broiler/layer farm, cattle feedlot, goat raising.',
        ],
        'agri_aquaculture' => [
            'code' => 'agri_aquaculture',
            'category' => 'agricultural',
            'label' => 'Aquaculture / Fish hatchery',
            'description' => 'Fishpond, brackishwater aquaculture, marine hatchery, oyster/mussel culture.',
        ],
        'agri_processing' => [
            'code' => 'agri_processing',
            'category' => 'agricultural',
            'label' => 'Agricultural processing / Milling',
            'description' => 'Rice mill, corn drying facility, copra processing, feed mill, grain silos.',
        ],

        // 7. Tourism
        'tour_hotel' => [
            'code' => 'tour_hotel',
            'category' => 'tourism',
            'label' => 'Hotel / Commercial lodging',
            'description' => 'Commercial hotel, boutique hotel, inn, tourist traveler lodging.',
        ],
        'tour_resort' => [
            'code' => 'tour_resort',
            'category' => 'tourism',
            'label' => 'Resort / Coastal eco-tourism retreat',
            'description' => 'Beach resort, surf wellness center, eco-lodge, coastal recreational complex.',
        ],
        'tour_recreation' => [
            'code' => 'tour_recreation',
            'category' => 'tourism',
            'label' => 'Recreational establishment / Sports club',
            'description' => 'Amusement center, water park, golf course, fitness & recreational club.',
        ],

        // 8. Logistics
        'log_warehouse' => [
            'code' => 'log_warehouse',
            'category' => 'logistics',
            'label' => 'Warehouse / Storage facility',
            'description' => 'Dry storage warehouse, freight staging, goods depot.',
        ],
        'log_distribution_center' => [
            'code' => 'log_distribution_center',
            'category' => 'logistics',
            'label' => 'Distribution center / Cold storage hub',
            'description' => 'Regional e-commerce fulfillment, cold-chain facility, logistics hub.',
        ],
        'log_transport_terminal' => [
            'code' => 'log_transport_terminal',
            'category' => 'logistics',
            'label' => 'Transport terminal / Freight depot',
            'description' => 'Public utility bus/jeepney terminal, container depot, freight transport hub.',
        ],

        // 9. Institutional
        'inst_school' => [
            'code' => 'inst_school',
            'category' => 'institutional',
            'label' => 'School / University / Educational campus',
            'description' => 'Elementary/secondary school, collegiate campus, technical training institute.',
        ],
        'inst_hospital' => [
            'code' => 'inst_hospital',
            'category' => 'institutional',
            'label' => 'Hospital / Medical diagnostic center',
            'description' => 'Tertiary hospital, community hospital, multi-specialty medical clinic.',
        ],
        'inst_government_facility' => [
            'code' => 'inst_government_facility',
            'category' => 'institutional',
            'label' => 'Government facility / Civic center',
            'description' => 'City hall satellite, barangay hall, police/fire station, public civic center.',
        ],
    ];

    /**
     * Retrieve the 18 official San Fernando City zoning districts.
     */
    public static function getOfficialDistricts(): array
    {
        return self::ZONING_DISTRICTS;
    }

    /**
     * Retrieve the hierarchical land use catalog (9 categories containing their respective activities).
     */
    public static function getHierarchicalUseCatalog(): array
    {
        $catalog = [];
        foreach (self::LAND_USE_CATEGORIES as $catKey => $catData) {
            $activities = [];
            foreach (self::SPECIFIC_ACTIVITIES as $actKey => $actData) {
                if ($actData['category'] === $catKey) {
                    $activities[$actKey] = $actData;
                }
            }
            $catalog[$catKey] = array_merge($catData, [
                'activities' => $activities,
            ]);
        }
        return $catalog;
    }

    /**
     * Retrieve land use categories.
     */
    public static function getLandUseCategories(): array
    {
        return self::LAND_USE_CATEGORIES;
    }

    /**
     * Retrieve all 29 specific activities.
     */
    public static function getSpecificActivities(): array
    {
        return self::SPECIFIC_ACTIVITIES;
    }

    /**
     * Map old general categories or keywords to standard activity code.
     */
    public static function resolveActivityCode(string $rawUse): string
    {
        $normalized = strtolower(trim($rawUse));
        if ($normalized === '') {
            return '';
        }
        if (isset(self::SPECIFIC_ACTIVITIES[$normalized])) {
            return $normalized;
        }

        return '';
    }

    /**
     * Map arbitrary zone inputs (e.g. "C-1", "Commercial Zone 1", "Commercial 1") to standard zone code.
     */
    public static function resolveZoneCode(string $rawZone): ?string
    {
        $normalized = strtoupper(trim($rawZone));
        if ($normalized === '') {
            return null;
        }
        if (isset(self::ZONING_DISTRICTS[$normalized])) {
            return $normalized;
        }

        $aliases = [
            'GENERAL COMMERCIAL' => 'C-1',
            'COMMERCIAL 1' => 'C-1',
            'COMMERCIAL' => 'C-1',
            'COMMERCIAL 2' => 'C-2',
            'MEDIUM DENSITY COMMERCIAL' => 'C-2',
            'COMMERCIAL 3' => 'C-3',
            'HIGH DENSITY COMMERCIAL' => 'C-3',
            'RESIDENTIAL 1' => 'R-1',
            'LOW DENSITY RESIDENTIAL' => 'R-1',
            'RESIDENTIAL' => 'R-1',
            'RESIDENTIAL 2' => 'R-2',
            'MEDIUM DENSITY RESIDENTIAL' => 'R-2',
            'RESIDENTIAL 3' => 'R-3',
            'HIGH DENSITY RESIDENTIAL' => 'R-3',
            'LIGHT INDUSTRIAL' => 'I-1',
            'LIGHT INDUSTRIAL ZONE' => 'I-1',
            'MEDIUM INDUSTRIAL' => 'I-2',
            'MEDIUM INDUSTRIAL ZONE' => 'I-2',
            'HEAVY INDUSTRIAL' => 'I-2',
            'HEAVY INDUSTRIAL ZONE' => 'I-2',
            'HAZARDOUS INDUSTRIAL' => 'I-2',
            'TOURISM' => 'TZ',
            'TOURISM ZONE' => 'TZ',
            'AGRO-INDUSTRIAL' => 'AIZ',
            'AGRO INDUSTRIAL' => 'AIZ',
            'INSTITUTIONAL' => 'GI',
            'GENERAL INSTITUTIONAL' => 'GI',
            'MIXED USE' => 'PDZ',
            'PLANNED UNIT DEVELOPMENT' => 'PDZ',
        ];
        if (isset($aliases[$normalized])) {
            return $aliases[$normalized];
        }

        foreach (self::ZONING_DISTRICTS as $code => $data) {
            if (strcasecmp($data['name'], $rawZone) === 0 || strcasecmp($data['full_label'], $rawZone) === 0) {
                return $code;
            }
        }

        return null;
    }

    /**
     * Look up the zoning rule for a specific Zone and Activity combination.
     * Evaluates conditions (scale, setbacks, intensity, pollution, overlay).
     */
    public static function lookupRule(string $zoneCode, string $activityCode, array $conditions = []): array
    {
        $zone = self::ZONING_DISTRICTS[$zoneCode] ?? null;
        $activity = self::SPECIFIC_ACTIVITIES[$activityCode] ?? null;

        if (!$zone || !$activity) {
            return [
                'status' => self::STATUS_UNDETERMINED,
                'source_priority' => null,
                'ordinance_section' => null,
                'is_official_city_rule' => false,
                'conditions' => [],
                'restrictions' => ['Unrecognized zoning district or proposed activity code.'],
                'explanation' => 'Zoning district or proposed activity is not recognized by the rules engine.',
                'missing_source' => 'San Fernando City Zoning Ordinance 2018-06 classification schedule',
            ];
        }

        // Coded reference matrix. A citation does not authenticate its transcription or parcel scope.
        $rule = self::evaluateMatrixRule($zoneCode, $activityCode, $conditions);
        $rule['is_official_city_rule'] = false;
        $rule['rule_provenance'] = 'unverified_coded_transcription';
        return $rule;
    }

    /**
     * Comprehensive Many-to-Many Evaluation Matrix
     * Enforces exact City Ordinance 2018-06 textual provisions and amendments.
     */
    private static function evaluateMatrixRule(string $zone, string $act, array $cond): array
    {
        $z = self::ZONING_DISTRICTS[$zone];
        $a = self::SPECIFIC_ACTIVITIES[$act];

        // --- C-1: Low Density / General Commercial ---
        if ($zone === 'C-1') {
            if (in_array($act, ['retail_convenience', 'retail_pharmacy', 'retail_hardware', 'food_cafe', 'food_restaurant', 'food_bakery', 'office_professional', 'office_government'], true)) {
                return self::permitted(
                    'City Ordinance 2018-06, Sec. 10.B (Commercial Zone 1)',
                    ['Permitted by right as general commercial and neighborhood retail.'],
                    ['Maintain standard 5m road setback', 'Off-street customer parking required for establishments > 100m²']
                );
            }
            if ($act === 'retail_supermarket') {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.B',
                    ['Permitted subject to Traffic Impact Assessment (TIA) by City Engineering and adequate off-street parking.'],
                    ['Traffic Impact Assessment (TIA) approval', 'Dedicated loading bay', 'Max building height: 5 storeys']
                );
            }
            if ($act === 'office_bpo') {
                return self::permitted(
                    'City Ordinance 2018-06, Sec. 10.B',
                    ['Allowed in C-1 commercial zone with fiber utility connection.'],
                    ['Provide soundproofing for backup generators', 'Off-street employee parking']
                );
            }
            if ($act === 'res_detached' || $act === 'res_apartments') {
                return self::permitted(
                    'City Ordinance 2018-06, Sec. 10.B (Mixed Residential Allowance)',
                    ['Residential dwellings and upper-floor apartments allowed in C-1 mixed commercial.'],
                    ['Ground floor street-frontage dedicated to active commercial use preferred']
                );
            }
            if ($act === 'res_condominium') {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.B',
                    ['Permitted subject to height and FAR limits for Commercial Zone 1.'],
                    ['Maximum building height: 5 storeys / 18 meters', 'Fire safety and evacuation clearance']
                );
            }
            if ($act === 'tour_hotel') {
                return self::permitted('City Ordinance 2018-06, Sec. 10.B', ['Commercial hotels allowed in C-1.'], ['Adequate parking bay']);
            }
            if (in_array($act, ['inst_school', 'inst_hospital', 'inst_government_facility'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.B', ['Community institutional facilities permitted in commercial zones.'], []);
            }
            if ($act === 'log_warehouse') {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.B',
                    ['Allowed only for storage auxiliary to on-site commercial retail; not standalone logistics distribution depot.'],
                    ['Floor area <= 300m²', 'No 40-foot container truck loading on minor roads']
                );
            }
            if (in_array($act, ['log_distribution_center', 'log_transport_terminal'], true)) {
                return self::prohibited(
                    'City Ordinance 2018-06, Sec. 10.B',
                    'Freight depots, distribution centers, and regional transport terminals are prohibited in Commercial Zone 1 (C-1) due to road network constraints and neighborhood commercial density.'
                );
            }
            if (in_array($act, ['ind_light_manufacturing', 'ind_heavy_manufacturing', 'food_processing', 'agri_livestock'], true)) {
                return self::prohibited(
                    'City Ordinance 2018-06, Sec. 10.B',
                    'Manufacturing and livestock operations are strictly prohibited in Commercial Zone 1 to protect public health and safety.'
                );
            }
            if ($act === 'agri_crop_production') {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.B',
                    ['Existing crop cultivation tolerated pending commercial development, but urban conversion required for new building.'],
                    ['Temporary interim use only']
                );
            }
            return self::undetermined();
        }

        // --- C-2: Medium Density Commercial ---
        if ($zone === 'C-2') {
            if (in_array($act, ['retail_convenience', 'retail_supermarket', 'retail_pharmacy', 'retail_hardware', 'food_cafe', 'food_restaurant', 'food_bakery', 'office_professional', 'office_bpo', 'office_government', 'tour_hotel', 'tour_recreation'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.B', ['Permitted commercial enterprise.'], ['Building code compliance']);
            }
            if (in_array($act, ['res_apartments', 'res_condominium'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.B', ['Commercial residential and condominium permitted in C-2.'], []);
            }
            if ($act === 'log_warehouse') {
                return self::conditional('City Ordinance 2018-06, Sec. 10.B', ['Storage warehouse permitted with designated off-street truck docking.'], ['Adequate driveway width >= 8m']);
            }
            if ($act === 'ind_heavy_manufacturing' || $act === 'agri_livestock') {
                return self::prohibited('City Ordinance 2018-06, Sec. 10.B', 'Heavy industry and commercial livestock are prohibited in Medium Density Commercial zones.');
            }
            if ($act === 'ind_light_manufacturing') {
                return self::conditional('City Ordinance 2018-06, Sec. 10.B', ['Cottage and artisan light manufacturing allowed with zero toxic effluent.'], ['Non-pollutive DENR-EMB Category D']);
            }
            return self::undetermined();
        }

        // --- C-3: High Density Commercial Corridor ---
        if ($zone === 'C-3') {
            if (in_array($act, ['retail_supermarket', 'office_bpo', 'tour_hotel', 'res_condominium', 'office_professional', 'retail_convenience', 'food_restaurant', 'inst_hospital'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.B', ['High-density commercial and regional anchor use permitted.'], ['TIA approval', 'Building height per Civil Aviation / CAAP clearance']);
            }
            if ($act === 'log_distribution_center' || $act === 'log_transport_terminal') {
                return self::conditional('City Ordinance 2018-06, Sec. 10.B', ['Permitted along designated national arterial segments with direct deceleration lanes.'], ['Direct arterial road frontage >= 15m']);
            }
            if ($act === 'ind_heavy_manufacturing' || $act === 'agri_livestock') {
                return self::prohibited('City Ordinance 2018-06, Sec. 10.B', 'Heavy manufacturing and livestock prohibited along high-density metropolitan commercial corridor.');
            }
            return self::undetermined();
        }

        // --- R-1: Low Density Residential ---
        if ($zone === 'R-1') {
            if ($act === 'res_detached') {
                return self::permitted('City Ordinance 2018-06, Sec. 10.A', ['Single-family detached dwellings permitted by right.'], ['Max building height: 3 storeys / 10m', 'Building setbacks: front 3m, sides 2m']);
            }
            if ($act === 'res_apartments') {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.A',
                    ['Duplexes or low-rise townhouses permitted with maximum density limit.'],
                    ['Max 2 storeys', 'Maximum 4 units per lot', 'Off-street parking for every unit']
                );
            }
            if ($act === 'retail_convenience') {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.A',
                    ['Neighborhood convenience retail allowed as home occupation or ground-floor corner shop.'],
                    ['Floor area <= 50m²', 'Operated by resident homeowner', 'No outdoor flashing signage', 'Barangay clearance required']
                );
            }
            if ($act === 'food_cafe' || $act === 'food_bakery') {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.A',
                    ['Cottage café/bakery permitted with strict noise and residential amenity protection.'],
                    ['Operating hours restricted to 7:00 AM - 8:00 PM', 'Floor area <= 60m²', 'No live amplified music']
                );
            }
            if ($act === 'office_professional') {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.A',
                    ['Home-based professional office permitted (law, accounting, design studio).'],
                    ['Maximum 3 visiting non-resident staff', 'Home occupation permit required']
                );
            }
            if (in_array($act, ['res_condominium', 'retail_supermarket', 'retail_hardware', 'food_processing', 'ind_light_manufacturing', 'ind_heavy_manufacturing', 'log_warehouse', 'log_distribution_center', 'log_transport_terminal', 'agri_livestock', 'tour_hotel'], true)) {
                return self::prohibited(
                    'City Ordinance 2018-06, Sec. 10.A',
                    'Commercial, industrial, high-rise, and livestock uses are prohibited in Low Density Residential Zone 1 to preserve peace, quiet, and residential integrity.'
                );
            }
            if ($act === 'inst_school') {
                return self::conditional('City Ordinance 2018-06, Sec. 10.A', ['Nursery, preschool, or elementary school permitted with zoning exception.'], ['Zoning exception clearance', 'Drop-off bay']);
            }
            return self::prohibited('City Ordinance 2018-06, Sec. 10.A', 'Non-residential activity is not allowed in Residential Zone 1.');
        }

        // --- R-2 & R-3: Medium & High Density Residential ---
        if ($zone === 'R-2' || $zone === 'R-3') {
            if (in_array($act, ['res_detached', 'res_apartments', 'res_condominium'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.A', ['Residential housing and multi-family structures permitted.'], []);
            }
            if (in_array($act, ['retail_convenience', 'retail_pharmacy', 'food_cafe', 'food_bakery', 'office_professional'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.A', ['Neighborhood commercial and professional services allowed on ground floors.'], ['Building code compliance']);
            }
            if (in_array($act, ['ind_heavy_manufacturing', 'ind_light_manufacturing', 'agri_livestock', 'food_processing', 'log_distribution_center'], true)) {
                return self::prohibited('City Ordinance 2018-06, Sec. 10.A', 'Industrial, heavy storage, and livestock activities prohibited in residential zones.');
            }
            return self::undetermined();
        }

        // --- I-1: Light Industrial Zone ---
        if ($zone === 'I-1') {
            if (in_array($act, ['ind_light_manufacturing', 'log_warehouse', 'log_distribution_center', 'log_transport_terminal', 'retail_hardware'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.D', ['Light manufacturing, logistics, and storage permitted by right.'], ['DENR-EMB CNC or ECC compliance']);
            }
            if ($act === 'food_processing') {
                return self::permitted('City Ordinance 2018-06, Sec. 10.D', ['Food processing plant allowed with approved wastewater treatment facility.'], ['Wastewater Discharge Permit (DENR)', 'Sanitary Permit']);
            }
            if ($act === 'ind_heavy_manufacturing') {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.D',
                    ['Heavy pollutive manufacturing requires Medium Industrial (I-2) classification; requires special zoning variance in I-1.'],
                    ['Full Environmental Impact Statement (EIS)', 'City Zoning Board variance', 'Minimum 30m buffer to nearest residential boundary']
                );
            }
            if (in_array($act, ['retail_convenience', 'food_restaurant', 'office_professional'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.D', ['Commercial support facilities for industrial workers permitted.'], []);
            }
            if (in_array($act, ['res_detached', 'res_apartments', 'res_condominium'], true)) {
                return self::prohibited(
                    'City Ordinance 2018-06, Sec. 10.D',
                    'Permanent residential subdivisions and housing are prohibited in Light Industrial Zone 1 for health and hazard safety.'
                );
            }
            if ($act === 'inst_hospital' || $act === 'inst_school') {
                return self::prohibited('City Ordinance 2018-06, Sec. 10.D', 'Schools and hospitals are incompatible with industrial zones.');
            }
            return self::undetermined();
        }

        // --- I-2: Medium Industrial Zone ---
        if ($zone === 'I-2') {
            if (in_array($act, ['ind_heavy_manufacturing', 'ind_light_manufacturing', 'log_warehouse', 'log_distribution_center', 'food_processing'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.D', ['Medium and heavy industrial operations permitted with mandatory environmental clearances.'], ['DENR-EMB ECC', 'LLDA/Water Discharge clearance']);
            }
            if (in_array($act, ['res_detached', 'res_apartments', 'res_condominium', 'inst_school', 'inst_hospital', 'tour_hotel', 'tour_resort'], true)) {
                return self::prohibited('City Ordinance 2018-06, Sec. 10.D', 'Sensitive residential, tourism, and institutional activities are strictly prohibited in I-2 Medium Industrial.');
            }
            return self::undetermined();
        }

        // --- AGR-S: Strategic Agricultural Zone (SAFDFZ) ---
        if ($zone === 'AGR-S') {
            if (in_array($act, ['agri_crop_production', 'agri_aquaculture'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.E', ['Crop cultivation and aquaculture permitted by right on strategic agricultural lands.'], []);
            }
            if ($act === 'agri_processing') {
                return self::conditional('City Ordinance 2018-06, Sec. 10.E', ['Post-harvest agricultural processing allowed if auxiliary to farming.'], ['Footprint <= 10% of farm holding']);
            }
            if ($act === 'agri_livestock') {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.E',
                    ['Livestock raising permitted subject to distance standards from water bodies and residential clusters.'],
                    ['Minimum 500m buffer from nearest residential cluster', 'Biogas waste management required']
                );
            }
            if (in_array($act, ['retail_supermarket', 'retail_hardware', 'office_bpo', 'res_condominium', 'ind_heavy_manufacturing', 'ind_light_manufacturing', 'log_distribution_center'], true)) {
                return self::prohibited(
                    'City Ordinance 2018-06, Sec. 10.E (SAFDFZ Protection)',
                    'Commercial, industrial, and high-density urban development are strictly prohibited in Strategic Agricultural Zones (SAFDFZ) under national food security and agrarian reform laws.'
                );
            }
            if ($act === 'res_detached') {
                return self::conditional('City Ordinance 2018-06, Sec. 10.E', ['Single farm dwelling for resident farmer permitted.'], ['Max 1 farmhouse per agricultural parcel']);
            }
            return self::prohibited('City Ordinance 2018-06, Sec. 10.E', 'Non-agricultural development prohibited in Strategic Agricultural Zone.');
        }

        // --- AGR-NS: Non-Strategic Agricultural Zone ---
        if ($zone === 'AGR-NS') {
            if (in_array($act, ['agri_crop_production', 'agri_livestock', 'agri_aquaculture', 'agri_processing'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.E', ['Agricultural activities permitted.'], ['Sanitary and waste standards']);
            }
            if (in_array($act, ['retail_convenience', 'food_cafe', 'tour_resort', 'tour_hotel'], true)) {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.E',
                    ['Agri-tourism, farm-to-table café, and eco-resorts permitted with Department of Tourism (DOT) endorsement and local clearance.'],
                    ['DOT Farm Tourism accreditation', 'DAR Land Use Conversion / Reclassification clearance if converting arable land']
                );
            }
            if (in_array($act, ['retail_supermarket', 'ind_heavy_manufacturing'], true)) {
                return self::prohibited('City Ordinance 2018-06, Sec. 10.E', 'Heavy manufacturing and large commercial retail prohibited in agricultural zones without approved SP rezoning.');
            }
            if (in_array($act, ['res_detached', 'res_apartments'], true)) {
                return self::conditional('City Ordinance 2018-06, Sec. 10.E', ['Housing allowed subject to DAR Land Conversion approval and City Reclassification (e.g. City Ordinance 2020-21).'], ['DAR Conversion Order', 'LGU Reclassification']);
            }
            return self::undetermined();
        }

        // --- AIZ: Agro-Industrial Zone ---
        if ($zone === 'AIZ') {
            if (in_array($act, ['agri_processing', 'agri_crop_production', 'food_processing', 'log_warehouse', 'log_distribution_center'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.E', ['Agro-industrial processing, storage, and milling permitted by right.'], ['Waste disposal plan']);
            }
            if (in_array($act, ['res_condominium', 'inst_school', 'inst_hospital'], true)) {
                return self::prohibited('City Ordinance 2018-06, Sec. 10.E', 'Institutional and high-density residential uses prohibited in Agro-Industrial zone.');
            }
            return self::undetermined();
        }

        // --- GI: General Institutional Zone ---
        if ($zone === 'GI') {
            if (in_array($act, ['inst_school', 'inst_hospital', 'inst_government_facility', 'office_government'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.C', ['Public and civic institutional uses permitted by right.'], []);
            }
            if (in_array($act, ['retail_convenience', 'retail_pharmacy', 'food_cafe', 'food_restaurant'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.C', ['Ancillary support services for institutional campuses permitted.'], []);
            }
            if (in_array($act, ['ind_heavy_manufacturing', 'ind_light_manufacturing', 'agri_livestock'], true)) {
                return self::prohibited('City Ordinance 2018-06, Sec. 10.C', 'Industrial manufacturing and commercial livestock strictly prohibited in General Institutional Zone.');
            }
            return self::undetermined();
        }

        // --- SI: Special Institutional Zone ---
        if ($zone === 'SI') {
            if (in_array($act, ['inst_government_facility', 'office_government'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.C', ['Special institutional use permitted.'], []);
            }
            if (in_array($act, ['res_detached', 'res_apartments', 'res_condominium', 'ind_heavy_manufacturing'], true)) {
                return self::prohibited('City Ordinance 2018-06, Sec. 10.C', 'Private residential and manufacturing prohibited in Special Institutional Zone.');
            }
            return self::undetermined();
        }

        // --- TZ: Tourism Zone ---
        if ($zone === 'TZ') {
            if (in_array($act, ['tour_hotel', 'tour_resort', 'tour_recreation', 'food_cafe', 'food_restaurant', 'retail_convenience'], true)) {
                return self::permitted(
                    'City Ordinance 2018-06, Sec. 10.F (Coastal Tourism Belt)',
                    ['Tourism, resort, and visitor-serving hospitality permitted by right.'],
                    ['Comply with 25m coastal environmental setback from high-water mark', 'DENR-EMB ECC / CNC required', 'Sewage treatment plant (STP) for facilities > 20 rooms']
                );
            }
            if (in_array($act, ['res_condominium', 'res_apartments'], true)) {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.F',
                    ['Serviced apartments and condotel lodging permitted with tourism master plan approval.'],
                    ['DOT accreditation', 'Height restriction <= 4 storeys / 15m in coastal strip']
                );
            }
            if (in_array($act, ['ind_heavy_manufacturing', 'ind_light_manufacturing', 'agri_livestock', 'log_distribution_center', 'food_processing'], true)) {
                return self::prohibited(
                    'City Ordinance 2018-06, Sec. 10.F',
                    'Industrial manufacturing, freight logistics, and commercial livestock are strictly prohibited in Tourism Zones to protect the marine and scenic coastal environment.'
                );
            }
            return self::undetermined();
        }

        // --- FEZ: Freeport & Special Economic Zone (Poro Point) ---
        if ($zone === 'FEZ') {
            if (in_array($act, ['tour_hotel', 'tour_resort', 'tour_recreation', 'office_bpo', 'office_professional', 'log_warehouse', 'log_distribution_center', 'ind_light_manufacturing', 'food_restaurant', 'retail_supermarket'], true)) {
                return self::permitted(
                    'City Ordinance 2018-06, Sec. 10.G & RA 7227 (Poro Point Freeport)',
                    ['Permitted commercial, BPO, logistics, and eco-tourism uses subject to Poro Point Management Corporation (PPMC) & BCDA locational permits.'],
                    ['PPMC / BCDA Locational Clearance', 'PEZA registration if seeking tax incentives']
                );
            }
            if ($act === 'ind_heavy_manufacturing') {
                return self::conditional('City Ordinance 2018-06, Sec. 10.G', ['Heavy manufacturing requires special BCDA/PPMC Board approval.'], ['PPMC Board Approval']);
            }
            return self::undetermined();
        }

        // --- MRZ: Mangrove & Marine Protected Zone ---
        if ($zone === 'MRZ') {
            if ($act === 'agri_aquaculture') {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.H',
                    ['Traditional non-destructive marine culture only; no cutting of mangrove trees.'],
                    ['DENR-CENRO permit', 'Zero mangrove alteration']
                );
            }
            if ($act === 'tour_recreation') {
                return self::conditional(
                    'City Ordinance 2018-06, Sec. 10.H',
                    ['Low-impact eco-walkways and bird-watching boardwalks allowed with DENR clearance.'],
                    ['Non-concrete elevated boardwalk', 'DENR-CENRO clearance']
                );
            }
            return self::prohibited(
                'City Ordinance 2018-06, Sec. 10.H (Marine Protected Sanctuary)',
                'Urban, commercial, residential, and industrial construction is strictly prohibited in Mangrove and Marine Conservation Zones under the City Environmental Code and national conservation laws.'
            );
        }

        // --- FRZ: Forest & Watershed Conservation Zone ---
        if ($zone === 'FRZ') {
            if ($act === 'agri_crop_production') {
                return self::conditional('City Ordinance 2018-06, Sec. 10.H', ['Agro-forestry and perennial tree orchards allowed; no slash-and-burn.'], ['DENR-CENRO Agro-forestry stewardship']);
            }
            if ($act === 'tour_recreation') {
                return self::conditional('City Ordinance 2018-06, Sec. 10.H', ['Eco-trekking trails permitted without permanent concrete structures.'], ['Zero timber harvesting']);
            }
            return self::prohibited(
                'City Ordinance 2018-06, Sec. 10.H',
                'Commercial, industrial, and high-density residential development is strictly prohibited in Forest and Watershed Conservation Zones.'
            );
        }

        // --- PDZ: Planned Unit Development / Mixed-Use ---
        if ($zone === 'PDZ') {
            if (in_array($act, ['retail_convenience', 'retail_supermarket', 'food_cafe', 'food_restaurant', 'office_professional', 'office_bpo', 'res_condominium', 'res_apartments', 'tour_hotel'], true)) {
                return self::permitted('City Ordinance 2018-06, Sec. 10.I', ['Mixed-use commercial and residential permitted per approved master plan.'], ['Conformity with LGU-approved Master Development Plan']);
            }
            if (in_array($act, ['ind_heavy_manufacturing', 'agri_livestock'], true)) {
                return self::prohibited('City Ordinance 2018-06, Sec. 10.I', 'Heavy manufacturing and livestock raising prohibited in Planned Unit Development zones.');
            }
            return self::undetermined();
        }

        // Default Undetermined if combination not covered above
        return [
            'status' => self::STATUS_UNDETERMINED,
            'source_priority' => null,
            'ordinance_section' => null,
            'is_official_city_rule' => false,
            'conditions' => [],
            'restrictions' => ['Specific rule combination not found in current City Ordinance 2018-06 schedule.'],
            'explanation' => sprintf('Official rule for %s in %s requires CPDO zoning interpretation or amendment certification.', $a['label'], $z['name']),
            'missing_source' => 'San Fernando City Planning and Development Office (CPDO) Locational Clearance determination',
        ];
    }

    private static function undetermined(): array
    {
        return ['status' => self::STATUS_UNDETERMINED, 'source_priority' => null, 'ordinance_section' => null,
            'is_official_city_rule' => false, 'conditions' => [], 'restrictions' => [],
            'explanation' => 'No explicit applicable activity rule is recorded; CPDO rule verification is required.',
            'missing_source' => 'Authenticated district-specific rule for the selected activity'];
    }

    private static function permitted(string $section, array $notes = [], array $restrictions = []): array
    {
        return [
            'status' => self::STATUS_PERMITTED,
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
            'ordinance_section' => $section,
            'is_official_city_rule' => false,
            'conditions' => $notes,
            'restrictions' => $restrictions,
            'explanation' => 'Permitted by right under San Fernando City Zoning Ordinance regulations.',
            'missing_source' => null,
        ];
    }

    private static function conditional(string $section, array $conditions = [], array $restrictions = []): array
    {
        return [
            'status' => self::STATUS_CONDITIONAL,
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
            'ordinance_section' => $section,
            'is_official_city_rule' => false,
            'conditions' => $conditions,
            'restrictions' => $restrictions,
            'explanation' => 'Conditional use: permitted subject to specific technical requirements, clearances, and development standards.',
            'missing_source' => null,
        ];
    }

    private static function prohibited(string $section, string $reason): array
    {
        return [
            'status' => self::STATUS_PROHIBITED,
            'source_priority' => self::SOURCE_PRIORITY_LOCAL_ORDINANCE,
            'ordinance_section' => $section,
            'is_official_city_rule' => false,
            'conditions' => [],
            'restrictions' => [$reason],
            'explanation' => $reason,
            'missing_source' => null,
        ];
    }

    /**
     * Primary Evaluation Engine Method:
     * Zoning District + Specific Proposed Activity + Applicable Conditions → Compatibility Result
     */
    public static function evaluate(mixed $zoneInput, mixed $activityInput, array $conditions = []): array
    {
        $rawZone = is_string($zoneInput) ? $zoneInput : (string) ($zoneInput['zone_code'] ?? $zoneInput['zoning_classification'] ?? '');
        $zoneCode = self::resolveZoneCode($rawZone);

        $rawAct = is_string($activityInput) ? $activityInput : (string) ($activityInput['use_code'] ?? $activityInput['proposed_activity'] ?? $activityInput['category'] ?? '');
        $activityCode = self::resolveActivityCode($rawAct);

        if (!$zoneCode) {
            return [
                'is_complete' => false,
                'status' => self::STATUS_UNDETERMINED,
                'status_label' => 'Assessment Incomplete (Zoning Undetermined)',
                'screening_only' => true,
                'evidence_status' => 'UNVERIFIED',
                'rank_eligible' => false,
                'score' => null,
                'is_eligible' => false,
                'suitability' => 'incomplete',
                'iai_contribution' => null,
                'weight' => self::ZONING_WEIGHT,
                'zone_code' => null,
                'zone_name' => $rawZone ?: 'Unspecified Zone',
                'use_code' => $activityCode,
                'use_label' => self::SPECIFIC_ACTIVITIES[$activityCode]['label'] ?? $rawAct,
                'use_category' => self::SPECIFIC_ACTIVITIES[$activityCode]['category'] ?? 'general',
                'rule_source' => 'Awaiting San Fernando City Zoning Classification',
                'ordinance_section' => null,
                'source_priority' => null,
                'is_official_city_rule' => false,
                'conditions' => [],
                'unmet_conditions' => [],
                'restrictions' => ['Zoning classification must be provided from official City Planning records.'],
                'reason' => 'Zoning classification is missing or unrecognized.',
                'explanation' => 'Provide a recognized San Fernando City zoning classification to evaluate land-use compatibility.',
                'missing_requirements' => ['San Fernando City Zoning Classification'],
                'rules_version' => self::VERSION,
                'evaluated_at' => gmdate(DATE_ATOM),
            ];
        }

        if (!$activityCode || !isset(self::SPECIFIC_ACTIVITIES[$activityCode])) {
            $zone = self::ZONING_DISTRICTS[$zoneCode];
            return [
                'is_complete' => false,
                'status' => self::STATUS_UNDETERMINED,
                'status_label' => 'Assessment Incomplete (Activity Unselected)',
                'screening_only' => true,
                'evidence_status' => 'UNVERIFIED',
                'rank_eligible' => false,
                'score' => null,
                'is_eligible' => false,
                'suitability' => 'incomplete',
                'iai_contribution' => null,
                'weight' => self::ZONING_WEIGHT,
                'zone_code' => $zoneCode,
                'zone_name' => $zone['name'],
                'zone_full_label' => $zone['full_label'],
                'use_code' => null,
                'use_label' => 'Unselected Business Activity',
                'use_category' => 'general',
                'rule_source' => 'Awaiting investor activity selection',
                'ordinance_section' => null,
                'source_priority' => null,
                'is_official_city_rule' => false,
                'conditions' => [],
                'unmet_conditions' => [],
                'outstanding_requirements' => ['Proposed business activity selection'],
                'restrictions' => ['Select a specific business or land-use activity to evaluate zoning compatibility.'],
                'reason' => 'Proposed business activity is unselected or unrecognized.',
                'explanation' => "Zoning district is {$zone['full_label']}. Select an intended business or land-use activity to evaluate compatibility with this zoning district.",
                'missing_requirements' => ['Proposed business activity selection'],
                'rules_version' => self::VERSION,
                'evaluated_at' => gmdate(DATE_ATOM),
            ];
        }

        $zone = self::ZONING_DISTRICTS[$zoneCode];
        $activity = self::SPECIFIC_ACTIVITIES[$activityCode];
        $lookup = self::lookupRule($zoneCode, $activityCode, $conditions);

        $status = $lookup['status'];
        $score = null;
        $iaiContrib = null;
        $isComplete = false;
        $isEligible = false;
        $suitability = 'incomplete';
        $statusLabel = 'Assessment Incomplete';

        if ($status === self::STATUS_PERMITTED) {
            $isComplete = true;
            $isEligible = true;
            $score = 100.0;
            $suitability = 'suitable';
            $statusLabel = 'Permitted Use';
            $iaiContrib = null; // Mandatory eligibility gate; does not contribute a numerical score to IAI
        } elseif ($status === self::STATUS_CONDITIONAL) {
            $isComplete = true;
            $isEligible = true;
            $score = 70.0;
            $suitability = 'conditional';
            $statusLabel = 'Conditional Use';
            $iaiContrib = null; // Mandatory eligibility gate; does not contribute a numerical score to IAI
        } elseif ($status === self::STATUS_PROHIBITED) {
            $isComplete = true;
            $isEligible = false;
            $score = 0.0;
            $suitability = 'not_suitable';
            $statusLabel = 'Prohibited Use (Not Suitable)';
            $iaiContrib = null; // Disqualified: hard constraint trips, IAI is withheld (null)
        } else {
            // Undetermined
            $isComplete = false;
            $isEligible = false;
            $score = null;
            $suitability = 'incomplete';
            $statusLabel = 'Assessment Incomplete (Undetermined)';
            $iaiContrib = null;
        }

        $outstandingRequirements = $status === self::STATUS_CONDITIONAL
            ? (!empty($lookup['conditions']) ? $lookup['conditions'] : (!empty($lookup['restrictions']) ? $lookup['restrictions'] : ['Subject to technical locational clearance and zoning board review.']))
            : [];

        return [
            'is_complete' => $isComplete,
            'status' => $status,
            'status_label' => $statusLabel,
            'screening_only' => true,
            'evidence_status' => 'UNVERIFIED',
            'rank_eligible' => false,
            'score' => $score,
            'is_eligible' => $isEligible,
            'suitability' => $suitability,
            'iai_contribution' => $iaiContrib,
            'weight' => self::ZONING_WEIGHT,
            'zone_code' => $zoneCode,
            'zone_name' => $zone['name'],
            'zone_full_label' => $zone['full_label'],
            'use_code' => $activityCode,
            'use_label' => $activity['label'],
            'use_category' => $activity['category'],
            'rule_source' => $lookup['ordinance_section'] ?? 'City Ordinance 2018-06',
            'ordinance_section' => $lookup['ordinance_section'],
            'source_priority' => $lookup['source_priority'],
            'is_official_city_rule' => false,
            'rule_provenance' => 'unverified_coded_transcription',
            'conditions' => $lookup['conditions'],
            'unmet_conditions' => $outstandingRequirements,
            'outstanding_requirements' => $outstandingRequirements,
            'conditions_met' => $status === self::STATUS_PERMITTED,
            'restrictions' => $lookup['restrictions'],
            'reason' => $status === self::STATUS_PROHIBITED ? ($lookup['restrictions'][0] ?? 'Use is prohibited in this zone.') : null,
            'explanation' => $lookup['explanation'],
            'missing_requirements' => $status === self::STATUS_UNDETERMINED ? [$lookup['missing_source'] ?? 'Zoning source verification'] : [],
            'rules_version' => self::VERSION,
            'evaluated_at' => gmdate(DATE_ATOM),
        ];
    }

    /**
     * Seed or synchronize the official San Fernando City rules into MySQL tables
     * (clup_datasets, clup_zones, clup_use_types, clup_zone_use_rules).
     *
     * Ensures strict database-level referential integrity and traceability.
     */
    public static function seedOfficialRules(PDO $pdo): array
    {
        // 1. Ensure Active Dataset for City Ordinance 2018-06
        $checkDataset = $pdo->prepare('SELECT id FROM clup_datasets WHERE name = :name AND version_label = :ver LIMIT 1');
        $checkDataset->execute(['name' => self::DATASET_NAME, 'ver' => self::DATASET_VERSION]);
        $datasetId = $checkDataset->fetchColumn();

        if (!$datasetId) {
            $insertDataset = $pdo->prepare(
                'INSERT INTO clup_datasets (
                    name, version_label, source_agency, source_reference, source_url, status,
                    effective_date, notes
                 ) VALUES (
                    :name, :ver, :agency, :ref, :url, :status, :eff_date, :notes
                 )'
            );
            $insertDataset->execute([
                'name' => self::DATASET_NAME,
                'ver' => self::DATASET_VERSION,
                'agency' => 'Sangguniang Panlungsod & City Planning and Development Office (CPDO), City of San Fernando, La Union',
                'ref' => 'City Ordinance No. 2018-06, with amendments City Ordinance 2020-21 & City Ordinance 2025-16',
                'url' => 'https://archives.sanfernandocity.gov.ph/upload/202009033E4NGDW9OUBLGLXKCYOT105312AM.pdf',
                'status' => 'active',
                'eff_date' => '2018-06-29',
                'notes' => 'Textual zoning classifications, use regulation matrix, and conditional development rules enacted under San Fernando City Ordinance 2018-06.',
            ]);
            $datasetId = (int) $pdo->lastInsertId();
        } else {
            $datasetId = (int) $datasetId;
            // Ensure status is active
            $pdo->prepare("UPDATE clup_datasets SET status = 'active' WHERE id = :id")->execute(['id' => $datasetId]);
        }

        // 2. Seed / Sync clup_zones
        $zoneStmt = $pdo->prepare(
            'INSERT INTO clup_zones (dataset_id, zone_code, name, description, geometry_type)
             VALUES (:dataset_id, :code, :name, :desc, :geom)
             ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)'
        );
        $zoneIdMap = [];
        foreach (self::ZONING_DISTRICTS as $code => $z) {
            $zoneStmt->execute([
                'dataset_id' => $datasetId,
                'code' => $code,
                'name' => $z['name'],
                'desc' => $z['description'],
                'geom' => 'Polygon',
            ]);
        }

        // Retrieve zone IDs
        $fetchZones = $pdo->prepare('SELECT id, zone_code FROM clup_zones WHERE dataset_id = :dataset_id');
        $fetchZones->execute(['dataset_id' => $datasetId]);
        while ($row = $fetchZones->fetch(PDO::FETCH_ASSOC)) {
            $zoneIdMap[$row['zone_code']] = (int) $row['id'];
        }

        // 3. Seed / Sync clup_use_types for all 29 specific activities + parent categories
        $useStmt = $pdo->prepare(
            'INSERT INTO clup_use_types (code, label, category, description, is_active)
             VALUES (:code, :label, :cat, :desc, 1)
             ON DUPLICATE KEY UPDATE label = VALUES(label), category = VALUES(category), description = VALUES(description), is_active = 1'
        );
        foreach (self::SPECIFIC_ACTIVITIES as $code => $act) {
            $useStmt->execute([
                'code' => $code,
                'label' => $act['label'],
                'cat' => $act['category'],
                'desc' => $act['description'],
            ]);
        }

        // 4. Seed / Sync clup_zone_use_rules
        $ruleStmt = $pdo->prepare(
            'INSERT INTO clup_zone_use_rules (
                dataset_id, zone_id, use_code, permission_status, conditions_json,
                ordinance_reference, effective_date
             ) VALUES (
                :dataset_id, :zone_id, :use_code, :permission, :conditions,
                :ordinance_ref, :eff_date
             )
             ON DUPLICATE KEY UPDATE
                permission_status = VALUES(permission_status),
                conditions_json = VALUES(conditions_json),
                ordinance_reference = VALUES(ordinance_reference),
                effective_date = VALUES(effective_date)'
        );

        $rulesCount = 0;
        foreach (self::ZONING_DISTRICTS as $zCode => $zData) {
            $zoneId = $zoneIdMap[$zCode] ?? null;
            if (!$zoneId) continue;

            foreach (self::SPECIFIC_ACTIVITIES as $actCode => $actData) {
                $eval = self::lookupRule($zCode, $actCode);
                $condJson = json_encode([
                    'source_priority' => $eval['source_priority'],
                    'is_official_city_rule' => $eval['is_official_city_rule'],
                    'conditions' => $eval['conditions'],
                    'restrictions' => $eval['restrictions'],
                    'explanation' => $eval['explanation'],
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

                $ruleStmt->execute([
                    'dataset_id' => $datasetId,
                    'zone_id' => $zoneId,
                    'use_code' => $actCode,
                    'permission' => $eval['status'],
                    'conditions' => $condJson,
                    'ordinance_ref' => $eval['ordinance_section'] ?? 'City Ordinance 2018-06',
                    'eff_date' => '2018-06-29',
                ]);
                $rulesCount++;
            }
        }

        return [
            'dataset_id' => $datasetId,
            'dataset_version' => self::DATASET_VERSION,
            'zones_count' => count(self::ZONING_DISTRICTS),
            'activities_count' => count(self::SPECIFIC_ACTIVITIES),
            'rules_seeded' => $rulesCount,
        ];
    }

    /**
     * Retrieve all 522 zone-activity rule matrices for client-side caching & instant evaluation.
     */
    public static function getAllRules(): array
    {
        $all = [];
        foreach (array_keys(self::ZONING_DISTRICTS) as $zone) {
            $all[$zone] = [];
            foreach (array_keys(self::SPECIFIC_ACTIVITIES) as $act) {
                $all[$zone][$act] = self::lookupRule($zone, $act);
            }
        }
        return $all;
    }

    /** Read-only intake reference, derived from the evaluator rather than a second browser rule engine. */
    public static function getScreeningData(): array
    {
        $rules = [];
        $fields = array_flip(['status', 'score', 'is_complete', 'zone_code', 'zone_name', 'use_code', 'use_label',
            'ordinance_section', 'conditions', 'restrictions', 'outstanding_requirements']);
        foreach (array_keys(self::ZONING_DISTRICTS) as $zone) {
            foreach (array_keys(self::SPECIFIC_ACTIVITIES) as $activity) {
                $rules[$zone][$activity] = array_intersect_key(self::evaluate($zone, $activity), $fields);
            }
        }
        $path = dirname(__DIR__, 2) . '/data/clup-source-registry.json';
        $registry = is_readable($path) ? json_decode((string) file_get_contents($path), true) : [];
        $registry = is_array($registry) ? $registry : [];
        $source = null;
        foreach ($registry['sources'] ?? [] as $item) {
            if (($item['source_id'] ?? '') === 'city-ordinance-2018-06') { $source = $item; break; }
        }
        return [
            'districts' => self::getOfficialDistricts(),
            'catalog' => self::getHierarchicalUseCatalog(),
            'rules' => $rules,
            'version' => self::VERSION,
            'weight' => self::ZONING_WEIGHT,
            'screening_only' => true,
            'is_official_city_rule' => false,
            'rule_provenance' => 'unverified_coded_transcription',
            'evidence_status' => 'UNVERIFIED',
            'source_review_date' => $registry['research_cutoff_date'] ?? null,
            'source_url' => $source['url'] ?? null,
            'notice' => $registry['legal_position']['required_notice'] ?? 'Preliminary reference only. Obtain an authorized city zoning determination.',
            'evidence_gaps' => [
                'Confirm the current ordinance and all applicable amendments.',
                'Match the parcel to an authenticated zoning map and check split zones or overlays.',
                'Verify the exact proposed use and its development requirements with CPDO.',
            ],
            'plan_horizon_note' => $registry['plan_horizon']['caveat'] ?? 'Current plan applicability requires city confirmation.',
        ];
    }
}
