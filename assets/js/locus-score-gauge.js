/* ==========================================================================
   LOCUS-SF Universal 20-Segment Radial Score Arch Engine
   Generates polar-wedge ticks, handles scroll/tab reveal sweeps, numeric
   count-up, live score updates, and pulsing loading waves across all views.
   ========================================================================== */
(function (global) {
  'use strict';

  const SEGMENTS = 20;
  const CX = 100;
  const CY = 102;
  const R_IN = 63;
  const R_OUT = 88;
  const START_DEG = -186;
  const SWEEP_DEG = 192;
  const STEP_DEG = SWEEP_DEG / SEGMENTS;
  const GAP_DEG = 2.6;

  // Natural editorial 20-step spectrum (terracotta -> warm ochre -> gold -> botanical emerald)
  const PALETTE = [
    '#b84517', '#c45218', '#cf611a', '#d9711e', '#e18323',
    '#e7952a', '#eba834', '#eeba3f', '#ecc948', '#e3d04b',
    '#ced048', '#b7cc44', '#9ec541', '#84bd42', '#6ab547',
    '#52ac4f', '#3ea357', '#2f995f', '#248f64', '#1d8364'
  ];

  const DEG = Math.PI / 180;
  const pt = (r, deg) => [
    (CX + r * Math.cos(deg * DEG)).toFixed(2),
    (CY + r * Math.sin(deg * DEG)).toFixed(2)
  ];

  // Precompute all 20 radial wedge SVG paths once
  const SEGMENT_PATHS = Array.from({ length: SEGMENTS }, (_, i) => {
    const a0 = START_DEG + i * STEP_DEG + GAP_DEG / 2;
    const a1 = a0 + (STEP_DEG - GAP_DEG);
    const [ox0, oy0] = pt(R_OUT, a0);
    const [ox1, oy1] = pt(R_OUT, a1);
    const [ix1, iy1] = pt(R_IN, a1);
    const [ix0, iy0] = pt(R_IN, a0);
    return `M ${ox0} ${oy0} A ${R_OUT} ${R_OUT} 0 0 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${R_IN} ${R_IN} 0 0 0 ${ix0} ${iy0} Z`;
  });

  function clampFraction(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n > 1 ? n / 100 : n));
  }

  function activeTickCount(fraction) {
    const f = clampFraction(fraction);
    if (f <= 0) return 0;
    return Math.max(1, Math.min(SEGMENTS, Math.round(f * SEGMENTS)));
  }

  function tierLabelForScore(score) {
    const n = Number(score);
    if (!Number.isFinite(n)) return 'Pending';
    if (n >= 85) return 'Prime Fit';
    if (n >= 70) return 'High';
    if (n >= 50) return 'Average';
    if (n >= 30) return 'Low';
    return 'Very Low';
  }

  function buildSvgMarkup(fraction, opts = {}) {
    const loading = Boolean(opts.loading);
    const active = loading ? 0 : activeTickCount(fraction);
    const paths = SEGMENT_PATHS.map((d, i) => {
      const filled = i < active ? ' is-filled' : '';
      return `<path class="locus-seg-tick${filled}" d="${d}" style="--tick-idx:${i};--tick-color:${PALETTE[i]}" data-tick="${i}"/>`;
    }).join('');
    return `<svg class="locus-seg-arch-svg" viewBox="0 0 200 116" aria-hidden="true" focusable="false">${paths}</svg>`;
  }

  function buildLoaderMarkup(caption = 'Loading assessment…') {
    const esc = String(caption).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return `<div class="locus-seg-loader-shell" role="status" aria-live="polite">
      <div class="locus-seg-gauge is-sm" data-score-arch data-loading="true" data-score-fraction="0">
        <div class="locus-seg-arch-stage">
          ${buildSvgMarkup(0, { loading: true })}
          <div class="locus-seg-center"><span class="locus-seg-center-val">&hellip;</span></div>
        </div>
      </div>
      <p class="locus-seg-loader-caption">${esc}</p>
    </div>`;
  }

  const prefersReducedMotion = () =>
    typeof global.matchMedia === 'function' && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hydrateSvg(el) {
    const svg = el.querySelector('.locus-seg-arch-svg');
    if (!svg) return;
    const loading = el.getAttribute('data-loading') === 'true';
    const rawFrac = el.getAttribute('data-score-fraction') ?? el.style.getPropertyValue('--score-fraction');
    const active = loading ? 0 : activeTickCount(rawFrac);

    if (svg.querySelectorAll('.locus-seg-tick').length !== SEGMENTS) {
      svg.setAttribute('viewBox', '0 0 200 116');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.innerHTML = SEGMENT_PATHS.map((d, i) => {
        const filled = i < active ? ' is-filled' : '';
        return `<path class="locus-seg-tick${filled}" d="${d}" style="--tick-idx:${i};--tick-color:${PALETTE[i]}" data-tick="${i}"/>`;
      }).join('');
    } else {
      svg.querySelectorAll('.locus-seg-tick').forEach((path, i) => {
        path.classList.toggle('is-filled', !loading && i < active);
      });
    }
  }

  function animateNumericReadout(el) {
    if (prefersReducedMotion()) return;
    if (el.getAttribute('data-loading') === 'true' || el.getAttribute('data-pending') === 'true') return;
    const target = el.querySelector('[data-score-count]') || el.querySelector('[data-active-assessment-score] strong');
    if (!target) return;

    // Preserve child elements like <small>/100</small> by animating the leading text node if present
    const hasChildEl = target.children && target.children.length > 0;
    const textNode = hasChildEl
      ? Array.from(target.childNodes).find(n => n.nodeType === 3 && n.nodeValue && n.nodeValue.trim())
      : null;
    const readText = () => (textNode ? textNode.nodeValue : target.textContent) || '';
    const writeText = (val) => {
      if (textNode) textNode.nodeValue = val;
      else target.textContent = val;
    };

    const raw = (target.getAttribute('data-target-score') || readText()).trim();
    const match = raw.match(/^(-?\d+(?:\.\d+)?)(\s*(?:%|\/\s*100)?)$/);
    if (!match) return;
    const endVal = Number(match[1]);
    if (!Number.isFinite(endVal) || endVal <= 0) return;
    const suffix = match[2] || '';
    const decimals = match[1].includes('.') ? match[1].split('.')[1].length : 0;
    target.setAttribute('data-target-score', raw);

    if (target._locusCountRaf) cancelAnimationFrame(target._locusCountRaf);
    const duration = 560;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = endVal * eased;
      writeText(`${cur.toFixed(decimals)}${suffix}`);
      if (t < 1) {
        target._locusCountRaf = requestAnimationFrame(tick);
      } else {
        writeText(raw);
        target._locusCountRaf = 0;
      }
    };
    target._locusCountRaf = requestAnimationFrame(tick);
  }

  function pulseAndReveal(root = document, durationMs = 240) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    const list = root.matches && root.matches('[data-score-arch]')
      ? [root]
      : Array.from(root.querySelectorAll('[data-score-arch]'));
    if (!list.length) return;
    if (prefersReducedMotion()) {
      list.forEach((el) => {
        el.removeAttribute('data-loading');
        hydrateSvg(el);
        el.dataset.archRevealed = '1';
      });
      return;
    }
    list.forEach((el) => {
      if (el._locusPulseTimer) clearTimeout(el._locusPulseTimer);
      el.setAttribute('data-loading', 'true');
      el.classList.remove('is-primed', 'is-revealing');
      hydrateSvg(el);
      el._locusPulseTimer = setTimeout(() => {
        el._locusPulseTimer = 0;
        el.removeAttribute('data-loading');
        delete el.dataset.archRevealed;
        triggerReveal(el, true);
      }, durationMs);
    });
  }

  let routeLoaderEl = null;
  let routeLoaderTimer = 0;
  function routeLoaderMessage(pathname) {
    if (/property-details\.php/i.test(pathname)) return ['Opening site assessment', 'Loading MCE scores and evidence'];
    if (/property-ranking\.php/i.test(pathname)) return ['Opening priority board', 'Preparing ranked site assessments'];
    if (/property-compare\.php/i.test(pathname)) return ['Opening side-by-side compare', 'Aligning property scores and facts'];
    if (/property-explorer\.php|investor-dashboard\.php/i.test(pathname)) return ['Loading property explorer', 'Gathering listings and scores'];
    if (/admin-properties\.php|broker-dashboard\.php/i.test(pathname)) return ['Opening property desk', 'Loading MCE readiness evaluations'];
    return ['Loading assessment view', 'Preparing LOCUS-SF scores'];
  }

  function showRouteLoader(title = 'Loading assessment', sub = 'Preparing LOCUS-SF scores') {
    if (typeof document === 'undefined' || !document.body) return;
    if (!routeLoaderEl) {
      routeLoaderEl = document.createElement('div');
      routeLoaderEl.className = 'locus-route-loader';
      routeLoaderEl.setAttribute('role', 'status');
      routeLoaderEl.setAttribute('aria-live', 'polite');
      routeLoaderEl.innerHTML = `<div class="locus-route-loader-card">
        <div class="locus-seg-gauge is-sm" data-score-arch data-loading="true" data-score-fraction="0">
          <div class="locus-seg-arch-stage">
            ${buildSvgMarkup(0, { loading: true })}
            <div class="locus-seg-center"><span class="locus-seg-center-val">&hellip;</span></div>
          </div>
        </div>
        <p class="locus-route-loader-title" data-route-loader-title></p>
        <p class="locus-route-loader-sub" data-route-loader-sub></p>
      </div>`;
      document.body.appendChild(routeLoaderEl);
    }
    const titleEl = routeLoaderEl.querySelector('[data-route-loader-title]');
    const subEl = routeLoaderEl.querySelector('[data-route-loader-sub]');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;
    requestAnimationFrame(() => routeLoaderEl?.classList.add('is-visible'));
    clearTimeout(routeLoaderTimer);
    routeLoaderTimer = setTimeout(hideRouteLoader, 7000);
  }

  function hideRouteLoader() {
    clearTimeout(routeLoaderTimer);
    routeLoaderEl?.classList.remove('is-visible');
  }

  function attachRouteTransitionLoader() {
    if (typeof document === 'undefined' || document._locusRouteLoaderBound) return;
    document._locusRouteLoaderBound = true;
    const SCORING_ROUTE_RE = /\/(property-details|property-ranking|property-compare|property-explorer|investor-dashboard|admin-properties|broker-dashboard)\.php$/i;
    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target?.closest?.('a[href]');
      if (!anchor) return;
      if (anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      const rawHref = anchor.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) return;
      let url;
      try {
        url = new URL(anchor.href, global.location.href);
      } catch {
        return;
      }
      if (url.origin !== global.location.origin) return;
      if (url.pathname === global.location.pathname && url.search === global.location.search) return;
      if (!SCORING_ROUTE_RE.test(url.pathname)) return;
      const [title, sub] = routeLoaderMessage(url.pathname);
      showRouteLoader(title, sub);
    }, { capture: false });
    global.addEventListener('pageshow', hideRouteLoader);
  }

  function triggerReveal(el, animateNumber = true) {
    if (!el || el.getAttribute('data-loading') === 'true') return;
    hydrateSvg(el);
    if (prefersReducedMotion()) {
      el.classList.remove('is-primed', 'is-revealing');
      el.dataset.archRevealed = '1';
      return;
    }
    el.classList.remove('is-primed', 'is-revealing');
    void el.offsetWidth; // restart CSS keyframe cleanly
    el.classList.add('is-revealing');
    el.dataset.archRevealed = '1';
    if (animateNumber) animateNumericReadout(el);
  }

  function updateGauge(el, opts = {}) {
    if (!el) return;
    if (opts.fraction !== undefined && opts.fraction !== null) {
      const f = clampFraction(opts.fraction);
      el.style.setProperty('--score-fraction', String(f));
      el.setAttribute('data-score-fraction', String(f));
    } else if (opts.score !== undefined && opts.score !== null) {
      const f = clampFraction(Number(opts.score) / 100);
      el.style.setProperty('--score-fraction', String(f));
      el.setAttribute('data-score-fraction', String(f));
    }
    if (opts.pending !== undefined) {
      el.setAttribute('data-pending', String(Boolean(opts.pending)));
    }
    if (opts.loading !== undefined) {
      el.setAttribute('data-loading', String(Boolean(opts.loading)));
    }
    hydrateSvg(el);
    if (opts.loading) {
      el.classList.remove('is-primed', 'is-revealing');
    } else if (opts.animate !== false) {
      triggerReveal(el, opts.animateNumber !== false);
    }
  }

  let io = null;
  function ensureObserver() {
    if (io || typeof IntersectionObserver === 'undefined') return io;
    io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        triggerReveal(el, true);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -24px 0px' });
    return io;
  }

  function isElementVisible(el) {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function enhanceLoadingShells(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('.city-loading').forEach((el) => {
      if (el.dataset.segLoaderUpgraded) return;
      const text = (el.textContent || '').trim();
      if (!text || el.children.length > 0) return;
      el.dataset.segLoaderUpgraded = '1';
      el.innerHTML = buildLoaderMarkup(text);
    });
  }

  function observeAll(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    enhanceLoadingShells(root);
    const observer = ensureObserver();
    const list = root.matches && root.matches('[data-score-arch]')
      ? [root]
      : Array.from(root.querySelectorAll('[data-score-arch]'));

    list.forEach((el) => {
      hydrateSvg(el);
      if (el.getAttribute('data-loading') === 'true') return;
      if (el.dataset.archRevealed === '1') return;
      if (prefersReducedMotion()) {
        el.dataset.archRevealed = '1';
        return;
      }
      if (isElementVisible(el) && observer) {
        el.classList.add('is-primed');
        observer.observe(el);
      } else if (!observer) {
        triggerReveal(el, true);
      }
    });

    const hazardMeters = root.matches && root.matches('[data-hazard-meter]')
      ? [root]
      : Array.from(root.querySelectorAll('[data-hazard-meter]'));
    hazardMeters.forEach((meter) => {
      if (meter.dataset.hmeterRevealed === '1' || prefersReducedMotion()) {
        meter.dataset.hmeterRevealed = '1';
        return;
      }
      if (isElementVisible(meter)) {
        meter.classList.remove('is-revealing');
        void meter.offsetWidth;
        meter.classList.add('is-revealing');
        meter.dataset.hmeterRevealed = '1';
      }
    });

    const dotRings = root.matches && root.matches('[data-dot-ring]')
      ? [root]
      : Array.from(root.querySelectorAll('[data-dot-ring]'));
    dotRings.forEach((ring) => {
      if (ring.dataset.dotRingRevealed === '1' || prefersReducedMotion()) {
        ring.dataset.dotRingRevealed = '1';
        return;
      }
      if (isElementVisible(ring)) {
        ring.classList.remove('is-revealing');
        void ring.offsetWidth;
        ring.classList.add('is-revealing');
        ring.dataset.dotRingRevealed = '1';
      }
    });
  }

  // Re-trigger sweeps when dialogs/tabs/steps/drawers unhide
  function startAutoHydration() {
    observeAll(document);
    attachRouteTransitionLoader();
    if (typeof MutationObserver === 'undefined' || !document.body) return;
    let raf = 0;
    const pendingNodes = new Set();
    const flush = () => {
      raf = 0;
      pendingNodes.forEach((node) => observeAll(node));
      pendingNodes.clear();
    };
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === 1) pendingNodes.add(node);
          });
        } else if (m.type === 'attributes' && m.target && m.target.nodeType === 1) {
          if (m.attributeName === 'hidden' && !m.target.hidden) {
            pendingNodes.add(m.target);
          } else if (m.attributeName === 'open' && m.target.hasAttribute('open')) {
            pendingNodes.add(m.target);
          } else if (m.attributeName === 'class' && m.target.classList.contains('is-open')) {
            pendingNodes.add(m.target);
          }
        }
      }
      if (pendingNodes.size && !raf) {
        raf = requestAnimationFrame(flush);
      }
    });
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'open', 'class']
    });
  }

  global.LocusScoreGauge = {
    SEGMENTS,
    PALETTE,
    SEGMENT_PATHS,
    clampFraction,
    activeTickCount,
    tierLabelForScore,
    buildSvgMarkup,
    buildLoaderMarkup,
    hydrateSvg,
    triggerReveal,
    pulseAndReveal,
    showRouteLoader,
    hideRouteLoader,
    update: updateGauge,
    observeAll
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startAutoHydration, { once: true });
    } else {
      startAutoHydration();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
