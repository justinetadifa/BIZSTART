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
$field = 'tw-mt-2 tw-block tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-3 tw-text-sm tw-text-[#11224d] focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-amber-200';
$label = 'tw-block tw-text-xs tw-font-medium tw-text-[#11224d]';
sfc_render_head('Properties | LOCUS-SF', $context, ['page' => 'admin-workspace', 'role' => 'admin']);
sfc_render_header($context, 'admin-properties');
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/admin-workspace.css<?= sfc_asset_version('css/admin-workspace.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/property-lifecycle.css<?= sfc_asset_version('css/property-lifecycle.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/workspace-polish.css<?= sfc_asset_version('css/workspace-polish.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/property-wizard.css<?= sfc_asset_version('css/property-wizard.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/vendor/geoman/leaflet-geoman.css">
<main class="city-workspace" data-city-workspace="properties" data-department="<?= htmlspecialchars($department, ENT_QUOTES, 'UTF-8') ?>">
  <div class="city-desk-hero">
    <div class="tw-relative tw-z-10 tw-flex tw-flex-col tw-justify-between tw-gap-6 sm:tw-flex-row sm:tw-items-center">
      <div>
        <div class="tw-mb-3.5 tw-inline-flex tw-items-center tw-gap-2 tw-rounded-full tw-bg-white/10 tw-backdrop-blur-md tw-border tw-border-white/20 tw-px-3.5 tw-py-1 tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/90">
          <span class="tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-emerald-400 tw-animate-pulse" aria-hidden="true"></span>
          <span>City workspace · <?= htmlspecialchars($department, ENT_QUOTES, 'UTF-8') ?></span>
        </div>
        <h1 class="tw-m-0 tw-text-3xl sm:tw-text-4xl tw-font-extrabold tw-tracking-tight tw-text-white">Property desk</h1>
        <p class="tw-mb-0 tw-mt-2.5 tw-text-sm sm:tw-text-base tw-text-white/80 tw-leading-relaxed tw-max-w-xl"><?= $governance ? 'Review listings, check evidence, and publish with confidence.' : 'Record site details and complete the city assessment.' ?></p>
      </div>
      <button class="city-btn-pill-add" type="button" data-add-listing>
        <span class="tw-flex tw-h-5 tw-w-5 tw-items-center tw-justify-center tw-rounded-full tw-bg-[#11224d]/10 tw-text-sm tw-font-black" aria-hidden="true">+</span>
        <span>Add property</span>
      </button>
    </div>
    <div class="city-hero-glow" aria-hidden="true"></div>
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
    </div>

    <div class="city-select-box">
      <label for="propertyStateSelect" class="visually-hidden">Listing view</label>
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
      <span aria-hidden="true">↗</span>
    </a>
  </div>

  <div class="city-listing-view">
    <div class="tw-flex tw-items-center tw-gap-2.5">
      <h2 data-property-view-title class="tw-m-0 tw-text-xl tw-font-bold tw-tracking-tight tw-text-[#11224d]">Latest Listings</h2>
      <span class="city-listing-count-pill" data-property-count-pill>0 listings</span>
    </div>
    <p data-property-view-description class="tw-mb-0 tw-mt-1.5 tw-text-xs sm:tw-text-sm tw-text-slate-500 tw-leading-relaxed">Listings ordered by creation date, newest first. Deleted listings have a separate view.</p>
    <p class="visually-hidden" data-property-result-count aria-live="polite"></p>
  </div>

  <section class="tw-grid tw-gap-4 sm:tw-gap-5" data-property-list aria-label="Properties"></section>
  <details class="city-panel city-broker-panel" id="cityDocumentRequests">
    <summary class="city-panel-heading"><h2>Document requests <span class="city-pill" data-document-request-count>0 open</span></h2></summary>
    <p class="city-form-message" data-document-request-message role="status"></p>
    <div data-document-request-list><p class="city-empty">Loading requests...</p></div>
  </details>
</main>
<dialog class="city-dialog city-dialog-small" id="cityLifecycleDialog" aria-labelledby="cityLifecycleTitle"><form data-lifecycle-form><div class="city-dialog-heading"><h2 id="cityLifecycleTitle" data-lifecycle-title>Manage property</h2><button type="button" class="city-icon-button" data-close-dialog aria-label="Close">×</button></div><input type="hidden" name="id"><input type="hidden" name="action"><input type="hidden" name="status"><strong class="city-lifecycle-property" data-lifecycle-property></strong><p class="city-help" data-lifecycle-description></p><p class="city-form-message" data-lifecycle-message role="status"></p><div class="city-dialog-actions"><button type="button" class="city-button city-button-secondary" data-close-dialog>Cancel</button><button type="submit" class="city-button">Confirm</button></div></form></dialog>
<?php require __DIR__ . '/app/Support/property-wizard-view.php'; ?>
<?php if ($governance): ?>
<dialog class="city-dialog" id="cityReviewDialog" aria-labelledby="cityReviewTitle"><form data-listing-review-form style="max-width: 600px;"><div class="city-dialog-heading"><h2 id="cityReviewTitle">Review listing</h2><button type="button" class="city-icon-button" data-close-dialog aria-label="Close">×</button></div><input type="hidden" name="id"><div data-review-evidence></div>
<div class="city-card-box" data-authority-review-card style="margin: 16px 0; padding: 14px; background: #F8F9FA; border: 1px solid #E5E7EB; border-radius: 8px;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
    <strong style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #11224D;">Authority to Sell</strong>
    <span class="city-badge" data-authority-review-status-badge>Pending review</span>
  </div>
  <div data-authority-review-details style="font-size: 13px; color: #4B5563; margin-bottom: 10px;"></div>
  <div style="display: flex; gap: 8px; margin-bottom: 12px;">
    <a class="city-button city-button-secondary city-button-small" data-authority-preview-link href="#" target="_blank" rel="noopener noreferrer">Preview document ↗</a>
  </div>
  <label style="font-size: 12px; font-weight: 500; display: block; margin-bottom: 4px;">Review status
    <select name="authority_to_sell_status" style="width: 100%; margin-top: 4px;">
      <option value="pending_review">Pending review</option>
      <option value="validated">Validated</option>
      <option value="rejected">Rejected</option>
      <option value="requires_resubmission">Requires resubmission</option>
    </select>
  </label>
  <label style="font-size: 12px; font-weight: 500; display: block; margin-top: 8px;">Reviewer note <span style="color: #9E1B22;">(required if rejected)</span>
    <input name="authority_to_sell_note" maxlength="1000" placeholder="Note or reason for rejection" style="width: 100%; margin-top: 4px;">
  </label>
  <div style="display: flex; gap: 8px; margin-top: 10px;">
    <button type="button" class="city-button city-button-secondary city-button-small" data-quick-reject-auth style="color: #9E1B22;">Reject</button>
    <button type="button" class="city-button city-button-small" data-quick-validate-auth style="background: #0D9488; color: #fff;">Validate authority</button>
  </div>
</div>
<label>Message to broker<textarea name="reviewNote" rows="3" required maxlength="3000" placeholder="Decision and supporting reasons"></textarea></label>
<div class="city-check-options" style="display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0;">
  <label><input type="checkbox" name="documents_reviewed">Documents checked</label>
  <label><input type="checkbox" name="site_verified">Site checked</label>
  <label><input type="checkbox" name="clup_verified">CLUP / zoning validated</label>
</div>
<label>Listing Decision<select name="approval_state"><option value="approved">Accept listing</option><option value="rejected">Decline listing</option></select></label>
<p class="city-form-message" data-review-message role="status"></p>
<div class="city-dialog-actions"><button class="city-button" type="submit">Send decision</button></div></form></dialog>
<?php endif; ?>
<script type="application/json" id="cityAssessmentWeights"><?= json_encode(\App\Support\PropertyAssessment::WEIGHTS) ?></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/nearby-editor.js<?= sfc_asset_version('js/nearby-editor.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-location.js<?= sfc_asset_version('js/admin-location.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-assessment.js<?= sfc_asset_version('js/admin-assessment.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/vendor/geoman/leaflet-geoman.js" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/vendor/turf/turf.min.js" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/property-wizard.js<?= sfc_asset_version('js/property-wizard.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-workspace.js<?= sfc_asset_version('js/admin-workspace.js') ?>" defer></script>
<?php sfc_render_footer($context); ?>
