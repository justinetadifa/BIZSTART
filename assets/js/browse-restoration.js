// History entries own their browsing state, so another tab or a fresh visit
// never inherits an unrelated search. The browser retains BFCache scrolling.
export function createBrowseRestoration({ scope, capture, view = window, doc = document }) {
  const key = 'locusBrowse';
  const route = `${view.location.pathname}${view.location.search}`;
  let previous;
  try {
    const state = view.history.state?.[key];
    if (state?.scope === scope && state.route === route) previous = state;
  } catch { /* Browsing remains available when history storage is restricted. */ }
  let ready = false;
  let interrupted = false;
  let resumedFromCache = false;
  const cancelRestore = () => { interrupted = true; };
  // Observe intent only; never cancel or replace native scrolling or map gestures.
  for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
    view.addEventListener(event, cancelRestore, { passive: true, capture: true });
  }
  const save = () => {
    if (!ready) return;
    try {
      view.history.replaceState({
        ...view.history.state,
        [key]: { scope, route, data: capture(), x: view.scrollX, y: view.scrollY },
      }, '');
    } catch { /* Optional persistence must not block navigation. */ }
  };
  view.addEventListener('pagehide', save);
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'hidden') save(); });
  // Capture before a details link leaves, including keyboard activation and new tabs.
  const saveBeforeDetails = event => {
    const link = event.target.closest?.('a[href]');
    if (link && /(?:^|\/)property-details\.php(?:\?|$)/.test(link.getAttribute('href') || '')) save();
  };
  doc.addEventListener('click', saveBeforeDetails, { capture: true });
  doc.addEventListener('auxclick', saveBeforeDetails, { capture: true });
  view.addEventListener('pageshow', event => { resumedFromCache = event.persisted; });

  return {
    get data() { return previous?.data; },
    ready(restoreLocalScroll) {
      ready = true;
      if (!previous || interrupted || resumedFromCache) return;
      // Results are asynchronous. Restore after their final layout, without
      // animating a return trip or changing history.scrollRestoration globally.
      view.requestAnimationFrame(() => view.requestAnimationFrame(() => {
        if (interrupted || resumedFromCache) return;
        restoreLocalScroll?.();
        view.scrollTo({ left: Number.isFinite(previous.x) ? previous.x : 0,
          top: Number.isFinite(previous.y) ? previous.y : 0, behavior: 'instant' });
      }));
    },
    save,
  };
}
