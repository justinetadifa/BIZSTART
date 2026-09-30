# 🏙️ SFCelerate BizStart

<div align="center">

[![PHP Version](https://img.shields.io/badge/PHP-8.1%2B-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://www.php.net/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Leaflet.js](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-Live_Tiles-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**Spatial Intelligence, Due Diligence, and Investment Decision Platform for San Fernando, La Union.**

[Features](#-key-features) • [Installation](#-getting-started) • [Demo Credentials](#-demo-accounts) • [Architecture](#-project-structure) • [API Reference](#-api-endpoints)

</div>

---

## 📖 Overview

**SFCelerate BizStart** is a full-featured spatial intelligence and investment acceleration platform tailored for the City of San Fernando, La Union. It connects investors, property sellers, city planners, and residents by transforming raw land and commercial real estate data into actionable investment intelligence.

The platform provides interactive map exploration, sector-specific investment lens scoring, crowdsourced local demand voting, due diligence tracking, and multi-property comparison matrices.

---

## ✨ Key Features

### 🗺️ Spatial Intelligence & Live Property Explorer
* **Interactive Leaflet + OpenStreetMap**: Explore properties with cluster markers, interactive bounding, and corridor overlays (Highway, Coastal, Downtown).
* **Opportunity Spotlight**: Instant deep dive into highlighted opportunities with spatial metrics and live neighborhood demand.
* **Google Earth KML Export**: 3D spatial validation and terrain export for land development assessments.

### 🎯 Investment Lens Scoring Engine
* **Sector-Specific Lenses**: Dynamically re-rank and evaluate properties based on custom lenses:
  * 🏖️ *Resort & Tourism*
  * 🚚 *Logistics & Warehousing*
  * 🏢 *Office & BPO*
  * 🛍️ *Commercial & Retail*
  * 🏭 *Light Manufacturing*
* **Multi-Pillar Readiness Model (IRIE)**: Evaluates Spatial, Infrastructure, Economic, Institutional, and Legal signals.

### 🗳️ Citizen & Investor Demand Voting
* **Crowdsourced Market Validation**: Citizens and investors vote on needed businesses per barangay (e.g., Pharmacy, Café, Co-working space, 24/7 Convenience).
* **Demand-to-Supply Matching**: Links local voting sentiment directly to adjacent commercial listings.

### ⚖️ Compare & Decision Matrix
* **Head-to-Head Comparison**: Compare up to 3 shortlisted properties across pricing, road access, zoning scores, due diligence completion, and investment readiness.
* **Decision Recommendations**: Automated winner identification based on weighted priorities and budget caps.

### 📋 Due Diligence & Ground Truth Tracking
* **6-Point Document Checklist**: Title copy, tax declaration, survey plan, zoning clearance, site photos, and environmental/hazard reports.
* **Ground Truth Auditing**: Tracks on-site inspection visits and applies confidence adjustments to opportunity scores.

### 👥 Role-Based Workspaces
* **🧑‍💼 Investor / Resident Portal**: Browse listings, save favorites, submit compare queues, cast votes, and send direct inquiries.
* **🏢 Seller Portal**: Submit listings, manage media uploads, track verification progress, and respond to buyer inquiries.
* **🛡️ Admin Command Center**: Inventory CRUD, document verification workflows, audit logs, and city-wide demand analytics.

---

## 🛠️ Tech Stack

* **Backend**: PHP 8.1+ (Native, zero heavyweight framework dependencies, modular repository pattern)
* **Database**: MySQL 8.0+ / MariaDB (InnoDB, Foreign Key constraints, UTF8mb4)
* **Frontend**: Vanilla JavaScript (ES6 Modules), HTML5, Vanilla CSS3 (Clean custom design system with Dark/Light accents)
* **Maps & Geo**: Leaflet.js, OpenStreetMap Tiles, LocationIQ Geocoding API
* **External Services (Optional with Graceful Fallbacks)**:
  * 🤖 *Gemini AI / OpenRouter* — Automated investment thesis summaries
  * ⛅ *OpenWeather* — Microclimate and environmental conditions
  * 📈 *Alpha Vantage* — Regional market benchmarks
  * 📰 *NewsAPI* — Local economic and infrastructure developments

---

## 🚀 Getting Started

### Prerequisites
* [XAMPP](https://www.apachefriends.org/) (PHP 8.1+ & MySQL) or any standard Apache/PHP/MySQL stack.
* Git

### Step-by-Step Installation

1. **Clone the repository** into your XAMPP `htdocs` directory:
   ```bash
   cd c:/xampp/htdocs
   git clone https://github.com/justinetadifa/BIZSTART.git sfceleratee
   ```

2. **Start Services**:
   * Open the **XAMPP Control Panel**.
   * Start both **Apache** and **MySQL**.

3. **Import Database**:
   * Open your browser and navigate to **[http://localhost/phpmyadmin/](http://localhost/phpmyadmin/)**.
   * Create a new database named **`sfceleratee`**.
   * Click **Import** and select [`database/setup.sql`](./database/setup.sql) (this creates all tables and inserts initial seed data).

4. **Configuration (Optional)**:
   * Copy [`app/config.local.php.example`](./app/config.local.php.example) to `app/config.local.php`:
     ```bash
     cp app/config.local.php.example app/config.local.php
     ```
   * The default settings connect to `localhost:3306` with user `root` and an empty password.
   * Add any external API keys (Gemini, LocationIQ, OpenWeather) if you wish to enable live external integrations.

5. **Launch Application**:
   * Open your browser and visit:
     ```text
     http://localhost/sfceleratee/
     ```

---

## 🔑 Demo Accounts

For testing all roles and permissions, use the following demo credentials:

| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **🛡️ Admin** | `admin@sfcelerate.local` | `Admin123!` | Full inventory CRUD, document approvals, ground-truth audits, showcase management |
| **🏢 Seller** | `seller@sfcelerate.local` | `Seller123!` | Submit & edit listings, upload due diligence files, track buyer inquiries |
| **🧑‍💼 Investor** | `investor@sfcelerate.local` | `Investor123!` | Shortlist properties, compare matrices, cast demand votes, request documents |

---

## 📁 Project Structure

```text
sfceleratee/
├── api/                        # JSON API Endpoints
│   ├── _bootstrap.php          # API middleware & response helper
│   ├── bootstrap.php           # Core application state & inventory
│   ├── properties.php          # Property listing & filtering
│   ├── property.php            # Single property details
│   ├── cart.php                # Shortlist & comparison queue
│   ├── votes.php               # Demand voting endpoints
│   ├── due-diligence.php       # DD checklist & verification status
│   ├── messages.php            # Direct seller-investor messaging
│   └── external-*.php          # Service proxies (AI, Weather, News)
├── app/                        # Backend Application Core
│   ├── Core/                   # Database PDO singleton & Schema manager
│   ├── Repositories/           # Data access layer (Properties, Votes, Users, etc.)
│   ├── Support/                # Auth, Helpers, External services, View renderers
│   ├── config.php              # Base configuration
│   └── config.local.php.example# Local environment overrides
├── assets/                     # Frontend Assets
│   ├── css/
│   │   ├── app.css             # Base utility styles
│   │   └── portal.css          # Platform design system & page layouts
│   ├── js/
│   │   ├── api.js              # Frontend API client
│   │   ├── portal.js           # Core state management & page controllers
│   │   └── utils.js            # Formatters, calculations & scoring helpers
│   └── images/                 # Listing photography & platform icons
├── data/                       # Fallback JSON datasets for offline seeding
├── database/                   # Database Migrations & Seeds
│   ├── schema.sql              # Clean DDL table schemas
│   ├── seed.sql                # Default property & user fixtures
│   └── setup.sql               # Single-file complete DB installer
├── docs/                       # Project Documentation & Architecture Guides
│   └── CODEX_CONTEXT.md        # Technical design context & architecture specs
├── property-explorer.php       # Interactive Leaflet Map & Spatial Filter Terminal
├── property-ranking.php        # Editorial Scoreboards & Lens Rankings
├── property-details.php        # Comprehensive Property Due Diligence Dossier
├── compare-decision.php        # Multi-Property Comparison & Matrix Engine
├── voting-dashboard.php        # Barangay Demand Sentiment & Community Voting
├── offer-board.php             # Curated Timed Investment Releases
├── city-pipeline.php           # City Development Pipeline & Future Infrastructure
└── index.php                   # Public Homepage & Hero Stage
```

---

## 🔌 API Endpoints

All endpoints return standardized JSON payloads formatted as `{ "ok": true, "data": { ... } }`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/bootstrap.php` | Full client bootstrap (properties, user session, service status) |
| `GET` | `/api/property.php?id={id}` | Detailed property dossier with pillars, media, and DD checklist |
| `GET/POST` | `/api/properties.php` | Property listing with search query, corridor, and type filters |
| `GET/POST/DEL` | `/api/cart.php` | Manage compare and favorite queues |
| `GET/POST` | `/api/votes.php` | Retrieve demand tallies and cast community votes |
| `GET/POST` | `/api/due-diligence.php` | Submit/review property due diligence document items |
| `GET/POST/DEL` | `/api/messages.php` | Threaded inquiries between investors and property sellers |
| `GET` | `/api/location-search.php?q={query}` | Geocoding search via LocationIQ with local fallback |
| `GET` | `/api/google-earth.php?id={id}` | Export property coordinates and bounds as a `.kml` file |
| `GET` | `/api/health.php` | System status, database ping, and environment checks |

---

## 🔒 Security & Best Practices

* **Prepared Statements**: All database operations use PDO prepared statements with strict parameter binding to eliminate SQL injection risks.
* **XSS Prevention**: Output data in templates is escaped using `htmlspecialchars()` with UTF-8 encoding.
* **Environment Isolation**: Sensitive configuration (`config.local.php`, session cookies) is excluded from version control via [`.gitignore`](./.gitignore).
* **Strict Session Security**: Session management uses HttpOnly cookies and role validation gates across restricted routes.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<div align="center">
  <sub>Developed for the <strong>SFCelerate BizStart Platform</strong> • San Fernando, La Union</sub>
</div>
