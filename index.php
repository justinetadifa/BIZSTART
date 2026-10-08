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
        <h1 id="heroTitle" class="city-hero-title">FIND THE PLACE<br>FOR WHAT COMES NEXT.</h1>
        <p class="city-hero-subtitle">Explore verified properties and investment opportunities across San Fernando City.</p>
        <a class="city-button city-hero-btn" href="#properties">Explore properties</a>
      </div>
    </section>
    <div class="city-accent-stripe city-accent-stripe-bottom" aria-hidden="true">
      <span class="stripe-segment stripe-red"></span>
      <span class="stripe-segment stripe-blue"></span>
    </div>
  </div>

  <!-- SAN FERNANDO AT A GLANCE -->
  <section class="city-container home-glance" id="at-a-glance" aria-labelledby="glanceTitle">
    <div class="home-glance-panel">
      <h2 id="glanceTitle" class="home-glance-title">SAN FERNANDO AT A GLANCE</h2>

      <div class="home-glance-grid">
        <!-- 1. LAND AREA -->
        <article class="glance-card">
          <div class="glance-icon" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 31L16 27L28 32L38 28V12L28 16L16 11L6 15V31Z" fill="#FEE2E2" stroke="#FDA4AF" stroke-width="1.6" stroke-linejoin="round"/>
              <path d="M16 11V27" stroke="#FB7185" stroke-width="1.4" stroke-dasharray="2 1.5"/>
              <path d="M28 16V32" stroke="#FB7185" stroke-width="1.4" stroke-dasharray="2 1.5"/>
              <path d="M16 11L28 16V32L16 27V11Z" fill="#FECDD3" fill-opacity="0.7"/>
              <ellipse cx="22" cy="24.5" rx="3.5" ry="1.6" fill="#881337" fill-opacity="0.25"/>
              <path d="M22 23.5C22 23.5 27 17.5 27 13.5C27 10.7386 24.7614 8.5 22 8.5C19.2386 8.5 17 10.7386 17 13.5C17 17.5 22 23.5 22 23.5Z" fill="#DC2626"/>
              <circle cx="22" cy="13.5" r="2.4" fill="#FFFFFF"/>
            </svg>
          </div>
          <div class="glance-copy">
            <span class="glance-label">LAND AREA</span>
            <div class="glance-value">105.26 km<sup>2</sup></div>
          </div>
        </article>

        <!-- 2. SCHOOLS -->
        <article class="glance-card">
          <div class="glance-icon" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22.5V28C12 32 16.5 35 22 35C27.5 35 32 32 32 28V22.5" fill="#D97706" fill-opacity="0.2" stroke="#B45309" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M22 10.5L39 18.5L22 26.5L5 18.5L22 10.5Z" fill="#D97706" stroke="#92400E" stroke-width="1.8" stroke-linejoin="round"/>
              <path d="M22 12L37 18.5L22 25L7 18.5L22 12Z" fill="#F59E0B" fill-opacity="0.45"/>
              <circle cx="22" cy="18.5" r="1.8" fill="#78350F"/>
              <path d="M34 19V30.5C34 31.5 35.5 32 35.5 33C35.5 34 34.5 34.5 34 34.5C33.5 34.5 32.5 34 32.5 33C32.5 32 34 31.5 34 30.5" stroke="#92400E" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="glance-copy">
            <span class="glance-label">SCHOOLS</span>
            <div class="glance-value">11 universities<br>&amp; colleges</div>
          </div>
        </article>

        <!-- 3. POPULATION -->
        <article class="glance-card">
          <div class="glance-icon" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="13" cy="16.5" r="4" fill="#9E1B22" fill-opacity="0.8"/>
              <path d="M5 32C5 27 8.8 23.8 13 23.8C15.4 23.8 17.4 24.9 18.8 26.6C16.8 28.3 15.6 30.6 15.3 33H5V32Z" fill="#9E1B22" fill-opacity="0.8"/>
              <circle cx="31" cy="16.5" r="4" fill="#9E1B22" fill-opacity="0.8"/>
              <path d="M39 32C39 27 35.2 23.8 31 23.8C28.6 23.8 26.6 24.9 25.2 26.6C27.2 28.3 28.4 30.6 28.7 33H39V32Z" fill="#9E1B22" fill-opacity="0.8"/>
              <circle cx="22" cy="13.5" r="5" fill="#9E1B22"/>
              <path d="M12.5 33C12.5 26.5 16.7 23 22 23C27.3 23 31.5 26.5 31.5 33H12.5Z" fill="#9E1B22"/>
            </svg>
          </div>
          <div class="glance-copy">
            <span class="glance-label">POPULATION</span>
            <div class="glance-value">128,024 (2023)</div>
          </div>
        </article>

        <!-- 4. FINANCE -->
        <article class="glance-card">
          <div class="glance-icon" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 29.5C9 32.5 14 34.5 19.5 34.5C25 34.5 30 32.5 30 29.5V25C30 28 25 30 19.5 30C14 30 9 28 9 25V29.5Z" fill="#D97706"/>
              <path d="M9 24C9 27 14 29 19.5 29C25 29 30 27 30 24V19.5C30 22.5 25 24.5 19.5 24.5C14 24.5 9 22.5 9 19.5V24Z" fill="#F59E0B"/>
              <ellipse cx="19.5" cy="18.5" rx="10.5" ry="5.2" fill="#FBBF24" stroke="#D97706" stroke-width="1.4"/>
              <ellipse cx="19.5" cy="18.5" rx="7.8" ry="3.6" fill="#FDE68A" fill-opacity="0.75"/>
              <path d="M24 21C24 23 28 25 32.5 25C37 25 41 23 41 21V17C41 19 37 21 32.5 21C28 21 24 19 24 17V21Z" fill="#B45309"/>
              <ellipse cx="32.5" cy="16.5" rx="8.5" ry="4.2" fill="#F59E0B" stroke="#B45309" stroke-width="1.4"/>
              <ellipse cx="32.5" cy="16.5" rx="6.2" ry="2.8" fill="#FDE68A" fill-opacity="0.7"/>
            </svg>
          </div>
          <div class="glance-copy">
            <span class="glance-label">FINANCE</span>
            <div class="glance-value">170<br>institutions</div>
          </div>
        </article>

        <!-- 5. ROAD NETWORK -->
        <article class="glance-card">
          <div class="glance-icon" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 8H28L35 36H9L16 8Z" fill="#11224D"/>
              <path d="M16 8L9 36" stroke="#2563EB" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M28 8L35 36" stroke="#2563EB" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M22 11V15" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M22 19V24.5" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
              <path d="M22 29V35" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="glance-copy">
            <span class="glance-label">ROAD NETWORK</span>
            <div class="glance-value">279.52 km</div>
          </div>
        </article>

        <!-- 6. HOUSEHOLDS -->
        <article class="glance-card">
          <div class="glance-icon" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M29 12V16.5L32 19.5V12H29Z" fill="#9E1B22"/>
              <path d="M22 8L7 21.5H11.5V35C11.5 35.5 12 36 12.5 36H19V26C19 25.4 19.4 25 20 25H24C24.6 25 25 25.4 25 26V36H31.5C32 36 32.5 35.5 32.5 35V21.5H37L22 8Z" fill="#9E1B22"/>
            </svg>
          </div>
          <div class="glance-copy">
            <span class="glance-label">HOUSEHOLDS</span>
            <div class="glance-value">32,202 (2023)</div>
          </div>
        </article>

        <!-- 7. HEALTH -->
        <article class="glance-card">
          <div class="glance-icon" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.5 9C17.5 8.2 18.2 7.5 19 7.5H25C25.8 7.5 26.5 8.2 26.5 9V17.5H35C35.8 17.5 36.5 18.2 36.5 19V25C36.5 25.8 35.8 26.5 35 26.5H26.5V35C26.5 35.8 25.8 36.5 25 36.5H19C18.2 36.5 17.5 35.8 17.5 35V26.5H9C8.2 26.5 7.5 25.8 7.5 25V19C7.5 18.2 8.2 17.5 9 17.5H17.5V9Z" fill="#B45309" stroke="#F59E0B" stroke-width="2" stroke-linejoin="round"/>
              <path d="M19.5 11H24.5V19.5H33V24.5H24.5V33H19.5V24.5H11V19.5H19.5V11Z" fill="#FBBF24" fill-opacity="0.35"/>
            </svg>
          </div>
          <div class="glance-copy">
            <span class="glance-label">HEALTH</span>
            <div class="glance-value">292 facilities</div>
          </div>
        </article>

        <!-- 8. BUSINESS -->
        <article class="glance-card">
          <div class="glance-icon" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="9.5" y="25" width="6.5" height="12" rx="2.5" fill="#9E1B22" fill-opacity="0.6"/>
              <rect x="18.5" y="17.5" width="6.5" height="19.5" rx="2.5" fill="#9E1B22" fill-opacity="0.85"/>
              <rect x="27.5" y="10" width="6.5" height="27" rx="2.5" fill="#9E1B22"/>
            </svg>
          </div>
          <div class="glance-copy">
            <span class="glance-label">BUSINESS</span>
            <div class="glance-value">9,129<br>registered</div>
          </div>
        </article>
      </div>
    </div>
  </section>

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
    <div class="city-section-heading tw-flex-wrap tw-items-end tw-justify-between tw-mb-6">
      <div>
        <h2 class="tw-m-0 tw-text-2xl sm:tw-text-3xl tw-font-black tw-italic tw-uppercase tw-tracking-tight tw-text-[#9E1B22]" style="font-family: 'Poppins', sans-serif;">FEATURED PROPERTIES.</h2>
        <p class="tw-mt-1.5 tw-mb-0 tw-text-sm sm:tw-text-base tw-font-semibold tw-text-[#11224D]">Three listings to get you started.</p>
      </div>
      <a class="tw-inline-flex tw-items-center tw-justify-center tw-px-7 tw-py-2.5 tw-rounded-full tw-bg-[#9E1B22] tw-text-white tw-font-semibold tw-text-sm hover:tw-bg-[#80141a] hover:tw-shadow-md hover:tw-scale-[1.02] active:tw-scale-[0.98] tw-transition-all tw-duration-200" href="<?= $e(sfc_path($cataloguePath)) ?>">View all properties</a>
    </div>
    <?php sfc_investor_view_control($context); ?>
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
        <h2 class="city-about-title">LOCAL INSIGHT.<br>BETTER DECISIONS.</h2>
        <p class="city-about-lead">LOCUS-SF is a decision-support system that brings property listings, spatial data, and departmental assessments into one place—helping investors compare opportunities across San Fernando City with greater clarity.</p>
        <p class="city-about-sub">Developed as a thesis project by the LOCUS-SF team in collaboration with local government offices.</p>
      </div>
      <div class="city-about-list" role="region" aria-label="About LOCUS-SF details">
        <div class="city-about-item" data-about-item>
          <button type="button" class="city-about-btn" data-about-toggle aria-expanded="false">
            <span class="city-about-icon" aria-hidden="true">&#9654;</span>
            <span class="city-about-label">How investment scoring works</span>
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
            <span class="city-about-label">Development team and advisers</span>
          </button>
          <div class="city-about-drawer" aria-hidden="true">
            <div class="city-about-drawer-inner">
              <p>Developed by the LOCUS-SF team with guidance from the City Assessor's Office, the City Information and Communications Technology Office (CICTO), and the Local Economic and Business Development Office (LEBDO).</p>
            </div>
          </div>
        </div>
        <div class="city-about-item" data-about-item>
          <button type="button" class="city-about-btn" data-about-toggle aria-expanded="false">
            <span class="city-about-icon" aria-hidden="true">&#9654;</span>
            <span class="city-about-label">For Property Brokers</span>
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
