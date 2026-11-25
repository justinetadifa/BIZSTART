/* LOCUS SF — Market Scout Optional Mission & Transparent Spatial Evidence Engine
 *
 * Implements an optional 4-step spatial scouting experience for three roles
 * (Entrepreneur, Investor, Citizen) using ONLY real packaged & loaded data:
 *   - Computes exact Haversine radius comparisons (default 500 m) around Site A & Site B
 *   - Reconciles known Official <-> Community duplicates while preserving separate branches
 *   - Distinguishes "0 mapped community records" from "Unknown official count" and
 *     explicitly flags sparse map coverage without inventing demand, foot traffic,
 *     rent, profitability, or investment returns
 *   - Tracks deduplicated inspection progress (clicking the same building repeatedly
 *     never grants extra progress)
 *   - Persists active mission progress and saved scouting briefs offline in localStorage
 */

(function (global) {
  const STATE_KEY = 'locus-sf-market-scout-v1';
  const BRIEFS_KEY = 'locus-sf-scout-briefs-v1';
  const EXPLORED_KEY = 'locus-sf-scout-explored-v1';

  // Real San Fernando, La Union starter scenarios (use real directory categories & coordinates; players can move sites anytime)
  const PRESET_MISSIONS = [
    {
      id: 'laundry-dense-vs-quiet',
      title: 'Laundry · Downtown vs. Quiet',
      subtitle: 'Barangay II (dense) vs. Santiago Norte (sparse) · 500 m',
      role: 'entrepreneur',
      category: 'laundry',
      partnerCategories: ['convenience'],
      radiusM: 500,
      siteA: { lng: 120.3168, lat: 16.6165 },
      siteB: { lng: 120.3358, lat: 16.6152 }
    },
    {
      id: 'cafe-plaza-vs-sevilla',
      title: 'Cafe · Plaza Core vs. Sevilla',
      subtitle: 'Downtown plaza corridor vs. Sevilla commercial stretch · 500 m',
      role: 'entrepreneur',
      category: 'cafe',
      partnerCategories: ['bakery', 'school'],
      radiusM: 500,
      siteA: { lng: 120.3169, lat: 16.6161 },
      siteB: { lng: 120.3176, lat: 16.6056 }
    },
    {
      id: 'pharmacy-citizen-check',
      title: 'Citizen · Nearby Pharmacy',
      subtitle: 'Find mapped pharmacies & clinics around Poblacion · 500 m',
      role: 'citizen',
      category: 'pharmacy',
      partnerCategories: [],
      radiusM: 500,
      siteA: { lng: 120.3168, lat: 16.6165 },
      siteB: null
    }
  ];

  // Contextual real-directory partner category suggestions (filtered against actual directory categories at runtime)
  const RELATED_HINTS = {
    laundry:       ['convenience', 'cafe', 'hotel', 'hostel', 'school', 'pharmacy', 'bakery'],
    cafe:          ['bakery', 'school', 'college', 'bank', 'hotel', 'books', 'office'],
    bakery:        ['cafe', 'convenience', 'school', 'supermarket', 'fast food', 'restaurant'],
    restaurant:    ['hotel', 'bank', 'cafe', 'parking', 'mall', 'bar', 'pharmacy'],
    'fast food':   ['school', 'college', 'mall', 'convenience', 'bank', 'pharmacy'],
    pharmacy:      ['hospital', 'clinic', 'dentist', 'doctors', 'optician', 'convenience'],
    clinic:        ['pharmacy', 'hospital', 'dentist', 'optician', 'parking'],
    hospital:      ['pharmacy', 'clinic', 'convenience', 'restaurant', 'parking'],
    bank:          ['insurance', 'government', 'mall', 'restaurant', 'cafe', 'hotel'],
    convenience:   ['school', 'fuel', 'hotel', 'fast food', 'laundry', 'pharmacy'],
    hardware:      ['doityourself', 'furniture', 'car repair', 'paint', 'electronics'],
    'car repair':  ['car parts', 'fuel', 'motorcycle', 'hardware', 'convenience'],
    hairdresser:   ['beauty', 'clothes', 'cafe', 'convenience', 'mall'],
    beauty:        ['hairdresser', 'clothes', 'shoes', 'cafe', 'pharmacy'],
    school:        ['books', 'stationery', 'bakery', 'convenience', 'fast food', 'cafe'],
    supermarket:   ['bank', 'pharmacy', 'bakery', 'parking', 'hardware']
  };

  function haversineM(lng1, lat1, lng2, lat2) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function normalizeName(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function makeCirclePolygon(lng, lat, radiusM, steps = 64) {
    const coords = [];
    const radians = Math.PI / 180;
    const origin = lat * radians;
    const arc = radiusM / 6371000;
    for (let i = 0; i < steps; i++) {
      const bearing = i * 2 * Math.PI / steps;
      const latitude = Math.asin(Math.sin(origin) * Math.cos(arc) + Math.cos(origin) * Math.sin(arc) * Math.cos(bearing));
      const longitude = Math.atan2(Math.sin(bearing) * Math.sin(arc) * Math.cos(origin), Math.cos(arc) - Math.sin(origin) * Math.sin(latitude));
      coords.push([lng + longitude / radians, latitude / radians]);
    }
    coords.push(coords[0].slice());
    return {
      type: 'Polygon',
      coordinates: [coords]
    };
  }

  function defaultState() {
    return {
      active: false,
      role: 'entrepreneur', // 'entrepreneur' | 'investor' | 'citizen'
      category: '',         // exact normalized category from directory (e.g. 'laundry', 'cafe')
      partnerCategories: [],// up to 3 related categories for entrepreneur/investor
      radiusM: 500,
      siteA: null,          // { lng, lat, barangay, psgc }
      siteB: null,          // { lng, lat, barangay, psgc }
      // Anti-repeat-click deduplicated inspection logs (stores unique building IDs or record UIDs per area)
      inspectedA: [],       // [{ key, label, kind: 'building'|'establishment'|'sparse_note', note? }]
      inspectedB: [],
      decision: '',         // 'site_a' | 'site_b' | 'need_more_info'
      reason: '',
      fieldQuestion: '',
      citizenActionDone: false, // saved place or flagged missing service
      citizenFlagNote: ''
    };
  }

  function createMarketScout({ registry, buildingsLayer }) {
    let state = defaultState();
    let savedBriefs = [];
    let exploredKeys = new Set();

    // Restore persisted mission progress, saved briefs & deduplicated unique-building log
    try {
      const raw = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      if (raw && typeof raw === 'object') {
        state = Object.assign(defaultState(), raw);
        if (!Array.isArray(state.partnerCategories)) state.partnerCategories = [];
        if (!Array.isArray(state.inspectedA)) state.inspectedA = [];
        if (!Array.isArray(state.inspectedB)) state.inspectedB = [];
      }
    } catch {}

    try {
      const rawBriefs = JSON.parse(localStorage.getItem(BRIEFS_KEY) || '[]');
      if (Array.isArray(rawBriefs)) savedBriefs = rawBriefs;
    } catch {}

    try {
      const rawExp = JSON.parse(localStorage.getItem(EXPLORED_KEY) || '[]');
      if (Array.isArray(rawExp)) exploredKeys = new Set(rawExp);
    } catch {}

    function persistState() {
      try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch {}
    }

    function persistBriefs() {
      try { localStorage.setItem(BRIEFS_KEY, JSON.stringify(savedBriefs)); } catch {}
    }

    function persistExplored() {
      try { localStorage.setItem(EXPLORED_KEY, JSON.stringify([...exploredKeys])); } catch {}
    }

    // Build live sorted category catalog strictly from the actual directory (+ any loaded official records)
    function getAvailableCategories() {
      const counts = new Map();
      const all = [...registry.getOfficialRecords(), ...registry.getCommunityRecords()];
      for (const r of all) {
        const c = String(r.category || '').trim().toLowerCase();
        if (!c) continue;
        if (!counts.has(c)) counts.set(c, { name: c, total: 0, official: 0, community: 0 });
        const row = counts.get(c);
        row.total++;
        if (r.sourceType === 'official') row.official++;
        else row.community++;
      }
      return [...counts.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    }

    function getSuggestedPartners(primaryCat) {
      const available = new Set(getAvailableCategories().map(c => c.name));
      const key = String(primaryCat || '').toLowerCase();
      const hints = RELATED_HINTS[key] || ['convenience', 'bank', 'cafe', 'pharmacy', 'school', 'restaurant'];
      return hints.filter(h => h !== key && available.has(h)).slice(0, 6);
    }

    // Reconcile known Official <-> Community duplicate records while preserving separate branches!
    function reconcileRecords(rawList) {
      const official = rawList.filter(r => r.sourceType === 'official');
      const community = rawList.filter(r => r.sourceType === 'community');
      const suppressedCommunityUids = new Set();
      const reconciledPairs = [];

      for (const off of official) {
        // 1. Explicit reviewed community match UID
        if (off.matchedCommunityUid) {
          const hit = community.find(c => c.uid === off.matchedCommunityUid);
          if (hit) {
            suppressedCommunityUids.add(hit.uid);
            reconciledPairs.push({ officialUid: off.uid, communityUid: hit.uid, name: off.name });
            continue;
          }
        }
        // 2. Identical normalized name inside the SAME building footprint or <= 18 m (separate branches > 18 m are preserved!)
        const offNorm = normalizeName(off.name);
        if (!offNorm) continue;
        const hit = community.find(c => {
          if (suppressedCommunityUids.has(c.uid)) return false;
          if (normalizeName(c.name) !== offNorm) return false;
          const sameBldg = off.linkedBuildingId && c.linkedBuildingId && off.linkedBuildingId === c.linkedBuildingId;
          const veryClose = haversineM(off.lng, off.lat, c.lng, c.lat) <= 18;
          return sameBldg || veryClose;
        });
        if (hit) {
          suppressedCommunityUids.add(hit.uid);
          reconciledPairs.push({ officialUid: off.uid, communityUid: hit.uid, name: off.name });
        }
      }

      const distinct = [
        ...official,
        ...community.filter(c => !suppressedCommunityUids.has(c.uid))
      ];
      return {
        distinct,
        official,
        community,
        reconciledCount: reconciledPairs.length,
        reconciledPairs
      };
    }

    function evaluateSite(site, category, partnerCategories, radiusM, includeRecord) {
      if (!site) return null;
      const catNorm = String(category || '').trim().toLowerCase();
      const partnerSet = new Set((partnerCategories || []).map(c => String(c).trim().toLowerCase()));
      const officialLoaded = registry.getOfficialRecords().length > 0;

      const allMapped = [
        ...registry.getMappedOfficialRecords(),
        ...registry.getCommunityRecords()
      ];

      const inRadiusRaw = [];
      for (const rec of allMapped) {
        if (!rec.hasValidCoords || (includeRecord && !includeRecord(rec))) continue;
        const d = haversineM(site.lng, site.lat, rec.lng, rec.lat);
        if (d <= radiusM) {
          inRadiusRaw.push({ rec, distM: Math.round(d) });
        }
      }
      inRadiusRaw.sort((a, b) => a.distM - b.distM);

      const distByUid = new Map(inRadiusRaw.map(x => [x.rec.uid, x.distM]));
      const reconciledAll = reconcileRecords(inRadiusRaw.map(x => x.rec));
      const allDistinct = reconciledAll.distinct;

      const matchingRaw = catNorm
        ? inRadiusRaw.filter(x => String(x.rec.category || '').trim().toLowerCase() === catNorm).map(x => x.rec)
        : [];
      const reconciledMatch = reconcileRecords(matchingRaw);

      const partnerRaw = partnerSet.size
        ? inRadiusRaw.filter(x => partnerSet.has(String(x.rec.category || '').trim().toLowerCase())).map(x => x.rec)
        : [];
      const reconciledPartner = reconcileRecords(partnerRaw);

      // Count distinct buildings & multi-tenant buildings represented in radius
      const byBuilding = new Map();
      let uncertainPinCount = 0;
      for (const r of allDistinct) {
        if (r.linkedBuildingId) {
          if (!byBuilding.has(r.linkedBuildingId)) byBuilding.set(r.linkedBuildingId, []);
          byBuilding.get(r.linkedBuildingId).push(r);
        } else if (r.buildingMatchType === 'uncertain') {
          uncertainPinCount++;
        }
      }
      const multiTenantBuildings = [...byBuilding.entries()]
        .filter(([, list]) => list.length >= 2)
        .map(([buildingId, list]) => ({ buildingId, count: list.length, records: list }));

      // Breakdown of partner counts by category
      const partnerByCat = {};
      for (const pc of partnerSet) partnerByCat[pc] = [];
      for (const r of reconciledPartner.distinct) {
        const k = String(r.category || '').trim().toLowerCase();
        if (partnerByCat[k]) partnerByCat[k].push(r);
      }

      // Top real mapped categories present inside this radius (strictly from mapped records)
      const catBuckets = new Map();
      for (const r of allDistinct) {
        const k = String(r.category || '').trim().toLowerCase();
        if (!k) continue;
        if (!catBuckets.has(k)) catBuckets.set(k, []);
        catBuckets.get(k).push(r);
      }
      const topCategories = [...catBuckets.entries()]
        .map(([name, records]) => ({ name, count: records.length, records }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 5);

      // Sparse coverage rule (transparent threshold): < 8 total mapped places within radius
      const isSparse = allDistinct.length < 8;

      return {
        site,
        radiusM,
        officialLoaded,
        isSparse,
        distByUid,
        totalDistinct: allDistinct.length,
        totalOfficial: reconciledAll.official.length,
        totalCommunity: reconciledAll.community.length,
        totalReconciledDuplicates: reconciledAll.reconciledCount,
        allRecords: allDistinct,
        matchCount: reconciledMatch.distinct.length,
        matchOfficialCount: reconciledMatch.official.length,
        matchCommunityCount: reconciledMatch.community.length,
        matchReconciledDuplicates: reconciledMatch.reconciledCount,
        matchRecords: reconciledMatch.distinct,
        partnerCount: reconciledPartner.distinct.length,
        partnerRecords: reconciledPartner.distinct,
        partnerByCat,
        topCategories,
        distinctBuildingsCount: byBuilding.size,
        multiTenantBuildings,
        uncertainPinCount
      };
    }

    function generateTraceableFindings(evalA, evalB, overlapInfo) {
      const cat = state.category || 'selected category';
      const r = state.radiusM;
      const officialLoaded = registry.getOfficialRecords().length > 0;
      const findings = [];

      const describeSite = (label, ev) => {
        if (!ev) return;
        const offClause = officialLoaded
          ? `${ev.matchOfficialCount} official LOCUS SF, ${ev.matchCommunityCount} community OSM`
          : `official count unknown — official dataset not loaded; ${ev.matchCommunityCount} community OSM`;

        if (ev.matchCount > 0) {
          const dupNote = ev.matchReconciledDuplicates > 0
            ? ` (${ev.matchReconciledDuplicates} official/OSM duplicate${ev.matchReconciledDuplicates > 1 ? 's' : ''} reconciled)`
            : '';
          const fieldPrompt = state.role === 'citizen'
            ? 'Check current operating hours and service availability on-site.'
            : (state.role === 'investor'
              ? 'Verify active business permits, tenant longevity, and building occupancy on-site.'
              : 'Check service mix, opening hours, and customer pickup/access during a field visit.');
          findings.push({
            id: `match-${label}`,
            siteKey: label,
            kind: 'match',
            count: ev.matchCount,
            records: ev.matchRecords,
            text: `Area ${label} has ${ev.matchCount} mapped ${cat} establishment${ev.matchCount === 1 ? '' : 's'} within ${r} m (${offClause})${dupNote}. ${fieldPrompt}`
          });
        } else if (ev.isSparse) {
          findings.push({
            id: `sparse-${label}`,
            siteKey: label,
            kind: 'sparse',
            count: ev.totalDistinct,
            records: ev.allRecords,
            text: `Area ${label} has 0 mapped ${cat} records and sparse overall map coverage (only ${ev.totalDistinct} total mapped places within ${r} m; ${officialLoaded ? '0 official matches' : 'official count unknown'}). Absence of pins does not confirm zero businesses—verify on a field visit.`
          });
        } else {
          findings.push({
            id: `zero-${label}`,
            siteKey: label,
            kind: 'zero',
            count: 0,
            records: [],
            text: `Area ${label} has 0 mapped ${cat} records in the community snapshot within ${r} m (${officialLoaded ? '0 official matches' : 'official count unknown — not loaded'}), out of ${ev.totalDistinct} mapped places nearby. Check whether unlisted ${cat} businesses already operate here.`
          });
        }

        if (state.partnerCategories.length > 0) {
          findings.push({
            id: `partner-${label}`,
            siteKey: label,
            kind: 'partner',
            count: ev.partnerCount,
            records: ev.partnerRecords,
            text: `Area ${label} has ${ev.partnerCount} mapped potential-partner place${ev.partnerCount === 1 ? '' : 's'} (${state.partnerCategories.join(', ')}) within ${r} m.`
          });
        }

        if (ev.multiTenantBuildings.length > 0) {
          const mtRecs = ev.multiTenantBuildings.flatMap(b => b.records);
          findings.push({
            id: `multi-${label}`,
            siteKey: label,
            kind: 'multi',
            count: ev.multiTenantBuildings.length,
            records: mtRecs,
            text: `Area ${label} includes ${ev.multiTenantBuildings.length} footprint${ev.multiTenantBuildings.length === 1 ? '' : 's'} linked to multiple places (${mtRecs.length} mapped records).`
          });
        }

        if (ev.uncertainPinCount > 0) {
          const uncRecs = ev.allRecords.filter(rec => rec.buildingMatchType === 'uncertain');
          findings.push({
            id: `unc-${label}`,
            siteKey: label,
            kind: 'uncertain',
            count: ev.uncertainPinCount,
            records: uncRecs,
            text: `Area ${label} contains ${ev.uncertainPinCount} mapped pin${ev.uncertainPinCount === 1 ? '' : 's'} sitting outside building footprints (flagged for review).`
          });
        }
      };

      describeSite('A', evalA);
      describeSite('B', evalB);

      if (overlapInfo && overlapInfo.circlesOverlap) {
        findings.push({
          id: 'overlap-ab',
          siteKey: 'AB',
          kind: 'overlap',
          count: overlapInfo.sharedAll.length,
          records: overlapInfo.sharedAll,
          text: `Site A and Site B circles overlap (${overlapInfo.centerDistM} m apart < ${r * 2} m): ${overlapInfo.sharedAll.length} mapped place${overlapInfo.sharedAll.length === 1 ? '' : 's'} (${overlapInfo.sharedMatch.length} in ${cat}) fall in both areas and are itemized separately so they are not double-counted.`
        });
      }

      if (!officialLoaded) {
        findings.push({
          id: 'official-empty',
          siteKey: 'ALL',
          kind: 'notice',
          count: 0,
          records: [],
          text: 'Official LOCUS SF thesis layer is currently empty (0 records loaded). All counts above reflect the OpenStreetMap community snapshot only—verify permits and active tenants on-site.'
        });
      }

      return findings;
    }

    function generateRoleDueDiligence(evalA, evalB) {
      const cat = state.category || 'selected category';
      const questions = [];
      if (state.role === 'investor') {
        questions.push(`Confirm active business permits and occupancy in the ${evalA?.multiTenantBuildings.length || 0} footprints with multiple mapped places near Area A${evalB ? ` vs. ${evalB.multiTenantBuildings.length} near Area B` : ''} with the City BPLO.`);
        if (!registry.getOfficialRecords().length) {
          questions.push('Cross-check this community OSM snapshot against the official LOCUS SF establishment registry before finalizing a shortlist.');
        }
        questions.push(`Verify property zoning, frontage access, and actual unlisted ${cat} competitors during an on-site visit (map pins do not measure rent or returns).`);
      } else if (state.role === 'citizen') {
        questions.push(`Confirm current opening hours, fees, and walk-in availability for mapped ${cat} options near your chosen area.`);
        if (evalA && evalA.matchCount === 0) {
          questions.push(`Check with the Barangay Hall (${evalA.site.barangay || 'local barangay'}) for unlisted ${cat} services not yet mapped in OSM.`);
        }
      } else {
        questions.push(`Visit the highest-density street in your preferred area to check active hours, parking/loading access, and unlisted ${cat} establishments.`);
        if (state.partnerCategories.length) {
          questions.push(`Ask nearby ${state.partnerCategories[0]} operators about customer overlap or partnership opportunities during a field visit.`);
        }
      }
      return questions;
    }

    function getComparison() {
      const evalA = evaluateSite(state.siteA, state.category, state.partnerCategories, state.radiusM);
      const evalB = evaluateSite(state.siteB, state.category, state.partnerCategories, state.radiusM);

      let overlapInfo = null;
      if (evalA && evalB) {
        const centerDistM = Math.round(haversineM(state.siteA.lng, state.siteA.lat, state.siteB.lng, state.siteB.lat));
        const circlesOverlap = centerDistM < state.radiusM * 2;
        const uidsB = new Set(evalB.allRecords.map(r => r.uid));
        const matchUidsB = new Set(evalB.matchRecords.map(r => r.uid));
        const sharedAll = circlesOverlap ? evalA.allRecords.filter(r => uidsB.has(r.uid)) : [];
        const sharedMatch = circlesOverlap ? evalA.matchRecords.filter(r => matchUidsB.has(r.uid)) : [];
        overlapInfo = { centerDistM, circlesOverlap, sharedAll, sharedMatch };
      }

      const findings = generateTraceableFindings(evalA, evalB, overlapInfo);
      const dueDiligence = generateRoleDueDiligence(evalA, evalB);

      return {
        evalA,
        evalB,
        overlapInfo,
        findings,
        dueDiligence,
        officialLoaded: registry.getOfficialRecords().length > 0
      };
    }

    function getProgress() {
      const needsB = state.role !== 'citizen' || Boolean(state.siteB);
      const step1 = Boolean(state.category && state.siteA && (state.role === 'citizen' || state.siteB));
      const hasAInspect = state.inspectedA.length > 0;
      const hasBInspect = !needsB || state.inspectedB.length > 0;
      const step2 = step1 && hasAInspect && hasBInspect;
      const step3 = step2 && (
        state.role === 'citizen'
          ? Boolean(state.decision || state.citizenActionDone)
          : Boolean(state.decision)
      );
      const step4 = savedBriefs.some(b =>
        b.role === state.role &&
        b.category === state.category &&
        b.siteA && state.siteA &&
        Math.abs(b.siteA.lng - state.siteA.lng) < 1e-5 &&
        Math.abs(b.siteA.lat - state.siteA.lat) < 1e-5
      );
      const completed = [step1, step2, step3, step4].filter(Boolean).length;
      const currentStep = !step1 ? 1 : !step2 ? 2 : !step3 ? 3 : 4;
      return { step1, step2, step3, step4, completed, total: 4, currentStep, hasAInspect, hasBInspect };
    }

    // Record a building or establishment inspection — deduplicated so clicking the same item twice NEVER adds progress!
    function recordInspection(lng, lat, key, label, kind) {
      if (!state.active || !key) return { added: false };
      let addedA = false, addedB = false;

      if (state.siteA && haversineM(lng, lat, state.siteA.lng, state.siteA.lat) <= state.radiusM) {
        if (!state.inspectedA.some(item => item.key === key)) {
          state.inspectedA.push({ key, label, kind });
          addedA = true;
        }
      }
      if (state.siteB && haversineM(lng, lat, state.siteB.lng, state.siteB.lat) <= state.radiusM) {
        if (!state.inspectedB.some(item => item.key === key)) {
          state.inspectedB.push({ key, label, kind });
          addedB = true;
        }
      }
      if (addedA || addedB) {
        persistState();
        if (!exploredKeys.has(key)) {
          exploredKeys.add(key);
          persistExplored();
        }
      }
      return { added: addedA || addedB, addedA, addedB };
    }

    function recordSparseObservation(siteKey, noteText) {
      const target = siteKey === 'B' ? state.inspectedB : state.inspectedA;
      const key = `sparse-obs-${siteKey}`;
      const label = (noteText && noteText.trim()) || `Sparse map coverage observed in Area ${siteKey} — field check needed`;
      const existing = target.find(x => x.key === key);
      if (existing) {
        existing.label = label;
        persistState();
        return false;
      }
      target.push({ key, label, kind: 'sparse_note' });
      persistState();
      return true;
    }

    function setSiteFast(which, lng, lat) {
      const cur = which === 'A' ? state.siteA : state.siteB;
      const obj = {
        lng: Number(lng.toFixed(6)),
        lat: Number(lat.toFixed(6)),
        barangay: cur ? cur.barangay : 'City of San Fernando',
        psgc: cur ? cur.psgc : ''
      };
      if (which === 'A') state.siteA = obj;
      else state.siteB = obj;
      return obj;
    }

    function setSite(which, lng, lat) {
      const bgy = buildingsLayer && buildingsLayer.findOfficialBarangayAt
        ? buildingsLayer.findOfficialBarangayAt(lng, lat)
        : null;
      const obj = {
        lng: Number(lng.toFixed(6)),
        lat: Number(lat.toFixed(6)),
        barangay: bgy ? bgy.name : 'City of San Fernando',
        psgc: bgy ? bgy.psgc : ''
      };
      if (which === 'A') {
        state.siteA = obj;
        // Clear stale inspections belonging to the previous Site A circle
        state.inspectedA = [];
      } else {
        state.siteB = obj;
        state.inspectedB = [];
      }
      persistState();
      return obj;
    }

    function applyPreset(presetId) {
      const p = PRESET_MISSIONS.find(x => x.id === presetId);
      if (!p) return null;
      state.active = true;
      state.role = p.role;
      state.category = p.category;
      state.partnerCategories = p.partnerCategories.slice();
      state.radiusM = p.radiusM;
      state.decision = '';
      state.reason = '';
      state.fieldQuestion = '';
      state.citizenActionDone = false;
      state.citizenFlagNote = '';
      state.inspectedA = [];
      state.inspectedB = [];
      if (p.siteA) setSite('A', p.siteA.lng, p.siteA.lat);
      else state.siteA = null;
      if (p.siteB) setSite('B', p.siteB.lng, p.siteB.lat);
      else state.siteB = null;
      persistState();
      return p;
    }

    function saveBrief() {
      const comp = getComparison();
      const brief = {
        id: `brief-${Date.now()}`,
        savedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        role: state.role,
        category: state.category,
        partnerCategories: state.partnerCategories.slice(),
        radiusM: state.radiusM,
        siteA: state.siteA ? { ...state.siteA } : null,
        siteB: state.siteB ? { ...state.siteB } : null,
        officialDataLoaded: comp.officialLoaded,
        summaryA: comp.evalA ? {
          matchCount: comp.evalA.matchCount,
          matchOfficial: comp.evalA.matchOfficialCount,
          matchCommunity: comp.evalA.matchCommunityCount,
          partnerCount: comp.evalA.partnerCount,
          totalMapped: comp.evalA.totalDistinct,
          multiTenantBuildings: comp.evalA.multiTenantBuildings.length,
          isSparse: comp.evalA.isSparse
        } : null,
        summaryB: comp.evalB ? {
          matchCount: comp.evalB.matchCount,
          matchOfficial: comp.evalB.matchOfficialCount,
          matchCommunity: comp.evalB.matchCommunityCount,
          partnerCount: comp.evalB.partnerCount,
          totalMapped: comp.evalB.totalDistinct,
          multiTenantBuildings: comp.evalB.multiTenantBuildings.length,
          isSparse: comp.evalB.isSparse
        } : null,
        overlapCount: comp.overlapInfo && comp.overlapInfo.circlesOverlap ? comp.overlapInfo.sharedAll.length : 0,
        findings: comp.findings.map(f => f.text),
        inspectedA: state.inspectedA.slice(),
        inspectedB: state.inspectedB.slice(),
        decision: state.decision || (state.role === 'citizen' ? 'service_checked' : 'need_more_info'),
        reason: state.reason.trim(),
        fieldQuestion: state.fieldQuestion.trim(),
        citizenFlagNote: state.citizenFlagNote.trim(),
        provenance: {
          official: comp.officialLoaded ? 'Official LOCUS SF dataset loaded' : 'Official LOCUS SF dataset not loaded (unknown)',
          community: 'OpenStreetMap community snapshot via OpenFreeMap (2026-11-15)',
          player: 'Player scouting notes & decision saved locally in browser'
        }
      };
      savedBriefs.unshift(brief);
      persistBriefs();
      return brief;
    }

    function restoreBrief(briefId) {
      const b = savedBriefs.find(x => x.id === briefId);
      if (!b) return null;
      state.active = true;
      state.role = b.role || 'entrepreneur';
      state.category = b.category || '';
      state.partnerCategories = Array.isArray(b.partnerCategories) ? b.partnerCategories.slice() : [];
      state.radiusM = b.radiusM || 500;
      state.siteA = b.siteA ? { ...b.siteA } : null;
      state.siteB = b.siteB ? { ...b.siteB } : null;
      state.inspectedA = Array.isArray(b.inspectedA) ? b.inspectedA.slice() : [];
      state.inspectedB = Array.isArray(b.inspectedB) ? b.inspectedB.slice() : [];
      state.decision = b.decision || '';
      state.reason = b.reason || '';
      state.fieldQuestion = b.fieldQuestion || '';
      state.citizenFlagNote = b.citizenFlagNote || '';
      persistState();
      return b;
    }

    function deleteBrief(briefId) {
      savedBriefs = savedBriefs.filter(x => x.id !== briefId);
      persistBriefs();
    }

    function resetMission(keepRole = true) {
      const prevRole = state.role;
      const prevActive = state.active;
      state = defaultState();
      state.active = prevActive;
      if (keepRole) state.role = prevRole;
      persistState();
    }

    // Build GeoJSON for Site A (solid ring) & Site B (dashed ring) circles, letter badges, and A<->B distance connector
    function makeMapGeoJSON() {
      const circles = [];
      const centers = [];
      const connector = [];
      const connectorMid = [];
      if (state.active && state.siteA) {
        circles.push({
          type: 'Feature',
          properties: { site: 'A', radiusM: state.radiusM },
          geometry: makeCirclePolygon(state.siteA.lng, state.siteA.lat, state.radiusM)
        });
        centers.push({
          type: 'Feature',
          properties: { site: 'A', label: `Site A · ${state.radiusM} m`, icon: 'scout-site-a' },
          geometry: { type: 'Point', coordinates: [state.siteA.lng, state.siteA.lat] }
        });
      }
      if (state.active && state.siteB) {
        circles.push({
          type: 'Feature',
          properties: { site: 'B', radiusM: state.radiusM },
          geometry: makeCirclePolygon(state.siteB.lng, state.siteB.lat, state.radiusM)
        });
        centers.push({
          type: 'Feature',
          properties: { site: 'B', label: `Site B · ${state.radiusM} m`, icon: 'scout-site-b' },
          geometry: { type: 'Point', coordinates: [state.siteB.lng, state.siteB.lat] }
        });
      }
      if (state.active && state.siteA && state.siteB) {
        const distM = Math.round(haversineM(state.siteA.lng, state.siteA.lat, state.siteB.lng, state.siteB.lat));
        const overlapping = distM < state.radiusM * 2;
        const distTxt = distM >= 1000 ? `${(distM / 1000).toFixed(2)} km` : `${distM} m`;
        connector.push({
          type: 'Feature',
          properties: { overlapping },
          geometry: {
            type: 'LineString',
            coordinates: [[state.siteA.lng, state.siteA.lat], [state.siteB.lng, state.siteB.lat]]
          }
        });
        connectorMid.push({
          type: 'Feature',
          properties: {
            label: overlapping ? `${distTxt} · Overlap` : `${distTxt} apart`,
            overlapping
          },
          geometry: {
            type: 'Point',
            coordinates: [(state.siteA.lng + state.siteB.lng) / 2, (state.siteA.lat + state.siteB.lat) / 2]
          }
        });
      }
      return {
        circles: { type: 'FeatureCollection', features: circles },
        centers: { type: 'FeatureCollection', features: centers },
        connector: { type: 'FeatureCollection', features: connector },
        connectorMid: { type: 'FeatureCollection', features: connectorMid }
      };
    }

    // Highlight role of a record during active Market Scout comparison:
    //   2 = direct target category match inside Site A or B
    //   1 = selected partner category inside Site A or B
    //   0 = normal / unrelated
    function getRecordScoutRole(rec) {
      if (!state.active || (!state.siteA && !state.siteB) || !state.category || !rec.hasValidCoords) return 0;
      const inA = state.siteA && haversineM(rec.lng, rec.lat, state.siteA.lng, state.siteA.lat) <= state.radiusM;
      const inB = state.siteB && haversineM(rec.lng, rec.lat, state.siteB.lng, state.siteB.lat) <= state.radiusM;
      if (!inA && !inB) return 0;
      const c = String(rec.category || '').trim().toLowerCase();
      if (c === state.category.toLowerCase()) return 2;
      if (state.partnerCategories.includes(c)) return 1;
      return 0;
    }

    // Determine whether a map establishment should be visually softened during active Site A/B comparison
    function getRecordDimState(rec) {
      if (!state.active || (!state.siteA && !state.siteB) || !rec.hasValidCoords) return 0;
      const inA = state.siteA && haversineM(rec.lng, rec.lat, state.siteA.lng, state.siteA.lat) <= state.radiusM;
      const inB = state.siteB && haversineM(rec.lng, rec.lat, state.siteB.lng, state.siteB.lat) <= state.radiusM;
      if (!inA && !inB) return 1; // outside active search circles -> soften
      if (!state.category) return 0;
      return getRecordScoutRole(rec) > 0 ? 0 : 1;
    }

    // Register color-blind-safe Retina @2x Canvas badges: Site A (solid navy circle) vs Site B (double-border terracotta square)
    function registerScoutIcons(map) {
      function mkIcon(id, drawFn) {
        if (map.hasImage(id)) return;
        const size = 96;
        const cv = document.createElement('canvas');
        cv.width = size; cv.height = size;
        const ctx = cv.getContext('2d');
        drawFn(ctx, size);
        map.addImage(id, ctx.getImageData(0, 0, size, size), { pixelRatio: 2 });
      }

      // Site A: Solid dark navy CIRCLE with crisp white ring & bold "A"
      mkIcon('scout-site-a', (ctx, s) => {
        const cx = s / 2, cy = s / 2 - 4;
        ctx.fillStyle = 'rgba(18, 51, 82, 0.28)';
        ctx.beginPath(); ctx.ellipse(cx, cy + 32, 16, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#123352';
        ctx.beginPath(); ctx.moveTo(cx - 8, cy + 18); ctx.lineTo(cx + 8, cy + 18); ctx.lineTo(cx, cy + 32); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke();
        ctx.strokeStyle = '#123352'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 28px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('A', cx, cy + 1);
      });

      // Site B: Distinct rounded SQUARE (double-frame) in terracotta with crisp white ring & bold "B" (shape-distinct without color!)
      mkIcon('scout-site-b', (ctx, s) => {
        const cx = s / 2, cy = s / 2 - 4;
        ctx.fillStyle = 'rgba(120, 42, 14, 0.28)';
        ctx.beginPath(); ctx.ellipse(cx, cy + 32, 16, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b84a20';
        ctx.beginPath(); ctx.moveTo(cx - 8, cy + 18); ctx.lineTo(cx + 8, cy + 18); ctx.lineTo(cx, cy + 32); ctx.closePath(); ctx.fill();
        const x = cx - 23, y = cy - 23, w = 46, h = 46, r = 9;
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke();
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = '#7d2f11'; ctx.lineWidth = 2;
        ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 28px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('B', cx, cy + 1);
      });
    }

    return {
      getState: () => state,
      setState(patch) {
        Object.assign(state, patch);
        persistState();
        return state;
      },
      setActive(flag) {
        state.active = Boolean(flag);
        persistState();
      },
      setSite,
      setSiteFast,
      applyPreset,
      getPresets: () => PRESET_MISSIONS,
      getUniqueExploredCount: () => exploredKeys.size,
      recordInspection,
      recordSparseObservation,
      getAvailableCategories,
      getSuggestedPartners,
      getComparison,
      evaluateSite,
      getProgress,
      saveBrief,
      restoreBrief,
      deleteBrief,
      resetMission,
      getSavedBriefs: () => savedBriefs,
      makeMapGeoJSON,
      getRecordScoutRole,
      getRecordDimState,
      registerScoutIcons,
      haversineM
    };
  }

  global.LocusMarketScout = { createMarketScout, haversineM, makeCirclePolygon };
})(window);
