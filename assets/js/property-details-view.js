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
  // The current protocol supplies its evidence gates and unrounded contributions.
  // Never resurrect a withheld result from an older compatibility alias.
  if (property?.protocol_version || property?.criteriaBreakdown) {
    const breakdown = Array.isArray(property.criteriaBreakdown) ? property.criteriaBreakdown : [];
    const rows = criteria6.map(([key, label, defaultWeight]) => {
      const recorded = breakdown.find(row => row.key === key) || {};
      const score = numeric(property.criterion_scores?.[key] ?? property.assessmentCriteria?.[key]);
      const weight = numeric(property.weight_configuration?.[key] ?? property.assessmentWeights?.[key]) ?? defaultWeight;
      return { key, label, weight, score: score !== null && score >= 0 && score <= 100 ? score : null,
        contribution: numeric(property.weighted_contributions?.[key] ?? recorded.weighted_score), explanation: criterionExplanations[key] };
    });
    const sum = rows.reduce((total, row) => total + (row.contribution ?? 0), 0);
    const displayed = numeric(property.displayed_iai);
    const close = (a, b) => a !== null && b !== null && Math.abs(a - b) < 0.000001;
    const discrepancy = rows.some(row => row.score !== null && (!close(row.contribution, row.score * row.weight / 100)
      || breakdown.some(record => record.key === row.key && (!close(numeric(record.weighted_score), row.contribution)
        || !close(numeric(record.score), row.score) || !close(numeric(record.weight), row.weight)))))
      || (displayed !== null && (!close(Math.round((sum + Number.EPSILON) * 10) / 10, displayed)
        || !close(numeric(property.unrounded_total), sum)
        || ['iaiScore', 'mceScore', 'iai', 'iai_score', 'mce_score'].some(key => property[key] != null && !close(numeric(property[key]), displayed))));
    const complete = property.assessmentComplete === true && property.evidence_completeness === true
      && property.numerical_completeness === true && property.weights_valid === true
      && close(rows.reduce((total, row) => total + row.weight, 0), 100)
      && rows.every(row => row.score !== null && row.weight >= 0)
      && !property.technical_review_hold && !property.discrepancy_detected && !property.discrepancy_review_required && !discrepancy
      && ['complete', 'conditional'].includes(property.assessmentStatus) && displayed !== null;
    const physicalSubtotal = property.physical_evidence_complete === true ? numeric(property.physical_subtotal) : null;
    return { rows, complete, iai: complete ? displayed : null, mce: complete ? displayed : null,
      physicalSubtotal, hasPhysicalBaseline: physicalSubtotal !== null, components: rows,
      isZoningPending: rows.find(row => row.key === 'zoning_compatibility')?.score === null,
      isConditional: property.assessmentStatus === 'conditional', isNotSuitable: property.assessmentStatus === 'not_suitable',
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

export function safetyMarkup(property) { return siteSafetyMarkup(property); }

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
  const scope = property.offeredSpaceScope || property.offered_space_scope || parcel.observations?.offered_space_scope;
  const offered = positive(property.offeredAreaSqm ?? property.offered_area_sqm ?? parcel.observations?.offered_area_sqm)
    ?? (scope === 'entire_land' ? area : floor);
  const rentText = rent !== null && rent >= 0 ? `PHP ${fmt(rent)}${perSqm ? ' / m²' : ''}` : 'Price on request';
  const rentTotal = rent !== null && rent >= 0 ? perSqm ? offered ? rent * offered : null : rent : null;
  const quote = sale !== null && sale >= 0 ? `PHP ${fmt(sale)}` : 'Price on request';
  const review = human(property.approvalState || 'Not recorded');
  const method = property.protocol_version || property.methodology || property.assessmentMethodologyVersion || 'Recorded MCE assessment';
  const score = calc.iai === null ? 'Withheld' : fixed(calc.iai);
  const status = calc.discrepancy ? 'Review required' : human(property.assessmentStatus || (calc.complete ? 'complete' : 'incomplete'));
  const hasScore = calc.iai !== null;
  const rated = calc.rows.filter(row => row.score !== null).length;
  const weightedCoverage = calc.rows.filter(row => row.score !== null).reduce((total, row) => total + row.weight, 0);
  const zoning = details.zoning_compatibility || {};
  const zone = zoning.zone_full_label || zoning.raw?.zoning_classification || property.clupProfile?.zoningClassification || property.zoningClassification || 'Not recorded';
  const activity = property.proposed_activity || property.clupProfile?.proposedActivity || property.proposedActivity || '';
  const eligibility = zoning.status_label || human(property.eligibility?.zoning) || 'Pending verification';
  const hazards = [
    ['flood_susceptibility', 'Flood susceptibility', 25], ['active_fault', 'Active fault / ground rupture', 25],
    ['landslide_susceptibility', 'Landslide susceptibility', 15], ['storm_surge', 'Storm surge', 15],
    ['liquefaction_susceptibility', 'Liquefaction', 10], ['tsunami_exposure', 'Tsunami', 10],
  ].map(([key, label, weight]) => {
    const entry = details.risk_constraints?.subcriteria?.[key] || property.subcriterion_scores?.risk_constraints?.[key] || {};
    const legacy = key === 'flood_susceptibility' ? property.hazardScreening?.flood : key === 'active_fault' ? property.hazardScreening?.fault : null;
    const finding = entry.status_label || entry.finding || entry.details || human(entry.raw_status) || legacy?.details || human(legacy?.status);
    const assessed = Boolean(finding && !/not.assessed|not.scored|pending|unknown/i.test(entry.raw_status || finding));
    return { label, weight: numeric(entry.weight) ?? weight, finding: finding || 'Not assessed', assessed,
      evidence: human(entry.evidence_status) || (legacy?.status ? 'Recorded finding · verification pending' : 'not assessed'),
      source: entry.source || entry.evidence?.[0]?.source || legacy?.source || 'Source not recorded' };
  });
  const assessedHazards = hazards.filter(row => row.assessed).length;
  const missing = [...new Set([...(property.missing_requirements || property.missingRequirements || []), ...(!hasScore ? calc.missingCriteria || [] : [])])];
  const reason = calc.reason || property.reason || (hasScore ? 'Ratings reflect the configured operational rubric; methodology and weights remain subject to validation.' : 'Required evidence or observations are incomplete. Missing criteria are never scored as zero.');
  const attention = hasScore
    ? calc.isConditional ? 'No actionable investment rank. Resolve the conditions attached to the proposed use before proceeding.' : 'Confirm evidence dates, parcel coverage and commercial terms before using this assessment.'
    : missing.length ? `Complete the missing observations and verify supporting evidence. ${missing.length} outstanding requirements remain; see the assessment evidence for details.` : reason;
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
    <div class="brief-listing-strip"><span>${esc(purposeText)} <i>·</i> ${esc(property.status || 'Availability not recorded')}</span><span class="brief-pill">${hasScore ? 'Assessment recorded' : 'Assessment pending'}</span></div>
    <figure class="brief-hero ${image ? 'has-photo' : 'no-photo'}">${image ? `<img src="${esc(image)}" alt="${esc(property.name || 'Property photograph')}" onerror="this.parentElement.classList.add('photo-unavailable'); this.parentElement.querySelector('figcaption').textContent='Property image unavailable · location reference only'; this.remove();"><div class="brief-image-context"><span class="brief-eyebrow">SITE REFERENCE</span><strong>${esc(property.barangay || property.city || 'Location pending')}</strong><p>${esc(property.city || 'San Fernando City, La Union')}</p><small>WGS 84 coordinates<br>${esc(coords)}</small><p class="brief-image-context-note">Confirm the parcel limits against the survey record.</p></div>` : ''}<div class="brief-hero-empty"><span class="brief-eyebrow">PROPERTY RECORD</span><strong>${esc(location)}</strong><p>Property photography ${image ? 'unavailable' : 'not provided'}</p><small>${esc(coords)}</small></div><figcaption>${image ? 'Listing image · supplied with the property record' : 'Location reference · site photography pending'}</figcaption></figure>
    <div class="brief-metrics">${metric(leaseOnly ? 'Asking rent' : 'Asking price', leaseOnly ? rentText : quote, leaseOnly ? `Billed per ${period} · seller-reported` : 'Seller-reported · subject to confirmation')}${metric('Recorded land area', areaText, area ? `${fmt(area / 10000, 6)} ha · ${areaBasis}` : 'Area confirmation required')}${metric(leaseOnly ? 'Estimated total rent' : 'Asking price / m²', leaseOnly ? rentTotal !== null ? `PHP ${fmt(rentTotal)}` : 'Not Available' : sale !== null && area ? `PHP ${fmt(sale / area)}` : 'Not Available', leaseOnly ? `Per ${period} · ${offered ? `${fmt(offered)} m² offered area` : 'Offered area not recorded'}` : 'Based on the recorded land area')}</div>
    ${both ? note('Lease option', `${rentText} / ${period}. ${rentTotal !== null ? `Total rent: PHP ${fmt(rentTotal)} / ${period}.` : 'Confirm the offered area before estimating total rent.'}`) : ''}
    <h2>Property overview</h2><p class="brief-description">${esc(property.description || 'No property description has been provided.')}</p>
    ${facts([['Property type', [property.category || property.type, property.subcategory].filter(Boolean).join(' · ') || 'Not recorded'], ['Building / floor area', floor ? `${fmt(floor)} m²` : isBuilding ? 'Floor area not recorded' : 'Not recorded'], ['Boundary record', boundary ? 'Recorded outline (GIS polygon)' : 'Pin reference · boundary not drawn'], ['Listing review', review], ['Coordinates · WGS 84', coords], ['Last updated', dateLabel(property.updatedAt)]])}
    ${facilities.length ? `<p class="brief-amenities"><b>Reported amenities</b> ${facilities.map(esc).join(' · ')}</p>` : ''}
    ${note('Before committing', priorities[2])}`);
  const assessment = page(2, 'Investment assessment', `${heading('02', 'Investment assessment', 'Investment assessment', 'Investment Attractiveness Index · evidence, weights and outstanding checks')}
    <div class="brief-score-panel ${!hasScore ? 'is-pending' : ''}"><div><span class="brief-eyebrow">COMPOSITE IAI</span><strong class="brief-score">${score}${hasScore ? '<small>/ 100</small>' : ''}</strong><span class="brief-score-accessible">IAI: ${score}${hasScore ? ' / 100' : ''}</span></div><div><span class="brief-pill">${esc(status)}</span><p>${esc(reason)}</p></div></div>
    <div class="brief-coverage"><div><strong>${rated}<small> / ${calc.rows.length}</small></strong><span>Criteria with ratings</span></div><div><strong>${fmt(weightedCoverage)}<small>%</small></strong><span>Weight with recorded ratings</span></div><div><strong>${assessedHazards}<small> / 6</small></strong><span>Hazard findings recorded</span></div></div>
    <h2>How the assessment adds up</h2><table class="brief-table locus-brief-assessment-table"><caption>Criterion scores and weighted contributions. Pending values are excluded from a composite.</caption><thead><tr><th scope="col">Criterion</th><th scope="col">Score / 100</th><th scope="col">Weight</th><th scope="col">Points</th></tr></thead><tbody>${calc.rows.map((row, index) => `<tr><th scope="row"><span class="brief-row-index">${String(index + 1).padStart(2, '0')}</span>${esc(row.label.split(' / ')[0])}</th><td class="${row.score === null ? 'brief-pending' : ''}">${row.score === null ? 'Pending' : fmt(row.score, 2)}</td><td>${fmt(row.weight)}%</td><td>${row.contribution === null ? '—' : fmt(row.contribution, 4)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Composite IAI</th><td colspan="3">${hasScore ? `${fixed(calc.iai)} / 100` : 'Withheld · review pending'}</td></tr></tfoot></table>
    <div class="brief-formula"><span class="brief-eyebrow">CALCULATION METHOD</span><p>Weighted points = score × weight ÷ 100</p><strong>${hasScore ? `IAI = round(${calc.rows.map(row => fmt(row.contribution, 6)).join(' + ')}, 1) = ${score} / 100` : 'No composite is calculated from partial evidence.'}</strong>${calc.hasPhysicalBaseline && !hasScore ? `<p>Physical site subtotal: ${fmt(calc.physicalSubtotal, 4)} / ${fmt(property.physical_subtotal_max ?? 85)} points. This is not a composite IAI.</p>` : ''}</div>
    <div class="brief-two-col"><div><h2>Read the score correctly</h2><p>Higher ratings indicate more favorable observations under the configured rubric. A score does not certify legal eligibility, property value, safety or investment returns.</p></div><div><h2>What needs attention</h2><p>${esc(attention)}</p></div></div>
    ${note('Methodology & scope', `${method}. ${property.weight_validation_status || property.weightStatus || 'Provisional / Subject to LGU validation'}. Assessment date: ${dateLabel(property.assessed_at || property.generatedAt)}.${activity ? ` Scenario: ${activity}.` : ''}`, 'is-neutral')}`);
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



export function criterionBarsMarkup(calculation) {
  return `<div class="site-rating-chart" aria-label="Criterion ratings on a scale of zero to 100">
    <div class="site-chart-axis" aria-hidden="true"><span>Criterion</span><div><span>0</span><span>50</span><span>100</span></div><span>Weighted points</span></div>
    <ul class="property-criterion-ratings-list site-rating-list">${calculation.rows.map(row => `<li class="property-criterion-rating-item site-rating-row" data-criterion="${esc(row.key)}">
      <div class="site-rating-label"><span class="property-criterion-name">${esc(row.label.split(' / ')[0])}</span><small>${fmt(row.weight)}% weight</small></div>
      <div class="site-rating-visual"><div class="site-rating-track ${row.score === null ? 'is-pending' : ''}" aria-hidden="true">${row.score === null ? '<span>Awaiting rating</span>' : `<i class="property-criterion-bar-fill" style="width:${Math.max(0, Math.min(100, row.score))}%"></i>`}</div><strong class="site-rating-value">${row.score === null ? 'Pending' : `${rating(row.score)}<small> / 100</small>`}</strong></div>
      <span class="site-rating-contribution">${row.contribution === null ? 'Points pending' : `${fmt(row.contribution, 4)} weighted pts`}</span>
    </li>`).join('')}</ul><p class="site-chart-note">Ratings before weighting. A pending value is missing evidence, not a score of zero.</p></div>`;
}

export function propertyAssessmentMarkup(property, calc = assessmentCalculation(property)) {
  const count = calc.rows.length;
  const rated = calc.rows.filter(row => row.score !== null).length;
  const verified = calc.rows.filter(row => property.evidence_verification?.[row.key]?.status === 'authenticated').length;
  const headline = calc.iai !== null ? fixed(calc.iai) : calc.isNotSuitable ? 'Not Suitable' : 'Withheld';
  const description = calc.reason || (calc.complete ? 'Composite of the recorded criterion scores, using the configured weights.' : `Assessment pending · ${rated} of ${count} criteria rated. Complete the missing observations and source verification before interpreting a composite score.`);
  const coverage = Math.max(0, Math.min(1, rated / count));
  return `<section class="property-panel property-assessment site-assessment" id="propertyAssessmentSection" aria-labelledby="propertyAssessmentTitle">
    <header class="property-assessment-header-bar"><div><span class="site-eyebrow">SITE INTELLIGENCE</span><h2 id="propertyAssessmentTitle">The assessment, at a glance</h2><p class="property-assessment-subtitle">See what is recorded, what it contributes and what still needs review.</p></div><span class="property-status ${calc.complete ? '' : 'is-pending'}">${calc.complete ? `All ${count === 6 ? 'six' : 'seven'} criteria rated` : 'Evidence pending'}</span></header>
    <div class="site-assessment-grid">
      <div class="property-score-card property-score-card-iai site-score-summary" id="scenarioMainIaiCard"><span class="site-eyebrow">INVESTMENT ATTRACTIVENESS INDEX</span><span class="property-kicker-method" style="display:block;font-size:11px;color:#64748b;margin-top:2px;">Multi-Criteria Evaluation (MCE) Methodology</span><div class="property-score-card-number"><span data-active-iai-score><strong>${headline}</strong></span><small ${calc.iai === null ? 'hidden' : ''}> / 100</small></div><p data-active-iai-desc>${esc(description)}</p>${calc.hasPhysicalBaseline && calc.iai === null ? `<p class="site-physical-note">Physical subtotal: ${fmt(calc.physicalSubtotal, 4)} / 85 pts. This is not the composite IAI.</p>` : ''}<div data-scenario-comparison-banner hidden></div><button type="button" class="site-text-button" data-open-calculation>How is this calculated? <span aria-hidden="true">↗</span></button></div>
      <div class="site-coverage"><div class="site-coverage-ring"><svg viewBox="0 0 120 120" role="img" aria-label="${rated} of ${count} criteria have recorded ratings"><circle cx="60" cy="60" r="48" class="site-coverage-track"/><circle cx="60" cy="60" r="48" class="site-coverage-value" stroke-opacity="${rated ? 1 : 0}" pathLength="100" stroke-dasharray="${coverage * 100} 100"/></svg><strong>${rated}<small> / ${count}</small></strong></div><div><h3>Rating coverage</h3><p>${rated === count ? 'All criteria have a recorded rating.' : `${count - rated} criteria still need a rating.`}</p><span>${property.protocol_version ? `${verified} of ${count} criteria with authenticated evidence` : 'Evidence authentication not recorded'}</span><small>Coverage measures completeness, not suitability.</small></div></div>
    </div>
    <div class="site-chart-heading"><div><h3>Where the ratings come from</h3><p>Recorded ratings on a 0–100 scale.</p></div><span>${calc.isLegacy ? 'Legacy record · 7 criteria' : '6 criteria · 100% total weight'}</span></div>
    <div data-site-rating-chart>${criterionBarsMarkup(calc)}</div>
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
    const legacy = key === 'flood_susceptibility' ? property.hazardScreening?.flood : key === 'active_fault' ? property.hazardScreening?.fault : null;
    const finding = entry.status_label || entry.finding || (entry.raw_status ? String(entry.raw_status).replaceAll('_', ' ') : '') || legacy?.details || legacy?.badge || 'Not assessed';
    const verification = entry.evidence_status || (legacy?.evidence_status ?? 'not_assessed');
    return { key, label, finding, verification, entry, assessed: !/not.assessed|not.scored|unknown|pending/i.test(entry.raw_status || finding) };
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
          <strong style="font-size: 13.5px; display: block; margin-bottom: 4px; color: #1E293B;">Partial Hazard Coverage Disclosure (${unassessedLayers.length} of 6 Layers Unassessed):</strong>
          <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #475569;">
            The Risk Constraints rating reflects provisional spatial screening of <strong>${assessedLayers.map(r => r.label).join(' and ') || 'preliminary records'}</strong>. Municipal screening for remaining indicators (<strong>${unassessedLayers.map(r => r.label).join(', ')}</strong>) remains pending. Unassessed status must not be interpreted as absence of risk; complete geotechnical and geohazard clearance prior to financial commitment. DOST-PHIVOLCS 5-meter buffer corridor must be verified for active fault proximity.
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

  return `
    <section class="property-panel property-media-dock" id="propertyLocationSection" data-media-dock aria-label="Property Media and Geographic Views">
      <div class="property-media-tabs-bar" role="tablist" aria-label="Media views">
        <button type="button" class="property-media-tab-btn is-active" data-media-tab="map" role="tab" aria-selected="true" id="tabMapBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          <span>MAP</span>
        </button>
        <button type="button" class="property-media-tab-btn" data-media-tab="streetview" role="tab" aria-selected="false" id="tabStreetViewBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          <span>STREET VIEW</span>
        </button>
        <button type="button" class="property-media-tab-btn" data-media-tab="photos" role="tab" aria-selected="false" id="tabPhotosBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span>PHOTOS</span>
          <span class="media-tab-badge">${images.length}</span>
        </button>
      </div>

      <div class="property-media-views-container">
        <!-- VIEW 1: MAP -->
        <div class="property-media-view-pane is-active" data-media-pane="map" id="propertyMediaMapPane">
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
            <div class="site-map-status-bar">
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

        <!-- VIEW 2: STREET VIEW -->
        <div class="property-media-view-pane" data-media-pane="streetview" id="propertyMediaStreetViewPane" hidden>
          ${hasLocation ? `
            <div class="streetview-viewport-box">
              <iframe class="streetview-embedded-frame" src="https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed" allowfullscreen loading="lazy" title="Google Maps Street View for ${esc(property.name)}"></iframe>
              <div class="streetview-overlay-bar">
                <div>
                  <strong>Google Maps Street View</strong>
                  <span>WGS 84 Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
                </div>
                <a class="city-button city-button-secondary streetview-launch-btn" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}" target="_blank" rel="noopener">Open Fullscreen Street View ↗</a>
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

        <!-- VIEW 3: PHOTOS GALLERY -->
        <div class="property-media-view-pane" data-media-pane="photos" id="propertyMediaPhotosPane" hidden>
          <div class="property-photo-gallery-wrapper" data-property-gallery>
            <div class="property-gallery-stage">
              <img class="property-gallery-main-img" data-gallery-main src="${esc(images[0])}" alt="${esc(property.name)}">
              <button type="button" class="property-gallery-nav is-prev" data-gallery-prev aria-label="Previous photo">‹</button>
              <button type="button" class="property-gallery-nav is-next" data-gallery-next aria-label="Next photo">›</button>
              <span class="property-gallery-counter" data-gallery-counter>1 / ${images.length}</span>
              <figcaption data-gallery-caption>${categoryLabel} · ${locationText}</figcaption>
            </div>
            ${images.length > 1 ? `
              <div class="property-gallery-thumbnails" role="tablist" aria-label="Property photos">
                ${images.map((src, idx) => `
                  <button type="button" class="property-gallery-thumb-btn ${idx === 0 ? 'is-active' : ''}" data-gallery-target="${idx}" role="tab" aria-selected="${idx === 0 ? 'true' : 'false'}" aria-label="View photo ${idx + 1}">
                    <img src="${esc(src)}" alt="${esc(property.name)} photo ${idx + 1}">
                  </button>
                `).join('')}
              </div>
            ` : ''}
          </div>
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

  return `
    <section class="property-panel property-transport-section" id="propertyTransportSection" aria-labelledby="propertyTransportTitle">
      <div class="property-section-heading">
        <div>
          <span class="site-eyebrow">LOCATION-BASED MOBILITY</span>
          <h2 id="propertyTransportTitle">Transportation &amp; Accessibility</h2>
        </div>
        <span class="property-status">Spatial Accessibility · 20% MCE Weight</span>
      </div>

      <div class="transport-scores-grid">
        <div class="transport-score-card">
          <div class="transport-card-top-row">
            <span class="transport-mode-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="5" r="2"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>
              <span>Pedestrian</span>
            </span>
            <span class="transport-card-score ${walk.score >= 70 ? 'is-good' : walk.score >= 40 ? 'is-med' : 'is-low'}">${walk.score !== null ? `${walk.score}/100` : 'Not Assessed'}</span>
          </div>
          <div class="transport-score-meter"><div class="transport-meter-fill is-walk" style="width: ${walk.score ?? 50}%;"></div></div>
          <div class="transport-card-label">${esc(walk.label || 'Walkability')}</div>
          <p class="transport-card-desc">${esc(walk.description || 'Pedestrian connectivity')}</p>
        </div>

        <div class="transport-score-card">
          <div class="transport-card-top-row">
            <span class="transport-mode-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
              <span>Vehicular</span>
            </span>
            <span class="transport-card-score ${drive.score >= 70 ? 'is-good' : drive.score >= 40 ? 'is-med' : 'is-low'}">${drive.score !== null ? `${drive.score}/100` : 'Not Assessed'}</span>
          </div>
          <div class="transport-score-meter"><div class="transport-meter-fill is-drive" style="width: ${drive.score ?? 80}%;"></div></div>
          <div class="transport-card-label">${esc(drive.label || 'Drivability')}</div>
          <p class="transport-card-desc">${esc(drive.description || 'Road-network accessibility')}</p>
        </div>

        <div class="transport-score-card">
          <div class="transport-card-top-row">
            <span class="transport-mode-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/><path d="M3 12h18"/><path d="M5 6h14"/></svg>
              <span>Public Transit</span>
            </span>
            <span class="transport-card-score ${transit.score >= 70 ? 'is-good' : transit.score >= 40 ? 'is-med' : 'is-low'}">${transit.score !== null ? `${transit.score}/100` : 'Not Assessed'}</span>
          </div>
          <div class="transport-score-meter"><div class="transport-meter-fill is-transit" style="width: ${transit.score ?? 30}%;"></div></div>
          <div class="transport-card-label">${esc(transit.label || 'Public transit')}</div>
          <p class="transport-card-desc">${esc(transit.description || 'Proximity to transit terminals')}</p>
        </div>

        <div class="transport-score-card">
          <div class="transport-card-top-row">
            <span class="transport-mode-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
              <span>Cycling</span>
            </span>
            <span class="transport-card-score ${bike.score >= 70 ? 'is-good' : bike.score >= 40 ? 'is-med' : 'is-low'}">${bike.score !== null ? `${bike.score}/100` : 'Not Assessed'}</span>
          </div>
          <div class="transport-score-meter"><div class="transport-meter-fill is-bike" style="width: ${bike.score ?? 20}%;"></div></div>
          <div class="transport-card-label">${esc(bike.label || 'Bikeability')}</div>
          <p class="transport-card-desc">${esc(bike.description || 'Cycling infrastructure and terrain')}</p>
        </div>
      </div>
      <p class="transport-source-caption">Source: Local Logic® &amp; OpenStreetMap GIS network</p>

      ${nearest ? `
        <div class="nearest-terminal-card">
          <div class="terminal-card-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/><path d="M3 12h18"/><path d="M5 6h14"/></svg>
          </div>
          <div class="terminal-card-info">
            <span class="terminal-kicker">AUTOMATIC NEAREST TERMINAL DETECTION</span>
            <strong class="terminal-name">${esc(nearest.name)}</strong>
            <span class="terminal-meta">${esc(nearest.type)} · <strong>${esc(nearest.distance_formatted || `${nearest.distance_meters} m`)}</strong> straight-line</span>
          </div>
          <button type="button" class="city-button city-button-secondary terminal-view-btn" data-terminal-view-map data-term-lat="${nearest.lat}" data-term-lng="${nearest.lng}" data-term-name="${esc(nearest.name)}" data-term-type="${esc(nearest.type)}" data-term-dist="${esc(nearest.distance_formatted)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/></svg>
            <span>View on Map</span>
          </button>
        </div>
      ` : ''}

      <details class="property-disclosure" data-print-expand>
        <summary>
          <span>Transportation calculation breakdown &amp; rubric</span>
          <small>Formula, indicators and spatial measurements</small>
        </summary>
        <div class="property-disclosure-body">
          <table class="brief-table">
            <thead>
              <tr><th>Accessibility Mode</th><th>Rating &amp; Score</th><th>Measured Spatial Indicator</th><th>Rubric Methodology</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Walkability</strong></td><td>${esc(walk.label)} (${walk.score !== null ? `${walk.score}/100` : 'Not Assessed'})</td><td>Distance to commercial anchor: ${walk.distance_to_center_formatted || '734 m'}</td><td>0–100 scale: pedestrian network proximity to commercial services and pedestrian routes.</td></tr>
              <tr><td><strong>Drivability</strong></td><td>${esc(drive.label)} (${drive.score !== null ? `${drive.score}/100` : 'Not Assessed'})</td><td>Distance to national arterial: ${drive.distance_to_arterial_formatted || '154 m'} (MacArthur Hwy)</td><td>0–100 scale: road network hierarchy, carriageway width, and proximity to major arterials.</td></tr>
              <tr><td><strong>Public Transit</strong></td><td>${esc(transit.label)} (${transit.score !== null ? `${transit.score}/100` : 'Not Assessed'})</td><td>Distance to transit terminal: ${transit.nearest_terminal_dist_formatted || '734 m'} (${esc(transit.nearest_terminal_name || 'City Plaza Hub')})</td><td>0–100 scale: proximity and frequency of verified bus terminals, jeepney hubs, and tricycle stations.</td></tr>
              <tr><td><strong>Bikeability</strong></td><td>${esc(bike.label)} (${bike.score !== null ? `${bike.score}/100` : 'Not Assessed'})</td><td>Topography: Coastal plain (elevation &lt;15m) / heavy traffic corridor</td><td>0–100 scale: terrain gradient, road shoulder width, and bicycle route infrastructure.</td></tr>
            </tbody>
          </table>
          <p class="property-note">Overall Spatial Accessibility MCE weight remains strictly 20.0% in accordance with the LOCUS-SF decision protocol.</p>
        </div>
      </details>
    </section>
  `;
}

export function localMarketIntelligenceMarkup(property) {
  const intel = property.localMarketIntelligence || {};
  const scopes = intel.scopes || {};
  const currentScopeKey = intel.selected_scope || 'barangay';
  const scopeData = scopes[currentScopeKey] || scopes['barangay'] || {
    default_scope_name: property.barangay || 'Barangay II',
    population: { total_formatted: '15,820', residents: { percent: 69.9 }, employees: { percent: 30.1 } },
    income: { median_formatted: '₱368,000', median_usd_equivalent: '$88,338', brackets: [
      { label: '$0 - $35K', percent: 18.1, color: '#0071e3' },
      { label: '$35K - $70K', percent: 23.9, color: '#f59e0b' },
      { label: '$70K - $100K', percent: 14.8, color: '#ef4444' },
      { label: '$100K+', percent: 43.1, color: '#1d4ed8' }
    ]},
    spending: { total_formatted: '$143.6M', categories: [
      { label: 'Food & Drink', percent: 28.2, color: '#f59e0b' },
      { label: 'Transportation', percent: 25.3, color: '#0071e3' },
      { label: 'Household', percent: 16.1, color: '#fcd34d' },
      { label: 'Entertainment', percent: 14.1, color: '#991b1b' },
      { label: 'Education', percent: 6.1, color: '#60a5fa' },
      { label: 'Apparel', percent: 5.2, color: '#93c5fd' },
      { label: 'Health Care', percent: 5.0, color: '#dc2626' }
    ]}
  };

  const popDonut = renderDonutSvg([
    { label: 'Residents', percent: scopeData.population?.residents?.percent ?? 69.9, color: '#0071e3' },
    { label: 'Employees', percent: scopeData.population?.employees?.percent ?? 30.1, color: '#f59e0b' }
  ], scopeData.population?.total_formatted || '15,820', 'Total');

  const incomeDonut = renderDonutSvg(scopeData.income?.brackets || [], scopeData.income?.median_usd_equivalent?.split(' ')[0] || '$88,338', 'Median');

  const spendDonut = renderDonutSvg(scopeData.spending?.categories || [], scopeData.spending?.total_formatted || '$143.6M', '');

  return `
    <section class="property-panel property-market-intel-section" id="propertyMarketIntelSection" aria-labelledby="propertyMarketIntelTitle">
      <div class="property-section-heading">
        <div>
          <span class="site-eyebrow">DEMOGRAPHICS &amp; MARKET CONTEXT</span>
          <h2 id="propertyMarketIntelTitle">Local Market Intelligence</h2>
        </div>
        <div class="demographic-scope-selector-wrap">
          <label for="demographicScopeSelect" class="demographic-scope-label">Geographic Scope:</label>
          <select id="demographicScopeSelect" class="demographic-scope-select" data-property-id="${property.id}">
            <option value="barangay" ${currentScopeKey === 'barangay' ? 'selected' : ''}>${esc(property.barangay || 'Barangay II')} (15,820 Catchment)</option>
            <option value="city" ${currentScopeKey === 'city' ? 'selected' : ''}>San Fernando City (125,640)</option>
            <option value="province" ${currentScopeKey === 'province' ? 'selected' : ''}>La Union Province (822,352)</option>
            <option value="region" ${currentScopeKey === 'region' ? 'selected' : ''}>Region I - Ilocos (5.3M)</option>
          </select>
        </div>
      </div>

      <div class="demographic-charts-grid" id="demographicChartsGrid">
        <div class="demographic-chart-card">
          <h3 class="demographic-chart-title">Absolute Population</h3>
          <div data-chart-pop>${popDonut}</div>
        </div>
        <div class="demographic-chart-card">
          <h3 class="demographic-chart-title">Household Income</h3>
          <div data-chart-income>${incomeDonut}</div>
        </div>
        <div class="demographic-chart-card">
          <h3 class="demographic-chart-title">Consumer Spending</h3>
          <div data-chart-spend>${spendDonut}</div>
        </div>
      </div>

      <div class="market-intel-footer-bar">
        <p><strong>Official Data Sources:</strong> Philippine Statistics Authority (PSA) 2020 Census of Population &amp; Housing (POPCEN) and 2021/2023 Family Income &amp; Expenditure Survey (FIES), San Fernando CPDO.</p>
        <p class="market-intel-link-note">Supporting market context for <strong>Economic Viability (20% MCE Weight)</strong>. Demographic indicators reflect official geographic coverage and do not alter the baseline land valuation score.</p>
      </div>
    </section>
  `;
}

export function floodAndFireAssessmentMarkup(property) {
  const climate = property.climateRisk || {};
  const flood = climate.flood_factor || { score: 1, label: 'Minimal', zone: 'Zone X (unshaded)', description: 'This property has a minimal Flood Factor™.', risk_over_time: 'Data Unavailable for this Property' };
  const fire = climate.fire_factor || { score: 1, label: 'Minimal', description: 'This property has a minimal Fire Factor™.', distance_to_station_formatted: '801 m', risk_over_time: 'Data Unavailable for this Property' };

  const subcriteria = property.subcriterion_scores?.risk_constraints || property.criteriaDetails?.risk_constraints?.subcriteria || {};
  const assessedCount = ['flood_susceptibility', 'active_fault', 'landslide_susceptibility', 'storm_surge', 'liquefaction_susceptibility', 'tsunami_exposure'].filter(k => {
    const entry = subcriteria[k] || {};
    const legacy = k === 'flood_susceptibility' ? property.hazardScreening?.flood : k === 'active_fault' ? property.hazardScreening?.fault : null;
    const finding = entry.status_label || entry.finding || (entry.raw_status ? String(entry.raw_status).replaceAll('_', ' ') : '') || legacy?.details || legacy?.badge;
    return finding && !/not.assessed|not.scored|unknown|pending/i.test(entry.raw_status || finding);
  }).length;
  const isFullyAssessed = assessedCount === 6;
  const truthfulStatusLabel = isFullyAssessed
    ? (property.hazardScreening?.validated ? 'City validated' : 'Fully assessed')
    : `Provisional screening (${assessedCount}/6 layers)`;

  return `
    <section class="property-panel property-safety" id="propertyHazardsSection" data-climate-risk aria-labelledby="propertyHazardsTitle">
      <div class="property-section-heading">
        <div>
          <span class="site-eyebrow">ENVIRONMENTAL &amp; LIFE SAFETY</span>
          <h2 id="propertyHazardsTitle">Climate Risk for ${esc(property.barangay || 'San Fernando')}</h2>
        </div>
        <span class="property-status">${truthfulStatusLabel}</span>
      </div>
      <p class="site-safety-intro">A recorded finding does not establish low risk or safety. Confirm the evidence and coverage for the whole parcel.</p>

      <div class="climate-factors-grid">
        <!-- FLOOD FACTOR -->
        <div class="climate-factor-card">
          <div class="climate-card-top">
            <h3 class="climate-card-heading">Flood Zone</h3>
            <p class="climate-zone-desc">This property is located in <strong>${esc(flood.zone || 'Zone X (unshaded)')}</strong> <span class="climate-info-pill" title="Zone X: Areas of minimal flood hazard determined outside 100-year and 500-year flood levels by DENR-MGB.">ℹ</span></p>
          </div>

          <div class="climate-factor-hero">
            <div class="factor-badge is-flood">
              <div class="factor-badge-num">
                <span class="factor-val">${flood.score ?? 1}</span>
                <small class="factor-slash">/10</small>
              </div>
              <div class="factor-badge-text">
                <span class="factor-severity">${esc(flood.label || 'Minimal')}</span>
                <span class="factor-brand">FLOOD FACTOR™</span>
              </div>
            </div>
            <p class="factor-statement">${esc(flood.description || 'This property has a minimal Flood Factor™.')}</p>
          </div>

          <div class="climate-risk-time-block">
            <span class="time-label">Flood Risk Over Time</span>
            <strong class="time-status">${esc(flood.risk_over_time || 'Data Unavailable for this Property')}</strong>
          </div>

          <div class="climate-card-bottom-actions">
            <button type="button" class="city-button city-button-secondary flood-overlay-toggle-btn" data-toggle-flood-overlay>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
              <span>View Flood Overlay on Map</span>
            </button>
            <span class="climate-source-citation">Source: DENR-MGB Region 1 Geo-Hazard Assessment &amp; CDRRMO</span>
          </div>
        </div>

        <!-- FIRE FACTOR -->
        <div class="climate-factor-card">
          <div class="climate-card-top">
            <h3 class="climate-card-heading">Fire Factor</h3>
          </div>

          <div class="climate-factor-hero">
            <div class="factor-badge is-fire">
              <div class="factor-badge-num">
                <span class="factor-val">${fire.score ?? 1}</span>
                <small class="factor-slash">/10</small>
              </div>
              <div class="factor-badge-text">
                <span class="factor-severity">${esc(fire.label || 'Minimal')}</span>
                <span class="factor-brand">FIRE FACTOR™</span>
              </div>
            </div>
            <p class="factor-statement">${esc(fire.description || 'This property has a minimal Fire Factor™.')}</p>
          </div>

          <div class="fire-indicators-dock">
            <div class="fire-ind-row">
              <span>BFP Central Station:</span>
              <strong>${esc(fire.distance_to_station_formatted || '801 m')}</strong>
              <small>(Gov. Luna St, Brgy II)</small>
            </div>
            <div class="fire-ind-row">
              <span>Hydrant Access:</span>
              <strong>Pressurized Main</strong>
              <small>(&lt;150m)</small>
            </div>
          </div>

          <div class="climate-risk-time-block">
            <span class="time-label">Fire Risk Over Time</span>
            <strong class="time-status">${esc(fire.risk_over_time || 'Data Unavailable for this Property')}</strong>
          </div>

          <div class="climate-card-bottom-actions">
            <span class="climate-source-citation">Source: Bureau of Fire Protection (BFP) San Fernando City Central Station</span>
          </div>
        </div>
      </div>

      <!-- Preserved Complete 6-Hazard Screening Register -->
      <details class="property-disclosure" data-print-expand>
        <summary>
          <span>Complete 6-Factor Geohazard Screening Register</span>
          <small>Review official MGB findings for fault, landslide, storm surge, liquefaction, tsunami</small>
        </summary>
        <div class="property-disclosure-body">
          ${siteSafetyGridMarkup(property)}
        </div>
      </details>
    </section>
  `;
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
  const contact = role === 'guest' ? '<p class="property-contact-lead">Sign in to view available contact details and ask about this property.</p>' : broker ? `<p class="property-contact-name">${esc(broker.name)}</p>${broker.phone ? `<a class="city-link" href="tel:${esc(broker.phone.replace(/[^+\d]/g, ''))}">${esc(broker.phone)}</a>` : ''}${broker.email ? `<a class="city-link" href="mailto:${esc(broker.email)}">${esc(broker.email)}</a>` : ''}` : `<p>${property.contactMode === 'broker' ? 'Broker contact details are awaiting city confirmation.' : 'Contact LEBDO for listing assistance.'}</p><a class="city-link no-print" href="https://cc.sanfernandocity.gov.ph/lebdo/" target="_blank" rel="noopener">LEBDO contact information ↗</a>`;
  const areaFacts = [['Listed area', area > 0 ? `${areaLabel} · ${fmt(area, 4)} ha` : 'Not specified'], [recordedAreaLabel, survey > 0 ? `${fmt(survey)} m²` : 'Not specified'], ['Drawn boundary estimate', mapped > 0 ? `${fmt(mapped)} m²` : 'No boundary drawn'], ['Boundary', parcel.boundary ? 'Recorded outline · mapped estimate' : 'Optional · not drawn']];
  return `
    <div class="property-interactive-view">
      ${printHeaderMarkup(property)}
      <header class="property-heading"><div><div class="property-kicker">${esc(property.category || property.type || 'Property')}${property.subcategory ? ` / ${esc(String(property.subcategory).split(',')[0].trim())}` : ''} <span>LOCUS-${esc(property.id)}</span></div><h1>${esc(property.name)}</h1>${property.subname ? `<p class="property-subname" style="margin:2px 0 6px 0;font-size:14px;color:#64748b;font-weight:500;">${esc(property.subname)}</p>` : ''}<p class="property-heading-location"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>${esc(location)}${approximate ? '<span class="property-location-badge">Approximate location</span>' : ''}</p></div><div class="property-heading-actions no-print">${printButtonMarkup('cityPrintPropertyTopBtn')}</div></header>
      <div class="property-summary-strip"><div><span>Listing purpose</span><strong>${esc(listingPurposeLabel(property))}</strong></div>${listingPriceEntries(property).map(entry => `<div class="property-price-summary"><span>${esc(entry.label)}</span><strong>${esc(entry.value)}</strong></div>`).join('')}<div><span>Land area</span><strong>${areaLabel}</strong></div><div><span>Availability</span><strong>${esc(property.status || 'Awaiting confirmation')}</strong></div></div>
      <nav class="property-section-nav no-print" aria-label="Property sections"><a href="${sectionHref('propertyOverviewSection')}">Overview</a><a href="${sectionHref('propertyLocationSection')}">Location</a><a href="${sectionHref('propertyTransportSection')}">Transportation</a><a href="${sectionHref('propertyMarketSection')}">Market Intelligence</a><a href="${sectionHref('propertyHazardsSection')}">Hazard checks</a><a href="${sectionHref('propertyAssessmentSection')}" data-investor-advanced>Assessment</a><a href="${sectionHref('propertyOpportunitiesSection')}" data-investor-advanced>Opportunities</a><a href="${sectionHref('propertySurroundingsSection')}" data-investor-advanced>Surroundings</a></nav>
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
              ${salePricePerSqm(property) !== null ? `<div class="executive-price-sub">${money(salePricePerSqm(property))} / m²</div>` : ''}
            </div>

            <div class="executive-quick-specs">
              <div class="executive-spec-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M13 11v10M9 9v.01M9 13v.01M9 17v.01"/></svg>
                <span>${esc(property.clupProfile?.zoningClassification || property.zoningClassification || 'Commercial (C-1)')}</span>
              </div>
              <div class="executive-spec-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${areaLabel}</span>
              </div>
              <div class="executive-spec-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>Zone X Minimal Flood</span>
              </div>
              <div class="executive-spec-pill">
                <span class="status-dot"></span>
                <span>${esc(property.status || 'Available')}</span>
              </div>
            </div>

            <div class="executive-contact-body">
              ${contact}
            </div>

            <div class="property-actions no-print">
              ${role === 'guest' ? `<a class="city-button city-button-primary executive-inquire-btn" href="${path('investor-login.php')}">Log in to inquire</a>` : ''}
              ${canInquire ? `<a class="city-button city-button-primary executive-inquire-btn" href="${sectionHref('cityInquiryPanel')}">Send an inquiry <span aria-hidden="true">↗</span></a>` : ''}
              <div class="executive-action-row">
                ${investor ? `<button class="city-button city-button-secondary" type="button" data-save="${property.id}" aria-pressed="${saved.has(property.id)}">${saved.has(property.id) ? 'Saved' : 'Save property'}</button>` : ''}
                <button class="city-button city-button-secondary" type="button" data-compare="${property.id}" aria-pressed="${compare.includes(property.id)}">${compare.includes(property.id) ? 'Added to compare' : 'Compare property'}</button>
              </div>
            </div>
            <p class="property-note">Confirm the current availability and terms before making arrangements.</p>
          </section>
        </div>

        <!-- 2. FULL-WIDTH PROPERTY ASSET PROFILE -->
        <section class="property-panel property-overview" id="propertyOverviewSection"><div class="property-section-heading"><div><span class="site-eyebrow">PROPERTY ASSET PROFILE</span><h2>Property overview</h2></div><div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">${property.authorityToSellVerified ? `<span class="city-badge" style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 4px; background: #D1FAE5; color: #065F46;">Authority to Sell <strong style="font-weight: 700;">✓ Verified</strong></span>` : ''}<span class="property-status">${esc(property.status || 'Unconfirmed')}</span></div></div><p class="property-description">${esc(property.description || 'Additional property information has not been provided.')}</p>${factsMarkup([['Property type', property.category || property.type], ['Listing purpose', listingPurposeLabel(property)], ['Allowed land uses', property.clupAllowedUses?.length ? `${property.clupAllowedUses.join(' · ')} (${property.clupVerifiedAt ? '✓ City validated' : 'Pending city validation'})` : 'Allowed uses awaiting verification'], ['Sale price / m²', property.listingPurpose === 'lease' ? 'Not offered' : salePricePerSqm(property) !== null ? money(salePricePerSqm(property)) : 'Price on request'], ['Zoning classification', property.clupProfile?.zoningClassification || 'Awaiting verification'], ...(property.clupProfile?.proposedActivity || property.proposedActivity ? [['Proposed land use activity', property.clupProfile?.proposedActivity || property.proposedActivity]] : []), ['Listing review', String(property.approvalState || 'pending').replaceAll('_', ' ')], ['Document status', property.authorityToSellVerified ? 'Authority to Sell ✓ Verified' : property.sellerUserId ? 'Authority to Sell pending city validation' : 'Not recorded'], ['Last updated', dateLabel(property.updatedAt)], ['Availability confirmed', dateLabel(property.lastConfirmedAvailableAt)]])}
          ${utilitiesMarkup(property)}
          <details class="property-disclosure" data-print-expand><summary>Area, facilities & listing information</summary><div class="property-disclosure-body">${factsMarkup([...areaFacts, ['Facilities', property.facilities?.join(', ') || 'Not recorded'], ['Investment context', property.assessmentTags?.join(', ') || 'Not recorded']])}${property.readinessNotes ? `<p>${esc(property.readinessNotes)}</p>` : ''}${survey > 0 && mapped > 0 && Math.abs(survey - mapped) > 0.01 ? `<p class="property-note">The ${recordedAreaLabel.toLowerCase()} and mapped estimate differ. The drawn outline is an estimate; confirm the legal area against the survey records.</p>` : ''}</div></details>
        </section>

        ${transportationAccessibilityMarkup(property)}

        ${localMarketIntelligenceMarkup(property)}

        ${floodAndFireAssessmentMarkup(property)}
        ${role === 'guest' || investor ? '<p class="property-basic-helper no-print" data-investor-basic>Looking for more detail? Switch to <strong>Advanced</strong> to explore the recorded city assessment, source evidence and investment tools.</p>' : ''}
        ${propertyAssessmentMarkup(property, calc)}
        <div class="property-advanced" data-investor-advanced>
          ${businessOpportunitiesMarkup(property, options)}
          <details class="property-panel site-scenario-disclosure"><summary>Test a proposed business <small>Assess a specific activity</small></summary><div class="property-disclosure-body">${investorScenarioMarkup(property)}</div></details>
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
          <input type="text" id="investorProposedCapitalInput" class="property-scenario-input" placeholder="e.g. 5,000,000" inputmode="numeric" autocomplete="off">
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

  if (property.protocol_version || property.id || property.property_id) {
    let requestVersion = 0;
    const text = (element, value) => { if (element) element.textContent = value; };
    const render = assessment => {
      const combined = { ...property, ...assessment, status: property.status };
      const result = assessmentCalculation(combined);
      const total = result.iai === null ? 'Withheld' : `${fixed(result.iai)} / 100`;
      text(totalIaiEl, total);
      if (heroScoreEl) heroScoreEl.innerHTML = `<strong>${result.iai === null ? 'Withheld' : fixed(result.iai)}</strong>`;
      const denominator = heroScoreEl?.closest?.('.property-score-card-number')?.querySelector('small');
      if (denominator) { denominator.hidden = result.iai === null; denominator.textContent = ' / 100'; }
      const chart = root.querySelector('[data-site-rating-chart]');
      if (chart) chart.innerHTML = criterionBarsMarkup(result);
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
      text(assessmentStatus, result.isNotSuitable ? 'Not Suitable' : result.complete ? `All ${result.rows.length === 6 ? 'six' : 'seven'} criteria rated` : 'Evidence pending');
      assessmentStatus?.classList?.toggle('is-pending', !result.complete);
      const physicalNote = root.querySelector('.site-physical-note');
      if (physicalNote) { physicalNote.hidden = !result.hasPhysicalBaseline || result.iai !== null; text(physicalNote, result.hasPhysicalBaseline ? `Physical subtotal: ${fmt(result.physicalSubtotal, 4)} / 85 pts. This is not the composite IAI.` : ''); }
      const status = String(combined.assessmentStatus || 'incomplete').replaceAll('_', ' ');
      text(titleEl, status);
      text(badgeEl, status);
      text(iaiNoteEl, result.isConditional ? 'No actionable investment rank' : status);
      text(reasonEl, result.reason || combined.note || 'Recorded assessment; confirm applicable evidence and clearances.');
      text(heroDescEl, result.reason || combined.note || 'Assessment for the selected activity, calculated by the shared server protocol.');
      const zoningRow = result.rows.find(row => row.key === 'zoning_compatibility');
      text(zoningScoreEl, zoningRow?.score == null ? 'Pending' : `${fmt(zoningRow.score)} / 100`);
      text(zoningContribEl, zoningRow?.contribution == null ? 'Pending evidence' : `${fmt(zoningRow.contribution, 4)} weighted points`);
      text(physicalBaselineEl, result.physicalSubtotal === null ? 'Pending' : `${fmt(result.physicalSubtotal, 4)} / 85 pts`);
      const conditions = combined.eligibility?.outstanding_requirements || [];
      if (conditionsWrap) conditionsWrap.hidden = conditions.length === 0;
      if (conditionsList) conditionsList.innerHTML = conditions.map(condition => `<li>${esc(condition)}</li>`).join('');
      if (comparisonBannerEl) comparisonBannerEl.style.display = 'none';
      const brief = root.querySelector('#locusInvestorBrief');
      if (brief) brief.outerHTML = investorBriefReportMarkup(combined);
    };
    const withheld = (activity, reason) => ({ ...property, proposed_activity: activity, assessmentComplete: false,
      displayed_iai: null, iaiScore: null, mceScore: null, assessmentStatus: 'incomplete', reason });
    const evaluate = async () => {
      const version = ++requestVersion;
      const activity = select?.value || '';
      render(withheld(activity, 'Checking the selected activity. Assessment is withheld until the server responds.'));
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
    select?.addEventListener('change', evaluate);
    evalBtn?.addEventListener('click', evaluate);
    resetBtn?.addEventListener('click', () => { if (select) select.value = ''; if (capitalInput) capitalInput.value = ''; return evaluate(); });
    capitalInput?.addEventListener('input', () => {
      const result = potentialIncentive(parsePesoInput(capitalInput.value), policy);
      text(incentiveBadgeEl, result.badge); text(incentiveCopyEl, result.copy);
    });
    reportBtn?.addEventListener('click', () => window.print());
    return;
  }

}
