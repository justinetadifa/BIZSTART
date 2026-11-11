/* Homepage wayfinding and image depth follow native document scrolling. */
(() => {
  'use strict';
  if (document.body.dataset.page !== 'city-landing') return;
  const hero = document.getElementById('locus-react-hero');
  const main = document.getElementById('main-content');
  if (!hero || !main) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionForced = document.documentElement.dataset.homeMotion === 'on';
  const sections = [
    ['locus-react-hero', 'Start'], ['at-a-glance', 'The city'],
    ['incentive-recipients', 'Businesses'], ['why-invest', 'Why invest'],
    ['properties', 'Properties'], ['investment-concierge', 'Assistance'], ['about', 'About'],
  ].map(([id, label]) => ({ node: document.getElementById(id), id, label })).filter(item => item.node);
  const progress = document.createElement('div');
  progress.className = 'home-reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  const journey = document.createElement('nav');
  journey.className = 'home-journey';
  journey.setAttribute('aria-label', 'Explore the homepage');
  journey.hidden = true;
  const current = document.createElement('span');
  current.className = 'home-journey-current';
  const count = document.createElement('span');
  count.className = 'home-journey-count';
  const label = document.createElement('span');
  current.append(count, label);
  const sectionProgress = document.createElement('span');
  sectionProgress.className = 'home-journey-section-progress';
  sectionProgress.setAttribute('aria-hidden', 'true');
  current.append(sectionProgress);
  const steps = document.createElement('div');
  steps.className = 'home-journey-steps';
  const links = sections.map(item => {
    const link = document.createElement('a');
    link.href = `${location.pathname}${location.search}#${item.id}`;
    link.setAttribute('aria-label', item.label);
    const tooltip = document.createElement('span');
    tooltip.className = 'home-journey-tooltip';
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.textContent = item.label;
    link.append(tooltip);
    steps.append(link);
    return link;
  });
  const previous = document.createElement('a');
  previous.className = 'home-journey-prev';
  previous.dataset.locusPress = 'press';
  previous.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 7-5 5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const next = document.createElement('a');
  next.className = 'home-journey-next';
  next.dataset.locusPress = 'press';
  next.innerHTML = '<span data-journey-next-label>Next section</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 7h10v10M6 18 17 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  journey.append(previous, current, steps, next);
  document.body.append(progress, journey);
  let frame = 0;
  let currentIndex = -1;
  let suspended = document.hidden;
  const photoWell = document.querySelector('.glance-photo-well');
  const photo = document.querySelector('.glance-city-photo');
  const footer = document.querySelector('.city-footer');
  let lastProgress = -1;
  const anchor = item => `${location.pathname}${location.search}#${item.id}`;

  function update() {
    frame = 0;
    if (suspended) return;
    const height = innerHeight;
    const scroll = scrollY;
    const maximum = Math.max(1, document.documentElement.scrollHeight - height);
    progress.style.setProperty('--home-reading-progress', String(Math.max(0, Math.min(1, scroll / maximum))));
    const heroBounds = hero.getBoundingClientRect();
    const positions = sections.map(item => item.node.getBoundingClientRect().top);
    let index = 0;
    positions.forEach((top, i) => { if (top <= height * .35) index = i; });
    if (scroll >= maximum - 8) index = sections.length - 1;
    if (index !== currentIndex) {
      currentIndex = index;
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(sections.length).padStart(2, '0')}`;
      label.textContent = sections[index].label;
      links.forEach((link, i) => {
        if (i === index) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
        link.classList.toggle('is-complete', i < index);
      });
      const destination = sections[(index + 1) % sections.length];
      next.href = anchor(destination);
      next.setAttribute('aria-label', index === sections.length - 1 ? 'Back to the top' : `Next: ${destination.label}`);
      next.querySelector('[data-journey-next-label]').textContent = index === sections.length - 1 ? 'Back to top' : 'Next';
      const before = sections[Math.max(0, index - 1)];
      previous.href = anchor(before);
      previous.setAttribute('aria-label', index === 0 ? 'Back to the top' : `Previous: ${before.label}`);
    }
    const start = positions[index] + scroll;
    const end = index + 1 < sections.length ? positions[index + 1] + scroll : maximum + height * .35;
    const sectionFraction = Math.max(0, Math.min(1, (scroll + height * .35 - start) / Math.max(1, end - start)));
    const roundedProgress = Math.round(sectionFraction * 1000) / 1000;
    if (roundedProgress !== lastProgress) {
      current.style.setProperty('--home-section-progress', String(roundedProgress));
      lastProgress = roundedProgress;
    }
    const modalOpen = Boolean(document.querySelector('dialog[open], .city-mobile-nav-open'));
    const show = heroBounds.bottom < height * .6 && !modalOpen
      && (!footer || footer.getBoundingClientRect().top >= height);
    // A keyboard user can finish navigating this control even near the footer.
    journey.hidden = !(show || (!modalOpen && journey.contains(document.activeElement)));
    document.body.classList.toggle('has-home-journey', !journey.hidden);
    if (reduced.matches && !motionForced) {
      hero.style.removeProperty('--home-hero-depth');
      photo?.style.removeProperty('--home-photo-depth');
      return;
    }
    if (heroBounds.bottom > 0 && heroBounds.top < height) {
      hero.style.setProperty('--home-hero-depth', `${Math.min(45, Math.max(0, -heroBounds.top * .09)).toFixed(2)}px`);
    }
    if (photoWell && photo) {
      const bounds = photoWell.getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < height) {
        const distance = Math.min(1, Math.max(-1, (height / 2 - bounds.top - bounds.height / 2) / height));
        photo.style.setProperty('--home-photo-depth', `${(distance * 18).toFixed(2)}px`);
      }
    }
  }
  const schedule = () => { if (!frame && !suspended) frame = requestAnimationFrame(update); };

  // Fine-pointer light follows intent, with one bounded update per frame.
  // Touch and keyboard keep their native input and receive CSS feedback.
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const cardSelector = '.city-why-card, #properties .city-property-card, .city-concierge-card';
  const prepared = new WeakSet();
  let hoveredCard = null;
  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  const motionAllowed = () => motionForced || !reduced.matches;
  function prepareCards(scope) {
    const cards = [...(scope.querySelectorAll?.(cardSelector) || [])];
    if (scope instanceof HTMLElement && scope.matches(cardSelector)) cards.unshift(scope);
    for (const card of cards) {
      if (prepared.has(card)) continue;
      prepared.add(card);
      card.dataset.homeCard = '';
      const glow = document.createElement('span');
      glow.className = 'home-card-glow';
      glow.setAttribute('aria-hidden', 'true');
      card.append(glow);
    }
  }
  function clearHover() {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    if (!hoveredCard) return;
    hoveredCard.classList.remove('is-home-hover');
    hoveredCard.style.removeProperty('--home-glow-x');
    hoveredCard.style.removeProperty('--home-glow-y');
    hoveredCard = null;
  }
  function renderPointer() {
    pointerFrame = 0;
    if (!hoveredCard?.isConnected || suspended || !motionAllowed()) { clearHover(); return; }
    const bounds = hoveredCard.getBoundingClientRect();
    hoveredCard.style.setProperty('--home-glow-x', `${Math.max(0, Math.min(bounds.width, pointerX - bounds.left)).toFixed(1)}px`);
    hoveredCard.style.setProperty('--home-glow-y', `${Math.max(0, Math.min(bounds.height, pointerY - bounds.top)).toFixed(1)}px`);
  }
  main.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || !motionAllowed() || suspended) return;
    const card = event.target.closest?.('[data-home-card]');
    if (!card) { clearHover(); return; }
    if (card !== hoveredCard) {
      clearHover();
      hoveredCard = card;
      card.classList.add('is-home-hover');
    }
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(renderPointer);
  }, { passive: true });
  main.addEventListener('pointerout', event => {
    if (hoveredCard && !hoveredCard.contains(event.relatedTarget)) clearHover();
  }, { passive: true });
  main.addEventListener('pointercancel', clearHover, { passive: true });
  addEventListener('scroll', clearHover, { passive: true });
  finePointer.addEventListener('change', clearHover);
  reduced.addEventListener('change', clearHover);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearHover(); });
  addEventListener('pagehide', clearHover);
  const cardsObserver = new MutationObserver(changes => {
    for (const change of changes) for (const node of change.addedNodes) {
      if (node instanceof HTMLElement) prepareCards(node);
    }
    if (hoveredCard && !hoveredCard.isConnected) clearHover();
  });
  prepareCards(main);
  cardsObserver.observe(main, { childList: true, subtree: true });

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('sfc:navigation-change', schedule);
  addEventListener('pageshow', () => { suspended = false; schedule(); });
  addEventListener('pagehide', () => { suspended = true; cancelAnimationFrame(frame); frame = 0; });
  document.addEventListener('visibilitychange', () => { suspended = document.hidden; schedule(); });
  document.addEventListener('toggle', schedule, true);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(main);
  journey.addEventListener('focusout', () => requestAnimationFrame(schedule));
  reduced.addEventListener('change', schedule);
  document.documentElement.dataset.homeExperience = 'ready';
  schedule();
})();
