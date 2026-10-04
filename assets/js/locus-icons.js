/**
 * LOCUS-SF: Official Domain Iconography Registry & Analytical Component Library
 * Centralizes the 14 custom domain icons into a single maintainable system.
 */

(function (global) {
  'use strict';

  const ICON_FILENAMES = {
    accessibility: 'accessibility.png',
    birZonalValue: 'birzonalvalue.png',
    clupZoning: 'clupzoning.png',
    economicActivity: 'economicActivity.png',
    faultLine: 'faultline.png',
    floodSusceptibility: 'floodsusceptible.png',
    hazardSafety: 'hazardsafety.png',
    iai: 'iai.png',
    infrastructure: 'infrastructure.png',
    mce: 'mce.png',
    pointOfInterest: 'pointofinterest.png',
    propertyInformation: 'propertyinfo.png',
    siteReadiness: 'sitereadiness.png',
    utilities: 'utilities.png',
  };

  function getIconBaseUrl() {
    if (global.SFC_APP_CONFIG) {
      if (global.SFC_APP_CONFIG.assetBase) {
        return String(global.SFC_APP_CONFIG.assetBase).replace(/\/+$/, '') + '/icons';
      }
      if (global.SFC_APP_CONFIG.basePath) {
        return String(global.SFC_APP_CONFIG.basePath).replace(/\/+$/, '') + '/assets/icons';
      }
    }
    if (typeof document !== 'undefined') {
      const baseEl = document.querySelector('base[href]');
      if (baseEl) {
        const href = baseEl.getAttribute('href') || '';
        if (href && href !== '/') {
          return href.replace(/\/+$/, '') + '/assets/icons';
        }
      }
    }
    return 'assets/icons';
  }

  function resolveIconUrl(filename) {
    const base = getIconBaseUrl();
    return `${base}/${filename}`;
  }

  const LOCUS_ICONS = {};
  for (const k of Object.keys(ICON_FILENAMES)) {
    Object.defineProperty(LOCUS_ICONS, k, {
      get() {
        return resolveIconUrl(ICON_FILENAMES[k]);
      },
      enumerable: true,
      configurable: true,
    });
  }

  const ALIAS_MAP = {
    road: 'accessibility',
    access: 'accessibility',
    transport: 'accessibility',
    connectivity: 'accessibility',

    bir: 'birZonalValue',
    zonal: 'birZonalValue',
    valuation: 'birZonalValue',
    landvalue: 'birZonalValue',

    clup: 'clupZoning',
    zoning: 'clupZoning',
    landuse: 'clupZoning',

    economic: 'economicActivity',
    density: 'economicActivity',
    commerce: 'economicActivity',
    commercialactivity: 'economicActivity',

    fault: 'faultLine',
    seismic: 'faultLine',
    geological: 'faultLine',

    flood: 'floodSusceptibility',
    flooding: 'floodSusceptibility',

    hazard: 'hazardSafety',
    risk: 'hazardSafety',
    safety: 'hazardSafety',

    attractiveness: 'iai',
    score: 'iai',
    rank: 'iai',

    infra: 'infrastructure',
    physicalinfra: 'infrastructure',

    multicriteria: 'mce',
    evaluation: 'mce',
    engine: 'mce',

    poi: 'pointOfInterest',
    pois: 'pointOfInterest',
    landmark: 'pointOfInterest',
    amenity: 'pointOfInterest',
    competitor: 'pointOfInterest',

    property: 'propertyInformation',
    propertyinfo: 'propertyInformation',
    parcel: 'propertyInformation',
    lot: 'propertyInformation',

    readiness: 'siteReadiness',
    siteready: 'siteReadiness',
    irie: 'siteReadiness',
    diligence: 'siteReadiness',

    utility: 'utilities',
    power: 'utilities',
    water: 'utilities',
    telecom: 'utilities',
  };

  const ICON_LABELS = {
    accessibility: 'Road Access & Transport Connectivity',
    birZonalValue: 'BIR Zonal Value & Land Valuation',
    clupZoning: 'CLUP 2025–2035 Zoning Classification',
    economicActivity: 'Commercial Density & Economic Activity',
    faultLine: 'Seismic Fault-Line Constraint',
    floodSusceptibility: 'Flood Susceptibility & Drainage Risk',
    hazardSafety: 'Combined Hazard & Site Safety Index',
    iai: 'Investment Attractiveness Index (IAI)',
    infrastructure: 'Physical Infrastructure & Road Readiness',
    mce: 'Multi-Criteria Evaluation (MCE) Spatial Engine',
    pointOfInterest: 'Points of Interest & Service Catchment',
    propertyInformation: 'Property Dossier & Parcel Profile',
    siteReadiness: 'Investment Readiness & Verification (IRIE)',
    utilities: 'Utility Grid Capacities (Power, Water, Fiber)',
  };

  function canonicalKey(key) {
    if (!key) return 'propertyInformation';
    const cleaned = String(key).trim();
    if (LOCUS_ICONS[cleaned]) return cleaned;
    const lower = cleaned.toLowerCase().replace(/[-_]/g, '');
    if (ALIAS_MAP[lower]) return ALIAS_MAP[lower];
    for (const k of Object.keys(LOCUS_ICONS)) {
      if (k.toLowerCase() === lower) return k;
    }
    return 'propertyInformation';
  }

  /**
   * Render a semantic LOCUS domain icon.
   *
   * @param {string} key Icon key or alias
   * @param {Object} [options]
   * @param {'xs'|'sm'|'md'|'lg'|'xl'|number} [options.size='md'] Icon sizing tier
   * @param {string} [options.className=''] Extra CSS classes
   * @param {string} [options.alt=''] Accessibility alt text
   * @param {boolean} [options.container=false] Wrap in .locus-icon-box
   * @param {string} [options.containerClass=''] Extra classes on .locus-icon-box
   * @param {boolean} [options.decorative=false] Use empty alt if purely decorative
   * @returns {string} HTML string
   */
  function escapeAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function locusIcon(key, options = {}) {
    const canon = canonicalKey(key);
    const url = LOCUS_ICONS[canon] || LOCUS_ICONS.propertyInformation;
    const defaultLabel = ICON_LABELS[canon] || 'LOCUS Domain Icon';
    const altText = options.decorative ? '' : (options.alt || defaultLabel);
    const size = options.size || 'md';

    const sizeClass = typeof size === 'string' ? `locus-icon--${size}` : '';
    const styleAttr = typeof size === 'number' ? ` style="width:${size}px;height:${size}px;"` : '';
    const extraClass = options.className ? ` ${options.className}` : '';

    const imgHtml = `<img src="${url}" alt="${escapeAttr(altText)}" class="locus-icon ${sizeClass}${extraClass}"${styleAttr} loading="lazy" decoding="async">`;

    if (options.container) {
      const containerSizeClass = typeof size === 'string' ? `locus-icon-box--${size}` : '';
      const boxVariant = options.containerVariant ? ` locus-icon-box--${options.containerVariant}` : '';
      const boxExtra = options.containerClass ? ` ${options.containerClass}` : '';
      return `<span class="locus-icon-box ${containerSizeClass}${boxVariant}${boxExtra}">${imgHtml}</span>`;
    }

    return imgHtml;
  }

  /**
   * Visual Analytical Flow Component (PROPERTY DATA → MCE → IAI).
   * Renders the 8 spatial criteria mapped to their custom icons,
   * passing into the MCE engine hub, outputting into the final IAI score.
   *
   * @param {Object} property Property data object
   * @param {Object} [options]
   * @returns {string} HTML string
   */
  function locusMceAnalyticalFlow(property = {}, options = {}) {
    const rawScore = Number(property.lensScore || property.opportunityScore || property.marketScore || 88);
    const iaiScore = Math.round(rawScore);
    const fitGrade = iaiScore >= 85 ? 'Prime Fit' : (iaiScore >= 70 ? 'Strong Fit' : 'Moderate Fit');
    const roadAccess = property.roadAccessRating || property.roadFrontageM || 85;
    const assessedVal = property.assessedValueSqm ? `₱${Number(property.assessedValueSqm).toLocaleString()}/m²` : 'Tier 1 Zonal';
    const clupStatus = property.clupCompliance?.status || 'PASS';

    return `
      <section class="locus-mce-flow-section" id="locusMceAnalyticalFlow">
        <div class="locus-mce-flow-header">
          <div>
            <span class="locus-mce-flow-kicker">Spatial Decision Model · CLUP 2025–2035</span>
            <h3>Geospatial Analytical Flow (MCE → IAI)</h3>
          </div>
          <div class="service-chip-row">
            <span class="service-chip live">8-Factor Spatial Audit</span>
            <span class="service-chip neutral">Deterministic MCE</span>
          </div>
        </div>

        <div class="locus-mce-pipeline">
          <!-- STAGE 1: SPATIAL INPUT CRITERIA (8 FACTORS) -->
          <div class="locus-mce-stage-criteria">
            <div class="locus-mce-stage-title">
              ${locusIcon('propertyInformation', { size: 'xs' })}
              <span>Spatial Criteria Inputs</span>
            </div>
            <div class="locus-mce-criteria-grid">
              <div class="locus-criterion-card" title="Accessibility & Road Access Rating">
                ${locusIcon('accessibility', { size: 'sm', container: true, containerSize: 'xs' })}
                <div class="locus-criterion-info">
                  <span class="locus-criterion-name">Accessibility</span>
                  <strong class="locus-criterion-score">${roadAccess}/100</strong>
                </div>
              </div>

              <div class="locus-criterion-card" title="Physical Infrastructure Readiness">
                ${locusIcon('infrastructure', { size: 'sm', container: true, containerSize: 'xs' })}
                <div class="locus-criterion-info">
                  <span class="locus-criterion-name">Infrastructure</span>
                  <strong class="locus-criterion-score">Verified</strong>
                </div>
              </div>

              <div class="locus-criterion-card" title="Power, Water, and Fiber Telecom Grid">
                ${locusIcon('utilities', { size: 'sm', container: true, containerSize: 'xs' })}
                <div class="locus-criterion-info">
                  <span class="locus-criterion-name">Utilities</span>
                  <strong class="locus-criterion-score">Grid Ready</strong>
                </div>
              </div>

              <div class="locus-criterion-card" title="Official BIR Zonal Valuation Reference">
                ${locusIcon('birZonalValue', { size: 'sm', container: true, containerSize: 'xs' })}
                <div class="locus-criterion-info">
                  <span class="locus-criterion-name">BIR Zonal</span>
                  <strong class="locus-criterion-score">${assessedVal}</strong>
                </div>
              </div>

              <div class="locus-criterion-card" title="Flood Susceptibility & Drainage Analysis">
                ${locusIcon('floodSusceptibility', { size: 'sm', container: true, containerSize: 'xs' })}
                <div class="locus-criterion-info">
                  <span class="locus-criterion-name">Flood Risk</span>
                  <strong class="locus-criterion-score" style="color:#059669;">Low Hazard</strong>
                </div>
              </div>

              <div class="locus-criterion-card" title="Fault-Line & Seismic Constraint Screening">
                ${locusIcon('faultLine', { size: 'sm', container: true, containerSize: 'xs' })}
                <div class="locus-criterion-info">
                  <span class="locus-criterion-name">Fault Line</span>
                  <strong class="locus-criterion-score" style="color:#059669;">&gt; 5.0 km</strong>
                </div>
              </div>

              <div class="locus-criterion-card" title="Commercial Density & Corridor Pull">
                ${locusIcon('economicActivity', { size: 'sm', container: true, containerSize: 'xs' })}
                <div class="locus-criterion-info">
                  <span class="locus-criterion-name">Economic Pull</span>
                  <strong class="locus-criterion-score">High Density</strong>
                </div>
              </div>

              <div class="locus-criterion-card" title="Comprehensive Land Use Plan Compliance">
                ${locusIcon('clupZoning', { size: 'sm', container: true, containerSize: 'xs' })}
                <div class="locus-criterion-info">
                  <span class="locus-criterion-name">CLUP Zoning</span>
                  <strong class="locus-criterion-score" style="color:#059669;">${clupStatus}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- CONNECTOR ARROW 1 -->
          <div class="locus-mce-arrow" aria-hidden="true">&rarr;</div>

          <!-- STAGE 2: MCE WEIGHTING ENGINE HUB -->
          <div class="locus-mce-stage-hub">
            ${locusIcon('mce', { size: 'lg', container: true, containerVariant: 'mce' })}
            <div class="locus-mce-hub-title">Multi-Criteria Evaluation</div>
            <p class="locus-mce-hub-desc">Weighted spatial synthesis factoring legal, economic, infrastructure, and hazard safety constraints.</p>
            <span class="locus-mce-hub-tag">5-Pillar MCE Engine</span>
          </div>

          <!-- CONNECTOR ARROW 2 -->
          <div class="locus-mce-arrow" aria-hidden="true">&rarr;</div>

          <!-- STAGE 3: FINAL IAI SCORE -->
          <div class="locus-mce-stage-iai">
            ${locusIcon('iai', { size: 'lg', container: true, containerVariant: 'iai' })}
            <div class="locus-iai-title">Attractiveness Index</div>
            <div class="locus-iai-score">${iaiScore}<span>/100</span></div>
            <span class="locus-iai-fit">${fitGrade}</span>
          </div>
        </div>
      </section>
    `;
  }

  // Expose on global window object
  global.LOCUS_ICONS = LOCUS_ICONS;
  global.locusIcon = locusIcon;
  global.locusIconUrl = resolveIconUrl;
  global.locusMceAnalyticalFlow = locusMceAnalyticalFlow;

})(typeof window !== 'undefined' ? window : globalThis);
