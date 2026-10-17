/**
 * LOCUS-SF Action HUD — Interactive Feedback & Celebration Controller
 * Delivers consumer-grade tactile feedback when submitting or approving properties.
 */
(function () {
  'use strict';

  if (window.LocusHUD) return;

  let hudOverlay = null;

  function ensureHUD() {
    if (hudOverlay && document.body.contains(hudOverlay)) return hudOverlay;
    hudOverlay = document.createElement('div');
    hudOverlay.id = 'locusActionHUD';
    hudOverlay.className = 'locus-action-hud locus-hud-hidden';
    hudOverlay.setAttribute('role', 'status');
    hudOverlay.setAttribute('aria-live', 'polite');
    hudOverlay.innerHTML = `
      <div class="locus-hud-backdrop"></div>
      <div class="locus-hud-card" id="locusHudCard">
        <div class="locus-hud-visual">
          <div class="locus-hud-spinner" id="locusHudSpinner">
            <svg class="locus-hud-spin-svg" viewBox="0 0 52 52">
              <circle class="locus-hud-spin-track" cx="26" cy="26" r="22" fill="none" stroke-width="4.5" />
              <circle class="locus-hud-spin-head" cx="26" cy="26" r="22" fill="none" stroke-width="4.5" stroke-dasharray="100" stroke-dashoffset="30" stroke-linecap="round" />
            </svg>
          </div>
          <div class="locus-hud-badge is-approved" id="locusHudBadgeApproved" hidden>
            <div class="locus-hud-glow"></div>
            <svg class="locus-hud-check-svg" viewBox="0 0 52 52">
              <circle class="locus-hud-circle" cx="26" cy="26" r="25" fill="#10B981" />
              <path class="locus-hud-check" fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" d="M14 26.5l8.5 8.5 16-16" />
            </svg>
          </div>
        </div>
        <div class="locus-hud-text">
          <h3 class="locus-hud-title" id="locusHudTitle">Submitting property...</h3>
          <p class="locus-hud-sub" id="locusHudSub">Auditing parcel geometry &amp; evaluating MCE baseline...</p>
        </div>
        <div class="locus-hud-progress-pill" id="locusHudProgressPill">
          <span class="locus-hud-dot"></span>
          <span class="locus-hud-step-text" id="locusHudStepText">Processing request</span>
        </div>
      </div>
    `;
    document.body.appendChild(hudOverlay);
    return hudOverlay;
  }

  window.LocusHUD = {
    show({ title = 'Submitting property...', subtitle = 'Processing request...', step = 'Processing request', mode = 'loading' } = {}) {
      const hud = ensureHUD();
      const card = hud.querySelector('#locusHudCard');
      const spinner = hud.querySelector('#locusHudSpinner');
      const approvedBadge = hud.querySelector('#locusHudBadgeApproved');
      const titleEl = hud.querySelector('#locusHudTitle');
      const subEl = hud.querySelector('#locusHudSub');
      const stepEl = hud.querySelector('#locusHudStepText');

      if (titleEl) titleEl.textContent = title;
      if (subEl) subEl.textContent = subtitle;
      if (stepEl) stepEl.textContent = step;

      if (mode === 'loading') {
        if (spinner) spinner.hidden = false;
        if (approvedBadge) approvedBadge.hidden = true;
        if (card) card.classList.remove('is-celebrating');
      } else if (mode === 'approved' || mode === 'success') {
        if (spinner) spinner.hidden = true;
        if (approvedBadge) approvedBadge.hidden = false;
        if (card) card.classList.add('is-celebrating');
      }

      hud.classList.remove('locus-hud-hidden');
      requestAnimationFrame(() => {
        hud.classList.add('is-visible');
      });
    },

    setApproved({ title = 'Property Approved!', subtitle = 'Listing published to priority board with municipal certification.' } = {}) {
      const hud = ensureHUD();
      const card = hud.querySelector('#locusHudCard');
      const spinner = hud.querySelector('#locusHudSpinner');
      const approvedBadge = hud.querySelector('#locusHudBadgeApproved');
      const titleEl = hud.querySelector('#locusHudTitle');
      const subEl = hud.querySelector('#locusHudSub');
      const stepEl = hud.querySelector('#locusHudStepText');

      if (spinner) spinner.hidden = true;
      if (approvedBadge) approvedBadge.hidden = false;
      if (card) card.classList.add('is-celebrating');
      if (titleEl) titleEl.textContent = title;
      if (subEl) subEl.textContent = subtitle;
      if (stepEl) stepEl.textContent = 'Listing certified & published';
    },

    setSubmitted({ title = 'Property Submitted!', subtitle = 'Listing sent for municipal review. Track in My Listings.' } = {}) {
      const hud = ensureHUD();
      const card = hud.querySelector('#locusHudCard');
      const spinner = hud.querySelector('#locusHudSpinner');
      const approvedBadge = hud.querySelector('#locusHudBadgeApproved');
      const titleEl = hud.querySelector('#locusHudTitle');
      const subEl = hud.querySelector('#locusHudSub');
      const stepEl = hud.querySelector('#locusHudStepText');

      if (spinner) spinner.hidden = true;
      if (approvedBadge) approvedBadge.hidden = false;
      if (card) card.classList.add('is-celebrating');
      if (titleEl) titleEl.textContent = title;
      if (subEl) subEl.textContent = subtitle;
      if (stepEl) stepEl.textContent = 'Submission recorded';
    },

    hide(delay = 0) {
      if (!hudOverlay) return Promise.resolve();
      return new Promise((resolve) => {
        setTimeout(() => {
          hudOverlay.classList.remove('is-visible');
          setTimeout(() => {
            hudOverlay.classList.add('locus-hud-hidden');
            resolve();
          }, 240);
        }, delay);
      });
    }
  };
})();
