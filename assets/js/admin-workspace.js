(() => {
  'use strict';
  const root = document.querySelector('[data-city-workspace]');
  if (!root) return;
  const config = window.SFC_APP_CONFIG || {};
  const apiBase = config.apiBase || `${config.basePath || ''}/api`;
  const governance = root.dataset.listingReviewer === 'true' || (!root.hasAttribute('data-listing-reviewer') && root.dataset.department === 'CICTO');
  const isReviewer = governance || ['ASSESSOR', 'CAO', 'LEBDO'].includes(root.dataset.department);
  const brokerReviewer = root.dataset.brokerReviewer === 'true' || Boolean(config.user?.brokerReviewAuthorized && ['ASSESSOR', 'CAO', 'LEBDO'].includes(root.dataset.department));
  const status = root.querySelector('[data-workspace-status]');
  let properties = [];
  let categories = {};
  let brokers = [];
  let documentRequests = [];
  let documentTargetOpened = false;
  const documentPanel = root.querySelector('#cityDocumentRequests');
  const documentParams = new URLSearchParams(location.search);
  const targetDocumentRequestId = Number(documentParams.get('documentRequestId') || 0);
  const targetDocumentPropertyId = Number(documentParams.get('propertyId') || 0);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const number = (value) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 }).format(Number(value || 0));
  const score = (value) => value == null ? '—' : Number(value).toFixed(1);
  const stateLabel = (state) => ({ approved: 'Approved', pending_review: 'Awaiting review', rejected: 'Declined', archived: 'Archived', draft: 'Draft', verified: 'Verified', suspended: 'Suspended' })[state] || state;
  const isArchived = (property) => Boolean(property.isArchived || property.approvalState === 'archived');
  const isActive = (property) => !property.isDeleted && !isArchived(property) && property.approvalState === 'approved' && ['available','active','open'].includes(String(property.status || '').toLowerCase());
  const purposeLabel = (property) => ({sale:'For Sale',lease:'For Lease',sale_or_lease:'For Sale or Lease'})[property.listingPurpose] || 'For Sale';
  const propertyOperationalStatus = (property) => {
    if (property.isDeleted) return { label: 'Deleted', tone: 'deleted' };
    if (isArchived(property)) return { label: 'Archived', tone: 'archived' };
    if (property.approvalState === 'pending_review') return { label: 'Awaiting review', tone: 'pending' };
    if (property.approvalState === 'rejected') return { label: 'Declined', tone: 'declined' };
    if (['Sold', 'Leased'].includes(property.status)) return { label: property.status, tone: property.status.toLowerCase() };
    if (property.status === 'Reserved') return { label: 'Reserved', tone: 'reserved' };
    if (property.status === 'Unavailable') return { label: 'Unavailable', tone: 'unavailable' };
    return { label: 'Available', tone: 'available' };
  };
  const askingPrice = (property) => {
    const amount = value => value === null || value === undefined || value === '' ? 'Price on request' : `PHP ${number(value)}`;
    const sale = amount(property.salePrice !== undefined ? property.salePrice : property.price);
    const lease = `${amount(property.leasePrice)} / ${property.leasePriceUnit === 'sqm' ? 'm² / ' : ''}${property.leasePeriod || 'month'}`;
    return property.listingPurpose === 'lease' ? lease : property.listingPurpose === 'sale_or_lease' ? `Sale: ${sale} · Lease: ${lease}` : sale;
  };
  const listingTime = value => {
    if (!value) return null;
    const normalized = String(value).replace(' ', 'T');
    const timestamp = Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized) ? normalized : `${normalized}Z`);
    return Number.isFinite(timestamp) ? timestamp : null;
  };
  const listingDate = value => {
    const timestamp = listingTime(value);
    return timestamp === null ? 'Date not recorded' : new Date(timestamp).toLocaleDateString('en-PH', { timeZone:'Asia/Manila', year:'numeric', month:'short', day:'numeric' });
  };
  const path = (route) => `${config.basePath || ''}/${route}`;
  const propertyUrl = (id) => path(`property-details.php?id=${encodeURIComponent(id)}`);
  const imageUrl = (source) => {
    if (/^https?:\/\//i.test(source || '')) return source;
    if (/^assets\//.test(source || '')) return path(source);
    return path('assets/images/sfcView.png');
  };

  async function request(endpoint, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body) headers['X-CSRF-Token'] = config.csrfToken || document.querySelector('meta[name="csrf-token"]')?.content || '';
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${apiBase}/${endpoint}`, { credentials: 'same-origin', ...options, headers });
    const payload = await response.json();
    if (!response.ok) {
      const error = new Error(payload.error || 'Unable to complete the request.');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function message(element, text, error = false) {
    if (!element) return;
    element.textContent = text;
    element.classList.toggle('is-error', error);
  }

  function renderDocumentRequests() {
    if (!documentPanel) return;
    const labels = { requested: 'Requested', in_review: 'In review', fulfilled: 'Fulfilled', declined: 'Declined' };
    const open = documentRequests.filter((item) => ['requested', 'in_review'].includes(item.status)).length;
    documentPanel.querySelector('[data-document-request-count]').textContent = `${open} open`;
    documentPanel.querySelector('[data-document-request-list]').innerHTML = documentRequests.length ? documentRequests.map((item) => {
      const targeted = targetDocumentRequestId ? Number(item.id) === targetDocumentRequestId : (targetDocumentPropertyId && Number(item.propertyId) === targetDocumentPropertyId);
      return `<form class="city-broker-card${targeted ? ' city-evidence' : ''}" id="cityDocumentRequest-${Number(item.id)}" data-document-request="${Number(item.id)}" tabindex="-1">
        <h3>${escape(item.documentName)} <span class="city-pill">${escape(labels[item.status] || item.status)}</span></h3>
        <p><a href="${escape(propertyUrl(item.propertyId))}">${escape(item.propertyName || 'Property')}</a> · ${escape(item.requesterName || 'Investor')}</p>
        ${item.note ? `<p>${escape(item.note)}</p>` : ''}
        <div class="city-form-grid">
          <label>Status<select name="status" aria-label="Request status">${Object.entries(labels).map(([value, label]) => `<option value="${value}"${value === item.status ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
          <label class="city-span-2">Response note<textarea name="responseNote" rows="2" maxlength="3000" placeholder="Document availability or next steps">${escape(item.responseNote || '')}</textarea></label>
        </div>
        <div class="city-dialog-actions"><button type="submit" class="city-button city-button-secondary">Update request</button></div>
        <p class="city-form-message" data-document-response-message role="status"></p>
      </form>`;
    }).join('') : '<p class="city-empty">No document requests.</p>';
    if (!documentTargetOpened && (targetDocumentRequestId || targetDocumentPropertyId || location.hash === '#cityDocumentRequests')) {
      documentTargetOpened = true;
      documentPanel.open = true;
      const target = targetDocumentRequestId
        ? documentPanel.querySelector(`#cityDocumentRequest-${targetDocumentRequestId}`)
        : Array.from(documentPanel.querySelectorAll('[data-document-request]')).find((element) => {
          const item = documentRequests.find((request) => Number(request.id) === Number(element.dataset.documentRequest));
          return Number(item?.propertyId) === targetDocumentPropertyId;
        });
      if (target) target.focus({ preventScroll: true });
      (target || documentPanel).scrollIntoView({ block: 'center' });
      if (targetDocumentRequestId && !target) message(documentPanel.querySelector('[data-document-request-message]'), 'This request is not in your inbox.', true);
    }
  }

  async function loadDocumentRequests() {
    if (!documentPanel) return;
    const data = await request('document-requests.php?scope=inbox');
    documentRequests = data.requests || [];
    renderDocumentRequests();
  }

  documentPanel?.addEventListener('submit', async (event) => {
    const requestForm = event.target.closest('[data-document-request]');
    if (!requestForm) return;
    event.preventDefault();
    const submit = requestForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    const requestId = Number(requestForm.dataset.documentRequest);
    try {
      await request('document-requests.php', { method: 'PATCH', body: JSON.stringify({ requestId, status: requestForm.elements.status.value, responseNote: requestForm.elements.responseNote.value.trim() }) });
      await loadDocumentRequests();
      message(documentPanel.querySelector('[data-document-request-message]'), 'Document request updated.');
      documentPanel.querySelector(`#cityDocumentRequest-${requestId}`)?.focus({ preventScroll: true });
    } catch (error) { message(requestForm.querySelector('[data-document-response-message]'), error.message, true); }
    finally { submit.disabled = false; }
  });

  loadDocumentRequests().catch((error) => {
    if (!documentPanel) return;
    documentPanel.querySelector('[data-document-request-list]').innerHTML = '<p class="city-empty">Requests could not be loaded.</p>';
    message(documentPanel.querySelector('[data-document-request-message]'), error.message, true);
  });

  async function refresh() {
    const data = await request('properties.php');
    properties = (data.properties || []).filter((property) => root.dataset.cityWorkspace === 'properties' || (!property.isDeleted && !isArchived(property)));
    categories = data.categories || {};
    brokers = data.approvedBrokers || [];
    document.querySelectorAll('[data-assessment-method]').forEach((element) => {
      element.textContent = properties[0]?.assessmentMethod || 'Spatial 25%, infrastructure 25%, cost & market 20%, nearby businesses 15%, risk 15%. CLUP zoning is an eligibility gate. Final IAI and ranking require verified evidence.';
    });
    if (root.dataset.cityWorkspace === 'overview') renderOverview();
    else renderProperties();
    message(status, '');
  }

  function renderOverview() {
    if (window.SFCAdminOverview) { window.SFCAdminOverview.renderOverview(properties, config); return; }
    const pending = properties.filter((property) => property.approvalState === 'pending_review');
    const approved = properties.filter((property) => property.approvalState === 'approved');
    const awaitingAssessment = properties.filter((property) => !property.assessmentComplete && property.approvalState !== 'archived');
    const stats = governance
      ? [['All properties', properties.length, 'Across the city catalog', false], ['Awaiting review', pending.length, 'Ready for a city decision', true], ['Published', approved.length, 'Visible to investors', false], ['Needs site evidence', properties.filter((property) => !property.siteVerifiedAt && property.approvalState !== 'archived').length, 'Awaiting site verification', false]]
      : [['All properties', properties.length, 'Across the city catalog', false], ['Needs assessment', awaitingAssessment.length, 'Ready for assessment', false], ['Awaiting review', pending.length, 'Ready for decision', true], ['Available area (m²)', number(approved.filter((property) => property.status === 'Available').reduce((total, property) => total + property.area * 10000, 0)), 'Across city catalog', false]];
    root.querySelector('[data-city-stats]').innerHTML = stats.map(([label, value, desc, isHighlight]) => `
      <div class="tw-flex tw-items-center tw-gap-4 tw-rounded-[28px] ${isHighlight ? 'tw-bg-[#FFFCF6] tw-border-[2.5px] tw-border-[#E8D196] tw-shadow-[0_10px_26px_rgba(232,209,150,0.22)]' : 'tw-bg-white tw-border tw-border-slate-100 tw-shadow-[0_10px_26px_rgba(17,34,77,0.06)]'} tw-p-5 sm:tw-p-6">
        <div>
          <span class="tw-block tw-text-xs tw-font-semibold tw-text-slate-600">${escape(label)}</span>
          <strong class="tw-mt-0.5 tw-block tw-text-[32px] sm:tw-text-[36px] tw-font-black tw-leading-tight tw-tracking-tight tw-text-slate-900">${escape(value)}</strong>
          <span class="tw-mt-0.5 tw-block tw-text-[11px] ${isHighlight ? 'tw-text-[#B45309] tw-font-semibold' : 'tw-text-slate-400'}">${escape(desc)}</span>
        </div>
      </div>`).join('');
    const queue = governance ? pending : awaitingAssessment;
    root.querySelector('[data-overview-listings]').innerHTML = queue.length
      ? queue.slice(0, 3).map((property) => `
        <article class="tw-flex tw-items-center tw-justify-between tw-gap-3.5 tw-rounded-[22px] tw-bg-[#EEF1F6] tw-p-3 sm:tw-p-4 tw-mb-3 hover:tw-bg-[#E5EAEF] tw-transition-all">
          <div class="tw-flex tw-items-center tw-gap-3.5 tw-min-w-0">
            <img class="tw-h-16 tw-w-16 sm:tw-h-[68px] sm:tw-w-[68px] tw-rounded-[18px] tw-object-cover tw-shadow-sm tw-shrink-0" src="${escape(imageUrl(property.imageUrl))}" alt="" loading="lazy">
            <div class="tw-min-w-0">
              <h3 class="tw-m-0 tw-truncate tw-text-xs sm:tw-text-sm tw-font-bold tw-text-slate-900">${escape(property.name)}</h3>
              <p class="tw-mb-0 tw-mt-0.5 tw-text-[11px] sm:tw-text-xs tw-text-slate-500">${escape(property.barangay || property.category)} · ${property.area > 0 ? `${number(property.area * 10000)} m²` : 'Area not provided'}</p>
              <span class="tw-mt-1.5 tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-[#FEF3C7] tw-px-3 tw-py-0.5 tw-text-[10px] sm:tw-text-[11px] tw-font-bold tw-text-[#92400E]">
                <span class="tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-amber-500"></span>
                ${governance ? 'Awaiting review' : 'Source scores pending'}
              </span>
            </div>
          </div>
          <a class="tw-inline-flex tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-slate-200/90 tw-bg-white tw-px-5 tw-py-2 tw-text-xs tw-font-bold tw-text-slate-800 tw-shadow-sm hover:tw-bg-slate-50 tw-transition-all tw-shrink-0 tw-no-underline" href="${escape(path(`admin-properties.php?edit=${property.id}`))}">Review &rarr;</a>
        </article>`).join('')
      : '<p class="city-empty">All caught up.</p>';
    const ranked = approved.filter((property) => property.rank_eligible === true).sort((a, b) => String(a.comparison_key).localeCompare(String(b.comparison_key)) || b.unrounded_total - a.unrounded_total).slice(0, 5);
    root.querySelector('[data-assessment-ranking]').innerHTML = ranked.length
      ? `<table class="city-ranking-table"><thead><tr><th>Property</th><th>MCE</th><th>IAI</th></tr></thead><tbody>${ranked.map((property) => `<tr><td><a href="${escape(propertyUrl(property.id))}">${escape(property.name)}</a></td><td>${score(property.mceScore)} <small>#${property.mceRank}</small></td><td>${score(property.iaiScore)} <small>#${property.iaiRank}</small></td></tr>`).join('')}</tbody></table>`
      : '<p class="city-empty">Rankings appear after department assessment.</p>';
  }

  function renderProperties() {
    const query = (root.querySelector('[data-property-search]')?.value || '').toLowerCase();
    const state = root.querySelector('[data-property-state]')?.value || 'latest';
    const retained = properties.filter((property) => !property.isDeleted);
    const filtered = properties.filter((property) => {
      const matchesState = state === 'deleted' ? property.isDeleted
        : !property.isDeleted && (state === 'latest' || state === 'all' || (state === 'archived' ? isArchived(property)
          : !isArchived(property) && (state === 'active' ? isActive(property) : state === property.approvalState || state === property.status)));
      return matchesState && `${property.name} ${property.barangay || ''} ${property.category} ${property.subcategory || ''} ${purposeLabel(property)}`.toLowerCase().includes(query);
    }).sort((a,b) => (listingTime(b.createdAt) ?? -Infinity) - (listingTime(a.createdAt) ?? -Infinity) || Number(b.id) - Number(a.id));
    const summary = root.querySelector('[data-property-summary]');
    const views = [['Latest Listings', retained.length, 'latest'], ['Active Listings', properties.filter(isActive).length, 'active'], ['Sold Listings', retained.filter(property => !isArchived(property) && property.status === 'Sold').length, 'Sold'], ['Leased Listings', retained.filter(property => !isArchived(property) && property.status === 'Leased').length, 'Leased'], ['Archived Listings', retained.filter(isArchived).length, 'archived'], ['Deleted Listings', properties.filter(property => property.isDeleted).length, 'deleted']];
    const statIcons = {
      latest: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h11"/></svg>',
      active: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      Sold: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      Leased: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
      archived: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
      deleted: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
    };
    const statHints = {
      latest: 'All recorded',
      active: 'Live in catalog',
      Sold: 'Completed deals',
      Leased: 'Active leases',
      archived: 'Hidden listings',
      deleted: 'Retained records'
    };
    if (summary) {
      summary.innerHTML = views.map(([label, value, filter]) => `
        <button type="button" class="city-property-stat stat-theme-${filter.toLowerCase()}" data-property-filter="${filter}" aria-pressed="${state === filter}">
          <div class="city-stat-top">
            <span class="city-stat-label">${escape(label)}</span>
            <span class="city-stat-icon-wrap" aria-hidden="true">${statIcons[filter] || ''}</span>
          </div>
          <div class="city-stat-bottom">
            <strong class="city-stat-value">${value}</strong>
            <span class="city-stat-hint">${statHints[filter] || ''}</span>
          </div>
        </button>
      `).join('');
    }
    const viewTitle = root.querySelector('[data-property-view-title]');
    if (viewTitle) viewTitle.textContent = views.find(([, , filter]) => filter === state)?.[0] || root.querySelector('[data-property-state] option:checked')?.textContent || 'Listings';
    const viewDescription = root.querySelector('[data-property-view-description]');
    if (viewDescription) viewDescription.textContent = ({latest:'Listings ordered by creation date, newest first. Deleted listings have a separate view.',active:'Approved, available properties advertised in public listings, ordered newest first.',Sold:'Sold properties are kept for reference and are excluded from public listings.',Leased:'Leased properties are kept for reference and are excluded from public listings.',archived:'Archived properties are hidden from public listings. Unarchive to restore their prior listing status.',deleted:'Deleted properties are retained with their history. Restore to preserve their prior listing and archive status.'})[state] || 'Listings ordered by creation date, newest first.';
    const resultCount = root.querySelector('[data-property-result-count]');
    if (resultCount) resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'listing' : 'listings'} shown.`;
    const countPill = root.querySelector('[data-property-count-pill]');
    if (countPill) countPill.textContent = `${filtered.length} ${filtered.length === 1 ? 'listing' : 'listings'}`;
    root.querySelector('[data-property-list]').innerHTML = filtered.length ? filtered.map((property) => {
      const statusInfo = propertyOperationalStatus(property);
      const assessment = window.SFCPropertyEditorTools.listingAssessment(property);
      const assessmentCriteria = [
        ['spatial_accessibility', 'Spatial access'],
        ['infrastructure_readiness', 'Infrastructure'],
        ['property_cost_market_competitiveness', 'Cost & market'],
        ['nearby_businesses', 'Nearby businesses'],
        ['risk_constraints', 'Risk & hazards']
      ];
      const assessmentProgress = assessmentCriteria.map(([key, label]) => {
        const rating = property.screeningAssessment?.criteria?.[key]?.score;
        const ready = assessment.kind === 'verified' || (typeof rating === 'number' && Number.isFinite(rating) && rating >= 0 && rating <= 100);
        return `<span class="${ready ? 'is-ready' : ''}" title="${escape(label)}: ${ready ? 'calculated' : 'input needed'}"></span>`;
      }).join('');
      const assessmentAction = assessment.kind === 'incomplete' ? 'Continue assessment' : assessment.kind === 'hold' ? 'Review assessment' : 'View assessment';
      const nextCriterion = assessment.kind === 'incomplete' ? assessmentCriteria.find(([key]) => property.screeningAssessment?.criteria?.[key]?.score == null)?.[0] : '';
      const priceText = askingPrice(property);
      return `
      <article class="city-listing-card" data-listing-id="${property.id}">
        <a class="city-listing-photo" href="${escape(propertyUrl(property.id))}" tabindex="-1" aria-hidden="true">
          <img src="${escape(imageUrl(property.imageUrl))}" alt="" loading="lazy" onerror="this.onerror=null; this.src='${escape(path('assets/images/sfcView.png'))}';">
          <span>${escape(property.category || 'Property')}</span>
        </a>
        <div class="city-listing-main">
          <div class="city-listing-eyebrow">
            <span class="city-status-chip city-status-${escape(statusInfo.tone)}">
              <span class="city-status-dot" aria-hidden="true"></span>
              <span>${escape(statusInfo.label)}</span>
            </span>
            <span class="city-listing-purpose">${escape(purposeLabel(property))}</span>
          </div>
          <h3 class="city-listing-title">
            <a href="${escape(propertyUrl(property.id))}">${escape(property.name)}</a>
          </h3>
          <p class="city-listing-location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
            <span>${escape(property.barangay || property.city || 'Location pending')}</span>
            ${property.subcategory ? `<span aria-hidden="true">·</span><span>${escape(property.subcategory)}</span>` : ''}
          </p>
          <div class="city-listing-facts">
            <strong class="${priceText.startsWith('Price on request') ? 'is-price-request' : ''}">${escape(priceText)}</strong>
            <span class="city-listing-area"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></svg>${property.area > 0 ? `${number(property.area * 10000)} m²` : 'Area not specified'}${property.area >= 1 ? ` <small>(${number(property.area)} ha)</small>` : ''}</span>
          </div>
        </div>
        <button type="button" class="city-listing-assessment is-${assessment.kind}" data-listing-assessment="${property.id}" data-assessment-next="${nextCriterion || ''}" aria-label="${assessmentAction} for ${escape(property.name)}. ${assessment.score === null ? `${assessment.count} of 5 criteria calculated` : `${assessment.score.toFixed(1)} out of 100`}. ${escape(assessment.status)}.">
          <span class="city-listing-assessment-heading"><span class="city-listing-score-label">${assessment.label}</span><span class="city-listing-score-status">${escape(assessment.status)}</span></span>
          <span class="city-listing-score-value">${assessment.score === null ? assessment.count : assessment.score.toFixed(1)}<small>${assessment.score === null ? '/ 5 criteria' : '/ 100'}</small></span>
          <span class="city-listing-progress" aria-hidden="true">${assessmentProgress}</span>
          <span class="city-listing-score-note">${assessment.score === null ? escape(assessment.reason) : '5 of 5 criteria calculated'}</span>
          <span class="city-listing-score-link">${assessmentAction}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></span>
        </button>
        <div class="city-listing-footer">
          <p class="city-listing-created">
            <span>Created ${escape(listingDate(property.createdAt))}</span>
            ${isArchived(property) ? `<span>Archived ${escape(listingDate(property.archivedAt))}</span>` : ''}
            ${property.isDeleted ? `<span>Deleted ${escape(listingDate(property.deletedAt))}</span>` : ''}
          </p>
          <div class="city-listing-actions">
          ${property.isDeleted ? `
            <button class="city-listing-action" type="button" data-property-lifecycle="restore" data-property-id="${property.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              <span>Restore property</span>
            </button>
          ` : `
            ${isReviewer && !isArchived(property) ? `
              <button class="city-listing-action is-primary" type="button" data-review-property="${property.id}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <span>Review</span>
              </button>
            ` : ''}
            <button class="city-listing-action" type="button" data-edit-property="${property.id}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span>Edit details</span>
            </button>
            <details class="city-property-menu city-listing-menu">
              <summary aria-label="Manage ${escape(property.name)}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span>Manage</span>
                <svg class="city-menu-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
              </summary>
              <div class="city-menu-dropdown">
                ${isArchived(property) ? `
                  <button type="button" class="city-menu-item" data-property-lifecycle="unarchive" data-property-id="${property.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="m10 12 2-2 2 2"/><path d="M12 10v6"/></svg>
                    <span>Unarchive property</span>
                  </button>
                ` : `
                  ${['Available', 'Unavailable', 'Reserved', 'Sold', 'Leased'].filter((availability) => availability !== property.status).map((availability) => `
                    <button type="button" class="city-menu-item" data-property-lifecycle="availability" data-property-id="${property.id}" data-availability="${availability}">
                      <span class="city-menu-item-dot city-availability-${availability.toLowerCase()}"></span>
                      <span>Mark ${availability.toLowerCase()}</span>
                    </button>
                  `).join('')}
                  <button type="button" class="city-menu-item" data-property-lifecycle="archive" data-property-id="${property.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                    <span>Archive property</span>
                  </button>
                `}
                <button class="city-menu-item city-property-delete" type="button" data-property-lifecycle="delete" data-property-id="${property.id}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <span>Delete property</span>
                </button>
              </div>
            </details>
          `}
          </div>
        </div>
      </article>`;
    }).join('') : '<div class="city-empty-state tw-rounded-[24px] tw-border tw-border-dashed tw-border-slate-300 tw-bg-white tw-p-12 tw-text-center"><p class="tw-m-0 tw-text-base tw-font-semibold tw-text-[#11224d]">No properties found</p><p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-500">Try adjusting your search terms or selecting a different listing view.</p></div>';
  }

  root.addEventListener('click', (event) => {
    const filter = event.target.closest('[data-property-filter]');
    if (filter) {
      root.querySelector('[data-property-state]').value = filter.dataset.propertyFilter;
      renderProperties();
    }
    const action = event.target.closest('[data-property-lifecycle]');
    if (!action) return;
    const property = properties.find((item) => item.id === Number(action.dataset.propertyId));
    const dialog = document.querySelector('#cityLifecycleDialog');
    if (!property || !dialog) return;
    const form = dialog.querySelector('form');
    form.elements.id.value = property.id;
    form.elements.action.value = action.dataset.propertyLifecycle;
    form.elements.status.value = action.dataset.availability || '';

    const lifecycleAction = action.dataset.propertyLifecycle;
    const cancelBtn = dialog.querySelector('[data-lifecycle-cancel]');
    const submitBtn = form.querySelector('[type="submit"]');
    const iconBadge = dialog.querySelector('[data-lifecycle-icon-badge]');
    const impactBox = dialog.querySelector('[data-lifecycle-impact]');
    const kickerEl = dialog.querySelector('[data-lifecycle-kicker]');
    const safeguardTextEl = dialog.querySelector('[data-lifecycle-safeguard-text]');

    dialog.querySelector('[data-lifecycle-property]').textContent = property.name || 'Untitled property';
    const thumbEl = dialog.querySelector('[data-lifecycle-thumb]');
    if (thumbEl) {
      thumbEl.src = imageUrl(property.imageUrl);
      thumbEl.alt = property.name || 'Property thumbnail';
    }
    const locationEl = dialog.querySelector('[data-lifecycle-location]');
    if (locationEl) {
      locationEl.textContent = property.barangay || property.city || 'San Fernando';
    }
    const priceEl = dialog.querySelector('[data-lifecycle-price]');
    if (priceEl) {
      priceEl.textContent = askingPrice(property) || 'Price on request';
    }
    const categoryEl = dialog.querySelector('[data-lifecycle-category]');
    if (categoryEl) {
      categoryEl.textContent = property.category || property.type || 'Commercial';
    }

    if (cancelBtn) {
      cancelBtn.textContent = lifecycleAction === 'delete' ? 'Keep property' : 'Cancel';
    }

    const icons = {
      delete: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
      restore: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
      archive: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
      unarchive: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="m10 12 2-2 2 2"/><path d="M12 10v6"/></svg>',
      availability: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    };

    const copy = {
      delete:[
        'Delete listing?',
        'This moves the listing to Deleted Listings and removes it from public catalog results. Its listing status, archive state, evidence and history are retained, and authorized staff can restore it later.',
        'Delete property',
        'Delete Listing',
        'Retained in Deleted Listings — authorized staff can restore anytime.'
      ],
      restore:[
        'Restore this property?',
        `The property will return with its retained ${property.status} status${isArchived(property) ? ' and remain archived' : ''}. It will appear publicly only when available, approved and unarchived.`,
        'Restore property',
        'Restore Listing',
        'Listing will be restored with all prior reviews and history intact.'
      ],
      archive:[
        'Archive this property?',
        'The property will leave public listings. Its listing status, review decision, evidence and history are retained for later unarchiving.',
        'Archive property',
        'Archive Listing',
        'Listing will be hidden from public catalog but preserved in archive.'
      ],
      unarchive:[
        'Unarchive this property?',
        `The property will return with its prior ${property.status} status. It will appear publicly only when available and approved.`,
        'Unarchive property',
        'Unarchive Listing',
        'Listing will be reactivated from the archive with its preserved state.'
      ],
      availability:[
        `Mark as ${String(action.dataset.availability || '').toLowerCase()}?`,
        action.dataset.availability === 'Available' ? 'The listing will be visible to investors when approved and unarchived.' : 'The property will leave public listings. Its evidence and history are retained, and you can change its listing status later.',
        'Update listing status',
        'Update Availability',
        'Listing status will be updated immediately across the catalog.'
      ],
    }[lifecycleAction];
    if (!copy) return;

    if (iconBadge) {
      iconBadge.className = `city-lifecycle-icon-badge theme-${lifecycleAction}`;
      iconBadge.innerHTML = icons[lifecycleAction] || icons.availability;
    }
    if (impactBox) {
      impactBox.className = `city-lifecycle-impact theme-${lifecycleAction}`;
    }
    if (kickerEl) {
      kickerEl.textContent = copy[3];
    }
    if (safeguardTextEl) {
      safeguardTextEl.textContent = copy[4];
    }

    dialog.querySelector('[data-lifecycle-title]').textContent = copy[0];
    dialog.querySelector('[data-lifecycle-description]').textContent = copy[1];

    if (submitBtn) {
      submitBtn.textContent = copy[2];
      submitBtn.className = `city-button city-lifecycle-submit-btn ${lifecycleAction === 'delete' ? 'btn-theme-delete' : lifecycleAction === 'restore' ? 'btn-theme-restore' : 'btn-theme-primary'}`;
    }
    message(form.querySelector('[data-lifecycle-message]'), '');
    dialog.showModal();
  });

  document.querySelector('#cityLifecycleDialog')?.addEventListener('click', (event) => {
    if (event.target.id === 'cityLifecycleDialog') {
      event.target.close();
    }
  });

  document.querySelector('[data-lifecycle-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    const dialog = form.closest('dialog');
    const cancelBtn = dialog?.querySelector('[data-lifecycle-cancel]');
    const action = form.elements.action.value;
    const targetId = Number(form.elements.id.value);
    submit.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    const originalText = submit.textContent;
    if (action === 'delete') {
      submit.innerHTML = '<span class="locus-spinner locus-spinner-dark tw-mr-1.5"></span>Deleting…';
    } else {
      submit.innerHTML = '<span class="locus-spinner locus-spinner-dark tw-mr-1.5"></span>Updating…';
    }
    try {
      await request(`property.php?id=${encodeURIComponent(targetId)}`, { method: action === 'delete' ? 'DELETE' : 'PATCH', body: JSON.stringify({ action, status: form.elements.status.value }) });
      const row = Array.from(root.querySelectorAll('[data-property-list] article')).find(el => el.querySelector(`[data-property-id="${targetId}"]`));
      if (row && action === 'delete') {
        row.classList.add('is-deleting-collapse');
      }
      dialog?.close();
      if (action === 'delete') {
        await new Promise(resolve => setTimeout(resolve, 220));
      }
      await refresh();
      if (action === 'delete') {
        status.innerHTML = `<span>Property deleted.</span> <button type="button" class="city-undo-btn tw-ml-2 tw-underline tw-font-semibold tw-text-[#11224d] hover:tw-text-[#9e1b22] tw-cursor-pointer" data-undo-restore="${targetId}">Undo</button>`;
      } else {
        message(status, ({restore:'Property restored with its prior listing status.',archive:'Property archived.',unarchive:'Property unarchived with its prior listing status.',availability:'Property listing status updated.'})[action] || 'Property updated.');
      }
    } catch (error) {
      message(form.querySelector('[data-lifecycle-message]'), error.message || 'The property action could not be completed.', true);
    } finally {
      submit.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      if (action === 'delete') {
        submit.textContent = 'Delete property';
      } else {
        submit.textContent = originalText;
      }
    }
  });

  root.addEventListener('click', async (event) => {
    const undo = event.target.closest('[data-undo-restore]');
    if (undo) {
      const undoId = Number(undo.dataset.undoRestore);
      undo.disabled = true;
      undo.textContent = 'Restoring…';
      try {
        await request(`property.php?id=${encodeURIComponent(undoId)}`, { method: 'PATCH', body: JSON.stringify({ action: 'restore' }) });
        await refresh();
        message(status, 'Property restored with its prior listing status.');
      } catch (err) {
        message(status, err.message || 'Unable to restore property.', true);
      }
    }
  });

  async function loadBrokerReviews() {
    const panel = root.querySelector('[data-broker-reviews]');
    if (!panel) return;
    try {
      const data = await request('seller-profiles.php?scope=queue');
      const profiles = (data.profiles || []).filter((profile) => ['pending_review', 'verified', 'corrections_requested', 'rejected', 'blocked', 'suspended'].includes(profile.applicationStatus));
      if (window.SFCAdminOverview?.renderBrokerProfiles) { panel.innerHTML = window.SFCAdminOverview.renderBrokerProfiles(profiles, config); return; }
      panel.innerHTML = '<p class="city-empty">Broker review tools could not be loaded. Reload before reviewing an application.</p>';
    } catch (error) {
      panel.innerHTML = `<p class="city-empty">${escape(error.message)}</p>`;
    }
  }

  const editor = document.getElementById('cityPropertyEditor');
  const form = editor?.querySelector('[data-property-form]');
  const reviewDialog = document.getElementById('cityReviewDialog');
  const reviewForm = reviewDialog?.querySelector('[data-listing-review-form]');
  const nearby = window.SFCNearby?.(form?.querySelector('[data-nearby-editor]'));
  const automaticAssessment = window.SFCAutomaticAssessment?.(form, { apiBase, dialog: editor });
  const propertyWizard = window.SFCPropertyWizard?.(form, { apiBase, dialog: editor, assessment: automaticAssessment });
  propertyWizard?.setNearby(nearby);
  const locationEditor = propertyWizard || window.SFCAdminLocation?.(form, { apiBase, dialog: editor });
  const editorLastStep = form ? Math.max(0, form.querySelectorAll('[data-editor-panel]').length - 1) : (propertyWizard ? 3 : 2);
  let editorStep = 0;

  function setEditorStep(step) {
    editorStep = step;
    form.querySelectorAll('[data-editor-panel]').forEach((panel) => { panel.hidden = Number(panel.dataset.editorPanel) !== step; });
    form.querySelectorAll('[data-editor-step]').forEach((button) => {
      const stepIdx = Number(button.dataset.editorStep);
      const active = stepIdx === step;
      button.setAttribute('aria-current', active ? 'step' : 'false');
      button.classList.toggle('is-active', active);
      let isComplete = false;
      if (stepIdx === 2) {
        isComplete = propertyWizard?.areCriteriaInputsComplete ? propertyWizard.areCriteriaInputsComplete() : false;
      } else {
        isComplete = stepIdx < step;
      }
      button.classList.toggle('is-complete', isComplete);
    });
    form.querySelectorAll('[data-editor-back]').forEach((btn) => {
      btn.disabled = step === 0;
      btn.classList.toggle('tw-opacity-40', step === 0);
    });
    form.querySelectorAll('[data-editor-next]').forEach((btn) => {
      btn.hidden = step === editorLastStep;
    });
    form.querySelectorAll('[type="submit"]').forEach((btn) => {
      btn.hidden = step !== editorLastStep;
    });
    const progressEl = form.querySelector('[data-editor-progress]');
    if (progressEl) progressEl.textContent = `Step ${step + 1} of ${editorLastStep + 1}`;
    if (propertyWizard) {
      if (step === 2 && propertyWizard.updateFooterNextLabel) {
        propertyWizard.updateFooterNextLabel();
      } else {
        form.querySelectorAll('[data-editor-next]').forEach((nextButton) => {
          const nextLabel = nextButton.querySelector('[data-editor-next-label]') || nextButton;
          if (nextLabel) {
            nextLabel.textContent = step === 0 ? 'Continue to location' : (step === 1 ? 'Continue to assessment' : (step === 2 ? 'Continue to Review' : 'Continue'));
          }
        });
      }
    }

    // Context-appropriate submit action label
    const isExisting = Boolean(form?.elements?.id?.value);
    let submitLabelText = 'Submit for review';
    if (isExisting) {
      const activeProp = properties.find((item) => String(item.id) === String(form.elements.id.value));
      const approvalState = (activeProp?.approvalState || activeProp?.approval_state || '').toLowerCase();
      if (['rejected', 'requires_resubmission'].includes(approvalState)) {
        submitLabelText = 'Resubmit for review';
      } else if (['approved', 'active', 'published'].includes(approvalState)) {
        submitLabelText = 'Save changes';
      }
    }
    form.querySelectorAll('[data-editor-submit-label]').forEach(el => { el.textContent = submitLabelText; });
    const skip = form.querySelector('[data-skip-enrichment]');
    if (skip) skip.hidden = ![1,2].includes(step);
    (form.querySelector('.pw-content') || editor).scrollTop = 0;
    if (step === 2) {
      const evidenceDisc = form.querySelector('[data-evidence-editor]');
      if (evidenceDisc) evidenceDisc.open = true;
    }
    if (propertyWizard) propertyWizard.onStep(step);
    else {
      if (step === 2) automaticAssessment?.refresh();
      if (step === 1) locationEditor?.sync();
    }
  }

  function validateEditor(container = form) {
    if (!container) return true;
    const step = container === form ? null : Number(container.dataset.editorPanel);
    if ((step === null || step === 0) && propertyWizard?.validateBasics && !propertyWizard.validateBasics()) {
      setEditorStep(0);
      return false;
    }
    if ((step === null || step === 1) && !validateBoundary()) return false;
    const invalid = Array.from(container.querySelectorAll('input,select,textarea')).find((field) => !field.disabled && !field.checkValidity());
    if (!invalid) return true;
    const panel = invalid.closest('[data-editor-panel]');
    if (panel) setEditorStep(Number(panel.dataset.editorPanel));
    if (['lat','lng'].includes(invalid.name)) form.querySelector('[data-location-method="pin"]')?.click();
    for (let parent = invalid.parentElement; parent && parent !== form; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    const evidencePanel = invalid.closest('[data-evidence-panel]');
    if (evidencePanel) form.querySelector(`[data-evidence-tab="${evidencePanel.dataset.evidencePanel}"]`)?.click();
    const utilityPanel = invalid.closest('[data-util-pane]');
    if (utilityPanel) form.querySelector(`[data-util-tab="${utilityPanel.dataset.utilPane}"]`)?.click();
    invalid.focus();
    invalid.reportValidity();
    return false;
  }

  function validateBoundary() {
    if (!propertyWizard || propertyWizard.validateBoundary()) return true;
    setEditorStep(1);
    return false;
  }

  form?.querySelectorAll('[data-editor-next]').forEach((btn) => btn.addEventListener('click', () => {
    if (!validateEditor(form.querySelector(`[data-editor-panel="${editorStep}"]`))) return;
    if (editorStep === 2 && propertyWizard?.onFooterNext) {
      const shouldAdvance = propertyWizard.onFooterNext();
      if (!shouldAdvance) return;
    }
    if (editorStep === 3 && propertyWizard && !propertyWizard.validateSurroundings()) return;
    setEditorStep(Math.min(editorLastStep, editorStep + 1));
  }));
  form?.querySelectorAll('[data-editor-back]').forEach((btn) => btn.addEventListener('click', () => {
    if (editorStep === 2 && propertyWizard?.onFooterBack) {
      const shouldGoPrev = propertyWizard.onFooterBack();
      if (!shouldGoPrev) return;
    }
    setEditorStep(Math.max(0, editorStep - 1));
  }));
  form?.querySelector('[data-skip-enrichment]')?.addEventListener('click', () => {
    if (!validateEditor()) return;
    setEditorStep(editorLastStep);
  });
  form?.querySelectorAll('[data-editor-step]').forEach((button) => button.addEventListener('click', () => {
    const target = Number(button.dataset.editorStep);
    for (let step = 0; step < target; step++) {
      if (!validateEditor(form.querySelector(`[data-editor-panel="${step}"]`))) return;
      if (step === 3 && propertyWizard && !propertyWizard.validateSurroundings()) return;
    }
    setEditorStep(target);
  }));

  // --- 1. Asking price auto-formatting with commas ---
  const priceInput = form?.querySelector('[data-price-input]');
  function formatPriceField(input) {
    if (!input) return;
    const original = input.value;
    const cursorPos = input.selectionStart || 0;
    const digitsBeforeCursor = original.slice(0, cursorPos).replace(/\D/g, '').length;
    const raw = original.replace(/,/g, '');
    if (!/^\d*$/.test(raw)) return;
    if (!raw) {
      input.value = '';
      return;
    }
    const formatted = raw.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    input.value = formatted;
    let newCursorPos = 0;
    let digitsFound = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) digitsFound++;
      if (digitsFound === digitsBeforeCursor) {
        newCursorPos = i + 1;
        break;
      }
    }
    if (digitsBeforeCursor === 0) newCursorPos = 0;
    if (digitsFound < digitsBeforeCursor) newCursorPos = formatted.length;
    try { input.setSelectionRange(newCursorPos, newCursorPos); } catch {}
  }
  form?.querySelectorAll('[data-price-input]').forEach(input => input.addEventListener('input', () => formatPriceField(input)));

  // --- 2. Area input group & dynamic auto-conversion helper ---
  const areaInput = form?.querySelector('[data-area-input]');
  const areaUnit = form?.querySelector('[data-area-unit]');
  const areaCalc = form?.querySelector('[data-area-calc]');
  let displayedAreaUnit = areaUnit?.value || 'sqm';

  function updateAreaCalculation() {
    if (!areaInput || !areaUnit || !areaCalc) return;
    const rawVal = Number(areaInput.value);
    const unit = areaUnit.value;
    displayedAreaUnit = unit;
    areaInput.min = propertyWizard ? (unit === 'sqm' ? '0.5' : '0.00005') : (unit === 'sqm' ? '1' : '0.0001');
    areaInput.step = propertyWizard ? 'any' : (unit === 'sqm' ? '1' : '0.0001');
    if (!Number.isFinite(rawVal) || rawVal <= 0) {
      areaCalc.textContent = areaInput.value.trim() ? 'Enter a valid positive area.' : 'Leave blank if the area is not known.';
      return;
    }
    const squareMetres = unit === 'sqm' ? rawVal : rawVal * 10000;
    if (!Number.isFinite(squareMetres)) { areaCalc.textContent = 'Enter a valid positive area.'; return; }
    const format = value => value.toLocaleString('en-PH', { maximumFractionDigits: 6 });
    areaCalc.textContent = `${format(squareMetres)} m² = ${format(squareMetres / 10000)} ha`;
  }
  areaInput?.addEventListener('input', updateAreaCalculation);
  areaUnit?.addEventListener('change', () => {
    if (propertyWizard) { displayedAreaUnit = areaUnit.value; return; }
    const rawVal = Number(areaInput?.value);
    if (areaInput?.value.trim() && Number.isFinite(rawVal) && rawVal > 0 && displayedAreaUnit !== areaUnit.value) {
      const converted = rawVal * (areaUnit.value === 'sqm' ? 10000 : 0.0001);
      if (Number.isFinite(converted)) areaInput.value = String(Number(converted.toPrecision(15)));
    }
    updateAreaCalculation();
    areaInput?.dispatchEvent(new Event('input', {bubbles:true}));
  });

  // --- 3. Subcategory multi-select dropdown checklist ---
  const subcatWrapper = form?.querySelector('[data-subcategory-wrapper]');
  const subcatTrigger = subcatWrapper?.querySelector('[data-subcategory-trigger]');
  const subcatPopover = subcatWrapper?.querySelector('[data-subcategory-popover]');
  const subcatGrid = subcatWrapper?.querySelector('[data-subcategory-grid]');
  const subcatTriggerText = subcatWrapper?.querySelector('[data-subcategory-trigger-text]');
  const subcatCount = subcatWrapper?.querySelector('[data-subcategory-count]');
  const subcatTags = subcatWrapper?.querySelector('[data-subcategory-tags]');
  const subcatInput = subcatWrapper?.querySelector('[data-subcategory-input]');
  const subcatCaret = subcatWrapper?.querySelector('[data-subcategory-caret]');
  let selectedSubcategories = new Set();

  function toggleSubcatPopover(open = null) {
    if (!subcatPopover || !subcatTrigger) return;
    const isOpen = open !== null ? open : subcatPopover.classList.contains('tw-hidden');
    subcatPopover.classList.toggle('tw-hidden', !isOpen);
    subcatTrigger.setAttribute('aria-expanded', String(isOpen));
    if (subcatCaret) subcatCaret.classList.toggle('tw-rotate-180', isOpen);
  }

  subcatTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSubcatPopover();
  });

  document.addEventListener('click', (e) => {
    if (subcatWrapper && !subcatWrapper.contains(e.target)) {
      toggleSubcatPopover(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && subcatPopover && !subcatPopover.classList.contains('tw-hidden')) {
      toggleSubcatPopover(false);
      subcatTrigger?.focus();
    }
  });

  function renderSubcategoryTags(sync = true) {
    if (!subcatTags || !subcatInput || !subcatTriggerText || !subcatCount) return;
    if (sync && propertyWizard?.setAdditionalSubcategories) {
      propertyWizard.setAdditionalSubcategories(Array.from(selectedSubcategories));
      selectedSubcategories = new Set(propertyWizard.getClassification().additional);
    }
    const list = Array.from(selectedSubcategories);
    const serialized = list.join(', ');
    if (subcatInput.value !== serialized) {
      subcatInput.value = serialized;
      subcatInput.dispatchEvent(new Event('input', {bubbles:true}));
    }

    if (list.length === 0) {
      subcatTriggerText.textContent = 'Select additional classifications...';
      subcatTriggerText.className = 'tw-truncate tw-text-sm tw-text-slate-500';
      subcatCount.textContent = 'Optional · multi-select';
      subcatTags.innerHTML = '';
      return;
    }

    subcatTriggerText.textContent = `${list.length} additional classification${list.length === 1 ? '' : 's'} selected`;
    subcatTriggerText.className = 'tw-truncate tw-text-sm tw-font-medium tw-text-[#11224d]';
    subcatCount.textContent = `${list.length} selected`;

    subcatTags.innerHTML = list.map((tag) => `
      <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-amber-50 tw-px-2.5 tw-py-1 tw-text-[11px] tw-font-semibold tw-text-amber-900 tw-border tw-border-amber-200/80">
        ${escape(tag)}
        <button type="button" class="tw-ml-0.5 tw-inline-flex tw-h-3.5 tw-w-3.5 tw-items-center tw-justify-center tw-rounded-full tw-text-amber-700 hover:tw-bg-amber-200/60 hover:tw-text-amber-950 focus:tw-outline-none" data-remove-subcat="${escape(tag)}" aria-label="Remove ${escape(tag)}">×</button>
      </span>
    `).join('');

    subcatTags.querySelectorAll('[data-remove-subcat]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = btn.dataset.removeSubcat;
        selectedSubcategories.delete(tag);
        const checkbox = subcatGrid?.querySelector(`input[value="${CSS.escape(tag)}"]`);
        if (checkbox) checkbox.checked = false;
        renderSubcategoryTags();
      });
    });
  }

  function updateSubcategories(selected) {
    if (!subcatGrid) return;
    const categoryVal = form.elements.category.value;
    const classification = propertyWizard?.getClassification?.();
    const primary = classification?.primary || form.elements.subcategory?.value || '';
    const options = (categories[categoryVal] || []).filter(item => item !== primary);
    if (selected === undefined) selected = classification?.additional ?? subcatInput?.value ?? '';

    if (Array.isArray(selected)) {
      selectedSubcategories = new Set(selected.filter(Boolean));
    } else if (typeof selected === 'string' && selected.trim()) {
      selectedSubcategories = new Set(selected.split(',').map((s) => s.trim()).filter(Boolean));
    } else {
      selectedSubcategories = new Set();
    }

    if (options.length > 0) {
      selectedSubcategories = new Set(Array.from(selectedSubcategories).filter((tag) => options.includes(tag)));
    } else {
      selectedSubcategories.clear();
    }

    if (options.length === 0) {
      subcatGrid.innerHTML = '<p class="tw-col-span-full tw-py-3 tw-text-center tw-text-xs tw-text-slate-400">No subcategories for this category.</p>';
      if (subcatTrigger) {
        subcatTrigger.disabled = true;
        subcatTrigger.classList.add('tw-opacity-60', 'tw-cursor-not-allowed');
      }
    } else {
      if (subcatTrigger) {
        subcatTrigger.disabled = false;
        subcatTrigger.classList.remove('tw-opacity-60', 'tw-cursor-not-allowed');
      }
      subcatGrid.innerHTML = options.map((item) => {
        const isChecked = selectedSubcategories.has(item);
        return `
          <label class="tw-flex tw-cursor-pointer tw-items-center tw-gap-2.5 tw-rounded-lg tw-border tw-border-slate-100 tw-bg-slate-50/60 tw-px-2.5 tw-py-2 tw-text-xs tw-font-medium tw-text-[#11224d] hover:tw-border-amber-200 hover:tw-bg-amber-50/40 tw-transition-colors">
            <input type="checkbox" value="${escape(item)}" class="tw-h-3.5 tw-w-3.5 tw-rounded tw-border-slate-300 tw-accent-[#11224d]" ${isChecked ? 'checked' : ''}>
            <span class="tw-truncate">${escape(item)}</span>
          </label>
        `;
      }).join('');

      subcatGrid.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            selectedSubcategories.add(checkbox.value);
          } else {
            selectedSubcategories.delete(checkbox.value);
          }
          renderSubcategoryTags();
        });
      });
    }

    renderSubcategoryTags(false);
  }

  form?.addEventListener('classificationchange', () => updateSubcategories());

  subcatWrapper?.querySelector('[data-subcategory-select-all]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const primary = form.elements.subcategory?.value || '';
    const options = (categories[form.elements.category.value] || []).filter(item => item !== primary);
    options.forEach((opt) => selectedSubcategories.add(opt));
    subcatGrid?.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = true; });
    renderSubcategoryTags();
  });

  subcatWrapper?.querySelector('[data-subcategory-clear-all]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedSubcategories.clear();
    subcatGrid?.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
    renderSubcategoryTags();
  });

  function openEditor(propertyId = null) {
    if (!form) return;
    form.reset();
    toggleSubcatPopover(false);
    const property = properties.find((item) => item.id === Number(propertyId));
    form.elements.id.value = property?.id || '';
    editor.querySelector('#cityEditorTitle').textContent = property ? 'Edit property' : 'Start with the essentials';
    const breadcrumb = editor.querySelector('[data-wizard-breadcrumb]');
    if (breadcrumb) breadcrumb.textContent = property ? 'Edit property' : 'Add property';
    const noteEl = editor.querySelector('.pw-header-note');
    if (noteEl) noteEl.textContent = property ? 'Review and update property details and evidence.' : 'Add the details investors need to understand the property.';
    form.elements.contactBrokerUserId.innerHTML = '<option value="">City listing desk</option>' + brokers.map((broker) => `<option value="${broker.id}">${escape(broker.name)}${broker.phone ? ` · ${escape(broker.phone)}` : ''}</option>`).join('');
    if (property) {
      let cat = property.category || 'Land';
      let sub = property.subcategory || '';
      if (cat === 'Vacant Land') {
        cat = 'Land';
      } else if (cat !== 'Land' && cat !== 'Building') {
        if (!sub) sub = cat;
        const landLegacy = ['Commercial Lot', 'Residential Lot', 'Industrial Lot', 'Agricultural', 'Raw Land', 'Farm / Agribusiness'];
        cat = landLegacy.includes(cat) ? 'Land' : 'Building';
      }
      const values = { property_name: property.name, property_subname: property.subname || property.propertySubname || '', category: cat, subcategory: sub, barangay: property.barangay, status: property.status, listing_purpose: property.listingPurpose || 'sale', lease_price: property.leasePrice, lease_period: property.leasePeriod || 'month', lease_price_unit: property.leasePriceUnit || 'total', lat: property.lat, lng: property.lng, description: property.description, owner_name: property.ownerContact?.name, owner_phone: property.ownerContact?.phone, owner_email: property.ownerContact?.email, contactBrokerUserId: property.contactBrokerUserId, readiness_notes: property.readinessNotes, existing_land_use:property.existingLandUse, zoning_classification:property.zoningClassification, proposed_activity: property.proposedActivity || property.clupProfile?.proposedActivity || '', clup_source_reference:property.clupSourceReference };
      Object.entries(values).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value ?? ''; });
      if (priceInput) priceInput.value = (property.salePrice ?? property.price) != null ? String(property.salePrice ?? property.price) : '';
      form.querySelectorAll('[data-price-input]').forEach(formatPriceField);
      if (areaInput && areaUnit) {
        areaUnit.value = 'sqm';
        areaInput.value = property.parcel?.boundary || property.parcel?.surveyAreaSqm ? (property.parcel.surveyAreaSqm || '') : (property.area > 0 ? Math.round(property.area * 10000 * 100) / 100 : '');
        updateAreaCalculation();
      }
      updateSubcategories(sub);
      form.querySelectorAll('[name="assessmentTags[]"]').forEach((field) => { field.checked = (property.assessmentTags || []).includes(field.value); });
    } else {
      form.elements.category.value = 'Land';
      if (form.elements.property_subname) form.elements.property_subname.value = '';
      if (form.elements.subcategory) form.elements.subcategory.value = '';
      if (priceInput) priceInput.value = '';
      if (areaInput && areaUnit) {
        areaUnit.value = 'sqm';
        areaInput.value = '';
        updateAreaCalculation();
      }
      updateSubcategories([]);
      form.elements.lat.value = '';
      form.elements.lng.value = '';
    }
    message(form.querySelector('[data-editor-message]'), '');
    nearby?.set(property?.nearbyProperties || []);
    automaticAssessment?.setProperty(property);
    const restored = propertyWizard?.setProperty(property);
    if (restored?.nearby) nearby?.set(restored.nearby);
    updateSubcategories();
    updateAreaCalculation();
    const restoredStep = Number(restored?.step);
    setEditorStep(Number.isInteger(restoredStep) ? Math.max(0, Math.min(editorLastStep, restoredStep)) : 0);
    editor.showModal();
    const focusField = Array.from(form.querySelectorAll('[data-editor-panel]:not([hidden]) input:not([type="hidden"]), [data-editor-panel]:not([hidden]) select, [data-editor-panel]:not([hidden]) textarea')).find((element) => !element.disabled && element.getClientRects().length);
    (focusField || form.elements.property_name).focus();
  }

  function openReview(propertyId) {
    const property = properties.find((item) => item.id === Number(propertyId));
    if (!property || !reviewForm) return;
    const assessmentResult = window.SFCPropertyEditorTools.listingAssessment(property);
    reviewForm.reset();
    reviewForm.elements.id.value = property.id;
    reviewForm.elements.documents_reviewed.checked = Boolean(property.documentsReviewedAt);
    reviewForm.elements.site_verified.checked = Boolean(property.siteVerifiedAt);
    if (reviewForm.elements.clup_verified) {
      reviewForm.elements.clup_verified.checked = Boolean(property.clupVerifiedAt);
    }

    const isCityProperty = !property.sellerUserId || property.listing_type === 'city' || property.isCityProperty || property.seller_user_id === null;
    const isBrokerListing = !isCityProperty && Boolean(property.sellerUserId || property.seller_user_id);
    const currentUserId = Number(root.dataset.userId || config.user?.id || 0);
    // Self-approval restriction applies strictly to private broker submissions where the user is the submitting seller/broker.
    // Official City LGU municipal properties (sellerUserId is null) created by government administrators can be reviewed and published directly by authorized city governance.
    const isSelf = isBrokerListing && currentUserId > 0 && (
      Number(property.sellerUserId) === currentUserId ||
      Number(property.seller_user_id) === currentUserId
    );

    const selfWarning = reviewForm.querySelector('[data-review-self-warning]');
    const decisionSelect = reviewForm.querySelector('[data-review-decision-select]');
    const submitBtn = reviewForm.querySelector('[data-review-submit-btn]');

    if (selfWarning) {
      selfWarning.hidden = !isSelf;
    }
    if (decisionSelect) {
      decisionSelect.disabled = isSelf;
    }
    if (submitBtn) {
      submitBtn.disabled = isSelf;
    }

    const areaSqm = property.parcel?.surveyAreaSqm || (property.area > 0 ? property.area * 10000 : 0);
    const isSuspiciousArea = areaSqm > 0 && areaSqm <= 0.5;

    // --- Section 1: Property Summary ---
    const summaryContainer = reviewForm.querySelector('[data-review-summary-content]');
    if (summaryContainer) {
      const typeBadge = isBrokerListing
        ? `<span class="city-badge tw-bg-blue-50 tw-text-blue-700" style="font-weight: 600;">Private Broker Submission</span>`
        : `<span class="city-badge tw-bg-indigo-50 tw-text-indigo-800" style="font-weight: 600; border: 1px solid #C7D2FE;">🏛️ City LGU Municipal Property</span>`;

      const verificationBadge = isBrokerListing
        ? (property.sellerBrokerVerified
            ? `<span class="city-badge tw-bg-emerald-50 tw-text-emerald-800">PRC Verified Broker</span>`
            : `<span class="city-badge tw-bg-amber-50 tw-text-amber-800">Awaiting PRC Verification</span>`)
        : `<span class="city-badge tw-bg-slate-100 tw-text-slate-700">Recorded by ${escape(property.createdByName || root.dataset.department || 'CICTO')}</span>`;

      const classificationBadge = `<span class="city-badge tw-bg-slate-100 tw-text-slate-700">${escape(property.category || 'Commercial')}${property.subcategory ? ' · ' + escape(property.subcategory) : ''}</span>`;

      summaryContainer.innerHTML = `
        ${isSuspiciousArea ? `
          <div style="background: #FEF3C7; border: 1.5px solid #F59E0B; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; font-size: 12.5px; color: #92400E; display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 18px; line-height: 1; flex-shrink: 0;">⚠️</span>
            <div>
              <strong style="color: #78350F;">Suspicious Recorded Area (${number(areaSqm)} m²):</strong> The parcel area is recorded as 0.5 m² or less. This likely reflects a unit conversion anomaly (0.5 ha vs 0.5 m²) or test coordinate entry. Physical site inspection and title reconciliation are recommended prior to publication.
            </div>
          </div>
        ` : ''}

        <div class="city-dossier-hero">
          <h3 class="city-dossier-title">
            ${escape(property.name)}
            ${property.propertySubname || property.subname ? `<span style="font-size: 14px; font-weight: 500; color: #64748B;"> (${escape(property.propertySubname || property.subname)})</span>` : ''}
          </h3>
          <div class="city-dossier-tags">
            ${typeBadge}
            ${classificationBadge}
            ${verificationBadge}
          </div>
        </div>

        <div class="city-dossier-grid">
          <div class="city-dossier-card">
            <span class="city-dossier-card-label">Official Location</span>
            <span class="city-dossier-card-val">${escape(property.barangay ? 'Brgy. ' + property.barangay : (property.city || 'San Fernando'))}</span>
          </div>
          <div class="city-dossier-card">
            <span class="city-dossier-card-label">Survey Land Area</span>
            <span class="city-dossier-card-val">${areaSqm > 0 ? `${number(areaSqm)} m² (${(areaSqm / 10000).toFixed(4)} ha)` : 'Not recorded'}</span>
          </div>
          <div class="city-dossier-card">
            <span class="city-dossier-card-label">Asking Price / Lease Rate</span>
            <span class="city-dossier-card-val" style="color: #047857;">${escape(askingPrice(property))}</span>
          </div>
          <div class="city-dossier-card">
            <span class="city-dossier-card-label">${assessmentResult.label}</span>
            <span class="city-dossier-card-val" data-review-listing-result>${assessmentResult.score === null ? `${assessmentResult.count} / 5 criteria` : `${assessmentResult.score.toFixed(1)} / 100`} · ${escape(assessmentResult.status)}</span>
          </div>
        </div>

        ${property.description ? `
          <div style="font-size: 12.5px; color: #334155; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; line-height: 1.55;">
            <strong style="color: #0F172A;">Description:</strong> ${escape(property.description)}
          </div>
        ` : ''}

        ${property.readinessNotes ? `
          <div style="font-size: 12px; color: #475569; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; line-height: 1.5;">
            <strong style="color: #92400E;">Inspection &amp; Readiness Notes:</strong> ${escape(property.readinessNotes)}
          </div>
        ` : ''}

        <div style="margin-top: 6px;">
          <a href="${escape(propertyUrl(property.id))}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 650; color: #11224D; text-decoration: none; padding: 6px 12px; background: #F1F5F9; border-radius: 6px; transition: background 0.15s ease;">
            <span>Open Property Details &amp; Interactive Map</span>
            <span style="font-size: 14px;">↗</span>
          </a>
        </div>
      `;
    }

    // --- Section 2: Uploaded Documents ---
    // Photos
    const photoCountBadge = reviewForm.querySelector('[data-review-photo-count]');
    const photoThumbnails = reviewForm.querySelector('[data-review-photo-thumbnails]');
    let photos = [];
    if (Array.isArray(property.media) && property.media.length > 0) {
      photos = property.media.map(m => typeof m === 'string' ? { url: m } : m);
    } else if (Array.isArray(property.galleryImages) && property.galleryImages.length > 0) {
      photos = property.galleryImages.map(m => typeof m === 'string' ? { url: m } : m);
    } else if (property.imageUrl || property.imagePath) {
      photos = [{ url: property.imageUrl || property.imagePath, label: 'Primary photo' }];
    }

    if (photoCountBadge) {
      photoCountBadge.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'}`;
    }
    if (photoThumbnails) {
      if (photos.length > 0) {
        photoThumbnails.innerHTML = photos.map((p, idx) => `
          <a href="${escape(imageUrl(p.url || p.path))}" target="_blank" rel="noopener noreferrer" class="city-photo-thumbnail">
            <img src="${escape(imageUrl(p.url || p.path))}" alt="Photo ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='assets/images/sfcView.png'">
          </a>
        `).join('');
      } else {
        photoThumbnails.innerHTML = '<span style="font-size: 11.5px; color: #94A3B8; font-style: italic;">No property photos uploaded.</span>';
      }
    }

    // Authority to Sell (ATS)
    const authCard = reviewForm.querySelector('[data-authority-review-card]');
    const authDetails = reviewForm.querySelector('[data-authority-review-details]');
    const authBadge = reviewForm.querySelector('[data-authority-review-status-badge]');
    const authLink = reviewForm.querySelector('[data-authority-preview-link]');
    const auth = property.authorityToSell;

    if (authCard) {
      const authFormControls = authCard.querySelectorAll('label, div:has([data-quick-reject-auth]), div:has([data-quick-validate-auth])');
      if (!isBrokerListing) {
        authCard.hidden = false;
        if (authBadge) {
          authBadge.textContent = 'Exempt';
          authBadge.className = 'city-badge tw-bg-slate-100 tw-text-slate-700';
        }
        if (authDetails) {
          authDetails.innerHTML = `
            <div class="city-auth-exempt-box">
              <div class="city-auth-exempt-icon">🏛️</div>
              <div>
                <div style="font-weight: 700; color: #11224D; font-size: 12.5px;">City LGU Municipal Asset — Authority to Sell Exempt</div>
                <div style="font-size: 12px; color: #64748B; margin-top: 2px;">Authority to Sell (ATS) is not required for City Government managed and cataloged properties.</div>
              </div>
            </div>
          `;
        }
        if (authLink) authLink.style.display = 'none';
        authFormControls.forEach(el => el.style.display = 'none');
      } else {
        authCard.hidden = false;
        authFormControls.forEach(el => el.style.display = '');

        if (auth && (auth.fileId || auth.id)) {
          if (authDetails) {
            authDetails.innerHTML = `
              <div><strong>Document:</strong> ${escape(auth.originalName || 'authority-to-sell.pdf')}</div>
              <div><strong>Submitted by:</strong> ${escape(property.sellerName || 'Broker')}</div>
              <div><strong>Submitted:</strong> ${auth.uploadedAt ? new Date(auth.uploadedAt).toLocaleDateString('en-PH', {year:'numeric',month:'short',day:'numeric'}) : 'Recent'}</div>
              ${auth.reviewedByUserName ? `<div><strong>Last reviewed by:</strong> ${escape(auth.reviewedByUserName)} on ${new Date(auth.reviewedAt).toLocaleDateString('en-PH')}</div>` : ''}
            `;
          }
          if (authLink) {
            authLink.href = `api/property-authority-to-sell.php?id=${encodeURIComponent(property.id)}`;
            authLink.style.display = '';
          }
          const st = (typeof auth === 'object' && auth.status) ? auth.status : 'pending_review';
          if (authBadge) {
            authBadge.textContent = String(st).replaceAll('_', ' ');
            authBadge.className = `city-badge ${st === 'validated' ? 'tw-bg-emerald-100 tw-text-emerald-800' : st === 'rejected' ? 'tw-bg-rose-100 tw-text-rose-800' : 'tw-bg-amber-100 tw-text-amber-800'}`;
          }
          if (reviewForm.elements.authority_to_sell_status) {
            reviewForm.elements.authority_to_sell_status.value = st;
          }
          if (reviewForm.elements.authority_to_sell_note) {
            reviewForm.elements.authority_to_sell_note.value = auth.reviewNote || '';
          }
        } else {
          if (authDetails) {
            authDetails.innerHTML = '<p class="city-help" style="color: #991B1B;">No Authority to Sell document uploaded by broker yet.</p>';
          }
          if (authLink) authLink.style.display = 'none';
          if (authBadge) {
            authBadge.textContent = 'Missing document';
            authBadge.className = 'city-badge tw-bg-rose-100 tw-text-rose-800';
          }
        }
      }
    }

    // Document Checklist
    const docChecklistContainer = reviewForm.querySelector('[data-review-doc-checklist]');
    if (docChecklistContainer) {
      const statuses = property.documentStatuses || {};
      const photoCount = photos.length;
      const rows = Object.entries(statuses).map(([key, val]) => {
        let rawStatus = 'not_submitted';
        if (typeof val === 'string') {
          rawStatus = val;
        } else if (typeof val === 'object' && val !== null) {
          rawStatus = val.status || val.label || 'submitted';
        }

        const label = key.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        if (key === 'site_photos') {
          if (photoCount > 0) {
            return `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 8px 10px; font-weight: 600; color: #1E293B;">Site Photos</td>
                <td style="padding: 8px 10px;">
                  <span class="city-badge tw-bg-emerald-50 tw-text-emerald-800" style="font-size: 11px; font-weight: 600;">Uploaded (${photoCount} photo${photoCount === 1 ? '' : 's'})</span>
                </td>
                <td style="padding: 8px 10px; font-size: 11px; color: #64748B;">Attached to listing media gallery</td>
              </tr>
            `;
          }
        }

        if (key === 'zoning_clearance' || key === 'hazard_report') {
          return `
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 8px 10px; font-weight: 600; color: #1E293B;">${escape(label)}</td>
              <td style="padding: 8px 10px;">
                <span class="city-badge tw-bg-teal-50 tw-text-teal-800" style="font-size: 11px; font-weight: 600;">Municipal GIS Assessment</span>
              </td>
              <td style="padding: 8px 10px; font-size: 11px; color: #64748B;">Automated CLUP &amp; DOST-PHIVOLCS multi-layer screening</td>
            </tr>
          `;
        }

        if (key === 'authority_to_sell' && !isBrokerListing) {
          return `
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 8px 10px; font-weight: 600; color: #1E293B;">Authority To Sell</td>
              <td style="padding: 8px 10px;"><span class="city-badge tw-bg-slate-100 tw-text-slate-600" style="font-size: 11px; font-weight: 600;">Exempt</span></td>
              <td style="padding: 8px 10px; font-size: 11px; color: #64748B;">Not required for City LGU properties</td>
            </tr>
          `;
        }

        const badgeClass = rawStatus === 'validated' || rawStatus === 'submitted' || rawStatus === 'approved'
          ? 'tw-bg-emerald-50 tw-text-emerald-800'
          : rawStatus === 'rejected'
          ? 'tw-bg-rose-50 tw-text-rose-800'
          : rawStatus === 'pending_review'
          ? 'tw-bg-amber-50 tw-text-amber-800'
          : 'tw-bg-slate-100 tw-text-slate-600';

        return `
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 8px 10px; font-weight: 600; color: #1E293B;">${escape(label)}</td>
            <td style="padding: 8px 10px;">
              <span class="city-badge ${badgeClass}" style="font-size: 11px; font-weight: 600;">${escape(rawStatus.replaceAll('_', ' '))}</span>
            </td>
            <td style="padding: 8px 10px; font-size: 11px; color: #64748B;">${rawStatus === 'submitted' || rawStatus === 'validated' ? 'Provided' : 'Pending submitter upload'}</td>
          </tr>
        `;
      }).join('');

      docChecklistContainer.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px;">
          <thead>
            <tr style="text-align: left; background: #F8FAFC; border-bottom: 1.5px solid #E2E8F0;">
              <th style="padding: 8px 10px; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.04em;">Document</th>
              <th style="padding: 8px 10px; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.04em;">Status</th>
              <th style="padding: 8px 10px; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.04em;">Verification Basis</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="3" style="padding: 10px; color: #94A3B8;">No document requirements defined.</td></tr>'}
          </tbody>
        </table>
      `;
    }

    // --- Section 3: Zoning & Risk Status ---
    const zoningRiskContainer = reviewForm.querySelector('[data-review-zoning-risk-content]');
    if (zoningRiskContainer) {
      const officialZone = property.zoningClassification || property.clupProfile?.zoningClassification || 'Not assigned';
      const existingUse = property.clupProfile?.existingLandUse || property.existingLandUse || 'Not recorded';
      let allowedCount = 0;
      if (Array.isArray(property.clupAllowedUses)) {
        allowedCount = property.clupAllowedUses.length;
      } else if (typeof property.clupAllowedUses === 'string') {
        try { allowedCount = JSON.parse(property.clupAllowedUses).length; } catch { allowedCount = 0; }
      }

      const screening = property.screeningAssessment;
      const criteria = Object.values(screening?.criteria || {});
      const validScore = value => typeof value === 'number' && Number.isFinite(value);
      const risk = screening?.criteria?.risk_constraints;
      const riskMessage = screening?.technical_review_hold
        ? 'High or critical hazard findings require technical review. The overall result is withheld.'
        : validScore(risk?.score)
          ? 'Hazard observations are recorded. Source verification and site clearance remain separate.'
          : 'Complete the hazard observations. Missing layers do not establish that the site is safe.';

      zoningRiskContainer.innerHTML = `
        <div class="city-dossier-grid" style="margin-bottom: 14px;">
          <div class="city-dossier-card">
            <span class="city-dossier-card-label">Recorded zoning district</span>
            <span class="city-dossier-card-val"><span class="city-badge tw-bg-indigo-50 tw-text-indigo-900" style="font-size: 11.5px; font-weight: 700;">${escape(officialZone)}</span></span>
          </div>
          <div class="city-dossier-card">
            <span class="city-dossier-card-label">Existing Property Use</span>
            <span class="city-dossier-card-val">${escape(existingUse)}</span>
          </div>
          <div class="city-dossier-card">
            <span class="city-dossier-card-label">Permitted Land Uses</span>
            <span class="city-dossier-card-val">${allowedCount > 0 ? `${allowedCount} recorded uses` : 'Confirm the district–activity rule'}</span>
          </div>
          <div class="city-dossier-card">
            <span class="city-dossier-card-label">Assessment inputs</span>
            <span class="city-dossier-card-val">${assessmentResult.count} / 5 criteria calculated</span>
          </div>
        </div>

        <div class="city-dossier-screening">
          <table aria-label="Provisional assessment calculation">
            <caption>Calculated from saved observations · provisional</caption>
            <thead><tr><th>Criterion</th><th>Score</th><th>Weight</th><th>Points</th></tr></thead>
            <tbody>${criteria.map(criterion => `<tr><th scope="row">${escape(criterion.label)}</th><td>${validScore(criterion.score) ? criterion.score.toFixed(1) : 'Pending'}</td><td>${number(criterion.weight)}%</td><td>${validScore(criterion.contribution) ? criterion.contribution.toFixed(2) : '—'}</td></tr>`).join('')}</tbody>
          </table>
          <p>CLUP zoning is a mandatory eligibility check and adds no points. Final IAI and ranking require authorized evidence verification.</p>
          <p class="${screening?.technical_review_hold ? 'is-hold' : ''}">${escape(riskMessage)}</p>
        </div>
      `;
    }

    // --- Section 4: Reviewer Decision ---
    const roleCaption = reviewForm.querySelector('[data-reviewer-role-caption]');
    const noteLabel = reviewForm.querySelector('[data-review-note-label]');

    if (roleCaption) {
      roleCaption.textContent = governance
        ? 'CICTO Final Publication Authority: Approving this listing makes it live and publicly searchable on LOCUS-SF. Rejecting notifies the submitter.'
        : 'Departmental Verification: CAO/LEBDO personnel endorse property readiness and verify official zoning and site data. CICTO performs final publication.';
    }

    if (noteLabel) {
      noteLabel.textContent = isBrokerListing ? 'Message to broker' : 'Internal Review Remarks';
    }
    if (reviewForm.elements.reviewNote) {
      reviewForm.elements.reviewNote.placeholder = isBrokerListing
        ? 'Explain decision, required corrections, or document resubmission instructions...'
        : 'Enter internal departmental review notes or validation remarks...';
    }

    if (decisionSelect) {
      if (governance) {
        decisionSelect.innerHTML = `
          <option value="approved"${property.approvalState === 'approved' ? ' selected' : ''}>Approve &amp; Publish Listing</option>
          <option value="pending_review"${property.approvalState === 'pending_review' ? ' selected' : ''}>Keep in Pending Review</option>
          <option value="rejected"${property.approvalState === 'rejected' ? ' selected' : ''}>Reject / Decline Listing</option>
          <option value="draft"${property.approvalState === 'draft' ? ' selected' : ''}>Return to Draft</option>
        `;
      } else {
        decisionSelect.innerHTML = `
          <option value="pending_review" selected>Endorse (Pending CICTO Publication)</option>
        `;
      }
    }

    if (submitBtn) {
      submitBtn.textContent = governance ? 'Submit Publication Decision' : 'Save Departmental Endorsement';
    }

    message(reviewForm.querySelector('[data-review-message]'), '');
    reviewDialog.showModal();
    if (!isSelf) {
      reviewForm.elements.reviewNote.focus();
    }
  }

  reviewForm?.querySelector('[data-quick-reject-auth]')?.addEventListener('click', () => {
    if (reviewForm.elements.authority_to_sell_status) {
      reviewForm.elements.authority_to_sell_status.value = 'rejected';
      reviewForm.elements.authority_to_sell_note?.focus();
    }
  });
  reviewForm?.querySelector('[data-quick-validate-auth]')?.addEventListener('click', () => {
    if (reviewForm.elements.authority_to_sell_status) {
      reviewForm.elements.authority_to_sell_status.value = 'validated';
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.hasAttribute('data-add-listing')) openEditor();
    if (target.dataset.listingAssessment) {
      openEditor(target.dataset.listingAssessment);
      const nextCriterion = target.dataset.assessmentNext === 'property_cost_market_competitiveness' ? 'economic_viability' : target.dataset.assessmentNext;
      const criterionTab = nextCriterion && form.querySelector(`[data-evidence-tab="${nextCriterion}"]`);
      if (criterionTab) {
        setEditorStep(2);
        criterionTab.click();
      } else {
        setEditorStep(3);
        const readiness = form.querySelector('[data-review-tier="readiness"]')?.closest('details');
        if (readiness) { readiness.open = true; readiness.scrollIntoView({block:'start'}); }
      }
    }
    if (target.dataset.editProperty) openEditor(target.dataset.editProperty);
    if (target.dataset.reviewProperty) openReview(target.dataset.reviewProperty);
    if (target.hasAttribute('data-close-dialog')) target.closest('dialog')?.close();
  });
  root.querySelector('[data-property-search]')?.addEventListener('input', renderProperties);
  root.querySelector('[data-property-state]')?.addEventListener('change', renderProperties);
  form?.elements.category.addEventListener('change', () => updateSubcategories());
  form?.elements.subcategory?.addEventListener('change', () => updateSubcategories());

  let isAdminSubmitting = false;
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (editorStep !== editorLastStep) {
      form.querySelector('[data-editor-next]').click();
      return;
    }
    if (!validateEditor()) return;
    if (propertyWizard && !propertyWizard.validateSurroundings()) { setEditorStep(2); return; }
    if (isAdminSubmitting) return;
    isAdminSubmitting = true;
    const submit = form.querySelector('[type="submit"]');
    const originalSubmitText = submit.innerHTML;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.innerHTML = '<span class="locus-spinner tw-mr-1.5" aria-hidden="true"></span>Submitting…';
    const id = form.elements.id.value;
    const data = new FormData(form);
    nearby?.append(data);
    propertyWizard?.append(data);
    if (propertyWizard) propertyWizard.buildSubmission(data);
    else {
      data.delete('id');
      const unitVal = areaUnit?.value || 'sqm';
      data.set('land_area', String(areaInput?.value || '').trim());
      data.set('land_area_unit', unitVal);
      const type = { Industrial: 'manufacturing', Hospitality: 'hotel', Office: 'bpo' }[form.elements.category.value] || 'commercial';
      data.set('property_type', type);
      data.set('subcategory', Array.from(new Set([form.elements.subcategory?.value, ...selectedSubcategories].filter(Boolean))).join(', '));
      data.set('price', form.elements.listing_purpose?.value === 'lease' ? '' : String(priceInput?.value || '').replace(/,/g, '').trim());
      data.set('lease_price', form.elements.listing_purpose?.value === 'sale' ? '' : String(form.elements.lease_price?.value || '').replace(/,/g, '').trim());
      data.set('contactMode', form.elements.contactBrokerUserId.value ? 'broker' : 'open_listing');
      data.set('recalculate_assessment', 'true');
      data.set('assessmentTags', JSON.stringify(Array.from(form.querySelectorAll('[name="assessmentTags[]"]:checked')).map((field) => field.value)));
    }
    if (id) data.set('_method', 'PATCH');
    try {
      window.LocusHUD?.show({
        title: id ? 'Updating property...' : 'Submitting property...',
        subtitle: 'Auditing parcel coordinates & computing multi-criteria weights...',
        step: 'Uploading listing data',
        mode: 'loading'
      });
      const res = await request(id ? `property.php?id=${encodeURIComponent(id)}` : 'properties.php', { method: 'POST', body: data });
      const savedPropertyId = res?.property?.id || res?.id || id;
      if (savedPropertyId && form.elements.id) {
        form.elements.id.value = String(savedPropertyId);
      }
      propertyWizard?.saved();
      await refresh();
      editor.close();
      window.LocusHUD?.setSubmitted({
        title: id ? 'Property Updated!' : 'Property Submitted!',
        subtitle: 'Your property listing has been recorded and submitted for municipal review.'
      });
      await window.LocusHUD?.hide(1000);
      message(status, 'Your property has been sent for review. Track its status in My Listings.');
    } catch (error) {
      window.LocusHUD?.hide();
      if (propertyWizard?.showSubmissionError) {
        const issue = propertyWizard.showSubmissionError(error);
        if (issue) setEditorStep(issue.step);
      } else message(form.querySelector('[data-editor-message]'), error.message, true);
    }
    finally {
      isAdminSubmitting = false;
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.innerHTML = originalSubmitText;
    }
  });

  reviewForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!reviewForm.reportValidity()) return;
    const reviewedId = Number(reviewForm.elements.id.value);
    const property = properties.find((item) => item.id === reviewedId);

    const currentUserId = Number(root.dataset.userId || config.user?.id || 0);
    const isBroker = Boolean(property && property.sellerUserId);
    if (isBroker && currentUserId > 0 && (
      Number(property.sellerUserId) === currentUserId ||
      Number(property.seller_user_id) === currentUserId
    )) {
      message(reviewForm.querySelector('[data-review-message]'), 'Brokers cannot review or approve their own submissions.', true);
      return;
    }

    if (property && property.sellerUserId && ['approved', 'rejected'].includes(reviewForm.elements.approval_state.value) && !reviewForm.elements.reviewNote.value.trim()) {
      message(reviewForm.querySelector('[data-review-message]'), 'Add a review message for the broker.', true);
      reviewForm.elements.reviewNote.focus();
      return;
    }

    if (reviewForm.elements.authority_to_sell_status?.value === 'rejected' && !reviewForm.elements.authority_to_sell_note?.value.trim()) {
      message(reviewForm.querySelector('[data-review-message]'), 'A note/reason is required when rejecting Authority to Sell.', true);
      reviewForm.elements.authority_to_sell_note?.focus();
      return;
    }
    const submit = reviewForm.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const isApproved = reviewForm.elements.approval_state.value === 'approved';
      window.LocusHUD?.show({
        title: isApproved ? 'Approving property...' : 'Saving review decision...',
        subtitle: isApproved ? 'Verifying zoning, site clearance, and municipal authority...' : 'Recording departmental review notes...',
        step: isApproved ? 'Publishing certified listing' : 'Updating approval status',
        mode: 'loading'
      });
      const payload = {
        approval_state: reviewForm.elements.approval_state.value,
        reviewNote: reviewForm.elements.reviewNote.value,
        documents_reviewed: reviewForm.elements.documents_reviewed.checked,
        site_verified: reviewForm.elements.site_verified.checked,
        clup_verified: reviewForm.elements.clup_verified ? reviewForm.elements.clup_verified.checked : false,
      };
      if (reviewForm.elements.authority_to_sell_status && property?.sellerUserId) {
        payload.authority_to_sell_status = reviewForm.elements.authority_to_sell_status.value;
        payload.authority_to_sell_note = reviewForm.elements.authority_to_sell_note.value;
      }
      await request(`property.php?id=${encodeURIComponent(reviewedId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      await refresh();
      reviewDialog.close();
      if (payload.approval_state === 'approved') {
        if (!window.LocusSound?.isApprovalHandled(reviewedId)) {
          window.LocusSound?.markApprovalHandled(reviewedId);
          window.LocusSound?.play('approved');
        }
        window.LocusHUD?.setApproved({
          title: 'Property Approved!',
          subtitle: 'Listing certified and published to the live priority board.'
        });
        const card = document.querySelector(`[data-property="${reviewedId}"], [data-property-card="${reviewedId}"]`);
        if (card) {
          card.classList.add('locus-approved-highlight');
          setTimeout(() => card.classList.remove('locus-approved-highlight'), 3500);
        }
        await window.LocusHUD?.hide(1200);
        const nextPending = properties.find((p) => p.approvalState === 'pending_review' && p.id !== reviewedId);
        if (nextPending) {
          status.innerHTML = `<span>Listing approved.</span> <button type="button" class="city-next-review-btn tw-ml-2 tw-underline tw-font-semibold tw-text-[#11224d] hover:tw-text-[#9e1b22] tw-cursor-pointer" data-review-property="${nextPending.id}">Review next: ${escape(nextPending.name)} &rarr;</button>`;
        } else {
          message(status, 'Listing approved. All pending reviews complete.');
        }
      } else if (!governance) {
        window.LocusHUD?.setSubmitted({
          title: 'Review Endorsed',
          subtitle: 'Departmental verification and endorsement saved.'
        });
        await window.LocusHUD?.hide(900);
        message(status, 'Departmental verification and endorsement saved.');
      } else {
        window.LocusHUD?.setSubmitted({
          title: 'Decision Saved',
          subtitle: 'Listing decision and Authority to Sell validation saved.'
        });
        await window.LocusHUD?.hide(900);
        message(status, 'Listing decision and Authority to Sell validation saved.');
      }
    } catch (error) {
      window.LocusHUD?.hide();
      window.LocusSound?.play('error');
      message(reviewForm.querySelector('[data-review-message]'), error.message, true);
    }
    finally { submit.disabled = false; }
  });

  root.addEventListener('submit', async (event) => {
    const brokerForm = event.target.closest('[data-broker-review]');
    if (!brokerForm) return;
    event.preventDefault();
    const decision = event.submitter?.value;
    if (decision === 'verified' && !brokerForm.elements.prcChecked.checked) {
      message(brokerForm.querySelector('[data-broker-message]'), 'Check the PRC registration before validating.', true);
      return;
    }
    if (!brokerForm.elements.reviewNotes.value.trim()) {
      message(brokerForm.querySelector('[data-broker-message]'), 'Add a message explaining your decision to the broker.', true);
      return;
    }
    if (decision === 'blocked' && !brokerForm.elements.findings?.value.trim()) {
      message(brokerForm.querySelector('[data-broker-message]'), 'Document the verification findings before blocking an account.', true);
      brokerForm.elements.findings?.focus();
      return;
    }
    const buttons = brokerForm.querySelectorAll('button');
    buttons.forEach((button) => { button.disabled = true; });
    try {
      const result = await request('seller-profiles.php', { method: 'PATCH', body: JSON.stringify({ userId: Number(brokerForm.dataset.brokerReview), applicationRevision: Number(brokerForm.dataset.applicationRevision), status: decision, reviewNotes: brokerForm.elements.reviewNotes.value, findings: brokerForm.elements.findings?.value || '', prcChecked: brokerForm.elements.prcChecked.checked }) });
      await loadBrokerReviews();
      const delivery = result.emailStatus || result.profile?.emailStatus;
      const deliveryStatus = delivery?.status || delivery?.delivery?.status;
      const copy = { sent: 'Notification sent.', pending: 'Notification queued; delivery has not yet been confirmed.', queued: 'Notification queued; delivery has not yet been confirmed.', failed: 'Notification delivery failed.', unconfigured: 'Notification delivery unavailable: mail service is not configured.', enqueue_failed: 'Email delivery tracking is temporarily unavailable; the review decision is saved.' };
      message(status, `Broker review saved. ${copy[deliveryStatus] || 'Check notification delivery status in the application details.'}`);
    } catch (error) { message(brokerForm.querySelector('[data-broker-message]'), error.message, true); }
    finally { buttons.forEach((button) => { button.disabled = false; }); }
  });

  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-retry-broker-mail]');
    if (!button || !brokerReviewer) return;
    button.disabled = true;
    const deliveryMessage = button.closest('details')?.querySelector('[data-broker-mail-message]');
    try {
      const result = await request('seller-profiles.php', { method: 'POST', body: JSON.stringify({ action: 'retry_mail', deliveryId: Number(button.dataset.retryBrokerMail) }) });
      const deliveryStatus = result.emailStatus?.status || result.emailStatus?.delivery?.status;
      const copy = { sent: 'Notification sent.', pending: 'Notification queued; delivery has not yet been confirmed.', queued: 'Notification queued; delivery has not yet been confirmed.', failed: 'Notification delivery failed.', unconfigured: 'Mail service is not configured. Configure email delivery before retrying.' };
      message(deliveryMessage, copy[deliveryStatus] || 'Delivery retry recorded. Check the latest delivery status.', ['failed', 'unconfigured'].includes(deliveryStatus));
    } catch (error) { message(deliveryMessage, error.message, true); }
    finally { button.disabled = false; }
  });

  refresh().then(async () => {
    if (brokerReviewer) await loadBrokerReviews();
    const params = new URLSearchParams(location.search);
    if (editor && (params.has('add') || params.has('open') || params.has('wizard'))) {
      openEditor();
      const stepParam = params.get('step');
      const targetStep = stepParam !== null ? Number(stepParam) : (params.has('criterion') || params.get('open') === 'risk' || params.get('open') === 'zoning' ? 2 : 0);
      setEditorStep(targetStep);
      const criterion = params.get('criterion') || (params.get('open') === 'risk' ? 'risk_constraints' : (params.get('open') === 'zoning' ? 'zoning_compatibility' : null));
      if (criterion) {
        const tabBtn = form?.querySelector(`[data-evidence-tab="${criterion}"]`);
        if (tabBtn) tabBtn.click();
      }
    }
    if (editor && params.has('edit')) openEditor(params.get('edit'));
    if (reviewDialog && params.has('review')) openReview(params.get('review'));
  }).catch((error) => message(status, error.message, true));
})();
