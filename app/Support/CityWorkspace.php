<?php
declare(strict_types=1);

function sfc_render_city_workspace(array $context, string $heading, string $description, string $mode): void
{
    $e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    $isLoopNetView = $mode === 'investor' && ($_GET['view'] ?? '') !== 'saved';
    $firstName = explode(' ', trim((string) ($context['user']['name'] ?? 'Investor')))[0];
    ?>
<?php if ($isLoopNetView): ?>
<div class="city-hero-frame">
  <div class="city-accent-stripe city-accent-stripe-top" aria-hidden="true">
    <span class="stripe-segment stripe-red"></span>
    <span class="stripe-segment stripe-blue"></span>
  </div>
  <section class="tw-relative tw-overflow-hidden tw-bg-ink tw-text-white" aria-labelledby="investorHeroTitle">
    <img class="tw-absolute tw-inset-0 tw-h-full tw-w-full tw-object-cover tw-opacity-20" src="<?= $e($context['assetBase']) ?>/images/locusherosec.png" alt="" fetchpriority="high">
    <div class="city-container tw-relative tw-py-10 md:tw-py-14">
      <h1 id="investorHeroTitle" class="city-hero-title">YOUR NEXT<br>OPPORTUNITY<br>STARTS HERE.</h1>
      <p class="city-hero-subtitle">Find a place for your business. Explore local properties with<br>city assessments and clear investment insights.</p>
    <form id="cityHeroSearch" class="tw-grid tw-max-w-3xl tw-grid-cols-1 tw-gap-2 tw-rounded-xl tw-border tw-border-white/20 tw-bg-white tw-p-2 sm:tw-grid-cols-[1fr_190px_auto]" role="search" aria-label="Find a property">
      <label class="tw-min-w-0"><span class="tw-sr-only">Property or barangay</span><input id="citySearchGlass" class="tw-w-full tw-border-0 tw-bg-transparent tw-text-ink" type="search" placeholder="Property or barangay" autocomplete="off"></label>
      <label class="tw-min-w-0"><span class="tw-sr-only">Property type</span><select id="cityHeroCategory" class="tw-w-full tw-border-0 tw-bg-paper tw-text-ink"><option value="">All property types</option></select></label>
      <button id="citySearchSubmit" class="tw-min-h-11 tw-rounded-lg tw-border-0 tw-bg-ink tw-px-6 tw-py-2.5 tw-text-sm tw-font-semibold tw-text-white hover:tw-bg-slate-800" type="submit">Find properties</button>
    </form>
    <div class="tw-mt-5 tw-flex tw-flex-wrap tw-gap-2" aria-label="Quick property types">
      <?php foreach (['Retail' => ['Shops & retail','tw-bg-amber-50 tw-text-amber-900'], 'Office' => ['Office spaces','tw-bg-blue-50 tw-text-blue-900'], 'Hospitality' => ['Hospitality','tw-bg-rose-50 tw-text-rose-900'], 'Land' => ['Land & lots','tw-bg-stone-100 tw-text-stone-800']] as $category => [$label,$color]): ?>
      <button type="button" data-quick-category="<?= $e($category) ?>" aria-pressed="false" class="tw-min-h-10 tw-rounded-lg tw-border tw-border-transparent tw-px-4 tw-py-2 tw-text-xs tw-font-semibold <?= $color ?> hover:tw-border-white"><?= $e($label) ?> <span aria-hidden="true">↗</span></button>
      <?php endforeach; ?>
    </div>
  </div>
</section>
</div>
<div class="city-container tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-border-b tw-border-line tw-py-6">
  <div><h2 class="tw-mb-1 tw-text-lg">Welcome, <?= $e($firstName) ?>.</h2><p class="tw-m-0 tw-text-sm">Your next opportunity starts with the right site.</p></div>
  <div class="tw-flex tw-flex-wrap tw-gap-2"><a class="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-line tw-bg-white tw-px-4 tw-py-2.5 tw-text-xs tw-font-semibold" href="<?= $e(sfc_path('/property-ranking.php')) ?>"><span class="tw-w-4 tw-h-4"><?= sfc_icon('ranking') ?></span> Priority board</a><a class="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-line tw-bg-white tw-px-4 tw-py-2.5 tw-text-xs tw-font-semibold" href="<?= $e(sfc_path('/property-explorer.php')) ?>"><span class="tw-w-4 tw-h-4"><?= sfc_icon('map') ?></span> Map</a><a class="tw-px-3 tw-py-2.5 tw-text-xs tw-font-semibold tw-text-amber" href="<?= $e(sfc_path('/index.php#why-invest')) ?>">Why San Fernando? ↗</a></div>
</div>
<?php endif; ?>

<?php if ($mode === 'ranking'): ?>
<div class="priority-hero-frame tw-relative tw-overflow-hidden tw-bg-[#0B1528] tw-text-white tw-border-b tw-border-slate-800" aria-labelledby="priorityBoardTitle">
  <img class="tw-absolute tw-inset-0 tw-h-full tw-w-full tw-object-cover tw-opacity-30" src="<?= $e($context['assetBase']) ?>/images/locusherosec.png" alt="" fetchpriority="high">
  <div class="tw-absolute tw-inset-0 tw-bg-gradient-to-r tw-from-[#0B1528]/95 tw-via-[#0B1528]/80 tw-to-[#0B1528]/60"></div>
  <div class="city-container tw-relative tw-py-8 sm:tw-py-10 tw-flex tw-flex-col lg:tw-flex-row tw-items-start lg:tw-items-center tw-justify-between tw-gap-6">
    <div class="tw-max-w-xl">
      <div class="tw-flex tw-items-center tw-gap-1.5 tw-text-[11px] tw-font-bold tw-tracking-widest tw-uppercase tw-text-slate-300/80 tw-mb-2.5">
        <span aria-hidden="true">→</span>
        <span>CIC TO WORKSPACE</span>
      </div>
      <div class="tw-flex tw-items-stretch tw-gap-3.5">
        <div class="tw-w-1.5 tw-bg-[#9E1B22] tw-rounded-full tw-shrink-0"></div>
        <div>
          <h1 id="priorityBoardTitle" class="tw-text-3xl sm:tw-text-4xl tw-font-extrabold tw-text-white tw-tracking-tight tw-m-0" style="font-family: 'Poppins', 'Inter', sans-serif;">Priority board</h1>
          <p class="tw-text-sm sm:tw-text-base tw-text-slate-300 tw-mt-1.5 tw-mb-0">City assessments, side by side.</p>
        </div>
      </div>
    </div>

    <!-- Floating Stats Widget -->
    <div class="tw-bg-white tw-rounded-2xl tw-shadow-xl tw-p-3.5 sm:tw-p-4 tw-flex tw-items-center tw-gap-3 sm:tw-gap-5 tw-border tw-border-slate-100 tw-text-slate-800 tw-shrink-0">
      <div class="tw-text-[#9E1B22] tw-shrink-0 tw-p-1">
        <svg class="tw-w-7 tw-h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 19h4V9H4v10zm6 0h4V5h-4v14zm6 0h4v-7h-4v7z"/>
        </svg>
      </div>
      <div class="tw-text-left">
        <strong class="tw-block tw-text-2xl sm:tw-text-3xl tw-font-extrabold tw-text-slate-900 tw-leading-tight" id="priorityStatTotal">13</strong>
        <span class="tw-block tw-text-[11px] tw-font-medium tw-text-slate-500 tw-mt-0.5">Total properties</span>
      </div>
      <div class="tw-w-px tw-h-9 tw-bg-slate-200"></div>
      <div class="tw-text-left">
        <div class="tw-flex tw-items-center tw-gap-1.5">
          <span class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-amber-500"></span>
          <strong class="tw-text-2xl sm:tw-text-3xl tw-font-extrabold tw-text-slate-900 tw-leading-tight" id="priorityStatReview">1</strong>
        </div>
        <span class="tw-block tw-text-[11px] tw-font-medium tw-text-slate-500 tw-mt-0.5">Awaiting review</span>
      </div>
      <div class="tw-w-px tw-h-9 tw-bg-slate-200"></div>
      <div class="tw-text-left">
        <div class="tw-flex tw-items-center tw-gap-1.5">
          <span class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-emerald-500"></span>
          <strong class="tw-text-2xl sm:tw-text-3xl tw-font-extrabold tw-text-slate-900 tw-leading-tight" id="priorityStatPublished">8</strong>
        </div>
        <span class="tw-block tw-text-[11px] tw-font-medium tw-text-slate-500 tw-mt-0.5">Published</span>
      </div>
      <div class="tw-w-px tw-h-9 tw-bg-slate-200"></div>
      <div class="tw-text-left">
        <div class="tw-flex tw-items-center tw-gap-1.5">
          <span class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-[#11224D]"></span>
          <strong class="tw-text-2xl sm:tw-text-3xl tw-font-extrabold tw-text-slate-900 tw-leading-tight" id="priorityStatNeedsAssessment">4</strong>
        </div>
        <span class="tw-block tw-text-[11px] tw-font-medium tw-text-slate-500 tw-mt-0.5">Needs assessment</span>
      </div>
    </div>
  </div>
</div>
<?php endif; ?>

<main class="city-container city-workspace" id="propertyResults">
  <?php if ($mode === 'explorer'): ?>
  <div class="tw-mb-4">
    <h1 class="tw-text-2xl sm:tw-text-3xl tw-font-black tw-italic tw-tracking-tight tw-text-[#9E1B22] tw-uppercase tw-m-0" style="font-family: 'Poppins', sans-serif;">MAP EXPLORER</h1>
    <p class="tw-text-sm tw-text-slate-500 tw-mt-1 tw-mb-0">Explore properties by location.</p>
  </div>
  <?php elseif (!$isLoopNetView && $mode !== 'ranking'): ?>
  <div class="city-page-heading tw-flex-wrap tw-items-start">
    <div><h1><?= $e($heading) ?></h1><p><?= $e($description) ?></p></div>
    <?php if ($mode === 'investor'): ?>
      <a class="city-button city-button-secondary" href="<?= $e(sfc_path('/property-explorer.php')) ?>"><?= sfc_icon('map') ?> Map view</a>
    <?php endif; ?>
  </div>
  <?php endif; ?>

  <?php if ($mode === 'investor'): ?>
<section class="tw-mb-7 tw-grid tw-grid-cols-3 tw-gap-2 sm:tw-gap-4" aria-label="City property statistics">
    <?php foreach (['cityAreaStat' => ['Available land','hectares','tw-bg-amber-50'], 'cityPropertiesStat' => ['Available sites','properties','tw-bg-blue-50'], 'cityVisitsStat' => ['Site visits','recorded visits','tw-bg-stone-100']] as $id => [$label,$unit,$color]): ?>
    <div class="city-stat tw-rounded-xl tw-border tw-border-line tw-p-3 sm:tw-p-5 <?= $color ?>"><span class="tw-text-[11px] tw-font-semibold tw-text-muted"><?= $e($label) ?></span><strong class="tw-mt-1 tw-text-2xl tw-text-ink" id="<?= $id ?>">—</strong><span class="tw-text-[10px] tw-text-muted"><?= $e($unit) ?></span></div>
    <?php endforeach; ?>
  </section>
  <?php endif; ?>

  <?php if ($mode !== 'compare'): ?>
  <?php if ($mode === 'explorer'): ?>
  <form class="tw-bg-white tw-rounded-2xl tw-border tw-border-slate-200/90 tw-shadow-sm tw-p-2.5 sm:tw-p-3 tw-flex tw-flex-wrap lg:tw-flex-nowrap tw-items-center tw-gap-2.5 sm:tw-gap-3 tw-mb-4" id="cityFilters" role="search" aria-label="Refine listings">
    <!-- Search -->
    <div class="tw-relative tw-flex-1 tw-min-w-[200px]">
      <div class="tw-absolute tw-left-3.5 tw-top-1/2 tw--translate-y-1/2 tw-pointer-events-none tw-text-slate-400">
        <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <circle cx="11" cy="11" r="7"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.3-4.3"/>
        </svg>
      </div>
      <input id="citySearch" type="search" placeholder="Property or barangay" autocomplete="off" class="tw-w-full tw-pl-10 tw-pr-3.5 tw-py-2 tw-rounded-xl tw-border tw-border-slate-200 tw-text-sm tw-text-slate-800 tw-bg-transparent placeholder:tw-text-slate-400 focus:tw-outline-none focus:tw-border-[#9E1B22] focus:tw-ring-1 focus:tw-ring-[#9E1B22] tw-transition-all">
    </div>

    <!-- Category -->
    <div class="tw-relative tw-w-full sm:tw-w-auto sm:tw-min-w-[160px]">
      <div class="tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-pointer-events-none tw-text-slate-500">
        <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      </div>
      <select id="cityCategory" class="tw-w-full tw-pl-9 tw-pr-8 tw-py-2 tw-rounded-xl tw-border tw-border-slate-200 tw-text-sm tw-font-medium tw-text-slate-700 tw-bg-white hover:tw-border-slate-300 focus:tw-outline-none focus:tw-border-[#9E1B22] tw-appearance-none tw-cursor-pointer tw-transition-all">
        <option value="">All categories</option>
      </select>
      <div class="tw-absolute tw-right-2.5 tw-top-1/2 tw--translate-y-1/2 tw-pointer-events-none tw-text-slate-400">
        <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </div>

    <!-- Subcategory -->
    <div class="tw-relative tw-w-full sm:tw-w-auto sm:tw-min-w-[170px]">
      <div class="tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-pointer-events-none tw-text-slate-500">
        <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <select id="citySubcategory" disabled class="tw-w-full tw-pl-9 tw-pr-8 tw-py-2 tw-rounded-xl tw-border tw-border-slate-200 tw-text-sm tw-font-medium tw-text-slate-700 tw-bg-white hover:tw-border-slate-300 focus:tw-outline-none focus:tw-border-[#9E1B22] tw-appearance-none tw-cursor-pointer disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-transition-all">
        <option value="">All subcategories</option>
      </select>
      <div class="tw-absolute tw-right-2.5 tw-top-1/2 tw--translate-y-1/2 tw-pointer-events-none tw-text-slate-400">
        <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </div>

    <!-- Sort -->
    <div class="tw-relative tw-w-full sm:tw-w-auto sm:tw-min-w-[130px]">
      <div class="tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-pointer-events-none tw-text-slate-500">
        <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      </div>
      <select id="citySort" class="tw-w-full tw-pl-9 tw-pr-8 tw-py-2 tw-rounded-xl tw-border tw-border-slate-200 tw-text-sm tw-font-medium tw-text-slate-700 tw-bg-white hover:tw-border-slate-300 focus:tw-outline-none focus:tw-border-[#9E1B22] tw-appearance-none tw-cursor-pointer tw-transition-all">
        <option value="newest">Newest</option>
        <option value="iai">IAI score</option>
        <option value="mce">MCE score</option>
        <option value="price">Price: low to high</option>
        <option value="area">Area: largest</option>
      </select>
      <div class="tw-absolute tw-right-2.5 tw-top-1/2 tw--translate-y-1/2 tw-pointer-events-none tw-text-slate-400">
        <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </div>

    <!-- Reset filters -->
    <button type="button" id="cityResetFilters" class="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-3.5 tw-py-2 tw-text-sm tw-font-semibold tw-text-[#9E1B22] hover:tw-text-[#80141a] hover:tw-bg-red-50/70 tw-rounded-xl tw-transition-colors tw-whitespace-nowrap tw-border-0 tw-bg-transparent tw-cursor-pointer">
      <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      <span>Reset filters</span>
    </button>
  </form>
  <?php elseif ($mode === 'ranking'): ?>
  <form class="tw-bg-white tw-rounded-2xl tw-border tw-border-slate-200/90 tw-shadow-sm tw-p-3 sm:tw-p-4 tw-flex tw-flex-wrap lg:tw-flex-nowrap tw-items-end tw-gap-3 sm:tw-gap-4 tw-mb-5" id="cityFilters" role="search" aria-label="Refine listings">
    <!-- Search -->
    <div class="tw-relative tw-flex-1 tw-min-w-[220px]">
      <div class="tw-absolute tw-left-3.5 tw-top-1/2 tw--translate-y-1/2 tw-pointer-events-none tw-text-slate-400">
        <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <circle cx="11" cy="11" r="7"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.3-4.3"/>
        </svg>
      </div>
      <input id="citySearch" type="search" placeholder="Search property, barangay, or keyword..." autocomplete="off" class="tw-w-full tw-pl-10 tw-pr-3.5 tw-py-2.5 tw-rounded-xl tw-border tw-border-slate-200 tw-text-sm tw-text-slate-800 tw-bg-white placeholder:tw-text-slate-400 focus:tw-outline-none focus:tw-border-[#9E1B22] focus:tw-ring-1 focus:tw-ring-[#9E1B22] tw-transition-all">
    </div>

    <!-- Category -->
    <div class="tw-w-full sm:tw-w-auto sm:tw-min-w-[160px]">
      <span class="tw-block tw-text-[11px] tw-font-semibold tw-text-slate-500 tw-mb-1">Category</span>
      <div class="tw-relative">
        <select id="cityCategory" class="tw-w-full tw-pl-3 tw-pr-8 tw-py-2.5 tw-rounded-xl tw-border tw-border-slate-200 tw-text-sm tw-font-medium tw-text-slate-700 tw-bg-white hover:tw-border-slate-300 focus:tw-outline-none focus:tw-border-[#9E1B22] tw-appearance-none tw-cursor-pointer tw-transition-all">
          <option value="">All categories</option>
        </select>
        <div class="tw-absolute tw-right-2.5 tw-top-1/2 tw--translate-y-1/2 tw-pointer-events-none tw-text-slate-400">
          <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Subcategory -->
    <div class="tw-w-full sm:tw-w-auto sm:tw-min-w-[170px]">
      <span class="tw-block tw-text-[11px] tw-font-semibold tw-text-slate-500 tw-mb-1">Subcategory</span>
      <div class="tw-relative">
        <select id="citySubcategory" disabled class="tw-w-full tw-pl-3 tw-pr-8 tw-py-2.5 tw-rounded-xl tw-border tw-border-slate-200 tw-text-sm tw-font-medium tw-text-slate-700 tw-bg-white hover:tw-border-slate-300 focus:tw-outline-none focus:tw-border-[#9E1B22] tw-appearance-none tw-cursor-pointer disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-transition-all">
          <option value="">All subcategories</option>
        </select>
        <div class="tw-absolute tw-right-2.5 tw-top-1/2 tw--translate-y-1/2 tw-pointer-events-none tw-text-slate-400">
          <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Sort by -->
    <div class="tw-w-full sm:tw-w-auto sm:tw-min-w-[190px]">
      <span class="tw-block tw-text-[11px] tw-font-semibold tw-text-slate-500 tw-mb-1">Sort by</span>
      <div class="tw-relative">
        <select id="citySort" class="tw-w-full tw-pl-3 tw-pr-8 tw-py-2.5 tw-rounded-xl tw-border tw-border-slate-200 tw-text-sm tw-font-medium tw-text-slate-700 tw-bg-white hover:tw-border-slate-300 focus:tw-outline-none focus:tw-border-[#9E1B22] tw-appearance-none tw-cursor-pointer tw-transition-all">
          <option value="iai" selected>IAI score (High to Low)</option>
          <option value="mce">MCE score (High to Low)</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="area">Area: Largest</option>
          <option value="newest">Newest</option>
        </select>
        <div class="tw-absolute tw-right-2.5 tw-top-1/2 tw--translate-y-1/2 tw-pointer-events-none tw-text-slate-400">
          <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- View Switcher -->
    <div class="tw-w-full sm:tw-w-auto">
      <span class="tw-block tw-text-[11px] tw-font-semibold tw-text-slate-500 tw-mb-1">View</span>
      <div class="tw-inline-flex tw-items-center tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50/80 tw-p-1" role="group" aria-label="View layout">
        <button type="button" id="priorityViewList" class="tw-p-1.5 tw-rounded-lg tw-bg-[#11224D] tw-text-white tw-border-0 tw-cursor-pointer hover:tw-opacity-90 tw-transition-all" aria-pressed="true" title="List view">
          <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <button type="button" id="priorityViewGrid" class="tw-p-1.5 tw-rounded-lg tw-bg-transparent tw-text-slate-500 hover:tw-text-slate-900 tw-border-0 tw-cursor-pointer tw-transition-all" aria-pressed="false" title="Grid view">
          <svg class="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
          </svg>
        </button>
      </div>
    </div>
  </form>
  <?php else: ?>
  <form class="city-toolbar tw-rounded-xl tw-border tw-border-line tw-bg-white tw-p-4" id="cityFilters" role="search" aria-label="Refine listings">
    <label class="city-field"><span>Search</span><input id="citySearch" type="search" placeholder="Property or barangay" autocomplete="off"></label>
    <label class="city-field"><span>Category</span><select id="cityCategory"><option value="">All categories</option></select></label>
    <label class="city-field"><span>Subcategory</span><select id="citySubcategory" disabled><option value="">All subcategories</option></select></label>
    <label class="city-field"><span>Sort by</span><select id="citySort"><option value="newest">Newest</option><option value="iai">IAI score</option><option value="mce">MCE score</option><option value="price">Price: low to high</option><option value="area">Area: largest</option></select></label>
  </form>
  <?php endif; ?>
  
  <?php if ($mode !== 'ranking'): ?>
  <div class="city-results-line tw-mb-3">
    <span id="cityResultsCount" class="tw-text-xs sm:tw-text-sm tw-text-slate-500 tw-font-medium">Loading…</span>
    <?php if ($mode === 'investor'): ?>
    <label><input type="checkbox" id="citySavedOnly"> Saved only</label>
    <?php endif; ?>
  </div>
  <?php endif; ?>
  <?php endif; ?>

  <div class="city-compare-tray" id="cityCompareTray" hidden>
    <span id="cityCompareCount"></span>
    <a class="city-button city-button-small" href="<?= $e(sfc_path('/compare-decision.php')) ?>">Compare</a>
  </div>

  <?php if ($mode === 'explorer'): ?>
  <div class="city-map-layout">
    <div class="city-property-grid" id="cityPropertyGrid" aria-live="polite"><div class="city-loading">Loading properties…</div></div>
    <section class="city-map-panel tw-static lg:tw-sticky" aria-label="Property map">
      <div class="city-map-controls tw-flex-wrap">
        <div class="city-map-segmented" role="group" aria-label="Map style switcher">
          <button type="button" class="is-active" data-layer-btn="canvas">Canvas</button>
          <button type="button" data-layer-btn="streets">Strands</button>
          <button type="button" data-layer-btn="satellite">Satellite</button>
        </div>
        <div class="city-map-ctrl-actions">
          <button type="button" id="cityMapFit" class="city-map-btn" title="Fit all properties">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></svg>
            <span>Fit view</span>
          </button>
        </div>
      </div>
      <div class="city-map-canvas tw-h-[clamp(240px,65vh,640px)]" id="cityPropertyMap"></div>
      <div class="city-map-options tw-flex-wrap">
        <label class="city-map-toggle-switch tw-inline-flex tw-items-center tw-gap-2.5 tw-cursor-pointer">
          <div class="tw-relative tw-inline-block tw-w-9 tw-h-5">
            <input type="checkbox" id="cityNearbyBusinesses" class="tw-sr-only tw-peer">
            <div class="tw-w-9 tw-h-5 tw-bg-slate-200 peer-focus:tw-outline-none tw-rounded-full tw-peer peer-checked:after:tw-translate-x-full peer-checked:after:tw-border-white after:tw-content-[''] after:tw-absolute after:tw-top-[2px] after:tw-left-[2px] after:tw-bg-white after:tw-border-slate-300 after:tw-border after:tw-rounded-full after:tw-h-4 after:tw-w-4 after:tw-transition-all peer-checked:tw-bg-[#9E1B22]"></div>
          </div>
          <span class="tw-text-xs tw-font-semibold tw-text-slate-700">Nearby businesses</span>
          <span class="tw-text-xs tw-text-slate-400" title="Toggle local competitor and partner points">ⓘ</span>
        </label>
        <div class="city-map-legend" aria-hidden="true">
          <span><i class="dot-prime"></i> Prime 90+</span>
          <span><i class="dot-strong"></i> Strong 80–89</span>
          <span><i class="dot-emerging"></i> Moderate +80</span>
        </div>
        <span id="cityMapContext" role="status"></span>
      </div>
    </section>
  </div>
  <?php elseif ($mode === 'ranking'): ?>
  <section id="cityRankingTable" aria-live="polite"><div class="city-loading">Loading assessments…</div></section>
  <details class="city-assessment-note">
    <summary>Assessment method</summary>
    <p id="cityAssessmentMethod"></p>
    <p>Context tags describe the assessor’s view of the site. Suitability is subject to zoning, records, and site checks.</p>
  </details>
  <?php elseif ($mode === 'compare'): ?>
  <div class="city-compare-matrix" id="cityCompareMatrix" aria-live="polite"><div class="city-loading">Loading comparison…</div></div>
  <p class="city-assessment-note">Add up to three properties from the property list. MCE and IAI use completed city assessments.</p>
  <?php else: ?>
  <div class="city-property-grid" id="cityPropertyGrid" aria-live="polite"><div class="city-loading">Loading properties…</div></div>
  <?php endif; ?>

  <?php if ($context['user'] === null): ?>
  <div class="city-account-gate">
    <div>
      <h3>Explore every opportunity.</h3>
      <p>This preview shows three listings. Log in for the full catalogue.</p>
    </div>
    <a class="city-button" href="<?= $e(sfc_path('/investor-login.php')) ?>">Log in</a>
  </div>
  <?php endif; ?>
</main>

<script type="module" src="<?= $e($context['assetBase']) ?>/js/city-workspace.js<?= sfc_asset_version('js/city-workspace.js') ?>"></script>
<?php
}
