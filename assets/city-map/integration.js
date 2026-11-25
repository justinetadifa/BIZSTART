/* LOCUS SF — Official Establishment Schema Integration, Barangay Resolver & Pin Review Engine
 *
 * Design principles:
 * 1. Never invent businesses, floor counts, measured heights, or fabricate coordinates.
 * 2. Keep official thesis listings strictly distinct from OpenStreetMap community data.
 * 3. Join official records by stable ID first, or by an explicitly reviewed coordinate match.
 * 4. Preserve multiple establishments occupying the same building footprint.
 * 5. Link establishments to buildings by:
 *      (a) explicit building_id / manually reviewed building link first,
 *      (b) exact map-based point-in-footprint containment (labeled "Map-based match"),
 *      (c) NEVER silently snapping sidewalk or between-building pins to the nearest building —
 *          keep them selectable as separate pins and flag the building match for review!
 * 6. Support interactive pin-to-building review curation with localStorage persistence &
 *    reviewed_matches.json export/import — never mislabeling community OSM pins as official.
 */

const LOCUS_SCHEMA_CONFIG = {
  idFields: ['official_id', 'establishment_id', 'business_id', 'permit_no', 'id'],
  nameFields: ['business_name', 'establishment_name', 'trade_name', 'name'],
  categoryFields: ['category', 'business_type', 'line_of_business', 'industry', 'kind'],
  barangayFields: ['barangay', 'brgy', 'district'],
  addressFields: ['address', 'street_address', 'location_address', 'unit_floor'],
  unitFields: ['unit', 'suite', 'floor', 'stall_no'],
  buildingIdFields: ['building_id', 'building_key', 'structure_id'],
  buildingNameFields: ['building_name', 'complex_name', 'mall_name'],
  latFields: ['latitude', 'lat', 'y'],
  lngFields: ['longitude', 'lng', 'lon', 'x'],
  coordSourceFields: ['coordinate_source', 'coord_source', 'geo_source', 'source'],
  verifiedDateFields: ['verified_at', 'verification_date', 'coord_verified_date', 'last_verified'],
  statusFields: ['status', 'permit_status', 'record_status'],
  heightFields: ['measured_height_m', 'building_height_m', 'height_m'],
  reviewedMatchIdFields: ['reviewed_osm_index', 'osm_match_index', 'community_match_id'],
  reviewedByFields: ['reviewed_by', 'match_reviewed_by'],
  reviewedAtFields: ['reviewed_at', 'match_reviewed_at']
};

