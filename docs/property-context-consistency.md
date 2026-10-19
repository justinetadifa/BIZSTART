# Property context and score presentation

Updated 18 October 2026 in response to the LA Finn's listing review.

## Subject establishment exclusion

`NearbyBusinesses::find()` excludes the subject **before sorting and applying the result limit**. A listing ID is never compared directly to a business ID: they have different namespaces. Explicit OSM, BPLO or establishment identifiers can identify the subject. Otherwise the service requires matching distinctive names and a location within 120 metres, or a mapped footprint containing the listing reference point.

Names ignore case, apostrophes and spacing, and normalize descriptive suffixes such as `College`, `School` or `Property`. Branch/location names are preserved. Short or generic names cannot trigger name-based exclusion. Different nearby merchants and farther branches remain in the result set. This tolerates the 26 m pin difference between `LA FINN'S SCHOLASTICA` and `La Finns Scholastica College`.

Business opportunity analysis uses the same subject exclusion. An unspecified proposed activity does not make every non-anchor a complementary business. Known activity classifications use the shared radar profiles; uncategorized places remain ordinary nearby places.

## Calculated, provisional and released IAI

The former hero showed `Withheld` while its badges fell back to older `mceScore` / `iaiScore` aliases. This mixed an unreleased assessment with apparently released scores.

The current view separates:

- **Recorded rating total:** the weighted sum of complete, internally consistent criterion ratings. For the supplied five ratings, `25 + 25 + 10 + 11.85 + 10.125 = 81.975`, displayed as **82.0 / 100**.
- **Provisional IAI:** the same five-criterion calculation, visible while evidence, eligibility or technical review remains pending. Its numeric value does not clear those checks or make a property rank eligible.
- **Released IAI:** the result allowed by the assessment protocol after evidence, eligibility, discrepancy and technical review checks. An unreleased result remains excluded from actionable ranking.

A held five-criterion assessment displays **82.0/100 — Provisional IAI**, with official release marked **Pending review** and the specific hold reasons visible. Missing ratings, conflicting contributions, prohibited uses and historical records cannot produce a provisional index. Compatibility aliases cannot replace the weighted sum or resurrect an official release. Detailed evidence authentication and eligibility must agree with the summary completion flags before release.

Scenario requests clear the current activity's score while pending or failed. The saved property preview is identified separately. If a fresh activity evaluation has only three of five ratings, its IAI stays pending; the saved 82.0 property preview cannot become that activity's score. A permitted activity with all five consistent ratings may show its own provisional index while review remains pending.

LA Finn's recorded high flood and tsunami findings explain its technical review hold. Changing presentation does not clear that hold or edit persisted assessment data. The printable brief and comparison eligibility retain the protocol's release checks.

## Property cost explanation

The price criterion now links to an explanation of the server's pricing snapshot: offered unit price, entered comparable, unrounded percentage difference, applicable scoring band and weighted contribution. The backend supplies the same band definitions used for calculation; the browser does not maintain a separate rubric. The full intervals and calculation are documented in [methodology section 5.3](locus-sf-methodology-v3-final.md#53-criterion-3-property-cost--market-competitiveness-pcmc--weight-200).

For the reviewed LA Finn's snapshot, ₱350,000,000 divided by 5,950 m² gives ₱58,823.53/m². Against the entered ₱15,000/m² comparable, the difference is +292.16%. The app's above-30% band assigns 50/100, adding 10 of the available 20 points. The comparable source is missing, so the explanation explicitly marks verification pending. The rating is a provisional rubric result, not a profit percentage or authenticated appraisal.

Sale and lease comparisons retain their respective units. Missing inputs stay pending; stale ratings that disagree with their price snapshot display a review notice. A contribution inconsistent with its rating and weight is never presented as a valid equation. The explanation does not release an IAI or alter the stored assessment. The previous methodology text contained different thresholds and incorrectly identified BIR as the scoring benchmark; section 5.3 now matches the implemented comparable-based rubric.

## Hazard and emergency context

The old climate service fabricated low flood susceptibility for almost every location, a 1–10 agency-style rating, forecasts, response times, hydrants and fire compliance. It also replaced certain recorded coordinates with a barangay reference point.

The current flood card uses the recorded Risk Constraints finding and its evidence status. Six recorded findings do not imply six authenticated findings. The emergency card reports a straight-line distance to the application's configured station reference; it supplies no response time, hydrant access, fire risk score or compliance conclusion. Missing coordinates and missing findings remain unavailable. The map action identifies a recorded flood layer without claiming authentication.

