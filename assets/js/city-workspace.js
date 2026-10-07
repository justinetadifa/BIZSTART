import { api } from './api.js';
import { evaluationMarkup, setupInvestmentEvaluation } from './investment-evaluation.js';

const config = window.SFC_APP_CONFIG || {};
const page = document.body.dataset.page;
const role = config.role || 'guest';
const investor = role === 'investor';
const params = new URLSearchParams(location.search);
const path = route => `${config.basePath || ''}/${route}`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number = value => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(Number(value) || 0);
const money = value => `₱${number(value)}`;
const score = value => value == null ? '—' : `${number(value)}/100`;
const storageKey = `locus.compare:${config.basePath || ''}:${config.user?.id || 'guest'}`;
let properties = [], categories = {}, criteria = {}, saved = new Set(), compare = [], filtered = [];
let expandedCards = new Set();
let map, markers, tileLayer;
let businessLayer;
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

function card(property, index) {
  const isExpanded = expandedCards.has(property.id);
  const accent = ({
    Land: 'tw-bg-[#fef3c7] tw-text-[#92400e] tw-border-[#fde68a]',
    Commercial: 'tw-bg-[#fef3c7] tw-text-[#92400e] tw-border-[#fde68a]',
    Office: 'tw-bg-blue-50 tw-text-blue-900 tw-border-blue-200',
    Hospitality: 'tw-bg-rose-50 tw-text-rose-900 tw-border-rose-200',
    Industrial: 'tw-bg-stone-100 tw-text-stone-700 tw-border-stone-200'
  })[property.category] || 'tw-bg-[#fef3c7] tw-text-[#92400e] tw-border-[#fde68a]';

  const mceVal = property.mceScore != null ? `${number(property.mceScore)}/100` : 'Not Available';
  const iaiVal = property.iaiScore != null ? `${number(property.iaiScore)}/100` : 'Not Available';
  const clupVal = property.clupProfile?.zoningClassification || (property.assessmentComplete ? 'Compatible' : 'For assessment');
  const cityAssessmentVal = property.assessmentComplete ? 'Completed' : 'Pending';
  const descText = property.description || property.thesis || `A ${number(property.area)}-hectare ${property.category?.toLowerCase() || 'prime'} parcel in ${property.barangay || property.city || 'San Fernando'}, ideal for business or mixed-use development.`;

  return `<article class="city-property-card locus-property-card tw-group tw-relative tw-bg-white tw-rounded-[22px] tw-border tw-border-slate-200/80 tw-shadow-sm hover:tw-shadow-xl hover:tw--translate-y-1 tw-transition-all tw-duration-300 tw-overflow-hidden ${isExpanded ? 'is-expanded' : ''}" data-property-id="${property.id}">
    <!-- Media / Satellite Image Container -->
    <div class="tw-relative tw-h-[260px] tw-w-full tw-overflow-hidden tw-bg-slate-100">
      <img class="tw-h-full tw-w-full tw-object-cover tw-transition-transform tw-duration-500 group-hover:tw-scale-105" src="${esc(imageUrl(property))}" alt="${esc(property.name)}" loading="lazy">
      
      <!-- Top-left: ● Available Badge -->
      <div class="tw-absolute tw-left-3 tw-top-3 tw-z-10 tw-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-white/95 tw-backdrop-blur-md tw-px-3 tw-py-1 tw-shadow-sm tw-border tw-border-white/60">
        <span class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-emerald-500 tw-inline-block"></span>
        <span class="tw-text-xs tw-font-semibold tw-text-slate-800">${esc(property.status || 'Available')}</span>
      </div>

      <!-- Floating Frosted Glass Panel -->
      <div class="locus-card-glass tw-absolute tw-inset-x-2.5 tw-bottom-2.5 tw-z-10 tw-p-3.5">
        <div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
          <div class="tw-min-w-0 tw-flex-1">
            <span class="tw-inline-flex tw-items-center tw-px-2.5 tw-py-0.5 tw-rounded-md tw-text-[11px] tw-font-semibold tw-border ${accent}">
              ${esc(property.subcategory || property.category || property.type || 'Commercial')}
            </span>
            <h3 class="tw-mt-1.5 tw-mb-0.5 tw-text-sm sm:tw-text-[15px] tw-font-bold tw-text-slate-900 tw-leading-tight tw-truncate">
              <a href="${path(`property-details.php?id=${property.id}`)}" class="hover:tw-text-[#9E1B22] tw-transition-colors">
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

          <button type="button" class="locus-card-toggle tw-w-9 tw-h-9 tw-rounded-full tw-bg-white tw-shadow-md tw-flex tw-items-center tw-justify-center tw-text-slate-700 hover:tw-bg-slate-50 hover:tw-scale-110 hover:tw-shadow-lg tw-transition-all tw-flex-shrink-0 tw-border tw-border-slate-100" data-toggle-card="${property.id}" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-label="Toggle details">
            <svg class="locus-card-toggle-icon tw-w-4 tw-h-4 tw-transition-transform tw-duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div class="tw-flex tw-items-baseline tw-justify-between tw-mt-2.5 tw-pt-1.5 tw-border-t tw-border-slate-900/5">
          <strong class="tw-text-lg sm:tw-text-xl tw-font-bold tw-text-[#11224D] tw-tracking-tight">
            ${money(property.price)}
          </strong>
          <span class="tw-text-xs sm:tw-text-sm tw-font-medium tw-text-slate-500">
            ${number(property.area)} ha
          </span>
        </div>
      </div>
    </div>

    <!-- Drop-down Drawer (Expanded Body) -->
    <div class="locus-card-drawer ${isExpanded ? 'is-open' : ''}" aria-hidden="${isExpanded ? 'false' : 'true'}">
      <div class="locus-card-drawer-inner">
        <div class="tw-p-4 tw-pt-3 tw-bg-white">
          <!-- 2x2 Assessment Grid -->
          <div class="tw-grid tw-grid-cols-2 tw-gap-2.5">
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
          <p class="tw-text-xs tw-text-slate-500 tw-leading-relaxed tw-mt-3.5 tw-mb-4 tw-line-clamp-2">
            ${esc(descText)}
          </p>

          <!-- 3 Red Pill Action Buttons -->
          <div class="tw-flex tw-items-center tw-gap-2 tw-mt-3.5">
            <a href="${path(`property-details.php?id=${property.id}`)}" class="locus-btn-red-pill tw-flex-1 tw-py-2 tw-px-2.5 tw-text-xs tw-text-center tw-whitespace-nowrap">
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

function getFiltered() {
  const query = (document.getElementById('citySearch')?.value || '').toLowerCase().trim();
  const category = document.getElementById('cityCategory')?.value || '';
  const subcategory = document.getElementById('citySubcategory')?.value || '';
  const savedOnly = document.getElementById('citySavedOnly')?.checked;
  const result = properties.filter(property => (!query || `${property.name} ${property.barangay || ''} ${property.city}`.toLowerCase().includes(query)) && (!category || property.category === category) && (!subcategory || property.subcategory === subcategory) && (!savedOnly || saved.has(property.id)));
  const sort = document.getElementById('citySort')?.value || 'newest';
  if (sort === 'iai' || sort === 'mce') result.sort((a, b) => (b[`${sort}Score`] ?? -1) - (a[`${sort}Score`] ?? -1) || a.id - b.id);
  else if (sort === 'price') result.sort((a, b) => a.price - b.price);
  else if (sort === 'area') result.sort((a, b) => b.area - a.area);
  return result;
}

function renderRanking() {
  const root = document.getElementById('cityRankingTable');
  if (!root) return;
  const assessed = filtered.filter(p => p.assessmentComplete);
  root.innerHTML = `<div class="tw-mb-5 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2"><p class="tw-m-0 tw-text-xs tw-text-muted">${assessed.length} assessed · ${filtered.length - assessed.length} awaiting assessment</p><span class="tw-text-[11px] tw-text-muted">IAI / 100 · higher is more favorable</span></div>` + (filtered.length ? `<div class="tw-grid tw-gap-3">${filtered.map(property => `<article class="tw-grid tw-grid-cols-[auto_1fr] tw-items-center tw-gap-4 tw-rounded-xl tw-border tw-border-solid tw-border-line tw-bg-white tw-p-4 sm:tw-grid-cols-[40px_64px_1fr_160px_auto] sm:tw-p-5">
    <div class="tw-hidden sm:tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-lg ${property.iaiRank === 1 ? 'tw-bg-amber-50 tw-text-amber-900' : 'tw-bg-paper tw-text-muted'} tw-text-sm tw-font-semibold">${property.iaiRank == null ? '—' : `#${property.iaiRank}`}</div>
    <a class="tw-relative tw-block" href="${path(`property-details.php?id=${property.id}`)}" tabindex="-1" aria-hidden="true"><img class="tw-h-16 tw-w-16 tw-rounded-lg tw-object-cover" src="${esc(imageUrl(property))}" alt="" loading="lazy"></a>
    <div class="tw-min-w-0"><a class="tw-text-sm tw-font-semibold" href="${path(`property-details.php?id=${property.id}`)}">${esc(property.name)}</a><p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-muted">${esc(property.barangay || property.city)} · ${esc(property.category)} · ${number(property.area)} ha</p></div>
    <div class="tw-col-span-2 tw-flex tw-items-center tw-gap-5 sm:tw-col-span-1"><div class="tw-min-w-16"><span class="tw-block tw-text-[10px] tw-text-muted">MCE</span><strong class="tw-text-base tw-tabular-nums">${property.mceScore == null ? '—' : number(property.mceScore)}</strong></div><div class="tw-flex-1"><span class="tw-block tw-text-[10px] tw-text-muted">IAI</span><strong class="tw-text-xl tw-tabular-nums tw-text-ink">${property.iaiScore == null ? '—' : number(property.iaiScore)}</strong>${property.iaiScore == null ? '<span class="tw-block tw-text-[10px] tw-text-muted">Awaiting assessment</span>' : `<progress class="tw-block tw-h-1 tw-w-full tw-accent-ink" value="${property.iaiScore}" max="100" aria-label="IAI score"></progress>`}</div></div>
    <button class="tw-col-span-2 tw-min-h-11 tw-rounded-lg tw-border tw-border-solid tw-border-line tw-bg-white tw-px-4 tw-text-xs tw-font-semibold sm:tw-col-span-1 hover:tw-bg-paper" type="button" data-compare="${property.id}" aria-pressed="${compare.includes(property.id)}">${compare.includes(property.id) ? 'Selected' : 'Compare'}</button>
  </article>`).join('')}</div>` : '<div class="city-empty">No matching properties. Try another category or barangay.</div>');
  document.getElementById('cityAssessmentMethod').textContent = properties.find(p => p.assessmentMethod)?.assessmentMethod || 'All seven criteria must be assessed before a score or rank is shown.';
}

function renderCompare() {
  const root = document.getElementById('cityCompareMatrix');
  if (!root) return;
  const selected = compare.map(id => properties.find(property => property.id === id)).filter(Boolean);
  if (!selected.length) { root.innerHTML = `<div class="city-empty"><h3>Choose properties to compare.</h3><p>Add up to three listings from the property list.</p><a class="city-button" href="${path(investor ? 'investor-dashboard.php' : 'property-explorer.php')}">Explore properties</a></div>`; return; }
  root.innerHTML = selected.map(property => `<article class="city-compare-column"><img src="${esc(imageUrl(property))}" alt="${esc(property.name)}"><div><h3><a href="${path(`property-details.php?id=${property.id}`)}">${esc(property.name)}</a></h3><dl>${[
    ['Category', property.subcategory || property.category], ['Location', property.barangay || property.city], ['Price', money(property.price)], ['Area', `${number(property.area)} ha`], ['Price / m²', money(property.pricePerSqm)], ['MCE', score(property.mceScore)], ['MCE rank', property.mceRank == null ? '—' : `#${property.mceRank}`], ['IAI', score(property.iaiScore)], ['IAI rank', property.iaiRank == null ? '—' : `#${property.iaiRank}`], ['Zoning', property.clupProfile?.zoningClassification || 'Awaiting review'], ...Object.entries(criteria).map(([key, label]) => [label, score(property.assessmentCriteria?.[key])]), ['Context', property.assessmentTags?.join(', ') || '—']
  ].map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><div class="city-card-actions"><button type="button" data-compare="${property.id}">Remove</button></div></div></article>`).join('');
}

function render() {
  filtered = page === 'city-landing' ? properties.slice(0, 3) : getFiltered();
  if (page === 'city-landing' && expandedCards.size === 0 && filtered.length > 0) {
    expandedCards.add(filtered[0].id);
  }
  const grid = document.getElementById('cityPropertyGrid');
  if (grid) grid.innerHTML = filtered.length ? filtered.map((property, idx) => card(property, idx)).join('') : '<div class="city-empty">No properties match your search.</div>';
  const count = document.getElementById('cityResultsCount');
  if (count) count.textContent = `${filtered.length} ${filtered.length === 1 ? 'property' : 'properties'}${role === 'guest' ? ' · public preview' : ''}`;
  renderTray(); renderRanking(); renderCompare();
  if (map) renderMarkers();
}

function setupFilters() {
  const category = document.getElementById('cityCategory');
  const subcategory = document.getElementById('citySubcategory');
  if (!category) return;
  Object.keys(categories).forEach(label => category.add(new Option(label, label)));
  function updateSubcategories() {
    subcategory.innerHTML = '<option value="">All subcategories</option>';
    (categories[category.value] || []).forEach(label => subcategory.add(new Option(label, label)));
    subcategory.disabled = !(categories[category.value]?.length);
  }
  if (Object.hasOwn(categories, params.get('category') || '')) category.value = params.get('category');
  updateSubcategories();
  category.addEventListener('change', () => { updateSubcategories(); render(); });
  subcategory.addEventListener('change', render);
  document.getElementById('citySort').addEventListener('change', render);
  document.getElementById('citySearch').addEventListener('input', render);
  document.getElementById('cityFilters').addEventListener('submit', event => event.preventDefault());
  const only = document.getElementById('citySavedOnly');
  if (only) { only.checked = params.get('view') === 'saved'; only.addEventListener('change', render); }
  if (page === 'city-ranking') document.getElementById('citySort').value = 'iai';
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

function formatShortPrice(num) {
  const n = Number(num) || 0;
  if (n >= 1e6) return `₱${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M`;
  if (n >= 1e3) return `₱${Math.round(n / 1e3)}K`;
  return `₱${n}`;
}

function getIaiTier(scoreNum) {
  if (scoreNum == null) return { key: 'pending', label: 'Awaiting assessment', class: 'tw-bg-slate-300' };
  const s = Number(scoreNum) || 0;
  if (s >= 90) return { key: 'prime', label: 'Prime', class: 'tier-prime' };
  if (s >= 80) return { key: 'strong', label: 'Strong', class: 'tier-strong' };
  return { key: 'emerging', label: 'Emerging', class: 'tier-emerging' };
}

function createPillIcon(property, isHovered = false, isActive = false) {
  const tier = getIaiTier(property.iaiScore);
  const priceLabel = formatShortPrice(property.price);
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
            <span class="pin-dot ${tier.class}" title="${tier.label} Tier (${property.iaiScore || 0}/100)"></span>
            <span class="pin-price">${priceLabel}</span>
            ${iaiScore != null ? `<span class="pin-iai-badge">${iaiScore}</span>` : ''}
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
  const isPrime = avg && avg >= 90;

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
          ${avg != null ? `<span class="cluster-sub">avg ${avg}</span>` : ''}
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
          <span class="locus-popup-tag">${category}</span>
          <span class="locus-popup-tag tag-muted">${zoning}</span>
        </div>
      </div>
      <div class="locus-popup-body">
        <h4 class="locus-popup-title"><a href="${path(`property-details.php?id=${property.id}`)}">${esc(property.name)}</a></h4>
        <p class="locus-popup-loc">${esc(property.barangay || property.city)}, San Fernando</p>
        <div class="locus-popup-pricing">
          <div class="locus-popup-price">${money(property.price)}</div>
          <div class="locus-popup-area">${number(property.area)} ha · ${money(property.pricePerSqm)}/m²</div>
        </div>
        ${iaiVal != null ? `
          <div class="locus-popup-metrics">
            <div class="locus-metric-row">
              <span class="locus-metric-label"><i class="pin-dot ${tier.class}"></i> IAI Attractiveness</span>
              <strong class="locus-metric-value">${iaiVal}<small>/100</small></strong>
            </div>
            <div class="locus-metric-bar"><div class="locus-metric-fill ${tier.class}" style="width:${Math.min(iaiVal, 100)}%"></div></div>
          </div>
        ` : ''}
        <div class="locus-popup-footer">
          <a class="locus-popup-btn" href="${path(`property-details.php?id=${property.id}`)}">View property insights →</a>
        </div>
      </div>
    </div>
  `;
}

function setupMap() {
  if (!document.getElementById('cityPropertyMap')) return;
  if (!window.L) {
    document.getElementById('cityPropertyMap').innerHTML = '<div class="city-empty">Map unavailable. Property listings are still available.</div>';
    return;
  }
  map = L.map('cityPropertyMap', {
    scrollWheelZoom: false,
    zoomControl: true,
    maxZoom: 19,
    minZoom: 9,
  }).setView([16.6159, 120.3166], 13);

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
        businessLayer = L.geoJSON(await response.json(), {
          pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 6, color: '#fff', weight: 2, fillColor: '#1d4ed8', fillOpacity: 0.95 }),
          onEachFeature: (feature, layer) => layer.bindPopup(`<div class="city-popup"><strong>${esc(feature.properties?.name || 'Local business')}</strong><p>${esc(feature.properties?.note || 'Stored local business location.')}</p>${feature.properties?.checkedOn ? `<small>Checked ${esc(feature.properties.checkedOn)}</small>` : ''}</div>`),
        });
      }
      if (event.target.checked) {
        businessLayer.addTo(map);
        status.textContent = 'Stored locations';
      }
    } catch (error) {
      event.target.checked = false;
      status.textContent = error.message;
    }
  });

  setupCardHoverSync();
}

