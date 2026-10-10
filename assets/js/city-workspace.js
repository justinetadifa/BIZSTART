import { listingPurposeLabel, listingPriceLabel, listingPriceEntries, salePricePerSqm, compareSalePrices } from './utils.js';
import { api } from './api.js';
import { evaluationMarkup, setupInvestmentEvaluation } from './investment-evaluation.js';
import { propertyDetailsMarkup, setupPropertyDetailsPrint, propertyHazardSummary, propertyLocationLabel } from './property-details-view.js';
import { initBusinessOpportunities } from './business-opportunities.js';

const config = window.SFC_APP_CONFIG || {};
const page = document.body.dataset.page;
const role = config.role || 'guest';
const investor = role === 'investor';
const usesInvestorView = investor || role === 'guest';
const advancedView = () => !usesInvestorView || (window.SFCInvestorView?.get() || document.documentElement.dataset.investorView || 'basic') === 'advanced';
const isLoggedIn = Boolean(config.user && role !== 'guest');
const params = new URLSearchParams(location.search);
const path = route => `${config.basePath || ''}/${route}`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number = value => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(Number(value) || 0);
const money = value => `₱${number(value)}`;
const score = value => value == null ? '—' : `${number(value)}/100`;
const hasArea = property => Number.isFinite(Number(property.area)) && Number(property.area) > 0;
const areaText = property => hasArea(property) ? `${number(property.area)} ha` : 'Area not provided';
const pricePerSqmText = property => property.listingPurpose === "lease" ? "Not offered" : salePricePerSqm(property) === null ? "Price on request" : money(salePricePerSqm(property));
const hasCoordinates = item => item && item.lat != null && item.lng != null
  && String(item.lat).trim() !== '' && String(item.lng).trim() !== ''
  && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng))
  && Math.abs(Number(item.lat)) <= 90 && Math.abs(Number(item.lng)) <= 180
  && !(Number(item.lat) === 0 && Number(item.lng) === 0);
const storageKey = `locus.compare:${config.basePath || ''}:${config.user?.id || 'guest'}`;
let properties = [], categories = {}, criteria = {}, saved = new Set(), compare = [], filtered = [];
let expandedCards = new Set();
let currentRankingView = 'list';
let map, markers, tileLayer;
let businessLayer;
let detailsBusinessLayer;
let floodLayer, faultLayer;
let toastTimer;
try { compare = JSON.parse(localStorage.getItem(storageKey) || '[]').filter(id => Number.isInteger(id)); } catch { compare = []; }

function toast(message) {
  document.getElementById('cityToast')?.remove();
  clearTimeout(toastTimer);
  const element = document.createElement('div');
  element.id = 'cityToast'; element.className = 'city-toast'; element.setAttribute('role', 'status'); element.textContent = message;
  document.body.append(element);
  toastTimer = setTimeout(() => element.remove(), 4200);
}

