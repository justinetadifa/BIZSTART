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
$today = new DateTimeImmutable('now', new DateTimeZone('Asia/Manila'));
$escape = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');

sfc_render_head('City Investment Intelligence & Reporting | LOCUS-SF', $context, [
    'page' => 'city-intelligence',
    'role' => 'admin',
]);
sfc_render_header($context, 'intelligence');
?>
<link rel="stylesheet" href="<?= $escape($context['assetBase']) ?>/css/city-intelligence.css<?= sfc_asset_version('css/city-intelligence.css') ?>">

<main class="ci-workspace" id="cityIntelligenceApp" data-department="<?= $escape($department) ?>">
  <!-- Executive Header -->
  <header class="ci-header">
    <div class="ci-eyebrow-row">
      <span class="ci-eyebrow">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 2v20M2 12h20"/></svg>
        LOCUS-SF / CITY OPERATIONS
      </span>
      <div class="ci-dept-pill">
        <span class="ci-pulse-dot" aria-hidden="true"></span>
        <span><?= $escape($deptLabel) ?></span>
      </div>
    </div>

    <div class="ci-title-group">
      <div>
        <h1 class="ci-title">City Investment Intelligence &amp; Reporting<span class="ci-period">.</span></h1>
        <p class="ci-subtitle">
          From property records to actionable local investment information. Consolidating municipal property inventory, broker pipelines, investor activity, and assessment readiness across San Fernando City.
        </p>
      </div>

      <div class="ci-actions">
        <button type="button" class="ci-btn-secondary" id="refreshDataBtn" title="Reload live data from the municipal database">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>
          Refresh
        </button>
        <button type="button" class="ci-btn-primary" id="openReportModalBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
          City Investment Report Generator
        </button>
      </div>
    </div>
  </header>

  <!-- Filter Instrument Toolbar -->
  <section class="ci-filter-toolbar" aria-label="Dashboard Filters">
    <form id="ciFilterForm" class="ci-filter-row" onsubmit="return false;">
      <div class="ci-filter-fields">
        <!-- Date Range Filter -->
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

        <!-- Custom Date Inputs (Conditional) -->
        <div class="ci-filter-item" id="customStartGroup" style="display: none;">
          <label for="filterStartDate" class="ci-filter-label">From</label>
          <input type="date" id="filterStartDate" name="start_date" class="ci-input" max="<?= $today->format('Y-m-d') ?>">
        </div>
        <div class="ci-filter-item" id="customEndGroup" style="display: none;">
          <label for="filterEndDate" class="ci-filter-label">To</label>
          <input type="date" id="filterEndDate" name="end_date" class="ci-input" max="<?= $today->format('Y-m-d') ?>">
        </div>

        <!-- Barangay Filter -->
        <div class="ci-filter-item">
          <label for="filterBarangay" class="ci-filter-label">Barangay (San Fernando)</label>
          <select id="filterBarangay" name="barangay" class="ci-select">
            <option value="all" selected>All 30 Barangays</option>
            <?php foreach ($barangays as $bg): ?>
            <option value="<?= $escape($bg) ?>"><?= $escape($bg) ?></option>
            <?php endforeach; ?>
          </select>
        </div>

        <!-- Property Typology Filter -->
        <div class="ci-filter-item">
          <label for="filterPropertyType" class="ci-filter-label">Primary Typology</label>
          <select id="filterPropertyType" name="property_type" class="ci-select">
            <option value="all" selected>All Typologies</option>
            <option value="land">Land Parcels (Bare Land / Commercial Lots)</option>
            <option value="building">Buildings &amp; Built Structures (Commercial / Office)</option>
            <option value="mixed">Mixed / Unspecified</option>
          </select>
        </div>

        <!-- Listing Status Filter -->
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
        <span class="ci-active-period-badge" id="activePeriodBadge">All Time</span>
        <button type="button" class="ci-filter-reset" id="resetFiltersBtn">Reset</button>
      </div>
    </form>
  </section>

  <!-- Top KPI Ribbon -->
  <section class="ci-kpi-grid" aria-label="Key Performance Indicators">
    <!-- 1. Available Properties -->
    <article class="ci-kpi-card is-available">
      <div class="ci-kpi-header">
        <span class="ci-kpi-label">Available Properties</span>
        <span class="ci-kpi-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </span>
      </div>
      <div class="ci-kpi-value" id="kpiAvailable"><?= (int) $initialData['kpi']['properties_published'] ?></div>
      <div class="ci-kpi-subtext" id="kpiAvailableSub">Published &amp; verified on market</div>
    </article>

    <!-- 2. Land & Built Footprint -->
    <article class="ci-kpi-card is-area">
      <div class="ci-kpi-header">
        <span class="ci-kpi-label">Land Footprint</span>
        <span class="ci-kpi-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        </span>
      </div>
      <div class="ci-kpi-value" id="kpiArea"><?= number_format($initialData['kpi']['total_land_area_sqm']) ?> <small style="font-size: 13px; font-weight: 600;">sqm</small></div>
      <div class="ci-kpi-subtext" id="kpiAreaSub"><?= number_format($initialData['kpi']['total_building_area_sqm']) ?> sqm built floor area</div>
    </article>

    <!-- 3. New Submissions in Scope -->
    <article class="ci-kpi-card is-submissions">
      <div class="ci-kpi-header">
        <span class="ci-kpi-label">Recorded Submissions</span>
        <span class="ci-kpi-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        </span>
      </div>
      <div class="ci-kpi-value" id="kpiSubmissions"><?= (int) $initialData['kpi']['submissions_in_period'] ?></div>
      <div class="ci-kpi-subtext" id="kpiSubmissionsSub">Total in selected period</div>
    </article>

    <!-- 4. Review Queue Pending -->
    <article class="ci-kpi-card is-pending">
      <div class="ci-kpi-header">
        <span class="ci-kpi-label">Reviews Pending</span>
        <span class="ci-kpi-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
      </div>
      <div class="ci-kpi-value" id="kpiPending"><?= (int) $initialData['kpi']['properties_pending'] ?></div>
      <div class="ci-kpi-subtext" id="kpiPendingSub">Awaiting CAO/CICTO review</div>
    </article>

    <!-- 5. Broker Pipeline -->
    <article class="ci-kpi-card is-brokers">
      <div class="ci-kpi-header">
        <span class="ci-kpi-label">Broker Applications</span>
        <span class="ci-kpi-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </span>
      </div>
      <div class="ci-kpi-value" id="kpiBrokers"><?= (int) $initialData['kpi']['broker_applications_in_period'] ?></div>
      <div class="ci-kpi-subtext" id="kpiBrokersSub"><?= (int) ($initialData['broker_activity']['status_breakdown']['approved'] ?? 0) ?> verified active brokers</div>
    </article>

    <!-- 6. Complete MCE Assessments -->
    <article class="ci-kpi-card is-verified">
      <div class="ci-kpi-header">
        <span class="ci-kpi-label">Verified Assessments</span>
        <span class="ci-kpi-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </span>
      </div>
      <div class="ci-kpi-value" id="kpiVerified"><?= (int) $initialData['assessment_readiness']['counts']['complete_verified'] ?></div>
      <div class="ci-kpi-subtext" id="kpiVerifiedSub"><?= (int) $initialData['assessment_readiness']['counts']['provisional_model'] ?> provisional models</div>
    </article>
  </section>

  <!-- Navigation Tabs -->
  <nav class="ci-tabs-nav" role="tablist" aria-label="Intelligence Categories">
    <button type="button" class="ci-tab-btn is-active" role="tab" aria-selected="true" data-tab="inventory" id="tabBtnInventory">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      <span>Property Inventory</span>
      <span class="ci-tab-badge" id="tabBadgeInventory"><?= (int) $initialData['kpi']['properties_total'] ?></span>
    </button>

    <button type="button" class="ci-tab-btn" role="tab" aria-selected="false" data-tab="activity" id="tabBtnActivity">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
      <span>Listing &amp; Review Trends</span>
      <span class="ci-tab-badge" id="tabBadgeActivity"><?= (int) $initialData['kpi']['submissions_in_period'] ?></span>
    </button>

    <button type="button" class="ci-tab-btn" role="tab" aria-selected="false" data-tab="brokers" id="tabBtnBrokers">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <span>Broker Activity</span>
      <span class="ci-tab-badge" id="tabBadgeBrokers"><?= (int) $initialData['kpi']['broker_applications_in_period'] ?></span>
    </button>

    <button type="button" class="ci-tab-btn" role="tab" aria-selected="false" data-tab="engagement" id="tabBtnEngagement">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      <span>Investor Engagement</span>
      <span class="ci-tab-badge" id="tabBadgeEngagement"><?= (int) $initialData['kpi']['total_shortlists'] + (int) $initialData['kpi']['total_inquiries'] ?></span>
    </button>

    <button type="button" class="ci-tab-btn" role="tab" aria-selected="false" data-tab="assessment" id="tabBtnAssessment">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span>Assessment Readiness</span>
      <span class="ci-tab-badge" id="tabBadgeAssessment"><?= (int) $initialData['assessment_readiness']['counts']['complete_verified'] ?></span>
    </button>
  </nav>

  <!-- ======================================================================
       TAB 1: PROPERTY INVENTORY & CLASSIFICATION
       ====================================================================== -->
  <section class="ci-tab-pane is-active" id="pane-inventory" role="tabpanel" aria-labelledby="tabBtnInventory">
    <div class="ci-panel-grid">
      <!-- Mutually Exclusive Primary Typology -->
      <article class="ci-card">
        <div class="ci-card-header">
          <div>
            <h2 class="ci-card-title">Primary Physical Typology</h2>
            <p class="ci-card-description">Mutually exclusive parcel forms to prevent double-counting across totals.</p>
          </div>
          <span class="ci-card-tag">Mutually Exclusive</span>
        </div>

        <div class="ci-distribution-track" id="invPrimaryTrack">
          <!-- Rendered via JS / fallback -->
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
          <svg class="ci-callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <div>
            <strong>CAO Double-Counting Prevention Protocol:</strong>
            Property physical form (land vs building) is mutually exclusive. A commercial building occupies a land parcel, but in municipal inventory reporting, parcels are categorized by primary form to ensure the total equals the exact record count.
          </div>
        </div>
      </article>

      <!-- Functional Classifications & Tenure -->
      <article class="ci-card">
        <div class="ci-card-header">
          <div>
            <h2 class="ci-card-title">Classifications &amp; Transaction Terms</h2>
            <p class="ci-card-description">Functional land use designations and sale vs lease tenure distribution.</p>
          </div>
          <span class="ci-card-tag">Cross-Classification</span>
        </div>

        <div class="ci-table-wrapper" style="margin-bottom: 14px;">
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

        <div style="padding-top: 10px; border-top: 1px solid #f1f5f9;">
          <strong style="display: block; font-size: 12px; margin-bottom: 8px; color: #475569; text-transform: uppercase; font-family: ui-monospace, monospace;">Transaction Tenure</strong>
          <div style="display: flex; gap: 14px; flex-wrap: wrap;" id="invTenureDistribution">
            <!-- Dynamically populated -->
          </div>
        </div>
      </article>
    </div>

    <!-- Full 30-Barangay Municipal Geographic Distribution -->
    <article class="ci-card">
      <div class="ci-card-header">
        <div>
          <h2 class="ci-card-title">Geographic Distribution across San Fernando City</h2>
          <p class="ci-card-description">Complete municipal breakdown by barangay, showing recorded inventory, published listings, total land area, and price benchmarks.</p>
        </div>
        <span class="ci-card-tag">30 Barangays</span>
      </div>

      <div class="ci-table-wrapper">
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
      <!-- Submission vs Publication Timeline Chart -->
      <article class="ci-card" style="grid-column: 1 / -1;">
        <div class="ci-card-header">
          <div>
            <h2 class="ci-card-title">Submission vs. Publication Timeline</h2>
            <p class="ci-card-description">Distinguishing initial property submission dates from municipal review approval dates.</p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="ci-badge ci-badge-blue">Submissions (created_at)</span>
            <span class="ci-badge ci-badge-green">Approvals (audit_logs)</span>
          </div>
        </div>

        <div id="activityChartContainer" style="min-height: 220px; width: 100%; position: relative;">
          <!-- SVG chart generated via JS -->
        </div>

        <div class="ci-callout">
          <svg class="ci-callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <div>
            <strong>Audit Log Timestamp Integrity:</strong>
            Submissions reflect initial intake in <code>properties.created_at</code>. Approvals reflect verified events logged in <code>audit_logs.action_type = 'APPROVE'</code>. A listing submitted on Monday and approved on Thursday correctly appears in Monday’s intake and Thursday’s publication count.
          </div>
        </div>
      </article>

      <!-- Review Status Distribution -->
      <article class="ci-card">
        <div class="ci-card-header">
          <div>
            <h2 class="ci-card-title">Listing Pipeline Status</h2>
            <p class="ci-card-description">Current review and publication states across all active records.</p>
          </div>
        </div>
        <div class="ci-table-wrapper">
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

      <!-- Recent Submissions Queue -->
      <article class="ci-card">
        <div class="ci-card-header">
          <div>
            <h2 class="ci-card-title">Recent Submissions Intake</h2>
            <p class="ci-card-description">Latest property dossiers entering the municipal pipeline.</p>
          </div>
        </div>
        <div class="ci-table-wrapper">
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
      <!-- Broker Pipeline Summary -->
      <article class="ci-card">
        <div class="ci-card-header">
          <div>
            <h2 class="ci-card-title">Broker Accreditation Status</h2>
            <p class="ci-card-description">PRC-licensed real estate broker applications reviewed by CICTO / City Admin.</p>
          </div>
          <span class="ci-card-tag">PRC Accredited</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;" id="brokerStatusCards">
          <!-- Populated via JS -->
        </div>

        <div class="ci-callout">
          <svg class="ci-callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <div>
            <strong>Confidentiality &amp; Privacy Safeguards:</strong>
            PRC license credentials, government IDs, and submitted confidential proof documents are strictly segregated. General reports summarize aggregate accreditation metrics without exposing private credentials.
          </div>
        </div>
      </article>

      <!-- Recent Applications Queue -->
      <article class="ci-card">
        <div class="ci-card-header">
          <div>
            <h2 class="ci-card-title">Recent Broker Reviews</h2>
            <p class="ci-card-description">Latest applicant profiles processed by the city reviewer.</p>
          </div>
        </div>

        <div class="ci-table-wrapper">
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
      <!-- Engagement Signals Breakdown -->
      <article class="ci-card">
        <div class="ci-card-header">
          <div>
            <h2 class="ci-card-title">High-Intent Investor Signals</h2>
            <p class="ci-card-description">Verified investment interest captured via shortlists, direct inquiries, and site visits.</p>
          </div>
          <span class="ci-card-tag">LEBDO Indicators</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
          <div style="padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #0f172a;" id="engShortlistsCount">0</div>
            <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; font-family: ui-monospace, monospace; margin-top: 4px;">Shortlists Saved</div>
          </div>
          <div style="padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #0f172a;" id="engInquiriesCount">0</div>
            <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; font-family: ui-monospace, monospace; margin-top: 4px;">Direct Inquiries</div>
          </div>
          <div style="padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #0f172a;" id="engVisitsCount">0</div>
            <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; font-family: ui-monospace, monospace; margin-top: 4px;">Logged Site Visits</div>
          </div>
        </div>

        <div class="ci-callout">
          <svg class="ci-callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <div>
            <strong>Telemetry Disclosure &amp; Data Authenticity:</strong>
            Interest is not transaction demand. Property saves and inquiries are real recorded signals. General website traffic counters are not conflated with property views. Individual browsing identities remain strictly private under data protection rules.
          </div>
        </div>
      </article>

      <!-- Top Shortlisted Properties -->
      <article class="ci-card">
        <div class="ci-card-header">
          <div>
            <h2 class="ci-card-title">Most Engaged Opportunities</h2>
            <p class="ci-card-description">Properties attracting the highest recorded investor attention.</p>
          </div>
        </div>

        <div class="ci-table-wrapper">
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
      <!-- MCE Completeness & Status -->
      <article class="ci-card">
        <div class="ci-card-header">
          <div>
            <h2 class="ci-card-title">Five-Criterion Assessment Completeness</h2>
            <p class="ci-card-description">MCE criteria verification status across municipal records.</p>
          </div>
          <span class="ci-card-tag">Thesis MCE Engine</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
          <div style="padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: 800; color: #047857;" id="assCompleteCount">0</div>
            <div style="font-size: 10.5px; font-weight: 700; color: #065f46; text-transform: uppercase; font-family: ui-monospace, monospace; margin-top: 4px;">Complete &amp; Verified</div>
          </div>
          <div style="padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: 800; color: #1d4ed8;" id="assProvisionalCount">0</div>
            <div style="font-size: 10.5px; font-weight: 700; color: #1e40af; text-transform: uppercase; font-family: ui-monospace, monospace; margin-top: 4px;">Provisional Model</div>
          </div>
          <div style="padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: 800; color: #b45309;" id="assIncompleteCount">0</div>
            <div style="font-size: 10.5px; font-weight: 700; color: #92400e; text-transform: uppercase; font-family: ui-monospace, monospace; margin-top: 4px;">Incomplete Evidence</div>
          </div>
        </div>

        <div class="ci-callout">
          <svg class="ci-callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <div>
            <strong>Assessment Readiness vs. Final Ranking:</strong>
            The IAI evaluates an individual parcel's recorded attractiveness based on 5 weighted criteria. This module evaluates whether municipal evidence is complete. A provisional IAI score without ground-truth verification is not treated as an official endorsement.
          </div>
        </div>
      </article>

      <!-- CLUP Zoning & Hazard Constraints -->
      <article class="ci-card">
        <div class="ci-card-header">
          <div>
            <h2 class="ci-card-title">Zoning &amp; Environmental Verification</h2>
            <p class="ci-card-description">CLUP 2025–2035 compliance and geotechnical risk review flags.</p>
          </div>
          <span class="ci-card-tag">Zoning &amp; Hazards</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div>
            <strong style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-family: ui-monospace, monospace; margin-bottom: 8px;">CLUP Zoning Compliance</strong>
            <div class="ci-table-wrapper">
              <table class="ci-table">
                <tbody id="assZoningTableBody">
                  <!-- Populated via JS -->
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <strong style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-family: ui-monospace, monospace; margin-bottom: 8px;">Hazard Review Flags</strong>
            <div class="ci-table-wrapper">
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

    <!-- Assessment Queue Table -->
    <article class="ci-card" style="margin-top: 20px;">
      <div class="ci-card-header">
        <div>
          <h2 class="ci-card-title">Assessment Verification Queue</h2>
          <p class="ci-card-description">Detailed review states of recorded properties with pending evidence requirements.</p>
        </div>
      </div>

      <div class="ci-table-wrapper">
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

  <!-- ======================================================================
       REPORT GENERATOR MODAL DIALOG
       ====================================================================== -->
  <dialog class="ci-modal" id="ciReportModal" aria-labelledby="reportModalTitle">
    <div class="ci-modal-header">
      <div>
        <h2 class="ci-modal-title" id="reportModalTitle">City Investment Report Generator</h2>
        <span style="font-size: 12px; color: #64748b;">Generate printable, executive-grade PDF reports for CAO, LEBDO, and CICTO planning.</span>
      </div>
      <button type="button" class="ci-modal-close" id="closeReportModalBtn" aria-label="Close dialog">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div class="ci-modal-body">
      <h3 style="font-size: 13px; text-transform: uppercase; font-family: ui-monospace, monospace; color: #475569; margin: 0 0 12px;">1. Select Report Template</h3>
      <div class="ci-template-picker">
        <!-- Template 1: Inventory -->
        <div class="ci-template-card is-selected" data-template="inventory">
          <span class="ci-template-badge">CAO &amp; LEBDO</span>
          <h4 class="ci-template-title">City Property Inventory Report</h4>
          <p class="ci-template-desc">Summarizes available properties, physical typologies, classifications, barangay distribution, and sale/lease terms.</p>
        </div>

        <!-- Template 2: Activity & Engagement -->
        <div class="ci-template-card" data-template="activity">
          <span class="ci-template-badge">LEBDO FOCUS</span>
          <h4 class="ci-template-title">Investment Activity &amp; Engagement Report</h4>
          <p class="ci-template-desc">Summarizes submission intake, broker applications, listing review velocity, and recorded investor engagement signals.</p>
        </div>

        <!-- Template 3: Assessment Readiness -->
        <div class="ci-template-card" data-template="assessment">
          <span class="ci-template-badge">CAO, LEBDO &amp; CICTO</span>
          <h4 class="ci-template-title">Property Assessment &amp; Verification Report</h4>
          <p class="ci-template-desc">Summarizes MCE criterion completeness, provisional scoring states, CLUP zoning compliance, and hazard review flags.</p>
        </div>

        <!-- Template 4: Consolidated Executive Dossier -->
        <div class="ci-template-card" data-template="consolidated">
          <span class="ci-template-badge">EXECUTIVE SUMMARY</span>
          <h4 class="ci-template-title">Consolidated Municipal Dossier</h4>
          <p class="ci-template-desc">Comprehensive all-in-one dossier uniting inventory, submission trends, broker status, and assessment readiness.</p>
        </div>
      </div>

      <h3 style="font-size: 13px; text-transform: uppercase; font-family: ui-monospace, monospace; color: #475569; margin: 0 0 10px;">2. Report Scope &amp; Applied Filters</h3>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 18px; font-size: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
        <div><strong style="color: #64748b; font-size: 10.5px; text-transform: uppercase; font-family: ui-monospace, monospace; display: block;">Period</strong><span id="repScopePeriod">All Time</span></div>
        <div><strong style="color: #64748b; font-size: 10.5px; text-transform: uppercase; font-family: ui-monospace, monospace; display: block;">Barangay Scope</strong><span id="repScopeBarangay">All 30 Barangays</span></div>
        <div><strong style="color: #64748b; font-size: 10.5px; text-transform: uppercase; font-family: ui-monospace, monospace; display: block;">Typology Filter</strong><span id="repScopeType">All Typologies</span></div>
      </div>

      <h3 style="font-size: 13px; text-transform: uppercase; font-family: ui-monospace, monospace; color: #475569; margin: 0 0 10px;">3. Report Options</h3>
      <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; cursor: pointer; margin-bottom: 16px;">
        <input type="checkbox" id="repOptAppendix" checked>
        <span>Include Detailed Municipal Property Schedule Appendix</span>
      </label>

      <div style="border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 11px; color: #64748b; font-family: ui-monospace, monospace;">
        <strong>Mandatory Verification Notice:</strong><br>
        All generated reports strictly include the city governance footer:<br>
        <em>Generated by LOCUS-SF | For planning and information purposes | Subject to data completeness and verification</em>
      </div>
    </div>

    <div class="ci-modal-footer">
      <button type="button" class="ci-btn-secondary" id="cancelReportModalBtn">Cancel</button>
      <button type="button" class="ci-btn-primary" id="triggerPrintBtn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / Save as PDF
      </button>
    </div>
  </dialog>

  <!-- ======================================================================
       PRINT CONTAINER (Rendered dynamically on window.print)
       ====================================================================== -->
  <div id="cityPrintContainer" aria-hidden="true">
    <!-- Populated by assets/js/city-intelligence.js before print -->
  </div>
</main>

<script src="<?= $escape($context['assetBase']) ?>/js/city-intelligence.js<?= sfc_asset_version('js/city-intelligence.js') ?>"></script>
<?php sfc_render_footer($context); ?>
