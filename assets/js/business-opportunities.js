/**
 * LOCUS-SF Business Opportunities to Explore Engine & UI Renderer
 * 
 * Traceable neighborhood matching based on nearby establishments, property characteristics,
 * infrastructure readiness, and available zoning information.
 * 
 * Purpose:
 * Suggest business types using traceable neighborhood and property evidence.
 * Does not claim profitability, guaranteed returns, or proven unmet customer demand.
 * Seed relationships are marked as draft rules requiring local validation.
 */

export const BUSINESS_SECTORS = {
  everyday_services: 'Everyday Services',
  food_retail: 'Food & Retail',
  professional_services: 'Professional Services',
  tourism_recreation: 'Tourism & Recreation',
  industrial_agricultural: 'Industrial & Agricultural Support',
};

export const RULE_VERSION = 'v1.0-draft';
export const RULE_SOURCE = 'LOCUS-SF Local Economic Benchmark (City Planning & LEBDO Seed Rules)';

export const BUSINESS_CATALOG = [
  {
    id: 'convenience_store',
    label: 'Convenience Retail Store',
    sector: 'everyday_services',
    sectorLabel: 'Everyday Services',
    description: 'Extended-hours retail outlet for everyday packaged foods, quick snacks, household sundries, beverages and personal supplies.',
    activityCenters: ['hospital', 'clinic', 'school', 'college', 'office', 'fuel', 'townhall', 'residential'],
    areaGuideline: 'Footprint typically 30–80 sqm (commercial space); road frontage desirable',
    minAreaSqm: 30,
    maxAreaSqm: 200,
    requiredUtilities: ['electricity', 'water'],
    roadAccess: 'paved',
    competitorCategories: ['convenience', 'supermarket', 'marketplace'],
    complementaryCategories: ['fuel', 'pharmacy', 'laundry', 'residential', 'office'],
    allowedZonings: ['Commercial', 'General Commercial', 'Mixed Use', 'High Density Commercial', 'Medium Density Residential', 'Low Density Residential'],
    prohibitedZonings: ['Heavy Industrial', 'Hazardous Industrial', 'Forest Reserve', 'Protected Agricultural'],
    explanationTemplate: 'Proximity to {anchors} provides regular foot traffic and recurring customer demand for daily essentials and quick-stop convenience.',
    mainUnresolvedNotice: 'Confirm commercial electric line capacity and delivery unloading space.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'grocery',
    label: 'Neighborhood Grocery & Mart',
    sector: 'food_retail',
    sectorLabel: 'Food & Retail',
    description: 'Community grocery stocking fresh produce, dry cooking staples, canned foods, household goods and toiletries.',
    activityCenters: ['residential', 'place_of_worship', 'school', 'marketplace'],
    areaGuideline: 'Typically 60–200 sqm; delivery loading access desirable',
    minAreaSqm: 60,
    maxAreaSqm: 500,
    requiredUtilities: ['electricity', 'water'],
    roadAccess: 'all_weather',
    competitorCategories: ['supermarket', 'convenience', 'marketplace'],
    complementaryCategories: ['bakery', 'water_refilling', 'pharmacy', 'residential'],
    allowedZonings: ['Commercial', 'General Commercial', 'Mixed Use', 'Residential', 'Medium Density Residential'],
    prohibitedZonings: ['Heavy Industrial', 'Forest Reserve'],
    explanationTemplate: 'Surrounding residential concentration near {anchors} supports steady household demand for daily food staples and kitchen goods.',
    mainUnresolvedNotice: 'Verify delivery truck access and continuous municipal water connection.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'bakery',
    label: 'Bakery & Pastry Shop',
    sector: 'food_retail',
    sectorLabel: 'Food & Retail',
    description: 'Neighborhood bakery producing daily breakfast bread (pandesal), fresh pastries, and packaged confectionery.',
    activityCenters: ['residential', 'school', 'college', 'place_of_worship', 'marketplace', 'office'],
    areaGuideline: 'Typically 25–60 sqm for baking ovens and customer counter',
    minAreaSqm: 25,
    maxAreaSqm: 150,
    requiredUtilities: ['electricity', 'water'],
    roadAccess: 'all_weather',
    competitorCategories: ['bakery', 'pastry'],
    complementaryCategories: ['cafe', 'grocery', 'convenience', 'eatery'],
    allowedZonings: ['Commercial', 'Mixed Use', 'Residential', 'Medium Density Residential'],
    prohibitedZonings: ['Heavy Industrial', 'Forest Reserve'],
    explanationTemplate: 'Morning and afternoon commute patterns near {anchors} create dependable routine demand for fresh baked goods.',
    mainUnresolvedNotice: 'Confirm specialized baking ventilation and power load capacity.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'eatery',
    label: 'Casual Dining & Eatery (Carinderia)',
    sector: 'food_retail',
    sectorLabel: 'Food & Retail',
    description: 'Affordable prepared-meal dining establishment catering to students, commuters, shift workers and office personnel.',
    activityCenters: ['school', 'college', 'hospital', 'office', 'townhall', 'courthouse', 'marketplace'],
    areaGuideline: 'Typically 30–90 sqm with dining seating and sanitary food preparation space',
    minAreaSqm: 30,
    maxAreaSqm: 250,
    requiredUtilities: ['electricity', 'water'],
    roadAccess: 'all_weather',
    competitorCategories: ['fast_food', 'restaurant', 'eatery'],
    complementaryCategories: ['convenience', 'printing', 'office', 'school'],
    allowedZonings: ['Commercial', 'General Commercial', 'Mixed Use', 'Institutional'],
    prohibitedZonings: ['Hazardous Industrial', 'Strict Forest Protection'],
    explanationTemplate: 'Dense concentration of daily workers and students around {anchors} generates high lunchtime and mealtime customer flow.',
    mainUnresolvedNotice: 'Confirm grease trap requirement and potable water reliability.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'cafe',
    label: 'Café & Beverage Specialty',
    sector: 'food_retail',
    sectorLabel: 'Food & Retail',
    description: 'Specialty coffee, beverage and snack establishment offering comfortable seating and meeting space.',
    activityCenters: ['college', 'school', 'hotel', 'hospital', 'office', 'tourism'],
    areaGuideline: 'Typically 40–120 sqm; natural lighting and street frontage preferred',
    minAreaSqm: 40,
    maxAreaSqm: 300,
    requiredUtilities: ['electricity', 'water', 'telecom'],
    roadAccess: 'paved',
    competitorCategories: ['cafe', 'bakery'],
    complementaryCategories: ['books', 'hotel', 'college', 'beauty'],
    allowedZonings: ['Commercial', 'Mixed Use', 'Tourism', 'Special Commercial'],
    prohibitedZonings: ['Heavy Industrial', 'Agricultural Reserve'],
    explanationTemplate: 'Presence of {anchors} provides an established base of students, professionals and visitors seeking social and meeting venues.',
    mainUnresolvedNotice: 'Verify stable high-speed broadband and commercial water pressure.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'printing',
    label: 'Printing & Document Services',
    sector: 'professional_services',
    sectorLabel: 'Professional Services',
    description: 'Digital printing, photocopy, blueprint drafting, laminating, document binding and official ID photo services.',
    activityCenters: ['school', 'college', 'townhall', 'courthouse', 'office', 'hospital'],
    areaGuideline: 'Typically 20–50 sqm for print machines, workstations and client counter',
    minAreaSqm: 20,
    maxAreaSqm: 120,
    requiredUtilities: ['electricity', 'telecom'],
    roadAccess: 'all_weather',
    competitorCategories: ['printing', 'computer'],
    complementaryCategories: ['school_supplies', 'courier', 'office', 'college'],
    allowedZonings: ['Commercial', 'Institutional', 'Mixed Use'],
    prohibitedZonings: ['Agricultural Reserve', 'Heavy Industrial'],
    explanationTemplate: 'Direct proximity to {anchors} creates daily recurring demand for academic requirements, administrative records and official filings.',
    mainUnresolvedNotice: 'Verify commercial electrical surge protection and internet connection.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'school_supplies',
    label: 'School & Office Supplies Retail',
    sector: 'professional_services',
    sectorLabel: 'Professional Services',
    description: 'Retail store providing stationery, writing materials, paper products, art supplies and basic office consumables.',
    activityCenters: ['school', 'college', 'office', 'townhall'],
    areaGuideline: 'Typically 25–70 sqm display area',
    minAreaSqm: 25,
    maxAreaSqm: 150,
    requiredUtilities: ['electricity'],
    roadAccess: 'all_weather',
    competitorCategories: ['books', 'department_store'],
    complementaryCategories: ['printing', 'school', 'cafe'],
    allowedZonings: ['Commercial', 'Mixed Use', 'Institutional'],
    prohibitedZonings: ['Heavy Industrial', 'Forest Reserve'],
    explanationTemplate: 'Walking distance to {anchors} provides sustained student and staff demand for stationery and supplies.',
    mainUnresolvedNotice: 'Confirm indoor dry storage and secure display layout.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'laundry',
    label: 'Laundry & Garment Care',
    sector: 'everyday_services',
    sectorLabel: 'Everyday Services',
    description: 'Self-service laundromat or full-service drop-off facility offering washing, drying, folding and garment care.',
    activityCenters: ['residential', 'college', 'hospital', 'hotel', 'hostel'],
    areaGuideline: 'Typically 35–80 sqm; wastewater discharge capacity required',
    minAreaSqm: 35,
    maxAreaSqm: 180,
    requiredUtilities: ['electricity', 'water'],
    roadAccess: 'all_weather',
    competitorCategories: ['laundry'],
    complementaryCategories: ['residential', 'water_refilling', 'convenience', 'college'],
    allowedZonings: ['Commercial', 'Mixed Use', 'Residential'],
    prohibitedZonings: ['Watershed Protected', 'Heavy Industrial'],
    explanationTemplate: 'Surrounding student dormitories, boarding houses and residential units near {anchors} generate weekly laundry turnover.',
    mainUnresolvedNotice: 'Requires verified sewer/drainage connection and commercial water flow rate.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'water_refilling',
    label: 'Water Refilling Station',
    sector: 'everyday_services',
    sectorLabel: 'Everyday Services',
    description: 'Purified, mineral, and alkaline drinking water processing, bottle sanitizing and neighborhood distribution center.',
    activityCenters: ['residential', 'school', 'hospital', 'eatery', 'marketplace'],
    areaGuideline: 'Typically 20–50 sqm for purification machinery and bottle storage',
    minAreaSqm: 20,
    maxAreaSqm: 120,
    requiredUtilities: ['electricity', 'water'],
    roadAccess: 'all_weather',
    competitorCategories: ['water_refilling'],
    complementaryCategories: ['laundry', 'grocery', 'residential', 'eatery'],
    allowedZonings: ['Commercial', 'Mixed Use', 'Residential'],
    prohibitedZonings: ['Contaminated Industrial', 'Hazardous Waste Zone'],
    explanationTemplate: 'Household density and dining establishments near {anchors} require weekly container drinking water delivery.',
    mainUnresolvedNotice: 'Sanitary permit and water source testing required before setup.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'salon_barbershop',
    label: 'Salon & Grooming Services',
    sector: 'everyday_services',
    sectorLabel: 'Everyday Services',
    description: 'Haircut, styling, grooming and basic personal care salon catering to local residents and students.',
    activityCenters: ['residential', 'marketplace', 'school', 'college', 'office'],
    areaGuideline: 'Typically 20–60 sqm for 2–5 styling chairs and wash basin',
    minAreaSqm: 20,
    maxAreaSqm: 120,
    requiredUtilities: ['electricity', 'water'],
    roadAccess: 'all_weather',
    competitorCategories: ['beauty', 'hairdresser'],
    complementaryCategories: ['clothes', 'laundry', 'convenience'],
    allowedZonings: ['Commercial', 'Mixed Use', 'Residential'],
    prohibitedZonings: ['Heavy Industrial', 'Forest Reserve'],
    explanationTemplate: 'Regular foot traffic from residents and students around {anchors} supports recurring weekly grooming appointments.',
    mainUnresolvedNotice: 'Confirm water drainage and indoor ventilation.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'repair_shop',
    label: 'Electronics & Appliance Repair',
    sector: 'everyday_services',
    sectorLabel: 'Everyday Services',
    description: 'Smartphone, computer, motorcycle and household appliance diagnostic and repair workshop.',
    activityCenters: ['residential', 'marketplace', 'college', 'hardware'],
    areaGuideline: 'Typically 15–40 sqm for technician workbench and intake counter',
    minAreaSqm: 15,
    maxAreaSqm: 100,
    requiredUtilities: ['electricity'],
    roadAccess: 'all_weather',
    competitorCategories: ['car_repair', 'motorcycle_repair', 'computer'],
    complementaryCategories: ['hardware', 'convenience', 'marketplace'],
    allowedZonings: ['Commercial', 'Mixed Use', 'Light Industrial', 'Residential'],
    prohibitedZonings: ['Strict Forest Reserve', 'Heavy Industrial'],
    explanationTemplate: 'Neighborhood accessibility near {anchors} provides convenient drop-off for electronics and household maintenance.',
    mainUnresolvedNotice: 'Ensure grounded electrical installation and safe parts storage.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'courier',
    label: 'Courier & Logistics Drop-off',
    sector: 'professional_services',
    sectorLabel: 'Professional Services',
    description: 'E-commerce parcel drop-off, dispatch collection point and domestic logistics counter.',
    activityCenters: ['office', 'townhall', 'marketplace', 'bank', 'residential'],
    areaGuideline: 'Typically 30–100 sqm for sorting shelves, customer desk and vehicle bay',
    minAreaSqm: 30,
    maxAreaSqm: 200,
    requiredUtilities: ['electricity', 'telecom'],
    roadAccess: 'paved',
    competitorCategories: ['travel_agency', 'telecommunication'],
    complementaryCategories: ['office', 'printing', 'marketplace', 'bank'],
    allowedZonings: ['Commercial', 'General Commercial', 'Mixed Use', 'Light Industrial'],
    prohibitedZonings: ['Pedestrian-Only Zone', 'Protected Forest'],
    explanationTemplate: 'Active commercial transactions and administrative operations around {anchors} generate sustained shipment volume.',
    mainUnresolvedNotice: 'Verify temporary roadside vehicle stopping clearance.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'hardware',
    label: 'Hardware & Trade Supplies',
    sector: 'industrial_agricultural',
    sectorLabel: 'Industrial & Agricultural Support',
    description: 'Retail store supplying tools, electrical fixtures, plumbing supplies, paints, cements and construction hardware.',
    activityCenters: ['residential', 'industrial', 'commercial', 'marketplace'],
    areaGuideline: 'Typically 80–300 sqm; delivery truck access required',
    minAreaSqm: 80,
    maxAreaSqm: 1000,
    requiredUtilities: ['electricity'],
    roadAccess: 'paved',
    competitorCategories: ['hardware', 'doityourself', 'building_materials'],
    complementaryCategories: ['repair_shop', 'residential', 'car_repair'],
    allowedZonings: ['Commercial', 'Light Industrial', 'Mixed Use', 'General Commercial'],
    prohibitedZonings: ['High-Density Residential', 'Tourism Heritage Zone'],
    explanationTemplate: 'Ongoing residential and commercial construction activities near {anchors} require nearby building supply availability.',
    mainUnresolvedNotice: 'Confirm freight truck maneuverability and warehouse floor capacity.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'accommodation',
    label: 'Travelers Accommodation & Inn',
    sector: 'tourism_recreation',
    sectorLabel: 'Tourism & Recreation',
    description: 'Boutique hotel, travelers inn or bed-and-breakfast rooms for leisure tourists and visiting business travelers.',
    activityCenters: ['hotel', 'hostel', 'restaurant', 'cafe', 'marketplace', 'townhall'],
    areaGuideline: 'Typically 200–800 sqm lot or multi-story commercial building with parking',
    minAreaSqm: 150,
    maxAreaSqm: 5000,
    requiredUtilities: ['electricity', 'water', 'telecom'],
    roadAccess: 'paved',
    competitorCategories: ['hotel', 'hostel'],
    complementaryCategories: ['restaurant', 'cafe', 'travel_agency'],
    allowedZonings: ['Tourism', 'Commercial', 'Medium Density Residential', 'Mixed Use'],
    prohibitedZonings: ['Heavy Industrial', 'High Hazard Flood Zone'],
    explanationTemplate: 'Position along transport connections near {anchors} accommodates visitors seeking lodging and transit access.',
    mainUnresolvedNotice: 'Subject to DOT accreditation standards and dedicated guest parking clearance.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'tour_services',
    label: 'Tour & Activity Booking Agency',
    sector: 'tourism_recreation',
    sectorLabel: 'Tourism & Recreation',
    description: 'Tour desk, coastal excursion booking office and regional travel assistance service.',
    activityCenters: ['hotel', 'hostel', 'cafe', 'restaurant', 'tourism'],
    areaGuideline: 'Typically 15–40 sqm office counter and briefing space',
    minAreaSqm: 15,
    maxAreaSqm: 80,
    requiredUtilities: ['electricity', 'telecom'],
    roadAccess: 'paved',
    competitorCategories: ['travel_agency'],
    complementaryCategories: ['hotel', 'cafe', 'hostel'],
    allowedZonings: ['Tourism', 'Commercial', 'Mixed Use'],
    prohibitedZonings: ['Heavy Industrial', 'Agricultural Reserve'],
    explanationTemplate: 'Clustering of visitor accommodations and dining near {anchors} provides walk-in inquiries for regional and local tours.',
    mainUnresolvedNotice: 'Verify tourism operator accreditation requirements with City Tourism Office.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'fitness_gym',
    label: 'Fitness Gym & Wellness Center',
    sector: 'tourism_recreation',
    sectorLabel: 'Tourism & Recreation',
    description: 'Commercial fitness gym, strength training facility, aerobic/yoga studio and wellness club.',
    activityCenters: ['office', 'residential', 'college', 'school', 'hotel', 'hospital'],
    areaGuideline: 'Typically 80–400 sqm in a commercial building with adequate ventilation and ceiling height',
    minAreaSqm: 80,
    maxAreaSqm: 1000,
    requiredUtilities: ['electricity', 'water'],
    roadAccess: 'paved',
    competitorCategories: ['gym', 'fitness_centre', 'sports_centre'],
    complementaryCategories: ['cafe', 'pharmacy', 'convenience', 'salon_barbershop', 'office'],
    allowedZonings: ['Commercial', 'General Commercial', 'Mixed Use', 'High Density Commercial', 'Medium Density Commercial', 'C-2', 'C-3'],
    prohibitedZonings: ['Heavy Industrial', 'Forest Reserve', 'Protected Agricultural'],
    explanationTemplate: 'Concentration of commercial offices, students and daytime commuters around {anchors} creates recurring demand for fitness and wellness facilities.',
    mainUnresolvedNotice: 'Confirm structural live-load capacity for weight equipment and ventilation/air conditioning line.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'agri_vet_supply',
    label: 'Agri-Vet & Animal Feeds Supply',
    sector: 'industrial_agricultural',
    sectorLabel: 'Industrial & Agricultural Support',
    description: 'Store supplying livestock feeds, veterinary remedies, seeds, fertilizers and small farm supplies.',
    activityCenters: ['marketplace', 'residential', 'hardware'],
    areaGuideline: 'Typically 50–150 sqm with dry, vermin-proof feed storage',
    minAreaSqm: 50,
    maxAreaSqm: 300,
    requiredUtilities: ['electricity'],
    roadAccess: 'all_weather',
    competitorCategories: ['marketplace'],
    complementaryCategories: ['hardware', 'marketplace'],
    allowedZonings: ['Commercial', 'Agricultural', 'Mixed Use', 'Rural Development'],
    prohibitedZonings: ['High-Density Residential', 'Tourism Zone'],
    explanationTemplate: 'Proximity to {anchors} serves suburban and rural smallholders needing regular farm and feed supplies.',
    mainUnresolvedNotice: 'Ensure dry storage ventilation and animal feeds retailer permit.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
  {
    id: 'cold_storage',
    label: 'Cold Storage & Produce Logistics',
    sector: 'industrial_agricultural',
    sectorLabel: 'Industrial & Agricultural Support',
    description: 'Temperature-controlled storage room and packaging facility for perishable fish, meat, fruits and produce.',
    activityCenters: ['marketplace', 'industrial', 'commercial'],
    areaGuideline: 'Typically 150–500 sqm with truck loading dock',
    minAreaSqm: 150,
    maxAreaSqm: 3000,
    requiredUtilities: ['electricity', 'water'],
    roadAccess: 'paved',
    competitorCategories: ['building_materials'],
    complementaryCategories: ['marketplace', 'supermarket', 'hardware'],
    allowedZonings: ['Light Industrial', 'Commercial', 'General Commercial', 'Agro-Industrial'],
    prohibitedZonings: ['Low Density Residential', 'Strict Ecological Protection'],
    explanationTemplate: 'Proximity to wholesale trade and marketplace flow near {anchors} reduces post-harvest losses and preserves produce value.',
    mainUnresolvedNotice: 'Requires three-phase electrical service and heavy vehicle loading dock.',
    ruleSource: RULE_SOURCE,
    reviewStatus: 'draft',
    version: RULE_VERSION,
  },
];

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return R * c;
}

