<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

sfc_require_role('seller', sfc_path('/seller-login.php'));
$context = sfc_web_context();
$categories = \App\Support\PropertyCatalog::categories();
sfc_render_head('Broker dashboard | LOCUS-SF', $context, ['page' => 'broker-workspace', 'role' => 'seller']);
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/broker-workspace.css<?= htmlspecialchars(sfc_asset_version('css/broker-workspace.css'), ENT_QUOTES, 'UTF-8') ?>">
<?php sfc_render_header($context, 'seller'); ?>
<main class="broker-workspace site-shell">
  <section class="broker-heading">
    <div><span class="broker-eyebrow">Broker dashboard</span><h1>Your listings.</h1></div>
    <div class="broker-actions">
      <a class="broker-button" href="<?= htmlspecialchars(sfc_path('/profile.php'), ENT_QUOTES, 'UTF-8') ?>">Edit profile</a>
      <button class="broker-button is-primary" id="brokerAddListing" type="button" disabled>Submit listing</button>
    </div>
  </section>
  <div id="brokerFeedback" class="broker-feedback" role="status" hidden></div>
  <section id="brokerVerification" class="broker-verification" aria-label="Broker verification"><span>Loading verification…</span></section>
  <section id="brokerStats" class="broker-stats" aria-label="Listing statistics" aria-live="polite"></section>
  <section class="broker-panel" aria-labelledby="brokerListingsTitle">
    <div class="broker-section-head">
      <h2 id="brokerListingsTitle">My listings <span id="brokerListingCount" class="broker-count">0</span></h2>
      <a href="<?= htmlspecialchars(sfc_path('/property-ranking.php'), ENT_QUOTES, 'UTF-8') ?>">MCE &amp; IAI rankings ↗</a>
    </div>
    <div class="broker-list-toolbar">
      <label class="broker-search"><span class="broker-sr-only">Search your listings</span><input id="brokerSearch" type="search" placeholder="Search listings"></label>
      <label><span class="broker-sr-only">Listing review status</span><select id="brokerStatusFilter"><option value="all">All statuses</option><option value="approved">Accepted</option><option value="pending_review">Pending</option><option value="rejected">Declined</option><option value="archived">Archived</option></select></label>
    </div>
    <div id="brokerListings" aria-live="polite"><p class="broker-empty">Loading your listings…</p></div>
    <p class="broker-panel-note">CICTO reviews every submission. MCE and IAI scores appear after city assessment.</p>
  </section>
  <details class="broker-panel broker-disclosure" id="brokerMessagesDetails">
    <summary><span>Messages &amp; visits</span><span id="brokerMessageCount" class="broker-count">0</span></summary>
    <div class="broker-message-grid"><div id="brokerThreadList" class="broker-thread-list"></div><div id="brokerThreadView" class="broker-thread-view"><p class="broker-empty">Choose a conversation.</p></div></div>
  </details>
  <details class="broker-panel broker-disclosure" id="brokerDocumentsDetails">
    <summary><span>Document requests</span><span id="brokerDocumentCount" class="broker-count">0</span></summary>
    <div id="brokerDocumentList" class="broker-document-list"></div>
  </details>
</main>
<dialog class="broker-dialog" id="brokerListingDialog" aria-labelledby="brokerModalTitle">
  <div class="broker-dialog-heading"><div><span class="broker-eyebrow">City review required</span><h2 id="brokerModalTitle">Submit listing</h2></div><button class="broker-close" type="button" id="brokerCloseDialog" aria-label="Close listing form">×</button></div>
  <form id="brokerListingForm" class="broker-form">
    <input type="hidden" name="propertyId">
    <label class="broker-wide">Property name<input name="property_name" required maxlength="180" autocomplete="off"></label>
    <label>Category<select name="category" id="brokerCategory" required><?php foreach ($categories as $category => $subcategories): ?><option value="<?= htmlspecialchars($category, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($category, ENT_QUOTES, 'UTF-8') ?></option><?php endforeach; ?></select></label>
    <label>Subcategory<select name="subcategory" id="brokerSubcategory"><option value="">Select subcategory</option></select></label>
    <label>Barangay<input name="barangay" required maxlength="100"></label>
    <label>City<input name="city" value="San Fernando, La Union" required maxlength="120"></label>
    <label>Price (PHP)<input name="price" type="number" min="0" step="0.01" required></label>
    <label>Land area (ha)<input name="land_area" type="number" min="0.0001" step="0.0001" required></label>
    <label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" required></label>
    <label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" required></label>
    <label class="broker-wide">Description<textarea name="description" rows="3" required maxlength="5000"></textarea></label>
    <label class="broker-wide">Property photo<input name="image_file" type="file" accept="image/jpeg,image/png,image/webp"></label>
    <details class="broker-form-details broker-wide"><summary>Location &amp; contact</summary><div class="broker-form">
      <label>Corridor<select name="corridor"><option value="highway">Highway</option><option value="downtown">Downtown</option><option value="coastal">Coastal</option></select></label>
      <label>Availability<select name="status"><option>Available</option><option>Reserved</option><option>Negotiating</option><option>Under Review</option></select></label>
      <label>Contact name<input name="owner_name" maxlength="180" autocomplete="name"></label>
      <label>Phone<input name="owner_phone" type="tel" maxlength="40" autocomplete="tel"></label>
      <label class="broker-wide">Email<input name="owner_email" type="email" maxlength="180" autocomplete="email"></label>
      <label class="broker-wide">Contact option<select name="contactMode"><option value="broker">Contact me</option><option value="open_listing">Open listing · city contact</option></select></label>
    </div></details>
    <p id="brokerFormError" class="broker-form-error broker-wide" role="alert" hidden></p>
    <div class="broker-form-actions broker-wide"><button class="broker-button" type="button" id="brokerCancelDialog">Cancel</button><button class="broker-button is-primary" id="brokerSubmitListing" type="submit">Submit for review</button></div>
  </form>
</dialog>
<script type="application/json" id="brokerCategoryData"><?= json_encode($categories, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?></script>
<script type="module" src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/broker-workspace.js<?= htmlspecialchars(sfc_asset_version('js/broker-workspace.js'), ENT_QUOTES, 'UTF-8') ?>"></script>
<?php sfc_render_footer($context); ?>
