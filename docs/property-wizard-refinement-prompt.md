# Property wizard refinement brief

Improve the existing LOCUS-SF five-step property wizard in this repository. Implement and verify the changes; preserve current uncommitted work, role permissions, listing review rules, local drafts, evidence attachments, and server validation.

Prioritize Step 2, Area & location. Reproduce the reported failure: an existing pin prevents a barangay search such as Calabugao from moving the map to the selected barangay. Identify and fix the underlying search, map, and coordinate state problems.

Requirements:

- Exact barangay names and common prefixes (Barangay, Baranggay, Brgy) must navigate to the correct local reference. Partial or ambiguous names must offer explicit choices. Local barangay search must work without a geocoding API key.
- Searching an area must always move the map, including with an existing pin. Keep the property coordinates unchanged until the user places or drags a pin, enters coordinates, or explicitly uses map center or device location. Label barangay and geocoder references as approximate; do not invent official boundaries or surveyed coordinates.
- Parse WGS84 decimal and DMS coordinate pairs correctly, including detectable axis reversal and signed hemispheres. Reject invalid ranges, incomplete pairs, contradictory directions, and invalid minutes/seconds. Keep map pin, coordinate inputs, draft, review, and submitted values consistent.
- Provide coordinate-pair entry with Apply, Clear pin, Recenter, and device location with reported accuracy. Prevent stale search or location responses from overwriting newer choices or reopened drafts. Preserve area-only, location-only, and drawn-boundary workflows.
- Refine all five steps with a coherent burgundy visual identity, readable typography, purposeful spacing, compact persistent navigation, a prominent location map, and clear status feedback. Keep controls accessible by keyboard and usable at desktop, 390 px, and 320 px. Explain location actions in plain language.
- Preserve honest assessment states: unavailable map data, unknown evidence, and pending scores must remain explicit. Keep recorded area separate from boundary estimates.
- Simplify the default view to essential inputs; make photos, additional classifications, supporting records, and detailed scores expandable. Keep clear review/edit actions and avoid duplicate save controls or repeating the same information in several cards.
- Use the server's full property catalog for every classification control and submission. Restore the category before its options and selected subtype. Keep the primary choice first; exclude incompatible additional tags and require correction of invalid historical pairs.
- Preserve physical area when switching units. Use entered parcel area consistently for preview, review, asking price per square meter, and verified valuation totals. Guard unsupported ranges, non-finite numbers, invalid price notation, and multiplication overflow. Never silently turn a malformed price into a different valid amount.
- Verify business density with exact coordinates, a 500-meter radius, unique business records, and count / π(radius in kilometers)². Exclude closed businesses and civic/road records from the business denominator, preserve unknown status, and distinguish observed counts from complete inventory. Refilter cache results to the requested reference and radius. Changing the property pin must refresh the scan.
- Make draft status truthful, preserve supported files locally, keep the editor open when storage fails, and remove the draft after successful submission without recreating it on close. Restore files only if no newer selection has been made.

Verify the real production code with targeted coordinate and search regressions, isolated persistence checks, and browser QA for both city and broker forms. Check pin preservation during barangay search, ambiguous results, decimal/reversed/DMS input, invalid coordinates, map clicks and dragging, device accuracy and denied access, drawing/editing/reset, draft restoration, and all five steps on small screens. Do not create or publish real listings during QA.

Report the root cause, implemented changes, checks that passed, and any remaining accuracy or provider limitations. Include the relevant files and a current interface preview.
