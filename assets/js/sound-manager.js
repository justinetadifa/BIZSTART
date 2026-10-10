/**
 * LOCUS-SF Interaction Sound Manager
 * iOS-inspired, lightweight Web Audio API sound synthesizer and preference controller.
 * Generates soft micro-taps, selection ticks, confirmation chimes, and completion cues
 * with smooth attack/release envelopes to eliminate clicks, pops, and harsh beeps.
 */
(function (window, document) {
  'use strict';

  const STORAGE_KEY = 'locus_sound_preferences';
  const PENDING_LOGIN_KEY = 'locus_pending_login_sound';
  const APPROVED_HISTORY_KEY = 'locus_played_approvals';

  // Default Sound Preferences
  const defaults = {
    enabled: false,
    volume: 0.35,
    scrollFeedback: false,
  };

  let preferences = { ...defaults };
  let audioCtx = null;
  let masterGain = null;
  let lastTapTime = 0;
  let lastScrollSoundTime = 0;
  let majorSoundActiveUntil = 0;

  // Load preferences from storage safely
  function loadPreferences() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        preferences = {
          enabled: Boolean(parsed.enabled),
          volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : defaults.volume,
          scrollFeedback: Boolean(parsed.scrollFeedback),
        };
      }
    } catch (e) {
      // Storage unavailable or blocked
      preferences = { ...defaults };
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      // Ignored
    }
    updateUI();
  }

  // Lazy AudioContext initialization
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      try {
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(preferences.volume, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
      } catch (err) {
        audioCtx = null;
        masterGain = null;
      }
    }
    return audioCtx;
  }

  // Attempt to resume audio context on explicit user gesture
  async function unlockAudio() {
    const ctx = getAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        return false;
      }
    }
    return ctx.state === 'running';
  }

  // Synthesize an iOS-inspired gentle envelope
  function playTone({ freq, type = 'sine', duration = 0.05, gain = 0.2, endFreq = null, filterFreq = null, delay = 0 }) {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running' || !masterGain) return;

    try {
      const startTime = ctx.currentTime + Math.max(0, delay);
      const osc = ctx.createOscillator();
      const nodeGain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      if (endFreq && endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), startTime + duration);
      }

      // Smooth attack and release to eliminate clicks/pops
      const attack = 0.003;
      nodeGain.gain.setValueAtTime(0.0001, startTime);
      nodeGain.gain.linearRampToValueAtTime(gain, startTime + attack);
      nodeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      if (filterFreq) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, startTime);
        osc.connect(filter);
        filter.connect(nodeGain);
      } else {
        osc.connect(nodeGain);
      }

      nodeGain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);

      // Clean up nodes after completion
      setTimeout(() => {
        try {
          osc.disconnect();
          nodeGain.disconnect();
        } catch (_) {}
      }, (delay + duration + 0.05) * 1000);
    } catch (err) {
      // Audio playback errors must never disrupt app operations
    }
  }

  // Centralized Sound Definitions
  const soundLibrary = {
    // 1. Soft Micro-Tap: 35-45ms, gentle sine decay, lowpass filtered
    tap() {
      const now = performance.now();
      if (now - lastTapTime < 50 || now < majorSoundActiveUntil) return;
      lastTapTime = now;
      playTone({
        freq: 480,
        endFreq: 240,
        type: 'sine',
        duration: 0.04,
        gain: 0.16,
        filterFreq: 1100,
      });
    },

    // 2. Selection Tick: 50-60ms, gentle iOS picker/segmented control tick
    select() {
      const now = performance.now();
      if (now < majorSoundActiveUntil) return;
      playTone({
        freq: 860,
        endFreq: 1120,
        type: 'sine',
        duration: 0.055,
        gain: 0.22,
      });
    },

    // 3. Confirmation Chime: 200-240ms, welcoming rising two-tone chime (C6 -> E6)
    success() {
      majorSoundActiveUntil = performance.now() + 250;
      // Tone 1: C6 (1046 Hz)
      playTone({
        freq: 1046.5,
        type: 'sine',
        duration: 0.09,
        gain: 0.24,
        delay: 0,
      });
      // Tone 2: E6 (1318 Hz)
      playTone({
        freq: 1318.5,
        type: 'sine',
        duration: 0.15,
        gain: 0.26,
        delay: 0.075,
      });
    },

    // 4. Approved Listing Chime: 280-320ms, warm 3-note ascending triad (F5 -> A5 -> C6)
    approved() {
      majorSoundActiveUntil = performance.now() + 350;
      // Note 1: F5 (698.46 Hz)
      playTone({
        freq: 698.5,
        type: 'sine',
        duration: 0.08,
        gain: 0.22,
        delay: 0,
      });
      // Note 2: A5 (880 Hz)
      playTone({
        freq: 880,
        type: 'sine',
        duration: 0.09,
        gain: 0.25,
        delay: 0.07,
      });
      // Note 3: C6 (1046.5 Hz)
      playTone({
        freq: 1046.5,
        type: 'sine',
        duration: 0.18,
        gain: 0.28,
        delay: 0.14,
      });
    },

    // 5. Restrained Deletion Tone: 130-150ms, calm descending minor third (A4 -> F#4)
    delete() {
      majorSoundActiveUntil = performance.now() + 200;
      playTone({
        freq: 440,
        type: 'sine',
        duration: 0.06,
        gain: 0.18,
        delay: 0,
      });
      playTone({
        freq: 370,
        type: 'sine',
        duration: 0.09,
        gain: 0.20,
        delay: 0.05,
      });
    },

    // 6. Failed Action Cue: 150-180ms, quiet gentle low double bump
    error() {
      majorSoundActiveUntil = performance.now() + 220;
      playTone({
        freq: 220,
        endFreq: 180,
        type: 'triangle',
        duration: 0.07,
        gain: 0.18,
        delay: 0,
      });
      playTone({
        freq: 180,
        endFreq: 140,
        type: 'triangle',
        duration: 0.09,
        gain: 0.16,
        delay: 0.065,
      });
    },
  };

  // Main Public Interface
  const LocusSound = {
    play(soundName) {
      if (!preferences.enabled) return;
      if (document.hidden) return;

      const player = soundLibrary[soundName];
      if (typeof player !== 'function') return;

      const ctx = getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'running') {
        player();
      } else if (ctx.state === 'suspended') {
        // Attempt resume non-blockingly
        ctx.resume().then(() => {
          if (ctx.state === 'running') player();
        }).catch(() => {});
      }
    },

    isEnabled() {
      return preferences.enabled;
    },

    setEnabled(val) {
      preferences.enabled = Boolean(val);
      if (preferences.enabled) {
        unlockAudio();
      }
      savePreferences();
    },

    getVolume() {
      return preferences.volume;
    },

    setVolume(val) {
      const v = Math.max(0, Math.min(1, Number(val)));
      preferences.volume = v;
      if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(v, audioCtx.currentTime);
      }
      savePreferences();
    },

    isScrollEnabled() {
      return preferences.enabled && preferences.scrollFeedback;
    },

    setScrollEnabled(val) {
      preferences.scrollFeedback = Boolean(val);
      savePreferences();
    },

    async preview() {
      const unlocked = await unlockAudio();
      if (unlocked) {
        // Temporarily allow preview even if overall switch is toggled
        const wasEnabled = preferences.enabled;
        preferences.enabled = true;
        soundLibrary.success();
        preferences.enabled = wasEnabled;
      }
    },

    async sample(name) {
      if (!name || typeof soundLibrary[name] !== 'function') return;
      const unlocked = await unlockAudio();
      if (unlocked) {
        const wasEnabled = preferences.enabled;
        preferences.enabled = true;
        soundLibrary[name]();
        preferences.enabled = wasEnabled;
      }
    },

    unlock() {
      return unlockAudio();
    },

    markPendingLogin() {
      try {
        sessionStorage.setItem(PENDING_LOGIN_KEY, '1');
      } catch (e) {}
    },

    clearPendingLogin() {
      try {
        sessionStorage.removeItem(PENDING_LOGIN_KEY);
      } catch (e) {}
    },

    playLoginSuccess() {
      try {
        const pending = sessionStorage.getItem(PENDING_LOGIN_KEY);
        if (!pending) return;
        sessionStorage.removeItem(PENDING_LOGIN_KEY); // Consume once immediately

        if (!preferences.enabled) return;
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'running') {
          soundLibrary.success();
        } else if (ctx && ctx.state === 'suspended') {
          // Attempt immediate resume without queuing
          ctx.resume().then(() => {
            if (ctx.state === 'running') soundLibrary.success();
          }).catch(() => {});
        }
      } catch (e) {}
    },

    // Record an approval so it never replays on refresh
    markApprovalHandled(id) {
      try {
        const raw = sessionStorage.getItem(APPROVED_HISTORY_KEY) || '[]';
        const list = JSON.parse(raw);
        if (!list.includes(id)) {
          list.push(id);
          sessionStorage.setItem(APPROVED_HISTORY_KEY, JSON.stringify(list));
        }
      } catch (e) {}
    },

    isApprovalHandled(id) {
      try {
        const raw = sessionStorage.getItem(APPROVED_HISTORY_KEY) || '[]';
        const list = JSON.parse(raw);
        return list.includes(id);
      } catch (e) {
        return false;
      }
    },
  };

  // UI State Sync
  function updateUI() {
    // Header trigger icon & title (if present)
    const headerBtn = document.getElementById('citySoundBtn');
    if (headerBtn) {
      headerBtn.classList.toggle('is-enabled', preferences.enabled);
      headerBtn.setAttribute('aria-label', preferences.enabled ? 'Sound settings (Enabled)' : 'Sound settings (Disabled)');
      const mutedIcon = headerBtn.querySelector('.city-sound-icon-muted');
      const activeIcon = headerBtn.querySelector('.city-sound-icon-active');
      if (mutedIcon && activeIcon) {
        mutedIcon.style.display = preferences.enabled ? 'none' : 'block';
        activeIcon.style.display = preferences.enabled ? 'block' : 'none';
      }
    }

    // Help Center top-bar sound indicator
    const helpSoundIndicator = document.getElementById('locusHelpSoundIndicator');
    if (helpSoundIndicator) {
      helpSoundIndicator.classList.toggle('is-enabled', preferences.enabled);
      helpSoundIndicator.setAttribute('aria-label', preferences.enabled ? 'Interface sound settings (Enabled)' : 'Interface sound settings (Disabled)');
      const mutedIcon = helpSoundIndicator.querySelector('.city-sound-icon-muted');
      const activeIcon = helpSoundIndicator.querySelector('.city-sound-icon-active');
      if (mutedIcon && activeIcon) {
        mutedIcon.style.display = preferences.enabled ? 'none' : 'block';
        activeIcon.style.display = preferences.enabled ? 'block' : 'none';
      }
      const indicatorText = document.getElementById('locusSoundIndicatorText');
      if (indicatorText) {
        indicatorText.textContent = preferences.enabled ? `Sound: ${Math.round(preferences.volume * 100)}%` : 'Sound: OFF';
      }
    }

    // Modal controls
    const toggle = document.getElementById('locusSoundToggle');
    if (toggle) {
      toggle.checked = preferences.enabled;
      toggle.setAttribute('aria-checked', String(preferences.enabled));
    }

    const controlsGroup = document.getElementById('locusSoundControlsGroup');
    if (controlsGroup) {
      controlsGroup.classList.toggle('is-disabled', !preferences.enabled);
    }

    const volumeInput = document.getElementById('locusSoundVolume');
    const volumeVal = document.getElementById('locusSoundVolumeVal');
    if (volumeInput) {
      const pct = Math.round(preferences.volume * 100);
      volumeInput.value = String(pct);
      volumeInput.disabled = !preferences.enabled;
      if (volumeVal) volumeVal.textContent = pct + '%';
    }

    const scrollToggle = document.getElementById('locusSoundScrollToggle');
    if (scrollToggle) {
      scrollToggle.checked = preferences.scrollFeedback;
      scrollToggle.disabled = !preferences.enabled;
      scrollToggle.setAttribute('aria-checked', String(preferences.scrollFeedback));
    }

    // Profile page embedded controls if present
    const profileToggle = document.getElementById('profileSoundToggle');
    if (profileToggle) {
      profileToggle.checked = preferences.enabled;
    }
    const profileScrollToggle = document.getElementById('profileSoundScrollToggle');
    if (profileScrollToggle) {
      profileScrollToggle.checked = preferences.scrollFeedback;
      profileScrollToggle.disabled = !preferences.enabled;
    }
  }

  // Modal open / close handlers
  function openSoundDialog() {
    const dialog = document.getElementById('locusSoundDialog');
    if (!dialog) return;
    updateUI();
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    const closeBtn = document.getElementById('locusSoundCloseBtn');
    if (closeBtn) closeBtn.focus();
  }

  function closeSoundDialog() {
    const dialog = document.getElementById('locusSoundDialog');
    if (!dialog) return;
    if (typeof dialog.close === 'function') {
      if (dialog.open) dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  // Bind UI Events
  function initUI() {
    loadPreferences();
    updateUI();

    // Trigger buttons
    document.querySelectorAll('#citySoundBtn, #cityFooterSoundBtn, [data-open-sound-settings]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.openLocusHelp === 'function') {
          window.openLocusHelp('sounds');
        } else {
          openSoundDialog();
        }
      });
    });

    // Sound Library Sampler Pills in FAQ Interface
    document.querySelectorAll('[data-sample-sound]').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        const soundName = pill.getAttribute('data-sample-sound');
        if (soundName && typeof LocusSound.sample === 'function') {
          LocusSound.sample(soundName);
        }
      });
    });

    const closeBtn = document.getElementById('locusSoundCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeSoundDialog);
    }

    const dialog = document.getElementById('locusSoundDialog');
    if (dialog) {
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) closeSoundDialog();
      });
    }

    // Main Toggle
    const toggle = document.getElementById('locusSoundToggle');
    if (toggle) {
      toggle.addEventListener('change', () => {
        LocusSound.setEnabled(toggle.checked);
        if (toggle.checked) {
          LocusSound.play('select');
        }
      });
    }

    // Volume Slider
    const volumeInput = document.getElementById('locusSoundVolume');
    if (volumeInput) {
      volumeInput.addEventListener('input', () => {
        const val = Number(volumeInput.value) / 100;
        LocusSound.setVolume(val);
      });
      volumeInput.addEventListener('change', () => {
        LocusSound.play('tap');
      });
    }

    // Preview button
    const previewBtn = document.getElementById('locusSoundPreviewBtn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        LocusSound.preview();
      });
    }

    // Scroll Feedback toggle
    const scrollToggle = document.getElementById('locusSoundScrollToggle');
    if (scrollToggle) {
      scrollToggle.addEventListener('change', () => {
        LocusSound.setScrollEnabled(scrollToggle.checked);
        if (scrollToggle.checked) {
          LocusSound.play('select');
        }
      });
    }

    // Profile page sync
    const profileToggle = document.getElementById('profileSoundToggle');
    if (profileToggle) {
      profileToggle.addEventListener('change', () => {
        LocusSound.setEnabled(profileToggle.checked);
      });
    }
    const profileScrollToggle = document.getElementById('profileSoundScrollToggle');
    if (profileScrollToggle) {
      profileScrollToggle.addEventListener('change', () => {
        LocusSound.setScrollEnabled(profileScrollToggle.checked);
      });
    }

    // Check one-time pending login sound
    LocusSound.playLoginSuccess();
  }

  // ---------------------------------------------------------------------------
  // User Scroll Feedback: Quiet settling tick on deliberate scrollend
  // ---------------------------------------------------------------------------
  function initScrollFeedback() {
    let isUserInteracting = false;
    let scrollStartY = window.scrollY;
    let scrollEndTimeout = null;

    // Detect explicit user interaction for scrolling
    const markUserInteracting = () => { isUserInteracting = true; };
    window.addEventListener('wheel', markUserInteracting, { passive: true });
    window.addEventListener('touchstart', (e) => {
      // Ignore if inside Leaflet map
      if (e.target.closest && e.target.closest('.leaflet-container, .leaflet-pane')) {
        isUserInteracting = false;
        return;
      }
      isUserInteracting = true;
      scrollStartY = window.scrollY;
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space'].includes(e.code)) {
        isUserInteracting = true;
      }
    }, { passive: true });

    function handleScrollSettled() {
      if (!isUserInteracting) return;
      isUserInteracting = false;

      if (!LocusSound.isScrollEnabled()) return;

      const delta = Math.abs(window.scrollY - scrollStartY);
      scrollStartY = window.scrollY;

      // Require meaningful movement (at least 70px) and rate-limit to once per 600ms
      const now = performance.now();
      if (delta >= 70 && now - lastScrollSoundTime > 600) {
        lastScrollSoundTime = now;
        LocusSound.play('select');
      }
    }

    // Use standard 'scrollend' where available
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', handleScrollSettled, { passive: true });
    } else {
      // Fallback debounced scrollend
      window.addEventListener('scroll', () => {
        if (!isUserInteracting) return;
        clearTimeout(scrollEndTimeout);
        scrollEndTimeout = setTimeout(handleScrollSettled, 140);
      }, { passive: true });
    }
  }

  // ---------------------------------------------------------------------------
  // Global Interactive Listeners (Buttons, Tabs, Filters, Saves, Errors)
  // ---------------------------------------------------------------------------
  function initInteractionListeners() {
    let lastPointerDownTimestamp = 0;

    // Click & Tap listener with event delegation
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!target || !target.closest) return;

      // Unlock audio on any valid click gesture if enabled
      if (preferences.enabled) {
        unlockAudio();
      }

      // Avoid double-firing on rapid click/touch synthesis
      const now = performance.now();
      if (now - lastPointerDownTimestamp < 30) return;
      lastPointerDownTimestamp = now;

      // 1. Tabs & View Switchers: gentle selection tick
      const tabEl = target.closest('.locus-help-tab-btn, [data-locus-tab], [data-assessment-tab], [data-investor-mode], [role="tab"], .tab-btn');
      if (tabEl) {
        // Only if changing state (not already active)
        const isSelected = tabEl.getAttribute('aria-selected') === 'true' || tabEl.getAttribute('aria-pressed') === 'true' || tabEl.classList.contains('is-active');
        if (!isSelected) {
          LocusSound.play('select');
          return;
        }
      }

      // 2. Save / Bookmark & Compare toggles
      const saveOrCompare = target.closest('[data-save-property], [data-compare-property], .listing-save-btn, .property-details-save, [data-action="save"], [data-action="compare"]');
      if (saveOrCompare) {
        LocusSound.play('select');
        return;
      }

      // 3. Navigation & Buttons: short quiet tap
      const buttonEl = target.closest('button, .city-button, .btn-shell, .city-nav a, .city-brand, .city-profile-link, .city-signout-link, .city-login-link, .locus-help-close-btn, .city-updates-close-btn, .locus-help-back-link, .locus-accordion-header, [role="button"]');
      if (buttonEl) {
        // Skip disabled buttons or buttons with specific audio suppressors
        if (buttonEl.disabled || buttonEl.classList.contains('disabled') || buttonEl.hasAttribute('data-no-sound-tap')) return;
        // Skip sound settings controls themselves to prevent feedback loops
        if (buttonEl.closest('#locusSoundDialog') && buttonEl.id !== 'locusSoundPreviewBtn') return;
        if (buttonEl.id === 'citySoundBtn') return;

        LocusSound.play('tap');
      }
    }, true);

    // Filter changes (Dropdowns, checkboxes, radios)
    document.addEventListener('change', (event) => {
      const target = event.target;
      if (!target || !target.closest) return;

      // Ignore sound dialog toggles
      if (target.closest('#locusSoundDialog')) return;

      if (target.matches('select, input[type="checkbox"], input[type="radio"], [data-filter]')) {
        LocusSound.play('select');
      }
    }, true);

    // Login Form Tracking
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (form && (form.action?.includes('login') || form.querySelector('[type="password"]'))) {
        LocusSound.markPendingLogin();
      }
    }, true);

    // Error message detection on page load (e.g. redirected or submitted with error)
    if (document.querySelector('.profile-flash-message.is-error, .auth-alert-error, .account-message.is-error, .city-error')) {
      LocusSound.clearPendingLogin();
      LocusSound.play('error');
    }
  }

  // Export to window
  window.LocusSound = LocusSound;

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initUI();
      initScrollFeedback();
      initInteractionListeners();
    });
  } else {
    initUI();
    initScrollFeedback();
    initInteractionListeners();
  }
})(window, document);
