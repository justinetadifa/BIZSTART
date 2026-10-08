# Batch A: listing purpose, prices and listing management

Implemented October 8, 2026. Broker application, email/reviewer changes (Batch B) and Basic/Advanced/design changes (Batch C) are deferred.

## Listing entry and presentation

City and broker forms collect **For Sale**, **For Lease**, or **For Sale or Lease** independently of property category and availability. Sale price is a total PHP amount. Lease price is a separate PHP amount with a daily, monthly or yearly period and either a total-property or per-m² unit. Amounts use nonnegative whole pesos, consistent with existing sale-price storage. Blank asking prices remain SQL `NULL`; malformed, negative and fractional amounts are rejected on the server.

Cards, details, map popups, comparison, reports and KML/KMZ exports show **Price on request** for missing asking prices. Sale-price sorting puts unknown/inapplicable purchase prices last in both directions. Recurring rents are not compared as purchase capital. Acquisition estimates and financial decision scores remain unavailable when applicable pricing is missing; approved MCE/IAI criteria and formulas are unchanged. BIR/assessed valuations remain separate and are no longer synthesized from the asking price.

Legacy zero prices remain zero and display as `PHP 0` rather than being silently reclassified. The local inspection found one record requiring owner review: **ID 66, Sevilla SFC**. Confirm whether zero is intentional or means unknown before correcting it through the normal editor.

## Management and permissions

The property desk provides **Latest Listings**, **Active Listings**, **Sold Listings**, **Leased Listings**, **Archived Listings**, and **Deleted Listings**. Latest orders by creation date; it is not a lifecycle status. Active contains approved, available, unarchived, undeleted listings. Sold and Leased are separate availability states and cannot appear in the public catalogue. Historical `Availed` records are retained without guessing which transaction occurred; new transactions must use Sold or Leased.

Recognized city listing-management departments can change availability, archive/unarchive, soft-delete and restore. Verified brokers can archive/unarchive their own listings; ordinary broker edits still return to review. The server rejects unauthorized management actions, ownership mismatches and attempts to inject lifecycle metadata. Existing listing-review responsibilities are unchanged in Batch A.

Archive and deletion retain the record, evidence, related records and audit history. Their restoration clears only the corresponding lifecycle metadata and preserves availability and review state. A deleted archive remains archived after restoration. Newly archived records retain the prior review decision. Historical records using `approval_state = archived` did not retain their prior review state, so explicit unarchive returns those to `pending_review`. Restoration never changes a Sold/Leased property to Available.

## Database upgrade

The targeted CLI migration inspects existing zero prices before applying additive changes. It avoids application bootstrap, demo seeding and unrelated migrations:

```powershell
php database/migrate-listing-batch-a.php --dry-run
php database/migrate-listing-batch-a.php --apply
```

Changes to `properties`: add `listing_purpose` (legacy default `sale`), nullable `lease_price`, `lease_period`, `lease_price_unit`, `archived_at`, `archived_by_user_id` and an archive index; allow `NULL` in `price`; widen `price_per_sqm` to nullable `BIGINT`. Existing prices, availability, review states and assessments are preserved. Fresh-install schemas and the normal idempotent SchemaManager include these changes. Legacy `price` remains the sale amount; API `salePrice` aliases it.

The migration has been applied to the configured local database. A fingerprint comparison verified that all existing fields of its 16 listings were unchanged by the targeted migration. Other deployments must run the migration before using the updated application if automatic migrations are disabled. No new credentials or environment settings are required.

## Verification

Completed checks:

- Real MySQL lifecycle and parcel integration tests in disposable databases: nullable prices, partial edits, separate statuses, public visibility, permission failures, ownership, archive/delete restoration, audit events, and repeated migration preservation.
- PHP pricing/KML/KMZ tests and JavaScript pricing tests: missing versus explicit zero, dual prices, rental units, unknown-last sorting, and missing acquisition estimates.
- Existing assessment and details regression tests: approved MCE/IAI results and formulas, missing evidence, private evidence, and printed disclosures.
- Isolated Chrome checks at 1440px and 390px: six listing views, creation sort, forms, blank/invalid amounts, purpose switching, multipart submission, CSRF headers and lifecycle controls. All API requests were intercepted; server behavior was checked separately with MySQL tests. No runtime errors or horizontal overflow were found.
- PHP/JavaScript syntax checks and Git whitespace checks.

Run the tracked checks from the repository root:

```powershell
php tests/property-lifecycle.test.php --integration
php tests/parcel-wizard.test.php --integration
php tests/batch-a-prices.test.php
php tests/security/verify-listing-workflow.php
php tests/api-security.test.php
php tests/property-evidence.test.php
php tests/property-assessment.test.php
php tests/automatic-assessment.test.php
php tests/assessment-persistence.test.php
node tests/listing-prices.test.cjs
node tests/property-details.test.cjs
node tests/automatic-assessment-ui.test.cjs
```

These are automated development checks, not a claim that user acceptance testing has passed. The legacy zero-price record still needs human review. No missing credentials or assets block Batch A.
