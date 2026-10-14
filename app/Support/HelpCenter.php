<?php
declare(strict_types=1);

namespace App\Support;

class HelpCenter
{
    public static function render(): void
    {
        ?>
        <!-- Floating (?) Help Center trigger -->
        <button type="button" class="locus-floating-help-btn no-print" data-locus-help-trigger data-locus-help-tab="scores" aria-haspopup="dialog" aria-controls="locusHelpDialog" aria-label="Open LOCUS-SF Help &amp; FAQs" title="Help &amp; FAQs">
            <svg class="locus-floating-help-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span class="locus-help-sr-only">Help &amp; FAQs</span>
        </button>

        <!-- LOCUS-SF Help Center Dialog -->
        <dialog class="locus-help-dialog no-print" id="locusHelpDialog" aria-labelledby="locusHelpDialogTitle" aria-modal="true">
            <div class="locus-help-container">
                <!-- Mobile Drag Sheet Handle -->
                <div class="locus-help-sheet-handle" aria-hidden="true"></div>

                <div class="locus-help-top-bar">
                    <div class="locus-help-breadcrumb">
                        <strong>LOCUS-SF</strong>
                        <span aria-hidden="true">/</span>
                        <span>Help center</span>
                    </div>
                    <div class="locus-help-top-actions">
                        <button type="button" class="locus-help-sound-btn" id="locusHelpSoundIndicator" data-open-sound-tab aria-label="Interface sound settings" title="Interface sounds">
                            <span class="city-sound-icon-wrap" aria-hidden="true">
                                <svg class="city-sound-icon-muted" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <line x1="23" y1="9" x2="17" y2="15"></line>
                                    <line x1="17" y1="9" x2="23" y2="15"></line>
                                </svg>
                                <svg class="city-sound-icon-active" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                </svg>
                            </span>
                            <span class="locus-sound-indicator-text" id="locusSoundIndicatorText">Sound: OFF</span>
                        </button>
                        <button type="button" class="locus-help-close-btn" id="locusHelpCloseBtn" aria-label="Close help center">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="locus-help-content">
                    <!-- Tab Navigation (iOS/macOS style segmented control with responsive labels) -->
                    <div class="locus-help-tabs" role="tablist" aria-label="Help topics">
                        <button type="button" class="locus-help-tab-btn is-active" role="tab" id="locusTabScores" data-locus-tab="scores" aria-selected="true" aria-controls="locusPanelScores">
                            <svg class="locus-tab-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                            <span class="locus-tab-label"><span class="locus-tab-text-full">Scores &amp; criteria</span><span class="locus-tab-text-short">Scores</span></span>
                        </button>
                        <button type="button" class="locus-help-tab-btn" role="tab" id="locusTabUsing" data-locus-tab="using" aria-selected="false" aria-controls="locusPanelUsing">
                            <svg class="locus-tab-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            <span class="locus-tab-label"><span class="locus-tab-text-full">Using LOCUS-SF</span><span class="locus-tab-text-short">Guide</span></span>
                        </button>
                        <button type="button" class="locus-help-tab-btn" role="tab" id="locusTabSounds" data-locus-tab="sounds" aria-selected="false" aria-controls="locusPanelSounds">
                            <svg class="locus-tab-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                            <span class="locus-tab-label"><span class="locus-tab-text-full">Interface sounds</span><span class="locus-tab-text-short">Sounds</span></span>
                        </button>
                        <button type="button" class="locus-help-tab-btn" role="tab" id="locusTabTeam" data-locus-tab="team" aria-selected="false" aria-controls="locusPanelTeam">
                            <svg class="locus-tab-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            <span class="locus-tab-label"><span class="locus-tab-text-full">Contact team</span><span class="locus-tab-text-short">Team</span></span>
                        </button>
                    </div>

                    <!-- TAB 1: Scores & Criteria Panel -->
                    <div class="locus-help-tab-panel" id="locusPanelScores" data-locus-panel="scores" role="tabpanel" aria-labelledby="locusTabScores">
                        <!-- Subview 1A: Common Questions -->
                        <div id="locusHelpCommonQuestions">
                            <div class="locus-help-header-wrap">
                                <h2 class="locus-help-title" id="locusHelpDialogTitle">Common questions</h2>
                                <p class="locus-help-subtitle">Understand the scores. Know what to check.</p>
                            </div>

                            <div class="locus-accordion-group">
                                <!-- FAQ 01: What is MCE? -->
                                <div class="locus-accordion-item is-expanded" data-faq-id="mce">
                                    <button type="button" class="locus-accordion-header" aria-expanded="true" aria-controls="locusFaqMceBody">
                                        <div class="locus-accordion-header-left">
                                            <span class="locus-accordion-num">01</span>
                                            <span class="locus-accordion-title">What is MCE?</span>
                                        </div>
                                        <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        </span>
                                    </button>
                                    <div class="locus-accordion-body" id="locusFaqMceBody">
                                        <p>MCE stands for Multi-Criteria Evaluation. It combines several aspects of a property into a structured assessment, so the site is not judged using a single characteristic.</p>
                                        <p>In the current LOCUS-SF screen, six criteria receive ratings from 0 to 100. Higher ratings represent more favorable conditions under the selected assessment rules. Each rating is multiplied by its assigned weight, and the resulting contributions are added to produce the MCE score.</p>
                                        <a href="#" class="locus-accordion-link locus-to-criteria-view">Explore the six criteria &rarr;</a>
                                    </div>
                                </div>

                                <!-- FAQ 02: What is IAI? -->
                                <div class="locus-accordion-item" data-faq-id="iai">
                                    <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusFaqIaiBody">
                                        <div class="locus-accordion-header-left">
                                            <span class="locus-accordion-num">02</span>
                                            <span class="locus-accordion-title">What is IAI?</span>
                                        </div>
                                        <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        </span>
                                    </button>
                                    <div class="locus-accordion-body" id="locusFaqIaiBody" hidden>
                                        <p>IAI is the overall investment index displayed for the property. The current version labels it Investment Alignment Index.</p>
                                        <p>In the displayed model, IAI combines 60% of the rounded MCE score, 20% of the economic viability rating and 20% of the infrastructure readiness rating. This gives economic viability and infrastructure readiness additional influence beyond their existing contributions to MCE.</p>
                                        <p>The result summarizes the property under that model. It is not a percentage probability of business success or a forecast of investment returns.</p>
                                        <a href="#" class="locus-accordion-link locus-view-property-evidence">View the calculation &rarr;</a>
                                    </div>
                                </div>

                                <!-- FAQ 03: What does each criterion mean? -->
                                <div class="locus-accordion-item" data-faq-id="criteria_overview">
                                    <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusFaqCritOverviewBody">
                                        <div class="locus-accordion-header-left">
                                            <span class="locus-accordion-num">03</span>
                                            <span class="locus-accordion-title">What does each criterion mean?</span>
                                        </div>
                                        <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        </span>
                                    </button>
                                    <div class="locus-accordion-body" id="locusFaqCritOverviewBody" hidden>
                                        <p>Each of the six criteria evaluates a distinct condition: spatial accessibility, infrastructure readiness, economic viability, nearby businesses, zoning compatibility, and risk constraints.</p>
                                        <a href="#" class="locus-accordion-link locus-to-criteria-view">Explore the six criteria &rarr;</a>
                                    </div>
                                </div>

                                <!-- FAQ 04: How do ratings, weights and points differ? -->
                                <div class="locus-accordion-item" data-faq-id="ratings_weights">
                                    <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusFaqWeightsBody">
                                        <div class="locus-accordion-header-left">
                                            <span class="locus-accordion-num">04</span>
                                            <span class="locus-accordion-title">How do ratings, weights and points differ?</span>
                                        </div>
                                        <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        </span>
                                    </button>
                                    <div class="locus-accordion-body" id="locusFaqWeightsBody" hidden>
                                        <p>A rating is the result assigned to one criterion, on a scale of 0 to 100.</p>
                                        <p>A weight is the percentage assigned to that criterion in the MCE calculation.</p>
                                        <p>A contribution is the number of points that criterion adds to MCE. For example, a rating of 70 with a weight of 20% contributes 14 points: 70 &times; 20 &divide; 100 = 14.</p>
                                        <p>A weight describes the model's assigned emphasis; it is not a measured probability.</p>
                                    </div>
                                </div>

                                <!-- FAQ 05: Does a high score guarantee a good investment? -->
                                <div class="locus-accordion-item" data-faq-id="guarantee">
                                    <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusFaqGuaranteeBody">
                                        <div class="locus-accordion-header-left">
                                            <span class="locus-accordion-num">05</span>
                                            <span class="locus-accordion-title">Does a high score guarantee a good investment?</span>
                                        </div>
                                        <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        </span>
                                    </button>
                                    <div class="locus-accordion-body" id="locusFaqGuaranteeBody" hidden>
                                        <p>No. A high score indicates that the property performs favorably under the criteria, data and rules used for that assessment.</p>
                                        <p>The score does not establish profitability, confirm ownership, issue a permit or replace site inspection and required clearances. Use the underlying evidence, property details and intended business requirements when considering a site.</p>
                                    </div>
                                </div>

                                <!-- FAQ 06: Why is a score unavailable? -->
                                <div class="locus-accordion-item" data-faq-id="unavailable">
                                    <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusFaqUnavailableBody">
                                        <div class="locus-accordion-header-left">
                                            <span class="locus-accordion-num">06</span>
                                            <span class="locus-accordion-title">Why is a score unavailable?</span>
                                        </div>
                                        <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        </span>
                                    </button>
                                    <div class="locus-accordion-body" id="locusFaqUnavailableBody" hidden>
                                        <p>A score may be unavailable when a required rating, supporting record or scoring rule is missing or still needs review. The current displayed MCE method requires all seven ratings.</p>
                                        <p>Check the assessment status to see what information is needed. An unavailable score should be shown as Not calculated or Awaiting review, with a specific reason. It should not appear as zero or as a completed assessment.</p>
                                    </div>
                                </div>

                                <!-- FAQ 07: Where do the weights come from? -->
                                <div class="locus-accordion-item" data-faq-id="weights_origin">
                                    <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusFaqOriginBody">
                                        <div class="locus-accordion-header-left">
                                            <span class="locus-accordion-num">07</span>
                                            <span class="locus-accordion-title">Where do the weights come from?</span>
                                        </div>
                                        <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        </span>
                                    </button>
                                    <div class="locus-accordion-body" id="locusFaqOriginBody" hidden>
                                        <p>The calculation panel shows the weights configured for the assessment. They determine how strongly each criterion contributes to the result.</p>
                                        <p>The methodology record should identify how those weights were selected and reviewed. The presence of a numerical weight does not by itself establish that the weight has been validated.</p>
                                    </div>
                                </div>
                            </div>

                            <div class="locus-help-footer-action">
                                <span class="locus-help-footer-text">Still have a question?</span>
                                <button type="button" class="locus-help-action-btn locus-to-team-tab">Contact the team &rarr;</button>
                            </div>
                        </div>

                        <!-- Subview 1B: Seven Criteria Detail View -->
                        <div id="locusHelpSevenCriteria" hidden>
                            <div class="locus-help-header-wrap">
                                <button type="button" class="locus-help-back-link locus-to-common-view">&larr; Back to common questions</button>
                                <h2 class="locus-help-title">Understand the six criteria</h2>
                                <p class="locus-help-subtitle">What each rating describes, in plain language.</p>
                                <div class="locus-help-notice-banner">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                    <span>Higher ratings are more favorable. They do not certify a site as risk-free.</span>
                                </div>
                            </div>

                            <div class="locus-criteria-grid">
                                <!-- Left Column: 7 Criterion Accordions -->
                                <div class="locus-accordion-group">
                                    <!-- 01: Spatial accessibility -->
                                    <div class="locus-accordion-item" data-criterion-key="spatial_accessibility">
                                        <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusCritSpatialBody">
                                            <div class="locus-accordion-header-left">
                                                <span class="locus-accordion-num">01</span>
                                                <span class="locus-accordion-title">Spatial accessibility</span>
                                            </div>
                                            <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                            </span>
                                        </button>
                                        <div class="locus-accordion-body" id="locusCritSpatialBody" hidden>
                                            <p><strong>Short tooltip:</strong> How readily the site can be reached through the access network considered by the assessment.</p>
                                            <p>Spatial accessibility describes the site's connection to roads, transport and relevant destinations. Its rating should be read with the recorded access indicators and the rule used to convert them into a score.</p>
                                            <p>A short distance to a road does not by itself confirm a legal entrance, suitable road conditions or a usable route. Identify whether a displayed distance is straight-line or route-based.</p>
                                            <a href="#" class="locus-accordion-link locus-view-property-evidence">View this property's evidence &rarr;</a>
                                        </div>
                                    </div>

                                    <!-- 02: Infrastructure readiness -->
                                    <div class="locus-accordion-item is-expanded" data-criterion-key="infrastructure_readiness">
                                        <button type="button" class="locus-accordion-header" aria-expanded="true" aria-controls="locusCritInfraBody">
                                            <div class="locus-accordion-header-left">
                                                <span class="locus-accordion-num">02</span>
                                                <span class="locus-accordion-title">Infrastructure readiness</span>
                                            </div>
                                            <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                            </span>
                                        </button>
                                        <div class="locus-accordion-body" id="locusCritInfraBody">
                                            <p><strong>Short tooltip:</strong> The availability of basic services needed to operate at the site.</p>
                                            <p>Infrastructure readiness describes the availability of services such as electricity, water and communications. The criterion should be based on the services and evidence actually included in the assessment.</p>
                                            <p>Read the rating alongside its recorded evidence. Nearby utility lines alone do not confirm a connection or sufficient capacity for the proposed business.</p>
                                            <a href="#" class="locus-accordion-link locus-view-property-evidence">View this property's evidence &rarr;</a>
                                        </div>
                                    </div>

                                    <!-- 03: Economic viability -->
                                    <div class="locus-accordion-item" data-criterion-key="economic_viability">
                                        <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusCritEconBody">
                                            <div class="locus-accordion-header-left">
                                                <span class="locus-accordion-num">03</span>
                                                <span class="locus-accordion-title">Economic viability</span>
                                            </div>
                                            <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                            </span>
                                        </button>
                                        <div class="locus-accordion-body" id="locusCritEconBody" hidden>
                                            <p><strong>Short tooltip:</strong> Economic conditions represented by the model's documented indicators.</p>
                                            <p>Economic viability describes how the economic indicators included in the assessment support the proposed investment. The meaning of its rating depends on the actual inputs and conversion rule used.</p>
                                            <p>For example, information about land cost can support a cost comparison, but it cannot by itself establish business profitability. This rating should not be presented as projected income, return on investment or a financial feasibility study.</p>
                                            <a href="#" class="locus-accordion-link locus-view-property-evidence">View this property's evidence &rarr;</a>
                                        </div>
                                    </div>

                                    <!-- 04: Nearby businesses -->
                                    <div class="locus-accordion-item" data-criterion-key="nearby_businesses">
                                        <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusCritBizBody">
                                            <div class="locus-accordion-header-left">
                                                <span class="locus-accordion-num">04</span>
                                                <span class="locus-accordion-title">Nearby businesses</span>
                                            </div>
                                            <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                            </span>
                                        </button>
                                        <div class="locus-accordion-body" id="locusCritBizBody" hidden>
                                            <p><strong>Short tooltip:</strong> The surrounding business mix considered in relation to the proposed use.</p>
                                            <p>Nearby businesses describes the establishments around a property and their possible relationship to the proposed business. Depending on their activities, surrounding establishments may be competitors, complementary services or simply part of the local commercial context.</p>
                                            <p>A place appearing within the radar radius does not automatically make it a competitor or prove customer demand. Business categories, the intended use and data coverage must be considered when interpreting the rating.</p>
                                            <a href="#" class="locus-accordion-link locus-view-property-evidence">View this property's evidence &rarr;</a>
                                        </div>
                                    </div>

                                    <!-- 05: Zoning compatibility -->
                                    <div class="locus-accordion-item" data-criterion-key="zoning_compatibility">
                                        <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusCritZoningBody">
                                            <div class="locus-accordion-header-left">
                                                <span class="locus-accordion-num">05</span>
                                                <span class="locus-accordion-title">Zoning compatibility</span>
                                            </div>
                                            <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                            </span>
                                        </button>
                                        <div class="locus-accordion-body" id="locusCritZoningBody" hidden>
                                            <p><strong>Short tooltip:</strong> How the proposed use relates to the land-use classification and rules recorded for the site.</p>
                                            <p>Zoning compatibility describes whether the proposed activity aligns with the applicable land-use information used in the assessment. Read the result together with its source, date, coverage and review status.</p>
                                            <p>A system rating is not a zoning certificate or a permit. Where the adopted model treats an incompatible use as ineligible, a high score in another criterion must not be presented as permission to proceed.</p>
                                            <a href="#" class="locus-accordion-link locus-view-property-evidence">View this property's evidence &rarr;</a>
                                        </div>
                                    </div>

                                    <!-- 06: Risk constraints -->
                                    <div class="locus-accordion-item" data-criterion-key="risk_constraints">
                                        <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusCritRiskBody">
                                            <div class="locus-accordion-header-left">
                                                <span class="locus-accordion-num">06</span>
                                                <span class="locus-accordion-title">Risk constraints</span>
                                            </div>
                                            <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                            </span>
                                        </button>
                                        <div class="locus-accordion-body" id="locusCritRiskBody" hidden>
                                            <p><strong>Short tooltip:</strong> Authoritative multi-hazard screening across official geohazard mapping layers.</p>
                                            <p>Risk constraints evaluates authoritative multi-hazard screening across six official geohazards: flood susceptibility (DENR-MGB, 25%), active fault proximity and ground rupture exclusion buffer (DOST-PHIVOLCS, 25%), rain-induced landslides (DENR-MGB, 15%), coastal storm surge (DOST-PAGASA, 15%), soil liquefaction (DOST-PHIVOLCS, 10%), and tsunami run-up exposure (DOST-PHIVOLCS, 10%).</p>
                                            <p>In the scoring direction, higher ratings indicate lower hazard exposure. An active fault trace or 5-meter buffer conflict triggers a Critical Site Constraint. Environmental safety has been consolidated into this criterion to eliminate redundant double-counting.</p>
                                            <a href="#" class="locus-accordion-link locus-view-property-evidence">View this property's evidence &rarr;</a>
                                        </div>
                                    </div>
                                </div>

                                <!-- Right Column: Reading a criterion Card -->
                                <div class="locus-reading-criterion-card">
                                    <h3>Reading a criterion</h3>
                                    <div class="locus-reading-item">
                                        <strong>Rating</strong>
                                        <p>The result for this criterion, out of 100.</p>
                                    </div>
                                    <div class="locus-reading-item">
                                        <strong>Weight</strong>
                                        <p>Its assigned influence in the MCE calculation.</p>
                                    </div>
                                    <div class="locus-reading-item">
                                        <strong>Contribution</strong>
                                        <p>The points it adds to the overall MCE score.</p>
                                    </div>
                                    <p class="locus-reading-note">The evidence and scoring rule explain why a rating was assigned.</p>
                                </div>
                            </div>

                            <div class="locus-help-footer-action">
                                <span class="locus-help-footer-text">Need help with a term?</span>
                                <button type="button" class="locus-help-action-btn locus-to-team-tab">Contact the team &rarr;</button>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: Using LOCUS-SF Panel -->
                    <div class="locus-help-tab-panel" id="locusPanelUsing" data-locus-panel="using" role="tabpanel" aria-labelledby="locusTabUsing" hidden>
                        <div class="locus-help-header-wrap">
                            <h2 class="locus-help-title">Using LOCUS-SF</h2>
                            <p class="locus-help-subtitle">Answers to practical questions about property data, map tools, and boundaries.</p>
                        </div>

                        <div class="locus-accordion-group">
                            <!-- Question 1: Land Area -->
                            <div class="locus-accordion-item is-expanded">
                                <button type="button" class="locus-accordion-header" aria-expanded="true" aria-controls="locusUsingAreaBody">
                                    <div class="locus-accordion-header-left">
                                        <span class="locus-accordion-num">01</span>
                                        <span class="locus-accordion-title">Does a larger land area automatically receive a better score?</span>
                                    </div>
                                    <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    </span>
                                </button>
                                <div class="locus-accordion-body" id="locusUsingAreaBody">
                                    <p>No. Land area describes the property and may support space requirements or cost comparisons. A larger site is not automatically more suitable for every business.</p>
                                    <p>Area should affect a score only when the model includes a documented area-dependent rule. If a required area is missing, the related calculation should remain unavailable instead of assuming zero or a favorable result.</p>
                                </div>
                            </div>

                            <!-- Question 2: Location pin vs boundary -->
                            <div class="locus-accordion-item">
                                <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusUsingPinBody">
                                    <div class="locus-accordion-header-left">
                                        <span class="locus-accordion-num">02</span>
                                        <span class="locus-accordion-title">What is the difference between a location pin and a property boundary?</span>
                                    </div>
                                    <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    </span>
                                </button>
                                <div class="locus-accordion-body" id="locusUsingPinBody" hidden>
                                    <p>A location pin identifies a point associated with the property. A boundary represents its mapped extent.</p>
                                    <p>A drawn boundary can support an estimated area and parcel-wide spatial checks. Keep that estimate separate from declared or documented land area. A point-based check should be identified as point-based.</p>
                                </div>
                            </div>

                            <!-- Question 3: 500m Radar -->
                            <div class="locus-accordion-item">
                                <button type="button" class="locus-accordion-header" aria-expanded="false" aria-controls="locusUsingRadarBody">
                                    <div class="locus-accordion-header-left">
                                        <span class="locus-accordion-num">03</span>
                                        <span class="locus-accordion-title">What does the 500-meter radar show?</span>
                                    </div>
                                    <span class="locus-accordion-toggle-icon" aria-hidden="true">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    </span>
                                </button>
                                <div class="locus-accordion-body" id="locusUsingRadarBody" hidden>
                                    <p>The radar displays records found within the selected distance around its reference location. These records can help users explore surrounding businesses and access context.</p>
                                    <p>The result depends on the data source, coverage, classification and date. A location within 500 meters is not necessarily a 500-meter walking route, and a place count alone is not a prediction of demand or business success.</p>
                                </div>
                            </div>
                        </div>

                        <div class="locus-help-footer-action">
                            <span class="locus-help-footer-text">Still have a question?</span>
                            <button type="button" class="locus-help-action-btn locus-to-team-tab">Contact the team &rarr;</button>
                        </div>
                    </div>

                    <!-- TAB 3: Interface Sounds & Volume Panel -->
                    <div class="locus-help-tab-panel" id="locusPanelSounds" data-locus-panel="sounds" role="tabpanel" aria-labelledby="locusTabSounds" hidden>
                        <div class="locus-help-header-wrap">
                            <button type="button" class="locus-help-back-link locus-to-scores-tab">&larr; Back to common questions</button>
                            <h2 class="locus-help-title">Interface sounds &amp; audio</h2>
                            <p class="locus-help-subtitle">iOS-inspired subtle acoustic feedback for interactions, selections, and confirmations.</p>
                        </div>

                        <div class="locus-sound-panel-container">
                            <!-- Master Card -->
                            <div class="locus-sound-card locus-sound-master-card">
                                <div class="locus-sound-card-header">
                                    <div class="locus-sound-badge-icon" aria-hidden="true">
                                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                        </svg>
                                    </div>
                                    <div class="locus-sound-card-title-group">
                                        <h3 class="locus-sound-card-title">Interface sounds</h3>
                                        <p class="locus-sound-card-desc">Enable soft micro-taps, gentle selection ticks, and short confirmation chimes across the interface.</p>
                                    </div>
                                    <label class="locus-ios-switch" aria-label="Toggle interface sounds">
                                        <input type="checkbox" id="locusSoundToggle" role="switch" aria-checked="false">
                                        <span class="locus-ios-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <!-- Controls Subgroup -->
                            <div class="locus-sound-subgroup is-disabled" id="locusSoundControlsGroup">
                                <!-- Volume Control Card -->
                                <div class="locus-sound-card">
                                    <div class="locus-sound-row-header">
                                        <div class="locus-sound-row-text">
                                            <label for="locusSoundVolume" class="locus-sound-label">Master volume</label>
                                            <span class="locus-sound-card-desc">Adjust the playback level of interaction tones</span>
                                        </div>
                                        <span class="locus-sound-volume-val" id="locusSoundVolumeVal">35%</span>
                                    </div>
                                    <div class="locus-sound-slider-wrap">
                                        <svg class="locus-vol-icon-min" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                        </svg>
                                        <input type="range" id="locusSoundVolume" min="0" max="100" value="35" aria-label="Master volume" disabled>
                                        <svg class="locus-vol-icon-max" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                        </svg>
                                        <button type="button" class="locus-sound-preview-btn" id="locusSoundPreviewBtn">
                                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                            </svg>
                                            <span>Preview sound</span>
                                        </button>
                                    </div>
                                </div>

                                <!-- Scroll Feedback Card -->
                                <div class="locus-sound-card locus-sound-row-card">
                                    <div class="locus-sound-card-title-group">
                                        <label for="locusSoundScrollToggle" class="locus-sound-label">Scroll feedback</label>
                                        <p class="locus-sound-card-desc">Play a subtle settling tick after deliberate user scrolling ends. Requires actual movement; ignores programmatic shifts and map zooming.</p>
                                    </div>
                                    <label class="locus-ios-switch" aria-label="Toggle scroll feedback">
                                        <input type="checkbox" id="locusSoundScrollToggle" role="switch" aria-checked="false" disabled>
                                        <span class="locus-ios-slider"></span>
                                    </label>
                                </div>

                                <!-- Interactive Sound Palette / Sampler Card -->
                                <div class="locus-sound-palette-card">
                                    <h4 class="locus-sound-palette-title">Sound library sampler</h4>
                                    <p class="locus-sound-palette-desc">Click any tone to test its synthesized acoustic envelope:</p>
                                    <div class="locus-sound-sampler-grid">
                                        <button type="button" class="locus-sound-sample-pill" data-sample-sound="tap">
                                            <span class="locus-sound-pill-name">Tap</span>
                                            <span class="locus-sound-pill-ms">40ms · Buttons &amp; navigation</span>
                                        </button>
                                        <button type="button" class="locus-sound-sample-pill" data-sample-sound="select">
                                            <span class="locus-sound-pill-name">Select</span>
                                            <span class="locus-sound-pill-ms">55ms · Tabs, filters &amp; save</span>
                                        </button>
                                        <button type="button" class="locus-sound-sample-pill" data-sample-sound="success">
                                            <span class="locus-sound-pill-name">Success</span>
                                            <span class="locus-sound-pill-ms">220ms · Submission &amp; login</span>
                                        </button>
                                        <button type="button" class="locus-sound-sample-pill" data-sample-sound="approved">
                                            <span class="locus-sound-pill-name">Approved</span>
                                            <span class="locus-sound-pill-ms">300ms · Property approval</span>
                                        </button>
                                        <button type="button" class="locus-sound-sample-pill" data-sample-sound="delete">
                                            <span class="locus-sound-pill-name">Delete</span>
                                            <span class="locus-sound-pill-ms">140ms · Listing removal</span>
                                        </button>
                                        <button type="button" class="locus-sound-sample-pill" data-sample-sound="error">
                                            <span class="locus-sound-pill-name">Error</span>
                                            <span class="locus-sound-pill-ms">160ms · Failed actions</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 4: Contact Team Panel (Screenshot 2) -->
                    <div class="locus-help-tab-panel" id="locusPanelTeam" data-locus-panel="team" role="tabpanel" aria-labelledby="locusTabTeam" hidden>
                        <div class="locus-help-header-wrap locus-team-hero-header">
                            <div class="locus-team-hero-nav">
                                <button type="button" class="locus-help-back-link locus-to-scores-tab" aria-label="Back to common questions">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                    <span>&larr; Back to common questions</span>
                                </button>
                                <span class="locus-team-hero-pill">
                                    <span class="locus-team-live-indicator"></span>
                                    San Fernando, La Union
                                </span>
                            </div>

                            <div class="locus-team-academic-badge">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                                <span>Academic Research &amp; Decision Support System</span>
                            </div>

                            <h2 class="locus-help-title">Meet the LOCUS-SF team</h2>
                            <p class="locus-help-subtitle">The researchers, GIS developers, and thesis adviser behind the Localized Comprehensive Urban Suitability study.</p>
                        </div>

                        <div class="locus-team-container">
                            <!-- Card 1: Research Authors -->
                            <div class="locus-team-section-card locus-team-authors-card">
                                <div class="locus-team-section-header">
                                    <div class="locus-team-section-title-wrap">
                                        <div class="locus-team-section-icon-badge authors-badge">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                        </div>
                                        <div class="locus-team-section-kicker">RESEARCH AUTHORS</div>
                                    </div>
                                    <span class="locus-team-badge-pill">3 Investigators</span>
                                </div>
                                
                                <div class="locus-team-members-list">
                                    <!-- Author 1: Justine M. Tadifa -->
                                    <div class="locus-team-member-row locus-author-highlight">
                                        <div class="locus-team-avatar locus-avatar-gradient-blue" title="Justine M. Tadifa">
                                            <span class="locus-avatar-initials">JT</span>
                                            <span class="locus-avatar-status-dot" title="Lead Investigator"></span>
                                        </div>
                                        <div class="locus-team-info">
                                            <div class="locus-team-name-row">
                                                <span class="locus-team-name">JUSTINE M. TADIFA</span>
                                                <span class="locus-team-role-chip primary">Lead Author</span>
                                            </div>
                                            <span class="locus-team-role">Research author</span>
                                            <p class="locus-team-bio">Full-stack software architecture, MCE suitability algorithms &amp; GIS map interfaces.</p>
                                            <div class="locus-team-tags-row">
                                                <span class="locus-micro-tag">MCE / IAI Logic</span>
                                                <span class="locus-micro-tag">Spatial GIS</span>
                                                <span class="locus-micro-tag">System Lead</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Author 2: Dawn Aleeah V. Dizon -->
                                    <div class="locus-team-member-row">
                                        <div class="locus-team-avatar locus-avatar-gradient-emerald" title="Dawn Aleeah V. Dizon">
                                            <span class="locus-avatar-initials">DD</span>
                                        </div>
                                        <div class="locus-team-info">
                                            <div class="locus-team-name-row">
                                                <span class="locus-team-name">DAWN ALEEAH V. DIZON</span>
                                                <span class="locus-team-role-chip emerald">Co-Author</span>
                                            </div>
                                            <span class="locus-team-role">Research author</span>
                                            <p class="locus-team-bio">Suitability metric weighting, stakeholder survey design &amp; statistical analysis.</p>
                                            <div class="locus-team-tags-row">
                                                <span class="locus-micro-tag">AHP &amp; Weights</span>
                                                <span class="locus-micro-tag">Field Methodology</span>
                                                <span class="locus-micro-tag">Urban Data</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Author 3: Christian Joseph A. Estilong -->
                                    <div class="locus-team-member-row">
                                        <div class="locus-team-avatar locus-avatar-gradient-amber" title="Christian Joseph A. Estilong">
                                            <span class="locus-avatar-initials">CE</span>
                                        </div>
                                        <div class="locus-team-info">
                                            <div class="locus-team-name-row">
                                                <span class="locus-team-name">CHRISTIAN JOSEPH A. ESTILONG</span>
                                                <span class="locus-team-role-chip amber">Co-Author</span>
                                            </div>
                                            <span class="locus-team-role">Research author</span>
                                            <p class="locus-team-bio">Official hazard overlay verification, parcel boundaries &amp; empirical quality assurance.</p>
                                            <div class="locus-team-tags-row">
                                                <span class="locus-micro-tag">Multi-hazard QA</span>
                                                <span class="locus-micro-tag">Boundary Datasets</span>
                                                <span class="locus-micro-tag">Verification</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Card 2: Thesis Adviser -->
                            <div class="locus-team-section-card locus-team-adviser-card">
                                <div class="locus-team-section-header">
                                    <div class="locus-team-section-title-wrap">
                                        <div class="locus-team-section-icon-badge adviser-badge">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                                        </div>
                                        <div class="locus-team-section-kicker">THESIS ADVISER</div>
                                    </div>
                                    <span class="locus-team-badge-pill adviser">Faculty Mentor</span>
                                </div>

                                <div class="locus-team-members-list">
                                    <div class="locus-team-member-row locus-adviser-row">
                                        <div class="locus-team-avatar locus-avatar-gradient-purple" title="Ma’am Emmalou Pimentel">
                                            <span class="locus-avatar-initials">EP</span>
                                            <span class="locus-avatar-mentor-badge" title="Faculty Mentor">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                            </span>
                                        </div>
                                        <div class="locus-team-info">
                                            <div class="locus-team-name-row">
                                                <span class="locus-team-name">MA’AM EMMALOU PIMENTEL</span>
                                                <span class="locus-team-role-chip purple">Faculty Mentor</span>
                                            </div>
                                            <span class="locus-team-role">Thesis adviser</span>
                                            <p class="locus-team-bio">Academic guidance, scientific review, methodology oversight &amp; research direction.</p>
                                            <div class="locus-team-tags-row">
                                                <span class="locus-micro-tag">Academic Oversight</span>
                                                <span class="locus-micro-tag">Research Ethics</span>
                                                <span class="locus-micro-tag">Thesis Direction</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Interactive Routing Cards (Actionable & Polished) -->
                            <div class="locus-team-routing-section">
                                <h4 class="locus-team-routing-heading">Direct Inquiry &amp; Feedback Channels</h4>
                                <div class="locus-team-routing-grid">
                                    <!-- Routing Card 1: System Questions & Feedback -->
                                    <button type="button" class="locus-team-routing-card" id="locusOpenFeedbackBtn" aria-label="Open System feedback form">
                                        <div class="locus-team-routing-icon icon-system">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                        </div>
                                        <div class="locus-team-routing-text">
                                            <div class="locus-team-routing-headline">
                                                <strong>System questions &amp; feedback</strong>
                                                <span class="locus-routing-arrow">&rarr;</span>
                                            </div>
                                            <span class="locus-routing-target">Research authors</span>
                                            <p class="locus-routing-desc">Technical questions, scoring model clarifications, bugs or interface suggestions.</p>
                                            <span class="locus-routing-action-hint">Click to send quick feedback</span>
                                        </div>
                                    </button>

                                    <!-- Routing Card 2: Academic Questions -->
                                    <a href="mailto:locussf.adviser@gmail.com?subject=LOCUS-SF%20Academic%20Inquiry%20-%20Thesis%20Study" class="locus-team-routing-card locus-team-routing-link" aria-label="Send Academic Inquiry to Thesis Adviser">
                                        <div class="locus-team-routing-icon icon-academic">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                        </div>
                                        <div class="locus-team-routing-text">
                                            <div class="locus-team-routing-headline">
                                                <strong>Academic questions</strong>
                                                <span class="locus-routing-arrow">&rarr;</span>
                                            </div>
                                            <span class="locus-routing-target">Thesis adviser</span>
                                            <p class="locus-routing-desc">Institutional inquiries, academic citations and research methodology validation.</p>
                                            <span class="locus-routing-action-hint">Click to compose email</span>
                                        </div>
                                    </a>
                                </div>
                            </div>

                            <!-- Interactive Quick Feedback Form Drawer (In-Modal) -->
                            <div class="locus-team-feedback-drawer" id="locusFeedbackDrawer" hidden>
                                <div class="locus-feedback-drawer-header">
                                    <div class="locus-feedback-drawer-title">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                        <span>Send Feedback to Research Authors</span>
                                    </div>
                                    <button type="button" class="locus-feedback-close-btn" id="locusCloseFeedbackBtn" aria-label="Close feedback form">&times;</button>
                                </div>
                                <form id="locusFeedbackForm" class="locus-feedback-form">
                                    <div class="locus-feedback-row">
                                        <div class="locus-feedback-field">
                                            <label for="locusFeedbackTopic">Inquiry Category</label>
                                            <select id="locusFeedbackTopic" class="locus-feedback-select" required>
                                                <option value="scoring">Scoring &amp; MCE Model Question</option>
                                                <option value="bug">Bug Report / Technical Issue</option>
                                                <option value="feature">Feature Suggestion / Enhancement</option>
                                                <option value="data">Property &amp; Geohazard Layer Inquiry</option>
                                                <option value="other">General Feedback</option>
                                            </select>
                                        </div>
                                        <div class="locus-feedback-field">
                                            <label for="locusFeedbackEmail">Your Email (for response)</label>
                                            <input type="email" id="locusFeedbackEmail" class="locus-feedback-input" placeholder="e.g. researcher@domain.com" required>
                                        </div>
                                    </div>
                                    <div class="locus-feedback-field">
                                        <label for="locusFeedbackMessage">Details or Observations</label>
                                        <textarea id="locusFeedbackMessage" class="locus-feedback-textarea" rows="3" placeholder="Describe your question, observation, or feedback for the research team..." required></textarea>
                                    </div>
                                    <div class="locus-feedback-actions">
                                        <button type="submit" class="locus-feedback-submit-btn" id="locusSubmitFeedbackBtn">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                            <span>Submit to Research Team</span>
                                        </button>
                                        <button type="button" class="locus-feedback-cancel-btn" id="locusCancelFeedbackBtn">Cancel</button>
                                    </div>
                                    <div class="locus-feedback-status" id="locusFeedbackStatus" role="status" aria-live="polite" hidden></div>
                                </form>
                            </div>

                            <!-- Inactive Contact Notice -->
                            <div class="locus-team-contact-notice-card">
                                <div class="locus-team-notice-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                </div>
                                <div class="locus-team-notice-text">
                                    <strong>Official Communication Channel</strong>
                                    <p class="locus-team-contact-notice">Official contact details will be added here.</p>
                                </div>
                            </div>

                            <!-- Bottom bar -->
                            <div class="locus-team-bottom-bar">
                                <div class="locus-team-bottom-brand-wrap">
                                    <span class="locus-team-bottom-brand">LOCUS-SF</span>
                                    <span class="locus-team-bottom-sub">Decision Support Research Platform</span>
                                </div>
                                <button type="button" class="locus-help-action-btn locus-to-scores-tab">Back to FAQs &rarr;</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </dialog>
        <?php
    }
}
