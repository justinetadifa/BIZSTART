/**
 * LOCUS-SF City Investment Intelligence & Reporting
 * Client-Side Controller — Swiss Bento & Interactive Hexagonal City Statistics
 * Executive municipal reporting workspace for CAO, LEBDO, and CICTO
 */
(function () {
  'use strict';

  const appConfig = window.SFC_APP_CONFIG || {};
  const basePath = appConfig.basePath || '';
  const apiBase = appConfig.apiBase || (basePath + '/api');

  // Parse server-provided authoritative San Fernando geo coordinates & PSA 2020 Census data
  let geoContext = { barangays: {}, psaPopulation: {}, totalBarangays: 59 };
  try {
    const geoEl = document.getElementById('ciGeoContext');
    if (geoEl && geoEl.textContent) {
      geoContext = Object.assign(geoContext, JSON.parse(geoEl.textContent));
    }
  } catch (e) {
    console.warn('[LOCUS-SF Intelligence] Could not parse geo context:', e);
  }

  // Real Municipal Metrics Catalog for the Interactive Hexagonal Radar (Image 3)
  const RADAR_METRICS = {
    total_recorded: {
      key: 'total_recorded',
      label: 'Recorded Sites',
      short: 'Sites',
      format: (v) => `${formatNum(v)} sites`,
      desc: 'total recorded property dossiers',
    },
    published_available: {
      key: 'published_available',
      label: 'Published Listings',
      short: 'Published',
      format: (v) => `${formatNum(v)} live`,
      desc: 'verified market-ready listings',
    },
    total_land_area_sqm: {
      key: 'total_land_area_sqm',
      label: 'Land Footprint',
      short: 'Area',
      format: (v) => `${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} sqm`,
      desc: 'cumulative recorded parcel area',
    },
    avg_price_sqm: {
      key: 'avg_price_sqm',
      label: 'Price / sqm',
      short: 'Price/m²',
      format: (v) => (v > 0 ? formatCurrency(v) : '—'),
      desc: 'average asking price per sqm',
    },
    psa_population: {
      key: 'psa_population',
      label: 'PSA Population',
      short: 'Pop.',
      format: (v) => (v > 0 ? formatNum(v) : '—'),
      desc: 'PSA 2020 Census residents',
    },
    publish_rate: {
      key: 'publish_rate',
      label: 'Publish Rate',
      short: 'Pub %',
      format: (v) => `${Number(v || 0).toFixed(0)}%`,
      desc: 'share of recorded sites published',
    },
    avg_iai_score: {
      key: 'avg_iai_score',
      label: 'Avg. IAI Score',
      short: 'IAI',
      format: (v) => (v > 0 ? `${Number(v).toFixed(1)} / 100` : '—'),
      desc: 'mean provisional/verified IAI score',
    },
    pending_review: {
      key: 'pending_review',
      label: 'Pending Queue',
      short: 'Pending',
      format: (v) => `${formatNum(v)} pending`,
      desc: 'listings awaiting CAO/CICTO review',
    },
    inventory_share: {
      key: 'inventory_share',
      label: 'Inventory Share',
      short: 'Share %',
      format: (v) => `${Number(v || 0).toFixed(1)}%`,
      desc: 'share of citywide recorded sites',
    },
    footprint_share: {
      key: 'footprint_share',
      label: 'Footprint Share',
      short: 'Area %',
      format: (v) => `${Number(v || 0).toFixed(1)}%`,
      desc: 'share of citywide recorded land area',
    },
    avg_area_per_site: {
      key: 'avg_area_per_site',
      label: 'Avg. Area / Site',
      short: 'Avg Area',
      format: (v) => (v > 0 ? `${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })} sqm` : '—'),
      desc: 'average recorded footprint per listing',
    },
    clup_verified: {
      key: 'clup_verified',
      label: 'CLUP Verified',
      short: 'CLUP',
      format: (v) => `${formatNum(v)} sites`,
      desc: 'listings verified compliant under CLUP 2025–2035',
    },
    hazard_clear: {
      key: 'hazard_clear',
      label: 'Hazard Clear',
      short: 'Clear',
      format: (v) => `${formatNum(v)} clear`,
      desc: 'listings confirmed clear of active hazard flags',
    },
  };

  // Application State
  const state = {
    filters: {
      date_range: 'all',
      start_date: '',
      end_date: '',
      barangay: 'all',
      property_type: 'all',
      status: 'all',
    },
    activeTab: 'inventory',
    selectedTemplate: 'inventory',
    data: null,
    isLoading: false,

    // Interactive Swiss Bento & Hexagonal Radar state
    selectedStemKey: null,
    openWatchlistKey: 'commercial',
    barangayFilterMode: 'active', // 'active' | 'all'
    barangaySearchQuery: '',
    selectedTimelineKey: null,
    radarSelectedBarangay: null,
    radarSelectedSlot: 0,
    radarActiveSlots: [
      'psa_population',
      'total_recorded',
      'published_available',
      'total_land_area_sqm',
      'avg_iai_score',
      'avg_price_sqm',
    ],
  };

  // Formatters
  function formatNum(val) {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return Number(val).toLocaleString('en-US');
  }

  function formatArea(val) {
    if (!val || isNaN(val)) return '0 sqm';
    return Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' sqm';
  }

  function formatCurrency(val) {
    if (!val || isNaN(val)) return '—';
    return '₱' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatCompactCurrency(val) {
    const n = Number(val || 0);
    if (!n || isNaN(n)) return '₱0';
    if (n >= 1e9) return '₱' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '₱' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '₱' + (n / 1e3).toFixed(0) + 'K';
    return '₱' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatStatusLabel(rawStatus) {
    const key = String(rawStatus || '').trim().toLowerCase();
    const map = {
      published: 'Published',
      approved: 'Approved',
      verified: 'Verified',
      pending_review: 'Pending',
      under_review: 'Under Review',
      requires_correction: 'Needs Correction',
      rejected: 'Rejected',
      draft: 'Draft',
      archived: 'Archived',
    };
    return map[key] || (rawStatus ? String(rawStatus).replace(/_/g, ' ') : '—');
  }

  function formatDate(str) {
    if (!str) return '—';
    try {
      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return str;
    }
  }

  function barangayMonogram(name) {
    const cleaned = String(name || 'SF').trim();
    if (/^Barangay\s+/i.test(cleaned)) {
      return 'B' + cleaned.replace(/^Barangay\s+/i, '').slice(0, 2).toUpperCase();
    }
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleaned.slice(0, 3).toUpperCase();
  }

  // DOM Cache
  const els = {
    form: document.getElementById('ciFilterForm'),
    dateRange: document.getElementById('filterDateRange'),
    customStartGroup: document.getElementById('customStartGroup'),
    customEndGroup: document.getElementById('customEndGroup'),
    startDate: document.getElementById('filterStartDate'),
    endDate: document.getElementById('filterEndDate'),
    barangay: document.getElementById('filterBarangay'),
    propertyType: document.getElementById('filterPropertyType'),
    status: document.getElementById('filterStatus'),
    resetBtn: document.getElementById('resetFiltersBtn'),
    refreshBtn: document.getElementById('refreshDataBtn'),
    activePeriodBadge: document.getElementById('activePeriodBadge'),
    tabBtns: document.querySelectorAll('.ci-tab-btn'),
    tabPanes: document.querySelectorAll('.ci-tab-pane'),

    // Top KPIs
    kpiAvailable: document.getElementById('kpiAvailable'),
    kpiArea: document.getElementById('kpiArea'),
    kpiAreaSub: document.getElementById('kpiAreaSub'),
    kpiSubmissions: document.getElementById('kpiSubmissions'),
    kpiPending: document.getElementById('kpiPending'),
    kpiBrokers: document.getElementById('kpiBrokers'),
    kpiBrokersSub: document.getElementById('kpiBrokersSub'),
    kpiVerified: document.getElementById('kpiVerified'),
    kpiVerifiedSub: document.getElementById('kpiVerifiedSub'),

    // Hero Swiss Bento Widgets
    heroScopePill: document.getElementById('heroScopePill'),
    heroPublishRate: document.getElementById('heroPublishRate'),
    heroPublishNote: document.getElementById('heroPublishNote'),
    heroStemChart: document.getElementById('heroStemChart'),
    heroViewDetailsBtn: document.getElementById('heroViewDetailsBtn'),
    heroWatchlistBody: document.getElementById('heroWatchlistBody'),
    heroWatchlistMoreBtn: document.getElementById('heroWatchlistMoreBtn'),
    darkSaleVolume: document.getElementById('darkSaleVolume'),
    darkTenurePills: document.getElementById('darkTenurePills'),
    darkScopeLabel: document.getElementById('darkScopeLabel'),
    darkReportBtn: document.getElementById('darkReportBtn'),

    // Tab badges
    tabBadgeInventory: document.getElementById('tabBadgeInventory'),
    tabBadgeActivity: document.getElementById('tabBadgeActivity'),
    tabBadgeBrokers: document.getElementById('tabBadgeBrokers'),
    tabBadgeEngagement: document.getElementById('tabBadgeEngagement'),
    tabBadgeAssessment: document.getElementById('tabBadgeAssessment'),

    // Hexagonal City Statistics Radar (Image 3)
    radarMapSvg: document.getElementById('radarMapSvg'),
    radarBarangayMeta: document.getElementById('radarBarangayMeta'),
    radarBarangayChips: document.getElementById('radarBarangayChips'),
    radarHexSvg: document.getElementById('radarHexSvg'),
    radarCornerLabels: document.getElementById('radarCornerLabels'),
    radarActiveReadout: document.getElementById('radarActiveReadout'),
    radarTopicBench: document.getElementById('radarTopicBench'),
    radarExampleText: document.getElementById('radarExampleText'),

    // Tab 1 Elements
    invPrimaryTrack: document.getElementById('invPrimaryTrack'),
    invLandCount: document.getElementById('invLandCount'),
    invBuildingCount: document.getElementById('invBuildingCount'),
    invMixedCount: document.getElementById('invMixedCount'),
    invClassTableBody: document.getElementById('invClassTableBody'),
    invTenureDistribution: document.getElementById('invTenureDistribution'),
    invBarangaySearch: document.getElementById('invBarangaySearch'),
    invBarangayFilterActive: document.getElementById('invBarangayFilterActive'),
    invBarangayFilterAll: document.getElementById('invBarangayFilterAll'),
    invBarangayCountTag: document.getElementById('invBarangayCountTag'),
    invBarangayTableBody: document.getElementById('invBarangayTableBody'),

    // Tab 2 Elements
    activityChartContainer: document.getElementById('activityChartContainer'),
    activityStatusTableBody: document.getElementById('activityStatusTableBody'),
    activityRecentSubmissionsBody: document.getElementById('activityRecentSubmissionsBody'),

    // Tab 3 Elements
    brokerStatusCards: document.getElementById('brokerStatusCards'),
    brokerApplicationsTableBody: document.getElementById('brokerApplicationsTableBody'),

    // Tab 4 Elements
    engShortlistsCount: document.getElementById('engShortlistsCount'),
    engInquiriesCount: document.getElementById('engInquiriesCount'),
    engVisitsCount: document.getElementById('engVisitsCount'),
    engTopPropertiesBody: document.getElementById('engTopPropertiesBody'),

    // Tab 5 Elements
    assCompleteCount: document.getElementById('assCompleteCount'),
    assProvisionalCount: document.getElementById('assProvisionalCount'),
    assIncompleteCount: document.getElementById('assIncompleteCount'),
    assZoningTableBody: document.getElementById('assZoningTableBody'),
    assHazardTableBody: document.getElementById('assHazardTableBody'),
    assQueueTableBody: document.getElementById('assQueueTableBody'),

    // Report Modal Elements
    reportModal: document.getElementById('ciReportModal'),
    openReportModalBtn: document.getElementById('openReportModalBtn'),
    closeReportModalBtn: document.getElementById('closeReportModalBtn'),
    cancelReportModalBtn: document.getElementById('cancelReportModalBtn'),
    triggerPrintBtn: document.getElementById('triggerPrintBtn'),
    templateCards: document.querySelectorAll('.ci-template-card'),
    repScopePeriod: document.getElementById('repScopePeriod'),
    repScopeBarangay: document.getElementById('repScopeBarangay'),
    repScopeType: document.getElementById('repScopeType'),
    repOptAppendix: document.getElementById('repOptAppendix'),
    printContainer: document.getElementById('cityPrintContainer'),
  };

  /**
   * Fetch Dashboard Data from the API
   */
  async function fetchDashboardData() {
    if (state.isLoading) return;
    state.isLoading = true;

    if (els.refreshBtn) {
      els.refreshBtn.classList.add('is-loading');
      els.refreshBtn.style.opacity = '0.6';
    }

    const params = new URLSearchParams();
    if (state.filters.date_range) params.set('date_range', state.filters.date_range);
    if (state.filters.date_range === 'custom') {
      if (state.filters.start_date) params.set('start_date', state.filters.start_date);
      if (state.filters.end_date) params.set('end_date', state.filters.end_date);
    }
    if (state.filters.barangay && state.filters.barangay !== 'all') params.set('barangay', state.filters.barangay);
    if (state.filters.property_type && state.filters.property_type !== 'all') params.set('property_type', state.filters.property_type);
    if (state.filters.status && state.filters.status !== 'all') params.set('status', state.filters.status);

    try {
      const url = `${apiBase}/city-intelligence.php?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Failed to parse intelligence data.');
      }

      state.data = json.data;
      renderAll(state.data);
    } catch (err) {
      console.error('[LOCUS-SF Intelligence] Fetch Error:', err);
    } finally {
      state.isLoading = false;
      if (els.refreshBtn) {
        els.refreshBtn.classList.remove('is-loading');
        els.refreshBtn.style.opacity = '1';
      }
    }
  }

  /**
   * Master Render Orchestrator
   */
  function renderAll(data) {
    if (!data) return;
    renderKpis(data.kpi, data.assessment_readiness, data.broker_activity, data.meta);
    renderHeroStemChart(data.inventory, data.kpi);
    renderHeroWatchlist(data.inventory, data.kpi);
    renderDarkExecutiveCard(data.kpi, data.inventory);
    renderHexRadar(data);
    renderInventory(data.inventory, data.kpi);
    renderListingActivity(data.listing_activity);
    renderBrokerActivity(data.broker_activity);
    renderInvestorEngagement(data.investor_engagement, data.kpi);
    renderAssessmentReadiness(data.assessment_readiness);
    updateReportScopeDisplay(data.meta);
  }

  /**
   * 1. Render Top KPIs & Tab Badges
   */
  function renderKpis(kpi, assessment, broker, meta) {
    if (els.kpiAvailable) els.kpiAvailable.textContent = formatNum(kpi.properties_published);
    if (els.kpiArea) {
      els.kpiArea.innerHTML = `${Number(kpi.total_land_area_sqm || 0).toLocaleString('en-US', { maximumFractionDigits: 3 })} <small>sqm</small>`;
    }
    if (els.kpiAreaSub) {
      els.kpiAreaSub.textContent = `${Number(kpi.total_building_area_sqm || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} sqm built floor area`;
    }
    if (els.kpiSubmissions) els.kpiSubmissions.textContent = formatNum(kpi.submissions_in_period);
    if (els.kpiPending) els.kpiPending.textContent = formatNum(kpi.properties_pending);
    if (els.kpiBrokers) els.kpiBrokers.textContent = formatNum(kpi.broker_applications_in_period);
    if (els.kpiBrokersSub && broker && broker.status_breakdown) {
      els.kpiBrokersSub.textContent = `${formatNum(broker.status_breakdown.approved || 0)} verified active brokers`;
    }
    if (els.kpiVerified && assessment && assessment.counts) {
      els.kpiVerified.textContent = formatNum(assessment.counts.complete_verified || 0);
    }
    if (els.kpiVerifiedSub && assessment && assessment.counts) {
      els.kpiVerifiedSub.textContent = `${formatNum(assessment.counts.provisional_model || 0)} provisional models`;
    }

    const total = Number(kpi.properties_total || 0);
    const pub = Number(kpi.properties_published || 0);
    const rate = total > 0 ? ((pub / total) * 100).toFixed(1) : '0.0';
    if (els.heroPublishRate) els.heroPublishRate.textContent = `${rate}%`;
    if (els.heroPublishNote) {
      els.heroPublishNote.textContent = `${formatNum(pub)} of ${formatNum(total)} recorded properties are published & verified on market.`;
    }
    if (els.heroScopePill) {
      els.heroScopePill.textContent = state.filters.barangay === 'all' ? 'San Fernando City' : state.filters.barangay;
    }

    // Tab badges
    if (els.tabBadgeInventory) els.tabBadgeInventory.textContent = formatNum(kpi.properties_total);
    if (els.tabBadgeActivity) els.tabBadgeActivity.textContent = formatNum(kpi.submissions_in_period);
    if (els.tabBadgeBrokers) els.tabBadgeBrokers.textContent = formatNum(kpi.broker_applications_in_period);
    if (els.tabBadgeEngagement) els.tabBadgeEngagement.textContent = formatNum((kpi.total_shortlists || 0) + (kpi.total_inquiries || 0));
    if (els.tabBadgeAssessment && assessment && assessment.counts) {
      els.tabBadgeAssessment.textContent = formatNum(assessment.counts.complete_verified || 0);
    }

    if (els.activePeriodBadge && meta && meta.bounds) {
      els.activePeriodBadge.textContent = meta.bounds.label || 'All Records';
    }
  }

  /**
   * 1B. Render Signature Vertical Stem Chart with Radiant Canary-Yellow Halo (Image 4)
   */
  function renderHeroStemChart(inv, kpi) {
    if (!els.heroStemChart || !inv) return;

    const allBg = Array.isArray(inv.barangays) ? inv.barangays : [];
    const populated = allBg.filter((b) => Number(b.total_recorded || 0) > 0);
    // Ensure a balanced 7-stem editorial showcase using leading barangays + key San Fernando corridors
    const fallbackNames = ['Catbangen', 'Poro', 'Lingsat', 'Ilocanos Sur', 'Parian', 'Tanqui', 'Pagdaraoan'];
    const items = populated.slice(0, 7);
    if (items.length < 7) {
      for (const name of fallbackNames) {
        if (items.length >= 7) break;
        if (items.some((x) => x.barangay === name)) continue;
        const match = allBg.find((b) => b.barangay === name);
        if (match) items.push(match);
      }
    }
    while (items.length < 7 && items.length < allBg.length) {
      const next = allBg.find((b) => !items.some((x) => x.barangay === b.barangay));
      if (!next) break;
      items.push(next);
    }

    if (!state.selectedStemKey || !items.some((x) => x.barangay === state.selectedStemKey)) {
      state.selectedStemKey = items[0] ? items[0].barangay : null;
    }

    const maxRec = Math.max(1, ...items.map((x) => Number(x.total_recorded || 0)));

    els.heroStemChart.innerHTML = items.map((item) => {
      const count = Number(item.total_recorded || 0);
      const area = Number(item.total_land_area_sqm || 0);
      const isActive = item.barangay === state.selectedStemKey;
      // Scale stem heights cleanly between 16% (zero baseline) and 92% (peak)
      const pct = count > 0 ? Math.round(28 + (count / maxRec) * 64) : 14;
      const haloHeight = Math.min(98, pct + 8);
      const abbr = barangayMonogram(item.barangay);
      const pillLabel = count > 0
        ? `${formatNum(count)} ${count === 1 ? 'site' : 'sites'}${area > 0 ? ` · ${area} sqm` : ''}`
        : `${item.barangay}: 0`;

      return `
        <button
          type="button"
          class="ci-stem-col ${isActive ? 'is-active' : ''}"
          data-stem-barangay="${escapeHtml(item.barangay)}"
          title="${escapeHtml(item.barangay)}: ${formatNum(count)} recorded (${formatNum(item.published_available || 0)} published)"
        >
          <div class="ci-stem-stage" style="--stem-pct: ${pct}%;">
            <span class="ci-stem-float-pill">${escapeHtml(pillLabel)}</span>
            <span class="ci-stem-halo" style="height: ${haloHeight}%;"></span>
            <span class="ci-stem-line-wrap" style="--stem-pct: ${pct}%;">
              <span class="ci-stem-dot"></span>
              <span class="ci-stem-line"></span>
            </span>
          </div>
          <span class="ci-stem-axis-pill">${escapeHtml(abbr)}</span>
        </button>
      `;
    }).join('');

    els.heroStemChart.querySelectorAll('.ci-stem-col').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bgName = btn.getAttribute('data-stem-barangay');
        state.selectedStemKey = bgName;
        renderHeroStemChart(inv, kpi);
        // Sync radar if this barangay is in the compared radar set
        if (state.data && bgName) {
          const matchPop = (state.data.inventory.barangays || []).find((b) => b.barangay === bgName && b.total_recorded > 0);
          if (matchPop) {
            state.radarSelectedBarangay = bgName;
            renderHexRadar(state.data);
          }
        }
      });
    });
  }

  /**
   * 1C. Render Right-Column Land Use Watchlist Accordion (Image 4 Watchlist)
   */
  function renderHeroWatchlist(inv, kpi) {
    if (!els.heroWatchlistBody || !inv) return;

    const total = Number(kpi.properties_total || 0);
    const cls = inv.classifications || {};
    const pt = inv.primary_types || {};
    const rows = [
      { key: 'commercial', code: 'CM', label: 'Commercial', count: Number(cls.commercial || 0), note: 'Retail, offices & trade corridors' },
      { key: 'industrial', code: 'IN', label: 'Industrial', count: Number(cls.industrial || 0), note: 'Warehousing & logistics hubs' },
      { key: 'residential', code: 'RS', label: 'Residential', count: Number(cls.residential || 0), note: 'Mixed-residential & housing lots' },
      { key: 'agricultural', code: 'AG', label: 'Agricultural', count: Number(cls.agricultural || 0), note: 'Agri-industrial & rural parcels' },
    ];

    els.heroWatchlistBody.innerHTML = rows.map((row) => {
      const pct = total > 0 ? ((row.count / total) * 100).toFixed(1) : '0.0';
      const isOpen = state.openWatchlistKey === row.key;
      return `
        <div class="ci-wl-item ${isOpen ? 'is-open' : ''}">
          <button type="button" class="ci-wl-trigger" data-wl-key="${row.key}" aria-expanded="${isOpen ? 'true' : 'false'}">
            <span class="ci-wl-icon">${row.code}</span>
            <span class="ci-wl-name">${escapeHtml(row.label)}</span>
            <span class="ci-wl-count">${formatNum(row.count)}</span>
            <span class="ci-wl-share ${row.count === 0 ? 'is-zero' : ''}">${pct}%</span>
            <span class="ci-wl-chevron" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
          </button>
          <div class="ci-wl-drawer">
            <div class="ci-wl-detail-row">
              <span>Tagged parcels</span>
              <strong>${formatNum(row.count)} of ${formatNum(total)}</strong>
            </div>
            <div class="ci-wl-detail-row">
              <span>Primary form mix</span>
              <strong>${formatNum(pt.land || 0)} Land · ${formatNum(pt.building || 0)} Built</strong>
            </div>
            <div class="ci-wl-detail-row">
              <span>Designation scope</span>
              <strong>${escapeHtml(row.note)}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');

    els.heroWatchlistBody.querySelectorAll('.ci-wl-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-wl-key');
        state.openWatchlistKey = state.openWatchlistKey === key ? null : key;
        renderHeroWatchlist(inv, kpi);
      });
    });
  }

  /**
   * 1D. Render Bottom-Right Obsidian Dark Executive Card (Image 4 Balance Card)
   */
  function renderDarkExecutiveCard(kpi, inv) {
    if (els.darkSaleVolume) {
      els.darkSaleVolume.textContent = formatCompactCurrency(kpi.total_sale_volume_php);
    }
    if (els.darkTenurePills && inv && inv.tenure) {
      const sale = Number(inv.tenure.sale || 0);
      const lease = Number(inv.tenure.lease || 0);
      const jv = Number(inv.tenure.joint_venture || 0);
      const parts = [`${formatNum(sale)} Sale`, `${formatNum(lease)} Lease`];
      if (jv > 0) parts.push(`${formatNum(jv)} JV`);
      els.darkTenurePills.textContent = parts.join(' · ');
    }
    if (els.darkScopeLabel) {
      const bgyScope = state.filters.barangay === 'all'
        ? `All ${geoContext.totalBarangays || 59} Barangays`
        : state.filters.barangay;
      els.darkScopeLabel.textContent = bgyScope;
    }
  }

  /**
   * 2. INTERACTIVE HEXAGONAL SAN FERNANDO CITY STATISTICS RADAR (Image 3)
   */
  function buildRadarDataset(data) {
    const allBarangays = (data.inventory && data.inventory.barangays) ? data.inventory.barangays : [];
    const queue = (data.assessment_readiness && data.assessment_readiness.readiness_queue) ? data.assessment_readiness.readiness_queue : [];
    const totalSites = Math.max(1, Number((data.kpi && data.kpi.properties_total) || 0));
    const totalArea = Math.max(0.0001, Number((data.kpi && data.kpi.total_land_area_sqm) || 0));

    // Compute average IAI score, CLUP verified count, and hazard-clear count per barangay from real assessment queue
    const iaiBuckets = {};
    const clupBuckets = {};
    const clearBuckets = {};
    queue.forEach((item) => {
      if (!item.barangay) return;
      if (item.iai_score !== null && item.iai_score !== undefined) {
        if (!iaiBuckets[item.barangay]) iaiBuckets[item.barangay] = [];
        iaiBuckets[item.barangay].push(Number(item.iai_score));
      }
      if (String(item.zoning_status || '').toLowerCase().includes('verified')) {
        clupBuckets[item.barangay] = (clupBuckets[item.barangay] || 0) + 1;
      }
      if (!item.has_hazard_flag) {
        clearBuckets[item.barangay] = (clearBuckets[item.barangay] || 0) + 1;
      }
    });

    let activeList = allBarangays.filter((b) => Number(b.total_recorded || 0) > 0);
    if (activeList.length === 0) {
      activeList = allBarangays.slice(0, 5);
    }

    return activeList.slice(0, 10).map((b) => {
      const rec = Number(b.total_recorded || 0);
      const pub = Number(b.published_available || 0);
      const pend = Number(b.pending_review || 0);
      const area = Number(b.total_land_area_sqm || 0);
      const price = Number(b.avg_price_sqm || 0);
      const pop = Number((geoContext.psaPopulation && geoContext.psaPopulation[b.barangay]) || 0);
      const scores = iaiBuckets[b.barangay] || [];
      const avgIai = scores.length > 0 ? scores.reduce((a, c) => a + c, 0) / scores.length : 0;
      const geo = (geoContext.barangays && geoContext.barangays[b.barangay]) || { lat: 16.615, lng: 120.322, district: 'San Fernando City' };

      return {
        barangay: b.barangay,
        district: geo.district,
        lat: geo.lat,
        lng: geo.lng,
        metrics: {
          total_recorded: rec,
          published_available: pub,
          total_land_area_sqm: area,
          avg_price_sqm: price,
          psa_population: pop,
          publish_rate: rec > 0 ? (pub / rec) * 100 : 0,
          avg_iai_score: avgIai,
          pending_review: pend,
          inventory_share: (rec / totalSites) * 100,
          footprint_share: (area / totalArea) * 100,
          avg_area_per_site: rec > 0 ? area / rec : 0,
          clup_verified: clupBuckets[b.barangay] || 0,
          hazard_clear: clearBuckets[b.barangay] || 0,
        },
      };
    });
  }

  function computeSanFernandoSilhouettePath(projectFn) {
    // Ordered real perimeter waypoints of San Fernando City, La Union from data/barangays.json
    const perimeterNames = [
      'Dalumpinas Oeste', 'Bato', 'Abut', 'Saoay', 'Nagyubuyuban', 'Pacpaco',
      'Pao Norte', 'Sacyud', 'Cabarsican', 'Masicong', 'Siboan-Otong', 'Bungro',
      'Pagdalagan', 'San Vicente', 'Canaoay', 'San Francisco', 'Poro', 'Catbangen',
      'Ilocanos Norte', 'Lingsat', 'Carlatan', 'Bangcusay',
    ];
    const pts = [];
    perimeterNames.forEach((name) => {
      const g = geoContext.barangays && geoContext.barangays[name];
      if (g) pts.push(projectFn(g.lat, g.lng));
    });
    if (pts.length < 3) return '';

    // Smooth closed quadratic curve around San Fernando's real coastline & highland ridge
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % pts.length];
      const midX = ((p0[0] + p1[0]) / 2).toFixed(1);
      const midY = ((p0[1] + p1[1]) / 2).toFixed(1);
      if (i === 0) {
        const prev = pts[pts.length - 1];
        const startX = ((prev[0] + p0[0]) / 2).toFixed(1);
        const startY = ((prev[1] + p0[1]) / 2).toFixed(1);
        d += `M ${startX} ${startY} `;
      }
      d += `Q ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${midX} ${midY} `;
    }
    return d + 'Z';
  }

  function renderHexRadar(data) {
    if (!els.radarHexSvg || !els.radarMapSvg || !data) return;

    const dataset = buildRadarDataset(data);
    if (dataset.length === 0) return;

    if (!state.radarSelectedBarangay || !dataset.some((d) => d.barangay === state.radarSelectedBarangay)) {
      state.radarSelectedBarangay = dataset[0].barangay;
    }

    const activeEntry = dataset.find((d) => d.barangay === state.radarSelectedBarangay) || dataset[0];

    // 1) Render San Fernando City Silhouette Map & Plotted Barangay Pins (Left)
    const allCoords = Object.values(geoContext.barangays || {});
    let minLat = 16.565, maxLat = 16.656, minLng = 120.300, maxLng = 120.424;
    if (allCoords.length > 0) {
      minLat = Math.min(...allCoords.map((c) => c.lat)) - 0.004;
      maxLat = Math.max(...allCoords.map((c) => c.lat)) + 0.004;
      minLng = Math.min(...allCoords.map((c) => c.lng)) - 0.005;
      maxLng = Math.max(...allCoords.map((c) => c.lng)) + 0.005;
    }

    const mapW = 220;
    const mapH = 260;
    const pad = 18;
    const project = (lat, lng) => {
      const x = pad + ((lng - minLng) / (maxLng - minLng)) * (mapW - pad * 2);
      const y = pad + (1 - (lat - minLat) / (maxLat - minLat)) * (mapH - pad * 2);
      return [x, y];
    };

    const silhouettePath = computeSanFernandoSilhouettePath(project);
    const pinsSvg = dataset.map((item) => {
      const [x, y] = project(item.lat, item.lng);
      const isSelected = item.barangay === activeEntry.barangay;
      return `
        <g class="ci-map-pin ${isSelected ? 'is-active' : ''}" data-radar-bgy="${escapeHtml(item.barangay)}" tabindex="0" role="button" aria-label="Select ${escapeHtml(item.barangay)}">
          <title>${escapeHtml(item.barangay)} (${escapeHtml(item.district)})</title>
          ${isSelected ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="rgba(20,199,141,0.16)" stroke="#14c78d" stroke-width="2" />` : ''}
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isSelected ? '6.5' : '4.5'}" fill="#ffffff" stroke="${isSelected ? '#14c78d' : '#111215'}" stroke-width="${isSelected ? '2.2' : '1.4'}" />
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isSelected ? '2.6' : '1.8'}" fill="${isSelected ? '#14c78d' : '#111215'}" />
        </g>
      `;
    }).join('');

    els.radarMapSvg.innerHTML = `
      ${silhouettePath ? `<path d="${silhouettePath}" fill="#ffffff" stroke="rgba(17,18,21,0.09)" stroke-width="1.2" />` : ''}
      ${pinsSvg}
    `;

    els.radarMapSvg.querySelectorAll('.ci-map-pin').forEach((pin) => {
      const selectPin = () => {
        state.radarSelectedBarangay = pin.getAttribute('data-radar-bgy');
        renderHexRadar(state.data);
        renderBarangayTable(state.data.inventory);
      };
      pin.addEventListener('click', selectPin);
      pin.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          selectPin();
        }
      });
    });

    if (els.radarBarangayMeta) {
      els.radarBarangayMeta.textContent = `${activeEntry.barangay} · ${activeEntry.district}`;
    }

    if (els.radarBarangayChips) {
      els.radarBarangayChips.innerHTML = dataset.map((item) => {
        const isSelected = item.barangay === activeEntry.barangay;
        return `
          <button type="button" class="ci-radar-bgy-chip ${isSelected ? 'is-active' : ''}" data-radar-chip="${escapeHtml(item.barangay)}">
            ${escapeHtml(item.barangay)}
          </button>
        `;
      }).join('');

      els.radarBarangayChips.querySelectorAll('.ci-radar-bgy-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          state.radarSelectedBarangay = chip.getAttribute('data-radar-chip');
          renderHexRadar(state.data);
          renderBarangayTable(state.data.inventory);
        });
      });
    }

    // 2) Render 6-Axis Concentric Hexagon Radar SVG (Center)
    const cx = 210;
    const cy = 170;
    const maxR = 136;
    // Angles match Image 3 flat-top hexagon: 0: Top-Left (-120°), 1: Top-Right (-60°), 2: Right (0°), 3: Bottom-Right (60°), 4: Bottom-Left (120°), 5: Left (180°)
    const angles = [-120, -60, 0, 60, 120, 180].map((deg) => (deg * Math.PI) / 180);

    const ringLevels = [1, 0.84, 0.68, 0.52, 0.36, 0.2];
    const ringsSvg = ringLevels.map((lvl, idx) => {
      const pts = angles.map((a) => `${(cx + Math.cos(a) * maxR * lvl).toFixed(1)},${(cy + Math.sin(a) * maxR * lvl).toFixed(1)}`).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="${idx === 0 ? '#5c6066' : 'rgba(17,18,21,0.18)'}" stroke-width="${idx === 0 ? '1.3' : '0.9'}" />`;
    }).join('');

    const spokesSvg = angles.map((a) => {
      const x2 = (cx + Math.cos(a) * maxR).toFixed(1);
      const y2 = (cy + Math.sin(a) * maxR).toFixed(1);
      return `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="rgba(17,18,21,0.12)" stroke-width="0.9" />`;
    }).join('');

    // Normalize each active slot across the compared barangays (0.14 center floor → 0.96 high corner)
    const slotBounds = state.radarActiveSlots.map((metricKey) => {
      const vals = dataset.map((d) => Number(d.metrics[metricKey] || 0));
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      return { minV, maxV };
    });

    const polygonPointsFor = (entry) => {
      return state.radarActiveSlots.map((metricKey, idx) => {
        const val = Number(entry.metrics[metricKey] || 0);
        const { minV, maxV } = slotBounds[idx];
        let norm = 0.16;
        if (maxV > minV) {
          norm = 0.18 + ((val - minV) / (maxV - minV)) * 0.78;
        } else if (val > 0) {
          norm = 0.72;
        }
        const r = maxR * norm;
        const a = angles[idx];
        return [(cx + Math.cos(a) * r), (cy + Math.sin(a) * r)];
      });
    };

    const bgPolysSvg = dataset
      .filter((d) => d.barangay !== activeEntry.barangay)
      .map((entry) => {
        const pts = polygonPointsFor(entry).map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        return `<polygon class="ci-radar-poly-bg" points="${pts}"><title>${escapeHtml(entry.barangay)}</title></polygon>`;
      })
      .join('');

    const activeCoords = polygonPointsFor(activeEntry);
    const activePtsStr = activeCoords.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const activeDotsSvg = activeCoords.map((p, idx) => {
      const mKey = state.radarActiveSlots[idx];
      const meta = RADAR_METRICS[mKey];
      const rawVal = activeEntry.metrics[mKey];
      return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.2" fill="#14c78d" stroke="#ffffff" stroke-width="1.6"><title>${escapeHtml(activeEntry.barangay)} · ${escapeHtml(meta.label)}: ${escapeHtml(meta.format(rawVal))}</title></circle>`;
    }).join('');

    els.radarHexSvg.innerHTML = `
      ${ringsSvg}
      ${spokesSvg}
      ${bgPolysSvg}
      <polygon class="ci-radar-poly-active" points="${activePtsStr}" />
      ${activeDotsSvg}
    `;

    // 3) Render 6 Interactive Corner Drop-Zone Pills
    if (els.radarCornerLabels) {
      els.radarCornerLabels.innerHTML = state.radarActiveSlots.map((metricKey, idx) => {
        const meta = RADAR_METRICS[metricKey];
        const isSlotSelected = state.radarSelectedSlot === idx;
        return `
          <button
            type="button"
            class="ci-corner-pill ${isSlotSelected ? 'is-slot-selected' : ''}"
            data-slot="${idx}"
            data-metric="${metricKey}"
            title="Click to select corner ${idx + 1}, or drag a topic from the right onto this corner"
          >
            ${escapeHtml(meta ? meta.label : metricKey)}
          </button>
        `;
      }).join('');

      els.radarCornerLabels.querySelectorAll('.ci-corner-pill').forEach((cornerBtn) => {
        const slotIdx = Number(cornerBtn.getAttribute('data-slot'));
        cornerBtn.addEventListener('click', () => {
          state.radarSelectedSlot = slotIdx;
          renderHexRadar(state.data);
        });
        cornerBtn.addEventListener('dragover', (ev) => {
          ev.preventDefault();
          cornerBtn.classList.add('is-drop-over');
        });
        cornerBtn.addEventListener('dragleave', () => {
          cornerBtn.classList.remove('is-drop-over');
        });
        cornerBtn.addEventListener('drop', (ev) => {
          ev.preventDefault();
          cornerBtn.classList.remove('is-drop-over');
          const droppedKey = ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : '';
          if (droppedKey && RADAR_METRICS[droppedKey]) {
            swapRadarSlot(slotIdx, droppedKey);
          }
        });
      });
    }

    // 4) Live Readout Chips for Active Barangay
    if (els.radarActiveReadout) {
      els.radarActiveReadout.innerHTML = state.radarActiveSlots.map((metricKey) => {
        const meta = RADAR_METRICS[metricKey];
        const val = activeEntry.metrics[metricKey];
        return `<span class="ci-radar-stat-chip"><span>${escapeHtml(meta.short)}:</span><strong>${escapeHtml(meta.format(val))}</strong></span>`;
      }).join('');
    }

    // 5) Right Column Swappable Topic Bench Pills (All metrics not currently on the 6 corners, plus quick-swap icons)
    if (els.radarTopicBench) {
      const benchKeys = Object.keys(RADAR_METRICS).filter((k) => !state.radarActiveSlots.includes(k));
      els.radarTopicBench.innerHTML = benchKeys.map((key) => {
        const meta = RADAR_METRICS[key];
        return `
          <button
            type="button"
            class="ci-topic-pill"
            draggable="true"
            data-topic-key="${key}"
            title="Drag onto a hexagon corner or click to swap into the highlighted corner"
          >
            <span>${escapeHtml(meta.label)}</span>
            <span class="ci-topic-pill-icon" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
            </span>
          </button>
        `;
      }).join('');

      els.radarTopicBench.querySelectorAll('.ci-topic-pill').forEach((pill) => {
        const key = pill.getAttribute('data-topic-key');
        pill.addEventListener('dragstart', (ev) => {
          if (ev.dataTransfer) {
            ev.dataTransfer.setData('text/plain', key);
            ev.dataTransfer.effectAllowed = 'move';
          }
        });
        pill.addEventListener('click', () => {
          swapRadarSlot(state.radarSelectedSlot, key);
        });
      });
    }

    // 6) Dynamic Footnote Example (Exact Image 3 Right Caption)
    if (els.radarExampleText) {
      const rec = activeEntry.metrics.total_recorded;
      const area = activeEntry.metrics.total_land_area_sqm;
      const price = activeEntry.metrics.avg_price_sqm;
      const pop = activeEntry.metrics.psa_population;
      const pricePart = price > 0 ? `, avg. ${formatCurrency(price)}/sqm` : '';
      const popPart = pop > 0 ? `, PSA 2020 pop. ${formatNum(pop)}` : '';
      els.radarExampleText.textContent = `Example: ${activeEntry.barangay} (${activeEntry.district}) records ${formatNum(rec)} ${rec === 1 ? 'property' : 'properties'} spanning ${area} sqm${pricePart}${popPart}.`;
    }
  }

  function swapRadarSlot(slotIndex, newMetricKey) {
    if (slotIndex < 0 || slotIndex >= state.radarActiveSlots.length) return;
    if (!RADAR_METRICS[newMetricKey]) return;
    const existingIdx = state.radarActiveSlots.indexOf(newMetricKey);
    if (existingIdx !== -1) {
      const tmp = state.radarActiveSlots[slotIndex];
      state.radarActiveSlots[slotIndex] = newMetricKey;
      state.radarActiveSlots[existingIdx] = tmp;
    } else {
      state.radarActiveSlots[slotIndex] = newMetricKey;
    }
    state.radarSelectedSlot = (slotIndex + 1) % 6;
    if (state.data) renderHexRadar(state.data);
  }

  /**
   * 3. Render Property Inventory Breakdown & Editorial Barangay Table
   */
  function renderInventory(inv, kpi) {
    if (!inv) return;

    const total = Number(kpi.properties_total) || 0;
    const landCount = Number(inv.primary_types.land || 0);
    const buildingCount = Number(inv.primary_types.building || 0);
    const mixedCount = Number(inv.primary_types.mixed || 0);

    const landPct = total > 0 ? ((landCount / total) * 100).toFixed(1) : 0;
    const bldgPct = total > 0 ? ((buildingCount / total) * 100).toFixed(1) : 0;
    const mixedPct = total > 0 ? Math.max(0, 100 - landPct - bldgPct).toFixed(1) : 0;

    if (els.invPrimaryTrack) {
      els.invPrimaryTrack.innerHTML = `
        ${landCount > 0 ? `<div class="ci-distribution-segment ci-seg-land" style="width: ${landPct}%;" title="Land Parcels: ${landCount} (${landPct}%)">${Number(landPct) >= 16 ? `Land ${landPct}%` : (Number(landPct) >= 10 ? `${landPct}%` : '')}</div>` : ''}
        ${buildingCount > 0 ? `<div class="ci-distribution-segment ci-seg-building" style="width: ${bldgPct}%;" title="Buildings: ${buildingCount} (${bldgPct}%)">${Number(bldgPct) >= 16 ? `Built ${bldgPct}%` : (Number(bldgPct) >= 10 ? `${bldgPct}%` : '')}</div>` : ''}
        ${mixedCount > 0 ? `<div class="ci-distribution-segment ci-seg-mixed" style="width: ${mixedPct}%;" title="Mixed / Unspecified: ${mixedCount} (${mixedPct}%)">${Number(mixedPct) >= 16 ? `Mixed ${mixedPct}%` : (Number(mixedPct) >= 10 ? `${mixedPct}%` : '')}</div>` : ''}
      `;
    }

    if (els.invLandCount) els.invLandCount.textContent = `${formatNum(landCount)} (${landPct}%)`;
    if (els.invBuildingCount) els.invBuildingCount.textContent = `${formatNum(buildingCount)} (${bldgPct}%)`;
    if (els.invMixedCount) els.invMixedCount.textContent = `${formatNum(mixedCount)} (${mixedPct}%)`;

    if (els.invClassTableBody) {
      const cls = inv.classifications || {};
      const labels = {
        commercial: 'Commercial',
        industrial: 'Industrial',
        residential: 'Residential',
        agricultural: 'Agricultural',
        special: 'Special / Tourism / Mixed',
      };

      let rows = '';
      for (const [key, label] of Object.entries(labels)) {
        const count = Number(cls[key] || 0);
        const share = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0.0%';
        rows += `
          <tr>
            <td><strong>${escapeHtml(label)}</strong></td>
            <td class="ci-table-num">${formatNum(count)}</td>
            <td class="ci-table-num">${share}</td>
          </tr>
        `;
      }
      els.invClassTableBody.innerHTML = rows;
    }

    if (els.invTenureDistribution) {
      const ten = inv.tenure || {};
      const tenureLabels = {
        sale: { label: 'For Sale', color: 'ci-badge-mint' },
        lease: { label: 'For Lease', color: 'ci-badge-ink' },
        joint_venture: { label: 'Joint Venture', color: 'ci-badge-canary' },
        build_to_suit: { label: 'Build-to-Suit', color: 'ci-badge-slate' },
      };

      let pills = '';
      for (const [key, def] of Object.entries(tenureLabels)) {
        const count = Number(ten[key] || 0);
        pills += `
          <div class="ci-badge ${def.color}">
            <span>${escapeHtml(def.label)}:</span>
            <strong>${formatNum(count)}</strong>
          </div>
        `;
      }
      els.invTenureDistribution.innerHTML = pills;
    }

    renderBarangayTable(inv);
  }

  function renderBarangayTable(inv) {
    if (!els.invBarangayTableBody || !inv) return;

    const fullList = Array.isArray(inv.barangays) ? inv.barangays : [];
    const activeCount = fullList.filter((b) => Number(b.total_recorded || 0) > 0).length;

    if (els.invBarangayFilterActive) {
      els.invBarangayFilterActive.textContent = `Active (${activeCount})`;
      els.invBarangayFilterActive.classList.toggle('is-active', state.barangayFilterMode === 'active');
    }
    if (els.invBarangayFilterAll) {
      els.invBarangayFilterAll.textContent = `All ${fullList.length}`;
      els.invBarangayFilterAll.classList.toggle('is-active', state.barangayFilterMode === 'all');
    }
    if (els.invBarangayCountTag) {
      els.invBarangayCountTag.textContent = `${fullList.length} Barangays`;
    }

    const q = (state.barangaySearchQuery || '').trim().toLowerCase();
    let visible = fullList;
    if (q) {
      visible = fullList.filter((bg) => {
        const district = (geoContext.barangays[bg.barangay] && geoContext.barangays[bg.barangay].district) || '';
        return bg.barangay.toLowerCase().includes(q) || district.toLowerCase().includes(q);
      });
    } else if (state.barangayFilterMode === 'active' && activeCount > 0) {
      visible = fullList.filter((bg) => Number(bg.total_recorded || 0) > 0);
    }

    if (visible.length === 0) {
      els.invBarangayTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #6c6f75; padding: 28px;">No San Fernando barangays match the current search or filter criteria.</td></tr>`;
      return;
    }

    els.invBarangayTableBody.innerHTML = visible.map((bg) => {
      const totalRec = Number(bg.total_recorded || 0);
      const avail = Number(bg.published_available || 0);
      const pending = Number(bg.pending_review || 0);
      const area = Number(bg.total_land_area_sqm || 0);
      const avgPrice = bg.avg_price_sqm !== null ? formatCurrency(bg.avg_price_sqm) : '—';
      const district = (geoContext.barangays[bg.barangay] && geoContext.barangays[bg.barangay].district) || 'San Fernando City';
      const isRadarSelected = totalRec > 0 && bg.barangay === state.radarSelectedBarangay;

      return `
        <tr class="${totalRec > 0 ? 'is-selectable' : ''} ${isRadarSelected ? 'is-radar-selected' : ''}" data-row-barangay="${escapeHtml(bg.barangay)}">
          <td>
            <div class="ci-bgy-cell">
              <span class="ci-bgy-avatar ${totalRec > 0 ? 'is-populated' : ''}">${escapeHtml(barangayMonogram(bg.barangay))}</span>
              <span class="ci-bgy-meta">
                <strong>${escapeHtml(bg.barangay)}</strong>
                <small>${escapeHtml(district)}</small>
              </span>
            </div>
          </td>
          <td class="ci-table-num">${formatNum(totalRec)}</td>
          <td class="ci-table-num">${avail > 0 ? `<span class="ci-badge ci-badge-mint">✓ ${formatNum(avail)} Published</span>` : '<span style="color:#8e9299;">0</span>'}</td>
          <td class="ci-table-num">${pending > 0 ? `<span class="ci-badge ci-badge-canary">✺ ${formatNum(pending)} Pending</span>` : '<span style="color:#8e9299;">0</span>'}</td>
          <td class="ci-table-num">${area > 0 ? formatArea(area) : '—'}</td>
          <td class="ci-table-num">${avgPrice}</td>
        </tr>
      `;
    }).join('');

    els.invBarangayTableBody.querySelectorAll('tr.is-selectable').forEach((row) => {
      row.addEventListener('click', () => {
        const bgName = row.getAttribute('data-row-barangay');
        if (bgName && state.data) {
          state.radarSelectedBarangay = bgName;
          renderHexRadar(state.data);
          renderBarangayTable(state.data.inventory);
        }
      });
    });
  }

  /**
   * 4. Render Listing & Review Trends (Image-4 Radiant Canary Stem Chart)
   */
  function renderListingActivity(act) {
    if (!act) return;

    if (els.activityChartContainer) {
      const timeline = act.timeline || [];
      if (timeline.length === 0) {
        els.activityChartContainer.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 180px; color: #6c6f75; font-size: 13px;">
            No historical submission or publication records recorded within this time window.
          </div>
        `;
      } else {
        if (!state.selectedTimelineKey || !timeline.some((t) => t.period_key === state.selectedTimelineKey)) {
          state.selectedTimelineKey = timeline[timeline.length - 1].period_key;
        }
        const maxVal = Math.max(
          1,
          ...timeline.map((d) => Math.max(Number(d.submissions || 0), Number(d.publications || 0)))
        );

        els.activityChartContainer.innerHTML = `
          <div class="ci-timeline-stems">
            ${timeline.map((item) => {
              const sub = Number(item.submissions || 0);
              const pub = Number(item.publications || 0);
              const subPct = sub > 0 ? Math.max(18, Math.round((sub / maxVal) * 86)) : 10;
              const pubPct = pub > 0 ? Math.max(18, Math.round((pub / maxVal) * 86)) : 10;
              const isActive = item.period_key === state.selectedTimelineKey;

              return `
                <button type="button" class="ci-tl-col ${isActive ? 'is-active' : ''}" data-tl-key="${escapeHtml(item.period_key)}">
                  <span class="ci-tl-pill-tip">${formatNum(sub)} Sub · ${formatNum(pub)} App</span>
                  <div class="ci-tl-pair">
                    <span class="ci-tl-halo"></span>
                    <span class="ci-tl-stem is-sub" style="height: ${subPct}%;" title="Submissions in ${escapeHtml(item.period_label)}: ${sub}">
                      <span class="ci-tl-stem-dot"></span>
                      <span class="ci-tl-stem-line"></span>
                    </span>
                    <span class="ci-tl-stem is-pub" style="height: ${pubPct}%;" title="Approvals in ${escapeHtml(item.period_label)}: ${pub}">
                      <span class="ci-tl-stem-dot"></span>
                      <span class="ci-tl-stem-line"></span>
                    </span>
                  </div>
                  <span class="ci-tl-label">${escapeHtml(item.period_label)}</span>
                </button>
              `;
            }).join('')}
          </div>
        `;

        els.activityChartContainer.querySelectorAll('.ci-tl-col').forEach((btn) => {
          btn.addEventListener('click', () => {
            state.selectedTimelineKey = btn.getAttribute('data-tl-key');
            renderListingActivity(act);
          });
        });
      }
    }

    if (els.activityStatusTableBody) {
      const stats = act.status_breakdown || {};
      const statusDefs = [
        { key: 'published', label: '✓ Published & Available', badge: 'ci-badge-mint' },
        { key: 'pending_review', label: '✺ Pending Municipal Review', badge: 'ci-badge-canary' },
        { key: 'draft', label: 'Draft / Unsubmitted', badge: 'ci-badge-slate' },
        { key: 'archived', label: 'Archived / Declined', badge: 'ci-badge-red' },
      ];

      const total = Object.values(stats).reduce((a, b) => a + Number(b), 0);
      els.activityStatusTableBody.innerHTML = statusDefs.map((def) => {
        const count = Number(stats[def.key] || 0);
        const pct = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0.0%';
        return `
          <tr>
            <td><span class="ci-badge ${def.badge}">${escapeHtml(def.label)}</span></td>
            <td class="ci-table-num">${formatNum(count)}</td>
            <td class="ci-table-num">${pct}</td>
          </tr>
        `;
      }).join('');
    }

    if (els.activityRecentSubmissionsBody) {
      const recent = act.recent_submissions || [];
      if (recent.length === 0) {
        els.activityRecentSubmissionsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #6c6f75; padding: 20px;">No recent submissions in selected scope.</td></tr>`;
      } else {
        els.activityRecentSubmissionsBody.innerHTML = recent.map((p) => {
          const isPub = p.status === 'published' || p.status === 'approved';
          const statusBadge = isPub ? 'ci-badge-mint' : (p.status === 'pending_review' ? 'ci-badge-canary' : 'ci-badge-slate');
          const statusText = isPub ? `✓ ${formatStatusLabel(p.status)}` : (p.status === 'pending_review' ? '✺ Pending' : formatStatusLabel(p.status));
          return `
            <tr>
              <td style="font-size: 12px; color: #6c6f75; white-space: nowrap;">${formatDate(p.created_at)}</td>
              <td><strong>${escapeHtml(p.title)}</strong></td>
              <td>${escapeHtml(p.barangay)}</td>
              <td><span class="ci-badge ${statusBadge}">${escapeHtml(statusText)}</span></td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  /**
   * 5. Render Broker Activity
   */
  function renderBrokerActivity(brk) {
    if (!brk) return;

    if (els.brokerStatusCards) {
      const stats = brk.status_breakdown || {};
      const cards = [
        { label: 'Approved & Active', count: stats.approved || 0, cls: 'is-mint' },
        { label: 'Pending Review', count: stats.pending_review || 0, cls: 'is-canary' },
        { label: 'Under Review', count: stats.under_review || 0, cls: 'is-graphite' },
        { label: 'Action Required', count: stats.requires_correction || 0, cls: 'is-crimson' },
      ];

      els.brokerStatusCards.innerHTML = cards.map((c) => `
        <div class="ci-signal-tile ${c.cls}">
          <span class="ci-signal-label">${escapeHtml(c.label)}</span>
          <div class="ci-signal-val">${formatNum(c.count)}</div>
        </div>
      `).join('');
    }

    if (els.brokerApplicationsTableBody) {
      const apps = brk.recent_applications || [];
      if (apps.length === 0) {
        els.brokerApplicationsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #6c6f75; padding: 20px;">No broker applications in selected scope.</td></tr>`;
      } else {
        els.brokerApplicationsTableBody.innerHTML = apps.map((a) => {
          const isApproved = a.status === 'approved' || a.status === 'verified';
          const badgeClass = isApproved ? 'ci-badge-mint' : (a.status === 'pending_review' ? 'ci-badge-canary' : (a.status === 'rejected' ? 'ci-badge-red' : 'ci-badge-slate'));
          const label = isApproved ? `✓ ${formatStatusLabel(a.status)}` : (a.status === 'pending_review' ? '✺ Pending' : formatStatusLabel(a.status));
          return `
            <tr>
              <td style="font-size: 12px; color: #6c6f75; white-space: nowrap;">${formatDate(a.created_at)}</td>
              <td><strong>${escapeHtml(a.applicant_name)}</strong></td>
              <td>${escapeHtml(a.barangay || 'San Fernando')}</td>
              <td><span class="ci-badge ${badgeClass}">${escapeHtml(label)}</span></td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  /**
   * 6. Render Investor Engagement
   */
  function renderInvestorEngagement(eng, kpi) {
    if (!eng) return;

    if (els.engShortlistsCount) els.engShortlistsCount.textContent = formatNum(kpi.total_shortlists || 0);
    if (els.engInquiriesCount) els.engInquiriesCount.textContent = formatNum(kpi.total_inquiries || 0);
    if (els.engVisitsCount) els.engVisitsCount.textContent = formatNum(kpi.total_site_visits || 0);

    if (els.engTopPropertiesBody) {
      const top = eng.top_shortlisted_properties || [];
      if (top.length === 0) {
        els.engTopPropertiesBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #6c6f75; padding: 20px;">No investor engagement signals recorded yet.</td></tr>`;
      } else {
        els.engTopPropertiesBody.innerHTML = top.map((p) => `
          <tr>
            <td><strong>${escapeHtml(p.title)}</strong></td>
            <td>${escapeHtml(p.barangay)}</td>
            <td class="ci-table-num"><span class="ci-badge ci-badge-canary">${formatNum(p.shortlists_count)}</span></td>
            <td class="ci-table-num"><span class="ci-badge ci-badge-ink">${formatNum(p.inquiries_count)}</span></td>
            <td class="ci-table-num"><span class="ci-badge ci-badge-slate">${formatNum(p.site_visits_count)}</span></td>
          </tr>
        `).join('');
      }
    }
  }

  /**
   * 7. Render Assessment Readiness
   */
  function renderAssessmentReadiness(ass) {
    if (!ass) return;

    const counts = ass.counts || {};
    if (els.assCompleteCount) els.assCompleteCount.textContent = formatNum(counts.complete_verified || 0);
    if (els.assProvisionalCount) els.assProvisionalCount.textContent = formatNum(counts.provisional_model || 0);
    if (els.assIncompleteCount) els.assIncompleteCount.textContent = formatNum(counts.incomplete_criteria || 0);

    if (els.assZoningTableBody) {
      const zoning = ass.clup_zoning || {};
      const zDefs = [
        { key: 'verified_compliant', label: '✓ Verified Compliant', badge: 'ci-badge-mint' },
        { key: 'pending_verification', label: '✺ Pending Verification', badge: 'ci-badge-canary' },
        { key: 'conditional_exception', label: 'Conditional Exception', badge: 'ci-badge-ink' },
        { key: 'zoning_incompatible', label: 'Zoning Incompatible', badge: 'ci-badge-red' },
      ];

      els.assZoningTableBody.innerHTML = zDefs.map((def) => `
        <tr>
          <td><span class="ci-badge ${def.badge}">${escapeHtml(def.label)}</span></td>
          <td class="ci-table-num">${formatNum(zoning[def.key] || 0)}</td>
        </tr>
      `).join('');
    }

    if (els.assHazardTableBody) {
      const hazards = ass.hazard_review_flags || {};
      const hDefs = [
        { key: 'flood_prone', label: 'Flood-Prone Review', badge: 'ci-badge-canary' },
        { key: 'steep_slope', label: 'Steep Slope Check', badge: 'ci-badge-canary' },
        { key: 'fault_proximity', label: 'Fault-Line Proximity', badge: 'ci-badge-red' },
        { key: 'clear', label: '✓ Clear / Low Risk', badge: 'ci-badge-mint' },
      ];

      els.assHazardTableBody.innerHTML = hDefs.map((def) => `
        <tr>
          <td><span class="ci-badge ${def.badge}">${escapeHtml(def.label)}</span></td>
          <td class="ci-table-num">${formatNum(hazards[def.key] || 0)}</td>
        </tr>
      `).join('');
    }

    if (els.assQueueTableBody) {
      const queue = ass.readiness_queue || [];
      if (queue.length === 0) {
        els.assQueueTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #6c6f75; padding: 20px;">No properties in assessment queue.</td></tr>`;
      } else {
        els.assQueueTableBody.innerHTML = queue.map((item) => {
          const mceBadge = item.is_complete ? 'ci-badge-mint' : (item.is_provisional ? 'ci-badge-ink' : 'ci-badge-canary');
          const mceLabel = item.is_complete ? '✓ Complete & Verified' : (item.is_provisional ? 'Provisional Model' : '✺ Incomplete Criteria');
          const iaiScore = item.iai_score !== null ? Number(item.iai_score).toFixed(2) : '—';
          const isApproved = item.status === 'published' || item.status === 'approved';

          return `
            <tr>
              <td><strong>${escapeHtml(item.title)}</strong></td>
              <td>${escapeHtml(item.barangay)}</td>
              <td><span class="ci-badge ${mceBadge}">${escapeHtml(mceLabel)}</span></td>
              <td class="ci-table-num"><strong>${iaiScore}</strong></td>
              <td>${escapeHtml(item.zoning_status || 'Pending')}</td>
              <td>${item.has_hazard_flag ? '<span class="ci-badge ci-badge-canary">Flagged</span>' : '<span class="ci-badge ci-badge-mint">✓ Clear</span>'}</td>
              <td><span class="ci-badge ${isApproved ? 'ci-badge-mint' : 'ci-badge-canary'}">${isApproved ? '✓ ' + escapeHtml(formatStatusLabel(item.status)) : '✺ ' + escapeHtml(formatStatusLabel(item.status))}</span></td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  /**
   * Update Report Scope Modal Indicators
   */
  function updateReportScopeDisplay(meta) {
    if (els.repScopePeriod) {
      els.repScopePeriod.textContent = meta && meta.bounds ? meta.bounds.label : 'All Records';
    }
    if (els.repScopeBarangay) {
      els.repScopeBarangay.textContent = state.filters.barangay === 'all'
        ? `All ${geoContext.totalBarangays || 59} Barangays`
        : state.filters.barangay;
    }
    if (els.repScopeType) {
      const typeLabels = {
        all: 'All Typologies',
        land: 'Land Parcels',
        building: 'Buildings & Built Structures',
        mixed: 'Mixed / Unspecified',
      };
      els.repScopeType.textContent = typeLabels[state.filters.property_type] || 'All Typologies';
    }
  }

  /**
   * Tab Switching & Bento Shortcuts
   */
  function activateTab(tabKey) {
    state.activeTab = tabKey;
    els.tabBtns.forEach((b) => {
      const isActive = b.dataset.tab === tabKey;
      b.classList.toggle('is-active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    els.tabPanes.forEach((pane) => {
      pane.classList.toggle('is-active', pane.id === `pane-${tabKey}`);
    });
  }

  function setupTabs() {
    els.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab) activateTab(btn.dataset.tab);
      });
    });

    if (els.heroViewDetailsBtn) {
      els.heroViewDetailsBtn.addEventListener('click', () => {
        activateTab('inventory');
        const target = document.getElementById('sanFernandoRadarCard') || document.getElementById('geoDistributionCard');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    if (els.heroWatchlistMoreBtn) {
      els.heroWatchlistMoreBtn.addEventListener('click', () => {
        activateTab('inventory');
        const target = document.getElementById('inventoryBreakdownSection');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  /**
   * Filters & Inline Barangay Table Controls
   */
  function setupFilters() {
    if (els.dateRange) {
      els.dateRange.addEventListener('change', () => {
        state.filters.date_range = els.dateRange.value;
        const isCustom = state.filters.date_range === 'custom';
        if (els.customStartGroup) els.customStartGroup.style.display = isCustom ? 'flex' : 'none';
        if (els.customEndGroup) els.customEndGroup.style.display = isCustom ? 'flex' : 'none';
        if (!isCustom) fetchDashboardData();
      });
    }

    if (els.startDate) {
      els.startDate.addEventListener('change', () => {
        state.filters.start_date = els.startDate.value;
        if (state.filters.date_range === 'custom' && state.filters.start_date) fetchDashboardData();
      });
    }

    if (els.endDate) {
      els.endDate.addEventListener('change', () => {
        state.filters.end_date = els.endDate.value;
        if (state.filters.date_range === 'custom' && state.filters.end_date) fetchDashboardData();
      });
    }

    if (els.barangay) {
      els.barangay.addEventListener('change', () => {
        state.filters.barangay = els.barangay.value;
        fetchDashboardData();
      });
    }

    if (els.propertyType) {
      els.propertyType.addEventListener('change', () => {
        state.filters.property_type = els.propertyType.value;
        fetchDashboardData();
      });
    }

    if (els.status) {
      els.status.addEventListener('change', () => {
        state.filters.status = els.status.value;
        fetchDashboardData();
      });
    }

    if (els.resetBtn) {
      els.resetBtn.addEventListener('click', () => {
        state.filters = {
          date_range: 'all',
          start_date: '',
          end_date: '',
          barangay: 'all',
          property_type: 'all',
          status: 'all',
        };
        state.barangaySearchQuery = '';
        if (els.dateRange) els.dateRange.value = 'all';
        if (els.startDate) els.startDate.value = '';
        if (els.endDate) els.endDate.value = '';
        if (els.barangay) els.barangay.value = 'all';
        if (els.propertyType) els.propertyType.value = 'all';
        if (els.status) els.status.value = 'all';
        if (els.invBarangaySearch) els.invBarangaySearch.value = '';
        if (els.customStartGroup) els.customStartGroup.style.display = 'none';
        if (els.customEndGroup) els.customEndGroup.style.display = 'none';
        fetchDashboardData();
      });
    }

    if (els.refreshBtn) {
      els.refreshBtn.addEventListener('click', () => fetchDashboardData());
    }

    if (els.invBarangaySearch) {
      els.invBarangaySearch.addEventListener('input', () => {
        state.barangaySearchQuery = els.invBarangaySearch.value;
        if (state.data && state.data.inventory) renderBarangayTable(state.data.inventory);
      });
    }

    if (els.invBarangayFilterActive) {
      els.invBarangayFilterActive.addEventListener('click', () => {
        state.barangayFilterMode = 'active';
        if (state.data && state.data.inventory) renderBarangayTable(state.data.inventory);
      });
    }

    if (els.invBarangayFilterAll) {
      els.invBarangayFilterAll.addEventListener('click', () => {
        state.barangayFilterMode = 'all';
        if (state.data && state.data.inventory) renderBarangayTable(state.data.inventory);
      });
    }
  }

  /**
   * Report Generator Modal & Print Setup
   */
  function setupReportModal() {
    const openModal = () => {
      if (!els.reportModal) return;
      updateReportScopeDisplay(state.data ? state.data.meta : null);
      els.reportModal.showModal();
    };

    if (els.openReportModalBtn) els.openReportModalBtn.addEventListener('click', openModal);
    if (els.darkReportBtn) els.darkReportBtn.addEventListener('click', openModal);

    if (els.closeReportModalBtn && els.reportModal) {
      els.closeReportModalBtn.addEventListener('click', () => els.reportModal.close());
    }
    if (els.cancelReportModalBtn && els.reportModal) {
      els.cancelReportModalBtn.addEventListener('click', () => els.reportModal.close());
    }

    els.templateCards.forEach((card) => {
      card.addEventListener('click', () => {
        els.templateCards.forEach((c) => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
        state.selectedTemplate = card.dataset.template || 'inventory';
      });
    });

    if (els.triggerPrintBtn) {
      els.triggerPrintBtn.addEventListener('click', () => {
        const includeAppendix = els.repOptAppendix ? els.repOptAppendix.checked : true;
        buildPrintDocument(state.selectedTemplate, state.data, includeAppendix);
        els.reportModal.close();
        setTimeout(() => {
          window.print();
        }, 150);
      });
    }
  }

  /**
   * Print Document Generator (A4 / Letter Print Layout)
   * Preserves mandatory municipal governance disclaimer footer.
   */
  function buildPrintDocument(template, data, includeAppendix) {
    if (!els.printContainer || !data) return;

    const meta = data.meta || {};
    const kpi = data.kpi || {};
    const inv = data.inventory || {};
    const ass = data.assessment_readiness || {};

    const genDate = meta.generated_at ? formatDate(meta.generated_at) : new Date().toLocaleDateString();
    const periodLabel = meta.bounds ? meta.bounds.label : 'All Records';

    const titles = {
      inventory: {
        title: 'City Property Inventory Report',
        target: 'City Assessor’s Office (CAO) & LEBDO',
        desc: 'Comprehensive summary of available properties, mutually exclusive physical typologies, functional land use classifications, tenure distribution, and barangay schedules.',
      },
      activity: {
        title: 'Investment Activity and Engagement Report',
        target: 'LEBDO & City Administration',
        desc: 'Operational summary of property submission velocity, publication milestones, broker accreditation pipeline, and recorded investor engagement signals.',
      },
      assessment: {
        title: 'Property Assessment and Verification Report',
        target: 'CAO, LEBDO, and CICTO Operations',
        desc: 'Technical assessment summary of MCE five-criterion completeness, provisional scoring results, CLUP 2025–2035 zoning compliance, and geotechnical hazard review flags.',
      },
      consolidated: {
        title: 'Consolidated Municipal Investment Dossier',
        target: 'Executive Leadership (CAO, LEBDO, CICTO, City Mayor)',
        desc: 'Integrated municipal intelligence dossier combining property inventory, listing velocity, broker capacity, investor interest, and assessment verification readiness.',
      },
    };

    const config = titles[template] || titles.inventory;

    const mandatoryFooter = `
      <div class="ci-print-footer">
        <span>Generated by LOCUS-SF | For planning and information purposes | Subject to data completeness and verification</span>
        <span>San Fernando City, La Union</span>
      </div>
    `;

    let contentHtml = `
      <section class="ci-print-page">
        <header class="ci-print-letterhead">
          <div>
            <div class="ci-print-brand">LOCUS-SF / CITY INVESTMENT INTELLIGENCE</div>
            <div style="font-size: 10pt; font-weight: 700; color: #9e1b22; margin-top: 2pt;">${escapeHtml(config.title)}</div>
          </div>
          <div class="ci-print-seal">
            City Government of San Fernando, La Union<br>
            <strong>Official Municipal Intelligence Report</strong>
          </div>
        </header>

        <div class="ci-print-meta-grid">
          <div class="ci-print-meta-item"><strong>Target Office</strong>${escapeHtml(config.target)}</div>
          <div class="ci-print-meta-item"><strong>Reporting Period</strong>${escapeHtml(periodLabel)}</div>
          <div class="ci-print-meta-item"><strong>Date Generated</strong>${escapeHtml(genDate)}</div>
          <div class="ci-print-meta-item"><strong>Barangay Scope</strong>${escapeHtml(state.filters.barangay === 'all' ? `All ${geoContext.totalBarangays || 59} Barangays` : state.filters.barangay)}</div>
        </div>

        <p style="font-size: 8.5pt; color: #334155; line-height: 1.5; margin-bottom: 12pt;">${escapeHtml(config.desc)}</p>

        <table class="ci-print-table">
          <thead>
            <tr>
              <th>Metric Indicator</th>
              <th style="text-align: right;">Recorded Value</th>
              <th>Municipal Context &amp; Operational Definition</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Published &amp; Available Properties</strong></td><td style="text-align: right; font-weight: 700;">${formatNum(kpi.properties_published)}</td><td>Verified properties currently visible to investors on market</td></tr>
            <tr><td><strong>Total Recorded Land Footprint</strong></td><td style="text-align: right; font-weight: 700;">${formatNum(kpi.total_land_area_sqm)} sqm</td><td>Total cumulative land area recorded across active parcels</td></tr>
            <tr><td><strong>Total Recorded Built Footprint</strong></td><td style="text-align: right; font-weight: 700;">${formatNum(kpi.total_building_area_sqm)} sqm</td><td>Total cumulative building floor space recorded across built listings</td></tr>
            <tr><td><strong>Submissions in Reporting Period</strong></td><td style="text-align: right; font-weight: 700;">${formatNum(kpi.submissions_in_period)}</td><td>New properties submitted for review during selected period</td></tr>
            <tr><td><strong>Listing Reviews Pending</strong></td><td style="text-align: right; font-weight: 700;">${formatNum(kpi.properties_pending)}</td><td>Listings awaiting CAO / CICTO document and ground verification</td></tr>
            <tr><td><strong>Broker Applications</strong></td><td style="text-align: right; font-weight: 700;">${formatNum(kpi.broker_applications_in_period)}</td><td>PRC broker applications received during reporting period</td></tr>
            <tr><td><strong>Complete MCE Assessments</strong></td><td style="text-align: right; font-weight: 700;">${formatNum(ass.counts ? ass.counts.complete_verified : 0)}</td><td>Properties with verified five-criterion MCE and ground check</td></tr>
          </tbody>
        </table>

        ${renderPrintTemplateBody(template, data)}
        ${mandatoryFooter}
      </section>
    `;

    if (includeAppendix && (template === 'inventory' || template === 'consolidated')) {
      contentHtml += `
        <section class="ci-print-page">
          <header class="ci-print-letterhead">
            <div>
              <div class="ci-print-brand">LOCUS-SF / APPENDIX</div>
              <div style="font-size: 10pt; font-weight: 700; color: #111215; margin-top: 2pt;">Municipal Barangay Inventory Schedule</div>
            </div>
            <div class="ci-print-seal">
              San Fernando City, La Union<br>
              <strong>Data as of ${escapeHtml(genDate)}</strong>
            </div>
          </header>

          <table class="ci-print-table">
            <thead>
              <tr>
                <th>Barangay Name</th>
                <th style="text-align: right;">Total Records</th>
                <th style="text-align: right;">Published</th>
                <th style="text-align: right;">Pending</th>
                <th style="text-align: right;">Land Footprint</th>
                <th style="text-align: right;">Avg Price / sqm</th>
              </tr>
            </thead>
            <tbody>
              ${(inv.barangays || []).map((bg) => `
                <tr>
                  <td><strong>${escapeHtml(bg.barangay)}</strong></td>
                  <td style="text-align: right;">${formatNum(bg.total_recorded)}</td>
                  <td style="text-align: right;">${formatNum(bg.published_available)}</td>
                  <td style="text-align: right;">${formatNum(bg.pending_review)}</td>
                  <td style="text-align: right;">${bg.total_land_area_sqm > 0 ? formatNum(bg.total_land_area_sqm) + ' sqm' : '—'}</td>
                  <td style="text-align: right;">${bg.avg_price_sqm !== null ? formatCurrency(bg.avg_price_sqm) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="font-size: 7.5pt; color: #64748b; line-height: 1.4; margin-top: 10pt;">
            <strong>Methodology Note:</strong> Primary typologies (Land vs Built) are mutually exclusive to prevent double-counting. Average price/sqm is derived solely from records with published asking prices and valid parcel area.
          </div>

          ${mandatoryFooter}
        </section>
      `;
    }

    els.printContainer.innerHTML = contentHtml;
  }

  function renderPrintTemplateBody(template, data) {
    const inv = data.inventory || {};
    const act = data.listing_activity || {};
    const brk = data.broker_activity || {};
    const ass = data.assessment_readiness || {};

    if (template === 'inventory' || template === 'consolidated') {
      return `
        <h3 style="font-size: 9.5pt; font-weight: 700; color: #111215; margin: 14pt 0 6pt;">Property Typologies &amp; Land Use Classifications</h3>
        <table class="ci-print-table">
          <thead>
            <tr><th>Dimension</th><th>Category</th><th style="text-align: right;">Count</th><th>Counting Rule &amp; Description</th></tr>
          </thead>
          <tbody>
            <tr><td rowspan="3" style="font-weight: 700; vertical-align: top;">Primary Physical Typology</td><td>Land Parcels</td><td style="text-align: right; font-weight: 700;">${formatNum(inv.primary_types ? inv.primary_types.land : 0)}</td><td>Mutually exclusive (Bare lots, development land)</td></tr>
            <tr><td>Buildings &amp; Built Structures</td><td style="text-align: right; font-weight: 700;">${formatNum(inv.primary_types ? inv.primary_types.building : 0)}</td><td>Mutually exclusive (Offices, commercial buildings)</td></tr>
            <tr><td>Mixed / Unspecified</td><td style="text-align: right; font-weight: 700;">${formatNum(inv.primary_types ? inv.primary_types.mixed : 0)}</td><td>Mutually exclusive (Mixed use parcels)</td></tr>
            <tr><td rowspan="3" style="font-weight: 700; vertical-align: top;">Functional Classifications</td><td>Commercial Designation</td><td style="text-align: right; font-weight: 700;">${formatNum(inv.classifications ? inv.classifications.commercial : 0)}</td><td>Non-additive (Overlapping land use tag)</td></tr>
            <tr><td>Industrial Designation</td><td style="text-align: right; font-weight: 700;">${formatNum(inv.classifications ? inv.classifications.industrial : 0)}</td><td>Non-additive (Warehousing &amp; logistics)</td></tr>
            <tr><td>Residential Designation</td><td style="text-align: right; font-weight: 700;">${formatNum(inv.classifications ? inv.classifications.residential : 0)}</td><td>Non-additive (Mixed-residential opportunities)</td></tr>
          </tbody>
        </table>
      `;
    }

    if (template === 'activity') {
      return `
        <h3 style="font-size: 9.5pt; font-weight: 700; color: #111215; margin: 14pt 0 6pt;">Listing Pipeline Velocity &amp; Broker Reviews</h3>
        <table class="ci-print-table">
          <thead>
            <tr><th>Pipeline Area</th><th>Status State</th><th style="text-align: right;">Count</th><th>Operational Notes</th></tr>
          </thead>
          <tbody>
            <tr><td rowspan="3" style="font-weight: 700; vertical-align: top;">Property Listings</td><td>Published &amp; Active</td><td style="text-align: right; font-weight: 700;">${formatNum(act.status_breakdown ? act.status_breakdown.published : 0)}</td><td>Approved through municipal review</td></tr>
            <tr><td>Pending Municipal Review</td><td style="text-align: right; font-weight: 700;">${formatNum(act.status_breakdown ? act.status_breakdown.pending_review : 0)}</td><td>Awaiting review in administrative queue</td></tr>
            <tr><td>Draft / Inactive</td><td style="text-align: right; font-weight: 700;">${formatNum(act.status_breakdown ? act.status_breakdown.draft : 0)}</td><td>Not yet submitted by broker/seller</td></tr>
            <tr><td rowspan="2" style="font-weight: 700; vertical-align: top;">Broker Applications</td><td>Approved &amp; Verified</td><td style="text-align: right; font-weight: 700;">${formatNum(brk.status_breakdown ? brk.status_breakdown.approved : 0)}</td><td>PRC credentials confirmed</td></tr>
            <tr><td>Pending Credential Review</td><td style="text-align: right; font-weight: 700;">${formatNum(brk.status_breakdown ? brk.status_breakdown.pending_review : 0)}</td><td>Awaiting CICTO / Admin verification</td></tr>
          </tbody>
        </table>
      `;
    }

    if (template === 'assessment') {
      return `
        <h3 style="font-size: 9.5pt; font-weight: 700; color: #111215; margin: 14pt 0 6pt;">MCE Assessment Readiness &amp; Zoning Verification</h3>
        <table class="ci-print-table">
          <thead>
            <tr><th>Evaluation Domain</th><th>Verification Category</th><th style="text-align: right;">Records</th><th>Governance Significance</th></tr>
          </thead>
          <tbody>
            <tr><td rowspan="3" style="font-weight: 700; vertical-align: top;">Five-Criterion MCE</td><td>Complete &amp; Ground-Verified</td><td style="text-align: right; font-weight: 700;">${formatNum(ass.counts ? ass.counts.complete_verified : 0)}</td><td>All 5 criteria confirmed with ground check</td></tr>
            <tr><td>Provisional Model Evaluation</td><td style="text-align: right; font-weight: 700;">${formatNum(ass.counts ? ass.counts.provisional_model : 0)}</td><td>Algorithmic score pending official ground audit</td></tr>
            <tr><td>Incomplete Evidence Criteria</td><td style="text-align: right; font-weight: 700;">${formatNum(ass.counts ? ass.counts.incomplete_criteria : 0)}</td><td>Missing road, utility, or zonal valuations</td></tr>
            <tr><td rowspan="2" style="font-weight: 700; vertical-align: top;">CLUP 2025–2035 Zoning</td><td>Verified Compliant</td><td style="text-align: right; font-weight: 700;">${formatNum(ass.clup_zoning ? ass.clup_zoning.verified_compliant : 0)}</td><td>Permitted use under San Fernando CLUP</td></tr>
            <tr><td>Pending Zoning Verification</td><td style="text-align: right; font-weight: 700;">${formatNum(ass.clup_zoning ? ass.clup_zoning.pending_verification : 0)}</td><td>Awaiting CPDO / Zoning administrator check</td></tr>
          </tbody>
        </table>
      `;
    }

    return '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupFilters();
    setupReportModal();
    fetchDashboardData();
  });
})();
