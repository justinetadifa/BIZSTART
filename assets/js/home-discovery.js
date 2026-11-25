/** The homepage guide records topics opened, never investment eligibility. */
export function setupHomeDiscovery() {
  const section = document.getElementById('why-invest');
  if (!section || section.dataset.discoveryReady) return;
  section.dataset.discoveryReady = 'true';
  const cards = [...section.querySelectorAll('.city-why-card')];
  const trail = section.querySelector('[data-discovery-trail]');
  const status = section.querySelector('[data-discovery-status]');
  const next = section.querySelector('[data-discovery-continue]');
  const steps = [...section.querySelectorAll('[data-discovery-step]')];
  const storageKey = 'locus.city-discovery.v1';
  const visited = new Set();
  const reduceMotion = () => document.documentElement.dataset.homeMotion !== 'on'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) saved.forEach(id => {
      if (Number.isInteger(id) && id >= 0 && id < cards.length) visited.add(id);
    });
  } catch { /* Discovery still works when browser storage is unavailable. */ }

  function renderProgress() {
    const complete = visited.size === cards.length;
    status.textContent = complete ? `All ${cards.length} topics explored. You're ready for a closer look.` : `${visited.size} of ${cards.length} topics explored`;
    trail.classList.toggle('is-complete', complete);
    next.hidden = complete;
    next.firstChild.textContent = visited.size ? 'Continue exploring ' : 'Start exploring ';
    cards.forEach((card, index) => {
      card.classList.toggle('is-explored', visited.has(index));
      steps[index]?.classList.toggle('is-explored', visited.has(index));
    });
  }

  function setExpanded(targetCard, expanded) {
    const targetBtn = targetCard.querySelector('[data-why-toggle]');
    const targetDetails = targetCard.querySelector('.city-why-details');
    if (!targetBtn || !targetDetails) return;
    targetCard.classList.toggle('is-expanded', expanded);
    targetBtn.setAttribute('aria-expanded', String(expanded));
    targetDetails.setAttribute('aria-hidden', String(!expanded));
    targetDetails.inert = !expanded;
  }

  cards.forEach((card, index) => {
    const button = card.querySelector('[data-why-toggle]');
    const details = card.querySelector('.city-why-details');
    if (!button || !details) return;
    const top = document.createElement('div');
    top.className = 'discovery-card-top';
    const number = document.createElement('span');
    number.className = 'discovery-card-number';
    number.textContent = String(index + 1).padStart(2, '0');
    number.setAttribute('aria-hidden', 'true');
    top.append(number);
    const category = card.querySelector('.city-why-tag');
    if (category) top.append(category);
    card.prepend(top);
    details.id ||= `city-discovery-topic-${index + 1}`;
    button.setAttribute('aria-controls', details.id);
    details.inert = !card.classList.contains('is-expanded');
    button.addEventListener('click', () => {
      const willExpand = !card.classList.contains('is-expanded');
      let closedAbove = false;
      if (willExpand) {
        cards.forEach((other, otherIndex) => {
          if (other !== card && other.classList.contains('is-expanded')) {
            if (otherIndex < index) closedAbove = true;
            setExpanded(other, false);
          }
        });
      }
      setExpanded(card, willExpand);
      if (willExpand && !visited.has(index)) {
        visited.add(index);
        try { sessionStorage.setItem(storageKey, JSON.stringify([...visited])); } catch { /* Optional persistence. */ }
        renderProgress();
      }
      if (willExpand && closedAbove) {
        requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          if (rect.top < 88 || rect.top > window.innerHeight * 0.72) {
            card.scrollIntoView({ behavior: reduceMotion() ? 'instant' : 'smooth', block: 'start' });
          }
        });
      }
    });
    card.addEventListener('click', event => {
      if (window.getSelection?.().toString()) return;
      if (event.target.closest('button, a, select, input, label, .city-why-details')) return;
      button.click();
    });
  });
  renderProgress();
  trail.hidden = false;
  next.addEventListener('click', () => {
    const card = cards.find((_, index) => !visited.has(index));
    const button = card?.querySelector('[data-why-toggle]');
    if (!button) return;
    button.click();
    card.scrollIntoView({ behavior: reduceMotion() ? 'instant' : 'smooth', block: 'start' });
    button.focus({ preventScroll: true });
  });

}
