# MCE weights and property intake

The MCE editor supports five weighted criteria totaling exactly 100%, with 5–60% per criterion and two decimal places. Automatic balancing preserves the edited criterion and distributes the remaining allocation proportionally within those bounds. Presets are drafts until **Apply weights** succeeds. A reason and source reference are required; zoning remains a separate eligibility gate.

Database initialization preserves an existing five-criterion allocation. Applying or restoring weights commits the configuration and audit record in one transaction. A failed write rolls back, and an editor opened against an older version cannot overwrite a newer configuration.

Property intake receives the saved configuration with the page, refreshes it whenever a property opens, and listens for successful changes and notifications from other tabs. Criterion labels, individual contributions, formulas and the review total use that allocation. If refresh fails, the form explains that its preview may be outdated. Saving always recalculates on the server with the current configuration, recording its weights and version. Existing assessment snapshots retain their original weights until recalculated. Provisional screening is never promoted into verified IAI.

The Add Property interface uses four steps, responsive field and preview panels, a current-weight summary, explicit missing-data states and persistent navigation. The MCE dialog separates editing from methodology/history disclosures and keeps validation and save actions visible.

## Verification

- `php tests/mce-live-configuration.test.php`: isolated SQLite regression for migration preservation, transactional failure, stale saves, new property normalization and historical snapshots; does not change the live database or cache.
- `node tests/mce-weights-editor.test.cjs`: production controller behavior, concurrent save protection, failed requests, stale previews, restore and 10,000 varied allocations.
- `node tests/mce-live-property-weights.test.cjs`: production property calculations with changing weights, aliases, decimal allocations and eligibility holds.
- `node tests/property-wizard-computation-parity.test.cjs`: browser/PHP calculation parity.
- `php tests/mce-modal-redesign.test.php`: modal integration and accessibility hooks.

Browser verification uses the actual rendered templates and scripts, with synthetic API responses and intercepted writes. It covers immediate changes in an open form, opening a new property, storage notifications, and desktop/tablet/mobile layouts. Additional staff and broker checks cover risk/zoning disclosures, keyboard navigation and drafts from 320 to 1536 pixels. The source assessment preview accepts the server's current `automatic_observations` mode and its previous `automatic` mode. These checks do not replace a production database smoke test.