function imageUrl(property) {
  const source = String(property.imageUrl || property.imagePath || 'assets/images/landing-city.jpg');
  if (/^https?:\/\//i.test(source) || source.startsWith('/')) return source;
  return path(source);
}

function cardUtilitiesBadges(property) {
  const utils = property.utilities || {};
  const observations = property.parcel?.observations || {};
  const elec = utils.electricity || observations.electricity || 'not_verified';
  const wat = utils.water || observations.water || 'not_verified';
  const net = utils.internet || observations.internet || 'not_verified';

  const elecSources = (utils.electricity_sources?.length ? utils.electricity_sources : (elec === 'available' ? ['LUECO'] : [])).join(' · ');
  const watSources = (utils.water_sources?.length ? utils.water_sources : (wat === 'available' ? ['Metro La Union Water District'] : [])).join(' · ');
  const netProviders = (utils.internet_providers?.length ? utils.internet_providers : (net === 'available' ? ['Globe', 'PLDT'] : [])).join(' · ');
  const netTypes = utils.internet_types?.join(', ') || (net === 'available' ? 'Fiber' : '');
  const netSpeed = utils.download_speed_mbps ? ` · ${utils.download_speed_mbps} Mbps` : '';

  const items = [
    {
      name: 'Electricity',
      avail: elec === 'available',
      tooltip: `Electricity\n${elec === 'available' ? '✓ Available' : elec === 'unavailable' ? 'Unavailable' : 'Not verified'}${elecSources ? `\n${elecSources}` : ''}`
    },
    {
      name: 'Water',
      avail: wat === 'available',
      tooltip: `Water\n${wat === 'available' ? '✓ Available' : wat === 'unavailable' ? 'Unavailable' : 'Not verified'}${watSources ? `\n${watSources}` : ''}`
    },
    {
      name: 'Internet',
      avail: net === 'available',
      tooltip: `Internet\n${net === 'available' ? (netTypes ? `✓ ${netTypes} available` : '✓ Available') : net === 'unavailable' ? 'Unavailable' : 'Not verified'}${netProviders ? `\n${netProviders}${netSpeed}` : ''}`
    }
  ];

  return `
    <div class="tw-mt-2.5 tw-pt-2 tw-border-t tw-border-slate-100 tw-flex tw-items-center tw-justify-between tw-gap-1.5 tw-flex-wrap">
      <span class="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">Utilities:</span>
      <div class="tw-flex tw-items-center tw-gap-1.5 tw-flex-wrap">
        ${items.map(it => `
          <span class="tw-inline-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5 tw-rounded-full tw-text-[11px] tw-font-medium ${it.avail ? 'tw-bg-emerald-50 tw-text-emerald-700 tw-border tw-border-emerald-200/60' : 'tw-bg-slate-100 tw-text-slate-500'}" title="${esc(it.tooltip)}" style="cursor: help;">
            ${it.avail ? '<span class="tw-text-emerald-600 tw-font-bold">✓</span>' : '<span class="tw-text-slate-400">○</span>'}
            <span>${esc(it.name)}</span>
          </span>
        `).join('')}
      </div>
    </div>
  `;
}

function hazardNotice(property, isGrid = false) {
  const hs = property.hazardScreening || {};
  const flood = hs.flood || { badge: 'NOT ASSESSED', color: 'gray' };
  const fault = hs.fault || { badge: 'NOT ASSESSED', color: 'gray' };

  const badgeClasses = (color) => {
    switch (color) {
      case 'green': return 'tw-bg-emerald-50 tw-text-emerald-800 tw-border-emerald-200/80';
      case 'amber': return 'tw-bg-amber-50 tw-text-amber-800 tw-border-amber-200/80';
      case 'red': return 'tw-bg-rose-50 tw-text-rose-800 tw-border-rose-200/80';
      default: return 'tw-bg-slate-100 tw-text-slate-600 tw-border-slate-200/80';
    }
  };

  const locationNote = !hasCoordinates(property) ? 'Map location has not been recorded.'
    : propertyLocationLabel(property) === 'Approximate location' ? 'Approximate map pin · confirm the parcel location.' : '';

  const intersectNotice = flood.badge === 'HIGH' ? `<div class="tw-text-[10.5px] tw-text-rose-700 tw-mt-1.5 tw-pt-1 tw-border-t tw-border-rose-100">Property intersects a mapped high flood-susceptibility zone.</div>` : '';

  const marginClass = isGrid ? 'tw-mx-3 tw-my-2.5' : 'tw-my-2.5';

  return `
    ${locationNote ? `<p class="${isGrid ? 'tw-mx-3' : ''} tw-mt-2.5 tw-mb-0 tw-text-xs tw-text-slate-500">${esc(locationNote)}</p>` : ''}
    <div class="${marginClass} tw-p-2.5 tw-rounded-2xl tw-bg-slate-50/90 tw-border tw-border-slate-200/80">
      <div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
        <div class="tw-flex tw-items-center tw-gap-1.5 tw-text-[11px] tw-font-semibold tw-text-slate-600">
          <svg class="tw-w-3.5 tw-h-3.5 tw-text-slate-500 tw-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Hazards & environment</span>
        </div>
        <div class="tw-flex tw-items-center tw-gap-1.5 tw-flex-wrap tw-justify-end">
          <span class="tw-inline-flex tw-items-center tw-px-2.5 tw-py-0.5 tw-rounded-full tw-text-[10px] tw-font-bold tw-border ${badgeClasses(flood.color)}" title="Flood: ${esc(flood.badge)}">
            Flood: ${esc(flood.badge)}
          </span>
          <span class="tw-inline-flex tw-items-center tw-px-2.5 tw-py-0.5 tw-rounded-full tw-text-[10px] tw-font-bold tw-border ${badgeClasses(fault.color)}" title="Fault: ${esc(fault.proximity || fault.badge)}">
            Fault: ${esc(fault.proximity || fault.badge)}
          </span>
        </div>
      </div>
      ${intersectNotice}
    </div>
  `;
}

function synchronizeInvestorSort(announce = false) {
  const select = document.getElementById('citySort');
  if (!select) return;
  const advanced = advancedView();
  let changed = false;
  if (!advanced && ['iai', 'mce'].includes(select.value)) {
    select.value = 'newest';
    changed = true;
  }
  select.querySelectorAll('[data-investor-advanced-sort]').forEach(option => {
    option.disabled = !advanced;
    option.hidden = !advanced;
  });
  const note = document.getElementById('cityViewSortNote');
  if (note) {
    note.hidden = !changed || !announce;
    note.textContent = changed ? 'Now sorted by newest. Assessment sorting is available in Advanced view.' : '';
  }
}

function card(property, index) {
  const isExpanded = expandedCards.has(property.id);

  if (page === 'city-explorer') {
    const mceVal = (property.mceScore != null && property.assessmentComplete) ? score(property.mceScore) : 'Assessment incomplete';
    const iaiVal = (property.iaiScore != null && property.assessmentComplete) ? score(property.iaiScore) : 'Assessment incomplete';
    const clupVal = property.clupProfile?.zoningClassification || 'Awaiting zoning review';
    const descText = property.description || property.thesis || `Review the listing and verified site information for this ${property.category?.toLowerCase() || 'property'} in ${property.barangay || property.city || 'San Fernando'}.`;
    const locationLabel = `${property.barangay ? `${property.barangay}, ` : ''}${property.city || 'San Fernando'}${property.province ? `, ${property.province}` : ', La Union'}`;

    return `<article class="city-property-card locus-property-card tw-group tw-relative tw-bg-white tw-rounded-[22px] tw-border tw-border-slate-200/80 tw-shadow-sm hover:tw-shadow-xl tw-overflow-hidden ${isExpanded ? 'is-expanded' : ''}" data-property-id="${property.id}">
      <!-- Media / Satellite Image Container -->
      <div class="tw-relative tw-h-[220px] sm:tw-h-[235px] tw-w-full tw-overflow-hidden tw-bg-slate-100">
        <img class="tw-h-full tw-w-full tw-object-cover tw-transition-transform tw-duration-500 group-hover:tw-scale-105" src="${esc(imageUrl(property))}" alt="${esc(property.name)}" loading="lazy">

        <!-- Top-left: ● Available Badge & Authority to Sell -->
        <div class="tw-absolute tw-left-3 tw-top-3 tw-z-10 tw-flex tw-flex-col tw-gap-1.5">
          <div class="tw-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-white/95 tw-backdrop-blur-md tw-px-2.5 tw-py-1 tw-shadow-sm tw-border tw-border-white/60">
            <span class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-emerald-500 tw-inline-block"></span>
            <span class="tw-text-xs tw-font-semibold tw-text-slate-800">${esc(property.status || 'Available')}</span><span class="tw-text-xs tw-font-semibold tw-text-slate-800">${esc(listingPurposeLabel(property))}</span>
          </div>
          ${property.authorityToSellVerified ? `
          <div class="tw-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-emerald-50/95 tw-backdrop-blur-md tw-px-2.5 tw-py-0.5 tw-shadow-sm tw-border tw-border-emerald-200">
            <span class="tw-text-[10.5px] tw-font-bold tw-text-emerald-800">Authority to Sell ✓ Verified</span>
          </div>` : ''}
        </div>

        <!-- Top-right: Circle Toggle Button -->
        <button type="button" class="locus-card-toggle tw-absolute tw-right-3 tw-top-3 tw-z-10 tw-w-8 tw-h-8 tw-rounded-full tw-bg-white/95 tw-backdrop-blur-md tw-shadow-sm tw-border tw-border-white/60 tw-flex tw-items-center tw-justify-center tw-text-slate-700 hover:tw-bg-white hover:tw-scale-105 tw-transition-all tw-cursor-pointer" data-toggle-card="${property.id}" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-label="Toggle details">
          <svg class="locus-card-toggle-icon tw-w-4 tw-h-4 tw-transition-transform tw-duration-300 ${isExpanded ? 'tw-rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Floating Frosted Glass Panel -->
        <div class="locus-card-glass tw-absolute tw-inset-x-2.5 tw-bottom-2.5 tw-z-10 tw-p-3">
          <div>
            <span class="tw-inline-flex tw-items-center tw-px-2 tw-py-0.5 tw-rounded-md tw-text-[11px] tw-font-semibold tw-bg-rose-50 tw-text-[#9E1B22] tw-border tw-border-rose-100/60">
              ${esc(property.subcategory || property.category || property.type || 'Commercial')}
            </span>
            <h3 class="tw-mt-1 tw-mb-0.5 tw-text-sm sm:tw-text-[15px] tw-font-bold tw-text-slate-900 tw-leading-tight tw-truncate">
              <a href="${path(`property-details.php?id=${property.id}`)}" class="tw-block tw-max-w-full tw-truncate hover:tw-text-[#9E1B22] tw-transition-colors">
                ${esc(property.name)}
              </a>
            </h3>
            <div class="tw-flex tw-items-center tw-gap-1 tw-text-xs tw-font-medium tw-text-slate-500">
              <svg class="tw-w-3.5 tw-h-3.5 tw-text-[#9E1B22] tw-flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="tw-truncate">${esc(locationLabel)}</span>
            </div>
          </div>

          <div class="tw-flex tw-items-baseline tw-justify-between tw-mt-2 tw-pt-1.5 tw-border-t tw-border-slate-900/5">
            <strong class="tw-text-lg sm:tw-text-xl tw-font-extrabold tw-text-slate-900 tw-tracking-tight">
              ${esc(listingPriceLabel(property))}
            </strong>
            <span class="tw-text-xs sm:tw-text-sm tw-font-medium tw-text-slate-500">
              ${areaText(property)}
            </span>
          </div>
        </div>
      </div>

      <!-- Drop-down Drawer (Expanded Body) -->
      <div class="locus-card-drawer tw-overflow-hidden ${isExpanded ? 'is-open' : ''}" aria-hidden="${isExpanded ? 'false' : 'true'}" ${isExpanded ? '' : 'inert'}>
        <div class="locus-card-drawer-inner tw-min-h-0 tw-min-w-0">
          <div class="tw-p-3 tw-pt-2 tw-bg-white">
            <!-- 4-Column Horizontal Metric Strip -->
            <div data-investor-advanced class="tw-bg-slate-50/90 tw-rounded-xl tw-py-2 tw-px-1 tw-border tw-border-slate-100 tw-grid tw-grid-cols-4 tw-divide-x tw-divide-slate-200/60 tw-text-center">
              <!-- MCE -->
              <div class="tw-px-1">
                <span class="tw-block tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">MCE</span>
                <span class="tw-block tw-text-[11px] sm:tw-text-xs tw-font-bold tw-text-slate-700 tw-mt-0.5">${esc(mceVal)}</span>
              </div>
              <!-- IAI -->
              <div class="tw-px-1">
                <span class="tw-block tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">IAI</span>
                <span class="tw-block tw-text-[11px] sm:tw-text-xs tw-font-bold tw-text-slate-700 tw-mt-0.5">${esc(iaiVal)}</span>
              </div>
              <!-- CLUP -->
              <div class="tw-px-0.5">
                <span class="tw-block tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">CLUP</span>
                <span class="tw-block tw-text-[10px] sm:tw-text-[11px] tw-font-medium tw-text-slate-600 tw-mt-0.5 tw-break-words">${esc(clupVal)}</span>
              </div>
              <!-- City Assessment -->
              <div class="tw-px-0.5">
                <span class="tw-block tw-text-[9px] sm:tw-text-[10px] tw-font-bold tw-text-slate-400 tw-whitespace-nowrap tw-truncate">City Assessment</span>
                <span class="tw-inline-flex tw-items-center tw-justify-center tw-gap-0.5 tw-text-[10.5px] sm:tw-text-[11px] tw-font-bold ${property.assessmentComplete ? 'tw-text-emerald-600' : 'tw-text-slate-500'} tw-mt-0.5 tw-whitespace-nowrap">
                  ${property.assessmentComplete ? '<svg class="tw-w-3 tw-h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Complete' : '<svg class="tw-w-3 tw-h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 2"/></svg> Pending'}
                </span>
              </div>
            </div>

            <!-- Description -->
            <p class="tw-text-xs tw-text-slate-500 tw-leading-relaxed tw-mt-2.5 tw-mb-0 tw-line-clamp-2">
              ${esc(descText)}
            </p>

            <!-- Suitable for CLUP uses -->
            ${property.clupAllowedUses?.length ? `
            <div class="tw-mt-2.5 tw-pt-2 tw-border-t tw-border-slate-100 tw-flex tw-items-center tw-justify-between tw-text-xs">
              <span class="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">Suitable for:</span>
              <span class="tw-font-semibold tw-text-slate-700">${esc(property.clupAllowedUses.join(' · '))} ${property.clupVerifiedAt ? '<span class="tw-text-emerald-600 tw-font-bold">✓ Validated</span>' : '<span class="tw-text-slate-400 font-normal">(Pending validation)</span>'}</span>
            </div>` : ''}

            <!-- Utilities badges with hover tooltips -->
            ${cardUtilitiesBadges(property)}

            <!-- Full-width Red View details Pill Button -->
            <a href="${path(`property-details.php?id=${property.id}`)}" class="tw-w-full tw-mt-3 tw-py-2.5 tw-px-4 tw-rounded-full tw-bg-[#9E1B22] hover:tw-bg-[#80141a] tw-text-white tw-font-semibold tw-text-xs tw-flex tw-items-center tw-justify-center tw-gap-2 tw-shadow-sm hover:tw-shadow-md tw-transition-all tw-no-underline">
              <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              <span>View details</span>
            </a>
          </div>
        </div>
      </div>

      ${hazardNotice(property)}
      <!-- Secondary Action Row (Compare / On map / Shortlist) -->
      <div class="tw-p-3 ${isExpanded ? 'tw-pt-0' : 'tw-pt-3'} tw-bg-white tw-flex tw-items-center tw-gap-2">
        <button type="button" class="tw-flex-1 tw-py-2 tw-px-2 tw-rounded-xl tw-border tw-border-slate-200 hover:tw-border-slate-300 tw-bg-white hover:tw-bg-slate-50 tw-text-xs tw-font-semibold tw-text-slate-700 tw-flex tw-items-center tw-justify-center tw-gap-1.5 tw-transition-all tw-cursor-pointer" data-compare="${property.id}" aria-pressed="${compare.includes(property.id)}">
          <svg class="tw-w-3.5 tw-h-3.5 tw-text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          <span>${compare.includes(property.id) ? 'Compared' : 'Compare'}</span>
        </button>

        <button type="button" class="tw-flex-1 tw-py-2 tw-px-2 tw-rounded-xl tw-border tw-border-slate-200 hover:tw-border-slate-300 tw-bg-white hover:tw-bg-slate-50 tw-text-xs tw-font-semibold tw-text-slate-700 tw-flex tw-items-center tw-justify-center tw-gap-1.5 tw-transition-all tw-cursor-pointer" data-locate="${property.id}">
          <svg class="tw-w-3.5 tw-h-3.5 tw-text-[#9E1B22]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span>On map</span>
        </button>

        ${isExpanded ? `
        <button type="button" class="tw-flex-1 tw-py-2 tw-px-2 tw-rounded-xl tw-border tw-border-slate-200 hover:tw-border-slate-300 tw-bg-white hover:tw-bg-slate-50 tw-text-xs tw-font-semibold ${saved.has(property.id) ? 'tw-text-[#9E1B22] tw-border-rose-300 tw-bg-rose-50/50' : 'tw-text-slate-700'} tw-flex tw-items-center tw-justify-center tw-gap-1.5 tw-transition-all tw-cursor-pointer" data-save="${property.id}" aria-pressed="${saved.has(property.id)}">
          <svg class="tw-w-3.5 tw-h-3.5 ${saved.has(property.id) ? 'tw-text-[#9E1B22] tw-fill-current' : 'tw-text-slate-500'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>${saved.has(property.id) ? 'Saved' : 'Shortlist'}</span>
        </button>
        ` : `
        <button type="button" class="tw-px-3.5 tw-py-2 tw-rounded-xl tw-border tw-border-slate-200 hover:tw-border-slate-300 tw-bg-white hover:tw-bg-slate-50 tw-text-xs tw-font-semibold ${saved.has(property.id) ? 'tw-text-[#9E1B22] tw-border-rose-300 tw-bg-rose-50/50' : 'tw-text-slate-700'} tw-flex tw-items-center tw-justify-center tw-transition-all tw-cursor-pointer" data-save="${property.id}" aria-pressed="${saved.has(property.id)}" title="${saved.has(property.id) ? 'Saved' : 'Shortlist'}">
          <svg class="tw-w-3.5 tw-h-3.5 ${saved.has(property.id) ? 'tw-text-[#9E1B22] tw-fill-current' : 'tw-text-slate-500'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        `}
      </div>
    </article>`;
  }

  const accent = ({
    Land: 'tw-bg-[#fef3c7] tw-text-[#92400e] tw-border-[#fde68a]',
    Commercial: 'tw-bg-[#fef3c7] tw-text-[#92400e] tw-border-[#fde68a]',
    Office: 'tw-bg-blue-50 tw-text-blue-900 tw-border-blue-200',
    Hospitality: 'tw-bg-rose-50 tw-text-rose-900 tw-border-rose-200',
    Industrial: 'tw-bg-stone-100 tw-text-stone-700 tw-border-stone-200'
  })[property.category] || 'tw-bg-[#fef3c7] tw-text-[#92400e] tw-border-[#fde68a]';

  const mceVal = (property.mceScore != null && property.assessmentComplete) ? `${number(property.mceScore)}/100` : 'Assessment incomplete';
  const iaiVal = (property.iaiScore != null && property.assessmentComplete) ? `${number(property.iaiScore)}/100` : 'Assessment incomplete';
  const clupVal = property.clupProfile?.zoningClassification || 'Awaiting zoning review';
  const cityAssessmentVal = property.assessmentComplete ? 'Completed' : 'Pending';
  const descText = property.description || property.thesis || `A ${hasArea(property) ? `${number(property.area)}-hectare ` : ''}${property.category?.toLowerCase() || 'property'} parcel in ${property.barangay || property.city || 'San Fernando'}. Review verified site information for your proposed activity.`;

  return `<article class="city-property-card locus-property-card tw-group tw-relative tw-bg-white tw-rounded-[22px] tw-border tw-border-slate-200/80 tw-shadow-sm hover:tw-shadow-xl tw-overflow-hidden ${isExpanded ? 'is-expanded' : ''}" data-property-id="${property.id}">
    <!-- Media / Satellite Image Container -->
    <div class="tw-relative tw-h-[260px] tw-w-full tw-overflow-hidden tw-bg-slate-100">
      <img class="tw-h-full tw-w-full tw-object-cover tw-transition-transform tw-duration-500 group-hover:tw-scale-105" src="${esc(imageUrl(property))}" alt="${esc(property.name)}" loading="lazy">
      
      <!-- Top-left: ● Available Badge & Authority to Sell -->
      <div class="tw-absolute tw-left-3 tw-top-3 tw-z-10 tw-flex tw-flex-col tw-gap-1.5">
        <div class="tw-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-white/95 tw-backdrop-blur-md tw-px-3 tw-py-1 tw-shadow-sm tw-border tw-border-white/60">
          <span class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-emerald-500 tw-inline-block"></span>
          <span class="tw-text-xs tw-font-semibold tw-text-slate-800">${esc(property.status || 'Available')}</span><span class="tw-text-xs tw-font-semibold tw-text-slate-800">${esc(listingPurposeLabel(property))}</span>
        </div>
        ${property.authorityToSellVerified ? `
        <div class="tw-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-emerald-50/95 tw-backdrop-blur-md tw-px-2.5 tw-py-0.5 tw-shadow-sm tw-border tw-border-emerald-200">
          <span class="tw-text-[10.5px] tw-font-bold tw-text-emerald-800">Authority to Sell ✓ Verified</span>
        </div>` : ''}
      </div>

      <!-- Floating Frosted Glass Panel -->
      <div class="locus-card-glass tw-absolute tw-inset-x-2.5 tw-bottom-2.5 tw-z-10 tw-p-3.5">
        <div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
          <div class="tw-min-w-0 tw-flex-1">
            <span class="tw-inline-flex tw-items-center tw-px-2.5 tw-py-0.5 tw-rounded-md tw-text-[11px] tw-font-semibold tw-border ${accent}">
              ${esc(property.subcategory || property.category || property.type || 'Commercial')}
            </span>
            <h3 class="tw-mt-1.5 tw-mb-0.5 tw-text-sm sm:tw-text-[15px] tw-font-bold tw-text-slate-900 tw-leading-tight tw-truncate">
              <a href="${path(`property-details.php?id=${property.id}`)}" class="tw-block tw-max-w-full tw-truncate hover:tw-text-[#9E1B22] tw-transition-colors">
                ${esc(property.name)}
              </a>
            </h3>
            <div class="tw-flex tw-items-center tw-gap-1 tw-text-xs tw-font-medium tw-text-slate-500">
              <svg class="tw-w-3.5 tw-h-3.5 tw-text-slate-500 tw-flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="tw-truncate">${esc(property.barangay || property.city || 'San Fernando')}</span>
            </div>
          </div>

          ${isLoggedIn ? `
          <button type="button" class="locus-card-toggle tw-w-9 tw-h-9 tw-rounded-full tw-bg-white tw-shadow-md tw-flex tw-items-center tw-justify-center tw-text-slate-700 hover:tw-bg-slate-50 hover:tw-scale-110 hover:tw-shadow-lg tw-transition-all tw-flex-shrink-0 tw-border tw-border-slate-100 tw-cursor-pointer" data-toggle-card="${property.id}" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-label="Toggle details">
            <svg class="locus-card-toggle-icon tw-w-4 tw-h-4 tw-transition-transform tw-duration-300 ${isExpanded ? 'tw-rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          ` : `
          <a href="${path('investor-login.php')}" class="locus-card-toggle tw-w-9 tw-h-9 tw-rounded-full tw-bg-white tw-shadow-md tw-flex tw-items-center tw-justify-center tw-text-slate-700 hover:tw-bg-slate-50 hover:tw-scale-110 hover:tw-shadow-lg tw-transition-all tw-flex-shrink-0 tw-border tw-border-slate-100 tw-cursor-pointer" title="Log in to view assessments and details" aria-label="Log in to view assessments and details">
            <svg class="locus-card-toggle-icon tw-w-4 tw-h-4 tw-transition-transform tw-duration-300 ${isExpanded ? 'tw-rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
          `}
        </div>

        <div class="tw-flex tw-items-baseline tw-justify-between tw-mt-2.5 tw-pt-1.5 tw-border-t tw-border-slate-900/5">
          <strong class="tw-text-lg sm:tw-text-xl tw-font-bold tw-text-[#11224D] tw-tracking-tight">
            ${esc(listingPriceLabel(property))}
          </strong>
          <span class="tw-text-xs sm:tw-text-sm tw-font-medium tw-text-slate-500">
            ${areaText(property)}
          </span>
        </div>
      </div>
    </div>

    ${hazardNotice(property, true)}
    ${isLoggedIn ? `
    <!-- Drop-down Drawer (Expanded Body) -->
    <div class="locus-card-drawer tw-overflow-hidden ${isExpanded ? 'is-open' : ''}" aria-hidden="${isExpanded ? 'false' : 'true'}" ${isExpanded ? '' : 'inert'}>
      <div class="locus-card-drawer-inner tw-min-h-0 tw-min-w-0">
        <div class="tw-p-4 tw-pt-3 tw-bg-white">
          <!-- 2x2 Assessment Grid -->
          <div data-investor-advanced class="tw-grid tw-grid-cols-2 tw-gap-2.5">
            <!-- MCE -->
            <div class="tw-bg-slate-50 tw-rounded-xl tw-p-2.5 tw-flex tw-items-start tw-gap-2.5 tw-border tw-border-slate-100/90">
              <svg class="tw-w-4 tw-h-4 tw-text-slate-500 tw-flex-shrink-0 tw-mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div class="tw-min-w-0">
                <span class="tw-block tw-text-xs tw-font-bold tw-text-slate-800">MCE</span>
                <span class="tw-block tw-text-[11px] tw-text-slate-400 tw-font-medium tw-truncate">${esc(mceVal)}</span>
              </div>
            </div>

            <!-- IAI -->
            <div class="tw-bg-slate-50 tw-rounded-xl tw-p-2.5 tw-flex tw-items-start tw-gap-2.5 tw-border tw-border-slate-100/90">
              <svg class="tw-w-4 tw-h-4 tw-text-slate-500 tw-flex-shrink-0 tw-mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div class="tw-min-w-0">
                <span class="tw-block tw-text-xs tw-font-bold tw-text-slate-800">IAI</span>
                <span class="tw-block tw-text-[11px] tw-text-slate-400 tw-font-medium tw-truncate">${esc(iaiVal)}</span>
              </div>
            </div>

            <!-- CLUP Compatibility -->
            <div class="tw-bg-slate-50 tw-rounded-xl tw-p-2.5 tw-flex tw-items-start tw-gap-2.5 tw-border tw-border-slate-100/90">
              <svg class="tw-w-4 tw-h-4 tw-text-slate-500 tw-flex-shrink-0 tw-mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <div class="tw-min-w-0">
                <span class="tw-block tw-text-xs tw-font-bold tw-text-slate-800">CLUP Compatibility</span>
                <span class="tw-block tw-text-[11px] tw-text-slate-400 tw-font-medium tw-truncate">${esc(clupVal)}</span>
              </div>
            </div>

            <!-- City Assessment -->
            <div class="tw-bg-slate-50 tw-rounded-xl tw-p-2.5 tw-flex tw-items-start tw-gap-2.5 tw-border tw-border-slate-100/90">
              <svg class="tw-w-4 tw-h-4 tw-text-slate-500 tw-flex-shrink-0 tw-mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div class="tw-min-w-0">
                <span class="tw-block tw-text-xs tw-font-bold tw-text-slate-800">City Assessment</span>
                <span class="tw-block tw-text-[11px] tw-text-slate-400 tw-font-medium tw-truncate">${esc(cityAssessmentVal)}</span>
              </div>
            </div>
          </div>

          <!-- Description -->
          <p class="tw-text-xs tw-text-slate-500 tw-leading-relaxed tw-mt-3.5 tw-mb-2.5 tw-line-clamp-2">
            ${esc(descText)}
          </p>

          <!-- Suitable for CLUP uses -->
          ${property.clupAllowedUses?.length ? `
          <div class="tw-mt-2.5 tw-pt-2 tw-border-t tw-border-slate-100 tw-flex tw-items-center tw-justify-between tw-text-xs">
            <span class="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">Suitable for:</span>
            <span class="tw-font-semibold tw-text-slate-700">${esc(property.clupAllowedUses.join(' · '))} ${property.clupVerifiedAt ? '<span class="tw-text-emerald-600 tw-font-bold">✓ Validated</span>' : '<span class="tw-text-slate-400 font-normal">(Pending validation)</span>'}</span>
          </div>` : ''}

          <!-- Utilities badges with hover tooltips -->
          ${cardUtilitiesBadges(property)}

          <!-- 3 Red Pill Action Buttons -->
          <div class="tw-grid tw-grid-cols-2 tw-gap-2 tw-mt-3.5">
            <a href="${path(`property-details.php?id=${property.id}`)}" class="locus-btn-red-pill tw-col-span-2 tw-min-h-11 tw-py-2 tw-px-2.5 tw-text-xs tw-text-center tw-flex tw-items-center tw-justify-center tw-no-underline tw-whitespace-nowrap">
              View details
            </a>
            <button type="button" class="locus-btn-red-pill tw-flex-1 tw-py-2 tw-px-2.5 tw-text-xs tw-text-center tw-whitespace-nowrap" data-compare="${property.id}" aria-pressed="${compare.includes(property.id)}">
              ${compare.includes(property.id) ? 'Compared' : 'Compare'}
            </button>
            <button type="button" class="locus-btn-red-pill tw-flex-1 tw-py-2 tw-px-2.5 tw-text-xs tw-text-center tw-flex tw-items-center tw-justify-center tw-gap-1 tw-whitespace-nowrap" data-save="${property.id}" aria-pressed="${saved.has(property.id)}">
              <svg class="tw-w-3.5 tw-h-3.5" fill="${saved.has(property.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>${saved.has(property.id) ? 'Saved' : 'Shortlist'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    ` : ''}
  </article>`;
}

function saveCompare() {
  try { localStorage.setItem(storageKey, JSON.stringify(compare)); } catch {}
}

function renderTray() {
  const tray = document.getElementById('cityCompareTray');
  if (!tray) return;
  tray.hidden = compare.length === 0 || page === 'city-compare';
  document.getElementById('cityCompareCount').textContent = `${compare.length} of 3 properties selected`;
}

function cleanTitle(name) {
  return String(name || '').replace(/\s*[–-]\s*San Fernando.*$/i, '').trim();
}

function updatePriorityStats() {
  const statTotal = document.getElementById('priorityStatTotal');
  const statReview = document.getElementById('priorityStatReview');
  const statPublished = document.getElementById('priorityStatPublished');
  const statNeedsAssessment = document.getElementById('priorityStatNeedsAssessment');
  if (!statTotal) return;

  const total = properties.length;
  const review = properties.filter(p => p.approvalState === 'pending_review' || String(p.status).toLowerCase() === 'pending').length;
  const published = properties.filter(p => p.approvalState === 'approved' || String(p.status).toLowerCase() === 'available').length;
  const needsAssessment = properties.filter(p => !p.assessmentComplete && p.approvalState !== 'archived').length;

  statTotal.textContent = String(total);
  statReview.textContent = String(review);
  statPublished.textContent = String(published);
  statNeedsAssessment.textContent = String(needsAssessment);
}

function priorityListCard(property, idx) {
  const sort = document.getElementById('citySort')?.value || 'iai';
  const rankKey = ['iai', 'mce'].includes(sort) ? sort : null;
  const scientificRank = rankKey ? property[`${rankKey}Rank`] : null;
  const isTopRanked = scientificRank === 1;
  const ppsqm = salePricePerSqm(property);

  // Format location and eliminate duplicate city/province entries
  const locationRaw = [
    property.barangay,
    property.city || 'San Fernando',
    property.province || 'La Union'
  ].filter(Boolean).join(', ');
  const locationTokens = locationRaw.split(',').map(s => s.trim()).filter(Boolean);
  const locationSeen = new Set();
  const locationDeduped = [];
  for (const token of locationTokens) {
    const key = token.toLowerCase();
    if (!locationSeen.has(key)) {
      locationSeen.add(key);
      locationDeduped.push(token);
    }
  }
  const locationLabel = locationDeduped.join(', ') || 'San Fernando, La Union';

  const titleClean = cleanTitle(property.name);
  const isCompared = compare.includes(property.id);
  const isSaved = saved.has(property.id);

  // Status badge with truthful listing approval state (not hazard clearance)
  const rawStatus = String(property.approvalState || property.status || '').toLowerCase();
  let statusBadge = '';
  if (rawStatus === 'approved' || (property.status === 'Available' && property.assessmentComplete)) {
    statusBadge = `<span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-0.5 tw-rounded-full tw-text-[11px] tw-font-semibold tw-tracking-wide tw-bg-emerald-50 tw-text-emerald-700 tw-border tw-border-emerald-200/80" title="Listing approved by city authorities"><svg class="tw-w-3 tw-h-3 tw-text-emerald-600 tw-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg><span>Listing approved</span></span>`;
  } else if (rawStatus === 'archived') {
    statusBadge = `<span class="tw-inline-flex tw-items-center tw-px-3 tw-py-0.5 tw-rounded-full tw-text-[11px] tw-font-semibold tw-tracking-wide tw-uppercase tw-bg-slate-100 tw-text-slate-600 tw-border tw-border-slate-200/80"><span>Archived</span></span>`;
  } else if (rawStatus === 'pending_review' || rawStatus === 'pending') {
    statusBadge = `<span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-0.5 tw-rounded-full tw-text-[11px] tw-font-semibold tw-tracking-wide tw-bg-amber-50 tw-text-amber-700 tw-border tw-border-amber-200/80"><span class="tw-w-1.5 tw-h-1.5 tw-rounded-full tw-bg-amber-500 tw-shrink-0"></span><span>Pending review</span></span>`;
  } else {
    statusBadge = `<span class="tw-inline-flex tw-items-center tw-px-3 tw-py-0.5 tw-rounded-full tw-text-[11px] tw-font-semibold tw-tracking-wide tw-bg-blue-50 tw-text-blue-700 tw-border tw-border-blue-200/80"><span>For assessment</span></span>`;
  }

  // Compact rank badge replacing oversized red ranking strip
  let rankBadge = '';
  if (rankKey) {
    if (scientificRank === 1) {
      rankBadge = `<span class="locus-rank-badge locus-rank-top tw-inline-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-0.5 tw-rounded-full tw-text-[11px] tw-font-bold tw-bg-[#8B1A1A] tw-text-white tw-shadow-sm" title="Rank #1 by ${esc(rankKey.toUpperCase())}">
        <svg class="tw-w-3 tw-h-3 tw-text-amber-300 tw-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
        <span>#1</span> <span class="tw-text-[10.5px] tw-font-semibold tw-text-white/90">${esc(rankKey.toUpperCase())} rank</span>
      </span>`;
    } else if (scientificRank != null) {
      rankBadge = `<span class="locus-rank-badge tw-inline-flex tw-items-center tw-gap-1 tw-px-3 tw-py-0.5 tw-rounded-full tw-text-[11px] tw-font-semibold tw-bg-slate-100 tw-text-slate-700 tw-border tw-border-slate-200" title="Rank #${scientificRank} by ${esc(rankKey.toUpperCase())}">
        <strong class="tw-font-bold tw-text-slate-900">#${scientificRank}</strong> <span class="tw-text-[10px] tw-font-medium tw-text-slate-500">${esc(rankKey.toUpperCase())} rank</span>
      </span>`;
    } else {
      rankBadge = `<span class="locus-rank-badge tw-inline-flex tw-items-center tw-gap-1 tw-px-3 tw-py-0.5 tw-rounded-full tw-text-[11px] tw-font-medium tw-bg-slate-50 tw-text-slate-400 tw-border tw-border-slate-200/60">
        <span>—</span> <span class="tw-text-[10px]">${esc(rankKey.toUpperCase())} rank</span>
      </span>`;
    }
  }

  const metaParts = [
    property.barangay || property.city || 'San Fernando',
    property.subcategory || property.category || 'Commercial',
    areaText(property)
  ].filter(Boolean).join(' · ');

  const areaLabel = !hasArea(property) ? 'Area not provided' : Number(property.area) < 1
    ? `${number(Number(property.area) * 10000)} m² ${property.area ? `(${number(property.area)} ha)` : ''}`
    : `${number(property.area)} ha`;

  return `<article class="priority-card locus-property-card-lift tw-relative tw-bg-white tw-rounded-[24px] tw-border tw-border-slate-200/80 hover:tw-border-slate-300 tw-shadow-[0_4px_20px_-2px_rgba(17,34,77,0.04)] hover:tw-shadow-[0_12px_32px_-4px_rgba(17,34,77,0.08)] tw-overflow-hidden tw-p-4 sm:tw-p-5 tw-flex tw-flex-col xl:tw-flex-row xl:tw-items-center tw-justify-between tw-gap-4 sm:tw-gap-5 tw-transition-all tw-duration-200" data-property-id="${property.id}">
    <div class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-gap-4 sm:tw-gap-5 tw-flex-1 tw-min-w-0">
      <a href="${path(`property-details.php?id=${property.id}`)}" class="tw-block tw-shrink-0 tw-overflow-hidden tw-rounded-2xl tw-border tw-border-slate-200/60" aria-label="View ${esc(titleClean)}">
        <img src="${esc(imageUrl(property))}" alt="${esc(property.name)}" class="tw-w-full sm:tw-w-44 md:tw-w-48 tw-h-36 sm:tw-h-32 tw-object-cover tw-rounded-2xl hover:tw-scale-105 tw-transition-transform tw-duration-300" loading="lazy">
      </a>

      <div class="tw-flex-1 tw-min-w-0">
        <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          ${rankBadge}
          <span class="tw-inline-flex tw-items-center tw-px-3 tw-py-0.5 tw-rounded-full tw-text-[11px] tw-font-semibold tw-tracking-wide tw-uppercase tw-bg-slate-100 tw-text-slate-700 tw-border tw-border-slate-200/70">${esc(property.category || 'Land')}</span>
          ${statusBadge}
        </div>
        <h3 class="tw-text-base sm:tw-text-[18px] tw-font-bold tw-text-slate-900 tw-mt-2 tw-mb-0.5 tw-leading-snug" style="font-family: 'Poppins', sans-serif;">
          <a href="${path(`property-details.php?id=${property.id}`)}" class="tw-text-slate-900 hover:tw-text-[#9E1B22] tw-transition-colors tw-no-underline">${esc(titleClean)}</a>
        </h3>
        <p class="tw-text-xs sm:tw-text-sm tw-text-slate-500 tw-mt-0.5 tw-mb-2">${esc(metaParts)}</p>
        ${hazardNotice(property, false)}

        <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-x-4 tw-gap-y-1.5 tw-mt-2.5 tw-text-xs tw-text-slate-600">
          <div class="tw-flex tw-items-center tw-gap-1.5">
            <svg class="tw-w-3.5 tw-h-3.5 tw-text-slate-400 tw-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
            </svg>
            <span class="tw-text-xs tw-text-slate-500">${esc(listingPurposeLabel(property))}</span><strong class="tw-font-bold tw-text-slate-900">${esc(listingPriceLabel(property))}</strong>
            ${ppsqm !== null ? `<span class="tw-text-slate-400 tw-text-[11px]">(${money(ppsqm)}/sqm)</span>` : ''}
          </div>
          <div class="tw-flex tw-items-center tw-gap-1.5">
            <svg class="tw-w-3.5 tw-h-3.5 tw-text-slate-400 tw-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
            </svg>
            <span class="tw-text-slate-700 tw-font-medium">${esc(areaLabel)}</span>
          </div>
          <div class="tw-flex tw-items-center tw-gap-1.5">
            <svg class="tw-w-3.5 tw-h-3.5 tw-text-slate-400 tw-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span class="tw-text-slate-700">${esc(locationLabel)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="tw-flex tw-flex-wrap sm:tw-flex-nowrap tw-items-center tw-justify-between xl:tw-justify-end tw-gap-3 sm:tw-gap-4 tw-shrink-0 tw-mt-3 xl:tw-mt-0 tw-w-full xl:tw-w-auto">
      <div class="tw-flex tw-items-center tw-gap-2.5 tw-shrink-0">
        <div class="tw-w-20 sm:tw-w-22 tw-py-3 tw-px-2 tw-rounded-2xl tw-bg-slate-50 tw-border tw-border-slate-200/80 tw-text-center tw-shrink-0 tw-shadow-2xs">
          <span class="tw-block tw-text-[10px] sm:tw-text-[11px] tw-font-bold tw-text-slate-400 tw-uppercase">MCE</span>
          ${property.mceScore != null ? `
            <strong class="tw-block tw-text-xl sm:tw-text-2xl tw-font-extrabold tw-text-slate-900 tw-leading-tight tw-mt-0.5 tw-tabular-nums">${number(property.mceScore)}</strong>
            <div class="tw-w-8 tw-h-1 tw-bg-slate-700 tw-mx-auto tw-rounded-full tw-mt-1"></div>
          ` : `
            <strong class="tw-block tw-text-lg sm:tw-text-xl tw-font-bold tw-text-slate-400 tw-leading-tight tw-mt-0.5">—</strong>
            <span class="tw-block tw-text-[9px] tw-text-slate-400 tw-mt-0.5 tw-leading-tight">Awaiting assessment</span>
          `}
        </div>

        <div class="tw-w-20 sm:tw-w-22 tw-py-3 tw-px-2 tw-rounded-2xl ${property.iaiScore != null ? 'tw-bg-[#FFF7ED] tw-border tw-border-orange-200/80' : 'tw-bg-slate-50 tw-border tw-border-slate-200/80'} tw-text-center tw-shrink-0 tw-shadow-2xs">
          <span class="tw-block tw-text-[10px] sm:tw-text-[11px] tw-font-bold ${property.iaiScore != null ? 'tw-text-[#9E1B22]' : 'tw-text-slate-400'} tw-uppercase">IAI</span>
          ${property.iaiScore != null ? `
            <strong class="tw-block tw-text-xl sm:tw-text-2xl tw-font-extrabold tw-text-slate-900 tw-leading-tight tw-mt-0.5 tw-tabular-nums">${number(property.iaiScore)}</strong>
            <div class="tw-w-8 tw-h-1 tw-bg-[#9E1B22] tw-mx-auto tw-rounded-full tw-mt-1"></div>
          ` : `
            <strong class="tw-block tw-text-lg sm:tw-text-xl tw-font-bold tw-text-slate-400 tw-leading-tight tw-mt-0.5">—</strong>
            <span class="tw-block tw-text-[9px] tw-text-slate-400 tw-mt-0.5 tw-leading-tight">Awaiting assessment</span>
          `}
        </div>
      </div>

      <div class="tw-flex tw-flex-row sm:tw-flex-col tw-items-stretch sm:tw-items-end tw-gap-2.5 tw-shrink-0 tw-w-full sm:tw-w-auto">
        <a href="${path(`property-details.php?id=${property.id}`)}" class="locus-btn-primary tw-flex-1 sm:tw-flex-none tw-inline-flex tw-items-center tw-justify-center tw-gap-2 tw-py-2.5 tw-px-5 tw-rounded-full tw-bg-[#11224D] hover:tw-bg-[#1B367A] active:tw-bg-[#0A1633] tw-text-white tw-text-xs tw-font-semibold tw-no-underline tw-shadow-sm hover:tw-shadow tw-transition-all tw-cursor-pointer">
          <span>View details</span>
          <span aria-hidden="true">&rarr;</span>
        </a>

        <div class="tw-flex tw-items-center tw-gap-2">
          <button type="button" class="locus-compare-btn ${isCompared ? 'is-selected tw-bg-blue-50 tw-border-blue-300 tw-text-[#11224D] tw-font-semibold' : 'tw-bg-white hover:tw-bg-slate-50 tw-border-slate-200 hover:tw-border-slate-300 tw-text-slate-700 tw-font-medium'} tw-flex-1 sm:tw-flex-none tw-inline-flex tw-items-center tw-justify-center tw-gap-1.5 tw-py-2 tw-px-3.5 tw-rounded-full tw-border tw-text-xs tw-transition-all tw-cursor-pointer" data-compare="${property.id}" aria-pressed="${isCompared}">
            <svg class="tw-w-3.5 tw-h-3.5 ${isCompared ? 'tw-text-[#11224D]' : 'tw-text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <span>${isCompared ? 'In compare' : 'Add to compare'}</span>
          </button>

          <button type="button" class="locus-save-btn ${isSaved ? 'is-saved tw-text-[#9E1B22] tw-bg-rose-50 tw-border-rose-200' : 'tw-text-slate-400 hover:tw-text-[#9E1B22] hover:tw-bg-rose-50/50 tw-bg-white tw-border-slate-200 hover:tw-border-slate-300'} tw-w-9 tw-h-9 tw-rounded-full tw-border tw-flex tw-items-center tw-justify-center tw-cursor-pointer tw-transition-all" data-save="${property.id}" aria-pressed="${isSaved}" title="${isSaved ? 'Saved to favorites' : 'Save property'}">
            <svg class="tw-w-4 tw-h-4" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </article>`;
}

function getFiltered() {
  const query = (document.getElementById('citySearch')?.value || '').toLowerCase().trim();
  const category = document.getElementById('cityCategory')?.value || '';
  const subcategory = document.getElementById('citySubcategory')?.value || '';
  const listingPurpose = document.getElementById('cityListingPurpose')?.value || '';
  const allowedUse = document.getElementById('cityAllowedUse')?.value || '';
  const utilityFilter = document.getElementById('cityUtilities')?.value || '';
  const hazardFilter = document.getElementById('cityHazard')?.value || '';
  const savedOnly = document.getElementById('citySavedOnly')?.checked;

  const result = properties.filter(property => {
    // 1. Search query: name, barangay, city, category, or CITY-VALIDATED allowed uses
    if (query) {
      const basicMatches = `${property.name} ${property.barangay || ''} ${property.city} ${property.category || ''}`.toLowerCase().includes(query);
      let clupMatches = false;
      if (property.clupVerifiedAt && Array.isArray(property.clupAllowedUses)) {
        clupMatches = property.clupAllowedUses.some(u => String(u).toLowerCase().includes(query));
      }
      if (!basicMatches && !clupMatches) return false;
    }

    // 2. Category (8 Property Types)
    if (category && property.category !== category) return false;

    // 3. Subcategory
    if (subcategory && property.subcategory !== subcategory) return false;

    // 4. Listing Purpose
    if (listingPurpose) {
      if (listingPurpose === 'sale' && !['sale', 'sale_or_lease'].includes(property.listingPurpose)) return false;
      if (listingPurpose === 'lease' && !['lease', 'sale_or_lease'].includes(property.listingPurpose)) return false;
    }

    // 5. CLUP / Allowed Land Use (Must be city-validated)
    if (allowedUse) {
      if (!property.clupVerifiedAt) return false;
      const uses = Array.isArray(property.clupAllowedUses) ? property.clupAllowedUses : [];
      const zoning = property.clupProfile?.zoningClassification || '';
      const matched = uses.some(u => String(u).toLowerCase().includes(allowedUse.toLowerCase())) ||
        zoning.toLowerCase().includes(allowedUse.toLowerCase());
      if (!matched) return false;
    }

    // 6. Utilities
    if (utilityFilter) {
      const utils = property.utilities || {};
      const obs = property.parcel?.observations || {};
      if (utilityFilter === 'electricity') {
        const elec = utils.electricity || obs.electricity;
        if (elec !== 'available') return false;
      } else if (utilityFilter === 'water') {
        const wat = utils.water || obs.water;
        if (wat !== 'available') return false;
      } else if (utilityFilter === 'fiber') {
        const net = utils.internet || obs.internet;
        const types = utils.internet_types || [];
        if (net !== 'available' || !types.includes('Fiber')) return false;
      }
    }

    // 7. Hazard screening
    if (hazardFilter) {
      const hs = property.hazardScreening || {};
      const floodBadge = hs.flood?.badge || 'NOT ASSESSED';
      if (hazardFilter === 'low_flood' && floodBadge !== 'LOW') return false;
      if (hazardFilter === 'moderate_flood' && !['LOW', 'MODERATE'].includes(floodBadge)) return false;
    }

    // 8. Saved only
    if (savedOnly && !saved.has(property.id)) return false;

    return true;
  });

  const sort = document.getElementById('citySort')?.value || (page === 'city-ranking' && advancedView() ? 'iai' : 'newest');
  if (sort === 'iai' || sort === 'mce') result.sort((a, b) => (b[`${sort}Score`] ?? -1) - (a[`${sort}Score`] ?? -1) || a.id - b.id);
  else if (sort === 'price' || sort === 'price_asc') result.sort((a, b) => compareSalePrices(a, b));
  else if (sort === 'price_desc') result.sort((a, b) => compareSalePrices(a, b, "desc"));
  else if (sort === 'area') result.sort((a, b) => b.area - a.area);
  else if (sort === 'newest') result.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || b.id - a.id);
  return result;
}

