<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
require_once __DIR__ . '/app/Support/PropertyCatalog.php';
sfc_require_role('admin', sfc_path('/admin-login.php'));
$context = sfc_web_context();
$department = sfc_admin_department($context['user']);
if (!sfc_can_manage_properties($context['user'])) {
    http_response_code(403);
    exit('A city department account is required.');
}
$governance = sfc_can_review_brokers($context['user']);
sfc_render_head('Properties | LOCUS-SF', $context, ['page' => 'admin-workspace', 'role' => 'admin']);
sfc_render_header($context, 'admin-properties');
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/admin-workspace.css<?= sfc_asset_version('css/admin-workspace.css') ?>">
<main class="city-workspace" data-city-workspace="properties" data-department="<?= htmlspecialchars($department, ENT_QUOTES, 'UTF-8') ?>">
  <div class="city-page-heading"><div><span class="city-eyebrow"><?= htmlspecialchars($department, ENT_QUOTES, 'UTF-8') ?></span><h1>Properties</h1><p><?= $governance ? 'Review evidence and publish approved listings.' : 'Add listings and record the seven assessment criteria.' ?></p></div><button class="city-button" type="button" data-add-listing>Add property</button></div>
  <p class="city-status" data-workspace-status role="status">Loading properties…</p>
  <div class="city-filters"><label><span class="visually-hidden">Search properties</span><input type="search" data-property-search placeholder="Search properties"></label><label><span class="visually-hidden">Review status</span><select data-property-state><option value="all">All listings</option><option value="pending_review">Awaiting review</option><option value="approved">Approved</option><option value="rejected">Declined</option><option value="archived">Archived</option></select></label><a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>">Map explorer ↗</a></div>
  <section class="city-panel city-property-list" data-property-list aria-label="Properties"></section>
  <details class="city-panel city-broker-panel" id="cityDocumentRequests">
    <summary class="city-panel-heading"><h2>Document requests <span class="city-pill" data-document-request-count>0 open</span></h2></summary>
    <p class="city-form-message" data-document-request-message role="status"></p>
    <div data-document-request-list><p class="city-empty">Loading requests...</p></div>
  </details>
</main>
<dialog class="city-dialog" id="cityPropertyEditor" aria-labelledby="cityEditorTitle">
  <form data-property-form>
    <div class="city-dialog-heading"><h2 id="cityEditorTitle">Add property</h2><button type="button" class="city-icon-button" data-close-dialog aria-label="Close">×</button></div>
    <input type="hidden" name="id">
    <div class="city-form-grid">
      <label class="city-span-2">Property name<input name="property_name" required maxlength="180"></label>
      <label>Category<select name="category" required><?php foreach (\App\Support\PropertyCatalog::categories() as $category => $subcategories): ?><option><?= htmlspecialchars($category, ENT_QUOTES, 'UTF-8') ?></option><?php endforeach; ?></select></label>
      <label>Subcategory<select name="subcategory"><option value="">Select if applicable</option></select></label>
      <label>Barangay<input name="barangay" maxlength="120" required></label>
      <label>Availability<select name="status"><option>Available</option><option>Reserved</option><option>Sold</option><option>Unavailable</option></select></label>
      <label>Area (m²)<input name="land_area" type="number" step="0.01" min="0.01" required></label>
      <label>Price (₱)<input name="price" type="number" step="1" min="1" required></label>
      <label>Latitude<input name="lat" type="number" step="0.000001" min="-90" max="90" required></label>
      <label>Longitude<input name="lng" type="number" step="0.000001" min="-180" max="180" required></label>
      <label class="city-span-2">Description<textarea name="description" rows="2" maxlength="3000" required></textarea></label>
      <label>Property photo<input name="image_file" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <label>Listing contact<select name="contactBrokerUserId"><option value="">Open listing</option></select></label>
      <label>Contact name<input name="owner_name" maxlength="150"></label>
      <label>Contact phone<input name="owner_phone" type="tel" maxlength="40"></label>
      <label class="city-span-2">Contact email<input name="owner_email" type="email" maxlength="190"></label>
    </div>
    <fieldset class="city-fieldset"><legend>Site context</legend><div class="city-tag-options"><?php foreach (\App\Support\PropertyCatalog::contextTags() as $tag): ?><label><input type="checkbox" name="assessmentTags[]" value="<?= htmlspecialchars($tag, ENT_QUOTES, 'UTF-8') ?>"><span><?= htmlspecialchars($tag, ENT_QUOTES, 'UTF-8') ?></span></label><?php endforeach; ?></div></fieldset>
    <fieldset class="city-fieldset"><legend>Department assessment</legend><p class="city-help">0–100. Higher is more favorable; a high risk score means fewer constraints. Leave unknown values blank.</p><div class="city-form-grid"><?php foreach (\App\Support\PropertyCatalog::criteria() as $key => $label): ?><label><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8') ?><input name="criteria[<?= $key ?>]" type="number" min="0" max="100" step="0.1" data-criterion="<?= $key ?>"></label><?php endforeach; ?><label class="city-span-2">Assessment basis<textarea name="readiness_notes" rows="2" maxlength="10000" placeholder="Sources, constraints and why the site fits its category"></textarea></label></div><div class="city-live-scores" data-live-scores>MCE — · IAI —</div><details class="city-method"><summary>Scoring method</summary><p data-assessment-method></p></details></fieldset>
    <p class="city-form-message" data-editor-message role="status"></p><div class="city-dialog-actions"><button type="button" class="city-button city-button-secondary" data-close-dialog>Cancel</button><button type="submit" class="city-button">Save for review</button></div>
  </form>
</dialog>
<?php if ($governance): ?>
<dialog class="city-dialog city-dialog-small" id="cityReviewDialog" aria-labelledby="cityReviewTitle"><form data-listing-review-form><div class="city-dialog-heading"><h2 id="cityReviewTitle">Review listing</h2><button type="button" class="city-icon-button" data-close-dialog aria-label="Close">×</button></div><input type="hidden" name="id"><div data-review-evidence></div><label>Message to broker<textarea name="reviewNote" rows="3" required maxlength="3000" placeholder="Decision and supporting reasons"></textarea></label><div class="city-check-options"><label><input type="checkbox" name="documents_reviewed">Documents checked</label><label><input type="checkbox" name="site_verified">Site checked</label></div><label>Decision<select name="approval_state"><option value="approved">Accept listing</option><option value="rejected">Decline listing</option></select></label><p class="city-form-message" data-review-message role="status"></p><div class="city-dialog-actions"><button class="city-button" type="submit">Send decision</button></div></form></dialog>
<?php endif; ?>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-workspace.js<?= sfc_asset_version('js/admin-workspace.js') ?>" defer></script>
<?php sfc_render_footer($context); ?>
