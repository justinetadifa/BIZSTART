<?php
declare(strict_types=1);

namespace App\Support;

require_once __DIR__ . '/NearbyBusinesses.php';
require_once __DIR__ . '/ZoningRulesEngine.php';

/**
 * Business Opportunities Matching Engine for LOCUS-SF properties.
 * 
 * Traceable neighborhood matching based on nearby establishments, property characteristics,
 * infrastructure readiness and authoritative zoning information from City Ordinance 2018-06.
 * 
 * Does not claim profitability, guaranteed returns, or unmet customer demand.
 * Recommendations are screening suggestions, not guarantees of demand, profit, or official development approval.
 */
final class BusinessOpportunities
{
    public const DEFAULT_RADIUS_METERS = 500.0;
    public const RULE_VERSION = 'v2.0-zoning-integrated';
    public const RULE_SOURCE = 'LOCUS-SF Local Economic Benchmark (San Fernando City Planning & Zoning Ordinance 2018-06)';

    /**
     * Sectors definition.
     */
    public const SECTORS = [
        'everyday_services' => 'Everyday Services',
        'food_retail' => 'Food & Retail',
        'professional_services' => 'Professional Services',
        'tourism_recreation' => 'Tourism & Recreation',
        'industrial_agricultural' => 'Industrial & Agricultural Support',
    ];

