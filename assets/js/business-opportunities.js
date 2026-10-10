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
export function evaluateBusinessOpportunities(property, radiusMeters = 500) {
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

  const supportedMatches = candidates.slice(0, 3).map((item, idx) => ({ ...item, rank: idx + 1 }));

  return {
    status: supportedMatches.length ? 'supported' : 'no_candidates',
    title: 'Business opportunities to explore',
    subtitle: 'Suggestions based on nearby establishments, property characteristics, infrastructure and available zoning information.',
    radiusMeters: Math.round(radiusMeters),
    screeningRadiusLabel: `${Math.round(radiusMeters)}-meter straight-line screening radius`,
    analysisOrigin: originLabel,
    totalPlacesInRadius: deduped.length,
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

/**
 * Render the "Business opportunities to explore" section markup.
 */
export function businessOpportunitiesMarkup(property, options = {}) {
  const opp = property.businessOpportunities || evaluateBusinessOpportunities(property, 500);
  const matches = Array.isArray(opp.supportedMatches) ? opp.supportedMatches : [];
  const radius = opp.radiusMeters || 500;

  return `
    <section class="property-panel property-opportunities" id="propertyOpportunitiesSection" aria-labelledby="propertyOpportunitiesTitle">
      <div class="opportunities-header-wrap">
        <div class="opportunities-title-block">
          <div class="opportunities-kicker-row">
            <span class="opportunities-kicker-badge">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="12 6 12 12 16 14"></polygon>
              </svg>
              <span>EXPLORATORY MATCHING</span>
            </span>
            <span class="opportunities-status-badge">Draft screening · Unvalidated</span>
          </div>
          <h2 id="propertyOpportunitiesTitle" class="opportunities-main-title">${esc(opp.title)}</h2>
          <p class="opportunities-subtitle">${esc(opp.subtitle)}</p>
        </div>

        <div class="opportunities-action-bar no-print">
          <button type="button" class="opportunities-catalog-open-btn" data-open-opportunities-catalog id="openOpportunitiesCatalogBtn">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Explore all business types</span>
          </button>
        </div>
      </div>

      <!-- Spatial screening provenance bar -->
      <div class="opportunities-spatial-bar">
        <div class="opportunities-spatial-info">
          <span class="opportunities-radius-chip">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9"></circle>
              <line x1="12" y1="12" x2="19" y2="12"></line>
            </svg>
            <strong>${esc(opp.screeningRadiusLabel)}</strong>
          </span>
          <span class="opportunities-origin-text">Origin: ${esc(opp.analysisOrigin)}</span>
          <span class="opportunities-inventory-text">&middot; ${opp.totalPlacesInRadius} nearby places within dataset</span>
        </div>

        <!-- View mode controls -->
        <div class="opportunities-mode-switcher no-print" role="group" aria-label="Card display mode">
          <button type="button" class="opportunities-mode-btn is-active" data-opportunities-mode="compact" aria-pressed="true">Compact view</button>
          <button type="button" class="opportunities-mode-btn" data-opportunities-mode="detailed" aria-pressed="false">Detailed evidence</button>
        </div>
      </div>

      <!-- Cards Grid (Never forces 3 results) -->
      ${matches.length > 0 ? `
        <div class="opportunities-cards-grid" id="opportunitiesCardsGrid">
          ${matches.map(match => `
            <article class="opportunity-card" data-opportunity-id="${esc(match.id)}" id="oppCard-${esc(match.id)}">
              <div class="opportunity-card-top">
                <div class="opportunity-card-rank-tag">
                  <span class="opportunity-rank-num">#${match.rank}</span>
                  <span class="opportunity-sector-pill sector-${esc(match.sector)}">${esc(match.sectorLabel)}</span>
                </div>
                <span class="opportunity-draft-pill">${esc(match.statusLabel)}</span>
              </div>

              <h3 class="opportunity-card-title">${esc(match.label)}</h3>
              <p class="opportunity-card-desc">${esc(match.description)}</p>

              <!-- Short evidence-based explanation -->
              <div class="opportunity-card-explanation-box">
                <div class="opportunity-box-kicker">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                  <span>NEIGHBORHOOD EVIDENCE</span>
                </div>
                <p class="opportunity-explanation-text">${esc(match.explanation)}</p>
              </div>

              <!-- Main Unresolved Requirement -->
              <div class="opportunity-unresolved-box">
                <span class="opportunity-unresolved-icon" aria-hidden="true">!</span>
                <div class="opportunity-unresolved-content">
                  <strong>Main unresolved requirement:</strong>
                  <span>${esc(match.mainUnresolvedNotice)}</span>
                </div>
              </div>

              <!-- Action: Why this suggestion? -->
              <div class="opportunity-card-action-bar no-print">
                <button type="button" class="opportunity-why-btn" data-toggle-opportunity-details="${esc(match.id)}" aria-expanded="false" aria-controls="oppDetails-${esc(match.id)}">
                  <span>Why this suggestion?</span>
                  <svg class="opportunity-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>

              <!-- Advanced View: Detailed Evidence Breakdown (Toggleable / Expanded in Detailed mode) -->
              <div class="opportunity-evidence-drawer" id="oppDetails-${esc(match.id)}" hidden>
                <div class="opportunity-drawer-inner">
                  <h4 class="opportunity-drawer-heading">Traceable Assessment Evidence</h4>

                  <!-- Supporting places & distances -->
                  <div class="opportunity-evidence-group">
                    <div class="opportunity-evidence-label">Actual supporting places within radius:</div>
                    <ul class="opportunity-places-list">
                      ${match.supportingPlaces.map(sp => `
                        <li class="opportunity-place-item">
                          <span class="opportunity-place-name">${esc(sp.name)}</span>
                          <span class="opportunity-place-badge">${esc(sp.distanceFormatted)} straight-line &middot; ${esc(sp.category)}</span>
                        </li>
                      `).join('')}
                    </ul>
                  </div>

                  <!-- Property requirements & assessment states -->
                  <div class="opportunity-evidence-group">
                    <div class="opportunity-evidence-label">Property requirements vs recorded site:</div>
                    <div class="opportunity-specs-grid">
                      <div class="opportunity-spec-item">
                        <span class="opportunity-spec-label">Area guideline</span>
                        <strong class="opportunity-spec-val">${esc(match.areaGuideline)}</strong>
                        <small class="opportunity-spec-state">Parcel: ${esc(match.areaStatus)}</small>
                      </div>
                      <div class="opportunity-spec-item">
                        <span class="opportunity-spec-label">Zoning status</span>
                        <strong class="opportunity-spec-val">${esc(match.zoningStatus)}</strong>
                        <small class="opportunity-spec-state">Classification: ${esc(match.zoningClassification)}</small>
                      </div>
                      <div class="opportunity-spec-item">
                        <span class="opportunity-spec-label">Road access</span>
                        <strong class="opportunity-spec-val">${esc(match.roadAccessRequirement)} road required</strong>
                      </div>
                      <div class="opportunity-spec-item">
                        <span class="opportunity-spec-label">Missing evidence</span>
                        <strong class="opportunity-spec-val">${match.missingEvidence.length ? esc(match.missingEvidence.join(' &middot; ')) : 'None recorded'}</strong>
                      </div>
                    </div>
                  </div>

                  <!-- Competitors & Complementary in dataset -->
                  <div class="opportunity-evidence-group">
                    <div class="opportunity-evidence-label">Competitor & complementary establishments in dataset:</div>
                    <div class="opportunity-comp-row">
                      <div class="opportunity-comp-box">
                        <strong>Recorded competitors:</strong>
                        <p>${esc(match.competitorsNotice)}</p>
                        ${match.competitorSample?.length ? `<small>Examples: ${esc(match.competitorSample.join(', '))}</small>` : ''}
                      </div>
                      <div class="opportunity-comp-box">
                        <strong>Complementary businesses:</strong>
                        <p>${match.complementaryCount > 0 ? `${match.complementaryCount} complementary anchors found` : 'No direct complementary anchors recorded'}</p>
                        ${match.complementarySample?.length ? `<small>Examples: ${esc(match.complementarySample.join(', '))}</small>` : ''}
                      </div>
                    </div>
                  </div>

                  <!-- Provenance & Rule Version -->
                  <div class="opportunity-provenance-footer">
                    <span>Rule source: ${esc(match.ruleSource)}</span>
                    <span>Version: ${esc(match.version)} &middot; Draft rule requiring local validation</span>
                  </div>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      ` : `
        <div class="opportunities-empty-card">
          <div class="opportunities-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <h3>No supported business suggestions under current evidence</h3>
          <p>No catalog business options meet the required activity center relationships or zoning criteria within the ${radius}m screening radius. This model never forces suggestions when evidence is missing or incompatible.</p>
          <button type="button" class="opportunities-catalog-open-btn" data-open-opportunities-catalog>Explore full business catalog &rarr;</button>
        </div>
      `}

      <!-- Legal & integrity disclaimer -->
      <p class="opportunities-disclaimer">
        <strong>Integrity &amp; methodology note:</strong> Suggestions are exploratory decision-support ideas derived from traceable spatial proximity and property characteristics. They do not claim profitability, guaranteed investment returns, or proven unmet customer demand. MCE/IAI scoring formulas remain completely separate and unmodified.
      </p>

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
 * Initialize interactive behaviors for the Business Opportunities section.
 */
export function initBusinessOpportunities(root = document) {
  // 1. Toggle "Why this suggestion?" drawer on individual cards
  root.querySelectorAll('[data-toggle-opportunity-details]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-toggle-opportunity-details');
      const drawer = root.querySelector(`#oppDetails-${id}`);
      if (!drawer) return;
      const isOpen = !drawer.hidden;
      drawer.hidden = isOpen;
      btn.setAttribute('aria-expanded', String(!isOpen));
      btn.classList.toggle('is-expanded', !isOpen);
    });
  });

  // 2. View mode switcher: Compact view vs Detailed evidence
  root.querySelectorAll('[data-opportunities-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-opportunities-mode');
      root.querySelectorAll('[data-opportunities-mode]').forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      const grid = root.querySelector('#opportunitiesCardsGrid');
      if (grid) {
        if (mode === 'detailed') {
          grid.classList.add('is-detailed-mode');
          grid.querySelectorAll('.opportunity-evidence-drawer').forEach(d => { d.hidden = false; });
          grid.querySelectorAll('.opportunity-why-btn').forEach(b => {
            b.setAttribute('aria-expanded', 'true');
            b.classList.add('is-expanded');
          });
        } else {
          grid.classList.remove('is-detailed-mode');
          grid.querySelectorAll('.opportunity-evidence-drawer').forEach(d => { d.hidden = true; });
          grid.querySelectorAll('.opportunity-why-btn').forEach(b => {
            b.setAttribute('aria-expanded', 'false');
            b.classList.remove('is-expanded');
          });
        }
      }
    });
  });

  // 3. Catalog Dialog open / close
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

  // 4. Sector filtering in catalog dialog
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
}
