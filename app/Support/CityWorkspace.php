<?php
declare(strict_types=1);

function sfc_render_city_workspace(array $context, string $heading, string $description, string $mode): void
{
    $e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    ?>
<main class="city-container city-workspace">
  <div class="city-page-heading"><div><h1><?= $e($heading) ?></h1><p><?= $e($description) ?></p></div><?php if ($mode === 'investor'): ?><a class="city-button city-button-secondary" href="<?= $e(sfc_path('/property-explorer.php')) ?>"><?= sfc_icon('map') ?> Map view</a><?php elseif ($mode === 'ranking'): ?><a class="city-button city-button-secondary" href="<?= $e(sfc_path('/compare-decision.php')) ?>">Compare</a><?php endif; ?></div>
  <?php if ($mode === 'investor'): ?>
  <section class="city-stats" aria-label="City property statistics"><div class="city-stat"><strong id="cityAreaStat">—</strong><span>Available area · hectares</span></div><div class="city-stat"><strong id="cityPropertiesStat">—</strong><span>Available properties</span></div><div class="city-stat"><strong id="cityVisitsStat">—</strong><span>Site visits</span></div></section>
  <?php endif; ?>
  <?php if ($mode !== 'compare'): ?>
  <form class="city-toolbar" id="cityFilters" role="search">
    <label class="city-field"><span>Search</span><input id="citySearch" type="search" placeholder="Property or barangay" autocomplete="off"></label>
    <label class="city-field"><span>Category</span><select id="cityCategory"><option value="">All categories</option></select></label>
    <label class="city-field"><span>Subcategory</span><select id="citySubcategory" disabled><option value="">All subcategories</option></select></label>
    <label class="city-field"><span>Sort by</span><select id="citySort"><option value="newest">Newest</option><option value="iai">IAI score</option><option value="mce">MCE score</option><option value="price">Price: low to high</option><option value="area">Area: largest</option></select></label>
  </form>
  <div class="city-results-line"><span id="cityResultsCount">Loading…</span><?php if ($mode === 'investor'): ?><label><input type="checkbox" id="citySavedOnly"> Saved only</label><?php endif; ?></div>
  <?php endif; ?>
  <div class="city-compare-tray" id="cityCompareTray" hidden><span id="cityCompareCount"></span><a class="city-button city-button-small" href="<?= $e(sfc_path('/compare-decision.php')) ?>">Compare</a></div>
  <?php if ($mode === 'explorer'): ?>
  <div class="city-map-layout"><div class="city-property-grid" id="cityPropertyGrid" aria-live="polite"><div class="city-loading">Loading properties…</div></div><section class="city-map-panel" aria-label="Property map"><div class="city-map-controls"><div class="city-map-segmented" role="group" aria-label="Map style switcher"><button type="button" class="is-active" data-layer-btn="canvas">Canvas</button><button type="button" data-layer-btn="streets">Streets</button><button type="button" data-layer-btn="satellite">Satellite</button></div><div class="city-map-ctrl-actions"><button type="button" id="cityMapFit" class="city-map-btn" title="Fit all properties"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></svg><span>Fit view</span></button></div></div><div class="city-map-canvas" id="cityPropertyMap"></div><div class="city-map-options"><label><input type="checkbox" id="cityNearbyBusinesses"> <span>Nearby businesses</span></label><div class="city-map-legend" aria-hidden="true"><span><i class="dot-prime"></i> Prime 90+</span><span><i class="dot-strong"></i> Strong 80–89</span><span><i class="dot-emerging"></i> &lt;80</span></div><span id="cityMapContext" role="status"></span></div></section></div>
  <?php elseif ($mode === 'ranking'): ?>
  <section id="cityRankingTable" aria-live="polite"><div class="city-loading">Loading assessments…</div></section>
  <details class="city-assessment-note"><summary>Assessment method</summary><p id="cityAssessmentMethod"></p><p>Context tags describe the assessor’s view of the site. Suitability is subject to zoning, records, and site checks.</p></details>
  <?php elseif ($mode === 'compare'): ?>
  <div class="city-compare-matrix" id="cityCompareMatrix" aria-live="polite"><div class="city-loading">Loading comparison…</div></div>
  <p class="city-assessment-note">Add up to three properties from the property list. MCE and IAI use completed city assessments.</p>
  <?php else: ?>
  <div class="city-property-grid" id="cityPropertyGrid" aria-live="polite"><div class="city-loading">Loading properties…</div></div>
  <?php endif; ?>
  <?php if ($context['user'] === null): ?><div class="city-account-gate"><div><h3>Explore every opportunity.</h3><p>This preview shows three listings. Log in for the full catalogue.</p></div><a class="city-button" href="<?= $e(sfc_path('/investor-login.php')) ?>">Log in</a></div><?php endif; ?>
</main>
<script type="module" src="<?= $e($context['assetBase']) ?>/js/city-workspace.js<?= sfc_asset_version('js/city-workspace.js') ?>"></script>
<?php
}
