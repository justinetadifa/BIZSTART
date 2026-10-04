<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
$heroImage = $context['assetBase'] . '/images/introlocus-sf.png';
$welcomeBypass = (string) ($_GET['welcome'] ?? '') === 'off';
$welcomeFallbackHref = sfc_path('/index.php?welcome=off#main-content');
sfc_render_head('LOCUS-SF', $context, ['page' => 'landing', 'role' => $context['user']['role'] ?? 'guest']);
?>
<script>
  window.LOCUS_PRELOADER?.dismiss(true);
  (() => {
    const welcomeMode = new URLSearchParams(window.location.search).get('welcome');
    if (welcomeMode === 'off') return;

    const sessionKey = `locus-sf.cinematic:${window.SFC_APP_CONFIG?.basePath || ''}`;
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(sessionKey) === '1';
    } catch {
      // A blocked storage API should not prevent the visitor from continuing.
    }

    if (!dismissed || welcomeMode === 'replay') {
      // Enter the cinematic welcome before the homepage is painted. Its native
      // Continue link returns here with ?welcome=off if scripts/storage fail.
      window.__LOCUS_CINEMATIC_REDIRECT__ = true;
      const introUrl = new URL('locus-cinematic.html', document.baseURI);
      if (welcomeMode === 'replay') introUrl.searchParams.set('replay', '1');
      window.location.replace(introUrl.href);
      return;
    }
  })();
</script>
<?php if (!$welcomeBypass): ?>
<section
  class="locus-welcome"
  data-locus-welcome
  role="dialog"
  aria-modal="true"
  aria-labelledby="locusWelcomeTitle"
  aria-describedby="locusWelcomeDescription"
