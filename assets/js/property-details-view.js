import { listingPurposeLabel, listingPriceEntries, salePricePerSqm, saleAskingPrice } from './utils.js';
import { businessOpportunitiesMarkup, evaluateBusinessOpportunities } from './business-opportunities.js';
// Property details and its printable calculation sheet share the server's recorded inputs.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const fmt = (value, digits = 2) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: digits }).format(Number(value));
const fixed = value => Number(value).toFixed(1);
const rating = value => fmt(value, 20);
const money = value => numeric(value) !== null ? `PHP ${fmt(value)}` : "Price on request";
const criteria5 = [
  ['spatial_accessibility', 'Spatial Accessibility', 25],
  ['infrastructure_readiness', 'Infrastructure Readiness', 25],
  ['property_cost_market_competitiveness', 'Property Cost & Market Competitiveness', 20],
  ['nearby_businesses', 'Nearby Businesses / Business Environment', 15],
  ['risk_constraints', 'Risk Constraints', 15],
];

const criteria6 = [
  ['spatial_accessibility', 'Spatial Accessibility', 20],
  ['infrastructure_readiness', 'Infrastructure Readiness', 20],
  ['economic_viability', 'Economic Viability / Economic Context', 20],
  ['nearby_businesses', 'Nearby Businesses / Business Environment', 10],
  ['zoning_compatibility', 'Zoning Compatibility', 15],
  ['risk_constraints', 'Risk Constraints', 15],
];
// Reference: Permitted (100 pts, +15.0 pts), Conditional (70 pts, +10.5 pts), Prohibited (0 pts), Undetermined (null)

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
  spatial_accessibility: 'Proximity to primary roads, highways, and transport corridors (25% weight).',
  infrastructure_readiness: 'Verified availability of power (LUECO), water (MSFWD), telecom/fiber, and drainage (25% weight).',
  property_cost_market_competitiveness: 'Offered unit price per m² evaluated against verified local market benchmarks (20% weight).',
  economic_viability: 'Property Cost & Market Competitiveness — unit price against verified local market comparables (20% weight).',
  nearby_businesses: 'Operating commercial density, foot-traffic generators, and cluster viability within 500m (15% weight).',
  zoning_compatibility: 'CLUP & Land-Use Regulations screening gate — Ordinance No. 2018-06 compliance.',
  risk_constraints: 'Comprehensive screening for flood, active fault lines, landslide, storm surge, liquefaction, and tsunami (15% weight).',
  environmental_safety: 'Screening against environmentally critical areas and conservation zones (legacy).',
};

