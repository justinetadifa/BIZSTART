import { listingPurposeLabel, listingPriceEntries, salePricePerSqm } from './utils.js';
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

export function propertyHazardSummary(property) {
  return recordedSafety(property).map(item => `${item.label}: ${item.values.length ? item.values.join(', ') : 'Not assessed'}${item.values.length && item.missing.length ? ' (review incomplete)' : ''}`).join(' · ');
}

export function propertyLocationLabel(property) {
  const precision = String(property.locationPrecision ?? property.parcel?.locationPrecision ?? property.parcel?.coordinatePrecision ?? '').toLowerCase();
  return property.hasExactLocation === false || ['approximate', 'approx', 'generalized'].includes(precision) ? 'Approximate location' : 'Recorded location';
}

function safetyMarkup(property) {
  return `<section class="property-panel property-safety" id="propertyHazardsSection" aria-labelledby="propertyHazardsTitle">
    <div class="property-section-heading"><div><span class="property-kicker">Before you decide</span><h2 id="propertyHazardsTitle">Hazards & environmental checks</h2></div><span class="property-safety-label">Review recorded evidence</span></div>
    <div class="property-safety-grid">${recordedSafety(property).map(item => `<div><h3>${item.label}</h3><p class="property-safety-result">${item.values.length ? item.values.map(esc).join(', ') : 'Not assessed'}</p>${item.missing.length ? `<ul class="property-safety-missing">${item.missing.map(value => `<li>${esc(value)}</li>`).join('')}</ul>` : !item.values.length ? '<p>Verified classification and source coverage are not available in this listing.</p>' : ''}<p class="property-note">${item.evidence.length ? item.evidence.map(source => `${esc(source.source || source.layer || 'Recorded source')}${source.reference ? ` · ${esc(source.reference)}` : ''}${source.verifiedAt ? ` · verified ${esc(dateLabel(source.verifiedAt))}` : ''}`).join('<br>') : 'Source reference not recorded.'}</p></div>`).join('')}</div>
    <p class="property-safety-limit">Recorded findings do not certify safety. Confirm current conditions, source coverage and legal boundaries with the responsible office. Point screening does not establish parcel-wide hazard clearance.</p>
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
  const contact = role === 'guest' ? '<p>Sign in to view available contact details and ask about this property.</p>' : broker ? `<p class="property-contact-name">${esc(broker.name)}</p>${broker.phone ? `<a class="city-link" href="tel:${esc(broker.phone.replace(/[^+\d]/g, ''))}">${esc(broker.phone)}</a>` : ''}${broker.email ? `<a class="city-link" href="mailto:${esc(broker.email)}">${esc(broker.email)}</a>` : ''}` : `<p>${property.contactMode === 'broker' ? 'Broker contact details are awaiting city confirmation.' : 'Contact LEBDO for listing assistance.'}</p><a class="city-link no-print" href="https://cc.sanfernandocity.gov.ph/lebdo/" target="_blank" rel="noopener">LEBDO contact information ↗</a>`;
  const areaFacts = [['Listed area', area > 0 ? `${areaLabel} · ${fmt(area, 4)} ha` : 'Not specified'], [recordedAreaLabel, survey > 0 ? `${fmt(survey)} m²` : 'Not specified'], ['Drawn boundary estimate', mapped > 0 ? `${fmt(mapped)} m²` : 'No boundary drawn'], ['Boundary', parcel.boundary ? 'Recorded outline · mapped estimate' : 'Optional · not drawn']];
  return `${printHeaderMarkup(property)}
    <header class="property-heading"><div><div class="property-kicker">${esc(property.category || property.type || 'Property')}${property.subcategory ? ` / ${esc(property.subcategory)}` : ''} <span>LOCUS-${esc(property.id)}</span></div><h1>${esc(property.name)}</h1><p class="property-heading-location"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>${esc(location)}${approximate ? '<span class="property-location-badge">Approximate location</span>' : ''}</p></div><div class="property-heading-actions no-print">${printButtonMarkup('cityPrintPropertyTopBtn')}</div></header>
    <div class="property-summary-strip"><div><span>Listing purpose</span><strong>${esc(listingPurposeLabel(property))}</strong></div>${listingPriceEntries(property).map(entry => `<div class="property-price-summary"><span>${esc(entry.label)}</span><strong>${esc(entry.value)}</strong></div>`).join('')}<div><span>Land area</span><strong>${areaLabel}</strong></div><div><span>Availability</span><strong>${esc(property.status || 'Awaiting confirmation')}</strong></div></div>
    <nav class="property-section-nav no-print" aria-label="Property sections"><a href="${sectionHref('propertyOverviewSection')}">Overview</a><a href="${sectionHref('propertyLocationSection')}">Location</a><a href="${sectionHref('propertyHazardsSection')}">Hazard checks</a><a href="${sectionHref('propertyAssessmentSection')}" data-investor-advanced>Assessment</a><a href="${sectionHref('propertySurroundingsSection')}" data-investor-advanced>Surroundings</a></nav>
    <div class="property-layout">
      <figure class="property-photo"><img src="${esc(imageUrl(property))}" alt="${esc(property.name)}"><figcaption>${esc(property.category || property.type || 'Property')} · ${esc(property.barangay || property.city || 'San Fernando')}</figcaption></figure>
      <section class="property-panel property-contact"><span class="property-kicker">${property.contactMode === 'broker' ? 'Listing broker' : 'Listing assistance'}</span><h2>${property.contactMode === 'broker' ? 'Discuss this property' : 'Take the next step'}</h2>${contact}<div class="property-actions no-print">${role === 'guest' ? `<a class="city-button" href="${path('investor-login.php')}">Log in to inquire</a>` : ''}${canInquire ? `<a class="city-button" href="${sectionHref('cityInquiryPanel')}">Send an inquiry <span aria-hidden="true">↗</span></a>` : ''}${investor ? `<button class="city-button city-button-secondary" type="button" data-save="${property.id}" aria-pressed="${saved.has(property.id)}">${saved.has(property.id) ? 'Saved' : 'Save property'}</button>` : ''}<button class="city-button city-button-secondary" type="button" data-compare="${property.id}" aria-pressed="${compare.includes(property.id)}">${compare.includes(property.id) ? 'Added to compare' : 'Compare property'}</button></div><p class="property-note">Confirm the current availability and terms before making arrangements.</p></section>
      <section class="property-panel property-location" id="propertyLocationSection"><div class="property-section-heading"><div><span class="property-kicker">Find this property</span><h2>${locationLabel}</h2></div>${approximate ? '<span class="property-location-badge">Approximate pin</span>' : ''}</div><p>${esc(location)}</p>${hasLocation ? '<div class="city-map-canvas" id="cityPropertyMap" role="region" aria-label="Property location map"></div>' : '<p class="property-pending-note">Exact location has not been recorded. The listed area or locality does not establish a precise property position.</p>'}${hasLocation ? `<p class="property-note">${approximate ? 'This pin shows an approximate location. Confirm the property position and legal boundaries before a site visit.' : 'The recorded pin is a location reference. Confirm the property position and legal boundaries against the survey records.'}</p>` : ''}${factsMarkup([['Recorded coordinates', hasLocation ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Not specified'], ['Boundary', parcel.boundary ? 'Drawn outline · mapped estimate' : 'No boundary drawn']])}${hasLocation ? `<a class="city-link no-print" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}" target="_blank" rel="noopener">Open ${approximate ? 'approximate ' : ''}location in maps ↗</a>` : ''}</section>
      <section class="property-panel property-overview" id="propertyOverviewSection"><div class="property-section-heading"><h2>Property overview</h2><span class="property-status">${esc(property.status || 'Unconfirmed')}</span></div><p class="property-description">${esc(property.description || 'Additional property information has not been provided.')}</p>${factsMarkup([['Category', [property.category, property.subcategory].filter(Boolean).join(' / ') || property.type], ['Sale price / m²', property.listingPurpose === 'lease' ? 'Not offered' : salePricePerSqm(property) !== null ? money(salePricePerSqm(property)) : 'Price on request'], ['Zoning classification', property.clupProfile?.zoningClassification || 'Awaiting verification'], ['Listing review', String(property.approvalState || 'pending').replaceAll('_', ' ')], ['Last updated', dateLabel(property.updatedAt)], ['Availability confirmed', dateLabel(property.lastConfirmedAvailableAt)]])}
        <details class="property-disclosure" data-print-expand><summary>Area, facilities & listing information</summary><div class="property-disclosure-body">${factsMarkup([...areaFacts, ['Facilities', property.facilities?.join(', ') || 'Not recorded'], ['Investment context', property.assessmentTags?.join(', ') || 'Not recorded']])}${property.readinessNotes ? `<p>${esc(property.readinessNotes)}</p>` : ''}${survey > 0 && mapped > 0 && Math.abs(survey - mapped) > 0.01 ? `<p class="property-note">The ${recordedAreaLabel.toLowerCase()} and mapped estimate differ. The drawn outline is an estimate; confirm the legal area against the survey records.</p>` : ''}</div></details>
      </section>
      ${safetyMarkup(property)}
      ${role === 'guest' || investor ? '<p class="property-basic-helper no-print" data-investor-basic>Looking for more detail? Switch to <strong>Advanced</strong> to explore the recorded city assessment, source evidence and investment tools.</p>' : ''}
      <div class="property-advanced" data-investor-advanced>
        <section class="property-panel property-assessment" id="propertyAssessmentSection"><div class="property-section-heading"><div><span class="property-kicker">Advanced · City assessment</span><h2>Understand this site's assessment</h2></div><span class="property-status ${calc.complete ? '' : 'is-pending'}">${calc.complete ? 'All seven criteria rated' : 'Evidence pending'}</span></div><div class="property-score-summary"><div><span>MCE <small>Multi-Criteria Evaluation</small></span><strong>${calc.mce === null ? 'Pending' : fixed(calc.mce)}${calc.mce === null ? '' : '<small> / 100</small>'}</strong></div><div><span>IAI <small>Investment Alignment Index</small></span><strong>${calc.iai === null ? 'Pending' : fixed(calc.iai)}${calc.iai === null ? '' : '<small> / 100</small>'}</strong></div></div><p class="property-note">${calc.complete ? 'MCE combines seven weighted site ratings. IAI combines the rounded MCE with economic viability and infrastructure readiness. These are decision-support scores, not predictions of business success.' : `${calc.completedCount} of 7 criteria have ratings. Complete source evidence is required before a total can be published. Missing ratings are not treated as zero.`}</p>
          <details class="property-disclosure" data-print-expand><summary><span>01 · Computations & approved weights</span><small>MCE and IAI, step by step</small></summary><div class="property-disclosure-body">${calculationMarkup(property)}</div></details>
          <details class="property-disclosure" data-print-expand><summary><span>02 · Recorded criterion profile</span><small>Radar and individual ratings</small></summary><div class="property-disclosure-body">${radarMarkup(calc)}</div></details>
          <details class="property-disclosure" data-print-expand><summary><span>03 · Evidence & data sources</span><small>References, dates and missing information</small></summary><div class="property-disclosure-body">${evidenceMarkup(property, calc)}</div></details>
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
