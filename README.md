<img src="assets/images/logoLocusRedBlue.png" alt="LOCUS-SF logo" width="80" />

# LOCUS-SF

**Investment properties in San Fernando City, La Union**

LOCUS-SF helps investors discover properties, compare sites, and contact brokers. The interface uses the city palette: `#F8F9FA`, `#9E1B22`, `#11224D`, and `#2A603B`.

## Workspaces

Guests see three approved property previews. Signing in unlocks the full property catalog, map, priority board, comparisons, and saved properties.

| Account | Access |
| --- | --- |
| Investor | Available area and site visits, property search, maps, MCE/IAI rankings, saved properties, comparison, broker contacts, messages, documents, and visits |
| Broker | PRC application, own listing submissions, accepted/declined/pending totals, investor saves, CICTO review messages, and investor coordination |
| CICTO | City overview, broker verification, listing approval or decline, fraud review, and city listing entry |
| ASSESSOR | Property entry, data management, and departmental assessment |
| LEBDO | Property entry, data management, and departmental assessment |

All accounts can update their profile and photo through [profile.php](profile.php). Public registration creates investor or broker accounts. CICTO provisions city staff accounts.

CICTO can create ASSESSOR, LEBDO, or additional CICTO access through **City accounts** on the city overview. Existing account passwords are preserved during upgrades.

Staff can also use **Activate account** with a city passkey issued by CICTO. Production activation requires `SFC_CITY_STAFF_PASSKEY` and an official email allowlist: set `SFC_CITY_STAFF_EMAILS` to comma-separated authorized addresses, or `SFC_CITY_STAFF_EMAIL_DOMAINS` to exact authorized domains. Optional `SFC_CITY_STAFF_PASSKEY_EXPIRES_AT` accepts an ISO 8601 timestamp with timezone (for example, `2026-12-31T23:59:59+08:00`) or a date valid through that day in Manila. Invalid or expired dates reject activation. The equivalent private configuration lives under `security.city_staff` using `passkey`, `authorized_emails`, `authorized_email_domains`, and `passkey_expires_at`; environment settings take precedence. Configured keys and allowlists replace local development defaults. With no allowlist, local demo activation only accepts `@sfcelerate.local` addresses. Passkeys are never displayed on the access screen.

**Updates** opens messages, document requests, and site visit notices in the appropriate workspace. City departments respond to document requests under **Listings → Document requests**. Visits use the broker assigned to the investor's conversation, including city listings with a verified broker contact; reassigning a listing preserves existing private conversations.

Brokers provide their complete name, address, contact number, PRC registration number, and PRC ID validity. CICTO checks the credentials before approving submission access. New and edited broker listings return to the city review queue. Changes to verified broker credentials require another review.

Registration records the submitted privacy consent, version, and time. The consent text identifies the City Government of San Fernando, RA 10173, and LOCUS-SF.

Investor registration also records an explicit age confirmation and optional contact, profession, and city details. All access forms show validation below the affected field and validate again on the server. Email and PRC uniqueness are enforced in the database; PRC numbers retain their submitted zero padding while comparing the same numeric registration. Investors and brokers see a personal welcome after registration and a welcome-back greeting after sign-in.

## Listings and rankings

The catalog supports 13 property categories and their subcategories: Retail, Multifamily, Office, Industrial, Hospitality, Mixed Use, Land, Self Storage, Mobile Home Park, Senior Living, Special Purpose, Note/Loan, and Business for Sale.

City assessors record seven criteria: spatial accessibility, infrastructure readiness, economic viability, nearby businesses, zoning compatibility, risk constraints, and environmental safety. Site tags such as beach or agricultural support the assessment. Listings can use an open listing contact or a verified broker.

The city **Add property** editor follows five steps: Basics, Boundary, Site evidence, Surroundings, and Review. It supports editable parcel boundaries, separate calculated and survey areas, private evidence attachments, a 500-meter surroundings radar, and local drafts. Missing authoritative hazard data is **Not assessed**; business matches remain pending until source evidence and scoring profiles are approved. See [property editor documentation](docs/property-wizard.md).

MCE (Multi-Criteria Evaluation) and IAI (Investment Attractiveness Index) scores remain pending until all seven city criteria are recorded. Scores and rankings are decision aids based on the recorded assessment. Sample listings are unassessed; existing legacy scores are not official MCE/IAI assessments.

The site visit counter uses persisted visits, counted once per browser session in each 30-minute window. It is not a unique-person count. Available area totals use approved, available listings.

CLUP results are preliminary planning screens. The repository does not contain an authenticated official zoning map or cadastral parcel crosswalk. Final zoning compatibility and locational clearance require the authorized offices. See [CLUP governance](docs/CLUP_GOVERNANCE.md).

## Run locally

