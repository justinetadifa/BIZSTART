// assets/js/project-profile-manager.js
// Investor Project Profile Manager — V2 Assessment integration

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (v, dp = 0) => v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('en-PH', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const php = v => v != null && Number.isFinite(Number(v)) ? `₱ ${Number(v).toLocaleString('en-PH')}` : '—';

export function renderProfileManagerMarkup() {
  return `<details class="v2-profile-manager-panel" id="projectProfileManager">
    <summary class="v2-profile-manager-summary">
      <span class="site-eyebrow">INVESTOR PROFILE</span>
      <span class="v2-profile-manager-title">Your Business Profiles <span class="v2-version-pill v2-pill-new">V2</span></span>
      <small>Define your intended business to enable V2 evidence-backed assessments</small>
    </summary>
    <div class="v2-profile-manager-body">
      <div id="profileListArea" aria-live="polite"><p class="v2-loading-text">Loading profiles…</p></div>
      <details class="v2-create-profile-details" id="createProfileDetails">
        <summary>Add a new business profile</summary>
        <form id="createProfileForm" class="v2-profile-form" novalidate>
          <div class="v2-form-grid">
            <label class="v2-form-label">
              Profile name <span class="v2-required">*</span>
              <input type="text" name="name" class="v2-form-input" placeholder="e.g. My Coffee Shop Plan" required maxlength="120">
            </label>
            <label class="v2-form-label">
              Intended business <span class="v2-required">*</span>
              <input type="text" name="intended_business" class="v2-form-input" placeholder="e.g. Coffee Shop, Retail Apparel" required maxlength="200">
            </label>
            <label class="v2-form-label">
              Transaction type
              <select name="transaction_type" class="v2-form-input">
                <option value="">Not specified</option>
                <option value="buy">Buy</option>
                <option value="lease">Lease</option>
              </select>
            </label>
            <label class="v2-form-label">
              Total setup budget (PHP)
              <input type="number" name="total_setup_budget" class="v2-form-input" placeholder="e.g. 2000000" min="0" step="1">
            </label>
            <label class="v2-form-label">
              Required usable area (m²)
              <input type="number" name="required_usable_area" class="v2-form-input" placeholder="e.g. 80" min="0" step="0.1">
            </label>
            <label class="v2-form-label">
              Opening timeline
              <input type="text" name="opening_timeline" class="v2-form-input" placeholder="e.g. 6 months, 1 year">
            </label>
          </div>
          <label class="v2-form-label v2-full-width">
            Essential operational requirements (one per line)
            <textarea name="essential_operational_requirements" class="v2-form-input v2-form-textarea" rows="3" placeholder="e.g. 3-phase power&#10;Ground floor access&#10;Parking for 10 vehicles"></textarea>
          </label>
          <div id="createProfileError" class="v2-form-error" hidden></div>
          <div class="v2-form-actions">
            <button type="submit" class="v2-btn v2-btn-primary" id="createProfileSubmit">Save Profile</button>
            <button type="button" class="v2-btn v2-btn-ghost" id="cancelCreateProfile">Cancel</button>
          </div>
        </form>
      </details>
    </div>
  </details>`;
}

export function setupProjectProfileManager(containerEl, apiBase = './api') {
  if (!containerEl) return;
  const listArea = containerEl.querySelector('#profileListArea');
  const createForm = containerEl.querySelector('#createProfileForm');
  const createDetails = containerEl.querySelector('#createProfileDetails');
  const errorBox = containerEl.querySelector('#createProfileError');
  const cancelBtn = containerEl.querySelector('#cancelCreateProfile');
  if (!listArea || !createForm) return;

  let profiles = [];

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.hidden = !msg;
  }

  function profileCardHtml(profile) {
    return `<div class="v2-profile-card ${profile.is_default ? 'is-default' : ''}" data-profile-id="${Number(profile.id)}">
      <div class="v2-profile-card-header">
        <strong class="v2-profile-name">${esc(profile.name)}</strong>
        ${profile.is_default ? '<span class="v2-default-badge">Default</span>' : ''}
      </div>
      <dl class="v2-profile-facts">
        <div><dt>Business</dt><dd>${esc(profile.intended_business || '—')}</dd></div>
        <div><dt>Type</dt><dd>${esc(profile.transaction_type || 'Not set')}</dd></div>
        <div><dt>Budget</dt><dd>${php(profile.total_setup_budget)}</dd></div>
        <div><dt>Area</dt><dd>${profile.required_usable_area ? fmt(profile.required_usable_area, 0) + ' m²' : '—'}</dd></div>
        <div><dt>Timeline</dt><dd>${esc(profile.opening_timeline || '—')}</dd></div>
      </dl>
      ${Array.isArray(profile.essential_operational_requirements) && profile.essential_operational_requirements.length
        ? `<p class="v2-profile-reqs"><strong>Requirements:</strong> ${profile.essential_operational_requirements.map(esc).join(' · ')}</p>` : ''}
      <div class="v2-profile-card-actions">
        ${!profile.is_default ? `<button type="button" class="v2-btn v2-btn-sm v2-btn-ghost" data-set-default="${Number(profile.id)}">Set as default</button>` : ''}
        <button type="button" class="v2-btn v2-btn-sm v2-btn-danger" data-delete-profile="${Number(profile.id)}">Delete</button>
      </div>
    </div>`;
  }

  function renderList() {
    if (!profiles.length) {
      listArea.innerHTML = '<p class="v2-empty-note">No business profiles saved yet. Add one below to enable V2 assessments.</p>';
      return;
    }
    listArea.innerHTML = `<div class="v2-profile-list">${profiles.map(profileCardHtml).join('')}</div>`;
    listArea.querySelectorAll('[data-set-default]').forEach(btn => {
      btn.addEventListener('click', () => setDefault(Number(btn.dataset.setDefault)));
    });
    listArea.querySelectorAll('[data-delete-profile]').forEach(btn => {
      btn.addEventListener('click', () => deleteProfile(Number(btn.dataset.deleteProfile)));
    });
  }

  async function loadProfiles() {
    try {
      const r = await fetch(`${apiBase}/project-profiles.php`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Could not load profiles.');
      profiles = Array.isArray(data.profiles) ? data.profiles : [];
      renderList();
    } catch (err) {
      listArea.innerHTML = `<p class="v2-form-error">${esc(err.message)}</p>`;
    }
  }

  async function setDefault(id) {
    try {
      const r = await fetch(`${apiBase}/project-profiles.php`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action: 'set_default', profile_id: id })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Could not set default.');
      await loadProfiles();
      const profile = profiles.find(p => Number(p.id) === id);
      containerEl.dispatchEvent(new CustomEvent('sfc:profile-changed', { bubbles: true, detail: { profile } }));
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteProfile(id) {
    if (!confirm('Delete this profile? This cannot be undone.')) return;
    try {
      const r = await fetch(`${apiBase}/project-profiles.php?id=${id}`, {
        method: 'DELETE', credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Could not delete.');
      await loadProfiles();
    } catch (err) {
      alert(err.message);
    }
  }

  createForm.addEventListener('submit', async event => {
    event.preventDefault();
    showError('');
    const data = Object.fromEntries(new FormData(createForm));
    const reqsRaw = (data.essential_operational_requirements || '').trim();
    const reqs = reqsRaw ? reqsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
    const payload = {
      name: data.name,
      intended_business: data.intended_business,
      transaction_type: data.transaction_type || null,
      total_setup_budget: data.total_setup_budget ? Number(data.total_setup_budget) : null,
      required_usable_area: data.required_usable_area ? Number(data.required_usable_area) : null,
      opening_timeline: data.opening_timeline || null,
      essential_operational_requirements: reqs
    };
    const submitBtn = createForm.querySelector('[type=submit]');
    submitBtn.disabled = true;
    try {
      const r = await fetch(`${apiBase}/project-profiles.php`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || 'Could not save profile.');
      createForm.reset();
      if (createDetails) createDetails.open = false;
      await loadProfiles();
    } catch (err) {
      showError(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  if (cancelBtn) cancelBtn.addEventListener('click', () => { createForm.reset(); if (createDetails) createDetails.open = false; showError(''); });

  loadProfiles();
}

