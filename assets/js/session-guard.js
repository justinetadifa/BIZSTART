/**
 * LOCUS-SF Enterprise Security Session Guard
 * Automated Inactivity Detection, Cross-Tab Sync & Security Timeout Advisory
 */
(() => {
  'use strict';

  const config = window.SFC_APP_CONFIG?.sessionSecurity;
  if (!config || !config.enabled) {
    return;
  }

  const TIMEOUT_SEC = Math.max(120, Number(config.timeoutSeconds || 900));
  const WARNING_SEC = Math.min(120, Math.max(15, Number(config.warningSeconds || 60)));
  const PING_URL = config.pingUrl || 'api/session-ping.php';
  const LOGOUT_URL = config.logoutUrl || 'logout.php';
  const LOGIN_URL = config.loginUrl || 'index.php?reason=timeout';
  const STORAGE_KEY = 'locus_sf_session_last_activity';

  let warningActive = false;
  let countdownInterval = null;
  let checkInterval = null;
  let lastActiveTimestamp = Date.now();

  // Initialize cross-tab activity tracker
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (!stored || Date.now() - stored > TIMEOUT_SEC * 1000) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } else {
      lastActiveTimestamp = stored;
    }
  } catch {
    // LocalStorage fallback
  }

  function getLatestActivity() {
    try {
      const stored = Number(localStorage.getItem(STORAGE_KEY));
      if (stored && Number.isFinite(stored)) {
        return Math.max(lastActiveTimestamp, stored);
      }
    } catch {}
    return lastActiveTimestamp;
  }

  function recordActivity(syncServer = false) {
    const now = Date.now();
    // Throttle local activity updates to once every 4 seconds
    if (now - lastActiveTimestamp < 4000 && !syncServer) {
      return;
    }

    lastActiveTimestamp = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {}

    if (warningActive) {
      dismissWarningModal();
      if (syncServer) {
        pingSession();
      }
    }
  }

  // Cross-tab synchronization: if user is working in another tab, reset here too
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      const remoteTime = Number(event.newValue);
      if (remoteTime > lastActiveTimestamp) {
        lastActiveTimestamp = remoteTime;
        if (warningActive) {
          dismissWarningModal();
        }
      }
    }
  });

  // User input event listeners
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  activityEvents.forEach((evt) => {
    window.addEventListener(evt, () => recordActivity(false), { passive: true });
  });

  // Background check runner
  function runSessionCheck() {
    const now = Date.now();
    const effectiveLastActive = getLatestActivity();
    const elapsedSeconds = Math.floor((now - effectiveLastActive) / 1000);
    const remainingSeconds = TIMEOUT_SEC - elapsedSeconds;

    if (remainingSeconds <= 0) {
      terminateSession();
      return;
    }

    if (remainingSeconds <= WARNING_SEC && !warningActive) {
      showWarningModal(remainingSeconds);
    }
  }

  // Ping backend to renew server-side activity timestamp
  async function pingSession() {
    try {
      const res = await fetch(PING_URL, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': window.SFC_APP_CONFIG?.csrfToken || '',
        },
      });
      const data = await res.json();
      if (data && data.ok) {
        recordActivity(false);
        return true;
      }
      if (data && data.expired) {
        terminateSession();
      }
    } catch (e) {
      // Fallback
    }
    return false;
  }

  // Inject or return modal DOM element
  function ensureModalElement() {
    let modal = document.getElementById('sfcSessionSecurityModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sfcSessionSecurityModal';
      modal.className = 'sfc-security-modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'sfcSecModalTitle');
      modal.innerHTML = `
        <div class="sfc-security-modal-card">
          <div class="sfc-sec-card-glow" aria-hidden="true"></div>
          
          <div class="sfc-sec-card-header">
            <div class="sfc-sec-badge">
              <span class="sfc-sec-radar-dot"></span>
              <span>SECURITY TIMEOUT ADVISORY</span>
            </div>
            <div class="sfc-sec-countdown-pill" id="sfcSecCountdownPill">
              <span class="sfc-sec-time-val" id="sfcSecCountdownDisplay">00:60</span>
            </div>
          </div>

          <div class="sfc-sec-body">
            <h3 id="sfcSecModalTitle" class="sfc-sec-title">Inactivity Lock Pending</h3>
            <p class="sfc-sec-desc">
              Your authorized session will automatically lock to safeguard municipal records, CLUP intelligence, and investor operations.
            </p>
            <div class="sfc-sec-meter">
              <div class="sfc-sec-meter-fill" id="sfcSecMeterFill"></div>
            </div>
          </div>

          <div class="sfc-sec-actions">
            <button type="button" class="sfc-sec-btn sfc-sec-btn-primary" id="sfcBtnStayLoggedIn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Keep Session Active</span>
            </button>
            <button type="button" class="sfc-sec-btn sfc-sec-btn-glass" id="sfcBtnSignOutNow">
              <span>Sign Out Now</span>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('sfcBtnStayLoggedIn')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.classList.add('is-loading');
        btn.querySelector('span').textContent = 'Renewing...';
        await pingSession();
        dismissWarningModal();
      });

      document.getElementById('sfcBtnSignOutNow')?.addEventListener('click', () => {
        terminateSession();
      });
    }
    return modal;
  }

  function showWarningModal(initialSeconds) {
    warningActive = true;
    const modal = ensureModalElement();
    const display = document.getElementById('sfcSecCountdownDisplay');
    const meter = document.getElementById('sfcSecMeterFill');
    modal.classList.add('is-visible');

    let secondsLeft = initialSeconds;

    const updateUI = () => {
      if (display) {
        const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
        const secs = String(secondsLeft % 60).padStart(2, '0');
        display.textContent = `${mins}:${secs}`;
      }
      if (meter) {
        const pct = Math.max(0, Math.min(100, (secondsLeft / WARNING_SEC) * 100));
        meter.style.width = `${pct}%`;
      }
    };

    updateUI();

    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      const now = Date.now();
      const effectiveLastActive = getLatestActivity();
      const elapsed = Math.floor((now - effectiveLastActive) / 1000);
      secondsLeft = TIMEOUT_SEC - elapsed;

      if (secondsLeft <= 0) {
        clearInterval(countdownInterval);
        terminateSession();
        return;
      }
      updateUI();
    }, 1000);
  }

  function dismissWarningModal() {
    warningActive = false;
    clearInterval(countdownInterval);
    const modal = document.getElementById('sfcSessionSecurityModal');
    if (modal) {
      modal.classList.remove('is-visible');
      const primaryBtn = modal.querySelector('#sfcBtnStayLoggedIn');
      if (primaryBtn) {
        primaryBtn.classList.remove('is-loading');
        primaryBtn.querySelector('span').textContent = 'Keep Session Active';
      }
    }
  }

  // Gracefully terminate session and redirect to role-specific login with timeout alert
  function terminateSession() {
    clearInterval(countdownInterval);
    clearInterval(checkInterval);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    // Show instant visual lock screen
    let lockScreen = document.getElementById('sfcLockScreenOverlay');
    if (!lockScreen) {
      lockScreen = document.createElement('div');
      lockScreen.id = 'sfcLockScreenOverlay';
      lockScreen.className = 'sfc-lock-screen-overlay';
      lockScreen.innerHTML = `
        <div class="sfc-lock-box">
          <div class="sfc-lock-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h3>Session Locked</h3>
          <p>Safeguarding municipal spatial intelligence... Redirecting to login.</p>
        </div>
      `;
      document.body.appendChild(lockScreen);
    }
    requestAnimationFrame(() => lockScreen.classList.add('is-active'));

    // Submit logout form or redirect to logout with reason
    setTimeout(() => {
      window.location.href = `${LOGOUT_URL}?reason=timeout`;
    }, 500);
  }

  // Run periodic check every second
  checkInterval = setInterval(runSessionCheck, 1000);

  // Expose API on window
  window.SFC_SESSION_GUARD = {
    reset: () => recordActivity(true),
    ping: pingSession,
    logout: terminateSession,
    getRemainingSeconds: () => {
      const elapsed = Math.floor((Date.now() - getLatestActivity()) / 1000);
      return Math.max(0, TIMEOUT_SEC - elapsed);
    },
  };
})();
