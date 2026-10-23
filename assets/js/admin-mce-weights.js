/**
 * LOCUS-SF Admin MCE Weight Configuration Controller
 * 
 * Manages controlled MCE weight adjustments, client-side validation,
 * preview simulations, baseline restorations, and audit history display.
 */
(() => {
  'use strict';

  let configData = null;
  let draftWeights = {};
  let isDirty = false;

  const modal = document.getElementById('mceWeightConfigDialog');
  const openBtn = document.getElementById('openMceConfigModalBtn');
  if (!modal) return;

  const closeBtn = document.getElementById('closeMceConfigBtn');
  const cancelBtn = document.getElementById('cancelMceConfigBtn');
  const previewBtn = document.getElementById('previewMceConfigBtn');
  const applyBtn = document.getElementById('applyMceConfigBtn');
  const restoreBtn = document.getElementById('restoreMceBaselineBtn');

  const criteriaContainer = document.getElementById('mceCriteriaInputs');
  const totalDisplay = document.getElementById('mceTotalDisplay');
  const totalStatusBadge = document.getElementById('mceTotalStatusBadge');
  const versionBadge = document.getElementById('mceCurrentVersionBadge');
  const discrepancyBanner = document.getElementById('mceDiscrepancyBanner');
  const previewContainer = document.getElementById('mcePreviewContainer');
  const previewContent = document.getElementById('mcePreviewContent');
  const historyContainer = document.getElementById('mceHistoryContainer');
  const statusMessage = document.getElementById('mceConfigStatusMessage');

  const reasonInput = document.getElementById('mceReasonInput');
  const referenceInput = document.getElementById('mceReferenceInput');
  const reasonCharCount = document.getElementById('mceReasonCharCount');
  const reasonInlineError = document.getElementById('mceReasonInlineError');
  const referenceInlineError = document.getElementById('mceReferenceInlineError');

  // New Live Telemetry & Suggestion Elements
  const stackedBar = document.getElementById('mceStackedBar');
  const stackedBarTotalText = document.getElementById('mceStackedBarTotalText');
  const legendRemaining = document.getElementById('mceLegendRemaining');

  const balanceAssistant = document.getElementById('mceBalanceAssistant');
  const assistantStatusPill = document.getElementById('mceAssistantStatusPill');
  const assistantHeadline = document.getElementById('mceAssistantHeadline');
  const assistantBreakdownChips = document.getElementById('mceAssistantBreakdownChips');
  const applySuggestionBtn = document.getElementById('mceApplySuggestionBtn');
  const applySuggestionBtnText = document.getElementById('mceApplySuggestionBtnText');

  let lastAdjustedCriterion = 'spatial_accessibility';
  let currentSuggestedWeights = null;

  // Helper: Escape HTML
  function escape(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getCsrfToken() {
    return (configData && (configData.csrfToken || configData.csrf_token))
      || (window.SFC_APP_CONFIG && window.SFC_APP_CONFIG.csrfToken)
      || (document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'))
      || '';
  }

  function showMessage(text, isError = false) {
    if (!statusMessage) return;
    statusMessage.textContent = text;
    statusMessage.className = `tw-text-xs tw-mt-2.5 tw-font-medium ${isError ? 'tw-text-rose-600' : 'tw-text-emerald-600'}`;
    statusMessage.style.display = text ? 'block' : 'none';
  }

  async function fetchConfig() {
    showMessage('Loading configuration...');
    try {
      const res = await fetch('api/mce-weights.php');
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || data.error || 'Failed to load MCE configuration.');

      // Normalize configData from either data.details or data.configuration
      let details = data.details;
      if (!details && data.configuration) {
        const cfg = data.configuration;
        const currentObj = {};
        const range = cfg.permitted_weight_range || { min: 5.0, max: 60.0 };
        if (cfg.criteria) {
          Object.entries(cfg.criteria).forEach(([k, c]) => {
            if (c.is_active !== false) {
              currentObj[k] = {
                code: k,
                label: c.name || k,
                required: !!c.is_required,
                basis: c.description || c.source_reference || '',
                rangeMin: parseFloat(range.min) || 5.0,
                rangeMax: parseFloat(range.max) || 60.0,
                weightPercent: parseFloat(c.weight) || 0
              };
            }
          });
        }
        details = {
          version: cfg.current_version || 'LOCUS-SF-MCE-v3.0-Baseline',
          current: currentObj,
          baseline: cfg.baseline_weights || {},
          documentedSixCriterion: cfg.documented_six_criterion_weights || {},
          discrepancy: typeof cfg.discrepancy === 'object' ? (cfg.discrepancy?.rationale || '') : (cfg.discrepancy || ''),
          discrepancyDetails: typeof cfg.discrepancy === 'object' ? cfg.discrepancy : null,
          history: cfg.history || [],
          permittedRange: range,
          csrfToken: data.csrfToken || data.csrf_token || ''
        };
      }

      if (!details || !details.current) {
        throw new Error('Invalid MCE configuration payload received from server.');
      }

      details.csrfToken = details.csrfToken || data.csrfToken || data.csrf_token || getCsrfToken();
      configData = details;

      draftWeights = {};
      Object.keys(configData.current).forEach(code => {
        draftWeights[code] = configData.current[code].weightPercent;
      });

      renderUI();
      showMessage('');
    } catch (err) {
      showMessage(err.message, true);
    }
  }

  // Helper: Format Delta Badge
  function getDeltaBadgeHTML(delta) {
    const isZero = Math.abs(delta) < 0.05;
    if (isZero) {
      return '<span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-slate-100 tw-px-2.5 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-slate-500">Baseline</span>';
    }
    const sign = delta > 0 ? '+' : '';
    const formatted = `${sign}${delta.toFixed(1)}% vs base`;
    if (delta > 0) {
      return `<span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-emerald-50 tw-px-2.5 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-emerald-700 tw-border tw-border-emerald-200">${formatted}</span>`;
    }
    return `<span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-rose-50 tw-px-2.5 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-rose-700 tw-border tw-border-rose-200">${formatted}</span>`;
  }

  function renderUI() {
    if (!configData || !configData.current) return;

    // Render Version & Metadata
    if (versionBadge) {
      versionBadge.textContent = `${configData.version} (Active)`;
    }

    // Render Discrepancy Note as Authoritative Governance Standard
    if (discrepancyBanner && configData.discrepancy) {
      const discText = typeof configData.discrepancy === 'object'
        ? (configData.discrepancy.rationale || '')
        : String(configData.discrepancy);

      discrepancyBanner.innerHTML = `
        <div class="tw-relative tw-overflow-hidden tw-rounded-2xl tw-border tw-border-slate-200/90 tw-bg-gradient-to-r tw-from-slate-50 tw-via-blue-50/30 tw-to-slate-50 tw-p-4 tw-text-xs tw-shadow-sm">
          <div class="tw-flex tw-items-start tw-gap-3.5">
            <div class="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-[#11224d]/10 tw-text-[#11224d]">
              <svg class="tw-h-5 tw-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div class="tw-min-w-0 tw-flex-1">
              <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
                <strong class="tw-font-black tw-text-slate-900 tw-text-xs tw-tracking-tight">LOCUS-SF Methodological Standard &amp; Governance Basis</strong>
                <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-slate-200/70 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-slate-700">CLUP 2017-2027 Calibrated</span>
              </div>
              <p class="tw-mt-1 tw-mb-0 tw-leading-relaxed tw-text-slate-600">${escape(discText)}</p>
              <div class="tw-mt-2.5 tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-text-[11px]">
                <div class="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-bg-white tw-px-2.5 tw-py-1 tw-font-semibold tw-text-slate-800 tw-border tw-border-slate-200 tw-shadow-2xs">
                  <span class="tw-text-slate-400 tw-font-normal">Baseline:</span> Spatial 25% • Infra 25% • Cost 20% • Nearby 15% • Risk 15%
                </div>
                <div class="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-bg-amber-50 tw-px-2.5 tw-py-1 tw-font-bold tw-text-amber-900 tw-border tw-border-amber-200/70">
                  <svg class="tw-h-3 tw-w-3 tw-text-amber-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd"/></svg>
                  Zoning Exclusion: Binary Pre-qualification Gate (0.0% weight)
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const categoryLabels = {
      spatial_accessibility: 'Spatial Connectivity',
      infrastructure_readiness: 'Utilities & Telecom',
      property_cost_market_competitiveness: 'Market Valuation',
      nearby_businesses: 'Commercial Density',
      risk_constraints: 'Environmental Safety'
    };

    // Render Criteria Inputs
    if (criteriaContainer) {
      criteriaContainer.innerHTML = Object.entries(configData.current).map(([code, item]) => {
        const val = typeof draftWeights[code] === 'number' ? draftWeights[code] : item.weightPercent;
        const baselineVal = (configData.baseline && typeof configData.baseline[code] === 'number') ? configData.baseline[code] : 0;
        const docSixVal = (configData.documentedSixCriterion && typeof configData.documentedSixCriterion[code] === 'number') ? configData.documentedSixCriterion[code] : null;
        
        const delta = val - baselineVal;
        const categoryTag = categoryLabels[code] || '';

        return `
          <div class="tw-rounded-2xl tw-border tw-border-slate-200/90 tw-bg-white tw-p-4.5 tw-shadow-sm tw-transition-all hover:tw-border-slate-300 hover:tw-shadow-md" data-criterion-card="${escape(code)}">
            <div class="tw-flex tw-items-start tw-justify-between tw-gap-3">
              <div class="tw-min-w-0 tw-flex-1">
                <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                  <strong class="tw-text-sm tw-font-black tw-tracking-tight tw-text-slate-900">${escape(item.label)}</strong>
                  ${categoryTag ? `<span class="tw-rounded-full tw-bg-slate-100 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-slate-600 tw-uppercase tw-tracking-wider">${escape(categoryTag)}</span>` : ''}
                  ${item.required ? '<span class="tw-rounded-full tw-bg-blue-50 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-blue-700 tw-border tw-border-blue-100">Mandatory</span>' : ''}
                  <span data-delta-badge="${escape(code)}">
                    ${getDeltaBadgeHTML(delta)}
                  </span>
                </div>
                <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-text-slate-500 tw-leading-relaxed">${escape(item.basis || '')}</p>
              </div>
              
              <!-- Numeric Stepper Pill -->
              <div class="tw-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-1 focus-within:tw-border-[#11224d] focus-within:tw-bg-white focus-within:tw-ring-2 focus-within:tw-ring-[#11224d]/10 tw-transition-all mce-number-box">
                <input type="number" step="0.1" min="${item.rangeMin}" max="${item.rangeMax}" value="${val.toFixed(1)}"
                  data-input-weight="${escape(code)}"
                  class="tw-w-16 tw-border-0 tw-bg-transparent tw-px-1.5 tw-py-1 tw-text-right tw-text-base tw-font-black tw-text-slate-900 focus:tw-outline-none">
                <span class="tw-pr-2 tw-text-xs tw-font-black tw-text-slate-400">%</span>
              </div>
            </div>

            <!-- Interactive Slider Track -->
            <div class="tw-mt-3.5 tw-flex tw-items-center tw-gap-3">
              <input type="range" min="${item.rangeMin}" max="${item.rangeMax}" step="0.5" value="${val}"
                data-slider-weight="${escape(code)}"
                class="mce-slider-input">
            </div>

            <!-- Card Footer Bounds & Reference -->
            <div class="tw-mt-2.5 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2 tw-border-t tw-border-slate-100 tw-pt-2.5 tw-text-[11px] tw-text-slate-400">
              <div class="tw-flex tw-items-center tw-gap-3">
                <span>Permitted: <strong class="tw-text-slate-700">${item.rangeMin}% – ${item.rangeMax}%</strong></span>
                <span class="tw-text-slate-200">•</span>
                <span>Baseline: <strong class="tw-text-slate-700">${baselineVal.toFixed(1)}%</strong></span>
              </div>
              ${docSixVal !== null ? `<span class="tw-inline-flex tw-items-center tw-gap-1 tw-text-slate-500">CSFP 6-Criterion Ref: <strong class="tw-text-slate-700">${docSixVal.toFixed(1)}%</strong></span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      // Synchronize slider and number input listeners with last-adjusted tracking
      criteriaContainer.querySelectorAll('[data-input-weight]').forEach(input => {
        input.addEventListener('input', (e) => {
          const code = e.target.dataset.inputWeight;
          const num = parseFloat(e.target.value) || 0;
          draftWeights[code] = num;
          lastAdjustedCriterion = code;
          const slider = criteriaContainer.querySelector(`[data-slider-weight="${code}"]`);
          if (slider) slider.value = num;
          updateCriterionDelta(code, num);
          isDirty = true;
          updateTotal();
        });
      });

      criteriaContainer.querySelectorAll('[data-slider-weight]').forEach(slider => {
        slider.addEventListener('input', (e) => {
          const code = e.target.dataset.sliderWeight;
          const num = parseFloat(e.target.value) || 0;
          draftWeights[code] = num;
          lastAdjustedCriterion = code;
          const input = criteriaContainer.querySelector(`[data-input-weight="${code}"]`);
          if (input) input.value = num.toFixed(1);
          updateCriterionDelta(code, num);
          isDirty = true;
          updateTotal();
        });
      });

      // Quick Model Preset Buttons
      modal.querySelectorAll('[data-mce-preset]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const presetKey = e.currentTarget.dataset.mcePreset;
          applyPreset(presetKey);
        });
      });

      // Auto-Balance Breakdown Apply Button
      if (applySuggestionBtn) {
        applySuggestionBtn.addEventListener('click', applySuggestedBreakdown);
      }
    }

    renderHistory();
    updateTotal();
  }

  function updateCriterionDelta(code, newVal) {
    if (!criteriaContainer || !configData) return;
    const badgeContainer = criteriaContainer.querySelector(`[data-delta-badge="${code}"]`);
    if (!badgeContainer) return;
    const baselineVal = (configData.baseline && typeof configData.baseline[code] === 'number') ? configData.baseline[code] : 0;
    const delta = newVal - baselineVal;
    badgeContainer.innerHTML = getDeltaBadgeHTML(delta);
  }

  // Model Archetype Presets
  const presets = {
    baseline: {
      spatial_accessibility: 25.0,
      infrastructure_readiness: 25.0,
      property_cost_market_competitiveness: 20.0,
      nearby_businesses: 15.0,
      risk_constraints: 15.0
    },
    logistics: {
      spatial_accessibility: 35.0,
      infrastructure_readiness: 30.0,
      property_cost_market_competitiveness: 15.0,
      nearby_businesses: 10.0,
      risk_constraints: 10.0
    },
    commercial: {
      spatial_accessibility: 20.0,
      infrastructure_readiness: 20.0,
      property_cost_market_competitiveness: 25.0,
      nearby_businesses: 25.0,
      risk_constraints: 10.0
    },
    balanced: {
      spatial_accessibility: 20.0,
      infrastructure_readiness: 20.0,
      property_cost_market_competitiveness: 20.0,
      nearby_businesses: 20.0,
      risk_constraints: 20.0
    }
  };

  function applyPreset(presetKey) {
    const p = presets[presetKey];
    if (!p) return;
    Object.entries(p).forEach(([code, val]) => {
      draftWeights[code] = val;
      const input = criteriaContainer?.querySelector(`[data-input-weight="${code}"]`);
      if (input) input.value = val.toFixed(1);
      const slider = criteriaContainer?.querySelector(`[data-slider-weight="${code}"]`);
      if (slider) slider.value = val;
      updateCriterionDelta(code, val);
    });
    lastAdjustedCriterion = 'spatial_accessibility';
    isDirty = true;
    updateTotal();
    showMessage(`Applied "${presetKey.charAt(0).toUpperCase() + presetKey.slice(1)}" model preset.`, false);
  }

  // Auto-Balance Suggestion Algorithm
  function calculateSuggestedBreakdown(adjustedCode) {
    if (!configData || !configData.current) return null;
    const codes = Object.keys(configData.current);
    if (!codes.includes(adjustedCode)) {
      adjustedCode = codes[0];
    }

    const currentVal = typeof draftWeights[adjustedCode] === 'number'
      ? draftWeights[adjustedCode]
      : (configData.current[adjustedCode]?.weightPercent || 25);

    const otherCodes = codes.filter(c => c !== adjustedCode);
    const targetRemainder = 100 - currentVal;

    let suggestions = {};
    suggestions[adjustedCode] = currentVal;

    let baselineSum = 0;
    otherCodes.forEach(c => {
      const b = (configData.baseline && typeof configData.baseline[c] === 'number') ? configData.baseline[c] : 20.0;
      baselineSum += b;
    });
    if (baselineSum <= 0) baselineSum = otherCodes.length;

    let runningSum = currentVal;
    otherCodes.forEach(c => {
      const b = (configData.baseline && typeof configData.baseline[c] === 'number') ? configData.baseline[c] : 20.0;
      const share = b / baselineSum;
      let raw = targetRemainder * share;
      let clamped = Math.max(5.0, Math.min(60.0, raw));
      let rounded = Math.round(clamped * 10) / 10;
      suggestions[c] = rounded;
      runningSum += rounded;
    });

    let residual = Math.round((100 - runningSum) * 10) / 10;
    if (Math.abs(residual) > 0.001) {
      for (const c of otherCodes) {
        const candidate = Math.round((suggestions[c] + residual) * 10) / 10;
        if (candidate >= 5.0 && candidate <= 60.0) {
          suggestions[c] = candidate;
          residual = 0;
          break;
        }
      }
    }

    return suggestions;
  }

  function applySuggestedBreakdown() {
    if (!currentSuggestedWeights) return;
    Object.entries(currentSuggestedWeights).forEach(([code, val]) => {
      draftWeights[code] = val;
      const input = criteriaContainer?.querySelector(`[data-input-weight="${code}"]`);
      if (input) input.value = val.toFixed(1);
      const slider = criteriaContainer?.querySelector(`[data-slider-weight="${code}"]`);
      if (slider) slider.value = val;
      updateCriterionDelta(code, val);
    });
    isDirty = true;
    updateTotal();
    showMessage('Weights auto-balanced to exactly 100.0%.', false);
  }

  // Segmented Cumulative Allocation Bar Renderer
  function renderStackedBar(sum, diff) {
    if (!stackedBar) return;
    const codes = ['spatial_accessibility', 'infrastructure_readiness', 'property_cost_market_competitiveness', 'nearby_businesses', 'risk_constraints'];
    const classMap = {
      spatial_accessibility: 'spatial',
      infrastructure_readiness: 'infra',
      property_cost_market_competitiveness: 'cost',
      nearby_businesses: 'nearby',
      risk_constraints: 'risk'
    };

    let html = '';
    const scale = sum > 100 ? (100 / sum) : 1;

    codes.forEach(code => {
      const val = typeof draftWeights[code] === 'number' ? draftWeights[code] : 0;
      const width = (val * scale);
      if (width > 0) {
        html += `<div class="mce-stacked-segment ${classMap[code]}" style="width: ${width.toFixed(2)}%;" title="${escape(code.replace(/_/g, ' '))}: ${val.toFixed(1)}%"></div>`;
      }
    });

    if (diff > 0.05) {
      html += `<div class="mce-stacked-segment remaining" style="width: ${diff.toFixed(2)}%;" title="Remaining: ${diff.toFixed(1)}%"></div>`;
      if (legendRemaining) legendRemaining.style.display = 'inline-flex';
    } else {
      if (legendRemaining) legendRemaining.style.display = 'none';
    }

    stackedBar.innerHTML = html;

    if (stackedBarTotalText) {
      if (Math.abs(diff) <= 0.05) {
        stackedBarTotalText.textContent = '100.0% / 100.0% (Balanced)';
        stackedBarTotalText.className = 'tw-font-mono tw-font-bold tw-text-emerald-400 tw-text-[11px]';
      } else if (diff > 0) {
        stackedBarTotalText.textContent = `${sum.toFixed(1)}% / 100.0% (${diff.toFixed(1)}% remaining)`;
        stackedBarTotalText.className = 'tw-font-mono tw-font-bold tw-text-sky-300 tw-text-[11px]';
      } else {
        stackedBarTotalText.textContent = `${sum.toFixed(1)}% / 100.0% (${Math.abs(diff).toFixed(1)}% excess)`;
        stackedBarTotalText.className = 'tw-font-mono tw-font-bold tw-text-rose-400 tw-text-[11px]';
      }
    }
  }

  function updateTotal() {
    let sum = 0;
    Object.values(draftWeights).forEach(v => { sum += (parseFloat(v) || 0); });
    const diff = Math.round((100 - sum) * 10) / 10;
    const isValid = Math.abs(diff) <= 0.05;

    if (totalDisplay) {
      totalDisplay.textContent = `${sum.toFixed(1)}%`;
    }

    if (totalStatusBadge) {
      if (isValid) {
        totalStatusBadge.className = 'tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-emerald-500/20 tw-px-3 tw-py-1 tw-text-xs tw-font-black tw-text-emerald-300 tw-border tw-border-emerald-400/30';
        totalStatusBadge.innerHTML = `
          <svg class="tw-h-3.5 tw-w-3.5 tw-text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          Balanced (100.0%)
        `;
      } else if (diff > 0) {
        totalStatusBadge.className = 'tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-sky-500/20 tw-px-3 tw-py-1 tw-text-xs tw-font-black tw-text-sky-300 tw-border tw-border-sky-400/30';
        totalStatusBadge.innerHTML = `
          <svg class="tw-h-3.5 tw-w-3.5 tw-text-sky-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 11.293a1 1 0 001.414 1.414l2-2A1 1 0 0011 10V7z" clip-rule="evenodd"/></svg>
          ${diff.toFixed(1)}% remaining
        `;
      } else {
        totalStatusBadge.className = 'tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-rose-500/25 tw-px-3 tw-py-1 tw-text-xs tw-font-black tw-text-rose-200 tw-border tw-border-rose-400/40';
        totalStatusBadge.innerHTML = `
          <svg class="tw-h-3.5 tw-w-3.5 tw-text-rose-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          ${Math.abs(diff).toFixed(1)}% excess
        `;
      }
    }

    // Render live stacked allocation bar
    renderStackedBar(sum, diff);

    // Update Auto-Balance & Suggestion Assistant
    if (balanceAssistant) {
      if (isValid) {
        balanceAssistant.style.display = 'none';
        currentSuggestedWeights = null;
      } else {
        balanceAssistant.style.display = 'block';
        currentSuggestedWeights = calculateSuggestedBreakdown(lastAdjustedCriterion);

        if (diff > 0) {
          balanceAssistant.classList.remove('is-excess');
          if (assistantStatusPill) {
            assistantStatusPill.className = 'mce-assistant-pill remaining';
            assistantStatusPill.textContent = `${diff.toFixed(1)}% Remaining`;
          }
          if (assistantHeadline) {
            assistantHeadline.textContent = `Auto-balance remaining ${diff.toFixed(1)}% across other criteria:`;
          }
          if (applySuggestionBtnText) {
            applySuggestionBtnText.textContent = `Apply Breakdown (100.0%)`;
          }
        } else {
          balanceAssistant.classList.add('is-excess');
          if (assistantStatusPill) {
            assistantStatusPill.className = 'mce-assistant-pill excess';
            assistantStatusPill.textContent = `${Math.abs(diff).toFixed(1)}% Excess`;
          }
          if (assistantHeadline) {
            assistantHeadline.textContent = `Adjust other criteria to absorb ${Math.abs(diff).toFixed(1)}% excess:`;
          }
          if (applySuggestionBtnText) {
            applySuggestionBtnText.textContent = `Auto-Balance to 100.0%`;
          }
        }

        if (assistantBreakdownChips && currentSuggestedWeights) {
          const shortLabels = {
            spatial_accessibility: 'Spatial',
            infrastructure_readiness: 'Infra',
            property_cost_market_competitiveness: 'Cost',
            nearby_businesses: 'Nearby',
            risk_constraints: 'Risk'
          };
          const otherCodes = Object.keys(currentSuggestedWeights).filter(c => c !== lastAdjustedCriterion);
          assistantBreakdownChips.innerHTML = otherCodes.map(c => `
            <span class="mce-suggestion-chip">
              ${shortLabels[c] || c}: <strong>${currentSuggestedWeights[c].toFixed(1)}%</strong>
            </span>
          `).join('');
        }
      }
    }

    if (applyBtn) {
      applyBtn.disabled = !isValid;
      if (!isValid) {
        applyBtn.classList.add('tw-opacity-50', 'tw-cursor-not-allowed');
      } else {
        applyBtn.classList.remove('tw-opacity-50', 'tw-cursor-not-allowed');
      }
    }
  }

  function renderHistory() {
    if (!historyContainer || !configData) return;
    const logs = configData.history || [];
    if (!Array.isArray(logs) || logs.length === 0) {
      historyContainer.innerHTML = '<p class="tw-text-xs tw-text-slate-400 tw-py-2 tw-mb-0">No past configuration changes recorded.</p>';
      return;
    }

    historyContainer.innerHTML = `
      <div class="tw-divide-y tw-divide-slate-200/80">
        ${logs.map(log => {
          const timestamp = log.timestamp || log.created_at || 'Recent';
          const actor = log.actor_name || log.user_name || log.user_email || 'CICTO Administrator';
          const version = log.version || 'MCE-CFG';
          const reason = log.reason || log.action || 'Routine configuration update';
          const source = log.source_reference || '';
          const isBaseline = !!log.is_baseline;
          const weights = log.weights || null;

          return `
            <div class="tw-py-3 tw-text-xs">
              <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
                <div class="tw-flex tw-items-center tw-gap-2">
                  <span class="tw-font-bold tw-text-slate-900">${escape(version)}</span>
                  ${isBaseline
                    ? '<span class="tw-rounded-md tw-bg-emerald-50 tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-emerald-700 tw-border tw-border-emerald-200">Baseline</span>'
                    : '<span class="tw-rounded-md tw-bg-blue-50 tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-blue-700 tw-border tw-border-blue-200">Adjusted</span>'}
                </div>
                <span class="tw-text-slate-400 tw-text-[11px]">${escape(timestamp)}</span>
              </div>
              <div class="tw-mt-1 tw-text-slate-600">
                Authorized by: <strong class="tw-text-slate-800">${escape(actor)}</strong>
              </div>
              <div class="tw-mt-1 tw-rounded-lg tw-bg-slate-50 tw-p-2.5 tw-text-[11px] tw-text-slate-700 tw-border tw-border-slate-200/60 tw-space-y-1">
                <div><strong>Reason:</strong> ${escape(reason)}</div>
                ${source ? `<div><strong>Source / Reference:</strong> ${escape(source)}</div>` : ''}
                ${weights && typeof weights === 'object' ? `
                  <div class="tw-mt-2 tw-pt-1.5 tw-border-t tw-border-slate-200/60 tw-flex tw-flex-wrap tw-gap-1.5">
                    ${Object.entries(weights).map(([wCode, wVal]) => `
                      <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded tw-bg-white tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-medium tw-text-slate-700 tw-border tw-border-slate-200">
                        ${escape(wCode.replace(/_/g, ' '))}: <strong>${Number(wVal).toFixed(1)}%</strong>
                      </span>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Action: Preview Simulation
  async function handlePreview() {
    if (!previewBtn) return;
    showMessage('Simulating proposed weights impact...');
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch('api/mce-weights.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          action: 'preview',
          weights: draftWeights,
          csrf_token: csrfToken,
          _csrf: csrfToken
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || data.error || 'Simulation failed.');

      if (previewContainer && previewContent) {
        previewContainer.classList.remove('tw-hidden');
        const sim = data.preview || {};
        const simulations = Array.isArray(sim.simulations) ? sim.simulations : [];
        const criteriaRows = Array.isArray(sim.criteria_rows) ? sim.criteria_rows : [];

        previewContent.innerHTML = `
          <div class="tw-space-y-4">
            <div class="tw-rounded-xl tw-border tw-border-blue-200 tw-bg-blue-50/70 tw-p-3.5 tw-text-xs tw-text-blue-950">
              <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
                <strong class="tw-text-sm tw-font-bold">${escape(sim.version || 'Proposed MCE Configuration')}</strong>
                <span class="tw-rounded-md tw-bg-white/80 tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-bold tw-text-blue-900 tw-border tw-border-blue-200">
                  Total Weight: ${Number(sim.total_weight || 100).toFixed(1)}%
                </span>
              </div>
              <p class="tw-mb-0 tw-mt-1 tw-text-[11px] tw-text-blue-900/90 tw-leading-relaxed">
                Zero database mutation. The simulations below illustrate net score shifts under the proposed model versus baseline.
              </p>
            </div>

            ${simulations.length > 0 ? `
              <div class="tw-space-y-1.5">
                <h4 class="tw-m-0 tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500">Standard CSFP Corridor Simulations</h4>
                <div class="tw-overflow-x-auto tw-rounded-xl tw-border tw-border-slate-200">
                  <table class="tw-w-full tw-text-left tw-text-xs">
                    <thead>
                      <tr class="tw-bg-slate-50 tw-border-b tw-border-slate-200 tw-text-[11px] tw-font-bold tw-text-slate-600 tw-uppercase">
                        <th class="tw-py-2.5 tw-px-3">Property Profile Corridor</th>
                        <th class="tw-py-2.5 tw-px-3 tw-text-right">Baseline IAI</th>
                        <th class="tw-py-2.5 tw-px-3 tw-text-right">Proposed IAI</th>
                        <th class="tw-py-2.5 tw-px-3 tw-text-right">Net Change</th>
                      </tr>
                    </thead>
                    <tbody class="tw-divide-y tw-divide-slate-100">
                      ${simulations.map(s => {
                        const base = Number(s.baselineScore || 0);
                        const prop = Number(s.proposedScore || 0);
                        const diff = prop - base;
                        const diffFormatted = (diff >= 0 ? '+' : '') + diff.toFixed(1);
                        const diffClass = Math.abs(diff) < 0.05
                          ? 'tw-text-slate-500'
                          : (diff > 0 ? 'tw-text-emerald-700 tw-font-black' : 'tw-text-rose-700 tw-font-black');
                        return `
                          <tr class="hover:tw-bg-slate-50/50">
                            <td class="tw-py-2.5 tw-px-3 tw-font-medium tw-text-slate-800">${escape(s.profile)}</td>
                            <td class="tw-py-2.5 tw-px-3 tw-text-right tw-font-bold tw-text-slate-600">${base.toFixed(1)}</td>
                            <td class="tw-py-2.5 tw-px-3 tw-text-right tw-font-black tw-text-slate-900">${prop.toFixed(1)}</td>
                            <td class="tw-py-2.5 tw-px-3 tw-text-right ${diffClass}">${diffFormatted}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}

            ${criteriaRows.length > 0 ? `
              <div class="tw-space-y-1.5">
                <h4 class="tw-m-0 tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500">Criterion Contribution Breakdown</h4>
                <div class="tw-overflow-x-auto tw-rounded-xl tw-border tw-border-slate-200">
                  <table class="tw-w-full tw-text-left tw-text-xs">
                    <thead>
                      <tr class="tw-bg-slate-50 tw-border-b tw-border-slate-200 tw-text-[11px] tw-font-bold tw-text-slate-600 tw-uppercase">
                        <th class="tw-py-2 tw-px-3">Criterion</th>
                        <th class="tw-py-2 tw-px-2 tw-text-right">Base Wt</th>
                        <th class="tw-py-2 tw-px-2 tw-text-right">Prop Wt</th>
                        <th class="tw-py-2 tw-px-2 tw-text-right">Delta</th>
                        <th class="tw-py-2 tw-px-3 tw-text-right">Sample Contrib</th>
                      </tr>
                    </thead>
                    <tbody class="tw-divide-y tw-divide-slate-100">
                      ${criteriaRows.map(row => {
                        const baseW = Number(row.baseline_weight || 0);
                        const propW = Number(row.proposed_weight || 0);
                        const delta = propW - baseW;
                        const deltaFormatted = (delta >= 0 ? '+' : '') + delta.toFixed(1) + '%';
                        const deltaClass = Math.abs(delta) < 0.05
                          ? 'tw-text-slate-500'
                          : (delta > 0 ? 'tw-text-emerald-700 tw-font-bold' : 'tw-text-rose-700 tw-font-bold');
                        const baseC = Number(row.baseline_contribution || 0).toFixed(1);
                        const propC = Number(row.proposed_contribution || 0).toFixed(1);
                        return `
                          <tr class="hover:tw-bg-slate-50/50">
                            <td class="tw-py-2 tw-px-3 tw-font-medium tw-text-slate-800">${escape(row.label || row.criterion_key)}</td>
                            <td class="tw-py-2 tw-px-2 tw-text-right tw-text-slate-600">${baseW.toFixed(1)}%</td>
                            <td class="tw-py-2 tw-px-2 tw-text-right tw-font-bold tw-text-slate-900">${propW.toFixed(1)}%</td>
                            <td class="tw-py-2 tw-px-2 tw-text-right ${deltaClass}">${deltaFormatted}</td>
                            <td class="tw-py-2 tw-px-3 tw-text-right tw-font-mono tw-text-slate-700">${baseC} &rarr; <strong>${propC}</strong></td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}

            <div class="tw-rounded-xl tw-bg-slate-50 tw-p-3 tw-text-[11px] tw-text-slate-500 tw-border tw-border-slate-200/60">
              <strong class="tw-block tw-text-slate-700">Audit &amp; Historical Integrity Guarantee:</strong>
              Applying this configuration will only affect calculations created or refreshed under this new version identifier.
              Existing evaluation records in the registry retain their recorded baseline scores.
            </div>
          </div>
        `;
        previewContainer.scrollIntoView({ behavior: 'smooth' });
      }
      showMessage('Simulation complete. Review the comparative table below.');
    } catch (err) {
      showMessage(err.message, true);
    }
  }

  // Action: Apply
  async function handleApply() {
    const reason = (reasonInput ? reasonInput.value : '').trim();
    const reference = (referenceInput ? referenceInput.value : '').trim();

    // Reset inline error states
    if (reasonInlineError) {
      reasonInlineError.textContent = '';
      reasonInlineError.classList.add('tw-hidden');
    }
    if (referenceInlineError) {
      referenceInlineError.textContent = '';
      referenceInlineError.classList.add('tw-hidden');
    }
    if (reasonInput) reasonInput.classList.remove('tw-border-rose-500', 'tw-ring-2', 'tw-ring-rose-200');
    if (referenceInput) referenceInput.classList.remove('tw-border-rose-500', 'tw-ring-2', 'tw-ring-rose-200');

    if (!reason || reason.length < 8) {
      const msg = !reason
        ? 'Please provide a documented reason for this adjustment (minimum 8 characters).'
        : `Documented reason "${reason}" is too short (${reason.length}/8 chars). Minimum 8 characters required for audit compliance (e.g. "CICTO Committee Resolution 2026-04").`;
      showMessage(msg, true);
      if (reasonInlineError) {
        reasonInlineError.textContent = msg;
        reasonInlineError.classList.remove('tw-hidden');
      }
      if (reasonInput) {
        reasonInput.classList.add('tw-border-rose-500', 'tw-ring-2', 'tw-ring-rose-200');
        reasonInput.focus();
        reasonInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (reference && reference.length < 5) {
      const msg = `Source reference "${reference}" must be at least 5 characters (e.g. "CLUP 2027", "LEBDO Res 03") or left blank.`;
      showMessage(msg, true);
      if (referenceInlineError) {
        referenceInlineError.textContent = msg;
        referenceInlineError.classList.remove('tw-hidden');
      }
      if (referenceInput) {
        referenceInput.classList.add('tw-border-rose-500', 'tw-ring-2', 'tw-ring-rose-200');
        referenceInput.focus();
        referenceInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!confirm('Apply this MCE weight configuration?\n\nThis will become the active model for new property evaluations. Existing evaluations retain their historical assessment version tag.')) {
      return;
    }

    showMessage('Saving and applying configuration...');
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch('api/mce-weights.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          action: 'apply',
          weights: draftWeights,
          reason: reason,
          source_reference: reference || 'City Technical Committee (CSFP MCE-CFG Authorized Adjustment)',
          reference: reference || 'City Technical Committee (CSFP MCE-CFG Authorized Adjustment)',
          csrf_token: csrfToken,
          _csrf: csrfToken
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || data.error || 'Failed to apply configuration.');

      showMessage(`Successfully applied configuration: ${data.version}.`, false);
      
      // Play celebratory sound if system audio is enabled
      if (window.LocusSound && typeof window.LocusSound.play === 'function') {
        window.LocusSound.play('approved');
      }

      // Display gamified "NEW WEIGHTS APPLIED" celebration effect
      showCelebrationEffect(data.version, draftWeights);

      await fetchConfig();
      if (reasonInput) reasonInput.value = '';
      if (referenceInput) referenceInput.value = '';
      if (reasonCharCount) {
        reasonCharCount.textContent = 'Min. 8 characters';
        reasonCharCount.className = 'tw-text-[11px] tw-font-semibold tw-text-slate-400';
      }
      if (previewContainer) previewContainer.classList.add('tw-hidden');
    } catch (err) {
      showMessage(err.message, true);
    }
  }

  // Gamified "NEW WEIGHTS APPLIED" Celebration Overlay
  function showCelebrationEffect(version, weights) {
    if (!modal) return;
    const existing = modal.querySelector('.mce-celebration-overlay');
    if (existing) existing.remove();

    const shortLabels = {
      spatial_accessibility: 'Spatial',
      infrastructure_readiness: 'Infra',
      property_cost_market_competitiveness: 'Cost',
      nearby_businesses: 'Nearby',
      risk_constraints: 'Risk'
    };

    const overlay = document.createElement('div');
    overlay.className = 'mce-celebration-overlay';

    const chipsHTML = Object.entries(weights || {}).map(([k, v]) => `
      <div class="mce-celebration-weight-chip">
        <span class="lbl">${escape(shortLabels[k] || k.slice(0, 5))}</span>
        <span class="val">${Number(v).toFixed(1)}%</span>
      </div>
    `).join('');

    overlay.innerHTML = `
      <div class="mce-celebration-card">
        <span class="mce-celebration-badge">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          MCE Engine Updated
        </span>
        <h3 class="mce-celebration-title">NEW WEIGHTS <span>APPLIED</span></h3>
        <p class="mce-celebration-subtitle">Active evaluation model is now live for all future municipal simulations and property scorings.</p>
        <div class="mce-celebration-version">${escape(version || 'MCE-CFG-ACTIVE')}</div>
        <div class="mce-celebration-weights-grid">
          ${chipsHTML}
        </div>
        <button type="button" class="mce-celebration-btn" id="mceCelebrationDoneBtn">
          <span>Continue to Dashboard</span>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    `;

    // Append 28 micro-particles (restrained, tasteful gamified micro-burst)
    const colors = ['#9E1B22', '#11224D', '#F59E0B', '#10B981', '#3B82F6', '#E11D48'];
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('div');
      p.className = 'mce-confetti-particle';
      const angle = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 150;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist + 35;
      const rot = (Math.random() - 0.5) * 450;
      const size = 6 + Math.random() * 6;
      const color = colors[Math.floor(Math.random() * colors.length)];

      p.style.width = `${size}px`;
      p.style.height = `${size * (Math.random() > 0.5 ? 1 : 1.5)}px`;
      p.style.backgroundColor = color;
      p.style.left = '50%';
      p.style.top = '45%';
      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);
      p.style.setProperty('--rot', `${rot}deg`);
      overlay.appendChild(p);
    }

    modal.appendChild(overlay);

    const doneBtn = overlay.querySelector('#mceCelebrationDoneBtn');
    const dismiss = () => {
      overlay.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      overlay.style.opacity = '0';
      overlay.style.transform = 'scale(0.97)';
      setTimeout(() => {
        overlay.remove();
        modal.close();
      }, 250);
    };

    if (doneBtn) doneBtn.addEventListener('click', dismiss);

    // Auto-dismiss after 4.5 seconds if user does not click
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        dismiss();
      }
    }, 4500);
  }

  // Action: Restore Baseline
  async function handleRestoreBaseline() {
    if (!confirm('Restore MCE weights to the official approved baseline (Spatial 25%, Infra 25%, Cost 20%, Nearby 15%, Risk 15%)?\n\nThis action will be logged in the city audit trail.')) {
      return;
    }

    showMessage('Restoring baseline weights...');
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch('api/mce-weights.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          action: 'restore_baseline',
          reason: 'Restored official approved baseline via Admin Dashboard',
          csrf_token: csrfToken,
          _csrf: csrfToken
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || data.error || 'Failed to restore baseline.');

      showMessage('Baseline weights successfully restored.', false);
      alert('Approved baseline weights restored.');
      await fetchConfig();
      if (previewContainer) previewContainer.classList.add('tw-hidden');
    } catch (err) {
      showMessage(err.message, true);
    }
  }

  // Modal Open / Close handlers
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      modal.showModal();
      fetchConfig();
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', () => modal.close());
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.close());
  if (previewBtn) previewBtn.addEventListener('click', handlePreview);
  if (applyBtn) applyBtn.addEventListener('click', handleApply);
  if (restoreBtn) restoreBtn.addEventListener('click', handleRestoreBaseline);

  // Live validation on reason input
  if (reasonInput) {
    reasonInput.addEventListener('input', () => {
      const val = reasonInput.value.trim();
      if (reasonInlineError) {
        reasonInlineError.textContent = '';
        reasonInlineError.classList.add('tw-hidden');
      }
      reasonInput.classList.remove('tw-border-rose-500', 'tw-ring-2', 'tw-ring-rose-200');

      if (reasonCharCount) {
        if (val.length === 0) {
          reasonCharCount.textContent = 'Min. 8 characters';
          reasonCharCount.className = 'tw-text-[11px] tw-font-semibold tw-text-slate-400';
        } else if (val.length < 8) {
          reasonCharCount.textContent = `${val.length}/8 chars (${8 - val.length} more needed)`;
          reasonCharCount.className = 'tw-text-[11px] tw-font-bold tw-text-amber-600';
        } else {
          reasonCharCount.textContent = `✓ ${val.length} chars (valid justification)`;
          reasonCharCount.className = 'tw-text-[11px] tw-font-bold tw-text-emerald-600';
        }
      }
    });
  }

  // Live validation on reference input
  if (referenceInput) {
    referenceInput.addEventListener('input', () => {
      if (referenceInlineError) {
        referenceInlineError.textContent = '';
        referenceInlineError.classList.add('tw-hidden');
      }
      referenceInput.classList.remove('tw-border-rose-500', 'tw-ring-2', 'tw-ring-rose-200');
    });
  }

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

})();
