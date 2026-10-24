/** Authorized MCE editing, validation, simulation and immediate configuration publication. */
(() => {
  'use strict';
  const modal = document.getElementById('mceWeightConfigDialog');
  const model = window.MceWeightsModel;
  if (!modal || !model) return;
  const byId = id => document.getElementById(id);
  const criteriaContainer = byId('mceCriteriaInputs');
  const status = byId('mceConfigStatusMessage');
  const applyBtn = byId('applyMceConfigBtn');
  const previewBtn = byId('previewMceConfigBtn');
  const restoreBtn = byId('restoreMceBaselineBtn');
  const reasonInput = byId('mceReasonInput');
  const referenceInput = byId('mceReferenceInput');
  const previewContainer = byId('mcePreviewContainer');
  const autoBalance = byId('mceAutoBalance');
  const labels = ['Spatial access', 'Infrastructure', 'Property cost', 'Nearby businesses', 'Risk & safety'];
  const colors = ['#4075d5', '#1796a3', '#c88a25', '#8064bb', '#bd6086'];
  const presets = {
    logistics: [35, 30, 15, 10, 10],
    commercial: [20, 20, 25, 25, 10],
    balanced: [20, 20, 20, 20, 20]
  };
  let configData = null;
  let configuration = null;
  let draftWeights = {};
  let busy = '';
  let loadId = 0;
  let revision = 0;
  let previewId = 0;
  let previewAbort = null;
  let lastAdjusted = model.codes[0];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const format = value => Number.isFinite(value) ? value.toFixed(2).replace(/0$/, '') : '—';
  const activeWeights = () => Object.fromEntries(model.codes.map(code => [code, Number(configData?.current?.[code]?.weightPercent)]));
  const isDirty = () => !!configData && !model.equal(draftWeights, activeWeights());
  const csrf = () => configData?.csrfToken || window.SFC_APP_CONFIG?.csrfToken || document.querySelector('meta[name="csrf-token"]')?.content || '';

  function showMessage(message, error = false) {
    status.textContent = message;
    status.hidden = !message;
    status.className = `mce-status${error ? ' is-error' : ''}`;
    status.setAttribute('role', error ? 'alert' : 'status');
  }

  async function request(payload, signal) {
    const response = await fetch('api/mce-weights.php', {
      method: payload ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin', signal,
      ...(payload ? {
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf() },
        body: JSON.stringify({ ...payload, csrf_token: csrf() })
      } : {})
    });
    let data;
    try { data = await response.json(); }
    catch (_) { throw new Error('The server returned an unreadable response. Try again.'); }
    if (!response.ok || !data.ok) throw new Error(data.message || data.error || 'Unable to update the MCE configuration.');
    return data;
  }

  function normalize(data) {
    const cfg = data.configuration || {};
    const range = cfg.permitted_weight_range || { min: 5, max: 60 };
    const current = data.details?.current || Object.fromEntries(model.codes.map(code => {
      const criterion = cfg.criteria?.[code] || {};
      return [code, { label: criterion.name, basis: criterion.description, rangeMin: range.min, rangeMax: range.max, weightPercent: criterion.weight }];
    }));
    const details = {
      ...data.details, current,
      version: data.details?.version || cfg.current_version,
      baseline: data.details?.baseline || cfg.baseline_weights,
      history: data.details?.history || cfg.history || [],
      discrepancy: data.details?.discrepancy || cfg.discrepancy?.rationale || '',
      csrfToken: data.csrfToken || data.csrf_token || data.details?.csrfToken
    };
    const weights = Object.fromEntries(model.codes.map(code => [code, Number(current[code]?.weightPercent)]));
    if (!details.version || !model.validate(weights, current).valid || !model.validate(details.baseline, current).valid) {
      throw new Error('The active weight configuration is incomplete or invalid. Reload it before editing.');
    }
    return { details, configuration: cfg, weights };
  }

  function invalidatePreview() {
    revision += 1;
    previewId += 1;
    previewAbort?.abort();
    previewAbort = null;
    previewContainer.hidden = true;
    previewBtn.textContent = 'Preview impact';
  }

  function updateControls() {
    const validation = model.validate(draftWeights, configData?.current);
    const disabled = !!busy || !configData;
    modal.setAttribute('aria-busy', busy ? 'true' : 'false');
    modal.querySelectorAll('[data-input-weight], [data-slider-weight], [data-mce-preset]').forEach(input => { input.disabled = disabled; });
    reasonInput.disabled = disabled;
    referenceInput.disabled = disabled;
    autoBalance.disabled = disabled;
    applyBtn.disabled = disabled || !validation.valid || !isDirty();
    previewBtn.disabled = disabled || !validation.valid || !!previewAbort;
    restoreBtn.disabled = disabled || model.equal(activeWeights(), configData?.baseline);
    byId('closeMceConfigBtn').disabled = busy === 'save';
    byId('cancelMceConfigBtn').disabled = busy === 'save';
    applyBtn.textContent = busy === 'save' ? 'Saving…' : 'Apply weights';
    byId('mceDraftState').textContent = isDirty() ? 'Unsaved changes' : 'Active configuration';
    byId('mceDraftState').classList.toggle('is-dirty', isDirty());
    const baseline = configData?.baseline;
    modal.querySelectorAll('[data-mce-preset]').forEach(button => {
      const key = button.dataset.mcePreset;
      const weights = key === 'baseline' ? baseline : Object.fromEntries(model.codes.map((code, index) => [code, presets[key]?.[index]]));
      button.setAttribute('aria-pressed', String(model.equal(draftWeights, weights)));
    });
  }

  function renderSummary() {
    const validation = model.validate(draftWeights, configData?.current);
    const diff = Math.round((100 - validation.total) * 100) / 100;
    byId('mceTotalDisplay').textContent = `${format(validation.total)}%`;
    const badge = byId('mceTotalStatusBadge');
    badge.textContent = !validation.fieldsValid ? 'Check highlighted weights' : validation.balanced ? 'Balanced' : `${format(Math.abs(diff))}% ${diff > 0 ? 'remaining' : 'over'}`;
    badge.className = `mce-balance-badge${validation.valid ? ' is-balanced' : ' is-invalid'}`;
    byId('mceStackedBarTotalText').textContent = 'Total allocation · 100% required';
    const total = Math.max(100, validation.total);
    byId('mceStackedBar').innerHTML = model.codes.map((code, index) => {
      const value = Math.max(0, Number.isFinite(draftWeights[code]) ? draftWeights[code] : 0);
      return `<span style="width:${Math.min(100, value / total * 100)}%;background:${colors[index]}" title="${escape(labels[index])}: ${format(value)}%"></span>`;
    }).join('');
    model.codes.forEach(code => {
      const input = criteriaContainer.querySelector(`[data-input-weight="${code}"]`);
      if (!input) return;
      const error = byId(`mce-error-${code}`);
      error.textContent = validation.errors[code] || '';
      error.hidden = !validation.errors[code];
      input.setAttribute('aria-invalid', validation.errors[code] ? 'true' : 'false');
      const value = draftWeights[code];
      const delta = value - Number(configData?.baseline?.[code]);
      const deltaLabel = criteriaContainer.querySelector(`[data-delta-badge="${code}"]`);
      deltaLabel.textContent = Number.isFinite(delta) ? Math.abs(delta) < .005 ? 'Baseline' : `${delta > 0 ? '+' : ''}${format(delta)} pts from baseline` : '';
      const slider = criteriaContainer.querySelector(`[data-slider-weight="${code}"]`);
      const range = configData.current[code];
      const progress = Number.isFinite(value) ? Math.max(0, Math.min(100, (value - range.rangeMin) / (range.rangeMax - range.rangeMin) * 100)) : 0;
      slider.style.setProperty('--mce-progress', `${progress}%`);
      slider.setAttribute('aria-valuetext', `${format(value)} percent`);
    });
    const suggestion = validation.fieldsValid && !validation.balanced ? model.rebalance(draftWeights, lastAdjusted, configData?.current) : null;
    byId('mceBalanceAssistant').hidden = validation.valid || !configData;
    byId('mceAssistantHeadline').textContent = !validation.fieldsValid ? 'Each criterion needs a weight within its permitted range.' : 'Balance the remaining criteria to reach exactly 100%.';
    byId('mceApplySuggestionBtn').hidden = !suggestion;
    byId('mceApplySuggestionBtn').disabled = !!busy;
    updateControls();
  }

  function syncInputs(except) {
    model.codes.forEach(code => {
      const input = criteriaContainer.querySelector(`[data-input-weight="${code}"]`);
      const slider = criteriaContainer.querySelector(`[data-slider-weight="${code}"]`);
      if (input && input !== except) input.value = Number.isFinite(draftWeights[code]) ? format(draftWeights[code]) : '';
      if (slider && Number.isFinite(draftWeights[code])) slider.value = draftWeights[code];
    });
  }

  function render() {
    byId('mceCurrentVersionBadge').textContent = configData.version;
    byId('mceDiscrepancyBanner').textContent = configData.discrepancy;
    criteriaContainer.innerHTML = model.codes.map((code, index) => {
      const item = configData.current[code];
      return `<section class="mce-criterion" style="--mce-color:${colors[index]}" data-criterion-card="${code}">
        <div class="mce-criterion-heading"><div><label for="mce-weight-${code}"><span class="mce-criterion-dot" aria-hidden="true"></span>${escape(item.label || labels[index])}</label><p id="mce-help-${code}">${escape(item.basis || '')}</p></div>
        <div class="mce-number-box"><input id="mce-weight-${code}" type="number" inputmode="decimal" min="${Number(item.rangeMin)}" max="${Number(item.rangeMax)}" step="0.01" data-input-weight="${code}" aria-describedby="mce-help-${code} mce-error-${code}" /><span aria-hidden="true">%</span></div></div>
        <input type="range" class="mce-slider-input" min="${Number(item.rangeMin)}" max="${Number(item.rangeMax)}" step="0.01" data-slider-weight="${code}" aria-label="${escape(item.label || labels[index])} weight" />
        <div class="mce-criterion-meta"><span>${Number(item.rangeMin)}–${Number(item.rangeMax)}% allowed</span><span data-delta-badge="${code}"></span></div><p class="mce-field-error" id="mce-error-${code}" hidden></p></section>`;
    }).join('');
    byId('mceHistoryContainer').innerHTML = configData.history.length ? configData.history.slice(0, 15).map(log => `<article class="mce-history-item"><div><strong>${escape(log.is_baseline ? 'Baseline restored' : 'Weights updated')}</strong><time>${escape(log.timestamp || log.created_at || '')}</time></div><p>${escape(log.reason || '')}</p><small>${escape(log.actor_name || log.user_name || 'Authorized administrator')} · ${escape(log.source_reference || '')}</small><code>${escape(log.version || '')}</code></article>`).join('') : '<p class="mce-muted">No configuration changes recorded yet.</p>';
    syncInputs();
    renderSummary();
  }

  async function loadConfig() {
    const id = ++loadId;
    busy = 'load';
    configData = null;
    invalidatePreview();
    updateControls();
    showMessage('Loading active weights…');
    try {
      const data = normalize(await request());
      if (id !== loadId || !modal.open) return;
      configData = data.details;
      configuration = data.configuration;
      draftWeights = data.weights;
      render();
      showMessage('');
    } catch (error) {
      if (id === loadId && modal.open) {
        criteriaContainer.innerHTML = '<p class="mce-muted">Weights could not be loaded. Close this dialog and open it again to retry.</p>';
        showMessage(error.message, true);
      }
    } finally {
      if (id === loadId) { busy = ''; updateControls(); }
    }
  }

  function editWeights(event) {
    if (busy || !configData) return;
    const input = event.target;
    const code = input.dataset.inputWeight || input.dataset.sliderWeight;
    if (!model.codes.includes(code)) return;
    draftWeights[code] = input.value.trim() === '' ? NaN : Number(input.value);
    lastAdjusted = code;
    if (autoBalance.checked) draftWeights = model.rebalance(draftWeights, code, configData.current) || draftWeights;
    invalidatePreview();
    showMessage('');
    syncInputs(input.dataset.inputWeight ? input : null);
    renderSummary();
  }

  function applyPreset(key) {
    if (busy || !configData) return;
    const weights = key === 'baseline' ? { ...configData.baseline } : Object.fromEntries(model.codes.map((code, index) => [code, presets[key]?.[index]]));
    if (!model.validate(weights, configData.current).valid) return;
    draftWeights = weights;
    invalidatePreview();
    syncInputs();
    renderSummary();
    showMessage('Preset selected. Apply weights to make this configuration active.');
  }

  async function handlePreview() {
    if (busy || !configData || !model.validate(draftWeights, configData.current).valid) return;
    const snapshot = { ...draftWeights };
    const snapshotRevision = revision;
    const id = ++previewId;
    previewAbort?.abort();
    const controller = new AbortController();
    previewAbort = controller;
    previewBtn.textContent = 'Calculating…';
    updateControls();
    showMessage('');
    try {
      const data = await request({ action: 'preview', weights: snapshot }, controller.signal);
      if (id !== previewId || revision !== snapshotRevision || !modal.open) return;
      const simulations = data.preview?.simulations || [];
      byId('mcePreviewContent').innerHTML = `<p class="mce-muted">Illustrative profiles compared with the methodological baseline. Changing a weight clears this preview.</p><div class="mce-table-scroll"><table><thead><tr><th>Sample profile</th><th>Baseline</th><th>Proposed</th><th>Change</th></tr></thead><tbody>${simulations.map(item => {
        const difference = Number(item.proposedScore) - Number(item.baselineScore);
        return `<tr><td>${escape(item.profile)}</td><td>${format(Number(item.baselineScore))}</td><td><strong>${format(Number(item.proposedScore))}</strong></td><td>${difference > 0 ? '+' : ''}${format(difference)}</td></tr>`;
      }).join('')}</tbody></table></div><p class="mce-muted">Existing assessments keep their recorded scores. New assessments use the configuration active when they are saved.</p>`;
      previewContainer.hidden = false;
      previewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      if (error.name !== 'AbortError' && id === previewId && modal.open) showMessage(error.message, true);
    } finally {
      if (id === previewId) { previewAbort = null; previewBtn.textContent = 'Preview impact'; updateControls(); }
    }
  }

  function validateReason() {
    let valid = true;
    for (const [input, errorId, min, label] of [[reasonInput, 'mceReasonInlineError', 8, 'reason'], [referenceInput, 'mceReferenceInlineError', 5, 'source or consultation reference']]) {
      const error = byId(errorId);
      const invalid = input.value.trim().length < min;
      error.textContent = invalid ? `Enter a ${label} with at least ${min} characters.` : '';
      error.hidden = !invalid;
      input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      if (invalid && valid) { input.focus(); input.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      valid = valid && !invalid;
    }
    return valid;
  }

  function publishConfiguration(data) {
    // The mutation response is authoritative; a failed refresh must never conceal a saved change.
    const weights = Object.fromEntries(model.codes.map(code => [code, Number(data.weights?.[code])]));
    if (!data.version || !model.validate(weights, configData.current).valid) throw new Error('The server saved a configuration but did not return valid weights. Reload before continuing.');
    configData.version = data.version;
    model.codes.forEach(code => { configData.current[code].weightPercent = weights[code]; });
    configuration = { ...configuration, current_version: data.version, active_weights: { ...weights }, criteria: { ...(configuration?.criteria || {}) } };
    model.codes.forEach(code => { configuration.criteria[code] = { ...configuration.criteria[code], weight: weights[code] }; });
    draftWeights = { ...weights };
    window.SFC_APP_CONFIG = window.SFC_APP_CONFIG || {};
    window.SFC_APP_CONFIG.mceWeights = { ...weights };
    window.SFC_APP_CONFIG.mceVersion = data.version;
    window.dispatchEvent(new CustomEvent('locus:mce-weights-updated', { detail: { weights: { ...weights }, version: data.version, configuration } }));
    try { localStorage.setItem('locus:mce-weights-updated', JSON.stringify({ version: data.version, changedAt: Date.now() })); } catch (_) { /* Private browsing may disable storage. */ }
    configData.history.unshift({ version: data.version, weights, reason: data.reason, source_reference: data.source_reference, timestamp: data.applied_at, is_baseline: data.is_baseline, actor_name: 'Current administrator' });
  }

  async function save(restore = false) {
    if (busy || !configData) return;
    if (!restore && (!isDirty() || !model.validate(draftWeights, configData.current).valid || !validateReason())) return;
    if (restore && !window.confirm('Restore the methodological baseline for new property assessments? This change will be recorded in the audit history.')) return;
    const payload = restore ? { action: 'restore_baseline', reason: 'Restored methodological baseline via MCE settings' } : { action: 'apply', weights: { ...draftWeights }, reason: reasonInput.value.trim(), source_reference: referenceInput.value.trim() };
    payload.expected_version = configData.version;
    busy = 'save';
    invalidatePreview();
    updateControls();
    showMessage('Saving configuration…');
    try {
      const data = await request(payload);
      publishConfiguration(data);
      reasonInput.value = '';
      referenceInput.value = '';
      updateReasonCount();
      render();
      showMessage(`${restore ? 'Baseline restored' : 'Weights applied'}. New property assessments now use this configuration.`);
    } catch (error) { showMessage(error.message, true); }
    finally { busy = ''; updateControls(); }
  }

  function updateReasonCount() {
    const count = reasonInput.value.trim().length;
    byId('mceReasonCharCount').textContent = count < 8 ? `${count}/8 minimum` : `${count} characters`;
  }

  function closeDialog() {
    if (busy === 'save') return;
    if (isDirty() && !window.confirm('Discard your unsaved weight changes?')) return;
    loadId += 1;
    invalidatePreview();
    modal.close();
  }

  byId('openMceConfigModalBtn')?.addEventListener('click', () => {
    if (modal.open) return;
    reasonInput.value = '';
    referenceInput.value = '';
    for (const id of ['mceReasonInlineError', 'mceReferenceInlineError']) byId(id).hidden = true;
    reasonInput.removeAttribute('aria-invalid');
    referenceInput.removeAttribute('aria-invalid');
    updateReasonCount();
    modal.showModal();
    loadConfig();
  });
  criteriaContainer.addEventListener('input', editWeights);
  modal.querySelectorAll('[data-mce-preset]').forEach(button => button.addEventListener('click', () => applyPreset(button.dataset.mcePreset)));
  byId('mceApplySuggestionBtn').addEventListener('click', () => {
    if (busy) return;
    const balanced = model.rebalance(draftWeights, lastAdjusted, configData?.current);
    if (!balanced) return;
    draftWeights = balanced;
    invalidatePreview(); syncInputs(); renderSummary();
  });
  autoBalance.addEventListener('change', () => {
    if (!autoBalance.checked || busy) return;
    const balanced = model.rebalance(draftWeights, lastAdjusted, configData?.current);
    if (balanced) { draftWeights = balanced; invalidatePreview(); syncInputs(); renderSummary(); }
  });
  for (const [input, id] of [[reasonInput, 'mceReasonInlineError'], [referenceInput, 'mceReferenceInlineError']]) {
    input.addEventListener('input', () => { byId(id).hidden = true; input.removeAttribute('aria-invalid'); updateReasonCount(); });
  }
  previewBtn.addEventListener('click', handlePreview);
  applyBtn.addEventListener('click', () => save(false));
  restoreBtn.addEventListener('click', () => save(true));
  byId('closeMceConfigBtn').addEventListener('click', closeDialog);
  byId('cancelMceConfigBtn').addEventListener('click', closeDialog);
  modal.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  modal.addEventListener('click', event => { if (event.target === modal) closeDialog(); });
  window.addEventListener('beforeunload', event => { if (busy === 'save' || (modal.open && isDirty())) { event.preventDefault(); event.returnValue = ''; } });
  updateControls();
})();
