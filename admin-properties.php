<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_require_role('admin', sfc_path('/admin-login.php'));
$context = sfc_web_context();
sfc_render_head('Admin Listings | LOCUS-SF', $context, ['page' => 'admin-properties', 'role' => 'admin']);
sfc_render_header($context, 'admin-properties');
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/admin-property-editor.css<?= htmlspecialchars(sfc_asset_version('css/admin-property-editor.css'), ENT_QUOTES, 'UTF-8') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/admin-listings.css<?= htmlspecialchars(sfc_asset_version('css/admin-listings.css'), ENT_QUOTES, 'UTF-8') ?>">

<main class="page-shell admin-listings-page" id="adminMain" tabindex="-1">
  <template id="adminBlueButtonArt"><?= sfc_blue_button_art($context) ?></template>

  <!-- Executive Cinematic Civic Hero Deck -->
  <section class="site-shell admin-hero-deck" aria-label="City Spatial Asset Registry">
    <div class="admin-hero-grid">
      <!-- Left Column: Civic Intelligence & Telemetry -->
      <div class="admin-hero-content">
        <h1 class="admin-hero-title">
          Land Parcels<br>
          <span class="admin-hero-title-gradient">Asset Registry</span>
        </h1>
        <p class="admin-hero-description">
          Manage listings, audit due diligence documents, and keep spatial property records synchronized with San Fernando's Comprehensive Land Use Plan (CLUP 2025&ndash;2035).
        </p>

        <!-- Precision Telemetry Cluster -->
        <div class="admin-telemetry-cluster" role="region" aria-label="Registry Telemetry">
          <div class="adm-telemetry-chip adm-telemetry-chip-parcels">
            <span class="adm-chip-icon" aria-hidden="true"><?= sfc_domain_icon('propertyinfo', 'xs') ?></span>
            <div class="adm-chip-body">
              <span class="adm-chip-kicker">Cataloged Parcels</span>
              <strong class="adm-chip-val text-emerald tabular-nums" id="heroTotalParcels">10 Live Sites</strong>
            </div>
          </div>
          <div class="adm-telemetry-chip adm-telemetry-chip-zoning">
            <span class="adm-chip-icon" aria-hidden="true"><?= sfc_domain_icon('clupzoning', 'xs') ?></span>
            <div class="adm-chip-body">
              <span class="adm-chip-kicker">Zoning Alignment</span>
              <strong class="adm-chip-val text-amber tabular-nums">CLUP 2025&ndash;2035</strong>
            </div>
          </div>
          <div class="adm-telemetry-chip adm-telemetry-chip-review">
            <span class="adm-chip-icon" aria-hidden="true"><?= sfc_domain_icon('sitereadiness', 'xs') ?></span>
            <div class="adm-chip-body">
              <span class="adm-chip-kicker">Due Diligence</span>
              <strong class="adm-chip-val text-sky tabular-nums" id="heroVerifiedCount">Verified Pipeline</strong>
            </div>
          </div>
        </div>

        <!-- Action Commands featuring the signature 3D locus-blue-button! -->
        <div class="admin-hero-actions no-print">
          <button type="button" class="locus-blue-button" id="adminAddProperty">
            <?= sfc_blue_button_art($context) ?>
            <svg class="adm-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" width="18" height="18">
              <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
            </svg>
            <span>Add Property</span>
            <span class="adm-btn-arrow" aria-hidden="true">&rarr;</span>
          </button>
          <a href="<?= htmlspecialchars(sfc_path('/property-explorer.php?admin_mode=add_site'), ENT_QUOTES, 'UTF-8') ?>" class="adm-btn adm-btn-glass" id="btnAdminAddFromMap">
            <?= sfc_domain_icon('accessibility', 'xs') ?>
            <span>Add Site from Map</span>
          </a>
          <a href="<?= htmlspecialchars(sfc_path('/property-ranking.php'), ENT_QUOTES, 'UTF-8') ?>" class="adm-btn adm-btn-glass" id="btnAdminViewRankings">
            <?= sfc_domain_icon('iai', 'xs') ?>
            <span>View Rankings</span>
            <span class="adm-btn-arrow" aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>

    </div>
  </section>

  <section class="site-shell admin-properties-root-grid" id="adminPropertiesRoot">
    <div class="loading-panel">Loading admin listings...</div>
  </section>
</main>

