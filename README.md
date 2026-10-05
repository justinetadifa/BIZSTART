<img src="assets/images/webLogoSfc.png" alt="LOCUS-SF logo" width="80" />

# LOCUS-SF

**SFCelerate BizStart | San Fernando City, La Union, Philippines**

LOCUS-SF is a web application for exploring commercial properties and comparing potential investment sites in San Fernando City. It brings property listings, map views, investment rankings, and supporting documents into one place so users can assess a site before arranging further review.

The application provides separate workspaces for investors, property sellers, and administrators. It was developed as an undergraduate Information Technology capstone project.

## Core features

- **Property discovery:** Browse listings on an interactive map and filter candidates by location, corridor, price, and land area. Property details include listing information, readiness indicators, and supporting records.
- **Investment rankings:** Evaluate properties using seven sector lenses: logistics, commercial centers, office/BPO, resort/tourism, manufacturing, university, and hospital. View score breakdowns and the factors behind each ranking.
- **Comparison and reports:** Compare up to three properties, save a shortlist, and print ranking or investment reports using the browser's Print or Save as PDF options.
- **Local business context:** Inspect mapped competitors within a 500-meter radius and review suggested business types based on the application's stored property and competitor data.
- **Investor and seller coordination:** Send inquiries, request documents, track document readiness, and coordinate site visits. Signed-in investors can vote on proposed business uses for individual properties.
- **Administration:** Manage listings, review seller applications, curate showcase content and voting options, and inspect activity and audit logs.

## User roles

Visitors can browse the public property explorer, rankings, comparisons, and reports. Account access enables the following workflows:

| Role | Workspace |
| --- | --- |
| Investor | Shortlists, comparisons, demand voting, seller inquiries, document requests, and site visits |
| Seller | Seller profile submission, listing management, inquiries, document responses, and visit coordination |
| Administrator | Property moderation, seller review, showcase management, voting options, and activity monitoring |

## Technology

The backend uses PHP and PDO with MySQL or MariaDB. Pages are rendered in PHP, with HTML, CSS, and JavaScript modules handling the interface. Leaflet and MapLibre provide map views using OpenStreetMap and CARTO basemaps.

JSON endpoints live in `api/`. Database access is handled by repositories in `app/Repositories/`, while shared business logic and integrations live in `app/Support/`. There is no Composer or npm install step for the application.

## Run locally

The instructions below use XAMPP on Windows.

You will need:

- XAMPP with Apache, PHP, and MySQL/MariaDB.
- PHP extensions `pdo_mysql`, `mbstring`, and `fileinfo`. Enable `curl` if you plan to use the optional service integrations.
- Git to clone the repository.

1. Clone the project into XAMPP's web root:

   ```powershell
   Set-Location C:\xampp\htdocs
   git clone https://github.com/justinetadifa/BIZSTART.git sfcelerate-bizstart
   Set-Location sfcelerate-bizstart
   ```

2. Start **Apache** and **MySQL** in the XAMPP Control Panel.

3. Create your local configuration:

   ```powershell
   Copy-Item app/config.local.php.example app/config.local.php
   ```

   Edit `app/config.local.php` to match your database credentials. The template uses these local defaults:

   | Setting | Default |
   | --- | --- |
   | Host | `127.0.0.1` |
   | Port | `3306` |
   | Database | `sfcelerate_bizstart` |
   | User | `root` |
   | Password | Empty |

   The local configuration file is ignored by Git. Configuration defaults and supported environment variables are defined in [`app/config.php`](app/config.php).

