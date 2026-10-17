import { assessmentCalculation } from './property-details-view.js';
import { listingPriceEntries, listingPurposeLabel } from './utils.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const format = (value, digits = 2) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: digits }).format(value);
const area = property => num(property.parcel?.surveyAreaSqm) > 0 ? num(property.parcel.surveyAreaSqm) : num(property.area) > 0 ? num(property.area) * 10000 : null;
const sale = property => property.listingPurpose === 'lease' ? null : num(Object.prototype.hasOwnProperty.call(property, 'salePrice') ? property.salePrice : property.price);

export function comparisonModel(properties) {
  const sites = properties.slice(0, 3).map(property => ({ property, calc: assessmentCalculation(property), area: area(property) }));
  const comparable = sites.length > 1 && sites.every(({ property, calc }) => calc.iai !== null && property.rank_eligible === true
    && property.comparison_key && property.comparison_key === sites[0].property.comparison_key);
  const facts = [
    ['Listing type', property => listingPurposeLabel(property)],
    ['Asking price', property => listingPriceEntries(property).map(entry => `${entry.label}: ${entry.value}`).join(' · ')],
    ['Land area', property => area(property) === null ? 'Not recorded' : `${format(area(property))} m² · ${format(area(property) / 10000, 6)} ha`],
    ['Sale price / m²', property => sale(property) !== null && sale(property) >= 0 && area(property) > 0 ? `PHP ${format(sale(property) / area(property))}` : property.listingPurpose === 'lease' ? 'Not offered for sale' : 'Price on request'],
    ['Availability', property => property.status || 'Not confirmed'],
    ['Property type', property => [property.category, property.subcategory].filter(Boolean).join(' · ') || 'Not recorded'],
    ['Location', property => [property.barangay, property.city].filter(Boolean).join(', ') || 'Not recorded'],
    ['Recorded zoning', property => property.criteriaDetails?.zoning_compatibility?.zone_full_label || property.clupProfile?.zoningClassification || 'Awaiting verification'],
    ['Boundary', property => property.parcel?.boundary ? 'Outline recorded · verify survey' : 'No outline recorded'],
    ['Hazard screening', property => {
      if (property.technical_review_hold) return property.reason || 'Technical review hold · specialist review required';
      const hazards = property.subcriterion_scores?.risk_constraints || property.criteriaDetails?.risk_constraints?.subcriteria;
      if (!hazards) return property.hazardScreening?.status_label || 'No authenticated screening recorded';
      const observed = Object.values(hazards).filter(hazard => hazard && !/not.assessed|not.scored|unknown|pending/i.test(hazard.raw_status || hazard.status_label || 'not assessed')).length;
      return `${observed} of 6 findings recorded · confirm coverage and verification`;
    }],
  ].map(([label, get]) => { const values = sites.map(({ property }) => get(property)); return { label, values, same: sites.length > 1 && values.every(value => value === values[0]) }; });
  return { sites, comparable, facts };
}

