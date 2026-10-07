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
<main class="city-container city-workspace" id="propertyResults">
  <?php if (!$isLoopNetView): ?>
  <div class="city-page-heading tw-flex-wrap tw-items-start">
    <div><h1><?= $e($heading) ?></h1><p><?= $e($description) ?></p></div>
    <?php if ($mode === 'investor'): ?>
      <a class="city-button city-button-secondary" href="<?= $e(sfc_path('/property-explorer.php')) ?>"><?= sfc_icon('map') ?> Map view</a>
    <?php elseif ($mode === 'ranking'): ?>
      <a class="city-button city-button-secondary" href="<?= $e(sfc_path('/compare-decision.php')) ?>">Compare</a>
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
  <form class="city-toolbar tw-rounded-xl tw-border tw-border-line tw-bg-white tw-p-4" id="cityFilters" role="search" aria-label="Refine listings">
    <label class="city-field"><span>Search</span><input id="citySearch" type="search" placeholder="Property or barangay" autocomplete="off"></label>
    <label class="city-field"><span>Category</span><select id="cityCategory"><option value="">All categories</option></select></label>
    <label class="city-field"><span>Subcategory</span><select id="citySubcategory" disabled><option value="">All subcategories</option></select></label>
    <label class="city-field"><span>Sort by</span><select id="citySort"><option value="newest">Newest</option><option value="iai">IAI score</option><option value="mce">MCE score</option><option value="price">Price: low to high</option><option value="area">Area: largest</option></select></label>
  </form>
  
  <div class="city-results-line">
    <span id="cityResultsCount">Loading…</span>
    <?php if ($mode === 'investor'): ?>
    <label><input type="checkbox" id="citySavedOnly"> Saved only</label>
    <?php endif; ?>
  </div>
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
          <button type="button" data-layer-btn="streets">Streets</button>
          <button type="button" data-layer-btn="satellite">Satellite</button>
        </div>
        <div class="city-map-ctrl-actions">
          <button type="button" id="cityMapFit" class="city-map-btn" title="Fit all properties">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></svg>
            <span>Fit view</span>
          </button>
        </div>
      </div>
      <div class="city-map-canvas tw-h-[clamp(220px,55svh,590px)]" id="cityPropertyMap"></div>
      <div class="city-map-options tw-flex-wrap">
        <label><input type="checkbox" id="cityNearbyBusinesses"> <span>Nearby businesses</span></label>
        <div class="city-map-legend" aria-hidden="true">
          <span><i class="dot-prime"></i> Prime 90+</span>
          <span><i class="dot-strong"></i> Strong 80–89</span>
          <span><i class="dot-emerging"></i> &lt;80</span>
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