4. Open [http://localhost/sfcelerate-bizstart/](http://localhost/sfcelerate-bizstart/).

   With the default local settings, the application creates the database and tables and seeds missing demo records during initialization. The database account needs permission to create the database and update its schema.

   To check the connection, open [http://localhost/sfcelerate-bizstart/api/health.php](http://localhost/sfcelerate-bizstart/api/health.php). A successful response contains `"status": "ok"` and `"connected": true`.

For a manual SQL setup, import [`database/setup.sql`](database/setup.sql) through phpMyAdmin into a fresh local database. The script creates and selects `sfcelerate_bizstart`; keep that name aligned with your configuration. Separate schema and seed scripts are also available in `database/`.

If the application cannot connect, confirm that MySQL is running and check the host, port, database name, and credentials in `app/config.local.php`. Map tiles and some frontend resources require an internet connection.

## Demo accounts

The local seed data includes accounts for each role:

| Role | Email | Password | Sign-in page |
| --- | --- | --- | --- |
| Administrator | `admin@sfcelerate.local` | `Admin123!` | [`admin-login.php`](admin-login.php) |
| Seller | `seller@sfcelerate.local` | `Seller123!` | [`seller-login.php`](seller-login.php) |
| Investor | `investor@sfcelerate.local` | `Investor123!` | [`investor-login.php`](investor-login.php) |

These are demonstration accounts for local development. Local defaults enable automatic schema updates and demo seeding through `auto_migrate` and `auto_seed` in the `app` configuration.

## Optional integrations

External service keys are optional for local use. Add them in `app/config.local.php` using the structure in [`app/config.local.php.example`](app/config.local.php.example), or supply the corresponding environment variables.

| Service | Purpose | Environment variables |
| --- | --- | --- |
| LocationIQ | Location search and geocoding | `LOCATIONIQ_KEY` |
| OpenWeather | Weather context | `OPENWEATHER_API_KEY` |
| NewsAPI | Business and investment news | `NEWSAPI_KEY` |
| Alpha Vantage | Market context | `ALPHA_VANTAGE_KEY` |
| Gemini or OpenRouter | Generated opportunity summaries | `AI_PROVIDER` and either `GEMINI_API_KEY` or `OPENROUTER_API_KEY` |
| Cloudinary | Hosted property images | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |

Without these keys, the application uses local uploads, stored context, or fallback responses where supported. Sample and fallback content should be treated as demonstration data rather than live market information.

## Data and planning scope

The repository includes sample listings, demand records, and local spatial datasets for development and demonstration. Rankings depend on those records and the selected scoring criteria.

Comprehensive Land Use Plan (CLUP) results are preliminary planning screens. The repository does not include an authenticated official zoning map or a cadastral parcel crosswalk, so map positions and displayed zoning labels cannot establish a property's legal zoning. Final zoning compatibility and locational clearance require review by the authorized local government offices. See [`docs/CLUP_GOVERNANCE.md`](docs/CLUP_GOVERNANCE.md) for the evidence requirements and current data limitations.

## Project layout

```text
api/                 JSON endpoints for listings, voting, messages, and documents
app/
  Core/              Database connection and schema initialization
  Repositories/      Database access
  Support/           Shared services, authentication, scoring, and integrations
  config.php         Defaults and environment variable handling
assets/              Stylesheets, JavaScript, images, and local map assets
data/                Seed datasets, spatial records, metadata, and cache files
database/            Schema, seed, and combined setup scripts
docs/                Technical documentation, governance notes, and audit records
tests/               Competitor radar verification
*.php                Public pages, sign-in pages, and role dashboards
```

The main entry points are [`index.php`](index.php), [`property-explorer.php`](property-explorer.php), [`property-ranking.php`](property-ranking.php), [`property-details.php`](property-details.php), and [`compare-decision.php`](compare-decision.php).

## Development checks

The competitor radar verification script runs with Node.js and covers distance boundaries, duplicate records, missing coordinates, repeated selections, and empty datasets:

```powershell
node tests/competitor-radar.test.js
```

## Documentation

- [System and manuscript documentation](docs/system-manuscript-documentation.md): architecture, modules, and API inventory.
- [CLUP governance](docs/CLUP_GOVERNANCE.md): source evidence, planning limits, and verification requirements.
- [Acceptance-readiness audit](docs/uat-audit.md): the October 1, 2026 audit and its findings. Some findings predate later implementation changes.
- [Interface audit](docs/interface-audit.md): interface review notes.

## Academic credits

Developed for the Bachelor of Science in Information Technology program at Don Mariano Marcos Memorial State University, Mid La Union Campus (DMMMSU-MLUC).

Project team: Justine Tadifa, Dizon, and Estilong.
