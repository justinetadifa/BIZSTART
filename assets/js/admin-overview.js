(() => {
  'use strict';

  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const number = (value) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 }).format(Number(value) || 0);
  const path = (route, config) => `${config.basePath || ''}/${route}`;
  const imageUrl = (source, config) => {
    if (/^https?:\/\//i.test(source || '')) return source;
    if (/^assets\//.test(source || '')) return path(source, config);
    return path('assets/images/sfcView.png', config);
  };
  const validScore = (value) => value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
  const score = (value) => Number(value).toFixed(1);
  const labels = { approved: 'Published', pending_review: 'Awaiting review', verified: 'Verified', rejected: 'Declined', suspended: 'Suspended', draft: 'Draft', archived: 'Archived' };
  const icon = (name) => {
    const shapes = {
      properties: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M10 21v-6h4v6"/>',
      review: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zM9 12h6M9 16h4"/>',
      published: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
      evidence: '<path d="M12 3 3 7v6c0 4 5 7 9 9 4-2 9-5 9-9V7l-9-4Z"/><path d="M12 8v5M12 17h.01"/>',
    };
    return `<svg class="tw-h-5 tw-w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.properties}</svg>`;
  };

  function renderOverview(properties, config = window.SFC_APP_CONFIG || {}) {
    const root = document.querySelector('[data-city-workspace="overview"]');
    if (!root) return;
    const items = Array.isArray(properties) ? properties : [];
    const governance = root.dataset.department === 'CICTO';
    const pending = items.filter((property) => property.approvalState === 'pending_review');
    const published = items.filter((property) => property.approvalState === 'approved');
    const missingEvidence = items.filter((property) => !property.siteVerifiedAt && property.approvalState !== 'archived');
    const stats = [
      ['All properties', items.length, 'Across the city catalog', 'properties', 'tw-bg-blue-50 tw-text-blue-700'],
      ['Awaiting review', pending.length, pending.length ? 'Ready for a city decision' : 'No pending listing decisions', 'review', 'tw-bg-amber-50 tw-text-amber-700'],
      ['Published', published.length, 'Visible to investors', 'published', 'tw-bg-emerald-50 tw-text-emerald-700'],
      ['Needs site evidence', missingEvidence.length, missingEvidence.length ? 'Awaiting site verification' : 'Site verification up to date', 'evidence', 'tw-bg-red-50 tw-text-[#9e1b22]'],
    ];
    root.querySelector('[data-city-stats]').innerHTML = stats.map(([label, value, description, symbol, color]) => `<article class="tw-flex tw-min-w-0 tw-items-start tw-gap-3 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4 sm:tw-p-5"><span class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl ${color}">${icon(symbol)}</span><div class="tw-min-w-0"><span class="tw-block tw-text-[11px] tw-leading-relaxed tw-text-slate-500">${label}</span><strong class="tw-mt-1 tw-block tw-text-[28px] tw-font-semibold tw-leading-tight tw-tracking-tight tw-text-ink" data-overview-stat="${symbol}">${number(value)}</strong><span class="tw-mt-2 tw-block tw-text-[10px] tw-leading-relaxed tw-text-slate-500">${description}</span></div></article>`).join('');

    const queue = governance ? pending : items.filter((property) => !property.assessmentComplete && property.approvalState !== 'archived');
    root.querySelector('[data-overview-listings]').innerHTML = queue.length
      ? queue.slice(0, 3).map((property) => `<article class="tw-grid tw-grid-cols-[56px_minmax(0,1fr)] tw-items-center tw-gap-x-3 tw-gap-y-2 tw-border-t tw-border-slate-100 tw-py-4 first:tw-border-0 sm:tw-grid-cols-[64px_minmax(0,1fr)_auto]"><img class="tw-h-14 tw-w-14 tw-rounded-lg tw-object-cover sm:tw-h-16 sm:tw-w-16" src="${escape(imageUrl(property.imageUrl, config))}" alt="" loading="lazy"><div class="tw-min-w-0"><h3 class="tw-m-0 tw-break-words tw-text-xs tw-font-semibold tw-leading-relaxed tw-text-ink"><a class="tw-text-ink tw-no-underline" href="${escape(path(`property-details.php?id=${encodeURIComponent(property.id)}`, config))}">${escape(property.name)}</a></h3><p class="tw-mb-0 tw-mt-1 tw-text-[11px] tw-leading-relaxed tw-text-slate-500">${escape(property.barangay || 'San Fernando')} · ${number(Number(property.area) * 10000)} m²</p><span class="tw-mt-2 tw-inline-flex tw-rounded-md tw-bg-amber-50 tw-px-2 tw-py-1 tw-text-[9px] tw-font-medium tw-text-amber-800">${governance ? 'Awaiting review' : 'Source scores pending'}</span></div><a class="tw-col-start-2 tw-flex tw-min-h-[36px] tw-w-fit tw-items-center tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-2 tw-text-[11px] tw-font-semibold tw-text-ink hover:tw-bg-slate-50 sm:tw-col-start-auto" href="${escape(path(`admin-properties.php?${governance ? 'review' : 'edit'}=${encodeURIComponent(property.id)}`, config))}">${governance ? 'Review' : 'Update'} →</a></article>`).join('')
      : '<div class="tw-flex tw-min-h-[180px] tw-flex-col tw-items-center tw-justify-center tw-gap-3 tw-p-4 tw-text-center"><span class="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full tw-bg-emerald-50 tw-text-emerald-700">' + icon('published') + '</span><strong class="tw-text-sm tw-font-semibold tw-text-ink">All caught up.</strong><p class="tw-m-0 tw-text-xs tw-leading-relaxed tw-text-slate-500">' + (governance ? 'New submissions will appear here for review.' : 'No properties are awaiting assessment.') + '</p></div>';

    const ranked = published.filter((property) => validScore(property.mceScore) && validScore(property.iaiScore))
      .sort((left, right) => Number(right.iaiScore) - Number(left.iaiScore) || Number(right.mceScore) - Number(left.mceScore) || Number(left.id) - Number(right.id)).slice(0, 5);
    const chart = root.querySelector('[data-assessment-ranking]');
    if (!ranked.length) {
      chart.innerHTML = '<div class="tw-flex tw-min-h-[180px] tw-flex-col tw-items-center tw-justify-center tw-gap-3 tw-rounded-lg tw-bg-slate-50 tw-p-4 tw-text-center"><strong class="tw-text-sm tw-font-semibold tw-text-ink">Scores will appear here.</strong><p class="tw-m-0 tw-max-w-xs tw-text-xs tw-leading-relaxed tw-text-slate-500">MCE and IAI appear once all seven criteria have source-backed scores.</p></div>';
      return;
    }
    const width = ranked.length * 100;
    const grid = [0, 45, 90, 135, 180].map((y) => `<line x1="0" x2="${width}" y1="${y}" y2="${y}" stroke="#e8edf2" stroke-width="1"/>`).join('');
    const bars = ranked.map((property, index) => ['mceScore', 'iaiScore'].map((key, position) => {
      const height = Number(property[key]) * 1.8;
      return `<rect x="${index * 100 + 25 + position * 26}" y="${180 - height}" width="22" height="${height}" rx="3" fill="${position ? '#e9b5bc' : '#a32635'}" data-overview-score="${key}" data-property-id="${Number(property.id)}" data-score="${score(property[key])}"><title>${escape(property.name)}: ${position ? 'IAI' : 'MCE'} ${score(property[key])}</title></rect>`;
    }).join('')).join('');
    chart.innerHTML = `<figure class="tw-m-0" aria-label="MCE and IAI scores for the top ${ranked.length} published properties"><div class="tw-mb-4 tw-flex tw-flex-wrap tw-justify-end tw-gap-4 tw-text-[10px] tw-text-slate-500"><span class="tw-flex tw-items-center tw-gap-1.5"><span class="tw-h-2.5 tw-w-2.5 tw-rounded-sm tw-bg-[#a32635]"></span>MCE</span><span class="tw-flex tw-items-center tw-gap-1.5"><span class="tw-h-2.5 tw-w-2.5 tw-rounded-sm tw-bg-[#e9b5bc]"></span>IAI</span></div><div class="tw-grid tw-grid-cols-[24px_minmax(0,1fr)] tw-gap-2"><div class="tw-flex tw-h-[180px] tw-flex-col tw-justify-between tw-text-[10px] tw-leading-none tw-text-slate-400" aria-hidden="true"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div class="tw-min-w-0"><svg class="tw-block tw-h-[180px] tw-w-full tw-overflow-visible" viewBox="0 0 ${width} 180" preserveAspectRatio="none" role="img" aria-label="Score chart; exact values are listed below">${grid}${bars}</svg><div class="tw-mt-3 tw-grid tw-grid-flow-col tw-auto-cols-fr tw-gap-1">${ranked.map((property) => `<span class="tw-min-w-0 tw-truncate tw-text-center tw-text-[9px] tw-text-slate-500" title="${escape(property.name)}">${escape(property.name)}</span>`).join('')}</div></div></div><figcaption class="tw-mt-4 tw-text-[10px] tw-leading-relaxed tw-text-slate-500">Scores out of 100 · ordered by IAI</figcaption></figure><details class="tw-mt-3 tw-text-[11px] tw-text-slate-500"><summary class="tw-cursor-pointer">View exact scores</summary><dl class="tw-mb-0 tw-mt-3 tw-space-y-2">${ranked.map((property) => `<div class="tw-flex tw-flex-wrap tw-justify-between tw-gap-2"><dt class="tw-min-w-0 tw-break-words tw-text-ink">${escape(property.name)}</dt><dd class="tw-m-0 tw-whitespace-nowrap">MCE ${score(property.mceScore)} · IAI ${score(property.iaiScore)}</dd></div>`).join('')}</dl></details>`;
    chart.querySelectorAll('dl > div').forEach((row, index) => {
      const mode = ranked[index].assessmentMode;
      const modeLabel = document.createElement('span');
      modeLabel.className = 'tw-mt-1 tw-block tw-text-[9px] tw-text-slate-500';
      modeLabel.textContent = mode === 'automatic' ? 'Automatic source-based assessment' : mode === 'legacy_manual' ? 'Legacy manual assessment' : 'Assessment mode not recorded';
      row.querySelector('dt').appendChild(modeLabel);
    });
  }

  const brokerIcons = {
    mail: '<svg class="tw-h-4 tw-w-4 tw-shrink-0 tw-text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    phone: '<svg class="tw-h-4 tw-w-4 tw-shrink-0 tw-text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    pin: '<svg class="tw-h-4 tw-w-4 tw-shrink-0 tw-text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    doc: '<svg class="tw-h-4 tw-w-4 tw-shrink-0 tw-text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    calendar: '<svg class="tw-h-4 tw-w-4 tw-shrink-0 tw-text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    rosette: '<svg class="tw-h-4 tw-w-4 tw-shrink-0 tw-text-slate-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.5 2.1 2.6-.4.8 2.5 2.5.8-.4 2.6 2.1 1.5-1.5 2.1.4 2.6-2.5.8-.8 2.5-2.6-.4L12 22l-1.5-2.1-2.6.4-.8-2.5-2.5-.8.4-2.6L2.9 12l1.5-2.1-.4-2.6 2.5-.8.8-2.5 2.6.4L12 2z"/></svg>',
    chat: '<svg class="tw-h-4 tw-w-4 tw-shrink-0 tw-text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  };

  function brokerInitials(name) {
    return String(name || 'Broker').trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] || '').join('').toUpperCase() || 'BR';
  }

  function brokerAvatar(profile, name, config, large = false) {
    const source = String(profile.profileImageUrl || '').trim();
    const url = /^assets\/[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(source) && !source.split('/').includes('..')
      ? path(source, config) : '';
    return `<span class="broker-avatar${large ? ' broker-avatar--large' : ''}"><span data-broker-avatar-initials>${escape(brokerInitials(name))}</span>${url ? `<img data-broker-avatar-image src="${escape(url)}" alt="" width="${large ? 48 : 40}" height="${large ? 48 : 40}">` : ''}</span>`;
  }

  function renderPendingBrokerCard(profile, config = window.SFC_APP_CONFIG || {}) {
    const name = profile.legalName || profile.name || profile.userName || 'Broker';
    const email = profile.email || profile.userEmail || 'Email not provided';
    const phone = profile.phone || 'Contact not provided';
    const address = [profile.addressLine, profile.barangay, profile.city].filter(Boolean).join(', ') || 'Address not provided';
    const prcNo = profile.prcRegistrationNo || 'Not provided';
    const validUntil = profile.prcValidUntil || 'Not provided';

    return `
      <form class="tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-6 sm:tw-p-8 tw-shadow-sm tw-mb-6" data-broker-review="${Number(profile.userId)}">
        <div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-[1.1fr_1fr] tw-gap-8 lg:tw-gap-12">
          <!-- Left Column: Pending Details -->
          <div class="tw-min-w-0">
            <span class="tw-block tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-400 tw-mb-4">PENDING APPLICATION</span>
            <div class="tw-flex tw-items-center tw-gap-3.5 tw-mb-5">
              ${brokerAvatar(profile, name, config, true)}
              <div class="tw-min-w-0">
                <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2.5">
                  <h3 class="tw-m-0 tw-text-base sm:tw-text-lg tw-font-bold tw-text-slate-900">${escape(name)}</h3>
                  <span class="tw-inline-flex tw-items-center tw-rounded-full tw-bg-[#FEF3C7] tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-[#92400E]">Awaiting review</span>
                </div>
                <p class="tw-mb-0 tw-mt-0.5 tw-text-xs tw-text-slate-500">Broker application</p>
              </div>
            </div>

            <div class="tw-my-5 tw-border-t tw-border-slate-100"></div>

            <div class="tw-space-y-3.5 tw-text-xs">
              <div class="tw-flex tw-items-baseline tw-gap-3">
                ${brokerIcons.mail}
                <span class="tw-w-20 sm:tw-w-24 tw-shrink-0 tw-text-slate-500">Email</span>
                <span class="tw-min-w-0 tw-break-all tw-text-slate-700">${escape(email)}</span>
              </div>
              <div class="tw-flex tw-items-baseline tw-gap-3">
                ${brokerIcons.phone}
                <span class="tw-w-20 sm:tw-w-24 tw-shrink-0 tw-text-slate-500">Contact</span>
                <span class="tw-text-slate-700">${escape(phone)}</span>
              </div>
              <div class="tw-flex tw-items-baseline tw-gap-3">
                ${brokerIcons.pin}
                <span class="tw-w-20 sm:tw-w-24 tw-shrink-0 tw-text-slate-500">Address</span>
                <span class="tw-text-slate-700 tw-leading-relaxed">${escape(address)}</span>
              </div>
              <div class="tw-flex tw-items-baseline tw-gap-3">
                ${brokerIcons.doc}
                <span class="tw-w-20 sm:tw-w-24 tw-shrink-0 tw-text-slate-500">PRC No.</span>
                <span class="tw-font-medium tw-text-slate-800">${escape(prcNo)}</span>
              </div>
              <div class="tw-flex tw-items-baseline tw-gap-3">
                ${brokerIcons.calendar}
                <span class="tw-w-20 sm:tw-w-24 tw-shrink-0 tw-text-slate-500">Valid until</span>
                <span class="tw-text-slate-700">${escape(validUntil)}</span>
              </div>
            </div>
          </div>

          <!-- Right Column: PRC verification form -->
          <div class="tw-flex tw-flex-col tw-justify-between tw-border-t tw-border-slate-100 tw-pt-6 lg:tw-border-t-0 lg:tw-border-l lg:tw-border-slate-100 lg:tw-pl-10 lg:tw-pt-0">
            <div>
              <h4 class="tw-m-0 tw-text-sm sm:tw-text-base tw-font-bold tw-text-slate-900">PRC verification</h4>
              <div class="tw-mt-2 tw-flex tw-items-center tw-gap-2 tw-text-xs tw-font-medium tw-text-slate-500">
                ${brokerIcons.rosette}
                <span>Not yet verified</span>
              </div>

              <div class="tw-mt-5">
                <label class="tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-2.5 tw-text-xs tw-font-medium tw-text-slate-700">
                  <input type="checkbox" name="prcChecked" class="tw-h-4 tw-w-4 tw-rounded tw-border-slate-300 tw-accent-[#9E1B22]">
                  <span>PRC registration checked</span>
                </label>
              </div>

              <div class="tw-mt-5">
                <label class="tw-mb-1.5 tw-block tw-text-xs tw-font-medium tw-text-slate-600">Review note</label>
                <textarea name="reviewNotes" placeholder="Write a message to the broker" rows="3" maxlength="3000" class="tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-p-3 tw-text-xs tw-text-slate-800 placeholder:tw-text-slate-400 focus:tw-border-slate-400 focus:tw-outline-none"></textarea>
              </div>
            </div>

            <div class="tw-mt-6">
              <div class="tw-flex tw-items-center tw-justify-end tw-gap-3">
                <button type="submit" name="decision" value="rejected" class="tw-rounded-lg tw-border tw-border-slate-300 tw-bg-white tw-px-5 tw-py-2 tw-text-xs tw-font-semibold tw-text-slate-700 hover:tw-bg-slate-50 tw-transition-colors">Decline</button>
                <button type="submit" name="decision" value="verified" class="tw-rounded-lg tw-bg-[#9E1B22] tw-px-5 tw-py-2 tw-text-xs tw-font-semibold tw-text-white hover:tw-bg-[#83161C] tw-transition-colors">Approve broker</button>
              </div>
              <p class="city-form-message tw-mt-2 tw-text-xs empty:tw-hidden" data-broker-message role="status"></p>
            </div>
          </div>
        </div>
      </form>
    `;
  }

  function renderReviewedBrokerCard(profile, config = window.SFC_APP_CONFIG || {}) {
    const name = profile.legalName || profile.name || profile.userName || 'Broker';
    const email = profile.email || profile.userEmail || 'Email not provided';
    const phone = profile.phone || 'Contact not provided';
    const address = [profile.addressLine, profile.barangay, profile.city].filter(Boolean).join(', ') || 'Address not provided';
    const prcNo = profile.prcRegistrationNo || 'Not provided';
    const validUntil = profile.prcValidUntil || 'Not provided';
    const isVerified = profile.applicationStatus === 'verified';
    const pillClass = isVerified
      ? 'tw-bg-emerald-50 tw-text-emerald-700 tw-border tw-border-emerald-200'
      : profile.applicationStatus === 'rejected'
        ? 'tw-bg-rose-50 tw-text-[#9E1B22] tw-border tw-border-rose-200'
        : 'tw-bg-slate-100 tw-text-slate-700 tw-border tw-border-slate-200';
    const statusText = labels[profile.applicationStatus] || profile.applicationStatus;

    return `
      <div class="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-5 sm:tw-p-6 tw-shadow-sm tw-mb-4" data-broker-item="${Number(profile.userId)}">
        <!-- Top row: Avatar, Name, Pill, Actions -->
        <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
          <div class="tw-flex tw-items-center tw-gap-3.5">
            ${brokerAvatar(profile, name, config)}
            <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2.5">
              <strong class="tw-text-sm sm:tw-text-base tw-font-bold tw-text-slate-900">${escape(name)}</strong>
              <span class="tw-inline-flex tw-items-center tw-rounded-full ${pillClass} tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium">${escape(statusText)}</span>
            </div>
          </div>
          <div class="tw-flex tw-items-center tw-gap-3">
            <button type="button" class="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3.5 tw-py-1.5 tw-text-xs tw-font-semibold tw-text-slate-700 hover:tw-bg-slate-50 tw-transition-colors" data-toggle-broker-details="${Number(profile.userId)}">View details</button>
            <button type="button" class="tw-text-xs tw-font-semibold tw-text-[#9E1B22] hover:tw-underline tw-bg-transparent tw-border-0 tw-p-0 tw-cursor-pointer" data-reverify-broker="${Number(profile.userId)}">Reverify</button>
          </div>
        </div>

        <!-- Metadata row -->
        <div class="tw-mt-4 tw-flex tw-flex-wrap tw-items-center tw-gap-x-5 tw-gap-y-2.5 tw-text-xs tw-text-slate-600">
          <div class="tw-flex tw-items-center tw-gap-1.5">
            ${brokerIcons.mail}
            <span class="tw-text-[11px] tw-text-slate-400">Email</span>
            <span class="tw-text-slate-700">${escape(email)}</span>
          </div>
          <div class="tw-flex tw-items-center tw-gap-1.5">
            ${brokerIcons.phone}
            <span class="tw-text-[11px] tw-text-slate-400">Contact</span>
            <span class="tw-text-slate-700">${escape(phone)}</span>
          </div>
          <div class="tw-flex tw-items-center tw-gap-1.5">
            ${brokerIcons.pin}
            <span class="tw-text-[11px] tw-text-slate-400">Address</span>
            <span class="tw-text-slate-700">${escape(address)}</span>
          </div>
          <span class="tw-hidden xl:tw-block tw-h-4 tw-w-px tw-bg-slate-200" aria-hidden="true"></span>
          <div class="tw-flex tw-items-center tw-gap-1.5">
            ${brokerIcons.doc}
            <span class="tw-text-[11px] tw-text-slate-400">PRC No.</span>
            <span class="tw-text-slate-700">${escape(prcNo)}</span>
          </div>
          <div class="tw-flex tw-items-center tw-gap-1.5">
            ${brokerIcons.calendar}
            <span class="tw-text-[11px] tw-text-slate-400">Valid until</span>
            <span class="tw-text-slate-700">${escape(validUntil)}</span>
          </div>
          ${profile.reviewNotes ? `
          <div class="tw-flex tw-items-center tw-gap-1.5">
            ${brokerIcons.chat}
            <span class="tw-text-[11px] tw-text-slate-400">Last review note</span>
            <span class="tw-text-slate-700">${escape(profile.reviewNotes)}</span>
          </div>` : ''}
        </div>

        <!-- Collapsible review drawer -->
        <form class="tw-mt-4 tw-border-t tw-border-slate-100 tw-pt-4" data-broker-review="${Number(profile.userId)}" data-broker-drawer="${Number(profile.userId)}" hidden>
          <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-[1fr_auto] tw-gap-4 tw-items-end">
            <div class="tw-space-y-3">
              <label class="tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-2.5 tw-text-xs tw-font-medium tw-text-slate-700">
                <input type="checkbox" name="prcChecked" class="tw-h-4 tw-w-4 tw-rounded tw-border-slate-300 tw-accent-[#9E1B22]" ${isVerified ? 'checked' : ''}>
                <span>PRC registration checked</span>
              </label>
              <div>
                <label class="tw-mb-1 tw-block tw-text-xs tw-font-medium tw-text-slate-500">Review message</label>
                <textarea name="reviewNotes" placeholder="Write a message to the broker" rows="2" maxlength="3000" class="tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-p-2.5 tw-text-xs tw-text-slate-800 placeholder:tw-text-slate-400 focus:tw-border-slate-400 focus:tw-outline-none">${escape(profile.reviewNotes || '')}</textarea>
              </div>
            </div>
            <div class="tw-flex tw-items-center tw-justify-end tw-gap-2.5">
              <button type="submit" name="decision" value="${isVerified ? 'suspended' : 'rejected'}" class="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-4 tw-py-2 tw-text-xs tw-font-semibold tw-text-slate-700 hover:tw-bg-slate-50 tw-transition-colors">${isVerified ? 'Suspend' : 'Decline'}</button>
              <button type="submit" name="decision" value="verified" class="tw-rounded-lg tw-bg-[#9E1B22] tw-px-4 tw-py-2 tw-text-xs tw-font-semibold tw-text-white hover:tw-bg-[#83161C] tw-transition-colors">${isVerified ? 'Update & Confirm' : 'Approve broker'}</button>
            </div>
          </div>
          <p class="city-form-message tw-mt-2 tw-text-xs empty:tw-hidden" data-broker-message role="status"></p>
        </form>
      </div>
    `;
  }

  function renderBrokerProfiles(profiles, config = window.SFC_APP_CONFIG || {}) {
    const items = Array.isArray(profiles) ? profiles : [];
    const pending = items.filter((profile) => profile.applicationStatus === 'pending_review');
    const reviewed = items.filter((profile) => ['verified', 'rejected', 'suspended'].includes(profile.applicationStatus));

    const pendingSection = pending.length
      ? pending.map((profile) => renderPendingBrokerCard(profile, config)).join('')
      : '<div class="tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-8 tw-text-center tw-text-slate-500 tw-mb-6"><p class="tw-m-0 tw-text-xs">No broker applications are awaiting review.</p></div>';

    const reviewedSection = reviewed.length ? `
      <div class="tw-mt-8 tw-mb-4">
        <h3 class="tw-m-0 tw-text-lg sm:tw-text-xl tw-font-bold tw-text-slate-900">Previously reviewed brokers (${reviewed.length})</h3>
        <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-500">Brokers that have been reviewed and processed.</p>
      </div>
      <div>${reviewed.map((profile) => renderReviewedBrokerCard(profile, config)).join('')}</div>
    ` : '';

    return pendingSection + reviewedSection;
  }

  window.SFCAdminOverview = { renderOverview, renderBrokerProfiles, renderPendingBrokerCard, renderReviewedBrokerCard };

  document.addEventListener('error', (event) => {
    if (event.target.matches?.('[data-broker-avatar-image]')) event.target.hidden = true;
  }, true);

  document.addEventListener('click', (event) => {
    const toggleBtn = event.target.closest('[data-toggle-broker-details], [data-reverify-broker]');
    if (!toggleBtn) return;
    const userId = toggleBtn.dataset.toggleBrokerDetails || toggleBtn.dataset.reverifyBroker;
    const drawer = document.querySelector(`[data-broker-drawer="${userId}"]`);
    if (drawer) {
      drawer.hidden = !drawer.hidden;
      if (!drawer.hidden) {
        drawer.querySelector('textarea, input[type="checkbox"]')?.focus();
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const staffButton = document.querySelector('[data-open-staff-form]');
    staffButton?.addEventListener('click', () => {
      const panel = document.querySelector('.city-staff-provision-details');
      if (!panel) return;
      panel.open = true;
      document.getElementById('staffInputName')?.focus({ preventScroll: true });
      panel.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  });
})();
