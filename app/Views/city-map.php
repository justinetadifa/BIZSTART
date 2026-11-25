<?php
// The complete map interface is rendered by the homepage from this template.
// Its data, renderer and styling are stored locally in assets/city-map.
$mapAsset = static fn (string $file): string => $e($context['assetBase'] . '/city-map/' . $file . sfc_asset_version('city-map/' . $file));
ob_start();
?>
<!doctype html>
<html lang="en" data-embedded data-listings-url="<?= $e($context['apiBase']) ?>/city-map-listings.php">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>LOCUS-SF Investor Map · San Fernando City, La Union</title>
  <script src="<?= $mapAsset('embed.js') ?>"></script>
  <link rel="stylesheet" href="<?= $mapAsset('lib/maplibre-gl.css') ?>">
  <link rel="stylesheet" href="<?= $mapAsset('style.css') ?>">
  <link rel="stylesheet" href="<?= $mapAsset('navigation.css') ?>">
  <link rel="stylesheet" href="<?= $mapAsset('properties.css') ?>">
  <link rel="stylesheet" href="<?= $mapAsset('city-explorer.css') ?>">
  <script defer src="<?= $mapAsset('lib/maplibre-gl.js') ?>"></script>
  <script defer src="<?= $mapAsset('city.js') ?>"></script>
  <script defer src="<?= $mapAsset('barangays.js') ?>"></script>
  <script defer src="<?= $mapAsset('map-data.js') ?>"></script>
  <script defer src="<?= $mapAsset('brands.js') ?>"></script>
  <script defer src="<?= $mapAsset('landmarks.js') ?>"></script>
  <script defer src="<?= $mapAsset('living-city.js') ?>"></script>
  <script defer src="<?= $mapAsset('city-buildings.js') ?>"></script>
  <script defer src="<?= $mapAsset('integration.js') ?>"></script>
  <script defer src="<?= $mapAsset('market-scout.js') ?>"></script>
  <script defer src="<?= $mapAsset('investor-sites.js') ?>"></script>
  <script defer src="<?= $mapAsset('app.js') ?>"></script>
  <script defer src="<?= $mapAsset('city-explorer.js') ?>"></script>
</head>

