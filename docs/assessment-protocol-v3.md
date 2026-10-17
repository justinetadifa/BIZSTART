# LOCUS-SF assessment protocol v3

Implemented protocol: `locus-detailed-v3.0-provisional`. Automatic measurement adapter: `locus-observations-v3`.

The pipeline is property observations and GIS measurements → applicable evidence checks → detailed criterion rubrics → scenario eligibility → weighted IAI → comparison cohort → investor explanation and print/PDF. `PropertyAssessmentService::evaluate()` owns the result; `PropertyAssessment` is its compatibility facade. An arithmetic result is not evidence of a verified property assessment.

## Implementation map

| Files changed | Concrete behavior |
| --- | --- |
| `app/Support/PropertyAssessmentService.php`, `PropertyAssessment.php`, `AssessmentEvidence.php` | Shared versioned result, central weights and validation, evidence scopes and input fingerprints, precision, withholding and comparison cohorts |
| `app/Support/AutomaticPropertyAssessment.php`, `RiskConstraintsEngine.php`, `ZoningRulesEngine.php`, `PropertyParcel.php` | GIS measurement adapter, detailed observations, complete six-hazard states, exact activity rules and critical holds |
| `app/Repositories/PropertyRepository.php` | Snapshot preservation, detailed-input persistence, publication-aware ranking, shared hazard presentation and no read-time reassessment |
| `app/assessment-production.php`, `app/assessment-sources.php` | Historical source/approval claims distinguished from active authentication; legacy conversions inactive |
| `api/property-assessment.php`, `api/assessment-preview.php` | Read-only authorized scenarios and configured server weights for GIS preview |
| `assets/js/property-details-view.js`, `assessment-evidence.js`, `admin-assessment.js` | Consistent score/status/evidence explanations, separate subtotal, exact server scenarios and truthful print content |
| `assets/js/city-workspace.js`, `admin-overview.js`, `admin-workspace.js`, `utils.js` | Withheld and conditional cases excluded from investment ranks; comparison groups retained |
| `assets/js/investment-evaluation.js`, `investment-report.js`, `investment-policy.js` | Both investor/report routes consume the selected server scenario; incentives do not inflate IAI |
| `assets/css/property-details.css` | Evidence reports flow across printed pages without fixed-height clipping |
| `docs/automatic-assessment.md`, this document, and the tests listed below | Current protocol/setup guidance and executable calculation, GIS, persistence and presentation regressions |

## Adopted scoring protocol

The six existing database keys remain unchanged. The authoritative default weights are `PropertyAssessmentService::DEFAULT_WEIGHTS`:

| Criterion key | Weight | Selected rubric |
| --- | ---: | --- |
| `spatial_accessibility` | 20% | Legal access observation 30%, surface/passability 25%, carriageway width 25%, straight-line major-road proximity 20% |
| `infrastructure_readiness` | 20% | Electricity 35%, water 30%, internet 20%, drainage 15% |
| `economic_viability` | 20% | Existing offered-price competitiveness rubric, requiring suitable comparable evidence and compatible units |
| `nearby_businesses` | 10% | Existing commercial activity 25%, complementary establishments 30%, competitive pressure 30%, anchors 15%; authenticated benchmarked observations for the selected activity |
| `risk_constraints` | 15% | Flood 25%, active fault/ground rupture 25%, landslide 15%, storm surge 15%, liquefaction 10%, tsunami 10% |
| `zoning_compatibility` | 15% | Recorded district plus exact selected activity and applicable rule; permitted 100, conditional 70, prohibited 0 |

These are retained provisional rubrics, not newly validated scientific thresholds. No AHP, expert elicitation, profitability validation, or LGU approval is claimed. `methodology_validation` remains provisional even when a fixture or future assessment has authenticated evidence. Higher BIR values and general business counts do not independently earn criterion scores.

For eligible and sufficiently evidenced scenarios:

```text
unrounded_total = Σ(criterion_score × percentage_weight / 100)
displayed_iai   = round(unrounded_total, 1, PHP_ROUND_HALF_UP)
```

Criterion composites and contributions retain intermediate precision. Descriptive economic percentages can be rounded for presentation, but rubric comparisons use the underlying unrounded difference. Overall weights must contain exactly the six active keys, finite nonnegative numeric values, and a total within `0.000001` percentage points of 100. No missing-criterion or missing-hazard renormalization occurs. Ranking uses unrounded totals; equal displayed values need not receive equal ranks.

`physical_subtotal` excludes zoning and is accompanied by `physical_subtotal_max` derived from the configured zoning weight. It is never substituted for a final scenario IAI. The current nearby rubric includes activity-specific competition and complementary observations: changing or clearing the activity can make this subtotal incomplete too.

