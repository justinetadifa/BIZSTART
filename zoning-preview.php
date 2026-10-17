<?php
declare(strict_types=1);
require_once __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
sfc_render_head('Zoning Compatibility & Review | LOCUS-SF Preview', $context, ['page' => 'zoning-preview']);
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/property-wizard.css<?= sfc_asset_version('css/property-wizard.css') ?>">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<?php sfc_render_header($context, 'admin-properties'); ?>

<main class="city-container" style="max-width: 1240px; margin: 28px auto 60px; padding: 0 20px;">
  <div style="margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <a href="<?= htmlspecialchars(sfc_path('/seller-dashboard.php'), ENT_QUOTES, 'UTF-8') ?>" class="city-button city-button-secondary city-button-small">&larr; Back to Dashboard</a>
      <a href="<?= htmlspecialchars(sfc_path('/hazard-screening-preview.php'), ENT_QUOTES, 'UTF-8') ?>" class="city-button city-button-small" style="background: #11224d; color: #fff;">&larr; View Hazard Screening</a>
    </div>
    <div style="font-size: 13px; color: #64748B;">
      <span>Interactive Standalone Preview &bull; Local route: <code>/zoning-preview.php</code></span>
    </div>
  </div>

  <div class="pw-screening-container pw-zoning-criterion-card" style="box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-radius: 14px; border: 1px solid #E2E8F0; background: #fff; padding: 24px 28px;">
    <!-- Top Breadcrumb & Header matching screenshot -->
    <div class="pw-screening-header-bar">
      <div class="pw-screening-breadcrumb">
        <span>Properties</span>
        <span class="pw-bc-sep">/</span>
        <span data-screening-property-crumb>Sample lot A</span>
        <span class="pw-bc-sep">/</span>
        <span class="pw-bc-current">Zoning compatibility</span>
      </div>
      <div class="pw-screening-title-row">
        <div class="pw-screening-title-group">
          <div class="pw-screening-heading-wrap">
            <h1 class="pw-screening-title" style="margin: 0; font-size: 26px;">Zoning compatibility &amp; review</h1>
            <span class="pw-badge-design-concept">DESIGN CONCEPT</span>
          </div>
          <p class="pw-screening-subtitle">Record official CLUP classification and assess proposed activity compatibility.</p>
        </div>
        <div class="pw-screening-header-actions">
          <button type="button" class="pw-screening-btn pw-screening-btn-secondary" onclick="alert('Draft record saved locally.')">Save draft</button>
          <a href="<?= htmlspecialchars(sfc_path('/hazard-screening-preview.php'), ENT_QUOTES, 'UTF-8') ?>" class="pw-screening-btn pw-screening-btn-amber" style="text-decoration: none;">Submit for review</a>
        </div>
      </div>
    </div>

    <!-- Information Banner with Status Pill -->
    <div class="pw-screening-notice-banner">
      <div class="pw-notice-message">
        <span class="pw-notice-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </span>
        <span><strong>Official CPDO CLUP Layer (2026–2035)</strong> &middot; Evaluated under Ordinance No. 2018-06.</span>
      </div>
      <div class="pw-screening-status-pill">
        <span class="pw-status-dot-amber"></span>
        <span>Draft &middot; Not reviewed</span>
      </div>
    </div>

    <!-- Sub-tabs bar -->
    <div class="pw-screening-subtabs" role="tablist">
      <button type="button" class="pw-subtab-btn is-active" data-subtab="assessment_record">Assessment record</button>
      <button type="button" class="pw-subtab-btn" data-subtab="source_findings">Source findings</button>
      <button type="button" class="pw-subtab-btn" data-subtab="review_history">Review history</button>
    </div>

    <!-- Two Column Grid -->
    <div class="pw-screening-grid">
      <!-- LEFT COLUMN: Assessment Form & Findings -->
      <div class="pw-screening-col-main">
        
        <!-- 1. Location & Zoning District Card -->
        <div class="pw-screening-card">
          <div class="pw-card-header">
            <div class="pw-card-title-group">
              <span class="pw-step-number-circle">1</span>
              <h2 class="pw-card-title" style="font-size: 17px; margin: 0;">Location &amp; zoning district</h2>
            </div>
          </div>
          <div class="pw-card-body pw-location-assessed-grid">
            <div class="pw-location-form-fields">
              <label class="pw-sc-field">
                <span class="pw-sc-label">Property</span>
                <input type="text" class="pw-sc-input" value="Sample lot A (fictional)" placeholder="Property title">
              </label>

              <div class="pw-sc-latlng-row">
                <label class="pw-sc-field">
                  <span class="pw-sc-label">Barangay</span>
                  <input type="text" class="pw-sc-input" value="Sevilla" readonly style="background: #F8FAFC;">
                </label>
                <label class="pw-sc-field">
                  <span class="pw-sc-label">Recorded coordinates</span>
                  <input type="text" class="pw-sc-input" value="16.601144, 120.320479" readonly style="background: #F8FAFC;">
                </label>
              </div>

              <div class="pw-sc-scope-row">
                <label class="pw-sc-field pw-flex-grow">
                  <span class="pw-sc-label">Official zoning classification</span>
                  <select class="pw-sc-select" id="previewZoningSelect">
                    <option value="C-2">C-2 &mdash; Medium Commercial Zone</option>
                    <option value="C-1">C-1 &mdash; Low Commercial Zone</option>
                    <option value="C-3">C-3 &mdash; High Commercial Zone</option>
                    <option value="R-2">R-2 &mdash; Medium Density Residential</option>
                    <option value="R-3">R-3 &mdash; High Density Residential</option>
                    <option value="I-1">I-1 &mdash; Light Industrial Zone</option>
                    <option value="GC">GC &mdash; General Commercial</option>
                  </select>
                </label>
                <button type="button" class="pw-btn-check-location" onclick="alert('CPDO cadastral district confirmed: C-2 (Medium Commercial)')">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>Check district</span>
                </button>
              </div>

              <p class="pw-sc-caption">Classification originates from official CPDO Comprehensive Land Use Plan maps.</p>
            </div>

            <!-- Mini Map Preview with Polygon and Pin -->
            <div class="pw-screening-mini-map-box">
              <div id="previewZoningMiniMap" class="pw-screening-mini-map" style="height: 190px; width: 100%; border-radius: 8px;"></div>
              <div class="pw-map-corner-pill" style="background: rgba(13,148,136,0.9); color: #fff;">Zoning overlay</div>
            </div>
          </div>
        </div>

        <!-- 2. Source Document Card -->
        <div class="pw-screening-card">
          <div class="pw-card-header pw-card-header-flex">
            <div class="pw-card-title-group">
              <span class="pw-step-number-circle">2</span>
              <h2 class="pw-card-title" style="font-size: 17px; margin: 0;">Source document</h2>
            </div>
            <a href="https://sanfernandocity.gov.ph/" target="_blank" rel="noopener noreferrer" class="pw-btn-external-source">
              <span>Open CPDO CLUP</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
          <div class="pw-card-body">
            <label class="pw-sc-field">
              <span class="pw-sc-label">Source</span>
              <select class="pw-sc-select">
                <option value="San Fernando City CLUP (2026–2035) — Ordinance No. 2018-06" selected>San Fernando City CLUP (2026–2035) &mdash; Ordinance No. 2018-06</option>
                <option value="CPDO Locational Clearance Certificate">CPDO Locational Clearance Certificate</option>
                <option value="Zoning Certification of Land Classification">Zoning Certification of Land Classification</option>
              </select>
            </label>

            <div class="pw-sc-doc-meta-row">
              <label class="pw-sc-field">
                <span class="pw-sc-label">Date of zoning record</span>
                <div class="pw-input-with-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <input type="date" class="pw-sc-input" value="2026-01-15">
                </div>
              </label>
              <label class="pw-sc-field">
                <span class="pw-sc-label">Reference / ordinance section</span>
                <input type="text" class="pw-sc-input" value="CLUP-2018-06, Art. VI Sec. 18" placeholder="Paste source reference or ordinance link">
              </label>
            </div>

            <div class="pw-sc-upload-area-row">
              <div class="pw-sc-dropzone" onclick="document.getElementById('previewZoningFileInput').click()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <div class="pw-dropzone-text">
                  <strong>Upload zoning certificate or tax declaration</strong>
                  <span>PDF, JPG, PNG &middot; Subject to CPDO review</span>
                </div>
                <input type="file" id="previewZoningFileInput" style="display: none;" accept=".pdf,.jpg,.jpeg,.png">
              </div>

              <div class="pw-sc-file-chip" id="previewZoningChip">
                <div class="pw-pdf-badge-icon">PDF</div>
                <div class="pw-file-chip-meta">
                  <strong class="pw-file-chip-name">zoning-certificate-sevilla.pdf</strong>
                  <span class="pw-file-chip-caption">CPDO Document &middot; 315 KB</span>
                </div>
                <button type="button" class="pw-file-chip-remove" onclick="document.getElementById('previewZoningChip').style.display='none'">&times;</button>
              </div>
            </div>

            <p class="pw-sc-caption">Attach CPDO certificate or copy of approved locational clearance if issued.</p>
          </div>
        </div>

        <!-- 3. Allowed & Conditional Activities Card -->
        <div class="pw-screening-card">
          <div class="pw-card-header">
            <div class="pw-card-title-group">
              <span class="pw-step-number-circle">3</span>
              <h2 class="pw-card-title" style="font-size: 17px; margin: 0;">Proposed activity &amp; compatibility</h2>
            </div>
          </div>
          <div class="pw-card-body">
            <label class="pw-sc-field">
              <span class="pw-sc-label">Proposed business or investment use</span>
              <input type="text" class="pw-sc-input" value="Commercial Office / Retail Store" placeholder="e.g. Retail Store, Warehouse, Hotel, Cafe">
            </label>

            <div class="pw-screening-table-wrap" style="margin-top: 14px;">
              <table class="pw-screening-table">
                <thead>
                  <tr>
                    <th style="width: 32%;">Use classification</th>
                    <th style="width: 48%;">CLUP definition &amp; standard terms</th>
                    <th style="width: 20%;">Compatibility</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="pw-table-cell-hazard"><strong>Retail &amp; commercial office</strong></td>
                    <td>Principal conforming use in C-2; complies with standard commercial floor area ratio.</td>
                    <td><span class="pw-evidence-pill is-recorded" style="background: #ECFDF5; color: #047857; border-color: #A7F3D0;">Conforming</span></td>
                  </tr>
                  <tr>
                    <td class="pw-table-cell-hazard"><strong>Front setback requirement</strong></td>
                    <td>5.0 meters minimum setback from road right-of-way (National Highway/arterial).</td>
                    <td><span class="pw-evidence-pill is-recorded">Standard</span></td>
                  </tr>
                  <tr>
                    <td class="pw-table-cell-hazard"><strong>Side &amp; rear setbacks</strong></td>
                    <td>2.0 meters minimum side setback; firewalls governed by National Building Code.</td>
                    <td><span class="pw-evidence-pill is-recorded">Standard</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p class="pw-sc-caption" style="margin-top: 14px;">Locational clearance issued by CPDO is mandatory prior to construction or occupancy permit issuance.</p>
          </div>
        </div>

      </div>

      <!-- RIGHT COLUMN: Review Summary, Reviewer Workspace, Investor Status -->
      <div class="pw-screening-col-side">
        
        <!-- Review Summary Card -->
        <div class="pw-screening-card">
          <div class="pw-side-card-header">
            <span class="pw-side-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </span>
            <h2 class="pw-side-card-title" style="font-size: 16px; margin: 0;">Review summary</h2>
          </div>
          <div class="pw-card-body">
            <div class="pw-summary-assessed-block">
              <div class="pw-summary-circle-icon" style="background: #0D9488; opacity: 0.2;"></div>
              <div class="pw-summary-text-group">
                <strong class="pw-summary-status-heading">C-2 Medium Commercial</strong>
                <p class="pw-summary-status-desc">Permitted commercial activity aligns with CLUP.</p>
              </div>
            </div>

            <div class="pw-summary-dl-list">
              <div class="pw-summary-dl-row">
                <dt>Zoning district</dt>
                <dd>C-2 Medium Commercial</dd>
              </div>
              <div class="pw-summary-dl-row">
                <dt>Legal ordinance</dt>
                <dd>Ordinance No. 2018-06</dd>
              </div>
              <div class="pw-summary-dl-row">
                <dt>Reviewer</dt>
                <dd>CPDO Land Governance</dd>
              </div>
            </div>

            <div class="pw-summary-caution-banner" style="background: #EFF6FF; border-color: #BFDBFE; color: #1E40AF;">
              <span class="pw-caution-icon" style="background: #1D4ED8; color: #fff;">i</span>
              <span>Official municipal classification recorded.</span>
            </div>
          </div>
        </div>

        <!-- Reviewer Workspace Card -->
        <div class="pw-screening-card">
          <div class="pw-side-card-header pw-side-header-space">
            <div class="pw-side-title-icon-group">
              <span class="pw-side-card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </span>
              <h2 class="pw-side-card-title" style="font-size: 16px; margin: 0;">Reviewer workspace</h2>
            </div>
            <span class="pw-badge-authorized-reviewer">CPDO REVIEWER</span>
          </div>
          <div class="pw-card-body">
            <div class="pw-reviewer-info-alert">
              <span class="pw-info-circle-icon">ℹ</span>
              <span>Available after submission.</span>
            </div>

            <div class="pw-reviewer-checklist">
              <label class="pw-checklist-item">
                <input type="checkbox" disabled checked>
                <span>Zone verified against official CPDO GIS overlay</span>
              </label>
              <label class="pw-checklist-item">
                <input type="checkbox" disabled checked>
                <span>Proposed activity is permitted under Ordinance 2018-06</span>
              </label>
              <label class="pw-checklist-item">
                <input type="checkbox" disabled checked>
                <span>Building setback rules noted</span>
              </label>
              <label class="pw-checklist-item">
                <input type="checkbox" disabled checked>
                <span>Locational clearance prerequisites identified</span>
              </label>
            </div>

            <label class="pw-sc-field" style="margin-top: 14px;">
              <span class="pw-sc-label">Review decision</span>
              <select class="pw-sc-select" disabled>
                <option value="Conforming use approved" selected>Conforming use approved</option>
                <option value="Conditional approval">Conditional approval</option>
                <option value="Variance / Special permit required">Variance / Special permit required</option>
              </select>
            </label>

            <button type="button" class="pw-btn-save-review" disabled>Save review</button>
          </div>
        </div>

        <!-- Investor-Facing Status Card -->
        <div class="pw-screening-card">
          <div class="pw-side-card-header">
            <span class="pw-side-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </span>
            <h2 class="pw-side-card-title" style="font-size: 16px; margin: 0;">Investor-facing status</h2>
          </div>
          <div class="pw-card-body">
            <div class="pw-investor-status-alert" style="background: #F0FDF4; border-color: #BBF7D0;">
              <div class="pw-investor-alert-icon" style="color: #16A34A;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div class="pw-investor-alert-content">
                <strong style="color: #15803D;">Conforming Commercial Use</strong>
                <p style="color: #166534;">Property classification aligns with intended commercial development under CLUP Ordinance No. 2018-06.</p>
              </div>
            </div>

            <p class="pw-investor-status-footer">Official zoning and permitted activities will display on investor listing brief.</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</main>

<script>
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Mini Map Preview
  const lat = 16.601144;
  const lng = 120.320479;
  const mapContainer = document.getElementById('previewZoningMiniMap');
  if (mapContainer && typeof L !== 'undefined') {
    const map = L.map('previewZoningMiniMap', { zoomControl: false, attributionControl: false }).setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    
    // Lot boundary polygon matching design mockup
    const polygon = L.polygon([
      [lat + 0.0006, lng - 0.0004],
      [lat + 0.0009, lng + 0.0003],
      [lat + 0.0001, lng + 0.0008],
      [lat - 0.0005, lng + 0.0005],
      [lat - 0.0003, lng - 0.0001],
      [lat - 0.0006, lng - 0.0002]
    ], {
      color: '#0D9488',
      weight: 2,
      fillColor: '#CCFBF1',
      fillOpacity: 0.45
    }).addTo(map);

    L.marker([lat, lng]).addTo(map);
    map.fitBounds(polygon.getBounds(), { padding: [15, 15] });
  }

  // 2. Subtab toggles
  document.querySelectorAll('.pw-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pw-subtab-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });
});
</script>

<?php sfc_render_footer($context); ?>
