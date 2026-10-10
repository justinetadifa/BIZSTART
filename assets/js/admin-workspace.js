(() => {
  'use strict';
  const root = document.querySelector('[data-city-workspace]');
  if (!root) return;
  const config = window.SFC_APP_CONFIG || {};
  const apiBase = config.apiBase || `${config.basePath || ''}/api`;
  const governance = root.dataset.listingReviewer === 'true' || (!root.hasAttribute('data-listing-reviewer') && root.dataset.department === 'CICTO');
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
    if (!response.ok) throw new Error(payload.error || 'Unable to complete the request.');
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
      element.textContent = properties[0]?.assessmentMethod || 'Provisional weights: spatial 20%, infrastructure 20%, economic 20%, nearby businesses 10%, zoning 15%, risk 10%, environmental safety 5%. IAI = 60% MCE + 20% economic viability + 20% infrastructure readiness. All seven scores are required; ranks cover assessed, approved listings.';
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
    const ranked = approved.filter((property) => property.mceScore != null).sort((a, b) => b.mceScore - a.mceScore).slice(0, 5);
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
    root.querySelector('[data-property-list]').innerHTML = filtered.length ? filtered.map((property) => `
      <article class="city-card-item tw-flex tw-flex-col tw-gap-4 sm:tw-gap-5 tw-rounded-[24px] tw-border tw-border-slate-200/90 tw-bg-white tw-p-5 sm:tw-flex-row sm:tw-items-center sm:tw-p-6 tw-shadow-[0_4px_20px_-2px_rgba(17,34,77,0.04)] hover:tw-shadow-[0_12px_32px_-4px_rgba(17,34,77,0.1)] hover:tw-border-slate-300 hover:tw--translate-y-0.5 tw-transition-all tw-duration-200">
        <div class="city-card-thumb-wrap sm:tw-shrink-0">
          <img class="city-card-thumb tw-h-40 tw-w-full sm:tw-h-28 sm:tw-w-36 tw-rounded-2xl tw-object-cover tw-border tw-border-slate-200/60 tw-shadow-sm" src="${escape(imageUrl(property.imageUrl))}" alt="" loading="lazy">
        </div>
        <div class="tw-min-w-0 tw-flex-1">
          <div class="tw-mb-2.5 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
            <span class="tw-inline-flex tw-items-center tw-rounded-full tw-bg-slate-100 tw-px-2.5 tw-py-1 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-600">${escape(property.category)}</span>
            <span class="city-pill ${escape(property.approvalState)}">
              <span class="city-pill-dot" aria-hidden="true"></span>
              ${escape(stateLabel(property.approvalState))}
            </span>
            ${property.isDeleted ? '<span class="city-pill city-deleted"><span class="city-pill-dot" aria-hidden="true"></span>Deleted</span>' : ''}
            ${isArchived(property) ? '<span class="city-pill archived"><span class="city-pill-dot" aria-hidden="true"></span>Archived</span>' : ''}
            <span class="city-pill city-availability-${escape(String(property.status || '').toLowerCase())}">
              <span class="city-pill-dot" aria-hidden="true"></span>
              ${escape(property.status)}
            </span>
          </div>
          <h2 class="tw-m-0 tw-text-base sm:tw-text-lg tw-font-bold tw-tracking-tight">
            <a class="tw-text-[#11224d] hover:tw-text-[#9e1b22] tw-transition-colors tw-no-underline" href="${escape(propertyUrl(property.id))}">${escape(property.name)}</a>
          </h2>
          <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-font-medium tw-text-slate-500 tw-flex tw-items-center tw-gap-1.5 tw-flex-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="tw-text-slate-400" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>${escape(property.barangay || property.city || 'Location pending')}</span>
            ${property.subcategory ? `<span class="tw-text-slate-300">·</span><span>${escape(property.subcategory)}</span>` : ''}
          </p>
          <div class="tw-mt-2.5 tw-flex tw-flex-wrap tw-items-center tw-gap-2.5">
            <span class="city-purpose-pill">${escape(purposeLabel(property))}</span>
            <span class="tw-text-xs tw-text-[#11224d]">
              <strong class="tw-font-bold tw-text-sm">${escape(askingPrice(property))}</strong>
              <span class="tw-mx-1.5 tw-text-slate-300">/</span>
              <span class="tw-text-slate-600">${property.area > 0 ? `${number(property.area * 10000)} m²` : 'Area not provided'}</span>
            </span>
          </div>
          <p class="city-listing-dates tw-mt-2.5 tw-text-[11px] tw-text-slate-400 tw-flex tw-flex-wrap tw-items-center tw-gap-x-3 tw-gap-y-1">
            <span>Created ${escape(listingDate(property.createdAt))}</span>
            ${isArchived(property) ? `<span>Archived ${escape(listingDate(property.archivedAt))}</span>` : ''}
            ${property.isDeleted ? `<span>Deleted ${escape(listingDate(property.deletedAt))}</span>` : ''}
          </p>
        </div>
        <div class="city-card-scores tw-flex tw-items-center tw-gap-2.5 sm:tw-px-1">
          <div class="city-score-bubble city-score-mce">
            <span class="tw-block tw-text-[10px] tw-font-bold tw-tracking-wider tw-text-slate-500 tw-uppercase">MCE</span>
            <strong class="tw-text-base tw-font-extrabold tw-text-[#11224d] tw-leading-tight">${score(property.mceScore)}</strong>
          </div>
          <div class="city-score-bubble city-score-iai">
            <span class="tw-block tw-text-[10px] tw-font-bold tw-tracking-wider tw-text-amber-800 tw-uppercase">IAI</span>
            <strong class="tw-text-base tw-font-extrabold tw-text-amber-900 tw-leading-tight">${score(property.iaiScore)}</strong>
          </div>
        </div>
        <div class="city-listing-controls sm:tw-shrink-0">
          ${property.isDeleted ? `
            <button class="city-button city-btn-pill city-btn-pill-restore" type="button" data-property-lifecycle="restore" data-property-id="${property.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              <span>Restore property</span>
            </button>
          ` : `
            <button class="city-button city-button-secondary city-btn-pill city-btn-pill-secondary" type="button" data-edit-property="${property.id}">
              Edit details
            </button>
            ${governance && !isArchived(property) ? `
              <button class="city-button city-button-review city-btn-pill city-btn-pill-primary" type="button" data-review-property="${property.id}">
                Review
              </button>
            ` : ''}
            <details class="city-property-menu">
              <summary aria-label="Manage ${escape(property.name)}" class="city-btn-pill city-btn-pill-manage">
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
      </article>
    `).join('') : '<div class="city-empty-state tw-rounded-[24px] tw-border tw-border-dashed tw-border-slate-300 tw-bg-white tw-p-12 tw-text-center"><p class="tw-m-0 tw-text-base tw-font-semibold tw-text-[#11224d]">No properties found</p><p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-500">Try adjusting your search terms or selecting a different listing view.</p></div>';
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
    dialog.querySelector('[data-lifecycle-property]').textContent = property.name;
    const lifecycleAction = action.dataset.propertyLifecycle;
    const cancelBtn = dialog.querySelector('[data-close-dialog]');
    if (cancelBtn) {
      cancelBtn.textContent = lifecycleAction === 'delete' ? 'Keep property' : 'Cancel';
    }
    const copy = {
      delete:[`Delete "${property.name}"?`, 'This moves the listing to Deleted Listings and removes it from public results. Its listing status, archive state, evidence and history are retained, and authorized staff can restore it later.', 'Delete property'],
      restore:['Restore this property?', `The property will return with its retained ${property.status} status${isArchived(property) ? ' and remain archived' : ''}. It will appear publicly only when available, approved and unarchived.`, 'Restore property'],
      archive:['Archive this property?', 'The property will leave public listings. Its listing status, review decision, evidence and history are retained for later unarchiving.', 'Archive property'],
      unarchive:['Unarchive this property?', `The property will return with its prior ${property.status} status. It will appear publicly only when available and approved.`, 'Unarchive property'],
      availability:[`Mark as ${String(action.dataset.availability || '').toLowerCase()}?`, action.dataset.availability === 'Available' ? 'The listing will be visible to investors when approved and unarchived.' : 'The property will leave public listings. Its evidence and history are retained, and you can change its listing status later.', 'Update listing status'],
    }[lifecycleAction];
    if (!copy) return;
    dialog.querySelector('[data-lifecycle-title]').textContent = copy[0];
    dialog.querySelector('[data-lifecycle-description]').textContent = copy[1];
    form.querySelector('[type="submit"]').textContent = copy[2];
    message(form.querySelector('[data-lifecycle-message]'), '');
    dialog.showModal();
  });

  document.querySelector('[data-lifecycle-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    const dialog = form.closest('dialog');
    const cancelBtn = dialog?.querySelector('[data-close-dialog]');
    const action = form.elements.action.value;
    const targetId = Number(form.elements.id.value);
    submit.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    if (action === 'delete') {
      submit.innerHTML = '<span class="locus-spinner locus-spinner-dark tw-mr-1.5"></span>Deleting…';
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
      message(form.querySelector('[data-lifecycle-message]'), error.message || 'The property could not be deleted.', true);
    } finally {
      submit.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      if (action === 'delete') submit.textContent = 'Delete property';
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
  const editorLastStep = propertyWizard ? 4 : 2;
  let editorStep = 0;

  function setEditorStep(step) {
    editorStep = step;
    form.querySelectorAll('[data-editor-panel]').forEach((panel) => { panel.hidden = Number(panel.dataset.editorPanel) !== step; });
    form.querySelectorAll('[data-editor-step]').forEach((button) => {
      const active = Number(button.dataset.editorStep) === step;
      button.setAttribute('aria-current', active ? 'step' : 'false');
      button.classList.toggle('is-active', active);
      button.classList.toggle('is-complete', Number(button.dataset.editorStep) < step);
      if (!propertyWizard) {
        button.classList.toggle('tw-bg-[#11224d]', active);
        button.classList.toggle('tw-text-white', active);
        button.classList.toggle('tw-bg-slate-100', !active);
        button.classList.toggle('tw-text-slate-500', !active);
      }
    });
    form.querySelector('[data-editor-back]').disabled = step === 0;
    form.querySelector('[data-editor-back]').classList.toggle('tw-opacity-40', step === 0);
    form.querySelector('[data-editor-next]').hidden = step === editorLastStep;
    form.querySelector('[type="submit"]').hidden = step !== editorLastStep;
    form.querySelector('[data-editor-progress]').textContent = `Step ${step + 1} of ${editorLastStep + 1}`;
    if (propertyWizard) {
      const nextButton = form.querySelector('[data-editor-next]');
      const nextLabel = nextButton.querySelector('[data-editor-next-label]') || nextButton;
      nextLabel.textContent = step === 0 ? 'Continue to location' : 'Continue';
    }
    const skip = form.querySelector('[data-skip-enrichment]');
    if (skip) skip.hidden = ![1,2,3].includes(step);
    (form.querySelector('.pw-content') || editor).scrollTop = 0;
    if (propertyWizard) propertyWizard.onStep(step);
    else {
      if (step === 2) automaticAssessment?.refresh();
      if (step === 1) locationEditor?.sync();
    }
  }

  function validateEditor(container = form) {
    const invalid = Array.from(container.querySelectorAll('input,select,textarea')).find((field) => !field.disabled && !field.checkValidity());
    if (!invalid) return true;
    const panel = invalid.closest('[data-editor-panel]');
    if (panel) setEditorStep(Number(panel.dataset.editorPanel));
    if (['lat','lng'].includes(invalid.name)) form.querySelector('[data-location-method="pin"]')?.click();
    const disclosure = invalid.closest('details');
    if (disclosure) disclosure.open = true;
    const evidencePanel = invalid.closest('[data-evidence-panel]');
    if (evidencePanel) form.querySelector(`[data-evidence-tab="${evidencePanel.dataset.evidencePanel}"]`)?.click();
    invalid.focus();
    invalid.reportValidity();
    return false;
  }

  function validateBoundary() {
    if (!propertyWizard || propertyWizard.validateBoundary()) return true;
    setEditorStep(1);
    return false;
  }

  form?.querySelector('[data-editor-next]')?.addEventListener('click', () => {
    if (!validateEditor(form.querySelector(`[data-editor-panel="${editorStep}"]`))) return;
    if (editorStep === 1 && !validateBoundary()) return;
    if (editorStep === 3 && propertyWizard && !propertyWizard.validateSurroundings()) return;
    setEditorStep(Math.min(editorLastStep, editorStep + 1));
  });
  form?.querySelector('[data-editor-back]')?.addEventListener('click', () => setEditorStep(Math.max(0, editorStep - 1)));
  form?.querySelector('[data-skip-enrichment]')?.addEventListener('click', () => {
    if (!validateEditor() || !validateBoundary()) return;
    setEditorStep(editorLastStep);
  });
  form?.querySelectorAll('[data-editor-step]').forEach((button) => button.addEventListener('click', () => {
    const target = Number(button.dataset.editorStep);
    for (let step = 0; step < target; step++) {
      if (!validateEditor(form.querySelector(`[data-editor-panel="${step}"]`))) return;
      if (step === 1 && !validateBoundary()) return;
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

  function updateAreaCalculation() {
    if (!areaInput || !areaUnit || !areaCalc) return;
    const rawVal = parseFloat(areaInput.value);
    const unit = areaUnit.value;
    areaInput.min = unit === 'sqm' ? '1' : '0.0001';
    areaInput.step = propertyWizard ? 'any' : (unit === 'sqm' ? '1' : '0.0001');
    if (isNaN(rawVal) || rawVal <= 0) {
      areaCalc.textContent = 'Enter an area size, or leave it blank and provide an exact location.';
      return;
    }
    if (unit === 'sqm') {
      const hectares = rawVal / 10000;
      const formattedHa = Number(hectares.toFixed(4)).toLocaleString('en-US', { maximumFractionDigits: 4 });
      const label = hectares === 1 ? 'hectare' : 'hectares';
      areaCalc.textContent = `Calculated: ${formattedHa} ${label}`;
    } else {
      const sqm = rawVal * 10000;
      const formattedSqm = Number(sqm.toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 });
      areaCalc.textContent = `Calculated: ${formattedSqm} sqm`;
    }
  }
  areaInput?.addEventListener('input', updateAreaCalculation);
  areaUnit?.addEventListener('change', updateAreaCalculation);

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

  function renderSubcategoryTags() {
    if (!subcatTags || !subcatInput || !subcatTriggerText || !subcatCount) return;
    const list = Array.from(selectedSubcategories);
    subcatInput.value = list.join(', ');
    subcatInput.dispatchEvent(new Event('input', {bubbles:true}));

    if (list.length === 0) {
      subcatTriggerText.textContent = 'Select subcategories...';
      subcatTriggerText.className = 'tw-truncate tw-text-sm tw-text-slate-500';
      subcatCount.textContent = 'Optional · multi-select';
      subcatTags.innerHTML = '';
      return;
    }

    subcatTriggerText.textContent = list.length === 1 ? list[0] : `${list[0]}, ${list[1] || ''}${list.length > 2 ? ` (+${list.length - 2} more)` : ''}`.replace(',  ', ' ');
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

  function updateSubcategories(selected = '') {
    if (!subcatGrid) return;
    const categoryVal = form.elements.category.value;
    const options = categories[categoryVal] || [];

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

    renderSubcategoryTags();
  }

  subcatWrapper?.querySelector('[data-subcategory-select-all]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const options = categories[form.elements.category.value] || [];
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
    editor.querySelector('#cityEditorTitle').textContent = property ? 'Edit property' : 'New property';
    const breadcrumb = editor.querySelector('[data-wizard-breadcrumb]');
    if (breadcrumb) breadcrumb.textContent = property ? 'Edit property' : 'Add property';
    form.elements.contactBrokerUserId.innerHTML = '<option value="">Open listing</option>' + brokers.map((broker) => `<option value="${broker.id}">${escape(broker.name)}${broker.phone ? ` · ${escape(broker.phone)}` : ''}</option>`).join('');
    if (property) {
      const values = { property_name: property.name, category: property.category, barangay: property.barangay, status: property.status, listing_purpose: property.listingPurpose || 'sale', lease_price: property.leasePrice, lease_period: property.leasePeriod || 'month', lease_price_unit: property.leasePriceUnit || 'total', lat: property.lat, lng: property.lng, description: property.description, owner_name: property.ownerContact?.name, owner_phone: property.ownerContact?.phone, owner_email: property.ownerContact?.email, contactBrokerUserId: property.contactBrokerUserId, readiness_notes: property.readinessNotes, existing_land_use:property.existingLandUse, zoning_classification:property.zoningClassification, clup_source_reference:property.clupSourceReference };
      Object.entries(values).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value ?? ''; });
      if (priceInput) priceInput.value = (property.salePrice ?? property.price) != null ? String(property.salePrice ?? property.price) : '';
      form.querySelectorAll('[data-price-input]').forEach(formatPriceField);
      if (areaInput && areaUnit) {
        areaUnit.value = 'sqm';
        areaInput.value = property.parcel?.boundary || property.parcel?.surveyAreaSqm ? (property.parcel.surveyAreaSqm || '') : (property.area > 0 ? Math.round(property.area * 10000 * 100) / 100 : '');
        updateAreaCalculation();
      }
      updateSubcategories(property.subcategory || '');
      form.querySelectorAll('[name="assessmentTags[]"]').forEach((field) => { field.checked = (property.assessmentTags || []).includes(field.value); });
    } else {
      form.elements.category.value = 'Land';
      if (priceInput) priceInput.value = '';
      if (areaInput && areaUnit) {
        areaUnit.value = 'sqm';
        areaInput.value = '';
        updateAreaCalculation();
      }
      updateSubcategories();
      form.elements.lat.value = '';
      form.elements.lng.value = '';
    }
    message(form.querySelector('[data-editor-message]'), '');
    nearby?.set(property?.nearbyProperties || []);
    automaticAssessment?.setProperty(property);
    const restored = propertyWizard?.setProperty(property);
    if (restored?.nearby) nearby?.set(restored.nearby);
    if (restored?.values?.subcategory) updateSubcategories(restored.values.subcategory);
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
    reviewForm.reset();
    reviewForm.elements.id.value = property.id;
    reviewForm.elements.documents_reviewed.checked = Boolean(property.documentsReviewedAt);
    reviewForm.elements.site_verified.checked = Boolean(property.siteVerifiedAt);
    if (reviewForm.elements.clup_verified) {
      reviewForm.elements.clup_verified.checked = Boolean(property.clupVerifiedAt);
    }

    const authCard = reviewForm.querySelector('[data-authority-review-card]');
    const authDetails = reviewForm.querySelector('[data-authority-review-details]');
    const authBadge = reviewForm.querySelector('[data-authority-review-status-badge]');
    const authLink = reviewForm.querySelector('[data-authority-preview-link]');
    const auth = property.authorityToSell;

    if (authCard) {
      if (auth && auth.fileId) {
        authCard.hidden = false;
        if (authDetails) {
          authDetails.innerHTML = `
            <div><strong>Document:</strong> ${escape(auth.originalName || 'authority-to-sell')}</div>
            <div><strong>Submitted by:</strong> ${escape(property.sellerName || property.ownerName || 'Submitting Broker')}</div>
            <div><strong>Submitted:</strong> ${auth.uploadedAt ? new Date(auth.uploadedAt).toLocaleDateString('en-PH', {year:'numeric',month:'short',day:'numeric'}) : 'Recent'}</div>
            ${auth.reviewedByUserName ? `<div><strong>Last reviewed by:</strong> ${escape(auth.reviewedByUserName)} on ${new Date(auth.reviewedAt).toLocaleDateString('en-PH')}</div>` : ''}
          `;
        }
        if (authLink) {
          authLink.href = `api/property-authority-to-sell.php?id=${encodeURIComponent(property.id)}`;
          authLink.hidden = false;
        }
        if (authBadge) {
          const st = auth.status || 'pending_review';
          authBadge.textContent = st.replaceAll('_', ' ');
          authBadge.className = `city-badge ${st === 'validated' ? 'tw-bg-emerald-100 tw-text-emerald-800' : st === 'rejected' ? 'tw-bg-rose-100 tw-text-rose-800' : 'tw-bg-amber-100 tw-text-amber-800'}`;
        }
        if (reviewForm.elements.authority_to_sell_status) {
          reviewForm.elements.authority_to_sell_status.value = auth.status || 'pending_review';
        }
        if (reviewForm.elements.authority_to_sell_note) {
          reviewForm.elements.authority_to_sell_note.value = auth.reviewNote || '';
        }
      } else {
        if (!property.sellerUserId) {
          authCard.hidden = true;
        } else {
          authCard.hidden = false;
          if (authDetails) {
            authDetails.innerHTML = '<p class="city-help">No Authority to Sell document uploaded by broker yet.</p>';
          }
          if (authLink) authLink.hidden = true;
          if (authBadge) {
            authBadge.textContent = 'Missing document';
            authBadge.className = 'city-badge tw-bg-rose-100 tw-text-rose-800';
          }
        }
      }
    }

    const checklist = Object.entries(property.documentStatuses || {}).map(([key, value]) => `<dt>${escape(key.replaceAll('_', ' '))}</dt><dd>${escape(value)}</dd>`).join('');
    reviewForm.querySelector('[data-review-evidence]').innerHTML = `<div class="city-evidence"><strong>${escape(property.name)}</strong><p>${escape(property.description)}</p><p>Broker registration: ${property.sellerUserId ? (property.sellerBrokerVerified ? 'Verified and current' : 'Awaiting valid PRC verification') : 'City listing'}</p><p>${escape(property.category)} · ${escape(property.barangay || 'Barangay not specified')} · ${property.area > 0 ? `${number(property.area * 10000)} m²` : 'Area not provided'}</p><p>MCE ${score(property.mceScore)} · IAI ${score(property.iaiScore)}</p><p>${escape(property.readinessNotes || 'Department assessment basis not provided.')}</p><dl>${checklist}</dl><a href="${escape(propertyUrl(property.id))}" target="_blank" rel="noopener noreferrer">View property and map ↗</a></div>`;
    message(reviewForm.querySelector('[data-review-message]'), '');
    reviewDialog.showModal();
    reviewForm.elements.reviewNote.focus();
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
    if (target.dataset.editProperty) openEditor(target.dataset.editProperty);
    if (target.dataset.reviewProperty) openReview(target.dataset.reviewProperty);
    if (target.hasAttribute('data-close-dialog')) target.closest('dialog')?.close();
  });
  root.querySelector('[data-property-search]')?.addEventListener('input', renderProperties);
  root.querySelector('[data-property-state]')?.addEventListener('change', renderProperties);
  form?.elements.category.addEventListener('change', () => updateSubcategories());

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (editorStep !== editorLastStep) {
      form.querySelector('[data-editor-next]').click();
      return;
    }
    if (!validateEditor() || !validateBoundary()) return;
    if (propertyWizard && !propertyWizard.validateSurroundings()) { setEditorStep(3); return; }
    const submit = form.querySelector('[type="submit"]');
    const originalSubmitText = submit.innerHTML;
    submit.disabled = true;
    submit.innerHTML = '<span class="locus-spinner tw-mr-1.5"></span>Submitting…';
    const id = form.elements.id.value;
    const data = new FormData(form);
    nearby?.append(data);
    propertyWizard?.append(data);
    if (propertyWizard) propertyWizard.buildSubmission(data, selectedSubcategories);
    else {
      data.delete('id');
      const unitVal = areaUnit?.value || 'sqm';
      data.set('land_area', String(areaInput?.value || '').replace(/[^\d.]/g, ''));
      data.set('land_area_unit', unitVal);
      const type = { Industrial: 'manufacturing', Hospitality: 'hotel', Office: 'bpo' }[form.elements.category.value] || 'commercial';
      data.set('property_type', type);
      data.set('subcategory', Array.from(selectedSubcategories).join(', '));
      data.set('price', form.elements.listing_purpose?.value === 'lease' ? '' : String(priceInput?.value || '').replace(/,/g, '').trim());
      data.set('lease_price', form.elements.listing_purpose?.value === 'sale' ? '' : String(form.elements.lease_price?.value || '').replace(/,/g, '').trim());
      data.set('contactMode', form.elements.contactBrokerUserId.value ? 'broker' : 'open_listing');
      data.set('recalculate_assessment', 'true');
      data.set('assessmentTags', JSON.stringify(Array.from(form.querySelectorAll('[name="assessmentTags[]"]:checked')).map((field) => field.value)));
    }
    if (id) data.set('_method', 'PATCH');
    try {
      await request(id ? `property.php?id=${encodeURIComponent(id)}` : 'properties.php', { method: 'POST', body: data });
      propertyWizard?.saved();
      await refresh();
      editor.close();
      message(status, 'Property submitted for CICTO review.');
    } catch (error) { message(form.querySelector('[data-editor-message]'), error.message, true); }
    finally {
      submit.disabled = false;
      submit.innerHTML = originalSubmitText;
    }
  });

  reviewForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!reviewForm.reportValidity()) return;
    if (reviewForm.elements.authority_to_sell_status?.value === 'rejected' && !reviewForm.elements.authority_to_sell_note?.value.trim()) {
      message(reviewForm.querySelector('[data-review-message]'), 'A note/reason is required when rejecting Authority to Sell.', true);
      reviewForm.elements.authority_to_sell_note?.focus();
      return;
    }
    const submit = reviewForm.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const payload = {
        approval_state: reviewForm.elements.approval_state.value,
        reviewNote: reviewForm.elements.reviewNote.value,
        documents_reviewed: reviewForm.elements.documents_reviewed.checked,
        site_verified: reviewForm.elements.site_verified.checked,
        clup_verified: reviewForm.elements.clup_verified ? reviewForm.elements.clup_verified.checked : false,
      };
      if (reviewForm.elements.authority_to_sell_status) {
        payload.authority_to_sell_status = reviewForm.elements.authority_to_sell_status.value;
        payload.authority_to_sell_note = reviewForm.elements.authority_to_sell_note.value;
      }
      const reviewedId = Number(reviewForm.elements.id.value);
      await request(`property.php?id=${encodeURIComponent(reviewedId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      await refresh();
      reviewDialog.close();
      if (payload.approval_state === 'approved') {
        if (!window.LocusSound?.isApprovalHandled(reviewedId)) {
          window.LocusSound?.markApprovalHandled(reviewedId);
          window.LocusSound?.play('approved');
        }
        const nextPending = properties.find((p) => p.approvalState === 'pending_review' && p.id !== reviewedId);
        if (nextPending) {
          status.innerHTML = `<span>Listing approved.</span> <button type="button" class="city-next-review-btn tw-ml-2 tw-underline tw-font-semibold tw-text-[#11224d] hover:tw-text-[#9e1b22] tw-cursor-pointer" data-review-property="${nextPending.id}">Review next: ${escape(nextPending.name)} &rarr;</button>`;
        } else {
          message(status, 'Listing approved. All pending reviews complete.');
        }
      } else {
        message(status, 'Listing decision and Authority to Sell validation saved.');
      }
    } catch (error) {
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
    if (editor && params.has('add')) openEditor();
    if (editor && params.has('edit')) openEditor(params.get('edit'));
    if (reviewDialog && params.has('review')) openReview(params.get('review'));
  }).catch((error) => message(status, error.message, true));
})();
