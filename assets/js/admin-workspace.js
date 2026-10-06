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
    const pending = properties.filter((property) => property.approvalState === 'pending_review');
    const approved = properties.filter((property) => property.approvalState === 'approved');
    const awaitingAssessment = properties.filter((property) => !property.assessmentComplete && property.approvalState !== 'archived');
    const stats = governance
      ? [['Properties', properties.length], ['Awaiting review', pending.length], ['Approved', approved.length], ['Needs site evidence', properties.filter((property) => !property.siteVerifiedAt && property.approvalState !== 'archived').length]]
      : [['Properties', properties.length], ['Needs assessment', awaitingAssessment.length], ['Awaiting review', pending.length], ['Available area (m²)', number(approved.filter((property) => property.status === 'Available').reduce((total, property) => total + property.area * 10000, 0))]];
    root.querySelector('[data-city-stats]').innerHTML = stats.map(([label, value]) => `<div class="city-stat"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`).join('');
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
    root.querySelector('[data-property-list]').innerHTML = filtered.length ? filtered.map((property) => `
      <article class="city-property-row">
        <img class="city-property-thumb" src="${escape(imageUrl(property.imageUrl))}" alt="" loading="lazy">
        <div class="city-property-main"><h2><a href="${escape(propertyUrl(property.id))}">${escape(property.name)}</a></h2><p>${escape(property.category)}${property.subcategory ? ` · ${escape(property.subcategory)}` : ''} · ${escape(property.barangay || '')}</p><p>${number(property.area * 10000)} m² · ₱${number(property.price)}</p><span class="city-pill ${escape(property.approvalState)}">${escape(stateLabel(property.approvalState))}</span></div>
        <div class="city-property-scores"><span>MCE ${score(property.mceScore)}${property.mceRank ? ` · #${property.mceRank}` : ''}</span><span>IAI ${score(property.iaiScore)}${property.iaiRank ? ` · #${property.iaiRank}` : ''}</span></div>
        <div class="city-property-actions"><button class="city-button city-button-secondary" type="button" data-edit-property="${property.id}">Edit</button>${governance && property.approvalState !== 'archived' ? `<button class="city-button" type="button" data-review-property="${property.id}">Review</button>` : ''}</div>
      </article>`).join('') : '<p class="city-empty">No properties found.</p>';
  }

  async function loadBrokerReviews() {
    const panel = root.querySelector('[data-broker-reviews]');
    if (!panel) return;
    try {
      const data = await request('seller-profiles.php?scope=queue');
      const profiles = (data.profiles || []).filter((profile) => ['pending_review', 'verified', 'rejected', 'suspended'].includes(profile.applicationStatus));
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

  function updateSubcategories(selected = '') {
    const options = categories[form.elements.category.value] || [];
    form.elements.subcategory.innerHTML = '<option value="">Select if applicable</option>' + options.map((item) => `<option value="${escape(item)}">${escape(item)}</option>`).join('');
    form.elements.subcategory.value = selected;
    form.elements.subcategory.disabled = options.length === 0;
  }

  function liveScores() {
    const fields = Array.from(form.querySelectorAll('[data-criterion]'));
    if (fields.some((field) => field.value === '' || !field.validity.valid)) {
      form.querySelector('[data-live-scores]').textContent = 'MCE — · IAI — · Complete all seven criteria to score';
      return;
    }
    const weights = { spatial_accessibility: 20, infrastructure_readiness: 20, economic_viability: 20, nearby_businesses: 10, zoning_compatibility: 15, risk_constraints: 10, environmental_safety: 5 };
    const values = Object.fromEntries(fields.map((field) => [field.dataset.criterion, Number(field.value)]));
    const mce = fields.reduce((total, field) => total + Number(field.value) * weights[field.dataset.criterion] / 100, 0);
    const iai = mce * .6 + values.economic_viability * .2 + values.infrastructure_readiness * .2;
    form.querySelector('[data-live-scores]').textContent = `MCE ${mce.toFixed(1)} · IAI ${iai.toFixed(1)}`;
  }

  function openEditor(propertyId = null) {
    if (!form) return;
    form.reset();
    const property = properties.find((item) => item.id === Number(propertyId));
    form.elements.id.value = property?.id || '';
    editor.querySelector('#cityEditorTitle').textContent = property ? 'Edit property' : 'Add property';
    form.elements.contactBrokerUserId.innerHTML = '<option value="">Open listing</option>' + brokers.map((broker) => `<option value="${broker.id}">${escape(broker.name)}${broker.phone ? ` · ${escape(broker.phone)}` : ''}</option>`).join('');
    if (property) {
      const values = { property_name: property.name, category: property.category, barangay: property.barangay, status: property.status, land_area: Math.round(property.area * 10000 * 100) / 100, price: property.price, lat: property.lat, lng: property.lng, description: property.description, owner_name: property.ownerContact?.name, owner_phone: property.ownerContact?.phone, owner_email: property.ownerContact?.email, contactBrokerUserId: property.contactBrokerUserId, readiness_notes: property.readinessNotes };
      Object.entries(values).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value ?? ''; });
      updateSubcategories(property.subcategory || '');
      form.querySelectorAll('[data-criterion]').forEach((field) => { field.value = property.assessmentCriteria?.[field.dataset.criterion] ?? ''; });
      form.querySelectorAll('[name="assessmentTags[]"]').forEach((field) => { field.checked = (property.assessmentTags || []).includes(field.value); });
    } else {
      form.elements.category.value = 'Land';
      updateSubcategories();
      form.elements.lat.value = '';
      form.elements.lng.value = '';
    }
    message(form.querySelector('[data-editor-message]'), '');
    liveScores();
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
  form?.querySelectorAll('[data-criterion]').forEach((field) => field.addEventListener('input', liveScores));

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    const id = form.elements.id.value;
    const data = new FormData(form);
    data.delete('id');
    data.set('land_area_unit', 'sqm');
    const type = { Industrial: 'manufacturing', Hospitality: 'hotel', Office: 'bpo' }[form.elements.category.value] || 'commercial';
    data.set('property_type', type);
    data.set('subcategory', form.elements.subcategory.value || '');
    data.set('contactMode', form.elements.contactBrokerUserId.value ? 'broker' : 'open_listing');
    data.set('assessmentCriteria', JSON.stringify(Object.fromEntries(Array.from(form.querySelectorAll('[data-criterion]')).map((field) => [field.dataset.criterion, field.value === '' ? null : Number(field.value)]))));
    data.set('assessmentTags', JSON.stringify(Array.from(form.querySelectorAll('[name="assessmentTags[]"]:checked')).map((field) => field.value)));
    if (id) data.set('_method', 'PATCH');
    try {
      await request(id ? `property.php?id=${encodeURIComponent(id)}` : 'properties.php', { method: 'POST', body: data });
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

  root.addEventListener('submit', async (event) => {
    const brokerForm = event.target.closest('[data-broker-review]');
    if (!brokerForm) return;
    event.preventDefault();
    const decision = event.submitter?.value;
    if (decision === 'verified' && !brokerForm.elements.prcChecked.checked) {
      message(brokerForm.querySelector('[data-broker-message]'), 'Check the PRC registration before validating.', true);
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
  }).catch((error) => message(status, error.message, true));
})();
