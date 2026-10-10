<?php
declare(strict_types=1);

namespace App\Support;

require_once __DIR__ . '/NearbyBusinesses.php';

/**
 * Business Opportunities Matching Engine for LOCUS-SF properties.
 * 
 * Traceable neighborhood matching based on nearby establishments, property characteristics,
 * infrastructure readiness and available zoning information.
 * 
 * Does not claim profitability, guaranteed returns, or unmet customer demand.
 * Seed relationships are draft rules requiring local validation.
 */
final class BusinessOpportunities
{
    public const DEFAULT_RADIUS_METERS = 500.0;
    public const RULE_VERSION = 'v1.0-draft';
    public const RULE_SOURCE = 'LOCUS-SF Local Economic Benchmark (City Planning & LEBDO Seed Rules)';

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
                'prohibitedZonings' => ['Hazardous Industrial', 'Strict Forest Protection'],
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
                'prohibitedZonings' => ['High-Density Residential', 'Tourism Heritage Zone'],
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
                'prohibitedZonings' => ['Heavy Industrial', 'High Hazard Flood Zone'],
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
                'prohibitedZonings' => ['Low Density Residential', 'Strict Ecological Protection'],
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

        // 1. Gather nearby places strictly within $radiusMeters
        $allPlaces = [];
        if ($hasCoords) {
            $rawNearby = $property['nearbyBusinesses'] ?? null;
            if (!is_array($rawNearby) || empty($rawNearby)) {
                // Discover from verified directory
                $rawNearby = NearbyBusinesses::find($lat, $lng, 50, $radiusMeters);
            }
            foreach ($rawNearby as $p) {
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
                    $entry['distanceFormatted'] = round($dist) . ' m';
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
        $zoningClassification = trim((string) ($property['clupProfile']['zoningClassification'] ?? $property['zoningClassification'] ?? ''));
        $zoningStatus = strtolower(trim((string) ($property['criteriaDetails']['zoning_compatibility']['raw']['zoning_status'] ?? '')));
        $utilities = is_array($property['utilities'] ?? null) ? $property['utilities'] : [];
        $hazardStatus = $property['criteriaDetails']['risk_constraints']['raw']['hazard_status'] ?? [];
        if (is_string($hazardStatus)) {
            $hazardStatus = [$hazardStatus];
        }

        // 4. Candidate Generation & Requirement Evaluation
        $catalog = self::catalog();
        $candidates = [];
        $excludedConflicts = [];
        $unresolvedMissing = [];

        foreach ($catalog as $profile) {
            $id = $profile['id'];
            
            // Check supporting activity anchors
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
                        'distanceFormatted' => 'Within ' . (int)$radiusMeters . 'm radius',
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

            // Compatibility Evaluation
            $isZoningProhibited = false;
            $zoningExplanation = 'Zoning unconfirmed';
            if ($zoningClassification !== '') {
                foreach ($profile['prohibitedZonings'] as $proh) {
                    if (str_contains(strtolower($zoningClassification), strtolower($proh))) {
                        $isZoningProhibited = true;
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
                        $zoningExplanation = "Zoning classification ({$zoningClassification}) excludes this business type.";
                    } else {
                        $zoningExplanation = "Compatible with {$zoningClassification} classification.";
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

            // Check missing requirements
            $missingItems = [];
            if ($areaSqm <= 0.0) {
                $missingItems[] = 'Parcel boundary/area unrecorded';
            }
            if (empty($utilities)) {
                $missingItems[] = 'Utility connections unconfirmed';
            }
            if ($zoningClassification === '') {
                $missingItems[] = 'Authoritative CLUP zoning unverified';
            }

            // Confirmed Conflict check
            if ($isZoningProhibited || $isHazardConflict) {
                $excludedConflicts[] = [
                    'id' => $id,
                    'label' => $profile['label'],
                    'reason' => $isZoningProhibited
                        ? "Zoning classification ({$zoningClassification}) excludes this business type."
                        : "High hazard constraint recorded for site.",
                ];
                continue;
            }

            // If no supporting places found within radius, candidate is not generated
            if (empty($uniqueSupporters)) {
                continue;
            }

            // Generate Explanation
            $anchorNames = array_slice(array_column($uniqueSupporters, 'name'), 0, 2);
            $anchorPhrase = implode(' and ', $anchorNames);
            $explanation = str_replace('{anchors}', $anchorPhrase, $profile['explanationTemplate']);

            // Build Candidate Record
            $candidates[] = [
                'id' => $id,
                'label' => $profile['label'],
                'sector' => $profile['sector'],
                'sectorLabel' => $profile['sectorLabel'],
                'description' => $profile['description'],
                'explanation' => $explanation,
                'reviewStatus' => $profile['reviewStatus'],
                'statusLabel' => 'Draft screening · Unvalidated',
                'version' => $profile['version'],
                'ruleSource' => $profile['ruleSource'],
                'mainUnresolvedNotice' => $profile['mainUnresolvedNotice'],
                'supportingPlaces' => array_slice($uniqueSupporters, 0, 5),
                'supportingCount' => count($uniqueSupporters),
                'nearestAnchorDistance' => $uniqueSupporters[0]['distanceMeters'] ?? null,
                'nearestAnchorFormatted' => $uniqueSupporters[0]['distanceFormatted'] ?? null,
                'areaGuideline' => $profile['areaGuideline'],
                'recordedAreaSqm' => $areaSqm > 0 ? round($areaSqm) : null,
                'areaStatus' => $areaSqm > 0 ? (round($areaSqm) . ' sqm recorded') : 'Unknown (unrecorded)',
                'roadAccessRequirement' => $profile['roadAccess'],
                'zoningClassification' => $zoningClassification ?: 'Unknown (awaiting verification)',
                'zoningStatus' => $zoningExplanation,
                'missingEvidence' => $missingItems,
                'competitorsCount' => count($recordedCompetitors),
                'competitorsNotice' => count($recordedCompetitors) > 0
                    ? count($recordedCompetitors) . ' similar operating establishments recorded in radius'
                    : 'No competitors recorded in this dataset',
                'competitorSample' => array_slice(array_column($recordedCompetitors, 'name'), 0, 3),
                'complementaryCount' => count($recordedComplementary),
                'complementarySample' => array_slice(array_column($recordedComplementary, 'name'), 0, 3),
            ];
        }

        // 5. Deterministic Ranking & Selection of Up to 3 Supported Suggestions
        // Primary: Distance to nearest anchor (closer is stronger evidence).
        // Secondary: Count of supporting activity anchors.
        // Tertiary: Lexicographical id.
        usort($candidates, static function ($a, $b) {
            $distA = $a['nearestAnchorDistance'] ?? 99999;
            $distB = $b['nearestAnchorDistance'] ?? 99999;
            if ($distA !== $distB) {
                return $distA <=> $distB;
            }
            if ($a['supportingCount'] !== $b['supportingCount']) {
                return $b['supportingCount'] <=> $a['supportingCount'];
            }
            return strcmp($a['id'], $b['id']);
        });

        // Never force three results: take at most 3
        $supportedMatches = array_slice($candidates, 0, 3);
        foreach ($supportedMatches as $idx => &$item) {
            $item['rank'] = $idx + 1;
        }
        unset($item);

        return [
            'status' => !empty($supportedMatches) ? 'supported' : 'no_candidates',
            'title' => 'Business opportunities to explore',
            'subtitle' => 'Suggestions based on nearby establishments, property characteristics, infrastructure and available zoning information.',
            'radiusMeters' => (int) $radiusMeters,
            'screeningRadiusLabel' => sprintf('%d-meter straight-line screening radius', (int) $radiusMeters),
            'analysisOrigin' => $originLabel,
            'originCoordinates' => $hasCoords ? [$lat, $lng] : null,
            'totalPlacesInRadius' => count($deduped),
            'ruleVersion' => self::RULE_VERSION,
            'ruleSource' => self::RULE_SOURCE,
            'reviewNotice' => 'Seed relationships are draft exploratory rules requiring local review by City Planning and LEBDO before official validation. Suggestions do not claim profitability or guaranteed unmet demand.',
            'supportedMatches' => $supportedMatches,
            'supportedCount' => count($supportedMatches),
            'confirmedConflicts' => $excludedConflicts,
            'allCatalogCount' => count($catalog),
            'catalogSectors' => self::SECTORS,
            'generatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        ];
    }
}