function renderRanking() {
  const root = document.getElementById('cityRankingTable');
  if (!root) return;
  updatePriorityStats();
  const assessed = filtered.filter(p => p.assessmentComplete || p.iaiScore != null);
  const awaiting = filtered.length - assessed.length;

  const sort = document.getElementById('citySort')?.value || 'newest';
  const rankKey = ['iai', 'mce'].includes(sort) ? sort : null;
  const sortLabel = document.getElementById('citySort')?.selectedOptions[0]?.textContent || 'Newest';
  const headerHtml = `<div class="tw-mb-5 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
    <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2.5 tw-text-sm">
      <span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-3.5 tw-py-1 tw-rounded-full tw-bg-slate-900 tw-text-white tw-font-bold tw-text-xs tw-shadow-xs">
        <strong class="tw-font-bold tw-text-white">${filtered.length}</strong>
        <span class="tw-font-medium tw-text-slate-200">${filtered.length === 1 ? 'property' : 'properties'}</span>
      </span>
      <span class="tw-text-slate-500 tw-text-xs sm:tw-text-sm" data-investor-advanced>
        <span class="tw-font-medium tw-text-emerald-700 tw-bg-emerald-50 tw-px-2.5 tw-py-0.5 tw-rounded-full tw-border tw-border-emerald-200/80">${assessed.length} assessed</span>
        <span class="tw-font-medium tw-text-slate-600 tw-bg-slate-100 tw-px-2.5 tw-py-0.5 tw-rounded-full tw-border tw-border-slate-200/80 tw-ml-1">${awaiting} awaiting assessment</span>
      </span>
    </div>
    <div class="tw-flex tw-items-center tw-gap-1.5 tw-text-xs sm:tw-text-sm tw-text-slate-500">
      <span class="tw-text-slate-400">Sorted by</span>
      <span class="tw-font-semibold tw-text-slate-700 tw-bg-white tw-px-3 tw-py-1 tw-rounded-full tw-border tw-border-slate-200/80 tw-shadow-2xs">${esc(sortLabel)}</span>
    </div>
  </div>`;

  if (!filtered.length) {
    root.innerHTML = headerHtml + '<div class="city-empty">No matching properties. Try another category or barangay.</div>';
    return;
  }

  if (currentRankingView === 'grid' || !advancedView()) {
    root.innerHTML = headerHtml + `<div class="city-property-grid tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6">${filtered.map((property, idx) => card(property, idx)).join('')}</div>`;
  } else {
    root.innerHTML = headerHtml + `<div class="tw-flex tw-flex-col tw-gap-3.5 sm:tw-gap-4">${filtered.map((property, idx) => priorityListCard(property, idx)).join('')}</div>`;
  }
  if (advancedView()) root.insertAdjacentHTML('beforeend', `<p class="city-assessment-note">${rankKey ? `${esc(rankKey.toUpperCase())} ranks are the recorded scientific ranks across assessed properties; filtering may leave gaps or ties.` : 'This listing order is based on the selected sort, not an assessment rank.'} Missing scores remain pending and sort last for assessment order.</p>`);
  window.SFCInvestorView?.refresh(root);

  const methodNote = document.getElementById('cityAssessmentMethod');
  if (methodNote) methodNote.textContent = properties.find(p => p.assessmentMethod)?.assessmentMethod || 'All seven criteria must be assessed before a score or rank is shown.';
}

