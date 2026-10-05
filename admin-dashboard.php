<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_require_role('admin', sfc_path('/admin-login.php'));
$context = sfc_web_context();
sfc_render_head('City Spatial Decision Platform | LOCUS-SF', $context, ['page' => 'admin-dashboard', 'role' => 'admin']);
sfc_render_header($context, 'admin');
$firstName = explode(' ', trim((string) ($context['user']['name'] ?? 'Administrator')))[0];
$initialProperties = \App\Support\JsonData::properties();
?>
<script>
  window.SFC_ADMIN_INITIAL_PROPERTIES = <?= json_encode($initialProperties, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>;
</script>
<main class="page-shell dashboard-page admin-dashboard-page" id="adminMain" tabindex="-1">
  <!-- Ultra-Premium City Spatial Decision Platform (Command Deck) -->
  <section class="site-shell admin-hero-deck" aria-label="City Spatial Decision Platform">
    <div class="admin-hero-grid">
      <!-- Left Column: Civic Intelligence & Telemetry -->
      <div class="admin-hero-content">
        <div class="admin-eyebrow-badge">
          <span class="adm-radar-pulse" aria-hidden="true"></span>
          <span class="adm-eyebrow-txt">LGU Geospatial Intelligence &bull; Region I</span>
        </div>

        <h1 class="admin-hero-title">
          City Spatial<br>
          <span class="admin-hero-title-gradient">Decision Platform</span>
        </h1>

        <p class="admin-hero-description">
          Multi-criteria evaluation (MCE) engine and assessed land parcel intelligence aligned with San Fernando's Comprehensive Land Use Plan (CLUP 2025&ndash;2035).
        </p>

        <!-- Precision Telemetry Cluster (Apple Geometric Spec) -->
        <div class="admin-telemetry-cluster" role="region" aria-label="Geospatial Telemetry">
          <div class="adm-telemetry-chip">
            <?= sfc_domain_icon('propertyinfo', 'xs') ?>
            <div class="adm-chip-body">
              <span class="adm-chip-kicker">Assessed Parcels</span>
              <strong class="adm-chip-val text-emerald tabular-nums" data-hero-parcels-count>10 Live Sites</strong>
            </div>
          </div>
          <div class="adm-telemetry-chip">
            <?= sfc_domain_icon('clupzoning', 'xs') ?>
            <div class="adm-chip-body">
              <span class="adm-chip-kicker">Zoning Engine</span>
              <strong class="adm-chip-val text-amber tabular-nums">CLUP 2025&ndash;2035</strong>
            </div>
          </div>
          <div class="adm-telemetry-chip">
            <?= sfc_domain_icon('mce', 'xs') ?>
            <div class="adm-chip-body">
              <span class="adm-chip-kicker">MCE Index</span>
              <strong class="adm-chip-val text-sky tabular-nums">94.2% Prime</strong>
            </div>
          </div>
        </div>

        <!-- Action Commands: Tactile Apple Buttons -->
        <div class="admin-hero-actions no-print">
          <a href="<?= htmlspecialchars(sfc_path('/admin-properties.php'), ENT_QUOTES, 'UTF-8') ?>" class="adm-btn locus-blue-button" id="btnManageLandParcels">
            <?= sfc_blue_button_art($context) ?>
            <svg class="adm-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
            <span>Manage Land Parcels</span>
            <span class="adm-btn-arrow" aria-hidden="true">&rarr;</span>
          </a>
          <a href="<?= htmlspecialchars(sfc_path('/admin-showcase.php'), ENT_QUOTES, 'UTF-8') ?>" class="adm-btn adm-btn-glass" id="btnMceEngine">
            <svg class="adm-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>MCE Engine</span>
          </a>
          <button type="button" class="adm-btn adm-btn-amber-pill" data-admin-go="inbox" id="btnInvestorQueries">
            <svg class="adm-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>Investor Queries</span>
            <span class="adm-counter-badge tabular-nums" data-hero-inquiry-badge>2</span>
          </button>
        </div>
      </div>

      <!-- Right Column: Interactive Aerospace-Grade GIS Viewport with map-pins.png -->
      <div class="admin-gis-viewport-wrapper">
        <div class="admin-gis-frame">
          <!-- Top HUD Overlay -->
          <div class="gis-hud-header">
            <div class="gis-live-indicator">
              <span class="gis-beacon-cyan" aria-hidden="true"></span>
              <span>MCE Spatial Zoning Active</span>
            </div>
            <div class="gis-layer-pills" role="group" aria-label="GIS Layers">
              <button type="button" class="gis-pill-btn is-active" data-gis-filter="all">All</button>
              <button type="button" class="gis-pill-btn" data-gis-filter="clup">CLUP Zones</button>
              <button type="button" class="gis-pill-btn" data-gis-filter="heatmap">Heatmap</button>
              <button type="button" class="gis-pill-btn" data-gis-filter="parcels">Parcels</button>
            </div>
          </div>

          <!-- Leaflet GIS Map Container -->
          <div id="adminHeroMap" class="admin-hero-leaflet-map" role="region" aria-label="San Fernando City GIS Map"></div>

          <!-- Bottom HUD Overlay -->
          <div class="gis-hud-footer">
            <div class="gis-legend-row" role="note" aria-label="Zoning Legend">
              <span class="gis-legend-item"><i class="gis-legend-dot dot-c3"></i> C-3 Commercial</span>
              <span class="gis-legend-item"><i class="gis-legend-dot dot-poro"></i> Poro Freeport</span>
              <span class="gis-legend-item"><i class="gis-legend-dot dot-coastal"></i> Coastal Belt</span>
              <span class="gis-legend-item"><i class="gis-legend-dot dot-ind"></i> Industrial</span>
            </div>
            <div class="gis-footer-brand">
              <span class="gis-lgu-pill"><i class="gis-lgu-dot"></i> San Fernando LGU GIS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Workspace Sub-Navigation Bar -->
  <div class="admin-workspace-bar">
    <div class="admin-view-tabs" role="tablist" aria-label="Admin workspace sections">
      <button type="button" id="adminTab-overview" role="tab" aria-selected="true" aria-controls="adminPanel-overview" data-admin-view="overview">
        <?= sfc_icon('home') ?> Overview
      </button>
      <button type="button" id="adminTab-inbox" role="tab" aria-selected="false" aria-controls="adminPanel-inbox" tabindex="-1" data-admin-view="inbox">
        <?= sfc_icon('inbox') ?> Inbox <span data-admin-count="inbox" hidden></span>
      </button>
      <button type="button" id="adminTab-sellers" role="tab" aria-selected="false" aria-controls="adminPanel-sellers" tabindex="-1" data-admin-view="sellers">
        <?= sfc_icon('admin') ?> Seller reviews <span data-admin-count="sellers" hidden></span>
      </button>
      <button type="button" id="adminTab-activity" role="tab" aria-selected="false" aria-controls="adminPanel-activity" tabindex="-1" data-admin-view="activity">
        <?= sfc_icon('clock') ?> Activity
      </button>
    </div>
    <span class="admin-workspace-caption">City administration <span aria-hidden="true">/</span> Overview &amp; operations</span>
  </div>

  <!-- Dynamic Content Root (Mounts 4 KPI Cards & 2 Lower Panels) -->
  <section class="site-shell dashboard-root-grid" id="adminDashboardRoot" aria-busy="true">
    <span class="admin-loading-status" role="status">Loading city spatial intelligence&hellip;</span>
    <div class="admin-loading-skeleton" aria-hidden="true">
      <?php for ($card = 0; $card < 4; $card++): ?>
        <div class="admin-skeleton-card"><span class="admin-skeleton-bar"></span><span class="admin-skeleton-value"></span><span class="admin-skeleton-line"></span></div>
      <?php endfor; ?>
      <?php for ($panel = 0; $panel < 2; $panel++): ?>
        <div class="admin-skeleton-panel"><span class="admin-skeleton-bar"></span><span class="admin-skeleton-line"></span><span class="admin-skeleton-line"></span></div>
      <?php endfor; ?>
    </div>
  </section>
</main>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-hero-map.js?v=<?= time() ?>"></script>
<?php sfc_render_footer($context); ?>