>
  <div class="locus-welcome__backdrop" aria-hidden="true"></div>
  <div class="locus-welcome__shade" aria-hidden="true"></div>
  <canvas class="locus-welcome__particles" aria-hidden="true"></canvas>

  <!-- Interactive Spatial Beacons on San Fernando City landmarks -->
  <div class="locus-welcome__beacons" aria-label="City Corridor Beacons">
    <!-- Beacon 01: Poro Point Logistics & Freeport -->
    <button
      type="button"
      class="locus-beacon locus-beacon--poro"
      data-beacon="poro"
      data-lat="16.6021&deg; N"
      data-lng="120.3015&deg; E"
      data-name="Poro Point Freeport"
      data-corridor="Logistics Gateway"
      data-stat="94.2 Attractiveness"
      aria-label="Poro Point Freeport corridor"
    >
      <span class="locus-beacon__wave"></span>
      <span class="locus-beacon__core"></span>
      <span class="locus-beacon__pill">
        <span class="locus-beacon__tag">01</span>
        <span class="locus-beacon__name">Poro Point</span>
      </span>
      <span class="locus-beacon__card" role="tooltip">
        <span class="locus-beacon__card-badge">Logistics Gateway</span>
        <strong class="locus-beacon__card-title">Poro Point Freeport</strong>
        <span class="locus-beacon__card-desc">Deep-water port, industrial corridor & logistics center</span>
        <span class="locus-beacon__card-meta">
          <span>Corridor Fit</span>
          <strong>94.2 Score</strong>
        </span>
      </span>
    </button>

    <!-- Beacon 02: City Center Commercial & Civic Belt -->
    <button
      type="button"
      class="locus-beacon locus-beacon--center"
      data-beacon="center"
      data-lat="16.6159&deg; N"
      data-lng="120.3168&deg; E"
      data-name="City Center Corridor"
      data-corridor="Commercial Belt"
      data-stat="88.7 Attractiveness"
      aria-label="City Center and Commercial Belt corridor"
    >
      <span class="locus-beacon__wave"></span>
      <span class="locus-beacon__core"></span>
      <span class="locus-beacon__pill">
        <span class="locus-beacon__tag">02</span>
        <span class="locus-beacon__name">City Center</span>
      </span>
      <span class="locus-beacon__card" role="tooltip">
        <span class="locus-beacon__card-badge">Commercial Belt</span>
        <strong class="locus-beacon__card-title">City Center &amp; Civic Hub</strong>
        <span class="locus-beacon__card-desc">Core financial spine, city services & retail district</span>
        <span class="locus-beacon__card-meta">
          <span>Demand Pull</span>
          <strong>88.7 Score</strong>
        </span>
      </span>
    </button>

    <!-- Beacon 03: Solar Innovation Rooftop Corridor -->
    <button
      type="button"
      class="locus-beacon locus-beacon--solar"
      data-beacon="solar"
      data-lat="16.6184&deg; N"
      data-lng="120.3204&deg; E"
      data-name="Solar Innovation Belt"
      data-corridor="Clean Energy Zone"
      data-stat="91.5 Readiness"
      aria-label="Solar Innovation Commercial facility"
    >
      <span class="locus-beacon__wave"></span>
      <span class="locus-beacon__core"></span>
      <span class="locus-beacon__pill">
        <span class="locus-beacon__tag">03</span>
        <span class="locus-beacon__name">Solar Belt</span>
      </span>
      <span class="locus-beacon__card" role="tooltip">
        <span class="locus-beacon__card-badge">Clean Energy Zone</span>
        <strong class="locus-beacon__card-title">Commercial Solar Array</strong>
        <span class="locus-beacon__card-desc">High-capacity clean energy rooftop infrastructure</span>
        <span class="locus-beacon__card-meta">
          <span>Readiness</span>
          <strong>91.5 Score</strong>
        </span>
      </span>
    </button>
  </div>

  <!-- Interactive Telemetry HUD (top right) -->
  <div class="locus-welcome__hud" aria-hidden="true">
    <div class="locus-welcome__hud-item locus-welcome__hud-time-pill">
      <span class="locus-welcome__hud-pulse"></span>
      <span data-locus-clock>San Fernando &bull; 13:04 PHT</span>
    </div>
    <div class="locus-welcome__hud-item locus-welcome__hud-target-pill">
      <span class="locus-welcome__hud-label">SURVEY FOCUS</span>
      <strong class="locus-welcome__hud-target" data-locus-hud-target>PORO POINT HORIZON</strong>
    </div>
  </div>

  <div class="locus-welcome__geo" aria-hidden="true">
    <div class="locus-welcome__geo-grid"></div>
    <div class="locus-welcome__radar">
      <span class="locus-welcome__radar-sweep"></span>
      <span class="locus-welcome__geo-node locus-welcome__geo-node--one"></span>
      <span class="locus-welcome__geo-node locus-welcome__geo-node--two"></span>
      <span class="locus-welcome__geo-node locus-welcome__geo-node--three"></span>
    </div>
    <div class="locus-welcome__geo-readout">
      <span data-locus-lat>16.6159&deg; N</span>
      <i></i>
      <span data-locus-lng>120.3166&deg; E</span>
    </div>
  </div>

  <div class="locus-welcome__brand" aria-label="LOCUS-SF">
    <img
      src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/images/webLogoSfc.png"
      alt=""
      width="48"
      height="30"
    >
    <span>LOCUS-SF</span>
  </div>

  <div class="locus-welcome__content">
    <p class="locus-welcome__location">SAN FERNANDO CITY, LA UNION</p>
    <h1 id="locusWelcomeTitle">
      <span>Every opportunity</span>
      <span>starts with a place.</span>
    </h1>
    <p class="locus-welcome__description" id="locusWelcomeDescription">Explore local investment opportunities through property information and site comparison.</p>
    <div class="locus-welcome__actions">
      <a
        class="locus-welcome__continue"
        href="<?= htmlspecialchars($welcomeFallbackHref, ENT_QUOTES, 'UTF-8') ?>"
        data-locus-welcome-continue
      >
        <span>Continue to LOCUS-SF</span>
        <span aria-hidden="true">&rarr;</span>
      </a>
      <span class="locus-welcome__press-hint">Press <kbd>Space</kbd> or <kbd>&crarr;</kbd> to enter &bull; Explore beacons above</span>
    </div>
  </div>
