<?php
/** Shared property submission form for city staff and brokers. */
require_once __DIR__ . '/PropertyParcel.php';
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
        'redo' => '<path d="m16 5 5 5-5 5m5-5H10a6 6 0 0 0 0 12"/>',
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
        'shield' => '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        'activity' => '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
        'wind' => '<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>',
        'mountain' => '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
    ];
    return '<svg class="pw-icon ' . $pwEscape($class) . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ($paths[$name] ?? $paths['info']) . '</svg>';
};
$pwCriteria = \App\Support\PropertyCatalog::criteria();
$pwClupUses = \App\Support\PropertyCatalog::clupUseTypes($pdo ?? ($GLOBALS['pdo'] ?? ($container['pdo'] ?? null)));
$pwReadiness = [
    'spatial_accessibility' => ['pin', 'Confirm road evidence.', 'Confirm'],
    'infrastructure_readiness' => ['utilities', 'Confirm utilities.', 'Confirm'],
    'property_cost_market_competitiveness' => ['chart', 'Add BIR reference.', 'Add reference'],
    'economic_viability' => ['chart', 'Add BIR reference.', 'Add reference'],
    'nearby_businesses' => ['store', 'Run the nearby business radar.', 'Run radar'],
    'zoning_compatibility' => ['document', 'Add CLUP evidence.', 'Add evidence'],
    'risk_constraints' => ['warning', 'Review available hazard layers.', 'Review'],
];
$pwUser = $context['user'] ?? ($GLOBALS['user'] ?? (function_exists('sfc_current_user') ? sfc_current_user() : null));
$pwUserRole = (string) ($pwUser['role'] ?? '');
?>
<dialog class="property-wizard" id="cityPropertyEditor" data-user-role="<?= $pwEscape($pwUserRole) ?>" aria-labelledby="cityEditorTitle">
  <form class="pw-form" data-property-form novalidate>
    <header class="pw-header">
      <div class="pw-heading-row">
        <div>
          <div class="pw-breadcrumb">Properties <span>/</span> <span data-wizard-breadcrumb>Add property</span></div>
          <div class="pw-title-badge-row">
            <h2 id="cityEditorTitle">Start with the essentials</h2>
          </div>
          <p class="pw-header-note">Add the details investors need to understand the property.</p>
        </div>
        <div class="pw-header-actions">
          <div class="pw-history-actions" role="group" aria-label="Edit history">
            <button class="pw-button pw-button-light pw-button-small" type="button" data-editor-undo disabled title="Undo last change (Ctrl+Z)"><?= $pwIcon('undo') ?> <span>Undo</span></button>
            <button class="pw-button pw-button-light pw-button-small" type="button" data-editor-redo disabled title="Redo last change (Ctrl+Shift+Z)"><?= $pwIcon('redo') ?> <span>Redo</span></button>
          </div>
          <span class="pw-device-draft-status" data-device-draft-status><svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg> <span data-device-draft-text>Draft not saved</span></span>
          <button class="pw-button pw-button-light pw-button-small" type="button" data-save-exit title="Save this draft on this device"><?= $pwIcon('save') ?> Save draft</button>
          <button class="pw-close" type="button" data-close-dialog aria-label="Close property editor"><?= $pwIcon('close') ?></button>
        </div>
      </div>
      <nav class="pw-steps" aria-label="Property form steps">
        <?php foreach (['Basic information', 'Location & boundary', 'Assessment', 'Review'] as $pwStep => $pwStepLabel): ?>
        <button class="pw-step<?= $pwStep === 0 ? ' is-active' : '' ?>" type="button" data-editor-step="<?= $pwStep ?>" aria-label="Step <?= $pwStep + 1 ?>: <?= $pwEscape($pwStepLabel) ?>"<?= $pwStep === 0 ? ' aria-current="step"' : '' ?>><span class="pw-step-number"><span><?= $pwStep + 1 ?></span><?= $pwIcon('check', 'pw-step-check') ?></span><span class="pw-step-label"><?= $pwStepLabel ?></span></button>
        <?php endforeach; ?>
      </nav>
    </header>
    <script type="application/json" data-city-coverage><?= json_encode(\App\Support\PropertyParcel::SAN_FERNANDO_EXTENT) ?></script>
    <input type="hidden" name="id">
    <input type="hidden" name="boundary">
    <input type="hidden" name="calculated_area_sqm">
    <input type="hidden" name="reference_lat">
    <input type="hidden" name="reference_lng">
    <input type="hidden" name="nearby_screening">
    <script type="application/json" data-classification-catalog><?= json_encode(\App\Support\PropertyCatalog::classificationCatalog(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?></script>
    <div class="pw-content">
      <div class="pw-feedback-region"><p class="pw-form-message" data-editor-message role="status" tabindex="-1"></p></div>
      <section class="pw-panel" data-editor-panel="0">
        <div class="pw-columns pw-basics-columns">
          <div class="pw-basics-sections">

            <!-- CARD 1: BASIC PROPERTY INFORMATION -->
            <article class="pw-card pw-section-card pw-card-basic-info" data-section="about">
              <div class="pw-section-header">
                <div>
                  <h3 class="pw-section-title">Basic property information</h3>
                </div>
              </div>
              <div class="pw-card-basic-grid">
                <!-- Left: Title & Subname -->
                <div class="pw-fields">
                  <label class="pw-field pw-full">
                    <span class="pw-field-label">Property title <span class="pw-required-indicator" aria-hidden="true">*</span></span>
                    <input name="property_name" required maxlength="180" placeholder="Sample commercial lot" autocomplete="off" class="pw-input-prominent">
                    <small class="pw-muted">Use a clear, factual title.</small>
                  </label>

                  <label class="pw-field pw-full">
                    <span class="pw-field-label">Property subname <span class="pw-muted">&middot; optional</span></span>
                    <input name="property_subname" maxlength="180" placeholder="e.g. Phase 2 · Prime Corner Lot" autocomplete="off">
                    <small class="pw-muted">Optional subtitle or specific phase to appear under the property name.</small>
                  </label>
                </div>

                <!-- Right: Add property photos -->
                <div class="pw-field pw-full pw-photo-section" data-section="photos">
                  <span class="pw-field-label">Add property photos</span>
                  <input type="hidden" name="remove_image" value="0" data-remove-image>

                  <!-- Active Photo Gallery Manager (shown when photos exist) -->
                  <div class="pw-photo-active-box pw-gallery-manager" data-photo-active-box hidden>
                    <div class="pw-gallery-header-row">
                      <div class="pw-gallery-header-info">
                        <span class="pw-photo-badge-icon" aria-hidden="true"><?= $pwIcon('camera') ?></span>
                        <div>
                          <strong class="pw-gallery-count-text" data-photo-count-text>0 photos</strong>
                          <p class="pw-photo-active-caption">The first image is the main cover. Use arrows to reorder, or click &ldquo;Make cover&rdquo;.</p>
                        </div>
                      </div>
                      <div class="pw-gallery-header-actions">
                        <button type="button" class="pw-button pw-button-light pw-button-small" data-photo-add-more><?= $pwIcon('camera') ?> Add photos</button>
                        <button type="button" class="pw-button pw-button-small pw-button-danger-outline" data-photo-remove-all><?= $pwIcon('close') ?> Remove all</button>
                      </div>
                    </div>

                    <!-- Multi-photo thumbnails grid -->
                    <div class="pw-gallery-grid" data-photo-gallery-grid></div>
                    <div class="pw-badge pw-badge-amber" data-photo-removal-badge hidden>Photos marked for removal &middot; Saved upon submitting</div>
                  </div>

                  <!-- Empty Photo Dropzone State with 2 placeholder slots -->
                  <div class="pw-photo-drop-mockup-row">
                    <label class="pw-photo-drop" for="property_image_file" data-photo-drop tabindex="0">
                      <input class="pw-file-input" id="property_image_file" name="image_files[]" type="file" multiple accept="image/jpeg,image/png,image/webp" data-photo-file>
                      <span class="pw-photo-icon"><?= $pwIcon('camera') ?></span>
                      <strong>Add property photos</strong>
                      <span>Choose a cover photo</span>
                      <small data-photo-file-name hidden></small>
                    </label>
                    <div class="pw-photo-empty-slots" aria-hidden="true">
                      <div class="pw-photo-slot"><?= $pwIcon('photo') ?></div>
                      <div class="pw-photo-slot"><?= $pwIcon('photo') ?></div>
                    </div>
                  </div>
                  <p class="pw-photo-feedback" data-photo-feedback role="status" hidden></p>
                </div>
              </div>
            </article>

            <!-- CARD 2: LISTING & PRICE -->
            <article class="pw-card pw-section-card" data-section="details">
              <div class="pw-section-header">
                <div>
                  <h3 class="pw-section-title">Listing &amp; price</h3>
                </div>
              </div>

              <!-- Listing purpose segmented toggle -->
              <div class="pw-field pw-full">
                <span class="pw-field-label">Listing type <span class="pw-required-indicator" aria-hidden="true">*</span></span>
                <div class="pw-purpose-segmented" role="radiogroup" aria-label="Listing type">
                  <label class="pw-purpose-seg-btn is-active" data-purpose-card="sale">
                    <input type="radio" name="listing_purpose" value="sale" checked>
                    <span><?= $pwIcon('tag') ?> For sale</span>
                  </label>
                  <label class="pw-purpose-seg-btn" data-purpose-card="lease">
                    <input type="radio" name="listing_purpose" value="lease">
                    <span><?= $pwIcon('document') ?> For lease</span>
                  </label>
                  <label class="pw-purpose-seg-btn" data-purpose-card="sale_or_lease">
                    <input type="radio" name="listing_purpose" value="sale_or_lease">
                    <span><?= $pwIcon('arrow') ?> Sale or lease</span>
                  </label>
                </div>
              </div>

              <!-- Pricing section (data-section="pricing") -->
              <div class="pw-fields" data-section="pricing">
                <!-- Sale asking price block -->
                <div class="pw-field pw-full pw-pricing-block" data-sale-price-fields>
                  <div class="pw-price-visibility-calc-grid">
                    <div class="pw-field">
                      <label class="pw-field-label" for="pwAskingPrice">Total asking price <span class="pw-required-indicator" aria-hidden="true">*</span></label>
                      <div class="pw-input-group pw-price-currency-group">
                        <span>₱</span>
                        <input id="pwAskingPrice" name="price" type="text" inputmode="numeric" maxlength="25" placeholder="10,000,000" autocomplete="off" data-price-input>
                      </div>
                    </div>

                    <div class="pw-field">
                      <span class="pw-field-label">Price visibility</span>
                      <select name="sale_price_mode" class="pw-select">
                        <option value="amount" selected>Show price</option>
                        <option value="request">Price on inquiry</option>
                      </select>
                    </div>

                    <div class="pw-calculated-price-box" data-calculated-price-box>
                      <strong class="pw-calc-price-val" data-calc-price-val>Calculated price: &mdash;</strong>
                      <small class="pw-muted">Based on the entered asking price and land area.</small>
                    </div>
                  </div>

                  <div class="pw-price-options-row">
                    <label class="pw-negotiable-option" for="pwSaleNegotiable">
                      <input type="checkbox" name="is_negotiable" value="1" id="pwSaleNegotiable" data-sale-negotiable>
                      <span>Price is negotiable</span>
                    </label>
                  </div>
                  <small class="pw-muted pw-price-subnote">Sale and lease terms are recorded separately.</small>
                </div>

                <!-- Lease asking price block -->
                <div class="pw-field pw-full pw-pricing-block pw-lease-block" data-lease-price-fields hidden>
                  <div class="pw-price-visibility-calc-grid">
                    <div class="pw-field">
                      <span class="pw-field-label">Rental asking price <span class="pw-required-indicator" aria-hidden="true">*</span></span>
                      <div class="pw-input-group pw-price-currency-group">
                        <span>₱</span>
                        <input id="pwLeasePrice" name="lease_price" type="text" inputmode="numeric" maxlength="25" placeholder="50,000" autocomplete="off" data-price-input>
                      </div>
                    </div>
                    <div class="pw-field">
                      <span class="pw-field-label">Rent visibility</span>
                      <select name="lease_price_mode" class="pw-select">
                        <option value="amount" selected>Show price</option>
                        <option value="request">Price on inquiry</option>
                      </select>
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
                        <span>Pricing unit</span>
                        <select name="lease_price_unit">
                          <option value="total">Total rent</option>
                          <option value="sqm">Per m&sup2;</option>
                        </select>
                      </label>
                    </div>
                  </div>
                  <label class="pw-negotiable-option" for="pwLeaseNegotiable">
                    <input type="checkbox" name="lease_negotiable" value="1" id="pwLeaseNegotiable" data-lease-negotiable>
                    <span>Rent is negotiable</span>
                  </label>
                  <p class="pw-rent-summary" data-lease-price-summary role="status">Enter rent and choose how it is billed.</p>
                </div>
              </div>
            </article>

            <!-- CARD 3: LOCATION & AREA -->
            <article class="pw-card pw-section-card">
              <div class="pw-section-header">
                <div>
                  <h3 class="pw-section-title">Location &amp; area</h3>
                </div>
              </div>

              <div class="pw-fields">
                <!-- Row 1: Barangay & Land area -->
                <div class="pw-grid-2-col pw-full">
                  <!-- Searchable Barangay -->
                  <div class="pw-field pw-barangay-combobox" data-barangay-combobox>
                    <span class="pw-field-label">
                      <span>Barangay <small class="pw-muted">&middot; optional</small></span>
                      <span class="pw-barangay-psgc-tag" data-barangay-psgc-tag hidden>PSGC</span>
                    </span>
                    <input type="hidden" name="barangay" id="pwBarangayHidden" data-barangay-hidden>
                    <input type="hidden" name="barangay_psgc" id="pwBarangayPsgcHidden" data-barangay-psgc-hidden>

                    <div class="pw-barangay-input-box" data-barangay-input-box>
                      <span class="pw-barangay-box-icon"><?= $pwIcon('pin') ?></span>
                      <input type="text" class="pw-barangay-text-input" id="pwBarangayTextInput" placeholder="Select barangay" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="pwBarangayDropdown">
                      <button type="button" class="pw-barangay-clear-trigger" data-barangay-clear-btn title="Clear barangay selection" aria-label="Clear selection" hidden>&times;</button>
                      <button type="button" class="pw-barangay-dropdown-trigger" data-barangay-toggle-btn tabindex="-1" aria-label="Toggle barangay list"><?= $pwIcon('chevron') ?></button>
                    </div>

                    <!-- Dropdown Menu with Recents and Full 59 Alphabetical List -->
                    <div class="pw-barangay-menu" id="pwBarangayDropdown" role="listbox" hidden>
                      <div class="pw-barangay-recents-wrap" data-barangay-recents-wrap hidden>
                        <div class="pw-barangay-menu-title"><span>Recently Selected</span></div>
                        <div class="pw-barangay-recent-pills" data-barangay-recent-pills></div>
                      </div>
                      <div class="pw-barangay-list-wrap">
                        <div class="pw-barangay-menu-title"><span data-barangay-menu-count>San Fernando City (59 Barangays)</span></div>
                        <div class="pw-barangay-scroll-list" data-barangay-scroll-list tabindex="-1"></div>
                      </div>
                      <div class="pw-barangay-no-results" data-barangay-no-results hidden>
                        <?= $pwIcon('info') ?>
                        <p>No matching barangay in San Fernando City</p>
                        <small>Only official barangays within San Fernando City, La Union are valid.</small>
                      </div>
                    </div>
                  </div>

                  <!-- Land area -->
                  <div class="pw-field">
                    <span class="pw-field-label">Land area <small class="pw-muted">&middot; if known</small></span>
                    <div class="pw-input-group pw-basics-area-control">
                      <input name="declared_area_sqm" id="pwDeclaredAreaInput" type="number" step="any" min="0" placeholder="1,000" autocomplete="off" class="pw-input-prominent">
                      <select name="basics_area_unit" data-basics-area-unit aria-label="Land area unit"><option value="sqm">m²</option><option value="hectares">ha</option></select>
                    </div>
                    <small class="pw-muted" data-basics-area-equivalent>Choose m² or hectares.</small>
                  </div>
                </div>

                <small class="pw-muted pw-full">Add a property pin or draw a boundary in the next step. You can also confirm whether the area is declared or supported by a property record.</small>

                <!-- Short description -->
                <div class="pw-field pw-full" style="margin-top:14px;">
                  <div class="pw-label-row">
                    <span class="pw-field-label">Short description</span>
                  </div>
                  <textarea name="description" id="pwDescriptionInput" rows="3" maxlength="500" placeholder="Vacant lot offered for sale. Access, utilities, zoning, and hazard information will be recorded separately..." autocomplete="off"></textarea>
                  <div class="pw-char-counter"><span data-char-count>0</span>/500</div>
                </div>

                <!-- Classification, Subtype & Availability Status -->
                <div class="pw-grid-3-col pw-taxonomy-compact-row pw-full" style="margin-top:14px;">
                  <label class="pw-field">
                    <span class="pw-label-inline">Property type <span class="pw-required-indicator" aria-hidden="true">*</span></span>
                    <select name="category" required data-property-category-select>
                      <?php foreach (\App\Support\PropertyCatalog::categories() as $pwCategory => $pwSubcategories): $pwTip = \App\Support\PropertyCatalog::categoryTooltips()[$pwCategory] ?? ''; ?>
                      <option value="<?= $pwEscape($pwCategory) ?>" data-tooltip="<?= $pwEscape($pwTip) ?>"<?= $pwCategory === 'Land' ? ' selected' : '' ?>><?= $pwEscape($pwCategory) ?></option>
                      <?php endforeach; ?>
                    </select>
                  </label>

                  <div class="pw-field" data-property-subtype-field>
                    <span class="pw-field-label" id="pwSubtypeLabel">Property classifications <span class="pw-required-indicator" aria-hidden="true">*</span></span>
                    <select name="subcategory" required data-property-subtype-select>
                      <option value="">Select classification...</option>
                      <?php foreach (\App\Support\PropertyCatalog::categories()['Land'] as $pwSubtype): ?>
                      <option value="<?= $pwEscape($pwSubtype) ?>"><?= $pwEscape($pwSubtype) ?></option>
                      <?php endforeach; ?>
                    </select>
                  </div>

                  <label class="pw-field">
                    <span class="pw-field-label">Availability status <span class="pw-required-indicator" aria-hidden="true">*</span></span>
                    <select name="status">
                      <option value="Available">Available</option>
                      <option value="Unavailable">Unavailable</option>
                      <option value="Reserved">Reserved</option>
                      <option value="Sold">Sold</option>
                      <option value="Leased">Leased</option>
                    </select>
                  </label>
                </div>

                <!-- Additional classifications popover -->
                <div class="pw-field pw-full" data-subcategory-wrapper style="margin-top:8px;">
                  <div class="pw-label-row"><span>Additional classifications <small class="pw-muted">&middot; optional</small></span><span class="pw-muted" data-subcategory-count>Optional</span></div>
                  <small class="pw-muted">Describe the property. Official zoning is recorded separately in Assessment.</small>
                  <div class="pw-select-wrapper">
                    <button type="button" class="pw-select-trigger" data-subcategory-trigger aria-expanded="false" aria-controls="pwAdditionalOptions">
                      <span data-subcategory-trigger-text>Select subcategories...</span>
                      <svg class="pw-icon" data-subcategory-caret viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    <div class="pw-subcategory-popover tw-hidden" id="pwAdditionalOptions" data-subcategory-popover>
                      <div class="pw-label-row"><strong>Other listing descriptors</strong><button type="button" class="pw-text-button" data-subcategory-clear-all>Clear selection</button></div>
                      <label class="pw-classification-search">Filter classifications<input type="search" data-classification-search placeholder="Search classifications…" autocomplete="off"></label>
                      <div class="pw-subcategory-grid" data-subcategory-grid></div>
                      <p class="pw-muted pw-small">Choose only what describes the property. These labels do not establish zoning permission or increase its score.</p>
                    </div>
                  </div>
                  <div class="pw-subcategory-tags" data-subcategory-tags></div>
                  <input type="hidden" name="additional_subcategories" data-subcategory-input>
                </div>

                <!-- Contact & Representation Details (Optional Disclosure) -->
                <details class="pw-disclosure pw-contact-disclosure pw-full" style="margin-top:14px;">
                  <summary><?= $pwIcon('text') ?><span>Contact &amp; enquiry details <span class="pw-muted">&middot; optional</span></span><?= $pwIcon('chevron') ?></summary>
                  <div class="pw-fields pw-contact-fields-body">
                    <label class="pw-field pw-full">Who handles enquiries?<select name="contactBrokerUserId"><option value="">City listing desk</option></select><small class="pw-muted">Choose the city desk or an approved broker to receive enquiries.</small></label>
                    <label class="pw-field">Contact name<input name="owner_name" maxlength="150" autocomplete="name" placeholder="e.g. Maria Santos"></label>
                    <label class="pw-field">Primary phone<input name="owner_phone" type="tel" maxlength="40" autocomplete="tel" placeholder="e.g. +63 917 123 4567"></label>
                    <label class="pw-field pw-full">Email<input name="owner_email" type="email" maxlength="190" autocomplete="email" placeholder="e.g. contact@example.com"></label>
                    <div class="pw-contact-channels pw-full"><div class="pw-label-row"><strong>Additional phone numbers</strong><span class="pw-muted">Up to 4</span></div><div data-contact-phone-rows></div><button type="button" class="pw-text-button" data-add-contact-phone>+ Add phone number</button></div>
                    <div class="pw-contact-channels pw-full"><div class="pw-label-row"><strong>Social accounts &amp; websites</strong><span class="pw-muted">Up to 4</span></div><small class="pw-muted">Paste a full account or business page link.</small><div data-contact-social-rows></div><button type="button" class="pw-text-button" data-add-contact-social>+ Add social link</button></div>
                    <input type="hidden" name="owner_additional_phones" value="[]"><input type="hidden" name="owner_social_links" value="[]">
                  </div>
                </details>
              </div>
            </article>
          </div>

          <!-- RIGHT COLUMN: INVESTOR PREVIEW & BEFORE YOU CONTINUE -->
          <aside class="pw-basics-aside">
            <!-- Card 1: Investor preview -->
            <div class="pw-card pw-investor-preview-card" data-preview-disclosure>
              <div class="pw-preview-head-row">
                <div class="pw-preview-title-wrap">
                  <svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  <strong>Investor preview</strong>
                </div>
              </div>

              <!-- Preview Card Inner -->
              <div class="pw-preview-box-main">
                <div class="pw-preview-cover-wrap">
                  <span class="pw-preview-type-pill" data-preview-purpose>For sale</span>
                  <div class="pw-preview-cover-placeholder" data-photo-preview>
                    <svg class="pw-icon pw-cover-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    <span>Cover photo appears here</span>
                  </div>
                </div>

                <div class="pw-preview-body">
                  <h4 class="pw-preview-name" data-preview-name>Sample commercial lot</h4>
                  <p class="pw-preview-subname" data-preview-subname hidden></p>

                  <div class="pw-preview-location-line" data-preview-location-badge>
                    <svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span data-preview-barangay-display>Barangay not selected &middot; San Fernando City, La Union</span>
                  </div>

                  <div class="pw-preview-price-row">
                    <strong class="pw-preview-price-val" data-preview-price>₱10,000,000</strong>
                    <span class="pw-preview-draft-pill" data-preview-approval-state>Draft listing</span>
                    <span class="pw-badge pw-badge-sky pw-preview-negotiable-badge" data-preview-negotiable-badge hidden>Negotiable</span>
                    <span class="pw-badge" data-preview-category hidden><span>Land</span></span>
                    <span class="pw-badge" data-preview-status hidden><span>Available</span></span>
                  </div>

                  <div class="pw-preview-stats-grid">
                    <div class="pw-preview-stat-item">
                      <span>Land area</span>
                      <strong data-preview-area-val>1,000 m²</strong>
                    </div>
                    <div class="pw-preview-stat-item">
                      <span>Area basis</span>
                      <strong data-preview-area-basis>Declared &middot; Unverified</strong>
                    </div>
                    <div class="pw-preview-stat-item">
                      <span data-preview-unit-price-label>Price per m²</span>
                      <strong data-preview-sqm-price>₱10,000</strong>
                    </div>
                  </div>

                  <p class="pw-preview-desc-snippet" data-preview-desc-snippet>Vacant lot offered for sale. Access, utilities, zoning, and hazard information will be recorded separately.</p>

                  <button type="button" class="pw-preview-view-btn" disabled>
                    <svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    View property
                  </button>

                  <p class="pw-preview-bottom-caption">Only verified assessment results will appear later.</p>
                </div>
              </div>
            </div>

            <!-- Card 2: Before you continue -->
            <div class="pw-card pw-before-continue-card">
              <div class="pw-before-head">
                <svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                <strong>Before you continue</strong>
              </div>
              <div class="pw-before-checklist">
                <div class="pw-before-check-item" data-check-item="essentials">
                  <span class="pw-check-bullet" data-check-icon="essentials">&#10003;</span>
                  <span>Enter title, barangay, and land area</span>
                </div>
                <div class="pw-before-check-item" data-check-item="price">
                  <span class="pw-check-bullet is-checked" data-check-icon="price">&#10003;</span>
                  <span>Add a price or select Price on inquiry</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <section class="pw-panel pw-step2-panel" data-editor-panel="1" hidden>
        <div class="pw-coordinate-warning" data-city-coverage-warning role="alert" hidden><strong>This pin is outside San Fernando's supported map coverage.</strong><p>Check the coordinates or search for the correct barangay. You can clear the pin and continue with a declared area; local hazard, zoning, and nearby results stay unavailable for this location.</p><button type="button" class="pw-button pw-button-light pw-button-small" data-clear-location>Clear incorrect pin</button></div>
        <div class="pw-step2-card">
          <!-- Step 2 Header -->
          <div class="pw-step2-header">
            <div class="pw-step2-heading-group">
              <span class="pw-step2-eyebrow">STEP 2 OF 4</span>
              <h3 class="pw-step2-title">Property Location &amp; Boundary</h3>
              <p class="pw-step2-subtitle">Locate the property and outline its boundaries.</p>
            </div>
            <button type="button" class="pw-locate-me-btn" data-use-device-location title="Locate using GPS" aria-label="Use current device location">
              <?= $pwIcon('target') ?>
            </button>
          </div>

          <!-- Hidden compatibility elements required by tests and search datalists -->
          <datalist id="pwBarangayOptions">
            <?php foreach (\App\Support\PropertyCatalog::barangays() as $pwBgyName => $pwBgyInfo): ?>
            <option value="<?= $pwEscape($pwBgyName) ?>"><?= $pwEscape($pwBgyName . ' · ' . ($pwBgyInfo['district'] ?? 'San Fernando')) ?></option>
            <?php endforeach; ?>
          </datalist>
          <span data-coordinate-summary-text hidden>Enter exact coordinates</span>
          <input type="hidden" data-coordinate-pair>

          <!-- 1. LOCATE THE PROPERTY -->
          <div class="pw-step2-section">
            <div class="pw-sec-title-wrap">
              <h4 class="pw-sec-heading">1. Locate the property</h4>
              <p class="pw-sec-subheading">Enter coordinates or place a pin to locate the property directly on the map.</p>
            </div>

            <!-- Direct Latitude & Longitude Inputs with Barangay Context -->
            <div class="pw-coord-inputs-grid">
              <div class="pw-coord-field">
                <label for="pwLatInput" class="pw-coord-label">Latitude</label>
                <input id="pwLatInput" name="lat" type="number" step="any" min="-90" max="90" placeholder="16.617308" inputmode="decimal" class="pw-coord-input" aria-label="Latitude in signed decimal degrees (-90 to 90)">
              </div>
              <div class="pw-coord-field">
                <label for="pwLngInput" class="pw-coord-label">Longitude</label>
                <input id="pwLngInput" name="lng" type="number" step="any" min="-180" max="180" placeholder="120.324169" inputmode="decimal" class="pw-coord-input" aria-label="Longitude in signed decimal degrees (-180 to 180)">
              </div>
            </div>

            <!-- Coordinate Validation Banner -->
            <button type="button" class="pw-button pw-button-light pw-button-small" data-coordinate-apply>Apply coordinates to map</button>
            <p class="pw-coord-error-banner" data-coordinate-error role="alert" hidden></p>

            <!-- Geographic Extent Warning Banner -->
            <div class="pw-extent-warning-box" data-extent-warning role="alert" style="margin-top: 10px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; color: #92400e; font-size: 12px; display: none;">
              <strong>Geographic Extent Warning:</strong>
              <span data-extent-warning-text>Coordinates lie outside San Fernando City municipal coverage extent (16.54°N–16.72°N, 120.26°E–120.45°E). Local GIS hazard layers, business radar, and official CLUP zoning clearance cannot be evaluated and are withheld for locations outside city coverage.</span>
            </div>

            <!-- Reused Barangay from Step 1 & Proximity Conflict Warning -->
            <div class="pw-bgy-context-row">
              <div class="pw-reused-bgy-chip">
                <?= $pwIcon('pin') ?>
                <span>Selected barangay: <strong data-reused-barangay-display>Not set</strong> <span class="pw-muted">(from Step 1)</span></span>
              </div>
              <div class="pw-bgy-conflict-alert" data-bgy-conflict-alert role="alert" hidden>
                <?= $pwIcon('warning') ?>
                <div class="pw-bgy-conflict-content">
                  <span data-bgy-conflict-text></span>
                  <button type="button" class="pw-btn-reconcile-bgy" data-bgy-reconcile-btn>Reconcile to pin barangay</button>
                </div>
              </div>
            </div>

            <!-- Interactive Property Map Container -->
            <div class="pw-map-card-container" data-location-map-card>
              <div class="pw-map-card-header">
                <div class="pw-map-header-left">
                  <strong class="pw-map-title">Interactive Property Map</strong>
                  <span class="pw-map-credit">Satellite &amp; street views</span>
                </div>
                <div class="pw-map-header-right">
                  <div class="pw-search-compact">
                    <?= $pwIcon('search') ?>
                    <input id="adminLocationSearch" type="search" maxlength="160" data-location-search placeholder="Search address, landmark..." aria-label="Search barangay, address, or coordinates" aria-controls="pwLocationResults" autocomplete="off">
                    <button type="button" data-location-search-button aria-label="Search location">Search</button>
                  </div>
                  <select data-map-style="location" class="pw-select-sm" aria-label="Map style">
                    <option value="streets">Streets</option>
                    <option value="satellite" selected>Satellite</option>
                  </select>
                </div>
              </div>

              <!-- Streamlined Map Controls placed ABOVE map canvas for immediate accessibility without scrolling -->
              <div class="pw-map-toolbar-pill" role="toolbar" aria-label="Map tools">
                <button type="button" class="pw-tool-pill is-active" data-map-tool="pin" aria-pressed="true">
                  <?= $pwIcon('pin') ?> Place Pin
                </button>
                <button type="button" class="pw-tool-pill" data-boundary-action="draw">
                  <?= $pwIcon('boundary') ?> Draw Boundary
                </button>
                <button type="button" class="pw-tool-pill" data-boundary-action="edit" disabled>
                  <?= $pwIcon('edit') ?> Edit Boundary
                </button>
                <button type="button" class="pw-tool-pill pw-tool-danger" data-boundary-action="reset" disabled>
                  <?= $pwIcon('reset') ?> Clear Boundary
                </button>
                <button type="button" class="pw-tool-pill pw-tool-secondary" data-boundary-action="coords-view" title="View or edit exact vertex coordinates">
                  <?= $pwIcon('document') ?> Coordinates
                </button>
              </div>

              <div class="pw-location-results" id="pwLocationResults" data-location-results role="region" aria-label="Location search results" aria-live="polite"></div>

              <div class="pw-map-shell">
                <div class="pw-map" data-location-map aria-label="Pin the property location or draw an optional plot boundary"></div>
              </div>

              <p class="pw-map-status-line" data-location-status role="status">Click the map or enter coordinates above to position the property marker.</p>
              <p class="pw-map-feedback" data-map-feedback="location" role="status" hidden></p>

              <!-- Optional Manual Polygon Vertex Coordinates Drawer -->
              <div class="pw-vertex-editor-drawer" data-vertex-drawer hidden>
                <div class="pw-vertex-drawer-head">
                  <h5>Boundary Polygon Coordinates</h5>
                  <button type="button" class="pw-btn-close-sm" data-close-vertex-drawer aria-label="Close coordinates drawer">&times;</button>
                </div>
                <p class="pw-small pw-muted">Exact vertices in signed decimal degrees (WGS84):</p>
                <div class="pw-vertex-list" data-vertex-list></div>
                <div class="pw-vertex-actions">
                  <button type="button" class="pw-button pw-button-light pw-button-small" data-apply-vertices>Apply Polygon Vertices</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. PROPERTY LAND AREA -->
          <div class="pw-step2-section pw-area-section">
            <div class="pw-sec-title-wrap">
              <h4 class="pw-sec-heading">2. Property land area</h4>
              <p class="pw-sec-subheading">Enter the recorded measurement, or draw a boundary to estimate the area.</p>
            </div>

            <div class="pw-area-inputs-row">
              <div class="pw-area-input-composite">
                <input id="pwLandArea" name="land_area" type="number" step="any" min="0.0001" placeholder="e.g. 5900" data-area-input class="pw-area-numeric-input">
                <select name="land_area_unit" data-area-unit class="pw-area-unit-dropdown" aria-label="Area unit">
                  <option value="sqm">m&sup2; / sqm</option>
                  <option value="hectares">hectares (ha)</option>
                </select>
              </div>
              <div class="pw-area-method-wrap">
                <select name="area_method" class="pw-area-method-select" aria-label="Measurement source">
                  <option value="declared">Declared area</option>
                  <option value="survey">Survey / property record</option>
                </select>
              </div>
            </div>

            <!-- Example measurement equivalents card -->
            <div class="pw-area-equivalents-card">
              <span class="pw-equiv-title">Example measurement equivalents</span>
              <div class="pw-equiv-formula" data-area-equiv-display>5,900 m&sup2; = 0.59 ha</div>
              <p class="pw-equiv-footnote">A boundary-generated area should appear separately as a map estimate.</p>
            </div>

            <!-- Separate Map-Estimated Area Card -->
            <div class="pw-map-estimate-card" data-boundary-estimate hidden>
              <div class="pw-estimate-card-top">
                <span class="pw-estimate-label">Drawn Boundary Estimate</span>
                <span class="pw-badge pw-badge-teal">Calculated</span>
              </div>
              <div class="pw-estimate-values">
                <strong class="pw-estimate-sqm" data-calculated-area>&mdash;</strong> <span class="pw-unit-label">m&sup2;</span>
                <span class="pw-estimate-ha">&asymp; <span data-calculated-hectares>&mdash;</span> ha</span>
              </div>
              <p class="pw-estimate-note"><?= $pwIcon('info') ?> Polygon-derived area is an estimate, not a legally surveyed measurement.</p>
            </div>

            <!-- Discrepancy Flag Banner -->
            <div class="pw-discrepancy-banner" data-area-discrepancy-card hidden role="alert">
              <?= $pwIcon('warning') ?>
              <div class="pw-discrepancy-body">
                <strong data-discrepancy-headline>Area Discrepancy Flagged</strong>
                <p data-discrepancy-message></p>
                <div class="pw-discrepancy-actions" style="margin-top: 8px;">
                  <button type="button" class="pw-btn-subtle-sm" data-jump-review-boundary>Review area &amp; boundary</button>
                </div>
              </div>
            </div>

            <!-- Suspicious Property Area (0.5 m²) Reconciliation Alert -->
            <div class="pw-discrepancy-banner pw-discrepancy-warning" data-suspicious-area-banner hidden role="alert" style="margin-top: 10px; border-left: 4px solid #B91C1C; background: #FEF2F2;">
              <?= $pwIcon('warning') ?>
              <div class="pw-discrepancy-body">
                <strong style="color: #991B1B;">Suspicious Recorded Property Area (0.5 m²)</strong>
                <p style="color: #7F1D1D; margin: 4px 0 0; font-size: 12px;">Recorded area is 0.5 m². This often occurs when 0.5 hectares (5,000 m²) was intended. Please verify the recorded area and unit to avoid skewed valuations.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="pw-panel" data-editor-panel="2" hidden>
        <!-- Unified Step 3 Command Center Header -->
        <div class="pw-section-intro pw-evidence-intro">
          <div class="pw-evidence-intro-main">
            <div class="pw-evidence-intro-text">
              <div class="pw-evidence-eyebrow-row">
                <span class="pw-eyebrow">STEP 3 OF 4 &middot; MULTI-CRITERIA EVALUATION (LOCUS-SF)</span>
                <span class="pw-badge pw-badge-weight">5 numerical criteria &middot; 100% total weight + Mandatory Zoning Gate</span>
              </div>
              <h3>Property assessment</h3>
              <p>Enter site facts to see live results. Add supporting records when available.</p>
            </div>
            <div class="pw-evidence-intro-actions">
              <button type="button" class="pw-button pw-button-light pw-button-small pw-evidence-fast-forward-btn" data-skip-enrichment title="Skip site evidence and proceed directly to Review">
                <span>Skip to Review</span> <?= $pwIcon('arrow') ?>
              </button>
              <div class="pw-evidence-status-pill">
                <span class="pw-badge pw-badge-sky" data-completeness-badge><span data-completeness-count>0 of 5</span> criteria</span>
                <small class="pw-muted">Evidence entered &middot; verification separate</small>
              </div>
            </div>
          </div>
        </div>

        <details class="pw-disclosure pw-evidence-editor" data-evidence-editor open>
          <summary class="pw-evidence-summary pw-visually-hidden">
            <span>Site details &amp; assessment workspace</span>
          </summary>

          <!-- Site Evidence 6-Criterion Workspace -->
          <div class="pw-evidence-workspace">
            <!-- Criterion Navigation: Desktop Tabs + Mobile Accessible Select -->
            <div class="pw-criteria-nav-bar">
              <!-- Mobile Criterion Selector -->
              <div class="pw-criteria-mobile-picker">
                <label for="pwCriteriaMobileSelect" class="pw-sr-only">Choose assessment criterion</label>
                <select id="pwCriteriaMobileSelect" class="pw-criteria-select-mobile" data-criteria-mobile-select>
                  <option value="spatial_accessibility">1. Spatial accessibility (25%)</option>
                  <option value="infrastructure_readiness">2. Infrastructure readiness (25%)</option>
                  <option value="economic_viability">3. Property cost &amp; market competitiveness (20%)</option>
                  <option value="nearby_businesses">4. Nearby businesses (15%)</option>
                  <option value="risk_constraints">5. Risk constraints (15%)</option>
                  <option value="zoning_compatibility">6. CLUP &amp; Land-Use Screening (Mandatory Gate)</option>
                  <option value="authority_to_sell" class="pw-broker-only-option" <?= $pwUserRole !== 'seller' ? 'style="display:none;" disabled' : '' ?>>7. Authority to Sell / Lease (Broker req.)</option>
                </select>
              </div>

              <!-- Desktop Horizontal Criteria Tablist -->
              <div class="pw-tabs pw-criteria-tabs" role="tablist" aria-label="Assessment criteria">
                <button class="pw-criterion-tab is-active" type="button" role="tab" aria-selected="true" aria-controls="pwCriterionSpatial" data-evidence-tab="spatial_accessibility">
                  <span class="pw-crit-num">1</span>
                  <span class="pw-crit-content">
                    <span class="pw-crit-title">Spatial access</span>
                    <span class="pw-crit-weight">25% weight</span>
                  </span>
                </button>
                <button class="pw-criterion-tab" type="button" role="tab" aria-selected="false" aria-controls="pwCriterionInfrastructure" data-evidence-tab="infrastructure_readiness">
                  <span class="pw-crit-num">2</span>
                  <span class="pw-crit-content">
                    <span class="pw-crit-title">Infrastructure</span>
                    <span class="pw-crit-weight">25% weight</span>
                  </span>
                </button>
                <button class="pw-criterion-tab" type="button" role="tab" aria-selected="false" aria-controls="pwCriterionEconomic" data-evidence-tab="economic_viability">
                  <span class="pw-crit-num">3</span>
                  <span class="pw-crit-content">
                    <span class="pw-crit-title">Cost &amp; Market</span>
                    <span class="pw-crit-weight">20% weight</span>
                  </span>
                </button>
                <button class="pw-criterion-tab" type="button" role="tab" aria-selected="false" aria-controls="pwCriterionNearby" data-evidence-tab="nearby_businesses">
                  <span class="pw-crit-num">4</span>
                  <span class="pw-crit-content">
                    <span class="pw-crit-title">Nearby places</span>
                    <span class="pw-crit-weight">15% weight</span>
                  </span>
                </button>
                <button class="pw-criterion-tab" type="button" role="tab" aria-selected="false" aria-controls="pwCriterionRisks" data-evidence-tab="risk_constraints">
                  <span class="pw-crit-num">5</span>
                  <span class="pw-crit-content">
                    <span class="pw-crit-title">Risk &amp; hazards</span>
                    <span class="pw-crit-weight">15% weight</span>
                  </span>
                </button>
                <button class="pw-criterion-tab" type="button" role="tab" aria-selected="false" aria-controls="pwCriterionZoning" data-evidence-tab="zoning_compatibility">
                  <span class="pw-crit-num">6</span>
                  <span class="pw-crit-content">
                    <span class="pw-crit-title">CLUP Zoning</span>
                    <span class="pw-crit-weight">Eligibility Gate</span>
                  </span>
                </button>
                <button class="pw-criterion-tab pw-broker-only-tab" type="button" role="tab" aria-selected="false" aria-controls="pwCriterionAuthority" data-evidence-tab="authority_to_sell" <?= $pwUserRole !== 'seller' ? 'style="display:none;" hidden' : '' ?>>
                  <span class="pw-crit-num">7</span>
                  <span class="pw-crit-content">
                    <span class="pw-crit-title" data-authority-tab-title>Authority to Sell</span>
                    <span class="pw-crit-weight">Broker req.</span>
                  </span>
                </button>
              </div>
            </div>

          <!-- 1. SPATIAL ACCESSIBILITY PANE -->
          <div id="pwCriterionSpatial" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="spatial_accessibility">
            <div class="pw-spatial-card">
              <!-- Card Header matching executive design system -->
              <div class="pw-spatial-header">
                <div class="pw-spatial-heading-group">
                  <div class="pw-spatial-eyebrow-row">
                    <span class="pw-spatial-eyebrow">CRITERION 1 &middot; MULTI-CRITERIA EVALUATION</span>
                  </div>
                  <h3 class="pw-spatial-title">Spatial Accessibility</h3>
                  <p class="pw-spatial-subtitle">Step 3 &middot; MCE Assessment</p>
                </div>
                <div class="pw-spatial-header-badges">
                  <span class="pw-badge pw-badge-provisional"><span class="pw-spatial-pulse-dot"></span> Provisional model</span>
                  <span class="pw-badge pw-badge-weight">25% of MCE</span>
                </div>
              </div>

              <!-- Reused Location Context Banner from Step 2 -->
              <div class="pw-reused-banner" data-spatial-reused-banner>
                <span class="pw-reused-icon"><?= $pwIcon('pin') ?></span>
                <div class="pw-reused-content">
                  <div class="pw-reused-header-row">
                    <span class="pw-reused-label">Reused location data from Step 2</span>
                    <span class="pw-reused-verified-pill"><?= $pwIcon('check') ?> Synced from map</span>
                  </div>
                  <div class="pw-reused-chips">
                    <span class="pw-reused-chip"><span class="pw-reused-chip-lbl">Coordinates:</span> <strong data-reused-coords>16.6150° N, 120.3160° E</strong></span>
                    <span class="pw-reused-chip"><span class="pw-reused-chip-lbl">Barangay:</span> <strong data-reused-barangay>San Fernando</strong></span>
                    <span class="pw-reused-chip"><span class="pw-reused-chip-lbl">Recorded area:</span> <strong data-reused-area>2,500 m²</strong></span>
                  </div>
                  <p class="pw-reused-details" style="display:none;" hidden>
                    Coordinates: <strong data-reused-coords-legacy>16.6150° N, 120.3160° E</strong> &middot; 
                    Barangay: <strong data-reused-barangay-legacy>San Fernando</strong> &middot; 
                    Recorded area: <strong data-reused-area-legacy>2,500 m²</strong>
                  </p>
                </div>
              </div>

              <!-- Spatial Accessibility Indicator Tracker Ribbon -->
              <div class="pw-spatial-utility-ribbon" role="region" aria-label="Spatial accessibility summary">
                <div class="pw-spatial-utility-pill" data-spatial-status-pill="road_access">
                  <span class="pw-spatial-pill-icon pw-spatial-icon-access"><?= $pwIcon('road') ?></span>
                  <div class="pw-spatial-pill-meta">
                    <span class="pw-spatial-pill-name">Road Access</span>
                    <span class="pw-spatial-pill-weight">30% weight</span>
                  </div>
                  <span class="pw-spatial-pill-status" data-spatial-chip-status="road_access">Active</span>
                </div>
                <div class="pw-spatial-utility-pill" data-spatial-status-pill="road_surface_passability">
                  <span class="pw-spatial-pill-icon pw-spatial-icon-surface"><?= $pwIcon('layers') ?></span>
                  <div class="pw-spatial-pill-meta">
                    <span class="pw-spatial-pill-name">Road Surface</span>
                    <span class="pw-spatial-pill-weight">25% weight</span>
                  </div>
                  <span class="pw-spatial-pill-status" data-spatial-chip-status="road_surface_passability">Active</span>
                </div>
                <div class="pw-spatial-utility-pill" data-spatial-status-pill="carriageway_width">
                  <span class="pw-spatial-pill-icon pw-spatial-icon-width"><?= $pwIcon('area') ?></span>
                  <div class="pw-spatial-pill-meta">
                    <span class="pw-spatial-pill-name">Carriageway</span>
                    <span class="pw-spatial-pill-weight">25% weight</span>
                  </div>
                  <span class="pw-spatial-pill-status" data-spatial-chip-status="carriageway_width">Active</span>
                </div>
                <div class="pw-spatial-utility-pill" data-spatial-status-pill="distance_to_major_road">
                  <span class="pw-spatial-pill-icon pw-spatial-icon-dist"><?= $pwIcon('target') ?></span>
                  <div class="pw-spatial-pill-meta">
                    <span class="pw-spatial-pill-name">Arterial Link</span>
                    <span class="pw-spatial-pill-weight">20% weight</span>
                  </div>
                  <span class="pw-spatial-pill-status" data-spatial-chip-status="distance_to_major_road">Active</span>
                </div>
              </div>

              <div class="pw-spatial-form-body">
                <!-- 1. Road Access (30%) -->
                <div class="pw-spatial-item" data-spatial-field-block="road_access">
                  <div class="pw-spatial-item-header">
                    <div class="pw-spatial-item-title-wrap">
                      <span class="pw-spatial-service-badge pw-spatial-badge-access"><?= $pwIcon('road') ?></span>
                      <div>
                        <label for="pwRoadAccess" class="pw-spatial-label">1. Road access</label>
                        <span class="pw-spatial-label-desc">Direct road frontage, documented right-of-way, or interior parcel access</span>
                      </div>
                    </div>
                    <div class="pw-spatial-item-badges">
                      <span class="pw-sub-weight">Weight: 30%</span>
                      <strong class="pw-sub-score" data-spatial-sub-score="road_access">100/100</strong>
                    </div>
                  </div>
                  <div class="pw-select-wrapper">
                    <select id="pwRoadAccess" name="road_access" class="pw-spatial-select" data-spatial-input="road_access">
                      <option value="" selected>Not recorded</option>
                      <option value="frontage">Direct road frontage</option>
                      <option value="right_of_way">Documented right-of-way</option>
                      <option value="no_access">No confirmed legal access</option>
                      <option value="unknown">Unknown / not yet verified</option>
                    </select>
                  </div>
                  <div class="pw-spatial-item-footer">
                    <span class="pw-spatial-item-hint">Legal road frontage required for heavy commercial &amp; logistics access</span>
                    <span class="pw-spatial-item-status-tag">Primary Ingress</span>
                  </div>
                </div>

                <!-- 2. Road Surface & Passability (25%) -->
                <div class="pw-spatial-item" data-spatial-field-block="road_surface_passability">
                  <div class="pw-spatial-item-header">
                    <div class="pw-spatial-item-title-wrap">
                      <span class="pw-spatial-service-badge pw-spatial-badge-surface"><?= $pwIcon('layers') ?></span>
                      <div>
                        <label for="pwRoadSurfacePassability" class="pw-spatial-label">2. Road surface and passability</label>
                        <span class="pw-spatial-label-desc">All-weather asphalt or concrete pavement, compacted gravel, or seasonal dirt</span>
                      </div>
                    </div>
                    <div class="pw-spatial-item-badges">
                      <span class="pw-sub-weight">Weight: 25%</span>
                      <strong class="pw-sub-score" data-spatial-sub-score="road_surface_passability">100/100</strong>
                    </div>
                  </div>
                  <div class="pw-select-wrapper">
                    <select id="pwRoadSurfacePassability" name="road_surface_passability" class="pw-spatial-select" data-spatial-input="road_surface_passability">
                      <option value="" selected>Not recorded</option>
                      <option value="paved">Paved and passable year-round</option>
                      <option value="gravel">Gravel / all-weather</option>
                      <option value="unpaved">Unpaved / seasonal</option>
                      <option value="impassable">Impassable</option>
                      <option value="unknown">Unknown / not yet verified</option>
                    </select>
                  </div>
                  <div class="pw-spatial-item-footer">
                    <span class="pw-spatial-item-hint">Year-round paved corridors prevent logistical disruption during wet season</span>
                    <span class="pw-spatial-item-status-tag">Passability Quality</span>
                  </div>
                </div>

                <!-- 3. Usable Carriageway Width (25%) -->
                <div class="pw-spatial-item" data-spatial-field-block="carriageway_width">
                  <div class="pw-spatial-item-header">
                    <div class="pw-spatial-item-title-wrap">
                      <span class="pw-spatial-service-badge pw-spatial-badge-width"><?= $pwIcon('area') ?></span>
                      <div>
                        <label for="pwCarriagewayWidth" class="pw-spatial-label">3. Usable carriageway width (meters)</label>
                        <span class="pw-spatial-label-desc">Clear roadway width accommodating two-way traffic or emergency vehicles (&ge;6m optimal)</span>
                      </div>
                    </div>
                    <div class="pw-spatial-item-badges">
                      <span class="pw-sub-weight">Weight: 25%</span>
                      <strong class="pw-sub-score" data-spatial-sub-score="carriageway_width">Incomplete</strong>
                    </div>
                  </div>
                  <div class="pw-input-wrapper">
                    <input id="pwCarriagewayWidth" name="carriageway_width" type="number" step="any" min="0" placeholder="e.g. 6" class="pw-spatial-input" data-spatial-input="carriageway_width">
                  </div>
                  <div class="pw-spatial-unmapped-note" data-spatial-road-unmapped-badge style="margin-top: 6px; font-size: 11px; color: #b45309;" hidden>
                    <?= $pwIcon('warning') ?> Road data unavailable &mdash; manual measurement required. Coordinates alone cannot establish road width, road surface, or legal frontage.
                  </div>
                  <div class="pw-spatial-item-footer">
                    <span class="pw-spatial-item-hint">6+ meters enables standard DPWH two-way traffic and heavy vehicle clearance</span>
                    <span class="pw-spatial-item-status-tag">DPWH Standard</span>
                  </div>
                </div>

                <!-- 4. Distance to Major Road (20%) -->
                <div class="pw-spatial-item" data-spatial-field-block="distance_to_major_road">
                  <div class="pw-spatial-item-header">
                    <div class="pw-spatial-item-title-wrap">
                      <span class="pw-spatial-service-badge pw-spatial-badge-dist"><?= $pwIcon('target') ?></span>
                      <div>
                        <label for="pwDistanceToMajorRoad" class="pw-spatial-label">4. Distance to major road (meters)</label>
                        <span class="pw-spatial-label-desc">Proximity to national highway, provincial road, or primary economic corridor</span>
                      </div>
                    </div>
                    <div class="pw-spatial-item-badges">
                      <span class="pw-sub-weight">Weight: 20%</span>
                      <strong class="pw-sub-score" data-spatial-sub-score="distance_to_major_road">85/100</strong>
                    </div>
                  </div>
                  <div class="pw-input-wrapper">
                    <input id="pwDistanceToMajorRoad" name="distance_to_major_road" type="number" step="any" min="0" placeholder="e.g. 250" class="pw-spatial-input" data-spatial-input="distance_to_major_road">
                  </div>
                  <p class="pw-spatial-note">The actual system should calculate this from verified road-network data where available; otherwise the distance is reported and pending verification.</p>
                  <div class="pw-spatial-item-footer">
                    <span class="pw-spatial-item-hint">&le;200m achieves maximum accessibility score (100/100)</span>
                    <span class="pw-spatial-item-status-tag">Highway Corridor</span>
                  </div>
                </div>

                <!-- LIVE SPATIAL ACCESSIBILITY PREVIEW CARD -->
                <div class="pw-spatial-preview-card" data-spatial-preview-card>
                  <div class="pw-spatial-preview-header">
                    <div class="pw-spatial-preview-kicker-group">
                      <span class="pw-spatial-preview-kicker">LIVE SPATIAL ACCESSIBILITY PREVIEW</span>
                      <h4 class="pw-spatial-preview-title">Spatial Connectivity Index</h4>
                    </div>
                    <div class="pw-spatial-preview-badges">
                      <span class="pw-spatial-calc-icon" aria-hidden="true">&#128425;</span>
                      <span class="pw-badge pw-badge-calculated" data-spatial-calc-badge>Calculated</span>
                    </div>
                  </div>

                  <!-- Incomplete state -->
                  <div class="pw-spatial-state-incomplete" data-spatial-state-incomplete>
                    <div class="pw-spatial-incomplete-header">
                      <h4 class="pw-spatial-state-title">Assessment incomplete</h4>
                      <span class="pw-badge pw-badge-incomplete">Pending input</span>
                    </div>
                    <p class="pw-spatial-state-msg">Provide all four required inputs before a provisional score can be calculated.</p>
                    <div class="pw-spatial-disclaimer">
                      <span class="pw-info-bullet" aria-hidden="true">&#9432;</span>
                      <p>Provisional score based on applicant inputs. Official IAI certification requires city validation across all criteria.</p>
                    </div>
                  </div>

                  <!-- Complete state -->
                  <div class="pw-spatial-state-complete" data-spatial-state-complete hidden>
                    <div class="pw-spatial-score-showcase">
                      <div class="pw-spatial-score-main">
                        <div class="pw-spatial-score-row">
                          <span class="pw-spatial-score-num"><strong data-spatial-total-score>92.5</strong> <small>/ 100 pts</small></span>
                          <span class="pw-spatial-tier-badge" data-spatial-tier-badge>Tier A &middot; Prime Spatial Access</span>
                        </div>

                        <!-- Burgundy Progress Bar matching Infrastructure -->
                        <div class="pw-spatial-progress-track">
                          <div class="pw-spatial-progress-bar" data-spatial-progress-bar style="width: 92.5%;"></div>
                        </div>
                        <span class="pw-spatial-score-caption">Spatial Accessibility component score before criterion weighting</span>
                      </div>

                      <div class="pw-spatial-iai-row">
                        <div class="pw-spatial-iai-header">
                          <span class="pw-spatial-iai-title">Contribution to final IAI (25%)</span>
                          <span class="pw-spatial-iai-weight-tag">25% MCE Weight</span>
                        </div>
                        <strong class="pw-spatial-iai-val">+<span data-spatial-iai-contrib>18.5</span> <small>pts</small></strong>
                        <span class="pw-spatial-iai-desc">Transfers directly into overall Investment Assessment Index</span>
                      </div>
                    </div>

                    <!-- 4 Subcategory Contribution Grid -->
                    <div class="pw-spatial-breakdown-row pw-spatial-breakdown-grid">
                      <div class="pw-spatial-pill pw-spatial-breakdown-card">
                        <div class="pw-spatial-bdown-icon pw-spatial-icon-access"><?= $pwIcon('road') ?></div>
                        <div class="pw-spatial-bdown-label">
                          <strong>Road Access</strong>
                          <small>30% of Spatial</small>
                        </div>
                        <div class="pw-spatial-bdown-pts"><strong data-spatial-p-access>30.0 pts</strong></div>
                      </div>
                      <div class="pw-spatial-pill pw-spatial-breakdown-card">
                        <div class="pw-spatial-bdown-icon pw-spatial-icon-surface"><?= $pwIcon('layers') ?></div>
                        <div class="pw-spatial-bdown-label">
                          <strong>Road Surface</strong>
                          <small>25% of Spatial</small>
                        </div>
                        <div class="pw-spatial-bdown-pts"><strong data-spatial-p-surface>25.0 pts</strong></div>
                      </div>
                      <div class="pw-spatial-pill pw-spatial-breakdown-card">
                        <div class="pw-spatial-bdown-icon pw-spatial-icon-width"><?= $pwIcon('area') ?></div>
                        <div class="pw-spatial-bdown-label">
                          <strong>Carriageway Width</strong>
                          <small>25% of Spatial</small>
                        </div>
                        <div class="pw-spatial-bdown-pts"><strong data-spatial-p-width>20.0 pts</strong></div>
                      </div>
                      <div class="pw-spatial-pill pw-spatial-breakdown-card">
                        <div class="pw-spatial-bdown-icon pw-spatial-icon-dist"><?= $pwIcon('target') ?></div>
                        <div class="pw-spatial-bdown-label">
                          <strong>Proximity to Highway</strong>
                          <small>20% of Spatial</small>
                        </div>
                        <div class="pw-spatial-bdown-pts"><strong data-spatial-p-dist>17.0 pts</strong></div>
                      </div>
                    </div>

                    <div class="pw-spatial-status-row">
                      <span class="pw-badge pw-badge-applicant">Applicant reported &middot; Pending LGU verification</span>
                    </div>

                    <div class="pw-spatial-disclaimer">
                      <span class="pw-info-bullet" aria-hidden="true">&#9432;</span>
                      <p>Provisional score based on applicant inputs. Official IAI certification requires city validation across all criteria.</p>
                    </div>
                  </div>

                  <div class="pw-spatial-preview-actions" hidden style="display:none;" aria-hidden="true">
                    <button type="button" class="pw-button pw-button-light pw-button-small" data-spatial-reset-example>
                      &#x21bb; Reset example
                    </button>
                  </div>
                </div>

                <p class="pw-spatial-try-hint" hidden style="display:none;" aria-hidden="true">Try changing the road surface to <em>Unpaved</em> or the road width to <em>2 meters</em>. Notice how the score adjusts.</p>

                <!-- Optional Supporting Records (Traceability for CAO/LEBDO Review) -->
                <details class="pw-disclosure pw-spatial-evidence-disclosure">
                  <summary><?= $pwIcon('document') ?><span>Optional supporting records &amp; verification notes <span class="pw-muted">&middot; for city review</span></span><?= $pwIcon('chevron') ?></summary>
                  <div class="pw-fields pw-spatial-evidence-fields">
                    <label class="pw-field">Source / issuer
                      <input name="spatial_evidence_source" maxlength="250" placeholder="e.g. City Engineer's Office, DPWH, Licensed surveyor">
                    </label>
                    <label class="pw-field">Document / observation date
                      <input name="spatial_evidence_date" type="date">
                    </label>
                    <label class="pw-field pw-full">Document reference or URL
                      <input name="spatial_evidence_reference" maxlength="500" placeholder="e.g. Cadastral Survey Lot 1234, Inspection Report #2026-04, or URL">
                    </label>
                    <label class="pw-field pw-full">Access route description notes
                      <input name="access_route_condition" maxlength="250" placeholder="e.g. 2-lane concrete barangay road connecting to highway">
                    </label>
                  </div>
                </details>
              </div>

              <!-- Criterion Navigation Footer -->
              <div class="pw-criterion-nav-footer">
                <button type="button" class="pw-button pw-button-light pw-button-small" data-criterion-prev="step1">
                  <?= $pwIcon('arrow', 'pw-icon-prev') ?> <span>Back to Step 2 (Location)</span>
                </button>
                <span class="pw-criterion-nav-hint"><?= $pwIcon('save') ?> Auto-saves on navigation</span>
                <button type="button" class="pw-button pw-button-primary pw-button-small" data-criterion-next="infrastructure_readiness">
                  <span>Next Criterion: Infrastructure</span> <?= $pwIcon('arrow') ?>
                </button>
              </div>
            </div>
          </div>

          <!-- 2. INFRASTRUCTURE READINESS PANE -->
          <div id="pwCriterionInfrastructure" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="infrastructure_readiness" hidden>
            <div class="pw-infra-card">
              <!-- Card Header matching executive design system -->
              <div class="pw-infra-header">
                <div class="pw-infra-heading-group">
                  <div class="pw-infra-eyebrow-row">
                    <span class="pw-infra-eyebrow">CRITERION 2 &middot; MULTI-CRITERIA EVALUATION</span>
                  </div>
                  <h3 class="pw-infra-title">Infrastructure Readiness</h3>
                  <p class="pw-infra-subtitle">Report verified utility connections and on-site distribution networks for power, water, telecom, and drainage.</p>
                </div>
                <div class="pw-infra-header-badges">
                  <span class="pw-badge pw-badge-provisional"><span class="pw-infra-pulse-dot"></span> Provisional model</span>
                  <span class="pw-badge pw-badge-weight">25% of MCE</span>
                </div>
              </div>

              <!-- Infrastructure Utility Tracker Ribbon -->
              <div class="pw-infra-utility-ribbon" role="region" aria-label="Utility status summary">
                <div class="pw-infra-utility-pill" data-infra-status-pill="electricity">
                  <span class="pw-infra-pill-icon pw-infra-icon-elec"><?= $pwIcon('utilities') ?></span>
                  <div class="pw-infra-pill-meta">
                    <span class="pw-infra-pill-name">Power / Grid</span>
                    <span class="pw-infra-pill-weight">35% weight</span>
                  </div>
                  <span class="pw-infra-pill-status" data-infra-chip-status="electricity">Active</span>
                </div>
                <div class="pw-infra-utility-pill" data-infra-status-pill="water">
                  <span class="pw-infra-pill-icon pw-infra-icon-water"><?= $pwIcon('water') ?></span>
                  <div class="pw-infra-pill-meta">
                    <span class="pw-infra-pill-name">Water Supply</span>
                    <span class="pw-infra-pill-weight">30% weight</span>
                  </div>
                  <span class="pw-infra-pill-status" data-infra-chip-status="water">Active</span>
                </div>
                <div class="pw-infra-utility-pill" data-infra-status-pill="internet">
                  <span class="pw-infra-pill-icon pw-infra-icon-telecom"><?= $pwIcon('wifi') ?></span>
                  <div class="pw-infra-pill-meta">
                    <span class="pw-infra-pill-name">Connectivity</span>
                    <span class="pw-infra-pill-weight">20% weight</span>
                  </div>
                  <span class="pw-infra-pill-status" data-infra-chip-status="internet">Active</span>
                </div>
                <div class="pw-infra-utility-pill" data-infra-status-pill="drainage">
                  <span class="pw-infra-pill-icon pw-infra-icon-drainage"><?= $pwIcon('drainage') ?></span>
                  <div class="pw-infra-pill-meta">
                    <span class="pw-infra-pill-name">Storm Drainage</span>
                    <span class="pw-infra-pill-weight">15% weight</span>
                  </div>
                  <span class="pw-infra-pill-status" data-infra-chip-status="drainage">Active</span>
                </div>
              </div>

              <div class="pw-infra-form-body">
                <!-- 1. Primary Electricity Arrangement (35%) -->
                <div class="pw-infra-item" data-infra-field-block="electricity">
                  <div class="pw-infra-item-header">
                    <div class="pw-infra-item-title-wrap">
                      <span class="pw-infra-service-badge pw-infra-badge-elec"><?= $pwIcon('utilities') ?></span>
                      <div>
                        <label for="pwElectricityArrangement" class="pw-infra-label">1. Primary electricity arrangement</label>
                        <span class="pw-infra-label-desc">Grid distribution, solar PV with battery storage, or generator</span>
                      </div>
                    </div>
                    <div class="pw-infra-item-badges">
                      <span class="pw-sub-weight">Weight: 35%</span>
                      <strong class="pw-sub-score" data-infra-sub-score="electricity">14.00 pts</strong>
                    </div>
                  </div>

                  <div class="pw-select-wrapper">
                    <select id="pwElectricityArrangement" name="electricity_arrangement" class="pw-infra-select" data-infra-input="electricity">
                      <option value="" selected>Not recorded</option>
                      <option value="grid_reliable">Reliable and sufficient grid connection</option>
                      <option value="solar_battery">Reliable adequate solar with battery storage</option>
                      <option value="generator_only">Generator-only supply</option>
                      <option value="grid_unconnected">Grid available nearby but unconnected</option>
                      <option value="no_supply">No operational electric supply</option>
                      <option value="unknown">Unknown / not yet verified</option>
                    </select>
                  </div>

                  <!-- Cross-Criteria Consideration for Generator-Only Electricity -->
                  <div class="pw-infra-generator-callout" data-infra-generator-callout hidden>
                    <div class="pw-callout-header">
                      <span class="pw-info-icon" aria-hidden="true">&#9432;</span>
                      <strong>Cross-Criteria Consideration &middot; Generator-Only Supply</strong>
                    </div>
                    <p class="pw-callout-text">
                      Generator-only supply implies recurring fuel and maintenance expenditures (recorded for <em>Property Cost and Market Competitiveness</em> OPEX context), as well as exhaust emissions, acoustic noise, and fuel storage considerations (recorded for <em>Environmental Safety</em> context). No arbitrary deduction or double-counting is applied to Infrastructure Readiness.
                    </p>
                    <div class="pw-fields-two-col" style="margin-top: 10px;">
                      <label class="pw-field">Generator fuel type
                        <select name="generator_fuel_type">
                          <option value="" selected>Not recorded</option>
                          <option value="diesel">Diesel fuel</option>
                          <option value="gasoline">Gasoline</option>
                          <option value="lpg">LPG / Propane</option>
                          <option value="other">Other fuel</option>
                        </select>
                      </label>
                      <label class="pw-field">Fuel containment &amp; safety notes
                        <input name="generator_storage_notes" placeholder="e.g. 500L bunded drum, fire safety cert">
                      </label>
                    </div>
                  </div>

                  <!-- Conditional Factual Details for Electricity -->
                  <details class="pw-infra-details" data-infra-details="electricity">
                    <summary>
                      <span class="pw-infra-summary-title">
                        <?= $pwIcon('chevron', 'pw-infra-chevron') ?>
                        <span>Factual provider, capacity &amp; backup details</span>
                      </span>
                      <span class="pw-infra-tag-pill">Verification only &middot; does not alter score</span>
                    </summary>
                    <div class="pw-infra-details-body">
                      <div class="pw-fields-two-col">
                        <label class="pw-field">Electricity provider
                          <input name="electricity_provider" placeholder="e.g. LUECO (La Union Electric Company), NGCP">
                        </label>
                        <label class="pw-field">Capacity / connection specs
                          <input name="electricity_capacity" placeholder="e.g. 50 kVA, 3-phase, 220V">
                        </label>
                      </div>
                      <div class="pw-fields-two-col" style="margin-top: 10px;">
                        <label class="pw-field">Secondary backup facility
                          <select name="electricity_backup">
                            <option value="" selected>Not recorded</option>
                            <option value="none">None reported</option>
                            <option value="standby_generator">Standby generator</option>
                            <option value="solar_backup">Solar PV backup</option>
                            <option value="bess">Battery Energy Storage (BESS)</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </details>
                </div>

                <!-- 2. Water Supply (30%) -->
                <div class="pw-infra-item" data-infra-field-block="water">
                  <div class="pw-infra-item-header">
                    <div class="pw-infra-item-title-wrap">
                      <span class="pw-infra-service-badge pw-infra-badge-water"><?= $pwIcon('water') ?></span>
                      <div>
                        <label for="pwWaterSupply" class="pw-infra-label">2. Water supply</label>
                        <span class="pw-infra-label-desc">Municipal water utility main, certified deep well, or on-site cistern</span>
                      </div>
                    </div>
                    <div class="pw-infra-item-badges">
                      <span class="pw-sub-weight">Weight: 30%</span>
                      <strong class="pw-sub-score" data-infra-sub-score="water">30.00 pts</strong>
                    </div>
                  </div>

                  <div class="pw-select-wrapper">
                    <select id="pwWaterSupply" name="water_supply" class="pw-infra-select" data-infra-input="water">
                      <option value="" selected>Not recorded</option>
                      <option value="piped_reliable">Reliable and sufficient piped supply</option>
                      <option value="deepwell_tested">Verified sufficient and suitably tested deep well</option>
                      <option value="limited_intermittent">Limited / intermittent supply</option>
                      <option value="available_unconnected">Water main available nearby but unconnected</option>
                      <option value="unavailable">Unavailable / no water supply</option>
                      <option value="unknown">Unknown / not yet verified</option>
                    </select>
                  </div>

                  <!-- Conditional Factual Details for Water -->
                  <details class="pw-infra-details" data-infra-details="water">
                    <summary>
                      <span class="pw-infra-summary-title">
                        <?= $pwIcon('chevron', 'pw-infra-chevron') ?>
                        <span>Factual water provider, testing &amp; storage details</span>
                      </span>
                      <span class="pw-infra-tag-pill">Verification only &middot; does not alter score</span>
                    </summary>
                    <div class="pw-infra-details-body">
                      <div class="pw-fields-two-col">
                        <label class="pw-field">Water utility / provider
                          <input name="water_provider" placeholder="e.g. Metro La Union Water District (MLUWD)">
                        </label>
                        <label class="pw-field">Potability &amp; adequacy testing
                          <input name="water_testing_notes" placeholder="e.g. Potability &amp; bacteriological test clearance">
                        </label>
                      </div>
                      <div class="pw-fields-two-col" style="margin-top: 10px;">
                        <label class="pw-field">On-site storage / cistern
                          <input name="water_storage_notes" placeholder="e.g. 5,000L cistern with booster pump">
                        </label>
                      </div>
                    </div>
                  </details>
                </div>

                <!-- 3. Internet & Telecommunications (20%) -->
                <div class="pw-infra-item" data-infra-field-block="internet">
                  <div class="pw-infra-item-header">
                    <div class="pw-infra-item-title-wrap">
                      <span class="pw-infra-service-badge pw-infra-badge-telecom"><?= $pwIcon('wifi') ?></span>
                      <div>
                        <label for="pwInternetTelecom" class="pw-infra-label">3. Internet &amp; telecommunications</label>
                        <span class="pw-infra-label-desc">Dedicated fiber optic line, fixed wireless broadband, or satellite</span>
                      </div>
                    </div>
                    <div class="pw-infra-item-badges">
                      <span class="pw-sub-weight">Weight: 20%</span>
                      <strong class="pw-sub-score" data-infra-sub-score="internet">20.00 pts</strong>
                    </div>
                  </div>

                  <div class="pw-select-wrapper">
                    <select id="pwInternetTelecom" name="internet_telecom" class="pw-infra-select" data-infra-input="internet">
                      <option value="" selected>Not recorded</option>
                      <option value="fiber_reliable">Reliable fiber connection</option>
                      <option value="fixed_wireless">Fixed wireless broadband</option>
                      <option value="satellite_reliable">Reliable satellite connection</option>
                      <option value="mobile_data_stable">Stable mobile data (4G/5G)</option>
                      <option value="available_uninstalled">Broadband available nearby but uninstalled</option>
                      <option value="unavailable">Unavailable / telecom dead zone</option>
                      <option value="unknown">Unknown / not yet verified</option>
                    </select>
                  </div>

                  <!-- Conditional Factual Details for Internet -->
                  <details class="pw-infra-details" data-infra-details="internet">
                    <summary>
                      <span class="pw-infra-summary-title">
                        <?= $pwIcon('chevron', 'pw-infra-chevron') ?>
                        <span>Factual ISP provider, speed &amp; backup details</span>
                      </span>
                      <span class="pw-infra-tag-pill">Verification only &middot; does not alter score</span>
                    </summary>
                    <div class="pw-infra-details-body">
                      <div class="pw-fields-two-col">
                        <label class="pw-field">Primary ISP / carrier
                          <input name="internet_provider" placeholder="e.g. PLDT, Converge, Globe, Starlink">
                        </label>
                        <label class="pw-field">Measured / rated speed
                          <input name="download_speed_mbps" placeholder="e.g. 100 Mbps symmetric fiber">
                        </label>
                      </div>
                      <div class="pw-fields-two-col" style="margin-top: 10px;">
                        <label class="pw-field">Backup connection
                          <input name="internet_backup_notes" placeholder="e.g. 5G wireless failover / dual WAN">
                        </label>
                      </div>
                    </div>
                  </details>
                </div>

                <!-- 4. Drainage Conditions (15%) -->
                <div class="pw-infra-item" data-infra-field-block="drainage">
                  <div class="pw-infra-item-header">
                    <div class="pw-infra-item-title-wrap">
                      <span class="pw-infra-service-badge pw-infra-badge-drainage"><?= $pwIcon('drainage') ?></span>
                      <div>
                        <label for="pwDrainageConditions" class="pw-infra-label">4. Drainage conditions</label>
                        <span class="pw-infra-label-desc">Covered curb and gutter, storm sewer network, or roadside outfall</span>
                      </div>
                    </div>
                    <div class="pw-infra-item-badges">
                      <span class="pw-sub-weight">Weight: 15%</span>
                      <strong class="pw-sub-score" data-infra-sub-score="drainage">15.00 pts</strong>
                    </div>
                  </div>

                  <div class="pw-select-wrapper">
                    <select id="pwDrainageConditions" name="drainage_conditions" class="pw-infra-select" data-infra-input="drainage">
                      <option value="" selected>Not recorded</option>
                      <option value="adequate_functional">Adequate and fully functional</option>
                      <option value="minor_improvements">Minor improvements required</option>
                      <option value="inadequate">Inadequate drainage</option>
                      <option value="unavailable">Unavailable / no drainage system</option>
                      <option value="unknown">Unknown / not yet verified</option>
                    </select>
                  </div>

                  <!-- Conditional Factual Details for Drainage -->
                  <details class="pw-infra-details" data-infra-details="drainage">
                    <summary>
                      <span class="pw-infra-summary-title">
                        <?= $pwIcon('chevron', 'pw-infra-chevron') ?>
                        <span>Factual drainage network &amp; outfall details</span>
                      </span>
                      <span class="pw-infra-tag-pill">Verification only &middot; does not alter score</span>
                    </summary>
                    <div class="pw-infra-details-body">
                      <div class="pw-fields-two-col">
                        <label class="pw-field">Drainage system type
                          <input name="drainage_type" placeholder="e.g. Covered concrete curb-and-gutter, storm sewer">
                        </label>
                        <label class="pw-field">Outfall discharge point
                          <input name="drainage_outfall" placeholder="e.g. Municipal storm trunk, roadside canal">
                        </label>
                      </div>
                    </div>
                  </details>
                </div>

                <!-- PRELIMINARY INFRASTRUCTURE ASSESSMENT CARD (Matching Mockup) -->
                <div class="pw-infra-preview-card" data-infra-preview-card>
                  <div class="pw-infra-preview-header">
                    <div class="pw-infra-preview-kicker-group">
                      <span class="pw-infra-preview-kicker">PRELIMINARY INFRASTRUCTURE ASSESSMENT</span>
                      <h4 class="pw-infra-preview-title">Utility &amp; Distribution Index</h4>
                    </div>
                    <span class="pw-badge pw-badge-calculated" data-infra-calc-badge>Calculated</span>
                  </div>

                  <!-- Complete State -->
                  <div class="pw-infra-state-complete" data-infra-state-complete>
                    <div class="pw-infra-score-showcase">
                      <div class="pw-infra-score-main">
                        <div class="pw-infra-score-row">
                          <span class="pw-infra-score-num"><strong data-infra-total-score>79.0</strong> <small>/ 100 pts</small></span>
                          <span class="pw-infra-tier-badge" data-infra-tier-badge>Tier B &middot; High Readiness</span>
                        </div>

                        <!-- Burgundy Progress Bar matching Screenshot -->
                        <div class="pw-infra-progress-track">
                          <div class="pw-infra-progress-bar" data-infra-progress-bar style="width: 79%;"></div>
                        </div>
                        <span class="pw-infra-score-caption">Infrastructure Readiness component score before criterion weighting</span>
                      </div>

                      <div class="pw-infra-iai-row">
                        <div class="pw-infra-iai-header">
                          <span class="pw-infra-iai-title">Contribution to final IAI (25%)</span>
                          <span class="pw-infra-iai-weight-tag">25% MCE Weight</span>
                        </div>
                        <strong class="pw-infra-iai-val"><span data-infra-iai-contrib>15.80</span> pts</strong>
                        <span class="pw-infra-iai-desc">Transfers directly into overall Investment Assessment Index</span>
                      </div>
                    </div>

                    <!-- 4 Subcategory Contribution Grid -->
                    <div class="pw-infra-breakdown-list pw-infra-breakdown-grid">
                      <div class="pw-infra-breakdown-row pw-infra-breakdown-card">
                        <div class="pw-infra-bdown-icon pw-infra-icon-elec"><?= $pwIcon('utilities') ?></div>
                        <div class="pw-infra-row-label pw-infra-bdown-label">
                          <strong>Electricity</strong>
                          <small>35% of Infrastructure</small>
                        </div>
                        <div class="pw-infra-row-pts pw-infra-bdown-pts"><strong data-infra-pts-elec>14.00</strong> pts</div>
                      </div>
                      <div class="pw-infra-breakdown-row pw-infra-breakdown-card">
                        <div class="pw-infra-bdown-icon pw-infra-icon-water"><?= $pwIcon('water') ?></div>
                        <div class="pw-infra-row-label pw-infra-bdown-label">
                          <strong>Water Supply</strong>
                          <small>30% of Infrastructure</small>
                        </div>
                        <div class="pw-infra-row-pts pw-infra-bdown-pts"><strong data-infra-pts-water>30.00</strong> pts</div>
                      </div>
                      <div class="pw-infra-breakdown-row pw-infra-breakdown-card">
                        <div class="pw-infra-bdown-icon pw-infra-icon-telecom"><?= $pwIcon('wifi') ?></div>
                        <div class="pw-infra-row-label pw-infra-bdown-label">
                          <strong>Internet &amp; Telecom</strong>
                          <small>20% of Infrastructure</small>
                        </div>
                        <div class="pw-infra-row-pts pw-infra-bdown-pts"><strong data-infra-pts-internet>20.00</strong> pts</div>
                      </div>
                      <div class="pw-infra-breakdown-row pw-infra-breakdown-card">
                        <div class="pw-infra-bdown-icon pw-infra-icon-drainage"><?= $pwIcon('drainage') ?></div>
                        <div class="pw-infra-row-label pw-infra-bdown-label">
                          <strong>Drainage</strong>
                          <small>15% of Infrastructure</small>
                        </div>
                        <div class="pw-infra-row-pts pw-infra-bdown-pts"><strong data-infra-pts-drainage>15.00</strong> pts</div>
                      </div>
                    </div>

                    <div class="pw-infra-disclaimer">
                      <span class="pw-infra-disc-icon"><?= $pwIcon('shield') ?></span>
                      <p>Provisional baseline assessment. Official certification requires city engineering validation.</p>
                    </div>
                  </div>

                  <!-- Incomplete State -->
                  <div class="pw-infra-state-incomplete" data-infra-state-incomplete hidden>
                    <div class="pw-infra-score-row">
                      <div class="pw-infra-score-main">
                        <h4 class="pw-infra-incomplete-title">Assessment incomplete</h4>
                      </div>
                      <span class="pw-badge pw-badge-incomplete">Pending input</span>
                    </div>
                    <p class="pw-infra-incomplete-msg">Provide all four required infrastructure conditions before a provisional score can be calculated.</p>
                    <div class="pw-infra-disclaimer">
                      <span class="pw-infra-disc-icon"><?= $pwIcon('shield') ?></span>
                      <p>Provisional score based on applicant inputs. Official IAI certification requires city validation across all criteria.</p>
                    </div>
                  </div>

                  <div class="pw-infra-actions" hidden style="display:none;" aria-hidden="true">
                    <button type="button" class="pw-button pw-button-light pw-button-small" data-infra-reset-example>
                      &#x21bb; Reset example
                    </button>
                  </div>
                </div>

                <!-- Traceability & Review Notes for CAO / LEBDO Review -->
                <details class="pw-disclosure pw-infra-evidence-disclosure">
                  <summary><?= $pwIcon('document') ?><span>Optional supporting records &amp; verification notes <span class="pw-muted">&middot; for city review</span></span><?= $pwIcon('chevron') ?></summary>
                  <div class="pw-fields pw-infra-evidence-fields">
                    <label class="pw-field">Source / issuer
                      <input name="utility_evidence_source" maxlength="250" placeholder="e.g. LUECO, MLUWD, DPWH, Licensed engineer">
                    </label>
                    <label class="pw-field">Document / observation date
                      <input name="utility_evidence_date" type="date">
                    </label>
                    <label class="pw-field pw-full">Document reference or URL
                      <input name="utility_evidence_reference" maxlength="500" placeholder="e.g. Account confirmation, water quality cert, or file URL">
                    </label>
                    <label class="pw-field pw-full">Infrastructure notes &amp; remarks
                      <input name="utility_evidence_notes" maxlength="250" placeholder="e.g. On-site transformer verified, stormwater connected to national road">
                    </label>
                  </div>
                </details>

                <!-- Criterion Navigation Footer -->
                <div class="pw-criterion-nav-footer">
                  <button type="button" class="pw-button pw-button-light pw-button-small" data-criterion-prev="spatial_accessibility">
                    <?= $pwIcon('arrow', 'pw-icon-prev') ?> <span>Previous Criterion: Spatial</span>
                  </button>
                  <span class="pw-criterion-nav-hint"><?= $pwIcon('save') ?> Auto-saves on navigation</span>
                  <button type="button" class="pw-button pw-button-primary pw-button-small" data-criterion-next="economic_viability">
                    <span>Next Criterion: Cost &amp; Market</span> <?= $pwIcon('arrow') ?>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. PROPERTY COST & MARKET COMPETITIVENESS PANE -->
          <div id="pwCriterionEconomic" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="economic_viability" hidden>
            <div class="pw-econ-card pw-econ-simple">
              <div class="pw-live-result" data-economic-live-result aria-live="polite">
                <div><span class="pw-result-eyebrow">YOUR RESULT · PROVISIONAL</span><h4 data-economic-live-title>Add a comparison</h4><p data-economic-live-equation>We compare both properties using the same price per m².</p></div>
                <div class="pw-live-result-value"><strong data-economic-live-score>—</strong><span data-economic-live-contribution>20% of the assessment</span></div>
                <p class="pw-result-next" data-economic-live-next>Add the missing inputs below to see the comparison.</p>
                <button type="button" class="pw-button pw-button-light pw-button-small" data-economic-fix hidden>Review inputs</button>
              </div>
              <!-- Card Header -->
              <div class="pw-econ-header">
                <div class="pw-econ-heading-group">
                  <h3 class="pw-econ-title">Cost &amp; Market</h3>
                  <p class="pw-econ-subtitle">Compare your asking rate with a similar property.</p>
                </div>
                <div class="pw-econ-header-badges">
                  <span class="pw-badge pw-badge-weight">Up to 20 points</span>
                </div>
              </div>

              <!-- Reasonableness Warning Banner (shown dynamically on suspicious/conflicting inputs) -->
              <div class="pw-econ-warning pw-econ-reasonableness-warning" data-econ-reasonableness-warning hidden>
                <span class="pw-econ-warning-icon" aria-hidden="true">&#9888;</span>
                <div class="pw-econ-warning-content">
                  <strong>Reasonableness Notice:</strong>
                  <span data-econ-reasonableness-text>Verify the entered property area and pricing.</span>
                </div>
              </div>

              <!-- 1. PROPERTY PRICING -->
              <div class="pw-econ-section" data-econ-section="1">
                <div class="pw-econ-section-header">
                  <div class="pw-econ-section-number">1</div>
                  <div class="pw-econ-section-title-wrap">
                    <h4 class="pw-econ-section-title">Your property</h4>
                  </div>
                </div>

                <div class="pw-econ-section-body">
                  <div class="pw-econ-from-details pw-econ-asking-line">
                    <div><span class="pw-econ-from-label" data-econ-from-purpose>For sale</span><strong data-econ-from-price>Asking price not entered</strong><small>From Basic information</small></div>
                    <button type="button" class="pw-econ-edit-link" data-review-edit="0">Change price <?= $pwIcon('edit') ?></button>
                  </div>

                  <!-- Space Offered Scope and Relevant Floor / Land Area -->
                  <div class="pw-fields-two-col pw-econ-scope-grid">
                    <div class="pw-econ-field-group">
                      <label for="pwOfferedSpaceScope" class="pw-econ-label">What space is offered?</label>
                      <div class="pw-select-wrapper">
                        <select id="pwOfferedSpaceScope" name="offered_space_scope" class="pw-econ-select" data-econ-input="offered_space_scope">
                          <option value="entire_land">Whole land parcel</option>
                          <option value="entire_building">Whole building</option>
                          <option value="part_property">A unit or part of the property</option>
                        </select>
                      </div>
                      <span class="pw-econ-field-hint">For building space, use its floor area.</span>
                    </div>

                    <div class="pw-econ-field-group" data-econ-offered-area-wrap>
                      <label for="pwOfferedAreaSqm" class="pw-econ-label" data-econ-offered-area-label>Area offered (m&sup2;)</label>
                      <div class="pw-econ-area-slot">
                        <input id="pwOfferedAreaSqm" name="offered_area_sqm" type="number" min="0.01" step="0.01" class="pw-econ-input" placeholder="e.g. 100" data-econ-input="offered_area_sqm">
                        <div class="pw-econ-auto-area-note" data-econ-auto-area-note hidden>
                          <strong data-econ-auto-land-area>—</strong><span>From Location</span>
                        </div>
                      </div>
                      <span class="pw-econ-field-hint" data-econ-offered-area-hint>Recorded land area is used automatically.</span>
                    </div>
                  </div>

                  <div class="pw-econ-rates-strip" data-econ-rates-strip>
                    <div class="pw-econ-rate-line" data-econ-sale-rate-card><span>Your sale rate</span><strong data-econ-asking-sqm>—</strong></div>
                    <div class="pw-econ-rate-line" data-econ-lease-rate-card hidden><span>Your rent per m² / month</span><strong data-econ-lease-sqm>—</strong><span class="pw-econ-total-rent" data-econ-monthly-total>Monthly total needs an offered area.</span></div>
                  </div>
                </div>
              </div>

              <!-- 2. ADDITIONAL COSTS -->
              <div class="pw-econ-section" data-econ-section="2">
                <div class="pw-econ-section-header">
                  <div class="pw-econ-section-number">2</div>
                  <div class="pw-econ-section-title-wrap">
                    <h4 class="pw-econ-section-title">Upfront costs &amp; terms</h4>
                    <p class="pw-econ-section-desc">What additional expenses are known?</p>
                  </div>
                </div>

                <div class="pw-econ-section-body">
                  <!-- Lease additional terms (for lease or sale_or_lease) -->
                  <div class="pw-econ-costs-block" data-econ-lease-costs-wrap>
                    <span class="pw-econ-subhead">Lease Terms &amp; Utility Arrangement</span>
                    <div class="pw-fields-three-col">
                      <div class="pw-econ-field-group">
                        <label for="pwSecurityDepositMonths" class="pw-econ-label">Security deposit (months)</label>
                        <input id="pwSecurityDepositMonths" name="security_deposit_months" type="number" min="0" max="24" step="0.5" class="pw-econ-input" placeholder="e.g. 2" data-econ-input="security_deposit_months">
                        <span class="pw-econ-field-hint">Typical: 1 to 3 months</span>
                      </div>
                      <div class="pw-econ-field-group">
                        <label for="pwAdvanceRentMonths" class="pw-econ-label">Advance rent (months)</label>
                        <input id="pwAdvanceRentMonths" name="advance_rent_months" type="number" min="0" max="24" step="0.5" class="pw-econ-input" placeholder="e.g. 1" data-econ-input="advance_rent_months">
                        <span class="pw-econ-field-hint">Typical: 1 to 2 months</span>
                      </div>
                      <div class="pw-econ-field-group">
                        <label for="pwUtilitiesIncluded" class="pw-econ-label">Utilities arrangement</label>
                        <div class="pw-select-wrapper">
                          <select id="pwUtilitiesIncluded" name="utilities_included" class="pw-econ-select" data-econ-input="utilities_included">
                            <option value="excluded">Utilities billed separately</option>
                            <option value="included">Utilities included in rent</option>
                          </select>
                        </div>
                        <span class="pw-econ-field-hint">Electricity / water billing</span>
                      </div>
                    </div>
                  </div>

                  <!-- Sale additional terms (for sale or sale_or_lease) -->
                  <div class="pw-econ-costs-block" data-econ-sale-costs-wrap>
                    <span class="pw-econ-subhead">Known Purchase &amp; Improvement Costs</span>
                    <div class="pw-econ-field-group">
                      <label for="pwAdditionalPurchaseCosts" class="pw-econ-label">Additional estimated closing / site improvement costs (&#8369;)</label>
                      <input id="pwAdditionalPurchaseCosts" name="additional_purchase_costs" type="number" min="0" step="500" class="pw-econ-input" placeholder="e.g. 150000 (transfer fees, titling, minor repairs)" data-econ-input="additional_purchase_costs">
                      <span class="pw-econ-field-hint">Optional. Documented transaction fees or capital improvements. Missing costs are never invented.</span>
                    </div>
                  </div>

                  <!-- Known Upfront Cost Pill -->
                  <div class="pw-econ-upfront-card" data-econ-upfront-card>
                    <span class="pw-econ-upfront-label">Known Upfront Outlay:</span>
                    <strong class="pw-econ-upfront-val" data-econ-upfront-val>None recorded</strong>
                    <span class="pw-econ-upfront-note" data-econ-upfront-note>(deposit, advance rent, or closing expenses)</span>
                  </div>
                </div>
              </div>

              <!-- 3. LOCAL PRICE COMPARISON -->
              <div class="pw-econ-section" data-econ-section="3">
                <div class="pw-econ-section-header">
                  <div class="pw-econ-section-number">3</div>
                  <div class="pw-econ-section-title-wrap">
                    <h4 class="pw-econ-section-title">Similar property</h4>
                  </div>
                </div>

                <div class="pw-econ-section-body">
                  <p class="pw-econ-comparable-hint">Use a recent property with a similar location, type and condition.</p>

                  <div class="pw-fields-two-col">
                    <div class="pw-econ-field-group" data-econ-sale-comp-wrap>
                      <label for="pwComparableMarketPrice" class="pw-econ-label">Its sale price per m² (₱)</label>
                      <input id="pwComparableMarketPrice" name="comparable_market_price" type="number" min="0.01" step="0.01" class="pw-econ-input" placeholder="e.g. 8500 per m²" data-econ-input="comparable_market_price">
                      <span class="pw-econ-field-hint">Example: ₱1,000,000 ÷ 100 m² = ₱10,000/m².</span>
                    </div>

                    <div class="pw-econ-field-group" data-econ-lease-comp-wrap>
                      <label for="pwComparableLeasePrice" class="pw-econ-label">Its rent per m² / month (₱)</label>
                      <input id="pwComparableLeasePrice" name="comparable_lease_price" type="number" min="0.01" step="0.01" class="pw-econ-input" placeholder="e.g. 300 per m² per month" data-econ-input="comparable_lease_price">
                      <span class="pw-econ-field-hint">Example: ₱40,000/month ÷ 100 m² = ₱400/m²/month.</span>
                    </div>

                    <div class="pw-econ-field-group">
                      <label for="pwComparableSource" class="pw-econ-label">Listing link or reference and date</label>
                      <input id="pwComparableSource" name="comparable_source" maxlength="250" class="pw-econ-input" placeholder="e.g. Listing URL or broker quotation, October 2026" data-econ-input="comparable_source">
                      <span class="pw-econ-field-hint">Record where the comparison came from so the city can verify it.</span>
                    </div>
                  </div>

                  <!-- OPTIONAL EXPANDABLE: OFFICIAL VALUATION REFERENCES (BIR & LGU) -->
                  <details class="pw-econ-details" data-econ-details>
                    <summary class="pw-econ-details-summary">
                      <span class="pw-econ-summary-title">&#127963; Official Valuation References (BIR &amp; LGU)</span>
                      <span class="pw-muted">(Optional for City &amp; Tax Review)</span>
                    </summary>
                    <div class="pw-econ-details-body">
                      <p class="pw-econ-details-intro">
                        Official tax valuation schedules from the Bureau of Internal Revenue and City Assessor's Office.
                        <em>These are tax valuation references, not actual market rental rates or proof of profitability. City administrators and applicants are not required to invent amounts, reference numbers, or valuation dates just to complete the form.</em>
                      </p>

                      <dl class="pw-econ-detail-values"><div><dt>Recorded land area</dt><dd data-econ-from-area>—</dd></div><div><dt>BIR reference per m²</dt><dd data-econ-bir-sqm>—</dd></div><div><dt>Total BIR reference</dt><dd data-econ-total-bir>—</dd></div><div><dt>Sale rate compared with BIR reference</dt><dd data-econ-bir-diff>—</dd></div></dl>
                      <p class="pw-calculation-help">A difference from BIR zonal valuation does not by itself establish overpricing, profitability, or investment suitability.</p>
                      <!-- 1. BIR Zonal Valuation -->
                      <div class="pw-econ-item" style="border-top: none; padding-top: 0;">
                        <h4 class="pw-econ-section-title">1. BIR Zonal Valuation</h4>
                        <p class="pw-econ-section-desc">Statutory baseline for conveyance taxes. Enter only if applicable and known.</p>
                        <div class="pw-econ-field-group">
                          <label for="pwBirZonalValue" class="pw-econ-label">BIR zonal value (&#8369;/m&sup2;)</label>
                          <input id="pwBirZonalValue" name="bir_zonal_value" type="number" min="0" step="0.01" class="pw-econ-input" placeholder="e.g. 7000" data-econ-input="bir_zonal_value">
                        </div>
                        <div class="pw-econ-hint-row">
                          <span class="pw-badge pw-badge-source-req">Source required for verification</span>
                          <span class="pw-econ-hint-text">Correct location, land classification, and effective schedule must be confirmed.</span>
                        </div>

                        <div class="pw-fields-two-col" style="margin-top: 10px;">
                          <label class="pw-field">BIR Schedule / Department Order Reference
                            <input name="bir_source" maxlength="500" placeholder="e.g. BIR Department Order No. 042-2024, RDO 003">
                          </label>
                          <label class="pw-field">Reference / Schedule effective date
                            <input name="bir_date" type="date">
                          </label>
                        </div>
                      </div>

                      <!-- 2. Additional Valuation References -->
                      <div class="pw-econ-item" style="margin-top: 16px;">
                        <h4 class="pw-econ-section-title">2. Additional Valuation References</h4>
                        <p class="pw-econ-section-desc">Optional tax declaration / real property tax assessment references.</p>
                        <div class="pw-econ-fields-stack">
                          <div class="pw-econ-field-group">
                            <label for="pwLguValuationType" class="pw-econ-label">LGU fair market value or assessed value</label>
                            <div class="pw-select-wrapper">
                              <select id="pwLguValuationType" name="lgu_valuation_type" class="pw-econ-select" data-econ-input="lgu_valuation_type">
                                <option value="">Select valuation type</option>
                                <option value="fair_market_value">LGU Fair Market Value</option>
                                <option value="assessed_value">Assessed Value (Tax Declaration)</option>
                              </select>
                            </div>
                          </div>
                          <div class="pw-econ-field-group">
                            <label for="pwLguValuationAmount" class="pw-econ-label">Reference amount (&#8369;)</label>
                            <input id="pwLguValuationAmount" name="lgu_valuation_amount" type="number" min="0" step="0.01" class="pw-econ-input" placeholder="Enter amount from the relevant record" data-econ-input="lgu_valuation_amount">
                          </div>
                          <div class="pw-econ-field-group">
                            <label class="pw-econ-label">Tax Declaration / ARP Number
                              <input name="assessed_market_value" maxlength="200" class="pw-econ-input" placeholder="e.g. ARP No. 2024-001-0492">
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>

              <div class="pw-econ-section pw-econ-summary-section" data-econ-section="4">
                <div data-econ-preview-card>
                  <p class="pw-calculation-help">Difference = (your rate ÷ similar property’s rate − 1) × 100. Both rates use the same area and time basis. The score contributes up to 20 points.</p>
                  <table class="pw-econ-score-table">
                    <thead><tr><th>Your rate compared with the similar property</th><th>Score / 100</th></tr></thead>
                    <tbody><tr><td>Within 5% above or below</td><td>100</td></tr><tr><td>More than 5%, up to 15% above</td><td>85</td></tr><tr><td>More than 15%, up to 30% above</td><td>70</td></tr><tr><td>More than 30% above</td><td>50</td></tr><tr><td>More than 5%, up to 20% below</td><td>90</td></tr><tr><td>More than 20% below</td><td>75</td></tr></tbody>
                  </table>
                  <p class="pw-calculation-help">These are the current provisional scoring rules. A deep discount needs further checking. This comparison measures property pricing, not business profit.</p>
                  <dl class="pw-econ-detail-values"><div><dt>Comparable rate</dt><dd data-econ-benchmark-sqm>—</dd></div><div><dt>Rate difference</dt><dd data-econ-market-diff>—</dd></div><div><dt>Calculated score and contribution</dt><dd data-econ-iai-val>—</dd></div></dl>
                  <div class="pw-econ-warning" data-econ-area-discrepancy hidden>Recorded and drawn land areas differ by more than 25%. Confirm the area before using the calculation.</div>
                </div>
              </div>

              <!-- Criterion Navigation Footer -->
              <div class="pw-criterion-nav-footer">
                <button type="button" class="pw-button pw-button-light pw-button-small" data-criterion-prev="infrastructure_readiness">
                  <?= $pwIcon('arrow', 'pw-icon-prev') ?> <span>Previous Criterion: Infrastructure</span>
                </button>
                <span class="pw-criterion-nav-hint"><?= $pwIcon('save') ?> Auto-saves on navigation</span>
                <button type="button" class="pw-button pw-button-primary pw-button-small" data-criterion-next="nearby_businesses">
                  <span>Next Criterion: Nearby Businesses</span> <?= $pwIcon('arrow') ?>
                </button>
              </div>
            </div>
          </div>

          <!-- 4. NEARBY BUSINESSES PANE -->
          <div id="pwCriterionNearby" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="nearby_businesses" hidden>
            <div class="pw-criterion-layout">
              <div class="pw-criterion-main">
                <div class="pw-criterion-title-row">
                  <div>
                    <h4>Nearby Businesses</h4>
                    <p class="pw-small pw-muted">Interactive 500-meter straight-line radar &amp; commercial environment context.</p>
                  </div>
                  <span class="pw-badge pw-badge-weight">15% of MCE</span>
                </div>

                <!-- Proposed Business Type Card (Matching User Mockup) -->
                <div class="pw-nearby-type-card">
                  <div class="pw-nearby-type-header">
                    <span class="pw-nearby-type-label">Proposed Business Type</span>
                  </div>
                  <div class="pw-nearby-type-select-shell">
                    <select name="radar_business_type" id="pwNearbyBusinessType" class="pw-select-prominent">
                      <option value="cafe">Café &amp; Bakery</option>
                      <option value="retail">Convenience &amp; General Retail</option>
                      <option value="office">Commercial Office &amp; Services</option>
                      <option value="hospitality">Hospitality &amp; Accommodation</option>
                      <option value="industrial">Light Industrial &amp; Logistics</option>
                    </select>
                  </div>
                </div>

                <!-- 3 Metric Cards Grid (Matching User Mockup) -->
                <div class="pw-nearby-metrics-grid" aria-live="polite">
                  <div class="pw-nearby-metric-card">
                    <strong class="pw-nearby-metric-value" data-nearby-stat="total" data-density-count>—</strong>
                    <span class="pw-nearby-metric-label">Mapped places</span>
                  </div>
                  <div class="pw-nearby-metric-card">
                    <strong class="pw-nearby-metric-value pw-metric-comp" data-nearby-stat="competitors" data-radar-count="competitors">—</strong>
                    <span class="pw-nearby-metric-label">Currently classified competitors</span>
                  </div>
                  <div class="pw-nearby-metric-card">
                    <strong class="pw-nearby-metric-value pw-metric-compl" data-nearby-stat="complementary" data-radar-count="complementary">—</strong>
                    <span class="pw-nearby-metric-label">Currently classified complementary places</span>
                  </div>
                </div>

                <!-- Preserved Interactive 500m Radar Map & Synchronized Drawer -->
                <div class="pw-nearby-map-wrapper">
                  <div class="pw-radar-view">
                    <label class="pw-map-style">Map view 
                      <select data-map-style="radar">
                        <option value="streets">Street map</option>
                        <option value="satellite" selected>Satellite</option>
                      </select>
                    </label>
                    <label class="pw-field pw-field-inline">Reference point
                      <select name="reference_label">
                        <option value="location">Property location pin</option>
                        <option value="center">Parcel center</option>
                        <option value="entrance">Property entrance</option>
                      </select>
                    </label>
                    <label class="pw-toggle-field">
                      <span>500 m radar</span>
                      <span class="pw-toggle">
                        <input type="checkbox" checked data-radar-toggle>
                        <span class="pw-toggle-track"></span>
                        <span class="pw-toggle-label">On</span>
                      </span>
                    </label>
                  </div>

                  <p class="pw-map-feedback" data-map-feedback="radar" role="status" hidden></p>

                  <div class="pw-surroundings-columns">
                    <div class="pw-radar-left">
                      <div class="pw-map-shell pw-radar-shell">
                        <div id="pwRadarMap" class="pw-map pw-radar-map" data-radar-map aria-label="Establishments and roads within a 500 meter straight-line radius"></div>
                        <button type="button" class="pw-place-reference" data-place-reference><?= $pwIcon('pin') ?> Place reference point</button>
                        <div class="pw-radar-badge" data-radar-badge hidden><span class="pw-pulse-dot"></span><span data-radar-badge-text>500 m radar active</span></div>
                        <div class="pw-radar-map-pills" role="toolbar" aria-label="Filter map layers">
                          <button type="button" class="is-active" data-radar-map-filter="all" data-radar-filter="all">All</button>
                          <button type="button" data-radar-map-filter="competitors" data-radar-filter="competitors">Competitors</button>
                          <button type="button" data-radar-map-filter="related" data-radar-filter="related">Related</button>
                          <button type="button" data-radar-map-filter="complementary" data-radar-filter="complementary">Complementary</button>
                          <button type="button" data-radar-map-filter="roads" data-radar-filter="roads">Roads</button>
                        </div>
                        <div class="pw-radar-legend">
                          <span><i class="pw-dot pw-dot-red"></i>Direct Competitor</span>
                          <span><i class="pw-dot pw-dot-teal"></i>Complementary Place</span>
                          <span><i class="pw-dot pw-dot-amber"></i>Related Business</span>
                          <span><i class="pw-dot pw-dot-slate"></i>Other</span>
                          <span><i class="pw-legend-road"></i>Road</span>
                        </div>
                      </div>
                      <p class="pw-radar-caption" data-radar-caption>500 m straight-line radius from reference point. Drag the reference pin or switch reference point mode above.</p>
                    </div>

                    <aside class="pw-radar-results-card">
                      <div class="pw-radar-results-header">
                        <h4>Within 500 meters</h4>
                        <span class="pw-small pw-muted" data-radar-road-badge><?= $pwIcon('road') ?> <span data-radar-count="roads">—</span></span>
                      </div>
                      <div class="pw-tabs pw-radar-tabs" role="tablist" aria-label="Nearby results">
                        <button type="button" role="tab" aria-selected="true" class="is-active" data-radar-tab="all">All places</button>
                        <button type="button" role="tab" aria-selected="false" data-radar-tab="competitors">Competitors</button>
                        <button type="button" role="tab" aria-selected="false" data-radar-tab="related">Related</button>
                        <button type="button" role="tab" aria-selected="false" data-radar-tab="complementary">Complementary</button>
                        <button type="button" role="tab" aria-selected="false" data-radar-tab="roads">Roads</button>
                      </div>
                      <div class="pw-radar-search-shell">
                        <input type="search" class="pw-radar-search" data-radar-search placeholder="Filter places or roads…" aria-label="Filter nearby places">
                        <span class="pw-radar-filter-count" data-radar-filter-count></span>
                      </div>
                      <div class="pw-radar-results" data-radar-results>
                        <div class="pw-empty">
                          <?= $pwIcon('pin') ?>
                          <strong>Choose a reference point</strong>
                          <p>Locate the entrance or use the parcel center to check nearby mapped places.</p>
                        </div>
                      </div>
                      <div class="pw-radar-notices" data-radar-notices>
                        <div class="pw-notice pw-notice-neutral"><?= $pwIcon('info') ?>
                          <div>
                            <strong>Review proximity in context</strong>
                            <p>Nearby places do not establish customer demand. Mapped roads do not confirm legal road access.</p>
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>

                <!-- Business Environment Assessment (Below Map, Matching User Mockup) -->
                <div class="pw-nearby-assessment-card" data-nearby-assessment-card>
                  <div class="pw-nearby-assessment-header">
                    <div>
                      <h5>Business Environment Assessment</h5>
                      <span class="pw-small pw-muted">500 m screening · 15% of the assessment</span>
                    </div>
                    <span class="pw-badge pw-badge-amber" data-nearby-assessment-badge data-nearby-assessment-status data-nearby-assessment-score>Assessment Incomplete</span>
                  </div>
                  <p class="pw-nearby-assessment-explanation" data-nearby-assessment-explanation data-nearby-assessment-desc>
                    Scan nearby places to calculate a provisional score for the proposed business type.
                  </p>

                  <div class="pw-observed-metrics" aria-live="polite">
                    <div><span>Mapped businesses</span><strong data-nearby-observed-count>—</strong></div>
                    <div><span>Businesses / km²</span><strong data-nearby-observed-density>—</strong></div>
                    <div><span>Direct competitors</span><strong data-nearby-observed-competitors>—</strong></div>
                    <div><span>Complementary + anchors</span><strong data-nearby-observed-complements>—</strong></div>
                  </div>
                  <p class="pw-calculation-help" data-nearby-observed-formula>Density = unique mapped businesses ÷ 0.7854 km². Civic amenities and roads are excluded.</p>
                  <details class="pw-benchmark-details"><summary>How this score is calculated</summary>
                  <p class="pw-calculation-help">Provisional defaults for a 500 m radius: <?= \App\Support\NearbyBusinessScreening::BUSINESS_REFERENCE_COUNT ?> mapped businesses, <?= \App\Support\NearbyBusinessScreening::COMPLEMENTARY_REFERENCE_COUNT ?> complementary places and <?= \App\Support\NearbyBusinessScreening::ANCHOR_REFERENCE_COUNT ?> activity anchors correspond to full marks in those subcriteria. Each subcriterion is capped at 100. Direct competition is the share of mapped businesses competing with the selected business type. Anchors are counted separately from other complementary places.</p>
                  <p class="pw-calculation-help">Nearby score = activity &times; 25% + complementary &times; 30% + competition &times; 30% + anchors &times; 15%. <?= $pwEscape(\App\Support\NearbyBusinessScreening::DISCLAIMER) ?></p>
                  <div class="pw-nearby-subcriteria-grid" data-nearby-subcriteria-grid>
                    <div class="pw-nearby-subcrit-card" data-subcrit-card="commercial_activity" data-nearby-subcriterion="commercial_activity">
                      <div class="pw-subcrit-card-top">
                        <span class="pw-subcrit-name">Commercial Activity</span>
                        <span class="pw-badge pw-badge-weight">25%</span>
                      </div>
                      <div class="pw-subcrit-score-row">
                        <strong data-subcrit-score="commercial_activity">Scan needed</strong>
                      </div>
                      <div class="pw-criterion-bar"><span style="width: 0%" data-subcrit-bar="commercial_activity" data-nearby-score-bar></span></div>
                      <small class="pw-muted" data-subcrit-rule="commercial_activity">Calculated from the 500 m inventory</small>
                    </div>

                    <div class="pw-nearby-subcrit-card" data-subcrit-card="complementary_businesses" data-nearby-subcriterion="complementary_businesses">
                      <div class="pw-subcrit-card-top">
                        <span class="pw-subcrit-name">Complementary Businesses</span>
                        <span class="pw-badge pw-badge-weight">30%</span>
                      </div>
                      <div class="pw-subcrit-score-row">
                        <strong data-subcrit-score="complementary_businesses">Scan needed</strong>
                      </div>
                      <div class="pw-criterion-bar"><span style="width: 0%" data-subcrit-bar="complementary_businesses"></span></div>
                      <small class="pw-muted" data-subcrit-rule="complementary_businesses">Calculated from the 500 m inventory</small>
                    </div>

                    <div class="pw-nearby-subcrit-card" data-subcrit-card="competitive_pressure" data-nearby-subcriterion="competitive_pressure">
                      <div class="pw-subcrit-card-top">
                        <span class="pw-subcrit-name">Competitive Pressure</span>
                        <span class="pw-badge pw-badge-weight">30%</span>
                      </div>
                      <div class="pw-subcrit-score-row">
                        <strong data-subcrit-score="competitive_pressure">Scan needed</strong>
                      </div>
                      <div class="pw-criterion-bar"><span style="width: 0%" data-subcrit-bar="competitive_pressure"></span></div>
                      <small class="pw-muted" data-subcrit-rule="competitive_pressure">Calculated from the 500 m inventory</small>
                    </div>

                    <div class="pw-nearby-subcrit-card" data-subcrit-card="activity_anchors" data-nearby-subcriterion="activity_anchors">
                      <div class="pw-subcrit-card-top">
                        <span class="pw-subcrit-name">Activity Anchors</span>
                        <span class="pw-badge pw-badge-weight">15%</span>
                      </div>
                      <div class="pw-subcrit-score-row">
                        <strong data-subcrit-score="activity_anchors">Scan needed</strong>
                      </div>
                      <div class="pw-criterion-bar"><span style="width: 0%" data-subcrit-bar="activity_anchors"></span></div>
                      <small class="pw-muted" data-subcrit-rule="activity_anchors">Calculated from the 500 m inventory</small>
                    </div>
                  </div>

                  </details>
                  <div class="pw-nearby-mce-summary">
                    <div>
                      <span class="pw-nearby-mce-title">MCE Contribution:</span>
                      <strong data-nearby-mce-contrib data-nearby-iai-contrib>Run nearby search</strong>
                      <span class="pw-muted">&middot; 15% of overall MCE weight</span>
                    </div>
                    <small class="pw-muted" data-nearby-mce-formula>Formula: Business Environment Score &times; 0.15. Missing source data is never defaulted.</small>
                  </div>
                </div>

                <!-- Expandable Data Sources & Corridor Details -->
                <details class="pw-disclosure pw-nearby-details-disclosure" style="margin-top: 14px;">
                  <summary><?= $pwIcon('document') ?><span>Data sources, inventory coverage &amp; corridor notes</span><?= $pwIcon('chevron') ?></summary>
                  <div class="pw-sources-inner" style="margin-top: 10px;">
                    <div class="pw-density-summary" aria-live="polite" style="margin-bottom: 12px;">
                      <div><strong data-density-value>—</strong><span>Observed businesses / km²</span></div>
                      <p data-density-note>Confirm a property pin to check nearby business density.</p>
                    </div>
                    <div class="pw-small pw-muted" data-radar-coverage style="margin-bottom: 12px;">Mapped establishments and roads will show their available source information after the radar runs. Missing coverage is marked Not assessed.</div>
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
                      <label class="pw-field pw-full">Commercial corridor / cluster context <span class="pw-muted">(optional)</span>
                        <input name="commercial_corridor" maxlength="180" placeholder="e.g. MacArthur Highway Corridor, Sevilla Central">
                      </label>
                      <label class="pw-field">Commercial analysis origin
                        <select name="nearby_analysis_origin">
                      <option value="" selected>Not recorded</option>
                          <option value="surroundings_radar">Surroundings 500m Radar</option>
                          <option value="bplo_registry">City BPLO Commercial Census</option>
                          <option value="field_survey">Field site inventory</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </details>
              </div>

              <aside class="pw-criterion-aside">
                <div class="pw-helper-card">
                  <div class="pw-helper-header">
                    <span class="pw-helper-icon"><?= $pwIcon('info') ?></span>
                    <h4>What counts as evidence?</h4>
                  </div>
                  <ul class="pw-helper-list">
                    <li><strong>500m Radar screening</strong><br>Geographic straight-line radius screening showing live mapped establishments, POIs, and intersecting roads.</li>
                    <li><strong>BPLO registry extract</strong><br>City Business Permits and Licensing Office records showing registered commercial enterprises.</li>
                    <li><strong>Corridor census inventory</strong><br>Field-verified list of operating businesses along the commercial strip.</li>
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

            <!-- Criterion Navigation Footer -->
            <div class="pw-criterion-nav-footer">
              <button type="button" class="pw-button pw-button-light pw-button-small" data-criterion-prev="economic_viability">
                <?= $pwIcon('arrow', 'pw-icon-prev') ?> <span>Previous Criterion: Cost &amp; Market</span>
              </button>
              <span class="pw-criterion-nav-hint"><?= $pwIcon('save') ?> Auto-saves on navigation</span>
              <button type="button" class="pw-button pw-button-primary pw-button-small" data-criterion-next="risk_constraints">
                <span>Next Criterion: Risk Constraints</span> <?= $pwIcon('arrow') ?>
              </button>
            </div>
          </div>

          <!-- 5. RISK CONSTRAINTS PANE (Hazard screening & review) -->
          <div id="pwCriterionRisks" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="risk_constraints" hidden>
            <div class="pw-screening-container pw-risk-criterion-card">
              <!-- Unified Criterion Header -->
              <div class="pw-spatial-header">
                <div class="pw-spatial-heading-group">
                  <span class="pw-spatial-eyebrow">Criterion 5 &middot; Multi-Criteria Evaluation</span>
                  <h3 class="pw-spatial-title">Risk &amp; Hazard Constraints</h3>
                  <p class="pw-spatial-subtitle">Review municipal hazard layers and parcel vulnerability.</p>
                </div>
                <div class="pw-spatial-header-badges">
                  <span class="pw-badge pw-badge-provisional">Provisional model</span>
                  <span class="pw-badge pw-badge-weight">15% of MCE</span>
                </div>
              </div>

              <!-- Multi-Hazard Vulnerability Tracker Ribbon -->
              <div class="pw-risk-utility-ribbon" role="region" aria-label="Multi-hazard screening summary">
                <div class="pw-risk-utility-pill" data-risk-status-pill="flood">
                  <span class="pw-risk-pill-icon pw-risk-icon-flood"><?= $pwIcon('water') ?></span>
                  <div class="pw-risk-pill-meta">
                    <span class="pw-risk-pill-name">Flood</span>
                    <span class="pw-risk-pill-weight">MGB &middot; 25%</span>
                  </div>
                  <span class="pw-risk-pill-status" data-risk-chip-status="flood">Pending</span>
                </div>
                <div class="pw-risk-utility-pill" data-risk-status-pill="landslide">
                  <span class="pw-risk-pill-icon pw-risk-icon-landslide"><?= $pwIcon('mountain') ?></span>
                  <div class="pw-risk-pill-meta">
                    <span class="pw-risk-pill-name">Landslide</span>
                    <span class="pw-risk-pill-weight">MGB &middot; 15%</span>
                  </div>
                  <span class="pw-risk-pill-status" data-risk-chip-status="landslide">Pending</span>
                </div>
                <div class="pw-risk-utility-pill" data-risk-status-pill="faults">
                  <span class="pw-risk-pill-icon pw-risk-icon-faults"><?= $pwIcon('activity') ?></span>
                  <div class="pw-risk-pill-meta">
                    <span class="pw-risk-pill-name">Active Fault</span>
                    <span class="pw-risk-pill-weight">PHIVOLCS &middot; 25%</span>
                  </div>
                  <span class="pw-risk-pill-status" data-risk-chip-status="faults">Pending</span>
                </div>
                <div class="pw-risk-utility-pill" data-risk-status-pill="storm_surge">
                  <span class="pw-risk-pill-icon pw-risk-icon-surge"><?= $pwIcon('wind') ?></span>
                  <div class="pw-risk-pill-meta">
                    <span class="pw-risk-pill-name">Storm Surge</span>
                    <span class="pw-risk-pill-weight">PAGASA &middot; 15%</span>
                  </div>
                  <span class="pw-risk-pill-status" data-risk-chip-status="storm_surge">Pending</span>
                </div>
                <div class="pw-risk-utility-pill" data-risk-status-pill="liquefaction">
                  <span class="pw-risk-pill-icon pw-risk-icon-liquefaction"><?= $pwIcon('layers') ?></span>
                  <div class="pw-risk-pill-meta">
                    <span class="pw-risk-pill-name">Liquefaction</span>
                    <span class="pw-risk-pill-weight">PHIVOLCS &middot; 10%</span>
                  </div>
                  <span class="pw-risk-pill-status" data-risk-chip-status="liquefaction">Pending</span>
                </div>
                <div class="pw-risk-utility-pill" data-risk-status-pill="tsunami">
                  <span class="pw-risk-pill-icon pw-risk-icon-tsunami"><?= $pwIcon('water') ?></span>
                  <div class="pw-risk-pill-meta">
                    <span class="pw-risk-pill-name">Tsunami</span>
                    <span class="pw-risk-pill-weight">PHIVOLCS &middot; 10%</span>
                  </div>
                  <span class="pw-risk-pill-status" data-risk-chip-status="tsunami">Pending</span>
                </div>
              </div>

              <!-- Retained metadata binding for script compatibility (hidden from intake view) -->
              <div class="pw-screening-header-bar" style="display:none;" hidden aria-hidden="true">
                <span data-screening-property-crumb><?= $pwEscape($property['title'] ?? 'Sample lot A') ?></span>
              </div>

              <!-- Reused Location Context Banner for tests & sync -->
              <div class="pw-reused-banner" data-risk-reused-banner style="display: none;">
                <span class="pw-reused-icon"><?= $pwIcon('pin') ?></span>
                <div>
                  <span class="pw-reused-label">Reused boundary &amp; coordinates from Step 2</span>
                  <strong class="pw-reused-value" data-reused-coords>Location not yet specified</strong>
                </div>
                <div class="pw-reused-secondary">
                  <span>Barangay: <strong data-reused-barangay>Not specified</strong></span>
                  <span>Parcel area: <strong data-reused-area>Not specified</strong></span>
                </div>
              </div>

              <!-- Two Column Grid -->
              <div class="pw-screening-grid">
                <!-- LEFT COLUMN: Assessment Form & Findings -->
                <div class="pw-screening-col-main">

                  <!-- 1. Location Assessed Card -->
                  <div class="pw-screening-card">
                    <div class="pw-card-header">
                      <div class="pw-card-title-group">
                        <span class="pw-step-number-circle">1</span>
                        <h3 class="pw-card-title">Location assessed</h3>
                      </div>
                      <button type="button" class="pw-button pw-button-light pw-button-small" data-jump-step2-location>
                        <?= $pwIcon('edit') ?> <span>Edit property location</span>
                      </button>
                    </div>
                    <div class="pw-card-body pw-location-assessed-grid">
                      <div class="pw-location-form-fields">
                        <div class="pw-location-summary-box" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:12px;">
                          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <strong style="color:#0f172a; font-size:13.5px;" data-canonical-property-name><?= $pwEscape($property['title'] ?? 'Untitled Property') ?></strong>
                            <span class="pw-badge pw-badge-teal" data-canonical-barangay><?= $pwEscape($property['barangay'] ?? 'San Fernando') ?></span>
                          </div>
                          <div style="font-size:12px; color:#64748b; display:flex; flex-wrap:wrap; gap:12px;">
                            <span><?= $pwIcon('pin') ?> <strong data-canonical-coords><?= !empty($property['latitude']) ? ($pwEscape($property['latitude']) . ', ' . $pwEscape($property['longitude'])) : 'Pin pending' ?></strong></span>
                            <span><?= $pwIcon('area') ?> <strong data-canonical-area><?= !empty($property['area']) ? ($pwEscape($property['area']) . ' ha') : 'Area pending' ?></strong></span>
                          </div>
                        </div>

                        <!-- Expandable option for separate assessed coordinates if supporting document uses a different point -->
                        <details class="pw-disclosure" style="margin-bottom:12px;">
                          <summary><?= $pwIcon('pin') ?> <span>Supporting document uses different coordinates</span><?= $pwIcon('chevron') ?></summary>
                          <div style="padding-top:10px;">
                            <div class="pw-sc-coords-row">
                              <label class="pw-sc-field">
                                <span class="pw-sc-label">Assessed Latitude</span>
                                <input type="text" id="pwRiskAssessedLat" name="risk_assessed_lat" class="pw-sc-input" placeholder="Latitude from report" value="<?= $pwEscape($property['risk_assessed_lat'] ?? '') ?>">
                              </label>
                              <label class="pw-sc-field">
                                <span class="pw-sc-label">Assessed Longitude</span>
                                <input type="text" id="pwRiskAssessedLng" name="risk_assessed_lng" class="pw-sc-input" placeholder="Longitude from report" value="<?= $pwEscape($property['risk_assessed_lng'] ?? '') ?>">
                              </label>
                            </div>
                            <label class="pw-sc-field" style="margin-top:8px;">
                              <span class="pw-sc-label">Reason for coordinate difference</span>
                              <input type="text" name="risk_coords_difference_reason" class="pw-sc-input" placeholder="e.g. Report evaluated northeast boundary corner monument" value="<?= $pwEscape($property['risk_coords_difference_reason'] ?? '') ?>">
                            </label>
                          </div>
                        </details>

                        <!-- Hidden compatibility inputs for existing scripts and tests (no duplicate name="latitude" / name="longitude") -->
                        <input type="hidden" id="pwRiskPropertyName" value="<?= $pwEscape($property['title'] ?? '') ?>">
                        <input type="hidden" id="pwRiskLatitude" value="<?= $pwEscape($property['latitude'] ?? '') ?>">
                        <input type="hidden" id="pwRiskLongitude" value="<?= $pwEscape($property['longitude'] ?? '') ?>">

                        <div class="pw-sc-scope-row">
                          <label class="pw-sc-field pw-sc-scope-field">
                            <span class="pw-sc-label">Assessment scope</span>
                            <select id="pwRiskAssessmentScope" name="risk_assessment_scope" class="pw-sc-select">
                              <option value="selected_point" selected>Selected point</option>
                              <option value="entire_parcel">Entire parcel</option>
                              <option value="buffer_corridor">Buffer corridor (50m)</option>
                            </select>
                          </label>
                          <button type="button" class="pw-btn-check-location" id="pwRiskCheckLocationBtn">
                            <?= $pwIcon('pin') ?>
                            <span>Check location</span>
                          </button>
                        </div>
                        <p class="pw-sc-caption-note">A selected-point report does not describe exposure across the entire parcel.</p>
                      </div>

                      <div class="pw-location-map-preview">
                        <div class="pw-mini-map-container" id="pwRiskMiniMap">
                          <div class="pw-mini-map-canvas" id="pwRiskMiniMapCanvas" data-risk-mini-map-canvas style="width:100%;height:100%;min-height:185px;"></div>
                          <span class="pw-map-illustrative-badge">Location assessed</span>
                        </div>
                        <p class="pw-sc-caption-note">Property location reference. Imagery alone does not establish hazard exposure or a clearance.</p>
                      </div>
                    </div>
                  </div>

                  <!-- 2. Source Document Card -->
                  <div class="pw-screening-card">
                    <div class="pw-card-header">
                      <div class="pw-card-title-group">
                        <span class="pw-step-number-circle">2</span>
                        <h3 class="pw-card-title">Source document</h3>
                      </div>
                      <a href="https://hazardhunter.georisk.gov.ph/" target="_blank" rel="noopener noreferrer" class="pw-btn-external-source">
                        <span>Open HazardHunterPH</span>
                        <svg class="pw-icon-ext" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                      </a>
                    </div>
                    <div class="pw-card-body">
                      <div class="pw-sc-field">
                        <span class="pw-sc-label">Source</span>
                        <select name="hazard_evidence_source" class="pw-sc-select" id="pwRiskSourceSelect">
                      <option value="" selected>Not recorded</option>
                          <option value="HazardHunterPH — indicative report">HazardHunterPH &mdash; indicative report</option>
                          <option value="DENR-MGB Geohazard Assessment Sheet">DENR-MGB Geohazard Assessment Sheet</option>
                          <option value="DOST-PHIVOLCS Official Certification">DOST-PHIVOLCS Official Certification</option>
                          <option value="CDRRMO Local Hazard Map">CDRRMO Local Hazard Map</option>
                          <option value="Other official engineering study">Other official engineering study</option>
                        </select>
                      </div>
                      <div class="pw-sc-source-details-row">
                        <label class="pw-sc-field">
                          <span class="pw-sc-label">Report generated on</span>
                          <input type="date" name="hazard_evidence_date" class="pw-sc-input" id="pwRiskReportDate" value="<?= $pwEscape($property['hazard_evidence_date'] ?? '') ?>">
                        </label>
                        <label class="pw-sc-field">
                          <span class="pw-sc-label">Reference / report link</span>
                          <input type="text" name="hazard_evidence_reference" class="pw-sc-input" id="pwRiskReportRef" placeholder="Paste source reference" value="<?= $pwEscape($property['hazard_evidence_reference'] ?? '') ?>">
                        </label>
                      </div>

                      <div class="pw-sc-upload-wrapper">
                        <div class="pw-sc-dropzone" id="pwRiskDropzone">
                          <input type="file" id="pwRiskFileInput" class="pw-hidden-file-input" accept=".pdf,.jpg,.jpeg,.png">
                          <div class="pw-dropzone-icon">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                          </div>
                          <strong class="pw-dropzone-title">Upload assessment report or supporting map</strong>
                          <span class="pw-dropzone-sub">PDF, JPG, PNG &middot; Subject to review</span>
                        </div>
                        <div class="pw-sc-file-chip" id="pwRiskFileChip" style="<?= empty($property['hazard_evidence_file']) ? 'display: none;' : '' ?>">
                          <div class="pw-file-icon-pdf">PDF</div>
                          <div class="pw-file-chip-info">
                            <strong class="pw-file-name" id="pwRiskFileName"><?= $pwEscape($property['hazard_evidence_file'] ?? '') ?></strong>
                            <span class="pw-file-sub" id="pwRiskFileStatus"><?= !empty($property['hazard_evidence_file']) ? 'Subject to review' : '' ?></span>
                          </div>
                          <button type="button" class="pw-file-chip-remove" id="pwRiskFileRemove" aria-label="Remove attachment">&times;</button>
                        </div>
                      </div>
                      <p class="pw-sc-caption-note">Store the report date separately from the upload date.</p>
                    </div>
                  </div>

                  <!-- 3. Reported Findings Card -->
                  <div class="pw-screening-card">
                    <div class="pw-card-header">
                      <div class="pw-card-title-group">
                        <span class="pw-step-number-circle">3</span>
                        <h3 class="pw-card-title">Reported findings</h3>
                      </div>
                      <div class="pw-findings-header-badges">
                        <span class="pw-badge pw-badge-provisional">Authoritative Agency Datasets</span>
                        <span class="pw-badge pw-badge-weight">15% of MCE</span>
                      </div>
                    </div>
                    <div class="pw-card-body">
                      <!-- Critical Site Constraint Alert Banner (Active Fault) -->
                      <div class="pw-risk-critical-banner" data-risk-critical-banner hidden>
                        <span class="pw-risk-critical-icon" aria-hidden="true">⚠️</span>
                        <div>
                          <strong>DOST-PHIVOLCS ACTIVE FAULT SETBACK CORRIDOR</strong>
                          <p data-risk-critical-desc>Parcel boundary intersects or is within the recommended 5-meter active fault setback corridor (DOST-PHIVOLCS). Special geotechnical investigation is recommended; structural designs and clearances must conform to local building official and PHIVOLCS development guidelines.</p>
                        </div>
                      </div>

                      <!-- Official Guidance & Quick-Fill Preset Banner -->
                      <div class="pw-hazard-guide-banner">
                        <div class="pw-hazard-guide-content">
                          <span class="pw-hazard-guide-icon"><?= $pwIcon('shield') ?></span>
                          <div class="pw-hazard-guide-text">
                            <strong>Authoritative Agency Classifications</strong>
                            <p>Choose the classification stated in your source for each hazard. The result updates immediately. Unknown findings stay pending; higher suitability scores indicate lower recorded disaster risk.</p>
                          </div>
                        </div>
                        <div class="pw-hazard-guide-actions">
                          <button type="button" class="pw-button pw-button-light pw-button-small" id="pwRiskQuickClearBtn" title="Fill unrecorded hazards with 'No mapped exposure'">
                            <?= $pwIcon('utilities') ?> <span>All-Clear Preset</span>
                          </button>
                        </div>
                      </div>

                      <div class="pw-hazard-grid-6 pw-findings-table-responsive">
                        <table class="pw-findings-table" id="pwRiskFindingsTable">
                          <thead>
                            <tr>
                              <th style="width: 34%;">Hazard &amp; Agency Dataset</th>
                              <th style="width: 40%;">Reported Source Finding</th>
                              <th style="width: 26%;">Suitability Score &amp; Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            <!-- Flood (DENR-MGB, 25%) -->
                            <tr class="pw-hazard-row-compact" data-hazard-row="flood">
                              <td class="pw-hazard-col-cell">
                                <div class="pw-hazard-identity">
                                  <span class="pw-hazard-symbol pw-hazard-symbol--blue"><?= $pwIcon('water') ?></span>
                                  <div class="pw-hazard-meta">
                                    <div class="pw-hazard-label-group">
                                      <strong>Flood</strong>
                                      <span class="pw-hazard-agency-badge">DENR-MGB</span>
                                      <span class="pw-hazard-weight-tag">25%</span>
                                    </div>
                                    <span class="pw-hazard-sub-hint">Riverine &amp; pluvial overflow</span>
                                  </div>
                                </div>
                                <span class="pw-hazard-inline-desc" data-hazard-flood-desc style="display:none;">Pluvial and riverine inundation susceptibility during extreme precipitation events.</span>
                                <span data-hazard-flood-score style="display:none;">—</span>
                              </td>
                              <td>
                                <select name="hazard_finding_flood" class="pw-finding-input" data-finding-hazard="flood" aria-label="flood source finding"><option value="">Choose source finding</option><option value="none">No mapped exposure</option><option value="low">Low susceptibility</option><option value="moderate">Moderate susceptibility</option><option value="high">High susceptibility</option><option value="very_high">Very high susceptibility</option><option value="unknown">Unknown / not assessed</option></select>
                              </td>
                              <td class="pw-evidence-col-cell">
                                <div class="pw-hazard-rating-stack">
                                  <span class="pw-pill pw-pill--gray" data-hazard-flood-pill>Not recorded</span>
                                  <span class="pw-hazard-pts-tag"><strong data-risk-pts-flood>—</strong> <small>/ 25 pts</small></span>
                                </div>
                              </td>
                            </tr>

                            <!-- Rain-induced landslide (DENR-MGB, 15%) -->
                            <tr class="pw-hazard-row-compact" data-hazard-row="landslide">
                              <td class="pw-hazard-col-cell">
                                <div class="pw-hazard-identity">
                                  <span class="pw-hazard-symbol pw-hazard-symbol--amber"><?= $pwIcon('mountain') ?></span>
                                  <div class="pw-hazard-meta">
                                    <div class="pw-hazard-label-group">
                                      <strong>Rain-induced landslide</strong>
                                      <span class="pw-hazard-agency-badge">DENR-MGB</span>
                                      <span class="pw-hazard-weight-tag">15%</span>
                                    </div>
                                    <span class="pw-hazard-sub-hint">Slope stability &amp; mass wasting</span>
                                  </div>
                                </div>
                                <span class="pw-hazard-inline-desc" data-hazard-landslide-desc style="display:none;">Slope stability and mass-movement hazard in upland and bluff terrains.</span>
                                <span data-hazard-landslide-score style="display:none;">—</span>
                              </td>
                              <td>
                                <select name="hazard_finding_landslide" class="pw-finding-input" data-finding-hazard="landslide" aria-label="landslide source finding"><option value="">Choose source finding</option><option value="none">No mapped exposure</option><option value="low">Low susceptibility</option><option value="moderate">Moderate susceptibility</option><option value="high">High susceptibility</option><option value="very_high">Very high susceptibility</option><option value="unknown">Unknown / not assessed</option></select>
                              </td>
                              <td class="pw-evidence-col-cell">
                                <div class="pw-hazard-rating-stack">
                                  <span class="pw-pill pw-pill--gray" data-hazard-landslide-pill>Not recorded</span>
                                  <span class="pw-hazard-pts-tag"><strong data-risk-pts-landslide>—</strong> <small>/ 15 pts</small></span>
                                </div>
                              </td>
                            </tr>

                            <!-- Active fault (DOST-PHIVOLCS, 25%) -->
                            <tr class="pw-hazard-row-compact" data-hazard-row="faults">
                              <td class="pw-hazard-col-cell">
                                <div class="pw-hazard-identity">
                                  <span class="pw-hazard-symbol pw-hazard-symbol--red"><?= $pwIcon('activity') ?></span>
                                  <div class="pw-hazard-meta">
                                    <div class="pw-hazard-label-group">
                                      <strong>Active fault</strong>
                                      <span class="pw-hazard-agency-badge">DOST-PHIVOLCS</span>
                                      <span class="pw-hazard-weight-tag">25%</span>
                                    </div>
                                    <span class="pw-hazard-sub-hint">5m setback corridor &amp; rupture trace</span>
                                  </div>
                                </div>
                                <span class="pw-hazard-inline-desc" data-hazard-fault-desc style="display:none;">Active fault trace proximity and recommended 5-meter structural setback corridor.</span>
                                <span data-hazard-fault-score style="display:none;">—</span>
                              </td>
                              <td>
                                <select name="hazard_finding_fault" class="pw-finding-input" data-finding-hazard="faults" aria-label="faults source finding"><option value="">Choose source finding</option><option value="none">No mapped exposure</option><option value="low">Low susceptibility</option><option value="moderate">Moderate susceptibility</option><option value="high">High susceptibility</option><option value="very_high">Very high susceptibility</option><option value="critical">Active fault corridor conflict</option><option value="unknown">Unknown / not assessed</option></select>
                              </td>
                              <td class="pw-evidence-col-cell">
                                <div class="pw-hazard-rating-stack">
                                  <span class="pw-pill pw-pill--gray" data-hazard-fault-pill>Not recorded</span>
                                  <span class="pw-hazard-pts-tag"><strong data-risk-pts-fault>—</strong> <small>/ 25 pts</small></span>
                                </div>
                              </td>
                            </tr>

                            <!-- Storm surge (DOST-PAGASA, 15%) -->
                            <tr class="pw-hazard-row-compact" data-hazard-row="storm_surge">
                              <td class="pw-hazard-col-cell">
                                <div class="pw-hazard-identity">
                                  <span class="pw-hazard-symbol pw-hazard-symbol--cyan"><?= $pwIcon('wind') ?></span>
                                  <div class="pw-hazard-meta">
                                    <div class="pw-hazard-label-group">
                                      <strong>Storm surge</strong>
                                      <span class="pw-hazard-agency-badge">DOST-PAGASA</span>
                                      <span class="pw-hazard-weight-tag">15%</span>
                                    </div>
                                    <span class="pw-hazard-sub-hint">Typhoon storm surge inundation</span>
                                  </div>
                                </div>
                                <span class="pw-hazard-inline-desc" data-hazard-storm-surge-desc style="display:none;">Coastal storm surge inundation risk during severe tropical cyclones.</span>
                                <span data-hazard-storm-surge-score style="display:none;">—</span>
                              </td>
                              <td>
                                <select name="hazard_finding_surge" class="pw-finding-input" data-finding-hazard="storm_surge" aria-label="storm surge source finding"><option value="">Choose source finding</option><option value="none">No mapped exposure</option><option value="low">Low susceptibility</option><option value="moderate">Moderate susceptibility</option><option value="high">High susceptibility</option><option value="very_high">Very high susceptibility</option><option value="unknown">Unknown / not assessed</option></select>
                              </td>
                              <td class="pw-evidence-col-cell">
                                <div class="pw-hazard-rating-stack">
                                  <span class="pw-pill pw-pill--gray" data-hazard-storm-surge-pill>Not recorded</span>
                                  <span class="pw-hazard-pts-tag"><strong data-risk-pts-surge>—</strong> <small>/ 15 pts</small></span>
                                </div>
                              </td>
                            </tr>

                            <!-- Liquefaction (DOST-PHIVOLCS, 10%) -->
                            <tr class="pw-hazard-row-compact" data-hazard-row="liquefaction">
                              <td class="pw-hazard-col-cell">
                                <div class="pw-hazard-identity">
                                  <span class="pw-hazard-symbol pw-hazard-symbol--purple"><?= $pwIcon('layers') ?></span>
                                  <div class="pw-hazard-meta">
                                    <div class="pw-hazard-label-group">
                                      <strong>Liquefaction</strong>
                                      <span class="pw-hazard-agency-badge">DOST-PHIVOLCS</span>
                                      <span class="pw-hazard-weight-tag">10%</span>
                                    </div>
                                    <span class="pw-hazard-sub-hint">Saturated alluvium cyclic shaking</span>
                                  </div>
                                </div>
                                <span class="pw-hazard-inline-desc" data-hazard-liquefaction-desc style="display:none;">Soil strength loss under cyclic seismic shaking in saturated alluvial deposits.</span>
                                <span data-hazard-liquefaction-score style="display:none;">—</span>
                              </td>
                              <td>
                                <select name="hazard_finding_liquefaction" class="pw-finding-input" data-finding-hazard="liquefaction" aria-label="liquefaction source finding"><option value="">Choose source finding</option><option value="none">No mapped exposure</option><option value="low">Low susceptibility</option><option value="moderate">Moderate susceptibility</option><option value="high">High susceptibility</option><option value="very_high">Very high susceptibility</option><option value="unknown">Unknown / not assessed</option></select>
                              </td>
                              <td class="pw-evidence-col-cell">
                                <div class="pw-hazard-rating-stack">
                                  <span class="pw-pill pw-pill--gray" data-hazard-liquefaction-pill>Not recorded</span>
                                  <span class="pw-hazard-pts-tag"><strong data-risk-pts-liquefaction>—</strong> <small>/ 10 pts</small></span>
                                </div>
                              </td>
                            </tr>

                            <!-- Tsunami (DOST-PHIVOLCS, 10%) -->
                            <tr class="pw-hazard-row-compact" data-hazard-row="tsunami">
                              <td class="pw-hazard-col-cell">
                                <div class="pw-hazard-identity">
                                  <span class="pw-hazard-symbol pw-hazard-symbol--teal"><?= $pwIcon('water') ?></span>
                                  <div class="pw-hazard-meta">
                                    <div class="pw-hazard-label-group">
                                      <strong>Tsunami</strong>
                                      <span class="pw-hazard-agency-badge">DOST-PHIVOLCS</span>
                                      <span class="pw-hazard-weight-tag">10%</span>
                                    </div>
                                    <span class="pw-hazard-sub-hint">Seismic coastal run-up zone</span>
                                  </div>
                                </div>
                                <span class="pw-hazard-inline-desc" data-hazard-tsunami-desc style="display:none;">Seismogenic coastal tsunami run-up and inundation vulnerability zone.</span>
                                <span data-hazard-tsunami-score style="display:none;">—</span>
                              </td>
                              <td>
                                <select name="hazard_finding_tsunami" class="pw-finding-input" data-finding-hazard="tsunami" aria-label="tsunami source finding"><option value="">Choose source finding</option><option value="none">No mapped exposure</option><option value="low">Low susceptibility</option><option value="moderate">Moderate susceptibility</option><option value="high">High susceptibility</option><option value="very_high">Very high susceptibility</option><option value="unknown">Unknown / not assessed</option></select>
                              </td>
                              <td class="pw-evidence-col-cell">
                                <div class="pw-hazard-rating-stack">
                                  <span class="pw-pill pw-pill--gray" data-hazard-tsunami-pill>Not recorded</span>
                                  <span class="pw-hazard-pts-tag"><strong data-risk-pts-tsunami>—</strong> <small>/ 10 pts</small></span>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div class="pw-add-finding-action">
                        <button type="button" class="pw-btn-add-finding" id="pwRiskAddFindingBtn">
                          <span style="font-weight: 700; font-size: 14px;">+</span> Add hazard finding
                        </button>
                      </div>

                      <p class="pw-sc-caption-note" style="margin-top: 10px;">Retain source wording and units. Do not infer safety from a blank result.</p>
                      <div class="pw-table-footer-record">
                        <span>Record &middot; No hazard classifications supplied</span>
                      </div>

                      <!-- Integrated Executive Multi-Hazard Scorecard Card -->
                      <div class="pw-risk-scorecard-card pw-risk-assessment-embed" data-risk-preview-card>
                        <div class="pw-risk-scorecard-header">
                          <div class="pw-risk-scorecard-title-group">
                            <span class="pw-risk-scorecard-icon"><?= $pwIcon('shield') ?></span>
                            <div>
                              <h4 class="pw-risk-scorecard-title">MCE Multi-Hazard Suitability Scorecard</h4>
                              <span class="pw-risk-scorecard-sub">Criterion 5 preliminary screening &middot; 15% overall MCE weight</span>
                            </div>
                          </div>
                          <span class="pw-badge pw-badge-calculated" data-risk-status-badge>Pending Screening</span>
                        </div>

                        <div class="pw-risk-score-hero">
                          <div class="pw-risk-score-display">
                            <span class="pw-risk-score-number"><strong data-risk-total-score>—</strong><small>/ 100</small></span>
                            <span class="pw-risk-score-label">Suitability Index</span>
                          </div>
                          <div class="pw-risk-score-meta">
                            <div class="pw-risk-contribution-pill">
                              <span class="pw-risk-contrib-icon"><?= $pwIcon('chart') ?></span>
                              <span>15% MCE Contribution: <strong data-risk-iai-pts>—</strong> / 15.00 pts</span>
                            </div>
                            <p class="pw-risk-score-note" data-risk-next-action aria-live="polite">Choose all six hazard findings to calculate a weighted score.</p>
                          </div>
                        </div>

                        <div class="pw-infra-progress-track pw-risk-progress-track">
                          <div class="pw-infra-progress-bar pw-risk-progress-bar" data-risk-progress-bar style="width: 0%; background: #dc2626;"></div>
                        </div>
                        <!-- High Hazard Warnings Container -->
                        <div class="pw-risk-warnings-box" data-risk-warnings-box hidden>
                          <div class="pw-risk-warnings-head">
                            <span class="pw-risk-warning-icon">⚠️</span>
                            <strong>Identified Elevated Hazards &amp; Site Alerts:</strong>
                          </div>
                          <ul class="pw-risk-warnings-list" data-risk-warnings-list></ul>
                        </div>

                        <!-- Technical details disclosure -->
                        <details class="pw-disclosure pw-risk-technical-details">
                          <summary class="pw-risk-disclosure-summary">
                            <?= $pwIcon('info') ?>
                            <span>Technical details &amp; screening methodology</span>
                            <?= $pwIcon('chevron') ?>
                          </summary>
                          <div class="pw-risk-tech-content">
                            <div class="pw-risk-methodology-intro">
                              Evaluated under the official <strong>LOCUS-SF Multi-Criteria Evaluation (MCE)</strong> methodology. Scoring uses authoritative spatial hazard layers published by national agencies:
                            </div>
                            <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
                              <thead>
                                <tr style="border-bottom: 1px solid #cbd5e1; text-align: left;">
                                  <th>Subcriterion</th><th>Agency</th><th>Weight</th><th>Buffer / Layer</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr><td>Flood Susceptibility</td><td>DENR-MGB</td><td>25%</td><td>1:10,000 Inundation Map</td></tr>
                                <tr><td>Active Fault</td><td>DOST-PHIVOLCS</td><td>25%</td><td>5m Setback Corridor; &le;5km Proximity</td></tr>
                                <tr><td>Landslide Susceptibility</td><td>DENR-MGB</td><td>15%</td><td>Rain-Induced Landslide Polygon</td></tr>
                                <tr><td>Storm Surge Exposure</td><td>DOST-PAGASA</td><td>15%</td><td>Coastal Surge Advisory Zone</td></tr>
                                <tr><td>Liquefaction Susceptibility</td><td>DOST-PHIVOLCS</td><td>10%</td><td>Alluvial Liquefaction Zone</td></tr>
                                <tr><td>Tsunami Exposure</td><td>DOST-PHIVOLCS</td><td>10%</td><td>Coastal Inundation Run-up</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </details>
                      </div>

                      <!-- General site observations & notes -->
                      <div class="pw-supporting-evidence-box" style="margin-top: 14px;">
                        <label class="pw-sc-field">
                          <span class="pw-sc-label">General site observations &amp; notes <span class="pw-muted" style="font-weight: 400;">(optional)</span></span>
                          <textarea name="readiness_notes" rows="2" maxlength="10000" class="pw-sc-textarea" placeholder="Add observed site conditions, physical features, and note anything that needs verification by city staff."><?= $pwEscape($property['readiness_notes'] ?? '') ?></textarea>
                        </label>
                      </div>
                    </div>
                  </div>

                </div>

                <!-- RIGHT COLUMN: Reviewer Workspace (Hidden from intake workflow) -->
                <div class="pw-screening-col-side" style="display:none;" hidden aria-hidden="true">

                  <!-- 1. Review Summary Card -->
                  <div class="pw-screening-card pw-sc-summary-card">
                    <div class="pw-card-header">
                      <div class="pw-card-title-group">
                        <span class="pw-card-header-icon"><?= $pwIcon('document') ?></span>
                        <h4 class="pw-card-title">Review summary</h4>
                      </div>
                    </div>
                    <div class="pw-card-body">
                      <div class="pw-review-summary-state">
                        <div class="pw-state-avatar-circle"></div>
                        <div class="pw-state-text-group">
                          <strong class="pw-state-headline">Not assessed</strong>
                          <p class="pw-state-desc">No source findings have been reviewed.</p>
                        </div>
                      </div>

                      <div class="pw-sc-meta-table">
                        <div class="pw-sc-meta-row">
                          <span class="pw-sc-meta-label">Assessment scope</span>
                          <span class="pw-sc-meta-val" id="pwRiskScopeDisplay">Selected point</span>
                        </div>
                        <div class="pw-sc-meta-row">
                          <span class="pw-sc-meta-label">Source type</span>
                          <span class="pw-sc-meta-val" id="pwRiskSourceDisplay">Indicative report</span>
                        </div>
                        <div class="pw-sc-meta-row">
                          <span class="pw-sc-meta-label">Reviewer</span>
                          <span class="pw-sc-meta-val">Awaiting assignment</span>
                        </div>
                      </div>

                      <div class="pw-alert-warning-box">
                        <span class="pw-alert-warning-icon">!</span>
                        <span class="pw-alert-warning-text">Reference information, not a hazard clearance.</span>
                      </div>
                    </div>
                  </div>

                  <!-- 2. Investor-Facing Status Card -->
                  <div class="pw-screening-card pw-sc-investor-card">
                    <div class="pw-card-header">
                      <div class="pw-card-title-group">
                        <span class="pw-card-header-icon"><?= $pwIcon('chart') ?></span>
                        <h4 class="pw-card-title">Investor-facing status</h4>
                      </div>
                    </div>
                    <div class="pw-card-body">
                      <div class="pw-investor-status-box">
                        <div class="pw-status-clock-badge">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div class="pw-investor-status-text">
                          <strong>Hazard information pending review</strong>
                          <p>Source-based screening is incomplete. No safety conclusion is available.</p>
                        </div>
                      </div>
                      <p class="pw-investor-footer-note">Show source, date, scope, and review status.</p>
                    </div>
                  </div>

                </div>
              </div>

              <!-- Criterion Navigation Footer -->
              <div class="pw-criterion-nav-footer">
                <button type="button" class="pw-button pw-button-light pw-button-small" data-criterion-prev="nearby_businesses">
                  <?= $pwIcon('arrow', 'pw-icon-prev') ?> <span>Previous Criterion: Nearby Businesses</span>
                </button>
                <span class="pw-criterion-nav-hint"><?= $pwIcon('save') ?> Auto-saves on navigation</span>
                <button type="button" class="pw-button pw-button-primary pw-button-small" data-criterion-next="zoning_compatibility">
                  <span>Next Criterion: Zoning Compatibility</span> <?= $pwIcon('arrow') ?>
                </button>
              </div>
            </div>
          </div>

          <!-- 6. ZONING COMPATIBILITY (CLUP) PANE (Zoning compatibility & review) -->
          <div id="pwCriterionZoning" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="zoning_compatibility" hidden>
            <div class="pw-screening-container pw-zoning-card">
              <!-- Unified Criterion Header -->
              <div class="pw-spatial-header">
                <div class="pw-spatial-heading-group">
                  <h3 class="pw-spatial-title">CLUP zoning &amp; proposed use</h3>
                  <p class="pw-spatial-subtitle">Check a specific activity against the recorded district, then verify the parcel and supporting records.</p>
                </div>
                <div class="pw-findings-header-badges">
                  <span class="pw-badge pw-badge-weight">Eligibility gate · no points</span>
                </div>
              </div>

              <!-- Retained metadata binding for script compatibility (hidden from intake view) -->
              <div class="pw-screening-header-bar" style="display:none;" hidden aria-hidden="true">
                <span data-screening-zoning-crumb><?= $pwEscape($property['title'] ?? 'Sample lot A') ?></span>
              </div>

              <!-- Two Column Grid -->
              <div class="pw-screening-grid">
                <!-- LEFT COLUMN: Location, Source Document, Official Zone & Uses -->
                <div class="pw-screening-col-main">

                  <!-- 🌟 CLUP Smart Advisor Banner -->
                  <div class="pw-clup-smart-banner" id="pwClupSmartBanner">
                    <div class="pw-clup-smart-header">
                      <div class="pw-clup-smart-badge-wrap">
                        <span class="pw-clup-smart-icon">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        </span>
                        <strong>CLUP Zoning Advisor</strong>
                        <span class="pw-clup-smart-context-tag" id="pwClupContextTag">Contextual Guidance</span>
                      </div>
                      <span class="pw-clup-ordinance-badge">City Ordinance No. 2018-06</span>
                    </div>
                    <div class="pw-clup-smart-body">
                      <p class="pw-clup-smart-text" id="pwClupSmartText">
                        Connecting your listing category with official San Fernando zoning rules. Select the recorded district below or use quick suggestions to check allowable business activities in real-time.
                      </p>
                      <div class="pw-clup-smart-rec" id="pwClupSmartRec">
                        <span class="pw-clup-rec-label">💡 Recommended for this property:</span>
                        <div class="pw-clup-rec-buttons" id="pwClupRecButtons">
                          <!-- Injected dynamically by JS based on Step 1 category and Step 2 location -->
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 1. Primary Screening: District & Activity Check -->
                  <div class="pw-screening-card pw-zoning-main-card" id="pwZoningOrdinanceSection">
                    <div class="pw-card-header">
                      <div class="pw-card-title-group">
                        <span class="pw-step-number-circle">1</span>
                        <h3 class="pw-card-title">Zoning District &amp; Business Activity Check</h3>
                      </div>
                      <span class="pw-card-badge-active">San Fernando Master Plan</span>
                    </div>
                    <div class="pw-card-body">

                      <!-- SECTION 1A: Recorded Zoning District -->
                      <div class="pw-zoning-substep">
                        <div class="pw-substep-header">
                          <span class="pw-substep-num">Step A</span>
                          <strong class="pw-substep-title">Select the recorded zoning district</strong>
                          <small class="pw-muted">&middot; Pick a zone category or choose exact code</small>
                        </div>

                        <!-- Category Quick-Pills -->
                        <div class="pw-zoning-cat-pills" id="pwZoningCatPills" role="radiogroup" aria-label="Zoning District Categories">
                          <button type="button" class="pw-zoning-cat-btn" data-zoning-category-tab="commercial" aria-pressed="false">
                            <span class="pw-cat-icon">🏢</span>
                            <span class="pw-cat-text">Commercial</span>
                            <small class="pw-cat-codes">C-1, C-2, C-3</small>
                          </button>
                          <button type="button" class="pw-zoning-cat-btn" data-zoning-category-tab="residential" aria-pressed="false">
                            <span class="pw-cat-icon">🏡</span>
                            <span class="pw-cat-text">Residential</span>
                            <small class="pw-cat-codes">R-1, R-2, R-3</small>
                          </button>
                          <button type="button" class="pw-zoning-cat-btn" data-zoning-category-tab="industrial" aria-pressed="false">
                            <span class="pw-cat-icon">🏭</span>
                            <span class="pw-cat-text">Industrial</span>
                            <small class="pw-cat-codes">I-1, I-2</small>
                          </button>
                          <button type="button" class="pw-zoning-cat-btn" data-zoning-category-tab="agricultural" aria-pressed="false">
                            <span class="pw-cat-icon">🌾</span>
                            <span class="pw-cat-text">Agricultural</span>
                            <small class="pw-cat-codes">AGR-S, AGR-NS, AIZ</small>
                          </button>
                          <button type="button" class="pw-zoning-cat-btn" data-zoning-category-tab="tourism" aria-pressed="false">
                            <span class="pw-cat-icon">🏖️</span>
                            <span class="pw-cat-text">Tourism &amp; Eco</span>
                            <small class="pw-cat-codes">TZ, FEZ</small>
                          </button>
                          <button type="button" class="pw-zoning-cat-btn" data-zoning-category-tab="institutional" aria-pressed="false">
                            <span class="pw-cat-icon">🏛️</span>
                            <span class="pw-cat-text">Institutional / Mixed</span>
                            <small class="pw-cat-codes">GI, SI, PDZ</small>
                          </button>
                        </div>

                        <!-- Quick District Cards Subgrid (Filtered by active category pill) -->
                        <div class="pw-zoning-district-chips" id="pwZoningDistrictChips">
                          <!-- Injected & synced by JS -->
                        </div>

                        <!-- Official Two-Col Select Form (Maintained for 100% full form & test parity) -->
                        <div class="pw-fields-two-col" style="margin-top:14px;">
                          <label class="pw-sc-field">
                            <span class="pw-sc-label">Recorded zoning district <small class="pw-muted">&middot; all 18 official zones</small></span>
                            <select id="pwZoningClassification" name="zoning_classification" class="pw-sc-select" data-zoning-select>
                              <option value="">— Choose the recorded district —</option>
                              <optgroup label="Commercial districts">
                                <option value="C-1">C-1 — Commercial Zone 1 (Low-Density / General Commercial)</option>
                                <option value="C-2">C-2 — Commercial Zone 2 (Medium-Density Commercial)</option>
                                <option value="C-3">C-3 — Commercial Zone 3 (High-Density / Metropolitan Commercial Corridor)</option>
                              </optgroup>
                              <optgroup label="Residential districts">
                                <option value="R-1">R-1 — Residential Zone 1 (Low-Density Residential)</option>
                                <option value="R-2">R-2 — Residential Zone 2 (Medium-Density Residential)</option>
                                <option value="R-3">R-3 — Residential Zone 3 (High-Density Residential)</option>
                              </optgroup>
                              <optgroup label="Industrial districts">
                                <option value="I-1">I-1 — Light Industrial Zone (Non-Pollutive / Non-Hazardous)</option>
                                <option value="I-2">I-2 — Medium Industrial Zone (Pollutive / Hazardous with ECC)</option>
                              </optgroup>
                              <optgroup label="Agricultural &amp; agro-industrial districts">
                                <option value="AGR-S">AGR-S — Strategic Agricultural &amp; Fisheries Dev Zone (SAFDFZ)</option>
                                <option value="AGR-NS">AGR-NS — Non-Strategic Agricultural Zone</option>
                                <option value="AIZ">AIZ — Agro-Industrial Zone</option>
                              </optgroup>
                              <optgroup label="Institutional districts">
                                <option value="GI">GI — General Institutional Zone</option>
                                <option value="SI">SI — Special Institutional Zone</option>
                              </optgroup>
                              <optgroup label="Tourism district">
                                <option value="TZ">TZ — Tourism Zone (Coastal Belt / Hospitality)</option>
                              </optgroup>
                              <optgroup label="Special &amp; protected districts">
                                <option value="FEZ">FEZ — Freeport Economic Zone (Poro Point Special Economic Zone)</option>
                                <option value="MRZ">MRZ — Mangrove &amp; Marine Sanctuary Zone (Strict Protection)</option>
                                <option value="FRZ">FRZ — Forest &amp; Watershed Conservation Zone</option>
                                <option value="PDZ">PDZ — Planned Unit Development Zone (Mixed-Use)</option>
                              </optgroup>
                            </select>
                          </label>

                          <label class="pw-sc-field">
                            <span class="pw-sc-label">Existing property use <small class="pw-muted">&middot; observed site condition</small></span>
                            <select id="pwExistingLandUse" name="existing_land_use" class="pw-sc-select">
                              <option value="">— Select Existing Land Use —</option>
                              <option value="Vacant Land">Vacant Land / Unimproved Lot</option>
                              <option value="Commercial">Commercial / Operating Business Establishment</option>
                              <option value="Residential">Residential / Housing</option>
                              <option value="Agricultural">Agricultural / Farming / Nursery</option>
                              <option value="Industrial">Industrial / Warehouse / Manufacturing</option>
                              <option value="Institutional">Institutional / Civic / Educational / Healthcare</option>
                              <option value="Mixed Use">Mixed Use (Commercial &amp; Residential)</option>
                              <option value="Tourism / Recreation">Tourism / Hospitality / Recreation</option>
                              <option value="Other / Special Use">Other / Special Purpose</option>
                            </select>
                          </label>
                        </div>
                        <p class="pw-calculation-help">Existing use describes current physical site utilization. Official zoning designates permitted future commercial &amp; development activities.</p>
                      </div>

                      <!-- SECTION 1B: Proposed Activity & Live Simulation -->
                      <div class="pw-zoning-scenario" style="margin-top:20px;">
                        <div class="pw-substep-header">
                          <span class="pw-substep-num">Step B</span>
                          <strong class="pw-substep-title">Check a proposed business activity</strong>
                          <small class="pw-muted">&middot; Instant compatibility evaluation</small>
                        </div>

                        <!-- Popular Business Presets -->
                        <div class="pw-popular-activities-wrapper">
                          <span class="pw-popular-act-label">Popular Business Types in San Fernando:</span>
                          <div class="pw-popular-act-chips" id="pwPopularActChips">
                            <button type="button" class="pw-pop-chip" data-pop-activity="food_cafe" data-pop-category="food">☕ Café / Coffee Shop</button>
                            <button type="button" class="pw-pop-chip" data-pop-activity="food_restaurant" data-pop-category="food">🍽️ Restaurant / Dining</button>
                            <button type="button" class="pw-pop-chip" data-pop-activity="retail_convenience" data-pop-category="retail">🛒 Retail / Convenience</button>
                            <button type="button" class="pw-pop-chip" data-pop-activity="office_professional" data-pop-category="offices">💼 Corporate Office</button>
                            <button type="button" class="pw-pop-chip" data-pop-activity="tour_hotel" data-pop-category="tourism">🏨 Hotel / Lodging</button>
                            <button type="button" class="pw-pop-chip" data-pop-activity="log_warehouse" data-pop-category="logistics">📦 Warehouse / Storage</button>
                            <button type="button" class="pw-pop-chip" data-pop-activity="inst_hospital" data-pop-category="institutional">🏥 Clinic / Healthcare</button>
                            <button type="button" class="pw-pop-chip" data-pop-activity="inst_school" data-pop-category="institutional">🏫 School / Academy</button>
                          </div>
                        </div>

                        <!-- Real-time Activity Search Bar -->
                        <div class="pw-quick-activity-search-bar" style="margin-top:12px;">
                          <input type="search" id="pwQuickActivitySearch" class="pw-input" placeholder="🔍 Quick search any activity (e.g., pharmacy, bakery, hardware, bpo, resort, clinic)..." autocomplete="off">
                          <div class="pw-quick-search-matches" id="pwQuickSearchMatches" hidden></div>
                        </div>

                        <!-- Standard Two-Col Select Form -->
                        <div class="pw-fields-two-col" style="margin-top:12px;">
                          <label class="pw-field">Activity group<select id="pwZoningCategory" name="zoning_category"><option value="">All activity groups</option><?php foreach (\App\Support\ZoningRulesEngine::getHierarchicalUseCatalog() as $key => $group): ?><option value="<?= $pwEscape($key) ?>"><?= $pwEscape($group['label']) ?></option><?php endforeach; ?></select></label>
                          <label class="pw-field">Specific proposed activity<select id="pwZoningActivity" name="proposed_activity"><option value="">Choose an activity</option><?php foreach (\App\Support\ZoningRulesEngine::getHierarchicalUseCatalog() as $key => $group): ?><optgroup label="<?= $pwEscape($group['label']) ?>" data-category-group="<?= $pwEscape($key) ?>"><?php foreach ($group['activities'] as $code => $activity): ?><option value="<?= $pwEscape($code) ?>" data-category="<?= $pwEscape($key) ?>"><?= $pwEscape($activity['label']) ?></option><?php endforeach; ?></optgroup><?php endforeach; ?></select></label>
                        </div>

                        <!-- Dynamic Color-Coded Live Result Box -->
                        <div class="pw-zoning-live-result" aria-live="polite" data-zoning-live-result>
                          <span class="pw-zoning-kicker">REFERENCE RULE CHECK</span>
                          <strong data-zoning-live-status>Choose district and activity</strong>
                          <p data-zoning-live-explanation>CLUP is an eligibility gate. It does not add points to the five-criterion assessment.</p>
                          <div id="pwConditionalUsesContainer" class="pw-zoning-requirements" hidden><h5 data-zoning-live-requirement-title>Requirements to verify</h5><ul data-zoning-live-requirements></ul></div>
                        </div>
                        <div class="pw-zoning-evidence-state"><strong>Parcel compliance: Unverified</strong><p>This check uses a coded reference matrix. City review must confirm the district, applicable rule, parcel boundary and overlays before eligibility can be established.</p></div>
                      </div>

                      <!-- Collapsible Full Activity Catalog Reference -->
                      <details class="pw-zoning-reference">
                        <summary>Browse complete activity catalog &amp; reference rules <span data-zoning-reference-count>Choose a district</span></summary>
                        <div class="pw-zoning-reference-body">
                          <p class="pw-calculation-help">Read-only reference rules. Select an activity below to check it; browsing this list does not change the district or establish permission.</p>
                          <div class="pw-zoning-reference-counts"><span data-allowed-uses-count>0 allowed in reference</span><span data-conditional-uses-count>0 conditional</span></div>
                          <div class="pw-fields-two-col pw-zoning-search-tools">
                            <label class="pw-field" for="pwAllowedUsesSearch">Find an activity<input type="search" id="pwAllowedUsesSearch" class="pw-input" placeholder="Search activity or group"></label>
                            <label class="pw-field" for="pwZoningRuleStatusFilter">Reference status<select id="pwZoningRuleStatusFilter"><option value="">All statuses</option><option value="permitted">Allowed in reference</option><option value="conditional">Conditional in reference</option><option value="prohibited">Restricted in reference</option><option value="undetermined">No mapped rule</option></select></label>
                          </div>
                          <p class="pw-small pw-muted" data-zoning-search-count role="status"></p>
                          <div id="pwAllowedUsesContainer" class="pw-zoning-reference-list" data-allowed-uses-container>
                            <p class="pw-small pw-muted">Choose a district to browse its configured activity rules.</p>
                          </div>
                          <p class="pw-small pw-muted" data-zoning-no-matches hidden>No activities match this search. Change the search or status filter.</p>
                          <p class="pw-small pw-muted" data-zoning-reported-uses hidden></p>
                        </div>
                      </details>

                      <label class="pw-sc-field pw-zoning-reported-notes">
                        <span class="pw-sc-label">Reported clearance notes <small class="pw-muted">&middot; optional</small></span>
                        <textarea name="clup_conditional_uses" rows="2" maxlength="1000" class="pw-sc-textarea" placeholder="Record the source reference and any reported conditions. Notes do not confirm that a condition has been met."><?= $pwEscape($property['clup_conditional_uses'] ?? '') ?></textarea>
                      </label>

                      <details class="pw-zoning-source-notes">
                        <summary>Rule sources &amp; verification gaps</summary>
                        <div>
                          <p>Reference: <a data-zoning-source-link target="_blank" rel="noopener noreferrer">City Ordinance No. 2018-06</a>. The coded activity matrix has not been authenticated against the applicable current rule package.</p>
                          <p data-zoning-source-review></p>
                          <p data-zoning-horizon-note></p>
                          <ul data-zoning-evidence-gaps></ul>
                          <p data-zoning-governance-notice></p>
                          <small>Reference matrix version: <span data-zoning-engine-version><?= $pwEscape(\App\Support\ZoningRulesEngine::VERSION) ?></span></small>
                        </div>
                      </details>

                    </div>
                  </div>

                  <!-- 2. Location & District Assessed Card (Canonical Read-Only Summary) -->
                  <div class="pw-screening-card">
                    <div class="pw-card-header">
                      <div class="pw-card-title-group">
                        <span class="pw-step-number-circle">2</span>
                        <h3 class="pw-card-title">Location &amp; District assessed</h3>
                      </div>
                      <button type="button" class="pw-button pw-button-light pw-button-small" data-jump-step2-location>Edit property location</button>
                    </div>
                    <div class="pw-card-body pw-location-assessed-grid">
                      <div class="pw-location-form-fields">
                        <div class="pw-sc-location-summary">
                          <div class="pw-reused-info-item">
                            <span class="pw-reused-label">Property:</span>
                            <strong class="pw-reused-val" data-reused-prop-title><?= $pwEscape($property['title'] ?? 'Listing') ?></strong>
                          </div>
                          <div class="pw-reused-info-item">
                            <span class="pw-reused-label">Barangay:</span>
                            <strong class="pw-reused-val" data-reused-prop-bgy><?= $pwEscape($property['barangay'] ?? 'Not set') ?></strong>
                          </div>
                          <div class="pw-reused-info-item">
                            <span class="pw-reused-label">Coordinates:</span>
                            <strong class="pw-reused-val" data-reused-prop-coords><?= !empty($property['latitude']) ? number_format((float)$property['latitude'], 4) . '° N, ' . number_format((float)$property['longitude'], 4) . '° E' : 'Not set' ?></strong>
                          </div>
                        </div>

                        <!-- Expandable separate assessed coordinates disclosure -->
                        <details class="pw-coords-difference-disclosure" style="margin-top: 10px;">
                          <summary style="font-size: 11.5px; color: #475569; cursor: pointer;">Assessed point differs from canonical coordinates?</summary>
                          <div style="margin-top: 8px; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                            <div class="pw-sc-coords-row">
                              <label class="pw-sc-field">
                                <span class="pw-sc-label">Assessed Latitude</span>
                                <input type="text" id="pwZoningAssessedLat" name="zoning_assessed_lat" class="pw-sc-input" placeholder="e.g. 16.6150" value="<?= $pwEscape($property['zoning_assessed_lat'] ?? '') ?>">
                              </label>
                              <label class="pw-sc-field">
                                <span class="pw-sc-label">Assessed Longitude</span>
                                <input type="text" id="pwZoningAssessedLng" name="zoning_assessed_lng" class="pw-sc-input" placeholder="e.g. 120.3160" value="<?= $pwEscape($property['zoning_assessed_lng'] ?? '') ?>">
                              </label>
                            </div>
                            <label class="pw-sc-field" style="margin-top: 6px;">
                              <span class="pw-sc-label">Reason for coordinate discrepancy</span>
                              <input type="text" name="zoning_coords_difference_reason" class="pw-sc-input" placeholder="Explain difference (e.g. parcel centroid vs. access point)" value="<?= $pwEscape($property['zoning_coords_difference_reason'] ?? '') ?>">
                            </label>
                          </div>
                        </details>

                        <div class="pw-sc-scope-row" style="margin-top: 10px;">
                          <label class="pw-sc-field pw-sc-scope-field">
                            <span class="pw-sc-label">Assessment scope</span>
                            <select id="pwZoningAssessmentScope" name="zoning_assessment_scope" class="pw-sc-select">
                              <option value="selected_parcel" selected>Selected parcel</option>
                              <option value="zoning_district">Zoning district corridor</option>
                              <option value="special_economic_zone">Special economic zone</option>
                            </select>
                          </label>
                          <button type="button" class="pw-btn-check-location" id="pwZoningCheckLocationBtn">
                            <?= $pwIcon('pin') ?>
                            <span>View property location</span>
                          </button>
                        </div>
                        <p class="pw-sc-caption-note">Official zoning applies to the designated cadastre parcel boundary.</p>
                      </div>

                      <div class="pw-location-map-preview">
                        <div class="pw-mini-map-container" id="pwZoningMiniMap">
                          <div class="pw-mini-map-canvas" id="pwZoningMiniMapCanvas" data-zoning-mini-map-canvas style="width:100%;height:100%;min-height:185px;"></div>
                          <span class="pw-map-illustrative-badge" id="pwMapZoningDistrictTag">Zoning not recorded</span>
                        </div>
                        <p class="pw-sc-caption-note">Property location reference. Confirm the recorded district against official zoning evidence.</p>
                      </div>
                    </div>
                  </div>

                  <!-- 3. Source Document & Locational Clearance Proof (Simplified & Optional for initial intake) -->
                  <details class="pw-screening-card pw-sc-clearance-card" id="pwZoningClearanceDetails">
                    <summary class="pw-card-header" style="cursor: pointer;">
                      <div class="pw-card-title-group">
                        <span class="pw-step-number-circle">3</span>
                        <h3 class="pw-card-title">Locational Clearance &amp; Authority Documents</h3>
                        <span class="pw-badge-optional">Optional for initial listing</span>
                      </div>
                      <span class="pw-clearance-summary-toggle">Attach official documents &plus;</span>
                    </summary>
                    <div class="pw-card-body">
                      <p class="pw-calculation-help" style="margin-top:0;margin-bottom:14px;">
                        Have an official CPDO Locational Clearance Certificate or City Assessor Tax Declaration? Attach it here to expedite municipal verification. If not yet issued, you can safely skip this step and submit your property listing.
                      </p>
                      <div class="pw-sc-field">
                        <span class="pw-sc-label">Source authority</span>
                        <select name="clup_source_authority" class="pw-sc-select" id="pwZoningSourceSelect">
                          <option value="" selected>Not recorded</option>
                          <option value="San Fernando City Zoning Ordinance No. 2018-06 (CLUP)">San Fernando City Zoning Ordinance No. 2018-06 (CLUP)</option>
                          <option value="CPDO Locational Clearance Certificate">CPDO Locational Clearance Certificate</option>
                          <option value="City Assessor Tax Declaration Classification">City Assessor Tax Declaration Classification</option>
                          <option value="Other official municipal record">Other official municipal record</option>
                        </select>
                      </div>
                      <div class="pw-sc-source-details-row">
                        <label class="pw-sc-field">
                          <span class="pw-sc-label">Ordinance / Clearance date</span>
                          <input type="date" name="clup_source_date" class="pw-sc-input" id="pwZoningDate" value="<?= $pwEscape($property['clup_source_date'] ?? '') ?>">
                        </label>
                        <label class="pw-sc-field">
                          <span class="pw-sc-label">Reference / clearance number</span>
                          <input type="text" name="clup_source_reference" class="pw-sc-input" id="pwZoningRef" placeholder="e.g. CPDO Locational Clearance #2026-..., Tax Declaration Zoning Note" value="<?= $pwEscape($property['clup_source_reference'] ?? '') ?>">
                        </label>
                      </div>

                      <div class="pw-sc-upload-wrapper">
                        <div class="pw-sc-dropzone" id="pwZoningDropzone">
                          <input type="file" id="pwZoningFileInput" class="pw-hidden-file-input" accept=".pdf,.jpg,.jpeg,.png">
                          <div class="pw-dropzone-icon">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                          </div>
                          <strong class="pw-dropzone-title">Upload zoning clearance or ordinance map extract</strong>
                          <span class="pw-dropzone-sub">PDF, JPG, PNG &middot; Subject to review</span>
                        </div>
                        <div class="pw-sc-file-chip" id="pwZoningFileChip" style="<?= empty($property['clup_source_file']) ? 'display: none;' : '' ?>">
                          <div class="pw-file-icon-pdf">PDF</div>
                          <div class="pw-file-chip-info">
                            <strong class="pw-file-name" id="pwZoningFileName"><?= $pwEscape($property['clup_source_file'] ?? '') ?></strong>
                            <span class="pw-file-sub" id="pwZoningFileStatus"><?= !empty($property['clup_source_file']) ? 'Subject to review' : '' ?></span>
                          </div>
                          <button type="button" class="pw-file-chip-remove" id="pwZoningFileRemove" aria-label="Remove attachment">&times;</button>
                        </div>
                      </div>
                      <p class="pw-sc-caption-note">Store the clearance date separately from the upload date.</p>
                    </div>
                  </details>

                </div>

                <!-- RIGHT COLUMN: Reviewer Workspace (Hidden from intake workflow) -->
                <div class="pw-screening-col-side" style="display:none;" hidden aria-hidden="true">

                  <!-- 1. Review Summary Card -->
                  <div class="pw-screening-card pw-sc-summary-card">
                    <div class="pw-card-header">
                      <div class="pw-card-title-group">
                        <span class="pw-card-header-icon"><?= $pwIcon('document') ?></span>
                        <h4 class="pw-card-title">Review summary</h4>
                      </div>
                    </div>
                    <div class="pw-card-body">
                      <div class="pw-review-summary-state">
                        <div class="pw-state-avatar-circle"></div>
                        <div class="pw-state-text-group">
                          <strong class="pw-state-headline">Not assessed</strong>
                          <p class="pw-state-desc">No zoning findings have been reviewed.</p>
                        </div>
                      </div>

                      <div class="pw-sc-meta-table">
                        <div class="pw-sc-meta-row">
                          <span class="pw-sc-meta-label">Assessment scope</span>
                          <span class="pw-sc-meta-val" id="pwZoningScopeDisplay">Selected parcel</span>
                        </div>
                        <div class="pw-sc-meta-row">
                          <span class="pw-sc-meta-label">Source type</span>
                          <span class="pw-sc-meta-val" id="pwZoningSourceDisplay">City Ordinance 2018-06</span>
                        </div>
                        <div class="pw-sc-meta-row">
                          <span class="pw-sc-meta-label">Reviewer</span>
                          <span class="pw-sc-meta-val">Awaiting assignment</span>
                        </div>
                      </div>

                      <div class="pw-alert-warning-box">
                        <span class="pw-alert-warning-icon">!</span>
                        <span class="pw-alert-warning-text">Reference information, not an official locational clearance.</span>
                      </div>
                    </div>
                  </div>

                  <!-- 2. Investor-Facing Status Card -->
                  <div class="pw-screening-card pw-sc-investor-card">
                    <div class="pw-card-header">
                      <div class="pw-card-title-group">
                        <span class="pw-card-header-icon"><?= $pwIcon('chart') ?></span>
                        <h4 class="pw-card-title">Investor-facing status</h4>
                      </div>
                    </div>
                    <div class="pw-card-body">
                      <div class="pw-investor-status-box">
                        <div class="pw-status-clock-badge">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div class="pw-investor-status-text">
                          <strong>Zoning information pending review</strong>
                          <p>Official zoning classification pending CPDO verification. Dynamic investment compatibility will be evaluated upon investor activity selection.</p>
                        </div>
                      </div>
                      <p class="pw-investor-footer-note">Show source, date, scope, and review status.</p>
                    </div>
                  </div>

                </div>
              </div>

              <!-- Criterion Navigation Footer -->
              <div class="pw-criterion-nav-footer">
                <button type="button" class="pw-button pw-button-light pw-button-small" data-criterion-prev="risk_constraints">
                  <?= $pwIcon('arrow', 'pw-icon-prev') ?> <span>Previous Criterion: Risk Constraints</span>
                </button>
                <span class="pw-criterion-nav-hint"><?= $pwIcon('save') ?> Auto-saves on navigation</span>
                <button type="button" class="pw-button pw-button-primary pw-button-small" data-criterion-next="<?= $pwUserRole === 'seller' ? 'authority_to_sell' : 'step3' ?>">
                  <span><?= $pwUserRole === 'seller' ? 'Continue to Authority to Sell' : 'Continue to Review (Step 4)' ?></span> <?= $pwIcon('arrow') ?>
                </button>
              </div>
            </div>
          </div>


          <!-- 7. BROKER-ONLY AUTHORITY TO SELL / LEASE PANE -->
          <div id="pwCriterionAuthority" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="authority_to_sell" hidden>
            <div class="pw-spatial-card">
              <div class="pw-spatial-header">
                <div class="pw-spatial-heading-group">
                  <h3 class="pw-spatial-title" data-authority-pane-title>Authority to Sell / Lease</h3>
                  <p class="pw-spatial-subtitle">Broker Authorization Requirement &middot; Mandatory for Licensed Brokers</p>
                </div>
                <div class="pw-spatial-header-badges">
                  <span class="pw-badge pw-badge-amber">Broker Requirement</span>
                  <span class="pw-badge pw-badge-weight">Legal Compliance</span>
                </div>
              </div>

              <!-- Explanatory note matching requirement 8 -->
              <div class="pw-evidence-card-box" style="margin-bottom: 16px; padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                <div style="display:flex; gap: 10px; align-items: flex-start;">
                  <span style="color:#0284c7; font-size: 18px; line-height: 1;"><?= $pwIcon('info') ?></span>
                  <div>
                    <strong style="color: #11224D; font-size: 13.5px;">Broker Representation Authorization (RA 9646)</strong>
                    <p class="pw-small pw-muted" style="margin: 4px 0 0; line-height: 1.45;">
                      Licensed real estate brokers must provide written authorization from the registered property owner before submitting listings for review. Document uploads are stored privately and accessible only to authorized municipal reviewers and the listing broker. Uploading a document does not automatically mark it valid.
                    </p>
                  </div>
                </div>
              </div>

              <div class="pw-fields">
                <!-- Document Type selection: Authority to Sell vs Lease vs Market -->
                <div class="pw-field">
                  <label for="pwAuthorityType" class="pw-label">Authorization document type <span class="pw-required">*</span></label>
                  <select id="pwAuthorityType" name="authority_type" class="pw-select" data-authority-type>
                    <option value="authority_to_sell">Authority to Sell (ATS)</option>
                    <option value="authority_to_lease">Authority to Lease (ATL)</option>
                    <option value="authority_to_market">Authority to Market / Non-exclusive Broker Agreement</option>
                    <option value="exclusive_listing">Exclusive Listing Agreement</option>
                  </select>
                  <span class="pw-field-hint">Select the document type matching your listing's transaction terms.</span>
                </div>

                <!-- Document Upload -->
                <div class="pw-field pw-full">
                  <label class="pw-label">Upload authorization document <span class="pw-required">*</span></label>
                  <div class="pw-file-dropzone" style="border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; background: #fafafa;">
                    <input class="pw-file-input" id="pwAuthorityFile" name="authority_to_sell_file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" data-authority-file style="margin-bottom: 8px;">
                    <div class="pw-small pw-muted">
                      Accepted file types: PDF, JPG, PNG, WEBP (Maximum 15 MB).<br>
                      Stored securely in private storage &middot; Never published on public investor views.
                    </div>
                  </div>
                </div>

                <!-- Reference & Grantor Details -->
                <div class="pw-form-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
                  <label class="pw-field">Document reference / notarization number
                    <input name="authority_reference_no" type="text" maxlength="255" placeholder="e.g. ATS-2026-001 or Doc No. 12" data-authority-ref>
                  </label>
                  <label class="pw-field">Registered owner / grantor name
                    <input name="authority_grantor_name" type="text" maxlength="255" placeholder="Full name of title holder" data-authority-grantor>
                  </label>
                </div>

                <!-- Dates -->
                <div class="pw-form-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
                  <label class="pw-field">Date issued
                    <input name="authority_issued_date" type="date" class="pw-input" data-authority-issued>
                  </label>
                  <label class="pw-field">Date of expiry <span class="pw-muted">(if applicable)</span>
                    <input name="authority_expiry_date" type="date" class="pw-input" data-authority-expiry>
                  </label>
                </div>

                <!-- Scope / Notes -->
                <label class="pw-field pw-full">Authorized scope &amp; special conditions <span class="pw-muted">(optional)</span>
                  <textarea name="authority_details" rows="2" maxlength="1000" placeholder="e.g. Exclusive authority to sell at minimum ₱10,000/m²; 5% standard commission agreement; valid for 6 months." data-authority-details></textarea>
                </label>
              </div>

              <!-- Verification status callout -->
              <div class="pw-status-pill-card" style="margin-top: 14px; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
                <div class="pw-status-pill-header" style="display:flex; align-items:center; gap: 8px;">
                  <span class="pw-status-clock-icon" style="color:#d97706;">&#9679;</span>
                  <strong style="color: #11224D; font-size: 13px;">Review Status: Pending Administrator Review</strong>
                </div>
                <p class="pw-status-pill-desc pw-small pw-muted" style="margin: 4px 0 0;">
                  City reviewers will verify your ATS document against city assessor records. Submitting this form does not grant automatic approval.
                </p>
              </div>

              <!-- Footer Navigation -->
              <div class="pw-criterion-nav-footer" style="margin-top: 20px;">
                <button type="button" class="pw-button pw-button-light pw-button-small" data-criterion-prev="zoning_compatibility">
                  <?= $pwIcon('arrow', 'pw-icon-prev') ?> <span>Previous Criterion: CLUP Zoning</span>
                </button>
                <span class="pw-criterion-nav-hint"><?= $pwIcon('save') ?> Auto-saves on navigation</span>
                <button type="button" class="pw-button pw-button-primary pw-button-small" data-criterion-next="step3">
                  <span>Continue to Review (Step 4)</span> <?= $pwIcon('arrow') ?>
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Rubric Note (Mockup 1 & 2 Footer Note) -->
          <div class="pw-criteria-rubric-footnote">
            <span class="pw-muted">Use each indicator once in the scoring rubric. Supporting records help city reviewers verify claims before publishing.</span>
          </div>
        </div>
        </details>
      </section>
      <section class="pw-panel" data-editor-panel="3" hidden>
        <div class="pw-section-intro">
          <div class="pw-section-eyebrow">STEP 4 OF 4 &middot; PRE-SUBMISSION REVIEW</div>
          <h3>Property Review &amp; Submission Readiness</h3>
          <p>Verify property specifications, spatial integrity, and provisional assessment indicators before city review.</p>
        </div>

        <!-- TIER 1: PROPERTY SUMMARY -->
        <article class="pw-card pw-review-section-card" data-review-tier="summary">
          <div class="pw-review-card-header">
            <div class="pw-review-card-title-group">
              <span class="pw-tier-badge">Tier 1</span>
              <div>
                <h4 class="pw-review-card-title">Property Summary</h4>
                <p class="pw-review-card-subtitle">Basic listing essentials, offered pricing, and photo gallery</p>
              </div>
            </div>
            <button type="button" class="pw-button pw-button-light pw-button-small" data-review-edit="0">
              <?= $pwIcon('edit') ?> <span>Edit Basics</span>
            </button>
          </div>

          <div class="pw-review-summary-content">
            <div class="pw-review-summary-main">
              <div class="pw-review-title-row">
                <h3 class="pw-review-prop-name" data-review-prop-title>Your new property</h3>
                <span class="pw-badge pw-badge-teal" data-review-prop-category>Land</span>
              </div>
              <div class="pw-review-meta-chips">
                <span class="pw-meta-chip"><strong data-review-prop-purpose>For Sale</strong></span>
                <span class="pw-meta-chip"><strong data-review-prop-price>Price on Request</strong></span>
                <span class="pw-meta-chip"><?= $pwIcon('pin') ?> <span data-review-prop-location>San Fernando City</span></span>
                <span class="pw-meta-chip"><?= $pwIcon('area') ?> <span data-review-prop-area>&mdash; m&sup2;</span></span>
              </div>
            </div>

            <div class="pw-review-photos-preview" data-review-photos-preview>
              <div class="pw-review-photo-cover" data-review-photo-cover>
                <?= $pwIcon('photo') ?>
              </div>
              <div class="pw-review-photos-count" data-review-photos-count>0 photos attached</div>
            </div>
          </div>
        </article>

        <!-- TIER 2: LOCATION & DATA CHECKS -->
        <article class="pw-card pw-review-section-card" data-review-tier="checks">
          <div class="pw-review-card-header">
            <div class="pw-review-card-title-group">
              <span class="pw-tier-badge">Tier 2</span>
              <div>
                <h4 class="pw-review-card-title">Location &amp; Data Checks</h4>
                <p class="pw-review-card-subtitle">Boundary alignment, coordinate verification, and barangay validation</p>
              </div>
            </div>
            <button type="button" class="pw-button pw-button-light pw-button-small" data-review-edit="1">
              <?= $pwIcon('edit') ?> <span>Edit Location</span>
            </button>
          </div>

          <!-- Prominent Discrepancy Warning Banner -->
          <div class="pw-discrepancy-banner pw-discrepancy-warning pw-review-discrepancy-banner" data-review-area-discrepancy hidden role="alert">
            <?= $pwIcon('warning') ?>
            <div class="pw-discrepancy-body">
              <strong>Area Discrepancy Flagged</strong>
              <p data-review-discrepancy-message>Declared survey area differs significantly from drawn map boundary estimate.</p>
              <div class="pw-discrepancy-actions" style="margin-top: 8px;">
                <button type="button" class="pw-button pw-button-amber pw-button-small" data-review-jump-boundary>
                  Review area &amp; boundary
                </button>
              </div>
            </div>
          </div>

          <!-- Barangay conflict if any -->
          <div class="pw-bgy-conflict-alert pw-review-bgy-conflict" data-review-bgy-conflict hidden role="alert">
            <?= $pwIcon('warning') ?>
            <div class="pw-bgy-conflict-content">
              <span data-review-bgy-conflict-text></span>
              <button type="button" class="pw-btn-reconcile-bgy" data-bgy-reconcile-btn>Reconcile to pin barangay</button>
            </div>
          </div>

          <!-- Geographic Extent Warning Banner in Review Step -->
          <div class="pw-extent-warning-box pw-review-extent-warning" data-review-extent-warning role="alert" style="margin-bottom: 12px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; color: #92400e; font-size: 12px; display: none;">
            <strong>Geographic Extent Warning:</strong>
            <span data-review-extent-warning-text>Coordinates lie outside San Fernando City municipal coverage extent (16.54°N–16.72°N, 120.26°E–120.45°E). Local GIS hazard layers, business radar, and official CLUP zoning clearance cannot be evaluated and are withheld for locations outside city coverage.</span>
          </div>

          <!-- All Checks Clean Banner -->
          <div class="pw-checks-clean" data-review-checks-clean>
            <?= $pwIcon('check') ?>
            <div class="pw-checks-clean-body">
              <strong data-review-location-heading>Location recorded · verification pending</strong>
              <p><span data-review-coords-display>Coordinates not provided</span> &middot; <span data-review-location-note>A pin or drawn outline is not a surveyed boundary.</span></p>
            </div>
          </div>
        </article>

        <!-- TIER 3: ASSESSMENT READINESS -->
        <article class="pw-card pw-review-section-card" data-review-tier="readiness">
          <div class="pw-review-card-header">
            <div class="pw-review-card-title-group">
              <span class="pw-tier-badge">Tier 3</span>
              <div>
                <h4 class="pw-review-card-title">Assessment Readiness (LOCUS-SF MCE)</h4>
                <p class="pw-review-card-subtitle">Multi-Criteria Evaluation status across 5 official criteria (100% total weight) + Mandatory Zoning Eligibility Gate</p>
              </div>
            </div>
            <button type="button" class="pw-button pw-button-light pw-button-small" data-review-edit="2">
              <?= $pwIcon('edit') ?> <span>Edit Evidence</span>
            </button>
          </div>

          <!-- Composite IAI Indicator Card -->
          <div class="pw-review-composite-card">
            <div class="pw-composite-score-row">
              <div class="pw-composite-main-stat">
                <span class="pw-composite-label">Assessment result · provisional</span>
                <div class="pw-composite-val" data-review-composite-iai>&mdash; <small>/ 100</small></div>
                <div class="pw-composite-meta" style="font-size:0.8rem;color:#64748b;margin-top:4px;">
                  Scenario: <strong data-review-scenario>Commercial Use</strong> &middot; Model: <strong data-review-model-version>LOCUS-SF MCE v3.0</strong>
                </div>
              </div>
              <div class="pw-composite-badge-group">
                <span class="pw-badge pw-badge-amber" data-review-composite-status>Complete the remaining criteria</span>
                <small class="pw-muted" data-review-composite-weights>5 Criteria &middot; 100% Weight</small>
                <button type="button" class="pw-button pw-button-primary pw-button-small" data-calculate-assessment-btn style="margin-top: 6px;">
                  <span class="pw-btn-spinner locus-spinner" hidden aria-hidden="true" style="margin-right: 6px;"></span>
                  <span data-calc-btn-label>Calculate assessment</span>
                </button>
              </div>
            </div>
            <p class="pw-composite-desc" data-review-composite-desc>0 of 5 criteria have complete inputs. Zoning compatibility serves as mandatory eligibility screening. Final IAI unavailable until all criteria have verified evidence. Missing criteria are never defaulted.</p>
          </div>

          <!-- 5 Criteria Readiness Grid + Zoning Screening Gate -->
          <div class="pw-review-criteria-grid">
            <div class="pw-review-crit-row" data-review-crit="spatial_accessibility">
              <div class="pw-crit-col-name">
                <strong>1. Spatial Accessibility</strong>
                <span class="pw-muted">25% weight &middot; Road frontage &amp; passability</span>
              </div>
              <div class="pw-crit-col-score">
                <span data-review-crit-score="spatial_accessibility">&mdash;</span>
              </div>
              <div class="pw-crit-col-contrib">
                <span class="pw-muted-sub" data-review-crit-contrib="spatial_accessibility">&mdash;</span>
              </div>
              <div class="pw-crit-col-status">
                <span class="pw-badge pw-badge-sky" data-review-crit-badge="spatial_accessibility">Pending</span>
              </div>
              <button type="button" class="pw-readiness-action" data-readiness-target="spatial_accessibility">Edit</button>
            </div>

            <div class="pw-review-crit-row" data-review-crit="infrastructure_readiness">
              <div class="pw-crit-col-name">
                <strong>2. Infrastructure Readiness</strong>
                <span class="pw-muted">25% weight &middot; Power, water, telecom, drainage</span>
              </div>
              <div class="pw-crit-col-score">
                <span data-review-crit-score="infrastructure_readiness">&mdash;</span>
              </div>
              <div class="pw-crit-col-contrib">
                <span class="pw-muted-sub" data-review-crit-contrib="infrastructure_readiness">&mdash;</span>
              </div>
              <div class="pw-crit-col-status">
                <span class="pw-badge pw-badge-sky" data-review-crit-badge="infrastructure_readiness">Pending</span>
              </div>
              <button type="button" class="pw-readiness-action" data-readiness-target="infrastructure_readiness">Edit</button>
            </div>

            <div class="pw-review-crit-row" data-review-crit="economic_viability">
              <div class="pw-crit-col-name">
                <strong>3. Property Cost &amp; Market Competitiveness</strong>
                <span class="pw-muted">20% weight &middot; Your rate compared with a similar property</span>
                <p class="pw-review-input-issue" data-review-crit-issue="economic_viability" hidden></p>
              </div>
              <div class="pw-crit-col-score">
                <span data-review-crit-score="economic_viability">&mdash;</span>
              </div>
              <div class="pw-crit-col-contrib">
                <span class="pw-muted-sub" data-review-crit-contrib="economic_viability">&mdash;</span>
              </div>
              <div class="pw-crit-col-status">
                <span class="pw-badge pw-badge-sky" data-review-crit-badge="economic_viability">Pending</span>
              </div>
              <button type="button" class="pw-readiness-action" data-economic-fix>Edit</button>
            </div>

            <div class="pw-review-crit-row" data-review-crit="nearby_businesses">
              <div class="pw-crit-col-name">
                <strong>4. Nearby Businesses</strong>
                <span class="pw-muted">15% weight &middot; Commercial density &amp; activity anchors</span>
              </div>
              <div class="pw-crit-col-score">
                <span data-review-crit-score="nearby_businesses">&mdash;</span>
              </div>
              <div class="pw-crit-col-contrib">
                <span class="pw-muted-sub" data-review-crit-contrib="nearby_businesses">&mdash;</span>
              </div>
              <div class="pw-crit-col-status">
                <span class="pw-badge pw-badge-sky" data-review-crit-badge="nearby_businesses">Pending</span>
              </div>
              <button type="button" class="pw-readiness-action" data-readiness-target="nearby_businesses">Edit</button>
            </div>

            <div class="pw-review-crit-row" data-review-crit="risk_constraints">
              <div class="pw-crit-col-name">
                <strong>5. Risk Constraints</strong>
                <span class="pw-muted">15% weight &middot; 6-hazard multi-risk screening</span>
              </div>
              <div class="pw-crit-col-score">
                <span data-review-crit-score="risk_constraints">&mdash;</span>
              </div>
              <div class="pw-crit-col-contrib">
                <span class="pw-muted-sub" data-review-crit-contrib="risk_constraints">&mdash;</span>
              </div>
              <div class="pw-crit-col-status">
                <span class="pw-badge pw-badge-sky" data-review-crit-badge="risk_constraints">Pending</span>
              </div>
              <button type="button" class="pw-readiness-action" data-readiness-target="risk_constraints">Edit</button>
            </div>

            <div class="pw-review-crit-row" data-review-crit="zoning_compatibility">
              <div class="pw-crit-col-name">
                <strong>CLUP &amp; Land-Use Regulations — Eligibility Screening Gate</strong>
                <span class="pw-muted">Mandatory Eligibility Gate &middot; Ordinance No. 2018-06</span>
              </div>
              <div class="pw-crit-col-score">
                <span data-review-crit-score="zoning_compatibility">&mdash;</span>
              </div>
              <div class="pw-crit-col-contrib">
                <span class="pw-muted-sub" data-review-crit-contrib="zoning_compatibility">&mdash;</span>
              </div>
              <div class="pw-crit-col-status">
                <span class="pw-badge pw-badge-sky" data-review-crit-badge="zoning_compatibility">Pending</span>
              </div>
              <button type="button" class="pw-readiness-action" data-readiness-target="zoning_compatibility">Edit</button>
            </div>
          </div>

          <!-- Calculated Results Breakdown: Strengths, Constraints & Outstanding Requirements -->
          <div class="pw-calculated-insights-card" data-review-calculated-insights style="margin-top: 16px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; flex-wrap:wrap; gap:8px;">
              <h5 style="margin:0; font-size: 0.95rem; font-weight:700; color:#0f172a;">Assessment Analysis &amp; Recorded Facts</h5>
              <button type="button" class="pw-button pw-button-light pw-button-small" data-assessment-print-btn>
                <?= $pwIcon('document') ?> <span>Print summary</span>
              </button>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
              <!-- Strengths & Constraints -->
              <div style="background:#fff; padding:12px 14px; border-radius:8px; border:1px solid #e2e8f0;">
                <div style="font-weight:600; font-size:0.82rem; color:#0f172a; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <span style="color:#10b981;">&#10003;</span> Recorded Strengths &amp; Constraints
                </div>
                <ul data-review-strengths-list style="margin:0; padding-left:18px; font-size:0.8rem; color:#334155; line-height:1.5;">
                  <li>Baseline property intake recorded.</li>
                </ul>
                <ul data-review-constraints-list style="margin:6px 0 0 0; padding-left:18px; font-size:0.8rem; color:#b45309; line-height:1.5;">
                </ul>
              </div>

              <!-- Outstanding Requirements -->
              <div style="background:#fff; padding:12px 14px; border-radius:8px; border:1px solid #e2e8f0;">
                <div style="font-weight:600; font-size:0.82rem; color:#0f172a; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <span style="color:#f59e0b;">&#9888;</span> Outstanding Requirements
                </div>
                <ul data-review-outstanding-list style="margin:0; padding-left:18px; font-size:0.8rem; color:#334155; line-height:1.5;">
                  <li>Complete evidence review across remaining criteria.</li>
                </ul>
              </div>
            </div>

            <!-- Disclaimer Notice -->
            <div style="margin-top:12px; font-size:0.75rem; color:#64748b; line-height:1.4; border-top:1px dashed #cbd5e1; padding-top:8px;">
              <strong>Notice:</strong> Multi-Criteria Evaluation (MCE) and Investment Attractiveness Index (IAI) scores are mathematical indicators derived from recorded property facts. A calculated score does not guarantee listing approval, site safety clearance, financial profitability, or probability of business success. Official validation is conducted by the City Assessor's Office and City Planning and Development Office.
            </div>
          </div>
        </article>

        <!-- TIER 4: SUBMISSION CONFIRMATION -->
        <article class="pw-card pw-review-section-card" data-review-tier="submission">
          <div class="pw-review-card-header">
            <div class="pw-review-card-title-group">
              <span class="pw-tier-badge">Tier 4</span>
              <div>
                <h4 class="pw-review-card-title">Submission Confirmation</h4>
                <p class="pw-review-card-subtitle">Listing validation governance and submission processing</p>
              </div>
            </div>
          </div>

          <div class="pw-submission-confirm-body">
            <!-- Role-specific compliance status -->
            <div class="pw-compliance-card" data-review-compliance-card>
              <div class="pw-compliance-icon">🏛️</div>
              <div class="pw-compliance-text">
                <strong data-review-compliance-title><?= $pwUserRole === 'seller' ? 'Broker Submission &amp; Representation' : 'City Departmental Submission' ?></strong>
                <p data-review-compliance-desc><?= $pwUserRole === 'seller' ? 'Broker listing. Authority to Sell (ATS) file staged and queued for city verification.' : 'Authorized CAO / LEBDO departmental submission. Authority to Sell (ATS) requirement is exempt for municipal catalog listings.' ?></p>
              </div>
              <span class="pw-badge pw-badge-teal" data-review-compliance-badge><?= $pwUserRole === 'seller' ? 'Broker Staged' : 'Exempt' ?></span>
            </div>

            <div class="pw-submit-action-banner">
              <div>
                <strong>Ready for City Evaluation</strong>
                <p>Submit this property using the persistent footer action below to register baseline data. City departments will review evidence and verify official scores prior to publication.</p>
              </div>
              <button type="button" class="pw-button pw-button-primary pw-button-lg" data-review-submit-btn hidden style="display:none;" aria-hidden="true">
                <span>Submit for approval</span> <?= $pwIcon('arrow') ?>
              </button>
            </div>
          </div>
        </article>

        <!-- Hidden Backwards Compatibility Containers for Existing JS & Tests -->
        <div class="pw-card pw-submission-summary" data-review-summary hidden style="display:none;" aria-hidden="true"></div>
        <details class="pw-disclosure pw-assessment-details" data-assessment-details hidden style="display:none;" aria-hidden="true">
          <summary><?= $pwIcon('chart') ?><span>Supporting records &amp; city assessment</span><?= $pwIcon('chevron') ?></summary>
          <div class="pw-review-states-grid">
            <div class="pw-review-state-card" data-review-state="submit">
              <div class="pw-state-header">
                <span class="pw-state-icon"><?= $pwIcon('check') ?></span>
                <div>
                  <strong>Ready to submit</strong>
                  <span class="pw-badge pw-badge-teal" data-submit-readiness-badge>Ready to submit</span>
                </div>
              </div>
            </div>
            <div class="pw-review-state-card" data-review-state="completeness">
              <div class="pw-state-header">
                <span class="pw-state-icon"><?= $pwIcon('document') ?></span>
                <div>
                  <strong>Evidence completeness</strong>
                  <span class="pw-badge pw-badge-sky" data-completeness-badge><span data-completeness-count>0 of 6</span> criteria</span>
                </div>
              </div>
            </div>
            <div class="pw-review-state-card" data-review-state="validation">
              <div class="pw-state-header">
                <span class="pw-state-icon"><?= $pwIcon('info') ?></span>
                <div><strong>Evidence validation</strong><span class="pw-badge pw-badge-amber">Declarations unverified</span></div>
              </div>
            </div>
            <div class="pw-review-state-card" data-review-state="assessment">
              <div class="pw-state-header">
                <span class="pw-state-icon"><?= $pwIcon('chart') ?></span>
                <div><strong>Official assessment</strong><span class="pw-badge pw-badge-amber" data-assessment-readiness-badge>IAI pending</span></div>
              </div>
            </div>
          </div>
          <div data-assessment-readiness>
            <?php foreach ($pwCriteria as $pwKey => $pwCriterion): ?>
            <?php
              $pwReady = $pwReadiness[$pwKey]
                ?? ($pwKey === 'property_cost_market_competitiveness' ? ($pwReadiness['economic_viability'] ?? null) : null)
                ?? ($pwKey === 'economic_viability' ? ($pwReadiness['property_cost_market_competitiveness'] ?? null) : null)
                ?? ['info', 'Confirm details.', 'Review'];
              $pwTarget = ($pwKey === 'property_cost_market_competitiveness') ? 'economic_viability' : $pwKey;
            ?>
            <div class="pw-readiness-row" data-readiness-criterion="<?= $pwEscape($pwKey) ?>">
              <?= $pwIcon($pwReady[0]) ?>
              <div>
                <strong><?= $pwEscape($pwCriterion) ?></strong>
                <span data-readiness-message><?= $pwEscape($pwReady[1]) ?></span>
              </div>
              <button type="button" class="pw-readiness-action" data-readiness-target="<?= $pwEscape($pwTarget) ?>"><?= $pwEscape($pwReady[2]) ?></button>
            </div>
            <?php endforeach; ?>
          </div>
          <div class="pw-tabs pw-review-tabs" role="tablist"><button type="button" role="tab" class="is-active" data-review-tab="assessment">City assessment</button><button type="button" role="tab" data-review-tab="investor">Investor preview</button></div>
          <div data-review-panel="assessment">
            <article class="pw-card" data-automatic-assessment>
              <div class="pw-live-scores pw-live-scores-top" data-live-scores>
                <div><span>MCE Score</span><strong data-total-mce>&mdash;</strong><small>/ 100</small></div>
                <div><span>IAI Score</span><strong data-total-iai>&mdash;</strong><small>/ 100</small></div>
                <p data-computed-summary>Scores remain pending until all required evidence is available.</p>
              </div>
              <p class="pw-notice pw-notice-amber" data-legacy-assessment hidden>Legacy assessment notice.</p>
              <div class="pw-assessment-status"><p class="pw-small pw-muted" data-assessment-status role="status">Add a property location to check verified source data.</p><button type="button" class="pw-button pw-button-light pw-button-small" data-recalculate-assessment><?= $pwIcon('reset') ?> Recalculate</button></div>
              <div class="pw-assessment-criteria">
                <?php foreach ($pwCriteria as $pwKey => $pwCriterion): ?>
                <article class="pw-criterion" data-assessment-criterion="<?= $pwKey ?>">
                  <div class="pw-criterion-heading"><h4><?= $pwEscape($pwCriterion) ?></h4><span><?= \App\Support\PropertyAssessment::WEIGHTS[$pwKey] ?>% of MCE</span><strong data-score-value>Awaiting data</strong></div>
                  <div class="pw-criterion-bar" role="progressbar" aria-label="<?= $pwEscape($pwCriterion) ?>" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Awaiting source data"><span></span></div>
                  <details class="pw-criterion-evidence"><summary>Evidence &amp; calculation <?= $pwIcon('chevron') ?></summary><p data-score-justification>Add property location to check available source evidence.</p><p class="pw-small pw-muted" data-score-rule hidden></p><p class="pw-small pw-muted" data-score-evidence hidden></p></details>
                </article>
                <?php endforeach; ?>
              </div>
              <details class="pw-disclosure" data-spatial-context hidden><summary><?= $pwIcon('pin') ?><span>Location evidence</span><?= $pwIcon('chevron') ?></summary><dl></dl></details>
              <details class="pw-disclosure"><summary><?= $pwIcon('document') ?><span>How scores are calculated</span><?= $pwIcon('chevron') ?></summary><p class="pw-small pw-muted" data-assessment-method>Scores depend on approved source conversion rules, the five numerical criterion weights, and mandatory zoning screening.</p></details>
            </article>
          </div>
          <div data-review-panel="investor" hidden>
            <article class="pw-card pw-investor-card">
              <div class="pw-review-property" data-review-property><strong>Your new property</strong></div>
              <div class="pw-business-matches" data-business-matches></div>
              <section class="pw-review-breakdown" data-match-breakdown></section>
              <section class="pw-review-reasons" data-match-reasons></section>
            </article>
          </div>
        </details>
      </section>
    </div>
    <footer class="pw-footer"><span class="pw-progress" data-editor-progress>Step 1 of 4</span><div class="pw-footer-actions"><button type="button" class="pw-text-button pw-skip" data-skip-enrichment hidden>Review listing</button><button type="button" class="pw-button pw-button-light" data-editor-back disabled>Back</button><button type="button" class="pw-button pw-button-light" data-save-draft title="Save draft on this device"><?= $pwIcon('save') ?> Save draft</button><button type="button" class="pw-button pw-button-primary" data-editor-next><span data-editor-next-label>Continue to location</span><?= $pwIcon('arrow') ?></button><button type="submit" class="pw-button pw-button-primary" data-review-submit-btn data-editor-submit hidden><span data-editor-submit-label>Submit for review</span><?= $pwIcon('arrow') ?></button></div></footer>
    <script id="pwZoningEngineData" type="application/json">
    <?= json_encode(\App\Support\ZoningRulesEngine::getScreeningData(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?>
    </script>
  </form>
</dialog>
<?php unset($pwEscape, $pwIcon, $pwCriteria, $pwReadiness); ?>