function recordedCoordinate(value, limit) {
  if (!['string', 'number'].includes(typeof value) || (typeof value === 'string' && value.trim() === '')) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

function recordedStatus(place) {
  const status = String(place.status || place.operating_status || 'unknown').trim().toLowerCase();
  if (status === 'existing') return 'operating';
  return status;
}

function closedPlace(place) {
  return ['closed', 'temporarily_closed', 'permanently_closed', 'disused', 'abandoned', 'demolished'].includes(recordedStatus(place))
    || /\b(?:temporarily|permanently)?\s*closed\b/i.test(String(place.note || ''));
}

function mappedBusiness(place) {
  if (typeof place.isBusiness === 'boolean') return place.isBusiness;
  const category = String(place.categoryKey || place.businessType || '').toLowerCase();
  return Boolean(category) && !['school', 'college', 'university', 'townhall', 'courthouse', 'police', 'fire_station',
    'place_of_worship', 'community_centre', 'library', 'toilets', 'parking', 'motorcycle_parking', 'bicycle_parking',
    'bench', 'waste_basket', 'drinking_water', 'fountain', 'grave_yard', 'viewpoint', 'recycling', 'atm'].includes(category);
}

/** An observed subset of mapped records; operating inventory completeness is unknown. */
export function observedBusinessContext(property, radiusMeters = 500) {
  const radius = Number(radiusMeters);
  if (!['string', 'number'].includes(typeof radiusMeters) || !Number.isFinite(radius) || radius <= 0) throw new RangeError('Choose a positive screening radius in meters.');
  const lat = recordedCoordinate(property.lat, 90);
  const lng = recordedCoordinate(property.lng, 180);
  const hasCoords = lat !== null && lng !== null;
  const places = [];
  if (hasCoords) {
    for (const place of Array.isArray(property.nearbyBusinesses) ? property.nearbyBusinesses : []) {
      const pLat = recordedCoordinate(place.lat, 90);
      const pLng = recordedCoordinate(place.lng, 180);
      const name = String(place.name || '').trim();
      if (pLat === null || pLng === null || !name || closedPlace(place)) continue;
      const distance = haversineMeters(lat, lng, pLat, pLng);
      if (distance > radius + 0.000001) continue;
      const nameNorm = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const duplicate = places.some(existing => {
        const existingName = existing.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        return (place.id && place.id === existing.id) || (!place.nameGenerated && !existing.nameGenerated
          && Math.min(nameNorm.length, existingName.length) >= 3
          && (nameNorm.includes(existingName) || existingName.includes(nameNorm))
          && haversineMeters(existing.lat, existing.lng, pLat, pLng) < 35);
      });
      if (duplicate) continue;
      places.push({ ...place, name, lat: pLat, lng: pLng, distanceMeters: Math.round(distance),
        distanceFormatted: `${Math.round(distance)} m`, source: place.source || 'Source not recorded',
        date: place.date || null, status: recordedStatus(place), isBusiness: mappedBusiness(place) });
    }
  }
  places.sort((a, b) => a.distanceMeters - b.distanceMeters);
  const businesses = places.filter(place => place.isBusiness);
  const area = Math.PI * (radius / 1000) ** 2;
  return { lat, lng, hasCoords, radiusMeters: radius, nearbyPlaces: places,
    metrics: { observedPlaceCount: hasCoords ? places.length : null,
      observedBusinessCount: hasCoords ? businesses.length : null,
      observedOperatingBusinessCount: hasCoords ? businesses.filter(place => place.status === 'operating').length : null,
      searchAreaSqKm: hasCoords ? area : null,
      observedBusinessesPerSqKm: hasCoords ? Math.round((businesses.length / area) * 100) / 100 : null,
      businessesPerSqKm: null, completeInventory: false },
    coverage: hasCoords ? 'mapped_subset' : 'unavailable',
    coverageNote: hasCoords ? 'Observed mapped records are a partial inventory. Operating status is unverified unless recorded; zero matches do not prove zero businesses.'
      : 'Choose the exact property location before measuring nearby places or density.' };
}

/**
 * Client-side evaluation fallback.
 */
export function evaluateBusinessOpportunities(property, radiusMeters = 500, sectorFilter = null) {
  const context = observedBusinessContext(property, radiusMeters);
  const { lat, lng, hasCoords } = context;

  const originLabel = hasCoords ? `${Math.abs(lat).toFixed(6)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lng).toFixed(6)}° ${lng < 0 ? 'W' : 'E'}` : 'Unknown origin (unrecorded coordinates)';

  // 1. Gather places strictly within radius
  const deduped = context.nearbyPlaces;

  // Group by category
  const placesByCategory = {};
  for (const d of deduped) {
    const k = (d.categoryKey || '').toLowerCase();
    const g = (d.categoryGroup || '').toLowerCase();
    if (!placesByCategory[k]) placesByCategory[k] = [];
    placesByCategory[k].push(d);
    if (g && g !== k) {
      if (!placesByCategory[g]) placesByCategory[g] = [];
      placesByCategory[g].push(d);
    }
  }

  const areaHa = Number(property.area || property.landArea || 0);
  const parcelSqm = Number(property.parcel?.surveyAreaSqm ?? property.parcel?.estimatedAreaSqm ?? 0);
  const areaSqm = Number.isFinite(parcelSqm) && parcelSqm > 0 ? parcelSqm : (Number.isFinite(areaHa) && areaHa > 0 ? areaHa * 10000 : 0);
  const zoningClassification = (property.clupProfile?.zoningClassification || property.zoningClassification || '').trim();
  const utilities = Array.isArray(property.utilities) ? property.utilities : [];

  const candidates = [];
  const excludedConflicts = [];

  for (const profile of BUSINESS_CATALOG) {
    const id = profile.id;
    const supporting = [];
    for (const ac of profile.activityCenters) {
      if (placesByCategory[ac]) {
        supporting.push(...placesByCategory[ac]);
      }
    }

    const hasResidential = placesByCategory.residential || placesByCategory.place_of_worship || placesByCategory.supermarket
      || zoningClassification.toLowerCase().includes('residential') || zoningClassification.toLowerCase().includes('mixed');

    if (hasCoords && hasResidential && profile.activityCenters.includes('residential')) {
      if (!supporting.length) {
        supporting.push({
          name: `Residential Community (${property.barangay || 'Neighborhood'})`,
          category: 'Residential Settlement',
          distanceMeters: null,
          distanceFormatted: 'Neighborhood context; distance not measured',
          source: 'CLUP Neighborhood Context',
          date: property.clupProfile?.verifiedAt || null,
          status: 'not_applicable',
        });
      }
    }

    // Deduplicate supporters
    const uniqueSupporters = [];
    const seenNames = new Set();
    for (const s of supporting) {
      if (!seenNames.has(s.name)) {
        seenNames.add(s.name);
        uniqueSupporters.push(s);
      }
    }

    if (!uniqueSupporters.length) continue;

    // Competitors within dataset
    const competitors = [];
    for (const ck of profile.competitorCategories) {
      if (placesByCategory[ck]) competitors.push(...placesByCategory[ck]);
    }

    // Complementary within dataset
    const complementary = [];
    for (const ck of profile.complementaryCategories) {
      if (placesByCategory[ck]) complementary.push(...placesByCategory[ck]);
    }

    // Zoning compatibility
    let isZoningProhibited = false;
    let zoningExplanation = 'Zoning unconfirmed';
    if (zoningClassification) {
      const zLower = zoningClassification.toLowerCase();
      for (const proh of profile.prohibitedZonings) {
        if (zLower.includes(proh.toLowerCase())) {
          isZoningProhibited = true;
          zoningExplanation = `Prohibited in ${zoningClassification} zone under CLUP rules.`;
          break;
        }
      }
      if (!isZoningProhibited) {
        const isAllowed = profile.allowedZonings.some(al => zLower.includes(al.toLowerCase()));
        if (!isAllowed) {
          isZoningProhibited = true;
          zoningExplanation = `Zoning classification (${zoningClassification}) excludes this business type.`;
        } else {
          zoningExplanation = `Compatible with ${zoningClassification} classification.`;
        }
      }
    }

    if (isZoningProhibited) {
      excludedConflicts.push({ id, label: profile.label, reason: zoningExplanation });
      continue;
    }

    const missingItems = [];
    if (areaSqm <= 0) missingItems.push('Parcel boundary/area unrecorded');
    if (!utilities.length) missingItems.push('Utility connections unconfirmed');
    if (!zoningClassification) missingItems.push('Authoritative CLUP zoning unverified');

    const anchorNames = uniqueSupporters.slice(0, 2).map(p => p.name).join(' and ');
    const explanation = profile.explanationTemplate.replace('{anchors}', anchorNames);

    candidates.push({
      id,
      label: profile.label,
      sector: profile.sector,
      sectorLabel: profile.sectorLabel,
      description: profile.description,
      explanation,
      reviewStatus: profile.reviewStatus,
      statusLabel: 'Draft screening · Unvalidated',
      version: profile.version,
      ruleSource: profile.ruleSource,
      mainUnresolvedNotice: profile.mainUnresolvedNotice,
      supportingPlaces: uniqueSupporters.slice(0, 5),
      supportingCount: uniqueSupporters.length,
      nearestAnchorDistance: uniqueSupporters[0]?.distanceMeters ?? null,
      nearestAnchorFormatted: uniqueSupporters[0]?.distanceFormatted ?? null,
      areaGuideline: profile.areaGuideline,
      recordedAreaSqm: areaSqm > 0 ? Math.round(areaSqm * 100) / 100 : null,
      areaStatus: areaSqm > 0 ? `${areaSqm.toLocaleString(undefined, { maximumFractionDigits: 2 })} sqm recorded` : 'Unknown (unrecorded)',
      roadAccessRequirement: profile.roadAccess,
      zoningClassification: zoningClassification || 'Unknown (awaiting verification)',
      zoningStatus: zoningExplanation,
      missingEvidence: missingItems,
      competitorsCount: competitors.length,
      competitorsNotice: competitors.length > 0
        ? `${competitors.length} similar mapped establishments recorded in radius; operating status may be unverified`
        : 'No competitors recorded in this partial dataset; completeness is unknown',
      competitorSample: competitors.slice(0, 3).map(c => c.name),
      complementaryCount: complementary.length,
      complementarySample: complementary.slice(0, 3).map(c => c.name),
    });
  }

  // Sort: closest anchor first, then highest anchor count, then id
  candidates.sort((a, b) => {
    const da = a.nearestAnchorDistance ?? 99999;
    const db = b.nearestAnchorDistance ?? 99999;
    if (da !== db) return da - db;
    if (a.supportingCount !== b.supportingCount) return b.supportingCount - a.supportingCount;
    return a.id.localeCompare(b.id);
  });

  let eligible = candidates;
  if (sectorFilter && sectorFilter !== 'all') {
    eligible = candidates.filter(item => item.sector === sectorFilter);
  }

  const supportedMatches = eligible.slice(0, 3).map((item, idx) => ({ ...item, rank: idx + 1 }));

  return {
    status: supportedMatches.length ? 'supported' : 'no_candidates',
    title: 'Business opportunities to explore',
    subtitle: 'Suggestions based on nearby establishments, property characteristics, infrastructure and available zoning information.',
    radiusMeters: Math.round(radiusMeters),
    screeningRadiusLabel: `${Math.round(radiusMeters)}-meter straight-line screening radius`,
    analysisOrigin: originLabel,
    totalPlacesInRadius: deduped.length,
    nearbyPlaces: deduped,
    metrics: context.metrics,
    coverage: context.coverage,
    coverageNote: context.coverageNote,
    ruleVersion: RULE_VERSION,
    ruleSource: RULE_SOURCE,
    reviewNotice: 'Seed relationships are draft exploratory rules requiring local review by City Planning and LEBDO before official validation. Suggestions do not claim profitability or guaranteed unmet demand.',
    supportedMatches,
    supportedCount: supportedMatches.length,
    confirmedConflicts: excludedConflicts,
    allCatalogCount: BUSINESS_CATALOG.length,
    catalogSectors: BUSINESS_SECTORS,
  };
}

/**
 * Escapes raw strings for secure HTML output.
 */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const DEMO_MATCHES = [
  {
    id: 'bakery',
    label: 'BAKERY & PASTRY SHOP',
    sector: 'food_retail',
    sectorLabel: 'Food & Retail',
    rank: 1,
    statusLabel: 'Preliminary',
    description: 'Neighborhood bakery producing daily breakfast bread (pandesal), fresh pastries, and packaged confectionery.',
    pillText: 'Multiple nearby activity centers',
    alertText: 'Confirm specialized baking ventilation and power load capacity.',
    icon: 'bakery',
    explanation: 'Morning and afternoon commute patterns near nearby activity centers create dependable routine demand for fresh baked goods.',
    mainUnresolvedNotice: 'Confirm specialized baking ventilation and power load capacity.',
    supportingPlaces: [
      { name: 'Hospital nearby', distanceFormatted: '180 m', distanceMeters: 180, category: 'Healthcare' },
      { name: 'School nearby', distanceFormatted: '240 m', distanceMeters: 240, category: 'Education' },
      { name: 'City hall nearby', distanceFormatted: '310 m', distanceMeters: 310, category: 'Civic' },
    ],
    areaGuideline: 'Typically 25–60 sqm for baking ovens and customer counter',
    areaStatus: 'Suitable for commercial frontage or leased stall',
    zoningStatus: 'Compatible with Commercial classification',
    zoningClassification: 'Commercial / Mixed Use',
    roadAccessRequirement: 'all_weather',
    missingEvidence: [],
    competitorsNotice: '1 similar operating bakery recorded in radius',
    competitorSample: ['Local Pan de Sal'],
    complementaryCount: 3,
    complementarySample: ['Café & Beverage Specialty', 'Convenience Store', 'Eatery'],
    ruleSource: RULE_SOURCE,
    version: RULE_VERSION,
  },
  {
    id: 'cafe',
    label: 'CAFÉ & BEVERAGE SPECIALTY',
    sector: 'food_retail',
    sectorLabel: 'Food & Retail',
    rank: 2,
    statusLabel: 'Preliminary',
    description: 'Specialty coffee, beverage and snack establishment offering comfortable seating and meeting space.',
    pillText: 'Multiple nearby activity centers',
    alertText: 'Verify stable high-speed broadband and commercial water pressure.',
    icon: 'cafe',
    explanation: 'Presence of nearby activity centers provides an established base of students, professionals and visitors seeking social and meeting venues.',
    mainUnresolvedNotice: 'Verify stable high-speed broadband and commercial water pressure.',
    supportingPlaces: [
      { name: 'School nearby', distanceFormatted: '240 m', distanceMeters: 240, category: 'Education' },
      { name: 'Hospital nearby', distanceFormatted: '180 m', distanceMeters: 180, category: 'Healthcare' },
      { name: 'City hall nearby', distanceFormatted: '310 m', distanceMeters: 310, category: 'Civic' },
    ],
    areaGuideline: 'Typically 40–120 sqm; natural lighting and street frontage preferred',
    areaStatus: 'Suitable for street frontage',
    zoningStatus: 'Compatible with Commercial classification',
    zoningClassification: 'Commercial / Mixed Use',
    roadAccessRequirement: 'paved',
    missingEvidence: [],
    competitorsNotice: '1 similar coffee shop recorded in radius',
    competitorSample: ['City Brews'],
    complementaryCount: 3,
    complementarySample: ['Bakery & Pastry Shop', 'Hotel', 'Bookstore'],
    ruleSource: RULE_SOURCE,
    version: RULE_VERSION,
  },
  {
    id: 'convenience_store',
    label: 'CONVENIENCE RETAIL STORE',
    sector: 'everyday_services',
    sectorLabel: 'Everyday Services',
    rank: 3,
    statusLabel: 'Preliminary',
    description: 'Extended-hours retail outlet for everyday packaged foods, quick snacks, household sundries, beverages and personal supplies.',
    pillText: 'Multiple nearby activity centers',
    alertText: 'Confirm commercial electric line capacity and delivery unloading space.',
    icon: 'store',
    explanation: 'High foot-traffic anchors nearby provide regular customer flow for daily essentials.',
    mainUnresolvedNotice: 'Confirm commercial electric line capacity and delivery unloading space.',
    supportingPlaces: [
      { name: 'Hospital nearby', distanceFormatted: '180 m', distanceMeters: 180, category: 'Healthcare' },
      { name: 'School nearby', distanceFormatted: '240 m', distanceMeters: 240, category: 'Education' },
      { name: 'City hall nearby', distanceFormatted: '310 m', distanceMeters: 310, category: 'Civic' },
    ],
    areaGuideline: 'Typically 30–80 sqm; road frontage desirable',
    areaStatus: 'Suitable for frontage or sub-lease',
    zoningStatus: 'Compatible with Commercial classification',
    zoningClassification: 'Commercial / Mixed Use',
    roadAccessRequirement: 'paved',
    missingEvidence: [],
    competitorsNotice: '2 similar operating establishments recorded in radius',
    competitorSample: ['Local Mart', 'Express Grocer'],
    complementaryCount: 3,
    complementarySample: ['Pharmacy', 'Fuel Station', 'Laundry'],
    ruleSource: RULE_SOURCE,
    version: RULE_VERSION,
  },
];

export const SECTOR_DEMO_MATCHES = {
  food_retail: [
    DEMO_MATCHES[0],
    DEMO_MATCHES[1],
    {
      id: 'eatery',
      label: 'CASUAL DINING & EATERY (CARINDERIA)',
      sector: 'food_retail',
      sectorLabel: 'Food & Retail',
      rank: 3,
      statusLabel: 'Preliminary',
      description: 'Affordable prepared-meal dining establishment catering to students, commuters, shift workers and office personnel.',
      pillText: 'Potential daytime customers',
      alertText: 'Confirm grease trap requirement and potable water reliability.',
      icon: 'eatery',
      explanation: 'Dense concentration of daily workers and students around nearby anchors generates high lunchtime customer flow.',
      mainUnresolvedNotice: 'Confirm grease trap requirement and potable water reliability.',
      supportingPlaces: [
        { name: 'Saint Louis College', distanceFormatted: '165 m', distanceMeters: 165, category: 'Education' },
        { name: 'City Hall of San Fernando', distanceFormatted: '185 m', distanceMeters: 185, category: 'Civic' },
        { name: 'Commercial District', distanceFormatted: '250 m', distanceMeters: 250, category: 'Commercial' },
      ],
      areaGuideline: 'Typically 30–90 sqm with dining seating and sanitary food preparation space',
      areaStatus: 'Suitable for ground-floor dining stall',
      zoningStatus: 'Compatible with Commercial classification',
      zoningClassification: 'Commercial / General Commercial',
      roadAccessRequirement: 'all_weather',
      missingEvidence: [],
      competitorsNotice: '2 operating dining establishments recorded in radius',
      competitorSample: ['Plaza Eatery', 'Daily Meals'],
      complementaryCount: 3,
      complementarySample: ['Convenience Store', 'Printing Services', 'Government Offices'],
      ruleSource: RULE_SOURCE,
      version: RULE_VERSION,
    }
  ],
  everyday_services: [
    DEMO_MATCHES[2],
    {
      id: 'laundry',
      label: 'LAUNDRY & GARMENT CARE',
      sector: 'everyday_services',
      sectorLabel: 'Everyday Services',
      rank: 2,
      statusLabel: 'Preliminary',
      description: 'Self-service laundromat or full-service drop-off facility offering washing, drying, folding and garment care.',
      pillText: 'Residential & student population proximity',
      alertText: 'Requires verified sewer/drainage connection and commercial water flow rate.',
      icon: 'laundry',
      explanation: 'Surrounding student dormitories and residential units near nearby anchors generate weekly laundry turnover.',
      mainUnresolvedNotice: 'Requires verified sewer/drainage connection and commercial water flow rate.',
      supportingPlaces: [
        { name: 'Saint Louis College', distanceFormatted: '165 m', distanceMeters: 165, category: 'Education' },
        { name: 'Hospital nearby', distanceFormatted: '180 m', distanceMeters: 180, category: 'Healthcare' },
        { name: 'Residential Community', distanceFormatted: '210 m', distanceMeters: 210, category: 'Residential' },
      ],
      areaGuideline: 'Typically 35–80 sqm; wastewater discharge capacity required',
      areaStatus: 'Suitable for utility-connected ground space',
      zoningStatus: 'Compatible with Commercial classification',
      zoningClassification: 'Commercial / Mixed Use',
      roadAccessRequirement: 'all_weather',
      missingEvidence: [],
      competitorsNotice: '1 operating laundry outlet recorded in radius',
      competitorSample: ['QuickWash San Fernando'],
      complementaryCount: 3,
      complementarySample: ['Water Refilling Station', 'Convenience Retail Store', 'Student Dorms'],
      ruleSource: RULE_SOURCE,
      version: RULE_VERSION,
    },
    {
      id: 'water_refilling',
      label: 'WATER REFILLING STATION',
      sector: 'everyday_services',
      sectorLabel: 'Everyday Services',
      rank: 3,
      statusLabel: 'Preliminary',
      description: 'Purified, mineral, and alkaline drinking water processing, bottle sanitizing and neighborhood distribution center.',
      pillText: 'Sustained residential & food establishment demand',
      alertText: 'Sanitary permit and water source testing required before setup.',
      icon: 'water_refilling',
      explanation: 'Household density and dining establishments near nearby anchors require recurring weekly container drinking water delivery.',
      mainUnresolvedNotice: 'Sanitary permit and water source testing required before setup.',
      supportingPlaces: [
        { name: 'Hospital nearby', distanceFormatted: '180 m', distanceMeters: 180, category: 'Healthcare' },
        { name: 'School nearby', distanceFormatted: '240 m', distanceMeters: 240, category: 'Education' },
        { name: 'Residential Community', distanceFormatted: '210 m', distanceMeters: 210, category: 'Residential' },
      ],
      areaGuideline: 'Typically 20–50 sqm for purification machinery and bottle storage',
      areaStatus: 'Suitable for street-level water intake',
      zoningStatus: 'Compatible with Commercial classification',
      zoningClassification: 'Commercial / Mixed Use',
      roadAccessRequirement: 'all_weather',
      missingEvidence: [],
      competitorsNotice: '1 water station recorded in radius',
      competitorSample: ['AquaPure Station'],
      complementaryCount: 3,
      complementarySample: ['Eatery', 'Laundry', 'Neighborhood Groceries'],
      ruleSource: RULE_SOURCE,
      version: RULE_VERSION,
    }
  ],
  tourism_recreation: [
    {
      id: 'accommodation',
      label: 'TRAVELERS ACCOMMODATION & INN',
      sector: 'tourism_recreation',
      sectorLabel: 'Tourism & Recreation',
      rank: 1,
      statusLabel: 'Preliminary',
      description: 'Boutique hotel, travelers inn or bed-and-breakfast rooms for leisure tourists and visiting business travelers.',
      pillText: 'Transit route & civic center proximity',
      alertText: 'Subject to DOT accreditation standards and dedicated guest parking clearance.',
      icon: 'hotel',
      explanation: 'Position along central corridors near civic and educational anchors accommodates visitors seeking lodging and transit access.',
      mainUnresolvedNotice: 'Subject to DOT accreditation standards and dedicated guest parking clearance.',
      supportingPlaces: [
        { name: 'City Hall of San Fernando', distanceFormatted: '185 m', distanceMeters: 185, category: 'Civic' },
        { name: 'Transport Hub', distanceFormatted: '280 m', distanceMeters: 280, category: 'Transportation' },
        { name: 'Commercial District', distanceFormatted: '250 m', distanceMeters: 250, category: 'Commercial' },
      ],
      areaGuideline: 'Typically 200–800 sqm lot or multi-story commercial building with parking',
      areaStatus: 'Suitable for multi-level hospitality build',
      zoningStatus: 'Compatible with Tourism / Commercial classification',
      zoningClassification: 'Commercial / Tourism Mixed Use',
      roadAccessRequirement: 'paved',
      missingEvidence: [],
      competitorsNotice: '1 boutique inn operating in radius',
      competitorSample: ['City Center Inn'],
      complementaryCount: 3,
      complementarySample: ['Café & Beverage Specialty', 'Tour Booking Agency', 'Local Dining'],
      ruleSource: RULE_SOURCE,
      version: RULE_VERSION,
    },
    {
      id: 'tour_services',
      label: 'TOUR & ACTIVITY BOOKING AGENCY',
      sector: 'tourism_recreation',
      sectorLabel: 'Tourism & Recreation',
      rank: 2,
      statusLabel: 'Preliminary',
      description: 'Tour desk, coastal excursion booking office and regional travel assistance service.',
      pillText: 'Visitor corridor & hospitality clustering',
      alertText: 'Verify tourism operator accreditation requirements with City Tourism Office.',
      icon: 'tour',
      explanation: 'Clustering of visitor accommodations and dining near nearby anchors provides walk-in inquiries for regional and local tours.',
      mainUnresolvedNotice: 'Verify tourism operator accreditation requirements with City Tourism Office.',
      supportingPlaces: [
        { name: 'City Hall of San Fernando', distanceFormatted: '185 m', distanceMeters: 185, category: 'Civic' },
        { name: 'Hotel / Inn nearby', distanceFormatted: '220 m', distanceMeters: 220, category: 'Hospitality' },
        { name: 'Main Transport Route', distanceFormatted: '280 m', distanceMeters: 280, category: 'Transportation' },
      ],
      areaGuideline: 'Typically 15–40 sqm office counter and briefing space',
      areaStatus: 'Suitable for compact booking counter',
      zoningStatus: 'Compatible with Commercial classification',
      zoningClassification: 'Commercial / Tourism Mixed Use',
      roadAccessRequirement: 'paved',
      missingEvidence: [],
      competitorsNotice: 'No competing tour desks recorded in immediate radius',
      competitorSample: [],
      complementaryCount: 3,
      complementarySample: ['Hotels & Inns', 'Specialty Cafes', 'Transit Terminals'],
      ruleSource: RULE_SOURCE,
      version: RULE_VERSION,
    },
    DEMO_MATCHES[1],
  ],
  all: [
    {
      id: 'printing',
      label: 'PRINTING & DOCUMENT SERVICES',
      sector: 'professional_services',
      sectorLabel: 'Professional Services',
      rank: 1,
      statusLabel: 'Preliminary',
      description: 'Digital printing, photocopy, blueprint drafting, laminating, document binding and official ID photo services.',
      pillText: 'School and government-office context',
      alertText: 'Verify commercial electrical surge protection and internet connection.',
      icon: 'printing',
      explanation: 'Direct proximity to schools and civic offices creates daily recurring demand for academic requirements and official filings.',
      mainUnresolvedNotice: 'Verify commercial electrical surge protection and internet connection.',
      supportingPlaces: [
        { name: 'Saint Louis College', distanceFormatted: '165 m', distanceMeters: 165, category: 'Education' },
        { name: 'City Hall of San Fernando', distanceFormatted: '185 m', distanceMeters: 185, category: 'Civic' },
        { name: 'Hospital nearby', distanceFormatted: '180 m', distanceMeters: 180, category: 'Healthcare' },
      ],
      areaGuideline: 'Typically 20–50 sqm for print machines, workstations and client counter',
      areaStatus: 'Suitable for retail shopfront',
      zoningStatus: 'Compatible with Commercial classification',
      zoningClassification: 'Commercial / Institutional',
      roadAccessRequirement: 'all_weather',
      missingEvidence: [],
      competitorsNotice: '1 printing shop recorded in radius',
      competitorSample: ['City Print Pro'],
      complementaryCount: 3,
      complementarySample: ['Saint Louis College', 'City Hall', 'School Supplies'],
      ruleSource: RULE_SOURCE,
      version: RULE_VERSION,
    },
    {
      id: 'school_supplies',
      label: 'SCHOOL & OFFICE SUPPLIES RETAIL',
      sector: 'professional_services',
      sectorLabel: 'Professional Services',
      rank: 2,
      statusLabel: 'Preliminary',
      description: 'Retail store providing stationery, writing materials, paper products, art supplies and basic office consumables.',
      pillText: 'Direct academic & administrative foot traffic',
      alertText: 'Confirm indoor dry storage and secure display layout.',
      icon: 'school_supplies',
      explanation: 'Walking distance to schools and government offices provides sustained student and staff demand for stationery and supplies.',
      mainUnresolvedNotice: 'Confirm indoor dry storage and secure display layout.',
      supportingPlaces: [
        { name: 'Saint Louis College', distanceFormatted: '165 m', distanceMeters: 165, category: 'Education' },
        { name: 'City Hall of San Fernando', distanceFormatted: '185 m', distanceMeters: 185, category: 'Civic' },
        { name: 'Elementary School nearby', distanceFormatted: '260 m', distanceMeters: 260, category: 'Education' },
      ],
      areaGuideline: 'Typically 25–70 sqm display area',
      areaStatus: 'Suitable for street-level retail display',
      zoningStatus: 'Compatible with Commercial classification',
      zoningClassification: 'Commercial / Institutional',
      roadAccessRequirement: 'all_weather',
      missingEvidence: [],
      competitorsNotice: 'No dedicated stationery store recorded in immediate radius',
      competitorSample: [],
      complementaryCount: 3,
      complementarySample: ['Printing Services', 'Saint Louis College', 'City Hall'],
      ruleSource: RULE_SOURCE,
      version: RULE_VERSION,
    },
    {
      id: 'repair_shop',
      label: 'ELECTRONICS & APPLIANCE REPAIR',
      sector: 'everyday_services',
      sectorLabel: 'Everyday Services',
      rank: 3,
      statusLabel: 'Preliminary',
      description: 'Smartphone, computer, motorcycle and household appliance diagnostic and repair workshop.',
      pillText: 'Community electronics & maintenance need',
      alertText: 'Ensure grounded electrical installation and safe parts storage.',
      icon: 'repair_shop',
      explanation: 'Neighborhood accessibility near commercial and residential anchors provides convenient drop-off for electronics and household maintenance.',
      mainUnresolvedNotice: 'Ensure grounded electrical installation and safe parts storage.',
      supportingPlaces: [
        { name: 'Saint Louis College', distanceFormatted: '165 m', distanceMeters: 165, category: 'Education' },
        { name: 'Commercial District', distanceFormatted: '250 m', distanceMeters: 250, category: 'Commercial' },
        { name: 'Residential Community', distanceFormatted: '210 m', distanceMeters: 210, category: 'Residential' },
      ],
      areaGuideline: 'Typically 15–40 sqm for technician workbench and intake counter',
      areaStatus: 'Suitable for workshop stall',
      zoningStatus: 'Compatible with Commercial classification',
      zoningClassification: 'Commercial / Light Industrial',
      roadAccessRequirement: 'all_weather',
      missingEvidence: [],
      competitorsNotice: '1 repair shop recorded in radius',
      competitorSample: ['TechFix San Fernando'],
      complementaryCount: 3,
      complementarySample: ['Hardware Stores', 'Convenience Retail', 'Electronics Resellers'],
      ruleSource: RULE_SOURCE,
      version: RULE_VERSION,
    }
  ]
};

function getOpportunityIconSvg(id) {
  const norm = String(id || '').toLowerCase();
  if (norm.includes('bakery') || norm.includes('pastry')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M5 12c-1.5 0-3 1.5-3 3.5S3.5 19 5 19h14c1.5 0 3-1.5 3-3.5S20.5 12 19 12C18 9 15 7 12 7S6 9 5 12z"></path>
      <path d="M8 12l2 4"></path>
      <path d="M12 11v5"></path>
      <path d="M16 12l-2 4"></path>
    </svg>`;
  }
  if (norm.includes('cafe') || norm.includes('coffee') || norm.includes('beverage')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
      <line x1="6" y1="1" x2="6" y2="4"></line>
      <line x1="10" y1="1" x2="10" y2="4"></line>
      <line x1="14" y1="1" x2="14" y2="4"></line>
    </svg>`;
  }
  if (norm.includes('eatery') || norm.includes('dining') || norm.includes('carinderia') || norm.includes('restaurant')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 2v20M18 8a3 3 0 0 0 3-3V2h-3"></path>
      <path d="M6 2v6a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2M9 11v11M6 2v4M12 2v4"></path>
    </svg>`;
  }
  if (norm.includes('printing') || norm.includes('document')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
    </svg>`;
  }
  if (norm.includes('grocery') || norm.includes('mart') || norm.includes('supermarket')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>`;
  }
  if (norm.includes('school') || norm.includes('supplies') || norm.includes('stationery')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
      <line x1="8" y1="7" x2="16" y2="7"></line>
      <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>`;
  }
  if (norm.includes('laundry')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="2" width="18" height="20" rx="3"></rect>
      <circle cx="12" cy="13" r="5"></circle>
      <circle cx="8" cy="6" r="1" fill="#7F1D1D"></circle>
      <circle cx="12" cy="6" r="1" fill="#7F1D1D"></circle>
    </svg>`;
  }
  if (norm.includes('hotel') || norm.includes('accommodation') || norm.includes('inn') || norm.includes('lodging')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 17V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10"></path>
      <path d="M2 17h20"></path>
      <path d="M6 13h12"></path>
      <path d="M4 21v-4"></path>
      <path d="M20 21v-4"></path>
    </svg>`;
  }
  if (norm.includes('tour') || norm.includes('travel') || norm.includes('booking')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
    </svg>`;
  }
  if (norm.includes('water') || norm.includes('refill')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
    </svg>`;
  }
  if (norm.includes('salon') || norm.includes('barber') || norm.includes('beauty')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="3"></circle>
      <circle cx="6" cy="18" r="3"></circle>
      <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
      <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
      <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
    </svg>`;
  }
  if (norm.includes('hardware') || norm.includes('repair') || norm.includes('auto')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
    </svg>`;
  }
  if (norm.includes('courier') || norm.includes('delivery') || norm.includes('logistics')) {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 9l1-5h16l1 5"></path>
    <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"></path>
    <path d="M4 14v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6"></path>
    <rect x="9" y="14" width="6" height="7"></rect>
  </svg>`;
}

/**
 * Return tailored icon, colors, and sector info for a nearby establishment/anchor.
 */
export function getAnchorIconInfo(a) {
  const name = ((a && a.name) || '').toLowerCase();
  const cat = ((a && (a.categoryKey || a.categoryGroup || a.category)) || '').toLowerCase();
  const text = `${name} ${cat}`;

  // 1. Bicycle / Motorcycle / Mobility / Surplus (e.g. Lucky M2, Delan's Bicycle Store)
  if (text.includes('bicycle') || text.includes('bike') || text.includes('cycle') || text.includes('motor') || text.includes('surplus') || text.includes('m2')) {
    return {
      catKey: 'bicycle',
      badgeColor: '#0D9488', // Teal
      textClass: 'text-teal',
      sector: 'everyday_services',
      svgIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L9 12l3-5 3.5 5.5M12 7h3.5l2 3"/></svg>'
    };
  }

  // 2. Education
  if (text.includes('school') || text.includes('college') || text.includes('educ') || text.includes('academy') || text.includes('elementary') || text.includes('kinder') || text.includes('high school') || text.includes('university')) {
    return {
      catKey: 'education',
      badgeColor: '#1A73E8', // Google Blue
      textClass: 'text-blue',
      sector: 'everyday_services',
      svgIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>'
    };
  }

  // 3. Civic / Government / Barangay Hall
  if (text.includes('townhall') || text.includes('gov') || text.includes('civic') || text.includes('hall') || text.includes('barangay') || text.includes('courthouse') || text.includes('police') || text.includes('station') || text.includes('capitol')) {
    return {
      catKey: 'civic',
      badgeColor: '#1E3A8A', // Civic Navy
      textClass: 'text-navy',
      sector: 'everyday_services',
      svgIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2L2 7v2h20V7L12 2zm-8 8v9h3v-9H4zm5 0v9h3v-9H9zm5 0v9h3v-9h-3zm5 0v9h3v-9h-3zM2 20v2h20v-2H2z"/></svg>'
    };
  }

  // 4. Spiritual / Temple / Church / Worship (e.g. Ma Cho Temple)
  if (text.includes('temple') || text.includes('church') || text.includes('chapel') || text.includes('cathedral') || text.includes('taoist') || text.includes('shrine') || text.includes('mosque') || text.includes('worship') || text.includes('ma cho') || text.includes('macho')) {
    return {
      catKey: 'worship',
      badgeColor: '#7C3AED', // Spiritual Violet
      textClass: 'text-violet',
      sector: 'tourism_recreation',
      svgIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2v4h4v3h-4v13H9V9H5V6h4V2h3z"/></svg>'
    };
  }

  // 5. Dining / Restaurant / Lechon / Bakery / Cafe
  if (text.includes('food') || text.includes('eat') || text.includes('rest') || text.includes('cafe') || text.includes('coffee') || text.includes('baker') || text.includes('pastry') || text.includes('lechon') || text.includes('diner') || text.includes('bistro') || text.includes('kitchen') || text.includes('canteen')) {
    return {
      catKey: 'dining',
      badgeColor: '#EA580C', // Food Orange
      textClass: 'text-orange',
      sector: 'food_retail',
      svgIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M18 2v20M18 8a3 3 0 0 0 3-3V2h-3M6 2v6a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2M9 11v11"/></svg>'
    };
  }

  // 6. Retail / Shop / Store / Mart / Market / Surplus / Fridge
  if (text.includes('store') || text.includes('retail') || text.includes('shop') || text.includes('market') || text.includes('mart') || text.includes('grocery') || text.includes('hardware') || text.includes('mall') || text.includes('fridge')) {
    return {
      catKey: 'retail',
      badgeColor: '#059669', // Emerald Retail Green
      textClass: 'text-emerald',
      sector: 'food_retail',
      svgIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12z"/></svg>'
    };
  }

  // 7. Healthcare / Hospital / Clinic / Pharmacy
  if (text.includes('hosp') || text.includes('clinic') || text.includes('health') || text.includes('med') || text.includes('pharmacy') || text.includes('drug') || text.includes('doctor')) {
    return {
      catKey: 'healthcare',
      badgeColor: '#DC2626', // Medical Red
      textClass: 'text-red',
      sector: 'everyday_services',
      svgIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 10.5h-5.5V5h-3v5.5H5v3h5.5V19h3v-5.5H19v-3z"/></svg>'
    };
  }

  // 8. Hotel / Lodging / Resort / Tourism (e.g. Sea and Sky Hotel)
  if (text.includes('hotel') || text.includes('inn') || text.includes('resort') || text.includes('lodging') || text.includes('hostel') || text.includes('tourism') || text.includes('sea and sky') || text.includes('sky')) {
    return {
      catKey: 'hospitality',
      badgeColor: '#D97706', // Amber Hospitality
      textClass: 'text-amber',
      sector: 'tourism_recreation',
      svgIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/></svg>'
    };
  }

  // 9. Personal Care / Barber / Salon
  if (text.includes('barber') || text.includes('salon') || text.includes('beauty') || text.includes('spa') || text.includes('grooming') || text.includes('hair') || text.includes('caza')) {
    return {
      catKey: 'beauty',
      badgeColor: '#DB2777', // Pink Beauty
      textClass: 'text-pink',
      sector: 'everyday_services',
      svgIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm16-4.5V15h-3l-4.5 4.5 1.5 1.5L22 15.5zM19 3l-6 6 1.5 1.5L22 4.5V3h-3z"/></svg>'
    };
  }

  // Default fallback (Sky Blue Pin)
  return {
    catKey: 'default',
    badgeColor: '#0284C7', // Sky Blue
    textClass: 'text-blue',
    sector: 'all',
    svgIcon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>'
  };
}

function formatAlertNotice(notice) {
  if (!notice) return 'Confirm zoning and utility connection clearance.';
  let clean = String(notice).trim();
  clean = clean.replace(/^(check\s+confirm|check\s+verify|check\s+review)/i, 'Confirm');
  clean = clean.replace(/^Check\s+/i, '');
  if (!/^(confirm|verify|review|inspect|check|subject\s+to|requires)\b/i.test(clean)) {
    clean = 'Confirm ' + clean.charAt(0).toLowerCase() + clean.slice(1);
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Format a candidate item from evaluation into an opportunity card data structure.
 */
export function formatOpportunityDisplayItem(m, index = 0) {
  let pillText = 'Multiple nearby activity centers';
  if (Array.isArray(m.supportingPlaces) && m.supportingPlaces.length) {
    if (m.supportingPlaces.length === 1) {
      pillText = `Near ${m.supportingPlaces[0].name}${m.supportingPlaces[0].distanceFormatted ? ` (${m.supportingPlaces[0].distanceFormatted})` : ''}`;
    } else {
      pillText = `Near ${m.supportingPlaces[0].name} & ${m.supportingPlaces[1].name}`;
    }
  } else if (m.id && m.id.includes('eatery')) {
    pillText = 'Potential daytime customers';
  } else if (m.id && m.id.includes('printing')) {
    pillText = 'School and government-office context';
  }

  const cleanAlert = formatAlertNotice(m.mainUnresolvedNotice);

  return {
    id: m.id,
    label: (m.label || '').toUpperCase(),
    sector: m.sector,
    sectorLabel: m.sectorLabel,
    rank: m.rank || (index + 1),
    statusLabel: 'Preliminary',
    description: m.description,
    pillText,
    alertText: cleanAlert,
    icon: m.id,
    explanation: m.explanation,
    mainUnresolvedNotice: cleanAlert,
    supportingPlaces: m.supportingPlaces || [],
    areaGuideline: m.areaGuideline,
    areaStatus: m.areaStatus,
    zoningOutcome: m.zoningOutcome,
    zoningOutcomeLabel: m.zoningOutcomeLabel,
    zoningConditions: m.zoningConditions || [],
    zoningCitation: m.zoningCitation,
    zoningStatus: m.zoningStatus,
    zoningClassification: m.zoningClassification,
    businessFitScore: m.businessFitScore,
    businessFitExplanation: m.businessFitExplanation,
    supportingConditions: m.supportingConditions,
    nearbyContext: m.nearbyContext,
    roadAccessRequirement: m.roadAccessRequirement,
    missingEvidence: m.missingEvidence || [],
    competitorsNotice: m.competitorsNotice,
    competitorSample: m.competitorSample || [],
    complementaryCount: m.complementaryCount || 0,
    complementarySample: m.complementarySample || [],
    ruleSource: m.ruleSource || RULE_SOURCE,
    version: m.version || RULE_VERSION,
  };
}

/**
 * Map business opportunity catalog items to scenario simulation activity codes and suggested capitalization.
 */
export function mapOpportunityToScenarioActivity(oppId, oppLabel = '') {
  const normId = String(oppId || '').toLowerCase().trim();
  const map = {
    convenience_store: { activityCode: 'retail_convenience', capital: 1500000, label: 'Convenience Retail Store' },
    grocery: { activityCode: 'retail_supermarket', capital: 5000000, label: 'Neighborhood Grocery & Mart' },
    bakery: { activityCode: 'food_bakery', capital: 1200000, label: 'Bakery & Pastry Shop' },
    eatery: { activityCode: 'food_restaurant', capital: 2000000, label: 'Casual Dining & Eatery' },
    cafe: { activityCode: 'food_cafe', capital: 3500000, label: 'Café & Beverage Specialty' },
    printing: { activityCode: 'office_professional', capital: 1000000, label: 'Printing & Document Services' },
    school_supplies: { activityCode: 'retail_convenience', capital: 1000000, label: 'School & Office Supplies Retail' },
    laundry: { activityCode: 'retail_convenience', capital: 1800000, label: 'Laundry & Garment Care' },
    water_refilling: { activityCode: 'retail_convenience', capital: 800000, label: 'Water Refilling Station' },
    salon_barbershop: { activityCode: 'retail_convenience', capital: 800000, label: 'Salon & Grooming Services' },
    repair_shop: { activityCode: 'retail_hardware', capital: 600000, label: 'Electronics & Appliance Repair' },
    courier: { activityCode: 'office_professional', capital: 1200000, label: 'Courier & Logistics Drop-off' },
    hardware: { activityCode: 'retail_hardware', capital: 4000000, label: 'Hardware & Trade Supplies' },
    accommodation: { activityCode: 'tour_hotel', capital: 15000000, label: 'Travelers Accommodation & Inn' },
    tour_services: { activityCode: 'tour_recreation', capital: 1500000, label: 'Tour & Activity Booking Agency' },
    agri_vet_supply: { activityCode: 'agri_crop_production', capital: 1500000, label: 'Agri-Vet & Animal Feeds Supply' },
    cold_storage: { activityCode: 'log_distribution_center', capital: 10000000, label: 'Cold Storage & Produce Logistics' },
  };

  if (normId && map[normId]) {
    return map[normId];
  }

  const lower = String(oppLabel || '').toLowerCase();
  if (lower.includes('hotel') || lower.includes('inn') || lower.includes('lodg')) return { activityCode: 'tour_hotel', capital: 15000000, label: oppLabel || 'Lodging' };
  if (lower.includes('caf') || lower.includes('coffee')) return { activityCode: 'food_cafe', capital: 3500000, label: oppLabel || 'Café' };
  if (lower.includes('rest') || lower.includes('eat') || lower.includes('din')) return { activityCode: 'food_restaurant', capital: 2000000, label: oppLabel || 'Dining' };
  if (lower.includes('bake') || lower.includes('bread')) return { activityCode: 'food_bakery', capital: 1200000, label: oppLabel || 'Bakery' };
  if (lower.includes('groc') || lower.includes('mart') || lower.includes('supermarket')) return { activityCode: 'retail_supermarket', capital: 5000000, label: oppLabel || 'Grocery' };
  if (lower.includes('ware') || lower.includes('stor') || lower.includes('cold')) return { activityCode: 'log_distribution_center', capital: 8000000, label: oppLabel || 'Logistics' };
  if (lower.includes('office') || lower.includes('bpo')) return { activityCode: 'office_professional', capital: 2500000, label: oppLabel || 'Office' };

  return { activityCode: 'retail_convenience', capital: 1500000, label: oppLabel || 'Proposed Business' };
}

/**
 * Render a single opportunity card with iOS-refined scannable front and collapsible evidence drawer.
 */
export function renderOpportunityCard(item, property = null) {
  const supportingList = Array.isArray(item.supportingPlaces) ? item.supportingPlaces : [];
  const supportingNames = supportingList.map(sp => sp.name || '').filter(Boolean).join('|||');
  const simInfo = mapOpportunityToScenarioActivity(item.id, item.label);

  return `
    <article class="opportunity-blue-card" data-opportunity-id="${esc(item.id)}" data-sector="${esc(item.sector)}" data-supporting-places="${esc(supportingNames)}" id="oppCard-${esc(item.id)}">
      <div class="opportunity-blue-main-row" data-toggle-opportunity-details="${esc(item.id)}" role="button" tabindex="0" aria-expanded="false" aria-controls="oppDetails-${esc(item.id)}" title="Click to view detailed evidence">
        <!-- White square icon box with burgundy SVG -->
        <div class="opportunity-blue-icon-box" aria-hidden="true">
          ${getOpportunityIconSvg(item.icon || item.id)}
        </div>

        <!-- Center information block (iOS Refined & Scannable) -->
        <div class="opportunity-blue-content">
          <div class="opportunity-card-kicker-row">
            <span class="opportunity-preliminary-tag">${esc(item.statusLabel || 'Screening suggestion')}</span>
            ${item.zoningOutcome === 'permitted' 
              ? '<span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-emerald-50 tw-text-emerald-700 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold tw-border tw-border-emerald-200">Permitted by Right</span>' 
              : (item.zoningOutcome === 'conditional'
                ? '<span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-amber-50 tw-text-amber-800 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold tw-border tw-border-amber-200">Conditional Use</span>'
                : (item.zoningOutcome === 'unverified' ? '<span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-slate-100 tw-text-slate-700 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold">Unverified Zoning</span>' : ''))}
          </div>

          <h3 class="opportunity-blue-title">${esc(item.label)}</h3>
          <p class="opportunity-blue-desc">${esc(item.description)}</p>
          
          <div class="opportunity-highlights-row">
            <div class="opportunity-lime-pill">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              <span>${esc(item.pillText || 'Multiple nearby activity centers')}</span>
            </div>

            <div class="opportunity-red-warning">
              <span class="warning-icon" aria-hidden="true">&#9888;</span>
              <span>${esc(item.alertText || item.mainUnresolvedNotice || 'Confirm commercial electric line capacity and delivery unloading space.')}</span>
            </div>
          </div>
        </div>

        <!-- Business Fit mini segmented arch + action controls -->
        <div class="opportunity-card-actions no-print">
          ${item.businessFitScore != null && Number.isFinite(Number(item.businessFitScore)) ? `
            <div class="opportunity-fit-arch" title="Business fit screening index (${Math.round(Number(item.businessFitScore))}/100)">
              <div class="locus-seg-gauge is-xs" data-score-arch data-score-fraction="${Math.max(0, Math.min(1, Number(item.businessFitScore) / 100))}" style="--score-fraction:${Math.max(0, Math.min(1, Number(item.businessFitScore) / 100))}">
                <div class="locus-seg-arch-stage">
                  ${typeof globalThis !== 'undefined' && globalThis.LocusScoreGauge ? globalThis.LocusScoreGauge.buildSvgMarkup(Number(item.businessFitScore) / 100) : '<svg class="locus-seg-arch-svg" viewBox="0 0 200 116" aria-hidden="true"></svg>'}
                  <div class="locus-seg-center"><strong class="locus-seg-center-val" data-score-count>${Math.round(Number(item.businessFitScore))}</strong></div>
                </div>
                <div class="locus-seg-meta"><span class="locus-seg-label">Fit</span></div>
              </div>
            </div>
          ` : ''}
          <button type="button" class="opportunity-quick-simulate-btn" data-simulate-activity="${esc(simInfo.activityCode)}" data-simulate-label="${esc(item.label)}" data-simulate-capital="${simInfo.capital}" title="Simulate ${esc(item.label)} on this property">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Simulate</span>
          </button>
          <button type="button" class="opportunity-circle-action-btn" data-toggle-opportunity-details="${esc(item.id)}" aria-expanded="false" aria-controls="oppDetails-${esc(item.id)}" aria-label="Toggle details for ${esc(item.label)}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <!-- iOS-Style Segmented Evidence Dropdown Drawer -->
      <div class="opportunity-evidence-drawer" id="oppDetails-${esc(item.id)}" hidden>
        <div class="opportunity-drawer-inner">
          <div class="opportunity-drawer-header">
            <div class="opportunity-drawer-heading-wrap">
              <span class="opportunity-rank-tag">Rank #${item.rank || 1}</span>
              <span class="opportunity-sector-badge">${esc(item.sectorLabel || 'Commercial Sector')}</span>
              <h4 class="opportunity-drawer-heading">Traceable Assessment Evidence</h4>
            </div>
            <span class="opportunity-drawer-status">Recorded map context · Straight-line screening</span>
          </div>

          <!-- 1. Supporting Activity Centers -->
          <div class="opportunity-evidence-group">
            <div class="opportunity-evidence-label">
              <span>Supporting activity centers within radius</span>
              <small>Straight-line radial proximity anchors</small>
            </div>
            <ul class="opportunity-places-list">
              ${supportingList.map(sp => {
                const distM = typeof sp.distanceMeters === 'number' && Number.isFinite(sp.distanceMeters) && sp.distanceMeters >= 0 ? sp.distanceMeters : null;
                const walkMin = distM === null ? null : Math.max(1, Math.round(distM / 80));
                return `
                  <li class="opportunity-place-item">
                    <div class="opportunity-place-main">
                      <span class="opportunity-place-icon" aria-hidden="true">&#9679;</span>
                      <strong class="opportunity-place-name">${esc(sp.name)}</strong>
                    </div>
                    <div class="opportunity-place-meta">
                      <span class="opportunity-place-badge">${esc(sp.distanceFormatted || (distM === null ? 'Distance not measured' : `${distM} m`))}</span>
                      ${walkMin === null ? '' : `<span class="amenity-walk-badge">~${walkMin} min walking estimate</span>`}
                      <span class="opportunity-place-cat">${esc(sp.category || 'Activity Center')}</span>
                    </div>
                  </li>
                `;
              }).join('')}
            </ul>
          </div>

          <!-- 2. Property & Zoning Fit Tiles -->
          <div class="opportunity-evidence-group">
            <div class="opportunity-evidence-label">
              <span>Property requirements vs site records</span>
              <small>Infrastructure &amp; CLUP compliance</small>
            </div>
            <div class="opportunity-specs-grid">
              <div class="opportunity-spec-item">
                <span class="opportunity-spec-label">Area Guideline</span>
                <strong class="opportunity-spec-val">${esc(item.areaGuideline || 'Standard commercial footprint')}</strong>
                <span class="opportunity-spec-state">${esc(item.areaStatus || 'Suitable for commercial frontage')}</span>
              </div>
              <div class="opportunity-spec-item">
                <span class="opportunity-spec-label">Zoning Compatibility</span>
                <strong class="opportunity-spec-val">${esc(item.zoningStatus || 'Compatible with zoning')}</strong>
                <span class="opportunity-spec-state">${esc(item.zoningClassification || 'Commercial / Mixed Use')}</span>
              </div>
              <div class="opportunity-spec-item">
                <span class="opportunity-spec-label">Road Access</span>
                <strong class="opportunity-spec-val">${esc(item.roadAccessRequirement || 'all_weather')} road required</strong>
                <span class="opportunity-spec-state">Direct frontage preferred</span>
              </div>
              <div class="opportunity-spec-item">
                <span class="opportunity-spec-label">Missing Records</span>
                <strong class="opportunity-spec-val">${item.missingEvidence && item.missingEvidence.length ? esc(item.missingEvidence.join(' · ')) : 'None recorded'}</strong>
                <span class="opportunity-spec-state">Ready for site evaluation</span>
              </div>
            </div>
          </div>

          <!-- 3. Zoning Findings & Business-Fit Calculation (Distinct from MCE/IAI) -->
          <div class="opportunity-evidence-group">
            <div class="opportunity-evidence-label">
              <span>Zoning Finding &amp; Separate Business-Fit Screening</span>
              <small>City Ordinance 2018-06 &middot; Kept distinct from property MCE/IAI</small>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-weight: 600; color: #475569;">Permitted Status:</span>
                <strong style="color: ${item.zoningOutcome === 'permitted' ? '#047857' : (item.zoningOutcome === 'conditional' ? '#b45309' : '#334155')};">
                  ${esc(item.zoningOutcomeLabel || (item.zoningOutcome === 'permitted' ? 'Permitted by Right' : (item.zoningOutcome === 'conditional' ? 'Conditional Use' : 'Unverified Clearance')))}
                </strong>
              </div>
              ${item.zoningConditions && item.zoningConditions.length ? `
                <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px; color: #92400e;">
                  <span style="font-weight: 600; display: block; margin-bottom: 2px;">Zoning Conditions (City Ordinance 2018-06):</span>
                  <ul style="margin: 0; padding-left: 18px; font-size: 11px;">
                    ${item.zoningConditions.map(c => `<li>${esc(c)}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              ${item.businessFitExplanation ? `
                <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px; color: #334155; line-height: 1.45; font-size: 11px;">
                  <strong style="color: #0f172a; display: block; margin-bottom: 2px;">Business Fit Index (${item.businessFitScore || 'N/A'}/100):</strong>
                  ${esc(item.businessFitExplanation)}
                </div>
              ` : ''}
              <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px; color: #64748b; font-size: 10px;">
                Note: Radial screening measures 500m straight-line proximity (not walking or driving travel distance). Recommendations are screening suggestions only, not guarantees of demand, profit, or official development approval.
              </div>
            </div>
          </div>

          <!-- 3. Local Market Context -->
          <div class="opportunity-evidence-group">
            <div class="opportunity-evidence-label">
              <span>Mapped establishments in radius</span>
              <small>Partial inventory · Operating status may be unverified</small>
            </div>
            <div class="opportunity-comp-row">
              <div class="opportunity-comp-box">
                <strong>Recorded competitors:</strong>
                <p>${esc(item.competitorsNotice || 'Competitor coverage is not recorded')}</p>
                ${item.competitorSample && item.competitorSample.length ? `<small>Recorded examples: ${esc(item.competitorSample.join(', '))}</small>` : ''}
              </div>
              <div class="opportunity-comp-box">
                <strong>Complementary businesses:</strong>
                <p>${item.complementaryCount > 0 ? `${item.complementaryCount} complementary mapped anchors found` : 'No complementary places recorded in this partial dataset'}</p>
                ${item.complementarySample && item.complementarySample.length ? `<small>Synergies: ${esc(item.complementarySample.join(', '))}</small>` : ''}
              </div>
            </div>
          </div>

          <!-- 4. Direct City Planning Inquiry CTA & Simulation Button -->
          <div class="opportunity-drawer-cta-row">
            <div class="opportunity-drawer-btn-group">
              <button type="button" class="opportunity-simulate-cta-btn" data-simulate-activity="${esc(simInfo.activityCode)}" data-simulate-label="${esc(item.label)}" data-simulate-capital="${simInfo.capital}" title="Simulate ${esc(item.label)} on this property">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Simulate on this property</span>
              </button>
              <button type="button" class="opportunity-inquire-cta-btn" data-inquire-use="${esc(item.label)}" data-opportunity-id="${esc(item.id)}" title="Contact City Investment Facilitation regarding ${esc(item.label)}">
                <span>Inquire about ${esc(item.label)} suitability</span>
                <span aria-hidden="true">&nearr;</span>
              </button>
            </div>
            <p class="opportunity-drawer-disclaimer-note">Directs to City Planning &amp; Investment facilitation team</p>
          </div>

          <!-- 5. Rule provenance audit -->
          <div class="opportunity-provenance-footer">
            <div>
              <strong>Rule source:</strong> <span>${esc(item.ruleSource || RULE_SOURCE)}</span>
            </div>
            <div>
              <strong>Version:</strong> <span>${esc(item.version || RULE_VERSION)} &middot; Exploratory draft rule requiring City Planning validation</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
}

/**
 * Render the "Business opportunities to explore" section markup matching Picture 2.
 */
export function businessOpportunitiesMarkup(property, options = {}) {
  const demo = options.demo === true;
  const opp = property.businessOpportunities || evaluateBusinessOpportunities(property, 500);
  const radius = opp.radiusMeters || 500;
  const observed = observedBusinessContext(property, radius);
  const rawMatches = (observed.hasCoords || demo) && Array.isArray(opp.supportedMatches) && opp.supportedMatches.length ? opp.supportedMatches : [];
  const lat = observed.lat;
  const lng = observed.lng;

  // Determine real nearby places from opp or property
  const rawNearby = observedBusinessContext({ ...property, nearbyBusinesses: opp.nearbyPlaces || property.nearbyBusinesses }, radius).nearbyPlaces;
  const realAnchors = [];
  const seenAnchorNames = new Set();
  for (const p of rawNearby) {
    const nm = (p.name || '').trim();
    if (nm && !seenAnchorNames.has(nm.toLowerCase())) {
      seenAnchorNames.add(nm.toLowerCase());
      realAnchors.push(p);
    }
  }

  // Build amenity chips list dynamically with estimated walking times and tailored category SVGs
  let amenityChips = [];
  if (realAnchors.length > 0) {
    amenityChips = realAnchors.slice(0, 3).map((a, idx) => {
      const iconInfo = getAnchorIconInfo(a);
      const distM = a.distanceMeters || (a.distanceFormatted ? parseInt(a.distanceFormatted, 10) : 180);
      const walkMinutes = Math.max(1, Math.round((distM || 180) / 80));

      return {
        index: idx,
        iconHtml: `<span class="amenity-icon ${iconInfo.textClass}" aria-hidden="true">${iconInfo.svgIcon}</span>`,
        label: `${a.name}${a.distanceFormatted ? ` (${a.distanceFormatted})` : ''}`,
        walkMinutes,
        lat: a.lat,
        lng: a.lng,
        name: a.name,
        category: a.category || 'Activity Center'
      };
    });
  } else if (demo) {
    // Demo fallback chips matching Picture 2 with crisp vector icons
    amenityChips = [
      {
        index: 0,
        iconHtml: '<span class="amenity-icon text-red" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 10.5h-5.5V5h-3v5.5H5v3h5.5V19h3v-5.5H19v-3z"/></svg></span>',
        label: 'Hospital nearby',
        walkMinutes: 2,
        lat: lat + 0.002,
        lng: lng - 0.002,
        name: 'Hospital',
        category: 'Healthcare'
      },
      {
        index: 1,
        iconHtml: '<span class="amenity-icon text-blue" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg></span>',
        label: 'School nearby',
        walkMinutes: 3,
        lat: lat + 0.001,
        lng: lng + 0.003,
        name: 'School',
        category: 'Education'
      },
      {
        index: 2,
        iconHtml: '<span class="amenity-icon text-navy" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2L2 7v2h20V7L12 2zm-8 8v9h3v-9H4zm5 0v9h3v-9H9zm5 0v9h3v-9h-3zm5 0v9h3v-9h-3zM2 20v2h20v-2H2z"/></svg></span>',
        label: 'City hall nearby',
        walkMinutes: 4,
        lat: lat - 0.002,
        lng: lng + 0.001,
        name: 'City hall',
        category: 'Civic'
      }
    ];
  }
  
  // Illustrative records are available only when explicitly requested as a demo.
  const displayCards = rawMatches.length
    ? rawMatches.map((m, idx) => formatOpportunityDisplayItem(m, idx))
    : (demo ? DEMO_MATCHES : []);

  // Compute truthful per-sector match counts for the 4 tactile sector bento tiles
  const sectorCountFor = sectorKey => {
    if (!observed.hasCoords && !demo) return 0;
    if (observed.hasCoords && Array.isArray(property.nearbyBusinesses) && property.nearbyBusinesses.length > 0) {
      const evaluated = evaluateBusinessOpportunities(property, radius, sectorKey);
      return Array.isArray(evaluated?.supportedMatches) ? evaluated.supportedMatches.length : 0;
    }
    if (rawMatches.length) {
      if (sectorKey === 'all') return rawMatches.length;
      return rawMatches.filter(m => m.sector === sectorKey).length;
    }
    if (demo) {
      return (SECTOR_DEMO_MATCHES[sectorKey] || DEMO_MATCHES).length;
    }
    return 0;
  };
  const sectorMetaText = (sectorKey, fallbackLabel) => {
    if (sectorKey === 'all') return `${BUSINESS_CATALOG.length} catalog profiles`;
    const count = sectorCountFor(sectorKey);
    if (!observed.hasCoords && !demo) return fallbackLabel;
    return count === 1 ? '1 suggestion' : `${count} suggestions`;
  };
  const radiusLabel = radius >= 1000 ? `${radius / 1000} km` : `${Math.round(radius)} m`;

  return `
    <section class="property-panel property-opportunities" id="propertyOpportunitiesSection" aria-labelledby="propertyOpportunitiesTitle">
      <!-- Embedded Spatial & Anchor Data for Leaflet Interactive Initialization -->
      <script type="application/json" class="opportunities-data-store" id="oppDataStore">
        ${JSON.stringify({
          lat,
          lng,
          radius,
          demo,
          propertyName: property.name || 'Subject Property',
          anchors: realAnchors.length ? realAnchors : (demo ? [
            { name: 'Hospital', category: 'Healthcare', lat: lat + 0.002, lng: lng - 0.002, distanceFormatted: '180 m', distanceMeters: 180 },
            { name: 'School', category: 'Education', lat: lat + 0.001, lng: lng + 0.003, distanceFormatted: '240 m', distanceMeters: 240 },
            { name: 'City hall', category: 'Civic', lat: lat - 0.002, lng: lng + 0.001, distanceFormatted: '310 m', distanceMeters: 310 }
          ] : [])
        })}
      </script>

      <!-- Tactile Matte-Gray Smart-Bento Stage -->
      <div class="opp-bento-stage">
        <div class="opportunities-split-layout">
          <!-- LEFT COLUMN: Volt-Lime Pill Header + White Suggestions Analytics Card -->
          <div class="opportunities-cards-column">
            <div class="opp-volt-header-row">
              <div class="opp-volt-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div class="opp-volt-pill">
                <div class="opp-volt-pill-copy">
                  <h2 id="propertyOpportunitiesTitle" class="opportunities-main-title">Business opportunities to explore</h2>
                  <p class="opportunities-subtitle">
                    Based on nearby places, property requirements and available evidence.
                    <span class="sr-only">Suggestions based on nearby establishments, property characteristics, infrastructure and available zoning information.</span>
                  </p>
                </div>
                <span class="opp-volt-dots" aria-hidden="true"><i></i><i></i><i></i></span>
              </div>
            </div>

            <div class="opp-analytics-card">
              <div class="opp-analytics-head">
                <div class="opp-analytics-head-left">
                  <span class="opp-analytics-glyph" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                  </span>
                  <div class="opp-analytics-titles">
                    <h3 class="opp-analytics-title">Suggested Business Uses</h3>
                    <div class="opportunities-kicker-banner">
                      <span>${demo ? 'DEMO SCENARIO - Illustrative places and suggestions' : 'Draft suggestions · Partial mapped inventory'}</span>
                    </div>
                  </div>
                </div>
                <button type="button" class="opp-analytics-launch" data-open-opportunities-catalog title="Browse all ${BUSINESS_CATALOG.length} business profiles" aria-label="Browse all ${BUSINESS_CATALOG.length} business profiles">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="7" y1="17" x2="17" y2="7"></line>
                    <polyline points="8 7 17 7 17 16"></polyline>
                  </svg>
                </button>
              </div>

              <div class="opportunities-blue-stack" id="opportunitiesCardsStack">
                ${displayCards.length ? displayCards.map(item => renderOpportunityCard(item, property)).join('') : '<p class="opportunities-empty-state">No suggestions are supported by the recorded nearby places. Inventory completeness and operating business density remain unknown.</p>'}
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: White Screening Map Widget + Recessed Sector Bento Tray -->
          <div class="opp-right-bento-col">
            <div class="opportunities-lime-card">
              <div class="opp-map-widget-head">
                <div class="opp-map-widget-titles">
                  <span class="opp-map-widget-glyph" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="9"></circle>
                      <circle cx="12" cy="12" r="4"></circle>
                      <line x1="12" y1="3" x2="12" y2="5"></line>
                      <line x1="12" y1="19" x2="12" y2="21"></line>
                      <line x1="3" y1="12" x2="5" y2="12"></line>
                      <line x1="19" y1="12" x2="21" y2="12"></line>
                    </svg>
                  </span>
                  <div>
                    <h3 class="opp-map-widget-title">Screening Radius Map</h3>
                    <p class="opp-map-widget-sub" id="oppMapSubtitle">${observed.hasCoords ? `${realAnchors.length} mapped nearby ${realAnchors.length === 1 ? 'place' : 'places'} in context` : 'Exact property location needed'}</p>
                  </div>
                </div>

                <!-- Tactile Pill Radius Switcher: 300m, 500m, 1km -->
                <div class="opportunities-map-radius-selector" role="group" aria-label="Screening radius selector">
                  <button type="button" class="opp-radius-btn${radius === 300 ? ' is-active' : ''}" data-radius-val="300">300 m</button>
                  <button type="button" class="opp-radius-btn${radius !== 300 && radius !== 1000 ? ' is-active' : ''}" data-radius-val="500">500 m</button>
                  <button type="button" class="opp-radius-btn${radius === 1000 ? ' is-active' : ''}" data-radius-val="1000">1 km</button>
                </div>
              </div>

              <div class="opp-map-meta-row">
                <span class="opp-radius-pill-badge">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9"></circle>
                    <polyline points="12 7 12 12 15 14"></polyline>
                  </svg>
                  <span id="oppRadiusBadgeText">${esc(radiusLabel)}</span>
                </span>
                <span class="opp-map-meta-note">${observed.hasCoords ? 'Straight-line radial screening · Partial inventory' : 'Add coordinates to enable radial map'}</span>
              </div>

              <!-- Stylized Map Box with Real Leaflet Canvas, Interactive Overlays & Static Fallback -->
              <div class="opportunities-map-box" id="opportunitiesInteractiveMap" data-lat="${lat ?? ''}" data-lng="${lng ?? ''}" data-demo="${demo}" data-radius="${radius}" data-property-name="${esc(property.name || 'Subject Property')}">
                <!-- Map Recenter Button -->
                <button type="button" class="opportunities-map-recenter-btn" id="oppRecenterBtn" title="Recenter to property location" aria-label="Recenter map to property location">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                  </svg>
                </button>

                <!-- Real Interactive Leaflet Map Canvas (Activated via JS) -->
                <div class="opportunities-leaflet-canvas" id="opportunitiesLeafletCanvas" role="region" aria-label="Interactive Screening Radius Map" style="display:none;width:100%;height:100%;position:absolute;top:0;left:0;border-radius:18px;z-index:2;"></div>

                <!-- Map Layer Switcher Button (Street / Sat) -->
                <button type="button" class="opportunities-map-layer-btn" id="oppLayerToggleBtn" title="Toggle Satellite / Street view" aria-label="Toggle map view">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                    <polyline points="2 17 12 22 22 17"></polyline>
                    <polyline points="2 12 12 17 22 12"></polyline>
                  </svg>
                  <span id="oppLayerBtnText">Sat</span>
                </button>

                <!-- Fallback Vector Map Canvas (Displayed for SSR & headless test runners) -->
                <div class="opportunities-map-static-fallback" id="opportunitiesMapStaticFallback" ${demo ? '' : 'hidden'}>
                  ${demo ? `
                  <svg class="opportunities-map-svg" viewBox="0 0 460 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                    <rect width="100%" height="100%" fill="#F1EFE8"/>
                    <path d="M 0,210 C 50,195 80,245 130,285 L 130,300 L 0,300 Z" fill="#C4E0E5"/>
                    <path d="M 0,210 C 50,195 80,245 130,285" stroke="#A7D5DE" stroke-width="6" fill="none" opacity="0.7"/>
                    <rect x="25" y="30" width="65" height="48" rx="4" fill="#E8E6DF"/>
                    <rect x="105" y="25" width="80" height="58" rx="4" fill="#E8E6DF"/>
                    <rect x="220" y="35" width="60" height="38" rx="4" fill="#D2E3C6"/>
                    <rect x="310" y="28" width="75" height="48" rx="4" fill="#E8E6DF"/>
                    <rect x="400" y="42" width="50" height="52" rx="4" fill="#E8E6DF"/>
                    <rect x="30" y="98" width="58" height="45" rx="4" fill="#E8E6DF"/>
                    <rect x="110" y="102" width="55" height="52" rx="4" fill="#E8E6DF"/>
                    <rect x="290" y="95" width="70" height="55" rx="4" fill="#D2E3C6"/>
                    <rect x="380" y="108" width="70" height="60" rx="4" fill="#E8E6DF"/>
                    <rect x="35" y="165" width="50" height="40" rx="4" fill="#E8E6DF"/>
                    <rect x="300" y="170" width="55" height="45" rx="4" fill="#E8E6DF"/>
                    <rect x="375" y="188" width="70" height="52" rx="4" fill="#D2E3C6"/>
                    <rect x="200" y="240" width="90" height="45" rx="4" fill="#E8E6DF"/>
                    <rect x="310" y="248" width="65" height="40" rx="4" fill="#E8E6DF"/>
                    <path d="M 370,175 Q 425,155 450,205 L 450,275 Q 395,265 370,215 Z" fill="#D2E3C6"/>
                    <path d="M 0,88 L 460,88 M 0,158 L 460,158 M 0,228 L 460,228" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
                    <path d="M 95,0 L 95,300 M 180,0 L 180,300 M 275,0 L 275,300 M 365,0 L 365,300" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
                    <path d="M 20,0 L 250,230" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
                    <path d="M 180,40 L 440,300" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
                    <circle cx="215" cy="145" r="90" fill="#1A73E8" fill-opacity="0.08" stroke="#1A73E8" stroke-width="2" stroke-dasharray="6 4"/>
                    <line x1="285" y1="100" x2="310" y2="92" stroke="#1A73E8" stroke-width="1.5"/>
                  </svg>
                  <div class="opportunities-map-radius-tag-bubble" id="opportunitiesMapRadiusTagBubble">
                    <span>500 m</span>
                  </div>
                  <div class="opportunities-map-center-pin" title="Subject Property Location">
                    <svg viewBox="0 0 27 41" width="24" height="36" fill="none" aria-hidden="true">
                      <path fill="#EA4335" d="M13.5 0C6.04 0 0 6.04 0 13.5c0 10.12 13.5 27.5 13.5 27.5S27 23.62 27 13.5C27 6.04 20.96 0 13.5 0z"/>
                      <circle fill="#FFFFFF" cx="13.5" cy="13.5" r="5"/>
                    </svg>
                  </div>
                  <div class="opportunities-map-poi poi-hospital">
                    <span class="poi-icon-circle bg-red" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </span>
                    <span class="poi-label">${esc(amenityChips[0]?.name || 'Hospital')}</span>
                  </div>
                  <div class="opportunities-map-poi poi-school">
                    <span class="poi-icon-circle bg-blue" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="#FFFFFF">
                        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                      </svg>
                    </span>
                    <span class="poi-label">${esc(amenityChips[1]?.name || 'School')}</span>
                  </div>
                  <div class="opportunities-map-poi poi-cityhall">
                    <span class="poi-icon-circle bg-navy" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="#FFFFFF">
                        <path d="M12 2L2 7v2h20V7L12 2zm-8 8v9h3v-9H4zm5 0v9h3v-9H9zm5 0v9h3v-9h-3zm5 0v9h3v-9h-3zM2 20v2h20v-2H2z"/>
                      </svg>
                    </span>
                    <span class="poi-label">${esc(amenityChips[2]?.name || 'City hall')}</span>
                  </div>
                  ` : ''}
                </div>

                <!-- Map bottom-left tag overlay -->
                <div class="opportunities-map-foot-chip" id="opportunitiesMapFootChip" style="z-index: 5;">
                  <span>${observed.hasCoords ? `${radius} m straight-line screening radius · Partial mapped inventory` : 'Exact property location needed · Nearby inventory unknown'}</span>
                </div>
              </div>

              <!-- Dynamic Amenity Pill Chips below map with walking times -->
              <div class="opportunities-amenities-row">
                ${amenityChips.map(c => `
                  <button type="button" class="opportunities-amenity-chip" data-anchor-index="${c.index}" data-anchor-name="${esc(c.name)}" data-anchor-lat="${c.lat}" data-anchor-lng="${c.lng}" title="Click to focus ${esc(c.name)} on map">
                    ${c.iconHtml}
                    <span>${esc(c.name)}</span>
                    <span class="amenity-walk-badge">~${c.walkMinutes} min walk</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Recessed Sector Bento Tray (Morning/Night Scene + Bottom Action Bar Grammar) -->
            <div class="opp-scenes-tray opportunities-bottom-filter-row">
              <div class="opportunities-filter-pills opp-sector-bento-grid" role="tablist" aria-label="Business categories">
                <button type="button" class="opportunities-filter-pill opp-sector-tile is-active" data-cat-filter="everyday_services" role="tab" aria-selected="true">
                  <span class="opp-sector-tile-top">
                    <span class="opp-sector-tile-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                    </span>
                    <span class="opp-sector-tile-dots" aria-hidden="true"><i></i><i></i></span>
                  </span>
                  <span class="opp-sector-tile-copy">
                    <strong>Everyday services</strong>
                    <small>${esc(sectorMetaText('everyday_services', 'Clinics & offices'))}</small>
                  </span>
                </button>

                <button type="button" class="opportunities-filter-pill opp-sector-tile" data-cat-filter="food_retail" role="tab" aria-selected="false">
                  <span class="opp-sector-tile-top">
                    <span class="opp-sector-tile-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    </span>
                    <span class="opp-sector-tile-dots" aria-hidden="true"><i></i><i></i></span>
                  </span>
                  <span class="opp-sector-tile-copy">
                    <strong>Food &amp; retail</strong>
                    <small>${esc(sectorMetaText('food_retail', 'Cafes & retail'))}</small>
                  </span>
                </button>

                <button type="button" class="opportunities-filter-pill opp-sector-tile" data-cat-filter="tourism_recreation" role="tab" aria-selected="false">
                  <span class="opp-sector-tile-top">
                    <span class="opp-sector-tile-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                    </span>
                    <span class="opp-sector-tile-dots" aria-hidden="true"><i></i><i></i></span>
                  </span>
                  <span class="opp-sector-tile-copy">
                    <strong>Tourism &amp; recreation</strong>
                    <small>${esc(sectorMetaText('tourism_recreation', 'Wellness & stays'))}</small>
                  </span>
                </button>

                <button type="button" class="opportunities-filter-pill opp-sector-tile" data-cat-filter="all" role="tab" aria-selected="false">
                  <span class="opp-sector-tile-top">
                    <span class="opp-sector-tile-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                    </span>
                    <span class="opp-sector-tile-dots" aria-hidden="true"><i></i><i></i></span>
                  </span>
                  <span class="opp-sector-tile-copy">
                    <strong>Other business types</strong>
                    <small>${esc(sectorMetaText('all', 'All 17 profiles'))}</small>
                  </span>
                </button>
              </div>

              <div class="opp-catalog-bar opportunities-explore-link-wrap">
                <div class="opp-catalog-bar-left">
                  <span class="opp-catalog-plus" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  </span>
                  <div class="opp-catalog-bar-copy">
                    <strong>Explore other business types</strong>
                    <span>${BUSINESS_CATALOG.length} draft profiles across ${Object.keys(BUSINESS_SECTORS).length} sectors</span>
                  </div>
                </div>
                <button type="button" class="opportunities-explore-more-btn opp-catalog-see-all" data-open-opportunities-catalog id="openOpportunitiesCatalogBtn">
                  <span>See All</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Disclaimer Bar -->
        <div class="opportunities-disclaimer-strip">
          <div class="opportunities-disclaimer-left">
            <span class="disclaimer-info-icon" aria-hidden="true">&#9432;</span>
            <span>Zoning: Not verified &middot; Market demand: Not measured &middot; Map coverage: Unknown</span>
          </div>
          <div class="opportunities-disclaimer-right">
            <span>Preliminary suggestions, not a profitability forecast.</span>
          </div>
        </div>
      </div>

      <!-- Full Catalog Explorer Dialog -->
      ${catalogDialogMarkup()}
    </section>
  `;
}

/**
 * Render the modal dialog for browsing all 17 business catalog profiles.
 */
export function catalogDialogMarkup() {
  return `
    <dialog class="opportunities-catalog-dialog no-print" id="opportunitiesCatalogDialog" aria-labelledby="opportunitiesCatalogTitle" aria-modal="true">
      <div class="opportunities-catalog-container">
        <div class="opportunities-catalog-header">
          <div>
            <span class="opportunities-kicker-badge">REFERENCE CATALOG</span>
            <h3 id="opportunitiesCatalogTitle" class="opportunities-catalog-title">Explore all business types</h3>
            <p class="opportunities-catalog-sub">17 configurable profiles across 5 economic sectors. All rules are currently marked as draft requiring local validation.</p>
          </div>
          <button type="button" class="opportunities-catalog-close-btn" id="closeOpportunitiesCatalogBtn" aria-label="Close business catalog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Sector Filters -->
        <div class="opportunities-catalog-filters" role="tablist" aria-label="Filter by sector">
          <button type="button" class="opportunities-sector-tab is-active" data-sector-filter="all" role="tab" aria-selected="true">All sectors (${BUSINESS_CATALOG.length})</button>
          ${Object.entries(BUSINESS_SECTORS).map(([key, label]) => `
            <button type="button" class="opportunities-sector-tab" data-sector-filter="${esc(key)}" role="tab" aria-selected="false">${esc(label)}</button>
          `).join('')}
        </div>

        <!-- Catalog Items Grid -->
        <div class="opportunities-catalog-grid" id="opportunitiesCatalogGrid">
          ${BUSINESS_CATALOG.map(item => {
            const simInfo = mapOpportunityToScenarioActivity(item.id, item.label);
            return `
            <div class="opportunities-catalog-card" data-catalog-sector="${esc(item.sector)}">
              <div class="opportunities-catalog-card-header">
                <span class="opportunity-sector-pill sector-${esc(item.sector)}">${esc(item.sectorLabel)}</span>
                <span class="opportunity-draft-pill">v1.0-draft</span>
              </div>
              <h4 class="opportunities-catalog-card-name">${esc(item.label)}</h4>
              <p class="opportunities-catalog-card-desc">${esc(item.description)}</p>

              <div class="opportunities-catalog-spec-block">
                <div><strong>Typical space:</strong> ${esc(item.areaGuideline)}</div>
                <div><strong>Key activity anchors:</strong> ${esc(item.activityCenters.join(', '))}</div>
                <div><strong>Allowed zoning:</strong> ${esc(item.allowedZonings.slice(0, 3).join(', '))}...</div>
              </div>

              <div class="opportunities-catalog-notice">
                <span>Status: Draft seed relationship requiring City Planning & LEBDO validation.</span>
              </div>

              <div class="opportunities-catalog-card-actions">
                <button type="button" class="opportunity-catalog-simulate-btn" data-simulate-activity="${esc(simInfo.activityCode)}" data-simulate-label="${esc(item.label)}" data-simulate-capital="${simInfo.capital}" title="Simulate ${esc(item.label)} on this property">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <span>Simulate on Parcel</span>
                </button>
                <button type="button" class="opportunity-catalog-inquire-btn" data-inquire-use="${esc(item.label)}" data-opportunity-id="${esc(item.id)}" title="Inquire about ${esc(item.label)} suitability">
                  <span>Inquire</span> &nearr;
                </button>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      </div>
    </dialog>
  `;
}

/**
 * Initialize interactive behaviors for the Business Opportunities section:
 * 1. Real Leaflet Interactive Screening Map with property pin, 500m radius circle, and real anchor markers
 * 2. Amenity chip click-to-fly map interactions
 * 3. iOS-style Accordion Dropdown toggle
 * 4. Category filter pills
 * 5. Full catalog explorer dialog
 */
export function initBusinessOpportunities(root = document, property = null) {
  // Helpers for wiring card drawer accordion & inquiry CTA
  function bindDrawerEvents(container) {
    container.querySelectorAll('[data-toggle-opportunity-details]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-toggle-opportunity-details');
        const drawer = container.querySelector(`#oppDetails-${id}`);
        if (!drawer) return;
        const isOpen = !drawer.hidden;
        drawer.hidden = isOpen;

        // Update card active class and button ARIA attributes
        const card = container.querySelector(`#oppCard-${id}`);
        if (card) card.classList.toggle('is-drawer-open', !isOpen);

        container.querySelectorAll(`[data-toggle-opportunity-details="${id}"]`).forEach(b => {
          b.setAttribute('aria-expanded', String(!isOpen));
          b.classList.toggle('is-expanded', !isOpen);
        });
      });

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });
  }

  function bindSimulationEvents(container) {
    container.querySelectorAll('[data-simulate-activity]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const activityCode = btn.getAttribute('data-simulate-activity');
        const activityLabel = btn.getAttribute('data-simulate-label') || 'Proposed Business';
        const capitalStr = btn.getAttribute('data-simulate-capital');
        const capitalNum = capitalStr ? parseFloat(capitalStr) : null;

        // 1. Close catalog dialog if open
        const catalogDialog = document.querySelector('#opportunitiesCatalogDialog');
        if (catalogDialog) {
          if (typeof catalogDialog.close === 'function' && catalogDialog.open) {
            catalogDialog.close();
          } else {
            catalogDialog.removeAttribute('open');
          }
        }

        // 2. Locate the scenario engine section and its parent disclosure
        const scenarioSection = document.getElementById('propertyScenarioSection');
        if (!scenarioSection) {
          console.warn('Scenario engine section #propertyScenarioSection not found in DOM.');
          return;
        }

        const parentDisclosure = scenarioSection.closest('.site-scenario-disclosure') || scenarioSection.closest('details');
        if (parentDisclosure && !parentDisclosure.open) {
          parentDisclosure.open = true;
        }

        // 3. Set the activity select dropdown
        const select = scenarioSection.querySelector('#investorProposedActivitySelect');
        if (select) {
          select.value = activityCode;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 4. Set proposed capital if provided
        if (capitalNum && capitalNum > 0) {
          const capitalInput = scenarioSection.querySelector('#investorProposedCapitalInput');
          if (capitalInput) {
            capitalInput.value = Number(capitalNum).toLocaleString('en-US');
            capitalInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

        // 5. Update quick-picks active pill if present
        scenarioSection.querySelectorAll('[data-scenario-quick-pick]').forEach(pill => {
          const pickCode = pill.getAttribute('data-scenario-quick-pick');
          pill.classList.toggle('is-active', pickCode === activityCode);
        });

        // 6. Smooth scroll to the scenario simulation section
        scenarioSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // 7. Trigger pulsing visual highlight animation
        scenarioSection.classList.remove('is-simulating-highlight');
        void scenarioSection.offsetWidth;
        scenarioSection.classList.add('is-simulating-highlight');
        setTimeout(() => {
          scenarioSection.classList.remove('is-simulating-highlight');
        }, 2200);

        // 8. Show feedback toast
        const existingToast = document.querySelector('.opp-simulation-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'opp-simulation-toast';
        toast.innerHTML = `
          <div class="opp-sim-toast-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <div class="opp-sim-toast-content">
            <strong>Simulating: ${esc(activityLabel)}</strong>
            <span>Evaluating CLUP zoning clearance &amp; incentives on this parcel</span>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('is-visible'), 10);
        setTimeout(() => {
          toast.classList.remove('is-visible');
          setTimeout(() => toast.remove(), 300);
        }, 3600);
      });
    });
  }

  function bindInquiryEvents(container) {
    container.querySelectorAll('[data-inquire-use]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const useName = btn.getAttribute('data-inquire-use') || 'selected business use';
        const oppId = btn.getAttribute('data-opportunity-id') || '';
        const propTitle = property?.title || property?.name || document.querySelector('.property-hero-title, .property-header-title, h1')?.textContent?.trim() || 'Subject Property';
        const propId = property?.id || property?.property_id || '';
        const barangay = property?.barangay || '';
        const zone = property?.clupProfile?.zoningClassification || property?.zoningClassification || property?.zoning_classification || '';
        const areaSqm = property?.area_sqm || property?.lot_area || '';
        const areaStr = areaSqm ? `${Number(areaSqm).toLocaleString('en-US')} sqm` : '';

        // Close catalog dialog if open
        const catalogDialog = document.querySelector('#opportunitiesCatalogDialog');
        if (catalogDialog) {
          if (typeof catalogDialog.close === 'function' && catalogDialog.open) {
            catalogDialog.close();
          } else {
            catalogDialog.removeAttribute('open');
          }
        }

        const inquiryPanel = document.getElementById('cityInquiryPanel');
        const inquiryText = document.getElementById('cityInquiryText');

        const propertyMeta = [
          propId ? `Parcel #${propId}` : null,
          barangay ? `Brgy. ${barangay}` : null,
          zone ? `CLUP Zone: ${zone}` : null,
          areaStr ? `Area: ${areaStr}` : null,
        ].filter(Boolean).join(' · ');

        const formalMessage = [
          `Inquiry regarding suitability for ${useName} at ${propTitle}${propertyMeta ? ` (${propertyMeta})` : ''}.`,
          '',
          `Dear City Planning & Development Office (CPDO) and Local Economic & Business Development Office (LEBDO):`,
          `I am evaluating the feasibility of establishing ${useName} on this property. Please advise on:`,
          `1. Locational clearance procedures, allowable use schedules, and specific conditions under City Ordinance No. 2018-06.`,
          `2. Technical infrastructure readiness (electric load capacity, municipal water line, drainage, and road access).`,
          `3. Available statutory incentives under the San Fernando City Investment Code (§19).`,
        ].join('\n');

        if (inquiryPanel) {
          if (typeof inquiryPanel.open !== 'undefined') {
            inquiryPanel.open = true;
          }
          if (inquiryText) {
            inquiryText.value = formalMessage;
            inquiryText.focus();
          }
          inquiryPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Floating toast for demo page or guest visitors
          const existingToast = document.querySelector('.opp-inquiry-toast');
          if (existingToast) existingToast.remove();

          const toast = document.createElement('div');
          toast.className = 'opp-inquiry-toast';
          toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#0F172A;color:#FFFFFF;padding:12px 20px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.25);font-family:Inter,sans-serif;font-size:13px;font-weight:600;z-index:99999;transition:all 0.25s ease;display:flex;align-items:center;gap:8px;';
          toast.innerHTML = `<span style="color:#22C55E;font-size:15px;">&#10003;</span> Suitability inquiry for <strong>${esc(useName)}</strong> prepared for City Investment Facilitation.`;
          document.body.appendChild(toast);
          setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 250);
          }, 3200);
        }
      });
    });
  }

  // Initial binding for cards present at render time
  bindDrawerEvents(root);
  bindInquiryEvents(root);
  bindSimulationEvents(root);

  let applySectorFilterToMap = () => {};
  let updateAmenityChipsForSector = () => {};
  let bindCardMapHover = () => {};
  // Map pins stay undimmed until the user explicitly picks a sector pill
  let mapSectorFilter = 'all';

  // 1. Setup real interactive Leaflet map if Leaflet is available
  const mapBox = root.querySelector('#opportunitiesInteractiveMap');
  const leafletCanvas = root.querySelector('#opportunitiesLeafletCanvas');
  const fallbackSvg = root.querySelector('#opportunitiesMapStaticFallback');

  let oppMap = null;
  let radiusCircle = null;
  let calloutMarker = null;
  let streetLayer = null;
  let satLayer = null;
  let currentLayerType = 'street';
  let currentRadius = parseFloat(mapBox?.getAttribute('data-radius')) || 500;
  let currentSector = 'everyday_services';

  const recordedMapLat = recordedCoordinate(mapBox?.getAttribute('data-lat'), 90);
  const recordedMapLng = recordedCoordinate(mapBox?.getAttribute('data-lng'), 180);
  const demoMode = mapBox?.getAttribute('data-demo') === 'true';

  // Helper to update sector tile suggestion counts when screening radius changes
  function syncSectorTileCounts(newRadius) {
    if (property && Array.isArray(property.nearbyBusinesses) && property.nearbyBusinesses.length > 0) {
      root.querySelectorAll('.opp-sector-tile[data-cat-filter]').forEach(tile => {
        const key = tile.getAttribute('data-cat-filter');
        if (!key || key === 'all') return;
        const count = evaluateBusinessOpportunities(property, newRadius, key)?.supportedMatches?.length || 0;
        const metaEl = tile.querySelector('.opp-sector-tile-copy small');
        if (metaEl) metaEl.textContent = count === 1 ? '1 suggestion' : `${count} suggestions`;
      });
    }
  }

  const useLatest3DMap = Boolean(
    mapBox && recordedMapLat !== null && recordedMapLng !== null && !demoMode
    && typeof window !== 'undefined' && window.SFC_APP_CONFIG && typeof window.SFC_APP_CONFIG.basePath === 'string'
  );

  function initLeafletMap() {
    if (!(mapBox && leafletCanvas && recordedMapLat !== null && recordedMapLng !== null && window.L && typeof window.L.map === 'function')) return;
    try {
      const lat = recordedMapLat;
      const lng = recordedMapLng;
      const propName = mapBox.getAttribute('data-property-name') || 'Subject Property';

      // Parse anchors from data store
      let anchors = [];
      const storeEl = root.querySelector('#oppDataStore');
      if (storeEl) {
        try {
          const stored = JSON.parse(storeEl.textContent);
          anchors = stored.anchors || [];
        } catch (_) {}
      }
      if (!anchors.length && property && Array.isArray(property.nearbyBusinesses)) {
        anchors = observedBusinessContext(property, currentRadius).nearbyPlaces;
      }

      // Avoid duplicate init
      if (!leafletCanvas._leaflet_id) {
        oppMap = L.map(leafletCanvas, {
          center: [lat, lng],
          zoom: 15,
          scrollWheelZoom: false,
          zoomControl: false,
          attributionControl: false
        });

        // Subtle zoom control at bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(oppMap);

        // Google Maps Street Basemap with OSM fallback
        const googleStreetUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
        const osmFallbackUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

        streetLayer = L.tileLayer(googleStreetUrl, {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; Google Maps'
        }).addTo(oppMap);

        streetLayer.on('tileerror', function() {
          if (!streetLayer._fallbackActive) {
            streetLayer._fallbackActive = true;
            streetLayer.setUrl(osmFallbackUrl);
          }
        });

        // Google Maps Hybrid Satellite Layer (High-Res Satellite + Roads + Place Labels)
        satLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; Google Maps'
        });

        // Refined Periwinkle-Cobalt Proximity Geofence Radius Circle
        radiusCircle = L.circle([lat, lng], {
          radius: currentRadius,
          color: '#3B6DF6',
          weight: 1.75,
          dashArray: '5, 6',
          fillColor: '#6E9BFF',
          fillOpacity: 0.10
        }).addTo(oppMap);

        // Subject Property Pin (Google Maps Iconic Red Teardrop with Home Glyph & Pulsing Radar Ring)
        const centerIcon = L.divIcon({
          className: 'opp-gmap-center-divicon locus-opp-center-marker',
          html: `<div class="opp-gmap-center-marker opp-pin-bubble" title="${esc(propName)}">
            <div class="opp-gmap-center-pulse"></div>
            <div class="opp-gmap-center-pin">
              <svg viewBox="0 0 27 41" width="27" height="41" class="opp-gmap-center-svg" aria-hidden="true">
                <path fill="#EA4335" d="M13.5 0C6.04 0 0 6.04 0 13.5c0 10.12 13.5 27.5 13.5 27.5S27 23.62 27 13.5C27 6.04 20.96 0 13.5 0z"/>
                <path fill="#C5221F" d="M13.5 0C6.04 0 0 6.04 0 13.5c0 2.45.65 4.74 1.78 6.72L13.5 41V0z" opacity="0.25"/>
                <circle fill="#FFFFFF" cx="13.5" cy="13.5" r="5.5"/>
                <path fill="#EA4335" d="M13.5 9.5l-3.2 2.7v3.8h2.2v-2.2h2v2.2h2.2v-3.8z"/>
              </svg>
              <div class="opp-gmap-center-ground-shadow"></div>
            </div>
          </div>`,
          iconSize: [28, 42],
          iconAnchor: [14, 41]
        });

        const centerMarker = L.marker([lat, lng], { icon: centerIcon, zIndexOffset: 10000 }).addTo(oppMap);
        centerMarker.bindPopup(`
          <div class="opp-gmap-popup-card opp-leaflet-popup">
            <div class="opp-gmap-popup-eyebrow">SCREENING ORIGIN</div>
            <strong class="opp-gmap-popup-title">${esc(propName)}</strong>
            <span class="opp-gmap-popup-meta">Subject Property &middot; Geofence Origin (0 m)</span>
          </div>
        `, { className: 'opp-gmap-popup-wrapper' });

        // Helper to update radius callout badge on circle perimeter (North-Northwest apex away from top-right controls)
        function updateRadiusTag(r) {
          if (calloutMarker) oppMap.removeLayer(calloutMarker);
          const calloutLat = lat + (r / 111320) * 0.96;
          const calloutLng = lng - (r / (111320 * Math.cos(lat * Math.PI / 180))) * 0.16;
          const rText = r >= 1000 ? (r / 1000) + ' km' : Math.round(r) + ' m';
          const calloutIcon = L.divIcon({
            className: 'opp-gmap-radius-tag-divicon locus-opp-radius-tag',
            html: `<div class="opp-gmap-radius-pill opp-radius-tag-badge">${rText} radius</div>`,
            iconSize: [88, 24],
            iconAnchor: [44, 12]
          });
          calloutMarker = L.marker([calloutLat, calloutLng], { icon: calloutIcon, interactive: false, zIndexOffset: 6500 }).addTo(oppMap);
        }
        updateRadiusTag(currentRadius);

        // Build clean two-tier spatial hierarchy:
        // Tier 1 (up to 9 spatially & categorically diverse key landmarks) render as crisp icon badges;
        // Tier 2 (remaining mapped places) render at their TRUE coordinates as subtle contextual micro-dots
        // that stay hoverable/clickable and automatically promote when hovering cards or filtering sectors.
        const cosLat = Math.cos(lat * Math.PI / 180);
        const validAnchors = anchors.map((a, idx) => {
          const rawLat = parseFloat(a.lat);
          const rawLng = parseFloat(a.lng);
          const distM = typeof a.distanceMeters === 'number' && Number.isFinite(a.distanceMeters)
            ? a.distanceMeters
            : (a.distanceFormatted ? parseInt(a.distanceFormatted, 10) : Math.round(haversineMeters(lat, lng, rawLat, rawLng)));
          const iconInfo = getAnchorIconInfo(a);
          return {
            data: a,
            originalIndex: idx,
            rawLat,
            rawLng,
            dispLat: rawLat,
            dispLng: rawLng,
            distM: Number.isFinite(distM) ? distM : 180,
            iconInfo,
            name: a.name || `Anchor ${idx + 1}`,
            isFeatured: false
          };
        }).filter(a => recordedCoordinate(a.rawLat, 90) !== null && recordedCoordinate(a.rawLng, 180) !== null && !closedPlace(a.data));

        // Select up to 9 high-signal featured anchors (diverse categories + closest landmarks)
        const PRIORITY_CATS = new Set(['hospital', 'healthcare', 'education', 'civic', 'worship', 'hotel', 'finance', 'mall', 'market', 'grocery', 'cafe']);
        const MAX_FEATURED = validAnchors.length <= 10 ? validAnchors.length : 9;
        const featuredSet = new Set();
        const usedFeaturedCats = new Set();

        // Pass 1: closest distinct high-signal categories + top 3 amenity chip anchors
        const rankedForFeatured = [...validAnchors].sort((a, b) => {
          const aPri = (a.originalIndex < 3 ? 0 : PRIORITY_CATS.has(a.iconInfo.catKey) ? 1 : 2);
          const bPri = (b.originalIndex < 3 ? 0 : PRIORITY_CATS.has(b.iconInfo.catKey) ? 1 : 2);
          if (aPri !== bPri) return aPri - bPri;
          return a.distM - b.distM;
        });

        for (const cand of rankedForFeatured) {
          if (featuredSet.size >= MAX_FEATURED) break;
          if (!usedFeaturedCats.has(cand.iconInfo.catKey) || cand.originalIndex < 3) {
            featuredSet.add(cand);
            usedFeaturedCats.add(cand.iconInfo.catKey);
            cand.isFeatured = true;
          }
        }
        // Pass 2: fill remaining featured slots with well-spaced closest landmarks
        for (const cand of rankedForFeatured) {
          if (featuredSet.size >= MAX_FEATURED) break;
          if (featuredSet.has(cand)) continue;
          const tooCloseToFeatured = [...featuredSet].some(f => {
            const dLat = f.rawLat - cand.rawLat;
            const dLng = (f.rawLng - cand.rawLng) * cosLat;
            return Math.sqrt(dLat * dLat + dLng * dLng) < 0.00075;
          });
          if (!tooCloseToFeatured) {
            featuredSet.add(cand);
            cand.isFeatured = true;
          }
        }

        // Degree-based nudge only for featured pins when projection is unavailable (headless tests)
        const minCenterDistDeg = 0.00030;
        validAnchors.filter(a => a.isFeatured).forEach((a, idx) => {
          const dLat = a.dispLat - lat;
          const dLng = (a.dispLng - lng) * cosLat;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          if (dist < minCenterDistDeg) {
            const angle = dist > 0.00002 ? Math.atan2(dLat, dLng) : (Math.PI / 3 + idx * 0.9);
            const pushDist = 0.00038;
            a.dispLat = lat + Math.sin(angle) * pushDist;
            a.dispLng = lng + (Math.cos(angle) * pushDist) / cosLat;
          }
        });

        // Add refined two-tier markers: crisp curated icon pins (Tier 1) + true-position micro-dots (Tier 2)
        const anchorMarkers = [];
        validAnchors.forEach(a => {
          const iconInfo = a.iconInfo;
          const badgeColor = iconInfo.badgeColor;
          const catKey = iconInfo.catKey;
          const svgIcon = iconInfo.svgIcon;
          const tierClass = a.isFeatured ? 'is-featured' : 'is-ambient';

          const aIcon = L.divIcon({
            className: 'opp-gmap-poi-divicon locus-opp-poi-marker',
            html: `<div class="opp-gmap-poi-pin opp-poi-pin ${tierClass}" style="--poi-color: ${badgeColor};" title="${esc(a.data.name)}" data-cat="${catKey}" data-sector="${iconInfo.sector}">
              <div class="opp-gmap-poi-circle">
                ${svgIcon}
              </div>
              <div class="opp-gmap-poi-tip"></div>
            </div>`,
            iconSize: [28, 34],
            iconAnchor: [14, 34]
          });

          const m = L.marker([a.dispLat, a.dispLng], { icon: aIcon, zIndexOffset: a.isFeatured ? 320 : 60 }).addTo(oppMap);
          const distM = a.distM;
          const walkMin = Math.max(1, Math.round((distM || 180) / 80));

          // Editorial Hover Tooltip
          m.bindTooltip(`
            <div class="opp-gmap-tooltip-content">
              <strong>${esc(a.data.name)}</strong>
              <span>${esc(a.data.category || 'Activity Anchor')} &bull; ${esc(a.data.distanceFormatted || (distM + ' m'))} (~${walkMin} min walk)</span>
            </div>
          `, {
            direction: 'top',
            offset: a.isFeatured ? [0, -28] : [0, -16],
            className: 'opp-gmap-tooltip-box',
            opacity: 1
          });

          // Rich Click Popup
          m.bindPopup(`
            <div class="opp-gmap-popup-card opp-leaflet-popup">
              <div class="opp-gmap-popup-badge" style="background: ${badgeColor}18; color: ${badgeColor}; border: 1px solid ${badgeColor}35;">
                ${esc(a.data.category || 'Activity Anchor')}
              </div>
              <strong class="opp-gmap-popup-title">${esc(a.data.name)}</strong>
              <div class="opp-gmap-popup-meta">
                <span>${esc(a.data.distanceFormatted || (distM + ' m'))}</span>
                <span>&middot;</span>
                <span>~${walkMin} min walk</span>
              </div>
              <span class="opp-gmap-popup-sub">Mapped place &middot; ${esc(recordedStatus(a.data) === 'operating' ? 'Operating status recorded' : 'Operating status unverified')}</span>
            </div>
          `, { className: 'opp-gmap-popup-wrapper' });

          anchorMarkers.push({
            data: a.data,
            rawLat: a.rawLat,
            rawLng: a.rawLng,
            dispLat: a.dispLat,
            dispLng: a.dispLng,
            distM,
            isFeatured: a.isFeatured,
            index: a.originalIndex,
            iconInfo,
            marker: m
          });
        });

        // Pixel-space de-overlap ONLY for prominent Tier-1 featured landmarks (never explodes ambient dots into a wall!).
        // Also softly fades markers outside the active screening radius when switching 300 m / 500 m / 1 km.
        function syncRadiusMarkerVisibility(r) {
          anchorMarkers.forEach(am => {
            const pinEl = (typeof am.marker.getElement === 'function' && am.marker.getElement())
              ? am.marker.getElement().querySelector('.opp-gmap-poi-pin')
              : null;
            if (!pinEl) return;
            const outOfRadius = Number.isFinite(am.distM) && am.distM > r + 15;
            pinEl.classList.toggle('is-outside-radius', outOfRadius);
          });
        }

        function layoutPinsInPixelSpace() {
          if (typeof oppMap.latLngToContainerPoint !== 'function' || typeof oppMap.containerPointToLatLng !== 'function') return;
          const MIN_GAP = 29;     // px between prominent Tier-1 icon pins
          const CENTER_GAP = 36;  // px clear breathing ring around Subject Property pin
          const center = oppMap.latLngToContainerPoint([lat, lng]);

          // Keep Tier-2 ambient micro-dots anchored at their true geographic street positions
          const featuredPts = anchorMarkers.filter(am => am.isFeatured).map(am => {
            const p = oppMap.latLngToContainerPoint([am.rawLat, am.rawLng]);
            return { am, x: p.x, y: p.y };
          });

          for (let iter = 0; iter < 50; iter++) {
            let moved = false;
            for (let i = 0; i < featuredPts.length; i++) {
              let dx = featuredPts[i].x - center.x;
              let dy = featuredPts[i].y - center.y;
              let d = Math.sqrt(dx * dx + dy * dy);
              if (d < CENTER_GAP) {
                if (d < 0.5) { dx = Math.cos(i * 2.399); dy = Math.sin(i * 2.399); d = 1; }
                const push = CENTER_GAP - d;
                featuredPts[i].x += (dx / d) * push;
                featuredPts[i].y += (dy / d) * push;
                moved = true;
              }
              for (let j = i + 1; j < featuredPts.length; j++) {
                dx = featuredPts[j].x - featuredPts[i].x;
                dy = featuredPts[j].y - featuredPts[i].y;
                d = Math.sqrt(dx * dx + dy * dy);
                if (d < MIN_GAP) {
                  if (d < 0.5) { dx = Math.cos((i + j) * 2.399); dy = Math.sin((i + j) * 2.399); d = 1; }
                  const push = (MIN_GAP - d) / 2;
                  const ux = dx / d;
                  const uy = dy / d;
                  featuredPts[i].x -= ux * push; featuredPts[i].y -= uy * push;
                  featuredPts[j].x += ux * push; featuredPts[j].y += uy * push;
                  moved = true;
                }
              }
            }
            if (!moved) break;
          }

          featuredPts.forEach(p => {
            const ll = oppMap.containerPointToLatLng([p.x, p.y]);
            p.am.dispLat = ll.lat;
            p.am.dispLng = ll.lng;
            if (typeof p.am.marker.setLatLng === 'function') p.am.marker.setLatLng(ll);
          });
          syncRadiusMarkerVisibility(currentRadius);
        }
        if (typeof oppMap.on === 'function') oppMap.on('zoomend', layoutPinsInPixelSpace);

        // Helper to highlight specific supporting anchors on card hover
        function highlightAnchorsOnMap(targetNames) {
          if (!targetNames || !targetNames.length) return;
          // Only dim the map if at least one supporting place is actually plotted
          const anyMatch = anchorMarkers.some(({ data }) => {
            const n = (data.name || '').toLowerCase().trim();
            return !!n && targetNames.some(t => n.includes(t) || t.includes(n));
          });
          if (!anyMatch) return;
          anchorMarkers.forEach(({ data, marker }) => {
            const aName = (data.name || '').toLowerCase().trim();
            const isTarget = !!aName && targetNames.some(t => aName.includes(t) || t.includes(aName));
            const pinEl = (typeof marker.getElement === 'function' && marker.getElement()) ? marker.getElement().querySelector('.opp-gmap-poi-pin') : null;
            if (pinEl) {
              if (isTarget) {
                pinEl.classList.add('is-card-target');
                pinEl.classList.remove('is-dimmed');
                if (typeof marker.setZIndexOffset === 'function') marker.setZIndexOffset(9000);
              } else {
                pinEl.classList.add('is-dimmed');
                pinEl.classList.remove('is-card-target');
                if (typeof marker.setZIndexOffset === 'function') marker.setZIndexOffset(10);
              }
            }
          });
        }

        // Helper to reset card hover highlight and restore sector filter state
        function resetMapHighlights() {
          anchorMarkers.forEach(({ marker }) => {
            const pinEl = (typeof marker.getElement === 'function' && marker.getElement()) ? marker.getElement().querySelector('.opp-gmap-poi-pin') : null;
            if (pinEl) {
              pinEl.classList.remove('is-card-target');
            }
          });
          applySectorFilterToMap(mapSectorFilter);
        }

        // Helper to filter and highlight pins on the map based on selected sector
        applySectorFilterToMap = function(sectorKey) {
          anchorMarkers.forEach(({ iconInfo, marker }) => {
            const pinEl = (typeof marker.getElement === 'function' && marker.getElement()) ? marker.getElement().querySelector('.opp-gmap-poi-pin') : null;
            if (!pinEl) return;

            if (!sectorKey || sectorKey === 'all') {
              pinEl.classList.remove('is-dimmed', 'is-matched');
              if (typeof marker.setZIndexOffset === 'function') marker.setZIndexOffset(100);
            } else {
              const isMatch = (iconInfo.sector === sectorKey);
              if (isMatch) {
                pinEl.classList.add('is-matched');
                pinEl.classList.remove('is-dimmed');
                if (typeof marker.setZIndexOffset === 'function') marker.setZIndexOffset(500);
              } else {
                pinEl.classList.add('is-dimmed');
                pinEl.classList.remove('is-matched');
                if (typeof marker.setZIndexOffset === 'function') marker.setZIndexOffset(20);
              }
            }
          });
        };

        // Helper to dynamically update amenity chips below map when sector changes
        updateAmenityChipsForSector = function(sectorKey) {
          const row = root.querySelector('.opportunities-amenities-row');
          if (!row) return;

          let filtered = anchors;
          if (sectorKey && sectorKey !== 'all') {
            const matching = anchors.filter(a => {
              const info = getAnchorIconInfo(a);
              return info.sector === sectorKey;
            });
            if (matching.length >= 2) {
              filtered = matching;
            }
          }

          const chipsToDisplay = filtered.slice(0, 3).map((a, idx) => {
            const iconInfo = getAnchorIconInfo(a);
            const distM = a.distanceMeters || (a.distanceFormatted ? parseInt(a.distanceFormatted, 10) : 180);
            const walkMinutes = Math.max(1, Math.round((distM || 180) / 80));
            return {
              index: idx,
              iconHtml: `<span class="amenity-icon ${iconInfo.textClass}" aria-hidden="true">${iconInfo.svgIcon}</span>`,
              walkMinutes,
              lat: a.lat,
              lng: a.lng,
              name: a.name,
              category: a.category || 'Activity Center'
            };
          });

          row.innerHTML = chipsToDisplay.map(c => `
            <button type="button" class="opportunities-amenity-chip" data-anchor-index="${c.index}" data-anchor-name="${esc(c.name)}" data-anchor-lat="${c.lat}" data-anchor-lng="${c.lng}" title="Click to focus ${esc(c.name)} on map">
              ${c.iconHtml}
              <span>${esc(c.name)}</span>
              <span class="amenity-walk-badge">~${c.walkMinutes} min walk</span>
            </button>
          `).join('');

          bindAmenityChips();
        };

        // Wire amenity chips below map to fly to that anchor
        function bindAmenityChips() {
          root.querySelectorAll('.opportunities-amenities-row [data-anchor-name], .opportunities-amenities-row [data-anchor-index]').forEach(chip => {
            chip.addEventListener('click', (e) => {
              e.preventDefault();
              const chipName = (chip.getAttribute('data-anchor-name') || '').toLowerCase();
              const idx = parseInt(chip.getAttribute('data-anchor-index'), 10);
              root.querySelectorAll('.opportunities-amenities-row .opportunities-amenity-chip').forEach(c => c.classList.remove('is-active'));
              chip.classList.add('is-active');

              const match = anchorMarkers.find(am => chipName && (am.data.name || '').toLowerCase() === chipName)
                || anchorMarkers.find(am => am.index === idx);
              if (match) {
                oppMap.flyTo([match.dispLat || match.data.lat, match.dispLng || match.data.lng], 16, { duration: 0.8 });
                match.marker.openPopup();
              } else {
                oppMap.flyTo([lat, lng], 15, { duration: 0.8 });
              }
            });
          });
        }
        bindAmenityChips();

        // Bind hover events on cards to highlight matching anchors
        bindCardMapHover = function(container) {
          container.querySelectorAll('.opportunity-blue-card').forEach(card => {
            const rawSupporting = card.getAttribute('data-supporting-places') || '';
            const supportingNames = rawSupporting.split('|||').map(s => s.trim().toLowerCase()).filter(Boolean);

            card.addEventListener('mouseenter', () => {
              highlightAnchorsOnMap(supportingNames);
            });

            card.addEventListener('mouseleave', () => {
              resetMapHighlights();
            });
          });
        };
        bindCardMapHover(root);

        // Hide static SVG fallback and display Leaflet
        if (fallbackSvg) fallbackSvg.style.display = 'none';
        leafletCanvas.style.display = 'block';

        setTimeout(() => {
          oppMap.invalidateSize();
          oppMap.fitBounds(radiusCircle.getBounds(), { padding: [30, 30] });
          layoutPinsInPixelSpace();
        }, 100);

        window.addEventListener('sfc:investor-view-change', (e) => {
          if (e.detail?.mode === 'advanced') {
            setTimeout(() => {
              oppMap.invalidateSize();
              oppMap.fitBounds(radiusCircle.getBounds(), { padding: [30, 30] });
            }, 80);
          }
        });

        // Recenter button click
        const recenterBtn = root.querySelector('#oppRecenterBtn');
        if (recenterBtn) {
          recenterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            oppMap.flyTo([lat, lng], 15, { duration: 0.8 });
            centerMarker.openPopup();
          });
        }

        // Layer Switcher button (Street / Satellite)
        const layerToggleBtn = root.querySelector('#oppLayerToggleBtn');
        const layerBtnText = root.querySelector('#oppLayerBtnText');
        if (layerToggleBtn) {
          layerToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentLayerType === 'street') {
              oppMap.removeLayer(streetLayer);
              satLayer.addTo(oppMap);
              currentLayerType = 'satellite';
              layerToggleBtn.classList.add('is-active');
              mapBox.classList.add('is-satellite');
              if (layerBtnText) layerBtnText.textContent = 'Street';
            } else {
              oppMap.removeLayer(satLayer);
              streetLayer.addTo(oppMap);
              currentLayerType = 'street';
              layerToggleBtn.classList.remove('is-active');
              mapBox.classList.remove('is-satellite');
              if (layerBtnText) layerBtnText.textContent = 'Sat';
            }
          });
        }

        // Radius Switcher buttons: 300m, 500m, 1km
        root.querySelectorAll('[data-radius-val]').forEach(rBtn => {
          rBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const newRadius = parseFloat(rBtn.getAttribute('data-radius-val')) || 500;
            currentRadius = newRadius;

            root.querySelectorAll('[data-radius-val]').forEach(b => {
              b.classList.toggle('is-active', b === rBtn);
            });

            radiusCircle.setRadius(newRadius);
            updateRadiusTag(newRadius);
            oppMap.fitBounds(radiusCircle.getBounds(), { padding: [30, 30] });
            syncRadiusMarkerVisibility(newRadius);

            // Update text labels
            const rText = newRadius >= 1000 ? (newRadius / 1000) + ' km' : Math.round(newRadius) + ' m';
            const footChip = root.querySelector('#opportunitiesMapFootChip span');
            if (footChip) footChip.textContent = `${rText} straight-line screening radius · Partial mapped inventory`;
            const radiusBadgeText = root.querySelector('#oppRadiusBadgeText');
            if (radiusBadgeText) radiusBadgeText.textContent = rText;

            const staticBubble = root.querySelector('#opportunitiesMapRadiusTagBubble span');
            if (staticBubble) staticBubble.textContent = rText;

            // Dynamically re-evaluate and update cards and sector tile counts
            updateCardsStack(currentSector, newRadius);
            syncSectorTileCounts(newRadius);
          });
        });
      }
    } catch (err) {
      console.warn('Leaflet map initialization skipped or unsupported in environment:', err);
      if (fallbackSvg && demoMode) fallbackSvg.style.display = 'block';
    }
  }

  // Mount the latest interactive 3D MapLibre City Map (3D buildings, brand logos, landmark photo cards,
  // clickable business directory & subject property parcel) in live browser sessions.
  if (useLatest3DMap) {
    const lat = recordedMapLat;
    const lng = recordedMapLng;
    const basePath = window.SFC_APP_CONFIG.basePath || '';
    const origin = window.location.origin;
    const propName = property?.name || mapBox.getAttribute('data-property-name') || 'Subject Property';
    const propId = property?.id || property?.property_id || 0;

    let anchors = [];
    const storeEl = root.querySelector('#oppDataStore');
    if (storeEl) {
      try {
        const stored = JSON.parse(storeEl.textContent);
        anchors = stored.anchors || [];
      } catch (_) {}
    }
    if (!anchors.length && property && Array.isArray(property.nearbyBusinesses)) {
      anchors = observedBusinessContext(property, currentRadius).nearbyPlaces;
    }

    const areaSqm = Number(property?.parcel?.surveyAreaSqm) > 0
      ? Number(property.parcel.surveyAreaSqm)
      : (Number(property?.area) > 0 ? Math.round(Number(property.area) * 10000) : null);
    const priceVal = property?.listingPurpose === 'lease' ? property?.leasePrice : property?.price;
    const priceText = Number(priceVal) > 0
      ? `PHP ${Number(priceVal).toLocaleString('en-PH')}${property?.listingPurpose === 'lease' ? ` / ${property?.leasePriceUnit === 'sqm' ? 'm² / ' : ''}${property?.leasePeriod || 'month'}` : ''}`
      : '';

    const subjectPayload = {
      id: propId || `site-${lat.toFixed(5)}-${lng.toFixed(5)}`,
      name: propName,
      latitude: lat,
      longitude: lng,
      boundary: property?.parcel?.boundary || null,
      barangay: property?.barangay || null,
      city: property?.city || 'San Fernando, La Union',
      area_sqm: areaSqm,
      status: property?.status || 'Available',
      purpose: property?.listingPurpose || 'sale',
      price_text: priceText,
      approximate: property?.hasExactLocation === false,
      source: 'LOCUS-SF'
    };

    const viewport = document.createElement('dialog');
    viewport.className = 'opp-3d-map-viewport';
    viewport.setAttribute('open', '');
    const iframe = document.createElement('iframe');
    iframe.className = 'opp-3d-map-frame';
    iframe.src = `${basePath}/city-map-embed.php?embed=1&mode=opportunities&propertyId=${encodeURIComponent(String(propId))}&lat=${encodeURIComponent(lat.toFixed(6))}&lng=${encodeURIComponent(lng.toFixed(6))}&radius=${encodeURIComponent(String(Math.round(currentRadius)))}`;
    iframe.title = `Interactive 3D San Fernando screening map for ${propName}`;
    iframe.allowFullscreen = true;
    viewport.appendChild(iframe);
    mapBox.classList.add('is-3d-city-map');
    mapBox.appendChild(viewport);

    let ready = false;
    let expanded = false;
    let fellBack = false;
    const queue = [];

    function post3D(message) {
      if (fellBack || !iframe.contentWindow) return;
      if (!ready) {
        queue.push(message);
        return;
      }
      iframe.contentWindow.postMessage(message, origin);
    }

    function flush3D() {
      while (queue.length && iframe.contentWindow) {
        iframe.contentWindow.postMessage(queue.shift(), origin);
      }
    }

    function setExpanded3D(next) {
      if (expanded === next) return;
      expanded = next;
      try { viewport.close(); } catch {}
      if (expanded) {
        viewport.classList.add('is-expanded');
        if (typeof viewport.showModal === 'function') viewport.showModal();
        else viewport.setAttribute('open', '');
      } else {
        viewport.classList.remove('is-expanded');
        if (typeof viewport.show === 'function') viewport.show();
        else viewport.setAttribute('open', '');
      }
      post3D({ type: 'locus:city-map-expanded', expanded });
      setTimeout(() => post3D({ type: 'locus:resize' }), 150);
    }

    viewport.addEventListener('cancel', event => {
      event.preventDefault();
      setExpanded3D(false);
    });

    const on3DMessage = event => {
      if (event.origin !== origin || event.source !== iframe.contentWindow) return;
      const type = event.data?.type;
      if (type === 'locus:city-map-ready') {
        ready = true;
        iframe.contentWindow.postMessage({ type: 'locus:city-map-visibility', visible: true }, origin);
        iframe.contentWindow.postMessage({ type: 'locus:focus-property', property: subjectPayload, showNearby: true, radius: currentRadius, instant: true }, origin);
        flush3D();
      } else if (type === 'locus:city-map-expand') {
        setExpanded3D(true);
      } else if (type === 'locus:city-map-collapse') {
        setExpanded3D(false);
      } else if (type === 'locus:city-map-unavailable' && !fellBack) {
        fellBack = true;
        mapBox.classList.remove('is-3d-city-map');
        viewport.remove();
        window.removeEventListener('message', on3DMessage);
        initLeafletMap();
      }
    };
    window.addEventListener('message', on3DMessage);

    iframe.addEventListener('load', () => {
      setTimeout(() => {
        if (!ready && !fellBack && iframe.contentWindow) {
          ready = true;
          iframe.contentWindow.postMessage({ type: 'locus:city-map-visibility', visible: true }, origin);
          iframe.contentWindow.postMessage({ type: 'locus:focus-property', property: subjectPayload, showNearby: true, radius: currentRadius, instant: true }, origin);
          flush3D();
        }
      }, 950);
    });

    if (typeof IntersectionObserver === 'function') {
      const obs = new IntersectionObserver(entries => {
        const entry = entries[0];
        if (entry) post3D({ type: 'locus:city-map-visibility', visible: entry.isIntersecting });
      }, { threshold: 0.05 });
      obs.observe(mapBox);
    }

    window.addEventListener('sfc:investor-view-change', e => {
      if (e.detail?.mode === 'advanced') {
        setTimeout(() => post3D({ type: 'locus:resize' }), 100);
      }
    });

    // Wire radius buttons (300 m / 500 m / 1 km) directly to the 3D screening ring + cards
    root.querySelectorAll('[data-radius-val]').forEach(rBtn => {
      rBtn.addEventListener('click', e => {
        e.preventDefault();
        const newRadius = parseFloat(rBtn.getAttribute('data-radius-val')) || 500;
        currentRadius = newRadius;

        root.querySelectorAll('[data-radius-val]').forEach(b => {
          b.classList.toggle('is-active', b === rBtn);
        });

        post3D({ type: 'locus:set-screening-radius', radius: newRadius, showNearby: true, fit: true });

        const rText = newRadius >= 1000 ? (newRadius / 1000) + ' km' : Math.round(newRadius) + ' m';
        const footChip = root.querySelector('#opportunitiesMapFootChip span');
        if (footChip) footChip.textContent = `${rText} straight-line screening radius · Partial mapped inventory`;
        const radiusBadgeText = root.querySelector('#oppRadiusBadgeText');
        if (radiusBadgeText) radiusBadgeText.textContent = rText;

        updateCardsStack(currentSector, newRadius);
        syncSectorTileCounts(newRadius);
      });
    });

    // Wire anchor chips below the 3D map to glide the 3D camera + open rich place popup
    function bindAmenityChips3D() {
      root.querySelectorAll('.opportunities-amenities-row [data-anchor-name], .opportunities-amenities-row [data-anchor-index]').forEach(chip => {
        chip.addEventListener('click', e => {
          e.preventDefault();
          const chipName = chip.getAttribute('data-anchor-name') || '';
          const chipLat = parseFloat(chip.getAttribute('data-anchor-lat'));
          const chipLng = parseFloat(chip.getAttribute('data-anchor-lng'));
          root.querySelectorAll('.opportunities-amenities-row .opportunities-amenity-chip').forEach(c => c.classList.remove('is-active'));
          chip.classList.add('is-active');

          const matchedAnchor = anchors.find(a => (a.name || '').toLowerCase() === chipName.toLowerCase());
          const targetLat = Number.isFinite(chipLat) ? chipLat : parseFloat(matchedAnchor?.lat);
          const targetLng = Number.isFinite(chipLng) ? chipLng : parseFloat(matchedAnchor?.lng);
          if (Number.isFinite(targetLat) && Number.isFinite(targetLng)) {
            const distM = matchedAnchor?.distanceMeters || (matchedAnchor?.distanceFormatted ? parseInt(matchedAnchor.distanceFormatted, 10) : null);
            const walkMin = Number.isFinite(distM) ? Math.max(1, Math.round(distM / 80)) : null;
            post3D({
              type: 'locus:fly-to-point',
              lat: targetLat,
              lng: targetLng,
              name: chipName || matchedAnchor?.name || 'Nearby place',
              category: matchedAnchor?.category || 'Activity center',
              distance: [matchedAnchor?.distanceFormatted || (Number.isFinite(distM) ? `${distM} m` : ''), walkMin ? `~${walkMin} min walk` : ''].filter(Boolean).join(' · '),
              kicker: 'Nearby business',
              kind: 'business'
            });
          } else {
            post3D({ type: 'locus:focus-property', property: subjectPayload, showNearby: true, radius: currentRadius, instant: false });
          }
        });
      });
    }
    bindAmenityChips3D();

    updateAmenityChipsForSector = function(sectorKey) {
      const row = root.querySelector('.opportunities-amenities-row');
      if (!row) return;
      let filteredAnchors = anchors;
      if (sectorKey && sectorKey !== 'all') {
        const matching = anchors.filter(a => getAnchorIconInfo(a).sector === sectorKey);
        if (matching.length >= 2) filteredAnchors = matching;
      }
      const chipsToDisplay = filteredAnchors.slice(0, 3).map((a, idx) => {
        const iconInfo = getAnchorIconInfo(a);
        const distM = a.distanceMeters || (a.distanceFormatted ? parseInt(a.distanceFormatted, 10) : 180);
        const walkMinutes = Math.max(1, Math.round((distM || 180) / 80));
        return {
          index: idx,
          iconHtml: `<span class="amenity-icon ${iconInfo.textClass}" aria-hidden="true">${iconInfo.svgIcon}</span>`,
          walkMinutes,
          lat: a.lat,
          lng: a.lng,
          name: a.name
        };
      });
      row.innerHTML = chipsToDisplay.map(c => `
        <button type="button" class="opportunities-amenity-chip" data-anchor-index="${c.index}" data-anchor-name="${esc(c.name)}" data-anchor-lat="${c.lat}" data-anchor-lng="${c.lng}" title="Click to focus ${esc(c.name)} on 3D map">
          ${c.iconHtml}
          <span>${esc(c.name)}</span>
          <span class="amenity-walk-badge">~${c.walkMinutes} min walk</span>
        </button>
      `).join('');
      bindAmenityChips3D();
    };
  } else {
    initLeafletMap();
  }

  // Helper to dynamically re-render the 3 opportunity cards with smooth fade
  function updateCardsStack(sectorKey, radiusVal) {
    const stack = root.querySelector('#opportunitiesCardsStack');
    if (!stack) return;

    let itemsToDisplay = [];

    // Try dynamic screening on property data if nearbyBusinesses is present
    if (property && Array.isArray(property.nearbyBusinesses) && property.nearbyBusinesses.length > 0) {
      const dynamicOpp = evaluateBusinessOpportunities(property, radiusVal, sectorKey);
      if (dynamicOpp.supportedMatches && dynamicOpp.supportedMatches.length > 0) {
        itemsToDisplay = dynamicOpp.supportedMatches.map((m, idx) => formatOpportunityDisplayItem(m, idx));
      }
    }

    // If dynamic screening produced no items for this specific sector, fallback to curated sector matches
    if (!itemsToDisplay.length && demoMode) {
      if (sectorKey && SECTOR_DEMO_MATCHES[sectorKey]) {
        itemsToDisplay = SECTOR_DEMO_MATCHES[sectorKey];
      } else {
        itemsToDisplay = DEMO_MATCHES;
      }
    }

    // Smooth transition
    stack.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    stack.style.opacity = '0.35';
    stack.style.transform = 'translateY(4px)';

    setTimeout(() => {
      stack.innerHTML = itemsToDisplay.length ? itemsToDisplay.map(item => renderOpportunityCard(item, property)).join('')
        : '<p class="opportunities-empty-state">No suggestions are supported by the recorded nearby places for this radius and category. Inventory completeness and operating business density remain unknown.</p>';
      stack.style.opacity = '1';
      stack.style.transform = 'translateY(0)';
      bindDrawerEvents(stack);
      bindInquiryEvents(stack);
      bindSimulationEvents(stack);
      bindCardMapHover(stack);
    }, 150);
  }

  // 3. View mode switcher: Compact view vs Detailed evidence
  root.querySelectorAll('[data-opportunities-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-opportunities-mode');
      root.querySelectorAll('[data-opportunities-mode]').forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      const cards = root.querySelectorAll('.opportunity-blue-card');
      if (mode === 'detailed') {
        cards.forEach(c => {
          c.classList.add('is-drawer-open');
          const d = c.querySelector('.opportunity-evidence-drawer');
          if (d) d.hidden = false;
        });
      } else {
        cards.forEach(c => {
          c.classList.remove('is-drawer-open');
          const d = c.querySelector('.opportunity-evidence-drawer');
          if (d) d.hidden = true;
        });
      }
    });
  });

  // 4. Catalog Dialog open / close
  const dialog = root.querySelector('#opportunitiesCatalogDialog');
  if (dialog) {
    bindSimulationEvents(dialog);
    bindInquiryEvents(dialog);
  }
  root.querySelectorAll('[data-open-opportunities-catalog]').forEach(openBtn => {
    openBtn.addEventListener('click', () => {
      if (dialog && typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else if (dialog) {
        dialog.setAttribute('open', '');
      }
    });
  });

  const closeBtn = root.querySelector('#closeOpportunitiesCatalogBtn');
  if (closeBtn && dialog) {
    closeBtn.addEventListener('click', () => {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    });
  }

  if (dialog) {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
    });
  }

  // 5. Sector filtering in catalog dialog
  root.querySelectorAll('[data-sector-filter]').forEach(tab => {
    tab.addEventListener('click', () => {
      const sector = tab.getAttribute('data-sector-filter');
      root.querySelectorAll('[data-sector-filter]').forEach(t => {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      root.querySelectorAll('.opportunities-catalog-card').forEach(card => {
        const cardSector = card.getAttribute('data-catalog-sector');
        card.style.display = (sector === 'all' || cardSector === sector) ? 'flex' : 'none';
      });
    });
  });

  // 6. Category filter pills below split screen with dynamic card switching and map sync
  root.querySelectorAll('[data-cat-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      const cat = pill.getAttribute('data-cat-filter');
      currentSector = cat;

      root.querySelectorAll('[data-cat-filter]').forEach(p => {
        const active = p === pill;
        p.classList.toggle('is-active', active);
        if (typeof p.setAttribute === 'function') p.setAttribute('aria-selected', String(active));
      });

      updateCardsStack(cat, currentRadius);
      mapSectorFilter = cat;
      applySectorFilterToMap(cat);
      updateAmenityChipsForSector(cat);
    });
  });
}
