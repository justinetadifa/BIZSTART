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
];
?>
<dialog class="property-wizard" id="cityPropertyEditor" aria-labelledby="cityEditorTitle">
  <form class="pw-form" data-property-form novalidate>
    <header class="pw-header">
      <div class="pw-heading-row">
        <div><div class="pw-breadcrumb">Properties <span>/</span> <span data-wizard-breadcrumb>Add property</span></div><h2 id="cityEditorTitle">New property</h2><p class="pw-header-note">Name, price, and a place. Add supporting details when you have them.</p></div>
        <div class="pw-header-actions">
          <span class="pw-device-draft-status" data-device-draft-status><svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg> <span data-device-draft-text>Not saved yet</span></span>
          <button class="pw-button pw-button-light pw-button-small" type="button" data-save-exit title="Save this draft on this device"><?= $pwIcon('save') ?> Save &amp; exit</button>
          <button class="pw-close" type="button" data-close-dialog aria-label="Close property editor"><?= $pwIcon('close') ?></button>
        </div>
      </div>
      <nav class="pw-steps" aria-label="Property form steps">
        <?php foreach (['Basics', 'Area & location', 'Site evidence', 'Review'] as $pwStep => $pwStepLabel): ?>
        <button class="pw-step<?= $pwStep === 0 ? ' is-active' : '' ?>" type="button" data-editor-step="<?= $pwStep ?>" aria-label="Step <?= $pwStep + 1 ?>: <?= $pwEscape($pwStepLabel) ?>"<?= $pwStep === 0 ? ' aria-current="step"' : '' ?>><span class="pw-step-number"><span><?= $pwStep + 1 ?></span><?= $pwIcon('check', 'pw-step-check') ?></span><span class="pw-step-label"><?= $pwStepLabel ?></span></button>
        <?php endforeach; ?>
      </nav>
    </header>
    <input type="hidden" name="id">
    <input type="hidden" name="boundary">
    <input type="hidden" name="calculated_area_sqm">
    <input type="hidden" name="reference_lat">
    <input type="hidden" name="reference_lng">
    <script type="application/json" data-classification-catalog><?= json_encode(\App\Support\PropertyCatalog::classificationCatalog(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?></script>
    <div class="pw-content">
      <div class="pw-feedback-region"><p class="pw-form-message" data-editor-message role="status" tabindex="-1"></p></div>
      <section class="pw-panel" data-editor-panel="0">
        <div class="pw-columns pw-basics-columns">
          <div class="pw-basics-sections">
            <!-- SECTION 1: ABOUT THE PROPERTY -->
            <article class="pw-card pw-section-card" data-section="about">
              <div class="pw-section-header">
                <span class="pw-section-badge">01</span>
                <div>
                  <h3 class="pw-section-title">About the Property</h3>
                  <p class="pw-section-desc">Add a recognizable property name, short description, and optional subtitle.</p>
                </div>
              </div>
              <div class="pw-fields">
                <label class="pw-field pw-full">
                  <span class="pw-field-label">Property name <span class="pw-required-indicator" aria-hidden="true">*</span></span>
                  <input name="property_name" required maxlength="180" placeholder="e.g. Sevilla Commercial Hub or Prime Highway Parcel" autocomplete="off" class="pw-input-prominent">
                  <small class="pw-muted">Give the property a distinct name that investors can quickly identify.</small>
                </label>

                <label class="pw-field pw-full">
                  <span class="pw-field-label">Short description</span>
                  <textarea name="description" rows="3" maxlength="3000" placeholder="Describe the property, key advantages, current use, or development potential..." autocomplete="off"></textarea>
                  <small class="pw-muted">Highlight accessibility, frontage, neighborhood context, or strategic value.</small>
                </label>

                <label class="pw-field pw-full">
                  <span class="pw-field-label">Property subname <span class="pw-muted">&middot; optional</span></span>
                  <input name="property_subname" maxlength="180" placeholder="e.g. Phase 2 · Prime Corner Lot" autocomplete="off">
                  <small class="pw-muted">Optional subtitle or specific phase to appear under the property name.</small>
                </label>
              </div>
            </article>

            <!-- SECTION 2: LISTING DETAILS -->
            <article class="pw-card pw-section-card" data-section="details">
              <div class="pw-section-header">
                <span class="pw-section-badge">02</span>
                <div>
                  <h3 class="pw-section-title">Listing Details</h3>
                  <p class="pw-section-desc">Define the transaction purpose, property classification, availability status, and barangay.</p>
                </div>
              </div>
              <div class="pw-fields">
                <!-- Listing purpose radios -->
                <fieldset class="pw-field pw-full pw-purpose-fieldset">
                  <legend class="pw-field-label">Listing purpose <span class="pw-required-indicator" aria-hidden="true">*</span></legend>
                  <div class="pw-purpose-radios-row" role="radiogroup" aria-label="Listing purpose">
                    <label class="pw-radio-card is-active" data-purpose-card="sale">
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

                <!-- Category & Primary Subtype in 2 columns -->
                <label class="pw-field">
                  <span class="pw-label-inline">Property type <span class="pw-required-indicator" aria-hidden="true">*</span> <span class="pw-info-icon" title="<?= $pwEscape(\App\Support\PropertyCatalog::categoryTooltips()['Land'] ?? '') ?>" data-category-tip-icon><?= $pwIcon('info') ?></span></span>
                  <select name="category" required data-property-category-select>
                    <?php foreach (\App\Support\PropertyCatalog::categories() as $pwCategory => $pwSubcategories): $pwTip = \App\Support\PropertyCatalog::categoryTooltips()[$pwCategory] ?? ''; ?>
                    <option value="<?= $pwEscape($pwCategory) ?>" data-tooltip="<?= $pwEscape($pwTip) ?>"<?= $pwCategory === 'Land' ? ' selected' : '' ?>><?= $pwEscape($pwCategory) ?></option>
                    <?php endforeach; ?>
                  </select>
                  <small class="pw-category-tooltip-note pw-muted" data-category-tip-text><?= $pwEscape(\App\Support\PropertyCatalog::categoryTooltips()['Land'] ?? '') ?></small>
                </label>

                <label class="pw-field" data-property-subtype-field>
                  <span class="pw-field-label">Primary subtype <span class="pw-required-indicator" aria-hidden="true">*</span></span>
                  <select name="subcategory" required data-property-subtype-select>
                    <option value="">Select classification...</option>
                    <?php foreach (\App\Support\PropertyCatalog::categories()['Land'] as $pwSubtype): ?>
                    <option value="<?= $pwEscape($pwSubtype) ?>"><?= $pwEscape($pwSubtype) ?></option>
                    <?php endforeach; ?>
                  </select>
                  <small class="pw-muted" data-subtype-hint>Choose the primary land or building classification.</small>
                </label>

                <!-- Availability status & Searchable Barangay in 2 columns -->
                <label class="pw-field">
                  <span class="pw-field-label">Availability status <span class="pw-required-indicator" aria-hidden="true">*</span></span>
                  <select name="status">
                    <option value="Available">Available</option>
                    <option value="Unavailable">Unavailable</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Sold">Sold</option>
                    <option value="Leased">Leased</option>
                    <option value="Availed" hidden disabled>Availed (historical)</option>
                  </select>
                  <small class="pw-muted">Current status in the investment catalog.</small>
                </label>

                <!-- BARANGAY SEARCHABLE DROPDOWN (59 San Fernando City Barangays) -->
                <div class="pw-field pw-barangay-combobox" data-barangay-combobox>
                  <span class="pw-field-label">
                    <span>Barangay <span class="pw-required-indicator" aria-hidden="true">*</span></span>
                    <span class="pw-barangay-psgc-tag" data-barangay-psgc-tag hidden>PSGC</span>
                  </span>
                  <input type="hidden" name="barangay" id="pwBarangayHidden" data-barangay-hidden>
                  <input type="hidden" name="barangay_psgc" id="pwBarangayPsgcHidden" data-barangay-psgc-hidden>

                  <div class="pw-barangay-input-box" data-barangay-input-box>
                    <span class="pw-barangay-box-icon"><?= $pwIcon('pin') ?></span>
                    <input type="text" class="pw-barangay-text-input" id="pwBarangayTextInput" placeholder="Select or search a barangay..." autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="pwBarangayDropdown">
                    <button type="button" class="pw-barangay-clear-trigger" data-barangay-clear-btn title="Clear barangay selection" aria-label="Clear selection" hidden>&times;</button>
                    <button type="button" class="pw-barangay-dropdown-trigger" data-barangay-toggle-btn tabindex="-1" aria-label="Toggle barangay list"><?= $pwIcon('chevron') ?></button>
                  </div>

                  <!-- Dropdown Menu with Recents and Full 59 Alphabetical List -->
                  <div class="pw-barangay-menu" id="pwBarangayDropdown" role="listbox" hidden>
                    <!-- Recently Selected Suggestions -->
                    <div class="pw-barangay-recents-wrap" data-barangay-recents-wrap hidden>
                      <div class="pw-barangay-menu-title">
                        <span>Recently Selected</span>
                      </div>
                      <div class="pw-barangay-recent-pills" data-barangay-recent-pills></div>
                    </div>

                    <!-- All 59 San Fernando City Barangays -->
                    <div class="pw-barangay-list-wrap">
                      <div class="pw-barangay-menu-title">
                        <span data-barangay-menu-count>San Fernando City (59 Barangays)</span>
                      </div>
                      <div class="pw-barangay-scroll-list" data-barangay-scroll-list tabindex="-1">
                        <!-- Populated dynamically from 59 official barangays -->
                      </div>
                    </div>

                    <!-- Empty State for non-matches -->
                    <div class="pw-barangay-no-results" data-barangay-no-results hidden>
                      <?= $pwIcon('info') ?>
                      <p>No matching barangay in San Fernando City</p>
                      <small>Only official barangays within San Fernando City, La Union are valid.</small>
                    </div>
                  </div>
                  <small class="pw-muted" data-barangay-helper>Official San Fernando City, La Union barangay.</small>
                </div>

                <!-- Additional classifications popover -->
                <div class="pw-field pw-full" data-subcategory-wrapper>
                  <div class="pw-label-row"><span>Additional classifications</span><span class="pw-muted" data-subcategory-count>Optional</span></div>
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
                  <input type="hidden" name="additional_subcategories" data-subcategory-input>
                  <small class="pw-muted">Add these only when the property has more than one use.</small>
                </div>
              </div>
            </article>

            <!-- SECTION 3: PRICING -->
            <article class="pw-card pw-section-card" data-section="pricing">
              <div class="pw-section-header">
                <span class="pw-section-badge">03</span>
                <div>
                  <h3 class="pw-section-title">Pricing</h3>
                  <p class="pw-section-desc">Specify sale or lease asking prices, with options for negotiable terms and price on request.</p>
                </div>
              </div>
              <div class="pw-fields">
                <!-- Sale asking price block (shown when For sale or Sale or lease) -->
                <div class="pw-field pw-full pw-pricing-block" data-sale-price-fields>
                  <span class="pw-field-label">Sale asking price</span>
                  <div class="pw-price-mode-row" role="radiogroup" aria-label="Sale asking price mode">
                    <label class="pw-price-mode-card is-active" data-sale-mode-card="amount">
                      <input type="radio" name="sale_price_mode" value="amount" checked>
                      <span class="pw-radio-custom" aria-hidden="true"></span>
                      <div class="pw-price-mode-content">
                        <strong class="pw-price-mode-title">Enter a price</strong>
                        <span class="pw-price-mode-sub">Total asking price in PHP pesos.</span>
                      </div>
                    </label>
                    <label class="pw-price-mode-card" data-sale-mode-card="request">
                      <input type="radio" name="sale_price_mode" value="request">
                      <span class="pw-radio-custom" aria-hidden="true"></span>
                      <div class="pw-price-mode-content">
                        <strong class="pw-price-mode-title">Price on request</strong>
                        <span class="pw-price-mode-sub">Discuss pricing privately with interested investors.</span>
                      </div>
                    </label>
                  </div>

                  <div class="pw-price-input-row" data-sale-price-input-wrap>
                    <div class="pw-input-group">
                      <span>PHP</span>
                      <input id="pwAskingPrice" name="price" type="text" inputmode="numeric" maxlength="25" title="Enter a positive amount in whole PHP pesos." placeholder="e.g. 21,776,000" autocomplete="off" data-price-input>
                    </div>
                  </div>

                  <!-- Sale Negotiable Checkbox -->
                  <label class="pw-negotiable-option" for="pwSaleNegotiable">
                    <input type="checkbox" name="is_negotiable" value="1" id="pwSaleNegotiable" data-sale-negotiable>
                    <div class="pw-negotiable-info">
                      <span class="pw-negotiable-title">Price is negotiable</span>
                      <span class="pw-negotiable-hint">Indicates openness to discussions and offers during investor inquiries.</span>
                    </div>
                  </label>

                  <div class="pw-notice pw-notice-amber" data-legacy-zero-sale-notice hidden>
                    <?= $pwIcon('warning') ?>
                    <div>
                      <strong>Ambiguous legacy asking price: PHP 0</strong>
                      <p>Confirm whether this listing is Price on request or enter a positive amount.</p>
                    </div>
                  </div>
                  <small class="pw-price-note pw-muted">Your asking price is separate from valuation references.</small>
                </div>

                <!-- Lease asking price block (shown when For lease or Sale or lease) -->
                <div class="pw-field pw-full pw-pricing-block" data-lease-price-fields hidden>
                  <span class="pw-field-label">Lease asking price</span>
                  <div class="pw-price-mode-row" role="radiogroup" aria-label="Lease asking price mode">
                    <label class="pw-price-mode-card is-active" data-lease-mode-card="amount">
                      <input type="radio" name="lease_price_mode" value="amount" checked>
                      <span class="pw-radio-custom" aria-hidden="true"></span>
                      <div class="pw-price-mode-content">
                        <strong class="pw-price-mode-title">Enter a price</strong>
                        <span class="pw-price-mode-sub">Rental asking price in PHP pesos.</span>
                      </div>
                    </label>
                    <label class="pw-price-mode-card" data-lease-mode-card="request">
                      <input type="radio" name="lease_price_mode" value="request">
                      <span class="pw-radio-custom" aria-hidden="true"></span>
                      <div class="pw-price-mode-content">
                        <strong class="pw-price-mode-title">Price on request</strong>
                        <span class="pw-price-mode-sub">Customize rental terms per tenant inquiry.</span>
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

                  <!-- Lease Negotiable Checkbox -->
                  <label class="pw-negotiable-option" for="pwLeaseNegotiable">
                    <input type="checkbox" name="lease_negotiable" value="1" id="pwLeaseNegotiable" data-lease-negotiable>
                    <div class="pw-negotiable-info">
                      <span class="pw-negotiable-title">Rent is negotiable</span>
                      <span class="pw-negotiable-hint">Open to negotiation on rent, fitout periods, or multi-year escalations.</span>
                    </div>
                  </label>

                  <div class="pw-notice pw-notice-amber" data-legacy-zero-lease-notice hidden>
                    <?= $pwIcon('warning') ?>
                    <div>
                      <strong>Ambiguous legacy rental price: PHP 0</strong>
                      <p>Confirm whether this listing is Price on request or enter a positive amount.</p>
                    </div>
                  </div>
                  <small class="pw-price-note pw-muted">Your asking price is separate from valuation references.</small>
                </div>

                <!-- Contact & Representation Details (Optional Disclosure) -->
                <details class="pw-disclosure pw-contact-disclosure pw-full">
                  <summary><?= $pwIcon('text') ?><span>Contact routing &amp; owner details <span class="pw-muted">&middot; optional</span></span><?= $pwIcon('chevron') ?></summary>
                  <div class="pw-fields pw-contact-fields-body">
                    <label class="pw-field pw-full">Contact route<select name="contactBrokerUserId"><option value="">Open listing &middot; city contact</option></select></label>
                    <label class="pw-field">Contact name<input name="owner_name" maxlength="150" autocomplete="name" placeholder="e.g. Maria Santos"></label>
                    <label class="pw-field">Phone<input name="owner_phone" type="tel" maxlength="40" autocomplete="tel" placeholder="e.g. 0917 123 4567"></label>
                    <label class="pw-field pw-full">Email<input name="owner_email" type="email" maxlength="190" autocomplete="email" placeholder="e.g. contact@example.com"></label>
                  </div>
                </details>
              </div>
            </article>

            <!-- SECTION 4: PROPERTY PHOTOS -->
            <article class="pw-card pw-section-card" data-section="photos">
              <div class="pw-section-header">
                <span class="pw-section-badge">04</span>
                <div>
                  <h3 class="pw-section-title">Property Photos</h3>
                  <p class="pw-section-desc">Upload photos of the parcel or building. Set the main cover, reorder to tell the site story, or remove photos anytime.</p>
                </div>
              </div>
              <div class="pw-fields">
                <div class="pw-field pw-full pw-photo-section">
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

                  <!-- Empty Photo Dropzone State -->
                  <label class="pw-photo-drop" for="property_image_file" data-photo-drop tabindex="0">
                    <input class="pw-file-input" id="property_image_file" name="image_files[]" type="file" multiple accept="image/jpeg,image/png,image/webp" data-photo-file>
                    <span class="pw-photo-icon"><?= $pwIcon('camera') ?></span>
                    <strong>Add property photos</strong>
                    <span>Drag images here, or click to browse (Multiple uploads supported)</span>
                    <small data-photo-file-name>JPG, PNG or WEBP up to 8 MB each. Cover photo + full gallery.</small>
                  </label>
                  <p class="pw-photo-feedback" data-photo-feedback role="status" hidden></p>
                </div>
              </div>
            </article>
          </div>

          <!-- Listing Preview Aside (Collapsible on Mobile, Live on Desktop) -->
          <details class="pw-card pw-preview-card pw-preview-card-collapsible" data-preview-disclosure>
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
              <p class="pw-preview-subname" data-preview-subname hidden></p>
              
              <!-- Location pill in preview -->
              <div class="pw-preview-location-badge" data-preview-location-badge hidden>
                <?= $pwIcon('pin') ?><span data-preview-barangay-display></span>
              </div>

              <div class="pw-badges">
                <span class="pw-badge" data-preview-category><?= $pwIcon('tag') ?><span>Land</span></span>
                <span class="pw-badge pw-badge-teal" data-preview-status>&bull; <span>Available</span></span>
                <span class="pw-badge pw-badge-sky pw-preview-negotiable-badge" data-preview-negotiable-badge hidden>Negotiable</span>
              </div>
              <div class="pw-preview-pricing-block">
                <span class="pw-preview-purpose-label" data-preview-purpose>For sale</span>
                <strong class="pw-preview-price-headline" data-preview-price>Price on request</strong>
              </div>
              <div class="pw-preview-area-row">
                <span class="pw-feature-icon"><?= $pwIcon('area') ?></span>
                <div class="pw-preview-area-text">
                  <strong data-preview-area-val>&mdash;</strong>
                  <span class="pw-preview-area-caption">Area not added</span>
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
      <section class="pw-panel pw-step2-panel" data-editor-panel="1" hidden>
        <div class="pw-step2-card">
          <!-- Step 2 Header -->
          <div class="pw-step2-header">
            <div class="pw-step2-heading-group">
              <span class="pw-step2-eyebrow">STEP 2 OF 5</span>
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
              <p class="pw-sec-subheading">Enter coordinates to locate the property directly on the map.</p>
            </div>

            <!-- Direct Latitude & Longitude Inputs -->
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
            <p class="pw-coord-error-banner" data-coordinate-error role="alert" hidden></p>

            <!-- Reused Barangay from Step 1 & Proximity Conflict Warning -->
            <div class="pw-bgy-context-row">
              <div class="pw-reused-bgy-chip">
                <?= $pwIcon('pin') ?>
                <span>Selected barangay: <strong data-reused-barangay-display>Not set</strong> <span class="pw-muted">(from Step 1)</span></span>
              </div>
              <div class="pw-bgy-conflict-alert" data-bgy-conflict-alert role="alert" hidden>
                <?= $pwIcon('warning') ?>
                <span data-bgy-conflict-text></span>
              </div>
            </div>

            <!-- Helper Note -->
            <div class="pw-info-callout">
              <?= $pwIcon('info') ?>
              <p>In the actual system, entering a valid coordinate pair should automatically position the map and property marker.</p>
            </div>

            <!-- Interactive Property Map Container -->
            <div class="pw-map-card-container" data-location-map-card>
              <div class="pw-map-card-header">
                <div class="pw-map-header-left">
                  <strong class="pw-map-title">Interactive Property Map</strong>
                  <span class="pw-map-credit">Leaflet / OpenStreetMap</span>
                </div>
                <div class="pw-map-header-right">
                  <div class="pw-search-compact">
                    <?= $pwIcon('search') ?>
                    <input id="adminLocationSearch" type="search" maxlength="160" data-location-search placeholder="Search address, landmark..." aria-label="Search barangay, address, or coordinates" aria-controls="pwLocationResults" autocomplete="off">
                    <button type="button" data-location-search-button aria-label="Search location">Search</button>
                  </div>
                  <select data-map-style="location" class="pw-select-sm" aria-label="Map style">
                    <option value="streets">Streets</option>
                    <option value="satellite">Satellite</option>
                  </select>
                </div>
              </div>

              <div class="pw-location-results" id="pwLocationResults" data-location-results role="region" aria-label="Location search results" aria-live="polite"></div>

              <div class="pw-map-shell">
                <div class="pw-map" data-location-map aria-label="Pin the property location or draw an optional plot boundary"></div>
              </div>

              <!-- Streamlined Map Controls: Place Pin, Draw Boundary, Edit Boundary, Clear Boundary -->
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

              <p class="pw-map-status-line" data-location-status role="status">Click the map or enter coordinates above to position the property marker.</p>

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
                  <option value="sqft">square feet (sq ft)</option>
                  <option value="acres">acres</option>
                  <option value="sqkm">km&sup2;</option>
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
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="pw-panel" data-editor-panel="2" hidden>
        <div class="pw-section-intro pw-evidence-intro"><span class="pw-eyebrow">Optional &middot; Site details</span><h3>Add supporting details when you have them</h3><p>You can submit the listing now and add records later. Open the editor to add access, utilities, zoning, or other site evidence.</p></div>
        <details class="pw-disclosure pw-evidence-editor" data-evidence-editor><summary><?= $pwIcon('document') ?><span>Add site details &amp; records</span><?= $pwIcon('chevron') ?></summary>
        <!-- Site Evidence 7-Criterion Workspace -->
        <div class="pw-evidence-workspace">
          <!-- Step Heading -->
          <div class="pw-evidence-header-block">
            <span class="pw-eyebrow">STEP 3 · SITE EVIDENCE</span>
            <h3 class="pw-evidence-main-title">Tell us about the site</h3>
            <p class="pw-evidence-subtitle">Add what you know. Supporting records help reviewers check your information across the six criteria.</p>
          </div>

          <!-- Criterion Navigation: Desktop Tabs + Mobile Accessible Select -->
          <div class="pw-criteria-nav-bar">
            <!-- Mobile Criterion Selector -->
            <div class="pw-criteria-mobile-picker">
              <label for="pwCriteriaMobileSelect" class="pw-sr-only">Choose assessment criterion</label>
              <select id="pwCriteriaMobileSelect" class="pw-criteria-select-mobile" data-criteria-mobile-select>
                <option value="spatial_accessibility">1. Spatial accessibility</option>
                <option value="infrastructure_readiness">2. Infrastructure readiness</option>
                <option value="economic_viability">3. Economic viability</option>
                <option value="nearby_businesses">4. Nearby businesses</option>
                <option value="zoning_compatibility">5. Zoning compatibility (CLUP)</option>
                <option value="risk_constraints">6. Risk constraints</option>
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
            </div>
          </div>

          <!-- 1. SPATIAL ACCESSIBILITY PANE -->
          <div id="pwCriterionSpatial" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="spatial_accessibility">
            <div class="pw-spatial-card">
              <!-- Card Header matching mockup -->
              <div class="pw-spatial-header">
                <div class="pw-spatial-heading-group">
                  <h3 class="pw-spatial-title">Spatial Accessibility</h3>
                  <p class="pw-spatial-subtitle">Step 3 &middot; MCE Assessment</p>
                </div>
                <div class="pw-spatial-header-badges">
                  <span class="pw-badge pw-badge-provisional">Provisional model</span>
                  <span class="pw-badge pw-badge-weight">20% of MCE</span>
                </div>
              </div>

              <!-- Reused Location Context Banner from Step 2 -->
              <div class="pw-reused-banner" data-spatial-reused-banner>
                <span class="pw-reused-icon"><?= $pwIcon('pin') ?></span>
                <div>
                  <span class="pw-reused-label">Reused location data from Step 2</span>
                  <p class="pw-reused-details">
                    Coordinates: <strong data-reused-coords>16.6150° N, 120.3160° E</strong> &middot; 
                    Barangay: <strong data-reused-barangay>San Fernando</strong> &middot; 
                    Recorded area: <strong data-reused-area>2,500 m²</strong>
                  </p>
                </div>
              </div>

              <div class="pw-spatial-form-body">
                <!-- 1. Road Access (30%) -->
                <div class="pw-spatial-item" data-spatial-field-block="road_access">
                  <label for="pwRoadAccess" class="pw-spatial-label">1. Road access</label>
                  <div class="pw-select-wrapper">
                    <select id="pwRoadAccess" name="road_access" class="pw-spatial-select" data-spatial-input="road_access">
                      <option value="frontage" selected>Direct road frontage</option>
                      <option value="right_of_way">Documented right-of-way</option>
                      <option value="no_access">No confirmed legal access</option>
                      <option value="unknown">Unknown / not yet verified</option>
                    </select>
                  </div>
                  <div class="pw-spatial-item-footer">
                    <span class="pw-sub-weight">Weight: 30%</span>
                    <strong class="pw-sub-score" data-spatial-sub-score="road_access">100/100</strong>
                  </div>
                </div>

                <!-- 2. Road Surface & Passability (25%) -->
                <div class="pw-spatial-item" data-spatial-field-block="road_surface_passability">
                  <label for="pwRoadSurfacePassability" class="pw-spatial-label">2. Road surface and passability</label>
                  <div class="pw-select-wrapper">
                    <select id="pwRoadSurfacePassability" name="road_surface_passability" class="pw-spatial-select" data-spatial-input="road_surface_passability">
                      <option value="paved" selected>Paved and passable year-round</option>
                      <option value="gravel">Gravel / all-weather</option>
                      <option value="unpaved">Unpaved / seasonal</option>
                      <option value="impassable">Impassable</option>
                      <option value="unknown">Unknown / not yet verified</option>
                    </select>
                  </div>
                  <div class="pw-spatial-item-footer">
                    <span class="pw-sub-weight">Weight: 25%</span>
                    <strong class="pw-sub-score" data-spatial-sub-score="road_surface_passability">100/100</strong>
                  </div>
                </div>

                <!-- 3. Usable Carriageway Width (25%) -->
                <div class="pw-spatial-item" data-spatial-field-block="carriageway_width">
                  <label for="pwCarriagewayWidth" class="pw-spatial-label">3. Usable carriageway width (meters)</label>
                  <div class="pw-input-wrapper">
                    <input id="pwCarriagewayWidth" name="carriageway_width" type="number" step="any" min="0" placeholder="e.g. 6" class="pw-spatial-input" data-spatial-input="carriageway_width">
                  </div>
                  <div class="pw-spatial-item-footer">
                    <span class="pw-sub-weight">Weight: 25%</span>
                    <strong class="pw-sub-score" data-spatial-sub-score="carriageway_width">Incomplete</strong>
                  </div>
                </div>

                <!-- 4. Distance to Major Road (20%) -->
                <div class="pw-spatial-item" data-spatial-field-block="distance_to_major_road">
                  <label for="pwDistanceToMajorRoad" class="pw-spatial-label">4. Distance to major road (meters)</label>
                  <div class="pw-input-wrapper">
                    <input id="pwDistanceToMajorRoad" name="distance_to_major_road" type="number" step="any" min="0" value="250" placeholder="e.g. 250" class="pw-spatial-input" data-spatial-input="distance_to_major_road">
                  </div>
                  <p class="pw-spatial-note">The actual system should calculate this from verified road-network data where available; otherwise the distance is reported and pending verification.</p>
                  <div class="pw-spatial-item-footer">
                    <span class="pw-sub-weight">Weight: 20%</span>
                    <strong class="pw-sub-score" data-spatial-sub-score="distance_to_major_road">85/100</strong>
                  </div>
                </div>

                <!-- LIVE SPATIAL ACCESSIBILITY PREVIEW CARD -->
                <div class="pw-spatial-preview-card" data-spatial-preview-card>
                  <div class="pw-spatial-preview-header">
                    <span class="pw-spatial-preview-kicker">LIVE SPATIAL ACCESSIBILITY PREVIEW</span>
                    <span class="pw-spatial-calc-icon" aria-hidden="true">&#128425;</span>
                  </div>

                  <!-- Incomplete state -->
                  <div class="pw-spatial-state-incomplete" data-spatial-state-incomplete>
                    <h4 class="pw-spatial-state-title">Assessment incomplete</h4>
                    <p class="pw-spatial-state-msg">Provide all four required inputs before a provisional score can be calculated.</p>
                    <div class="pw-spatial-disclaimer">
                      <span class="pw-info-bullet" aria-hidden="true">&#9432;</span>
                      <p>Illustrative scores from proposed rules, not verified LGU findings. The actual IAI requires city review and all six criteria.</p>
                    </div>
                  </div>

                  <!-- Complete state -->
                  <div class="pw-spatial-state-complete" data-spatial-state-complete hidden>
                    <div class="pw-spatial-score-banner">
                      <div class="pw-spatial-score-main">
                        <span class="pw-spatial-score-label">Provisional Score</span>
                        <div class="pw-spatial-score-num"><span data-spatial-total-score>92.5</span><small>/ 100</small></div>
                      </div>
                      <div class="pw-spatial-iai-box">
                        <span class="pw-spatial-iai-label">IAI Contribution (20% Weight)</span>
                        <strong class="pw-spatial-iai-val">+<span data-spatial-iai-contrib>18.5</span> <small>pts</small></strong>
                      </div>
                    </div>

                    <div class="pw-spatial-breakdown-row">
                      <div class="pw-spatial-pill">Road Access (30%): <strong data-spatial-p-access>30.0 pts</strong></div>
                      <div class="pw-spatial-pill">Road Surface (25%): <strong data-spatial-p-surface>25.0 pts</strong></div>
                      <div class="pw-spatial-pill">Width (25%): <strong data-spatial-p-width>20.0 pts</strong></div>
                      <div class="pw-spatial-pill">Proximity (20%): <strong data-spatial-p-dist>17.0 pts</strong></div>
                    </div>

                    <div class="pw-spatial-status-row">
                      <span class="pw-badge pw-badge-applicant">Applicant reported &middot; Pending LGU verification</span>
                    </div>

                    <div class="pw-spatial-disclaimer">
                      <span class="pw-info-bullet" aria-hidden="true">&#9432;</span>
                      <p>Illustrative scores from proposed rules, not verified LGU findings. The actual IAI requires city review and all six criteria.</p>
                    </div>
                  </div>

                  <div class="pw-spatial-preview-actions">
                    <button type="button" class="pw-button pw-button-light pw-button-small" data-spatial-reset-example>
                      &#x21bb; Reset example
                    </button>
                  </div>
                </div>

                <p class="pw-spatial-try-hint">Try changing the road surface to <em>Unpaved</em> or the road width to <em>2 meters</em>. Notice how the score adjusts.</p>

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
            </div>
          </div>

          <!-- 2. INFRASTRUCTURE READINESS PANE -->
          <div id="pwCriterionInfrastructure" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="infrastructure_readiness" hidden>
            <p class="pw-infra-intro-hint">Change the conditions below and watch the Infrastructure Readiness score update automatically.</p>
            <div class="pw-infra-card">
              <!-- Card Header matching mockup -->
              <div class="pw-infra-header">
                <div class="pw-infra-heading-group">
                  <h3 class="pw-infra-title">Infrastructure Readiness</h3>
                  <p class="pw-infra-subtitle">Choose the conditions reported for the property.</p>
                </div>
                <div class="pw-infra-header-badges">
                  <span class="pw-badge pw-badge-provisional">Interactive demo</span>
                  <span class="pw-badge pw-badge-weight">20% of MCE</span>
                </div>
              </div>

              <div class="pw-infra-form-body">
                <!-- 1. Primary Electricity Arrangement (35%) -->
                <div class="pw-infra-item" data-infra-field-block="electricity">
                  <label for="pwElectricityArrangement" class="pw-infra-label">1. Primary electricity arrangement</label>
                  <div class="pw-select-wrapper">
                    <select id="pwElectricityArrangement" name="electricity_arrangement" class="pw-infra-select" data-infra-input="electricity">
                      <option value="grid_reliable">Reliable and sufficient grid connection</option>
                      <option value="solar_battery">Reliable adequate solar with battery storage</option>
                      <option value="generator_only" selected>Generator-only supply</option>
                      <option value="grid_unconnected">Grid available nearby but unconnected</option>
                      <option value="no_supply">No operational electric supply</option>
                      <option value="unknown">Unknown / not yet verified</option>
                    </select>
                  </div>
                  <div class="pw-infra-item-footer">
                    <span class="pw-sub-weight">Weight: 35%</span>
                    <strong class="pw-sub-score" data-infra-sub-score="electricity">14.00 pts</strong>
                  </div>

                  <!-- Cross-Criteria Consideration for Generator-Only Electricity -->
                  <div class="pw-infra-generator-callout" data-infra-generator-callout>
                    <div class="pw-callout-header">
                      <span class="pw-info-icon" aria-hidden="true">&#9432;</span>
                      <strong>Cross-Criteria Consideration &middot; Generator-Only Supply</strong>
                    </div>
                    <p class="pw-callout-text">
                      Generator-only supply implies recurring fuel and maintenance expenditures (recorded for <em>Economic Viability</em> OPEX context), as well as exhaust emissions, acoustic noise, and fuel storage considerations (recorded for <em>Environmental Safety</em> context). No arbitrary deduction or double-counting is applied to Infrastructure Readiness.
                    </p>
                    <div class="pw-fields-two-col" style="margin-top: 10px;">
                      <label class="pw-field">Generator fuel type
                        <select name="generator_fuel_type">
                          <option value="diesel" selected>Diesel fuel</option>
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
                    <summary>Factual provider, capacity &amp; backup details <span class="pw-muted">(does not alter score)</span></summary>
                    <div class="pw-fields-two-col" style="margin-top: 8px;">
                      <label class="pw-field">Electricity provider
                        <input name="electricity_provider" placeholder="e.g. LUECO (La Union Electric Company), NGCP">
                      </label>
                      <label class="pw-field">Capacity / connection specs
                        <input name="electricity_capacity" placeholder="e.g. 50 kVA, 3-phase, 220V">
                      </label>
                    </div>
                    <div class="pw-fields-two-col" style="margin-top: 8px;">
                      <label class="pw-field">Secondary backup facility
                        <select name="electricity_backup">
                          <option value="none" selected>None reported</option>
                          <option value="standby_generator">Standby generator</option>
                          <option value="solar_backup">Solar PV backup</option>
                          <option value="bess">Battery Energy Storage (BESS)</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                    </div>
                  </details>
                </div>

                <!-- 2. Water Supply (30%) -->
                <div class="pw-infra-item" data-infra-field-block="water">
                  <label for="pwWaterSupply" class="pw-infra-label">2. Water supply</label>
                  <div class="pw-select-wrapper">
                    <select id="pwWaterSupply" name="water_supply" class="pw-infra-select" data-infra-input="water">
                      <option value="piped_reliable" selected>Reliable and sufficient piped supply</option>
                      <option value="deepwell_tested">Verified sufficient and suitably tested deep well</option>
                      <option value="limited_intermittent">Limited / intermittent supply</option>
                      <option value="available_unconnected">Water main available nearby but unconnected</option>
                      <option value="unavailable">Unavailable / no water supply</option>
                      <option value="unknown">Unknown / not yet verified</option>
                    </select>
                  </div>
                  <div class="pw-infra-item-footer">
                    <span class="pw-sub-weight">Weight: 30%</span>
                    <strong class="pw-sub-score" data-infra-sub-score="water">30.00 pts</strong>
                  </div>

                  <!-- Conditional Factual Details for Water -->
                  <details class="pw-infra-details" data-infra-details="water">
                    <summary>Factual water provider, testing &amp; storage details <span class="pw-muted">(does not alter score)</span></summary>
                    <div class="pw-fields-two-col" style="margin-top: 8px;">
                      <label class="pw-field">Water utility / provider
                        <input name="water_provider" placeholder="e.g. Metro La Union Water District (MLUWD)">
                      </label>
                      <label class="pw-field">Potability &amp; adequacy testing
                        <input name="water_testing_notes" placeholder="e.g. Potability &amp; bacteriological test clearance">
                      </label>
                    </div>
                    <div class="pw-fields-two-col" style="margin-top: 8px;">
                      <label class="pw-field">On-site storage / cistern
                        <input name="water_storage_notes" placeholder="e.g. 5,000L cistern with booster pump">
                      </label>
                    </div>
                  </details>
                </div>

                <!-- 3. Internet & Telecommunications (20%) -->
                <div class="pw-infra-item" data-infra-field-block="internet">
                  <label for="pwInternetTelecom" class="pw-infra-label">3. Internet &amp; telecommunications</label>
                  <div class="pw-select-wrapper">
                    <select id="pwInternetTelecom" name="internet_telecom" class="pw-infra-select" data-infra-input="internet">
                      <option value="fiber_reliable" selected>Reliable fiber connection</option>
                      <option value="fixed_wireless">Fixed wireless broadband</option>
                      <option value="satellite_reliable">Reliable satellite connection</option>
                      <option value="mobile_data_stable">Stable mobile data (4G/5G)</option>
                      <option value="available_uninstalled">Broadband available nearby but uninstalled</option>
                      <option value="unavailable">Unavailable / telecom dead zone</option>
                      <option value="unknown">Unknown / not yet verified</option>
                    </select>
                  </div>
                  <div class="pw-infra-item-footer">
                    <span class="pw-sub-weight">Weight: 20%</span>
                    <strong class="pw-sub-score" data-infra-sub-score="internet">20.00 pts</strong>
                  </div>

                  <!-- Conditional Factual Details for Internet -->
                  <details class="pw-infra-details" data-infra-details="internet">
                    <summary>Factual ISP provider, speed &amp; backup details <span class="pw-muted">(does not alter score)</span></summary>
                    <div class="pw-fields-two-col" style="margin-top: 8px;">
                      <label class="pw-field">Primary ISP / carrier
                        <input name="internet_provider" placeholder="e.g. PLDT, Converge, Globe, Starlink">
                      </label>
                      <label class="pw-field">Measured / rated speed
                        <input name="download_speed_mbps" placeholder="e.g. 100 Mbps symmetric fiber">
                      </label>
                    </div>
                    <div class="pw-fields-two-col" style="margin-top: 8px;">
                      <label class="pw-field">Backup connection
                        <input name="internet_backup_notes" placeholder="e.g. 5G wireless failover / dual WAN">
                      </label>
                    </div>
                  </details>
                </div>

                <!-- 4. Drainage Conditions (15%) -->
                <div class="pw-infra-item" data-infra-field-block="drainage">
                  <label for="pwDrainageConditions" class="pw-infra-label">4. Drainage conditions</label>
                  <div class="pw-select-wrapper">
                    <select id="pwDrainageConditions" name="drainage_conditions" class="pw-infra-select" data-infra-input="drainage">
                      <option value="adequate_functional" selected>Adequate and fully functional</option>
                      <option value="minor_improvements">Minor improvements required</option>
                      <option value="inadequate">Inadequate drainage</option>
                      <option value="unavailable">Unavailable / no drainage system</option>
                      <option value="unknown">Unknown / not yet verified</option>
                    </select>
                  </div>
                  <div class="pw-infra-item-footer">
                    <span class="pw-sub-weight">Weight: 15%</span>
                    <strong class="pw-sub-score" data-infra-sub-score="drainage">15.00 pts</strong>
                  </div>

                  <!-- Conditional Factual Details for Drainage -->
                  <details class="pw-infra-details" data-infra-details="drainage">
                    <summary>Factual drainage network &amp; outfall details <span class="pw-muted">(does not alter score)</span></summary>
                    <div class="pw-fields-two-col" style="margin-top: 8px;">
                      <label class="pw-field">Drainage system type
                        <input name="drainage_type" placeholder="e.g. Covered concrete curb-and-gutter, storm sewer">
                      </label>
                      <label class="pw-field">Outfall discharge point
                        <input name="drainage_outfall" placeholder="e.g. Municipal storm trunk, roadside canal">
                      </label>
                    </div>
                  </details>
                </div>

                <!-- PRELIMINARY INFRASTRUCTURE ASSESSMENT CARD (Matching Mockup) -->
                <div class="pw-infra-preview-card" data-infra-preview-card>
                  <div class="pw-infra-preview-header">
                    <span class="pw-infra-preview-kicker">PRELIMINARY INFRASTRUCTURE ASSESSMENT</span>
                  </div>

                  <!-- Complete State -->
                  <div class="pw-infra-state-complete" data-infra-state-complete>
                    <div class="pw-infra-score-row">
                      <div class="pw-infra-score-main">
                        <span class="pw-infra-score-num"><strong data-infra-total-score>79.0</strong> <small>/ 100</small></span>
                      </div>
                      <span class="pw-badge pw-badge-calculated">Calculated</span>
                    </div>

                    <!-- Burgundy Progress Bar matching Screenshot -->
                    <div class="pw-infra-progress-track">
                      <div class="pw-infra-progress-bar" data-infra-progress-bar style="width: 79%;"></div>
                    </div>

                    <!-- 4 Subcategory Contribution Rows -->
                    <div class="pw-infra-breakdown-list">
                      <div class="pw-infra-breakdown-row">
                        <div class="pw-infra-row-label">
                          <strong>Electricity</strong>
                          <small>35% of Infrastructure</small>
                        </div>
                        <div class="pw-infra-row-pts"><strong data-infra-pts-elec>14.00</strong> pts</div>
                      </div>
                      <div class="pw-infra-breakdown-row">
                        <div class="pw-infra-row-label">
                          <strong>Water Supply</strong>
                          <small>30% of Infrastructure</small>
                        </div>
                        <div class="pw-infra-row-pts"><strong data-infra-pts-water>30.00</strong> pts</div>
                      </div>
                      <div class="pw-infra-breakdown-row">
                        <div class="pw-infra-row-label">
                          <strong>Internet &amp; Telecom</strong>
                          <small>20% of Infrastructure</small>
                        </div>
                        <div class="pw-infra-row-pts"><strong data-infra-pts-internet>20.00</strong> pts</div>
                      </div>
                      <div class="pw-infra-breakdown-row">
                        <div class="pw-infra-row-label">
                          <strong>Drainage</strong>
                          <small>15% of Infrastructure</small>
                        </div>
                        <div class="pw-infra-row-pts"><strong data-infra-pts-drainage>15.00</strong> pts</div>
                      </div>
                    </div>

                    <div class="pw-infra-iai-row">
                      <span class="pw-infra-iai-title">Contribution to final IAI (20%)</span>
                      <strong class="pw-infra-iai-val"><span data-infra-iai-contrib>15.80</span> pts</strong>
                    </div>

                    <div class="pw-infra-disclaimer">
                      <p>This is a provisional scoring demonstration. It does not verify evidence or establish an official LGU assessment.</p>
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
                      <p>Illustrative scores from proposed rules, not verified LGU findings. The actual IAI requires city review and all six criteria.</p>
                    </div>
                  </div>

                  <div class="pw-infra-actions">
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
              </div>
            </div>
          </div>

          <!-- 3. ECONOMIC VIABILITY PANE -->
          <div id="pwCriterionEconomic" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="economic_viability" hidden>
            <div class="pw-econ-card">
              <!-- Card Header matching screenshot -->
              <div class="pw-econ-header">
                <div class="pw-econ-heading-group">
                  <h3 class="pw-econ-title">Economic Viability</h3>
                  <p class="pw-econ-subtitle">Property pricing and valuation context</p>
                </div>
                <div class="pw-econ-header-badges">
                  <span class="pw-badge pw-badge-weight">20% of MCE</span>
                </div>
              </div>

              <!-- FROM PROPERTY DETAILS box matching screenshot -->
              <div class="pw-econ-from-details">
                <span class="pw-econ-from-kicker">FROM PROPERTY DETAILS</span>
                <div class="pw-econ-from-row">
                  <span class="pw-econ-from-label">Listing purpose</span>
                  <strong class="pw-econ-from-val" data-econ-from-purpose>For Sale</strong>
                </div>
                <div class="pw-econ-from-row">
                  <span class="pw-econ-from-label">Asking price</span>
                  <strong class="pw-econ-from-val" data-econ-from-price>&#8369;9,000,000</strong>
                </div>
                <div class="pw-econ-from-row">
                  <span class="pw-econ-from-label">Recorded property area</span>
                  <strong class="pw-econ-from-val" data-econ-from-area>1,000 m&sup2;</strong>
                </div>
              </div>

              <!-- 1. BIR Zonal Valuation matching screenshot -->
              <div class="pw-econ-item">
                <h4 class="pw-econ-section-title">1. BIR Zonal Valuation</h4>
                <p class="pw-econ-section-desc">Enter the applicable official zonal value if it isn't available through the system's reference data.</p>
                <div class="pw-econ-field-group">
                  <label for="pwBirZonalValue" class="pw-econ-label">BIR zonal value (&#8369;/m&sup2;)</label>
                  <input id="pwBirZonalValue" name="bir_zonal_value" type="number" min="0" step="0.01" class="pw-econ-input" placeholder="7000" data-econ-input="bir_zonal_value">
                </div>
                <div class="pw-econ-hint-row">
                  <span class="pw-badge pw-badge-source-req">Source required for verification</span>
                  <span class="pw-econ-hint-text">Correct location, land classification, and effective schedule must be confirmed.</span>
                </div>
              </div>

              <!-- 2. Additional Valuation References matching screenshot -->
              <div class="pw-econ-item">
                <h4 class="pw-econ-section-title">2. Additional Valuation References</h4>
                <p class="pw-econ-section-desc">Optional supporting information for authorized review.</p>
                <div class="pw-econ-fields-stack">
                  <div class="pw-econ-field-group">
                    <label for="pwComparableMarketPrice" class="pw-econ-label">Comparable market price (&#8369;/m&sup2;), if available</label>
                    <input id="pwComparableMarketPrice" name="comparable_market_price" type="number" min="0" step="0.01" class="pw-econ-input" placeholder="Enter verified local comparison value" data-econ-input="comparable_market_price">
                  </div>
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
                </div>

                <!-- Single expandable supporting evidence disclosure -->
                <details class="pw-econ-details" data-econ-details>
                  <summary>Supporting documentation &amp; reference details <span class="pw-muted">(for city review)</span></summary>
                  <div class="pw-econ-details-body">
                    <div class="pw-fields-two-col">
                      <label class="pw-field">BIR Schedule / Department Order Reference
                        <input name="bir_source" maxlength="500" placeholder="e.g. BIR Department Order No. 042-2024, RDO 003">
                      </label>
                      <label class="pw-field">Reference / Schedule effective date
                        <input name="bir_date" type="date">
                      </label>
                    </div>
                    <div class="pw-fields-two-col" style="margin-top: 8px;">
                      <label class="pw-field">Tax Declaration / ARP Number
                        <input name="assessed_market_value" maxlength="200" placeholder="e.g. ARP No. 2024-001-0492">
                      </label>
                      <label class="pw-field">Comparable market source / Appraiser
                        <input name="comparable_source" maxlength="250" placeholder="e.g. PRC Licensed Appraiser, Local MLS 2026-Q1">
                      </label>
                    </div>
                  </div>
                </details>
              </div>

              <!-- 3. AUTOMATIC PRICE ANALYSIS CARD matching screenshot -->
              <div class="pw-econ-preview-card" data-econ-preview-card>
                <div class="pw-econ-preview-header">
                  <span class="pw-econ-preview-kicker">AUTOMATIC PRICE ANALYSIS &mdash; EXAMPLE</span>
                </div>

                <!-- Top 2-Column Metrics matching screenshot -->
                <div class="pw-econ-grid-2col">
                  <div class="pw-econ-metric-col">
                    <span class="pw-econ-metric-label" data-econ-rate-type-label>Asking price per m&sup2;</span>
                    <strong class="pw-econ-metric-val" data-econ-asking-sqm>&#8369;9,000</strong>
                  </div>
                  <div class="pw-econ-metric-col">
                    <span class="pw-econ-metric-label">BIR zonal reference</span>
                    <strong class="pw-econ-metric-val" data-econ-bir-sqm>&#8369;7,000/m&sup2;</strong>
                  </div>
                </div>

                <!-- Breakdown Comparison Rows matching screenshot -->
                <div class="pw-econ-breakdown-list">
                  <div class="pw-econ-breakdown-row">
                    <span class="pw-econ-breakdown-title">Total BIR zonal reference value</span>
                    <strong class="pw-econ-breakdown-pts" data-econ-total-bir>&#8369;7,000,000</strong>
                  </div>
                  <div class="pw-econ-breakdown-row">
                    <span class="pw-econ-breakdown-title">Asking price relative to BIR reference</span>
                    <strong class="pw-econ-breakdown-pts" data-econ-bir-diff>28.6% higher</strong>
                  </div>
                  <div class="pw-econ-breakdown-row" data-econ-market-diff-row hidden>
                    <span class="pw-econ-breakdown-title">Asking price relative to market benchmark</span>
                    <strong class="pw-econ-breakdown-pts" data-econ-market-diff>&mdash;</strong>
                  </div>
                  <div class="pw-econ-breakdown-row" data-econ-lease-sqm-row hidden>
                    <span class="pw-econ-breakdown-title">Monthly lease rate per m&sup2;</span>
                    <strong class="pw-econ-breakdown-pts" data-econ-lease-sqm>&mdash;</strong>
                  </div>
                </div>

                <!-- Area Discrepancy Alert -->
                <div class="pw-econ-warning" data-econ-area-discrepancy hidden>
                  <strong>&#9888; Area Discrepancy Flagged:</strong> Recorded property area differs significantly from mapped plot boundary. Economic metrics are provisional and withheld from official evaluation until parcel survey verification.
                </div>

                <!-- Bottom Notice Callout with info circle matching screenshot -->
                <div class="pw-econ-callout">
                  <span class="pw-info-icon" aria-hidden="true">&#9432;</span>
                  <p class="pw-econ-callout-text">
                    A difference from BIR zonal valuation does not by itself establish overpricing, profitability, or investment suitability. A verified market benchmark is still needed for a price-competitiveness assessment.
                  </p>
                </div>

                <!-- Methodological Assessment Status -->
                <div class="pw-econ-status-row">
                  <div class="pw-econ-status-left">
                    <span class="pw-badge pw-badge-provisional" data-econ-status-badge>Assessment Incomplete</span>
                    <small class="pw-econ-status-note" data-econ-status-note>Methodological Baseline &middot; Awaiting Verified Market Comparables</small>
                  </div>
                  <strong class="pw-econ-iai-val" data-econ-iai-val>&mdash;</strong>
                </div>

                <!-- Demo Reset Button -->
                <div class="pw-econ-actions">
                  <button type="button" class="pw-btn-reset-demo" data-econ-reset-example>
                    &#x21bb; Reset example
                  </button>
                </div>
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
                  <span class="pw-badge pw-badge-weight">10% of MCE</span>
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
                        <option value="satellite">Satellite</option>
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
                        <button type="button" role="tab" aria-selected="true" class="is-active" data-radar-tab="competitors">Competitors</button>
                        <button type="button" role="tab" aria-selected="false" data-radar-tab="related">Related</button>
                        <button type="button" role="tab" aria-selected="false" data-radar-tab="complementary">Complementary</button>
                        <button type="button" role="tab" aria-selected="false" data-radar-tab="roads">Roads</button>
                        <button type="button" role="tab" aria-selected="false" data-radar-tab="all">All</button>
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
                      <span class="pw-small pw-muted">Subcriteria evaluation based on verified commercial benchmarks</span>
                    </div>
                    <span class="pw-badge pw-badge-amber" data-nearby-assessment-badge data-nearby-assessment-status data-nearby-assessment-score>Assessment Incomplete</span>
                  </div>
                  <p class="pw-nearby-assessment-explanation" data-nearby-assessment-explanation data-nearby-assessment-desc>
                    Score and explanation appear after the required inventory coverage, classifications, and scoring benchmarks are verified.
                  </p>

                  <div class="pw-nearby-subcriteria-grid" data-nearby-subcriteria-grid>
                    <div class="pw-nearby-subcrit-card" data-subcrit-card="commercial_activity" data-nearby-subcriterion="commercial_activity">
                      <div class="pw-subcrit-card-top">
                        <span class="pw-subcrit-name">Commercial Activity</span>
                        <span class="pw-badge pw-badge-weight">25%</span>
                      </div>
                      <div class="pw-subcrit-score-row">
                        <strong data-subcrit-score="commercial_activity">Awaiting benchmarks</strong>
                      </div>
                      <div class="pw-criterion-bar"><span style="width: 0%" data-subcrit-bar="commercial_activity" data-nearby-score-bar></span></div>
                      <small class="pw-muted">Operating density in 500m radius</small>
                    </div>

                    <div class="pw-nearby-subcrit-card" data-subcrit-card="complementary_businesses" data-nearby-subcriterion="complementary_businesses">
                      <div class="pw-subcrit-card-top">
                        <span class="pw-subcrit-name">Complementary Businesses</span>
                        <span class="pw-badge pw-badge-weight">30%</span>
                      </div>
                      <div class="pw-subcrit-score-row">
                        <strong data-subcrit-score="complementary_businesses">Awaiting benchmarks</strong>
                      </div>
                      <div class="pw-criterion-bar"><span style="width: 0%" data-subcrit-bar="complementary_businesses"></span></div>
                      <small class="pw-muted">Foot-traffic &amp; civic anchor support</small>
                    </div>

                    <div class="pw-nearby-subcrit-card" data-subcrit-card="competitive_pressure" data-nearby-subcriterion="competitive_pressure">
                      <div class="pw-subcrit-card-top">
                        <span class="pw-subcrit-name">Competitive Pressure</span>
                        <span class="pw-badge pw-badge-weight">30%</span>
                      </div>
                      <div class="pw-subcrit-score-row">
                        <strong data-subcrit-score="competitive_pressure">Awaiting benchmarks</strong>
                      </div>
                      <div class="pw-criterion-bar"><span style="width: 0%" data-subcrit-bar="competitive_pressure"></span></div>
                      <small class="pw-muted">Direct competitor density ratio</small>
                    </div>

                    <div class="pw-nearby-subcrit-card" data-subcrit-card="activity_anchors" data-nearby-subcriterion="activity_anchors">
                      <div class="pw-subcrit-card-top">
                        <span class="pw-subcrit-name">Activity Anchors</span>
                        <span class="pw-badge pw-badge-weight">15%</span>
                      </div>
                      <div class="pw-subcrit-score-row">
                        <strong data-subcrit-score="activity_anchors">Awaiting benchmarks</strong>
                      </div>
                      <div class="pw-criterion-bar"><span style="width: 0%" data-subcrit-bar="activity_anchors"></span></div>
                      <small class="pw-muted">Malls, terminals &amp; commercial centers</small>
                    </div>
                  </div>

                  <div class="pw-nearby-mce-summary">
                    <div>
                      <span class="pw-nearby-mce-title">MCE Contribution:</span>
                      <strong data-nearby-mce-contrib data-nearby-iai-contrib>Pending verified benchmarks</strong>
                      <span class="pw-muted">&middot; 10% of overall MCE weight</span>
                    </div>
                    <small class="pw-muted" data-nearby-mce-formula>Formula: Business Environment Score &times; 0.10. Missing source data is never defaulted.</small>
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
                    <p class="pw-reused-details">Proposed use: <strong data-reused-category>Land</strong> &middot; Selecting a proposed use is a declaration, NOT official zoning clearance.</p>
                  </div>
                </div>

                <!-- Official San Fernando Zoning & Land Use Rules Engine -->
                <div class="pw-evidence-card-box pw-zoning-card">
                  <div class="pw-evidence-box-header">
                    <div>
                      <h5 style="margin: 0; font-size: 14px;">Zoning &amp; Land Use Rules Engine</h5>
                      <span class="pw-small pw-muted">San Fernando City Zoning Ordinance No. 2018-06 &amp; Confirmed Amendments</span>
                    </div>
                    <span class="pw-badge pw-badge-sky">Priority 1 Source</span>
                  </div>

                  <div class="pw-fields" style="margin-top: 14px;">
                    <label class="pw-field pw-full">Official San Fernando Zoning District <span class="pw-required-asterisk" style="color: #9E1B22;">*</span>
                      <select id="pwZoningClassification" name="zoning_classification" class="pw-select" data-zoning-select required>
                        <option value="">— Select Official Zoning District —</option>
                        <optgroup label="Commercial Districts (City Ordinance 2018-06, Sec. 10.B)">
                          <option value="C-1">C-1 — Commercial Zone 1 (Low-Density / General Commercial)</option>
                          <option value="C-2">C-2 — Commercial Zone 2 (Medium-Density Commercial)</option>
                          <option value="C-3">C-3 — Commercial Zone 3 (High-Density / Metropolitan Commercial Corridor)</option>
                        </optgroup>
                        <optgroup label="Residential Districts (Sec. 10.A)">
                          <option value="R-1">R-1 — Residential Zone 1 (Low-Density Residential)</option>
                          <option value="R-2">R-2 — Residential Zone 2 (Medium-Density Residential)</option>
                          <option value="R-3">R-3 — Residential Zone 3 (High-Density Residential)</option>
                        </optgroup>
                        <optgroup label="Industrial Districts (Sec. 10.D)">
                          <option value="I-1">I-1 — Light Industrial Zone (Non-Pollutive / Non-Hazardous)</option>
                          <option value="I-2">I-2 — Medium Industrial Zone (Pollutive / Hazardous with ECC)</option>
                        </optgroup>
                        <optgroup label="Agricultural &amp; Agro-Industrial Districts (Sec. 10.E)">
                          <option value="AGR-S">AGR-S — Strategic Agricultural &amp; Fisheries Dev Zone (SAFDFZ)</option>
                          <option value="AGR-NS">AGR-NS — Non-Strategic Agricultural Zone</option>
                          <option value="AIZ">AIZ — Agro-Industrial Zone</option>
                        </optgroup>
                        <optgroup label="Institutional Districts (Sec. 10.C)">
                          <option value="GI">GI — General Institutional Zone</option>
                          <option value="SI">SI — Special Institutional Zone</option>
                        </optgroup>
                        <optgroup label="Tourism District (Sec. 10.F)">
                          <option value="TZ">TZ — Tourism Zone (Coastal Belt / Hospitality)</option>
                        </optgroup>
                        <optgroup label="Special &amp; Protected Districts (Sec. 10.G-J)">
                          <option value="FEZ">FEZ — Freeport Economic Zone (Poro Point Special Economic Zone)</option>
                          <option value="MRZ">MRZ — Mangrove &amp; Marine Sanctuary Zone (Strict Protection)</option>
                          <option value="FRZ">FRZ — Forest &amp; Watershed Conservation Zone</option>
                          <option value="PDZ">PDZ — Planned Unit Development Zone (Mixed-Use)</option>
                        </optgroup>
                      </select>
                    </label>

                    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; grid-column: 1 / -1;">
                      <label class="pw-field">Land Use Category
                        <select id="pwZoningCategory" name="zoning_category" class="pw-select" data-zoning-category-select>
                          <option value="">— All Categories —</option>
                          <option value="retail">Retail Trade &amp; Merchandising</option>
                          <option value="food">Food &amp; Beverage Services</option>
                          <option value="offices">Offices &amp; Business Services</option>
                          <option value="residential">Residential &amp; Housing</option>
                          <option value="industrial">Industrial &amp; Manufacturing</option>
                          <option value="agricultural">Agricultural &amp; Agribusiness</option>
                          <option value="tourism">Tourism, Leisure &amp; Hospitality</option>
                          <option value="logistics">Logistics, Warehousing &amp; Transport</option>
                          <option value="institutional">Institutional, Civic &amp; Healthcare</option>
                        </select>
                      </label>

                      <label class="pw-field">Specific Proposed Activity <span class="pw-required-asterisk" style="color: #9E1B22;">*</span>
                        <select id="pwZoningActivity" name="proposed_activity" class="pw-select" data-zoning-activity-select required>
                          <option value="">— Select Specific Activity —</option>
                          <optgroup label="Retail (4 activities)" data-category-group="retail">
                            <option value="retail_convenience" data-category="retail">Convenience store (neighborhood retail &le;400 m²)</option>
                            <option value="retail_supermarket" data-category="retail">Supermarket / Grocery store / Department store</option>
                            <option value="retail_pharmacy" data-category="retail">Pharmacy / Drugstore / Medical supplies</option>
                            <option value="retail_hardware" data-category="retail">Hardware store / Construction supply</option>
                          </optgroup>
                          <optgroup label="Food &amp; Beverage (4 activities)" data-category-group="food">
                            <option value="food_cafe" data-category="food">Café / Coffee shop / Refreshment parlor</option>
                            <option value="food_restaurant" data-category="food">Restaurant / Dining establishment / Fast food</option>
                            <option value="food_bakery" data-category="food">Bakery / Bakeshop / Pastry shop</option>
                            <option value="food_processing" data-category="food">Food-processing plant / Commercial kitchen / Cannery</option>
                          </optgroup>
                          <optgroup label="Offices (3 activities)" data-category-group="offices">
                            <option value="office_professional" data-category="offices">Professional services / Corporate business office</option>
                            <option value="office_bpo" data-category="offices">BPO / IT-BPM center / Tech services</option>
                            <option value="office_government" data-category="offices">Government office / Public service extension</option>
                          </optgroup>
                          <optgroup label="Residential (3 activities)" data-category-group="residential">
                            <option value="res_detached" data-category="residential">Detached single-family housing / Subdivision lot</option>
                            <option value="res_apartments" data-category="residential">Multi-family apartments / Townhouses (&le;3 storeys)</option>
                            <option value="res_condominium" data-category="residential">Residential condominium / High-rise residential</option>
                          </optgroup>
                          <optgroup label="Industrial (2 activities)" data-category-group="industrial">
                            <option value="ind_light_manufacturing" data-category="industrial">Light manufacturing (non-pollutive / non-hazardous)</option>
                            <option value="ind_heavy_manufacturing" data-category="industrial">Heavy manufacturing (pollutive / hazardous)</option>
                          </optgroup>
                          <optgroup label="Agricultural (4 activities)" data-category-group="agricultural">
                            <option value="agri_crop_production" data-category="agricultural">Crop production / Farming / Cultivation</option>
                            <option value="agri_livestock" data-category="agricultural">Livestock raising / Poultry farm</option>
                            <option value="agri_aquaculture" data-category="agricultural">Aquaculture / Fishponds / Hatcheries</option>
                            <option value="agri_processing" data-category="agricultural">Agricultural processing / Rice mill / Drying facility</option>
                          </optgroup>
                          <optgroup label="Tourism (3 activities)" data-category-group="tourism">
                            <option value="tour_hotel" data-category="tourism">Hotel / Commercial accommodation / Lodging</option>
                            <option value="tour_resort" data-category="tourism">Resort / Coastal eco-tourism / Recreation facility</option>
                            <option value="tour_recreation" data-category="tourism">Recreational establishment / Amusement park</option>
                          </optgroup>
                          <optgroup label="Logistics (3 activities)" data-category-group="logistics">
                            <option value="log_warehouse" data-category="logistics">Warehouse / Storage facility (&le;1,000 m²)</option>
                            <option value="log_distribution_center" data-category="logistics">Distribution center / Major logistics hub</option>
                            <option value="log_transport_terminal" data-category="logistics">Transport terminal / Bus depot / Freight hub</option>
                          </optgroup>
                          <optgroup label="Institutional (3 activities)" data-category-group="institutional">
                            <option value="inst_school" data-category="institutional">School / Educational institution / University</option>
                            <option value="inst_hospital" data-category="institutional">Hospital / Medical clinic / Healthcare facility</option>
                            <option value="inst_government_facility" data-category="institutional">Civic / Government administrative facility</option>
                          </optgroup>
                        </select>
                      </label>
                    </div>

                    <label class="pw-field pw-full">Observed existing land use
                      <input name="existing_land_use" maxlength="180" placeholder="e.g. Vacant lot, commercial strip, agricultural, mixed residential">
                    </label>
                  </div>

                  <!-- Conditions Checkboxes (Scale, Intensity, Environmental, Setbacks) -->
                  <div class="pw-zoning-conditions-row" style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
                    <div style="margin-bottom: 8px;">
                      <span class="pw-small" style="font-weight: 600; color: #1E293B;">Applicable Development Conditions &amp; Constraints:</span>
                      <span class="pw-small pw-muted">(auto-adjusts conditional clearances)</span>
                    </div>
                    <div class="pw-zoning-cond-checkboxes">
                      <label class="pw-checkbox-label">
                        <input type="checkbox" name="zoning_cond_scale" value="1" data-zoning-cond="scale" checked>
                        <span>Activity scale complies with district maximum (e.g. &le;400 m² neighborhood footprint)</span>
                      </label>
                      <label class="pw-checkbox-label">
                        <input type="checkbox" name="zoning_cond_height" value="1" data-zoning-cond="height" checked>
                        <span>Building height complies with district limit (e.g. &le;3 storeys / 10m in low-density zones)</span>
                      </label>
                      <label class="pw-checkbox-label">
                        <input type="checkbox" name="zoning_cond_setback" value="1" data-zoning-cond="setback" checked>
                        <span>Mandated yard setbacks &amp; buffers observed (5m–15m road/boundary buffers)</span>
                      </label>
                      <label class="pw-checkbox-label">
                        <input type="checkbox" name="zoning_cond_pollution" value="1" data-zoning-cond="pollution" checked>
                        <span>Pollution control clearance / DENR ECC obtained (non-hazardous / treated discharge)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- LIVE AUTOMATIC COMPATIBILITY RESULT CARD -->
                <div class="pw-zoning-result-card" data-zoning-result-card style="margin-top: 16px;">
                  <div class="pw-zoning-result-header">
                    <div class="pw-zoning-result-title-group">
                      <span class="pw-zoning-result-icon"><?= $pwIcon('target') ?></span>
                      <div>
                        <h5 style="margin: 0; font-size: 14px; font-weight: 700;">Automatic Zoning Compatibility Result</h5>
                        <span class="pw-small pw-muted" data-zoning-citation-badge>Priority 1: San Fernando City Ordinance No. 2018-06</span>
                      </div>
                    </div>
                    <span class="pw-badge pw-badge-sky" data-zoning-status-badge style="font-size: 12px; font-weight: 700; padding: 6px 12px;">
                      Awaiting Selection
                    </span>
                  </div>

                  <div class="pw-zoning-result-body">
                    <div class="pw-zoning-result-metrics">
                      <div class="pw-zoning-metric-cell">
                        <span class="pw-small pw-muted">Zoning Score</span>
                        <strong data-zoning-score-display style="font-size: 20px; color: #0F172A;">—</strong>
                      </div>
                      <div class="pw-zoning-metric-cell">
                        <span class="pw-small pw-muted">15% MCE Weight Contribution</span>
                        <strong data-zoning-mce-contrib style="font-size: 20px; color: #0F172A;">—</strong>
                      </div>
                      <div class="pw-zoning-metric-cell">
                        <span class="pw-small pw-muted">Eligibility Gate Status</span>
                        <strong data-zoning-gate-display style="font-size: 13px; color: #0F172A;">Awaiting data</strong>
                      </div>
                    </div>

                    <div class="pw-zoning-explanation-box" style="margin-top: 12px; padding: 12px; background: #F8FAFC; border-radius: 6px; border-left: 4px solid #CBD5E1;" data-zoning-explanation-box>
                      <p class="pw-small" data-zoning-explanation style="margin: 0; color: #334155; line-height: 1.5;">
                        Select an official San Fernando City zoning district and proposed activity to automatically evaluate zoning compliance.
                      </p>
                    </div>

                    <!-- Mandated Clearances & Conditions Disclosure -->
                    <div class="pw-zoning-conditions-disclosure" data-zoning-conditions-disclosure style="margin-top: 12px;" hidden>
                      <span class="pw-small" style="font-weight: 700; color: #B45309;">Mandated Clearances &amp; Conditions:</span>
                      <ul class="pw-zoning-conditions-list" data-zoning-conditions-list style="margin: 6px 0 0; padding-left: 20px; font-size: 12px; color: #78350F;"></ul>
                    </div>

                    <!-- Official Ordinance Citation Line -->
                    <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #64748B;">
                      <span>Ordinance Section: <strong data-zoning-ordinance-section>City Ordinance 2018-06</strong></span>
                      <span>Rules Engine: <span data-zoning-engine-version><?= \App\Support\ZoningRulesEngine::VERSION ?></span></span>
                    </div>
                  </div>
                </div>

                <!-- Collapsible CLUP Allowed Land Uses Reference (Backwards Compatibility) -->
                <details class="pw-disclosure" style="margin-top: 14px;">
                  <summary><?= $pwIcon('document') ?><span>CLUP Allowed Land Uses Catalog &amp; Plan Reference</span><?= $pwIcon('chevron') ?></summary>
                  <div style="margin-top: 10px;">
                    <span class="pw-small pw-disclosure-heading">CLUP Allowed Land Uses <span class="pw-muted">(multi-select from city plan reference)</span>:</span>
                    <div class="pw-chip-grid pw-clup-chip-grid" style="margin-top: 8px;">
                      <?php foreach ($pwClupUses as $pwUse): ?>
                      <label class="pw-chip pw-clup-chip" title="<?= $pwEscape($pwUse['description'] ?? '') ?>">
                        <input type="checkbox" name="clup_allowed_uses[]" value="<?= $pwEscape($pwUse['label']) ?>">
                        <span><?= $pwEscape($pwUse['label']) ?></span>
                      </label>
                      <?php endforeach; ?>
                    </div>
                  </div>
                </details>

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

          <!-- 6. RISK CONSTRAINTS PANE -->
          <div id="pwCriterionRisks" class="pw-criterion-pane" role="tabpanel" data-evidence-panel="risk_constraints" hidden>
            <div class="pw-spatial-card pw-risk-criterion-card">
              <!-- Card Header -->
              <div class="pw-spatial-header">
                <div class="pw-spatial-heading-group">
                  <h3 class="pw-spatial-title">Risk Constraints</h3>
                  <p class="pw-spatial-subtitle">Step 3 &middot; Multi-Hazard Spatial Screening &middot; Authoritative Agency Datasets</p>
                </div>
                <div class="pw-spatial-header-badges">
                  <span class="pw-badge pw-badge-provisional">Provisional model</span>
                  <span class="pw-badge pw-badge-weight">15% of MCE</span>
                </div>
              </div>

              <!-- Reused Location Context Banner from Step 2 -->
              <div class="pw-reused-banner" data-risk-reused-banner>
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

              <!-- Critical Site Constraint Alert Banner (DOST-PHIVOLCS Active Fault Exclusion Zone) -->
              <div class="pw-risk-critical-banner" data-risk-critical-banner hidden>
                <span class="pw-risk-critical-icon" aria-hidden="true">⚠️</span>
                <div>
                  <strong>CRITICAL SITE CONSTRAINT: ACTIVE FAULT CORRIDOR CONFLICT</strong>
                  <p data-risk-critical-desc>Parcel boundary intersects an authoritative active fault trace or mandated 5-meter exclusion corridor (DOST-PHIVOLCS). Mandatory competent geological hazard review required; structural development is prohibited or strictly conditioned upon structural clearance.</p>
                </div>
              </div>

              <!-- Six Compact Hazard Rows (DENR-MGB, DOST-PHIVOLCS, DOST-PAGASA) -->
              <div class="pw-hazard-grid-6" style="margin-top: 18px;">
                <div class="pw-hazard-grid-header">
                  <div>
                    <h4 style="font-size: 14px; font-weight: 700; color: #11224D; margin: 0 0 2px;">Authoritative Hazard Indicators</h4>
                    <p class="pw-small pw-muted" style="margin: 0;">Evaluated against official government geohazard mapping layers.</p>
                  </div>
                  <span class="pw-badge pw-badge-provisional">6 Mapped Subcriteria</span>
                </div>

                <div class="pw-hazard-rows-container">
                  <!-- 1. Flood Susceptibility (25% - DENR-MGB) -->
                  <div class="pw-hazard-row-compact" data-hazard-row="flood">
                    <div class="pw-hazard-row-meta">
                      <div class="pw-hazard-row-title-wrap">
                        <strong>1. Flood Susceptibility</strong>
                        <span class="pw-hazard-agency-badge">DENR-MGB</span>
                        <span class="pw-hazard-weight-tag">25%</span>
                      </div>
                      <p class="pw-hazard-row-desc" data-hazard-flood-desc>Pluvial and riverine inundation susceptibility during extreme precipitation events.</p>
                    </div>
                    <div class="pw-hazard-row-status-col">
                      <span class="pw-pill pw-pill--gray" data-hazard-flood-pill>Not assessed</span>
                      <span class="pw-hazard-score-pts" data-hazard-flood-score>—</span>
                    </div>
                  </div>

                  <!-- 2. Active Fault / Ground Rupture (25% - DOST-PHIVOLCS) -->
                  <div class="pw-hazard-row-compact" data-hazard-row="faults">
                    <div class="pw-hazard-row-meta">
                      <div class="pw-hazard-row-title-wrap">
                        <strong>2. Active Fault / Ground Rupture</strong>
                        <span class="pw-hazard-agency-badge">DOST-PHIVOLCS</span>
                        <span class="pw-hazard-weight-tag">25%</span>
                      </div>
                      <p class="pw-hazard-row-desc" data-hazard-fault-desc>Active fault trace proximity and mandated 5-meter structural exclusion buffer corridor.</p>
                    </div>
                    <div class="pw-hazard-row-status-col">
                      <span class="pw-pill pw-pill--gray" data-hazard-fault-pill>Not assessed</span>
                      <span class="pw-hazard-score-pts" data-hazard-fault-score>—</span>
                    </div>
                  </div>

                  <!-- 3. Landslide Susceptibility (15% - DENR-MGB) -->
                  <div class="pw-hazard-row-compact" data-hazard-row="landslide">
                    <div class="pw-hazard-row-meta">
                      <div class="pw-hazard-row-title-wrap">
                        <strong>3. Landslide Susceptibility</strong>
                        <span class="pw-hazard-agency-badge">DENR-MGB</span>
                        <span class="pw-hazard-weight-tag">15%</span>
                      </div>
                      <p class="pw-hazard-row-desc" data-hazard-landslide-desc>Slope stability and mass-movement hazard in upland and bluff terrains.</p>
                    </div>
                    <div class="pw-hazard-row-status-col">
                      <span class="pw-pill pw-pill--gray" data-hazard-landslide-pill>Not assessed</span>
                      <span class="pw-hazard-score-pts" data-hazard-landslide-score>—</span>
                    </div>
                  </div>

                  <!-- 4. Storm Surge Exposure (15% - DOST-PAGASA) -->
                  <div class="pw-hazard-row-compact" data-hazard-row="storm_surge">
                    <div class="pw-hazard-row-meta">
                      <div class="pw-hazard-row-title-wrap">
                        <strong>4. Storm Surge Exposure</strong>
                        <span class="pw-hazard-agency-badge">DOST-PAGASA</span>
                        <span class="pw-hazard-weight-tag">15%</span>
                      </div>
                      <p class="pw-hazard-row-desc" data-hazard-storm-surge-desc>Coastal storm surge inundation risk during severe tropical cyclones.</p>
                    </div>
                    <div class="pw-hazard-row-status-col">
                      <span class="pw-pill pw-pill--gray" data-hazard-storm-surge-pill>Not assessed</span>
                      <span class="pw-hazard-score-pts" data-hazard-storm-surge-score>—</span>
                    </div>
                  </div>

                  <!-- 5. Liquefaction Susceptibility (10% - DOST-PHIVOLCS) -->
                  <div class="pw-hazard-row-compact" data-hazard-row="liquefaction">
                    <div class="pw-hazard-row-meta">
                      <div class="pw-hazard-row-title-wrap">
                        <strong>5. Liquefaction Susceptibility</strong>
                        <span class="pw-hazard-agency-badge">DOST-PHIVOLCS</span>
                        <span class="pw-hazard-weight-tag">10%</span>
                      </div>
                      <p class="pw-hazard-row-desc" data-hazard-liquefaction-desc>Soil strength loss under cyclic seismic shaking in saturated alluvial deposits.</p>
                    </div>
                    <div class="pw-hazard-row-status-col">
                      <span class="pw-pill pw-pill--gray" data-hazard-liquefaction-pill>Not assessed</span>
                      <span class="pw-hazard-score-pts" data-hazard-liquefaction-score>—</span>
                    </div>
                  </div>

                  <!-- 6. Tsunami Exposure (10% - DOST-PHIVOLCS) -->
                  <div class="pw-hazard-row-compact" data-hazard-row="tsunami">
                    <div class="pw-hazard-row-meta">
                      <div class="pw-hazard-row-title-wrap">
                        <strong>6. Tsunami Exposure</strong>
                        <span class="pw-hazard-agency-badge">DOST-PHIVOLCS</span>
                        <span class="pw-hazard-weight-tag">10%</span>
                      </div>
                      <p class="pw-hazard-row-desc" data-hazard-tsunami-desc>Seismogenic coastal tsunami run-up and inundation vulnerability zone.</p>
                    </div>
                    <div class="pw-hazard-row-status-col">
                      <span class="pw-pill pw-pill--gray" data-hazard-tsunami-pill>Not assessed</span>
                      <span class="pw-hazard-score-pts" data-hazard-tsunami-score>—</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PRELIMINARY RISK CONSTRAINTS ASSESSMENT CARD -->
              <div class="pw-infra-preview-card pw-risk-result-card" data-risk-preview-card style="margin-top: 18px;">
                <div class="pw-infra-preview-header">
                  <span class="pw-infra-preview-kicker">PRELIMINARY RISK CONSTRAINTS ASSESSMENT</span>
                </div>

                <div class="pw-infra-state-complete">
                  <div class="pw-infra-score-row">
                    <div class="pw-infra-score-main">
                      <span class="pw-infra-score-num"><strong data-risk-total-score>—</strong> <small>/ 100</small></span>
                    </div>
                    <span class="pw-badge pw-badge-calculated" data-risk-status-badge>Pending Screening</span>
                  </div>

                  <!-- Progress Bar -->
                  <div class="pw-infra-progress-track">
                    <div class="pw-infra-progress-bar" data-risk-progress-bar style="width: 0%; background: #DC2626;"></div>
                  </div>

                  <!-- 6 Subcriteria Contribution Breakdown -->
                  <div class="pw-infra-breakdown-list">
                    <div class="pw-infra-breakdown-row">
                      <div class="pw-infra-row-label">
                        <strong>Flood Susceptibility</strong>
                        <small>25% of Risk Constraints (DENR-MGB)</small>
                      </div>
                      <div class="pw-infra-row-pts"><strong data-risk-pts-flood>—</strong> pts</div>
                    </div>
                    <div class="pw-infra-breakdown-row">
                      <div class="pw-infra-row-label">
                        <strong>Active Fault Proximity</strong>
                        <small>25% of Risk Constraints (DOST-PHIVOLCS)</small>
                      </div>
                      <div class="pw-infra-row-pts"><strong data-risk-pts-fault>—</strong> pts</div>
                    </div>
                    <div class="pw-infra-breakdown-row">
                      <div class="pw-infra-row-label">
                        <strong>Landslide Susceptibility</strong>
                        <small>15% of Risk Constraints (DENR-MGB)</small>
                      </div>
                      <div class="pw-infra-row-pts"><strong data-risk-pts-landslide>—</strong> pts</div>
                    </div>
                    <div class="pw-infra-breakdown-row">
                      <div class="pw-infra-row-label">
                        <strong>Storm Surge Exposure</strong>
                        <small>15% of Risk Constraints (DOST-PAGASA)</small>
                      </div>
                      <div class="pw-infra-row-pts"><strong data-risk-pts-surge>—</strong> pts</div>
                    </div>
                    <div class="pw-infra-breakdown-row">
                      <div class="pw-infra-row-label">
                        <strong>Liquefaction Susceptibility</strong>
                        <small>10% of Risk Constraints (DOST-PHIVOLCS)</small>
                      </div>
                      <div class="pw-infra-row-pts"><strong data-risk-pts-liquefaction>—</strong> pts</div>
                    </div>
                    <div class="pw-infra-breakdown-row">
                      <div class="pw-infra-row-label">
                        <strong>Tsunami Exposure</strong>
                        <small>10% of Risk Constraints (DOST-PHIVOLCS)</small>
                      </div>
                      <div class="pw-infra-row-pts"><strong data-risk-pts-tsunami>—</strong> pts</div>
                    </div>
                  </div>

                  <!-- 15% MCE Contribution Row -->
                  <div class="pw-infra-iai-row">
                    <div>
                      <strong>Overall MCE Contribution (15% Weight):</strong>
                      <p class="pw-small pw-muted" style="margin: 2px 0 0;" data-risk-formula-text>Score &times; 15% provisional weight.</p>
                    </div>
                    <div class="pw-infra-iai-pts">
                      <strong data-risk-iai-pts>—</strong> <span>pts</span>
                    </div>
                  </div>

                  <!-- High Hazard Warnings Container -->
                  <div class="pw-risk-warnings-box" data-risk-warnings-box hidden style="margin-top: 12px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px;">
                    <div style="font-size: 11.5px; font-weight: 700; color: #9f1239; margin-bottom: 4px;">Identified Elevated Hazards:</div>
                    <ul class="pw-risk-warnings-list" data-risk-warnings-list style="margin: 0; padding-left: 18px; font-size: 11px; color: #be123c;"></ul>
                  </div>
                </div>
              </div>

              <!-- Authoritative Hazard Evidence Reference Block (Cleaned up, non-duplicated) -->
              <div class="pw-supporting-evidence-box" style="margin-top: 18px;">
                <div class="pw-evidence-box-header">
                  <h5>Hazard screening &amp; clearance reference</h5>
                  <span class="pw-info-icon" title="Your entry records official study or HazardHunterPH verification details."><?= $pwIcon('info') ?></span>
                </div>
                <div class="pw-source-fields-grid">
                  <label class="pw-field">Issuing agency / official source
                    <input name="hazard_evidence_source" maxlength="250" placeholder="e.g. DOST-PHIVOLCS, DENR-MGB Region 1, CDRRMO">
                  </label>
                  <label class="pw-field">Screening / assessment date
                    <input name="hazard_evidence_date" type="date">
                  </label>
                  <label class="pw-field pw-full">Report reference / HazardHunterPH tracking ID
                    <input name="hazard_evidence_reference" maxlength="500" placeholder="e.g. HazardHunterPH Reference #HH-2026-..., MGB Geohazard Report #">
                  </label>
                </div>
              </div>

              <!-- Preserved General Site Observations & Notes -->
              <div class="pw-supporting-evidence-box" style="margin-top: 16px;">
                <h5>General site observations &amp; notes <span class="pw-muted">(optional)</span></h5>
                <label class="pw-field pw-full" style="margin-top: 8px;">Notes for the reviewing department
                  <textarea name="readiness_notes" rows="3" maxlength="10000" placeholder="Add observed site conditions, physical features, and note anything that needs verification by city staff."></textarea>
                </label>
              </div>

              <!-- Expandable Technical Information Disclosure for Administrators -->
              <details class="pw-disclosure pw-risk-technical-details" style="margin-top: 18px;">
                <summary style="cursor: pointer; font-size: 12px; font-weight: 600; color: #1E293B; display: flex; align-items: center; gap: 6px;">
                  <?= $pwIcon('info') ?>
                  <span>Technical details &amp; screening methodology</span>
                  <?= $pwIcon('chevron') ?>
                </summary>
                <div class="pw-risk-tech-content" style="padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 8px; font-size: 11px; color: #475569; line-height: 1.6;">
                  <table class="pw-risk-tech-table" style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5px;">
                    <thead>
                      <tr style="border-bottom: 1px solid #cbd5e1; text-align: left; color: #1e293b;">
                        <th style="padding: 4px 6px;">Subcriterion</th>
                        <th style="padding: 4px 6px;">Agency</th>
                        <th style="padding: 4px 6px;">Weight</th>
                        <th style="padding: 4px 6px;">Spatial Standard / Buffer</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 4px 6px; font-weight: 600;">Flood Susceptibility</td>
                        <td style="padding: 4px 6px;">DENR-MGB</td>
                        <td style="padding: 4px 6px;">25%</td>
                        <td style="padding: 4px 6px;">1:10,000 Geohazard Inundation Polygon Overlap</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 4px 6px; font-weight: 600;">Active Fault / Ground Rupture</td>
                        <td style="padding: 4px 6px;">DOST-PHIVOLCS</td>
                        <td style="padding: 4px 6px;">25%</td>
                        <td style="padding: 4px 6px;">Mandated 5m Exclusion Buffer Corridor; &le;5km Proximity Gradient</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 4px 6px; font-weight: 600;">Landslide Susceptibility</td>
                        <td style="padding: 4px 6px;">DENR-MGB</td>
                        <td style="padding: 4px 6px;">15%</td>
                        <td style="padding: 4px 6px;">Rain-Induced Landslide Susceptibility Polygon Overlap</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 4px 6px; font-weight: 600;">Storm Surge Exposure</td>
                        <td style="padding: 4px 6px;">DOST-PAGASA</td>
                        <td style="padding: 4px 6px;">15%</td>
                        <td style="padding: 4px 6px;">Coastal Tropical Cyclone Inundation Advisory Zone</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 4px 6px; font-weight: 600;">Liquefaction Susceptibility</td>
                        <td style="padding: 4px 6px;">DOST-PHIVOLCS</td>
                        <td style="padding: 4px 6px;">10%</td>
                        <td style="padding: 4px 6px;">Saturated Alluvial Liquefaction Susceptibility Zone</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 4px 6px; font-weight: 600;">Tsunami Exposure</td>
                        <td style="padding: 4px 6px;">DOST-PHIVOLCS</td>
                        <td style="padding: 4px 6px;">10%</td>
                        <td style="padding: 4px 6px;">Seismogenic Coastal Inundation Run-up Boundary</td>
                      </tr>
                    </tbody>
                  </table>
                  <p style="margin: 0 0 6px;"><strong>Provisional Scoring Scale:</strong> Confirmed no mapped exposure = 100 &middot; Low = 85 &middot; Moderate = 60 &middot; High = 25 &middot; Very High / Critical = 0.</p>
                  <p style="margin: 0; color: #b45309;"><strong>Disclaimer &amp; Non-Clearance Standard:</strong> Spatial screening does not replace an official DOST-PHIVOLCS HazardHunterPH assessment or MGB engineering geological study. Absence of mapped data or unassessed layers never constitutes verified safety.</p>
                </div>
              </details>
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
        <div class="pw-section-intro"><h3>Ready when you are</h3><p>Check the essentials below, then send the listing for city review.</p></div>
        <div class="pw-card pw-submission-summary" data-review-summary></div>

        <p class="pw-review-note">City staff review your listing before publication. You can submit while supporting records and assessment scores are pending.</p>
        <details class="pw-disclosure pw-assessment-details" data-assessment-details><summary><?= $pwIcon('chart') ?><span>Supporting records &amp; city assessment</span><?= $pwIcon('chevron') ?></summary>
        <!-- Assessment details -->
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
            <p class="pw-small pw-muted">Official MCE/IAI scores require complete verified evidence across all six criteria. Missing data is never defaulted.</p>
          </div>
        </div>

        <!-- Assessment Checklist Disclosure -->
        <details class="pw-card pw-readiness-card pw-readiness-disclosure" style="margin-top: 16px;">
          <summary><span>Assessment criteria checklist</span><?= $pwIcon('chevron') ?></summary>
          <p class="pw-small pw-muted">See which evidence is ready for city assessment across the six criteria. Click any row to jump to that criterion.</p>
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
        <div data-review-panel="assessment"><article class="pw-card" data-automatic-assessment><div class="pw-review-heading"><div class="pw-card-heading"><h3>City assessment &amp; IAI scores</h3><p>MCE (Multi-Criteria Evaluation) and IAI (Investment Alignment Index) are calculated from verified city evidence.</p></div><span class="pw-badge"><?= $pwIcon('document') ?> Official evidence</span></div><div class="pw-live-scores pw-live-scores-top" data-live-scores><div><span>MCE Score (Physical Suitability)</span><strong data-total-mce>—</strong><small>/ 100</small></div><div><span>IAI Score (Investment Alignment)</span><strong data-total-iai>—</strong><small>/ 100</small></div><p data-computed-summary>Scores remain pending until all required evidence is available.</p></div><p class="pw-notice pw-notice-amber" data-legacy-assessment hidden>This listing has an earlier manual assessment. Saving calculates a new automatic assessment and retains the earlier result in its history.</p><div class="pw-assessment-status"><p class="pw-small pw-muted" data-assessment-status role="status">Add a property location to check verified source data.</p><button type="button" class="pw-button pw-button-light pw-button-small" data-recalculate-assessment><?= $pwIcon('reset') ?> Recalculate</button></div><div class="pw-assessment-criteria"><?php foreach ($pwCriteria as $pwKey => $pwCriterion): ?><article class="pw-criterion" data-assessment-criterion="<?= $pwKey ?>"><div class="pw-criterion-heading"><h4><?= $pwEscape($pwCriterion) ?></h4><span><?= \App\Support\PropertyAssessment::WEIGHTS[$pwKey] ?>% of MCE</span><strong data-score-value>Awaiting data</strong></div><div class="pw-criterion-bar" role="progressbar" aria-label="<?= $pwEscape($pwCriterion) ?>" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Awaiting source data"><span></span></div><details class="pw-criterion-evidence"><summary>Evidence &amp; calculation <?= $pwIcon('chevron') ?></summary><p data-score-justification>Add the property location to check available source evidence.</p><p class="pw-small pw-muted" data-score-rule hidden></p><p class="pw-small pw-muted" data-score-evidence hidden></p></details></article><?php endforeach; ?></div><details class="pw-disclosure" data-spatial-context hidden><summary><?= $pwIcon('pin') ?><span>Location evidence</span><?= $pwIcon('chevron') ?></summary><dl></dl></details><details class="pw-disclosure"><summary><?= $pwIcon('document') ?><span>How scores are calculated</span><?= $pwIcon('chevron') ?></summary><p class="pw-small pw-muted" data-assessment-method>Scores depend on approved source conversion rules and the six displayed criterion weights.</p></details></article></div>
        <div data-review-panel="investor" hidden><article class="pw-card pw-investor-card"><div class="pw-review-heading"><div class="pw-card-heading"><h3>Which business fits this property?</h3><p>Compare the modeled fit and see the evidence behind each result.</p></div><div class="pw-review-property" data-review-property><strong>Your new property</strong><span>Business matches await approved scoring profiles</span></div></div><div class="pw-business-matches" data-business-matches><div class="pw-match-placeholder"><?= $pwIcon('coffee') ?><div><strong>Café &amp; bakery</strong><span>Awaiting approved profile</span></div></div><div class="pw-match-placeholder"><?= $pwIcon('store') ?><div><strong>Convenience retail</strong><span>Awaiting approved profile</span></div></div><div class="pw-match-placeholder"><?= $pwIcon('office') ?><div><strong>Office</strong><span>Awaiting approved profile</span></div></div></div><div class="pw-review-columns"><section class="pw-review-breakdown" data-match-breakdown><div class="pw-label-row"><h4>Business fit: score breakdown</h4><span class="pw-small pw-muted">Six weighted criteria</span></div><p class="pw-small pw-muted">Business-specific scores appear once approved rules and the required evidence are available.</p><div class="pw-score-table"><div class="pw-score-table-head"><span>Criteria</span><span>Rating</span><span>Weight</span></div><?php foreach ($pwCriteria as $pwKey => $pwCriterion): ?><div class="pw-score-table-row"><span><?= $pwEscape($pwCriterion) ?></span><div class="pw-score-placeholder"><span></span><strong>—</strong></div><span><?= \App\Support\PropertyAssessment::WEIGHTS[$pwKey] ?>%</span></div><?php endforeach; ?></div><div class="pw-weighted-total"><div><strong>Weighted business score</strong><span>Pending approved business-specific scoring</span></div><strong>— <small>/ 100</small></strong></div></section><section class="pw-review-reasons" data-match-reasons><h4>What is needed for a match</h4><ol class="pw-reason-list"><li><span>1</span><div><strong>Confirm the assessment evidence.</strong><p>Check road access, utilities, valuation, land use, and available hazard findings.</p></div></li><li><span>2</span><div><strong>Apply an approved business profile.</strong><p>Eligibility and scoring rules must reflect the selected business type.</p></div></li></ol><h4 class="pw-concerns-heading"><?= $pwIcon('warning') ?> What still needs checking</h4><div class="pw-notice pw-notice-amber"><div><strong>Business ranking is not available yet</strong><p>The six criteria and their displayed weights are retained. A top-three ranking requires approved business-specific scoring rules.</p></div></div><div class="pw-notice pw-notice-neutral"><?= $pwIcon('document') ?><div><strong>Validate demand and permitted use</strong><p>Review customer demand and land-use compatibility before an investment decision.</p></div></div></section></div><div class="pw-review-footnote"><?= $pwIcon('info') ?> Scores compare suitability under the selected method; they do not predict business success.</div></article></div>
        </details>
      </section>
    </div>
    <footer class="pw-footer"><span class="pw-progress" data-editor-progress>Step 1 of 4</span><div class="pw-footer-actions"><button type="button" class="pw-text-button pw-skip" data-skip-enrichment hidden>Review listing</button><button type="button" class="pw-button pw-button-light" data-save-draft title="Save draft on this device"><?= $pwIcon('save') ?> Save draft</button><button type="button" class="pw-button pw-button-light" data-editor-back disabled>Back</button><button type="button" class="pw-button pw-button-primary" data-editor-next><span data-editor-next-label>Continue to location</span><?= $pwIcon('arrow') ?></button><button type="submit" class="pw-button pw-button-primary" hidden><span>Submit listing</span><?= $pwIcon('arrow') ?></button></div></footer>
    <script id="pwZoningEngineData" type="application/json">
    <?= json_encode([
        'districts' => \App\Support\ZoningRulesEngine::getOfficialDistricts(),
        'catalog' => \App\Support\ZoningRulesEngine::getHierarchicalUseCatalog(),
        'rules' => \App\Support\ZoningRulesEngine::getAllRules(),
        'version' => \App\Support\ZoningRulesEngine::VERSION,
        'weight' => \App\Support\ZoningRulesEngine::ZONING_WEIGHT,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>
    </script>
  </form>
</dialog>
<?php unset($pwEscape, $pwIcon, $pwCriteria, $pwReadiness); ?>
