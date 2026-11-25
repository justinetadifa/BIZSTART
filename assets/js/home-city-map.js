/* Start the map with the homepage and animate it while it is in view. */
(() => {
  'use strict';

  const card = document.querySelector('[data-city-map]');
  if (!card) return;

  const viewport = card.querySelector('[data-city-map-viewport]');
  const expand = card.querySelector('[data-city-map-expand]');
  const status = card.querySelector('[data-city-map-status]');
  const template = card.querySelector('[data-city-map-template]');
  const origin = window.location.origin;
  let frame;
  let loadingTimeout;
  let visible = false;
  let expanded = false;

  function sendMapState() {
    const target = frame?.contentWindow;
    if (!target) return;
    target.postMessage({ type: 'locus:city-map-expanded', expanded }, origin);
    target.postMessage({ type: 'locus:city-map-visibility', visible: !document.hidden && (visible || expanded) }, origin);
  }

  function setExpanded(next) {
    if (expanded === next || card.dataset.cityMapState !== 'ready') return;
    viewport.close();
    expanded = next;
    if (expanded) {
      viewport.removeAttribute('role');
      viewport.showModal();
      frame.focus({ preventScroll: true });
    } else {
      viewport.setAttribute('role', 'region');
      viewport.show();
      expand.focus({ preventScroll: true });
    }
    sendMapState();
  }

  function showUnavailable() {
    clearTimeout(loadingTimeout);
    setExpanded(false);
    card.dataset.cityMapState = 'unavailable';
    expand.hidden = true;
    frame.inert = true;
    status.hidden = false;
    status.textContent = 'The interactive map is unavailable in this browser.';
  }

  function mountMap() {
    frame = template.content.firstElementChild.cloneNode(true);
    frame.inert = true;
    frame.addEventListener('error', showUnavailable);
    window.addEventListener('message', event => {
      if (event.origin !== origin || event.source !== frame.contentWindow) return;
      if (event.data?.type === 'locus:city-map-ready') {
        clearTimeout(loadingTimeout);
        card.dataset.cityMapState = 'ready';
        expand.hidden = false;
        frame.inert = false;
        status.hidden = true;
        sendMapState();
      } else if (event.data?.type === 'locus:city-map-unavailable') {
        showUnavailable();
      } else if (event.data?.type === 'locus:city-map-expand') {
        setExpanded(true);
      } else if (event.data?.type === 'locus:city-map-collapse') {
        setExpanded(false);
      }
    });

    card.dataset.cityMapState = 'loading';
    loadingTimeout = setTimeout(showUnavailable, 15000);
    viewport.append(frame);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sendMapState();
    }).observe(viewport);
  } else {
    visible = true;
  }

  mountMap();
  expand.addEventListener('click', () => setExpanded(true));
  viewport.addEventListener('cancel', event => {
    event.preventDefault();
    setExpanded(false);
  });
  document.addEventListener('visibilitychange', sendMapState);
})();
