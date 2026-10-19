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
      if (!data.ok) throw new Error(data.message || 'Failed to load MCE configuration.');
      configData = data.details;
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

  function renderUI() {
    if (!configData) return;

    // Render Version & Metadata
    if (versionBadge) {
      versionBadge.textContent = `${configData.version} (Active)`;
    }

    // Render Discrepancy Note
    if (discrepancyBanner && configData.discrepancy) {
      discrepancyBanner.innerHTML = `
        <div class="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-amber-200 tw-bg-amber-50/70 tw-p-3.5 tw-text-xs tw-text-amber-900">
          <svg class="tw-h-5 tw-w-5 tw-shrink-0 tw-text-amber-600 tw-mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
          </svg>
          <div class="tw-min-w-0 tw-flex-1">
            <strong class="tw-block tw-font-bold tw-text-amber-950">Methodological Model Basis &amp; Manuscript Discrepancy</strong>
            <p class="tw-mt-1 tw-mb-0 tw-leading-relaxed tw-text-amber-900/90">${escape(configData.discrepancy)}</p>
            <div class="tw-mt-2 tw-flex tw-flex-wrap tw-gap-2 tw-text-[11px]">
              <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-white/80 tw-px-2 tw-py-0.5 tw-font-semibold tw-text-slate-800 tw-border tw-border-amber-200">
                5-Criterion Baseline: Spatial 25% | Infra 25% | Econ 20% | Nearby 15% | Risk 15%
              </span>
              <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-amber-100/80 tw-px-2 tw-py-0.5 tw-font-medium tw-text-amber-900">
                Zoning = Non-compensatory gate (0.0% weight)
              </span>
            </div>
          </div>
        </div>
      `;
    }

    // Render Criteria Inputs
    if (criteriaContainer) {
      criteriaContainer.innerHTML = Object.entries(configData.current).map(([code, item]) => {
        const val = draftWeights[code] ?? item.weightPercent;
        const baselineVal = configData.baseline[code] ?? 0;
        const docSixVal = configData.documentedSixCriterion[code] ?? 0;
        return `
          <div class="tw-rounded-2xl tw-border tw-border-slate-200/90 tw-bg-white tw-p-4 tw-shadow-sm tw-transition-all hover:tw-border-slate-300" data-criterion-card="${escape(code)}">
            <div class="tw-flex tw-items-center tw-justify-between tw-gap-3">
              <div class="tw-min-w-0">
                <div class="tw-flex tw-items-center tw-gap-2">
                  <strong class="tw-text-sm tw-font-bold tw-text-slate-900">${escape(item.label)}</strong>
                  <span class="tw-rounded-md tw-bg-slate-100 tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-semibold tw-text-slate-600">${escape(code)}</span>
                  ${item.required ? '<span class="tw-rounded-md tw-bg-blue-50 tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-semibold tw-text-blue-700">Required</span>' : ''}
                </div>
                <p class="tw-mb-0 tw-mt-0.5 tw-text-xs tw-text-slate-500 tw-line-clamp-1">${escape(item.basis || '')}</p>
              </div>
              <div class="tw-flex tw-items-center tw-gap-1.5">
                <input type="number" step="0.1" min="${item.rangeMin}" max="${item.rangeMax}" value="${val.toFixed(1)}"
                  data-input-weight="${escape(code)}"
                  class="tw-w-20 tw-rounded-xl tw-border tw-border-slate-300 tw-bg-slate-50/70 tw-px-2.5 tw-py-1.5 tw-text-right tw-text-sm tw-font-black tw-text-slate-900 focus:tw-border-[#11224d] focus:tw-bg-white focus:tw-outline-none">
                <span class="tw-text-xs tw-font-bold tw-text-slate-600">%</span>
              </div>
            </div>

            <div class="tw-mt-3 tw-flex tw-items-center tw-gap-3">
              <input type="range" min="${item.rangeMin}" max="${item.rangeMax}" step="0.5" value="${val}"
                data-slider-weight="${escape(code)}"
                class="tw-h-2 tw-w-full tw-cursor-pointer tw-accent-[#11224d] tw-rounded-lg tw-bg-slate-200">
            </div>

            <div class="tw-mt-2.5 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2 tw-text-[11px] tw-text-slate-400">
              <div class="tw-flex tw-items-center tw-gap-3">
                <span>Permitted range: <strong class="tw-text-slate-600">${item.rangeMin}% – ${item.rangeMax}%</strong></span>
                <span>Baseline: <strong class="tw-text-slate-600">${baselineVal}%</strong></span>
              </div>
              ${docSixVal ? `<span class="tw-text-slate-400">Manuscript 6-crit draft: ${docSixVal}%</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      // Attach event listeners for sliders and number inputs
      criteriaContainer.querySelectorAll('[data-input-weight]').forEach(input => {
        input.addEventListener('input', (e) => {
          const code = e.target.dataset.inputWeight;
          const num = parseFloat(e.target.value) || 0;
          draftWeights[code] = num;
          const slider = criteriaContainer.querySelector(`[data-slider-weight="${code}"]`);
          if (slider) slider.value = num;
          isDirty = true;
          updateTotal();
        });
      });

      criteriaContainer.querySelectorAll('[data-slider-weight]').forEach(slider => {
        slider.addEventListener('input', (e) => {
          const code = e.target.dataset.sliderWeight;
          const num = parseFloat(e.target.value) || 0;
          draftWeights[code] = num;
          const input = criteriaContainer.querySelector(`[data-input-weight="${code}"]`);
          if (input) input.value = num.toFixed(1);
          isDirty = true;
          updateTotal();
        });
      });
    }

    // Render History
    renderHistory();
    updateTotal();
  }

  function updateTotal() {
    let sum = 0;
    Object.values(draftWeights).forEach(v => { sum += (parseFloat(v) || 0); });
    const diff = 100 - sum;
    const isValid = Math.abs(diff) <= 0.05;

    if (totalDisplay) {
      totalDisplay.textContent = `${sum.toFixed(1)}%`;
    }

    if (totalStatusBadge) {
      if (isValid) {
        totalStatusBadge.className = 'tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-emerald-50 tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-text-emerald-700 tw-border tw-border-emerald-200';
        totalStatusBadge.innerHTML = `
          <svg class="tw-h-3.5 tw-w-3.5 tw-text-emerald-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          Balanced (100.0%)
        `;
      } else {
        totalStatusBadge.className = 'tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-rose-50 tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-text-rose-700 tw-border tw-border-rose-200';
        const sign = diff > 0 ? `+${diff.toFixed(1)}% remaining` : `${diff.toFixed(1)}% excess`;
        totalStatusBadge.innerHTML = `
          <svg class="tw-h-3.5 tw-w-3.5 tw-text-rose-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          ${sign}
        `;
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
    if (!historyContainer || !configData || !configData.history) return;
    const logs = configData.history;
    if (logs.length === 0) {
      historyContainer.innerHTML = '<p class="tw-text-xs tw-text-slate-400 tw-py-2 tw-mb-0">No past configuration changes recorded.</p>';
      return;
    }
    historyContainer.innerHTML = `
      <div class="tw-divide-y tw-divide-slate-100">
        ${logs.map(log => `
          <div class="tw-py-2.5 tw-text-xs">
            <div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
              <span class="tw-font-bold tw-text-slate-800">${escape(log.action || 'Configuration event')}</span>
              <span class="tw-text-slate-400 tw-text-[11px]">${escape(log.created_at || '')}</span>
            </div>
            <div class="tw-mt-0.5 tw-text-slate-600">
              User: <strong class="tw-text-slate-700">${escape(log.user_email || log.user_name || 'System')}</strong>
            </div>
            ${log.details ? `
              <div class="tw-mt-1 tw-rounded-lg tw-bg-slate-50 tw-p-2 tw-text-[11px] tw-text-slate-600 tw-border tw-border-slate-200/60">
                ${escape(typeof log.details === 'string' ? log.details : JSON.stringify(log.details))}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Action: Preview
  async function handlePreview() {
    if (!previewBtn) return;
    showMessage('Simulating proposed weights impact...');
    try {
      const res = await fetch('api/mce-weights.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          weights: draftWeights,
          csrf_token: configData.csrfToken || ''
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Simulation failed.');

      if (previewContainer && previewContent) {
        previewContainer.classList.remove('tw-hidden');
        const sim = data.preview;
        previewContent.innerHTML = `
          <div class="tw-space-y-4">
            <div class="tw-rounded-xl tw-border tw-border-blue-200 tw-bg-blue-50/60 tw-p-3 tw-text-xs tw-text-blue-900">
              <strong class="tw-block tw-font-bold">Proposed Configuration: ${escape(sim.version)}</strong>
              <span class="tw-text-[11px] tw-text-blue-800">Weights total: 100.0%. Below is the simulated score impact across standard property profiles. Zero database mutation.</span>
            </div>

            <div class="tw-overflow-x-auto">
              <table class="tw-w-full tw-text-left tw-text-xs">
                <thead>
                  <tr class="tw-border-b tw-border-slate-200 tw-text-[11px] tw-font-bold tw-text-slate-500 tw-uppercase">
                    <th class="tw-py-2 tw-px-2">Property Profile</th>
                    <th class="tw-py-2 tw-px-2 tw-text-right">Active IAI</th>
                    <th class="tw-py-2 tw-px-2 tw-text-right">Proposed IAI</th>
                    <th class="tw-py-2 tw-px-2 tw-text-right">Net Change</th>
                  </tr>
                </thead>
                <tbody class="tw-divide-y tw-divide-slate-100">
                  ${sim.simulations.map(s => {
                    const diff = s.proposedScore - s.baselineScore;
                    const diffFormatted = (diff >= 0 ? '+' : '') + diff.toFixed(1);
                    const diffColor = diff > 0.05 ? 'tw-text-emerald-600' : (diff < -0.05 ? 'tw-text-rose-600' : 'tw-text-slate-500');
                    return `
                      <tr>
                        <td class="tw-py-2 tw-px-2 tw-font-medium tw-text-slate-800">${escape(s.profile)}</td>
                        <td class="tw-py-2 tw-px-2 tw-text-right tw-font-bold tw-text-slate-600">${s.baselineScore.toFixed(1)}</td>
                        <td class="tw-py-2 tw-px-2 tw-text-right tw-font-black tw-text-slate-900">${s.proposedScore.toFixed(1)}</td>
                        <td class="tw-py-2 tw-px-2 tw-text-right tw-font-bold ${diffColor}">${diffFormatted}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="tw-rounded-xl tw-bg-slate-50 tw-p-3 tw-text-[11px] tw-text-slate-500">
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

    if (!reason || reason.length < 5) {
      showMessage('Please provide a documented reason for this adjustment (minimum 5 characters).', true);
      if (reasonInput) reasonInput.focus();
      return;
    }

    if (!confirm('Apply this MCE weight configuration?\n\nThis will become the active model for new property evaluations. Existing evaluations retain their historical assessment version tag.')) {
      return;
    }

    showMessage('Saving and applying configuration...');
    try {
      const res = await fetch('api/mce-weights.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          weights: draftWeights,
          reason: reason,
          reference: reference,
          csrf_token: configData.csrfToken || ''
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to apply configuration.');

      showMessage(`Successfully applied configuration: ${data.version}.`, false);
      alert(`MCE Weight Configuration ${data.version} has been applied.\n\nAll subsequent evaluations will use these weights.`);
      await fetchConfig();
      if (reasonInput) reasonInput.value = '';
      if (referenceInput) referenceInput.value = '';
      if (previewContainer) previewContainer.classList.add('tw-hidden');
    } catch (err) {
      showMessage(err.message, true);
    }
  }

  // Action: Restore Baseline
  async function handleRestoreBaseline() {
    if (!confirm('Restore MCE weights to the official approved baseline (Spatial 25%, Infra 25%, Cost 20%, Nearby 15%, Risk 15%)?\n\nThis action will be logged in the city audit trail.')) {
      return;
    }

    showMessage('Restoring baseline weights...');
    try {
      const res = await fetch('api/mce-weights.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore_baseline',
          reason: 'Restored official approved baseline via Admin Dashboard',
          csrf_token: configData.csrfToken || ''
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to restore baseline.');

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

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

})();
