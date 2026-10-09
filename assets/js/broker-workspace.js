import { api } from './api.js';
import { listingPurposeLabel, listingPriceLabel } from './utils.js';
import './nearby-editor.js';

const byId = (id) => document.getElementById(id);
const user = window.SFC_APP_CONFIG?.user || {};
const basePath = String(window.SFC_APP_CONFIG?.basePath || '').replace(/\/$/, '');
const categories = JSON.parse(byId('brokerCategoryData')?.textContent || '{}');
const editor = document.getElementById('cityPropertyEditor');
const form = editor?.querySelector('[data-property-form]');
const apiBase = String(window.SFC_APP_CONFIG?.apiBase || `${basePath}/api`).replace(/\/$/, '');
let nearby = window.SFCNearby?.(form?.querySelector('[data-nearby-editor]'));
let automaticAssessment = window.SFCAutomaticAssessment?.(form, { apiBase, dialog: editor });
let propertyWizard = window.SFCPropertyWizard?.(form, { apiBase, dialog: editor, assessment: automaticAssessment });
propertyWizard?.setNearby(nearby);
let locationEditor = propertyWizard || window.SFCAdminLocation?.(form, { apiBase, dialog: editor });
let editorLastStep = propertyWizard ? 4 : 2;
let editorStep = 0;

function ensureWizard() {
  if (!nearby && window.SFCNearby) {
    nearby = window.SFCNearby(form?.querySelector('[data-nearby-editor]'));
  }
  if (!automaticAssessment && window.SFCAutomaticAssessment) {
    automaticAssessment = window.SFCAutomaticAssessment(form, { apiBase, dialog: editor });
  }
  if (!propertyWizard && window.SFCPropertyWizard) {
    propertyWizard = window.SFCPropertyWizard(form, { apiBase, dialog: editor, assessment: automaticAssessment });
    propertyWizard?.setNearby(nearby);
    locationEditor = propertyWizard;
    editorLastStep = 4;
  }
}
const state = { properties: [], profile: null, threads: [], requests: [], activeThread: null, threadData: null, query: '', filter: 'all' };
const labels = { approved: 'Accepted', pending_review: 'Pending review', corrections_requested: 'Corrections requested', rejected: 'Declined', blocked: 'Blocked after review', verified: 'Verified broker', suspended: 'Suspended', draft: 'Complete verification', archived: 'Archived' };
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const number = (value) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 4 }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled';
const badge = (status) => `<span class="broker-badge is-${escape(status)}">${escape(labels[status] || String(status || 'Pending').replaceAll('_', ' '))}</span>`;
const validPrcDocument = document => document
  && /^[a-f0-9]{64}$/i.test(String(document.id || ''))
  && ['image/jpeg', 'image/png', 'image/webp'].includes(document.mime)
  && Number(document.size) > 0 && Number(document.size) <= 5 * 1024 * 1024;
