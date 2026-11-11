# Scrolling and interaction feedback

Shared presentation lives in `assets/css/locus-motion.css`,
`assets/css/locus-interactions.css`, and `assets/js/locus-motion.js`.
The page, keyboard, touch, and map keep their native input behavior.

- The server-rendered hero stays visible through hydration.
- Safe content reveals once through `IntersectionObserver`. Major section
  headings, the city photograph, insight panel, and hydrated civic columns use
  a visible 20px rise and fade over 520ms. Dense cards retain 8px / 240ms.
  Observation starts up to 160px inside the viewport so entrances remain visible
  during normal scrolling. Prepared section units wait at zero opacity; focus,
  anchor navigation, reduced motion, and script-error cleanup show them immediately.
  Baseline content stays visible when JavaScript or observation is unavailable.
- Buttons use `data-locus-press` for a 120ms press response. Shared focus rings
  remain visible on the navy, red, and white surfaces.
- Native dialogs and disclosures share 240ms opening transitions where supported.
  Mobile map filters fade in when expanded. Map containers and controls are
  excluded from translated reveal effects.
- Outside the homepage, reduced motion removes CSS animations and transitions
  and preserves readable pending, error, and success messages. Back navigation
  restores content immediately without replaying scroll entrances.

`createBrowseRestoration` in `assets/js/browse-restoration.js` keeps account and
route scoped state in each browser history entry. Catalogs restore filters,
expanded cards, layout, map view, and document scrolling after results load. The
Property Assistant restores its criteria, editor/composer drafts, view, and
scrolling while fetching authorized current results. BFCache keeps the browser's
own scroll restoration. New user input cancels a pending scroll restore.

The shared `SFCPropertySubmission` helper in `assets/js/property-wizard.js` locks
the city and broker forms while a request is pending and shows “Submitting…”.
Failures retain fields and files, identify affected fields, and expose **Retry
submission**. Success feedback comes from the returned approval and availability
status. A later list-refresh failure cannot turn an accepted submission into a
retryable upload error.

## Verification

Run the focused checks from the repository root:

```powershell
node tests/browse-restoration.test.cjs
node tests/property-submission-feedback.test.cjs
php tests/parcel-wizard.test.php
```

The browser suite uses the running local XAMPP site, local demo accounts, and
Playwright with Chrome. Install Playwright separately or set `PLAYWRIGHT_MODULE`
to its installed module path. Override `CHROME_PATH` and `LOCUS_TEST_URL` when
needed:

```powershell
node tests/interaction-feedback.browser.cjs
node tests/scroll-experience.browser.cjs
```

It covers desktop and mobile behavior, native fragment links, live reduced-motion
changes, and history restoration with BFCache enabled and disabled. Chrome did
not use BFCache in the enabled run; native Back and the unit checks passed. Final property POSTs
are intercepted to exercise delayed requests, duplicate prevention, errors,
retry, and returned status without creating listings.

For real local submission and MySQL persistence checks:

```powershell
node tests/property-submission-live.browser.cjs --integration
```

This opt-in check accepts localhost only. It creates uniquely named desktop and
mobile fixtures through the real editor/API, checks persisted and displayed
statuses, and removes only those fixtures and their audit records in `finally`.
Both returned HTTP 201 with `pending_review` / `Available` during verification.
The checks use Chrome mobile emulation; real mobile hardware and production
delivery require a separate deployment check.

The focused scroll suite uses real wheel and touch input, measures intermediate
opacity and movement inside the viewport, and saves desktop/mobile screenshots
under the ignored `.ui-audit` directory.

## Homepage and account arrival

`home-experience.css` / `home-experience.js` add a reading-progress line, a compact
seven-section navigator, and bounded photo depth tied to native document scroll.
The navigator includes Previous/Next links, keyboard-visible section labels, and
a small progress line within the current section. All navigation uses ordinary
anchors; wheel, keyboard, and touch scrolling remain native. On narrow screens,
the Help button moves above the navigator so neither control overlaps the other.
The navigator appears after the hero and uses ordinary anchor links. It hides
over the footer or while a dialog or mobile navigation is open. The hero stays
visible immediately. The homepage explicitly plays full motion even when the
device requests reduced motion, as requested. The server emits
`html[data-home-motion="on"]` for `city-landing` only. Shared styles, reveal
utilities, image depth, and the React hero/civic components use that same choice.
Account pages and property workspaces still honor the device preference.

Topic, featured-property, and assistance cards use a single 4px lift with matching
keyboard-focus feedback. A fine mouse pointer moves a soft highlight across the
active card, and featured photos ease to a small zoom. Touch does not run pointer
tracking. Highlights cannot intercept input, scroll and pointer leave clear them,
and pointer updates are bounded to one animation frame. A delegated observer
prepares asynchronously loaded property cards without attaching handlers to each
card. The existing reveal animation and hover use the same translation property,
so their movement cannot accumulate.

```powershell
node tests/homepage-refinements.browser.cjs
```

This focused check covers hover, keyboard focus, native section navigation,
reading progress, dialog/menu/footer visibility, and 320/390/1440px layouts.
Chrome is launched with `--enable-smooth-scrolling` for this check because the
local Windows browser setting disables native interpolation. The test measures
actual intermediate scroll positions; the application itself keeps native
scrolling and does not replace the browser's wheel or touch handling.

The hero also has a finite arrival directly in the server markup: a 1.8-second
camera settle and light sweep, a 2.1-second outline trace, and a drawn underline.
Its headline, photo, and links remain visible from the start. When the first-visit
privacy dialog opens, the hero motion pauses; closing the dialog restarts the
arrival so the visitor actually sees it. The location caption and motion/replay
control have been removed from the hero. This choice adds no motion control or
location caption back to the interface.

```powershell
node tests/homepage-arrival.browser.cjs
```

This regression uses the real first-visit privacy UI, with no consent-storage
bypass or request interception. It measures a changing visible photo transform
after dismissal and a normal cached reload on desktop/mobile under both motion
preferences, checks the homepage override and no-JavaScript markup, and records screenshots, asset versions,
and `.webm` videos under `.ui-audit`. Playwright's FFmpeg runtime is needed for
video recording (`playwright install ffmpeg`).

`auth-motion.css` provides the navy/red gateway shared by the account forms and
the signed-in welcome page. Valid submission shows the actual pending label,
orbiting brand mark, and a light sweep; the native form request proceeds without
an artificial delay. A body-level portal keeps the graphic centered on mobile.
The server alone decides success. Rejected credentials return to inline errors;
successful investor and broker sessions show the personal welcome and the actual
broker status where relevant. Continue is usable throughout. The arrival animation
finishes within 1.9 seconds and can be skipped. Reduced motion settles it immediately.

```powershell
node tests/homepage-auth-experience.browser.cjs
node tests/homepage-auth-experience.browser.cjs --roles-only
```

This test uses real local investor authentication. To inspect the pending visuals,
it briefly holds native navigation after the application submit handler, then
releases the unchanged form to the real server. It verifies client validation,
duplicate prevention, a rejected password, successful desktop/mobile sign-in,
arrival controls, native homepage anchors, progress, image depth, and reduced motion.
Screenshots are saved under `.ui-audit`; no account or listing fixtures are created.
The optional role check verifies real broker/city-staff access and reduced-motion
pending feedback, with a simulated BFCache restore to check that controls unlock.
