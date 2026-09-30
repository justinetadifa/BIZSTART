<div align="center">

  <img src="assets/images/webLogoSfc.png" alt="LOCUS-SF / SFCelerate BizStart Logo" width="100" />

  # 🏙️ LOCUS-SF
  ### City Investment Intelligence & Geospatial Decision-Support Platform
  **SFCelerate BizStart Ecosystem • San Fernando City, La Union, Philippines**

  <p align="center">
    <a href="https://www.php.net/"><img src="https://img.shields.io/badge/PHP-8.1%2B-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP Version" /></a>
    <a href="https://www.mysql.com/"><img src="https://img.shields.io/badge/MySQL-8.0%2B-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" /></a>
    <a href="https://leafletjs.com/"><img src="https://img.shields.io/badge/Leaflet-1.9.4-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet.js" /></a>
    <a href="https://www.openstreetmap.org/"><img src="https://img.shields.io/badge/OpenStreetMap-Live_GIS-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white" alt="OpenStreetMap" /></a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript"><img src="https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript ES6+" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" /></a>
  </p>

  <p align="center">
    <strong>Deterministic opportunity screening, parcel-level spatial intelligence, and CLUP policy compliance for smart city investments.</strong>
  </p>

  <p align="center">
    <a href="#-overview">Overview</a> •
    <a href="#-key-features">Key Features</a> •
    <a href="#-investment-priority-board-studio">Priority Board Studio</a> •
    <a href="#-acceptance-readiness-audit-uat">UAT Audit</a> •
    <a href="#-system-architecture">Architecture</a> •
    <a href="#-getting-started">Installation</a> •
    <a href="#-demo-accounts">Demo Accounts</a> •
    <a href="#-academic-credits">Credits</a>
  </p>

</div>

---

## 📖 Overview

**LOCUS-SF** (San Fernando Geospatial Investment Intelligence System, powered by the **SFCelerate BizStart** platform) is an enterprise-grade, web-based decision-support platform designed to evaluate, rank, and screen commercial property investments and urban development sites in **San Fernando City, La Union, Philippines**.

The platform resolves the traditional disconnect between investor site selection, real-time market demand, and local land-use governance. By combining automated multi-criteria investment scoring with a spatial **Comprehensive Land Use Plan (CLUP)** suitability engine, LOCUS-SF delivers a transparent, data-driven environment for private investors, commercial developers, land sellers, and municipal planners.

```
       [ Private Investors & Developers ]          [ Land Sellers & Owners ]
                       \                                   /
                        \                                 /
                         ▼                               ▼
                 +-----------------------------------------------+
                 |       LOCUS-SF DECISION-SUPPORT ENGINE        |
                 |  - Spatial GIS Mapping & CLUP Suitability     |
                 |  - Multi-Lens Investment Attractiveness (IAI) |
                 |  - 2-Pane Master-Detail Priority Board Studio |
                 |  - Crowdsourced Citizen Demand Signals        |
                 |  - 6-Point Due Diligence & Audit Verification |
                 +-----------------------------------------------+
                                         |
                                         ▼
                     [ City Government Planners & LGUs ]
               Policy-Ready Reports • Due Diligence Packs • Growth Pipeline
```

---

## ✨ Key Features

### 🏆 Investment Priority Board Studio (`property-ranking.php`)
* **Master-Detail Command Center**: High-density 2-pane interactive architecture. The left column lists candidates with rich metadata, while the sticky right column inspects deep analytical dossiers in real time upon selection.
* **Horizontal Investment Lens Ribbon**: Real-time switching between 7 strategic development lenses (*Logistics, Commercial Center, Office / BPO, Resort / Tourism, Manufacturing, University, Hospital*) with dynamic qualifying candidate counters.
* **Real-Time Search & Multi-Filters**: Instant keyword filtering across property names, barangays, and growth corridors, paired with sorting options (Recommended Rank, Highest Score, Lowest Price, Largest Parcel Area).
* **High-Density Leaderboard Cards**: Distinctive Olympic medals for the top three ranks (`#01` Gold, `#02` Silver, `#03` Bronze), photography previews, valuations, land area, CLUP gate badges, and high-contrast IAI fit scores.
* **Sticky Executive Dossier with 3-Tab Deep Dive**:
  * 📊 **Fit Drivers**: Transparent multi-criteria scoring rationale, pillar weight allocations (*Infrastructure, Spatial, Legal*), and animated criteria progress bars.
  * 🏛️ **CLUP Land-Use Gate**: High-visibility status banners (*Verified Pass, Conditional, or Pending Verification*), 4-cell zoning fact grid, allowable use breakdown, and regulatory trace details.
  * 📍 **Corridor & Due Diligence**: Title and permit readiness checklist, barangay jurisdiction, and a direct launch button to Map Explorer with the 500m buffer zone ring.
