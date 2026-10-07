# Automatic property assessment

`AutomaticPropertyAssessment` is the canonical server engine. New listings, changes to coordinates/category/subcategory/area, and an explicit city-staff `recalculate_assessment=true` action use server evidence. Request scores, source manifests and evidence are ignored, including direct repository input. Approval-only and other nonspatial PATCHes retain the recorded result. Existing manual assessments are labeled `legacy_manual`; the first automatic recalculation copies their criteria, method and original spatial inputs into immutable `legacy_assessment_json`. Automatic snapshots live in `automatic_assessment_json` and the property audit log. No bulk conversion occurs.

No authenticated, complete GIS/valuation layers or approved numeric conversion method are supplied with this repository. `app/assessment-sources.php` deliberately starts empty and unapproved. Existing CLUP circles, `spatial_overlays` and partial store-locator pins are illustrations/inventory aids, without the coverage and verification required to score. Admin-entered nearby places and photographs remain useful context, and never feed the automatic computation.

Missing evidence or an unapproved conversion leaves the affected criterion `null`, with its exact missing-data explanation. MCE and IAI remain `null` until all seven scores are available. A score of zero is a real measured/mapped result, not missing data. The weights remain the provisional LOCUS-SF model: 20/20/20/10/15/10/5. MCE = sum(score × weight)/100, rounded to one decimal; IAI = 0.60 × rounded MCE + 0.20 × economic viability + 0.20 × infrastructure readiness, rounded to one decimal. Numeric mappings are model choices requiring a department-approved version/reference; they are not prescribed by the investment ordinance.

## Configure verified local sources

Prepare GeoJSON outside the request path, transform it to WGS84 longitude/latitude and reconcile it against the named official source. Files must be inside the trusted `data_directory` (default `data/assessment`), with relative filenames, no path traversal, no wrappers/URLs, and at most 20 MB / 20,000 features per file. No external service is queried during preview or save. Keep large regional sources clipped and validated for the local study area before importing.

Set `automatic_assessment` in ignored `app/config.local.php`. Each `layers` entry needs:

```php
'roads' => [
    'file' => 'verified-roads.geojson',
    'verified' => true,
    'source' => 'Actual issuing agency and dataset title',
    'reference' => 'Actual source URL or official document reference',
    'version' => 'Actual source release/version',
    'verified_by' => 'Responsible department/person',
    'verified_at' => 'Actual verification date',
    'sha256' => 'Exact SHA-256 of this local file',
    'crs' => 'EPSG:4326',
    'complete' => true, // certify completeness for this coverage; do not infer it
    'coverage' => $verifiedCoveragePolygon, // GeoJSON Polygon or MultiPolygon
],
```

The source fingerprint is checked on every engine instance. A changed file requires a newly verified version and hash. Coverage must describe the surveyed/classified extent, including holes, rather than a convenient bounding rectangle. Outer polygon boundaries count as contained; holes do not. Entire nearest-road/business search circles must fit inside a containing coverage polygon. Containment and conservative search-circle boundary distances follow the same straight GeoJSON longitude/latitude edges, rather than treating polygon edges as great-circle arcs. Adjacent MultiPolygon parts are treated conservatively; a circle crossing between parts remains pending until coverage is supplied as a merged authoritative polygon. Polygon edges spanning the antimeridian are unsupported and rejected. Resolve overlapping authoritative classification polygons before importing; ambiguous utilities, valuation, zoning and environmental matches remain pending.

| Layer | Geometry and attributes | Measurement / required evidence |
| --- | --- | --- |
| `roads` | LineString / MultiLineString road centrelines | `road_distance_m`: shortest great-circle point-to-segment distance. Complete inventory and coverage of the nearest-road search circle required. Proximity does not establish road access rights or travel time. |
| `utilities` | Polygon / MultiPolygon; `utility_status` string | Containing verified service classification; absence is unknown. A service polygon does not establish a property connection. |
| `valuation` | Polygon / MultiPolygon; `bir_value_sqm` positive PHP/m², `applicable_categories` array of exact property categories | Manifest must identify `authority: 'BIR'` and `effective_date`. Category applicability must be reconciled to the BIR classification by the responsible department. `bir_total_value = bir_value_sqm × area hectares × 10,000` is additional context. Asking price and old `assessed_value_sqm` fallbacks are never evidence. |
| `businesses` | Point; `operating_status: 'operating'` for counted points | `business_count` within `business_radius_m` (default 1,000 m), including circle boundary. Closed/planned points do not count. Complete inventory and full-circle coverage required. Partial verified pins expose only observed count/nearest observed distance, leaving density pending. |
| `zoning` | Polygon / MultiPolygon; optional `zone`, plus `allowed_categories`, `conditional_categories`, `restricted_categories` arrays | Explicit selected-category membership yields `permitted`, `conditional` or `prohibited`. Missing or conflicting permission mappings remain pending. This classification does not issue a clearance. |
| `hazards` | Polygon / MultiPolygon; `hazard_type`, `hazard_status` strings | Manifest needs `complete: true` and `hazard_types` array. Approved risk rule must list `required_hazard_types`; every type needs certified coverage. Containing status values are mapped individually, taking the approved minimum score for overlaps. Only inside certified complete coverage may absence of a mapped hazard yield `outside_mapped_hazards`. A missing overlay can never imply safety. Use official hazard footprints / officially established buffers, not invented fault distances. |
| `environment` | Polygon / MultiPolygon; `environment_status` string | Containing verified classification and coverage required; no polygon/unknown coverage is pending, never automatically safe. |