## Result and decision gates

The shared result records identity and activity; protocol and dataset versions/fingerprints; weights and validation; raw inputs and units; scoring rule identifiers; criterion and subcriterion scores; contributions; numerical completeness; evidence completeness and per-criterion verification; methodology validation; eligibility and outstanding conditions; hold and discrepancy reasons; unrounded and displayed totals; comparison key; and assessment timestamp.

The numeric aliases `iaiScore`, `mceScore`, `iai`, `iai_score`, and `mce_score` all represent the same displayed IAI. They remain null when withheld. MCE names the evaluation process and is not a second composite index. Statutory policy incentives do not alter IAI.

| Case | Behavior |
| --- | --- |
| Missing observations or unverified evidence | Incomplete; IAI and investment rank withheld |
| Unknown district, unselected/unrecognized activity, missing applicable rule | Incomplete; no assumed C-1 or inferred permission |
| Prohibited use under the recorded rule | `not_suitable`; IAI and rank withheld; coded rule remains explicitly unverified until authenticated |
| Conditional use with otherwise complete evidence | Explanatory conditional IAI; outstanding conditions retained; no actionable investment rank |
| Reported high/critical hazard or explicit critical constraint | Visible `technical_review_hold`; partial findings preserved; IAI and rank withheld |
| Stored criteria, compatibility totals, or recomputed total disagree | `review_required`; original snapshot retained; IAI and rank withheld |
| Older/unversioned assessment | `historical_review_required`; exact original metadata and scores retained separately; excluded from v3 rankings |

Each hazard distinguishes verified assessment, reported/unverified findings, missing coverage, not assessed, and documented not-applicable findings. A documented N/A can be recorded, but this version withholds its aggregate until an explicit protocol for its numeric treatment is validated. The code invents neither an N/A replacement score nor a clearance buffer. An `outside_buffer` finding does not match an intersection flag.

## Provenance and observation authentication

`app/assessment-production.php` retains original references, verifier names, dates, and approval assertions as historical claims. Active approval/verification flags are false; earlier asserted authentication of valuation and zoning is classified as source-reported. A locally computed file hash verifies integrity, not agency authentication. The historical two-hazard conversion rules remain configuration records and are inactive in v3.

`AssessmentEvidence` accepts authentication only with a server-maintained review record under `data/assessment/authentication`. No records authenticating production evidence are supplied by this change. Records are not created from HTTP request claims. They must be established through an actual review of supporting evidence; writing plausible metadata is not a scientific validation procedure.

A record has this structure (placeholders are deliberately unusable):

```json
{
  "decision": "authenticated",
  "evidence_sha256": "<actual evidence fingerprint>",
  "reviewed_by": "<actual responsible reviewer>",
  "reviewed_at": "<actual review date>",
  "supporting_record": "<actual supporting authentication record reference>",
  "claims": [
    {
      "scope": "criterion_observations",
      "criterion": "infrastructure_readiness",
      "input_sha256": "<AssessmentEvidence::inputHash of the exact scored raw input>"
    },
    { "scope": "zoning_district", "district": "C-1", "property_id": 123 },
    {
      "scope": "zoning_rule",
      "district": "C-1",
      "activity": "retail_convenience",
      "rule_version": "<actual selected ZoningRulesEngine::VERSION>"
    }
  ]
}
```

The corresponding evidence entry includes its source, version, SHA-256, `provenance_status: authenticated`, `authentication_record` relative filename, and the matching scope fields. Changing observed inputs invalidates the scoped review until a new recorded review binds their canonical fingerprint. A dataset review alone cannot certify separately reported parcel connections, legal access, market comparables, or business benchmarks. Zoning needs both a property-specific district record and the exact district/activity/rule-version record. A coded ordinance reference is not authentication.

GIS supplies descriptive measurements and its own source evidence. Detailed inputs supply additional observations. They feed the same protocol, but neither inherits verification from the other. Partial operating inventories retain their radius and observed count without implying that absent points mean absent businesses. Individual hazards retain their applicable evidence and coverage states.

## Persistence and consumers

`assessment_json` retains criterion copies; `automatic_assessment_json` stores the full v3 contract and observations. These existing JSON columns need no schema migration. On explicit recalculation or a material observation change, the previous assessment is appended to `legacy_assessment_json.snapshots`; older history is retained. Unrelated edits preserve historical records. Read hydration never silently replaces a withheld historical result with a fresh automatic assessment.

`GET api/property-assessment.php?id=<id>&activity=<exact activity code>` evaluates a read-only scenario from stored server observations. It calls the repository's existing `find` access checks and accepts no client scores or evidence. Details, both investor evaluation paths, comparison, ranking, and investor print/PDF consume the shared contract. Pending/failed scenario requests clear the displayed and printable IAI rather than leaving an earlier number.

