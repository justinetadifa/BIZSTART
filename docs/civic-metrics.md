The “Get to know the city.” grid is a TypeScript React island within the
homepage's existing city overview. Source files live in
`assets/react/civic-metrics/`:

- `metrics.ts`: eight metrics, labels, units, credits, and the brief's secondary figures.
- `MetricArt.tsx`: bespoke inline SVG illustrations. These are conceptual
  drawings; curve coordinates do not encode historical measurements or an
  actual geographic map.
- `CivicMetrics.tsx`: selection, hover previews, the shared selection badge,
  keyboard activation, announcements, and the illustration motion switch.
- `widgets.css`: component styles and isolated `cw-` Tailwind utilities.

Run `npm ci` and `npm run build:civic` after editing the component. This runs
TypeScript checks and builds `assets/js/home-glance.js`, its legal notice,
`assets/css/civic-metrics.css`, and `app/Views/civic-metrics.generated.html`.
Commit these generated files with the source. PHP serves the generated visible
markup; no Node runtime is needed in production. Keep the hero build separate.

There is one category heading per column and two cards per category. Cards are
230px tall with ordinary text; they grow when wrapping or enlarged text needs
more room. Selection defaults to Residents. Click, Enter, or Space pins a metric
and updates the existing photograph's detail panel and its paired metric;
pointer and keyboard focus provide temporary previews. Escape resets Residents.

The date's switch controls illustration motion and card motion. It uses a real
switch role and keyboard behavior. Reduced motion initializes it off and responds
to preference changes. Ambient SVG effects pause offscreen and in hidden tabs.
The card contents and source credits remain visible without JavaScript, with
interactive controls disabled until hydration succeeds.