export function comparisonMarkup(properties, { path = value => value, imageUrl = property => property.imageUrl || '', differencesOnly = false } = {}) {
  const { sites, comparable, facts } = comparisonModel(properties);
  differencesOnly = differencesOnly && sites.length > 1;
  if (!sites.length) return `<div class="site-compare-empty"><span aria-hidden="true">⇄</span><h2>A little perspective helps.</h2><p>Select up to three properties to compare their prices, location and recorded assessments.</p><a class="site-primary-link" href="${esc(path('property-explorer.php'))}">Explore properties <span aria-hidden="true">↗</span></a></div>`;
  const keys = [...new Set(sites.flatMap(({ calc }) => calc.rows.map(row => row.key)))];
  const row = (label, cells, same = cells.length > 1 && cells.every(cell => cell === cells[0])) => `<tr${same ? ' class="site-same-row"' : ''}${same && differencesOnly ? ' hidden' : ''}><th scope="row">${esc(label)}</th>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
  const rating = item => item?.score == null ? `<span class="site-compare-pending">Pending rating</span>${item ? `<small>${format(item.weight)}% weight</small>` : ''}` : `<div class="site-compare-rating"><strong>${format(item.score)}<small> / 100</small></strong><small class="site-compare-weight">${format(item.weight)}% weight</small><span aria-hidden="true"><i style="width:${Math.min(100, Math.max(0, item.score))}%"></i></span></div>`;
  return `<div class="site-comparison">
    <div class="site-compare-toolbar"><div><span class="site-eyebrow">YOUR SHORTLIST</span><strong>${sites.length} ${sites.length === 1 ? 'property' : 'properties'} side by side</strong></div><div><button type="button" data-compare-differences aria-pressed="${differencesOnly}" ${sites.length < 2 ? 'disabled title="Add another property to compare differences"' : ''}>Differences only</button><a href="${esc(path('property-explorer.php'))}">${sites.length < 3 ? 'Add a property' : 'Browse properties'} <span aria-hidden="true">↗</span></a><button type="button" data-compare-clear>Clear all</button></div></div>
    <div class="site-compare-notice" role="status"><span aria-hidden="true">${comparable ? '✓' : 'i'}</span><p><strong>${comparable ? 'Assessments share a comparison group.' : 'Compare the facts. Review the evidence.'}</strong> ${comparable ? 'These recorded scores use the same protocol, scenario and comparison cohort. Confirm the underlying evidence before deciding.' : 'Incomplete assessments or different scenarios cannot establish an investment ranking. Prices and property facts can still be compared.'}</p></div>
    <p class="site-compare-scroll-hint">Scroll sideways to see every site. Matching rows stay aligned.</p>
    <div class="site-compare-scroll" role="region" aria-label="Property comparison table" tabindex="0"><table class="site-compare-table" style="--site-count:${sites.length}"><caption class="site-visually-hidden">Property facts and assessment ratings for ${sites.length} selected sites</caption><colgroup><col class="site-compare-label-col">${sites.map(() => '<col>').join('')}</colgroup>
      <thead><tr><td><span class="site-eyebrow">THE DETAILS<br>THAT MATTER</span><p>A closer look at your options.</p></td>${sites.map(({ property }, index) => `<th scope="col"><div class="site-compare-photo"><img src="${esc(imageUrl(property))}" alt="${esc(property.name)}" onerror="this.hidden=true; this.parentElement.classList.add('is-missing');"><span>0${index + 1}</span><button type="button" data-compare="${Number(property.id)}" aria-label="Remove ${esc(property.name)} from comparison">×</button></div><div class="site-compare-property"><small>${esc(property.category || 'Property')}</small><h2><a href="${esc(path(`property-details.php?id=${property.id}`))}">${esc(property.name)}</a></h2><p>${esc(property.barangay || property.city || 'Location pending')}</p><a class="site-compare-open" href="${esc(path(`property-details.php?id=${property.id}`))}">View property <span aria-hidden="true">↗</span></a></div></th>`).join('')}</tr></thead>
      <tbody><tr class="site-compare-group"><th colspan="${sites.length + 1}">Property &amp; commercial terms</th></tr>${facts.map(fact => row(fact.label, fact.values.map(esc), fact.same)).join('')}
      <tr class="site-compare-group"><th colspan="${sites.length + 1}">Recorded assessment <small>Ratings / 100 · higher is more favorable under the configured rubric</small></th></tr>
      ${row('Composite IAI', sites.map(({ calc }) => calc.iai === null ? '<span class="site-compare-withheld">Withheld</span><small>Evidence or review pending</small>' : `<strong class="site-compare-total">${calc.iai.toFixed(1)}<small> / 100</small></strong>${!comparable ? '<small>Not a comparative rank</small>' : ''}`))}
      ${row('Rating coverage', sites.map(({ calc }) => `${calc.completedCount} of ${calc.rows.length} criteria rated`))}
      ${keys.map(key => { const items = sites.map(({ calc }) => calc.rows.find(item => item.key === key)); return row(items.find(Boolean).label.split(' / ')[0], items.map(rating)); }).join('')}
      ${row('Proposed activity', sites.map(({ property }) => esc(String(property.proposed_activity || property.clupProfile?.proposedActivity || 'Not selected').replaceAll('_', ' '))))}
      ${row('Evidence status', sites.map(({ property }) => property.evidence_completeness === true ? 'Complete under the recorded protocol' : 'Verification incomplete'))}
      </tbody></table></div>
    <details class="site-compare-method"><summary>How to read this comparison</summary><p>Price, area and location are listing facts. Criterion bars show recorded ratings before weighting. Pending evidence is not drawn as a zero. A composite IAI is shown only when the shared calculation and evidence gates permit it. Eligibility and comparable-group checks remain separate.</p><dl>${sites.map(({ property }) => `<div><dt>${esc(property.name)}</dt><dd>${esc(property.protocol_version || property.assessmentMethodologyVersion || 'Protocol not recorded')} · ${esc(String(property.assessmentStatus || 'Pending').replaceAll('_', ' '))}</dd></div>`).join('')}</dl></details>
  </div>`;
}
