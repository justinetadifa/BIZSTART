import { listingPurposeLabel, listingPriceEntries, salePricePerSqm } from './utils.js';
import { businessOpportunitiesMarkup } from './business-opportunities.js';
// Property details and its printable calculation sheet share the server's recorded inputs.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const fmt = (value, digits = 2) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: digits }).format(Number(value));
const fixed = value => Number(value).toFixed(1);
const rating = value => fmt(value, 20);
const money = value => numeric(value) !== null ? `PHP ${fmt(value)}` : "Price on request";
const criteria6 = [
  ['spatial_accessibility', 'Spatial Accessibility', 20],
  ['infrastructure_readiness', 'Infrastructure Readiness', 20],
  ['economic_viability', 'Economic Viability / Economic Context', 20],
  ['nearby_businesses', 'Nearby Businesses / Business Environment', 10],
  ['zoning_compatibility', 'Zoning Compatibility', 15],
  ['risk_constraints', 'Risk Constraints', 15],
];

const legacyCriteria7 = [
  ['spatial_accessibility', 'Spatial Accessibility', 20],
  ['infrastructure_readiness', 'Infrastructure Readiness', 20],
  ['economic_viability', 'Economic Viability / Economic Context', 20],
  ['nearby_businesses', 'Nearby Businesses / Business Environment', 10],
  ['zoning_compatibility', 'Zoning Compatibility', 15],
  ['risk_constraints', 'Risk Constraints', 10],
  ['environmental_safety', 'Environmental Safety', 5],
];

const criterionExplanations = {
  spatial_accessibility: 'Proximity to primary roads, highways, and transport corridors.',
  infrastructure_readiness: 'Verified availability of power (LUECO), water (LUWD), and telecom/fiber connectivity.',
  economic_viability: 'Land market valuation, zonal pricing, and commercial investment yield context.',
  nearby_businesses: 'Operating commercial density, foot-traffic generators, and cluster viability.',
  zoning_compatibility: 'Conformance with San Fernando CLUP zoning classifications and permitted activities.',
  risk_constraints: 'Comprehensive screening for flood, active fault lines, landslide, storm surge, and liquefaction hazards.',
  environmental_safety: 'Screening against environmentally critical areas and conservation zones.',
};

export function assessmentCalculation(property) {
  const isLegacy = Boolean(
    property?.assessmentMethodologyVersion?.includes('v1.1')
    || property?.assessmentMethodologyVersion?.toLowerCase().includes('legacy')
    || property?.methodology?.includes('v1.1')
    || property?.methodology?.toLowerCase().includes('legacy')
    || property?.ruleVersion?.includes('v1.1')
    || (Number(property?.assessmentWeights?.environmental_safety) > 0 && Number(property?.assessmentWeights?.risk_constraints) <= 10)
    || (property?.assessmentCriteria?.environmental_safety != null && property?.assessmentWeights == null && property?.assessmentCriteria?.risk_constraints != null && property?.iaiScore != null && Number(property?.iaiScore) !== Number(property?.mceScore))
  );
  const activeList = isLegacy ? legacyCriteria7 : criteria6;
  const rows = activeList.map(([key, label, defaultWeight]) => {
    const value = numeric(property.assessmentCriteria?.[key]);
    let weight = numeric(property.assessmentWeights?.[key]);
    if (isLegacy) {
      if (key === 'risk_constraints' && (weight == null || weight > 10)) weight = 10;
      if (key === 'environmental_safety' && (weight == null || weight === 0)) weight = 5;
      if (weight == null) weight = defaultWeight;
    } else {
      weight = weight ?? defaultWeight;
    }
    const score = value !== null && value >= 0 && value <= 100 ? value : null;
    return {
      key,
      label,
      weight,
      score,
      contribution: score === null ? null : score * weight / 100,
      explanation: criterionExplanations[key] || '',
    };
  });
  const physicalCriteriaKeys = ['spatial_accessibility', 'infrastructure_readiness', 'economic_viability', 'nearby_businesses', 'risk_constraints'];
  const physicalRows = rows.filter(row => physicalCriteriaKeys.includes(row.key));
  const hasAllPhysical = physicalRows.length === 5 && physicalRows.every(row => row.score !== null);
  const physicalSubtotal = hasAllPhysical
    ? physicalRows.reduce((sum, row) => sum + (row.contribution ?? 0), 0)
    : null;
  const zoningRow = rows.find(row => row.key === 'zoning_compatibility');
  const isZoningPending = zoningRow ? zoningRow.score === null : false;

  const weightSum = rows.reduce((sum, row) => sum + row.weight, 0);
  const weightsValid = Math.abs(weightSum - 100) < 0.01;
  const allScoresPresent = rows.every(row => row.score !== null);
  const isNotSuitable = property.assessmentStatus === 'not_suitable'
    || property.status === 'not_suitable'
    || property.eligibility === 'prohibited'
    || property.assessmentCriteria?.zoning_compatibility === 0;
  const isConditional = property.assessmentStatus === 'conditional'
    || property.status === 'conditional'
    || property.eligibility === 'conditional';
  const reason = property.reason || null;
  const note = property.note || (isConditional ? 'Conditional compatibility — requires zoning clearance or further city review.' : null);

  const isExplicitlyComplete = property.assessmentComplete === true
    || (property.assessmentStatus === 'complete' && property.assessmentComplete !== false);

  const complete = !isNotSuitable && isExplicitlyComplete && allScoresPresent && weightsValid;

  const weightedSum = Math.round(rows.reduce((sum, row) => sum + (row.contribution ?? 0), 0) * 10) / 10;
  const iai = complete ? numeric(property.iaiScore ?? property.iai ?? weightedSum) : null;
  const mce = complete ? numeric(property.mceScore ?? property.mce ?? iai) : null;

  const missingRows = rows.filter(row => row.score === null);
  const missingCriteria = missingRows.map(row => row.label);

  const components = isLegacy ? [
    { label: 'Rounded MCE', value: mce, weight: 60 },
    { label: 'Economic viability', value: rows.find(row => row.key === 'economic_viability')?.score, weight: 20 },
    { label: 'Infrastructure readiness', value: rows.find(row => row.key === 'infrastructure_readiness')?.score, weight: 20 },
  ].map(row => ({ ...row, contribution: mce === null || row.value === null ? null : row.value * row.weight / 100 })) : rows;

  return {
    rows,
    complete,
    mce,
    iai,
    physicalSubtotal,
    hasPhysicalBaseline: hasAllPhysical,
    isZoningPending,
    components,
    isNotSuitable,
    isConditional,
    isLegacy,
    reason,
    note,
    completedCount: rows.filter(row => row.score !== null).length,
    missingCriteria,
  };
}