const canSubmit = () => {
  const profile = state.profile;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  return profile?.applicationStatus === 'verified'
    && Boolean(user.emailVerifiedAt || user.emailVerified)
    && validPrcDocument(profile.frontDocument) && validPrcDocument(profile.backDocument)
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
  const heroName = byId('brokerHeroName');
  if (heroName && (profile?.displayName || profile?.legalName)) {
    const firstName = window.SFC_APP_CONFIG?.user?.firstName || (profile.legalName || profile.displayName).trim().split(/\s+/)[0];
    if (firstName) heroName.textContent = firstName;
  }
  addButton.disabled = !canSubmit();
  addButton.title = canSubmit() ? 'Submit a property for city review' : 'Verify your email and complete broker application approval first';
  if (!profile) {
    byId('brokerVerification').innerHTML = `
      <div class="broker-verify-badge-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
      </div>
      <div class="broker-verify-info">
        <div class="broker-verify-title-row">
          <span class="broker-verify-pill is-pending">Verification unavailable</span>
          <strong class="broker-verify-name">${escape(user.name || 'Broker')}</strong>
        </div>
        <p class="broker-verify-msg">Reload to check your account. Listing submission is paused.</p>
      </div>`;
    return;
  }
  const status = profile.applicationStatus || 'draft';
  const copy = {
    verified: 'Your broker application is approved. Listings still require CICTO approval.',
    pending_review: 'Authorized CAO or LEBDO personnel are reviewing your PRC credentials and both ID images.',
    corrections_requested: 'Your reviewer has requested corrections. Update your credentials or images and resubmit your application.',
    rejected: 'Update your credentials and resubmit your application.',
    suspended: 'Contact support about your account status.',
    blocked: 'Your account has been blocked following a documented credential review. Contact support about the decision.',
    draft: 'Complete your PRC credentials and both ID images in your profile for authorized CAO or LEBDO review.',
  };
  const statusLabels = {
    verified: 'Verified broker',
    pending_review: 'Pending review',
    corrections_requested: 'Corrections requested',
    rejected: 'Declined',
    suspended: 'Suspended',
    blocked: 'Blocked after review',
    draft: 'Pending verification'
  };
  const displayName = escape(profile.displayName || profile.legalName || user.name || 'Broker');
  const linkText = ['draft', 'rejected', 'corrections_requested'].includes(status) ? 'Complete profile' : 'My profile';
  const requirements = [];
  if (!user.emailVerifiedAt && !user.emailVerified) requirements.push('Verify your email to enable listing submission.');
  if (!validPrcDocument(profile.frontDocument) || !validPrcDocument(profile.backDocument)) requirements.push('Upload both valid PRC ID images in your profile.');
  if (profile.prcValidUntil && profile.prcValidUntil < new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })) requirements.push('Your PRC ID has expired. Update your credentials for review.');

  byId('brokerVerification').innerHTML = `
    <div class="broker-verify-badge-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <circle cx="12" cy="15" r="3"></circle>
        <polyline points="12 14 12 15 13 15"></polyline>
      </svg>
    </div>
    <div class="broker-verify-info">
      <div class="broker-verify-title-row">
        <span class="broker-verify-pill is-${escape(status)}">${escape(statusLabels[status] || status)}</span>
        <strong class="broker-verify-name">${displayName}</strong>
      </div>
      <p class="broker-verify-msg">${escape(copy[status] || copy.draft)}</p>
      <p class="broker-verify-msg"><strong>Email ownership:</strong> ${user.emailVerifiedAt || user.emailVerified ? 'Verified' : 'Not yet verified'}</p>
      ${requirements.length ? `<p class="broker-verify-msg">${escape(requirements.join(' '))}</p>` : ''}
      ${profile.reviewNotes ? `<p class="broker-admin-note"><strong>Application review</strong> · ${escape(profile.reviewNotes)}</p>` : ''}
    </div>
    <a class="broker-verify-link" href="${basePath}/profile.php">${linkText} &rarr;</a>
  `;
}

function sparklineSvg(color) {
  const hexMap = {
    emerald: '#10b981',
    rose: '#ef4444',
    amber: '#f59e0b',
    blue: '#3b82f6',
  };
  const hex = hexMap[color] || '#3b82f6';
  const gradId = `kpiWave_${color}`;
  return `
    <svg class="broker-kpi-wave" viewBox="0 0 120 40" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${hex}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${hex}" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <path d="M0,32 C28,32 38,20 62,23 C86,26 96,8 120,6 L120,40 L0,40 Z" fill="url(#${gradId})"/>
      <path d="M0,32 C28,32 38,20 62,23 C86,26 96,8 120,6" stroke="${hex}" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
}

function renderStats() {
  const properties = ownProperties();
  const stats = [
    {
      key: 'approved',
      label: 'Accepted',
      value: properties.filter((p) => p.approvalState === 'approved').length,
      desc: 'Listings approved and live',
      color: 'emerald',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    },
    {
      key: 'rejected',
      label: 'Declined',
      value: properties.filter((p) => p.approvalState === 'rejected').length,
      desc: 'Listings not approved',
      color: 'rose',
      icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
    },
    {
      key: 'pending_review',
      label: 'Pending',
      value: properties.filter((p) => p.approvalState === 'pending_review').length,
      desc: 'Under city review',
      color: 'amber',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
    },
    {
      key: 'saves',
      label: 'Investor saves',
      value: properties.reduce((sum, p) => sum + Number(p.saveCount || 0), 0),
      desc: 'Saved by potential investors',
      color: 'blue',
      icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`
    }
  ];

  byId('brokerStats').innerHTML = stats.map((stat) => `
    <article class="broker-kpi-card is-${stat.color}">
      <div class="broker-kpi-head">
        <div class="broker-kpi-icon is-${stat.color}">${stat.icon}</div>
        <span class="broker-kpi-label">${stat.label}</span>
      </div>
      <strong class="broker-kpi-value">${number(stat.value)}</strong>
      <span class="broker-kpi-desc">${stat.desc}</span>
      <div class="broker-kpi-wave-wrap">
        ${sparklineSvg(stat.color)}
      </div>
    </article>
  `).join('');

  byId('brokerListingCount').textContent = String(properties.length);
}