All geometry uses `[longitude, latitude]` coordinates. Point distances use haversine; road-segment distances use spherical cross-track/along-track projection and endpoint distance where the projection lies outside the segment. Earth radius is 6,371,008.8 m. Distances retain full precision during band selection. The model reports straight-line road/business proximity with spherical rather than cadastral/survey precision; obtain licensed survey measurements when boundary precision is material.

## Approve explicit score conversions

Provide `method.approved: true`, a nonempty `method.version`, a real `method.approval_reference`, and seven `method.rules`. Production ships without any score bands or lookup scores. Each rule must use its layer's metric from the table above and one of:

```php
// Structural examples only. Replace every placeholder with department-approved values.
['metric' => 'road_distance_m', 'operator' => 'bands',
 'bands' => [['max' => $approvedLimitMetres, 'score' => $approvedScore]],
 'otherwise' => $approvedScoreBeyondLimit]

['metric' => 'utility_status', 'operator' => 'lookup',
 'values' => ['actual_source_classification' => $approvedScore]]

['metric' => 'hazard_status', 'operator' => 'lookup',
 'required_hazard_types' => $approvedRequiredHazardTypes,
 'aggregate' => 'minimum', 'values' => $approvedHazardClassificationScores]
```

Bands require strictly increasing finite maximums and scores from 0–100. The first matching `value <= max` wins; `otherwise` is optional and must be explicit. An uncovered measurement remains pending. Lookup requires an explicit mapping for the measured classification. There is no default score. Every score's justification states the actual metric, evidence reference/version, selected lookup or full band formula, and missing inputs. Approving a BIR conversion acknowledges it as a model proxy for the economic criterion; a zonal valuation alone does not prove profitability.

## API and persistence

Authenticated CICTO/ASSESSOR/LEBDO staff may GET `api/assessment-preview.php` with scalar `lat`, `lng`, `category`, optional `subcategory`, `land_area`, and `land_area_unit` (`sqm` or `hectares`). The response is `{assessment: {...}}`, including normalized hectare inputs, scores, completion counts, weights, method/version, `criteriaDetails`, `spatialContext` and evidence fingerprints. GET makes no listing mutation. Broker/investor/guest access returns 403; non-GET returns 405. Existing mutation endpoints retain their CSRF and ownership/review rules.

The engine and repository round coordinates to six decimals and area to four decimal hectares before evaluating or comparing spatial inputs. Preview evidence therefore describes the same point and area that MySQL stores, including price per square metre and total BIR valuation. Changes below storage precision retain existing assessment history. A PATCH with `land_area: null` retains the existing hectare value; a posted unit alone cannot reinterpret it.

Persisted property responses expose this same metadata at the top level and as `automaticAssessment`, plus `legacyAssessment` when preserved. Approval-only actions retain the original snapshot rather than silently applying changed source files/rules. To refresh a listing after a newly verified data release, city staff explicitly save for automatic review. File/rule fingerprints make the snapshot reproducible. Before production deployment, inspect `php database/migrate-city-workspaces.php --dry-run`, then run the authorized `--apply` migration; `SchemaManager` adds the two nullable metadata columns and preserves all existing criteria.

## Verification

Run `php tests/automatic-assessment.test.php`: **108 checks passed** for independent geometry/coverage, explicit band/lookup arithmetic, complete/missing/partial sources, tampering/path/verification gates, risk coverage, client injection, storage precision and manual-history preservation. Its uniquely named temporary local layers and approvals are explicitly synthetic and removed after testing; they are never installed as city data.

`php tests/assessment-persistence.test.php --integration` passed **16 checks** for actual MySQL snapshots, unchanged edits, immutable legacy history, audit evidence and normalization. It requires the local environment and localhost MySQL with permission to create a database; it creates and removes a uniquely named temporary database, without changing the application catalogue. Omitting `--integration` runs the database-free normalization checks. `node tests/automatic-assessment-ui.test.cjs` checks zero/pending results, evidence rendering and stale preview cancellation. Current database-free listing-workflow and nearby checks passed **19** and **12** checks respectively; their earlier application-database integration evidence is recorded separately in the investment handoff.

The current responsive browser audit passed **33/33 checks** across six desktop/tablet/mobile and landscape viewports, with zero unexpected runtime exceptions; see `.ui-audit/investment-continuation-results.json` and `.ui-audit/continuation-investment-report.pdf`. It covers missing-source score/report gating, the read-only city scorecard and report evidence, neutral pending-zoning labels and conservative fallback copy in the explorer, and measured progressbar fill ratios matching numeric scores. Complete-assessment browser responses were synthetic and intercepted without database changes. Verified production datasets and approved numeric score mappings still need to be supplied; these tests do not authorize a production score or the disabled +10% policy modifier.

The final admin browser audit passed 29 additional checks at 280?1920 px, including phone portrait and short landscape. It verifies direct review navigation, all three editor steps, source-only score bars, map selection and saves without posted numeric criteria. See `.ui-audit/admin-final-results.json`.
