/* Native, once-per-visit motion shared by current and legacy LOCUS-SF pages. */
(() => {
  'use strict';
  if (window.LOCUS_MOTION) return;

  const main = document.querySelector('main') || document.querySelector('[data-investment-assistant]');
  if (!main) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const depthAllowed = matchMedia('(min-width: 851px) and (pointer: fine)');
  const root = document.documentElement;
  const selector = [
    '[data-locus-reveal]', 'main > section', '.section-block',
    '.city-section-heading', '.discovery-section-heading', '.city-concierge-header',
    '.glance-profile-header', '.glance-city-portrait',
    '.glance-fact', '.locator-section-header', '.locator-card',
    '.city-why-card', '.discovery-trail', '.city-concierge-card',
    '.city-property-card', '.city-about', '.city-benefits > article',
    '.city-detail-panel', '.city-stats > .city-stat', '.city-account-gate',
    '.property-section', '.property-section-heading', '.ci-section',
    '.report-section', '.report-card', '.report-stat', '.city-page-heading',
    '.page-intro-card', '.panel-card', '.stat-card', '.comparison-card',
    '.request-card', '.visit-window-card', '.command-score-card',
    '.search-result-card', '.role-card', '.news-card', '.about-stat-card',
    '.explorer-card', '.prospectus-card', '.readiness-pillar-card',
    '.readiness-editor-card', '.intent-card', '.cta-card', '.landing-panel',
    '.landing-role-link', '.landing-showcase-card', '.landing-ranking-mini',
    '.landing-demand-card', '.final-cta-card', '.property-card', '.vote-card',
    '.showcase-card', '.showcase-spotlight-card', '.showcase-admin-card',
    '.showcase-card-section', '.spotlight-card', '.decision-card', '.contact-card',
    '.ia-property-card', '.ia-results-head', '.agent-directory-card',
    '.broker-kpi-card', '.broker-listing-card', '.broker-section-head', '.broker-document-card',
    '.city-listing-card', '.city-property-stat', '.city-compare-column', '.admin-stat-card',
    '.ci-kpi-card', '.ci-card', '.ci-section-header',
    '.property-layout > .property-panel', '.profile-section-header', '.profile-preferences-heading',
    'main[data-city-workspace="overview"] > div > section',
    'main.city-prose > h2', 'main.city-prose > p'
  ].join(',');
  const excluded = [
    '[data-locus-motion="off"]', '[data-locus-hero]', '.city-hero',
    '.city-hero-frame', '.admin-hero-card', '.hero', '[data-hero-stage]',
    'header', 'nav', 'footer', 'dialog', '[role="dialog"]', '[role="tabpanel"]',
    '[role="tablist"]', '[role="grid"]', '[role="log"]', '[role="status"]', '[role="alert"]',
    '[inert]', '[hidden]', 'table', '.city-table-wrap', '.report-table-scroll',
    '.leaflet-container', '.maplibregl-map', '.city-map-panel', '.city-map-canvas',
    '.map-panel-card', '.explorer-map-studio', '.property-wizard', '.pw-workspace',
    '.ia-chat', '.ia-chat-body', '.ia-conversation', '.ia-conversation-body',
    '.ia-map-panel', '.thread-card', '.visit-thread-card',
    '.locus-help-dialog', '.city-navigation', '.auth-visual', '.auth-surface',
    '#locus-react-hero', '#locus-civic-metrics', '[data-locus-reveal="off"]'
  ].join(',');
  const containedIslands = 'dialog, [role="dialog"], [role="tabpanel"], [role="tablist"], [role="grid"], [role="log"], form, table, .city-table-wrap, .report-table-scroll, .leaflet-container, .maplibregl-map, .city-map-panel, .city-map-canvas, .map-panel-card, .explorer-map-studio, .property-wizard, .pw-workspace, .ia-conversation, .ia-conversation-body, .ia-map-panel, .thread-card, .visit-thread-card, #locus-react-hero, #locus-civic-metrics, [data-locus-motion="off"]';
  const interactiveIslands = '#locus-react-hero, #locus-civic-metrics, .leaflet-container, .maplibregl-map, .city-map-panel, .city-map-canvas, [data-locus-motion="off"], [data-locus-interaction="off"], [role="slider"], [role="spinbutton"], .sfc-password-toggle';
  const actionSelector = 'button, a.city-button, a.account-submit, a[class*="-btn"], a[class*="-button"], a.ia-card-actions-link, .ia-card-actions > a, .city-header nav > a';
  const disclosureSelector = 'details.property-disclosure, details.property-criterion-disclosure, details.property-assessment-disclosure, details.city-method, details.ia-card-disclosure, details.ia-assessment';
  const panelSelector = '[role="tabpanel"], [data-media-pane], .ci-tab-pane';
  const records = new WeakMap();
  const seenKeys = new Set();
  const pending = new Set();
  const active = new Set();
  const panels = new Set();
  const artwork = new Set();
  const visibleArtwork = new Set();
  let revealObserver;
  let depthObserver;
  let mutations;
  let interactions;
  let headerObserver;
  let depthFrame = 0;
  let refreshFrame = 0;
  let suspended = document.hidden;
  let disabled = false;
  const addedRoots = new Set();

  const enabled = () => !disabled && !suspended && !reduced.matches;
  const hasBox = node => node.getClientRects().length > 0;
  const isScrollable = style => /(auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`);

  function identity(node) {
    if (node.id) return `id:${node.id}`;
    for (const key of ['data-ia-property', 'data-property-id', 'data-listing-id', 'data-agent-id']) {
      if (node.hasAttribute(key)) return `${node.tagName}:${key}:${node.getAttribute(key)}`;
    }
    return null;
  }

  function remember(node, record) {
    record.seen = true;
    if (record.key) seenKeys.add(record.key);
    node.dataset.locusMotion = 'seen';
  }

  // Transforming a parent must never change a map, fixed control or nested
  // scroll panel's coordinate system. Guard both the ancestry and descendants.
  function safe(node) {
    if (!(node instanceof HTMLElement) || !main.contains(node) || node.closest(excluded) || !hasBox(node)) return false;
    for (let parent = node; parent && parent !== main; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.position === 'fixed' || style.position === 'sticky' || isScrollable(style)) return false;
    }
    // Ignore collapsed drawers, but never move visible maps or scroll panels.
    // Bound the read pass so a large dashboard cannot trigger a subtree scan.
    let inspected = 0;
    let unsafe = false;
    if (node.childElementCount > 48) return false;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, {
      acceptNode(child) {
        if (++inspected > 128) { unsafe = true; return NodeFilter.FILTER_REJECT; }
        if (child.hidden || child.inert || child.getAttribute('aria-hidden') === 'true') return NodeFilter.FILTER_REJECT;
        const style = getComputedStyle(child);
        if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
        if (child.matches(containedIslands) || style.position === 'fixed' || style.position === 'sticky' || isScrollable(style)) {
          unsafe = true;
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (!unsafe && walker.nextNode()) { /* Read visible descendants only. */ }
    if (unsafe) return false;
    const style = getComputedStyle(node);
    return style.visibility !== 'hidden' && style.animationName === 'none'
      && (style.translate === 'none' || style.translate === '0px')
      && Number(style.opacity) > 0;
  }

  function clearAnimation(node) {
    node.classList.remove('locus-reveal-active');
    node.style.removeProperty('--locus-motion-delay');
    node.style.removeProperty('--locus-motion-opacity');
    active.delete(node);
  }

  function settle(node) {
    const record = records.get(node);
    if (!record) return;
    remember(node, record);
    pending.delete(node);
    revealObserver?.unobserve(node);
    clearAnimation(node);
  }

  function finish(scope = main) {
    for (const node of [...pending, ...active]) {
      if (scope === main || scope === document || scope === node || scope.contains?.(node) || node.contains(scope)) settle(node);
    }
    for (const node of panels) if (scope === document || scope === main || scope === node || scope.contains?.(node)) {
      node.classList.remove('locus-panel-enter-active');
      panels.delete(node);
    }
  }

  function staggerIndex(node) {
    const unit = node.closest('.glance-stat-group') || node;
    if (!unit.parentElement) return 0;
    const siblings = [...unit.parentElement.children].filter(child => child.matches(selector) || child.matches('.glance-stat-group'));
    return Math.max(0, siblings.indexOf(unit)) % 4;
  }

  function enter(node) {
    const record = records.get(node);
    if (!record || record.seen) return;
    pending.delete(node);
    revealObserver?.unobserve(node);
    remember(node, record);
    if (!enabled() || !node.isConnected || !hasBox(node) || node.contains(document.activeElement)) return;
    const bounds = node.getBoundingClientRect();
    if (bounds.bottom < 0) return;
    node.style.setProperty('--locus-motion-delay', `${record.index * 75}ms`);
    node.style.setProperty('--locus-motion-opacity', getComputedStyle(node).opacity);
    active.add(node);
    node.classList.add('locus-reveal-active');
    // CSS ends naturally with fill:backwards, so even a later script failure
    // cannot leave the unit transparent or translated indefinitely.
  }

  function reveal(node, options = {}) {
    if (!(node instanceof HTMLElement) || records.has(node)) return;
    if ([...node.querySelectorAll(selector)].some(child => !child.closest('[hidden], [inert]'))) return;
    if (!safe(node)) return;
    if (node.parentElement?.closest('[data-locus-motion="pending"], .locus-reveal-active')) return;
    const record = { seen: false, key: identity(node), index: Math.min(3, Math.max(0, options.index ?? staggerIndex(node))) };
    records.set(node, record);
    const bounds = node.getBoundingClientRect();
    // The initial viewport, restored scroll position, heroes and previous
    // content stay stable. Only content still below the viewport can reveal.
    if (!enabled() || !revealObserver || (record.key && seenKeys.has(record.key)) || bounds.top <= innerHeight + 80) {
      remember(node, record);
      return;
    }
    node.dataset.locusMotion = 'pending';
    pending.add(node);
    revealObserver.observe(node);
  }

  function resetDepth() {
    cancelAnimationFrame(depthFrame);
    depthFrame = 0;
    for (const node of artwork) node.style.removeProperty('--locus-parallax-y');
  }

  function renderDepth() {
    depthFrame = 0;
    if (!enabled() || !depthAllowed.matches) return;
    const updates = [];
    for (const node of visibleArtwork) {
      if (!node.isConnected) { visibleArtwork.delete(node); artwork.delete(node); continue; }
      const box = (node.closest('picture') || node).getBoundingClientRect();
      const progress = (innerHeight / 2 - (box.top + box.height / 2)) / ((innerHeight + box.height) / 2);
      updates.push([node, Math.max(-6, Math.min(6, progress * 6))]);
    }
    for (const [node, y] of updates) node.style.setProperty('--locus-parallax-y', `${y.toFixed(2)}px`);
  }

  function scheduleDepth() {
    if (!depthFrame && visibleArtwork.size && enabled() && depthAllowed.matches) depthFrame = requestAnimationFrame(renderDepth);
  }

  function refresh(scope = main) {
    const nodes = [];
    if (scope instanceof HTMLElement && scope.matches(selector)) nodes.push(scope);
    if (scope.querySelectorAll) nodes.push(...scope.querySelectorAll(selector));
    nodes.forEach(node => reveal(node));
    prepareInteractions(scope);
    const imageSelector = '.glance-portrait-art, img[data-locus-parallax]';
    const images = [...(scope.querySelectorAll?.(imageSelector) || [])];
    if (scope instanceof HTMLImageElement && scope.matches(imageSelector)) images.unshift(scope);
    for (const image of images) {
      if (artwork.has(image) || image.closest(excluded) || !hasBox(image)) continue;
      artwork.add(image);
      image.classList.add('locus-parallax');
      depthObserver?.observe(image);
    }
  }

  function prepareInteractions(scope) {
    const find = selector => {
      const items = [...(scope.querySelectorAll?.(selector) || [])];
      if (scope instanceof HTMLElement && scope.matches(selector)) items.unshift(scope);
      return items;
    };
    for (const control of find(actionSelector)) {
      if (control.hasAttribute('data-locus-press') || control.closest(interactiveIslands) || control.matches('[data-no-motion]')) continue;
      control.dataset.locusPress = control.matches('.city-button, .account-submit, .profile-save-button, .broker-btn-submit') ? 'lift' : 'press';
    }
    for (const details of find(disclosureSelector)) {
      if (!details.closest(interactiveIslands) && !details.querySelector('.leaflet-container, .city-map-canvas, iframe')) details.dataset.locusDisclosure = '';
    }
    for (const dialog of find('dialog')) dialog.dataset.locusDialog = '';
  }

  function showPanel(node) {
    if (!(node instanceof HTMLElement) || !node.matches(panelSelector) || !enabled() || node.hidden || !hasBox(node) || panels.has(node)) return;
    finish(node);
    panels.add(node);
    node.classList.add('locus-panel-enter-active');
  }

  function failOpen() {
    disabled = true;
    finish();
    resetDepth();
    revealObserver?.disconnect();
    depthObserver?.disconnect();
    mutations?.disconnect();
    interactions?.disconnect();
    headerObserver?.disconnect();
    cancelAnimationFrame(refreshFrame);
    addedRoots.clear();
  }

  function revealHash() {
    try {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = id && document.getElementById(id);
      if (target) finish(target);
    } catch { /* Malformed optional hashes do not affect content visibility. */ }
  }

  window.LOCUS_MOTION = { reveal, refresh, finish };
  try {
    prepareInteractions(document);
    interactions = new MutationObserver(changes => {
      try {
        for (const change of changes) {
          if (change.type === 'attributes') {
            if (change.attributeName === 'hidden' && change.oldValue !== null && !change.target.hidden) showPanel(change.target);
            continue;
          }
          for (const node of change.addedNodes) {
            if (node instanceof HTMLElement && !node.closest(interactiveIslands)
              && (!main.contains(node) || node.closest(excluded))) prepareInteractions(node);
          }
        }
      } catch { /* Interaction styling never blocks native controls. */ }
    });
    interactions.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'], attributeOldValue: true });
    document.addEventListener('click', event => {
      const tab = event.target.closest?.('[role="tab"][aria-controls]');
      if (tab && tab.getAttribute('aria-selected') !== 'true' && !tab.closest(interactiveIslands)) requestAnimationFrame(() => showPanel(document.getElementById(tab.getAttribute('aria-controls'))));
    }, true);
    document.addEventListener('pointerdown', event => finish(event.target), { passive: true });
    document.addEventListener('pointerover', event => {
      if (event.pointerType === 'mouse' && event.target.closest?.('[data-locus-press], a, input, select, textarea, summary')) finish(event.target);
    }, { passive: true });
    document.addEventListener('animationend', event => {
      if (event.animationName === 'locus-panel-enter') {
        event.target.classList.remove('locus-panel-enter-active');
        panels.delete(event.target);
      }
    });
    document.addEventListener('animationcancel', event => {
      if (event.animationName === 'locus-panel-enter') {
        event.target.classList.remove('locus-panel-enter-active');
        panels.delete(event.target);
      }
    });
    const header = document.querySelector('.city-header');
    if (header && 'ResizeObserver' in window) {
      headerObserver = new ResizeObserver(() => {
        const height = Math.ceil(header.getBoundingClientRect().height);
        root.style.setProperty('--locus-anchor-offset', `${height + 14}px`);
      });
      headerObserver.observe(header);
    }
    if (!('IntersectionObserver' in window) || !CSS.supports('translate', '0px 1px')) return;
    if (!getComputedStyle(root).getPropertyValue('--locus-motion-duration').trim()) return;
    revealObserver = new IntersectionObserver(entries => {
      try { entries.filter(entry => entry.isIntersecting).forEach(entry => enter(entry.target)); }
      catch { failOpen(); }
    }, { rootMargin: '0px 0px 80px 0px', threshold: 0 });
    depthObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleArtwork.add(entry.target);
        else { visibleArtwork.delete(entry.target); entry.target.style.removeProperty('--locus-parallax-y'); }
      });
      scheduleDepth();
    }, { threshold: 0 });

    main.addEventListener('animationend', event => {
      if (event.animationName === 'locus-enter') clearAnimation(event.target);
    });
    main.addEventListener('animationcancel', event => {
      if (event.animationName === 'locus-enter') clearAnimation(event.target);
    });
    document.addEventListener('focusin', event => finish(event.target));
    window.addEventListener('hashchange', revealHash);
    window.addEventListener('scroll', scheduleDepth, { passive: true });
    window.addEventListener('resize', scheduleDepth, { passive: true });
    window.addEventListener('beforeprint', () => { finish(); resetDepth(); });
    document.addEventListener('visibilitychange', () => {
      suspended = document.hidden;
      if (suspended) { finish(); resetDepth(); }
      else scheduleDepth();
    });
    window.addEventListener('pagehide', () => { suspended = true; finish(); resetDepth(); });
    window.addEventListener('pageshow', () => { suspended = false; scheduleDepth(); });
    reduced.addEventListener('change', () => {
      if (reduced.matches) { finish(); resetDepth(); }
      else scheduleDepth();
    });
    depthAllowed.addEventListener('change', () => {
      if (!depthAllowed.matches) resetDepth();
      else scheduleDepth();
    });
    mutations = new MutationObserver(changes => {
      for (const change of changes) for (const node of change.addedNodes) {
        if (node instanceof HTMLElement && !node.closest(excluded)) addedRoots.add(node);
      }
      const removed = changes.some(change => change.removedNodes.length > 0);
      if ((!addedRoots.size && !removed) || refreshFrame) return;
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = 0;
        try {
          const roots = [...addedRoots].filter(node => {
            if (!node.isConnected) return false;
            for (let parent = node.parentElement; parent && parent !== main; parent = parent.parentElement) if (addedRoots.has(parent)) return false;
            return true;
          });
          for (const node of roots) refresh(node);
          addedRoots.clear();
          // Release removed collection entries instead of retaining old cards.
          for (const node of pending) if (!node.isConnected) { pending.delete(node); revealObserver?.unobserve(node); }
          for (const node of active) if (!node.isConnected) clearAnimation(node);
          for (const node of panels) if (!node.isConnected) { node.classList.remove('locus-panel-enter-active'); panels.delete(node); }
          for (const image of artwork) if (!image.isConnected) {
            artwork.delete(image);
            visibleArtwork.delete(image);
            depthObserver?.unobserve(image);
          }
        } catch { failOpen(); }
      });
    });
    mutations.observe(main, { childList: true, subtree: true });
    refresh();
    revealHash();
    root.dataset.locusMotionReady = 'true';
  } catch { failOpen(); }
})();
