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
      const expanded = card.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', String(expanded));
      details.setAttribute('aria-hidden', String(!expanded));
      details.inert = !expanded;
      if (expanded && !visited.has(index)) {
        visited.add(index);
        try { sessionStorage.setItem(storageKey, JSON.stringify([...visited])); } catch { /* Optional persistence. */ }
        renderProgress();
      }
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
