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
      review: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
      published: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
      evidence: '<path d="M12 3 3 7v6c0 4 5 7 9 9 4-2 9-5 9-9V7l-9-4Z"/><path d="M12 8v5M12 17h.01"/>',
    };
    return `<svg class="tw-h-5 tw-w-5 sm:tw-h-6 sm:tw-w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.properties}</svg>`;
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
    
    // Status Cards: Thick, heavily rounded 3D-like panels with vibrant filled circular badges
    const stats = [
      ['All properties', items.length, 'Across the city catalog', 'properties', 'tw-border tw-border-blue-300/40 tw-bg-blue-50 tw-text-blue-600', false],
      ['Awaiting review', pending.length, pending.length ? 'Ready for a city decision' : 'No pending listing decisions', 'review', 'tw-border tw-border-amber-300/60 tw-bg-amber-50 tw-text-amber-600', true],
      ['Published', published.length, 'Visible to investors', 'published', 'tw-border tw-border-emerald-300/40 tw-bg-emerald-50 tw-text-emerald-600', false],
      ['Needs site evidence', missingEvidence.length, missingEvidence.length ? 'Awaiting site verification' : 'Site verification up to date', 'evidence', 'tw-border tw-border-rose-300/40 tw-bg-rose-50 tw-text-[#9E1B22]', false],
    ];
    
    root.querySelector('[data-city-stats]').innerHTML = stats.map(([label, value, description, symbol, badgeStyle, isHighlight]) => `
      <article class="tw-flex tw-min-w-0 tw-items-center tw-gap-4 tw-rounded-[28px] ${isHighlight ? 'tw-bg-[#FFFCF6] tw-border-[2.5px] tw-border-[#E8D196] tw-shadow-[0_10px_26px_rgba(232,209,150,0.22)]' : 'tw-bg-white tw-border tw-border-slate-100 tw-shadow-[0_10px_26px_rgba(17,34,77,0.06)]'} tw-p-5 sm:tw-p-6 tw-transition-all hover:tw-translate-y-[-2px] hover:tw-shadow-xl">
        <span class="tw-flex tw-h-12 tw-w-12 sm:tw-h-14 sm:tw-w-14 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full ${badgeStyle} tw-shadow-sm">${icon(symbol)}</span>
        <div class="tw-min-w-0">
          <span class="tw-block tw-text-xs sm:tw-text-[13px] tw-font-semibold tw-text-slate-600">${label}</span>
          <strong class="tw-mt-0.5 tw-block tw-text-[32px] sm:tw-text-[36px] tw-font-black tw-leading-tight tw-tracking-tight tw-text-slate-900" data-overview-stat="${symbol}">${number(value)}</strong>
          <span class="tw-mt-0.5 tw-block tw-text-[11px] ${isHighlight ? 'tw-text-[#B45309] tw-font-semibold' : 'tw-text-slate-400'}">${description}</span>
        </div>
      </article>`).join('');

    const queue = governance ? pending : items.filter((property) => !property.assessmentComplete && property.approvalState !== 'archived');
    
    // Listing Reviews: Inset smooth gray capsules, extremely rounded thumbnails, pill buttons
    root.querySelector('[data-overview-listings]').innerHTML = queue.length
      ? queue.slice(0, 3).map((property) => `
        <article class="tw-flex tw-items-center tw-justify-between tw-gap-3.5 tw-rounded-[22px] tw-bg-[#EEF1F6] tw-p-3 sm:tw-p-4 tw-mb-3 hover:tw-bg-[#E5EAEF] tw-transition-all">
          <div class="tw-flex tw-items-center tw-gap-3.5 tw-min-w-0">
            <img class="tw-h-16 tw-w-16 sm:tw-h-[68px] sm:tw-w-[68px] tw-rounded-[18px] tw-object-cover tw-shadow-sm tw-shrink-0" src="${escape(imageUrl(property.imageUrl, config))}" alt="" loading="lazy">
            <div class="tw-min-w-0">
              <h3 class="tw-m-0 tw-truncate tw-text-xs sm:tw-text-sm tw-font-bold tw-text-slate-900">
                <a class="tw-text-slate-900 tw-no-underline hover:tw-text-[#9e1b22] tw-transition-colors" href="${escape(path(`property-details.php?id=${encodeURIComponent(property.id)}`, config))}">${escape(cleanTitle(property.name))}</a>
              </h3>
              <p class="tw-mb-0 tw-mt-0.5 tw-text-[11px] sm:tw-text-xs tw-text-slate-500">${escape(property.barangay || 'San Fernando')} - ${number(Number(property.area) * 10000)} m²</p>
              <span class="tw-mt-1.5 tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-[#FEF3C7] tw-px-3 tw-py-0.5 tw-text-[10px] sm:tw-text-[11px] tw-font-bold tw-text-[#92400E]">
                <span class="tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-amber-500"></span>
                ${governance ? 'Awaiting review' : 'Source scores pending'}
              </span>
            </div>
          </div>
          <a class="tw-inline-flex tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-slate-200/90 tw-bg-white tw-px-5 tw-py-2 tw-text-xs tw-font-bold tw-text-slate-800 tw-shadow-sm hover:tw-bg-slate-50 hover:tw-shadow active:tw-scale-[0.98] tw-transition-all tw-shrink-0 tw-no-underline" href="${escape(path(`admin-properties.php?${governance ? 'review' : 'edit'}=${encodeURIComponent(property.id)}`, config))}">${governance ? 'Review' : 'Update'} &rarr;</a>
        </article>`).join('')
      : '<div class="tw-flex tw-min-h-[180px] tw-flex-col tw-items-center tw-justify-center tw-gap-3 tw-p-4 tw-text-center"><span class="tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-full tw-bg-emerald-50 tw-text-emerald-700">' + icon('published') + '</span><strong class="tw-text-sm tw-font-bold tw-text-ink">All caught up.</strong><p class="tw-m-0 tw-text-xs tw-leading-relaxed tw-text-slate-500">' + (governance ? 'New submissions will appear here for review.' : 'No properties are awaiting assessment.') + '</p></div>';

    const ranked = published.filter((property) => validScore(property.mceScore) && validScore(property.iaiScore))
      .sort((left, right) => Number(right.iaiScore) - Number(left.iaiScore) || Number(right.mceScore) - Number(left.mceScore) || Number(left.id) - Number(right.id)).slice(0, 5);
    const chart = root.querySelector('[data-assessment-ranking]');
    if (!ranked.length) {
      chart.innerHTML = '<div class="tw-flex tw-min-h-[180px] tw-flex-col tw-items-center tw-justify-center tw-gap-3 tw-rounded-2xl tw-bg-slate-50 tw-p-4 tw-text-center"><strong class="tw-text-sm tw-font-semibold tw-text-ink">Scores will appear here.</strong><p class="tw-m-0 tw-max-w-xs tw-text-xs tw-leading-relaxed tw-text-slate-500">MCE and IAI appear once all seven criteria have source-backed scores.</p></div>';
      return;
    }
    
    // MCE & IAI Connected Benchmark Range Plot (Dumbbell Plot)
    const allScores = ranked.flatMap((p) => [Number(p.mceScore), Number(p.iaiScore)]).filter((n) => !isNaN(n));
    const rawMin = allScores.length ? Math.min(...allScores) : 80;
    const domainMin = Math.max(0, Math.min(80, Math.floor((rawMin - 2) / 10) * 10));
    const domainMax = 100;
    const domainRange = domainMax - domainMin;
    const pct = (val) => Math.max(0, Math.min(100, ((Number(val) - domainMin) / domainRange) * 100));
    const tickStep = domainRange / 4;
    const ticks = [0, 1, 2, 3, 4].map((i) => Math.round(domainMin + i * tickStep));

    const dumbbellRows = ranked.map((property, index) => {
      const mce = Number(property.mceScore);
      const iai = Number(property.iaiScore);
      const valMce = score(mce);
      const valIai = score(iai);
      const posMce = pct(mce);
      const posIai = pct(iai);
      const minPos = Math.min(posMce, posIai);
      const maxPos = Math.max(posMce, posIai);
      const delta = Math.round((iai - mce) * 10) / 10;
      const deltaFormatted = delta > 0 ? `+${delta.toFixed(1)}` : delta < 0 ? `${delta.toFixed(1)}` : '0.0';
      const deltaBadge = delta > 0
        ? `<span class="tw-inline-flex tw-items-center tw-rounded-full tw-bg-emerald-50 tw-border tw-border-emerald-200/70 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-emerald-700" title="Investment priority +${delta.toFixed(1)} above site suitability">+${delta.toFixed(1)}</span>`
        : delta < 0
        ? `<span class="tw-inline-flex tw-items-center tw-rounded-full tw-bg-rose-50 tw-border tw-border-rose-200/70 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-[#9E1B22]" title="Investment priority ${delta.toFixed(1)} below site suitability">${delta.toFixed(1)}</span>`
        : `<span class="tw-inline-flex tw-items-center tw-rounded-full tw-bg-slate-50 tw-border tw-border-slate-200/70 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-semibold tw-text-slate-500" title="Equal score">0.0</span>`;

      return `<div class="tw-group tw-flex tw-items-center tw-gap-3 tw-py-3 tw-border-b tw-border-slate-100/70 last:tw-border-0 hover:tw-bg-slate-50/70 tw-rounded-xl tw-px-1.5 -tw-mx-1.5 tw-transition-colors" data-property-id="${Number(property.id)}">
        <!-- Rank & Property Name (Full, legible) -->
        <div class="tw-flex tw-items-center tw-gap-2.5 tw-w-32 sm:tw-w-44 lg:tw-w-48 tw-shrink-0 tw-min-w-0">
          <span class="tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-slate-100 tw-text-[10px] tw-font-black tw-text-slate-600">#${index + 1}</span>
          <div class="tw-min-w-0">
            <a href="${escape(path(`property-details.php?id=${encodeURIComponent(property.id)}`, config))}" class="tw-block tw-truncate tw-text-xs tw-font-bold tw-text-slate-900 hover:tw-text-[#9E1B22] tw-no-underline" title="${escape(property.name)}">
              ${escape(cleanTitle(property.name))}
            </a>
            <span class="tw-block tw-truncate tw-text-[10px] tw-text-slate-400">${escape(property.barangay || 'San Fernando')}</span>
          </div>
        </div>

        <!-- Dumbbell Connected Plot Track -->
        <div class="tw-relative tw-flex-1 tw-h-6 tw-flex tw-items-center tw-mx-2">
          <!-- Background vertical tick guides -->
          <div class="tw-pointer-events-none tw-absolute tw-inset-x-0 tw-inset-y-0 tw-flex tw-justify-between">
            <span class="tw-h-full tw-w-px tw-bg-slate-100"></span>
            <span class="tw-h-full tw-w-px tw-bg-slate-100"></span>
            <span class="tw-h-full tw-w-px tw-bg-slate-100"></span>
            <span class="tw-h-full tw-w-px tw-bg-slate-100"></span>
            <span class="tw-h-full tw-w-px tw-bg-slate-100"></span>
          </div>

          <!-- Base horizontal track line -->
          <div class="tw-absolute tw-inset-x-0 tw-top-1/2 tw-h-1 -tw-translate-y-1/2 tw-rounded-full tw-bg-slate-200/90"></div>

          <!-- Connecting barbell bridge -->
          <div class="tw-absolute tw-top-1/2 tw-h-1.5 -tw-translate-y-1/2 tw-rounded-full tw-shadow-sm ${delta >= 0 ? 'tw-bg-gradient-to-r tw-from-[#A32635] tw-to-emerald-500' : 'tw-bg-gradient-to-r tw-from-[#F3A6B0] tw-to-[#A32635]'}" style="left: ${minPos}%; width: max(3px, ${maxPos - minPos}%);"></div>

          <!-- MCE Dot (Deep Red) -->
          <div class="tw-group/dot tw-absolute tw-top-1/2 -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10" style="left: ${posMce}%;" data-overview-score="mceScore" data-score="${valMce}">
            <span class="tw-block tw-h-3.5 tw-w-3.5 tw-rounded-full tw-bg-[#A32635] tw-ring-2 tw-ring-white tw-shadow-sm group-hover/dot:tw-scale-125 tw-transition-transform tw-cursor-pointer" title="${escape(property.name)}: MCE ${valMce}"></span>
          </div>

          <!-- IAI Dot (Blush) -->
          <div class="tw-group/dot tw-absolute tw-top-1/2 -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10" style="left: ${posIai}%;" data-overview-score="iaiScore" data-score="${valIai}">
            <span class="tw-block tw-h-3.5 tw-w-3.5 tw-rounded-full tw-bg-[#F3A6B0] tw-ring-2 tw-ring-white tw-shadow-sm group-hover/dot:tw-scale-125 tw-transition-transform tw-cursor-pointer" title="${escape(property.name)}: IAI ${valIai}"></span>
          </div>
        </div>

        <!-- Scores and Delta Pill -->
        <div class="tw-w-28 sm:tw-w-32 tw-shrink-0 tw-flex tw-items-center tw-justify-end tw-gap-2">
          <div class="tw-text-right">
            <span class="tw-text-xs tw-font-bold tw-text-[#A32635]">${valMce}</span>
            <span class="tw-text-[11px] tw-font-medium tw-text-slate-300">/</span>
            <span class="tw-text-xs tw-font-bold tw-text-[#881337]">${valIai}</span>
          </div>
          ${deltaBadge}
        </div>
      </div>`;
    }).join('');

    chart.innerHTML = `<figure class="tw-m-0" aria-label="MCE and IAI connected range plot for top ${ranked.length} properties">
      <!-- Legend & Domain Indicator -->
      <div class="tw-mb-3 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2 tw-text-[11px] tw-font-semibold tw-text-slate-500">
        <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-slate-100 tw-px-2.5 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-slate-600">
          Scale: ${domainMin}–100
        </span>
        <div class="tw-flex tw-items-center tw-gap-3.5 sm:tw-gap-4">
          <span class="tw-flex tw-items-center tw-gap-1.5"><span class="tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-[#A32635]"></span>MCE (Site)</span>
          <span class="tw-flex tw-items-center tw-gap-1.5"><span class="tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-[#F3A6B0]"></span>IAI (Investment)</span>
          <span class="tw-flex tw-items-center tw-gap-1"><span class="tw-inline-block tw-h-1 tw-w-2.5 tw-rounded-full tw-bg-slate-300"></span>Gap (&Delta;)</span>
        </div>
      </div>

      <!-- Axis Ticks Header -->
      <div class="tw-flex tw-items-center tw-gap-3 tw-pb-1.5 tw-border-b tw-border-slate-100 tw-text-[10px] tw-font-bold tw-text-slate-400">
        <div class="tw-w-32 sm:tw-w-44 lg:tw-w-48 tw-shrink-0 tw-truncate">PROPERTY (#RANK)</div>
        <div class="tw-flex-1 tw-flex tw-items-center tw-justify-between tw-mx-2">
          ${ticks.map((t) => `<span>${t}</span>`).join('')}
        </div>
        <div class="tw-w-28 sm:tw-w-32 tw-shrink-0 tw-text-right">MCE / IAI &middot; &Delta;</div>
      </div>

      <!-- Dumbbell Rows -->
      <div class="tw-divide-y tw-divide-slate-100/60">
        ${dumbbellRows}
      </div>

      <!-- Footer Caption & Link -->
      <div class="tw-mt-4 tw-flex tw-items-center tw-justify-between tw-flex-wrap tw-gap-2 pt-2 border-t border-slate-100">
        <figcaption class="tw-text-[11px] tw-text-slate-400">Scores out of 100 · ordered by IAI score</figcaption>
        <a href="${escape(path('property-ranking.php', config))}" class="tw-text-[11px] tw-font-bold tw-text-[#9e1b22] hover:tw-underline">&#9658; View exact scores</a>
      </div>
    </figure>
    <details class="tw-mt-3 tw-text-[11px] tw-text-slate-500">
      <summary class="tw-cursor-pointer tw-font-semibold hover:tw-text-[#9e1b22] tw-transition-colors">Detailed Score Table</summary>
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
