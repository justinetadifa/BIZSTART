# Local Market Intelligence: evidence and behavior

Reviewed and corrected on 18 October 2026. The panel is historical market context loaded from a local dataset, not a live PSA API or a property catchment calculation.

## Findings in the previous implementation

- The API decorated a property with `LocalMarketIntelligenceService::get()` after assessment. The service mixed hardcoded profiles with `data/demographics-psa.json`. No external dataset was queried at runtime.
- An unknown or missing barangay reused Barangay II figures under another name. The browser independently invented the same figures when API data was absent.
- The dropdown handler referenced nonexistent chart IDs and the fields `household_income` / `consumer_spending`; the markup and payload used different selectors and fields. Choosing another geography did not update the figures.
- The population donut added residents to employees without evidence that the groups were mutually exclusive. Census resident counts do not measure daytime visitors, commuting workers or commercial footfall.
- No table, source URL or calculation supported the local income medians, income brackets, spending shares, aggregate spending totals or PPP equivalents. The generic official-source footer did not establish their provenance.
- The income shares in the screenshot sum to 99.9%, which can occur with rounding. However, 42.0% lies below ₱350,000 and 56.8% below ₱600,000. A grouped-data median cannot establish ₱368,000 exactly. Assuming uniform distribution within the median bracket would yield approximately ₱485,135; that assumption was neither implemented nor disclosed.
- These demographics were not used to calculate MCE or IAI. The footer's “Economic Viability” wording also differed from the current criterion, Property Cost & Market Competitiveness (20%).

## Current records and limitations

| Indicator | Display and coverage | Evidence |
| --- | --- | --- |
| Resident population | 2020 census count within the selected administrative boundary; Barangay IV is 611 | [PSA CPH 2020 Report No. 4](https://psa.gov.ph/system/files/main-publication/1_2020%2520CPH%2520Report%2520No.%25204_26April2023_RRDH_CRD-signed.pdf), Table 3, printed pages 79–80 |
| City, province, region population | San Fernando: 125,640; La Union: 822,352; Ilocos: 5,301,139; all 2020 | [PSA 2021 Core Regional Indicators](https://rsso01.psa.gov.ph/sites/default/files/kmcd/2021%20Core%20Regional%20Indicators%20of%20Ilocos%20Region.pdf), Table 1.55, printed pages 56–58 |
| Family income | Annual **mean per family**, 2023 preliminary: La Union ₱393,220; Ilocos ₱339,690 | [La Union Ecological Profile 2024](https://launion.gov.ph/wp-content/uploads/2025/11/1-La-Union-Ecological-Profile-2024-Final.pdf#page=201), Table 111, printed page 163 / PDF page 201; underlying source PSA FIES |
| Family expenditure | Annual **mean per family**, 2023 preliminary: La Union ₱259,350; Ilocos ₱232,440 | Same Table 111; table values in thousands of pesos are multiplied by 1,000 |

The FIES figures are a labeled published snapshot, not a claim that these are the latest revised results. Do not confuse the ecological profile's publication year with the survey reference year. The monthly equivalent divides the annual mean by 12 and rounds to whole pesos for display; it is not a measured monthly statistic.

Barangay and city views explicitly use the **La Union provincial reference** for income and expenditure. They do not estimate finances for families in that barangay or city. Province and region views use the corresponding published geography. [PSA's 2023 FIES documentation](https://psada.psa.gov.ph/catalog/318) describes reliable estimates at national, regional, provincial and selected HUC levels; it does not establish barangay-level medians for this panel.

Fourteen barangay population records have been checked against the cited urban-population table. This is **partial coverage**, not a complete city barangay inventory. Unlisted barangays, including Barangay II until its row is verified, show unavailable population; their separately labeled city and provincial references remain accessible. Case, whitespace and `(Pob.)` / `(Poblacion)` suffixes are normalized. The existing `Madaydegdeg` spelling resolves to the source's `Madayegdeg`.

The service returns source, statistic, unit, year, geographic coverage and proxy status for each indicator. The browser renders unavailable states for missing data instead of chart defaults. Scope selection updates all cards and their provenance together. Market context does not enter the assessment calculation.

## Further improvements requiring additional evidence

1. Import the complete barangay census table with PSGC identifiers and validate the city/PSGC match. Update to a newer census as a separate, explicitly dated dataset after checking every imported value.
2. Replace the preliminary FIES snapshot with verified revised tables, retaining table identifiers, reference year, revision status, original units and publication provenance. Do not substitute a mean for a median.
3. Add a property catchment only with a defined radius or travel-time area, documented population allocation and uncertainty. Store residents and nonresident daytime visitors separately, with an explicit overlap adjustment if combined.
4. Estimate an addressable annual spending pool only with matched household/family counts and expenditure definitions. A model would require family count × mean annual expenditure × documented category share. Customer capture, competition and travel patterns need separate assumptions; spending potential is not a revenue forecast.

## Verification

```powershell
php tests/local-market-intelligence.test.php
node tests/local-market-intelligence.test.cjs
node tests/locus-v3-presentation.test.cjs
```

The focused checks exercise actual PHP payloads in the browser renderer, missing barangays, scope changes, source links, proxy labels, unit conversion and preservation of assessment data.

Verified results: 59 service checks, 29 service-to-browser presentation checks and 38 existing LOCUS v3 presentation checks passed. A Chrome browser check exercised all four scope selections, with no runtime exceptions or horizontal overflow at widths of 1440, 390 and 320 pixels. The local property API also returned HTTP 200 with Barangay IV's 611 residents and the explicitly marked provincial finance reference. Local browser captures and the verification harness are saved under the ignored `.ui-audit/market-intelligence/` directory.