<!-- Add / Edit Property: Executive 4-Stage Listing Suite with Live Card Preview -->
<div class="modal-shell" id="propertyCrudModal" hidden>
  <div class="modal-card property-crud-modal sfc-admin-property-modal" role="dialog" aria-modal="true" aria-labelledby="crudModalTitle" aria-describedby="crudModalSubtitle" tabindex="-1">
    
    <!-- Top Modal Header: Title, Architectural Stepper, Close Button -->
    <div class="crud-header sfc-editor-header">
      <div class="sfc-editor-header-brand">
        <div class="sfc-editor-kicker">
          <span class="sfc-kicker-dot"></span> City Asset Registry
        </div>
        <h3 id="crudModalTitle">Add Property</h3>
        <p id="crudModalSubtitle" style="display:none;">Complete asset parameters to publish.</p>
      </div>

      <!-- Architectural Stepper Navigation -->
      <nav class="sfc-wizard-tabs" aria-label="Listing editor stages" id="wizardTabsNav">
        <button type="button" class="sfc-wizard-tab is-active" data-step-target="0" onclick="crudGoToStep(0)">
          <span class="sfc-tab-badge">01</span>
          <?= sfc_domain_icon('propertyinfo', 'xs') ?>
          <span class="sfc-tab-title">Identity</span>
        </button>
        <span class="sfc-wizard-arrow" aria-hidden="true">&rsaquo;</span>
        <button type="button" class="sfc-wizard-tab" data-step-target="1" onclick="crudGoToStep(1)">
          <span class="sfc-tab-badge">02</span>
          <?= sfc_domain_icon('accessibility', 'xs') ?>
          <span class="sfc-tab-title">Location</span>
        </button>
        <span class="sfc-wizard-arrow" aria-hidden="true">&rsaquo;</span>
        <button type="button" class="sfc-wizard-tab" data-step-target="2" onclick="crudGoToStep(2)">
          <span class="sfc-tab-badge">03</span>
          <?= sfc_domain_icon('infrastructure', 'xs') ?>
          <span class="sfc-tab-title">Media</span>
        </button>
        <span class="sfc-wizard-arrow" aria-hidden="true">&rsaquo;</span>
        <button type="button" class="sfc-wizard-tab" data-step-target="3" onclick="crudGoToStep(3)">
          <span class="sfc-tab-badge">04</span>
          <?= sfc_domain_icon('iai', 'xs') ?>
          <span class="sfc-tab-title">Review</span>
        </button>
      </nav>

      <button type="button" class="modal-close sfc-editor-close" data-modal-close="propertyCrudModal" aria-label="Close form" title="Close (Esc)">&times;</button>
    </div>

    <!-- 2px Progress line -->
    <div class="sfc-wizard-progress-track">
      <div class="sfc-wizard-progress-bar" id="wizardProgressBar" style="width: 25%;"></div>
    </div>

    <!-- Split-Pane Workspace: Form Engine + Live Card Preview -->
    <div class="sfc-editor-workspace">
      
      <!-- Left Column: Progressive Form -->
      <form id="propertyCrudForm" class="sfc-editor-form-col" novalidate>
        <input type="hidden" id="crudPropertyId">

        <div id="crud-panels-wrap" class="sfc-panels-viewport">
          
          <!-- STEP 1: IDENTITY -->
          <section class="crud-section sfc-step-panel is-active" id="crud-panel-0" aria-labelledby="crud-section-0" data-step="0">
            <div class="sfc-step-header">
              <span class="sfc-step-pill">Stage 01</span>
              <h4 id="crud-section-0">Asset Profile</h4>
            </div>

            <div class="crud-section-fields sfc-form-fields">
              <div class="sfc-input-card">
                <label for="crudPropertyName" class="sfc-field-label">
                  Property Name <span class="crud-required">*</span>
                </label>
                <input class="input-shell sfc-text-input" id="crudPropertyName" placeholder="e.g. Fabro Building Prime Lot" required oninput="crudUpdateLivePreview()" />
              </div>

              <div class="sfc-input-card">
                <div class="sfc-field-label" id="crudPropertyTypeLabel">
                  Development Sector <span class="crud-required">*</span>
                </div>
                <div class="crud-options sfc-sector-cards" role="group" aria-labelledby="crudPropertyTypeLabel" id="seg-crud-type">
                  <button type="button" onclick="crudSeg('seg-crud-type','crudPropertyType',this,'commercial')" class="crud-seg-btn sfc-sector-card is-selected" data-val="commercial" aria-pressed="true">
                    <span class="sfc-sector-icon">ðŸ¢</span>
                    <span class="sfc-sector-title">Commercial</span>
                  </button>
                  <button type="button" onclick="crudSeg('seg-crud-type','crudPropertyType',this,'logistics')" class="crud-seg-btn sfc-sector-card" data-val="logistics">
                    <span class="sfc-sector-icon">ðŸšš</span>
                    <span class="sfc-sector-title">Logistics</span>
                  </button>
                  <button type="button" onclick="crudSeg('seg-crud-type','crudPropertyType',this,'hotel')" class="crud-seg-btn sfc-sector-card" data-val="hotel">
                    <span class="sfc-sector-icon">ðŸ–ï¸</span>
                    <span class="sfc-sector-title">Hospitality</span>
                  </button>
                  <button type="button" onclick="crudSeg('seg-crud-type','crudPropertyType',this,'bpo')" class="crud-seg-btn sfc-sector-card" data-val="bpo">
                    <span class="sfc-sector-icon">ðŸ’¼</span>
                    <span class="sfc-sector-title">Corporate</span>
                  </button>
                  <button type="button" onclick="crudSeg('seg-crud-type','crudPropertyType',this,'manufacturing')" class="crud-seg-btn sfc-sector-card" data-val="manufacturing">
                    <span class="sfc-sector-icon">ðŸ­</span>
                    <span class="sfc-sector-title">Industrial</span>
                  </button>
                </div>
                <select class="input-shell" id="crudPropertyType" aria-hidden="true" tabindex="-1">
                  <option value="commercial">Commercial</option>
                  <option value="logistics">Logistics</option>
                  <option value="hotel">Resort / Tourism</option>
                  <option value="bpo">Office / BPO</option>
                  <option value="manufacturing">Manufacturing</option>
                </select>
              </div>

              <div class="sfc-input-card">
                <div class="sfc-label-row">
                  <label for="crudDescription" class="sfc-field-label">Investment Summary <span class="crud-required">*</span></label>
                  <span class="sfc-char-count" id="descWordCount">0 words</span>
                </div>
                <textarea class="input-shell input-textarea sfc-textarea" id="crudDescription" required rows="3" placeholder="Key strategic attributes, accessibility, and utility readiness..." oninput="crudUpdateWordCount(this.value); crudUpdateLivePreview();"></textarea>
              </div>

              <div class="crud-field-grid sfc-dual-grid">
                <div class="sfc-input-card">
                  <label for="crudTags" class="sfc-field-label">Key Highlights</label>
                  <input class="input-shell sfc-text-input" id="crudTags" placeholder="Investor Ready, Strategic Location" oninput="crudUpdateLivePreview()" />
                  <div class="sfc-quick-chips" aria-label="Suggested tags">
                    <button type="button" class="sfc-chip" onclick="crudAddTag('Investor Ready')">+ Investor Ready</button>
                    <button type="button" class="sfc-chip" onclick="crudAddTag('Titled')">+ Titled</button>
                    <button type="button" class="sfc-chip" onclick="crudAddTag('Port Access')">+ Port Access</button>
                    <button type="button" class="sfc-chip" onclick="crudAddTag('Corner Lot')">+ Corner Lot</button>
                  </div>
                </div>
                <div class="sfc-input-card">
                  <label for="crudFacilities" class="sfc-field-label">Infrastructure</label>
                  <input class="input-shell sfc-text-input" id="crudFacilities" placeholder="Highway Access, Utilities" oninput="crudUpdateLivePreview()" />
                  <div class="sfc-quick-chips" aria-label="Suggested facilities">
                    <button type="button" class="sfc-chip" onclick="crudAddFacility('3-Phase Power')">+ 3-Phase Power</button>
                    <button type="button" class="sfc-chip" onclick="crudAddFacility('Water Supply')">+ Water Supply</button>
                    <button type="button" class="sfc-chip" onclick="crudAddFacility('Fiber Line')">+ Fiber Line</button>
                    <button type="button" class="sfc-chip" onclick="crudAddFacility('Heavy Cargo Road')">+ Heavy Cargo</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- STEP 2: LOCATION & PRICING -->
          <section class="crud-section sfc-step-panel" id="crud-panel-1" aria-labelledby="crud-section-1" data-step="1">
            <div class="sfc-step-header">
              <span class="sfc-step-pill">Stage 02</span>
              <h4 id="crud-section-1">Location &amp; Valuation</h4>
            </div>

            <div class="crud-section-fields sfc-form-fields">
              <div class="sfc-input-card">
                <div class="sfc-field-label" id="crudCorridorLabel">
                  Strategic Corridor
                </div>
                <div class="crud-options sfc-corridor-cards" role="group" aria-labelledby="crudCorridorLabel" id="seg-crud-corridor">
                  <button type="button" onclick="crudSeg('seg-crud-corridor','crudCorridor',this,'highway')" class="crud-seg-btn sfc-corridor-btn is-selected" data-val="highway" aria-pressed="true">
                    <span class="sfc-corridor-icon">ðŸ›£ï¸</span>
                    <span>Highway Corridor</span>
                  </button>
                  <button type="button" onclick="crudSeg('seg-crud-corridor','crudCorridor',this,'downtown')" class="crud-seg-btn sfc-corridor-btn" data-val="downtown">
                    <span class="sfc-corridor-icon">ðŸ›ï¸</span>
                    <span>Downtown Core</span>
                  </button>
                  <button type="button" onclick="crudSeg('seg-crud-corridor','crudCorridor',this,'coastal')" class="crud-seg-btn sfc-corridor-btn" data-val="coastal">
                    <span class="sfc-corridor-icon">âš“</span>
                    <span>Coastal &amp; Port</span>
                  </button>
                </div>
                <select class="input-shell" id="crudCorridor" aria-hidden="true" tabindex="-1">
                  <option value="highway">Highway</option>
                  <option value="downtown">Downtown</option>
                  <option value="coastal">Coastal</option>
                </select>
              </div>

              <div class="crud-field-grid sfc-dual-grid">
                <div class="sfc-input-card">
                  <label for="crudCity" class="sfc-field-label">City <span class="crud-required">*</span></label>
                  <input class="input-shell sfc-text-input" id="crudCity" value="San Fernando, La Union" required oninput="crudUpdateLivePreview()" />
                </div>
                <div class="sfc-input-card">
                  <label for="crudBarangay" class="sfc-field-label">Barangay</label>
                  <input class="input-shell sfc-text-input" id="crudBarangay" placeholder="e.g. Catbangen, Poro, Sevilla..." oninput="crudUpdateLivePreview()" />
                  <div class="sfc-quick-chips sfc-brgy-chips" aria-label="Suggested barangays">
                    <button type="button" class="sfc-chip" onclick="crudSetBarangay('Catbangen')">Catbangen</button>
                    <button type="button" class="sfc-chip" onclick="crudSetBarangay('Poro Point')">Poro Point</button>
                    <button type="button" class="sfc-chip" onclick="crudSetBarangay('Sevilla')">Sevilla</button>
                    <button type="button" class="sfc-chip" onclick="crudSetBarangay('Carlatan')">Carlatan</button>
                    <button type="button" class="sfc-chip" onclick="crudSetBarangay('Madayegdeg')">Madayegdeg</button>
                    <button type="button" class="sfc-chip" onclick="crudSetBarangay('San Agustin')">San Agustin</button>
                    <button type="button" class="sfc-chip" onclick="crudSetBarangay('Lingsat')">Lingsat</button>
                  </div>
                </div>
              </div>

              <!-- Asking Price Card -->
              <div class="sfc-input-card sfc-price-card">
                <div class="sfc-label-row">
                  <label for="crudPrice" class="sfc-field-label">Asking Price (PHP) <span class="crud-required">*</span></label>
                  <span id="crud-price-badge" class="sfc-price-pill"></span>
                </div>
                <div class="crud-price-input sfc-price-input-row">
                  <span class="sfc-currency-prefix">&#x20B1;</span>
                  <input type="number" class="input-shell sfc-text-input sfc-price-input" id="crudPrice" placeholder="e.g. 75000000" required oninput="crudFormatPrice(this.value); crudUpdateLivePreview();" />
                </div>
                <div class="sfc-quick-chips sfc-price-presets">
                  <button type="button" class="sfc-chip" onclick="crudSetPrice(10000000)">â‚±10M</button>
                  <button type="button" class="sfc-chip" onclick="crudSetPrice(25000000)">â‚±25M</button>
                  <button type="button" class="sfc-chip" onclick="crudSetPrice(50000000)">â‚±50M</button>
                  <button type="button" class="sfc-chip" onclick="crudSetPrice(75000000)">â‚±75M</button>
                  <button type="button" class="sfc-chip" onclick="crudSetPrice(120000000)">â‚±120M</button>
                </div>
              </div>

              <!-- Land Area Card -->
              <div class="sfc-input-card">
                <div class="sfc-field-label">Land Parcel Scale <span class="crud-required">*</span></div>
                <div class="crud-field-grid sfc-area-grid">
                  <div>
                    <label for="crudLandArea" class="sfc-sublabel">Hectares (ha)</label>
                    <div class="sfc-unit-input">
                      <input type="number" step="0.0001" min="0.0001" class="input-shell sfc-text-input" id="crudLandArea" inputmode="decimal" required oninput="crudSyncArea(this.value,'ha'); crudUpdateLivePreview();" placeholder="e.g. 8.5" />
                      <span class="sfc-unit-tag">ha</span>
                    </div>
                  </div>
                  <div>
                    <label for="crudLandAreaSqm" class="sfc-sublabel">Square meters (sqm)</label>
                    <div class="sfc-unit-input">
                      <input type="number" step="1" class="input-shell sfc-text-input" id="crudLandAreaSqm" oninput="crudSyncArea(this.value,'sqm'); crudUpdateLivePreview();" placeholder="e.g. 85000" />
                      <span class="sfc-unit-tag">sqm</span>
                    </div>
                  </div>
                </div>
                <div class="sfc-area-calc-pill">
                  <span class="sfc-calc-icon">ðŸ“</span>
                  <span id="crudLandAreaHint">8.5 ha = 85,000 sqm</span>
                </div>
                <input type="hidden" id="crudLandAreaUnit" value="ha" />
                <input type="hidden" id="landAreaInput" value="" />
              </div>
            </div>
          </section>

          <!-- STEP 3: MEDIA & DOCUMENTS -->
          <section class="crud-section sfc-step-panel" id="crud-panel-2" aria-labelledby="crud-section-2" data-step="2">
            <div class="sfc-step-header">
              <span class="sfc-step-pill">Stage 03</span>
              <h4 id="crud-section-2">Media &amp; Documents</h4>
            </div>

            <div class="crud-section-fields sfc-form-fields">
              <div class="sfc-input-card">
                <div class="sfc-field-label">Cover Photograph</div>
                
                <div class="sfc-media-upload-deck">
                  <div class="sfc-upload-dropzone" id="imageDropzone">
                    <input type="file" class="sfc-file-hidden" id="crudImage" accept="image/*" onchange="crudHandleFileSelect(this)" />
                    <div class="sfc-dropzone-content">
                      <div class="sfc-dropzone-icon">ðŸ“·</div>
                      <strong id="dropzoneLabel">Upload Photo</strong>
                      <p>Drag and drop or <span>Browse files</span></p>
                      <small>PNG, JPG, WebP up to 10MB</small>
                    </div>
                  </div>

                  <div class="sfc-fallback-path-row">
                    <input class="input-shell sfc-text-input" id="crudImagePath" value="assets/images/Property10.png" oninput="crudUpdateLivePreview();" placeholder="Asset image path" />
                  </div>

                  <!-- Quick City Library Presets -->
                  <div class="sfc-preset-images">
                    <span class="sfc-sublabel">City Presets:</span>
                    <div class="sfc-preset-thumbnails" id="presetThumbnails">
                      <button type="button" class="sfc-preset-thumb is-selected" onclick="crudSelectPresetImage('assets/images/Property10.png', this)" title="Catbangen Commercial">
                        <img src="assets/images/Property10.png" alt="Property 10" loading="lazy" />
                      </button>
                      <button type="button" class="sfc-preset-thumb" onclick="crudSelectPresetImage('assets/images/FabroBldg.png', this)" title="Fabro Building">
                        <img src="assets/images/FabroBldg.png" alt="Fabro Building" loading="lazy" />
                      </button>
                      <button type="button" class="sfc-preset-thumb" onclick="crudSelectPresetImage('assets/images/Property1.png', this)" title="Poro Industrial Site">
                        <img src="assets/images/Property1.png" alt="Property 1" loading="lazy" />
                      </button>
                      <button type="button" class="sfc-preset-thumb" onclick="crudSelectPresetImage('assets/images/Property3.png', this)" title="Carlatan Warehouse">
                        <img src="assets/images/Property3.png" alt="Property 3" loading="lazy" />
                      </button>
                      <button type="button" class="sfc-preset-thumb" onclick="crudSelectPresetImage('assets/images/Property4.png', this)" title="Highway Frontage">
                        <img src="assets/images/Property4.png" alt="Property 4" loading="lazy" />
                      </button>
                      <button type="button" class="sfc-preset-thumb" onclick="crudSelectPresetImage('assets/images/LaFinns.png', this)" title="Sevilla Resort Site">
                        <img src="assets/images/LaFinns.png" alt="La Finns" loading="lazy" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Interactive Document Readiness Matrix -->
              <div class="sfc-input-card sfc-doc-checklist-card">
                <div class="sfc-label-row">
                  <div class="sfc-field-label" style="margin-bottom:0;">Due Diligence Matrix</div>
                  <div class="sfc-doc-quick-actions">
                    <button type="button" class="sfc-mini-btn" onclick="crudMarkAllDocs('reviewed')">&#10003; Mark All Reviewed</button>
                    <button type="button" class="sfc-mini-btn sfc-mini-btn-muted" onclick="crudMarkAllDocs('missing')">Reset</button>
                  </div>
                </div>

                <div class="sfc-doc-matrix-grid">
                  <?php 
                  $docItems = [
                    ['crudDocTitleCopy',       'Title Copy',         'ðŸ“œ'],
                    ['crudDocTaxDeclaration',  'Tax Declaration',    'ðŸ“‘'],
                    ['crudDocSurveyPlan',      'Survey Plan',        'ðŸ“'],
                    ['crudDocZoningClearance', 'Zoning Conformance', 'ðŸ›ï¸'],
                    ['crudDocSitePhotos',      'Site Photos',        'ðŸ“·'],
                    ['crudDocHazardReport',    'Hazard Assessment',  'âš ï¸'],
                  ];
                  foreach ($docItems as [$id, $label, $icon]): ?>
                  <div class="sfc-doc-row" data-doc-id="<?= $id ?>">
                    <div class="sfc-doc-meta">
                      <span class="sfc-doc-icon"><?= $icon ?></span>
                      <span class="sfc-doc-label"><?= $label ?></span>
                    </div>
                    <div class="sfc-doc-pills">
                      <button type="button" class="sfc-doc-pill is-active" data-val="missing" onclick="crudSetDocStatus('<?= $id ?>', 'missing')">Missing</button>
                      <button type="button" class="sfc-doc-pill" data-val="requested" onclick="crudSetDocStatus('<?= $id ?>', 'requested')">Requested</button>
                      <button type="button" class="sfc-doc-pill" data-val="submitted" onclick="crudSetDocStatus('<?= $id ?>', 'submitted')">Submitted</button>
                      <button type="button" class="sfc-doc-pill" data-val="reviewed" onclick="crudSetDocStatus('<?= $id ?>', 'reviewed')">Reviewed</button>
                    </div>
                    <select class="input-shell" id="<?= $id ?>" style="display:none;" aria-hidden="true" tabindex="-1">
                      <option value="missing">Missing</option>
                      <option value="requested">Requested</option>
                      <option value="submitted">Submitted</option>
                      <option value="reviewed">Reviewed</option>
                    </select>
                  </div>
                  <?php endforeach; ?>
                </div>
              </div>
            </div>
          </section>

          <!-- STEP 4: GOVERNANCE & SCORING -->
          <section class="crud-section sfc-step-panel" id="crud-panel-3" aria-labelledby="crud-section-3" data-step="3">
            <div class="sfc-step-header">
              <span class="sfc-step-pill">Stage 04</span>
              <h4 id="crud-section-3">Governance &amp; Scoring</h4>
            </div>

            <div class="crud-section-fields sfc-form-fields">
              <div class="sfc-input-card">
                <div class="sfc-field-label" id="crudStatusLabel">Commercial Status</div>
                <div class="crud-options sfc-pill-group" role="group" aria-labelledby="crudStatusLabel" id="seg-crud-status">
                  <button type="button" onclick="crudSeg('seg-crud-status','crudStatus',this,'Available')" class="crud-seg-btn sfc-status-chip is-selected" data-val="Available" aria-pressed="true"><span class="sfc-dot sfc-dot-green"></span> Available</button>
                  <button type="button" onclick="crudSeg('seg-crud-status','crudStatus',this,'Reserved')" class="crud-seg-btn sfc-status-chip" data-val="Reserved"><span class="sfc-dot sfc-dot-blue"></span> Reserved</button>
                  <button type="button" onclick="crudSeg('seg-crud-status','crudStatus',this,'Under Review')" class="crud-seg-btn sfc-status-chip" data-val="Under Review"><span class="sfc-dot sfc-dot-amber"></span> Under Review</button>
                  <button type="button" onclick="crudSeg('seg-crud-status','crudStatus',this,'Negotiating')" class="crud-seg-btn sfc-status-chip" data-val="Negotiating"><span class="sfc-dot sfc-dot-purple"></span> Negotiating</button>
                </div>
                <select class="input-shell" id="crudStatus" aria-hidden="true" tabindex="-1">
                  <option value="Available">Available</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Negotiating">Negotiating</option>
                </select>
              </div>

              <div class="sfc-input-card">
                <div class="sfc-field-label" id="crudApprovalStateLabel">Approval State</div>
                <div class="crud-options sfc-pill-group" role="group" aria-labelledby="crudApprovalStateLabel" id="seg-crud-approval">
                  <button type="button" onclick="crudSeg('seg-crud-approval','crudApprovalState',this,'draft')" class="crud-seg-btn sfc-status-chip" data-val="draft">Draft</button>
                  <button type="button" onclick="crudSeg('seg-crud-approval','crudApprovalState',this,'pending_review')" class="crud-seg-btn sfc-status-chip" data-val="pending_review">&#9711; Pending Review</button>
                  <button type="button" onclick="crudSeg('seg-crud-approval','crudApprovalState',this,'approved')" class="crud-seg-btn sfc-status-chip sfc-chip-success is-selected" data-val="approved" aria-pressed="true">&#10003; Approved</button>
                  <button type="button" onclick="crudSeg('seg-crud-approval','crudApprovalState',this,'rejected')" class="crud-seg-btn sfc-status-chip sfc-chip-danger" data-val="rejected">&#10007; Rejected</button>
                  <button type="button" onclick="crudSeg('seg-crud-approval','crudApprovalState',this,'archived')" class="crud-seg-btn sfc-status-chip" data-val="archived">Archived</button>
                </div>
                <select class="input-shell" id="crudApprovalState" aria-hidden="true" tabindex="-1">
                  <option value="draft">Draft</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div class="crud-field-grid sfc-dual-grid">
                <div class="sfc-input-card">
                  <div class="sfc-field-label" id="crudSellerIdentityStatusLabel">Seller Verification</div>
                  <div class="crud-options sfc-pill-group" role="group" aria-labelledby="crudSellerIdentityStatusLabel" id="seg-crud-seller">
                    <button type="button" onclick="crudSeg('seg-crud-seller','crudSellerIdentityStatus',this,'unverified')" class="crud-seg-btn sfc-status-chip is-selected" data-val="unverified" aria-pressed="true">&#9888; Unverified</button>
                    <button type="button" onclick="crudSeg('seg-crud-seller','crudSellerIdentityStatus',this,'pending')" class="crud-seg-btn sfc-status-chip" data-val="pending">&#9711; Pending</button>
                    <button type="button" onclick="crudSeg('seg-crud-seller','crudSellerIdentityStatus',this,'verified')" class="crud-seg-btn sfc-status-chip sfc-chip-success" data-val="verified">&#10003; Verified</button>
                  </div>
                  <select class="input-shell" id="crudSellerIdentityStatus" aria-hidden="true" tabindex="-1">
                    <option value="unverified">Unverified</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                  </select>
                </div>

                <div class="sfc-input-card">
                  <div class="sfc-field-label">Compliance Checks</div>
                  <div class="sfc-verification-toggles">
                    <div class="sfc-toggle-item">
                      <span>Documents Inspected</span>
                      <div class="crud-options" id="seg-crud-docs" role="group" aria-label="Documents Inspected">
                        <button type="button" onclick="crudYesNo('seg-crud-docs','crudDocumentsReviewed',this,'1',true)" class="crud-seg-btn sfc-mini-toggle sfc-mini-yes" data-val="1" aria-pressed="false">&#10003; Yes</button>
                        <button type="button" onclick="crudYesNo('seg-crud-docs','crudDocumentsReviewed',this,'0',false)" class="crud-seg-btn sfc-mini-toggle sfc-mini-no is-selected is-active" data-val="0" aria-pressed="true">&#10007; No</button>
                      </div>
                      <select class="input-shell" id="crudDocumentsReviewed" aria-hidden="true" tabindex="-1" style="display:none;" hidden>
                        <option value="0">No</option><option value="1">Yes</option>
                      </select>
                    </div>

                    <div class="sfc-toggle-item">
                      <span>Site Verified</span>
                      <div class="crud-options" id="seg-crud-site" role="group" aria-label="Site Verified">
                        <button type="button" onclick="crudYesNo('seg-crud-site','crudSiteVerified',this,'1',true)" class="crud-seg-btn sfc-mini-toggle sfc-mini-yes" data-val="1" aria-pressed="false">&#10003; Yes</button>
                        <button type="button" onclick="crudYesNo('seg-crud-site','crudSiteVerified',this,'0',false)" class="crud-seg-btn sfc-mini-toggle sfc-mini-no is-selected is-active" data-val="0" aria-pressed="true">&#10007; No</button>
                      </div>
                      <select class="input-shell" id="crudSiteVerified" aria-hidden="true" tabindex="-1" style="display:none;" hidden>
                        <option value="0">No</option><option value="1">Yes</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Market Score & Road Access Slider Cards -->
              <div class="crud-field-grid sfc-dual-grid">
                <div class="sfc-input-card">
                  <div class="sfc-label-row">
                    <label for="crudScore" class="sfc-field-label">Market Score</label>
                    <span id="crud-score-display" class="sfc-score-badge">82</span>
                  </div>
                  <div class="sfc-slider-row">
                    <input type="range" min="40" max="100" class="sfc-slider" id="crudScoreSlider" value="82" oninput="crudSetScore(this.value)" />
                    <input type="number" min="40" max="100" class="input-shell sfc-score-num" id="crudScore" value="82" oninput="crudSetScore(this.value)" />
                  </div>
                </div>

                <div class="sfc-input-card">
                  <div class="sfc-label-row">
                    <label for="crudAccess" class="sfc-field-label">Road Access</label>
                    <span id="crud-access-display" class="sfc-score-badge">85</span>
                  </div>
                  <div class="sfc-slider-row">
                    <input type="range" min="40" max="100" class="sfc-slider" id="crudAccessSlider" value="85" oninput="crudSetAccess(this.value)" />
                    <input type="number" min="40" max="100" class="input-shell sfc-score-num" id="crudAccess" value="85" oninput="crudSetAccess(this.value)" />
                  </div>
                </div>
              </div>

              <!-- Last Confirmed Available -->
              <div class="sfc-input-card">
                <div class="sfc-label-row">
                  <label for="crudLastConfirmedAvailableAt" class="sfc-field-label">Availability Confirmation</label>
                  <button type="button" class="sfc-chip" onclick="crudSetNowAvailability()">Set Today</button>
                </div>
                <input type="datetime-local" class="input-shell sfc-text-input" id="crudLastConfirmedAvailableAt" />
              </div>

              <!-- Spatial Engine: Top 3 Recommended Business Typologies for this Parcel -->
              <div class="sfc-bm-review-block" id="crudBmReviewBlock">
                <div class="sfc-bm-review-head">
                  <span class="sfc-bm-review-title">
                    <span style="color:#059669;">âœ¦</span> Spatial Decision Support: Recommended Business Typologies
                  </span>
                  <span class="sfc-bm-review-badge">CLUP 2025â€“2035 MCE</span>
                </div>
                <div class="sfc-bm-review-list" id="crudBmReviewList">
                  <!-- Populated dynamically via JS -->
                </div>
              </div>
            </div>
          </section>

        </div>

        <!-- Fixed 3-Zone Bottom Action Bar -->
        <div class="crud-form-actions sfc-editor-actions">
          <div class="sfc-actions-left">
            <button type="button" class="btn-shell sfc-cancel-btn" data-modal-close="propertyCrudModal">Cancel</button>
            <!-- Temporary Test Hazard Simulation Button -->
            <button type="button" class="btn-shell btn-shell-hazard-test" id="btnTestHazard" onclick="testHazardWarning()" title="Simulate Spatial Geo-Hazard Detection">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Test Hazard</span>
            </button>
          </div>
          <div class="sfc-actions-center">
            <span class="sfc-step-indicator" id="crudStepIndicator">Stage 1 of 4 &middot; Identity</span>
          </div>
          <div class="sfc-actions-right">
            <button type="button" class="btn-shell btn-shell-secondary sfc-step-nav-btn" id="crudBtnPrev" onclick="crudNavStep(-1)" disabled style="display:none;">
              &larr; Back
            </button>
            <button type="button" class="btn-shell btn-shell-secondary sfc-step-nav-btn" id="crudBtnNext" onclick="crudNavStep(1)">
              Next &rarr;
            </button>
            <button type="submit" class="btn-shell btn-shell-primary sfc-btn-save" id="crud-btn-save">
              <span>&#10003;</span> Save Property
            </button>
          </div>
        </div>
      </form>

      <!-- Right Column: Live Opportunity Card Preview (Parcel Details Sidebar) -->
      <aside class="sfc-editor-preview-col" aria-label="Live Listing Preview">
        <div class="sfc-preview-sticky">
          <div class="sfc-preview-head">
            <span class="sfc-preview-kicker">Parcel Details &bull; Live Preview</span>
            <span class="sfc-preview-live-badge"><span class="sfc-live-pulse"></span> Dynamic</span>
          </div>

          <!-- Striking High-Visibility Geo-Hazard Warning Banner (Hidden by default) -->
          <div id="hazardWarningBox" class="hazard-warning-banner hidden relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-rose-700 to-amber-700 p-4 text-white shadow-2xl ring-2 ring-red-400/80 mb-4 transition-all duration-300" role="alert" aria-live="assertive">
            <div class="hazard-warning-top flex items-center justify-between gap-2 mb-2">
              <span class="hazard-alert-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-black/35 border border-white/20 text-amber-200">
                <span class="hazard-pulse-dot w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                Geo-Hazard Alert &bull; PHIVOLCS / MGB
              </span>
              <button type="button" class="hazard-close-btn text-white/70 hover:text-white text-lg font-bold leading-none p-1 transition" onclick="document.getElementById('hazardWarningBox').classList.add('hidden')" title="Dismiss Alert">&times;</button>
            </div>
            <div class="hazard-body flex items-start gap-3">
              <div class="hazard-icon-wrap flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 border border-white/30 text-amber-200 shadow-inner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p id="hazardWarningText" class="hazard-warning-text text-sm font-extrabold leading-snug tracking-tight text-white drop-shadow-sm break-words"></p>
                <div class="hazard-footer mt-2 flex items-center gap-2 text-[11px] text-white/90">
                  <span class="hazard-tag font-semibold text-amber-200 flex items-center gap-1">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
                    Mandatory CLUP Gate
                  </span>
                  <span class="text-white/40">&bull;</span>
                  <span class="text-amber-100 font-medium">Environmental Overlay Flagged</span>
                </div>
              </div>
            </div>
          </div>

          <!-- The Live Preview Card -->
          <article class="sfc-preview-card">
            <!-- Card Image -->
            <div class="sfc-preview-media">
              <img id="livePreviewImg" src="assets/images/Property10.png" alt="Property Preview" onerror="this.src='assets/images/Property10.png'" />
              <div class="sfc-preview-badges">
                <span class="sfc-preview-type" id="livePreviewType">Commercial</span>
                <span class="sfc-preview-corridor" id="livePreviewCorridor">Highway Corridor</span>
              </div>
              <div class="sfc-preview-status-pill" id="livePreviewStatus">
                <span class="sfc-dot sfc-dot-green"></span> Available
              </div>
            </div>

            <!-- Card Body -->
            <div class="sfc-preview-body">
              <div class="sfc-preview-price-row">
                <span class="sfc-preview-price-label" style="display:inline-flex; align-items:center; gap:4px;"><?= sfc_domain_icon('birzonalvalue', 'xs') ?> Guide Price</span>
                <div class="sfc-preview-price" id="livePreviewPrice">PHP 75.0M</div>
              </div>

              <h4 class="sfc-preview-title" id="livePreviewTitle">Fabro Building Prime Lot</h4>
              <p class="sfc-preview-location" id="livePreviewLocation">Brgy. Catbangen &middot; San Fernando, La Union</p>

              <!-- Metrics Grid -->
              <div class="sfc-preview-metrics">
                <div class="sfc-metric-cell">
                  <span class="sfc-metric-label" style="display:inline-flex; align-items:center; justify-content:center; gap:4px;"><?= sfc_domain_icon('propertyinfo', 'xs') ?> Land Scale</span>
                  <strong class="sfc-metric-val" id="livePreviewArea">8.5 Ha</strong>
                </div>
                <div class="sfc-metric-cell">
                  <span class="sfc-metric-label" style="display:inline-flex; align-items:center; justify-content:center; gap:4px;"><?= sfc_domain_icon('iai', 'xs') ?> Market Score</span>
                  <strong class="sfc-metric-val sfc-metric-accent" id="livePreviewScore">82<span>/100</span></strong>
                </div>
                <div class="sfc-metric-cell">
                  <span class="sfc-metric-label" style="display:inline-flex; align-items:center; justify-content:center; gap:4px;"><?= sfc_domain_icon('accessibility', 'xs') ?> Road Access</span>
                  <strong class="sfc-metric-val" id="livePreviewAccess">85<span>/100</span></strong>
                </div>
              </div>

              <!-- Due Diligence Status Tracker -->
              <div class="sfc-preview-diligence">
                <div class="sfc-diligence-header">
                  <span style="display:inline-flex; align-items:center; gap:5px;"><?= sfc_domain_icon('sitereadiness', 'xs') ?> Due Diligence Readiness</span>
                  <strong id="livePreviewDocSummary">0 / 6 Docs</strong>
                </div>
                <div class="sfc-diligence-bar-wrap">
                  <div class="sfc-diligence-bar" id="livePreviewDocBar" style="width: 0%;"></div>
                </div>
              </div>

              <!-- Live Trust & Verification Badges -->
              <div class="sfc-preview-trust-row" id="livePreviewTrust">
                <span class="sfc-trust-chip">âœ“ Approved Listing</span>
              </div>

              <!-- Recommended Business Match Mini-Strip -->
              <div class="sfc-preview-business-match" id="livePreviewBusinessMatch">
                <div class="sfc-bm-header">
                  <span class="sfc-bm-kicker" style="display:inline-flex; align-items:center; gap:4px;"><?= sfc_domain_icon('mce', 'xs') ?> Recommended Best Use</span>
                  <span class="sfc-bm-badge" id="livePreviewBmScore">98.5% Fit</span>
                </div>
                <div class="sfc-bm-name" id="livePreviewBmName">Drive-Thru QSR & Commercial Retail Strip</div>
                <div class="sfc-bm-rationale" id="livePreviewBmRationale">CLUP corridor alignment & arterial frontage match.</div>
              </div>
            </div>
          </article>

          <!-- Executive Publication Status Strip -->
          <div class="sfc-preview-status-strip">
            <span class="sfc-strip-dot"></span>
            <span>Real-time City GIS synchronization</span>
          </div>
        </div>
      </aside>

    </div>
  </div>
