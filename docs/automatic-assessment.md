# Automatic assessment measurements

The active model is [LOCUS-SF assessment protocol v3](assessment-protocol-v3.md). That document defines the result contract, evidence scopes, six weights, withholding rules, historical preservation, validation commands, and remaining setup work. Older GIS conversion configurations are retained as historical records and do not define current scores.

`AutomaticPropertyAssessment` collects measurements and passes them, together with detailed stored property observations, to `PropertyAssessmentService::evaluate()`. It does not turn a utility polygon, BIR value, category permission, general business count, or two-hazard overlay into a complete detailed criterion.

New listings, material observation changes, and explicit city-staff recalculation use the server evaluator. Unrelated edits retain the original assessment JSON and metadata. Recalculation appends the previous snapshot to `legacy_assessment_json.snapshots`. Merely reading a listing never silently reassesses it.

## Local GIS source configuration

Sources are server configuration, never request parameters. The fallback `app/assessment-sources.php` starts with no layers. The production manifest retains source claims, but this change supplies no authentication records for them. A verified flag, agency name, reference string, date or computed SHA-256 alone does not establish authentication.

Prepare bounded GeoJSON inside the configured `data_directory`, defaulting to `data/assessment`. Files must be local relative paths, at most 20 MB and 20,000 features, with WGS84 longitude/latitude coordinates. URLs, wrappers, traversal paths, unsupported geometries, and invalid fingerprints are rejected. No external service is queried during measurement, preview or save.

Each layer includes its actual `file`, `source`, `reference`, `version`, `verified_by`, `verified_at`, `sha256`, `crs: EPSG:4326`, coverage polygon and declared completeness. Source-reported measurements can be retained descriptively. Authenticated evidence additionally needs the actual review record described in the v3 protocol; dataset authentication does not certify parcel observations.

| Layer | Supported data | Meaning and limits |
| --- | --- | --- |
| roads | LineString / MultiLineString | Nearest mapped centreline distance. Complete inventory and coverage of the nearest-road search circle are required. Proximity does not establish legal access, road width, passability or travel time. |
| utilities | Polygon / MultiPolygon with `utility_status` | Mapped service coverage only. Detailed connections, capacity, reliability and drainage require their own observations and applicable evidence. |
| valuation | Polygon / MultiPolygon with positive `bir_value_sqm` and `applicable_categories` | Dated BIR statutory reference, applicable to the recorded property category. Reference total uses square metres. It does not establish a market price, competitiveness or profitability score. |
| businesses | Point with `operating_status` | Operating points within the actual configured radius. Complete inventory and full-circle coverage are required for a definitive count. Partial inventories retain observed counts; absent pins do not establish absent businesses or unmet demand. |
| zoning | Polygon / MultiPolygon with recorded `zone` | District observation only. Property categories do not establish permission. The scoring protocol requires an exact proposed activity and an applicable authenticated district/activity rule. |
| hazards | Polygon / MultiPolygon with `hazard_type` and `hazard_status` | Explicit coverage for each named type. Individual findings remain partial when other types are missing. Overlapping contradictory classifications remain unresolved; flood/fault-only coverage never becomes a six-hazard score. |
| environment | Historical source configuration | Preserved as context; it is not a seventh active v3 criterion. |

Coverage must describe the surveyed/classified extent, including holes. An exact property point outside coverage remains missing. Full nearest-road and business search circles must fit in the containing coverage polygon. Adjacent MultiPolygon parts are treated conservatively; a circle crossing between parts requires reconciled merged coverage. Ambiguous overlapping service, valuation or zoning polygons remain unresolved.

Coordinates use `[longitude, latitude]`. Point distances use haversine; road-segment distances use spherical cross-track/along-track projection with endpoint distances when the projection lies outside a segment. Earth radius is 6,371,008.8 m. Coverage boundary checks follow straight GeoJSON longitude/latitude edges conservatively. Antimeridian-spanning polygon edges are unsupported.

## Detailed observations and consumers

The repository connects stored road access, passability, width and distance; electricity, water, internet and drainage arrangements; and separate sale/lease and offered-area information to the detailed rubrics. Numeric submitted totals cannot override the server result. Source authentication is not inherited by separately submitted observations.

The editor preview endpoint remains a GIS measurement preview. Saved assessments also include the detailed observations. Investor activity scenarios use the read-only `api/property-assessment.php` endpoint with the existing listing access checks. Property Details, comparison, ranking and print/PDF consume the shared contract. Use the v3 protocol document's test commands for current executed validation; earlier browser-audit counts from prior versions do not validate this version.
