# Property investment brief

The PDF uses a coordinated A4 editorial layout across the property profile, assessment, zoning and hazards, and investor next steps. Its print identity pairs Georgia titles with locally served Inter, deep navy panels, warm ivory financial summaries, burgundy accents and a muted gold keyline. A parcel mark, document reference, section numerals and ruled page footers give every sheet a consistent identity.

The cover preserves the complete listing image beside its location reference, followed by three financial metrics and a compact facts register. The boundary reminder sits in that register rather than spilling onto a separate sheet. Assessment tables use restrained alternating rows, explicit pending states and a separate release decision. The named `locus-investor` page style supplies actual page counters and replaces browser date, title and URL furniture. These rules apply only to the investment brief; the CAO dossier retains its own styling.

Print typography also overrides the application's layered font rules inside the same CSS layer. This keeps the exported serif titles and numeric hierarchy consistent with the isolated document preview. Content remains in normal flow with no fixed page heights or clipping.

## Corrections included

- The old print rules displayed the photograph and its “photography pending” fallback together. They now have mutually exclusive loaded, missing and failed-image states.
- Partial assessments previously substituted zero for missing contributions and could print 40/100 from two rated criteria. The composite now remains **Withheld**. Rating coverage and recorded hazard coverage are separate measures.
- The current assessment protocol uses server evidence gates and unrounded contributions. Conflicting totals or contributions, incomplete evidence, historical records and technical holds cannot restore a numeric headline through an older score alias.
- A scalar zoning score no longer fabricates legal permission, a zoning district, mandatory setbacks or an ordinance reference. Unassessed hazards have no invented distance, terrain or susceptibility finding.
- Exact recorded square metres drive unit-price calculations. Lease estimates use the offered area and the actual billing period. An unmeasured offered portion is not silently replaced by the entire parcel area. Sale and lease quotations retain their separate bases.
- Nearby listings need a recorded distance within 500 m. Unknown distances are excluded; straight-line distance is not described as pedestrian access. No fabricated registry counts or civic-centre distances are printed.
- Scenario exports consume the shared assessment endpoint. Pending, failed and superseded requests cannot leave an earlier composite score in the brief. Listing availability is preserved independently of assessment status.
- Long content flows to additional pages with actual physical page numbering. The optional evidence appendix retains recorded inputs, rules, evidence references, source hashes and the comparison cohort.

## Validation

```text
node tests/investor-pdf-editorial.test.cjs
node tests/investor-pdf-print-refinement.test.cjs
node tests/property-details.test.cjs
node tests/property-details-mce-audit.test.cjs
node tests/locus-v3-presentation.test.cjs
php tests/locus-v3-pipeline.test.php
```

The redesign audit generates real Chromium PDFs and extracts their text. Recorded Pagdalagan, Zambrano and Sevilla briefs, missing details and failed photography fit four A4 pages. A long title and description flow onto additional pages while retaining all 100 marked sentences. The full application was also checked with browser headers enabled and disabled. Review PDFs, page images and measurements are in `.ui-audit/pdf-redesign/`. The earlier editorial audit and its artifacts remain in `.ui-audit/pdf-editorial/`.

The assessment remains provisional. These checks establish presentation and arithmetic consistency; they do not authenticate municipal datasets or validate the suitability model empirically. Source verification states remain visible in the report.
