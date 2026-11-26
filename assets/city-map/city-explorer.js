/* LOCUS-SF 3D City Explorer - Tactile Discovery Passport, Guided 3D Tour, Sun Dial & Barangay Tracker.
 * Pure ASCII source + crisp inline SVGs; zero external dependencies; integrates cleanly with window.LOCUS_SF. */
(function () {
  const api = window.LOCUS_SF;
  if (!api || !api.map || !Array.isArray(api.verifiedLandmarks)) return;

  const map = api.map;
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  const STORAGE_KEY = 'locus.city-passport.v1';
  const SOUND_KEY = 'locus.city-passport.sound';
  const TOTAL_BARANGAYS = 59;

  const ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  const ICON_STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2.5 14.9 8.4 21.4 9.3 16.7 13.9 17.8 20.4 12 17.3 6.2 20.4 7.3 13.9 2.6 9.3 9.1 8.4 12 2.5"/></svg>';
  const ICON_SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 14.4 9.6 22 12 14.4 14.4 12 22 9.6 14.4 2 12 9.6 9.6 12 2Z"/></svg>';

  // 12 Curated 3D Architectural Landmarks grouped into 4 real San Fernando chapters
  const PASSPORT_CHAPTERS = [
    {
      title: 'Civic Core',
      ids: ['sf-city-hall', 'st-william-cathedral', 'la-union-capitol']
    },
    {
      title: 'Heritage & Coast',
      ids: ['ma-cho-temple', 'friendship-pagoda', 'thunderbird-poro']
    },
    {
      title: 'Commercial & Tech',
      ids: ['sm-city-la-union', 'robinsons-la-union', 'taskus-la-union']
    },
    {
      title: 'Education & Health',
      ids: ['dmmmsu-mluc', 'slc-carlatan', 'lorma-medical']
    }
  ];

  // Curated 7-stop Guided Helicopter Tour with real-time lighting transitions
  const TOUR_STOPS = [
    {
      id: 'sf-city-hall',
      lighting: 'day',
      lightingLabel: 'DAYLIGHT',
      note: 'Modern civic headquarters facing City Plaza and the heart of downtown San Fernando.'
    },
    {
      id: 'st-william-cathedral',
      lighting: 'day',
      lightingLabel: 'DAYLIGHT',
      note: 'Historic Baroque-Neoclassical cathedral anchoring San Fernando\'s downtown heritage square.'
    },
    {
      id: 'la-union-capitol',
      lighting: 'day',
      lightingLabel: 'DAYLIGHT',
      note: 'Neoclassical seat of the Provincial Government of La Union atop Capitol Hill.'
    },
    {
      id: 'ma-cho-temple',
      lighting: 'golden',
      lightingLabel: 'GOLDEN HOUR',
      note: 'Golden hour over the hilltop Taoist sanctuary overlooking the West Philippine Sea.'
    },
    {
      id: 'thunderbird-poro',
      lighting: 'golden',
      lightingLabel: 'GOLDEN HOUR',
      note: 'Cliffside Mediterranean resort inside the Poro Point Freeport economic & tourism zone.'
    },
    {
      id: 'sm-city-la-union',
      lighting: 'golden',
      lightingLabel: 'GOLDEN HOUR',
      note: 'Flagship coastal lifestyle hub anchoring rapid commercial growth in Barangay Biday.'
    },
    {
      id: 'taskus-la-union',
      lighting: 'night',
      lightingLabel: 'NIGHT LIGHTS',
      note: '24/7 digital & AI operations campus illuminated along MacArthur Highway at night.'
    }
  ];

  const landmarkMap = new Map(api.verifiedLandmarks.map(lm => [lm.id, lm]));
  const passportIds = PASSPORT_CHAPTERS.flatMap(c => c.ids).filter(id => landmarkMap.has(id));
  const chapterByLandmark = new Map();
  PASSPORT_CHAPTERS.forEach(ch => ch.ids.forEach(id => chapterByLandmark.set(id, ch.title)));

  // Persistent state
  const state = {
    stamps: new Set(),
    barangays: new Set(),
    sound: true,
    lighting: 'day',
    passportOpen: false,
    tourActive: false,
    tourIndex: 0,
    tourPaused: false
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (Array.isArray(saved.stamps)) saved.stamps.forEach(id => { if (landmarkMap.has(id)) state.stamps.add(id); });
    if (Array.isArray(saved.barangays)) saved.barangays.forEach(b => { if (typeof b === 'string' && b) state.barangays.add(b); });
    const snd = localStorage.getItem(SOUND_KEY);
    if (snd === 'off') state.sound = false;
  } catch { /* Storage optional. */ }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        stamps: [...state.stamps],
        barangays: [...state.barangays]
      }));
      localStorage.setItem(SOUND_KEY, state.sound ? 'on' : 'off');
    } catch { /* Storage optional. */ }
  }

  function getRank(count) {
    if (count >= passportIds.length) return 'San Fernando Navigator';
    if (count >= 8) return 'Local Insider';
    if (count >= 4) return 'District Scout';
    if (count >= 1) return 'City Visitor';
    return 'First Visit';
  }

  // Whisper-soft Web Audio tactile marimba chime (zero external audio files)
  let audioCtx = null;
  function playChime(notes = [523.25, 783.99]) {
    if (!state.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.085);
        gain.gain.setValueAtTime(0.0001, now + i * 0.085);
        gain.gain.exponentialRampToValueAtTime(0.055, now + i * 0.085 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.085 + 0.24);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.085);
        osc.stop(now + i * 0.085 + 0.26);
      });
    } catch { /* Audio optional. */ }
  }

  // Tasteful San Fernando micro-confetti celebration on 12/12 completion
  function launchCelebration() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'explorer-confetti';
    canvas.width = mapEl.clientWidth || 600;
    canvas.height = mapEl.clientHeight || 400;
    mapEl.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const colors = ['#9e1b22', '#d9971e', '#11224d', '#ffffff', '#e0535a'];
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.42;
    const particles = Array.from({ length: 48 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.4 + Math.random() * 5.2;
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.6,
        size: 4 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.22,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1
      };
    });
    let frame = 0;
    function tick() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.vx *= 0.985;
        p.rot += p.vrot;
        p.life -= 0.015;
        if (p.life > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          ctx.restore();
        }
      }
      if (alive && frame < 120) requestAnimationFrame(tick);
      else canvas.remove();
    }
    requestAnimationFrame(tick);
  }

  // 3D-projected landmark arrival beacon
  const beaconEl = document.createElement('div');
  beaconEl.className = 'explorer-beacon';
  beaconEl.setAttribute('aria-hidden', 'true');
  mapEl.appendChild(beaconEl);

  let beaconTarget = null;
  let beaconHideTimer = null;
  function positionBeacon() {
    if (!beaconTarget || typeof map.project !== 'function') return;
    const pt = map.project([beaconTarget.lng, beaconTarget.lat]);
    if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return;
    const w = mapEl.clientWidth || 0;
    const h = mapEl.clientHeight || 0;
    const visible = pt.x >= -24 && pt.y >= -24 && pt.x <= w + 24 && pt.y <= h + 24;
    beaconEl.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0)`;
    beaconEl.classList.toggle('is-active', visible);
  }
  function pulseBeaconAt(lm, durationMs = 3400) {
    if (!lm || typeof map.project !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    beaconTarget = { lng: lm.lng, lat: lm.lat };
    positionBeacon();
    clearTimeout(beaconHideTimer);
    beaconHideTimer = setTimeout(() => {
      beaconTarget = null;
      beaconEl.classList.remove('is-active');
    }, durationMs);
  }
  map.on('render', positionBeacon);

  // Build crisp Apple Maps UI DOM inside #map (pure <div> containers to avoid bare tag CSS collisions)
  const toast = document.createElement('div');
  toast.className = 'explorer-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `<span class="explorer-toast-seal" aria-hidden="true">${ICON_CHECK}</span><span class="explorer-toast-copy"><strong class="explorer-toast-title"></strong><span class="explorer-toast-sub"></span></span>`;
  mapEl.appendChild(toast);

  const bgyChip = document.createElement('button');
  bgyChip.type = 'button';
  bgyChip.className = 'explorer-barangay-chip';
  bgyChip.title = 'Live barangay under view \u2014 click to toggle all 59 barangay boundaries';
  bgyChip.innerHTML = '<span class="explorer-barangay-dot" aria-hidden="true"></span><span class="explorer-barangay-name">San Fernando City</span><span class="explorer-barangay-tally">0/59</span>';
  mapEl.appendChild(bgyChip);

  const dock = document.createElement('div');
  dock.className = 'explorer-dock';
  dock.setAttribute('role', 'region');
  dock.setAttribute('aria-label', 'San Fernando interactive explorer controls');
  dock.innerHTML = `
    <button type="button" class="explorer-btn explorer-passport-btn" id="explorer-passport-btn" aria-expanded="false" aria-controls="explorer-passport-panel" title="Open San Fernando Discovery Passport (P)">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
      <span class="explorer-passport-label">Passport</span>
      <span class="explorer-stamp-count" data-stamp-count>0/12</span>
      <span class="explorer-mini-pips" data-mini-pips aria-hidden="true"></span>
    </button>
    <span class="explorer-sep" aria-hidden="true"></span>
    <button type="button" class="explorer-btn explorer-tour-btn" id="explorer-tour-btn" aria-pressed="false" title="Start guided 3D city flyover tour (T)">
      <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>
      <span class="explorer-tour-label">Tour</span>
    </button>
    <button type="button" class="explorer-btn explorer-next-btn" id="explorer-next-btn" title="Fly to next undiscovered 3D landmark (N)">
      <span>Next stop</span>
      <span aria-hidden="true">&rarr;</span>
    </button>
    <span class="explorer-sep explorer-sep--sun" aria-hidden="true"></span>
    <div class="explorer-sun-dial" role="group" aria-label="Time of day lighting">
      <button type="button" class="explorer-sun-opt is-active" data-mode="day" aria-pressed="true" title="Daylight">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2m0 15v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2.5 12h2m15 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/></svg>
      </button>
      <button type="button" class="explorer-sun-opt" data-mode="golden" aria-pressed="false" title="Golden hour sunset">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 10V3m-7.5 11H2.5m19 0h-2M6.3 8.3 4.9 6.9m12.8 1.4 1.4-1.4"/><path d="M7 14a5 5 0 0 1 10 0"/><path d="M3 18h18"/></svg>
      </button>
      <button type="button" class="explorer-sun-opt" data-mode="night" aria-pressed="false" title="Night city lights">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 14.5A8.5 8.5 0 0 1 9.5 3.8a8.5 8.5 0 1 0 10.7 10.7Z"/></svg>
      </button>
    </div>
  `;
  mapEl.appendChild(dock);

  const passportPanel = document.createElement('div');
  passportPanel.id = 'explorer-passport-panel';
  passportPanel.className = 'explorer-passport';
  passportPanel.setAttribute('role', 'dialog');
  passportPanel.setAttribute('aria-label', 'San Fernando Landmark Discovery Passport');
  passportPanel.innerHTML = `
    <div class="explorer-passport-head">
      <div class="explorer-passport-title-wrap">
        <div class="explorer-passport-title-row">
          <h3 class="explorer-passport-title">San Fernando Passport</h3>
          <span class="explorer-rank-pill" data-rank-label>First Visit</span>
        </div>
        <span class="explorer-passport-sub">Tap any 3D landmark to fly over &amp; collect its stamp</span>
      </div>
      <div class="explorer-head-actions">
        <button type="button" class="explorer-icon-btn" id="explorer-sound-btn" aria-pressed="true" title="Toggle discovery chimes">
          <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.8 5.2a9.5 9.5 0 0 1 0 13.6"/></svg>
        </button>
        <button type="button" class="explorer-icon-btn" id="explorer-passport-close" aria-label="Close passport">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>
        </button>
      </div>
    </div>
    <div class="explorer-passport-body">
      <div class="explorer-stats-row">
        <div class="explorer-stat-box">
          <div class="explorer-stat-top"><span>3D Landmarks</span><strong data-panel-stamps>0 / 12</strong></div>
          <span class="explorer-bar"><i data-stamps-bar style="width:0%"></i></span>
        </div>
        <div class="explorer-stat-box">
          <div class="explorer-stat-top"><span>Barangays</span><strong data-panel-bgys>0 / 59</strong></div>
          <span class="explorer-bar explorer-bar--bgy"><i data-bgys-bar style="width:0%"></i></span>
        </div>
      </div>
      <div class="explorer-quick-actions">
        <div class="explorer-sun-dial" role="group" aria-label="Time of day lighting">
          <button type="button" class="explorer-sun-opt is-active" data-mode="day" aria-pressed="true">Day</button>
          <button type="button" class="explorer-sun-opt" data-mode="golden" aria-pressed="false">Sunset</button>
          <button type="button" class="explorer-sun-opt" data-mode="night" aria-pressed="false">Night</button>
        </div>
        <button type="button" class="explorer-surprise-btn" id="explorer-surprise-btn">${ICON_SPARK}<span>Surprise me</span></button>
      </div>
      <div class="explorer-chapters-root" data-chapters-root></div>
    </div>
  `;
  mapEl.appendChild(passportPanel);

  const tourCard = document.createElement('div');
  tourCard.className = 'explorer-tour-card';
  tourCard.setAttribute('role', 'region');
  tourCard.setAttribute('aria-label', 'Guided 3D City Tour');
  tourCard.innerHTML = `
    <div class="explorer-tour-top">
      <div>
        <div class="explorer-tour-kicker" data-tour-kicker>3D TOUR \u00b7 1 / 7</div>
        <h4 class="explorer-tour-title" data-tour-title>San Fernando City Hall</h4>
        <p class="explorer-tour-note" data-tour-note></p>
      </div>
      <div class="explorer-tour-controls">
        <button type="button" class="explorer-icon-btn" id="tour-prev-btn" aria-label="Previous tour stop" title="Previous stop">
          <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button type="button" class="explorer-icon-btn" id="tour-pause-btn" aria-label="Pause tour" title="Pause / Resume">
          <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        </button>
        <button type="button" class="explorer-icon-btn" id="tour-next-btn" aria-label="Next tour stop" title="Next stop">
          <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <button type="button" class="explorer-icon-btn" id="tour-stop-btn" aria-label="End tour" title="End tour">
          <svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>
        </button>
      </div>
    </div>
    <div class="explorer-tour-progress"><i data-tour-progress-bar></i></div>
  `;
  mapEl.appendChild(tourCard);

  // Build chapter buttons once
  const chaptersRoot = passportPanel.querySelector('[data-chapters-root]');
  const stampButtons = new Map();
  const chapterTallies = new Map();
  PASSPORT_CHAPTERS.forEach(ch => {
    const sec = document.createElement('div');
    sec.className = 'explorer-chapter';
    const head = document.createElement('div');
    head.className = 'explorer-chapter-head';
    const lbl = document.createElement('div');
    lbl.className = 'explorer-chapter-label';
    lbl.textContent = ch.title;
    const tally = document.createElement('span');
    tally.className = 'explorer-chapter-tally';
    tally.textContent = `0/${ch.ids.length}`;
    head.append(lbl, tally);
    chapterTallies.set(ch.title, { el: tally, ids: ch.ids });

    const grid = document.createElement('div');
    grid.className = 'explorer-stamps-grid';
    ch.ids.forEach(id => {
      const lm = landmarkMap.get(id);
      if (!lm) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'explorer-stamp';
      btn.dataset.landmarkId = id;
      btn.innerHTML = `<span class="explorer-stamp-mark" aria-hidden="true">${ICON_CHECK}</span><span class="explorer-stamp-name">${lm.shortName || lm.name}</span>`;
      btn.onclick = () => {
        setPassportOpen(false);
        stopTour();
        flyAndInspectLandmark(id);
      };
      grid.appendChild(btn);
      stampButtons.set(id, btn);
    });
    sec.append(head, grid);
    chaptersRoot.appendChild(sec);
  });

  // Mini pips inside dock
  const miniPips = dock.querySelector('[data-mini-pips]');
  const pipEls = passportIds.map(() => {
    const dot = document.createElement('i');
    miniPips.appendChild(dot);
    return dot;
  });

  // Toast queue
  let toastTimer = null;
  function showToast(title, subtitle, isRank = false) {
    toast.classList.toggle('is-rank', isRank);
    toast.querySelector('.explorer-toast-seal').innerHTML = isRank ? ICON_STAR : ICON_CHECK;
    toast.querySelector('.explorer-toast-title').textContent = title;
    toast.querySelector('.explorer-toast-sub').textContent = subtitle;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), isRank ? 4000 : 3000);
  }

  function renderUI() {
    const stampedCount = passportIds.filter(id => state.stamps.has(id)).length;
    const total = passportIds.length;
    const rank = getRank(stampedCount);

    dock.querySelector('[data-stamp-count]').textContent = `${stampedCount}/${total}`;
    passportPanel.querySelector('[data-rank-label]').textContent = rank;
    passportPanel.querySelector('[data-panel-stamps]').textContent = `${stampedCount} / ${total}`;
    passportPanel.querySelector('[data-stamps-bar]').style.width = `${Math.round((stampedCount / total) * 100)}%`;

    const bgyCount = Math.min(state.barangays.size, TOTAL_BARANGAYS);
    passportPanel.querySelector('[data-panel-bgys]').textContent = `${bgyCount} / ${TOTAL_BARANGAYS}`;
    passportPanel.querySelector('[data-bgys-bar]').style.width = `${Math.round((bgyCount / TOTAL_BARANGAYS) * 100)}%`;
    bgyChip.querySelector('.explorer-barangay-tally').textContent = `${bgyCount}/${TOTAL_BARANGAYS}`;

    passportIds.forEach((id, i) => {
      const done = state.stamps.has(id);
      pipEls[i]?.classList.toggle('is-stamped', done);
      stampButtons.get(id)?.classList.toggle('is-stamped', done);
    });

    chapterTallies.forEach(({ el, ids }) => {
      const n = ids.filter(id => state.stamps.has(id)).length;
      const done = n >= ids.length;
      el.textContent = done ? 'Complete' : `${n}/${ids.length}`;
      el.classList.toggle('is-complete', done);
    });

    const nextBtnEl = dock.querySelector('#explorer-next-btn');
    const nextLbl = nextBtnEl?.querySelector('span:first-child');
    if (nextLbl) nextLbl.textContent = stampedCount >= total ? 'Revisit stop' : 'Next stop';
    nextBtnEl?.classList.toggle('is-inviting', stampedCount === 0);

    const soundBtn = passportPanel.querySelector('#explorer-sound-btn');
    if (soundBtn) {
      soundBtn.setAttribute('aria-pressed', String(state.sound));
      soundBtn.style.opacity = state.sound ? '1' : '0.45';
      soundBtn.title = state.sound ? 'Sound chimes on (click to mute)' : 'Sound chimes muted (click to enable)';
    }

    document.querySelectorAll('.explorer-sun-opt').forEach(btn => {
      const active = btn.dataset.mode === state.lighting;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function recordStamp(id, { silent = false } = {}) {
    if (!passportIds.includes(id) || state.stamps.has(id)) return false;
    const prevRank = getRank(state.stamps.size);
    const chapter = chapterByLandmark.get(id) || 'San Fernando';
    const chapterObj = PASSPORT_CHAPTERS.find(c => c.title === chapter);
    const wasChapterDone = chapterObj ? chapterObj.ids.every(cid => state.stamps.has(cid)) : false;

    state.stamps.add(id);
    persist();
    const count = state.stamps.size;
    const nextRank = getRank(count);
    const isChapterDone = chapterObj ? chapterObj.ids.every(cid => state.stamps.has(cid)) : false;
    renderUI();

    if (!silent) {
      const lm = landmarkMap.get(id);
      if (count >= passportIds.length) {
        playChime([523.25, 659.25, 783.99, 1046.5]);
        launchCelebration();
        showToast('San Fernando Navigator unlocked!', `All ${passportIds.length} 3D landmarks stamped`, true);
      } else if (nextRank !== prevRank && count >= 4) {
        playChime([523.25, 659.25, 783.99]);
        showToast(`${nextRank} unlocked!`, `${lm?.shortName || id} \u00b7 Stamp ${count} of ${passportIds.length}`, true);
      } else if (isChapterDone && !wasChapterDone) {
        playChime([523.25, 659.25, 783.99]);
        showToast(`${chapter} completed!`, `${lm?.shortName || id} \u00b7 Stamp ${count} of ${passportIds.length}`, true);
      } else {
        playChime([587.33, 880]);
        showToast(`${lm?.shortName || id} stamped`, `Stamp ${count} of ${passportIds.length} \u00b7 ${chapter}`, false);
      }
    }
    return true;
  }

  function flyAndInspectLandmark(id) {
    const lm = landmarkMap.get(id);
    if (!lm) return;
    pulseBeaconAt(lm, 3600);
    api.selectLandmarkById(id);
    recordStamp(id);
  }

  // Next stop cycle (prioritizes undiscovered stops first)
  let revisitCursor = 0;
  function goNextStop() {
    setPassportOpen(false);
    stopTour();
    const unvisited = passportIds.filter(id => !state.stamps.has(id));
    const targetId = unvisited.length
      ? unvisited[0]
      : passportIds[revisitCursor++ % passportIds.length];
    flyAndInspectLandmark(targetId);
  }

  function goSurpriseStop() {
    setPassportOpen(false);
    stopTour();
    const pool = passportIds.filter(id => !state.stamps.has(id));
    const list = pool.length ? pool : passportIds;
    const targetId = list[Math.floor(Math.random() * list.length)];
    flyAndInspectLandmark(targetId);
  }

  function setPassportOpen(open) {
    state.passportOpen = Boolean(open);
    passportPanel.classList.toggle('is-open', state.passportOpen);
    dock.querySelector('#explorer-passport-btn')?.setAttribute('aria-expanded', String(state.passportOpen));
  }

  // Guided 3D Helicopter Tour engine
  let tourTimer = null;
  let tourProgressRaf = null;
  let tourStopStartedAt = 0;
  const TOUR_DWELL_MS = 6500;

  function clearTourTimers() {
    clearTimeout(tourTimer);
    tourTimer = null;
    if (tourProgressRaf) { cancelAnimationFrame(tourProgressRaf); tourProgressRaf = null; }
  }

  function runTourStop(idx) {
    clearTourTimers();
    state.tourIndex = ((idx % TOUR_STOPS.length) + TOUR_STOPS.length) % TOUR_STOPS.length;
    const stop = TOUR_STOPS[state.tourIndex];
    const lm = landmarkMap.get(stop.id);
    if (!lm) return;

    // Close side panel so the 3D tour has full uninterrupted panorama
    api.setPanelHidden(true);
    if (stop.lighting && stop.lighting !== state.lighting) {
      api.setLightingMode(stop.lighting);
    }

    const lightTag = stop.lightingLabel ? ` \u00b7 ${stop.lightingLabel}` : '';
    tourCard.querySelector('[data-tour-kicker]').textContent = `3D TOUR \u00b7 ${state.tourIndex + 1} / ${TOUR_STOPS.length}${lightTag}`;
    tourCard.querySelector('[data-tour-title]').textContent = lm.name;
    tourCard.querySelector('[data-tour-note]').textContent = stop.note;

    api.setAutoOrbit(false);
    pulseBeaconAt(lm, 4200);
    map.flyTo({
      center: [lm.lng, lm.lat],
      zoom: lm.zoom || 17.3,
      pitch: lm.pitch ?? 60,
      bearing: lm.bearing ?? -26,
      speed: 1.05,
      curve: 1.35,
      essential: true
    });

    recordStamp(stop.id);

    const bar = tourCard.querySelector('[data-tour-progress-bar]');
    bar.style.width = '0%';
    tourStopStartedAt = performance.now();

    const onceMoved = () => {
      if (state.tourActive && !state.tourPaused) api.setAutoOrbit(true);
    };
    map.once('moveend', onceMoved);

    if (!state.tourPaused) {
      const tickBar = now => {
        if (!state.tourActive || state.tourPaused) return;
        const pct = Math.min(100, ((now - tourStopStartedAt) / TOUR_DWELL_MS) * 100);
        bar.style.width = `${pct}%`;
        if (pct < 100) tourProgressRaf = requestAnimationFrame(tickBar);
      };
      tourProgressRaf = requestAnimationFrame(tickBar);
      tourTimer = setTimeout(() => {
        if (state.tourActive && !state.tourPaused) runTourStop(state.tourIndex + 1);
      }, TOUR_DWELL_MS);
    }
  }

  function startTour() {
    setPassportOpen(false);
    state.tourActive = true;
    state.tourPaused = false;
    dock.classList.add('is-hidden');
    tourCard.classList.add('is-active');
    const tourBtn = dock.querySelector('#explorer-tour-btn');
    tourBtn?.classList.add('is-active');
    tourBtn?.setAttribute('aria-pressed', 'true');
    updatePauseBtn();
    runTourStop(0);
  }

  function stopTour() {
    if (!state.tourActive) return;
    clearTourTimers();
    state.tourActive = false;
    state.tourPaused = false;
    api.setAutoOrbit(false);
    tourCard.classList.remove('is-active');
    dock.classList.remove('is-hidden');
    const tourBtn = dock.querySelector('#explorer-tour-btn');
    tourBtn?.classList.remove('is-active');
    tourBtn?.setAttribute('aria-pressed', 'false');
  }

  function updatePauseBtn() {
    const btn = tourCard.querySelector('#tour-pause-btn');
    if (!btn) return;
    btn.setAttribute('aria-label', state.tourPaused ? 'Resume tour' : 'Pause tour');
    btn.innerHTML = state.tourPaused
      ? '<svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>'
      : '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  }

  function toggleTourPause() {
    if (!state.tourActive) return;
    state.tourPaused = !state.tourPaused;
    updatePauseBtn();
    if (state.tourPaused) {
      clearTourTimers();
      api.setAutoOrbit(false);
    } else {
      runTourStop(state.tourIndex);
    }
  }

  // Live Barangay compass tracking on pan/move
  let lastBgyName = '';
  let bgyTimer = null;
  function updateBarangayUnderCenter() {
    if (!api.buildingsLayer || typeof api.buildingsLayer.findOfficialBarangayAt !== 'function') return;
    const c = map.getCenter();
    const bgy = api.buildingsLayer.findOfficialBarangayAt(c.lng, c.lat);
    const nameEl = bgyChip.querySelector('.explorer-barangay-name');
    if (!bgy || !bgy.name) {
      nameEl.textContent = 'San Fernando City';
      lastBgyName = '';
      return;
    }
    if (bgy.name !== lastBgyName) {
      lastBgyName = bgy.name;
      nameEl.textContent = bgy.name;
      if (!state.barangays.has(bgy.name)) {
        state.barangays.add(bgy.name);
        persist();
        renderUI();
        bgyChip.classList.add('is-pop');
        setTimeout(() => bgyChip.classList.remove('is-pop'), 240);
      }
    }
  }
  map.on('moveend', () => {
    clearTimeout(bgyTimer);
    bgyTimer = setTimeout(updateBarangayUnderCenter, 90);
  });
  map.on('load', () => setTimeout(updateBarangayUnderCenter, 350));

  // Yield control cleanly if the visitor manually drags/touches during the tour
  ['mousedown', 'touchstart', 'wheel'].forEach(ev => {
    map.getCanvas().addEventListener(ev, () => {
      if (state.tourActive && !state.tourPaused) {
        state.tourPaused = true;
        clearTourTimers();
        api.setAutoOrbit(false);
        updatePauseBtn();
      }
    }, { passive: true });
  });

  // Tactile click ripple on map taps
  map.on('click', ev => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = map.getCanvas().getBoundingClientRect();
    const rip = document.createElement('span');
    rip.className = 'explorer-ripple';
    rip.style.left = `${rect.left + ev.point.x}px`;
    rip.style.top = `${rect.top + ev.point.y}px`;
    document.body.appendChild(rip);
    setTimeout(() => rip.remove(), 580);
  });

  // Wire buttons
  dock.querySelector('#explorer-passport-btn').onclick = () => setPassportOpen(!state.passportOpen);
  passportPanel.querySelector('#explorer-passport-close').onclick = () => setPassportOpen(false);
  dock.querySelector('#explorer-next-btn').onclick = goNextStop;
  passportPanel.querySelector('#explorer-surprise-btn').onclick = goSurpriseStop;
  dock.querySelector('#explorer-tour-btn').onclick = () => (state.tourActive ? stopTour() : startTour());
  tourCard.querySelector('#tour-prev-btn').onclick = () => { state.tourPaused = false; updatePauseBtn(); runTourStop(state.tourIndex - 1); };
  tourCard.querySelector('#tour-next-btn').onclick = () => { state.tourPaused = false; updatePauseBtn(); runTourStop(state.tourIndex + 1); };
  tourCard.querySelector('#tour-pause-btn').onclick = toggleTourPause;
  tourCard.querySelector('#tour-stop-btn').onclick = stopTour;

  passportPanel.querySelector('#explorer-sound-btn').onclick = () => {
    state.sound = !state.sound;
    persist();
    renderUI();
    if (state.sound) playChime([659.25]);
  };

  document.querySelectorAll('.explorer-sun-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode) api.setLightingMode(mode);
    });
  });

  bgyChip.onclick = () => {
    const chk = document.getElementById('toggle-barangays');
    if (chk) {
      chk.checked = !chk.checked;
      chk.dispatchEvent(new Event('change', { bubbles: true }));
      showToast(
        chk.checked ? '59 Barangay boundaries shown' : 'Barangay boundaries hidden',
        lastBgyName ? `Currently over ${lastBgyName}` : 'Pan across the city to discover barangays'
      );
    }
  };

  // Close passport when clicking outside
  document.addEventListener('click', e => {
    if (!state.passportOpen) return;
    if (passportPanel.contains(e.target) || dock.contains(e.target)) return;
    setPassportOpen(false);
  });

  // Listen to native map events from app.js
  window.addEventListener('locus:landmark-selected', e => {
    const lm = e.detail;
    if (lm && lm.id) {
      pulseBeaconAt(lm, 3200);
      recordStamp(lm.id);
    }
  });
  window.addEventListener('locus:beacon-point', e => {
    const pt = e.detail;
    if (pt && Number.isFinite(pt.lng) && Number.isFinite(pt.lat)) pulseBeaconAt(pt, 3600);
  });
  window.addEventListener('locus:lighting-changed', e => {
    if (e.detail?.mode) {
      state.lighting = e.detail.mode;
      renderUI();
    }
  });
  window.addEventListener('locus:panel-visibility', e => {
    if (e.detail && e.detail.hidden === false) setPassportOpen(false);
  });

  // Keyboard shortcuts (ignored while typing)
  document.addEventListener('keydown', e => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'n') { e.preventDefault(); goNextStop(); }
    else if (k === 't') { e.preventDefault(); state.tourActive ? stopTour() : startTour(); }
    else if (k === 'p') { e.preventDefault(); setPassportOpen(!state.passportOpen); }
    else if (k === 'g') {
      e.preventDefault();
      const order = ['day', 'golden', 'night'];
      api.setLightingMode(order[(order.indexOf(state.lighting) + 1) % order.length]);
    } else if (e.key === 'Escape') {
      if (state.passportOpen) setPassportOpen(false);
      else if (state.tourActive) stopTour();
    }
  });

  // Initial stamp check + UI render
  renderUI();
  setTimeout(updateBarangayUnderCenter, 700);
})();
