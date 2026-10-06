import { api } from './api.js';

const byId = (id) => document.getElementById(id);
const user = window.SFC_APP_CONFIG?.user || {};
const basePath = String(window.SFC_APP_CONFIG?.basePath || '').replace(/\/$/, '');
const categories = JSON.parse(byId('brokerCategoryData')?.textContent || '{}');
const dialog = byId('brokerListingDialog');
const form = byId('brokerListingForm');
const state = { properties: [], profile: null, threads: [], requests: [], activeThread: null, threadData: null, query: '', filter: 'all' };
const labels = { approved: 'Accepted', pending_review: 'Pending review', rejected: 'Declined', verified: 'Verified broker', suspended: 'Suspended', draft: 'Complete verification', archived: 'Archived' };
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const money = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 4 }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled';
const badge = (status) => `<span class="broker-badge is-${escape(status)}">${escape(labels[status] || String(status || 'Pending').replaceAll('_', ' '))}</span>`;
const canSubmit = () => {
  const profile = state.profile;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  return profile?.applicationStatus === 'verified'
    && profile?.sellerType === 'broker'
    && /^[0-9]{1,20}$/.test(String(profile.prcRegistrationNo || ''))
    && /^\d{4}-\d{2}-\d{2}$/.test(String(profile.prcValidUntil || ''))
    && profile.prcValidUntil >= today;
};
const ownProperties = () => state.properties.filter((property) => Number(property.sellerUserId) === Number(user.id));

function feedback(message, error = false) {
  const node = byId('brokerFeedback');
  node.textContent = message;
  node.hidden = !message;
  node.classList.toggle('is-error', error);
}

async function run(button, action) {
  if (button) button.disabled = true;
  try { await action(); } catch (error) { feedback(error.message || 'Unable to complete this action.', true); }
  finally { if (button?.isConnected) button.disabled = false; }
}

function renderVerification() {
  const profile = state.profile;
  const addButton = byId('brokerAddListing');
  addButton.disabled = !canSubmit();
  addButton.title = canSubmit() ? 'Submit a property for city review' : 'CICTO must verify your broker account first';
  if (!profile) {
    byId('brokerVerification').innerHTML = '<strong>Verification unavailable</strong><p>Reload to check your account. Listing submission is paused.</p>';
    return;
  }
  const status = profile.applicationStatus === 'verified' && !canSubmit() ? 'draft' : (profile.applicationStatus || 'draft');
  const copy = {
    verified: 'Your account is verified. Listings still require CICTO approval.',
    pending_review: 'CICTO is reviewing your PRC credentials. You can submit listings after approval.',
    rejected: 'Update your credentials and resubmit your application.',
    suspended: 'Contact CICTO about your account status.',
    draft: 'Complete your PRC credentials in your profile for CICTO review.',
  };
  byId('brokerVerification').innerHTML = `${badge(status)}<strong>${escape(profile.displayName || profile.legalName || user.name)}</strong><a href="${basePath}/profile.php">${['draft', 'rejected'].includes(status) ? 'Complete profile' : 'My profile'} ↗</a><p>${escape(copy[status] || copy.draft)}</p>${profile.reviewNotes ? `<p class="broker-admin-note"><strong>CICTO message</strong> · ${escape(profile.reviewNotes)}</p>` : ''}`;
}

function renderStats() {
  const properties = ownProperties();
  const counts = [
    ['Accepted', properties.filter((property) => property.approvalState === 'approved').length],
    ['Declined', properties.filter((property) => property.approvalState === 'rejected').length],
    ['Pending', properties.filter((property) => property.approvalState === 'pending_review').length],
    ['Investor saves', properties.reduce((sum, property) => sum + Number(property.saveCount || 0), 0)],
  ];
  byId('brokerStats').innerHTML = counts.map(([label, value]) => `<article class="broker-stat"><span>${label}</span><strong>${number(value)}</strong></article>`).join('');
  byId('brokerListingCount').textContent = String(properties.length);
}