<body class="panel-hidden">
  <header>
    <div class="brand">
      <svg class="brand-mark" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="m3 12 15-8 15 8-15 8z" fill="#5fd4ef" />
        <path d="m3 18 15 8 15-8M3 24l15 8 15-8" stroke="#f2f6fb" stroke-width="2.4" stroke-linejoin="round" />
      </svg>
      <div class="brand-text">
        <strong>LOCUS<span class="brand-suffix"> SF</span></strong>
        <span class="brand-section">San Fernando City, La Union</span>
      </div>
    </div>

    <div class="workspace-tabs header-segmented" role="tablist" aria-label="Primary map mode">
      <button type="button" id="ws-explore" class="ws-tab active" role="tab" aria-selected="true">Explore</button>
      <button type="button" id="ws-scout" class="ws-tab" role="tab" aria-selected="false">Market Scout <em
          id="scout-step-badge"></em></button>
    </div>

    <div class="header-meta" aria-label="Directory counts and map controls">
      <span class="pill pill-community" id="hdr-community">Community map snapshot</span>
      <span class="pill pill-official" id="hdr-official">Official directory</span>
      <button type="button" id="hdr-search-btn" class="hdr-action-btn" title="Search establishment directory (/)"
        aria-label="Search establishment directory">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="m15 15 5 5" />
        </svg>
        <span>Search</span>
      </button>
      <div class="theme-switch" role="group" aria-label="Map lighting: Day or Night">
        <button type="button" id="theme-day" class="theme-btn active" aria-pressed="true"
          title="Sunlit Day map lighting">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" />
            <path
              d="M12 2.5v2.2m0 14.6v2.2M4.9 4.9l1.6 1.6m11 11 1.6 1.6M2.5 12h2.2m14.6 0h2.2M4.9 19.1l1.6-1.6m11-11 1.6-1.6" />
          </svg>
          <span>Day</span>
        </button>
        <button type="button" id="theme-night" class="theme-btn" aria-pressed="false" title="Night map lighting">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.2 14.5A8.5 8.5 0 0 1 9.5 3.8a8.5 8.5 0 1 0 10.7 10.7Z" />
          </svg>
          <span>Night</span>
        </button>
      </div>
      <button type="button" id="fullscreen-btn" class="hdr-action-btn hdr-fs-btn" aria-pressed="false"
        title="View map in full screen (F)" aria-label="Enter full-screen map view">
        <svg class="fs-enter-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
        <svg class="fs-exit-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        </svg>
        <span id="fullscreen-label">Full screen</span>
      </button>
    </div>
  </header>

  <main>
    <section id="map" aria-label="Interactive three-dimensional city map">
      <div class="map-top-left">
        <div class="tools" role="toolbar" aria-label="Map navigation controls">
          <div class="jump-wrap">
            <button id="jump-btn" type="button" class="dock-btn location-button" aria-expanded="false"
              aria-controls="jump-menu" aria-label="Jump to landmark or barangay" title="Jump to any verified landmark or barangay (J)">
              <svg viewBox="0 0 24 24" class="location-icon" aria-hidden="true">
                <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <svg viewBox="0 0 24 24" class="map-mobile-search-icon" aria-hidden="true"><circle cx="10.6" cy="10.6" r="5.6"/><path d="m15 15 4.5 4.5"/></svg>
              <span><strong>Jump to landmark</strong><small>Landmarks &amp; 59 barangays</small></span><i
                class="chevron-down" aria-hidden="true"></i>
              <span class="map-mobile-search-label" aria-hidden="true">Search</span>
            </button>
            <div id="jump-menu" class="jump-menu" hidden role="dialog"
              aria-label="Jump to verified landmark or barangay">
              <input type="search" id="jump-query" placeholder="Search landmarks or 59 barangays…" autocomplete="off">
              <div id="jump-list" class="jump-list"></div>
            </div>
          </div>
          <div class="camera-tools" role="group" aria-label="Camera shortcuts">
            <button id="downtown" type="button" class="dock-btn"
              title="Focus Downtown San Fernando (D)">Downtown</button>
            <button id="city" type="button" class="dock-btn" title="Fit full San Fernando city boundary (C)">City
              overview</button>
            <button id="tilt" type="button" class="dock-btn active" aria-pressed="true"
              title="Switch between 3D and Top view (3)">Top view</button>
          </div>
        </div>

        <div class="live-properties-dock">
          <button type="button" id="live-properties-toggle" class="live-properties-toggle" aria-expanded="false" aria-controls="live-properties-panel">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 10.5-7 10.5S5 15 5 10a7 7 0 1 1 14 0Z"/><path d="m9 10 3-2.5 3 2.5v3.5H9Z"/></svg>
            <span class="live-properties-label">Available properties</span>
            <span class="live-properties-label-short" aria-hidden="true">Properties</span>
            <span class="live-properties-count" data-live-property-count hidden></span>
          </button>
          <button type="button" id="map-scout-toggle" class="map-scout-toggle" aria-pressed="false" aria-controls="side-panel" aria-label="Market Scout">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/></svg>
            <span>Scout</span>
          </button>
          <section id="live-properties-panel" class="live-properties-panel" aria-labelledby="live-properties-title" hidden>
            <div class="live-properties-heading">
              <div>
                <h2 id="live-properties-title">Available properties</h2>
                <p id="live-properties-status" role="status">Loading listings…</p>
              </div>
              <button type="button" id="live-properties-close" class="live-properties-close" aria-label="Close available properties">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>
              </button>
            </div>
            <button type="button" id="live-properties-fit" class="live-properties-fit" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H4v5m11-5h5v5m0 6v5h-5m-6 0H4v-5"/><circle cx="12" cy="12" r="2.5"/></svg>
              <span>Show all on map</span>
            </button>
            <div id="live-properties-list" class="live-properties-list"></div>
          </section>
        </div>

        <button id="map-more-toggle" class="map-more-toggle" type="button" aria-label="Map options" aria-expanded="false" aria-controls="map-more-panel">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>
        </button>
        <div id="map-more-panel" class="map-more-panel" role="group" aria-label="Map options" hidden></div>
        <div id="map-mobile-dismiss" class="map-mobile-dismiss"></div>

        <div id="hover-hud" class="hover-hud" hidden aria-live="off">
          <span class="hud-dot" aria-hidden="true"></span>
          <strong id="hover-hud-name"></strong>
          <span id="hover-hud-meta"></span>
        </div>

        <div id="link-banner" class="link-banner" hidden role="status" aria-live="polite">
          <span id="link-banner-text">Click the map to place site or link pin.</span>
          <button type="button" id="cancel-link" class="btn-banner">Cancel</button>
        </div>
      </div>

      <div id="map-floating-bar" class="map-floating-bar" role="group" aria-label="Map viewing controls">
        <button id="fs-show-panel-btn" type="button" class="dock-btn dock-icon-btn" title="Show directory panel (H)"
          aria-controls="side-panel" aria-expanded="false">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2.5" />
            <path d="M15 4v16" />
          </svg>
          <span>Directory</span>
        </button>
        <button id="fs-theme-btn" type="button" class="dock-btn dock-icon-btn fs-only-ctl"
          title="Cycle Day, Golden Hour, or Night lighting (L)" aria-label="Cycle map lighting">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" />
            <path
              d="M12 2.5v2.2m0 14.6v2.2M2.5 12h2.2m14.6 0h2.2M5.5 5.5l1.5 1.5m10 10 1.5 1.5M5.5 18.5 7 17m10-10 1.5-1.5" />
          </svg>
          <span id="fs-theme-label">Day</span>
        </button>
        <button id="orbit-tour" type="button" class="dock-btn dock-icon-btn fs-only-ctl" aria-pressed="false"
          title="Toggle smooth 360° cinematic showcase orbit (O)" aria-label="Toggle smooth showcase orbit">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M20.5 12c0 2.6-3.8 4.8-8.5 4.8S3.5 14.6 3.5 12 7.3 7.2 12 7.2" />
            <path d="m14.2 4.6-2.2 2.6 2.5 2.4" />
          </svg>
          <span>Orbit</span>
        </button>
        <button id="fs-exit-btn" type="button" class="dock-btn dock-icon-btn fs-exit-pill fs-only-ctl"
          title="Exit full-screen map view (F or Esc)" aria-label="Exit full-screen map view">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
          <svg class="map-mobile-close-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
          <span>Exit full screen</span>
        </button>
      </div>

      <div id="map-orbit-dock" class="map-orbit-dock" role="group" aria-label="Map rotation and full screen controls">
        <button id="orbit-cw" type="button" class="orbit-btn" title="Rotate 3D view 45° (E / Shift: reverse)"
          aria-label="Rotate view 45 degrees">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          <span class="map-mobile-rotate-label" aria-hidden="true">Rotate</span>
        </button>
        <button id="map-fs-btn" type="button" class="orbit-btn orbit-fs-btn" aria-pressed="false"
          title="Toggle full-screen map view (F)" aria-label="Toggle full-screen map view">
          <svg class="fs-enter-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          <svg class="fs-exit-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        </button>
      </div>

      <div class="map-legend collapsed" id="map-legend" aria-label="Map layers and legend">
        <div id="nearby-selection" class="nearby-selection" role="status" hidden></div>
        <div id="legend-body" class="legend-body" hidden>
          <div class="legend-section-title">Map symbols</div>
          <div class="legend-items site-keys">
            <span><i class="swatch sw-live-property"></i>LOCUS-SF listing</span>
            <span><i class="swatch sw-available"></i>Imported lot</span>
            <span><i class="swatch sw-property"></i>Selected lot</span>
            <span><i class="swatch sw-building"></i>Building</span>
            <span><i class="swatch sw-business"></i>Business</span>
          </div>
          <div class="legend-items" id="legend-arch">
            <span><i class="swatch sw-road"></i>Highway</span>
            <span><i class="swatch sw-park"></i>Parks</span>
            <span><i class="swatch sw-limit"></i>City boundary</span>
          </div>
          <div class="legend-items" id="legend-cov" hidden>
            <span><i class="swatch sw-cov-off"></i>Official bldg</span>
            <span><i class="swatch sw-cov-multi"></i>Multiple mapped places</span>
            <span><i class="swatch sw-cov-comm"></i>OSM matched</span>
            <span><i class="swatch sw-cov-none"></i>No linked place</span>
          </div>
          <div class="legend-section-title">Visible layers</div>
          <div class="legend-toggles">
            <label><input type="checkbox" id="toggle-official" checked> Official</label>
            <label><input type="checkbox" id="toggle-community" checked> Community</label>
            <label><input type="checkbox" id="toggle-landmarks" checked> 3D landmarks</label>
            <label><input type="checkbox" id="toggle-barangays"> Barangays</label>
            <label class="legend-street-motion"><input type="checkbox" id="toggle-street-motion" checked> Animate traffic and pedestrians</label>
          </div>
          <div class="legend-display">
            <div class="mode-switch" role="group" aria-label="Building color mode">
              <button type="button" id="mode-arch" class="mode-btn active" aria-pressed="true">Architectural</button>
              <button type="button" id="mode-cov" class="mode-btn" aria-pressed="false">Coverage</button>
            </div>
            <button id="lighting-btn" type="button" class="dock-btn dock-light" aria-pressed="false"
              title="Cycle Daylight, Golden Hour, or Night mode (L)">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="4.2" />
                <path
                  d="M12 2.5v2.2m0 14.6v2.2M2.5 12h2.2m14.6 0h2.2M5.5 5.5l1.5 1.5m10 10 1.5 1.5M5.5 18.5 7 17m10-10 1.5-1.5" />
              </svg>
              <span id="lighting-btn-label">Daylight</span>
            </button>
          </div>
          <p class="height-note">Building heights are estimated unless a measurement is provided.</p>
        </div>
        <div class="legend-head">
          <button type="button" id="legend-toggle" class="legend-toggle-btn" aria-expanded="false"
            aria-controls="legend-body" title="Open map layers and legend">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m2.5 8 9.5-5 9.5 5-9.5 5zM2.5 12l9.5 5 9.5-5M2.5 16l9.5 5 9.5-5" />
            </svg>
            <span>Layers<span class="map-legend-label-detail"> &amp; legend</span></span>
            <i class="chevron-up" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div id="map-position" class="map-position" aria-label="Map center coordinates"></div>
    </section>

    <aside id="side-panel" class="floating-inspector" aria-label="Establishment directory and inspector">
      <div class="sheet-header">
        <span class="sheet-grab" aria-hidden="true"></span>
        <div class="sheet-bar">
          <button type="button" id="sheet-toggle" class="sheet-toggle" aria-expanded="false" aria-controls="panel-body">
            <span id="sheet-summary">Directory &amp; Market Scout</span>
            <span id="sheet-chevron" aria-hidden="true">▴</span>
          </button>
          <div class="sheet-actions">
            <button type="button" id="sheet-expand" class="sheet-ctrl-btn" aria-label="Expand full panel"
              aria-pressed="false" title="Expand full panel">⤢</button>
            <button type="button" id="sheet-close" class="sheet-ctrl-btn" aria-label="Collapse panel"
              title="Collapse panel" hidden>✕</button>
          </div>
        </div>
      </div>

      <div id="panel-body">
        <!-- =============================================================== -->
        <!-- EXPLORE DIRECTORY & DETAIL INSPECTOR (Single Unified Panel)     -->
        <!-- =============================================================== -->
        <div id="explore-panel">
          <div id="explore-inspection">
            <div id="inspection" class="inspection">
              <div class="inspection-bar">
                <button type="button" id="dismiss-detail" class="back-btn" aria-label="Back to directory">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  <span>Back to directory</span>
                </button>
                <span class="inspection-kicker" id="inspection-kicker">Details</span>
              </div>
              <section id="detail" aria-live="polite" aria-label="Map selection"></section>
            </div>
          </div>

          <div id="directory-view">
            <div class="inspector-head">
              <div>
                <h1>Directory</h1>
                <span class="inspector-sub">San Fernando</span>
              </div>
              <button type="button" id="toggle-panel-btn" class="panel-collapse-btn" aria-pressed="false"
                title="Hide directory panel to widen map view (H)" aria-label="Hide directory panel">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="16" rx="2.5" />
                  <path d="M15 4v16" />
                  <path d="m10 9 3 3-3 3" />
                </svg>
                <span>Hide</span>
              </button>
            </div>
            <div class="inspector-stats" role="group" aria-label="Live directory summary">
              <button type="button" id="stat-btn-mapped" class="stat-tile">
                <strong id="stat-mapped">0</strong>
                <span>Mapped</span>
              </button>
              <button type="button" id="stat-btn-avail" class="stat-tile stat-tile-avail">
                <strong id="stat-avail">0</strong>
                <span>Available lots</span>
              </button>
              <button type="button" id="stat-btn-official" class="stat-tile">
                <strong id="stat-official">0</strong>
                <span>Official</span>
              </button>
            </div>
            <div class="directory-search">
              <label for="query" class="visually-hidden">Search the city directory</label>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6" />
                <path d="m15 15 5 5" />
              </svg>
              <input type="search" id="query" placeholder="Search places, categories or IDs">
              <kbd class="search-kbd" id="search-kbd" aria-hidden="true">/</kbd>
              <button type="button" id="clear-query" class="search-clear" aria-label="Clear search" hidden>×</button>
            </div>

            <div class="source-tabs" role="tablist" aria-label="Directory source filter">
              <button type="button" class="tab active" data-source="all" role="tab" aria-selected="true">All <em
                  id="tab-all-n">0</em></button>
              <button type="button" class="tab" data-source="official" role="tab" aria-selected="false">Official <em
                  id="tab-off-n">0</em></button>
              <button type="button" class="tab" data-source="community" role="tab" aria-selected="false">Community <em
                  id="tab-comm-n">0</em></button>
              <button type="button" class="tab tab-review" data-source="review" role="tab" aria-selected="false">Review
                <em id="tab-rev-n">0</em></button>
            </div>

            <details class="directory-filters">
              <summary>Filters<span class="filter-current" id="filter-current"></span></summary>
              <div class="filter-row">
                <select id="barangay-filter" aria-label="Filter by official barangay">
                  <option value="">All 59 official barangays</option>
                </select>
              </div>
              <div class="cat-chips" role="group" aria-label="Filter by category">
                <button type="button" class="cat-chip active" data-cat="all">All types</button>
                <button type="button" class="cat-chip" data-cat="food">Food</button>
                <button type="button" class="cat-chip" data-cat="banks">Banks</button>
                <button type="button" class="cat-chip" data-cat="health">Health</button>
                <button type="button" class="cat-chip" data-cat="retail">Retail</button>
                <button type="button" class="cat-chip" data-cat="civic">Civic</button>
                <button type="button" class="cat-chip" data-cat="multi">Multiple places</button>
              </div>
            </details>

            <div id="property-panel"></div>

            <p id="count"></p>
            <div id="results" role="list"></div>
          </div>
        </div>

        <!-- =============================================================== -->
        <!-- MARKET SCOUT MISSION PANEL (Reuses same right floating panel)   -->
        <!-- =============================================================== -->
        <section id="scout-panel" hidden aria-label="Market Scout mission workspace"></section>

        <div class="inspector-footer">
          <details id="checkpoints-panel">
            <summary>My checkpoints <span id="saved-count" class="count-badge">0</span></summary>
            <form id="editor">
              <label for="pin">Checkpoint name</label>
              <input id="pin" required maxlength="70" placeholder="e.g. Barangay II field check">
              <div class="editor-actions">
                <button type="submit">Place on map</button>
                <button type="button" id="cancel-pin" class="btn-ghost" hidden>Cancel</button>
              </div>
            </form>
            <div id="saved"></div>
          </details>

          <details id="official-panel">
            <summary>Official thesis data &amp; review <span id="official-badge" class="count-badge">Not loaded</span>
            </summary>
            <p class="panel-note">
              Community places come from an OpenStreetMap snapshot and are <strong>not</strong> a complete official
              business registry.
              Load your LOCUS SF establishment JSON/CSV export here or connect via
              <code>window.LOCUS_SF.loadOfficialRecords()</code>.
            </p>
            <div class="file-loader">
              <label for="official-file" class="file-btn">Load official JSON / CSV</label>
              <input type="file" id="official-file" accept=".json,.csv" hidden>
              <button type="button" id="clear-official" class="btn-ghost" hidden>Clear</button>
            </div>
            <p id="official-summary" class="panel-meta"></p>

            <div class="curation-box">
              <label for="reviewer-name">Pin-review auditor name</label>
              <input type="text" id="reviewer-name" value="Thesis Auditor" maxlength="60"
                placeholder="Your name for reviewed_matches.json">
              <div class="curation-actions">
                <button type="button" id="export-reviews" class="btn-sm">Export reviewed_matches.json (<span
                    id="review-export-n">0</span>)</button>
                <label for="import-reviews-file" class="file-btn btn-sm">Import</label>
                <input type="file" id="import-reviews-file" accept=".json" hidden>
                <button type="button" id="clear-reviews" class="btn-ghost btn-sm" hidden>Reset</button>
              </div>
              <p class="panel-note small-note">Choose a place flagged for pin review and select <em>Link this pin to a
                  building</em> to record a reviewed link.</p>
            </div>
          </details>

          <small class="credits">
            <strong>Sources &amp; provenance:</strong>
            <span class="prov-off">Official LOCUS SF</span> (thesis dataset, when loaded) ·
            <span class="prov-comm">Community snapshot</span> © OpenStreetMap contributors (ODbL 1.0) via OpenFreeMap /
            OpenMapTiles ·
            <span class="prov-player">Player notes</span> (checkpoints &amp; scouting briefs stored locally).
            Building heights are estimated (~5 m default) unless measured. City &amp; 59 barangay boundaries (PSGC
            103314000) from Philippines JSON Maps. MapLibre GL JS 4.7.1 · Noto Sans Regular.
          </small>
          <p id="status" role="status"></p>
        </div>
      </div>
    </aside>
  </main>