function score(property, key) {
  const value = property[`${key}Score`];
  const rank = property[`${key}Rank`];
  return `<span class="broker-score-pill" title="${key === 'mce' ? 'Multi-Criteria Evaluation' : 'Investment Attractiveness Index'}">${key.toUpperCase()} <strong>${value === null || value === undefined ? 'Pending' : `${number(value)}/100`}</strong>${rank ? ` · #${number(rank)}` : ''}</span>`;
}

function renderListings() {
  const own = ownProperties();
  const properties = own.filter((property) => (state.filter === 'all' || property.approvalState === state.filter) && [property.name, property.barangay, property.category, property.subcategory].join(' ').toLowerCase().includes(state.query));
  byId('brokerListings').innerHTML = properties.length ? properties.map((property) => `
    <article class="broker-listing" data-broker-property="${Number(property.id)}">
      <img class="broker-listing-photo" src="${escape(property.imageUrl || `${basePath}/assets/images/Property10.png`)}" alt="" loading="lazy">
      <div>
        <div class="broker-listing-title">
          <a href="${basePath}/property-details.php?id=${Number(property.id)}">${escape(property.name)}</a>
          ${badge(property.approvalState || 'pending_review')}
        </div>
        <p class="broker-listing-location">${escape([property.barangay, property.subcategory || property.category].filter(Boolean).join(' · '))}</p>
        <div class="broker-listing-meta">
          <span>${escape(listingPurposeLabel(property))}</span>
          <span><strong>${escape(listingPriceLabel(property))}</strong></span>
          <span>${escape(property.status || 'Available')}</span>
          <span>${property.area > 0 ? `${number(property.area)} ha` : 'Area not provided'}</span>
          <span>${number(property.saveCount)} saved</span>
          ${score(property, 'mce')}
          ${score(property, 'iai')}
        </div>
        ${property.reviewNote ? `<p class="broker-review-note"><strong>CICTO message</strong> · ${escape(property.reviewNote)}</p>` : ''}
      </div>
      <div class="broker-listing-action">
        <a class="broker-button" href="${basePath}/property-details.php?id=${Number(property.id)}">View</a>
        <button class="broker-button" data-broker-edit="${Number(property.id)}" ${canSubmit() ? '' : 'disabled'}>Edit</button>
      </div>
    </article>`).join('') : own.length ? '<p class="broker-empty">No matching listings. Try a different search or status.</p>' : `
    <div class="broker-empty-opportunity">
      <svg class="broker-empty-illus" width="160" height="88" viewBox="0 0 160 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M28 32 C28 26 33 22 39 22 C43 22 47 24 49 27 C51 26 53 25 56 25 C61 25 65 29 65 34 C65 34 66 34 67 34 C70 34 72 36 72 39 C72 42 70 44 67 44 L28 44 C24 44 21 41 21 37 C21 34 24 32 28 32 Z" fill="#EEF2F6" opacity="0.8"/>
        <path d="M106 28 C106 24 110 20 114 20 C117 20 120 22 121 24 C123 23 125 22 127 22 C131 22 134 25 134 29 C134 29 135 29 136 29 C138 29 140 31 140 33 C140 36 138 38 136 38 L106 38 C103 38 100 35 100 32 C100 30 102 28 106 28 Z" fill="#EEF2F6" opacity="0.8"/>
        <ellipse cx="44" cy="54" rx="9" ry="15" fill="#CBD5E1"/>
        <rect x="42.5" y="62" width="3" height="12" fill="#94A3B8"/>
        <ellipse cx="120" cy="56" rx="8" ry="13" fill="#CBD5E1"/>
        <rect x="119" y="63" width="2" height="11" fill="#94A3B8"/>
        <line x1="16" y1="74" x2="144" y2="74" stroke="#E2E8F0" stroke-width="2" stroke-linecap="round"/>
        <path d="M62 74 L62 48 L80 34 L98 48 L98 74 Z" fill="#FFFFFF" stroke="#94A3B8" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="74" y="58" width="12" height="16" rx="2" fill="#F1F5F9" stroke="#94A3B8" stroke-width="1.8"/>
        <rect x="76" y="44" width="8" height="8" rx="1.5" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.8"/>
        <circle cx="98" cy="34" r="11" fill="#FEF3C7" stroke="#FDE68A" stroke-width="2"/>
        <path d="M98 29 L98 39 M93 34 L103 34" stroke="#D97706" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <h3 class="broker-empty-title">Your next opportunity starts here</h3>
      <p class="broker-empty-subtitle">
        ${canSubmit() ? 'Add property details to start connecting with investors.' : 'Complete broker verification to start submitting properties and connect with investors.'}
      </p>
      <div class="broker-stepper">
        <div class="broker-step">
          <div class="broker-step-num">1</div>
          <div class="broker-step-label">Submit listing</div>
          <div class="broker-step-sub">Add property details</div>
        </div>
        <div class="broker-step-line"></div>
        <div class="broker-step">
          <div class="broker-step-num">2</div>
          <div class="broker-step-label">City review</div>
          <div class="broker-step-sub">CICTO assesses your listing</div>
        </div>
        <div class="broker-step-line"></div>
        <div class="broker-step">
          <div class="broker-step-num">3</div>
          <div class="broker-step-label">Reach investors</div>
          <div class="broker-step-sub">Get discovered by interested buyers</div>
        </div>
      </div>
    </div>`;
}

