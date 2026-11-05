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
$heroAvailability = 'Active listings available';
try {
    $heroListingCount = sfc_app_container()['properties']->publicListingCount();
    $heroAvailability = number_format($heroListingCount) . ($heroListingCount === 1 ? ' active listing available' : ' active listings available');
} catch (\Throwable) {
    // The hero and its destinations remain usable when catalogue data is offline.
}
?>
<main id="main-content">
  <div id="locus-react-hero" class="city-hero-frame ios-hero-frame" data-asset-base="<?= $e($context['assetBase']) ?>" data-availability="<?= $e($heroAvailability) ?>"><?= str_replace(['__LOCUS_ASSET_BASE__', '__LOCUS_AVAILABILITY__'], [$e($context['assetBase']), $e($heroAvailability)], trim((string) file_get_contents(__DIR__ . '/app/Views/home-hero.generated.html'))) ?></div>

  <!-- SAN FERNANDO AT A GLANCE -->
  <section class="home-glance" id="at-a-glance" aria-labelledby="glanceTitle">
    <div class="city-container home-glance-panel">
      <div class="glance-profile-header">
        <div>
          <p class="glance-section-label">City overview</p>
          <h2 id="glanceTitle" class="home-glance-title">San Fernando,<br class="glance-title-break"> at a glance.</h2>
          <p class="glance-profile-description">The people, businesses and connections that make up the city.</p>
        </div>
        <div class="glance-profile-meta">
          <span class="glance-reporting-period">2023&ndash;2024 figures</span>
          <a href="#properties" class="glance-property-link">
            <span>Explore properties</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
          </a>
        </div>
      </div>

      <figure class="glance-city-portrait" aria-labelledby="glancePortraitTitle">
        <div class="glance-photo-well">
          <img class="glance-city-photo" src="<?= $e($context['assetBase']) ?>/images/sfcatglance.png<?= sfc_asset_version('images/sfcatglance.png') ?>" width="1920" height="1080" alt="Aerial view across San Fernando City's streets, buildings and surrounding hills." loading="lazy" decoding="async">
          <figcaption class="glance-portrait-caption">
            <span>LA UNION / PHILIPPINES</span>
            <h3 id="glancePortraitTitle">One city.<br>Many connections.</h3>
          </figcaption>
          <div class="glance-barangay-badge" aria-label="San Fernando City, 59 barangays">
            <span>San Fernando City</span><strong>59</strong><span>barangays</span>
          </div>
        </div>
        <div class="glance-insight" id="glanceInsight" data-current-key="residents">
          <div class="glance-insight-primary">
            <p class="glance-insight-category" data-insight-category>People</p>
            <h3 data-insight-label>Residents</h3>
            <p class="glance-insight-value"><strong data-insight-value>128,024</strong><span data-insight-unit></span></p>
          </div>
          <div class="glance-insight-source">
            <span class="glance-insight-caption">Source / 2023&ndash;2024 figures</span>
            <p data-insight-source>PSA Census</p>
            <span class="glance-insight-state" data-insight-state>Selected indicator</span>
          </div>
          <div class="glance-insight-related">
            <span class="glance-insight-caption">Also in <span data-insight-related-category>People</span></span>
            <p><span data-insight-related-label>Households</span><strong><span data-insight-related-value>32,202</span><small data-insight-related-unit></small></strong></p>
            <span class="glance-insight-related-source" data-insight-related-source>PSA Census &middot; 4.0 people per household</span>
          </div>
        </div>
      </figure>

      <div id="locus-civic-metrics"><?= trim((string) file_get_contents(__DIR__ . '/app/Views/civic-metrics.generated.html')) ?></div>
    </div>
  </section>

  <!-- APPROVED TAX INCENTIVE RECIPIENTS -->
  <?php
  $incentiveRecipients = [
      [
          'id' => 'taskus', 'name' => 'TaskUs La Union', 'logo' => 'taskus.png',
          'sector' => 'Technology & customer experience',
          'location' => 'MacArthur Highway', 'years' => '6', 'period' => '2024–2029', 'start' => 2024, 'end' => 2029,
          'highlight' => '2,500+ tech & AI jobs',
          'story' => 'The Lighthouse campus supports global customer experience, technology and AI operations around the clock.',
      ],
      [
          'id' => 'robinsons', 'name' => 'Robinsons La Union', 'logo' => 'robs.png',
          'sector' => 'Retail & lifestyle',
          'location' => 'Barangay Sevilla', 'years' => '6', 'period' => '2023–2028', 'start' => 2023, 'end' => 2028,
          'highlight' => '4-level lifestyle hub',
          'story' => 'A four-level retail center with more than 100 stores, Robinsons Movieworld cinemas and lifestyle spaces.',
      ],
      [
          'id' => 'lucs', 'name' => 'LUCS', 'logo' => 'lucs.png',
          'sector' => 'Construction & infrastructure',
          'location' => 'San Fernando City', 'years' => '4', 'period' => '2023–2026', 'start' => 2023, 'end' => 2026,
          'highlight' => 'Accredited batching plant',
          'story' => 'La Union Concreting Solutions supplies ready-mix concrete and pumpcrete for roads, port infrastructure and local construction.',
      ],
      [
          'id' => 'sm-city', 'name' => 'SM City La Union', 'logo' => 'sm.png',
          'sector' => 'Retail & entertainment',
          'location' => 'Barangay Biday', 'years' => '6', 'period' => '2025–2030', 'start' => 2025, 'end' => 2030,
          'highlight' => '112,000 m² · 3,000+ regional jobs',
          'story' => 'A regional retail complex with Cyberzone, cinemas, Sandbox and more than 1,100 parking slots.',
      ],
  ];
  ?>
  <section class="locator-section" id="incentive-recipients" aria-labelledby="recipientsSectionTitle">
    <div class="city-container locator-section-content">
      <div class="locator-section-header">
        <div class="locator-section-intro">
          <p class="locator-section-eyebrow">Business community</p>
          <h2 id="recipientsSectionTitle" class="locator-section-title">In good <br>company.</h2>
          <p class="locator-section-description">Meet the businesses investing in San Fernando. Compare their approved incentives and explore each company.</p>
        </div>
        <a href="#investment-incentives-code" class="locator-terms-link" id="homeRecipientsTermsLink">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8m-8 4h5"/></svg>
          <span>View incentive terms</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
        </a>
      </div>

      <div class="locator-directory">
        <div class="locator-directory-head" aria-hidden="true">
          <span class="locator-head-company"><span class="locator-company-count"><?= sprintf('%02d', count($incentiveRecipients)) ?></span> Incentive recipients</span>
          <span>Business<br>tax holiday</span>
          <span class="locator-head-period"><span>Approved period</span><span class="locator-calendar"><?php for ($year = 2023; $year <= 2030; $year++): ?><span><?= $year ?></span><?php endfor; ?></span></span>
          <span class="locator-head-action">Company profile</span>
        </div>
        <div class="locator-grid">
        <?php foreach ($incentiveRecipients as $recipient): ?>
        <details class="locator-card">
          <summary class="locator-summary">
            <span class="locator-identity">
              <span class="locator-logo-well"><img class="locator-logo locator-logo--<?= $e($recipient['id']) ?>" src="<?= $e($context['assetBase']) ?>/images/<?= $e($recipient['logo']) ?>" alt="" width="64" height="64" loading="lazy"></span>
              <span class="locator-identity-copy">
                <span class="locator-name" id="locator-<?= $e($recipient['id']) ?>-name" role="heading" aria-level="3"><?= $e($recipient['name']) ?></span>
                <span class="locator-category"><?= $e($recipient['sector']) ?></span>
                <span class="locator-location"><?= $e($recipient['location']) ?></span>
              </span>
            </span>
            <span class="locator-benefit">
              <strong class="locator-duration"><?= $e($recipient['years']) ?> <span>years</span></strong>
              <span class="locator-benefit-label">Business tax holiday</span>
            </span>
            <span class="locator-period">
              <span class="locator-period-copy"><span class="locator-period-label">Approved period</span><span class="locator-period-dates"><?= $e($recipient['period']) ?></span></span>
              <span class="locator-timeline" aria-hidden="true" style="--period-start: <?= (int) $recipient['start'] - 2023 ?>; --period-length: <?= (int) $recipient['end'] - (int) $recipient['start'] + 1 ?>"><?php for ($year = 2023; $year <= 2030; $year++): ?><span class="locator-timeline-year<?= $year >= $recipient['start'] && $year <= $recipient['end'] ? ' is-approved' : '' ?>"></span><?php endfor; ?></span>
              <span class="locator-timeline-labels" aria-hidden="true"><?php for ($year = 2023; $year <= 2030; $year++): ?><span><?= $year ?></span><?php endfor; ?></span>
            </span>
            <span class="locator-disclosure">
              <span class="locator-details-label">View profile</span><span class="locator-hide-label">Close profile</span>
              <span class="locator-disclosure-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span>
            </span>
          </summary>
          <div class="locator-card-details">
            <div class="locator-story">
              <h4 class="locator-profile-label">About the business</h4>
              <p><?= $e($recipient['story']) ?></p>
            </div>
            <div class="locator-impact">
              <h4 class="locator-profile-label">Local presence</h4>
              <p class="locator-highlight"><?= $e($recipient['highlight']) ?></p>
            </div>
          </div>
        </details>
        <?php endforeach; ?>
        </div>
      </div>

      <p class="locator-section-note">Approved business tax incentives under City Ordinance No. 2024-41.</p>
    </div>
  </section>

  <section class="city-container city-section" id="why-invest" aria-labelledby="whyTitle">
    <div class="discovery-section-heading">
      <div>
        <span class="discovery-eyebrow"><span aria-hidden="true">03 /</span> Find your opportunity</span>
        <h2 id="whyTitle" class="city-why-heading">WHY SAN FERNANDO?</h2>
        <p class="discovery-heading-note">Six things to know before your next move. Pick a topic to begin.</p>
      </div>
      <a class="discovery-heading-link" href="https://www.sanfernandocity.gov.ph/business-in-the-city/" target="_blank" rel="noopener"><span>City investment guide</span> <span class="discovery-heading-link-arrow" aria-hidden="true">&nearr;</span></a>
    </div>

    <div class="discovery-trail" data-discovery-trail hidden>
      <div class="discovery-trail-emblem" aria-hidden="true"><?= sfc_icon('map') ?></div>
      <div class="discovery-trail-copy">
        <strong>Your city discovery</strong>
        <span data-discovery-status role="status" aria-live="polite" aria-atomic="true">0 of 6 topics explored</span>
      </div>
      <div class="discovery-trail-track" aria-hidden="true">
        <?php for ($step = 1; $step <= 6; $step++): ?><span data-discovery-step><?= $step ?></span><?php endfor; ?>
      </div>
      <button type="button" class="discovery-continue" data-discovery-continue>Start exploring <span aria-hidden="true">&rarr;</span></button>
    </div>
    <div class="discovery-guide-grid">
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
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-1.jpg" alt="Agriculture, Agribusiness, and Fishery emblem" width="48" height="48">
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
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-2.jpg" alt="Support facilities emblem" width="48" height="48">
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
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-3.jpg" alt="Tourism and Transportation emblem" width="48" height="48">
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
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-4.jpg" alt="Information and Communication Technology (ICT) emblem" width="48" height="48">
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
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-5.jpg" alt="Manufacturing / Processing emblem" width="48" height="48">
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
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-6.jpg" alt="Infrastructure, Water and Sanitation, and Property Development emblem" width="48" height="48">
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
                  <img src="<?= $e($context['assetBase']) ?>/images/sectors/sector-7.jpg" alt="Ecological Solid Waste Management emblem" width="48" height="48">
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
                <img src="<?= $e($context['assetBase']) ?>/images/thunderbird-resorts.jpg" alt="Thunderbird Resorts and Casinos, PPMC aerial view" width="640" height="360">
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
    <div class="city-section-heading tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-end sm:tw-justify-between tw-gap-3 sm:tw-gap-4 tw-mb-6">
      <div>
        <h2 class="tw-m-0 tw-text-2xl sm:tw-text-3xl tw-font-black tw-italic tw-uppercase tw-tracking-tight tw-text-[#9E1B22]" style="font-family: 'Poppins', sans-serif;">FEATURED PROPERTIES.</h2>
        <p class="tw-mt-1 tw-mb-0 tw-text-sm sm:tw-text-base tw-font-semibold tw-text-[#11224D]">Three listings to get you started.</p>
      </div>
      <a class="city-featured-props-cta tw-inline-flex tw-items-center tw-justify-center tw-whitespace-nowrap tw-w-fit tw-px-5 sm:tw-px-6 tw-py-2 sm:tw-py-2.5 tw-rounded-full tw-bg-[#9E1B22] tw-text-white tw-font-semibold tw-text-xs sm:tw-text-sm hover:tw-bg-[#80141a] hover:tw-shadow-md hover:tw-scale-[1.02] active:tw-scale-[0.98] tw-transition-all tw-duration-200" href="<?= $e(sfc_path($cataloguePath)) ?>">
        <span>View all properties</span>
        <span class="tw-ml-1.5" aria-hidden="true">&rarr;</span>
      </a>
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
              <p>Multi-Criteria Evaluation (MCE) synthesizes five core criteria totaling 100% (Spatial Accessibility 25%, Infrastructure Readiness 25%, Property Cost &amp; Market Competitiveness 20%, Nearby Businesses 15%, and Risk Constraints 15%). The Investment Attractiveness Index (IAI) is screened through a mandatory, non-compensatory CLUP Zoning Eligibility Screening Gate (0% weight). Ratings appear after complete assessment; unassessed criteria are never scored as zero.</p>
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
              <p>Submit your PRC details for <abbr class="city-acronym" tabindex="0" role="button" aria-expanded="false" data-acronym="LEBDO" title="Local Economic and Business Development Office">LEBDO<span class="city-acronym-popover" role="tooltip">Local Economic and Business Development Office</span></abbr> and <abbr class="city-acronym" tabindex="0" role="button" aria-expanded="false" data-acronym="CAO" title="City Assessor's Office">CAO<span class="city-acronym-popover" role="tooltip">City Assessor's Office</span></abbr> review, then submit properties for city approval.</p>
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
