Property interfaces share an editorial visual system: upright uppercase Inter
headings, warm neutral surfaces, thin dividers, natural text wrapping, and
restrained brick-red actions. Body copy and factual units retain their case.

`CityShell.php` marks the applicable pages with
`data-property-style="editorial"` and loads four scoped stylesheets:

- `property-editorial.css`: shared tokens, typography, navigation finish,
  investor view controls, and the homepage's Properties section only.
- `property-editorial-assistant.css`: conversation, filters, results, and composer.
- `property-editorial-details.css`: property brief, research, and comparison.
- `property-editorial-workspaces.css`: catalogue, saved listings, map, priority
  board, broker listings, and the city property desk/editor.

These screen-only rules join the existing `locus-foundation` layer so they can
override the application's shared important declarations without changing its
JavaScript or data. Existing print/PDF styles remain independent. No build step
is required; normal versioned stylesheet links serve the files directly.

The catalogue's existing heading and description are now rendered when the
assistant is available, since that view no longer uses its former hero.
Search criteria, assessment evidence, gallery/map behavior, saving, comparison,
contact destinations, permissions, and listing workflows keep their existing
implementations. The homepage hero and account pages are outside this theme.
