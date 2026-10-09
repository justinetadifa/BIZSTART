<?php
/** Shared property submission form for city staff and brokers. */
$pwEscape = static fn ($value): string => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
$pwIcon = static function (string $name, string $class = '') use ($pwEscape): string {
    $paths = [
        'arrow' => '<path d="M4 12h15m-6-6 6 6-6 6"/>',
        'chevron' => '<path d="m6 9 6 6 6-6"/>',
        'check' => '<path d="m5 12 4 4L19 6"/>',
        'save' => '<path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8"/>',
        'close' => '<path d="m6 6 12 12M6 18 18 6"/>',
        'photo' => '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 5 5 3-3 4 4"/>',
        'camera' => '<path d="M8 6 10 3h4l2 3h4v14H4V6h4Z"/><circle cx="12" cy="12" r="4"/>',
        'pin' => '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
        'boundary' => '<path d="m5 7 13-3 2 13-13 3L5 7Z"/><circle cx="5" cy="7" r="1.5"/><circle cx="18" cy="4" r="1.5"/><circle cx="20" cy="17" r="1.5"/><circle cx="7" cy="20" r="1.5"/>',
        'area' => '<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/>',
        'search' => '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
        'layers' => '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
        'edit' => '<path d="m4 3 14 10-7 1-3 7L4 3Z"/>',
        'undo' => '<path d="m8 5-5 5 5 5M3 10h11a6 6 0 0 1 0 12"/>',
        'reset' => '<path d="M19 7a9 9 0 1 1-7-4m7 0v5h-5"/>',
        'road' => '<path d="m7 3-3 18m13-18 3 18M12 3v3m0 4v4m0 4v3"/>',
        'utilities' => '<path d="m13 2-8 12h6l-1 8 9-13h-7l1-7Z"/>',
        'chart' => '<path d="M5 20v-6m7 6V9m7 11V3" stroke-width="3"/>',
        'document' => '<path d="M6 3h9l4 4v14H6V3Zm9 0v5h4M9 12h7m-7 4h7"/>',
        'tag' => '<path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7.5" cy="7.5" r="1"/>',
        'info' => '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
        'warning' => '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v1"/>',
        'leaf' => '<path d="M20 4C7 2 3 7 5 15c8 4 16-2 15-11ZM3 21l12-12"/>',
        'coffee' => '<path d="M4 5h13v7a6.5 6.5 0 0 1-13 0V5Zm13 1h2a3 3 0 0 1 0 6h-2M3 21h16M8 1v1m5-1v1"/>',
        'store' => '<path d="M4 10v11h16V10M3 4h18l-2 6H5L3 4Zm6 17v-7h6v7"/>',
        'office' => '<path d="M4 6h16v15H4V6Zm5 0V3h6v3M4 12h16m-8-3v6"/>',
        'text' => '<path d="M4 5h16M4 10h16M4 15h9M4 20h6"/>',
        'target' => '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
    ];
    return '<svg class="pw-icon ' . $pwEscape($class) . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ($paths[$name] ?? $paths['info']) . '</svg>';
};
$pwCriteria = \App\Support\PropertyCatalog::criteria();
$pwClupUses = \App\Support\PropertyCatalog::clupUseTypes($pdo ?? ($GLOBALS['pdo'] ?? ($container['pdo'] ?? null)));
$pwReadiness = [
    'spatial_accessibility' => ['pin', 'Confirm road evidence.', 'Confirm'],
    'infrastructure_readiness' => ['utilities', 'Confirm utilities.', 'Confirm'],
    'economic_viability' => ['chart', 'Add BIR reference.', 'Add reference'],
    'nearby_businesses' => ['store', 'Run the nearby business radar.', 'Run radar'],
    'zoning_compatibility' => ['document', 'Add CLUP evidence.', 'Add evidence'],
    'risk_constraints' => ['warning', 'Review available hazard layers.', 'Review'],
    'environmental_safety' => ['leaf', 'Add environmental evidence.', 'Add evidence'],
];
?>
<dialog class="property-wizard" id="cityPropertyEditor" aria-labelledby="cityEditorTitle">
  <form class="pw-form" data-property-form novalidate>
    <header class="pw-header">
      <div class="pw-heading-row">
        <div><div class="pw-breadcrumb">Properties <span>/</span> <span data-wizard-breadcrumb>Add property</span></div><h2 id="cityEditorTitle">New property</h2><p class="pw-header-note">A few essentials first. Add the details at your own pace.</p></div>
        <div class="pw-header-actions"><span class="pw-draft-badge"><?= $pwIcon('document') ?> Local draft</span><button class="pw-button pw-button-light pw-button-small" type="button" data-save-exit title="Save this draft on this device"><?= $pwIcon('save') ?> Save &amp; exit</button><button class="pw-close" type="button" data-close-dialog aria-label="Close property editor"><?= $pwIcon('close') ?></button></div>
      </div>
      <nav class="pw-steps" aria-label="Property form steps">
        <?php foreach (['Basics', 'Area & location', 'Site evidence', 'Surroundings', 'Review'] as $pwStep => $pwStepLabel): ?>
        <button class="pw-step<?= $pwStep === 0 ? ' is-active' : '' ?>" type="button" data-editor-step="<?= $pwStep ?>" aria-label="Step <?= $pwStep + 1 ?>: <?= $pwEscape($pwStepLabel) ?>"<?= $pwStep === 0 ? ' aria-current="step"' : '' ?>><span class="pw-step-number"><span><?= $pwStep + 1 ?></span><?= $pwIcon('check', 'pw-step-check') ?></span><span class="pw-step-label"><?= $pwStepLabel ?></span></button>
        <?php endforeach; ?>
      </nav>
    </header>
    <input type="hidden" name="id">
    <input type="hidden" name="boundary">
    <input type="hidden" name="calculated_area_sqm">
    <input type="hidden" name="reference_lat">
    <input type="hidden" name="reference_lng">
    <div class="pw-content">
      <section class="pw-panel" data-editor-panel="0">
        <div class="pw-columns pw-basics-columns">
          <article class="pw-card pw-main-card">
            <div class="pw-card-heading"><h3>Tell us about the property</h3><p>Start with the essentials. You can add more details later.</p></div>
            <div class="pw-fields">
              <label class="pw-field pw-full">Property name<input name="property_name" required maxlength="180" placeholder="e.g. Commercial lot in Biday" autocomplete="off"></label>
              <label class="pw-field">
                <span class="pw-label-inline">Property type <span class="pw-info-icon" title="<?= $pwEscape(\App\Support\PropertyCatalog::categoryTooltips()['Vacant Land']) ?>" data-category-tip-icon><?= $pwIcon('info') ?></span></span>
                <select name="category" required data-property-category-select><?php foreach (\App\Support\PropertyCatalog::categories() as $pwCategory => $pwSubcategories): $pwTip = \App\Support\PropertyCatalog::categoryTooltips()[$pwCategory] ?? ''; ?><option value="<?= $pwEscape($pwCategory) ?>" data-tooltip="<?= $pwEscape($pwTip) ?>"<?= $pwCategory === 'Vacant Land' ? ' selected' : '' ?>><?= $pwEscape($pwCategory) ?></option><?php endforeach; ?></select>
                <small class="pw-category-tooltip-note pw-muted" data-category-tip-text><?= $pwEscape(\App\Support\PropertyCatalog::categoryTooltips()['Vacant Land']) ?></small>
              </label>
              <label class="pw-field">Listing status<select name="status"><option>Available</option><option>Unavailable</option><option>Reserved</option><option>Sold</option><option>Leased</option><option value="Availed" hidden disabled>Availed (historical)</option></select></label>
              <label class="pw-field pw-full">Listing purpose<select name="listing_purpose" data-listing-purpose><option value="sale">For Sale</option><option value="lease">For Lease</option><option value="sale_or_lease">For Sale or Lease</option></select></label>
              <div class="pw-field pw-full" data-sale-price-fields><label for="pwAskingPrice">Sale price <span class="pw-muted">(optional)</span></label><div class="pw-input-group"><span>PHP</span><input id="pwAskingPrice" name="price" type="text" inputmode="numeric" pattern="[0-9]+|[0-9]{1,3}(,[0-9]{3})+" maxlength="25" title="Enter a non-negative amount in whole PHP pesos." placeholder="Total sale asking price" autocomplete="off" data-price-input></div><small>Total sale asking price in whole PHP pesos. Leave blank for Price on request.</small></div>
              <div class="pw-field pw-full" data-lease-price-fields hidden><label for="pwLeasePrice">Lease price <span class="pw-muted">(optional)</span></label><div class="pw-input-group"><span>PHP</span><input id="pwLeasePrice" name="lease_price" type="text" inputmode="numeric" pattern="[0-9]+|[0-9]{1,3}(,[0-9]{3})+" maxlength="25" title="Enter a non-negative amount in whole PHP pesos." placeholder="Rental asking price" autocomplete="off" data-price-input></div><small>Rental asking price in whole PHP pesos for the period and unit selected below. Leave blank for Price on request.</small></div>
              <label class="pw-field" data-lease-price-fields hidden>Rental period<select name="lease_period"><option value="month">Per month</option><option value="year">Per year</option><option value="day">Per day</option></select></label>
              <label class="pw-field" data-lease-price-fields hidden>Rental price unit<select name="lease_price_unit"><option value="total">Total property rent</option><option value="sqm">Per square metre (m&sup2;)</option></select></label>
              <p class="pw-price-note pw-muted pw-full">Asking prices are separate from the city’s BIR valuation.</p>
              <div class="pw-field pw-full"><span>Property photo <span class="pw-muted">(optional)</span></span><label class="pw-photo-drop" data-photo-drop><input class="pw-file-input" name="image_file" type="file" accept="image/jpeg,image/png,image/webp" data-photo-file><span class="pw-photo-icon"><?= $pwIcon('camera') ?></span><strong>Add a property photo</strong><span>Drag an image here, or click to browse</span><small data-photo-file-name>JPG, PNG or WEBP. You can add more details later.</small></label></div>
            </div>
            <details class="pw-disclosure pw-details"><summary><?= $pwIcon('text') ?><span>Description &amp; contact details <span class="pw-muted">&middot; Optional</span></span><?= $pwIcon('chevron') ?></summary><div class="pw-fields">
              <label class="pw-field pw-full">Description<textarea name="description" rows="3" maxlength="3000" placeholder="Describe the property, its current use, and any useful context."></textarea></label>
              <div class="pw-field pw-full" data-subcategory-wrapper><div class="pw-label-row"><span>Property subcategories</span><span class="pw-muted" data-subcategory-count>Multi-select</span></div><div class="pw-select-wrapper"><button type="button" class="pw-select-trigger" data-subcategory-trigger aria-expanded="false" aria-haspopup="true"><span data-subcategory-trigger-text>Select subcategories...</span><svg class="pw-icon" data-subcategory-caret viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="pw-subcategory-popover tw-hidden" data-subcategory-popover><div class="pw-label-row"><strong>Available tags</strong><div><button type="button" class="pw-text-button" data-subcategory-select-all>Select all</button><button type="button" class="pw-text-button" data-subcategory-clear-all>Clear</button></div></div><div class="pw-subcategory-grid" data-subcategory-grid></div></div></div><div class="pw-subcategory-tags" data-subcategory-tags></div><input type="hidden" name="subcategory" data-subcategory-input></div>
              <label class="pw-field pw-full">Contact route<select name="contactBrokerUserId"><option value="">Open listing &middot; city contact</option></select></label>
              <label class="pw-field">Contact name<input name="owner_name" maxlength="150" autocomplete="name"></label><label class="pw-field">Phone<input name="owner_phone" type="tel" maxlength="40" autocomplete="tel"></label><label class="pw-field pw-full">Email<input name="owner_email" type="email" maxlength="190" autocomplete="email"></label>
            </div></details>
          </article>
          <aside class="pw-card pw-preview-card"><div class="pw-label-row"><h3>Listing preview</h3><span class="pw-preview-live">Draft</span></div><div class="pw-preview-photo" data-photo-preview><div><?= $pwIcon('photo') ?><span>Your photo will appear here</span></div></div><h4 class="pw-preview-name" data-preview-name>Your new property</h4><div class="pw-badges"><span class="pw-badge" data-preview-category><?= $pwIcon('tag') ?><span>Vacant land</span></span><span class="pw-badge pw-badge-teal" data-preview-status><?= $pwIcon('check') ?><span>Available</span></span></div><p class="pw-muted" data-preview-purpose>For Sale</p><p data-preview-price>Price on request</p><div class="pw-preview-area"><span class="pw-feature-icon"><?= $pwIcon('area') ?></span><p data-preview-area>Add an area size or exact location in the next step.</p></div><div class="pw-draft-note"><?= $pwIcon('info') ?><p>Only the essentials are required. You can save a draft and return to it on this device.</p></div></aside>
        </div>
      </section>
      <section class="pw-panel" data-editor-panel="1" hidden>
        <div class="pw-section-intro"><h3>Give the property a place</h3><p>Provide an area or an exact location. Choose the method that works for you.</p></div>
        <div class="pw-location-methods" role="group" aria-label="How would you like to identify the property?">
          <button type="button" class="is-active" data-location-method="area" aria-pressed="true"><?= $pwIcon('area') ?><span><strong>Area size</strong><small>Use a known measurement</small></span></button>
          <button type="button" data-location-method="pin" aria-pressed="false"><?= $pwIcon('pin') ?><span><strong>Map pin</strong><small>Search or enter coordinates</small></span></button>
          <button type="button" data-location-method="draw" aria-pressed="false"><?= $pwIcon('boundary') ?><span><strong>Plot boundary</strong><small>Draw an optional estimate</small></span></button>
        </div>
        <div class="pw-columns pw-boundary-columns">
          <article class="pw-card pw-map-card" data-location-map-card hidden><div class="pw-card-heading"><h3 data-location-heading>Pinpoint the property</h3><p data-location-help>Search for the site, then click its exact position or enter coordinates below.</p></div>
            <datalist id="pwBarangayOptions">
              <?php foreach (\App\Support\PropertyCatalog::barangays() as $pwBgyName => $pwBgyInfo): ?>
              <option value="<?= $pwEscape($pwBgyName) ?>"><?= $pwEscape($pwBgyName . ' · ' . ($pwBgyInfo['district'] ?? 'San Fernando')) ?></option>
              <?php endforeach; ?>
            </datalist>
            <div class="pw-map-search"><div class="pw-search-input"><?= $pwIcon('search') ?><input id="adminLocationSearch" type="search" maxlength="160" data-location-search list="pwBarangayOptions" placeholder="Search barangay or address" aria-label="Search barangay or address"><button type="button" data-location-search-button aria-label="Search location">Search</button></div><label class="pw-map-style"><span class="pw-sr-only">Map view</span><select data-map-style="location"><option value="streets">Street map</option><option value="satellite">Satellite</option></select></label><details class="pw-layer-control" data-map-layers><summary><?= $pwIcon('layers') ?> Layers <?= $pwIcon('chevron') ?></summary><div><label><input type="checkbox" checked data-layer-toggle="boundary"><i class="pw-legend-boundary"></i> Property boundary</label><label><input type="checkbox" checked data-layer-toggle="flood"><i class="pw-legend-flood"></i> Mapped flood zones</label><label><input type="checkbox" checked data-layer-toggle="fault"><i class="pw-legend-fault"></i> Mapped active faults</label><p>Unavailable hazard layers are marked Not assessed.</p><div data-layer-sources></div></div></details></div>
            <div class="pw-location-results" data-location-results></div>
            <div class="pw-drawing-tools" data-drawing-tools hidden aria-label="Boundary drawing tools"><button type="button" data-boundary-action="draw"><?= $pwIcon('boundary') ?> Draw boundary</button><button type="button" data-boundary-action="edit"><?= $pwIcon('edit') ?> Edit</button><button type="button" data-boundary-action="undo"><?= $pwIcon('undo') ?> Undo</button><button type="button" data-boundary-action="reset"><?= $pwIcon('reset') ?> Reset</button></div>
            <div class="pw-map-shell"><div class="pw-map" data-location-map aria-label="Pin the property location or draw an optional plot boundary"></div></div>
            <p class="pw-map-feedback" data-map-feedback="location" role="status" hidden></p>
            <div class="pw-location-meta"><p data-location-status role="status">Click the property's exact location to place a pin, or choose a barangay.</p><button type="button" class="pw-text-button" data-use-map-center><?= $pwIcon('target') ?> Use map center</button></div>
            <details class="pw-disclosure pw-coordinate-details"><summary><?= $pwIcon('pin') ?><span>Enter exact coordinates</span><?= $pwIcon('chevron') ?></summary><div class="pw-fields"><label class="pw-field">Latitude<input name="lat" type="number" step="any" min="-90" max="90" placeholder="16.615000"></label><label class="pw-field">Longitude<input name="lng" type="number" step="any" min="-180" max="180" placeholder="120.316000"></label></div></details>
          </article>
          <aside class="pw-card pw-area-card">
            <div class="pw-card-heading"><h3>Property details</h3><p>A recorded area is helpful. An exact location is enough to continue.</p></div>
            <label class="pw-field" for="pwLandArea">Land area</label><div class="pw-input-group pw-area-entry"><input id="pwLandArea" name="land_area" type="number" step="any" min="0.0001" placeholder="e.g. 2500" data-area-input><select name="land_area_unit" data-area-unit aria-label="Area unit"><option value="sqm">m²</option><option value="hectares">ha</option></select></div>
            <p class="pw-small pw-muted" data-area-calc>Your entered area stays separate from the map estimate.</p>
            <div class="pw-fields pw-area-context"><label class="pw-field">Measurement source<select name="area_method"><option value="declared">Declared area</option><option value="survey">Survey / property record</option></select></label><label class="pw-field">Barangay<input name="barangay" list="pwBarangayOptions" maxlength="120" placeholder="e.g. Sevilla, Catbangen, Biday" autocomplete="off"><small>Selecting a barangay places an approximate pin. Confirm the property’s exact position.</small></label></div>
            <div class="pw-location-summary" data-location-summary role="status">Add an area or an exact location to continue.</div>
            <div class="pw-boundary-estimate" data-boundary-estimate hidden><div class="pw-label-row"><h4>Drawn plot estimate</h4><span class="pw-badge pw-badge-teal">Calculated</span></div><div class="pw-area-number"><strong data-calculated-area>—</strong><span>m²</span></div><p class="pw-hectares"><span data-calculated-hectares>—</span> ha</p><p class="pw-small pw-muted">An estimate from the boundary, separate from recorded measurements.</p></div>
            <details class="pw-disclosure pw-hazard-disclosure"><summary><?= $pwIcon('layers') ?><span>Hazard screening</span><span class="pw-badge" data-hazard-status>Not assessed</span><?= $pwIcon('chevron') ?></summary><div class="pw-hazards" data-hazard-results><p class="pw-small pw-muted">Provide a location to check available hazard evidence.</p></div><p class="pw-small pw-muted">A location pin screens that point only. Parcel-wide screening requires a boundary and complete source coverage.</p></details>
          </aside>
        </div>
      </section>
      <section class="pw-panel" data-editor-panel="2" hidden>
        <div class="pw-columns pw-evidence-columns"><article class="pw-card pw-main-card"><div class="pw-card-heading"><span class="pw-eyebrow">SITE EVIDENCE</span><h3>Access, zoning &amp; verification</h3><p>Provide evidence to support city assessment. Leave uncertain facts marked Not verified.</p></div><div class="pw-tabs pw-evidence-tabs" role="tablist" aria-label="Site evidence"><button class="is-active" type="button" role="tab" aria-selected="true" aria-controls="pwEvidenceAccess" data-evidence-tab="access"><?= $pwIcon('road') ?> Access &amp; utilities</button><button type="button" role="tab" aria-selected="false" aria-controls="pwEvidenceLanduse" data-evidence-tab="landuse"><?= $pwIcon('document') ?> CLUP / Land use</button><button type="button" role="tab" aria-selected="false" aria-controls="pwEvidenceHazards" data-evidence-tab="hazards"><?= $pwIcon('warning') ?> Hazards</button><button type="button" role="tab" aria-selected="false" aria-controls="pwEvidenceDocuments" data-evidence-tab="documents"><?= $pwIcon('document') ?> Documents</button><button type="button" role="tab" aria-selected="false" aria-controls="pwEvidenceValuation" data-evidence-tab="valuation"><?= $pwIcon('chart') ?> Valuation</button></div>
            <div id="pwEvidenceAccess" class="pw-evidence-section" role="tabpanel" data-evidence-panel="access">
              <h4>Road access</h4>
              <div class="pw-road-fields">
                <fieldset class="pw-choice-field"><legend>Road frontage</legend><div class="pw-options"><label><input type="radio" name="road_frontage" value="yes"><span><?= $pwIcon('check') ?> Yes</span></label><label><input type="radio" name="road_frontage" value="no"><span>No</span></label><label><input type="radio" name="road_frontage" value="not_verified" checked><span>Not verified</span></label></div></fieldset>
                <label class="pw-field">Road surface<select name="road_surface"><option value="not_verified">Not verified</option><option value="paved">Paved</option><option value="gravel">Gravel</option><option value="unpaved">Unpaved</option><option value="other">Other</option></select></label>
              </div>
              <div class="pw-utilities-container">
                <h4>Utilities</h4>
                <!-- Electricity -->
                <div class="pw-utility-card" data-utility-card="electricity">
                  <fieldset class="pw-utility-main-row">
                    <legend class="pw-utility-title"><?= $pwIcon('utilities') ?> Electricity</legend>
                    <div class="pw-options">
                      <label><input type="radio" name="electricity" value="available" data-utility-radio="electricity"><span><?= $pwIcon('check') ?> Available</span></label>
                      <label><input type="radio" name="electricity" value="unavailable" data-utility-radio="electricity"><span>Unavailable</span></label>
                      <label><input type="radio" name="electricity" value="not_verified" data-utility-radio="electricity" checked><span>Not verified</span></label>
                    </div>
                  </fieldset>
                  <div class="pw-utility-reveal" data-utility-reveal="electricity" hidden>
                    <p class="pw-small pw-disclosure-heading">Provider / Source <span class="pw-muted">(check all that apply)</span>:</p>
                    <div class="pw-chip-grid">
                      <label class="pw-chip"><input type="checkbox" name="electricity_sources[]" value="LUECO"><span>LUECO</span></label>
                      <label class="pw-chip"><input type="checkbox" name="electricity_sources[]" value="Solar / on-site renewable energy"><span>Solar / on-site renewable energy</span></label>
                      <label class="pw-chip"><input type="checkbox" name="electricity_sources[]" value="Backup generator"><span>Backup generator</span></label>
                      <label class="pw-chip"><input type="checkbox" name="electricity_sources[]" value="Other"><span>Other</span></label>
                    </div>
                  </div>
                </div>

                <!-- Water -->
                <div class="pw-utility-card" data-utility-card="water">
                  <fieldset class="pw-utility-main-row">
                    <legend class="pw-utility-title"><?= $pwIcon('utilities') ?> Water</legend>
                    <div class="pw-options">
                      <label><input type="radio" name="water" value="available" data-utility-radio="water"><span><?= $pwIcon('check') ?> Available</span></label>
                      <label><input type="radio" name="water" value="unavailable" data-utility-radio="water"><span>Unavailable</span></label>
                      <label><input type="radio" name="water" value="not_verified" data-utility-radio="water" checked><span>Not verified</span></label>
                    </div>
                  </fieldset>
                  <div class="pw-utility-reveal" data-utility-reveal="water" hidden>
                    <p class="pw-small pw-disclosure-heading">Provider / Source <span class="pw-muted">(check all that apply)</span>:</p>
                    <div class="pw-chip-grid">
                      <label class="pw-chip"><input type="checkbox" name="water_sources[]" value="Metro La Union Water District / local water district"><span>Metro La Union Water District / local water district</span></label>
                      <label class="pw-chip"><input type="checkbox" name="water_sources[]" value="Barangay / community water system"><span>Barangay / community water system</span></label>
                      <label class="pw-chip"><input type="checkbox" name="water_sources[]" value="Deep well / groundwater"><span>Deep well / groundwater</span></label>
                      <label class="pw-chip"><input type="checkbox" name="water_sources[]" value="Water delivery / storage"><span>Water delivery / storage</span></label>
                      <label class="pw-chip"><input type="checkbox" name="water_sources[]" value="Other"><span>Other</span></label>
                    </div>
                  </div>
                </div>

                <!-- Internet & Connectivity -->
                <div class="pw-utility-card" data-utility-card="internet">
                  <fieldset class="pw-utility-main-row">
                    <legend class="pw-utility-title"><?= $pwIcon('utilities') ?> Internet &amp; Connectivity</legend>
                    <div class="pw-options">
                      <label><input type="radio" name="internet" value="available" data-utility-radio="internet"><span><?= $pwIcon('check') ?> Available</span></label>
                      <label><input type="radio" name="internet" value="unavailable" data-utility-radio="internet"><span>Unavailable</span></label>
                      <label><input type="radio" name="internet" value="not_verified" data-utility-radio="internet" checked><span>Not verified</span></label>
                    </div>
                  </fieldset>
                  <div class="pw-utility-reveal" data-utility-reveal="internet" hidden>
                    <p class="pw-small pw-disclosure-heading">Internet Providers <span class="pw-muted">(check all that apply)</span>:</p>
                    <div class="pw-chip-grid">
                      <label class="pw-chip"><input type="checkbox" name="internet_providers[]" value="PLDT"><span>PLDT</span></label>
                      <label class="pw-chip"><input type="checkbox" name="internet_providers[]" value="Globe"><span>Globe</span></label>
                      <label class="pw-chip"><input type="checkbox" name="internet_providers[]" value="Converge"><span>Converge</span></label>
                      <label class="pw-chip"><input type="checkbox" name="internet_providers[]" value="Smart"><span>Smart</span></label>
                      <label class="pw-chip"><input type="checkbox" name="internet_providers[]" value="DITO"><span>DITO</span></label>
                      <label class="pw-chip"><input type="checkbox" name="internet_providers[]" value="Other"><span>Other</span></label>
                    </div>
                    <p class="pw-small pw-disclosure-heading" style="margin-top: 10px;">Connection type:</p>
                    <div class="pw-chip-grid">
                      <label class="pw-chip"><input type="checkbox" name="internet_types[]" value="Fiber"><span>Fiber</span></label>
                      <label class="pw-chip"><input type="checkbox" name="internet_types[]" value="Fixed broadband"><span>Fixed broadband</span></label>
                      <label class="pw-chip"><input type="checkbox" name="internet_types[]" value="Mobile data"><span>Mobile data</span></label>
                    </div>
                    <div class="pw-subfield-row" style="margin-top: 12px;">
                      <span class="pw-small pw-disclosure-heading">Connectivity quality:</span>
                      <div class="pw-options pw-options-compact">
                        <label><input type="radio" name="internet_quality" value="strong"><span>Strong</span></label>
                        <label><input type="radio" name="internet_quality" value="moderate"><span>Moderate</span></label>
                        <label><input type="radio" name="internet_quality" value="weak"><span>Weak</span></label>
                        <label><input type="radio" name="internet_quality" value="not_verified" checked><span>Not verified</span></label>
                      </div>
                    </div>
                    <div class="pw-subfield-row" style="margin-top: 10px;">
                      <label class="pw-field pw-speed-input-label">
                        <span>Measured download speed <span class="pw-muted">(optional)</span></span>
                        <div class="pw-input-group" style="max-width: 180px;">
                          <input name="download_speed_mbps" type="number" min="0" max="10000" step="1" placeholder="e.g. 100">
                          <span>Mbps</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- CLUP / Land Use Tab -->
            <div id="pwEvidenceLanduse" class="pw-evidence-section" role="tabpanel" data-evidence-panel="landuse" hidden>
              <div class="pw-clup-header-row">
                <div>
                  <h4>CLUP / Allowed Land Uses</h4>
                  <p class="pw-small pw-muted">Identify which land uses are compatible with this parcel. Supports multi-select. Only city-validated uses appear as official investor search results.</p>
                </div>
                <span class="pw-badge pw-badge-amber">Pending city validation</span>
              </div>
              <div class="pw-chip-grid pw-clup-chip-grid">
                <?php foreach ($pwClupUses as $pwUse): ?>
                <label class="pw-chip pw-clup-chip" title="<?= $pwEscape($pwUse['description'] ?? '') ?>">
                  <input type="checkbox" name="clup_allowed_uses[]" value="<?= $pwEscape($pwUse['label']) ?>">
                  <span><?= $pwEscape($pwUse['label']) ?></span>
                </label>
                <?php endforeach; ?>
              </div>
              <div class="pw-fields" style="margin-top: 20px;">
                <label class="pw-field pw-full">Observed existing land use<input name="existing_land_use" maxlength="180" placeholder="e.g. Vacant lot, commercial, residential"></label>
                <label class="pw-field pw-full">Recorded zoning classification<input name="zoning_classification" maxlength="180" placeholder="Enter the classification from the zoning record"></label>
                <label class="pw-field pw-full">CLUP source or reference<input name="clup_source_reference" maxlength="500" placeholder="Document title, date, and reference"></label>
                <label class="pw-field pw-full">Environmental source or reference<input name="environmental_reference" maxlength="2000" placeholder="Classification, source document, and date"></label>
              </div>
            </div>

            <!-- Hazards Tab -->
            <div id="pwEvidenceHazards" class="pw-evidence-section" role="tabpanel" data-evidence-panel="hazards" hidden>
              <div class="pw-clup-header-row">
                <div>
                  <h4>Hazard &amp; Environmental Screening</h4>
                  <p class="pw-small pw-muted">Evaluated from official city spatial datasets using the property coordinates.</p>
                </div>
                <span class="pw-badge pw-badge-teal">City spatial dataset</span>
              </div>
              <div class="pw-hazard-cards-grid" data-hazard-panel-results>
                <div class="pw-hazard-card">
                  <span class="pw-hazard-stat-label">Flood susceptibility</span>
                  <div class="pw-hazard-badge-row"><span class="pw-pill" data-hazard-flood-pill>Not assessed</span></div>
                  <p class="pw-small pw-muted" data-hazard-flood-text>Property coordinates are screened against mapped MGB flood zones.</p>
                </div>
                <div class="pw-hazard-card">
                  <span class="pw-hazard-stat-label">Fault-line screening</span>
                  <div class="pw-hazard-badge-row"><span class="pw-pill" data-hazard-fault-pill>Not assessed</span></div>
                  <p class="pw-small pw-muted" data-hazard-fault-text>Screened against mapped PHIVOLCS active fault database.</p>
                </div>
                <div class="pw-hazard-card">
                  <span class="pw-hazard-stat-label">Environmental screening</span>
                  <div class="pw-hazard-badge-row"><span class="pw-pill" data-hazard-env-pill>Not assessed</span></div>
                  <p class="pw-small pw-muted" data-hazard-env-text>Evaluated against recorded environmental restrictions.</p>
                </div>
              </div>
              <p class="pw-small pw-muted" style="margin-top: 14px;">Assessment results are updated automatically when you place or move the location pin in Area &amp; location.</p>
            </div>

            <!-- Documents Tab -->
            <div id="pwEvidenceDocuments" class="pw-evidence-section" role="tabpanel" data-evidence-panel="documents" hidden>
              <div class="pw-authority-section" data-authority-block>
                <div class="pw-clup-header-row">
                  <div>
                    <h4>Authority to Sell <span class="pw-required-asterisk" style="color: #9E1B22;">*</span></h4>
                    <p class="pw-small pw-muted">Upload proof that you are authorized to market this property. Accepted: PDF, JPG, JPEG, PNG (max 15 MB).</p>
                  </div>
                  <span class="pw-badge pw-badge-amber" data-authority-badge>Pending city validation</span>
                </div>
                <label class="pw-photo-drop pw-authority-drop" data-authority-drop>
                  <input class="pw-file-input" name="authority_to_sell_file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" data-authority-file>
                  <span class="pw-photo-icon"><?= $pwIcon('document') ?></span>
                  <strong>Upload Authority to Sell</strong>
                  <span>Drag file here, or click to browse</span>
                  <small data-authority-filename>PDF, JPG, JPEG, or PNG &middot; Max 15 MB</small>
                </label>
                <div class="pw-authority-preview" data-authority-preview hidden>
                  <span class="pw-badge pw-badge-teal"><?= $pwIcon('check') ?> File staged</span>
                  <strong data-authority-staged-name></strong>
                  <span class="pw-muted">&middot; Status: Pending city validation</span>
                </div>
                <p class="pw-small pw-muted" style="margin-top: 8px;">Note: The listing will NOT be publicly published until the Authority to Sell is validated by city personnel.</p>
              </div>

              <div class="pw-evidence-reference" style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                <h4>Evidence attachment <span class="pw-muted">(optional)</span></h4>
                <p class="pw-small pw-muted">Attach property title, tax declaration, or site photos to support this listing.</p>
                <label class="pw-photo-drop pw-evidence-drop" data-evidence-drop><input class="pw-file-input" name="evidence_files[]" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" data-evidence-files><span class="pw-photo-icon"><?= $pwIcon('photo') ?></span><strong>Add evidence files</strong><span>Drag files here, or click to browse</span><small>JPG, PNG, WEBP or PDF · Up to 4 files · 5 MB each</small></label>
                <div class="pw-evidence-file-list" data-evidence-file-list></div>
                <button class="pw-text-button" type="button" data-clear-evidence hidden>Clear selected files</button>
                <details class="pw-disclosure" style="margin-top: 12px;"><summary><?= $pwIcon('document') ?><span>Source or document reference</span><?= $pwIcon('chevron') ?></summary><label class="pw-field">Reference<input name="evidence_reference" maxlength="2000" placeholder="Paste a link or enter a document reference"></label><p class="pw-small pw-muted">Include a source and date where available.</p></details>
              </div>
              <details class="pw-disclosure" style="margin-top: 12px;"><summary><?= $pwIcon('document') ?><span>Site observations <span class="pw-muted">(optional)</span></span><?= $pwIcon('chevron') ?></summary><label class="pw-field">Notes for the reviewing department<textarea name="readiness_notes" rows="3" maxlength="10000" placeholder="Add observed facts and note anything that still needs verification."></textarea></label></details>
              <details class="pw-disclosure pw-context-details" style="margin-top: 12px;"><summary><?= $pwIcon('tag') ?><span>Additional site context <span class="pw-muted">(optional)</span></span><?= $pwIcon('chevron') ?></summary><div class="pw-context-tags"><?php foreach (\App\Support\PropertyCatalog::contextTags() as $pwTag): ?><label><input type="checkbox" name="assessmentTags[]" value="<?= $pwEscape($pwTag) ?>"><span><?= $pwEscape(ucwords(strtolower($pwTag))) ?></span></label><?php endforeach; ?></div><div data-nearby-editor><div class="pw-label-row"><h4>Recorded nearby places</h4><button class="pw-button pw-button-light pw-button-small" type="button" data-add-nearby>+ Add place</button></div><p class="pw-small pw-muted">Add up to six known places. Radar results use available mapped establishments.</p><div class="pw-nearby-list" data-nearby-list></div></div></details>
            </div>

            <!-- Valuation Tab -->
            <div id="pwEvidenceValuation" class="pw-evidence-section" role="tabpanel" data-evidence-panel="valuation" hidden>
              <h4>BIR zonal reference</h4>
              <p class="pw-small pw-muted">Record the reference for this location and its effective date.</p>
              <div class="pw-fields">
                <label class="pw-field pw-full">Zonal value (PHP per m²)<input name="bir_zonal_value" type="number" min="0" step="0.01" placeholder="Enter the recorded value"></label>
                <label class="pw-field pw-full">Source or reference<input name="bir_source" maxlength="500" placeholder="BIR schedule, zone, and document reference"></label>
                <label class="pw-field">Reference date<input name="bir_date" type="date"></label>
              </div>
            </div>
          </article><aside class="pw-evidence-sidebar"><details class="pw-card pw-readiness-card pw-readiness-disclosure"><summary><span>Assessment checklist</span><?= $pwIcon('chevron') ?></summary><p class="pw-small pw-muted">See which evidence is ready for city assessment.</p><div data-assessment-readiness><?php foreach ($pwCriteria as $pwKey => $pwCriterion): ?><?php $pwReady = $pwReadiness[$pwKey]; ?><div class="pw-readiness-row" data-readiness-criterion="<?= $pwKey ?>"><?= $pwIcon($pwReady[0]) ?><div><strong><?= $pwEscape($pwCriterion) ?></strong><span data-readiness-message><?= $pwReady[1] ?></span></div><button type="button" class="pw-readiness-action<?= in_array($pwKey, ['spatial_accessibility', 'infrastructure_readiness'], true) ? ' needs-confirmation' : '' ?>" data-readiness-action="<?= $pwKey ?>"><?= $pwReady[2] ?></button></div><?php endforeach; ?></div></details><article class="pw-pending-card"><?= $pwIcon('chart') ?><div><h3 data-readiness-title>IAI not ready</h3><p data-readiness-summary>Complete the required evidence before calculating a final score.</p></div><button type="button" class="pw-text-button" data-view-assessment>View assessment criteria <?= $pwIcon('arrow') ?></button></article></aside>
        </div>
      </section>
      <section class="pw-panel" data-editor-panel="3" hidden>
        <div class="pw-radar-view"><label class="pw-map-style">Map view <select data-map-style="radar"><option value="streets">Street map</option><option value="satellite">Satellite</option></select></label></div>
        <p class="pw-map-feedback" data-map-feedback="radar" role="status" hidden></p>
        <article class="pw-card pw-surroundings-card"><div class="pw-card-heading"><span class="pw-eyebrow">OPTIONAL EXPLORATION</span><h3>Explore the surrounding area</h3><p>Use a location to explore nearby businesses, or skip this step and submit your listing.</p></div><div class="pw-surroundings-columns"><div class="pw-radar-left"><div class="pw-radar-controls"><label class="pw-field">Business type<select name="radar_business_type"><option value="cafe">Café &amp; bakery</option><option value="retail">Convenience retail</option><option value="office">Office</option><option value="hospitality">Hospitality</option><option value="industrial">Industrial</option></select></label><label class="pw-field">Reference point<select name="reference_label"><option value="location">Property location pin</option><option value="center">Parcel center</option><option value="entrance">Property entrance</option></select></label><label class="pw-toggle-field"><span>500 m radar</span><span class="pw-toggle"><input type="checkbox" checked data-radar-toggle><span class="pw-toggle-track"></span><span class="pw-toggle-label">On</span></span></label></div><div class="pw-map-shell pw-radar-shell"><div class="pw-map pw-radar-map" data-radar-map aria-label="Establishments and roads within a 500 meter straight-line radius"></div><button type="button" class="pw-place-reference" data-place-reference><?= $pwIcon('pin') ?> Place reference point</button><div class="pw-radar-badge" data-radar-badge hidden><span class="pw-pulse-dot"></span><span data-radar-badge-text>500 m radar active</span></div><div class="pw-radar-map-pills" role="toolbar" aria-label="Filter map layers"><button type="button" class="is-active" data-radar-map-filter="all">All</button><button type="button" data-radar-map-filter="competitors">Competitors</button><button type="button" data-radar-map-filter="complementary">Complementary</button><button type="button" data-radar-map-filter="roads">Roads</button></div><div class="pw-radar-legend"><span><i class="pw-dot pw-dot-red"></i>Competitor</span><span><i class="pw-dot pw-dot-teal"></i>Complementary place</span><span><i class="pw-dot pw-dot-slate"></i>Unclassified</span><span><i class="pw-legend-road"></i>Road</span><span><i class="pw-dot pw-dot-navy"></i>Reference point</span></div></div><p class="pw-radar-caption" data-radar-caption>500 m straight-line radius from the selected reference point.</p></div><aside class="pw-radar-results-card"><h4>Within 500 meters</h4><div class="pw-radar-counts"><div><?= $pwIcon('coffee') ?><strong data-radar-count="competitors">—</strong><span>Competitors</span></div><div><?= $pwIcon('store') ?><strong data-radar-count="complementary">—</strong><span>Complementary places</span></div><div><?= $pwIcon('road') ?><strong data-radar-count="roads">—</strong><span>Road segments</span></div></div><div class="pw-tabs pw-radar-tabs" role="tablist" aria-label="Nearby results"><button type="button" role="tab" aria-selected="true" class="is-active" data-radar-tab="competitors">Competitors</button><button type="button" role="tab" aria-selected="false" data-radar-tab="complementary">Complementary</button><button type="button" role="tab" aria-selected="false" data-radar-tab="roads">Roads</button></div><div class="pw-radar-search-shell"><input type="search" class="pw-radar-search" data-radar-search placeholder="Filter places or roads…" aria-label="Filter nearby places"><span class="pw-radar-filter-count" data-radar-filter-count></span></div><div class="pw-radar-results" data-radar-results><div class="pw-empty"><?= $pwIcon('pin') ?><strong>Choose a reference point</strong><p>Locate the entrance or use the parcel center to check nearby mapped places.</p></div></div><div class="pw-radar-notices" data-radar-notices><div class="pw-notice pw-notice-neutral"><?= $pwIcon('info') ?><div><strong>Review proximity in context</strong><p>Nearby places do not establish customer demand. Mapped roads do not confirm legal road access.</p></div></div></div><details class="pw-disclosure pw-coverage"><summary><?= $pwIcon('document') ?><span>Data sources &amp; coverage</span><?= $pwIcon('chevron') ?></summary><div class="pw-small pw-muted" data-radar-coverage>Mapped establishments and roads will show their available source information after the radar runs. Missing coverage is marked Not assessed.</div></details></aside></div></article>
      </section>
      <section class="pw-panel" data-editor-panel="4" hidden>
        <div class="pw-section-intro"><h3>Ready when you are</h3><p>Check the essentials below, then send the listing for city review.</p></div>
        <div class="pw-card pw-submission-summary" data-review-summary></div>
        <p class="pw-review-note">Your listing can be submitted while evidence and scores are pending. CICTO reviews the property before publication.</p>
        <div class="pw-tabs pw-review-tabs" role="tablist" aria-label="Review view"><button type="button" role="tab" aria-selected="true" class="is-active" data-review-tab="assessment">City assessment &amp; IAI scores</button><button type="button" role="tab" aria-selected="false" data-review-tab="investor">Investor preview</button></div>
        <div data-review-panel="assessment"><article class="pw-card" data-automatic-assessment><div class="pw-review-heading"><div class="pw-card-heading"><h3>City assessment &amp; IAI scores</h3><p>MCE (Multi-Criteria Evaluation) and IAI (Investment Alignment Index) are calculated from verified city evidence.</p></div><span class="pw-badge"><?= $pwIcon('document') ?> Official evidence</span></div><div class="pw-live-scores pw-live-scores-top" data-live-scores><div><span>MCE Score (Physical Suitability)</span><strong data-total-mce>—</strong><small>/ 100</small></div><div><span>IAI Score (Investment Alignment)</span><strong data-total-iai>—</strong><small>/ 100</small></div><p data-computed-summary>Scores remain pending until all required evidence is available.</p></div><p class="pw-notice pw-notice-amber" data-legacy-assessment hidden>This listing has an earlier manual assessment. Saving calculates a new automatic assessment and retains the earlier result in its history.</p><div class="pw-assessment-status"><p class="pw-small pw-muted" data-assessment-status role="status">Add a property location to check verified source data.</p><button type="button" class="pw-button pw-button-light pw-button-small" data-recalculate-assessment><?= $pwIcon('reset') ?> Recalculate</button></div><div class="pw-assessment-criteria"><?php foreach ($pwCriteria as $pwKey => $pwCriterion): ?><article class="pw-criterion" data-assessment-criterion="<?= $pwKey ?>"><div class="pw-criterion-heading"><h4><?= $pwEscape($pwCriterion) ?></h4><span><?= \App\Support\PropertyAssessment::WEIGHTS[$pwKey] ?>% of MCE</span><strong data-score-value>Awaiting data</strong></div><div class="pw-criterion-bar" role="progressbar" aria-label="<?= $pwEscape($pwCriterion) ?>" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Awaiting source data"><span></span></div><details class="pw-criterion-evidence"><summary>Evidence &amp; calculation <?= $pwIcon('chevron') ?></summary><p data-score-justification>Add the property location to check available source evidence.</p><p class="pw-small pw-muted" data-score-rule hidden></p><p class="pw-small pw-muted" data-score-evidence hidden></p></details></article><?php endforeach; ?></div><details class="pw-disclosure" data-spatial-context hidden><summary><?= $pwIcon('pin') ?><span>Location evidence</span><?= $pwIcon('chevron') ?></summary><dl></dl></details><details class="pw-disclosure"><summary><?= $pwIcon('document') ?><span>How scores are calculated</span><?= $pwIcon('chevron') ?></summary><p class="pw-small pw-muted" data-assessment-method>Scores depend on approved source conversion rules and the seven displayed criterion weights.</p></details></article></div>
        <div data-review-panel="investor" hidden><article class="pw-card pw-investor-card"><div class="pw-review-heading"><div class="pw-card-heading"><h3>Which business fits this property?</h3><p>Compare the modeled fit and see the evidence behind each result.</p></div><div class="pw-review-property" data-review-property><strong>Your new property</strong><span>Business matches await approved scoring profiles</span></div></div><div class="pw-business-matches" data-business-matches><div class="pw-match-placeholder"><?= $pwIcon('coffee') ?><div><strong>Café &amp; bakery</strong><span>Awaiting approved profile</span></div></div><div class="pw-match-placeholder"><?= $pwIcon('store') ?><div><strong>Convenience retail</strong><span>Awaiting approved profile</span></div></div><div class="pw-match-placeholder"><?= $pwIcon('office') ?><div><strong>Office</strong><span>Awaiting approved profile</span></div></div></div><div class="pw-review-columns"><section class="pw-review-breakdown" data-match-breakdown><div class="pw-label-row"><h4>Business fit: score breakdown</h4><span class="pw-small pw-muted">Seven weighted criteria</span></div><p class="pw-small pw-muted">Business-specific scores appear once approved rules and the required evidence are available.</p><div class="pw-score-table"><div class="pw-score-table-head"><span>Criteria</span><span>Rating</span><span>Weight</span></div><?php foreach ($pwCriteria as $pwKey => $pwCriterion): ?><div class="pw-score-table-row"><span><?= $pwEscape($pwCriterion) ?></span><div class="pw-score-placeholder"><span></span><strong>—</strong></div><span><?= \App\Support\PropertyAssessment::WEIGHTS[$pwKey] ?>%</span></div><?php endforeach; ?></div><div class="pw-weighted-total"><div><strong>Weighted business score</strong><span>Pending approved business-specific scoring</span></div><strong>— <small>/ 100</small></strong></div></section><section class="pw-review-reasons" data-match-reasons><h4>What is needed for a match</h4><ol class="pw-reason-list"><li><span>1</span><div><strong>Confirm the assessment evidence.</strong><p>Check road access, utilities, valuation, land use, and available hazard findings.</p></div></li><li><span>2</span><div><strong>Apply an approved business profile.</strong><p>Eligibility and scoring rules must reflect the selected business type.</p></div></li></ol><h4 class="pw-concerns-heading"><?= $pwIcon('warning') ?> What still needs checking</h4><div class="pw-notice pw-notice-amber"><div><strong>Business ranking is not available yet</strong><p>The seven criteria and their displayed weights are retained. A top-three ranking requires approved business-specific scoring rules.</p></div></div><div class="pw-notice pw-notice-neutral"><?= $pwIcon('document') ?><div><strong>Validate demand and permitted use</strong><p>Review customer demand and land-use compatibility before an investment decision.</p></div></div></section></div><div class="pw-review-footnote"><?= $pwIcon('info') ?> Scores compare suitability under the selected method; they do not predict business success.</div></article></div>
      </section>
      <p class="pw-form-message" data-editor-message role="status"></p>
    </div>
    <footer class="pw-footer"><span class="pw-progress" data-editor-progress>Step 1 of 5</span><div class="pw-footer-actions"><button type="button" class="pw-text-button pw-skip" data-skip-enrichment hidden>Skip optional details</button><button type="button" class="pw-button pw-button-light" data-editor-back disabled>Back</button><button type="button" class="pw-button pw-button-primary" data-editor-next><span data-editor-next-label>Continue</span><?= $pwIcon('arrow') ?></button><button type="submit" class="pw-button pw-button-primary" hidden><span>Submit listing</span><?= $pwIcon('arrow') ?></button></div></footer>
  </form>
</dialog>
<?php unset($pwEscape, $pwIcon, $pwCriteria, $pwReadiness); ?>
