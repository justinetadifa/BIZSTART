# SFCelerate BizStart

XAMPP-ready property discovery and investment workflow app built with:

- Apache
- PHP
- MySQL
- JavaScript
- JSON

## What changed

The old React/Vite + Node/Express + Prisma setup has been replaced with a PHP/MySQL application.

Reusable material preserved from the previous repository:

- listing images in [`assets/images`](./assets/images)
- the original single-file prototype in [`docs/prototype-reference.html`](./docs/prototype-reference.html)
- seeded copy/data in [`data/meta.json`](./data/meta.json), [`data/properties.json`](./data/properties.json), and [`data/sample-data.json`](./data/sample-data.json)

## New structure

- [`index.php`](./index.php): landing page
- [`admin-login.php`](./admin-login.php): admin entry
- [`investor-login.php`](./investor-login.php): investor entry
- [`admin-dashboard.php`](./admin-dashboard.php): admin workspace
- [`admin-properties.php`](./admin-properties.php): admin inventory CRUD workspace
- [`investor-dashboard.php`](./investor-dashboard.php): investor workspace
- [`property-explorer.php`](./property-explorer.php): dedicated explorer and map fallback
- [`property-details.php`](./property-details.php): dedicated property detail screen
- [`compare-decision.php`](./compare-decision.php): investor compare and recommendation screen
- [`api`](./api): PHP JSON endpoints
- [`app`](./app): config, database bootstrap, repositories, seed support
- [`assets`](./assets): CSS, JavaScript, images, icons
- [`database/schema.sql`](./database/schema.sql): MySQL schema
- [`database/seed.sql`](./database/seed.sql): sample rows only
- [`database/setup.sql`](./database/setup.sql): schema + sample rows in one import

## Codex handoff context

For future Codex chats or account handoff, use:

- [`docs/CODEX_CONTEXT.md`](./docs/CODEX_CONTEXT.md)

## Local setup with XAMPP

1. Start Apache and MySQL from XAMPP.
2. Open phpMyAdmin at `http://localhost/phpmyadmin/`.
3. Import [`database/setup.sql`](./database/setup.sql).
4. Confirm [`app/config.local.php`](./app/config.local.php) matches your local XAMPP defaults:

```text
host: localhost
port: 3306
user: root
password: empty
database: sfceleratee
```

5. Open:

```text
http://localhost/sfceleratee/
```

## Demo login credentials

For local presentation use:

```text
Admin:
admin@sfcelerate.local
Admin123!

Investor:
investor@sfcelerate.local
Investor123!

Seller:
seller@sfcelerate.local
Seller123!
```

6. Optional endpoint checks:

```text
http://localhost/sfcelerate-bizstart/api/health.php
http://localhost/sfcelerate-bizstart/api/bootstrap.php
```

## Seeding behavior

You can seed data in either of these ways:

- import [`database/setup.sql`](./database/setup.sql), which creates the schema and inserts sample rows
- import [`database/schema.sql`](./database/schema.sql) only, then let the first successful PHP request auto-seed from the JSON files in [`data`](./data) when the `properties` table is empty

That seed includes:

- property inventory
- property media
- sample due diligence records
- sample messages
- sample scenarios

## Available API endpoints

- `GET /api/bootstrap.php`
- `GET /api/property.php?id=<id>`
- `GET|POST|DELETE /api/cart.php`
- `POST /api/barangay.php`
- `GET|POST /api/due-diligence.php`
- `GET|POST /api/votes.php`
- `GET|POST|DELETE /api/messages.php`
- `GET|POST|PUT|DELETE /api/vote-options.php`
- `GET|POST /api/scenarios.php`
- `GET /api/health.php`
- `GET /api/location-search.php?q=<query>`
- `GET /api/external-market.php`
- `GET /api/external-news.php?limit=<n>`
- `GET /api/external-weather.php?propertyId=<id>`
- `GET /api/external-ai-summary.php?propertyId=<id>`

## Notes

- Weighted scoring, filtering, comparison, decision pack, due diligence, shortlist cart, image-backed voting, threaded messaging, and scenario saving are handled by vanilla JavaScript against PHP APIs.
- The explorer and property-detail screens now use a real Leaflet + OpenStreetMap map with live property markers.
- LocationIQ, Alpha Vantage, NewsAPI, Gemini/OpenRouter, Cloudinary, and OpenWeather are integrated through optional PHP service layers with graceful fallbacks and file caching.
- Without external API keys, the platform still works locally through seeded or structured fallback data under a standard XAMPP setup.
- Investor accounts are now database-backed, and the investor login page supports sign-up for unique local accounts.
- In this workspace, Apache is serving from `C:\xampp\New folder\htdocs`, so the live project path here is `C:\xampp\New folder\htdocs\sfcelerate-bizstart`.
