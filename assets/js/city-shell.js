(() => {
  const toggle = document.getElementById('cityMenuButton');
  const navigation = document.getElementById('cityNavigation');
  const header = document.querySelector('.city-header');
  const nav = navigation?.querySelector('nav');
  if (!toggle || !navigation || !header || !nav) return;

  const shell = header.querySelector('.city-nav');
  const darkHeroes = [...document.querySelectorAll('.city-hero, .admin-hero-card')];
  const mobile = window.matchMedia('(max-width: 850px)');
  let menuOpen = false;
  let pageScroll = null;
  const syncMenuHeight = () => {
    const viewport = window.visualViewport;
    const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    const available = Math.max(100, Math.floor(bottom - shell.getBoundingClientRect().bottom - 20));
    header.style.setProperty('--city-mobile-menu-max-height', `${available}px`);
  };
  const setMenuOpen = (requestedOpen) => {
    const open = mobile.matches && requestedOpen;
    const changed = menuOpen !== open;
    menuOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    navigation.classList.toggle('is-open', open);
    navigation.inert = mobile.matches && !open;
    if (mobile.matches) navigation.setAttribute('aria-hidden', String(!open));
    else navigation.removeAttribute('aria-hidden');
    document.body.classList.toggle('city-mobile-nav-open', open);
    if (open && !pageScroll) {
      pageScroll = {
        x: window.scrollX, y: window.scrollY,
        htmlOverflow: document.documentElement.style.overflow,
        bodyOverflow: document.body.style.overflow,
      };
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      syncMenuHeight();
    } else if (!open && pageScroll) {
      const previous = pageScroll;
      pageScroll = null;
      document.documentElement.style.overflow = previous.htmlOverflow;
      document.body.style.overflow = previous.bodyOverflow;
      window.scrollTo({ left: previous.x, top: previous.y, behavior: 'instant' });
    }
    if (changed) window.dispatchEvent(new CustomEvent('sfc:navigation-change', { detail: { open } }));
  };

  toggle.addEventListener('click', () => {
    setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      event.preventDefault();
      setMenuOpen(false);
      toggle.focus({ preventScroll: true });
    }
    if (event.key === 'Tab' && menuOpen) {
      const controls = [toggle, ...navigation.querySelectorAll('a[href],button:not([disabled]),[tabindex="0"]')].filter(element => element.getClientRects().length);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !header.contains(document.activeElement))) {
        event.preventDefault(); last?.focus({ preventScroll: true });
      } else if (!event.shiftKey && (document.activeElement === last || !header.contains(document.activeElement))) {
        event.preventDefault(); first?.focus({ preventScroll: true });
      }
    }
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setMenuOpen(false);
  });

  navigation.addEventListener('click', (event) => {
    if (mobile.matches && event.target.closest('a[href], #cityUpdatesButton')) setMenuOpen(false);
  });

  header.addEventListener('focusout', () => requestAnimationFrame(() => {
    if (!header.contains(document.activeElement)) setMenuOpen(false);
  }));

  // Keep clear glass readable as it crosses the dark hero; geometry stays still.
  let scrollPending = false;
  const syncScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 16);
    const bounds = shell.getBoundingClientRect();
    const centerY = bounds.top + bounds.height / 2;
    header.classList.toggle('is-over-media', darkHeroes.some(hero => {
      const heroBounds = hero.getBoundingClientRect();
      return heroBounds.top <= centerY && heroBounds.bottom >= centerY;
    }));
    scrollPending = false;
  };
  const scheduleScroll = () => {
    if (!scrollPending) {
      scrollPending = true;
      requestAnimationFrame(syncScroll);
    }
  };
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  window.addEventListener('resize', syncMenuHeight, { passive: true });
  window.visualViewport?.addEventListener('resize', syncMenuHeight, { passive: true });
  window.visualViewport?.addEventListener('scroll', syncMenuHeight, { passive: true });

  let hoveredLink = null;
  const links = [...nav.querySelectorAll('a')];
  const activeLink = () => nav.querySelector('[aria-current="page"], .is-active');
  const selectLink = (link) => {
    if (mobile.matches || !link) {
      nav.classList.remove('has-glass-selection');
      return;
    }
    nav.style.setProperty('--city-nav-x', `${link.offsetLeft}px`);
    nav.style.setProperty('--city-nav-y', `${link.offsetTop}px`);
    nav.style.setProperty('--city-nav-width', `${link.offsetWidth}px`);
    nav.style.setProperty('--city-nav-height', `${link.offsetHeight}px`);
    nav.classList.add('has-glass-selection');
    // Place the first selection before enabling travel between controls.
    requestAnimationFrame(() => nav.classList.add('is-selection-ready'));
  };
  const resetSelection = () => selectLink(
    hoveredLink || (nav.contains(document.activeElement) ? document.activeElement.closest('a') : activeLink())
  );

  links.forEach(link => {
    link.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      hoveredLink = link;
      selectLink(link);
    });
    link.addEventListener('focus', () => { hoveredLink = null; selectLink(link); });
  });
  nav.addEventListener('pointerleave', () => { hoveredLink = null; resetSelection(); });
  nav.addEventListener('focusout', () => requestAnimationFrame(resetSelection));

  mobile.addEventListener('change', () => {
    const focused = document.activeElement;
    hoveredLink = null;
    setMenuOpen(false);
    if (mobile.matches && navigation.contains(focused)) toggle.focus({ preventScroll: true });
    else if (!mobile.matches && focused === toggle) (activeLink() || links[0])?.focus({ preventScroll: true });
    resetSelection();
  });
  if ('ResizeObserver' in window) new ResizeObserver(resetSelection).observe(nav);
  document.fonts?.ready.then(resetSelection);
  window.addEventListener('pageshow', () => { setMenuOpen(false); syncScroll(); resetSelection(); });
  setMenuOpen(false);
  syncScroll();
  resetSelection();
})();