</div>

<!-- Delete Modal (unchanged) -->
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

<!-- Property form presentation, segmented controls, progressive disclosure & live preview -->
<script>
(function () {
  var _currentStep = 0;
  var TOTAL_STEPS = 4;
  var stepTitles = ['Identity', 'Location', 'Media', 'Review'];

  window.crudGoToStep = function (stepIdx) {
    if (stepIdx < 0 || stepIdx >= TOTAL_STEPS) return;
    _currentStep = stepIdx;
    _renderStepUI();
  };

  window.crudNavStep = function (delta) {
    var next = _currentStep + delta;
    if (delta > 0) {
      if (!crudValidateCurrentStep(_currentStep)) return;
    }
    if (next >= 0 && next < TOTAL_STEPS) {
      _currentStep = next;
      _renderStepUI();
    }
  };

  function _renderStepUI() {
    // Panels
    for (var i = 0; i < TOTAL_STEPS; i++) {
      var panel = document.getElementById('crud-panel-' + i);
      if (panel) {
        if (i === _currentStep) {
          panel.classList.add('is-active');
        } else {
          panel.classList.remove('is-active');
        }
      }
    }

    // Tabs in header
    var tabs = document.querySelectorAll('#wizardTabsNav .sfc-wizard-tab');
    tabs.forEach(function (tab, idx) {
      var badge = tab.querySelector('.sfc-tab-badge');
      if (idx === _currentStep) {
        tab.classList.add('is-active');
        tab.classList.remove('is-completed');
        if (badge) badge.textContent = '0' + (idx + 1);
      } else if (idx < _currentStep) {
        tab.classList.remove('is-active');
        tab.classList.add('is-completed');
        if (badge) badge.innerHTML = '&#10003;';
      } else {
        tab.classList.remove('is-active', 'is-completed');
        if (badge) badge.textContent = '0' + (idx + 1);
      }
    });

    // Hairline Progress bar
    var bar = document.getElementById('wizardProgressBar');
    if (bar) {
      var pct = Math.round(((_currentStep + 1) / TOTAL_STEPS) * 100);
      bar.style.width = pct + '%';
    }

    // Indicator & Prev/Next buttons
    var ind = document.getElementById('crudStepIndicator');
    if (ind) ind.textContent = 'Stage ' + (_currentStep + 1) + ' of ' + TOTAL_STEPS + ' Â· ' + stepTitles[_currentStep];

    var btnPrev = document.getElementById('crudBtnPrev');
    if (btnPrev) {
      btnPrev.disabled = (_currentStep === 0);
      btnPrev.style.display = (_currentStep === 0) ? 'none' : 'inline-flex';
    }

    var btnNext = document.getElementById('crudBtnNext');
    if (btnNext) {
      btnNext.style.display = (_currentStep === TOTAL_STEPS - 1) ? 'none' : 'inline-flex';
      btnNext.innerHTML = 'Next &rarr;';
    }

    var wrap = document.getElementById('crud-panels-wrap');
    if (wrap) wrap.scrollTop = 0;
  }

  function crudValidateCurrentStep(step) {
    if (step === 0) {
      var nameEl = document.getElementById('crudPropertyName');
      if (!nameEl || !nameEl.value.trim()) {
        if (nameEl) {
          nameEl.focus();
          nameEl.style.borderColor = '#ef4444';
          nameEl.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
          setTimeout(function () {
            nameEl.style.borderColor = '';
            nameEl.style.boxShadow = '';
          }, 2400);
        }
        return false;
      }
      var descEl = document.getElementById('crudDescription');
      if (!descEl || !descEl.value.trim()) {
        if (descEl) {
          descEl.focus();
          descEl.style.borderColor = '#ef4444';
          descEl.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
          setTimeout(function () {
            descEl.style.borderColor = '';
            descEl.style.boxShadow = '';
          }, 2400);
        }
        return false;
      }
    } else if (step === 1) {
      var cityEl = document.getElementById('crudCity');
      if (!cityEl || !cityEl.value.trim()) {
        if (cityEl) { cityEl.focus(); }
        return false;
      }
      var priceEl = document.getElementById('crudPrice');
      if (!priceEl || !priceEl.value || parseFloat(priceEl.value) <= 0) {
        if (priceEl) {
          priceEl.focus();
          priceEl.style.borderColor = '#ef4444';
          priceEl.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
          setTimeout(function () {
            priceEl.style.borderColor = '';
            priceEl.style.boxShadow = '';
          }, 2400);
        }
        return false;
      }
      var haEl = document.getElementById('crudLandArea');
      if (!haEl || !haEl.value || parseFloat(haEl.value) <= 0) {
        if (haEl) {
          haEl.focus();
          haEl.style.borderColor = '#ef4444';
          haEl.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
          setTimeout(function () {
            haEl.style.borderColor = '';
            haEl.style.boxShadow = '';
          }, 2400);
        }
        return false;
      }
    }
    return true;
  }

  // Intercept save button click to ensure all required fields are satisfied before submission
  var saveBtn = document.getElementById('crud-btn-save');
  var formEl = document.getElementById('propertyCrudForm');
  if (saveBtn && formEl) {
    saveBtn.addEventListener('click', function (e) {
      var nameEl = document.getElementById('crudPropertyName');
      var descEl = document.getElementById('crudDescription');
      if (!nameEl.value.trim() || !descEl.value.trim()) {
        e.preventDefault();
        e.stopPropagation();
        crudGoToStep(0);
        if (!nameEl.value.trim()) nameEl.focus();
        else descEl.focus();
        return;
      }
      var cityEl = document.getElementById('crudCity');
      var priceEl = document.getElementById('crudPrice');
      var haEl = document.getElementById('crudLandArea');
      if (!cityEl.value.trim() || !priceEl.value || parseFloat(priceEl.value) <= 0 || !haEl.value || parseFloat(haEl.value) <= 0) {
        e.preventDefault();
        e.stopPropagation();
        crudGoToStep(1);
        if (!cityEl.value.trim()) cityEl.focus();
        else if (!priceEl.value || parseFloat(priceEl.value) <= 0) priceEl.focus();
        else haEl.focus();
        return;
      }
    }, true);
  }

  window.crudSeg = function (groupId, selectId, btn, val) {
    var grp = document.getElementById(groupId);
    if (!grp) return;
    grp.querySelectorAll('.crud-seg-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
      b.classList.remove('is-selected');
    });
    btn.setAttribute('aria-pressed', 'true');
    btn.classList.add('is-selected');
    var sel = document.getElementById(selectId);
    if (sel) sel.value = val;
    crudUpdateLivePreview();
  };

  window.crudYesNo = function (groupId, selectId, btn, val, isYes) {
    var grp = document.getElementById(groupId);
    if (!grp) return;
    var targetBtn = (btn && btn.closest) ? btn.closest('.crud-seg-btn') : (btn || grp.querySelector('[data-val="' + val + '"]'));
    grp.querySelectorAll('.crud-seg-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
      b.classList.remove('is-selected', 'is-active');
    });
    if (targetBtn) {
      targetBtn.setAttribute('aria-pressed', 'true');
      targetBtn.classList.add('is-selected', 'is-active');
    }
    var sel = document.getElementById(selectId);
    if (sel) {
      sel.value = String(val);
      try {
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (err) {}
    }
    crudUpdateLivePreview();
  };

  window.crudFormatPrice = function (rawVal) {
    var badge = document.getElementById('crud-price-badge');
    var n = parseFloat(rawVal);
    if (!rawVal || isNaN(n)) {
      if (badge) badge.textContent = '';
      return;
    }
    var fmt;
    if      (n >= 1e9)  fmt = '\u20B1 ' + (n / 1e9).toFixed(2) + 'B';
    else if (n >= 1e6)  fmt = '\u20B1 ' + (n / 1e6).toFixed(1) + 'M';
    else if (n >= 1e3)  fmt = '\u20B1 ' + (n / 1e3).toFixed(1) + 'K';
    else                fmt = '\u20B1 ' + n.toLocaleString();
    if (badge) badge.textContent = fmt;
  };

  window.crudSyncArea = function (val, fromUnit) {
    var n = parseFloat(val) || 0;
    var sqmEl = document.getElementById('crudLandAreaSqm');
    var haEl  = document.getElementById('crudLandArea');
    var hint  = document.getElementById('crudLandAreaHint');
    if (fromUnit === 'ha') {
      var sqm = Math.round(n * 10000);
      if (sqmEl) sqmEl.value = sqm || '';
      if (hint) hint.textContent = (n > 0 ? n : '0') + ' ha = ' + sqm.toLocaleString() + ' sqm';
    } else {
      var ha = +(n / 10000).toFixed(4);
      if (haEl) haEl.value = ha || '';
      if (hint) hint.textContent = n.toLocaleString() + ' sqm = ' + ha + ' ha';
    }
  };

  window.crudSetBarangay = function (brgy) {
    var el = document.getElementById('crudBarangay');
    if (el) {
      el.value = brgy;
      crudUpdateLivePreview();
    }
  };

  window.crudSetPrice = function (priceNum) {
    var el = document.getElementById('crudPrice');
    if (el) {
      el.value = priceNum;
      crudFormatPrice(priceNum);
      crudUpdateLivePreview();
    }
  };

  window.crudAddTag = function (tag) {
    var el = document.getElementById('crudTags');
    if (!el) return;
    var cur = el.value.trim();
    if (!cur) {
      el.value = tag;
    } else if (cur.toLowerCase().indexOf(tag.toLowerCase()) === -1) {
      el.value = cur + ', ' + tag;
    }
    crudUpdateLivePreview();
  };

  window.crudAddFacility = function (fac) {
    var el = document.getElementById('crudFacilities');
    if (!el) return;
    var cur = el.value.trim();
    if (!cur) {
      el.value = fac;
    } else if (cur.toLowerCase().indexOf(fac.toLowerCase()) === -1) {
      el.value = cur + ', ' + fac;
    }
    crudUpdateLivePreview();
  };

  window.crudSelectPresetImage = function (path, btn) {
    var imgInput = document.getElementById('crudImagePath');
    if (imgInput) imgInput.value = path;
    var fileInput = document.getElementById('crudImage');
    if (fileInput) fileInput.value = '';
    var label = document.getElementById('dropzoneLabel');
    if (label) label.textContent = 'Upload Custom Property Photo';
    document.querySelectorAll('.sfc-preset-thumb').forEach(function (t) {
      t.classList.remove('is-selected');
    });
    if (btn) btn.classList.add('is-selected');
    crudUpdateLivePreview();
  };

  window.crudHandleFileSelect = function (input) {
    if (input.files && input.files[0]) {
      var file = input.files[0];
      var label = document.getElementById('dropzoneLabel');
      if (label) label.textContent = file.name;
      var reader = new FileReader();
      reader.onload = function (e) {
        var preview = document.getElementById('livePreviewImg');
        if (preview) preview.src = e.target.result;
      };
      reader.readAsDataURL(file);
      document.querySelectorAll('.sfc-preset-thumb').forEach(function (t) {
        t.classList.remove('is-selected');
      });
    }
  };

  window.crudSetDocStatus = function (docSelectId, statusVal) {
    var sel = document.getElementById(docSelectId);
    if (sel) sel.value = statusVal;
    var row = document.querySelector('.sfc-doc-row[data-doc-id="' + docSelectId + '"]');
    if (row) {
      row.querySelectorAll('.sfc-doc-pill').forEach(function (p) {
        p.classList.remove('is-active');
      });
      var target = row.querySelector('.sfc-doc-pill[data-val="' + statusVal + '"]');
      if (target) target.classList.add('is-active');
    }
    crudUpdateLivePreview();
  };

  window.crudMarkAllDocs = function (statusVal) {
    ['crudDocTitleCopy', 'crudDocTaxDeclaration', 'crudDocSurveyPlan', 'crudDocZoningClearance', 'crudDocSitePhotos', 'crudDocHazardReport'].forEach(function (id) {
      crudSetDocStatus(id, statusVal);
    });
  };

  window.crudSetScore = function (val) {
    var numEl = document.getElementById('crudScore');
    var sliderEl = document.getElementById('crudScoreSlider');
    var dispEl = document.getElementById('crud-score-display');
    if (numEl) numEl.value = val;
    if (sliderEl) sliderEl.value = val;
    if (dispEl) dispEl.textContent = val;
    crudUpdateLivePreview();
  };

  window.crudSetAccess = function (val) {
    var numEl = document.getElementById('crudAccess');
    var sliderEl = document.getElementById('crudAccessSlider');
    var dispEl = document.getElementById('crud-access-display');
    if (numEl) numEl.value = val;
    if (sliderEl) sliderEl.value = val;
    if (dispEl) dispEl.textContent = val;
    crudUpdateLivePreview();
  };

  window.crudSetNowAvailability = function () {
    var el = document.getElementById('crudLastConfirmedAvailableAt');
    if (el) {
      var now = new Date();
      var iso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      el.value = iso;
    }
  };

  window.crudUpdateWordCount = function (text) {
    var countEl = document.getElementById('descWordCount');
    if (!countEl) return;
    var words = text.trim() ? text.trim().split(/\s+/).length : 0;
    countEl.textContent = words + ' word' + (words === 1 ? '' : 's');
  };

  // Drag and drop events for photo dropzone
  var dropzone = document.getElementById('imageDropzone');
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.remove('is-dragover');
      });
    });
    dropzone.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        var fileInput = document.getElementById('crudImage');
        if (fileInput) {
          fileInput.files = e.dataTransfer.files;
          crudHandleFileSelect(fileInput);
        }
      }
    });
  }

  // Live Preview Updating Engine
  window.crudUpdateLivePreview = function () {
    // Title
    var nameVal = (document.getElementById('crudPropertyName') || {}).value || '';
    var previewTitle = document.getElementById('livePreviewTitle');
    if (previewTitle) previewTitle.textContent = nameVal.trim() || 'Fabro Building Prime Lot';

    // Type
    var typeVal = (document.getElementById('crudPropertyType') || {}).value || 'commercial';
    var typeLabels = {
      commercial: 'Commercial',
      logistics: 'Logistics',
      hotel: 'Hospitality',
      bpo: 'Corporate',
      manufacturing: 'Industrial'
    };
    var previewType = document.getElementById('livePreviewType');
    if (previewType) previewType.textContent = typeLabels[typeVal] || 'Commercial';

    // Corridor
    var corridorVal = (document.getElementById('crudCorridor') || {}).value || 'highway';
    var corridorLabels = {
      highway: 'Highway Corridor',
      downtown: 'Downtown Core',
      coastal: 'Coastal & Port'
    };
    var previewCorridor = document.getElementById('livePreviewCorridor');
    if (previewCorridor) previewCorridor.textContent = corridorLabels[corridorVal] || 'Highway Corridor';

    // Location
    var brgyVal = (document.getElementById('crudBarangay') || {}).value || '';
    var cityVal = (document.getElementById('crudCity') || {}).value || 'San Fernando, La Union';
    var previewLoc = document.getElementById('livePreviewLocation');
    if (previewLoc) {
      previewLoc.textContent = (brgyVal.trim() ? 'Brgy. ' + brgyVal.trim() + ' Â· ' : '') + cityVal;
    }

    // Price
    var priceVal = parseFloat((document.getElementById('crudPrice') || {}).value) || 0;
    var previewPrice = document.getElementById('livePreviewPrice');
    if (previewPrice) {
      if (priceVal >= 1e9) previewPrice.textContent = 'PHP ' + (priceVal / 1e9).toFixed(2) + 'B';
      else if (priceVal >= 1e6) previewPrice.textContent = 'PHP ' + (priceVal / 1e6).toFixed(1) + 'M';
      else if (priceVal > 0) previewPrice.textContent = 'PHP ' + priceVal.toLocaleString();
      else previewPrice.textContent = 'PHP 75.0M';
    }

    // Area
    var haVal = parseFloat((document.getElementById('crudLandArea') || {}).value) || 0;
    var previewArea = document.getElementById('livePreviewArea');
    if (previewArea) {
      previewArea.textContent = haVal > 0 ? haVal + ' Ha' : '8.5 Ha';
    }

    // Scores
    var scoreVal = (document.getElementById('crudScore') || {}).value || 82;
    var previewScore = document.getElementById('livePreviewScore');
    if (previewScore) previewScore.innerHTML = scoreVal + '<span>/100</span>';

    var accessVal = (document.getElementById('crudAccess') || {}).value || 85;
    var previewAccess = document.getElementById('livePreviewAccess');
    if (previewAccess) previewAccess.innerHTML = accessVal + '<span>/100</span>';

    // Status Pill
    var statusVal = (document.getElementById('crudStatus') || {}).value || 'Available';
    var previewStatus = document.getElementById('livePreviewStatus');
    if (previewStatus) {
      var dotColor = 'green';
      if (statusVal === 'Reserved') dotColor = 'blue';
      else if (statusVal === 'Under Review') dotColor = 'amber';
      else if (statusVal === 'Negotiating') dotColor = 'purple';
      previewStatus.innerHTML = '<span class="sfc-dot sfc-dot-' + dotColor + '"></span> ' + statusVal;
    }

    // Image Preview (only if not an uploaded data URL)
    var fileInput = document.getElementById('crudImage');
    if (!fileInput || !fileInput.files || !fileInput.files.length) {
      var imgPathVal = (document.getElementById('crudImagePath') || {}).value || 'assets/images/Property10.png';
      var previewImg = document.getElementById('livePreviewImg');
      if (previewImg && previewImg.getAttribute('src') !== imgPathVal) {
        previewImg.src = imgPathVal;
      }
    }

    // Document Matrix Progress
    var docIds = ['crudDocTitleCopy', 'crudDocTaxDeclaration', 'crudDocSurveyPlan', 'crudDocZoningClearance', 'crudDocSitePhotos', 'crudDocHazardReport'];
    var reviewedCount = 0;
    docIds.forEach(function (id) {
      var s = document.getElementById(id);
      if (s && s.value === 'reviewed') reviewedCount++;
    });
    var docSummary = document.getElementById('livePreviewDocSummary');
    var docBar = document.getElementById('livePreviewDocBar');
    if (docSummary) docSummary.textContent = reviewedCount + ' / 6 Docs Cleared';
    if (docBar) docBar.style.width = Math.round((reviewedCount / 6) * 100) + '%';

    // Trust Chips
    var trustRow = document.getElementById('livePreviewTrust');
    if (trustRow) {
      var approvalVal = (document.getElementById('crudApprovalState') || {}).value || 'draft';
      var sellerVal = (document.getElementById('crudSellerIdentityStatus') || {}).value || 'unverified';
      var html = '';
      if (approvalVal === 'approved') html += '<span class="sfc-trust-chip">âœ“ Approved Listing</span>';
      else if (approvalVal === 'pending_review') html += '<span class="sfc-trust-chip" style="background:#fef3c7;color:#92400e;border-color:#fde68a;">â³ Pending City Review</span>';
      else html += '<span class="sfc-trust-chip" style="background:#f1f5f9;color:#475569;border-color:#cbd5e1;">Draft Record</span>';

      if (sellerVal === 'verified') html += '<span class="sfc-trust-chip">ðŸ›¡ï¸ Verified Seller</span>';
      if (reviewedCount >= 4) html += '<span class="sfc-trust-chip">ðŸ“œ Due Diligence Cleared</span>';
      var docsVal = (document.getElementById('crudDocumentsReviewed') || {}).value;
      var siteVal = (document.getElementById('crudSiteVerified') || {}).value;
      if (docsVal === '1' || docsVal === 1) html += '<span class="sfc-trust-chip" style="background:#ecfdf5;color:#065f46;border-color:#a7f3d0;">âœ“ Documents Inspected</span>';
      if (siteVal === '1' || siteVal === 1) html += '<span class="sfc-trust-chip" style="background:#ecfdf5;color:#065f46;border-color:#a7f3d0;">âœ“ Site Verified</span>';
      trustRow.innerHTML = html;
    }

    // Business Match Dynamic Computation
    var corridorVal = (document.getElementById('crudCorridor') || {}).value || 'highway';
    var typeVal = (document.getElementById('crudPropertyType') || {}).value || 'commercial';
    var bmList = [
      {
        id: 'highway_qsr_retail',
        name: 'Drive-Thru QSR & Commercial Retail Strip',
        score: corridorVal === 'highway' ? 98.5 : (corridorVal === 'downtown' ? 95.0 : 82.0),
        fitGrade: 'Prime Fit',
        roi: '19% â€“ 26% p.a.',
        capex: 'â‚±20M â€“ â‚±38M',
        rationale: 'Arterial frontage & high vehicular catchment along corridor.'
      },
      {
        id: 'it_bpo_coworking',
        name: 'IT-BPO Office & Tech Innovation Hub',
        score: typeVal === 'bpo' || corridorVal === 'downtown' ? 98.0 : (corridorVal === 'highway' ? 94.5 : 78.0),
        fitGrade: 'Prime Fit',
        roi: '15% â€“ 20% p.a.',
        capex: 'â‚±30M â€“ â‚±55M',
        rationale: 'Tier-2 fiber connectivity & central white-collar workforce radius.'
      },
      {
        id: 'cold_storage_logistics',
        name: 'Cold-Chain & Fishery Logistics Hub',
        score: typeVal === 'logistics' || corridorVal === 'highway' ? 97.0 : 84.0,
        fitGrade: 'Prime Fit',
        roi: '18% â€“ 23% p.a.',
        capex: 'â‚±35M â€“ â‚±65M',
        rationale: 'Regional agri-fishery harvest staging & Poro Freeport link.'
      },
      {
        id: 'eco_coastal_resort',
        name: 'Eco-Boutique Coastal Resort & Wellness Hub',
        score: corridorVal === 'coastal' || typeVal === 'hotel' ? 98.5 : 72.0,
        fitGrade: corridorVal === 'coastal' ? 'Prime Fit' : 'Moderate Fit',
        roi: '16% â€“ 21% p.a.',
        capex: 'â‚±45M â€“ â‚±85M',
        rationale: 'Seaside frontage & San Fernando surf-tourism corridor synergy.'
      },
      {
        id: 'healthcare_diagnostic',
        name: 'Specialized Outpatient & Diagnostic Center',
        score: corridorVal === 'downtown' || corridorVal === 'highway' ? 96.0 : 86.0,
        fitGrade: 'Prime Fit',
        roi: '14% â€“ 18% p.a.',
        capex: 'â‚±28M â€“ â‚±50M',
        rationale: 'Direct arterial connectivity & Region I tertiary referral radius.'
      }
    ];
    bmList.sort(function(a, b) { return b.score - a.score; });
    var top3 = bmList.slice(0, 3);

    // Update Right-Column Preview Card Business Match Strip
    var bmNameEl = document.getElementById('livePreviewBmName');
    var bmScoreEl = document.getElementById('livePreviewBmScore');
    var bmRatEl = document.getElementById('livePreviewBmRationale');
    if (bmNameEl && top3[0]) {
      bmNameEl.textContent = top3[0].name;
      if (bmScoreEl) bmScoreEl.textContent = top3[0].score + '% Fit';
      if (bmRatEl) bmRatEl.textContent = top3[0].rationale;
    }

    // Update Step 4 Review & Publish 3-Card List
    var bmReviewList = document.getElementById('crudBmReviewList');
    if (bmReviewList) {
      var medals = ['ðŸ¥‡', 'ðŸ¥ˆ', 'ðŸ¥‰'];
      bmReviewList.innerHTML = top3.map(function(item, idx) {
        return '<div class="sfc-bm-review-item ' + (idx === 0 ? 'is-top' : '') + '">' +
          '<div class="sfc-bm-item-topline">' +
            '<span class="sfc-bm-item-rank">' + medals[idx] + ' Rank ' + (idx + 1) + '</span>' +
            '<span class="sfc-bm-item-score">' + item.score + '%</span>' +
          '</div>' +
          '<div class="sfc-bm-item-name">' + item.name + '</div>' +
          '<div class="sfc-bm-item-meta">' + item.roi + ' &bull; ' + item.capex + '</div>' +
        '</div>';
      }).join('');
    }
  };

  // Sync segmented buttons and modern controls when portal.js fillCrudForm populates selects
  function _syncSegsFromSelects() {
    var pairs = [
      ['crudPropertyType',        'seg-crud-type'],
      ['crudCorridor',            'seg-crud-corridor'],
      ['crudStatus',              'seg-crud-status'],
      ['crudApprovalState',       'seg-crud-approval'],
      ['crudSellerIdentityStatus','seg-crud-seller'],
    ];
    pairs.forEach(function (pair) {
      var sel = document.getElementById(pair[0]);
      var grp = document.getElementById(pair[1]);
      if (!sel || !grp) return;
      var val = sel.value;
      grp.querySelectorAll('.crud-seg-btn').forEach(function (b) {
        b.setAttribute('aria-pressed', 'false');
        b.classList.remove('is-selected');
      });
      var match = grp.querySelector('[data-val="' + val + '"]');
      if (match) {
        match.setAttribute('aria-pressed', 'true');
        match.classList.add('is-selected');
      }
    });

    // Yes/No pairs
    var ynPairs = [
      ['crudDocumentsReviewed', 'seg-crud-docs'],
      ['crudSiteVerified',      'seg-crud-site'],
    ];
    ynPairs.forEach(function (pair) {
      var sel = document.getElementById(pair[0]);
      var grp = document.getElementById(pair[1]);
      if (!sel || !grp) return;
      var val = String(sel.value || '0');
      grp.querySelectorAll('.crud-seg-btn').forEach(function (b) {
        b.setAttribute('aria-pressed', 'false');
        b.classList.remove('is-selected', 'is-active');
      });
      var match = grp.querySelector('[data-val="' + val + '"]');
      if (match) {
        match.setAttribute('aria-pressed', 'true');
        match.classList.add('is-selected', 'is-active');
      }
    });

    // Sync 6 document status pills from selects
    ['crudDocTitleCopy', 'crudDocTaxDeclaration', 'crudDocSurveyPlan', 'crudDocZoningClearance', 'crudDocSitePhotos', 'crudDocHazardReport'].forEach(function (docId) {
      var sel = document.getElementById(docId);
      if (sel) {
        var row = document.querySelector('.sfc-doc-row[data-doc-id="' + docId + '"]');
        if (row) {
          row.querySelectorAll('.sfc-doc-pill').forEach(function (p) {
            p.classList.remove('is-active');
          });
          var target = row.querySelector('.sfc-doc-pill[data-val="' + (sel.value || 'missing') + '"]');
          if (target) target.classList.add('is-active');
        }
      }
    });

    // Sliders
    var scoreEl = document.getElementById('crudScore');
    var scoreSlider = document.getElementById('crudScoreSlider');
    var scoreDisplay = document.getElementById('crud-score-display');
    if (scoreEl && scoreSlider) scoreSlider.value = scoreEl.value;
    if (scoreEl && scoreDisplay) scoreDisplay.textContent = scoreEl.value;

    var accEl = document.getElementById('crudAccess');
    var accSlider = document.getElementById('crudAccessSlider');
    var accDisplay = document.getElementById('crud-access-display');
    if (accEl && accSlider) accSlider.value = accEl.value;
    if (accEl && accDisplay) accDisplay.textContent = accEl.value;

    // Word count & price badge
    var descEl = document.getElementById('crudDescription');
    if (descEl) crudUpdateWordCount(descEl.value);

    var priceEl = document.getElementById('crudPrice');
    if (priceEl) crudFormatPrice(priceEl.value);

    var haEl = document.getElementById('crudLandArea');
    if (haEl && haEl.value) crudSyncArea(haEl.value, 'ha');

    // Preset thumbnails selection state
    var imgPathVal = (document.getElementById('crudImagePath') || {}).value;
    document.querySelectorAll('.sfc-preset-thumb').forEach(function (t) {
      var img = t.querySelector('img');
      if (img && img.getAttribute('src') === imgPathVal) {
        t.classList.add('is-selected');
      } else {
        t.classList.remove('is-selected');
      }
    });

    // Refresh live preview
    crudUpdateLivePreview();
  }

  // Delegated click listeners for compliance toggles as redundant safety
  ['seg-crud-docs', 'seg-crud-site'].forEach(function (gid) {
    var grp = document.getElementById(gid);
    if (!grp) return;
    var selId = gid === 'seg-crud-docs' ? 'crudDocumentsReviewed' : 'crudSiteVerified';
    grp.addEventListener('click', function (e) {
      var btn = e.target.closest('.crud-seg-btn');
      if (!btn) return;
      var val = btn.getAttribute('data-val');
      if (val !== null && val !== undefined) {
        crudYesNo(gid, selId, btn, val, val === '1');
      }
    });
  });

  // MutationObserver to detect modal show/hide
  var _modal = document.getElementById('propertyCrudModal');
  var _returnFocus = null;
  var _bodyOverflow = '';

  function focusableControls() {
    return Array.from(_modal.querySelectorAll('button, input, textarea, select, [tabindex]')).filter(function (el) {
      return !el.disabled && el.tabIndex >= 0 && el.getClientRects().length;
    });
  }

  if (_modal) {
    new MutationObserver(function () {
      if (!_modal.hidden) {
        _returnFocus = document.activeElement;
        _bodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        _syncSegsFromSelects();
        _currentStep = 0;
        _renderStepUI();
        _modal.querySelector('[data-modal-close]').focus({ preventScroll: true });
      } else {
        document.body.style.overflow = _bodyOverflow;
        if (_returnFocus && _returnFocus.isConnected) _returnFocus.focus({ preventScroll: true });
      }
    }).observe(_modal, { attributes: true, attributeFilter: ['hidden'] });
  }

  _modal.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      _modal.querySelector('[data-modal-close]').click();
    }
  });

  // Initial UI Render
  _renderStepUI();
})();

