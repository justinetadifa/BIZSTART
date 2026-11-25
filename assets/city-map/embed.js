const cityMapEmbed = (() => {
  const enabled = document.documentElement.hasAttribute('data-embedded') || new URLSearchParams(location.search).get('embed') === '1';
  const origin = window.origin;
  const hasParent = enabled && window.parent !== window && origin !== 'null';
  let reported = false;

  function send(type) {
    if (hasParent) window.parent.postMessage({ type }, origin);
  }

  function report(type) {
    if (reported) return;
    reported = true;
    window.removeEventListener('error', reportStartupError, true);
    send(type);
  }

  function reportStartupError(event) {
    if (event.target === window || event.target instanceof HTMLScriptElement || event.target instanceof HTMLLinkElement) {
      report('locus:city-map-unavailable');
    }
  }

  if (enabled) {
    document.documentElement.classList.add('city-map-embed');
    window.addEventListener('error', reportStartupError, true);
  }

  return {
    enabled,
    hasParent,
    accepts: event => hasParent && event.source === window.parent && event.origin === origin,
    requestExpanded: expanded => send(expanded ? 'locus:city-map-expand' : 'locus:city-map-collapse'),
    ready: () => report('locus:city-map-ready'),
    unavailable: () => report('locus:city-map-unavailable')
  };
})();