function renderCompare() {
  const root = document.getElementById('cityCompareMatrix');
  if (!root) return;
  const selected = compare.map(id => properties.find(property => property.id === id)).filter(Boolean);
  if (!selected.length) { root.innerHTML = `<div class="city-empty"><h3>Choose properties to compare.</h3><p>Add up to three listings from the property list.</p><a class="city-button" href="${path(investor ? 'investor-dashboard.php' : 'property-explorer.php')}">Explore properties</a></div>`; return; }
  root.innerHTML = selected.map(property => {
    const facts = [
      ['Category', property.subcategory || property.category], ['Location', [property.barangay, property.city].filter(Boolean).join(', ')],
      ['Map location', hasCoordinates(property) ? propertyLocationLabel(property) : 'Not recorded'],
      ['Listing purpose', listingPurposeLabel(property)], ['Availability', property.status],
      ...listingPriceEntries(property).map(entry => [entry.label, entry.value]), ['Area', areaText(property)],
      ['Sale price / m²', pricePerSqmText(property)], ['Zoning', property.clupProfile?.zoningClassification || 'Awaiting review'],
      ['Hazards & environment', propertyHazardSummary(property)],
    ];
    const assessments = [
      ['MCE', score(property.mceScore)], ['MCE rank', property.mceRank == null ? 'Pending' : `#${property.mceRank}`],
      ['IAI', score(property.iaiScore)], ['IAI rank', property.iaiRank == null ? 'Pending' : `#${property.iaiRank}`],
      ...Object.entries(criteria).map(([key, label]) => [label, score(property.assessmentCriteria?.[key])]),
      ['Assessment context', property.assessmentTags?.join(', ') || 'Not recorded'],
    ];
    const rows = (entries, advanced = false) => entries.map(([label, value]) => `<div${advanced ? ' data-investor-advanced' : ''}><dt>${esc(label)}</dt><dd>${esc(value ?? 'Not recorded')}</dd></div>`).join('');
    return `<article class="city-compare-column"><img src="${esc(imageUrl(property))}" alt="${esc(property.name)}"><div><h3><a href="${path(`property-details.php?id=${property.id}`)}">${esc(property.name)}</a></h3><dl>${rows(facts)}${rows(assessments, true)}</dl><div class="city-card-actions"><a href="${path(`property-details.php?id=${property.id}#propertyLocationSection`)}">View map & contact</a><button type="button" data-compare="${property.id}">Remove</button></div></div></article>`;
  }).join('');
  window.SFCInvestorView?.refresh(root);
}

function render() {
  filtered = page === 'city-landing' ? properties.slice(0, 3) : getFiltered();
  if (page === 'city-explorer' && expandedCards.size === 0 && filtered.length > 0) {
    expandedCards.add(filtered[0].id);
  }
  const grid = document.getElementById('cityPropertyGrid');
  if (grid) grid.innerHTML = filtered.length ? filtered.map((property, idx) => card(property, idx)).join('') : '<div class="city-empty">No properties match your search.</div>';
  const count = document.getElementById('cityResultsCount');
  if (count) {
    count.textContent = page === 'city-explorer'
      ? `${filtered.length} properties`
      : `${filtered.length} ${filtered.length === 1 ? 'property' : 'properties'}${role === 'guest' ? ' · public preview' : ''}`;
  }
  renderTray(); renderRanking(); renderCompare();
  window.SFCInvestorView?.refresh();
  if (map) renderMarkers();
}

