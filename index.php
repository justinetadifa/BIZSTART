<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
$heroImage = $context['assetBase'] . '/images/sfcpanoramicView.png';
sfc_render_head('SFCelerate BizStart', $context, ['page' => 'landing', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'landing');
?>
<main class="page-shell landing-shell landing-editorial-shell">
  <section class="hero-home hero-home-editorial" data-hero-stage tabindex="0" style="--hero-image:url('<?= htmlspecialchars($heroImage, ENT_QUOTES, 'UTF-8') ?>')">
    <div class="hero-canvas" id="hero-canvas" aria-hidden="true">
      <div class="hero-home-backdrop"></div>
      <div class="mouse-glow"></div>
      <div class="city-node-layer" aria-label="Spatial trigger nodes">
        <button type="button" class="spatial-trigger-node" data-city-node="poro-point" data-node-surface="map" style="--node-x:82.2%;--node-y:29.7%;">
          <span class="spatial-trigger-orb"></span>
          <span class="spatial-trigger-copy">
            <strong>Poro Point</strong>
            <span>Port + logistics corridor</span>
          </span>
        </button>
        <button type="button" class="spatial-trigger-node" data-city-node="city-center" data-node-surface="map" style="--node-x:62%;--node-y:42.8%;">
          <span class="spatial-trigger-orb"></span>
          <span class="spatial-trigger-copy">
            <strong>City Center</strong>
            <span>Retail + civic gravity</span>
          </span>
        </button>
        <button type="button" class="spatial-trigger-node" data-city-node="civic-belt" data-node-surface="map" style="--node-x:48%;--node-y:55.3%;">
          <span class="spatial-trigger-orb"></span>
          <span class="spatial-trigger-copy">
            <strong>Civic Belt</strong>
            <span>Campus + health support</span>
          </span>
        </button>
      </div>
      <svg class="hero-coordinate-layer" viewBox="0 0 1000 720" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="heroGridFade" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        <g class="hero-heat-mesh" id="heroHeatMesh" aria-hidden="true"></g>
        <g class="hero-grid-lines">
          <path d="M120 90H880" />
          <path d="M90 180H910" />
          <path d="M78 300H922" />
          <path d="M90 430H910" />
          <path d="M120 560H880" />
          <path d="M180 60V650" />
          <path d="M360 40V680" />
          <path d="M540 35V685" />
          <path d="M720 40V680" />
          <path d="M880 70V650" />
        </g>
        <path class="hero-spine hero-spine-primary" d="M140 470C260 420 360 450 470 390C590 324 710 345 860 236" />
        <path class="hero-spine hero-spine-secondary" d="M160 250C280 180 370 210 470 198C610 180 690 214 840 176" />
        <path class="hero-spine hero-spine-tertiary" d="M188 590C324 554 432 602 548 552C660 504 754 532 860 498" />

        <g class="pulse-cluster" data-spatial-node="poro-point" data-focus-groups="logistics">
          <circle class="pulse-ring" cx="822" cy="214" r="28" style="animation-delay:0s"></circle>
          <circle class="pulse-ring" cx="822" cy="214" r="44" style="animation-delay:0.65s"></circle>
          <circle class="pulse-ring" cx="822" cy="214" r="62" style="animation-delay:1.3s"></circle>
          <circle class="pulse-node-core" cx="822" cy="214" r="7"></circle>
        </g>

        <g class="pulse-cluster" data-spatial-node="city-center" data-focus-groups="university retail hospital">
          <circle class="pulse-ring" cx="620" cy="308" r="26" style="animation-delay:0.25s"></circle>
          <circle class="pulse-ring" cx="620" cy="308" r="42" style="animation-delay:0.9s"></circle>
          <circle class="pulse-ring" cx="620" cy="308" r="58" style="animation-delay:1.55s"></circle>
          <circle class="pulse-node-core" cx="620" cy="308" r="7"></circle>
        </g>

        <g class="pulse-cluster" data-spatial-node="civic-belt" data-focus-groups="hospital university">
          <circle class="pulse-ring" cx="480" cy="398" r="24" style="animation-delay:0.45s"></circle>
          <circle class="pulse-ring" cx="480" cy="398" r="38" style="animation-delay:1.1s"></circle>
          <circle class="pulse-ring" cx="480" cy="398" r="54" style="animation-delay:1.75s"></circle>
          <circle class="pulse-node-core" cx="480" cy="398" r="7"></circle>
        </g>
      </svg>
    </div>
    <div class="hero-depth-label hero-depth-label-city-center" data-depth-label="city-center" aria-hidden="true">City Center</div>
    <div class="hero-depth-label hero-depth-label-civic-belt" data-depth-label="civic-belt" aria-hidden="true">Civic Belt</div>
    <div class="site-shell hero-home-grid">
      <div class="hero-home-copy">
        <div class="hero-prelude">
          <div class="hero-prelude-copy">
            <div class="eyebrow">City Investment Brief</div>
            <span class="hero-location-seal">San Fernando, La Union</span>
          </div>
          <span class="hero-node-badge" id="heroNodeBadge">Looking toward Poro Point</span>
        </div>
        <h1>Where City Maps Become Investment Roadmaps.</h1>
        <p id="heroFocusSummary">Infrastructure access, zoning alignment, and property scale dictate the true value of a location. Right now, all data points to Poro Point as the anchor of San Fernando's economic heat map.</p>

        <div class="market-ticker-shell hero-sentiment-rail" aria-label="Live city read">
          <span class="hero-sentiment-label">Live city read</span>
          <div class="market-ticker-track hero-sentiment-track" id="heroSentimentTicker">
            <span class="market-ticker-item">Loading live city signals</span>
          </div>
        </div>

        <div class="hero-lens-dock">
          <div class="hero-lens-dock-head">
            <div>
              <span>Investment Lens</span>
              <strong>Select the investment thesis that should guide the live city ranking.</strong>
            </div>
            <div class="hero-lens-controls">
              <div class="hero-lens-dock-meta" id="heroTickerMeta">Logistics lens</div>
              <button type="button" class="hero-orbit-toggle" id="heroOrbitToggle" aria-pressed="false">Start Orbit</button>
            </div>
          </div>
          <div class="hero-focus-row">
            <button type="button" class="chip hero-focus-chip" data-hero-focus="university">University</button>
            <button type="button" class="chip hero-focus-chip" data-hero-focus="logistics">Logistics</button>
            <button type="button" class="chip hero-focus-chip" data-hero-focus="hospital">Hospital</button>
            <button type="button" class="chip hero-focus-chip" data-hero-focus="retail">Retail</button>
          </div>
          <p class="hero-orbit-status" id="heroOrbitStatus">Manual control engaged. Start orbit to sweep the thesis across the city.</p>
        </div>

        <div class="hero-actions">
          <a href="<?= htmlspecialchars(sfc_path('/property-ranking.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-hero">Open Investment View</a>
          <a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-hero">Explore the City</a>
        </div>

        <div class="hero-proof-grid" id="heroProofGrid">
          <article class="hero-proof-card">
            <span>Data Valid</span>
            <strong>Loading</strong>
          </article>
          <article class="hero-proof-card">
            <span>Verified Listings</span>
            <strong>Loading</strong>
          </article>
          <article class="hero-proof-card">
            <span>Field Audits</span>
            <strong>Loading</strong>
          </article>
          <article class="hero-proof-card">
            <span>Dossier Ready</span>
            <strong>Loading</strong>
          </article>
        </div>

        <article class="hero-story-panel">
          <div class="panel-kicker">Analyst Note</div>
          <p id="heroStoryCopy">Property 1 - Industrial Zone now sits closest to the horizon because logistics demand is surfacing around Poro Point, giving the corridor its clearest current read.</p>
        </article>
      </div>

      <aside class="hero-feature-shell">
        <div class="hero-atlas-stack" id="livingCityRail">
          <article class="hero-metric-slab">
            <div class="hero-slab-topline">
              <span>Current Thesis</span>
              <strong id="heroMetricMeta">Logistics / Poro Point</strong>
            </div>
            <div class="hero-thesis-score-wrap">
              <strong class="hero-slab-score" id="heroIaiScore">87.0</strong>
              <p id="heroMetricSummary">Property 1 - Industrial Zone is the clearest opportunity currently visible at Poro Point.</p>
            </div>
            <div class="hero-slab-footer">
              <span class="hero-slab-chip" id="heroFocusBadge">Logistics lens</span>
              <span class="hero-slab-chip hero-slab-chip-quiet"><strong id="heroOpportunityCount">3</strong> live listings</span>
            </div>
          </article>

          <article class="hero-opportunity-brief-shell">
            <div class="hero-opportunity-brief-head">
              <span>Featured Opportunity</span>
              <strong id="heroFeaturedMeta">Poro Point horizon</strong>
            </div>
            <div class="hero-featured-opportunity" id="heroFeaturedOpportunity">
              <div class="hero-opportunity-loading">Synchronizing live property brief...</div>
            </div>
          </article>

          <div class="hero-node-dock">
            <div class="hero-node-panel-head">
              <div>
                <div class="hero-node-dock-head">Spatial Triggers</div>
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
      </aside>
    </div>
  </section>

  <section class="site-shell section-block landing-overview-grid">
    <article class="landing-panel landing-ranking-panel">
      <div class="landing-panel-head">
        <div class="section-heading section-heading-inline">
          <div class="eyebrow">Top Ranked Opportunities</div>
          <h2>Read the strongest investment opportunities in one editorial view.</h2>
          <p>These properties rise first because score, corridor fit, readiness, and local demand are aligning more clearly than the rest of the field.</p>
        </div>
        <a href="<?= htmlspecialchars(sfc_path('/property-ranking.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">Open Full Ranking</a>
      </div>
      <div id="homeRankingPreview" class="landing-ranking-preview">
        <div class="loading-panel">Loading property rankings...</div>
      </div>
    </article>

    <div class="landing-side-stack">
      <article class="landing-panel landing-demand-panel">
        <div class="landing-panel-head">
          <div class="section-heading section-heading-inline">
            <div class="eyebrow">Voting Signals</div>
            <h2>What the city appears to need next.</h2>
            <p>Investor and resident signals help reveal which services or establishments are beginning to pull hardest in each area.</p>
          </div>
          <a href="<?= htmlspecialchars(sfc_path('/voting-dashboard.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">Open Voting</a>
        </div>
        <div id="homeVotingPreview" class="landing-demand-preview">
          <div class="loading-panel">Loading demand insights...</div>
        </div>
      </article>

      <article class="landing-panel landing-role-panel">
        <div class="eyebrow">Platform Paths</div>
        <h2>Choose the workspace that matches your role.</h2>
        <p>Admins curate the market, sellers manage owned listings, and investors read the city through ranking, comparison, and demand signals.</p>
        <div class="landing-role-links">
          <a href="<?= htmlspecialchars(sfc_path('/admin-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="landing-role-link role-admin-link">
            <span>Admin</span>
            <strong>Manage listings, showcase uploads, and platform intelligence.</strong>
          </a>
          <a href="<?= htmlspecialchars(sfc_path('/seller-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="landing-role-link role-seller-link">
            <span>Seller</span>
            <strong>Publish owned land, monitor readiness, and respond to interest.</strong>
          </a>
          <a href="<?= htmlspecialchars(sfc_path('/investor-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="landing-role-link role-investor-link">
            <span>Investor / Resident</span>
            <strong>Explore the city, compare opportunities, and surface demand.</strong>
          </a>
        </div>
      </article>
    </div>
  </section>

  <section class="site-shell section-block landing-curation-grid">
    <article class="landing-panel landing-curation-panel">
      <div class="landing-panel-head">
        <div class="section-heading section-heading-inline">
          <div class="eyebrow">Offer Board</div>
          <h2>Curated timed opportunities, presented like a premium collection.</h2>
          <p>Admin-managed releases can carry offer windows, spotlight imagery, and a much cleaner story than a plain list can tell.</p>
        </div>
        <a href="<?= htmlspecialchars(sfc_path('/offer-board.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">Open Offer Board</a>
      </div>
      <div id="homeOfferPreview" class="landing-showcase-preview">
        <div class="loading-panel">Loading curated offers...</div>
      </div>
    </article>

    <article class="landing-panel landing-curation-panel is-pipeline">
      <div class="landing-panel-head">
        <div class="section-heading section-heading-inline">
          <div class="eyebrow">City Pipeline</div>
          <h2>Planned, approved, and not-yet-built city developments in one future-facing board.</h2>
          <p>This is where the platform can surface what is coming next, from pipeline establishments to larger city-facing development signals.</p>
        </div>
        <a href="<?= htmlspecialchars(sfc_path('/city-pipeline.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">Open City Pipeline</a>
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
        <h2>A compact city where corridor logic, civic gravity, and coastal scale stay legible.</h2>
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
            <strong>Use demand signals and due diligence as your final filters.</strong>
          </div>
        </div>
      </article>
    </div>
  </section>

  <section class="site-shell final-cta-card landing-final-cta">
    <div>
      <div class="eyebrow">Role Entry</div>
      <h2>Enter the platform through the workflow that actually fits your role.</h2>
      <p>This homepage now leads into sharper admin, seller, and investor journeys. The same premium language should carry all the way through the product.</p>
    </div>
    <div class="cta-card-actions">
      <a href="<?= htmlspecialchars(sfc_path('/admin-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-ghost">Admin</a>
      <a href="<?= htmlspecialchars(sfc_path('/seller-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">Seller</a>
      <a href="<?= htmlspecialchars(sfc_path('/investor-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-primary">Investor / Resident</a>
    </div>
  </section>
</main>
<?php sfc_render_footer($context); ?>