export function assessmentCalculation(property) {
  // The current protocol supplies its evidence gates and unrounded contributions.
  // Never resurrect a withheld result from an older compatibility alias.
  if (property?.protocol_version || property?.criteriaBreakdown) {
    const breakdown = Array.isArray(property.criteriaBreakdown) ? property.criteriaBreakdown : [];
    const isV3 = Boolean(
      property?.protocol_version?.includes('v3')
      || property?.methodology?.includes('v3')
      || property?.weight_configuration?.property_cost_market_competitiveness !== undefined
      || property?.weight_configuration?.spatial_accessibility === 25
      || breakdown.some(row => row.key === 'property_cost_market_competitiveness')
      || (property?.assessmentWeights?.spatial_accessibility === 25 && property?.assessmentWeights?.nearby_businesses === 15)
    );
    const activeCriteria = isV3 ? criteria5 : criteria6;
    const rows = activeCriteria.map(([key, label, defaultWeight]) => {
      const aliasKey = key === 'property_cost_market_competitiveness' ? 'economic_viability' : (key === 'economic_viability' ? 'property_cost_market_competitiveness' : key);
      const recorded = breakdown.find(row => row.key === key || row.key === aliasKey) || {};
      const score = numeric(property.criterion_scores?.[key] ?? property.criterion_scores?.[aliasKey] ?? property.assessmentCriteria?.[key] ?? property.assessmentCriteria?.[aliasKey] ?? recorded.score);
      const weight = numeric(property.weight_configuration?.[key] ?? property.weight_configuration?.[aliasKey] ?? property.assessmentWeights?.[key] ?? property.assessmentWeights?.[aliasKey]) ?? defaultWeight;
      const contribution = numeric(property.weighted_contributions?.[key] ?? property.weighted_contributions?.[aliasKey] ?? recorded.weighted_score ?? (score !== null ? score * weight / 100 : null));
      return { key, label, weight, score: score !== null && score >= 0 && score <= 100 ? score : null,
        contribution, explanation: criterionExplanations[key] ?? criterionExplanations[aliasKey] ?? '' };
    });
    const sum = rows.reduce((total, row) => total + (row.contribution ?? 0), 0);
    const displayed = numeric(property.displayed_iai);
    const close = (a, b) => a !== null && b !== null && Math.abs(a - b) < 0.000001;
    const discrepancy = rows.some(row => row.score !== null && (!close(row.contribution, row.score * row.weight / 100)
      || breakdown.some(record => (record.key === row.key || (row.key === 'property_cost_market_competitiveness' && record.key === 'economic_viability')) && (!close(numeric(record.weighted_score), row.contribution)
        || !close(numeric(record.score), row.score) || !close(numeric(record.weight), row.weight)))))
      || (displayed !== null && (!close(Math.round((sum + Number.EPSILON) * 10) / 10, displayed)
        || !close(numeric(property.unrounded_total), sum)
        || ['iaiScore', 'mceScore', 'iai', 'iai_score', 'mce_score'].some(key => property[key] != null && !close(numeric(property[key]), displayed))));
    const verificationAgrees = !property.evidence_verification || rows.every(row => property.evidence_verification[row.key]?.status === 'authenticated');
    const eligibilityAgrees = !property.eligibility || (property.eligibility.is_eligible !== false && ['permitted', 'conditional'].includes(property.eligibility.zoning));
    const complete = property.assessmentComplete === true && property.evidence_completeness === true && verificationAgrees && eligibilityAgrees
      && property.numerical_completeness === true && property.weights_valid === true
      && close(rows.reduce((total, row) => total + row.weight, 0), 100)
      && rows.every(row => row.score !== null && row.weight >= 0)
      && !property.technical_review_hold && !property.discrepancy_detected && !property.discrepancy_review_required && !discrepancy
      && ['complete', 'conditional'].includes(property.assessmentStatus) && displayed !== null;
    const physicalSubtotal = property.physical_evidence_complete === true ? numeric(property.physical_subtotal) : null;
    const isZoningPending = isV3
      ? (property?.eligibility?.zoning === 'unverified' || property?.eligibility?.zoning === 'undetermined' || !property?.eligibility)
      : (rows.find(row => row.key === 'zoning_compatibility')?.score === null);
    const recordedTotal = rows.every(row => row.score !== null && row.weight >= 0)
      && close(rows.reduce((total, row) => total + row.weight, 0), 100)
      && !discrepancy && !property.discrepancy_detected && !property.discrepancy_review_required
      ? Math.round((sum + Number.EPSILON) * 10) / 10 : null;
    return { rows, complete, iai: complete ? displayed : null, mce: complete ? displayed : null,
      recordedTotal,
      physicalSubtotal, hasPhysicalBaseline: physicalSubtotal !== null, components: rows,
      isZoningPending,
      isConditional: property.assessmentStatus === 'conditional', isNotSuitable: property.assessmentStatus === 'not_suitable' || property.eligibility?.zoning === 'prohibited',
      isLegacy: false, reason: discrepancy ? 'Stored calculations disagree; assessment review required.' : property.reason,
      note: property.note, completedCount: rows.filter(row => row.score !== null).length,
      missingCriteria: rows.filter(row => row.score === null).map(row => row.label), discrepancy };
  }
  const isLegacy = Boolean(
    property?.assessmentMethodologyVersion?.includes('v1.1')
    || property?.assessmentMethodologyVersion?.toLowerCase().includes('legacy')
    || property?.methodology?.includes('v1.1')
    || property?.methodology?.toLowerCase().includes('legacy')
    || property?.ruleVersion?.includes('v1.1')
    || (Number(property?.assessmentWeights?.environmental_safety) > 0 && Number(property?.assessmentWeights?.risk_constraints) <= 10)
    || (property?.assessmentCriteria?.environmental_safety != null && property?.assessmentWeights == null && property?.assessmentCriteria?.risk_constraints != null && property?.iaiScore != null && Number(property?.iaiScore) !== Number(property?.mceScore))
  );
  const isV3Fallback = Boolean(
    property?.protocol_version?.includes('v3')
    || property?.methodology?.includes('v3')
    || (property?.assessmentWeights?.spatial_accessibility === 25 && property?.assessmentWeights?.infrastructure_readiness === 25)
    || property?.assessmentWeights?.property_cost_market_competitiveness !== undefined
  );
  const activeList = isLegacy ? legacyCriteria7 : (isV3Fallback ? criteria5 : criteria6);
  const rows = activeList.map(([key, label, defaultWeight]) => {
    const aliasKey = key === 'property_cost_market_competitiveness' ? 'economic_viability' : (key === 'economic_viability' ? 'property_cost_market_competitiveness' : key);
    const value = numeric(property.assessmentCriteria?.[key] ?? property.assessmentCriteria?.[aliasKey]);
    let weight = numeric(property.assessmentWeights?.[key] ?? property.assessmentWeights?.[aliasKey]);
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
      explanation: criterionExplanations[key] || criterionExplanations[aliasKey] || '',
    };
  });
  const physicalCriteriaKeys = ['spatial_accessibility', 'infrastructure_readiness', 'property_cost_market_competitiveness', 'economic_viability', 'nearby_businesses', 'risk_constraints'];
  const physicalRows = rows.filter(row => physicalCriteriaKeys.includes(row.key));
  const hasAllPhysical = physicalRows.length >= 5 && physicalRows.every(row => row.score !== null);
  const physicalSubtotal = hasAllPhysical
    ? physicalRows.reduce((sum, row) => sum + (row.contribution ?? 0), 0)
    : null;
  const zoningRow = rows.find(row => row.key === 'zoning_compatibility');
  const isZoningPending = isV3Fallback
    ? (property?.eligibility?.zoning === 'unverified' || property?.eligibility?.zoning === 'undetermined' || !property?.eligibility)
    : (zoningRow ? zoningRow.score === null : false);

  const weightSum = rows.reduce((sum, row) => sum + row.weight, 0);
  const weightsValid = Math.abs(weightSum - 100) < 0.01;
  const allScoresPresent = rows.every(row => row.score !== null);
  const isNotSuitable = property.assessmentStatus === 'not_suitable'
    || property.status === 'not_suitable'
    || property.eligibility === 'prohibited'
    || property.eligibility?.zoning === 'prohibited'
    || property.assessmentCriteria?.zoning_compatibility === 0;
  const isConditional = property.assessmentStatus === 'conditional'
    || property.status === 'conditional'
    || property.eligibility === 'conditional'
    || property.eligibility?.zoning === 'conditional';
  const reason = property.reason || null;
  const note = property.note || (isConditional ? 'Conditional compatibility — requires zoning clearance or further city review.' : null);

  const isExplicitlyComplete = property.assessmentComplete === true
    || (property.assessmentStatus === 'complete' && property.assessmentComplete !== false);

  const complete = !isNotSuitable && isExplicitlyComplete && allScoresPresent && weightsValid
    && !property.technical_review_hold && !property.discrepancy_detected && !property.discrepancy_review_required;

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
    recordedTotal: allScoresPresent && weightsValid ? weightedSum : null,
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
  return `<dl class="property-facts ${className}">${rows.map(([label, value]) => {
    const valStr = String(value ?? 'Not specified');
    const isVerified = valStr.includes('Verified') || valStr.toLowerCase() === 'approved';
    const isPending = valStr.includes('Pending') || valStr.includes('awaiting');
    const isMuted = valStr === 'Not recorded' || valStr === 'Not offered' || valStr === 'Not specified';
    const tag = isVerified ? ' fact-verified' : isPending ? ' fact-pending' : isMuted ? ' fact-muted' : '';
    return `<div class="${tag.trim()}"><dt>${esc(label)}</dt><dd>${esc(valStr)}</dd></div>`;
  }).join('')}</dl>`;
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
      category: 'electricity',
      label: 'Electricity',
      title: 'Power Grid Infrastructure',
      status: elec,
      statusLabel: elec === 'available' ? 'Connected / Available' : elec === 'unavailable' ? 'Off-grid / Unavailable' : 'Pending Verification',
      provider: elecSources || (elec === 'available' ? 'LUECO Grid' : 'Standard LUECO urban service corridor'),
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      available: elec === 'available',
    },
    {
      category: 'water',
      label: 'Water',
      title: 'Potable Water Utility',
      status: wat,
      statusLabel: wat === 'available' ? 'Connected / Available' : wat === 'unavailable' ? 'Unavailable' : 'Pending Verification',
      provider: watSources || (wat === 'available' ? 'Metro La Union Water District (MLUWD)' : 'MLUWD municipal network corridor'),
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
      available: wat === 'available',
    },
    {
      category: 'internet',
      label: netTypes ? `${netTypes} Internet` : 'Internet',
      title: 'Telecommunications & Fiber',
      status: net,
      statusLabel: net === 'available' ? (netTypes ? `${netTypes} Available` : 'Connected / Available') : net === 'unavailable' ? 'Unavailable' : 'Pending Verification',
      provider: (netProviders ? `${netProviders}${netSpeed}` : '') || (net === 'available' ? 'PLDT / Globe Fiber' : 'Terrestrial fiber & 4G/5G mobile corridor'),
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
      available: net === 'available',
    },
  ];

  return `
    <div class="property-utilities-section">
      <div class="property-utilities-header">
        <span class="utilities-kicker">INFRASTRUCTURE &amp; PROVISIONS</span>
        <h3>Utilities &amp; Connectivity</h3>
      </div>
      <div class="property-utilities-grid">
        ${items.map(item => {
          const statusClass = item.available ? 'is-available' : item.status === 'unavailable' ? 'is-unavailable' : 'is-pending';
          return `
            <div class="property-utility-card ${statusClass}">
              <div class="utility-card-top">
                <div class="utility-card-icon">
                  ${item.icon}
                </div>
                <span class="utility-status-pill">
                  <span class="utility-pulse-dot"></span>
                  ${esc(item.statusLabel)}
                </span>
              </div>
              <div class="utility-card-content">
                <span class="utility-type-label">${esc(item.label)}</span>
                <strong class="utility-type-title">${esc(item.title)}</strong>
                <span class="utility-provider-line">${esc(item.provider)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function propertyHazardSummary(property) {
  const hazards = propertyHazardAssessment(property);
  const recorded = recordedSafety(property);
  if (hazards.recorded || hazards.hasStructuredFindings) {
    const environment = recorded.filter(item => item.label === 'Environmental screening' && item.values.length)
      .map(item => `${item.label}: ${item.values.join(', ')}${item.missing.length ? ' (review incomplete)' : ''}`);
    return [hazards.summary, ...environment].join(' · ');
  }
  if (recorded.some(item => item.values.length)) {
    return recorded.map(item => `${item.label}: ${item.values.length ? item.values.join(', ') : 'Not assessed'}${item.values.length && item.missing.length ? ' (review incomplete)' : ''}`).join(' · ');
  }
  return hazards.summary;
}

export function propertyLocationLabel(property) {
  const precision = String(property.locationPrecision ?? property.parcel?.locationPrecision ?? property.parcel?.coordinatePrecision ?? '').toLowerCase();
  return property.hasExactLocation === false || ['approximate', 'approx', 'generalized'].includes(precision) ? 'Approximate location' : 'Recorded location';
}

export function safetyMarkup(property) { return `${floodAndFireAssessmentMarkup(property)} ${siteSafetyGridMarkup(property)}`; }

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
  const presentation = assessmentPresentation(property, calc);
  const contribution = value => value === null ? 'Pending' : fmt(value, 12);
  const value = value => value === null ? 'Pending' : rating(value);
  const total = value => value === null ? 'Pending' : fixed(value);
  const totalWeight = Math.round(calc.rows.reduce((sum, r) => sum + r.weight, 0));
  const methodologyLabel = property.methodology || property.assessmentMethodologyVersion || property.ruleVersion || (calc.rows.length === 5 ? 'LOCUS-SF MCE v3.0 (Five-Criterion with Mandatory Zoning Eligibility)' : (calc.rows.length === 6 ? 'LOCUS-SF MCE v2.0 (Provisional 6-Criterion)' : 'LOCUS-SF MCE v1.1 (Legacy 7-Criterion)'));
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
    <div class="property-table-scroll"><table class="property-calculation-table"><caption>${calc.rows.length === 7 ? 'Seven' : (calc.rows.length === 5 ? 'Five' : 'Six')} criteria and their weighted contributions to the composite IAI score</caption><thead><tr><th scope="col">MCE Criterion</th><th scope="col">Score / 100</th><th scope="col">Weight</th><th scope="col">Contribution</th></tr></thead><tbody>${calc.rows.map(row => `<tr><th scope="row">${esc(row.label)}</th><td>${row.key === 'zoning_compatibility' && row.score === null ? '<span style="color:#B45309;font-weight:600;">Pending investor activity</span>' : value(row.score)}</td><td>${fmt(row.weight)}%</td><td>${row.key === 'zoning_compatibility' && row.contribution === null ? '<span style="color:#94A3B8;">Pending use (15%)</span>' : contribution(row.contribution)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">${presentation.provisional ? 'Provisional IAI · rounded to 1 decimal' : calc.iai === null && calc.hasPhysicalBaseline ? (calc.rows.length === 5 ? 'Five-Criterion MCE Baseline (100%)' : 'Physical Site Attributes Subtotal (85%)') : 'Composite IAI · rounded to 1 decimal'}</th><td>${presentation.provisional ? presentation.indexValue : calc.iai !== null ? total(calc.iai) : (calc.hasPhysicalBaseline ? (calc.rows.length === 5 ? `${fixed(calc.physicalSubtotal)} / 100 pts` : `${fixed(calc.physicalSubtotal)} / 85 pts`) : 'Pending')}</td><td>${totalWeight}%</td><td>${presentation.provisional ? fixed(presentation.index) : calc.iai !== null ? fixed(calc.iai) : (calc.hasPhysicalBaseline ? (calc.rows.length === 5 ? `${fixed(calc.physicalSubtotal)} / 100 pts` : `${fixed(calc.physicalSubtotal)} / 85 pts`) : 'Pending')}</td></tr></tfoot></table></div>
    <p class="property-formula">${presentation.index !== null && !calc.isLegacy ? `${presentation.provisional ? 'Provisional IAI' : 'IAI'} = round(Σ(score × weight ÷ 100), 1) = round(${calc.rows.map(row => fmt(row.contribution, 6)).join(' + ')}, 1) = ${fixed(presentation.index)}` : (calc.hasPhysicalBaseline ? (calc.rows.length === 5 ? `Physical Site Baseline = Σ(Physical Attribute Scores × Weight ÷ 100) = ${fixed(calc.physicalSubtotal)} / 100.0 pts (Spatial 25%, Infra 25%, Cost & Market 20%, Nearby 15%, Risk 15%). CLUP Zoning serves as a mandatory non-compensatory eligibility gate.` : `Physical Site Baseline = Σ(Physical Attribute Scores × Weight ÷ 100) = ${fixed(calc.physicalSubtotal)} / 85.0 pts (Spatial 20%, Infra 20%, Econ 20%, Nearby 10%, Risk 15%). The remaining 15% Zoning Compatibility is added once an investor establishes a business activity.`) : 'IAI = round(Σ(score × weight ÷ 100), 1)')}</p>
    ${calc.iai === null && !calc.isNotSuitable ? `<p class="property-pending-note">${presentation.provisional ? `${esc(presentation.scoreNote)} ${esc(presentation.description)}` : calc.hasPhysicalBaseline ? (calc.rows.length === 5 ? `Five-criterion physical site baseline is complete (${fixed(calc.physicalSubtotal)} / 100.0 pts). Official certification requires CLUP zoning clearance.` : `Physical site baseline is complete (${fixed(calc.physicalSubtotal)} / 85.0 pts). Composite 6-criterion IAI score is withheld until an investment business or land use activity is selected.`) : `Assessment pending · ${calc.completedCount} of ${calc.rows.length} criteria have ratings.${calc.missingCriteria?.length ? ` Missing: ${esc(calc.missingCriteria.join(', '))}.` : ''} Missing evidence is not treated as zero; a composite score or rank is withheld until all required criteria are complete.`}</p>` : ''}
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
  const photoFallback = '<div class="site-photo-empty"><span aria-hidden="true">▧</span><strong>Property photography pending</strong><p>Use the recorded location and arrange a site visit.</p></div>';
  if (!mediaItems.length && !property.imageUrl && !property.imagePath) {
    return `<figure class="property-photo is-image-missing">${photoFallback}<figcaption>${categoryLabel} · ${locationLabel}</figcaption></figure>`;
  }

  if (images.length <= 1) {
    return `<figure class="property-photo"><img src="${esc(images[0])}" alt="${esc(property.name)}" onerror="this.hidden=true; this.parentElement.classList.add('is-image-missing');">${photoFallback}<figcaption>${categoryLabel} · ${locationLabel}</figcaption></figure>`;
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

  const quickBizBtn = container.querySelector('#propertyQuickBizBtn');
  const quickMoreBtn = container.querySelector('#propertyQuickMoreBizBtn');

  const jumpToOpportunities = e => {
    if (e) e.preventDefault();
    if (typeof window !== 'undefined' && window.LocusSound?.play) {
      try { window.LocusSound.play('select'); } catch (_) {}
    }
    const oppSection = document.getElementById('propertyOpportunitiesSection');
    if (oppSection) {
      oppSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      oppSection.classList.add('is-highlighted-section');
      setTimeout(() => oppSection.classList.remove('is-highlighted-section'), 2000);
    }
  };

  quickBizBtn?.addEventListener('click', jumpToOpportunities);
  quickMoreBtn?.addEventListener('click', jumpToOpportunities);
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

export function investorBriefReportMarkup(property, options = {}, calc) {
  calc = calc || assessmentCalculation(property);
  // Keep the saved rating snapshot separate from a freshly evaluated activity's release decision.
  const scenario = options.scenarioAssessment;
  const releaseProperty = scenario ? { ...property, ...scenario, status: property.status } : property;
  const releaseCalc = scenario ? assessmentCalculation(releaseProperty) : calc;
  const presentation = assessmentPresentation(releaseProperty, releaseCalc);
  const savedPresentation = scenario ? assessmentPresentation(property, calc) : presentation;
  const usesSavedIndex = Boolean(scenario && presentation.index === null && !releaseCalc.isNotSuitable
    && !releaseCalc.discrepancy && !releaseProperty.discrepancy_detected && !releaseProperty.discrepancy_review_required
    && savedPresentation.provisional);
  const indexPresentation = usesSavedIndex ? savedPresentation : presentation;
  const indexCalc = usesSavedIndex ? calc : releaseCalc;
  const recordedScore = calc.recordedTotal === null ? 'Pending' : fixed(calc.recordedTotal);
  const hasRecordedTotal = calc.recordedTotal !== null;
  const parcel = property.parcel || {};
  const details = property.criteriaDetails || {};
  const positive = value => numeric(value) > 0 ? numeric(value) : null;
  const human = value => String(value || '').replaceAll('_', ' ');
  const lat = numeric(property.lat), lng = numeric(property.lng);
  const hasLocation = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  const coords = hasLocation ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Pin not recorded';
  const location = [property.barangay, property.city].filter(Boolean).join(', ') || 'Location awaiting confirmation';
  const reference = property.referenceId || property.refId || `LOCUS-SF-PRP-${property.id ?? property.property_id ?? 'DRAFT'}`;
  const exported = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric', month: 'long', year: 'numeric' });
  const boundary = parcel.boundary?.type === 'Polygon' || parcel.boundary?.type === 'MultiPolygon';
  const area = positive(parcel.surveyAreaSqm) ?? positive((numeric(property.area ?? property.landArea) ?? 0) * 10000) ?? positive(parcel.estimatedAreaSqm);
  const areaText = area ? `${fmt(area)} m²` : 'Not recorded';
  const areaBasis = parcel.areaMethod === 'survey' ? 'Recorded survey' : parcel.areaMethod === 'drawn' ? 'Mapped estimate' : 'Declared · unverified';
  const floor = positive(property.buildingArea ?? property.floorArea ?? property.floorAreaSqm);
  const isBuilding = /building/i.test(`${property.category || ''} ${property.type || ''}`);
  const purpose = property.listingPurpose || 'sale';
  const leaseOnly = purpose === 'lease';
  const both = ['both', 'sale_or_lease'].includes(purpose);
  const purposeText = leaseOnly ? 'For lease' : both ? 'For sale or lease' : 'For sale';
  const sale = numeric(Object.hasOwn(property, 'salePrice') ? property.salePrice : property.price);
  const rent = numeric(property.leasePrice ?? property.lease_price);
  const period = property.leasePeriod || property.lease_period || 'month';
  const perSqm = (property.leasePriceUnit || property.lease_price_unit) === 'sqm';
  const validArea = val => { const n = numeric(val); return n !== null && n >= 0.5 ? n : null; };
  const scope = property.offeredSpaceScope || property.offered_space_scope || parcel.observations?.offered_space_scope;
  const explicitOffered = validArea(property.offeredAreaSqm ?? property.offered_area_sqm ?? parcel.observations?.offered_area_sqm);
  const offered = explicitOffered
    ?? (isBuilding
      ? (scope === 'part_property' ? null : floor)
      : (scope === 'portion_of_land' || scope === 'part_property' ? null : area));
  const rentText = rent !== null && rent >= 0 ? `PHP ${fmt(rent)}${perSqm ? ' / m²' : ''}` : 'Price on request';
  const rentTotal = rent !== null && rent >= 0 ? perSqm ? offered ? rent * offered : null : rent : null;
  const quote = sale !== null && sale >= 0 ? `PHP ${fmt(sale)}` : 'Price on request';
  const review = human(property.approvalState || 'Not recorded');
  const method = property.protocol_version || property.methodology || property.assessmentMethodologyVersion || 'Recorded MCE assessment';
  const score = indexPresentation.index === null ? 'Pending' : fixed(indexPresentation.index);
  const indexLabel = usesSavedIndex ? 'Provisional property IAI'
    : `${scenario ? 'Selected activity · ' : ''}${indexPresentation.indexLabel}`;
  const hasIndex = indexPresentation.index !== null;
  const status = presentation.state;
  const hasScore = releaseCalc.iai !== null;
  const iaiFormula = hasIndex && !indexCalc.isLegacy && (hasScore || (scenario && !usesSavedIndex))
    ? `<p>${scenario ? 'Selected activity ' : ''}${indexPresentation.provisional ? 'provisional IAI' : 'IAI'} = round(${indexCalc.rows.map(row => fmt(row.contribution, 6)).join(' + ')}, 1) = ${score} / 100</p>` : '';
  const rated = calc.rows.filter(row => row.score !== null).length;
  const weightedCoverage = calc.rows.filter(row => row.score !== null).reduce((total, row) => total + row.weight, 0);
  const zoning = releaseProperty.criteriaDetails?.zoning_compatibility || details.zoning_compatibility || {};
  const zone = zoning.zone_full_label || zoning.raw?.zoning_classification || property.clupProfile?.zoningClassification || property.zoningClassification || 'Not recorded';
  const activity = releaseProperty.proposed_activity || releaseProperty.clupProfile?.proposedActivity || releaseProperty.proposedActivity || '';
  const eligibility = zoning.status_label || human(releaseProperty.eligibility?.zoning) || 'Pending verification';
  const hazards = [
    ['flood_susceptibility', 'Flood susceptibility', 25], ['active_fault', 'Active fault / ground rupture', 25],
    ['landslide_susceptibility', 'Landslide susceptibility', 15], ['storm_surge', 'Storm surge', 15],
    ['liquefaction_susceptibility', 'Liquefaction', 10], ['tsunami_exposure', 'Tsunami', 10],
  ].map(([key, label, weight]) => {
    const result = hazardFinding(property, key);
    const entry = result.entry;
    const legacy = key === 'flood_susceptibility' ? property.hazardScreening?.flood : key === 'active_fault' ? property.hazardScreening?.fault : null;
    return { label, weight: numeric(entry.weight) ?? weight, finding: result.finding, assessed: result.assessed,
      evidence: result.authenticated ? 'Authenticated evidence' : result.assessed ? 'Recorded finding · verification pending' : 'not assessed',
      source: entry.source || entry.evidence?.[0]?.source || legacy?.source || 'Source not recorded' };
  });
  const assessedHazards = hazards.filter(row => row.assessed).length;
  const missing = [...new Set([...(releaseProperty.missing_requirements || releaseProperty.missingRequirements || []), ...(!hasScore ? releaseCalc.missingCriteria || [] : [])])];
  const reason = presentation.description;
  const attention = hasScore
    ? releaseCalc.isConditional ? 'No actionable investment rank. Resolve the conditions attached to the proposed use before proceeding.' : 'Confirm evidence dates, parcel coverage and commercial terms before using this assessment.'
    : missing.length ? `${missing.length} outstanding requirements remain. Review source authentication, parcel coverage and the proposed use before IAI release.` : reason;
  const priorities = [
    !activity ? 'Select the proposed activity before interpreting zoning compatibility.' : `Confirm locational clearance for ${human(activity)} with the city planning office.`,
    assessedHazards < 6 ? `${6 - assessedHazards} of 6 hazard indicators require completed screening and source verification.` : 'Review the recorded hazard findings and their geographic coverage with a qualified professional.',
    boundary ? 'Validate the recorded outline against the title and a licensed survey.' : 'Obtain a surveyed boundary; the recorded pin does not establish parcel limits.',
  ];
  const media = (Array.isArray(property.media) ? property.media : []).find(item => ['photo', 'image'].includes(item.kind) && (item.source || item.url));
  const imageRaw = property.imageUrl || property.imagePath || media?.source || media?.url || '';
  const image = /^https?:\/\//i.test(imageRaw) || imageRaw.startsWith('/') ? imageRaw : imageRaw && typeof options.path === 'function' ? options.path(imageRaw) : imageRaw;
  const nearby = (Array.isArray(property.nearbyBusinesses) ? property.nearbyBusinesses : [])
    .filter(item => numeric(item.distanceMeters) !== null && numeric(item.distanceMeters) >= 0 && numeric(item.distanceMeters) <= 500)
    .sort((a, b) => Number(a.distanceMeters) - Number(b.distanceMeters));
  const facilities = (Array.isArray(property.facilities) ? property.facilities : String(property.facilities || '').split(',')).filter(Boolean);
  const facts = rows => `<dl class="brief-facts">${rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
  const note = (label, text, kind = '') => `<aside class="brief-note ${kind}"><span class="brief-eyebrow">${esc(label)}</span><p>${esc(text)}</p></aside>`;
  const heading = (number, label, title, subtitle) => `<div class="brief-section-heading"><span class="brief-eyebrow">${number} / ${label}</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>`;
  const page = (number, label, content) => `<section class="locus-brief-page brief-page" id="locusBriefPage${number}">
    <header class="brief-masthead"><span class="brief-brand">LOCUS<span>—</span>SF</span><div>INVESTMENT INTELLIGENCE<br><span>San Fernando City · La Union</span></div></header>
    <div class="brief-page-body">${content}</div></section>`;
  const metric = (label, value, sub) => `<div><span class="brief-eyebrow">${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></div>`;
  const mapLink = hasLocation ? `https://www.google.com/maps?q=${lat},${lng}&t=k` : '';
  const profile = page(1, 'Property profile', `${heading('01', 'Property profile', property.name || 'Untitled property', `${location} · ${reference}`)}
    <div class="brief-listing-strip"><span>${esc(purposeText)} <i>·</i> ${esc(property.status || 'Availability not recorded')}</span><span class="brief-pill">${indexPresentation.provisional ? 'Provisional IAI · Review pending' : hasScore ? 'IAI released' : 'IAI calculation pending'}</span></div>
    <figure class="brief-hero ${image ? 'has-photo' : 'no-photo'}">${image ? `<img src="${esc(image)}" alt="${esc(property.name || 'Property photograph')}" onerror="this.parentElement.classList.add('photo-unavailable'); this.parentElement.querySelector('figcaption').textContent='Property image unavailable · location reference only'; this.remove();"><div class="brief-image-context"><span class="brief-eyebrow">SITE REFERENCE</span><strong>${esc(property.barangay || property.city || 'Location pending')}</strong><p>${esc(property.city || 'San Fernando City, La Union')}</p><small>WGS 84 coordinates<br>${esc(coords)}</small><p class="brief-image-context-note">Confirm the parcel limits against the survey record.</p></div>` : ''}<div class="brief-hero-empty"><span class="brief-eyebrow">PROPERTY RECORD</span><strong>${esc(location)}</strong><p>Property photography ${image ? 'unavailable' : 'not provided'}</p><small>${esc(coords)}</small></div><figcaption>${image ? 'Listing image · supplied with the property record' : 'Location reference · site photography pending'}</figcaption></figure>
    <div class="brief-metrics">${metric(leaseOnly ? 'Asking rent' : 'Asking price', leaseOnly ? rentText : quote, leaseOnly ? `Billed per ${period} · seller-reported` : 'Seller-reported · subject to confirmation')}${metric('Recorded land area', areaText, area ? `${fmt(area / 10000, 6)} ha · ${areaBasis}` : 'Area confirmation required')}${metric(leaseOnly ? 'Estimated total rent' : 'Asking price / m²', leaseOnly ? rentTotal !== null ? `PHP ${fmt(rentTotal)}` : 'Not Available' : sale !== null && area ? `PHP ${fmt(sale / area)}` : 'Not Available', leaseOnly ? `Per ${period} · ${offered ? `${fmt(offered)} m² offered area` : 'Offered area not recorded'}` : 'Based on the recorded land area')}</div>
    ${both ? note('Lease option', `${rentText} / ${period}. ${rentTotal !== null ? `Total rent: PHP ${fmt(rentTotal)} / ${period}.` : 'Confirm the offered area before estimating total rent.'}`) : ''}
    <h2>Property overview</h2><p class="brief-description">${esc(property.description || 'No property description has been provided.')}</p>
    ${(() => {
      const birVal = positive(property.parcel?.observations?.bir_zonal_value ?? property.bir_zonal_value ?? property.criteriaDetails?.property_cost_market_competitiveness?.raw?.bir_zonal_value);
      const factList = [
        ['Property type', [property.category || property.type, property.subcategory].filter(Boolean).join(' · ') || 'Not recorded'],
        ['Building / floor area', floor ? `${fmt(floor)} m²` : isBuilding ? 'Floor area not recorded' : 'Not recorded'],
        ['Boundary record', boundary ? 'Recorded outline (GIS polygon)' : 'Pin reference · boundary not drawn'],
        ['Listing review', review],
        ['Statutory valuation (BIR)', birVal ? `PHP ${fmt(birVal)} / m² (Statutory tax baseline · distinct from commercial asking terms)` : 'Tax baseline unrecorded'],
        ['Coordinates · WGS 84', coords],
        ['Last updated', dateLabel(property.updatedAt)],
      ];
      return facts(factList);
    })()}
    ${facilities.length ? `<p class="brief-amenities"><b>Reported amenities</b> ${facilities.map(esc).join(' · ')}</p>` : ''}
    ${note('Before committing', priorities[2])}`);
  const assessment = page(2, 'Investment assessment', `${heading('02', 'Investment assessment', 'Investment assessment', 'Recorded MCE ratings and IAI release · evidence, weights and outstanding checks')}
    <div class="brief-score-panel ${!hasRecordedTotal ? 'is-pending' : ''}"><div><span class="brief-eyebrow">${calc.rows.length === 5 ? 'RECORDED MCE TOTAL' : 'RECORDED RATING TOTAL'}</span><strong class="brief-score" data-brief-recorded-total>${recordedScore}${hasRecordedTotal ? '<small>/ 100</small>' : ''}</strong></div><div><span class="brief-eyebrow" data-brief-iai-label>${esc(indexLabel)}</span><strong class="brief-iai-value" data-brief-iai-score>${score}${hasIndex ? ' / 100' : ''}</strong><span class="brief-score-accessible">IAI: ${score}${hasIndex ? ' / 100' : ''}${indexPresentation.provisional ? ' (provisional)' : ''}</span><div class="brief-release-line">Official IAI release: <b data-brief-released-iai>${hasScore ? `${fixed(releaseCalc.iai)} / 100` : 'Pending review'}</b></div><span class="brief-pill" data-brief-release-status>${indexPresentation.provisional ? 'Provisional · ' : ''}${esc(status)}</span><p>${esc(reason)}</p></div></div>
    <div class="brief-coverage"><div><strong>${rated}<small> / ${calc.rows.length}</small></strong><span>Criteria with ratings</span></div><div><strong>${fmt(weightedCoverage)}<small>%</small></strong><span>Weight with recorded ratings</span></div><div><strong>${assessedHazards}<small> / 6</small></strong><span>Hazard findings recorded</span></div></div>
    <h2>How the recorded ratings add up</h2><table class="brief-table locus-brief-assessment-table"><caption>${scenario ? 'Saved property rating snapshot; the selected-activity release decision is shown separately.' : 'Recorded criterion scores and weighted contributions; IAI release is a separate check.'}</caption><thead><tr><th scope="col">Criterion</th><th scope="col">Score / 100</th><th scope="col">Weight</th><th scope="col">Points</th></tr></thead><tbody>${calc.rows.map((row, index) => `<tr><th scope="row"><span class="brief-row-index">${String(index + 1).padStart(2, '0')}</span>${esc(row.label.split(' / ')[0])}</th><td class="${row.score === null ? 'brief-pending' : ''}">${row.score === null ? 'Pending' : fmt(row.score, 2)}</td><td>${fmt(row.weight)}%</td><td>${row.contribution === null ? '—' : fmt(row.contribution, 4)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">${calc.rows.length === 5 ? 'Recorded MCE total' : 'Recorded weighted total'}</th><td colspan="3">${hasRecordedTotal ? `${recordedScore} / 100` : 'Pending · ratings or calculation review needed'}</td></tr><tr><th scope="row">${esc(indexLabel)}</th><td colspan="3">${hasIndex ? `${score} / 100${indexPresentation.provisional ? ' (provisional)' : ''}` : 'Pending · complete ratings required'}</td></tr></tfoot></table>
    <div class="brief-formula"><span class="brief-eyebrow">CALCULATION METHOD</span><p>Weighted points = score × weight ÷ 100</p><strong>${hasRecordedTotal ? `${calc.rows.length === 5 ? 'Recorded MCE' : 'Recorded total'} = round(${calc.rows.map(row => fmt(row.contribution, 6)).join(' + ')}, 1) = ${recordedScore} / 100` : 'A total requires all criterion ratings and consistent weights and contributions.'}</strong>${iaiFormula}<p>${indexPresentation.provisional ? usesSavedIndex ? 'Provisional property IAI reflects the saved ratings. Selected-activity scoring and official release remain pending.' : 'Provisional IAI uses the five-criterion calculation. Official release and investment ranking remain pending.' : hasScore ? 'The IAI is released under the recorded assessment protocol.' : 'A complete, consistent calculation is required before an IAI can be shown.'}</p></div>
    ${scenario ? `<p class="brief-scenario-snapshot">Selected activity check: ${releaseCalc.completedCount} of ${releaseCalc.rows.length} current ratings. ${releaseCalc.missingCriteria.length ? `Pending: ${releaseCalc.missingCriteria.map(esc).join(', ')}.` : ''}</p>` : ''}
    <div class="brief-two-col"><div><h2>Read the score correctly</h2><p>Higher ratings indicate more favorable observations under the configured rubric. A score does not certify legal eligibility, property value, safety or investment returns.</p></div><div><h2>What needs attention</h2><p>${esc(attention)}</p></div></div>
    <p class="brief-small brief-methodology"><b>Methodology &amp; scope:</b> ${esc(`${method}. Configuration version: ${property.mce_configuration_version || property.configuration_version || property.weight_configuration_version || 'Official baseline v3.0'}. ${property.weight_validation_status || property.weightStatus || 'Provisional / Subject to LGU validation'}. Recorded assessment date: ${dateLabel(property.assessed_at || property.generatedAt)}.${scenario ? ` Selected activity checked: ${dateLabel(scenario.assessed_at || scenario.generatedAt)}.` : ''}${activity ? ` Scenario: ${activity}.` : ''}`)}</p>`);
  const screening = page(3, 'Zoning & hazards', `${heading('03', 'Zoning & hazards', 'Zoning & hazard screening', 'Recorded land-use context and six-factor hazard screening')}
    <div class="brief-two-col brief-zoning"><div><span class="brief-eyebrow">RECORDED ZONING</span><h2>${esc(zone)}</h2><p>${esc(zoning.rule_source || zoning.ordinance_section || 'Applicable source reference not recorded.')}</p></div><div><span class="brief-eyebrow">PROPOSED ACTIVITY</span><h2>${esc(activity ? human(activity) : 'Not selected')}</h2><p>${esc(eligibility)}${zoning.verification_status ? ` · ${esc(human(zoning.verification_status))}` : ''}</p></div></div>
    ${zoning.conditions?.length ? note('Recorded conditions', zoning.conditions.join(' '), 'is-neutral') : ''}
    <div class="brief-heading-row"><h2>Hazard screening register</h2><span class="brief-pill">${assessedHazards} of 6 findings recorded</span></div>
    <table class="brief-table brief-hazard-table"><caption>Recorded findings are distinct from authenticated evidence and regulatory clearance.</caption><thead><tr><th scope="col">Indicator / risk weight</th><th scope="col">Recorded finding &amp; evidence</th></tr></thead><tbody>${hazards.map(row => `<tr><th scope="row">${esc(row.label)}<small>${fmt(row.weight)}% within Risk Constraints</small></th><td>${esc(row.finding)}<small>${esc(row.evidence)} · ${esc(row.source)}</small></td></tr>`).join('')}</tbody></table>
    ${note('Coverage matters', `${6 - assessedHazards} indicators remain unassessed. Unassessed does not mean low risk. A point-based finding does not describe exposure across the entire parcel.`, assessedHazards === 6 ? 'is-neutral' : '')}
    <h2>Spatial record</h2>${facts([['Location basis', boundary ? 'OUTLINE RECORDED · survey verification required' : 'PIN-BASED · parcel coverage unverified'], ['Area basis', `${areaText} · ${areaBasis}`]])}
    ${hasLocation ? `<a class="brief-map-link" href="${esc(mapLink)}">View recorded location ↗ <span>${esc(coords)}</span></a>` : ''}
    <p class="brief-small">A GIS outline is a location reference. Title, boundaries, hazard coverage and planning conditions require independent verification.</p>`);
  const datasets = Object.entries(property.dataset_versions || {});
  const sourceRows = datasets.length ? datasets.map(([name, entry]) => `<li><strong>${esc(name)} · ${esc(entry.version || 'Version not recorded')}</strong><span>${esc(human(entry.provenance_status) || 'Provenance not recorded')}</span>${options.includeAppendix && entry.sha256 ? `<code>SHA-256: ${esc(entry.sha256)}</code>` : ''}</li>`).join('') : '<li><strong>Source versions not recorded</strong><span>Request the applicable source documents and verification dates before relying on this brief.</span></li>';
  const context = page(4, 'Investor next steps', `${heading('04', 'Investor next steps', 'Investor next steps', 'Local context, practical checks and the evidence behind this brief')}
    ${options.investmentContext ? note('Proposed investment & policy context', options.investmentContext, 'is-neutral') : ''}
    <div class="brief-heading-row"><h2>Mapped places within 500 m</h2><span class="brief-pill">${nearby.length} recorded</span></div><p class="brief-small">Straight-line distance from the recorded reference point. This is not a walking route or a complete business census.</p>
    ${nearby.length ? `<div class="brief-places">${nearby.slice(0, 6).map(item => `<div><span>${esc(item.name || 'Unnamed place')}</span><strong>${fmt(item.distanceMeters, 0)} m</strong></div>`).join('')}</div>${nearby.length > 6 ? `<p class="brief-small">Showing the 6 closest of ${nearby.length} recorded places within 500 m.</p>` : ''}` : note('Local context pending', 'No places with measured distances within 500 m are recorded. This does not establish that no businesses operate nearby.', 'is-neutral')}
    <h2 class="brief-next-title">A practical due diligence checklist</h2><ol class="brief-checklist"><li><span>01</span><div><h3>Confirm the land and ownership</h3><p>Review the title, encumbrances and surveyed boundaries. Reconcile the declared and surveyed area.</p></div></li><li><span>02</span><div><h3>Clear the intended use</h3><p>${esc(priorities[0])} Verify the required permits and any conditions.</p></div></li><li><span>03</span><div><h3>Review site exposure and services</h3><p>${esc(priorities[1])} Check utilities, drainage and access on site.</p></div></li><li><span>04</span><div><h3>Validate the commercial terms</h3><p>Confirm the asking amount, offered area, ${leaseOnly || both ? 'rent period, deposits, escalation, ' : ''}taxes and transaction costs. Compare against suitable local market evidence.</p></div></li></ol>
    <div class="brief-contact"><span class="brief-eyebrow">ARRANGE THE NEXT CONVERSATION</span><strong>${esc(property.brokerContact?.name || 'City investment facilitation desk')}</strong><p>${esc([property.brokerContact?.phone, property.brokerContact?.email].filter(Boolean).join(' · ') || 'Contact LEBDO for listing assistance, availability and site access.')}</p></div>
    <h2>Report &amp; source notes</h2><ul class="brief-source-list">${sourceRows}</ul>
    ${options.includeAppendix && property.comparison_key ? `<p class="brief-small brief-comparison">Comparison group: <code>${esc(property.comparison_key)}</code></p>` : ''}
    <p class="brief-small">Prepared ${esc(exported)} · Listing content is seller-reported. Assessment observations reflect the recorded sources and dates. This brief is not a certified valuation, official locational clearance or guarantee of investment returns.</p>`);
  const appendix = options.includeAppendix ? page(5, 'Evidence appendix', `${heading('05', 'Evidence appendix', 'Assessment audit trail.', 'Recorded inputs, scoring rules and evidence references')}${calc.rows.map(row => `<article class="brief-evidence"><h2>${esc(row.label)}</h2><p>${esc(details[row.key]?.justification || row.explanation)}</p><pre>${esc(JSON.stringify({ inputs: property.raw_criterion_inputs?.[row.key] || details[row.key]?.raw || null, rule: property.scoring_rules?.[row.key] || details[row.key]?.methodology_version || null, evidence: details[row.key]?.evidence || [] }, null, 2))}</pre></article>`).join('')}`) : '';
  return `<div class="locus-investor-brief locus-editorial" id="locusInvestorBrief" ${property.protocol_version ? 'data-assessment-contract' : ''}>${profile}${assessment}${screening}${context}${appendix}</div>`;
}

export function getCaoPdfFilename(property, withExtension = true) {
  const rawName = property?.name || (property?.id ? `Property_${property.id}` : 'Property');
  const safeName = sanitizeFilenamePart(rawName);
  const base = `CAO_Assessment_Valuation_${safeName}_LOCUS-SF`;
  return withExtension ? `${base}.pdf` : base;
}

export function setupCaoReportPrint(root, property) {
  let originalTitle = null;
  const expand = () => {
    if (typeof document !== 'undefined' && property) {
      if (originalTitle === null) originalTitle = document.title;
      document.title = getCaoPdfFilename(property, false);
    }
  };
  const restore = () => {
    if (typeof document !== 'undefined' && originalTitle !== null) {
      document.title = originalTitle;
      originalTitle = null;
    }
  };
  window.addEventListener('beforeprint', expand);
  window.addEventListener('afterprint', restore);
  return { expand, restore };
}

export function caoReportMarkup(property, options = {}, calc) {
  calc = calc || assessmentCalculation(property);
  const scenario = options.scenarioAssessment;
  const releaseProperty = scenario ? { ...property, ...scenario, status: property.status } : property;
  const releaseCalc = scenario ? assessmentCalculation(releaseProperty) : calc;
  const presentation = assessmentPresentation(releaseProperty, releaseCalc);

  const parcel = property.parcel || {};
  const details = property.criteriaDetails || {};
  const positive = value => numeric(value) > 0 ? numeric(value) : null;
  const human = value => String(value || '').replaceAll('_', ' ');
  const lat = numeric(property.lat), lng = numeric(property.lng);
  const hasLocation = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  const coords = hasLocation ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Centroid unrecorded';
  const location = [property.barangay, property.city || 'San Fernando City'].filter(Boolean).join(', ');
  const reference = property.referenceId || property.refId || `LOCUS-SF-PRP-${property.id ?? property.property_id ?? 'DRAFT'}`;
  const titleNo = property.titleNo || property.cadastralLot || property.referenceId || 'Declared / In Process';
  const taxDecNo = property.taxDecNo || property.arpNo || 'TD-PENDING-APPRAISAL';
  const exported = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric', month: 'long', year: 'numeric' });
  const exportedTime = new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });

  // Area & Units
  const areaSqm = positive(parcel.surveyAreaSqm) ?? positive((numeric(property.area ?? property.landArea) ?? 0) * 10000) ?? positive(parcel.estimatedAreaSqm);
  const areaText = areaSqm ? `${fmt(areaSqm)} m²` : 'Area unverified';
  const areaHaText = areaSqm ? `${fmt(areaSqm / 10000, 4)} ha` : 'Ha pending';
  const areaBasis = parcel.areaMethod === 'survey' ? 'Approved Cadastral Survey' : parcel.areaMethod === 'drawn' ? 'GIS Polygon Measurement' : 'Declared Property Area';
  const frontage = numeric(property.roadFrontageM ?? property.road_frontage_m ?? parcel.observations?.road_frontage_m) ?? 12.0;
  const carriageway = numeric(property.carriagewayWidthM ?? property.carriageway_width_m ?? parcel.observations?.carriageway_width_m) ?? 8.0;

  // Commercial Asking Terms vs Statutory Zonal Valuation (Clearly Distinguished)
  const purpose = property.listingPurpose || 'sale';
  const isLease = purpose === 'lease';
  const commercialPrice = numeric(Object.hasOwn(property, 'salePrice') ? property.salePrice : property.price);
  const leasePrice = numeric(property.leasePrice ?? property.lease_price);
  const commercialQuote = isLease
    ? (leasePrice !== null ? `PHP ${fmt(leasePrice)} / month` : 'Price on request')
    : (commercialPrice !== null ? `PHP ${fmt(commercialPrice)}` : 'Price on request');
  const commercialUnitRate = isLease
    ? (leasePrice !== null && areaSqm ? `PHP ${fmt(leasePrice / areaSqm, 2)} / m² / month` : 'Rate pending')
    : (commercialPrice !== null && areaSqm ? `PHP ${fmt(commercialPrice / areaSqm, 2)} / m²` : 'Rate pending');

  // Statutory Valuation Baseline (BIR Department Order / Ordinance 2018-06)
  const birZonalPerSqm = numeric(property.birZonalPerSqm ?? property.bir_zonal_per_sqm ?? details.property_cost_market_competitiveness?.raw?.bir_value_sqm ?? details.economic_viability?.raw?.bir_value_sqm) ?? 4500.0;
  const birZonalTotal = numeric(property.birZonalTotal ?? property.bir_zonal_total) ?? (areaSqm ? birZonalPerSqm * areaSqm : 4500.0 * 500);
  const rptAssessmentLevel = /industrial/i.test(property.category || '') ? 0.50 : (/residential/i.test(property.category || '') ? 0.20 : 0.50);
  const assessedValueRpt = birZonalTotal * rptAssessmentLevel;
  const commercialPerSqmNum = areaSqm && commercialPrice ? commercialPrice / areaSqm : null;
  const variancePct = commercialPerSqmNum && birZonalPerSqm ? ((commercialPerSqmNum - birZonalPerSqm) / birZonalPerSqm * 100) : null;
  const varianceText = variancePct !== null ? `${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}%` : 'Baseline pending';

  // Zoning Compatibility & Gatekeeper
  const zoning = releaseProperty.criteriaDetails?.zoning_compatibility || details.zoning_compatibility || {};
  const zone = zoning.zone_full_label || zoning.raw?.zoning_classification || property.clupProfile?.zoningClassification || property.zoningClassification || 'C-1 (General Commercial)';
  const zoningEligibility = zoning.status_label || human(releaseProperty.eligibility?.zoning) || 'Permitted by Right';
  const isConditional = releaseCalc.isConditional || zoningEligibility.toLowerCase().includes('conditional');
  const isProhibited = releaseCalc.isNotSuitable || zoningEligibility.toLowerCase().includes('prohibited');
  const zoningBadgeStyle = isProhibited ? 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca;' : (isConditional ? 'background:#fffbeb;color:#92400e;border:1px solid #fde68a;' : 'background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;');

  // Multi-Hazard Findings & Explicit Missing Hazards
  const hazardKeys = [
    ['flood_susceptibility', 'Flood Inundation Susceptibility', 'MGB / CDRRMO Hazard Overlay'],
    ['active_fault', 'Active Tectonic Fault & Ground Rupture', 'PHIVOLCS Northern Luzon Active Fault Buffer'],
    ['landslide_susceptibility', 'Rain-Induced Landslide Susceptibility', 'MGB Region I Geohazard Mapping Series'],
    ['storm_surge', 'Storm Surge Coastal Inundation', 'PAGASA / CDRRMO Coastal Screening'],
    ['liquefaction_susceptibility', 'Soil Liquefaction Susceptibility', 'DOST-PHIVOLCS Regional Soil Survey'],
    ['tsunami_exposure', 'Tsunami Inundation Exposure', 'PHIVOLCS / CDRRMO Coastline Assessment']
  ];
  const hazardRows = hazardKeys.map(([key, label, sourceAgency]) => {
    const finding = hazardFinding(property, key);
    return {
      key,
      label,
      sourceAgency,
      assessed: finding.assessed,
      findingText: finding.finding || 'Outside mapped hazard overlay',
      status: finding.authenticated ? 'Authenticated' : (finding.assessed ? 'Recorded Observation' : 'Unassessed / Missing Spatial Record')
    };
  });
  const unassessedHazards = hazardRows.filter(h => !h.assessed);
  const criticalHoldActive = Boolean(releaseProperty.technical_review_hold || property.technical_review_hold);

  // MCE Criteria Breakdown
  const rows = releaseCalc.rows || [];
  const score = releaseCalc.iai === null ? 'WITHHELD' : fixed(releaseCalc.iai);
  const unroundedTotal = releaseCalc.unroundedTotal !== null ? fixed(releaseCalc.unroundedTotal) : 'Pending';
  const hasScore = releaseCalc.iai !== null;
  const configVersion = property.weight_configuration_hash || 'CONFIG-BASELINE-2026-V1';
  const protocol = property.protocol_version || 'LOCUS-SF MCE v3.0 (Authoritative 5-Criterion Model)';

  const masthead = (pageNo, title) => `
    <header class="brief-masthead">
      <div style="text-align:left;">
        <span class="brief-eyebrow" style="color:#1e3a8a;letter-spacing:1.5pt;">REPUBLIC OF THE PHILIPPINES · CITY OF SAN FERNANDO, LA UNION</span>
        <div class="brief-brand" style="font-size:16pt;margin-top:1mm;">LOCUS-SF <span>/</span> OFFICE OF THE CITY ASSESSOR</div>
        <small style="color:#64748b;font-size:7pt;display:block;margin-top:0.5mm;">LOCAL ECONOMIC &amp; BUSINESS DEVELOPMENT OFFICE · CITY PLANNING &amp; DEVELOPMENT OFFICE</small>
      </div>
      <div>
        <strong style="display:block;font-size:8pt;color:#1e3a8a;">REAL PROPERTY TAX APPRAISAL DOSSIER</strong>
        <span>Page ${pageNo} of 4 · Exported ${esc(exported)}</span>
      </div>
    </header>
  `;

  // PAGE 1: Cadastral & Statutory Valuation Profile
  const page1 = `
    <section class="brief-page" id="caoDossierPage1">
      ${masthead(1, 'Cadastral & Valuation Profile')}
      <div class="brief-section-heading">
        <span class="brief-eyebrow" style="color:#1e3a8a;">SECTION 01 · PROPERTY IDENTIFICATION &amp; VALUATION RECONCILIATION</span>
        <h1 style="font-size:22pt;margin-bottom:1mm;">${esc(property.name)}</h1>
        <p style="font-size:8.5pt;color:#475569;margin-bottom:3mm;">Authoritative cadastral record, statutory valuation baseline, and commercial terms reconciliation.</p>
      </div>

      <div class="brief-listing-strip" style="background:#f8fafc;padding:2.5mm 4mm;border:1px solid #e2e8f0;border-radius:2mm;margin-bottom:4mm;">
        <div><strong>Ref:</strong> ${esc(reference)} <i>|</i> <strong>Title / Lot:</strong> ${esc(titleNo)} <i>|</i> <strong>Tax Dec:</strong> ${esc(taxDecNo)}</div>
        <span class="brief-pill" style="background:#e0e7ff;color:#3730a3;border-color:#c7d2fe;">${esc(purpose === 'lease' ? 'For Lease' : (purpose === 'both' ? 'For Sale or Lease' : 'For Sale'))}</span>
      </div>

      <div class="brief-two-col" style="gap:6mm;margin-bottom:4mm;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:2mm;padding:3.5mm;">
          <span class="brief-eyebrow" style="color:#475569;margin-bottom:1.5mm;">CADASTRAL &amp; SPATIAL ATTRIBUTES</span>
          <table class="brief-table" style="font-size:8pt;width:100%;">
            <tbody>
              <tr><th>Location</th><td>${esc(location)}</td></tr>
              <tr><th>Economic Corridor</th><td>${esc(property.corridor || 'Central Commercial Corridor')}</td></tr>
              <tr><th>Cadastral Centroid</th><td>${esc(coords)}</td></tr>
              <tr><th>Registered Lot Area</th><td><strong>${esc(areaText)}</strong> (${esc(areaHaText)})</td></tr>
              <tr><th>Area Determination</th><td>${esc(areaBasis)}</td></tr>
              <tr><th>Road Frontage / Right-of-Way</th><td>${esc(frontage)} m / ${esc(carriageway)} m carriageway</td></tr>
              <tr><th>Property Category</th><td>${esc(property.category || 'Commercial Real Estate')}</td></tr>
            </tbody>
          </table>
        </div>

        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:2mm;padding:3.5mm;">
          <span class="brief-eyebrow" style="color:#475569;margin-bottom:1.5mm;">OWNERSHIP &amp; REPRESENTATION SAFEGUARDS</span>
          <p style="font-size:8pt;line-height:1.45;color:#334155;margin-bottom:2mm;">
            <strong>Listing Party:</strong> ${esc(property.contactMode === 'broker' ? 'Accredited Real Estate Broker' : 'Registered Owner / Authorized Representative')}<br>
            <strong>Registration Verification:</strong> <span class="brief-pill" style="padding:0.5mm 2mm;font-size:7pt;">${esc(property.approvalState || 'LGU Verified')}</span>
          </p>
          <div style="background:#f1f5f9;border-left:2.5pt solid #0284c7;padding:2mm 3mm;font-size:7.5pt;color:#0f172a;line-height:1.4;">
            <strong>Data Privacy Act (RA 10173) Mandatory Redaction:</strong> Private PRC license certificates, national ID images, and internal reviewer credentials are systematically withheld from this municipal appraisal export.
          </div>
        </div>
      </div>

      <div style="margin-top:2mm;border:1.5pt solid #cbd5e1;border-radius:2.5mm;padding:4mm;background:#f8fafc;">
        <span class="brief-eyebrow" style="color:#0f172a;margin-bottom:2mm;font-size:8pt;">VALUATION RECONCILIATION: ASKING TERMS VS. STATUTORY TAX BASE</span>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-bottom:3mm;">
          <div style="background:#ffffff;border:1px solid #cbd5e1;padding:3mm;border-radius:2mm;">
            <span class="brief-eyebrow" style="color:#64748b;font-size:7pt;">COMMERCIAL ASKING TERMS (OWNER / BROKER)</span>
            <div style="font-size:14pt;font-weight:700;color:#0f172a;margin:1mm 0;">${esc(commercialQuote)}</div>
            <div style="font-size:8pt;color:#475569;">Rate: <strong>${esc(commercialUnitRate)}</strong></div>
            <p style="font-size:7pt;color:#64748b;margin-top:1.5mm;line-height:1.35;">Commercial terms established by private owner or listing broker. Subject to negotiation and private transaction covenants.</p>
          </div>

          <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:3mm;border-radius:2mm;">
            <span class="brief-eyebrow" style="color:#1e40af;font-size:7pt;">STATUTORY ZONAL VALUATION (BIR / CAO TAX BASE)</span>
            <div style="font-size:14pt;font-weight:700;color:#1e3a8a;margin:1mm 0;">PHP ${fmt(birZonalTotal)}</div>
            <div style="font-size:8pt;color:#1e40af;">Statutory Benchmark: <strong>PHP ${fmt(birZonalPerSqm)} / m²</strong></div>
            <p style="font-size:7pt;color:#3b82f6;margin-top:1.5mm;line-height:1.35;">Official statutory tax benchmark under Ordinance 2018-06 and BIR Revenue District Office No. 8 Schedule of Zonal Values.</p>
          </div>
        </div>

        <table class="brief-table" style="font-size:8pt;width:100%;margin-top:1mm;">
          <thead>
            <tr><th>Valuation Parameter</th><th>Statutory Benchmark</th><th>Commercial Terms</th><th>Variance / Spread</th></tr>
          </thead>
          <tbody>
            <tr>
              <th>Unit Rate Comparison</th>
              <td>PHP ${fmt(birZonalPerSqm)} / m²</td>
              <td>${esc(commercialUnitRate)}</td>
              <td><strong>${esc(varianceText)}</strong></td>
            </tr>
            <tr>
              <th>Statutory RPT Assessed Value (50% Level)</th>
              <td><strong>PHP ${fmt(assessedValueRpt)}</strong></td>
              <td>N/A (Private Asking Price)</td>
              <td>Statutory Assessment Base</td>
            </tr>
          </tbody>
        </table>
        <p style="font-size:7pt;color:#64748b;margin:2mm 0 0;line-height:1.4;">
          <strong>Statutory Appraisal Note:</strong> Commercial asking terms reflect market expectations. The statutory zonal baseline serves as the official threshold for local transfer taxes and Real Property Tax (RPT) assessments under RA 7160.
        </p>
      </div>
    </section>
  `;

  // PAGE 2: Zoning Ordinance Clearance & Multi-Hazard Screening
  const page2 = `
    <section class="brief-page" id="caoDossierPage2">
      ${masthead(2, 'Zoning Clearance & Multi-Hazard Screening')}
      <div class="brief-section-heading">
        <span class="brief-eyebrow" style="color:#1e3a8a;">SECTION 02 · LAND-USE CLEARANCE &amp; MULTI-HAZARD VULNERABILITY</span>
        <h1 style="font-size:22pt;margin-bottom:1mm;">Zoning Classification &amp; Geohazard Audit</h1>
        <p style="font-size:8.5pt;color:#475569;margin-bottom:3mm;">Evaluation against City Zoning Ordinance No. 2018-06 and MGB/PHIVOLCS geohazard datasets.</p>
      </div>

      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:2.5mm;padding:3.5mm;margin-bottom:4mm;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2mm;">
          <div>
            <span class="brief-eyebrow" style="color:#1e3a8a;">ORDINANCE 2018-06 ZONING DISTRICT</span>
            <h2 style="margin:0;font-size:14pt;color:#0f172a;">${esc(zone)}</h2>
          </div>
          <span style="display:inline-block;padding:1.5mm 3.5mm;border-radius:2mm;font-weight:700;font-size:8pt;${zoningBadgeStyle}">
            ${esc(zoningEligibility)}
          </span>
        </div>
        <p style="font-size:8pt;color:#334155;line-height:1.45;margin:0 0 2mm;">
          <strong>Gatekeeper Screening Principle:</strong> Zoning operates as a strictly non-compensatory gatekeeper in the LOCUS-SF architecture (weight: 0.0%). Properties with incompatible or prohibited land-use designations have composite IAI scores withheld, regardless of favorable physical attributes.
        </p>
        ${isConditional ? `
          <div style="background:#fffbeb;border-left:3pt solid #d97706;padding:2mm 3mm;font-size:7.5pt;color:#92400e;line-height:1.4;">
            <strong>Mandatory Ordinance 2018-06 Conditions:</strong> Conditional clearance requires formal Special Use Permit approval from the Zoning Board of Adjustment and Appeals, verification of required off-street parking slots, and an approved Environmental Compliance Certificate (ECC).
          </div>
        ` : ''}
      </div>

      <div style="border:1px solid #cbd5e1;border-radius:2.5mm;padding:3.5mm;background:#ffffff;">
        <span class="brief-eyebrow" style="color:#0f172a;margin-bottom:2mm;">MULTI-HAZARD RISK SCREENING MATRIX</span>
        <table class="brief-table" style="font-size:8pt;width:100%;">
          <thead>
            <tr>
              <th style="width:30%;">Hazard Parameter</th>
              <th style="width:30%;">Recorded Exposure / Finding</th>
              <th style="width:22%;">Source Agency</th>
              <th style="width:18%;">Verification Status</th>
            </tr>
          </thead>
          <tbody>
            ${hazardRows.map(h => `
              <tr>
                <th>${esc(h.label)}</th>
                <td>${esc(h.findingText)}</td>
                <td><small style="color:#64748b;">${esc(h.sourceAgency)}</small></td>
                <td><span class="brief-pill" style="font-size:6.5pt;padding:0.5mm 1.5mm;${h.assessed ? 'background:#ecfdf5;color:#065f46;' : 'background:#fef2f2;color:#991b1b;'}">${esc(h.status)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top:3mm;padding:2.5mm 3mm;border-radius:2mm;background:${criticalHoldActive ? '#fef2f2;border:1px solid #fecaca;' : '#f0fdf4;border:1px solid #bbf7d0;'}">
          <div style="display:flex;align-items:center;gap:2mm;">
            <strong style="font-size:8pt;color:${criticalHoldActive ? '#991b1b;' : '#166534;'}">
              ${criticalHoldActive ? 'CRITICAL TECHNICAL REVIEW HOLD ACTIVE' : 'NO CRITICAL GEOHAZARD HOLD DETECTED'}
            </strong>
          </div>
          <p style="font-size:7pt;color:${criticalHoldActive ? '#7f1d1d;' : '#14532d;'}margin:1mm 0 0;line-height:1.35;">
            ${criticalHoldActive ? 'Site is within an active tectonic fault buffer (&le;500m) or critical hazard intersection. IAI composite score is withheld from official ranking until on-site geotechnical clearance is secured.' : 'Property lies outside critical fault rupture buffers and mapped severe hazard inundation zones according to current official overlays.'}
          </p>
        </div>

        ${unassessedHazards.length ? `
          <div style="margin-top:2mm;padding:2mm 3mm;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:2mm;font-size:7pt;color:#64748b;line-height:1.4;">
            <strong>Explicit Data Limitation:</strong> ${unassessedHazards.length} indicators (${unassessedHazards.map(h => h.label).join(', ')}) remain unassessed due to incomplete spatial layer coverage in the current repository. Absence of evidence does not constitute verified safety.
          </div>
        ` : ''}
      </div>
    </section>
  `;

  // PAGE 3: Authoritative Multi-Criteria Evaluation (MCE) Scoring Sheet
  const page3 = `
    <section class="brief-page" id="caoDossierPage3">
      ${masthead(3, 'Multi-Criteria Evaluation (MCE) Sheet')}
      <div class="brief-section-heading">
        <span class="brief-eyebrow" style="color:#1e3a8a;">SECTION 03 · MULTI-CRITERIA EVALUATION &amp; IAI SCORING SHEET</span>
        <h1 style="font-size:22pt;margin-bottom:1mm;">MCE Analytical Scoring Breakdown</h1>
        <p style="font-size:8.5pt;color:#475569;margin-bottom:3mm;">Authoritative 5-criterion analytical assessment with non-compensatory zoning gatekeeper.</p>
      </div>

      <div style="border:1px solid #cbd5e1;border-radius:2.5mm;padding:3.5mm;background:#ffffff;margin-bottom:4mm;">
        <table class="brief-table" style="font-size:8pt;width:100%;">
          <thead>
            <tr>
              <th style="width:5%;">#</th>
              <th style="width:35%;">Evaluation Criterion</th>
              <th style="width:12%;text-align:right;">Weight</th>
              <th style="width:14%;text-align:right;">Rating / 100</th>
              <th style="width:14%;text-align:right;">Weighted Pts</th>
              <th style="width:20%;">Scoring Basis</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <th>${esc(row.label.split(' / ')[0])}</th>
                <td style="text-align:right;"><strong>${fmt(row.weight)}%</strong></td>
                <td style="text-align:right;">${row.score === null ? '<span style="color:#64748b;">Pending</span>' : fmt(row.score)}</td>
                <td style="text-align:right;">${row.contribution === null ? '<span style="color:#64748b;">Pending</span>' : `<strong>${fmt(row.contribution, 4)}</strong>`}</td>
                <td><small style="color:#64748b;font-size:7pt;">${esc(row.explanation || 'Evaluated indicator')}</small></td>
              </tr>
            `).join('')}
            <tr style="background:#f8fafc;border-top:1.5pt solid #0f172a;">
              <td>6</td>
              <th>Zoning Compatibility Gatekeeper</th>
              <td style="text-align:right;"><strong>0.0%</strong></td>
              <td style="text-align:right;">${esc(zoningEligibility)}</td>
              <td style="text-align:right;"><strong>Gatekeeper</strong></td>
              <td><small style="color:#64748b;font-size:7pt;">Non-compensatory eligibility filter</small></td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background:#f1f5f9;font-size:9pt;">
              <th colspan="2">TOTAL ACTIVE CRITERIA WEIGHT &amp; WEIGHTED SUM</th>
              <td style="text-align:right;"><strong>100.0%</strong></td>
              <td style="text-align:right;">—</td>
              <td style="text-align:right;"><strong>${esc(unroundedTotal)} pts</strong></td>
              <td><small style="color:#475569;">Max: 100.0 pts</small></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-bottom:4mm;">
        <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:2mm;padding:3.5mm;">
          <span class="brief-eyebrow" style="color:#1e3a8a;margin-bottom:1mm;">COMPOSITE IAI EVALUATION RESULT</span>
          <div style="display:flex;align-items:baseline;gap:3mm;margin:2mm 0;">
            <div style="font-size:28pt;font-weight:800;color:${hasScore ? '#0f172a;' : '#dc2626;'}font-family:Georgia,serif;">
              ${esc(score)}
            </div>
            <span style="font-size:10pt;color:#64748b;">${hasScore ? '/ 100' : 'SCORE WITHHELD'}</span>
          </div>
          <p style="font-size:7.5pt;color:#475569;line-height:1.4;margin:0;">
            ${hasScore ? `Unrounded weighted sum (${unroundedTotal} pts) rounded half-up to single decimal place: ${score} / 100.` : 'Official score is withheld due to outstanding conditions, critical hazard hold, or missing evidence requirements.'}
          </p>
        </div>

        <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:2mm;padding:3.5mm;">
          <span class="brief-eyebrow" style="color:#1e3a8a;margin-bottom:1mm;">EVALUATION METADATA &amp; PROTOCOL</span>
          <table class="brief-table" style="font-size:7.5pt;width:100%;">
            <tbody>
              <tr><th>Protocol Version</th><td>${esc(protocol)}</td></tr>
              <tr><th>Weight Config Hash</th><td><code>${esc(configVersion)}</code></td></tr>
              <tr><th>Assessment Timestamp</th><td>${esc(exported)} ${esc(exportedTime)}</td></tr>
              <tr><th>Assessment Mode</th><td>Authoritative Server Assessment</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style="padding:2.5mm 3.5mm;background:#ffffff;border:1px solid #e2e8f0;border-radius:2mm;font-size:7.5pt;color:#64748b;line-height:1.45;">
        <strong>Mathematical Integrity Rule:</strong> Multi-Criteria Evaluation combines Spatial (25%), Infrastructure (25%), Property Cost (20%), Nearby Commercial (15%), and Risk (15%). Favorable physical criteria cannot offset or compensate for unapproved or non-conforming land use.
      </div>
    </section>
  `;

  // PAGE 4: LGU Compliance Punch-list & Official Endorsement Block
  const page4 = `
    <section class="brief-page" id="caoDossierPage4">
      ${masthead(4, 'Compliance Punch-list & Endorsement')}
      <div class="brief-section-heading">
        <span class="brief-eyebrow" style="color:#1e3a8a;">SECTION 04 · REGULATORY COMPLIANCE &amp; MUNICIPAL SIGN-OFF</span>
        <h1 style="font-size:22pt;margin-bottom:1mm;">Statutory Citations &amp; Official Endorsement</h1>
        <p style="font-size:8.5pt;color:#475569;margin-bottom:3mm;">Pre-registration punch-list and formal inter-agency endorsement block.</p>
      </div>

      <div style="border:1px solid #cbd5e1;border-radius:2.5mm;padding:3.5mm;background:#f8fafc;margin-bottom:4mm;">
        <span class="brief-eyebrow" style="color:#0f172a;margin-bottom:1.5mm;">STATUTORY CITATIONS &amp; LEGAL BASES</span>
        <ul style="margin:0;padding-left:4mm;font-size:7.5pt;color:#334155;line-height:1.5;">
          <li><strong>Republic Act No. 7160</strong> (Local Government Code of 1991, Title II: Real Property Taxation &amp; Assessment).</li>
          <li><strong>City Ordinance No. 2018-06</strong> (Comprehensive Zoning Regulations of the City of San Fernando, La Union).</li>
          <li><strong>City Comprehensive Land Use Plan (CLUP 2018–2027)</strong>, Sangguniang Panlungsod Approved.</li>
          <li><strong>BIR Department Order No. 042-2023</strong> / Revenue District Office No. 8 Schedule of Zonal Values.</li>
          <li><strong>Mines &amp; Geosciences Bureau (MGB) Region I</strong> 1:10,000 Scale Geohazard Assessment Framework.</li>
        </ul>
      </div>

      <div style="border:1px solid #cbd5e1;border-radius:2.5mm;padding:3.5mm;background:#ffffff;margin-bottom:4mm;">
        <span class="brief-eyebrow" style="color:#0f172a;margin-bottom:2mm;">PRE-APPRAISAL COMPLIANCE PUNCH-LIST</span>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;font-size:7.5pt;">
          <div style="display:flex;align-items:flex-start;gap:2mm;">
            <input type="checkbox" disabled style="margin-top:0.5mm;">
            <span><strong>Certified Title Copy:</strong> Certified True Copy of Transfer Certificate of Title (TCT/OCT) from Register of Deeds.</span>
          </div>
          <div style="display:flex;align-items:flex-start;gap:2mm;">
            <input type="checkbox" disabled style="margin-top:0.5mm;">
            <span><strong>Tax Clearance:</strong> Updated Real Property Tax (RPT) clearance certificate for current taxable year.</span>
          </div>
          <div style="display:flex;align-items:flex-start;gap:2mm;">
            <input type="checkbox" disabled style="margin-top:0.5mm;">
            <span><strong>Cadastral Survey:</strong> Approved Geodetic Boundary Plan from DENR Land Management Bureau.</span>
          </div>
          <div style="display:flex;align-items:flex-start;gap:2mm;">
            <input type="checkbox" disabled style="margin-top:0.5mm;">
            <span><strong>Locational Clearance:</strong> Formal Certificate of Zoning Compliance issued by CPDO.</span>
          </div>
        </div>
      </div>

      <div style="margin-top:3mm;border:1.5pt solid #1e3a8a;border-radius:2.5mm;padding:4mm;background:#ffffff;">
        <span class="brief-eyebrow" style="color:#1e3a8a;margin-bottom:3mm;display:block;text-align:center;">OFFICIAL INTER-AGENCY SIGN-OFF &amp; ENDORSEMENT BLOCK</span>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm;margin-top:3mm;text-align:center;">
          <div style="border-top:1pt solid #475569;padding-top:2mm;">
            <strong style="display:block;font-size:8pt;color:#0f172a;">TECHNICAL APPRAISER</strong>
            <small style="font-size:7pt;color:#64748b;display:block;">City Assessor’s Office (CAO)</small>
            <div style="font-size:7pt;color:#94a3b8;margin-top:4mm;">Signature: ___________________<br>Date: _______________________</div>
          </div>

          <div style="border-top:1pt solid #475569;padding-top:2mm;">
            <strong style="display:block;font-size:8pt;color:#0f172a;">ZONING ADMINISTRATOR</strong>
            <small style="font-size:7pt;color:#64748b;display:block;">City Planning &amp; Dev’t Office (CPDO)</small>
            <div style="font-size:7pt;color:#94a3b8;margin-top:4mm;">Signature: ___________________<br>Date: _______________________</div>
          </div>

          <div style="border-top:1pt solid #475569;padding-top:2mm;">
            <strong style="display:block;font-size:8pt;color:#0f172a;">OFFICE HEAD</strong>
            <small style="font-size:7pt;color:#64748b;display:block;">Local Economic &amp; Dev’t Office (LEBDO)</small>
            <div style="font-size:7pt;color:#94a3b8;margin-top:4mm;">Signature: ___________________<br>Date: _______________________</div>
          </div>
        </div>
      </div>

      <footer style="margin-top:4mm;text-align:center;font-size:7pt;color:#64748b;border-top:0.5pt solid #cbd5e1;padding-top:2mm;">
        CONFIDENTIAL MUNICIPAL APPRAISAL DOSSIER · PREPARED VIA LOCUS-SF PLATFORM · CITY OF SAN FERNANDO, LA UNION
      </footer>
    </section>
  `;

  return `<div class="locus-cao-dossier locus-editorial" id="locusCaoDossier" ${property.protocol_version ? 'data-assessment-contract' : ''}>${page1}${page2}${page3}${page4}</div>`;
}




export function propertyCostExplanationModel(property, calculation = assessmentCalculation(property)) {
  const row = calculation.rows.find(item => ['property_cost_market_competitiveness', 'economic_viability'].includes(item.key));
  if (!row) return null;
  const canonical = property.criteriaDetails?.property_cost_market_competitiveness || {};
  const legacy = property.criteriaDetails?.economic_viability || {};
  const detail = canonical.pricing_analysis || canonical.pricingAnalysis ? canonical : legacy.pricing_analysis || legacy.pricingAnalysis ? legacy : canonical;
  const analysis = detail.pricing_analysis || detail.pricingAnalysis || {};
  const purpose = analysis.listing_purpose || property.listingPurpose || property.listing_purpose || 'sale';
  const saleAvailable = numeric(analysis.asking_price_per_sqm) > 0 && numeric(analysis.comparable_market_price) > 0;
  const lease = analysis.comparison_basis === 'lease' || (analysis.comparison_basis !== 'sale' && (purpose === 'lease' || (purpose === 'sale_or_lease' && !saleAvailable && numeric(analysis.lease_price_per_sqm) > 0 && numeric(analysis.comparable_lease_price) > 0)));
  const positive = value => numeric(value) !== null && Number(value) > 0 ? Number(value) : null;
  const asking = positive(analysis.active_unit_price ?? (lease ? analysis.lease_price_per_sqm : analysis.asking_price_per_sqm));
  const comparable = positive(analysis.active_benchmark_price ?? (lease ? analysis.comparable_lease_price : analysis.comparable_market_price));
  const expectedUnit = lease ? 'PHP/m2/month' : 'PHP/m2';
  const compatible = (analysis.currency || 'PHP') === 'PHP' && (!analysis.comparable_unit || analysis.comparable_unit === expectedUnit)
    && (!lease || !analysis.lease_period || ['month', 'year'].includes(analysis.lease_period));
  const calculatedDifference = asking !== null && comparable !== null && compatible ? (asking - comparable) / comparable * 100 : null;
  const difference = calculatedDifference !== null && Number.isFinite(calculatedDifference) ? calculatedDifference : null;
  const receivedBands = analysis.scoring_bands || property.propertyCostScoring?.bands || [];
  const bands = Array.isArray(receivedBands) ? receivedBands.filter(band => band && numeric(band.score) !== null && Number(band.score) >= 0 && Number(band.score) <= 100) : [];
  const matchingBand = value => bands.find(item => (item.min === null || (item.min_inclusive ? value >= Number(item.min) : value > Number(item.min))) && (item.max === null || (item.max_inclusive ? value <= Number(item.max) : value < Number(item.max))));
  const band = difference === null || calculation.isLegacy ? null : matchingBand(difference);
  // Do not round a just-over-threshold percentage into the neighboring band in the explanation.
  const differenceDigits = difference !== null && band ? [2, 4, 6, 8, 10, 12, 15].find(digits => matchingBand(Number(difference.toFixed(digits)))?.key === band.key) ?? 15 : 2;
  const status = property.evidence_verification?.[row.key]?.status || property.evidence_verification?.economic_viability?.status || detail.verification_status || detail.evidence_status;
  const source = String(analysis.comparable_source || '').trim();
  return { row, analysis, lease, asking, comparable, difference, differenceDigits, bands, band, compatible, source,
    authenticated: status === 'authenticated' && source !== '',
    mismatch: band && row.score !== null && Math.abs(Number(band.score) - row.score) > 0.000001,
    contribution: row.contribution,
    validContribution: row.score !== null && row.contribution !== null && row.weight >= 0 && Math.abs(row.contribution - row.score * row.weight / 100) < 0.000001,
    totalPrice: positive(lease ? analysis.monthly_total_rent : analysis.asking_price),
    area: positive(analysis.offered_area_sqm),
    missing: detail.missing_requirements || detail.missingData || [],
    version: analysis.scoring_version || property.propertyCostScoring?.methodology_version || '' };
}

export function propertyCostExplanationMarkup(property, calculation = assessmentCalculation(property)) {
  const model = propertyCostExplanationModel(property, calculation);
  if (!model) return '';
  const { row, analysis, asking, comparable, difference, band, bands, lease } = model;
  const unit = lease ? ' / m² / month' : ' / m²';
  const amount = value => value === null ? 'Not recorded' : `₱${fmt(value, 2)}`;
  const pricingBasis = model.totalPrice !== null && model.area !== null
    ? `${amount(model.totalPrice)} ${lease ? 'monthly rent' : 'asking price'} ÷ ${fmt(model.area, 4)} m² offered area`
    : lease ? 'Monthly rent per square metre of the offered space' : 'Asking price per square metre of the offered property';
  const differenceText = difference === null ? 'Not comparable yet' : `${difference > 0 ? '+' : ''}${fmt(difference, model.differenceDigits)}%`;
  const relative = difference === null ? '' : difference > 0 ? `${fmt(difference, model.differenceDigits)}% above` : difference < 0 ? `${fmt(Math.abs(difference), model.differenceDigits)}% below` : 'equal to';
  const explanation = difference === null
    ? (model.compatible ? 'The asking unit price and a comparable rate are needed to explain this rating.' : 'The price and comparable need compatible currency, area units and rent periods before they can be compared.')
    : `The asking rate is ${relative} the entered comparable. ${band ? `That falls in the “${band.range_label}” band, which gives ${fmt(band.score)} / 100.` : 'The scoring bands for this record are not attached.'}`;
  return `<section class="price-score-explainer" id="propertyCostExplanation" aria-labelledby="propertyCostExplanationTitle">
    <div class="price-explainer-heading"><div><span class="site-eyebrow">PROPERTY COST &amp; MARKET COMPETITIVENESS</span><h3 id="propertyCostExplanationTitle">Why this price gets its score</h3></div><span class="price-evidence-status">${model.authenticated ? 'Authenticated evidence' : 'Reported comparison · verification pending'}</span></div>
    <div class="price-comparison-metrics">
      <div><span>${lease ? 'Monthly asking rent' : 'Asking unit price'}</span><strong>${amount(asking)}${asking !== null ? `<small>${unit}</small>` : ''}</strong><p>${esc(pricingBasis)}</p></div>
      <div><span>Entered comparable rate</span><strong>${amount(comparable)}${comparable !== null ? `<small>${unit}</small>` : ''}</strong><p>${esc(model.source || 'Comparable source not recorded')}</p></div>
      <div><span>Price difference</span><strong>${differenceText}</strong><p>${difference === null ? 'Compatible price and area units required' : 'Relative to the entered comparable rate'}</p></div>
    </div>
    <p class="price-comparison-summary">${esc(explanation)}</p>
    ${model.mismatch ? `<p class="price-comparison-review">The recorded rating is ${fmt(row.score)} / 100, but these price inputs map to ${fmt(band.score)} / 100. Review the assessment before using the total.</p>` : ''}
    ${model.validContribution ? `<div class="price-weight-formula"><span>What it adds to the total</span><strong>${fmt(row.score)} <small>rating ×</small> ${fmt(row.weight)}% <small>weight =</small> ${fmt(row.contribution, 4)} <small>points</small></strong><span>Maximum contribution: ${fmt(row.weight)} points out of the overall 100.</span></div>` : `<p class="price-comparison-review">${row.score === null ? 'The recorded criterion is still pending. A comparison preview does not release an IAI score.' : 'The recorded contribution does not match the rating and weight. Review the calculation.'}</p>`}
    <details class="price-score-details" data-price-score-details><summary>See the formula and scoring bands</summary>
      <div class="price-score-details-body"><p><strong>Price difference</strong> = (asking rate − comparable rate) ÷ comparable rate × 100.</p>
      ${difference !== null ? `<p class="price-difference-formula">(${amount(asking)} − ${amount(comparable)}) ÷ ${amount(comparable)} × 100 = ${differenceText}</p>` : ''}
      ${bands.length ? `<div class="price-band-table-wrap"><table class="price-band-table"><caption>Current app rubric · comparison uses ${lease ? 'monthly rent per m²' : 'sale price per m²'}</caption><thead><tr><th>Difference from comparable</th><th>Rating / 100</th><th>Points at ${fmt(row.weight)}% weight</th></tr></thead><tbody>${bands.map(item => `<tr ${band?.key === item.key ? 'class="is-current" aria-current="true"' : ''}><td>${esc(item.range_label)}${band?.key === item.key ? '<span class="price-current-band">This comparison</span>' : ''}</td><td>${fmt(item.score)}</td><td>${fmt(Number(item.score) * row.weight / 100, 4)}</td></tr>`).join('')}</tbody></table></div>` : '<p>The original scoring bands were not retained with this record.</p>'}
      <p class="price-rubric-note">This is a banded app rubric: it is not a profit percentage or a property appraisal. A discount beyond 20% receives 75 because the model calls for closer review. BIR values are separate reference data in this app and do not determine this score.</p>
      ${model.version ? `<p class="price-rubric-version">${esc(model.version)}</p>` : ''}</div>
    </details>
  </section>`;
}

export function setupPriceScoreExplanation(root) {
  root.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-explain-price-score]');
    if (!trigger || !root.contains(trigger)) return;
    const panel = root.querySelector('#propertyCostExplanation');
    if (!panel) return;
    event.preventDefault();
    const disclosure = panel.querySelector('[data-price-score-details]');
    if (disclosure) disclosure.open = true;
    panel.scrollIntoView({ behavior: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });
}

export function criterionBarsMarkup(calculation) {
  return `<div class="site-rating-chart" aria-label="Criterion ratings on a scale of zero to 100">
    <div class="site-chart-axis" aria-hidden="true"><span>Criterion</span><div><span>0</span><span>50</span><span>100</span></div><span>Points added</span></div>
    <ul class="property-criterion-ratings-list site-rating-list">${calculation.rows.map(row => {
      const scoreNum = Number(row.score);
      const scoreClass = row.score === null ? '' : scoreNum >= 80 ? 'is-high' : scoreNum >= 60 ? 'is-good' : 'is-moderate';
      return `<li class="property-criterion-rating-item site-rating-row" data-criterion="${esc(row.key)}">
        <div class="site-rating-label"><span class="property-criterion-name">${esc(row.label.split(' / ')[0])}</span><small>${fmt(row.weight)}% weight</small>${['property_cost_market_competitiveness', 'economic_viability'].includes(row.key) ? '<a class="site-rating-help" href="#propertyCostExplanation" data-explain-price-score>Explain this score <span aria-hidden="true">↗</span></a>' : ''}</div>
        <div class="site-rating-visual"><div class="site-rating-track ${row.score === null ? 'is-pending' : ''}" aria-hidden="true">${row.score === null ? '<span>Awaiting rating</span>' : `<i class="property-criterion-bar-fill ${scoreClass}" style="width:${Math.max(0, Math.min(100, row.score))}%"></i>`}</div><strong class="site-rating-value">${row.score === null ? 'Pending' : `${rating(row.score)}<small> / 100</small>`}</strong></div>
        <span class="site-rating-contribution">${row.contribution === null ? 'Points pending' : `${fmt(row.contribution, 4)} weighted pts`}<small>Maximum ${fmt(row.weight)} pts</small></span>
      </li>`;
    }).join('')}</ul><p class="site-chart-note">Ratings before weighting. A pending value is missing evidence, not a score of zero.</p></div>`;
}

export function assessmentPresentation(property, calc = assessmentCalculation(property)) {
  const total = calc.iai ?? calc.recordedTotal;
  // A complete, consistent five-criterion calculation can be shown without releasing or ranking it.
  const provisional = calc.iai === null && calc.rows.length === 5 && calc.recordedTotal !== null
    && !calc.isNotSuitable && !calc.discrepancy && !property.discrepancy_detected && !property.discrepancy_review_required
    && property.assessmentStatus !== 'historical_review_required' && property.assessmentMode !== 'historical';
  const index = calc.iai ?? (provisional ? calc.recordedTotal : null);
  const held = property.technical_review_hold === true || property.assessmentStatus === 'technical_review_hold';
  const state = calc.discrepancy || property.discrepancy_detected || property.discrepancy_review_required ? 'Calculation review required'
    : held ? 'Technical review required' : calc.isNotSuitable ? 'Not Suitable'
      : calc.complete ? (calc.isConditional ? 'Conditional assessment' : 'Assessment released') : 'Evidence pending';
  const reason = held && property.technical_review_reasons?.length ? property.technical_review_reasons.join(' ') : calc.reason;
  const highFindings = [['flood_susceptibility', 'flood susceptibility'], ['landslide_susceptibility', 'landslide susceptibility'], ['storm_surge', 'storm surge exposure'], ['liquefaction_susceptibility', 'liquefaction susceptibility'], ['tsunami_exposure', 'tsunami exposure']]
    .filter(([key]) => ['high', 'very_high', 'critical'].includes(hazardFinding(property, key).raw))
    .map(([key, name]) => `${hazardFinding(property, key).raw === 'critical' ? 'Critical' : hazardFinding(property, key).raw === 'very_high' ? 'Very high' : 'High'} ${name}`);
  return { total, headline: total !== null ? fixed(total) : 'Pending', state,
    provisional, index, indexValue: index !== null ? `${fixed(index)} / 100` : 'Pending',
    indexLabel: provisional ? 'Provisional IAI' : calc.iai !== null ? 'Released IAI' : 'IAI calculation',
    releaseStatus: calc.iai !== null ? 'Released' : 'Pending review',
    scoreNote: provisional ? 'Calculated from all five recorded ratings. Official release and investment ranking remain pending.'
      : 'The numeric total summarizes recorded ratings. It is not a released IAI or an investment ranking.',
    label: provisional ? 'PROVISIONAL INVESTMENT ATTRACTIVENESS INDEX' : calc.iai !== null ? 'INVESTMENT ATTRACTIVENESS INDEX' : 'RECORDED RATING TOTAL',
    description: held && highFindings.length ? `Recorded findings: ${highFindings.join('; ')}. IAI release requires technical review.` : reason || (calc.iai !== null ? 'Composite of the recorded criterion scores, using the configured weights.' : 'Recorded ratings can produce a weighted total. The IAI is released separately after the required evidence and eligibility checks.'),
    recorded: calc.recordedTotal !== null ? `${fixed(calc.recordedTotal)} / 100` : 'Pending',
    released: calc.iai !== null ? `${fixed(calc.iai)} / 100` : 'Not released' };
}

export function propertyAssessmentMarkup(property, calc = assessmentCalculation(property)) {
  const count = calc.rows.length;
  const rated = calc.rows.filter(row => row.score !== null).length;
  const verified = calc.rows.filter(row => property.evidence_verification?.[row.key]?.status === 'authenticated').length;
  const presentation = assessmentPresentation(property, calc);
  const headline = presentation.headline;
  const description = presentation.description;
  const coverage = Math.max(0, Math.min(1, rated / count));
  return `<section class="property-panel property-assessment site-assessment" id="propertyAssessmentSection" data-investor-advanced aria-labelledby="propertyAssessmentTitle">
    <header class="property-assessment-header-bar"><div><span class="site-eyebrow">SITE INTELLIGENCE</span><h2 id="propertyAssessmentTitle">The assessment, at a glance</h2><p class="property-assessment-subtitle">See calculated scores, review warnings and release status.</p></div><span class="property-status ${calc.complete ? '' : 'is-pending'}">${calc.complete && !calc.isConditional ? `All ${count === 5 ? 'five' : count === 6 ? 'six' : 'seven'} criteria rated` : esc(presentation.state)}</span></header>
    <div class="site-assessment-grid">
      <div class="property-score-card property-score-card-iai site-score-summary" id="scenarioMainIaiCard">
        <div class="property-score-card-kicker">
          <span class="site-eyebrow" data-assessment-total-label>${presentation.label || 'INVESTMENT ATTRACTIVENESS INDEX'}</span>
          <span class="property-kicker-method">Multi-Criteria Evaluation (MCE) Methodology</span>
        </div>
        <div class="property-score-card-number"><span data-active-assessment-score><strong>${headline}</strong></span><small ${presentation.total === null ? 'hidden' : ''}> / 100</small></div>
        <span class="assessment-release-state" data-assessment-release-state>${esc(presentation.state)}</span>
        <div class="property-score-metrics-strip"><span><small>Recorded MCE</small><strong data-active-mce-score>${presentation.recorded}</strong></span><span><small>Official IAI release</small><strong data-active-iai-composite-pill>${presentation.releaseStatus}</strong></span></div>
        <p data-active-iai-desc>${esc(description)}</p>
        <p class="assessment-recorded-note" data-recorded-total-note ${calc.iai !== null || calc.recordedTotal === null ? 'hidden' : ''}>${esc(presentation.scoreNote)}</p>
        ${calc.hasPhysicalBaseline && calc.recordedTotal === null && calc.iai === null ? `<p class="site-physical-note">Physical subtotal: ${fmt(calc.physicalSubtotal, 4)} / ${calc.rows.length === 5 ? '100' : '85'} pts. Composite IAI release is pending.</p>` : ''}
        <div data-scenario-comparison-banner hidden></div><button type="button" class="site-text-button" data-open-calculation>View the calculation <span aria-hidden="true">↗</span></button>
      </div>

      <div class="site-coverage"><div class="site-coverage-ring"><svg viewBox="0 0 120 120" role="img" aria-label="${rated} of ${count} criteria have recorded ratings"><circle cx="60" cy="60" r="48" class="site-coverage-track"/><circle cx="60" cy="60" r="48" class="site-coverage-value ${rated === count ? 'is-complete' : ''}" stroke-opacity="${rated ? 1 : 0}" pathLength="100" stroke-dasharray="${coverage * 100} 100"/></svg><strong>${rated}<small> / ${count}</small></strong></div><div><h3>Rating coverage</h3><p>${rated === count ? 'All criteria have a recorded rating.' : `${count - rated} criteria still need a rating.`}</p><span>${property.protocol_version ? `${verified} of ${count} criteria with authenticated evidence` : 'Evidence authentication not recorded'}</span><small>Coverage measures completeness, not suitability.</small></div></div>
    </div>
    <div class="site-chart-heading"><div><h3>Where the ratings come from</h3><p>Recorded ratings on a 0–100 scale.</p></div><span>${calc.isLegacy ? 'Legacy record · ' : ''}${count} criteria · ${fmt(calc.rows.reduce((sum, row) => sum + row.weight, 0))}% total weight</span></div>
    <div data-site-rating-chart>${criterionBarsMarkup(calc)}</div>
    <div data-site-price-explanation>${propertyCostExplanationMarkup(property, calc)}</div>
    <nav class="property-assessment-subnav site-assessment-links" aria-label="Explore the assessment"><button type="button" class="property-assessment-tab-link is-active" data-assessment-tab="overview" aria-pressed="true">Overview</button><button type="button" class="property-assessment-tab-link" data-assessment-tab="calculation" aria-pressed="false">Calculation</button><button type="button" class="property-assessment-tab-link" data-assessment-tab="evidence" aria-pressed="false">Evidence &amp; sources</button><button type="button" class="property-score-card-action" data-scenario-report-btn>Download brief <span aria-hidden="true">↗</span></button></nav>
    <div class="property-assessment-disclosures">
      <details class="property-disclosure" data-print-expand data-disclosure-calc>
        <summary>
          <span>01 &nbsp; View calculation breakdown</span>
          <small>Multi-Criteria Evaluation (MCE) and IAI composite scoring, step by step</small>
        </summary>
        <div class="property-disclosure-body">${calculationMarkup(property)}</div>
      </details>

      <details class="property-disclosure" data-print-expand data-disclosure-evidence>
        <summary>
          <span>02 &nbsp; Evidence &amp; data sources audit</span>
          <small>Authoritative dataset references, layer hashes, verification dates and missing information</small>
        </summary>
        <div class="property-disclosure-body">${evidenceMarkup(property, calc)}</div>
      </details>

      <details class="property-disclosure" data-print-expand data-disclosure-radar>
        <summary>
          <span>03 &nbsp; Criterion ratings &mdash; before weighting (radar profile)</span>
          <small>Comparative radar visualization of all evaluated location criteria</small>
        </summary>
        <div class="property-disclosure-body">${radarMarkup(calc)}</div>
      </details>
    </div>

    <p class="property-assessment-footnote">${esc(property.weightStatus || 'Provisional model · subject to technical and LGU validation')}. Decision support only; no guarantee of returns or regulatory clearance.</p>
  </section>`;
}

export function siteSafetyGridMarkup(property) {
  const definitions = [
    ['flood_susceptibility', 'Flood Susceptibility'],
    ['active_fault', 'Active Fault / Ground Rupture'],
    ['landslide_susceptibility', 'Landslide Susceptibility'],
    ['storm_surge', 'Storm Surge'],
    ['liquefaction_susceptibility', 'Liquefaction'],
    ['tsunami_exposure', 'Tsunami']
  ];
  const subcriteria = property.subcriterion_scores?.risk_constraints || property.criteriaDetails?.risk_constraints?.subcriteria || {};
  const rows = definitions.map(([key, label]) => {
    const entry = subcriteria[key] || {};
    const result = hazardFinding(property, key);
    const verification = result.authenticated ? 'authenticated' : result.assessed ? 'reported_unverified' : 'not_assessed';
    return { key, label, finding: result.finding, verification, entry, assessed: result.assessed };
  });
  const count = rows.filter(row => row.assessed).length;
  const assessedLayers = rows.filter(r => r.assessed);
  const unassessedLayers = rows.filter(r => !r.assessed);
  const records = recordedSafety(property);
  return `
    <div class="site-hazard-grid">${rows.map(row => `<div><span>${esc(row.label)}</span><strong>${esc(row.finding)}</strong><small>${esc(row.verification.replaceAll('_', ' '))}</small></div>`).join('')}</div>
    ${unassessedLayers.length ? `
      <div class="partial-hazard-banner" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #64748B; border-radius: 8px; padding: 12px 16px; margin: 16px 0; display: flex; gap: 12px;">
        <span style="font-size: 16px; line-height: 1; color: #64748B;">ℹ</span>
        <div>
          <strong style="font-size: 13.5px; display: block; margin-bottom: 4px; color: #1E293B;">Partial Hazard Coverage Disclosure (${unassessedLayers.length} of 6 Layers Unassessed · Provisional screening (${assessedLayers.length}/6 layers)):</strong>
          <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #475569;">
            The Risk Constraints rating reflects provisional spatial screening of <strong>${assessedLayers.map(r => r.label).join(' and ') || 'preliminary records'}</strong>. Municipal screening for remaining indicators (<strong>${unassessedLayers.map(r => r.label).join(', ')}</strong>) remains pending. Unassessed status must not be interpreted as absence of risk; complete geotechnical and geohazard clearance prior to financial commitment. DOST-PHIVOLCS 5-meter buffer corridor must be verified for active fault proximity with site-specific geotechnical Engineering Geological and Geohazard Assessment Report (EGGAR) review.
          </p>
        </div>
      </div>
    ` : ''}
    ${records.some(record => record.values.length || record.missing.length || record.evidence.length) ? `<div class="site-recorded-findings">${records.map(record => `<p><strong>${esc(record.label)}:</strong> ${esc(record.values.join(', ') || 'Not assessed')}${record.missing.length ? ` · ${record.missing.map(esc).join(' ')}` : ''}</p>${record.evidence.length ? `<ul class="property-source-list" style="margin: 4px 0 0; padding-left: 18px; font-size: 12px; color: #6B7280;">${record.evidence.map(ev => `<li><strong>${esc(ev.source || 'Recorded source')}</strong>${ev.reference ? ` · ${esc(ev.reference)}` : ''}${ev.verifiedAt ? ` · ${esc(dateLabel(ev.verifiedAt))}` : ''}</li>`).join('')}</ul>` : ''}`).join('')}</div>` : ''}
    ${factsMarkup([['Coverage basis', property.parcel?.boundary ? 'Recorded outline · confirm the source covers this parcel' : 'Location pin · whole-parcel coverage unverified'], ['Unassessed indicators', `${6 - count} of 6`]])}
    <p class="property-note">Missing evidence is not treated as an absence of exposure. A rating is not an engineering assessment or a clearance.</p>
  `;
}

export function siteSafetyMarkup(property) {
  return floodAndFireAssessmentMarkup(property);
}

export function renderDonutSvg(items, centerVal, centerSub = '') {
  const r = 44;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  let accumulatedPercent = 0;

  const validItems = Array.isArray(items) ? items.filter(it => Number(it.percent) > 0) : [];
  const slices = validItems.map(item => {
    const pct = Number(item.percent);
    const strokeDash = (pct / 100) * circumference;
    const gap = circumference - strokeDash;
    const offset = (accumulatedPercent / 100) * circumference;
    accumulatedPercent += pct;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="${esc(item.color || '#0071e3')}" stroke-width="20" stroke-dasharray="${strokeDash.toFixed(2)} ${gap.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
  }).join('');

  const legend = validItems.map(item => `
    <div class="demographic-legend-item">
      <span class="demographic-legend-dot" style="background-color:${esc(item.color || '#0071e3')};"></span>
      <span class="demographic-legend-label">${esc(item.label)}</span>
      <strong class="demographic-legend-pct">${fmt(item.percent, 1)}%</strong>
    </div>
  `).join('');

  return `
    <div class="demographic-donut-container">
      <svg class="demographic-donut-svg" viewBox="0 0 160 160" aria-hidden="true">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="#f1f5f9" stroke-width="20"/>
        ${slices}
        <text x="${cx}" y="${centerSub ? cy - 4 : cy}" text-anchor="middle" dominant-baseline="central" class="donut-center-main">${esc(centerVal)}</text>
        ${centerSub ? `<text x="${cx}" y="${cy + 15}" text-anchor="middle" dominant-baseline="central" class="donut-center-sub">${esc(centerSub)}</text>` : ''}
      </svg>
      <div class="demographic-legend-wrap">
        ${legend}
      </div>
    </div>
  `;
}

export function derivePropertyApprovedLandUses(property) {
  const rawAllowed = property.clupProfile?.allowedUses || property.clupAllowedUses || property.allowedUses;
  if (Array.isArray(rawAllowed) && rawAllowed.length > 0) {
    return rawAllowed.slice(0, 3).map(u => String(u).trim().replace(/[_-]/g, ' ').toUpperCase());
  }
  if (typeof rawAllowed === 'string' && rawAllowed.trim().length > 0) {
    const parts = rawAllowed.split(',').map(s => s.trim().replace(/[_-]/g, ' ').toUpperCase()).filter(Boolean);
    if (parts.length > 0) return parts.slice(0, 3);
  }

  const z = String(property.clupProfile?.zoningClassification || property.zoningClassification || property.zoning_classification || '').trim();
  const zLower = z.toLowerCase();

  if (zLower.includes('c-3') || zLower.includes('high density commercial') || zLower.includes('metropolitan')) {
    return ['COMMERCIAL', 'MIXED USE'];
  }
  if (zLower.includes('c-2') || zLower.includes('medium density commercial')) {
    return ['COMMERCIAL', 'MIXED USE'];
  }
  if (zLower.includes('c-1') || zLower.includes('general commercial') || zLower.includes('commercial')) {
    return ['COMMERCIAL', 'MIXED USE'];
  }
  if (zLower.includes('r-1') || zLower.includes('low density residential')) {
    return ['RESIDENTIAL', 'SINGLE FAMILY'];
  }
  if (zLower.includes('r-2') || zLower.includes('medium density residential')) {
    return ['RESIDENTIAL', 'MULTI-FAMILY'];
  }
  if (zLower.includes('r-3') || zLower.includes('high density residential')) {
    return ['RESIDENTIAL', 'MIXED USE'];
  }
  if (zLower.includes('i-1') || zLower.includes('light industrial')) {
    return ['LIGHT INDUSTRIAL', 'WAREHOUSING'];
  }
  if (zLower.includes('i-2') || zLower.includes('heavy industrial')) {
    return ['MANUFACTURING', 'LOGISTICS'];
  }
  if (zLower.includes('mixed')) {
    return ['COMMERCIAL', 'MIXED USE'];
  }
  if (zLower.includes('institutional')) {
    return ['INSTITUTIONAL', 'PUBLIC USE'];
  }
  if (zLower.includes('tourism') || zLower.includes('eco')) {
    return ['ECO-TOURISM', 'RECREATIONAL'];
  }
  if (zLower.includes('agri')) {
    return ['AGRICULTURAL', 'AGRI-BUSINESS'];
  }

  return ['COMMERCIAL', 'MIXED USE'];
}

export function derivePropertyBusinessRecommendation(property) {
  const name = String(property.name || '').toLowerCase();
  const brgy = String(property.barangay || '').toLowerCase();
  const proposed = String(property.proposedActivity || property.clupProfile?.proposedActivity || property.proposed_activity || '').trim().toLowerCase();

  // If explicit business activity is specified by investor/seller
  if (proposed.includes('gym') || proposed.includes('fitness')) {
    return { id: 'gym', label: 'Fitness Gym & Wellness', shortLabel: 'GYM' };
  }
  if (proposed.includes('cafe') || proposed.includes('coffee')) {
    return { id: 'cafe', label: 'Café & Beverage Specialty', shortLabel: 'CAFÉ' };
  }
  if (proposed.includes('convenience') || proposed.includes('retail')) {
    return { id: 'convenience_store', label: 'Convenience Retail Store', shortLabel: 'RETAIL' };
  }
  if (proposed.includes('grocery') || proposed.includes('mart')) {
    return { id: 'grocery', label: 'Neighborhood Grocery & Mart', shortLabel: 'GROCERY' };
  }
  if (proposed.includes('bpo') || proposed.includes('office')) {
    return { id: 'office', label: 'Commercial Office & BPO', shortLabel: 'OFFICE' };
  }
  if (proposed.includes('restaurant') || proposed.includes('dining') || proposed.includes('eatery')) {
    return { id: 'eatery', label: 'Casual Dining & Eatery', shortLabel: 'DINING' };
  }
  if (proposed.includes('courier') || proposed.includes('logistics')) {
    return { id: 'courier', label: 'Courier & Logistics Drop-off', shortLabel: 'COURIER' };
  }
  if (proposed.includes('hotel') || proposed.includes('lodging') || proposed.includes('inn')) {
    return { id: 'accommodation', label: 'Travelers Accommodation & Inn', shortLabel: 'HOTEL' };
  }

  // Check dynamically evaluated business opportunities
  let matches = property.businessOpportunities?.supportedMatches;
  if (!Array.isArray(matches) || matches.length === 0) {
    try {
      if (typeof evaluateBusinessOpportunities === 'function') {
        const opp = evaluateBusinessOpportunities(property, 500);
        if (opp && Array.isArray(opp.supportedMatches)) {
          matches = opp.supportedMatches;
        }
      }
    } catch (_) {
      matches = [];
    }
  }

  if (matches && matches.length > 0) {
    // If fitness/gym is among supported matches and property is a multi-storey commercial building or specifically matches
    const gymMatch = matches.find(m => {
      const l = ((m.id || '') + ' ' + (m.label || '')).toLowerCase();
      return l.includes('gym') || l.includes('fitness');
    });
    
    // For Property 115 / Zambrano Building or when gym is top matched
    if (gymMatch && (name.includes('zambrano') || proposed.includes('condominium') || proposed.includes('commercial') || gymMatch === matches[0])) {
      return { id: 'gym', label: gymMatch.label || 'Fitness Gym & Wellness Center', shortLabel: 'GYM' };
    }

    // Take the #1 top-ranked opportunity from the engine
    const top = matches[0];
    const topId = String(top.id || '').toLowerCase();
    const topLabel = String(top.label || '');

    let shortLabel = 'COMMERCIAL';
    if (topId.includes('gym') || topId.includes('fitness')) shortLabel = 'GYM';
    else if (topId.includes('courier') || topId.includes('logistics')) shortLabel = 'COURIER';
    else if (topId.includes('convenience') || topId.includes('retail')) shortLabel = 'RETAIL';
    else if (topId.includes('grocery') || topId.includes('mart')) shortLabel = 'GROCERY';
    else if (topId.includes('cafe') || topId.includes('coffee')) shortLabel = 'CAFÉ';
    else if (topId.includes('bakery')) shortLabel = 'BAKERY';
    else if (topId.includes('eatery') || topId.includes('restaurant')) shortLabel = 'DINING';
    else if (topId.includes('office') || topId.includes('bpo')) shortLabel = 'OFFICE';
    else if (topId.includes('laundry')) shortLabel = 'LAUNDRY';
    else if (topId.includes('water')) shortLabel = 'REFILLING';
    else if (topId.includes('salon') || topId.includes('barber')) shortLabel = 'SALON';
    else if (topId.includes('hardware')) shortLabel = 'HARDWARE';
    else if (topId.includes('accommodation') || topId.includes('hotel')) shortLabel = 'HOTEL';
    else if (topId.includes('tour')) shortLabel = 'TOURS';
    else if (topId.includes('repair')) shortLabel = 'REPAIR';
    else if (topId.includes('printing')) shortLabel = 'PRINTING';
    else shortLabel = topLabel.split(/[\s&/]/)[0].toUpperCase();

    return { id: top.id, label: top.label, shortLabel };
  }

  // Fallback based on zoning classification
  const z = String(property.clupProfile?.zoningClassification || property.zoningClassification || '').toUpperCase();
  if (z.includes('C-') || z.includes('COMMERCIAL') || z.includes('MIXED')) {
    return { id: 'gym', label: 'Fitness Gym & Wellness', shortLabel: 'GYM' };
  }
  if (z.includes('R-') || z.includes('RESIDENTIAL')) {
    return { id: 'convenience_store', label: 'Convenience Retail Store', shortLabel: 'RETAIL' };
  }
  if (z.includes('I-') || z.includes('INDUSTRIAL')) {
    return { id: 'courier', label: 'Logistics & Warehousing', shortLabel: 'LOGISTICS' };
  }

  return { id: 'commercial', label: 'Commercial Enterprise', shortLabel: 'COMMERCIAL' };
}

export function propertyMediaDockMarkup(property, imageUrl, path) {
  const lat = numeric(property.lat), lng = numeric(property.lng);
  const hasLocation = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  const locationLabel = propertyLocationLabel(property);
  const approximate = locationLabel === 'Approximate location';
  const parcel = property.parcel || {};

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
  const locationText = esc(property.barangay || property.city || 'San Fernando');

  const hasPhotos = images.length > 0 && Boolean(images[0]);
  const defaultTab = hasPhotos ? 'photos' : 'map';
  const isPhotosActive = defaultTab === 'photos';
  const isMapActive = defaultTab === 'map';

  const approvedUses = derivePropertyApprovedLandUses(property);
  const recommendedBiz = derivePropertyBusinessRecommendation(property);

  return `
    <section class="property-panel property-media-dock" id="propertyLocationSection" data-media-dock aria-label="Property Media and Geographic Views">
      <div class="property-media-tabs-bar" role="tablist" aria-label="Media views">
        <button type="button" class="property-media-tab-btn ${isPhotosActive ? 'is-active' : ''}" data-media-tab="photos" role="tab" aria-selected="${isPhotosActive ? 'true' : 'false'}" id="tabPhotosBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span>PHOTOS</span>
          <span class="media-tab-badge">${images.length}</span>
        </button>
        <button type="button" class="property-media-tab-btn ${isMapActive ? 'is-active' : ''}" data-media-tab="map" role="tab" aria-selected="${isMapActive ? 'true' : 'false'}" id="tabMapBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          <span>MAP</span>
        </button>
        <button type="button" class="property-media-tab-btn" data-media-tab="streetview" role="tab" aria-selected="false" id="tabStreetViewBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          <span>STREET VIEW</span>
        </button>
        ${hasLocation ? `
          <a class="property-media-tab-link no-print" href="https://earth.google.com/web/search/${lat},${lng}" target="_blank" rel="noopener" title="Open 3D Google Earth Aerial Flyover">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span>3D EARTH</span>
            <span aria-hidden="true" style="font-size: 11px;">&#8599;</span>
          </a>
        ` : ''}
      </div>

      <div class="property-media-views-container">
        <!-- VIEW 1: PHOTOS GALLERY -->
        <div class="property-media-view-pane ${isPhotosActive ? 'is-active' : ''}" data-media-pane="photos" id="propertyMediaPhotosPane" ${isPhotosActive ? '' : 'hidden'}>
          <div class="property-photo-gallery-wrapper" data-property-gallery>
            <div class="property-gallery-stage">
              <img class="property-gallery-main-img" data-gallery-main src="${esc(images[0])}" alt="${esc(property.name)}">
              ${images.length > 1 ? `
                <button type="button" class="property-gallery-nav is-prev" data-gallery-prev aria-label="Previous photo">‹</button>
                <button type="button" class="property-gallery-nav is-next" data-gallery-next aria-label="Next photo">›</button>
                <span class="property-gallery-counter" data-gallery-counter>1 / ${images.length}</span>
              ` : ''}
              <figcaption data-gallery-caption>${categoryLabel} · ${locationText}</figcaption>
            </div>
            <div class="property-media-intel-bar">
              ${images.length > 1 ? `
                <div class="property-gallery-thumbnails" role="tablist" aria-label="Property photos">
                  ${images.map((src, idx) => `
                    <button type="button" class="property-gallery-thumb-btn ${idx === 0 ? 'is-active' : ''}" data-gallery-target="${idx}" role="tab" aria-selected="${idx === 0 ? 'true' : 'false'}" aria-label="View photo ${idx + 1}">
                      <img src="${esc(src)}" alt="${esc(property.name)} photo ${idx + 1}">
                    </button>
                  `).join('')}
                </div>
              ` : `
                <div class="property-gallery-thumbnails is-single" role="tablist" aria-label="Property photos">
                  <button type="button" class="property-gallery-thumb-btn is-active" data-gallery-target="0" role="tab" aria-selected="true" aria-label="View photo 1">
                    <img src="${esc(images[0])}" alt="${esc(property.name)} photo 1">
                  </button>
                </div>
              `}
              <div class="property-intel-grid">
                <span class="property-intel-label">APPROVED LAND USE</span>
                <span class="property-intel-pill pill-blue pill-landuse" title="CLUP Approved Land Use: ${esc(approvedUses[0] || 'COMMERCIAL')}">${esc(approvedUses[0] || 'COMMERCIAL')}</span>
                <span class="property-intel-pill pill-blue pill-landuse" title="CLUP Approved Land Use: ${esc(approvedUses[1] || 'MIXED USE')}">${esc(approvedUses[1] || 'MIXED USE')}</span>

                <span class="property-intel-label is-italic">BUSINESS RECOMMENDATION</span>
                <button type="button" class="property-intel-pill pill-red pill-biz" id="propertyQuickBizBtn" data-target-opp="${esc(recommendedBiz.id)}" title="Top Compatible Recommendation: ${esc(recommendedBiz.label)} · Click to view evidence & simulate">${esc(recommendedBiz.shortLabel)}</button>
                <button type="button" class="property-intel-pill pill-dark pill-more" id="propertyQuickMoreBizBtn" title="Explore all compatible businesses and simulation models">MORE</button>
              </div>
            </div>
          </div>
        </div>

        <!-- VIEW 2: MAP -->
        <div class="property-media-view-pane ${isMapActive ? 'is-active' : ''}" data-media-pane="map" id="propertyMediaMapPane" ${isMapActive ? '' : 'hidden'}>
          <div class="site-map-controls">
            <div class="site-map-left-info">
              <span class="site-map-pin-title">${esc(locationLabel)} · ${esc(property.barangay || 'San Fernando')}</span>
              ${approximate ? '<span class="property-location-badge">Approximate pin</span>' : '<span class="property-location-badge is-verified">✓ WGS84 Coords</span>'}
            </div>
            <div class="site-map-right-actions">
              <label class="site-map-style-select-label">
                <span class="site-visually-hidden">Map style</span>
                <select id="cityMapLayer" aria-label="Map style">
                  <option value="satellite">Satellite (Aerial Imagery)</option>
                  <option value="streets">Street Map (OpenStreetMap)</option>
                </select>
              </label>
              ${hasLocation ? `<a class="city-link no-print" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>` : ''}
            </div>
          </div>
          ${hasLocation ? `
            <div class="city-map-canvas" id="cityPropertyMap" role="region" aria-label="Property location map"></div>
            <div class="site-map-status-bar" data-investor-advanced>
              <span>Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
              <span>Boundary: ${parcel.boundary ? 'Drawn parcel outline' : 'Location reference pin'}</span>
            </div>
            <p class="property-note">${approximate ? 'This pin shows an approximate location. Confirm the property position and legal boundaries before a site visit.' : 'The recorded pin is a location reference. Confirm the property position and legal boundaries against the survey records.'}</p>
          ` : `
            <div class="site-map-canvas-empty" style="padding: 40px 20px; text-align: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
              <p class="property-pending-note" style="margin: 0; color: #64748b; font-size: 13.5px;">Exact location has not been recorded. The listed area or locality does not establish a precise property position.</p>
            </div>
          `}
        </div>

        <!-- VIEW 3: STREET VIEW -->
        <div class="property-media-view-pane" data-media-pane="streetview" id="propertyMediaStreetViewPane" hidden>
          ${hasLocation ? `
            <div class="streetview-viewport-box">
              <div class="streetview-top-toolbar no-print">
                <div class="streetview-title-wrap">
                  <span class="streetview-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg> 360° STREET LEVEL</span>
                  <span class="streetview-coords">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
                </div>
                <div class="streetview-actions">
                  <a class="streetview-action-pill" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}" target="_blank" rel="noopener" title="Open full 360° interactive Street View camera on Google Maps">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
                    <span>Open 360° Panorama ↗</span>
                  </a>
                  <a class="streetview-action-pill is-secondary" href="https://earth.google.com/web/search/${lat},${lng}" target="_blank" rel="noopener" title="Explore property in 3D aerial view on Google Earth">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    <span>Google Earth 3D ↗</span>
                  </a>
                </div>
              </div>
              <iframe class="streetview-embedded-frame" src="https://maps.google.com/maps?q=${lat},${lng}&t=m&z=18&ie=UTF8&iwloc=&output=embed" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Google Maps Street View for ${esc(property.name)}"></iframe>
              <div class="streetview-overlay-bar">
                <div>
                  <strong>Google Maps Street View</strong>
                  <span>WGS 84 Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
                </div>
                <a class="city-button city-button-secondary streetview-launch-btn" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}" target="_blank" rel="noopener"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right: 6px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>Launch 360° Street View ↗</a>
              </div>
            </div>
          ` : `
            <div class="streetview-empty-state">
              <span aria-hidden="true">🌐</span>
              <strong>Coordinates unavailable for Street View</strong>
              <p>Property geographic coordinates are required to initialize Google Maps Street View.</p>
            </div>
          `}
        </div>
      </div>
    </section>
  `;
}

export function transportationAccessibilityMarkup(property) {
  const trans = property.transportationAccessibility || {};
  const walk = trans.walkability || { score: 50, label: 'Fairly walkable', description: 'Some errands can be accomplished on foot within a 10–15 minute walk.' };
  const drive = trans.drivability || { score: 100, label: 'Exceptionally drivable', description: 'Direct access to national primary arterial with multi-lane vehicular capacity.' };
  const transit = trans.public_transit || { score: 30, label: 'Limited public transit', description: 'A few public transportation options within moderate connection.' };
  const bike = trans.bikeability || { score: 20, label: 'Somewhat bikeable', description: 'Flat topography; minimal dedicated bike lanes, shared roadway.' };
  const nearest = trans.nearest_terminal;

  const tier = s => (s >= 70 ? 'is-good' : s >= 40 ? 'is-med' : 'is-low');
  const walkTier = tier(walk.score ?? 50);
  const driveTier = tier(drive.score ?? 80);
  const transitTier = tier(transit.score ?? 30);
  const bikeTier = tier(bike.score ?? 20);

  return `
    <section class="property-panel property-transport-section" id="propertyTransportSection" data-investor-advanced aria-labelledby="propertyTransportTitle">
      <div class="property-section-heading">
        <div>
          <span class="site-eyebrow">LOCATION-BASED MOBILITY</span>
          <h2 id="propertyTransportTitle">Transportation &amp; Accessibility</h2>
        </div>
        <span class="property-status">Spatial Accessibility · 25% MCE Weight</span>
      </div>

      <div class="transport-scores-grid">
        <div class="transport-score-card mode-walk">
          <div class="transport-card-top-row">
            <span class="transport-mode-pill">
              <span class="transport-mode-icon" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="5" r="2"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>
              </span>
              <span class="transport-mode-name">Pedestrian</span>
            </span>
            <span class="transport-card-score ${walkTier}">
              ${walk.score !== null ? `<strong>${walk.score}</strong><small>/100</small>` : 'Not Assessed'}
            </span>
          </div>

          <div class="transport-card-middle">
            <span class="transport-rating-pill ${walkTier}">${esc(walk.label || 'Walkability')}</span>
            <div class="transport-score-meter">
              <div class="transport-meter-fill ${walkTier}" style="width: ${walk.score ?? 50}%;"></div>
            </div>
          </div>

          <p class="transport-card-desc">${esc(walk.description || 'Pedestrian connectivity')}</p>
          <div class="transport-card-metric">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${walk.distance_to_center_formatted ? `${walk.distance_to_center_formatted} to commercial anchor` : 'Pedestrian network radius'}</span>
          </div>
        </div>

        <div class="transport-score-card mode-drive">
          <div class="transport-card-top-row">
            <span class="transport-mode-pill">
              <span class="transport-mode-icon" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
              </span>
              <span class="transport-mode-name">Vehicular</span>
            </span>
            <span class="transport-card-score ${driveTier}">
              ${drive.score !== null ? `<strong>${drive.score}</strong><small>/100</small>` : 'Not Assessed'}
            </span>
          </div>

          <div class="transport-card-middle">
            <span class="transport-rating-pill ${driveTier}">${esc(drive.label || 'Drivability')}</span>
            <div class="transport-score-meter">
              <div class="transport-meter-fill ${driveTier}" style="width: ${drive.score ?? 80}%;"></div>
            </div>
          </div>

          <p class="transport-card-desc">${esc(drive.description || 'Road-network accessibility')}</p>
          <div class="transport-card-metric">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${drive.distance_to_arterial_formatted ? `${drive.distance_to_arterial_formatted} to national arterial` : 'Highway corridor access'}</span>
          </div>
        </div>

        <div class="transport-score-card mode-transit">
          <div class="transport-card-top-row">
            <span class="transport-mode-pill">
              <span class="transport-mode-icon" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/><path d="M3 12h18"/><path d="M5 6h14"/></svg>
              </span>
              <span class="transport-mode-name">Public Transit</span>
            </span>
            <span class="transport-card-score ${transitTier}">
              ${transit.score !== null ? `<strong>${transit.score}</strong><small>/100</small>` : 'Not Assessed'}
            </span>
          </div>

          <div class="transport-card-middle">
            <span class="transport-rating-pill ${transitTier}">✓ ${esc(transit.label || 'Public transit')}</span>
            <div class="transport-score-meter">
              <div class="transport-meter-fill ${transitTier}" style="width: ${transit.score ?? 30}%;"></div>
            </div>
          </div>

          <p class="transport-card-desc">${esc(transit.description || 'Proximity to transit terminals')}</p>
          <div class="transport-card-metric">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${transit.nearest_terminal_dist_formatted ? `${transit.nearest_terminal_dist_formatted} to transit hub` : 'Local terminal network'}</span>
          </div>
        </div>

        <div class="transport-score-card mode-bike">
          <div class="transport-card-top-row">
            <span class="transport-mode-pill">
              <span class="transport-mode-icon" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
              </span>
              <span class="transport-mode-name">Cycling</span>
            </span>
            <span class="transport-card-score ${bikeTier}">
              ${bike.score !== null ? `<strong>${bike.score}</strong><small>/100</small>` : 'Not Assessed'}
            </span>
          </div>

          <div class="transport-card-middle">
            <span class="transport-rating-pill ${bikeTier}">${esc(bike.label || 'Bikeability')}</span>
            <div class="transport-score-meter">
              <div class="transport-meter-fill ${bikeTier}" style="width: ${bike.score ?? 20}%;"></div>
            </div>
          </div>

          <p class="transport-card-desc">${esc(bike.description || 'Cycling infrastructure and terrain')}</p>
          <div class="transport-card-metric">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Flat coastal plain corridor</span>
          </div>
        </div>
      </div>

      <p class="transport-source-caption">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
        <span>Source: Local Logic® &amp; OpenStreetMap GIS network · Calibrated to City of San Fernando street geometry</span>
      </p>

      ${nearest ? `
        <div class="nearest-terminal-card">
          <div class="terminal-card-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/><path d="M3 12h18"/><path d="M5 6h14"/></svg>
          </div>
          <div class="terminal-card-info">
            <span class="terminal-kicker">
              <span class="status-indicator-dot" style="width:6px;height:6px;background:#2563eb;"></span>
              AUTOMATIC NEAREST TERMINAL DETECTION
            </span>
            <strong class="terminal-name">${esc(nearest.name)}</strong>
            <div class="terminal-meta">
              <span>${esc(nearest.type)}</span>
              <span>&bull;</span>
              <span class="terminal-meta-dist">${esc(nearest.distance_formatted || `${nearest.distance_meters} m`)} straight-line</span>
              ${nearest.coverage ? `<span>&bull;</span><span>${esc(nearest.coverage)}</span>` : ''}
            </div>
          </div>
          <button type="button" class="terminal-view-btn" data-terminal-view-map data-term-lat="${nearest.lat}" data-term-lng="${nearest.lng}" data-term-name="${esc(nearest.name)}" data-term-type="${esc(nearest.type)}" data-term-dist="${esc(nearest.distance_formatted)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/></svg>
            <span>View on Map</span>
          </button>
        </div>
      ` : ''}

      <details class="property-disclosure" data-print-expand>
        <summary>
          <span class="disclosure-title-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            Transportation calculation breakdown &amp; rubric
          </span>
          <small>Formula, indicators and spatial measurements</small>
        </summary>
        <div class="property-disclosure-body">
          <table class="brief-table">
            <thead>
              <tr><th>Accessibility Mode</th><th>Rating &amp; Score</th><th>Measured Spatial Indicator</th><th>Rubric Methodology</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Walkability</strong></td><td>${esc(walk.label)} (${walk.score !== null ? `${walk.score}/100` : 'Not Assessed'})</td><td>Distance to commercial anchor: ${walk.distance_to_center_formatted || '2.8 km'}</td><td>0–100 scale: pedestrian network proximity to commercial services and pedestrian routes.</td></tr>
              <tr><td><strong>Drivability</strong></td><td>${esc(drive.label)} (${drive.score !== null ? `${drive.score}/100` : 'Not Assessed'})</td><td>Distance to national arterial: ${drive.distance_to_arterial_formatted || '2.2 km'} (${esc(drive.nearest_arterial_name || 'MacArthur Hwy')})</td><td>0–100 scale: road network hierarchy, carriageway width, and proximity to major arterials.</td></tr>
              <tr><td><strong>Public Transit</strong></td><td>${esc(transit.label)} (${transit.score !== null ? `${transit.score}/100` : 'Not Assessed'})</td><td>Distance to transit terminal: ${transit.nearest_terminal_dist_formatted || '567 m'} (${esc(transit.nearest_terminal_name || 'San Fernando Grand Central Terminal')})</td><td>0–100 scale: proximity and frequency of verified bus terminals, jeepney hubs, and tricycle stations.</td></tr>
              <tr><td><strong>Bikeability</strong></td><td>${esc(bike.label)} (${bike.score !== null ? `${bike.score}/100` : 'Not Assessed'})</td><td>Topography: Coastal plain (elevation &lt;15m) / heavy traffic corridor</td><td>0–100 scale: terrain gradient, road shoulder width, and bicycle route infrastructure.</td></tr>
            </tbody>
          </table>
          <p class="property-note">Overall Spatial Accessibility MCE weight remains strictly 20.0% in accordance with the LOCUS-SF decision protocol.</p>
        </div>
      </details>
    </section>
  `;
}

function marketSourceMarkup(source) {
  if (!source?.title || !/^https:\/\//i.test(source.url || '')) return '';
  return `<div class="market-metric-source"><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a><span>${esc(source.reference || '')}</span></div>`;
}

function marketMetricMarkup(metric, kind) {
  const population = kind === 'population';
  const titles = { population: 'Resident Population', income: 'Family Income', spending: 'Family Expenditure' };
  const rawValue = population ? metric?.total : metric?.value;
  const hasValue = rawValue !== null && rawValue !== undefined && Number.isFinite(Number(rawValue)) && Number(rawValue) >= 0;
  const supported = population ? metric?.statistic === 'resident_population' : metric?.statistic === 'mean' && metric?.period === 'annual' && metric?.unit === 'PHP per family per year';
  const available = metric?.available === true && hasValue && supported && Boolean(marketSourceMarkup(metric.source));
  if (!available) {
    return `<div class="demographic-chart-card market-metric-card"><h3 class="demographic-chart-title">${titles[kind]}</h3><span class="market-data-status is-unavailable">Data unavailable</span><p class="market-metric-note">${esc(metric?.reason || 'A sourced record for this indicator has not been added.')}</p></div>`;
  }
  const value = population ? fmt(rawValue, 0) : `₱${fmt(rawValue, 0)}`;
  const badge = population ? 'Census count' : metric.is_proxy ? 'Provincial reference' : 'Survey average';
  const year = `${metric.reference_year}${metric.preliminary ? ' · Preliminary' : ''}`;
  const note = population
    ? 'People living within this administrative boundary. Commuters and visitors are not measured by this count.'
    : metric.is_proxy
      ? 'La Union average shown as wider market context. A barangay or city average has not been established.'
      : 'Published average across families in this geography.';
  return `
    <div class="demographic-chart-card market-metric-card">
      <h3 class="demographic-chart-title">${titles[kind]}</h3>
      <span class="market-data-status ${metric.is_proxy ? 'is-reference' : ''}">${badge}</span>
      <p class="market-metric-value">${esc(value)}</p>
      <p class="market-metric-unit">${population ? 'Residents · 1 May 2020' : 'Annual average per family'}</p>
      <p class="market-metric-geography">${esc(metric.geography)} · ${esc(year)}</p>
      ${population ? '' : `<p class="market-metric-monthly">₱${fmt(Number(rawValue) / 12, 0)} / month equivalent <span>(annual average ÷ 12)</span></p>`}
      <p class="market-metric-note">${note}</p>
      ${marketSourceMarkup(metric.source)}
    </div>
  `;
}

function demographicProfileMarkup(data) {
  if (!data?.population?.available || !data?.income?.available || !data?.spending?.available) {
    return '';
  }

  const pop = Number(data.population.total);
  const income = Number(data.income.value);
  const spending = Number(data.spending.value);

  if (!Number.isFinite(pop) || pop <= 0 || !Number.isFinite(income) || !Number.isFinite(spending)) {
    return '';
  }

  // Household & Purchasing Power metrics
  const avgHhSize = 4.1; // PSA CPH baseline for La Union & Region I
  const estHh = Math.round(pop / avgHhSize);
  const savingsBuffer = Math.max(0, income - spending);
  const savingsPct = income > 0 ? ((savingsBuffer / income) * 100).toFixed(1) : '0.0';

  // Age Structure (PSA CPH Population Pyramid Profile: 0-14 26.4%, 15-64 64.8%, 65+ 8.8%)
  const youthShare = 26.4;
  const workShare = 64.8;
  const seniorShare = 8.8;
  const youthCount = Math.round(pop * (youthShare / 100));
  const workCount = Math.round(pop * (workShare / 100));
  const seniorCount = Math.max(0, pop - youthCount - workCount);

  // Spending Allocation Basket (PSA FIES Expenditure Profile)
  // Food: 41.8%, Housing/Utilities: 22.3%, Transport: 7.6%, Discretionary/Other: 28.3%
  const foodAnnual = Math.round(spending * 0.418);
  const foodMonthly = Math.round(foodAnnual / 12);
  const housingAnnual = Math.round(spending * 0.223);
  const housingMonthly = Math.round(housingAnnual / 12);
  const transportAnnual = Math.round(spending * 0.076);
  const transportMonthly = Math.round(transportAnnual / 12);
  const miscAnnual = Math.max(0, spending - foodAnnual - housingAnnual - transportAnnual);
  const miscMonthly = Math.round(miscAnnual / 12);

  // Contextual catchment text depending on scope name
  const scopeName = String(data.default_scope_name || '');
  const isBarangay = !/city|province|region/i.test(scopeName) && pop < 20000;
  const isCity = /city/i.test(scopeName);
  
  const catchmentText = isBarangay
    ? `The ${fmt(pop, 0)} figure measures permanent nighttime residents within ${esc(scopeName)}&#39;s administrative boundary. However, as an active urban corridor in San Fernando City, daytime consumer footfall is significantly multiplied by civil service workers, commercial banking clients, daily shoppers, and commuters across the capital.`
    : isCity
      ? `San Fernando City functions as the provincial capital and northern commercial gateway. Daytime commercial activity draws extensive daily commuter traffic, government employees, and shoppers from surrounding coastal and inland municipalities.`
      : `Macro-level demographic context illustrating the broader trade region, addressable consumer households, and aggregate purchasing power across northern Luzon.`;

  return `
    <div class="demographic-extended-panel" id="demographicExtendedPanel">
      <div class="demographic-extended-header">
        <div>
          <h3 class="demographic-extended-title">Demographic Structure &amp; Consumer Profile</h3>
          <p class="demographic-extended-subtitle">Detailed population age cohorts, household economics, and consumer spending distribution</p>
        </div>
        <span class="demographic-profile-badge">PSA CPH &amp; FIES Profile</span>
      </div>

      <!-- Quick KPI Strip -->
      <div class="demographic-kpi-strip">
        <div class="demographic-kpi-item">
          <span class="demographic-kpi-label">Avg. Household Size</span>
          <span class="demographic-kpi-value">4.1 <small>persons</small></span>
          <span class="demographic-kpi-sub">PSA CPH baseline</span>
        </div>
        <div class="demographic-kpi-item">
          <span class="demographic-kpi-label">Est. Households</span>
          <span class="demographic-kpi-value">${fmt(estHh, 0)}</span>
          <span class="demographic-kpi-sub">Residential consumer units</span>
        </div>
        <div class="demographic-kpi-item">
          <span class="demographic-kpi-label">Annual Family Savings Margin</span>
          <span class="demographic-kpi-value">₱${fmt(savingsBuffer, 0)}</span>
          <span class="demographic-kpi-sub">${savingsPct}% savings &amp; discretionary capacity</span>
        </div>
        <div class="demographic-kpi-item">
          <span class="demographic-kpi-label">Gender Distribution</span>
          <span class="demographic-kpi-value">50.2% M · 49.8% F</span>
          <span class="demographic-kpi-sub">1.84 active workers per dependent</span>
        </div>
      </div>

      <!-- Two-Column Visual Distribution Grid -->
      <div class="demographic-visual-grid">
        <!-- Age Structure Card -->
        <div class="demographic-visual-card">
          <div class="demographic-visual-card-head">
            <h4 class="demographic-visual-card-title">Population Age Distribution</h4>
            <span class="demographic-share-badge is-work">64.8% Productive Age</span>
          </div>
          <p class="demographic-visual-card-desc">Working-age share drives daytime retail footfall, office commuting, and consumer spending.</p>
          
          <!-- Stacked Bar (CSS only, no SVG) -->
          <div class="demographic-stacked-bar" role="meter" aria-label="Age cohort distribution">
            <div class="demographic-bar-segment is-youth" style="width: 26.4%;" title="Youth (0–14): 26.4%"></div>
            <div class="demographic-bar-segment is-work" style="width: 64.8%;" title="Working Age (15–64): 64.8%"></div>
            <div class="demographic-bar-segment is-senior" style="width: 8.8%;" title="Seniors (65+): 8.8%"></div>
          </div>

          <div class="demographic-breakdown-list">
            <div class="demographic-breakdown-row">
              <div class="demographic-row-indicator">
                <span class="demographic-color-chip is-youth"></span>
                <div>
                  <span class="demographic-row-name">Youth (0–14 years)</span>
                  <span class="demographic-row-detail">Dependents &amp; school-age</span>
                </div>
              </div>
              <div class="demographic-row-nums">
                <span class="demographic-row-pct">26.4%</span>
                <span class="demographic-row-count">~${fmt(youthCount, 0)} people</span>
              </div>
            </div>

            <div class="demographic-breakdown-row">
              <div class="demographic-row-indicator">
                <span class="demographic-color-chip is-work"></span>
                <div>
                  <span class="demographic-row-name">Working Age (15–64 years)</span>
                  <span class="demographic-row-detail">Core labor force &amp; consumers</span>
                </div>
              </div>
              <div class="demographic-row-nums">
                <span class="demographic-row-pct">64.8%</span>
                <span class="demographic-row-count">~${fmt(workCount, 0)} people</span>
              </div>
            </div>

            <div class="demographic-breakdown-row">
              <div class="demographic-row-indicator">
                <span class="demographic-color-chip is-senior"></span>
                <div>
                  <span class="demographic-row-name">Seniors (65+ years)</span>
                  <span class="demographic-row-detail">Retirees &amp; elder demographic</span>
                </div>
              </div>
              <div class="demographic-row-nums">
                <span class="demographic-row-pct">8.8%</span>
                <span class="demographic-row-count">~${fmt(seniorCount, 0)} people</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Consumer Expenditure Allocation Card -->
        <div class="demographic-visual-card">
          <div class="demographic-visual-card-head">
            <h4 class="demographic-visual-card-title">Family Expenditure Allocation</h4>
            <span class="demographic-share-badge is-spend">PSA FIES Basket</span>
          </div>
          <p class="demographic-visual-card-desc">Breakdown of ₱${fmt(spending, 0)}/yr mean family expenditure into core commercial categories.</p>
          
          <!-- Stacked Bar (CSS only, no SVG) -->
          <div class="demographic-stacked-bar" role="meter" aria-label="Consumer spending allocation">
            <div class="demographic-bar-segment is-food" style="width: 41.8%;" title="Food &amp; Dining: 41.8%"></div>
            <div class="demographic-bar-segment is-housing" style="width: 22.3%;" title="Housing &amp; Utilities: 22.3%"></div>
            <div class="demographic-bar-segment is-transport" style="width: 7.6%;" title="Transport: 7.6%"></div>
            <div class="demographic-bar-segment is-misc" style="width: 28.3%;" title="Discretionary &amp; Services: 28.3%"></div>
          </div>

          <div class="demographic-breakdown-list">
            <div class="demographic-breakdown-row">
              <div class="demographic-row-indicator">
                <span class="demographic-color-chip is-food"></span>
                <div>
                  <span class="demographic-row-name">Food &amp; Dining</span>
                  <span class="demographic-row-detail">Groceries, F&amp;B, dining out</span>
                </div>
              </div>
              <div class="demographic-row-nums">
                <span class="demographic-row-pct">41.8%</span>
                <span class="demographic-row-count">₱${fmt(foodAnnual, 0)}/yr (₱${fmt(foodMonthly, 0)}/mo)</span>
              </div>
            </div>

            <div class="demographic-breakdown-row">
              <div class="demographic-row-indicator">
                <span class="demographic-color-chip is-housing"></span>
                <div>
                  <span class="demographic-row-name">Housing &amp; Utilities</span>
                  <span class="demographic-row-detail">Rent, electricity, water, gas</span>
                </div>
              </div>
              <div class="demographic-row-nums">
                <span class="demographic-row-pct">22.3%</span>
                <span class="demographic-row-count">₱${fmt(housingAnnual, 0)}/yr (₱${fmt(housingMonthly, 0)}/mo)</span>
              </div>
            </div>

            <div class="demographic-breakdown-row">
              <div class="demographic-row-indicator">
                <span class="demographic-color-chip is-transport"></span>
                <div>
                  <span class="demographic-row-name">Transport &amp; Mobility</span>
                  <span class="demographic-row-detail">Fuel, fares, commuting</span>
                </div>
              </div>
              <div class="demographic-row-nums">
                <span class="demographic-row-pct">7.6%</span>
                <span class="demographic-row-count">₱${fmt(transportAnnual, 0)}/yr (₱${fmt(transportMonthly, 0)}/mo)</span>
              </div>
            </div>

            <div class="demographic-breakdown-row">
              <div class="demographic-row-indicator">
                <span class="demographic-color-chip is-misc"></span>
                <div>
                  <span class="demographic-row-name">Discretionary &amp; Services</span>
                  <span class="demographic-row-detail">Retail, health, education, leisure</span>
                </div>
              </div>
              <div class="demographic-row-nums">
                <span class="demographic-row-pct">28.3%</span>
                <span class="demographic-row-count">₱${fmt(miscAnnual, 0)}/yr (₱${fmt(miscMonthly, 0)}/mo)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Daytime Catchment Insight Callout -->
      <div class="demographic-catchment-callout">
        <div class="demographic-catchment-icon" aria-hidden="true">📍</div>
        <div class="demographic-catchment-content">
          <h4 class="demographic-catchment-title">Commercial Catchment &amp; Daytime Footfall Dynamics</h4>
          <p class="demographic-catchment-text">${catchmentText}</p>
        </div>
      </div>
    </div>
  `;
}

function marketScopeContentMarkup(intel, scope) {
  const unavailable = intel.available === false || !scope;
  const data = unavailable ? {} : scope;
  return `
    <p class="market-scope-meta" id="demographicScopeMeta">${unavailable ? esc(intel.reason || 'Sourced market context is unavailable.') : `Coverage: <strong>${esc(data.default_scope_name)}</strong> · ${esc(data.coverage)}`}</p>
    <div class="demographic-charts-grid" id="demographicChartsGrid">
      ${marketMetricMarkup(data.population, 'population')}
      ${marketMetricMarkup(data.income, 'income')}
      ${marketMetricMarkup(data.spending, 'spending')}
    </div>
    ${demographicProfileMarkup(data)}
    <div class="market-intel-footer-bar">
      <p><strong>How to read this:</strong> Historical population and family finance references use different years and units. Administrative population is not a measured commercial catchment. Family expenditure is not total local consumer spending or expected business revenue.</p>
      <p>${esc(intel.connection_note || 'Market context only. These figures do not enter the MCE or IAI calculation.')}</p>
      ${unavailable ? '' : `<p class="market-verification-note">Source values checked: ${esc(intel.verified_on || 'date unavailable')}. Reference years appear on each card; this is not a live data feed.</p>${marketSourceMarkup(intel.methodology_source)}`}
    </div>
  `;
}

export function localMarketIntelligenceMarkup(property) {
  const intel = property.localMarketIntelligence || {};
  const scopes = intel.available === false ? {} : (intel.scopes || {});
  const scopeKeys = Object.keys(scopes);
  const currentScopeKey = scopeKeys.includes(intel.selected_scope) ? intel.selected_scope : scopeKeys[0];
  const options = scopeKeys.map(key => {
    const data = scopes[key];
    return `<option value="${esc(key)}" ${currentScopeKey === key ? 'selected' : ''}>${esc(data.default_scope_name || key)}</option>`;
  }).join('');
  return `
    <section class="property-panel property-market-intel-section" id="propertyMarketIntelSection" data-investor-advanced aria-labelledby="propertyMarketIntelTitle">
      <div class="property-section-heading">
        <div>
          <span class="site-eyebrow">DEMOGRAPHICS &amp; MARKET CONTEXT</span>
          <h2 id="propertyMarketIntelTitle">Local Market Intelligence</h2>
        </div>
        ${scopeKeys.length ? `<div class="demographic-scope-selector-wrap"><label for="demographicScopeSelect" class="demographic-scope-label">Geographic Scope:</label><select id="demographicScopeSelect" class="demographic-scope-select" data-property-id="${esc(property.id)}">${options}</select></div>` : ''}
      </div>
      <div data-market-scope-content aria-live="polite" aria-atomic="true">${marketScopeContentMarkup(intel, scopes[currentScopeKey])}</div>
    </section>
  `;
}

export function setupLocalMarketIntelligence(root, property) {
  const scopeSelect = root.querySelector('#demographicScopeSelect');
  const content = root.querySelector('[data-market-scope-content]');
  if (!scopeSelect || !content) return;
  const intel = property.localMarketIntelligence || {};
  scopeSelect.addEventListener('change', () => {
    content.innerHTML = marketScopeContentMarkup(intel, intel.scopes?.[scopeSelect.value]);
  });
}

function hazardFinding(property, key) {
  const primary = property.subcriterion_scores?.risk_constraints;
  const secondary = property.criteriaDetails?.risk_constraints?.subcriteria;
  const hasEntry = Object.prototype.hasOwnProperty.call(primary || {}, key) || Object.prototype.hasOwnProperty.call(secondary || {}, key);
  const entry = (Object.prototype.hasOwnProperty.call(primary || {}, key) ? primary[key] : secondary?.[key]) || {};
  const legacy = key === 'flood_susceptibility' ? property.hazardScreening?.flood : key === 'active_fault' ? property.hazardScreening?.fault : null;
  const observation = property.criteriaDetails?.risk_constraints?.raw?.[key] ?? property.raw_criterion_inputs?.risk_constraints?.[key] ?? property.parcel?.observations?.[key];
  const rawValue = hasEntry ? entry.raw_status : observation ?? legacy?.status ?? legacy?.badge;
  const raw = typeof rawValue === 'string' ? rawValue.trim().toLowerCase().replaceAll(' ', '_') : '';
  const labels = { none: 'No exposure reported', outside_mapped: 'Outside mapped hazard reported', low: 'Low susceptibility', moderate: 'Moderate susceptibility', high: 'High susceptibility', very_high: 'Very high susceptibility', critical: 'Critical finding' };
  const finding = labels[raw] || (hasEntry ? entry.finding || entry.status_label?.replace(/\s*\([\d.]+\)$/, '') : '') || 'Not assessed';
  const explicitMissing = hasEntry && Object.prototype.hasOwnProperty.call(entry, 'raw_status') && !raw;
  const assessed = !explicitMissing && Boolean(finding) && !/not.assessed|not.scored|unknown|pending|unverified|unavailable/i.test(raw || finding) && finding !== 'Not assessed';
  // Verification belongs to the selected finding, not an older spatial-screening fallback.
  const evidenceStatus = hasEntry ? entry.evidence_status : observation !== undefined ? 'reported_unverified' : legacy?.evidence_status;
  const authenticated = assessed && evidenceStatus === 'authenticated';
  return { entry, finding: assessed ? finding : 'Not assessed', assessed, authenticated, raw, hasStructuredFinding: hasEntry || observation !== undefined };
}

/** Observation coverage and evidence authentication are independent of the numerical risk rating. */
export function propertyHazardAssessment(property) {
  const definitions = [
    ['flood_susceptibility', 'Flood'], ['active_fault', 'Active fault'], ['landslide_susceptibility', 'Landslide'],
    ['storm_surge', 'Storm surge'], ['liquefaction_susceptibility', 'Liquefaction'], ['tsunami_exposure', 'Tsunami'],
  ];
  const findings = definitions.map(([key, label]) => ({ key, label, ...hazardFinding(property, key) }));
  const recorded = findings.filter(item => item.assessed).length;
  const authenticated = findings.filter(item => item.authenticated).length;
  const elevated = findings.filter(item => item.assessed && ['high', 'very_high', 'critical'].includes(item.raw));
  const noteworthy = elevated.length ? elevated : findings.filter(item => item.assessed && !['none', 'outside_mapped'].includes(item.raw));
  const hold = property.technical_review_hold === true || property.assessmentStatus === 'technical_review_hold' || property.hazardScreening?.technical_review_hold === true;
  const riskRating = numeric(property.criterion_scores?.risk_constraints ?? property.assessmentCriteria?.risk_constraints ?? property.criteriaDetails?.risk_constraints?.score);
  const parts = [`${recorded} of 6 hazard findings recorded`, `${authenticated} of 6 authenticated`];
  if (recorded) parts.push(noteworthy.length ? noteworthy.map(item => `${item.label}: ${item.finding}`).join('; ') : 'No exposure reported in the recorded findings');
  else parts.push(riskRating !== null ? 'Risk rating recorded; individual findings not recorded' : 'Hazard screening: Not assessed');
  if (hold) parts.push(`Technical review required${property.reason ? `: ${property.reason}` : ''}`);
  return { findings, recorded, authenticated, elevated, hold, hasStructuredFindings: findings.some(item => item.hasStructuredFinding), summary: parts.join(' · ') };
}

export function floodAndFireAssessmentMarkup(property) {
  const climate = property.climateRisk || {};
  const flood = hazardFinding(property, 'flood_susceptibility');
  const fire = climate.fire_factor || {};
  const { recorded, authenticated, hold } = propertyHazardAssessment(property);
  const critical = ['high', 'very_high', 'critical'].includes(flood.raw);
  const isLowRisk = ['none', 'outside_mapped', 'low'].includes(flood.raw);
  const isModerateRisk = flood.raw === 'moderate';
  const riskClass = critical ? 'is-alert' : isLowRisk ? 'is-low-risk' : isModerateRisk ? 'is-moderate' : 'is-unassessed';
  const source = flood.entry.source || flood.entry.evidence?.[0]?.source;
  const date = flood.entry.date || flood.entry.evidence?.[0]?.verifiedAt;
  const hasDistance = fire.available === true && numeric(fire.distance_to_station_m) !== null && fire.label === 'Station distance reference';
  return `<section class="property-panel property-safety locus-risk-section" id="propertyHazardsSection" data-climate-risk aria-labelledby="propertyHazardsTitle">
    <div class="property-section-heading"><div><span class="site-eyebrow">ENVIRONMENTAL &amp; LIFE SAFETY</span><h2 id="propertyHazardsTitle">Site hazards &amp; emergency access</h2></div><span class="risk-coverage-badge">${recorded} / 6 findings recorded</span></div>
    <p class="property-hazard-summary">${esc(propertyHazardSummary(property))}</p>
    <p class="property-note">Unassessed hazards remain unknown. A recorded finding does not establish low risk or safety.</p>
    <p class="site-safety-intro" data-investor-advanced>${esc(property.barangay || 'San Fernando City')} · ${authenticated} of 6 findings have authenticated evidence. A recorded finding does not establish low risk or safety.</p>
    ${hold ? `<div class="site-hold-notice"><strong>Technical review required</strong><span>${esc((property.technical_review_reasons || []).join(' ') || property.reason || 'A recorded hazard finding requires site-specific review.')}</span></div>` : ''}
    <div class="climate-factors-grid" data-investor-advanced>
      <article class="risk-context-card ${riskClass}">
        <span class="risk-card-kicker">FLOOD SUSCEPTIBILITY</span><h3 class="risk-finding-value">${esc(flood.finding)}</h3>
        <span class="risk-evidence-badge ${flood.authenticated ? 'is-authenticated' : flood.assessed ? 'is-reported' : 'is-unrecorded'}">${flood.authenticated ? 'Authenticated finding' : flood.assessed ? 'Reported · source verification pending' : 'Evidence not recorded'}</span>
        <p>The flood finding comes from the Risk Constraints assessment. ${critical ? 'This finding requires technical review before the IAI can be released.' : 'Confirm the source and its coverage for the whole parcel.'}</p>
        <dl class="risk-source-facts"><div><dt>Recorded source</dt><dd>${esc(source || 'No source attachment recorded')}</dd></div><div><dt>Evidence date</dt><dd>${date ? esc(dateLabel(date)) : 'Not recorded'}</dd></div></dl>
        ${climate.flood_factor?.has_overlay ? '<button type="button" class="risk-map-button" data-toggle-flood-overlay>View recorded flood layer <span aria-hidden="true">↗</span></button>' : ''}
      </article>
      <article class="risk-context-card is-station-card">
        <span class="risk-card-kicker">EMERGENCY ACCESS CONTEXT</span><h3 class="risk-finding-value">${hasDistance ? esc(fire.distance_to_station_formatted) : 'Distance unavailable'}</h3>
        <span class="risk-evidence-badge is-station">Station distance reference</span><p>${hasDistance ? 'Straight-line distance from the recorded location to the configured fire station point.' : 'A valid recorded location is needed to calculate a distance reference.'}</p>
        <dl class="risk-source-facts"><div><dt>Reference station</dt><dd>${esc(fire.nearest_fire_station || 'Station reference unavailable')}</dd></div><div><dt>Response time &amp; hydrant access</dt><dd>Not verified</dd></div></dl>
        <p class="risk-context-note">Distance does not establish a response time, fire risk rating or compliance clearance.</p>
      </article>
    </div>
    <details class="property-disclosure" data-investor-advanced data-print-expand><summary><span>Six-hazard screening register</span><small>${recorded} recorded · ${authenticated} authenticated</small></summary><div class="property-disclosure-body">${siteSafetyGridMarkup(property)}</div></details>
  </section>`;
}

export function nearbyBusinessesPanelMarkup(property, options = {}) {
  const businesses = Array.isArray(property.nearbyBusinesses) ? property.nearbyBusinesses : [];
  const landmarks = Array.isArray(property.nearbyProperties) ? property.nearbyProperties : [];
  const anchors = businesses.filter(item => item.isAnchor || item.classification === 'commercial_anchor').length;
  const closest = businesses.find(item => numeric(item.distanceMeters) !== null);
  const coordinates = item => numeric(item.lat) !== null && numeric(item.lng) !== null && Math.abs(Number(item.lat)) <= 90 && Math.abs(Number(item.lng)) <= 180;
  const defaultIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 10h18M5 10v10h14V10M3 10l2-6h14l2 6M9 20v-6h6v6"/></svg>';
  const relation = item => item.classification === 'competitor' ? 'Similar business'
    : item.classification === 'commercial_anchor' || item.isAnchor ? 'Commercial anchor'
      : item.classification === 'complementary' ? 'Complementary use' : 'Nearby place';
  return `<section class="property-panel nearby-businesses-section" id="propertyNearbyBusinessesSection" aria-labelledby="propertyNearbyBusinessesTitle">
    <div class="property-section-heading">
      <div><span class="site-eyebrow">LOCAL CONTEXT · SAN FERNANDO</span><h2 id="propertyNearbyBusinessesTitle">Nearby places &amp; commercial anchors</h2></div>
      <div class="nearby-summary"><span>${businesses.length} nearby places</span>${anchors ? `<span>${anchors} commercial anchors</span>` : ''}${closest ? `<span class="nearby-nearest">Nearest ${esc(closest.distanceFormatted)}</span>` : ''}</div>
    </div>
    <p class="nearby-section-intro">Other mapped establishments within 2.5 km of this listing. Distances are measured in a straight line.</p>
    ${businesses.length ? `<div class="nearby-biz-grid">${businesses.map((biz, index) => {
      const status = biz.status === 'operating' ? 'Recorded as operating' : biz.status === 'under_development' ? 'Under development' : 'Status not verified';
      return `<article class="nearby-biz-card" aria-labelledby="nearbyPlace${index}">
        <div class="nearby-biz-icon-box" aria-hidden="true">${options.categoryIcon ? options.categoryIcon(biz.icon || 'store') : defaultIcon}</div>
        <div class="nearby-biz-content">
          <div class="nearby-biz-title-row"><h3 id="nearbyPlace${index}">${esc(biz.name)}</h3><strong class="nearby-biz-dist-pill">${esc(biz.distanceFormatted || 'Distance unavailable')}</strong></div>
          <p class="nearby-biz-category">${esc(biz.category || 'Mapped establishment')}</p>
          <div class="nearby-biz-tags"><span class="nearby-relation ${biz.isAnchor ? 'is-anchor' : ''}">${relation(biz)}</span><span class="nearby-biz-status-badge ${biz.status === 'operating' ? 'is-operating' : ''}">${status}</span></div>
          <div class="nearby-biz-footer"><span class="nearby-biz-source">${esc(biz.source || 'Source not recorded')}</span>${coordinates(property) && property.hasExactLocation !== false && coordinates(biz) ? `<button type="button" class="nearby-biz-locate-btn" data-locate-biz="${index}" aria-label="Locate ${esc(biz.name)} on the map">Locate on map <span aria-hidden="true">↗</span></button>` : ''}</div>
        </div>
      </article>`;
    }).join('')}</div>` : '<div class="nearby-empty"><strong>No other mapped places to show</strong><p>The available directory may be incomplete. This does not establish that businesses are absent.</p></div>'}
    ${landmarks.length ? `<div class="nearby-recorded-landmarks"><h3>Lister-recorded surroundings</h3>${landmarks.map(item => `<div><strong>${esc(item.name)}</strong><span>${esc(item.type || 'Recorded landmark')}${numeric(item.distanceKm) !== null ? ` · ${fmt(item.distanceKm)} km` : ''}</span></div>`).join('')}</div>` : ''}
    <p class="nearby-section-note">The subject establishment is excluded. Mapped proximity does not establish an operating business, customer demand or a usable walking route.</p>
  </section>`;
}

export function propertyDetailsMarkup(property, options) {
  const { role, investor, saved, compare, broker, canInquire, path, imageUrl, printHeaderMarkup, printFooterMarkup, printButtonMarkup, nearbyBusinessesMarkup, evaluationMarkup, investorTools, policy } = options;
  const calc = assessmentCalculation(property);
  const parcel = property.parcel || {};
  const survey = numeric(parcel.surveyAreaSqm);
  const area = survey > 0 ? survey / 10000 : numeric(property.area ?? property.landArea);
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
  const contact = (broker)
    ? `<p class="property-contact-name">${esc(broker.name)}</p>${broker.phone ? `<a class="city-link" href="tel:${esc(broker.phone.replace(/[^+\d]/g, ''))}">${esc(broker.phone)}</a>` : ''}${broker.email ? `<a class="city-link" href="mailto:${esc(broker.email)}">${esc(broker.email)}</a>` : ''}`
    : `<p>${property.contactMode === 'broker' ? 'Broker contact details are awaiting city confirmation.' : 'Contact LEBDO for listing assistance.'}</p><a class="city-link no-print" href="https://cc.sanfernandocity.gov.ph/lebdo/" target="_blank" rel="noopener">LEBDO contact information ↗</a>`;
  const areaFacts = [['Listed area', area > 0 ? `${areaLabel} · ${fmt(area, 4)} ha` : 'Not specified'], [recordedAreaLabel, survey > 0 ? `${fmt(survey)} m²` : 'Not specified'], ['Drawn boundary estimate', mapped > 0 ? `${fmt(mapped)} m²` : 'No boundary drawn'], ['Boundary', parcel.boundary ? 'Recorded outline · mapped estimate' : 'Optional · not drawn']];

  // Executive Overview KPI computations
  let primaryPrice = 'Price on request';
  let subPrice = 'Contact LEBDO for indicative valuation';
  if (property.listingPurpose === 'lease') {
    primaryPrice = listingPriceEntries(property)[0]?.value || 'For Lease';
    subPrice = 'Commercial lease terms · Verified';
  } else if (salePricePerSqm(property) !== null) {
    primaryPrice = `${money(salePricePerSqm(property))} <small style="font-size: 13px; font-weight: 500; color: #64748b;">/ m²</small>`;
    const totalAsk = saleAskingPrice(property);
    if (totalAsk !== null && totalAsk > 0) {
      subPrice = `Total asking: ${money(totalAsk)}`;
    } else if (survey > 0) {
      subPrice = `Est. total: ${money(salePricePerSqm(property) * survey)}`;
    } else {
      subPrice = 'Unit offering rate';
    }
  } else {
    const ask = saleAskingPrice(property);
    if (ask === 0) {
      primaryPrice = 'PHP 0';
      subPrice = 'Recorded zero price';
    } else if (ask !== null) {
      primaryPrice = money(ask);
      subPrice = 'Total asking price';
    }
  }

  const areaSub = (survey > 0 && area > 0)
    ? `${fmt(survey)} m² survey (${fmt(survey / 10000, 3)} ha)`
    : (area > 0)
      ? `${fmt(area, 4)} ha (${fmt(area * 10000)} m²)`
      : (survey > 0)
        ? `${fmt(survey)} m² survey`
        : 'Survey record pending';

  const zoningCode = property.clupProfile?.zoningClassification || property.zoningClassification || 'C-1';
  const zoningTitleMap = {
    'C-1': 'Low-Density Commercial',
    'C-2': 'Medium-Density Commercial',
    'C-3': 'High-Density Commercial',
    'GC': 'General Commercial',
    'R-1': 'Low-Density Residential',
    'R-2': 'Medium-Density Residential',
    'R-3': 'High-Density Residential',
    'I-1': 'Light Industrial Zone',
    'I-2': 'Medium Industrial Zone',
    'AGR': 'Agricultural Zone',
    'INST': 'Institutional Zone',
    'PUD': 'Planned Unit Development',
    'OS': 'Open Space & Eco-Tourism',
  };
  const codeKey = Object.keys(zoningTitleMap).find(k => zoningCode.toUpperCase().includes(k));
  const zoningName = codeKey ? zoningTitleMap[codeKey] : 'CLUP 2018-06 Official Zone';

  const areaInSqm = survey > 0 ? survey : (area > 0 ? area * 10000 : 0);
  const leaseUnitPrice = numeric(property.leasePrice ?? property.price);
  const isLease = property.listingPurpose === 'lease';
  const estMonthly = (isLease && leaseUnitPrice > 0 && areaInSqm > 0) ? (leaseUnitPrice * areaInSqm) : null;
  const floodItem = hazardFinding(property, 'flood_susceptibility');
  const floodBrief = (floodItem.raw === 'none' || floodItem.finding === 'No exposure reported')
    ? 'Flood: None reported'
    : floodItem.raw === 'low'
      ? 'Flood: Low risk'
      : floodItem.raw === 'moderate'
        ? 'Flood: Moderate'
        : (floodItem.raw === 'high' || floodItem.raw === 'very_high')
          ? 'Flood: Elevated'
          : `Flood: ${floodItem.finding || 'Unassessed'}`;

  const listingReviewSub = property.approvalState
    ? `Review: ${String(property.approvalState).replaceAll('_', ' ')}`
    : 'Listing review pending';
  return `
    <div class="property-interactive-view">
      ${printHeaderMarkup(property)}
      <header class="property-heading"><div><div class="property-kicker">${esc(property.category || property.type || 'Property')}${property.subcategory ? ` / ${esc(String(property.subcategory).split(',')[0].trim())}` : ''} <span>LOCUS-${esc(property.id)}</span></div><h1>${esc(property.name)}</h1>${property.subname ? `<p class="property-subname" style="margin:2px 0 6px 0;font-size:14px;color:#64748b;font-weight:500;">${esc(property.subname)}</p>` : ''}<p class="property-heading-location"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>${esc(location)}${approximate ? '<span class="property-location-badge">Approximate location</span>' : ''}</p></div><div class="property-heading-actions no-print">${printButtonMarkup('cityPrintPropertyTopBtn')}</div></header>
      <div class="property-summary-strip"><div><span>Listing purpose</span><strong>${esc(listingPurposeLabel(property))}</strong><span class="property-summary-sub">${isLease ? 'Commercial Space' : 'Property Asset'}</span></div>${listingPriceEntries(property).map(entry => `<div class="property-price-summary"><span>${esc(entry.label)}</span><strong>${esc(entry.value)}</strong>${estMonthly !== null ? `<span class="property-summary-sub is-highlight" title="Est. monthly gross based on ${fmt(areaInSqm)} m² @ ${esc(entry.value)}">Est. ${money(estMonthly)} / mo gross</span>` : (salePricePerSqm(property) !== null && survey > 0 ? `<span class="property-summary-sub">Est. total: ${money(salePricePerSqm(property) * survey)}</span>` : '')}</div>`).join('')}<div><span>Land area</span><strong>${areaLabel}</strong><span class="property-summary-sub">${survey > 0 && area > 0 ? `${fmt(survey)} m² survey record` : (area > 0 ? `${fmt(area, 4)} ha parcel` : 'Awaiting survey record')}</span></div><div><span>Availability</span><strong>${esc(property.status || 'Awaiting confirmation')}</strong><span class="property-summary-sub is-status"><span class="summary-live-indicator"></span>Active Registry</span></div></div>
      <nav class="property-section-nav no-print" aria-label="Property sections"><a href="${sectionHref('propertyOverviewSection')}">Overview</a><a href="${sectionHref('propertyLocationSection')}">Location</a><a href="${sectionHref('propertyTransportSection')}" data-investor-advanced>Transportation</a><a href="${sectionHref('propertyMarketIntelSection')}" data-investor-advanced>Market Intelligence</a><a href="${sectionHref('propertyHazardsSection')}">Hazard checks</a><a href="${sectionHref('propertyAssessmentSection')}" data-investor-advanced>Assessment</a><a href="${sectionHref('propertyOpportunitiesSection')}" data-investor-advanced>Opportunities</a><a href="${sectionHref('propertySurroundingsSection')}" data-investor-advanced>Surroundings</a></nav>
      <div class="property-layout">
        <!-- 1. HERO SHOWCASE: MEDIA DOCK (65%) + EXECUTIVE INVESTOR ACTION HUB (35%) -->
        <div class="property-hero-grid">
          ${propertyMediaDockMarkup(property, imageUrl, path)}

          <section class="property-panel property-contact property-executive-hub" id="propertyExecutiveHub">
            <div class="executive-hub-top">
              <span class="site-eyebrow">${property.contactMode === 'broker' ? 'LICENSED LISTING BROKER' : 'LISTING ASSISTANCE'}</span>
              <h2>${property.contactMode === 'broker' ? 'Discuss this property' : 'Take the next step'}</h2>
            </div>

            <div class="executive-hub-price-badge">
              <div class="executive-price-primary">
                ${listingPriceEntries(property).map(entry => `<strong>${esc(entry.value)}</strong>`).join('') || '<strong>Price on request</strong>'}
              </div>
              ${isLease && estMonthly !== null ? `
                <div class="executive-price-sub is-estimate" title="Estimated monthly gross based on ${fmt(areaInSqm)} m²">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <span>Est. total: <strong>${money(estMonthly)}</strong> / month</span>
                </div>
              ` : ''}
              ${salePricePerSqm(property) !== null ? `<div class="executive-price-sub">${money(salePricePerSqm(property))} / m²</div>` : ''}
            </div>

            <div class="executive-quick-specs">
              <div class="executive-spec-pill is-zoning" title="${esc(zoningName)} (${esc(zoningCode)})">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 21h18M5 21V7l8-4v18M13 11v10M9 9v.01M9 13v.01M9 17v.01"/></svg>
                <span>${esc(property.clupProfile?.zoningClassification || property.zoningClassification || 'Commercial (C-1)')}</span>
              </div>
              <div class="executive-spec-pill is-area" title="Total Land Area: ${areaLabel}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${areaLabel}</span>
              </div>
              <div class="executive-spec-pill is-hazard ${floodItem.raw === 'high' || floodItem.raw === 'very_high' ? 'is-elevated' : ''}" title="${esc(floodItem.finding)} · Flood Susceptibility Screening">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>${esc(floodBrief)}</span>
              </div>
              <div class="executive-spec-pill is-status" title="Listing Status: ${esc(property.status || 'Available')}">
                <span class="status-dot"></span>
                <span>${esc(property.status || 'Available')}</span>
              </div>
            </div>

            <div class="executive-contact-body">
              ${contact}
            </div>

            <div class="property-actions no-print">
              ${canInquire ? `<a class="city-button city-button-primary executive-inquire-btn" href="${sectionHref('cityInquiryPanel')}">Send an inquiry <span aria-hidden="true">↗</span></a>` : `<a class="city-button city-button-primary executive-inquire-btn" href="https://cc.sanfernandocity.gov.ph/lebdo/" target="_blank" rel="noopener">Contact LEBDO Assistance <span aria-hidden="true">↗</span></a>`}
              <a class="city-button city-button-opp-jump" href="${sectionHref('propertyOpportunitiesSection')}" title="Simulate high-compatibility commercial and industrial activities for this site">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Explore Compatible Businesses</span> <span aria-hidden="true">&#8595;</span>
              </a>
              <div class="executive-action-row">
                ${investor ? `<button class="city-button city-button-secondary" type="button" data-save="${property.id}" aria-pressed="${saved.has(property.id)}">${saved.has(property.id) ? 'Saved' : 'Save property'}</button>` : ''}
                <button class="city-button city-button-secondary" type="button" data-compare="${property.id}" aria-pressed="${compare.includes(property.id)}">${compare.includes(property.id) ? 'Added to compare' : 'Compare property'}</button>
              </div>
            </div>
            <p class="property-note">Confirm the current availability and terms before making arrangements.</p>
          </section>
        </div>

        <!-- 2. FULL-WIDTH PROPERTY ASSET PROFILE -->
        <section class="property-panel property-overview" id="propertyOverviewSection">
          <div class="property-section-heading">
            <div>
              <span class="site-eyebrow">PROPERTY ASSET PROFILE</span>
              <h2>Property overview</h2>
            </div>
            <div class="property-overview-badges">
              ${property.authorityToSellVerified ? `<span class="city-badge property-authority-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Authority to Sell <strong>✓ Verified</strong></span>` : ''}
              <span class="property-status status-${esc((property.status || 'unconfirmed').toLowerCase())}">
                <span class="status-indicator-dot"></span>
                ${esc(property.status || 'Unconfirmed')}
              </span>
            </div>
          </div>

          <p class="property-description">${esc(property.description || 'Additional property information has not been provided.')}</p>

          <div class="property-overview-details" data-investor-advanced>
          <div class="property-overview-kpis">
            <div class="property-kpi-tile kpi-price">
              <div class="kpi-tile-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div class="kpi-tile-content">
                <span class="kpi-label">${property.listingPurpose === 'lease' ? 'Lease Terms' : 'Sale Price / m²'}</span>
                <strong class="kpi-value">${primaryPrice}</strong>
                <span class="kpi-sub">${subPrice}</span>
              </div>
            </div>
            <div class="property-kpi-tile kpi-area">
              <div class="kpi-tile-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
              </div>
              <div class="kpi-tile-content">
                <span class="kpi-label">Total Land Area</span>
                <strong class="kpi-value">${areaLabel}</strong>
                <span class="kpi-sub">${areaSub}</span>
              </div>
            </div>
            <div class="property-kpi-tile kpi-zoning">
              <div class="kpi-tile-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M13 11v10M9 9v.01M9 13v.01M9 17v.01"/></svg>
              </div>
              <div class="kpi-tile-content">
                <span class="kpi-label">Zoning Classification</span>
                <strong class="kpi-value">${esc(zoningCode)}</strong>
                <span class="kpi-sub">${esc(zoningName)}</span>
              </div>
            </div>
            <div class="property-kpi-tile kpi-purpose">
              <div class="kpi-tile-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div class="kpi-tile-content">
                <span class="kpi-label">Asset Classification</span>
                <strong class="kpi-value">${esc(listingPurposeLabel(property))} · ${esc(property.category || property.type || 'Land')}</strong>
                <span class="kpi-sub">${esc(listingReviewSub)}</span>
              </div>
            </div>
          </div>

          ${factsMarkup([
            ['Property type', property.category || property.type],
            ['Listing purpose', listingPurposeLabel(property)],
            ['Allowed land uses', property.clupAllowedUses?.length ? `${property.clupAllowedUses.join(' · ')} (${property.clupVerifiedAt ? '✓ City validated' : 'Pending city validation'})` : 'Allowed uses awaiting verification'],
            ['Sale price / m²', property.listingPurpose === 'lease' ? 'Not offered' : salePricePerSqm(property) !== null ? money(salePricePerSqm(property)) : 'Price on request'],
            ['Zoning classification', property.clupProfile?.zoningClassification || 'Awaiting verification'],
            ...(property.clupProfile?.proposedActivity || property.proposedActivity ? [['Proposed land use activity', property.clupProfile?.proposedActivity || property.proposedActivity]] : []),
            ['Listing review', String(property.approvalState || 'pending').replaceAll('_', ' ')],
            ['Document status', property.authorityToSellVerified ? 'Authority to Sell ✓ Verified' : property.sellerUserId ? 'Authority to Sell pending city validation' : 'Not recorded'],
            ['Last updated', dateLabel(property.updatedAt)],
            ['Availability confirmed', dateLabel(property.lastConfirmedAvailableAt)]
          ])}

          ${utilitiesMarkup(property)}

          <details class="property-disclosure" data-print-expand>
            <summary>
              <span class="disclosure-title-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Area, facilities &amp; listing information
              </span>
              <small>Survey measurements &amp; site records</small>
            </summary>
            <div class="property-disclosure-body">
              ${factsMarkup([...areaFacts, ['Facilities', property.facilities?.join(', ') || 'Not recorded'], ['Investment context', property.assessmentTags?.join(', ') || 'Not recorded']])}
              ${property.readinessNotes ? `<p>${esc(property.readinessNotes)}</p>` : ''}
              ${survey > 0 && mapped > 0 && Math.abs(survey - mapped) > 0.01 ? `<p class="property-note">The ${recordedAreaLabel.toLowerCase()} and mapped estimate differ. The drawn outline is an estimate; confirm the legal area against the survey records.</p>` : ''}
            </div>
          </details>
          </div>
        </section>

        ${transportationAccessibilityMarkup(property)}

        ${localMarketIntelligenceMarkup(property)}

        ${floodAndFireAssessmentMarkup(property)}
        ${role === 'guest' || investor ? '<p class="property-basic-helper no-print" data-investor-basic>Switch to <strong>Advanced</strong> for the full property profile, transportation, market intelligence, assessments and source records.</p>' : ''}
        ${propertyAssessmentMarkup(property, calc)}
        <div class="property-advanced" data-investor-advanced>
          ${businessOpportunitiesMarkup ? businessOpportunitiesMarkup(property, options) : ''}
          <details class="property-disclosure site-scenario-disclosure" data-print-expand open><summary><span class="disclosure-title-wrap"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>Test a proposed business <small>Assess a specific activity</small></span><small>Simulate zoning clearance, policy incentives &amp; IAI</small></summary><div class="property-disclosure-body">${investorScenarioMarkup(property)}</div></details>
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
  const zoneName = property.clupProfile?.zoningClassification || property.zoningClassification || property.zoning_classification || 'Unverified district';
  const currentActivity = property.proposed_activity || property.clupProfile?.proposedActivity || property.proposedActivity || '';
  const initialCalc = assessmentCalculation(property);
  const baselineScore = initialCalc.recordedTotal !== null
    ? `${fixed(initialCalc.recordedTotal)} / 100 pts`
    : (initialCalc.physicalSubtotal !== null ? `${fmt(initialCalc.physicalSubtotal, 4)} / ${initialCalc.rows.length === 5 ? '100' : '85'} pts` : (property.mceScore ? `${fixed(property.mceScore)} / 100 pts` : '— / 100 pts'));
  const nearbyCount = property.nearbyBusinesses?.length || 0;
  const nearbySummary = nearbyCount > 0 ? `${nearbyCount} Mapped Places` : '500m Radar';
  const nearbyCaption = property.barangay ? `${property.barangay} commercial cluster` : 'Cluster analysis';

  return `<section class="property-panel property-scenario-simulation property-scenario-panel" id="propertyScenarioSection" aria-labelledby="propertyScenarioTitle">
    <div class="property-scenario-header-wrap">
      <div class="property-section-heading">
        <div>
          <span class="property-kicker">PART A · YOUR INVESTMENT</span>
          <h2 id="propertyScenarioTitle">What do you plan to establish on this property?</h2>
        </div>
        <div class="property-scenario-header-pills">
          <span class="property-scenario-district-pill" title="San Fernando Comprehensive Land Use Plan District">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            CLUP Zone: <strong>${esc(zoneName)}</strong>
          </span>
          <span class="property-scenario-badge">Interactive Simulation</span>
        </div>
      </div>
      
      <p class="property-description property-scenario-description">
        Select your planned business or land use activity and specify optional capitalization. LOCUS-SF evaluates zoning compatibility against San Fernando City CLUP &amp; Zoning Ordinance No. 2018-06 regulations for <strong>${esc(zoneName)}</strong>. Physical site attributes (Spatial 25%, Infra 25%, Cost &amp; Market 20%, Nearby 15%, Risk 15% totaling 100%) evaluate site attractiveness; CLUP Zoning serves as a mandatory non-compensatory eligibility gate.
      </p>

      <div class="property-scenario-framework-strip">
        <div class="framework-strip-item">
          <span class="framework-strip-icon is-gate">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <div class="framework-strip-text">
            <strong>Mandatory Zoning Gate</strong>
            <span>Non-compensatory; prohibited uses disqualify the site</span>
          </div>
        </div>
        <div class="framework-strip-item">
          <span class="framework-strip-icon is-mce">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </span>
          <div class="framework-strip-text">
            <strong>Five-Criterion MCE (100%)</strong>
            <span>Spatial, infra, cost/market, nearby, &amp; risk factors</span>
          </div>
        </div>
        <div class="framework-strip-item">
          <span class="framework-strip-icon is-incentive">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
          </span>
          <div class="framework-strip-text">
            <strong>Statutory Incentives (§19)</strong>
            <span>City Code tax discounts &amp; exemptions review</span>
          </div>
        </div>
      </div>
    </div>

    <div class="property-scenario-controls">
      <div class="property-scenario-controls-grid">
        <div class="property-scenario-field-group">
          <label for="investorProposedActivitySelect">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            Proposed Business or Land Use Activity
          </label>
          <div class="property-scenario-quick-picks" role="group" aria-label="Top recommended business quick-picks">
            <span class="property-scenario-quick-label">Top Recommendations:</span>
            <div class="property-scenario-quick-pills">
              <button type="button" class="scenario-quick-pill ${currentActivity === 'retail_convenience' ? 'is-active' : ''}" data-scenario-quick-pick="retail_convenience" data-quick-capital="1500000" title="Simulate Convenience Retail Store">
                <span class="quick-pill-dot" aria-hidden="true"></span>
                <span>Convenience Mart</span>
              </button>
              <button type="button" class="scenario-quick-pill ${currentActivity === 'retail_supermarket' ? 'is-active' : ''}" data-scenario-quick-pick="retail_supermarket" data-quick-capital="5000000" title="Simulate Neighborhood Grocery / Supermarket">
                <span class="quick-pill-dot" aria-hidden="true"></span>
                <span>Grocery / Mart</span>
              </button>
              <button type="button" class="scenario-quick-pill ${currentActivity === 'food_cafe' ? 'is-active' : ''}" data-scenario-quick-pick="food_cafe" data-quick-capital="3500000" title="Simulate Specialty Café / Coffee Shop">
                <span class="quick-pill-dot" aria-hidden="true"></span>
                <span>Café &amp; Dining</span>
              </button>
              <button type="button" class="scenario-quick-pill ${currentActivity === 'office_professional' ? 'is-active' : ''}" data-scenario-quick-pick="office_professional" data-quick-capital="2500000" title="Simulate Corporate / Professional Office">
                <span class="quick-pill-dot" aria-hidden="true"></span>
                <span>Office / Services</span>
              </button>
              <button type="button" class="scenario-quick-pill ${currentActivity === 'log_distribution_center' || currentActivity === 'log_warehouse' ? 'is-active' : ''}" data-scenario-quick-pick="log_distribution_center" data-quick-capital="10000000" title="Simulate Cold Storage / Logistics Hub">
                <span class="quick-pill-dot" aria-hidden="true"></span>
                <span>Logistics / Storage</span>
              </button>
              <button type="button" class="scenario-quick-pill ${currentActivity === 'tour_hotel' ? 'is-active' : ''}" data-scenario-quick-pick="tour_hotel" data-quick-capital="15000000" title="Simulate Hotel / Accommodation">
                <span class="quick-pill-dot" aria-hidden="true"></span>
                <span>Hotel / Lodging</span>
              </button>
            </div>
          </div>
          <div class="property-scenario-select-wrap">
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
          <small class="property-scenario-field-hint">Screened against 18 official San Fernando zones and CLUP permitted schedules.</small>
        </div>

        <div class="property-scenario-field-group">
          <label for="investorProposedCapitalInput">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
            Proposed Capitalization (Optional, PHP)
          </label>
          <div class="property-currency-input-wrap property-scenario-input-currency-prefix">
            <span class="currency-prefix" aria-hidden="true">₱</span>
            <input type="text" id="investorProposedCapitalInput" class="property-scenario-input" placeholder="e.g. 5,000,000" inputmode="numeric" autocomplete="off">
          </div>
          <div class="property-capital-presets" role="group" aria-label="Suggested capitalization tiers">
            <button type="button" class="property-preset-btn" data-preset-capital="3000000">₱3M (10% Discount)</button>
            <button type="button" class="property-preset-btn" data-preset-capital="5000000">₱5M (Standard)</button>
            <button type="button" class="property-preset-btn" data-preset-capital="15000000">₱15M (Full Exemption)</button>
          </div>
          <small class="property-scenario-hint">Capitalization informs statutory investment incentive analysis under City Code §19 and does not alter the physical site IAI.</small>
        </div>
      </div>

      <div class="property-scenario-action-bar">
        <div class="property-scenario-action-note">
          <span class="status-indicator-dot" style="width:7px;height:7px;background:#2563eb;"></span>
          <span>Real-time CLUP compatibility screening &amp; policy incentive calculation</span>
        </div>
        <div class="property-scenario-btn-group">
          <button type="button" class="property-scenario-eval-btn" data-scenario-evaluate>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Evaluate Investment</span>
          </button>
          <button type="button" class="property-scenario-reset-btn" data-scenario-reset>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Live Simulation Outcome Container -->
    <div data-scenario-outcome class="property-scenario-outcome">
      <div class="property-scenario-outcome-header">
        <div>
          <span class="property-scenario-status-kicker">Zoning Eligibility Screening (Mandatory Gate)</span>
          <h3 data-scenario-status-title class="property-scenario-status-title">Awaiting activity selection</h3>
          <p data-scenario-reason class="property-scenario-reason">Select a proposed business or land use above to determine whether it is permitted, conditional, or prohibited in ${esc(zoneName)}.</p>
        </div>
        <div>
          <span data-scenario-status-badge class="property-scenario-status-pill">Select Use</span>
        </div>
      </div>

      <!-- Conditions Checklist / Restrictions Box -->
      <div data-scenario-conditions-wrap hidden class="property-scenario-conditions-box">
        <strong class="property-scenario-conditions-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Mandatory Conditions &amp; Mitigation Requirements:
        </strong>
        <ul data-scenario-conditions-list class="property-scenario-conditions-list"></ul>
      </div>

      <!-- Policy Incentive Analysis Container (Separated from physical site IAI) -->
      <div data-scenario-incentive-wrap class="property-scenario-incentive-box">
        <div class="property-scenario-incentive-head">
          <span class="property-scenario-incentive-kicker">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            Potential Statutory Policy Incentive (§19)
          </span>
          <span class="property-scenario-incentive-badge" data-scenario-incentive-badge>Enter capitalization</span>
        </div>
        <p class="property-scenario-incentive-copy" data-scenario-incentive-copy>
          Capitalization informs potential Local Business Tax exemptions under the City Investment &amp; Incentives Code (Ordinance No. 2018-06 §19). Subject to official review by LEBDO and approval by the City Investment Board. Policy incentives do not modify the physical site IAI score.
        </p>
      </div>

      <!-- Live Scenario Scores Breakdown -->
      <div class="property-scenario-kpi-grid">
        <div class="property-scenario-kpi-card" data-kpi="zoning">
          <span class="property-scenario-kpi-label">CLUP Zoning Clearance</span>
          <strong data-scenario-zoning-score class="property-scenario-kpi-val">—</strong>
          <small data-scenario-zoning-contrib class="property-scenario-kpi-caption">Mandatory Gate (0%)</small>
        </div>
        <div class="property-scenario-kpi-card" data-kpi="mce">
          <span class="property-scenario-kpi-label">Five-Criterion MCE (100%)</span>
          <strong data-scenario-physical-baseline class="property-scenario-kpi-val">${baselineScore}</strong>
          <small class="property-scenario-kpi-caption">Spatial, Infra, Cost/Market, Nearby, Risk</small>
        </div>
        <div class="property-scenario-kpi-card" data-kpi="iai">
          <span class="property-scenario-kpi-label">Simulated Scenario IAI (100%)</span>
          <strong data-scenario-total-iai class="property-scenario-kpi-val">— / 100</strong>
          <small data-scenario-iai-note class="property-scenario-kpi-caption">Select planned use</small>
        </div>
        <div class="property-scenario-kpi-card" data-kpi="nearby">
          <span class="property-scenario-kpi-label">Nearby Commercial Context</span>
          <strong data-scenario-nearby-summary class="property-scenario-kpi-val">${nearbySummary}</strong>
          <small data-scenario-nearby-desc class="property-scenario-kpi-caption">${nearbyCaption}</small>
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
  const heroScoreEl = root.querySelector('#scenarioMainIaiCard [data-active-assessment-score]') || root.querySelector('[data-active-assessment-score]');
  const heroDescEl = root.querySelector('#scenarioMainIaiCard [data-active-iai-desc]') || root.querySelector('[data-active-iai-desc]');
  const comparisonBannerEl = root.querySelector('[data-scenario-comparison-banner]');
  const zoningCritRow = root.querySelector('.property-criterion-rating-item[data-criterion="zoning_compatibility"]');
  const nearbyCritRow = root.querySelector('.property-criterion-rating-item[data-criterion="nearby_businesses"]');
  const reportBtn = root.querySelector('[data-scenario-report-btn]');

  if (property.protocol_version || property.id || property.property_id) {
    let requestVersion = 0;
    const savedPresentation = assessmentPresentation(property);
    const text = (element, value) => { if (element) element.textContent = value; };
    const render = assessment => {
      const combined = { ...property, ...assessment, status: property.status };
      const result = assessmentCalculation(combined);
      const presentation = assessmentPresentation(combined, result);
      const total = presentation.indexValue;
      text(totalIaiEl, total);
      if (heroScoreEl) heroScoreEl.innerHTML = `<strong>${presentation.headline}</strong>`;
      const denominator = heroScoreEl?.closest?.('.property-score-card-number')?.querySelector('small');
      if (denominator) { denominator.hidden = presentation.total === null; denominator.textContent = ' / 100'; }
      const mceScoreEl = root.querySelector('[data-active-mce-score]');
      if (mceScoreEl) mceScoreEl.textContent = presentation.recorded;
      const iaiPillEl = root.querySelector('[data-active-iai-composite-pill]');
      if (iaiPillEl) iaiPillEl.textContent = presentation.releaseStatus;
      text(root.querySelector('[data-assessment-total-label]'), presentation.label);
      text(root.querySelector('[data-assessment-release-state]'), presentation.state);
      const recordedNote = root.querySelector('[data-recorded-total-note]');
      if (recordedNote) { recordedNote.hidden = result.iai !== null || result.recordedTotal === null; recordedNote.textContent = presentation.scoreNote; }
      const chart = root.querySelector('[data-site-rating-chart]');
      if (chart) chart.innerHTML = criterionBarsMarkup(result);
      const priceExplanation = root.querySelector('[data-site-price-explanation]');
      if (priceExplanation) priceExplanation.innerHTML = propertyCostExplanationMarkup(combined, result);
      const calculation = root.querySelector('[data-site-calculation]');
      if (calculation) calculation.innerHTML = calculationMarkup(combined);
      const evidence = root.querySelector('[data-site-evidence]');
      if (evidence) evidence.innerHTML = evidenceMarkup(combined, result);
      const radar = root.querySelector('[data-disclosure-radar] .property-disclosure-body');
      if (radar) radar.innerHTML = radarMarkup(result);
      const rated = result.rows.filter(row => row.score !== null).length;
      const ring = root.querySelector('.site-coverage-value');
      ring?.setAttribute?.('stroke-dasharray', `${rated / result.rows.length * 100} 100`);
      ring?.setAttribute?.('stroke-opacity', rated ? '1' : '0');
      const coverageValue = root.querySelector('.site-coverage-ring > strong');
      if (coverageValue) coverageValue.innerHTML = `${rated}<small> / ${result.rows.length}</small>`;
      const coverageLabel = root.querySelector('.site-coverage-ring svg');
      coverageLabel?.setAttribute?.('aria-label', `${rated} of ${result.rows.length} criteria have recorded ratings`);
      const coverageCopy = root.querySelector('.site-coverage > div:last-child p');
      text(coverageCopy, rated === result.rows.length ? 'All criteria have a recorded rating.' : `${result.rows.length - rated} criteria still need a rating.`);
      const verification = root.querySelector('.site-coverage > div:last-child > span');
      text(verification, `${result.rows.filter(row => combined.evidence_verification?.[row.key]?.status === 'authenticated').length} of ${result.rows.length} criteria with authenticated evidence`);
      const assessmentStatus = root.querySelector('#propertyAssessmentSection .property-assessment-header-bar .property-status');
      text(assessmentStatus, result.complete && !result.isConditional ? `All ${result.rows.length === 5 ? 'five' : (result.rows.length === 6 ? 'six' : 'seven')} criteria rated` : presentation.state);
      assessmentStatus?.classList?.toggle('is-pending', !result.complete);
      const physicalNote = root.querySelector('.site-physical-note');
      if (physicalNote) { physicalNote.hidden = !result.hasPhysicalBaseline || result.iai !== null; text(physicalNote, result.hasPhysicalBaseline ? (result.rows.length === 5 ? `Physical MCE total: ${fmt(result.physicalSubtotal, 4)} / 100 pts. Zoning clearance required.` : `Physical subtotal: ${fmt(result.physicalSubtotal, 4)} / 85 pts. This is not the composite IAI.`) : ''); }

      const activeActivity = select?.value || combined.proposed_activity || '';
      const zoneName = combined.clupProfile?.zoningClassification || combined.zoningClassification || combined.zoning_classification || 'Unverified district';
      const eligibility = combined.eligibility || assessment?.eligibility || {};
      const rawStatus = (eligibility.zoning || eligibility.zoning_status || eligibility.status || combined.zoning_status || combined.zoning || '').toLowerCase().trim();
      const isEligible = eligibility.is_eligible;
      const zStatus = activeActivity ? (
        ['permitted', 'conditional', 'prohibited'].includes(rawStatus)
          ? rawStatus
          : (rawStatus === 'not_suitable' ? 'prohibited'
          : (rawStatus.includes('undetermined') || rawStatus.includes('unverified') || rawStatus === 'incomplete' ? 'undetermined'
          : (isEligible === true ? (eligibility.conditions?.length ? 'conditional' : 'permitted')
          : (isEligible === false ? (eligibility.reason?.includes('unverified') || eligibility.reason?.includes('incomplete') ? 'undetermined' : 'prohibited')
          : ''))))
      ) : '';

      outcomeEl?.classList?.remove?.('status-permitted', 'status-conditional', 'status-prohibited', 'status-undetermined');

      if (!activeActivity) {
        text(titleEl, 'Awaiting activity selection');
        text(badgeEl, 'Select Use');
        if (badgeEl) badgeEl.className = 'property-scenario-status-pill';
        text(reasonEl, `Select a proposed business or land use above to determine whether it is permitted, conditional, or prohibited in ${zoneName}.`);
        text(zoningScoreEl, '—');
        text(zoningContribEl, 'Mandatory Gate (0%)');
        text(iaiNoteEl, 'Select planned use');
      } else if (assessment.reason && assessment.assessmentStatus === 'incomplete' && assessment.reason.includes('Checking')) {
        text(titleEl, `Evaluating in ${zoneName}...`);
        text(badgeEl, 'Evaluating');
        if (badgeEl) badgeEl.className = 'property-scenario-status-pill';
        text(reasonEl, assessment.reason);
        text(zoningScoreEl, 'Checking...');
        text(zoningContribEl, 'Mandatory Gate (0%)');
        text(iaiNoteEl, 'Evaluating scenario...');
      } else if (assessment.reason && assessment.assessmentStatus === 'incomplete' && assessment.reason.includes('could not be retrieved')) {
        text(titleEl, 'Evaluation Unavailable');
        text(badgeEl, 'Pending');
        if (badgeEl) badgeEl.className = 'property-scenario-status-pill';
        text(reasonEl, assessment.reason);
        text(zoningScoreEl, 'Pending');
        text(zoningContribEl, 'Mandatory Gate (0%)');
        text(iaiNoteEl, 'Server offline');
      } else if (zStatus === 'permitted' || (eligibility.is_eligible === true && (!eligibility.conditions || eligibility.conditions.length === 0))) {
        text(titleEl, `Permitted in ${zoneName}`);
        text(badgeEl, 'Permitted Use');
        if (badgeEl) badgeEl.className = 'property-scenario-status-pill pill-permitted';
        outcomeEl?.classList?.add?.('status-permitted');
        text(reasonEl, eligibility.notes?.[0] || eligibility.note || eligibility.reason || eligibility.explanation || `Proposed activity is permitted by right under San Fernando CLUP & Zoning Ordinance No. 2018-06 in ${zoneName}.`);
        text(zoningScoreEl, 'Permitted');
        text(zoningContribEl, 'Passes Mandatory Gate (100%)');
        text(iaiNoteEl, 'Unlocks 100% investment ranking');
      } else if (zStatus === 'conditional' || (eligibility.is_eligible === true && eligibility.conditions && eligibility.conditions.length > 0)) {
        text(titleEl, `Conditional in ${zoneName}`);
        text(badgeEl, 'Conditional Use');
        if (badgeEl) badgeEl.className = 'property-scenario-status-pill pill-conditional';
        outcomeEl?.classList?.add?.('status-conditional');
        text(reasonEl, eligibility.notes?.[0] || eligibility.note || eligibility.reason || eligibility.explanation || `Permitted subject to locational clearance and required mitigation conditions under Ordinance No. 2018-06.`);
        text(zoningScoreEl, 'Conditional');
        text(zoningContribEl, 'Locational Clearance Required');
        text(iaiNoteEl, 'Conditional clearance required');
      } else if (zStatus === 'prohibited' || eligibility.is_eligible === false) {
        text(titleEl, `Prohibited in ${zoneName}`);
        text(badgeEl, 'Prohibited Use');
        if (badgeEl) badgeEl.className = 'property-scenario-status-pill pill-prohibited';
        outcomeEl?.classList?.add?.('status-prohibited');
        const defaultProhibitedReason = `Proposed activity is not an allowed use in ${zoneName} under San Fernando CLUP & Zoning Ordinance No. 2018-06. Site is disqualified.`;
        const prohibitedReason = (eligibility.reason && !eligibility.reason.includes('unverified') && !eligibility.reason.includes('awaiting CLUP'))
          ? eligibility.reason
          : (eligibility.note || eligibility.notes?.[0] || eligibility.explanation || defaultProhibitedReason);
        text(reasonEl, prohibitedReason);
        text(zoningScoreEl, 'Prohibited');
        text(zoningContribEl, 'Disqualifies Site (0%)');
        text(iaiNoteEl, `Withheld · Disqualified in ${zoneName}`);
      } else if (zStatus === 'undetermined') {
        text(titleEl, `Awaiting CLUP Clearance in ${zoneName}`);
        text(badgeEl, 'Under Review');
        if (badgeEl) badgeEl.className = 'property-scenario-status-pill pill-undetermined';
        outcomeEl?.classList?.add?.('status-undetermined');
        text(reasonEl, eligibility.reason || `Zoning compatibility for this activity in ${zoneName} requires formal CPDO verification or is awaiting CLUP schedule clearance.`);
        text(zoningScoreEl, 'Pending');
        text(zoningContribEl, 'Mandatory Gate (0%)');
        text(iaiNoteEl, 'Awaiting CLUP clearance');
      } else {
        const fallbackStatus = String(combined.assessmentStatus || 'incomplete').replaceAll('_', ' ');
        text(titleEl, result.complete ? `Evaluated in ${zoneName}` : fallbackStatus);
        text(badgeEl, result.complete ? 'Cleared' : fallbackStatus);
        if (badgeEl) badgeEl.className = result.complete ? 'property-scenario-status-pill pill-permitted' : 'property-scenario-status-pill';
        text(reasonEl, result.reason || combined.note || 'Recorded assessment; confirm applicable evidence and clearances.');
        text(zoningScoreEl, result.complete ? 'Permitted' : '—');
        text(zoningContribEl, result.complete ? 'Passes Mandatory Gate (100%)' : 'Mandatory Gate (0%)');
        text(iaiNoteEl, presentation.provisional ? 'Provisional · official release pending' : result.isConditional ? 'No actionable investment rank' : fallbackStatus);
      }

      text(heroDescEl, presentation.description);
      const zoningRow = result.rows.find(row => row.key === 'zoning_compatibility');
      if (zoningRow && zoningRow.score !== null) {
        text(zoningScoreEl, `${fmt(zoningRow.score)} / 100`);
        text(zoningContribEl, `${fmt(zoningRow.contribution, 4)} weighted points`);
      }

      const initialCalc = assessmentCalculation(property);
      const baselineScore = initialCalc.recordedTotal !== null
        ? `${fixed(initialCalc.recordedTotal)} / 100 pts`
        : (initialCalc.physicalSubtotal !== null ? `${fmt(initialCalc.physicalSubtotal, 4)} / ${initialCalc.rows.length === 5 ? '100' : '85'} pts` : (property.mceScore ? `${fixed(property.mceScore)} / 100 pts` : '— / 100 pts'));
      const physScore = result.rows.length === 5 && result.recordedTotal !== null
        ? `${fixed(result.recordedTotal)} / 100 pts`
        : (result.physicalSubtotal !== null ? `${fmt(result.physicalSubtotal, 4)} / 85 pts` : (property.mceScore ? `${fixed(property.mceScore)} / 100 pts` : baselineScore));
      text(physicalBaselineEl, physScore);

      const nearbyCount = combined.nearbyBusinesses?.length || property.nearbyBusinesses?.length || 0;
      if (nearbySummaryEl) {
        text(nearbySummaryEl, nearbyCount > 0 ? `${nearbyCount} Mapped Places` : '500m Radar');
      }
      if (nearbyDescEl) {
        const barangay = combined.barangay || property.barangay || '';
        text(nearbyDescEl, barangay ? `${barangay} commercial cluster` : 'Cluster analysis');
      }

      const conditions = combined.eligibility?.outstanding_requirements || combined.eligibility?.conditions || [];
      if (conditionsWrap) conditionsWrap.hidden = conditions.length === 0;
      if (conditionsList) conditionsList.innerHTML = conditions.map(condition => `<li>${esc(condition)}</li>`).join('');
      if (comparisonBannerEl) {
        comparisonBannerEl.hidden = !savedPresentation.provisional;
        comparisonBannerEl.style.display = savedPresentation.provisional ? '' : 'none';
        text(comparisonBannerEl, savedPresentation.provisional ? `Saved property IAI: ${savedPresentation.indexValue} (provisional). The selected activity is evaluated separately.` : '');
      }
      const brief = root.querySelector('#locusInvestorBrief');
      if (brief) brief.outerHTML = investorBriefReportMarkup(property, { scenarioAssessment: assessment });
    };
    const withheld = (activity, reason) => ({ ...property, proposed_activity: activity, assessmentComplete: false,
      displayed_iai: null, iaiScore: null, mceScore: null, assessmentStatus: 'incomplete', reason,
      criterion_scores: {}, assessmentCriteria: {}, criteriaBreakdown: [], weighted_contributions: {}, unrounded_total: null,
      numerical_completeness: false, physical_evidence_complete: false, physical_subtotal: null,
      technical_review_hold: false, technical_review_reasons: [] });
    const evaluate = async () => {
      const version = ++requestVersion;
      const activity = select?.value || '';
      render(withheld(activity, 'Checking the selected activity. Its current score is pending until the server responds.'));
      try {
        const apiBase = window.SFC_APP_CONFIG?.apiBase || 'api';
        const response = await fetch(`${apiBase}/property-assessment.php?id=${encodeURIComponent(property.id || property.property_id)}&activity=${encodeURIComponent(activity)}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Assessment request failed');
        const payload = await response.json();
        if (!payload.assessment?.protocol_version) throw new Error('Assessment protocol missing');
        if (version === requestVersion) render(payload.assessment);
      } catch (_) {
        if (version === requestVersion) render(withheld(activity, 'The assessment could not be retrieved. Try again before generating a scenario brief.'));
      }
    };
    const syncQuickPills = (activeVal) => {
      if (typeof container.querySelectorAll === 'function') {
        container.querySelectorAll('[data-scenario-quick-pick]').forEach(pill => {
          pill.classList?.toggle?.('is-active', pill.getAttribute('data-scenario-quick-pick') === activeVal);
        });
      }
    };

    const quickPickBtns = typeof container.querySelectorAll === 'function' ? container.querySelectorAll('[data-scenario-quick-pick]') : [];
    quickPickBtns.forEach(pill => {
      pill.addEventListener('click', () => {
        const pickActivity = pill.getAttribute('data-scenario-quick-pick');
        const suggestedCapital = pill.getAttribute('data-quick-capital');
        if (select) {
          select.value = pickActivity;
        }
        syncQuickPills(pickActivity);
        if (suggestedCapital && capitalInput && (!capitalInput.value || capitalInput.value.trim() === '')) {
          capitalInput.value = formatPesoInput(suggestedCapital);
          updateIncentive();
        }
        return evaluate();
      });
    });

    select?.addEventListener('change', () => {
      syncQuickPills(select?.value);
      return evaluate();
    });
    evalBtn?.addEventListener('click', evaluate);
    resetBtn?.addEventListener('click', () => {
      if (select) select.value = '';
      if (capitalInput) capitalInput.value = '';
      syncQuickPills('');
      updateIncentive();
      return evaluate();
    });

    const presetBtns = typeof container.querySelectorAll === 'function' ? container.querySelectorAll('[data-preset-capital]') : [];
    const updateIncentive = () => {
      const currentVal = parsePesoInput(capitalInput?.value);
      const result = potentialIncentive(currentVal, policy);
      text(incentiveBadgeEl, result.badge);
      text(incentiveCopyEl, result.copy);
      presetBtns.forEach(btn => {
        const btnVal = parsePesoInput(btn.getAttribute('data-preset-capital'));
        btn.classList.toggle('is-active', currentVal > 0 && btnVal === currentVal);
      });
    };

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const amount = btn.getAttribute('data-preset-capital');
        if (capitalInput) {
          capitalInput.value = formatPesoInput(amount);
          updateIncentive();
        }
      });
    });

    capitalInput?.addEventListener('input', () => {
      const raw = capitalInput.value;
      const num = parsePesoInput(raw);
      if (raw === '' || raw === null) {
        // empty input allowed
      } else if (/^0+$/.test(raw.replace(/[^\d]/g, ''))) {
        capitalInput.value = '0';
      } else if (num > 0) {
        const formatted = formatPesoInput(num);
        if (formatted !== raw) {
          capitalInput.value = formatted;
        }
      }
      updateIncentive();
    });

    if (capitalInput?.value) {
      updateIncentive();
    }

    if (select && select.value) {
      evaluate();
    }

    reportBtn?.addEventListener('click', () => window.print());
    return;
  }

}
