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
        <div class="city-hero-lead">
          <h1 id="heroTitle" class="city-hero-title">FIND THE PLACE<br>FOR WHAT COMES NEXT.</h1>
          <p class="city-hero-subtitle">Explore verified properties and investment opportunities across San Fernando City.</p>
          <div class="city-hero-action-row">
            <a class="city-button city-hero-btn" href="#properties">Explore properties</a>
          </div>
        </div>
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

  <!-- APPROVED TAX INCENTIVE RECIPIENTS (Catalyst locator showcase below glance) -->
  <section class="city-container home-recipients-section" id="incentive-recipients" aria-labelledby="recipientsSectionTitle">
    <div class="home-recipients-panel">
      <div class="home-recipients-header">
        <div class="home-recipients-header-lead">
          <div class="home-recipients-kicker-wrap">
            <span class="home-recipients-kicker-dot" aria-hidden="true"></span>
            <span class="home-recipients-kicker">APPROVED TAX HOLIDAYS &bull; ORDINANCE NO. 2024-41</span>
          </div>
          <h2 id="recipientsSectionTitle" class="home-recipients-title">Catalyst Investment Locators</h2>
          <p class="home-recipients-desc">Major enterprises granted municipal tax holidays, anchoring commercial vitality and job creation across San Fernando.</p>
        </div>
        <a href="#investment-incentives-code" class="home-recipients-link" id="homeRecipientsTermsLink" title="View Ordinance No. 2024-41 Incentives Code">
          <span>Ordinance terms</span>
          <span aria-hidden="true">&rarr;</span>
        </a>
      </div>

      <div class="home-recipients-grid">
        <!-- 1. TaskUs La Union -->
        <a href="#why-invest" class="home-recipient-item" title="TaskUs La Union: 6 years business tax holiday">
          <div class="home-recipient-logo">
            <img src="<?= $e($context['assetBase']) ?>/images/brands/taskus.svg" alt="TaskUs La Union" width="140" height="52" loading="lazy">
          </div>
          <div class="home-recipient-info">
            <h3 class="home-recipient-name">TASKUS LA UNION</h3>
            <span class="home-recipient-badge">6 yrs tax holiday*</span>
          </div>
        </a>

        <!-- 2. Robinsons La Union -->
        <a href="#why-invest" class="home-recipient-item" title="Robinsons La Union: 6 years business tax holiday (2023–2028)">
          <div class="home-recipient-logo">
            <img src="<?= $e($context['assetBase']) ?>/images/brands/robinsons.svg" alt="Robinsons La Union" width="140" height="52" loading="lazy">
          </div>
          <div class="home-recipient-info">
            <h3 class="home-recipient-name">ROBINSONS LA UNION</h3>
            <span class="home-recipient-badge">6 yrs holiday &bull; 2023–28</span>
          </div>
        </a>

        <!-- 3. LUCS -->
        <a href="#why-invest" class="home-recipient-item" title="La Union Concreting Solutions: 4 years business tax holiday (2023–2026)">
          <div class="home-recipient-logo home-recipient-logo--lucs">
            <img src="<?= $e($context['assetBase']) ?>/images/brands/lucs.svg" alt="La Union Concreting Solutions" width="140" height="52" loading="lazy">
          </div>
          <div class="home-recipient-info">
            <h3 class="home-recipient-name">LUCS</h3>
            <span class="home-recipient-badge">4 yrs holiday &bull; 2023–26</span>
          </div>
        </a>

        <!-- 4. SM City La Union -->
        <a href="#why-invest" class="home-recipient-item" title="SM City La Union: 6 years business tax holiday (2025–2030)">
          <div class="home-recipient-logo">
            <img src="<?= $e($context['assetBase']) ?>/images/brands/smcity-logo.svg" alt="SM City La Union" width="140" height="52" loading="lazy">
          </div>
          <div class="home-recipient-info">
            <h3 class="home-recipient-name">SM CITY LA UNION</h3>
            <span class="home-recipient-badge">6 yrs holiday &bull; 2025–30</span>
          </div>
        </a>
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
      <article class="city-why-card" id="priority-investment-sectors">
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
            <span class="city-why-pill">ORDINANCE NO. 2024-41 PRIORITY SECTORS</span>
            <p class="city-why-desc">The City Government of San Fernando designates 7 priority investment sectors eligible for local business tax holidays, capital incentives, and dedicated LEBDO investment facilitation.</p>

            <div class="city-priority-sectors-list">
              <!-- Sector 1 -->
              <div class="city-priority-sector-item">
                <div class="city-priority-sector-icon">
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-1.jpg" alt="Agriculture, Agribusiness, and Fishery emblem" width="48" height="48" loading="lazy">
                </div>
                <div class="city-priority-sector-content">
                  <div class="city-priority-sector-meta">
                    <span class="city-priority-sector-badge">Sector 01</span>
                    <h4 class="city-priority-sector-name">Agriculture, Agribusiness, and Fishery</h4>
                  </div>
                  <p class="city-priority-sector-desc">Commercial crops, organic agriculture, livestock and poultry production, aquaculture, and coastal marine catch.</p>
                </div>
              </div>

              <!-- Sector 2 -->
              <div class="city-priority-sector-item">
                <div class="city-priority-sector-icon">
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-2.jpg" alt="Support facilities emblem" width="48" height="48" loading="lazy">
                </div>
                <div class="city-priority-sector-content">
                  <div class="city-priority-sector-meta">
                    <span class="city-priority-sector-badge">Sector 02</span>
                    <h4 class="city-priority-sector-name">Support Facilities for Agriculture &amp; Food Production</h4>
                  </div>
                  <p class="city-priority-sector-desc">Irrigation systems, post-harvest facilities, cold storage, blast freezing, and local production of fertilizers and pesticides.</p>
                </div>
              </div>

              <!-- Sector 3 -->
              <div class="city-priority-sector-item">
                <div class="city-priority-sector-icon">
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-3.jpg" alt="Tourism and Transportation emblem" width="48" height="48" loading="lazy">
                </div>
                <div class="city-priority-sector-content">
                  <div class="city-priority-sector-meta">
                    <span class="city-priority-sector-badge">Sector 03</span>
                    <h4 class="city-priority-sector-name">Tourism and Transportation</h4>
                  </div>
                  <p class="city-priority-sector-desc">Eco-tourism attractions, coastal resorts, heritage hospitality, MICE convention facilities, transit terminals, and multi-modal logistics.</p>
                </div>
              </div>

              <!-- Sector 4 -->
              <div class="city-priority-sector-item">
                <div class="city-priority-sector-icon">
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-4.jpg" alt="Information and Communication Technology (ICT) emblem" width="48" height="48" loading="lazy">
                </div>
                <div class="city-priority-sector-content">
                  <div class="city-priority-sector-meta">
                    <span class="city-priority-sector-badge">Sector 04</span>
                    <h4 class="city-priority-sector-name">Information and Communication Technology (ICT)</h4>
                  </div>
                  <p class="city-priority-sector-desc">IT-BPM operations, software development, data center infrastructure, telecommunications, and digital innovation ecosystems.</p>
                </div>
              </div>

              <!-- Sector 5 -->
              <div class="city-priority-sector-item">
                <div class="city-priority-sector-icon">
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-5.jpg" alt="Manufacturing / Processing emblem" width="48" height="48" loading="lazy">
                </div>
                <div class="city-priority-sector-content">
                  <div class="city-priority-sector-meta">
                    <span class="city-priority-sector-badge">Sector 05</span>
                    <h4 class="city-priority-sector-name">Manufacturing / Processing</h4>
                  </div>
                  <p class="city-priority-sector-desc">Agro-industrial processing, food packaging, electronics assembly, renewable materials, and value-added export production.</p>
                </div>
              </div>

              <!-- Sector 6 -->
              <div class="city-priority-sector-item">
                <div class="city-priority-sector-icon">
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-6.jpg" alt="Infrastructure, Water and Sanitation, and Property Development emblem" width="48" height="48" loading="lazy">
                </div>
                <div class="city-priority-sector-content">
                  <div class="city-priority-sector-meta">
                    <span class="city-priority-sector-badge">Sector 06</span>
                    <h4 class="city-priority-sector-name">Infrastructure, Water &amp; Sanitation, Property Development</h4>
                  </div>
                  <p class="city-priority-sector-desc">Commercial real estate, eco-zone development, water supply systems, modern sanitation facilities, and urban infrastructure.</p>
                </div>
              </div>

              <!-- Sector 7 -->
              <div class="city-priority-sector-item">
                <div class="city-priority-sector-icon">
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-7.jpg" alt="Ecological Solid Waste Management emblem" width="48" height="48" loading="lazy">
                </div>
                <div class="city-priority-sector-content">
                  <div class="city-priority-sector-meta">
                    <span class="city-priority-sector-badge">Sector 07</span>
                    <h4 class="city-priority-sector-name">Ecological Solid Waste Management</h4>
                  </div>
                  <p class="city-priority-sector-desc">Materials recovery facilities (MRF), waste-to-energy technologies, industrial recycling plants, composting, and circular solutions.</p>
                </div>
              </div>
            </div>

            <!-- Direct Official Guide Link Button -->
            <a href="https://www.sanfernandocity.gov.ph/business-in-the-city/" target="_blank" rel="noopener noreferrer" class="city-why-sectors-portal-btn">
              <span>View Priority Investment Sectors on Official City Portal</span>
              <span aria-hidden="true">&nearr;</span>
            </a>
          </div>
        </div>
      </article>

      <!-- 4. Investment & Incentives (Government Shield Icon - No AI Diamond Spark) -->
      <article class="city-why-card" id="investment-incentives-code">
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
            
            <!-- Official City Government Ordinance Code Showcase (Matching sanfernandocity.gov.ph) -->
            <div class="city-ordinance-showcase">
              <div class="city-ordinance-showcase-copy">
                <span class="city-ordinance-kicker">CITY STATUTE &bull; LEBDO / CAO</span>
                <h4 class="city-ordinance-showcase-title">Investments and Incentives Code of the City of San Fernando, La Union</h4>
                <p class="city-ordinance-showcase-sub">Ordinance No. 2024-41</p>
                <a href="https://drive.google.com/file/d/1S5q2HOklGy4O692uYMgHrZNNXOpYqZ69/view?usp=sharing" target="_blank" rel="noopener noreferrer" class="city-ordinance-download-btn" title="Download Official Ordinance No. 2024-41 (PDF)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Download</span>
                </a>
              </div>
              <div class="city-ordinance-showcase-media">
                <img src="<?= $e($context['assetBase']) ?>/images/thunderbird-resorts.jpg" alt="Thunderbird Resorts and Casinos, PPMC aerial view" width="640" height="360" loading="lazy">
                <span class="city-ordinance-media-caption">Thunderbird Resorts and Casinos, PPMC</span>
              </div>
            </div>

            <span class="city-why-pill">ORDINANCE NO. 2024-41</span>
            <p class="city-why-desc">Ordinance No. 2024-41 provides the city’s legislative framework for qualified capital investments, local tax exemptions, and priority economic activities.</p>
            
            <span class="city-why-pill">LEBDO INVESTOR FACILITATION</span>
            <p class="city-why-desc">Direct investor concierge support through the Local Economic and Business Development Office for site permits, evaluations, and enterprise onboarding.</p>

            <div class="city-why-concierge-callout">
              <div class="city-why-concierge-row">
                <span class="city-why-concierge-tag">Investment Officers:</span>
                <span><strong>Rizalyn D. Medrano, EnP</strong> (<a href="tel:09175721230" class="city-why-concierge-link">0917 572 1230</a>) &bull; <strong>Irish Dominique D. Halabaso</strong> (<a href="tel:09163861007" class="city-why-concierge-link">0916 386 1007</a>)</span>
              </div>
              <div class="city-why-concierge-row">
                <span class="city-why-concierge-tag">Hotline &bull; Venue:</span>
                <span><a href="tel:+63726197170" class="city-why-concierge-link">(072) 619 - 7170</a> &bull; Permanent Business One Stop Shop Building, City of San Fernando, La Union</span>
              </div>
            </div>
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
            
            <!-- Category Selector (Matching sanfernandocity.gov.ph menu) -->
            <label class="tw-block tw-mb-3">
              <span class="tw-sr-only">Select Cost of Doing Business category</span>
              <select id="cityCostCategory" class="city-why-select" aria-label="Cost category">
                <option value="wages" selected>Wage Rates</option>
                <option value="rent">Rental / Lease Rates</option>
                <option value="power">Power Rates</option>
                <option value="water">Water Cost</option>
                <option value="internet">Telco / Internet Cost</option>
              </select>
            </label>

            <!-- Dynamic Cost Data Card (Accurate Data from City Government Portal) -->
            <div id="cityCostCard" class="city-cost-display-card" aria-live="polite">
              <div class="city-cost-card-header">
                <span class="city-cost-card-tag">Wage Order No. RB1-23 &bull; RTWPB Region I</span>
              </div>
              <div class="city-cost-card-rows">
                <div class="city-cost-row">
                  <span class="city-cost-label">Non-Agriculture (&ge;10 workers)</span>
                  <strong class="city-cost-rate">₱468.00 <small>/ day</small></strong>
                </div>
                <div class="city-cost-row">
                  <span class="city-cost-label">Agriculture &amp; Micro (&lt;10 workers)</span>
                  <strong class="city-cost-rate">₱435.00 <small>/ day</small></strong>
                </div>
              </div>
              <p class="city-cost-source">Official statutory minimum wage order for City of San Fernando, La Union.</p>
            </div>

            <!-- Direct Official City Portal Link Button -->
            <a href="https://www.sanfernandocity.gov.ph/business-in-the-city/" target="_blank" rel="noopener noreferrer" class="city-why-cost-portal-btn">
              <span>Proceed to official Cost of Doing Business portal</span>
              <span aria-hidden="true">&nearr;</span>
            </a>

            <div class="city-cost-footer-meta">
              <span class="city-why-pill">REGIONAL COST ADVANTAGE</span>
              <p class="city-why-desc">Predictable labor rates under RTWPB Region I wage orders and favorable commercial lease rates across prime city barangays.</p>
            </div>

          </div>
        </div>
      </article>

      <!-- 6. Setting Up a Business -->
      <article class="city-why-card city-why-card--setup" aria-labelledby="setupTitle" id="setting-up-business">
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
            <span class="city-why-pill">BPLO UNIFIED PERMITTING &amp; CLEARANCES</span>
            <p class="city-why-desc">Direct access to official city government service guides and downloadable statutory forms for commercial registration, building construction, and occupancy clearances in the City of San Fernando, La Union.</p>

            <!-- Embedded City Government Business Setup & Downloadable Forms Panel -->
            <div class="city-bizsetup-wrapper">
              
              <!-- Dark Navy Top Banner (Exact match to official user reference) -->
              <div class="city-bizsetup-banner">
                <h4 id="bizSetupTitle" class="city-bizsetup-banner-title">SETTING UP A BUSINESS</h4>
              </div>

              <!-- Main Two-Column Panel -->
              <div class="city-bizsetup-body">
                
                <!-- Left Column: Service & Permitting Process Guides -->
                <div class="city-bizsetup-processes">
                  
                  <!-- 1. Building Permits -->
                  <a href="https://drive.google.com/file/d/1DloBykQcchM_UEEnc2lz6LyAoir6QOjx/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="city-bizsetup-process-card" title="View Guide: Granting of Building Permits (PDF)">
                    <div class="city-bizsetup-process-icon" aria-hidden="true">
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                        <path d="M9 22v-4h6v4"/>
                        <path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/>
                        <path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 10h.01"/>
                        <path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M12 14h.01"/>
                      </svg>
                    </div>
                    <span class="city-bizsetup-process-label">Granting of Building Permits</span>
                    <span class="city-bizsetup-guide-badge">PDF Guide &nearr;</span>
                  </a>

                  <!-- 2. Certificate of Occupancy -->
                  <a href="https://drive.google.com/file/d/1ZE53YIu8rp3oV7-OodebVfu2xn2o8ClY/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="city-bizsetup-process-card" title="View Guide: Granting of Certificate of Occupancy (PDF)">
                    <div class="city-bizsetup-process-icon" aria-hidden="true">
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    </div>
                    <span class="city-bizsetup-process-label">Granting of Certificate of Occupancy</span>
                    <span class="city-bizsetup-guide-badge">PDF Guide &nearr;</span>
                  </a>

                  <!-- 3. Issuance of Business Permits -->
                  <a href="https://drive.google.com/file/d/1Qz_wQBGbFNXBS4AOtjrAZhETPMOPFOXQ/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="city-bizsetup-process-card" title="View Guide: Issuance of Business Permits (PDF)">
                    <div class="city-bizsetup-process-icon" aria-hidden="true">
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        <path d="M9 12l2 2 4-4"/>
                      </svg>
                    </div>
                    <span class="city-bizsetup-process-label">Issuance of Business Permits</span>
                    <span class="city-bizsetup-guide-badge">PDF Guide &nearr;</span>
                  </a>

                  <!-- 4. Online Application -->
                  <a href="https://drive.google.com/file/d/16xVoUMdnBWc9YcmWHV_hl6FooQKf9sSs/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="city-bizsetup-process-card" title="View Guide: Issuance of Business Permits (Online Application)">
                    <div class="city-bizsetup-process-icon" aria-hidden="true">
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                    </div>
                    <span class="city-bizsetup-process-label">Issuance of Business Permits (Online Application)</span>
                    <span class="city-bizsetup-guide-badge">PDF Guide &nearr;</span>
                  </a>

                  <!-- 5. Individual Work Permit -->
                  <a href="https://drive.google.com/file/d/1JANXE1aKykLYTFXV-4-ziP1QoNNFz880/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="city-bizsetup-process-card" title="View Guide: Issuance of Individual Work Permit (PDF)">
                    <div class="city-bizsetup-process-icon" aria-hidden="true">
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="9" cy="10" r="2"/>
                        <path d="M15 8h2"/><path d="M15 12h2"/><path d="M7 16h10"/>
                      </svg>
                    </div>
                    <span class="city-bizsetup-process-label">Issuance of Individual Work Permit</span>
                    <span class="city-bizsetup-guide-badge">PDF Guide &nearr;</span>
                  </a>

                </div>

                <!-- Right Column: Downloadable Application Forms -->
                <div class="city-bizsetup-forms">
                  <div class="city-bizsetup-forms-header">
                    <h3 class="city-bizsetup-forms-title">Downloadable Forms</h3>
                    <span class="city-bizsetup-forms-subtitle">Official city templates &amp; editable documents</span>
                  </div>

                  <ul class="city-bizsetup-forms-list">
                    
                    <!-- Form 1 -->
                    <li class="city-bizsetup-form-item">
                      <a href="https://drive.google.com/file/d/1fJzaahmyEG_YKI5Y-p04NrF1m1PvekiC/view?usp=sharing" target="_blank" rel="noopener noreferrer" class="city-bizsetup-form-link" title="Download Business Permit: Unified Application Form (PDF)">
                        <div class="city-bizsetup-form-icon" aria-hidden="true">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                          </svg>
                        </div>
                        <span class="city-bizsetup-form-name">Business Permit: Unified Application Form</span>
                        <span class="city-bizsetup-file-type">PDF</span>
                      </a>
                    </li>

                    <!-- Form 2 -->
                    <li class="city-bizsetup-form-item">
                      <a href="https://drive.google.com/file/d/1SjDDUy7WW-PFPHzvYO__T9o7ZoTAAv7V/view?usp=sharing" target="_blank" rel="noopener noreferrer" class="city-bizsetup-form-link" title="Download Individual Work Permit Form (PDF)">
                        <div class="city-bizsetup-form-icon" aria-hidden="true">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                        </div>
                        <span class="city-bizsetup-form-name">Individual Work Permit Form</span>
                        <span class="city-bizsetup-file-type">PDF</span>
                      </a>
                    </li>

                    <!-- Form 3 -->
                    <li class="city-bizsetup-form-item">
                      <a href="https://docs.google.com/document/d/1A-7d8BW_Z7qk2c-0IF93ukmNFy1oqis6/edit?usp=sharing&ouid=106428727393651378136&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" class="city-bizsetup-form-link" title="Download Building Permit Application Form (DOCX)">
                        <div class="city-bizsetup-form-icon" aria-hidden="true">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                            <path d="M9 22v-4h6v4"/>
                            <path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/>
                          </svg>
                        </div>
                        <span class="city-bizsetup-form-name">Building Permit Application Form</span>
                        <span class="city-bizsetup-file-type">DOCX</span>
                      </a>
                    </li>

                    <!-- Form 4 -->
                    <li class="city-bizsetup-form-item">
                      <a href="https://docs.google.com/spreadsheets/d/1ysv0MfAet6MStOQg3kXymb2BmGJlayXk/edit?usp=drive_link&ouid=106428727393651378136&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" class="city-bizsetup-form-link" title="Download Architectural Permit Form (XLSX)">
                        <div class="city-bizsetup-form-icon" aria-hidden="true">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                          </svg>
                        </div>
                        <span class="city-bizsetup-form-name">Architectural Permit Form</span>
                        <span class="city-bizsetup-file-type">XLSX</span>
                      </a>
                    </li>

                    <!-- Form 5 -->
                    <li class="city-bizsetup-form-item">
                      <a href="https://docs.google.com/spreadsheets/d/1CCBI5P1X-LDU2U9xqtGrp2poxBUyIS6H/edit?usp=drive_link&ouid=106428727393651378136&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" class="city-bizsetup-form-link" title="Download Civil/Structural Permit Form (XLSX)">
                        <div class="city-bizsetup-form-icon" aria-hidden="true">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                          </svg>
                        </div>
                        <span class="city-bizsetup-form-name">Civil/Structural Permit Form</span>
                        <span class="city-bizsetup-file-type">XLSX</span>
                      </a>
                    </li>

                    <!-- Form 6 -->
                    <li class="city-bizsetup-form-item">
                      <a href="https://docs.google.com/spreadsheets/d/18qKQ_RBFB7tiHW7MAAKmZt20bAIDMwIx/edit?usp=drive_link&ouid=106428727393651378136&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" class="city-bizsetup-form-link" title="Download Electrical Permit Form (XLSX)">
                        <div class="city-bizsetup-form-icon" aria-hidden="true">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                          </svg>
                        </div>
                        <span class="city-bizsetup-form-name">Electrical Permit Form</span>
                        <span class="city-bizsetup-file-type">XLSX</span>
                      </a>
                    </li>

                    <!-- Form 7 -->
                    <li class="city-bizsetup-form-item">
                      <a href="https://docs.google.com/spreadsheets/d/1ye-BdIOL37HlQ_2fgdCmUrc7WaySY8zx/edit?usp=drive_link&ouid=106428727393651378136&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" class="city-bizsetup-form-link" title="Download Sanitary/Plumbing Permit Application Form (XLSX)">
                        <div class="city-bizsetup-form-icon" aria-hidden="true">
                          <svg width="17" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                          </svg>
                        </div>
                        <span class="city-bizsetup-form-name">Sanitary/Plumbing Permit Application Form</span>
                        <span class="city-bizsetup-file-type">XLSX</span>
                      </a>
                    </li>

                    <!-- Form 8 -->
                    <li class="city-bizsetup-form-item">
                      <a href="https://docs.google.com/spreadsheets/d/12w_0yhAeWEu7oorV7YhET-_NKhojOStZ/edit?usp=drive_link&ouid=106428727393651378136&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" class="city-bizsetup-form-link" title="Download Mechanical Permit Form (XLSX)">
                        <div class="city-bizsetup-form-icon" aria-hidden="true">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                          </svg>
                        </div>
                        <span class="city-bizsetup-form-name">Mechanical Permit Form</span>
                        <span class="city-bizsetup-file-type">XLSX</span>
                      </a>
                    </li>

                    <!-- Form 9 -->
                    <li class="city-bizsetup-form-item">
                      <a href="https://docs.google.com/document/d/1TK3EXGXx1GT9frQiHdP17jIfC9JCqSUH/edit?usp=drive_link&ouid=106428727393651378136&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" class="city-bizsetup-form-link" title="Download Electronics Permit Form (DOCX)">
                        <div class="city-bizsetup-form-icon" aria-hidden="true">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                          </svg>
                        </div>
                        <span class="city-bizsetup-form-name">Electronics Permit Form</span>
                        <span class="city-bizsetup-file-type">DOCX</span>
                      </a>
                    </li>

                    <!-- Form 10 -->
                    <li class="city-bizsetup-form-item">
                      <a href="https://docs.google.com/spreadsheets/d/1lMrNo0IceVlaGq4y_b8RYltzJlBSS3Kx/edit?usp=drive_link&ouid=106428727393651378136&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" class="city-bizsetup-form-link" title="Download Demolition Permit Form (XLSX)">
                        <div class="city-bizsetup-form-icon" aria-hidden="true">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                          </svg>
                        </div>
                        <span class="city-bizsetup-form-name">Demolition Permit Form</span>
                        <span class="city-bizsetup-file-type">XLSX</span>
                      </a>
                    </li>

                  </ul>

                  <div class="city-bizsetup-source-note">
                    <span>Direct Google Drive &bull; Official City Government of San Fernando Portal (<a href="https://www.sanfernandocity.gov.ph/business-in-the-city/" target="_blank" rel="noopener noreferrer">sanfernandocity.gov.ph ↗</a>)</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      </article>
    </div>
  </section>

  <!-- INVESTMENT ASSISTANCE & CONCIERGE -->
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

  <!-- INVESTMENT ASSISTANCE & CONCIERGE (Positioned below featured properties) -->
  <section class="city-container city-section" id="investment-concierge" aria-labelledby="conciergeTitle">
    <div class="city-concierge-panel">
      
      <div class="city-concierge-header">
        <div>
          <span class="city-concierge-kicker">City Government of San Fernando &bull; LEBDO</span>
          <h2 id="conciergeTitle" class="city-concierge-title">INVESTMENT INQUIRIES &amp; ASSISTANCE</h2>
          <p class="city-concierge-subtitle">Direct facilitation for capital investors, business locators, and tax incentive applications.</p>
        </div>
        <div class="city-concierge-hotline-pill">
          <div class="city-concierge-hotline-meta">
            <span class="hotline-meta-label">Direct Trunkline</span>
            <a href="tel:+63726197170" class="hotline-meta-number" title="Call City Investment Hotline (072) 619 - 7170">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.24 1.02l-2.21 2.2z"/></svg>
              <span>(072) 619 - 7170</span>
            </a>
          </div>
        </div>
      </div>

      <div class="city-concierge-grid">
        
        <!-- Officer 1: Rizalyn D. Medrano, EnP -->
        <article class="city-concierge-card">
          <div class="city-concierge-card-body">
            <div class="city-concierge-avatar city-concierge-avatar-crimson" aria-hidden="true">RM</div>
            <div class="city-concierge-details">
              <span class="city-concierge-badge">Investment Officer</span>
              <h3 class="city-concierge-name">Rizalyn D. Medrano, EnP</h3>
              <p class="city-concierge-position">City Government Department Head / Investment Officer</p>
              <p class="city-concierge-dept">Local Economic &amp; Business Development Office</p>
            </div>
          </div>
          <div class="city-concierge-card-action">
            <a href="tel:09175721230" class="city-concierge-dial-btn" title="Call Rizalyn D. Medrano">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>0917 572 1230</span>
            </a>
          </div>
        </article>

        <!-- Officer 2: Irish Dominique D. Halabaso -->
        <article class="city-concierge-card">
          <div class="city-concierge-card-body">
            <div class="city-concierge-avatar city-concierge-avatar-navy" aria-hidden="true">IH</div>
            <div class="city-concierge-details">
              <span class="city-concierge-badge">Project Development</span>
              <h3 class="city-concierge-name">Irish Dominique D. Halabaso</h3>
              <p class="city-concierge-position">Project Development Officer III</p>
              <p class="city-concierge-dept">Local Economic &amp; Business Development Office</p>
            </div>
          </div>
          <div class="city-concierge-card-action">
            <a href="tel:09163861007" class="city-concierge-dial-btn" title="Call Irish Dominique D. Halabaso">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>0916 386 1007</span>
            </a>
          </div>
        </article>

        <!-- Physical Facility Card: Permanent Business One Stop Shop Building -->
        <article class="city-concierge-card city-concierge-card-facility">
          <div class="city-concierge-card-body">
            <div class="city-concierge-avatar city-concierge-avatar-gold" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>
            </div>
            <div class="city-concierge-details">
              <span class="city-concierge-badge city-concierge-badge-facility">Walk-In Center</span>
              <h3 class="city-concierge-name">Permanent Business One Stop Shop Building</h3>
              <p class="city-concierge-position">City of San Fernando, La Union &bull; Mon–Fri, 8:00 AM – 5:00 PM</p>
              <p class="city-concierge-dept">Unified Permitting, Locational Clearance &amp; Incentives Concierge</p>
            </div>
          </div>
          <div class="city-concierge-card-action">
            <a href="https://maps.google.com/?q=Permanent+Business+One+Stop+Shop+Building+City+of+San+Fernando+La+Union" target="_blank" rel="noopener noreferrer" class="city-concierge-venue-btn" title="View Permanent BOSS Building on Map">
              <span>View On Map &nearr;</span>
            </a>
          </div>
        </article>

      </div>
    </div>
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
  <div class="city-privacy-icon" aria-hidden="true">
    <svg width="44" height="48" viewBox="0 0 44 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 3.5C18 6.5 12 7 7 8.5V23C7 33.5 13.5 41.5 22 45C30.5 41.5 37 33.5 37 23V8.5C32 7 26 6.5 22 3.5Z" stroke="#E50000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 7C18.5 9.8 13.5 10.2 9.5 11.5V23C9.5 31.8 15 38.8 22 42C29 38.8 34.5 31.8 34.5 23V11.5C30.5 10.2 25.5 9.8 22 7Z" stroke="#E50000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 23.5L20.5 28L28.5 19.5" stroke="#E50000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
  <div class="city-privacy-overline">SECURITY &amp; TRUST</div>
  <h2 id="cityPrivacyTitle" class="city-privacy-headline">Your privacy matters.</h2>
  <p class="city-privacy-body">To proceed, we need your consent to collect and process your personal and property data for the City Government of San Fernando, in accordance with the Data Privacy Act of 2012 (RA 10173).</p>
  <div class="city-privacy-link-wrap">
    <a class="city-privacy-link" href="<?= $e(sfc_path('/privacy.php')) ?>">Read our Privacy Notice &rarr;</a>
  </div>
  <label class="city-privacy-checkbox-label" id="cityPrivacyLabel">
    <input type="checkbox" id="cityPrivacyConsent" class="city-privacy-checkbox">
    <span>I agree to the collection and processing of my data.</span>
  </label>
  <div class="city-privacy-buttons">
    <button class="city-privacy-btn-create" id="cityPrivacyContinue" type="button" disabled>Create account</button>
    <button class="city-privacy-btn-guest" id="cityPrivacyGuest" type="button">Browse as guest</button>
  </div>
</dialog>
<?php endif; ?>
<script type="module" src="<?= $e($context['assetBase']) ?>/js/city-workspace.js<?= sfc_asset_version('js/city-workspace.js') ?>"></script>
<?php sfc_render_footer($context); ?>