function setupFilters() {
  const category = document.getElementById('cityCategory');
  const subcategory = document.getElementById('citySubcategory');
  const subcategoryWrapper = document.getElementById('citySubcategoryWrapper');
  const allowedUse = document.getElementById('cityAllowedUse');
  const listingPurpose = document.getElementById('cityListingPurpose');
  const utilities = document.getElementById('cityUtilities');
  const hazard = document.getElementById('cityHazard');

  if (category) {
    Object.keys(categories).forEach(label => category.add(new Option(label, label)));
    function updateSubcategories() {
      if (!subcategory) return;
      subcategory.innerHTML = '<option value="">All subcategories</option>';
      const subs = categories[category.value] || [];
      subs.forEach(label => subcategory.add(new Option(label, label)));
      subcategory.disabled = !(subs.length);
      if (subcategoryWrapper) {
        subcategoryWrapper.style.display = subs.length ? '' : 'none';
      }
    }
    if (Object.hasOwn(categories, params.get('category') || '')) category.value = params.get('category');
    updateSubcategories();
    category.addEventListener('change', () => { updateSubcategories(); render(); });
    subcategory?.addEventListener('change', render);
  }

  allowedUse?.addEventListener('change', render);
  listingPurpose?.addEventListener('change', render);
  utilities?.addEventListener('change', render);
  hazard?.addEventListener('change', render);

  document.getElementById('citySort')?.addEventListener('change', render);
  document.getElementById('citySearch')?.addEventListener('input', render);
  document.getElementById('cityFilters')?.addEventListener('submit', event => event.preventDefault());

  document.getElementById('cityResetFilters')?.addEventListener('click', () => {
    const search = document.getElementById('citySearch');
    const sort = document.getElementById('citySort');
    if (search) search.value = '';
    if (category) category.value = '';
    if (subcategory) {
      subcategory.value = '';
      subcategory.disabled = true;
      if (subcategoryWrapper) subcategoryWrapper.style.display = 'none';
    }
    if (allowedUse) allowedUse.value = '';
    if (listingPurpose) listingPurpose.value = '';
    if (utilities) utilities.value = '';
    if (hazard) hazard.value = '';
    if (sort) sort.value = 'newest';
    render();
  });

  const only = document.getElementById('citySavedOnly');
  if (only) { only.checked = params.get('view') === 'saved'; only.addEventListener('change', render); }
  if (page === 'city-ranking') {
    const sortEl = document.getElementById('citySort');
    if (sortEl) sortEl.value = advancedView() ? 'iai' : 'newest';

    const btnList = document.getElementById('priorityViewList');
    const btnGrid = document.getElementById('priorityViewGrid');

    const updateToggleUI = () => {
      if (!btnList || !btnGrid) return;
      if (currentRankingView === 'list') {
        btnList.className = 'tw-p-2 tw-rounded-full tw-bg-[#11224D] tw-text-white tw-border-0 tw-cursor-pointer hover:tw-opacity-90 tw-shadow-xs tw-transition-all';
        btnList.setAttribute('aria-pressed', 'true');
        btnGrid.className = 'tw-p-2 tw-rounded-full tw-bg-transparent tw-text-slate-500 hover:tw-text-slate-900 tw-border-0 tw-cursor-pointer tw-transition-all';
        btnGrid.setAttribute('aria-pressed', 'false');
      } else {
        btnGrid.className = 'tw-p-2 tw-rounded-full tw-bg-[#11224D] tw-text-white tw-border-0 tw-cursor-pointer hover:tw-opacity-90 tw-shadow-xs tw-transition-all';
        btnGrid.setAttribute('aria-pressed', 'true');
        btnList.className = 'tw-p-2 tw-rounded-full tw-bg-transparent tw-text-slate-500 hover:tw-text-slate-900 tw-border-0 tw-cursor-pointer tw-transition-all';
        btnList.setAttribute('aria-pressed', 'false');
      }
    };

    btnList?.addEventListener('click', () => {
      currentRankingView = 'list';
      updateToggleUI();
      renderRanking();
    });

    btnGrid?.addEventListener('click', () => {
      currentRankingView = 'grid';
      updateToggleUI();
      renderRanking();
    });
  }
  const heroCategory = document.getElementById('cityHeroCategory');
  if (heroCategory) {
    Object.keys(categories).forEach(label => heroCategory.add(new Option(label,label)));
    heroCategory.value = category.value;
    category.addEventListener('change', () => heroCategory.value = category.value);
    function applyHero() {
      category.value = heroCategory.value;
      document.getElementById('citySearch').value = document.getElementById('citySearchGlass').value;
      updateSubcategories(); render();
      document.getElementById('propertyResults').scrollIntoView({block:'start'});
    }
    document.getElementById('cityHeroSearch').addEventListener('submit', event => { event.preventDefault(); applyHero(); });
    document.querySelectorAll('[data-quick-category]').forEach(button => button.addEventListener('click', () => {
      heroCategory.value = button.dataset.quickCategory;
      document.querySelectorAll('[data-quick-category]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      applyHero();
    }));
  }
}

const markerMap = new Map();
let currentMapLayer = 'canvas';

function getIaiTier(scoreNum) {
  if (scoreNum == null) return { key: 'pending', label: 'Awaiting assessment', class: 'tw-bg-slate-300' };
  const s = Number(scoreNum) || 0;
  if (s >= 90) return { key: 'prime', label: 'Prime', class: 'tier-prime' };
  if (s >= 80) return { key: 'strong', label: 'Strong', class: 'tier-strong' };
  return { key: 'emerging', label: 'Emerging', class: 'tier-emerging' };
}

function createPillIcon(property, isHovered = false, isActive = false) {
  const tier = getIaiTier(property.iaiScore);
  const priceLabel = esc(listingPriceLabel(property, { compact: true }));
  const iaiScore = property.iaiScore != null ? Math.round(property.iaiScore) : null;
  const classes = ['locus-pin', isHovered ? 'is-hover' : '', isActive ? 'is-active' : ''].filter(Boolean).join(' ');

  return L.divIcon({
    className: classes,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -32],
    html: `
      <div class="pin-anchor" data-id="${property.id}">
        <div class="pin-drop">
          <div class="pin-body">
            ${advancedView() ? `<span class="pin-dot ${tier.class}" title="${property.iaiScore == null ? 'Awaiting assessment' : `${tier.label} tier (${property.iaiScore}/100)`}"></span>` : ''}
            <span class="pin-price">${priceLabel}</span>
            ${advancedView() && iaiScore != null ? `<span class="pin-iai-badge">${iaiScore}</span>` : ''}
            ${propertyLocationLabel(property) === 'Approximate location' ? '<span class="pin-location-note" title="Approximate location">≈</span>' : ''}
          </div>
          <span class="pin-caret"></span>
        </div>
      </div>
    `
  });
}

function createClusterIcon(cluster) {
  const children = cluster.getAllChildMarkers();
  const count = children.length;
  const scores = children.map(m => m.propertyData?.iaiScore).filter(s => s != null && Number.isFinite(Number(s)));
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const isPrime = advancedView() && avg != null && avg >= 90;

  return L.divIcon({
    className: 'locus-cluster',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
    html: `
      <div class="cluster-badge ${isPrime ? 'is-prime' : ''}">
        <span class="cluster-pulse"></span>
        <div class="cluster-core">
          <span class="cluster-count">${count}</span>
          ${advancedView() && avg != null ? `<span class="cluster-sub">avg IAI ${avg}</span>` : ''}
        </div>
      </div>
    `
  });
}

function createPopupContent(property) {
  const tier = getIaiTier(property.iaiScore);
  const img = esc(imageUrl(property));
  const category = esc(property.subcategory || property.category || 'Commercial');
  const zoning = esc(property.clupProfile?.zoningClassification || 'Zoning awaiting review');
  const iaiVal = property.iaiScore != null ? Math.round(property.iaiScore) : null;

  return `
    <div class="locus-popup-card tw-w-[min(270px,calc(100vw-100px))]">
      <div class="locus-popup-media">
        <img src="${img}" alt="${esc(property.name)}" loading="lazy">
        <div class="locus-popup-tags">
          <span class="locus-popup-tag">${category}</span><span class="locus-popup-tag">${esc(listingPurposeLabel(property))}</span>
          <span class="locus-popup-tag tag-muted">${zoning}</span>
          ${property.authorityToSellVerified ? '<span class="locus-popup-tag tw-bg-emerald-100 tw-text-emerald-800">Authority to Sell ✓ Verified</span>' : ''}
        </div>
      </div>
      <div class="locus-popup-body">
        <h4 class="locus-popup-title"><a href="${path(`property-details.php?id=${property.id}`)}">${esc(property.name)}</a></h4>
        <p class="locus-popup-loc">${esc(property.barangay || property.city)}, San Fernando</p>
        <p class="tw-text-xs tw-text-slate-500">${esc(propertyLocationLabel(property))}${propertyLocationLabel(property) === 'Approximate location' ? ' · confirm the parcel location' : ' · confirm on site'}</p>
        <div class="locus-popup-pricing">
          <div class="locus-popup-price">${esc(listingPriceLabel(property))}</div>
          <div class="locus-popup-area">${areaText(property)}${salePricePerSqm(property) !== null ? ` · ${money(salePricePerSqm(property))}/m²` : ''}</div>
        </div>
        <div class="tw-my-1.5 tw-p-1.5 tw-rounded-lg tw-bg-slate-50 tw-border tw-border-slate-100 tw-text-[11px] tw-text-slate-600">
          <strong>Hazards & environment:</strong> ${esc(propertyHazardSummary(property))}
        </div>
        ${advancedView() && iaiVal != null ? `
          <div class="locus-popup-metrics" data-investor-advanced>
            <div class="locus-metric-row">
              <span class="locus-metric-label"><i class="pin-dot ${tier.class}"></i> IAI Attractiveness</span>
              <strong class="locus-metric-value">${iaiVal}<small>/100</small></strong>
            </div>
            <div class="locus-metric-bar"><div class="locus-metric-fill ${tier.class}" style="width:${Math.min(iaiVal, 100)}%"></div></div>
          </div>
        ` : ''}
        <div class="locus-popup-footer">
          <a class="locus-popup-btn" href="${path(`property-details.php?id=${property.id}`)}">View details &amp; contact &rarr;</a>
          <a class="locus-popup-sub-btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.lat},${property.lng}`)}" target="_blank" rel="noopener" title="Open this location in Google Maps">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>Open in Google Maps &nearr;</span>
          </a>
        </div>
      </div>
    </div>
  `;
}

let activeMarker = null;

function flyToPropertyMarker(property, marker, shouldOpenPopup = true) {
  if (!map || !property || !hasCoordinates(property)) return;

  const targetZoom = Math.max(map.getZoom(), 16);
  const targetLatLng = L.latLng(Number(property.lat), Number(property.lng));

  if (activeMarker && activeMarker !== marker && activeMarker.propertyData) {
    activeMarker.setIcon(createPillIcon(activeMarker.propertyData, false, false));
    if (typeof activeMarker.setZIndexOffset === 'function') {
      activeMarker.setZIndexOffset(0);
    }
  }

  activeMarker = marker;
  if (marker && property) {
    marker.setIcon(createPillIcon(property, false, true));
    if (typeof marker.setZIndexOffset === 'function') {
      marker.setZIndexOffset(1000);
    }
  }

  // Smooth Google Maps-style camera flight
  map.flyTo(targetLatLng, targetZoom, {
    animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
    duration: 1.1,
    easeLinearity: 0.25
  });

  if (shouldOpenPopup && marker) {
    marker.openPopup();
  }

  document.querySelectorAll('.city-property-card').forEach(c => {
    c.classList.remove('is-active-card', 'is-map-hovered');
  });

  const card = document.querySelector(`.city-property-card[data-property-id="${property.id}"]`);
  if (card) {
    card.classList.add('is-active-card', 'is-map-hovered');
    if (window.innerWidth > 850) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function setupMap() {
  if (!document.getElementById('cityPropertyMap')) return;
  if (!window.L) {
    document.getElementById('cityPropertyMap').innerHTML = '<div class="city-empty">Map unavailable. Property listings are still available.</div>';
    return;
  }
  map = L.map('cityPropertyMap', {
    scrollWheelZoom: false,
    zoomControl: false,
    maxZoom: 19,
    minZoom: 9,
  }).setView([16.6159, 120.3166], 13);

  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  const LocateControl = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd: function() {
      const container = L.DomUtil.create('div', 'leaflet-bar locus-locate-control');
      const btn = L.DomUtil.create('a', 'leaflet-bar-part', container);
      btn.href = '#';
      btn.role = 'button';
      btn.title = 'Fit all properties';
      btn.setAttribute('aria-label', 'Fit all properties');
      btn.style.cssText = 'display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:#fff;text-decoration:none;color:#1e293b;';
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/></svg>`;
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(btn, 'click', function(e) {
        L.DomEvent.preventDefault(e);
        fitMap();
      });
      return container;
    }
  });
  new LocateControl().addTo(map);

  // Initialize marker group with clustering support
  if (typeof L.markerClusterGroup === 'function') {
    markers = L.markerClusterGroup({
      iconCreateFunction: createClusterIcon,
      showCoverageOnHover: false,
      maxClusterRadius: 65,
      spiderfyDistanceMultiplier: 1.5,
      zoomToBoundsOnClick: true,
      animate: true,
      chunkedLoading: true,
      disableClusteringAtZoom: 18,
    });
  } else {
    markers = L.featureGroup();
  }
  map.addLayer(markers);

  setMapLayer('canvas');
  renderMarkers();
  fitMap();

  // Layer switcher buttons
  document.querySelectorAll('[data-layer-btn]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-layer-btn]').forEach(b => b.classList.remove('is-active'));
      button.classList.add('is-active');
      setMapLayer(button.dataset.layerBtn);
    });
  });

  document.getElementById('cityMapLayer')?.addEventListener('change', event => setMapLayer(event.target.value));
  document.getElementById('cityMapFit')?.addEventListener('click', fitMap);

  document.getElementById('cityNearbyBusinesses')?.addEventListener('change', async event => {
    const status = document.getElementById('cityMapContext');
    if (!event.target.checked) {
      if (businessLayer) map.removeLayer(businessLayer);
      status.textContent = '';
      return;
    }
    try {
      status.textContent = 'Loading…';
      if (!businessLayer) {
        const response = await fetch(`${config.apiBase}/competitors.php`, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('Nearby businesses unavailable.');
        const geojsonData = await response.json();
        businessLayer = L.geoJSON(geojsonData, {
          pointToLayer: (feature, latlng) => {
            const props = feature.properties || {};
            const col = props.categoryColor === 'amber' ? '#f59e0b'
              : (props.categoryColor === 'blue' ? '#2563eb'
              : (props.categoryColor === 'emerald' ? '#10b981'
              : (props.categoryColor === 'purple' ? '#9333ea'
              : (props.categoryColor === 'indigo' ? '#4f46e5' : '#475569'))));
            return L.circleMarker(latlng, {
              radius: 7,
              color: '#ffffff',
              weight: 2,
              fillColor: col,
              fillOpacity: 0.95
            });
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const name = esc(props.name || 'Local business');
            const category = esc(props.category || 'Commercial');
            const address = esc(props.address || props.barangay || 'San Fernando City');
            const note = esc(props.note || '');
            const coords = feature.geometry?.coordinates || [0, 0];
            const lat = Number(coords[1]);
            const lng = Number(coords[0]);
            const colClass = props.categoryColor === 'amber' ? 'tw-bg-amber-100 tw-text-amber-800'
              : (props.categoryColor === 'blue' ? 'tw-bg-blue-100 tw-text-blue-800'
              : (props.categoryColor === 'emerald' ? 'tw-bg-emerald-100 tw-text-emerald-800'
              : (props.categoryColor === 'purple' ? 'tw-bg-purple-100 tw-text-purple-800'
              : 'tw-bg-slate-100 tw-text-slate-800')));
            layer.bindPopup(`
              <div class="locus-biz-popup">
                <div class="locus-biz-popup-header">
                  <span class="locus-biz-cat-badge ${colClass}">${category}</span>
                  <span class="locus-biz-status-badge">Operating</span>
                </div>
                <strong class="locus-biz-name">${name}</strong>
                <p class="locus-biz-address">${address}</p>
                ${note ? `<p class="locus-biz-note">${note}</p>` : ''}
                <a class="locus-biz-gmaps-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}" target="_blank" rel="noopener">
                  Open in Google Maps &nearr;
                </a>
              </div>
            `, { className: 'locus-popup', maxWidth: 280, minWidth: 220 });

            layer.on('click', () => {
              map.flyTo(layer.getLatLng(), Math.max(map.getZoom(), 16), {
                animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
                duration: 1.0,
                easeLinearity: 0.25
              });
              layer.openPopup();
            });
          },
        });
      }
      businessLayer.addTo(map);
      status.textContent = 'Active commercial directory';
    } catch (error) {
      event.target.checked = false;
      status.textContent = error.message;
    }
  });

  document.getElementById('cityMapFloodOverlay')?.addEventListener('change', async event => {
    const status = document.getElementById('cityMapContext');
    if (!event.target.checked) {
      if (floodLayer) map.removeLayer(floodLayer);
      if (status) status.textContent = '';
      return;
    }
    try {
      if (status) status.textContent = 'Loading flood layer…';
      if (!floodLayer) {
        const response = await fetch(`${config.apiBase}/hazards.php?layer=flood`, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('Flood data unavailable.');
        const geojsonData = await response.json();
        floodLayer = L.geoJSON(geojsonData, {
          style: feature => {
            const level = String(feature.properties?.hazard_status || '').toLowerCase();
            const col = level === 'high' ? '#dc2626' : (level === 'moderate' ? '#d97706' : '#059669');
            const fill = level === 'high' ? '#f87171' : (level === 'moderate' ? '#fbbf24' : '#6ee7b7');
            return { color: col, weight: 1.5, fillColor: fill, fillOpacity: 0.25 };
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            layer.bindPopup(`
              <div class="tw-p-2 tw-text-xs">
                <span class="tw-inline-block tw-font-bold tw-text-slate-800">${esc(props.name || 'Flood Zone')}</span><br>
                <span class="tw-inline-block tw-text-[11px] tw-font-semibold tw-text-slate-600 tw-mt-0.5">Susceptibility: <strong>${esc((props.hazard_status || 'moderate').toUpperCase())}</strong></span><br>
                <small class="tw-text-slate-500">${esc(props.description || 'Mapped flood susceptible area.')}</small>
              </div>
            `, { className: 'locus-popup', maxWidth: 280 });
          }
        });
      }
      floodLayer.addTo(map);
      if (status) status.textContent = 'Flood susceptibility layer active';
      setTimeout(() => { if (status && status.textContent.includes('Flood')) status.textContent = ''; }, 3000);
    } catch (err) {
      event.target.checked = false;
      if (status) status.textContent = 'Unable to load flood data';
    }
  });

  document.getElementById('cityMapFaultOverlay')?.addEventListener('change', async event => {
    const status = document.getElementById('cityMapContext');
    if (!event.target.checked) {
      if (faultLayer) map.removeLayer(faultLayer);
      if (status) status.textContent = '';
      return;
    }
    try {
      if (status) status.textContent = 'Loading fault lines…';
      if (!faultLayer) {
        const response = await fetch(`${config.apiBase}/hazards.php?layer=fault`, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('Fault data unavailable.');
        const geojsonData = await response.json();
        faultLayer = L.geoJSON(geojsonData, {
          style: { color: '#e11d48', weight: 3, dashArray: '6, 6' },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            layer.bindPopup(`
              <div class="tw-p-2 tw-text-xs">
                <span class="tw-inline-block tw-font-bold tw-text-slate-800">${esc(props.name || 'Active Fault Line')}</span><br>
                <small class="tw-text-slate-500">Source: ${esc(props.source || 'PHIVOLCS active faults')}</small>
              </div>
            `, { className: 'locus-popup', maxWidth: 280 });
          }
        });
      }
      faultLayer.addTo(map);
      if (status) status.textContent = 'Fault line layer active';
      setTimeout(() => { if (status && status.textContent.includes('Fault')) status.textContent = ''; }, 3000);
    } catch (err) {
      event.target.checked = false;
      if (status) status.textContent = 'Unable to load fault data';
    }
  });

  // Keep map sharply rendered across all screen resize & orientation events
  const handleViewportResize = () => {
    if (map) {
      map.invalidateSize();
    }
  };
  window.addEventListener('resize', handleViewportResize, { passive: true });
  window.addEventListener('orientationchange', () => {
    setTimeout(handleViewportResize, 250);
  }, { passive: true });

  setupCardHoverSync();
}

function setMapLayer(layer) {
  if (tileLayer) map.removeLayer(tileLayer);
  currentMapLayer = layer;

  if (layer === 'satellite') {
    tileLayer = L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 18,
        maxZoom: 19,
        attribution: 'Tiles © Esri, Maxar'
      }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 16,
        maxZoom: 19,
        opacity: 0.85
      })
    ]);
  } else if (layer === 'streets') {
    tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 19,
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
  } else {
    // Default: Clean, modern Light Gray Canvas (Crexi / commercial real estate SaaS aesthetic, no watermark)
    tileLayer = L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 16,
        maxZoom: 19,
        attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors'
      }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 16,
        maxZoom: 19,
        opacity: 0.95
      })
    ]);
  }

  tileLayer.addTo(map);
}

