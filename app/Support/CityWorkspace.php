<?php
declare(strict_types=1);

function sfc_render_city_workspace(array $context, string $heading, string $description, string $mode): void
{
    $e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    // Only display the LoopNet-style hero and onboarding on properties (investor dashboard)
    $isLoopNetView = $mode === 'investor';

    $rawName = trim((string) ($context['user']['name'] ?? ''));
    if ($rawName !== '' && !preg_match('/^investor(\s+resident)?/i', $rawName)) {
        $parts = preg_split('/\s+/', $rawName);
        $firstName = !empty($parts[0]) ? $parts[0] : $rawName;
    } else {
        $firstName = 'JUSTINE';
    }
    $userUpper = strtoupper($firstName);
    $heroBgUrl = $e($context['assetBase']) . '/images/locusherosec.png';
    $mockupImg1 = $e($context['assetBase']) . '/images/landing-FabroBldg.jpg';
    ?>

<?php if ($isLoopNetView): ?>
<!-- ==========================================================================
     HERO SECTION: Sleek, Minimized iOS Glass Prioritization Platform Header
     ========================================================================== -->
<section class="locus-priority-hero" style="background: linear-gradient(180deg, rgba(17, 34, 77, 0.64) 0%, rgba(17, 34, 77, 0.80) 55%, rgba(17, 34, 77, 0.94) 100%), url('<?= $heroBgUrl ?>') center 46% / cover no-repeat;" aria-label="Strategic Investment Prioritization Platform">
  <div class="locus-hero-wrap">
    <h1 class="locus-hero-title">
      LOCUS-SF: Strategic Investment Prioritization Platform
    </h1>
    
    <p class="locus-hero-sub">
      Empowering high-impact capital allocation through cadastral MCE scoring &amp; verified municipal intelligence.
    </p>

    <!-- Apple / iOS-Grade Crystalline Glass Card -->
    <div class="locus-glass-card">
      <!-- iOS Segmented Control Tabs -->
      <div class="locus-glass-tabs-wrap">
        <nav class="locus-glass-tabs" aria-label="Opportunity categories">
          <button type="button" class="locus-glass-tab is-active" data-tab-action="investor">For Lease / Sale</button>
          <button type="button" class="locus-glass-tab" data-tab-action="prime">Prime IAI (90+)</button>
          <button type="button" class="locus-glass-tab" data-tab-action="incentives">Ordinance 2024-41</button>
          <button type="button" class="locus-glass-tab" data-tab-action="all">All Opportunities</button>
        </nav>
      </div>

      <!-- Compact Sector Quick Icon Pills -->
      <div class="locus-sector-chips" role="group" aria-label="Filter by priority sector">
        <button type="button" class="locus-sector-chip" data-sector-filter="Commercial">
          <svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/></svg>
          <span>Commercial</span>
        </button>
        <button type="button" class="locus-sector-chip" data-sector-filter="Industrial">
          <svg viewBox="0 0 24 24"><path d="M2 20h20M5 20V8l5 4V8l5 4V4h5v16"/></svg>
          <span>Industrial</span>
        </button>
        <button type="button" class="locus-sector-chip" data-sector-filter="Agri">
          <svg viewBox="0 0 24 24"><path d="M12 2a9 9 0 0 0-9 9c0 7 9 11 9 11s9-4 9-11a9 9 0 0 0-9-9z"/><path d="M12 7v10M8 11l4-4 4 4"/></svg>
          <span>Agri-Fishery</span>
        </button>
        <button type="button" class="locus-sector-chip" data-sector-filter="Tourism">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <span>Tourism</span>
        </button>
        <button type="button" class="locus-sector-chip" data-sector-filter="Tech">
          <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          <span>ICT &amp; Tech</span>
        </button>
        <button type="button" class="locus-sector-chip" data-sector-filter="Infra">
          <svg viewBox="0 0 24 24"><path d="M2 22h20M6 18V6l4-4h4l4 4v12M10 10h4M10 14h4"/></svg>
          <span>Infrastructure</span>
        </button>
      </div>

      <!-- Crystalline Glass Search Bar -->
      <div class="locus-glass-searchbar">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        <input 
          id="citySearchGlass" 
          type="search" 
          placeholder="Enter a location, barangay, or sector (e.g., Poro, Sevilla, Commercial)..." 
          autocomplete="off"
          aria-label="Search properties in San Fernando City">
        <button type="button" id="citySearchSubmit" class="locus-search-submit" title="Execute search">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        </button>
      </div>
    </div>
  </div>
</section>

<!-- ==========================================================================
     WELCOME SECTION: LoopNet Onboarding Layout (Refined Poppins Styling)
     ========================================================================== -->
<section class="locus-welcome-section" aria-labelledby="welcomeUserHeading">
  <div class="locus-welcome-container">
    <!-- Left Column: User Welcome & Platform Capabilities -->
    <div class="locus-welcome-copy">
      <h2 id="welcomeUserHeading" class="locus-welcome-heading">Welcome <?= $e($userUpper) ?>!</h2>
      <p class="locus-welcome-sub">Now that you have a LOCUS-SF account you can:</p>
      <div class="locus-red-rule" aria-hidden="true"></div>

      <ul class="locus-perks-list">
        <li class="locus-perk-item">
          <span class="locus-perk-check">
            <svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          <span>Get <strong>instant alerts</strong> when your favorited properties, incentives, or ordinance updates change</span>
        </li>
        <li class="locus-perk-item">
          <span class="locus-perk-check">
            <svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          <span>Receive <strong>new listings</strong> that match your strategic investment profile and capital tier automatically</span>
        </li>
        <li class="locus-perk-item">
          <span class="locus-perk-check">
            <svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          <span>Keep your team up to date by <strong>evaluating official MCE &amp; IAI scores</strong></span>
        </li>
        <li class="locus-perk-item">
          <span class="locus-perk-check">
            <svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          <span>View <strong>confidential documents</strong>, zoning clearances, and streamline due diligence with City Assessors &amp; LEBDO</span>
        </li>
      </ul>

      <div class="locus-welcome-actions">
        <a class="locus-btn-outline" href="#propertyResults" id="startSearchingBtn">Start Searching</a>
        <a class="locus-btn-secondary" href="<?= $e(sfc_path('/property-ranking.php')) ?>"><?= sfc_icon('ranking') ?> Priority Board</a>
        <a class="locus-btn-secondary" href="<?= $e(sfc_path('/property-explorer.php')) ?>"><?= sfc_icon('map') ?> Interactive Map</a>
      </div>
    </div>

    <!-- Right Column: Sleek iPhone Mockup Preview -->
    <div class="locus-showcase-wrap" aria-hidden="true">
      <div class="phone-mockup phone-primary">
        <div class="phone-notch"></div>
        <div class="phone-screen">
          <div class="phone-top-bar">
            <span>LOCUS-SF LISTING</span>
            <span>VERIFIED</span>
          </div>
          <div class="phone-card-preview">
            <div class="phone-card-image">
              <img src="<?= $mockupImg1 ?>" alt="Quezon Commercial Hub" loading="lazy">
              <span class="phone-tag-prime">IAI 94.2 · PRIME</span>
            </div>
            <div class="phone-card-content">
              <strong>Quezon Commercial Corridor</strong>
              <small>Barangay I, San Fernando City</small>
              <div class="phone-metric-row">
                <span class="score-label">Valuation</span>
                <span class="score-val">₱38,500,000 · 1.45 ha</span>
              </div>
              <div class="phone-metric-row">
                <span class="score-label">Cadastral MCE</span>
                <span class="score-val">88.5/100 · Rank #1</span>
              </div>
              <div class="phone-incentive-pill">
                <span>★ Ordinance 2024-41 Eligible (Tier 1)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- ==========================================================================
     MAIN CONTENT & DATA DIRECTORY
     ========================================================================== -->
<main class="city-container city-workspace" id="propertyResults">
  <?php if (!$isLoopNetView): ?>
  <div class="city-page-heading">
    <div><h1><?= $e($heading) ?></h1><p><?= $e($description) ?></p></div>
    <?php if ($mode === 'investor'): ?>
      <a class="city-button city-button-secondary" href="<?= $e(sfc_path('/property-explorer.php')) ?>"><?= sfc_icon('map') ?> Map view</a>
    <?php elseif ($mode === 'ranking'): ?>
      <a class="city-button city-button-secondary" href="<?= $e(sfc_path('/compare-decision.php')) ?>">Compare</a>
    <?php endif; ?>
  </div>
  <?php endif; ?>

  <?php if ($mode === 'investor'): ?>
  <section class="city-stats" aria-label="City property statistics">
    <div class="city-stat"><strong id="cityAreaStat">—</strong><span>Available area · hectares</span></div>
    <div class="city-stat"><strong id="cityPropertiesStat">—</strong><span>Available properties</span></div>
    <div class="city-stat"><strong id="cityVisitsStat">—</strong><span>Site visits</span></div>
  </section>
  <?php endif; ?>

  <?php if ($mode !== 'compare'): ?>
  <form class="city-toolbar" id="cityFilters" role="search" aria-label="Refine listings">
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
    <section class="city-map-panel" aria-label="Property map">
      <div class="city-map-controls">
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
      <div class="city-map-canvas" id="cityPropertyMap"></div>
      <div class="city-map-options">
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

<?php if ($isLoopNetView): ?>
<!-- Interactive Synchronization Script for Hero Search & Filter Controls -->
<script>
document.addEventListener('DOMContentLoaded', () => {
  const glassInput = document.getElementById('citySearchGlass');
  const cityInput = document.getElementById('citySearch');
  const submitBtn = document.getElementById('citySearchSubmit');
  const startBtn = document.getElementById('startSearchingBtn');
  const resultsEl = document.getElementById('propertyResults');
  const categorySelect = document.getElementById('cityCategory');
  const sortSelect = document.getElementById('citySort');

  // Synchronize Glass Search input with workspace filter input
  if (glassInput && cityInput) {
    glassInput.addEventListener('input', () => {
      cityInput.value = glassInput.value;
      cityInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    glassInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cityInput.value = glassInput.value;
        cityInput.dispatchEvent(new Event('input', { bubbles: true }));
        resultsEl?.scrollIntoView({ behavior: 'smooth' });
      }
    });

    cityInput.addEventListener('input', () => {
      if (glassInput.value !== cityInput.value) {
        glassInput.value = cityInput.value;
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (glassInput && cityInput) {
        cityInput.value = glassInput.value;
        cityInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      resultsEl?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      glassInput?.focus();
      resultsEl?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Sector chips interaction
  const sectorChips = document.querySelectorAll('.locus-sector-chip');
  sectorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const sector = chip.dataset.sectorFilter;
      const isAlreadyActive = chip.classList.contains('is-active');

      sectorChips.forEach(c => c.classList.remove('is-active'));
      if (!isAlreadyActive && sector) {
        chip.classList.add('is-active');
        if (glassInput && cityInput) {
          glassInput.value = sector;
          cityInput.value = sector;
          cityInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } else {
        if (glassInput && cityInput) {
          glassInput.value = '';
          cityInput.value = '';
          cityInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      resultsEl?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Mode tabs interaction
  const tabs = document.querySelectorAll('.locus-glass-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const action = tab.dataset.tabAction;

      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      if (action === 'prime' && sortSelect) {
        sortSelect.value = 'iai';
        sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (action === 'incentives' && glassInput && cityInput) {
        glassInput.value = 'Ordinance';
        cityInput.value = 'Ordinance';
        cityInput.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (action === 'all' && glassInput && cityInput) {
        glassInput.value = '';
        cityInput.value = '';
        cityInput.dispatchEvent(new Event('input', { bubbles: true }));
        if (categorySelect) {
          categorySelect.value = '';
          categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      resultsEl?.scrollIntoView({ behavior: 'smooth' });
    });
  });
});
</script>
<?php endif; ?>

<script type="module" src="<?= $e($context['assetBase']) ?>/js/city-workspace.js<?= sfc_asset_version('js/city-workspace.js') ?>"></script>
<?php
}