function score(property, key) {
  const value = property[`${key}Score`];
  const rank = property[`${key}Rank`];
  return `<span class="broker-score" title="${key === 'mce' ? 'Multi-Criteria Evaluation' : 'Investment Attractiveness Index'}">${key.toUpperCase()} <strong>${value === null || value === undefined ? 'Pending' : `${number(value)}/100`}</strong>${rank ? ` · #${number(rank)}` : ''}</span>`;
}

function renderListings() {
  const own = ownProperties();
  const properties = own.filter((property) => (state.filter === 'all' || property.approvalState === state.filter) && [property.name, property.barangay, property.category, property.subcategory].join(' ').toLowerCase().includes(state.query));
  byId('brokerListings').innerHTML = properties.length ? properties.map((property) => `
    <article class="broker-listing" data-broker-property="${Number(property.id)}">
      <img class="broker-listing-photo" src="${escape(property.imageUrl || `${basePath}/assets/images/Property10.png`)}" alt="" loading="lazy">
      <div>
        <div class="broker-listing-title"><a href="${basePath}/property-details.php?id=${Number(property.id)}">${escape(property.name)}</a>${badge(property.approvalState || 'pending_review')}</div>
        <p class="broker-listing-location">${escape([property.barangay, property.subcategory || property.category].filter(Boolean).join(' · '))}</p>
        <div class="broker-listing-meta"><span>${money(property.price)}</span><span>${number(property.area)} ha</span><span>${number(property.saveCount)} saved</span>${score(property, 'mce')}${score(property, 'iai')}</div>
        ${property.reviewNote ? `<p class="broker-review-note"><strong>CICTO message</strong> · ${escape(property.reviewNote)}</p>` : ''}
      </div>
      <div class="broker-listing-action"><a class="broker-button" href="${basePath}/property-details.php?id=${Number(property.id)}">View</a><button class="broker-button" data-broker-edit="${Number(property.id)}" ${canSubmit() ? '' : 'disabled'}>Edit</button></div>
    </article>`).join('') : `<p class="broker-empty">${own.length ? 'No matching listings.' : 'Your first listing starts here. Submit a property when your account is verified.'}</p>`;
}

function updateSubcategories(selected = '') {
  const options = categories[byId('brokerCategory').value] || [];
  const select = byId('brokerSubcategory');
  select.innerHTML = `<option value="">${options.length ? 'Select subcategory' : 'No subcategory'}</option>${options.map((option) => `<option value="${escape(option)}">${escape(option)}</option>`).join('')}`;
  select.value = selected;
  select.disabled = !options.length;
}

function openListing(property = null) {
  if (!canSubmit()) return;
  form.reset();
  const contact = property?.ownerContact || {};
  const values = {
    propertyId: property?.id || '', property_name: property?.name || '', category: property?.category || 'Retail',
    barangay: property?.barangay || '', city: property?.city || 'San Fernando, La Union', price: property?.price ?? '',
    land_area: property?.area ?? '', description: property?.description || '', latitude: property?.lat ?? '', longitude: property?.lng ?? '',
    corridor: property?.corridor || 'highway', status: property?.status || 'Available', owner_name: contact.name || state.profile?.legalName || user.name || '',
    owner_email: contact.email || user.email || '', owner_phone: contact.phone || state.profile?.phone || '', contactMode: property?.contactMode || 'broker',
  };
  Object.entries(values).forEach(([key, value]) => { if (form.elements.namedItem(key)) form.elements.namedItem(key).value = value; });
  updateSubcategories(property?.subcategory || '');
  byId('brokerModalTitle').textContent = property ? 'Edit listing' : 'Submit listing';
  byId('brokerFormError').hidden = true;
  form.querySelector('details').open = false;
  dialog.showModal();
}

