(() => {
  'use strict';

  const config = window.SFC_APP_CONFIG || {};
  const apiBase = config.apiBase || `${config.basePath || ''}/api`;
  const root = document.getElementById('cityInvestorsPanel');
  if (!root) return;

  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const number = (value) => new Intl.NumberFormat('en-PH').format(Number(value) || 0);
  const currency = (value) => '₱' + new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(Number(value) || 0);
  const path = (route) => `${config.basePath || ''}/${route}`;

  let investors = [];
  let activePresenceFilter = 'all';
  let activeVerificationFilter = 'all';
  let activeSearchQuery = '';
  let selectedInvestor = null;
  let activeDossierTab = 'shortlists';

  const container = root.querySelector('[data-investors-container]');
  const searchInput = document.getElementById('investorSearchInput');
  const verificationSelect = document.getElementById('investorVerificationFilter');
  const refreshBtn = document.getElementById('refreshInvestorsBtn');
  const presenceButtons = root.querySelectorAll('[data-presence-filter]');
  const dialog = document.getElementById('investorDossierDialog');

  // Read initial data from embedded JSON if available
  try {
    const initialTag = document.getElementById('initialInvestorsData');
    if (initialTag && initialTag.textContent.trim()) {
      investors = JSON.parse(initialTag.textContent.trim());
    }
  } catch (e) {
    console.warn('Could not parse initial investors data:', e);
  }

  function getInitials(name) {
    const parts = (name || 'Investor').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'IN';
    return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
  }

  function getPresenceDot(investor) {
    if (investor.isOnline) {
      return `<span class="tw-relative tw-inline-flex tw-h-2.5 tw-w-2.5" title="Active now">
        <span class="tw-absolute tw-inline-flex tw-h-full tw-w-full tw-animate-ping tw-rounded-full tw-bg-emerald-400 tw-opacity-75"></span>
        <span class="tw-relative tw-inline-flex tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-emerald-500"></span>
      </span>`;
    }
    if (investor.presenceState === 'recent') {
      return `<span class="tw-inline-block tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-amber-400" title="${escape(investor.presenceLabel)}"></span>`;
    }
    return `<span class="tw-inline-block tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-slate-300" title="${escape(investor.presenceLabel)}"></span>`;
  }

  function getVerificationBadge(status) {
    const normalized = (status || 'unverified').toLowerCase();
    switch (normalized) {
      case 'verified':
        return '<span class="tw-inline-flex tw-items-center tw-rounded-full tw-bg-emerald-50 tw-px-2.5 tw-py-0.5 tw-text-[10px] tw-font-semibold tw-text-emerald-700">Verified</span>';
      case 'pending':
        return '<span class="tw-inline-flex tw-items-center tw-rounded-full tw-bg-amber-50 tw-px-2.5 tw-py-0.5 tw-text-[10px] tw-font-semibold tw-text-amber-800">Pending review</span>';
      case 'suspended':
        return '<span class="tw-inline-flex tw-items-center tw-rounded-full tw-bg-rose-50 tw-px-2.5 tw-py-0.5 tw-text-[10px] tw-font-semibold tw-text-rose-700">Suspended</span>';
      default:
        return '<span class="tw-inline-flex tw-items-center tw-rounded-full tw-bg-slate-100 tw-px-2.5 tw-py-0.5 tw-text-[10px] tw-font-semibold tw-text-slate-600">Unverified</span>';
    }
  }

  function updateKpiCounters(data = investors) {
    const total = data.length;
    const online = data.filter((i) => i.isOnline).length;
    const recent = data.filter((i) => i.presenceState === 'recent').length;
    const shortlists = data.reduce((acc, i) => acc + (i.shortlistsCount || 0), 0);
    const visits = data.reduce((acc, i) => acc + (i.visitsCount || 0), 0);

    const livePill = root.querySelector('[data-investors-live-pill]');
    const liveCount = root.querySelector('[data-investors-live-count]');
    if (liveCount) liveCount.textContent = `${online} online now`;
    if (livePill) {
      livePill.classList.toggle('tw-bg-emerald-50', online > 0);
      livePill.classList.toggle('tw-text-emerald-700', online > 0);
      livePill.classList.toggle('tw-bg-slate-100', online === 0);
      livePill.classList.toggle('tw-text-slate-600', online === 0);
    }

    const countAll = root.querySelector('[data-count-all]');
    const countOnline = root.querySelector('[data-count-online]');
    const countRecent = root.querySelector('[data-count-recent]');
    if (countAll) countAll.textContent = String(total);
    if (countOnline) countOnline.textContent = String(online);
    if (countRecent) countRecent.textContent = String(recent);

    const kpiWrap = root.querySelector('[data-investor-kpis]');
    if (kpiWrap) {
      kpiWrap.innerHTML = `
        <span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-py-1.5 tw-text-slate-600">
          <strong class="tw-font-bold tw-text-ink">${number(total)}</strong> registered
        </span>
        <span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-py-1.5 tw-text-slate-600">
          <strong class="tw-font-bold tw-text-[#9e1b22]">${number(shortlists)}</strong> shortlists
        </span>
        <span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-py-1.5 tw-text-slate-600">
          <strong class="tw-font-bold tw-text-ink">${number(visits)}</strong> site visits
        </span>
      `;
    }
  }

  function filterInvestors() {
    return investors.filter((inv) => {
      // Presence filter
      if (activePresenceFilter === 'online' && !inv.isOnline) return false;
      if (activePresenceFilter === 'recent' && inv.presenceState !== 'recent') return false;

      // Verification filter
      if (activeVerificationFilter !== 'all' && (inv.identityVerificationStatus || 'unverified').toLowerCase() !== activeVerificationFilter) {
        return false;
      }

      // Search query
      if (activeSearchQuery) {
        const query = activeSearchQuery.toLowerCase();
        const shortNames = (inv.shortlists || []).map((s) => s.propertyName).join(' ').toLowerCase();
        const visitPurposes = (inv.visits || []).map((v) => `${v.propertyName} ${v.investmentPurpose}`).join(' ').toLowerCase();
        const text = `${inv.name} ${inv.email} ${inv.phone || ''} ${inv.address || ''} ${shortNames} ${visitPurposes}`.toLowerCase();
        if (!text.includes(query)) return false;
      }

      return true;
    });
  }

  function renderTable() {
    if (!container) return;
    const filtered = filterInvestors();

    if (!filtered.length) {
      container.innerHTML = `
        <div class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-dashed tw-border-slate-200 tw-p-8 tw-text-center">
          <div class="tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-full tw-bg-slate-100 tw-text-slate-400">
            <svg class="tw-h-6 tw-w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <strong class="tw-mt-3 tw-text-sm tw-font-semibold tw-text-ink">No investors matched your filters</strong>
          <p class="tw-mb-0 tw-mt-1 tw-max-w-xs tw-text-xs tw-text-slate-500">Try clearing your search query or selecting a different presence status.</p>
          <button type="button" class="tw-mt-4 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3.5 tw-py-2 tw-text-xs tw-font-semibold tw-text-ink hover:tw-bg-slate-50" data-clear-filters>
            Reset filters
          </button>
        </div>
      `;
      container.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
        activePresenceFilter = 'all';
        activeVerificationFilter = 'all';
        activeSearchQuery = '';
        if (searchInput) searchInput.value = '';
        if (verificationSelect) verificationSelect.value = 'all';
        presenceButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.presenceFilter === 'all'));
        renderTable();
      });
      return;
    }

    container.innerHTML = `
      <table class="city-ranking-table tw-min-w-[760px] [&_th]:tw-px-3.5 [&_th]:tw-py-3 [&_th]:tw-text-[11px] [&_td]:tw-px-3.5 [&_td]:tw-py-3.5">
        <thead>
          <tr class="tw-border-b tw-border-slate-200 tw-bg-slate-50/80">
            <th class="tw-text-left">Investor profile</th>
            <th class="tw-text-left">Presence status</th>
            <th class="tw-text-left">Verification</th>
            <th class="tw-text-left">Engagement on LOCUS-SF</th>
            <th class="tw-text-left">Contact details</th>
            <th class="tw-text-right">Action</th>
          </tr>
        </thead>
        <tbody class="tw-divide-y tw-divide-slate-100">
          ${filtered.map((inv) => {
            const initials = getInitials(inv.name);
            const hasAvatar = Boolean(inv.profileImageUrl);
            const avatarHtml = hasAvatar
              ? `<img src="${escape(path(inv.profileImageUrl))}" alt="" class="tw-h-10 tw-w-10 tw-shrink-0 tw-rounded-full tw-object-cover tw-border tw-border-slate-200">`
              : `<span class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-[#11224d]/10 tw-text-xs tw-font-bold tw-text-[#11224d]">${escape(initials)}</span>`;

            const presenceClass = inv.isOnline
              ? 'tw-text-emerald-700 tw-font-medium'
              : inv.presenceState === 'recent'
                ? 'tw-text-amber-800'
                : 'tw-text-slate-500';

            return `
              <tr class="tw-transition hover:tw-bg-slate-50/70" data-investor-row="${Number(inv.id)}">
                <td>
                  <div class="tw-flex tw-items-center tw-gap-3">
                    <div class="tw-relative">
                      ${avatarHtml}
                      <span class="tw-absolute -tw-bottom-0.5 -tw-right-0.5 tw-rounded-full tw-bg-white tw-p-0.5">
                        ${getPresenceDot(inv)}
                      </span>
                    </div>
                    <div class="tw-min-w-0">
                      <strong class="tw-block tw-text-xs tw-font-bold tw-text-ink hover:tw-text-[#9e1b22] tw-cursor-pointer" data-open-dossier="${Number(inv.id)}">${escape(inv.name)}</strong>
                      <span class="tw-mt-0.5 tw-block tw-text-[11px] tw-text-slate-500 tw-truncate tw-max-w-[200px]" title="${escape(inv.email)}">${escape(inv.email)}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="tw-flex tw-items-center tw-gap-2">
                    ${getPresenceDot(inv)}
                    <span class="tw-text-xs ${presenceClass}">${escape(inv.presenceLabel)}</span>
                  </div>
                </td>
                <td>
                  ${getVerificationBadge(inv.identityVerificationStatus)}
                </td>
                <td>
                  <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-1.5">
                    <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-red-50 tw-px-2 tw-py-1 tw-text-[10px] tw-font-semibold tw-text-[#9e1b22]" title="${Number(inv.shortlistsCount)} properties shortlisted">
                      <svg class="tw-h-3 tw-w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      ${Number(inv.shortlistsCount)} saved
                    </span>
                    <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-blue-50 tw-px-2 tw-py-1 tw-text-[10px] tw-font-semibold tw-text-blue-800" title="${Number(inv.visitsCount)} site visits requested">
                      <svg class="tw-h-3 tw-w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      ${Number(inv.visitsCount)} visits
                    </span>
                    ${inv.documentRequestsCount ? `
                      <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-purple-50 tw-px-2 tw-py-1 tw-text-[10px] tw-font-semibold tw-text-purple-800" title="${Number(inv.documentRequestsCount)} document requests">
                        <svg class="tw-h-3 tw-w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        ${Number(inv.documentRequestsCount)} docs
                      </span>
                    ` : ''}
                  </div>
                </td>
                <td>
                  <div class="tw-text-[11px] tw-text-slate-500">
                    <span class="tw-block">${escape(inv.phone || 'No phone registered')}</span>
                    <span class="tw-block tw-text-[10px] tw-text-slate-400 tw-truncate tw-max-w-[160px]" title="${escape(inv.address || 'San Fernando')}">${escape(inv.address || 'San Fernando, La Union')}</span>
                  </div>
                </td>
                <td class="tw-text-right">
                  <button type="button" class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-text-ink hover:tw-border-[#9e1b22] hover:tw-text-[#9e1b22] hover:tw-bg-red-50/40" data-open-dossier="${Number(inv.id)}">
                    View details
                    <svg class="tw-h-3.5 tw-w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    // Attach row click events
    container.querySelectorAll('[data-open-dossier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.openDossier);
        openDossier(id);
      });
    });
  }

  function openDossier(investorId) {
    selectedInvestor = investors.find((i) => Number(i.id) === investorId);
    if (!selectedInvestor || !dialog) return;

    // Reset default tab to shortlists or visits
    activeDossierTab = selectedInvestor.shortlistsCount ? 'shortlists' : (selectedInvestor.visitsCount ? 'visits' : 'profile');
    renderDossierModal();
    dialog.showModal();
  }

  function renderDossierModal() {
    if (!dialog || !selectedInvestor) return;

    const inv = selectedInvestor;
    const initials = getInitials(inv.name);
    const hasAvatar = Boolean(inv.profileImageUrl);
    const avatarHtml = hasAvatar
      ? `<img src="${escape(path(inv.profileImageUrl))}" alt="" class="tw-h-16 tw-w-16 tw-rounded-full tw-object-cover tw-border-2 tw-border-slate-200">`
      : `<span class="tw-flex tw-h-16 tw-w-16 tw-items-center tw-justify-center tw-rounded-full tw-bg-[#11224d] tw-text-lg tw-font-bold tw-text-white">${escape(initials)}</span>`;

    const shortlists = inv.shortlists || [];
    const visits = inv.visits || [];
    const docRequests = inv.documentRequests || [];
    const threads = inv.threads || [];

    dialog.innerHTML = `
      <div class="tw-flex tw-flex-col tw-max-h-[85vh] tw-w-full tw-max-w-3xl tw-overflow-hidden tw-rounded-2xl tw-bg-white tw-shadow-2xl">
        <!-- Modal Header -->
        <div class="tw-relative tw-border-b tw-border-slate-200 tw-bg-slate-50/80 tw-p-5 sm:tw-p-6">
          <button type="button" class="city-icon-button tw-absolute tw-right-4 tw-top-4" data-close-dossier aria-label="Close dialog">×</button>
          
          <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-4 sm:tw-gap-5">
            <div class="tw-relative">
              ${avatarHtml}
              <span class="tw-absolute -tw-bottom-0.5 -tw-right-0.5 tw-rounded-full tw-bg-white tw-p-1">
                ${getPresenceDot(inv)}
              </span>
            </div>

            <div class="tw-min-w-0 tw-flex-1">
              <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2.5">
                <h3 class="tw-m-0 tw-text-lg tw-font-bold tw-text-ink sm:tw-text-xl">${escape(inv.name)}</h3>
                <span class="tw-rounded-md tw-bg-slate-200/80 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-700">Investor</span>
                ${getVerificationBadge(inv.identityVerificationStatus)}
              </div>

              <div class="tw-mt-2 tw-flex tw-flex-wrap tw-items-center tw-gap-x-4 tw-gap-y-1 tw-text-xs tw-text-slate-600">
                <span class="tw-flex tw-items-center tw-gap-1.5">
                  <svg class="tw-h-3.5 tw-w-3.5 tw-text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <a href="mailto:${escape(inv.email)}" class="tw-text-ink hover:tw-text-[#9e1b22]">${escape(inv.email)}</a>
                </span>
                ${inv.phone ? `
                  <span class="tw-flex tw-items-center tw-gap-1.5">
                    <svg class="tw-h-3.5 tw-w-3.5 tw-text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <a href="tel:${escape(inv.phone)}" class="tw-text-ink hover:tw-text-[#9e1b22]">${escape(inv.phone)}</a>
                  </span>
                ` : ''}
              </div>

              <!-- Presence banner -->
              <div class="tw-mt-3 tw-flex tw-flex-wrap tw-items-center tw-gap-3 tw-text-[11px]">
                <div class="tw-flex tw-items-center tw-gap-1.5 tw-rounded-md tw-bg-white tw-px-2.5 tw-py-1 tw-border tw-border-slate-200">
                  ${getPresenceDot(inv)}
                  <span class="tw-font-medium ${inv.isOnline ? 'tw-text-emerald-700' : 'tw-text-slate-600'}">
                    Website presence: <strong>${escape(inv.presenceLabel)}</strong>
                  </span>
                </div>
                ${inv.lastLoginAt ? `
                  <span class="tw-text-slate-500">Last login: ${escape(inv.lastLoginAt)}</span>
                ` : '<span class="tw-text-slate-400">First-time visitor session</span>'}
              </div>
            </div>
          </div>

          <!-- Dossier Navigation Tabs -->
          <div class="tw-mt-5 tw-flex tw-space-x-1 tw-overflow-x-auto tw-border-b tw-border-slate-200" role="tablist">
            <button type="button" class="tw-border-b-2 tw-px-3.5 tw-py-2 tw-text-xs tw-font-semibold tw-transition ${activeDossierTab === 'shortlists' ? 'tw-border-[#9e1b22] tw-text-[#9e1b22]' : 'tw-border-transparent tw-text-slate-500 hover:tw-text-ink'}" data-tab-target="shortlists">
              Shortlisted Properties (${shortlists.length})
            </button>
            <button type="button" class="tw-border-b-2 tw-px-3.5 tw-py-2 tw-text-xs tw-font-semibold tw-transition ${activeDossierTab === 'visits' ? 'tw-border-[#9e1b22] tw-text-[#9e1b22]' : 'tw-border-transparent tw-text-slate-500 hover:tw-text-ink'}" data-tab-target="visits">
              Site Visits (${visits.length})
            </button>
            <button type="button" class="tw-border-b-2 tw-px-3.5 tw-py-2 tw-text-xs tw-font-semibold tw-transition ${activeDossierTab === 'docs' ? 'tw-border-[#9e1b22] tw-text-[#9e1b22]' : 'tw-border-transparent tw-text-slate-500 hover:tw-text-ink'}" data-tab-target="docs">
              Document Requests (${docRequests.length})
            </button>
            <button type="button" class="tw-border-b-2 tw-px-3.5 tw-py-2 tw-text-xs tw-font-semibold tw-transition ${activeDossierTab === 'threads' ? 'tw-border-[#9e1b22] tw-text-[#9e1b22]' : 'tw-border-transparent tw-text-slate-500 hover:tw-text-ink'}" data-tab-target="threads">
              Inquiries (${threads.length})
            </button>
            <button type="button" class="tw-border-b-2 tw-px-3.5 tw-py-2 tw-text-xs tw-font-semibold tw-transition ${activeDossierTab === 'profile' ? 'tw-border-[#9e1b22] tw-text-[#9e1b22]' : 'tw-border-transparent tw-text-slate-500 hover:tw-text-ink'}" data-tab-target="profile">
              Account &amp; Verification
            </button>
          </div>
        </div>

        <!-- Modal Body / Active Tab Content -->
        <div class="tw-flex-1 tw-overflow-y-auto tw-p-5 sm:tw-p-6">
          ${renderActiveTabContent(inv)}
        </div>

        <!-- Modal Footer -->
        <div class="tw-flex tw-items-center tw-justify-between tw-border-t tw-border-slate-200 tw-bg-slate-50 tw-p-4">
          <span class="tw-text-xs tw-text-slate-500">Investor ID: #${Number(inv.id)} · LOCUS-SF Portal</span>
          <button type="button" class="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-4 tw-py-2 tw-text-xs tw-font-semibold tw-text-ink hover:tw-bg-slate-100" data-close-dossier>
            Close
          </button>
        </div>
      </div>
    `;

    // Wire close buttons
    dialog.querySelectorAll('[data-close-dossier]').forEach((btn) => {
      btn.addEventListener('click', () => dialog.close());
    });

    // Wire tab switching
    dialog.querySelectorAll('[data-tab-target]').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        activeDossierTab = tabBtn.dataset.tabTarget;
        renderDossierModal();
      });
    });

    // Wire verification update form if present
    const updateForm = dialog.querySelector('#investorVerificationForm');
    if (updateForm) {
      updateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = updateForm.querySelector('button[type="submit"]');
        const feedback = updateForm.querySelector('[data-verification-feedback]');
        const select = updateForm.querySelector('select[name="verificationStatus"]');
        const newStatus = select.value;

        submitBtn.disabled = true;
        if (feedback) feedback.textContent = 'Updating status…';

        try {
          const res = await fetch(`${apiBase}/admin-investors.php`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': config.csrfToken || '',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ investorId: Number(inv.id), status: newStatus }),
          });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.error || 'Failed to update status.');

          // Update local data
          inv.identityVerificationStatus = newStatus;
          renderTable();
          renderDossierModal();
        } catch (err) {
          if (feedback) {
            feedback.textContent = err.message;
            feedback.className = 'tw-text-xs tw-text-rose-600 tw-mt-2';
          }
        } finally {
          submitBtn.disabled = false;
        }
      });
    }
  }

  function renderActiveTabContent(inv) {
    if (activeDossierTab === 'shortlists') {
      const items = inv.shortlists || [];
      if (!items.length) {
        return `
          <div class="tw-p-8 tw-text-center">
            <span class="tw-inline-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-full tw-bg-slate-100 tw-text-slate-400">
              <svg class="tw-h-6 tw-w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </span>
            <strong class="tw-mt-3 tw-block tw-text-sm tw-font-semibold tw-text-ink">No properties shortlisted yet</strong>
            <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-500">This investor hasn’t saved any city listings to their portfolio.</p>
          </div>
        `;
      }

      return `
        <div class="tw-grid tw-gap-3 sm:tw-grid-cols-2">
          ${items.map((prop) => `
            <div class="tw-flex tw-gap-3 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-3.5 tw-transition hover:tw-shadow-sm">
              <img src="${escape(prop.imageUrl ? path(prop.imageUrl) : path('assets/images/sfcView.png'))}" alt="" class="tw-h-16 tw-w-16 tw-rounded-lg tw-object-cover tw-border tw-border-slate-100">
              <div class="tw-min-w-0 tw-flex-1">
                <a href="${escape(path(`property-details.php?id=${encodeURIComponent(prop.propertyId)}`))}" target="_blank" rel="noopener noreferrer" class="tw-text-xs tw-font-bold tw-text-ink hover:tw-text-[#9e1b22] tw-no-underline">
                  ${escape(prop.propertyName)} ↗
                </a>
                <span class="tw-block tw-text-[11px] tw-text-slate-500 tw-mt-0.5">
                  ${escape(prop.barangay || 'San Fernando')}${prop.category ? ` · ${escape(prop.category)}` : ''}
                </span>
                <div class="tw-mt-2 tw-flex tw-items-center tw-justify-between">
                  <strong class="tw-text-xs tw-font-bold tw-text-[#9e1b22]">${currency(prop.price)}</strong>
                  <span class="tw-text-[10px] tw-text-slate-400">${escape(prop.shortlistedAt ? prop.shortlistedAt.split(' ')[0] : 'Saved')}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (activeDossierTab === 'visits') {
      const items = inv.visits || [];
      if (!items.length) {
        return `
          <div class="tw-p-8 tw-text-center">
            <span class="tw-inline-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-full tw-bg-slate-100 tw-text-slate-400">
              <svg class="tw-h-6 tw-w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <strong class="tw-mt-3 tw-block tw-text-sm tw-font-semibold tw-text-ink">No site visits requested</strong>
            <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-500">This investor hasn’t scheduled any property walkthroughs yet.</p>
          </div>
        `;
      }

      const statusBadge = (s) => {
        switch (s) {
          case 'visited': return '<span class="tw-rounded-md tw-bg-emerald-50 tw-px-2 tw-py-1 tw-text-[10px] tw-font-semibold tw-text-emerald-700">Walkthrough Completed</span>';
          case 'confirmed': return '<span class="tw-rounded-md tw-bg-blue-50 tw-px-2 tw-py-1 tw-text-[10px] tw-font-semibold tw-text-blue-800">Visit Scheduled</span>';
          case 'counter_offered': return '<span class="tw-rounded-md tw-bg-amber-50 tw-px-2 tw-py-1 tw-text-[10px] tw-font-semibold tw-text-amber-800">Counter Window Proposed</span>';
          default: return '<span class="tw-rounded-md tw-bg-slate-100 tw-px-2 tw-py-1 tw-text-[10px] tw-font-semibold tw-text-slate-700">Proposal Pending</span>';
        }
      };

      return `
        <div class="tw-space-y-3">
          ${items.map((v) => `
            <div class="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4">
              <div class="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-2">
                <div>
                  <h4 class="tw-m-0 tw-text-xs tw-font-bold tw-text-ink">
                    <a href="${escape(path(`property-details.php?id=${encodeURIComponent(v.propertyId)}`))}" target="_blank" rel="noopener noreferrer" class="hover:tw-text-[#9e1b22]">
                      ${escape(v.propertyName)} ↗
                    </a>
                  </h4>
                  <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-600">
                    Investment purpose: <strong>${escape(v.investmentPurpose || 'Commercial development')}</strong>
                  </p>
                </div>
                ${statusBadge(v.status)}
              </div>

              <div class="tw-mt-3 tw-grid tw-gap-2 sm:tw-grid-cols-2 tw-rounded-lg tw-bg-slate-50 tw-p-3 tw-text-[11px] tw-text-slate-600">
                <div>
                  <span class="tw-block tw-text-slate-400">Primary Window:</span>
                  <strong>${escape(v.primaryStartAt || '—')}</strong>
                </div>
                <div>
                  <span class="tw-block tw-text-slate-400">Confirmed Window:</span>
                  <strong>${escape(v.confirmedStartAt || 'Awaiting confirmation')}</strong>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (activeDossierTab === 'docs') {
      const items = inv.documentRequests || [];
      if (!items.length) {
        return `
          <div class="tw-p-8 tw-text-center">
            <span class="tw-inline-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-full tw-bg-slate-100 tw-text-slate-400">
              <svg class="tw-h-6 tw-w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </span>
            <strong class="tw-mt-3 tw-block tw-text-sm tw-font-semibold tw-text-ink">No document requests</strong>
            <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-500">This investor hasn’t requested verified property paperwork.</p>
          </div>
        `;
      }

      return `
        <div class="tw-space-y-3">
          ${items.map((doc) => `
            <div class="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4">
              <div class="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-2">
                <div>
                  <h4 class="tw-m-0 tw-text-xs tw-font-bold tw-text-ink">${escape(doc.documentName)}</h4>
                  <span class="tw-text-[11px] tw-text-slate-500">${escape(doc.propertyName)}</span>
                </div>
                <span class="tw-rounded-md tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-semibold ${doc.status === 'fulfilled' ? 'tw-bg-emerald-50 tw-text-emerald-700' : 'tw-bg-amber-50 tw-text-amber-800'}">
                  ${escape(doc.status)}
                </span>
              </div>
              ${doc.note ? `<p class="tw-mb-0 tw-mt-2 tw-text-xs tw-text-slate-600">Note: ${escape(doc.note)}</p>` : ''}
              ${doc.responseNote ? `<p class="tw-mb-0 tw-mt-1.5 tw-rounded-md tw-bg-slate-50 tw-p-2 tw-text-[11px] tw-text-slate-600">Response: ${escape(doc.responseNote)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    if (activeDossierTab === 'threads') {
      const items = inv.threads || [];
      if (!items.length) {
        return `
          <div class="tw-p-8 tw-text-center">
            <span class="tw-inline-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-full tw-bg-slate-100 tw-text-slate-400">
              <svg class="tw-h-6 tw-w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </span>
            <strong class="tw-mt-3 tw-block tw-text-sm tw-font-semibold tw-text-ink">No conversation threads</strong>
            <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-500">This investor hasn’t initiated any property inquiry threads.</p>
          </div>
        `;
      }

      return `
        <div class="tw-space-y-3">
          ${items.map((t) => `
            <div class="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4">
              <div class="tw-flex tw-items-center tw-justify-between">
                <h4 class="tw-m-0 tw-text-xs tw-font-bold tw-text-ink">${escape(t.subject || 'Property Discussion')}</h4>
                <span class="tw-text-[10px] tw-text-slate-400">${Number(t.messageCount)} messages</span>
              </div>
              <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-500">Property: <strong>${escape(t.propertyName)}</strong></p>
              ${t.lastMessageAt ? `<span class="tw-mt-2 tw-block tw-text-[10px] tw-text-slate-400">Latest message: ${escape(t.lastMessageAt)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    // Default: 'profile'
    return `
      <div class="tw-space-y-5">
        <div class="tw-grid tw-gap-4 sm:tw-grid-cols-2">
          <div class="tw-rounded-xl tw-border tw-border-slate-200 tw-p-4">
            <span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-400">Contact &amp; Location</span>
            <dl class="tw-mb-0 tw-mt-3 tw-space-y-2 tw-text-xs">
              <div><dt class="tw-text-slate-500">Full Name:</dt><dd class="tw-font-semibold tw-text-ink tw-m-0">${escape(inv.name)}</dd></div>
              <div><dt class="tw-text-slate-500">Official Email:</dt><dd class="tw-font-semibold tw-text-ink tw-m-0">${escape(inv.email)}</dd></div>
              <div><dt class="tw-text-slate-500">Contact Phone:</dt><dd class="tw-font-semibold tw-text-ink tw-m-0">${escape(inv.phone || 'Not provided')}</dd></div>
              <div><dt class="tw-text-slate-500">Location:</dt><dd class="tw-font-semibold tw-text-ink tw-m-0">${escape(inv.address || 'San Fernando, La Union')}</dd></div>
            </dl>
          </div>

          <div class="tw-rounded-xl tw-border tw-border-slate-200 tw-p-4">
            <span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-400">Security &amp; Compliance</span>
            <dl class="tw-mb-0 tw-mt-3 tw-space-y-2 tw-text-xs">
              <div><dt class="tw-text-slate-500">Account Created:</dt><dd class="tw-font-semibold tw-text-ink tw-m-0">${escape(inv.createdAt)}</dd></div>
              <div><dt class="tw-text-slate-500">Last Web Activity:</dt><dd class="tw-font-semibold tw-text-ink tw-m-0">${escape(inv.presenceLabel)}</dd></div>
              <div><dt class="tw-text-slate-500">Privacy Consent:</dt><dd class="tw-font-semibold tw-text-ink tw-m-0">${inv.privacyConsentAt ? 'Agreed (' + escape(inv.privacyConsentVersion) + ')' : 'Standard City Terms'}</dd></div>
              <div><dt class="tw-text-slate-500">Identity Verification:</dt><dd class="tw-font-semibold tw-text-ink tw-m-0">${escape(inv.identityVerificationStatus)}</dd></div>
            </dl>
          </div>
        </div>

        <!-- City Staff Verification Controls -->
        <div class="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50/70 tw-p-4 sm:tw-p-5">
          <strong class="tw-block tw-text-xs tw-font-bold tw-text-ink">Update Investor Identity Status</strong>
          <p class="tw-mb-0 tw-mt-1 tw-text-[11px] tw-text-slate-500">
            Set identity credentials for this investor to allow expedited site visits and government property disclosures.
          </p>

          <form id="investorVerificationForm" class="tw-mt-3 tw-flex tw-flex-wrap tw-items-center tw-gap-3">
            <select name="verificationStatus" class="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-medium tw-text-ink">
              <option value="verified" ${inv.identityVerificationStatus === 'verified' ? 'selected' : ''}>Verified Investor</option>
              <option value="pending" ${inv.identityVerificationStatus === 'pending' ? 'selected' : ''}>Pending Review</option>
              <option value="unverified" ${inv.identityVerificationStatus === 'unverified' ? 'selected' : ''}>Unverified</option>
              <option value="suspended" ${inv.identityVerificationStatus === 'suspended' ? 'selected' : ''}>Suspended Account</option>
            </select>
            <button type="submit" class="city-button tw-min-h-[38px] tw-px-4 tw-py-2 tw-text-xs">
              Save status
            </button>
            <p data-verification-feedback class="tw-mb-0 tw-text-xs tw-text-emerald-700 empty:tw-hidden"></p>
          </form>
        </div>
      </div>
    `;
  }

  async function fetchInvestors() {
    try {
      if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.classList.add('tw-opacity-60');
      }
      const res = await fetch(`${apiBase}/admin-investors.php`, { credentials: 'same-origin' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.investors)) {
        investors = data.investors;
        updateKpiCounters();
        renderTable();
      }
    } catch (err) {
      console.warn('Could not refresh investors list:', err);
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('tw-opacity-60');
      }
    }
  }

  // Setup Event Listeners
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      activeSearchQuery = e.target.value.trim();
      renderTable();
    });
  }

  if (verificationSelect) {
    verificationSelect.addEventListener('change', (e) => {
      activeVerificationFilter = e.target.value;
      renderTable();
    });
  }

  presenceButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      presenceButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activePresenceFilter = btn.dataset.presenceFilter || 'all';
      renderTable();
    });
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => fetchInvestors());
  }

  // Initial render
  updateKpiCounters();
  renderTable();

  // Background polling every 30 seconds to keep live presence updated
  setInterval(() => {
    fetchInvestors();
  }, 30000);

  window.SFCAdminInvestors = {
    refresh: fetchInvestors,
    openDossier,
  };
})();
