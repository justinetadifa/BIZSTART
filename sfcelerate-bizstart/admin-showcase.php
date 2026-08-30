<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_require_role('admin', sfc_path('/admin-login.php'));
$context = sfc_web_context();
sfc_render_head('Admin Showcase Studio | SFCelerate BizStart', $context, ['page' => 'admin-showcase', 'role' => 'admin']);
sfc_render_header($context, 'admin-showcase');
?>
<main class="page-shell admin-showcase-page">
  <section class="site-shell page-intro-card">
    <div>
      <div class="eyebrow">Admin Showcase Studio</div>
      <div class="page-role-strip">
        <span class="page-role-pill is-role">Admin Workspace</span>
        <span class="page-role-pill">Offer Board + City Pipeline</span>
      </div>
      <h1>Manage the Offer Board and City Pipeline with one polished control surface.</h1>
      <p>Create, curate, publish, and reorder the hidden showcase features that live under the platform’s More menu.</p>
    </div>
    <div class="intro-actions">
      <button type="button" class="btn-shell btn-shell-primary" id="adminShowcaseAdd">Add Showcase Item</button>
      <a href="<?= htmlspecialchars(sfc_path('/offer-board.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">Open Offer Board</a>
    </div>
  </section>

  <section class="site-shell admin-showcase-root-grid" id="adminShowcaseRoot">
    <div class="loading-panel">Loading showcase studio...</div>
  </section>
</main>

<div class="modal-shell" id="showcaseCrudModal" hidden>
  <div class="modal-card">
    <div class="modal-head">
      <div>
        <div class="panel-kicker">Admin Showcase Editor</div>
        <h3 class="section-title" id="showcaseCrudTitle">Add Showcase Item</h3>
      </div>
      <button type="button" class="modal-close" data-modal-close="showcaseCrudModal">Close</button>
    </div>
    <form id="showcaseCrudForm" class="crud-form-grid">
      <input type="hidden" id="showcaseItemId">
      <label class="form-shell"><span>Feature Type</span><select class="input-shell" id="showcaseFeatureType"><option value="offer_board">Offer Board</option><option value="city_pipeline">City Pipeline</option></select></label>
      <label class="form-shell"><span>Title</span><input class="input-shell" id="showcaseTitle" required></label>
      <label class="form-shell"><span>Partner / Source Label</span><input class="input-shell" id="showcasePartnerLabel" placeholder="City Investment Desk"></label>
      <label class="form-shell"><span>Category</span><input class="input-shell" id="showcaseCategory" placeholder="Logistics"></label>
      <label class="form-shell"><span>Location Label</span><input class="input-shell" id="showcaseLocationLabel" value="San Fernando, La Union"></label>
      <label class="form-shell"><span>Barangay</span><input class="input-shell" id="showcaseBarangay" placeholder="Poro"></label>
      <label class="form-shell"><span>Status / Stage</span><input class="input-shell" id="showcaseStatus" placeholder="open or under_construction"></label>
      <label class="form-shell"><span>Related Property</span><select class="input-shell" id="showcaseRelatedProperty"><option value="">None</option></select></label>
      <label class="form-shell"><span>Published</span><select class="input-shell" id="showcasePublished"><option value="1">Yes</option><option value="0">No</option></select></label>
      <label class="form-shell"><span>Featured</span><select class="input-shell" id="showcaseFeatured"><option value="0">No</option><option value="1">Yes</option></select></label>
      <label class="form-shell"><span>Sort Order</span><input type="number" class="input-shell" id="showcaseSortOrder" value="1"></label>
      <label class="form-shell"><span>Countdown At</span><input type="datetime-local" class="input-shell" id="showcaseCountdownAt"></label>
      <label class="form-shell"><span>Completion Target</span><input type="datetime-local" class="input-shell" id="showcaseCompletionTarget"></label>
      <label class="form-shell"><span>Primary Metric Label</span><input class="input-shell" id="showcasePrimaryMetricLabel" placeholder="Offer window"></label>
      <label class="form-shell"><span>Primary Metric Value</span><input class="input-shell" id="showcasePrimaryMetricValue" placeholder="PHP 78.2M"></label>
      <label class="form-shell"><span>Secondary Metric Label</span><input class="input-shell" id="showcaseSecondaryMetricLabel" placeholder="Current offer"></label>
      <label class="form-shell"><span>Secondary Metric Value</span><input class="input-shell" id="showcaseSecondaryMetricValue" placeholder="Closes soon"></label>
      <label class="form-shell form-span-2"><span>Summary</span><textarea class="input-shell input-textarea" id="showcaseSummary" required></textarea></label>
      <label class="form-shell form-span-2"><span>Description</span><textarea class="input-shell input-textarea" id="showcaseDescription"></textarea></label>
      <label class="form-shell form-span-2"><span>Upload Image</span><input type="file" class="input-shell" id="showcaseImage" accept="image/*"></label>
      <label class="form-shell form-span-2"><span>Fallback Image Path</span><input class="input-shell" id="showcaseImagePath" value="assets/images/Property10.png"></label>
      <p class="auth-form-note form-span-2">Offer Board is for timed, curated opportunities. City Pipeline is for not-yet-built or future-facing developments. Only admin can publish these entries.</p>
      <div class="crud-actions form-span-2">
        <button type="button" class="btn-shell btn-shell-secondary" data-modal-close="showcaseCrudModal">Cancel</button>
        <button type="submit" class="btn-shell btn-shell-primary">Save Showcase Item</button>
      </div>
    </form>
  </div>
</div>

<div class="modal-shell" id="showcaseDeleteModal" hidden>
  <div class="modal-card compact-modal">
    <div class="modal-head">
      <div>
        <div class="panel-kicker">Delete Showcase Item</div>
        <h3 class="section-title">Remove this entry?</h3>
      </div>
      <button type="button" class="modal-close" data-modal-close="showcaseDeleteModal">Close</button>
    </div>
    <p class="panel-text" id="deleteShowcaseLabel">This will remove the selected showcase item.</p>
    <div class="crud-actions">
      <button type="button" class="btn-shell btn-shell-secondary" data-modal-close="showcaseDeleteModal">Cancel</button>
      <button type="button" class="btn-shell btn-shell-danger" id="confirmDeleteShowcase">Delete Item</button>
    </div>
  </div>
</div>
<?php sfc_render_footer($context); ?>
