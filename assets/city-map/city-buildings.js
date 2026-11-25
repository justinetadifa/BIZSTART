/* LOCUS SF ? OSM footprint decoding, geometry matching and WebGL building rendering. */

(function (global) {
  const SUN = normalize3([0.80, 0.42, 0.52]);
  const SH_DX = -(SUN[0] / SUN[2]) * 0.68;
  const SH_DY = -(SUN[1] / SUN[2]) * 0.68;

  // Sunlit coastal architectural scale-model roof/wall finishes (never assigned by business category).
  // grain: 0 = matte plaster/limestone, 1 = galvanized standing-seam, 2 = muted clay tile course
  const ROOF_MATERIALS = [
    { wall: [0.935, 0.912, 0.864], roof: [0.935, 0.896, 0.822], grain: 0 }, // 0: Warm sunlit limestone
    { wall: [0.905, 0.896, 0.868], roof: [0.675, 0.728, 0.772], grain: 1 }, // 1: Coastal galvanized steel (yero)
    { wall: [0.922, 0.884, 0.818], roof: [0.875, 0.792, 0.672], grain: 0 }, // 2: Warm ochre sandstone
    { wall: [0.938, 0.910, 0.862], roof: [0.785, 0.548, 0.452], grain: 2 }, // 3: Sun-baked muted terracotta
    { wall: [0.895, 0.890, 0.868], roof: [0.555, 0.625, 0.688], grain: 1 }, // 4: Weathered coastal slate
    { wall: [0.912, 0.902, 0.866], roof: [0.618, 0.692, 0.658], grain: 1 }, // 5: Oxidized coastal sage-zinc
    { wall: [0.952, 0.942, 0.912], roof: [0.968, 0.956, 0.922], grain: 0 }  // 6: Crisp whitewashed chalk plaster
  ];
  const ROOF_WEIGHTS = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 6, 6];
  const MATERIAL = ROOF_MATERIALS[0];
  const FULL_LANDMARK_IDS = new Set([
    'sf-city-hall', 'la-union-capitol', 'st-william-cathedral', 'sf-city-plaza', 'plaza-hotel', 'ma-cho-temple',
    'sm-city-la-union', 'robinsons-la-union', 'itrmc-hospital', 'lorma-medical', 'bethany-hospital',
    'union-christian-college', 'manna-mall', 'csi-city-mall', 'taskus-la-union',
    'slc-carlatan', 'dmmmsu-mluc', 'la-union-high'
  ]);
  const COVERAGE_PAL = {
    official:  { wall: [0.87, 0.62, 0.49], roof: [0.90, 0.70, 0.55], grain: 0 },
    multi:     { wall: [0.36, 0.60, 0.65], roof: [0.49, 0.71, 0.73], grain: 0 },
    community: { wall: [0.55, 0.72, 0.74], roof: [0.67, 0.80, 0.80], grain: 0 },
    unlinked:  { wall: [0.88, 0.87, 0.84], roof: [0.93, 0.91, 0.87], grain: 0 }
  };

  function stableHashLngLat(lng, lat) {
    const x = Math.round(lng * 20000) | 0;
    const y = Math.round(lat * 20000) | 0;
    let h = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y ^ 0xc2b2ae35, 0x27d4eb2f);
    h ^= h >>> 16;
    h = Math.imul(h, 0x7feb352d);
    h ^= h >>> 15;
    h = Math.imul(h, 0x846ca68b);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function parseMappedColour(str) {
    if (!str || typeof str !== 'string') return null;
    const s = str.trim().toLowerCase();
    const named = {
      white: [0.95, 0.94, 0.90], ivory: [0.95, 0.93, 0.88], beige: [0.90, 0.86, 0.79],
      cream: [0.94, 0.90, 0.83], sand: [0.89, 0.84, 0.76], grey: [0.76, 0.78, 0.80],
      gray: [0.76, 0.78, 0.80], silver: [0.81, 0.83, 0.84], brown: [0.74, 0.66, 0.59],
      red: [0.80, 0.64, 0.58], terracotta: [0.83, 0.70, 0.63], orange: [0.87, 0.75, 0.64],
      yellow: [0.92, 0.87, 0.74], blue: [0.73, 0.79, 0.84], green: [0.74, 0.81, 0.76]
    };
    if (named[s]) return named[s];
    const m6 = s.match(/^#([0-9a-f]{6})$/);
    if (m6) {
      const n = parseInt(m6[1], 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    const m3 = s.match(/^#([0-9a-f]{3})$/);
    if (m3) {
      const n = parseInt(m3[1], 16);
      return [(((n >> 8) & 15) * 17) / 255, (((n >> 4) & 15) * 17) / 255, ((n & 15) * 17) / 255];
    }
    return null;
  }

  function shiftShade(rgb, delta) {
    return [
      Math.max(0.55, Math.min(0.98, rgb[0] + delta)),
      Math.max(0.55, Math.min(0.98, rgb[1] + delta)),
      Math.max(0.55, Math.min(0.98, rgb[2] + delta))
    ];
  }

  function resolveBuildingMaterial(b, primary) {
    // 1. Honor explicit mapped roof material or roof/building colour when present in tile data.
    const matTag = String(primary.mappedRoofMaterial || b.mappedRoofMaterial || '').toLowerCase();
    const rawRoofCol = parseMappedColour(primary.mappedRoofColour || b.mappedRoofColour);
    const rawWallCol = parseMappedColour(primary.mappedColour || b.mappedColour);

    if (rawRoofCol || rawWallCol) {
      const warmPaper = [0.92, 0.90, 0.85];
      const harmonizeMapped = (rgb, minLum, baseBlend) => {
        const lum = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
        const extraLift = lum < minLum ? Math.min(0.42, (minLum - lum) * 1.15) : 0;
        return blendRGB(rgb, warmPaper, Math.min(0.76, baseBlend + extraLift));
      };
      const roofBase = rawRoofCol
        ? harmonizeMapped(rawRoofCol, 0.72, 0.34)
        : harmonizeMapped(rawWallCol, 0.74, 0.42);
      const wallBase = rawWallCol
        ? harmonizeMapped(rawWallCol, 0.80, 0.48)
        : [0.90, 0.88, 0.84];
      const isMetal = /metal|tin|zinc|steel|galvan|iron/.test(matTag);
      const isTile = /tile|clay|terracotta|brick/.test(matTag);
      return { roof: roofBase, wall: wallBase, grain: isMetal ? 1 : (isTile ? 2 : 0) };
    }

    if (matTag) {
      if (/metal|tin|zinc|steel|galvan|iron/.test(matTag)) return ROOF_MATERIALS[1];
      if (/tile|clay|terracotta|brick/.test(matTag)) return ROOF_MATERIALS[3];
      if (/concrete|stone|plaster|limestone/.test(matTag)) return ROOF_MATERIALS[0];
      if (/slate|asphalt|tar/.test(matTag)) return ROOF_MATERIALS[4];
    }

    // 2. Stable, reload-invariant architectural finish (independent of business category).
    const h = stableHashLngLat(primary.centerLL[0], primary.centerLL[1]);
    let idx = ROOF_WEIGHTS[h % ROOF_WEIGHTS.length];
    // Larger roofs (>= 480 m²) lean toward limestone, galvanized steel, weathered slate, or sandstone rather than clay tile.
    if (primary.areaM2 >= 480 && idx === 3) idx = [0, 1, 4, 2][(h >>> 5) & 3];
    const base = ROOF_MATERIALS[idx];
    const micro = ((((h >>> 9) % 11) - 5) / 5) * 0.022;
    return {
      roof: shiftShade(base.roof, micro),
      wall: shiftShade(base.wall, micro * 0.55),
      grain: base.grain
    };
  }

  function normalize3(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  function blendRGB(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  function readVarint(buf, pos) {
    let res = 0, shift = 0;
    while (pos < buf.length) {
      const b = buf[pos++];
      res += (b & 0x7f) * (2 ** shift);
      if (!(b & 0x80)) break;
      shift += 7;
    }
    return [res, pos];
  }
  function readSigned(n) { return (n >>> 1) ^ -(n & 1); }

  const textDecoder = new TextDecoder();

  async function gunzipIfNeeded(u8) {
    if (u8.length >= 2 && u8[0] === 0x1f && u8[1] === 0x8b) {
      if (typeof DecompressionStream === 'undefined') return null;
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(u8);
      writer.close();
      const resp = new Response(ds.readable);
      return new Uint8Array(await resp.arrayBuffer());
    }
    return u8;
  }

  const WANTED_LAYERS = new Set(['building', 'landuse', 'housenumber', 'place']);

  function parseTileLayers(buf) {
    const layers = {};
    let pos = 0;
    while (pos < buf.length) {
      const [tag, p1] = readVarint(buf, pos); pos = p1;
      const field = tag >> 3, wire = tag & 7;
      if (wire === 2) {
        const [len, p2] = readVarint(buf, pos); pos = p2;
        const sl = buf.subarray(pos, pos + len); pos += len;
        if (field !== 3) continue;

        let lp = 0, name = '', keys = [], vals = [], rawFeats = [], extent = 4096;
        while (lp < sl.length) {
          const [lt, lp1] = readVarint(sl, lp); lp = lp1;
          const lf = lt >> 3, lw = lt & 7;
          if (lw === 2) {
            const [ll, lp2] = readVarint(sl, lp); lp = lp2;
            const ls = sl.subarray(lp, lp + ll); lp += ll;
            if (lf === 1) {
              name = textDecoder.decode(ls);
              if (!WANTED_LAYERS.has(name)) break;
            } else if (lf === 2) rawFeats.push(ls);
            else if (lf === 3) keys.push(textDecoder.decode(ls));
            else if (lf === 4) {
              let vp = 0, v = null;
              while (vp < ls.length) {
                const [vt, vp1] = readVarint(ls, vp); vp = vp1;
                const vf = vt >> 3, vw = vt & 7;
                if (vw === 2) { const [vl, vp2] = readVarint(ls, vp); v = textDecoder.decode(ls.subarray(vp2, vp2 + vl)); vp = vp2 + vl; }
                else if (vw === 0) { const [vv, vp2] = readVarint(ls, vp); v = vf === 7 ? Boolean(vv) : (vf === 6 ? readSigned(vv) : vv); vp = vp2; }
                else if (vw === 1) { v = new DataView(ls.buffer, ls.byteOffset + vp, 8).getFloat64(0, true); vp += 8; }
                else if (vw === 5) { v = new DataView(ls.buffer, ls.byteOffset + vp, 4).getFloat32(0, true); vp += 4; }
                else break;
              }
              vals.push(v);
            }
          } else if (lw === 0) { const [vv, lp2] = readVarint(sl, lp); lp = lp2; if (lf === 5) extent = vv; }
          else if (lw === 1) lp += 8;
          else if (lw === 5) lp += 4;
          else break;
        }
        if (!WANTED_LAYERS.has(name)) continue;

        const feats = [];
        for (const fb of rawFeats) {
          let fp = 0, tags = [], geom = [];
          while (fp < fb.length) {
            const [ft, fp1] = readVarint(fb, fp); fp = fp1;
            const ff = ft >> 3, fw = ft & 7;
            if (fw === 2) {
              const [fl, fp2] = readVarint(fb, fp); fp = fp2;
              const fs2 = fb.subarray(fp, fp + fl); fp += fl;
              if (ff === 2) {
                let tp = 0;
                while (tp < fs2.length) { const [v, t1] = readVarint(fs2, tp); tp = t1; tags.push(v); }
              } else if (ff === 4) {
                let gp = 0;
                while (gp < fs2.length) { const [g, g1] = readVarint(fs2, gp); gp = g1; geom.push(g); }
              }
            } else if (fw === 0) { const [, fp2] = readVarint(fb, fp); fp = fp2; }
            else if (fw === 1) fp += 8;
            else if (fw === 5) fp += 4;
            else break;
          }
          const props = {};
          for (let i = 0; i < tags.length; i += 2) props[keys[tags[i]]] = vals[tags[i + 1]];
          feats.push({ props, geom });
        }
        layers[name] = { extent, feats };
      } else if (wire === 0) { const [, p2] = readVarint(buf, pos); pos = p2; }
      else if (wire === 1) pos += 8;
      else if (wire === 5) pos += 4;
      else break;
    }
    return layers;
  }

  function decodeOuterRings(geom) {
    const out = [];
    let x = 0, y = 0, i = 0, ring = null;
    while (i < geom.length) {
      const cmd = geom[i++], id = cmd & 7, cnt = cmd >>> 3;
      if (id === 1) {
        for (let k = 0; k < cnt; k++) { x += readSigned(geom[i++]); y += readSigned(geom[i++]); ring = [[x, y]]; }
      } else if (id === 2) {
        for (let k = 0; k < cnt; k++) { x += readSigned(geom[i++]); y += readSigned(geom[i++]); if (ring) ring.push([x, y]); }
      } else if (id === 7) {
        if (ring && ring.length >= 3) {
          let a = 0;
          for (let j = 0; j < ring.length; j++) {
            const p = ring[j], q = ring[(j + 1) % ring.length];
            a += p[0] * q[1] - q[0] * p[1];
          }
          if (a > 0) out.push(ring);
        }
        ring = null;
      }
    }
    return out;
  }

  function decodePoint(geom) {
    if (!geom || geom.length < 3) return null;
    const cmd = geom[0], id = cmd & 7;
    if (id !== 1) return null;
    return [readSigned(geom[1]), readSigned(geom[2])];
  }

  function tileToLngLat(z, tx, ty, px, py, extent) {
    const n = 2 ** z;
    const lng = (tx + px / extent) / n * 360 - 180;
    const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (ty + py / extent) / n))) * 180 / Math.PI;
    return [lng, lat];
  }

  function lngLatToTile(lng, lat, z) {
    const n = 2 ** z;
    const x = Math.floor((lng + 180) / 360 * n);
    const rad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n);
    return [x, y];
  }

  function pointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-12) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  function buildBarangayIndex(fc) {
    if (!fc || !Array.isArray(fc.features)) return [];
    const list = [];
    for (const f of fc.features) {
      if (!f.geometry) continue;
      const rings = f.geometry.type === 'Polygon'
        ? [f.geometry.coordinates[0]]
        : (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map(p => p[0]) : []);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const r of rings) {
        for (const [lx, ly] of r) {
          if (lx < x0) x0 = lx; if (lx > x1) x1 = lx;
          if (ly < y0) y0 = ly; if (ly > y1) y1 = ly;
        }
      }
      list.push({
        name: f.properties?.name || 'Unknown',
        psgc: f.properties?.psgc || '',
        rings,
        bbox: [x0, y0, x1, y1],
        feature: f
      });
    }
    return list;
  }

  function findOfficialBarangay(lng, lat, brgyIndex) {
    for (const b of brgyIndex) {
      if (lng < b.bbox[0] || lng > b.bbox[2] || lat < b.bbox[1] || lat > b.bbox[3]) continue;
      for (const r of b.rings) {
        if (pointInPoly(lng, lat, r)) return { name: b.name, psgc: b.psgc };
      }
    }
    return null;
  }

  function distPtToSegM(px, py, ax, ay, bx, by) {
    const mLng = 106500, mLat = 110600;
    const x = (px - ax) * mLng, y = (py - ay) * mLat;
    const dx = (bx - ax) * mLng, dy = (by - ay) * mLat;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? (x * dx + y * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(x - t * dx, y - t * dy);
  }

  function distPtToRingM(px, py, ring) {
    let best = Infinity;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const d = distPtToSegM(px, py, a[0], a[1], b[0], b[1]);
      if (d < best) best = d;
    }
    return best;
  }

  // The source includes a buffer around every tile. Clip to disjoint tile interiors
  // before summing the area of a footprint split across several buffered tiles.
  function clipToTile(ring, extent) {
    let out = ring;
    for (const [axis, limit, side] of [[0, 0, 1], [0, extent, -1], [1, 0, 1], [1, extent, -1]]) {
      const input = out;
      out = [];
      for (let i = 0; i < input.length; i++) {
        const a = input[(i + input.length - 1) % input.length], b = input[i];
        const aIn = side * (a[axis] - limit) >= 0, bIn = side * (b[axis] - limit) >= 0;
        if (aIn !== bIn) {
          const t = (limit - a[axis]) / (b[axis] - a[axis]);
          out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
        }
        if (bIn) out.push(b);
      }
    }
    return out;
  }

  function ringAreaLL(ring, xScale, yScale) {
    if (ring.length < 3) return 0;
    const [cx, cy] = ring[0];
    let twiceArea = 0;
    for (let i = 1; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1];
      twiceArea += (a[0] - cx) * (b[1] - cy) - (a[1] - cy) * (b[0] - cx);
    }
    return Math.abs(twiceArea) * 0.5 * xScale * yScale;
  }

  // In the buffers a copied exterior has the same winding on both tiles.
  // Adjacent buildings sharing a wall traverse it in opposite directions.
  function sharesBufferedEdge(a, b) {
    for (let i = 0; i < a.length; i++) {
      const p = a[i], q = a[(i + 1) % a.length];
      const dx = q[0] - p[0], dy = q[1] - p[1], len2 = dx * dx + dy * dy;
      if (len2 < 1e-12) continue;
      for (let j = 0; j < b.length; j++) {
        const r = b[j], s = b[(j + 1) % b.length];
        if (dx * (s[0] - r[0]) + dy * (s[1] - r[1]) <= 0) continue;
        const tolerance = 2e-8 * Math.sqrt(len2);
        if (Math.abs(dx * (r[1] - p[1]) - dy * (r[0] - p[0])) > tolerance ||
            Math.abs(dx * (s[1] - p[1]) - dy * (s[0] - p[0])) > tolerance) continue;
        const t0 = ((r[0] - p[0]) * dx + (r[1] - p[1]) * dy) / len2;
        const t1 = ((s[0] - p[0]) * dx + (s[1] - p[1]) * dy) / len2;
        if ((Math.min(1, t1) - Math.max(0, t0)) * Math.sqrt(len2) > 2e-6) return true;
      }
    }
    return false;
  }

  function triangulateCCW(pts) {
    const n = pts.length;
    if (n < 3) return [];
    if (n === 3) return [[0, 1, 2]];
    const idx = [];
    for (let i = 0; i < n; i++) idx.push(i);
    const tris = [];

    function cross2(a, b, c) {
      return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    }
    function inTri(p, a, b, c) {
      const c1 = cross2(a, b, p), c2 = cross2(b, c, p), c3 = cross2(c, a, p);
      return c1 >= -1e-6 && c2 >= -1e-6 && c3 >= -1e-6;
    }

    let guard = n * n * 2;
    let i = 0;
    while (idx.length > 3 && guard-- > 0) {
      const m = idx.length;
      const i0 = idx[(i + m - 1) % m], i1 = idx[i % m], i2 = idx[(i + 1) % m];
      const a = pts[i0], b = pts[i1], c = pts[i2];
      if (cross2(a, b, c) > 1e-5) {
        let ear = true;
        for (let k = 0; k < m; k++) {
          const ik = idx[k];
          if (ik === i0 || ik === i1 || ik === i2) continue;
          if (inTri(pts[ik], a, b, c)) { ear = false; break; }
        }
        if (ear) {
          tris.push([i0, i1, i2]);
          idx.splice(i % m, 1);
          i = 0;
          continue;
        }
      }
      i++;
      if (i >= m) break;
    }
    if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
    return tris;
  }

  function dominantRoofAngle(pts) {
    let bestLen = 0, bestAng = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len > bestLen) {
        bestLen = len;
        let ang = Math.atan2(dy, dx);
        if (ang < 0) ang += Math.PI;
        if (ang >= Math.PI) ang -= Math.PI;
        bestAng = ang;
      }
    }
    return bestAng; // [0, PI)
  }

  function computeSafeParapetInset(pts, insetDist) {
    const n = pts.length;
    if (n < 4 || n > 8) return null;
    let signedA = 0;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % n];
      signedA += p0[0] * p1[1] - p1[0] * p0[1];
    }
    signedA *= 0.5;
    const absA = Math.abs(signedA);
    if (absA < 110) return null;
    const sign = signedA >= 0 ? 1 : -1;

    const dirs = new Array(n);
    const norms = new Array(n);
    let minEdge = Infinity;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % n];
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
      const len = Math.hypot(dx, dy);
      if (len < 4.5) return null;
      if (len < minEdge) minEdge = len;
      const ux = dx / len, uy = dy / len;
      dirs[i] = [ux, uy];
      // Strictly inward normal regardless of ring winding
      norms[i] = [-uy * sign, ux * sign];
    }

    // Strict convexity & non-acute corner check
    for (let i = 0; i < n; i++) {
      const dPrev = dirs[(i + n - 1) % n];
      const dCurr = dirs[i];
      const cross = dPrev[0] * dCurr[1] - dPrev[1] * dCurr[0];
      if (cross * sign <= 0.12) return null;
      const dot = dPrev[0] * dCurr[0] + dPrev[1] * dCurr[1];
      if (dot < -0.78) return null;
    }

    const d = Math.min(insetDist, minEdge * 0.14);
    const inPts = new Array(n);
    for (let i = 0; i < n; i++) {
      const nPrev = norms[(i + n - 1) % n];
      const nCurr = norms[i];
      const bx = nPrev[0] + nCurr[0], by = nPrev[1] + nCurr[1];
      const denom = bx * nCurr[0] + by * nCurr[1];
      if (denom < 0.35) return null;
      const scale = d / denom;
      if (scale > d * 2.1) return null;
      inPts[i] = [pts[i][0] + bx * scale, pts[i][1] + by * scale];
    }

    // Verify every inset edge preserves direction, minimum span & convex area
    let inSignedA = 0;
    for (let i = 0; i < n; i++) {
      const a = inPts[i], b = inPts[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < 2.2) return null;
      if (dx * dirs[i][0] + dy * dirs[i][1] <= 0) return null;
      inSignedA += a[0] * b[1] - b[0] * a[1];
    }
    inSignedA *= 0.5;
    if (inSignedA * sign <= absA * 0.25) return null;
    return { inPts, sign };
  }

  function cross3ENU(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  function computePitchedRectSpec(pts) {
    if (pts.length !== 4) return null;
    let signedA = 0;
    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[(i + 1) & 3];
      signedA += a[0] * b[1] - b[0] * a[1];
    }
    signedA *= 0.5;
    const absA = Math.abs(signedA);
    if (absA < 35 || absA > 360) return null;
    let p = signedA >= 0 ? [pts[0], pts[1], pts[2], pts[3]] : [pts[0], pts[3], pts[2], pts[1]];

    const lens = new Array(4);
    const dirs = new Array(4);
    for (let i = 0; i < 4; i++) {
      const a = p[i], b = p[(i + 1) & 3];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < 4.2) return null;
      lens[i] = len;
      dirs[i] = [dx / len, dy / len];
    }
    if (Math.min(lens[0], lens[2]) / Math.max(lens[0], lens[2]) < 0.72) return null;
    if (Math.min(lens[1], lens[3]) / Math.max(lens[1], lens[3]) < 0.72) return null;
    for (let i = 0; i < 4; i++) {
      const prev = dirs[(i + 3) & 3], curr = dirs[i];
      const dot = prev[0] * curr[0] + prev[1] * curr[1];
      const cr = prev[0] * curr[1] - prev[1] * curr[0];
      if (Math.abs(dot) > 0.28 || cr < 0.72) return null;
    }

    // Rotate so p[0]->p[1] and p[2]->p[3] are always the longer opposite sides
    let longLen = 0.5 * (lens[0] + lens[2]);
    let shortLen = 0.5 * (lens[1] + lens[3]);
    if (shortLen > longLen) {
      p = [p[1], p[2], p[3], p[0]];
      const tmp = longLen; longLen = shortLen; shortLen = tmp;
    }
    if (longLen / shortLen > 4.2) return null;

    const m0 = [(p[0][0] + p[3][0]) * 0.5, (p[0][1] + p[3][1]) * 0.5];
    const m1 = [(p[1][0] + p[2][0]) * 0.5, (p[1][1] + p[2][1]) * 0.5];
    const rise = Math.max(1.25, Math.min(2.35, shortLen * 0.22));
    return { p, m0, m1, longLen, shortLen, rise };
  }

  function addRooftopMass(mesh, inPts, zDeck, roofMat, wallCol, h) {
    // Compute centroid & oriented extents strictly verified inside convex inner roof deck
    const n = inPts.length;
    let cx = 0, cy = 0;
    for (const pt of inPts) { cx += pt[0]; cy += pt[1]; }
    cx /= n; cy /= n;

    const ang = dominantRoofAngle(inPts);
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const vx = -uy, vy = ux;
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const pt of inPts) {
      const dx = pt[0] - cx, dy = pt[1] - cy;
      const pu = dx * ux + dy * uy;
      const pv = dx * vx + dy * vy;
      if (pu < minU) minU = pu; if (pu > maxU) maxU = pu;
      if (pv < minV) minV = pv; if (pv > maxV) maxV = pv;
    }
    const spanU = maxU - minU, spanV = maxV - minV;
    if (spanU < 9.5 || spanV < 7.5) return;

    const kind = (h >>> 17) % 3;
    if (kind === 2) return; // Leave ~1/3 of large commercial roofs as calm open recessed decks

    const isSkylight = kind === 1;
    const wBox = isSkylight ? Math.min(16.0, Math.max(4.6, spanU * 0.42)) : Math.min(11.0, Math.max(3.6, spanU * 0.27));
    const dBox = isSkylight ? Math.min(6.4, Math.max(2.8, spanV * 0.22)) : Math.min(7.8, Math.max(3.0, spanV * 0.25));
    const hBox = isSkylight ? 1.15 : (1.7 + ((h >>> 20) % 3) * 0.35);

    const offU = isSkylight ? 0 : (((h >>> 22) % 3) - 1) * (spanU * 0.12);
    const offV = isSkylight ? 0 : (((h >>> 24) % 3) - 1) * (spanV * 0.10);
    const bx = cx + ux * offU + vx * offV;
    const by = cy + uy * offU + vy * offV;
    const hw = wBox * 0.5, hd = dBox * 0.5;

    const corners = [
      [bx - ux * hw - vx * hd, by - uy * hw - vy * hd],
      [bx + ux * hw - vx * hd, by + uy * hw - vy * hd],
      [bx + ux * hw + vx * hd, by + uy * hw + vy * hd],
      [bx - ux * hw + vx * hd, by - uy * hw + vy * hd]
    ];
    // Safety verification: all 4 corners must lie strictly inside inPts
    for (const c of corners) {
      if (!pointInPoly(c[0], c[1], inPts)) return;
    }

    const boxWall = blendRGB(wallCol, [0.95, 0.94, 0.90], 0.35);
    const boxTop = isSkylight ? [0.56, 0.65, 0.72] : shiftShade(roofMat, -0.04);
    const zTop = zDeck + hBox;

    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) & 3];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const norm = normalize3([dy, -dx, 0]);
      mesh.innerWall(a, b, zDeck, zTop, norm, boxWall);
      mesh.edges.push(a[0], a[1], zTop + 0.03, b[0], b[1], zTop + 0.03);
      // Cast subtle shadow onto the roof deck itself!
      if (norm[0] * SH_DX + norm[1] * SH_DY > 0) {
        const shA = [a[0] + hBox * SH_DX * 0.72, a[1] + hBox * SH_DY * 0.72];
        const shB = [b[0] + hBox * SH_DX * 0.72, b[1] + hBox * SH_DY * 0.72];
        if (pointInPoly(shA[0], shA[1], inPts) && pointInPoly(shB[0], shB[1], inPts)) {
          mesh.shadows.push(
            a[0], a[1], zDeck + 0.05, b[0], b[1], zDeck + 0.05, shB[0], shB[1], zDeck + 0.05,
            a[0], a[1], zDeck + 0.05, shB[0], shB[1], zDeck + 0.05, shA[0], shA[1], zDeck + 0.05
          );
        }
      }
    }
    const t0 = [...corners[0], zTop], t1 = [...corners[1], zTop];
    const t2 = [...corners[2], zTop], t3 = [...corners[3], zTop];
    mesh.triangle(t0, t1, t2, [0, 0, 1], boxTop, -1.0);
    mesh.triangle(t0, t2, t3, [0, 0, 1], boxTop, -1.0);

    // Subtle secondary rooftop HVAC / condenser pair on opposite side of large commercial roofs
    if (!isSkylight && ((h >>> 24) & 3) !== 0) {
      const sOffU = -offU * 0.95;
      const sOffV = -offV * 0.85;
      const sw = Math.min(2.6, wBox * 0.42), sd = Math.min(2.0, dBox * 0.44), sh = 0.85;
      const sbx = cx + ux * sOffU + vx * sOffV;
      const sby = cy + uy * sOffU + vy * sOffV;
      const shw = sw * 0.5, shd = sd * 0.5;
      const sc = [
        [sbx - ux * shw - vx * shd, sby - uy * shw - vy * shd],
        [sbx + ux * shw - vx * shd, sby + uy * shw - vy * shd],
        [sbx + ux * shw + vx * shd, sby + uy * shw + vy * shd],
        [sbx - ux * shw + vx * shd, sby - uy * shw + vy * shd]
      ];
      if (sc.every(p => pointInPoly(p[0], p[1], inPts))) {
        const hvacWall = [0.76, 0.79, 0.82];
        const hvacTop = [0.64, 0.68, 0.72];
        const szTop = zDeck + sh;
        for (let i = 0; i < 4; i++) {
          const a = sc[i], b = sc[(i + 1) & 3];
          const dx = b[0] - a[0], dy = b[1] - a[1];
          const norm = normalize3([dy, -dx, 0]);
          mesh.innerWall(a, b, zDeck, szTop, norm, hvacWall);
        }
        mesh.triangle([...sc[0], szTop], [...sc[1], szTop], [...sc[2], szTop], [0, 0, 1], hvacTop, -1.0);
        mesh.triangle([...sc[0], szTop], [...sc[2], szTop], [...sc[3], szTop], [0, 0, 1], hvacTop, -1.0);
      }
    }
  }

  class CityMesh {
    vertices = [];
    edges = [];
    shadows = [];

    triangle(a, b, c, normal, color, meta) {
      for (const point of [a, b, c]) this.vertices.push(...point, ...normal, ...color, meta);
    }

    slopedTri(a, b, c, color, meta) {
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let n = normalize3(cross3ENU(ab, ac));
      if (n[2] < 0) n = [-n[0], -n[1], -n[2]];
      this.triangle(a, b, c, n, color, meta);
    }

    slopedQuad(a, b, c, d, color, meta) {
      this.slopedTri(a, b, c, color, meta);
      this.slopedTri(a, c, d, color, meta);
    }

    innerWall(a, b, base, top, normal, color) {
      const a0 = [...a, base], b0 = [...b, base], a1 = [...a, top], b1 = [...b, top];
      this.triangle(a0, b0, b1, normal, color, top);
      this.triangle(a0, b1, a1, normal, color, top);
    }

    wall(a, b, prev, base, top, color, wallStyle = 0) {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < 0.05) return;
      const normal = normalize3([dy, -dx, 0]);
      const meta = wallStyle * 100.0 + top;
      const a0 = [...a, base], b0 = [...b, base], a1 = [...a, top], b1 = [...b, top];
      this.triangle(a0, b0, b1, normal, color, meta);
      this.triangle(a0, b1, a1, normal, color, meta);
      // Fine roof-perimeter edge
      this.edges.push(a[0], a[1], top + 0.03, b[0], b[1], top + 0.03);
      // Hairline vertical corner crease only at true architectural corners (separates adjacent footprints cleanly)
      if (prev && (len >= 2.6 || top >= 6.5)) {
        const pdx = a[0] - prev[0], pdy = a[1] - prev[1];
        const plen = Math.hypot(pdx, pdy) || 1;
        if ((pdx / plen) * (dx / len) + (pdy / plen) * (dy / len) < 0.76) {
          const cx = a[0] + normal[0] * 0.02, cy = a[1] + normal[1] * 0.02;
          this.edges.push(cx, cy, base + 0.06, cx, cy, top + 0.03);
        }
      }
      if (normal[0] * SH_DX + normal[1] * SH_DY <= 0) return;
      const aShade = [a[0] + top * SH_DX, a[1] + top * SH_DY, 0.06];
      const bShade = [b[0] + top * SH_DX, b[1] + top * SH_DY, 0.06];
      this.shadows.push(...a, 0.06, ...b, 0.06, ...bShade, ...a, 0.06, ...bShade, ...aShade);
    }
  }

  function mulMat4f64(a, b) {
    const out = new Float64Array(16);
    for (let col = 0; col < 4; col++) {
      const b0 = b[col * 4], b1 = b[col * 4 + 1], b2 = b[col * 4 + 2], b3 = b[col * 4 + 3];
      out[col * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
      out[col * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
      out[col * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      out[col * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return out;
  }

  function makeTileModelMatrix(lng, lat) {
    const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
    const s = mc.meterInMercatorCoordinateUnits();
    return new Float64Array([
      s,  0, 0, 0,
      0, -s, 0, 0,
      0,  0, s, 0,
      mc.x, mc.y, mc.z, 1
    ]);
  }

  function projectENU(m, x, y, z) {
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const cz = m[2] * x + m[6] * y + m[10] * z + m[14];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 1e-6) return null;
    return [cx / cw, cy / cw, cz / cw];
  }

  function hitProjectedTri(px, py, a, b, c) {
    if (!a || !b || !c) return null;
    const v0x = c[0] - a[0], v0y = c[1] - a[1];
    const v1x = b[0] - a[0], v1y = b[1] - a[1];
    const v2x = px - a[0],   v2y = py - a[1];
    const denom = v0x * v1y - v1x * v0y;
    if (Math.abs(denom) < 1e-10) return null;
    const inv = 1 / denom;
    const u = (v2x * v1y - v1x * v2y) * inv;
    if (u < -1e-4 || u > 1.0001) return null;
    const v = (v0x * v2y - v2x * v0y) * inv;
    if (v < -1e-4 || u + v > 1.0001) return null;
    const w = 1 - u - v;
    return w * a[2] + v * b[2] + u * c[2];
  }

  function meshHitDepth(px, py, matrix, positions) {
    let nearest = Infinity;
    for (let i = 0; i < positions.length; i += 9) {
      const a = projectENU(matrix, positions[i], positions[i + 1], positions[i + 2]);
      const b = projectENU(matrix, positions[i + 3], positions[i + 4], positions[i + 5]);
      const c = projectENU(matrix, positions[i + 6], positions[i + 7], positions[i + 8]);
      const depth = hitProjectedTri(px, py, a, b, c);
      if (depth !== null && depth < nearest) nearest = depth;
    }
    return Number.isFinite(nearest) ? nearest : null;
  }

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('City3D shader error:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  function formatLanduseLabel(cls) {
    const mapUse = {
      residential: 'Residential area (OSM landuse)',
      commercial: 'Commercial area (OSM landuse)',
      retail: 'Retail area (OSM landuse)',
      industrial: 'Industrial area (OSM landuse)',
      school: 'School grounds (OSM landuse)',
      college: 'College campus (OSM landuse)',
      university: 'University campus (OSM landuse)',
      kindergarten: 'Kindergarten / school (OSM landuse)',
      hospital: 'Hospital grounds (OSM landuse)',
      military: 'Military / restricted zone (OSM landuse)',
      bus_station: 'Transport terminal (OSM landuse)',
      garages: 'Garages / service area (OSM landuse)',
      cemetery: 'Cemetery grounds (OSM landuse)'
    };
    return mapUse[cls] || (cls ? `${cls.replaceAll('_', ' ')} (OSM landuse)` : null);
  }

  function createCityBuildingsLayer(options = {}) {
    const tileSource = options.tiles || global.tiles || {};
    const boundaryFeature = options.boundaryFeature || global.cityBoundary || null;
    const boundaryRing = boundaryFeature && boundaryFeature.geometry ? boundaryFeature.geometry.coordinates[0] : null;
    const barangayIndex = buildBarangayIndex(options.barangaysFeatureCollection || global.cityBarangays || null);
    const minZoom = options.minZoom ?? 14.0;
    const supported = typeof DecompressionStream !== 'undefined';

    let prog = null;
    let flatProg = null;
    let hlProg = null;
    let progLoc = null;
    let flatLoc = null;
    let hlLoc = null;
    let glRef = null;
    let mapRef = null;
    let lastRawMatrix = null;
    let frameTick = 0;

    let colorMode = 'architectural';
    let lightingMode = 'day';
    let lightingWarmth = 0.0;
    let nightFactor = 0.0;
    let hoverAnimStart = 0;
    let coverageClassifier = null;

    const tileDataCache = new Map();
    const tilePromises = new Map();
    const buildingById = new Map();
    const seamGroups = new Map();
    const knownPlaces = [];
    const knownPlaceKeys = new Set();

    const gpuCache = new Map();
    const gpuUploadQueue = [];
    const gpuUploadQueued = new Set();
    let selectedBuildingIds = new Set();
    let selectionStyle = 'full';
    let hoveredBuildingIds = new Set();
    let hlBuf = null, hlVertCount = 0, hlModel = null;
    let hovBuf = null, hovVertCount = 0, hovModel = null;
    let onTileIndexedCallback = null;

    const VS = `
      attribute vec3 a_pos;
      attribute vec3 a_normal;
      attribute vec3 a_color;
      attribute float a_meta;
      uniform mat4 u_mvp;
      varying vec3 v_pos;
      varying vec3 v_normal;
      varying vec3 v_color;
      varying float v_meta;
      void main() {
        gl_Position = u_mvp * vec4(a_pos, 1.0);
        v_pos = a_pos;
        v_normal = a_normal;
        v_color = a_color;
        v_meta = a_meta;
      }
    `;
    const FS = `
      precision mediump float;
      varying vec3 v_pos;
      varying vec3 v_normal;
      varying vec3 v_color;
      varying float v_meta;
      uniform vec3 u_sun;
      uniform float u_warmth;
      uniform float u_detail;
      uniform float u_night;
      void main() {
        vec3 n = normalize(v_normal);
        float ndl = max(dot(n, u_sun), 0.0);
        float bounce = max(dot(n, normalize(vec3(-u_sun.x, -u_sun.y, 0.36))), 0.0);
        vec3 sunKey = mix(vec3(1.13, 1.06, 0.94), vec3(1.22, 0.96, 0.74), u_warmth);
        vec3 shadeFill = mix(vec3(0.55, 0.61, 0.69), vec3(0.57, 0.59, 0.71), u_warmth);
        vec3 baseCol = v_color;
        vec3 col = baseCol;
        float litMask = 0.0;
        float litCommercial = 0.0;
        float litRun = 0.0;

        if (v_meta < -0.5) {
          // Roof planes (flat & pitched slopes): crisp sunlit vs shaded faces + material micro-grain & subtle concrete roof seams
          vec3 roofFill = mix(vec3(0.65, 0.69, 0.74), vec3(0.67, 0.67, 0.72), u_warmth);
          float slopeRim = (1.0 - n.z) * 0.10;
          vec3 roofLight = roofFill + sunKey * (0.41 * ndl + 0.05 + slopeRim * ndl);
          if (u_detail > 0.01) {
            if (v_meta <= -3.5) {
              float ang = (-v_meta - 4.0) * 3.14159265;
              float coord = -v_pos.x * sin(ang) + v_pos.y * cos(ang);
              float course = sin(coord * 5.8);
              float tileX = sin((v_pos.x * cos(ang) + v_pos.y * sin(ang)) * 4.2) * 0.4;
              col *= 1.0 + (course + tileX) * 0.025 * u_detail;
            } else if (v_meta <= -1.5) {
              float ang = (-v_meta - 2.0) * 3.14159265;
              float coord = v_pos.x * cos(ang) + v_pos.y * sin(ang);
              float seam = sin(coord * 5.2);
              col *= 1.0 + seam * 0.032 * u_detail;
            } else {
              // Subtle concrete expansion grid / gravel micro-variation on flat roofs
              float gx = smoothstep(0.94, 0.99, abs(sin(v_pos.x * 0.55)));
              float gy = smoothstep(0.94, 0.99, abs(sin(v_pos.y * 0.55)));
              col *= 1.0 - max(gx, gy) * 0.024 * u_detail;
            }
          }
          baseCol = col;
          col *= roofLight;
        } else {
          // Walls: strong warm sunlit vs cool architectural shadow contrast + 4 detailed San Fernando facade reliefs
          float wallStyle = floor(v_meta / 100.0 + 0.0001);
          float topH = v_meta - wallStyle * 100.0;
          vec3 wallLight = shadeFill + sunKey * (0.52 * ndl) + vec3(0.095, 0.105, 0.125) * bounce;
          float baseAO = mix(0.73, 1.0, smoothstep(0.0, 2.6, v_pos.z));
          float plinth = smoothstep(0.62, 0.12, v_pos.z) * u_detail;
          float distFromTop = topH - v_pos.z;
          float topCoping = smoothstep(0.44, 0.08, distFromTop) * u_detail;
          float eaveCrease = smoothstep(0.28, 0.50, distFromTop) * smoothstep(1.05, 0.50, distFromTop) * u_detail;

          float facadeDetail = max(u_detail, u_night * 0.75);
          if (facadeDetail > 0.02 && topH >= 3.8) {
            float wallRun = -v_pos.x * n.y + v_pos.y * n.x;
            litRun = wallRun;
            float skyGlint = 0.08 * (0.5 + 0.5 * sin(wallRun * 0.65 + v_pos.z * 0.95)) * (0.35 + 0.65 * ndl);
            vec3 glassTone = mix(vec3(0.26, 0.35, 0.44), vec3(0.34, 0.37, 0.45), u_warmth) + vec3(skyGlint * 0.85, skyGlint, skyGlint * 1.15);
            vec3 arcadeTone = vec3(0.21, 0.26, 0.32);

            if (wallStyle > 2.5) {
              // Style 3: Modern concrete commercial / bank — pilasters, recessed glazed bays, sunlit window sills & lintel shade
              float bay = fract(wallRun * 0.24);
              float paneH = smoothstep(0.15, 0.23, bay) * smoothstep(0.85, 0.77, bay);
              float pilaster = smoothstep(0.16, 0.05, bay) + smoothstep(0.84, 0.95, bay);
              float fPos = fract(v_pos.z / 3.3);
              float paneV = smoothstep(0.24, 0.33, fPos) * smoothstep(0.86, 0.77, fPos);
              float lintelShadow = paneH * smoothstep(0.75, 0.85, fPos) * smoothstep(0.89, 0.85, fPos);
              float sillLight = paneH * smoothstep(0.17, 0.23, fPos) * smoothstep(0.27, 0.23, fPos);
              float upperGlass = paneH * paneV * smoothstep(2.9, 3.4, v_pos.z) * smoothstep(topH - 0.55, topH - 0.95, v_pos.z);
              float groundShop = paneH * smoothstep(0.25, 0.55, v_pos.z) * smoothstep(2.68, 2.30, v_pos.z);
              col = mix(col, glassTone, upperGlass * 0.68 * u_detail);
              col *= 1.0 - lintelShadow * 0.22 * u_detail * smoothstep(2.9, 3.4, v_pos.z);
              col = mix(col, min(col * 1.12 + vec3(0.03), vec3(0.99)), sillLight * 0.55 * u_detail * smoothstep(2.9, 3.4, v_pos.z));
              col = mix(col, arcadeTone, groundShop * 0.60 * u_detail);
              col = mix(col, min(col * 1.08 + vec3(0.025), vec3(0.99)), clamp(pilaster, 0.0, 1.0) * 0.42 * u_detail);
              litMask = max(upperGlass, groundShop * 1.18);
              litCommercial = 1.0;
            } else if (wallStyle > 1.5) {
              // Style 2: Classic San Fernando shophouse — recessed ground arcade, restrained striped canvas awning + rhythmic upper windows
              float shopBay = fract(wallRun * 0.23);
              float shopOpen = smoothstep(0.11, 0.19, shopBay) * smoothstep(0.89, 0.81, shopBay);
              float groundArcade = shopOpen * smoothstep(0.20, 0.46, v_pos.z) * smoothstep(2.68, 2.34, v_pos.z);
              float awningBand = smoothstep(2.62, 2.74, v_pos.z) * smoothstep(3.14, 3.02, v_pos.z);
              float awningStripe = 0.88 + 0.12 * step(0.5, fract(wallRun * 1.6));
              float bSeed = fract(sin(floor(v_pos.x * 0.06) * 41.7 + floor(v_pos.y * 0.06) * 73.1) * 43758.5453);
              vec3 awningCol = bSeed < 0.28 ? vec3(0.22, 0.34, 0.48)
                             : (bSeed < 0.55 ? vec3(0.32, 0.47, 0.41)
                             : (bSeed < 0.78 ? vec3(0.64, 0.36, 0.30) : vec3(0.76, 0.68, 0.55)));
              float canopyShade = smoothstep(0.16, 0.44, 2.76 - v_pos.z) * smoothstep(0.92, 0.44, 2.76 - v_pos.z);
              float winBay = fract(wallRun * 0.31);
              float upperWin = smoothstep(0.21, 0.30, winBay) * smoothstep(0.79, 0.70, winBay)
                             * smoothstep(3.48, 3.74, v_pos.z) * smoothstep(topH - 0.65, topH - 0.95, v_pos.z);
              float upperSill = smoothstep(0.20, 0.28, winBay) * smoothstep(0.80, 0.72, winBay)
                              * smoothstep(3.32, 3.44, v_pos.z) * smoothstep(3.54, 3.44, v_pos.z);
              col = mix(col, arcadeTone, groundArcade * 0.64 * u_detail);
              col = mix(col, glassTone, upperWin * 0.64 * u_detail);
              col = mix(col, min(col * 1.12 + vec3(0.03), vec3(0.99)), upperSill * 0.55 * u_detail);
              col *= 1.0 - canopyShade * 0.20 * u_detail;
              col = mix(col, awningCol * awningStripe, awningBand * 0.72 * u_detail);
              litMask = max(groundArcade * 1.25, upperWin * 0.94);
              litCommercial = 1.0;
            } else if (wallStyle > 0.5) {
              // Style 1: Multi-story commercial block — crisp horizontal concrete floor slabs & recessed sky-glint ribbon windows
              float fPos = fract(v_pos.z / 3.25);
              float slabLedge = smoothstep(0.16, 0.04, fPos) + smoothstep(0.88, 0.98, fPos);
              float slabUnder = smoothstep(0.82, 0.88, fPos) * smoothstep(0.92, 0.88, fPos);
              float mull = fract(wallRun * 0.28);
              float pane = smoothstep(0.08, 0.15, mull) * smoothstep(0.92, 0.85, mull);
              float ribbonGlass = pane * smoothstep(0.28, 0.38, fPos) * smoothstep(0.82, 0.72, fPos)
                                * smoothstep(0.55, 0.95, v_pos.z) * smoothstep(topH - 0.50, topH - 0.85, v_pos.z);
              col = mix(col, glassTone, ribbonGlass * 0.68 * u_detail);
              col *= 1.0 - slabUnder * 0.18 * u_detail;
              col = mix(col, min(col * 1.11 + vec3(0.035), vec3(0.99)), clamp(slabLedge, 0.0, 1.0) * 0.66 * u_detail);
              litMask = ribbonGlass * 1.08;
              litCommercial = 1.0;
            } else {
              // Style 0: Low-rise pitched-roof residential house — spaced domestic windows with pale concrete sill
              float dBay = fract(wallRun * 0.25);
              float dWinH = smoothstep(0.25, 0.33, dBay) * smoothstep(0.75, 0.67, dBay);
              float dWin = dWinH * smoothstep(1.55, 1.85, v_pos.z) * smoothstep(min(3.55, topH - 0.65), min(3.25, topH - 0.95), v_pos.z);
              float dSill = dWinH * smoothstep(1.38, 1.52, v_pos.z) * smoothstep(1.62, 1.52, v_pos.z);
              col = mix(col, glassTone, dWin * 0.58 * u_detail);
              col = mix(col, min(col * 1.10 + vec3(0.03), vec3(0.99)), dSill * 0.50 * u_detail);
              litMask = dWin * 0.94;
              litCommercial = 0.0;
            }
          }

          col = mix(col, min(col * 1.10 + vec3(0.038, 0.034, 0.026), vec3(0.99)), topCoping * 0.76);
          col *= (1.0 - eaveCrease * 0.11) * (1.0 - plinth * 0.09);
          baseCol = col;
          col *= wallLight * baseAO;
        }

        if (u_night > 0.001) {
          float moonDot = max(dot(n, normalize(vec3(-0.55, 0.45, 0.70))), 0.0);
          vec3 moonFill = (v_meta < -0.5) ? vec3(0.21, 0.27, 0.40) : vec3(0.14, 0.19, 0.30);
          vec3 nightCol = baseCol * (moonFill + vec3(0.32, 0.42, 0.62) * (0.46 * moonDot + 0.05));
          if (v_meta >= -0.5) {
            // Subtle warm street-level glow on commercial ground walls
            float groundWarm = smoothstep(3.2, 0.0, v_pos.z) * litCommercial;
            nightCol += vec3(0.11, 0.08, 0.04) * groundWarm;
            if (litMask > 0.02) {
              float cellX = floor(litRun * 0.28);
              float cellZ = floor(v_pos.z / 3.25);
              float cellB = floor(v_pos.x * 0.09) * 19.3 + floor(v_pos.y * 0.09) * 37.7;
              float seed = fract(sin(cellX * 127.1 + cellZ * 311.7 + cellB) * 43758.5453);
              float threshold = mix(0.54, 0.26, litCommercial);
              float isLit = step(threshold, seed);
              float temp = fract(seed * 7.13);
              vec3 warmGlow = mix(vec3(1.0, 0.78, 0.42), vec3(1.0, 0.92, 0.72), smoothstep(0.15, 0.75, temp));
              vec3 winGlow = mix(warmGlow, vec3(0.76, 0.90, 1.0), step(0.84, temp) * litCommercial);
              nightCol = mix(nightCol, winGlow * (0.88 + 0.14 * litCommercial), clamp(litMask, 0.0, 1.0) * isLit * 0.94);
            }
          }
          col = mix(col, nightCol, u_night);
        }
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `;

    const FLAT_VS = `
      attribute vec3 a_pos;
      uniform mat4 u_mvp;
      void main() { gl_Position = u_mvp * vec4(a_pos, 1.0); }
    `;
    const FLAT_FS = `
      precision mediump float;
      uniform vec4 u_color;
      void main() { gl_FragColor = u_color; }
    `;

    const HL_VS = `
      attribute vec3 a_pos;
      attribute vec3 a_color;
      uniform mat4 u_mvp;
      varying vec3 v_color;
      void main() {
        gl_Position = u_mvp * vec4(a_pos, 1.0);
        v_color = a_color;
      }
    `;
    const HL_FS = `
      precision mediump float;
      varying vec3 v_color;
      uniform float u_alpha;
      void main() { gl_FragColor = vec4(v_color, u_alpha); }
    `;

    function registerPlaces(places) {
      for (const p of places) {
        const key = `${p.class}:${p.name}`;
        if (!knownPlaceKeys.has(key)) {
          knownPlaceKeys.add(key);
          knownPlaces.push(p);
        }
      }
    }

    function findNearestPlace(lng, lat) {
      let best = null, bestD = Infinity;
      for (const p of knownPlaces) {
        if (p.class === 'city' || p.class === 'town') continue;
        const d = Math.hypot((lng - p.lng) * 106500, (lat - p.lat) * 110600);
        if (d < bestD) { bestD = d; best = p; }
      }
      if (!best || bestD > 3500) return null;
      return { name: best.name, placeClass: best.class, distanceM: Math.round(bestD) };
    }

    function stitchSeamBuildings(newTileKey, newBuildings) {
      const [z, tx, ty] = newTileKey.split('/').map(Number);
      const seamNew = newBuildings.filter(b => b.touchesSeam);
      if (!seamNew.length) return;
      const neighbors = [`${z}/${tx - 1}/${ty}`, `${z}/${tx + 1}/${ty}`, `${z}/${tx}/${ty - 1}`, `${z}/${tx}/${ty + 1}`];
      for (const nk of neighbors) {
        const nEnt = tileDataCache.get(nk);
        if (!nEnt || nEnt.state !== 'ready') continue;
        const seamOther = nEnt.buildings.filter(b => b.touchesSeam);
        if (!seamOther.length) continue;
        for (const a of seamNew) {
          for (const b of seamOther) {
            if (Math.abs(a.height - b.height) > 0.5) continue;
            if (a.bboxLL[2] + 0.00006 < b.bboxLL[0] || b.bboxLL[2] + 0.00006 < a.bboxLL[0]) continue;
            if (a.bboxLL[3] + 0.00006 < b.bboxLL[1] || b.bboxLL[3] + 0.00006 < a.bboxLL[1]) continue;
            if (sharesBufferedEdge(a.ringLL, b.ringLL)) {
              const gId = a.seamGroupId || b.seamGroupId || `grp:${a.id}`;
              const oldG = b.seamGroupId && b.seamGroupId !== gId ? b.seamGroupId : null;
              if (!seamGroups.has(gId)) seamGroups.set(gId, new Set());
              const grp = seamGroups.get(gId);
              grp.add(a.id); grp.add(b.id);
              a.seamGroupId = gId; b.seamGroupId = gId;
              if (oldG && seamGroups.has(oldG)) {
                for (const oid of seamGroups.get(oldG)) {
                  grp.add(oid);
                  const ob = buildingById.get(oid);
                  if (ob) ob.seamGroupId = gId;
                }
                seamGroups.delete(oldG);
              }
            }
          }
        }
      }
    }

    function decodeTileData(tk, parsedLayers) {
      const [z, tx, ty] = tk.split('/').map(Number);
      const bLayer = parsedLayers.building;
      const extent = bLayer ? bLayer.extent : 4096;
      const centerLL = tileToLngLat(z, tx, ty, extent / 2, extent / 2, extent);
      const mPerDegLng = 111320 * Math.cos(centerLL[1] * Math.PI / 180);
      const mPerDegLat = 110574;

      const landusePolys = [];
      if (parsedLayers.landuse) {
        const luExt = parsedLayers.landuse.extent;
        for (const f of parsedLayers.landuse.feats) {
          const cls = f.props.class;
          if (!cls || cls === 'pitch' || cls === 'playground' || cls === 'track') continue;
          const rings = decodeOuterRings(f.geom);
          for (const r of rings) {
            const ll = r.map(([px, py]) => tileToLngLat(z, tx, ty, px, py, luExt));
            let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
            for (const [lx, ly] of ll) {
              if (lx < x0) x0 = lx; if (lx > x1) x1 = lx;
              if (ly < y0) y0 = ly; if (ly > y1) y1 = ly;
            }
            landusePolys.push({ cls, ringLL: ll, bbox: [x0, y0, x1, y1] });
          }
        }
      }

      const houseNums = [];
      if (parsedLayers.housenumber) {
        const hnExt = parsedLayers.housenumber.extent;
        for (const f of parsedLayers.housenumber.feats) {
          const pt = decodePoint(f.geom);
          if (!pt || !f.props.housenumber) continue;
          const ll = tileToLngLat(z, tx, ty, pt[0], pt[1], hnExt);
          houseNums.push({ num: String(f.props.housenumber), lng: ll[0], lat: ll[1] });
        }
      }

      const places = [];
      if (parsedLayers.place) {
        const pExt = parsedLayers.place.extent;
        for (const f of parsedLayers.place.feats) {
          const pt = decodePoint(f.geom);
          if (!pt || !f.props.name) continue;
          const ll = tileToLngLat(z, tx, ty, pt[0], pt[1], pExt);
          if (!boundaryRing || pointInPoly(ll[0], ll[1], boundaryRing)) {
            places.push({ name: String(f.props.name), class: String(f.props.class || 'place'), lng: ll[0], lat: ll[1] });
          }
        }
        registerPlaces(places);
      }

      const buildings = [];
      if (bLayer) {
        let localIdx = 0;
        for (const feat of bLayer.feats) {
          const props = feat.props || {};
          const rawHeight = typeof props.render_height === 'number' ? props.render_height : 5;
          const minHeight = typeof props.render_min_height === 'number' ? Math.max(0, props.render_min_height) : 0;
          const mappedColour = typeof props.colour === 'string' ? props.colour : (typeof props['building:colour'] === 'string' ? props['building:colour'] : null);
          const mappedRoofColour = typeof props.roof_colour === 'string' ? props.roof_colour : (typeof props['roof:colour'] === 'string' ? props['roof:colour'] : null);
          const mappedRoofMaterial = typeof props.roof_material === 'string' ? props.roof_material : (typeof props['roof:material'] === 'string' ? props['roof:material'] : null);
          const mappedRoofShape = typeof props.roof_shape === 'string' ? props.roof_shape : (typeof props['roof:shape'] === 'string' ? props['roof:shape'] : null);
          const mappedLevels = props.levels ?? props['building:levels'] ?? null;
          const mappedName = typeof props.name === 'string' && props.name.trim() ? props.name.trim() : null;
          const isHeightMapped = rawHeight !== 5 || mappedLevels !== null;

          const outerRings = decodeOuterRings(feat.geom);
          for (const rawRing of outerRings) {
            let touchesSeam = false;
            const ptsENU = [];
            const ptsLL = [];
            for (const [px, py] of rawRing) {
              if (px <= 3 || px >= extent - 3 || py <= 3 || py >= extent - 3) touchesSeam = true;
              const ll = tileToLngLat(z, tx, ty, px, py, extent);
              const mx = (ll[0] - centerLL[0]) * mPerDegLng;
              const my = (ll[1] - centerLL[1]) * mPerDegLat;
              if (ptsENU.length) {
                const prev = ptsENU[ptsENU.length - 1];
                if (Math.hypot(mx - prev[0], my - prev[1]) < 0.30) continue;
              }
              ptsENU.push([mx, my]);
              ptsLL.push(ll);
            }
            if (ptsENU.length > 2 && Math.hypot(ptsENU[0][0] - ptsENU[ptsENU.length - 1][0], ptsENU[0][1] - ptsENU[ptsENU.length - 1][1]) < 0.30) {
              ptsENU.pop(); ptsLL.pop();
            }
            if (ptsENU.length < 3) continue;

            let area2 = 0, cx = 0, cy = 0;
            let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
            for (let i = 0; i < ptsENU.length; i++) {
              const p = ptsENU[i], q = ptsENU[(i + 1) % ptsENU.length];
              area2 += p[0] * q[1] - q[0] * p[1];
              cx += p[0]; cy += p[1];
              if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
              if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
            }
            if (Math.abs(area2) < 10) continue;
            if (area2 < 0) { ptsENU.reverse(); ptsLL.reverse(); }
            const areaM2 = Math.abs(area2) * 0.5;
            cx /= ptsENU.length; cy /= ptsENU.length;
            const cxLL = centerLL[0] + cx / mPerDegLng;
            const cyLL = centerLL[1] + cy / mPerDegLat;

            let minLng = 1e9, maxLng = -1e9, minLat = 1e9, maxLat = -1e9;
            for (const [lx, ly] of ptsLL) {
              if (lx < minLng) minLng = lx; if (lx > maxLng) maxLng = lx;
              if (ly < minLat) minLat = ly; if (ly > maxLat) maxLat = ly;
            }

            let landmarkId = null;
            if (global.VERIFIED_LANDMARKS) {
              const landmark = global.VERIFIED_LANDMARKS.find(lm =>
                lm.lng >= minLng && lm.lng <= maxLng && lm.lat >= minLat && lm.lat <= maxLat &&
                pointInPoly(lm.lng, lm.lat, ptsLL));
              landmarkId = landmark?.id || null;
            }

            let mappedLanduse = null;
            for (const lu of landusePolys) {
              if (cxLL >= lu.bbox[0] && cxLL <= lu.bbox[2] && cyLL >= lu.bbox[1] && cyLL <= lu.bbox[3]) {
                if (pointInPoly(cxLL, cyLL, lu.ringLL)) { mappedLanduse = lu.cls; break; }
              }
            }

            let mappedHouseNumber = null;
            for (const hn of houseNums) {
              if (hn.lng >= minLng && hn.lng <= maxLng && hn.lat >= minLat && hn.lat <= maxLat && pointInPoly(hn.lng, hn.lat, ptsLL)) {
                mappedHouseNumber = hn.num;
                break;
              }
            }

            const officialBarangay = barangayIndex.length ? findOfficialBarangay(cxLL, cyLL, barangayIndex) : null;
            const id = `SFB-${tx}-${ty}-${String(++localIdx).padStart(4, '0')}`;
            const height = rawHeight > minHeight ? rawHeight : minHeight + 5;
            const roofTris = triangulateCCW(ptsENU);
            const ownedRingLL = touchesSeam
              ? clipToTile(rawRing, extent).map(([px, py]) => tileToLngLat(z, tx, ty, px, py, extent))
              : ptsLL;
            const ownedArea = touchesSeam ? ringAreaLL(ownedRingLL, mPerDegLng, mPerDegLat) : areaM2;
            const clippedAtBuffer = rawRing.some(p => p.some(v => v === -64 || v === extent + 64));

            const rec = {
              id, tileKey: tk, seamGroupId: null, touchesSeam, ownedArea, ownedRingLL, clippedAtBuffer,
              ringLL: ptsLL, ringENU: ptsENU,
              centerLL: [cxLL, cyLL], centerENU: [cx, cy],
              bboxLL: [minLng, minLat, maxLng, maxLat],
              bboxENU: [minX, minY, maxX, maxY],
              areaM2, height, rawHeight, minHeight, isHeightMapped,
              mappedColour, mappedRoofColour, mappedRoofMaterial, mappedRoofShape, mappedLevels, mappedName,
              mappedLanduse, mappedUseLabel: formatLanduseLabel(mappedLanduse),
              mappedHouseNumber, officialBarangay,
              insideCity: boundaryRing ? pointInPoly(cxLL, cyLL, boundaryRing) : true,
              landmarkId, roofTris
            };
            buildings.push(rec);
            buildingById.set(id, rec);
          }
        }
      }

      const ent = {
        state: 'ready', tileKey: tk, centerLL, mPerDegLng, mPerDegLat,
        buildings, places, model: makeTileModelMatrix(centerLL[0], centerLL[1]), mvp64: null
      };
      tileDataCache.set(tk, ent);
      stitchSeamBuildings(tk, buildings);
      if (onTileIndexedCallback) onTileIndexedCallback(tk, ent);
      return ent;
    }

    function isSculptedFootprintExcluded(b) {
      const excl = global.SCULPTED_FOOTPRINT_EXCLUSIONS;
      if (!Array.isArray(excl) || !excl.length) return false;
      const [lng, lat] = b.centerLL;
      for (const e of excl) {
        const dx = (lng - e.lng) * 106675;
        const dy = (lat - e.lat) * 110574;
        if (dx * dx + dy * dy <= e.radiusM * e.radiusM) return true;
      }
      return false;
    }

    function buildTileMesh(ent) {
      const mesh = new CityMesh();
      for (const b of ent.buildings) {
        // Avoid double-walled z-fighting where a verified sculpted 3D landmark, mall, campus, bank or flagship occupies the footprint
        if (b.landmarkId && FULL_LANDMARK_IDS.has(b.landmarkId)) continue;
        if (isSculptedFootprintExcluded(b)) continue;
        const primary = getGroupParts(b).reduce((a, c) => a.areaM2 >= c.areaM2 ? a : c);
        let material;
        if (colorMode === 'coverage' && coverageClassifier) {
          material = COVERAGE_PAL[coverageClassifier(primary.id)] || COVERAGE_PAL.unlinked;
        } else {
          material = resolveBuildingMaterial(b, primary);
        }
        const pts = b.ringENU;
        const n = pts.length;
        const h = stableHashLngLat(primary.centerLL[0], primary.centerLL[1]);
        // Scale-appropriate San Fernando architectural facade typology (independent of business category)
        let wallStyle = 0;
        if (colorMode !== 'coverage' && !b.landmarkId) {
          if (b.height >= 7.5) wallStyle = ((h >>> 11) % 3 === 0) ? 3 : 1;
          else wallStyle = [2, 2, 1, 3][(h >>> 11) & 3];
        }
        const angNorm = dominantRoofAngle(pts) / Math.PI;
        const roofMeta = material.grain === 2
          ? -(4.0 + angNorm)
          : (material.grain === 1 ? -(2.0 + angNorm) : -1.0);

        // 1. Pitched hipped / gabled roofs on clean 4-vertex low-rise footprints (~60% of eligible footprints)
        const allowPitched = !b.landmarkId && !b.clippedAtBuffer && colorMode !== 'coverage'
          && b.height <= 5.6 && n === 4 && ((h >>> 15) % 5) < 3;
        const pitched = allowPitched ? computePitchedRectSpec(pts) : null;

        if (pitched) {
          const { p, m0, m1, longLen, shortLen, rise } = pitched;
          const zEave = b.height;
          const zRidge = b.height + rise;
          // Pitched low-rise footprints use quiet domestic facade style (Style 0) rather than commercial storefronts
          for (let i = 0; i < n; i++) {
            mesh.wall(pts[i], pts[(i + 1) % n], pts[(i + n - 1) % n], b.minHeight, zEave, material.wall, 0);
          }
          const isGable = (longLen / shortLen >= 1.28) && (((h >>> 18) & 3) === 0);
          const e0 = [p[0][0], p[0][1], zEave], e1 = [p[1][0], p[1][1], zEave];
          const e2 = [p[2][0], p[2][1], zEave], e3 = [p[3][0], p[3][1], zEave];
          if (isGable) {
            const r0 = [m0[0], m0[1], zRidge], r1 = [m1[0], m1[1], zRidge];
            mesh.slopedQuad(e0, e1, r1, r0, material.roof, roofMeta);
            mesh.slopedQuad(e2, e3, r0, r1, material.roof, roofMeta);
            // Plastered gable-end triangles
            const nEnd1 = normalize3([p[2][1] - p[1][1], -(p[2][0] - p[1][0]), 0]);
            const nEnd0 = normalize3([p[0][1] - p[3][1], -(p[0][0] - p[3][0]), 0]);
            mesh.triangle(e1, e2, r1, nEnd1, material.wall, zRidge);
            mesh.triangle(e3, e0, r0, nEnd0, material.wall, zRidge);
            mesh.edges.push(
              r0[0], r0[1], r0[2] + 0.04, r1[0], r1[1], r1[2] + 0.04,
              e0[0], e0[1], e0[2] + 0.03, r0[0], r0[1], r0[2] + 0.04,
              e3[0], e3[1], e3[2] + 0.03, r0[0], r0[1], r0[2] + 0.04,
              e1[0], e1[1], e1[2] + 0.03, r1[0], r1[1], r1[2] + 0.04,
              e2[0], e2[1], e2[2] + 0.03, r1[0], r1[1], r1[2] + 0.04
            );
          } else {
            const insetT = Math.min(0.42, (shortLen * 0.44) / longLen);
            const r0 = [m0[0] + (m1[0] - m0[0]) * insetT, m0[1] + (m1[1] - m0[1]) * insetT, zRidge];
            const r1 = [m1[0] + (m0[0] - m1[0]) * insetT, m1[1] + (m0[1] - m1[1]) * insetT, zRidge];
            mesh.slopedQuad(e0, e1, r1, r0, material.roof, roofMeta);
            mesh.slopedTri(e1, e2, r1, material.roof, roofMeta);
            mesh.slopedQuad(e2, e3, r0, r1, material.roof, roofMeta);
            mesh.slopedTri(e3, e0, r0, material.roof, roofMeta);
            mesh.edges.push(
              r0[0], r0[1], r0[2] + 0.04, r1[0], r1[1], r1[2] + 0.04,
              e0[0], e0[1], e0[2] + 0.03, r0[0], r0[1], r0[2] + 0.04,
              e3[0], e3[1], e3[2] + 0.03, r0[0], r0[1], r0[2] + 0.04,
              e1[0], e1[1], e1[2] + 0.03, r1[0], r1[1], r1[2] + 0.04,
              e2[0], e2[1], e2[2] + 0.03, r1[0], r1[1], r1[2] + 0.04
            );
          }
          continue;
        }

        // 2. Sculpted deep parapet roof deck + restrained rooftop penthouse/skylight on safe convex commercial blocks
        const parapet = (!b.landmarkId && !b.clippedAtBuffer && b.height >= 4.5 && colorMode !== 'coverage')
          ? computeSafeParapetInset(pts, 0.58)
          : null;

        if (parapet) {
          const { inPts, sign } = parapet;
          const zParapet = b.height + 0.46;
          const copingCol = blendRGB(material.wall, [0.98, 0.96, 0.92], 0.52);
          const innerWallCol = shiftShade(material.wall, -0.025);
          for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            mesh.wall(pts[i], pts[j], pts[(i + n - 1) % n], b.minHeight, zParapet, material.wall, wallStyle);
            // Flat coping rim cap
            const o0 = [pts[i][0], pts[i][1], zParapet];
            const o1 = [pts[j][0], pts[j][1], zParapet];
            const i0 = [inPts[i][0], inPts[i][1], zParapet];
            const i1 = [inPts[j][0], inPts[j][1], zParapet];
            mesh.triangle(o0, o1, i1, [0, 0, 1], copingCol, -1.0);
            mesh.triangle(o0, i1, i0, [0, 0, 1], copingCol, -1.0);
            // Crisp inner parapet return wall catching sunlit vs shaded bevel depth
            const dx = pts[j][0] - pts[i][0], dy = pts[j][1] - pts[i][1];
            const len = Math.hypot(dx, dy) || 1;
            const inNorm = [(-dy / len) * sign, (dx / len) * sign, 0];
            mesh.innerWall(inPts[j], inPts[i], b.height, zParapet, inNorm, innerWallCol);
            mesh.edges.push(inPts[i][0], inPts[i][1], zParapet + 0.03, inPts[j][0], inPts[j][1], zParapet + 0.03);
          }
          // Recessed inner roof deck (strictly convex fan)
          for (let k = 1; k < n - 1; k++) {
            mesh.triangle(
              [inPts[0][0], inPts[0][1], b.height],
              [inPts[k][0], inPts[k][1], b.height],
              [inPts[k + 1][0], inPts[k + 1][1], b.height],
              [0, 0, 1],
              material.roof,
              roofMeta
            );
          }
          if (b.areaM2 >= 165) {
            addRooftopMass(mesh, inPts, b.height, material.roof, material.wall, h);
          }
        } else {
          for (let i = 0; i < n; i++) {
            mesh.wall(pts[i], pts[(i + 1) % n], pts[(i + n - 1) % n], b.minHeight, b.height, material.wall, wallStyle);
          }
          for (const tri of b.roofTris) {
            const [a, b1, c] = tri.map(i => pts[i]);
            mesh.triangle([...a, b.height], [...b1, b.height], [...c, b.height], [0, 0, 1], material.roof, roofMeta);
          }
        }
      }
      return {
        solidData: new Float32Array(mesh.vertices), solidCount: mesh.vertices.length / 10,
        edgeData: new Float32Array(mesh.edges), edgeCount: mesh.edges.length / 3,
        shData: new Float32Array(mesh.shadows), shCount: mesh.shadows.length / 3
      };
    }

    function ensureTileDecoded(tk) {
      const existing = tileDataCache.get(tk);
      if (existing && (existing.state === 'ready' || existing.state === 'empty')) {
        return Promise.resolve(existing.state === 'ready' ? existing : null);
      }
      if (tilePromises.has(tk)) return tilePromises.get(tk);
      const b64 = tileSource[tk];
      if (!b64 || !supported) {
        tileDataCache.set(tk, { state: 'empty' });
        return Promise.resolve(null);
      }
      const p = (async () => {
        try {
          const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          const u8 = await gunzipIfNeeded(raw);
          if (!u8) { tileDataCache.set(tk, { state: 'empty' }); return null; }
          const parsed = parseTileLayers(u8);
          if (!parsed.building && !parsed.place) { tileDataCache.set(tk, { state: 'empty' }); return null; }
          return decodeTileData(tk, parsed);
        } catch (err) {
          console.warn('City3D tile decode skipped:', tk, err);
          tileDataCache.set(tk, { state: 'empty' });
          return null;
        } finally {
          tilePromises.delete(tk);
        }
      })();
      tilePromises.set(tk, p);
      return p;
    }

    function disposeGpuEntry(g) {
      if (!glRef || !g) return;
      if (g.solidBuf) glRef.deleteBuffer(g.solidBuf);
      if (g.edgeBuf) glRef.deleteBuffer(g.edgeBuf);
      if (g.shBuf) glRef.deleteBuffer(g.shBuf);
    }

    function uploadTileGPU(tk, ent) {
      if (!glRef || !ent) return;
      const prev = gpuCache.get(tk);
      if (prev) disposeGpuEntry(prev);

      const built = buildTileMesh(ent);
      if (!built.solidCount) { gpuCache.set(tk, { state: 'empty', lastUsed: frameTick }); return; }

      const mkBuf = (data) => {
        if (!data.length) return null;
        const buf = glRef.createBuffer();
        glRef.bindBuffer(glRef.ARRAY_BUFFER, buf);
        glRef.bufferData(glRef.ARRAY_BUFFER, data, glRef.STATIC_DRAW);
        return buf;
      };
      const solidBuf = mkBuf(built.solidData);
      const edgeBuf = mkBuf(built.edgeData);
      const shBuf = mkBuf(built.shData);
      glRef.bindBuffer(glRef.ARRAY_BUFFER, null);

      gpuCache.set(tk, {
        state: 'ready',
        solidBuf, solidCount: built.solidCount,
        edgeBuf, edgeCount: built.edgeCount,
        shBuf, shCount: built.shCount,
        lastUsed: frameTick
      });

      if (gpuCache.size > 36) {
        const readyEnts = [...gpuCache.entries()]
          .filter(([, g]) => g.state === 'ready')
          .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
        while (readyEnts.length > 30) {
          const [oldK, oldG] = readyEnts.shift();
          disposeGpuEntry(oldG);
          gpuCache.delete(oldK);
        }
      }
      if (mapRef) mapRef.triggerRepaint();
    }

    function ensureTileGPU(tk) {
      if (gpuCache.has(tk)) return;
      if (!tileSource[tk] || !supported) return;
      gpuCache.set(tk, { state: 'loading', lastUsed: frameTick });
      ensureTileDecoded(tk).then(ent => {
        if (!ent || !glRef) { gpuCache.set(tk, { state: 'empty', lastUsed: frameTick }); return; }
        if (!gpuUploadQueued.has(tk)) {
          gpuUploadQueued.add(tk);
          gpuUploadQueue.push({ tk, ent });
          if (mapRef) mapRef.triggerRepaint();
        }
      });
    }

    function drainGpuUploadQueue(budget) {
      let uploaded = 0;
      while (uploaded < budget && gpuUploadQueue.length) {
        const { tk, ent } = gpuUploadQueue.shift();
        gpuUploadQueued.delete(tk);
        const cur = gpuCache.get(tk);
        if (!cur || cur.state === 'loading') {
          uploadTileGPU(tk, ent);
          uploaded++;
        }
      }
      if (gpuUploadQueue.length && mapRef) mapRef.triggerRepaint();
    }

    function rebuildAllReadyTileGPU() {
      for (const [tk, g] of [...gpuCache.entries()]) {
        if (g.state !== 'ready') continue;
        const ent = tileDataCache.get(tk);
        if (ent && ent.state === 'ready') uploadTileGPU(tk, ent);
      }
    }

    function buildRimBuffer(idSet, colOuter, colInner, wOut, wIn, fasciaH) {
      if (!glRef || !idSet.size) return { buf: null, count: 0, model: null };
      const bldgs = [];
      for (const bid of idSet) {
        const b = buildingById.get(bid);
        if (b) bldgs.push(b);
      }
      if (!bldgs.length) return { buf: null, count: 0, model: null };

      const cLL = bldgs[0].centerLL;
      const mPerDegLng = 111320 * Math.cos(cLL[1] * Math.PI / 180);
      const mPerDegLat = 110574;
      const model = makeTileModelMatrix(cLL[0], cLL[1]);

      const v = [];
      const pushTri = (a, b, c, col) => {
        v.push(
          a[0], a[1], a[2], col[0], col[1], col[2],
          b[0], b[1], b[2], col[0], col[1], col[2],
          c[0], c[1], c[2], col[0], col[1], col[2]
        );
      };
      const pushQuad = (a, b, c, d, col) => { pushTri(a, b, c, col); pushTri(a, c, d, col); };

      for (const b of getGeometryParts(bldgs)) {
        const pts = b.ringLL.map(([lng, lat]) => [
          (lng - cLL[0]) * mPerDegLng,
          (lat - cLL[1]) * mPerDegLat
        ]);
        const zTop = b.height + 0.08;
        for (let i = 0; i < pts.length; i++) {
          const p0 = pts[i], p1 = pts[(i + 1) % pts.length];
          const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
          const len = Math.hypot(dx, dy);
          if (len < 0.1) continue;
          const nx = dy / len, ny = -dx / len;

          pushQuad(
            [p0[0] - nx * 0.18, p0[1] - ny * 0.18, zTop],
            [p1[0] - nx * 0.18, p1[1] - ny * 0.18, zTop],
            [p1[0] + nx * wOut, p1[1] + ny * wOut, zTop],
            [p0[0] + nx * wOut, p0[1] + ny * wOut, zTop],
            colOuter
          );
          pushQuad(
            [p0[0] - nx * 0.04, p0[1] - ny * 0.04, zTop + 0.07],
            [p1[0] - nx * 0.04, p1[1] - ny * 0.04, zTop + 0.07],
            [p1[0] + nx * wIn, p1[1] + ny * wIn, zTop + 0.07],
            [p0[0] + nx * wIn, p0[1] + ny * wIn, zTop + 0.07],
            colInner
          );
          if (fasciaH > 0) {
            pushQuad(
              [p0[0] + nx * 0.22, p0[1] + ny * 0.22, zTop - fasciaH],
              [p1[0] + nx * 0.22, p1[1] + ny * 0.22, zTop - fasciaH],
              [p1[0] + nx * 0.22, p1[1] + ny * 0.22, zTop + 0.09],
              [p0[0] + nx * 0.22, p0[1] + ny * 0.22, zTop + 0.09],
              colInner
            );
          }
        }
      }
      if (!v.length) return { buf: null, count: 0, model: null };
      const buf = glRef.createBuffer();
      glRef.bindBuffer(glRef.ARRAY_BUFFER, buf);
      glRef.bufferData(glRef.ARRAY_BUFFER, new Float32Array(v), glRef.STATIC_DRAW);
      glRef.bindBuffer(glRef.ARRAY_BUFFER, null);
      return { buf, count: v.length / 6, model };
    }

    function rebuildSelectionHighlightGPU() {
      if (glRef && hlBuf) glRef.deleteBuffer(hlBuf);
      const isSoft = selectionStyle === 'soft';
      const r = isSoft
        ? buildRimBuffer(selectedBuildingIds, [0.97, 0.96, 0.93], [0.16, 0.29, 0.48], 0.44, 0.28, 0.24)
        : buildRimBuffer(selectedBuildingIds, [0.96, 0.95, 0.91], [0.10, 0.19, 0.34], 0.48, 0.28, 0.20);
      hlBuf = r.buf; hlVertCount = r.count; hlModel = r.model;
      if (mapRef) mapRef.triggerRepaint();
    }

    function rebuildHoverHighlightGPU() {
      if (glRef && hovBuf) glRef.deleteBuffer(hovBuf);
      const r = buildRimBuffer(hoveredBuildingIds, [0.94, 0.93, 0.88], [0.34, 0.40, 0.45], 0.35, 0.20, 0.15);
      hovBuf = r.buf; hovVertCount = r.count; hovModel = r.model;
      if (mapRef) mapRef.triggerRepaint();
    }

    function getVisibleZ14Keys() {
      if (!mapRef) return [];
      const b = mapRef.getBounds();
      const ctr = mapRef.getCenter();
      const [cxT, cyT] = lngLatToTile(ctr.lng, ctr.lat, 14);
      const [x0, y1] = lngLatToTile(b.getWest(), b.getSouth(), 14);
      const [x1, y0] = lngLatToTile(b.getEast(), b.getNorth(), 14);
      const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
      const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
      const list = [];
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const k = `14/${x}/${y}`;
          if (tileSource[k]) list.push({ k, d: Math.hypot(x - cxT, y - cyT) });
        }
      }
      list.sort((a, b2) => a.d - b2.d);
      return list.slice(0, 16).map(item => item.k);
    }

    function getGroupParts(building) {
      if (!building) return [];
      if (building.seamGroupId && seamGroups.has(building.seamGroupId)) {
        return [...seamGroups.get(building.seamGroupId)].map(id => buildingById.get(id)).filter(Boolean);
      }
      return [building];
    }

    function getGeometryParts(parts) {
      if (parts.length < 2) return parts;
      const complete = parts.find(p => !p.clippedAtBuffer);
      if (complete) return [complete];
      return parts.filter(p => p.ownedArea > 0.01).map(p => ({ ...p, ringLL: p.ownedRingLL, areaM2: p.ownedArea }));
    }

    function getBuildingGeoJSON(buildingOrId) {
      const b = typeof buildingOrId === 'string' ? buildingById.get(buildingOrId) : buildingOrId;
      if (!b) return null;
      const parts = getGroupParts(b);
      const rings = getGeometryParts(parts).map(p => {
        const closed = p.ringLL.slice();
        const first = closed[0], last = closed[closed.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) closed.push(first);
        return [closed];
      });
      return {
        type: 'Feature',
        properties: { buildingId: b.id },
        geometry: rings.length === 1
          ? { type: 'Polygon', coordinates: rings[0] }
          : { type: 'MultiPolygon', coordinates: rings }
      };
    }

    function getBuildingMeta(buildingOrId) {
      const b = typeof buildingOrId === 'string' ? buildingById.get(buildingOrId) : buildingOrId;
      if (!b) return null;
      const parts = getGroupParts(b);
      const geometryParts = getGeometryParts(parts);
      const totalAreaM2 = geometryParts.reduce((s, p) => s + p.areaM2, 0);
      const primary = parts.slice().sort((a, c) => c.areaM2 - a.areaM2)[0] || b;
      const sumX = geometryParts.reduce((s, p) => s + p.centerLL[0] * p.areaM2, 0) / (totalAreaM2 || 1);
      const sumY = geometryParts.reduce((s, p) => s + p.centerLL[1] * p.areaM2, 0) / (totalAreaM2 || 1);
      const mappedUse = parts.find(p => p.mappedUseLabel)?.mappedUseLabel || null;
      const mappedHouseNumber = parts.find(p => p.mappedHouseNumber)?.mappedHouseNumber || null;
      const mappedColour = parts.find(p => p.mappedColour)?.mappedColour || null;
      const mappedName = parts.find(p => p.mappedName)?.mappedName || null;
      const landmarkId = parts.find(p => p.landmarkId)?.landmarkId || null;
      const officialBarangay = parts.find(p => p.officialBarangay)?.officialBarangay || null;
      const nearestPlace = findNearestPlace(sumX, sumY);

      return {
        id: primary.id,
        partIds: parts.map(p => p.id),
        seamGroupId: primary.seamGroupId,
        centerLL: [sumX, sumY],
        areaM2: Math.round(totalAreaM2),
        height: primary.height,
        rawHeight: primary.rawHeight,
        minHeight: primary.minHeight,
        isHeightMapped: primary.isHeightMapped,
        mappedLevels: primary.mappedLevels,
        mappedRoofShape: primary.mappedRoofShape,
        mappedColour,
        mappedName,
        mappedUse,
        mappedHouseNumber,
        officialBarangay,
        nearestPlace,
        insideCity: parts.some(p => p.insideCity),
        landmarkId,
        tileKey: primary.tileKey
      };
    }

    function matchPointSync(lng, lat) {
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return { status: 'unmapped', building: null, nearbyCount: 0, nearestDistM: null };
      }
      const [tx, ty] = lngLatToTile(lng, lat, 14);
      const entCenter = tileDataCache.get(`14/${tx}/${ty}`);
      if (!entCenter || entCenter.state !== 'ready') {
        return { status: 'tile_pending', building: null, nearbyCount: 0, nearestDistM: null, tileKey: `14/${tx}/${ty}` };
      }

      const candidates = [...entCenter.buildings];
      for (const nk of [`14/${tx - 1}/${ty}`, `14/${tx + 1}/${ty}`, `14/${tx}/${ty - 1}`, `14/${tx}/${ty + 1}`]) {
        const ne = tileDataCache.get(nk);
        if (ne && ne.state === 'ready') candidates.push(...ne.buildings);
      }

      const insideMatches = [];
      let nearestDistM = Infinity;
      let nearbyCount12 = 0;

      for (const b of candidates) {
        if (lng >= b.bboxLL[0] && lng <= b.bboxLL[2] && lat >= b.bboxLL[1] && lat <= b.bboxLL[3]) {
          if (pointInPoly(lng, lat, b.ringLL)) {
            insideMatches.push(b);
            continue;
          }
        }
        if (lng >= b.bboxLL[0] - 0.0002 && lng <= b.bboxLL[2] + 0.0002 && lat >= b.bboxLL[1] - 0.0002 && lat <= b.bboxLL[3] + 0.0002) {
          const d = distPtToRingM(lng, lat, b.ringLL);
          if (d < nearestDistM) nearestDistM = d;
          if (d <= 12) nearbyCount12++;
        }
      }

      if (insideMatches.length > 0) {
        insideMatches.sort((a, b2) => a.areaM2 - b2.areaM2);
        const hit = insideMatches[0];
        return { status: 'inside_footprint', building: getBuildingMeta(hit), rawBuilding: hit, nearbyCount: nearbyCount12, nearestDistM: 0 };
      }

      return {
        status: 'uncertain',
        building: null,
        nearbyCount: nearbyCount12,
        nearestDistM: Number.isFinite(nearestDistM) ? Number(nearestDistM.toFixed(1)) : null
      };
    }

    async function matchPointAsync(lng, lat) {
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return { status: 'unmapped', building: null, nearbyCount: 0, nearestDistM: null };
      }
      const [tx, ty] = lngLatToTile(lng, lat, 14);
      await ensureTileDecoded(`14/${tx}/${ty}`);
      return matchPointSync(lng, lat);
    }

    function pickBuildingAtPoint(pointPx, lngLat) {
      if (!mapRef || mapRef.getZoom() < 13.5) return null;
      const canvas = mapRef.getCanvas();
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      const ndcX = (pointPx.x / w) * 2 - 1;
      const ndcY = 1 - (pointPx.y / h) * 2;
      const pitch = mapRef.getPitch();

      if (pitch >= 2 && lastRawMatrix && mapRef.getZoom() >= minZoom - 0.15) {
        const keys = getVisibleZ14Keys();
        let bestB = null;
        let bestDepth = Infinity;

        for (const tk of keys) {
          const ent = tileDataCache.get(tk);
          if (!ent || ent.state !== 'ready') continue;
          const m = mulMat4f64(lastRawMatrix, ent.model);

          for (const b of ent.buildings) {
            const [x0, y0, x1, y1] = b.bboxENU;
            const z0 = b.minHeight;
            const zTop = b.height;

            let sMinX = 1e9, sMaxX = -1e9, sMinY = 1e9, sMaxY = -1e9, anyValid = false;
            for (const cx of [x0, x1]) for (const cy of [y0, y1]) for (const cz of [z0, zTop]) {
              const p = projectENU(m, cx, cy, cz);
              if (!p) continue;
              anyValid = true;
              if (p[0] < sMinX) sMinX = p[0]; if (p[0] > sMaxX) sMaxX = p[0];
              if (p[1] < sMinY) sMinY = p[1]; if (p[1] > sMaxY) sMaxY = p[1];
            }
            if (!anyValid || ndcX < sMinX || ndcX > sMaxX || ndcY < sMinY || ndcY > sMaxY) continue;

            const pts = b.ringENU;
            const n = pts.length;
            const wallTopZ = b.height;
            const botP = new Array(n);
            const topP = new Array(n);
            for (let i = 0; i < n; i++) {
              botP[i] = projectENU(m, pts[i][0], pts[i][1], z0);
              topP[i] = projectENU(m, pts[i][0], pts[i][1], wallTopZ);
            }

            for (let i = 0; i < n; i++) {
              const j = (i + 1) % n;
              const d1 = hitProjectedTri(ndcX, ndcY, botP[i], botP[j], topP[j]);
              if (d1 !== null && d1 < bestDepth) { bestDepth = d1; bestB = b; }
              const d2 = hitProjectedTri(ndcX, ndcY, botP[i], topP[j], topP[i]);
              if (d2 !== null && d2 < bestDepth) { bestDepth = d2; bestB = b; }
            }

            if (b.roofTris) {
              for (const [i0, i1, i2] of b.roofTris) {
                const dr = hitProjectedTri(ndcX, ndcY, topP[i0], topP[i1], topP[i2]);
                if (dr !== null && dr < bestDepth) { bestDepth = dr; bestB = b; }
              }
            }
          }
        }
        if (bestB) return getBuildingMeta(bestB);
      }

      if (lngLat) {
        const res = matchPointSync(lngLat.lng, lngLat.lat);
        if (res.status === 'inside_footprint' && res.building) return res.building;
      }
      return null;
    }

    async function pickBuildingAtPointAsync(pointPx, lngLat) {
      if (lngLat) {
        const [tx, ty] = lngLatToTile(lngLat.lng, lngLat.lat, 14);
        await ensureTileDecoded(`14/${tx}/${ty}`);
      }
      return pickBuildingAtPoint(pointPx, lngLat);
    }

    function startBackgroundIndexing(onComplete) {
      const z14Keys = Object.keys(tileSource).filter(k => k.startsWith('14/'));
      let idx = 0;
      const schedule = fn => {
        if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 140 });
        else setTimeout(fn, 26);
      };
      function step() {
        const batch = [];
        while (idx < z14Keys.length && batch.length < 4) {
          const tk = z14Keys[idx++];
          if (!tileDataCache.has(tk)) batch.push(ensureTileDecoded(tk));
        }
        if (!batch.length) {
          if (idx < z14Keys.length) schedule(step);
          else if (onComplete) onComplete();
          return;
        }
        Promise.all(batch).then(() => {
          if (idx < z14Keys.length) schedule(step);
          else if (onComplete) onComplete();
        });
      }
      schedule(step);
    }

    return {
      id: options.id || 'locus-3d-city-buildings',
      type: 'custom',
      renderingMode: '3d',
      minZoom,
      isSupported: () => supported,
      hasReadyTiles: () => [...gpuCache.values()].some(e => e.state === 'ready'),
      getIndexedBuildingCount: () => buildingById.size,
      getColorMode: () => colorMode,
      getLightingMode: () => lightingMode,
      getLightingWarmth: () => lightingWarmth,
      setLightingMode(mode) {
        lightingMode = mode === 'golden' ? 'golden' : 'day';
        lightingWarmth = lightingMode === 'golden' ? 1.0 : 0.0;
        if (mapRef) mapRef.triggerRepaint();
      },
      setLightingWarmth(w) {
        lightingWarmth = Math.max(0, Math.min(1, Number(w) || 0));
        lightingMode = lightingWarmth >= 0.5 ? 'golden' : 'day';
        if (mapRef) mapRef.triggerRepaint();
      },
      setNightFactor(n) {
        nightFactor = Math.max(0, Math.min(1, Number(n) || 0));
        if (mapRef) mapRef.triggerRepaint();
      },
      setColorMode(mode) {
        const next = mode === 'coverage' ? 'coverage' : 'architectural';
        if (next === colorMode) return;
        colorMode = next;
        rebuildAllReadyTileGPU();
      },
      setCoverageClassifier(fn) {
        coverageClassifier = fn;
        if (colorMode === 'coverage') rebuildAllReadyTileGPU();
      },
      refreshBuildingStyles() {
        if (colorMode === 'coverage') rebuildAllReadyTileGPU();
      },
      refreshCoverageColors() {
        if (colorMode === 'coverage') rebuildAllReadyTileGPU();
      },
      findOfficialBarangayAt: (lng, lat) => findOfficialBarangay(lng, lat, barangayIndex),
      getBarangayList: () => barangayIndex.map(b => ({ name: b.name, psgc: b.psgc, bbox: b.bbox, feature: b.feature })),
      setOnTileIndexed(fn) { onTileIndexedCallback = fn; },
      ensureTileDecoded,
      startBackgroundIndexing,
      matchPointSync,
      matchPointAsync,
      pickBuildingAtPoint,
      meshHitDepth,
      pickBuildingAtPointAsync,
      getBuildingById: id => getBuildingMeta(id),
      getBuildingGeoJSON,
      getGroupPartIds(id) {
        const b = buildingById.get(id);
        return b ? getGroupParts(b).map(p => p.id) : [];
      },
      setSelectedBuilding(buildingOrId, opts = {}) {
        selectedBuildingIds.clear();
        selectionStyle = opts && opts.soft ? 'soft' : 'full';
        if (buildingOrId) {
          const id = typeof buildingOrId === 'string' ? buildingOrId : buildingOrId.id;
          const b = buildingById.get(id);
          if (b) for (const p of getGroupParts(b)) selectedBuildingIds.add(p.id);
        }
        rebuildSelectionHighlightGPU();
      },
      setHoveredBuilding(buildingOrId) {
        const nextSet = new Set();
        if (buildingOrId) {
          const id = typeof buildingOrId === 'string' ? buildingOrId : buildingOrId.id;
          const b = buildingById.get(id);
          if (b) {
            for (const p of getGroupParts(b)) {
              if (!selectedBuildingIds.has(p.id)) nextSet.add(p.id);
            }
          }
        }
        if (nextSet.size === hoveredBuildingIds.size && [...nextSet].every(id => hoveredBuildingIds.has(id))) return;
        hoveredBuildingIds = nextSet;
        hoverAnimStart = nextSet.size ? performance.now() : 0;
        rebuildHoverHighlightGPU();
      },

      onAdd(map, gl) {
        mapRef = map;
        glRef = gl;
        if (!supported) return;

        const mkProg = (vsSrc, fsSrc) => {
          const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
          const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
          if (!vs || !fs) return null;
          const p = gl.createProgram();
          gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
          return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
        };
        prog = mkProg(VS, FS);
        flatProg = mkProg(FLAT_VS, FLAT_FS);
        hlProg = mkProg(HL_VS, HL_FS);
        if (prog) {
          progLoc = {
            pos: gl.getAttribLocation(prog, 'a_pos'),
            norm: gl.getAttribLocation(prog, 'a_normal'),
            col: gl.getAttribLocation(prog, 'a_color'),
            meta: gl.getAttribLocation(prog, 'a_meta'),
            mvp: gl.getUniformLocation(prog, 'u_mvp'),
            sun: gl.getUniformLocation(prog, 'u_sun'),
            warmth: gl.getUniformLocation(prog, 'u_warmth'),
            detail: gl.getUniformLocation(prog, 'u_detail'),
            night: gl.getUniformLocation(prog, 'u_night')
          };
        }
        if (flatProg) {
          flatLoc = {
            pos: gl.getAttribLocation(flatProg, 'a_pos'),
            mvp: gl.getUniformLocation(flatProg, 'u_mvp'),
            col: gl.getUniformLocation(flatProg, 'u_color')
          };
        }
        if (hlProg) {
          hlLoc = {
            pos: gl.getAttribLocation(hlProg, 'a_pos'),
            col: gl.getAttribLocation(hlProg, 'a_color'),
            mvp: gl.getUniformLocation(hlProg, 'u_mvp'),
            alpha: gl.getUniformLocation(hlProg, 'u_alpha')
          };
        }

        for (const k of getVisibleZ14Keys()) ensureTileGPU(k);
      },

      render(gl, rawMatrix) {
        if (!supported || !prog || !progLoc || !mapRef) return;
        const zoom = mapRef.getZoom();
        const matrix = (rawMatrix && rawMatrix.defaultProjectionData)
          ? rawMatrix.defaultProjectionData.mainMatrix
          : rawMatrix;
        if (!matrix) return;
        lastRawMatrix = new Float64Array(matrix);
        if (zoom < minZoom) return;

        frameTick++;
        const keys = getVisibleZ14Keys();
        for (const k of keys) ensureTileGPU(k);
        // Pace tile meshing/GPU uploads across frames so zoom-outs stay silky smooth (~60 FPS)
        drainGpuUploadQueue(frameTick <= 14 ? 3 : 1);

        const readyTiles = [];
        for (const k of keys) {
          const g = gpuCache.get(k);
          const ent = tileDataCache.get(k);
          if (!g || g.state !== 'ready' || !g.solidCount || !ent) continue;
          g.lastUsed = frameTick;
          const mvp64 = mulMat4f64(lastRawMatrix, ent.model);
          ent.mvp64 = mvp64;
          readyTiles.push({ g, mvp32: new Float32Array(mvp64) });
        }
        if (!readyTiles.length) return;

        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);

        const warmth = lightingWarmth;
        const nf = nightFactor;
        const goldenSun = [-0.844, 0.288, 0.453];
        const activeSun = warmth <= 0.001
          ? SUN
          : (warmth >= 0.999 ? goldenSun : normalize3(blendRGB(SUN, goldenSun, warmth)));

        // PASS 1: Restrained grounded contact shadow
        if (flatProg && flatLoc) {
          gl.useProgram(flatProg);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthFunc(gl.LESS);
          gl.depthMask(true);
          gl.uniform4f(flatLoc.col, 0.19 * (1 - nf * 0.5), 0.22 * (1 - nf * 0.5), 0.26 * (1 - nf * 0.4), (0.22 + 0.03 * warmth) * (1.0 - 0.58 * nf));
          gl.enableVertexAttribArray(flatLoc.pos);
          for (const { g, mvp32 } of readyTiles) {
            if (!g.shBuf || !g.shCount) continue;
            gl.uniformMatrix4fv(flatLoc.mvp, false, mvp32);
            gl.bindBuffer(gl.ARRAY_BUFFER, g.shBuf);
            gl.vertexAttribPointer(flatLoc.pos, 3, gl.FLOAT, false, 12, 0);
            gl.drawArrays(gl.TRIANGLES, 0, g.shCount);
          }
          gl.disableVertexAttribArray(flatLoc.pos);
        }

        // PASS 2: Solid sunlit architectural scale-model 3D buildings
        gl.disable(gl.BLEND);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(true);

        const detailFactor = Math.max(0, Math.min(1, (zoom - 15.0) / 1.4));
        gl.useProgram(prog);
        gl.uniform3f(progLoc.sun, activeSun[0], activeSun[1], activeSun[2]);
        gl.uniform1f(progLoc.warmth, warmth);
        gl.uniform1f(progLoc.detail, detailFactor);
        gl.uniform1f(progLoc.night, nf);
        gl.enableVertexAttribArray(progLoc.pos);
        gl.enableVertexAttribArray(progLoc.norm);
        gl.enableVertexAttribArray(progLoc.col);
        gl.enableVertexAttribArray(progLoc.meta);

        for (const { g, mvp32 } of readyTiles) {
          gl.uniformMatrix4fv(progLoc.mvp, false, mvp32);
          gl.bindBuffer(gl.ARRAY_BUFFER, g.solidBuf);
          gl.vertexAttribPointer(progLoc.pos, 3, gl.FLOAT, false, 40, 0);
          gl.vertexAttribPointer(progLoc.norm, 3, gl.FLOAT, false, 40, 12);
          gl.vertexAttribPointer(progLoc.col, 3, gl.FLOAT, false, 40, 24);
          gl.vertexAttribPointer(progLoc.meta, 1, gl.FLOAT, false, 40, 36);
          gl.drawArrays(gl.TRIANGLES, 0, g.solidCount);
        }

        gl.disableVertexAttribArray(progLoc.pos);
        gl.disableVertexAttribArray(progLoc.norm);
        gl.disableVertexAttribArray(progLoc.col);
        gl.disableVertexAttribArray(progLoc.meta);

        // PASS 3: Fine roof-edge & sharp corner creases (fades in smoothly at close zoom)
        const edgeAlpha = Math.max(0, Math.min(0.30, (zoom - 15.0) * 0.18));
        if (flatProg && flatLoc && edgeAlpha > 0.02) {
          gl.useProgram(flatProg);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthFunc(gl.LEQUAL);
          gl.depthMask(false);
          gl.uniform4f(flatLoc.col, 0.25 + 0.28 * nf, 0.27 + 0.35 * nf, 0.29 + 0.45 * nf, edgeAlpha * (1.0 - 0.35 * nf));
          gl.enableVertexAttribArray(flatLoc.pos);
          for (const { g, mvp32 } of readyTiles) {
            if (!g.edgeBuf || !g.edgeCount) continue;
            gl.uniformMatrix4fv(flatLoc.mvp, false, mvp32);
            gl.bindBuffer(gl.ARRAY_BUFFER, g.edgeBuf);
            gl.vertexAttribPointer(flatLoc.pos, 3, gl.FLOAT, false, 12, 0);
            gl.drawArrays(gl.LINES, 0, g.edgeCount);
          }
          gl.disableVertexAttribArray(flatLoc.pos);
        }

        // PASS 4: Smooth-fading Hovered & Selected building 3D rooftop rims
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(true);
        if (hlProg && hlLoc) {
          const drawRim = (buf, cnt, mod, alpha) => {
            if (!buf || !cnt || !mod) return;
            gl.useProgram(hlProg);
            gl.uniformMatrix4fv(hlLoc.mvp, false, new Float32Array(mulMat4f64(lastRawMatrix, mod)));
            gl.uniform1f(hlLoc.alpha, alpha);
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.enableVertexAttribArray(hlLoc.pos);
            gl.enableVertexAttribArray(hlLoc.col);
            gl.vertexAttribPointer(hlLoc.pos, 3, gl.FLOAT, false, 24, 0);
            gl.vertexAttribPointer(hlLoc.col, 3, gl.FLOAT, false, 24, 12);
            gl.drawArrays(gl.TRIANGLES, 0, cnt);
            gl.disableVertexAttribArray(hlLoc.pos);
            gl.disableVertexAttribArray(hlLoc.col);
          };
          if (hovBuf && hovVertCount && hovModel) {
            const elapsed = hoverAnimStart ? (performance.now() - hoverAnimStart) : 200;
            const t = Math.max(0, Math.min(1, elapsed / 145));
            const ease = 1 - Math.pow(1 - t, 3);
            drawRim(hovBuf, hovVertCount, hovModel, ease * 0.85);
            if (t < 1 && mapRef) mapRef.triggerRepaint();
          }
          drawRim(hlBuf, hlVertCount, hlModel, selectionStyle === 'soft' ? 0.86 : 0.96);
        }

        gl.bindBuffer(glRef.ARRAY_BUFFER, null);
      }
    };
  }

  global.createCityBuildingsLayer = createCityBuildingsLayer;
})(window);