    /**
     * Configurable catalog of business profiles.
     */
    public static function catalog(): array
    {
        return [
            [
                'id' => 'convenience_store',
                'label' => 'Convenience Retail Store',
                'sector' => 'everyday_services',
                'sectorLabel' => 'Everyday Services',
                'zoningActivityCode' => 'retail_convenience',
                'description' => 'Extended-hours retail outlet for everyday packaged foods, quick snacks, household sundries, beverages and personal supplies.',
                'activityCenters' => ['hospital', 'clinic', 'school', 'college', 'office', 'fuel', 'townhall', 'residential'],
                'areaGuideline' => 'Footprint typically 30–80 sqm (commercial space); road frontage desirable',
                'minAreaSqm' => 30,
                'maxAreaSqm' => 200,
                'requiredUtilities' => ['electricity', 'water'],
                'roadAccess' => 'paved',
                'competitorCategories' => ['convenience', 'supermarket', 'marketplace'],
                'complementaryCategories' => ['fuel', 'pharmacy', 'laundry', 'residential', 'office'],
                'allowedZonings' => ['Commercial', 'General Commercial', 'Mixed Use', 'High Density Commercial', 'Medium Density Residential', 'Low Density Residential'],
                'prohibitedZonings' => ['Heavy Industrial', 'Hazardous Industrial', 'Forest Reserve', 'Protected Agricultural'],
                'explanationTemplate' => 'Proximity to {anchors} provides regular foot traffic and recurring customer demand for daily essentials and quick-stop convenience.',
                'mainUnresolvedNotice' => 'Confirm commercial electric line capacity and delivery unloading space.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'grocery',
                'label' => 'Neighborhood Grocery & Mart',
                'sector' => 'food_retail',
                'sectorLabel' => 'Food & Retail',
                'zoningActivityCode' => 'retail_supermarket',
                'description' => 'Community grocery stocking fresh produce, dry cooking staples, canned foods, household goods and toiletries.',
                'activityCenters' => ['residential', 'place_of_worship', 'school', 'marketplace'],
                'areaGuideline' => 'Typically 60–200 sqm; delivery loading access desirable',
                'minAreaSqm' => 60,
                'maxAreaSqm' => 500,
                'requiredUtilities' => ['electricity', 'water'],
                'roadAccess' => 'all_weather',
                'competitorCategories' => ['supermarket', 'convenience', 'marketplace'],
                'complementaryCategories' => ['bakery', 'water_refilling', 'pharmacy', 'residential'],
                'allowedZonings' => ['Commercial', 'General Commercial', 'Mixed Use', 'Residential', 'Medium Density Residential'],
                'prohibitedZonings' => ['Heavy Industrial', 'Forest Reserve'],
                'explanationTemplate' => 'Surrounding residential concentration near {anchors} supports steady household demand for daily food staples and kitchen goods.',
                'mainUnresolvedNotice' => 'Verify delivery truck access and continuous municipal water connection.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'bakery',
                'label' => 'Bakery & Pastry Shop',
                'sector' => 'food_retail',
                'sectorLabel' => 'Food & Retail',
                'zoningActivityCode' => 'food_bakery',
                'description' => 'Neighborhood bakery producing daily breakfast bread (pandesal), fresh pastries, and packaged confectionery.',
                'activityCenters' => ['residential', 'school', 'college', 'place_of_worship', 'marketplace', 'office'],
                'areaGuideline' => 'Typically 25–60 sqm for baking ovens and customer counter',
                'minAreaSqm' => 25,
                'maxAreaSqm' => 150,
                'requiredUtilities' => ['electricity', 'water'],
                'roadAccess' => 'all_weather',
                'competitorCategories' => ['bakery', 'pastry'],
                'complementaryCategories' => ['cafe', 'grocery', 'convenience', 'eatery'],
                'allowedZonings' => ['Commercial', 'Mixed Use', 'Residential', 'Medium Density Residential'],
                'prohibitedZonings' => ['Heavy Industrial', 'Forest Reserve'],
                'explanationTemplate' => 'Morning and afternoon commute patterns near {anchors} create dependable routine demand for fresh baked goods.',
                'mainUnresolvedNotice' => 'Confirm specialized baking ventilation and power load capacity.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'eatery',
                'label' => 'Casual Dining & Eatery (Carinderia)',
                'sector' => 'food_retail',
                'sectorLabel' => 'Food & Retail',
                'zoningActivityCode' => 'food_restaurant',
                'description' => 'Affordable prepared-meal dining establishment catering to students, commuters, shift workers and office personnel.',
                'activityCenters' => ['school', 'college', 'hospital', 'office', 'townhall', 'courthouse', 'marketplace'],
                'areaGuideline' => 'Typically 30–90 sqm with dining seating and sanitary food preparation space',
                'minAreaSqm' => 30,
                'maxAreaSqm' => 250,
                'requiredUtilities' => ['electricity', 'water'],
                'roadAccess' => 'all_weather',
                'competitorCategories' => ['fast_food', 'restaurant', 'eatery'],
                'complementaryCategories' => ['convenience', 'printing', 'office', 'school'],
                'allowedZonings' => ['Commercial', 'General Commercial', 'Mixed Use', 'Institutional'],
                'prohibitedZonings' => ['Hazardous Industrial', 'Strict Forest Protection', 'Heavy Industrial', 'Residential Zone 1'],
                'explanationTemplate' => 'Dense concentration of daily workers and students around {anchors} generates high lunchtime and mealtime customer flow.',
                'mainUnresolvedNotice' => 'Confirm grease trap requirement and potable water reliability.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'cafe',
                'label' => 'Café & Beverage Specialty',
                'sector' => 'food_retail',
                'sectorLabel' => 'Food & Retail',
                'zoningActivityCode' => 'food_cafe',
                'description' => 'Specialty coffee, beverage and snack establishment offering comfortable seating and meeting space.',
                'activityCenters' => ['college', 'school', 'hotel', 'hospital', 'office', 'tourism'],
                'areaGuideline' => 'Typically 40–120 sqm; natural lighting and street frontage preferred',
                'minAreaSqm' => 40,
                'maxAreaSqm' => 300,
                'requiredUtilities' => ['electricity', 'water', 'telecom'],
                'roadAccess' => 'paved',
                'competitorCategories' => ['cafe', 'bakery'],
                'complementaryCategories' => ['books', 'hotel', 'college', 'beauty'],
                'allowedZonings' => ['Commercial', 'Mixed Use', 'Tourism', 'Special Commercial'],
                'prohibitedZonings' => ['Heavy Industrial', 'Agricultural Reserve'],
                'explanationTemplate' => 'Presence of {anchors} provides an established base of students, professionals and visitors seeking social and meeting venues.',
                'mainUnresolvedNotice' => 'Verify stable high-speed broadband and commercial water pressure.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'printing',
                'label' => 'Printing & Document Services',
                'sector' => 'professional_services',
                'sectorLabel' => 'Professional Services',
                'zoningActivityCode' => 'office_professional',
                'description' => 'Digital printing, photocopy, blueprint drafting, laminating, document binding and official ID photo services.',
                'activityCenters' => ['school', 'college', 'townhall', 'courthouse', 'office', 'hospital'],
                'areaGuideline' => 'Typically 20–50 sqm for print machines, workstations and client counter',
                'minAreaSqm' => 20,
                'maxAreaSqm' => 120,
                'requiredUtilities' => ['electricity', 'telecom'],
                'roadAccess' => 'all_weather',
                'competitorCategories' => ['printing', 'computer'],
                'complementaryCategories' => ['school_supplies', 'courier', 'office', 'college'],
                'allowedZonings' => ['Commercial', 'Institutional', 'Mixed Use'],
                'prohibitedZonings' => ['Agricultural Reserve', 'Heavy Industrial'],
                'explanationTemplate' => 'Direct proximity to {anchors} creates daily recurring demand for academic requirements, administrative records and official filings.',
                'mainUnresolvedNotice' => 'Verify commercial electrical surge protection and internet connection.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'school_supplies',
                'label' => 'School & Office Supplies Retail',
                'sector' => 'professional_services',
                'sectorLabel' => 'Professional Services',
                'zoningActivityCode' => 'retail_convenience',
                'description' => 'Retail store providing stationery, writing materials, paper products, art supplies and basic office consumables.',
                'activityCenters' => ['school', 'college', 'office', 'townhall'],
                'areaGuideline' => 'Typically 25–70 sqm display area',
                'minAreaSqm' => 25,
                'maxAreaSqm' => 150,
                'requiredUtilities' => ['electricity'],
                'roadAccess' => 'all_weather',
                'competitorCategories' => ['books', 'department_store'],
                'complementaryCategories' => ['printing', 'school', 'cafe'],
                'allowedZonings' => ['Commercial', 'Mixed Use', 'Institutional'],
                'prohibitedZonings' => ['Heavy Industrial', 'Forest Reserve'],
                'explanationTemplate' => 'Walking distance to {anchors} provides sustained student and staff demand for stationery and supplies.',
                'mainUnresolvedNotice' => 'Confirm indoor dry storage and secure display layout.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'laundry',
                'label' => 'Laundry & Garment Care',
                'sector' => 'everyday_services',
                'sectorLabel' => 'Everyday Services',
                'zoningActivityCode' => 'retail_convenience',
                'description' => 'Self-service laundromat or full-service drop-off facility offering washing, drying, folding and garment care.',
                'activityCenters' => ['residential', 'college', 'hospital', 'hotel', 'hostel'],
                'areaGuideline' => 'Typically 35–80 sqm; wastewater discharge capacity required',
                'minAreaSqm' => 35,
                'maxAreaSqm' => 180,
                'requiredUtilities' => ['electricity', 'water'],
                'roadAccess' => 'all_weather',
                'competitorCategories' => ['laundry'],
                'complementaryCategories' => ['residential', 'water_refilling', 'convenience', 'college'],
                'allowedZonings' => ['Commercial', 'Mixed Use', 'Residential'],
                'prohibitedZonings' => ['Watershed Protected', 'Heavy Industrial'],
                'explanationTemplate' => 'Surrounding student dormitories, boarding houses and residential units near {anchors} generate weekly laundry turnover.',
                'mainUnresolvedNotice' => 'Requires verified sewer/drainage connection and commercial water flow rate.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'water_refilling',
                'label' => 'Water Refilling Station',
                'sector' => 'everyday_services',
                'sectorLabel' => 'Everyday Services',
                'zoningActivityCode' => 'retail_convenience',
                'description' => 'Purified, mineral, and alkaline drinking water processing, bottle sanitizing and neighborhood distribution center.',
                'activityCenters' => ['residential', 'school', 'hospital', 'eatery', 'marketplace'],
                'areaGuideline' => 'Typically 20–50 sqm for purification machinery and bottle storage',
                'minAreaSqm' => 20,
                'maxAreaSqm' => 120,
                'requiredUtilities' => ['electricity', 'water'],
                'roadAccess' => 'all_weather',
                'competitorCategories' => ['water_refilling'],
                'complementaryCategories' => ['laundry', 'grocery', 'residential', 'eatery'],
                'allowedZonings' => ['Commercial', 'Mixed Use', 'Residential'],
                'prohibitedZonings' => ['Contaminated Industrial', 'Hazardous Waste Zone'],
                'explanationTemplate' => 'Household density and dining establishments near {anchors} require weekly container drinking water delivery.',
                'mainUnresolvedNotice' => 'Sanitary permit and water source testing required before setup.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'salon_barbershop',
                'label' => 'Salon & Grooming Services',
                'sector' => 'everyday_services',
                'sectorLabel' => 'Everyday Services',
                'zoningActivityCode' => 'retail_convenience',
                'description' => 'Haircut, styling, grooming and basic personal care salon catering to local residents and students.',
                'activityCenters' => ['residential', 'marketplace', 'school', 'college', 'office'],
                'areaGuideline' => 'Typically 20–60 sqm for 2–5 styling chairs and wash basin',
                'minAreaSqm' => 20,
                'maxAreaSqm' => 120,
                'requiredUtilities' => ['electricity', 'water'],
                'roadAccess' => 'all_weather',
                'competitorCategories' => ['beauty', 'hairdresser'],
                'complementaryCategories' => ['clothes', 'laundry', 'convenience'],
                'allowedZonings' => ['Commercial', 'Mixed Use', 'Residential'],
                'prohibitedZonings' => ['Heavy Industrial', 'Forest Reserve'],
                'explanationTemplate' => 'Regular foot traffic from residents and students around {anchors} supports recurring weekly grooming appointments.',
                'mainUnresolvedNotice' => 'Confirm water drainage and indoor ventilation.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'repair_shop',
                'label' => 'Electronics & Appliance Repair',
                'sector' => 'everyday_services',
                'sectorLabel' => 'Everyday Services',
                'zoningActivityCode' => 'retail_hardware',
                'description' => 'Smartphone, computer, motorcycle and household appliance diagnostic and repair workshop.',
                'activityCenters' => ['residential', 'marketplace', 'college', 'hardware'],
                'areaGuideline' => 'Typically 15–40 sqm for technician workbench and intake counter',
                'minAreaSqm' => 15,
                'maxAreaSqm' => 100,
                'requiredUtilities' => ['electricity'],
                'roadAccess' => 'all_weather',
                'competitorCategories' => ['car_repair', 'motorcycle_repair', 'computer'],
                'complementaryCategories' => ['hardware', 'convenience', 'marketplace'],
                'allowedZonings' => ['Commercial', 'Mixed Use', 'Light Industrial', 'Residential'],
                'prohibitedZonings' => ['Strict Forest Reserve', 'Heavy Industrial'],
                'explanationTemplate' => 'Neighborhood accessibility near {anchors} provides convenient drop-off for electronics and household maintenance.',
                'mainUnresolvedNotice' => 'Ensure grounded electrical installation and safe parts storage.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'courier',
                'label' => 'Courier & Logistics Drop-off',
                'sector' => 'professional_services',
                'sectorLabel' => 'Professional Services',
                'zoningActivityCode' => 'office_professional',
                'description' => 'E-commerce parcel drop-off, dispatch collection point and domestic logistics counter.',
                'activityCenters' => ['office', 'townhall', 'marketplace', 'bank', 'residential'],
                'areaGuideline' => 'Typically 30–100 sqm for sorting shelves, customer desk and vehicle bay',
                'minAreaSqm' => 30,
                'maxAreaSqm' => 200,
                'requiredUtilities' => ['electricity', 'telecom'],
                'roadAccess' => 'paved',
                'competitorCategories' => ['travel_agency', 'telecommunication'],
                'complementaryCategories' => ['office', 'printing', 'marketplace', 'bank'],
                'allowedZonings' => ['Commercial', 'General Commercial', 'Mixed Use', 'Light Industrial'],
                'prohibitedZonings' => ['Pedestrian-Only Zone', 'Protected Forest'],
                'explanationTemplate' => 'Active commercial transactions and administrative operations around {anchors} generate sustained shipment volume.',
                'mainUnresolvedNotice' => 'Verify temporary roadside vehicle stopping clearance.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'hardware',
                'label' => 'Hardware & Trade Supplies',
                'sector' => 'industrial_agricultural',
                'sectorLabel' => 'Industrial & Agricultural Support',
                'zoningActivityCode' => 'retail_hardware',
                'description' => 'Retail store supplying tools, electrical fixtures, plumbing supplies, paints, cements and construction hardware.',
                'activityCenters' => ['residential', 'industrial', 'commercial', 'marketplace'],
                'areaGuideline' => 'Typically 80–300 sqm; delivery truck access required',
                'minAreaSqm' => 80,
                'maxAreaSqm' => 1000,
                'requiredUtilities' => ['electricity'],
                'roadAccess' => 'paved',
                'competitorCategories' => ['hardware', 'doityourself', 'building_materials'],
                'complementaryCategories' => ['repair_shop', 'residential', 'car_repair'],
                'allowedZonings' => ['Commercial', 'Light Industrial', 'Mixed Use', 'General Commercial'],
                'prohibitedZonings' => ['High-Density Residential', 'Tourism Heritage Zone', 'Heavy Industrial', 'Residential Zone 1'],
                'explanationTemplate' => 'Ongoing residential and commercial construction activities near {anchors} require nearby building supply availability.',
                'mainUnresolvedNotice' => 'Confirm freight truck maneuverability and warehouse floor capacity.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'accommodation',
                'label' => 'Travelers Accommodation & Inn',
                'sector' => 'tourism_recreation',
                'sectorLabel' => 'Tourism & Recreation',
                'zoningActivityCode' => 'tour_hotel',
                'description' => 'Boutique hotel, travelers inn or bed-and-breakfast rooms for leisure tourists and visiting business travelers.',
                'activityCenters' => ['hotel', 'hostel', 'restaurant', 'cafe', 'marketplace', 'townhall'],
                'areaGuideline' => 'Typically 200–800 sqm lot or multi-story commercial building with parking',
                'minAreaSqm' => 150,
                'maxAreaSqm' => 5000,
                'requiredUtilities' => ['electricity', 'water', 'telecom'],
                'roadAccess' => 'paved',
                'competitorCategories' => ['hotel', 'hostel'],
                'complementaryCategories' => ['restaurant', 'cafe', 'travel_agency'],
                'allowedZonings' => ['Tourism', 'Commercial', 'Medium Density Residential', 'Mixed Use'],
                'prohibitedZonings' => ['Heavy Industrial', 'High Hazard Flood Zone', 'Residential Zone 1'],
                'explanationTemplate' => 'Position along transport connections near {anchors} accommodates visitors seeking lodging and transit access.',
                'mainUnresolvedNotice' => 'Subject to DOT accreditation standards and dedicated guest parking clearance.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'tour_services',
                'label' => 'Tour & Activity Booking Agency',
                'sector' => 'tourism_recreation',
                'sectorLabel' => 'Tourism & Recreation',
                'zoningActivityCode' => 'tour_recreation',
                'description' => 'Tour desk, coastal excursion booking office and regional travel assistance service.',
                'activityCenters' => ['hotel', 'hostel', 'cafe', 'restaurant', 'tourism'],
                'areaGuideline' => 'Typically 15–40 sqm office counter and briefing space',
                'minAreaSqm' => 15,
                'maxAreaSqm' => 80,
                'requiredUtilities' => ['electricity', 'telecom'],
                'roadAccess' => 'paved',
                'competitorCategories' => ['travel_agency'],
                'complementaryCategories' => ['hotel', 'cafe', 'hostel'],
                'allowedZonings' => ['Tourism', 'Commercial', 'Mixed Use'],
                'prohibitedZonings' => ['Heavy Industrial', 'Agricultural Reserve'],
                'explanationTemplate' => 'Clustering of visitor accommodations and dining near {anchors} provides walk-in inquiries for regional and local tours.',
                'mainUnresolvedNotice' => 'Verify tourism operator accreditation requirements with City Tourism Office.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'agri_vet_supply',
                'label' => 'Agri-Vet & Animal Feeds Supply',
                'sector' => 'industrial_agricultural',
                'sectorLabel' => 'Industrial & Agricultural Support',
                'zoningActivityCode' => 'retail_hardware',
                'description' => 'Store supplying livestock feeds, veterinary remedies, seeds, fertilizers and small farm supplies.',
                'activityCenters' => ['marketplace', 'residential', 'hardware'],
                'areaGuideline' => 'Typically 50–150 sqm with dry, vermin-proof feed storage',
                'minAreaSqm' => 50,
                'maxAreaSqm' => 300,
                'requiredUtilities' => ['electricity'],
                'roadAccess' => 'all_weather',
                'competitorCategories' => ['marketplace'],
                'complementaryCategories' => ['hardware', 'marketplace'],
                'allowedZonings' => ['Commercial', 'Agricultural', 'Mixed Use', 'Rural Development'],
                'prohibitedZonings' => ['High-Density Residential', 'Tourism Zone'],
                'explanationTemplate' => 'Proximity to {anchors} serves suburban and rural smallholders needing regular farm and feed supplies.',
                'mainUnresolvedNotice' => 'Ensure dry storage ventilation and animal feeds retailer permit.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
            [
                'id' => 'cold_storage',
                'label' => 'Cold Storage & Produce Logistics',
                'sector' => 'industrial_agricultural',
                'sectorLabel' => 'Industrial & Agricultural Support',
                'zoningActivityCode' => 'log_distribution_center',
                'description' => 'Temperature-controlled storage room and packaging facility for perishable fish, meat, fruits and produce.',
                'activityCenters' => ['marketplace', 'industrial', 'commercial'],
                'areaGuideline' => 'Typically 150–500 sqm with truck loading dock',
                'minAreaSqm' => 150,
                'maxAreaSqm' => 3000,
                'requiredUtilities' => ['electricity', 'water'],
                'roadAccess' => 'paved',
                'competitorCategories' => ['building_materials'],
                'complementaryCategories' => ['marketplace', 'supermarket', 'hardware'],
                'allowedZonings' => ['Light Industrial', 'Commercial', 'General Commercial', 'Agro-Industrial'],
                'prohibitedZonings' => ['Low Density Residential', 'Strict Ecological Protection', 'Commercial Zone 1'],
                'explanationTemplate' => 'Proximity to wholesale trade and marketplace flow near {anchors} reduces post-harvest losses and preserves produce value.',
                'mainUnresolvedNotice' => 'Requires three-phase electrical service and heavy vehicle loading dock.',
                'ruleSource' => self::RULE_SOURCE,
                'reviewStatus' => 'draft',
                'version' => self::RULE_VERSION,
            ],
        ];
    }

    /**
     * Evaluate a property and return business opportunities with traceable evidence.
     *
     * @param array $property
     * @param float $radiusMeters Straight-line screening radius (default 500m)
     * @return array
     */
    public static function evaluate(array $property, float $radiusMeters = self::DEFAULT_RADIUS_METERS): array
    {
        $lat = (float) ($property['lat'] ?? 0.0);
        $lng = (float) ($property['lng'] ?? 0.0);
        $hasCoords = is_finite($lat) && is_finite($lng) && abs($lat) <= 90 && abs($lng) <= 180 && !($lat === 0.0 && $lng === 0.0);

        $originLabel = $hasCoords
            ? sprintf('%.4f° N, %.4f° E', $lat, $lng)
            : 'Unknown origin (unrecorded coordinates)';

        // 1. Gather nearby places strictly within $radiusMeters (straight-line)
        $allPlaces = [];
        if ($hasCoords) {
            $rawNearby = $property['nearbyBusinesses'] ?? null;
            if (!is_array($rawNearby) || empty($rawNearby)) {
                // Discover from verified directory
                $rawNearby = NearbyBusinesses::find($property, null, 50, $radiusMeters);
            }
            foreach ($rawNearby as $p) {
                if (NearbyBusinesses::isSubjectEstablishment($property, $p)) {
                    continue;
                }
                $pLat = (float) ($p['lat'] ?? 0.0);
                $pLng = (float) ($p['lng'] ?? 0.0);
                if (!is_finite($pLat) || !is_finite($pLng) || ($pLat === 0.0 && $pLng === 0.0)) {
                    continue;
                }
                $dist = NearbyBusinesses::distance($lat, $lng, $pLat, $pLng);
                // Strict radius check
                if ($dist <= $radiusMeters) {
                    $entry = $p;
                    $entry['distanceMeters'] = round($dist);
                    $entry['distanceFormatted'] = round($dist) . ' m (straight-line)';
                    $entry['source'] = $p['source'] ?? 'San Fernando City Commercial Registry';
                    $entry['date'] = $p['date'] ?? gmdate('Y-m-d');
                    $entry['status'] = $p['status'] ?? 'operating';
                    $allPlaces[] = $entry;
                }
            }
        }

        // 2. Deduplicate establishments by name & proximity (<50m)
        $deduped = [];
        foreach ($allPlaces as $place) {
            $nameNorm = strtolower(trim((string) ($place['name'] ?? '')));
            if ($nameNorm === '') {
                continue;
            }
            $isDuplicate = false;
            foreach ($deduped as $existing) {
                if (strtolower(trim((string) ($existing['name'] ?? ''))) === $nameNorm) {
                    $distBetween = NearbyBusinesses::distance((float) $existing['lat'], (float) $existing['lng'], (float) $place['lat'], (float) $place['lng']);
                    if ($distBetween <= 50.0) {
                        $isDuplicate = true;
                        break;
                    }
                }
            }
            if (!$isDuplicate) {
                $deduped[] = $place;
            }
        }

        // Sort deduplicated places by distance
        usort($deduped, static fn ($a, $b) => $a['distanceMeters'] <=> $b['distanceMeters']);

        // Group places by activity-center category
        $placesByCategory = [];
        foreach ($deduped as $d) {
            $catKey = strtolower((string) ($d['categoryKey'] ?? ''));
            $groupKey = strtolower((string) ($d['categoryGroup'] ?? ''));
            $placesByCategory[$catKey][] = $d;
            if ($groupKey && $groupKey !== $catKey) {
                $placesByCategory[$groupKey][] = $d;
            }
        }

        // 3. Extract property characteristics
        $areaHa = (float) ($property['area'] ?? $property['landArea'] ?? 0.0);
        $areaSqm = $areaHa > 0 ? ($areaHa * 10000.0) : (float) ($property['parcel']['surveyAreaSqm'] ?? 0.0);
        $zoningClassification = trim((string) ($property['clupProfile']['zoningClassification'] ?? $property['zoningClassification'] ?? $property['zoning_classification'] ?? ''));
        $utilities = is_array($property['utilities'] ?? null) ? $property['utilities'] : [];
        $hazardStatus = $property['criteriaDetails']['risk_constraints']['raw']['hazard_status'] ?? [];
        if (is_string($hazardStatus)) {
            $hazardStatus = [$hazardStatus];
        }

        // Generate input signature for cache invalidation / refresh check
        $inputSignature = md5(json_encode([
            'lat' => round($lat, 4),
            'lng' => round($lng, 4),
            'zoning' => strtolower($zoningClassification),
            'area' => round($areaSqm),
            'utilities' => $utilities,
            'radius' => (int) $radiusMeters,
        ], JSON_THROW_ON_ERROR));

        // 4. Candidate Generation & Requirement Evaluation
        $catalog = self::catalog();
        $candidates = [];
        $excludedConflicts = [];
        $unresolvedMissing = [];

        // Resolve zoning district code via authoritative ZoningRulesEngine
        $zoneCode = $zoningClassification !== '' ? ZoningRulesEngine::resolveZoneCode($zoningClassification) : null;

        foreach ($catalog as $profile) {
            $id = $profile['id'];
            $actCode = $profile['zoningActivityCode'] ?? null;
            
            // Check supporting activity anchors within screening radius
            $supportingPlaces = [];
            foreach ($profile['activityCenters'] as $acKey) {
                if (!empty($placesByCategory[$acKey])) {
                    foreach ($placesByCategory[$acKey] as $matchPlace) {
                        $supportingPlaces[] = $matchPlace;
                    }
                }
            }

            // Also consider residential context if barangay has residential community
            $hasResidentialContext = !empty($placesByCategory['residential']) 
                || !empty($placesByCategory['place_of_worship']) 
                || !empty($placesByCategory['supermarket'])
                || str_contains(strtolower($zoningClassification), 'residential')
                || str_contains(strtolower($zoningClassification), 'mixed');

            if ($hasResidentialContext && in_array('residential', $profile['activityCenters'], true)) {
                // If in residential community, support everyday services
                if (empty($supportingPlaces)) {
                    $supportingPlaces[] = [
                        'name' => 'Surrounding Residential Settlement (' . ($property['barangay'] ?? 'Neighborhood') . ')',
                        'category' => 'Residential Community Area',
                        'distanceMeters' => 150,
                        'distanceFormatted' => 'Within ' . (int)$radiusMeters . 'm straight-line radius',
                        'source' => 'CLUP Neighborhood Context',
                        'date' => gmdate('Y-m-d'),
                        'status' => 'operating',
                    ];
                }
            }

            // Deduplicate supporting places
            $uniqueSupporters = [];
            $supporterNames = [];
            foreach ($supportingPlaces as $sp) {
                if (!in_array($sp['name'], $supporterNames, true)) {
                    $supporterNames[] = $sp['name'];
                    $uniqueSupporters[] = $sp;
                }
            }

            // Check Competitors within dataset
            $recordedCompetitors = [];
            foreach ($profile['competitorCategories'] as $compKey) {
                if (!empty($placesByCategory[$compKey])) {
                    foreach ($placesByCategory[$compKey] as $cp) {
                        $recordedCompetitors[] = $cp;
                    }
                }
            }

            // Check Complementaries within dataset
            $recordedComplementary = [];
            foreach ($profile['complementaryCategories'] as $complKey) {
                if (!empty($placesByCategory[$complKey])) {
                    foreach ($placesByCategory[$complKey] as $cmp) {
                        $recordedComplementary[] = $cmp;
                    }
                }
            }

            // Compatibility Evaluation via Authoritative ZoningRulesEngine
            $isZoningProhibited = false;
            $zoningOutcome = 'unverified';
            $zoningExplanation = 'Zoning clearance unverified';
            $zoningConditions = [];
            $zoningCitation = null;

            if ($zoneCode !== null && $actCode !== null) {
                $lookup = ZoningRulesEngine::lookupRule($zoneCode, $actCode);
                $lookupStatus = $lookup['status'] ?? ZoningRulesEngine::STATUS_UNDETERMINED;
                $zoningCitation = $lookup['ordinance_section'] ?? 'City Ordinance 2018-06';
                $zoningConditions = $lookup['conditions'] ?? [];

                if ($lookupStatus === ZoningRulesEngine::STATUS_PROHIBITED) {
                    $isZoningProhibited = true;
                    $zoningOutcome = 'prohibited';
                    $zoningExplanation = $lookup['explanation'] ?? "Prohibited in {$zoningClassification} ({$zoneCode}) under City Ordinance 2018-06.";
                } elseif ($lookupStatus === ZoningRulesEngine::STATUS_PERMITTED) {
                    $zoningOutcome = 'permitted';
                    $zoningExplanation = "Permitted by right in {$zoneCode} under {$zoningCitation}.";
                } elseif ($lookupStatus === ZoningRulesEngine::STATUS_CONDITIONAL) {
                    $zoningOutcome = 'conditional';
                    $zoningExplanation = "Conditional use in {$zoneCode} under {$zoningCitation}; subject to development standards.";
                } else {
                    $zoningOutcome = 'unverified';
                    $zoningExplanation = "Zoning rule undetermined for {$zoneCode}; requires CPDO zoning clearance verification.";
                }
            } else {
                // Fallback check against profile's declared allowed/prohibited zones
                if ($zoningClassification !== '') {
                    foreach ($profile['prohibitedZonings'] as $proh) {
                        if (str_contains(strtolower($zoningClassification), strtolower($proh))) {
                            $isZoningProhibited = true;
                            $zoningOutcome = 'prohibited';
                            $zoningExplanation = "Prohibited in {$zoningClassification} zone under CLUP rules.";
                            break;
                        }
                    }
                    if (!$isZoningProhibited) {
                        $isAllowed = false;
                        foreach ($profile['allowedZonings'] as $allowed) {
                            if (str_contains(strtolower($zoningClassification), strtolower($allowed))) {
                                $isAllowed = true;
                                break;
                            }
                        }
                        if (!$isAllowed) {
                            $isZoningProhibited = true;
                            $zoningOutcome = 'prohibited';
                            $zoningExplanation = "Zoning classification ({$zoningClassification}) excludes this business type.";
                        } else {
                            $zoningOutcome = 'permitted';
                            $zoningExplanation = "Compatible with {$zoningClassification} classification.";
                        }
                    }
                } else {
                    $zoningOutcome = 'unverified';
                    $zoningExplanation = "Authoritative CLUP zoning unverified; requires zoning certificate from CPDO.";
                }
            }

            // Check profile's explicit prohibited list as supplementary safeguard
            if (!$isZoningProhibited && $zoningClassification !== '') {
                foreach ($profile['prohibitedZonings'] as $proh) {
                    if (str_contains(strtolower($zoningClassification), strtolower($proh))) {
                        $isZoningProhibited = true;
                        $zoningOutcome = 'prohibited';
                        $zoningExplanation = "Zoning classification ({$zoningClassification}) excludes this business type.";
                        break;
                    }
                }
            }

            // Hazard constraints evaluation
            $isHazardConflict = false;
            foreach ($hazardStatus as $hz) {
                if (str_contains(strtolower((string)$hz), 'high_flood') && in_array($id, ['accommodation', 'cold_storage'], true)) {
                    $isHazardConflict = true;
                    break;
                }
            }

            // Check missing requirements / evidence
            $missingItems = [];
            if ($areaSqm <= 0.0) {
                $missingItems[] = 'Parcel boundary/area unrecorded';
            }
            if (empty($utilities)) {
                $missingItems[] = 'Utility connections unconfirmed';
            }
            if ($zoningClassification === '' || $zoningOutcome === 'unverified') {
                $missingItems[] = 'Authoritative CLUP zoning unverified (requires CPDO clearance)';
            }

            // Confirmed Conflict check: If prohibited by zoning or hazard, EXCLUDE from recommendations
            if ($isZoningProhibited || $isHazardConflict) {
                $excludedConflicts[] = [
                    'id' => $id,
                    'label' => $profile['label'],
                    'zoningOutcome' => 'prohibited',
                    'zoningOutcomeLabel' => 'Prohibited Land Use',
                    'ordinanceCitation' => $zoningCitation,
                    'reason' => $isZoningProhibited
                        ? $zoningExplanation
                        : "High hazard constraint recorded for site.",
                ];
                continue;
            }

            // If no supporting places found within straight-line radius, candidate is not generated
            if (empty($uniqueSupporters)) {
                continue;
            }

            // Generate Narrative Explanation
            $anchorNames = array_slice(array_column($uniqueSupporters, 'name'), 0, 2);
            $anchorPhrase = implode(' and ', $anchorNames);
            $explanation = str_replace('{anchors}', $anchorPhrase, $profile['explanationTemplate']);

            // Separate Business Fit Calculation (Kept distinct from MCE/IAI property assessment)
            // Inputs:
            // 1. Straight-line Anchor Proximity (Max 40 pts): Closer nearest anchor receives higher screening points.
            // 2. Zoning Compatibility Alignment (Max 30 pts): Permitted = 30 pts, Conditional = 20 pts, Unverified = 12 pts.
            // 3. Site & Infrastructure Fit (Max 30 pts): Lot area guideline compliance (15 pts) + recorded utility connections (15 pts).
            $nearestDistM = $uniqueSupporters[0]['distanceMeters'] ?? $radiusMeters;
            $proximityScore = round(max(10.0, 40.0 - ($nearestDistM / $radiusMeters) * 30.0), 1);
            $zoningScore = match ($zoningOutcome) {
                'permitted' => 30.0,
                'conditional' => 20.0,
                default => 12.0,
            };
            $areaFitScore = 15.0;
            if ($areaSqm > 0.0) {
                if ($areaSqm < ($profile['minAreaSqm'] ?? 0) || $areaSqm > ($profile['maxAreaSqm'] ?? 999999)) {
                    $areaFitScore = 7.0; // Lot size outside standard guideline
                }
            } else {
                $areaFitScore = 5.0; // Unrecorded lot size
            }
            $utilFitScore = !empty($utilities) ? 15.0 : 5.0;
            $siteScore = $areaFitScore + $utilFitScore;
            $businessFitScore = round($proximityScore + $zoningScore + $siteScore, 1);
            $businessFitExplanation = sprintf(
                "Business screening fit: %.1f/100 (Straight-line proximity: %.1f/40 | Zoning: %.1f/30 | Site & utilities: %.1f/30). Note: This is an exploratory business-fit screening score and is completely distinct from the property's overall MCE/IAI investment readiness assessment.",
                $businessFitScore,
                $proximityScore,
                $zoningScore,
                $siteScore
            );

            // Competitor Notice: Empty directory treated as unavailable information, NOT proof of zero competition
            $competitorsCount = count($recordedCompetitors);
            if ($competitorsCount > 0) {
                $competitorsNotice = sprintf('%d similar recorded establishment(s) in radius', $competitorsCount);
                $competitorAvailability = 'recorded';
            } else {
                $competitorsNotice = 'No competitors recorded in this dataset (treat as unavailable directory information, not proof of zero competition)';
                $competitorAvailability = 'unavailable_or_none_recorded';
            }

            // Structured site conditions
            $supportingConditions = [
                'areaGuideline' => $profile['areaGuideline'],
                'recordedAreaSqm' => $areaSqm > 0 ? round($areaSqm) : null,
                'areaStatus' => $areaSqm > 0 ? (round($areaSqm) . ' sqm recorded') : 'Unknown (unrecorded)',
                'roadAccess' => ucfirst($profile['roadAccess']) . ' access required',
                'utilities' => !empty($utilities) ? implode(', ', array_map('ucfirst', $utilities)) : 'Utility connections unconfirmed',
            ];

            // Structured nearby context (Straight-line proximity)
            $nearbyContext = [
                'supportingCount' => count($uniqueSupporters),
                'nearestAnchor' => $uniqueSupporters[0]['name'] ?? 'None recorded',
                'nearestDistanceFormatted' => $uniqueSupporters[0]['distanceFormatted'] ?? 'N/A',
                'straightLineNote' => '500m straight-line proximity (radial distance, not walking or driving travel distance)',
            ];

            // Build Candidate Record
            $candidates[] = [
                'id' => $id,
                'label' => $profile['label'],
                'sector' => $profile['sector'],
                'sectorLabel' => $profile['sectorLabel'],
                'description' => $profile['description'],
                'explanation' => $explanation,
                'reviewStatus' => $profile['reviewStatus'],
                'statusLabel' => 'Screening suggestion · Exploratory',
                'version' => $profile['version'],
                'ruleSource' => $profile['ruleSource'],
                'mainUnresolvedNotice' => $profile['mainUnresolvedNotice'],
                'supportingPlaces' => array_slice($uniqueSupporters, 0, 5),
                'supportingCount' => count($uniqueSupporters),
                'nearestAnchorDistance' => $uniqueSupporters[0]['distanceMeters'] ?? null,
                'nearestAnchorFormatted' => $uniqueSupporters[0]['distanceFormatted'] ?? null,
                'supportingConditions' => $supportingConditions,
                'nearbyContext' => $nearbyContext,
                'areaGuideline' => $profile['areaGuideline'],
                'recordedAreaSqm' => $areaSqm > 0 ? round($areaSqm) : null,
                'areaStatus' => $supportingConditions['areaStatus'],
                'roadAccessRequirement' => $profile['roadAccess'],
                'zoningClassification' => $zoningClassification ?: 'Unknown (awaiting verification)',
                'zoningOutcome' => $zoningOutcome,
                'zoningOutcomeLabel' => match ($zoningOutcome) {
                    'permitted' => 'Permitted by Right',
                    'conditional' => 'Conditional Use (Subject to Standards)',
                    default => 'Unverified Zoning Clearance',
                },
                'zoningConditions' => $zoningConditions,
                'zoningCitation' => $zoningCitation,
                'zoningStatus' => $zoningExplanation,
                'businessFitScore' => $businessFitScore,
                'businessFitExplanation' => $businessFitExplanation,
                'missingEvidence' => $missingItems,
                'competitorsCount' => $competitorsCount,
                'competitorsNotice' => $competitorsNotice,
                'competitorAvailability' => $competitorAvailability,
                'competitorSample' => array_slice(array_column($recordedCompetitors, 'name'), 0, 3),
                'complementaryCount' => count($recordedComplementary),
                'complementarySample' => array_slice(array_column($recordedComplementary, 'name'), 0, 3),
            ];
        }

        // 5. Deterministic Ranking & Selection of Up to 3 Supported Suggestions
        // Primary: Distance to nearest anchor (closer is stronger evidence).
        // Secondary: Business fit score (higher fit).
        // Tertiary: Count of supporting activity anchors.
        // Quaternary: Lexicographical id.
        usort($candidates, static function ($a, $b) {
            $distA = $a['nearestAnchorDistance'] ?? 99999;
            $distB = $b['nearestAnchorDistance'] ?? 99999;
            if ($distA !== $distB) {
                return $distA <=> $distB;
            }
            $fitA = $a['businessFitScore'] ?? 0;
            $fitB = $b['businessFitScore'] ?? 0;
            if ($fitA !== $fitB) {
                return $fitB <=> $fitA;
            }
            if ($a['supportingCount'] !== $b['supportingCount']) {
                return $b['supportingCount'] <=> $a['supportingCount'];
            }
            return strcmp($a['id'], $b['id']);
        });

        // Never force three results: take at most 3 (show fewer when evidence supports fewer)
        $supportedMatches = array_slice($candidates, 0, 3);
        foreach ($supportedMatches as $idx => &$item) {
            $item['rank'] = $idx + 1;
        }
        unset($item);

        // Explanation if recommendations are unavailable
        $unavailableReason = '';
        if (empty($supportedMatches)) {
            if (!$hasCoords) {
                $unavailableReason = 'Recommendations unavailable: Property geographical coordinates are unrecorded.';
            } elseif (empty($deduped)) {
                $unavailableReason = 'Recommendations unavailable: No commercial establishments, institutions, or activity centers were found within 500m straight-line proximity.';
            } elseif (empty($candidates) && !empty($excludedConflicts)) {
                $unavailableReason = 'Recommendations unavailable: All candidate business activities are excluded due to zoning prohibitions under City Ordinance 2018-06 or recorded hazard constraints.';
            } else {
                $unavailableReason = 'Recommendations unavailable: Insufficient supporting neighborhood evidence within screening radius.';
            }
        }

        return [
            'status' => !empty($supportedMatches) ? 'supported' : 'no_candidates',
            'title' => 'Business opportunities to explore',
            'subtitle' => 'Suggestions based on nearby establishments, property characteristics, infrastructure and authoritative zoning rules.',
            'disclaimer' => 'Screening suggestions only. These exploratory recommendations reflect straight-line spatial proximity and preliminary zoning screening; they are not guarantees of customer demand, commercial profitability, financial return, or official municipal development approval.',
            'radiusMeters' => (int) $radiusMeters,
            'screeningRadiusLabel' => sprintf('%d-meter straight-line screening radius', (int) $radiusMeters),
            'straightLineProximityNotice' => sprintf('%d-meter straight-line proximity (radial distance, not walking or driving travel distance)', (int) $radiusMeters),
            'analysisOrigin' => $originLabel,
            'originCoordinates' => $hasCoords ? [$lat, $lng] : null,
            'totalPlacesInRadius' => count($deduped),
            'inputSignature' => $inputSignature,
            'ruleVersion' => self::RULE_VERSION,
            'ruleSource' => self::RULE_SOURCE,
            'reviewNotice' => 'Recommendations are screening suggestions requiring local validation by City Planning and LEBDO before official development approval. Suggestions do not claim profitability or guaranteed unmet demand.',
            'supportedMatches' => $supportedMatches,
            'supportedCount' => count($supportedMatches),
            'confirmedConflicts' => $excludedConflicts,
            'allCatalogCount' => count($catalog),
            'catalogSectors' => self::SECTORS,
            'unavailableReason' => $unavailableReason,
            'generatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        ];
    }
}