function setMapLayer(layer) {
  if (tileLayer) map.removeLayer(tileLayer);
  currentMapLayer = layer;

  if (layer === 'satellite') {
    tileLayer = L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles © Esri, Maxar'
      }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        opacity: 0.85
      })
    ]);
  } else if (layer === 'streets') {
    tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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
    if (!Number.isFinite(Number(property.lat)) || !Number.isFinite(Number(property.lng))) return;

    const marker = L.marker([property.lat, property.lng], {
      icon: createPillIcon(property)
    });
    marker.propertyId = property.id;
    marker.propertyData = property;

    marker.bindPopup(createPopupContent(property), {
      className: 'locus-popup',
      maxWidth: 300,
      minWidth: 260
    });

    marker.on('mouseover', () => {
      marker.setIcon(createPillIcon(property, true));
      const card = document.querySelector(`.city-property-card[data-property-id="${property.id}"]`);
      if (card) card.classList.add('is-map-hovered');
    });

    marker.on('mouseout', () => {
      marker.setIcon(createPillIcon(property, false));
      const card = document.querySelector(`.city-property-card[data-property-id="${property.id}"]`);
      if (card) card.classList.remove('is-map-hovered');
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
    if (marker && marker.propertyData) {
      marker.setIcon(createPillIcon(marker.propertyData, true));
    }
  });

  grid.addEventListener('mouseout', event => {
    const card = event.target.closest('.city-property-card');
    if (!card) return;
    const id = Number(card.dataset.propertyId);
    const marker = markerMap.get(id);
    if (marker && marker.propertyData) {
      marker.setIcon(createPillIcon(marker.propertyData, false));
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

function nearbyMarkup(property) {
  if (!property.nearbyProperties?.length) return '';
  return `<section class="tw-mb-5 tw-rounded-xl tw-border tw-border-solid tw-border-line tw-bg-white tw-p-5"><h2 class="tw-mb-4 tw-text-xl">Around this property</h2><div class="tw-grid tw-gap-3 sm:tw-grid-cols-2">${property.nearbyProperties.map(item => `<article class="tw-flex tw-items-center tw-gap-3 tw-rounded-lg tw-bg-paper tw-p-3">${item.imageUrl ? `<img class="tw-h-16 tw-w-16 tw-shrink-0 tw-rounded-lg tw-object-cover" src="${esc(imageUrl(item))}" alt="${esc(item.name)}" loading="lazy">` : ''}<div class="tw-min-w-0"><strong class="tw-text-xs">${esc(item.name)}</strong><p class="tw-mb-0 tw-mt-1 tw-text-[11px]">${esc(item.type || 'Nearby property')}${item.distanceKm == null ? '' : ` · ${number(item.distanceKm)} km`}</p></div></article>`).join('')}</div></section>`;
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
  root.innerHTML = `<div class="city-page-heading tw-flex-wrap tw-items-start"><div><div class="city-eyebrow">${esc(property.category)}${property.subcategory ? ` / ${esc(property.subcategory)}` : ''}</div><h1>${esc(property.name)}</h1><p>${esc(property.barangay || '')}${property.barangay ? ', ' : ''}${esc(property.city)}</p></div></div>
  <div class="city-detail-grid"><div><img class="city-detail-image" src="${esc(imageUrl(property))}" alt="${esc(property.name)}"><section class="city-detail-panel" style="margin-top:20px"><h2>Property overview</h2><p>${esc(property.description)}</p><dl class="city-detail-list">${[['Area',`${number(property.area)} ha`],['Price / m²', money(property.pricePerSqm)],['Zoning', property.clupProfile?.zoningClassification || 'Awaiting review'],['Status',property.status]].map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${property.assessmentTags?.length ? `<div class="city-sector-list">${property.assessmentTags.map(tag=>`<span class="city-tag">${esc(tag)}</span>`).join('')}</div><p class="city-assessment-note">${esc(property.readinessNotes || 'Context selected by the reviewing department.')}</p>` : ''}</section>${nearbyMarkup(property)}${evaluationMarkup(property, config.policy || {})}
  <section class="city-detail-panel"><h2>City assessment</h2><div class="city-card-scores" style="margin:0 0 22px;border:0;padding:0;font-size:14px"><span>MCE <strong>${score(property.mceScore)}</strong>${property.mceRank ? ` · #${property.mceRank}` : ''}</span><span>IAI <strong>${score(property.iaiScore)}</strong>${property.iaiRank ? ` · #${property.iaiRank}` : ''}</span></div><div class="city-detail-criteria">${Object.entries(criteria).map(([key,label])=>`<div><span>${esc(label)}</span><strong>${score(property.assessmentCriteria?.[key])}</strong>${property.assessmentCriteria?.[key] == null ? '' : `<progress value="${property.assessmentCriteria[key]}" max="100" aria-label="${esc(label)}"></progress>`}</div>`).join('')}</div><details class="city-assessment-note"><summary>Assessment method</summary><p>${esc(property.assessmentMethod)}</p></details></section></div>
  <aside><section class="city-detail-panel"><div class="city-card-price" style="font-size:30px;margin-bottom:20px">${money(property.price)}</div><div class="city-actions">${investor ? `<button class="city-button" type="button" data-save="${property.id}" aria-pressed="${saved.has(property.id)}">${saved.has(property.id)?'Saved':'Save property'}</button>` : ''}<button class="city-button city-button-secondary" type="button" data-compare="${property.id}" aria-pressed="${compare.includes(property.id)}">${compare.includes(property.id)?'Added to compare':'Compare'}</button></div><hr style="border:0;border-top:1px solid var(--city-border);margin:25px 0"><h3>${property.contactMode === 'broker' ? 'Contact broker' : 'Open listing'}</h3>${role === 'guest' ? `<p>Log in to view contacts and inquire.</p><a class="city-button" href="${path('investor-login.php')}">Log in</a>` : broker ? `<p>${esc(broker.name)}</p>${broker.phone ? `<a class="city-link" href="tel:${esc(broker.phone.replace(/[^+\d]/g,''))}">${esc(broker.phone)}</a>` : ''}${broker.email ? `<p><a class="city-link" href="mailto:${esc(broker.email)}">${esc(broker.email)}</a></p>` : ''}` : `<p>${property.contactMode === 'broker' ? 'Contact details are awaiting city confirmation.' : 'Contact LEBDO for listing assistance.'}</p><a class="city-link" href="https://cc.sanfernandocity.gov.ph/lebdo/" target="_blank" rel="noopener">LEBDO contact information ↗</a>`}</section><section class="city-detail-panel"><h3>Location</h3><div class="city-map-canvas tw-h-64" id="cityPropertyMap"></div></section>${canInquire ? `<details class="city-detail-panel" id="cityInquiryPanel"><summary>Send an inquiry</summary><div id="cityConversation" style="margin:15px 0"></div><form id="cityInquiryForm" class="city-field"><label for="cityInquiryText">Message</label><textarea id="cityInquiryText" required maxlength="4000" rows="4" placeholder="Ask about this property"></textarea><button class="city-button" type="submit">Send message</button></form></details>` : ''}${investor ? investorTools(property, Boolean(canInquire)) : ''}</aside></div>`;
  filtered = [property]; setupMap(); setupInvestmentEvaluation(property, config.policy || {});
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
    const id = Number(toggleButton.dataset.toggleCard);
    const cardEl = toggleButton.closest('.city-property-card');
    if (cardEl) {
      const drawer = cardEl.querySelector('.locus-card-drawer');
      const isCurrentlyExpanded = expandedCards.has(id);
      if (isCurrentlyExpanded) {
        expandedCards.delete(id);
        cardEl.classList.remove('is-expanded');
        toggleButton.setAttribute('aria-expanded', 'false');
        if (drawer) {
          drawer.classList.remove('is-open');
          drawer.setAttribute('aria-hidden', 'true');
        }
      } else {
        expandedCards.add(id);
        cardEl.classList.add('is-expanded');
        toggleButton.setAttribute('aria-expanded', 'true');
        if (drawer) {
          drawer.classList.add('is-open');
          drawer.setAttribute('aria-hidden', 'false');
        }
      }
    }
    return;
  }
  const saveButton = event.target.closest('[data-save]');
  const compareButton = event.target.closest('[data-compare]');
  const locateButton = event.target.closest('[data-locate]');
  if (saveButton) {
    const id=Number(saveButton.dataset.save); saveButton.disabled=true;
    try {
      const response=await fetch(`${config.apiBase}/cart.php`,{method:saved.has(id)?'DELETE':'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':config.csrfToken},credentials:'same-origin',body:JSON.stringify({propertyId:id})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error);
      saved=new Set(payload.propertyIds); if(page==='city-details'){saveButton.textContent=saved.has(id)?'Saved':'Save property';saveButton.setAttribute('aria-pressed',String(saved.has(id)));}else render();
      toast(saved.has(id)?'Property saved.':'Property removed from saved.');
    }catch(error){toast(error.message);}finally{saveButton.disabled=false;}
  }
  if (compareButton) {
    const id=Number(compareButton.dataset.compare);
    if(compare.includes(id))compare=compare.filter(value=>value!==id);
    else if(compare.length<3)compare.push(id);
    else {toast('Compare up to three properties. Remove one to add another.');return;}
    saveCompare();if(page==='city-details'){compareButton.textContent=compare.includes(id)?'Added to compare':'Compare';compareButton.setAttribute('aria-pressed',String(compare.includes(id)));}else render();
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
  if (select) {
    const notes = {
      wages: 'Check the current Region I wage order for the applicable activity and establishment size.',
      rent: 'Compare the listing’s asking price and lease terms. Confirm deposits, fit-out costs and escalation with the property contact.',
      power: 'Request the current commercial tariff and a connection estimate for the chosen site.',
      water: 'Confirm the service area, commercial tariff and connection requirements with the site’s water provider.',
      internet: 'Ask providers to confirm coverage, installation cost and the plan suited to your business at this address.'
    };
    select.addEventListener('change', () => document.getElementById('cityCostNote').textContent = notes[select.value]);
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
  const bootstrap=await api.bootstrap();properties=bootstrap.properties||[];categories=bootstrap.categories||{};criteria=bootstrap.criteria||{};
  compare=compare.filter(id=>properties.some(property=>property.id===id)).slice(0,3);saveCompare();
  if(investor){const result=await api.shortlist();saved=new Set(result.propertyIds||[]);}
  if(page==='city-investor'){
    document.getElementById('cityAreaStat').textContent=number(bootstrap.stats?.availableAreaHa);
    document.getElementById('cityPropertiesStat').textContent=number(bootstrap.stats?.availableProperties);
    document.getElementById('cityVisitsStat').textContent=number(bootstrap.stats?.siteVisits);
  }
  if(page==='city-details'){await renderDetails();return;}
  setupFilters();render();setupMap();
}

initialize().catch(error => {
  console.error('INITIALIZE CAUGHT ERROR:', error);
  const msg = (error instanceof Error ? error.message : String(error)) || 'Unable to load properties.';
  for (const id of ['cityPropertyGrid', 'cityRankingTable', 'cityCompareMatrix', 'cityPropertyDetails']) {
    const root = document.getElementById(id);
    if (root) root.innerHTML = `<div class="city-error" role="alert">${esc(msg)} <button class="city-button city-button-secondary city-button-small" type="button" onclick="location.reload()">Try again</button></div>`;
  }
});
