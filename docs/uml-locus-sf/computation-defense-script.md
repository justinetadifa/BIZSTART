# LOCUS-SF computation explanation and defense script

Use the read-aloud script for a panel question such as, "How does the computation work in your system?" The examples and follow-up answers below are preparation notes.

This explanation follows the current five-criterion defaults in `PropertyAssessmentService.php`: 25%, 25%, 20%, 15%, and 15%, with zoning as a separate eligibility gate. Older repository documents describe a six-criterion model. Server configuration and saved assessments can retain different weights, so check the calculation breakdown of the property used in your demonstration before quoting these defaults. The examples below are hypothetical, not findings about a real property.

## Read-aloud script: approximately three minutes

"Our system, LOCUS-SF, uses Multi-Criteria Evaluation, or MCE, to evaluate a property's suitability for a proposed business activity. The result is called the Investment Attractiveness Index, or IAI, expressed on a scale of zero to one hundred.

"The computation begins with property information, such as its location, road access, utility conditions, offered price, surrounding businesses, and hazard findings. The system uses recorded observations and available geographic measurements, and checks the supporting evidence.

"Before a result can qualify for investment ranking, the system checks whether the proposed business activity is compatible with the property's recorded zoning classification. A prohibited activity receives no final IAI or investment rank. A conditional activity can receive an advisory result when the other requirements are complete, but its conditions remain outstanding and it receives no investment rank. If zoning is undetermined, the final result remains pending.

"For the current default model, we evaluate five criteria. Spatial Accessibility has a weight of twenty-five percent. Infrastructure Readiness also has twenty-five percent. Property Cost and Market Competitiveness has twenty percent. Nearby Businesses and Risk Constraints each have fifteen percent. These weights total one hundred percent. Zoning is checked separately and adds no points to this five-criterion score.

"Each criterion is scored from zero to one hundred using its scoring rules. For example, accessibility considers road access, road surface and passability, usable road width, and distance to a major road. These observations have their own internal weights, which produce the accessibility score.

"We then multiply each criterion score by its percentage weight divided by one hundred, and add the five contributions. For example, an accessibility score of ninety contributes twenty-two point five points because ninety multiplied by twenty-five percent equals twenty-two point five.

"Using example scores of ninety for accessibility, eighty for infrastructure, seventy-five for property cost, seventy for nearby businesses, and eighty-five for risk constraints, the total is eighty point seven five. The system rounds the final total once to one decimal place, giving an IAI of eighty point eight out of one hundred.

"A complete calculation also needs sufficient verified evidence and must pass the applicable review checks before its IAI can be released. A provisional score may appear while review is pending, with its status and reasons displayed.

"The result helps investors compare properties under the same assessment conditions. Its meaning depends on the recorded evidence and scoring model. Our weights and scoring thresholds remain provisional and subject to expert and local government validation."

## Worked example to show while speaking

```text
Criterion contribution = criterion score x weight / 100

IAI = (SA x 0.25) + (IR x 0.25) + (PCMC x 0.20)
    + (NB x 0.15) + (RC x 0.15)
```

| Criterion | Example score / 100 | Default weight | Contribution |
| --- | ---: | ---: | ---: |
| Spatial Accessibility (SA) | 90 | 25% | 22.50 |
| Infrastructure Readiness (IR) | 80 | 25% | 20.00 |
| Property Cost and Market Competitiveness (PCMC) | 75 | 20% | 15.00 |
| Nearby Businesses (NB) | 70 | 15% | 10.50 |
| Risk Constraints (RC) | 85 | 15% | 12.75 |
| **Total** | | **100%** | **80.75** |

**Displayed IAI: 80.8 / 100**, assuming the applicable eligibility, evidence and review checks pass. Higher risk-constraint scores represent more favorable hazard conditions under the rubric.

## Follow-up answers

### "Where do the scores come from?"

"The scores come from defined rubrics applied to recorded observations. Measurements such as distance or width are assigned scores using scoring bands. Observations such as electricity availability are matched to defined service conditions. The system then combines the subcriteria using their internal weights."

| Criterion | Internal calculation in the current rubric |
| --- | --- |
| Spatial Accessibility | Road access 30% + surface/passability 25% + usable carriageway width 25% + major-road proximity 20% |
| Infrastructure Readiness | Electricity 35% + water 30% + internet 20% + drainage 15% |
| Property Cost and Market Competitiveness | Offered unit price compared with a suitable documented local market benchmark; percentage difference selects a scoring band |
| Nearby Businesses | Commercial activity 25% + complementary businesses 30% + competitive pressure 30% + activity anchors 15%, requiring suitable benchmarked observations |
| Risk Constraints | Flood 25% + active fault 25% + landslide 15% + storm surge 15% + liquefaction 10% + tsunami 10% |

These are weights **within** each criterion. Apply the criterion's overall weight afterward.

For an accessibility example, direct road frontage scores 100, paved all-weather access scores 100, a five-meter carriageway scores 80, and a major-road distance of 300 meters scores 85:

