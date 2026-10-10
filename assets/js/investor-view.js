(() => {
  'use strict';
  const config = window.SFC_APP_CONFIG || {};
  const enabled = ['investor', 'guest'].includes(config.role || config.user?.role || 'guest');
  const root = document.documentElement;
  const storageKey = `locus.investor-view:${config.basePath || ''}:${config.user?.id || 'guest'}`;
  const valid = value => value === 'basic' || value === 'advanced';
  let mode = enabled ? 'basic' : 'advanced';
  if (enabled) {
    for (const name of ['localStorage', 'sessionStorage']) {
      try {
        const stored = window[name].getItem(storageKey);
        if (valid(stored)) { mode = stored; break; }
      } catch { /* Browsers may disable storage. The view remains usable. */ }
    }
  }
  root.dataset.investorViewEnabled = String(enabled);
  root.dataset.investorView = mode;

  function refresh(scope = document) {
    scope.querySelectorAll('[data-investor-view-toolbar]').forEach(toolbar => { toolbar.hidden = !enabled; });
    scope.querySelectorAll('[data-investor-view-control]').forEach(control => {
      if (control && control.dataset) {
        control.dataset.active = mode;
        let pill = control.querySelector?.('.investor-view-pill');
        if (!pill && typeof control.insertBefore === 'function' && typeof document?.createElement === 'function') {
          pill = document.createElement('span');
          pill.className = 'investor-view-pill';
          pill.setAttribute('aria-hidden', 'true');
          control.insertBefore(pill, control.firstChild);
        }
      }
    });
    scope.querySelectorAll('[data-investor-mode]').forEach(button => {
      const active = button.dataset.investorMode === mode;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
    });
    scope.querySelectorAll('[data-investor-view-description]').forEach(node => {
      node.textContent = mode === 'basic'
        ? 'Price, area and location first. Hazard notices stay visible.'
        : 'Explore assessment scores, calculations, evidence and site context.';
    });
  }

  function set(next, options = {}) {
    if (!enabled || !valid(next)) { return mode; }
    const changed = mode !== next;
    if (next === 'basic') {
      const active = document.activeElement;
      if (active?.closest('[data-investor-advanced]')) {
        document.querySelector('[data-investor-mode="basic"]')?.focus({ preventScroll: true });
      }
    }
    mode = next;
    root.dataset.investorView = mode;
    if (options.persist !== false) {
      for (const name of ['localStorage', 'sessionStorage']) {
        try { window[name].setItem(storageKey, mode); } catch { /* Keep the current view even when storage is full or blocked. */ }
      }
    }
    refresh();
    if (changed) {
      document.querySelectorAll('[data-investor-view-announcement]').forEach(node => {
        node.textContent = mode === 'basic' ? 'Basic view selected. Hazard notices remain visible.' : 'Advanced view selected. Assessment details are now available.';
      });
      window.dispatchEvent(new CustomEvent('sfc:investor-view-change', { detail: { mode } }));
    }
    return mode;
  }

  window.SFCInvestorView = Object.freeze({ get: () => mode, set, refresh });
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-investor-mode]');
    if (button && button.closest('[data-investor-view-control]')) { set(button.dataset.investorMode); }
  });
  document.addEventListener('keydown', event => {
    const button = event.target.closest?.('[data-investor-mode]');
    const control = button?.closest('[data-investor-view-control]');
    if (!control || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { return; }
    event.preventDefault();
    const next = event.key === 'Home' ? 'basic' : event.key === 'End' ? 'advanced'
      : button.dataset.investorMode === 'basic' ? 'advanced' : 'basic';
    control.querySelector(`[data-investor-mode="${next}"]`)?.focus();
    set(next);
  });
  window.addEventListener('storage', event => {
    if (event.key === storageKey) { set(valid(event.newValue) ? event.newValue : 'basic', { persist: false }); }
  });
  const ready = () => {
    refresh();
    new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1
        && (node.matches('[data-investor-view-toolbar], [data-investor-view-control]')
          || node.querySelector('[data-investor-view-toolbar], [data-investor-view-control]'))))) { refresh(); }
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', ready, { once: true }); }
  else { ready(); }
})();