// ============================================================================
// Geo-Hazard Warning System (Gov GIS CLUP / PHIVOLCS / MGB Evaluation)
// ============================================================================
window.applySpatialHazardAssessment = function(inFloodZone, nearFaultLine) {
  var warningContainer = document.getElementById('hazardWarningBox');
  var warningText = document.getElementById('hazardWarningText');
  if (!warningContainer || !warningText) return;

  if (inFloodZone || nearFaultLine) {
    warningContainer.classList.remove('hidden');
    if (inFloodZone && nearFaultLine) {
      warningText.innerHTML = "⚠️ <b>CRITICAL RISK:</b> Property is located within a flood zone AND is within 50 meters of an active fault line.";
    } else if (inFloodZone) {
      warningText.innerHTML = "⚠️ <b>WARNING:</b> Property intersects with a designated Flood Hazard Zone.";
    } else if (nearFaultLine) {
      warningText.innerHTML = "⚠️ <b>WARNING:</b> Property is located within 50 meters of a Fault Line.";
    }
    try {
      warningContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {}
  } else {
    warningContainer.classList.add('hidden');
  }
};

window.testHazardWarning = function(scenario) {
  var warningContainer = document.getElementById('hazardWarningBox');
  var warningText = document.getElementById('hazardWarningText');
  if (!warningContainer || !warningText) return;

  var isCurrentlyHidden = warningContainer.classList.contains('hidden');

  if (isCurrentlyHidden || scenario) {
    warningContainer.classList.remove('hidden');
    if (scenario === 'fault') {
      warningText.innerHTML = "⚠️ <b>WARNING:</b> Property is located within 50 meters of a Fault Line.";
    } else if (scenario === 'dual') {
      warningText.innerHTML = "⚠️ <b>CRITICAL RISK:</b> Property is located within a flood zone AND is within 50 meters of an active fault line.";
    } else {
      // Default exact prompt text
      warningText.innerHTML = "⚠️ <b>CRITICAL RISK:</b> Property intersects with a designated Flood Hazard Zone.";
    }
    try {
      warningContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {}
  } else {
    warningContainer.classList.add('hidden');
  }
};

// Sync spatial landAreaInput with property editor fields
(function() {
  var areaInput = document.getElementById('landAreaInput');
  if (areaInput) {
    Object.defineProperty(areaInput, 'value', {
      set: function(val) {
        this.setAttribute('value', val);
        var num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
          if (typeof crudSyncArea === 'function') {
            crudSyncArea(num, 'sqm');
          }
          if (typeof crudUpdateLivePreview === 'function') {
            crudUpdateLivePreview();
          }
        }
      },
      get: function() {
        return this.getAttribute('value') || '';
      },
      configurable: true
    });
  }
})();
</script>
<?php sfc_render_footer($context); ?>
