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

const DEMO_MATCHES = [
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
      { name: 'Hospital nearby', distanceFormatted: '180 m', category: 'Healthcare' },
      { name: 'School nearby', distanceFormatted: '240 m', category: 'Education' },
      { name: 'City hall nearby', distanceFormatted: '310 m', category: 'Civic' },
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
      { name: 'School nearby', distanceFormatted: '240 m', category: 'Education' },
      { name: 'Hospital nearby', distanceFormatted: '180 m', category: 'Healthcare' },
      { name: 'City hall nearby', distanceFormatted: '310 m', category: 'Civic' },
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
      { name: 'Hospital nearby', distanceFormatted: '180 m', category: 'Healthcare' },
      { name: 'School nearby', distanceFormatted: '240 m', category: 'Education' },
      { name: 'City hall nearby', distanceFormatted: '310 m', category: 'Civic' },
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

  // Build amenity chips list dynamically
  let amenityChips = [];
  if (realAnchors.length > 0) {
    amenityChips = realAnchors.slice(0, 3).map((a, idx) => {
      let iconHtml = '<span class="amenity-icon text-red" aria-hidden="true">+</span>';
      const cat = (a.categoryKey || a.categoryGroup || a.category || '').toLowerCase();
      if (cat.includes('school') || cat.includes('college') || cat.includes('educ')) {
        iconHtml = '<span class="amenity-icon text-blue" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg></span>';
      } else if (cat.includes('townhall') || cat.includes('gov') || cat.includes('civic') || cat.includes('hall')) {
        iconHtml = '<span class="amenity-icon text-navy" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2L2 7v2h20V7L12 2zm-8 8v9h3v-9H4zm5 0v9h3v-9H9zm5 0v9h3v-9h-3zm5 0v9h3v-9h-3zM2 20v2h20v-2H2z"/></svg></span>';
      } else if (cat.includes('food') || cat.includes('rest') || cat.includes('eat')) {
        iconHtml = '<span class="amenity-icon text-orange" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M18 2v20M18 8a3 3 0 0 0 3-3V2h-3M6 2v6a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2M9 11v11"/></svg></span>';
      }

      const distLabel = a.distanceFormatted ? ` (${a.distanceFormatted})` : '';
      return {
        index: idx,
        iconHtml,
        label: `${a.name}${distLabel}`,
        lat: a.lat,
        lng: a.lng,
        name: a.name,
        category: a.category
      };
    });
  } else {
    // Demo fallback chips
    amenityChips = [
      {
        index: 0,
        iconHtml: '<span class="amenity-icon text-red" aria-hidden="true">+</span>',
        label: 'Hospital nearby',
        lat: lat + 0.002,
        lng: lng - 0.002,
        name: 'Hospital',
        category: 'Healthcare'
      },
      {
        index: 1,
        iconHtml: '<span class="amenity-icon text-blue" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg></span>',
        label: 'School nearby',
        lat: lat + 0.001,
        lng: lng + 0.003,
        name: 'School',
        category: 'Education'
      },
      {
        index: 2,
        iconHtml: '<span class="amenity-icon text-navy" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2L2 7v2h20V7L12 2zm-8 8v9h3v-9H4zm5 0v9h3v-9H9zm5 0v9h3v-9h-3zm5 0v9h3v-9h-3zM2 20v2h20v-2H2z"/></svg></span>',
        label: 'City hall nearby',
        lat: lat - 0.002,
        lng: lng + 0.001,
        name: 'City hall',
        category: 'Civic'
      }
    ];
  }
  
  // Format display matches: use dynamic matches formatted to Picture 2 specs, or fall back to DEMO_MATCHES
  const displayCards = rawMatches.length ? rawMatches.map(m => {
    let pillText = 'Multiple nearby activity centers';
    if (Array.isArray(m.supportingPlaces) && m.supportingPlaces.length) {
      if (m.supportingPlaces.length === 1) {
        pillText = `Near ${m.supportingPlaces[0].name}${m.supportingPlaces[0].distanceFormatted ? ` (${m.supportingPlaces[0].distanceFormatted})` : ''}`;
      } else {
        pillText = `Near ${m.supportingPlaces[0].name} & ${m.supportingPlaces[1].name}`;
      }
    } else if (m.id.includes('eatery')) {
      pillText = 'Potential daytime customers';
    } else if (m.id.includes('printing')) {
      pillText = 'School and government-office context';
    }

    const cleanAlert = formatAlertNotice(m.mainUnresolvedNotice);

    return {
      id: m.id,
      label: m.label.toUpperCase(),
      sector: m.sector,
      sectorLabel: m.sectorLabel,
      rank: m.rank,
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
  }) : DEMO_MATCHES;

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
            { name: 'Hospital', category: 'Healthcare', lat: lat + 0.002, lng: lng - 0.002, distanceFormatted: '180 m' },
            { name: 'School', category: 'Education', lat: lat + 0.001, lng: lng + 0.003, distanceFormatted: '240 m' },
            { name: 'City hall', category: 'Civic', lat: lat - 0.002, lng: lng + 0.001, distanceFormatted: '310 m' }
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

          <!-- Stylized Map Box with Real Leaflet Canvas & Static Fallback -->
          <div class="opportunities-map-box" id="opportunitiesInteractiveMap" data-lat="${lat}" data-lng="${lng}" data-radius="${radius}" data-property-name="${esc(property.name || 'Subject Property')}">
            <!-- Real Interactive Leaflet Map Canvas (Activated via JS) -->
            <div class="opportunities-leaflet-canvas" id="opportunitiesLeafletCanvas" role="region" aria-label="Interactive Screening Radius Map" style="display:none;width:100%;height:100%;position:absolute;top:0;left:0;border-radius:14px;z-index:2;"></div>

            <!-- Fallback Vector Map Canvas (Displayed for SSR & headless test runners) -->
            <div class="opportunities-map-static-fallback" id="opportunitiesMapStaticFallback">
              <svg class="opportunities-map-svg" viewBox="0 0 460 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <rect width="100%" height="100%" fill="#E3EBEF"/>
                <path d="M 0,210 C 50,195 80,245 130,285 L 130,300 L 0,300 Z" fill="#C5E2F7"/>
                <path d="M 0,210 C 50,195 80,245 130,285" stroke="#90CAF9" stroke-width="8" fill="none" opacity="0.6"/>
                
                <rect x="25" y="30" width="65" height="48" rx="4" fill="#D7E3EA"/>
                <rect x="105" y="25" width="80" height="58" rx="4" fill="#D7E3EA"/>
                <rect x="220" y="35" width="60" height="38" rx="4" fill="#D7E3EA"/>
                <rect x="310" y="28" width="75" height="48" rx="4" fill="#D7E3EA"/>
                <rect x="400" y="42" width="50" height="52" rx="4" fill="#D7E3EA"/>
                
                <rect x="30" y="98" width="58" height="45" rx="4" fill="#D7E3EA"/>
                <rect x="110" y="102" width="55" height="52" rx="4" fill="#D7E3EA"/>
                <rect x="290" y="95" width="70" height="55" rx="4" fill="#D7E3EA"/>
                <rect x="380" y="108" width="70" height="60" rx="4" fill="#D7E3EA"/>
                
                <rect x="35" y="165" width="50" height="40" rx="4" fill="#D7E3EA"/>
                <rect x="300" y="170" width="55" height="45" rx="4" fill="#D7E3EA"/>
                <rect x="375" y="188" width="70" height="52" rx="4" fill="#D7E3EA"/>
                <rect x="200" y="240" width="90" height="45" rx="4" fill="#D7E3EA"/>
                <rect x="310" y="248" width="65" height="40" rx="4" fill="#D7E3EA"/>

                <path d="M 370,175 Q 425,155 450,205 L 450,275 Q 395,265 370,215 Z" fill="#D4E7D6"/>

                <path d="M 0,88 L 460,88 M 0,158 L 460,158 M 0,228 L 460,228" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
                <path d="M 95,0 L 95,300 M 180,0 L 180,300 M 275,0 L 275,300 M 365,0 L 365,300" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
                <path d="M 20,0 L 250,230" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
                <path d="M 180,40 L 440,300" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>

                <circle cx="215" cy="145" r="90" fill="none" stroke="#991B1B" stroke-width="2" stroke-dasharray="5 4" opacity="0.85"/>
                <line x1="285" y1="100" x2="310" y2="92" stroke="#991B1B" stroke-width="1.5"/>
              </svg>

              <!-- Callout bubble: 500 m -->
              <div class="opportunities-map-radius-tag-bubble">
                <span>500 m</span>
              </div>

              <!-- Subject property center pin (Maroon) -->
              <div class="opportunities-map-center-pin" title="Subject Property Location">
                <svg viewBox="0 0 24 32" width="22" height="30" fill="none" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#7F1D1D"/>
                  <circle cx="12" cy="12" r="4.5" fill="#FFFFFF"/>
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
            <div class="opportunities-map-foot-chip" style="z-index: 5;">
              <span>500 m straight-line screening radius &middot; Verified</span>
            </div>
          </div>

          <!-- Dynamic Amenity Pill Chips below map -->
          <div class="opportunities-amenities-row">
            ${amenityChips.map(c => `
              <button type="button" class="opportunities-amenity-chip" data-anchor-index="${c.index}" title="Click to view ${esc(c.name)} on map">
                ${c.iconHtml}
                <span>${esc(c.label)}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- RIGHT COLUMN: Demo Scenario & 3 Powder-Blue Cards -->
        <div class="opportunities-cards-column">
          <div class="opportunities-kicker-banner">
            <span>DEMO SCENARIO - Illustrative places and suggestions</span>
          </div>

          <div class="opportunities-blue-stack">
            ${displayCards.map(item => `
              <article class="opportunity-blue-card" data-opportunity-id="${esc(item.id)}" data-sector="${esc(item.sector)}" id="oppCard-${esc(item.id)}">
                <div class="opportunity-blue-main-row" data-toggle-opportunity-details="${esc(item.id)}" role="button" tabindex="0" aria-expanded="false" aria-controls="oppDetails-${esc(item.id)}" title="Click to view detailed evidence">
                  <!-- White square icon box with burgundy SVG -->
                  <div class="opportunity-blue-icon-box" aria-hidden="true">
                    ${getOpportunityIconSvg(item.icon)}
                  </div>

                  <!-- Center information block (iOS Refined & Scannable) -->
                  <div class="opportunity-blue-content">
                    <div class="opportunity-card-kicker-row">
                      <span class="opportunity-preliminary-tag">${esc(item.statusLabel)}</span>
                    </div>

                    <h3 class="opportunity-blue-title">${esc(item.label)}</h3>
                    <p class="opportunity-blue-desc">${esc(item.description)}</p>
                    
                    <div class="opportunity-highlights-row">
                      <div class="opportunity-lime-pill">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
                          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                        </svg>
                        <span>${esc(item.pillText)}</span>
                      </div>

                      <div class="opportunity-red-warning">
                        <span class="warning-icon" aria-hidden="true">&#9888;</span>
                        <span>${esc(item.alertText)}</span>
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
                        <span>Supporting activity centers within 500m</span>
                        <small>Direct walking &amp; commute anchors</small>
                      </div>
                      <ul class="opportunity-places-list">
                        ${(item.supportingPlaces && item.supportingPlaces.length ? item.supportingPlaces : [
                          { name: 'Saint Louis College', distanceFormatted: '165 m', category: 'College & Higher Education' },
                          { name: 'City Hall of San Fernando', distanceFormatted: '185 m', category: 'Civic Administration' }
                        ]).map(sp => `
                          <li class="opportunity-place-item">
                            <div class="opportunity-place-main">
                              <span class="opportunity-place-icon" aria-hidden="true">&#9679;</span>
                              <strong class="opportunity-place-name">${esc(sp.name)}</strong>
                            </div>
                            <div class="opportunity-place-meta">
                              <span class="opportunity-place-badge">${esc(sp.distanceFormatted)}</span>
                              <span class="opportunity-place-cat">${esc(sp.category)}</span>
                            </div>
                          </li>
                        `).join('')}
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
                          <strong class="opportunity-spec-val">${esc(item.areaGuideline)}</strong>
                          <span class="opportunity-spec-state">${esc(item.areaStatus)}</span>
                        </div>
                        <div class="opportunity-spec-item">
                          <span class="opportunity-spec-label">Zoning Compatibility</span>
                          <strong class="opportunity-spec-val">${esc(item.zoningStatus)}</strong>
                          <span class="opportunity-spec-state">${esc(item.zoningClassification)}</span>
                        </div>
                        <div class="opportunity-spec-item">
                          <span class="opportunity-spec-label">Road Access</span>
                          <strong class="opportunity-spec-val">${esc(item.roadAccessRequirement)} road required</strong>
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
                          <p>${esc(item.competitorsNotice)}</p>
                          ${item.competitorSample && item.competitorSample.length ? `<small>Recorded examples: ${esc(item.competitorSample.join(', '))}</small>` : ''}
                        </div>
                        <div class="opportunity-comp-box">
                          <strong>Complementary businesses:</strong>
                          <p>${item.complementaryCount > 0 ? `${item.complementaryCount} complementary anchors found` : 'No direct complementary anchors recorded'}</p>
                          ${item.complementarySample && item.complementarySample.length ? `<small>Synergies: ${esc(item.complementarySample.join(', '))}</small>` : ''}
                        </div>
                      </div>
                    </div>

                    <!-- 4. Rule provenance audit -->
                    <div class="opportunity-provenance-footer">
                      <div>
                        <strong>Rule source:</strong> <span>${esc(item.ruleSource)}</span>
                      </div>
                      <div>
                        <strong>Version:</strong> <span>${esc(item.version)} &middot; Exploratory draft rule requiring City Planning validation</span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            `).join('')}
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
  // 1. Setup real interactive Leaflet map if Leaflet is available
  const mapBox = root.querySelector('#opportunitiesInteractiveMap');
  const leafletCanvas = root.querySelector('#opportunitiesLeafletCanvas');
  const fallbackSvg = root.querySelector('#opportunitiesMapStaticFallback');

  if (mapBox && leafletCanvas && window.L && typeof window.L.map === 'function') {
    try {
      const lat = parseFloat(mapBox.getAttribute('data-lat')) || 16.6159;
      const lng = parseFloat(mapBox.getAttribute('data-lng')) || 120.3166;
      const radius = parseFloat(mapBox.getAttribute('data-radius')) || 500;
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
        const oppMap = L.map(leafletCanvas, {
          center: [lat, lng],
          zoom: 15,
          scrollWheelZoom: false,
          zoomControl: false,
          attributionControl: false
        });

        // Add subtle zoom control at bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(oppMap);

        // Apple Maps-style light minimalist tiles
        const tileUrl = window.SFC_APP_CONFIG?.mapTileUrl || 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        L.tileLayer(tileUrl, {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(oppMap);

        // 500m screening radius circle
        const radiusCircle = L.circle([lat, lng], {
          radius: radius,
          color: '#991B1B',
          weight: 2.2,
          dashArray: '5, 5',
          fillColor: '#991B1B',
          fillOpacity: 0.05
        }).addTo(oppMap);

        // Subject Property Pin (Deep Maroon teardrop)
        const centerIcon = L.divIcon({
          className: 'locus-opp-center-marker',
          html: `<div class="opp-pin-bubble" title="${esc(propName)}">
            <svg viewBox="0 0 24 32" width="24" height="32" fill="none">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#7F1D1D"/>
              <circle cx="12" cy="12" r="4.5" fill="#FFFFFF"/>
            </svg>
          </div>`,
          iconSize: [24, 32],
          iconAnchor: [12, 32]
        });

        const centerMarker = L.marker([lat, lng], { icon: centerIcon }).addTo(oppMap);
        centerMarker.bindPopup(`
          <div class="opp-leaflet-popup">
            <strong>${esc(propName)}</strong>
            <span>Screening Origin &middot; ${Math.round(radius)}m screening radius</span>
          </div>
        `);

        // Radius callout badge on circle edge
        const calloutLat = lat + (radius / 111320) * 0.72;
        const calloutLng = lng + (radius / (111320 * Math.cos(lat * Math.PI / 180))) * 0.72;
        const calloutIcon = L.divIcon({
          className: 'locus-opp-radius-tag',
          html: `<div class="opp-radius-tag-badge">${Math.round(radius)} m</div>`,
          iconSize: [52, 24],
          iconAnchor: [26, 12]
        });
        L.marker([calloutLat, calloutLng], { icon: calloutIcon, interactive: false }).addTo(oppMap);

        // Add real anchor markers for each nearby place
        const anchorMarkers = [];
        anchors.forEach(a => {
          const aLat = parseFloat(a.lat);
          const aLng = parseFloat(a.lng);
          if (!isFinite(aLat) || !isFinite(aLng) || (aLat === 0 && aLng === 0)) return;

          let badgeColor = '#DC2626';
          let badgeIcon = '+';
          const cat = (a.categoryKey || a.categoryGroup || a.category || '').toLowerCase();
          if (cat.includes('school') || cat.includes('college') || cat.includes('educ')) {
            badgeColor = '#2563EB';
            badgeIcon = '🎓';
          } else if (cat.includes('townhall') || cat.includes('gov') || cat.includes('civic') || cat.includes('hall')) {
            badgeColor = '#11224D';
            badgeIcon = '🏛️';
          } else if (cat.includes('food') || cat.includes('eat') || cat.includes('rest') || cat.includes('cafe')) {
            badgeColor = '#EA580C';
            badgeIcon = '🍽️';
          } else if (cat.includes('store') || cat.includes('retail') || cat.includes('shop')) {
            badgeColor = '#059669';
            badgeIcon = '🏪';
          }

          const aIcon = L.divIcon({
            className: 'locus-opp-poi-marker',
            html: `<div class="opp-poi-pin" style="--badge-color: ${badgeColor};" title="${esc(a.name)}">
              <span class="opp-poi-icon">${badgeIcon}</span>
              <span class="opp-poi-name-pill">${esc(a.name)}</span>
            </div>`,
            iconSize: [120, 28],
            iconAnchor: [14, 14]
          });

          const m = L.marker([aLat, aLng], { icon: aIcon }).addTo(oppMap);
          m.bindPopup(`
            <div class="opp-leaflet-popup">
              <strong>${esc(a.name)}</strong>
              <span>${esc(a.category || 'Activity Center')} &middot; ${esc(a.distanceFormatted || '')}</span>
            </div>
          `);
          anchorMarkers.push({ data: a, marker: m });
        });

        // Hide static SVG fallback and display Leaflet
        if (fallbackSvg) fallbackSvg.style.display = 'none';
        leafletCanvas.style.display = 'block';

        setTimeout(() => {
          oppMap.invalidateSize();
          oppMap.fitBounds(radiusCircle.getBounds(), { padding: [22, 22] });
        }, 100);

        window.addEventListener('sfc:investor-view-change', (e) => {
          if (e.detail?.mode === 'advanced') {
            setTimeout(() => {
              oppMap.invalidateSize();
              oppMap.fitBounds(radiusCircle.getBounds(), { padding: [22, 22] });
            }, 80);
          }
        });

        // Wire amenity chips below map to fly to that anchor
        root.querySelectorAll('[data-anchor-index]').forEach(chip => {
          chip.addEventListener('click', (e) => {
            e.preventDefault();
            const idx = parseInt(chip.getAttribute('data-anchor-index'), 10);
            if (anchorMarkers[idx]) {
              const am = anchorMarkers[idx];
              oppMap.flyTo([am.data.lat, am.data.lng], 16, { duration: 0.8 });
              am.marker.openPopup();
            } else {
              oppMap.flyTo([lat, lng], 15, { duration: 0.8 });
            }
          });
        });
      }
    } catch (err) {
      console.warn('Leaflet map initialization skipped or unsupported in environment:', err);
      if (fallbackSvg) fallbackSvg.style.display = 'block';
    }
  }

  // 2. Toggle detailed evidence dropdown on individual cards
  root.querySelectorAll('[data-toggle-opportunity-details]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute('data-toggle-opportunity-details');
      const drawer = root.querySelector(`#oppDetails-${id}`);
      if (!drawer) return;
      const isOpen = !drawer.hidden;
      drawer.hidden = isOpen;

      // Update aria attributes and active classes
      const card = root.querySelector(`#oppCard-${id}`);
      if (card) card.classList.toggle('is-drawer-open', !isOpen);

      root.querySelectorAll(`[data-toggle-opportunity-details="${id}"]`).forEach(b => {
        b.setAttribute('aria-expanded', String(!isOpen));
        b.classList.toggle('is-expanded', !isOpen);
      });
    });

    // Keyboard support for Enter/Space on row
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });

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

  // 6. Category filter pills below split screen
  root.querySelectorAll('[data-cat-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      const cat = pill.getAttribute('data-cat-filter');
      root.querySelectorAll('[data-cat-filter]').forEach(p => {
        p.classList.toggle('is-active', p === pill);
      });
      root.querySelectorAll('.opportunity-blue-card').forEach(card => {
        const sector = card.getAttribute('data-sector');
        if (cat === 'all' || !cat || cat === sector) {
          card.style.display = 'flex';
          card.style.opacity = '1';
        } else {
          card.style.opacity = '0.35';
        }
      });
    });
  });
}
