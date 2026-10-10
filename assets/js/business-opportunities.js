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

const DEMO_MATCHES = [
  {
    id: 'convenience_store',
    label: 'CONVENIENCE STORE',
    sector: 'everyday_services',
    sectorLabel: 'Everyday Services',
    rank: 1,
    statusLabel: 'Preliminary',
    description: 'Everyday essentials for staff, students and visitors.',
    pillText: 'Multiple nearby activity centers',
    alertText: 'Check competition and frontage.',
    icon: 'store',
    explanation: 'High foot-traffic anchors nearby provide regular customer flow for daily essentials.',
    mainUnresolvedNotice: 'Confirm commercial electric line capacity and delivery unloading space.',
    supportingPlaces: [
      { name: 'Hospital nearby', distanceFormatted: '180 m', category: 'Healthcare' },
      { name: 'School nearby', distanceFormatted: '240 m', category: 'Education' },
      { name: 'City hall nearby', distanceFormatted: '310 m', category: 'Civic' },
    ],
    areaGuideline: '30–80 sqm (commercial space); road frontage desirable',
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
  {
    id: 'eatery',
    label: 'AFFORDABLE EATERY',
    sector: 'food_retail',
    sectorLabel: 'Food & Retail',
    rank: 2,
    statusLabel: 'Preliminary',
    description: 'Meal options for workers, students and companions.',
    pillText: 'Potential daytime customers',
    alertText: 'Check water, sanitation and demand.',
    icon: 'eatery',
    explanation: 'Dense concentration of daily workers and students nearby generates mealtime customer flow.',
    mainUnresolvedNotice: 'Confirm grease trap requirement and potable water reliability.',
    supportingPlaces: [
      { name: 'School nearby', distanceFormatted: '240 m', category: 'Education' },
      { name: 'Hospital nearby', distanceFormatted: '180 m', category: 'Healthcare' },
      { name: 'City hall nearby', distanceFormatted: '310 m', category: 'Civic' },
    ],
    areaGuideline: '30–90 sqm with dining seating',
    areaStatus: 'Compatible with site layout',
    zoningStatus: 'Compatible with Commercial classification',
    zoningClassification: 'Commercial / Institutional',
    roadAccessRequirement: 'all_weather',
    missingEvidence: [],
    competitorsNotice: '1 similar operating establishment recorded in radius',
    competitorSample: ['Canteen'],
    complementaryCount: 2,
    complementarySample: ['Convenience Store', 'Printing Service'],
    ruleSource: RULE_SOURCE,
    version: RULE_VERSION,
  },
  {
    id: 'printing',
    label: 'PRINTING & DOCUMENT SERVICES',
    sector: 'professional_services',
    sectorLabel: 'Professional Services',
    rank: 3,
    statusLabel: 'Preliminary',
    description: 'Schoolwork and administrative document needs.',
    pillText: 'School and government-office context',
    alertText: 'Check existing providers and internet.',
    icon: 'printing',
    explanation: 'Proximity to school and government offices creates daily recurring demand for document services.',
    mainUnresolvedNotice: 'Verify commercial electrical surge protection and internet connection.',
    supportingPlaces: [
      { name: 'School nearby', distanceFormatted: '240 m', category: 'Education' },
      { name: 'City hall nearby', distanceFormatted: '310 m', category: 'Civic' },
    ],
    areaGuideline: '20–50 sqm for print machines & client counter',
    areaStatus: 'Suitable for commercial frontage',
    zoningStatus: 'Compatible with Commercial classification',
    zoningClassification: 'Commercial / Mixed Use',
    roadAccessRequirement: 'all_weather',
    missingEvidence: [],
    competitorsNotice: 'No competitors recorded in this dataset',
    competitorSample: [],
    complementaryCount: 2,
    complementarySample: ['School & Office Supplies', 'Eatery'],
    ruleSource: RULE_SOURCE,
    version: RULE_VERSION,
  },
];

function getOpportunityIconSvg(iconType) {
  if (iconType === 'eatery') {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 2v20M18 8a3 3 0 0 0 3-3V2h-3"></path>
      <path d="M6 2v6a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2M9 11v11M6 2v4M12 2v4"></path>
    </svg>`;
  }
  if (iconType === 'printing') {
    return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
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
 * Render the "Business opportunities to explore" section markup matching Picture 2.
 */
export function businessOpportunitiesMarkup(property, options = {}) {
  const opp = property.businessOpportunities || evaluateBusinessOpportunities(property, 500);
  const rawMatches = Array.isArray(opp.supportedMatches) && opp.supportedMatches.length ? opp.supportedMatches : [];
  
  // Format display matches: use dynamic matches formatted to Picture 2 specs, or fall back to DEMO_MATCHES
  const displayCards = rawMatches.length ? rawMatches.map(m => {
    let iconType = 'store';
    if (m.id.includes('eatery') || m.id.includes('cafe') || m.id.includes('bakery')) iconType = 'eatery';
    else if (m.id.includes('printing') || m.id.includes('school')) iconType = 'printing';

    let pillText = 'Multiple nearby activity centers';
    if (m.supportingCount === 1) pillText = `${m.supportingPlaces[0]?.name || 'Nearby activity anchor'}`;
    else if (m.id.includes('eatery')) pillText = 'Potential daytime customers';
    else if (m.id.includes('printing')) pillText = 'School and government-office context';

    let alertText = m.mainUnresolvedNotice || 'Check competition and frontage.';
    if (!alertText.toLowerCase().startsWith('check')) {
      alertText = `Check ${alertText.charAt(0).toLowerCase() + alertText.slice(1)}`;
    }

    return {
      id: m.id,
      label: m.label.toUpperCase(),
      sector: m.sector,
      sectorLabel: m.sectorLabel,
      rank: m.rank,
      statusLabel: 'Preliminary',
      description: m.description,
      pillText,
      alertText,
      icon: iconType,
      explanation: m.explanation,
      mainUnresolvedNotice: m.mainUnresolvedNotice,
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

          <!-- Stylized Vector Map Canvas -->
          <div class="opportunities-map-box">
            <svg class="opportunities-map-svg" viewBox="0 0 460 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <!-- Ground base -->
              <rect width="100%" height="100%" fill="#E3EBEF"/>
              <!-- River / water body -->
              <path d="M 0,210 C 50,195 80,245 130,285 L 130,300 L 0,300 Z" fill="#C5E2F7"/>
              <path d="M 0,210 C 50,195 80,245 130,285" stroke="#90CAF9" stroke-width="8" fill="none" opacity="0.6"/>
              
              <!-- City building blocks (light gray) -->
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

              <!-- Soft green vegetation zone -->
              <path d="M 370,175 Q 425,155 450,205 L 450,275 Q 395,265 370,215 Z" fill="#D4E7D6"/>

              <!-- Primary white street grid -->
              <path d="M 0,88 L 460,88 M 0,158 L 460,158 M 0,228 L 460,228" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
              <path d="M 95,0 L 95,300 M 180,0 L 180,300 M 275,0 L 275,300 M 365,0 L 365,300" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
              <path d="M 20,0 L 250,230" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
              <path d="M 180,40 L 440,300" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>

              <!-- 500m screening radius dashed circle -->
              <circle cx="215" cy="145" r="90" fill="none" stroke="#991B1B" stroke-width="2" stroke-dasharray="5 4" opacity="0.85"/>
              
              <!-- Callout pointer line -->
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

            <!-- Map POI Marker 1: Hospital -->
            <div class="opportunities-map-poi poi-hospital">
              <span class="poi-icon-circle bg-red" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </span>
              <span class="poi-label">Hospital</span>
            </div>

            <!-- Map POI Marker 2: School -->
            <div class="opportunities-map-poi poi-school">
              <span class="poi-icon-circle bg-blue" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="#FFFFFF">
                  <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                </svg>
              </span>
              <span class="poi-label">School</span>
            </div>

            <!-- Map POI Marker 3: City hall -->
            <div class="opportunities-map-poi poi-cityhall">
              <span class="poi-icon-circle bg-navy" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="#FFFFFF">
                  <path d="M12 2L2 7v2h20V7L12 2zm-8 8v9h3v-9H4zm5 0v9h3v-9H9zm5 0v9h3v-9h-3zm5 0v9h3v-9h-3zM2 20v2h20v-2H2z"/>
                </svg>
              </span>
              <span class="poi-label">City hall</span>
            </div>

            <!-- Map bottom-left tag -->
            <div class="opportunities-map-foot-chip">
              <span>500 m straight-line screening radius &middot; Demo</span>
            </div>
          </div>

          <!-- 3 Amenity Pill Chips below map -->
          <div class="opportunities-amenities-row">
            <div class="opportunities-amenity-chip">
              <span class="amenity-icon text-red" aria-hidden="true">+</span>
              <span>Hospital nearby</span>
            </div>
            <div class="opportunities-amenity-chip">
              <span class="amenity-icon text-blue" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
              </span>
              <span>School nearby</span>
            </div>
            <div class="opportunities-amenity-chip">
              <span class="amenity-icon text-navy" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2L2 7v2h20V7L12 2zm-8 8v9h3v-9H4zm5 0v9h3v-9H9zm5 0v9h3v-9h-3zm5 0v9h3v-9h-3zM2 20v2h20v-2H2z"/></svg>
              </span>
              <span>City hall nearby</span>
            </div>
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
                <div class="opportunity-blue-main-row">
                  <!-- White square icon box with burgundy SVG -->
                  <div class="opportunity-blue-icon-box" aria-hidden="true">
                    ${getOpportunityIconSvg(item.icon)}
                  </div>

                  <!-- Center information block -->
                  <div class="opportunity-blue-content">
                    <span class="opportunity-preliminary-tag">${esc(item.statusLabel)}</span>
                    <h3 class="opportunity-blue-title">${esc(item.label)}</h3>
                    <p class="opportunity-blue-desc">${esc(item.description)}</p>
                    
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

                  <!-- Dark circular action button with white arrow -->
                  <button type="button" class="opportunity-circle-action-btn no-print" data-toggle-opportunity-details="${esc(item.id)}" aria-expanded="false" aria-controls="oppDetails-${esc(item.id)}" aria-label="Toggle details for ${esc(item.label)}">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>
                </div>

                <!-- Collapsible Evidence Drawer for Scientific Traceability -->
                <div class="opportunity-evidence-drawer" id="oppDetails-${esc(item.id)}" hidden>
                  <div class="opportunity-drawer-inner">
                    <h4 class="opportunity-drawer-heading">Traceable Assessment Evidence</h4>

                    <!-- Supporting places & distances -->
                    <div class="opportunity-evidence-group">
                      <div class="opportunity-evidence-label">Supporting activity centers within 500m:</div>
                      <ul class="opportunity-places-list">
                        ${item.supportingPlaces.map(sp => `
                          <li class="opportunity-place-item">
                            <span class="opportunity-place-name">${esc(sp.name)}</span>
                            <span class="opportunity-place-badge">${esc(sp.distanceFormatted)} &middot; ${esc(sp.category)}</span>
                          </li>
                        `).join('')}
                      </ul>
                    </div>

                    <!-- Property requirements -->
                    <div class="opportunity-evidence-group">
                      <div class="opportunity-evidence-label">Property requirements vs site:</div>
                      <div class="opportunity-specs-grid">
                        <div class="opportunity-spec-item">
                          <span class="opportunity-spec-label">Area guideline</span>
                          <strong class="opportunity-spec-val">${esc(item.areaGuideline)}</strong>
                          <small class="opportunity-spec-state">${esc(item.areaStatus)}</small>
                        </div>
                        <div class="opportunity-spec-item">
                          <span class="opportunity-spec-label">Zoning status</span>
                          <strong class="opportunity-spec-val">${esc(item.zoningStatus)}</strong>
                          <small class="opportunity-spec-state">${esc(item.zoningClassification)}</small>
                        </div>
                      </div>
                    </div>

                    <!-- Rule provenance -->
                    <div class="opportunity-provenance-footer">
                      <span>Rule source: ${esc(item.ruleSource)}</span>
                      <span>Version: ${esc(item.version)} &middot; Seed relationship marked as draft</span>
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

  // 5. Category filter pills below split screen
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
          // If category doesn't match, still keep visible or dim/hide
          card.style.opacity = '0.45';
        }
      });
    });
  });
}
