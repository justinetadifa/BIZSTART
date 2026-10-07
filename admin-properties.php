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
$governance = sfc_can_review_brokers($context['user']);
$field = 'tw-mt-2 tw-block tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-3 tw-text-sm tw-text-[#11224d] focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-amber-200';
$label = 'tw-block tw-text-xs tw-font-medium tw-text-[#11224d]';
sfc_render_head('Properties | LOCUS-SF', $context, ['page' => 'admin-workspace', 'role' => 'admin']);
sfc_render_header($context, 'admin-properties');
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/admin-workspace.css<?= sfc_asset_version('css/admin-workspace.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/workspace-polish.css<?= sfc_asset_version('css/workspace-polish.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/property-wizard.css<?= sfc_asset_version('css/property-wizard.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/vendor/geoman/leaflet-geoman.css">
<main class="city-workspace" data-city-workspace="properties" data-department="<?= htmlspecialchars($department, ENT_QUOTES, 'UTF-8') ?>">
  <div class="tw-mb-7 tw-flex tw-flex-col tw-justify-between tw-gap-5 tw-rounded-2xl tw-bg-[#11224d] tw-p-6 sm:tw-flex-row sm:tw-items-center sm:tw-p-8"><div><span class="tw-mb-3 tw-inline-flex tw-rounded-full tw-border tw-border-white/20 tw-px-3 tw-py-1 tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-widest tw-text-white/80">City workspace · <?= htmlspecialchars($department, ENT_QUOTES, 'UTF-8') ?></span><h1 class="tw-m-0 tw-text-3xl tw-font-semibold tw-tracking-tight tw-text-white">Property desk</h1><p class="tw-mb-0 tw-mt-2 tw-text-sm tw-text-white/70"><?= $governance ? 'Review listings, check evidence, and publish with confidence.' : 'Record site details and complete the city assessment.' ?></p></div><button class="tw-inline-flex tw-min-h-[44px] tw-items-center tw-justify-center tw-gap-2 tw-rounded-lg tw-border-0 tw-bg-white tw-px-5 tw-py-3 tw-text-sm tw-font-semibold tw-text-[#11224d] hover:tw-bg-amber-50" type="button" data-add-listing><span aria-hidden="true">+</span> Add property</button></div>
  <div class="tw-mb-5 tw-grid tw-grid-cols-2 tw-gap-3 lg:tw-grid-cols-4" data-property-summary aria-label="Property review overview"></div>
  <p class="city-status" data-workspace-status role="status">Loading properties…</p>
  <div class="city-filters"><label><span class="visually-hidden">Search properties</span><input type="search" data-property-search placeholder="Search properties"></label><label><span class="visually-hidden">Review status</span><select data-property-state><option value="all">All listings</option><option value="pending_review">Awaiting review</option><option value="approved">Approved</option><option value="rejected">Declined</option><option value="archived">Archived</option></select></label><a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>">Map explorer ↗</a></div>
  <section class="tw-grid tw-gap-3" data-property-list aria-label="Properties"></section>
  <details class="city-panel city-broker-panel" id="cityDocumentRequests">
    <summary class="city-panel-heading"><h2>Document requests <span class="city-pill" data-document-request-count>0 open</span></h2></summary>
    <p class="city-form-message" data-document-request-message role="status"></p>
    <div data-document-request-list><p class="city-empty">Loading requests...</p></div>
  </details>
</main>
<?php require __DIR__ . '/app/Support/property-wizard-view.php'; ?>
<?php if ($governance): ?>
<dialog class="city-dialog city-dialog-small" id="cityReviewDialog" aria-labelledby="cityReviewTitle"><form data-listing-review-form><div class="city-dialog-heading"><h2 id="cityReviewTitle">Review listing</h2><button type="button" class="city-icon-button" data-close-dialog aria-label="Close">×</button></div><input type="hidden" name="id"><div data-review-evidence></div><label>Message to broker<textarea name="reviewNote" rows="3" required maxlength="3000" placeholder="Decision and supporting reasons"></textarea></label><div class="city-check-options"><label><input type="checkbox" name="documents_reviewed">Documents checked</label><label><input type="checkbox" name="site_verified">Site checked</label></div><label>Decision<select name="approval_state"><option value="approved">Accept listing</option><option value="rejected">Decline listing</option></select></label><p class="city-form-message" data-review-message role="status"></p><div class="city-dialog-actions"><button class="city-button" type="submit">Send decision</button></div></form></dialog>
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
