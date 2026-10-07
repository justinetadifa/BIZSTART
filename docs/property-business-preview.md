# Property business preview

`GET api/property-business-preview.php` is a read-only preview for city staff. It accepts the same scalar inputs as the automatic assessment preview: `lat`, `lng`, `category`, optional `subcategory`, `land_area`, and `land_area_unit` (`sqm` or `hectares`). It calculates the automatic assessment on the server. Client scores, profile rules, approval decisions and source metadata are ignored.

The shipped `app/business-assessment-profiles.php` contains no approved profiles. The response therefore has `status: "pending"`, `matches: []`, a useful message, `pendingReasons`, seven `weights`, and `missingCriteria` entries containing `key`, `label`, and `nextAction`. Missing evidence never receives a default rating. A real zero is a valid score.

Business-specific scoring is a proposed extension. Its approval is separate from approval of the automatic property assessment method. Do not copy the illustrative screenshot scores into this configuration. The existing five-pillar `business-match.php` endpoint is unchanged and is not the source of this preview.

## Configuration contract

To enable profiles, trusted server configuration must set `approved: true` and provide nonempty `version`, `approval_reference`, `method_reference`, `source_reference`, and `score_scale_reference`. The latter documents why all business profile ratings on the 0–100 scale are comparable. `weights` must contain exactly the seven existing keys and values: spatial accessibility 20, infrastructure readiness 20, economic viability 20, nearby businesses 10, zoning compatibility 15, risk constraints 10, and environmental safety 5.

Each item in `profiles` needs:

- A unique lowercase `id`, `label`, `approval_reference`, `source_reference`, and `eligibility_reference`.
- `eligibility.categories`: a nonempty list of recognized property categories.
- `eligibility.zoning_classifications`: a nonempty list of authoritative zoning classification values approved for the modeled business use.
- `eligibility.zoning_statuses`: a nonempty list drawn from `permitted` and `conditional`. A prohibited category is always excluded. Conditional categories retain an explicit clearance concern.
- Positive `eligibility.minimum_area_ha` and `eligibility.maximum_area_ha`, with the maximum at least the minimum.
- `criteria_rules`: exactly the seven criterion keys. Every rule specifies `operator: "bands"`, a nonempty documented `reference`, and a nonempty ordered `bands` list.
- Every band specifies an inclusive `max` input rating, an output `rating`, a factual supporting `reason`, and a string `concern` (which can be empty). Input limits and output ratings must be finite numbers from 0 to 100. Limits increase strictly, and the last limit must be 100 so every possible automatic rating has an explicit conversion. No implicit otherwise rule exists.

Band inputs are the server-calculated automatic criterion scores, not staff observations or asking prices. The first band whose inclusive limit covers that score supplies the business-specific rating. Approval documentation must explain and validate each such conversion. One malformed profile keeps the entire comparison pending; it cannot silently disappear and leave a misleading partial ranking.

## Result contract

All seven automatic criteria must be complete before ranking. Category, area, verified zoning classification and category permission must meet each profile's documented model checks. Failed checks exclude that profile. Scores are `sum(rating * weight) / 100`, rounded to one decimal. These are **business fit scores**, not the property's IAI. At most three eligible options are returned; fewer are returned when fewer qualify, and `no_eligible_matches` reports an empty eligible set.

Each match contains `id`, `label`, `rank`, `score`, `criteria`, `reasons`, `concerns`, and profile metadata. Criterion rows contain `key`, `label`, `rating`, `weight`, `contribution`, `inputRating`, `ruleReference`, and the source `evidence`. Response metadata records the profile method/version/approval/source references and the automatic assessment version, rule version and generation time.

Model checks are decision support. They do not establish business permits, actual customer demand, legal road access or parcel-wide hazard clearance. The existing automatic assessment uses point evidence; boundary hazard review remains a separate requirement.

Run `php tests/property-business-profiles.test.php` for database-free approval, evidence, mapping, eligibility and ranking checks. All approved test profiles are synthetic in-memory fixtures and are never installed as city configuration.
