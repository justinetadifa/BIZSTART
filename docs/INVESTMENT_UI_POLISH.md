# LOCUS-SF investment and interface polish

The update simplifies property discovery, city assessment, and investment reporting while preserving LOCUS-SF typography, colors, navigation, authentication, and existing listing permissions.

## Investor and public experience

- Shorter landing and investor heroes, a category dropdown, and colored property-type shortcuts replace dense introductory copy.
- “Why San Fernando?” uses Tailwind cards for all seven centrally configured priority sectors, both investment areas, the Digital City advantage, incentives and all five permit types. A compact cost selector provides guidance for all five categories. Incentive and requirements actions link to official sources; unsupported connectivity/lease claims and unverified rates are omitted.
- Property cards emphasize photos, location, price, area, availability, and assessment scores. Search, category filters, saved listings, comparison, and map navigation remain available. Missing explorer zoning appears as “Awaiting zoning review” in neutral text; fallback descriptions avoid unverified road-access or viability claims.
- The priority board uses readable property rows, score indicators, stable assessment ranks, and clear pending-assessment states.
- Property details add proposed business type, capitalization, sector alignment, incentive estimates, and separate Base IAI / Policy Priority Adjustment / Final IAI results.
- Report finalization requires acknowledgment of the compliance checklist. Investment reports reload authorized property data and recompute scores from current policy rather than trusting browser-stored scores. Print / Save PDF remains available.
- Small-screen refinements cover navigation, authentication forms, map controls and popups, comparison, saved properties, details, and reports.

## Admin, broker, and nearby places

- The city overview has an existing San Fernando panorama, a current Philippine date, four actual-count cards, photo-based listing reviews, and an MCE/IAI chart using published property scores. Department headings focus on records and investment support. A warm amber broker header distinguishes the broker workspace.
- The admin property editor has three sections: Property, Location, and Review. Review includes the automatic assessment scorecard. Required-field validation returns to the correct section; optional contact details stay collapsed. Short-height screens use compact sticky controls so fields remain accessible.
- Broker submissions group location, surroundings, and contact details into disclosures. Validation opens a disclosure containing an invalid required field.
- Broker verification separates identity/PRC details from review controls; past decisions are collapsed. The staff directory keeps its department filters, and Add personnel opens the initially closed provisioning form. Existing listing review, document requests, and departmental access remain intact.
- Both editors use whole square metres, matching the database’s four-decimal hectare precision.
- Listings can record up to six nearby properties or businesses, with optional type, distance, and photo. Existing and selected photos have previews. Nearby evidence is stored in `properties.nearby_properties_json`, survives unrelated edits, and can be removed explicitly.
- Uploaded nearby photos reuse server-side image validation. Broker-provided surroundings cannot assign city scores or approve listings. Nearby evidence is also visible in property details.

## Profile editing

- Personal details and broker registration are separated, with registration collapsed for verified brokers and opened when validation needs it.
- Profile photos support drag positioning, keyboard movement, zoom, reset, preview, cancel, undo, and removal. Applying a crop prepares a 640 × 640 JPEG; saving the profile commits the change.
- Cancel preserves an already prepared photo. Existing upload validation, privacy consent, and CICTO review of broker registration changes remain enforced.
- The crop dialog adapts to narrow portrait screens and short landscape screens.

## Scoring and verified policy

The departmental method remains provisional and explicit: MCE weights are spatial 20%, infrastructure 20%, economic 20%, nearby businesses 10%, zoning 15%, risk 10%, and environmental safety 5%. IAI is 60% rounded MCE + 20% economic viability + 20% infrastructure readiness. All seven scores are required; unknown values remain unassessed. Higher risk-constraint scores mean fewer constraints. Assessed, approved listings receive ranks, and tied rounded scores share a rank.

Property assessment previews and calculations are server-authoritative; admin controls show the resulting scores and supporting sources. Policy alignment is separate from the departmental calculation. The proposed **+10% research bonus has no verified approval and remains disabled**. Enabling any modifier requires a configured percentage, an explicit approval flag, and a recorded approval reference in the central policy source, `app/investment-policy.php`. Displayed final scores are capped at 100, with the points actually applied shown separately.

Automatic assessments require verified local GIS/valuation datasets and approved numeric score mappings, which are still missing from the shipped configuration. Missing evidence remains pending; illustrative CLUP circles, partial business pins, asking prices and broker-entered nearby places cannot supply scores. The city scorecard is read-only and shows source evidence or the specific missing input. Coordinates use six decimals and area uses four decimal hectares before preview/save, matching MySQL precision; null-area PATCHes preserve the existing hectares. Coverage checks follow straight GeoJSON polygon edges conservatively, while road proximity uses spherical distances. See [Automatic property assessment](automatic-assessment.md) for source setup, conversion approval and persistence behavior.