## Interface and verification

### PDF MCE and IAI consistency

The shared printable brief previously hid the recorded weighted total whenever IAI release was withheld. It also printed the persisted `complete` alias even when `technical_review_hold` was true. The investment-report entry point spread a newly evaluated activity assessment over the property snapshot, replacing its saved ratings with the fresh evaluation's pending values.

The PDF now prints the recorded MCE total, provisional or released IAI, and official release status separately, using the same presentation as the property summary, calculation breakdown and comparison views. LA Finn's five recorded contributions are `25 + 25 + 10 + 11.85 + 10.125 = 81.975`, displayed as **82.0/100** after one final rounding. Its recorded high flood and tsunami findings remain visible alongside the provisional index. Official release stays pending; this display does not establish an investment rank.

An investment report keeps the saved rating table separate from the server's current selected-activity result. It identifies pending current criteria, the proposed activity and the respective assessment dates. Session drafts provide the selected activity and capitalization, never trusted scores. Policy context is inside the paginated brief. The investment-report page loads the shared print stylesheet and uses the standardized property PDF filename.

Print styles reset ancestor scroll containers to avoid cropped columns and printed scrollbars. Local Chrome exports of both live LA Finn's paths produced four A4 pages with complete contribution digits, visible review reasons and no JavaScript errors. The corrected property PDF, a clearly separate test activity export, extracted text and page images are in the ignored `.ui-audit/pdf-score-consistency/` directory. Existing downloaded PDFs must be exported again to reflect the fix.

`node tests/investor-pdf-score-consistency.test.cjs` covers the reported arithmetic, stale completion aliases, held and released IAI, saved/current assessment separation, incomplete and discrepant totals, context escaping and the actual export entry point. The existing PDF editorial, print refinement, v3 presentation and property-detail checks also pass.

### Comparison hazard coverage

The comparison card previously read `criteriaDetails.risk_constraints.raw.hazard_status`, an older aggregate text field. Current observations are stored as six individual subcriteria. Missing-data notes could make the old summary show "Not assessed" despite all six findings being present.

The comparison cards, comparison table, property hazard panel and printable brief now share the same per-hazard reader. They count the six defined indicators independently of evidence authentication. Explicit `none` is a recorded finding; an unverified finding is still recorded. A numerical risk rating alone cannot establish the individual findings. Current missing findings take precedence over stale spatial-screening fallback data, and an older finding cannot lend its authentication to a newer report.

Live comparison checks confirmed six recorded and zero authenticated findings for LA Finn's and Zambrano. The commercial yard has a stored risk rating but lacks the six individual classifications, so it explicitly identifies the missing detail. High findings and technical-review holds remain visible. The cards show coverage, evidence status and warnings on separate lines and link to the full hazard register.

`node tests/comparison-hazards.test.cjs` covers payload variants, partial/absent classifications, stale fallbacks, independent authentication, legacy text and the production card renderer. The live comparison page was checked at 1440, 390 and 320 pixels without horizontal overflow or runtime exceptions; captures are in the ignored `.ui-audit/comparison-hazards/` directory.

The panels use LOCUS-SF maroon (`#9e1b22`), neutral unknown-status badges, full establishment names, plain distance labels and accessible map buttons. Ordinary places are counted separately from commercial anchors. Desktop cards use two columns; mobile cards stack without truncating names.

```powershell
php tests/property-context-consistency.test.php
node tests/property-context-consistency.test.cjs
php tests/property-cost-explanation.test.php
node tests/property-cost-explanation.test.cjs
php tests/nearby-businesses.test.php
php tests/nearby-businesses-integrity.test.php
php tests/business-opportunities.test.php
node tests/locus-v3-presentation.test.cjs
node tests/property-details.test.cjs
node tests/property-details-mce-audit.test.cjs
node tests/property-research.test.cjs
```

These suites passed. Chrome checks at 1440, 390 and 320 pixels confirmed the recorded 82.0 total, unreleased IAI, high flood label, subject exclusion, maroon criterion bars and absence of horizontal overflow. The cost explanation has 36 backend checks and 35 browser-model and interaction checks covering threshold boundaries, rental normalization, missing evidence, stale ratings and weighted arithmetic. Local previews and browser harnesses are in the ignored `.ui-audit/details-correction/` and `.ui-audit/price-explanation/` directories.
