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
        'water' => '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
        'wifi' => '<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
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
        <div class="pw-header-actions">
          <span class="pw-device-draft-status" data-device-draft-status><svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg> <span data-device-draft-text>Saved on this device</span></span>
          <button class="pw-button pw-button-light pw-button-small" type="button" data-save-exit title="Save this draft on this device"><?= $pwIcon('save') ?> Save &amp; exit</button>
          <button class="pw-close" type="button" data-close-dialog aria-label="Close property editor"><?= $pwIcon('close') ?></button>
        </div>
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
            <div class="pw-card-heading">
              <h3>Start with the essentials</h3>
              <p>Add the details investors need first.</p>
            </div>
            <div class="pw-fields">
              <label class="pw-field pw-full">
                <span class="pw-field-label">Property name</span>
                <input name="property_name" required maxlength="180" placeholder="e.g. Sevilla SFC" autocomplete="off">
              </label>

              <label class="pw-field">
                <span class="pw-label-inline">Property type <span class="pw-info-icon" title="<?= $pwEscape(\App\Support\PropertyCatalog::categoryTooltips()['Vacant Land']) ?>" data-category-tip-icon><?= $pwIcon('info') ?></span></span>
                <select name="category" required data-property-category-select>
                  <?php foreach (\App\Support\PropertyCatalog::categories() as $pwCategory => $pwSubcategories): $pwTip = \App\Support\PropertyCatalog::categoryTooltips()[$pwCategory] ?? ''; ?>
                  <option value="<?= $pwEscape($pwCategory) ?>" data-tooltip="<?= $pwEscape($pwTip) ?>"<?= $pwCategory === 'Vacant Land' ? ' selected' : '' ?>><?= $pwEscape($pwCategory) ?></option>
                  <?php endforeach; ?>
                </select>
                <small class="pw-category-tooltip-note pw-muted" data-category-tip-text><?= $pwEscape(\App\Support\PropertyCatalog::categoryTooltips()['Vacant Land']) ?></small>
              </label>

              <label class="pw-field">
                <span class="pw-field-label">Availability status</span>
                <select name="status">
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Sold">Sold</option>
                  <option value="Leased">Leased</option>
                  <option value="Availed" hidden disabled>Availed (historical)</option>
                </select>
              </label>

              <fieldset class="pw-field pw-full pw-purpose-fieldset">
                <legend class="pw-field-label">Listing purpose</legend>
                <div class="pw-purpose-radios-row" role="radiogroup" aria-label="Listing purpose">
                  <label class="pw-radio-card" data-purpose-card="sale">
                    <input type="radio" name="listing_purpose" value="sale" checked>
                    <span class="pw-radio-custom" aria-hidden="true"></span>
                    <span class="pw-radio-label">For sale</span>
                  </label>
                  <label class="pw-radio-card" data-purpose-card="lease">
                    <input type="radio" name="listing_purpose" value="lease">
                    <span class="pw-radio-custom" aria-hidden="true"></span>
                    <span class="pw-radio-label">For lease</span>
                  </label>
                  <label class="pw-radio-card" data-purpose-card="sale_or_lease">
                    <input type="radio" name="listing_purpose" value="sale_or_lease">
                    <span class="pw-radio-custom" aria-hidden="true"></span>
                    <span class="pw-radio-label">Sale or lease</span>
                  </label>
                </div>
              </fieldset>

              <!-- Sale asking price (shown when For sale or Sale or lease) -->
              <div class="pw-field pw-full pw-pricing-block" data-sale-price-fields>
                <span class="pw-field-label">Sale asking price</span>
                <div class="pw-price-mode-row" role="radiogroup" aria-label="Sale asking price mode">
                  <label class="pw-price-mode-card is-active" data-sale-mode-card="amount">
                    <input type="radio" name="sale_price_mode" value="amount" checked>
                    <span class="pw-radio-custom" aria-hidden="true"></span>
                    <div class="pw-price-mode-content">
                      <strong class="pw-price-mode-title">Enter a price</strong>
                      <span class="pw-price-mode-sub">Enter the total asking price in PHP.</span>
                    </div>
                  </label>
                  <label class="pw-price-mode-card" data-sale-mode-card="request">
                    <input type="radio" name="sale_price_mode" value="request">
                    <span class="pw-radio-custom" aria-hidden="true"></span>
                    <div class="pw-price-mode-content">
                      <strong class="pw-price-mode-title">Price on request</strong>
                    </div>
                  </label>
                </div>

                <div class="pw-price-input-row" data-sale-price-input-wrap>
                  <div class="pw-input-group">
                    <span>PHP</span>
                    <input id="pwAskingPrice" name="price" type="text" inputmode="numeric" maxlength="25" title="Enter a positive amount in whole PHP pesos." placeholder="e.g. 21,776,000" autocomplete="off" data-price-input>
                  </div>
                </div>

                <div class="pw-notice pw-notice-amber" data-legacy-zero-sale-notice hidden>
                  <?= $pwIcon('warning') ?>
                  <div>
                    <strong>Ambiguous legacy asking price: PHP 0</strong>
                    <p>Confirm whether this listing is Price on request or enter a positive amount.</p>
                  </div>
                </div>
                <small class="pw-price-note pw-muted">Your asking price is separate from valuation references.</small>
              </div>

              <!-- Lease asking price (shown when For lease or Sale or lease) -->
              <div class="pw-field pw-full pw-pricing-block" data-lease-price-fields hidden>
                <span class="pw-field-label">Lease asking price</span>
                <div class="pw-price-mode-row" role="radiogroup" aria-label="Lease asking price mode">
                  <label class="pw-price-mode-card is-active" data-lease-mode-card="amount">
                    <input type="radio" name="lease_price_mode" value="amount" checked>
                    <span class="pw-radio-custom" aria-hidden="true"></span>
                    <div class="pw-price-mode-content">
                      <strong class="pw-price-mode-title">Enter a price</strong>
                      <span class="pw-price-mode-sub">Enter the rental asking price in PHP.</span>
                    </div>
                  </label>
                  <label class="pw-price-mode-card" data-lease-mode-card="request">
                    <input type="radio" name="lease_price_mode" value="request">
                    <span class="pw-radio-custom" aria-hidden="true"></span>
                    <div class="pw-price-mode-content">
                      <strong class="pw-price-mode-title">Price on request</strong>
                    </div>
                  </label>
                </div>

                <div class="pw-price-input-row" data-lease-price-input-wrap>
                  <div class="pw-input-group">
                    <span>PHP</span>
                    <input id="pwLeasePrice" name="lease_price" type="text" inputmode="numeric" maxlength="25" title="Enter a positive amount in whole PHP pesos." placeholder="e.g. 50,000" autocomplete="off" data-price-input>
                  </div>
                </div>

                <div class="pw-lease-options-grid">
                  <label class="pw-field">
                    <span>Billing period</span>
                    <select name="lease_period">
                      <option value="month">Per month</option>
                      <option value="year">Per year</option>
                      <option value="day">Per day</option>
                    </select>
                  </label>
                  <label class="pw-field">
                    <span>Rental pricing unit</span>
                    <select name="lease_price_unit">
                      <option value="total">Total property rent</option>
                      <option value="sqm">Per square metre (m&sup2;)</option>
                    </select>
                  </label>
                </div>

                <div class="pw-notice pw-notice-amber" data-legacy-zero-lease-notice hidden>
                  <?= $pwIcon('warning') ?>
                  <div>
                    <strong>Ambiguous legacy rental price: PHP 0</strong>
                    <p>Confirm whether this listing is Price on request or enter a positive amount.</p>
                  </div>
                </div>
                <small class="pw-price-note pw-muted">Your asking price is separate from valuation references.</small>
              </div>

              <!-- Property photo • optional -->
              <div class="pw-field pw-full pw-photo-section">
                <span class="pw-field-label">Property photo <span class="pw-muted">&middot; optional</span></span>
                <input type="hidden" name="remove_image" value="0" data-remove-image>

                <!-- Active Photo Thumbnail Box (shown when photo exists) -->
                <div class="pw-photo-active-box" data-photo-active-box hidden>
                  <div class="pw-photo-thumb-wrap">
                    <img class="pw-photo-thumb" data-photo-thumb src="" alt="Property photo thumbnail">
                  </div>
                  <div class="pw-photo-actions">
                    <div class="pw-photo-actions-buttons">
                      <span class="pw-photo-badge-icon" aria-hidden="true"><?= $pwIcon('camera') ?></span>
                      <button type="button" class="pw-button pw-button-light pw-button-small" data-photo-replace>Replace</button>
                      <button type="button" class="pw-button pw-button-small pw-button-danger-outline" data-photo-remove><?= $pwIcon('close') ?> Remove</button>
                    </div>
                    <p class="pw-photo-active-caption">JPG, PNG or WEBP. Photos are optional.</p>
                    <div class="pw-badge pw-badge-amber" data-photo-removal-badge hidden>Photo marked for removal &middot; Saved upon submitting</div>
                  </div>
                </div>

                <!-- Empty Photo Dropzone State -->
                <label class="pw-photo-drop" for="property_image_file" data-photo-drop tabindex="0">
                  <input class="pw-file-input" id="property_image_file" name="image_file" type="file" accept="image/jpeg,image/png,image/webp" data-photo-file>
                  <span class="pw-photo-icon"><?= $pwIcon('camera') ?></span>
                  <strong>Add a property photo</strong>
                  <span>Drag an image here, or click to browse</span>
                  <small data-photo-file-name>JPG, PNG or WEBP. Photos are optional.</small>
                </label>
                <p class="pw-photo-feedback" data-photo-feedback role="status" hidden></p>
              </div>
            </div>

            <!-- Description & contact details — Optional -->
            <details class="pw-disclosure pw-details" data-description-disclosure>
              <summary><?= $pwIcon('text') ?><span>Description &amp; contact details &mdash; Optional</span><?= $pwIcon('chevron') ?></summary>
              <div class="pw-fields">
                <label class="pw-field pw-full">Description<textarea name="description" rows="3" maxlength="3000" placeholder="Describe the property, its current use, and any useful context."></textarea></label>
                <div class="pw-field pw-full" data-subcategory-wrapper>
                  <div class="pw-label-row"><span>Property subcategories</span><span class="pw-muted" data-subcategory-count>Multi-select</span></div>
                  <div class="pw-select-wrapper">
                    <button type="button" class="pw-select-trigger" data-subcategory-trigger aria-expanded="false" aria-haspopup="true">
                      <span data-subcategory-trigger-text>Select subcategories...</span>
                      <svg class="pw-icon" data-subcategory-caret viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    <div class="pw-subcategory-popover tw-hidden" data-subcategory-popover>
                      <div class="pw-label-row"><strong>Available tags</strong><div><button type="button" class="pw-text-button" data-subcategory-select-all>Select all</button><button type="button" class="pw-text-button" data-subcategory-clear-all>Clear</button></div></div>
                      <div class="pw-subcategory-grid" data-subcategory-grid></div>
                    </div>
                  </div>
                  <div class="pw-subcategory-tags" data-subcategory-tags></div>
                  <input type="hidden" name="subcategory" data-subcategory-input>
                </div>
                <label class="pw-field pw-full">Contact route<select name="contactBrokerUserId"><option value="">Open listing &middot; city contact</option></select></label>
                <label class="pw-field">Contact name<input name="owner_name" maxlength="150" autocomplete="name"></label>
                <label class="pw-field">Phone<input name="owner_phone" type="tel" maxlength="40" autocomplete="tel"></label>
                <label class="pw-field pw-full">Email<input name="owner_email" type="email" maxlength="190" autocomplete="email"></label>
              </div>
            </details>
          </article>

          <!-- Listing Preview Aside (Collapsible on Mobile, Live on Desktop) -->
          <details class="pw-card pw-preview-card pw-preview-card-collapsible" data-preview-disclosure open>
            <summary class="pw-preview-summary-toggle">
              <div class="pw-preview-summary-left">
                <?= $pwIcon('photo') ?>
                <span>Preview listing</span>
              </div>
              <span class="pw-preview-summary-status" data-preview-toggle-meta>Draft &middot; Not published</span>
              <?= $pwIcon('chevron') ?>
            </summary>
            <div class="pw-preview-inner">
              <div class="pw-label-row pw-preview-header-row">
                <h3>Listing preview</h3>
                <span class="pw-badge pw-badge-amber" data-preview-approval-state>&bull; <span>Draft &middot; Not published</span></span>
              </div>
              <div class="pw-preview-photo" data-photo-preview>
                <div><?= $pwIcon('photo') ?><span>Your photo will appear here</span></div>
              </div>
              <h4 class="pw-preview-name" data-preview-name>Your new property</h4>
              <div class="pw-badges">
                <span class="pw-badge" data-preview-category><?= $pwIcon('tag') ?><span>Vacant land</span></span>
                <span class="pw-badge pw-badge-teal" data-preview-status>&bull; <span>Available</span></span>
              </div>
              <div class="pw-preview-pricing-block">
                <span class="pw-preview-purpose-label" data-preview-purpose>For sale</span>
                <strong class="pw-preview-price-headline" data-preview-price>Price on request</strong>
              </div>
              <div class="pw-preview-area-row">
                <span class="pw-feature-icon"><?= $pwIcon('area') ?></span>
                <div class="pw-preview-area-text">
                  <strong data-preview-area-val>&mdash;</strong>
                  <span class="pw-preview-area-caption">Mapped estimate</span>
                </div>
              </div>
              <div class="pw-preview-footnote">
                <?= $pwIcon('info') ?>
                <p>This preview updates as you edit.</p>
              </div>
            </div>
          </details>
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
        <!-- Site Evidence 7-Criterion Workspace -->
        <div class="pw-evidence-workspace">
          <!-- Step Heading -->
          <div class="pw-evidence-header-block">
            <span class="pw-eyebrow">STEP 3 · SITE EVIDENCE</span>
            <h3 class="pw-evidence-main-title">Tell us about the site</h3>
            <p class="pw-evidence-subtitle">Add what you know. Supporting records help reviewers check your information across the seven criteria.</p>
          </div>

          <!-- Criterion Navigation: Desktop Tabs + Mobile Accessible Select -->
          <div class="pw-criteria-nav-bar">
            <!-- Mobile Criterion Selector -->
            <div class="pw-criteria-mobile-picker">
              <label for="pwCriteriaMobileSelect" class="pw-sr-only">Choose assessment criterion</label>
              <select id="pwCriteriaMobileSelect" class="pw-criteria-select-mobile" data-criteria-mobile-select>
                <option value="spatial_accessibility">1. Spatial accessibility</option>
                <option value="infrastructure_readiness" selected>2. Infrastructure readiness</option>
                <option value="economic_viability">3. Economic viability</option>
                <option value="nearby_businesses">4. Nearby businesses</option>
                <option value="zoning_compatibility">5. Zoning compatibility (CLUP)</option>
                <option value="risk_constraints">6. Risk constraints</option>
                <option value="environmental_safety">7. Environmental safety</option>
              </select>
            </div>

            <!-- Desktop Horizontal Criteria Tablist -->
            <div class="pw-tabs pw-criteria-tabs" role="tablist" aria-label="Assessment criteria">
              <button class="pw-criterion-tab is-active" type="button" role="tab" aria-selected="true" aria-controls="pwCriterionSpatial" data-evidence-tab="spatial_accessibility">
                <span class="pw-crit-num">1</span> Spatial accessibility
              </button>
              <button class="pw-criterion-tab" type="button" role="tab" aria-selected="false" aria-controls="pwCriterionInfrastructure" data-evidence-tab="infrastructure_readiness">
                <span class="pw-crit-num">2</span> Infrastructure readiness
              </button>
              <button class="pw-criterion-tab" type="button" role="tab" aria-selected="false" aria-controls="pwCriterionEconomic" data-evidence-tab="economic_viability">
                <span class="pw-crit-num">3</span> Economic viability
              </button>
              <button class="pw-criterion-tab" type="button" role="tab" aria-selected="false" aria-controls="pwCriterionNearby" data-evidence-tab="nearby_businesses">
                <span class="pw-crit-num">4</span> Nearby businesses
              </button>
              <button class="pw-criterion-tab" type="button" role="tab" aria-selected="false" aria-controls="pwCriterionZoning" data-evidence-tab="zoning_compatibility">
                <span class="pw-crit-num">5</span> Zoning compatibility
              </button>
              <button class="pw-criterion-tab" type="button" role="tab" aria-selected="false" aria-controls="pwCriterionRisks" data-evidence-tab="risk_constraints">
                <span class="pw-crit-num">6</span> Risk constraints
              </button>
              <button class="pw-criterion-tab" type="button" role="tab" aria-selected="false" aria-controls="pwCriterionEnvironmental" data-evidence-tab="environmental_safety">
                <span class="pw-crit-num">7</span> Environmental safety
              </button>
            </div>
          </div>

          <!-- 1. SPATIAL ACCESSIBILITY PANE -->
          <div id="pwCriterionSpatial" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="spatial_accessibility">
            <div class="pw-criterion-layout">
              <div class="pw-criterion-main">
                <div class="pw-criterion-title-row">
                  <div>
                    <h4>Spatial accessibility</h4>
                    <p class="pw-small pw-muted">Frontage presence, access road dimensions, and physical connectivity.</p>
                  </div>
                  <span class="pw-badge pw-badge-weight">20% of MCE</span>
                </div>

                <!-- Reused Location Context -->
                <div class="pw-reused-banner" data-spatial-reused-banner>
                  <span class="pw-reused-icon"><?= $pwIcon('pin') ?></span>
                  <div>
                    <span class="pw-reused-label">Reused location data from Step 2</span>
                    <p class="pw-reused-details">Coordinates: <strong data-reused-coords>16.6150° N, 120.3160° E</strong> &middot; Barangay: <strong data-reused-barangay>San Fernando</strong> &middot; Recorded area: <strong data-reused-area>2,500 m²</strong></p>
                  </div>
                </div>

                <!-- Reported Property Facts -->
                <div class="pw-evidence-card-box">
                  <h5>Reported frontage &amp; access conditions</h5>
                  <div class="pw-road-fields">
                    <fieldset class="pw-choice-field">
                      <legend>Road frontage</legend>
                      <div class="pw-options">
                        <label><input type="radio" name="road_frontage" value="yes"><span><?= $pwIcon('check') ?> Yes</span></label>
                        <label><input type="radio" name="road_frontage" value="no"><span>No</span></label>
                        <label><input type="radio" name="road_frontage" value="not_verified" checked><span>Unknown / Not verified</span></label>
                      </div>
                    </fieldset>
                    <label class="pw-field">Road surface
                      <select name="road_surface">
                        <option value="not_verified" selected>Unknown / Not verified</option>
                        <option value="paved">Paved (concrete / asphalt)</option>
                        <option value="gravel">Gravel / all-weather</option>
                        <option value="unpaved">Unpaved / dirt track</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  </div>
                  <div class="pw-fields" style="margin-top: 12px;">
                    <label class="pw-field pw-full">Access route &amp; carriageway condition
                      <input name="access_route_condition" maxlength="250" placeholder="e.g. 2-lane concrete barangay road, 6m width, direct access">
                    </label>
                    <label class="pw-field pw-full">Distance to major commercial arterial / national highway
                      <input name="distance_to_highway" maxlength="150" placeholder="e.g. 150 meters to MacArthur Highway / Manila North Road">
                    </label>
                  </div>
                </div>

                <!-- Supporting Evidence Source Block -->
                <div class="pw-supporting-evidence-box">
                  <div class="pw-evidence-box-header">
                    <h5>Supporting evidence</h5>
                    <span class="pw-info-icon" title="Your selection is a declaration until reviewed."><?= $pwIcon('info') ?></span>
                  </div>
                  <p class="pw-small pw-muted">Your selection is a declaration until reviewed. Provide the verifiable source or inspection record.</p>
                  
                  <div class="pw-source-fields-grid">
                    <label class="pw-field">Source / issuer
                      <input name="spatial_evidence_source" maxlength="250" placeholder="e.g. City Engineer's Office, DPWH, Licensed surveyor">
                    </label>
                    <label class="pw-field">Document / observation date
                      <input name="spatial_evidence_date" type="date">
                    </label>
                    <label class="pw-field pw-full">Document reference or URL
                      <input name="spatial_evidence_reference" maxlength="500" placeholder="e.g. Cadastral Survey Lot 1234, Inspection Report #2026-04, or URL">
                    </label>
                  </div>
                </div>
              </div>

              <!-- Sidebar: Contextual Helper -->
              <aside class="pw-criterion-aside">
                <div class="pw-helper-card">
                  <div class="pw-helper-header">
                    <span class="pw-helper-icon"><?= $pwIcon('info') ?></span>
                    <h4>What counts as evidence?</h4>
                  </div>
                  <p class="pw-helper-text">Upload or link to records that confirm actual road frontage and legal access:</p>
                  <ul class="pw-helper-list">
                    <li><strong>Cadastral survey plan</strong><br>An approved subdivision or lot survey showing right-of-way and frontage width.</li>
                    <li><strong>City Engineer site inspection</strong><br>A dated inspection report from the City Engineer confirming pavement condition and roadway.</li>
                    <li><strong>Geotagged site photo</strong><br>Ground photos showing the property boundary connected to the named public road.</li>
                  </ul>
                </div>
                <div class="pw-status-pill-card">
                  <div class="pw-status-pill-header">
                    <span class="pw-status-clock-icon">&#9679;</span>
                    <strong>Not yet reviewed</strong>
                  </div>
                  <p class="pw-status-pill-desc">Evidence will be assessed by city staff during the review process.</p>
                </div>
              </aside>
            </div>
          </div>

          <!-- 2. INFRASTRUCTURE READINESS PANE (Mockup 2 Layout) -->
          <div id="pwCriterionInfrastructure" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="infrastructure_readiness" hidden>
            <div class="pw-criterion-layout">
              <div class="pw-criterion-main">
                <div class="pw-criterion-title-row">
                  <div>
                    <h4>Infrastructure readiness</h4>
                    <p class="pw-small pw-muted">Provide details on available services and connections at the site.</p>
                  </div>
                  <span class="pw-badge pw-badge-weight">20% of MCE</span>
                </div>

                <!-- Electricity / Water / Internet Tabs (Mockup 2) -->
                <div class="pw-utility-tabs-bar" role="tablist" aria-label="Utility services">
                  <button type="button" class="pw-utility-tab is-active" role="tab" aria-selected="true" data-util-tab="electricity">
                    <span class="pw-util-icon-bolt">&#9889;</span> Electricity
                  </button>
                  <button type="button" class="pw-utility-tab" role="tab" aria-selected="false" data-util-tab="water">
                    <span class="pw-util-icon-drop">&#128167;</span> Water
                  </button>
                  <button type="button" class="pw-utility-tab" role="tab" aria-selected="false" data-util-tab="internet">
                    <span class="pw-util-icon-wifi">&#128246;</span> Internet
                  </button>
                </div>

                <!-- ELECTRICITY SECTION -->
                <div class="pw-util-section-pane" data-util-pane="electricity">
                  <div class="pw-utility-card-block">
                    <h5>What is the connection status?</h5>
                    <div class="pw-status-radios-row">
                      <label class="pw-status-radio-pill">
                        <input type="radio" name="electricity" value="available" data-utility-radio="electricity">
                        <span>Connected</span>
                      </label>
                      <label class="pw-status-radio-pill">
                        <input type="radio" name="electricity" value="unavailable" data-utility-radio="electricity">
                        <span>Not connected</span>
                      </label>
                      <label class="pw-status-radio-pill">
                        <input type="radio" name="electricity" value="not_verified" data-utility-radio="electricity" checked>
                        <span>Unknown</span>
                      </label>
                    </div>

                    <!-- Conditional Electricity Details -->
                    <div class="pw-utility-reveal" data-utility-reveal="electricity" hidden style="margin-top: 16px;">
                      <div class="pw-fields-two-col">
                        <label class="pw-field">Primary supply
                          <select name="electricity_primary_supply">
                            <option value="">Select supply type</option>
                            <option value="Grid connection" selected>Grid connection</option>
                            <option value="Solar / on-site renewable energy">Solar / on-site renewable energy</option>
                            <option value="Off-grid generator">Off-grid generator</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                        <label class="pw-field">Provider
                          <select name="electricity_provider">
                            <option value="">Select provider</option>
                            <option value="LUECO (La Union Electric Company)">LUECO (La Union Electric Company)</option>
                            <option value="Direct NGCP feeder">Direct NGCP feeder</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                      </div>
                      <div class="pw-fields-two-col" style="margin-top: 10px;">
                        <label class="pw-field">Backup supply <span class="pw-muted">(optional)</span>
                          <select name="electricity_backup">
                            <option value="None reported" selected>None reported</option>
                            <option value="Standby generator">Standby generator</option>
                            <option value="Solar PV backup">Solar PV backup</option>
                            <option value="Battery Energy Storage (BESS)">Battery Energy Storage (BESS)</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                        <label class="pw-field">Capacity, if known
                          <input name="electricity_capacity" placeholder="Value + unit (e.g. 50 kVA, 3-phase)">
                        </label>
                      </div>
                      <div style="margin-top: 12px;">
                        <span class="pw-small pw-disclosure-heading">Provider / Source <span class="pw-muted">(check all that apply)</span>:</span>
                        <div class="pw-chip-grid" style="margin-top: 6px;">
                          <label class="pw-chip"><input type="checkbox" name="electricity_sources[]" value="LUECO"><span>LUECO</span></label>
                          <label class="pw-chip"><input type="checkbox" name="electricity_sources[]" value="Solar / on-site renewable energy"><span>Solar / renewable</span></label>
                          <label class="pw-chip"><input type="checkbox" name="electricity_sources[]" value="Backup generator"><span>Backup generator</span></label>
                          <label class="pw-chip"><input type="checkbox" name="electricity_sources[]" value="Other"><span>Other</span></label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Supporting Evidence for Electricity (Mockup 2) -->
                  <div class="pw-supporting-evidence-box" style="margin-top: 16px;">
                    <div class="pw-evidence-box-header">
                      <h5>Supporting evidence</h5>
                      <span class="pw-info-icon" title="Your selection is a declaration until reviewed."><?= $pwIcon('info') ?></span>
                    </div>
                    <p class="pw-small pw-muted">Your selection is a declaration until reviewed.</p>

                    <!-- Dashed Upload Dropzone -->
                    <label class="pw-photo-drop pw-evidence-drop" data-evidence-drop>
                      <input class="pw-file-input" name="evidence_files[]" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" data-evidence-files>
                      <span class="pw-photo-icon"><?= $pwIcon('document') ?></span>
                      <strong>Add file or source link</strong>
                      <span>Drag and drop a file, or click to browse</span>
                      <small>Service confirmation, redacted utility record, or dated inspection report.</small>
                    </label>
                    <div class="pw-evidence-file-list" data-evidence-file-list></div>
                    <button class="pw-text-button" type="button" data-clear-evidence hidden>Clear selected files</button>

                    <div class="pw-source-fields-grid" style="margin-top: 12px;">
                      <label class="pw-field">Source / issuer
                        <input name="utility_evidence_source" maxlength="250" placeholder="e.g. LUECO, City department, consultant">
                      </label>
                      <label class="pw-field">Document date
                        <input name="utility_evidence_date" type="date">
                      </label>
                      <label class="pw-field pw-full">Reference
                        <input name="utility_evidence_reference" maxlength="500" placeholder="e.g. account number, report ID, or URL">
                      </label>
                    </div>
                  </div>
                </div>

                <!-- WATER SECTION -->
                <div class="pw-util-section-pane" data-util-pane="water" hidden>
                  <div class="pw-utility-card-block">
                    <h5>What is the connection status?</h5>
                    <div class="pw-status-radios-row">
                      <label class="pw-status-radio-pill">
                        <input type="radio" name="water" value="available" data-utility-radio="water">
                        <span>Connected</span>
                      </label>
                      <label class="pw-status-radio-pill">
                        <input type="radio" name="water" value="unavailable" data-utility-radio="water">
                        <span>Not connected</span>
                      </label>
                      <label class="pw-status-radio-pill">
                        <input type="radio" name="water" value="not_verified" data-utility-radio="water" checked>
                        <span>Unknown</span>
                      </label>
                    </div>

                    <!-- Conditional Water Details -->
                    <div class="pw-utility-reveal" data-utility-reveal="water" hidden style="margin-top: 16px;">
                      <div class="pw-fields-two-col">
                        <label class="pw-field">Supply source
                          <select name="water_source">
                            <option value="">Select supply source</option>
                            <option value="Metro La Union Water District / local water district">Metro La Union Water District (MLUWD)</option>
                            <option value="Barangay / community water system">Barangay / community water system</option>
                            <option value="Deep well / groundwater">Deep well / groundwater</option>
                            <option value="Water delivery / storage">Water delivery / storage</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                        <label class="pw-field">Provider / Operator
                          <input name="water_provider" placeholder="e.g. MLUWD or local waterworks">
                        </label>
                      </div>
                      <div class="pw-fields-two-col" style="margin-top: 10px;">
                        <label class="pw-field">Supply reliability / capacity
                          <select name="water_capacity">
                            <option value="24/7 continuous supply">24/7 continuous supply</option>
                            <option value="Scheduled / intermittent supply">Scheduled / intermittent supply</option>
                            <option value="On-site storage with booster pump">On-site storage with booster pump</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                      </div>
                      <div style="margin-top: 12px;">
                        <span class="pw-small pw-disclosure-heading">Source <span class="pw-muted">(check all that apply)</span>:</span>
                        <div class="pw-chip-grid" style="margin-top: 6px;">
                          <label class="pw-chip"><input type="checkbox" name="water_sources[]" value="Metro La Union Water District / local water district"><span>MLUWD</span></label>
                          <label class="pw-chip"><input type="checkbox" name="water_sources[]" value="Barangay / community water system"><span>Barangay waterworks</span></label>
                          <label class="pw-chip"><input type="checkbox" name="water_sources[]" value="Deep well / groundwater"><span>Deep well</span></label>
                          <label class="pw-chip"><input type="checkbox" name="water_sources[]" value="Water delivery / storage"><span>Water storage</span></label>
                          <label class="pw-chip"><input type="checkbox" name="water_sources[]" value="Other"><span>Other</span></label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- INTERNET SECTION -->
                <div class="pw-util-section-pane" data-util-pane="internet" hidden>
                  <div class="pw-utility-card-block">
                    <h5>What is the connection status?</h5>
                    <div class="pw-status-radios-row">
                      <label class="pw-status-radio-pill">
                        <input type="radio" name="internet" value="available" data-utility-radio="internet">
                        <span>Connected</span>
                      </label>
                      <label class="pw-status-radio-pill">
                        <input type="radio" name="internet" value="unavailable" data-utility-radio="internet">
                        <span>Not connected</span>
                      </label>
                      <label class="pw-status-radio-pill">
                        <input type="radio" name="internet" value="not_verified" data-utility-radio="internet" checked>
                        <span>Unknown</span>
                      </label>
                    </div>

                    <!-- Conditional Internet Details -->
                    <div class="pw-utility-reveal" data-utility-reveal="internet" hidden style="margin-top: 16px;">
                      <div class="pw-fields-two-col">
                        <label class="pw-field">Technology
                          <select name="internet_technology">
                            <option value="Fiber">Fiber optic</option>
                            <option value="Fixed broadband">Fixed broadband</option>
                            <option value="Satellite">Satellite (Starlink)</option>
                            <option value="Mobile data">Mobile data (4G/5G)</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                        <label class="pw-field">Measured download speed <span class="pw-muted">(optional)</span>
                          <div class="pw-input-group" style="max-width: 190px;">
                            <input name="download_speed_mbps" type="number" min="0" max="10000" step="1" placeholder="e.g. 100">
                            <span>Mbps</span>
                          </div>
                        </label>
                      </div>
                      <div style="margin-top: 12px;">
                        <span class="pw-small pw-disclosure-heading">Available providers <span class="pw-muted">(check all that apply)</span>:</span>
                        <div class="pw-chip-grid" style="margin-top: 6px;">
                          <label class="pw-chip"><input type="checkbox" name="internet_providers[]" value="PLDT"><span>PLDT</span></label>
                          <label class="pw-chip"><input type="checkbox" name="internet_providers[]" value="Globe"><span>Globe</span></label>
                          <label class="pw-chip"><input type="checkbox" name="internet_providers[]" value="Converge"><span>Converge</span></label>
                          <label class="pw-chip"><input type="checkbox" name="internet_providers[]" value="Smart"><span>Smart</span></label>
                          <label class="pw-chip"><input type="checkbox" name="internet_providers[]" value="DITO"><span>DITO</span></label>
                          <label class="pw-chip"><input type="checkbox" name="internet_providers[]" value="Other"><span>Other</span></label>
                        </div>
                      </div>
                      <div style="margin-top: 12px;">
                        <span class="pw-small pw-disclosure-heading">Connection quality:</span>
                        <div class="pw-options pw-options-compact" style="margin-top: 6px;">
                          <label><input type="radio" name="internet_quality" value="strong"><span>Strong</span></label>
                          <label><input type="radio" name="internet_quality" value="moderate"><span>Moderate</span></label>
                          <label><input type="radio" name="internet_quality" value="weak"><span>Weak</span></label>
                          <label><input type="radio" name="internet_quality" value="not_verified" checked><span>Not verified</span></label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Additional Services Accordion (Mockup 2) -->
                <details class="pw-additional-services-disclosure" style="margin-top: 16px;">
                  <summary class="pw-disclosure-trigger">
                    <span class="pw-disclosure-arrow">&rsaquo;</span>
                    <strong>Additional services</strong>
                    <span class="pw-muted">&mdash; Drainage, wastewater and waste collection &mdash; where relevant.</span>
                  </summary>
                  <div class="pw-additional-services-fields">
                    <label class="pw-field">Drainage
                      <select name="drainage_service">
                        <option value="">Select drainage status</option>
                        <option value="Surface drainage canal">Surface drainage canal</option>
                        <option value="Enclosed storm sewer">Enclosed storm sewer</option>
                        <option value="Natural watercourse">Natural watercourse</option>
                        <option value="Unlined ditch">Unlined ditch</option>
                        <option value="None reported">None reported</option>
                      </select>
                    </label>
                    <label class="pw-field">Wastewater &amp; sanitation
                      <select name="wastewater_service">
                        <option value="">Select wastewater system</option>
                        <option value="Individual septic tank system">Individual septic tank system</option>
                        <option value="Decentralized treatment facility">Decentralized treatment facility</option>
                        <option value="Municipal sewer">Municipal sewer</option>
                        <option value="None reported">None reported</option>
                      </select>
                    </label>
                    <label class="pw-field">Waste collection
                      <select name="waste_collection_service">
                        <option value="">Select waste service</option>
                        <option value="City LGU scheduled collection">City LGU scheduled collection</option>
                        <option value="Private waste hauler">Private waste hauler</option>
                        <option value="On-site handling">On-site handling</option>
                        <option value="None reported">None reported</option>
                      </select>
                    </label>
                  </div>
                </details>
              </div>

              <!-- Sidebar: Contextual Helper (Mockup 2) -->
              <aside class="pw-criterion-aside">
                <div class="pw-helper-card">
                  <div class="pw-helper-header">
                    <span class="pw-helper-icon"><?= $pwIcon('info') ?></span>
                    <h4>What counts as evidence?</h4>
                  </div>
                  <p class="pw-helper-text">Upload or link to records that confirm service availability at or near the site. Examples include:</p>
                  <ul class="pw-helper-list">
                    <li>
                      <span class="pw-list-icon"><?= $pwIcon('document') ?></span>
                      <div>
                        <strong>Utility service confirmation</strong>
                        <p class="pw-small pw-muted">A letter or email from the provider confirming connection or capacity.</p>
                      </div>
                    </li>
                    <li>
                      <span class="pw-list-icon"><?= $pwIcon('text') ?></span>
                      <div>
                        <strong>Redacted utility record</strong>
                        <p class="pw-small pw-muted">A recent bill or service record with sensitive details removed.</p>
                      </div>
                    </li>
                    <li>
                      <span class="pw-list-icon"><?= $pwIcon('camera') ?></span>
                      <div>
                        <strong>Dated inspection report</strong>
                        <p class="pw-small pw-muted">A site or infrastructure inspection report that shows service availability.</p>
                      </div>
                    </li>
                  </ul>
                </div>
                <div class="pw-status-pill-card">
                  <div class="pw-status-pill-header">
                    <span class="pw-status-clock-icon">&#9679;</span>
                    <strong>Not yet reviewed</strong>
                  </div>
                  <p class="pw-status-pill-desc">Evidence will be assessed by city staff during the review process.</p>
                </div>
              </aside>
            </div>
          </div>

          <!-- 3. ECONOMIC VIABILITY PANE -->
          <div id="pwCriterionEconomic" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="economic_viability" hidden>
            <div class="pw-criterion-layout">
              <div class="pw-criterion-main">
                <div class="pw-criterion-title-row">
                  <div>
                    <h4>Economic viability</h4>
                    <p class="pw-small pw-muted">Pricing terms, official BIR zonal valuation reference, and tax assessment indicators.</p>
                  </div>
                  <span class="pw-badge pw-badge-weight">20% of MCE</span>
                </div>

                <!-- Reused Pricing Context -->
                <div class="pw-reused-banner">
                  <span class="pw-reused-icon"><?= $pwIcon('chart') ?></span>
                  <div>
                    <span class="pw-reused-label">Reused financial data from Step 1</span>
                    <p class="pw-reused-details">Listing terms: <strong data-reused-price>Price on request</strong> (<span data-reused-purpose>For Sale</span>) &middot; Area: <strong data-reused-area-econ>2,500 m²</strong></p>
                  </div>
                </div>

                <!-- Reported Facts -->
                <div class="pw-evidence-card-box">
                  <h5>Official BIR zonal reference</h5>
                  <div class="pw-fields">
                    <label class="pw-field pw-full">Zonal value (PHP per m²)
                      <input name="bir_zonal_value" type="number" min="0" step="0.01" placeholder="Enter recorded BIR zonal value">
                    </label>
                    <label class="pw-field">Reference date
                      <input name="bir_date" type="date">
                    </label>
                    <label class="pw-field pw-full">Schedule / Department Order reference
                      <input name="bir_source" maxlength="500" placeholder="e.g. BIR Department Order No. 042-2024, Revenue District Office 003">
                    </label>
                    <label class="pw-field pw-full">Assessed property market valuation (Tax Declaration) <span class="pw-muted">(optional)</span>
                      <input name="assessed_market_value" maxlength="150" placeholder="e.g. Assessed value PHP 1,800,000 per ARP No. 2024-...">
                    </label>
                  </div>
                  <p class="pw-small pw-muted" style="margin-top: 8px;">Asking prices are separate declarations from the city's official BIR zonal and tax valuation records. Speculative return-on-investment figures are not accepted.</p>
                </div>

                <!-- Supporting Evidence -->
                <div class="pw-supporting-evidence-box">
                  <div class="pw-evidence-box-header">
                    <h5>Supporting evidence</h5>
                    <span class="pw-info-icon" title="Your selection is a declaration until reviewed."><?= $pwIcon('info') ?></span>
                  </div>
                  <div class="pw-source-fields-grid">
                    <label class="pw-field">Source / issuer
                      <input name="economic_evidence_source" maxlength="250" placeholder="e.g. BIR Revenue District Office 003, City Assessor">
                    </label>
                    <label class="pw-field">Document date
                      <input name="economic_evidence_date" type="date">
                    </label>
                    <label class="pw-field pw-full">Reference
                      <input name="economic_evidence_reference" maxlength="500" placeholder="e.g. BIR Schedule RDO 003, Tax Declaration ARP #">
                    </label>
                  </div>
                </div>
              </div>

              <aside class="pw-criterion-aside">
                <div class="pw-helper-card">
                  <div class="pw-helper-header">
                    <span class="pw-helper-icon"><?= $pwIcon('info') ?></span>
                    <h4>What counts as evidence?</h4>
                  </div>
                  <ul class="pw-helper-list">
                    <li><strong>BIR Zonal Valuation schedule</strong><br>The official schedule published by the Bureau of Internal Revenue for the barangay/street.</li>
                    <li><strong>Certified Tax Declaration</strong><br>Current real property tax declaration issued by the City Assessor's Office.</li>
                    <li><strong>PRC licensed appraisal</strong><br>Formal valuation report prepared by a licensed real estate appraiser.</li>
                  </ul>
                </div>
                <div class="pw-status-pill-card">
                  <div class="pw-status-pill-header">
                    <span class="pw-status-clock-icon">&#9679;</span>
                    <strong>Not yet reviewed</strong>
                  </div>
                  <p class="pw-status-pill-desc">Evidence will be assessed by city staff during the review process.</p>
                </div>
              </aside>
            </div>
          </div>

          <!-- 4. NEARBY BUSINESSES PANE -->
          <div id="pwCriterionNearby" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="nearby_businesses" hidden>
            <div class="pw-criterion-layout">
              <div class="pw-criterion-main">
                <div class="pw-criterion-title-row">
                  <div>
                    <h4>Nearby businesses</h4>
                    <p class="pw-small pw-muted">Commercial surroundings, corridor context, and 500-meter straight-line radius analysis.</p>
                  </div>
                  <span class="pw-badge pw-badge-weight">10% of MCE</span>
                </div>

                <!-- Reused Surroundings Context -->
                <div class="pw-reused-banner">
                  <span class="pw-reused-icon"><?= $pwIcon('store') ?></span>
                  <div>
                    <span class="pw-reused-label">Surroundings radar context (Step 4)</span>
                    <p class="pw-reused-details">Search radius: <strong>500 meters</strong> straight-line from reference pin &middot; Missing mapped coverage is not zero businesses.</p>
                  </div>
                </div>

                <!-- Reported Facts -->
                <div class="pw-evidence-card-box">
                  <h5>Commercial surroundings context</h5>
                  <div class="pw-fields">
                    <label class="pw-field">Commercial analysis origin
                      <select name="nearby_analysis_origin">
                        <option value="surroundings_radar">Surroundings 500m Radar</option>
                        <option value="bplo_registry">City BPLO Commercial Census</option>
                        <option value="field_survey">Field site inventory</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <label class="pw-field">Commercial corridor / cluster
                      <input name="commercial_corridor" maxlength="180" placeholder="e.g. MacArthur Highway Corridor, Sevilla Central">
                    </label>
                  </div>
                  <div style="margin-top: 14px;">
                    <details class="pw-disclosure pw-context-details" open>
                      <summary><?= $pwIcon('tag') ?><span>Corridor context tags &amp; recorded nearby places</span><?= $pwIcon('chevron') ?></summary>
                      <div class="pw-context-tags" style="margin-top: 8px;">
                        <?php foreach (\App\Support\PropertyCatalog::contextTags() as $pwTag): ?>
                        <label><input type="checkbox" name="assessmentTags[]" value="<?= $pwEscape($pwTag) ?>"><span><?= $pwEscape(ucwords(strtolower($pwTag))) ?></span></label>
                        <?php endforeach; ?>
                      </div>
                      <div data-nearby-editor style="margin-top: 12px;">
                        <div class="pw-label-row">
                          <h4>Recorded nearby establishments</h4>
                          <button class="pw-button pw-button-light pw-button-small" type="button" data-add-nearby>+ Add place</button>
                        </div>
                        <p class="pw-small pw-muted">Add up to six known places. Surroundings radar checks live mapped inventory in Step 4.</p>
                        <div class="pw-nearby-list" data-nearby-list></div>
                      </div>
                    </details>
                  </div>
                </div>

                <!-- Supporting Evidence -->
                <div class="pw-supporting-evidence-box">
                  <div class="pw-evidence-box-header">
                    <h5>Supporting evidence</h5>
                    <span class="pw-info-icon" title="Your selection is a declaration until reviewed."><?= $pwIcon('info') ?></span>
                  </div>
                  <div class="pw-source-fields-grid">
                    <label class="pw-field">Source / inventory issuer
                      <input name="nearby_evidence_source" maxlength="250" placeholder="e.g. City LEBDO / BPLO, OSM commercial dataset">
                    </label>
                    <label class="pw-field">Observation date
                      <input name="nearby_evidence_date" type="date">
                    </label>
                    <label class="pw-field pw-full">Reference / Inventory ID
                      <input name="nearby_evidence_reference" maxlength="500" placeholder="e.g. BPLO Registry extract, commercial survey batch">
                    </label>
                  </div>
                </div>
              </div>

              <aside class="pw-criterion-aside">
                <div class="pw-helper-card">
                  <div class="pw-helper-header">
                    <span class="pw-helper-icon"><?= $pwIcon('info') ?></span>
                    <h4>What counts as evidence?</h4>
                  </div>
                  <ul class="pw-helper-list">
                    <li><strong>BPLO registry extract</strong><br>City Business Permits and Licensing Office records showing registered commercial enterprises.</li>
                    <li><strong>Corridor census inventory</strong><br>Field-verified list of operating businesses along the commercial strip.</li>
                    <li><strong>Surroundings radar run</strong><br>Geographic distance screening performed in Step 4 showing mapped points of interest.</li>
                  </ul>
                </div>
                <div class="pw-status-pill-card">
                  <div class="pw-status-pill-header">
                    <span class="pw-status-clock-icon">&#9679;</span>
                    <strong>Not yet reviewed</strong>
                  </div>
                  <p class="pw-status-pill-desc">Evidence will be assessed by city staff during the review process.</p>
                </div>
              </aside>
            </div>
          </div>

          <!-- 5. ZONING COMPATIBILITY (CLUP) PANE -->
          <div id="pwCriterionZoning" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="zoning_compatibility" hidden>
            <div class="pw-criterion-layout">
              <div class="pw-criterion-main">
                <div class="pw-criterion-title-row">
                  <div>
                    <h4>Zoning compatibility (CLUP)</h4>
                    <p class="pw-small pw-muted">Comprehensive Land Use Plan compliance, zoning classification, and verified allowed uses.</p>
                  </div>
                  <span class="pw-badge pw-badge-weight">15% of MCE</span>
                </div>

                <!-- Reused Proposed Category -->
                <div class="pw-reused-banner">
                  <span class="pw-reused-icon"><?= $pwIcon('document') ?></span>
                  <div>
                    <span class="pw-reused-label">Reused property category from Step 1</span>
                    <p class="pw-reused-details">Proposed use: <strong data-reused-category>Vacant Land</strong> &middot; Selecting a proposed use is a declaration, NOT official zoning clearance.</p>
                  </div>
                </div>

                <!-- Reported Facts -->
                <div class="pw-evidence-card-box">
                  <h5>Zoning &amp; land use declarations</h5>
                  <div class="pw-fields">
                    <label class="pw-field pw-full">Observed existing land use
                      <input name="existing_land_use" maxlength="180" placeholder="e.g. Vacant lot, commercial strip, agricultural">
                    </label>
                    <label class="pw-field pw-full">Recorded zoning classification
                      <input name="zoning_classification" maxlength="180" placeholder="e.g. C-1 General Commercial, I-1 Light Industrial, R-2 Residential">
                    </label>
                  </div>
                  <div style="margin-top: 14px;">
                    <span class="pw-small pw-disclosure-heading">CLUP Allowed Land Uses <span class="pw-muted">(multi-select from city plan)</span>:</span>
                    <div class="pw-chip-grid pw-clup-chip-grid" style="margin-top: 8px;">
                      <?php foreach ($pwClupUses as $pwUse): ?>
                      <label class="pw-chip pw-clup-chip" title="<?= $pwEscape($pwUse['description'] ?? '') ?>">
                        <input type="checkbox" name="clup_allowed_uses[]" value="<?= $pwEscape($pwUse['label']) ?>">
                        <span><?= $pwEscape($pwUse['label']) ?></span>
                      </label>
                      <?php endforeach; ?>
                    </div>
                  </div>
                </div>

                <!-- Legal Authorization (Authority to Sell) for Brokers -->
                <div class="pw-authority-section" data-authority-block style="margin-top: 16px;">
                  <div class="pw-evidence-box-header">
                    <h5>Authority to Sell <span class="pw-required-asterisk" style="color: #9E1B22;">*</span></h5>
                    <span class="pw-badge pw-badge-amber" data-authority-badge>Pending city validation</span>
                  </div>
                  <p class="pw-small pw-muted">Brokers must upload proof of authorization to market this property (PDF, JPG, PNG &middot; max 15 MB).</p>
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
                </div>

                <!-- Supporting Evidence -->
                <div class="pw-supporting-evidence-box" style="margin-top: 16px;">
                  <div class="pw-evidence-box-header">
                    <h5>CLUP &amp; zoning source reference</h5>
                    <span class="pw-info-icon" title="Your selection is a declaration until reviewed."><?= $pwIcon('info') ?></span>
                  </div>
                  <div class="pw-source-fields-grid">
                    <label class="pw-field pw-full">CLUP source or reference
                      <input name="clup_source_reference" maxlength="500" placeholder="e.g. City Ordinance No. ..., CLUP 2017-2027, CPDO Certificate">
                    </label>
                    <label class="pw-field">Document date
                      <input name="zoning_evidence_date" type="date">
                    </label>
                    <label class="pw-field">Zoning certificate / clearance number
                      <input name="zoning_evidence_reference" maxlength="250" placeholder="e.g. CPDO Locational Clearance #2026-...">
                    </label>
                  </div>
                </div>
              </div>

              <aside class="pw-criterion-aside">
                <div class="pw-helper-card">
                  <div class="pw-helper-header">
                    <span class="pw-helper-icon"><?= $pwIcon('info') ?></span>
                    <h4>What counts as evidence?</h4>
                  </div>
                  <ul class="pw-helper-list">
                    <li><strong>CPDO Locational Clearance</strong><br>Official zoning clearance issued by the City Planning and Development Coordinator.</li>
                    <li><strong>CLUP Zoning Map extract</strong><br>The official city land use map confirming the parcel's zoning designation.</li>
                    <li><strong>City Assessor tax classification</strong><br>Official land classification record on the property's tax declaration.</li>
                  </ul>
                </div>
                <div class="pw-status-pill-card">
                  <div class="pw-status-pill-header">
                    <span class="pw-status-clock-icon">&#9679;</span>
                    <strong>Not yet reviewed</strong>
                  </div>
                  <p class="pw-status-pill-desc">Evidence will be assessed by city staff during the review process.</p>
                </div>
              </aside>
            </div>
          </div>

          <!-- 6. RISK CONSTRAINTS PANE (Mockup 1 Layout) -->
          <div id="pwCriterionRisks" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="risk_constraints" hidden>
            <div class="pw-criterion-layout">
              <div class="pw-criterion-main">
                <div class="pw-criterion-title-row">
                  <div>
                    <h4>Understand the site constraints</h4>
                    <p class="pw-small pw-muted">Keep hazard exposure and environmental conditions separate.</p>
                  </div>
                  <span class="pw-badge pw-badge-weight">10% of MCE</span>
                </div>

                <!-- Risk Constraints Card (Mockup 1 Left Card) -->
                <div class="pw-constraint-card pw-risk-card">
                  <div class="pw-constraint-card-header">
                    <span class="pw-constraint-icon-badge pw-risk-icon-badge">
                      <svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </span>
                    <div>
                      <h5>Risk constraints</h5>
                      <p class="pw-small pw-muted">What could threaten people or property?</p>
                    </div>
                  </div>

                  <!-- Hazard Indicator Rows -->
                  <div class="pw-hazard-status-rows">
                    <div class="pw-hazard-status-row">
                      <span>Flood exposure</span>
                      <span class="pw-pill" data-hazard-flood-pill>Not assessed</span>
                    </div>
                    <div class="pw-hazard-status-row">
                      <span>Active fault proximity</span>
                      <span class="pw-pill" data-hazard-fault-pill>Not assessed</span>
                    </div>
                    <div class="pw-hazard-status-row">
                      <span>Landslide susceptibility</span>
                      <span class="pw-pill" data-hazard-landslide-pill>Not assessed</span>
                    </div>
                  </div>

                  <!-- Spatial screening mini-summary -->
                  <div class="pw-hazard-screening-summary" style="margin-top: 14px;">
                    <div class="pw-hazard-map-shell">
                      <div class="pw-hazard-results" data-hazard-results>
                        <p class="pw-small pw-muted">Enter coordinates or place a pin in Step 2 to screen against MGB flood and PHIVOLCS fault layers.</p>
                      </div>
                    </div>
                    <p class="pw-small pw-muted" style="margin-top: 8px;">Attach an official source or indicative hazard report.</p>
                    <button type="button" class="pw-button pw-button-red-pill" data-trigger-hazard-evidence>
                      <?= $pwIcon('document') ?> Add hazard evidence
                    </button>
                  </div>
                </div>

                <!-- Bottom Banner Alert (Mockup 1) -->
                <div class="pw-warning-alert-banner" style="margin-top: 16px;">
                  <span class="pw-warning-symbol">⚠️</span>
                  <div>
                    <strong>Unknown does not mean safe.</strong>
                    <p>A map screening result does not replace an official clearance.</p>
                  </div>
                </div>

                <!-- Supporting Evidence Source Block -->
                <div class="pw-supporting-evidence-box" style="margin-top: 16px;">
                  <div class="pw-evidence-box-header">
                    <h5>Hazard evidence source</h5>
                    <span class="pw-info-icon" title="Your selection is a declaration until reviewed."><?= $pwIcon('info') ?></span>
                  </div>
                  <div class="pw-source-fields-grid">
                    <label class="pw-field">Source / issuing agency
                      <input name="hazard_evidence_source" maxlength="250" placeholder="e.g. DOST-PHIVOLCS, MGB Region 1, CDRRMO">
                    </label>
                    <label class="pw-field">Screening / assessment date
                      <input name="hazard_evidence_date" type="date">
                    </label>
                    <label class="pw-field pw-full">Report ID / HazardHunterPH reference
                      <input name="hazard_evidence_reference" maxlength="500" placeholder="e.g. HazardHunterPH Reference #HH-2026-..., MGB Geohazard Report #">
                    </label>
                  </div>
                </div>
              </div>

              <aside class="pw-criterion-aside">
                <div class="pw-helper-card">
                  <div class="pw-helper-header">
                    <span class="pw-helper-icon"><?= $pwIcon('info') ?></span>
                    <h4>What counts as evidence?</h4>
                  </div>
                  <ul class="pw-helper-list">
                    <li><strong>HazardHunterPH Assessment</strong><br>Official DOST-PHIVOLCS multi-hazard report generated for the parcel.</li>
                    <li><strong>MGB Engineering Geohazard study</strong><br>Detailed geological assessment by the Mines and Geosciences Bureau.</li>
                    <li><strong>CDRRMO drainage inspection</strong><br>Certified City Disaster Risk Reduction &amp; Management Office flood assessment.</li>
                  </ul>
                </div>
                <div class="pw-status-pill-card">
                  <div class="pw-status-pill-header">
                    <span class="pw-status-clock-icon">&#9679;</span>
                    <strong>Not yet reviewed</strong>
                  </div>
                  <p class="pw-status-pill-desc">Evidence will be assessed by city staff during the review process.</p>
                </div>
              </aside>
            </div>
          </div>

          <!-- 7. ENVIRONMENTAL SAFETY PANE (Mockup 1 Right Card) -->
          <div id="pwCriterionEnvironmental" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="environmental_safety" hidden>
            <div class="pw-criterion-layout">
              <div class="pw-criterion-main">
                <div class="pw-criterion-title-row">
                  <div>
                    <h4>Environmental safety</h4>
                    <p class="pw-small pw-muted">What environmental conditions affect suitability?</p>
                  </div>
                  <span class="pw-badge pw-badge-weight">5% of MCE</span>
                </div>

                <!-- Environmental Safety Card (Mockup 1 Right Card) -->
                <div class="pw-constraint-card pw-env-card">
                  <div class="pw-constraint-card-header">
                    <span class="pw-constraint-icon-badge pw-env-icon-badge">
                      <svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
                    </span>
                    <div>
                      <h5>Environmental safety</h5>
                      <p class="pw-small pw-muted">What environmental conditions affect suitability?</p>
                    </div>
                  </div>

                  <!-- Environmental Conditions Rows -->
                  <div class="pw-hazard-status-rows">
                    <div class="pw-hazard-status-row">
                      <span>Sensitive habitats</span>
                      <span class="pw-pill" data-env-habitats-pill>Not assessed</span>
                    </div>
                    <div class="pw-hazard-status-row">
                      <span>Protected-area overlap</span>
                      <span class="pw-pill" data-env-protected-pill>Not assessed</span>
                    </div>
                    <div class="pw-hazard-status-row">
                      <span>Documented contamination</span>
                      <span class="pw-pill" data-env-contamination-pill>Not assessed</span>
                    </div>
                  </div>

                  <!-- Center Dropzone Box (Mockup 1) -->
                  <div class="pw-env-records-box" style="margin-top: 14px;">
                    <span class="pw-env-doc-icon"><?= $pwIcon('document') ?></span>
                    <strong>No environmental records added</strong>
                    <p class="pw-small pw-muted">Add mapped sources, inspection records or relevant assessments.</p>
                    <button type="button" class="pw-button pw-button-red-pill" data-trigger-env-evidence>
                      <?= $pwIcon('document') ?> Add environmental evidence
                    </button>
                  </div>
                </div>

                <!-- Supporting Evidence Source Block -->
                <div class="pw-supporting-evidence-box" style="margin-top: 16px;">
                  <div class="pw-evidence-box-header">
                    <h5>Environmental clearance / assessment reference</h5>
                    <span class="pw-info-icon" title="Your selection is a declaration until reviewed."><?= $pwIcon('info') ?></span>
                  </div>
                  <div class="pw-source-fields-grid">
                    <label class="pw-field pw-full">Environmental source or reference
                      <input name="environmental_reference" maxlength="2000" placeholder="e.g. DENR-EMB ECC/CNC, City ENRO certification, PAMB record">
                    </label>
                    <label class="pw-field">Document / clearance date
                      <input name="environmental_evidence_date" type="date">
                    </label>
                    <label class="pw-field">Certificate / Tracking reference
                      <input name="environmental_evidence_reference" maxlength="250" placeholder="e.g. ECC-R01-2026-..., CNC Clearance No. ...">
                    </label>
                  </div>
                </div>

                <div class="pw-supporting-evidence-box" style="margin-top: 16px;">
                  <h5>General site observations &amp; notes <span class="pw-muted">(optional)</span></h5>
                  <label class="pw-field pw-full" style="margin-top: 8px;">Notes for the reviewing department
                    <textarea name="readiness_notes" rows="3" maxlength="10000" placeholder="Add observed facts and note anything that still needs verification by city staff."></textarea>
                  </label>
                </div>
              </div>

              <aside class="pw-criterion-aside">
                <div class="pw-helper-card">
                  <div class="pw-helper-header">
                    <span class="pw-helper-icon"><?= $pwIcon('info') ?></span>
                    <h4>What counts as evidence?</h4>
                  </div>
                  <ul class="pw-helper-list">
                    <li><strong>DENR ECC / CNC</strong><br>Environmental Compliance Certificate or Certificate of Non-Coverage issued by DENR Environmental Management Bureau.</li>
                    <li><strong>City ENRO inspection</strong><br>City Environment and Natural Resources Office site inspection certification.</li>
                    <li><strong>Protected area clearance</strong><br>Verification against NIPAS protected zones and municipal conservation areas.</li>
                  </ul>
                </div>
                <div class="pw-status-pill-card">
                  <div class="pw-status-pill-header">
                    <span class="pw-status-clock-icon">&#9679;</span>
                    <strong>Not yet reviewed</strong>
                  </div>
                  <p class="pw-status-pill-desc">Evidence will be assessed by city staff during the review process.</p>
                </div>
              </aside>
            </div>
          </div>

          <!-- Bottom Rubric Note (Mockup 1 & 2 Footer Note) -->
          <div class="pw-criteria-rubric-footnote">
            <span class="pw-muted">Use each indicator once in the scoring rubric. Supporting records help city reviewers verify claims before publishing.</span>
          </div>
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

        <!-- 4 Separate Review States: Submit, Completeness, Validation, Assessment -->
        <div class="pw-review-states-grid">
          <div class="pw-review-state-card" data-review-state="submit">
            <div class="pw-state-header">
              <span class="pw-state-icon"><?= $pwIcon('check') ?></span>
              <div>
                <strong>Ready to submit</strong>
                <span class="pw-badge pw-badge-teal" data-submit-readiness-badge>Ready to submit</span>
              </div>
            </div>
            <p class="pw-small pw-muted">Listing essentials are complete. You may submit this listing to city staff while evidence and scores are pending.</p>
          </div>

          <div class="pw-review-state-card" data-review-state="completeness">
            <div class="pw-state-header">
              <span class="pw-state-icon"><?= $pwIcon('document') ?></span>
              <div>
                <strong>Evidence completeness</strong>
                <span class="pw-badge pw-badge-sky" data-completeness-badge><span data-completeness-count>0 of 7</span> criteria</span>
              </div>
            </div>
            <p class="pw-small pw-muted">Intake progress metric tracking criteria with facts or records. <em>Not</em> an investment or suitability score.</p>
          </div>

          <div class="pw-review-state-card" data-review-state="validation">
            <div class="pw-state-header">
              <span class="pw-state-icon"><?= $pwIcon('info') ?></span>
              <div>
                <strong>Evidence validation</strong>
                <span class="pw-badge pw-badge-amber">Declarations unverified</span>
              </div>
            </div>
            <p class="pw-small pw-muted">All claims and uploads are declarations until inspected by city staff. Self-verification is strictly blocked.</p>
          </div>

          <div class="pw-review-state-card" data-review-state="assessment">
            <div class="pw-state-header">
              <span class="pw-state-icon"><?= $pwIcon('chart') ?></span>
              <div>
                <strong>Official assessment</strong>
                <span class="pw-badge pw-badge-amber" data-assessment-readiness-badge>IAI pending</span>
              </div>
            </div>
            <p class="pw-small pw-muted">Official MCE/IAI scores require complete verified evidence across all seven criteria. Missing data is never defaulted.</p>
          </div>
        </div>

        <!-- Assessment Checklist Disclosure -->
        <details class="pw-card pw-readiness-card pw-readiness-disclosure" style="margin-top: 16px;">
          <summary><span>Assessment criteria checklist</span><?= $pwIcon('chevron') ?></summary>
          <p class="pw-small pw-muted">See which evidence is ready for city assessment across the seven criteria. Click any row to jump to that criterion.</p>
          <div data-assessment-readiness>
            <?php foreach ($pwCriteria as $pwKey => $pwCriterion): ?>
            <?php $pwReady = $pwReadiness[$pwKey]; ?>
            <div class="pw-readiness-row" data-readiness-criterion="<?= $pwKey ?>">
              <?= $pwIcon($pwReady[0]) ?>
              <div>
                <strong><?= $pwEscape($pwCriterion) ?></strong>
                <span data-readiness-message><?= $pwReady[1] ?></span>
              </div>
              <button type="button" class="pw-readiness-action" data-readiness-target="<?= $pwKey ?>"><?= $pwReady[2] ?></button>
            </div>
            <?php endforeach; ?>
          </div>
        </details>

        <p class="pw-review-note" style="margin-top: 16px;">Your listing can be submitted while evidence and scores are pending. CICTO reviews the property before publication.</p>
        <div class="pw-tabs pw-review-tabs" role="tablist" aria-label="Review view"><button type="button" role="tab" aria-selected="true" class="is-active" data-review-tab="assessment">City assessment &amp; IAI scores</button><button type="button" role="tab" aria-selected="false" data-review-tab="investor">Investor preview</button></div>
        <div data-review-panel="assessment"><article class="pw-card" data-automatic-assessment><div class="pw-review-heading"><div class="pw-card-heading"><h3>City assessment &amp; IAI scores</h3><p>MCE (Multi-Criteria Evaluation) and IAI (Investment Alignment Index) are calculated from verified city evidence.</p></div><span class="pw-badge"><?= $pwIcon('document') ?> Official evidence</span></div><div class="pw-live-scores pw-live-scores-top" data-live-scores><div><span>MCE Score (Physical Suitability)</span><strong data-total-mce>—</strong><small>/ 100</small></div><div><span>IAI Score (Investment Alignment)</span><strong data-total-iai>—</strong><small>/ 100</small></div><p data-computed-summary>Scores remain pending until all required evidence is available.</p></div><p class="pw-notice pw-notice-amber" data-legacy-assessment hidden>This listing has an earlier manual assessment. Saving calculates a new automatic assessment and retains the earlier result in its history.</p><div class="pw-assessment-status"><p class="pw-small pw-muted" data-assessment-status role="status">Add a property location to check verified source data.</p><button type="button" class="pw-button pw-button-light pw-button-small" data-recalculate-assessment><?= $pwIcon('reset') ?> Recalculate</button></div><div class="pw-assessment-criteria"><?php foreach ($pwCriteria as $pwKey => $pwCriterion): ?><article class="pw-criterion" data-assessment-criterion="<?= $pwKey ?>"><div class="pw-criterion-heading"><h4><?= $pwEscape($pwCriterion) ?></h4><span><?= \App\Support\PropertyAssessment::WEIGHTS[$pwKey] ?>% of MCE</span><strong data-score-value>Awaiting data</strong></div><div class="pw-criterion-bar" role="progressbar" aria-label="<?= $pwEscape($pwCriterion) ?>" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Awaiting source data"><span></span></div><details class="pw-criterion-evidence"><summary>Evidence &amp; calculation <?= $pwIcon('chevron') ?></summary><p data-score-justification>Add the property location to check available source evidence.</p><p class="pw-small pw-muted" data-score-rule hidden></p><p class="pw-small pw-muted" data-score-evidence hidden></p></details></article><?php endforeach; ?></div><details class="pw-disclosure" data-spatial-context hidden><summary><?= $pwIcon('pin') ?><span>Location evidence</span><?= $pwIcon('chevron') ?></summary><dl></dl></details><details class="pw-disclosure"><summary><?= $pwIcon('document') ?><span>How scores are calculated</span><?= $pwIcon('chevron') ?></summary><p class="pw-small pw-muted" data-assessment-method>Scores depend on approved source conversion rules and the seven displayed criterion weights.</p></details></article></div>
        <div data-review-panel="investor" hidden><article class="pw-card pw-investor-card"><div class="pw-review-heading"><div class="pw-card-heading"><h3>Which business fits this property?</h3><p>Compare the modeled fit and see the evidence behind each result.</p></div><div class="pw-review-property" data-review-property><strong>Your new property</strong><span>Business matches await approved scoring profiles</span></div></div><div class="pw-business-matches" data-business-matches><div class="pw-match-placeholder"><?= $pwIcon('coffee') ?><div><strong>Café &amp; bakery</strong><span>Awaiting approved profile</span></div></div><div class="pw-match-placeholder"><?= $pwIcon('store') ?><div><strong>Convenience retail</strong><span>Awaiting approved profile</span></div></div><div class="pw-match-placeholder"><?= $pwIcon('office') ?><div><strong>Office</strong><span>Awaiting approved profile</span></div></div></div><div class="pw-review-columns"><section class="pw-review-breakdown" data-match-breakdown><div class="pw-label-row"><h4>Business fit: score breakdown</h4><span class="pw-small pw-muted">Seven weighted criteria</span></div><p class="pw-small pw-muted">Business-specific scores appear once approved rules and the required evidence are available.</p><div class="pw-score-table"><div class="pw-score-table-head"><span>Criteria</span><span>Rating</span><span>Weight</span></div><?php foreach ($pwCriteria as $pwKey => $pwCriterion): ?><div class="pw-score-table-row"><span><?= $pwEscape($pwCriterion) ?></span><div class="pw-score-placeholder"><span></span><strong>—</strong></div><span><?= \App\Support\PropertyAssessment::WEIGHTS[$pwKey] ?>%</span></div><?php endforeach; ?></div><div class="pw-weighted-total"><div><strong>Weighted business score</strong><span>Pending approved business-specific scoring</span></div><strong>— <small>/ 100</small></strong></div></section><section class="pw-review-reasons" data-match-reasons><h4>What is needed for a match</h4><ol class="pw-reason-list"><li><span>1</span><div><strong>Confirm the assessment evidence.</strong><p>Check road access, utilities, valuation, land use, and available hazard findings.</p></div></li><li><span>2</span><div><strong>Apply an approved business profile.</strong><p>Eligibility and scoring rules must reflect the selected business type.</p></div></li></ol><h4 class="pw-concerns-heading"><?= $pwIcon('warning') ?> What still needs checking</h4><div class="pw-notice pw-notice-amber"><div><strong>Business ranking is not available yet</strong><p>The seven criteria and their displayed weights are retained. A top-three ranking requires approved business-specific scoring rules.</p></div></div><div class="pw-notice pw-notice-neutral"><?= $pwIcon('document') ?><div><strong>Validate demand and permitted use</strong><p>Review customer demand and land-use compatibility before an investment decision.</p></div></div></section></div><div class="pw-review-footnote"><?= $pwIcon('info') ?> Scores compare suitability under the selected method; they do not predict business success.</div></article></div>
      </section>
      <p class="pw-form-message" data-editor-message role="status"></p>
    </div>
    <footer class="pw-footer"><span class="pw-progress" data-editor-progress>Step 1 of 5</span><div class="pw-footer-actions"><button type="button" class="pw-text-button pw-skip" data-skip-enrichment hidden>Skip optional details</button><button type="button" class="pw-button pw-button-light" data-save-draft title="Save draft on this device"><?= $pwIcon('save') ?> Save draft</button><button type="button" class="pw-button pw-button-light" data-editor-back disabled>Back</button><button type="button" class="pw-button pw-button-primary" data-editor-next><span data-editor-next-label>Continue to location</span><?= $pwIcon('arrow') ?></button><button type="submit" class="pw-button pw-button-primary" hidden><span>Submit listing</span><?= $pwIcon('arrow') ?></button></div></footer>
  </form>
</dialog>
<?php unset($pwEscape, $pwIcon, $pwCriteria, $pwReadiness); ?>