The application uses PHP, PDO, MySQL/MariaDB, and JavaScript modules. No Composer or npm installation is required. Enable `pdo_mysql`, `mbstring`, and `fileinfo`; optional integrations can use `curl`.

1. Put the repository in `C:\xampp\htdocs\sfcelerate-bizstart`.
2. Start MySQL and Apache in XAMPP.
3. Copy `app/config.local.php.example` to `app/config.local.php` and set your database credentials.
4. Open [http://localhost/sfcelerate-bizstart/](http://localhost/sfcelerate-bizstart/).

Local defaults use `127.0.0.1:3306`, database `sfcelerate_bizstart`, user `root`, and an empty password. Local configuration is ignored by Git. With `auto_migrate` and `auto_seed` enabled, initialization creates missing tables and local sample data. Configuration lives in [app/config.php](app/config.php).

For the PHP development server, run from the repository root while MySQL is running:

```powershell
C:\xampp\php\php.exe -S 127.0.0.1:8088 router.php
```

Use `router.php` so development requests follow the same private-directory restrictions as Apache. PHP also needs a writable `session.save_path` for login and CSRF tokens.

[api/health.php](api/health.php) reports database connectivity. Map tiles and some frontend assets require internet access.

## Database setup and upgrades

[database/setup.sql](database/setup.sql) combines the current schema and development seed for a **fresh, empty database**. [schema.sql](database/schema.sql) and [seed.sql](database/seed.sql) are also available separately. The seed does not delete existing data; do not import demo seeds into an existing deployment.

For an existing database, inspect and apply the idempotent application schema update without demo seeding:

```powershell
C:\xampp\php\php.exe database/migrate-city-workspaces.php --dry-run
C:\xampp\php\php.exe database/migrate-city-workspaces.php --apply
```

The dry run checks city workspace columns and the unique PRC index without changing records. The migration adds profile, consent, PRC, assessment, contact, provenance, and metric fields through `SchemaManager`. Legacy administrators with missing or old default departments become CICTO. It does not invent PRC registrations, consent, or city assessments.

## Local demo accounts

| Account | Email | Password |
| --- | --- | --- |
| CICTO | `admin@sfcelerate.local` | `Admin123!` |
| Broker | `seller@sfcelerate.local` | `Seller123!` |
| Investor | `investor@sfcelerate.local` | `Investor123!` |

Demo access is for local development. The broker starts unverified, with no invented PRC credentials. Complete a valid application and city review to submit listings. ASSESSOR and LEBDO accounts are provisioned by CICTO.

## Optional services

Keys can be supplied in `app/config.local.php` or environment variables.

| Service | Environment variables |
| --- | --- |
| LocationIQ | `LOCATIONIQ_KEY` |
| OpenWeather | `OPENWEATHER_API_KEY` |
| NewsAPI | `NEWSAPI_KEY` |
| Alpha Vantage | `ALPHA_VANTAGE_KEY` |
| Gemini or OpenRouter | `AI_PROVIDER`, `GEMINI_API_KEY` or `OPENROUTER_API_KEY` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |

Without keys, supported features use local uploads, stored context, or fallback responses. Sample context is demonstration data.

## Project and documentation

The revision was checked in a real browser at desktop, 390px, and 320px widths. Checked flows include the three-listing guest preview, full investor catalogue, maps and satellite tiles, saves, comparison, profiles, departmental access, document responses, broker replies, and visit confirmation. Disposable browser accounts and records are removed after verification.

Repository checks can be run from the project root:

```powershell
C:\xampp\php\php.exe tests/api-security.test.php
C:\xampp\php\php.exe tests/upload-security.test.php
C:\xampp\php\php.exe tests/account-workflow.test.php
C:\xampp\php\php.exe tests/staff-onboarding-policy.test.php
C:\xampp\php\php.exe tests/staff-activation.test.php
C:\xampp\php\php.exe tests/security/verify-admin-auth.php
C:\xampp\php\php.exe tests/security/verify-auth-validation.php --integration
C:\xampp\php\php.exe tests/security/verify-listing-workflow.php --integration --write
C:\xampp\php\php.exe tests/message-workflow.test.php --integration
C:\xampp\php\php.exe tests/visit-workflow.test.php --integration
node tests/competitor-radar.test.js
```

The integration checks require the local database and clean their own temporary records.

PHP pages are at the repository root. JSON endpoints are in `api/`; repositories, authentication, and scoring are in `app/`; frontend assets are in `assets/`.

- [System documentation](docs/system-manuscript-documentation.md)
- [CLUP governance](docs/CLUP_GOVERNANCE.md)
- [Acceptance audit](docs/uat-audit.md) — some findings predate these revisions
- [Interface audit](docs/interface-audit.md)

The project is an Information Technology capstone at DMMMSU-MLUC. Complete author and external adviser names have not been supplied for the revised public credits. CICTO, the City Assessor's Office, and LEBDO are identified by office; individual identities and endorsements must be supplied before publication.
