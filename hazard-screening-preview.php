<?php
declare(strict_types=1);
require_once __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
sfc_render_head('Hazard Screening & Review | LOCUS-SF Preview', $context, ['page' => 'hazard-screening-preview']);
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/property-wizard.css<?= sfc_asset_version('css/property-wizard.css') ?>">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<?php sfc_render_header($context, 'admin-properties'); ?>

<main class="city-container" style="max-width: 1240px; margin: 28px auto 60px; padding: 0 20px;">
  <div style="margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <a href="<?= htmlspecialchars(sfc_path('/seller-dashboard.php'), ENT_QUOTES, 'UTF-8') ?>" class="city-button city-button-secondary city-button-small">&larr; Back to Dashboard</a>
      <a href="<?= htmlspecialchars(sfc_path('/zoning-preview.php'), ENT_QUOTES, 'UTF-8') ?>" class="city-button city-button-small" style="background: #11224d; color: #fff;">View Zoning Compatibility &rarr;</a>
    </div>
    <div style="font-size: 13px; color: #64748B;">
      <span>Interactive Standalone Preview &bull; Local route: <code>/hazard-screening-preview.php</code></span>
    </div>
  </div>

  <div class="pw-screening-container pw-risk-criterion-card" style="box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-radius: 14px; border: 1px solid #E2E8F0; background: #fff; padding: 24px 28px;">
    <!-- Top Breadcrumb & Header matching screenshot -->
    <div class="pw-screening-header-bar">
      <div class="pw-screening-breadcrumb">
        <span>Properties</span>
        <span class="pw-bc-sep">/</span>
        <span data-screening-property-crumb>Sample lot A</span>
        <span class="pw-bc-sep">/</span>
        <span class="pw-bc-current">Hazard screening</span>
      </div>
      <div class="pw-screening-title-row">
        <div class="pw-screening-title-group">
          <div class="pw-screening-heading-wrap">
            <h1 class="pw-screening-title" style="margin: 0; font-size: 26px;">Hazard screening &amp; review</h1>
            <span class="pw-badge-design-concept">DESIGN CONCEPT</span>
          </div>
          <p class="pw-screening-subtitle">Record source findings and review their relevance to this property.</p>
        </div>
        <div class="pw-screening-header-actions">
          <button type="button" class="pw-screening-btn pw-screening-btn-secondary" onclick="alert('Draft record saved locally.')">Save draft</button>
          <a href="<?= htmlspecialchars(sfc_path('/zoning-preview.php'), ENT_QUOTES, 'UTF-8') ?>" class="pw-screening-btn pw-screening-btn-amber" style="text-decoration: none;">Submit for review</a>
        </div>
      </div>
    </div>

    <!-- Information Banner with Status Pill -->
    <div class="pw-screening-notice-banner">
      <div class="pw-notice-message">
        <span class="pw-notice-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </span>
        <span><strong>Separate screening record</strong> &middot; No numerical IAI contribution in this proposed workflow.</span>
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
        
        <!-- 1. Location Assessed Card -->
        <div class="pw-screening-card">
          <div class="pw-card-header">
            <div class="pw-card-title-group">
              <span class="pw-step-number-circle">1</span>
              <h2 class="pw-card-title" style="font-size: 17px; margin: 0;">Location assessed</h2>
            </div>
          </div>
          <div class="pw-card-body pw-location-assessed-grid">
            <div class="pw-location-form-fields">
              <label class="pw-sc-field">
                <span class="pw-sc-label">Property</span>
                <input type="text" class="pw-sc-input" id="previewPropertyName" value="Sample lot A (fictional)" placeholder="Property title">
              </label>

              <div class="pw-sc-latlng-row">
                <label class="pw-sc-field">
                  <span class="pw-sc-label">Latitude</span>
                  <input type="text" class="pw-sc-input" id="previewLat" value="16.601144" placeholder="Enter coordinates">
                </label>
                <label class="pw-sc-field">
                  <span class="pw-sc-label">Longitude</span>
                  <input type="text" class="pw-sc-input" id="previewLng" value="120.320479" placeholder="Enter coordinates">
                </label>
              </div>

              <div class="pw-sc-scope-row">
                <label class="pw-sc-field pw-flex-grow">
                  <span class="pw-sc-label">Assessment scope</span>
                  <select class="pw-sc-select" id="previewScope">
                    <option value="Selected point" selected>Selected point</option>
                    <option value="Drawn parcel boundary">Drawn parcel boundary</option>
                    <option value="Buffered radius (100m)">Buffered radius (100m)</option>
                  </select>
                </label>
                <button type="button" class="pw-btn-check-location" id="previewCheckLocation">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>Check location</span>
                </button>
              </div>

              <p class="pw-sc-caption">A selected-point report does not describe exposure across the entire parcel.</p>
            </div>

            <!-- Mini Map Preview with Polygon and Pin -->
            <div class="pw-screening-mini-map-box">
              <div id="previewMiniMap" class="pw-screening-mini-map" style="height: 190px; width: 100%; border-radius: 8px;"></div>
              <div class="pw-map-corner-pill">Illustrative location</div>
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
            <a href="https://hazardhunter.georisk.gov.ph/" target="_blank" rel="noopener noreferrer" class="pw-btn-external-source">
              <span>Open HazardHunterPH</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
          <div class="pw-card-body">
            <label class="pw-sc-field">
              <span class="pw-sc-label">Source</span>
              <select class="pw-sc-select" id="previewSourceSelect">
                <option value="HazardHunterPH — indicative report" selected>HazardHunterPH &mdash; indicative report</option>
                <option value="DOST-PHIVOLCS Official Hazard Assessment">DOST-PHIVOLCS Official Hazard Assessment</option>
                <option value="DENR-MGB Geohazard Survey">DENR-MGB Geohazard Survey</option>
                <option value="City Disaster Risk Reduction & Management Office (CDRRMO)">City Disaster Risk Reduction &amp; Management Office (CDRRMO)</option>
              </select>
            </label>

            <div class="pw-sc-doc-meta-row">
              <label class="pw-sc-field">
                <span class="pw-sc-label">Report generated on</span>
                <div class="pw-input-with-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <input type="date" class="pw-sc-input" id="previewReportDate" value="<?= date('Y-m-d') ?>">
                </div>
              </label>
              <label class="pw-sc-field">
                <span class="pw-sc-label">Reference / report link</span>
                <input type="text" class="pw-sc-input" id="previewReportRef" value="HH-2026-SF-004289" placeholder="Paste source reference or URL">
              </label>
            </div>

            <div class="pw-sc-upload-area-row">
              <div class="pw-sc-dropzone" id="previewDropzone" onclick="document.getElementById('previewFileInput').click()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <div class="pw-dropzone-text">
                  <strong>Upload assessment report or supporting map</strong>
                  <span>PDF, JPG, PNG &middot; Subject to review</span>
                </div>
                <input type="file" id="previewFileInput" style="display: none;" accept=".pdf,.jpg,.jpeg,.png">
              </div>

              <div class="pw-sc-file-chip" id="previewFileChip">
                <div class="pw-pdf-badge-icon">PDF</div>
                <div class="pw-file-chip-meta">
                  <strong class="pw-file-chip-name">sample-assessment.pdf</strong>
                  <span class="pw-file-chip-caption">Demo attachment &middot; 482 KB</span>
                </div>
                <button type="button" class="pw-file-chip-remove" id="previewRemoveChip" title="Remove attachment" aria-label="Remove attachment">&times;</button>
              </div>
            </div>

            <p class="pw-sc-caption">Store the report date separately from the upload date.</p>
          </div>
        </div>

        <!-- 3. Reported Findings Card -->
        <div class="pw-screening-card">
          <div class="pw-card-header">
            <div class="pw-card-title-group">
              <span class="pw-step-number-circle">3</span>
              <h2 class="pw-card-title" style="font-size: 17px; margin: 0;">Reported findings</h2>
            </div>
          </div>
          <div class="pw-card-body">
            <div class="pw-screening-table-wrap">
              <table class="pw-screening-table" id="previewFindingsTable">
                <thead>
                  <tr>
                    <th style="width: 28%;">Hazard</th>
                    <th style="width: 52%;">Source finding</th>
                    <th style="width: 20%;">Evidence</th>
                  </tr>
                </thead>
                <tbody id="previewFindingsBody">
                  <tr data-hazard-row="flood">
                    <td class="pw-table-cell-hazard"><strong>Flood</strong></td>
                    <td>
                      <input type="text" class="pw-table-input" value="Low susceptibility; outside 100-year flood fringe" placeholder="Enter exact source finding">
                    </td>
                    <td><span class="pw-evidence-pill is-recorded">Recorded</span></td>
                  </tr>
                  <tr data-hazard-row="rain_landslide">
                    <td class="pw-table-cell-hazard"><strong>Rain-induced landslide</strong></td>
                    <td>
                      <input type="text" class="pw-table-input" value="Low susceptibility; stable slope (2-5% gradient)" placeholder="Enter exact source finding">
                    </td>
                    <td><span class="pw-evidence-pill is-recorded">Recorded</span></td>
                  </tr>
                  <tr data-hazard-row="active_fault">
                    <td class="pw-table-cell-hazard"><strong>Active fault</strong></td>
                    <td>
                      <input type="text" class="pw-table-input" value="Approx. 14.8 km east of Northern Luzon active segment" placeholder="Record reported distance or wording">
                    </td>
                    <td><span class="pw-evidence-pill is-recorded">Recorded</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="pw-table-action-row" style="margin-top: 14px;">
              <button type="button" class="pw-btn-add-finding" id="previewAddFindingBtn">
                <span class="pw-add-plus">+</span>
                <span>Add hazard finding</span>
              </button>
            </div>

            <p class="pw-sc-caption">Retain source wording and units. Do not infer safety from a blank result.</p>

            <!-- Technical details toggle -->
            <details class="pw-tech-details" style="margin-top: 20px; border-top: 1px dashed #E2E8F0; padding-top: 14px;">
              <summary class="pw-tech-summary" style="font-size: 13px; font-weight: 600; color: #475569; cursor: pointer;">
                <span>Detailed MCE 6-Hazard Breakdown &amp; Agency Layers</span>
              </summary>
              <div style="margin-top: 12px; font-size: 12px; color: #475569; line-height: 1.6;">
                <p>Official LOCUS-SF 6-factor hazard weights: Flood (25%), Active fault (25%), Rain landslide (15%), Storm surge (15%), Liquefaction (10%), Tsunami (10%).</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 10px;">
                  <div style="padding: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                    <strong>Flood (25%)</strong><br><span style="color: #64748B;">DENR-MGB Layer</span>
                  </div>
                  <div style="padding: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                    <strong>Active Fault (25%)</strong><br><span style="color: #64748B;">DOST-PHIVOLCS Buffer</span>
                  </div>
                  <div style="padding: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                    <strong>Rain Landslide (15%)</strong><br><span style="color: #64748B;">DENR-MGB Layer</span>
                  </div>
                  <div style="padding: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                    <strong>Storm Surge (15%)</strong><br><span style="color: #64748B;">DOST-PAGASA Layer</span>
                  </div>
                  <div style="padding: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                    <strong>Liquefaction (10%)</strong><br><span style="color: #64748B;">DOST-PHIVOLCS Layer</span>
                  </div>
                  <div style="padding: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                    <strong>Tsunami (10%)</strong><br><span style="color: #64748B;">DOST-PHIVOLCS Layer</span>
                  </div>
                </div>
              </div>
            </details>
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
              <div class="pw-summary-circle-icon"></div>
              <div class="pw-summary-text-group">
                <strong class="pw-summary-status-heading">Not assessed</strong>
                <p class="pw-summary-status-desc">No source findings have been reviewed.</p>
              </div>
            </div>

            <div class="pw-summary-dl-list">
              <div class="pw-summary-dl-row">
                <dt>Assessment scope</dt>
                <dd id="previewSummaryScope">Selected point</dd>
              </div>
              <div class="pw-summary-dl-row">
                <dt>Source type</dt>
                <dd id="previewSummarySource">Indicative report</dd>
              </div>
              <div class="pw-summary-dl-row">
                <dt>Reviewer</dt>
                <dd>Awaiting assignment</dd>
              </div>
            </div>

            <div class="pw-summary-caution-banner">
              <span class="pw-caution-icon">!</span>
              <span>Reference information, not a hazard clearance.</span>
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
            <span class="pw-badge-authorized-reviewer">AUTHORIZED REVIEWER</span>
          </div>
          <div class="pw-card-body">
            <div class="pw-reviewer-info-alert">
              <span class="pw-info-circle-icon">ℹ</span>
              <span>Available after submission.</span>
            </div>

            <div class="pw-reviewer-checklist">
              <label class="pw-checklist-item">
                <input type="checkbox" disabled>
                <span>Coordinates match the source record</span>
              </label>
              <label class="pw-checklist-item">
                <input type="checkbox" disabled>
                <span>Document and reference are readable</span>
              </label>
              <label class="pw-checklist-item">
                <input type="checkbox" disabled>
                <span>Findings match the source wording</span>
              </label>
              <label class="pw-checklist-item">
                <input type="checkbox" disabled>
                <span>Scope and limitations are recorded</span>
              </label>
            </div>

            <label class="pw-sc-field" style="margin-top: 14px;">
              <span class="pw-sc-label">Review decision</span>
              <select class="pw-sc-select" disabled>
                <option value="">Select decision</option>
                <option value="Accepted without reservations">Accepted without reservations</option>
                <option value="Accepted with noted limitations">Accepted with noted limitations</option>
                <option value="Requires re-assessment">Requires re-assessment</option>
              </select>
            </label>

            <label class="pw-sc-field">
              <span class="pw-sc-label">Limitations / follow-up</span>
              <textarea class="pw-sc-textarea" rows="2" placeholder="Record missing evidence or required clarification." disabled></textarea>
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
            <div class="pw-investor-status-alert">
              <div class="pw-investor-alert-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div class="pw-investor-alert-content">
                <strong>Hazard information pending review</strong>
                <p>Source-based screening is incomplete. No safety conclusion is available.</p>
              </div>
            </div>

            <p class="pw-investor-status-footer">Show source, date, scope, and review status.</p>
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
  const mapContainer = document.getElementById('previewMiniMap');
  if (mapContainer && typeof L !== 'undefined') {
    const map = L.map('previewMiniMap', { zoomControl: false, attributionControl: false }).setView([lat, lng], 16);
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
      color: '#1E40AF',
      weight: 2,
      fillColor: '#DBEAFE',
      fillOpacity: 0.35
    }).addTo(map);

    // Pin inside polygon
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

  // 3. File remove
  document.getElementById('previewRemoveChip')?.addEventListener('click', () => {
    document.getElementById('previewFileChip').style.display = 'none';
  });

  // 4. Add Hazard Finding button
  document.getElementById('previewAddFindingBtn')?.addEventListener('click', () => {
    const tbody = document.getElementById('previewFindingsBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="pw-table-cell-hazard">
        <input type="text" class="pw-table-input" placeholder="Hazard name" style="font-weight: 600;">
      </td>
      <td>
        <input type="text" class="pw-table-input" placeholder="Enter reported finding">
      </td>
      <td><span class="pw-evidence-pill is-recorded">Recorded</span></td>
    `;
    tbody.appendChild(tr);
  });

  // 5. Check location button feedback
  document.getElementById('previewCheckLocation')?.addEventListener('click', () => {
    alert('Location confirmed within San Fernando City boundaries (Lat: 16.601144, Lng: 120.320479).');
  });
});
</script>

<?php sfc_render_footer($context); ?>
