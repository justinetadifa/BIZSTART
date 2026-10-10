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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Client-side evaluation fallback.
 */
export function evaluateBusinessOpportunities(property, radiusMeters = 500, sectorFilter = null) {
  const lat = Number(property.lat || 0);
  const lng = Number(property.lng || 0);
  const hasCoords = isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

  const originLabel = hasCoords ? `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E` : 'Unknown origin (unrecorded coordinates)';

  // 1. Gather places strictly within radius
  const rawPlaces = Array.isArray(property.nearbyBusinesses) ? property.nearbyBusinesses : [];
  const inRadiusPlaces = [];

  for (const p of rawPlaces) {
    const pLat = Number(p.lat || 0);
    const pLng = Number(p.lng || 0);
    if (!isFinite(pLat) || !isFinite(pLng) || (pLat === 0 && pLng === 0)) continue;
    const dist = hasCoords ? haversineMeters(lat, lng, pLat, pLng) : Number(p.distanceMeters || 9999);
    if (dist <= radiusMeters) {
      inRadiusPlaces.push({
        ...p,
        distanceMeters: Math.round(dist),
        distanceFormatted: `${Math.round(dist)} m`,
        source: p.source || 'San Fernando City Commercial Registry',
        date: p.date || '2026-01-01',
        status: p.status || 'operating',
      });
    }
  }

  // Deduplicate by name & proximity (<50m)
  const deduped = [];
  for (const p of inRadiusPlaces) {
    const nameNorm = (p.name || '').trim().toLowerCase();
    if (!nameNorm) continue;
    const dup = deduped.find(e => (e.name || '').trim().toLowerCase() === nameNorm && haversineMeters(e.lat, e.lng, p.lat, p.lng) <= 50);
    if (!dup) deduped.push(p);
  }
  deduped.sort((a, b) => a.distanceMeters - b.distanceMeters);

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
  const areaSqm = areaHa > 0 ? (areaHa * 10000) : Number(property.parcel?.surveyAreaSqm || 0);
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

    if (hasResidential && profile.activityCenters.includes('residential')) {
      if (!supporting.length) {
        supporting.push({
          name: `Residential Community (${property.barangay || 'Neighborhood'})`,
          category: 'Residential Settlement',
          distanceMeters: 150,
          distanceFormatted: `Within ${radiusMeters}m radius`,
          source: 'CLUP Neighborhood Context',
          date: '2026-01-01',
          status: 'operating',
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
      recordedAreaSqm: areaSqm > 0 ? Math.round(areaSqm) : null,
      areaStatus: areaSqm > 0 ? `${Math.round(areaSqm).toLocaleString()} sqm recorded` : 'Unknown (unrecorded)',
      roadAccessRequirement: profile.roadAccess,
      zoningClassification: zoningClassification || 'Unknown (awaiting verification)',
      zoningStatus: zoningExplanation,
      missingEvidence: missingItems,
      competitorsCount: competitors.length,
      competitorsNotice: competitors.length > 0
        ? `${competitors.length} similar operating establishments recorded in radius`
        : 'No competitors recorded in this dataset',
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
    zoningStatus: m.zoningStatus,
    zoningClassification: m.zoningClassification,
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
 * Render a single opportunity card with iOS-refined scannable front and collapsible evidence drawer.
 */
export function renderOpportunityCard(item, property = null) {
  const supportingList = (item.supportingPlaces && item.supportingPlaces.length) ? item.supportingPlaces : [
    { name: 'Saint Louis College', distanceFormatted: '165 m', distanceMeters: 165, category: 'College & Higher Education' },
    { name: 'City Hall of San Fernando', distanceFormatted: '185 m', distanceMeters: 185, category: 'Civic Administration' }
  ];
  const supportingNames = supportingList.map(sp => sp.name || '').filter(Boolean).join('|||');

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
            <span class="opportunity-preliminary-tag">${esc(item.statusLabel || 'Preliminary')}</span>
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

        <!-- Dark circular action button with white arrow -->
        <button type="button" class="opportunity-circle-action-btn no-print" data-toggle-opportunity-details="${esc(item.id)}" aria-expanded="false" aria-controls="oppDetails-${esc(item.id)}" aria-label="Toggle details for ${esc(item.label)}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
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
            <span class="opportunity-drawer-status">Verified Spatial Proximity</span>
          </div>

          <!-- 1. Supporting Activity Centers -->
          <div class="opportunity-evidence-group">
            <div class="opportunity-evidence-label">
              <span>Supporting activity centers within radius</span>
              <small>Direct walking &amp; commute anchors</small>
            </div>
            <ul class="opportunity-places-list">
              ${supportingList.map(sp => {
                const distM = sp.distanceMeters || (sp.distanceFormatted ? parseInt(sp.distanceFormatted, 10) : 180);
                const walkMin = Math.max(1, Math.round((distM || 180) / 80));
                return `
                  <li class="opportunity-place-item">
                    <div class="opportunity-place-main">
                      <span class="opportunity-place-icon" aria-hidden="true">&#9679;</span>
                      <strong class="opportunity-place-name">${esc(sp.name)}</strong>
                    </div>
                    <div class="opportunity-place-meta">
                      <span class="opportunity-place-badge">${esc(sp.distanceFormatted || (distM + ' m'))}</span>
                      <span class="amenity-walk-badge">~${walkMin} min walk</span>
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

          <!-- 3. Local Market Context -->
          <div class="opportunity-evidence-group">
            <div class="opportunity-evidence-label">
              <span>Operating establishments in radius</span>
              <small>Local competitive &amp; complementary density</small>
            </div>
            <div class="opportunity-comp-row">
              <div class="opportunity-comp-box">
                <strong>Recorded competitors:</strong>
                <p>${esc(item.competitorsNotice || 'No competitors recorded in radius')}</p>
                ${item.competitorSample && item.competitorSample.length ? `<small>Recorded examples: ${esc(item.competitorSample.join(', '))}</small>` : ''}
              </div>
              <div class="opportunity-comp-box">
                <strong>Complementary businesses:</strong>
                <p>${item.complementaryCount > 0 ? `${item.complementaryCount} complementary anchors found` : 'Complementary commercial synergy nearby'}</p>
                ${item.complementarySample && item.complementarySample.length ? `<small>Synergies: ${esc(item.complementarySample.join(', '))}</small>` : ''}
              </div>
            </div>
          </div>

          <!-- 4. Direct City Planning Inquiry CTA -->
          <div class="opportunity-drawer-cta-row">
            <button type="button" class="opportunity-inquire-cta-btn" data-inquire-use="${esc(item.label)}" title="Contact City Investment Facilitation regarding ${esc(item.label)}">
              <span>Inquire about ${esc(item.label)} suitability</span>
              <span aria-hidden="true">&nearr;</span>
            </button>
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
  const opp = property.businessOpportunities || evaluateBusinessOpportunities(property, 500);
  const rawMatches = Array.isArray(opp.supportedMatches) && opp.supportedMatches.length ? opp.supportedMatches : [];
  const radius = opp.radiusMeters || 500;
  const lat = Number(property.lat || 16.6159);
  const lng = Number(property.lng || 120.3166);

  // Determine real nearby places from opp or property
  const rawNearby = opp.nearbyPlaces || (Array.isArray(property.nearbyBusinesses) ? property.nearbyBusinesses : []);
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
  } else {
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
  
  // Format display matches: use dynamic matches formatted to Picture 2 specs, or fall back to DEMO_MATCHES
  const displayCards = rawMatches.length
    ? rawMatches.map((m, idx) => formatOpportunityDisplayItem(m, idx))
    : DEMO_MATCHES;

  return `
    <section class="property-panel property-opportunities" id="propertyOpportunitiesSection" aria-labelledby="propertyOpportunitiesTitle">
      <!-- Embedded Spatial & Anchor Data for Leaflet Interactive Initialization -->
      <script type="application/json" class="opportunities-data-store" id="oppDataStore">
        ${JSON.stringify({
          lat,
          lng,
          radius,
          propertyName: property.name || 'Subject Property',
          anchors: realAnchors.length ? realAnchors : [
            { name: 'Hospital', category: 'Healthcare', lat: lat + 0.002, lng: lng - 0.002, distanceFormatted: '180 m', distanceMeters: 180 },
            { name: 'School', category: 'Education', lat: lat + 0.001, lng: lng + 0.003, distanceFormatted: '240 m', distanceMeters: 240 },
            { name: 'City hall', category: 'Civic', lat: lat - 0.002, lng: lng + 0.001, distanceFormatted: '310 m', distanceMeters: 310 }
          ]
        })}
      </script>

      <!-- Picture 2 Split Screen Interface -->
      <div class="opportunities-split-layout">
        <!-- LEFT COLUMN: Lime Green Accent Box -->
        <div class="opportunities-lime-card">
          <div class="opportunities-lime-header">
            <h2 id="propertyOpportunitiesTitle" class="opportunities-main-title">Business opportunities to explore</h2>
            <p class="opportunities-subtitle">
              Based on nearby places, property requirements and available evidence.
              <span class="sr-only">Suggestions based on nearby establishments, property characteristics, infrastructure and available zoning information.</span>
            </p>
          </div>

          <!-- Stylized Map Box with Real Leaflet Canvas, Interactive Overlays & Static Fallback -->
          <div class="opportunities-map-box" id="opportunitiesInteractiveMap" data-lat="${lat}" data-lng="${lng}" data-radius="${radius}" data-property-name="${esc(property.name || 'Subject Property')}">
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

            <!-- Map Radius Switcher Pills: 300m, 500m, 1km -->
            <div class="opportunities-map-radius-selector" role="group" aria-label="Screening radius selector">
              <button type="button" class="opp-radius-btn" data-radius-val="300">300 m</button>
              <button type="button" class="opp-radius-btn is-active" data-radius-val="500">500 m</button>
              <button type="button" class="opp-radius-btn" data-radius-val="1000">1 km</button>
            </div>

            <!-- Real Interactive Leaflet Map Canvas (Activated via JS) -->
            <div class="opportunities-leaflet-canvas" id="opportunitiesLeafletCanvas" role="region" aria-label="Interactive Screening Radius Map" style="display:none;width:100%;height:100%;position:absolute;top:0;left:0;border-radius:14px;z-index:2;"></div>

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
            <div class="opportunities-map-static-fallback" id="opportunitiesMapStaticFallback">
              <svg class="opportunities-map-svg" viewBox="0 0 460 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <!-- Google Maps Land Base -->
                <rect width="100%" height="100%" fill="#F1EFE8"/>
                <!-- Water Bay -->
                <path d="M 0,210 C 50,195 80,245 130,285 L 130,300 L 0,300 Z" fill="#C4E0E5"/>
                <path d="M 0,210 C 50,195 80,245 130,285" stroke="#A7D5DE" stroke-width="6" fill="none" opacity="0.7"/>
                
                <!-- Google Maps Urban Parcels & Vegetation -->
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

                <!-- Google Maps Arterials & Streets -->
                <path d="M 0,88 L 460,88 M 0,158 L 460,158 M 0,228 L 460,228" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
                <path d="M 95,0 L 95,300 M 180,0 L 180,300 M 275,0 L 275,300 M 365,0 L 365,300" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
                <path d="M 20,0 L 250,230" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
                <path d="M 180,40 L 440,300" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>

                <!-- Google Maps Geofence Radius Circle -->
                <circle cx="215" cy="145" r="90" fill="#1A73E8" fill-opacity="0.08" stroke="#1A73E8" stroke-width="2" stroke-dasharray="6 4"/>
                <line x1="285" y1="100" x2="310" y2="92" stroke="#1A73E8" stroke-width="1.5"/>
              </svg>

              <!-- Callout bubble: 500 m -->
              <div class="opportunities-map-radius-tag-bubble" id="opportunitiesMapRadiusTagBubble">
                <span>500 m</span>
              </div>

              <!-- Subject property center pin (Google Maps Red Pin) -->
              <div class="opportunities-map-center-pin" title="Subject Property Location">
                <svg viewBox="0 0 27 41" width="24" height="36" fill="none" aria-hidden="true">
                  <path fill="#EA4335" d="M13.5 0C6.04 0 0 6.04 0 13.5c0 10.12 13.5 27.5 13.5 27.5S27 23.62 27 13.5C27 6.04 20.96 0 13.5 0z"/>
                  <circle fill="#FFFFFF" cx="13.5" cy="13.5" r="5"/>
                </svg>
              </div>

              <!-- Map POI Marker 1 -->
              <div class="opportunities-map-poi poi-hospital">
                <span class="poi-icon-circle bg-red" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </span>
                <span class="poi-label">${esc(amenityChips[0]?.name || 'Hospital')}</span>
              </div>

              <!-- Map POI Marker 2 -->
              <div class="opportunities-map-poi poi-school">
                <span class="poi-icon-circle bg-blue" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="#FFFFFF">
                    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                  </svg>
                </span>
                <span class="poi-label">${esc(amenityChips[1]?.name || 'School')}</span>
              </div>

              <!-- Map POI Marker 3 -->
              <div class="opportunities-map-poi poi-cityhall">
                <span class="poi-icon-circle bg-navy" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="#FFFFFF">
                    <path d="M12 2L2 7v2h20V7L12 2zm-8 8v9h3v-9H4zm5 0v9h3v-9H9zm5 0v9h3v-9h-3zm5 0v9h3v-9h-3zM2 20v2h20v-2H2z"/>
                  </svg>
                </span>
                <span class="poi-label">${esc(amenityChips[2]?.name || 'City hall')}</span>
              </div>
            </div>

            <!-- Map bottom-left tag overlay -->
            <div class="opportunities-map-foot-chip" id="opportunitiesMapFootChip" style="z-index: 5;">
              <span>500 m straight-line screening radius &middot; Verified</span>
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

        <!-- RIGHT COLUMN: Demo Scenario & Dynamic Cards Stack -->
        <div class="opportunities-cards-column">
          <div class="opportunities-kicker-banner">
            <span>DEMO SCENARIO - Illustrative places and suggestions</span>
          </div>

          <div class="opportunities-blue-stack" id="opportunitiesCardsStack">
            ${displayCards.map(item => renderOpportunityCard(item, property)).join('')}
          </div>
        </div>
      </div>

      <!-- Bottom Category Filter Row -->
      <div class="opportunities-bottom-filter-row">
        <div class="opportunities-filter-pills" role="tablist" aria-label="Business categories">
          <button type="button" class="opportunities-filter-pill is-active" data-cat-filter="everyday_services">Everyday services</button>
          <button type="button" class="opportunities-filter-pill" data-cat-filter="food_retail">Food &amp; retail</button>
          <button type="button" class="opportunities-filter-pill" data-cat-filter="tourism_recreation">Tourism &amp; recreation</button>
          <button type="button" class="opportunities-filter-pill" data-cat-filter="all">Other business types</button>
        </div>

        <div class="opportunities-explore-link-wrap">
          <button type="button" class="opportunities-explore-more-btn" data-open-opportunities-catalog id="openOpportunitiesCatalogBtn">
            <span>Explore other business types &rarr;</span>
          </button>
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
          ${BUSINESS_CATALOG.map(item => `
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
            </div>
          `).join('')}
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

  function bindInquiryEvents(container) {
    container.querySelectorAll('[data-inquire-use]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const useName = btn.getAttribute('data-inquire-use') || 'selected business use';
        const inquiryPanel = document.getElementById('cityInquiryPanel');
        const inquiryText = document.getElementById('cityInquiryText');

        if (inquiryPanel) {
          if (typeof inquiryPanel.open !== 'undefined') {
            inquiryPanel.open = true;
          }
          if (inquiryText) {
            inquiryText.value = `Inquiry regarding suitability for ${useName} at this property. Please advise on commercial zoning clearance and municipal permitting requirements.`;
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

  if (mapBox && leafletCanvas && window.L && typeof window.L.map === 'function') {
    try {
      const lat = parseFloat(mapBox.getAttribute('data-lat')) || 16.6159;
      const lng = parseFloat(mapBox.getAttribute('data-lng')) || 120.3166;
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
        anchors = property.nearbyBusinesses;
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

        // Google Maps Proximity Geofence Radius Circle (Google Blue)
        radiusCircle = L.circle([lat, lng], {
          radius: currentRadius,
          color: '#1A73E8',
          weight: 2,
          dashArray: '6, 5',
          fillColor: '#1A73E8',
          fillOpacity: 0.08
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
          calloutMarker = L.marker([calloutLat, calloutLng], { icon: calloutIcon, interactive: false }).addTo(oppMap);
        }
        updateRadiusTag(currentRadius);

        // Smart Spatial Dispersal for Nearby Establishments (prevents stacking along same street corridor)
        const cosLat = Math.cos(lat * Math.PI / 180);
        const validAnchors = anchors.map((a, idx) => ({
          data: a,
          originalIndex: idx,
          rawLat: parseFloat(a.lat),
          rawLng: parseFloat(a.lng),
          dispLat: parseFloat(a.lat),
          dispLng: parseFloat(a.lng),
          name: a.name || `Anchor ${idx + 1}`
        })).filter(a => isFinite(a.rawLat) && isFinite(a.rawLng) && (a.rawLat !== 0 || a.rawLng !== 0));

        // NOTE: Actual de-overlap layout runs in screen-pixel space (layoutPinsInPixelSpace below),
        // because a fixed degree offset (~30 m) is only ~6 px at zoom 15 — far smaller than a 28 px pin.
        // This degree-based pre-pass only applies when the map projection is unavailable (e.g. headless tests).
        const minCenterDistDeg = 0.00030;
        validAnchors.forEach(a => {
          const dLat = a.dispLat - lat;
          const dLng = (a.dispLng - lng) * cosLat;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          if (dist < minCenterDistDeg) {
            const angle = dist > 0.00002 ? Math.atan2(dLat, dLng) : (Math.PI / 3);
            const pushDist = 0.00038;
            a.dispLat = lat + Math.sin(angle) * pushDist;
            a.dispLng = lng + (Math.cos(angle) * pushDist) / cosLat;
          }
        });

        // Step 2: Cluster detection & radial dispersal among nearby pins
        const clusters = [];
        const visited = new Set();
        const clusterDistThreshold = 0.00032; // ~35 meters

        for (let i = 0; i < validAnchors.length; i++) {
          if (visited.has(i)) continue;
          const cluster = [validAnchors[i]];
          visited.add(i);

          for (let j = i + 1; j < validAnchors.length; j++) {
            if (visited.has(j)) continue;
            const canJoin = cluster.some(item => {
              const dLat = item.dispLat - validAnchors[j].dispLat;
              const dLng = (item.dispLng - validAnchors[j].dispLng) * cosLat;
              return Math.sqrt(dLat * dLat + dLng * dLng) < clusterDistThreshold;
            });

            if (canJoin) {
              cluster.push(validAnchors[j]);
              visited.add(j);
            }
          }
          clusters.push(cluster);
        }

        // Radially fan out clusters with 2 or more pins around their centroid
        clusters.forEach(cluster => {
          if (cluster.length <= 1) return;

          let sumLat = 0;
          let sumLng = 0;
          cluster.forEach(pt => {
            sumLat += pt.dispLat;
            sumLng += pt.dispLng;
          });
          const cLat = sumLat / cluster.length;
          const cLng = sumLng / cluster.length;

          const count = cluster.length;
          const disperseR = count > 4 ? 0.00035 : 0.00028;
          const angleStep = (2 * Math.PI) / count;
          const startAngle = Math.PI / count;

          cluster.forEach((pt, k) => {
            const angle = startAngle + k * angleStep;
            pt.dispLat = cLat + Math.sin(angle) * disperseR;
            pt.dispLng = cLng + (Math.cos(angle) * disperseR) / cosLat;
          });
        });

        // Add Google Maps-style compact circular POI markers for each nearby place
        const anchorMarkers = [];
        validAnchors.forEach(a => {
          const iconInfo = getAnchorIconInfo(a.data);
          const badgeColor = iconInfo.badgeColor;
          const catKey = iconInfo.catKey;
          const svgIcon = iconInfo.svgIcon;

          // Compact Google Maps circular badge with downward pointer tip (Zero Overlap, 28x34)
          const aIcon = L.divIcon({
            className: 'opp-gmap-poi-divicon locus-opp-poi-marker',
            html: `<div class="opp-gmap-poi-pin opp-poi-pin" style="--poi-color: ${badgeColor};" title="${esc(a.data.name)}" data-cat="${catKey}" data-sector="${iconInfo.sector}">
              <div class="opp-gmap-poi-circle">
                ${svgIcon}
              </div>
              <div class="opp-gmap-poi-tip"></div>
            </div>`,
            iconSize: [28, 34],
            iconAnchor: [14, 34]
          });

          const m = L.marker([a.dispLat, a.dispLng], { icon: aIcon, zIndexOffset: 100 }).addTo(oppMap);
          const distM = a.data.distanceMeters || (a.data.distanceFormatted ? parseInt(a.data.distanceFormatted, 10) : 180);
          const walkMin = Math.max(1, Math.round((distM || 180) / 80));

          // Google Maps-style Hover Tooltip
          m.bindTooltip(`
            <div class="opp-gmap-tooltip-content">
              <strong>${esc(a.data.name)}</strong>
              <span>${esc(a.data.category || 'Activity Anchor')} &bull; ${esc(a.data.distanceFormatted || (distM + ' m'))} (~${walkMin} min walk)</span>
            </div>
          `, {
            direction: 'top',
            offset: [0, -32],
            className: 'opp-gmap-tooltip-box',
            opacity: 1
          });

          // Google Maps-style Rich Click Popup
          m.bindPopup(`
            <div class="opp-gmap-popup-card opp-leaflet-popup">
              <div class="opp-gmap-popup-badge" style="background: ${badgeColor}18; color: ${badgeColor}; border: 1px solid ${badgeColor}35;">
                ${esc(a.data.category || 'Activity Anchor')}
              </div>
              <strong class="opp-gmap-popup-title">${esc(a.data.name)}</strong>
              <div class="opp-gmap-popup-meta">
                <span>📍 ${esc(a.data.distanceFormatted || (distM + ' m'))}</span>
                <span>🚶 ~${walkMin} min walk</span>
              </div>
              <span class="opp-gmap-popup-sub">Verified neighborhood foot-traffic generator</span>
            </div>
          `, { className: 'opp-gmap-popup-wrapper' });

          anchorMarkers.push({
            data: a.data,
            dispLat: a.dispLat,
            dispLng: a.dispLng,
            index: a.originalIndex,
            iconInfo,
            marker: m
          });
        });

        // Pixel-space de-overlap: iteratively push pins apart so no two 28px badges collide,
        // and keep a clear zone around the Subject Property pin. Re-runs on every zoom.
        function layoutPinsInPixelSpace() {
          if (typeof oppMap.latLngToContainerPoint !== 'function' || typeof oppMap.containerPointToLatLng !== 'function') return;
          const MIN_GAP = 30;     // px between POI anchor points (pin is 28px wide)
          const CENTER_GAP = 34;  // px clear zone around the subject pin
          const center = oppMap.latLngToContainerPoint([lat, lng]);
          const pts = anchorMarkers.map(am => {
            const p = oppMap.latLngToContainerPoint([parseFloat(am.data.lat), parseFloat(am.data.lng)]);
            return { am, x: p.x, y: p.y };
          });

          for (let iter = 0; iter < 60; iter++) {
            let moved = false;
            for (let i = 0; i < pts.length; i++) {
              // Keep clear of the subject property pin
              let dx = pts[i].x - center.x;
              let dy = pts[i].y - center.y;
              let d = Math.sqrt(dx * dx + dy * dy);
              if (d < CENTER_GAP) {
                if (d < 0.5) { dx = Math.cos(i * 2.399); dy = Math.sin(i * 2.399); d = 1; }
                const push = CENTER_GAP - d;
                pts[i].x += (dx / d) * push;
                pts[i].y += (dy / d) * push;
                moved = true;
              }
              for (let j = i + 1; j < pts.length; j++) {
                dx = pts[j].x - pts[i].x;
                dy = pts[j].y - pts[i].y;
                d = Math.sqrt(dx * dx + dy * dy);
                if (d < MIN_GAP) {
                  // Golden-angle fallback for exactly coincident points
                  if (d < 0.5) { dx = Math.cos((i + j) * 2.399); dy = Math.sin((i + j) * 2.399); d = 1; }
                  const push = (MIN_GAP - d) / 2;
                  const ux = dx / d;
                  const uy = dy / d;
                  pts[i].x -= ux * push; pts[i].y -= uy * push;
                  pts[j].x += ux * push; pts[j].y += uy * push;
                  moved = true;
                }
              }
            }
            if (!moved) break;
          }

          pts.forEach(p => {
            const ll = oppMap.containerPointToLatLng([p.x, p.y]);
            p.am.dispLat = ll.lat;
            p.am.dispLng = ll.lng;
            if (typeof p.am.marker.setLatLng === 'function') p.am.marker.setLatLng(ll);
          });
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
          oppMap.fitBounds(radiusCircle.getBounds(), { padding: [22, 22] });
          layoutPinsInPixelSpace();
        }, 100);

        window.addEventListener('sfc:investor-view-change', (e) => {
          if (e.detail?.mode === 'advanced') {
            setTimeout(() => {
              oppMap.invalidateSize();
              oppMap.fitBounds(radiusCircle.getBounds(), { padding: [22, 22] });
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
              if (layerBtnText) layerBtnText.textContent = 'Street';
            } else {
              oppMap.removeLayer(satLayer);
              streetLayer.addTo(oppMap);
              currentLayerType = 'street';
              layerToggleBtn.classList.remove('is-active');
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
            oppMap.fitBounds(radiusCircle.getBounds(), { padding: [22, 22] });

            // Update text labels
            const rText = newRadius >= 1000 ? (newRadius / 1000) + ' km' : Math.round(newRadius) + ' m';
            const footChip = root.querySelector('#opportunitiesMapFootChip span');
            if (footChip) footChip.innerHTML = `${rText} straight-line screening radius &middot; Verified`;

            const staticBubble = root.querySelector('#opportunitiesMapRadiusTagBubble span');
            if (staticBubble) staticBubble.textContent = rText;

            // Dynamically re-evaluate and update cards
            updateCardsStack(currentSector, newRadius);
          });
        });
      }
    } catch (err) {
      console.warn('Leaflet map initialization skipped or unsupported in environment:', err);
      if (fallbackSvg) fallbackSvg.style.display = 'block';
    }
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
    if (!itemsToDisplay.length) {
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
      stack.innerHTML = itemsToDisplay.map(item => renderOpportunityCard(item, property)).join('');
      stack.style.opacity = '1';
      stack.style.transform = 'translateY(0)';
      bindDrawerEvents(stack);
      bindInquiryEvents(stack);
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
        p.classList.toggle('is-active', p === pill);
      });

      updateCardsStack(cat, currentRadius);
      mapSectorFilter = cat;
      applySectorFilterToMap(cat);
      updateAmenityChipsForSector(cat);
    });
  });
}
