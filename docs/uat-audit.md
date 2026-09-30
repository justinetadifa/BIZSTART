# LOCUS-SF Acceptance-Readiness Audit Report

**Document Date:** October 1, 2026  
**Auditor:** Antigravity Autonomous Audit Agent  
**Environment:** Localhost XAMPP (Apache 2.4.58 / PHP 8.0.30 / MySQL / Leaflet 1.9.4)  
**Database:** `sfcelerate_bizstart_local_20260922_100254`  
**Reference Documents:**  
1. *LOCUS-SF UAT Questionnaire.docx* (City Assessor's Office, Local Economic and Business Development Office, City Information and Communications Technology Office)  
2. *LOCUS-SF Manuscript* (Tadifa, Dizon, Estilong, April 2026, DMMMSU-MLUC CIT)  
3. LOCUS-SF Repository Implementation (`c:\xampp\htdocs\sfcelerate-bizstart`)

---

## Executive Summary & Scorecard

An evidence-based acceptance-readiness audit of **LOCUS-SF** was executed against all 30 criteria defined in the authoritative *LOCUS-SF UAT Questionnaire.docx* and aligned with the approved thesis manuscript. Testing incorporated source code tracing, database schema analysis, local HTTP API execution with session cookies, and performance benchmarking.

### Outcome Summary

| Outcome Category | Count | Percentage of Total Criteria |
| :--- | :---: | :---: |
| **PASS** | **10** | 33.3% |
| **PARTIAL** | **12** | 40.0% |
| **FAIL** | **8** | 26.7% |
| **BLOCKED** | **0** | 0.0% |
| **NOT TESTED** | **0** | 0.0% |
| **Total Criteria Evaluated** | **30** | **100.0%** |
| *Specification Gaps Identified* | *2* | *(Documented within CAO-06 & CICTO-04)* |

> [!CAUTION]
> **UAT Readiness Verdict: NOT READY FOR FORMAL UAT.**  
> While the platform exhibits fast response times (<310ms), clean session security, responsive presentation, and a sophisticated CLUP compliance engine, **critical core requirements specified for LGU stakeholder offices are completely missing or fundamentally divergent**:
> 1. **Role Architecture Divergence:** The system implements only `admin`, `seller`, and `investor` roles. The designated LGU offices (**CAO**, **LEBDO**, **CICTO**) have no corresponding roles or administrative account creation/assignment interface (CICTO-02, CAO-01, LEBDO-01).
> 2. **Property Encoding Deficits:** Property creation lacks an interactive map, pin dropping, and polygon boundary drawing. Land area is manually typed rather than computed from plotted boundaries (CAO-03, CAO-04).
> 3. **Missing Analytical & Spatial Tools:** The 500-meter radar tool for nearby roads/competitors (LEBDO-05) and surrounding-area top-3 business matching (LEBDO-06) are completely absent.
> 4. **Missing Hazard Warning System:** No spatial layers or proximity warnings exist for flood zones or fault lines (CAO-06).
> 5. **Omission of BIR Zonal Value:** BIR zonal values are neither captured nor displayed; only total asking price is entered (CAO-05).

---

## 30-Item Acceptance Criteria Matrix

| ID | Office | Category | Authoritative Questionnaire Requirement | Outcome | Primary Deficiency / Note |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **CAO-01** | CAO | Login | *The user can successfully log in using a valid username and password.* | **PARTIAL** | Login works for generic admin, but dedicated CAO role/office credentials do not exist in schema. |
| **CAO-02** | CAO | Profile Management | *The user can easily edit and update their account profile details.* | **FAIL** | General account profile management (name, email, password) is not implemented for admin/CAO. |
| **CAO-03** | CAO | Map Navigation | *The user can easily navigate the map and drop a pin to add a new property.* | **FAIL** | No map or pin-dropping tool exists in property encoding modal; uses hardcoded corridor fallbacks. |
| **CAO-04** | CAO | Area Calculation | *The system automatically computes the land area size when the user plots the property boundary on the map.* | **FAIL** | No boundary drawing exists; area is manually typed into number input with 10k sqm/ha multiplier. |
| **CAO-05** | CAO | Data Entry | *The user can successfully type in and save the BIR zonal value (price) for the selected property.* | **FAIL** | Form accepts only total asking price. BIR zonal value is not captured or displayed anywhere in UI. |
| **CAO-06** | CAO | Warning System | *The system shows a clear warning message if the added property is located inside a flood zone or near a fault line.* | **FAIL** | No flood or fault line datasets, spatial checks, or warning messages exist. Fault buffer undefined. |
| **CAO-07** | CAO | Search & Filter | *The search and filter functions accurately find specific saved properties in the database.* | **PARTIAL** | Text search filters loaded records by name/city/barangay; dropdown filters missing on admin table. |
| **CAO-08** | CAO | Error Handling | *The system displays a clear error message if the user tries to save a property with missing required information.* | **PASS** | HTML5 validation + backend HTTP 400 with specific field error messages verified. |
| **CAO-09** | CAO | Responsiveness | *The map and property details load properly whether viewed on a desktop monitor or a mobile device.* | **PARTIAL** | Property details adjust responsively; however, map on admin property encoding screen is absent. |
| **CAO-10** | CAO | Speed | *The system responds and saves property details quickly (in 2 seconds or less).* | **PASS** | 5 measured runs: Median 252.39 ms, Max 305.94 ms (well below 2.0s threshold). |
| **LEBDO-01** | LEBDO | Access | *The user can successfully log in and access the primary investment evaluation dashboard.* | **PARTIAL** | Ranking board is public and accessible, but dedicated LEBDO role and gated workspace do not exist. |
| **LEBDO-02** | LEBDO | Calculation | *The system accurately calculates the final Investment Attractiveness Index (IAI) score for a property.* | **PARTIAL** | Multi-lens scoring exists, but uses seeded base scores and lacks manuscript Min-Max MCE & hazard indicators. |
| **LEBDO-03** | LEBDO | Ranking | *The system automatically sorts the list of available properties, displaying the highest-scoring properties at the top.* | **PARTIAL** | Sorted by CLUP tier then score; non-available ('Reserved') properties are not excluded from board. |
| **LEBDO-04** | LEBDO | Property Details | *The user can click a specific property and clearly view its IAI score and a simple breakdown of why it is recommended.* | **PASS** | Command center displays lens score, pillar matrix, CLUP suitability breakdown, and thesis rationale. |
| **LEBDO-05** | LEBDO | Radar Tool | *The user can activate the 500-meter radar tool to see nearby roads and existing competitors around a selected property.* | **FAIL** | 500m spatial buffer tool, road inspector, and competitor dataset/layer are completely missing. |
| **LEBDO-06** | LEBDO | Business Match | *The system recommends the top three best business types for a selected vacant lot based on the surrounding area.* | **FAIL** | No location-based business matching engine exists; only user voting tallies on 11 presets exist. |
| **LEBDO-07** | LEBDO | Search & Filter | *The search and filter functions allow the user to easily sort the dashboard by high scores or specific property types.* | **PARTIAL** | Filter by property type, corridor, and score sorting works; text search input absent on ranking board. |
| **LEBDO-08** | LEBDO | Report Export | *The user can successfully download or print a clear report showing the final ranked list of properties.* | **PARTIAL** | `reports.php` provides Print/PDF via `window.print()`; primary `property-ranking.php` board lacks export. |
| **LEBDO-09** | LEBDO | Responsiveness | *The investment dashboard layout adjusts properly and is readable on both desktop and mobile screens.* | **PASS** | Responsive CSS grids collapse cleanly across desktop, tablet (768px), and mobile (375px). |
| **LEBDO-10** | LEBDO | Speed | *The property rankings and map radar load quickly (in 2 seconds or less).* | **PARTIAL** | Rankings load in ~260ms (PASS); radar tool component is missing/untestable (FAIL). |
| **CICTO-01** | CICTO | Security | *The system successfully denies access and shows an error when incorrect usernames or passwords are used.* | **PASS** | Access denied, HTTP 200 returned with banner: "Invalid admin credentials. Use the local demo account below." |
| **CICTO-02** | CICTO | Account Creation | *The admin can successfully create new user accounts and assign specific office roles.* | **FAIL** | No admin user creation screen or API exists; office role assignment (CAO, LEBDO, CICTO) is missing. |
| **CICTO-03** | CICTO | Access Control | *The system successfully restricts standard users from accessing Admin-only settings.* | **PASS** | Guests and investors attempting admin pages are redirected (HTTP 302) to login; APIs enforce role checks. |
| **CICTO-04** | CICTO | Session Timeout | *The system automatically logs the user out after a period of inactivity for security purposes.* | **PARTIAL** | Server enforces 7,200s (2h) timeout; lacks client idle warning. Timeout duration undefined in questionnaire. |
| **CICTO-05** | CICTO | Data Validation | *The system blocks the user from submitting forms if important details are left blank.* | **PASS** | Client-side `required` attributes and server-side HTTP 400 validation reject blank submissions. |
| **CICTO-06** | CICTO | Search & Filter | *The search and filter functions work correctly across all administrative data tables.* | **PARTIAL** | Listings and showcase have search; seller verification queue and message monitor lack search/filter. |
| **CICTO-07** | CICTO | Map Stability | *The interactive map remains stable and does not crash when multiple properties or radar zones are loaded at once.* | **PARTIAL** | Map handles 10 clustered markers stably with fallback; radar zones are not implemented. |
| **CICTO-08** | CICTO | Export Formatting | *The system accurately exports data into a clean, fully formatted document without text overlap or broken layouts.* | **PASS** | Google Earth KML export is valid XML; `reports.php` print stylesheet cleanly formats printable tables. |
| **CICTO-09** | CICTO | Responsiveness | *The system’s styling and interface adjust perfectly across different screen sizes (desktop, tablet, mobile).* | **PASS** | Fluid CSS layouts, media queries, and viewport meta tags adapt layout across all screen breakpoints. |
| **CICTO-10** | CICTO | Speed | *The system responds quickly (in 2 seconds or less) when switching between the map view and the administrative dashboards.* | **PASS** | 5 measured runs: Median 523.37 ms, Max 573.70 ms (well below 2.0s threshold). |

---

## Detailed Audit Records

### Batch 1: City Assessor's Office (CAO) — System Administration & Property Encoding

#### CAO-01
- **Exact Requirement:** *Login: The user can successfully log in using a valid username and password.*
- **Manuscript Reference:** Chapter 2, Table 1 (5 CAO evaluators assigned to verify raw land data encoding and mapping).
- **Implemented Role, Screen, and Route:** Role: `admin`. Screen: Admin Login (`admin-login.php`). Route: POST `/admin-login.php` -> redirects to `/admin-dashboard.php`.
- **Code Evidence:** [admin-login.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/admin-login.php#L13-L20); [auth.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Support/auth.php#L104-L119).
- **Preconditions & Test Data:** Valid seeded admin credentials (`admin@sfcelerate.local` / `Admin123!`).
- **Reproduction Steps:**
  1. Send GET request to `/admin-login.php` to extract CSRF token.
  2. Send POST request with `email=admin@sfcelerate.local` and `password=Admin123!`.
  3. Inspect HTTP status code and redirect header.
- **Expected Result:** Login succeeds, session cookie is issued, user is redirected to administrative dashboard.
- **Observed Result:** HTTP 302 redirect to `/admin-dashboard.php`, session cookie issued, user session established.
- **Outcome:** **PARTIAL**
- **Missing Behavior & Gap:** There is no specific `cao` user account or role in the system. All administrative and property encoding tasks currently run through the generic `admin` account.
- **Recommended Correction:** Add an `office` attribute or explicit `cao` role to the user model, seed a default CAO user (`cao@sfcelerate.local`), and configure role-based landing redirection.  
  *Severity:* Medium. *Retest:* Log in with CAO credentials and verify access to property encoding.

#### CAO-02
- **Exact Requirement:** *Profile Management: The user can easily edit and update their account profile details.*
- **Manuscript Reference:** Objective 1 (LGU account administration).
- **Implemented Role, Screen, and Route:** None implemented for administrative or CAO users. (Only `seller-profiles.php` exists for seller verification).
- **Code Evidence:** [auth.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Support/auth.php#L152-L215); [UserRepository.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Repositories/UserRepository.php#L68-L137).
- **Preconditions & Test Data:** Authenticated admin/CAO user session.
- **Reproduction Steps:**
  1. Log in as admin.
  2. Search UI and navigation headers for account profile edit form (changing name, email, password).
  3. Search API for general user profile update endpoint.
- **Expected Result:** Profile management screen or modal allowing user to update their display name, email, and password.
- **Observed Result:** No user profile edit form exists in any administrative interface. `UserRepository` only supports `updateIdentityVerificationStatus`.
- **Outcome:** **FAIL**
- **Missing Behavior:** Missing UI and backend API (`PUT /api/user-profile.php`) to update user account details.
- **Recommended Correction:** Implement a User Profile modal accessible from the header avatar allowing users to update their name, email, and password.  
  *Severity:* High. *Retest:* Update username and password, log out, and log back in with updated credentials.

#### CAO-03
- **Exact Requirement:** *Map Navigation: The user can easily navigate the map and drop a pin to add a new property.*
- **Manuscript Reference:** Chapter 2 (Spatial parameter collection, geographic coordinates via Leaflet.js).
- **Implemented Role, Screen, and Route:** Role: `admin`. Screen: Admin Listings (`admin-properties.php`). Route: Modal `#propertyCrudModal`.
- **Code Evidence:** [admin-properties.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/admin-properties.php#L135-L141); [PropertyRepository.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Repositories/PropertyRepository.php#L787-L791).
- **Preconditions & Test Data:** Logged in as admin on `/admin-properties.php`.
- **Reproduction Steps:**
  1. Click "Add Property" button on `/admin-properties.php`.
  2. Inspect the opened modal `#propertyCrudModal`.
  3. Observe Location and Pricing section.
- **Expected Result:** Interactive map with pan/zoom navigation and a draggable pin or click-to-pin tool that captures exact latitude and longitude.
- **Observed Result:** No map exists in the modal. Coordinates cannot be selected. A static text note states: *"Coordinates are pinned via the property explorer map editor."* `PropertyRepository` substitutes hardcoded coordinates based on corridor string (`16.6195, 120.3205`).
- **Outcome:** **FAIL**
- **Missing Behavior:** Interactive Leaflet map picker within the property encoding modal with draggable marker pin.
- **Recommended Correction:** Embed an interactive Leaflet map picker in the modal that allows clicking/dragging a marker and writes `lat`/`lng` into hidden form inputs.  
  *Severity:* Critical (Core CAO Workflow). *Retest:* Drop pin on Poro Point, save, verify stored coordinates match pin location.

#### CAO-04
- **Exact Requirement:** *Area Calculation: The system automatically computes the land area size when the user plots the property boundary on the map.*
- **Manuscript Reference:** Definition of Terms (Geospatial Data, boundary geometry, land area measurements).
- **Implemented Role, Screen, and Route:** Role: `admin`. Screen: `admin-properties.php`. Event handler: `crudSyncArea(val, fromUnit)`.
- **Code Evidence:** [admin-properties.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/admin-properties.php#L343-L357); [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L11212-L11253).
- **Preconditions & Test Data:** Logged in as admin, opening Add Property modal.
- **Reproduction Steps:**
  1. Open Add Property modal.
  2. Inspect the Land Area section.
  3. Enter values into `#crudLandArea`.
- **Expected Result:** A polygon drawing tool on the map allowing the user to plot vertex boundaries, automatically calculating area (e.g. via Turf.js or spherical geometry) in hectares and square meters.
- **Observed Result:** Land area is a manual numeric text input (`#crudLandArea`). Typing `0.5` ha simply multiplies by 10,000 to show `5,000 sqm`. No boundary polygon plotting tool exists.
- **Outcome:** **FAIL**
- **Missing Behavior:** Automatic spatial calculation from a plotted polygon boundary.
- **Recommended Correction:** Integrate Leaflet Draw or MapLibre polygon drawing tool; use geodesic area computation (`L.GeometryUtil.geodesicArea` or Turf.js `turf.area()`) to automatically populate land area.  
  *Severity:* High. *Retest:* Draw 100m x 100m square polygon, verify automatic output is exactly 1.0 ha / 10,000 sqm.

#### CAO-05
- **Exact Requirement:** *Data Entry: The user can successfully type in and save the BIR zonal value (price) for the selected property.*
- **Manuscript Reference:** Definition of Terms (BIR Zonal Value: nationally mandated baseline value of land per sqm); Methodology (Standardized BIR portal data).
- **Implemented Role, Screen, and Route:** Role: `admin`. Screen: `admin-properties.php`. Input: `#crudPrice`.
- **Code Evidence:** [admin-properties.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/admin-properties.php#L111-L116); [PropertyRepository.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Repositories/PropertyRepository.php#L856-L868).
- **Preconditions & Test Data:** Property CRUD modal open on `admin-properties.php`.
- **Reproduction Steps:**
  1. Inspect pricing input fields in Property CRUD modal.
  2. Submit property form with price.
  3. Query database schema and saved record.
- **Expected Result:** Explicit field to enter "BIR Zonal Value (PHP/sqm)" stored separately from total asking price.
- **Observed Result:** The only pricing field is `Price (PHP)` (`#crudPrice`), representing total asking price. The database column `assessed_value_sqm` exists in schema but is not exposed in the UI. "BIR Zonal Value" is completely absent.
- **Outcome:** **FAIL**
- **Missing Behavior:** Field for entering BIR zonal value per sqm and storing it in database.
- **Recommended Correction:** Add `bir_zonal_value_sqm` field to property table, expose it in the modal, and display it in property details alongside asking price.  
  *Severity:* High. *Retest:* Enter ₱4,500/sqm zonal value; verify persistence in database and display on dossier.

#### CAO-06
- **Exact Requirement:** *Warning System: The system shows a clear warning message if the added property is located inside a flood zone or near a fault line.*
- **Manuscript Reference:** Definition of Terms (Fault Line Proximity, Flood Susceptibility as environmental risk indicators).
- **Implemented Role, Screen, and Route:** None implemented.
- **Code Evidence:** Grep search for `fault` and `flood` confirmed zero spatial check routines in `app/` and `assets/`.
- **Preconditions & Test Data:** Property encoding modal open.
- **Reproduction Steps:**
  1. Add a property located in known coastal flood zones or near fault lines.
  2. Inspect form and API responses for any warnings.
- **Expected Result:** Spatial intersection check against geo-hazard datasets (MGB/PHIVOLCS flood and active fault layers) displaying warning: "Warning: Property intersects 100-year flood zone" or "Warning: Property is within X meters of an active fault line."
- **Observed Result:** No spatial checks, hazard layers, or warning banners exist.
- **Outcome:** **FAIL** *(plus SPECIFICATION GAP: Fault proximity threshold distance is undefined in questionnaire).*
- **Missing Behavior:** Spatial intersection check against GeoJSON hazard layers triggering interactive warning banners.
- **Recommended Correction:** Import San Fernando flood and fault line GeoJSON datasets; perform point-in-polygon and distance checks upon pin placement, displaying persistent warning callouts.  
  *Severity:* High. *Retest:* Place pin in high flood risk zone, verify warning banner is rendered.

#### CAO-07
- **Exact Requirement:** *Search & Filter: The search and filter functions accurately find specific saved properties in the database.*
- **Manuscript Reference:** Functional requirement for administrative inventory retrieval.
- **Implemented Role, Screen, and Route:** Role: `admin`. Screen: `admin-properties.php`. Handler: `input#adminSearch` event listener in `portal.js`.
- **Code Evidence:** [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L11325-L11328); [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L11423-L11426).
- **Preconditions & Test Data:** Seeded database with 10 properties.
- **Reproduction Steps:**
  1. Type "Fabro" in `#adminSearch`: verify only "Fabro Building Prime Lot" is displayed.
  2. Type "Catbangen": verify only Catbangen properties are displayed.
  3. Type "NonexistentXYZ": verify empty state "No listings match this search" is displayed.
  4. Look for dropdown filter controls (e.g. by status, corridor, type).
- **Expected Result:** Text search and structured dropdown filters find properties matching query parameters.
- **Observed Result:** Text search accurately matches name, city, and barangay in real time. However, there are no dropdown filter controls on `admin-properties.php` (only available on `property-ranking.php`).
- **Outcome:** **PARTIAL**
- **Missing Behavior:** Filter dropdowns by status (Available, Reserved), corridor, and property type on the admin inventory screen.
- **Recommended Correction:** Add corridor, status, and type filter dropdowns alongside `#adminSearch`.  
  *Severity:* Low. *Retest:* Filter by "Reserved" status and confirm only reserved properties show.

#### CAO-08
- **Exact Requirement:** *Error Handling: The system displays a clear error message if the user tries to save a property with missing required information.*
- **Manuscript Reference:** System robustness and form validation requirements.
- **Implemented Role, Screen, and Route:** Role: `admin`. Screen: `admin-properties.php`. Endpoint: POST `/api/properties.php`.
- **Code Evidence:** [PropertyRepository.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Repositories/PropertyRepository.php#L747-L779); [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L11504-L11559).
- **Preconditions & Test Data:** Authenticated admin session.
- **Reproduction Steps:**
  1. Submit form with missing property name: check response.
  2. Submit form with missing price: check response.
  3. Submit form with missing land area: check response.
- **Expected Result:** Submission blocked with descriptive error messages identifying missing fields.
- **Observed Result:** Client HTML5 attributes prevent empty submit. Server API returns HTTP 400 with specific JSON error strings: `"Property name is required."`, `"Price must be greater than zero."`, `"Land area must be greater than zero."`, displayed via UI alert.
- **Outcome:** **PASS**

#### CAO-09
- **Exact Requirement:** *Responsiveness: The map and property details load properly whether viewed on a desktop monitor or a mobile device.*
- **Manuscript Reference:** Non-functional usability requirements across device profiles.
- **Implemented Role, Screen, and Route:** Screens: `admin-properties.php`, `property-details.php`. Breakpoints in `portal.css`.
- **Code Evidence:** [portal.css](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/css/portal.css); [web.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Support/web.php#L69).
- **Preconditions & Test Data:** Responsive viewport simulation (1440px desktop, 768px tablet, 375px mobile).
- **Reproduction Steps:**
  1. Load `property-details.php?id=1` at 1440px, 768px, and 375px widths.
  2. Load `admin-properties.php` across same viewports.
- **Expected Result:** Map and property details adapt gracefully without horizontal scroll breakage.
- **Observed Result:** Property details, dossier matrix, and public maps scale responsively across all viewports. However, `admin-properties.php` contains NO map at all.
- **Outcome:** **PARTIAL**
- **Missing Behavior:** The property encoding screen lacks a map component to evaluate for responsiveness.
- **Recommended Correction:** Once the map pin picker is added to `admin-properties.php`, ensure it maintains touch responsiveness on mobile.  
  *Severity:* Medium. *Retest:* Open map pin picker on mobile viewport and verify touch panning.

#### CAO-10
- **Exact Requirement:** *Speed: The system responds and saves property details quickly (in 2 seconds or less).*
- **Manuscript Reference:** Non-functional performance standards.
- **Implemented Role, Screen, and Route:** Route: POST `/api/properties.php`.
- **Code Evidence:** Measured execution through automated benchmark script `scratch/test_batch_cao.php`.
- **Preconditions & Test Data:** Authenticated admin session; 5 synthetic property fixtures (`SYNTHETIC_TEST_FIXTURE_CAO_1` through `5`).
- **Reproduction Steps:**
  1. Execute 5 successive property creation requests.
  2. Record exact round-trip network/execution time.
  3. Verify record persistence in MySQL.
  4. Delete synthetic fixtures.
- **Expected Result:** All save operations complete and persist in under 2,000 ms.
- **Observed Result:**
  - Run 1: 252.39 ms
  - Run 2: 252.25 ms
  - Run 3: 305.94 ms
  - Run 4: 271.34 ms
  - Run 5: 241.08 ms
  - **Min:** 241.08 ms | **Max:** 305.94 ms | **Median:** 252.39 ms | **Mean:** 264.60 ms
  - All 5 records successfully persisted in MySQL.
- **Outcome:** **PASS**

---

### Batch 2: Local Economic and Business Development Office (LEBDO) — Economic Analytics

#### LEBDO-01
- **Exact Requirement:** *Access: The user can successfully log in and access the primary investment evaluation dashboard.*
- **Manuscript Reference:** Chapter 2, Table 1 (5 LEBDO evaluators assigned to assess economic analytics).
- **Implemented Role, Screen, and Route:** Role: `investor` / `admin` / `guest`. Dashboards: `property-ranking.php`, `investor-dashboard.php`.
- **Code Evidence:** [auth.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Support/auth.php#L83-L102); [property-ranking.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/property-ranking.php#L6-L9).
- **Preconditions & Test Data:** Seeded accounts.
- **Reproduction Steps:**
  1. Inspect user table and authentication system for LEBDO role.
  2. Navigate to `property-ranking.php` and `investor-dashboard.php`.
- **Expected Result:** A designated LEBDO office account can authenticate and access a dedicated economic evaluation dashboard.
- **Observed Result:** `property-ranking.php` is publicly accessible without login. No `lebdo` role exists in the authentication layer. Logging in with an investor account redirects to `investor-dashboard.php`, not an LGU economic evaluation interface.
- **Outcome:** **PARTIAL**
- **Missing Behavior:** Dedicated LEBDO office role and authenticated workspace tailored for LGU economic planning.
- **Recommended Correction:** Add `lebdo` role and create a specialized LGU economic planning dashboard view.  
  *Severity:* High. *Retest:* Log in as `lebdo@sfcelerate.local` and land on LEBDO economic dashboard.

#### LEBDO-02
- **Exact Requirement:** *Calculation: The system accurately calculates the final Investment Attractiveness Index (IAI) score for a property.*
- **Manuscript Reference:** Definition of Terms (IAI, MCE, Min-Max Normalization, Proportional Weighting, Weighted Aggregation); Chapter 2 Methodology.
- **Implemented Role, Screen, and Route:** Screen: `property-ranking.php`, `property-details.php`. Functions: `calculateInvestmentLensResult()` in `utils.js`; `DecisionEngineService.php`.
- **Code Evidence:** [utils.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/utils.js#L882-L990); [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L9432-L9456); [DecisionEngineService.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Support/DecisionEngineService.php#L10-L41).
- **Preconditions & Test Data:** Loaded property inventory.
- **Reproduction Steps:**
  1. Inspect the scoring functions in `utils.js` and `portal.js`.
  2. Compare indicators used against the manuscript's MCE parameters (flood susceptibility, fault proximity, BIR zonal value, assessed land value).
- **Expected Result:** A standardized Multi-Criteria Evaluation (MCE) applying Min-Max normalization across all indicators, combining weighted spatial, economic, and environmental hazard scores.
- **Observed Result:** The scoring engine computes an "Investment Lens" score based on road access, utility status, and area window, but treats the database column `score` (seeded 82-91) as a base score (`baseIAI = property.marketScore`), modified by a site-visit multiplier. It does NOT normalize across live dataset min-max for all criteria, and excludes flood, fault proximity, and BIR zonal values.
- **Outcome:** **PARTIAL**
- **Missing Behavior:** Full manuscript MCE calculation including flood risk, fault distance, and BIR zonal value normalization.
- **Recommended Correction:** Re-align scoring algorithm with Chapter 2 equation: implement dynamic min-max scaling of raw indicators and explicit criterion weights.  
  *Severity:* High. *Retest:* Verify that adjusting flood or fault parameters recalculates the IAI score.

#### LEBDO-03
- **Exact Requirement:** *Ranking: The system automatically sorts the list of available properties, displaying the highest-scoring properties at the top.*
- **Manuscript Reference:** Statement of Objectives (prioritizing identified investment areas from highest to lowest priority).
- **Implemented Role, Screen, and Route:** Screen: `property-ranking.php`. Function: `enrichProperties()` sort comparator.
- **Code Evidence:** [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L835-L844).
- **Preconditions & Test Data:** 10 properties in database.
- **Reproduction Steps:**
  1. Open `property-ranking.php`.
  2. Inspect the leaderboard ranking order under default lens.
  3. Verify status of listed properties.
- **Expected Result:** Available properties ranked from highest to lowest score; reserved or unavailable properties excluded.
- **Observed Result:** Properties are sorted first by CLUP compliance status (`PASS` > `CONDITIONAL` > `FAIL`), then by `lensScore` descending. Properties with highest scores appear at top within their CLUP tier. However, Property 3 ("Feraren Commercial Complex", status `Reserved`) is included in the ranked list rather than excluded or filtered out.
- **Outcome:** **PARTIAL**
- **Missing Behavior:** Available-only filtering toggle or automatic exclusion of `Reserved`/`Under Review` properties from the opportunity board.
- **Recommended Correction:** Add an availability filter defaulting to `Available` only, or separate non-available properties into a reserved register.  
  *Severity:* Medium. *Retest:* Verify reserved properties do not appear in the active ranking board when filtered to available.

#### LEBDO-04
- **Exact Requirement:** *Property Details: The user can click a specific property and clearly view its IAI score and a simple breakdown of why it is recommended.*
- **Manuscript Reference:** Transparency requirement (communicates evaluation methodology and prioritization rationale).
- **Implemented Role, Screen, and Route:** Screen: Property Details (`property-details.php?id={id}`).
- **Code Evidence:** [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L10186-L10200); [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L516-L545).
- **Preconditions & Test Data:** Property ID 1 loaded.
- **Reproduction Steps:**
  1. Navigate to `/property-details.php?id=1`.
  2. Inspect hero and dossier cards.
- **Expected Result:** Clear display of IAI score and breakdown of why the site is recommended.
- **Observed Result:** Displays prominent IAI score pill (e.g. 91), "Why it fits [Lens]" thesis narrative, 5-pillar readiness breakdown (Spatial, Infrastructure, Economic, Institutional, Legal), and CLUP screening verdict.
- **Outcome:** **PASS**

#### LEBDO-05
- **Exact Requirement:** *Radar Tool: The user can activate the 500-meter radar tool to see nearby roads and existing competitors around a selected property.*
- **Manuscript Reference:** Geospatial proximity analysis within candidate investment catchment zones.
- **Implemented Role, Screen, and Route:** None implemented.
- **Code Evidence:** Grep search for `competitor` and `radar` confirmed zero spatial radar or competitor tools exist in the codebase.
- **Preconditions & Test Data:** Property details / command center.
- **Reproduction Steps:**
  1. Inspect `property-details.php` and `property-explorer.php`.
  2. Search for 500-meter radar activation button or competitor pins.
- **Expected Result:** A 500-meter circular buffer tool centered on the property displaying nearby road networks and registered competitor businesses.
- **Observed Result:** No 500-meter radar tool exists. "Radar" in the codebase is only a decorative CSS sweep on `index.php` and a text kicker in `city-pipeline.php`. Competitor data is nonexistent.
- **Outcome:** **FAIL**
- **Missing Behavior:** Interactive 500-meter radius buffer tool displaying road infrastructure and competitor establishment markers.
- **Recommended Correction:** Add a Leaflet circle tool (`L.circle(latlng, { radius: 500 })`) and load nearby POI/competitor dataset within the bounding radius.  
  *Severity:* Critical (Core LEBDO Requirement). *Retest:* Activate radar tool on property, verify 500m radius circle and competitor markers render.

#### LEBDO-06
- **Exact Requirement:** *Business Match: The system recommends the top three best business types for a selected vacant lot based on the surrounding area.*
- **Manuscript Reference:** Prescriptive decision-support analytics for optimal capital utilization.
- **Implemented Role, Screen, and Route:** None implemented. (Only user voting tallies exist).
- **Code Evidence:** [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L449); [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L806).
- **Preconditions & Test Data:** Property details page.
- **Reproduction Steps:**
  1. View vacant lot property.
  2. Look for algorithmic top 3 business type recommendations derived from surrounding amenities/demographics.
- **Expected Result:** Algorithmic ranking of top three business types (e.g. 1. Cafe, 2. BPO Office, 3. Convenience Store) computed from surrounding land use, road access, and gap analysis.
- **Observed Result:** No spatial business recommendation engine exists. The only demand signal displayed is `topVoteEntry`, which reflects subjective votes submitted by users on `voting-dashboard.php`.
- **Outcome:** **FAIL**
- **Missing Behavior:** Automated prescriptive recommendation engine outputting top 3 business fits based on site spatial attributes.
- **Recommended Correction:** Implement an indicator-based suitability scoring model across candidate business archetypes that computes top-3 ranked matches with explanations.  
  *Severity:* High. *Retest:* Select vacant lot, verify top 3 business types display with quantitative fit scores.

#### LEBDO-07
- **Exact Requirement:** *Search & Filter: The search and filter functions allow the user to easily sort the dashboard by high scores or specific property types.*
- **Manuscript Reference:** Dashboard usability and opportunity filtering.
- **Implemented Role, Screen, and Route:** Screen: `property-ranking.php`.
- **Code Evidence:** [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L6510-L6540); [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L6661-L6672).
- **Preconditions & Test Data:** Property ranking board.
- **Reproduction Steps:**
  1. On `property-ranking.php`, select Property Type: "Logistics".
  2. Select Corridor: "Highway".
  3. Look for keyword search box.
- **Expected Result:** User can filter by property type and score, and search by keyword.
- **Observed Result:** Filtering by property type, corridor, and CLUP status works cleanly and re-sorts the leaderboard by score. However, there is no text search input on `property-ranking.php`.
- **Outcome:** **PARTIAL**
- **Missing Behavior:** Keyword search box on `property-ranking.php`.
- **Recommended Correction:** Add a search input `#rankingSearch` to `property-ranking.php`.  
  *Severity:* Low. *Retest:* Type search query on ranking board and verify matching items filter instantly.

#### LEBDO-08
- **Exact Requirement:** *Report Export: The user can successfully download or print a clear report showing the final ranked list of properties.*
- **Manuscript Reference:** Automated justification reports for LGU deliberation.
- **Implemented Role, Screen, and Route:** Screens: `property-ranking.php`, `reports.php`.
- **Code Evidence:** [reports.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/reports.php#L15); [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L11829).
- **Preconditions & Test Data:** Navigating to ranking and report screens.
- **Reproduction Steps:**
  1. Check `property-ranking.php` for download/print button.
  2. Navigate to `reports.php` and click "Print / Save PDF".
- **Expected Result:** A direct button on the ranking dashboard allowing users to download or print the ranked list report.
- **Observed Result:** `property-ranking.php` has no report download or print button (only Google Earth export). A separate page `reports.php` provides a "Print / Save PDF" button invoking `window.print()` for candidate sites.
- **Outcome:** **PARTIAL**
- **Missing Behavior:** Direct print/download report action button on `property-ranking.php`.
- **Recommended Correction:** Add an "Export / Print Report" button on `property-ranking.php` linking directly to `reports.php` or triggering print view.  
  *Severity:* Medium. *Retest:* Click "Print Report" on ranking page and verify print dialog opens.

#### LEBDO-09
- **Exact Requirement:** *Responsiveness: The investment dashboard layout adjusts properly and is readable on both desktop and mobile screens.*
- **Manuscript Reference:** Multi-device operational access.
- **Implemented Role, Screen, and Route:** Screen: `property-ranking.php`.
- **Code Evidence:** [portal.css](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/css/portal.css); [reports.css](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/css/reports.css).
- **Preconditions & Test Data:** Simulated viewports at 1440px, 768px, and 375px.
- **Reproduction Steps:**
  1. Inspect `property-ranking.php` layout across desktop and mobile widths.
  2. Inspect typography and card layout readability.
- **Expected Result:** Clean stacking of controls, hero board, leaderboard, and property grid on small screens.
- **Observed Result:** The ranking studio collapses from multi-column grid to single-column stack on tablet and mobile viewports. Text remains legible, buttons are finger-friendly, and no horizontal overflow occurs.
- **Outcome:** **PASS**

#### LEBDO-10
- **Exact Requirement:** *Speed: The property rankings and map radar load quickly (in 2 seconds or less).*
- **Manuscript Reference:** Non-functional system performance.
- **Implemented Role, Screen, and Route:** Screens: `property-ranking.php`, `api/bootstrap.php`.
- **Code Evidence:** Measured execution via benchmark script `scratch/test_batch_lebdo_cicto.php`.
- **Preconditions & Test Data:** 5 successive HTTP requests to `property-ranking.php` and `api/bootstrap.php`.
- **Reproduction Steps:**
  1. Measure round-trip time for ranking page.
  2. Measure radar loading time.
- **Expected Result:** Property rankings and radar tool load in <= 2.0s.
- **Observed Result:**
  - Property Ranking Page: Min 23.51 ms, Max 35.83 ms, Median 24.32 ms.
  - API Bootstrap Payload: Min 248.49 ms, Max 307.12 ms, Median 258.94 ms.
  - Total Ranking Render Time: ~290 ms (well within 2.0s).
  - Map radar tool: **UNTESTABLE / FAILED** because the radar tool is not implemented.
- **Outcome:** **PARTIAL** (Rankings pass speed threshold; radar tool is missing).

---

### Batch 3: City Information and Communications Technology Office (CICTO) — System Integrity

#### CICTO-01
- **Exact Requirement:** *Security: The system successfully denies access and shows an error when incorrect usernames or passwords are used.*
- **Manuscript Reference:** System security and authentication verification.
- **Implemented Role, Screen, and Route:** Screen: `admin-login.php`.
- **Code Evidence:** [admin-login.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/admin-login.php#L19); [admin-login.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/admin-login.php#L47).
- **Preconditions & Test Data:** Incorrect credentials (`admin@sfcelerate.local` / `WrongPassword123!`).
- **Reproduction Steps:**
  1. POST incorrect password to `/admin-login.php`.
  2. Inspect response status code and rendered HTML.
- **Expected Result:** Access denied, user remains on login page, clear error message displayed.
- **Observed Result:** Access denied (HTTP 200, no session redirect), displaying `.auth-error` banner: *"Invalid admin credentials. Use the local demo account below."*
- **Outcome:** **PASS**

#### CICTO-02
- **Exact Requirement:** *Account Creation: The admin can successfully create new user accounts and assign specific office roles.*
- **Manuscript Reference:** Table 1 & Table 2 (Role governance for CAO, LEBDO, CICTO).
- **Implemented Role, Screen, and Route:** None implemented for administrative user creation.
- **Code Evidence:** [UserRepository.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Repositories/UserRepository.php); [admin-dashboard.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/admin-dashboard.php).
- **Preconditions & Test Data:** Logged in as admin.
- **Reproduction Steps:**
  1. Search `admin-dashboard.php` and admin navigation for user management / account creation.
  2. Inspect database schema for user roles and office assignments.
- **Expected Result:** An administrative interface allowing the admin to create a new user account (name, email, password) and assign specific office roles (`CAO`, `LEBDO`, `CICTO`).
- **Observed Result:** No user creation interface exists in any admin screen. Users can only self-register as `seller` or `investor` via public forms. Roles are limited in code to `admin`, `seller`, `investor`; no office role column or assignment exists.
- **Outcome:** **FAIL**
- **Missing Behavior:** Admin User Management module allowing account creation with office role assignment.
- **Recommended Correction:** Add `office` column to `users` table; create `/admin-users.php` interface with "Create User" form supporting CAO, LEBDO, and CICTO role assignment.  
  *Severity:* Critical (Core CICTO Requirement). *Retest:* Admin creates account with role `CAO`, verifies user can log in.

#### CICTO-03
- **Exact Requirement:** *Access Control: The system successfully restricts standard users from accessing Admin-only settings.*
- **Manuscript Reference:** Table 1 (Implemented Pages and Access Scope: admin-dashboard and admin-properties are Admin only).
- **Implemented Role, Screen, and Route:** Helper: `sfc_require_role('admin', ...)` in `app/Support/auth.php`.
- **Code Evidence:** [admin-dashboard.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/admin-dashboard.php#L7); [admin-properties.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/admin-properties.php#L7); [auth.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Support/auth.php#L282-L288).
- **Preconditions & Test Data:** Unauthenticated guest session; authenticated `investor` session.
- **Reproduction Steps:**
  1. Request `GET /admin-dashboard.php` as guest -> observe HTTP 302 redirect to `/admin-login.php`.
  2. Request `GET /admin-properties.php` as guest -> observe HTTP 302 redirect to `/admin-login.php`.
  3. Request `GET /admin-dashboard.php` as investor -> observe HTTP 302 redirect to `/admin-login.php`.
  4. Attempt POST `/api/properties.php` as investor -> observe HTTP 403 / 419 rejection.
- **Expected Result:** Unprivileged requests are strictly denied and redirected.
- **Observed Result:** All unauthorized access attempts are redirected to login or rejected with HTTP 403.
- **Outcome:** **PASS**

#### CICTO-04
- **Exact Requirement:** *Session Timeout: The system automatically logs the user out after a period of inactivity for security purposes.*
- **Manuscript Reference:** System security and session management.
- **Implemented Role, Screen, and Route:** Function: `sfc_current_user()` in `app/Support/auth.php`.
- **Code Evidence:** [auth.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Support/auth.php#L231-L237).
- **Preconditions & Test Data:** Simulated session with `sfc_last_activity_at = time() - 7201`.
- **Reproduction Steps:**
  1. Inspect inactivity timeout threshold in `auth.php`.
  2. Execute controlled script simulating 7,201 seconds of inactivity.
  3. Check if session is destroyed and current user returns null.
- **Expected Result:** Session terminated upon exceeding inactivity threshold.
- **Observed Result:** Server logic cleanly destroys session and revokes authentication after 7,200 seconds (2 hours) of inactivity. However, 2 hours is an unusually long period for local government security, and there is no client-side idle timer or warning modal before termination. Timeout duration is not specified in the questionnaire.
- **Outcome:** **PARTIAL** *(plus SPECIFICATION GAP on inactivity threshold duration).*
- **Recommended Correction:** Lower inactivity timeout to 15 or 30 minutes, and add a client-side JavaScript warning banner 2 minutes before expiration.  
  *Severity:* Medium. *Retest:* Idle for 15 minutes, verify automatic logout redirect.

#### CICTO-05
- **Exact Requirement:** *Data Validation: The system blocks the user from submitting forms if important details are left blank.*
- **Manuscript Reference:** Data integrity and input sanitation.
- **Implemented Role, Screen, and Route:** Client HTML5 validation + API `_bootstrap.php` and repository validations.
- **Code Evidence:** [PropertyRepository.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Repositories/PropertyRepository.php#L748-L779); [auth.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Support/auth.php#L128-L139).
- **Preconditions & Test Data:** Form submissions with blank fields.
- **Reproduction Steps:**
  1. Submit registration with blank email -> observe rejection.
  2. Submit property form with blank name/price/area -> observe rejection.
- **Expected Result:** Submissions containing blank required fields are rejected both client-side and server-side.
- **Observed Result:** Verified client HTML5 blocking and server HTTP 400 rejection with specific error messages.
- **Outcome:** **PASS**

#### CICTO-06
- **Exact Requirement:** *Search & Filter: The search and filter functions work correctly across all administrative data tables.*
- **Manuscript Reference:** Administrative data governance and record discovery.
- **Implemented Role, Screen, and Route:** Screens: `admin-properties.php`, `admin-dashboard.php`, `admin-showcase.php`.
- **Code Evidence:** [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L11325-L11328); [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L8612-L8616); [admin-dashboard.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/admin-dashboard.php).
- **Preconditions & Test Data:** Admin dashboard and tables loaded.
- **Reproduction Steps:**
  1. Inspect search/filter on Listings table (`admin-properties.php`) -> Text search works; dropdown filters missing.
  2. Inspect Seller Applications table (`admin-dashboard.php`) -> **NO** search or filter controls exist.
  3. Inspect Conversation Monitor (`admin-dashboard.php`) -> **NO** search or filter controls exist.
  4. Inspect Showcase Studio (`admin-showcase.php`) -> Search and board tabs work.
  5. Inspect Audit Log (`admin-dashboard.php`) -> Scope filter works.
- **Expected Result:** Search and filter capabilities operate consistently across all administrative data tables.
- **Observed Result:** Search/filter is present on property listings and showcase studio, but entirely missing from the seller verification roster and conversation monitor tables on `admin-dashboard.php`.
- **Outcome:** **PARTIAL**
- **Missing Behavior:** Search inputs and status filters on the seller application queue and message monitor tables.
- **Recommended Correction:** Add search and status filter inputs to the seller verification and conversation monitor panels.  
  *Severity:* Medium. *Retest:* Search seller queue by applicant name and filter by "pending_review".

#### CICTO-07
- **Exact Requirement:** *Map Stability: The interactive map remains stable and does not crash when multiple properties or radar zones are loaded at once.*
- **Manuscript Reference:** Leaflet.js stability and spatial rendering.
- **Implemented Role, Screen, and Route:** Screen: `property-explorer.php`. Library: Leaflet 1.9.4.
- **Code Evidence:** [portal.js](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/js/portal.js#L8863-L9050).
- **Preconditions & Test Data:** 10 property markers rendered simultaneously on Leaflet map.
- **Reproduction Steps:**
  1. Load `property-explorer.php`.
  2. Toggle filters rapidly, zoom in and out, switch between clustered markers.
  3. Inspect browser console for JavaScript memory exceptions or map render crashes.
- **Expected Result:** Map remains responsive without crashes or unhandled exceptions.
- **Observed Result:** Leaflet map renders 10 markers cleanly with clustering and tile fallback handling. No crashes or uncaught exceptions observed. However, "radar zones" are not implemented and could not be evaluated.
- **Outcome:** **PARTIAL** (Property markers are stable; radar zones are missing).
- **Recommended Correction:** Once the 500m radar buffer layer is implemented, verify polygon rendering stability when multiple radar zones overlap.  
  *Severity:* Medium. *Retest:* Render 5 overlapping 500m radar zones and verify map stability.

#### CICTO-08
- **Exact Requirement:** *Export Formatting: The system accurately exports data into a clean, fully formatted document without text overlap or broken layouts.*
- **Manuscript Reference:** Automated export and reporting documentation.
- **Implemented Role, Screen, and Route:** Routes: `/api/google-earth.php`, `/reports.php`.
- **Code Evidence:** [google-earth.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/api/google-earth.php#L65-L109); [reports.css](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/css/reports.css#L125-L146).
- **Preconditions & Test Data:** Export requests via API and browser print view.
- **Reproduction Steps:**
  1. Request `GET /api/google-earth.php?download=1&format=kml&ids=1,2,3`.
  2. Inspect XML KML structure and validation.
  3. Inspect `@media print` rules on `reports.php`.
- **Expected Result:** Clean export files and print layouts without overlapping text, broken elements, or truncated data.
- **Observed Result:**
  - Google Earth export generates valid, well-formed KML XML with styled polygons and placemarks (`application/vnd.google-earth.kml+xml`).
  - `reports.php` print stylesheet cleanly formats tables at 9pt, repeats table headers across pages, hides non-print UI chrome, forces white backgrounds, and automatically expands hidden details rows (`.report-details-row[hidden] { display: table-row !important; }`).
- **Outcome:** **PASS**

#### CICTO-09
- **Exact Requirement:** *Responsiveness: The system’s styling and interface adjust perfectly across different screen sizes (desktop, tablet, mobile).*
- **Manuscript Reference:** Cross-platform web interface usability.
- **Implemented Role, Screen, and Route:** Global CSS: `portal.css`, `reports.css`, `welcome.css`.
- **Code Evidence:** [portal.css](file:///c:/xampp/htdocs/sfcelerate-bizstart/assets/css/portal.css); [web.php](file:///c:/xampp/htdocs/sfcelerate-bizstart/app/Support/web.php#L69).
- **Preconditions & Test Data:** Viewports at 1440px, 1024px, 768px, 480px, and 375px.
- **Reproduction Steps:**
  1. Inspect layout across all responsive breakpoints.
  2. Check navigation drawer, form cards, tables, and modal shells.
- **Expected Result:** Layout reflows cleanly without horizontal overflow, clipped text, or broken navigation.
- **Observed Result:** CSS media queries handle reflow cleanly across desktop, tablet, and mobile. Tables wrap in scroll containers, cards stack vertically, and headers convert to mobile drawers. (Note: "Adjust perfectly" is a subjective judgment that requires representative user evaluation during UAT).
- **Outcome:** **PASS**

#### CICTO-10
- **Exact Requirement:** *Speed: The system responds quickly (in 2 seconds or less) when switching between the map view and the administrative dashboards.*
- **Manuscript Reference:** Non-functional system performance.
- **Implemented Role, Screen, and Route:** Switching: `property-explorer.php` <-> `admin-dashboard.php`.
- **Code Evidence:** Measured execution via benchmark script `scratch/test_batch_lebdo_cicto.php`.
- **Preconditions & Test Data:** Authenticated admin session; 5 successive round-trip transitions.
- **Reproduction Steps:**
  1. Execute transition from Map Explorer (`property-explorer.php`) to Admin Dashboard (`admin-dashboard.php`).
  2. Record combined transition time across 5 runs.
- **Expected Result:** Combined view switching completes in <= 2,000 ms.
- **Observed Result:**
  - Run 1: 521.91 ms (Map: 279.6 ms, Dash: 240.1 ms)
  - Run 2: 527.08 ms (Map: 263.3 ms, Dash: 261.5 ms)
  - Run 3: 511.28 ms (Map: 259.3 ms, Dash: 249.8 ms)
  - Run 4: 523.37 ms (Map: 238.3 ms, Dash: 282.8 ms)
  - Run 5: 573.70 ms (Map: 241.1 ms, Dash: 330.0 ms)
  - **Min:** 511.28 ms | **Max:** 573.70 ms | **Median:** 523.37 ms | **Mean:** 531.47 ms
  - All runs completed in under 600 ms (well within the 2.0s threshold).
- **Outcome:** **PASS**

---

## Specification Questions & Ambiguities

During the audit, the following ambiguities and specification gaps were identified between the questionnaire, manuscript, and code:

1. **CAO-06: Fault Proximity Distance Rule:** The requirement states *"near a fault line"*, but does not specify the proximity threshold (e.g. 500 meters, 5 kilometers, or PHIVOLCS buffer standards).
2. **CICTO-04: Inactivity Timeout Duration:** The requirement states *"after a period of inactivity"*, but does not define the required idle threshold. The system enforces 7,200 seconds (2 hours), which is excessively long for municipal administrative terminals and lacks a client-side warning.
3. **LEBDO-01 / CICTO-02: Office Role vs. Platform Role Model:** The manuscript and questionnaire assume three distinct LGU office user types (**CAO**, **LEBDO**, **CICTO**), whereas the codebase implements a marketplace role model (**Admin**, **Seller**, **Investor**). Clarification is needed on whether LGU offices should be separate roles or administrative sub-roles.
4. **CAO-05: BIR Zonal Value Semantics:** Clarification is needed on whether properties should store both BIR Zonal Value (tax baseline per sqm) and Market Asking Price, or if Zonal Value is intended to replace Asking Price for government valuation.

---

## Manuscript Requirements Absent from UAT Questionnaire

The following major functional capabilities implemented in the codebase and documented in the approved thesis manuscript are **not evaluated** by the 30-item questionnaire:

1. **CLUP Governance and Screening Engine:** Statutory land-use compatibility evaluation (PASS / CONDITIONAL / FAIL), allowed/conditional/restricted uses, and LGU recommended actions.
2. **Ground Truth Site Visits & Field Audits:** Workflow for scheduling site walkthroughs and submitting ground-truth audits that apply an empirical multiplier (e.g. 1.11x) to the IAI score.
3. **Investor Decision Comparison Lab (`compare-decision.php`):** Side-by-side comparative analysis of shortlisted properties with CAPEX and OPEX scenario testing.
4. **Community Demand Signaling & Voting (`voting-dashboard.php`):** Public crowdsourcing of business needs feeding into platform demand signals.
5. **Showcase Modules (Offer Board & City Pipeline):** Curated showcases for timed opportunities and planned municipal infrastructure.
6. **Due Diligence Checklist Tracking:** 10-point legal and physical readiness tracking (Title Copy, Tax Dec, Survey Plan, Zoning Clearance, Site Photos, Hazard Report).

---

## Subjective Usability Criteria Requiring Participant UAT

The following items contain subjective evaluation words ("easily", "clearly", "perfectly") which cannot be verified solely by technical automated audits and must be formally evaluated by representative LGU and investor participants during field UAT using the USE (Usefulness, Satisfaction, Ease of Use) Likert survey:

- **CAO-02:** Whether users can *"easily"* navigate and update profile settings.
- **CAO-03:** Whether users can *"easily"* navigate the map interface.
- **CAO-06:** Whether hazard warnings are perceived as *"clear"* and noticeable.
- **CAO-08:** Whether validation error messages are understood *"clearly"*.
- **LEBDO-04:** Whether the recommendation breakdown is considered *"simple"* and understandable.
- **LEBDO-07:** Whether sorting and filtering allow users to *"easily"* organize data.
- **LEBDO-08:** Whether exported reports are visually *"clear"* and presentation-ready.
- **CICTO-09:** Whether styling adjusts *"perfectly"* across varied physical devices and browser viewports.

---

## Prioritized Implementation Repair Backlog

The following actionable fixes are required before LOCUS-SF can successfully pass formal User Acceptance Testing:

### Priority 0: Critical Blockers (Prevents Core Office Workflows)
1. **LGU Office Roles & Admin User Creation (CICTO-02, CAO-01, LEBDO-01):**
   - Add `office` column (`cao`, `lebdo`, `cicto`, `admin`) to `users` table.
   - Build `/admin-users.php` page with user account creation form and role assignment.
2. **Map Pin-Drop Tool for Property Encoding (CAO-03):**
   - Integrate an interactive Leaflet map into `#propertyCrudModal` on `admin-properties.php`.
   - Implement click-to-pin and draggable marker that captures latitude and longitude.
3. **500-Meter Radar Tool & Competitor Layer (LEBDO-05):**
   - Implement interactive 500m circular buffer on property command center map.
   - Load nearby road networks and competitor POI markers within the 500m radius.

### Priority 1: High Priority (Data Correctness & Mandatory Features)
4. **BIR Zonal Value Entry & Storage (CAO-05):**
   - Expose `bir_zonal_value_sqm` in `admin-properties.php` and persist to database.
   - Display BIR zonal value alongside asking price on property dossiers.
5. **Automatic Area Calculation from Boundary Plotting (CAO-04):**
   - Add polygon drawing controls (Leaflet Draw) in the property modal.
   - Compute geodesic area automatically in hectares and square meters upon polygon completion.
6. **Geo-Hazard Warning System for Flood and Fault Lines (CAO-06):**
   - Load San Fernando flood susceptibility and fault line GeoJSON datasets.
   - Implement point/polygon intersection checks displaying prominent warning banners upon pin placement.
7. **Top-3 Business Matching Algorithm (LEBDO-06):**
   - Implement rule-based recommendation engine scoring business archetypes against site spatial parameters.
8. **General User Profile Management (CAO-02):**
   - Add profile modal allowing admin/CAO/LEBDO users to edit their name, email, and password.

### Priority 2: Medium Priority (Workflow & Reporting Consistency)
9. **Direct Print/Export on Ranking Board (LEBDO-08):**
   - Add "Print Report" button to `property-ranking.php` linking to print-formatted priority register.
10. **Exclude Non-Available Properties from Active Board (LEBDO-03):**
    - Filter out `Reserved` and `Under Review` properties by default on `property-ranking.php`.
11. **Administrative Table Search & Filters (CICTO-06):**
    - Add search and status filter inputs to seller review queue and conversation monitor on `admin-dashboard.php`.
12. **Inactivity Session Warning & Configurable Timeout (CICTO-04):**
    - Reduce timeout to 30 minutes and add client-side 2-minute warning modal.

---
*Report generated and validated autonomously against active system state.*
