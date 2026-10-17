# Property intake review — 17 October 2026

The add/edit interface uses four steps: Basic information, Location & boundary, Assessment, and Review. The changes apply to city staff and brokers without changing server ownership or review permissions.

## Critique and corrections

| Finding | Correction |
| --- | --- |
| Classification controls occupied only half their available grid, truncating selected values. | Full-width responsive row; three readable columns on desktop and stacked controls when space is limited. |
| Intro cards, nested tab cards, shadows and badges competed with the actual questions. | Restrained criterion navigation, shorter introduction, full-width evidence panels and fewer duplicate controls. Small-screen headers keep one draft action in the footer. |
| Optional assessment controls could block submission; defaults asserted frontage, utilities and report sources. | Unrecorded observations start empty. Zoning can remain unknown at intake. Counters describe recorded evidence and never imply verification. |
| Price dropdowns were still read as radios in display, validation, restoration and submission. | All consumers read the same form value. Inquiry mode retains the draft amount but disables its input and excludes it from the submitted price. |
| Unsupported address/reference/privacy controls collected values the server did not save, including a promise to conceal exact locations. | Removed those controls and the unsupported privacy promise. Area measurement source remains in Location & boundary; descriptions and supporting evidence remain available. |
| Exact parcel area was replaced by the rounded legacy hectare column when saving price per square meter. | Derived pricing uses the exact parcel measurement. A PHP 1,490 price for 1.49 m² remains PHP 1,000/m². Historical assessment snapshots remain preserved; explicit reassessment can refresh them. |
| Both the shared wizard and each workspace converted units, changing area twice. | The shared wizard owns conversion. The Basics square-meter input mirrors the same physical measurement; restoration resets its unit state. Only the API-supported square-meter and hectare choices are offered. |
| Annual or per-square-meter rent could be treated as total monthly rent. Sale and lease alternative costs were added together. | Browser and PHP use identical area and period bases. Annual rent divides by 12; per-square-meter rent expands using the actual offered area. Daily rent does not establish a monthly rate or monthly deposit basis. Sale and lease outlays remain separate. |
| Early rounding could move a comparable-price result across a 5%, 15% or 30% rubric boundary. | Ratios and threshold comparisons retain precision; display formatting rounds separately. Missing offered floor area cannot silently use parcel land area. |
| Tags could manufacture nearby-business scores; scalar zoning zero could become a legal prohibition. | Removed tag-derived scores. Numeric zoning alone does not establish eligibility. Intake totals stay pending for evidence review; missing measurements remain unknown. |
| Business preview still described seven criteria despite the current six-criterion protocol. | Counts, weights, configuration and explanations now use six criteria with 15% risk weight. BIR tax values remain separate from market evidence. |
| Maps opened on streets, duplicated zoom controls and omitted visible location-map failure feedback. | Both maps start on satellite, keep one zoom control and show provider recovery messages. Fallback preserves the property pin and boundary. |
| A broker-only preview referenced an undefined variable and prevented opening the form. | Saved authority metadata has explicit per-property state, cleared between listings. |
| Broker payload filtering silently removed offered area, deposit, advance rent, additional costs and comparable rent. | Reported financial fields survive filtering and parcel persistence; unrelated edits retain them and explicit clearing removes them. Approval and evidence verification remain server-controlled. |

## Model limits

The current six-criterion weights are 20/20/20/10/15/15 (spatial, infrastructure, economic, nearby, risk, zoning). IAI is the sum of criterion score × weight / 100, rounded once for display. There is no second 60/20/20 combination of the same components. Prohibited uses and critical hazard holds are eligibility constraints, not weaknesses that other high scores can offset.

Arithmetic consistency is tested; it does not empirically validate the provisional weights, comparable-price rubric or datasets. Authoritative scoring still requires suitable current evidence, source authentication, a specific activity where required, and authorized methodology/source approval. Changing these assumptions requires a documented protocol revision. No fabricated sources, approvals, business demand, returns or hazard clearances were added.

## Verification

- `node tests/property-wizard-computation-parity.test.cjs`: 93 executable browser/PHP checks for exact-area prices, rent units and periods, inquiry modes, threshold boundaries, missing floor area, alternative outlays, invalid distances and aggregate bounds.
- Eighteen focused PHP suites cover all six rubrics, evidence/eligibility gates, persistence, numeric precision, classification, utilities, nearby inventory/density, automatic assessment and property submission contracts.
- `php tests/property-intake-persistence.test.php` checks broker policy, save/edit/clear behavior, numeric validation and separation from approval/verified scores without a database connection.
- Browser audit: `.ui-audit/property-intake-20261017.mjs`. It renders the production templates with synthetic staff/broker identities, intercepts application APIs and blocks application writes. It checks both roles at 1440, 768, 390 and 320 pixels, captures screenshots, loads live Esri satellite tiles, and checks price-mode behavior, area conversion, evidence status and withheld totals. Actual submitted form payloads run through production PHP policy and repository normalization with a PDO double that refuses database mutations; both roles retain the financial observations.
- Provider recovery audit: `.ui-audit/verify-property-map-reliability.mjs`. Controlled tile responses cover satellite defaults on both maps, native zoom limits, a single zoom control, missing imagery, alternate streets, complete outage/retry, and preservation of pin/boundary overlays.

Browser artifacts and logs are under `.ui-audit/property-intake-20261017/`; provider results are under `.ui-audit/property-map-provider/`. These checks do not create catalogue listings or send user messages.

Final verification: all 20 focused PHP suites and all 15 focused JavaScript suites passed. The four provider-recovery scenarios passed. Both staff and broker browser runs accepted their intercepted submission through production policy/repository normalization, preserved the reported financial fields, loaded live satellite tiles, and passed the four viewport sizes without browser exceptions. `git diff --check` passed.

## Classification, contact and area follow-up

The primary subtype now has a searchable, keyboard-operated picker backed by the unchanged server catalogue. Additional classifications expand within the form with filtering, removable selections and an explicit distinction from official zoning. The bulk-select action was removed to discourage indiscriminate classification. Existing recorded labels remain editable without silently rewriting the catalogue.

Basics and Location & boundary both offer m² and hectares. Changing either unit preserves the physical measurement and shows its equivalent. Browser verification includes repeated switching for 1.49 m² while retaining PHP 1,000/m² at a PHP 1,490 asking price.

Contact details support up to four additional phones and four labelled social-account or website links. They use the existing contact JSON and access controls, with no database migration. Broker filtering retains the new fields. The server validates phone text and HTTP(S) URLs, rejects embedded credentials and non-web schemes, removes repeated entries, preserves untouched channels on edit, and supports explicit clearing. `tests/property-contact.test.php` adds 24 checks. The browser audit submits both roles through production policy/repository normalization and reopens the normalized records to verify that phone numbers, account links and the custom subtype restore correctly.

The hazard and zoning reference maps now use the same satellite-first provider recovery as the main map. Hazard summaries bind to the current name, pin and exact area instead of stale template fields. Tests check the exact marker coordinates, a camera center within Leaflet's pixel rounding, and removal of stale markers when coordinates are cleared. Reference imagery is labelled separately from official hazard findings and zoning evidence. The Review screen no longer calls entered coordinates and missing parcel geometry “verified.”

Further visual refinement gives titles full width, removes decorative empty photo slots, provides explicit lease billing summaries, displays rental unit rates with their actual billing period, and prevents focus or menu scrolling from displacing the dialog header/footer. Screenshots include subtype menus, classifications, phone/social rows and satellite reference maps at desktop and mobile sizes.
