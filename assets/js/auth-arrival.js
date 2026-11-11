(() => {
  const arrival = document.querySelector('[data-auth-arrival]');
  if (!arrival) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const skip = arrival.querySelector('[data-arrival-skip]');
  let timer;
  function settle() {
    clearTimeout(timer);
    arrival.dataset.arrivalSettled = 'true';
    if (skip) {
      const focused = document.activeElement === skip;
      skip.hidden = true;
      if (focused) arrival.querySelector('.account-submit')?.focus({ preventScroll: true });
    }
  }
  if (reduced.matches) settle();
  else {
    if (skip) skip.hidden = false;
    timer = setTimeout(settle, 1900);
  }
  skip?.addEventListener('click', settle);
  reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
  addEventListener('pagehide', settle);
  addEventListener('pageshow', event => { if (event.persisted) settle(); });
})();