function setEditorStep(step) {
  ensureWizard();
  editorStep = step;
  form?.querySelectorAll('[data-editor-panel]').forEach((panel) => { panel.hidden = Number(panel.dataset.editorPanel) !== step; });
  form?.querySelectorAll('[data-editor-step]').forEach((button) => {
    const active = Number(button.dataset.editorStep) === step;
    button.setAttribute('aria-current', active ? 'step' : 'false');
    button.classList.toggle('is-active', active);
    button.classList.toggle('is-complete', Number(button.dataset.editorStep) < step);
  });
  const backBtn = form?.querySelector('[data-editor-back]');
  if (backBtn) {
    backBtn.disabled = step === 0;
    backBtn.classList.toggle('tw-opacity-40', step === 0);
  }
  const nextBtn = form?.querySelector('[data-editor-next]');
  if (nextBtn) nextBtn.hidden = step === editorLastStep;
  const submitBtn = form?.querySelector('[type="submit"]');
  if (submitBtn) submitBtn.hidden = step !== editorLastStep;
  const progressText = form?.querySelector('[data-editor-progress]');
  if (progressText) progressText.textContent = `Step ${step + 1} of ${editorLastStep + 1}`;
  if (propertyWizard && nextBtn) {
    const nextLabel = nextBtn.querySelector('[data-editor-next-label]') || nextBtn;
    nextLabel.textContent = 'Continue';
  }
  const skip = form?.querySelector('[data-skip-enrichment]');
  if (skip) skip.hidden = ![1,2,3].includes(step);
  const scrollContainer = form?.querySelector('.pw-content') || editor;
  if (scrollContainer) scrollContainer.scrollTop = 0;
  if (propertyWizard) propertyWizard.onStep(step);
  else {
    if (step === 2) automaticAssessment?.refresh();
    if (step === 1) locationEditor?.sync();
  }
}

