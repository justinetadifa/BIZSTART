<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_require_role('admin', sfc_path('/admin-login.php'));
$context = sfc_web_context();
sfc_render_head('Admin Listings | SFCelerate BizStart', $context, ['page' => 'admin-properties', 'role' => 'admin']);
sfc_render_header($context, 'admin-properties');
?>
<main class="page-shell admin-listings-page">
  <section class="site-shell page-intro-card">
    <div>
      <div class="eyebrow">Admin Listings</div>
      <div class="page-role-strip">
        <span class="page-role-pill is-role">Admin Workspace</span>
        <span class="page-role-pill">Inventory + trust controls</span>
      </div>
      <h1>Manage the live property inventory with more discipline.</h1>
      <p>Create, edit, and monitor listings inside a cleaner admin listing control surface.</p>
    </div>
    <div class="intro-actions">
      <button type="button" class="btn-shell btn-shell-primary" id="adminAddProperty">Add Property</button>
      <a href="<?= htmlspecialchars(sfc_path('/property-ranking.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">View Rankings</a>
    </div>
  </section>

  <section class="site-shell admin-properties-root-grid" id="adminPropertiesRoot">
    <div class="loading-panel">Loading admin listings...</div>
  </section>
</main>

<div class="modal-shell" id="propertyCrudModal" hidden>
  <div class="modal-card">
    <div class="modal-head">
      <div>
        <div class="panel-kicker">Admin Listing Editor</div>
        <h3 class="section-title" id="crudModalTitle">Add Property</h3>
      </div>
      <button type="button" class="modal-close" data-modal-close="propertyCrudModal">Close</button>
    </div>
    <form id="propertyCrudForm" class="crud-form-grid">
      <input type="hidden" id="crudPropertyId">
      <label class="form-shell"><span>Property Name</span><input class="input-shell" id="crudPropertyName" required></label>
      <label class="form-shell"><span>City</span><input class="input-shell" id="crudCity" value="San Fernando, La Union" required></label>
      <label class="form-shell"><span>Barangay</span><input class="input-shell" id="crudBarangay"></label>
      <label class="form-shell"><span>Property Type</span><select class="input-shell" id="crudPropertyType"><option value="commercial">Commercial</option><option value="logistics">Logistics</option><option value="hotel">Resort / Tourism</option><option value="bpo">Office / BPO</option><option value="manufacturing">Manufacturing</option></select></label>
      <label class="form-shell"><span>Corridor</span><select class="input-shell" id="crudCorridor"><option value="highway">Highway</option><option value="downtown">Downtown</option><option value="coastal">Coastal</option></select></label>
      <label class="form-shell"><span>Status</span><select class="input-shell" id="crudStatus"><option value="Available">Available</option><option value="Reserved">Reserved</option><option value="Under Review">Under Review</option><option value="Negotiating">Negotiating</option></select></label>
      <label class="form-shell"><span>Approval State</span><select class="input-shell" id="crudApprovalState"><option value="draft">Draft</option><option value="pending_review">Pending Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="archived">Archived</option></select></label>
      <label class="form-shell"><span>Seller Verification</span><select class="input-shell" id="crudSellerIdentityStatus"><option value="unverified">Unverified</option><option value="pending">Pending</option><option value="verified">Verified</option></select></label>
      <label class="form-shell"><span>Price (PHP)</span><input type="number" class="input-shell" id="crudPrice" required></label>
      <label class="form-shell"><span>Land Area (Ha)</span><input type="number" step="0.1" class="input-shell" id="crudLandArea" required></label>
      <label class="form-shell"><span>Market Score</span><input type="number" min="40" max="100" class="input-shell" id="crudScore" value="82"></label>
      <label class="form-shell"><span>Road Access</span><input type="number" min="40" max="100" class="input-shell" id="crudAccess" value="85"></label>
      <label class="form-shell"><span>Documents Reviewed</span><select class="input-shell" id="crudDocumentsReviewed"><option value="0">No</option><option value="1">Yes</option></select></label>
      <label class="form-shell"><span>Site Verified</span><select class="input-shell" id="crudSiteVerified"><option value="0">No</option><option value="1">Yes</option></select></label>
      <label class="form-shell form-span-2"><span>Last Confirmed Available</span><input type="datetime-local" class="input-shell" id="crudLastConfirmedAvailableAt"></label>
      <label class="form-shell form-span-2"><span>Description</span><textarea class="input-shell input-textarea" id="crudDescription" required></textarea></label>
      <label class="form-shell form-span-2"><span>Upload Image</span><input type="file" class="input-shell" id="crudImage" accept="image/*"></label>
      <label class="form-shell form-span-2"><span>Fallback Image Path</span><input class="input-shell" id="crudImagePath" value="assets/images/Property10.png"></label>
      <label class="form-shell form-span-2"><span>Tags</span><input class="input-shell" id="crudTags" placeholder="Investor Ready, Strategic Location"></label>
      <label class="form-shell form-span-2"><span>Facilities</span><input class="input-shell" id="crudFacilities" placeholder="Highway Access, Utilities"></label>
      <fieldset class="crud-subgrid form-span-2">
        <legend>Document Checklist</legend>
        <label class="form-shell"><span>Title Copy</span><select class="input-shell" id="crudDocTitleCopy"><option value="missing">Missing</option><option value="requested">Requested</option><option value="submitted">Submitted</option><option value="reviewed">Reviewed</option></select></label>
        <label class="form-shell"><span>Tax Declaration</span><select class="input-shell" id="crudDocTaxDeclaration"><option value="missing">Missing</option><option value="requested">Requested</option><option value="submitted">Submitted</option><option value="reviewed">Reviewed</option></select></label>
        <label class="form-shell"><span>Survey Plan</span><select class="input-shell" id="crudDocSurveyPlan"><option value="missing">Missing</option><option value="requested">Requested</option><option value="submitted">Submitted</option><option value="reviewed">Reviewed</option></select></label>
        <label class="form-shell"><span>Zoning Clearance</span><select class="input-shell" id="crudDocZoningClearance"><option value="missing">Missing</option><option value="requested">Requested</option><option value="submitted">Submitted</option><option value="reviewed">Reviewed</option></select></label>
        <label class="form-shell"><span>Site Photos</span><select class="input-shell" id="crudDocSitePhotos"><option value="missing">Missing</option><option value="requested">Requested</option><option value="submitted">Submitted</option><option value="reviewed">Reviewed</option></select></label>
        <label class="form-shell"><span>Hazard Report</span><select class="input-shell" id="crudDocHazardReport"><option value="missing">Missing</option><option value="requested">Requested</option><option value="submitted">Submitted</option><option value="reviewed">Reviewed</option></select></label>
      </fieldset>
      <p class="auth-form-note form-span-2">Seller verification updates the linked seller account, while approval state and document review control listing trust badges and visibility.</p>
      <div class="crud-actions form-span-2">
        <button type="button" class="btn-shell btn-shell-secondary" data-modal-close="propertyCrudModal">Cancel</button>
        <button type="submit" class="btn-shell btn-shell-primary">Save Property</button>
      </div>
    </form>
  </div>
</div>

<div class="modal-shell" id="propertyDeleteModal" hidden>
  <div class="modal-card compact-modal">
    <div class="modal-head">
      <div>
        <div class="panel-kicker">Delete Listing</div>
        <h3 class="section-title">Remove this property?</h3>
      </div>
      <button type="button" class="modal-close" data-modal-close="propertyDeleteModal">Close</button>
    </div>
    <p class="panel-text" id="deletePropertyLabel">This will remove the selected property from MySQL.</p>
    <div class="crud-actions">
      <button type="button" class="btn-shell btn-shell-secondary" data-modal-close="propertyDeleteModal">Cancel</button>
      <button type="button" class="btn-shell btn-shell-danger" id="confirmDeleteProperty">Delete Property</button>
    </div>
  </div>
</div>
<?php sfc_render_footer($context); ?>
