/**
 * LOCUS-SF Hero Arrival Choreography
 * Orchestrates the Apple/Vercel-tier spatial arrival sequence when entering the homepage hero section.
 */
(() => {
  'use strict';

  function playArrivalHarmonic() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Soft harmonic triad (C5 - 523Hz, E5 - 659Hz, G5 - 784Hz)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.015, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + 0.6);
      });

      setTimeout(() => ctx.close().catch(() => {}), 700);
    } catch (_) {}
  }

  function countUpNumeric(element, target, durationMs = 1200) {
    if (!element) return;
    const start = 0;
    const startTime = performance.now();
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutCubic(progress);
      const current = start + (target - start) * eased;
      element.textContent = current.toFixed(1);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = target.toFixed(1);
      }
    }

    requestAnimationFrame(update);
  }

  function playHeroArrival(heroElement) {
    const hero = heroElement || document.querySelector('[data-hero-stage]');
    if (!hero) return;

    // 1. Reset and re-apply arrival class with forced reflow
    hero.classList.remove('is-hero-arriving');
    void hero.offsetWidth; // Force reflow
    hero.classList.add('is-hero-arriving');

    // 2. Play subtle arrival audio
    playArrivalHarmonic();

    // 3. Add arrival atmosphere bloom if not present
    let beam = hero.querySelector('.hero-arrival-beam');
    if (!beam) {
      beam = document.createElement('div');
      beam.className = 'hero-arrival-beam';
      beam.setAttribute('aria-hidden', 'true');
      hero.prepend(beam);
    }

    // 4. Add animated border beam to the dossier panel
    const dossier = hero.querySelector('.hero-dossier-panel');
    if (dossier) {
      let dossierBeam = dossier.querySelector('.hero-dossier-beam');
      if (!dossierBeam) {
        dossierBeam = document.createElement('div');
        dossierBeam.className = 'hero-dossier-beam';
        dossierBeam.setAttribute('aria-hidden', 'true');
        dossier.prepend(dossierBeam);
      }
    }

    // 5. Trigger numerical score count-up
    const scoreNode = document.getElementById('heroIaiScore');
    if (scoreNode) {
      const targetScore = parseFloat(scoreNode.textContent) || 87.0;
      scoreNode.textContent = '00.0';
      setTimeout(() => {
        countUpNumeric(scoreNode, targetScore, 1100);
      }, 350);
    }

    // 6. Cleanup arrival class after choreography completes
    setTimeout(() => {
      hero.classList.remove('is-hero-arriving');
      beam?.remove();
    }, 2400);
  }

  // Export API for welcome dialog or manual triggers
  window.LOCUS_HERO_ARRIVAL = {
    play: playHeroArrival
  };

  function initArrival() {
    const hero = document.querySelector('[data-hero-stage]');
    if (!hero) return;

    // Auto-play arrival animation on initial arrival/refresh
    requestAnimationFrame(() => {
      playHeroArrival(hero);
    });

    // Wire up replay triggers
    document.querySelectorAll('[data-replay-hero]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        playHeroArrival(hero);
      });
    });
  }

  // Ensure init runs regardless of when script is evaluated
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArrival);
  } else {
    initArrival();
  }
})();