function validateEditor(container = form) {
  if (!container) return true;
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
  subcatInput.dispatchEvent(new Event('input', { bubbles: true }));

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
  const categoryVal = form?.elements?.category?.value || 'Land';
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
  const options = categories[form?.elements?.category?.value] || [];
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

form?.elements?.category?.addEventListener('change', () => updateSubcategories());

function openListing(property = null) {
  if (!canSubmit()) return;
  if (!form || !editor) return;
  ensureWizard();
  form.reset();
  toggleSubcatPopover(false);

  form.elements.id.value = property?.id || '';
  const titleEl = editor.querySelector('#cityEditorTitle');
  if (titleEl) titleEl.textContent = property ? 'Edit listing' : 'Submit listing';
  const breadcrumb = editor.querySelector('[data-wizard-breadcrumb]');
  if (breadcrumb) breadcrumb.textContent = property ? 'Edit listing' : 'Submit listing';

  const brokerName = state.profile?.displayName || state.profile?.legalName || user.name || 'Broker';
  const brokerPhone = state.profile?.phone || user.phone || '';
  const brokerId = user.id ? String(user.id) : '';

  if (form.elements.contactBrokerUserId) {
    form.elements.contactBrokerUserId.innerHTML = `
      <option value="${escape(brokerId)}">Contact me (${escape(brokerName)})${brokerPhone ? ` · ${escape(brokerPhone)}` : ''}</option>
      <option value="">Open listing · City contact</option>
    `;
  }

  if (property) {
    const values = {
      property_name: property.name,
      category: property.category,
      barangay: property.barangay,
      status: property.status || 'Available',
      listing_purpose: property.listingPurpose || 'sale',
      lease_price: property.leasePrice,
      lease_period: property.leasePeriod || 'month',
      lease_price_unit: property.leasePriceUnit || 'total',
      lat: property.lat,
      lng: property.lng,
      description: property.description,
      owner_name: property.ownerContact?.name || brokerName,
      owner_phone: property.ownerContact?.phone || brokerPhone,
      owner_email: property.ownerContact?.email || user.email || '',
      contactBrokerUserId: property.contactBrokerUserId !== undefined && property.contactBrokerUserId !== null ? String(property.contactBrokerUserId) : brokerId,
      readiness_notes: property.readinessNotes,
      existing_land_use: property.existingLandUse,
      zoning_classification: property.zoningClassification,
      clup_source_reference: property.clupSourceReference,
    };
    Object.entries(values).forEach(([name, value]) => {
      if (form.elements[name]) form.elements[name].value = value ?? '';
    });
    if (priceInput) priceInput.value = (property.salePrice ?? property.price) != null ? String(property.salePrice ?? property.price) : '';
    form.querySelectorAll('[data-price-input]').forEach(formatPriceField);
    if (areaInput && areaUnit) {
      areaUnit.value = 'sqm';
      areaInput.value = property.parcel?.boundary || property.parcel?.surveyAreaSqm ? (property.parcel.surveyAreaSqm || '') : (property.area > 0 ? Math.round(property.area * 10000 * 100) / 100 : '');
      updateAreaCalculation();
    }
    updateSubcategories(property.subcategory || '');
    form.querySelectorAll('[name="assessmentTags[]"]').forEach((field) => {
      field.checked = (property.assessmentTags || []).includes(field.value);
    });
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
    form.elements.owner_name.value = brokerName;
    form.elements.owner_phone.value = brokerPhone;
    form.elements.owner_email.value = user.email || '';
    if (form.elements.contactBrokerUserId) form.elements.contactBrokerUserId.value = brokerId;
  }

  const msgNode = form.querySelector('[data-editor-message]');
  if (msgNode) {
    msgNode.textContent = '';
    msgNode.className = 'pw-form-message';
  }

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

function renderThreads() {
  byId('brokerMessageCount').textContent = String(state.threads.length);
  byId('brokerThreadList').innerHTML = state.threads.length ? state.threads.map((thread) => `
    <button type="button" class="broker-thread-button ${Number(thread.id) === Number(state.activeThread) ? 'is-active' : ''}" data-broker-thread="${Number(thread.id)}">
      <strong>${escape(thread.propertyName)}</strong>
      <span>${escape(thread.investorName || 'Investor')}</span>
    </button>`).join('') : `
    <div class="broker-sidebar-empty">
      <svg class="broker-sidebar-empty-illus" width="70" height="56" viewBox="0 0 70 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="22" y="8" width="40" height="26" rx="8" fill="#EEF2F6" stroke="#CBD5E1" stroke-width="1.5"/>
        <path d="M28 34 L25 40 L34 34 Z" fill="#EEF2F6" stroke="#CBD5E1" stroke-width="1.5" stroke-linejoin="round"/>
        <circle cx="34" cy="21" r="2" fill="#94A3B8"/>
        <circle cx="42" cy="21" r="2" fill="#94A3B8"/>
        <circle cx="50" cy="21" r="2" fill="#94A3B8"/>
        <circle cx="20" cy="36" r="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
        <circle cx="20" cy="32" r="4.5" fill="#94A3B8"/>
        <path d="M12 44 C12 40 16 38 20 38 C24 38 28 40 28 44" fill="#94A3B8"/>
      </svg>
      <strong class="broker-sidebar-empty-title">${canSubmit() ? 'No new messages yet' : 'Messages available after verification'}</strong>
      <p class="broker-sidebar-empty-sub">${canSubmit() ? 'Investor inquiries and site visit requests will appear here.' : 'Verify your email and complete broker application approval to access investor messages and visits.'}</p>
    </div>`;
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
  const view = byId('brokerThreadView');
  view.hidden = false;
  view.innerHTML = `
    <div class="broker-conversation-heading">
      <div>
        <button type="button" class="broker-button" id="brokerBackToThreads" style="min-height:28px;padding:3px 8px;font-size:11px;margin-right:6px;">&larr; Back</button>
        <strong>${escape(thread.propertyName)}</strong> &middot; <span class="tw-text-slate-500">${escape(thread.investorName || 'Investor')}</span>
      </div>
    </div>
    ${renderVisit(data?.visit)}
    <div class="broker-bubbles">
      ${messages.length ? messages.map((message) => `
        <div class="broker-bubble ${Number(message.senderUserId) === Number(user.id) ? 'is-own' : ''}">
          <small>${escape(message.senderName)}${message.role === 'admin' ? ' · City administrator' : ''} · ${escape(date(message.createdAt))}</small>
          ${escape(message.text)}
        </div>
      `).join('') : '<p class="broker-empty">No messages yet.</p>'}
    </div>
    <form class="broker-reply" id="brokerReplyForm">
      <label class="broker-sr-only" for="brokerReplyText">Message</label>
      <textarea id="brokerReplyText" name="text" rows="2" placeholder="Write a reply" required maxlength="5000"></textarea>
      <button class="broker-button is-primary" type="submit">Send</button>
    </form>
  `;
  const backBtn = byId('brokerBackToThreads');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      view.hidden = true;
      state.activeThread = null;
      renderThreads();
    });
  }
  const bubbles = view.querySelector('.broker-bubbles');
  if (bubbles) bubbles.scrollTop = bubbles.scrollHeight;
}

