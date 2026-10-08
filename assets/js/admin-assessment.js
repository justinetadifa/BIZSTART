(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const score = value => value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toFixed(1);

  window.SFCAutomaticAssessment = (form, { apiBase, dialog }) => {
    if (!form?.querySelector('[data-automatic-assessment]')) return null;
    const root = form.querySelector('[data-automatic-assessment]');
    const status = root.querySelector('[data-assessment-status]');
    const total = root.querySelector('[data-live-scores]');
    const fields = ['lat', 'lng', 'category', 'subcategory', 'land_area', 'land_area_unit', 'calculated_area_sqm'];
    let controller;
    let timer;
    let revision = 0;
    let legacy = false;
    let lastKey = '';
    let cached = null;

    const inputs = () => {
      const data = Object.fromEntries(fields.map(key => [key, form.elements[key]?.value || '']));
      if (!(Number(data.land_area) > 0) && Number(data.calculated_area_sqm) > 0) {
        data.land_area = data.calculated_area_sqm;
        data.land_area_unit = 'sqm';
      }
      delete data.calculated_area_sqm;
      return data;
    };
    const validLocation = data => data.lat !== '' && data.lng !== '' && Number.isFinite(Number(data.lat)) && Number.isFinite(Number(data.lng)) && Math.abs(Number(data.lat)) <= 90 && Math.abs(Number(data.lng)) <= 180;
    const notice = text => { status.textContent = text; };

    function render(assessment = null, waiting = false) {
      const details = assessment?.criteriaDetails || {};
      root.querySelectorAll('[data-assessment-criterion]').forEach(card => {
        const key = card.dataset.assessmentCriterion;
        const detail = details[key];
        const value = assessment?.assessmentCriteria?.[key];
        const available = value != null && Number.isFinite(Number(value));
        card.querySelector('[data-score-value]').textContent = available ? `${score(value)}%` : 'Awaiting data';
        const bar = card.querySelector('[role="progressbar"]');
        if (available) bar.setAttribute('aria-valuenow', String(value));
        else bar.removeAttribute('aria-valuenow');
        bar.setAttribute('aria-valuetext', available ? `${score(value)} out of 100` : 'Awaiting source data');
        bar.querySelector('span').style.width = `${available ? Math.max(0, Math.min(100, Number(value))) : 0}%`;
        const nextActions = {
          spatial_accessibility: 'Confirm road frontage and access evidence.',
          infrastructure_readiness: 'Confirm electricity, water, and internet.',
          economic_viability: 'Add a dated BIR zonal reference.',
          nearby_businesses: 'Run the radar and confirm inventory coverage.',
          zoning_compatibility: 'Add the parcel zoning and CLUP source.',
          risk_constraints: 'Review hazard sources and parcel coverage.',
          environmental_safety: 'Add environmental classification evidence.',
        };
        card.querySelector('[data-score-justification]').textContent = available ? (detail?.justification || 'Source evidence available.') : (waiting ? 'Checking source evidence…' : nextActions[key]);
        const evidence = card.querySelector('[data-score-evidence]');
        evidence.textContent = (detail?.evidence || []).map(item => [item.layer, item.source, item.version, item.reference].filter(Boolean).join(' · ')).join('; ');
        evidence.hidden = !evidence.textContent;
        const rule = card.querySelector('[data-score-rule]');
        rule.textContent = detail?.formula || detail?.ruleDescription || '';
        rule.hidden = !rule.textContent;
      });
      const complete = assessment?.assessmentComplete === true;
      total.querySelector('[data-total-mce]').textContent = complete ? score(assessment.mceScore) : '—';
      total.querySelector('[data-total-iai]').textContent = complete ? score(assessment.iaiScore) : '—';
      total.querySelector('[data-computed-summary]').textContent = complete ? 'All seven criteria computed from source evidence.' : `${assessment?.completedCount || 0} of 7 criteria ready. A complete source-based assessment is required for totals.`;
      const method = root.querySelector('[data-assessment-method]');
      if (assessment?.assessmentMethod) method.textContent = assessment.assessmentMethod;
      const context = root.querySelector('[data-spatial-context]');
      const rows = (assessment?.spatialContext || []).filter(item => item.value != null);
      context.hidden = !rows.length;
      context.querySelector('dl').innerHTML = rows.map(item => `<div class="tw-min-w-0"><dt class="tw-text-[10px] tw-text-slate-500">${escape(item.label)}</dt><dd class="tw-m-0 tw-mt-1 tw-break-words tw-text-xs tw-font-medium">${escape(item.value)}${item.unit ? ` ${escape(item.unit)}` : ''}</dd></div>`).join('');
      const warning = root.querySelector('[data-legacy-assessment]');
      warning.hidden = !legacy;
      if (typeof window.CustomEvent === 'function') form.dispatchEvent(new CustomEvent('sfc:assessment', {detail: assessment}));
    }

    async function refresh(force = false) {
      clearTimeout(timer);
      const data = inputs();
      const key = JSON.stringify(data);
      if (!force && cached && key === lastKey) { render(cached); return cached; }
      controller?.abort();
      const currentRevision = ++revision;
      if (!validLocation(data)) { cached = null; render(); notice(data.lat || data.lng ? 'Add valid latitude and longitude to calculate spatial scores. You can also clear both coordinates and submit with an area size.' : 'Your listing can be submitted with an area size. Add an exact location later to calculate spatial scores.'); return null; }
      controller = new AbortController();
      render(null, true); notice('Calculating from location and verified source data…');
      try {
        const response = await fetch(`${apiBase}/assessment-preview.php?${new URLSearchParams(data)}`, {credentials:'same-origin', headers:{Accept:'application/json'}, signal:controller.signal});
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'The assessment could not be calculated.');
        if (currentRevision !== revision) return null;
        if (!payload.assessment || payload.assessment.assessmentMode !== 'automatic') throw new Error('The server did not return an automatic assessment.');
        cached = payload.assessment; lastKey = key;
        render(cached);
        notice(cached?.assessmentComplete ? 'System-generated preview. The server recalculates when you save.' : 'Awaiting source data or approved conversion rules. You can save the property for review.');
        return cached;
      } catch (error) {
        if (currentRevision !== revision || error.name === 'AbortError') return null;
        cached = null; render(); notice(error.message);
        return null;
      }
    }

    function changed() {
      controller?.abort(); revision++; cached = null; lastKey = '';
      render(null, true); notice('Location changed. Updating the automatic assessment…');
      clearTimeout(timer); timer = setTimeout(() => refresh(), 300);
    }
    fields.forEach(key => {
      const element = form.elements[key];
      if (element) element.addEventListener(element.tagName === 'SELECT' ? 'change' : 'input', changed);
    });
    root.querySelector('[data-recalculate-assessment]').addEventListener('click', () => refresh(true));
    dialog?.addEventListener('close', () => { controller?.abort(); revision++; clearTimeout(timer); });
    return {
      refresh,
      setProperty(property) {
        controller?.abort(); revision++; clearTimeout(timer); cached = null; lastKey = '';
        legacy = Boolean(property && property.assessmentMode !== 'automatic' && Object.values(property.assessmentCriteria || {}).some(value => value != null));
        render(); notice('Scores are optional at submission and depend on verified source evidence.');
      },
    };
  };
})();
