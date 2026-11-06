LOCUS-SF uses native browser scrolling with a shared progressive motion layer.
`locus-motion.js`, `locus-motion.css`, and `locus-interactions.css` are loaded by
the common PHP shell. No scroll library, wheel interception, or frame-by-frame
page translation is involved.

Below-fold, safe content units reveal once with 24px upward movement, 650ms
ease-out, and 75ms grouped staggering. Initial content remains visible.
Property identities survive card DOM replacement within the page visit, so
filtering does not replay an already-seen property's reveal. Visible maps,
tables, chat, form controls, sticky/fixed descendants, native dialogs, and
Framer Motion islands are excluded from scroll reveals. Hidden/inert drawers
do not disqualify an otherwise safe card. Descendant inspection is bounded.

Buttons and selected CTA links receive small native press/hover feedback.
Field transitions affect border, background, and shadow only. Safe native
details receive progressive auto-height transitions; native dialog opacity
transitions preserve browser focus, top-layer, Escape, and close semantics.
Tab panels fade from 65% opacity without moving their maps or controls.
Unsupported browsers keep native immediate behavior.

The header's measured height supplies native anchor scroll padding. Nested
scroll regions keep their own wheel, touch, and keyboard behavior. Decorative
image depth remains an explicit, bounded desktop-only opt-in.

Content is visible with JavaScript disabled or blocked. Reduced-motion changes
settle shared reveals immediately and remove added movement. The previously
requested homepage hero autoplay remains independent and unchanged. Print
styles receive no new reveals, interaction movement, or panel animation.

Use `data-locus-motion="off"` to exclude a component and its descendants from
shared motion, or `data-locus-interaction="off"` for an independent control
system. `window.LOCUS_MOTION` retains its `reveal`, `refresh`, and `finish` API.