function renderMarkers() {
  if (!markers) return;
  markers.clearLayers();
  markerMap.clear();

  filtered.forEach(property => {
    if (!hasCoordinates(property)) return;

    const marker = L.marker([property.lat, property.lng], {
      icon: createPillIcon(property)
    });
    marker.propertyId = property.id;
    marker.propertyData = property;

    marker.bindPopup(createPopupContent(property), {
      className: 'locus-popup',
      maxWidth: 320,
      minWidth: 260
    });

    marker.on('click', () => {
      flyToPropertyMarker(property, marker, true);
    });

    marker.on('popupclose', () => {
      if (activeMarker === marker) {
        marker.setIcon(createPillIcon(property, false, false));
        if (typeof marker.setZIndexOffset === 'function') {
          marker.setZIndexOffset(0);
        }
        activeMarker = null;
        document.querySelector(`.city-property-card[data-property-id="${property.id}"]`)?.classList.remove('is-active-card', 'is-map-hovered');
      }
    });

    marker.on('mouseover', () => {
      if (marker !== activeMarker) {
        marker.setIcon(createPillIcon(property, true, false));
      }
      const card = document.querySelector(`.city-property-card[data-property-id="${property.id}"]`);
      if (card) card.classList.add('is-map-hovered');
    });

    marker.on('mouseout', () => {
      if (marker !== activeMarker) {
        marker.setIcon(createPillIcon(property, false, false));
      }
      const card = document.querySelector(`.city-property-card[data-property-id="${property.id}"]`);
      if (card && !card.classList.contains('is-active-card')) {
        card.classList.remove('is-map-hovered');
      }
    });

    markerMap.set(property.id, marker);
    markers.addLayer(marker);
  });
}

