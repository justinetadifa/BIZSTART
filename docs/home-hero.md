The homepage hero is a React island inside the existing PHP application. Its
source is `assets/react/home-hero/HomeHero.jsx`; Framer Motion handles the word
reveal, SVG underline, button gestures, and spring-smoothed pointer depth.
Tailwind utilities use an isolated
`hr-` prefix and `#locus-react-hero` selector. Homepage navbar styles retain the
existing PHP markup, role-based links, and mobile menu controls.

Run `npm ci` and `npm run build:hero` after changing the React component or its
stylesheet. Commit the generated `assets/js/home-hero.js` (and license file),
`assets/css/home-hero.css`, and `app/Views/home-hero.generated.html` with the
source. Production needs PHP and these built files; no Node server is required.
The existing `build:css` command remains independent.

The build uses React server rendering so the photo, headline, supporting copy,
and native anchor links work before JavaScript and when it is unavailable.
Client hydration adds continuous aerial drift, a warm light pass, a travelling
underline highlight, and a small scroll cue. These use CSS transforms/opacity
and pause when the hero is offscreen, the tab is hidden, or navigation is open.
Hero motion starts automatically after hydration, without a Play/Pause control
or a stored pause setting. The hero's explicit autoplay behavior runs independently
of the system motion preference; the rest of the site's reduced-motion behavior
is unchanged. Static server markup remains fully usable without JavaScript.
Pointer movement affects only the decorative image layer; text and controls
remain fixed. The original `landing-city.jpg` remains, warmed with CSS.

Availability comes from `PropertyRepository::publicListingCount()`, using the
same public visibility rules as the catalogue. If data is unavailable, neutral
availability text replaces the count. The five-stage indicator tracks the hero,
city overview, Why San Fernando, properties, and About using native scrolling.
