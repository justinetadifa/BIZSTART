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

  function brokerForm(profile) {
    const name = profile.legalName || profile.userName || 'Broker';
    const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] || '').join('').toUpperCase();
    const verified = profile.applicationStatus === 'verified';
    const stateColor = verified ? 'tw-bg-emerald-50 tw-text-emerald-700' : profile.applicationStatus === 'pending_review' ? 'tw-bg-amber-50 tw-text-amber-800' : 'tw-bg-red-50 tw-text-[#9e1b22]';
    return `<form class="city-broker-card tw-grid tw-min-w-0 tw-gap-5 tw-border-slate-100 tw-py-5 first:tw-border-0 md:tw-grid-cols-[1fr_1fr]" data-broker-review="${Number(profile.userId)}"><div class="tw-flex tw-min-w-0 tw-items-start tw-gap-3"><span class="tw-flex tw-h-11 tw-w-11 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-slate-100 tw-text-sm tw-font-semibold tw-text-ink">${escape(initials)}</span><div class="tw-min-w-0"><div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2"><h3 class="tw-m-0 tw-break-words tw-text-sm tw-font-semibold tw-text-ink">${escape(name)}</h3><span class="tw-rounded-md tw-px-2 tw-py-1 tw-text-[9px] tw-font-medium ${stateColor}">${escape(labels[profile.applicationStatus] || profile.applicationStatus)}</span></div><dl class="tw-mb-0 tw-mt-3 tw-space-y-2 tw-text-[11px] tw-leading-relaxed tw-text-slate-500"><div><dt class="tw-sr-only">Email</dt><dd class="tw-m-0 tw-break-all">${escape(profile.email || profile.userEmail || 'Email not provided')}</dd></div><div><dt class="tw-sr-only">Contact number</dt><dd class="tw-m-0">${escape(profile.phone || 'Contact number not provided')}</dd></div><div><dt class="tw-sr-only">Address</dt><dd class="tw-m-0 tw-break-words">${escape([profile.addressLine, profile.barangay, profile.city].filter(Boolean).join(', ') || 'Address not provided')}</dd></div><div><dt class="tw-inline tw-font-medium tw-text-ink">PRC </dt><dd class="tw-m-0 tw-inline tw-break-words">${escape(profile.prcRegistrationNo || 'Not provided')}</dd></div><div><dt class="tw-inline">Valid until </dt><dd class="tw-m-0 tw-inline">${escape(profile.prcValidUntil || 'Not provided')}</dd></div></dl>${profile.reviewNotes ? `<p class="tw-mb-0 tw-mt-3 tw-break-words tw-text-[11px] tw-leading-relaxed tw-text-slate-500">Last review: ${escape(profile.reviewNotes)}</p>` : ''}</div></div><div class="tw-min-w-0 tw-border-t tw-border-slate-100 tw-pt-4 md:tw-border-t-0 md:tw-border-l md:tw-pl-5 md:tw-pt-0"><label class="city-broker-check tw-m-0 tw-text-xs tw-text-ink"><input type="checkbox" name="prcChecked" class="tw-shrink-0">PRC registration checked</label><label class="tw-mt-3 tw-block tw-text-[11px] tw-font-medium tw-text-slate-500">Review message <span class="tw-font-normal">(required)</span><textarea class="tw-mt-2 tw-min-h-[68px] tw-text-xs" name="reviewNotes" placeholder="Message to the broker" rows="2" maxlength="3000" required></textarea></label><div class="tw-mt-3 tw-flex tw-flex-wrap tw-justify-end tw-gap-2"><button type="submit" name="decision" value="${verified ? 'suspended' : 'rejected'}" class="city-button city-button-secondary tw-min-h-[40px] tw-px-4 tw-py-2 tw-text-xs">${verified ? 'Suspend' : 'Decline'}</button><button type="submit" name="decision" value="verified" class="city-button tw-min-h-[40px] tw-px-4 tw-py-2 tw-text-xs">${verified ? 'Confirm' : 'Validate'}</button></div><p class="city-form-message tw-mt-2 tw-min-h-0 empty:tw-hidden" data-broker-message role="status"></p></div></form>`;
  }

  function renderBrokerProfiles(profiles) {
    const items = Array.isArray(profiles) ? profiles : [];
    const pending = items.filter((profile) => profile.applicationStatus === 'pending_review');
    const reviewed = items.filter((profile) => ['verified', 'rejected', 'suspended'].includes(profile.applicationStatus));
    const queue = pending.length ? pending.map(brokerForm).join('') : '<p class="tw-m-0 tw-py-5 tw-text-xs tw-leading-relaxed tw-text-slate-500">No broker applications are awaiting review.</p>';
    return queue + (reviewed.length ? `<details class="tw-mt-3 tw-border-t tw-border-slate-100 tw-pt-3"><summary class="tw-cursor-pointer tw-text-xs tw-text-slate-500">Previously reviewed brokers (${reviewed.length})</summary><div class="tw-mt-2">${reviewed.map(brokerForm).join('')}</div></details>` : '');
  }

  window.SFCAdminOverview = { renderOverview, renderBrokerProfiles };
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
