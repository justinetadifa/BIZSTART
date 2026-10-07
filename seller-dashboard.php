<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

sfc_require_role('seller', sfc_path('/seller-login.php'));
$context = sfc_web_context();
$categories = \App\Support\PropertyCatalog::categories();
sfc_render_head('Broker dashboard | LOCUS-SF', $context, ['page' => 'broker-workspace', 'role' => 'seller']);
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/broker-workspace.css<?= htmlspecialchars(sfc_asset_version('css/broker-workspace.css'), ENT_QUOTES, 'UTF-8') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/workspace-polish.css<?= sfc_asset_version('css/workspace-polish.css') ?>">
<?php sfc_render_header($context, 'seller'); ?>
<main class="broker-workspace site-shell">
  <section class="tw-flex tw-flex-col tw-justify-between tw-gap-5 tw-rounded-2xl tw-border tw-border-amber-200 tw-bg-[#fff8eb] tw-p-6 sm:tw-flex-row sm:tw-items-center sm:tw-p-8">
    <div><span class="tw-mb-3 tw-inline-flex tw-rounded-full tw-border tw-border-amber-300 tw-bg-white/70 tw-px-3 tw-py-1 tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-widest tw-text-amber-800">Broker workspace</span><h1 class="!tw-text-3xl tw-font-semibold">Your listings, in one place.</h1><p class="tw-mb-0 tw-mt-3 tw-text-sm tw-text-slate-500">Submit properties, follow city reviews, and connect with investors.</p></div>
    <div class="tw-flex tw-flex-wrap tw-gap-2">
      <a class="tw-inline-flex tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-amber-200 tw-bg-white tw-px-4 tw-py-3 tw-text-xs tw-font-semibold tw-text-[#11224d] tw-no-underline" href="<?= htmlspecialchars(sfc_path('/profile.php'), ENT_QUOTES, 'UTF-8') ?>">Edit profile</a>
      <button class="tw-rounded-lg tw-border-0 tw-bg-[#11224d] tw-px-4 tw-py-3 tw-text-xs tw-font-semibold tw-text-white disabled:tw-cursor-not-allowed disabled:tw-opacity-40" id="brokerAddListing" type="button" disabled>+ Submit listing</button>
    </div>
  </section>
  <div id="brokerFeedback" class="broker-feedback" role="status" hidden></div>
  <section id="brokerVerification" class="broker-verification" aria-label="Broker verification"><span>Loading verification…</span></section>
  <section id="brokerStats" class="tw-grid tw-grid-cols-2 tw-gap-3 lg:tw-grid-cols-4" aria-label="Listing statistics" aria-live="polite"></section>
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
  <form id="brokerListingForm" class="broker-form" novalidate>
    <input type="hidden" name="propertyId">
    <label class="broker-wide">Property name<input name="property_name" required maxlength="180" autocomplete="off"></label>
    <label>Category<select name="category" id="brokerCategory" required><?php foreach ($categories as $category => $subcategories): ?><option value="<?= htmlspecialchars($category, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($category, ENT_QUOTES, 'UTF-8') ?></option><?php endforeach; ?></select></label>
    <label>Subcategory<select name="subcategory" id="brokerSubcategory"><option value="">Select subcategory</option></select></label>
    <label>Price (PHP)<input name="price" type="number" min="1" step="1" required></label>
    <label>Land area (m²)<input name="land_area" type="number" min="1" step="1" required></label>
    <label class="broker-wide">Description<textarea name="description" rows="3" required maxlength="5000"></textarea></label>
    <label class="broker-wide">Property photo<input name="image_file" type="file" accept="image/jpeg,image/png,image/webp"></label>
    <details class="broker-wide tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-4"><summary class="tw-cursor-pointer tw-text-sm tw-font-semibold">Location &amp; surroundings</summary><p class="tw-mb-4 tw-mt-2 tw-text-xs tw-text-slate-500">Map coordinates are required. Nearby places and photos are optional.</p><div class="broker-form">
      <label>Barangay<input name="barangay" required maxlength="100"></label><label>City<input name="city" value="San Fernando, La Union" required maxlength="120"></label>
      <label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" required></label><label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" required></label>
      <label>Corridor<select name="corridor"><option value="highway">Highway</option><option value="downtown">Downtown</option><option value="coastal">Coastal</option></select></label>
      <label>Availability<select name="status"><option>Available</option><option>Reserved</option><option>Negotiating</option><option>Under Review</option></select></label>
    </div><div class="tw-mt-5" data-nearby-editor><div class="tw-mb-3 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3"><div class="tw-min-w-[140px] tw-flex-1"><h3 class="tw-m-0 tw-text-sm tw-font-semibold">What's nearby?</h3><p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-500">Add useful properties or businesses around the site.</p></div><button type="button" data-add-nearby class="tw-shrink-0 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-semibold disabled:tw-opacity-40">+ Add place</button></div><div class="tw-grid tw-gap-3" data-nearby-list></div></div></details>
    <details class="broker-wide tw-rounded-xl tw-border tw-border-slate-200 tw-p-4"><summary class="tw-cursor-pointer tw-text-sm tw-font-semibold">Contact details</summary><div class="broker-form tw-mt-4">
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
