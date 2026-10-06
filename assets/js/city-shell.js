(() => {
  const toggle = document.getElementById('cityMenuButton');
  const navigation = document.getElementById('cityNavigation');
  const header = document.querySelector('.city-header');
  const navShell = document.querySelector('.city-header .city-nav');

  // Toggle mobile navigation
  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    navigation?.classList.toggle('is-open', expanded);
  });

  // ESC key dismisses mobile menu
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      toggle.setAttribute('aria-expanded', 'false');
      navigation?.classList.remove('is-open');
      toggle.focus();
    }
  });

  // Click outside to dismiss mobile menu
  document.addEventListener('click', (event) => {
    if (toggle?.getAttribute('aria-expanded') === 'true') {
      if (!navigation?.contains(event.target) && !toggle.contains(event.target)) {
        toggle.setAttribute('aria-expanded', 'false');
        navigation?.classList.remove('is-open');
      }
    }
  });

  // Auto-close menu on link selection
  navigation?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 850) {
        toggle?.setAttribute('aria-expanded', 'false');
        navigation?.classList.remove('is-open');
      }
    });
  });

  // Scroll detection for enhanced glass refraction
  let scrollPending = false;
  const syncScroll = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 16);
    scrollPending = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollPending) {
      scrollPending = true;
      requestAnimationFrame(syncScroll);
    }
  }, { passive: true });
  syncScroll();

  // Dynamic Apple-grade specular pointer sheen
  navShell?.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = navShell.getBoundingClientRect();
    navShell.style.setProperty('--nav-pointer-x', `${event.clientX - rect.left}px`);
    navShell.style.setProperty('--nav-pointer-y', `${event.clientY - rect.top}px`);
    navShell.classList.add('is-pointer-lit');
  }, { passive: true });

  navShell?.addEventListener('pointerleave', () => {
    navShell.classList.remove('is-pointer-lit');
  });
})();
