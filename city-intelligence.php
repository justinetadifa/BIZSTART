<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
sfc_require_role('admin', sfc_path('/admin-login.php'));

$context = sfc_web_context();
$currentUser = $context['user'] ?? null;
$department = sfc_admin_department($currentUser);

if (!sfc_can_manage_properties($currentUser)) {
    http_response_code(403);
    exit('A verified city department administration account (CAO, LEBDO, or CICTO) is required.');
}

$deptBadgeLabels = [
    'CAO' => 'City Assessor’s Office (CAO)',
    'ASSESSOR' => 'City Assessor’s Office (CAO)',
    'LEBDO' => 'Local Economic & Business Development Office (LEBDO)',
    'CICTO' => 'City Information & Communications Technology Office (CICTO)',
];
$deptLabel = $deptBadgeLabels[$department] ?? 'City Administration';

$container = require __DIR__ . '/app/bootstrap.php';
$pdo = $container['pdo'];

require_once __DIR__ . '/app/Support/CityIntelligenceService.php';
$intelligenceService = new \App\Support\CityIntelligenceService($pdo);

$defaultFilters = [
    'date_range' => 'all',
    'barangay' => 'all',
    'property_type' => 'all',
    'status' => 'all',
];
$initialData = $intelligenceService->getDashboardData($defaultFilters, $currentUser);

$rawBarangays = \App\Support\PropertyCatalog::barangays();
$barangays = is_int(array_key_first($rawBarangays)) ? array_values($rawBarangays) : array_keys($rawBarangays);
$barangayTotalCount = count($barangays);

// Authoritative geographic coordinates & verified PSA 2020 Census population for the interactive radar
$geoBarangays = [];
foreach ($rawBarangays as $bgName => $meta) {
    if (is_string($bgName) && is_array($meta)) {
        $geoBarangays[$bgName] = [
            'lat' => (float) ($meta['lat'] ?? 16.615),
            'lng' => (float) ($meta['lng'] ?? 120.320),
            'district' => (string) ($meta['district'] ?? 'San Fernando City'),
        ];
    }
}

$psaDemographics = [];
$psaPath = __DIR__ . '/data/demographics-psa.json';
if (is_file($psaPath)) {
    $psaJson = json_decode((string) file_get_contents($psaPath), true);
    if (is_array($psaJson['barangays'] ?? null)) {
        foreach ($psaJson['barangays'] as $bgName => $bgPop) {
            if (isset($bgPop['total'])) {
                $psaDemographics[$bgName] = (int) $bgPop['total'];
            }
        }
    }
}

$geoContextPayload = [
    'barangays' => $geoBarangays,
    'psaPopulation' => $psaDemographics,
    'totalBarangays' => $barangayTotalCount,
];

$today = new DateTimeImmutable('now', new DateTimeZone('Asia/Manila'));
$escape = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');

$kpiInit = $initialData['kpi'];
$totalPropsInit = (int) ($kpiInit['properties_total'] ?? 0);
$publishedInit = (int) ($kpiInit['properties_published'] ?? 0);
$publishRateInit = $totalPropsInit > 0 ? round(($publishedInit / $totalPropsInit) * 100, 1) : 0.0;
$saleVolumeInit = (float) ($kpiInit['total_sale_volume_php'] ?? 0);
$saleVolumeFormatted = $saleVolumeInit >= 1_000_000_000
    ? '₱' . number_format($saleVolumeInit / 1_000_000_000, 2) . 'B'
    : ($saleVolumeInit >= 1_000_000
        ? '₱' . number_format($saleVolumeInit / 1_000_000, 1) . 'M'
        : ($saleVolumeInit > 0 ? '₱' . number_format($saleVolumeInit, 0) : '₱0'));

sfc_render_head('City Investment Intelligence & Reporting | LOCUS-SF', $context, [
    'page' => 'city-intelligence',
    'role' => 'admin',
]);
sfc_render_header($context, 'intelligence');
?>
<link rel="stylesheet" href="<?= $escape($context['assetBase']) ?>/css/city-intelligence.css<?= sfc_asset_version('css/city-intelligence.css') ?>">