(function (global) {
  const REVIEW_STORAGE_KEY = 'locus-sf-reviewed-matches-v1';

  function pickField(obj, candidates) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const key of candidates) {
      if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
        return obj[key];
      }
    }
    return undefined;
  }

  function toFiniteNumber(v) {
    if (v === undefined || v === null || String(v).trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function pointInRing(lng, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function isInsideCityBoundary(lng, lat, boundaryFeature) {
    if (!boundaryFeature || !boundaryFeature.geometry) return true;
    const coords = boundaryFeature.geometry.coordinates;
    if (boundaryFeature.geometry.type === 'Polygon') return pointInRing(lng, lat, coords[0]);
    if (boundaryFeature.geometry.type === 'MultiPolygon') return coords.some(poly => pointInRing(lng, lat, poly[0]));
    return true;
  }

  function classifyCategoryGroup(category) {
    const k = String(category || '').toLowerCase();
    if (/restaurant|fast food|fast_food|cafe|bakery|bar|ice cream|food|confectionery|coffee|tea|pastry|donut|diner/.test(k)) return 'food';
    if (/bank|atm|insurance|finance|money|pawn|credit|remittance|cooperative/.test(k)) return 'banks';
    if (/pharmacy|clinic|hospital|dentist|doctor|chemist|optician|veterinary|medical|health|drug|lab/.test(k)) return 'health';
    if (/school|college|university|kindergarten|townhall|government|police|fire|church|christian|worship|museum|court|post|library|civic|barangay/.test(k)) return 'civic';
    if (/hotel|motel|hostel|guest|resort|inn|lodging|tourism|park|viewpoint|attraction|monument/.test(k)) return 'hospitality';
    return 'retail';
  }

  function createRegistry({ communityDirectory, boundaryFeature, schemaConfig }) {
    const cfg = Object.assign({}, LOCUS_SCHEMA_CONFIG, schemaConfig || {});
    let buildingMatcher = null;

    // Manual reviewed pin-to-building links stored cleanly by record uid (persisted in localStorage)
    const manualLinksByUid = new Map();
    try {
      const saved = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) {
        for (const item of saved) {
          if (item && item.uid && item.building_id) manualLinksByUid.set(String(item.uid), item);
        }
      }
    } catch {}

    function persistManualLinks() {
      try {
        localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify([...manualLinksByUid.values()]));
      } catch {}
    }

    const communityRecords = (communityDirectory || []).map(([name, kind, lng, lat], idx) => ({
      uid: `osm-${idx}`,
      osmIndex: idx,
      sourceType: 'community',
      sourceLabel: 'Community map snapshot (OpenStreetMap)',
      name: String(name || 'Unnamed mapped place'),
      category: String(kind || 'place').replaceAll('_', ' '),
      categoryGroup: classifyCategoryGroup(kind),
      rawCategory: String(kind || 'place'),
      barangay: null,
      barangaySource: null,
      lng: Number(lng),
      lat: Number(lat),
      hasValidCoords: Number.isFinite(Number(lng)) && Number.isFinite(Number(lat)),
      coordinateSource: 'OpenStreetMap zoom-14 POI snapshot (OpenFreeMap 2026-11-15)',
      verifiedAt: null,
      measuredHeightM: null,
      heightLabel: 'Estimated (generalized OSM building height; unmeasured)',
      explicitBuildingId: null,
      linkedBuildingId: null,
      buildingMatchType: 'pending',
      buildingMatchNote: null,
      manualReview: null,
      nearbyBuildingCount: 0,
      nearestFootprintDistM: null,
      needsBuildingReview: false,
      needsCoordinateReview: false,
      reviewReasons: []
    }));

    const officialById = new Map();
    const reviewedMatchesById = new Map();
    let officialRecords = [];
    let schemaMeta = { loaded: false, sourceName: null, loadedAt: null };
    const establishmentsByFootprint = new Map();

    function indexReviewedMatches(matches) {
      reviewedMatchesById.clear();
      if (!Array.isArray(matches)) return;
      for (const m of matches) {
        const oid = pickField(m, cfg.idFields);
        if (oid !== undefined) {
          reviewedMatchesById.set(String(oid), {
            officialId: String(oid),
            buildingId: pickField(m, cfg.buildingIdFields) || null,
            osmIndex: toFiniteNumber(pickField(m, cfg.reviewedMatchIdFields)),
            lng: toFiniteNumber(pickField(m, cfg.lngFields)),
            lat: toFiniteNumber(pickField(m, cfg.latFields)),
            coordinateSource: pickField(m, cfg.coordSourceFields) || 'Reviewed coordinate match',
            verifiedAt: pickField(m, cfg.verifiedDateFields) || pickField(m, cfg.reviewedAtFields) || null,
            reviewedBy: pickField(m, cfg.reviewedByFields) || null,
            reviewedAt: pickField(m, cfg.reviewedAtFields) || null,
            note: m.note || m.match_note || null
          });
        }
      }
    }

    function computeRecordFootprintMatch(rec) {
      // Resolve exact official PSGC barangay via bundled barangay polygons if available
      if (rec.hasValidCoords && buildingMatcher && buildingMatcher.findOfficialBarangayAt) {
        const bgy = buildingMatcher.findOfficialBarangayAt(rec.lng, rec.lat);
        if (bgy) {
          if (!rec.barangay || rec.sourceType === 'community') {
            rec.barangay = bgy.name;
            rec.barangaySource = `PSGC ${bgy.psgc} boundary polygon`;
          }
        }
      }

      if (!rec.hasValidCoords) {
        rec.linkedBuildingId = null;
        rec.buildingMatchType = 'unmapped';
        rec.buildingMatchNote = 'No valid coordinates to match to a building footprint.';
        rec.needsBuildingReview = false;
        rec.manualReview = null;
        return;
      }

      // 0. Check interactive manually reviewed link first (persisted by auditor)
      const manual = manualLinksByUid.get(rec.uid);
      if (manual && buildingMatcher) {
        const directMeta = buildingMatcher.getBuildingById(manual.building_id);
        if (directMeta) {
          rec.linkedBuildingId = directMeta.id;
          rec.buildingMatchType = 'verified_link';
          rec.manualReview = manual;
          rec.buildingMatchNote = `Manually linked to footprint ${directMeta.id} by ${manual.reviewed_by || 'Auditor'} on ${manual.reviewed_at || 'today'}.`;
          rec.needsBuildingReview = false;
          return;
        }
      }
      rec.manualReview = null;

      // 1. Prefer explicit building_id or imported reviewed match
      if (rec.explicitBuildingId && buildingMatcher) {
        const directMeta = buildingMatcher.getBuildingById(rec.explicitBuildingId);
        if (directMeta) {
          rec.linkedBuildingId = directMeta.id;
          rec.buildingMatchType = rec.joinMethod === 'reviewed_coordinate_match' ? 'verified_link' : 'explicit_id';
          rec.buildingMatchNote = rec.buildingMatchType === 'verified_link'
            ? `Linked via reviewed building ID (${rec.explicitBuildingId}).`
            : `Linked via explicit building ID (${rec.explicitBuildingId}).`;
          rec.needsBuildingReview = false;
          return;
        }
      }

      if (!buildingMatcher) {
        rec.buildingMatchType = 'pending';
        return;
      }

      const res = buildingMatcher.matchPointSync(rec.lng, rec.lat);
      if (res.status === 'tile_pending') {
        rec.buildingMatchType = 'pending';
        return;
      }

      if (res.status === 'inside_footprint' && res.building) {
        rec.linkedBuildingId = res.building.id;
        rec.nearbyBuildingCount = res.nearbyCount;
        rec.nearestFootprintDistM = 0;
        rec.buildingMatchType = 'map_based';
        rec.buildingMatchNote = 'The mapped point falls inside this footprint. Occupancy has not been verified.';
        rec.needsBuildingReview = false;
      } else {
        rec.linkedBuildingId = null;
        rec.buildingMatchType = 'uncertain';
        rec.nearbyBuildingCount = res.nearbyCount || 0;
        rec.nearestFootprintDistM = res.nearestDistM;
        rec.needsBuildingReview = true;
        if (res.nearbyCount >= 2 && res.nearestDistM !== null) {
          rec.buildingMatchNote = `Pin falls outside mapped footprints (~${res.nearestDistM} m from nearest wall, between ${res.nearbyCount} nearby buildings). Kept as a separate pin for review.`;
        } else if (res.nearestDistM !== null && res.nearestDistM <= 15) {
          rec.buildingMatchNote = `Pin sits outside mapped footprints (likely sidewalk/curb, ~${res.nearestDistM} m from nearest wall). Kept as a separate pin — not auto-assigned.`;
        } else {
          rec.buildingMatchNote = 'Pin does not fall inside any mapped building footprint in the bundled snapshot. Kept as a separate pin for review.';
        }
      }
    }

    function rebuildFootprintIndex() {
      establishmentsByFootprint.clear();
      const register = (rec) => {
        computeRecordFootprintMatch(rec);
        if (!rec.linkedBuildingId) return;
        const key = rec.linkedBuildingId;
        if (!establishmentsByFootprint.has(key)) {
          establishmentsByFootprint.set(key, { official: [], community: [] });
        }
        const bucket = establishmentsByFootprint.get(key);
        if (rec.sourceType === 'official') bucket.official.push(rec);
        else bucket.community.push(rec);
      };
      for (const r of officialRecords) register(r);
      for (const r of communityRecords) register(r);
    }

    function setBuildingMatcher(matcher) {
      buildingMatcher = matcher;
      rebuildFootprintIndex();
    }

    // Interactive Pin-to-Building curation API (saves verified link without mislabeling community data as official!)
    function linkRecordToBuilding(uid, buildingMeta, reviewerName = 'Thesis Auditor', note = '') {
      const rec = getRecordByUid(uid);
      if (!rec || !buildingMeta) return null;
      const today = new Date().toISOString().slice(0, 10);
      const entry = {
        uid: rec.uid,
        source_type: rec.sourceType,
        official_id: rec.officialId || null,
        reviewed_osm_index: rec.sourceType === 'community' ? rec.osmIndex : null,
        name: rec.name,
        category: rec.category,
        building_id: buildingMeta.id,
        barangay: buildingMeta.officialBarangay?.name || rec.barangay || null,
        latitude: rec.lat,
        longitude: rec.lng,
        original_lat: rec.lat,
        original_lng: rec.lng,
        coordinate_source: 'Manual map review (LOCUS SF)',
        reviewed_by: String(reviewerName || 'Thesis Auditor').trim() || 'Thesis Auditor',
        reviewed_at: today,
        note: note || `Linked pin to footprint ${buildingMeta.id}`
      };
      manualLinksByUid.set(rec.uid, entry);
      persistManualLinks();
      rebuildFootprintIndex();
      return entry;
    }

    function unlinkManualReview(uid) {
      if (!manualLinksByUid.has(uid)) return false;
      manualLinksByUid.delete(uid);
      persistManualLinks();
      rebuildFootprintIndex();
      return true;
    }

    function importManualLinks(items) {
      if (!Array.isArray(items)) return 0;
      let added = 0;
      for (const item of items) {
        if (!item || !item.building_id) continue;
        let uid = item.uid || null;
        if (!uid && item.official_id) uid = `official-${item.official_id}`;
        if (!uid && Number.isFinite(Number(item.reviewed_osm_index))) uid = `osm-${Number(item.reviewed_osm_index)}`;
        if (!uid) continue;
        manualLinksByUid.set(String(uid), { ...item, uid: String(uid) });
        added++;
      }
      persistManualLinks();
      rebuildFootprintIndex();
      return added;
    }

    function clearManualLinks() {
      manualLinksByUid.clear();
      persistManualLinks();
      rebuildFootprintIndex();
    }

    function getManualLinks() {
      return [...manualLinksByUid.values()];
    }

    function classifyBuildingCoverage(buildingId) {
      const bucket = establishmentsByFootprint.get(buildingId);
      if (!bucket) return 'unlinked';
      if (bucket.official.length > 0) return 'official';
      if (bucket.community.length >= 2) return 'multi';
      if (bucket.community.length === 1) return 'community';
      return 'unlinked';
    }

    // Return real matched architectural category profile for a building (never inventing tenants!)
    function getBuildingCategoryProfile(buildingId) {
      const bucket = establishmentsByFootprint.get(buildingId);
      if (!bucket) return null;
      const all = [...bucket.official, ...bucket.community];
      if (!all.length) return null;
      const counts = {};
      for (const r of all) {
        const g = r.categoryGroup || 'retail';
        counts[g] = (counts[g] || 0) + 1;
      }
      // Pick dominant verified category (preferring distinctive civic/health/banks/food when tied)
      const priority = ['health', 'banks', 'civic', 'food', 'hospitality', 'retail'];
      let best = 'retail', bestN = -1;
      for (const g of priority) {
        const n = counts[g] || 0;
        if (n > bestN && n > 0) { bestN = n; best = g; }
      }
      return {
        category: best,
        tenantCount: all.length,
        hasOfficial: bucket.official.length > 0
      };
    }

    function normalizeOfficialRecord(raw, idx) {
      const rawId = pickField(raw, cfg.idFields);
      const stableId = rawId !== undefined ? String(rawId).trim() : null;
      const name = String(pickField(raw, cfg.nameFields) || 'Untitled Official Record').trim();
      const category = String(pickField(raw, cfg.categoryFields) || 'Registered establishment').replaceAll('_', ' ');
      const barangay = pickField(raw, cfg.barangayFields) || null;
      const address = pickField(raw, cfg.addressFields) || null;
      const unit = pickField(raw, cfg.unitFields) || null;
      const buildingId = pickField(raw, cfg.buildingIdFields) || null;
      const buildingName = pickField(raw, cfg.buildingNameFields) || null;
      const status = pickField(raw, cfg.statusFields) || 'Official record';
      const measuredHeight = toFiniteNumber(pickField(raw, cfg.heightFields));

      const reviewed = stableId ? reviewedMatchesById.get(stableId) : null;
      const inlineOsmIdx = toFiniteNumber(pickField(raw, cfg.reviewedMatchIdFields));

      let lat = toFiniteNumber(pickField(raw, cfg.latFields));
      let lng = toFiniteNumber(pickField(raw, cfg.lngFields));
      let coordinateSource = pickField(raw, cfg.coordSourceFields) || null;
      let verifiedAt = pickField(raw, cfg.verifiedDateFields) || null;
      let joinMethod = stableId ? 'stable_id' : 'unkeyed_row';
      let matchedCommunityUid = null;

      if (reviewed) {
        joinMethod = 'reviewed_coordinate_match';
        if (reviewed.lng !== null && reviewed.lat !== null) {
          lng = reviewed.lng; lat = reviewed.lat;
        } else if (reviewed.osmIndex !== null && communityRecords[reviewed.osmIndex]) {
          lng = communityRecords[reviewed.osmIndex].lng;
          lat = communityRecords[reviewed.osmIndex].lat;
          matchedCommunityUid = communityRecords[reviewed.osmIndex].uid;
        }
        coordinateSource = reviewed.coordinateSource || coordinateSource || 'Reviewed coordinate match';
        verifiedAt = reviewed.verifiedAt || verifiedAt;
      } else if (inlineOsmIdx !== null && communityRecords[inlineOsmIdx]) {
        matchedCommunityUid = communityRecords[inlineOsmIdx].uid;
        if (lat === null || lng === null) {
          lng = communityRecords[inlineOsmIdx].lng;
          lat = communityRecords[inlineOsmIdx].lat;
          joinMethod = 'reviewed_coordinate_match';
          coordinateSource = coordinateSource || 'Reviewed community coordinate match';
        }
      }

      const reviewReasons = [];
      if (!stableId) reviewReasons.push('missing_stable_id');
      let hasValidCoords = false;
      if (lat === null || lng === null) reviewReasons.push('missing_coordinates');
      else if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) reviewReasons.push('invalid_coordinates');
      else if (!isInsideCityBoundary(lng, lat, boundaryFeature)) reviewReasons.push('outside_city_boundary');
      else hasValidCoords = true;
      if (hasValidCoords && !coordinateSource) reviewReasons.push('missing_coordinate_source');
      if (hasValidCoords && !verifiedAt) reviewReasons.push('missing_verification_date');

      const explicitBId = buildingId
        ? String(buildingId).trim()
        : (reviewed && reviewed.buildingId ? String(reviewed.buildingId).trim() : null);

      return {
        uid: `official-${stableId || ('row-' + idx)}`,
        officialId: stableId,
        sourceType: 'official',
        sourceLabel: 'Official LOCUS SF listing',
        name,
        category,
        categoryGroup: classifyCategoryGroup(category),
        barangay,
        barangaySource: barangay ? 'Official LOCUS SF record' : null,
        address,
        unit,
        buildingId: explicitBId,
        explicitBuildingId: explicitBId,
        buildingName: buildingName ? String(buildingName).trim() : null,
        linkedBuildingId: null,
        buildingMatchType: 'pending',
        buildingMatchNote: null,
        manualReview: null,
        nearbyBuildingCount: 0,
        nearestFootprintDistM: null,
        needsBuildingReview: false,
        status,
        lng: hasValidCoords ? lng : null,
        lat: hasValidCoords ? lat : null,
        rawLng: lng,
        rawLat: lat,
        hasValidCoords,
        coordinateSource: coordinateSource || 'Not provided',
        verifiedAt: verifiedAt || 'Not provided',
        joinMethod,
        matchedCommunityUid,
        reviewedBy: reviewed ? reviewed.reviewedBy : (pickField(raw, cfg.reviewedByFields) || null),
        reviewedAt: reviewed ? reviewed.reviewedAt : (pickField(raw, cfg.reviewedAtFields) || null),
        measuredHeightM: measuredHeight,
        heightLabel: measuredHeight !== null
          ? `Measured building height: ${measuredHeight} m (Official record)`
          : 'Estimated (generalized OSM building height; unmeasured)',
        needsCoordinateReview: reviewReasons.length > 0,
        reviewReasons
      };
    }

    function loadOfficialRecords(records, options = {}) {
      if (options.schemaConfig) Object.assign(cfg, options.schemaConfig);
      if (options.reviewedMatches) indexReviewedMatches(options.reviewedMatches);
      const list = Array.isArray(records) ? records : [];
      if (!options.merge) officialById.clear();

      const nextList = [];
      for (let i = 0; i < list.length; i++) {
        const rec = normalizeOfficialRecord(list[i], i);
        if (rec.officialId) officialById.set(rec.officialId, rec);
        else nextList.push(rec);
      }
      officialRecords = [...officialById.values(), ...nextList];
      schemaMeta = {
        loaded: officialRecords.length > 0,
        sourceName: options.sourceName || 'Loaded thesis dataset',
        loadedAt: new Date().toISOString().slice(0, 10)
      };
      rebuildFootprintIndex();
      return getSummary();
    }

    function clearOfficialRecords() {
      officialById.clear();
      reviewedMatchesById.clear();
      officialRecords = [];
      schemaMeta = { loaded: false, sourceName: null, loadedAt: null };
      rebuildFootprintIndex();
      return getSummary();
    }

    function getEstablishmentsForBuilding(buildingId) {
      if (!buildingId) return { official: [], community: [] };
      const canonical = buildingMatcher && buildingMatcher.getBuildingById(buildingId)
        ? buildingMatcher.getBuildingById(buildingId).id
        : buildingId;
      const bucket = establishmentsByFootprint.get(canonical);
      if (!bucket) return { official: [], community: [] };
      return { official: bucket.official.slice(), community: bucket.community.slice() };
    }

    function getNearbyUncertainPins(buildingMeta, maxDistM = 12) {
      if (!buildingMeta || !buildingMeta.centerLL) return [];
      const [bx, by] = buildingMeta.centerLL;
      const out = [];
      const check = (r) => {
        if (!r.hasValidCoords || r.buildingMatchType !== 'uncertain') return;
        const d = Math.hypot((r.lng - bx) * 106500, (r.lat - by) * 110600);
        if (d <= Math.sqrt(buildingMeta.areaM2 || 60) * 0.75 + maxDistM) out.push(r);
      };
      for (const r of officialRecords) check(r);
      for (const r of communityRecords) check(r);
      return out;
    }

    function getBuildingGroup(record) {
      if (!record) return { official: [], community: [] };
      if (record.linkedBuildingId) return getEstablishmentsForBuilding(record.linkedBuildingId);
      if (record.explicitBuildingId) {
        return { official: officialRecords.filter(r => r.explicitBuildingId === record.explicitBuildingId), community: [] };
      }
      return {
        official: record.sourceType === 'official' ? [record] : [],
        community: record.sourceType === 'community' ? [record] : []
      };
    }

    function getRecordByUid(uid) {
      return officialRecords.find(r => r.uid === uid) || communityRecords.find(r => r.uid === uid) || null;
    }

    async function ensureRecordMatched(record) {
      if (!record || !record.hasValidCoords || !buildingMatcher) return record;
      if (record.buildingMatchType === 'pending') {
        await buildingMatcher.matchPointAsync(record.lng, record.lat);
        rebuildFootprintIndex();
      }
      return record;
    }

    function parseCSV(text) {
      const rows = [];
      let row = [], cell = '', inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i], next = text[i + 1];
        if (inQuotes) {
          if (ch === '"' && next === '"') { cell += '"'; i++; }
          else if (ch === '"') inQuotes = false;
          else cell += ch;
        } else {
          if (ch === '"') inQuotes = true;
          else if (ch === ',') { row.push(cell); cell = ''; }
          else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && next === '\n') i++;
            row.push(cell); cell = '';
            if (row.some(c => c.trim() !== '')) rows.push(row);
            row = [];
          } else cell += ch;
        }
      }
      if (cell.length || row.length) {
        row.push(cell);
        if (row.some(c => c.trim() !== '')) rows.push(row);
      }
      if (rows.length < 2) return [];
      const headers = rows[0].map(h => h.trim());
      return rows.slice(1).map(cols => {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = (cols[idx] || '').trim(); });
        return obj;
      });
    }

    function getSummary() {
      const mappedOfficial = officialRecords.filter(r => r.hasValidCoords);
      const flaggedOfficial = officialRecords.filter(r => r.needsCoordinateReview);
      const matchedCommunity = communityRecords.filter(r => r.buildingMatchType === 'map_based' || r.buildingMatchType === 'verified_link');
      const uncertainCommunity = communityRecords.filter(r => r.buildingMatchType === 'uncertain');
      let multiTenantBuildings = 0;
      for (const b of establishmentsByFootprint.values()) {
        if (b.official.length + b.community.length >= 2) multiTenantBuildings++;
      }
      return {
        schemaMeta,
        communityCount: communityRecords.length,
        communityMatchedCount: matchedCommunity.length,
        communityUncertainCount: uncertainCommunity.length,
        manualLinksCount: manualLinksByUid.size,
        multiTenantBuildings,
        officialTotal: officialRecords.length,
        officialMappedCount: mappedOfficial.length,
        officialFlaggedCount: flaggedOfficial.length
      };
    }

    return {
      schemaConfig: cfg,
      setBuildingMatcher,
      rebuildFootprintIndex,
      ensureRecordMatched,
      classifyBuildingCoverage,
      getBuildingCategoryProfile,
      linkRecordToBuilding,
      unlinkManualReview,
      importManualLinks,
      clearManualLinks,
      getManualLinks,
      getCommunityRecords: () => communityRecords,
      getOfficialRecords: () => officialRecords,
      getMappedOfficialRecords: () => officialRecords.filter(r => r.hasValidCoords),
      getFlaggedOfficialRecords: () => officialRecords.filter(r => r.needsCoordinateReview),
      getUncertainCommunityRecords: () => communityRecords.filter(r => r.buildingMatchType === 'uncertain'),
      getReviewQueueRecords: () => [
        ...officialRecords.filter(r => r.needsCoordinateReview || r.needsBuildingReview),
        ...communityRecords.filter(r => r.needsBuildingReview)
      ],
      getRecordByUid,
      getEstablishmentsForBuilding,
      getNearbyUncertainPins,
      getBuildingGroup,
      loadOfficialRecords,
      clearOfficialRecords,
      parseCSV,
      getSummary
    };
  }

  global.LOCUS_SCHEMA_CONFIG = LOCUS_SCHEMA_CONFIG;
  global.LocusRegistry = { createRegistry };
})(window);