Automatic scorecard bars now reflect their numeric scores. Removing the fixed important zero-width utility lets the calculated inline percentage control the visible fill, including a real zero score.

The ordinance was checked against the scanned [Ordinance No. 2024-41](https://drive.google.com/file/d/1S5q2HOklGy4O692uYMgHrZNNXOpYqZ69/view), linked from the [official city business page](https://www.sanfernandocity.gov.ph/business-in-the-city/). Page numbers below are the printed ordinance pages.

| Provision | Verified reference and treatment |
| --- | --- |
| Capitalization of at least PHP 15 million | §19, p15: potential one-year Local Business Tax exemption. Eligibility still requires LGU review and applicable registration conditions. |
| PHP 3 million to below PHP 15 million | §19, p15: potential 10% Local Business Tax discount. The published upper band is PHP 14,999,999. |
| Below PHP 3 million | Route to small-enterprise/BMBE eligibility review; capitalization alone does not establish entitlement. |
| City-resident workforce | §14(G), p12: 70% of total manpower, with City PESO certification when the required skills/manpower are unavailable locally. |
| CSR plan | §16, pp12–13: required registration documentation for sole proprietorships and partnerships/corporations. |
| CSR allocation | §24, pp16–17: 5% of availed incentives for CSR. |
| Conditional CSR timing | §23: the local CSR project in the third year applies to enterprises receiving incentives for more than two years; it is not a universal third-year deadline. |
| Land-use violations | §26, p18: PHP 5,000 fine for enterprises found guilty, upon CSF-IPAC recommendation. Do not present this as an automatic charge or eligibility calculation. |

The ordinance’s §13, pp8–11, identifies 12 investment priority areas. UI sector groupings are summaries; specific activity coverage, project conditions, registration, zoning, employment, and CSR requirements still need LGU confirmation for an applicant. Statutory incentives do not authorize a numerical IAI bonus.

## Build and schema handoff

New UI uses locally compiled Tailwind CSS 3.4.17 utilities with the `tw-` prefix. Preflight is disabled to preserve the existing shell; Tailwind variable defaults are included for focus rings, transforms and shadows. The compiled stylesheet is included in the application; no Tailwind CDN is required at runtime.

Run from the project directory in PowerShell:

```powershell
npm.cmd ci
npm.cmd run build:css
& 'C:\xampp\php\php.exe' database/migrate-city-workspaces.php --dry-run
& 'C:\xampp\php\php.exe' database/migrate-city-workspaces.php --apply
```

Review the dry-run output before applying the migration to an existing deployment. The migration invokes the existing idempotent `SchemaManager`, does not seed or clear listings, and includes nearby, automatic-assessment and preserved legacy-assessment JSON columns. Fresh installations use the updated `database/schema.sql` / `database/setup.sql`. Normal production migration requirements still apply; schema changes do not require replacing existing property data or bulk conversion of manual assessments.

## Validation evidence

The completed admin redesign passed **29/29 current browser checks** across **280 × 653, 320 × 568, 568 × 320, 844 × 390, 1024 × 600 and 1920 × 1080**. This includes overview/staff filtering, direct listing decisions, each wizard step, map selection, read-only source explanations, proportional score bars, and save payloads without client-supplied scores. Browser save requests were intercepted, so these checks did not create listings. Results: `.ui-audit/admin-final-results.json`.

The live scorecard uses `api/assessment-preview.php` and invalidates stale location responses. Saving always asks the server to recalculate; unknown source data remains pending. Original manual records are labeled and retained in history. The map picker supports existing-location search, click/drag placement and typed verified coordinates. Production numeric scores require the verified datasets and approved conversion rules described in [automatic-assessment.md](automatic-assessment.md).


The current continuation audit passed **33/33 checks** with zero unexpected runtime exceptions at **320 × 568, 390 × 844, 568 × 320, 768 × 1024, 1024 × 600 and 1440 × 1000**. It covered all sectors/permits/source actions and cost guidance, category filtering, incomplete automatic-score gating, capitalization boundaries, compliance acknowledgment, authorized report scores and rejection of a tampered report draft, source evidence, PDF output and the read-only city scorecard. Explorer regression checks verified neutral pending-zoning labels and conservative fallback descriptions; measured progressbar fill ratios matched numeric scores. Results: `.ui-audit/investment-continuation-results.json`; PDF: `.ui-audit/continuation-investment-report.pdf`. Complete-assessment responses were synthetic and intercepted in the browser without database changes. The Tailwind build passed.

Current repeatable checks passed: automatic engine **108**, isolated assessment persistence **16**, base computation **11**, database-free nearby **12** and listing workflow **19**, API security **38**, upload security **15**, account workflow **29** and policy support **16**. The current database integration run used only the uniquely named temporary assessment database, preserving the application catalogue. JavaScript policy and automatic-assessment UI checks passed, including approval gates, capitalization boundaries, zero/pending scores and stale preview handling.

The final responsive regression run also covered **280 × 653, 320 × 568, 568 × 320, 844 × 390, 1024 × 600, and 1920 × 1080**, including portrait and short landscape layouts:

- Main interface continuation: **75 passing checks**, recorded in `.ui-audit/responsive-continuation-results.json`.
- Admin/broker/property desk: **60 passing checks**, including all three editor steps, sticky controls, staff provisioning, review dialogs, nearby previews, and scrollable submission controls; `.ui-audit/admin-broker-aspect-results.json`.
- Profile and crop workflow: **17 passing checks**; `.ui-audit/profile-crop-results.json`.
- **11 independent base-computation checks** cover boundary, mixed-input, missing-input, and tied-rank results. Earlier manual-client parity fixtures are superseded by the server-authoritative assessment flow; automatic preview/source checks are recorded separately.
- Nearby persistence/security checks cover create, edit, removal, preserved omitted fields, invalid input, unsafe URLs, and broker authority boundaries. Dedicated pending fixtures and their audit records were removed after testing.
- Existing listing, image-upload, account, and API safeguards were checked alongside PHP/JavaScript syntax. Policy tests cover approval gates, missing/zero/capped scores, and capitalization boundaries.

Browser audit results and screenshots are local artifacts under ignored `.ui-audit/`; the reusable scoring, nearby, and policy tests are in `tests/`. These checks establish behavior at the listed sizes; they are browser emulation, not a claim of testing every physical device.

Useful repeatable checks:

```powershell
& 'C:\xampp\php\php.exe' tests/property-assessment.test.php
& 'C:\xampp\php\php.exe' tests/automatic-assessment.test.php
& 'C:\xampp\php\php.exe' tests/assessment-persistence.test.php --integration
& 'C:\xampp\php\php.exe' tests/nearby-properties.test.php --integration
& 'C:\xampp\php\php.exe' tests/policy-support.test.php
node tests/investment-policy.test.cjs
node tests/automatic-assessment-ui.test.cjs
```

The nearby integration test requires the local database and a local CICTO fixture; it cleans up its own temporary property and audit rows.

The assessment-persistence integration test requires localhost MySQL database-creation permission. It creates and removes a uniquely named temporary database; it never changes the application catalogue. Its default mode runs normalization checks without a database.

## Modified-file summary

| Area | Files |
| --- | --- |
| Public/investor rendering and shared shell | `index.php`, `app/Support/CityShell.php`, `app/Support/CityWorkspace.php`, `assets/js/city-workspace.js` |
| Map refinements continued from earlier work | `assets/css/city-map-crexi.css` |
| Admin and broker | `admin-dashboard.php`, `admin-properties.php`, `seller-dashboard.php`, `assets/js/admin-overview.js`, `assets/js/admin-workspace.js`, `assets/js/broker-workspace.js` |
| Profile | `profile.php`, `assets/js/profile-photo.js` |
| Nearby evidence and persistence | `app/Support/PropertyNearby.php`, `assets/js/nearby-editor.js`, `app/Repositories/PropertyRepository.php`, `api/_listing-policy.php`, `api/properties.php`, `api/property.php` |
| Scoring and central policy | `app/Support/PropertyAssessment.php`, `app/investment-policy.php`, `app/config.php`, `api/bootstrap.php`, `assets/js/investment-policy.js` |
| Automatic assessment and source evidence | `app/Support/AutomaticPropertyAssessment.php`, `app/assessment-sources.php`, `api/assessment-preview.php`, `assets/js/admin-assessment.js`, `assets/js/admin-location.js`, `assets/js/assessment-evidence.js` |
| Evaluation and reports | `reports.php`, `assets/js/investment-evaluation.js`, `assets/js/investment-report.js`, `assets/js/report-compliance.js`, `assets/js/portal.js` |
| Schema | `app/Core/SchemaManager.php`, `database/migrate-city-workspaces.php`, `database/schema.sql`, `database/setup.sql` |
| Tailwind build | `package.json`, `package-lock.json`, `tailwind.config.cjs`, `assets/css/workspace-polish.input.css`, `assets/css/workspace-polish.css` |
| Regression coverage | `tests/property-assessment.test.php`, `tests/automatic-assessment.test.php`, `tests/assessment-persistence.test.php`, `tests/automatic-assessment-ui.test.cjs`, `tests/nearby-properties.test.php`, `tests/investment-policy.test.cjs`, `tests/policy-support.test.php`, `tests/security/verify-listing-workflow.php`; obsolete manual-client parity test removed |
| Handoff | `docs/INVESTMENT_UI_POLISH.md`, `docs/automatic-assessment.md` |