</body>

</html>
<?php $cityMapDocument = (string) ob_get_clean(); ?>
<figure class="glance-map-card" aria-labelledby="glanceMapTitle" data-city-map>
  <figcaption class="glance-map-heading">
    <span class="glance-map-icon" aria-hidden="true"><?= sfc_icon('map') ?></span>
    <div>
      <h3 id="glanceMapTitle">Explore San Fernando in 3D</h3>
      <p>Properties, landmarks and 59 barangays</p>
    </div>
    <button type="button" class="glance-map-link" data-city-map-expand aria-label="Expand map" aria-controls="glanceMapViewport" aria-haspopup="dialog" hidden>
      <span class="glance-map-link-label" aria-hidden="true">Expand map</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4H4v4m12-4h4v4m0 8v4h-4M4 16v4h4"/></svg>
    </button>
  </figcaption>
  <div class="glance-map-slot">
    <dialog class="glance-map-viewport" id="glanceMapViewport" aria-labelledby="glanceMapTitle" role="region" data-city-map-viewport open>
      <p class="glance-map-status" role="status" data-city-map-status hidden></p>
      <template data-city-map-template>
        <iframe class="glance-map-frame" srcdoc="<?= $e($cityMapDocument) ?>" title="Interactive 3D map of San Fernando City"></iframe>
      </template>
    </dialog>
  </div>
</figure>
<script defer src="<?= $e($context['assetBase']) ?>/js/home-city-map.js<?= sfc_asset_version('js/home-city-map.js') ?>"></script>