</section>
<?php endif; ?>
<?php
sfc_render_header($context, 'landing');
?>
<main class="page-shell landing-shell landing-editorial-shell landing-calm-shell" id="main-content" tabindex="-1">
  <section class="hero-home hero-home-editorial hero-home-refined" data-hero-stage aria-labelledby="heroHeadline" style="--hero-image:url('<?= htmlspecialchars($heroImage, ENT_QUOTES, 'UTF-8') ?>')">
    <div class="hero-canvas" id="hero-canvas" aria-hidden="true">
      <div class="hero-home-backdrop"></div>
      <div class="hero-atmosphere-light"></div>
      <div class="hero-grid-mesh"></div>

      <!-- Interactive Spatial Beacons anchored to San Fernando landmarks -->
      <div class="hero-spatial-beacons" aria-hidden="true">
        <button type="button" class="hero-geo-pin hero-geo-pin--poro" data-city-node="poro-point" title="Poro Point Freeport & Logistics Spine" tabindex="-1">
          <span class="geo-pin-ring"></span>
          <span class="geo-pin-dot"></span>
          <span class="geo-pin-label">01 · Poro Point Freeport</span>
        </button>
        <button type="button" class="hero-geo-pin hero-geo-pin--center" data-city-node="city-center" title="City Center & Commercial Belt" tabindex="-1">
          <span class="geo-pin-ring"></span>
          <span class="geo-pin-dot"></span>
          <span class="geo-pin-label">02 · City Center Core</span>
        </button>
        <button type="button" class="hero-geo-pin hero-geo-pin--civic" data-city-node="civic-belt" title="Civic Belt & Bypass Expansion" tabindex="-1">
          <span class="geo-pin-ring"></span>
          <span class="geo-pin-dot"></span>
          <span class="geo-pin-label">03 · Civic Belt Corridor</span>
        </button>
      </div>

      <!-- Geospatial Planning Telemetry Header -->
      <div class="hero-telemetry-overlay" aria-hidden="true">
        <span class="telemetry-coord">16°37′03″N · 120°19′11″E</span>
        <span class="telemetry-clup">CLUP COMPREHENSIVE ZONING 2025–2035</span>
        <span class="telemetry-datum">SURVEY ELEVATION +14M TO +82M</span>
      </div>

      <div class="mouse-glow"></div>
    </div>

    <div class="site-shell hero-home-grid hero-home-grid-refined">
      <div class="hero-home-copy hero-home-copy-refined">
        <div class="hero-prelude">
          <div class="hero-prelude-copy">
            <span class="hero-authority-seal">
              <span class="hero-live-beacon-dot"></span>
              <span class="eyebrow">City Investment Gateway</span>
            </span>
            <span class="hero-location-seal">San Fernando, La Union</span>
            <button type="button" class="hero-replay-btn" data-replay-hero title="Replay Entrance Animation">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>Replay Entrance</span>
            </button>
          </div>
        </div>

        <h1 class="hero-headline" id="heroHeadline">
          <span class="hero-headline-line hero-headline-line--1"><span class="hero-headline-word">Find your next</span></span>
          <span class="hero-headline-line hero-headline-line--2"><span class="hero-headline-word">investment in</span></span>
          <span class="hero-headline-line hero-headline-line--3"><span class="hero-headline-word hero-headline-place">San Fernando.</span></span>
        </h1>
        <p class="hero-subhead" id="heroFocusSummary">Corridor fit, verified readiness, and local demand now sit inside one calmer first read of the city.</p>

        <div class="hero-focus-block">
          <div class="hero-focus-header">
            <span class="hero-focus-label">Development Sector</span>
            <span class="hero-node-badge" id="heroNodeBadge">Focus: Poro Point</span>
          </div>
          <div class="hero-focus-row" role="group" aria-label="Investment sector selector">
            <button type="button" class="hero-focus-chip is-active" data-hero-focus="logistics" aria-pressed="true">
              <span class="chip-num">01</span>
              <span class="chip-text">Logistics &amp; Port</span>
            </button>
            <button type="button" class="hero-focus-chip" data-hero-focus="commercial_center" aria-pressed="false">
              <span class="chip-num">02</span>
              <span class="chip-text">Commercial &amp; Retail</span>
            </button>
            <button type="button" class="hero-focus-chip" data-hero-focus="hospital" aria-pressed="false">
              <span class="chip-num">03</span>
              <span class="chip-text">Healthcare &amp; Civic</span>
            </button>
            <button type="button" class="hero-focus-chip" data-hero-focus="university" aria-pressed="false">
              <span class="chip-num">04</span>
              <span class="chip-text">Education &amp; Campus</span>
            </button>
          </div>
          <span class="hero-selection-status" id="heroSelectionStatus" role="status" aria-live="polite" aria-atomic="true"></span>
        </div>

        <div class="hero-actions hero-command-actions hero-home-actions">
          <a href="<?= htmlspecialchars(sfc_path('/property-ranking.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-hero is-primary">
            <span class="btn-shell-icon"><?= sfc_icon('ranking') ?></span>
            <span>View Top Opportunities</span>
            <svg class="btn-arrow-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </a>
          <a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-hero is-secondary">
            <span class="btn-shell-icon"><?= sfc_icon('explorer') ?></span>
            <span>Explore Spatial Map</span>
          </a>
          <a href="<?= htmlspecialchars(sfc_path('/locus-cinematic.html?preview=open'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-hero is-preview" id="openPlatformPreviewHomeBtn" title="Launch Interactive Platform Preview">
            <span class="btn-shell-icon"><?= sfc_icon('simulator') ?></span>
            <span>Platform Dossier</span>
          </a>
        </div>

        <div class="market-ticker-shell hero-sentiment-rail" tabindex="0" aria-label="City corridor insights. Focus here to pause scrolling.">
          <div class="hero-sentiment-top">
            <span class="radar-live-indicator"><span class="radar-dot"></span> LIVE RADAR</span>
            <span class="hero-sentiment-label">Corridor Feed: <strong id="heroTickerMeta">Logistics lens</strong></span>
          </div>
          <div class="market-ticker-track hero-sentiment-track" id="heroSentimentTicker">
            <span class="market-ticker-item">Loading verified corridor signals...</span>
          </div>
        </div>
      </div>

      <aside class="hero-feature-shell hero-feature-shell-refined">
        <article class="hero-home-panel hero-dossier-panel">
          <div class="hero-home-panel-head">
            <div class="hero-home-panel-copy">
              <div class="panel-kicker">
                <span class="kicker-pulse-dot"></span>
                <span>Active Investment Memo</span>
              </div>
              <h2 class="hero-dossier-headline">Lead Opportunity Brief</h2>
            </div>
            <div class="hero-brief-context">
              <span class="context-kicker">Corridor Focus</span>
              <strong id="heroFeaturedMeta" class="context-value">Poro Point horizon</strong>
            </div>
          </div>

          <div class="hero-featured-opportunity" id="heroFeaturedOpportunity">
            <div class="hero-opportunity-loading">Synchronizing verified parcel dossier...</div>
          </div>

          <details class="hero-more-details" id="heroDetailsDrawer">
            <summary class="hero-details-summary">
              <span>View Corridor Proof &amp; Spatial Nodes</span>
              <svg class="summary-caret" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </summary>
            <div class="hero-home-panel-body">
              <section class="hero-score-block">
                <div class="hero-score-copy">
                  <span id="heroMetricMeta">Logistics / Poro Point</span>
                  <div class="hero-score-num-wrap">
                    <strong class="hero-slab-score" id="heroIaiScore">87.0</strong>
                    <span class="hero-score-denom">/ 100 IAI</span>
                  </div>
                  <p id="heroMetricSummary">Fabro Building Prime Lot leads the corridor in readiness and access.</p>
                </div>
                <div class="hero-score-chips">
                  <span class="hero-slab-chip" id="heroFocusBadge">Logistics lens</span>
                  <span class="hero-slab-chip hero-slab-chip-quiet"><strong id="heroOpportunityCount">3</strong> Candidate Parcels</span>
                </div>
              </section>

              <div class="hero-proof-grid hero-proof-grid-refined" id="heroProofGrid">
                <article class="hero-proof-card">
                  <span>Candidate Sites</span>
                  <strong>Loading</strong>
                </article>
                <article class="hero-proof-card">
                  <span>Verified</span>
                  <strong>Loading</strong>
                </article>
                <article class="hero-proof-card">
                  <span>Audits</span>
                  <strong>Loading</strong>
                </article>
                <article class="hero-proof-card">
                  <span>Ready</span>
                  <strong>Loading</strong>
                </article>
              </div>

              <article class="hero-story-panel hero-story-panel-refined">
                <div class="panel-kicker">Corridor Analysis</div>
                <p id="heroStoryCopy">Strategic location along the main transport spine provides direct arterial access and immediate seaport connectivity.</p>
              </article>

              <div class="hero-spatial-dock hero-spatial-dock-refined">
                <div class="hero-node-panel-head">
                  <div class="hero-node-panel-copy">
                    <div class="hero-node-dock-head">Spatial Focus Nodes</div>
                    <strong id="heroNodeMeta">Poro Point horizon</strong>
                    <p id="heroOpportunitySummary">3 active listings currently orbit Poro Point on the city grid.</p>
                  </div>
                </div>
                <div class="living-city-node-list" aria-label="Spatial trigger nodes">
                  <button type="button" class="living-city-node-pill" data-city-node="poro-point">Poro Point</button>
                  <button type="button" class="living-city-node-pill" data-city-node="city-center">City Center</button>
                  <button type="button" class="living-city-node-pill" data-city-node="civic-belt">Civic Belt</button>
                </div>
              </div>
            </div>
          </details>
        </article>
      </aside>
    </div>
  </section>

  <section class="site-shell section-block landing-overview-grid">
    <article class="landing-panel landing-ranking-panel landing-panel-priority">
        <div class="landing-panel-head">
          <div class="section-heading section-heading-inline">
            <div class="eyebrow">Top Ranked Opportunities</div>
            <h2>Opportunities backed by local evidence.</h2>
          <p>These areas rise first only when investment attractiveness, corridor fit, readiness, and CLUP suitability align.</p>
          </div>
        <a href="<?= htmlspecialchars(sfc_path('/property-ranking.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">View Investment Board</a>
      </div>
      <div id="homeRankingPreview" class="landing-ranking-preview">
        <div class="loading-panel">Loading property rankings...</div>
      </div>
    </article>

    <div class="landing-side-stack">
      <article class="landing-panel landing-demand-panel landing-panel-secondary">
        <div class="landing-panel-head">
          <div class="section-heading section-heading-inline">
            <div class="eyebrow">Voting Signals</div>
          <h2>See what the city needs next.</h2>
          <p>Investor and resident signals reveal which services or establishments are beginning to pull hardest in each area.</p>
          </div>
          <a href="<?= htmlspecialchars(sfc_path('/voting-dashboard.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">View Demand Signals</a>
        </div>
        <div id="homeVotingPreview" class="landing-demand-preview">
          <div class="loading-panel">Loading demand insights...</div>
        </div>
      </article>

      <article class="landing-panel landing-role-panel landing-panel-contrast">
        <div class="eyebrow">Platform Paths</div>
        <h2>Each role enters through a workspace built for its exact decisions.</h2>
        <p>Planning officers govern site evidence and policy priorities, while investors explore and compare compliant opportunities.</p>
        <div class="landing-role-links">
          <a href="<?= htmlspecialchars(sfc_path('/admin-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="landing-role-link role-admin-link">
            <span>Admin</span>
            <strong>Validate candidate sites, CLUP outcomes, scenarios, and reports.</strong>
          </a>
          <a href="<?= htmlspecialchars(sfc_path('/investor-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="landing-role-link role-investor-link">
            <span>Investor / Resident</span>
            <strong>Explore the city and compare CLUP-screened investment areas.</strong>
          </a>
        </div>
      </article>
    </div>
  </section>

  <section class="site-shell section-block landing-curation-grid">
    <article class="landing-panel landing-curation-panel landing-panel-collection">
      <div class="landing-panel-head">
        <div class="section-heading section-heading-inline">
          <div class="eyebrow">CLUP Compliance Engine</div>
          <h2>Attractiveness never overrides land-use compatibility.</h2>
          <p>Test a candidate site and proposed investment type to receive a PASS, CONDITIONAL, or FAIL result with a suitability score and LGU action.</p>
        </div>
        <a href="<?= htmlspecialchars(sfc_path('/simulator.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">Run a Scenario</a>
      </div>
      <div class="landing-showcase-preview clup-fact-grid">
        <div><span>Compliance Gate</span><strong>PASS · CONDITIONAL · FAIL</strong></div>
        <div><span>Decision Output</span><strong>Suitability, explanation, and LGU action</strong></div>
      </div>
    </article>

    <article class="landing-panel landing-curation-panel landing-panel-collection is-pipeline">
      <div class="landing-panel-head">
        <div class="section-heading section-heading-inline">
          <div class="eyebrow">City Pipeline</div>
          <h2>Planned and upcoming city developments, edited into one future-facing board.</h2>
          <p>Track what is coming next, from approved commercial additions to larger city-facing development momentum.</p>
        </div>
        <a href="<?= htmlspecialchars(sfc_path('/city-pipeline.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">View City Pipeline</a>
      </div>
      <div id="homePipelinePreview" class="landing-showcase-preview">
        <div class="loading-panel">Loading city pipeline...</div>
      </div>
    </article>
  </section>

  <section class="site-shell section-block landing-city-editorial">
    <div class="landing-city-copy">
      <div class="section-heading section-heading-inline">
        <div class="eyebrow">Why San Fernando</div>
        <h2>A city where corridor logic, civic gravity, and coastal scale stay surprisingly legible.</h2>
        <p>San Fernando works because transport, commerce, social services, and future growth all remain visible in one frame. That makes the city easier to read and easier to curate convincingly.</p>
      </div>
      <div class="landing-city-pillars">
        <article class="landing-pillar-card">
          <span>Corridor Strength</span>
          <strong>Port, highway, and frontage alignment create stronger logistics logic than isolated land plays.</strong>
        </article>
        <article class="landing-pillar-card">
          <span>Demand Anchors</span>
          <strong>Schools, hospitals, and civic movement reveal what each district can realistically support next.</strong>
        </article>
        <article class="landing-pillar-card">
          <span>Urban Services</span>
          <strong>City-center activity gives mixed-use, retail, and service opportunities a clearer real-world floor.</strong>
        </article>
        <article class="landing-pillar-card">
          <span>Expansion Runway</span>
          <strong>Emerging frontage and larger land scale open room for slower, longer-horizon development bets.</strong>
        </article>
      </div>
    </div>

    <div class="landing-city-notes">
      <article class="landing-notebook-card">
        <div class="panel-kicker">Spatial Logic</div>
        <h3>Three city fronts. One investment frame.</h3>
        <p>Use the thesis stage to move between logistics at Poro Point, commercial pull in the city center, and civic expansion around the belt.</p>
        <div class="map-cluster landing-map-cluster">
          <span>Poro Point logistics spine</span>
          <span>City center commerce ring</span>
          <span>Civic belt expansion zone</span>
        </div>
      </article>

      <article class="landing-notebook-card is-soft">
        <div class="panel-kicker">Five-Minute Read</div>
        <h3>How to read a site quickly and cleanly.</h3>
        <div class="landing-note-list">
          <div>
            <span>01</span>
            <strong>Start with corridor fit before you judge the lot itself.</strong>
          </div>
          <div>
            <span>02</span>
            <strong>Compare access and frontage against the guide price, not just land area.</strong>
          </div>
          <div>
            <span>03</span>
            <strong>Use CLUP compliance and due diligence as mandatory final gates.</strong>
          </div>
        </div>
      </article>
    </div>
  </section>

  <section class="site-shell final-cta-card landing-final-cta">
    <div class="landing-final-cta-copy">
      <div class="eyebrow">Role Entry</div>
      <h2>Enter through the workflow that matches the kind of decision you need to make.</h2>
      <p>Choose the workspace that matches your role, with the same clear visual language carried into every next step.</p>
    </div>
    <div class="cta-card-actions">
      <a href="<?= htmlspecialchars(sfc_path('/admin-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-ghost">Admin</a>
      <a href="<?= htmlspecialchars(sfc_path('/simulator.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">Scenario Simulator</a>
      <a href="<?= htmlspecialchars(sfc_path('/investor-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-primary">Investor / Resident</a>
    </div>
  </section>
</main>
<?php sfc_render_footer($context); ?>