```text
Accessibility = (100 x 0.30) + (100 x 0.25)
              + (80 x 0.25) + (85 x 0.20)
              = 92 / 100

Contribution to IAI = 92 x 0.25 = 23 points
```

### "Why did you choose those weights? Were they derived using AHP?"

"The current implementation uses provisional configured weights. Accessibility and infrastructure receive the largest shares, followed by property cost, then nearby businesses and risk constraints. We still need documented expert review and validation to establish whether those allocations are appropriate locally. We do not claim that the weights were derived through AHP or formally approved by the local government."

### "Why does zoning have zero weight?"

"Zoning controls eligibility. It is checked separately so that strong scores for price, accessibility, or utilities cannot override a prohibited use. A zero numerical weight still leaves zoning as a mandatory requirement for releasing and ranking an eligible result."

### "What happens if some data is missing?"

"The system retains the available findings and identifies the missing requirements. It withholds the released IAI and investment rank when required information or verified evidence is incomplete. It does not redistribute a missing criterion's weight to the others. If all five consistent ratings are available, the interface may show a clearly labeled provisional IAI while review remains pending."

Missing information is different from a documented adverse condition. An unknown utility condition has no established score; a recorded absence of supply can have a defined low score.

### "How does the property-cost calculation work?"

"The system converts the offered price to a consistent unit and compares it with suitable local market evidence. For a sale, the asking price per square meter is the total asking price divided by the offered area. For a lease, the comparison uses a monthly rate per square meter with compatible rental terms."

```text
Sale asking price per m2 = total asking price / offered area in m2

Difference (%) = ((asking unit price - comparable unit price)
                / comparable unit price) x 100
```

For example, a PHP 1,150,000 offer for 100 m2 equals PHP 11,500/m2. Against a suitable PHP 10,000/m2 comparable, the offer is 15% higher. The current rubric assigns a score of 85, contributing `85 x 0.20 = 17` IAI points. This is a separate example from the main table's hypothetical cost score of 75.

"BIR zonal values are retained as statutory valuation references. A market-competitiveness assessment requires suitable comparable market evidence. Business profitability would need a separate financial analysis using revenue, operating costs, and investment assumptions."

### "Does the number of nearby establishments automatically determine the score?"

"A nearby count is a geographic observation. The criterion also considers complementary businesses, competitive pressure, and activity anchors using applicable benchmarks. A partial inventory shows observed establishments; it cannot establish that no other businesses exist. The selected activity matters because an establishment can support one business type and compete with another."

### "How are locations, boundaries, and distances computed?"

"The system uses geographic coordinates for spatial measurements. Its point-to-point distance calculation uses the Haversine formula, and road proximity uses the mapped road geometry. A drawn property's area is estimated from its geographic polygon. One hectare equals ten thousand square meters. The drawn area remains an estimate for comparison with the recorded survey area."

Road proximity is a geographic distance measurement. Legal access, road width, passability and travel time require their own applicable observations.

### "How are properties ranked?"

"Eligible complete properties are grouped by matching methodology, weights, proposed activity, and dataset versions or fingerprints. Within a group, the system ranks them from the highest unrounded total to the lowest. The display is rounded to one decimal place, so two properties showing the same displayed score can still have different ranks. Conditional, incomplete, prohibited, and review-held assessments receive no actionable investment rank."

### "How do you know the computation is reliable?"

"We can trace the calculation from the recorded inputs through the scoring rules, internal weights, criterion scores, and final contributions. The server evaluator supplies the shared assessment result used by the views and reports. Arithmetic checks establish whether the implementation follows its formula. Establishing the quality of the assessment also requires verified evidence and validation of the methodology."

## Thirty-second fallback

"LOCUS-SF checks zoning eligibility, then uses a weighted evaluation of five criteria: accessibility, infrastructure, property cost, nearby businesses, and risk constraints. Their default weights are twenty-five, twenty-five, twenty, fifteen, and fifteen percent. Each criterion receives a score out of one hundred. We multiply each score by its weight, add the contributions, and round the final total to one decimal place to obtain the Investment Attractiveness Index. Evidence completeness and review checks control release and ranking."

## Implementation references and example verification

- [Shared evaluator, default weights, scoring rules and ranking](../../app/Support/PropertyAssessmentService.php)
- [Automatic geographic measurements and observation adapter](../../app/Support/AutomaticPropertyAssessment.php)
- [Zoning eligibility engine](../../app/Support/ZoningRulesEngine.php)
- [Six-hazard scoring and review checks](../../app/Support/RiskConstraintsEngine.php)
- [Polygon area and recorded parcel observations](../../app/Support/PropertyParcel.php)
- [Provisional/released score presentation and printable breakdown](../../assets/js/property-details-view.js)
- [Five-criterion methodology reference](../locus-sf-methodology-v3-final.md)

The main 80.8 example, the accessibility result of 92 with a 23-point contribution, the property-cost result of 85 with a 17-point contribution, and four synthetic zoning outcomes were checked directly against the PHP evaluator. Those checks used synthetic inputs without a database connection and do not authenticate production evidence. The explanation documents current code defaults; a live deployment's database configuration was not inspected.
