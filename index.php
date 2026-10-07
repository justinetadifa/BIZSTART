<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
sfc_render_head('Invest in San Fernando | LOCUS-SF', $context, ['page' => 'city-landing', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'landing');
$e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
$cataloguePath = $context['user'] === null
    ? '/investor-login.php'
    : (($context['user']['role'] ?? '') === 'investor' ? '/investor-dashboard.php' : '/property-explorer.php');
?>
<main id="main-content">
  <div class="city-hero-frame">
    <div class="city-accent-stripe city-accent-stripe-top" aria-hidden="true">
      <span class="stripe-segment stripe-red"></span>
      <span class="stripe-segment stripe-blue"></span>
    </div>
    <section class="city-hero" aria-labelledby="heroTitle">
      <img src="<?= $e($context['assetBase']) ?>/images/landing-city.jpg" alt="San Fernando city center and coastline at sunset" fetchpriority="high" width="1800" height="1012">
      <div class="city-container city-hero-content">
        <h1 id="heroTitle" class="city-hero-title tw-text-white tw-normal-case tw-leading-tight tw-[-webkit-text-stroke:0] tw-[text-shadow:none]">Your next idea.<br>A place to grow.</h1>
        <p class="city-hero-subtitle">Discover properties and investment opportunities in San Fernando.</p>
        <a class="city-button city-hero-btn" href="#properties">Explore properties</a>
      </div>
    </section>
    <div class="city-accent-stripe city-accent-stripe-bottom" aria-hidden="true">
      <span class="stripe-segment stripe-red"></span>
      <span class="stripe-segment stripe-blue"></span>
    </div>
  </div>
  <section class="city-container city-section" id="why-invest" aria-labelledby="whyTitle">
    <div class="tw-mb-8 tw-flex tw-flex-wrap tw-items-end tw-justify-between tw-gap-4">
      <div>
        <span class="tw-mb-2 tw-block tw-text-xs tw-font-bold tw-uppercase tw-tracking-[.15em] tw-text-slate-400">A city to invest in</span>
        <h2 id="whyTitle" class="city-why-heading">WHY SAN FERNANDO?</h2>
        <p class="tw-m-0 tw-text-sm tw-text-slate-500">A city positioned for business, innovation, and strategic growth.</p>
      </div>
      <a class="tw-text-xs tw-font-bold tw-text-[#9E1B22] hover:tw-underline" href="https://www.sanfernandocity.gov.ph/business-in-the-city/" target="_blank" rel="noopener">City investment guide ↗</a>
    </div>

    <div class="tw-grid tw-gap-6 md:tw-grid-cols-2">
      <!-- 1. Strategic Investment Areas (Exact copy of user reference image) -->
      <article class="city-why-card">
        <div class="city-why-tag">
          <span class="city-why-tag-icon" aria-hidden="true"><?= sfc_icon('map') ?></span>
          <span>STRATEGIC INVESTMENT AREAS</span>
        </div>
        <h3 class="city-why-title">Two places to grow.</h3>
        <p class="city-why-subtitle">Coastal opportunity at Poro Point. Commercial growth in Biday.</p>
        <button type="button" class="city-why-btn" data-why-toggle aria-expanded="false">
          <span class="city-why-btn-triangle" aria-hidden="true">▶</span>
          <span>Explore the areas</span>
        </button>
        <div class="city-why-details" aria-hidden="true">
          <div class="city-why-details-inner">
            <span class="city-why-pill">PORO POINT FREEPORT ZONE</span>
            <p class="city-why-desc">An established economic and tourism zone with access to airport, seaport, mixed-use development, and major visitor destinations.</p>
            
            <span class="city-why-pill">CENTRAL BUSINESS DISTRICT – BIDAY</span>
            <p class="city-why-desc">A growing commercial corridor positioned for retail, services, technology, and long-term urban investment.</p>
          </div>
        </div>
      </article>

      <!-- 2. Digital City Advantage -->
      <article class="city-why-card">
        <div class="city-why-tag">
          <span class="city-why-tag-icon" aria-hidden="true"><?= sfc_icon('investor') ?></span>
          <span>DIGITAL CITY ADVANTAGE</span>
        </div>
        <h3 class="city-why-title">Recognized Digital City.</h3>
        <p class="city-why-subtitle">Strengthening technology, BPM services, and digital innovation.</p>
        <button type="button" class="city-why-btn" data-why-toggle aria-expanded="false">
          <span class="city-why-btn-triangle" aria-hidden="true">▶</span>
          <span>Explore digital advantage</span>
        </button>
        <div class="city-why-details" aria-hidden="true">
          <div class="city-why-details-inner">
            <span class="city-why-pill">DIGITAL CITIES PH PROGRAM</span>
            <p class="city-why-desc">San Fernando City is recognized under the Digital Cities PH program, strengthening its position for ICT, IT-BPM, digital services, and innovation-driven enterprises.</p>
            
            <span class="city-why-pill">CONNECTIVITY & TALENT CORRIDOR</span>
            <p class="city-why-desc">Redundant high-speed fiber connectivity, reliable municipal power, and direct recruitment pipelines from leading regional universities and colleges.</p>
          </div>
        </div>
      </article>

      <!-- 3. Priority Investment Sectors -->
      <article class="city-why-card">
        <div class="city-why-tag">
          <span class="city-why-tag-icon" aria-hidden="true"><?= sfc_icon('ranking') ?></span>
          <span>PRIORITY INVESTMENT SECTORS</span>
        </div>
        <h3 class="city-why-title">Room for your business.</h3>
        <p class="city-why-subtitle">From agriculture and tourism to technology and infrastructure.</p>
        <button type="button" class="city-why-btn" data-why-toggle aria-expanded="false">
          <span class="city-why-btn-triangle" aria-hidden="true">▶</span>
          <span>View all 7 priority sectors</span>
        </button>
        <div class="city-why-details" aria-hidden="true">
          <div class="city-why-details-inner">
            <span class="city-why-pill">AGRIBUSINESS & HOSPITALITY</span>
            <p class="city-why-desc">Targeted expansion across Agriculture, Agribusiness & Fishery alongside Tourism, leisure hospitality, and coastal trade facilities.</p>
            
            <span class="city-why-pill">TECHNOLOGY & INFRASTRUCTURE</span>
            <p class="city-why-desc">Dedicated development zones for Information & Communications Technology, Manufacturing, Health & Wellness, and clean infrastructure.</p>
          </div>
        </div>
      </article>

      <!-- 4. Investment & Incentives (Government Shield Icon - No AI Diamond Spark) -->
      <article class="city-why-card">
        <div class="city-why-tag">
          <span class="city-why-tag-icon" aria-hidden="true"><?= sfc_icon('admin') ?></span>
          <span>INVESTMENT & INCENTIVES</span>
        </div>
        <h3 class="city-why-title">Investment and Incentives Code.</h3>
        <p class="city-why-subtitle">Ordinance No. 2024-41 framework for qualified capital investments.</p>
        <button type="button" class="city-why-btn" data-why-toggle aria-expanded="false">
          <span class="city-why-btn-triangle" aria-hidden="true">▶</span>
          <span>View Investment Incentives</span>
        </button>
        <div class="city-why-details" aria-hidden="true">
          <div class="city-why-details-inner">
            <span class="city-why-pill">ORDINANCE NO. 2024-41</span>
            <p class="city-why-desc">Ordinance No. 2024-41 provides the city’s legislative framework for qualified capital investments, local tax exemptions, and priority economic activities.</p>
            
            <span class="city-why-pill">LEBDO INVESTOR FACILITATION</span>
            <p class="city-why-desc">Direct investor concierge support through the Local Economic and Business Development Office for site permits, evaluations, and enterprise onboarding.</p>
          </div>
        </div>
      </article>

      <!-- 5. Cost of Doing Business -->
      <article class="city-why-card" aria-labelledby="costTitle">
        <div class="city-why-tag">
          <span class="city-why-tag-icon" aria-hidden="true"><?= sfc_icon('insights') ?></span>
          <span>COST OF DOING BUSINESS</span>
        </div>
        <h3 id="costTitle" class="city-why-title">Operating Cost Guidance.</h3>
        <p class="city-why-subtitle">Competitive operating parameters across Region I utilities and labor.</p>
        <button type="button" class="city-why-btn" data-why-toggle aria-expanded="false">
          <span class="city-why-btn-triangle" aria-hidden="true">▶</span>
          <span>Official business cost guidance</span>
        </button>
        <div class="city-why-details" aria-hidden="true">
          <div class="city-why-details-inner">
            <label class="tw-block">
              <span class="tw-sr-only">Business cost category</span>
              <select id="cityCostCategory" class="city-why-select">
                <option value="wages">Wage Rates</option>
                <option value="rent">Rental / Lease Rates</option>
                <option value="power">Power Rates</option>
                <option value="water">Water Cost</option>
                <option value="internet">Telecommunications / Internet Cost</option>
              </select>
            </label>
            <p id="cityCostNote" class="city-why-desc tw-min-h-[44px]" aria-live="polite">Check the current Region I wage order for the applicable activity and establishment size.</p>
            
            <span class="city-why-pill">REGIONAL COST ADVANTAGE</span>
            <p class="city-why-desc">Predictable labor rates under RTWPB Region I wage orders and favorable commercial lease rates across prime city barangays.</p>
          </div>
        </div>
      </article>

      <!-- 6. Setting Up a Business -->
      <article class="city-why-card" aria-labelledby="setupTitle">
        <div class="city-why-tag">
          <span class="city-why-tag-icon" aria-hidden="true"><?= sfc_icon('vote') ?></span>
          <span>SETTING UP A BUSINESS</span>
        </div>
        <h3 id="setupTitle" class="city-why-title">Setting Up a Business.</h3>
        <p class="city-why-subtitle">Start with the permits that apply to your proposed commercial activity.</p>
        <button type="button" class="city-why-btn" data-why-toggle aria-expanded="false">
          <span class="city-why-btn-triangle" aria-hidden="true">▶</span>
          <span>View current city requirements</span>
        </button>
        <div class="city-why-details" aria-hidden="true">
          <div class="city-why-details-inner">
            <span class="city-why-pill">BPLO UNIFIED PERMITTING</span>
            <p class="city-why-desc">Online Business Permit Application, Building Permit, and Certificate of Occupancy clearances coordinated via the city's one-stop shop.</p>
            
            <span class="city-why-pill">ZONING & COMPLIANCE VERIFICATION</span>
            <p class="city-why-desc">Verification of Comprehensive Land Use Plan (CLUP) zoning compliance, locational clearance, and fire safety guidelines before site fit-out.</p>
          </div>
        </div>
      </article>
    </div>
  </section>
  <section class="city-container city-section" id="properties">
    <div class="city-section-heading tw-items-end tw-justify-between tw-mb-6">
      <div>
        <h2 class="tw-m-0 tw-text-2xl sm:tw-text-3xl tw-font-black tw-italic tw-uppercase tw-tracking-tight tw-text-[#9E1B22]" style="font-family: 'Poppins', sans-serif;">FEATURED PROPERTIES.</h2>
        <p class="tw-mt-1.5 tw-mb-0 tw-text-sm sm:tw-text-base tw-font-semibold tw-text-[#11224D]">Three listings to get you started.</p>
      </div>
      <a class="tw-inline-flex tw-items-center tw-justify-center tw-px-7 tw-py-2.5 tw-rounded-full tw-bg-[#9E1B22] tw-text-white tw-font-semibold tw-text-sm hover:tw-bg-[#80141a] hover:tw-shadow-md hover:tw-scale-[1.02] active:tw-scale-[0.98] tw-transition-all tw-duration-200" href="<?= $e(sfc_path($cataloguePath)) ?>">View all properties</a>
    </div>
    <div class="city-property-grid" id="cityPropertyGrid" aria-live="polite"><div class="city-loading">Loading properties…</div></div>
    <?php if ($context['user'] === null): ?>
    <div class="city-account-gate">
      <div>
        <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border border-white/20 bg-white/10 text-white text-[10px] font-mono uppercase tracking-wider mb-2 font-semibold">
          <span class="w-1.5 h-1.5 rounded-full bg-[#9E1B22]"></span>
          Full Catalogue Access
        </div>
        <h3>See the full picture.</h3>
        <p>Create an account to explore every listing, save sites, and compare.</p>
      </div>
      <a class="city-button" href="<?= $e(sfc_path('/investor-login.php?mode=register')) ?>">Create account</a>
    </div>
    <?php endif; ?>
  </section>
  <section class="city-container city-section" id="about">
    <div class="city-about">
      <div class="city-about-intro">
        <div class="city-about-eyebrow">ABOUT LOCUS-SF</div>
        <h2 class="city-about-title">LOCAL KNOWLEDGE.<br>CLEARER DECISIONS.</h2>
        <p class="city-about-lead">LOCUS-SF brings listings, maps, and departmental assessments into one place for investors in San Fernando City.</p>
        <p class="city-about-sub">A thesis project by the LOCUS-SF development team.</p>
      </div>
      <div class="city-about-list" role="region" aria-label="About LOCUS-SF details">
        <div class="city-about-item" data-about-item>
          <button type="button" class="city-about-btn" data-about-toggle aria-expanded="false">
            <span class="city-about-icon" aria-hidden="true">&#9654;</span>
            <span class="city-about-label">How MCE and IAI work</span>
          </button>
          <div class="city-about-drawer" aria-hidden="true">
            <div class="city-about-drawer-inner">
              <p>Multi-Criteria Evaluation (MCE) weighs seven city assessment criteria. The Investment Attractiveness Index (IAI) combines MCE with economic viability and infrastructure readiness. Scores appear after a complete assessment; the provisional method is shown on the priority board.</p>
            </div>
          </div>
        </div>
        <div class="city-about-item" data-about-item>
          <button type="button" class="city-about-btn" data-about-toggle aria-expanded="false">
            <span class="city-about-icon" aria-hidden="true">&#9654;</span>
            <span class="city-about-label">Authors and external advisers</span>
          </button>
          <div class="city-about-drawer" aria-hidden="true">
            <div class="city-about-drawer-inner">
              <p>Authors: LOCUS-SF development team. Advisory departments: City Assessor’s Office, City Information and Communications Technology Office (CICTO), and Local Economic and Business Development Office (LEBDO).</p>
            </div>
          </div>
        </div>
        <div class="city-about-item" data-about-item>
          <button type="button" class="city-about-btn" data-about-toggle aria-expanded="false">
            <span class="city-about-icon" aria-hidden="true">&#9654;</span>
            <span class="city-about-label">For brokers</span>
          </button>
          <div class="city-about-drawer" aria-hidden="true">
            <div class="city-about-drawer-inner">
              <p>Submit your PRC details for CICTO review, then submit properties for city approval.</p>
              <p><a class="city-link" href="<?= $e(sfc_path('/seller-login.php?mode=register')) ?>">Register as a broker →</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
<?php if ($context['user'] === null): ?>
<dialog class="city-privacy-dialog" id="cityPrivacyDialog" aria-labelledby="cityPrivacyTitle">
  <h2 id="cityPrivacyTitle">Your privacy matters.</h2>
  <p>By proceeding, I consent to the collection and processing of my personal and property data by the City Government of San Fernando in accordance with the Data Privacy Act of 2012 (RA 10173) for the purpose of the LOCUS-SF system.</p>
  <a class="city-link" href="<?= $e(sfc_path('/privacy.php')) ?>">Read the privacy notice</a>
  <label><input type="checkbox" id="cityPrivacyConsent">I agree to the collection and processing described above.</label>
  <div class="city-actions"><button class="city-button" id="cityPrivacyContinue" type="button" disabled>Create account</button><button class="city-button city-button-secondary" id="cityPrivacyGuest" type="button">Browse as guest</button></div>
</dialog>
<?php endif; ?>
<script type="module" src="<?= $e($context['assetBase']) ?>/js/city-workspace.js<?= sfc_asset_version('js/city-workspace.js') ?>"></script>
<?php sfc_render_footer($context); ?>
