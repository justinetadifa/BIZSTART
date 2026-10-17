# Property investment brief

The PDF uses an A4 editorial layout: a property profile with an uncropped listing image, an assessment breakdown, zoning and hazard records, and practical investor next steps. Georgia headings, locally served Inter, restrained navy and burgundy, readable tables and physical page counters replace the former small type and large unused page areas.

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

The browser audit at `.ui-audit/pdf-editorial-review.mjs` generates real Chromium PDFs and extracts their text. It covers the recorded Sevilla property, synthetic complete and held assessments, missing data, a failed image, a long description, the optional appendix and the actual property-details page. Standard fixtures fit four pages. The long fixture retains all 150 marked sentences across extra pages. Audit output is in `.ui-audit/pdf-editorial/`.

The assessment remains provisional. These checks establish presentation and arithmetic consistency; they do not authenticate municipal datasets or validate the suitability model empirically. Source verification states remain visible in the report.
