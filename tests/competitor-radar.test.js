/**
 * LOCUS-SF Competitor Radar Proximity Verification Suite
 * Tests 500m competitor detection, boundary conditions, deduplication,
 * unlocated record handling, repeated lot selections, and empty states.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COMPETITOR_RADAR_RADIUS_METERS,
  BOUNDARY_TOLERANCE_METERS,
  computeGeodesicDistance,
  filterMappedCompetitors,
  deduplicateCompetitors,
  addCompetitorRadar
} from "../assets/js/competitor-radar.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

console.log("=== Running LOCUS-SF Competitor Radar Verification Suite ===\n");

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`PASS: ${name}`);
    passedTests++;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// Test 1: Data Source Integrity (competitors.json)
// -----------------------------------------------------------------------------
test("Data Source Integrity: data/competitors.json loads with expected schema", () => {
  const filePath = path.join(ROOT_DIR, "data", "competitors.json");
  assert.ok(fs.existsSync(filePath), "data/competitors.json must exist");

  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  assert.equal(data.type, "FeatureCollection");
  assert.ok(Array.isArray(data.features), "features must be an array");
  assert.equal(data.features.length, 6, "Expected 6 initial competitor features");

  // Check Jollibee Sevilla
  const sevilla = data.features.find((f) => f.id === "jollibee-sevilla");
  assert.ok(sevilla, "jollibee-sevilla must exist");
  assert.deepEqual(sevilla.geometry.coordinates, [120.318362, 16.602109]);
  assert.equal(sevilla.properties.status, "existing");
  assert.equal(sevilla.properties.checkedOn, "2026-10-03");

  // Check Jollibee Robinsons
  const robinsons = data.features.find((f) => f.id === "jollibee-robinsons");
  assert.ok(robinsons, "jollibee-robinsons must exist");
  assert.deepEqual(robinsons.geometry.coordinates, [120.318618, 16.600306]);
  assert.equal(robinsons.properties.status, "existing");
  assert.ok(robinsons.properties.note.includes("Temporarily closed"));

  // Check unlocated records
  const unlocatedIds = [
    "mcdonalds-upcoming",
    "kfc-upcoming",
    "pizza-hut-upcoming",
    "mister-donut-upcoming"
  ];
  for (const id of unlocatedIds) {
    const item = data.features.find((f) => f.id === id);
    assert.ok(item, `Feature ${id} must exist`);
    assert.equal(item.geometry, null, `${id} geometry must be strictly null`);
    assert.ok(item.properties.reportSource, `${id} must reference announcement report`);
  }
});

// -----------------------------------------------------------------------------
// Test 2: Deduplication by unique branch ID
// -----------------------------------------------------------------------------
test("Deduplication: Identical branch IDs are deduplicated", () => {
  const duplicatesFixture = [
    {
      type: "Feature",
      id: "branch-a",
      geometry: { type: "Point", coordinates: [120.318, 16.602] },
      properties: { name: "Branch A - Copy 1" }
    },
    {
      type: "Feature",
      id: "branch-a",
      geometry: { type: "Point", coordinates: [120.318, 16.602] },
      properties: { name: "Branch A - Copy 2" }
    },
    {
      type: "Feature",
      id: "branch-b",
      geometry: { type: "Point", coordinates: [120.319, 16.603] },
      properties: { name: "Branch B" }
    }
  ];

  const deduped = deduplicateCompetitors(duplicatesFixture);
  assert.equal(deduped.length, 2, "Duplicate branch-a should be consolidated");
  assert.equal(deduped[0].id, "branch-a");
  assert.equal(deduped[1].id, "branch-b");
});

// -----------------------------------------------------------------------------
// Test 3: Synthetic Boundary Tests (< 500m, = 500m, > 500m)
// -----------------------------------------------------------------------------
test("Boundary Proximity: Points strictly inside, exactly at, and outside 500m", () => {
  // Center: San Fernando City plaza coordinates: lat 16.615000, lng 120.315000
  const center = { lat: 16.615000, lng: 120.315000 };

  // 1 degree latitude = ~111,195 meters (for R = 6,371,000 m: 2 * PI * R / 360 = 111,194.9266 m)
  // Distance for deltaLat = 500 / (R * PI / 180):
  const deltaLat500m = (500 / 6371000) * (180 / Math.PI); // ~0.0044966 degrees

  // Inside: 250 meters north
  const deltaLat250m = deltaLat500m / 2;
  const insideCoord = [center.lng, center.lat + deltaLat250m];

  // At boundary: exactly 500.000000 meters north
  const atBoundaryCoord = [center.lng, center.lat + deltaLat500m];

  // Outside: 505 meters north (outside 500m radius)
  const deltaLat505m = (505 / 6371000) * (180 / Math.PI);
  const outsideCoord = [center.lng, center.lat + deltaLat505m];

  const syntheticDataset = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "poi-inside",
        geometry: { type: "Point", coordinates: insideCoord },
        properties: { name: "Inside Branch", status: "existing" }
      },
      {
        type: "Feature",
        id: "poi-at-boundary",
        geometry: { type: "Point", coordinates: atBoundaryCoord },
        properties: { name: "Boundary Branch", status: "reported_under_construction" }
      },
      {
        type: "Feature",
        id: "poi-outside",
        geometry: { type: "Point", coordinates: outsideCoord },
        properties: { name: "Outside Branch", status: "existing" }
      },
      {
        type: "Feature",
        id: "poi-unlocated",
        geometry: null,
        properties: { name: "Unlocated Branch", status: "reported_planned" }
      }
    ]
  };

  const radar = addCompetitorRadar(null, syntheticDataset);
  const result = radar.analyzeLot(center, { suppressAlert: true });

  assert.equal(result.count, 2, "Should match inside and at-boundary points (2 total)");
  assert.equal(result.unlocatedCount, 1, "Unlocated points count should be 1");
  assert.equal(result.matches.length, 2);

  const matchedIds = result.matches.map((m) => m.feature.id);
  assert.ok(matchedIds.includes("poi-inside"), "Must include poi-inside");
  assert.ok(matchedIds.includes("poi-at-boundary"), "Must include poi-at-boundary with tolerance");
  assert.ok(!matchedIds.includes("poi-outside"), "Must exclude poi-outside");

  // Verify distance ordering
  assert.ok(result.matches[0].distanceMeters <= result.matches[1].distanceMeters);
  assert.ok(Math.abs(result.matches[0].distanceMeters - 250) < 0.1);
  assert.ok(Math.abs(result.matches[1].distanceMeters - 500) < 0.001);
});

// -----------------------------------------------------------------------------
// Test 4: Real Dataset Lot Selection (Jollibee Sevilla & Robinsons)
// -----------------------------------------------------------------------------
test("Real Dataset Analysis: Evaluating real properties near Sevilla & Robinsons", () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data", "competitors.json"), "utf8"));
  const radar = addCompetitorRadar(null, data);

  // Lot right at Robinsons La Union (approx: [120.318600, 16.600300])
  const robinsonsLot = { lat: 16.600306, lng: 120.318618 };
  const robinsonsResult = radar.analyzeLot(robinsonsLot, { suppressAlert: true });

  assert.ok(robinsonsResult.count >= 1, "Robinsons lot should detect at least Robinsons Jollibee");
  assert.equal(robinsonsResult.unlocatedCount, 4, "Should report 4 unlocated records");

  // Distance between Sevilla (16.602109, 120.318362) and Robinsons (16.600306, 120.318618)
  const distBetweenJollibees = computeGeodesicDistance(
    { lat: 16.602109, lng: 120.318362 },
    { lat: 16.600306, lng: 120.318618 }
  );
  // Lat diff = ~0.001803 deg = ~200.5 m, lng diff = ~0.000256 deg = ~27.3 m -> ~202 meters
  assert.ok(distBetweenJollibees < 500, "The two Jollibee branches are within ~205m of each other");
  assert.equal(robinsonsResult.count, 2, "From Robinsons Jollibee, Sevilla is ~202m away (both inside 500m)");

  // Lot far north in San Fernando (e.g. Carlatan: lat 16.6350, lng 120.3180)
  const carlatanLot = { lat: 16.635000, lng: 120.318000 };
  const carlatanResult = radar.analyzeLot(carlatanLot, { suppressAlert: true });
  assert.equal(carlatanResult.count, 0, "Carlatan lot >3km away should detect 0 competitors in this dataset");
  assert.equal(carlatanResult.unlocatedCount, 4, "Unlocated count remains 4");
});

// -----------------------------------------------------------------------------
// Test 5: Repeated Lot Selections
// -----------------------------------------------------------------------------
test("Repeated Lot Selections: Updating positions refreshes counts consistently", () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data", "competitors.json"), "utf8"));
  const radar = addCompetitorRadar(null, data);

  // First selection: near Sevilla
  const r1 = radar.analyzeLot({ lat: 16.602109, lng: 120.318362 }, { suppressAlert: true });
  assert.equal(r1.count, 2);

  // Second selection: far north
  const r2 = radar.analyzeLot({ lat: 16.640000, lng: 120.318000 }, { suppressAlert: true });
  assert.equal(r2.count, 0);

  // Third selection: back to Sevilla
  const r3 = radar.analyzeLot({ lat: 16.602109, lng: 120.318362 }, { suppressAlert: true });
  assert.equal(r3.count, 2);
});

// -----------------------------------------------------------------------------
// Test 6: Empty or Unavailable Dataset Handling
// -----------------------------------------------------------------------------
test("Empty/Unavailable Dataset: Explicitly handled with count: null", () => {
  const emptyDataset = { type: "FeatureCollection", features: [] };
  const radar = addCompetitorRadar(null, emptyDataset);
  const result = radar.analyzeLot({ lat: 16.602, lng: 120.318 }, { suppressAlert: true });

  assert.equal(result.count, null, "Must return count: null for empty dataset (not 0)");
  assert.equal(result.matches.length, 0);
  assert.equal(result.unlocatedCount, 0);

  const datasetOnlyUnlocated = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", id: "kfc", geometry: null, properties: { name: "KFC" } }
    ]
  };
  const radar2 = addCompetitorRadar(null, datasetOnlyUnlocated);
  const result2 = radar2.analyzeLot({ lat: 16.602, lng: 120.318 }, { suppressAlert: true });

  assert.equal(result2.count, null, "Must return count: null if no mapped coordinates exist");
  assert.equal(result2.unlocatedCount, 1);
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log(`\nVerification Complete: ${passedTests}/${totalTests} tests passed.\n`);
assert.equal(passedTests, totalTests, "All verification tests must pass");
