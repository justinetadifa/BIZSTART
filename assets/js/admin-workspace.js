(() => {
  'use strict';
  const root = document.querySelector('[data-city-workspace]');
  if (!root) return;
  const config = window.SFC_APP_CONFIG || {};
  const apiBase = config.apiBase || `${config.basePath || ''}/api`;
  const governance = root.dataset.department === 'CICTO';
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
    properties = data.properties || [];
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
      ? [['Properties', properties.length], ['Awaiting review', pending.length], ['Approved', approved.length], ['Needs site evidence', properties.filter((property) => !property.siteVerifiedAt && property.approvalState !== 'archived').length]]
      : [['Properties', properties.length], ['Needs assessment', awaitingAssessment.length], ['Awaiting review', pending.length], ['Available area (m²)', number(approved.filter((property) => property.status === 'Available').reduce((total, property) => total + property.area * 10000, 0))]];
    root.querySelector('[data-city-stats]').innerHTML = stats.map(([label, value]) => `<div class="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4 sm:tw-p-5"><span class="tw-block tw-text-xs tw-text-slate-500">${escape(label)}</span><strong class="tw-mt-3 tw-block tw-text-2xl tw-font-semibold tw-text-[#11224d]">${escape(value)}</strong></div>`).join('');
    const queue = governance ? pending : awaitingAssessment;
    root.querySelector('[data-overview-listings]').innerHTML = queue.length
      ? queue.slice(0, 5).map((property) => `<div class="city-list-row"><div><strong>${escape(property.name)}</strong><p>${escape(property.barangay || property.category)} · ${number(property.area * 10000)} m²</p></div><a href="${escape(path(`admin-properties.php?edit=${property.id}`))}">${governance ? 'Review' : 'Assess'} →</a></div>`).join('')
      : '<p class="city-empty">All caught up.</p>';
    const ranked = approved.filter((property) => property.mceScore != null).sort((a, b) => b.mceScore - a.mceScore).slice(0, 5);
    root.querySelector('[data-assessment-ranking]').innerHTML = ranked.length
      ? `<table class="city-ranking-table"><thead><tr><th>Property</th><th>MCE</th><th>IAI</th></tr></thead><tbody>${ranked.map((property) => `<tr><td><a href="${escape(propertyUrl(property.id))}">${escape(property.name)}</a></td><td>${score(property.mceScore)} <small>#${property.mceRank}</small></td><td>${score(property.iaiScore)} <small>#${property.iaiRank}</small></td></tr>`).join('')}</tbody></table>`
      : '<p class="city-empty">Rankings appear after department assessment.</p>';
  }

  function renderProperties() {
    const query = (root.querySelector('[data-property-search]')?.value || '').toLowerCase();
    const state = root.querySelector('[data-property-state]')?.value || 'all';
    const filtered = properties.filter((property) => (state === 'all' || state === property.approvalState) && `${property.name} ${property.barangay} ${property.category} ${property.subcategory || ''}`.toLowerCase().includes(query));
    const summary = root.querySelector('[data-property-summary]');
    if (summary) summary.innerHTML = [['All properties', properties.length, 'tw-text-[#11224d]'], ['Awaiting review', properties.filter((property) => property.approvalState === 'pending_review').length, 'tw-text-amber-700'], ['Published', properties.filter((property) => property.approvalState === 'approved').length, 'tw-text-emerald-700'], ['Needs assessment', properties.filter((property) => !property.assessmentComplete && property.approvalState !== 'archived').length, 'tw-text-slate-500']].map(([label, value, color]) => `<div class="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4"><span class="tw-text-xs tw-text-slate-500">${escape(label)}</span><strong class="tw-text-2xl tw-font-semibold ${color}">${value}</strong></div>`).join('');
    root.querySelector('[data-property-list]').innerHTML = filtered.length ? filtered.map((property) => `
      <article class="tw-flex tw-flex-col tw-gap-4 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4 sm:tw-flex-row sm:tw-items-center sm:tw-p-5">
        <img class="tw-h-36 tw-w-full tw-rounded-lg tw-object-cover sm:tw-h-24 sm:tw-w-28 sm:tw-shrink-0" src="${escape(imageUrl(property.imageUrl))}" alt="" loading="lazy">
        <div class="tw-min-w-0 tw-flex-1"><div class="tw-mb-2 tw-flex tw-flex-wrap tw-items-center tw-gap-2"><span class="tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-slate-500">${escape(property.category)}</span><span class="city-pill ${escape(property.approvalState)}">${escape(stateLabel(property.approvalState))}</span></div><h2 class="tw-m-0 tw-text-base tw-font-semibold"><a class="tw-text-[#11224d] tw-no-underline" href="${escape(propertyUrl(property.id))}">${escape(property.name)}</a></h2><p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-500">${escape(property.barangay || 'San Fernando')}${property.subcategory ? ` · ${escape(property.subcategory)}` : ''}</p><p class="tw-mb-0 tw-mt-3 tw-text-xs tw-text-[#11224d]"><strong class="tw-font-semibold">₱${number(property.price)}</strong><span class="tw-mx-2 tw-text-slate-300">/</span>${number(property.area * 10000)} m²</p></div>
        <div class="tw-flex tw-items-center tw-gap-2"><div class="tw-rounded-lg tw-bg-slate-50 tw-px-3 tw-py-2 tw-text-center"><span class="tw-block tw-text-[10px] tw-text-slate-500">MCE</span><strong class="tw-text-sm tw-font-semibold">${score(property.mceScore)}</strong></div><div class="tw-rounded-lg tw-bg-amber-50 tw-px-3 tw-py-2 tw-text-center"><span class="tw-block tw-text-[10px] tw-text-amber-800">IAI</span><strong class="tw-text-sm tw-font-semibold">${score(property.iaiScore)}</strong></div></div>
        <div class="tw-flex tw-gap-2 sm:tw-flex-col"><button class="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-4 tw-py-2.5 tw-text-xs tw-font-semibold tw-text-[#11224d]" type="button" data-edit-property="${property.id}">Edit details</button>${governance && property.approvalState !== 'archived' ? `<button class="tw-rounded-lg tw-border-0 tw-bg-[#11224d] tw-px-4 tw-py-2.5 tw-text-xs tw-font-semibold tw-text-white" type="button" data-review-property="${property.id}">Review</button>` : ''}</div>
      </article>`).join('') : '<p class="city-empty">No properties found.</p>';
  }

  async function loadBrokerReviews() {
    const panel = root.querySelector('[data-broker-reviews]');
    if (!panel) return;
    try {
      const data = await request('seller-profiles.php?scope=queue');
      const profiles = (data.profiles || []).filter((profile) => ['pending_review', 'verified', 'rejected', 'suspended'].includes(profile.applicationStatus));
      if (window.SFCAdminOverview?.renderBrokerProfiles) { panel.innerHTML = window.SFCAdminOverview.renderBrokerProfiles(profiles, config); return; }
      panel.innerHTML = profiles.length ? profiles.map((profile) => `
        <form class="city-broker-card" data-broker-review="${profile.userId}">
          <h3>${escape(profile.legalName || profile.userName)} <span class="city-pill ${escape(profile.applicationStatus)}">${escape(stateLabel(profile.applicationStatus))}</span></h3>
          <p>${escape(profile.email || profile.userEmail || '')} · ${escape(profile.phone)}</p>
          <p>${escape([profile.addressLine, profile.barangay, profile.city].filter(Boolean).join(', '))}</p>
          <p>PRC ${escape(profile.prcRegistrationNo || 'Not provided')} · Valid until ${escape(profile.prcValidUntil || 'Not provided')}</p>
          ${profile.reviewNotes ? `<p>Last review: ${escape(profile.reviewNotes)}</p>` : ''}
          <label class="city-broker-check"><input type="checkbox" name="prcChecked">PRC registration checked</label>
          <div class="city-broker-actions"><textarea name="reviewNotes" aria-label="Review message" placeholder="Message to broker" maxlength="3000" required></textarea><button type="submit" class="city-button" name="decision" value="verified">${profile.applicationStatus === 'verified' ? 'Confirm' : 'Validate'}</button><button type="submit" class="city-button city-button-secondary" name="decision" value="${profile.applicationStatus === 'verified' ? 'suspended' : 'rejected'}">${profile.applicationStatus === 'verified' ? 'Suspend' : 'Decline'}</button></div>
          <p class="city-form-message" data-broker-message role="status"></p>
        </form>`).join('') : '<p class="city-empty">No broker applications.</p>';
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
    if (propertyWizard) form.querySelector('[data-editor-next]').textContent = ['Continue to boundary →', 'Save boundary & continue →', 'Save & continue →', 'Continue to review →'][step] || 'Continue →';
    editor.scrollTop = 0;
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
    const raw = original.replace(/\D/g, '');
    if (!raw) {
      input.value = '';
      return;
    }
    const formatted = Number(raw).toLocaleString('en-US');
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
  priceInput?.addEventListener('input', () => formatPriceField(priceInput));

  // --- 2. Area input group & dynamic auto-conversion helper ---
  const areaInput = form?.querySelector('[data-area-input]');
  const areaUnit = form?.querySelector('[data-area-unit]');
  const areaCalc = form?.querySelector('[data-area-calc]');

  function updateAreaCalculation() {
    if (!areaInput || !areaUnit || !areaCalc) return;
    const rawVal = parseFloat(areaInput.value);
    const unit = areaUnit.value;
    areaInput.min = unit === 'sqm' ? '1' : '0.0001';
    areaInput.step = unit === 'sqm' ? '1' : '0.0001';
    if (isNaN(rawVal) || rawVal <= 0) {
      areaCalc.textContent = 'Calculated: —';
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
      const values = { property_name: property.name, category: property.category, barangay: property.barangay, status: property.status, lat: property.lat, lng: property.lng, description: property.description, owner_name: property.ownerContact?.name, owner_phone: property.ownerContact?.phone, owner_email: property.ownerContact?.email, contactBrokerUserId: property.contactBrokerUserId, readiness_notes: property.readinessNotes, existing_land_use:property.existingLandUse, zoning_classification:property.zoningClassification, clup_source_reference:property.clupSourceReference };
      Object.entries(values).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value ?? ''; });
      if (priceInput) priceInput.value = property.price != null ? Number(property.price).toLocaleString('en-US') : '';
      if (areaInput && areaUnit) {
        areaUnit.value = 'sqm';
        areaInput.value = property.parcel?.boundary || property.parcel?.surveyAreaSqm ? (property.parcel.surveyAreaSqm || '') : Math.round((property.area || 0) * 10000 * 100) / 100;
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
    setEditorStep(0);
    editor.showModal();
    form.elements.property_name.focus();
  }

  function openReview(propertyId) {
    const property = properties.find((item) => item.id === Number(propertyId));
    if (!property || !reviewForm) return;
    reviewForm.reset();
    reviewForm.elements.id.value = property.id;
    reviewForm.elements.documents_reviewed.checked = Boolean(property.documentsReviewedAt);
    reviewForm.elements.site_verified.checked = Boolean(property.siteVerifiedAt);
    const checklist = Object.entries(property.documentStatuses || {}).map(([key, value]) => `<dt>${escape(key.replaceAll('_', ' '))}</dt><dd>${escape(value)}</dd>`).join('');
    reviewForm.querySelector('[data-review-evidence]').innerHTML = `<div class="city-evidence"><strong>${escape(property.name)}</strong><p>${escape(property.description)}</p><p>Broker registration: ${property.sellerUserId ? (property.sellerBrokerVerified ? 'Verified and current' : 'Awaiting valid PRC verification') : 'City listing'}</p><p>${escape(property.category)} · ${escape(property.barangay)} · ${number(property.area * 10000)} m²</p><p>MCE ${score(property.mceScore)} · IAI ${score(property.iaiScore)}</p><p>${escape(property.readinessNotes || 'Department assessment basis not provided.')}</p><dl>${checklist}</dl><a href="${escape(propertyUrl(property.id))}" target="_blank" rel="noopener noreferrer">View property and map ↗</a></div>`;
    message(reviewForm.querySelector('[data-review-message]'), '');
    reviewDialog.showModal();
    reviewForm.elements.reviewNote.focus();
  }

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
    submit.disabled = true;
    const id = form.elements.id.value;
    const data = new FormData(form);
    nearby?.append(data);
    propertyWizard?.append(data);
    data.delete('id');
    const unitVal = areaUnit?.value || 'sqm';
    data.set('land_area', String(areaInput?.value || '').replace(/[^\d.]/g, ''));
    data.set('land_area_unit', unitVal);
    const type = { Industrial: 'manufacturing', Hospitality: 'hotel', Office: 'bpo' }[form.elements.category.value] || 'commercial';
    data.set('property_type', type);
    data.set('subcategory', Array.from(selectedSubcategories).join(', '));
    data.set('price', String(priceInput?.value || '').replace(/[^\d]/g, ''));
    data.set('contactMode', form.elements.contactBrokerUserId.value ? 'broker' : 'open_listing');
    data.set('recalculate_assessment', 'true');
    data.set('assessmentTags', JSON.stringify(Array.from(form.querySelectorAll('[name="assessmentTags[]"]:checked')).map((field) => field.value)));
    if (id) data.set('_method', 'PATCH');
    try {
      await request(id ? `property.php?id=${encodeURIComponent(id)}` : 'properties.php', { method: 'POST', body: data });
      propertyWizard?.saved();
      await refresh();
      editor.close();
      message(status, 'Property saved for CICTO review.');
    } catch (error) { message(form.querySelector('[data-editor-message]'), error.message, true); }
    finally { submit.disabled = false; }
  });

  reviewForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!reviewForm.reportValidity()) return;
    const submit = reviewForm.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await request(`property.php?id=${encodeURIComponent(reviewForm.elements.id.value)}`, { method: 'PATCH', body: JSON.stringify({ approval_state: reviewForm.elements.approval_state.value, reviewNote: reviewForm.elements.reviewNote.value, documents_reviewed: reviewForm.elements.documents_reviewed.checked, site_verified: reviewForm.elements.site_verified.checked }) });
      await refresh();
      reviewDialog.close();
      message(status, 'Listing decision saved.');
    } catch (error) { message(reviewForm.querySelector('[data-review-message]'), error.message, true); }
    finally { submit.disabled = false; }
  });

  root.addEventListener('click', (event) => {
    const toggleBtn = event.target.closest('[data-toggle-broker-details], [data-reverify-broker]');
    if (!toggleBtn) return;
    const userId = toggleBtn.dataset.toggleBrokerDetails || toggleBtn.dataset.reverifyBroker;
    const drawer = root.querySelector(`[data-broker-drawer="${userId}"]`);
    if (drawer) {
      drawer.hidden = !drawer.hidden;
      if (!drawer.hidden) {
        drawer.querySelector('textarea, input[type="checkbox"]')?.focus();
      }
    }
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
    if ((decision === 'rejected' || decision === 'suspended') && !brokerForm.elements.reviewNotes.value.trim()) {
      message(brokerForm.querySelector('[data-broker-message]'), 'Add a message explaining your decision to the broker.', true);
      return;
    }
    const buttons = brokerForm.querySelectorAll('button');
    buttons.forEach((button) => { button.disabled = true; });
    try {
      await request('seller-profiles.php', { method: 'PATCH', body: JSON.stringify({ userId: Number(brokerForm.dataset.brokerReview), status: decision, reviewNotes: brokerForm.elements.reviewNotes.value, prcChecked: brokerForm.elements.prcChecked.checked }) });
      await loadBrokerReviews();
      message(status, 'Broker review saved.');
    } catch (error) { message(brokerForm.querySelector('[data-broker-message]'), error.message, true); }
    finally { buttons.forEach((button) => { button.disabled = false; }); }
  });

  refresh().then(async () => {
    if (governance) await loadBrokerReviews();
    const params = new URLSearchParams(location.search);
    if (editor && params.has('add')) openEditor();
    if (editor && params.has('edit')) openEditor(params.get('edit'));
    if (reviewDialog && params.has('review')) openReview(params.get('review'));
  }).catch((error) => message(status, error.message, true));
})();
