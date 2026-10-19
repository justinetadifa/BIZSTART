# LOCUS-SF: City Assessor’s Office (CAO) Reporting Analysis & Open Confirmation Inquiries

## 1. Executive Summary & Regulatory Audit

During the final defense of LOCUS-SF, the evaluation panel recommended reviewing the reporting requirements for the City Assessor’s Office (CAO). In compliance with the defense directives and development rules:
1. All supplied project materials, ordinances, UAT specifications (`docs/uat-audit.md`), and codebase services were examined.
2. **Finding:** No formal, accepted statutory report layout, municipal assessor certificate format, or executive order specification exists in the provided repository materials for an exclusive CAO-specific report. UAT test items `CAO-01` through `CAO-10` define operational capabilities (secure login, boundary plotting, area calculation, BIR zonal value capture, geohazard warnings, search responsiveness) rather than a rigid export document layout.
3. In accordance with working instructions, **we do not invent an unapproved mandatory CAO report** or misrepresent draft layouts as accepted by the City Assessor.
4. Instead, we have enhanced the existing authoritative reporting engine (`investorBriefReportMarkup` in `assets/js/property-details-view.js` and `reports.php`) to fully support all essential CAO and LEBDO data fields, while formally documenting the precise questions requiring City Assessor and CPDO stakeholder confirmation.

---

## 2. Inventory of Current Reporting Capabilities in LOCUS-SF

LOCUS-SF currently implements a high-fidelity, print-optimized multi-page reporting pipeline:

| Report Section | Implemented Content | Access & Privacy Controls |
| :--- | :--- | :--- |
| **Page 1: Property Profile & Identification** | Unique property reference (`LOCUS-SF-PRP-...`), barangay, city, WGS 84 coordinates, surveyed land area (m² and ha), boundary polygon/pin status, listing purpose (sale/lease), seller commercial asking terms clearly separated from government valuation benchmarks. | Public / Investor safe. Private PRC images and reviewer identity notes are strictly omitted. |
| **Page 2: Investment Assessment (MCE & IAI)** | Criterion scores, configured weights (Spatial 25%, Infra 25%, Cost 20%, Nearby 15%, Risk 15%), unrounded arithmetic total, displayed IAI, status badges (`IAI Released`, `Provisional · Review Pending`, or `Not Suitable`), calculation formula, MCE configuration version identifier (`MCE-CFG-...` or baseline). | Uncalculated or discrepant scores show clear `Pending` state. No false release without authoritative evaluation. |
| **Page 3: Zoning Findings & Geohazard Screening** | CLUP zoning classification, proposed business/land-use activity, authoritative land-use clearance outcome (Permitted by right, Conditional use with listed conditions, or Prohibited under City Ordinance 2018-06), 6-factor hazard screening register (Flood, Fault, Landslide, Storm Surge, Liquefaction, Tsunami) with sources, weights, and explicit unassessed coverage warnings. | Raw GIS outline and coordinates shown. Boundaries marked as location references requiring independent cadastral survey. |
| **Page 4: Local Context & Screening Suggestions** | Up to 3 supported business or land-use suggestions within 500m straight-line radius, nearest anchor context, competitor availability notice (treating empty directory as unavailable information, not proof of zero competition), practical due diligence checklist, accredited broker public contact info. | Accredited broker name, email, phone displayed. PRC ID photos, national IDs, and reviewer authorization records remain restricted and hidden. |
| **Page 5: Evidence Audit Appendix (Optional)** | Machine-readable JSON payloads, scoring rubric versions, and recorded observations for each criterion. | Technical administrative review. |

---

## 3. Mandatory Inclusions Implemented in Enhanced Reports

