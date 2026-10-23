/**
 * LOCUS-SF City Investment Intelligence & Reporting
 * Client-Side Controller
 * Executive municipal reporting workspace for CAO, LEBDO, and CICTO
 */
(function () {
  'use strict';

  // Configuration and App Context
  const appConfig = window.SFC_APP_CONFIG || {};
  const basePath = appConfig.basePath || '';
  const apiBase = appConfig.apiBase || (basePath + '/api');

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
  };

  // Helper: Format Number with commas
  function formatNum(val) {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return Number(val).toLocaleString('en-US');
  }

  // Helper: Format Area (sqm)
  function formatArea(val) {
    if (!val || isNaN(val)) return '0 sqm';
    return Number(val).toLocaleString('en-US') + ' sqm';
  }

  // Helper: Format Currency (PHP)
  function formatCurrency(val) {
    if (!val || isNaN(val)) return '—';
    return '₱' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // Helper: Safe HTML escape
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Format Date string (YYYY-MM-DD or ISO)
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

  // DOM Elements Cache
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

    // Tab badges
    tabBadgeInventory: document.getElementById('tabBadgeInventory'),
    tabBadgeActivity: document.getElementById('tabBadgeActivity'),
    tabBadgeBrokers: document.getElementById('tabBadgeBrokers'),
    tabBadgeEngagement: document.getElementById('tabBadgeEngagement'),
    tabBadgeAssessment: document.getElementById('tabBadgeAssessment'),

    // Tab 1 Elements
    invPrimaryTrack: document.getElementById('invPrimaryTrack'),
    invLandCount: document.getElementById('invLandCount'),
    invBuildingCount: document.getElementById('invBuildingCount'),
    invMixedCount: document.getElementById('invMixedCount'),
    invClassTableBody: document.getElementById('invClassTableBody'),
    invTenureDistribution: document.getElementById('invTenureDistribution'),
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

    // Print Container
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
        headers: { 'Accept': 'application/json' },
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
    renderInventory(data.inventory, data.kpi);
    renderListingActivity(data.listing_activity);
    renderBrokerActivity(data.broker_activity);
    renderInvestorEngagement(data.investor_engagement, data.kpi);
    renderAssessmentReadiness(data.assessment_readiness);
    updateReportScopeDisplay(data.meta);
  }

  /**
   * 1. Render Top KPIs and Badges
   */
  function renderKpis(kpi, assessment, broker, meta) {
    if (els.kpiAvailable) els.kpiAvailable.textContent = formatNum(kpi.properties_published);
    if (els.kpiArea) {
      els.kpiArea.innerHTML = `${formatNum(kpi.total_land_area_sqm)} <small style="font-size: 13px; font-weight: 600;">sqm</small>`;
    }
    if (els.kpiAreaSub) {
      els.kpiAreaSub.textContent = `${formatNum(kpi.total_building_area_sqm)} sqm built floor area`;
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

    // Tab badges
    if (els.tabBadgeInventory) els.tabBadgeInventory.textContent = formatNum(kpi.properties_total);
    if (els.tabBadgeActivity) els.tabBadgeActivity.textContent = formatNum(kpi.submissions_in_period);
    if (els.tabBadgeBrokers) els.tabBadgeBrokers.textContent = formatNum(kpi.broker_applications_in_period);
    if (els.tabBadgeEngagement) els.tabBadgeEngagement.textContent = formatNum((kpi.total_shortlists || 0) + (kpi.total_inquiries || 0));
    if (els.tabBadgeAssessment && assessment && assessment.counts) {
      els.tabBadgeAssessment.textContent = formatNum(assessment.counts.complete_verified || 0);
    }

    // Active period badge
    if (els.activePeriodBadge && meta && meta.bounds) {
      els.activePeriodBadge.textContent = meta.bounds.label || 'All Records';
    }
  }

  /**
   * 2. Render Property Inventory
   */
  function renderInventory(inv, kpi) {
    if (!inv) return;

    // Mutually exclusive primary types
    const total = Number(kpi.properties_total) || 0;
    const landCount = Number(inv.primary_types.land || 0);
    const buildingCount = Number(inv.primary_types.building || 0);
    const mixedCount = Number(inv.primary_types.mixed || 0);

    const landPct = total > 0 ? ((landCount / total) * 100).toFixed(1) : 0;
    const bldgPct = total > 0 ? ((buildingCount / total) * 100).toFixed(1) : 0;
    const mixedPct = total > 0 ? (Math.max(0, 100 - landPct - bldgPct)).toFixed(1) : 0;

    if (els.invPrimaryTrack) {
      els.invPrimaryTrack.innerHTML = `
        <div class="ci-distribution-segment ci-seg-land" style="width: ${landPct}%;" title="Land Parcels: ${landCount} (${landPct}%)">
          ${landPct > 8 ? `Land ${landPct}%` : ''}
        </div>
        <div class="ci-distribution-segment ci-seg-building" style="width: ${bldgPct}%;" title="Buildings: ${buildingCount} (${bldgPct}%)">
          ${bldgPct > 8 ? `Built ${bldgPct}%` : ''}
        </div>
        <div class="ci-distribution-segment ci-seg-mixed" style="width: ${mixedPct}%;" title="Mixed / Unspecified: ${mixedCount} (${mixedPct}%)">
          ${mixedPct > 8 ? `Mixed ${mixedPct}%` : ''}
        </div>
      `;
    }

    if (els.invLandCount) els.invLandCount.textContent = `${formatNum(landCount)} (${landPct}%)`;
    if (els.invBuildingCount) els.invBuildingCount.textContent = `${formatNum(buildingCount)} (${bldgPct}%)`;
    if (els.invMixedCount) els.invMixedCount.textContent = `${formatNum(mixedCount)} (${mixedPct}%)`;

    // Functional Classifications Table
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
        const share = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0%';
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

    // Tenure models
    if (els.invTenureDistribution) {
      const ten = inv.tenure || {};
      const tenureLabels = {
        sale: { label: 'For Sale', color: 'ci-badge-green' },
        lease: { label: 'For Lease', color: 'ci-badge-blue' },
        joint_venture: { label: 'Joint Venture', color: 'ci-badge-amber' },
        build_to_suit: { label: 'Build-to-Suit', color: 'ci-badge-slate' },
      };

      let pills = '';
      for (const [key, def] of Object.entries(tenureLabels)) {
        const count = Number(ten[key] || 0);
        pills += `
          <div class="ci-badge ${def.color}" style="font-size: 12px; padding: 5px 10px;">
            <span>${escapeHtml(def.label)}:</span>
            <strong>${formatNum(count)}</strong>
          </div>
        `;
      }
      els.invTenureDistribution.innerHTML = pills;
    }

    // 30-Barangay Municipal Geographic Distribution Table
    if (els.invBarangayTableBody) {
      const bgList = inv.barangays || [];
      if (bgList.length === 0) {
        els.invBarangayTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 24px;">No property records match the selected filter criteria.</td></tr>`;
      } else {
        let html = '';
        bgList.forEach((bg) => {
          const totalRec = Number(bg.total_recorded || 0);
          const avail = Number(bg.published_available || 0);
          const pending = Number(bg.pending_review || 0);
          const area = Number(bg.total_land_area_sqm || 0);
          const avgPrice = bg.avg_price_sqm !== null ? formatCurrency(bg.avg_price_sqm) : '—';

          html += `
            <tr ${totalRec > 0 ? 'style="background: #fafbfd;"' : ''}>
              <td><strong>${escapeHtml(bg.barangay)}</strong></td>
              <td class="ci-table-num">${formatNum(totalRec)}</td>
              <td class="ci-table-num">${avail > 0 ? `<span class="ci-badge ci-badge-green">${formatNum(avail)}</span>` : '0'}</td>
              <td class="ci-table-num">${pending > 0 ? `<span class="ci-badge ci-badge-amber">${formatNum(pending)}</span>` : '0'}</td>
              <td class="ci-table-num">${area > 0 ? formatArea(area) : '—'}</td>
              <td class="ci-table-num">${avgPrice}</td>
            </tr>
          `;
        });
        els.invBarangayTableBody.innerHTML = html;
      }
    }
  }

  /**
   * 3. Render Listing & Review Trends (SVG Dual-Bar Timeline Chart)
   */
  function renderListingActivity(act) {
    if (!act) return;

    // Timeline Chart
    if (els.activityChartContainer) {
      const timeline = act.timeline || [];
      if (timeline.length === 0) {
        els.activityChartContainer.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 180px; color: #64748b; font-size: 13px;">
            No historical submission or publication records recorded within this time window.
          </div>
        `;
      } else {
        const width = 800;
        const height = 180;
        const padding = { top: 20, right: 30, bottom: 40, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const maxVal = Math.max(
          1,
          ...timeline.map((d) => Math.max(Number(d.submissions || 0), Number(d.publications || 0)))
        );

        const groupWidth = chartWidth / timeline.length;
        const barWidth = Math.max(4, Math.min(22, (groupWidth - 10) / 2));

        let barsSvg = '';
        let xLabelsSvg = '';

        timeline.forEach((item, i) => {
          const xCenter = padding.left + i * groupWidth + groupWidth / 2;
          const subCount = Number(item.submissions || 0);
          const pubCount = Number(item.publications || 0);

          const subHeight = (subCount / maxVal) * chartHeight;
          const pubHeight = (pubCount / maxVal) * chartHeight;

          const subY = padding.top + chartHeight - subHeight;
          const pubY = padding.top + chartHeight - pubHeight;

          const subX = xCenter - barWidth - 1;
          const pubX = xCenter + 1;

          barsSvg += `
            <g class="ci-chart-bar-group">
              <!-- Submissions Bar (Blue) -->
              <rect x="${subX}" y="${subY}" width="${barWidth}" height="${subHeight}" rx="3" fill="#2563eb" opacity="0.9">
                <title>Submissions in ${escapeHtml(item.period_label)}: ${subCount}</title>
              </rect>
              <!-- Publications Bar (Green) -->
              <rect x="${pubX}" y="${pubY}" width="${barWidth}" height="${pubHeight}" rx="3" fill="#059669" opacity="0.9">
                <title>Publications in ${escapeHtml(item.period_label)}: ${pubCount}</title>
              </rect>
            </g>
          `;

          // X-Axis labels
          xLabelsSvg += `
            <text x="${xCenter}" y="${height - 12}" text-anchor="middle" font-size="10" fill="#64748b" font-family="ui-monospace, monospace">
              ${escapeHtml(item.period_label)}
            </text>
          `;
        });

        // Grid lines
        let gridSvg = `
          <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="#e2e8f0" stroke-width="1.5" />
          <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3,3" />
        `;

        els.activityChartContainer.innerHTML = `
          <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; max-height: 240px; overflow: visible;">
            ${gridSvg}
            ${barsSvg}
            ${xLabelsSvg}
          </svg>
        `;
      }
    }

    // Status Breakdown Table
    if (els.activityStatusTableBody) {
      const stats = act.status_breakdown || {};
      const statusDefs = [
        { key: 'published', label: 'Published & Available', badge: 'ci-badge-green' },
        { key: 'pending_review', label: 'Pending Municipal Review', badge: 'ci-badge-amber' },
        { key: 'draft', label: 'Draft / Unsubmitted', badge: 'ci-badge-slate' },
        { key: 'archived', label: 'Archived / Declined', badge: 'ci-badge-red' },
      ];

      const total = Object.values(stats).reduce((a, b) => a + Number(b), 0);
      let html = '';
      statusDefs.forEach((def) => {
        const count = Number(stats[def.key] || 0);
        const pct = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0%';
        html += `
          <tr>
            <td><span class="ci-badge ${def.badge}">${escapeHtml(def.label)}</span></td>
            <td class="ci-table-num">${formatNum(count)}</td>
            <td class="ci-table-num">${pct}</td>
          </tr>
        `;
      });
      els.activityStatusTableBody.innerHTML = html;
    }

    // Recent Submissions Queue
    if (els.activityRecentSubmissionsBody) {
      const recent = act.recent_submissions || [];
      if (recent.length === 0) {
        els.activityRecentSubmissionsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 18px;">No recent submissions in selected scope.</td></tr>`;
      } else {
        let html = '';
        recent.forEach((p) => {
          const statusBadge = p.status === 'published' ? 'ci-badge-green' : (p.status === 'pending_review' ? 'ci-badge-amber' : 'ci-badge-slate');
          html += `
            <tr>
              <td style="font-family: ui-monospace, monospace; font-size: 11px; color: #64748b;">${formatDate(p.created_at)}</td>
              <td><strong>${escapeHtml(p.title)}</strong></td>
              <td>${escapeHtml(p.barangay)}</td>
              <td><span class="ci-badge ${statusBadge}">${escapeHtml(p.status)}</span></td>
            </tr>
          `;
        });
        els.activityRecentSubmissionsBody.innerHTML = html;
      }
    }
  }

  /**
   * 4. Render Broker Activity
   */
  function renderBrokerActivity(brk) {
    if (!brk) return;

    // Status Cards
    if (els.brokerStatusCards) {
      const stats = brk.status_breakdown || {};
      const cards = [
        { label: 'Approved & Active', count: stats.approved || 0, bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' },
        { label: 'Pending Review', count: stats.pending_review || 0, bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
        { label: 'Under Review', count: stats.under_review || 0, bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
        { label: 'Action Required', count: stats.requires_correction || 0, bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' },
      ];

      let html = '';
      cards.forEach((c) => {
        html += `
          <div style="padding: 14px; background: ${c.bg}; border: 1px solid ${c.border}; border-radius: 10px;">
            <div style="font-size: 22px; font-weight: 800; color: ${c.text};">${formatNum(c.count)}</div>
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${c.text}; font-family: ui-monospace, monospace; margin-top: 4px;">${escapeHtml(c.label)}</div>
          </div>
        `;
      });
      els.brokerStatusCards.innerHTML = html;
    }

    // Applications Queue
    if (els.brokerApplicationsTableBody) {
      const apps = brk.recent_applications || [];
      if (apps.length === 0) {
        els.brokerApplicationsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 18px;">No broker applications in selected scope.</td></tr>`;
      } else {
        let html = '';
        apps.forEach((a) => {
          const badgeClass = a.status === 'approved' ? 'ci-badge-green' : (a.status === 'pending_review' ? 'ci-badge-amber' : 'ci-badge-slate');
          html += `
            <tr>
              <td style="font-family: ui-monospace, monospace; font-size: 11px; color: #64748b;">${formatDate(a.created_at)}</td>
              <td><strong>${escapeHtml(a.applicant_name)}</strong></td>
              <td>${escapeHtml(a.barangay || 'San Fernando')}</td>
              <td><span class="ci-badge ${badgeClass}">${escapeHtml(a.status)}</span></td>
            </tr>
          `;
        });
        els.brokerApplicationsTableBody.innerHTML = html;
      }
    }
  }

  /**
   * 5. Render Investor Engagement
   */
  function renderInvestorEngagement(eng, kpi) {
    if (!eng) return;

    if (els.engShortlistsCount) els.engShortlistsCount.textContent = formatNum(kpi.total_shortlists || 0);
    if (els.engInquiriesCount) els.engInquiriesCount.textContent = formatNum(kpi.total_inquiries || 0);
    if (els.engVisitsCount) els.engVisitsCount.textContent = formatNum(kpi.total_site_visits || 0);

    // Top Properties Table
    if (els.engTopPropertiesBody) {
      const top = eng.top_shortlisted_properties || [];
      if (top.length === 0) {
        els.engTopPropertiesBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 18px;">No investor engagement signals recorded yet.</td></tr>`;
      } else {
        let html = '';
        top.forEach((p) => {
          html += `
            <tr>
              <td><strong>${escapeHtml(p.title)}</strong></td>
              <td>${escapeHtml(p.barangay)}</td>
              <td class="ci-table-num"><span class="ci-badge ci-badge-amber">${formatNum(p.shortlists_count)}</span></td>
              <td class="ci-table-num"><span class="ci-badge ci-badge-blue">${formatNum(p.inquiries_count)}</span></td>
              <td class="ci-table-num"><span class="ci-badge ci-badge-slate">${formatNum(p.site_visits_count)}</span></td>
            </tr>
          `;
        });
        els.engTopPropertiesBody.innerHTML = html;
      }
    }
  }

  /**
   * 6. Render Assessment Readiness
   */
  function renderAssessmentReadiness(ass) {
    if (!ass) return;

    const counts = ass.counts || {};
    if (els.assCompleteCount) els.assCompleteCount.textContent = formatNum(counts.complete_verified || 0);
    if (els.assProvisionalCount) els.assProvisionalCount.textContent = formatNum(counts.provisional_model || 0);
    if (els.assIncompleteCount) els.assIncompleteCount.textContent = formatNum(counts.incomplete_criteria || 0);

    // CLUP Zoning Table
    if (els.assZoningTableBody) {
      const zoning = ass.clup_zoning || {};
      const zDefs = [
        { key: 'verified_compliant', label: 'Verified Compliant', badge: 'ci-badge-green' },
        { key: 'pending_verification', label: 'Pending Verification', badge: 'ci-badge-amber' },
        { key: 'conditional_exception', label: 'Conditional Exception', badge: 'ci-badge-blue' },
        { key: 'zoning_incompatible', label: 'Zoning Incompatible', badge: 'ci-badge-red' },
      ];

      let html = '';
      zDefs.forEach((def) => {
        const count = Number(zoning[def.key] || 0);
        html += `
          <tr>
            <td><span class="ci-badge ${def.badge}">${escapeHtml(def.label)}</span></td>
            <td class="ci-table-num">${formatNum(count)}</td>
          </tr>
        `;
      });
      els.assZoningTableBody.innerHTML = html;
    }

    // Hazard Table
    if (els.assHazardTableBody) {
      const hazards = ass.hazard_review_flags || {};
      const hDefs = [
        { key: 'flood_prone', label: 'Flood-Prone Review Required', badge: 'ci-badge-amber' },
        { key: 'steep_slope', label: 'Steep Slope / Landslide Check', badge: 'ci-badge-amber' },
        { key: 'fault_proximity', label: 'Fault-Line Proximity Review', badge: 'ci-badge-red' },
        { key: 'clear', label: 'Clear / Low Risk Confirmed', badge: 'ci-badge-green' },
      ];

      let html = '';
      hDefs.forEach((def) => {
        const count = Number(hazards[def.key] || 0);
        html += `
          <tr>
            <td><span class="ci-badge ${def.badge}">${escapeHtml(def.label)}</span></td>
            <td class="ci-table-num">${formatNum(count)}</td>
          </tr>
        `;
      });
      els.assHazardTableBody.innerHTML = html;
    }

    // Queue Table
    if (els.assQueueTableBody) {
      const queue = ass.readiness_queue || [];
      if (queue.length === 0) {
        els.assQueueTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 18px;">No properties in assessment queue.</td></tr>`;
      } else {
        let html = '';
        queue.forEach((item) => {
          const mceBadge = item.is_complete ? 'ci-badge-green' : (item.is_provisional ? 'ci-badge-blue' : 'ci-badge-amber');
          const mceLabel = item.is_complete ? 'Complete & Verified' : (item.is_provisional ? 'Provisional Model' : 'Incomplete Criteria');
          const iaiScore = item.iai_score !== null ? Number(item.iai_score).toFixed(2) : '—';

          html += `
            <tr>
              <td><strong>${escapeHtml(item.title)}</strong></td>
              <td>${escapeHtml(item.barangay)}</td>
              <td><span class="ci-badge ${mceBadge}">${escapeHtml(mceLabel)}</span></td>
              <td class="ci-table-num"><strong>${iaiScore}</strong></td>
              <td>${escapeHtml(item.zoning_status || 'Pending')}</td>
              <td>${item.has_hazard_flag ? '<span class="ci-badge ci-badge-amber">Flagged</span>' : '<span class="ci-badge ci-badge-green">Clear</span>'}</td>
              <td><span class="ci-badge ${item.status === 'published' ? 'ci-badge-green' : 'ci-badge-amber'}">${escapeHtml(item.status)}</span></td>
            </tr>
          `;
        });
        els.assQueueTableBody.innerHTML = html;
      }
    }
  }

  /**
   * Update Report Scope modal indicators
   */
  function updateReportScopeDisplay(meta) {
    if (els.repScopePeriod) {
      els.repScopePeriod.textContent = meta && meta.bounds ? meta.bounds.label : 'All Records';
    }
    if (els.repScopeBarangay) {
      els.repScopeBarangay.textContent = state.filters.barangay === 'all' ? 'All 30 Barangays' : state.filters.barangay;
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
   * Tab Switching Handler
   */
  function setupTabs() {
    els.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabKey = btn.dataset.tab;
        if (!tabKey) return;

        state.activeTab = tabKey;

        els.tabBtns.forEach((b) => {
          const isActive = b === btn;
          b.classList.toggle('is-active', isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        els.tabPanes.forEach((pane) => {
          const isActive = pane.id === `pane-${tabKey}`;
          pane.classList.toggle('is-active', isActive);
        });
      });
    });
  }

  /**
   * Filter Interactivity
   */
  function setupFilters() {
    if (els.dateRange) {
      els.dateRange.addEventListener('change', () => {
        state.filters.date_range = els.dateRange.value;
        const isCustom = state.filters.date_range === 'custom';
        if (els.customStartGroup) els.customStartGroup.style.display = isCustom ? 'flex' : 'none';
        if (els.customEndGroup) els.customEndGroup.style.display = isCustom ? 'flex' : 'none';

        if (!isCustom) {
          fetchDashboardData();
        }
      });
    }

    if (els.startDate) {
      els.startDate.addEventListener('change', () => {
        state.filters.start_date = els.startDate.value;
        if (state.filters.date_range === 'custom' && state.filters.start_date) {
          fetchDashboardData();
        }
      });
    }

    if (els.endDate) {
      els.endDate.addEventListener('change', () => {
        state.filters.end_date = els.endDate.value;
        if (state.filters.date_range === 'custom' && state.filters.end_date) {
          fetchDashboardData();
        }
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

        if (els.dateRange) els.dateRange.value = 'all';
        if (els.startDate) els.startDate.value = '';
        if (els.endDate) els.endDate.value = '';
        if (els.barangay) els.barangay.value = 'all';
        if (els.propertyType) els.propertyType.value = 'all';
        if (els.status) els.status.value = 'all';
        if (els.customStartGroup) els.customStartGroup.style.display = 'none';
        if (els.customEndGroup) els.customEndGroup.style.display = 'none';

        fetchDashboardData();
      });
    }

    if (els.refreshBtn) {
      els.refreshBtn.addEventListener('click', () => {
        fetchDashboardData();
      });
    }
  }

  /**
   * Report Generator Modal & Print Setup
   */
  function setupReportModal() {
    if (els.openReportModalBtn && els.reportModal) {
      els.openReportModalBtn.addEventListener('click', () => {
        updateReportScopeDisplay(state.data ? state.data.meta : null);
        els.reportModal.showModal();
      });
    }

    if (els.closeReportModalBtn && els.reportModal) {
      els.closeReportModalBtn.addEventListener('click', () => {
        els.reportModal.close();
      });
    }

    if (els.cancelReportModalBtn && els.reportModal) {
      els.cancelReportModalBtn.addEventListener('click', () => {
        els.reportModal.close();
      });
    }

    // Template selection
    els.templateCards.forEach((card) => {
      card.addEventListener('click', () => {
        els.templateCards.forEach((c) => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
        state.selectedTemplate = card.dataset.template || 'inventory';
      });
    });

    // Print / PDF Trigger
    if (els.triggerPrintBtn) {
      els.triggerPrintBtn.addEventListener('click', () => {
        const includeAppendix = els.repOptAppendix ? els.repOptAppendix.checked : true;
        buildPrintDocument(state.selectedTemplate, state.data, includeAppendix);
        els.reportModal.close();
        // Give browser slight breathing room to render print DOM before opening print dialog
        setTimeout(() => {
          window.print();
        }, 150);
      });
    }
  }

  /**
   * Print Document Generator (A4 / Letter Print Layout)
   * Formats clean, executive-grade printable pages with the mandatory disclaimer footer.
   */
  function buildPrintDocument(template, data, includeAppendix) {
    if (!els.printContainer || !data) return;

    const meta = data.meta || {};
    const kpi = data.kpi || {};
    const inv = data.inventory || {};
    const act = data.listing_activity || {};
    const brk = data.broker_activity || {};
    const eng = data.investor_engagement || {};
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

    let contentHtml = '';

    // Page 1: Executive Overview & Summary
    contentHtml += `
      <section class="ci-print-page">
        <header class="ci-print-letterhead">
          <div>
            <div class="ci-print-brand">LOCUS-SF / CITY INVESTMENT INTELLIGENCE</div>
            <div style="font-size: 10pt; font-weight: 700; color: #8b151b; margin-top: 2pt;">${escapeHtml(config.title)}</div>
          </div>
          <div class="ci-print-seal">
            City Government of San Fernando, La Union<br>
            <strong>Official Municipal Intelligence Report</strong>
          </div>
        </header>

        <div class="ci-print-meta-grid">
          <div class="ci-print-meta-item">
            <strong>Target Office</strong>
            ${escapeHtml(config.target)}
          </div>
          <div class="ci-print-meta-item">
            <strong>Reporting Period</strong>
            ${escapeHtml(periodLabel)}
          </div>
          <div class="ci-print-meta-item">
            <strong>Date Generated</strong>
            ${escapeHtml(genDate)}
          </div>
          <div class="ci-print-meta-item">
            <strong>Barangay Scope</strong>
            ${escapeHtml(state.filters.barangay === 'all' ? 'All 30 Barangays' : state.filters.barangay)}
          </div>
        </div>

        <p style="font-size: 8.5pt; color: #334155; line-height: 1.5; margin-bottom: 12pt;">
          ${escapeHtml(config.desc)}
        </p>

        <!-- Executive KPI Table -->
        <table class="ci-print-table">
          <thead>
            <tr>
              <th>Metric Indicator</th>
              <th style="text-align: right;">Recorded Value</th>
              <th>Municipal Context &amp; Operational Definition</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Published &amp; Available Properties</strong></td>
              <td style="text-align: right; font-weight: 700;">${formatNum(kpi.properties_published)}</td>
              <td>Verified properties currently visible to investors on market</td>
            </tr>
            <tr>
              <td><strong>Total Recorded Land Footprint</strong></td>
              <td style="text-align: right; font-weight: 700;">${formatNum(kpi.total_land_area_sqm)} sqm</td>
              <td>Total cumulative land area recorded across active parcels</td>
            </tr>
            <tr>
              <td><strong>Total Recorded Built Footprint</strong></td>
              <td style="text-align: right; font-weight: 700;">${formatNum(kpi.total_building_area_sqm)} sqm</td>
              <td>Total cumulative building floor space recorded across built listings</td>
            </tr>
            <tr>
              <td><strong>Submissions in Reporting Period</strong></td>
              <td style="text-align: right; font-weight: 700;">${formatNum(kpi.submissions_in_period)}</td>
              <td>New properties submitted for review during selected period</td>
            </tr>
            <tr>
              <td><strong>Listing Reviews Pending</strong></td>
              <td style="text-align: right; font-weight: 700;">${formatNum(kpi.properties_pending)}</td>
              <td>Listings awaiting CAO / CICTO document and ground verification</td>
            </tr>
            <tr>
              <td><strong>Broker Applications</strong></td>
              <td style="text-align: right; font-weight: 700;">${formatNum(kpi.broker_applications_in_period)}</td>
              <td>PRC broker applications received during reporting period</td>
            </tr>
            <tr>
              <td><strong>Complete MCE Assessments</strong></td>
              <td style="text-align: right; font-weight: 700;">${formatNum(ass.counts ? ass.counts.complete_verified : 0)}</td>
              <td>Properties with verified five-criterion MCE and ground check</td>
            </tr>
          </tbody>
        </table>

        <!-- Specific Section Content Based on Template -->
        ${renderPrintTemplateBody(template, data)}

        ${mandatoryFooter}
      </section>
    `;

    // Optional Page 2: Appendix - Full 30-Barangay Schedule
    if (includeAppendix && (template === 'inventory' || template === 'consolidated')) {
      contentHtml += `
        <section class="ci-print-page">
          <header class="ci-print-letterhead">
            <div>
              <div class="ci-print-brand">LOCUS-SF / APPENDIX</div>
              <div style="font-size: 10pt; font-weight: 700; color: #0f172a; margin-top: 2pt;">Municipal Barangay Inventory Schedule</div>
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

  /**
   * Helper: Print template body generator
   */
  function renderPrintTemplateBody(template, data) {
    const inv = data.inventory || {};
    const act = data.listing_activity || {};
    const brk = data.broker_activity || {};
    const eng = data.investor_engagement || {};
    const ass = data.assessment_readiness || {};

    if (template === 'inventory' || template === 'consolidated') {
      return `
        <h3 style="font-size: 9.5pt; font-weight: 700; color: #0f172a; margin: 14pt 0 6pt;">Property Typologies &amp; Land Use Classifications</h3>
        <table class="ci-print-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Category</th>
              <th style="text-align: right;">Count</th>
              <th>Counting Rule &amp; Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowspan="3" style="font-weight: 700; vertical-align: top;">Primary Physical Typology</td>
              <td>Land Parcels</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(inv.primary_types ? inv.primary_types.land : 0)}</td>
              <td>Mutually exclusive (Bare lots, development land)</td>
            </tr>
            <tr>
              <td>Buildings &amp; Built Structures</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(inv.primary_types ? inv.primary_types.building : 0)}</td>
              <td>Mutually exclusive (Offices, commercial buildings)</td>
            </tr>
            <tr>
              <td>Mixed / Unspecified</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(inv.primary_types ? inv.primary_types.mixed : 0)}</td>
              <td>Mutually exclusive (Mixed use parcels)</td>
            </tr>
            <tr>
              <td rowspan="3" style="font-weight: 700; vertical-align: top;">Functional Classifications</td>
              <td>Commercial Designation</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(inv.classifications ? inv.classifications.commercial : 0)}</td>
              <td>Non-additive (Overlapping land use tag)</td>
            </tr>
            <tr>
              <td>Industrial Designation</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(inv.classifications ? inv.classifications.industrial : 0)}</td>
              <td>Non-additive (Warehousing &amp; logistics)</td>
            </tr>
            <tr>
              <td>Residential Designation</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(inv.classifications ? inv.classifications.residential : 0)}</td>
              <td>Non-additive (Mixed-residential opportunities)</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    if (template === 'activity') {
      return `
        <h3 style="font-size: 9.5pt; font-weight: 700; color: #0f172a; margin: 14pt 0 6pt;">Listing Pipeline Velocity &amp; Broker Reviews</h3>
        <table class="ci-print-table">
          <thead>
            <tr>
              <th>Pipeline Area</th>
              <th>Status State</th>
              <th style="text-align: right;">Count</th>
              <th>Operational Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowspan="3" style="font-weight: 700; vertical-align: top;">Property Listings</td>
              <td>Published &amp; Active</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(act.status_breakdown ? act.status_breakdown.published : 0)}</td>
              <td>Approved through municipal review</td>
            </tr>
            <tr>
              <td>Pending Municipal Review</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(act.status_breakdown ? act.status_breakdown.pending_review : 0)}</td>
              <td>Awaiting review in administrative queue</td>
            </tr>
            <tr>
              <td>Draft / Inactive</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(act.status_breakdown ? act.status_breakdown.draft : 0)}</td>
              <td>Not yet submitted by broker/seller</td>
            </tr>
            <tr>
              <td rowspan="2" style="font-weight: 700; vertical-align: top;">Broker Applications</td>
              <td>Approved &amp; Verified</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(brk.status_breakdown ? brk.status_breakdown.approved : 0)}</td>
              <td>PRC credentials confirmed</td>
            </tr>
            <tr>
              <td>Pending Credential Review</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(brk.status_breakdown ? brk.status_breakdown.pending_review : 0)}</td>
              <td>Awaiting CICTO / Admin verification</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    if (template === 'assessment') {
      return `
        <h3 style="font-size: 9.5pt; font-weight: 700; color: #0f172a; margin: 14pt 0 6pt;">MCE Assessment Readiness &amp; Zoning Verification</h3>
        <table class="ci-print-table">
          <thead>
            <tr>
              <th>Evaluation Domain</th>
              <th>Verification Category</th>
              <th style="text-align: right;">Records</th>
              <th>Governance Significance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowspan="3" style="font-weight: 700; vertical-align: top;">Five-Criterion MCE</td>
              <td>Complete &amp; Ground-Verified</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(ass.counts ? ass.counts.complete_verified : 0)}</td>
              <td>All 5 criteria confirmed with ground check</td>
            </tr>
            <tr>
              <td>Provisional Model Evaluation</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(ass.counts ? ass.counts.provisional_model : 0)}</td>
              <td>Algorithmic score pending official ground audit</td>
            </tr>
            <tr>
              <td>Incomplete Evidence Criteria</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(ass.counts ? ass.counts.incomplete_criteria : 0)}</td>
              <td>Missing road, utility, or zonal valuations</td>
            </tr>
            <tr>
              <td rowspan="2" style="font-weight: 700; vertical-align: top;">CLUP 2025–2035 Zoning</td>
              <td>Verified Compliant</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(ass.clup_zoning ? ass.clup_zoning.verified_compliant : 0)}</td>
              <td>Permitted use under San Fernando CLUP</td>
            </tr>
            <tr>
              <td>Pending Zoning Verification</td>
              <td style="text-align: right; font-weight: 700;">${formatNum(ass.clup_zoning ? ass.clup_zoning.pending_verification : 0)}</td>
              <td>Awaiting CPDO / Zoning administrator check</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    return '';
  }

  // Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupFilters();
    setupReportModal();

    // Trigger initial API load to refresh live components
    fetchDashboardData();
  });
})();