Comparability requires matching protocol, weights, proposed activity, and dataset versions/fingerprints. Different cohorts are ordered separately and visibly labelled; a rank in one cohort does not establish superiority over another. Ranking queries retain publication, seller-verification and authority-to-sell restrictions. Conditional, historical, held, incomplete and discrepant results receive no actionable investment rank.

The printable brief uses the same result and reports raw inputs, units, rules, evidence states, outstanding conditions, and review reasons. Fixed-height clipping and invented default hazard findings were removed. The separate investment-report route re-reads the authorized server scenario rather than trusting stored browser scores.

## Traceable examples

`tests/locus-v3-pipeline.test.php` constructs explicitly synthetic evidence and temporary review records, then removes those records. They are not production authentication or empirical LaFinns findings.

For property `999001`, activity `retail_convenience`, district `C-1`, the synthetic observations produce spatial 100, infrastructure 100, economic 85, nearby 85, risk 100, zoning 100. Economic input is a PHP 1,150,000 sale offer for 100 m² against a synthetic suitable PHP 10,000/m² comparable: a 15% premium under the retained rubric. All six hazard observations are explicitly supplied. The contribution trail is:

```text
20 + 20 + 17 + 8.5 + 15 + 15 = 95.5
physical subtotal = 80.5 / 85
displayed IAI = 95.5
```

Changing the active-fault finding to an intersection preserves the partial findings but produces a technical-review hold and null IAI. The server, scenario renderer, comparison consumer, and printable brief are tested against the same result.

The separate historical arithmetic example `[100,100,85,85,100,85]`, ordered as spatial/infrastructure/economic/nearby/risk/zoning, with `[20,20,20,10,15,15]` yields **93.25 → 93.3**. It tests arithmetic only and does not establish a verified assessment or zoning eligibility.

## Validation and remaining work

Executed on the local PHP binary and Node, without a database connection or production mutations:

```powershell
C:\xampp\php\php.exe tests/locus-v3-pipeline.test.php
C:\xampp\php\php.exe tests/locus-v3-persistence.test.php
C:\xampp\php\php.exe tests/property-assessment.test.php
C:\xampp\php\php.exe tests/automatic-assessment.test.php
C:\xampp\php\php.exe tests/assessment-persistence.test.php
C:\xampp\php\php.exe tests/step3-infrastructure-readiness.test.php
C:\xampp\php\php.exe tests/step3-economic-viability.test.php
C:\xampp\php\php.exe tests/locus-mce-iai-authoritative-contract.test.php
node tests/locus-v3-presentation.test.cjs
```

These comprise 443 passing executable checks. A local headless Chromium check also generated complete and held synthetic PDFs, verified their values/statuses, and checked for clipped evidence content. PHP and JavaScript syntax checks cover changed source files. Generated validation artifacts are under `.ui-audit/locus-v3-*.pdf` and are not production assessments.

No live database migration, API authorization integration test, production data update, deployment, or scientific validation was executed. Older suites importing `app/bootstrap.php` can connect to and migrate/seed the configured database; they were deliberately not run against this workspace's database. For a disposable test database only, remaining integration commands include:

```powershell
C:\xampp\php\php.exe tests/locus-mce-iai-refactor.test.php
C:\xampp\php\php.exe tests/locus-mce-iai-comprehensive.test.php
C:\xampp\php\php.exe tests/step3-zoning-compatibility.test.php
C:\xampp\php\php.exe tests/step3-risk-constraints.test.php
C:\xampp\php\php.exe tests/assessment-persistence.test.php --database
```

Some of those older suites retain pre-v3 scoring expectations and need migration before they can validate the new protocol. The completed, database-free v3 suites exercise the current zoning, hazard, persistence, calculation and presentation behavior directly.

Before operational use: authenticate the actual datasets and applicable rules; obtain complete six-hazard evidence and suitable market comparables; establish documented local business benchmarks; and supply reviewed parcel observations through trusted server records. The listing editor currently previews GIS measurements, while saving also evaluates its detailed observations. A review/import UI for scoped authentication records is not included. No separate research-audit attachment was available beyond the pasted implementation request, so unresolved scientific judgments remain provisional.

If an existing `criteria_config` table is active, its active set must be exactly the six keys above, with `environmental_safety` inactive and the chosen validated numeric weight total. New saves/previews read that table; stored snapshots retain their captured weights. Review configuration in a disposable environment first. Do not bulk reinterpret existing records: reassess selected properties explicitly, preserving their prior snapshots. No migration or configuration change has been applied to production.
