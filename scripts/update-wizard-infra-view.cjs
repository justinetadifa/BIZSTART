const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../app/Support/property-wizard-view.php');
let content = fs.readFileSync(file, 'utf8');
const startTag = '          <!-- 2. INFRASTRUCTURE READINESS PANE';
const endTag = '          <!-- 3. ECONOMIC VIABILITY PANE -->';
const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);
if (startIndex === -1 || endIndex === -1) {
  console.error('Tags not found!');
  process.exit(1);
}

const newSection = `          <!-- 2. INFRASTRUCTURE READINESS PANE -->
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
                      <p>Illustrative scores from proposed rules, not verified LGU findings. The actual IAI requires city review and all seven criteria.</p>
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
          </div>\n\n`;

content = content.slice(0, startIndex) + newSection + content.slice(endIndex);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated property-wizard-view.php with new Infrastructure section!');