To satisfy defense recommendations, the following elements are verified in all export and print views:
- **Property reference and listing information**: Reference ID, listing purpose (Sale, Lease, Both), availability status.
- **Location and area with units**: Standardized coordinates (WGS 84), barangay, city, land area in square meters and hectares, survey basis (Recorded survey vs. Mapped estimate).
- **Asking terms and valuation references clearly distinguished**: Commercial asking price/rent is explicitly labeled as *seller-reported*, and statutory BIR Zonal Valuation is presented as a *tax baseline floor* rather than an appraisal or guarantee of market value.
- **Zoning findings and assessment status**: Zoning outcome mapped to City Ordinance 2018-06 (Permitted by right, Conditional with standards, Prohibited, or Unverified).
- **Available hazard findings and missing information**: All six hazard factors shown; missing observations clearly noted as "Unassessed does not mean low risk."
- **Criterion scores, weights, contributions, and IAI status**: Full tabular breakdown with points contribution formula and status pill.
- **Configuration version and assessment date**: Explicit version string (e.g. `MCE-CFG-20261020-001`), validation status (`Provisional / Subject to LGU validation`), and recorded timestamp.
- **Source references and outstanding requirements**: Full dataset citations with provenance and missing requirement checklist.
- **Privacy preservation**: Protected PRC licenses and reviewer credentials are never exposed in generated output.

---

## 4. Specific Questions Requiring CAO / City Stakeholder Confirmation

Before an official "City Assessor's Office Report" module is finalized as a statutory document, the following items require formal confirmation by the CAO, CPDO, and LEBDO teams:

### Question 1: Official Purpose and Target Audience of the CAO Export
- *Issue:* Is the desired CAO report intended for:
  - (a) An internal inter-office appraisal brief for City Assessor personnel comparing seller asking prices to the local Schedule of Fair Market Values (SMV)?
  - (b) A public property clearance brief certifying real property tax (RPT) standing and zonal classifications for prospective buyers?
  - (c) A joint technical brief combining CPDO zoning clearance, Assessor valuation data, and LEBDO business matching?

### Question 2: Statutory Valuation References & Units
- *Issue:* Currently, the system accepts both seller asking prices and BIR Zonal Values (PHP/m²).
  - Does the CAO require the incorporation of the local LGU Schedule of Fair Market Values (SFMV per San Fernando Tax Ordinance) alongside or in place of national BIR zonal valuation?
  - Should the system compute an estimated Annual Real Property Tax (RPT / SEF) based on current assessment levels (e.g., 20% residential, 50% commercial)?

### Question 3: Cadastral Identifiers & Title Validation
- *Issue:* Property records currently store lot reference IDs, WGS 84 coordinates, and optional polygon outlines.
  - Does the CAO require mandatory entry and display of Cadastral Lot Number, Cadastral Survey Number (e.g. Cad-539-D), and Transfer Certificate of Title (TCT/OCT) Number before an official CAO brief can be exported?

### Question 4: Signatories, Seals, and Authentication Status
- *Issue:* What formal signatories and certifications should be affixed to the export?
  - Should the document carry an official statement such as *"Certified Location and Assessment Intelligence Brief"* with digital signature blocks for the City Assessor, City Planning & Development Coordinator (CPDO), and Local Economic Development Officer (LEBDO)?
  - Or should it carry a prominent disclaimer stating *"This brief is an exploratory screening summary generated by LOCUS-SF and does not replace an official Tax Declaration or Locational Clearance"*?

### Question 5: Retention and Historical Valuation Versioning
- *Issue:* When the City Assessor updates the city-wide property assessment schedule (triennial general revision under the Local Government Code):
  - How long should previous valuation snapshots remain active for historical audit?
  - Should historical printouts display a "superseded valuation schedule" watermark when a newer city valuation schedule is adopted?

---

## 5. Next Steps for Municipal Deployment

1. Present this analysis and the enhanced 4-page/5-page investment brief to the City Assessor's Office during post-defense stakeholder turn-over.
2. Retain the current high-fidelity, privacy-preserving print layout as the operational baseline.
3. If the CAO issues an official ordinance or memorandum circular prescribing a specialized Tax Declaration annex format, implement that specific layout without altering the core assessment or zoning engines.
