import { createAssistantBasemap } from './assistant-map-layer.js';
import { createBrowseRestoration } from './browse-restoration.js';

/** Investor discovery. All criteria, results and explanations come from the protected API. */
const root = document.querySelector('[data-investment-assistant]');
if (root) {
  const config = window.SFC_APP_CONFIG || {};
  const byId = id => root.querySelector(`#${id}`);
  const route = path => `${config.basePath || ''}/${path}`;
  const apiUrl = `${config.apiBase || route('api')}/investment-assistant.php`;
  const compareKey = `locus.compare:${config.basePath || ''}:${config.user?.id || 'guest'}`;
  const mobile = window.matchMedia('(max-width: 760px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fieldIds = { category: 'iaCategory', subcategory: 'iaSubcategory', purpose: 'iaPurpose', barangay: 'iaBarangay', budget: 'iaBudget', budgetBasis: 'iaBudgetBasis', minArea: 'iaMinArea', maxArea: 'iaMaxArea', activity: 'iaActivity' };
  const emptyCriteria = () => Object.fromEntries(Object.keys(fieldIds).map(key => [key, null]));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const number = value => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(Number(value));
  const validId = value => Number.isInteger(Number(value)) && Number(value) > 0;
  const uniqueIds = values => Array.isArray(values) ? [...new Set(values.filter(validId).map(Number))].slice(0, 3) : [];
  const basisLabels = { sale_total: 'total sale price', sale_sqm: 'sale / m²', lease_month_total: 'total / month', lease_month_sqm: '/ m² / month', lease_year_total: 'total / year', lease_year_sqm: '/ m² / year', lease_day_total: 'total / day', lease_day_sqm: '/ m² / day' };
  let state = { criteria: emptyCriteria(), version: 0, messages: [] };
  let options = { categories: {}, barangays: [] };
  let cards = [];
  let compare = [];
  let busy = false;
  let ready = false;
  let sequence = 0;
  let failedRequest = null;
  let selectedSaveIds = new Set();
  let transientCompare = false;
  let lastResponse = null;
  let renderedMessages = [];
  let map = null;
  let mapMarkers = null;
  let mapVisible = false;
  let mapAssets = null;
  let mapBasemap = null;
  let mapCaption = '';
  let mapHasLocations = false;
  let mapRenderSequence = 0;
  let mapCardsSignature = '';
  let mapCoordinatesSignature = '';
  let selectedMapId = null;
  let mapSizeFrame = null;
  const mapEntries = new Map();
  let filterOrigin = null;
  let browsingRestored = false;
  let pendingMapRestore = null;
  const browsing = createBrowseRestoration({
    scope: `${config.basePath || ''}:${config.user?.id || 'guest'}`, capture: captureAssistantBrowsing,
  });
  const MISSING = 'This information is not available in the current listing.';
  try { compare = uniqueIds(JSON.parse(localStorage.getItem(compareKey) || '[]')); } catch { /* In-memory comparison remains available. */ }

  function announce(text) { byId('iaAnnouncement').textContent = text; }

  let composerFrame = null;
  function syncComposer() {
    composerFrame = null;
    const headerHeight = Math.ceil(document.querySelector('.city-header')?.getBoundingClientRect().height || 88);
    root.style.setProperty('--ia-header-offset', `${headerHeight}px`);
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop || 0;
    const viewportBottom = viewport ? viewportTop + viewport.height : innerHeight;
    const keyboardInset = Math.max(0, innerHeight - viewportBottom);
    root.style.setProperty('--ia-keyboard-inset', `${keyboardInset}px`);
    const composer = root.querySelector('.ia-compose-wrap');
    const composerHeight = Math.ceil(composer.getBoundingClientRect().height);
    const bounds = root.getBoundingClientRect();
    const footerTop = document.querySelector('.city-footer')?.getBoundingClientRect().top ?? Infinity;
    const menuOpen = document.body.classList.contains('city-mobile-nav-open');
    const active = mobile.matches && !menuOpen && bounds.top < viewportBottom - 80
      && bounds.bottom > viewportTop + headerHeight + 80 && footerTop >= viewportBottom;
    root.classList.toggle('ia-mobile-composer-active', active);
    composer.inert = mobile.matches && !active;
    root.inert = menuOpen;
    byId('iaMessage').placeholder = mobile.matches ? 'Ask about a property…' : 'Describe your plans or ask a question…';
    document.body.style.setProperty('--ia-active-composer-height', `${composerHeight + keyboardInset + 24}px`);
  }
  function scheduleComposer() {
    if (composerFrame === null) composerFrame = requestAnimationFrame(syncComposer);
  }
  syncComposer();
  mobile.addEventListener('change', scheduleComposer);
  window.addEventListener('scroll', scheduleComposer, { passive: true });
  window.addEventListener('resize', () => {
    scheduleComposer();
    scheduleMapSize();
  }, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleComposer, { passive: true });
  window.visualViewport?.addEventListener('scroll', scheduleComposer, { passive: true });
  window.addEventListener('sfc:navigation-change', syncComposer);
  if ('IntersectionObserver' in window) new IntersectionObserver(scheduleComposer, { threshold: [0, 0.01] }).observe(root);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleComposer).observe(root.querySelector('.ia-compose-wrap'));

  function resizeMessage() {
    const message = byId('iaMessage');
    message.style.height = 'auto';
    const height = Math.max(mobile.matches ? 36 : 30, Math.min(90, message.scrollHeight));
    message.style.height = `${height}px`;
    message.style.overflowY = message.scrollHeight > 90 ? 'auto' : 'hidden';
  }
  byId('iaMessage').addEventListener('input', resizeMessage);
  resizeMessage();

  function setBusy(value) {
    busy = value;
    byId('iaWorkbench').setAttribute('aria-busy', String(value));
    root.classList.toggle('ia-is-busy', value && ready);
    byId('iaSend').disabled = value || !ready;
    byId('iaMessage').disabled = value || !ready;
    byId('iaReset').disabled = value || !ready;
    byId('iaApplyFilters').disabled = value || !ready;
    byId('iaEditFilters').disabled = value || !ready;
    byId('iaRetry').disabled = value;
    byId('iaSend').querySelector('.ia-send-label').textContent = value ? 'Searching' : 'Send';
    root.querySelectorAll('[data-ia-prompt], [data-ia-edit], [data-ia-remove], [data-ia-suggestion], [data-ia-save], [data-ia-compare], [data-ia-focus], [data-ia-detail], #iaClearFilters, #iaComposerFilters').forEach(button => { button.disabled = value || !ready; });
    byId('iaFilterForm').querySelectorAll('input,select').forEach(input => { input.disabled = value || !ready; });
    if (value && ready) byId('iaResultStatus').textContent = 'Checking your criteria against the listings…';
  }

  function showError(message, retry = true) {
    byId('iaErrorMessage').textContent = message || 'The search could not finish. Try again, or use the catalogue below.';
    byId('iaError').hidden = false;
    byId('iaRetry').hidden = !retry;
    if (!ready) {
      byId('iaResultList').innerHTML = '<div class="ia-empty"><h3>Your listings could not load.</h3><p>Try again to reconnect, or browse the catalogue below.</p></div>';
      byId('iaResultStatus').textContent = 'Search unavailable.';
    }
  }

  function clearError() { byId('iaError').hidden = true; }

  function requestId() {
    return globalThis.crypto?.randomUUID?.() || `ia-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
  }

  function safeImage(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, `${location.origin}${config.basePath || ''}/`);
      if ((url.origin === location.origin && ['http:', 'https:'].includes(url.protocol)) || url.protocol === 'https:') return url.href;
    } catch { /* Invalid and active URLs receive a neutral placeholder. */ }
    return null;
  }

  function optionElement(value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }

  function populateOptions() {
    const category = byId('iaCategory');
    category.replaceChildren(optionElement('', 'Any property type'));
    Object.keys(options.categories || {}).forEach(key => category.append(optionElement(key, key)));
    const barangay = byId('iaBarangay');
    barangay.replaceChildren(optionElement('', 'Anywhere in San Fernando'));
    (Array.isArray(options.barangays) ? options.barangays : []).forEach(entry => {
      const value = typeof entry === 'string' ? entry : entry?.name;
      if (typeof value === 'string' && value) barangay.append(optionElement(value, value));
    });
  }

  function populateSubcategories(category, selected = '') {
    const select = byId('iaSubcategory');
    select.replaceChildren(optionElement('', 'Any specific type'));
    const values = category ? (options.categories[category] || []) : [...new Set(Object.values(options.categories).flat())];
    values.forEach(value => { if (typeof value === 'string') select.append(optionElement(value, value)); });
    select.value = selected || '';
  }

  function fillFilters() {
    const criteria = { ...emptyCriteria(), ...state.criteria };
    populateSubcategories(criteria.category, criteria.subcategory);
    for (const [key, id] of Object.entries(fieldIds)) byId(id).value = criteria[key] ?? '';
  }

  function messageNode(role, content, pending = false) {
    const bubble = document.createElement('div');
    bubble.className = `ia-message ia-message-${role === 'user' ? 'user' : 'assistant'}${pending ? ' ia-message-pending' : ''}`;
    const label = document.createElement('span');
    label.className = 'ia-message-label';
    label.textContent = role === 'user' ? 'You' : 'LOCUS';
    const paragraph = document.createElement('p');
    paragraph.textContent = String(content || '');
    bubble.append(label, paragraph);
    return bubble;
  }

  function scrollConversation() {
    if (!browsingRestored && browsing.data) return;
    const body = byId('iaConversationBody');
    body.scrollTo({ top: body.scrollHeight, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }

  function renderMessages(data) {
    const messages = Array.isArray(state.messages) ? state.messages.filter(message => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string') : [];
    const log = byId('iaMessages');
    const next = messages.length ? messages : [{ role: 'assistant', content: data.message || 'Tell me about your plans, your budget, or the kind of property you have in mind.' }];
    log.querySelectorAll('.ia-message-pending').forEach(element => element.remove());
    const unchangedPrefix = renderedMessages.length > 0 && renderedMessages.length <= next.length
      && renderedMessages.every((message, index) => message.role === next[index].role && message.content === next[index].content);
    if (!unchangedPrefix) log.replaceChildren();
    next.slice(unchangedPrefix ? renderedMessages.length : 0).forEach(message => log.append(messageNode(message.role, message.content)));
    renderedMessages = next.map(message => ({ role: message.role, content: message.content }));
    const last = messages.at(-1)?.content || data.message || '';
    log.lastElementChild?.querySelector('.ia-question')?.remove();
    if (data.question && !last.includes(data.question)) {
      const question = document.createElement('p');
      question.className = 'ia-question';
      question.textContent = data.question;
      log.lastElementChild?.append(question);
    }
    byId('iaStarters').hidden = messages.some(message => message.role === 'user');
    scrollConversation();
  }

  function filterChips() {
    const c = state.criteria || {};
    const entries = [];
    if (c.subcategory || c.category) entries.push([c.subcategory ? 'subcategory' : 'category', c.subcategory || c.category]);
    if (c.purpose) entries.push(['purpose', c.purpose === 'lease' ? 'For lease' : 'For sale']);
    if (c.barangay) entries.push(['barangay', c.barangay]);
    if (c.budget != null) entries.push(['budget', `Up to ₱${number(c.budget)}${c.budgetBasis ? ` · ${basisLabels[c.budgetBasis] || c.budgetBasis}` : ' · basis to confirm'}`]);
    else if (c.budgetBasis) entries.push(['budgetBasis', basisLabels[c.budgetBasis] || c.budgetBasis]);
    if (c.minArea != null || c.maxArea != null) entries.push(['minArea', c.minArea != null && c.maxArea != null ? `${number(c.minArea)}–${number(c.maxArea)} m²` : c.minArea != null ? `At least ${number(c.minArea)} m²` : `Up to ${number(c.maxArea)} m²`]);
    if (c.activity) entries.push(['activity', `Plan: ${c.activity}`]);
    byId('iaChips').innerHTML = entries.map(([key, label]) => `<span class="ia-chip"><button type="button" data-ia-edit="${key}" aria-label="Edit ${esc(label)}">${esc(label)}</button><button type="button" data-ia-remove="${key}" aria-label="Remove ${esc(label)}">×</button></span>`).join('');
    byId('iaCriteriaDescription').textContent = entries.length ? `${entries.length} selected search preferences` : 'All published properties';
    byId('iaFilterSummary').hidden = !entries.length;
    byId('iaClearFilters').hidden = !entries.length;
    const areaLabel = c.minArea != null && c.maxArea != null ? `${number(c.minArea)}–${number(c.maxArea)} m²`
      : c.minArea != null ? `From ${number(c.minArea)} m²` : c.maxArea != null ? `Up to ${number(c.maxArea)} m²` : 'Any size';
    const budgetLabel = c.budget != null ? `Up to ₱${number(c.budget)} · ${c.budgetBasis ? basisLabels[c.budgetBasis] : 'choose price basis'}` : 'No limit';
    const quickFilters = [
      ['iaQuickPurpose', c.purpose ? (c.purpose === 'lease' ? 'For lease' : 'For sale') : 'Buy or lease', Boolean(c.purpose)],
      ['iaQuickCategory', c.subcategory || c.category || 'Any property', Boolean(c.category || c.subcategory)],
      ['iaQuickBudget', budgetLabel, c.budget != null],
      ['iaQuickBarangay', c.barangay || 'All barangays', Boolean(c.barangay)],
      ['iaQuickArea', areaLabel, c.minArea != null || c.maxArea != null],
    ];
    quickFilters.forEach(([id, label, selected]) => {
      const button = byId(id);
      button.querySelector('.ia-filter-value').textContent = id === 'iaQuickBudget' && c.budget != null ? `Up to ₱${number(c.budget)}` : label;
      let secondary = button.querySelector('.ia-filter-secondary');
      if (id === 'iaQuickBudget' && (c.budget != null || c.budgetBasis)) {
        if (!secondary) { secondary = document.createElement('span'); secondary.className = 'ia-filter-secondary'; button.querySelector('.ia-filter-text').append(secondary); }
        secondary.textContent = c.budgetBasis ? basisLabels[c.budgetBasis] : 'Choose price basis';
      } else secondary?.remove();
      button.title = label;
      button.setAttribute('aria-label', `${button.querySelector('.ia-filter-label').textContent}: ${label}`);
      button.classList.toggle('is-selected', selected);
    });
  }

  function assessmentMarkup(assessment) {
    const a = assessment && typeof assessment === 'object' ? assessment : {};
    const validScore = value => value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
    const score = validScore(a.score) ? Number(a.score) : null;
    const title = score === null ? 'Assessment pending or under review' : `Recorded IAI · ${number(score)}/100`;
    const evidence = Array.isArray(a.evidence) ? a.evidence : [];
    return `<details class="ia-assessment"><summary>${esc(title)}</summary><div class="ia-assessment-body"><p>${esc(a.note || MISSING)}</p>${validScore(a.mceScore) ? `<p>Recorded MCE: ${esc(number(a.mceScore))}/100</p>` : ''}${a.status ? `<p>Assessment status: ${esc(a.status)}</p>` : ''}${evidence.length ? `<dl>${evidence.map(item => `<div><dt>${esc(item.label || 'Recorded evidence')}</dt><dd>${esc(typeof item.value === 'object' ? JSON.stringify(item.value) : item.value ?? MISSING)}${item.source ? `<span class="ia-assessment-source">Source: ${esc(item.source)}</span>` : ''}</dd></div>`).join('')}</dl>` : `<p>${MISSING}</p>`}</div></details>`;
  }

  function verificationMarkup(value) {
    if (!value || typeof value !== 'object') return '';
    const labels = { status: 'Listing status', sellerIdentityStatus: 'Seller identity', authorityToSellVerified: 'Authority to sell validated', documentsReviewedAt: 'Documents reviewed', siteVerifiedAt: 'Site verified', lastConfirmedAvailableAt: 'Availability last confirmed' };
    return Object.entries(labels).filter(([key]) => value[key] !== undefined && value[key] !== null && value[key] !== '').map(([key, label]) => `<p class="ia-verification">${esc(label)}: ${esc(typeof value[key] === 'boolean' ? (value[key] ? 'Yes' : 'No') : value[key])}</p>`).join('');
  }

  function v2EligibilityMarkup(card) {
    const status = card.v2Eligibility;
    if (!status) return '';
    const label = card.v2EligibilityLabel || (status === 'meets_screened_requirements' ? 'Meets Requirements' : status === 'conditional' ? 'Conditional' : status === 'does_not_meet_requirements' ? 'Does Not Meet Requirements' : 'Insufficient Info');
    const icon = status === 'meets_screened_requirements' ? '✓' : status === 'conditional' ? '⚠' : status === 'does_not_meet_requirements' ? '✕' : 'ℹ';
    const cssClass = status === 'meets_screened_requirements' ? 'ia-v2-meets' : status === 'conditional' ? 'ia-v2-conditional' : status === 'does_not_meet_requirements' ? 'ia-v2-not-met' : 'ia-v2-insufficient';
    const iai = card.v2IaiScore != null && Number.isFinite(Number(card.v2IaiScore)) ? Number(card.v2IaiScore) : null;
    const strengths = Array.isArray(card.v2Strengths) ? card.v2Strengths.slice(0, 2) : [];
    return `<div class="ia-v2-badge ${cssClass}" role="note"><span class="ia-v2-icon" aria-hidden="true">${icon}</span><div><strong class="ia-v2-label">V2: ${esc(label)}</strong>${iai !== null ? `<span class="ia-v2-score">IAI ${number(iai)}/100</span>` : ''}</div>${strengths.length ? `<ul class="ia-v2-strengths">${strengths.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}</div>`;
  }

  function cardMarkup(card) {
    const id = Number(card.id);
    const href = route(`property-details.php?id=${id}`);
    const image = safeImage(card.image);
    const hasArea = card.areaSqm !== null && card.areaSqm !== '' && Number.isFinite(Number(card.areaSqm)) && Number(card.areaSqm) > 0;
    const area = hasArea ? `${number(card.areaSqm)} m²` : 'Area unavailable';
    const purpose = card.purpose === 'sale' ? 'For sale' : card.purpose === 'lease' ? 'For lease' : card.purpose === 'sale_or_lease' ? 'For sale or lease' : 'Published listing';
    const reasons = Array.isArray(card.reasons) ? card.reasons : [];
    const unknowns = Array.isArray(card.unknowns) ? card.unknowns : [];
    const details = card.details && typeof card.details === 'object' ? card.details : {};
    const missing = Object.entries(details).filter(([, value]) => value === MISSING).map(([key]) => key);
    const price = card.priceLabel || 'Price on request';
    return `<article class="ia-property-card" data-ia-property="${id}"><div class="ia-card-photo"><a class="ia-card-media" href="${href}" aria-label="View ${esc(card.name)}">${image ? `<img src="${esc(image)}" alt="${esc(card.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '<span class="ia-image-fallback">Photo not provided</span>'}</a><span class="ia-card-purpose">${esc(purpose)}</span><button class="ia-card-save" type="button" data-ia-save="${id}" aria-pressed="${selectedSaveIds.has(id)}" aria-label="${selectedSaveIds.has(id) ? 'Remove saved' : 'Save'} ${esc(card.name)}" title="${selectedSaveIds.has(id) ? 'Saved property' : 'Save property'}"><svg viewBox="0 0 16 20" aria-hidden="true"><path d="M2 2h12v16l-6-4-6 4V2Z"/></svg></button></div><div class="ia-card-content"><strong class="ia-card-price">${esc(price)}</strong>${card.priceBasis && card.priceBasis !== MISSING && !/not (?:provided|available)/i.test(card.priceBasis) ? `<span class="ia-card-basis">${esc(card.priceBasis)}</span>` : ''}<h3><a href="${href}">${esc(card.name || 'Property listing')}</a></h3><p class="ia-card-location"><svg viewBox="0 0 16 18" aria-hidden="true"><path d="M13 7c0 4-5 9-5 9S3 11 3 7a5 5 0 1 1 10 0Z"/><circle cx="8" cy="7" r="1.7"/></svg>${esc(card.location || MISSING)}</p><div class="ia-card-facts"><span${!hasArea ? ` title="${MISSING}"` : ''}><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3h12v12H3V3ZM1 3h4M3 1v4M13 15h4M15 13v4"/></svg>${esc(area)}</span><span><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M4 16V2h9v14M1 16h15M7 5h.01M10 5h.01M7 8h.01M10 8h.01M7 11h.01M10 11h.01M8 16v-3"/></svg>${esc(card.subcategory || card.category || 'Type unavailable')}</span></div><details class="ia-card-disclosure"><summary>Listing facts & recorded assessment</summary><div class="ia-card-disclosure-body">${reasons.length ? `<div class="ia-reasons"><h4>Matched listing fields</h4><ul>${reasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul></div>` : ''}${missing.length || !hasArea ? `<p class="ia-card-unknowns">${missing.length ? `${esc(missing.join(', '))}: ` : 'Land area: '}${MISSING}</p>` : ''}${unknowns.length ? `<p class="ia-card-unknowns">${esc(unknowns.join(' · '))}</p>` : ''}${verificationMarkup(card.verification)}${assessmentMarkup(card.assessment)}${v2EligibilityMarkup(card)}</div></details></div><div class="ia-card-actions"><a href="${href}">View property <span aria-hidden="true">→</span></a><div class="ia-card-secondary"><button type="button" data-ia-detail="${id}" aria-label="Ask for listing details about ${esc(card.name)}">Details</button><button type="button" data-ia-compare="${id}" aria-pressed="${compare.includes(id)}">${compare.includes(id) ? 'Selected' : 'Compare'}</button></div></div></article>`;
  }

  function renderGuidance(data) {
    const values = Array.isArray(data.guidance) ? data.guidance.filter(item => typeof item?.label === 'string' && typeof item?.message === 'string') : [];
    const container = byId('iaGuidance');
    container.replaceChildren();
    values.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.iaPrompt = item.message;
      button.textContent = item.label;
      container.append(button);
    });
    container.hidden = !values.length || !byId('iaStarters').hidden;
    scrollConversation();
  }

  function renderCards(data) {
    cards = Array.isArray(data.results) ? data.results.filter(card => validId(card?.id)) : [];
    selectedSaveIds = new Set(cards.filter(card => card.saved).map(card => Number(card.id)));
    const total = Number.isInteger(Number(data.total)) && Number(data.total) >= 0 ? Number(data.total) : cards.length;
    byId('iaResultCount').textContent = `${number(total)} ${total === 1 ? 'listing' : 'listings'}`;
    byId('iaResultStatus').textContent = cards.length ? (total > cards.length ? `Showing ${cards.length} of ${number(total)} matching published listings. Refine your filters to narrow the results.` : `${number(total)} published ${total === 1 ? 'listing matches' : 'listings match'} your filters.`) : 'No published properties match your current filters.';
    byId('iaResultList').innerHTML = cards.length ? cards.map(cardMarkup).join('') : '<div class="ia-empty"><h3>No published properties match your current filters.</h3><p>Adjust a selected filter or clear your filters to explore more published properties.</p></div>';
    byId('iaResultList').querySelectorAll('img').forEach(image => image.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.className = 'ia-image-fallback';
      fallback.textContent = 'Photo unavailable';
      image.replaceWith(fallback);
    }, { once: true }));
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions.filter(item => typeof item?.label === 'string' && item.patch && typeof item.patch === 'object') : [];
    byId('iaSuggestions').replaceChildren();
    suggestions.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.iaSuggestion = 'true';
      button.textContent = item.label;
      button.addEventListener('click', () => send({ filters: { ...emptyCriteria(), ...state.criteria, ...item.patch } }));
      byId('iaSuggestions').append(button);
    });
    if (!cards.length) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.dataset.iaSuggestion = 'true';
      clear.textContent = 'Clear all filters';
      clear.addEventListener('click', () => send({ filters: emptyCriteria() }));
      byId('iaSuggestions').append(clear);
    }
    byId('iaSuggestions').hidden = !byId('iaSuggestions').children.length;
    renderCompare();
    if (mapVisible) renderMap();
    syncComposer();
  }

  function ensureMapAssets() {
    if (mapAssets) return mapAssets;
    const assetBase = config.assetBase || route('assets');
    const style = new Promise((resolve, reject) => {
      const link = document.querySelector('[data-ia-leaflet-style]') || document.createElement('link');
      if (link.sheet) { resolve(); return; }
      const fail = () => { clearTimeout(timer); link.remove(); reject(new Error('Map styles could not load. Use Retry map to try again.')); };
      const timer = setTimeout(fail, 15000);
      link.onload = () => { clearTimeout(timer); resolve(); };
      link.onerror = fail;
      if (!link.isConnected) {
        link.rel = 'stylesheet';
        link.href = `${assetBase}/vendor/leaflet/leaflet.css`;
        link.dataset.iaLeafletStyle = 'true';
        document.head.append(link);
      }
    });
    const loadScript = () => window.L ? Promise.resolve() : new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${assetBase}/vendor/leaflet/leaflet.js`;
      const fail = () => { clearTimeout(timer); script.remove(); reject(new Error('Map controls could not load. Use Retry map to try again.')); };
      const timer = setTimeout(fail, 15000);
      script.onload = () => { clearTimeout(timer); if (window.L) resolve(); else fail(); };
      script.onerror = fail;
      document.head.append(script);
    });
    mapAssets = style.then(loadScript).catch(error => { mapAssets = null; throw error; });
    return mapAssets;
  }

  async function renderMap() {
    const renderToken = ++mapRenderSequence;
    const currentCards = cards;
    const coordinate = (value, limit) => (typeof value === 'number' || (typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))) && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit;
    const positioned = cards.filter(card => coordinate(card.lat, 90) && coordinate(card.lng, 180));
    const status = byId('iaMapStatus');
    mapHasLocations = positioned.length > 0;
    byId('iaPropertyMap').inert = !mapHasLocations;
    byId('iaMapEmpty').hidden = mapHasLocations;
    byId('iaMapFit').disabled = !mapHasLocations || !map;
    if (!positioned.length) {
      map?.closePopup();
      mapMarkers?.clearLayers();
      mapEntries.clear();
      mapCardsSignature = mapCoordinatesSignature = '';
      selectedMapId = null;
      byId('iaMapLocations').replaceChildren();
      byId('iaMapLocations').hidden = true;
      byId('iaMapRetry').hidden = true;
      byId('iaPropertyMap').setAttribute('aria-busy', 'false');
      status.textContent = cards.length ? `Recorded map coordinates: ${MISSING}` : 'No published properties match your current filters.';
      return;
    }
    mapCaption = `${positioned.length} of ${cards.length} displayed listings have recorded map coordinates.${positioned.length < cards.length ? ' Other listings have no recorded coordinates.' : ''}`;
    if (!map) status.textContent = 'Loading recorded property locations…';
    try {
      await ensureMapAssets();
      if (!mapVisible || renderToken !== mapRenderSequence || currentCards !== cards) return;
      if (!map) {
        const canvas = byId('iaPropertyMap');
        canvas.replaceChildren();
        map = window.L.map(canvas, { scrollWheelZoom: false, zoomControl: false });
        window.L.control.zoom({ position: 'bottomright' }).addTo(map);
        mapMarkers = window.L.featureGroup().addTo(map);
        if ('ResizeObserver' in window) new ResizeObserver(scheduleMapSize).observe(canvas);
        mapBasemap = createAssistantBasemap(window.L, map, {
          tileUrl: config.mapTileUrl, attribution: config.mapAttribution,
          onState: ({ state }) => updateMapStatus(state),
        });
      }
      const coordinatesSignature = JSON.stringify(positioned.map(card => [card.id, Number(card.lat), Number(card.lng)]));
      const signature = JSON.stringify(positioned.map(card => [card.id, card.name, card.priceLabel, card.location, card.areaSqm, Number(card.lat), Number(card.lng)]));
      // Toggling views, saving, or asking a follow-up must not reset exploration.
      if (signature === mapCardsSignature) {
        scheduleMapSize();
        byId('iaMapFit').disabled = false;
        updateMapStatus(mapBasemap.getState());
        return;
      }
      map.closePopup();
      mapMarkers.clearLayers();
      mapEntries.clear();
      const locations = document.createDocumentFragment();
      positioned.forEach((card, index) => {
        const id = Number(card.id);
        const popup = document.createElement('div');
        popup.className = 'ia-map-popup';
        const name = document.createElement('strong');
        name.textContent = card.name || 'Property listing';
        const link = document.createElement('a');
        link.href = route(`property-details.php?id=${id}`);
        link.textContent = 'View property →';
        const price = document.createElement('p');
        price.className = 'ia-map-price';
        price.textContent = card.priceLabel || MISSING;
        const details = document.createElement('p');
        const hasArea = card.areaSqm !== null && card.areaSqm !== '' && Number.isFinite(Number(card.areaSqm)) && Number(card.areaSqm) > 0;
        details.textContent = [card.location, hasArea ? `${number(card.areaSqm)} m²` : null].filter(Boolean).join(' · ');
        popup.append(name, price, details, link);
        const marker = window.L.marker([Number(card.lat), Number(card.lng)], {
          title: card.name || `Property ${index + 1}`,
          alt: `Property ${index + 1}: ${card.name || 'Property listing'}`,
          icon: window.L.divIcon({ className: 'ia-map-marker', html: `<span>${index + 1}</span>`, iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -18] }),
        }).bindPopup(popup, { maxWidth: mapPopupWidth(), minWidth: 120, autoPanPadding: [20, 20], keepInView: true }).addTo(mapMarkers);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ia-map-location';
        button.dataset.iaMapProperty = String(id);
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', `Show property ${index + 1} on map: ${card.name || 'Property listing'}`);
        const badge = document.createElement('span');
        badge.className = 'ia-map-number';
        badge.textContent = String(index + 1);
        const text = document.createElement('span');
        const title = document.createElement('strong');
        title.textContent = card.name || 'Property listing';
        const subtitle = document.createElement('span');
        subtitle.textContent = card.priceLabel || 'Price on request';
        text.append(title, subtitle);
        button.append(badge, text);
        locations.append(button);
        mapEntries.set(id, { marker, button });
        marker.getElement()?.setAttribute('aria-label', `Property ${index + 1}: ${card.name || 'Property listing'}`);
        marker.on('popupopen', () => selectMapProperty(id));
      });
      byId('iaMapLocations').replaceChildren(locations);
      byId('iaMapLocations').hidden = false;
      map.invalidateSize({ pan: false });
      if (coordinatesSignature !== mapCoordinatesSignature) {
        selectedMapId = null;
        fitMapListings(false);
      } else if (mapEntries.has(selectedMapId)) selectMapProperty(selectedMapId);
      mapCardsSignature = signature;
      mapCoordinatesSignature = coordinatesSignature;
      if (pendingMapRestore) {
        const saved = pendingMapRestore;
        pendingMapRestore = null;
        if (Number.isFinite(saved.lat) && Number.isFinite(saved.lng) && Number.isFinite(saved.zoom)
            && Math.abs(saved.lat) <= 90 && Math.abs(saved.lng) <= 180) {
          map.setView([saved.lat, saved.lng], saved.zoom, { animate: false });
        }
        if (mapEntries.has(saved.selectedId)) selectMapProperty(saved.selectedId);
        byId('iaMapLocations').scrollTo({ left: Number(saved.railLeft) || 0, behavior: 'instant' });
      }
      byId('iaMapFit').disabled = false;
      updateMapStatus(mapBasemap.getState());
    } catch (error) {
      if (renderToken !== mapRenderSequence) return;
      status.textContent = error.message || 'The map could not load. Property listings remain available.';
      byId('iaMapRetry').hidden = false;
      byId('iaPropertyMap').setAttribute('aria-busy', 'false');
    }
  }

  function scheduleMapSize() {
    if (!mapVisible || !map || mapSizeFrame !== null) return;
    mapSizeFrame = requestAnimationFrame(() => {
      mapSizeFrame = null;
      if (mapVisible) {
        map.invalidateSize({ pan: false, debounceMoveend: true });
        const width = mapPopupWidth();
        mapEntries.forEach(({ marker }) => {
          const popup = marker.getPopup();
          if (popup.options.maxWidth !== width) {
            popup.options.maxWidth = width;
            if (popup.isOpen()) popup.update();
          }
        });
      }
    });
  }

  function mapPopupWidth() {
    return Math.max(120, Math.min(270, byId('iaPropertyMap').clientWidth - 90));
  }

  function fitMapListings(animate = true) {
    if (!map || !mapEntries.size) return;
    map.closePopup();
    map.fitBounds(mapMarkers.getBounds(), { padding: [38, 38], maxZoom: 16, animate: animate && !reducedMotion.matches, duration: 0.4 });
  }

  function selectMapProperty(id, open = false) {
    const entry = mapEntries.get(id);
    if (!entry) return;
    selectedMapId = id;
    mapEntries.forEach(({ marker, button }, entryId) => {
      const selected = entryId === id;
      marker.getElement()?.classList.toggle('is-selected', selected);
      marker.setZIndexOffset(selected ? 1000 : 0);
      button.setAttribute('aria-pressed', String(selected));
    });
    if (open) entry.marker.openPopup();
    const rail = byId('iaMapLocations');
    const bounds = rail.getBoundingClientRect();
    const item = entry.button.getBoundingClientRect();
    if (item.left < bounds.left || item.right > bounds.right) {
      rail.scrollTo({ left: rail.scrollLeft + item.left - bounds.left - 16, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
  }

  function retryMap() {
    if (!mapVisible || !mapHasLocations) return;
    byId('iaMapRetry').hidden = true;
    if (mapBasemap) mapBasemap.retry();
    else renderMap();
  }

  function updateMapStatus(state) {
    if (!mapHasLocations) return;
    byId('iaMapRetry').hidden = state !== 'unavailable';
    byId('iaPropertyMap').setAttribute('aria-busy', String(state === 'loading'));
    byId('iaMapStatus').textContent = state === 'unavailable'
      ? 'Map imagery is unavailable. Retry the background or explore the property pins and listings.'
      : state === 'loading' ? 'Loading map background… Property locations remain available.' : mapCaption;
  }

  function switchView(showMap) {
    mapVisible = showMap;
    byId('iaMapPanel').hidden = !showMap;
    byId('iaMapView').setAttribute('aria-pressed', String(showMap));
    byId('iaListView').setAttribute('aria-pressed', String(!showMap));
    if (showMap) { mapBasemap?.retry(); renderMap(); }
  }

  function renderCompare() {
    root.querySelectorAll('[data-ia-compare]').forEach(button => {
      const selected = compare.includes(Number(button.dataset.iaCompare));
      button.setAttribute('aria-pressed', String(selected));
      button.textContent = selected ? 'In comparison' : 'Compare';
    });
    byId('iaCompareBar').hidden = !compare.length;
    byId('iaCompareCount').textContent = `${compare.length} of 3 selected${transientCompare ? ' · this session' : ''}`;
    // The existing comparison page reads the same account-scoped storage key.
    byId('iaCompareLink').href = route(`compare-decision.php${transientCompare ? `?properties=${compare.join(',')}` : ''}`);
  }

  function setComparison(ids, notify = true) {
    compare = uniqueIds(ids);
    try { localStorage.setItem(compareKey, JSON.stringify(compare)); transientCompare = false; }
    catch { transientCompare = true; }
    renderCompare();
    if (notify) window.dispatchEvent(new CustomEvent('locus:assistant-compare', { detail: { propertyIds: compare } }));
    if (transientCompare) announce('Comparison is selected. Open comparison to carry these properties to the comparison page.');
  }

  function applyResponse(data) {
    if (!data || typeof data !== 'object' || !data.state || !Array.isArray(data.results)) throw new Error('The search returned an incomplete response. Please try again.');
    state = { criteria: { ...emptyCriteria(), ...data.state.criteria }, version: Number(data.state.version) || 0, messages: Array.isArray(data.state.messages) ? data.state.messages : [] };
    if (data.options && typeof data.options === 'object') {
      options = { categories: data.options.categories || {}, barangays: data.options.barangays || [] };
      populateOptions();
    }
    byId('iaMode').textContent = 'Guided search';
    byId('iaMode').title = 'Defined search phrases and filters use published listing data.';
    const notice = typeof data.notice === 'string' ? data.notice : '';
    byId('iaServiceNotice').textContent = notice;
    byId('iaServiceNotice').hidden = !notice;
    byId('iaComposeHelp').textContent = 'You can also search using filters.';
    renderMessages(data);
    renderGuidance(data);
    filterChips();
    fillFilters();
    renderCards(data);
    if (Array.isArray(data.compareIds) && data.compareIds.length >= 2) setComparison(data.compareIds);
    lastResponse = data;
    ready = true;
  }

  function captureAssistantBrowsing() {
    const center = map?.getCenter();
    const panel = byId('iaFilterDetails');
    return { criteria: { ...state.criteria }, message: byId('iaMessage').value,
      filterValues: Object.fromEntries(Object.entries(fieldIds).map(([key, id]) => [key, byId(id).value])),
      filterOpen: panel.open, filterScope: panel.dataset.scope, filterOrigin: filterOrigin?.id || null,
      conversationTop: byId('iaConversationBody').scrollTop, resultsTop: byId('iaResults').scrollTop,
      mapVisible, map: center ? { lat: center.lat, lng: center.lng, zoom: map.getZoom(),
        selectedId: selectedMapId, railLeft: byId('iaMapLocations').scrollLeft } : null };
  }

  function browsingCriteriaRequest(data) {
    const saved = browsing.data?.criteria;
    if (!saved || typeof saved !== 'object' || !data?.state) return null;
    const keys = Object.keys(fieldIds);
    const filters = Object.fromEntries(keys.map(key => [key, saved[key] ?? null]));
    if (keys.every(key => filters[key] === (data.state.criteria?.[key] ?? null))) return null;
    // Recheck results through the protected search API; never cache listing data.
    return { filters, version: Number(data.state.version) || 0, requestId: requestId() };
  }

  function restoreAssistantBrowsing() {
    const saved = browsing.data;
    if (!saved) { browsingRestored = true; browsing.ready(); return; }
    byId('iaMessage').value = typeof saved.message === 'string' ? saved.message.slice(0, 2000) : '';
    resizeMessage();
    if (saved.filterOpen) {
      const scope = ['all', 'purpose', 'category', 'budget', 'barangay', 'area', 'activity'].includes(saved.filterScope) ? saved.filterScope : 'all';
      configureFilterEditor(scope);
      filterOrigin = byId(saved.filterOrigin) || byId('iaEditFilters');
      const values = saved.filterValues || {};
      populateSubcategories(values.category, values.subcategory);
      for (const [key, id] of Object.entries(fieldIds)) {
        const node = byId(id), value = values[key];
        if (typeof value !== 'string') continue;
        if (node.tagName !== 'SELECT' || Array.from(node.options).some(option => option.value === value)) node.value = value;
      }
      byId('iaFilterDetails').open = true;
      syncFilterExpanded();
    }
    pendingMapRestore = saved.map || null;
    if (saved.mapVisible) switchView(true);
    browsingRestored = true;
    browsing.ready(() => {
      byId('iaConversationBody').scrollTo({ top: Number(saved.conversationTop) || 0, behavior: 'instant' });
      byId('iaResults').scrollTo({ top: Number(saved.resultsTop) || 0, behavior: 'instant' });
      scheduleComposer();
    });
  }

  async function callApi(payload) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let response;
    let data;
    try {
      response = await fetch(apiUrl, {
        method: payload ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { Accept: 'application/json', ...(payload ? { 'Content-Type': 'application/json', 'X-CSRF-Token': config.csrfToken || '' } : {}) },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
      try { data = await response.json(); } catch { throw new Error('The server could not complete your search. Please try again.'); }
    } catch (error) {
      if (controller.signal.aborted) throw new Error('This search is taking longer than expected. Try again to check its result.');
      if (error instanceof TypeError) throw new Error('The connection was interrupted. Check your connection and try again.');
      throw error;
    } finally { clearTimeout(timeout); }
    if (!response.ok) {
      const error = new Error(response.status === 419 ? 'Your session needs refreshing. Refresh this page, then try again.' : response.status === 401 || response.status === 403 ? 'Please sign in to your investor account to continue.' : data.error || 'Your search could not finish. Please try again.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function send(change = null, retainedRequest = null) {
    if (busy) return;
    const current = ++sequence;
    const payload = retainedRequest || (change ? { ...change, version: state.version, requestId: requestId() } : null);
    const hadFocus = byId('iaMessage') === document.activeElement;
    clearError();
    setBusy(true);
    if (payload?.message) {
      byId('iaMessages').append(messageNode('user', payload.message, true));
      byId('iaStarters').hidden = true;
      scrollConversation();
    }
    try {
      let data = await callApi(payload);
      if (current !== sequence) return;
      if (!browsingRestored && !payload) {
        const restore = browsingCriteriaRequest(data);
        if (restore) data = await callApi(restore);
        if (current !== sequence) return;
      }
      applyResponse(data);
      failedRequest = null;
      if (payload?.message) byId('iaMessage').value = '';
      if (payload?.reset) { byId('iaMessage').value = ''; closeFilters(false); }
      resizeMessage();
      if (payload?.filters) closeFilters(false);
      if (!browsingRestored) restoreAssistantBrowsing();
      if (payload?.message && mobile.matches) {
        const body = byId('iaConversationBody');
        const bounds = body.getBoundingClientRect();
        const dockTop = root.querySelector('.ia-compose-wrap').getBoundingClientRect().top;
        if (bounds.bottom < 0 || bounds.top > dockTop) body.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      }
      announce(`${data.total ?? cards.length} matching properties. ${data.question || ''}`);
    } catch (error) {
      if (current !== sequence) return;
      byId('iaMessages').querySelectorAll('.ia-message-pending').forEach(element => element.remove());
      if (error.status === 409) {
        try {
          applyResponse(await callApi(null));
          failedRequest = payload ? { ...payload, version: state.version, requestId: requestId() } : null;
          showError('Your search changed in another tab. The latest criteria are loaded. Try again to apply your request.');
        } catch { failedRequest = null; showError('The latest search could not load. Try again to reconnect.'); }
      } else {
        failedRequest = payload;
        showError(error.message, ![401, 403, 419].includes(error.status));
      }
      if (ready && lastResponse) byId('iaResultStatus').textContent = 'Your previous results are still shown.';
    } finally {
      if (current === sequence) {
        setBusy(false);
        if (hadFocus && ready) byId('iaMessage').focus({ preventScroll: true });
      }
    }
  }

  byId('iaMessageForm').addEventListener('submit', event => {
    event.preventDefault();
    const message = byId('iaMessage').value.trim();
    if (message) send({ message });
  });
  byId('iaMessage').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      byId('iaMessageForm').requestSubmit();
    }
  });
  byId('iaReset').addEventListener('click', () => send({ reset: true }));
  byId('iaClearFilters').addEventListener('click', () => send({ filters: emptyCriteria() }));
  byId('iaRetry').addEventListener('click', () => send(null, failedRequest));
  byId('iaEditFilters').addEventListener('click', () => {
    if (byId('iaFilterDetails').open && byId('iaFilterDetails').dataset.scope === 'all') closeFilters();
    else openFilters(null, byId('iaEditFilters'));
  });
  byId('iaComposerFilters').addEventListener('click', () => openFilters('category'));
  byId('iaCloseFilters').addEventListener('click', () => closeFilters());
  byId('iaDismissFilters').addEventListener('click', () => closeFilters());
  byId('iaListView').addEventListener('click', () => switchView(false));
  byId('iaMapView').addEventListener('click', () => switchView(true));
  byId('iaMapFit').addEventListener('click', () => fitMapListings());
  byId('iaMapRetry').addEventListener('click', retryMap);
  byId('iaMapLocations').addEventListener('click', event => {
    const button = event.target.closest('[data-ia-map-property]');
    if (button) selectMapProperty(Number(button.dataset.iaMapProperty), true);
  });
  window.addEventListener('online', () => {
    if (mapVisible && mapBasemap?.getState() === 'unavailable') retryMap();
  });

  function syncFilterExpanded() {
    const panel = byId('iaFilterDetails');
    root.querySelectorAll('.ia-filter-trigger, #iaEditFilters').forEach(button => {
      const expanded = panel.open && (panel.dataset.scope === 'all' ? button.id === 'iaEditFilters' : button === filterOrigin);
      button.setAttribute('aria-expanded', String(expanded));
      button.classList.toggle('is-open', expanded);
    });
  }

  function configureFilterEditor(scope) {
    const names = { all: 'All filters', purpose: 'Buy or lease', category: 'Property type', budget: 'Set your budget', barangay: 'Choose a barangay', area: 'Land area', activity: 'Planned use' };
    byId('iaFilterDetails').dataset.scope = scope;
    byId('iaFilterEditorTitle').textContent = names[scope] || names.all;
    byId('iaFilterForm').classList.toggle('is-contextual', scope !== 'all');
    root.querySelectorAll('[data-ia-group]').forEach(field => { field.hidden = scope !== 'all' && field.dataset.iaGroup !== scope; });
  }

  function closeFilters(returnFocus = true) {
    const origin = filterOrigin;
    byId('iaFilterDetails').open = false;
    fillFilters();
    byId('iaMaxArea').setCustomValidity('');
    configureFilterEditor('all');
    filterOrigin = null;
    syncFilterExpanded();
    if (returnFocus) (origin || byId('iaEditFilters'))?.focus({ preventScroll: true });
  }

  function openFilters(key, origin = null) {
    if (busy || !ready) return;
    const scope = key === null ? 'all' : ({ subcategory: 'category', budgetBasis: 'budget', minArea: 'area', maxArea: 'area' }[key] || key);
    const panel = byId('iaFilterDetails');
    const trigger = origin || (document.activeElement?.closest('button') || byId('iaEditFilters'));
    if (panel.open && filterOrigin === trigger && panel.dataset.scope === scope) { closeFilters(); return; }
    fillFilters();
    byId('iaMaxArea').setCustomValidity('');
    filterOrigin = trigger;
    configureFilterEditor(scope);
    panel.open = true;
    syncFilterExpanded();
    const input = byId(fieldIds[key] || 'iaCategory');
    input?.focus({ preventScroll: true });
    panel.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
  byId('iaFilterDetails').addEventListener('toggle', syncFilterExpanded);
  byId('iaFilterDetails').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeFilters(); }
  });
  document.addEventListener('click', event => {
    // A details navigation keeps the editor draft for Back. Closing here would
    // reset its inputs before pagehide captures the final browsing state.
    const link = event.target.closest('a[href]');
    if (link && /(?:^|\/)property-details\.php(?:\?|$)/.test(link.getAttribute('href') || '')) return;
    if (byId('iaFilterDetails').open && !event.target.closest('.ia-search-tools, [data-ia-edit], #iaComposerFilters')) closeFilters(false);
  });
  byId('iaCategory').addEventListener('change', () => populateSubcategories(byId('iaCategory').value));
  byId('iaSubcategory').addEventListener('change', () => {
    const subtype = byId('iaSubcategory').value;
    if (!subtype || byId('iaCategory').value) return;
    const parent = Object.keys(options.categories).find(category => options.categories[category].includes(subtype));
    if (parent) { byId('iaCategory').value = parent; populateSubcategories(parent, subtype); }
  });
  byId('iaPurpose').addEventListener('change', () => {
    const purpose = byId('iaPurpose').value;
    const basis = byId('iaBudgetBasis').value;
    if (basis && (!purpose || (basis.startsWith('sale_') ? 'sale' : 'lease') !== purpose)) byId('iaBudgetBasis').value = '';
  });
  byId('iaBudgetBasis').addEventListener('change', () => {
    const basis = byId('iaBudgetBasis').value;
    if (basis) byId('iaPurpose').value = basis.startsWith('sale_') ? 'sale' : 'lease';
  });
  byId('iaFilterForm').addEventListener('submit', event => {
    event.preventDefault();
    const filters = emptyCriteria();
    for (const [key, id] of Object.entries(fieldIds)) {
      const value = byId(id).value.trim();
      filters[key] = value === '' ? null : ['budget', 'minArea', 'maxArea'].includes(key) ? Number(value) : value;
    }
    byId('iaMaxArea').setCustomValidity(filters.minArea != null && filters.maxArea != null && filters.minArea > filters.maxArea ? 'Maximum lot size must be at least the minimum lot size.' : '');
    if (!byId('iaFilterForm').reportValidity()) return;
    send({ filters });
  });
  byId('iaMaxArea').addEventListener('input', () => byId('iaMaxArea').setCustomValidity(''));
  byId('iaMinArea').addEventListener('input', () => byId('iaMaxArea').setCustomValidity(''));
  root.addEventListener('click', async event => {
    const quickFilter = event.target.closest('[data-ia-focus]');
    if (quickFilter && !quickFilter.disabled) { openFilters(quickFilter.dataset.iaFocus, quickFilter); return; }
    const prompt = event.target.closest('[data-ia-prompt]');
    if (prompt) { byId('iaMessage').value = prompt.dataset.iaPrompt; send({ message: prompt.dataset.iaPrompt }); return; }
    const detail = event.target.closest('[data-ia-detail]');
    if (detail && !detail.disabled) { send({ message: `Show details for property ${Number(detail.dataset.iaDetail)}` }); return; }
    const edit = event.target.closest('[data-ia-edit]');
    if (edit) {
      openFilters(edit.dataset.iaEdit);
      return;
    }
    const remove = event.target.closest('[data-ia-remove]');
    if (remove) {
      const key = remove.dataset.iaRemove;
      const filters = { ...emptyCriteria(), ...state.criteria, [key]: null };
      if (key === 'category') filters.subcategory = null;
      if (key === 'subcategory') filters.category = null;
      if (key === 'purpose') filters.budgetBasis = null;
      if (key === 'budget') filters.budgetBasis = null;
      if (key === 'minArea') { filters.minArea = null; filters.maxArea = null; }
      send({ filters });
      return;
    }
    const compareButton = event.target.closest('[data-ia-compare]');
    if (compareButton) {
      const id = Number(compareButton.dataset.iaCompare);
      if (compare.includes(id)) setComparison(compare.filter(value => value !== id));
      else if (compare.length < 3) setComparison([...compare, id]);
      else { showError('You can compare up to three properties. Remove one before adding another.', false); return; }
      announce(compare.includes(id) ? 'Property added to comparison.' : 'Property removed from comparison.');
      return;
    }
    const saveButton = event.target.closest('[data-ia-save]');
    if (saveButton && !saveButton.disabled) {
      const id = Number(saveButton.dataset.iaSave);
      saveButton.disabled = true;
      try {
        const response = await fetch(`${config.apiBase || route('api')}/cart.php`, { method: selectedSaveIds.has(id) ? 'DELETE' : 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': config.csrfToken || '' }, body: JSON.stringify({ propertyId: id }) });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.propertyIds)) throw new Error(data.error || 'This property could not be saved. Please try again.');
        selectedSaveIds = new Set(data.propertyIds.filter(validId).map(Number));
        updateSaveButtons();
        window.dispatchEvent(new CustomEvent('locus:assistant-saved', { detail: { propertyIds: [...selectedSaveIds] } }));
        announce(selectedSaveIds.has(id) ? 'Property saved.' : 'Property removed from saved properties.');
      } catch (error) { showError(error.message || 'The property could not be saved.', false); }
      finally { saveButton.disabled = false; }
    }
  });

  function updateSaveButtons() {
    cards.forEach(card => { card.saved = selectedSaveIds.has(Number(card.id)); });
    root.querySelectorAll('[data-ia-save]').forEach(button => {
      const selected = selectedSaveIds.has(Number(button.dataset.iaSave));
      button.setAttribute('aria-pressed', String(selected));
      const card = cards.find(item => Number(item.id) === Number(button.dataset.iaSave));
      button.setAttribute('aria-label', `${selected ? 'Remove saved' : 'Save'} ${card?.name || 'property'}`);
      button.title = selected ? 'Saved property' : 'Save property';
    });
  }
  window.addEventListener('locus:saved-updated', event => {
    if (!Array.isArray(event.detail?.propertyIds)) return;
    selectedSaveIds = new Set(event.detail.propertyIds.filter(validId).map(Number));
    updateSaveButtons();
  });
  window.addEventListener('locus:compare-updated', event => {
    if (Array.isArray(event.detail?.propertyIds)) { compare = uniqueIds(event.detail.propertyIds); renderCompare(); }
  });
  window.addEventListener('storage', event => {
    if (event.key !== compareKey) return;
    try { compare = uniqueIds(JSON.parse(event.newValue || '[]')); renderCompare(); } catch { /* Ignore invalid browser storage. */ }
  });
  send();
}