function setupCardHoverSync() {
  const grid = document.getElementById('cityPropertyGrid');
  if (!grid || grid.dataset.hoverBound) return;
  grid.dataset.hoverBound = 'true';

  grid.addEventListener('mouseover', event => {
    const card = event.target.closest('.city-property-card');
    if (!card) return;
    const id = Number(card.dataset.propertyId);
    const marker = markerMap.get(id);
    if (marker && marker.propertyData && marker !== activeMarker) {
      marker.setIcon(createPillIcon(marker.propertyData, true, false));
    }
  });

  grid.addEventListener('mouseout', event => {
    const card = event.target.closest('.city-property-card');
    if (!card) return;
    const id = Number(card.dataset.propertyId);
    const marker = markerMap.get(id);
    if (marker && marker.propertyData && marker !== activeMarker) {
      marker.setIcon(createPillIcon(marker.propertyData, false, false));
    }
  });

  // Card click sync: click anywhere on card (outside direct links) to smoothly fly to the property pin on map
  grid.addEventListener('click', event => {
    if (event.target.closest('a[href], button')) return;
    const card = event.target.closest('.city-property-card');
    if (!card) return;
    const id = Number(card.dataset.propertyId);
    const marker = markerMap.get(id);
    if (marker && marker.propertyData) {
      flyToPropertyMarker(marker.propertyData, marker, true);
      if (window.innerWidth <= 850) {
        document.getElementById('cityPropertyMap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
}

function fitMap() {
  if (!map || !markers) return;
  try {
    const layers = markers.getLayers();
    if (layers && layers.length) {
      const bounds = markers.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) {
        map.fitBounds(bounds.pad(0.18), { maxZoom: 16 });
      }
    }
  } catch (err) {
    console.warn('fitMap warning:', err);
  }
}

function getCategoryIconSvg(icon) {
  switch (icon) {
    case 'utensils':
      return `<svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v14"/><path d="M6 2v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2"/><path d="M8 11v11"/></svg>`;
    case 'coffee':
      return `<svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
    case 'landmark':
      return `<svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`;
    case 'cross':
      return `<svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
    case 'shopping-bag':
      return `<svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
    case 'building':
      return `<svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="22.01"/><line x1="15" y1="22" x2="15" y2="22.01"/><line x1="9" y1="18" x2="9" y2="18.01"/><line x1="15" y1="18" x2="15" y2="18.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/></svg>`;
    case 'wrench':
      return `<svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
    case 'graduation-cap':
      return `<svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;
    case 'briefcase':
      return `<svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
    case 'sparkles':
      return `<svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`;
    case 'shield':
      return `<svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    default:
      return `<svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>`;
  }
}

function getCategoryColorClass(color) {
  switch (color) {
    case 'amber':
      return 'tw-bg-amber-100 tw-text-amber-800';
    case 'blue':
      return 'tw-bg-blue-100 tw-text-blue-800';
    case 'emerald':
      return 'tw-bg-emerald-100 tw-text-emerald-800';
    case 'purple':
      return 'tw-bg-purple-100 tw-text-purple-800';
    case 'cyan':
      return 'tw-bg-cyan-100 tw-text-cyan-800';
    case 'rose':
      return 'tw-bg-rose-100 tw-text-rose-800';
    case 'indigo':
      return 'tw-bg-indigo-100 tw-text-indigo-800';
    default:
      return 'tw-bg-slate-200 tw-text-slate-800';
  }
}

function printHeaderMarkup(property) {
  const printDate = new Date().toLocaleDateString('en-PH', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return `
    <header class="city-print-dossier-header print:tw-block tw-hidden">
      <div class="city-print-header-inner">
        <div class="city-print-logo-col">
          <div class="city-print-lgu-kicker">Republic of the Philippines &middot; Province of La Union</div>
          <div class="city-print-lgu-title">City Government of San Fernando</div>
          <div class="city-print-office-title">Local Economic and Business Development Office (LEBDO) &middot; CPDO</div>
        </div>
        <div class="city-print-meta-col">
          <span class="city-print-tag">Property information & assessment</span>
          <div class="city-print-meta-item">Ref ID: <strong>LOCUS-SF-PRP-${property.id}</strong></div>
          <div class="city-print-meta-item">Date Printed: <strong>${esc(printDate)}</strong></div>
          <div class="city-print-meta-item">Zoning: <strong>${esc(property.clupProfile?.zoningClassification || 'Awaiting verification')}</strong></div>
        </div>
      </div>
      <div class="city-print-divider"></div>
    </header>
  `;
}

function printFooterMarkup(property) {
  return `
    <footer class="city-print-dossier-footer print:tw-block tw-hidden">
      <p class="tw-m-0">
        <strong>LOCUS-SF &middot; City of San Fernando Investment Intelligence System</strong><br>
        Property information and recorded assessment evidence as of printing. Advisory decision support; source dates and any pending evidence are listed in this sheet. Confirm legal boundaries, current availability and applicable permits with the responsible offices.
      </p>
    </footer>
  `;
}

function printButtonMarkup(id = '') {
  return `
    <button class="city-button city-button-secondary city-print-trigger-btn print:tw-hidden" type="button" ${id ? `id="${id}"` : ''} title="Print property information and MCE / IAI calculation sheet">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      <span>Print Information</span>
    </button>
  `;
}

function nearbyBusinessesMarkup(property) {
  const businesses = Array.isArray(property.nearbyBusinesses) ? property.nearbyBusinesses : [];
  if (!businesses.length && !property.nearbyProperties?.length) {
    return `
      <section class="city-detail-panel nearby-businesses-section" style="margin-top:20px" id="propertyNearbyBusinessesSection">
        <div class="city-panel-head tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-mb-3">
          <div>
            <div class="city-eyebrow tw-text-amber" style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Commercial Proximity &middot; San Fernando GIS</div>
            <h2 style="margin:0;font-size:20px;font-weight:750;letter-spacing:-0.02em;color:#0f172a;">Nearby Businesses &amp; Commercial Anchors</h2>
          </div>
          <span class="tw-text-xs tw-text-slate-400 print:tw-hidden">Search radius: 2.5 km</span>
        </div>
        <p class="tw-text-sm tw-text-slate-500 tw-m-0">No nearby places are available in this listing's mapped directory. This does not establish that businesses are absent.</p>
      </section>
    `;
  }

  const closest = businesses[0];
  const count = businesses.length;

  return `
    <section class="city-detail-panel nearby-businesses-section" style="margin-top:20px" id="propertyNearbyBusinessesSection">
      <div class="city-panel-head tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3 tw-mb-4">
        <div>
          <div class="city-eyebrow tw-text-amber" style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Commercial Proximity &middot; San Fernando GIS</div>
          <h2 style="margin:0;font-size:20px;font-weight:750;letter-spacing:-0.02em;color:#0f172a;">Nearby Businesses &amp; Commercial Anchors</h2>
          <p class="tw-m-0 tw-mt-1 tw-text-xs tw-text-slate-500">
            Up to 12 mapped places within 2.5 km. Distances are straight-line estimates; walking times do not establish a usable route.
          </p>
        </div>
        ${count ? `
          <div class="tw-flex tw-items-center tw-gap-2 print:tw-hidden">
            <span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-solid tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-py-1 tw-text-[11px] tw-font-semibold tw-text-slate-700">
              <span class="tw-h-2 tw-w-2 tw-rounded-full tw-bg-emerald-500"></span>
              ${count} Mapped Anchors
            </span>
            ${closest ? `
              <span class="tw-inline-flex tw-items-center tw-rounded-full tw-border tw-border-solid tw-border-amber-200 tw-bg-amber-50 tw-px-3 tw-py-1 tw-text-[11px] tw-font-semibold tw-text-amber-800">
                Nearest: ${esc(closest.distanceFormatted)}
              </span>
            ` : ''}
          </div>
        ` : ''}
      </div>

      ${count ? `
        <div class="nearby-biz-grid tw-grid tw-gap-3 sm:tw-grid-cols-2">
          ${businesses.map((biz, idx) => {
            const iconSvg = getCategoryIconSvg(biz.icon || 'store');
            return `
              <article class="nearby-biz-card tw-flex tw-items-start tw-gap-3.5 tw-rounded-xl tw-border tw-border-solid tw-border-slate-200/80 tw-bg-slate-50/70 tw-p-3.5 tw-transition-all hover:tw-border-slate-300 hover:tw-bg-white hover:tw-shadow-sm"${hasCoordinates(biz) ? ` data-biz-lat="${Number(biz.lat)}" data-biz-lng="${Number(biz.lng)}"` : ''}>
                <div class="nearby-biz-icon-box tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg ${getCategoryColorClass(biz.categoryColor)}">
                  ${iconSvg}
                </div>
                <div class="tw-min-w-0 tw-flex-1">
                  <div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
                    <h4 class="tw-m-0 tw-truncate tw-text-xs tw-font-bold tw-text-slate-900" title="${esc(biz.name)}">${esc(biz.name)}</h4>
                    <span class="nearby-biz-dist-pill tw-shrink-0 tw-rounded-md tw-bg-white tw-border tw-border-solid tw-border-slate-200 tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-slate-800">${esc(biz.distanceFormatted)}</span>
                  </div>
                  <div class="tw-mt-1 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                    <span class="tw-text-[11px] tw-font-medium tw-text-slate-600">${esc(biz.category)}</span>
                    <span class="tw-text-[10px] tw-text-slate-400">&middot;</span>
                    <span class="tw-text-[10px] tw-font-medium tw-text-slate-500">${esc(biz.walkingFormatted || '')}</span>
                  </div>
                  <div class="tw-mt-1.5 tw-flex tw-items-center tw-justify-between tw-gap-2">
                    <span class="nearby-biz-status-badge tw-inline-flex tw-items-center tw-gap-1 tw-text-[9.5px] tw-font-semibold tw-text-emerald-700">
                      <span class="tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-emerald-500"></span>
                      ${biz.status === 'operating' ? 'Recorded as operating' : 'Under development'}
                    </span>
                    ${hasCoordinates(property) && property.hasExactLocation !== false && hasCoordinates(biz) ? `<button type="button" class="nearby-biz-locate-btn print:tw-hidden tw-text-[10.5px] tw-font-semibold tw-text-blue-700 hover:tw-underline" data-locate-biz="${idx}" title="Center on map">
                      Locate on map &rarr;
                    </button>` : ''}
                  </div>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      ` : ''}

      ${property.nearbyProperties?.length ? `
        <div class="lister-nearby-places tw-mt-5 tw-border-t tw-border-solid tw-border-slate-200/80 tw-pt-4">
          <h4 class="tw-mb-3 tw-text-xs tw-font-bold tw-text-slate-700 tw-uppercase tw-tracking-wider">Lister Recorded Surroundings &amp; Landmarks</h4>
          <div class="tw-grid tw-gap-3 sm:tw-grid-cols-2">
            ${property.nearbyProperties.map(item => `
              <article class="tw-flex tw-items-center tw-gap-3 tw-rounded-lg tw-bg-white tw-border tw-border-solid tw-border-slate-200 tw-p-2.5">
                ${item.imageUrl ? `<img class="tw-h-12 tw-w-12 tw-shrink-0 tw-rounded-md tw-object-cover" src="${esc(imageUrl(item))}" alt="${esc(item.name)}" loading="lazy">` : ''}
                <div class="tw-min-w-0">
                  <strong class="tw-text-xs tw-text-slate-900">${esc(item.name)}</strong>
                  <p class="tw-mb-0 tw-mt-0.5 tw-text-[11px] tw-text-slate-500">${esc(item.type || 'Surrounding place')}${item.distanceKm == null ? '' : ` &middot; ${number(item.distanceKm)} km`}</p>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </section>
  `;
}

function nearbyMarkup(property) {
  return nearbyBusinessesMarkup(property);
}

async function renderDetails() {
  const root = document.getElementById('cityPropertyDetails');
  if (!root) return;
  const id = Number(params.get('id'));
  if (!Number.isInteger(id) || id < 1) throw new Error('Choose a property from the list.');
  const response = await fetch(`${config.apiBase}/property.php?id=${id}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Property is unavailable. Log in to access the full catalogue.');
  const property = result.property;
  if (!properties.some(item => item.id === id)) properties.push(property);
  const broker = role !== 'guest' ? property.brokerContact : null;
  const existingConversation = investor ? await api.getMessages(id).catch(() => null) : null;
  const canInquire = investor && (existingConversation?.thread || (property.contactMode === 'broker' ? broker : property.sellerUserId));
  root.innerHTML = propertyDetailsMarkup(property, {
    role, investor, saved, compare, broker, canInquire, path, imageUrl,
    printHeaderMarkup, printFooterMarkup, printButtonMarkup, nearbyBusinessesMarkup,
    evaluationMarkup, investorTools, policy: config.policy || {},
  });
  window.SFCInvestorView?.refresh(root);
  const printState = setupPropertyDetailsPrint(root);

  filtered = [property];
  setupMap();
  if (map && property.parcel?.boundary && window.L) {
    const boundary = L.geoJSON(property.parcel.boundary, { style: { color: '#9e1b22', weight: 2, fillColor: '#9e1b22', fillOpacity: 0.1 } }).addTo(map);
    if (boundary.getBounds().isValid()) map.fitBounds(boundary.getBounds(), { padding: [28, 28], maxZoom: 18 });
  }
  setupInvestmentEvaluation(property, config.policy || {});
  initBusinessOpportunities(root, property);

  // Add nearby business markers to map if map is initialized
  if (map && window.L && Array.isArray(property.nearbyBusinesses) && property.nearbyBusinesses.length) {
    const bizGroup = L.layerGroup();
    property.nearbyBusinesses.forEach(biz => {
      if (!hasCoordinates(biz)) return;
      const marker = L.circleMarker([biz.lat, biz.lng], {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: biz.categoryColor === 'amber' ? '#f59e0b' : (biz.categoryColor === 'blue' ? '#2563eb' : (biz.categoryColor === 'emerald' ? '#10b981' : (biz.categoryColor === 'purple' ? '#9333ea' : '#475569'))),
        fillOpacity: 0.95
      });
      marker.bindPopup(`
        <div class="city-popup" style="font-family:sans-serif;min-width:180px;">
          <strong style="font-size:12px;display:block;margin-bottom:2px;color:#0f172a;">${esc(biz.name)}</strong>
          <span style="font-size:11px;color:#64748b;display:block;margin-bottom:4px;">${esc(biz.category)}</span>
          <span style="font-size:10px;font-weight:700;background:#f1f5f9;padding:2px 6px;border-radius:4px;color:#334155;">${esc(biz.distanceFormatted)} &middot; ${esc(biz.walkingFormatted || '')}</span>
          <div style="margin-top:6px;">
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${biz.lat},${biz.lng}`)}" target="_blank" rel="noopener" style="font-size:10.5px;color:#2563eb;text-decoration:none;font-weight:600;">Open in Google Maps &nearr;</a>
          </div>
        </div>
      `);
      marker.on('click', () => {
        map.flyTo([biz.lat, biz.lng], Math.max(map.getZoom(), 16), {
          animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
          duration: 1.0,
          easeLinearity: 0.25
        });
        marker.openPopup();
      });
      biz._marker = marker;
      bizGroup.addLayer(marker);
    });
    detailsBusinessLayer = bizGroup;
    if (advancedView()) bizGroup.addTo(map);
  }

  // Wire Print buttons
  root.querySelectorAll('.city-print-trigger-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      printState.expand();
      window.print();
    });
  });

  // Wire Map Locate buttons
  root.querySelectorAll('[data-locate-biz]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.locateBiz);
      const biz = property.nearbyBusinesses?.[idx];
      if (map && hasCoordinates(biz)) {
        map.flyTo([biz.lat, biz.lng], Math.max(map.getZoom(), 16), {
          animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
          duration: 1.0,
          easeLinearity: 0.25
        });
        if (biz._marker) {
          biz._marker.openPopup();
        }
        document.getElementById('cityPropertyMap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
  const form = document.getElementById('cityInquiryForm');
  if (form) {
    if (existingConversation?.thread) loadConversation(id, existingConversation);
    document.getElementById('cityInquiryPanel').addEventListener('toggle', event => { if (event.target.open) loadConversation(id); });
    form.addEventListener('submit', async event => {
      event.preventDefault(); const button=form.querySelector('button'); button.disabled=true;
      try { await api.sendMessage({propertyId:id,text:document.getElementById('cityInquiryText').value}); form.reset(); toast('Inquiry sent.'); await loadConversation(id); }
      catch(error){toast(error.message);} finally{button.disabled=false;}
    });
  }
  if (investor) setupInvestorTools(property);

  const assessmentSec = root.querySelector('#propertyAssessmentSection');
  if (assessmentSec) {
    const subtabs = assessmentSec.querySelectorAll('[data-assessment-tab]');
    const calcDisclosure = assessmentSec.querySelector('[data-disclosure-calc]');
    const evidenceDisclosure = assessmentSec.querySelector('[data-disclosure-evidence]');

    const setAssessmentTab = tab => {
      subtabs.forEach(btn => {
        const active = btn.dataset.assessmentTab === tab;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      if (tab === 'calculation' && calcDisclosure) {
        calcDisclosure.open = true;
        calcDisclosure.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (tab === 'evidence' && evidenceDisclosure) {
        evidenceDisclosure.open = true;
        evidenceDisclosure.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (tab === 'overview') {
        assessmentSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    subtabs.forEach(btn => {
      btn.addEventListener('click', () => setAssessmentTab(btn.dataset.assessmentTab));
    });

    assessmentSec.querySelectorAll('[data-open-calculation]').forEach(btn => {
      btn.addEventListener('click', () => setAssessmentTab('calculation'));
    });
  }

  function revealLinkedPanel() {
    const legacyPanels = {
      propertyMessagingSection: 'cityInquiryPanel',
      propertyDocumentWorkflowSection: 'cityDocumentsPanel',
      propertyLogisticsSection: 'cityVisitPanel',
    };
    const hash = location.hash.slice(1);
    const panel = document.getElementById(legacyPanels[hash] || hash);
    if (!panel || !root.contains(panel)) return;
    if (panel.tagName === 'DETAILS') panel.open = true;
    panel.scrollIntoView({ block: 'center' });
  }
  revealLinkedPanel();
  window.addEventListener('hashchange', revealLinkedPanel);
}

function investorTools(property, canArrangeVisit) {
  return `<details class="city-detail-panel" id="cityDocumentsPanel"><summary>Request documents</summary><div id="cityDocumentRequests" style="margin:15px 0"></div><form id="cityDocumentsForm" class="city-field"><label for="cityDocumentName">Document</label><select id="cityDocumentName" required>${(property.documentChecklist || []).map(item => `<option>${esc(item.label)}</option>`).join('')}</select><label for="cityDocumentNote">Note (optional)</label><textarea id="cityDocumentNote" maxlength="2000" rows="2"></textarea><button class="city-button" type="submit">Request document</button></form></details>${canArrangeVisit ? `<details class="city-detail-panel" id="cityVisitPanel"><summary>Arrange a site visit</summary><div id="cityVisitStatus" style="margin:15px 0"></div><form id="cityVisitForm" class="city-field"><label for="cityVisitPurpose">Investment purpose</label><input id="cityVisitPurpose" required maxlength="140" placeholder="For example, a retail store"><label for="cityVisitPrimary">Preferred time</label><input id="cityVisitPrimary" type="datetime-local" required><label for="cityVisitSecondary">Alternative time</label><input id="cityVisitSecondary" type="datetime-local" required><span>Each visit window is one hour.</span><button class="city-button" type="submit">Propose visit</button></form></details>` : ''}`;
}

function setupInvestorTools(property) {
  const id = property.id;
  const documentForm = document.getElementById('cityDocumentsForm');
  async function loadDocuments() {
    const root = document.getElementById('cityDocumentRequests');
    try {
      const payload = await api.getDocumentRequests(id);
      root.innerHTML = (payload.requests || []).map(request => `<p style="font-size:12px"><strong>${esc(request.documentName)}</strong> · ${esc(String(request.status).replaceAll('_', ' '))}${request.responseNote ? `<br>${esc(request.responseNote)}` : ''}</p>`).join('') || '<p>No requests yet.</p>';
    } catch (error) { root.textContent = error.message; }
  }
  document.getElementById('cityDocumentsPanel').addEventListener('toggle', event => { if (event.target.open) loadDocuments(); });
  documentForm.addEventListener('submit', async event => {
    event.preventDefault(); const button = documentForm.querySelector('button'); button.disabled = true;
    try { await api.createDocumentRequest({ propertyId: id, documentName: document.getElementById('cityDocumentName').value, note: document.getElementById('cityDocumentNote').value }); documentForm.reset(); await loadDocuments(); toast('Document requested.'); }
    catch (error) { toast(error.message); } finally { button.disabled = false; }
  });
  const visitForm = document.getElementById('cityVisitForm');
  if (!visitForm) return;
  const minimum = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  visitForm.querySelectorAll('[type=datetime-local]').forEach(input => input.min = minimum);
  const formatWindow = window => window ? new Date(window.startAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  async function loadVisit() {
    const root = document.getElementById('cityVisitStatus');
    try {
      const { visit } = await api.getVisitLogByProperty(id);
      visitForm.hidden = Boolean(visit);
      root.innerHTML = visit ? `<strong>${esc(visit.statusLabel)}</strong><p>${esc(formatWindow(visit.activeWindow))}</p>${visit.status === 'counter_offered' ? `<p>Suggested time: ${esc(formatWindow(visit.counterWindow))}</p><button class="city-button city-button-small" type="button" id="cityAcceptVisit">Accept suggested time</button>` : ''}` : '<p>Propose two times for the broker to review.</p>';
      document.getElementById('cityAcceptVisit')?.addEventListener('click', async event => {
        event.target.disabled = true;
        try { await api.updateVisit({ visitId: visit.id, action: 'acceptCounter' }); await loadVisit(); toast('Visit confirmed.'); }
        catch (error) { event.target.disabled = false; toast(error.message); }
      });
    } catch (error) { root.textContent = error.message; }
  }
  document.getElementById('cityVisitPanel').addEventListener('toggle', event => { if (event.target.open) loadVisit(); });
  visitForm.addEventListener('submit', async event => {
    event.preventDefault(); const button = visitForm.querySelector('button'); button.disabled = true;
    try {
      const primary = new Date(document.getElementById('cityVisitPrimary').value);
      const secondary = new Date(document.getElementById('cityVisitSecondary').value);
      await api.createVisitProposal({ propertyId: id, investmentPurpose: document.getElementById('cityVisitPurpose').value, primaryStartAt: primary.toISOString(), primaryEndAt: new Date(primary.getTime() + 3600000).toISOString(), secondaryStartAt: secondary.toISOString(), secondaryEndAt: new Date(secondary.getTime() + 3600000).toISOString() });
      await loadVisit(); toast('Visit proposed.');
    } catch (error) { toast(error.message); } finally { button.disabled = false; }
  });
}

async function loadConversation(id, initialPayload = null) {
  const root = document.getElementById('cityConversation');
  try {
    const payload = initialPayload || await api.getMessages(id);
    const conversation = (payload.messages||[]).map(message=>`<p style="font-size:12px;border-bottom:1px solid var(--city-border);padding:8px 0"><strong>${esc(message.senderName)}</strong><br>${esc(message.text)}</p>`).join('') || '<p>No messages yet.</p>';
    root.innerHTML = (payload.thread?.sellerName ? `<p style="font-size:12px">Conversation with ${esc(payload.thread.sellerName)}</p>` : '') + conversation;
  } catch(error){root.textContent=error.message;}
}

document.addEventListener('click', async event => {
  const toggleButton = event.target.closest('[data-toggle-card]');
  if (toggleButton) {
    if (!isLoggedIn) {
      event.preventDefault();
      window.location.href = path('investor-login.php');
      return;
    }
    const id = Number(toggleButton.dataset.toggleCard);
    const cardEl = toggleButton.closest('.city-property-card');
    if (cardEl) {
      const drawer = cardEl.querySelector('.locus-card-drawer');
      const toggleIcon = toggleButton.querySelector('.locus-card-toggle-icon');
      const isCurrentlyExpanded = expandedCards.has(id);
      if (isCurrentlyExpanded) {
        expandedCards.delete(id);
        cardEl.classList.remove('is-expanded');
        toggleButton.setAttribute('aria-expanded', 'false');
        if (toggleIcon) toggleIcon.classList.remove('tw-rotate-180');
        if (drawer) {
          drawer.classList.remove('is-open');
          drawer.setAttribute('aria-hidden', 'true');
          drawer.setAttribute('inert', '');
          drawer.inert = true;
        }
        if (page === 'city-explorer') {
          const saveBtn = cardEl.querySelector('[data-save]');
          if (saveBtn) {
            const isSaved = saved.has(id);
            saveBtn.className = `tw-px-3.5 tw-py-2 tw-rounded-xl tw-border tw-border-slate-200 hover:tw-border-slate-300 tw-bg-white hover:tw-bg-slate-50 tw-text-xs tw-font-semibold ${isSaved ? 'tw-text-[#9E1B22] tw-border-rose-300 tw-bg-rose-50/50' : 'tw-text-slate-700'} tw-flex tw-items-center tw-justify-center tw-transition-all tw-cursor-pointer`;
            saveBtn.innerHTML = `
              <svg class="tw-w-3.5 tw-h-3.5 ${isSaved ? 'tw-text-[#9E1B22] tw-fill-current' : 'tw-text-slate-500'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            `;
          }
        }
      } else {
        expandedCards.add(id);
        cardEl.classList.add('is-expanded');
        toggleButton.setAttribute('aria-expanded', 'true');
        if (toggleIcon) toggleIcon.classList.add('tw-rotate-180');
        if (drawer) {
          drawer.classList.add('is-open');
          drawer.setAttribute('aria-hidden', 'false');
          drawer.removeAttribute('inert');
          drawer.inert = false;
        }
        if (page === 'city-explorer') {
          const saveBtn = cardEl.querySelector('[data-save]');
          if (saveBtn) {
            const isSaved = saved.has(id);
            saveBtn.className = `tw-flex-1 tw-py-2 tw-px-2 tw-rounded-xl tw-border tw-border-slate-200 hover:tw-border-slate-300 tw-bg-white hover:tw-bg-slate-50 tw-text-xs tw-font-semibold ${isSaved ? 'tw-text-[#9E1B22] tw-border-rose-300 tw-bg-rose-50/50' : 'tw-text-slate-700'} tw-flex tw-items-center tw-justify-center tw-gap-1.5 tw-transition-all tw-cursor-pointer`;
            saveBtn.innerHTML = `
              <svg class="tw-w-3.5 tw-h-3.5 ${isSaved ? 'tw-text-[#9E1B22] tw-fill-current' : 'tw-text-slate-500'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>${isSaved ? 'Saved' : 'Shortlist'}</span>
            `;
          }
        }
      }
    }
    return;
  }
  const saveButton = event.target.closest('[data-save]');
  const compareButton = event.target.closest('[data-compare]');
  const locateButton = event.target.closest('[data-locate]');
  if (saveButton) {
    event.stopPropagation();
    if (!isLoggedIn) {
      window.location.href = path('investor-login.php');
      return;
    }
    const id=Number(saveButton.dataset.save); saveButton.disabled=true;
    saveButton.classList.remove('is-toggled-pop');
    void saveButton.offsetWidth;
    saveButton.classList.add('is-toggled-pop');
    try {
      const response=await fetch(`${config.apiBase}/cart.php`,{method:saved.has(id)?'DELETE':'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':config.csrfToken},credentials:'same-origin',body:JSON.stringify({propertyId:id})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error);
      saved=new Set(payload.propertyIds); if(page==='city-details'){saveButton.textContent=saved.has(id)?'Saved':'Save property';saveButton.setAttribute('aria-pressed',String(saved.has(id)));}else render();
      toast(saved.has(id)?'Property saved to favorites.':'Property removed from favorites.');
    }catch(error){toast(error.message);}finally{saveButton.disabled=false;}
  }
  if (compareButton) {
    event.stopPropagation();
    const id=Number(compareButton.dataset.compare);
    compareButton.classList.remove('is-toggled-pop');
    void compareButton.offsetWidth;
    compareButton.classList.add('is-toggled-pop');
    if(compare.includes(id))compare=compare.filter(value=>value!==id);
    else if(compare.length<3)compare.push(id);
    else {toast('Compare up to three properties. Remove one to add another.');return;}
    saveCompare();if(page==='city-details'){compareButton.textContent=compare.includes(id)?'Added to compare':'Compare';compareButton.setAttribute('aria-pressed',String(compare.includes(id)));}else render();
    toast(compare.includes(id)?'Property added to compare matrix.':'Property removed from compare matrix.');
  }
  if (locateButton && map) {
    const id = Number(locateButton.dataset.locate);
    const marker = markerMap.get(id);
    if (marker) {
      if (markers && typeof markers.zoomToShowLayer === 'function') {
        markers.zoomToShowLayer(marker, () => {
          map.setView(marker.getLatLng(), 16);
          marker.openPopup();
        });
      } else {
        map.setView(marker.getLatLng(), 16);
        marker.openPopup();
      }
      document.querySelector('.city-map-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
});

function setupPrivacy() {
  const dialog=document.getElementById('cityPrivacyDialog');if(!dialog)return;
  let dismissed=false;try{dismissed=sessionStorage.getItem('locus.privacy-preview')==='1';}catch{}
  const checkbox=document.getElementById('cityPrivacyConsent');const continueButton=document.getElementById('cityPrivacyContinue');
  checkbox.addEventListener('change',()=>continueButton.disabled=!checkbox.checked);
  function close(){try{sessionStorage.setItem('locus.privacy-preview','1');}catch{}dialog.close();}
  document.getElementById('cityPrivacyGuest').addEventListener('click',close);
  dialog.addEventListener('cancel',()=>{try{sessionStorage.setItem('locus.privacy-preview','1');}catch{}});
  continueButton.addEventListener('click',()=>{if(checkbox.checked){close();location.href=path('investor-login.php?mode=signup');}});
  if(!dismissed&&typeof dialog.showModal==='function')setTimeout(()=>dialog.showModal(),500);
}

function setupLandingFeatures() {
  const select = document.getElementById('cityCostCategory');
  const costCard = document.getElementById('cityCostCard');
  if (select && costCard) {
    const costData = {
      wages: {
        tag: 'Wage Order No. RB1-23 \u2022 RTWPB Region I',
        rows: [
          { label: 'Non-Agriculture (\u226510 workers)', rate: '\u20B1468.00', unit: '/ day' },
          { label: 'Agriculture & Micro (<10 workers)', rate: '\u20B1435.00', unit: '/ day' }
        ],
        source: 'Official statutory minimum wage order for City of San Fernando, La Union.'
      },
      rent: {
        tag: 'Official City Lease & Land Benchmarks',
        rows: [
          { label: 'Commercial Building Space', rate: '\u20B1200 \u2013 \u20B1550', unit: '/ sq.m.' },
          { label: 'Commercial Land Acquisition', rate: '\u20B14,000 \u2013 \u20B160,000', unit: '/ sq.m.' },
          { label: 'Residential Lease (1\u20134 BR)', rate: '\u20B15,000 \u2013 \u20B115,000', unit: '/ mo.' }
        ],
        source: 'Official lease parameters across Biday, Sevilla, and coastal commercial hubs.'
      },
      power: {
        tag: 'LUECO Commercial & Industrial Tariffs',
        rows: [
          { label: 'Industrial Power', rate: '\u20B113.0848', unit: '/ kWh' },
          { label: 'Commercial GenSer (X1/X2)', rate: '\u20B111.95 \u2013 \u20B114.16', unit: '/ kWh' },
          { label: 'Residential', rate: '\u20B112.7878', unit: '/ kWh' },
          { label: 'Hospital / Healthcare', rate: '\u20B110.9535', unit: '/ kWh' }
        ],
        source: 'Supplied by La Union Electric Company (LUECO) with dual-substation redundancy.'
      },
      water: {
        tag: 'Metro San Fernando Water District / PrimeWater',
        rows: [
          { label: 'Commercial & Industrial Base', rate: 'Tiered Metered', unit: 'Rates' },
          { label: 'Bulk Institutional Supply', rate: 'Available', unit: 'on Request' }
        ],
        source: 'Commercial water connection facilitation available via City LEBDO desk.'
      },
      internet: {
        tag: 'Digital Cities Fiber Connectivity',
        rows: [
          { label: 'Enterprise Dedicated Line', rate: 'Gigabit Fiber', unit: 'Ready' },
          { label: 'Commercial Carriers', rate: 'PLDT \u2022 Globe \u2022 Converge', unit: 'Active' }
        ],
        source: 'Redundant high-speed fiber rings across Poro Point and CBD commercial centers.'
      }
    };

    const renderCostCategory = (categoryKey) => {
      const data = costData[categoryKey] || costData.wages;
      const rowsHtml = data.rows.map(r => `
        <div class="city-cost-row">
          <span class="city-cost-label">${r.label}</span>
          <strong class="city-cost-rate">${r.rate} <small>${r.unit}</small></strong>
        </div>
      `).join('');

      costCard.innerHTML = `
        <div class="city-cost-card-header">
          <span class="city-cost-card-tag">${data.tag}</span>
        </div>
        <div class="city-cost-card-rows">
          ${rowsHtml}
        </div>
        <p class="city-cost-source">${data.source}</p>
      `;
    };

    select.addEventListener('change', () => renderCostCategory(select.value));
  }

  const heroToggle = document.getElementById('heroConciergeToggle');
  const heroDrawer = document.getElementById('heroConciergeDrawer');
  if (heroToggle && heroDrawer) {
    heroToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = heroDrawer.classList.toggle('is-open');
      heroToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      heroDrawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      const arrow = heroToggle.querySelector('.city-hero-query-toggle-icon');
      if (arrow) arrow.innerHTML = isOpen ? '&#9652;' : '&#9662;';
    });
  }

  document.querySelectorAll('.city-why-btn[data-why-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.city-why-card');
      if (!card) return;
      const isExpanded = card.classList.toggle('is-expanded');
      btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      const details = card.querySelector('.city-why-details');
      if (details) details.setAttribute('aria-hidden', isExpanded ? 'false' : 'true');
    });
  });

  // Auto-expand Card 4 when Ordinance terms link is clicked
  document.querySelectorAll('a[href="#investment-incentives-code"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const card = document.getElementById('investment-incentives-code');
      if (card) {
        if (!card.classList.contains('is-expanded')) {
          const btn = card.querySelector('.city-why-btn[data-why-toggle]');
          if (btn) btn.click();
        }
        setTimeout(() => {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    });
  });

  document.querySelectorAll('.city-about-btn[data-about-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const item = btn.closest('.city-about-item');
      if (!item) return;
      const wasOpen = item.classList.contains('is-open');

      document.querySelectorAll('.city-about-item.is-open').forEach(other => {
        if (other !== item) {
          other.classList.remove('is-open');
          const otherBtn = other.querySelector('.city-about-btn');
          otherBtn?.classList.remove('is-open');
          otherBtn?.setAttribute('aria-expanded', 'false');
          const otherDrawer = other.querySelector('.city-about-drawer');
          otherDrawer?.setAttribute('aria-hidden', 'true');
        }
      });

      const isOpen = !wasOpen;
      item.classList.toggle('is-open', isOpen);
      btn.classList.toggle('is-open', isOpen);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      const drawer = item.querySelector('.city-about-drawer');
      if (drawer) drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    });
  });
}

