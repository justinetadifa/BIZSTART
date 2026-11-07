<?php
declare(strict_types=1);

/** Guided discovery reuses the published catalogue and existing investor tools. */
function sfc_render_investment_assistant(array $context): void
{
    $e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    ?>
<link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/investment-assistant.css<?= sfc_asset_version('css/investment-assistant.css') ?>">
<section class="investment-assistant" id="investmentAssistant" aria-labelledby="investmentAssistantTitle" data-investment-assistant>
  <div class="ia-shell ia-workbench" id="iaWorkbench" aria-busy="true">
    <section class="ia-conversation" aria-labelledby="investmentAssistantTitle">
      <header class="ia-intro">
        <div class="ia-brand-line"><span class="ia-chat-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 11.5a8 8 0 0 1-8 8c-1.2 0-2.3-.2-3.3-.7L4 20l1.2-4.7A8 8 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg></span><h1 id="investmentAssistantTitle">Property Assistant</h1><button type="button" class="ia-text-button" id="iaReset" disabled>New conversation</button></div>
        <h2 id="iaConversationTitle">Find a place for <br>your next idea.</h2>
        <p class="ia-description">Explore published properties through guided search.</p>
      </header>
      <div class="ia-conversation-body" id="iaConversationBody">
        <div class="ia-messages" id="iaMessages" role="log" aria-label="Your conversation with the Property Assistant" aria-live="polite" aria-relevant="additions text"><div class="ia-message ia-message-assistant"><span class="ia-message-label">LOCUS-SF</span><p>Start with a location, property type, or budget. Are you looking to buy or lease?</p></div></div>
        <div class="ia-starters" id="iaStarters" aria-label="Start a property search">
          <?php foreach (['Show published properties', 'Buy a property', 'Lease a space', 'Find a commercial lot'] as $prompt): ?>
          <button type="button" data-ia-prompt="<?= $e($prompt) ?>" disabled><?= $e($prompt) ?></button>
          <?php endforeach; ?>
        </div>
        <div class="ia-guidance" id="iaGuidance" aria-label="Suggested replies" hidden></div>
      </div>
      <div class="ia-compose-wrap">
        <p class="ia-service-notice" id="iaServiceNotice" role="status" hidden></p>
        <div class="ia-error" id="iaError" role="alert" hidden><p id="iaErrorMessage"></p><button type="button" id="iaRetry">Try again</button></div>
        <form class="ia-composer" id="iaMessageForm">
          <button type="button" class="ia-compose-filter" id="iaComposerFilters" aria-label="Open search filters"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
          <label class="ia-sr-only" for="iaMessage">Search published properties</label><textarea id="iaMessage" name="message" rows="1" maxlength="2000" placeholder="Describe your plans or ask a question…" aria-describedby="iaComposeHelp" required disabled></textarea>
          <button type="submit" id="iaSend" aria-label="Send your property request" disabled><span class="ia-send-label ia-sr-only">Send</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 4-8-4-8Zm4 8h13"/></svg></button>
        </form>
        <div class="ia-compose-meta"><span id="iaComposeHelp">You can also search using filters.</span><span id="iaMode" class="ia-mode">Connecting…</span></div>
      </div>
    </section>
    <section class="ia-results" id="iaResults" aria-labelledby="iaResultsTitle">
      <div class="ia-breadcrumb" aria-label="Current view">Assistant <span aria-hidden="true">›</span> Properties</div>
      <div class="ia-results-head"><div><div class="ia-results-title-row"><h2 id="iaResultsTitle">Properties to explore</h2><span class="ia-result-count" id="iaResultCount" aria-live="polite">Loading…</span></div><p>Published properties in San Fernando, La Union</p></div><div class="ia-view-switch" role="group" aria-label="Property result view"><button type="button" id="iaListView" aria-pressed="true"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01"/></svg>List</button><button type="button" id="iaMapView" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m2 4 5-2 6 2 5-2v14l-5 2-6-2-5 2V4Zm5-2v14M13 4v14"/></svg>Map</button></div></div>
      <div class="ia-search-tools">
        <div class="ia-tools-heading">
          <div class="ia-tools-title"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14M7 3v4M13 8v4M8 13v4"/></svg><span>Refine your search</span></div>
          <div class="ia-tools-actions">
            <button type="button" class="ia-filter-reset" id="iaClearFilters" hidden disabled>Clear all</button>
            <button type="button" id="iaEditFilters" class="ia-all-filters" aria-expanded="false" aria-controls="iaFilterDetails" disabled>All filters<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4h10M5 8h6M7 12h2"/></svg></button>
          </div>
        </div>
        <div class="ia-quick-filters" aria-label="Search filters">
          <?php foreach ([
              ['purpose', 'iaQuickPurpose', 'Listing', 'Buy or lease', 'M4 6h12m-3-3 3 3-3 3M16 14H4m3-3-3 3 3 3'],
              ['category', 'iaQuickCategory', 'Property type', 'Any property', 'M4 17V3h8v14M12 8h4v9M2 17h16M7 6h2M7 9h2M7 12h2M7 17v-2'],
              ['budget', 'iaQuickBudget', 'Budget', 'No limit', 'M3 5h13v12H3V5Zm0 0V3h11v2M13 9h4v4h-4V9Z'],
              ['barangay', 'iaQuickBarangay', 'Barangay', 'All barangays', 'M15 8c0 4-5 9-5 9S5 12 5 8a5 5 0 1 1 10 0Zm-3 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z'],
              ['minArea', 'iaQuickArea', 'Land area', 'Any size', 'M4 4h12v12H4V4ZM2 4h4M4 2v4M14 16h4M16 14v4'],
          ] as [$field, $id, $label, $value, $path]): ?>
          <button type="button" class="ia-filter-trigger" data-ia-focus="<?= $e($field) ?>" id="<?= $e($id) ?>" aria-expanded="false" aria-controls="iaFilterDetails" disabled><svg class="ia-filter-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="<?= $e($path) ?>"/></svg><span class="ia-filter-text"><span class="ia-filter-label"><?= $e($label) ?></span><span class="ia-filter-value"><?= $e($value) ?></span></span><svg class="ia-filter-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m5 6 3 3 3-3"/></svg></button>
          <?php endforeach; ?>
        </div>
        <div class="ia-filter-summary" id="iaFilterSummary" hidden><span class="ia-sr-only" id="iaCriteriaDescription">All published properties</span><div class="ia-chips" id="iaChips" aria-label="Selected search filters"></div></div>
      <details class="ia-filter-details" id="iaFilterDetails" data-scope="all" aria-labelledby="iaFilterEditorTitle"><summary class="ia-sr-only" tabindex="-1">Set search filters</summary>
        <div class="ia-filter-editor-head"><div><span class="ia-editor-kicker">Search filters</span><h3 id="iaFilterEditorTitle">All filters</h3></div><button type="button" class="ia-editor-dismiss" id="iaDismissFilters" aria-label="Close filters"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button></div>
        <form class="ia-filter-form" id="iaFilterForm" aria-labelledby="iaFilterEditorTitle">
          <label class="ia-filter-field" data-ia-group="category">Property type<select id="iaCategory" name="category"><option value="">Any property type</option></select></label>
          <label class="ia-filter-field" data-ia-group="category">Specific type<select id="iaSubcategory" name="subcategory"><option value="">Any specific type</option></select></label>
          <label class="ia-filter-field" data-ia-group="purpose">Buy or lease<select id="iaPurpose" name="purpose"><option value="">Either</option><option value="sale">For sale</option><option value="lease">For lease</option></select></label>
          <label class="ia-filter-field" data-ia-group="barangay">Barangay<select id="iaBarangay" name="barangay"><option value="">Anywhere in San Fernando</option></select></label>
          <label class="ia-filter-field" data-ia-group="budget">Maximum budget (PHP)<input id="iaBudget" name="budget" type="number" inputmode="decimal" min="0.01" max="1000000000000" step="any" placeholder="e.g. 5000000"></label>
          <label class="ia-filter-field" data-ia-group="budget">Price basis and rental period<select id="iaBudgetBasis" name="budgetBasis"><option value="">Choose a price basis</option><option value="sale_total">Sale · total property price</option><option value="sale_sqm">Sale · per m²</option><option value="lease_month_total">Lease · total per month</option><option value="lease_month_sqm">Lease · per m² per month</option><option value="lease_year_total">Lease · total per year</option><option value="lease_year_sqm">Lease · per m² per year</option><option value="lease_day_total">Lease · total per day</option><option value="lease_day_sqm">Lease · per m² per day</option></select></label>
          <label class="ia-filter-field" data-ia-group="area">Minimum land area (m²)<input id="iaMinArea" name="minArea" type="number" inputmode="decimal" min="0.01" max="1000000000" step="any" placeholder="No minimum"></label>
          <label class="ia-filter-field" data-ia-group="area">Maximum land area (m²)<input id="iaMaxArea" name="maxArea" type="number" inputmode="decimal" min="0.01" max="1000000000" step="any" placeholder="No maximum"></label>
          <label class="ia-filter-field ia-field-full" data-ia-group="activity">Planned use (optional)<input id="iaActivity" name="activity" type="text" maxlength="100" placeholder="e.g. café"></label>
          <p class="ia-filter-note ia-field-full" data-ia-group="activity">Your planned use is conversation context. It does not filter listings or confirm suitability or permission.</p>
          <div class="ia-filter-actions ia-field-full"><button class="ia-primary-button" type="submit" id="iaApplyFilters" disabled>Apply filters</button><button type="button" class="ia-text-button" id="iaCloseFilters">Cancel</button></div>
        </form>
      </details>
      </div>
      <div class="ia-result-status" id="iaResultStatus" role="status" aria-live="polite">Loading published listings…</div>
      <section class="ia-map-panel" id="iaMapPanel" aria-labelledby="iaMapTitle" hidden>
        <header class="ia-map-toolbar"><div><h3 id="iaMapTitle">Property locations</h3><p id="iaMapHelp">Select a numbered pin or a property below.</p></div><button type="button" id="iaMapFit" disabled><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3H3v4M13 3h4v4M3 13v4h4M17 13v4h-4M7 10h6M10 7v6"/></svg>Fit listings</button></header>
        <div class="ia-map-stage"><div class="ia-map-canvas" id="iaPropertyMap" aria-label="Map of matching published properties" aria-describedby="iaMapHelp iaMapStatus"></div><p class="ia-map-empty" id="iaMapEmpty" hidden>No recorded property locations to display.</p></div>
        <div class="ia-map-feedback"><p id="iaMapStatus" role="status" aria-live="polite"></p><button type="button" id="iaMapRetry" hidden>Retry map</button></div>
        <div class="ia-map-locations" id="iaMapLocations" role="group" aria-label="Explore mapped properties" hidden></div>
      </section>
      <div class="ia-result-list" id="iaResultList"><div class="ia-loading"><span class="ia-spinner" aria-hidden="true"></span><span>Loading published listings…</span></div></div>
      <div class="ia-suggestions" id="iaSuggestions" aria-label="Ways to adjust your search" hidden></div>
      <div class="ia-compare-bar" id="iaCompareBar" hidden><span id="iaCompareCount"></span><a id="iaCompareLink" href="<?= $e(sfc_path('/compare-decision.php')) ?>">Open comparison <span aria-hidden="true">↗</span></a></div>
      <p class="ia-evidence-note">Listing matches describe recorded information. Review the listing and its assessment evidence before making a decision.</p>
      <a class="ia-catalogue-link" href="<?= $e(sfc_path('/investor-dashboard.php?view=catalogue')) ?>">Browse the full property catalogue <span aria-hidden="true">↗</span></a>
    </section>
  </div>
  <p class="ia-sr-only" id="iaAnnouncement" role="status" aria-live="polite"></p>
  <noscript><p class="ia-no-script">Enable JavaScript to use the Property Assistant, or <a href="<?= $e(sfc_path('/investor-dashboard.php?view=catalogue')) ?>">browse the property catalogue</a>.</p></noscript>
</section>
<script type="module" src="<?= $e($context['assetBase']) ?>/js/investment-assistant.js<?= sfc_asset_version('js/investment-assistant.js') ?>"></script>
    <?php
}