function renderThreads() {
  byId('brokerMessageCount').textContent = String(state.threads.length);
  byId('brokerThreadList').innerHTML = state.threads.length ? state.threads.map((thread) => `<button type="button" class="broker-thread-button ${Number(thread.id) === Number(state.activeThread) ? 'is-active' : ''}" data-broker-thread="${Number(thread.id)}"><strong>${escape(thread.propertyName)}</strong><span>${escape(thread.investorName || 'Investor')}</span></button>`).join('') : '<p class="broker-empty">No messages yet.</p>';
}

function visitWindow(window) {
  return window ? `${date(window.startAt)} – ${new Date(window.endAt).toLocaleTimeString('en-PH', { timeStyle: 'short' })}` : 'No window';
}

function renderVisit(visit) {
  if (!visit) return '';
  const status = visit.status;
  const action = (label, actionName, selection = '') => `<button type="button" class="broker-button" data-broker-visit="${actionName}" data-selection="${selection}">${label}</button>`;
  const buttons = status === 'proposed' ? `${action('Confirm primary', 'confirm', 'primary')}${visit.secondaryWindow ? action('Confirm alternate', 'confirm', 'secondary') : ''}`
    : status === 'counter_offered' ? action('Confirm proposed time', 'confirm', 'counter')
    : status === 'confirmed' ? `${action('Start visit', 'markInProgress')}${action('Mark completed', 'markVisited')}`
    : status === 'in_progress' ? action('Mark completed', 'markVisited') : '';
  return `<section class="broker-visit"><strong>Site visit · ${escape(visit.statusLabel || status)}</strong><p>${escape(visitWindow(visit.activeWindow || visit.confirmedWindow || visit.primaryWindow))}</p>${status === 'proposed' && visit.secondaryWindow ? `<p>Alternate: ${escape(visitWindow(visit.secondaryWindow))}</p>` : ''}<div class="broker-actions">${buttons}</div>${['proposed', 'confirmed'].includes(status) ? `<details><summary>Suggest another time</summary><form class="broker-visit-form" id="brokerCounterForm"><label>Start<input type="datetime-local" name="counterStartAt" required></label><label>End<input type="datetime-local" name="counterEndAt" required></label><button class="broker-button" type="submit">Send proposed time</button></form></details>` : ''}</section>`;
}

function renderThread() {
  const data = state.threadData;
  const thread = data?.thread || state.threads.find((item) => Number(item.id) === Number(state.activeThread));
  if (!thread) return;
  const messages = data?.messages || [];
  byId('brokerThreadView').innerHTML = `<div class="broker-conversation-heading"><strong>${escape(thread.propertyName)}</strong> · ${escape(thread.investorName || 'Investor')}</div>${renderVisit(data?.visit)}<div class="broker-bubbles">${messages.length ? messages.map((message) => `<div class="broker-bubble ${Number(message.senderUserId) === Number(user.id) ? 'is-own' : ''}"><small>${escape(message.senderName)}${message.role === 'admin' ? ' · City administrator' : ''} · ${escape(date(message.createdAt))}</small>${escape(message.text)}</div>`).join('') : '<p class="broker-empty">No messages yet.</p>'}</div><form class="broker-reply" id="brokerReplyForm"><label class="broker-sr-only" for="brokerReplyText">Message</label><textarea id="brokerReplyText" name="text" rows="2" placeholder="Write a reply" required maxlength="5000"></textarea><button class="broker-button is-primary" type="submit">Send</button></form>`;
  const bubbles = byId('brokerThreadView').querySelector('.broker-bubbles');
  bubbles.scrollTop = bubbles.scrollHeight;
}

async function openThread(threadId) {
  const data = await api.getThread(threadId);
  state.activeThread = threadId;
  state.threadData = data;
  renderThreads();
  renderThread();
}