<main class="ci-workspace" id="cityIntelligenceApp" data-department="<?= $escape($department) ?>">
  <div class="ci-bento-stage">
    <!-- Executive Swiss Masthead -->
    <header class="ci-header">
      <div class="ci-eyebrow-row">
        <span class="ci-eyebrow">
          <span class="ci-eyebrow-mark" aria-hidden="true"></span>
          LOCUS-SF / CITY OPERATIONS
        </span>
        <div class="ci-dept-pill">
          <span class="ci-pulse-dot" aria-hidden="true"></span>
          <span><?= $escape($deptLabel) ?></span>
        </div>
      </div>

      <div class="ci-title-group">
        <div class="ci-title-copy">
          <h1 class="ci-title">City Investment Intelligence &amp; Reporting<span class="ci-period">.</span></h1>
          <p class="ci-subtitle">
            From property records to actionable local investment information. Consolidating municipal property inventory, broker pipelines, investor activity, and assessment readiness across San Fernando City.
          </p>
        </div>

        <div class="ci-actions">
          <button type="button" class="ci-btn-secondary" id="refreshDataBtn" title="Reload live data from the municipal database">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>
            <span>Refresh</span>
          </button>
          <button type="button" class="ci-btn-primary" id="openReportModalBtn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            <span>City Investment Report Generator</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Swiss Instrument Filter Bar -->
    <section class="ci-filter-toolbar" aria-label="Dashboard Filters">
      <form id="ciFilterForm" class="ci-filter-row" onsubmit="return false;">
        <div class="ci-filter-fields">
          <div class="ci-filter-item">
            <label for="filterDateRange" class="ci-filter-label">Reporting Period</label>
            <select id="filterDateRange" name="date_range" class="ci-select">
              <option value="all" selected>All Available Records (Cumulative)</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year-to-Date <?= $today->format('Y') ?></option>
              <option value="custom">Custom Date Range…</option>
            </select>
          </div>

          <div class="ci-filter-item" id="customStartGroup" style="display: none;">
            <label for="filterStartDate" class="ci-filter-label">From</label>
            <input type="date" id="filterStartDate" name="start_date" class="ci-input" max="<?= $today->format('Y-m-d') ?>">
          </div>
          <div class="ci-filter-item" id="customEndGroup" style="display: none;">
            <label for="filterEndDate" class="ci-filter-label">To</label>
            <input type="date" id="filterEndDate" name="end_date" class="ci-input" max="<?= $today->format('Y-m-d') ?>">
          </div>

          <div class="ci-filter-item">
            <label for="filterBarangay" class="ci-filter-label">Barangay (San Fernando)</label>
            <select id="filterBarangay" name="barangay" class="ci-select">
              <option value="all" selected>All <?= $barangayTotalCount ?> Barangays</option>
              <?php foreach ($barangays as $bg): ?>
              <option value="<?= $escape($bg) ?>"><?= $escape($bg) ?></option>
              <?php endforeach; ?>
            </select>
          </div>

          <div class="ci-filter-item">
            <label for="filterPropertyType" class="ci-filter-label">Primary Typology</label>
            <select id="filterPropertyType" name="property_type" class="ci-select">
              <option value="all" selected>All Typologies</option>
              <option value="land">Land Parcels (Bare Land / Commercial Lots)</option>
              <option value="building">Buildings &amp; Built Structures (Commercial / Office)</option>
              <option value="mixed">Mixed / Unspecified</option>
            </select>
          </div>

          <div class="ci-filter-item">
            <label for="filterStatus" class="ci-filter-label">Review Status</label>
            <select id="filterStatus" name="status" class="ci-select">
              <option value="all" selected>All Statuses</option>
              <option value="published">Published &amp; Available</option>
              <option value="pending_review">Pending Review</option>
              <option value="draft">Draft / Inactive</option>
              <option value="archived">Archived / Declined</option>
            </select>
          </div>
        </div>

        <div class="ci-filter-actions">
          <span class="ci-active-period-badge" id="activePeriodBadge">All Available Records</span>
          <button type="button" class="ci-filter-reset" id="resetFiltersBtn">Reset</button>
        </div>
      </form>
    </section>

    <!-- ======================================================================
         HERO SWISS BENTO STAGE (Adapted from Editorial Bento Dashboard)
         ====================================================================== -->
    <section class="ci-hero-bento" aria-label="Executive Portfolio Snapshot">
      <!-- LEFT PRIMARY HERO CARD -->
      <article class="ci-card ci-hero-main-card">
        <div class="ci-hero-card-head">
          <div>
            <h2 class="ci-hero-card-title">Municipal Portfolio Overview</h2>
            <p class="ci-hero-card-sub">Track verified San Fernando investment sites, land footprint, and barangay concentration.</p>
          </div>
          <span class="ci-hero-scope-pill" id="heroScopePill">San Fernando City</span>
        </div>

        <!-- Top Signature 3-Card Color-Blocked KPI Trio (Canary / Graphite / Stone) -->
        <div class="ci-kpi-trio" aria-label="Primary Portfolio Indicators">
          <!-- 1. Available Properties (Signature Electric Canary Yellow) -->
          <div class="ci-kpi-card ci-kpi-tile is-canary is-available">
            <div class="ci-kpi-tile-top">
              <span class="ci-kpi-label">Available Properties</span>
              <span class="ci-kpi-chip is-dark">Live</span>
            </div>
            <div class="ci-kpi-value" id="kpiAvailable"><?= (int) $kpiInit['properties_published'] ?></div>
            <div class="ci-kpi-subtext" id="kpiAvailableSub">Published &amp; verified on market</div>
          </div>

          <!-- 2. Land & Built Footprint (Signature Deep Charcoal Graphite) -->
          <div class="ci-kpi-card ci-kpi-tile is-graphite is-area">
            <div class="ci-kpi-tile-top">
              <span class="ci-kpi-label">Land Footprint</span>
              <span class="ci-kpi-chip is-light">Area</span>
            </div>
            <div class="ci-kpi-value" id="kpiArea"><?= number_format((float) $kpiInit['total_land_area_sqm'], 3) ?> <small>sqm</small></div>
            <div class="ci-kpi-subtext" id="kpiAreaSub"><?= number_format((float) $kpiInit['total_building_area_sqm'], 2) ?> sqm built floor area</div>
          </div>

          <!-- 3. Recorded Submissions (Signature Alabaster Stone) -->
          <div class="ci-kpi-card ci-kpi-tile is-stone is-submissions">
            <div class="ci-kpi-tile-top">
              <span class="ci-kpi-label">Recorded Submissions</span>
              <span class="ci-kpi-chip is-dark">Intake</span>
            </div>
            <div class="ci-kpi-value" id="kpiSubmissions"><?= (int) $kpiInit['submissions_in_period'] ?></div>
            <div class="ci-kpi-subtext" id="kpiSubmissionsSub">Total in selected period</div>
          </div>
        </div>

        <!-- Middle Interactive Radiant-Yellow Vertical Stem Showcase -->
        <div class="ci-stem-showcase">
          <div class="ci-stem-summary">
            <button type="button" class="ci-pill-outline-btn" id="heroViewDetailsBtn">
              <span>View Details</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
            </button>
            <div class="ci-stem-bigstat" id="heroPublishRate"><?= number_format($publishRateInit, 1) ?>%</div>
            <div class="ci-stem-caption" id="heroPublishNote">
              <?= $publishedInit ?> of <?= $totalPropsInit ?> recorded listings are published &amp; verified on market.
            </div>
          </div>

          <div class="ci-stem-chart-wrap" id="heroStemChart" aria-label="Barangay Listing Concentration Chart">
            <!-- Interactive Vertical Stem Chart rendered by city-intelligence.js -->
          </div>
        </div>

        <!-- Secondary Operational KPIs Strip (Reviews Pending / Brokers / Verified Assessments) -->
        <div class="ci-kpi-secondary-strip" aria-label="Operational Readiness Indicators">
          <div class="ci-kpi-card ci-mini-kpi is-pending">
            <div class="ci-mini-kpi-top">
              <span class="ci-kpi-label">Reviews Pending</span>
              <span class="ci-mini-dot is-canary" aria-hidden="true"></span>
            </div>
            <div class="ci-mini-kpi-row">
              <span class="ci-kpi-value" id="kpiPending"><?= (int) $kpiInit['properties_pending'] ?></span>
              <span class="ci-kpi-subtext" id="kpiPendingSub">Awaiting CAO/CICTO review</span>
            </div>
          </div>

          <div class="ci-kpi-card ci-mini-kpi is-brokers">
            <div class="ci-mini-kpi-top">
              <span class="ci-kpi-label">Broker Applications</span>
              <span class="ci-mini-dot is-ink" aria-hidden="true"></span>
            </div>
            <div class="ci-mini-kpi-row">
              <span class="ci-kpi-value" id="kpiBrokers"><?= (int) $kpiInit['broker_applications_in_period'] ?></span>
              <span class="ci-kpi-subtext" id="kpiBrokersSub"><?= (int) ($initialData['broker_activity']['status_breakdown']['approved'] ?? 0) ?> verified active brokers</span>
            </div>
          </div>

          <div class="ci-kpi-card ci-mini-kpi is-verified">
            <div class="ci-mini-kpi-top">
              <span class="ci-kpi-label">Verified Assessments</span>
              <span class="ci-mini-dot is-mint" aria-hidden="true"></span>
            </div>
            <div class="ci-mini-kpi-row">
              <span class="ci-kpi-value" id="kpiVerified"><?= (int) $initialData['assessment_readiness']['counts']['complete_verified'] ?></span>
              <span class="ci-kpi-subtext" id="kpiVerifiedSub"><?= (int) $initialData['assessment_readiness']['counts']['provisional_model'] ?> provisional models</span>
            </div>
          </div>
        </div>
      </article>

      <!-- RIGHT STACKED BENTO COLUMN -->
      <div class="ci-hero-side-col">
        <!-- Top Right: Interactive Land Use Watchlist Accordion (Image 4 Watchlist) -->
        <article class="ci-card ci-watchlist-card">
          <div class="ci-watchlist-head">
            <h2 class="ci-watchlist-title">Land Use Watchlist</h2>
            <span class="ci-watchlist-tag" title="Cross-classification shares can overlap without inflating total parcels">Cross-Use</span>
          </div>

          <div class="ci-watchlist-list" id="heroWatchlistBody" role="region" aria-label="Functional Classification Breakdown">
            <!-- Rendered dynamically as interactive accordion via city-intelligence.js -->
          </div>

          <button type="button" class="ci-watchlist-more-btn" id="heroWatchlistMoreBtn">
            <span>Inspect Full Inventory</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </article>

        <!-- Bottom Right: Obsidian Dark Executive Dossier Card (Image 4 Dark Balance Card) -->
        <article class="ci-dark-card" aria-label="Recorded Sale Volume and Report Export">
          <div class="ci-dark-head">
            <span class="ci-dark-icon" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
            </span>
            <div class="ci-dark-metric">
              <span class="ci-dark-label">Recorded Sale Volume</span>
              <div class="ci-dark-value" id="darkSaleVolume"><?= $escape($saleVolumeFormatted) ?></div>
            </div>
          </div>

          <div class="ci-dark-slots">
            <div class="ci-dark-slot">
              <span class="ci-dark-slot-key">Transaction Tenure</span>
              <span class="ci-dark-slot-val" id="darkTenurePills">7 Sale · 1 Lease</span>
            </div>
            <div class="ci-dark-slot">
              <span class="ci-dark-slot-key">Active Scope</span>
              <span class="ci-dark-slot-val" id="darkScopeLabel">All <?= $barangayTotalCount ?> Barangays</span>
            </div>
          </div>

          <button type="button" class="ci-dark-cta" id="darkReportBtn">
            Generate Municipal Report
          </button>
        </article>
      </div>
    </section>

    <!-- ======================================================================
         SWISS SEGMENTED NAVIGATION TABS
         ====================================================================== -->
    <nav class="ci-tabs-nav" role="tablist" aria-label="Intelligence Categories">
      <button type="button" class="ci-tab-btn is-active" role="tab" aria-selected="true" data-tab="inventory" id="tabBtnInventory">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>Property Inventory</span>
        <span class="ci-tab-badge" id="tabBadgeInventory"><?= $totalPropsInit ?></span>
      </button>

      <button type="button" class="ci-tab-btn" role="tab" aria-selected="false" data-tab="activity" id="tabBtnActivity">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        <span>Listing &amp; Review Trends</span>
        <span class="ci-tab-badge" id="tabBadgeActivity"><?= (int) $kpiInit['submissions_in_period'] ?></span>
      </button>

      <button type="button" class="ci-tab-btn" role="tab" aria-selected="false" data-tab="brokers" id="tabBtnBrokers">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>Broker Activity</span>
        <span class="ci-tab-badge" id="tabBadgeBrokers"><?= (int) $kpiInit['broker_applications_in_period'] ?></span>
      </button>

      <button type="button" class="ci-tab-btn" role="tab" aria-selected="false" data-tab="engagement" id="tabBtnEngagement">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <span>Investor Engagement</span>
        <span class="ci-tab-badge" id="tabBadgeEngagement"><?= (int) $kpiInit['total_shortlists'] + (int) $kpiInit['total_inquiries'] ?></span>
      </button>

      <button type="button" class="ci-tab-btn" role="tab" aria-selected="false" data-tab="assessment" id="tabBtnAssessment">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>Assessment Readiness</span>
        <span class="ci-tab-badge" id="tabBadgeAssessment"><?= (int) $initialData['assessment_readiness']['counts']['complete_verified'] ?></span>
      </button>
    </nav>

    <!-- ======================================================================
         TAB 1: PROPERTY INVENTORY & CLASSIFICATION
         ====================================================================== -->
    <section class="ci-tab-pane is-active" id="pane-inventory" role="tabpanel" aria-labelledby="tabBtnInventory">
      <!-- Interactive Hexagonal San Fernando Statistics Radar (Adapted from Image 3) -->
      <article class="ci-card ci-radar-card" id="sanFernandoRadarCard">
        <div class="ci-radar-masthead">
          <h2 class="ci-radar-title">San Fernando Statistics</h2>
          <p class="ci-radar-subtitle">
            Compare active San Fernando City barangays across customizable municipal property, land area, pricing, IAI, and verified PSA 2020 census indicators.
          </p>
        </div>

        <div class="ci-radar-grid">
          <!-- Left: Real San Fernando City Geographic Silhouette & Interactive Barangay Pins -->
          <div class="ci-radar-map-col">
            <div class="ci-radar-map-canvas">
              <svg id="radarMapSvg" class="ci-radar-map-svg" viewBox="0 0 220 260" role="img" aria-label="San Fernando City active barangay locator map">
                <!-- Dynamically generated from real data/barangays.json coordinates -->
              </svg>
            </div>
            <div class="ci-radar-map-caption">
              <span class="ci-radar-active-pill" id="radarBarangayMeta">Biday · Commercial North</span>
              <span class="ci-radar-map-credit">San Fernando City, La Union</span>
            </div>
            <div class="ci-radar-chip-list" id="radarBarangayChips" aria-label="Select barangay to highlight">
              <!-- Clickable barangay chips rendered via JS -->
            </div>
          </div>

          <!-- Center: Concentric 6-Axis Hexagonal Radar & Tactile Corner Pills -->
          <div class="ci-radar-hex-col">
            <div class="ci-radar-hex-stage">
              <svg id="radarHexSvg" class="ci-radar-hex-svg" viewBox="0 0 420 340" role="img" aria-label="Six-axis hexagonal barangay comparison radar">
                <!-- Dynamically rendered concentric hexagons + translucent citywide polygons + mint highlight -->
              </svg>
              <div class="ci-radar-corners" id="radarCornerLabels" aria-label="Active hexagon metric corners">
                <!-- 6 interactive corner drop-zones / click-to-swap pills -->
              </div>
            </div>
            <div class="ci-radar-readout" id="radarActiveReadout" aria-live="polite">
              <!-- Live readout of the active barangay's exact values -->
            </div>
          </div>

          <!-- Right: Draggable / Clickable Swappable Metric Topics Bench -->
          <div class="ci-radar-bench-col">
            <div class="ci-radar-bench-list" id="radarTopicBench" aria-label="Available municipal statistics topics">
              <!-- Draggable / clickable topic pills rendered via JS -->
            </div>
            <div class="ci-radar-bench-hint">
              <strong>Drag and drop</strong> or click a topic to place it on a hexagon corner.
            </div>
          </div>
        </div>

        <div class="ci-radar-footnotes">
          <p class="ci-radar-footnote-left">
            The center (0) of the hexagon shows the lowest recorded value among compared barangays, while each corner (100) marks the local high for that indicator.
          </p>
          <p class="ci-radar-footnote-right" id="radarExampleText">
            Select any San Fernando barangay on the map or click a topic pill on the right to inspect live relative standings.
          </p>
        </div>
      </article>

      <!-- Mutually Exclusive Physical Typology + Classifications & Transaction Terms -->
      <div class="ci-panel-grid" id="inventoryBreakdownSection">
        <article class="ci-card">
          <div class="ci-card-header">
            <div>
              <h2 class="ci-card-title">Primary Physical Typology</h2>
              <p class="ci-card-description">Mutually exclusive parcel forms to prevent double-counting across totals.</p>
            </div>
            <span class="ci-card-tag">Mutually Exclusive</span>
          </div>

          <div class="ci-distribution-track" id="invPrimaryTrack">
            <div class="ci-distribution-segment ci-seg-land" style="width: 50%;" title="Land Parcels">Land</div>
            <div class="ci-distribution-segment ci-seg-building" style="width: 35%;" title="Buildings">Built</div>
            <div class="ci-distribution-segment ci-seg-mixed" style="width: 15%;" title="Mixed / Unspecified">Mixed</div>
          </div>

          <div class="ci-legend-grid" id="invPrimaryLegend">
            <div class="ci-legend-item">
              <span class="ci-legend-dot ci-seg-land"></span>
              <span>Land Parcels: <strong id="invLandCount">0</strong></span>
            </div>
            <div class="ci-legend-item">
              <span class="ci-legend-dot ci-seg-building"></span>
              <span>Buildings &amp; Built: <strong id="invBuildingCount">0</strong></span>
            </div>
            <div class="ci-legend-item">
              <span class="ci-legend-dot ci-seg-mixed"></span>
              <span>Mixed / Other: <strong id="invMixedCount">0</strong></span>
            </div>
          </div>

          <div class="ci-callout">
            <svg class="ci-callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <div>
              <strong>CAO Double-Counting Prevention Protocol:</strong>
              Property physical form (land vs building) is mutually exclusive. A commercial building occupies a land parcel, but in municipal inventory reporting, parcels are categorized by primary form to ensure the total equals the exact record count.
            </div>
          </div>
        </article>

        <article class="ci-card">
          <div class="ci-card-header">
            <div>
              <h2 class="ci-card-title">Classifications &amp; Transaction Terms</h2>
              <p class="ci-card-description">Functional land use designations and sale vs lease tenure distribution.</p>
            </div>
            <span class="ci-card-tag">Cross-Classification</span>
          </div>

          <div class="ci-table-wrapper ci-table-soft" style="margin-bottom: 16px;">
            <table class="ci-table">
              <thead>
                <tr>
                  <th>Classification</th>
                  <th class="ci-table-num">Records</th>
                  <th class="ci-table-num">Share</th>
                </tr>
              </thead>
              <tbody id="invClassTableBody">
                <tr><td>Commercial</td><td class="ci-table-num">0</td><td class="ci-table-num">0%</td></tr>
              </tbody>
            </table>
          </div>

          <div class="ci-tenure-block">
            <span class="ci-section-kicker">Transaction Tenure</span>
            <div class="ci-tenure-pills" id="invTenureDistribution">
              <!-- Dynamically populated -->
            </div>
          </div>
        </article>
      </div>

      <!-- Geographic Distribution Table (Image 4 Clean Editorial History Table) -->
      <article class="ci-card ci-table-card" id="geoDistributionCard">
        <div class="ci-table-toolbar">
          <div class="ci-table-toolbar-left">
            <div>
              <h2 class="ci-card-title">Geographic Distribution across San Fernando City</h2>
              <p class="ci-card-description">Municipal breakdown by barangay showing recorded inventory, publication status, land area, and price benchmarks.</p>
            </div>
          </div>

          <div class="ci-table-toolbar-right">
            <label class="ci-inline-search" for="invBarangaySearch">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="search" id="invBarangaySearch" placeholder="Search barangay…" autocomplete="off">
            </label>

            <div class="ci-segmented-mini" role="group" aria-label="Barangay visibility filter">
              <button type="button" class="ci-seg-btn is-active" id="invBarangayFilterActive" data-mode="active">Active</button>
              <button type="button" class="ci-seg-btn" id="invBarangayFilterAll" data-mode="all">All <?= $barangayTotalCount ?></button>
            </div>

            <span class="ci-card-tag" id="invBarangayCountTag"><?= $barangayTotalCount ?> Barangays</span>
          </div>
        </div>

        <div class="ci-table-wrapper ci-table-editorial">
          <table class="ci-table" id="invBarangayTable">
            <thead>
              <tr>
                <th>Barangay</th>
                <th class="ci-table-num">Total Recorded</th>
                <th class="ci-table-num">Published &amp; Available</th>
                <th class="ci-table-num">Pending Review</th>
                <th class="ci-table-num">Land Area (sqm)</th>
                <th class="ci-table-num">Avg. Price / sqm</th>
              </tr>
            </thead>
            <tbody id="invBarangayTableBody">
              <!-- Dynamically populated via JS -->
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <!-- ======================================================================
         TAB 2: LISTING SUBMISSION & REVIEW TRENDS
         ====================================================================== -->
    <section class="ci-tab-pane" id="pane-activity" role="tabpanel" aria-labelledby="tabBtnActivity">
      <div class="ci-panel-grid">
        <article class="ci-card ci-span-full">
          <div class="ci-card-header">
            <div>
              <h2 class="ci-card-title">Submission vs. Publication Timeline</h2>
              <p class="ci-card-description">Distinguishing initial property submission dates from municipal review approval dates.</p>
            </div>
            <div class="ci-inline-badges">
              <span class="ci-badge ci-badge-ink">Submissions (created_at)</span>
              <span class="ci-badge ci-badge-mint">Approvals (audit_logs)</span>
            </div>
          </div>

          <div id="activityChartContainer" class="ci-activity-chart-stage">
            <!-- Interactive Swiss Stem & Spotlight Chart generated via JS -->
          </div>

          <div class="ci-callout">
            <svg class="ci-callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <div>
              <strong>Audit Log Timestamp Integrity:</strong>
              Submissions reflect initial intake in <code>properties.created_at</code>. Approvals reflect verified events logged in <code>audit_logs.action_type = 'APPROVE'</code>. A listing submitted on Monday and approved on Thursday correctly appears in Monday’s intake and Thursday’s publication count.
            </div>
          </div>
        </article>

        <article class="ci-card">
          <div class="ci-card-header">
            <div>
              <h2 class="ci-card-title">Listing Pipeline Status</h2>
              <p class="ci-card-description">Current review and publication states across all active records.</p>
            </div>
          </div>
          <div class="ci-table-wrapper ci-table-editorial">
            <table class="ci-table">
              <thead>
                <tr>
                  <th>Status State</th>
                  <th class="ci-table-num">Count</th>
                  <th class="ci-table-num">Percentage</th>
                </tr>
              </thead>
              <tbody id="activityStatusTableBody">
                <!-- Populated via JS -->
              </tbody>
            </table>
          </div>
        </article>

        <article class="ci-card">
          <div class="ci-card-header">
            <div>
              <h2 class="ci-card-title">Recent Submissions Intake</h2>
              <p class="ci-card-description">Latest property dossiers entering the municipal pipeline.</p>
            </div>
          </div>
          <div class="ci-table-wrapper ci-table-editorial">
            <table class="ci-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Property</th>
                  <th>Barangay</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="activityRecentSubmissionsBody">
                <!-- Populated via JS -->
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>

    <!-- ======================================================================
         TAB 3: BROKER VERIFICATION PIPELINE
         ====================================================================== -->
    <section class="ci-tab-pane" id="pane-brokers" role="tabpanel" aria-labelledby="tabBtnBrokers">
      <div class="ci-panel-grid">
        <article class="ci-card">
          <div class="ci-card-header">
            <div>
              <h2 class="ci-card-title">Broker Accreditation Status</h2>
              <p class="ci-card-description">PRC-licensed real estate broker applications reviewed by CICTO / City Admin.</p>
            </div>
            <span class="ci-card-tag">PRC Accredited</span>
          </div>

          <div class="ci-stat-grid-2" id="brokerStatusCards">
            <!-- Populated via JS -->
          </div>

          <div class="ci-callout">
            <svg class="ci-callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div>
              <strong>Confidentiality &amp; Privacy Safeguards:</strong>
              PRC license credentials, government IDs, and submitted confidential proof documents are strictly segregated. General reports summarize aggregate accreditation metrics without exposing private credentials.
            </div>
          </div>
        </article>

        <article class="ci-card">
          <div class="ci-card-header">
            <div>
              <h2 class="ci-card-title">Recent Broker Reviews</h2>
              <p class="ci-card-description">Latest applicant profiles processed by the city reviewer.</p>
            </div>
          </div>

          <div class="ci-table-wrapper ci-table-editorial">
            <table class="ci-table">
              <thead>
                <tr>
                  <th>Submitted</th>
                  <th>Applicant / Agency</th>
                  <th>Barangay</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="brokerApplicationsTableBody">
                <!-- Populated via JS -->
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>

    <!-- ======================================================================
         TAB 4: INVESTOR ENGAGEMENT & HIGH-INTENT SIGNALS
         ====================================================================== -->
    <section class="ci-tab-pane" id="pane-engagement" role="tabpanel" aria-labelledby="tabBtnEngagement">
      <div class="ci-panel-grid">
        <article class="ci-card">
          <div class="ci-card-header">
            <div>
              <h2 class="ci-card-title">High-Intent Investor Signals</h2>
              <p class="ci-card-description">Verified investment interest captured via shortlists, direct inquiries, and site visits.</p>
            </div>
            <span class="ci-card-tag">LEBDO Indicators</span>
          </div>

          <div class="ci-stat-grid-3">
            <div class="ci-signal-tile is-canary">
              <span class="ci-signal-label">Shortlists Saved</span>
              <div class="ci-signal-val" id="engShortlistsCount">0</div>
            </div>
            <div class="ci-signal-tile is-graphite">
              <span class="ci-signal-label">Direct Inquiries</span>
              <div class="ci-signal-val" id="engInquiriesCount">0</div>
            </div>
            <div class="ci-signal-tile is-stone">
              <span class="ci-signal-label">Logged Site Visits</span>
              <div class="ci-signal-val" id="engVisitsCount">0</div>
            </div>
          </div>

          <div class="ci-callout">
            <svg class="ci-callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <div>
              <strong>Telemetry Disclosure &amp; Data Authenticity:</strong>
              Interest is not transaction demand. Property saves and inquiries are real recorded signals. General website traffic counters are not conflated with property views. Individual browsing identities remain strictly private under data protection rules.
            </div>
          </div>
        </article>

        <article class="ci-card">
          <div class="ci-card-header">
            <div>
              <h2 class="ci-card-title">Most Engaged Opportunities</h2>
              <p class="ci-card-description">Properties attracting the highest recorded investor attention.</p>
            </div>
          </div>

          <div class="ci-table-wrapper ci-table-editorial">
            <table class="ci-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Barangay</th>
                  <th class="ci-table-num">Shortlists</th>
                  <th class="ci-table-num">Inquiries</th>
                  <th class="ci-table-num">Visits</th>
                </tr>
              </thead>
              <tbody id="engTopPropertiesBody">
                <!-- Populated via JS -->
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>

    <!-- ======================================================================
         TAB 5: MCE EVIDENCE & ASSESSMENT READINESS
         ====================================================================== -->
    <section class="ci-tab-pane" id="pane-assessment" role="tabpanel" aria-labelledby="tabBtnAssessment">
      <div class="ci-panel-grid">
        <article class="ci-card">
          <div class="ci-card-header">
            <div>
              <h2 class="ci-card-title">Five-Criterion Assessment Completeness</h2>
              <p class="ci-card-description">MCE criteria verification status across municipal records.</p>
            </div>
            <span class="ci-card-tag">Thesis MCE Engine</span>
          </div>

          <div class="ci-stat-grid-3">
            <div class="ci-signal-tile is-mint">
              <span class="ci-signal-label">Complete &amp; Verified</span>
              <div class="ci-signal-val" id="assCompleteCount">0</div>
            </div>
            <div class="ci-signal-tile is-graphite">
              <span class="ci-signal-label">Provisional Model</span>
              <div class="ci-signal-val" id="assProvisionalCount">0</div>
            </div>
            <div class="ci-signal-tile is-canary">
              <span class="ci-signal-label">Incomplete Evidence</span>
              <div class="ci-signal-val" id="assIncompleteCount">0</div>
            </div>
          </div>

          <div class="ci-callout">
            <svg class="ci-callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <div>
              <strong>Assessment Readiness vs. Final Ranking:</strong>
              The IAI evaluates an individual parcel's recorded attractiveness based on 5 weighted criteria. This module evaluates whether municipal evidence is complete. A provisional IAI score without ground-truth verification is not treated as an official endorsement.
            </div>
          </div>
        </article>

        <article class="ci-card">
          <div class="ci-card-header">
            <div>
              <h2 class="ci-card-title">Zoning &amp; Environmental Verification</h2>
              <p class="ci-card-description">CLUP 2025–2035 compliance and geotechnical risk review flags.</p>
            </div>
            <span class="ci-card-tag">Zoning &amp; Hazards</span>
          </div>

          <div class="ci-dual-subtables">
            <div>
              <span class="ci-section-kicker">CLUP Zoning Compliance</span>
              <div class="ci-table-wrapper ci-table-soft">
                <table class="ci-table">
                  <tbody id="assZoningTableBody">
                    <!-- Populated via JS -->
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <span class="ci-section-kicker">Hazard Review Flags</span>
              <div class="ci-table-wrapper ci-table-soft">
                <table class="ci-table">
                  <tbody id="assHazardTableBody">
                    <!-- Populated via JS -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </article>
      </div>

      <article class="ci-card ci-table-card">
        <div class="ci-card-header">
          <div>
            <h2 class="ci-card-title">Assessment Verification Queue</h2>
            <p class="ci-card-description">Detailed review states of recorded properties with pending evidence requirements.</p>
          </div>
        </div>

        <div class="ci-table-wrapper ci-table-editorial">
          <table class="ci-table" id="assQueueTable">
            <thead>
              <tr>
                <th>Property</th>
                <th>Barangay</th>
                <th>MCE Status</th>
                <th>IAI Score</th>
                <th>Zoning State</th>
                <th>Hazard Review</th>
                <th>Review Status</th>
              </tr>
            </thead>
            <tbody id="assQueueTableBody">
              <!-- Populated via JS -->
            </tbody>
          </table>
        </div>
      </article>
    </section>
  </div>

  <!-- ======================================================================
       REPORT GENERATOR MODAL DIALOG
       ====================================================================== -->
  <dialog class="ci-modal" id="ciReportModal" aria-labelledby="reportModalTitle">
    <div class="ci-modal-header">
      <div>
        <h2 class="ci-modal-title" id="reportModalTitle">City Investment Report Generator</h2>
        <span class="ci-modal-sub">Generate printable, executive-grade PDF reports for CAO, LEBDO, and CICTO planning.</span>
      </div>
      <button type="button" class="ci-modal-close" id="closeReportModalBtn" aria-label="Close dialog">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div class="ci-modal-body">
      <h3 class="ci-modal-step">1. Select Report Template</h3>
      <div class="ci-template-picker">
        <div class="ci-template-card is-selected" data-template="inventory">
          <span class="ci-template-badge">CAO &amp; LEBDO</span>
          <h4 class="ci-template-title">City Property Inventory Report</h4>
          <p class="ci-template-desc">Summarizes available properties, physical typologies, classifications, barangay distribution, and sale/lease terms.</p>
        </div>

        <div class="ci-template-card" data-template="activity">
          <span class="ci-template-badge">LEBDO FOCUS</span>
          <h4 class="ci-template-title">Investment Activity &amp; Engagement Report</h4>
          <p class="ci-template-desc">Summarizes submission intake, broker applications, listing review velocity, and recorded investor engagement signals.</p>
        </div>

        <div class="ci-template-card" data-template="assessment">
          <span class="ci-template-badge">CAO, LEBDO &amp; CICTO</span>
          <h4 class="ci-template-title">Property Assessment &amp; Verification Report</h4>
          <p class="ci-template-desc">Summarizes MCE criterion completeness, provisional scoring states, CLUP zoning compliance, and hazard review flags.</p>
        </div>

        <div class="ci-template-card" data-template="consolidated">
          <span class="ci-template-badge">EXECUTIVE SUMMARY</span>
          <h4 class="ci-template-title">Consolidated Municipal Dossier</h4>
          <p class="ci-template-desc">Comprehensive all-in-one dossier uniting inventory, submission trends, broker status, and assessment readiness.</p>
        </div>
      </div>

      <h3 class="ci-modal-step">2. Report Scope &amp; Applied Filters</h3>
      <div class="ci-modal-scope-box">
        <div>
          <span class="ci-modal-scope-key">Period</span>
          <span class="ci-modal-scope-val" id="repScopePeriod">All Time</span>
        </div>
        <div>
          <span class="ci-modal-scope-key">Barangay Scope</span>
          <span class="ci-modal-scope-val" id="repScopeBarangay">All <?= $barangayTotalCount ?> Barangays</span>
        </div>
        <div>
          <span class="ci-modal-scope-key">Typology Filter</span>
          <span class="ci-modal-scope-val" id="repScopeType">All Typologies</span>
        </div>
      </div>

      <h3 class="ci-modal-step">3. Report Options</h3>
      <label class="ci-modal-checkbox">
        <input type="checkbox" id="repOptAppendix" checked>
        <span>Include Detailed Municipal Property Schedule Appendix</span>
      </label>

      <div class="ci-report-disclaimer-box">
        <strong>Mandatory Verification Notice:</strong><br>
        All generated reports strictly include the city governance footer:<br>
        <em>Generated by LOCUS-SF | For planning and information purposes | Subject to data completeness and verification</em>
      </div>
    </div>

    <div class="ci-modal-footer">
      <button type="button" class="ci-btn-secondary" id="cancelReportModalBtn">Cancel</button>
      <button type="button" class="ci-btn-primary" id="triggerPrintBtn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        <span>Print / Save as PDF</span>
      </button>
    </div>
  </dialog>

  <!-- ======================================================================
       PRINT CONTAINER (Rendered dynamically on window.print)
       ====================================================================== -->
  <div id="cityPrintContainer" aria-hidden="true"></div>
</main>

<script type="application/json" id="ciGeoContext"><?= json_encode($geoContextPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?></script>
<script src="<?= $escape($context['assetBase']) ?>/js/city-intelligence.js<?= sfc_asset_version('js/city-intelligence.js') ?>"></script>
<?php sfc_render_footer($context); ?>