async function initialize() {
  setupPrivacy();
  setupLandingFeatures();
  const bootstrap=await api.bootstrap();properties=(bootstrap.properties||[]).filter(property=>!property.isDeleted);categories=bootstrap.categories||{};criteria=bootstrap.criteria||{};
  compare=compare.filter(id=>properties.some(property=>property.id===id)).slice(0,3);saveCompare();
  if(investor){const result=await api.shortlist();saved=new Set(result.propertyIds||[]);}
  if(page==='city-investor'){
    document.getElementById('cityAreaStat').textContent=number(bootstrap.stats?.availableAreaHa);
    document.getElementById('cityPropertiesStat').textContent=number(bootstrap.stats?.availableProperties);
    document.getElementById('cityVisitsStat').textContent=number(bootstrap.stats?.siteVisits);
  }
  if (bootstrap.clupUseTypes?.length) {
    const allowedUseSelect = document.getElementById('cityAllowedUse');
    if (allowedUseSelect) {
      const existing = new Set(Array.from(allowedUseSelect.options).map(o => o.value));
      bootstrap.clupUseTypes.forEach(ut => {
        const val = ut.label || ut.category;
        if (val && !existing.has(val)) {
          existing.add(val);
          allowedUseSelect.add(new Option(val, val));
        }
      });
    }
  }
  if (page === 'city-details') { await renderDetails(); return; }
  setupFilters();synchronizeInvestorSort();render();setupMap();
}

window.addEventListener('sfc:investor-view-change', () => {
  if (!usesInvestorView) return;
  synchronizeInvestorSort(true);
  if (page !== 'city-details') render();
  else if (map) renderMarkers();
  if (map) {
    if (businessLayer) {
      if (advancedView() && document.getElementById('cityNearbyBusinesses')?.checked) businessLayer.addTo(map);
      else map.removeLayer(businessLayer);
    }
    if (detailsBusinessLayer) {
      if (advancedView()) detailsBusinessLayer.addTo(map);
      else map.removeLayer(detailsBusinessLayer);
    }
    requestAnimationFrame(() => map.invalidateSize({ pan: false }));
  }
});

initialize().catch(error => {
  console.error('INITIALIZE CAUGHT ERROR:', error);
  const msg = (error instanceof Error ? error.message : String(error)) || 'Unable to load properties.';
  for (const id of ['cityPropertyGrid', 'cityRankingTable', 'cityCompareMatrix', 'cityPropertyDetails']) {
    const root = document.getElementById(id);
    if (root) root.innerHTML = `<div class="city-error" role="alert">${esc(msg)} <button class="city-button city-button-secondary city-button-small" type="button" onclick="location.reload()">Try again</button></div>`;
  }
});