function renderDocuments() {
  byId('brokerDocumentCount').textContent = String(state.requests.filter((request) => ['requested', 'in_review'].includes(request.status)).length);
  byId('brokerDocumentList').innerHTML = state.requests.length ? state.requests.map((request) => `<article class="broker-document"><strong>${escape(request.documentName)}</strong><p>${escape(request.propertyName)} · ${escape(request.requesterName)}</p>${request.note ? `<p>${escape(request.note)}</p>` : ''}<form class="broker-document-form" data-broker-document="${Number(request.id)}"><label><span class="broker-sr-only">Request status</span><select name="status">${Object.entries({ requested: 'Requested', in_review: 'In review', fulfilled: 'Fulfilled', declined: 'Declined' }).map(([value, label]) => `<option value="${value}" ${value === request.status ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label><span class="broker-sr-only">Response note</span><input name="responseNote" value="${escape(request.responseNote || '')}" placeholder="Response note" maxlength="2000"></label><button type="submit" class="broker-button">Update</button></form></article>`).join('') : '<p class="broker-empty">No document requests.</p>';
}

async function reload() {
  const [propertyResult, profileResult, threadResult, documentResult] = await Promise.allSettled([api.properties(), api.sellerProfile(), api.getMessageInbox(), api.getDocumentRequestInbox()]);
  if (propertyResult.status === 'fulfilled') state.properties = propertyResult.value.properties || [];
  if (profileResult.status === 'fulfilled') state.profile = profileResult.value.profile || null;
  if (threadResult.status === 'fulfilled') state.threads = threadResult.value.threads || [];
  if (documentResult.status === 'fulfilled') state.requests = documentResult.value.requests || [];
  renderVerification();
  renderStats();
  renderListings();
  renderThreads();
  renderDocuments();
  const failures = [propertyResult, profileResult, threadResult, documentResult].filter((result) => result.status === 'rejected');
  if (failures.length) feedback(failures.map((result) => result.reason.message).join(' '), true);
  if (state.activeThread && byId('brokerMessagesDetails').open) await openThread(state.activeThread);
}

async function revealLinkedTarget() {
  const params = new URLSearchParams(location.search);
  const positiveId = (key) => {
    const value = Number(params.get(key));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  };
  const threadId = positiveId('threadId');
  const requestId = positiveId('documentRequestId');
  const propertyId = positiveId('propertyId');
  const hash = location.hash.slice(1);
  if (hash === 'brokerDocumentsDetails' || (!hash && requestId)) {
    const panel = byId('brokerDocumentsDetails');
    panel.open = true;
    const request = state.requests.find((item) => requestId ? Number(item.id) === requestId : Number(item.propertyId) === propertyId);
    const target = request ? panel.querySelector(`[data-broker-document="${Number(request.id)}"]`) : null;
    (target?.closest('.broker-document') || panel).scrollIntoView({ block: 'center' });
    target?.querySelector('select')?.focus({ preventScroll: true });
    return;
  }
  if (hash === 'brokerMessagesDetails' || (!hash && threadId)) {
    const panel = byId('brokerMessagesDetails');
    const thread = state.threads.find((item) => threadId ? Number(item.id) === threadId : Number(item.propertyId) === propertyId)
      || (!threadId && !propertyId ? state.threads[0] : null);
    if (thread) await openThread(Number(thread.id));
    else if (threadId || propertyId) feedback('This conversation is unavailable in your inbox.', true);
    panel.open = true;
    panel.scrollIntoView({ block: 'center' });
    return;
  }
  if (propertyId) {
    const target = byId('brokerListings').querySelector(`[data-broker-property="${propertyId}"]`);
    target?.scrollIntoView({ block: 'center' });
  }
}

byId('brokerAddListing').addEventListener('click', () => openListing());
byId('brokerCloseDialog').addEventListener('click', () => dialog.close());
byId('brokerCancelDialog').addEventListener('click', () => dialog.close());
byId('brokerCategory').addEventListener('change', () => updateSubcategories());
byId('brokerSearch').addEventListener('input', (event) => { state.query = event.target.value.trim().toLowerCase(); renderListings(); });
byId('brokerStatusFilter').addEventListener('change', (event) => { state.filter = event.target.value; renderListings(); });
byId('brokerListings').addEventListener('click', (event) => {
  const button = event.target.closest('[data-broker-edit]');
  if (button) openListing(ownProperties().find((property) => Number(property.id) === Number(button.dataset.brokerEdit)));
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canSubmit()) return;
  const button = byId('brokerSubmitListing');
  const errorNode = byId('brokerFormError');
  button.disabled = true;
  errorNode.hidden = true;
  try {
    const payload = new FormData(form);
    const id = Number(payload.get('propertyId') || 0);
    payload.delete('propertyId');
    const legacyTypes = { Retail: 'commercial', Multifamily: 'commercial', Office: 'bpo', Industrial: 'manufacturing', Hospitality: 'hotel' };
    payload.set('property_type', legacyTypes[payload.get('category')] || 'commercial');
    if (!payload.get('subcategory')) payload.set('subcategory', '');
    for (const [source, target] of [['latitude', 'lat'], ['longitude', 'lng']]) {
      if (String(payload.get(source) || '').trim()) payload.set(target, payload.get(source));
      payload.delete(source);
    }
    const photo = payload.get('image_file');
    if (!photo?.size) payload.delete('image_file');
    if (id) await api.updateProperty(id, payload); else await api.createProperty(payload);
    dialog.close();
    feedback('Listing submitted for CICTO review.');
    await reload();
  } catch (error) { errorNode.textContent = error.message || 'Unable to submit the listing.'; errorNode.hidden = false; }
  finally { button.disabled = false; }
});

byId('brokerThreadList').addEventListener('click', (event) => {
  const button = event.target.closest('[data-broker-thread]');
  if (button) run(button, () => openThread(Number(button.dataset.brokerThread)));
});
byId('brokerMessagesDetails').addEventListener('toggle', () => {
  if (byId('brokerMessagesDetails').open && !state.activeThread && state.threads.length) run(null, () => openThread(Number(state.threads[0].id)));
});
byId('brokerThreadView').addEventListener('click', (event) => {
  const button = event.target.closest('[data-broker-visit]');
  if (!button || !state.threadData?.visit) return;
  run(button, async () => {
    const response = await api.updateVisit({ visitId: state.threadData.visit.id, action: button.dataset.brokerVisit, selection: button.dataset.selection });
    state.threadData = { ...state.threadData, ...response };
    renderThread();
    feedback('Site visit updated.');
  });
});
byId('brokerThreadView').addEventListener('submit', (event) => {
  event.preventDefault();
  const activeForm = event.target;
  const values = Object.fromEntries(new FormData(activeForm));
  run(activeForm.querySelector('button[type="submit"]'), async () => {
    if (activeForm.id === 'brokerReplyForm') {
      const text = String(values.text || '').trim();
      if (!text) return;
      const response = await api.sendMessage({ threadId: state.activeThread, text });
      state.threadData = { ...state.threadData, ...response };
    } else if (activeForm.id === 'brokerCounterForm') {
      if (new Date(values.counterEndAt) <= new Date(values.counterStartAt)) throw new Error('End time must follow start time.');
      const response = await api.updateVisit({ visitId: state.threadData.visit.id, action: 'counteroffer', counterStartAt: new Date(values.counterStartAt).toISOString(), counterEndAt: new Date(values.counterEndAt).toISOString() });
      state.threadData = { ...state.threadData, ...response };
      feedback('Proposed visit time sent.');
    }
    renderThread();
  });
});
byId('brokerDocumentList').addEventListener('submit', (event) => {
  event.preventDefault();
  const activeForm = event.target.closest('[data-broker-document]');
  if (!activeForm) return;
  run(activeForm.querySelector('button'), async () => {
    await api.updateDocumentRequest({ requestId: Number(activeForm.dataset.brokerDocument), ...Object.fromEntries(new FormData(activeForm)) });
    feedback('Document request updated.');
    await reload();
  });
});

window.addEventListener('hashchange', () => run(null, revealLinkedTarget));
reload().then(revealLinkedTarget).catch((error) => feedback(error.message, true));
