<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
require_once __DIR__ . '/app/Support/PropertyCatalog.php';
require_once __DIR__ . '/app/Support/PropertyAssessment.php';
sfc_require_role('admin', sfc_path('/admin-login.php'));
$context = sfc_web_context();
$department = sfc_admin_department($context['user']);
if (!sfc_can_manage_properties($context['user'])) {
    http_response_code(403);
    exit('A city department account is required.');
}
$governance = sfc_can_review_listings($context['user']);
$today = new DateTimeImmutable('now', new DateTimeZone('Asia/Manila'));
$field = 'tw-mt-2 tw-block tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-3 tw-text-sm tw-text-[#11224d] focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-amber-200';
$label = 'tw-block tw-text-xs tw-font-medium tw-text-[#11224d]';
sfc_render_head('Properties | LOCUS-SF', $context, ['page' => 'admin-workspace', 'role' => 'admin']);
sfc_render_header($context, 'admin-properties');
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/admin-workspace.css<?= sfc_asset_version('css/admin-workspace.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/property-lifecycle.css<?= sfc_asset_version('css/property-lifecycle.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/workspace-polish.css<?= sfc_asset_version('css/workspace-polish.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/property-wizard.css<?= sfc_asset_version('css/property-wizard.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/admin-property-list.css<?= sfc_asset_version('css/admin-property-list.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/vendor/geoman/leaflet-geoman.css">
<main class="city-workspace" data-city-workspace="properties" data-department="<?= htmlspecialchars($department, ENT_QUOTES, 'UTF-8') ?>" data-listing-reviewer="<?= $governance ? 'true' : 'false' ?>" data-user-id="<?= htmlspecialchars((string) ($context['user']['id'] ?? ''), ENT_QUOTES, 'UTF-8') ?>">
  <div class="city-desk-hero">
    <img src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/images/admin-city.jpg" class="city-hero-backdrop-img" alt="" fetchpriority="high">
    <div class="city-hero-scrim"></div>
    <div class="city-hero-glow" aria-hidden="true"></div>

    <!-- Live Glassmorphic Today & Live Clock Capsule -->
    <div class="city-desk-today-capsule" id="propertyDeskTodayCapsule">
      <svg class="city-capsule-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="3"/>
        <path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>
      </svg>
      <div>
        <span class="city-capsule-label">CITY DESK · TODAY</span>
        <time class="city-capsule-date" data-overview-date datetime="<?= $today->format('Y-m-d') ?>">
          <?= $today->format('M j, Y') ?>
        </time>
        <span class="city-capsule-time" id="propertyDeskLiveTime"></span>
      </div>
    </div>

    <div class="city-desk-content">
      <div class="city-desk-text">
        <div class="city-desk-badge">
          <span class="city-badge-dot" aria-hidden="true"></span>
          <span>City workspace · <?= htmlspecialchars($department, ENT_QUOTES, 'UTF-8') ?></span>
        </div>
        <h1 class="city-desk-title">Property desk</h1>
        <p class="city-desk-subtitle"><?= $governance ? 'Review listings, check evidence, and publish with confidence.' : 'Record site details and complete the city assessment.' ?></p>
      </div>
      <div class="city-desk-action-wrap">
        <button class="city-btn-pill-add" type="button" data-add-listing>
          <span class="city-btn-add-plus" aria-hidden="true">+</span>
          <span>Add property</span>
        </button>
      </div>
    </div>
  </div>

  <div class="city-property-summary-grid" data-property-summary aria-label="Listing management views"></div>
  <p class="city-status" data-workspace-status role="status">Loading properties…</p>

  <div class="city-filters">
    <div class="city-search-box">
      <label for="propertySearchInput" class="visually-hidden">Search properties</label>
      <span class="city-search-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </span>
      <input id="propertySearchInput" type="search" data-property-search placeholder="Search properties by name, barangay, or type…" class="city-search-input">
      <button type="button" class="city-search-clear-btn" id="propertySearchClearBtn" aria-label="Clear search" hidden>&times;</button>
      <kbd class="city-search-kbd" id="propertySearchKbd" title="Press / to focus search">/</kbd>
    </div>

    <div class="city-select-box">
      <label for="propertyStateSelect" class="visually-hidden">Listing view</label>
      <span class="city-select-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
      </span>
      <select id="propertyStateSelect" data-property-state class="city-select-input">
        <option value="latest">Latest Listings</option>
        <option value="active">Active Listings</option>
        <option value="Sold">Sold Listings</option>
        <option value="Leased">Leased Listings</option>
        <option value="archived">Archived Listings</option>
        <option value="deleted">Deleted Listings</option>
        <optgroup label="Listing status">
          <option value="Available">Available</option>
          <option value="Unavailable">Unavailable</option>
          <option value="Reserved">Reserved</option>
          <option value="Availed">Availed (historical)</option>
        </optgroup>
        <optgroup label="Review status">
          <option value="pending_review">Awaiting review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Declined</option>
        </optgroup>
      </select>
      <span class="city-select-arrow" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>
    </div>

    <a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>" class="city-map-explorer-btn">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
        <line x1="8" y1="2" x2="8" y2="18"></line>
        <line x1="16" y1="6" x2="16" y2="22"></line>
      </svg>
      <span>Map explorer</span>
      <span class="city-map-arrow" aria-hidden="true">↗</span>
    </a>
  </div>

  <div class="city-listing-view">
    <div class="city-listing-view-top">
      <h2 data-property-view-title class="city-listing-view-title">Latest Listings</h2>
      <span class="city-listing-count-pill" data-property-count-pill>0 listings</span>
    </div>
    <p data-property-view-description class="city-listing-view-desc">Listings ordered by creation date, newest first. Deleted listings have a separate view.</p>
    <p class="visually-hidden" data-property-result-count aria-live="polite"></p>
  </div>

  <section class="tw-grid tw-gap-4 sm:tw-gap-5" data-property-list aria-label="Properties"></section>
  <details class="city-panel city-broker-panel" id="cityDocumentRequests">
    <summary class="city-panel-heading"><h2>Document requests <span class="city-pill" data-document-request-count>0 open</span></h2></summary>
    <p class="city-form-message" data-document-request-message role="status"></p>
    <div data-document-request-list><p class="city-empty">Loading requests...</p></div>
  </details>
</main>
<dialog class="city-dialog city-dialog-small" id="cityLifecycleDialog" aria-labelledby="cityLifecycleTitle">
  <form data-lifecycle-form>
    <div class="city-dialog-heading">
      <div class="city-lifecycle-header-group">
        <div class="city-lifecycle-icon-badge theme-delete" data-lifecycle-icon-badge aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </div>
        <div class="city-lifecycle-title-wrap">
          <span class="city-lifecycle-kicker" data-lifecycle-kicker>Listing Action</span>
          <h2 id="cityLifecycleTitle" data-lifecycle-title>Manage property</h2>
        </div>
      </div>
      <button type="button" class="city-dialog-close-btn" data-close-dialog aria-label="Close dialog">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <input type="hidden" name="id">
    <input type="hidden" name="action">
    <input type="hidden" name="status">

    <!-- Property Preview Card -->
    <div class="city-lifecycle-property-card" data-lifecycle-card>
      <img class="city-lifecycle-thumb" data-lifecycle-thumb src="" alt="" loading="lazy">
      <div class="city-lifecycle-details">
        <div class="city-lifecycle-name" data-lifecycle-property>Property name</div>
        <div class="city-lifecycle-meta">
          <span data-lifecycle-location>San Fernando</span>
          <span class="city-lifecycle-dot">·</span>
          <span class="city-lifecycle-price" data-lifecycle-price>₱ 0</span>
          <span class="city-lifecycle-dot">·</span>
          <span data-lifecycle-category>Commercial</span>
        </div>
      </div>
    </div>

    <!-- Impact explanation box -->
    <div class="city-lifecycle-impact theme-delete" data-lifecycle-impact>
      <p class="city-help" data-lifecycle-description></p>
      <div class="city-lifecycle-safeguard" data-lifecycle-safeguard>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        <span data-lifecycle-safeguard-text>Retained in Deleted Listings — authorized staff can restore anytime.</span>
      </div>
    </div>

    <p class="city-form-message" data-lifecycle-message role="status"></p>

    <div class="city-dialog-actions">
      <button type="button" class="city-button city-lifecycle-cancel-btn" data-lifecycle-cancel data-close-dialog>Keep property</button>
      <button type="submit" class="city-button city-lifecycle-submit-btn btn-theme-delete" data-lifecycle-submit>Confirm</button>
    </div>
  </form>
</dialog>
<?php require __DIR__ . '/app/Support/property-wizard-view.php'; ?>
<?php if ($governance || in_array($department, ['ASSESSOR', 'CAO', 'LEBDO'], true)): ?>
<dialog class="city-dialog city-review-dialog" id="cityReviewDialog" aria-labelledby="cityReviewTitle">
  <form data-listing-review-form style="max-width: 100%;">
    <div class="city-dialog-heading">
      <div class="city-review-title-group">
        <h2 id="cityReviewTitle">Review Listing</h2>
        <span class="city-review-subtitle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Municipal Governance &amp; CPDO Land Verification
        </span>
      </div>
      <button type="button" class="city-icon-button" data-close-dialog aria-label="Close">×</button>
    </div>
    <input type="hidden" name="id">

    <!-- Self-approval alert banner for private broker submissions -->
    <div data-review-self-warning hidden style="background: #FEF2F2; border: 1.5px solid #FCA5A5; color: #991B1B; padding: 14px 16px; border-radius: 12px; margin-bottom: 18px; font-size: 13px; display: flex; align-items: flex-start; gap: 10px; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.08);">
      <span style="font-size: 16px; line-height: 1; flex-shrink: 0;">🛡️</span>
      <div>
        <strong style="color: #7F1D1D;">Self-Approval Prohibited:</strong> You submitted this listing as a private broker. Under municipal governance policies, independent review from CPDO, Assessor, or LEBDO is required prior to endorsement or publication.
      </div>
    </div>

    <!-- Section 1: Property Summary -->
    <div class="city-review-section" data-review-section="1">
      <div class="city-review-section-legend">
        <span class="city-review-section-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          1. Property Summary &amp; Classification
        </span>
      </div>
      <div data-review-summary-content></div>
    </div>

    <!-- Section 2: Uploaded Documents -->
    <div class="city-review-section" data-review-section="2">
      <div class="city-review-section-legend">
        <span class="city-review-section-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          2. Uploaded Documents &amp; Authority
        </span>
      </div>

      <!-- Property Photos sub-block -->
      <div data-review-photos-box style="margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #F1F5F9;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <strong style="font-size: 13px; color: #11224D; display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Property Photos
          </strong>
          <span class="city-badge" data-review-photo-count>0 photos</span>
        </div>
        <div data-review-photo-thumbnails style="display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 8px;"></div>
      </div>

      <!-- Authority to Sell card -->
      <div class="city-card-box" data-authority-review-card style="margin: 0 0 14px 0; padding: 14px 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #11224D;">Authority to Sell (ATS)</strong>
          <span class="city-badge" data-authority-review-status-badge>Pending review</span>
        </div>
        <div data-authority-review-details style="font-size: 12.5px; color: #475569; margin-bottom: 10px;"></div>
        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
          <a class="city-button city-button-secondary city-button-small" data-authority-preview-link href="#" target="_blank" rel="noopener noreferrer">Preview ATS document ↗</a>
        </div>
        <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px; color: #1E293B;">ATS review status
          <select name="authority_to_sell_status" style="width: 100%; margin-top: 4px; border-radius: 8px; padding: 8px 12px; border: 1.5px solid #CBD5E1;">
            <option value="pending_review">Pending review</option>
            <option value="validated">Validated</option>
            <option value="rejected">Rejected</option>
            <option value="requires_resubmission">Requires resubmission</option>
          </select>
        </label>
        <label style="font-size: 12px; font-weight: 600; display: block; margin-top: 10px; color: #1E293B;">ATS reviewer note <span style="color: #9E1B22;">(required if rejected)</span>
          <input name="authority_to_sell_note" maxlength="1000" placeholder="Note or reason for rejection" style="width: 100%; margin-top: 4px; border-radius: 8px; padding: 8px 12px; border: 1.5px solid #CBD5E1;">
        </label>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button type="button" class="city-button city-button-secondary city-button-small" data-quick-reject-auth style="color: #9E1B22; border-color: #FECDD3;">Reject</button>
          <button type="button" class="city-button city-button-small" data-quick-validate-auth style="background: #0D9488; color: #fff;">Validate authority</button>
        </div>
      </div>

      <!-- Mandatory Documents Checklist -->
      <div data-review-doc-checklist style="font-size: 12px; color: #475569;"></div>
    </div>

    <!-- Section 3: Zoning & Risk Status -->
    <div class="city-review-section" data-review-section="3">
      <div class="city-review-section-legend">
        <span class="city-review-section-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          3. CLUP Zoning &amp; Risk Baseline
        </span>
      </div>
      <div data-review-zoning-risk-content></div>
    </div>

    <!-- Section 4: Reviewer Decision -->
    <div class="city-review-section" data-review-section="4">
      <div class="city-review-section-legend">
        <span class="city-review-section-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          4. Governance Decision &amp; Audit Trail
        </span>
      </div>
      <p class="city-help" data-reviewer-role-caption style="margin: 0 0 12px 0; font-size: 12px; color: #64748B; line-height: 1.5;"></p>

      <div class="city-check-options" style="display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0 14px 0;">
        <label style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12.5px; font-weight: 550; color: #1E293B; cursor: pointer;">
          <input type="checkbox" name="documents_reviewed"> Documents checked
        </label>
        <label style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12.5px; font-weight: 550; color: #1E293B; cursor: pointer;">
          <input type="checkbox" name="site_verified"> Site checked
        </label>
        <label style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12.5px; font-weight: 550; color: #1E293B; cursor: pointer;">
          <input type="checkbox" name="clup_verified"> CLUP / zoning validated
        </label>
      </div>

      <label style="display: block; margin-bottom: 12px;">
        <span data-review-note-label style="font-size: 12px; font-weight: 650; color: #11224D;">Message to broker</span>
        <textarea name="reviewNote" rows="3" maxlength="3000" placeholder="Decision and supporting reasons" style="width: 100%; margin-top: 6px; border-radius: 8px; padding: 10px 12px; border: 1.5px solid #CBD5E1; font-size: 13px;"></textarea>
      </label>

      <label style="display: block; margin-bottom: 6px;">
        <span style="font-size: 12px; font-weight: 650; color: #11224D;">Listing Decision</span>
        <select name="approval_state" data-review-decision-select style="width: 100%; margin-top: 6px; border-radius: 8px; padding: 10px 12px; border: 1.5px solid #CBD5E1; font-size: 13px; font-weight: 600;"></select>
      </label>
    </div>

    <p class="city-form-message" data-review-message role="status"></p>
    <div class="city-dialog-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;">
      <button type="button" class="city-button city-button-secondary" data-close-dialog>Cancel</button>
      <button class="city-button" type="submit" data-review-submit-btn style="background: linear-gradient(135deg, #11224D 0%, #0F172A 100%); color: #fff; padding: 10px 24px; font-weight: 700; box-shadow: 0 4px 12px rgba(17, 34, 77, 0.2);">Send decision</button>
    </div>
  </form>
</dialog>
<?php endif; ?>
<script type="application/json" id="cityAssessmentWeights"><?= json_encode(\App\Support\PropertyAssessment::WEIGHTS) ?></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/nearby-editor.js<?= sfc_asset_version('js/nearby-editor.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-location.js<?= sfc_asset_version('js/admin-location.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-assessment.js<?= sfc_asset_version('js/admin-assessment.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/vendor/geoman/leaflet-geoman.js" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/vendor/turf/turf.min.js" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/property-editor-tools.js<?= sfc_asset_version('js/property-editor-tools.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/property-intake-controls.js<?= sfc_asset_version('js/property-intake-controls.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/property-wizard.js<?= sfc_asset_version('js/property-wizard.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-workspace.js<?= sfc_asset_version('js/admin-workspace.js') ?>" defer></script>
<?php sfc_render_footer($context); ?>
