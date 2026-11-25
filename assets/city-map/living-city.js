/* LOCUS SF — High-Craft WebGL Living City Simulation
 *
 * Features:
 *  - C1-continuous Catmull-Rom spline roads & pedestrian plazas (exact OSM polylines, zero snapping)
 *  - Continuous dt-stepped micro-traffic physics with headway car-following & smooth braking
 *  - Synchronized 3D downtown & highway traffic signal intersections (Green / Amber / Red)
 *  - Authentic Philippine vehicle archetypes (Sedans, SUVs/Pickups, Ilocos Jeepneys, Tricycles, Coaches)
 *  - Ground contact shadows + sloped windshields + ruby brake-light intensification + night headlights
 *  - Articulated multi-limb walking humans (swinging legs, opposing arms, natural gait, seated/idle plaza groups)
 *  - Pre-allocated GPU VBOs & viewport frustum culling (zero GC allocations per frame)
 */
(function (global) {
  function mulMat4f64(a, b) {
    const out = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
      const b0 = b[col * 4], b1 = b[col * 4 + 1], b2 = b[col * 4 + 2], b3 = b[col * 4 + 3];
      out[col * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      out[col * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      out[col * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      out[col * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return out;
  }

  function makeOriginMatrix(lng, lat) {
    const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
    const s = mc.meterInMercatorCoordinateUnits();
    return new Float64Array([
      s, 0, 0, 0,
      0, -s, 0, 0,
      0, 0, s, 0,
      mc.x, mc.y, mc.z, 1
    ]);
  }

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  }

  // Exact real OpenStreetMap road centerlines from map-data.js across San Fernando
  // Strictly REAL OSM yellow-dashed highways ONLY (trunk + primary roads-surface-major, zero minor/service/side-street routes!)
  const ROAD_CORRIDORS = [
    // 0. MacArthur Highway / Quezon Avenue / Carlatan North (contiguous trunk + primary from South Brgy -> ITRMC -> Robinsons -> Downtown -> Manna -> Lorma -> North)
    {
      name: 'MacArthur Hwy / Quezon Ave',
      cars: 92, speed: 16.5, laneOffset: 1.85, twoWay: true, hasBuses: true, hasTrikes: true,
      pts: [
        [120.321155, 16.578205], [120.321021, 16.579192], [120.320517, 16.582668], [120.320324, 16.583938],
        [120.320061, 16.585789], [120.319895, 16.587084], [120.319803, 16.587979], [120.319659, 16.589192],
        [120.319294, 16.592770], [120.319213, 16.593362], [120.319170, 16.593752], [120.319127, 16.594143],
        [120.319090, 16.594374], [120.318988, 16.595336], [120.318924, 16.595798], [120.318854, 16.596328],
        [120.318752, 16.597315], [120.318693, 16.597737], [120.318403, 16.600060], [120.318146, 16.601849],
        [120.318033, 16.602708], [120.317663, 16.605103], [120.317459, 16.606604], [120.317202, 16.608342],
        [120.317025, 16.609663], [120.316649, 16.611915], [120.316553, 16.612598], [120.316510, 16.613056],
        [120.316483, 16.613457], [120.316477, 16.614197], [120.316510, 16.614824], [120.316590, 16.615467],
        [120.316638, 16.615801], [120.316896, 16.616932], [120.317148, 16.617831], [120.317207, 16.618073],
        [120.317255, 16.618361], [120.317255, 16.618546], [120.317207, 16.618777], [120.316467, 16.621147],
        [120.316290, 16.621625], [120.315952, 16.622442], [120.315877, 16.622694], [120.315828, 16.623033],
        [120.315828, 16.623388], [120.315861, 16.623810], [120.315914, 16.624144], [120.315973, 16.624421],
        [120.316359, 16.625727], [120.316413, 16.625830], [120.316488, 16.625932], [120.316590, 16.626030],
        [120.316724, 16.626133], [120.316858, 16.626205], [120.317389, 16.626426], [120.317572, 16.626534],
        [120.317727, 16.626647], [120.317824, 16.626781], [120.317958, 16.627094], [120.317990, 16.628235],
        [120.317963, 16.628718], [120.317937, 16.628980], [120.317861, 16.629335], [120.317786, 16.629921],
        [120.317706, 16.630415], [120.317615, 16.630826], [120.317556, 16.631016], [120.317427, 16.631335],
        [120.317127, 16.631838], [120.316949, 16.632075], [120.316762, 16.632296], [120.316585, 16.632476],
        [120.316456, 16.632579], [120.316300, 16.632686], [120.316220, 16.632728], [120.316048, 16.632810],
        [120.315818, 16.632887], [120.315346, 16.632974], [120.314857, 16.633046], [120.314670, 16.633113],
        [120.314498, 16.633200], [120.314369, 16.633288], [120.314246, 16.633391], [120.314021, 16.633627],
        [120.313795, 16.633889], [120.313613, 16.634151], [120.312738, 16.635585], [120.312615, 16.635822],
        [120.312315, 16.636521], [120.311907, 16.637610], [120.311333, 16.639091], [120.311022, 16.639918],
        [120.310872, 16.640263], [120.310711, 16.640710], [120.310180, 16.642108], [120.310029, 16.642601],
        [120.309976, 16.642858], [120.309944, 16.643125], [120.309911, 16.643573], [120.309911, 16.644210],
        [120.309922, 16.644344], [120.309976, 16.644580], [120.310035, 16.644734], [120.310094, 16.644863],
        [120.310153, 16.644960], [120.310298, 16.645156], [120.310603, 16.645485], [120.311773, 16.646708],
        [120.312610, 16.647499], [120.313334, 16.648121], [120.313677, 16.648378], [120.314031, 16.648620],
        [120.315260, 16.649421], [120.315539, 16.649637], [120.316000, 16.650033], [120.316697, 16.650665],
        [120.316815, 16.650758], [120.317298, 16.651200], [120.317529, 16.651431], [120.317684, 16.651616],
        [120.317851, 16.651868], [120.318414, 16.652844], [120.318548, 16.653112], [120.318688, 16.653441],
        [120.318827, 16.653826], [120.319026, 16.654443], [120.319283, 16.655188], [120.319401, 16.655440],
        [120.319492, 16.655543], [120.319819, 16.655810], [120.319932, 16.655871], [120.320485, 16.656087],
        [120.320662, 16.656175], [120.320973, 16.656375], [120.321246, 16.656576], [120.321568, 16.656997],
        [120.321772, 16.657316], [120.321922, 16.657573]
      ]
    },
    // 1. San Fernando Diversion Road (exact contiguous OSM trunk geometry: Sevilla Jct -> Pagoda East -> SM City East -> CSI East -> North)
    {
      name: 'San Fernando Diversion Rd',
      cars: 48, speed: 18.8, laneOffset: 1.95, twoWay: true, hasBuses: true, hasTrikes: false,
      pts: [
        [120.318945, 16.595639], [120.319294, 16.595701], [120.319680, 16.595727], [120.320656, 16.595757],
        [120.320758, 16.595793], [120.320823, 16.595881], [120.320833, 16.595937], [120.320833, 16.596009],
        [120.320570, 16.597850], [120.319916, 16.602240], [120.319760, 16.603458], [120.319626, 16.604399],
        [120.319278, 16.606990], [120.319058, 16.608522], [120.319036, 16.608938], [120.319042, 16.609139],
        [120.319085, 16.609519], [120.319117, 16.609930], [120.319160, 16.610275], [120.319299, 16.610794],
        [120.319642, 16.611745], [120.320860, 16.615467], [120.321193, 16.616485], [120.321515, 16.617415],
        [120.321885, 16.618530], [120.322255, 16.619738], [120.322448, 16.620309], [120.322684, 16.621142],
        [120.323360, 16.623198], [120.323719, 16.624416], [120.324293, 16.626087], [120.324476, 16.626513],
        [120.324605, 16.626739], [120.324653, 16.626842], [120.324792, 16.627295], [120.324926, 16.627773],
        [120.325168, 16.628461], [120.325248, 16.628739], [120.325543, 16.629536], [120.325629, 16.629736],
        [120.325769, 16.629983], [120.326546, 16.630970], [120.327367, 16.631910], [120.328091, 16.632722],
        [120.328483, 16.633134], [120.329298, 16.634090], [120.330822, 16.635827], [120.331401, 16.636521]
      ]
    },
    // 2. Ortega Highway East / Naguilian Primary (strictly the yellow-dashed primary highway East of Diversion Rd)
    {
      name: 'Ortega Hwy East / Naguilian Rd',
      cars: 18, speed: 15.0, laneOffset: 1.75, twoWay: true, hasBuses: false, hasTrikes: true,
      pts: [
        [120.321010, 16.615919], [120.322314, 16.616001], [120.323280, 16.616032], [120.324411, 16.616001],
        [120.324567, 16.616001], [120.326788, 16.615924], [120.327984, 16.615909], [120.328703, 16.615919],
        [120.330527, 16.616058], [120.331133, 16.616017], [120.331530, 16.615965], [120.332018, 16.615883],
        [120.333375, 16.615631], [120.334078, 16.615513], [120.335001, 16.615400], [120.335580, 16.615343],
        [120.336299, 16.615246], [120.338337, 16.614809]
      ]
    }
  ];

  // Real Signalized Highway Intersections ONLY (Green / Amber / Red 3D signal masts + vehicle stop lines)
  const TRAFFIC_INTERSECTIONS = [
    {
      id: 'jct-cityhall',
      lng: 120.316810, lat: 16.616557,
      cycleSec: 11.0, offsetSec: 0,
      corridors: [
        { corIdx: 0, group: 0 }  // Quezon Ave downtown plaza crosswalk / cross street
      ]
    },
    {
      id: 'jct-ortega-diversion',
      lng: 120.321010, lat: 16.615919,
      cycleSec: 12.0, offsetSec: 3.5,
      corridors: [
        { corIdx: 1, group: 0 }, // Diversion Rd
        { corIdx: 2, group: 1 }  // Ortega East Primary Hwy
      ]
    },
    {
      id: 'jct-sevilla',
      lng: 120.318935, lat: 16.595720,
      cycleSec: 12.0, offsetSec: 2.0,
      corridors: [
        { corIdx: 0, group: 0 }, // MacArthur Hwy
        { corIdx: 1, group: 1 }  // Diversion Rd South
      ]
    }
  ];

  // Pedestrian walkways, promenades & plazas (closed loops or smooth ping-pong turnarounds -> ZERO teleport!)
  const PEDESTRIAN_PATHS = [
    // City Plaza 1955 Auditorium & Cathedral promenade loop
    { count: 16, z: 0.16, closed: true, speed: 2.05, spread: 2.2, pts: [[120.31682, 16.61598], [120.31712, 16.61592], [120.31734, 16.61578], [120.31718, 16.61550], [120.31688, 16.61560]] },
    // City Hall Rizal Monument forecourt promenade
    { count: 12, z: 0.16, closed: false, speed: 1.95, spread: 1.8, pts: [[120.31702, 16.61666], [120.31732, 16.61657], [120.31760, 16.61649]] },
    // Provincial Capitol grand West portico plaza & reflection fountain stroll
    { count: 14, z: 0.24, closed: false, speed: 1.90, spread: 2.4, pts: [[120.31796, 16.61292], [120.31814, 16.61302], [120.31820, 16.61326]] },
    // Quezon Avenue Pedestrian Overpass (exact deck top z = 5.56 m from landmarks.js!)
    { count: 7, z: 5.56, closed: false, speed: 1.95, spread: 0.55, pts: [[120.31649, 16.61543], [120.31669, 16.615405]] },
    // Quezon Ave & McDo / Jollibee / Plaza Hotel busy downtown sidewalk (West & East)
    { count: 18, z: 0.12, closed: false, speed: 2.15, spread: 1.4, pts: [[120.31636, 16.61515], [120.31645, 16.61580], [120.31658, 16.61642], [120.31602, 16.61664], [120.31542, 16.61682]] },
    { count: 12, z: 0.12, closed: false, speed: 2.05, spread: 1.2, pts: [[120.31666, 16.61522], [120.31676, 16.61585], [120.31688, 16.61635], [120.31730, 16.61626]] },
    // SM City La Union turquoise shell canopy & fountain plaza promenade
    { count: 24, z: 0.28, closed: false, speed: 2.00, spread: 2.6, pts: [[120.32148, 16.62486], [120.32198, 16.62483], [120.32252, 16.62481], [120.32296, 16.62489], [120.32346, 16.62516]] },
    // Robinsons Place La Union al-fresco veranda & MacArthur entrance plaza
    { count: 14, z: 0.24, closed: false, speed: 1.95, spread: 2.2, pts: [[120.31845, 16.60032], [120.31868, 16.59995], [120.31896, 16.59970], [120.31932, 16.59966]] },
    // Public Market & Old Market shopper walkways
    { count: 14, z: 0.12, closed: true, speed: 2.00, spread: 1.6, pts: [[120.31555, 16.61742], [120.31625, 16.61722], [120.31658, 16.61768], [120.31588, 16.61802]] },
    { count: 10, z: 0.12, closed: false, speed: 1.95, spread: 1.4, pts: [[120.31410, 16.61712], [120.31470, 16.61702], [120.31510, 16.61735]] },
    // SLC Carlatan, DMMMSU-MLUC & Bethany-UCC campus walkways
    { count: 10, z: 0.12, closed: true, speed: 1.90, spread: 1.6, pts: [[120.31292, 16.63675], [120.31338, 16.63668], [120.31328, 16.63642], [120.31295, 16.63650]] },
    { count: 10, z: 0.12, closed: true, speed: 1.90, spread: 1.4, pts: [[120.31468, 16.61385], [120.31438, 16.61388], [120.31445, 16.61405]] },
    { count: 8, z: 0.12, closed: false, speed: 1.85, spread: 1.4, pts: [[120.31715, 16.61482], [120.31742, 16.61472], [120.31750, 16.61435]] }
  ];

  // Realistic Philippine coastal-city vehicle & pedestrian palettes
  const CAR_COLORS = [
    [0.95, 0.96, 0.98], // Pearl white
    [0.78, 0.81, 0.85], // Metallic silver
    [0.32, 0.36, 0.42], // Graphite grey
    [0.68, 0.19, 0.21], // Crimson pearl
    [0.16, 0.29, 0.48], // Deep coastal blue
    [0.86, 0.81, 0.70], // Champagne sand
    [0.18, 0.44, 0.45], // Teal metallic
    [0.88, 0.68, 0.18]  // Golden taxi / jeep
  ];
  const JEEP_COLORS = [
    [0.80, 0.18, 0.20], [0.16, 0.42, 0.76], [0.15, 0.56, 0.38], [0.90, 0.68, 0.18]
  ];
  const TRIKE_COLORS = [
    [0.12, 0.54, 0.38], [0.18, 0.44, 0.78], [0.92, 0.72, 0.18], [0.78, 0.22, 0.22]
  ];
  const BUS_COLORS = [
    [0.94, 0.95, 0.97], [0.92, 0.86, 0.76]
  ];
  const BUS_STRIPES = [
    [0.78, 0.16, 0.20], [0.14, 0.34, 0.70], [0.16, 0.52, 0.36]
  ];
  const SHIRT_COLORS = [
    [0.93, 0.94, 0.96], [0.22, 0.40, 0.64], [0.80, 0.30, 0.28],
    [0.18, 0.56, 0.44], [0.90, 0.70, 0.24], [0.42, 0.44, 0.52],
    [0.68, 0.34, 0.56], [0.28, 0.56, 0.76]
  ];
  const PANTS_COLORS = [
    [0.18, 0.22, 0.29], [0.24, 0.29, 0.38], [0.32, 0.28, 0.24], [0.20, 0.20, 0.23]
  ];
  const SKIN_COLORS = [
    [0.92, 0.78, 0.66], [0.85, 0.68, 0.54], [0.94, 0.82, 0.71]
  ];
  const HAIR_COLORS = [
    [0.12, 0.11, 0.12], [0.22, 0.16, 0.12], [0.16, 0.14, 0.14]
  ];

  function createLivingCityLayer(options = {}) {
    const originLng = 120.3170;
    const originLat = 16.6165;
    const originMc = maplibregl.MercatorCoordinate.fromLngLat([originLng, originLat], 0);
    const originScale = originMc.meterInMercatorCoordinateUnits();
    const mPerDegLng = 111319.49 * Math.cos(originLat * Math.PI / 180);
    const mPerDegLat = 111319.49;
    const toENU = (lng, lat) => {
      const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
      return [(mc.x - originMc.x) / originScale, (originMc.y - mc.y) / originScale];
    };

    const originModel = makeOriginMatrix(originLng, originLat);
    let solidProg = null;
    let glowProg = null;
    let solidLoc = null;
    let glowLoc = null;
    let solidBuf = null;
    let glowBuf = null;
    let shadowBuf = null;
    let lampBuf = null;
    let lampVertCount = 0;
    let mapRef = null;
    let nightFactor = 0.0;
    let visible = true;
    let paused = Boolean(options.paused);

    // Smooth Catmull-Rom C1 spline builder with true arc-length table for silk-smooth curves!
    function buildSplinePath(llPts, closed = false) {
      const raw = llPts.map(([lng, lat]) => toENU(lng, lat));
      const pts = [];
      for (const p of raw) {
        const last = pts[pts.length - 1];
        if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.6) pts.push(p);
      }
      if (pts.length < 2) return null;

      const n = pts.length;
      const dense = [];
      const getPt = idx => closed
        ? pts[((idx % n) + n) % n]
        : pts[Math.max(0, Math.min(n - 1, idx))];

      const segCount = closed ? n : (n - 1);
      for (let i = 0; i < segCount; i++) {
        const p0 = getPt(i - 1);
        const p1 = getPt(i);
        const p2 = getPt(i + 1);
        const p3 = getPt(i + 2);
        const chord = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        const steps = Math.max(4, Math.min(28, Math.ceil(chord / 2.6)));
        for (let k = 0; k < steps; k++) {
          const t = k / steps;
          const t2 = t * t, t3 = t2 * t;
          const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
          const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
          dense.push([x, y]);
        }
      }
      if (!closed) dense.push(pts[n - 1]);

      const m = dense.length;
      const samples = new Array(m);
      let acc = 0;
      for (let i = 0; i < m; i++) {
        const cur = dense[i];
        const prev = dense[closed ? (i - 1 + m) % m : Math.max(0, i - 1)];
        const next = dense[closed ? (i + 1) % m : Math.min(m - 1, i + 1)];
        if (i > 0) acc += Math.hypot(cur[0] - dense[i - 1][0], cur[1] - dense[i - 1][1]);
        const tx = next[0] - prev[0], ty = next[1] - prev[1];
        const tl = Math.hypot(tx, ty) || 1;
        samples[i] = { x: cur[0], y: cur[1], ux: tx / tl, uy: ty / tl, s: acc };
      }
      const total = closed
        ? acc + Math.hypot(dense[0][0] - dense[m - 1][0], dense[0][1] - dense[m - 1][1])
        : acc;

      return { samples, total, closed };
    }

    function sampleSpline(path, dist, reverse, laneOffset) {
      const tot = path.total;
      let d = dist;
      if (path.closed) {
        d = ((d % tot) + tot) % tot;
      } else {
        d = Math.max(0, Math.min(tot, d));
      }
      if (reverse) d = tot - d;

      const arr = path.samples;
      let lo = 0, hi = arr.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (arr[mid].s <= d) lo = mid;
        else hi = mid;
      }
      const a = arr[lo];
      const b = (path.closed && d > arr[arr.length - 1].s) ? arr[0] : arr[Math.min(arr.length - 1, lo + 1)];
      const segLen = (b === arr[0] && path.closed)
        ? Math.max(0.01, tot - a.s)
        : Math.max(0.01, b.s - a.s);
      const t = Math.max(0, Math.min(1, (d - a.s) / segLen));

      let ux = a.ux + (b.ux - a.ux) * t;
      let uy = a.uy + (b.uy - a.uy) * t;
      const ul = Math.hypot(ux, uy) || 1;
      ux /= ul; uy /= ul;
      if (reverse) { ux = -ux; uy = -uy; }

      const rx = uy, ry = -ux;
      return {
        x: a.x + (b.x - a.x) * t + rx * laneOffset,
        y: a.y + (b.y - a.y) * t + ry * laneOffset,
        ux, uy
      };
    }

    // Two-axle wheelbase pose sampler: longer vehicles sweep seamlessly around street bends!
    function sampleVehiclePose(path, dist, reverse, laneOffset, halfWB) {
      const f = sampleSpline(path, dist + halfWB, reverse, laneOffset);
      const r = sampleSpline(path, dist - halfWB, reverse, laneOffset);
      const dx = f.x - r.x;
      const dy = f.y - r.y;
      const dl = Math.hypot(dx, dy);
      if (dl < 0.25) return sampleSpline(path, dist, reverse, laneOffset);
      return {
        x: (f.x + r.x) * 0.5,
        y: (f.y + r.y) * 0.5,
        ux: dx / dl,
        uy: dy / dl
      };
    }

    function closestArcDist(path, tx, ty) {
      let bestIdx = 0, bestD2 = Infinity;
      for (let i = 0; i < path.samples.length; i++) {
        const p = path.samples[i];
        const dx = p.x - tx, dy = p.y - ty;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; bestIdx = i; }
      }
      return bestD2 < 400 ? path.samples[bestIdx].s : null;
    }

    let seed = 2026;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

    // Build Spline Paths, Lanes & Stop Lines at Traffic Intersections
    const roadPaths = ROAD_CORRIDORS.map(cor => buildSplinePath(cor.pts, Boolean(cor.closed)));
    const stopLinesByLane = new Map(); // key `${corIdx}_${dir}` -> [{ inter, s }]
    const signalMasts = [];

    for (const inter of TRAFFIC_INTERSECTIONS) {
      const [ix, iy] = toENU(inter.lng, inter.lat);
      const dirs = [null, null];
      for (const link of inter.corridors) {
        const path = roadPaths[link.corIdx];
        if (!path) continue;
        const rawS = closestArcDist(path, ix, iy);
        if (rawS === null) continue;
        const pt = sampleSpline(path, rawS, false, 0);
        if (link.group === 0 || link.group === 1) {
          dirs[link.group] = { ux: pt.ux, uy: pt.uy };
        }
        const cor = ROAD_CORRIDORS[link.corIdx];
        const dirList = cor.twoWay ? [0, 1] : [0];
        for (const dir of dirList) {
          const forwardS = dir === 1 ? (path.total - rawS) : rawS;
          const stopS = path.closed
            ? ((forwardS - 7.5 + path.total) % path.total)
            : Math.max(8, forwardS - 7.5);
          const key = `${link.corIdx}_${dir}`;
          if (!stopLinesByLane.has(key)) stopLinesByLane.set(key, []);
          stopLinesByLane.get(key).push({ inter, group: link.group, stopS });
        }
      }
      if (!dirs[0] && dirs[1]) dirs[0] = { ux: -dirs[1].uy, uy: dirs[1].ux };
      if (!dirs[1] && dirs[0]) dirs[1] = { ux: dirs[0].uy, uy: -dirs[0].ux };
      signalMasts.push({
        inter, x: ix, y: iy,
        u0: dirs[0] || { ux: 0.16, uy: 0.99 },
        u1: dirs[1] || { ux: 0.99, uy: -0.16 }
      });
    }

    function getSignalPhase(inter, simTime) {
      const mod = ((simTime + inter.offsetSec) % inter.cycleSec + inter.cycleSec) % inter.cycleSec;
      const half = inter.cycleSec * 0.5;
      const amber = 1.4;
      const activeGroup = mod < half ? 0 : 1;
      const inHalf = mod < half ? mod : (mod - half);
      const isAmber = inHalf >= (half - amber);
      return { activeGroup, isAmber };
    }

    // Build Directional Lanes & Diverse Philippine Vehicle Fleet + Streetlamps
    const lanes = [];
    const vehicles = [];
    const lampSpots = [];

    ROAD_CORRIDORS.forEach((cor, corIdx) => {
      const path = roadPaths[corIdx];
      if (!path || path.total < 14) return;
      for (let d = 14; d < path.total; d += 46) {
        const s = sampleSpline(path, d, false, 0);
        lampSpots.push([s.x, s.y]);
      }
      const dirs = cor.twoWay ? [0, 1] : [0];
      const carsPerDir = Math.max(2, Math.round(cor.cars / dirs.length));
      for (const dir of dirs) {
        const laneKey = `${corIdx}_${dir}`;
        const laneIdx = lanes.length;
        const stops = stopLinesByLane.get(laneKey) || [];
        lanes.push({ corIdx, path, reverse: dir === 1, laneOffset: cor.laneOffset, stops, members: [] });
        for (let i = 0; i < carsPerDir; i++) {
          let vType = 'sedan';
          const roll = rand();
          if (cor.hasBuses && roll > 0.91) vType = 'bus';
          else if (cor.hasTrikes && roll > 0.72) vType = 'trike';
          else if (roll > 0.56) vType = 'jeepney';
          else if (roll > 0.36) vType = 'suv';

          let bodyCol = CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)];
          let accentCol = bodyCol;
          let len = 4.4, wid = 1.95, h = 1.55, topSpeed = cor.speed * (0.90 + rand() * 0.22);
          if (vType === 'suv') {
            len = 4.85; wid = 2.08; h = 1.88; topSpeed *= 0.98;
          } else if (vType === 'jeepney') {
            len = 5.75; wid = 2.05; h = 2.18; topSpeed *= 0.88;
            bodyCol = JEEP_COLORS[Math.floor(rand() * JEEP_COLORS.length)];
            accentCol = [0.92, 0.94, 0.96];
          } else if (vType === 'trike') {
            len = 2.75; wid = 1.52; h = 1.58; topSpeed *= 0.78;
            bodyCol = TRIKE_COLORS[Math.floor(rand() * TRIKE_COLORS.length)];
          } else if (vType === 'bus') {
            len = 9.4; wid = 2.38; h = 3.05; topSpeed *= 0.86;
            bodyCol = BUS_COLORS[Math.floor(rand() * BUS_COLORS.length)];
            accentCol = BUS_STRIPES[Math.floor(rand() * BUS_STRIPES.length)];
          }

          const sPos = ((i + 0.15 + rand() * 0.65) / carsPerDir) * path.total;
          const v = {
            laneIdx,
            s: sPos,
            v: topSpeed * 0.7,
            topSpeed,
            len, wid, h,
            type: vType,
            color: bodyCol,
            accentCol,
            brake: 0.0
          };
          vehicles.push(v);
          lanes[laneIdx].members.push(v);
        }
      }
    });

    // Walking People (closed circuit or smooth ping-pong turnarounds) + Social Idle Pairs
    const walkers = [];
    for (const pp of PEDESTRIAN_PATHS) {
      const path = buildSplinePath(pp.pts, Boolean(pp.closed));
      if (!path || path.total < 4) continue;
      for (let i = 0; i < pp.count; i++) {
        const pairLeader = (i % 4 === 1);
        walkers.push({
          path,
          z: pp.z,
          closed: Boolean(pp.closed),
          dir: (i % 2 === 0) ? 1 : -1,
          offset: (rand() - 0.5) * (pp.spread || 1.8),
          s: (0.06 + rand() * 0.88) * path.total,
          speed: (pp.speed || 1.18) * (0.86 + rand() * 0.28),
          stridePhase: rand() * Math.PI * 2,
          shirt: SHIRT_COLORS[Math.floor(rand() * SHIRT_COLORS.length)],
          pants: PANTS_COLORS[Math.floor(rand() * PANTS_COLORS.length)],
          skin: SKIN_COLORS[Math.floor(rand() * SKIN_COLORS.length)],
          hair: HAIR_COLORS[Math.floor(rand() * HAIR_COLORS.length)],
          hasHat: rand() > 0.84,
          hasBag: rand() > 0.62,
          isCompanion: pairLeader
        });
      }
    }

    // Scenic Stationary Plaza / Cafe / Capitol Clusters (subtly breathing/conversing)
    const idleSpots = [
      [120.32205, 16.62482, 0.28], [120.32232, 16.62480, 0.28], [120.32264, 16.62482, 0.28],
      [120.31702, 16.61578, 0.16], [120.31718, 16.61588, 0.16], [120.31695, 16.61564, 0.16],
      [120.31732, 16.61658, 0.15], [120.31814, 16.61302, 0.24], [120.31896, 16.59972, 0.24]
    ];
    const idlePeople = [];
    for (const [lng, lat, z] of idleSpots) {
      const [bx, by] = toENU(lng, lat);
      for (let k = 0; k < 2; k++) {
        const ang = rand() * Math.PI * 2;
        idlePeople.push({
          x: bx + (k - 0.5) * 0.9, y: by + (k % 2 ? 0.35 : -0.35), z,
          ux: Math.cos(ang + k * Math.PI), uy: Math.sin(ang + k * Math.PI),
          phase: rand() * Math.PI * 2,
          shirt: SHIRT_COLORS[Math.floor(rand() * SHIRT_COLORS.length)],
          pants: PANTS_COLORS[Math.floor(rand() * PANTS_COLORS.length)],
          skin: SKIN_COLORS[Math.floor(rand() * SKIN_COLORS.length)],
          hair: HAIR_COLORS[Math.floor(rand() * HAIR_COLORS.length)]
        });
      }
    }

    // Dynamic physics stepper (IDM-inspired headway braking + signal stopping)
    function stepSimulation(dt, simTime) {
      // 1. Traffic lanes: sort vehicles by progression s along each lane & apply smooth car-following + signal stop
      for (let lIdx = 0; lIdx < lanes.length; lIdx++) {
        const lane = lanes[lIdx];
        const list = lane.members;
        const tot = lane.path.total;
        if (list.length > 1) list.sort((a, b) => a.s - b.s);

        for (let i = 0; i < list.length; i++) {
          const cur = list[i];
          const next = list[(i + 1) % list.length];
          let gap = (i + 1 < list.length)
            ? (next.s - cur.s)
            : (lane.path.closed ? (next.s + tot - cur.s) : 999);
          gap -= (cur.len * 0.5 + next.len * 0.5);

          let wantV = cur.topSpeed;
          // Follow car ahead smoothly with comfortable safety headway
          const safeDist = 3.2 + cur.v * 0.72;
          if (gap < safeDist * 1.45) {
            const factor = Math.max(0, (gap - 1.8) / (safeDist * 1.25));
            wantV = Math.min(wantV, cur.topSpeed * factor * factor);
            if (gap < 2.2) wantV = 0;
          }

          // Check upcoming red / amber intersection stop line
          for (let stIdx = 0; stIdx < lane.stops.length; stIdx++) {
            const st = lane.stops[stIdx];
            const ph = getSignalPhase(st.inter, simTime);
            const isRedOrAmber = (ph.activeGroup !== st.group) || ph.isAmber;
            if (!isRedOrAmber) continue;
            let dToStop = st.stopS - cur.s;
            if (lane.path.closed && dToStop < 0) dToStop += tot;
            if (dToStop > 0.2 && dToStop < 26.0) {
              const stopCap = Math.max(0, (dToStop - 1.4) * 0.52);
              wantV = Math.min(wantV, stopCap);
            }
          }

          const dv = wantV - cur.v;
          const maxAcc = dv >= 0 ? 3.8 : 6.2;
          const stepV = Math.sign(dv) * Math.min(Math.abs(dv), maxAcc * dt);
          cur.v = Math.max(0, cur.v + stepV);
          const brakingNow = (dv < -0.4 || cur.v < 0.35) ? 1.0 : 0.0;
          cur.brake += (brakingNow - cur.brake) * Math.min(1, dt * 8.0);

          cur.s += cur.v * dt;
          if (lane.path.closed) {
            if (cur.s >= tot) cur.s -= tot;
          } else if (cur.s > tot) {
            // Re-enter cleanly at start only if entry is clear, keeping natural staggered flow
            const first = list[0];
            if (!first || first === cur || first.s > 11.0) {
              cur.s = 0.0;
              cur.v = cur.topSpeed * 0.65;
            } else {
              cur.s = tot;
              cur.v = 0;
            }
          }
        }
      }

      // 2. Smooth Pedestrian Walkers (ping-pong turns near endpoints -> zero teleportation!)
      for (let i = 0; i < walkers.length; i++) {
        const w = walkers[i];
        const tot = w.path.total;
        let turnSlow = 1.0;
        if (!w.closed) {
          const margin = 1.6;
          if ((w.dir > 0 && w.s > tot - margin) || (w.dir < 0 && w.s < margin)) {
            const rem = w.dir > 0 ? Math.max(0, tot - w.s) : Math.max(0, w.s);
            turnSlow = Math.max(0.28, rem / margin);
          }
        }
        w.s += w.dir * w.speed * turnSlow * dt;
        if (w.closed) {
          if (w.s >= tot) w.s -= tot;
          else if (w.s < 0) w.s += tot;
        } else {
          if (w.s >= tot) { w.s = tot; w.dir = -1; }
          else if (w.s <= 0) { w.s = 0; w.dir = 1; }
        }
        w.stridePhase += (w.speed * turnSlow) * 3.8 * dt;
      }
    }

    // Warm up simulation 4 seconds so cars sit naturally behind signals on initial load
    let simTime = 0;
    for (let k = 0; k < 80; k++) { simTime += 0.05; stepSimulation(0.05, simTime); }

    // Pre-allocated dynamic GPU VBOs (zero allocations during render loop; generous headroom at all zooms!)
    const solidArr = new Float32Array(120000 * 9);
    const glowArr = new Float32Array(24000 * 7);
    const shadowArr = new Float32Array(24000 * 7);

    let sPtr = 0;
    let gPtr = 0;
    let shPtr = 0;

    function pushTri(ax, ay, az, bx, by, bz, cx, cy, cz, nx, ny, nz, r, g, b) {
      if (sPtr + 27 > solidArr.length) return;
      solidArr[sPtr++] = ax; solidArr[sPtr++] = ay; solidArr[sPtr++] = az;
      solidArr[sPtr++] = nx; solidArr[sPtr++] = ny; solidArr[sPtr++] = nz;
      solidArr[sPtr++] = r; solidArr[sPtr++] = g; solidArr[sPtr++] = b;
      solidArr[sPtr++] = bx; solidArr[sPtr++] = by; solidArr[sPtr++] = bz;
      solidArr[sPtr++] = nx; solidArr[sPtr++] = ny; solidArr[sPtr++] = nz;
      solidArr[sPtr++] = r; solidArr[sPtr++] = g; solidArr[sPtr++] = b;
      solidArr[sPtr++] = cx; solidArr[sPtr++] = cy; solidArr[sPtr++] = cz;
      solidArr[sPtr++] = nx; solidArr[sPtr++] = ny; solidArr[sPtr++] = nz;
      solidArr[sPtr++] = r; solidArr[sPtr++] = g; solidArr[sPtr++] = b;
    }

    // Tapered 3D frustum/windshield box (allows angled front & rear car glass silhouettes!)
    function pushOrientedFrustum(cx, cy, z0, z1, hl0, hw0, hl1, hw1, ux, uy, col, topCol, frontShift = 0) {
      const rx = uy, ry = -ux;
      const b0x = cx - ux * hl0 - rx * hw0, b0y = cy - uy * hl0 - ry * hw0;
      const b1x = cx + ux * hl0 - rx * hw0, b1y = cy + uy * hl0 - ry * hw0;
      const b2x = cx + ux * hl0 + rx * hw0, b2y = cy + uy * hl0 + ry * hw0;
      const b3x = cx - ux * hl0 + rx * hw0, b3y = cy - uy * hl0 + ry * hw0;

      const tcx = cx + ux * frontShift, tcy = cy + uy * frontShift;
      const t0x = tcx - ux * hl1 - rx * hw1, t0y = tcy - uy * hl1 - ry * hw1;
      const t1x = tcx + ux * hl1 - rx * hw1, t1y = tcy + uy * hl1 - ry * hw1;
      const t2x = tcx + ux * hl1 + rx * hw1, t2y = tcy + uy * hl1 + ry * hw1;
      const t3x = tcx - ux * hl1 + rx * hw1, t3y = tcy - uy * hl1 + ry * hw1;

      const tc = topCol || col;
      pushTri(t0x, t0y, z1, t1x, t1y, z1, t2x, t2y, z1, 0, 0, 1, tc[0], tc[1], tc[2]);
      pushTri(t0x, t0y, z1, t2x, t2y, z1, t3x, t3y, z1, 0, 0, 1, tc[0], tc[1], tc[2]);
      pushTri(b0x, b0y, z0, b1x, b1y, z0, t1x, t1y, z1, -rx, -ry, 0.25, col[0], col[1], col[2]);
      pushTri(b0x, b0y, z0, t1x, t1y, z1, t0x, t0y, z1, -rx, -ry, 0.25, col[0], col[1], col[2]);
      pushTri(b1x, b1y, z0, b2x, b2y, z0, t2x, t2y, z1, ux * 0.85, uy * 0.85, 0.52, col[0], col[1], col[2]);
      pushTri(b1x, b1y, z0, t2x, t2y, z1, t1x, t1y, z1, ux * 0.85, uy * 0.85, 0.52, col[0], col[1], col[2]);
      pushTri(b2x, b2y, z0, b3x, b3y, z0, t3x, t3y, z1, rx, ry, 0.25, col[0], col[1], col[2]);
      pushTri(b2x, b2y, z0, t3x, t3y, z1, t2x, t2y, z1, rx, ry, 0.25, col[0], col[1], col[2]);
      pushTri(b3x, b3y, z0, b0x, b0y, z0, t0x, t0y, z1, -ux * 0.85, -uy * 0.85, 0.45, col[0], col[1], col[2]);
      pushTri(b3x, b3y, z0, t0x, t0y, z1, t3x, t3y, z1, -ux * 0.85, -uy * 0.85, 0.45, col[0], col[1], col[2]);
    }

    function pushOrientedBox(cx, cy, z0, z1, hl, hw, ux, uy, col, topCol) {
      pushOrientedFrustum(cx, cy, z0, z1, hl, hw, hl, hw, ux, uy, col, topCol, 0);
    }

    function pushShadowQuad(cx, cy, z, hl, hw, ux, uy, alpha) {
      if (shPtr + 42 > shadowArr.length) return;
      const rx = uy, ry = -ux;
      // Subtle sun-shifted shadow offset (+x East, +y North light -> cast SW)
      const scx = cx - 0.35, scy = cy - 0.22;
      const p0x = scx - ux * hl - rx * hw, p0y = scy - uy * hl - ry * hw;
      const p1x = scx + ux * hl - rx * hw, p1y = scy + uy * hl - ry * hw;
      const p2x = scx + ux * hl + rx * hw, p2y = scy + uy * hl + ry * hw;
      const p3x = scx - ux * hl + rx * hw, p3y = scy - uy * hl + ry * hw;
      const r = 0.06, g = 0.09, b = 0.14;
      shadowArr[shPtr++] = p0x; shadowArr[shPtr++] = p0y; shadowArr[shPtr++] = z; shadowArr[shPtr++] = r; shadowArr[shPtr++] = g; shadowArr[shPtr++] = b; shadowArr[shPtr++] = alpha;
      shadowArr[shPtr++] = p1x; shadowArr[shPtr++] = p1y; shadowArr[shPtr++] = z; shadowArr[shPtr++] = r; shadowArr[shPtr++] = g; shadowArr[shPtr++] = b; shadowArr[shPtr++] = alpha;
      shadowArr[shPtr++] = p2x; shadowArr[shPtr++] = p2y; shadowArr[shPtr++] = z; shadowArr[shPtr++] = r; shadowArr[shPtr++] = g; shadowArr[shPtr++] = b; shadowArr[shPtr++] = alpha;
      shadowArr[shPtr++] = p0x; shadowArr[shPtr++] = p0y; shadowArr[shPtr++] = z; shadowArr[shPtr++] = r; shadowArr[shPtr++] = g; shadowArr[shPtr++] = b; shadowArr[shPtr++] = alpha;
      shadowArr[shPtr++] = p2x; shadowArr[shPtr++] = p2y; shadowArr[shPtr++] = z; shadowArr[shPtr++] = r; shadowArr[shPtr++] = g; shadowArr[shPtr++] = b; shadowArr[shPtr++] = alpha;
      shadowArr[shPtr++] = p3x; shadowArr[shPtr++] = p3y; shadowArr[shPtr++] = z; shadowArr[shPtr++] = r; shadowArr[shPtr++] = g; shadowArr[shPtr++] = b; shadowArr[shPtr++] = alpha;
    }

    function pushGlowTri(ax, ay, az, bx, by, bz, cx, cy, cz, r, g, b, a0, a1, a2) {
      if (gPtr + 21 > glowArr.length) return;
      glowArr[gPtr++] = ax; glowArr[gPtr++] = ay; glowArr[gPtr++] = az; glowArr[gPtr++] = r; glowArr[gPtr++] = g; glowArr[gPtr++] = b; glowArr[gPtr++] = a0;
      glowArr[gPtr++] = bx; glowArr[gPtr++] = by; glowArr[gPtr++] = bz; glowArr[gPtr++] = r; glowArr[gPtr++] = g; glowArr[gPtr++] = b; glowArr[gPtr++] = a1;
      glowArr[gPtr++] = cx; glowArr[gPtr++] = cy; glowArr[gPtr++] = cz; glowArr[gPtr++] = r; glowArr[gPtr++] = g; glowArr[gPtr++] = b; glowArr[gPtr++] = a2;
    }

    function pushGlowDisc(cx, cy, z, rad, r, g, b, alpha) {
      const segs = 8;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        pushGlowTri(
          cx, cy, z,
          cx + Math.cos(a0) * rad, cy + Math.sin(a0) * rad, z,
          cx + Math.cos(a1) * rad, cy + Math.sin(a1) * rad, z,
          r, g, b, alpha, 0.0, 0.0
        );
      }
    }

    function buildLampBuffer(gl) {
      const verts = [];
      const rad = 14.5;
      const segs = 10;
      for (const [lx, ly] of lampSpots) {
        for (let i = 0; i < segs; i++) {
          const a0 = (i / segs) * Math.PI * 2;
          const a1 = ((i + 1) / segs) * Math.PI * 2;
          verts.push(
            lx, ly, 0.22, 1.0, 0.82, 0.46, 0.34,
            lx + Math.cos(a0) * rad, ly + Math.sin(a0) * rad, 0.22, 1.0, 0.78, 0.40, 0.0,
            lx + Math.cos(a1) * rad, ly + Math.sin(a1) * rad, 0.22, 1.0, 0.78, 0.40, 0.0
          );
        }
      }
      lampBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, lampBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
      lampVertCount = verts.length / 7;
    }

    const SOLID_VS = `
      attribute vec3 a_pos;
      attribute vec3 a_normal;
      attribute vec3 a_color;
      uniform mat4 u_mvp;
      varying vec3 v_normal;
      varying vec3 v_color;
      void main() {
        gl_Position = u_mvp * vec4(a_pos, 1.0);
        v_normal = a_normal;
        v_color = a_color;
      }
    `;
    const SOLID_FS = `
      precision mediump float;
      varying vec3 v_normal;
      varying vec3 v_color;
      uniform float u_night;
      void main() {
        vec3 n = normalize(v_normal);
        vec3 sun = normalize(vec3(0.80, 0.42, 0.52));
        float ndl = max(dot(n, sun), 0.0);
        float fill = max(dot(n, vec3(-0.6, -0.3, 0.5)), 0.0);
        vec3 dayCol = v_color * (0.58 + 0.46 * ndl + 0.10 * fill + 0.06 * max(n.z, 0.0));
        vec3 nightCol = v_color * (0.28 + 0.26 * ndl + 0.08 * max(n.z, 0.0)) * vec3(0.76, 0.86, 1.10);
        vec3 col = mix(dayCol, nightCol, u_night);
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `;
    const GLOW_VS = `
      attribute vec3 a_pos;
      attribute vec4 a_color;
      uniform mat4 u_mvp;
      varying vec4 v_color;
      void main() {
        gl_Position = u_mvp * vec4(a_pos, 1.0);
        v_color = a_color;
      }
    `;
    const GLOW_FS = `
      precision mediump float;
      varying vec4 v_color;
      uniform float u_alpha;
      void main() {
        gl_FragColor = vec4(v_color.rgb, v_color.a * u_alpha);
      }
    `;

    const tireCol = [0.14, 0.16, 0.19];
    const glassCol = [0.18, 0.25, 0.34];
    const chromeCol = [0.88, 0.90, 0.93];
    const mastCol = [0.22, 0.25, 0.30];
    const visorCol = [0.12, 0.14, 0.17];
    const headLensCol = [0.98, 0.95, 0.84];
    const tailLensCol = [0.88, 0.16, 0.16];
    const bagCol = [0.24, 0.26, 0.32];
    const wheelOff = [0.60, -0.60];

    function emitVehicle(c, pos, nightOn, scale) {
      const hl = c.len * 0.5 * scale, hw = c.wid * 0.5 * scale;
      const ux = pos.ux, uy = pos.uy;
      const rx = uy, ry = -ux;

      // Ground contact shadow + slight suspension weight forward on braking
      pushShadowQuad(pos.x, pos.y, 0.09, hl * 1.08, hw * 1.15, ux, uy, 0.42);
      const brakeDip = c.brake * 0.05 * scale;

      if (c.type === 'trike') {
        // Filipino Motor Tricycle: slender motorbike on left + covered passenger sidecar cab on right!
        pushOrientedBox(pos.x - rx * (hw * 0.48), pos.y - ry * (hw * 0.48), 0.18, 0.95 * scale, hl * 0.82, hw * 0.28, ux, uy, tireCol, chromeCol);
        pushOrientedBox(pos.x - rx * (hw * 0.48), pos.y - ry * (hw * 0.48), 0.95 * scale, 1.48 * scale, hl * 0.24, hw * 0.24, ux, uy, [0.22, 0.36, 0.52], SKIN_COLORS[0]);
        pushOrientedBox(pos.x + rx * (hw * 0.34), pos.y + ry * (hw * 0.34), 0.24 * scale, 0.92 * scale, hl * 0.72, hw * 0.55, ux, uy, c.color, c.color);
        pushOrientedFrustum(pos.x + rx * (hw * 0.34), pos.y + ry * (hw * 0.34), 0.92 * scale, c.h * scale, hl * 0.68, hw * 0.54, hl * 0.52, hw * 0.48, ux, uy, glassCol, c.color, 0);
        // Single bright motorbike headlamp
        pushOrientedBox(pos.x + ux * (hl * 0.78) - rx * (hw * 0.48), pos.y + uy * (hl * 0.78) - ry * (hw * 0.48), 0.68 * scale, 0.86 * scale, 0.12 * scale, 0.14 * scale, ux, uy, headLensCol, headLensCol);
      } else if (c.type === 'jeepney') {
        // Ilocos Jeepney: protruding stainless-chrome front hood + open colored rear passenger roof canopy + destination header!
        for (const ws of wheelOff) {
          pushOrientedBox(pos.x + ux * (hl * ws) - rx * (hw * 0.88), pos.y + uy * (hl * ws) - ry * (hw * 0.88), 0.08, 0.64 * scale, 0.44 * scale, 0.20 * scale, ux, uy, tireCol, tireCol);
          pushOrientedBox(pos.x + ux * (hl * ws) + rx * (hw * 0.88), pos.y + uy * (hl * ws) + ry * (hw * 0.88), 0.08, 0.64 * scale, 0.44 * scale, 0.20 * scale, ux, uy, tireCol, tireCol);
        }
        // Lower painted body + stainless front hood & chrome bullbar bumper
        pushOrientedBox(pos.x - ux * (hl * 0.16), pos.y - uy * (hl * 0.16), 0.24 * scale, 1.12 * scale, hl * 0.84, hw, ux, uy, c.color, c.color);
        pushOrientedBox(pos.x + ux * (hl * 0.72), pos.y + uy * (hl * 0.72), 0.26 * scale, 1.18 * scale, hl * 0.28, hw * 0.88, ux, uy, chromeCol, chromeCol);
        pushOrientedBox(pos.x + ux * (hl * 1.00), pos.y + uy * (hl * 1.00), 0.28 * scale, 0.62 * scale, 0.10 * scale, hw * 0.82, ux, uy, chromeCol, chromeCol);
        // Glass cab windshield + overhanging long silver passenger roof + front route signboard
        pushOrientedFrustum(pos.x + ux * (hl * 0.36), pos.y + uy * (hl * 0.36), 1.12 * scale, 1.98 * scale, hl * 0.22, hw * 0.90, hl * 0.18, hw * 0.82, ux, uy, glassCol, c.accentCol, -hl * 0.04);
        pushOrientedBox(pos.x - ux * (hl * 0.20), pos.y - uy * (hl * 0.20), 1.95 * scale, c.h * scale, hl * 0.76, hw * 0.94, ux, uy, c.accentCol, chromeCol);
        pushOrientedBox(pos.x + ux * (hl * 0.42), pos.y + uy * (hl * 0.42), (c.h - 0.04) * scale, (c.h + 0.14) * scale, hl * 0.12, hw * 0.72, ux, uy, c.color, headLensCol);
      } else if (c.type === 'bus') {
        // Highway Provincial Coach (Partas/Viron style): crisp white shell + colored livery stripe + panoramic glass + rooftop AC!
        for (const ws of [-0.66, 0.0, 0.64]) {
          pushOrientedBox(pos.x + ux * (hl * ws) - rx * (hw * 0.90), pos.y + uy * (hl * ws) - ry * (hw * 0.90), 0.08, 0.78 * scale, 0.56 * scale, 0.22 * scale, ux, uy, tireCol, tireCol);
          pushOrientedBox(pos.x + ux * (hl * ws) + rx * (hw * 0.90), pos.y + uy * (hl * ws) + ry * (hw * 0.90), 0.08, 0.78 * scale, 0.56 * scale, 0.22 * scale, ux, uy, tireCol, tireCol);
        }
        pushOrientedBox(pos.x, pos.y, 0.30 * scale, 1.25 * scale, hl, hw, ux, uy, c.color, c.color);
        pushOrientedBox(pos.x, pos.y, 1.10 * scale, 1.48 * scale, hl * 0.98, hw * 1.02, ux, uy, c.accentCol, c.accentCol);
        pushOrientedFrustum(pos.x, pos.y, 1.48 * scale, (c.h - 0.22) * scale, hl * 0.97, hw * 0.98, hl * 0.92, hw * 0.92, ux, uy, glassCol, c.color, -hl * 0.02);
        pushOrientedBox(pos.x - ux * (hl * 0.10), pos.y - uy * (hl * 0.10), (c.h - 0.22) * scale, c.h * scale, hl * 0.36, hw * 0.60, ux, uy, chromeCol, chromeCol);
        // Front chrome bumper & crisp dual corner headlights
        pushOrientedBox(pos.x + ux * (hl * 0.98), pos.y + uy * (hl * 0.98), 0.36 * scale, 0.72 * scale, 0.10 * scale, hw * 0.96, ux, uy, chromeCol, headLensCol);
      } else {
        // Sedan or SUV: 4 dark wheel hubs + crisp body + tapered angled windshield greenhouse + visible headlights/taillights!
        for (const ws of wheelOff) {
          pushOrientedBox(pos.x + ux * (hl * ws) - rx * (hw * 0.88), pos.y + uy * (hl * ws) - ry * (hw * 0.88), 0.08, 0.58 * scale, 0.42 * scale, 0.18 * scale, ux, uy, tireCol, tireCol);
          pushOrientedBox(pos.x + ux * (hl * ws) + rx * (hw * 0.88), pos.y + uy * (hl * ws) + ry * (hw * 0.88), 0.08, 0.58 * scale, 0.42 * scale, 0.18 * scale, ux, uy, tireCol, tireCol);
        }
        const beltZ = Math.max(0.45 * scale, c.h * 0.54 * scale - brakeDip);
        pushOrientedBox(pos.x, pos.y, 0.22 * scale, beltZ, hl, hw, ux, uy, c.color, c.color);
        const isSuv = (c.type === 'suv');
        const cabBaseL = isSuv ? hl * 0.68 : hl * 0.54;
        const cabTopL = isSuv ? hl * 0.54 : hl * 0.38;
        const cabShift = isSuv ? -hl * 0.14 : -hl * 0.10;
        pushOrientedFrustum(pos.x + ux * cabShift, pos.y + uy * cabShift, beltZ, (c.h * scale) - brakeDip * 0.6, cabBaseL, hw * 0.90, cabTopL, hw * 0.78, ux, uy, glassCol, c.color, -hl * 0.03);
        if (isSuv && scale > 0.7) {
          // Twin slim silver roof rails for SUV character
          pushOrientedBox(pos.x + ux * cabShift - rx * (hw * 0.66), pos.y + uy * cabShift - ry * (hw * 0.66), (c.h * scale) - brakeDip * 0.6, ((c.h + 0.08) * scale) - brakeDip * 0.6, cabTopL * 0.92, 0.07 * scale, ux, uy, chromeCol, chromeCol);
          pushOrientedBox(pos.x + ux * cabShift + rx * (hw * 0.66), pos.y + uy * cabShift + ry * (hw * 0.66), (c.h * scale) - brakeDip * 0.6, ((c.h + 0.08) * scale) - brakeDip * 0.6, cabTopL * 0.92, 0.07 * scale, ux, uy, chromeCol, chromeCol);
        }
        // Distinct front grille/headlamps & rear ruby tail lamps (so every vehicle reads directional even in bright Day!)
        if (scale > 0.55) {
          const noseX = pos.x + ux * (hl * 0.99), noseY = pos.y + uy * (hl * 0.99);
          const rearX = pos.x - ux * (hl * 0.99), rearY = pos.y - uy * (hl * 0.99);
          pushOrientedBox(noseX - rx * (hw * 0.68), noseY - ry * (hw * 0.68), 0.38 * scale, 0.58 * scale, 0.09 * scale, 0.18 * scale, ux, uy, headLensCol, headLensCol);
          pushOrientedBox(noseX + rx * (hw * 0.68), noseY + ry * (hw * 0.68), 0.38 * scale, 0.58 * scale, 0.09 * scale, 0.18 * scale, ux, uy, headLensCol, headLensCol);
          pushOrientedBox(rearX - rx * (hw * 0.68), rearY - ry * (hw * 0.68), 0.42 * scale, 0.62 * scale, 0.09 * scale, 0.18 * scale, ux, uy, tailLensCol, tailLensCol);
          pushOrientedBox(rearX + rx * (hw * 0.68), rearY + ry * (hw * 0.68), 0.42 * scale, 0.62 * scale, 0.09 * scale, 0.18 * scale, ux, uy, tailLensCol, tailLensCol);
        }
      }

      // Dynamic Ruby Brake Taillights (visible in Day when stopping at Red signals/traffic, super vibrant at Night!)
      const tailAlpha = nightOn ? (0.72 + c.brake * 0.28) : (c.brake * 0.65);
      if (tailAlpha > 0.06) {
        const bx = pos.x - ux * (hl + 0.14);
        const by = pos.y - uy * (hl + 0.14);
        const tLen = (nightOn ? 3.2 : 1.6) * (0.7 + c.brake * 0.6);
        const tFarX = bx - ux * tLen, tFarY = by - uy * tLen;
        pushGlowTri(
          bx - rx * (hw * 0.78), by - ry * (hw * 0.78), 0.58 * scale,
          bx + rx * (hw * 0.78), by + ry * (hw * 0.78), 0.58 * scale,
          tFarX, tFarY, 0.20,
          1.0, 0.14, 0.12, tailAlpha, tailAlpha, 0.0
        );
      }

      // Warm Night Headlight Cones spilling forward along curved asphalt!
      if (nightOn) {
        const fx = pos.x + ux * (hl + 0.16);
        const fy = pos.y + uy * (hl + 0.16);
        const beamLen = (c.type === 'bus' ? 14.5 : 11.5) * scale;
        const farX = fx + ux * beamLen, farY = fy + uy * beamLen;
        pushGlowTri(
          fx - rx * (hw * 0.72), fy - ry * (hw * 0.72), 0.42 * scale,
          farX - rx * (2.3 * scale), farY - ry * (2.3 * scale), 0.18,
          farX + rx * (2.3 * scale), farY + ry * (2.3 * scale), 0.18,
          1.0, 0.95, 0.78, 0.72 * nightFactor, 0.0, 0.0
        );
        pushGlowTri(
          fx - rx * (hw * 0.72), fy - ry * (hw * 0.72), 0.42 * scale,
          farX + rx * (2.3 * scale), farY + ry * (2.3 * scale), 0.18,
          fx + rx * (hw * 0.72), fy + ry * (hw * 0.72), 0.42 * scale,
          1.0, 0.95, 0.78, 0.72 * nightFactor, 0.0, 0.72 * nightFactor
        );
      }
    }

    function emitHuman(x, y, z, ux, uy, stridePhase, amp, shirt, pants, skin, hair, hasHat, hasBag, highDetail) {
      const rx = uy, ry = -ux;
      const swing = Math.sin(stridePhase) * amp;
      const legL = 0.34 * swing;
      const legR = -0.34 * swing;
      const liftL = Math.max(0, Math.sin(stridePhase)) * 0.16 * amp;
      const liftR = Math.max(0, -Math.sin(stridePhase)) * 0.16 * amp;
      const bob = Math.abs(Math.sin(stridePhase)) * 0.09 * amp;

      // Ground drop shadow
      pushShadowQuad(x, y, z + 0.04, 0.42, 0.36, ux, uy, 0.36);

      // Left & Right striding legs
      pushOrientedBox(x + ux * legL - rx * 0.11, y + uy * legL - ry * 0.11, z + liftL, z + 0.72 + bob, 0.13, 0.10, ux, uy, pants, pants);
      pushOrientedBox(x + ux * legR + rx * 0.11, y + uy * legR + ry * 0.11, z + liftR, z + 0.72 + bob, 0.13, 0.10, ux, uy, pants, pants);

      // Torso (slightly angled naturally with shoulder sway)
      pushOrientedBox(x, y, z + 0.72 + bob, z + 1.38 + bob, 0.17, 0.22, ux, uy, shirt, shirt);

      // Opposing swinging arms & commuter backpack at close zooms (smooth micro-LOD!)
      if (highDetail) {
        const armL = -0.22 * swing;
        const armR = 0.22 * swing;
        pushOrientedBox(x + ux * armL - rx * 0.28, y + uy * armL - ry * 0.28, z + 0.78 + bob, z + 1.32 + bob, 0.09, 0.07, ux, uy, shirt, skin);
        pushOrientedBox(x + ux * armR + rx * 0.28, y + uy * armR + ry * 0.28, z + 0.78 + bob, z + 1.32 + bob, 0.09, 0.07, ux, uy, shirt, skin);
        if (hasBag) {
          pushOrientedBox(x - ux * 0.21, y - uy * 0.21, z + 0.80 + bob, z + 1.30 + bob, 0.10, 0.16, ux, uy, bagCol, bagCol);
        }
      }

      // Head + crisp dark hair cap / wide coastal sun hat
      pushOrientedBox(x, y, z + 1.40 + bob, z + 1.72 + bob, 0.15, 0.15, ux, uy, skin, skin);
      if (hasHat) {
        pushOrientedBox(x, y, z + 1.70 + bob, z + 1.80 + bob, 0.24, 0.24, ux, uy, chromeCol, chromeCol);
      } else {
        pushOrientedBox(x, y, z + 1.66 + bob, z + 1.78 + bob, 0.16, 0.16, ux, uy, hair, hair);
      }
    }

    let prevFrameTs = performance.now();
    let lastStats = {
      simTime: 0,
      paused,
      vehicles: vehicles.length,
      walkers: walkers.length,
      idlePeople: idlePeople.length,
      solidVerts: 0,
      glowVerts: 0,
      shadowVerts: 0,
      maxSolidCap: Math.floor(solidArr.length / 9),
      maxGlowCap: Math.floor(glowArr.length / 7),
      maxShadowCap: Math.floor(shadowArr.length / 7)
    };

    return {
      id: options.id || 'locus-3d-living-city',
      type: 'custom',
      renderingMode: '3d',

      getStats() {
        return { ...lastStats, paused };
      },

      setPaused(p) {
        const next = Boolean(p);
        if (paused === next) return;
        paused = next;
        if (!paused && mapRef) {
          prevFrameTs = performance.now();
          mapRef.triggerRepaint();
        }
      },

      setNightFactor(n) {
        nightFactor = Math.max(0, Math.min(1, Number(n) || 0));
        if (mapRef) mapRef.triggerRepaint();
      },

      setVisible(v) {
        visible = Boolean(v);
        if (mapRef) mapRef.triggerRepaint();
      },

      onAdd(map, gl) {
        mapRef = map;
        solidProg = createProgram(gl, SOLID_VS, SOLID_FS);
        glowProg = createProgram(gl, GLOW_VS, GLOW_FS);
        if (solidProg) {
          solidLoc = {
            pos: gl.getAttribLocation(solidProg, 'a_pos'),
            norm: gl.getAttribLocation(solidProg, 'a_normal'),
            col: gl.getAttribLocation(solidProg, 'a_color'),
            mvp: gl.getUniformLocation(solidProg, 'u_mvp'),
            night: gl.getUniformLocation(solidProg, 'u_night')
          };
        }
        if (glowProg) {
          glowLoc = {
            pos: gl.getAttribLocation(glowProg, 'a_pos'),
            col: gl.getAttribLocation(glowProg, 'a_color'),
            mvp: gl.getUniformLocation(glowProg, 'u_mvp'),
            alpha: gl.getUniformLocation(glowProg, 'u_alpha')
          };
        }
        solidBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, solidBuf);
        gl.bufferData(gl.ARRAY_BUFFER, solidArr.byteLength, gl.DYNAMIC_DRAW);

        glowBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, glowBuf);
        gl.bufferData(gl.ARRAY_BUFFER, glowArr.byteLength, gl.DYNAMIC_DRAW);

        shadowBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, shadowBuf);
        gl.bufferData(gl.ARRAY_BUFFER, shadowArr.byteLength, gl.DYNAMIC_DRAW);

        buildLampBuffer(gl);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
      },

      render(gl, rawMatrix) {
        if (!visible || !solidProg || !glowProg || !solidLoc || !glowLoc || !mapRef) return;
        const zoom = mapRef.getZoom();
        if (zoom < 14.2) return;
        const matrix = (rawMatrix && rawMatrix.defaultProjectionData)
          ? rawMatrix.defaultProjectionData.mainMatrix
          : rawMatrix;
        if (!matrix) return;

        const nowMs = performance.now();
        let elapsed = paused ? 0 : Math.min(0.15, (nowMs - prevFrameTs) * 0.001);
        prevFrameTs = nowMs;
        // Keep the physics steps small even when rendering drops below 20 fps.
        while (elapsed > 0) {
          const dt = Math.min(0.05, elapsed);
          simTime += dt;
          stepSimulation(dt, simTime);
          elapsed -= dt;
        }
        lastStats.simTime = +simTime.toFixed(3);

        const mvp = mulMat4f64(matrix, originModel);
        const b = mapRef.getBounds();
        const padM = 135;
        const minEx = (b.getWest() - originLng) * mPerDegLng - padM;
        const maxEx = (b.getEast() - originLng) * mPerDegLng + padM;
        const minEy = (b.getSouth() - originLat) * mPerDegLat - padM;
        const maxEy = (b.getNorth() - originLat) * mPerDegLat + padM;

        sPtr = 0;
        gPtr = 0;
        shPtr = 0;
        const nightOn = nightFactor > 0.04;
        const highDetailHuman = zoom >= 16.0;

        // 1. Emit Street-Aligned Traffic Signal Masts, Housing Visors & Glowing Green/Amber/Red Signal Halos
        for (let i = 0; i < signalMasts.length; i++) {
          const m = signalMasts[i];
          if (m.x < minEx || m.x > maxEx || m.y < minEy || m.y > maxEy) continue;
          const ph = getSignalPhase(m.inter, simTime);
          const nsGreen = ph.activeGroup === 0;
          const nsCol = nsGreen
            ? (ph.isAmber ? [0.98, 0.72, 0.16] : [0.16, 0.88, 0.46])
            : [0.92, 0.22, 0.20];
          const ewCol = !nsGreen
            ? (ph.isAmber ? [0.98, 0.72, 0.16] : [0.16, 0.88, 0.46])
            : [0.92, 0.22, 0.20];

          // Align each mast cleanly to the intersecting street directions (m.u0 = N-S flow, m.u1 = E-W flow)
          const u0 = m.u0, r0x = u0.uy, r0y = -u0.ux;
          const pAx = m.x + r0x * 5.0 - u0.ux * 4.4, pAy = m.y + r0y * 5.0 - u0.uy * 4.4;
          pushOrientedBox(pAx, pAy, 0.0, 5.4, 0.20, 0.20, u0.ux, u0.uy, mastCol, chromeCol);
          pushOrientedBox(pAx - r0x * 2.4, pAy - r0y * 2.4, 5.12, 5.44, 0.13, 2.6, u0.ux, u0.uy, mastCol, chromeCol);
          pushOrientedBox(pAx - r0x * 2.9, pAy - r0y * 2.9, 4.92, 5.66, 0.26, 0.62, u0.ux, u0.uy, visorCol, visorCol);
          pushOrientedBox(pAx - r0x * 2.9, pAy - r0y * 2.9, 5.00, 5.58, 0.30, 0.44, u0.ux, u0.uy, nsCol, nsCol);
          pushGlowDisc(pAx - r0x * 2.9, pAy - r0y * 2.9, 5.30, 2.5, nsCol[0], nsCol[1], nsCol[2], nightOn ? 0.86 : 0.46);

          const u1 = m.u1, r1x = u1.uy, r1y = -u1.ux;
          const pBx = m.x - r1x * 5.0 + u1.ux * 4.4, pBy = m.y - r1y * 5.0 + u1.uy * 4.4;
          pushOrientedBox(pBx, pBy, 0.0, 5.4, 0.20, 0.20, u1.ux, u1.uy, mastCol, chromeCol);
          pushOrientedBox(pBx + r1x * 2.4, pBy + r1y * 2.4, 5.12, 5.44, 0.13, 2.6, u1.ux, u1.uy, mastCol, chromeCol);
          pushOrientedBox(pBx + r1x * 2.9, pBy + r1y * 2.9, 4.92, 5.66, 0.26, 0.62, u1.ux, u1.uy, visorCol, visorCol);
          pushOrientedBox(pBx + r1x * 2.9, pBy + r1y * 2.9, 5.00, 5.58, 0.30, 0.44, u1.ux, u1.uy, ewCol, ewCol);
          pushGlowDisc(pBx + r1x * 2.9, pBy + r1y * 2.9, 5.30, 2.5, ewCol[0], ewCol[1], ewCol[2], nightOn ? 0.86 : 0.46);
        }

        // 2. Emit Two-Axle Wheelbase-Sampled Spline Vehicles with Soft Edge Fade
        for (let i = 0; i < vehicles.length; i++) {
          const c = vehicles[i];
          const lane = lanes[c.laneIdx];
          let edgeScale = 1.0;
          if (!lane.path.closed) {
            if (c.s < 14) edgeScale = Math.max(0.08, c.s / 14);
            else if (c.s > lane.path.total - 14) edgeScale = Math.max(0.08, (lane.path.total - c.s) / 14);
          }
          if (edgeScale < 0.15) continue;
          const halfWB = Math.min(2.6, c.len * 0.34);
          const pos = sampleVehiclePose(lane.path, c.s, lane.reverse, lane.laneOffset, halfWB);
          if (pos.x < minEx || pos.x > maxEx || pos.y < minEy || pos.y > maxEy) continue;
          emitVehicle(c, pos, nightOn, edgeScale);
        }

        // 3. Emit Articulated Walking Humans & Casual Plaza Clusters (z >= 15.0)
        if (zoom >= 15.0) {
          for (let i = 0; i < walkers.length; i++) {
            const w = walkers[i];
            const pos = sampleSpline(w.path, w.s, w.dir < 0, w.offset);
            if (pos.x < minEx || pos.x > maxEx || pos.y < minEy || pos.y > maxEy) continue;
            emitHuman(pos.x, pos.y, w.z, pos.ux, pos.uy, w.stridePhase, 1.0, w.shirt, w.pants, w.skin, w.hair, w.hasHat, w.hasBag, highDetailHuman);
            if (w.isCompanion) {
              const rx = pos.uy, ry = -pos.ux;
              emitHuman(pos.x + rx * 0.84, pos.y + ry * 0.84, w.z, pos.ux, pos.uy, w.stridePhase + 0.9, 1.0, w.pants, w.shirt, w.skin, w.hair, false, false, highDetailHuman);
            }
          }
          if (zoom >= 15.6) {
            for (let i = 0; i < idlePeople.length; i++) {
              const p = idlePeople[i];
              if (p.x < minEx || p.x > maxEx || p.y < minEy || p.y > maxEy) continue;
              const sway = Math.sin(simTime * 1.6 + p.phase) * 0.25;
              emitHuman(p.x, p.y, p.z, p.ux, p.uy, simTime * 1.4 + p.phase, 0.15 + Math.abs(sway) * 0.2, p.shirt, p.pants, p.skin, p.hair, false, false, highDetailHuman);
            }
          }
        }

        lastStats.solidVerts = sPtr / 9;
        lastStats.glowVerts = gPtr / 7;
        lastStats.shadowVerts = shPtr / 7;

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.CULL_FACE);

        // Pass 1: Ground Contact Shadows (daylight grounding)
        const shadowAlpha = Math.max(0.05, 1.0 - nightFactor * 0.85);
        if (shPtr > 0 && shadowAlpha > 0.06) {
          gl.useProgram(glowProg);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          gl.uniformMatrix4fv(glowLoc.mvp, false, mvp);
          gl.uniform1f(glowLoc.alpha, shadowAlpha);
          gl.bindBuffer(gl.ARRAY_BUFFER, shadowBuf);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, shadowArr.subarray(0, shPtr));
          gl.enableVertexAttribArray(glowLoc.pos);
          gl.enableVertexAttribArray(glowLoc.col);
          gl.vertexAttribPointer(glowLoc.pos, 3, gl.FLOAT, false, 28, 0);
          gl.vertexAttribPointer(glowLoc.col, 4, gl.FLOAT, false, 28, 12);
          gl.drawArrays(gl.TRIANGLES, 0, shPtr / 7);
          gl.disableVertexAttribArray(glowLoc.pos);
          gl.disableVertexAttribArray(glowLoc.col);
        }

        // Pass 2: Night Streetlamp Pools + Vehicle Headlights / Brake Taillights / Signal Orbs
        if (nightOn || gPtr > 0) {
          gl.useProgram(glowProg);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          gl.depthMask(false);
          gl.uniformMatrix4fv(glowLoc.mvp, false, mvp);
          gl.enableVertexAttribArray(glowLoc.pos);
          gl.enableVertexAttribArray(glowLoc.col);

          if (nightOn && lampBuf && lampVertCount) {
            gl.uniform1f(glowLoc.alpha, nightFactor * 0.72);
            gl.bindBuffer(gl.ARRAY_BUFFER, lampBuf);
            gl.vertexAttribPointer(glowLoc.pos, 3, gl.FLOAT, false, 28, 0);
            gl.vertexAttribPointer(glowLoc.col, 4, gl.FLOAT, false, 28, 12);
            gl.drawArrays(gl.TRIANGLES, 0, lampVertCount);
          }
          if (gPtr > 0) {
            gl.uniform1f(glowLoc.alpha, 1.0);
            gl.bindBuffer(gl.ARRAY_BUFFER, glowBuf);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, glowArr.subarray(0, gPtr));
            gl.vertexAttribPointer(glowLoc.pos, 3, gl.FLOAT, false, 28, 0);
            gl.vertexAttribPointer(glowLoc.col, 4, gl.FLOAT, false, 28, 12);
            gl.drawArrays(gl.TRIANGLES, 0, gPtr / 7);
          }
          gl.disableVertexAttribArray(glowLoc.pos);
          gl.disableVertexAttribArray(glowLoc.col);
          gl.depthMask(true);
        }

        // Pass 3: Solid Multi-Archetype Vehicles, Traffic Masts & Articulated Striding Humans
        if (sPtr > 0) {
          gl.useProgram(solidProg);
          gl.disable(gl.BLEND);
          gl.depthMask(true);
          gl.uniformMatrix4fv(solidLoc.mvp, false, mvp);
          gl.uniform1f(solidLoc.night, nightFactor);
          gl.bindBuffer(gl.ARRAY_BUFFER, solidBuf);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, solidArr.subarray(0, sPtr));
          gl.enableVertexAttribArray(solidLoc.pos);
          gl.enableVertexAttribArray(solidLoc.norm);
          gl.enableVertexAttribArray(solidLoc.col);
          gl.vertexAttribPointer(solidLoc.pos, 3, gl.FLOAT, false, 36, 0);
          gl.vertexAttribPointer(solidLoc.norm, 3, gl.FLOAT, false, 36, 12);
          gl.vertexAttribPointer(solidLoc.col, 3, gl.FLOAT, false, 36, 24);
          gl.drawArrays(gl.TRIANGLES, 0, sPtr / 9);
          gl.disableVertexAttribArray(solidLoc.pos);
          gl.disableVertexAttribArray(solidLoc.norm);
          gl.disableVertexAttribArray(solidLoc.col);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        if (!paused) mapRef.triggerRepaint();
      }
    };
  }

  global.createLivingCityLayer = createLivingCityLayer;
})(window);
