const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../app/Support/property-wizard-view.php');
let content = fs.readFileSync(file, 'utf8');

const startTag = '          <!-- 3. ECONOMIC VIABILITY PANE -->';
const endTag = '          <!-- 4. NEARBY BUSINESSES PANE -->';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.error('Economic Viability tags not found!');
  process.exit(1);
}

const newPane = `          <!-- 3. ECONOMIC VIABILITY PANE -->
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
`;

content = content.slice(0, startIndex) + newPane + content.slice(endIndex);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated property-wizard-view.php with new Economic Viability section!');