* **Direct Print & PDF Export (LEBDO-08)**: Dedicated `@media print` engine formatting the priority board into a clean, official Sangguniang Panlungsod / LEBDO investment report with city headers and date stamps.

### 🗺️ Spatial Intelligence & Live Map Explorer (`property-explorer.php`)
* **Interactive Leaflet & MapLibre Engine**: Explore commercial corridors with live boundary geometry, clustered property markers, and spatial overlays (*Poro Point Peninsula, City Center Commercial Spine, and Coastal Tourism Belt*).
* **Corridor Filter Terminal**: Search by investment corridor, land-use zoning, price per square meter, road frontage, and total parcel area.
* **Google Earth KML Export**: One-click 3D spatial terrain export (`/api/google-earth.php?id={id}`) for satellite and drone inspection.

### 🎯 Multi-Lens Investment Scoring (IAI Engine)
* **Custom Investment Theses**: Dynamically re-rank and evaluate properties based on industry sector lenses:
  * 🚚 **Logistics & Freeport Corridor** (Port proximity, container access, arterial road depth)
  * 🏢 **Office, IT & BPO Belt** (Fiber connectivity, commercial density, transit hubs)
  * 🛍️ **Commercial & Retail Center** (Foot-traffic pull, civic proximity, population density)
  * 🏖️ **Resort, Hospitality & Tourism** (Coastal proximity, scenic vista, recreation access)
  * 🏭 **Manufacturing & Industrial** (Power capacity, parcel size, industrial zoning)
  * 🎓 **University & Institutional** (Expansion footprint, student accessibility)
  * 🏥 **Hospital & Healthcare** (Emergency transit access, quiet buffer, utility redundancy)

### ⚖️ Head-to-Head Comparison & Decision Matrix (`compare-decision.php`)
* **Multi-Property Matrix Evaluation**: Compare candidate sites side-by-side across pricing, zoning compliance, hazard ratings, and due diligence completion.
* **Deterministic Recommendation Engine**: Automated opportunity matching with custom investor weightings and budget constraints.

### 📋 Due Diligence Dossier & Ground-Truth Verification
* **6-Point Verification Checklist**: Tracks and verifies Land Title copy, Tax Declaration, Certified Geodetic Survey Plan, Zoning Clearance, Site Photographs, and Environmental/Hazard Clearances.
* **LGU Ground-Truth Audits**: On-site verification timestamps and municipal compliance flags directly attached to listings.

### 🗳️ Citizen & Investor Demand Voting (`voting-dashboard.php`)
* **Hyperlocal Community Signals**: Residents and investors vote on commercial gaps per barangay (e.g., Diagnostics Clinic, 24/7 Convenience, Specialty Café, Co-Working Space, Hardware Depot).
* **Demand-to-Supply Matching**: Connects community voting demand to adjacent vacant properties to identify high-conviction development opportunities.

### 👥 Multi-Role Workspaces
* **🧑‍💼 Investor Portal**: Shortlist properties, compare portfolios, generate decision reports, cast demand votes, and message property sellers directly.
* **🏢 Seller Portal**: Submit listings, upload legal proof documents, track due diligence approval stages, and respond to buyer inquiries.
* **🛡️ Admin Command Center**: Full inventory CRUD, document audit workflows, showcase curator, user management, and city-wide analytics.

---

## 🔍 Acceptance-Readiness Audit (UAT)

LOCUS-SF has undergone a comprehensive, evidence-based technical audit against all 30 criteria from the authoritative *LOCUS-SF UAT Questionnaire.docx* and the approved thesis manuscript (*Tadifa et al., April 2026*). 

The full traceable audit report is published at **[`docs/uat-audit.md`](./docs/uat-audit.md)**.

### Outcome Summary

