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
<dialog class="tw-w-[min(760px,calc(100%-24px))] tw-max-w-none tw-max-h-[92vh] tw-overflow-y-auto tw-rounded-2xl tw-border-0 tw-bg-white tw-p-0 tw-text-[#11224d] tw-shadow-xl backdrop:tw-bg-[#11224d]/50" id="cityPropertyEditor" aria-labelledby="cityEditorTitle">
  <form data-property-form novalidate>
    <div class="tw-sticky tw-top-0 tw-z-10 tw-border-b tw-border-slate-200 tw-bg-white tw-p-5 sm:tw-px-7 [@media(max-height:500px)]:tw-p-3"><div class="tw-flex tw-items-start tw-justify-between tw-gap-4"><div><span class="tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-widest tw-text-slate-500 [@media(max-height:500px)]:tw-hidden">City property desk</span><h2 id="cityEditorTitle" class="tw-mb-0 tw-mt-2 tw-text-xl tw-font-semibold [@media(max-height:500px)]:tw-mt-0">Add property</h2></div><button type="button" class="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-slate-200 tw-bg-white tw-text-xl tw-text-slate-500" data-close-dialog aria-label="Close">×</button></div><nav class="tw-mt-5 tw-grid tw-grid-cols-3 tw-gap-2 [@media(max-height:500px)]:tw-mt-2" aria-label="Property form steps"><button class="tw-min-h-11 tw-rounded-lg tw-border-0 tw-px-1 tw-py-2.5 tw-text-[11px] sm:tw-text-xs tw-font-semibold" type="button" data-editor-step="0">1 · Property</button><button class="tw-min-h-11 tw-rounded-lg tw-border-0 tw-px-1 tw-py-2.5 tw-text-[11px] sm:tw-text-xs tw-font-semibold" type="button" data-editor-step="1">2 · Location</button><button class="tw-min-h-11 tw-rounded-lg tw-border-0 tw-px-1 tw-py-2.5 tw-text-[11px] sm:tw-text-xs tw-font-semibold" type="button" data-editor-step="2">3 · Review</button></nav></div>
    <input type="hidden" name="id">
    <div class="tw-p-5 sm:tw-p-7">
      <section data-editor-panel="0"><h3 class="tw-m-0 tw-text-base tw-font-semibold">Start with the essentials</h3><p class="tw-mb-5 tw-mt-2 tw-text-sm tw-text-slate-500">A clear title, price, and photo help investors understand the site.</p><div class="tw-grid tw-gap-5 sm:tw-grid-cols-2">
        <label class="<?= $label ?> sm:tw-col-span-2">Property name<input class="<?= $field ?>" name="property_name" required maxlength="180" placeholder="e.g. Commercial lot in Biday"></label>
        <label class="<?= $label ?>">Category<select class="<?= $field ?>" name="category" required><?php foreach (\App\Support\PropertyCatalog::categories() as $category => $subcategories): ?><option><?= htmlspecialchars($category, ENT_QUOTES, 'UTF-8') ?></option><?php endforeach; ?></select></label>
        <div class="<?= $label ?>" data-subcategory-wrapper>
          <div class="tw-flex tw-items-center tw-justify-between">
            <span>Subcategory</span>
            <span class="tw-text-[11px] tw-font-normal tw-text-slate-400" data-subcategory-count>Multi-select</span>
          </div>
          <div class="tw-relative tw-mt-2">
            <button type="button" class="tw-flex tw-min-h-[46px] tw-w-full tw-items-center tw-justify-between tw-gap-2 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-2.5 tw-text-left tw-text-sm tw-text-[#11224d] hover:tw-border-slate-300 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-amber-200" data-subcategory-trigger aria-expanded="false" aria-haspopup="true">
              <span class="tw-truncate tw-text-sm tw-text-slate-500" data-subcategory-trigger-text>Select subcategories...</span>
              <svg class="tw-h-4 tw-w-4 tw-shrink-0 tw-text-slate-400 tw-transition-transform" data-subcategory-caret fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div class="tw-absolute tw-left-0 tw-right-0 tw-top-full tw-z-30 tw-mt-1.5 tw-hidden tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-3 tw-shadow-xl" data-subcategory-popover>
              <div class="tw-mb-2.5 tw-flex tw-items-center tw-justify-between tw-border-b tw-border-slate-100 tw-pb-2">
                <span class="tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-slate-400">Available tags</span>
                <div class="tw-flex tw-gap-2">
                  <button type="button" class="tw-text-[11px] tw-font-semibold tw-text-[#11224d] hover:tw-underline" data-subcategory-select-all>Select all</button>
                  <span class="tw-text-slate-300">·</span>
                  <button type="button" class="tw-text-[11px] tw-font-medium tw-text-slate-500 hover:tw-underline" data-subcategory-clear-all>Clear</button>
                </div>
              </div>
              <div class="tw-grid tw-max-h-48 tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-1.5 tw-overflow-y-auto tw-pr-1" data-subcategory-grid></div>
            </div>
          </div>
          <div class="tw-mt-2 tw-flex tw-flex-wrap tw-gap-1.5" data-subcategory-tags></div>
          <input type="hidden" name="subcategory" data-subcategory-input>
        </div>
        <div class="<?= $label ?>">
          <div class="tw-flex tw-items-center tw-justify-between">
            <span>Area</span>
            <span class="tw-text-[11px] tw-font-normal tw-text-slate-400">Site size</span>
          </div>
          <div class="tw-mt-2 tw-flex tw-items-stretch tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white focus-within:tw-border-amber-300 focus-within:tw-ring-2 focus-within:tw-ring-amber-200">
            <input class="tw-w-full tw-min-w-0 tw-border-0 tw-bg-transparent tw-px-3 tw-py-3 tw-text-sm tw-text-[#11224d] focus:tw-outline-none" name="land_area" type="number" step="any" min="0.0001" required placeholder="2500" data-area-input>
            <select class="tw-border-0 tw-border-l tw-border-slate-200 tw-bg-slate-50 tw-px-3.5 tw-py-3 tw-text-xs tw-font-semibold tw-text-[#11224d] focus:tw-outline-none hover:tw-bg-slate-100" name="land_area_unit" data-area-unit>
              <option value="sqm" selected>sqm</option>
              <option value="hectares">hectares</option>
            </select>
          </div>
          <span class="tw-mt-1.5 tw-block tw-text-xs tw-font-medium tw-text-slate-500" data-area-calc>Calculated: —</span>
        </div>
        <div class="<?= $label ?>">
          <div class="tw-flex tw-items-center tw-justify-between">
            <span>Asking price (₱)</span>
            <span class="tw-text-[11px] tw-font-normal tw-text-slate-400">Auto-formatted</span>
          </div>
          <input class="<?= $field ?>" name="price" type="text" inputmode="numeric" required placeholder="15,000,000" autocomplete="off" data-price-input>
        </div>
        <label class="<?= $label ?> sm:tw-col-span-2">Description<textarea class="<?= $field ?>" name="description" rows="3" maxlength="3000" required placeholder="Describe access, current use, and the site's main strengths."></textarea></label>
        <label class="<?= $label ?> sm:tw-col-span-2">Property photo <span class="tw-font-normal tw-text-slate-500">(optional)</span><input class="<?= $field ?> file:tw-mr-3 file:tw-rounded-md file:tw-border-0 file:tw-bg-slate-100 file:tw-px-3 file:tw-py-2 file:tw-text-xs" name="image_file" type="file" accept="image/jpeg,image/png,image/webp"><span class="tw-mt-2 tw-block tw-text-xs tw-font-normal tw-text-slate-500">JPG, PNG or WEBP. Keep the existing photo when editing by leaving this empty.</span></label>
      </div></section>
      <section data-editor-panel="1" hidden><h3 class="tw-m-0 tw-text-base tw-font-semibold">Place it on the map</h3><p class="tw-mb-5 tw-mt-2 tw-text-sm tw-text-slate-500">Search for a place or tap the map, then confirm the parcel coordinates.</p><div class="tw-grid tw-gap-5 sm:tw-grid-cols-2">
        <label class="<?= $label ?>">Barangay<input class="<?= $field ?>" name="barangay" maxlength="120" required placeholder="Barangay name"></label><label class="<?= $label ?>">Availability<select class="<?= $field ?>" name="status"><option>Available</option><option>Reserved</option><option>Sold</option><option>Unavailable</option></select></label>
        <div class="tw-min-w-0 sm:tw-col-span-2"><label class="<?= $label ?>" for="adminLocationSearch">Find a place</label><div class="tw-mt-2 tw-flex tw-gap-2"><input id="adminLocationSearch" type="search" class="tw-min-w-0 tw-flex-1 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-3 tw-text-sm" data-location-search maxlength="160" placeholder="Place or existing listing"><button type="button" class="tw-min-h-11 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-text-xs tw-font-semibold disabled:tw-opacity-40" data-location-search-button>Search</button></div><div class="tw-mt-2 tw-grid tw-gap-2" data-location-results></div><div class="tw-relative tw-isolate tw-mt-3 tw-overflow-hidden tw-rounded-xl tw-border tw-border-slate-200"><div class="tw-h-56 tw-w-full [@media(max-height:500px)]:tw-h-40" data-location-map aria-label="Choose property location on the map"></div></div><div class="tw-mt-3 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3"><p class="tw-m-0 tw-min-w-0 tw-flex-1 tw-text-[11px] tw-leading-relaxed tw-text-slate-500" data-location-status role="status">The pin is a location estimate. Verify it against the parcel records.</p><button type="button" class="tw-min-h-11 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-text-xs tw-font-semibold" data-use-map-center>Use map center</button></div></div>
        <label class="<?= $label ?>">Latitude<input class="<?= $field ?>" name="lat" type="number" step="0.000001" min="-90" max="90" required placeholder="16.615000"></label><label class="<?= $label ?>">Longitude<input class="<?= $field ?>" name="lng" type="number" step="0.000001" min="-180" max="180" required placeholder="120.316000"></label>
      </div><fieldset class="tw-mx-0 tw-mb-0 tw-mt-6 tw-min-w-0 tw-rounded-xl tw-border tw-border-slate-200 tw-p-4"><legend class="tw-px-2 tw-text-xs tw-font-semibold">Site context <span class="tw-font-normal tw-text-slate-500">· optional</span></legend><div class="tw-flex tw-flex-wrap tw-gap-2"><?php foreach (\App\Support\PropertyCatalog::contextTags() as $tag): ?><label class="tw-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-py-2 tw-text-[11px]"><input class="tw-h-3 tw-w-3 tw-accent-[#11224d]" type="checkbox" name="assessmentTags[]" value="<?= htmlspecialchars($tag, ENT_QUOTES, 'UTF-8') ?>"><span><?= htmlspecialchars(ucwords(strtolower($tag)), ENT_QUOTES, 'UTF-8') ?></span></label><?php endforeach; ?></div></fieldset>
      <div class="tw-mt-6" data-nearby-editor><div class="tw-mb-3 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3"><div class="tw-min-w-[140px] tw-flex-1"><h4 class="tw-m-0 tw-text-sm tw-font-semibold">What's nearby?</h4><p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-500">Optional · up to six places, with photos if available.</p></div><button type="button" data-add-nearby class="tw-shrink-0 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-semibold disabled:tw-opacity-40">+ Add place</button></div><div class="tw-grid tw-gap-3" data-nearby-list></div></div></section>
      <section data-editor-panel="2" hidden>
        <div data-automatic-assessment>
          <div class="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3"><div class="tw-min-w-0 tw-flex-1"><span class="tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-widest tw-text-slate-500">Step 3 / Review</span><h3 class="tw-mb-0 tw-mt-2 tw-text-xl tw-font-semibold">City assessment</h3></div><span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-slate-100 tw-px-3 tw-py-1.5 tw-text-[10px] tw-font-semibold"><svg class="tw-h-3 tw-w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4"/></svg>System generated</span></div>
          <p class="tw-mb-4 tw-mt-3 tw-text-xs tw-leading-relaxed tw-text-slate-500">System-Generated MCE Scores: Calculated automatically based on spatial proximity and Step 2 location data. These fields are read-only.</p>
          <p class="tw-mb-4 tw-rounded-lg tw-bg-amber-50 tw-p-3 tw-text-xs tw-leading-relaxed tw-text-amber-900" data-legacy-assessment hidden>This listing has an earlier manual assessment. Saving from this form calculates a new automatic assessment and retains the earlier result in its history.</p>
          <div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3"><p class="tw-m-0 tw-min-w-0 tw-flex-1 tw-text-[11px] tw-leading-relaxed tw-text-slate-500" data-assessment-status role="status">Set the location in Step 2. Scores are calculated by the system.</p><button type="button" class="tw-min-h-11 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-text-xs tw-font-semibold hover:tw-bg-slate-50" data-recalculate-assessment>Recalculate</button></div>
          <div class="tw-grid tw-gap-3 sm:tw-grid-cols-2">
            <?php foreach (\App\Support\PropertyCatalog::criteria() as $key => $criterionLabel): ?>
            <article class="tw-min-w-0 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4" data-assessment-criterion="<?= $key ?>">
              <div class="tw-flex tw-items-start tw-justify-between tw-gap-3"><div class="tw-min-w-0"><h4 class="tw-m-0 tw-text-xs tw-font-semibold"><?= htmlspecialchars($criterionLabel, ENT_QUOTES, 'UTF-8') ?></h4><span class="tw-mt-1 tw-block tw-text-[10px] tw-text-slate-400"><?= \App\Support\PropertyAssessment::WEIGHTS[$key] ?>% of MCE</span></div><span class="tw-shrink-0 tw-text-[10px] tw-font-semibold tw-tabular-nums tw-text-[#11224d]" data-score-value>Awaiting data</span></div>
              <div class="tw-mt-4 tw-h-1.5 tw-overflow-hidden tw-rounded-full tw-bg-slate-100" role="progressbar" aria-label="<?= htmlspecialchars($criterionLabel, ENT_QUOTES, 'UTF-8') ?>" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Awaiting source data"><span class="tw-block tw-h-full tw-rounded-full tw-bg-[#9e1b22] tw-transition-[width] motion-reduce:tw-transition-none"></span></div>
              <p class="tw-mb-0 tw-mt-3 tw-text-[11px] tw-italic tw-leading-relaxed tw-text-slate-500"><span class="tw-font-medium">Justification: </span><span data-score-justification>Set the location in Step 2 to check verified source data.</span></p>
              <p class="tw-mb-0 tw-mt-2 tw-break-words tw-text-[10px] tw-leading-relaxed tw-text-slate-400" data-score-rule hidden></p><p class="tw-mb-0 tw-mt-2 tw-break-words tw-text-[10px] tw-leading-relaxed tw-text-slate-400" data-score-evidence hidden></p>
            </article>
            <?php endforeach; ?>
          </div>
          <details class="tw-mt-4 tw-rounded-xl tw-bg-slate-50 tw-p-4" data-spatial-context hidden><summary class="tw-cursor-pointer tw-text-xs tw-font-semibold">Location evidence</summary><dl class="tw-mb-0 tw-mt-4 tw-grid tw-gap-4 sm:tw-grid-cols-2"></dl></details>
          <div class="tw-mt-5 tw-rounded-xl tw-bg-[#11224d] tw-p-5 tw-text-white" data-live-scores>
            <span class="tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-widest tw-text-white/60">Computed result</span><div class="tw-mt-3 tw-grid tw-grid-cols-2 tw-gap-4"><div><span class="tw-block tw-text-[11px] tw-text-white/60">MCE</span><strong class="tw-text-2xl sm:tw-text-3xl tw-font-semibold tw-tabular-nums" data-total-mce>?</strong><span class="tw-ml-1 tw-text-[10px] tw-text-white/60">/ 100</span></div><div class="tw-border-0 tw-border-l tw-border-solid tw-border-white/20 tw-pl-4"><span class="tw-block tw-text-[11px] tw-text-white/60">IAI</span><strong class="tw-text-2xl sm:tw-text-3xl tw-font-semibold tw-tabular-nums" data-total-iai>?</strong><span class="tw-ml-1 tw-text-[10px] tw-text-white/60">/ 100</span></div></div><p class="tw-mb-0 tw-mt-4 tw-text-[11px] tw-leading-relaxed tw-text-white/70" data-computed-summary>0 of 7 criteria ready. A complete source-based assessment is required for totals.</p>
          </div>
          <details class="tw-mt-4 tw-text-xs tw-text-slate-500"><summary class="tw-cursor-pointer">How scores are calculated</summary><p data-assessment-method class="tw-leading-relaxed"></p></details>
        </div>
        <label class="<?= $label ?> tw-mt-6">Assessment basis <span class="tw-font-normal tw-text-slate-500">(optional notes)</span><textarea class="<?= $field ?>" name="readiness_notes" rows="3" maxlength="10000" placeholder="Add site observations or notes for the reviewing department."></textarea><span class="tw-mt-2 tw-block tw-text-[11px] tw-font-normal tw-text-slate-500">Notes provide context and do not change the system-generated scores.</span></label>
      <details class="tw-mt-6 tw-rounded-xl tw-border tw-border-slate-200 tw-p-4"><summary class="tw-cursor-pointer tw-text-sm tw-font-semibold">Listing contact <span class="tw-font-normal tw-text-slate-500">· optional</span></summary><div class="tw-mt-4 tw-grid tw-gap-4 sm:tw-grid-cols-2"><label class="<?= $label ?> sm:tw-col-span-2">Contact route<select class="<?= $field ?>" name="contactBrokerUserId"><option value="">Open listing · city contact</option></select></label><label class="<?= $label ?>">Contact name<input class="<?= $field ?>" name="owner_name" maxlength="150"></label><label class="<?= $label ?>">Phone<input class="<?= $field ?>" name="owner_phone" type="tel" maxlength="40"></label><label class="<?= $label ?> sm:tw-col-span-2">Email<input class="<?= $field ?>" name="owner_email" type="email" maxlength="190"></label></div></details></section>
      <p class="city-form-message" data-editor-message role="status"></p>
    </div><div class="tw-sticky tw-bottom-0 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-t tw-border-slate-200 tw-bg-white tw-p-5 sm:tw-px-7 [@media(max-height:500px)]:tw-p-3"><button type="button" class="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-4 tw-py-3 tw-text-sm tw-font-medium" data-editor-back>Back</button><span class="tw-text-xs tw-text-slate-500" data-editor-progress>Step 1 of 3</span><button type="button" class="tw-rounded-lg tw-border-0 tw-bg-[#11224d] tw-w-full min-[400px]:tw-w-auto tw-px-5 tw-py-3 tw-text-sm tw-font-semibold tw-text-white" data-editor-next>Continue</button><button type="submit" class="tw-rounded-lg tw-border-0 tw-bg-[#9e1b22] tw-w-full min-[400px]:tw-w-auto tw-px-5 tw-py-3 tw-text-sm tw-font-semibold tw-text-white disabled:tw-opacity-50" hidden>Save for review</button></div>
  </form>
</dialog>
<?php if ($governance): ?>
<dialog class="city-dialog city-dialog-small" id="cityReviewDialog" aria-labelledby="cityReviewTitle"><form data-listing-review-form><div class="city-dialog-heading"><h2 id="cityReviewTitle">Review listing</h2><button type="button" class="city-icon-button" data-close-dialog aria-label="Close">×</button></div><input type="hidden" name="id"><div data-review-evidence></div><label>Message to broker<textarea name="reviewNote" rows="3" required maxlength="3000" placeholder="Decision and supporting reasons"></textarea></label><div class="city-check-options"><label><input type="checkbox" name="documents_reviewed">Documents checked</label><label><input type="checkbox" name="site_verified">Site checked</label></div><label>Decision<select name="approval_state"><option value="approved">Accept listing</option><option value="rejected">Decline listing</option></select></label><p class="city-form-message" data-review-message role="status"></p><div class="city-dialog-actions"><button class="city-button" type="submit">Send decision</button></div></form></dialog>
<?php endif; ?>
<script type="application/json" id="cityAssessmentWeights"><?= json_encode(\App\Support\PropertyAssessment::WEIGHTS) ?></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/nearby-editor.js<?= sfc_asset_version('js/nearby-editor.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-location.js<?= sfc_asset_version('js/admin-location.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-assessment.js<?= sfc_asset_version('js/admin-assessment.js') ?>" defer></script>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-workspace.js<?= sfc_asset_version('js/admin-workspace.js') ?>" defer></script>
<?php sfc_render_footer($context); ?>
