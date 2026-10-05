(() => {
  'use strict';

  const scene = document.getElementById('introScene');
  const continueLink = document.getElementById('continueButton');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const sessionKey = `locus-sf.cinematic:${location.pathname.replace(/\/[^/]*$/, '')}`;
  let navigating = false;
  let navigationHref = 'index.php?welcome=off#main-content';
  let exitTimer;
  let entrance = null;

  const cinematicEase = 'cubic-bezier(0.22, 1, 0.36, 1)';

  function createEntranceOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'locusEntranceOverlay';
    overlay.className = 'locus-entrance';
    overlay.dataset.phase = 'cover';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="locus-entrance__curtain"><div class="locus-entrance__panel locus-entrance__panel--left"></div><div class="locus-entrance__panel locus-entrance__panel--right"></div><div class="locus-entrance__identity"><span class="locus-entrance__brand">LOCUS-SF</span><span class="locus-entrance__pipeline">SITE DATA &rarr; MCE &rarr; IAI</span></div></div>';
    return overlay;
  }

  function animateEntrance(runtime, element, keyframes, options) {
    const animation = element.animate(keyframes, { easing: cinematicEase, fill: 'both', ...options });
    runtime.animations.add(animation);
    return animation.finished.catch(() => {});
  }

  function waitEntrance(runtime, duration) {
    return new Promise(resolve => {
      runtime.resolveWait = resolve;
      runtime.timer = setTimeout(() => {
        runtime.resolveWait = null;
        resolve();
      }, duration);
    });
  }

  function restoreEntrance(runtime) {
    if (runtime.restored) return;
    runtime.restored = true;
    document.documentElement.style.overflow = runtime.htmlOverflow;
    document.body.style.overflow = runtime.bodyOverflow;
    document.body.style.paddingRight = runtime.bodyPadding;
    scene.inert = runtime.inert;
    runtime.overlay.remove();
    if (!navigating && !document.hidden && !scene.inert &&
        (!document.activeElement || document.activeElement === document.body || document.activeElement === document.documentElement)) {
      continueLink?.focus({ preventScroll: true });
    }
  }

  function cancelEntrance() {
    const runtime = entrance;
    if (!runtime) return;
    runtime.cancelled = true;
    clearTimeout(runtime.timer);
    runtime.resolveWait?.();
    runtime.animations.forEach(animation => animation.cancel());
    restoreEntrance(runtime);
    scene?.classList.remove('is-cinematic-active');
    entrance = null;
  }

  async function playCinematicEntrance(event) {
    event.preventDefault();
    if (!scene || entrance || navigating) return;
    if (reducedMotion.matches || typeof scene.animate !== 'function') {
      scrollTo({ top: 0, left: 0, behavior: 'instant' });
      window.LOCUS_HERO?.playEntrance();
      return;
    }

    const overlay = createEntranceOverlay();
    const runtime = {
      overlay, animations: new Set(), cancelled: false, restored: false,
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyPadding: document.body.style.paddingRight,
      inert: scene.inert
    };
    entrance = runtime;
    const gutter = innerWidth - document.documentElement.clientWidth;
    if (gutter > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gutter}px`;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    scene.inert = true;
    scene.classList.add('is-cinematic-active');
    document.body.append(overlay);

    const curtain = overlay.querySelector('.locus-entrance__curtain');
    const identity = overlay.querySelector('.locus-entrance__identity');
    animateEntrance(runtime, scene, [{ transform: 'scale(1)' }, { transform: 'scale(.98)' }], { duration: 300 });
    animateEntrance(runtime, identity, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, delay: 170 });
    await animateEntrance(runtime, curtain, [{ transform: 'translate3d(0,100%,0)' }, { transform: 'translate3d(0,0,0)' }], { duration: 300 });
    if (runtime.cancelled) return;
    overlay.dataset.phase = 'hold';
    await waitEntrance(runtime, 200);
    if (runtime.cancelled) return;

    overlay.dataset.phase = 'reveal';
    scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const heroEntrance = window.LOCUS_HERO?.playEntrance();
    const reveal = [
      animateEntrance(runtime, overlay.querySelector('.locus-entrance__panel--left'), [{ transform: 'translateX(0)' }, { transform: 'translateX(-102%)' }], { duration: 260 }),
      animateEntrance(runtime, overlay.querySelector('.locus-entrance__panel--right'), [{ transform: 'translateX(0)' }, { transform: 'translateX(102%)' }], { duration: 260 }),
      animateEntrance(runtime, identity, [{ opacity: 1 }, { opacity: 0 }], { duration: 140 }),
      animateEntrance(runtime, scene, [{ transform: 'scale(.98)' }, { transform: 'scale(1)' }], { duration: 340 })
    ];
    await Promise.all(reveal);
    if (runtime.cancelled) return;
    runtime.animations.forEach(animation => animation.cancel());
    restoreEntrance(runtime);
    await heroEntrance;
    if (runtime.cancelled) return;
    scene.classList.remove('is-cinematic-active');
    entrance = null;
  }

  window.addEventListener('pagehide', cancelEntrance);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelEntrance(); });

  // Native URLs remain usable without scripts, storage, or successful animations.
  function finishNavigation() {
    clearTimeout(exitTimer);
    location.assign(navigationHref);
  }

  document.querySelectorAll('[data-enter]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (navigating) { event.preventDefault(); return; }
      try { sessionStorage.setItem(sessionKey, '1'); } catch { /* Storage is optional. */ }
      navigating = true;
      navigationHref = link.href;
      cancelEntrance();
      if (reducedMotion.matches) return;
      event.preventDefault();
      scene?.classList.add('is-exiting');
      exitTimer = setTimeout(finishNavigation, 240);
    });
  });

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) cancelEntrance();
    if (navigating && reducedMotion.matches && exitTimer) finishNavigation();
  });

  window.addEventListener('pageshow', () => {
    cancelEntrance();
    clearTimeout(exitTimer);
    exitTimer = undefined;
    navigating = false;
    scene?.classList.remove('is-exiting');
  });

  // =========================================================================
  // PREVIEW PLATFORM MODAL DIALOG
  // =========================================================================
  const dialog = document.getElementById('previewDialogModal');
  const openers = document.querySelectorAll('[data-open-preview], #openPreviewBtn');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const tabs = [...dialog.querySelectorAll('[role="tab"]')];

  function selectTab(index, focus = false) {
    tabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panelId = tab.getAttribute('aria-controls');
      const panel = document.getElementById(panelId);
      if (panel) {
        panel.hidden = !selected;
        panel.classList.toggle('is-entering', selected && dialog.open);
      }
    });
    if (focus && tabs[index]) tabs[index].focus();
  }

  function openPreview(targetTab = null) {
    if (dialog.open) return;
    openers.forEach(opener => opener.setAttribute('aria-expanded', 'true'));
    document.documentElement.classList.add('has-preview');
    dialog.showModal();
    dialog.scrollTop = 0;

    if (targetTab) {
      const targetIdx = tabs.findIndex(tab => tab.id === targetTab || tab.getAttribute('aria-controls') === targetTab);
      if (targetIdx >= 0) selectTab(targetIdx, true);
    }
  }

  function restorePage() {
    document.documentElement.classList.remove('has-preview');
    openers.forEach(opener => opener.setAttribute('aria-expanded', 'false'));
    const firstOpener = document.getElementById('openPreviewBtn') || openers[0];
    firstOpener?.focus({ preventScroll: true });
  }

  function closePreview() {
    dialog.close();
    restorePage();
  }

  openers.forEach(opener => {
    opener.removeAttribute('hidden');
    opener.addEventListener('click', () => {
      const targetTab = opener.dataset.openPreview || null;
      openPreview(targetTab);
    });
  });

  document.getElementById('closePreviewBtn')?.addEventListener('click', closePreview);

  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closePreview();
  });

  dialog.addEventListener('close', () => {
    if (!dialog.open && document.documentElement.classList.contains('has-preview')) {
      restorePage();
    }
  });

  // Keyboard navigation & trap focus
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not([disabled]):not([tabindex="-1"]), a[href], [tabindex="0"]')]
      .filter(control => control.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
      event.preventDefault();
      first?.focus();
    }
  });

  let pointerStartedOutside = false;
  const outsideDialog = event => {
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  dialog.addEventListener('pointerdown', event => { pointerStartedOutside = outsideDialog(event); });
  dialog.addEventListener('click', event => {
    if (pointerStartedOutside && outsideDialog(event)) closePreview();
    pointerStartedOutside = false;
  });

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', event => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      selectTab(nextIndex, true);
    });
  });

  // =========================================================================
  // HERO CORRIDOR TELEMETRY DECK (RIGHT COLUMN)
  // =========================================================================
  const corridorProfiles = {
    poro: {
      name: 'Feraren Prime Logistics Lot',
      tag: 'Poro Point Freeport · Logistics Spine',
      summary: 'Direct deep-water port proximity with high-clearance truck turning bays and 3-phase heavy industrial power.',
      img: 'assets/images/landing-FerarenProperty.jpg',
      area: '2,400 m²',
      score: '94.2',
      clup: 'PASS',
      guide: '₱78.0M',
      signal: 'High demand for cold chain & seaport warehousing detected.'
    },
    center: {
      name: 'Fabro Commercial Complex',
      tag: 'City Center Core · Commercial Belt',
      summary: 'Prime high-footfall commercial corner frontage along the central banking and city services corridor.',
      img: 'assets/images/landing-FabroBldg.jpg',
      area: '850 m²',
      score: '87.4',
      clup: 'PASS',
      guide: '₱44.2M',
      signal: 'Strong consumer pull for specialty retail, clinics & dining.'
    },
    civic: {
      name: 'San Vicente Prime Bypass Parcel',
      tag: 'Civic Belt Corridor · Expansion Zone',
      summary: 'Wide arterial highway frontage ideal for institutional campus, tertiary healthcare, or regional headquarters.',
      img: 'assets/images/landing-Property4.jpg',
      area: '3,100 m²',
      score: '89.1',
      clup: 'PASS',
      guide: '₱62.5M',
      signal: 'Bypass corridor opening up major expansion runway for institutional bets.'
    }
  };

  const corridorChips = document.querySelectorAll('[data-hero-corridor]');
  corridorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.heroCorridor;
      const data = corridorProfiles[key];
      if (!data) return;

      corridorChips.forEach(c => c.classList.toggle('is-active', c === chip));

      const thumbImg = document.getElementById('deckPropImg');
      const tagNode = document.getElementById('deckCorridorTag');
      const titleNode = document.getElementById('deckPropTitle');
      const summaryNode = document.getElementById('deckPropSummary');
      const scoreNode = document.getElementById('deckPropScore');
      const areaNode = document.getElementById('deckPropArea');
      const guideNode = document.getElementById('deckPropGuide');
      const signalNode = document.getElementById('deckSignalText');
      const focusLabel = document.getElementById('terminalFocusLabel');

      if (thumbImg) thumbImg.src = data.img;
      if (tagNode) tagNode.textContent = data.tag;
      if (titleNode) titleNode.textContent = data.name;
      if (summaryNode) summaryNode.textContent = data.summary;
      if (scoreNode) scoreNode.textContent = data.score;
      if (areaNode) areaNode.textContent = data.area;
      if (guideNode) guideNode.textContent = data.guide;
      if (signalNode) signalNode.textContent = data.signal;
      if (focusLabel) focusLabel.textContent = `${chip.querySelector('.chip-name')?.textContent || key} Focus`;
    });
  });

  // =========================================================================
  // TAB 1: DISCOVER SITES (FILTERS & SELECTION INSPECTOR)
  // =========================================================================
  const sampleProperties = {
    fabro: {
      title: 'Fabro Commercial Complex',
      corridor: 'City Center Core',
      img: 'assets/images/landing-FabroBldg.jpg',
      thesis: 'Strategic high-density retail footprint along the city center financial spine with verified city permits and multi-tenant capability.',
      zoning: 'C-2 Commercial High-Density',
      area: '850 m²',
      roadAccess: '24m Frontage · Arterial Access',
      clup: 'PASS (Compliant with CLUP 2025–2035)',
      valuation: '₱44,200,000 Guide'
    },
    feraren: {
      title: 'Feraren Prime Logistics Lot',
      corridor: 'Poro Point Freeport',
      img: 'assets/images/landing-FerarenProperty.jpg',
      thesis: 'Tier-1 logistics compound directly adjacent to the seaport and airport corridor. Engineered for freight marshalling and container transport.',
      zoning: 'I-1 Light Industrial & Logistics',
      area: '2,400 m²',
      roadAccess: '42m Frontage · Port Highway Spine',
      clup: 'PASS (Compliant with Freeport Master Plan)',
      valuation: '₱78,000,000 Guide'
    },
    lafinns: {
      title: 'La Finns Coastal Mixed Lot',
      corridor: 'Seaside Commercial Corridor',
      img: 'assets/images/landing-LaFinns.jpg',
      thesis: 'Rare coastal frontage lot with high tourist footfall and scenic sunset views. Ideal for boutique hospitality or lifestyle dining compound.',
      zoning: 'T-1 Tourism & Coastal Mixed',
      area: '1,200 m²',
      roadAccess: '18m Frontage · Coastal Boulevard',
      clup: 'CONDITIONAL (Coastal setback verified)',
      valuation: '₱32,000,000 Guide'
    },
    bypass: {
      title: 'San Vicente Prime Bypass Parcel',
      corridor: 'Civic Belt Expansion Zone',
      img: 'assets/images/landing-Property4.jpg',
      thesis: 'Expansive land parcel situated right on the city bypass route. Prime strategic candidate for tertiary healthcare, university campus, or trade center.',
      zoning: 'INS-1 Institutional & Mixed Commercial',
      area: '3,100 m²',
      roadAccess: '38m Frontage · 4-Lane Bypass Arterial',
      clup: 'PASS (Fully aligned with CLUP Growth Spine)',
      valuation: '₱62,500,000 Guide'
    }
  };

  const sampleCards = document.querySelectorAll('[data-property-key]');
  sampleCards.forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.propertyKey;
      const prop = sampleProperties[key];
      if (!prop) return;

      sampleCards.forEach(c => c.classList.toggle('is-selected', c === card));

      const inspTitle = document.getElementById('inspectorPropTitle');
      const inspCorridor = document.getElementById('inspectorPropCorridor');
      const inspMedia = document.getElementById('inspectorPropImg');
      const inspThesis = document.getElementById('inspectorPropThesis');
      const inspZoning = document.getElementById('inspectorPropZoning');
      const inspArea = document.getElementById('inspectorPropArea');
      const inspRoad = document.getElementById('inspectorPropRoad');
      const inspClup = document.getElementById('inspectorPropClup');

      if (inspTitle) inspTitle.textContent = prop.title;
      if (inspCorridor) inspCorridor.textContent = prop.corridor;
      if (inspMedia) inspMedia.src = prop.img;
      if (inspThesis) inspThesis.textContent = prop.thesis;
      if (inspZoning) inspZoning.textContent = prop.zoning;
      if (inspArea) inspArea.textContent = prop.area;
      if (inspRoad) inspRoad.textContent = prop.roadAccess;
      if (inspClup) inspClup.textContent = prop.clup;
    });
  });

  // Filter chips in Discover tab
  const filterPills = document.querySelectorAll('[data-discover-filter]');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const filter = pill.dataset.discoverFilter;
      filterPills.forEach(p => p.classList.toggle('is-active', p === pill));

      sampleCards.forEach(card => {
        const sector = card.dataset.propertySector;
        const matches = filter === 'all' || sector === filter;
        card.style.display = matches ? 'flex' : 'none';
      });
    });
  });

  // =========================================================================
  // TAB 3: CLUP SCENARIO SIMULATOR
  // =========================================================================
  const scenarioDefinitions = {
    commercial: {
      title: 'Commercial Complex & Retail Arcade',
      desc: 'Tested against C-2 High-Density zoning. Evaluates pedestrian gravity, floor-area ratio (FAR), parking minimums, and vehicular ingress/egress.',
      score: '92%',
      scoreLabel: 'Very High Fit',
      status: 'PASS · Strategic Zone',
      badgeClass: 'is-pass',
      check1: 'Zoning Alignment: Permitted in Commercial Core & Civic Belt',
      check2: 'Road Frontage: Minimum 15m arterial access requirement met',
      check3: 'Environmental Review: Category B Locational Clearance ready',
      notice: 'Eligible for San Fernando City fast-track investment permit under the 2025 Economic Revival ordinance.'
    },
    logistics: {
      title: 'Logistics Hub & Cold Storage Warehouse',
      desc: 'Tested against I-1 Industrial & Freeport corridors. Evaluates 40ft trailer turning radii, 3-phase heavy grid readiness, and seaport connectivity.',
      score: '96%',
      scoreLabel: 'Optimal Fit',
      status: 'PASS · Freeport Priority',
      badgeClass: 'is-pass',
      check1: 'Zoning Alignment: Primary use in Poro Point Special Economic Zone',
      check2: 'Heavy Vehicle Clearance: Direct arterial route bypassing downtown',
      check3: 'Utility Capacity: High-volume 3-phase electrical substation adjacent',
      notice: 'Qualifies for PEZA / Poro Point Freeport incentive package with tax holidays and expedited customs corridor access.'
    },
    cleanenergy: {
      title: 'Clean Energy Rooftop & Solar Array',
      desc: 'Tested for rooftop solar and micro-grid export. Analyzes structural load capacity, solar irradiance exposure, and net metering interconnection.',
      score: '89%',
      scoreLabel: 'High Compatibility',
      status: 'PASS · Green Initiative',
      badgeClass: 'is-pass',
      check1: 'Structural Clearance: Complies with National Building Code wind load',
      check2: 'Grid Interconnection: La Union Electric distribution tie-in verified',
      check3: 'Renewable Incentive: Qualifies for city green building tax rebate',
      notice: 'City green zoning grants a 15% discount on city business permit fees for renewable-powered commercial parcels.'
    },
    healthcare: {
      title: 'Tertiary Healthcare & Medical Specialty Clinic',
      desc: 'Tested against INS-1 Institutional standards. Evaluates emergency vehicle access, backup utility resiliency, and population service radius.',
      score: '94%',
      scoreLabel: 'High Priority Need',
      status: 'PASS · Essential Sector',
      badgeClass: 'is-pass',
      check1: 'Emergency Access: Direct connection to Bypass Highway spine',
      check2: 'Sanitary & Waste: Medical waste disposal routing pre-approved',
      check3: 'DOH Licensing: Complies with Level 2 hospital spacing guidelines',
      notice: 'San Fernando City prioritizes private healthcare infrastructure with fast-tracked city site endorsements.'
    }
  };

  const scenarioChips = document.querySelectorAll('[data-scenario]');
  scenarioChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const scenarioKey = chip.dataset.scenario;
      const def = scenarioDefinitions[scenarioKey];
      if (!def) return;

      scenarioChips.forEach(c => c.classList.toggle('is-active', c === chip));

      const titleNode = document.getElementById('scenarioTitle');
      const descNode = document.getElementById('scenarioDesc');
      const scoreNum = document.getElementById('simScoreNum');
      const scoreLbl = document.getElementById('simScoreLabel');
      const statusBadge = document.getElementById('simStatusBadge');
      const check1 = document.getElementById('simCheck1');
      const check2 = document.getElementById('simCheck2');
      const check3 = document.getElementById('simCheck3');
      const noticeNode = document.getElementById('simLguNotice');

      if (titleNode) titleNode.textContent = def.title;
      if (descNode) descNode.textContent = def.desc;
      if (scoreNum) scoreNum.textContent = def.score;
      if (scoreLbl) scoreLbl.textContent = def.scoreLabel;
      if (statusBadge) {
        statusBadge.textContent = def.status;
        statusBadge.className = `readout-status-badge ${def.badgeClass}`;
      }
      if (check1) check1.textContent = def.check1;
      if (check2) check2.textContent = def.check2;
      if (check3) check3.textContent = def.check3;
      if (noticeNode) noticeNode.textContent = def.notice;
    });
  });

  // Check URL parameters for direct preview modal launch
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('preview') === 'open') {
    const targetTab = urlParams.get('tab') || 'panel-discover';
    setTimeout(() => openPreview(targetTab), 300);
  }
})();
