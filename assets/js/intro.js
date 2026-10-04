(() => {
  'use strict';

  const scene = document.getElementById('introScene');
  const continueLink = document.getElementById('continueButton');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const sessionKey = `locus-sf.cinematic:${location.pathname.replace(/\/[^/]*$/, '')}`;
  let navigating = false;
  let exitTimer;
  let navigationHref;
  let entrance;
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

  function playLaunchSonic() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Primary rising resonance
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.45);
      gain1.gain.setValueAtTime(0.04, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // High harmonic bell shimmer
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now + 0.06);
      osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.48);
      gain2.gain.setValueAtTime(0.02, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.6);

      setTimeout(() => ctx.close().catch(() => {}), 700);
    } catch (_) {}
  }

  function getOrCreateWarpOverlay() {
    let overlay = document.getElementById('locusSpatialWarp');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'locusSpatialWarp';
      overlay.className = 'locus-warp-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.innerHTML = `
        <div class="locus-warp-curtain"></div>
        <div class="locus-warp-scanner"></div>
        <div class="locus-warp-horizon"></div>
        <div class="locus-warp-hud">
          <span class="locus-warp-badge">
            <span class="locus-warp-dot"></span>
            LOCUS-SF SPATIAL ENGINE
          </span>
          <h2 class="locus-warp-title">Entering City Investment Atlas</h2>
          <span class="locus-warp-coords">16°37′03″N · 120°19′11″E · SAN FERNANDO</span>
          <div class="locus-warp-progress-track">
            <div class="locus-warp-progress-bar"></div>
          </div>
        </div>
      `;
      document.body.append(overlay);
    }
    return overlay;
  }

  function proceedToHeroSection(event, sourceElement) {
    if (event) event.preventDefault();
    if (navigating) return;
    navigating = true;

    try {
      sessionStorage.setItem('locus_hero_arriving', '1');
      sessionStorage.setItem(sessionKey, '1');
    } catch (_) {}

    const targetHref = sourceElement?.getAttribute('href') || 'index.php?welcome=off&transit=1#main-content';

    // Visual button trigger feedback
    if (sourceElement) {
      sourceElement.classList.add('is-firing');
      const textSpan = sourceElement.querySelector('span:first-child');
      if (textSpan && sourceElement.id === 'continueButton') {
        textSpan.textContent = 'LAUNCHING INVESTOR ATLAS';
      }
    }

    // Play synthesized sonic launch chord
    playLaunchSonic();

    // Trigger scene scale & blur convergence
    scene?.classList.add('is-launching');

    // Deploy full-screen spatial warp HUD
    const overlay = getOrCreateWarpOverlay();
    requestAnimationFrame(() => {
      overlay.classList.add('is-active');
    });

    // Navigate smoothly to the hero section at apex of the warp
    exitTimer = setTimeout(() => {
      location.assign(targetHref);
    }, 620);
  }

  // Pre-insert warp overlay into DOM so there is zero creation delay on click
  if (document.body) {
    getOrCreateWarpOverlay();
  } else {
    document.addEventListener('DOMContentLoaded', getOrCreateWarpOverlay);
  }

  // Global event delegation for continue button and enter links
  document.addEventListener('click', (event) => {
    const continueTrigger = event.target.closest('#continueButton, [data-hero-continue], [data-enter]');
    if (!continueTrigger) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    proceedToHeroSection(event, continueTrigger);
  });

  window.addEventListener('pageshow', () => {
    clearTimeout(exitTimer);
    exitTimer = undefined;
    navigating = false;
    scene?.classList.remove('is-launching');
    const overlay = document.getElementById('locusSpatialWarp');
    if (overlay) overlay.classList.remove('is-active');
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
