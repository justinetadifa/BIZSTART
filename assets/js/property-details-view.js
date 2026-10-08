// Property details and its printable calculation sheet share the server's recorded inputs.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const fmt = (value, digits = 2) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: digits }).format(Number(value));
const fixed = value => Number(value).toFixed(1);
const rating = value => fmt(value, 20);
const money = value => numeric(value) > 0 ? `₱${fmt(value)}` : 'Price on request';
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
  const hasLocation = property.hasExactLocation !== false && lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  const location = [property.barangay, property.city].filter(Boolean).join(', ') || 'Location awaiting confirmation';
  const contact = role === 'guest' ? '<p>Log in to view contacts and inquire.</p>' : broker ? `<p class="property-contact-name">${esc(broker.name)}</p>${broker.phone ? `<a class="city-link" href="tel:${esc(broker.phone.replace(/[^+\d]/g, ''))}">${esc(broker.phone)}</a>` : ''}${broker.email ? `<a class="city-link" href="mailto:${esc(broker.email)}">${esc(broker.email)}</a>` : ''}` : `<p>${property.contactMode === 'broker' ? 'Broker contact details are awaiting city confirmation.' : 'Contact LEBDO for listing assistance.'}</p><a class="city-link no-print" href="https://cc.sanfernandocity.gov.ph/lebdo/" target="_blank" rel="noopener">LEBDO contact information ↗</a>`;
  const areaFacts = [['Listed area', area > 0 ? `${areaLabel} · ${fmt(area, 4)} ha` : 'Not specified'], [recordedAreaLabel, survey > 0 ? `${fmt(survey)} m²` : 'Not specified'], ['Drawn boundary estimate', mapped > 0 ? `${fmt(mapped)} m²` : 'No boundary drawn'], ['Boundary', parcel.boundary ? 'Recorded outline · mapped estimate' : 'Optional · not drawn']];
  return `${printHeaderMarkup(property)}
    <header class="property-heading"><div><div class="property-kicker">${esc(property.category || property.type || 'Property')}${property.subcategory ? ` / ${esc(property.subcategory)}` : ''} <span>· LOCUS-${esc(property.id)}</span></div><h1>${esc(property.name)}</h1><p>${esc(location)}</p></div><div class="property-heading-actions no-print">${printButtonMarkup('cityPrintPropertyTopBtn')}</div></header>
    <div class="property-summary-strip"><div><span>Asking price</span><strong>${money(property.price)}</strong></div><div><span>Land area</span><strong>${areaLabel}</strong></div><div><span>Availability</span><strong>${esc(property.status || 'Awaiting confirmation')}</strong></div><div><span>City assessment</span><strong>${calc.complete && calc.mce !== null && calc.iai !== null ? 'Complete' : `${calc.completedCount} / 7 criteria`}</strong></div></div>
    <nav class="property-section-nav no-print" aria-label="Property sections"><a href="#propertyOverviewSection">Overview</a><a href="#propertyAssessmentSection">Assessment</a><a href="#propertyLocationSection">Location</a><a href="#propertySurroundingsSection">Surroundings</a></nav>
    <div class="property-layout"><div class="property-main">
      <figure class="property-photo"><img src="${esc(imageUrl(property))}" alt="${esc(property.name)}"><figcaption>${esc(property.category || property.type || 'Property')} · ${esc(property.barangay || property.city || 'San Fernando')}</figcaption></figure>
      <section class="property-panel" id="propertyOverviewSection"><div class="property-section-heading"><h2>Property overview</h2><span class="property-status">${esc(property.status || 'Unconfirmed')}</span></div><p class="property-description">${esc(property.description || 'Additional property information has not been provided.')}</p>${factsMarkup([['Category', [property.category, property.subcategory].filter(Boolean).join(' / ') || property.type], ['Price / m²', area > 0 && numeric(property.pricePerSqm) > 0 ? money(property.pricePerSqm) : 'Not available'], ['Zoning classification', property.clupProfile?.zoningClassification || 'Awaiting verification'], ['Listing review', String(property.approvalState || 'pending').replaceAll('_', ' ')]])}
        <details class="property-disclosure" data-print-expand><summary>Area, facilities & listing information</summary><div class="property-disclosure-body">${factsMarkup([...areaFacts, ['Facilities', property.facilities?.join(', ') || 'Not recorded'], ['Investment context', property.assessmentTags?.join(', ') || 'Not recorded'], ['Last updated', dateLabel(property.updatedAt)], ['Availability last confirmed', dateLabel(property.lastConfirmedAvailableAt)]])}${property.readinessNotes ? `<p>${esc(property.readinessNotes)}</p>` : ''}${survey > 0 && mapped > 0 && Math.abs(survey - mapped) > 0.01 ? `<p class="property-note">The ${recordedAreaLabel.toLowerCase()} and mapped estimate differ. The drawn outline is an estimate; confirm the legal area against the survey records.</p>` : ''}</div></details>
      </section>
      <section class="property-panel property-assessment" id="propertyAssessmentSection"><div class="property-section-heading"><div><span class="property-kicker">City assessment</span><h2>A clear view of this site</h2></div><span class="property-status ${calc.complete ? '' : 'is-pending'}">${calc.complete ? 'All seven criteria rated' : 'Evidence pending'}</span></div><div class="property-score-summary"><div><span>MCE <small>Physical suitability</small></span><strong>${calc.mce === null ? 'Pending' : fixed(calc.mce)}${calc.mce === null ? '' : '<small> / 100</small>'}</strong></div><div><span>IAI <small>Investment alignment</small></span><strong>${calc.iai === null ? 'Pending' : fixed(calc.iai)}${calc.iai === null ? '' : '<small> / 100</small>'}</strong></div></div><p class="property-note">${calc.complete ? 'Calculated from all seven recorded criterion ratings. Review the computation and source evidence below.' : `${calc.completedCount} of 7 criteria have ratings. Complete source evidence is required before a total can be published.`}</p>
        <details class="property-disclosure" data-print-expand><summary>How MCE & IAI are calculated</summary><div class="property-disclosure-body">${calculationMarkup(property)}</div></details>
        <details class="property-disclosure" data-print-expand><summary>Source evidence & criterion ratings</summary><div class="property-disclosure-body">${evidenceMarkup(property, calc)}</div></details>
      </section>
      <details class="property-panel property-surroundings" id="propertySurroundingsSection" data-print-expand><summary>Surroundings & nearby businesses <span>${property.nearbyBusinesses?.length || 0} mapped places</span></summary><div class="property-disclosure-body">${nearbyBusinessesMarkup(property)}</div></details>
      <details class="property-panel property-investment no-print"><summary>Evaluate your proposed investment <span>Business type & incentives</span></summary><div class="property-disclosure-body">${evaluationMarkup(property, policy)}</div></details>
    </div><aside class="property-aside">
      <section class="property-panel property-contact"><span class="property-kicker">${property.contactMode === 'broker' ? 'Listing broker' : 'Listing assistance'}</span><h2>${property.contactMode === 'broker' ? 'Discuss this property' : 'Get in touch'}</h2>${contact}<div class="property-actions no-print">${role === 'guest' ? `<a class="city-button" href="${path('investor-login.php')}">Log in to inquire</a>` : ''}${canInquire ? '<a class="city-button" href="#cityInquiryPanel">Send an inquiry</a>' : ''}${investor ? `<button class="city-button city-button-secondary" type="button" data-save="${property.id}" aria-pressed="${saved.has(property.id)}">${saved.has(property.id) ? 'Saved' : 'Save property'}</button>` : ''}<button class="city-button city-button-secondary" type="button" data-compare="${property.id}" aria-pressed="${compare.includes(property.id)}">${compare.includes(property.id) ? 'Added to compare' : 'Compare property'}</button></div></section>
      <section class="property-panel property-location" id="propertyLocationSection"><h2>Location</h2><p>${esc(location)}</p>${hasLocation ? '<div class="city-map-canvas" id="cityPropertyMap" aria-label="Property location map"></div>' : '<p class="property-pending-note">Exact location has not been recorded.</p>'}${factsMarkup([['Coordinates', hasLocation ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Not specified'], ['Area', areaLabel], ['Boundary', parcel.boundary ? 'Drawn outline recorded' : 'No boundary drawn']])}${hasLocation ? `<a class="city-link no-print" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}" target="_blank" rel="noopener">Open location in maps ↗</a>` : ''}</section>
      ${canInquire ? '<details class="city-detail-panel property-panel no-print" id="cityInquiryPanel"><summary>Send an inquiry</summary><div id="cityConversation"></div><form id="cityInquiryForm" class="city-field"><label for="cityInquiryText">Message</label><textarea id="cityInquiryText" required maxlength="4000" rows="4" placeholder="Ask about this property"></textarea><button class="city-button" type="submit">Send message</button></form></details>' : ''}
      ${investor ? `<div class="property-investor-tools no-print">${investorTools(property, Boolean(canInquire))}</div>` : ''}
    </aside></div>${printFooterMarkup(property)}`;
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
