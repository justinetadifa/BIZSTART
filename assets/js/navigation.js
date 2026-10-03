(() => {
  const header = document.querySelector('.site-header');
  const nav = header?.querySelector('.top-nav');
  const toggle = header?.querySelector('.nav-mobile-toggle');
  const content = header?.querySelector('.nav-content');
  if (!header || !nav || !toggle || !content) return;

  const mobile = window.matchMedia('(max-width: 900px)');
  const toggleLabel = toggle.querySelector('.nav-toggle-label');
  const backdrop = document.createElement('div');
  backdrop.className = 'nav-mobile-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.hidden = true;
  document.body.append(backdrop);

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
  };
  const resetHighlight = () => highlight(nav.contains(document.activeElement) ? document.activeElement.closest('.nav-link') : activeLink());
  const setOpen = (requestedOpen) => {
    const open = mobile.matches && requestedOpen;
    header.classList.toggle('is-mobile-open', open);
    document.body.classList.toggle('has-mobile-nav-open', open);
    backdrop.hidden = !open;
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
    if (event.key === 'ArrowDown' && trigger) {
      event.preventDefault();
      if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
      requestAnimationFrame(() => trigger.closest('.portal-menu').querySelector('.portal-entry')?.focus());
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
    const syncPanel = () => { panel.inert = !menu.classList.contains('is-open'); };
    new MutationObserver(syncPanel).observe(menu, { attributes: true, attributeFilter: ['class'] });
    syncPanel();
  });
  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('pointerenter', (event) => { if (event.pointerType !== 'touch') highlight(link); });
    link.addEventListener('focus', () => highlight(link));
  });
  nav.addEventListener('pointerleave', resetHighlight);
  nav.addEventListener('focusout', () => requestAnimationFrame(resetHighlight));
  mobile.addEventListener('change', () => {
    const focused = document.activeElement;
    const focusInsideMenu = nav.contains(focused) || header.querySelector('.nav-actions').contains(focused);
    const focusOnToggle = focused === toggle;
    setOpen(false);
    if (mobile.matches && focusInsideMenu) toggle.focus({ preventScroll: true });
    else if (!mobile.matches && focusOnToggle) (activeLink() || nav.querySelector('.nav-link'))?.focus({ preventScroll: true });
  });
  if ('ResizeObserver' in window) new ResizeObserver(resetHighlight).observe(nav);
  document.fonts?.ready.then(resetHighlight);
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