async function openThread(threadId) {
  const data = await api.getThread(threadId);
  state.activeThread = threadId;
  state.threadData = data;
  renderThreads();
  renderThread();
}

function renderDocuments() {
  const activeCount = state.requests.filter((request) => ['requested', 'in_review'].includes(request.status)).length;
  byId('brokerDocumentCount').textContent = String(activeCount);
  byId('brokerDocumentList').innerHTML = state.requests.length ? state.requests.map((request) => `
    <article class="broker-document">
      <strong>${escape(request.documentName)}</strong>
      <p>${escape(request.propertyName)} · ${escape(request.requesterName)}</p>
      ${request.note ? `<p>${escape(request.note)}</p>` : ''}
      <form class="broker-document-form" data-broker-document="${Number(request.id)}">
        <label><span class="broker-sr-only">Request status</span>
          <select name="status">${Object.entries({ requested: 'Requested', in_review: 'In review', fulfilled: 'Fulfilled', declined: 'Declined' }).map(([value, label]) => `<option value="${value}" ${value === request.status ? 'selected' : ''}>${label}</option>`).join('')}</select>
        </label>
        <label><span class="broker-sr-only">Response note</span>
          <input name="responseNote" value="${escape(request.responseNote || '')}" placeholder="Response note" maxlength="2000">
        </label>
        <button type="submit" class="broker-button">Update</button>
      </form>
    </article>`).join('') : `
    <div class="broker-sidebar-empty">
      <svg class="broker-sidebar-empty-illus" width="70" height="56" viewBox="0 0 70 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="10" width="28" height="36" rx="4" transform="rotate(-6 18 10)" fill="#EEF2F6" stroke="#CBD5E1" stroke-width="1.5"/>
        <rect x="25" y="8" width="28" height="36" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
        <line x1="30" y1="17" x2="48" y2="17" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round"/>
        <line x1="30" y1="23" x2="48" y2="23" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round"/>
        <line x1="30" y1="29" x2="42" y2="29" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <strong class="broker-sidebar-empty-title">${canSubmit() ? 'No document requests' : 'Document requests available after verification'}</strong>
      <p class="broker-sidebar-empty-sub">${canSubmit() ? 'Investor requests for listing documents will appear here.' : 'Complete broker verification to respond to investor requests. Review application feedback in your profile.'}</p>
    </div>`;
}

