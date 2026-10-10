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
  const labels = { approved: 'Published', pending_review: 'Awaiting review', verified: 'Approved application', corrections_requested: 'Corrections requested', rejected: 'Declined', blocked: 'Blocked after review', suspended: 'Suspended', draft: 'Draft', archived: 'Archived' };
  const icon = (name) => {
    const shapes = {
      properties: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M10 21v-6h4v6"/>',
      review: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zM9 12h6M9 16h4"/>',
      published: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
      evidence: '<path d="M12 3 3 7v6c0 4 5 7 9 9 4-2 9-5 9-9V7l-9-4Z"/><path d="M12 8v5M12 17h.01"/>',
    };
    return `<svg class="tw-h-5 tw-w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.properties}</svg>`;
  };

  const cleanTitle = (name) => String(name || '').replace(/\s*[–-]\s*San Fernando.*$/i, '').trim();

  function renderOverview(properties, config = window.SFC_APP_CONFIG || {}) {
    const root = document.querySelector('[data-city-workspace="overview"]');
    if (!root) return;
    const items = Array.isArray(properties) ? properties : [];
    const governance = root.dataset.listingReviewer === 'true' || (!root.hasAttribute('data-listing-reviewer') && root.dataset.department === 'CICTO');
    const pending = items.filter((property) => property.approvalState === 'pending_review');
    const published = items.filter((property) => property.approvalState === 'approved');
    const missingEvidence = items.filter((property) => !property.siteVerifiedAt && property.approvalState !== 'archived');
    const stats = [
      ['All properties', items.length, 'Across the city catalog', 'properties', 'tw-bg-blue-50 tw-text-blue-700', false],
      ['Awaiting review', pending.length, pending.length ? 'Ready for a city decision' : 'No pending listing decisions', 'review', pending.length ? 'tw-bg-amber-100 tw-text-amber-800' : 'tw-bg-amber-50 tw-text-amber-700', pending.length > 0],
      ['Published', published.length, 'Visible to investors', 'published', 'tw-bg-emerald-50 tw-text-emerald-700', false],
      ['Needs site evidence', missingEvidence.length, missingEvidence.length ? 'Awaiting site verification' : 'Site verification up to date', 'evidence', 'tw-bg-red-50 tw-text-[#9e1b22]', false],
    ];
    root.querySelector('[data-city-stats]').innerHTML = stats.map(([label, value, description, symbol, color, isHighlight]) => `
      <article class="tw-flex tw-min-w-0 tw-items-start tw-gap-3 tw-rounded-xl tw-border ${isHighlight ? 'tw-border-amber-300 tw-bg-amber-50/30 tw-ring-1 tw-ring-amber-200' : 'tw-border-slate-200 tw-bg-white'} tw-p-4 sm:tw-p-5 tw-transition-all hover:tw-shadow-sm">
        <span class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl ${color}">${icon(symbol)}</span>
        <div class="tw-min-w-0">
          <span class="tw-block tw-text-[11px] tw-leading-relaxed tw-text-slate-500">${label}</span>
          <strong class="tw-mt-1 tw-block tw-text-[28px] tw-font-semibold tw-leading-tight tw-tracking-tight tw-text-ink" data-overview-stat="${symbol}">${number(value)}</strong>
          <span class="tw-mt-2 tw-block tw-text-[10px] tw-leading-relaxed ${isHighlight ? 'tw-text-amber-700 tw-font-medium' : 'tw-text-slate-500'}">${description}</span>
        </div>
      </article>`).join('');

    const queue = governance ? pending : items.filter((property) => !property.assessmentComplete && property.approvalState !== 'archived');
    root.querySelector('[data-overview-listings]').innerHTML = queue.length
      ? queue.slice(0, 3).map((property) => `
        <article class="tw-grid tw-grid-cols-[56px_minmax(0,1fr)] tw-items-center tw-gap-x-3 tw-gap-y-2 tw-border-t tw-border-slate-100 tw-py-4 first:tw-border-0 sm:tw-grid-cols-[64px_minmax(0,1fr)_auto]">
          <img class="tw-h-14 tw-w-14 tw-rounded-lg tw-object-cover sm:tw-h-16 sm:tw-w-16" src="${escape(imageUrl(property.imageUrl, config))}" alt="" loading="lazy">
          <div class="tw-min-w-0">
            <h3 class="tw-m-0 tw-break-words tw-text-xs tw-font-semibold tw-leading-relaxed tw-text-ink">
              <a class="tw-text-ink tw-no-underline hover:tw-text-[#9e1b22] tw-transition-colors" href="${escape(path(`property-details.php?id=${encodeURIComponent(property.id)}`, config))}">${escape(cleanTitle(property.name))}</a>
            </h3>
            <p class="tw-mb-0 tw-mt-1 tw-text-[11px] tw-leading-relaxed tw-text-slate-500">${escape(property.barangay || 'San Fernando')} · ${number(Number(property.area) * 10000)} m²</p>
            <span class="tw-mt-2 tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-amber-50 tw-px-2 tw-py-1 tw-text-[9.5px] tw-font-medium tw-text-amber-800">
              <span class="tw-w-1.5 tw-h-1.5 tw-rounded-full tw-bg-amber-500"></span>
              ${governance ? 'Awaiting review' : 'Source scores pending'}
            </span>
          </div>
          <a class="tw-col-start-2 tw-flex tw-min-h-[36px] tw-w-fit tw-items-center tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3.5 tw-py-2 tw-text-[11px] tw-font-semibold tw-text-ink hover:tw-bg-slate-50 hover:tw-border-slate-300 sm:tw-col-start-auto tw-transition-colors" href="${escape(path(`admin-properties.php?${governance ? 'review' : 'edit'}=${encodeURIComponent(property.id)}`, config))}">${governance ? 'Review' : 'Update'} &rarr;</a>
        </article>`).join('')
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
      const height = Math.max(4, Number(property[key]) * 1.8);
      const x = index * 100 + 24 + position * 26;
      const y = 180 - height;
      const val = score(property[key]);
      return `<g class="chart-bar-group" data-property-id="${Number(property.id)}">
        <rect x="${x}" y="${y}" width="22" height="${height}" rx="3" fill="${position ? '#e9b5bc' : '#a32635'}" data-overview-score="${key}" data-score="${val}">
          <title>${escape(property.name)}: ${position ? 'IAI' : 'MCE'} ${val}</title>
        </rect>
        <text x="${x + 11}" y="${Math.max(10, y - 4)}" text-anchor="middle" font-size="9" font-weight="600" fill="${position ? '#a32635' : '#475569'}">${val}</text>
      </g>`;
    }).join('')).join('');

    chart.innerHTML = `<figure class="tw-m-0" aria-label="MCE and IAI scores for the top ${ranked.length} published properties">
      <div class="tw-mb-4 tw-flex tw-flex-wrap tw-justify-end tw-gap-4 tw-text-[10px] tw-text-slate-500">
        <span class="tw-flex tw-items-center tw-gap-1.5"><span class="tw-h-2.5 tw-w-2.5 tw-rounded-sm tw-bg-[#a32635]"></span>MCE (Deep Red)</span>
        <span class="tw-flex tw-items-center tw-gap-1.5"><span class="tw-h-2.5 tw-w-2.5 tw-rounded-sm tw-bg-[#e9b5bc]"></span>IAI (Blush)</span>
      </div>
      <div class="tw-grid tw-grid-cols-[24px_minmax(0,1fr)] tw-gap-2">
        <div class="tw-flex tw-h-[180px] tw-flex-col tw-justify-between tw-text-[10px] tw-leading-none tw-text-slate-400" aria-hidden="true">
          <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
        </div>
        <div class="tw-min-w-0">
          <svg class="tw-block tw-h-[180px] tw-w-full tw-overflow-visible" viewBox="0 0 ${width} 180" preserveAspectRatio="none" role="img" aria-label="Score chart; exact values are listed below">
            ${grid}${bars}
          </svg>
          <div class="tw-mt-3 tw-grid tw-grid-flow-col tw-auto-cols-fr tw-gap-1">
            ${ranked.map((property, idx) => `
              <div class="tw-min-w-0 tw-text-center tw-px-1" title="${escape(property.name)}">
                <span class="tw-block tw-truncate tw-text-[10px] tw-font-semibold tw-text-slate-700">${escape(cleanTitle(property.name))}</span>
                <span class="tw-block tw-text-[9px] tw-text-slate-400">#${idx + 1}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
      <figcaption class="tw-mt-4 tw-text-[10px] tw-leading-relaxed tw-text-slate-500">Scores out of 100 · ordered by IAI score</figcaption>
    </figure>
    <details class="tw-mt-3 tw-text-[11px] tw-text-slate-500">
      <summary class="tw-cursor-pointer tw-font-medium hover:tw-text-[#9e1b22] tw-transition-colors">View exact scores</summary>
      <dl class="tw-mb-0 tw-mt-3 tw-space-y-2.5">
        ${ranked.map((property) => `
          <div class="tw-flex tw-flex-wrap tw-justify-between tw-items-center tw-gap-2 tw-border-b tw-border-slate-100 tw-pb-2">
            <dt class="tw-min-w-0 tw-break-words tw-text-ink tw-font-medium">${escape(property.name)}</dt>
            <dd class="tw-m-0 tw-whitespace-nowrap tw-text-xs"><strong class="tw-text-[#a32635]">MCE ${score(property.mceScore)}</strong> · <strong class="tw-text-[#9e1b22]">IAI ${score(property.iaiScore)}</strong></dd>
          </div>`).join('')}
      </dl>
    </details>`;
    chart.querySelectorAll('dl > div').forEach((row, index) => {
      const mode = ranked[index].assessmentMode;
      const modeLabel = document.createElement('span');
      modeLabel.className = 'tw-mt-0.5 tw-block tw-text-[9px] tw-text-slate-400';
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

  function brokerDocuments(profile, config) {
    return `<div class="broker-id-grid broker-review-documents">${['front', 'back'].map(side => {
      const document = profile[`${side}Document`];
      const label = `PRC ID — ${side === 'front' ? 'Front' : 'Back'}`;
      if (!document) return `<figure><figcaption>${label}</figcaption><p class="tw-text-xs tw-text-[#9e1b22]">Image missing. Request corrections before approval.</p></figure>`;
      const url = `${String(config.apiBase || path('api', config)).replace(/\/$/, '')}/broker-document.php?userId=${Number(profile.userId)}&side=${side}&documentId=${encodeURIComponent(String(document.id))}`;
      return `<figure><figcaption>${label}</figcaption><a href="${escape(url)}" target="_blank" rel="noopener"><img class="broker-id-preview" src="${escape(url)}" alt="${label}" loading="lazy" data-private-broker-image>Open full image <span class="account-sr-only">(opens in a new tab)</span></a><p class="broker-id-hint">${escape(document.mime)} · ${number(Number(document.size) / 1024)} KB</p></figure>`;
    }).join('')}</div>`;
  }

  function brokerReviewHistory(profile) {
    const history = Array.isArray(profile.reviewHistory) ? profile.reviewHistory : [];
    return `<details class="broker-review-history"><summary>Review history (${history.length})</summary>${history.length ? `<ol>${history.map(review => `<li><strong>${escape(labels[review.decision] || review.decision)}</strong> · ${escape(review.createdAt)}<br>${escape(review.reviewerName || `Reviewer #${review.reviewerUserId}`)} · Application revision ${Number(review.applicationRevision) || 1}<br>Reason: ${escape(review.reason)}${review.findings ? `<br>Findings: ${escape(review.findings)}` : ''}</li>`).join('')}</ol>` : '<p>No review decision has been recorded.</p>'}</details>`;
  }

  function brokerDelivery(profile) {
    const notifications = Array.isArray(profile.notifications) ? profile.notifications : [];
    const statuses = { sent: 'Sent', pending: 'Queued; delivery not confirmed', sending: 'Delivery in progress; not confirmed', queued: 'Queued; delivery not confirmed', failed: 'Failed', unconfigured: 'Mail service unconfigured', enqueue_failed: 'Email delivery tracking unavailable; application decision saved', retrying: 'Retry pending' };
    const latest = profile.emailStatus || profile.mailDelivery?.delivery || profile.latestNotification;
    const delivery = notifications.length ? notifications.map(item => `<li>${escape(item.subject || item.type || item.eventType || 'Application notification')}: ${escape(statuses[item.status] || item.status || 'Delivery not confirmed')}${item.lastError ? ` · ${escape(item.lastError)}` : ''}</li>`).join('') : latest ? `<li>${escape(latest.kind || 'Application notification')}: ${escape(statuses[latest.status || latest] || latest.status || latest)}${latest.lastError ? ` · ${escape(latest.lastError)}` : ''}</li>` : '<li>No recorded delivery status.</li>';
    const retry = latest?.id && ['failed', 'unconfigured'].includes(latest.status) ? `<button type="button" class="city-button city-button-secondary" data-retry-broker-mail="${Number(latest.id)}">Retry notification delivery</button>` : '';
    return `<details class="broker-review-history"><summary>Notification delivery</summary><ul>${delivery}</ul>${retry}<p>Review decisions remain saved when email delivery fails.</p><p data-broker-mail-message role="status" aria-live="polite"></p></details>`;
  }

  function brokerReviewControls(profile) {
    const identifier = `broker-review-${Number(profile.userId)}`;
    const approved = profile.applicationStatus === 'verified';
    return `<div class="tw-mt-4">
      <label class="tw-flex tw-items-start tw-gap-2 tw-text-xs tw-leading-relaxed"><input type="checkbox" name="prcChecked" class="tw-mt-1 tw-h-4 tw-w-4 tw-shrink-0 tw-accent-[#9e1b22]"><span>I checked the PRC registration, expiration date, and both ID images against the submitted details.</span></label>
      <label for="${identifier}-reason" class="tw-mt-4 tw-block tw-text-xs tw-font-semibold">Decision reason / message to applicant</label>
      <textarea id="${identifier}-reason" name="reviewNotes" rows="3" maxlength="3000" required class="tw-mt-2 tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-p-3 tw-text-xs" placeholder="Explain the review decision and any corrections needed."></textarea>
      <label for="${identifier}-findings" class="tw-mt-4 tw-block tw-text-xs tw-font-semibold">Documented findings</label>
      <textarea id="${identifier}-findings" name="findings" rows="3" maxlength="5000" class="tw-mt-2 tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-p-3 tw-text-xs" placeholder="Record verification evidence. Required when blocking an account."></textarea>
      <p class="tw-mt-2 tw-text-xs tw-leading-relaxed tw-text-slate-500">For unclear images, expired documents or inconclusive checks, request corrections. Blocking requires an explicit decision supported by documented findings.</p>
      <div class="broker-review-controls">
        <button type="submit" name="decision" value="verified" class="city-button">${approved ? 'Confirm approval' : 'Approve application'}</button>
        <button type="submit" name="decision" value="corrections_requested" class="city-button city-button-secondary">Request corrections</button>
        <button type="submit" name="decision" value="rejected" class="city-button city-button-secondary">Reject application</button>
        <button type="submit" name="decision" value="blocked" class="city-button city-button-secondary">Block after review</button>
      </div>
      <p class="broker-review-message" data-broker-message role="status" aria-live="polite"></p>
    </div>`;
  }

  function brokerApplicationDetails(profile, config) {
    const fields = [
      ['Email', profile.email || profile.userEmail || 'Not provided'],
      ['Email ownership', profile.emailVerifiedAt || profile.emailVerified ? 'Verified' : 'Not yet verified'],
      ['Account access', profile.accountStatus || 'Active'],
      ['Contact', profile.phone || 'Not provided'],
      ['Address', [profile.addressLine, profile.barangay, profile.city].filter(Boolean).join(', ') || 'Not provided'],
      ['Agency / firm', profile.companyName || 'Not provided'],
      ['PRC license number', profile.prcRegistrationNo || 'Not provided'],
      ['PRC valid until', profile.prcValidUntil || 'Not provided'],
      ['Application revision', profile.applicationRevision || 1]
    ];
    return `<dl class="tw-mt-4 tw-grid tw-gap-3 tw-text-xs">${fields.map(([label, value]) => `<div class="tw-grid tw-grid-cols-[130px_minmax(0,1fr)] tw-gap-3"><dt class="tw-text-slate-500">${escape(label)}</dt><dd class="tw-m-0 tw-min-w-0 tw-break-words tw-text-ink">${escape(value)}</dd></div>`).join('')}</dl>${brokerDocuments(profile, config)}${profile.reviewNotes ? `<p class="tw-text-xs tw-leading-relaxed"><strong>Last decision reason:</strong> ${escape(profile.reviewNotes)}</p>` : ''}${brokerReviewHistory(profile)}${brokerDelivery(profile)}`;
  }

  function brokerCardHeader(profile, config) {
    const name = profile.legalName || profile.name || profile.userName || 'Broker';
    return `<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-3">${brokerAvatar(profile, name, config)}<h3 class="tw-m-0 tw-text-base tw-font-semibold tw-text-ink">${escape(name)}</h3><span class="city-pill ${escape(profile.applicationStatus)}">${escape(labels[profile.applicationStatus] || profile.applicationStatus)}</span>${profile.accountStatus === 'blocked' ? '<span class="city-pill rejected">Account blocked</span>' : ''}</div>`;
  }

  function renderPendingBrokerCard(profile, config = window.SFC_APP_CONFIG || {}) {
    return `<form class="tw-mb-5 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4 sm:tw-p-6" data-broker-review="${Number(profile.userId)}" data-application-revision="${Number(profile.applicationRevision) || 1}">${brokerCardHeader(profile, config)}${brokerApplicationDetails(profile, config)}${brokerReviewControls(profile)}</form>`;
  }

  function renderReviewedBrokerCard(profile, config = window.SFC_APP_CONFIG || {}) {
    return `<article class="tw-mb-5 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4 sm:tw-p-6" data-broker-item="${Number(profile.userId)}">${brokerCardHeader(profile, config)}<button type="button" class="city-button city-button-secondary tw-mt-4" data-toggle-broker-details="${Number(profile.userId)}" aria-expanded="false" aria-controls="broker-drawer-${Number(profile.userId)}">View details and review</button><form id="broker-drawer-${Number(profile.userId)}" class="tw-mt-4 tw-border-t tw-border-slate-100 tw-pt-4" data-broker-review="${Number(profile.userId)}" data-application-revision="${Number(profile.applicationRevision) || 1}" data-broker-drawer="${Number(profile.userId)}" hidden>${brokerApplicationDetails(profile, config)}${brokerReviewControls(profile)}</form></article>`;
  }

  function renderBrokerProfiles(profiles, config = window.SFC_APP_CONFIG || {}) {
    const items = Array.isArray(profiles) ? profiles : [];
    const pending = items.filter(profile => profile.applicationStatus === 'pending_review');
    const reviewed = items.filter(profile => ['verified', 'corrections_requested', 'rejected', 'blocked', 'suspended'].includes(profile.applicationStatus));
    const pendingSection = pending.length ? pending.map(profile => renderPendingBrokerCard(profile, config)).join('') : '<p class="city-empty">No broker applications are awaiting review.</p>';
    return `${pendingSection}${reviewed.length ? `<h3 class="tw-mb-4 tw-mt-7 tw-text-lg tw-font-semibold">Previously reviewed applications (${reviewed.length})</h3>${reviewed.map(profile => renderReviewedBrokerCard(profile, config)).join('')}` : ''}`;
  }
  window.SFCAdminOverview = { renderOverview, renderBrokerProfiles, renderPendingBrokerCard, renderReviewedBrokerCard };

  document.addEventListener('error', (event) => {
    if (event.target.matches?.('[data-broker-avatar-image]')) event.target.hidden = true;
    if (event.target.matches?.('[data-private-broker-image]')) {
      const message = document.createElement('p');
      message.className = 'tw-text-xs tw-text-[#9e1b22]';
      message.textContent = 'This private image could not be loaded. Reload or check your reviewer access.';
      event.target.replaceWith(message);
    }
  }, true);

  document.addEventListener('click', (event) => {
    const toggleBtn = event.target.closest('[data-toggle-broker-details], [data-reverify-broker]');
    if (!toggleBtn) return;
    const userId = toggleBtn.dataset.toggleBrokerDetails || toggleBtn.dataset.reverifyBroker;
    const drawer = document.querySelector(`[data-broker-drawer="${userId}"]`);
    if (drawer) {
      drawer.hidden = !drawer.hidden;
      toggleBtn.setAttribute('aria-expanded', String(!drawer.hidden));
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