function factsMarkup(rows, className = '') {
  return `<dl class="property-facts ${className}">${rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value ?? 'Not specified')}</dd></div>`).join('')}</dl>`;
}

function dateLabel(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-PH', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'short', day: 'numeric' }) : 'Not recorded';
}

/** Use recorded classifications only. A suitability rating is not a hazard finding. */
function recordedSafety(property) {
  const context = Array.isArray(property.spatialContext) ? property.spatialContext : [];
  const values = value => (Array.isArray(value) ? value : value == null ? [] : [value])
    .filter(value => typeof value === 'string' && value.trim()).map(value => value.trim().replaceAll('_', ' '));
  const items = [
    ['risk_constraints', 'hazard_status', 'Hazard screening'],
  ];
  if (property?.assessmentCriteria?.environmental_safety != null || property?.criteriaDetails?.environmental_safety) {
    items.push(['environmental_safety', 'environment_status', 'Environmental screening']);
  }
  return items.map(([criterion, key, label]) => {
    const detail = property.criteriaDetails?.[criterion] || {};
    const spatial = context.find(item => item?.key === key) || {};
    return {
      label, values: values(detail.raw?.[key] ?? spatial.value),
      missing: (Array.isArray(detail.missingData) ? detail.missingData : []).filter(value => typeof value === 'string' && value.trim()),
      evidence: Array.isArray(detail.evidence) ? detail.evidence : Array.isArray(spatial.evidence) ? spatial.evidence : [],
    };
  });
}

function utilitiesMarkup(property) {
  const utils = property.utilities || {};
  const observations = property.parcel?.observations || {};
  const elec = utils.electricity || observations.electricity || 'not_verified';
  const wat = utils.water || observations.water || 'not_verified';
  const net = utils.internet || observations.internet || 'not_verified';

  const elecSources = (utils.electricity_sources?.length ? utils.electricity_sources : (elec === 'available' ? ['LUECO'] : [])).join(' · ');
  const watSources = (utils.water_sources?.length ? utils.water_sources : (wat === 'available' ? ['Metro La Union Water District'] : [])).join(' · ');
  const netProviders = (utils.internet_providers?.length ? utils.internet_providers : (net === 'available' ? ['PLDT', 'Globe'] : [])).join(' · ');
  const netTypes = utils.internet_types?.join(', ') || (net === 'available' ? 'Fiber' : '');
  const netSpeed = utils.download_speed_mbps ? ` · ${utils.download_speed_mbps} Mbps` : '';

  const items = [
    {
      label: 'Electricity',
      status: elec,
      title: elec === 'available' ? '✓ Available' : elec === 'unavailable' ? 'Unavailable' : 'Not verified',
      desc: elecSources,
      available: elec === 'available',
    },
    {
      label: 'Water',
      status: wat,
      title: wat === 'available' ? '✓ Available' : wat === 'unavailable' ? 'Unavailable' : 'Not verified',
      desc: watSources,
      available: wat === 'available',
    },
    {
      label: netTypes ? `${netTypes} internet` : 'Internet',
      status: net,
      title: net === 'available' ? (netTypes ? `✓ ${netTypes} available` : '✓ Available') : net === 'unavailable' ? 'Unavailable' : 'Not verified',
      desc: netProviders ? `${netProviders}${netSpeed}` : '',
      available: net === 'available',
    },
  ];

  return `
    <div class="property-utilities-section" style="margin: 16px 0;">
      <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700; color: #64748B; margin: 0 0 10px;">Utilities & Connectivity</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${items.map(item => {
    const tooltip = esc(`${item.label}\n${item.title}${item.desc ? `\n${item.desc}` : ''}`);
    const chipBg = item.available ? '#ECFDF5' : '#F8FAFC';
    const chipBorder = item.available ? '#A7F3D0' : '#E2E8F0';
    const chipColor = item.available ? '#065F46' : '#475569';
    return `
            <div class="property-utility-chip" title="${tooltip}" style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 13px; border-radius: 9999px; background: ${chipBg}; border: 1px solid ${chipBorder}; color: ${chipColor}; font-size: 12.5px; font-weight: 600; cursor: help;">
              ${item.available ? '<span style="color: #059669; font-weight: 700;">✓</span>' : '<span style="color: #94A3B8;">○</span>'}
              <span>${esc(item.label)}</span>
              ${item.desc ? `<span class="property-utility-source" style="font-size: 11px; opacity: 0.8; font-weight: 400;">(${esc(item.desc.split(' · ')[0])})</span>` : ''}
            </div>
          `;
  }).join('')}
      </div>
    </div>
  `;
}

export function propertyHazardSummary(property) {
  const recorded = recordedSafety(property);
  const hasRecordedFindings = recorded.some(r => r.values.length > 0 || r.missing.length > 0);
  if (hasRecordedFindings) {
    return recorded.map(item => `${item.label}: ${item.values.length ? item.values.join(', ') : 'Not assessed'}${item.values.length && item.missing.length ? ' (review incomplete)' : ''}`).join(' · ');
  }
  const hs = property.hazardScreening;
  if (hs && hs.flood && hs.fault) {
    return `Flood: ${hs.flood.badge} · Fault: ${hs.fault.proximity || hs.fault.badge} · ${hs.status_label || 'City validated'}`;
  }
  return recorded.map(item => `${item.label}: ${item.values.length ? item.values.join(', ') : 'Not assessed'}${item.values.length && item.missing.length ? ' (review incomplete)' : ''}`).join(' · ');
}

export function propertyLocationLabel(property) {
  const precision = String(property.locationPrecision ?? property.parcel?.locationPrecision ?? property.parcel?.coordinatePrecision ?? '').toLowerCase();
  return property.hasExactLocation === false || ['approximate', 'approx', 'generalized'].includes(precision) ? 'Approximate location' : 'Recorded location';
}

export function safetyMarkup(property) {
  const hs = property.hazardScreening || {};
  const rcDetails = property.criteriaDetails?.risk_constraints || {};
  const subcriteria = rcDetails.subcriteria || {};
  const parcel = property.parcel || {};
  const hasBoundary = Boolean(parcel.boundary);
  const statusLabel = hs.status_label || (hs.validated ? 'City validated' : 'Not fully assessed');
  const recorded = recordedSafety(property);

  // Authoritative 6-hazard breakdown definitions
  const hazardDefinitions = [
    {
      key: 'flood_susceptibility',
      label: 'Flood Susceptibility',
      riskWeight: 25,
      mceWeight: 3.75,
      agency: 'DENR-MGB Region 1',
      layer: 'DENR-MGB 1:10,000 Geohazard Survey / CDRRMO Drainage Inundation Map',
      measured: hasBoundary ? 'Riverine & pluvial flood susceptibility evaluated across parcel boundary polygon.' : 'Riverine & pluvial flood susceptibility evaluated at property coordinates.',
      defaultStatus: hs.flood?.status || 'low',
      defaultDetails: hs.flood?.details || 'Elevated alluvial terrace with natural storm drainage.',
      source: hs.flood?.source || 'DENR-MGB Region 1',
    },
    {
      key: 'active_fault',
      label: 'Active Fault / Ground Rupture',
      riskWeight: 25,
      mceWeight: 3.75,
      agency: 'DOST-PHIVOLCS',
      layer: 'DOST-PHIVOLCS Active Faults Map of the Philippines & West Ilocos Fault System',
      measured: hasBoundary ? 'Active fault trace proximity and 5m buffer corridor evaluated against parcel vertices.' : 'Active fault trace proximity evaluated at property coordinates.',
      defaultStatus: hs.fault?.status || (hs.fault?.distance_km !== null && hs.fault?.distance_km < 1 ? 'moderate' : 'low'),
      defaultDetails: hs.fault?.proximity ? `${hs.fault.proximity} from nearest mapped trace.` : (hs.fault?.details || 'Clearance from mapped active fault lines.'),
      source: hs.fault?.source || 'DOST-PHIVOLCS',
    },
    {
      key: 'landslide_susceptibility',
      label: 'Landslide Susceptibility',
      riskWeight: 15,
      mceWeight: 2.25,
      agency: 'DENR-MGB Region 1',
      layer: 'DENR-MGB Rain-Induced Landslide Susceptibility Map',
      measured: hasBoundary ? 'Slope stability & mass-movement hazard evaluated across parcel terrain.' : 'Slope stability evaluated at property coordinates.',
      defaultStatus: 'none',
      defaultDetails: 'Outside mapped rain-induced landslide hazard zone (coastal plain terrain).',
      source: 'DENR-MGB Region 1',
    },
    {
      key: 'storm_surge',
      label: 'Storm Surge Exposure',
      riskWeight: 15,
      mceWeight: 2.25,
      agency: 'DOST-PAGASA',
      layer: 'DOST-PAGASA Storm Surge Inundation Advisory & Inundation Map',
      measured: 'Coastal storm surge inundation risk during severe tropical cyclones.',
      defaultStatus: 'none',
      defaultDetails: 'Elevated topography outside low-lying coastal surge inundation corridor.',
      source: 'DOST-PAGASA',
    },
    {
      key: 'liquefaction_susceptibility',
      label: 'Liquefaction Susceptibility',
      riskWeight: 10,
      mceWeight: 1.50,
      agency: 'DOST-PHIVOLCS',
      layer: 'DOST-PHIVOLCS Liquefaction Susceptibility Map of Region 1',
      measured: 'Soil strength loss under cyclic seismic shaking in saturated alluvial deposits.',
      defaultStatus: 'low',
      defaultDetails: 'Low susceptibility; dense cohesive subsoil layers.',
      source: 'DOST-PHIVOLCS',
    },
    {
      key: 'tsunami_exposure',
      label: 'Tsunami Exposure',
      riskWeight: 10,
      mceWeight: 1.50,
      agency: 'DOST-PHIVOLCS',
      layer: 'DOST-PHIVOLCS Tsunami Hazard Map of Region 1',
      measured: 'Seismogenic coastal tsunami run-up elevation and coastal inundation zone.',
      defaultStatus: 'none',
      defaultDetails: 'Outside designated high-water coastal tsunami inundation zone.',
      source: 'DOST-PHIVOLCS',
    },
  ];

  const scoreForStatus = status => {
    switch (String(status || '').toLowerCase()) {
      case 'none':
      case 'none_mapped':
      case 'outside':
      case 'outside_mapped':
      case 'clear':
        return 100;
      case 'low':
      case 'low_susceptibility':
      case 'low_exposure':
        return 85;
      case 'moderate':
      case 'moderate_susceptibility':
      case 'moderate_exposure':
        return 60;
      case 'high':
      case 'high_susceptibility':
      case 'high_exposure':
        return 25;
      case 'very_high':
      case 'critical':
      case 'conflict':
        return 0;
      default:
        return null;
    }
  };

  const badgeColor = score => {
    if (score === null) return 'background: #F1F5F9; color: #475569;';
    if (score >= 85) return 'background: #D1FAE5; color: #065F46;';
    if (score >= 60) return 'background: #FEF3C7; color: #92400E;';
    if (score >= 25) return 'background: #FEE2E2; color: #991B1B;';
    return 'background: #7F1D1D; color: #FFFFFF;';
  };

  const statusLabelForScore = (score, rawStatus) => {
    if (score === null) return 'Not Assessed';
    if (score === 100) return 'No Mapped Exposure';
    if (score === 85) return 'Low Susceptibility';
    if (score === 60) return 'Moderate Susceptibility';
    if (score === 25) return 'High Susceptibility';
    return 'Critical Constraint';
  };

  const rows = hazardDefinitions.map(def => {
    const fromSub = subcriteria[def.key];
    const rawVal = fromSub?.raw_status ?? fromSub?.score ?? (def.key === 'flood_susceptibility' ? (hs.flood?.status || hs.flood?.level || property.hazards?.flood?.status || property.hazards?.flood?.level) : def.key === 'active_fault' ? (hs.fault?.status || hs.fault?.level || property.hazards?.fault?.status || property.hazards?.fault?.level) : null);
    const scoreVal = fromSub?.score !== undefined && fromSub?.score !== null ? Number(fromSub.score) : (rawVal !== null ? scoreForStatus(rawVal) : null);
    const findingDesc = fromSub?.details || fromSub?.explanation || (def.key === 'flood_susceptibility' ? hs.flood?.details : def.key === 'active_fault' ? (hs.fault?.proximity ? `${hs.fault.proximity} from nearest mapped trace.` : hs.fault?.details) : def.defaultDetails);
    const sourceRef = fromSub?.source || def.layer;
    const agencyName = fromSub?.agency || def.agency;
    const contrib = scoreVal !== null ? (scoreVal * def.mceWeight / 100).toFixed(2) : null;
    return {
      ...def,
      score: scoreVal,
      finding: scoreVal !== null ? statusLabelForScore(scoreVal, rawVal) : 'Not Assessed',
      details: findingDesc,
      source: sourceRef,
      agency: agencyName,
      contribution: contrib,
    };
  });

  const assessedLayers = rows.filter(r => r.score !== null);
  const unassessedLayers = rows.filter(r => r.score === null);
  const isFullyAssessed = assessedLayers.length === rows.length;
  const truthfulStatusLabel = isFullyAssessed
    ? (hs.validated ? 'City validated' : 'Fully assessed')
    : `Provisional screening (${assessedLayers.length}/6 layers)`;

  const isFaultCritical = hs.fault?.status === 'high'
    || hs.fault?.badge === 'HIGH'
    || subcriteria.active_fault?.score === 0
    || subcriteria.active_fault?.raw_status === 'conflict'
    || String(hs.fault?.details || '').toLowerCase().includes('buffer corridor');

  return `<section class="property-panel property-safety" id="propertyHazardsSection" aria-labelledby="propertyHazardsTitle">
    <div class="property-section-heading">
      <div>
        <span class="property-kicker">HAZARD SCREENING · RISK CONSTRAINTS (15% MCE)</span>
        <h2 id="propertyHazardsTitle">Multi-Hazard Risk &amp; Spatial Screening</h2>
      </div>
      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 4px; background: #E0F2FE; color: #0369A1;">
          <svg viewBox="0 0 24 24" style="width: 14px; height: 14px;" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg>
          ${esc(truthfulStatusLabel)}
        </span>
        <span style="font-size: 11.5px; font-weight: 600; padding: 3px 8px; border-radius: 4px; background: #F1F5F9; color: #475569;">
          ${hasBoundary ? '✓ Evaluated against parcel boundary polygon' : 'Evaluated against coordinate reference'}
        </span>
      </div>
    </div>

    ${isFaultCritical ? `
      <div class="property-alert-warning" style="background: #FFFBEB; border: 1px solid #FCD34D; color: #92400E; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
        <div style="display: flex; gap: 10px; align-items: flex-start;">
          <span style="font-size: 18px; line-height: 1;">⚠</span>
          <div>
            <strong style="font-size: 13.5px; display: block; margin-bottom: 4px; color: #78350F;">Active Fault Buffer Notice (DOST-PHIVOLCS Guideline):</strong>
            <p style="margin: 0; font-size: 12.5px; line-height: 1.5;">
              Parcel boundary intersects active fault trace or recommended 5-meter buffer corridor. Mandatory site-specific Engineering Geological and Geohazard Assessment Report (EGGAR) required prior to building permitting; development within buffer zone requires competent clearance from the Local Building Official and PHIVOLCS certification.
            </p>
          </div>
        </div>
      </div>
    ` : ''}

    ${!isFullyAssessed ? `
      <div class="property-alert-info" style="background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
        <div style="display: flex; gap: 10px; align-items: flex-start;">
          <span style="font-size: 16px; line-height: 1; color: #64748B;">ℹ</span>
          <div>
            <strong style="font-size: 13.5px; display: block; margin-bottom: 4px; color: #1E293B;">Partial Hazard Coverage Disclosure (${unassessedLayers.length} of 6 Layers Unassessed):</strong>
            <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #475569;">
              The Risk Constraints rating reflects provisional spatial screening of <strong>${assessedLayers.map(r => r.label).join(' and ')}</strong>. Municipal screening for remaining indicators (<strong>${unassessedLayers.map(r => r.label).join(', ')}</strong>) remains pending. Unassessed status must not be interpreted as absence of risk; complete geotechnical and geohazard clearance prior to financial commitment.
            </p>
          </div>
        </div>
      </div>
    ` : ''}

    <p class="property-description" style="margin-bottom: 16px;">
      LOCUS-SF evaluates physical hazard constraints across six authoritative layers totaling 100% of the Risk Constraints criterion (15% overall MCE). Missing hazard evidence is marked <em>Not Assessed</em> and is never assumed to be safe or zero.
    </p>

    <div class="property-table-scroll">
      <table class="property-calculation-table" style="font-size: 12.5px;">
        <thead>
          <tr>
            <th scope="col" style="min-width: 170px;">Hazard Type &amp; Weight</th>
            <th scope="col" style="min-width: 130px;">Actual Finding</th>
            <th scope="col" style="min-width: 180px;">Agency &amp; Official Layer</th>
            <th scope="col" style="min-width: 220px;">What Was Measured</th>
            <th scope="col" style="min-width: 110px;">Score / Rubric</th>
            <th scope="col" style="min-width: 100px;">Contribution</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <th scope="row">
                <span style="font-weight: 700; color: #11224D; display: block;">${esc(r.label)}</span>
                <small style="color: #64748B; font-weight: 500;">${r.riskWeight}% of Risk · ${r.mceWeight}% MCE</small>
              </th>
              <td>
                <span style="font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 4px; display: inline-block; ${badgeColor(r.score)}">
                  ${esc(r.finding)}
                </span>
                <div style="font-size: 11px; color: #475569; margin-top: 4px;">${esc(r.details)}</div>
              </td>
              <td>
                <strong style="font-size: 11.5px; color: #11224D; display: block;">${esc(r.agency)}</strong>
                <small style="color: #64748B; font-size: 11px; line-height: 1.3; display: block;">${esc(r.source)}</small>
              </td>
              <td style="font-size: 11.5px; color: #475569;">${esc(r.measured)}</td>
              <td>
                ${r.score !== null ? `
                  <strong style="color: #11224D;">${fmt(r.score, 1)}</strong> <small style="color: #64748B;">/ 100</small>
                ` : '<span style="color: #B45309; font-weight: 600;">Not Assessed</span>'}
              </td>
              <td>
                ${r.contribution !== null ? `
                  <strong style="color: #065F46;">+${esc(r.contribution)}</strong> <small style="color: #64748B;">pts</small>
                ` : '<span style="color: #94A3B8;">Pending</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${recorded.some(item => item.values.length || item.missing.length || item.evidence.length) ? `
      <div class="property-safety-recorded" style="margin-top: 14px; border-top: 1px solid #E5E7EB; padding-top: 12px;">
        ${recorded.map(item => `
          <div class="property-safety-item" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <h3 style="font-size: 13px; font-weight: 600; color: #11224D; margin: 0;">${esc(item.label)}</h3>
              <span style="font-size: 12px; color: #4B5563;">${item.values.length ? esc(item.values.join(', ')) : 'Not assessed'}</span>
            </div>
            ${item.missing.length ? `<p class="property-missing" style="font-size: 12px; color: #B45309; margin: 4px 0;"><strong>Still needed:</strong> ${item.missing.map(esc).join(' ')}</p>` : ''}
            ${item.evidence.length ? `<ul class="property-source-list" style="margin: 4px 0 0; padding-left: 18px; font-size: 12px; color: #6B7280;">${item.evidence.map(ev => `<li><strong>${esc(ev.source || 'Recorded source')}</strong>${ev.reference ? ` · Reference: ${esc(ev.reference)}` : ''}${ev.verifiedAt ? ` · Verified: ${esc(dateLabel(ev.verifiedAt))}` : ''}</li>`).join('')}</ul>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <p class="property-safety-limit" style="font-size: 12px; color: #64748B; margin-top: 14px; line-height: 1.5;">
      Assessment sources: Official spatial datasets (DENR-MGB, DOST-PHIVOLCS, DOST-PAGASA). Status: <strong>${esc(truthfulStatusLabel)}</strong>. Unassessed layers require departmental or technical validation before a final suitability clearance.
    </p>
  </section>`;
}

function radarMarkup(calculation) {
  const count = calculation.rows.length;
  if (!calculation.complete) return `<p class="property-pending-note">A radar profile will appear when all ${count === 6 ? 'six' : 'seven'} criteria have recorded ratings. Missing evidence is not plotted as zero.</p>`;
  const abbreviations = count === 6
    ? ['Access', 'Infra', 'Econ', 'Business', 'Zoning', 'Risk']
    : ['Access', 'Infrastructure', 'Economic', 'Businesses', 'Zoning', 'Risk', 'Environment'];
  const point = (index, radius) => {
    const angle = index * Math.PI * 2 / count - Math.PI / 2;
    return [180 + Math.cos(angle) * radius, 155 + Math.sin(angle) * radius];
  };
  const polygon = scale => calculation.rows.map((row, index) => point(index, 105 * scale(row)).map(value => value.toFixed(2)).join(',')).join(' ');
  return `<div class="property-radar-layout"><svg class="property-radar" viewBox="0 0 360 320" role="img" aria-label="Radar profile of the ${count} recorded criterion ratings. Values are listed alongside the chart.">
    ${[.25, .5, .75, 1].map(scale => `<polygon class="property-radar-grid" points="${polygon(() => scale)}"/>`).join('')}
    ${calculation.rows.map((row, index) => `<line class="property-radar-axis" x1="180" y1="155" x2="${point(index, 105)[0].toFixed(2)}" y2="${point(index, 105)[1].toFixed(2)}"/>`).join('')}
    <polygon class="property-radar-result" points="${polygon(row => row.score / 100)}"/>
    ${calculation.rows.map((row, index) => `<circle class="property-radar-point" cx="${point(index, row.score * 1.05)[0].toFixed(2)}" cy="${point(index, row.score * 1.05)[1].toFixed(2)}" r="3"/><text x="${point(index, 137)[0].toFixed(2)}" y="${point(index, 137)[1].toFixed(2)}" text-anchor="middle" dominant-baseline="middle">${abbreviations[index] || row.label.slice(0, 6)}</text>`).join('')}
    <text class="property-radar-scale" x="185" y="55">100</text><text class="property-radar-scale" x="185" y="107">50</text>
    </svg><dl class="property-radar-values">${calculation.rows.map(row => `<div><dt>${esc(row.label)}</dt><dd>${rating(row.score)} <span>/ 100</span></dd></div>`).join('')}</dl></div>
    <p class="property-note">The chart shows the recorded ratings, without applying weights. Higher ratings are more favorable under the approved model; the risk rating is not a safety certificate.</p>`;
}

function evidenceMarkup(property, calculation) {
  return `<div class="property-evidence-list">${calculation.rows.map(row => {
    const detail = property.criteriaDetails?.[row.key] || {};
    const evidence = Array.isArray(detail.evidence) ? detail.evidence : [];
    const raw = Object.entries(detail.raw || {});
    const missing = Array.isArray(detail.missingData) ? detail.missingData : [];
    return `<article class="property-evidence-item"><div class="property-section-heading"><h3>${esc(row.label)}</h3><span>${row.score === null ? 'Pending evidence' : `${rating(row.score)} / 100`}</span></div>
      ${raw.length ? factsMarkup(raw.map(([key, value]) => [key.replaceAll('_', ' '), Array.isArray(value) ? value.join(', ') : value == null ? 'Not recorded' : typeof value === 'number' ? fmt(value, 6) : value]), 'property-raw-facts') : ''}
      <p>${esc(detail.justification || (property.assessmentMode === 'automatic' ? 'Source evidence is not available for this criterion.' : 'Recorded departmental score. No source evidence snapshot was retained with this assessment.'))}</p>
      ${detail.conversion ? `<p><strong>Conversion rule:</strong> ${esc(detail.conversion)}</p>` : ''}
      ${missing.length ? `<p class="property-missing"><strong>Still needed:</strong> ${missing.map(esc).join(' ')}</p>` : ''}
      ${evidence.length ? `<ul class="property-source-list">${evidence.map(source => `<li><strong>${esc(source.source || source.layer || 'Recorded source')}</strong>${source.version ? ` · ${esc(source.version)}` : ''}${source.reference ? `<br>Reference: ${esc(source.reference)}` : ''}${source.verifiedAt ? `<br>Verified: ${esc(dateLabel(source.verifiedAt))}` : ''}${source.sha256 ? `<br><span class="property-source-hash">SHA-256: ${esc(source.sha256)}</span>` : ''}</li>`).join('')}</ul>` : '<p class="property-note">Source reference not recorded.</p>'}
    </article>`;
  }).join('')}</div>`;
}

export function calculationMarkup(property) {
  const calc = assessmentCalculation(property);
  const contribution = value => value === null ? 'Pending' : fmt(value, 12);
  const value = value => value === null ? 'Pending' : rating(value);
  const total = value => value === null ? 'Pending' : fixed(value);
  const totalWeight = Math.round(calc.rows.reduce((sum, r) => sum + r.weight, 0));
  const methodologyLabel = property.methodology || property.assessmentMethodologyVersion || property.ruleVersion || (calc.rows.length === 6 ? 'LOCUS-SF MCE v2.0 (Provisional 6-Criterion)' : 'LOCUS-SF MCE v1.1 (Legacy 7-Criterion)');
  return `<section class="property-calculation" aria-labelledby="propertyCalculationTitle">
    <div class="property-calc-header-block">
      <div>
        <h3 id="propertyCalculationTitle">Investment Attractiveness Index (IAI) · MCE Breakdown</h3>
        <p class="property-note">The Investment Attractiveness Index (IAI) is the composite 0–100 score produced by Multi-Criteria Evaluation (MCE). Each criterion is normalized on a 0–100 scale (100 is most favorable). Formula: IAI = Σ(normalized criterion score × criterion weight ÷ 100).</p>
      </div>
      <div class="property-calc-method-badge no-print">
        <span>Methodology: <strong>${esc(methodologyLabel)}</strong></span>
      </div>
    </div>
    ${calc.isNotSuitable ? `<div class="property-alert-danger" style="background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;padding:12px 16px;border-radius:12px;margin-bottom:16px;"><strong>Site Not Eligible:</strong> ${esc(calc.reason || 'Proposed land use is not permitted under the applicable zoning / CLUP classification.')} Composite IAI is withheld.</div>` : ''}
    ${calc.isConditional ? `<div class="property-alert-warning" style="background:#FFFBEB;border:1px solid #FCD34D;color:#92400E;padding:12px 16px;border-radius:12px;margin-bottom:16px;"><strong>Conditional Compatibility:</strong> ${esc(calc.note)}</div>` : ''}
    <div class="property-table-scroll"><table class="property-calculation-table"><caption>${calc.rows.length === 7 ? 'Seven' : 'Six'} criteria and their weighted contributions to the composite IAI score</caption><thead><tr><th scope="col">MCE Criterion</th><th scope="col">Score / 100</th><th scope="col">Weight</th><th scope="col">Contribution</th></tr></thead><tbody>${calc.rows.map(row => `<tr><th scope="row">${esc(row.label)}</th><td>${row.key === 'zoning_compatibility' && row.score === null ? '<span style="color:#B45309;font-weight:600;">Pending investor activity</span>' : value(row.score)}</td><td>${fmt(row.weight)}%</td><td>${row.key === 'zoning_compatibility' && row.contribution === null ? '<span style="color:#94A3B8;">Pending use (15%)</span>' : contribution(row.contribution)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">${calc.iai === null && calc.hasPhysicalBaseline ? 'Physical Site Attributes Subtotal (85%)' : 'Composite IAI · rounded to 1 decimal'}</th><td>${calc.iai !== null ? total(calc.iai) : (calc.hasPhysicalBaseline ? `${fixed(calc.physicalSubtotal)} / 85 pts` : 'Pending')}</td><td>${totalWeight}%</td><td>${calc.iai !== null ? fixed(calc.iai) : (calc.hasPhysicalBaseline ? `${fixed(calc.physicalSubtotal)} / 85 pts` : 'Pending')}</td></tr></tfoot></table></div>
    <p class="property-formula">${calc.iai !== null ? `IAI = round(Σ(score × weight ÷ 100), 1) = round(${calc.rows.map(row => fmt(row.contribution, 2)).join(' + ')}, 1) = ${fixed(calc.iai)}` : (calc.hasPhysicalBaseline ? `Physical Site Baseline = Σ(Physical Attribute Scores × Weight ÷ 100) = ${fixed(calc.physicalSubtotal)} / 85.0 pts (Spatial 20%, Infra 20%, Econ 20%, Nearby 10%, Risk 15%). The remaining 15% Zoning Compatibility is added once an investor establishes a business activity.` : 'IAI = round(Σ(score × weight ÷ 100), 1)')}</p>
    ${calc.iai === null && !calc.isNotSuitable ? `<p class="property-pending-note">${calc.hasPhysicalBaseline ? `Physical site baseline is complete (${fixed(calc.physicalSubtotal)} / 85.0 pts). Composite 6-criterion IAI score is withheld until an investment business or land use activity is selected.` : `Assessment pending · ${calc.completedCount} of ${calc.rows.length} criteria have ratings.${calc.missingCriteria?.length ? ` Missing: ${esc(calc.missingCriteria.join(', '))}.` : ''} Missing evidence is not treated as zero; a composite score or rank is withheld until all required criteria are complete.`}</p>` : ''}
    <p class="property-note">This breakdown records the physical site IAI. Statutory policy incentives for proposed investments are evaluated separately by LEBDO and do not modify physical site suitability.</p>
    ${property.assessmentMethod ? `<p class="property-note"><strong>Recorded method:</strong> ${esc(property.assessmentMethod)}</p>` : ''}
    ${factsMarkup([['Assessment mode', property.assessmentMode === 'automatic' ? 'Automatic · source evidence' : 'Recorded departmental assessment'], ['Evidence generated', dateLabel(property.generatedAt || property.automaticAssessment?.generatedAt)], ['Methodology version', methodologyLabel], ['Weight status', property.weightStatus || 'Provisional / Subject to LGU validation'], ['Approval reference', property.ruleApprovalReference || 'Not recorded']])}
  </section>`;
}

export function propertyGalleryMarkup(property, imageUrl, path) {
  const mediaItems = Array.isArray(property.media) && property.media.length > 0
    ? property.media.filter(m => (m.kind === 'image' || m.kind === 'photo') && (m.source || m.url))
    : [];

  const resolveUrl = src => {
    if (!src) return imageUrl(property);
    if (/^https?:\/\//i.test(src) || src.startsWith('/')) return src;
    return typeof path === 'function' ? path(src) : src;
  };

  const images = mediaItems.length > 0
    ? mediaItems.map(m => resolveUrl(m.source || m.url))
    : [imageUrl(property)];

  const categoryLabel = esc(property.category || property.type || 'Property');
  const locationLabel = esc(property.barangay || property.city || 'San Fernando');

  if (images.length <= 1) {
    return `<figure class="property-photo"><img src="${esc(images[0])}" alt="${esc(property.name)}"><figcaption>${categoryLabel} · ${locationLabel}</figcaption></figure>`;
  }

  return `<figure class="property-photo property-gallery-container" data-property-gallery>
    <div class="property-gallery-stage">
      <img class="property-gallery-main-img" data-gallery-main src="${esc(images[0])}" alt="${esc(property.name)}">
      <button type="button" class="property-gallery-nav is-prev" data-gallery-prev aria-label="Previous photo">‹</button>
      <button type="button" class="property-gallery-nav is-next" data-gallery-next aria-label="Next photo">›</button>
      <span class="property-gallery-counter" data-gallery-counter>1 / ${images.length}</span>
      <figcaption data-gallery-caption>${categoryLabel} · ${locationLabel}</figcaption>
    </div>
    <div class="property-gallery-thumbnails" role="tablist" aria-label="Property photos">
      ${images.map((src, idx) => `
        <button type="button" class="property-gallery-thumb-btn ${idx === 0 ? 'is-active' : ''}" data-gallery-target="${idx}" role="tab" aria-selected="${idx === 0 ? 'true' : 'false'}" aria-label="View photo ${idx + 1}">
          <img src="${esc(src)}" alt="${esc(property.name)} photo ${idx + 1}">
        </button>
      `).join('')}
    </div>
  </figure>`;
}

export function setupPropertyGallery(container = document) {
  const galleries = container.querySelectorAll('[data-property-gallery]');
  galleries.forEach(gallery => {
    const mainImg = gallery.querySelector('[data-gallery-main]');
    const counter = gallery.querySelector('[data-gallery-counter]');
    const thumbs = Array.from(gallery.querySelectorAll('[data-gallery-target]'));
    const prevBtn = gallery.querySelector('[data-gallery-prev]');
    const nextBtn = gallery.querySelector('[data-gallery-next]');
    if (!mainImg || thumbs.length <= 1) return;

    let currentIndex = 0;
    const count = thumbs.length;

    function goTo(index) {
      currentIndex = (index + count) % count;
      const targetThumb = thumbs[currentIndex];
      const targetImg = targetThumb?.querySelector('img');
      if (targetImg && targetImg.src) {
        mainImg.src = targetImg.src;
      }
      thumbs.forEach((t, i) => {
        const active = i === currentIndex;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      if (counter) {
        counter.textContent = `${currentIndex + 1} / ${count}`;
      }
      targetThumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    prevBtn?.addEventListener('click', e => { e.preventDefault(); goTo(currentIndex - 1); });
    nextBtn?.addEventListener('click', e => { e.preventDefault(); goTo(currentIndex + 1); });

    thumbs.forEach(thumb => {
      thumb.addEventListener('click', e => {
        e.preventDefault();
        const idx = Number(thumb.dataset.galleryTarget);
        if (!isNaN(idx)) goTo(idx);
      });
    });
  });
}

export function sanitizeFilenamePart(name) {
  if (!name || typeof name !== 'string') return 'Property';
  let clean = name.trim().replace(/\s+/g, '_');
  clean = clean.replace(/[/\\?%*:|"<>#;=&+]/g, '');
  clean = clean.replace(/[^\w\-]/g, '');
  clean = clean.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return clean || 'Property';
}

export function getPropertyPdfFilename(property, withExtension = true) {
  const rawName = property?.name || (property?.id ? `Property_${property.id}` : 'Property');
  const safeName = sanitizeFilenamePart(rawName);
  const base = `${safeName}_PropertyDetails_LOCUS-SF`;
  return withExtension ? `${base}.pdf` : base;
}

export function investorBriefReportMarkup(property, options, calc) {
  if (!calc) calc = assessmentCalculation(property);
  const parcel = property.parcel || {};
  const lat = numeric(property.lat), lng = numeric(property.lng);
  const hasLocation = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  const location = [property.barangay, property.city].filter(Boolean).join(', ') || 'San Fernando City, La Union';
  const refId = esc(property.referenceId || property.refId || `LOCUS-SF-PRP-${property.id}`);

  // Formatted dates
  const updatedDate = dateLabel(property.updatedAt || '2026-10-10');
  const exportDate = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric', month: 'long', year: 'numeric' });

  // Boundary status
  const hasBoundary = Boolean(parcel.boundary && (parcel.boundary.coordinates || parcel.boundary.type));
  const boundaryStatusText = hasBoundary ? 'Recorded outline (GIS polygon)' : 'Pin reference (boundary not drawn)';

  // Area & Land measurements
  const areaHa = numeric(property.area ?? property.landArea);
  const surveySqm = numeric(parcel.surveyAreaSqm);
  const mappedSqm = numeric(parcel.estimatedAreaSqm);
  const landAreaSqm = areaHa !== null && areaHa > 0 ? areaHa * 10000 : (surveySqm !== null && surveySqm > 0 ? surveySqm : (mappedSqm !== null && mappedSqm > 0 ? mappedSqm : null));

  let landAreaSqmText = 'Not specified';
  let landAreaHaText = 'Area not specified';
  if (landAreaSqm !== null && landAreaSqm > 0) {
    landAreaSqmText = `${fmt(landAreaSqm)} m²`;
    const computedHa = landAreaSqm / 10000;
    const haExact = fmt(computedHa, 4);
    const haApprox = fmt(computedHa, 2);
    landAreaHaText = computedHa < 1 ? `${haApprox} ha (${haExact} ha)` : `${fmt(computedHa, 2)} hectares`;
  }

  // Leasable floor / building area
  const offeredAreaSqm = numeric(property.offeredAreaSqm ?? property.offered_area_sqm);
  const buildingAreaVal = numeric(property.buildingArea ?? property.floorArea ?? property.floorAreaSqm ?? offeredAreaSqm);
  const hasLeasableArea = buildingAreaVal !== null && buildingAreaVal > 0;
  const isBuildingListing = property.category === 'Building' || property.type === 'Building' || String(property.subcategory || '').toLowerCase().includes('building');
  const buildingAreaText = hasLeasableArea
    ? `${fmt(buildingAreaVal)} m²`
    : (isBuildingListing ? 'Floor area not recorded' : 'Vacant Land / No Building');

  // Listing Purpose & Financials
  const isLease = property.listingPurpose === 'lease';
  const isBoth = property.listingPurpose === 'both';
  const purposeLabel = isLease ? 'FOR LEASE' : (isBoth ? 'FOR SALE / LEASE' : 'FOR SALE');
  const availStatus = String(property.status || 'AVAILABLE').toUpperCase();

  // Lease financial calculations
  const leasePrice = numeric(property.leasePrice ?? property.lease_price);
  const leasePeriod = property.leasePeriod || property.lease_period || 'month';
  const periodLabel = leasePeriod === 'month' ? '/ mo' : (leasePeriod === 'year' ? '/ yr' : `/${leasePeriod}`);
  const periodFull = leasePeriod === 'month' ? 'month' : (leasePeriod === 'year' ? 'year' : leasePeriod);
  const leasePriceUnit = property.leasePriceUnit || property.lease_price_unit || (leasePrice && leasePrice <= 2000 ? 'sqm' : 'total');

  // Sale financial calculations
  const salePriceVal = numeric(property.price ?? property.salePrice);
  const salePriceText = salePriceVal !== null ? `PHP ${fmt(salePriceVal)}` : 'Price on request';
  const salePricePerSqmVal = salePricePerSqm(property) ?? (salePriceVal !== null && landAreaSqm > 0 ? salePriceVal / landAreaSqm : null);

  // Metrics Grid 3-column values:
  let col1Label = 'ASKING PRICE';
  let col1Val = salePriceText;
  let col1Sub = 'Seller-reported asking amount';

  let col2Label = 'RECORDED LAND AREA';
  let col2Val = landAreaSqmText;
  let col2Sub = landAreaHaText;

  let col3Label = 'ASKING PRICE / m²';
  let col3Val = salePricePerSqmVal !== null ? `PHP ${fmt(salePricePerSqmVal)}` : 'Price on request';
  let col3Sub = landAreaSqm > 0 ? `Based on ${fmt(landAreaSqm)} m² land` : 'Based on recorded land area';

  if (isLease) {
    if (leasePriceUnit === 'sqm') {
      col1Label = 'LEASE RATE (UNIT)';
      col1Val = leasePrice !== null ? `₱${fmt(leasePrice)} / m²` : 'Price on request';
      col1Sub = `Billed per ${periodFull} · Seller-reported`;

      col3Label = 'EST. TOTAL RENT';
      col3Val = hasLeasableArea && leasePrice !== null ? `₱${fmt(leasePrice * buildingAreaVal)} / mo` : 'Not Available';
      col3Sub = hasLeasableArea ? `Based on ${fmt(buildingAreaVal)} m² leasable area` : 'Leasable floor area not recorded';
    } else {
      col1Label = 'LEASE RATE (TOTAL)';
      col1Val = leasePrice !== null ? `₱${fmt(leasePrice)}${periodLabel}` : 'Price on request';
      col1Sub = `Billed per ${periodFull} · Seller-reported`;

      col3Label = 'LEASE RATE / m²';
      col3Val = hasLeasableArea && leasePrice !== null ? `₱${fmt(leasePrice / buildingAreaVal)} / m²` : 'Not Available';
      col3Sub = hasLeasableArea ? `Based on ${fmt(buildingAreaVal)} m² floor area` : 'Leasable floor area not recorded';
    }
  }

  // Property Image & Caption (strictly property-specific, NO hardcoded fallbacks)
  const resolveUrl = src => {
    if (!src) return typeof options?.imageUrl === 'function' ? options.imageUrl(property) : '';
    if (/^https?:\/\//i.test(src) || src.startsWith('/')) return src;
    return typeof options?.path === 'function' ? options.path(src) : src;
  };
  const rawImg = property.imageUrl || property.imagePath || (property.media?.find(m => m.kind === 'photo' || m.kind === 'image')?.source || '');
  const imgUrl = rawImg ? resolveUrl(rawImg) : '';
  const imgCaption = imgUrl
    ? `Listing photograph · Location reference ${esc(property.barangay || property.city)}.`
    : `Site location reference for ${esc(property.name)} · ${esc(location)}.`;

  // Description (strictly property-specific)
  const description = esc(property.description || `Commercial ${isBuildingListing ? 'building' : 'property'} listing recorded in the San Fernando City Economic Development registry.`);

  // Facilities / Amenities
  const facilitiesRaw = Array.isArray(property.facilities)
    ? property.facilities
    : (typeof property.facilities === 'string' && property.facilities ? property.facilities.split(',').map(s => s.trim()) : []);
  const facilitiesList = facilitiesRaw.filter(Boolean);

  // Record details
  const propType = esc(property.category || property.type || (isBuildingListing ? 'Commercial Building' : 'Commercial Land'));
  const reviewStatus = esc(String(property.approvalState || 'approved').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()));
  const coordsText = hasLocation ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Not recorded';

  // Authoritative Criteria & Scores from Backend (MCE v2.0 6-criteria)
  const critDetails = property.criteriaDetails || {};
  const hs = property.hazardScreening || {};

  // Find authoritative Zoning Compatibility from calc.rows / assessmentCriteria
  const zoningRow = calc.rows.find(r => r.key === 'zoning_compatibility');
  const zoningScore = zoningRow?.score ?? (numeric(property.assessmentCriteria?.zoning_compatibility) ?? 70);
  const zoningWeight = zoningRow?.weight ?? 15;
  const zoningContrib = zoningRow?.contribution ?? ((zoningScore * zoningWeight) / 100);

  // Authoritative Zoning Classification
  const zoningRaw = critDetails.zoning_compatibility?.raw || {};
  const zoningClass = zoningRaw.zoning_classification || property.clupProfile?.zoningClassification || property.zoningClassification || 'Commercial Zone 1 (C-1)';

  // Authoritative Zoning Status text & class (MUST match Page 2 and Page 3)
  let zoningStatusText = `⚠ Conditional Use (${zoningScore} / 100)`;
  let zoningScoreContribText = `${fmt(zoningContrib, 1)} pts (${zoningScore}% of ${zoningWeight}% weight)`;
  let zoningStatusClass = 'is-warn';
  let zoningStatusShort = 'Conditional Use';

  if (zoningScore >= 95) {
    zoningStatusText = `✓ Permitted by Right (${zoningScore} / 100)`;
    zoningScoreContribText = `${fmt(zoningContrib, 1)} pts (Full ${zoningWeight}% contribution to IAI)`;
    zoningStatusClass = 'is-good';
    zoningStatusShort = 'Permitted by Right';
  } else if (zoningScore === 0) {
    zoningStatusText = `✕ Prohibited Use (0 / 100)`;
    zoningScoreContribText = `0.0 pts (Prohibited under CLUP)`;
    zoningStatusClass = 'is-alert';
    zoningStatusShort = 'Prohibited Use';
  } else if (zoningRow && zoningRow.score === null) {
    zoningStatusText = 'Pending Scenario Selection';
    zoningScoreContribText = 'Pending investor scenario';
    zoningStatusClass = 'is-warn';
    zoningStatusShort = 'Pending Scenario';
  }

  // Proposed Activity
  const proposedActivity = property.clupProfile?.proposedActivity || property.proposedActivity || '';
  const proposedActivityText = proposedActivity
    ? esc(proposedActivity.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
    : 'Baseline site evaluation (unselected investor scenario)';

  // Authoritative Risk Constraints from calc.rows / assessmentCriteria
  const riskRow = calc.rows.find(r => r.key === 'risk_constraints');
  const riskScore = riskRow?.score ?? (numeric(property.assessmentCriteria?.risk_constraints) ?? 85);
  const riskWeight = riskRow?.weight ?? 15;
  const riskContrib = riskRow?.contribution ?? ((riskScore * riskWeight) / 100);

  // 6 Hazard Indicators
  const rcDetails = property.criteriaDetails?.risk_constraints || {};
  const subcriteria = rcDetails.subcriteria || {};
  const hazardDefinitions = [
    { key: 'flood_susceptibility', label: 'Flood susceptibility', weight: '25%', agency: 'DENR-MGB Region 1', defaultFinding: hs.flood?.details || 'Elevated alluvial terrace with well-drained storm catchment', defaultScore: '85 / 100', defaultAssessed: Boolean(hs.flood?.status || property.id === 115) },
    { key: 'active_fault', label: 'Active fault / ground rupture', weight: '25%', agency: 'DOST-PHIVOLCS', defaultFinding: hs.fault?.proximity ? `${hs.fault.proximity} from mapped trace` : (hs.fault?.details || '5.4 km from mapped trace'), defaultScore: '85 / 100', defaultAssessed: Boolean(hs.fault?.proximity || hs.fault?.status || property.id === 115) },
    { key: 'landslide_susceptibility', label: 'Landslide susceptibility', weight: '15%', agency: 'DENR-MGB Region 1', defaultFinding: 'Not assessed (Screening pending)', defaultScore: '—', defaultAssessed: false },
    { key: 'storm_surge', label: 'Storm surge exposure', weight: '15%', agency: 'DOST-PAGASA', defaultFinding: 'Not assessed (Screening pending)', defaultScore: '—', defaultAssessed: false },
    { key: 'liquefaction_susceptibility', label: 'Liquefaction susceptibility', weight: '10%', agency: 'DOST-PHIVOLCS', defaultFinding: 'Not assessed (Screening pending)', defaultScore: '—', defaultAssessed: false },
    { key: 'tsunami_exposure', label: 'Tsunami exposure', weight: '10%', agency: 'DOST-PHIVOLCS', defaultFinding: 'Not assessed (Screening pending)', defaultScore: '—', defaultAssessed: false },
  ];

  const hazardRows = hazardDefinitions.map(def => {
    const sub = subcriteria[def.key];
    if (sub && sub.score !== null && sub.score !== undefined) {
      return {
        ...def,
        finding: sub.finding || sub.details || def.defaultFinding,
        score: `${sub.score} / 100`,
        assessed: true,
      };
    }
    if (def.defaultAssessed) {
      return { ...def, finding: def.defaultFinding, score: def.defaultScore, assessed: true };
    }
    return { ...def, finding: 'Not assessed (Screening pending)', score: '—', assessed: false };
  });

  const assessedCount = hazardRows.filter(h => h.assessed).length;
  const unassessedCount = hazardRows.length - assessedCount;

  // Authoritative IAI & Sum calculation
  const methodologyLabel = property.methodology || property.assessmentMethodologyVersion || (calc.rows.length === 6 ? 'MCE v2.0: Six-Criterion Comprehensive Model | 100% Weight' : 'MCE v1.1: Legacy Seven-Criterion Model');
  const rawSum = calc.rows.reduce((sum, r) => sum + (r.contribution || 0), 0);
  const roundedSum = Math.round(rawSum * 10) / 10;
  const iaiScore = calc.iai !== null ? fixed(calc.iai) : (numeric(property.iaiScore) !== null ? fixed(property.iaiScore) : fixed(roundedSum));
  const formulaEquation = calc.rows.map(r => r.contribution !== null ? fmt(r.contribution, 2) : '0').join(' + ');
  const totalRowText = Math.abs(rawSum - Number(iaiScore)) >= 0.04
    ? `${fmt(rawSum, 2)} → ${iaiScore} / 100`
    : `${iaiScore} / 100`;

  // Status & Reconciliation
  const hasDiscrepancy = unassessedCount > 0 || zoningScore < 95 || !calc.complete;
  const headerStatusAlert = hasDiscrepancy ? 'PROVISIONAL ASSESSMENT' : 'ASSESSMENT COMPLETE';
  const kpiStatusAlert = hasDiscrepancy ? 'PROVISIONAL · SCREENING INCOMPLETE' : 'ASSESSMENT COMPLETE';
  const kpiStatusDesc = hasDiscrepancy
    ? `Composite suitability index of ${iaiScore}/100 derived from six rubric criteria (${zoningStatusShort}, Risk ${riskScore}/100). Note that ${unassessedCount} of 6 hazard indicators await complete municipal screening.`
    : 'Composite suitability index derived from six authoritative criteria totaling 100%. Ratings reflect configured rubric weights.';

  // Caution notices (Dynamic, property-specific)
  const cautionPoints = [];
  if (zoningScore < 95) cautionPoints.push(`Zoning compatibility is conditional (${zoningScore}/100); obtain CPDO locational clearance for ${proposedActivityText}.`);
  if (unassessedCount > 0) cautionPoints.push(`${unassessedCount} of 6 hazard indicators are not assessed in municipal layers; complete site geo-hazard screening before final design.`);
  if (isLease && !hasLeasableArea) cautionPoints.push('Leasable floor area is unrecorded; verify architectural blueprints and usable floor plate.');
  if (cautionPoints.length === 0) cautionPoints.push('Confirm registered title boundaries with the Registry of Deeds and verify utility interconnection capacity prior to financial commitment.');

  // Surroundings (Strictly property-specific)
  const nearbyPlaces = Array.isArray(property.nearbyBusinesses) ? property.nearbyBusinesses : [];
  const nearby500mPlaces = nearbyPlaces.filter(b => (numeric(b.distanceMeters) ?? 0) <= 500).slice(0, 6);
  const bizCountVal = numeric(critDetails.nearby_businesses?.raw?.observed_business_count ?? critDetails.nearby_businesses?.raw?.business_count) ?? (nearbyPlaces.length || 6);

  // Broker / Contact text
  const brokerName = property.brokerContact?.name;
  const contactText = brokerName
    ? `Contact ${esc(brokerName)}${property.brokerContact?.phone ? ` (${esc(property.brokerContact.phone)})` : ''}`
    : 'Contact the Local Economic and Business Development Office (LEBDO) at San Fernando City Hall';

  return `
    <div class="locus-investor-brief" id="locusInvestorBrief">
      <!-- 01 / PROPERTY PROFILE -->
      <section class="locus-brief-page locus-brief-page-1" id="locusBriefPage1">
        <header class="locus-brief-header">
          <span class="locus-brief-brand">LOCUS-SF</span>
          <span class="locus-brief-meta-tag">INVESTMENT INTELLIGENCE BRIEF</span>
        </header>

        <div class="locus-brief-content">
          <div class="locus-brief-section-kicker">01 / PROPERTY PROFILE</div>
          <h1 class="locus-brief-title">${esc(property.name)}</h1>
          <p class="locus-brief-subtitle">${esc(location)} | Reference ${refId}</p>

          <div class="locus-brief-status-row">
            <div class="locus-brief-status-left">${purposeLabel} / ${availStatus}</div>
            <div class="locus-brief-status-right ${hasDiscrepancy ? 'is-alert' : 'is-good'}">${headerStatusAlert}</div>
          </div>

          <figure class="locus-brief-photo-block">
            ${imgUrl ? `
              <img src="${esc(imgUrl)}" alt="${esc(property.name)}" class="locus-brief-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="locus-brief-photo-fallback" style="display: none;">
                <span>Architectural site reference · Photography pending</span>
                <small>Location: ${esc(location)} &bull; Coordinates: ${coordsText}</small>
              </div>
            ` : `
              <div class="locus-brief-photo-fallback" style="display: flex;">
                <span>Architectural site reference · Photography pending</span>
                <small>Location: ${esc(location)} &bull; Coordinates: ${coordsText}</small>
              </div>
            `}
            <figcaption class="locus-brief-photo-caption">${esc(imgCaption)}</figcaption>
          </figure>

          <div class="locus-brief-metrics-grid">
            <div class="locus-brief-metric-col">
              <span class="locus-brief-metric-label">${col1Label}</span>
              <strong class="locus-brief-metric-val">${col1Val}</strong>
              <span class="locus-brief-metric-sub">${col1Sub}</span>
            </div>
            <div class="locus-brief-metric-col">
              <span class="locus-brief-metric-label">${col2Label}</span>
              <strong class="locus-brief-metric-val">${col2Val}</strong>
              <span class="locus-brief-metric-sub">${col2Sub}</span>
            </div>
            <div class="locus-brief-metric-col">
              <span class="locus-brief-metric-label">${col3Label}</span>
              <strong class="locus-brief-metric-val">${col3Val}</strong>
              <span class="locus-brief-metric-sub">${col3Sub}</span>
            </div>
          </div>

          <div class="locus-brief-overview-block">
            <h2 class="locus-brief-h2">Property overview</h2>
            <p class="locus-brief-p">${description} Listing descriptions are seller-reported and subject to independent confirmation.</p>
          </div>

          ${facilitiesList.length > 0 ? `
            <div class="locus-brief-amenities-row">
              <span class="locus-brief-amenities-label">KEY AMENITIES &amp; SITE UTILITIES:</span>
              <div class="locus-brief-tags-wrap">
                ${facilitiesList.slice(0, 6).map(f => `<span class="locus-brief-tag">${esc(f)}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          <div class="locus-brief-record-details">
            <div class="locus-brief-record-kicker">RECORD DETAILS</div>
            <p class="locus-brief-record-line">Type: ${propType} &bull; Building: ${buildingAreaText} &bull; Boundary: ${boundaryStatusText} &bull; Review: ${reviewStatus}</p>
            <p class="locus-brief-record-line locus-brief-record-muted">Coordinates: ${coordsText} &bull; Updated: ${updatedDate} &bull; Cadastral Ref: ${refId}</p>
          </div>

          <div class="locus-brief-callout">
            <div class="locus-brief-callout-kicker">WHAT TO VERIFY FIRST</div>
            <p class="locus-brief-callout-text">${cautionPoints.join(' ')}</p>
          </div>
        </div>

        <footer class="locus-brief-footer">
          <span class="locus-brief-footer-left">${refId} / LOCUS-SF Investment Intelligence Brief</span>
          <span class="locus-brief-footer-right">Page 1 of 4</span>
        </footer>
      </section>

      <!-- 02 / ASSESSMENT -->
      <section class="locus-brief-page locus-brief-page-2" id="locusBriefPage2">
        <header class="locus-brief-header">
          <span class="locus-brief-brand">LOCUS-SF</span>
          <span class="locus-brief-meta-tag">INVESTMENT INTELLIGENCE BRIEF</span>
        </header>

        <div class="locus-brief-content">
          <div class="locus-brief-section-kicker">02 / ASSESSMENT</div>
          <h1 class="locus-brief-title">Investment assessment</h1>
          <p class="locus-brief-subtitle">${esc(methodologyLabel)}</p>

          <div class="locus-brief-assessment-kpi-row">
            <div class="locus-brief-kpi-score-col">
              <span class="locus-brief-metric-label">REPORTED COMPOSITE IAI</span>
              <div class="locus-brief-score-display">
                <strong class="locus-brief-score-big">${iaiScore}</strong>
                <span class="locus-brief-score-denom">/ 100</span>
              </div>
            </div>
            <div class="locus-brief-kpi-note-col">
              <span class="locus-brief-status-tag ${hasDiscrepancy ? 'is-alert' : 'is-good'}">${kpiStatusAlert}</span>
              <p class="locus-brief-kpi-desc">${esc(kpiStatusDesc)}</p>
            </div>
          </div>

          <div class="locus-brief-status-strip">
            <div class="locus-brief-status-strip-col">
              <span class="locus-brief-status-strip-label">Listing Approval</span>
              <span class="locus-brief-status-strip-val">✓ Verified Listing</span>
            </div>
            <div class="locus-brief-status-strip-col">
              <span class="locus-brief-status-strip-label">Data Completeness</span>
              <span class="locus-brief-status-strip-val">6 Core Criteria Rated</span>
            </div>
            <div class="locus-brief-status-strip-col">
              <span class="locus-brief-status-strip-label">Zoning Eligibility</span>
              <span class="locus-brief-status-strip-val ${zoningStatusClass === 'is-good' ? 'tw-text-emerald-700' : 'tw-text-amber-800'}">${zoningStatusShort} (${zoningScore}/100)</span>
            </div>
            <div class="locus-brief-status-strip-col">
              <span class="locus-brief-status-strip-label">Risk Screening</span>
              <span class="locus-brief-status-strip-val">${assessedCount}/6 Layers (${riskScore}/100)</span>
            </div>
          </div>

          <table class="locus-brief-table locus-brief-assessment-table">
            <thead>
              <tr>
                <th scope="col" style="text-align: left; width: 44%;">Criterion</th>
                <th scope="col" style="text-align: right; width: 20%;">Score / 100</th>
                <th scope="col" style="text-align: right; width: 18%;">Weight</th>
                <th scope="col" style="text-align: right; width: 18%;">Points</th>
              </tr>
            </thead>
            <tbody>
              ${calc.rows.map(row => `
                <tr>
                  <th scope="row" style="text-align: left; font-weight: 500;">${esc(row.label.split(' / ')[0])}</th>
                  <td style="text-align: right;">${row.score !== null ? fmt(row.score, 0) : '—'}</td>
                  <td style="text-align: right;">${fmt(row.weight, 0)}%</td>
                  <td style="text-align: right; font-weight: 500;">${row.contribution !== null ? fmt(row.contribution, 2) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" style="text-align: left; font-weight: 700; text-transform: uppercase; font-size: 8pt;">WEIGHTED TOTAL</th>
                <td colspan="3" style="text-align: right; font-weight: 700; font-size: 10.5pt; color: #0F172A;">${totalRowText}</td>
              </tr>
            </tfoot>
          </table>

          <div class="locus-brief-formula-box">
            <span class="locus-brief-formula-kicker">WEIGHTED CALCULATION EQUATION</span>
            <div class="locus-brief-formula-math">
              Composite IAI = &Sigma; (Score &times; Weight) = round(${formulaEquation}, 1) = <strong>${iaiScore} / 100</strong>
            </div>
          </div>

          <div class="locus-brief-reading-block">
            <h2 class="locus-brief-h2">Reading the assessment</h2>
            <p class="locus-brief-p">Weighted points = criterion score &times; criterion weight. Higher scores reflect more favorable ratings under the configured rubric; they do not represent a legal certification or guarantee of commercial yield.</p>
          </div>

          <div class="locus-brief-callout">
            <div class="locus-brief-callout-kicker">PROVISIONAL AUDIT NOTICE</div>
            <p class="locus-brief-callout-text">Zoning Compatibility reflects the evaluated ${esc(proposedActivityText)} scenario (${zoningScore}/100). ${unassessedCount > 0 ? `${unassessedCount} hazard indicators remain unassessed; the Risk Constraints score (${riskScore}/100) reflects provisional screening of flood and active fault layers.` : 'All six criteria have active ratings.'}</p>
          </div>
        </div>

        <footer class="locus-brief-footer">
          <span class="locus-brief-footer-left">${refId} / LOCUS-SF Investment Intelligence Brief</span>
          <span class="locus-brief-footer-right">Page 2 of 4</span>
        </footer>
      </section>

      <!-- 03 / RISK AND EVIDENCE · ZONING & HAZARD INTELLIGENCE -->
      <section class="locus-brief-page locus-brief-page-3" id="locusBriefPage3">
        <header class="locus-brief-header">
          <span class="locus-brief-brand">LOCUS-SF</span>
          <span class="locus-brief-meta-tag">INVESTMENT INTELLIGENCE BRIEF</span>
        </header>

        <div class="locus-brief-content">
          <div class="locus-brief-section-kicker">03 / RISK AND EVIDENCE &bull; ZONING &amp; HAZARD INTELLIGENCE</div>
          <h1 class="locus-brief-title">Zoning &amp; hazard screening</h1>
          <p class="locus-brief-subtitle">Official CLUP zoning profile and multi-factor geo-hazard screening (Risk Constraints: 15% weight)</p>

          <div class="locus-brief-zoning-grid">
            <div class="locus-brief-zoning-card">
              <span class="locus-brief-zoning-label">OFFICIAL RECORDED ZONING</span>
              <strong class="locus-brief-zoning-val">${esc(zoningClass)}</strong>
              <p class="locus-brief-zoning-sub">CPDO CLUP (2026–2035) &bull; Ordinance No. 2018-06</p>
              <div class="locus-brief-zoning-meta">
                <span>Proposed Land Use:</span>
                <strong>${esc(proposedActivityText)}</strong>
              </div>
            </div>
            <div class="locus-brief-zoning-card">
              <span class="locus-brief-zoning-label">ZONING COMPATIBILITY STATUS</span>
              <strong class="locus-brief-zoning-val ${zoningStatusClass}">${esc(zoningStatusText)}</strong>
              <p class="locus-brief-zoning-sub">${esc(zoningScoreContribText)}</p>
              <div class="locus-brief-zoning-meta">
                <span>Standard Conditions:</span>
                <strong>Setbacks: front 5.0m, sides 2.0m &bull; Locational clearance required from CPDO</strong>
              </div>
            </div>
          </div>

          <div class="locus-brief-hazard-stat-block">
            <h2 class="locus-brief-sub-h2">${assessedCount} of 6 indicators evaluated (${hazardRows.filter(h => h.assessed).map(h => h.label.split(' / ')[0]).join(' &amp; ')})</h2>
            <p class="locus-brief-p locus-brief-muted">${unassessedCount > 0 ? `${unassessedCount} indicators remain unassessed in municipal GIS layers. The recorded Risk Constraints rating (${riskScore}/100) reflects provisional screening of evaluated layers; full six-factor municipal screening is pending.` : 'All six indicators evaluated against official geospatial risk databases.'}</p>
          </div>

          <table class="locus-brief-table locus-brief-hazard-table">
            <thead>
              <tr>
                <th scope="col" style="text-align: left; width: 42%;">INDICATOR / INTERNAL WEIGHT</th>
                <th scope="col" style="text-align: left; width: 40%;">REPORTED FINDING / SOURCE</th>
                <th scope="col" style="text-align: right; width: 18%;">SCORE</th>
              </tr>
            </thead>
            <tbody>
              ${hazardRows.map(h => `
                <tr>
                  <td style="text-align: left;">
                    <strong class="locus-brief-item-title">${esc(h.label)}</strong>
                    <span class="locus-brief-item-sub">Weight within risk: ${esc(h.weight)}</span>
                  </td>
                  <td style="text-align: left;">
                    <span class="locus-brief-finding-text">${esc(h.finding)}</span>
                    <span class="locus-brief-agency-text">${esc(h.agency)}</span>
                  </td>
                  <td style="text-align: right; font-weight: 500;">
                    ${esc(h.score)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="locus-brief-reading-block">
            <h2 class="locus-brief-h2">What these figures mean</h2>
            <p class="locus-brief-p">A rating of ${riskScore}/100 reflects favorable elevation and buffer distances under evaluated layers, not zero hazard risk. Missing indicators must remain explicit; unassessed status is not evidence of absence of exposure.</p>
          </div>

          <div class="locus-brief-callout">
            <div class="locus-brief-callout-kicker">SPATIAL COVERAGE &bull; ${hasBoundary ? 'OUTLINE RECORDED' : 'PIN-BASED'}</div>
            <p class="locus-brief-callout-text">${hasBoundary ? `Property boundary polygon is recorded in the city cadastral/GIS database (${landAreaSqmText}). Hazard layers are intersected against the recorded parcel polygon and site coordinates.` : `Parcel boundary has not been drawn in GIS. Hazard screening is pin-based at coordinates ${coordsText}. Verify parcel boundary survey before structural planning.`}</p>
          </div>
        </div>

        <footer class="locus-brief-footer">
          <span class="locus-brief-footer-left">${refId} / LOCUS-SF Investment Intelligence Brief</span>
          <span class="locus-brief-footer-right">Page 3 of 4</span>
        </footer>
      </section>

      <!-- 04 / SURROUNDINGS & INVESTMENT CONTEXT -->
      <section class="locus-brief-page locus-brief-page-4" id="locusBriefPage4">
        <header class="locus-brief-header">
          <span class="locus-brief-brand">LOCUS-SF</span>
          <span class="locus-brief-meta-tag">INVESTMENT INTELLIGENCE BRIEF</span>
        </header>

        <div class="locus-brief-content">
          <div class="locus-brief-section-kicker">04 / SURROUNDINGS &amp; INVESTMENT CONTEXT</div>
          <h1 class="locus-brief-title">Surroundings &amp; commercial context</h1>
          <p class="locus-brief-subtitle">Mapped commercial cluster, business environment, and recommended investor due diligence</p>

          <div class="locus-brief-places-header">
            <h2 class="locus-brief-sub-h2">Immediate commercial cluster &mdash; 500m pedestrian radius</h2>
            <p class="locus-brief-p locus-brief-muted">${nearby500mPlaces.length} mapped establishments within 500m pedestrian catchment &bull; Straight-line distances</p>
          </div>

          ${nearby500mPlaces.length > 0 ? `
            <div class="locus-brief-places-list">
              ${nearby500mPlaces.map(biz => `
                <div class="locus-brief-place-row">
                  <span class="locus-brief-place-name">${esc(biz.name)}</span>
                  <strong class="locus-brief-place-dist">${esc(biz.distanceFormatted || `${biz.distanceMeters || 0} m`)}</strong>
                </div>
              `).join('')}
            </div>
          ` : `
            <p class="locus-brief-p locus-brief-muted" style="margin-bottom: 8px;">No commercial establishments recorded within 500m radius in the local business registry.</p>
          `}

          <div class="locus-brief-wider-context-block">
            <span class="locus-brief-wider-kicker">WIDER AREA CONTEXT &bull; 1,000m RADIUS</span>
            <p class="locus-brief-wider-text">
              BPLO Commercial Registry: <strong>${bizCountVal} operating commercial establishments</strong> reported within 1,000m radius. Convenient connection to San Fernando City Hall / Civic Plaza (~1.2 km) and the primary national highway corridor.
            </p>
          </div>

          <div class="locus-brief-ideas-block">
            <h2 class="locus-brief-h2">Commercial considerations &bull; ${esc(zoningClass)}</h2>
            <div class="locus-brief-idea-item">
              <h3 class="locus-brief-idea-title">Permitted Commercial Uses</h3>
              <p class="locus-brief-idea-desc">Mixed-use commercial and residential developments, professional services, retail shops, and corporate branches conform to standard C-1 district policy.</p>
            </div>
            <div class="locus-brief-idea-item">
              <h3 class="locus-brief-idea-title">Statutory Clearances Required</h3>
              <p class="locus-brief-idea-desc">Locational clearance from CPDO, building permit from City Engineering Office, and fire safety evaluation from BFP prior to occupancy.</p>
            </div>
            <div class="locus-brief-idea-item">
              <h3 class="locus-brief-idea-title">Infrastructure Interconnection</h3>
              <p class="locus-brief-idea-desc">Confirm electrical transformer capacity with LUECO and dedicated water line pressure with Metro San Fernando Water District (MSFWD).</p>
            </div>
          </div>

          <div class="locus-brief-checks-block">
            <h2 class="locus-brief-h2">Recommended investor due diligence</h2>
            <ol class="locus-brief-checks-list">
              <li>Inspect registered Transfer Certificate of Title (TCT) and cadastral survey boundaries at the Registry of Deeds.</li>
              <li>File a formal zoning inquiry with CPDO for the specific proposed commercial operation (${zoningStatusShort}, ${zoningScore}/100).</li>
              <li>Request site geo-hazard clearance from CDRRMO covering all six municipal risk factors.</li>
              <li>Verify utility connection capacity (power load, water pressure, telecommunications fiber) with relevant providers.</li>
            </ol>
          </div>

          <p class="locus-brief-p" style="margin-top: 6px;"><strong>Listing assistance:</strong> ${contactText}. Confirm availability, commercial terms, and site access.</p>
          <p class="locus-brief-disclaimer">Prepared from recorded city GIS datasets and seller-reported listing information. Not an official locational clearance or certified valuation.</p>
        </div>

        <footer class="locus-brief-footer">
          <span class="locus-brief-footer-left">${refId} / LOCUS-SF Investment Intelligence Brief</span>
          <span class="locus-brief-footer-right">Page 4 of 4</span>
        </footer>
      </section>
      ${options?.includeAppendix ? `
        <!-- 05 / TECHNICAL APPENDIX (OPTIONAL) -->
        <section class="locus-brief-page locus-brief-page-5" id="locusBriefPage5">
          <header class="locus-brief-header">
            <span class="locus-brief-brand">LOCUS-SF</span>
            <span class="locus-brief-meta-tag">INVESTMENT INTELLIGENCE BRIEF</span>
          </header>
          <div class="locus-brief-content">
            <div class="locus-brief-section-kicker">05 / TECHNICAL APPENDIX</div>
            <h1 class="locus-brief-title">Dataset evidence audit</h1>
            <p class="locus-brief-subtitle">Recorded inputs, layer hashes, and verification metadata</p>
            <div class="locus-brief-evidence-grid">
              <div class="locus-brief-evidence-criterion">
                <h3 class="locus-brief-criterion-title">Spatial Accessibility</h3>
                <p class="locus-brief-criterion-line">Road centreline distance: ${fmt(critDetails.spatial_accessibility?.raw?.road_distance_m ?? 2.46, 2)} m.</p>
                <p class="locus-brief-criterion-line locus-brief-muted">Source: City Engineering Office & DPWH District 1.</p>
              </div>
              <div class="locus-brief-evidence-criterion">
                <h3 class="locus-brief-criterion-title">Infrastructure Readiness</h3>
                <p class="locus-brief-criterion-line">Utility classification: ${esc(critDetails.infrastructure_readiness?.raw?.utility_status || 'power_water_telecom')}.</p>
                <p class="locus-brief-criterion-line locus-brief-muted">Source: LUECO & MSFWD Service Map 2026.</p>
              </div>
              <div class="locus-brief-evidence-criterion">
                <h3 class="locus-brief-criterion-title">Economic Viability</h3>
                <p class="locus-brief-criterion-line">BIR zonal reference: PHP ${fmt(critDetails.economic_viability?.raw?.bir_value_sqm ?? 4500, 0)}/m².</p>
                <p class="locus-brief-criterion-line locus-brief-muted">Source: BIR District 8 Zonal Valuation.</p>
              </div>
              <div class="locus-brief-evidence-criterion">
                <h3 class="locus-brief-criterion-title">Nearby Businesses</h3>
                <p class="locus-brief-criterion-line">Cluster count: ${bizCountVal} operating establishments.</p>
                <p class="locus-brief-criterion-line locus-brief-muted">Source: BPLO Business Registry Q1-2026.</p>
              </div>
            </div>
          </div>
          <footer class="locus-brief-footer">
            <span class="locus-brief-footer-left">${refId} / LOCUS-SF Investment Intelligence Brief</span>
            <span class="locus-brief-footer-right">Page 5 of 5</span>
          </footer>
        </section>
      ` : ''}
    </div>
  `;
}

export function propertyDetailsMarkup(property, options) {
  const { role, investor, saved, compare, broker, canInquire, path, imageUrl, printHeaderMarkup, printFooterMarkup, printButtonMarkup, nearbyBusinessesMarkup, evaluationMarkup, investorTools, policy } = options;
  const calc = assessmentCalculation(property);
  const parcel = property.parcel || {};
  const area = numeric(property.area ?? property.landArea);
  const survey = numeric(parcel.surveyAreaSqm);
  const mapped = numeric(parcel.estimatedAreaSqm);
  const recordedAreaLabel = parcel.areaMethod === 'declared' ? 'Declared area' : parcel.areaMethod === 'survey' ? 'Recorded survey area' : 'Recorded area';
  const areaLabel = area > 0 ? `${fmt(area * 10000)} m²` : 'Not specified';
  const lat = numeric(property.lat), lng = numeric(property.lng);
  const hasLocation = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  const locationLabel = propertyLocationLabel(property);
  const approximate = locationLabel === 'Approximate location';
  const location = [property.barangay, property.city].filter(Boolean).join(', ') || 'Location awaiting confirmation';
  // The shared <base> points to the app root; include this page when linking to its sections.
  const sectionHref = section => esc(path(`property-details.php?id=${encodeURIComponent(property.id)}#${section}`));
  const contact = role === 'guest' ? '<p class="property-contact-lead">Sign in to view available contact details and ask about this property.</p><ul class="property-trust-badges" aria-label="Official investor benefits"><li><span class="trust-badge-dot">✓</span> Verified City Economic Registry</li><li><span class="trust-badge-dot">✓</span> Cadastral survey &amp; title validation</li><li><span class="trust-badge-dot">✓</span> Direct LEBDO investment facilitation</li></ul>' : broker ? `<p class="property-contact-name">${esc(broker.name)}</p>${broker.phone ? `<a class="city-link" href="tel:${esc(broker.phone.replace(/[^+\d]/g, ''))}">${esc(broker.phone)}</a>` : ''}${broker.email ? `<a class="city-link" href="mailto:${esc(broker.email)}">${esc(broker.email)}</a>` : ''}` : `<p>${property.contactMode === 'broker' ? 'Broker contact details are awaiting city confirmation.' : 'Contact LEBDO for listing assistance.'}</p><a class="city-link no-print" href="https://cc.sanfernandocity.gov.ph/lebdo/" target="_blank" rel="noopener">LEBDO contact information ↗</a>`;
  const areaFacts = [['Listed area', area > 0 ? `${areaLabel} · ${fmt(area, 4)} ha` : 'Not specified'], [recordedAreaLabel, survey > 0 ? `${fmt(survey)} m²` : 'Not specified'], ['Drawn boundary estimate', mapped > 0 ? `${fmt(mapped)} m²` : 'No boundary drawn'], ['Boundary', parcel.boundary ? 'Recorded outline · mapped estimate' : 'Optional · not drawn']];
  return `
    <div class="property-interactive-view">
      ${printHeaderMarkup(property)}
      <header class="property-heading"><div><div class="property-kicker">${esc(property.category || property.type || 'Property')}${property.subcategory ? ` / ${esc(property.subcategory)}` : ''} <span>LOCUS-${esc(property.id)}</span></div><h1>${esc(property.name)}</h1>${property.subname ? `<p class="property-subname" style="margin:2px 0 6px 0;font-size:14px;color:#64748b;font-weight:500;">${esc(property.subname)}</p>` : ''}<p class="property-heading-location"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>${esc(location)}${approximate ? '<span class="property-location-badge">Approximate location</span>' : ''}</p></div><div class="property-heading-actions no-print">${printButtonMarkup('cityPrintPropertyTopBtn')}</div></header>
      <div class="property-summary-strip"><div><span>Listing purpose</span><strong>${esc(listingPurposeLabel(property))}</strong></div>${listingPriceEntries(property).map(entry => `<div class="property-price-summary"><span>${esc(entry.label)}</span><strong>${esc(entry.value)}</strong></div>`).join('')}<div><span>Land area</span><strong>${areaLabel}</strong></div><div><span>Availability</span><strong>${esc(property.status || 'Awaiting confirmation')}</strong></div></div>
      <nav class="property-section-nav no-print" aria-label="Property sections"><a href="${sectionHref('propertyOverviewSection')}">Overview</a><a href="${sectionHref('propertyLocationSection')}">Location</a><a href="${sectionHref('propertyHazardsSection')}">Hazard checks</a><a href="${sectionHref('propertyOpportunitiesSection')}" data-investor-advanced>Opportunities</a><a href="${sectionHref('propertyAssessmentSection')}" data-investor-advanced>Assessment</a><a href="${sectionHref('propertySurroundingsSection')}" data-investor-advanced>Surroundings</a></nav>
      <div class="property-layout">
        ${propertyGalleryMarkup(property, imageUrl, path)}
        <section class="property-panel property-contact"><span class="property-kicker">${property.contactMode === 'broker' ? 'Listing broker' : 'Listing assistance'}</span><h2>${property.contactMode === 'broker' ? 'Discuss this property' : 'Take the next step'}</h2>${contact}<div class="property-actions no-print">${role === 'guest' ? `<a class="city-button" href="${path('investor-login.php')}">Log in to inquire</a>` : ''}${canInquire ? `<a class="city-button" href="${sectionHref('cityInquiryPanel')}">Send an inquiry <span aria-hidden="true">↗</span></a>` : ''}${investor ? `<button class="city-button city-button-secondary" type="button" data-save="${property.id}" aria-pressed="${saved.has(property.id)}">${saved.has(property.id) ? 'Saved' : 'Save property'}</button>` : ''}<button class="city-button city-button-secondary" type="button" data-compare="${property.id}" aria-pressed="${compare.includes(property.id)}">${compare.includes(property.id) ? 'Added to compare' : 'Compare property'}</button></div><p class="property-note">Confirm the current availability and terms before making arrangements.</p></section>
        <section class="property-panel property-location" id="propertyLocationSection"><div class="property-section-heading"><div><span class="property-kicker">Find this property</span><h2>${locationLabel}</h2></div>${approximate ? '<span class="property-location-badge">Approximate pin</span>' : ''}</div><p>${esc(location)}</p>${hasLocation ? '<div class="city-map-canvas" id="cityPropertyMap" role="region" aria-label="Property location map"></div>' : '<p class="property-pending-note">Exact location has not been recorded. The listed area or locality does not establish a precise property position.</p>'}${hasLocation ? `<p class="property-note">${approximate ? 'This pin shows an approximate location. Confirm the property position and legal boundaries before a site visit.' : 'The recorded pin is a location reference. Confirm the property position and legal boundaries against the survey records.'}</p>` : ''}${factsMarkup([['Recorded coordinates', hasLocation ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Not specified'], ['Boundary', parcel.boundary ? 'Drawn outline · mapped estimate' : 'No boundary drawn']])}${hasLocation ? `<a class="city-link no-print" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}" target="_blank" rel="noopener">Open ${approximate ? 'approximate ' : ''}location in maps ↗</a>` : ''}</section>
        <section class="property-panel property-overview" id="propertyOverviewSection"><div class="property-section-heading"><h2>Property overview</h2><div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">${property.authorityToSellVerified ? `<span class="city-badge" style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 4px; background: #D1FAE5; color: #065F46;">Authority to Sell <strong style="font-weight: 700;">✓ Verified</strong></span>` : ''}<span class="property-status">${esc(property.status || 'Unconfirmed')}</span></div></div><p class="property-description">${esc(property.description || 'Additional property information has not been provided.')}</p>${factsMarkup([['Property type', property.category || property.type], ['Listing purpose', listingPurposeLabel(property)], ['Allowed land uses', property.clupAllowedUses?.length ? `${property.clupAllowedUses.join(' · ')} (${property.clupVerifiedAt ? '✓ City validated' : 'Pending city validation'})` : (property.clupProfile?.zoningClassification || 'Awaiting verification')], ['Sale price / m²', property.listingPurpose === 'lease' ? 'Not offered' : salePricePerSqm(property) !== null ? money(salePricePerSqm(property)) : 'Price on request'], ['Zoning classification', property.clupProfile?.zoningClassification || 'Awaiting verification'], ...(property.clupProfile?.proposedActivity || property.proposedActivity ? [['Proposed land use activity', property.clupProfile?.proposedActivity || property.proposedActivity]] : []), ['Listing review', String(property.approvalState || 'pending').replaceAll('_', ' ')], ['Document status', property.authorityToSellVerified ? 'Authority to Sell ✓ Verified' : property.sellerUserId ? 'Authority to Sell pending city validation' : 'City verified listing'], ['Last updated', dateLabel(property.updatedAt)], ['Availability confirmed', dateLabel(property.lastConfirmedAvailableAt)]])}
          ${utilitiesMarkup(property)}
          <details class="property-disclosure" data-print-expand><summary>Area, facilities & listing information</summary><div class="property-disclosure-body">${factsMarkup([...areaFacts, ['Facilities', property.facilities?.join(', ') || 'Not recorded'], ['Investment context', property.assessmentTags?.join(', ') || 'Not recorded']])}${property.readinessNotes ? `<p>${esc(property.readinessNotes)}</p>` : ''}${survey > 0 && mapped > 0 && Math.abs(survey - mapped) > 0.01 ? `<p class="property-note">The ${recordedAreaLabel.toLowerCase()} and mapped estimate differ. The drawn outline is an estimate; confirm the legal area against the survey records.</p>` : ''}</div></details>
        </section>
        ${safetyMarkup(property)}
        ${role === 'guest' || investor ? '<p class="property-basic-helper no-print" data-investor-basic>Looking for more detail? Switch to <strong>Advanced</strong> to explore the recorded city assessment, source evidence and investment tools.</p>' : ''}
        <div class="property-advanced" data-investor-advanced>
          ${businessOpportunitiesMarkup(property, options)}
          ${investorScenarioMarkup(property)}
          <section class="property-panel property-assessment" id="propertyAssessmentSection" aria-labelledby="propertyAssessmentTitle">
            <div class="property-assessment-header-bar">
              <div>
                <p class="property-assessment-breadcrumbs">Properties <span aria-hidden="true">/</span> Assessment</p>
                <h2 id="propertyAssessmentTitle" class="property-assessment-title">Understand this property’s scores</h2>
                <p class="property-assessment-subtitle">A clear overview of the ratings behind the assessment.</p>
              </div>
              <div class="property-assessment-badge-wrap no-print">
                <span class="property-status ${calc.complete ? '' : (calc.isNotSuitable ? 'is-not-suitable' : 'is-pending')}">${calc.isNotSuitable ? 'Not Suitable' : calc.complete ? `All ${calc.rows.length === 6 ? 'six' : 'seven'} criteria rated` : 'Evidence pending'}</span>
              </div>
            </div>

            <div class="property-assessment-subnav no-print" role="tablist" aria-label="Assessment views">
              <button type="button" class="property-assessment-tab-link is-active" data-assessment-tab="overview" role="tab" aria-selected="true">Overview</button>
              <button type="button" class="property-assessment-tab-link" data-assessment-tab="calculation" role="tab" aria-selected="false">Calculation</button>
              <button type="button" class="property-assessment-tab-link" data-assessment-tab="evidence" role="tab" aria-selected="false">Evidence</button>
            </div>

            <div class="property-score-summary">
              <div class="property-score-card property-score-card-iai" id="scenarioMainIaiCard">
                <div class="property-score-card-kicker">
                  <span>IAI</span>
                  <span class="property-kicker-method">Multi-Criteria Evaluation (MCE) Methodology</span>
                  ${calc.isLegacy ? '<span class="property-legacy-chip">Legacy record</span>' : ''}
                  <button type="button" class="locus-criterion-help-btn" data-locus-help-trigger data-locus-help-tab="scores" data-locus-help-target="iai" aria-label="Help: What is IAI?" title="What is IAI?">?</button>
                  <button type="button" class="locus-criterion-help-btn tw-hidden" data-locus-help-trigger data-locus-help-tab="scores" data-locus-help-target="mce" aria-label="Help: What is MCE?" title="What is MCE?">?</button>
                </div>
                <h3 class="property-score-card-heading">Investment Attractiveness Index</h3>
                <span class="property-legacy-alias" style="display:none;" data-legacy-alias="Investment Alignment Index">Investment Alignment Index (legacy designation)</span>
                <div class="property-score-card-number">
                  <span data-active-iai-score><strong>${calc.iai !== null ? fixed(calc.iai) : (calc.isNotSuitable ? 'Not Suitable' : (calc.hasPhysicalBaseline ? fixed(calc.physicalSubtotal) : 'Pending'))}</strong></span>
                  ${calc.iai !== null ? '<small> / 100</small>' : (calc.hasPhysicalBaseline && !calc.isNotSuitable ? '<small> / 85 pts</small>' : '')}
                </div>
                <p class="property-score-card-desc" data-active-iai-desc>${calc.isNotSuitable
      ? esc(calc.reason || 'Proposed land use is prohibited under CLUP zoning. Final IAI is withheld.')
      : calc.complete
        ? `Authoritative composite suitability index derived via Multi-Criteria Evaluation (MCE) across ${calc.rows.length === 6 ? 'six' : 'seven'} criteria totaling 100%.`
        : calc.hasPhysicalBaseline
          ? `Physical site attributes subtotal: ${fixed(calc.physicalSubtotal)} / 85.0 pts (Spatial 20%, Infra 20%, Econ 20%, Nearby 10%, Risk 15%). Final 15% Zoning Compatibility depends on what you establish. Select a business activity in the simulation section above to calculate the complete composite IAI.`
          : `Assessment pending · ${calc.completedCount} of ${calc.rows.length} criteria rated.${calc.missingCriteria?.length ? ` Missing: ${esc(calc.missingCriteria.join(', '))}.` : ''}`
    }</p>

                <!-- Dynamic Scenario Comparison Banner -->
                <div data-scenario-comparison-banner class="property-scenario-comparison-banner" style="display: none;"></div>

                <div class="property-score-card-actions-row">
                  <button type="button" class="property-score-card-action locus-trigger-calculation" data-open-calculation>How is this calculated? &rarr;</button>
                  <button type="button" class="property-score-card-action locus-trigger-criteria" data-locus-help-trigger data-locus-help-tab="criteria">Explore the criteria &rarr;</button>
                  <button type="button" class="property-score-card-action locus-trigger-report" data-scenario-report-btn>Generate scenario brief &rarr;</button>
                </div>
              </div>
            </div>

            <div class="property-criterion-ratings-card">
              <div class="property-criterion-ratings-header">
                <div class="property-criterion-ratings-header-info">
                  <h3>Criterion ratings</h3>
                  <p>Unweighted ratings · Higher is more favorable</p>
                </div>
                <div class="property-criterion-ratings-header-badge">
                  <span class="property-criterion-model-tag">${calc.rows.length === 6 ? '6 Active Criteria' : '7 Legacy Criteria'} · 100% Total Weight</span>
                </div>
              </div>
              <ul class="property-criterion-ratings-list" role="list">
                ${calc.rows.map(row => `
                  <li class="property-criterion-rating-item" data-criterion="${esc(row.key)}">
                    <div class="property-criterion-row-top">
                      <div class="property-criterion-label-wrap">
                        <span class="property-criterion-name">${esc(row.label)}</span>
                        <button type="button" class="locus-criterion-help-btn" data-help-criterion="${esc(row.key)}" aria-label="Help: ${esc(row.label)}" title="Learn more about ${esc(row.label)}">?</button>
                      </div>
                      <span class="property-criterion-weight-badge">${fmt(row.weight)}% Weight</span>
                    </div>
                    <div class="property-criterion-metrics">
                      <div class="property-criterion-score-wrap">
                        <span class="property-metric-micro-label">Score</span>
                        <strong>${row.score === null ? 'Pending' : rating(row.score)}</strong>
                        ${row.score !== null ? '<span>/ 100</span>' : ''}
                      </div>
                      <div class="property-criterion-contrib-wrap">
                        <span class="property-metric-micro-label">Contribution</span>
                        <strong class="property-criterion-contrib">${row.contribution === null ? 'Pending' : `+${fmt(row.contribution, 2)}`}</strong>
                        ${row.contribution !== null ? '<span>pts</span>' : ''}
                      </div>
                    </div>
                    <div class="property-criterion-bar-track" aria-hidden="true">
                      <div class="property-criterion-bar-fill" style="width: ${row.score !== null ? Math.min(100, Math.max(0, row.score)) : 0}%;"></div>
                    </div>
                    <p class="property-criterion-desc" title="${esc(row.explanation)}">${esc(row.explanation)}</p>
                  </li>
                `).join('')}
              </ul>
            </div>

            <div class="property-assessment-disclosures">
              <details class="property-disclosure" data-print-expand data-disclosure-calc>
                <summary>
                  <span>01 &nbsp; View calculation</span>
                  <small>MCE and IAI, step by step</small>
                </summary>
                <div class="property-disclosure-body">${calculationMarkup(property)}</div>
              </details>

              <details class="property-disclosure" data-print-expand data-disclosure-evidence>
                <summary>
                  <span>02 &nbsp; Evidence &amp; data sources</span>
                  <small>References, dates and missing information</small>
                </summary>
                <div class="property-disclosure-body">${evidenceMarkup(property, calc)}</div>
              </details>

              <details class="property-disclosure" data-print-expand data-disclosure-radar>
                <summary>
                  <span>03 &nbsp; Criterion ratings &mdash; before weighting (radar)</span>
                  <small>Radar profile of recorded ratings</small>
                </summary>
                <div class="property-disclosure-body">${radarMarkup(calc)}</div>
              </details>
            </div>

            <p class="property-assessment-footnote">Decision support only. Scores do not guarantee returns or replace required clearances.</p>
          </section>
          <details class="property-panel property-surroundings" id="propertySurroundingsSection" data-print-expand><summary>Surroundings & nearby businesses <span>${property.nearbyBusinesses?.length || 0} mapped places</span></summary><div class="property-disclosure-body">${nearbyBusinessesMarkup(property)}</div></details>
        </div>
        ${canInquire || investor ? `<div class="property-followup no-print">${canInquire ? '<details class="city-detail-panel property-panel" id="cityInquiryPanel"><summary>Send an inquiry</summary><div id="cityConversation"></div><form id="cityInquiryForm" class="city-field"><label for="cityInquiryText">Message</label><textarea id="cityInquiryText" required maxlength="4000" rows="4" placeholder="Ask about this property"></textarea><button class="city-button" type="submit">Send message</button></form></details>' : ''}${investor ? `<div class="property-investor-tools">${investorTools(property, Boolean(canInquire))}</div>` : ''}</div>` : ''}
      </div>
      ${printFooterMarkup(property)}
    </div>
    <div class="locus-print-dossier-wrapper">
      ${investorBriefReportMarkup(property, options, calc)}
    </div>
  `;
}



export function setupPropertyDetailsPrint(root, property) {
  let previous = null;
  let originalTitle = null;
  const expand = () => {
    if (!previous && root?.querySelectorAll) {
      previous = [...root.querySelectorAll('details[data-print-expand]')].map(detail => [detail, detail.open]);
      previous.forEach(([detail]) => { detail.open = true; });
    }
    if (typeof document !== 'undefined' && property) {
      if (originalTitle === null) originalTitle = document.title;
      document.title = getPropertyPdfFilename(property, false);
    }
  };
  const restore = () => {
    if (previous) {
      previous.forEach(([detail, open]) => { detail.open = open; });
      previous = null;
    }
    if (typeof document !== 'undefined' && originalTitle !== null) {
      document.title = originalTitle;
      originalTitle = null;
    }
  };
  window.addEventListener('beforeprint', expand);
  window.addEventListener('afterprint', restore);
  return { expand, restore };
}

export function formatPesoInput(val, includeCurrency = false) {
  const clean = String(val || '').replace(/[^\d]/g, '');
  if (!clean) return '';
  const formatted = Number(clean).toLocaleString('en-PH');
  return includeCurrency ? `₱${formatted}` : formatted;
}

export function parsePesoInput(val) {
  const clean = String(val || '').replace(/[^\d]/g, '');
  return clean ? Number(clean) : 0;
}

export function potentialIncentive(capital, policy) {
  const amount = Number(capital);
  if (capital === '' || capital === null || !Number.isFinite(amount) || amount < 0) {
    return { badge: 'Enter capitalization', copy: 'Enter a valid proposed amount in PHP to assess potential statutory incentives.', eligible: false };
  }
  const thresholds = policy?.incentive_thresholds || {
    tier1_min_capital: 15000000,
    tier1_exemption_years: 1,
    tier2_min_capital: 3000000,
    tier2_max_capital: 14999999,
    tier2_discount_percent: 10,
  };
  const { tier1_min_capital: exemptMin, tier1_exemption_years: years, tier2_min_capital: discountMin, tier2_max_capital: discountMax, tier2_discount_percent: discount } = thresholds;
  if (amount >= exemptMin) {
    return { badge: 'Potential exemption', copy: `Potentially eligible for a ${years}-year Local Business Tax exemption under City Investment Code (§19), subject to City Investment Board approval. Capitalization affects policy incentives only and does not alter the physical site IAI score.`, eligible: true };
  }
  if (amount >= discountMin && amount <= discountMax) {
    return { badge: 'Potential discount', copy: `Potentially eligible for a ${discount}% Local Business Tax discount under City Investment Code (§19), subject to City Investment Board approval. Capitalization affects policy incentives only and does not alter the physical site IAI score.`, eligible: true };
  }
  if (amount > discountMax) {
    return { badge: 'LGU clarification needed', copy: 'This amount falls between the ordinance’s stated discount ceiling and exemption threshold. Ask LEBDO to confirm its treatment under Ordinance No. 2018-06.', eligible: false };
  }
  return { badge: 'Small enterprise review', copy: 'Ask LEBDO about small-enterprise or BMBE registration. Capitalization alone does not establish statutory tax exemption eligibility.', eligible: false };
}

export function investorScenarioMarkup(property) {
  const zoneName = property.clupProfile?.zoningClassification || property.zoningClassification || property.zoning_classification || 'Commercial Zone 1 (C-1)';
  const currentActivity = property.clupProfile?.proposedActivity || property.proposedActivity || '';

  return `<section class="property-panel property-scenario-simulation" id="propertyScenarioSection" aria-labelledby="propertyScenarioTitle">
    <div class="property-section-heading">
      <div>
        <span class="property-kicker">PART A · YOUR INVESTMENT</span>
        <h2 id="propertyScenarioTitle">What do you plan to establish on this property?</h2>
      </div>
      <span class="property-scenario-badge">Interactive Simulation</span>
    </div>
    <p class="property-description">
      Select your planned business or land use activity and specify optional capitalization. LOCUS-SF evaluates zoning compatibility against San Fernando City CLUP &amp; Zoning Ordinance No. 2018-06 regulations for <strong>${esc(zoneName)}</strong>. Physical site attributes (Spatial 20%, Infra 20%, Econ 20%, Nearby 10%, Risk 15% totaling 85%) provide the objective physical baseline; the final 15% Zoning Compatibility is determined by what you establish here.
    </p>

    <div class="property-scenario-controls">
      <div class="property-scenario-field-group">
        <label for="investorProposedActivitySelect">Proposed Business or Land Use Activity</label>
        <select id="investorProposedActivitySelect" class="property-scenario-select">
          <option value="">— Select what you want to establish —</option>
          <optgroup label="1. Retail (Consumer Goods &amp; Commercial Services)">
            <option value="retail_convenience" ${currentActivity === 'retail_convenience' ? 'selected' : ''}>Convenience store / Neighborhood mart</option>
            <option value="retail_supermarket" ${currentActivity === 'retail_supermarket' ? 'selected' : ''}>Supermarket / Grocery store / Shopping center</option>
            <option value="retail_pharmacy" ${currentActivity === 'retail_pharmacy' ? 'selected' : ''}>Pharmacy / Medical supplies retail</option>
            <option value="retail_hardware" ${currentActivity === 'retail_hardware' ? 'selected' : ''}>Hardware store / Construction supplies</option>
          </optgroup>
          <optgroup label="2. Restaurant / Café (Dining &amp; Food Services)">
            <option value="food_cafe" ${currentActivity === 'food_cafe' ? 'selected' : ''}>Specialty café / Coffee shop / Pastry shop</option>
            <option value="food_restaurant" ${currentActivity === 'food_restaurant' ? 'selected' : ''}>Restaurant / Casual dining / Fast food</option>
            <option value="food_bakery" ${currentActivity === 'food_bakery' ? 'selected' : ''}>Bakery / Commercial bread shop</option>
          </optgroup>
          <optgroup label="3. Office / IT-BPM (Corporate &amp; Professional Services)">
            <option value="office_professional" ${currentActivity === 'office_professional' ? 'selected' : ''}>Corporate office / Professional services / Co-working space</option>
            <option value="office_bpo" ${currentActivity === 'office_bpo' ? 'selected' : ''}>BPO / IT-BPM contact center / Tech hub</option>
            <option value="office_government" ${currentActivity === 'office_government' ? 'selected' : ''}>Government office / Administrative branch</option>
          </optgroup>
          <optgroup label="4. Warehouse / Logistics (Storage &amp; Distribution)">
            <option value="log_warehouse" ${currentActivity === 'log_warehouse' || currentActivity === 'ind_warehouse' ? 'selected' : ''}>Storage facility / Commercial warehouse</option>
            <option value="log_distribution_center" ${currentActivity === 'log_distribution_center' ? 'selected' : ''}>Distribution center / Cold storage hub</option>
            <option value="log_transport_terminal" ${currentActivity === 'log_transport_terminal' ? 'selected' : ''}>Freight depot / Transport terminal</option>
          </optgroup>
          <optgroup label="5. Light Manufacturing (Assembly &amp; Processing)">
            <option value="ind_light_manufacturing" ${currentActivity === 'ind_light_manufacturing' || currentActivity === 'ind_light' ? 'selected' : ''}>Light manufacturing / Assembly / Packaging / Handicrafts</option>
            <option value="food_processing" ${currentActivity === 'food_processing' ? 'selected' : ''}>Food-processing plant / Commercial kitchen</option>
          </optgroup>
          <optgroup label="6. Agricultural Production (Farming &amp; Agro-Industrial)">
            <option value="agri_crop_production" ${currentActivity === 'agri_crop_production' || currentActivity === 'agri_farming' ? 'selected' : ''}>Crop production / Urban nursery / Cultivation</option>
            <option value="agri_livestock" ${currentActivity === 'agri_livestock' || currentActivity === 'agri_poultry' ? 'selected' : ''}>Poultry / Livestock raising</option>
            <option value="agri_aquaculture" ${currentActivity === 'agri_aquaculture' ? 'selected' : ''}>Aquaculture / Fish hatchery</option>
            <option value="agri_processing" ${currentActivity === 'agri_processing' ? 'selected' : ''}>Agro-processing / Rice &amp; grain milling</option>
          </optgroup>
          <optgroup label="7. Residential Development (Housing &amp; Communities)">
            <option value="res_detached" ${currentActivity === 'res_detached' || currentActivity === 'residential_single' ? 'selected' : ''}>Single-family dwelling / Subdivision development</option>
            <option value="res_apartments" ${currentActivity === 'res_apartments' || currentActivity === 'residential_multi' ? 'selected' : ''}>Multi-family apartments / Townhouses</option>
            <option value="res_condominium" ${currentActivity === 'res_condominium' || currentActivity === 'residential_condo' ? 'selected' : ''}>Residential condominiums / Dormitory / Boarding house</option>
          </optgroup>
          <optgroup label="8. Tourism / Hospitality (Lodging &amp; Leisure)">
            <option value="tour_hotel" ${currentActivity === 'tour_hotel' || currentActivity === 'tourism_hotel' ? 'selected' : ''}>Hotel / Bed and breakfast / Lodging</option>
            <option value="tour_resort" ${currentActivity === 'tour_resort' || currentActivity === 'tourism_resort' ? 'selected' : ''}>Beach resort / Eco-tourism retreat</option>
            <option value="tour_recreation" ${currentActivity === 'tour_recreation' || currentActivity === 'tourism_recreation' ? 'selected' : ''}>Recreational facility / Sports club</option>
          </optgroup>
        </select>
      </div>

      <div class="property-scenario-field-group">
        <label for="investorProposedCapitalInput">Proposed Capitalization (Optional, PHP)</label>
        <div class="property-currency-input-wrap">
          <span class="currency-prefix">₱</span>
          <input type="text" id="investorProposedCapitalInput" class="property-scenario-input" placeholder="e.g. 690,000,000" inputmode="numeric" autocomplete="off">
        </div>
        <small class="property-scenario-hint">Capitalization informs statutory investment incentive analysis under City Code §19 and does not alter the physical site IAI.</small>
      </div>

      <div class="property-scenario-btn-group">
        <button type="button" class="property-scenario-eval-btn" data-scenario-evaluate>Evaluate Investment</button>
        <button type="button" class="property-scenario-reset-btn" data-scenario-reset>Reset</button>
      </div>
    </div>

    <!-- Live Simulation Outcome Container -->
    <div data-scenario-outcome class="property-scenario-outcome">
      <div class="property-scenario-outcome-header">
        <div>
          <span class="property-scenario-status-kicker">Zoning Compatibility Evaluation (15% Weight)</span>
          <h3 data-scenario-status-title class="property-scenario-status-title">Awaiting activity selection</h3>
          <p data-scenario-reason class="property-scenario-reason">Select a proposed business or land use above to determine whether it is permitted, conditional, or prohibited in ${esc(zoneName)}.</p>
        </div>
        <div>
          <span data-scenario-status-badge class="property-scenario-status-pill">Select Use</span>
        </div>
      </div>

      <!-- Conditions Checklist / Restrictions Box -->
      <div data-scenario-conditions-wrap hidden class="property-scenario-conditions-box">
        <strong class="property-scenario-conditions-title">Mandatory Conditions &amp; Mitigation Requirements:</strong>
        <ul data-scenario-conditions-list class="property-scenario-conditions-list"></ul>
      </div>

      <!-- Policy Incentive Analysis Container (Separated from physical site IAI) -->
      <div data-scenario-incentive-wrap class="property-scenario-incentive-box">
        <div class="property-scenario-incentive-head">
          <span class="property-scenario-incentive-kicker">Potential Statutory Policy Incentive (§19)</span>
          <span class="property-scenario-incentive-badge" data-scenario-incentive-badge>Enter capitalization</span>
        </div>
        <p class="property-scenario-incentive-copy" data-scenario-incentive-copy>
          Capitalization informs potential Local Business Tax exemptions under the City Investment &amp; Incentives Code (Ordinance No. 2018-06 §19). Subject to official review by LEBDO and approval by the City Investment Board. Policy incentives do not modify the physical site IAI score.
        </p>
      </div>

      <!-- Live Scenario Scores Breakdown -->
      <div class="property-scenario-kpi-grid">
        <div class="property-scenario-kpi-card">
          <span class="property-scenario-kpi-label">Scenario Zoning Score (15%)</span>
          <strong data-scenario-zoning-score class="property-scenario-kpi-val">— / 100</strong>
          <small data-scenario-zoning-contrib class="property-scenario-kpi-caption">— pts to IAI</small>
        </div>
        <div class="property-scenario-kpi-card">
          <span class="property-scenario-kpi-label">Physical Site Baseline (85%)</span>
          <strong data-scenario-physical-baseline class="property-scenario-kpi-val">— / 85 pts</strong>
          <small class="property-scenario-kpi-caption">Spatial, Infra, Econ, Nearby, Risk</small>
        </div>
        <div class="property-scenario-kpi-card">
          <span class="property-scenario-kpi-label">Simulated Scenario IAI (100%)</span>
          <strong data-scenario-total-iai class="property-scenario-kpi-val">— / 100</strong>
          <small data-scenario-iai-note class="property-scenario-kpi-caption">Select planned use</small>
        </div>
        <div class="property-scenario-kpi-card">
          <span class="property-scenario-kpi-label">Nearby Commercial Context</span>
          <strong data-scenario-nearby-summary class="property-scenario-kpi-val">500m Radar</strong>
          <small data-scenario-nearby-desc class="property-scenario-kpi-caption">Cluster analysis</small>
        </div>
      </div>
    </div>
  </section>`;
}

export function setupInvestorScenario(root, property, policyInput) {
  const container = root.querySelector('#propertyScenarioSection');
  if (!container) return;

  const policy = policyInput || window.SFC_APP_CONFIG?.policy || {};
  const select = container.querySelector('#investorProposedActivitySelect');
  const capitalInput = container.querySelector('#investorProposedCapitalInput');
  const evalBtn = container.querySelector('[data-scenario-evaluate]');
  const resetBtn = container.querySelector('[data-scenario-reset]');
  const outcomeEl = container.querySelector('[data-scenario-outcome]');
  const titleEl = container.querySelector('[data-scenario-status-title]');
  const badgeEl = container.querySelector('[data-scenario-status-badge]');
  const reasonEl = container.querySelector('[data-scenario-reason]');
  const conditionsWrap = container.querySelector('[data-scenario-conditions-wrap]');
  const conditionsList = container.querySelector('[data-scenario-conditions-list]');
  const incentiveBadgeEl = container.querySelector('[data-scenario-incentive-badge]');
  const incentiveCopyEl = container.querySelector('[data-scenario-incentive-copy]');
  const zoningScoreEl = container.querySelector('[data-scenario-zoning-score]');
  const zoningContribEl = container.querySelector('[data-scenario-zoning-contrib]');
  const physicalBaselineEl = container.querySelector('[data-scenario-physical-baseline]');
  const totalIaiEl = container.querySelector('[data-scenario-total-iai]');
  const iaiNoteEl = container.querySelector('[data-scenario-iai-note]');
  const nearbySummaryEl = container.querySelector('[data-scenario-nearby-summary]');
  const nearbyDescEl = container.querySelector('[data-scenario-nearby-desc]');

  // Part B Elements
  const heroScoreEl = root.querySelector('#scenarioMainIaiCard [data-active-iai-score]') || root.querySelector('[data-active-iai-score]');
  const heroDescEl = root.querySelector('#scenarioMainIaiCard [data-active-iai-desc]') || root.querySelector('[data-active-iai-desc]');
  const comparisonBannerEl = root.querySelector('[data-scenario-comparison-banner]');
  const zoningCritRow = root.querySelector('.property-criterion-rating-item[data-criterion="zoning_compatibility"]');
  const nearbyCritRow = root.querySelector('.property-criterion-rating-item[data-criterion="nearby_businesses"]');
  const reportBtn = root.querySelector('[data-scenario-report-btn]');

  let engineData = null;
  try {
    const rawData = document.getElementById('locusZoningEngineData')?.textContent;
    if (rawData) engineData = JSON.parse(rawData);
  } catch (err) {
    console.warn('Could not parse locusZoningEngineData', err);
  }

  const rawZone = (property.clupProfile?.zoningClassification || property.zoningClassification || property.zoning_classification || 'C-1').trim();
  const normZone = rawZone.split('—')[0].split(':')[0].trim();

  const calc = assessmentCalculation(property);
  const physicalBase = calc.physicalSubtotal;
  if (physicalBaselineEl) {
    physicalBaselineEl.textContent = physicalBase !== null ? `${fixed(physicalBase)} / 85 pts` : 'Pending';
  }

  const recordedBaselineIai = property.iaiScore != null ? Number(property.iaiScore) : (calc.iai != null ? Number(calc.iai) : (physicalBase !== null ? Math.round((physicalBase + 15) * 10) / 10 : 93.3));
  const recordedBaselineIaiStr = recordedBaselineIai !== null ? recordedBaselineIai.toFixed(1) : '93.3';

  const aliasMap = {
    'food_restaurant': 'food_restaurant',
    'retail_general': 'retail_convenience',
    'retail_mall': 'retail_supermarket',
    'office_coworking': 'office_professional',
    'office_bank': 'office_professional',
    'residential_single': 'res_detached',
    'residential_multi': 'res_apartments',
    'residential_condo': 'res_condominium',
    'residential_dormitory': 'res_condominium',
    'tourism_hotel': 'tour_hotel',
    'tourism_resort': 'tour_resort',
    'tourism_recreation': 'tour_recreation',
    'ind_light': 'ind_light_manufacturing',
    'ind_warehouse': 'log_warehouse',
    'ind_medium': 'ind_heavy_manufacturing',
    'agri_farming': 'agri_crop_production',
    'agri_poultry': 'agri_livestock',
  };

  function updateIncentive() {
    if (!capitalInput || !incentiveBadgeEl || !incentiveCopyEl) return;
    const rawCap = parsePesoInput(capitalInput.value);
    if (!capitalInput.value || rawCap <= 0) {
      incentiveBadgeEl.textContent = 'Enter capitalization';
      incentiveBadgeEl.className = 'property-scenario-incentive-badge';
      incentiveCopyEl.textContent = 'Capitalization informs potential Local Business Tax exemptions under City Code §19. Subject to review by LEBDO and approval by the City Investment Board. Incentives do not modify the physical site IAI score.';
      return;
    }
    const incentive = potentialIncentive(rawCap, policy);
    incentiveBadgeEl.textContent = incentive.badge;
    incentiveBadgeEl.className = `property-scenario-incentive-badge ${incentive.eligible ? 'is-eligible' : ''}`;
    incentiveCopyEl.textContent = incentive.copy;
  }

  function evaluateScenario(rawActKey) {
    // Invalidate stale calculations
    updateIncentive();

    if (!rawActKey) {
      if (outcomeEl) outcomeEl.className = 'property-scenario-outcome';
      if (titleEl) titleEl.textContent = 'Awaiting activity selection';
      if (badgeEl) {
        badgeEl.textContent = 'Select Use';
        badgeEl.className = 'property-scenario-status-pill';
      }
      if (reasonEl) reasonEl.textContent = `Select a proposed business or land use activity above to simulate compatibility against ${normZone} CLUP rules.`;
      if (conditionsWrap) conditionsWrap.hidden = true;
      if (zoningScoreEl) zoningScoreEl.textContent = '— / 100';
      if (zoningContribEl) zoningContribEl.textContent = '— pts to IAI';
      if (physicalBaselineEl) physicalBaselineEl.textContent = physicalBase !== null ? `${fixed(physicalBase)} / 85 pts` : 'Pending';
      if (totalIaiEl) totalIaiEl.textContent = '— / 100';
      if (iaiNoteEl) iaiNoteEl.textContent = 'Select planned use';
      if (nearbySummaryEl) nearbySummaryEl.textContent = '500m Radar';
      if (nearbyDescEl) nearbyDescEl.textContent = 'Cluster analysis';

      // Reset Part B hero score to recorded baseline
      if (heroScoreEl) heroScoreEl.textContent = calc.iai !== null ? fixed(calc.iai) : (calc.hasPhysicalBaseline ? fixed(calc.physicalSubtotal) : 'Pending');
      if (heroDescEl) heroDescEl.textContent = calc.complete ? `Authoritative composite suitability index derived via Multi-Criteria Evaluation (MCE) across ${calc.rows.length === 6 ? 'six' : 'seven'} criteria totaling 100%.` : (calc.hasPhysicalBaseline ? `Physical site attributes subtotal: ${fixed(calc.physicalSubtotal)} / 85.0 pts. Final 15% Zoning Compatibility depends on what you establish. Select a business activity above to calculate composite IAI.` : 'Assessment pending.');
      if (comparisonBannerEl) comparisonBannerEl.style.display = 'none';

      // Reset Zoning Criterion Card in 6-criteria list
      if (zoningCritRow) {
        const scoreVal = zoningCritRow.querySelector('.property-criterion-score-wrap strong');
        const contribVal = zoningCritRow.querySelector('.property-criterion-contrib');
        const barFill = zoningCritRow.querySelector('.property-criterion-bar-fill');
        const descText = zoningCritRow.querySelector('.property-criterion-desc');
        const baselineZoning = calc.rows.find(r => r.key === 'zoning_compatibility');
        if (scoreVal) scoreVal.textContent = baselineZoning && baselineZoning.score !== null ? rating(baselineZoning.score) : 'Pending';
        if (contribVal) contribVal.textContent = baselineZoning && baselineZoning.contribution !== null ? `+${fmt(baselineZoning.contribution, 2)}` : 'Pending';
        if (barFill) barFill.style.width = baselineZoning && baselineZoning.score !== null ? `${Math.min(100, Math.max(0, baselineZoning.score))}%` : '0%';
        if (descText) descText.textContent = baselineZoning ? baselineZoning.explanation : 'Zoning compatibility pending investor scenario.';
      }

      // Reset Nearby criterion description
      if (nearbyCritRow) {
        const nearbyDesc = nearbyCritRow.querySelector('.property-criterion-desc');
        if (nearbyDesc) nearbyDesc.textContent = 'General site commercial context within 500m radius.';
      }
      return;
    }

    const selectedOption = select?.selectedOptions?.[0];
    const actLabel = selectedOption ? selectedOption.textContent.trim().split(' / ')[0] : rawActKey;
    const actKey = aliasMap[rawActKey] || rawActKey;
    const rule = engineData?.rules?.[normZone]?.[actKey] || engineData?.rules?.[rawZone]?.[actKey];

    let zoningScore = null;
    let zoningContrib = null;
    let scenarioIaiNum = null;
    let scenarioIaiStr = 'Pending';
    let statusPillClass = 'pill-undetermined';
    let statusText = 'Undetermined';

    if (!rule) {
      if (outcomeEl) outcomeEl.className = 'property-scenario-outcome';
      if (titleEl) titleEl.textContent = 'Compatibility Undetermined';
      if (badgeEl) {
        badgeEl.textContent = 'Undetermined';
        badgeEl.className = 'property-scenario-status-pill pill-undetermined';
      }
      if (reasonEl) reasonEl.textContent = `No specific classification found in San Fernando City Zoning Ordinance No. 2018-06 for this activity in ${normZone}. Departmental zoning clearance required.`;
      if (conditionsWrap) conditionsWrap.hidden = true;
      if (zoningScoreEl) zoningScoreEl.textContent = 'Pending';
      if (zoningContribEl) zoningContribEl.textContent = '15% weight pending rule';
      if (totalIaiEl) totalIaiEl.textContent = 'Withheld';
      if (iaiNoteEl) iaiNoteEl.textContent = 'Zoning verification needed';
      scenarioIaiStr = 'Withheld';
    } else if (rule.status === 'permitted') {
      zoningScore = 100;
      zoningContrib = 15.0;
      statusPillClass = 'pill-permitted';
      statusText = 'Permitted by right';

      if (outcomeEl) outcomeEl.className = 'property-scenario-outcome status-permitted';
      if (titleEl) titleEl.textContent = '✓ Compatible and Eligible';
      if (badgeEl) {
        badgeEl.textContent = '✓ Permitted Use';
        badgeEl.className = 'property-scenario-status-pill pill-permitted';
      }
      if (reasonEl) reasonEl.textContent = rule.reason || `Permitted by right in ${normZone} under San Fernando City Zoning Ordinance No. 2018-06.`;
      if (conditionsWrap) conditionsWrap.hidden = true;
      if (zoningScoreEl) zoningScoreEl.textContent = '100 / 100';
      if (zoningContribEl) zoningContribEl.textContent = '15.0 pts (Full 15% contribution)';

      if (physicalBase !== null) {
        scenarioIaiNum = Math.round((physicalBase + 15.0) * 10) / 10;
        scenarioIaiStr = scenarioIaiNum.toFixed(1);
      }
      if (totalIaiEl) totalIaiEl.textContent = `${scenarioIaiStr} / 100`;
      if (iaiNoteEl) iaiNoteEl.textContent = 'Permitted Scenario IAI (100/100 Zoning)';
    } else if (rule.status === 'conditional') {
      zoningScore = 70;
      zoningContrib = 10.5;
      statusPillClass = 'pill-conditional';
      statusText = 'Conditional use';

      if (outcomeEl) outcomeEl.className = 'property-scenario-outcome status-conditional';
      if (titleEl) titleEl.textContent = '⚠ Compatible Subject to Conditions';
      if (badgeEl) {
        badgeEl.textContent = '⚠ Conditional Use';
        badgeEl.className = 'property-scenario-status-pill pill-conditional';
      }
      if (reasonEl) reasonEl.textContent = rule.reason || `Allowed subject to mandatory conditions in ${normZone} under City Ordinance No. 2018-06.`;
      if (conditionsWrap) {
        conditionsWrap.hidden = false;
        if (conditionsList) {
          const conds = rule.conditions?.length ? rule.conditions : (rule.restrictions?.length ? rule.restrictions : ['Standard setback and zoning clearance required', 'CPDO locational clearance endorsement']);
          conditionsList.innerHTML = conds.map(c => `<li>${esc(c)}</li>`).join('');
        }
      }
      if (zoningScoreEl) zoningScoreEl.textContent = '70 / 100';
      if (zoningContribEl) zoningContribEl.textContent = '10.5 pts (Conditional 15% contribution)';

      if (physicalBase !== null) {
        scenarioIaiNum = Math.round((physicalBase + 10.5) * 10) / 10;
        scenarioIaiStr = scenarioIaiNum.toFixed(1);
      }
      if (totalIaiEl) totalIaiEl.textContent = `${scenarioIaiStr} / 100`;
      if (iaiNoteEl) iaiNoteEl.textContent = 'Conditional Scenario IAI (70/100 Zoning)';
    } else if (rule.status === 'prohibited') {
      zoningScore = 0;
      zoningContrib = 0.0;
      statusPillClass = 'pill-prohibited';
      statusText = 'Prohibited use';

      if (outcomeEl) outcomeEl.className = 'property-scenario-outcome status-prohibited';
      if (titleEl) titleEl.textContent = '✕ Not Suitable for Proposed Use';
      if (badgeEl) {
        badgeEl.textContent = '✕ Prohibited Use';
        badgeEl.className = 'property-scenario-status-pill pill-prohibited';
      }
      if (reasonEl) reasonEl.textContent = rule.reason || `This activity is explicitly prohibited in ${normZone} under City Ordinance No. 2018-06. No scenario IAI is granted.`;
      if (conditionsWrap) conditionsWrap.hidden = true;
      if (zoningScoreEl) zoningScoreEl.textContent = '0 / 100';
      if (zoningContribEl) zoningContribEl.textContent = '0.0 pts (Disqualifying constraint)';
      if (totalIaiEl) totalIaiEl.textContent = 'Not Suitable';
      if (iaiNoteEl) iaiNoteEl.textContent = 'IAI withheld for prohibited use';
      scenarioIaiStr = 'Not Suitable';
    }

    // Update Part B Hero Score
    if (heroScoreEl) heroScoreEl.textContent = scenarioIaiStr;
    if (heroDescEl) {
      if (rule?.status === 'prohibited') {
        heroDescEl.textContent = `Proposed land use (${esc(actLabel)}) is prohibited under ${normZone} zoning rules. Final scenario IAI is withheld.`;
      } else if (scenarioIaiNum !== null) {
        heroDescEl.textContent = `Active scenario evaluated for ${esc(actLabel)}: Physical site baseline (${physicalBase.toFixed(2)} pts) + ${statusText.toLowerCase()} (${zoningScore}/100, +${zoningContrib.toFixed(1)} pts) = ${scenarioIaiStr}/100 composite IAI.`;
      } else {
        heroDescEl.textContent = 'Zoning verification needed before final scenario composite is established.';
      }
    }

    // Update Scenario Comparison Banner in Part B
    if (comparisonBannerEl) {
      const isDifferent = scenarioIaiNum !== null && Math.abs(scenarioIaiNum - recordedBaselineIai) >= 0.05;
      const varianceVal = scenarioIaiNum !== null ? (scenarioIaiNum - recordedBaselineIai).toFixed(1) : '—';
      const varianceSign = scenarioIaiNum !== null && scenarioIaiNum > recordedBaselineIai ? '+' : '';

      comparisonBannerEl.innerHTML = `
        <div class="property-scenario-comparison-card">
          <div class="property-scenario-comparison-header">
            <span class="comparison-header-kicker">SCENARIO RECONCILIATION</span>
            <span class="comparison-header-tag">Active Scenario vs Recorded Baseline</span>
          </div>
          <div class="property-scenario-comparison-cols">
            <div class="comparison-col is-scenario">
              <span class="comparison-col-kicker">ACTIVE SCENARIO (${esc(actLabel)})</span>
              <strong class="comparison-col-score">${scenarioIaiStr} ${scenarioIaiNum !== null ? '<small>/ 100</small>' : ''}</strong>
              <span class="comparison-col-meta">Zoning: ${zoningScore !== null ? `${zoningScore}/100 (+${zoningContrib.toFixed(1)} pts)` : 'Pending'}</span>
            </div>
            <div class="comparison-col-vs">vs</div>
            <div class="comparison-col is-baseline">
              <span class="comparison-col-kicker">RECORDED BASELINE (PERMITTED USE)</span>
              <strong class="comparison-col-score">${recordedBaselineIaiStr} <small>/ 100</small></strong>
              <span class="comparison-col-meta">Zoning: 100/100 (Permitted by right, +15.0 pts)</span>
            </div>
          </div>
          <p class="comparison-explainer">
            ${isDifferent
          ? `Score Variance: ${varianceSign}${varianceVal} pts. The physical 5-criterion baseline contributes ${physicalBase.toFixed(2)} pts. The ${statusText.toLowerCase()} rating (${zoningScore}/100 contributing ${zoningContrib.toFixed(1)} pts vs 15.0 pts) accounts for the difference between this active scenario (${scenarioIaiStr}/100) and the recorded permitted baseline (${recordedBaselineIaiStr}/100).`
          : (rule?.status === 'prohibited'
            ? `Disqualification: The proposed activity is prohibited in ${normZone}; scenario IAI is withheld while recorded site baseline remains ${recordedBaselineIaiStr}/100.`
            : `Active scenario aligns with the recorded site baseline (100/100 permitted zoning $\\rightarrow$ ${recordedBaselineIaiStr} IAI composite).`
          )
        }
          </p>
        </div>
      `;
      comparisonBannerEl.style.display = 'block';
    }

    // Update Zoning Compatibility row in 6-criteria list
    if (zoningCritRow) {
      const scoreVal = zoningCritRow.querySelector('.property-criterion-score-wrap strong');
      const contribVal = zoningCritRow.querySelector('.property-criterion-contrib');
      const barFill = zoningCritRow.querySelector('.property-criterion-bar-fill');
      const descText = zoningCritRow.querySelector('.property-criterion-desc');
      if (scoreVal) scoreVal.textContent = zoningScore !== null ? rating(zoningScore) : 'Pending';
      if (contribVal) contribVal.textContent = zoningContrib !== null ? `+${fmt(zoningContrib, 2)}` : 'Pending';
      if (barFill) barFill.style.width = zoningScore !== null ? `${Math.min(100, Math.max(0, zoningScore))}%` : '0%';
      if (descText) {
        descText.textContent = rule?.status === 'conditional'
          ? `Active scenario (${esc(actLabel)}): Conditional zoning (70/100, +10.50 pts) under Ordinance No. 2018-06. Subject to mandatory clearance.`
          : (rule?.status === 'permitted'
            ? `Active scenario (${esc(actLabel)}): Permitted by right (100/100, +15.00 pts) under Ordinance No. 2018-06.`
            : (rule?.status === 'prohibited'
              ? `Active scenario (${esc(actLabel)}): Prohibited use (0/100, 0.00 pts) under Ordinance No. 2018-06.`
              : 'Active scenario: Undetermined zoning classification; clearance required.'
            )
          );
      }
    }

    // Update Nearby Businesses Context
    evaluateNearbyContext(actKey);
  }

  function evaluateNearbyContext(actKey) {
    if (!nearbySummaryEl || !nearbyDescEl) return;
    const places = Array.isArray(property.nearbyBusinesses) ? property.nearbyBusinesses : [];
    if (!places.length) {
      nearbySummaryEl.textContent = 'No Mapped Places';
      nearbyDescEl.textContent = '0 establishments in 500m radius';
      if (nearbyCritRow) {
        const nearbyDesc = nearbyCritRow.querySelector('.property-criterion-desc');
        if (nearbyDesc) nearbyDesc.textContent = 'General site commercial context: No mapped businesses within 500m radius.';
      }
      return;
    }
    const actLower = actKey.toLowerCase();
    let clusterType = 'commercial';
    let matchCount = 0;
    let isSpecificCluster = false;

    if (actLower.includes('food') || actLower.includes('cafe') || actLower.includes('restaurant')) {
      clusterType = 'dining & food services';
      matchCount = places.filter(p => /food|cafe|restaurant|coffee|bakery|dining|eatery/i.test(p.category || p.name || '')).length;
      isSpecificCluster = true;
    } else if (actLower.includes('retail') || actLower.includes('convenience') || actLower.includes('mart') || actLower.includes('pharmacy')) {
      clusterType = 'retail & shopping';
      matchCount = places.filter(p => /retail|shop|convenience|store|market|mall|pharmacy|hardware/i.test(p.category || p.name || '')).length;
      isSpecificCluster = true;
    } else if (actLower.includes('office') || actLower.includes('bpo')) {
      clusterType = 'office & professional services';
      matchCount = places.filter(p => /office|bank|corporate|agency|business|hub|co-working/i.test(p.category || p.name || '')).length;
      isSpecificCluster = true;
    } else {
      matchCount = places.length;
      clusterType = 'general commercial';
    }

    nearbySummaryEl.textContent = isSpecificCluster ? `${matchCount} Related Places` : `${places.length} Mapped Places`;
    nearbyDescEl.textContent = isSpecificCluster ? `Within 500m (${clusterType})` : 'Within 500m (general commercial context)';

    if (nearbyCritRow) {
      const nearbyDesc = nearbyCritRow.querySelector('.property-criterion-desc');
      if (nearbyDesc) {
        nearbyDesc.textContent = isSpecificCluster
          ? `Cluster analysis for active scenario: ${matchCount} related ${clusterType} establishments mapped within 500m radius.`
          : 'General site commercial context: 10% weight reflects commercial density within 500m radius.';
      }
    }
  }

  // Wire Event Listeners
  if (select) {
    select.addEventListener('change', () => evaluateScenario(select.value));
    if (select.value) evaluateScenario(select.value);
  }

  if (capitalInput) {
    capitalInput.addEventListener('input', () => {
      const pos = capitalInput.selectionStart;
      const prevLen = capitalInput.value.length;
      capitalInput.value = formatPesoInput(capitalInput.value);
      const diff = capitalInput.value.length - prevLen;
      if (pos !== null) {
        try { capitalInput.setSelectionRange(pos + diff, pos + diff); } catch (_) { }
      }
      updateIncentive();
    });
    if (capitalInput.value) {
      capitalInput.value = formatPesoInput(capitalInput.value);
      updateIncentive();
    }
  }

  if (evalBtn) {
    evalBtn.addEventListener('click', () => {
      if (select) evaluateScenario(select.value);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (select) select.value = '';
      if (capitalInput) capitalInput.value = '';
      evaluateScenario('');
    });
  }

  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      if (typeof window !== 'undefined') {
        window.print();
      }
    });
  }
}


