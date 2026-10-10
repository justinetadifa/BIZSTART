<?php
declare(strict_types=1);

require_once __DIR__ . '/app/Support/web.php';
require_once __DIR__ . '/app/Support/PropertyCatalog.php';
require_once __DIR__ . '/app/Support/PropertyAssessment.php';

sfc_require_role('seller', sfc_path('/seller-login.php'));
$context = sfc_web_context();
$categories = \App\Support\PropertyCatalog::categories();
sfc_render_head('Broker dashboard | LOCUS-SF', $context, ['page' => 'broker-workspace', 'role' => 'seller']);
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/broker-workspace.css<?= htmlspecialchars(sfc_asset_version('css/broker-workspace.css'), ENT_QUOTES, 'UTF-8') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/workspace-polish.css<?= sfc_asset_version('css/workspace-polish.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/property-wizard.css<?= sfc_asset_version('css/property-wizard.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/vendor/geoman/leaflet-geoman.css">
<?php sfc_render_header($context, 'seller'); ?>
<?php
$user = $context['user'] ?? [];
$userName = (string) ($user['name'] ?? 'Maria');
$nameParts = preg_split('/\s+/', trim($userName));
$brokerFirstName = !empty($nameParts[0]) ? $nameParts[0] : 'Maria';
$brokerFirstName = trim((string) ($user['firstName'] ?? '')) ?: $brokerFirstName;
$brokerGreeting = ($_SESSION['sfc_account_greeting'] ?? '') === 'new' ? 'Welcome' : 'Welcome back';
?>
<main class="broker-workspace site-shell">
  <!-- Hero Section with BidayLocation.png panorama -->
  <section class="broker-hero" style="background-image: linear-gradient(90deg, rgba(10, 20, 42, 0.95) 0%, rgba(10, 20, 42, 0.88) 36%, rgba(10, 20, 42, 0.5) 65%, rgba(10, 20, 42, 0.15) 100%), url('<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/images/BidayLocation.png');">
    <div class="broker-hero-content">
      <span class="broker-hero-pill">Broker workspace</span>
      <h1 class="broker-hero-title"><?= $brokerGreeting ?>, <span id="brokerHeroName"><?= htmlspecialchars($brokerFirstName, ENT_QUOTES, 'UTF-8') ?></span>!</h1>
      <p class="broker-hero-subtitle">Manage your listings, track reviews, and stay ready for investor interest.</p>
      <div class="broker-hero-actions">
        <a class="broker-btn-profile" href="<?= htmlspecialchars(sfc_path('/profile.php'), ENT_QUOTES, 'UTF-8') ?>">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Edit profile</span>
        </a>
        <button class="broker-btn-submit" id="brokerAddListing" type="button" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Submit listing</span>
        </button>
      </div>
    </div>
    <div class="broker-hero-location">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
      <span>San Fernando, La Union</span>
    </div>
  </section>

  <div id="brokerFeedback" class="broker-feedback" role="status" hidden></div>

  <!-- PRC Verification Alert Card -->
  <section id="brokerVerification" class="broker-verification-card" aria-label="Broker verification">
    <span>Loading verification…</span>
  </section>

  <!-- KPI Stats 4-Card Grid -->
  <section id="brokerStats" class="broker-kpi-grid" aria-label="Listing statistics" aria-live="polite">
    <!-- Populated dynamically by renderStats() -->
  </section>

  <!-- Main 2-Column Section: Listings + Sidebar -->
  <div class="broker-main-grid">
    <!-- Left Column: My Listings -->
    <section class="broker-panel broker-listings-panel" aria-labelledby="brokerListingsTitle">
      <div class="broker-section-head">
        <h2 id="brokerListingsTitle" class="broker-title-with-count">
          My listings <span id="brokerListingCount" class="broker-count">0</span>
        </h2>
        <a class="broker-rankings-link" href="<?= htmlspecialchars(sfc_path('/property-ranking.php'), ENT_QUOTES, 'UTF-8') ?>">MCE &amp; IAI rankings &rarr;</a>
      </div>
      <div class="broker-list-toolbar">
        <div class="broker-search-box">
          <svg class="broker-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input id="brokerSearch" type="search" placeholder="Search listings by title, location, or reference no." aria-label="Search your listings">
        </div>
        <div class="broker-select-wrap">
          <select id="brokerStatusFilter" aria-label="Listing review status">
            <option value="all">All statuses</option>
            <option value="approved">Accepted</option>
            <option value="pending_review">Pending</option>
            <option value="rejected">Declined</option>
            <option value="archived">Archived</option>
          </select>
          <svg class="broker-select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      <div id="brokerListings" aria-live="polite">
        <p class="broker-empty">Loading your listings…</p>
      </div>
      <p class="broker-panel-note">LEBDO and CAO review every submission. MCE and IAI scores appear after city assessment.</p>
    </section>

    <!-- Right Column: Sidebar (Messages & Documents) -->
    <aside class="broker-sidebar-column">
      <!-- Messages & visits -->
      <details class="broker-sidebar-card" id="brokerMessagesDetails" open>
        <summary class="broker-sidebar-summary">
          <div class="broker-sidebar-title">
            <div class="broker-sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <span>Messages &amp; visits</span>
            <span id="brokerMessageCount" class="broker-count tw-hidden">0</span>
          </div>
          <span class="broker-sidebar-link">View all &rarr;</span>
        </summary>
        <div class="broker-sidebar-body">
          <div class="broker-message-grid">
            <div id="brokerThreadList" class="broker-thread-list"></div>
            <div id="brokerThreadView" class="broker-thread-view" hidden>
              <p class="broker-empty">Choose a conversation.</p>
            </div>
          </div>
        </div>
      </details>

      <!-- Document requests -->
      <details class="broker-sidebar-card" id="brokerDocumentsDetails" open>
        <summary class="broker-sidebar-summary">
          <div class="broker-sidebar-title">
            <div class="broker-sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <span>Document requests</span>
            <span id="brokerDocumentCount" class="broker-count tw-hidden">0</span>
          </div>
          <span class="broker-sidebar-link">View all &rarr;</span>
        </summary>
        <div class="broker-sidebar-body">
          <div id="brokerDocumentList" class="broker-document-list"></div>
        </div>
      </details>
    </aside>
  </div>
</main>
<?php require __DIR__ . '/app/Support/property-wizard-view.php'; ?>
<script type="application/json" id="cityAssessmentWeights"><?= json_encode(\App\Support\PropertyAssessment::WEIGHTS) ?></script>
<script type="application/json" id="brokerCategoryData"><?= json_encode($categories, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/nearby-editor.js<?= sfc_asset_version('js/nearby-editor.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-location.js<?= sfc_asset_version('js/admin-location.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-assessment.js<?= sfc_asset_version('js/admin-assessment.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/vendor/geoman/leaflet-geoman.js" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/vendor/turf/turf.min.js" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/property-wizard.js<?= sfc_asset_version('js/property-wizard.js') ?>" defer></script>
<script type="module" src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/broker-workspace.js<?= htmlspecialchars(sfc_asset_version('js/broker-workspace.js'), ENT_QUOTES, 'UTF-8') ?>"></script>
<?php sfc_render_footer($context); ?>
