(() => {
  const header = document.querySelector('.site-header');
  const nav = header?.querySelector('.top-nav');
  const toggle = header?.querySelector('.nav-mobile-toggle');
  const content = header?.querySelector('.nav-content');
  if (!header || !nav || !toggle || !content) return;

  const mobile = window.matchMedia('(max-width: 900px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const shell = header.querySelector('.nav-shell');
  const toggleLabel = toggle.querySelector('.nav-toggle-label');
  const backdrop = document.createElement('div');
  backdrop.className = 'nav-mobile-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.hidden = true;
  document.body.append(backdrop);
  let hoveredLink = null;
  let highlightInitialized = false;
  let backdropAnimation = null;
  const menuAnimations = new Set();

  const activeLink = () => nav.querySelector('[aria-current="page"]');
  const highlight = (link) => {
    if (mobile.matches || !link || !link.getClientRects().length) {
      nav.classList.remove('has-nav-highlight');
      return;
    }
    nav.style.setProperty('--nav-x', `${link.offsetLeft}px`);
    nav.style.setProperty('--nav-y', `${link.offsetTop}px`);
    nav.style.setProperty('--nav-width', `${link.offsetWidth}px`);
    nav.style.setProperty('--nav-height', `${link.offsetHeight}px`);
    nav.classList.add('has-nav-highlight');
    if (!highlightInitialized) {
      highlightInitialized = true;
      // Place the first selection before enabling its travel animation.
      requestAnimationFrame(() => nav.classList.add('is-highlight-ready'));
    }
  };
  const resetHighlight = () => highlight(hoveredLink || (nav.contains(document.activeElement) ? document.activeElement.closest('.nav-link') : activeLink()));
  const fadeBackdrop = (open) => {
    const opacity = backdrop.hidden ? 0 : Number(getComputedStyle(backdrop).opacity);
    backdropAnimation?.cancel();
    backdropAnimation = null;
    backdrop.style.pointerEvents = open ? '' : 'none';
    if (reducedMotion.matches || !backdrop.animate) {
      backdrop.hidden = !open;
      return;
    }
    if (!open && backdrop.hidden) return;
    backdrop.hidden = false;
    const animation = backdrop.animate([{ opacity }, { opacity: open ? 1 : 0 }], {
      duration: open ? 220 : 160, easing: 'ease-out', fill: 'both',
    });
    backdropAnimation = animation;
    animation.finished.then(() => {
      if (backdropAnimation !== animation) return;
      backdrop.hidden = !open;
      animation.cancel();
      backdropAnimation = null;
    }).catch(() => {});
  };
  const setOpen = (requestedOpen) => {
    const open = mobile.matches && requestedOpen;
    const changed = header.classList.contains('is-mobile-open') !== open;
    header.classList.toggle('is-mobile-open', open);
    document.body.classList.toggle('has-mobile-nav-open', open);
    if (changed) fadeBackdrop(open);
    else if (!backdropAnimation) backdrop.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    if (toggleLabel) toggleLabel.textContent = open ? 'Close' : 'Menu';
    content.inert = mobile.matches && !open;
    if (mobile.matches && !open) content.setAttribute('aria-hidden', 'true');
    else content.removeAttribute('aria-hidden');
    if (!open) header.querySelectorAll('.portal-menu.is-open').forEach(menu => {
      menu.classList.remove('is-open');
      menu.querySelector('[data-sfc-menu-toggle]')?.setAttribute('aria-expanded', 'false');
    });
    requestAnimationFrame(resetHighlight);
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  backdrop.addEventListener('click', () => {
    setOpen(false);
    toggle.focus({ preventScroll: true });
  });
  header.addEventListener('click', (event) => {
    // Close the navigation before opening another page or an account drawer.
    if (mobile.matches && event.target.closest('a[href], [data-city-brief-trigger], [data-notification-trigger], .header-logout-trigger')) setOpen(false);
  });
  header.addEventListener('keydown', (event) => {
    const trigger = event.target.closest('[data-sfc-menu-toggle]');
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && trigger) {
      event.preventDefault();
      if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
      requestAnimationFrame(() => {
        const menu = trigger.closest('.portal-menu');
        const panel = menu.querySelector('.portal-menu-panel');
        const entries = panel.querySelectorAll('.portal-entry');
        const target = event.key === 'ArrowUp' ? entries[entries.length - 1] : entries[0];
        target?.focus();
        // Reveal keyboard focus again after a small-screen panel finishes unfolding.
        Promise.allSettled(panel.getAnimations().map(animation => animation.finished)).then(() => {
          if (document.activeElement === target && menu.classList.contains('is-open')) {
            target?.scrollIntoView({ block: 'nearest' });
          }
        });
      });
      return;
    }
    const entry = event.target.closest('.portal-entry');
    if (entry && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const entries = [...entry.closest('.portal-menu-panel').querySelectorAll('.portal-entry')];
      const index = entries.indexOf(entry);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? entries.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length;
      entries[next]?.focus();
      return;
    }
    const openMenuTrigger = header.querySelector('.portal-menu.is-open [data-sfc-menu-toggle]');
    if (event.key === 'Escape' && openMenuTrigger) {
      event.preventDefault();
      openMenuTrigger.click();
      openMenuTrigger.focus({ preventScroll: true });
      return;
    }
    if (event.key === 'Escape' && mobile.matches && header.classList.contains('is-mobile-open')) {
      event.preventDefault();
      setOpen(false);
      toggle.focus({ preventScroll: true });
      return;
    }
    if (event.key === 'Tab' && mobile.matches && header.classList.contains('is-mobile-open')) {
      const controls = [...header.querySelectorAll('a[href], button:not(:disabled)')]
        .filter(control => !control.closest('[inert]') && control.getClientRects().length && getComputedStyle(control).visibility !== 'hidden');
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    }
  });
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });
  header.addEventListener('focusout', () => requestAnimationFrame(() => {
    if (!header.contains(document.activeElement)) setOpen(false);
  }));

  // Closed submenus stay out of the tab sequence, including on desktop.
  header.querySelectorAll('.portal-menu').forEach(menu => {
    const panel = menu.querySelector('.portal-menu-panel');
    if (!panel) return;
    panel.querySelectorAll('.portal-entry').forEach((entry, index) => entry.style.setProperty('--nav-entry-index', index));
    let wasOpen = menu.classList.contains('is-open');
    let panelAnimation = null;
    const cancelAnimation = () => {
      panelAnimation?.cancel();
      panelAnimation = null;
      menu.classList.remove('is-menu-closing');
    };
    menuAnimations.add(cancelAnimation);
    const syncPanel = () => {
      const open = menu.classList.contains('is-open');
      panel.inert = !open;
      if (open === wasOpen) return;
      wasOpen = open;
      if (!mobile.matches || !header.classList.contains('is-mobile-open') || reducedMotion.matches || !panel.animate) {
        cancelAnimation();
        return;
      }
      // Keep a closing panel measurable until its height animation finishes.
      menu.classList.toggle('is-menu-closing', !open);
      const interruptedHeight = panelAnimation ? panel.getBoundingClientRect().height : null;
      panelAnimation?.cancel();
      const naturalHeight = panel.getBoundingClientRect().height;
      const animation = panel.animate([
        { height: `${interruptedHeight ?? (open ? 0 : naturalHeight)}px`, opacity: open ? 0 : 1, overflow: 'hidden' },
        { height: `${open ? naturalHeight : 0}px`, opacity: open ? 1 : 0, overflow: 'hidden' },
      ], { duration: open ? 300 : 200, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
      panelAnimation = animation;
      animation.finished.then(() => {
        if (panelAnimation !== animation) return;
        panelAnimation = null;
        animation.cancel();
        menu.classList.remove('is-menu-closing');
      }).catch(() => {});
    };
    new MutationObserver(syncPanel).observe(menu, { attributes: true, attributeFilter: ['class'] });
    syncPanel();
  });
  nav.querySelectorAll('.nav-link').forEach((link, index) => {
    link.style.setProperty('--nav-entry-index', index);
    link.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch') { hoveredLink = link; highlight(link); }
    });
    link.addEventListener('focus', () => { hoveredLink = null; highlight(link); });
  });
  nav.addEventListener('pointerleave', () => { hoveredLink = null; resetHighlight(); });
  nav.addEventListener('focusout', () => requestAnimationFrame(resetHighlight));
  mobile.addEventListener('change', () => {
    hoveredLink = null;
    menuAnimations.forEach(cancel => cancel());
    backdropAnimation?.cancel();
    backdropAnimation = null;
    const focused = document.activeElement;
    const focusInsideMenu = nav.contains(focused) || header.querySelector('.nav-actions').contains(focused);
    const focusOnToggle = focused === toggle;
    setOpen(false);
    if (mobile.matches && focusInsideMenu) toggle.focus({ preventScroll: true });
    else if (!mobile.matches && focusOnToggle) (activeLink() || nav.querySelector('.nav-link'))?.focus({ preventScroll: true });
  });
  if ('ResizeObserver' in window) new ResizeObserver(resetHighlight).observe(nav);
  document.fonts?.ready.then(resetHighlight);
  // A soft reflection follows a mouse or pen without moving the frame itself.
  let pointerFrame = 0;
  let pointerPosition = null;
  shell?.addEventListener('pointermove', (event) => {
    if (mobile.matches || reducedMotion.matches || event.pointerType === 'touch') return;
    pointerPosition = { x: event.clientX, y: event.clientY };
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      if (!pointerPosition) return;
      const bounds = shell.getBoundingClientRect();
      shell.style.setProperty('--nav-pointer-x', `${pointerPosition.x - bounds.left}px`);
      shell.style.setProperty('--nav-pointer-y', `${pointerPosition.y - bounds.top}px`);
      shell.classList.add('is-pointer-lit');
    });
  }, { passive: true });
  shell?.addEventListener('pointerleave', () => {
    pointerPosition = null;
    shell.classList.remove('is-pointer-lit');
  });
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    menuAnimations.forEach(cancel => cancel());
    backdropAnimation?.cancel();
    backdropAnimation = null;
    backdrop.hidden = !header.classList.contains('is-mobile-open');
    shell?.classList.remove('is-pointer-lit');
  });
  let scrollPending = false;
  const syncScroll = () => { header.classList.toggle('is-scrolled', window.scrollY > 24); scrollPending = false; };
  window.addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(syncScroll); }
  }, { passive: true });

  // A restored page must never retain an open menu or a locked scroll position.
  window.addEventListener('pageshow', (event) => { if (event.persisted) setOpen(false); });
  header.classList.add('has-mobile-menu');
  setOpen(false);
  syncScroll();
  resetHighlight();
})();
