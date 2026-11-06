# LOCUS-SF Property Assistant

The Property Assistant is the investor discovery interface on `investor-dashboard.php`. It uses PHP, MySQL and vanilla JavaScript. It does not use an AI model, an LLM, generated responses, or an external AI API. No provider configuration or new database migration is required.

## Search and authorization

`api/investment-assistant.php` requires an authenticated investor and uses the existing session and CSRF checks. Responses are private and uncached. `InvestmentSearchRepository` uses bound SQL predicates and hydrates through `PropertyRepository::all($investor)`, including its evidence masking, media and assessments. Publication requires approval, an active/available/open status, no deletion or archive, and the existing seller identity and authority-to-sell validation rules. Every request rechecks publication and authorization.

Filters cover the existing category/subtype catalogue, sale or lease, a maximum PHP budget with a price basis, San Fernando barangay, and land area in square metres. Stored hectares use the normal repository survey/estimated-area precedence and are converted to square metres. A missing required filter value excludes that listing. Categories and barangays use the actual system catalogue.

Sale totals and sale prices per square metre remain distinct. Rental filters specify a period and total/per-square-metre unit. Monthly and yearly rent can be normalized with an explicit explanation. No day/month conversion is guessed. Rental unit conversion requires recorded offered/leasable area; a building's land area is never substituted for floor area.

An intended business is conversation context only. No keyword proves suitability or establishes zoning permission. The assistant does not calculate a new ranking, investment return, hazard finding, availability or assessment. Existing MCE/IAI calculations are unchanged. Completed, rank-eligible stored indices and their recorded evidence/statuses are presented; incomplete or review-required values remain withheld.

## Defined conversation rules

Examples of supported messages:

- `Find a commercial lot in Biday`
- `Buy a property under PHP 5 million`
- `Lease under PHP 300 per sqm per month`
- `At least 500 sqm` or `Between 500 and 1000 sqm`
- `Only in Sevilla` to retain other filters and change location
- `No budget limit`, `All barangays`, or `Any type`
- `Lower my budget` to ask for an explicit new amount
- `Show details for property 123`
- `Amenities for the first property`
- `Price for Exact Listing Name`
- `Compare the first two`
- `Help` or `Reset`

Details resolve only to the freshly authorized result cards. A missing/ambiguous property selector asks the user to choose a shown property, without distinguishing unpublished or inaccessible IDs. A follow-up can use a property ID, ordinal, or exact listing name. Detail replies are fixed templates populated with recorded values. Specific missing amenities, such as parking, are not inferred from another recorded facility. Available price, location, area and amenities continue to be shown.

Ambiguous locations, conflicting types and invalid/unsupported ranges preserve the selected filters and ask for clarification. Unknown topics explain the supported fields and offer relevant actions. Missing details say exactly: **This information is not available in the current listing.** Zero matches say exactly: **No published properties match your current filters.** Adjustment suggestions require an explicit click and never silently broaden the search.

## State and failures

The server session retains criteria and the latest 16 messages separately per investor for two hours of inactivity. Reset clears the conversation and filters. Request version checks protect concurrent tabs; an idempotent request ID prevents duplicate accepted turns. User text is limited to 2,000 characters, request bodies to 16 KB, and the existing rate limiter allows 20 updates per investor and 80 per IP each minute.

Loading and request/database failures have their own UI and retry state. PDO query failures return HTTP 503 with `code: database_unavailable`; the last successful session state remains intact. Database errors are never represented as missing listing information or a zero-result search. The assistant writes only session state and rate counters; save/compare actions use the existing application integrations.

## Verification

Run:

```text
php tests/investment-search.test.php
php tests/investment-assistant-interpreter.test.php
php tests/investment-assistant.test.php
php tests/investment-assistant-api.test.php
php tests/property-assistant-details.test.php
php tests/find-agent.test.php
node --check assets/js/investment-assistant.js
node tests/property-assistant-browser.test.mjs
node tests/property-assistant-browser.test.mjs --mobile-only
```

The API integration test uses local Apache/MySQL and an existing active investor. Its temporary session fixture is removed after the run. Tests cover supported filters and follow-ups, ambiguous inputs, exact missing/zero responses, unsupported requests, current stored assessment presentation, authentication/authorization and error handling without creating or altering listing records.

The browser test uses the installed local Chrome and XAMPP PHP, writes screenshots/results under ignored `.ui-audit/`, and cleans up its temporary session. It checks six viewport widths, visible composer, guided searches, listing links, map, comparison, conversation persistence, Find Agent, and the catalogue route. Network and HTTP 503 failures are simulated in the browser; the repository test separately verifies a real PDO query failure propagates instead of becoming zero matches. API tests honor the production rate limit before retrying.

Find Agent is available in investor navigation at `investor-dashboard.php?view=agents`. It groups only broker contacts already disclosed on the investor's published listings, with name, property and barangay search. Private seller-profile fields are not queried. The directory has a distinct empty state when no current listing designates an eligible broker. The original property catalogue remains at `investor-dashboard.php?view=catalogue`, and saved properties retain their existing route.
