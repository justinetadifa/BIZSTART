# Batch C: investor views and presentation

Batch C adds Basic and Advanced views to the public property preview and investor catalog, saved listings, priority board, map explorer, comparison, and property details. It requires no database migration, new credentials, or assessment recalculation. Batch A and B setup instructions still apply independently.

## View preference and accessibility

First use starts in Basic. The preference is stored per installation and account in browser local storage, with session storage as a fallback. If both are blocked, the buttons still work on the current page. This browser preference does not change a listing or another user's settings. Staff retain their full assessment tools.

The control uses native buttons with an announced pressed state and visible keyboard focus. Tab and Enter work normally; arrow keys, Home, and End also select a view. Hiding a focused Advanced section returns focus to the Basic button. Switching from assessment sorting to Basic selects Newest and announces the change. Advanced preserves an existing factual sort. Recorded scientific ranks retain their original values when results are filtered.

## Property information

Basic prioritizes the title, photo, availability, separate sale/lease prices, land area, recorded address, map, and existing contact action. Missing prices remain **Price on request**. Valid approximate coordinates appear on the map with an explicit label; properties without valid coordinates explain that a map location is missing.

Recorded hazard and environmental classifications, incomplete screening notices, and missing classifications remain visible in both views. Suitability scores are never converted into hazard findings or safety assurances.

Advanced reveals recorded MCE/IAI results, criteria, weights, calculation breakdowns, evidence, sources, business context, and limitations through expandable sections. The radar displays the seven recorded ratings; missing ratings are not plotted as zero. The approved server assessment model is unchanged. Basic map pins and clusters emphasize prices and listing counts; Advanced adds recorded assessment tiers and business context.

Printable calculation sheets remain complete regardless of the selected screen view. The view control and decorative background are omitted from print.

## Shared design

The shared page shell reuses `assets/images/mapgraphicstyle.png` in a decorative background layer at 12% opacity. Only that layer is translucent. Content panels, forms, interactive maps, charts, and private document images remain opaque and interactive. Property details use white panels, navy typography, amber accents, responsive spacing, and a visible contact panel.

## Verification

Run the focused checks from the repository root:

```powershell
node tests/investor-view.test.cjs
node tests/investor-surfaces.test.cjs
node tests/property-details.test.cjs
node tests/listing-prices.test.cjs
node tests/automatic-assessment-ui.test.cjs
node tests/investment-policy.test.cjs
C:\xampp\php\php.exe tests/automatic-assessment.test.php
C:\xampp\php\php.exe tests/property-assessment.test.php
npm.cmd run build:css
```

Browser verification passed at 1440px, 390px and 320px using PHP-rendered pages and local synthetic API responses, with external fonts and map tile requests blocked. It checked view persistence, keyboard toggles and disclosures, inquiry navigation and focus, three selected comparison properties, hazard visibility, approximate and missing locations, assessment disclosure, complete print calculations, and opaque broker forms and ID previews. No database, account or email changes were made by the browser harness. These checks do not constitute user acceptance testing or verify external map service availability.