async function reload() {
  const [propertyResult, profileResult] = await Promise.allSettled([api.properties(), api.sellerProfile()]);
  if (propertyResult.status === 'fulfilled') state.properties = propertyResult.value.properties || [];
  state.profile = profileResult.status === 'fulfilled' ? profileResult.value.profile || null : null;
  const results = [propertyResult, profileResult];
  if (canSubmit()) {
    const [threadResult, documentResult] = await Promise.allSettled([api.getMessageInbox(), api.getDocumentRequestInbox()]);
    if (threadResult.status === 'fulfilled') state.threads = threadResult.value.threads || [];
    if (documentResult.status === 'fulfilled') state.requests = documentResult.value.requests || [];
    results.push(threadResult, documentResult);
  } else {
    state.threads = [];
    state.requests = [];
    state.activeThread = null;
    state.threadData = null;
    byId('brokerThreadView').hidden = true;
  }
  renderVerification();
  renderStats();
  renderListings();
  renderThreads();
  renderDocuments();
  const failures = results.filter((result) => result.status === 'rejected');
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
byId('brokerSearch').addEventListener('input', (event) => { state.query = event.target.value.trim().toLowerCase(); renderListings(); });
byId('brokerStatusFilter').addEventListener('change', (event) => { state.filter = event.target.value; renderListings(); });
byId('brokerListings').addEventListener('click', (event) => {
  const button = event.target.closest('[data-broker-edit]');
  if (button) openListing(ownProperties().find((property) => Number(property.id) === Number(button.dataset.brokerEdit)));
});
document.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.hasAttribute('data-close-dialog')) target.closest('dialog')?.close();
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canSubmit()) return;
  ensureWizard();
  if (editorStep !== editorLastStep) {
    form.querySelector('[data-editor-next]').click();
    return;
  }
  if (!validateEditor() || !validateBoundary()) return;
  if (propertyWizard && !propertyWizard.validateSurroundings()) {
    setEditorStep(3);
    return;
  }
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  const id = form.elements.id.value;
  const payload = new FormData(form);
  nearby?.append(payload);
  propertyWizard?.append(payload);
  if (propertyWizard) propertyWizard.buildSubmission(payload, selectedSubcategories);
  else {
    payload.delete('id');
    const unitVal = areaUnit?.value || 'sqm';
    payload.set('land_area', String(areaInput?.value || '').replace(/[^\d.]/g, ''));
    payload.set('land_area_unit', unitVal);
    const legacyTypes = { Retail: 'commercial', Multifamily: 'commercial', Office: 'bpo', Industrial: 'manufacturing', Hospitality: 'hotel' };
    payload.set('property_type', legacyTypes[form.elements.category.value] || 'commercial');
    payload.set('subcategory', Array.from(selectedSubcategories).join(', '));
    payload.set('price', form.elements.listing_purpose?.value === 'lease' ? '' : String(priceInput?.value || '').replace(/,/g, '').trim());
    payload.set('lease_price', form.elements.listing_purpose?.value === 'sale' ? '' : String(form.elements.lease_price?.value || '').replace(/,/g, '').trim());
    payload.set('contactMode', form.elements.contactBrokerUserId.value ? 'broker' : 'open_listing');
    payload.set('recalculate_assessment', 'true');
    payload.set('assessmentTags', JSON.stringify(Array.from(form.querySelectorAll('[name="assessmentTags[]"]:checked')).map((field) => field.value)));
    const photo = payload.get('image_file');
    if (!photo?.size) payload.delete('image_file');
  }

  if (id) payload.set('_method', 'PATCH');

  try {
    if (id) await api.updateProperty(id, payload);
    else await api.createProperty(payload);
    propertyWizard?.saved();
    editor?.close();
    feedback('Listing submitted for CICTO review.');
    await reload();
  } catch (error) {
    const errorNode = form.querySelector('[data-editor-message]');
    if (errorNode) {
      errorNode.textContent = error.message || 'Unable to submit the listing.';
      errorNode.className = 'pw-form-message is-error';
    }
  } finally {
    submit.disabled = false;
  }
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