| Office Group | Criteria Range | Pass | Partial | Fail | Total |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **City Assessor's Office (CAO)** | System Admin & Property Encoding (CAO-01..10) | 2 | 3 | 5 | 10 |
| **Economic Development (LEBDO)** | Economic Analytics & Ranking (LEBDO-01..10) | 2 | 6 | 2 | 10 |
| **ICT Office (CICTO)** | System Integrity & Infrastructure (CICTO-01..10) | 6 | 3 | 1 | 10 |
| **Total Evaluation** | **30 Authoritative Criteria** | **10** | **12** | **8** | **30** |

* **Quantitative Performance Benchmarks**: Property saving verified at median **252.39 ms**, ranking dashboard at median **258.94 ms**, and view-switching at median **523.37 ms** — all significantly faster than the required 2.0-second threshold.
* **Pre-UAT Action Items**: Prioritized backlog documented in [`docs/uat-audit.md`](./docs/uat-audit.md#prioritized-implementation-repair-backlog) covering LGU office role creation, map pin-drop encoding, BIR zonal values, 500m competitor radar layer, and hazard screening.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies | Key Highlights |
| :--- | :--- | :--- |
| **Frontend** | HTML5, Modern Vanilla CSS3, JavaScript (ES6+ Modules) | Zero heavy JS framework overhead; custom design tokens, glassmorphism, responsive navigation down to 320px |
| **Mapping & GIS** | Leaflet.js 1.9.4, MapLibre GL, OpenStreetMap, CARTO Basemaps | Real-time geospatial rendering, polygon overlays, interactive GPS markers |
| **Backend Core** | PHP 8.1+ (Native OOP) | Repository-Service pattern, PSR-compliant structure, robust error handling, session security |
| **Database** | MySQL 8.0+ / MariaDB 10.4+ | InnoDB engine, foreign keys, UTF8mb4 charset, indexed spatial lookups, transactional audit logs |
| **External APIs** | LocationIQ, OpenWeather, NewsAPI, Alpha Vantage, Google Gemini | Reverse geocoding, parcel microclimate, economic news, and AI opportunity synthesis (all with graceful fallbacks) |

---

## 🚀 Getting Started

### Prerequisites
* **[XAMPP](https://www.apachefriends.org/)** (PHP 8.1+ & MySQL 8.0+ / MariaDB) or an equivalent Apache/PHP/MySQL web server.
* **Git** installed on your system.

### Step-by-Step Installation

1. **Clone the repository** into your web server root (`htdocs`):
   ```bash
   cd c:/xampp/htdocs
   git clone https://github.com/justinetadifa/BIZSTART.git sfcelerate-bizstart
   ```

2. **Start Web & Database Services**:
   * Open the **XAMPP Control Panel**.
   * Start both **Apache** and **MySQL** services.

3. **Import the Database**:
   * Open your web browser and visit **[http://localhost/phpmyadmin/](http://localhost/phpmyadmin/)**.
   * Create a new database named **`sfcelerate-bizstart`** (or `sfcelerate_bizstart_local_20260922_100254`).
   * Click **Import** and upload [`database/setup.sql`](./database/setup.sql). This executes the complete table schema and injects initial sample properties, users, and audit fixtures.

4. **Environment Configuration (Optional)**:
   * By default, the application runs out of the box with `localhost:3306`, user `root`, and an empty password.
   * To add custom database credentials or external API keys (Gemini AI, LocationIQ, OpenWeather), copy the example configuration:
     ```bash
     cp app/config.local.php.example app/config.local.php
     ```

5. **Launch Application**:
   * Open your browser and navigate to:
     ```text
     http://localhost/sfcelerate-bizstart/
     ```

---

## 🔑 Demo Accounts

For testing all roles and permissions, use the following pre-seeded demo accounts:

| Role | Email Address | Password | Capabilities & Access |
| :--- | :--- | :--- | :--- |
| **🛡️ Administrator** | `admin@sfcelerate.local` | `Admin123!` | Full property CRUD, document verification, ground-truth audit logs, showcase manager |
| **🏢 Property Seller** | `seller@sfcelerate.local` | `Seller123!` | Submit property listings, upload 6-point due diligence documents, view buyer inquiries |
| **🧑‍💼 Private Investor** | `investor@sfcelerate.local` | `Investor123!` | Shortlist candidates, run 3-way matrix compare, cast demand votes, generate PDF reports |

---

## 📁 Project Directory Structure

```text
sfcelerate-bizstart/
├── api/                        # RESTful JSON API Endpoints
│   ├── _bootstrap.php          # API middleware, session handler & JSON response helpers
│   ├── properties.php          # Property catalogue listing, searching & corridor filters
│   ├── property.php            # Single parcel dossier, readiness scores & media
│   ├── cart.php                # Shortlist favorites and compare matrix queue
│   ├── votes.php               # Hyperlocal demand votes & barangay tallies
│   ├── due-diligence.php       # 6-point verification documents review & uploads
│   ├── messages.php            # Direct investor-to-seller inquiry threads
│   ├── google-earth.php        # Dynamic 3D KML GIS boundary exporter
│   ├── external-*.php          # Graceful proxies for AI synthesis, Weather & News
│   └── health.php              # Automated system & database diagnostics ping
├── app/                        # Modular Backend Application Core
│   ├── Core/                   # Database singleton (PDO) & SchemaManager
│   ├── Repositories/           # Data access layer (Property, User, Vote, AuditLog)
│   ├── Support/                # Auth guards, HTML renderers, GIS utilities & helpers
│   ├── config.php              # System configuration & environment defaults
│   └── config.local.php.example# Template for local environment overrides
├── assets/                     # Frontend Design System & Static Media
│   ├── css/
│   │   ├── portal.css          # Core design tokens, layout grid & card styling
│   │   ├── ranking.css         # Dedicated Priority Board Master-Detail studio & print layout
│   │   ├── welcome.css         # Cinematic welcome screen & spatial beacon styles
│   │   ├── preloader.css       # Non-blocking initial portal loader
│   │   ├── navigation.css      # Responsive mobile navigation menu
│   │   ├── discovery.css       # City discovery & top opportunity components
│   │   └── reports.css         # Printable investment prospectus styling
│   ├── js/
│   │   ├── portal.js           # Core state management, modal controllers & ranking engine
│   │   ├── welcome.js          # Particle physics, 3D cursor parallax & beacon locks
│   │   ├── preloader.js        # Smooth loader dismissal lifecycle
│   │   └── navigation.js       # Mobile navigation toggle controller
│   └── images/                 # Listing photography, brand logos & SVG iconography
├── data/                       # Offline JSON datasets & CLUP governance records
├── database/                   # Database Scripts & Fixtures
│   ├── schema.sql              # Clean DDL table schemas with foreign keys & indexes
│   ├── seed.sql                # Default properties, users & demand fixtures
│   └── setup.sql               # Single-file complete database installer
├── docs/                       # Architectural Specifications & Research Documentation
│   └── uat-audit.md            # Traceable 30-item acceptance-readiness audit report
├── index.php                   # Public Homepage, Hero Overview & Spatial Brief
├── property-explorer.php       # Interactive GIS Map & Spatial Search Terminal
├── property-ranking.php        # Multi-Lens Scoreboards & Investment Ranking Studio
├── property-details.php        # Complete Parcel Due Diligence Dossier
├── compare-decision.php        # Multi-Property Comparison & Matrix Decision Engine
├── voting-dashboard.php        # Barangay Community Demand Sentiment & Voting
├── reports.php                 # Investment Reports & Print Prospectus Generator
├── seller-dashboard.php        # Seller Listing Management & Inquiries
├── admin-dashboard.php         # Administrator Command Center
└── admin-properties.php        # Admin Inventory Management & Document Verification
```

---

## 🔒 Security & Performance Principles

* **Prepared Statements**: 100% of SQL interactions use PDO prepared statements with strict parameter binding to eliminate SQL injection vulnerabilities.
* **XSS Neutralization**: User inputs and database outputs in templates are sanitized using `htmlspecialchars()` with UTF-8 encoding.
* **Graceful API Degradation**: Third-party services (Gemini AI, LocationIQ, OpenWeather) feature local file-caching and structured offline fallbacks so the application functions seamlessly even without external API keys.
* **Strict Session Management**: Role-based access control with HttpOnly session cookies, CSRF defenses, and authentication gates on all administrative and seller routes.

---

## 📄 License

This software is released under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 🎓 Academic Credits

Developed as an undergraduate Capstone Project in Information Technology:

* **Degree Program:** Bachelor of Science in Information Technology (BSIT)
* **Institution:** Don Mariano Marcos Memorial State University — Mid La Union Campus (DMMMSU-MLUC)
* **Location:** City of San Fernando, La Union 2500, Philippines
* **Authors:** Justine Tadifa, Dizon, Estilong (April 2026)

<div align="center">
  <sub>Developed for <strong>LOCUS-SF • SFCelerate BizStart Platform</strong> • San Fernando City, La Union</sub>
</div>
