import { listingPurposeLabel, listingPriceEntries, salePricePerSqm } from './utils.js';
import { businessOpportunitiesMarkup } from './business-opportunities.js';
// Property details and its printable calculation sheet share the server's recorded inputs.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const fmt = (value, digits = 2) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: digits }).format(Number(value));
const fixed = value => Number(value).toFixed(1);
const rating = value => fmt(value, 20);
const money = value => numeric(value) !== null ? `PHP ${fmt(value)}` : "Price on request";
const labels = [
  ['spatial_accessibility', 'Spatial accessibility', 20],
  ['infrastructure_readiness', 'Infrastructure readiness', 20],
  ['economic_viability', 'Economic viability', 20],
  ['nearby_businesses', 'Nearby businesses', 10],
  ['zoning_compatibility', 'Zoning compatibility', 15],
  ['risk_constraints', 'Risk constraints', 10],
  ['environmental_safety', 'Environmental safety', 5],
];

export function assessmentCalculation(property) {
  const rows = labels.map(([key, label, defaultWeight]) => {
    const value = numeric(property.assessmentCriteria?.[key]);
    const weight = numeric(property.assessmentWeights?.[key]) ?? defaultWeight;
    const score = value !== null && value >= 0 && value <= 100 ? value : null;
    return { key, label, weight, score, contribution: score === null ? null : score * weight / 100 };
  });
  const complete = property.assessmentComplete === true && rows.every(row => row.score !== null)
    && rows.reduce((sum, row) => sum + row.weight, 0) === 100;
  const mce = complete ? numeric(property.mceScore) : null;
  const iai = complete ? numeric(property.iaiScore) : null;
  const components = [
    { label: 'Rounded MCE', value: mce, weight: 60 },
    { label: 'Economic viability', value: rows.find(row => row.key === 'economic_viability').score, weight: 20 },
    { label: 'Infrastructure readiness', value: rows.find(row => row.key === 'infrastructure_readiness').score, weight: 20 },
  ].map(row => ({ ...row, contribution: mce === null || row.value === null ? null : row.value * row.weight / 100 }));
  return { rows, complete, mce, iai, components, completedCount: rows.filter(row => row.score !== null).length };
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
  return [
    ['risk_constraints', 'hazard_status', 'Hazard screening'],
    ['environmental_safety', 'environment_status', 'Environmental screening'],
  ].map(([criterion, key, label]) => {
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

function safetyMarkup(property) {
  const hs = property.hazardScreening || {};
  const flood = hs.flood || { badge: 'NOT ASSESSED', color: 'gray', details: 'Location coordinates not provided.' };
  const fault = hs.fault || { badge: 'NOT ASSESSED', color: 'gray', proximity: 'Not assessed', details: 'Screening not performed.' };
  const env = hs.environment || { badge: 'NOT ASSESSED', color: 'gray', details: 'No recorded restriction.' };
  const source = hs.source || 'City spatial dataset';
  const statusLabel = hs.status_label || (hs.validated ? 'City validated' : 'Not assessed');
  const recorded = recordedSafety(property);

  const badgeStyle = color => {
    switch (color) {
      case 'green': return 'background: #D1FAE5; color: #065F46;';
      case 'amber': return 'background: #FEF3C7; color: #92400E;';
      case 'red': return 'background: #FEE2E2; color: #991B1B;';
      default: return 'background: #F3F4F6; color: #4B5563;';
    }
  };

  return `<section class="property-panel property-safety" id="propertyHazardsSection" aria-labelledby="propertyHazardsTitle">
    <div class="property-section-heading">
      <div>
        <span class="property-kicker">HAZARD & ENVIRONMENT</span>
        <h2 id="propertyHazardsTitle">Hazard & Environmental Screening</h2>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="property-safety-label" style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 4px; background: #E0F2FE; color: #0369A1;">
          <svg viewBox="0 0 24 24" style="width: 14px; height: 14px;" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg>
          ${esc(statusLabel)}
        </span>
      </div>
    </div>
    <div class="property-safety-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin: 16px 0;">
      <div style="padding: 14px; background: #F8F9FA; border: 1px solid #E5E7EB; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #11224D; margin: 0;">Flood susceptibility</h3>
          <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; ${badgeStyle(flood.color)}">${esc(flood.badge)}</span>
        </div>
        <p style="font-size: 13px; color: #4B5563; margin: 4px 0;">${esc(flood.details)}</p>
        <small style="color: #6B7280; font-size: 11px;">Source: ${esc(flood.source || 'MGB Region 1')}</small>
      </div>
      <div style="padding: 14px; background: #F8F9FA; border: 1px solid #E5E7EB; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #11224D; margin: 0;">Fault-line screening</h3>
          <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; ${badgeStyle(fault.color)}">${esc(fault.badge)}</span>
        </div>
        <p style="font-size: 13px; color: #4B5563; margin: 4px 0;">${fault.proximity ? `<strong>${esc(fault.proximity)}</strong> from nearest mapped fault.` : esc(fault.details)}</p>
        <small style="color: #6B7280; font-size: 11px;">Source: ${esc(fault.source || 'PHIVOLCS active faults')}</small>
      </div>
      <div style="padding: 14px; background: #F8F9FA; border: 1px solid #E5E7EB; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #11224D; margin: 0;">Environmental screening</h3>
          <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; ${badgeStyle(env.color)}">${esc(env.badge)}</span>
        </div>
        <p style="font-size: 13px; color: #4B5563; margin: 4px 0;">${esc(env.details || 'No recorded restriction')}</p>
        <small style="color: #6B7280; font-size: 11px;">Source: ${esc(env.source || 'CENRO & DENR-EMB')}</small>
      </div>
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
    <p class="property-safety-limit" style="font-size: 12px; color: #6B7280; margin-top: 10px;">
      Assessment source: ${esc(source)} · Status: ${esc(statusLabel)}. Evaluated from official city spatial datasets based on submitted property coordinates.
    </p>
  </section>`;
}

function radarMarkup(calculation) {
  if (!calculation.complete) return '<p class="property-pending-note">A radar profile will appear when all seven criteria have recorded ratings. Missing evidence is not plotted as zero.</p>';
  const abbreviations = ['Access', 'Infrastructure', 'Economic', 'Businesses', 'Zoning', 'Risk', 'Environment'];
  const point = (index, radius) => {
    const angle = index * Math.PI * 2 / 7 - Math.PI / 2;
    return [180 + Math.cos(angle) * radius, 155 + Math.sin(angle) * radius];
  };
  const polygon = scale => calculation.rows.map((row, index) => point(index, 105 * scale(row)).map(value => value.toFixed(2)).join(',')).join(' ');
  return `<div class="property-radar-layout"><svg class="property-radar" viewBox="0 0 360 320" role="img" aria-label="Radar profile of the seven recorded criterion ratings. Values are listed alongside the chart.">
    ${[.25, .5, .75, 1].map(scale => `<polygon class="property-radar-grid" points="${polygon(() => scale)}"/>`).join('')}
    ${calculation.rows.map((row, index) => `<line class="property-radar-axis" x1="180" y1="155" x2="${point(index, 105)[0].toFixed(2)}" y2="${point(index, 105)[1].toFixed(2)}"/>`).join('')}
    <polygon class="property-radar-result" points="${polygon(row => row.score / 100)}"/>
    ${calculation.rows.map((row, index) => `<circle class="property-radar-point" cx="${point(index, row.score * 1.05)[0].toFixed(2)}" cy="${point(index, row.score * 1.05)[1].toFixed(2)}" r="3"/><text x="${point(index, 137)[0].toFixed(2)}" y="${point(index, 137)[1].toFixed(2)}" text-anchor="middle" dominant-baseline="middle">${abbreviations[index]}</text>`).join('')}
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
  return `<section class="property-calculation" aria-labelledby="propertyCalculationTitle">
    <h3 id="propertyCalculationTitle">MCE · Multi-Criteria Evaluation</h3>
    <p class="property-note">Each rating is on a 0–100 scale; 100 is most favorable, including risk constraints. Contribution = rating × weight ÷ 100. All seven ratings are required.</p>
    <div class="property-table-scroll"><table class="property-calculation-table"><caption>Seven criteria and their contributions to the MCE score</caption><thead><tr><th scope="col">Criterion</th><th scope="col">Rating / 100</th><th scope="col">Weight</th><th scope="col">Contribution</th></tr></thead><tbody>${calc.rows.map(row => `<tr><th scope="row">${esc(row.label)}</th><td>${value(row.score)}</td><td>${fmt(row.weight)}%</td><td>${contribution(row.contribution)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">MCE · rounded to 1 decimal</th><td>${total(calc.mce)}</td><td>100%</td><td>${calc.mce === null ? 'Pending' : fixed(calc.mce)}</td></tr></tfoot></table></div>
    <p class="property-formula">MCE = round(Σ(rating × weight ÷ 100), 1)${calc.mce === null ? '' : ` = round(${calc.rows.map(row => fmt(row.contribution, 12)).join(' + ')}, 1) = ${fixed(calc.mce)}`}</p>
    <h3>IAI · Investment Alignment Index</h3>
    <p class="property-note">IAI uses the rounded MCE and the recorded economic viability and infrastructure readiness ratings. Components are summed before rounding the final result to one decimal.</p>
    <div class="property-table-scroll"><table class="property-calculation-table"><caption>Components of the base IAI score</caption><thead><tr><th scope="col">Component</th><th scope="col">Rating / 100</th><th scope="col">Weight</th><th scope="col">Contribution</th></tr></thead><tbody>${calc.components.map(row => `<tr><th scope="row">${esc(row.label)}</th><td>${row.label === 'Rounded MCE' ? total(row.value) : value(row.value)}</td><td>${row.weight}%</td><td>${contribution(row.contribution)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Base IAI · rounded to 1 decimal</th><td>${total(calc.iai)}</td><td>100%</td><td>${total(calc.iai)}</td></tr></tfoot></table></div>
    <p class="property-formula">IAI = round((MCE × 0.60) + (economic viability × 0.20) + (infrastructure readiness × 0.20), 1)${calc.iai === null ? '' : ` = round(${calc.components.map(row => fmt(row.contribution, 12)).join(' + ')}, 1) = ${fixed(calc.iai)}`}</p>
    ${calc.mce === null || calc.iai === null ? `<p class="property-pending-note">Assessment pending · ${calc.completedCount} of 7 criteria have ratings. Missing evidence is not treated as zero; a total or rank is withheld until the assessment is complete.</p>` : ''}
    <p class="property-note">This sheet records the base site IAI. Any approved priority adjustment for a proposed business is a separate evaluation and is excluded from these totals.</p>
    ${property.assessmentMethod ? `<p class="property-note"><strong>Recorded method:</strong> ${esc(property.assessmentMethod)}</p>` : ''}
    ${factsMarkup([['Assessment mode', property.assessmentMode === 'automatic' ? 'Automatic · source evidence' : 'Recorded departmental assessment'], ['Evidence generated', dateLabel(property.generatedAt || property.automaticAssessment?.generatedAt)], ['Rule version', property.ruleVersion || 'Not recorded'], ['Approval reference', property.ruleApprovalReference || 'Not recorded']])}
  </section>`;
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
  return `${printHeaderMarkup(property)}
    <header class="property-heading"><div><div class="property-kicker">${esc(property.category || property.type || 'Property')}${property.subcategory ? ` / ${esc(property.subcategory)}` : ''} <span>LOCUS-${esc(property.id)}</span></div><h1>${esc(property.name)}</h1><p class="property-heading-location"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>${esc(location)}${approximate ? '<span class="property-location-badge">Approximate location</span>' : ''}</p></div><div class="property-heading-actions no-print">${printButtonMarkup('cityPrintPropertyTopBtn')}</div></header>
    <div class="property-summary-strip"><div><span>Listing purpose</span><strong>${esc(listingPurposeLabel(property))}</strong></div>${listingPriceEntries(property).map(entry => `<div class="property-price-summary"><span>${esc(entry.label)}</span><strong>${esc(entry.value)}</strong></div>`).join('')}<div><span>Land area</span><strong>${areaLabel}</strong></div><div><span>Availability</span><strong>${esc(property.status || 'Awaiting confirmation')}</strong></div></div>
    <nav class="property-section-nav no-print" aria-label="Property sections"><a href="${sectionHref('propertyOverviewSection')}">Overview</a><a href="${sectionHref('propertyLocationSection')}">Location</a><a href="${sectionHref('propertyHazardsSection')}">Hazard checks</a><a href="${sectionHref('propertyOpportunitiesSection')}" data-investor-advanced>Opportunities</a><a href="${sectionHref('propertyAssessmentSection')}" data-investor-advanced>Assessment</a><a href="${sectionHref('propertySurroundingsSection')}" data-investor-advanced>Surroundings</a></nav>
    <div class="property-layout">
      <figure class="property-photo"><img src="${esc(imageUrl(property))}" alt="${esc(property.name)}"><figcaption>${esc(property.category || property.type || 'Property')} · ${esc(property.barangay || property.city || 'San Fernando')}</figcaption></figure>
      <section class="property-panel property-contact"><span class="property-kicker">${property.contactMode === 'broker' ? 'Listing broker' : 'Listing assistance'}</span><h2>${property.contactMode === 'broker' ? 'Discuss this property' : 'Take the next step'}</h2>${contact}<div class="property-actions no-print">${role === 'guest' ? `<a class="city-button" href="${path('investor-login.php')}">Log in to inquire</a>` : ''}${canInquire ? `<a class="city-button" href="${sectionHref('cityInquiryPanel')}">Send an inquiry <span aria-hidden="true">↗</span></a>` : ''}${investor ? `<button class="city-button city-button-secondary" type="button" data-save="${property.id}" aria-pressed="${saved.has(property.id)}">${saved.has(property.id) ? 'Saved' : 'Save property'}</button>` : ''}<button class="city-button city-button-secondary" type="button" data-compare="${property.id}" aria-pressed="${compare.includes(property.id)}">${compare.includes(property.id) ? 'Added to compare' : 'Compare property'}</button></div><p class="property-note">Confirm the current availability and terms before making arrangements.</p></section>
      <section class="property-panel property-location" id="propertyLocationSection"><div class="property-section-heading"><div><span class="property-kicker">Find this property</span><h2>${locationLabel}</h2></div>${approximate ? '<span class="property-location-badge">Approximate pin</span>' : ''}</div><p>${esc(location)}</p>${hasLocation ? '<div class="city-map-canvas" id="cityPropertyMap" role="region" aria-label="Property location map"></div>' : '<p class="property-pending-note">Exact location has not been recorded. The listed area or locality does not establish a precise property position.</p>'}${hasLocation ? `<p class="property-note">${approximate ? 'This pin shows an approximate location. Confirm the property position and legal boundaries before a site visit.' : 'The recorded pin is a location reference. Confirm the property position and legal boundaries against the survey records.'}</p>` : ''}${factsMarkup([['Recorded coordinates', hasLocation ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Not specified'], ['Boundary', parcel.boundary ? 'Drawn outline · mapped estimate' : 'No boundary drawn']])}${hasLocation ? `<a class="city-link no-print" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}" target="_blank" rel="noopener">Open ${approximate ? 'approximate ' : ''}location in maps ↗</a>` : ''}</section>
      <section class="property-panel property-overview" id="propertyOverviewSection"><div class="property-section-heading"><h2>Property overview</h2><div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">${property.authorityToSellVerified ? `<span class="city-badge" style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 4px; background: #D1FAE5; color: #065F46;">Authority to Sell <strong style="font-weight: 700;">✓ Verified</strong></span>` : ''}<span class="property-status">${esc(property.status || 'Unconfirmed')}</span></div></div><p class="property-description">${esc(property.description || 'Additional property information has not been provided.')}</p>${factsMarkup([['Property type', property.category || property.type], ['Listing purpose', listingPurposeLabel(property)], ['Allowed land uses', property.clupAllowedUses?.length ? `${property.clupAllowedUses.join(' · ')} (${property.clupVerifiedAt ? '✓ City validated' : 'Pending city validation'})` : (property.clupProfile?.zoningClassification || 'Awaiting verification')], ['Sale price / m²', property.listingPurpose === 'lease' ? 'Not offered' : salePricePerSqm(property) !== null ? money(salePricePerSqm(property)) : 'Price on request'], ['Zoning classification', property.clupProfile?.zoningClassification || 'Awaiting verification'], ['Listing review', String(property.approvalState || 'pending').replaceAll('_', ' ')], ['Document status', property.authorityToSellVerified ? 'Authority to Sell ✓ Verified' : property.sellerUserId ? 'Authority to Sell pending city validation' : 'City verified listing'], ['Last updated', dateLabel(property.updatedAt)], ['Availability confirmed', dateLabel(property.lastConfirmedAvailableAt)]])}
        ${utilitiesMarkup(property)}
        <details class="property-disclosure" data-print-expand><summary>Area, facilities & listing information</summary><div class="property-disclosure-body">${factsMarkup([...areaFacts, ['Facilities', property.facilities?.join(', ') || 'Not recorded'], ['Investment context', property.assessmentTags?.join(', ') || 'Not recorded']])}${property.readinessNotes ? `<p>${esc(property.readinessNotes)}</p>` : ''}${survey > 0 && mapped > 0 && Math.abs(survey - mapped) > 0.01 ? `<p class="property-note">The ${recordedAreaLabel.toLowerCase()} and mapped estimate differ. The drawn outline is an estimate; confirm the legal area against the survey records.</p>` : ''}</div></details>
      </section>
      ${safetyMarkup(property)}
      ${role === 'guest' || investor ? '<p class="property-basic-helper no-print" data-investor-basic>Looking for more detail? Switch to <strong>Advanced</strong> to explore the recorded city assessment, source evidence and investment tools.</p>' : ''}
      <div class="property-advanced" data-investor-advanced>
        ${businessOpportunitiesMarkup(property, options)}
        <section class="property-panel property-assessment" id="propertyAssessmentSection" aria-labelledby="propertyAssessmentTitle">
          <div class="property-assessment-header-bar">
            <div>
              <p class="property-assessment-breadcrumbs">Properties <span aria-hidden="true">/</span> Assessment</p>
              <h2 id="propertyAssessmentTitle" class="property-assessment-title">Understand this property’s scores</h2>
              <p class="property-assessment-subtitle">A clear overview of the ratings behind the assessment.</p>
            </div>
            <div class="property-assessment-badge-wrap no-print">
              <span class="property-status ${calc.complete ? '' : 'is-pending'}">${calc.complete ? 'All seven criteria rated' : 'Evidence pending'}</span>
            </div>
          </div>

          <div class="property-assessment-subnav no-print" role="tablist" aria-label="Assessment views">
            <button type="button" class="property-assessment-tab-link is-active" data-assessment-tab="overview" role="tab" aria-selected="true">Overview</button>
            <button type="button" class="property-assessment-tab-link" data-assessment-tab="calculation" role="tab" aria-selected="false">Calculation</button>
            <button type="button" class="property-assessment-tab-link" data-assessment-tab="evidence" role="tab" aria-selected="false">Evidence</button>
          </div>

          <div class="property-score-summary">
            <div class="property-score-card property-score-card-iai">
              <div class="property-score-card-kicker">
                <span>IAI</span>
                <button type="button" class="locus-criterion-help-btn" data-locus-help-trigger data-locus-help-tab="scores" data-locus-help-target="iai" aria-label="Help: What is IAI?" title="What is IAI?">?</button>
              </div>
              <h3 class="property-score-card-heading">Investment Alignment Index</h3>
              <div class="property-score-card-number">
                <strong>${calc.iai === null ? 'Pending' : fixed(calc.iai)}</strong>
                ${calc.iai !== null ? '<small> / 100</small>' : ''}
              </div>
              <p class="property-score-card-desc">Uses MCE with added economic and infrastructure emphasis.</p>
              <button type="button" class="property-score-card-action locus-trigger-calculation" data-open-calculation>How is this calculated? &rarr;</button>
            </div>

            <div class="property-score-card property-score-card-mce">
              <div class="property-score-card-kicker">
                <span>MCE</span>
                <button type="button" class="locus-criterion-help-btn" data-locus-help-trigger data-locus-help-tab="scores" data-locus-help-target="mce" aria-label="Help: What is MCE?" title="What is MCE?">?</button>
              </div>
              <h3 class="property-score-card-heading">Multi-Criteria Evaluation</h3>
              <div class="property-score-card-number">
                <strong>${calc.mce === null ? 'Pending' : fixed(calc.mce)}</strong>
                ${calc.mce !== null ? '<small> / 100</small>' : ''}
              </div>
              <p class="property-score-card-desc">Weighted assessment across seven criteria.</p>
              <button type="button" class="property-score-card-action locus-trigger-criteria" data-locus-help-trigger data-locus-help-tab="criteria">Explore the criteria &rarr;</button>
            </div>
          </div>

          <div class="property-criterion-ratings-card">
            <div class="property-criterion-ratings-header">
              <h3>Criterion ratings</h3>
              <p>Unweighted ratings · Higher is more favorable</p>
            </div>
            <ul class="property-criterion-ratings-list" role="list">
              ${calc.rows.map(row => `
                <li class="property-criterion-rating-item">
                  <div class="property-criterion-row-top">
                    <div class="property-criterion-label-wrap">
                      <span class="property-criterion-name">${esc(row.label)}</span>
                      <button type="button" class="locus-criterion-help-btn" data-help-criterion="${esc(row.key)}" aria-label="Help: ${esc(row.label)}" title="Learn more about ${esc(row.label)}">?</button>
                    </div>
                    <div class="property-criterion-score-wrap">
                      <strong>${row.score === null ? 'Pending' : rating(row.score)}</strong>
                      <span>/ 100</span>
                    </div>
                  </div>
                  <div class="property-criterion-bar-track" aria-hidden="true">
                    <div class="property-criterion-bar-fill" style="width: ${row.score !== null ? Math.min(100, Math.max(0, row.score)) : 0}%;"></div>
                  </div>
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
        <details class="property-panel property-investment no-print"><summary>Evaluate your proposed investment <span>Business type, available matches & incentives</span></summary><div class="property-disclosure-body">${evaluationMarkup(property, policy)}</div></details>
      </div>
      ${canInquire || investor ? `<div class="property-followup no-print">${canInquire ? '<details class="city-detail-panel property-panel" id="cityInquiryPanel"><summary>Send an inquiry</summary><div id="cityConversation"></div><form id="cityInquiryForm" class="city-field"><label for="cityInquiryText">Message</label><textarea id="cityInquiryText" required maxlength="4000" rows="4" placeholder="Ask about this property"></textarea><button class="city-button" type="submit">Send message</button></form></details>' : ''}${investor ? `<div class="property-investor-tools">${investorTools(property, Boolean(canInquire))}</div>` : ''}</div>` : ''}
    </div>${printFooterMarkup(property)}`;
}

export function setupPropertyDetailsPrint(root) {
  let previous = null;
  const expand = () => {
    if (previous) return;
    previous = [...root.querySelectorAll('details[data-print-expand]')].map(detail => [detail, detail.open]);
    previous.forEach(([detail]) => { detail.open = true; });
  };
  const restore = () => {
    if (!previous) return;
    previous.forEach(([detail, open]) => { detail.open = open; });
    previous = null;
  };
  window.addEventListener('beforeprint', expand);
  window.addEventListener('afterprint', restore);
  return { expand, restore };
}
