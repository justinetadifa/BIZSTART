(() => {
  const root = document.documentElement;
  const welcome = document.querySelector('[data-locus-welcome]');

  if (!welcome || !root.classList.contains('locus-welcome-active')) {
    welcome?.remove();
    return;
  }

  if (!("inert" in HTMLElement.prototype)) {
    root.classList.remove('locus-welcome-active');
    welcome.remove();
    return;
  }

  const continueControl = welcome.querySelector('[data-locus-welcome-continue]');
  const backdrop = welcome.querySelector('.locus-welcome__backdrop');
  const content = welcome.querySelector('.locus-welcome__content');
  const geo = welcome.querySelector('.locus-welcome__geo');
  const beaconsWrap = welcome.querySelector('.locus-welcome__beacons');
  const beacons = Array.from(welcome.querySelectorAll('.locus-beacon'));
  const clockEl = welcome.querySelector('[data-locus-clock]');
  const hudTargetEl = welcome.querySelector('[data-locus-hud-target]');
  const latEl = welcome.querySelector('[data-locus-lat]');
  const lngEl = welcome.querySelector('[data-locus-lng]');
  const canvas = welcome.querySelector('.locus-welcome__particles');

  const homepage = document.getElementById('main-content');
  const sessionKey = `locus-sf.welcome:${window.SFC_APP_CONFIG?.basePath || ''}`;
  const restricted = new Set();
  let observer;
  let leaving = false;
  let animFrameId = null;
  let clockInterval = null;

  // Reduced motion preference
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Accessibility: restrict page content while modal is open
  const restrict = (element) => {
    if (!(element instanceof HTMLElement) || element === welcome || element.inert) return;
    element.inert = true;
    restricted.add(element);
  };

  Array.from(document.body.children).forEach(restrict);
  observer = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach(restrict));
  });
  observer.observe(document.body, { childList: true });

  // Cleanup helper
  const cleanUp = () => {
    observer?.disconnect();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (clockInterval) clearInterval(clockInterval);
    restricted.forEach((element) => {
      element.inert = false;
    });
    restricted.clear();
  };

  const revealHomepage = () => {
    cleanUp();
    root.classList.remove('locus-welcome-active');
    welcome.remove();
    homepage?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      window.LOCUS_HERO_ARRIVAL?.play();
    });
  };

  /* -------------------------------------------------------------
     1. Live PHT Clock & Telemetry
     ------------------------------------------------------------- */
  const updateClock = () => {
    if (!clockEl) return;
    try {
      const now = new Date();
      // PHT is UTC+8
      const pht = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000);
      const hours = String(pht.getHours()).padStart(2, '0');
      const minutes = String(pht.getMinutes()).padStart(2, '0');
      const seconds = String(pht.getSeconds()).padStart(2, '0');
      clockEl.innerHTML = `San Fernando &bull; ${hours}:${minutes}:${seconds} PHT &bull; 29&deg;C`;
    } catch {
      // Fallback
    }
  };
  updateClock();
  clockInterval = setInterval(updateClock, 1000);

  /* -------------------------------------------------------------
     2. Interactive Spatial Beacons & Telemetry Lock
     ------------------------------------------------------------- */
  const defaultCoords = {
    lat: '16.6159&deg; N',
    lng: '120.3166&deg; E',
    target: 'PORO POINT HORIZON'
  };

  const scrambleCoordinate = (targetEl, finalHtml) => {
    if (!targetEl) return;
    const chars = '0123456789.';
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count >= 5) {
        clearInterval(interval);
        targetEl.innerHTML = finalHtml;
      } else {
        const rand = (Math.random() * 99).toFixed(2);
        targetEl.innerHTML = `${rand}&deg;`;
      }
    }, 25);
  };

  beacons.forEach((beacon) => {
    const handleActive = () => {
      beacons.forEach(b => b.classList.remove('is-active'));
      beacon.classList.add('is-active');

      const lat = beacon.dataset.lat;
      const lng = beacon.dataset.lng;
      const name = beacon.dataset.name;

      if (lat && latEl) scrambleCoordinate(latEl, lat);
      if (lng && lngEl) scrambleCoordinate(lngEl, lng);
      if (name && hudTargetEl) {
        hudTargetEl.textContent = name.toUpperCase();
        hudTargetEl.style.color = '#f5b43e';
      }
    };

    const handleInactive = () => {
      beacon.classList.remove('is-active');
      if (latEl) latEl.innerHTML = defaultCoords.lat;
      if (lngEl) lngEl.innerHTML = defaultCoords.lng;
      if (hudTargetEl) {
        hudTargetEl.textContent = defaultCoords.target;
        hudTargetEl.style.color = '';
      }
    };

    beacon.addEventListener('mouseenter', handleActive);
    beacon.addEventListener('mouseleave', handleInactive);
    beacon.addEventListener('focus', handleActive);
    beacon.addEventListener('blur', handleInactive);
    beacon.addEventListener('click', (e) => {
      e.stopPropagation();
      handleActive();
      // Optional subtle synthesized audio feedback
      playChime(640, 0.02, 100);
    });
  });

  /* -------------------------------------------------------------
     3. Ambient Golden-Hour Particle System (Canvas)
     ------------------------------------------------------------- */
  if (canvas && !prefersReduced) {
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let particles = [];
    const count = 36;
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = welcome.clientWidth;
      height = welcome.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    class Particle {
      constructor() {
        this.reset(true);
      }
      reset(initial = false) {
        this.x = Math.random() * (width || window.innerWidth);
        this.y = initial ? Math.random() * (height || window.innerHeight) : (height || window.innerHeight) + 10;
        this.size = Math.random() * 2.2 + 0.8;
        this.speedY = Math.random() * 0.45 + 0.15;
        this.speedX = (Math.random() - 0.5) * 0.25;
        this.alpha = Math.random() * 0.55 + 0.25;
        this.pulse = Math.random() * 0.02 + 0.005;
        this.pulseDir = 1;
        this.gold = Math.random() > 0.35;
      }
      update() {
        this.y -= this.speedY;
        this.x += this.speedX + Math.sin(this.y * 0.01) * 0.2;

        // Subtle mouse deflection
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 100) {
          const force = (100 - dist) / 100;
          this.x += (dx / dist) * force * 1.5;
          this.y += (dy / dist) * force * 1.5;
        }

        this.alpha += this.pulse * this.pulseDir;
        if (this.alpha > 0.8) this.pulseDir = -1;
        if (this.alpha < 0.2) this.pulseDir = 1;

        if (this.y < -10 || this.x < -10 || this.x > width + 10) {
          this.reset(false);
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.gold
          ? `rgba(245, 180, 62, ${this.alpha})`
          : `rgba(255, 255, 255, ${this.alpha * 0.8})`;
        ctx.shadowColor = 'rgba(245, 180, 62, 0.6)';
        ctx.shadowBlur = this.size * 3;
        ctx.fill();
      }
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    for (let i = 0; i < count; i++) particles.push(new Particle());

    const animateParticles = () => {
      if (leaving) return;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.update();
        p.draw();
      }
      animFrameId = requestAnimationFrame(animateParticles);
    };
    animFrameId = requestAnimationFrame(animateParticles);

    welcome.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });
  }

  /* -------------------------------------------------------------
     4. Interactive 3D Cursor Tilt & Specular Physics
     ------------------------------------------------------------- */
  if (!prefersReduced && window.innerWidth > 680) {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isTracking = true;

    welcome.addEventListener('mousemove', (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      targetX = (e.clientX - w / 2) / (w / 2);
      targetY = (e.clientY - h / 2) / (h / 2);
    }, { passive: true });

    welcome.addEventListener('mouseleave', () => {
      targetX = 0;
      targetY = 0;
    });

    const updatePhysics = () => {
      if (leaving || !isTracking) return;

      // Smooth damping lerp
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (content) {
        const tiltX = (currentY * -3.5).toFixed(2);
        const tiltY = (currentX * 4.5).toFixed(2);
        const shiftX = (currentX * 8).toFixed(1);
        const shiftY = (currentY * 6).toFixed(1);
        const glareX = Math.round(50 + currentX * 35);
        const glareY = Math.round(45 + currentY * 35);

        content.style.setProperty('--tilt-x', `${tiltX}deg`);
        content.style.setProperty('--tilt-y', `${tiltY}deg`);
        content.style.setProperty('--shift-x', `${shiftX}px`);
        content.style.setProperty('--shift-y', `${shiftY}px`);
        content.style.setProperty('--glare-x', `${glareX}%`);
        content.style.setProperty('--glare-y', `${glareY}%`);
      }

      if (geo) {
        const geoShiftX = (currentX * 12).toFixed(1);
        const geoShiftY = (currentY * 10).toFixed(1);
        geo.style.transform = `translateY(-52%) translate3d(${geoShiftX}px, ${geoShiftY}px, 0)`;
      }

      if (beaconsWrap) {
        const bShiftX = (currentX * -10).toFixed(1);
        const bShiftY = (currentY * -8).toFixed(1);
        beaconsWrap.style.transform = `translate3d(${bShiftX}px, ${bShiftY}px, 0)`;
      }

      requestAnimationFrame(updatePhysics);
    };

    requestAnimationFrame(updatePhysics);
  }

  /* -------------------------------------------------------------
     5. Synthesized Audio (Low-key futuristic chime)
     ------------------------------------------------------------- */
  const playChime = (freq = 520, gainVol = 0.03, durationMs = 150) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + durationMs / 1000);

      gain.gain.setValueAtTime(gainVol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
      setTimeout(() => ctx.close().catch(() => {}), durationMs + 50);
    } catch {
      // Audio is optional and non-blocking
    }
  };

  /* -------------------------------------------------------------
     6. Cinematic Exit Lifecycle
     ------------------------------------------------------------- */
  const handleExit = (event) => {
    if (leaving) return;
    leaving = true;
    event?.preventDefault();

    setTimeout(() => {
      try {
        playChime(580, 0.04, 220);
      } catch {}
    }, 0);

    try {
      window.sessionStorage.setItem(sessionKey, '1');
    } catch {
      // Continue for this visit even when session storage is unavailable.
    }

    const fallbackTimer = window.setTimeout(revealHomepage, 280);
    welcome.addEventListener('transitionend', (transitionEvent) => {
      if (transitionEvent.target !== welcome || transitionEvent.propertyName !== 'opacity') return;
      window.clearTimeout(fallbackTimer);
      revealHomepage();
    });
    welcome.classList.add('is-leaving');
  };

  continueControl?.addEventListener('click', handleExit);

  // Keyboard accessibility & hotkeys
  welcome.addEventListener('keydown', (e) => {
    if (leaving) return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (e.target instanceof HTMLButtonElement && e.target !== continueControl) {
        // Let beacon handle its own click
        return;
      }
      handleExit(e);
    } else if (e.key === '1' && beacons[0]) {
      beacons[0].focus();
    } else if (e.key === '2' && beacons[1]) {
      beacons[1].focus();
    } else if (e.key === '3' && beacons[2]) {
      beacons[2].focus();
    } else if (e.key === 'Escape') {
      handleExit(e);
    }
  });

  continueControl?.focus({ preventScroll: true });
})();
