/* LOCUS SF — Verified Miniature 3D Architectural Landmarks & Park Trees (Zero-dependency WebGL)
 *
 * Every landmark below is anchored to its verified coordinates and real OpenStreetMap
 * building footprint / POI in San Fernando, La Union, and modeled with real-world
 * architectural resemblance (colors, facades, roofs, porticos, towers, and forecourts).
 * All model elevations are illustrative architectural proportions (labeled as estimated).
 */

const VERIFIED_LANDMARKS = [
  {
    id: 'sf-city-hall',
    name: 'San Fernando City Hall',
    shortName: 'City Hall',
    category: 'Civic Landmark',
    lng: 120.317335,
    lat: 16.616789,
    rotDeg: -12.0,
    zoom: 17.6,
    pitch: 60,
    bearing: -22,
    heightNote: 'Illustrative civic model (~13.5 m cornice; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged OSM footprint (46 × 34 m) & POI [120.317336, 16.616788]; exterior modeled after Wikimedia Commons photo (Jan 2024).',
    summary: 'Modern civic headquarters facing Lion’s Park & City Plaza, featuring twin teal-green glass curtain wings, silver-clad central balcony portal with white balustrade, circular city seal, overhanging white cornice, Jose Rizal monument, and 5 flagpoles.',
    kind: 'cityhall'
  },
  {
    id: 'la-union-capitol',
    name: 'La Union Provincial Capitol',
    shortName: 'Provincial Capitol',
    category: 'Provincial Government Landmark',
    lng: 120.318360,
    lat: 16.612973,
    rotDeg: -10.8,
    zoom: 17.45,
    pitch: 60,
    bearing: 48,
    heightNote: 'Illustrative Neoclassical civic palace model (~17.6 m central crown; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged 20-vertex H-shaped OSM footprint (54 × 85 m) & POI [120.318360, 16.612973] atop Capitol Hill; modeled after Wikimedia Commons day & night photos.',
    summary: 'Grand pure-white Neoclassical and Art-Deco seat of the Provincial Government of La Union atop Capitol Hill, featuring its colonnaded porte-cochere, balustraded governor’s balcony with provincial seals, blush-ivory recessed upper loggia, gold fascia crown, grand travertine steps, 3 civic flagpoles, green-roofed guardhouse, and symmetrical forest-green-roofed H-wings.',
    kind: 'capitol'
  },
  {
    id: 'st-william-cathedral',
    name: 'Saint William the Hermit Cathedral',
    shortName: 'Cathedral',
    category: 'Religious & Heritage Landmark',
    lng: 120.317860,
    lat: 16.615691,
    rotDeg: -11.6,
    zoom: 17.5,
    pitch: 60,
    bearing: -36,
    heightNote: 'Illustrative heritage model (~19.5 m facade cross, ~24.5 m bell tower; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged OSM footprint (82 × 22 m, Gomez St) & POI [120.317861, 16.615693]; facade modeled after Wikimedia Commons reference.',
    summary: 'Historic white-and-dove-grey Baroque-Neoclassical cathedral with 4-tier scrolled pediment facade, arched front porte-cochere, stained-glass windows, pitched nave roof, and crenellated right-side bell tower with brick-red louver slit.',
    kind: 'cathedral'
  },
  {
    id: 'sf-city-plaza',
    name: 'San Fernando City Plaza & Stage',
    shortName: 'City Plaza',
    category: 'Civic Square & Auditorium',
    lng: 120.316851,
    lat: 16.615835,
    rotDeg: -11.6,
    zoom: 17.5,
    pitch: 58,
    bearing: -26,
    heightNote: 'Illustrative civic pavilion model (~9.5 m canopy arch; OSM stage footprint fallback 5 m estimated)',
    verification: 'Verified via packaged OSM plaza park polygon & stage footprint [120.316851, 16.615835]; modeled after Wikimedia Commons Town Plaza references.',
    summary: 'Historic 1955 white colonnaded Town Plaza stage and sweeping curved white canopy arch overlooking the circular central plaza court and landscaped park groves.',
    kind: 'plaza'
  },
  {
    id: 'ma-cho-temple',
    name: 'Ma-Cho Temple',
    shortName: 'Ma-Cho Temple',
    category: 'Cultural & Heritage Landmark',
    lng: 120.317412,
    lat: 16.621138,
    rotDeg: 20.7,
    zoom: 17.6,
    pitch: 60,
    bearing: -34,
    heightNote: 'Illustrative multi-tier temple model (~22 m ridge; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged 15-vertex OSM cruciform footprint (34 × 25 m) & POI [120.317389, 16.621116]; modeled after Wikimedia Commons photo.',
    summary: 'Hilltop Taoist sanctuary overlooking the West Philippine Sea, distinguished by terracotta-red sweeping tiled roofs with green upturned eaves, golden-yellow upper clerestory, twin white grand staircases, and flanking Bell & Drum Towers.',
    kind: 'macho'
  },
  {
    id: 'friendship-pagoda',
    name: 'Filipino-Chinese Friendship Pagoda',
    shortName: 'Pagoda Hill',
    category: 'Cultural & Scenic Landmark',
    lng: 120.319229,
    lat: 16.614187,
    rotDeg: 0,
    zoom: 17.6,
    pitch: 60,
    bearing: -42,
    heightNote: 'Illustrative octagonal pagoda model (~19.5 m finial; viewpoint POI has no measured OSM height)',
    verification: 'Verified via packaged OSM POI [120.319229, 16.614187] inside verified Pagoda Hill park polygon.',
    summary: 'Octagonal hilltop pagoda on Pagoda Hill with white balustrade terrace, crimson pillars, and multi-tiered green-and-red upturned Chinese eaves overlooking downtown and the bay.',
    kind: 'pagoda'
  },
  {
    id: 'sf-old-public-market',
    name: 'San Fernando City Old Public Market',
    shortName: 'Old Market',
    category: 'Historic Commercial Hub',
    lng: 120.316049,
    lat: 16.617630,
    rotDeg: -13.5,
    excludeRadiusM: 64,
    zoom: 17.2,
    pitch: 58,
    bearing: -26,
    heightNote: 'Illustrative civic market complex (~12.5 m upper roof lantern; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged 13-vertex chamfered OSM footprint (93 × 109 m) & POI [120.31608, 16.617651] along Osmeña St.',
    summary: 'San Fernando’s landmark chamfered central commercial market block with shaded perimeter concrete colonnades, corrugated entrance canopies, and multi-tiered ventilated roof lanterns.',
    kind: 'oldmarket'
  },
  {
    id: 'plaza-hotel',
    name: 'Plaza Hotel',
    shortName: 'Plaza Hotel',
    category: 'Downtown Commercial Landmark',
    lng: 120.316706,
    lat: 16.615123,
    rotDeg: -9.5,
    excludeRadiusM: 18,
    zoom: 17.6,
    pitch: 60,
    bearing: -28,
    heightNote: 'Illustrative 4-story hotel model (~14.5 m cornice; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged OSM footprint (12 × 28 m) & POI [120.316713, 16.615097] along Quezon Ave across City Plaza; modeled after Wikimedia Commons photo.',
    summary: 'Four-story downtown landmark hotel featuring warm cream-sand concrete sun-ledges, rhythmic recessed dark window bays, angled pilasters, and ground-floor commercial arcades.',
    kind: 'plazahotel'
  },
  {
    id: 'sf-public-market',
    name: 'San Fernando City Public Market',
    shortName: 'Public Market',
    category: 'Civic Trade Hub',
    lng: 120.314415,
    lat: 16.617755,
    rotDeg: -11.5,
    zoom: 16.9,
    pitch: 56,
    bearing: -26,
    heightNote: 'Illustrative market roof spans (~11.5 m lantern ridge; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged OSM market block footprint (129 × 116 m) & POI [120.314434, 16.617682].',
    summary: 'Central downtown civic public market block modeled with multi-bay pitched roof spans, raised ventilation clerestory monitors, and shaded perimeter market arcades.',
    kind: 'market'
  },
  {
    id: 'sm-city-la-union',
    name: 'SM City La Union',
    shortName: 'SM City',
    category: 'Commercial Landmark',
    lng: 120.322384,
    lat: 16.625568,
    rotDeg: 0,
    zoom: 17.0,
    pitch: 58,
    bearing: 24,
    heightNote: 'OSM footprint (284 × 166 m, h=8 m) + drone-matched coastal wave fins, shell canopies, skylights, rooftop parking & cinema block (~16.8 m)',
    verification: 'Verified via packaged seam-stitched OSM footprint & POI [120.322614, 16.625701] along Diversion Rd, Brgy. Biday; exterior matched to aerial drone photo.',
    summary: 'Flagship coastal mall featuring multicolor undulating ocean-wave vertical fins, crisp white SM medallion prow, 5 turquoise shell shade canopies, cantilevered glass corner pavilion, reflection fountain, curved riverfront louvered wing, circular roof skylights, elevated rooftop parking deck, and rear butter-cream cinema multiplex.',
    kind: 'smmall'
  },
  {
    id: 'robinsons-la-union',
    name: 'Robinsons Place La Union',
    shortName: 'Robinsons',
    category: 'Commercial Landmark',
    lng: 120.319075,
    lat: 16.600128,
    rotDeg: 0,
    zoom: 17.05,
    pitch: 58,
    bearing: 32,
    heightNote: 'OSM 14-vertex L-wing footprint (147 × 128 m, h=11 m) + surf-wave canopies, pylon tower, circular skylight & Movieworld cinema (~15.8 m)',
    verification: 'Verified via packaged 14-vertex OSM footprint (147 × 128 m) & POI [120.318881, 16.600189] along MacArthur Hwy, Brgy. Sevilla; surf-wave architecture modeled after Jonathan O. Gan coastal design.',
    summary: 'Signature coastal surf-inspired regional mall mapped to its exact stepped L-wing footprint along MacArthur Highway, featuring sweeping multi-tier cobalt-and-cyan ocean wave ribbons, curved glazed highway entrance atrium, crimson-and-blue fascia crown, freestanding 21 m highway pylon tower, shaded al-fresco dining bay, circular skylight dome, elevated Movieworld cinema wing, open forecourt parking, and coastal palms.',
    kind: 'robinsons'
  },
  {
    id: 'itrmc-hospital',
    name: 'Ilocos Training & Regional Medical Center (ITRMC)',
    shortName: 'ITRMC',
    category: 'Regional Apex Medical Center',
    lng: 120.320359,
    lat: 16.588327,
    rotDeg: 0,
    zoom: 16.95,
    pitch: 58,
    bearing: -26,
    heightNote: 'Illustrative regional hospital complex (~17.2 m 5-story specialty tower + rooftop helipad; OSM 12-vertex footprint 138 × 98 m)',
    verification: 'Verified via packaged 12-vertex OSM hospital footprint (138 × 98 m) & POI [120.320359, 16.588327] along MacArthur Hwy, Brgy. Parian.',
    summary: 'DOH apex regional referral medical center in Parian featuring a 5-story white-and-teal specialty tower with crimson medical cross beacon, 3-story flanking OPD and surgical ward wings connected by covered skybridges, cantilevered ambulance porte-cochere, and rooftop medical helipad.',
    kind: 'itrmc'
  },
  {
    id: 'lorma-medical',
    name: 'Lorma Medical Center',
    shortName: 'Lorma Medical',
    category: 'Tertiary Hospital Landmark',
    lng: 120.318050,
    lat: 16.631657,
    rotDeg: 12.7,
    zoom: 17.25,
    pitch: 58,
    bearing: -28,
    heightNote: 'Illustrative 3-story hospital complex (~12.6 m emerald mansard cornice; exact 18-vertex 4,387 m² OSM hospital footprint)',
    verification: 'Verified via packaged 18-vertex OSM hospital footprint (103 × 75 m) & POI [120.318060, 16.631504] in Carlatan; exterior modeled after Wikimedia Commons photo.',
    summary: 'Premier private tertiary medical center in Carlatan mapped to its exact 4,387 m² multi-wing footprint, characterized by crisp white 3-story healthcare wings, signature deep emerald-green ribbed mansard window awnings and roof cornice, arched glazed stairwell bay, cantilevered white porte-cochere canopy with crimson medical cross, and palm-lined entry island.',
    kind: 'lorma'
  },
  {
    id: 'bethany-hospital',
    name: 'Bethany Hospital',
    shortName: 'Bethany Hospital',
    category: 'Downtown Medical Landmark',
    lng: 120.317680,
    lat: 16.614180,
    rotDeg: -22,
    zoom: 17.5,
    pitch: 58,
    bearing: -28,
    heightNote: 'Illustrative 4-story downtown hospital & cancer center wings (~14.2 m; OSM footprints 45 × 32 m & 27 × 29 m)',
    verification: 'Verified via packaged OSM hospital footprints [120.317749, 16.614390] & [120.317606, 16.613914] along Widdoes St beside Capitol Hill.',
    summary: 'Historic downtown healthcare institution linking its 4-story warm-white and coastal-teal main hospital block with the modern glazed Bethany Cancer Center wing and cantilevered emergency ambulance canopy.',
    kind: 'bethany'
  },
  {
    id: 'union-christian-college',
    name: 'Union Christian College (UCC)',
    shortName: 'UCC',
    category: 'Higher Education Campus',
    lng: 120.317380,
    lat: 16.614890,
    rotDeg: -14,
    zoom: 17.5,
    pitch: 58,
    bearing: -28,
    heightNote: 'Illustrative 4-story academic halls (~14.2 m forest-green eaves; OSM footprints 31 × 14 m & 19 × 29 m)',
    verification: 'Verified via packaged OSM campus footprints along Widdoes St [120.317548, 16.614848] & [120.317157, 16.614933]; facade modeled after Wikimedia Commons photo.',
    summary: 'Historic downtown college along Widdoes Street featuring 4-story butter-cream and ivory academic halls with crisp horizontal floor bands, rhythmic teal-tinted multi-pane classroom windows, and overhanging forest-green hipped roof eaves.',
    kind: 'ucc'
  },
  {
    id: 'thunderbird-poro',
    name: 'Thunderbird Resorts – Poro Point',
    shortName: 'Thunderbird',
    category: 'Coastal Resort Landmark',
    lng: 120.286471,
    lat: 16.609038,
    rotDeg: 18,
    zoom: 17.2,
    pitch: 58,
    bearing: -30,
    heightNote: 'Illustrative Mediterranean resort model (~15 m blue domes; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged OSM footprint (54 × 70 m) & POI [120.286378, 16.609015] on Poro Point cliff.',
    summary: 'Santorini-inspired cliffside resort complex characterized by stark whitewashed terraced wings, arched colonnades, and signature cobalt-blue domes overlooking the West Philippine Sea.',
    kind: 'thunderbird'
  },
  {
    id: 'christ-redeemer-statue',
    name: 'Christ the Redeemer Statue',
    shortName: 'Reservoir Hill',
    category: 'Monument & Viewpoint',
    lng: 120.319090,
    lat: 16.620520,
    rotDeg: 180,
    zoom: 17.5,
    pitch: 58,
    bearing: -34,
    heightNote: 'Illustrative hilltop monument model (~16.5 m with pedestal; POI has no measured OSM height)',
    verification: 'Verified via packaged OSM artwork POI [120.319090, 16.620520]; cross-checked on Reservoir Hill (16.6204°N, 120.3190°E).',
    summary: 'Hilltop monument atop Reservoir Hill facing west over downtown San Fernando and San Fernando Bay.',
    kind: 'statue'
  },
  {
    id: 'manna-mall',
    name: 'Manna Mall',
    shortName: 'Manna Mall',
    category: 'Commercial Landmark',
    lng: 120.319201,
    lat: 16.626851,
    rotDeg: 0,
    zoom: 17.0,
    pitch: 58,
    bearing: -28,
    heightNote: 'Illustrative mall model (~18 m corner rotunda dome; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged OSM footprint (79 × 94 m) & POI [120.319192, 16.626760] along MacArthur Hwy, Brgy. Pagdaraoan; modeled after Wikimedia Commons photos.',
    summary: 'Distinctive Pagdaraoan commercial mall known for its emerald-teal Puregold wings with projecting white trim bars, corrugated entrance canopy, and golden-yellow cylindrical corner rotunda topped by a ribbed dome.',
    kind: 'manna'
  },
  {
    id: 'csi-city-mall',
    name: 'CSI City Mall La Union',
    shortName: 'CSI Mall',
    category: 'Commercial Landmark',
    lng: 120.322620,
    lat: 16.629299,
    rotDeg: 0,
    zoom: 16.8,
    pitch: 58,
    bearing: -28,
    heightNote: 'OSM footprint height 8 m + illustrative royal-blue/gold entrance canopy & roof monitors (~14 m)',
    verification: 'Verified via packaged OSM footprint (96 × 140 m, h=8 m) & POI [120.322620, 16.629294] in Brgy. Biday.',
    summary: 'Major Northern Luzon retail hub featuring warm-cream masonry wings, CSI royal-blue and golden-yellow sweeping entrance fascia, central glazed portico, and multi-bay pitched supermarket halls.',
    kind: 'csi'
  },
  {
    id: 'taskus-la-union',
    name: 'TaskUs La Union',
    shortName: 'TaskUs',
    category: 'BPO & Tech Hub',
    lng: 120.317452,
    lat: 16.608144,
    rotDeg: 6.3,
    zoom: 17.5,
    pitch: 58,
    bearing: -28,
    heightNote: 'Illustrative 4-story corporate BPO hub (~14.5 m; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged OSM footprint (26 × 23 m) & POI [120.317454, 16.608178] along MacArthur Hwy, Sevilla.',
    summary: 'Contemporary glass-and-slate BPO office hub featuring reflective blue-teal curtain walls, charcoal composite frames, cantilevered glass entrance canopy, and vibrant coral-and-cobalt corporate accent fin.',
    kind: 'taskus'
  },
  {
    id: 'slc-carlatan',
    name: 'Saint Louis College (SLC)',
    shortName: 'SLC',
    category: 'Higher Education Campus',
    lng: 120.313311,
    lat: 16.636644,
    rotDeg: 10.0,
    zoom: 16.7,
    pitch: 58,
    bearing: -28,
    heightNote: 'Illustrative 3-story quadrangle campus (~12.5 m roofs; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged OSM campus footprints (87 × 70 m quadrangle, Parish Church & Gym) & POI [120.313194, 16.636953] in Carlatan; entrance gate modeled after Wikimedia Commons photo.',
    summary: 'Flagship Carlatan Catholic college campus featuring its iconic butter-cream pergola entrance gate with white concrete roof louvers, 3-story academic quadrangle with terracotta-maroon roofs, SLC Parish Church, and curved-roof covered gymnasium.',
    kind: 'slc'
  },
  {
    id: 'dmmmsu-mluc',
    name: 'DMMMSU – Mid La Union Campus',
    shortName: 'DMMMSU-MLUC',
    category: 'State University Campus',
    lng: 120.314512,
    lat: 16.613814,
    rotDeg: -9.0,
    zoom: 17.0,
    pitch: 58,
    bearing: -28,
    heightNote: 'Illustrative state university campus (~12 m academic halls; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged OSM campus footprints & POI [120.314428, 16.613940] along Quezon Ave, Catbangen; castellated gatehouse modeled after Wikimedia Commons photo.',
    summary: 'Premier state university campus marked by its terracotta-brick and cream battlemented entrance gatehouse tower, sandstone academic halls with forest-green and terracotta pitched roofs, and shaded campus court.',
    kind: 'dmmmsu'
  },
  {
    id: 'la-union-high',
    name: 'La Union National High School',
    shortName: 'La Union High',
    category: 'Heritage Secondary Campus',
    lng: 120.314857,
    lat: 16.612413,
    rotDeg: -1.9,
    zoom: 17.0,
    pitch: 58,
    bearing: -28,
    heightNote: 'Illustrative heritage Gabaldon & 3-story campus halls (~11.5 m; OSM footprint fallback 5 m estimated)',
    verification: 'Verified via packaged OSM campus footprints (68 × 11 m heritage wing, 45 × 15 m east hall & gym) & POI [120.314857, 16.612413] in Catbangen.',
    summary: 'Historic provincial public high school combining its elevated coral-stone and cream Gabaldon-style heritage pavilion with modern 3-story DepEd forest-green-and-cream classroom wings and covered campus court.',
    kind: 'lunhs'
  },
  {
    id: 'pindangan-ruins',
    name: 'Pindangan Ruins',
    shortName: 'Pindangan Ruins',
    category: 'Historic Heritage Site',
    lng: 120.314611,
    lat: 16.588231,
    rotDeg: -10,
    zoom: 17.5,
    pitch: 58,
    bearing: -24,
    heightNote: 'Illustrative heritage ruin walls (~6.8 m gable remnant; POI has no measured OSM height)',
    verification: 'Verified via packaged OSM ruins POI [120.314611, 16.588231]; cross-checked (16.5882°N, 120.3146°E, Brgy. Parian).',
    summary: '1764 Spanish Augustinian coral-stone and brick church ruins with thick structural buttresses preserved amid mature acacia trees.',
    kind: 'ruins'
  }
];

(function (global) {
  // Unified sunlit scale-model light direction in ENU world coordinates (+x East, +y North, +z Up)
  const SUN = normalize3([0.80, 0.42, 0.52]);
  const SHADOW_SLOPE_X = (SUN[0] / SUN[2]) * 0.68;
  const SHADOW_SLOPE_Y = (SUN[1] / SUN[2]) * 0.68;

  // Authentic material palette harmonized with the studio papercraft isometric aesthetic
  const PAL = {
    pureWhite: [0.98, 0.99, 1.00],
    alabaster: [0.95, 0.96, 0.98],
    warmCream: [0.94, 0.92, 0.87],
    doveGrey: [0.77, 0.81, 0.86],
    silverPanel: [0.80, 0.84, 0.89],
    silverTrim: [0.64, 0.70, 0.77],
    plinth: [0.83, 0.87, 0.91],
    darkStone: [0.34, 0.37, 0.41],
    slateRoof: [0.62, 0.70, 0.79],
    slateDark: [0.36, 0.44, 0.54],
    windowDark: [0.20, 0.28, 0.38],
    tealGlass: [0.17, 0.50, 0.52],  // Real San Fernando City Hall reflective teal glass wings
    tealGlassHi: [0.26, 0.62, 0.64],
    civicNavy: [0.14, 0.28, 0.49],  // City of San Fernando official seal blue
    bronze: [0.64, 0.51, 0.30],  // Jose Rizal bronze monument
    cathRoof: [0.57, 0.64, 0.73],  // Cathedral cool architectural roof
    brickLouver: [0.58, 0.27, 0.23],  // Cathedral bell-tower vertical brick-red louver slit
    crimsonDot: [0.76, 0.24, 0.22],  // Cathedral Sacred Heart emblem / Chinese pillars
    stainedBlue: [0.27, 0.46, 0.72],
    templeRed: [0.78, 0.36, 0.28],  // Real Ma-Cho Temple terracotta-red glazed tiles
    templeRedDk: [0.64, 0.24, 0.20],
    templeGreen: [0.20, 0.54, 0.37],  // Ma-Cho & Pagoda upturned emerald eaves trim
    templeGold: [0.86, 0.76, 0.38],  // Ma-Cho Temple golden-yellow clerestory & dragon ridge
    santoriniBl: [0.16, 0.45, 0.84],  // Real Thunderbird Resorts Santorini blue domes
    waveBlue: [0.20, 0.53, 0.82],  // Robinsons / SM coastal wave accents
    smDeepWave: [0.09, 0.34, 0.74],  // SM City deep cobalt wave fin & SM medallion
    smCyan: [0.10, 0.70, 0.88],  // SM City bright coastal cyan wave fin
    smAqua: [0.16, 0.76, 0.66],  // SM City seafoam-mint coastal wave fin
    smShellBlue: [0.08, 0.62, 0.88],  // SM City turquoise scalloped shell canopies
    smRoofChar: [0.23, 0.25, 0.29],  // SM City dark charcoal flat roof deck
    smDeckConc: [0.79, 0.80, 0.78],  // SM City elevated concrete rooftop parking deck
    smCinemaCr: [0.92, 0.83, 0.58],  // SM City tall rear butter-cream cinema multiplex
    smHvacTan: [0.78, 0.68, 0.52],  // SM City tan rooftop HVAC housings
    smHvacRed: [0.65, 0.30, 0.24],  // SM City terracotta rooftop HVAC units
    carWhite: [0.94, 0.95, 0.96],
    carSilver: [0.72, 0.76, 0.80],
    carNavy: [0.18, 0.28, 0.46],
    carRed: [0.76, 0.20, 0.22],
    carDark: [0.24, 0.27, 0.32],
    smAccent: [0.74, 0.36, 0.54],  // SM City La Union bougainvillea coastal accent
    ruinStone: [0.82, 0.78, 0.71],
    ruinDark: [0.62, 0.59, 0.53],
    plazaCoral: [0.83, 0.44, 0.41],  // Real Plaza Hotel signature coral-red horizontal floor ledges
    courtBlue: [0.34, 0.50, 0.70],  // Real San Fernando City Plaza blue basketball auditorium court
    bridgeBlue: [0.19, 0.44, 0.75],  // Real Quezon Avenue blue-and-white pedestrian overpass girder
    mannaGreen: [0.14, 0.50, 0.40],  // Real Manna Mall emerald-teal Puregold wing facade
    mannaGold: [0.89, 0.72, 0.25],  // Real Manna Mall golden-yellow cylindrical corner rotunda
    csiBlue: [0.15, 0.36, 0.72],  // CSI City Mall signature royal-blue entrance fascia
    mcCharcoal: [0.24, 0.23, 0.22],  // McDonald's modern warm charcoal-espresso parapet
    mcWood: [0.64, 0.44, 0.26],  // McDonald's warm timber-slat accent panel
    mcGold: [0.94, 0.75, 0.16],  // McDonald's / BDO / CSI golden accent
    jbRed: [0.82, 0.16, 0.19],  // Jollibee / Robinsons signature vibrant crimson-red
    taskCoral: [0.85, 0.27, 0.46],  // TaskUs modern vibrant magenta-coral accent fin
    slcCream: [0.94, 0.89, 0.72],  // Real Saint Louis College warm butter-cream pergola & halls
    slcMaroon: [0.54, 0.21, 0.23],  // SLC / BPI heritage maroon roof & accent
    dmmmsuBrick: [0.62, 0.29, 0.22],  // Real DMMMSU-MLUC terracotta-brick gatehouse
    campusGreen: [0.22, 0.47, 0.32],  // DMMMSU / LUNHS / Capitol / UCC / Landbank heritage forest green
    capitolBlush: [0.95, 0.87, 0.84],  // Real La Union Provincial Capitol recessed upper portico pale blush-ivory wall
    medCrossRed: [0.85, 0.16, 0.18],  // Crisp medical cross crimson accent (ITRMC / Lorma / Bethany / LUMDC)
    helipadYel: [0.92, 0.78, 0.22],  // Hospital helipad safety ring yellow
    bankNavy: [0.12, 0.23, 0.45],  // BDO / Metrobank / PNB dignified corporate navy
    treeLeafA: [0.44, 0.56, 0.44],
    treeLeafB: [0.50, 0.61, 0.48],
    treeLeafC: [0.39, 0.50, 0.41],
    trunk: [0.48, 0.41, 0.35]
  };

  function normalize3(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross3(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  function harmonizeScaleModelColor(color, isRoof) {
    // Restrains vibrant palette entries into a rich sunlit architectural scale-model finish
    const lum = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
    const desat = 0.24;
    let r = color[0] + (lum - color[0]) * desat;
    let g = color[1] + (lum * 0.992 - color[1]) * desat;
    let b = color[2] + (lum * 0.968 - color[2]) * desat;

    // Warm sunlit limestone paper balance so landmarks harmonize cleanly with neighboring blocks
    const paper = isRoof ? [0.942, 0.916, 0.860] : [0.922, 0.900, 0.854];
    const lift = lum < 0.38 ? 0.05 : 0.10;
    r = r + (paper[0] - r) * lift;
    g = g + (paper[1] - g) * lift;
    b = b + (paper[2] - b) * lift;
    return [r, g, b];
  }

  class MeshBuilder {
    constructor(rotDeg) {
      this.solid = [];
      this.shadow = [];
      this.edges = [];
      const rad = (rotDeg || 0) * Math.PI / 180;
      this.cosR = Math.cos(rad);
      this.sinR = Math.sin(rad);
      this.shDx = SHADOW_SLOPE_X * this.cosR + SHADOW_SLOPE_Y * this.sinR;
      this.shDy = -SHADOW_SLOPE_X * this.sinR + SHADOW_SLOPE_Y * this.cosR;
    }

    rotNormal(n) {
      return [
        n[0] * this.cosR - n[1] * this.sinR,
        n[0] * this.sinR + n[1] * this.cosR,
        n[2]
      ];
    }

    edge(a, b) {
      this.edges.push(a[0], a[1], a[2] + 0.04, b[0], b[1], b[2] + 0.04);
    }

    tri(a, b, c, color, castShadow = true) {
      const nLocal = normalize3(cross3(sub3(b, a), sub3(c, a)));
      const nWorld = this.rotNormal(nLocal);
      const isRoof = nWorld[2] > 0.45;
      const [r, g, bl] = harmonizeScaleModelColor(color, isRoof);
      this.solid.push(
        a[0], a[1], a[2], nWorld[0], nWorld[1], nWorld[2], r, g, bl,
        b[0], b[1], b[2], nWorld[0], nWorld[1], nWorld[2], r, g, bl,
        c[0], c[1], c[2], nWorld[0], nWorld[1], nWorld[2], r, g, bl
      );
      if (castShadow && (a[2] > 0.25 || b[2] > 0.25 || c[2] > 0.25)) {
        const pa = [a[0] - a[2] * this.shDx, a[1] - a[2] * this.shDy, 0.13];
        const pb = [b[0] - b[2] * this.shDx, b[1] - b[2] * this.shDy, 0.13];
        const pc = [c[0] - c[2] * this.shDx, c[1] - c[2] * this.shDy, 0.13];
        this.shadow.push(pa[0], pa[1], pa[2], pb[0], pb[1], pb[2], pc[0], pc[1], pc[2]);
      }
    }

    quad(a, b, c, d, color, castShadow = true) {
      this.tri(a, b, c, color, castShadow);
      this.tri(a, c, d, color, castShadow);
    }

    box(cx, cy, z0, sx, sy, h, wallColor, roofColor, castShadow = true) {
      const hx = sx / 2, hy = sy / 2, z1 = z0 + h;
      const rc = roofColor || wallColor;
      const p000 = [cx - hx, cy - hy, z0], p100 = [cx + hx, cy - hy, z0];
      const p110 = [cx + hx, cy + hy, z0], p010 = [cx - hx, cy + hy, z0];
      const p001 = [cx - hx, cy - hy, z1], p101 = [cx + hx, cy - hy, z1];
      const p111 = [cx + hx, cy + hy, z1], p011 = [cx - hx, cy + hy, z1];
      this.quad(p001, p101, p111, p011, rc, castShadow);
      this.quad(p000, p100, p101, p001, wallColor, castShadow);
      this.quad(p100, p110, p111, p101, wallColor, castShadow);
      this.quad(p110, p010, p011, p111, wallColor, castShadow);
      this.quad(p010, p000, p001, p011, wallColor, castShadow);
      if (sx >= 2.2 && sy >= 2.2 && h >= 0.65) {
        this.edge(p001, p101); this.edge(p101, p111); this.edge(p111, p011); this.edge(p011, p001);
        if (h >= 2.5) {
          this.edge(p000, p001); this.edge(p100, p101); this.edge(p110, p111); this.edge(p010, p011);
        }
      }
    }

    gableX(cx, cy, z0, sx, sy, h, roofColor, gableColor) {
      const hx = sx / 2, hy = sy / 2, z1 = z0 + h;
      const gc = gableColor || PAL.pureWhite;
      const sw = [cx - hx, cy - hy, z0], se = [cx + hx, cy - hy, z0];
      const ne = [cx + hx, cy + hy, z0], nw = [cx - hx, cy + hy, z0];
      const rw = [cx - hx, cy, z1], re = [cx + hx, cy, z1];
      this.quad(sw, se, re, rw, roofColor);
      this.quad(ne, nw, rw, re, roofColor);
      this.tri(nw, sw, rw, gc);
      this.tri(se, ne, re, gc);
      this.edge(rw, re);
      this.edge(sw, se); this.edge(ne, nw);
      this.edge(sw, rw); this.edge(nw, rw); this.edge(se, re); this.edge(ne, re);
    }

    gableY(cx, cy, z0, sx, sy, h, roofColor, gableColor) {
      const hx = sx / 2, hy = sy / 2, z1 = z0 + h;
      const gc = gableColor || PAL.pureWhite;
      const sw = [cx - hx, cy - hy, z0], se = [cx + hx, cy - hy, z0];
      const ne = [cx + hx, cy + hy, z0], nw = [cx - hx, cy + hy, z0];
      const rs = [cx, cy - hy, z1], rn = [cx, cy + hy, z1];
      this.quad(nw, sw, rs, rn, roofColor);
      this.quad(se, ne, rn, rs, roofColor);
      this.tri(sw, se, rs, gc);
      this.tri(ne, nw, rn, gc);
      this.edge(rs, rn);
      this.edge(nw, sw); this.edge(se, ne);
      this.edge(sw, rs); this.edge(se, rs); this.edge(nw, rn); this.edge(ne, rn);
    }

    prism(cx, cy, z0, r0, z1, r1, sides, wallColor, topColor, phase = 0, castShadow = true) {
      const bot = [], top = [];
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 + phase;
        const ca = Math.cos(a), sa = Math.sin(a);
        bot.push([cx + ca * r0, cy + sa * r0, z0]);
        top.push([cx + ca * r1, cy + sa * r1, z1]);
      }
      for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides;
        if (r1 > 0.01) {
          this.quad(bot[i], bot[j], top[j], top[i], wallColor, castShadow);
          if (r1 >= 1.5 && topColor) this.edge(top[i], top[j]);
        } else {
          this.tri(bot[i], bot[j], [cx, cy, z1], wallColor, castShadow);
        }
      }
      if (r1 > 0.01 && topColor) {
        const ctr = [cx, cy, z1];
        for (let i = 0; i < sides; i++) {
          this.tri(ctr, top[i], top[(i + 1) % sides], topColor, false);
        }
      }
    }

    rectFrustum(cx, cy, z0, sx0, sy0, z1, sx1, sy1, roofColor, topColor, castShadow = true) {
      const b0 = [cx - sx0 / 2, cy - sy0 / 2, z0], b1 = [cx + sx0 / 2, cy - sy0 / 2, z0];
      const b2 = [cx + sx0 / 2, cy + sy0 / 2, z0], b3 = [cx - sx0 / 2, cy + sy0 / 2, z0];
      const t0 = [cx - sx1 / 2, cy - sy1 / 2, z1], t1 = [cx + sx1 / 2, cy - sy1 / 2, z1];
      const t2 = [cx + sx1 / 2, cy + sy1 / 2, z1], t3 = [cx - sx1 / 2, cy + sy1 / 2, z1];
      this.quad(b0, b1, t1, t0, roofColor, castShadow);
      this.quad(b1, b2, t2, t1, roofColor, castShadow);
      this.quad(b2, b3, t3, t2, roofColor, castShadow);
      this.quad(b3, b0, t0, t3, roofColor, castShadow);
      if (sx1 > 0.05 && sy1 > 0.05) {
        this.quad(t0, t1, t2, t3, topColor || roofColor, false);
        this.edge(t0, t1); this.edge(t1, t2); this.edge(t2, t3); this.edge(t3, t0);
      }
      this.edge(b0, b1); this.edge(b1, b2); this.edge(b2, b3); this.edge(b3, b0);
      this.edge(b0, t0); this.edge(b1, t1); this.edge(b2, t2); this.edge(b3, t3);
    }

    dome(cx, cy, z0, radius, height, segs, rings, color) {
      for (let r = 0; r < rings; r++) {
        const a0 = (r / rings) * (Math.PI / 2);
        const a1 = ((r + 1) / rings) * (Math.PI / 2);
        const rad0 = Math.cos(a0) * radius, rad1 = Math.cos(a1) * radius;
        const h0 = z0 + Math.sin(a0) * height, h1 = z0 + Math.sin(a1) * height;
        this.prism(cx, cy, h0, rad0, h1, rad1, segs, color, null, 0, r < 2);
      }
    }

    // Sweeping parabolic arch ribbon along X or Y
    archSpan(cx, cy, zBase, spanX, widthY, riseZ, thickZ, segs, color) {
      for (let i = 0; i < segs; i++) {
        const t0 = -1 + (2 * i) / segs;
        const t1 = -1 + (2 * (i + 1)) / segs;
        const x0 = cx + t0 * (spanX / 2), x1 = cx + t1 * (spanX / 2);
        const z0 = zBase + riseZ * (1 - t0 * t0);
        const z1 = zBase + riseZ * (1 - t1 * t1);
        const hy = widthY / 2;
        const b0s = [x0, cy - hy, z0], b1s = [x1, cy - hy, z1];
        const b1n = [x1, cy + hy, z1], b0n = [x0, cy + hy, z0];
        const t0s = [x0, cy - hy, z0 + thickZ], t1s = [x1, cy - hy, z1 + thickZ];
        const t1n = [x1, cy + hy, z1 + thickZ], t0n = [x0, cy + hy, z0 + thickZ];
        this.quad(t0s, t1s, t1n, t0n, color, true);
        this.quad(b0s, b1s, t1s, t0s, PAL.doveGrey, false);
        this.quad(b1n, b0n, t0n, t1n, PAL.doveGrey, false);
      }
    }
  }

  function addScaleTree(m, cx, cy, scale = 1.0, leafCol = PAL.treeLeafA) {
    const rT = 0.26 * scale;
    const hT = 2.0 * scale;
    const rC = 2.05 * scale;
    m.prism(cx, cy, 0, rT, hT, rT * 0.78, 6, PAL.trunk, null, 0, true);
    m.prism(cx, cy, hT - 0.15 * scale, rC * 0.86, hT + 1.15 * scale, rC, 8, leafCol, null, Math.PI / 8, true);
    m.prism(cx, cy, hT + 1.15 * scale, rC, hT + 2.35 * scale, rC * 0.45, 8, leafCol, leafCol, Math.PI / 8, false);
  }

  /* =========================================================================
   * 1. SAN FERNANDO CITY HALL — Modeled directly from Wikimedia Commons Jan 2024 photo
   *    Exact 46.2 × 34.8 m footprint facing South (-y) onto Lion's Park & City Plaza
   * ========================================================================= */
  function buildCityHall(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Clean stone podium & white planter terrace enveloping the 46.2 × 34.8 m OSM base
    m.box(0, 0, 0, 47.0, 35.2, 1.1, PAL.plinth, PAL.alabaster);

    // Main 2-story crisp chalk-white civic structure
    m.box(0, 1.4, 1.1, 46.0, 31.4, 9.6, PAL.pureWhite, PAL.alabaster);

    // WIDE REFLECTIVE TEAL-GREEN CURTAIN GLASS WINGS (exact Jan 2024 photo: stretching wide across both wings!)
    for (const side of [-1, 1]) {
      const wx = side * 15.8;
      m.box(wx, -14.34, 1.85, 11.8, 0.36, 7.1, PAL.tealGlass, PAL.tealGlass, false);
      // 4 signature horizontal light aluminum transom bars seen clearly in Jan 2024 photo
      for (const tz of [3.55, 5.25, 6.95, 8.75]) {
        m.box(wx, -14.44, tz, 12.0, 0.24, 0.26, PAL.alabaster, PAL.pureWhite, false);
      }
      // Slender vertical mullion grid dividing each wide teal-green glass wing
      for (const ox of [-4.2, -1.4, 1.4, 4.2]) {
        m.box(wx + ox, -14.42, 1.85, 0.24, 0.22, 7.1, PAL.silverTrim, PAL.alabaster, false);
      }
      // Matching reflective teal-green upper glazed bays on east & west side elevations
      m.box(side * 23.06, 2.0, 5.2, 0.34, 21.0, 4.0, PAL.tealGlass, PAL.tealGlass, false);
      for (const oy of [-7.0, -2.3, 2.3, 7.0]) {
        m.box(side * 23.14, 2.0 + oy, 5.2, 0.26, 0.34, 4.0, PAL.pureWhite, PAL.alabaster, false);
      }
    }

    // PROTRUDING SILVER ALUMINUM-CLAD (ACP) CENTRAL CIVIC PORTAL FRAME (exact Jan 2024 photo!)
    // Flanking paneled silver composite square piers (with subtle panel joint bands)
    m.box(-8.5, -15.4, 1.1, 2.3, 3.3, 9.5, PAL.silverPanel, PAL.silverTrim);
    m.box(8.5, -15.4, 1.1, 2.3, 3.3, 9.5, PAL.silverPanel, PAL.silverTrim);
    // Deep metallic silver composite top portal fascia beam
    m.box(0, -15.5, 8.75, 19.6, 3.7, 2.0, PAL.silverPanel, PAL.doveGrey);
    for (const px of [-6.0, -2.0, 2.0, 6.0]) {
      m.box(px, -17.36, 8.75, 0.14, 0.10, 2.0, PAL.silverTrim, PAL.silverTrim, false);
    }

    // INSIDE THE SILVER PORTAL:
    // Lower white entrance wall with recessed wide glazed lobby doors ("CITY HALL · CITY OF SAN FERNANDO")
    m.box(0, -15.15, 1.1, 14.8, 1.4, 4.1, PAL.pureWhite, PAL.alabaster, false);
    m.box(0, -15.88, 1.1, 10.6, 0.35, 2.75, PAL.windowDark, PAL.windowDark, false);
    // Deep shaded 2nd-floor recessed balcony loggia behind the white balustrade
    m.box(0, -14.32, 5.2, 14.6, 0.6, 3.6, PAL.windowDark, PAL.windowDark, false);
    // Classic white baluster balcony parapet along 2nd floor
    m.box(0, -15.6, 5.2, 14.6, 0.42, 0.28, PAL.pureWhite, PAL.pureWhite, false);
    m.box(0, -15.6, 6.18, 14.6, 0.42, 0.24, PAL.pureWhite, PAL.pureWhite, false);
    for (let bx = -6.0; bx <= 6.0; bx += 1.2) {
      m.box(bx, -15.6, 5.45, 0.24, 0.26, 0.74, PAL.pureWhite, PAL.pureWhite, false);
    }
    // Iconic circular City of San Fernando seal mounted CENTERED ON THE WHITE BALCONY PARAPET (exact Jan 2024 photo!)
    m.box(0, -15.96, 4.65, 1.85, 0.24, 1.85, PAL.civicNavy, PAL.civicNavy, false);
    m.box(0, -16.06, 4.92, 1.28, 0.16, 1.28, PAL.pureWhite, PAL.pureWhite, false);
    m.box(0, -16.12, 5.18, 0.76, 0.12, 0.76, PAL.crimsonDot, PAL.templeGold, false);

    // WIDE OVERHANGING PURE-WHITE ROOF CORNICE EAVES WITH DUAL FASCIA GROOVES (exact Jan 2024 photo!)
    m.box(0, 1.2, 10.52, 46.8, 32.8, 0.30, PAL.doveGrey, PAL.doveGrey, false);
    m.box(0, 1.2, 10.82, 48.6, 34.8, 0.65, PAL.pureWhite, PAL.alabaster);
    m.box(0, 1.2, 11.47, 48.2, 34.4, 0.22, PAL.doveGrey, PAL.doveGrey, false);
    m.box(0, 1.2, 11.69, 49.0, 35.2, 0.65, PAL.pureWhite, PAL.doveGrey);
    // Low restrained stepped slate-silver civic rooftop crown behind the crisp horizontal cornice
    m.rectFrustum(0, 1.8, 12.34, 44.0, 28.6, 13.75, 34.0, 19.0, PAL.slateRoof, PAL.doveGrey);
    m.box(0, 1.8, 13.75, 16.4, 8.8, 0.95, PAL.alabaster, PAL.slateDark, false);

    // SOUTH FORECOURT (exact Jan 2024 photo): dark-stone Rizal monument pedestal, bronze Rizal statue, granite benches, 5 silver flagpoles & flanking planters
    m.box(0, -19.8, 0, 6.4, 4.0, 0.26, PAL.plinth, PAL.doveGrey, false);
    m.box(0, -19.8, 0.26, 5.2, 3.0, 0.48, PAL.darkStone, PAL.plinth, false);
    m.box(0, -19.8, 0.74, 2.2, 1.6, 1.65, PAL.darkStone, PAL.alabaster, false);
    m.prism(0, -19.8, 2.39, 0.34, 4.15, 0.22, 6, PAL.bronze, PAL.bronze, 0, false);
    // Flanking white forecourt planter beds with green shrubs & low stone seating curbs
    for (const side of [-1, 1]) {
      m.box(side * 6.4, -19.4, 0, 5.4, 2.5, 0.95, PAL.pureWhite, PAL.treeLeafA, false);
      m.box(side * 12.2, -19.6, 0, 3.6, 0.9, 0.55, PAL.alabaster, PAL.pureWhite, false);
    }
    // 5 tall silver flagpoles (taller center pole + 2 flanking pairs with crisp civic flags on outer poles)
    m.prism(0, -18.2, 0, 0.11, 9.2, 0.08, 6, PAL.silverPanel, null, 0, false);
    for (const fx of [-4.6, -2.3, 2.3, 4.6]) {
      m.prism(fx, -18.2, 0, 0.08, 7.4, 0.06, 5, PAL.silverPanel, null, 0, false);
    }
    m.box(-4.6, -18.4, 5.8, 0.12, 0.85, 1.25, PAL.pureWhite, PAL.crimsonDot, false);
    m.box(4.6, -18.4, 5.8, 0.12, 0.85, 1.25, PAL.pureWhite, PAL.civicNavy, false);
    // Restrained Lion's Park forecourt scale trees framing City Hall's south corners
    addScaleTree(m, -20.5, -20.0, 0.92, PAL.treeLeafA);
    addScaleTree(m, 20.5, -20.0, 0.92, PAL.treeLeafB);

    return m;
  }

  /* =========================================================================
   * 2. SAINT WILLIAM THE HERMIT CATHEDRAL — Modeled directly from Wikimedia Commons photo
   *    Exact 82.9 × 22.1 m footprint facing West (-x) across Gomez St toward City Plaza
   * ========================================================================= */
  function buildCathedral(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Stepped stone foundation enveloping 82.8 × 22.8 m OSM footprint
    m.box(0, 0, 0, 82.8, 22.8, 1.0, PAL.plinth, PAL.alabaster);

    // Main nave body (crisp white plaster with rhythmic structural side buttresses)
    m.box(3.0, 0, 1.0, 72.0, 21.2, 10.8, PAL.pureWhite, PAL.alabaster);
    for (let bx = -22; bx <= 28; bx += 10.0) {
      m.box(bx, -10.95, 1.0, 1.45, 0.95, 10.4, PAL.alabaster, PAL.doveGrey, false);
      m.box(bx, 10.95, 1.0, 1.45, 0.95, 10.4, PAL.alabaster, PAL.doveGrey, false);
    }
    // Authentic pitched gable nave roof
    m.gableX(3.0, 0, 11.8, 73.2, 22.2, 5.0, PAL.cathRoof, PAL.pureWhite);
    m.box(3.0, 0, 16.6, 72.5, 0.9, 0.55, PAL.slateDark, PAL.cathRoof, false);

    // AUTHENTIC 4-TIER CHALK-WHITE & DOVE-GREY BAROQUE-NEOCLASSICAL WEST FACADE (cathedral.jpg!)
    // Tier 1: Wide chalk-white lower facade framed by 4 pairs of dove-grey Tuscan columns
    m.box(-35.6, 0, 1.0, 5.8, 22.4, 6.2, PAL.pureWhite, PAL.alabaster);
    for (const py of [-9.4, -8.2, -4.7, -3.5, 3.5, 4.7, 8.2, 9.4]) {
      m.box(-38.6, py, 1.0, 0.58, 0.62, 6.1, PAL.doveGrey, PAL.pureWhite, false);
    }
    // Horizontal molded dove-grey cornice between Tier 1 & Tier 2
    m.box(-38.6, 0, 7.1, 1.35, 23.4, 0.68, PAL.doveGrey, PAL.pureWhite, false);
    // Semicircular arched white entrance portal with dark interior doorway (cathedral.jpg!)
    m.box(-40.2, 0, 1.0, 3.6, 7.2, 5.0, PAL.pureWhite, PAL.alabaster);
    m.box(-42.05, 0, 1.0, 0.6, 4.6, 4.1, PAL.windowDark, PAL.windowDark, false);
    m.box(-42.0, 0, 5.1, 0.9, 5.6, 0.75, PAL.doveGrey, PAL.pureWhite, false);

    // Tier 2: Upper facade with paired dove-grey Tuscan columns, central blue rose window & twin pointed stained-glass windows!
    m.box(-35.8, 0, 7.78, 5.2, 21.0, 5.3, PAL.pureWhite, PAL.alabaster);
    for (const py of [-9.2, -8.1, -4.6, -3.5, 3.5, 4.6, 8.1, 9.2]) {
      m.box(-38.5, py, 7.78, 0.54, 0.58, 5.2, PAL.doveGrey, PAL.pureWhite, false);
    }
    // Central dark-blue circular stained-glass rose window medallion + twin flanking pointed stained-glass windows (cathedral.jpg!)
    m.box(-38.55, 0, 9.1, 0.35, 2.55, 2.55, PAL.doveGrey, PAL.doveGrey, false);
    m.box(-38.72, 0, 9.42, 0.22, 1.92, 1.92, PAL.stainedBlue, PAL.stainedBlue, false);
    m.box(-38.80, 0, 9.85, 0.14, 1.15, 1.15, PAL.templeGold, PAL.stainedBlue, false);
    m.box(-38.84, 0, 10.12, 0.10, 0.58, 0.58, PAL.crimsonDot, PAL.templeGold, false);
    for (const wy of [-6.35, 6.35]) {
      m.box(-38.55, wy, 8.75, 0.32, 1.95, 2.85, PAL.doveGrey, PAL.doveGrey, false);
      m.box(-38.70, wy, 9.0, 0.18, 1.35, 2.25, PAL.stainedBlue, PAL.stainedBlue, false);
    }
    m.box(-38.5, 0, 13.0, 1.25, 21.8, 0.68, PAL.doveGrey, PAL.pureWhite, false);

    // Tier 3: Scrolled central Baroque pediment with curved dove-grey volute flanks & central IHS medallion
    m.box(-36.2, 0, 13.68, 4.2, 11.4, 3.7, PAL.pureWhite, PAL.alabaster);
    for (const side of [-1, 1]) {
      m.box(-36.2, side * 6.9, 13.68, 3.4, 2.8, 2.3, PAL.doveGrey, PAL.pureWhite, false);
      m.box(-36.2, side * 9.0, 13.68, 2.8, 1.8, 1.1, PAL.doveGrey, PAL.pureWhite, false);
      m.box(-38.4, side * 4.5, 13.68, 0.50, 0.58, 3.65, PAL.doveGrey, PAL.pureWhite, false);
    }
    m.box(-38.42, 0, 14.55, 0.35, 2.45, 2.35, PAL.doveGrey, PAL.doveGrey, false);
    m.box(-38.4, 0, 17.35, 1.05, 12.0, 0.62, PAL.doveGrey, PAL.pureWhite, false);

    // Tier 4: Classical white belfry crown niche with flanking obelisk pinnacles & cross finial
    m.box(-36.6, 0, 17.97, 3.2, 5.2, 3.0, PAL.pureWhite, PAL.alabaster);
    m.box(-38.3, 0, 18.6, 0.3, 1.85, 1.85, PAL.windowDark, PAL.windowDark, false);
    for (const oy of [-3.4, 3.4]) {
      m.prism(-37.8, oy, 17.97, 0.25, 19.6, 0.08, 4, PAL.doveGrey, null, 0, false);
    }
    m.box(-36.8, 0, 20.97, 0.52, 0.52, 2.6, PAL.doveGrey, PAL.bronze, false);
    m.box(-36.8, 0, 22.35, 0.52, 1.9, 0.46, PAL.doveGrey, PAL.bronze, false);

    // AUTHENTIC RIGHT-SIDE CHALK-WHITE & DOVE-GREY SQUARE BELL TOWER (SW corner: cathedral.jpg & plaza_court.jpg!)
    m.box(-35.8, -12.6, 0, 7.6, 7.6, 15.8, PAL.pureWhite, PAL.alabaster);
    // Horizontal dove-grey tower cornice bands (faithful to cathedral.jpg — white & grey, no red slit!)
    m.box(-35.8, -12.6, 7.1, 8.1, 8.1, 0.62, PAL.doveGrey, PAL.pureWhite, false);
    m.box(-35.8, -12.6, 13.0, 8.1, 8.1, 0.62, PAL.doveGrey, PAL.pureWhite, false);
    m.box(-35.8, -12.6, 15.8, 8.5, 8.5, 0.9, PAL.doveGrey, PAL.pureWhite);
    for (const sx of [-3.6, 3.6]) for (const sy of [-3.6, 3.6]) {
      m.box(-35.8 + sx, -12.6 + sy, 16.7, 0.88, 0.88, 1.05, PAL.pureWhite, PAL.doveGrey, false);
    }
    // Open arched belfry story with dark interior bell cavity
    m.box(-35.8, -12.6, 16.7, 6.2, 6.2, 4.8, PAL.pureWhite, PAL.alabaster);
    m.box(-35.8, -12.6, 17.5, 6.6, 2.6, 3.1, PAL.windowDark, PAL.windowDark, false);
    m.box(-35.8, -12.6, 17.5, 2.6, 6.6, 3.1, PAL.windowDark, PAL.windowDark, false);
    // Belfry cornice & signature small square arched lantern cupola (plaza_court.jpg!)
    m.box(-35.8, -12.6, 21.5, 6.9, 6.9, 0.85, PAL.doveGrey, PAL.pureWhite);
    m.box(-35.8, -12.6, 22.35, 3.5, 3.5, 2.3, PAL.pureWhite, PAL.alabaster);
    m.box(-35.8, -12.6, 22.8, 3.7, 1.35, 1.35, PAL.windowDark, PAL.windowDark, false);
    m.box(-35.8, -12.6, 22.8, 1.35, 3.7, 1.35, PAL.windowDark, PAL.windowDark, false);
    m.box(-35.8, -12.6, 24.65, 3.9, 3.9, 0.65, PAL.doveGrey, PAL.pureWhite);
    return m;
  }

  /* =========================================================================
   * 3. SAN FERNANDO CITY PLAZA — REAL 1955 OPEN IONIC PAVILION + BLUE AUDITORIUM COURT + WHITE ARCH PORTAL
   *    Modeled directly from Jan 2024 & 2018 Wikimedia Commons photos (plaza.jpg, plaza_court.jpg, quezon_2023.jpg)
   * ========================================================================= */
  function buildCityPlaza(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // 1. REAL 1955 OPEN-SIDED WHITE IONIC TOWN PLAZA PAVILION (exact 10.5 × 20.2 m OSM footprint facing Quezon Ave!)
    // Raised white concrete terrace podium with signature red-and-blue garden curb border
    m.box(0, 0, 0, 12.0, 22.4, 0.32, PAL.crimsonDot, PAL.courtBlue, false);
    m.box(0, 0, 0.32, 11.4, 21.4, 1.48, PAL.pureWhite, PAL.alabaster);
    // Low textured parapet wall along Quezon Ave west edge & plaza east edge
    m.box(-5.3, 0, 1.8, 0.42, 16.4, 1.05, PAL.alabaster, PAL.doveGrey, false);
    m.box(5.3, 0, 1.8, 0.42, 16.4, 1.05, PAL.alabaster, PAL.doveGrey, false);
    // Wide crisp white classical corner portal piers (open side-arch openings N & S + open Ionic colonnades W & E!)
    for (const sy of [-9.4, 9.4]) {
      m.box(-4.6, sy, 1.8, 1.85, 2.35, 5.5, PAL.pureWhite, PAL.alabaster);
      m.box(4.6, sy, 1.8, 1.85, 2.35, 5.5, PAL.pureWhite, PAL.alabaster);
    }
    // TRUE OPEN-THROUGH 1955 WHITE IONIC COLONNADE: 4 fluted Ionic columns on West front AND 4 on East side!
    for (const cy of [-5.25, -1.75, 1.75, 5.25]) {
      for (const cx of [-4.7, 4.7]) {
        m.prism(cx, cy, 1.8, 0.46, 7.2, 0.40, 8, PAL.pureWhite, null, 0, true);
        m.box(cx, cy, 6.95, 1.12, 1.12, 0.38, PAL.doveGrey, PAL.pureWhite, false);
      }
    }
    // Warm cream underside ceiling & iconic tall crisp white "1955 TOWN PLAZA" classical entablature frieze
    m.box(0, 0, 7.25, 10.4, 20.2, 0.35, PAL.warmCream, PAL.warmCream, false);
    m.box(0, 0, 7.6, 11.4, 21.6, 1.65, PAL.pureWhite, PAL.alabaster);
    m.box(0, 0, 9.25, 11.8, 22.0, 0.32, PAL.doveGrey, PAL.pureWhite, false);

    // 2. REAL BLUE OPEN-AIR BASKETBALL / CIVIC AUDITORIUM COURT & STEPPED WHITE BLEACHERS (plaza_court.jpg!)
    // Muted slate-blue court floor with white sidelines & City of San Fernando center circle
    m.box(25.5, 1.0, 0.04, 25.0, 16.5, 0.16, PAL.doveGrey, PAL.courtBlue, false);
    m.box(25.5, 1.0, 0.21, 0.32, 15.8, 0.04, PAL.pureWhite, PAL.pureWhite, false);
    m.prism(25.5, 1.0, 0.21, 3.1, 0.26, 3.1, 16, PAL.pureWhite, PAL.pureWhite, 0, false);
    m.prism(25.5, 1.0, 0.26, 2.4, 0.30, 2.4, 16, PAL.courtBlue, PAL.courtBlue, 0, false);
    // Stepped white concrete bleacher rows along North & South sides of the court
    for (const side of [-1, 1]) {
      for (let t = 0; t < 4; t++) {
        m.box(25.5, 1.0 + side * (9.1 + t * 0.95), 0.08, 23.0, 0.92, 0.45 + t * 0.42, PAL.pureWhite, PAL.alabaster, false);
      }
    }

    // 3. ICONIC WHITE SEMI-CIRCULAR ARCHED EAST ENTRANCE PORTAL (plaza_court.jpg — aligned with St. William Cathedral!)
    const ax = 41.5, ay = 1.0;
    // Left & right white archway piers flanking the wide open semicircular passage
    m.box(ax, ay - 5.2, 0, 2.8, 3.6, 5.4, PAL.pureWhite, PAL.alabaster);
    m.box(ax, ay + 5.2, 0, 2.8, 3.6, 5.4, PAL.pureWhite, PAL.alabaster);
    // Stepped arched upper spandrel spanning smoothly across the semicircular opening (y = -3.4..+3.4)
    const archSegs = 8;
    for (let i = 0; i < archSegs; i++) {
      const a0 = (i / archSegs) * Math.PI, a1 = ((i + 1) / archSegs) * Math.PI;
      const y0 = ay + Math.cos(a0) * 3.4, y1 = ay + Math.cos(a1) * 3.4;
      const zBot = 2.0 + Math.sin((a0 + a1) * 0.5) * 2.55;
      const wSeg = Math.abs(y0 - y1) + 0.14;
      const yMid = (y0 + y1) * 0.5;
      m.box(ax, yMid, zBot, 2.8, wSeg, Math.max(0.55, 5.4 - zBot), PAL.pureWhite, PAL.alabaster, false);
    }
    // Molded classical portal cornice cap & circular City Seal above the keystone
    m.box(ax, ay, 5.4, 3.3, 14.4, 0.65, PAL.pureWhite, PAL.doveGrey);
    m.box(ax - 1.48, ay, 4.45, 0.22, 1.05, 1.05, PAL.civicNavy, PAL.templeGold, false);
    m.box(ax + 1.48, ay, 4.45, 0.22, 1.05, 1.05, PAL.civicNavy, PAL.templeGold, false);

    // 4. Restrained architectural scale-model trees strictly inside the verified City Plaza lawn borders
    const plazaTrees = [
      [35.5, 16.5, 1.02, PAL.treeLeafA], [16.0, 17.5, 0.96, PAL.treeLeafB],
      [3.5, 18.5, 0.90, PAL.treeLeafA], [-5.0, 17.0, 0.94, PAL.treeLeafC],
      [35.5, -14.5, 1.00, PAL.treeLeafC], [16.5, -16.0, 0.92, PAL.treeLeafA],
      [-4.5, -17.5, 0.90, PAL.treeLeafB]
    ];
    for (const [tx, ty, ts, tc] of plazaTrees) addScaleTree(m, tx, ty, ts, tc);
    return m;
  }

  /* =========================================================================
   * 4. MA-CHO TEMPLE — Modeled directly from Wikimedia Commons photo
   *    Exact 34 × 25 m cruciform hilltop footprint facing WSW toward the sea
   * ========================================================================= */
  function buildMaChoTemple(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Hilltop white stone courtyard podium enveloping 34.6 × 25.6 m footprint
    m.box(0, 0, 0, 35.0, 26.0, 1.4, PAL.plinth, PAL.pureWhite);
    // Lower covered sanctuary vestibule with dark crimson doors
    m.box(2.0, 0, 1.4, 24.0, 19.0, 4.0, PAL.alabaster, PAL.pureWhite);
    m.box(-10.1, 0, 1.4, 0.5, 11.0, 3.4, PAL.templeRedDk, PAL.templeRedDk, false);
    // SIGNATURE WIDE TERRACOTTA-RED TILED LOWER ENTRANCE AWNING ROOF
    m.rectFrustum(-11.2, 0, 4.6, 5.2, 16.0, 5.9, 1.6, 14.6, PAL.templeRed, PAL.templeRed);

    // SIGNATURE TWIN SYMMETRICAL WHITE GRAND STAIRCASES climbing left & right to upper terrace!
    for (const side of [-1, 1]) {
      for (let s = 0; s < 5; s++) {
        m.box(-15.5 + s * 1.15, side * 9.8, 0.2 + s * 0.9, 1.4, 3.6, 0.95, PAL.pureWhite, PAL.doveGrey);
      }
      // White stair parapet balustrades
      m.box(-13.0, side * 11.7, 0.6, 6.2, 0.45, 3.8, PAL.pureWhite, PAL.pureWhite, false);
    }
    // Upper terrace balcony deck with white railings & red-and-gold lattice panels
    m.box(-9.2, 0, 5.4, 3.4, 18.6, 1.2, PAL.pureWhite, PAL.pureWhite);
    for (const py of [-6.0, -2.0, 2.0, 6.0]) {
      m.box(-10.95, py, 5.65, 0.22, 2.6, 0.9, PAL.templeGold, PAL.templeRed, false);
      m.box(-11.05, py, 5.8, 0.14, 1.0, 0.65, PAL.crimsonDot, PAL.crimsonDot, false);
    }

    // Main Sanctuary Hall with crimson pillars & broad sweeping terracotta-red tiled roof
    m.box(2.5, 0, 5.4, 22.0, 17.6, 4.6, PAL.alabaster, PAL.pureWhite);
    for (const cy of [-6.8, -3.4, 3.4, 6.8]) {
      m.prism(-8.6, cy, 5.4, 0.52, 10.0, 0.48, 8, PAL.crimsonDot, null, 0, false);
    }
    // Tier 1 sweeping terracotta-red roof + vibrant emerald-green corner ridge trim
    m.rectFrustum(2.5, 0, 9.8, 28.0, 23.0, 12.6, 17.6, 13.0, PAL.templeRed, PAL.templeRed);
    m.box(2.5, -11.5, 9.75, 28.4, 0.55, 0.5, PAL.templeGreen, PAL.templeGreen, false);
    m.box(2.5, 11.5, 9.75, 28.4, 0.55, 0.5, PAL.templeGreen, PAL.templeGreen, false);

    // SIGNATURE GOLDEN-YELLOW UPPER CLERESTORY SANCTUARY DRUM
    m.box(2.5, 0, 12.6, 15.6, 11.2, 4.2, PAL.templeGold, PAL.alabaster);
    for (let cy = -4.2; cy <= 4.2; cy += 2.8) {
      m.box(-5.35, cy, 12.6, 0.35, 0.45, 4.2, PAL.pureWhite, PAL.pureWhite, false);
    }
    // Red Chinese timber bracket frieze beneath upper roof
    m.box(2.5, 0, 16.5, 16.4, 12.0, 0.9, PAL.crimsonDot, PAL.crimsonDot, false);

    // Tier 2 crowning sweeping terracotta-red gable roof with green upturned eaves & gold dragons
    m.rectFrustum(2.5, 0, 17.2, 20.6, 16.2, 19.6, 12.6, 8.8, PAL.templeRed, PAL.templeRed);
    m.box(2.5, -8.1, 17.15, 21.0, 0.5, 0.45, PAL.templeGreen, PAL.templeGreen, false);
    m.box(2.5, 8.1, 17.15, 21.0, 0.5, 0.45, PAL.templeGreen, PAL.templeGreen, false);
    m.gableX(2.5, 0, 19.6, 13.8, 9.6, 2.8, PAL.templeRed, PAL.templeGold);
    m.box(2.5, 0, 22.3, 14.0, 0.85, 0.85, PAL.templeGold, PAL.templeGold, false);

    // ICONIC FLANKING BELL & DRUM TOWERS (Open white base, red brick mid-story, double red/green roofs!)
    for (const side of [-1, 1]) {
      const ty = side * 12.8;
      // Open white columned square base
      for (const ox of [-2.2, 2.2]) for (const oy of [-2.2, 2.2]) {
        m.box(-7.5 + ox, ty + oy, 1.4, 0.9, 0.9, 5.0, PAL.pureWhite, PAL.alabaster);
      }
      m.box(-7.5, ty, 6.2, 5.8, 5.8, 0.7, PAL.pureWhite, PAL.alabaster);
      // Lower flared red roof
      m.rectFrustum(-7.5, ty, 6.8, 8.2, 8.2, 8.4, 5.0, 5.0, PAL.templeRed, PAL.templeRed);
      m.box(-7.5, ty, 6.8, 8.4, 0.4, 0.35, PAL.templeGreen, PAL.templeGreen, false);
      // Recessed brick-red belfry/drum chamber
      m.box(-7.5, ty, 8.4, 4.4, 4.4, 2.6, PAL.templeRedDk, PAL.pureWhite);
      // Upper swept pagoda roof & gold finial
      m.rectFrustum(-7.5, ty, 10.9, 7.4, 7.4, 13.4, 0.8, 0.8, PAL.templeRed, PAL.templeGold);
      m.prism(-7.5, ty, 13.4, 0.35, 14.8, 0.08, 6, PAL.templeGold, null, 0, false);
    }
    // ICONIC FRONT TAOIST PAIFANG ENTRANCE ARCHWAY (macho.jpg!)
    m.box(-22.5, -5.0, 0, 1.35, 1.35, 9.6, PAL.plinth, PAL.pureWhite);
    m.box(-22.5, 5.0, 0, 1.35, 1.35, 9.6, PAL.plinth, PAL.pureWhite);
    m.box(-22.5, 0, 7.6, 1.25, 11.4, 1.45, PAL.templeGreen, PAL.templeGold, false);
    m.box(-22.5, 0, 8.2, 1.5, 2.2, 1.25, PAL.templeGold, PAL.templeGold, false);
    m.rectFrustum(-22.5, 0, 9.0, 3.8, 13.2, 10.8, 1.8, 11.0, PAL.templeRed, PAL.templeGreen);
    return m;
  }

  /* =========================================================================
   * 5. FILIPINO-CHINESE FRIENDSHIP PAGODA — Verified Pagoda Hill POI
   * ========================================================================= */
  function buildPagoda(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    const p = Math.PI / 8;
    // Octagonal hillside viewing terrace with white balustrade & red base curb
    m.prism(0, 0, 0, 8.4, 1.2, 8.0, 8, PAL.templeRedDk, PAL.alabaster, p);
    m.prism(0, 0, 1.2, 8.0, 2.1, 7.9, 8, PAL.pureWhite, PAL.alabaster, p);
    // Level 1: Crimson pillars + white octagonal pavilion wall + green/red upturned eaves
    m.prism(0, 0, 2.1, 5.2, 6.6, 5.0, 8, PAL.pureWhite, PAL.alabaster, p);
    m.prism(0, 0, 2.4, 5.35, 5.8, 5.2, 8, PAL.crimsonDot, null, p, false);
    m.prism(0, 0, 6.4, 8.0, 8.3, 4.3, 8, PAL.templeGreen, PAL.templeGreen, p);
    m.prism(0, 0, 6.25, 8.15, 6.65, 7.9, 8, PAL.templeRed, null, p, false);
    // Level 2: Octagonal gallery + sweeping green/red roof
    m.prism(0, 0, 8.3, 3.9, 12.0, 3.7, 8, PAL.pureWhite, PAL.alabaster, p);
    m.prism(0, 0, 8.6, 4.05, 11.2, 3.9, 8, PAL.crimsonDot, null, p, false);
    m.prism(0, 0, 11.8, 6.4, 13.6, 3.2, 8, PAL.templeGreen, PAL.templeGreen, p);
    m.prism(0, 0, 11.65, 6.55, 12.0, 6.3, 8, PAL.templeRed, null, p, false);
    // Level 3: Upper crown pavilion + steeply swept pagoda roof + gold finial spire
    m.prism(0, 0, 13.6, 2.7, 16.4, 2.5, 8, PAL.pureWhite, PAL.alabaster, p);
    m.prism(0, 0, 16.2, 4.9, 18.7, 0.35, 8, PAL.templeGreen, null, p);
    m.prism(0, 0, 18.6, 0.35, 20.8, 0.08, 6, PAL.templeGold, null, 0, false);
    // Restrained hilltop grove trees framing Pagoda Hill park
    const hillTrees = [
      [-12.5, 6.0, 1.05, PAL.treeLeafA], [-11.0, -7.5, 0.95, PAL.treeLeafC],
      [11.5, 8.0, 0.98, PAL.treeLeafB], [12.5, -5.5, 0.90, PAL.treeLeafA],
      [2.0, -13.5, 0.95, PAL.treeLeafB]
    ];
    for (const [tx, ty, ts, tc] of hillTrees) addScaleTree(m, tx, ty, ts, tc);
    return m;
  }

  /* =========================================================================
   * 6. SAN FERNANDO CITY PUBLIC MARKET — Multi-bay arcaded civic market hall
   * ========================================================================= */
  function buildMarket(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Perimeter shaded arcade wall wrapping the exact real footprint
    m.box(4, 2, 0, 66.5, 64.5, 5.8, PAL.alabaster, PAL.doveGrey);
    // Four pitched corrugated-slate market roof bays with vented clerestory lanterns
    for (let i = -1.5; i <= 1.5; i += 1) {
      const cy = 2 + i * 15.2;
      m.gableX(4, cy, 5.8, 65, 14.0, 4.2, PAL.slateRoof, PAL.pureWhite);
      m.box(4, cy, 9.6, 59, 3.0, 1.4, PAL.windowDark, PAL.pureWhite, false);
      m.box(4, cy, 11.0, 60, 3.6, 0.45, PAL.pureWhite, PAL.slateRoof, false);
    }
    // Western annex market wing
    m.box(-34, -14, 0, 35, 45, 5.8, PAL.alabaster, PAL.doveGrey);
    for (let i = -1; i <= 1; i += 1) {
      const cy = -14 + i * 14.0;
      m.gableX(-34, cy, 5.8, 33.5, 12.8, 3.4, PAL.slateRoof, PAL.pureWhite);
    }
    // Real Public Market entrance canopy supported by classical columns & blue-white header band (public_market.jpg!)
    m.box(37.8, 2, 3.8, 4.6, 14.0, 1.6, PAL.silverPanel, PAL.slateRoof);
    m.box(37.4, 2, 5.4, 1.2, 28.0, 1.3, PAL.civicNavy, PAL.pureWhite, false);
    for (const cy of [-3.5, 0, 3.5]) {
      m.prism(39.4, 2 + cy, 0, 0.42, 3.8, 0.38, 8, PAL.alabaster, null, 0, false);
    }
    return m;
  }

  /* =========================================================================
   * 6B. SAN FERNANDO CITY OLD PUBLIC MARKET — Exact 93 × 109 m chamfered block along Osmeña St
   * ========================================================================= */
  function buildOldPublicMarket(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Chamfered perimeter concrete market deck enveloping the 13-vertex footprint
    m.box(0, 0, 0, 74.0, 90.0, 5.4, PAL.alabaster, PAL.doveGrey);
    // Shaded perimeter ground-floor commercial colonnade recess along market facades
    m.box(0, -45.05, 0.3, 62.0, 0.35, 3.6, PAL.slateDark, PAL.slateDark, false);
    m.box(0, 45.05, 0.3, 62.0, 0.35, 3.6, PAL.slateDark, PAL.slateDark, false);
    m.box(-37.05, 0, 0.3, 0.35, 76.0, 3.6, PAL.slateDark, PAL.slateDark, false);
    m.box(37.05, 0, 0.3, 0.35, 76.0, 3.6, PAL.slateDark, PAL.slateDark, false);
    for (let x = -28; x <= 28; x += 8.0) {
      m.box(x, -45.15, 0.3, 1.0, 0.45, 3.7, PAL.pureWhite, PAL.pureWhite, false);
      m.box(x, 45.15, 0.3, 1.0, 0.45, 3.7, PAL.pureWhite, PAL.pureWhite, false);
    }
    for (let y = -34; y <= 34; y += 8.5) {
      m.box(-37.15, y, 0.3, 0.45, 1.0, 3.7, PAL.pureWhite, PAL.pureWhite, false);
      m.box(37.15, y, 0.3, 0.45, 1.0, 3.7, PAL.pureWhite, PAL.pureWhite, false);
    }
    // Lower hipped market hall roof apron around central raised pavilion
    m.rectFrustum(0, 0, 5.4, 76.0, 92.0, 7.6, 52.0, 66.0, PAL.slateRoof, PAL.doveGrey);
    // Upper clerestory ventilation band (classic louvered market hall!)
    m.box(0, 0, 7.6, 50.0, 64.0, 2.2, PAL.windowDark, PAL.alabaster);
    for (let y = -28; y <= 28; y += 7.0) {
      m.box(-25.1, y, 7.6, 0.4, 1.1, 2.2, PAL.pureWhite, PAL.pureWhite, false);
      m.box(25.1, y, 7.6, 0.4, 1.1, 2.2, PAL.pureWhite, PAL.pureWhite, false);
    }
    // Crowning multi-bay corrugated market hall roof + central octagonal "Round Market" cupola lantern
    m.rectFrustum(0, 0, 9.8, 53.0, 67.0, 12.2, 30.0, 40.0, PAL.cathRoof, PAL.doveGrey);
    m.prism(0, 0, 11.4, 13.5, 13.0, 13.2, 8, PAL.pureWhite, PAL.alabaster, Math.PI / 8);
    m.prism(0, 0, 13.0, 14.5, 15.2, 1.2, 8, PAL.slateRoof, PAL.pureWhite, Math.PI / 8);
    return m;
  }

  /* =========================================================================
   * 6C. PLAZA HOTEL — Modeled directly from Wikimedia Commons Jan 2024 Quezon Ave photo (quezon_2024.jpg)
   *     Exact 12.1 × 28.7 m footprint along Quezon Ave facing City Plaza
   * ========================================================================= */
  function buildPlazaHotel(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Cool silver-light-grey 4-story concrete body (exact quezon_2024.jpg!)
    m.box(0, 0, 0, 12.2, 28.2, 13.6, PAL.silverPanel, PAL.doveGrey);
    // Recessed ground-floor commercial storefront (Smart / 7-Eleven ground retail along Quezon Ave)
    m.box(-5.95, 0, 0.2, 0.55, 25.0, 3.1, PAL.windowDark, PAL.windowDark, false);
    for (let fy = -11.0; fy <= 11.0; fy += 5.5) {
      m.box(-6.1, fy, 0.2, 0.65, 0.72, 3.2, PAL.silverPanel, PAL.alabaster, false);
    }
    // SIGNATURE CORAL-RED HORIZONTAL CONCRETE SUN-LEDGES & RECESSED TEAL-SLATE BALCONY BAYS (exact quezon_2024.jpg!)
    for (const lz of [3.4, 6.7, 10.0]) {
      m.box(-5.95, 0, lz + 0.62, 0.52, 25.8, 1.85, PAL.windowDark, PAL.windowDark, false);
      m.box(5.95, 0, lz + 0.62, 0.52, 25.8, 1.85, PAL.windowDark, PAL.windowDark, false);
      for (let fy = -9.6; fy <= 9.6; fy += 4.8) {
        m.box(-6.12, fy, lz + 0.62, 0.42, 0.52, 1.85, PAL.silverPanel, PAL.silverPanel, false);
        m.box(6.12, fy, lz + 0.62, 0.42, 0.52, 1.85, PAL.silverPanel, PAL.silverPanel, false);
      }
      // Projecting coral-terracotta-red floor ledges wrapping front & sides!
      m.box(0, 0, lz, 13.0, 29.0, 0.58, PAL.plazaCoral, PAL.plazaCoral, false);
    }
    // Top coral-red parapet crown trim + pale rooftop stair penthouse
    m.box(0, 0, 13.6, 13.0, 29.0, 0.62, PAL.plazaCoral, PAL.slateRoof);
    m.box(0, -5.0, 14.22, 6.8, 9.2, 1.75, PAL.silverPanel, PAL.doveGrey);
    return m;
  }

  /* =========================================================================
   * EXTRA PHOTO-VERIFIED DOWNTOWN STRUCTURES (rendered seamlessly without altering sidebar UI)
   *  - Quezon Avenue Blue-and-White Pedestrian Overpass (exact OSM bridge [120.316488,16.615431]->[120.316692,16.615405])
   *  - St. William Pastoral / Parish Center (exact 45.2 × 17.5 m footprint south of Cathedral, plaza_court.jpg right!)
   * ========================================================================= */
  function buildQuezonOverpass(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Main elevated steel deck & iconic BRIGHT BLUE side girder beams spanning 22.6 m across Quezon Ave (quezon_2023.jpg!)
    m.box(0, 0, 5.1, 22.8, 3.2, 0.45, PAL.pureWhite, PAL.alabaster);
    m.box(0, -1.65, 5.3, 22.8, 0.34, 1.25, PAL.bridgeBlue, PAL.bridgeBlue);
    m.box(0, 1.65, 5.3, 22.8, 0.34, 1.25, PAL.bridgeBlue, PAL.bridgeBlue);
    // Pale galvanized overhead weather canopy roof & slim steel canopy posts
    m.box(0, 0, 7.65, 22.4, 3.6, 0.30, PAL.alabaster, PAL.silverPanel);
    for (let px = -9.5; px <= 9.5; px += 4.75) {
      m.box(px, -1.55, 6.5, 0.22, 0.22, 1.2, PAL.pureWhite, PAL.pureWhite, false);
      m.box(px, 1.55, 6.5, 0.22, 0.22, 1.2, PAL.pureWhite, PAL.pureWhite, false);
    }
    // Sidewalk support piers & twin access stair landings on West (BDO/Jollibee side) & East (Plaza/Plaza Hotel side)
    for (const side of [-1, 1]) {
      const sx = side * 10.6;
      m.box(sx, -1.2, 0, 0.72, 0.72, 5.2, PAL.pureWhite, PAL.doveGrey);
      m.box(sx, 1.2, 0, 0.72, 0.72, 5.2, PAL.pureWhite, PAL.doveGrey);
      // Stepped sidewalk access stairs matching real OSM geometry (West descends South; East descends North toward Town Plaza)
      const dirY = side < 0 ? -1 : 1;
      for (let s = 0; s < 5; s++) {
        m.box(sx + side * 0.7, dirY * (2.3 + s * 1.35), 4.1 - s * 0.92, 1.8, 1.4, 0.85, PAL.alabaster, PAL.bridgeBlue, false);
      }
    }
    return m;
  }

  function buildPastoralCenter(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Exact 45.2 × 17.5 m 3-story crisp white modern parish/college building south of Cathedral (plaza_court.jpg right!)
    m.box(0, 0, 0, 44.8, 17.0, 10.4, PAL.pureWhite, PAL.alabaster);
    // Deep shaded open corridor galleries behind projecting crisp white horizontal cantilevered balcony slabs!
    for (const fz of [0.2, 3.55, 6.9]) {
      m.box(0, 0, fz + 0.55, 45.0, 17.24, 2.25, PAL.windowDark, PAL.windowDark, false);
      for (let bx = -20.0; bx <= 20.0; bx += 5.0) {
        m.box(bx, 0, fz, 0.65, 17.55, 3.3, PAL.pureWhite, PAL.alabaster, false);
      }
      if (fz > 1.0) {
        m.box(0, 0, fz, 46.2, 18.4, 0.62, PAL.pureWhite, PAL.alabaster, false);
      }
    }
    // Overhanging low-slope hipped roof
    m.box(0, 0, 10.4, 46.6, 18.8, 0.55, PAL.pureWhite, PAL.doveGrey);
    m.rectFrustum(0, 0, 10.95, 46.2, 18.4, 13.0, 32.0, 6.0, PAL.slateRoof, PAL.doveGrey);
    return m;
  }

  /* =========================================================================
   * 7. SM CITY LA UNION — Drone-verified coastal flagship mall on exact 10-vertex OSM footprint
   *    (Multicolor ocean-wave vertical fins, white SM medallion corner prow, 5 turquoise shell
   *     shade canopies, 5 circular skylight domes & HVAC units on dark charcoal roof, cantilevered
   *     glass corner pavilion, reflection fountain, curved riverfront louvered wing with blue SM
   *     sign, rear elevated rooftop parking deck filled with parked cars, & cream cinema block)
   * ========================================================================= */
  function addCoastalPalm(m, x, y, s = 1.0) {
    m.prism(x, y, 0, 0.28 * s, 4.4 * s, 0.16 * s, 6, PAL.trunk, PAL.trunk, 0, false);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.25;
      const fx = x + Math.cos(a) * 1.45 * s;
      const fy = y + Math.sin(a) * 1.45 * s;
      m.box(fx, fy, 4.15 * s, 1.85 * s, 0.72 * s, 0.45 * s, i % 2 ? PAL.treeLeafA : PAL.treeLeafB, PAL.treeLeafB, false);
    }
    m.prism(x, y, 4.4 * s, 1.25 * s, 5.25 * s, 0.28 * s, 6, PAL.treeLeafB, PAL.treeLeafB, 0, false);
  }

  function addParkedCar(m, cx, cy, z0, facingX, color) {
    const lx = facingX ? 4.1 : 1.9;
    const ly = facingX ? 1.9 : 4.1;
    m.box(cx, cy, z0, lx, ly, 0.85, color, color, false);
    m.box(cx, cy, z0 + 0.85, lx * 0.56, ly * 0.82, 0.55, PAL.windowDark, color, false);
  }

  function buildSMCity(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    const carPalette = [PAL.carWhite, PAL.carSilver, PAL.carDark, PAL.carWhite, PAL.carNavy, PAL.carRed, PAL.carSilver];

    // Helper: rotated box in local XY around (cx, cy) so the sweeping curved wing sits smoothly on the real OSM curve
    const rotBox = (cx, cy, z0, sx, sy, h, angRad, wallCol, roofCol, castShadow = true) => {
      const ca = Math.cos(angRad), sa = Math.sin(angRad);
      const hx = sx * 0.5, hy = sy * 0.5, z1 = z0 + h;
      const pt = (lx, ly, z) => [cx + lx * ca - ly * sa, cy + lx * sa + ly * ca, z];
      const p000 = pt(-hx, -hy, z0), p100 = pt(hx, -hy, z0), p110 = pt(hx, hy, z0), p010 = pt(-hx, hy, z0);
      const p001 = pt(-hx, -hy, z1), p101 = pt(hx, -hy, z1), p111 = pt(hx, hy, z1), p011 = pt(-hx, hy, z1);
      const rc = roofCol || wallCol;
      m.quad(p001, p101, p111, p011, rc, castShadow);
      m.quad(p000, p100, p101, p001, wallCol, castShadow);
      m.quad(p100, p110, p111, p101, wallCol, castShadow);
      m.quad(p110, p010, p011, p111, wallCol, castShadow);
      m.quad(p010, p000, p001, p011, wallCol, castShadow);
      m.edge(p001, p101); m.edge(p101, p111); m.edge(p111, p011); m.edge(p011, p001);
    };

    // Full real seam-stitched OSM envelope around [120.322384, 16.625568]: x = -134..+140, y = -83..+80 (274 x 163 m!)

    // 1. FOREGROUND COASTAL PROMENADE APRON & LANDSCAPED PALM ENTRY ISLAND (kept north of y = -96 so Available lot stays 100% clear)
    m.box(-20, -78, 0, 178, 20, 0.25, PAL.alabaster, PAL.warmCream, false);
    m.box(-26, -86, 0.22, 54, 4.8, 0.30, PAL.treeLeafB, PAL.treeLeafA, false);

    // 2. MAIN WEST WAVE-FIN WING (x = -124..-44, y = -72..+72) — Dark charcoal flat roof + crisp white parapet + multicolor ocean-wave fins!
    m.box(-84, 0, 0, 80, 144, 9.8, PAL.pureWhite, PAL.smRoofChar);
    m.box(-84, 0, 9.7, 81.4, 145.4, 0.95, PAL.pureWhite, PAL.smRoofChar, false);
    m.box(-84, 0, 9.85, 77.6, 141.6, 0.85, PAL.smRoofChar, PAL.smRoofChar, false);
    // Raised longitudinal roof mechanical/clerestory spine along the West Wing
    m.box(-86, 10, 10.65, 28, 106, 1.45, PAL.smCinemaCr, PAL.smRoofChar);
    m.box(-86, 10, 12.05, 24, 100, 0.45, PAL.smRoofChar, PAL.smRoofChar, false);
    // West stepped annex matching real OSM projection at (-142, -36)
    m.box(-128, -22, 0, 16, 46, 9.4, PAL.pureWhite, PAL.smRoofChar);
    m.box(-128, -22, 9.3, 17, 47, 0.85, PAL.pureWhite, PAL.smRoofChar, false);

    // ICONIC MULTICOLOR UNDULATING OCEAN-WAVE VERTICAL FINS wrapping BOTH the South-West frontage (facing parking/camera!) & West frontage!
    const wavePalette = [PAL.smDeepWave, PAL.waveBlue, PAL.smCyan, PAL.smAqua, PAL.pureWhite, PAL.smCyan, PAL.smDeepWave];
    // (a) South-Left Wave-Fin Wall (x = -120..-58, facing South y = -72.2 — directly facing the front parking lot & default map view!)
    m.box(-89, -72.1, 2.8, 62, 0.75, 6.8, PAL.bankNavy, PAL.bankNavy, false);
    m.box(-89, -72.2, 0.2, 62, 0.85, 2.7, PAL.windowDark, PAL.windowDark, false);
    for (let i = 0; i < 20; i++) {
      const fx = -117 + i * 3.05;
      const depth = 1.45 + Math.sin(i * 0.54) * 1.15 + Math.cos(i * 0.26) * 0.55;
      const topLift = Math.sin(i * 0.54 + 0.5) * 0.55;
      const finCol = wavePalette[i % wavePalette.length];
      m.box(fx, -72.4 - depth * 0.5, 2.7, 1.50, depth + 0.65, 6.85 + topLift, finCol, PAL.pureWhite, false);
    }
    // (b) West Wave-Fin Wall (y = -58..+64, facing West x = -124.2)
    m.box(-124.1, 14, 2.8, 0.75, 108, 6.8, PAL.bankNavy, PAL.bankNavy, false);
    m.box(-124.2, 14, 0.2, 0.85, 108, 2.7, PAL.windowDark, PAL.windowDark, false);
    for (let i = 0; i < 24; i++) {
      const fy = -34 + i * 4.25;
      const depth = 1.40 + Math.sin(i * 0.50) * 1.10;
      const topLift = Math.sin(i * 0.50 + 0.6) * 0.50;
      m.box(-124.4 - depth * 0.5, fy, 2.7, depth + 0.6, 1.55, 6.8 + topLift, wavePalette[i % wavePalette.length], PAL.pureWhite, false);
    }
    // West drop-off porte-cochere canopy
    m.box(-92, -78.5, 3.8, 24, 10.5, 0.85, PAL.darkStone, PAL.smRoofChar);
    for (const px of [-102, -92, -82]) {
      m.box(px, -82.8, 0, 0.9, 0.9, 3.8, PAL.darkStone, PAL.pureWhite, false);
    }

    // 3. ICONIC CRISP WHITE CORNER PROW WITH CIRCULAR ROYAL-BLUE "SM CITY LA UNION" MEDALLION (between wave fins & shell canopies!)
    m.box(-50, -68, 0, 24, 22, 10.8, PAL.pureWhite, PAL.smRoofChar);
    m.box(-50, -68, 0.2, 24.4, 22.4, 3.0, PAL.windowDark, PAL.darkStone, false);
    m.box(-50, -68, 3.3, 25.0, 23.0, 7.4, PAL.pureWhite, PAL.smRoofChar, false);
    m.box(-50, -68, 10.5, 25.4, 23.4, 0.55, PAL.pureWhite, PAL.smRoofChar, false);
    // Circular royal-blue SM medallion on South-facing white corner facade
    const medX = -50, medY = -79.7, medZ = 7.0;
    m.box(medX, medY, medZ - 2.4, 5.4, 0.8, 4.8, PAL.smDeepWave, PAL.smDeepWave, false);
    m.box(medX, medY - 0.16, medZ - 2.7, 4.0, 0.8, 5.4, PAL.smDeepWave, PAL.smDeepWave, false);
    m.box(medX, medY - 0.24, medZ - 1.6, 5.8, 0.8, 3.2, PAL.smDeepWave, PAL.smDeepWave, false);
    m.box(medX - 1.05, medY - 0.58, medZ - 0.95, 1.4, 0.3, 2.3, PAL.pureWhite, PAL.pureWhite, false);
    m.box(medX + 1.05, medY - 0.58, medZ - 0.95, 1.4, 0.3, 2.3, PAL.pureWhite, PAL.pureWhite, false);
    m.box(medX, medY - 0.48, medZ - 3.6, 4.6, 0.35, 0.78, PAL.bankNavy, PAL.bankNavy, false);

    // 4. CENTRAL SOUTH ENTRANCE ATRIUM — Dark charcoal roof + 5 circular skylight domes + rooftop HVAC + 5 bright turquoise shell canopies!
    m.box(4, -56, 0, 92, 42, 10.6, PAL.pureWhite, PAL.smRoofChar);
    // Recessed double-height dark-glazed atrium curtain wall facing South (-y)
    m.box(0, -76.8, 0.3, 78, 1.6, 9.1, PAL.windowDark, PAL.tealGlass, false);
    for (let mx = -36; mx <= 36; mx += 8.0) {
      m.box(mx, -77.4, 0.3, 0.58, 1.2, 9.1, PAL.silverTrim, PAL.pureWhite, false);
    }
    // Deep cantilevered dark-bronze upper roofline & crisp white eyebrow canopy above atrium entrance
    m.box(2, -78.2, 9.4, 86, 4.4, 1.45, PAL.darkStone, PAL.smRoofChar);
    m.box(-2, -79.0, 4.1, 74, 5.0, 0.72, PAL.bankNavy, PAL.pureWhite, false);

    // 5 SIGNATURE BRIGHT TURQUOISE SCALLOPED SHELL OUTDOOR SHADE CANOPIES along the front promenade!
    const shellPositions = [
      [-32, -81.5, 1.05],
      [-21, -82.0, 1.12],
      [-10, -82.5, 1.18],
      [2, -82.8, 1.08],
      [14, -83.2, 1.28]
    ];
    for (const [sx, sy, sc] of shellPositions) {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        m.box(sx + Math.cos(a) * 2.1 * sc, sy + Math.sin(a) * 2.1 * sc, 0.25, 0.28, 0.28, 3.2 * sc, PAL.darkStone, PAL.darkStone, false);
      }
      m.prism(sx, sy, 3.1 * sc, 4.5 * sc, 4.35 * sc, 3.3 * sc, 8, PAL.smShellBlue, PAL.smCyan, 0.39, true);
      m.dome(sx, sy, 4.25 * sc, 3.4 * sc, 1.75 * sc, 8, 3, PAL.smCyan);
      m.prism(sx, sy, 5.85 * sc, 0.92 * sc, 6.25 * sc, 0.26 * sc, 8, PAL.pureWhite, PAL.pureWhite, 0, false);
    }

    // 5 CIRCULAR PALE SKYLIGHT DOMES on the dark charcoal roof deck (exact drone photo!)
    const skylights = [
      [-26, -58, 5.0], [-8, -62, 3.5], [4, -54, 5.2], [17, -58, 3.0], [34, -48, 4.0]
    ];
    for (const [kx, ky, kr] of skylights) {
      m.prism(kx, ky, 10.6, kr, 11.4, kr * 0.94, 12, PAL.pureWhite, PAL.alabaster, 0, true);
      m.dome(kx, ky, 11.4, kr * 0.90, 1.05, 12, 2, PAL.alabaster);
    }
    // Realistic tan, white, and terracotta rooftop HVAC units clustered neatly on the dark charcoal roof
    const hvacUnits = [
      [-46, -50, 5.2, 3.6, 2.1, PAL.smHvacTan], [-38, -48, 4.6, 3.4, 1.9, PAL.smHvacTan],
      [-54, -46, 4.6, 3.2, 1.9, PAL.smHvacTan], [10, -68, 5.8, 3.8, 2.2, PAL.alabaster],
      [20, -66, 5.4, 3.6, 2.1, PAL.smHvacRed], [30, -63, 5.4, 3.6, 2.1, PAL.smHvacRed],
      [44, -56, 5.6, 3.6, 2.1, PAL.alabaster], [54, -53, 5.2, 3.4, 2.0, PAL.smHvacRed]
    ];
    for (const [hx, hy, hw, hl, hh, hcol] of hvacUnits) {
      m.box(hx, hy, 10.6, hw, hl, hh, hcol, PAL.alabaster, true);
      m.box(hx, hy, 10.6 + hh, hw * 0.72, hl * 0.72, 0.25, PAL.darkStone, PAL.darkStone, false);
    }

    // 5. CANTILEVERED GLASS CORNER VIEWING PAVILION + REFLECTION FOUNTAIN (exact SE corner at (+48, -74)!)
    for (const [px, py] of [[40, -82], [58, -82], [40, -66], [58, -66]]) {
      m.box(px, py, 0, 1.7, 1.7, 4.4, PAL.darkStone, PAL.darkStone);
    }
    m.box(49, -74, 4.3, 23, 22, 6.4, PAL.darkStone, PAL.smRoofChar);
    m.box(49, -74, 4.3, 23.8, 22.8, 0.88, PAL.pureWhite, PAL.pureWhite, false);
    m.box(49, -74, 9.95, 23.8, 22.8, 0.98, PAL.pureWhite, PAL.smRoofChar, false);
    m.box(49, -74, 5.2, 23.4, 22.4, 4.7, PAL.windowDark, PAL.tealGlass, false);
    m.box(61, -78, 4.3, 8.2, 12, 0.68, PAL.pureWhite, PAL.alabaster, false);
    // Signature Rectangular Turquoise Reflection Fountain right next to the pavilion
    m.box(29, -86, 0.22, 6.8, 13.5, 0.65, PAL.darkStone, PAL.darkStone, false);
    m.box(29, -86, 0.55, 5.5, 12.2, 0.35, PAL.smCyan, PAL.tealGlassHi, false);
    m.box(29, -86, 0.90, 1.5, 8.8, 1.35, PAL.pureWhite, PAL.pureWhite, false);

    // 6. SWEEPING CURVED EAST / SE WING tracing exact real OSM curve (+64,-44) -> (+136,-12) -> (+132,+28)
    const curveSegs = [
      [64, -46, 24, 24, 0.30],
      [86, -39, 25, 24, 0.36],
      [108, -30, 26, 24, 0.42],
      [126, -18, 24, 24, 0.58],
      [134, 2, 24, 26, 1.38],
      [130, 22, 22, 24, 1.56]
    ];
    for (const [cx, cy, sw, sd, ang] of curveSegs) {
      rotBox(cx, cy, 0, sw, sd, 10.0, ang, PAL.alabaster, PAL.smRoofChar, true);
      rotBox(cx, cy, 9.1, sw + 1.1, sd + 1.1, 1.18, ang, PAL.pureWhite, PAL.smRoofChar, false);
      rotBox(cx, cy, 0.3, sw + 0.38, sd + 0.38, 3.6, ang, PAL.windowDark, PAL.windowDark, false);
      for (let li = -4; li <= 4; li++) {
        const lx = li * (sw * 0.10);
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const fx = cx + lx * ca + (sd * 0.51) * sa;
        const fy = cy + lx * sa - (sd * 0.51) * ca;
        rotBox(fx, fy, 4.0, 0.58, 0.88, 5.2, ang, PAL.pureWhite, PAL.silverPanel, false);
      }
    }
    // Signature Curved Blue "SM" Rooftop Beacon Sign perched on the sweeping curve!
    rotBox(86, -45, 10.3, 15.0, 1.9, 4.2, 0.36, PAL.smDeepWave, PAL.pureWhite, true);
    rotBox(86, -45.7, 11.1, 10.2, 1.4, 2.5, 0.36, PAL.pureWhite, PAL.pureWhite, false);

    // 7. MASSIVE REAR ELEVATED OPEN-AIR ROOFTOP PARKING DECK FILLED WITH 52 PARKED CARS!
    m.box(26, 14, 0, 166, 72, 7.8, PAL.warmCream, PAL.smDeckConc);
    m.box(26, 49.5, 7.8, 166, 1.2, 1.15, PAL.pureWhite, PAL.alabaster, false);
    m.box(108.4, 14, 7.8, 1.2, 72, 1.15, PAL.pureWhite, PAL.alabaster, false);
    m.box(-56.4, 14, 7.8, 1.2, 72, 1.15, PAL.pureWhite, PAL.alabaster, false);
    let carIdx = 0;
    for (const ry of [-12, 2, 16, 30]) {
      for (let ci = 0; ci < 13; ci++) {
        const rx = -42 + ci * 10.6 + ((ci % 2) * 0.6);
        addParkedCar(m, rx, ry, 7.85, false, carPalette[(carIdx++) % carPalette.length]);
      }
    }

    // 8. TALL REAR WARM BUTTER-CREAM CINEMA / MULTIPLEX VOLUME + STAIRWELL CORE (exact drone photo rear massing!)
    m.box(-38, 60, 0, 68, 28, 16.4, PAL.smCinemaCr, PAL.alabaster);
    m.box(-38, 60, 16.0, 69.2, 29.2, 0.88, PAL.pureWhite, PAL.doveGrey, false);
    m.box(-58, 62, 0, 26, 24, 17.8, PAL.smCinemaCr, PAL.alabaster);
    m.box(-18, 45.5, 6.0, 20, 1.6, 7.8, PAL.alabaster, PAL.doveGrey, false);
    // Secondary pale butter-cream stair/elevator core rising along the parking deck edge
    m.box(58, 26, 0, 13, 13, 15.2, PAL.smCinemaCr, PAL.alabaster);
    m.box(58, 26, 15.0, 13.8, 13.8, 0.68, PAL.pureWhite, PAL.doveGrey, false);

    // 9. FOREGROUND WHITE COVERED PARKING SHED + PALM-LINED ENTRY BOULEVARD + PARKED CARS
    m.box(-112, -82, 3.6, 26, 9.5, 0.65, PAL.pureWhite, PAL.pureWhite);
    for (const px of [-122, -112, -102]) {
      m.box(px, -86, 0, 0.7, 0.7, 3.6, PAL.darkStone, PAL.darkStone, false);
      m.box(px, -78, 0, 0.7, 0.7, 3.6, PAL.darkStone, PAL.darkStone, false);
    }
    for (let pi = 0; pi < 8; pi++) {
      addParkedCar(m, -116 + pi * 5.4, -89.5, 0.25, false, carPalette[(carIdx++) % carPalette.length]);
    }
    for (const [px, py] of [[-54, -86], [-42, -86], [-30, -86], [-18, -86], [-6, -86], [8, -87], [20, -88]]) {
      addCoastalPalm(m, px, py, 1.08);
    }
    return m;
  }

  /* =========================================================================
   * 8. ROBINSONS PLACE LA UNION — Exact 14-vertex stepped L-wing OSM footprint (147 × 128 m)
   *    Surf-inspired Jonathan O. Gan coastal wave canopies, curved MacArthur Hwy glazed atrium,
   *    freestanding 21 m highway pylon tower, circular skylight dome, al-fresco dining,
   *    elevated Movieworld cinema wing, rooftop HVAC clusters, parked cars & coastal palms!
   * ========================================================================= */
  function buildRobinsons(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    const carPalette = [PAL.carWhite, PAL.carSilver, PAL.carDark, PAL.carNavy, PAL.carRed, PAL.carWhite, PAL.carSilver];
    const rotBox = (cx, cy, z0, sx, sy, h, angRad, wallCol, roofCol, castShadow = true) => {
      const ca = Math.cos(angRad), sa = Math.sin(angRad);
      const hx = sx * 0.5, hy = sy * 0.5, z1 = z0 + h;
      const pt = (lx, ly, z) => [cx + lx * ca - ly * sa, cy + lx * sa + ly * ca, z];
      const p000 = pt(-hx, -hy, z0), p100 = pt(hx, -hy, z0), p110 = pt(hx, hy, z0), p010 = pt(-hx, hy, z0);
      const p001 = pt(-hx, -hy, z1), p101 = pt(hx, -hy, z1), p111 = pt(hx, hy, z1), p011 = pt(-hx, hy, z1);
      const rc = roofCol || wallCol;
      m.quad(p001, p101, p111, p011, rc, castShadow);
      m.quad(p000, p100, p101, p001, wallCol, castShadow);
      m.quad(p100, p110, p111, p101, wallCol, castShadow);
      m.quad(p110, p010, p011, p111, wallCol, castShadow);
      m.quad(p010, p000, p001, p011, wallCol, castShadow);
      m.edge(p001, p101); m.edge(p101, p111); m.edge(p111, p011); m.edge(p011, p001);
    };

    // Exact 14-vertex OSM silhouette around [120.319075, 16.600128]:
    // NW Main Block [-66.. -3, -6.. +78], Central-South Wing [-9.. +28, -46.. +19], East Movieworld Wing [+26.. +80, -41.. -9]

    // 1. FOREGROUND HIGHWAY PLAZA APRON & OPEN SW CUSTOMER PARKING COURT
    m.box(-38, -32, 0, 56, 36, 0.24, PAL.alabaster, PAL.warmCream, false);
    m.box(-54, -21, 0.22, 16, 4.4, 0.28, PAL.treeLeafB, PAL.treeLeafA, false);

    // 2. NW MAIN MALL BLOCK (x = -64..-4, y = -4..+77 — exact MacArthur Hwy coastal wave frontage!)
    m.box(-34, 36.5, 0, 60, 81, 4.0, PAL.alabaster, PAL.doveGrey);
    m.box(-34, 36.5, 4.0, 59.4, 80.2, 9.4, PAL.pureWhite, PAL.smRoofChar);
    // Crisp white perimeter parapet framing dark recessed roof deck
    m.box(-34, 36.5, 13.3, 60.6, 81.4, 1.05, PAL.pureWhite, PAL.smRoofChar, false);
    m.box(-34, 36.5, 13.45, 56.8, 77.6, 0.92, PAL.smRoofChar, PAL.smRoofChar, false);
    // Ground-level recessed retail storefront glass & silver mullions along MacArthur Hwy (West face)
    m.box(-64.1, 40, 0.3, 0.8, 66, 3.3, PAL.windowDark, PAL.windowDark, false);
    for (let fy = 10; fy <= 70; fy += 7.5) {
      m.box(-64.35, fy, 0.3, 0.55, 0.58, 3.4, PAL.silverPanel, PAL.pureWhite, false);
    }
    // SIGNATURE MULTI-TIER SWEEPING OCEAN-WAVE FACADE RIBBONS (cobalt + wave blue + surf cyan + sculptural white crest!)
    for (let i = 0; i < 18; i++) {
      const y = 7.5 + i * 3.85;
      const w1 = Math.sin(i * 0.42);
      const w2 = Math.cos(i * 0.42 - 0.5);
      const zBase = 5.4 + w1 * 1.85;
      const outD = 1.25 + (w1 * 0.5 + 0.5) * 1.15;
      m.box(-64.1 - outD * 0.5, y, zBase, outD, 3.72, 1.55, PAL.smDeepWave, PAL.waveBlue, false);
      m.box(-64.0 - outD * 0.42, y, zBase + 1.85 + w2 * 0.45, outD * 0.85, 3.72, 1.15, PAL.waveBlue, PAL.smCyan, false);
      m.box(-63.9 - outD * 0.34, y, zBase + 3.25 + w2 * 0.65, outD * 0.68, 3.72, 0.85, PAL.smCyan, PAL.pureWhite, false);
      // Crisp white curved top wave crest fin
      m.box(-63.9 - outD * 0.25, y, 12.1 + w1 * 0.65, outD * 0.55, 3.70, 0.72, PAL.pureWhite, PAL.alabaster, false);
    }
    // North secondary facade ribbon windows & coastal brise-soleil fins
    m.box(-34, 77.1, 4.8, 46, 0.65, 4.4, PAL.tealGlass, PAL.tealGlass, false);
    for (let nx = -54; nx <= -14; nx += 4.0) {
      m.box(nx, 77.3, 4.6, 0.45, 0.85, 5.2, PAL.pureWhite, PAL.alabaster, false);
    }

    // 3. GRAND CURVED DIAGONAL MACARTHUR HWY ENTRANCE ATRIUM & SURF-WAVE CANOPY (matching vertices [-56,3]->[-45,-11]->[-12,-19]!)
    const diagAng = -0.58; // ~-33 deg diagonal facing SW toward MacArthur Hwy & open parking
    // Recessed double-height tinted teal glass atrium curtain wall
    rotBox(-35, -7, 0.2, 36.0, 12.0, 12.8, diagAng, PAL.pureWhite, PAL.smRoofChar, true);
    rotBox(-38.2, -11.6, 0.35, 29.0, 2.4, 10.6, diagAng, PAL.tealGlass, PAL.tealGlassHi, false);
    // Silver vertical mullions across the grand glazed atrium
    for (let mi = -3; mi <= 3; mi++) {
      const ca = Math.cos(diagAng), sa = Math.sin(diagAng);
      const mx = -38.8 + mi * 4.2 * ca;
      const my = -12.4 + mi * 4.2 * sa;
      rotBox(mx, my, 0.35, 0.48, 0.85, 10.6, diagAng, PAL.silverPanel, PAL.pureWhite, false);
    }
    // Sweeping cantilevered lower surf-blue & white drop-off canopy + upper sculptural wave hood
    rotBox(-41.2, -15.4, 4.6, 26.0, 6.2, 0.95, diagAng, PAL.pureWhite, PAL.waveBlue, true);
    rotBox(-42.0, -16.4, 5.5, 22.0, 1.4, 0.55, diagAng, PAL.smCyan, PAL.smCyan, false);
    rotBox(-40.2, -14.2, 11.4, 30.0, 5.4, 1.55, diagAng, PAL.csiBlue, PAL.pureWhite, true);
    // Signature Robinsons crimson-red & royal-blue rooftop fascia crown ("ROBINSONS") + sweeping surf-wave canopy crest!
    rotBox(-40.6, -14.8, 12.95, 22.0, 2.3, 1.85, diagAng, PAL.jbRed, PAL.jbRed, false);
    rotBox(-40.8, -15.0, 13.45, 15.2, 2.55, 0.85, diagAng, PAL.pureWhite, PAL.pureWhite, false);
    rotBox(-39.6, -13.6, 14.85, 28.0, 1.6, 0.95, diagAng, PAL.smCyan, PAL.waveBlue, false);
    // Drop-off cylindrical canopy columns
    for (const ci of [-9.5, -3.2, 3.2, 9.5]) {
      const ca = Math.cos(diagAng), sa = Math.sin(diagAng);
      m.prism(-42.5 + ci * ca, -17.2 + ci * sa, 0.2, 0.44, 4.65, 0.38, 8, PAL.pureWhite, null, 0, false);
    }

    // ICONIC FREESTANDING 21 m ROBINSONS HIGHWAY PYLON TOWER (cleanly inside Robinsons' SW concrete apron!)
    m.box(-62.0, -26.0, 0, 3.6, 5.6, 20.6, PAL.pureWhite, PAL.csiBlue);
    m.box(-60.4, -26.0, 0.5, 1.2, 6.0, 19.6, PAL.csiBlue, PAL.csiBlue, false);
    m.box(-63.85, -26.0, 14.2, 0.75, 5.0, 5.2, PAL.jbRed, PAL.jbRed, false);
    m.box(-64.1, -26.0, 15.8, 0.35, 3.8, 1.8, PAL.pureWhite, PAL.pureWhite, false);
    // Illuminated tenant brand slats down the pylon shaft
    for (const tz of [4.2, 6.6, 9.0, 11.4]) {
      m.box(-63.8, -26.0, tz, 0.55, 4.0, 1.45, PAL.waveBlue, PAL.smCyan, false);
    }

    // 4. CENTRAL-SOUTH DEPARTMENT & AL-FRESCO DINING WING (x = -9..+27, y = -45..+18)
    m.box(9, -13.5, 0, 36, 63, 13.0, PAL.pureWhite, PAL.smRoofChar);
    m.box(9, -13.5, 12.9, 37.0, 64.0, 0.95, PAL.pureWhite, PAL.smRoofChar, false);
    m.box(9, -13.5, 13.05, 33.8, 60.8, 0.82, PAL.smRoofChar, PAL.smRoofChar, false);
    // Warm coastal timber & sand horizontal brise-soleil louvers along South & West al-fresco walls
    m.box(9, -45.15, 0.3, 30, 0.75, 3.4, PAL.windowDark, PAL.windowDark, false);
    m.box(9, -45.2, 4.4, 32, 0.85, 6.8, PAL.warmCream, PAL.alabaster, false);
    for (const lz of [5.4, 7.0, 8.6, 10.2]) {
      m.box(9, -45.65, lz, 30, 0.65, 0.42, PAL.waveBlue, PAL.smCyan, false);
    }
    // Shaded Al-Fresco Dining Veranda Canopy & Colorful Coastal Patio Umbrellas!
    m.box(8, -47.4, 3.7, 28, 4.2, 0.55, PAL.pureWhite, PAL.csiBlue);
    for (const ux of [-4, 4, 12, 20]) {
      m.prism(ux, -48.6, 0.25, 0.14, 2.6, 0.12, 6, PAL.darkStone, null, 0, false);
      m.dome(ux, -48.6, 2.55, 1.85, 0.85, 8, 2, (ux % 8 === 0) ? PAL.smCyan : PAL.waveBlue);
    }

    // 5. EAST ELEVATED MOVIEWORLD CINEMA & SUPERMARKET WING (x = +26..+80, y = -41..-10)
    m.box(53, -25.5, 0, 54, 31, 15.2, PAL.alabaster, PAL.smRoofChar);
    m.box(53, -25.5, 15.1, 55.2, 32.2, 1.05, PAL.pureWhite, PAL.smRoofChar, false);
    m.box(53, -25.5, 15.25, 51.6, 28.6, 0.90, PAL.smRoofChar, PAL.smRoofChar, false);
    // Movieworld Cinema signature cobalt/cyan wave accent stripes & crimson cinema trim bar along South facade
    m.box(53, -41.1, 9.6, 46, 0.75, 1.65, PAL.smDeepWave, PAL.waveBlue, false);
    m.box(53, -41.2, 11.4, 46, 0.65, 0.95, PAL.smCyan, PAL.pureWhite, false);
    m.box(53, -41.3, 13.2, 26, 0.75, 1.15, PAL.jbRed, PAL.jbRed, false);
    // Recessed loading/east service windows & subtle corner fins
    for (let ex = 32; ex <= 74; ex += 8.4) {
      m.box(ex, -41.05, 4.2, 0.55, 0.85, 10.6, PAL.pureWhite, PAL.alabaster, false);
    }

    // 6. GRAND CENTRAL CIRCULAR SKYLIGHT DOME + GABLED DAYLIGHT MONITORS + ROOFTOP HVAC CLUSTERS
    // Circular glass atrium skylight dome crowning the mall junction
    m.prism(-16, 12, 14.1, 10.6, 15.6, 10.2, 14, PAL.pureWhite, PAL.tealGlassHi, 0, true);
    m.dome(-16, 12, 15.5, 10.1, 3.6, 14, 4, PAL.tealGlassHi);
    m.prism(-16, 12, 18.8, 2.2, 19.3, 1.8, 10, PAL.pureWhite, PAL.pureWhite, 0, false);
    // Twin gabled daylight clerestory monitors on NW Main Block
    for (const sy of [34, 58]) {
      m.box(-34, sy, 14.2, 34, 11.5, 1.25, PAL.pureWhite, PAL.doveGrey);
      m.gableX(-34, sy, 15.45, 32, 10.6, 2.1, PAL.tealGlassHi, PAL.pureWhite);
    }
    // Rooftop mechanical HVAC chillers (tan + terracotta + silver housings)
    for (const [hx, hy, hz, col] of [
      [-48, 22, 14.2, PAL.smHvacTan], [-48, 46, 14.2, PAL.smHvacRed], [-20, 48, 14.2, PAL.silverPanel],
      [12, -2, 13.8, PAL.smHvacTan], [12, -26, 13.8, PAL.smHvacRed],
      [42, -25, 16.0, PAL.smHvacTan], [62, -25, 16.0, PAL.silverPanel]
    ]) {
      m.box(hx, hy, hz, 8.2, 4.4, 2.1, col, PAL.alabaster, false);
      m.box(hx, hy, hz + 2.1, 6.4, 3.2, 0.35, PAL.darkStone, PAL.darkStone, false);
    }

    // 7. PARKED MINIATURE CARS IN SW FORECOURT LOT + COASTAL PALMS ALONG MACARTHUR HWY
    let ci = 0;
    for (const py of [-30, -37.5, -44.5]) {
      for (let px = -56; px <= -18; px += 7.2) {
        addParkedCar(m, px, py, 0.25, false, carPalette[(ci++) % carPalette.length]);
      }
    }
    for (const [tx, ty] of [
      [-70, 62], [-70, 44], [-70, 26], [-70, 8], [-70, -10], [-70, -38], [-54, -21], [-46, -21]
    ]) {
      addCoastalPalm(m, tx, ty, 1.06);
    }
    return m;
  }

  /* =========================================================================
   * 8A. LA UNION PROVINCIAL CAPITOL — Photo-verified Neoclassical & Art-Deco Civic Palace!
   *     Exact 20-vertex H-shaped OSM footprint (54 × 85 m) atop Capitol Hill facing West-NW
   *     Modeled directly from Wikimedia Commons day & night photos (capitol_front.jpg, capitol_2.jpg, capitol.jpg)
   * ========================================================================= */
  function buildProvincialCapitol(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    const carPalette = [PAL.carWhite, PAL.carSilver, PAL.carDark, PAL.carNavy];

    // 1. GRAND CAPITOL HILL TERRACED GRANITE PLINTH & CEREMONIAL DRIVEWAY APRON
    // Full H-wing stone foundation terrace (enveloping 54 × 85 m footprint)
    m.box(3.0, 0, 0, 24.5, 58.0, 1.25, PAL.plinth, PAL.alabaster);
    m.box(2.0, -34.5, 0, 28.0, 16.5, 1.25, PAL.plinth, PAL.alabaster);
    m.box(2.0, 34.5, 0, 28.0, 16.5, 1.25, PAL.plinth, PAL.alabaster);
    // Ceremonial West forecourt driveway & landscaped lawn border
    m.box(-25.0, 0, 0, 28.0, 38.0, 0.24, PAL.doveGrey, PAL.warmCream, false);
    for (const sy of [-15.5, 15.5]) {
      m.box(-24.0, sy, 0.22, 20.0, 6.5, 0.34, PAL.plinth, PAL.treeLeafA, false);
      m.box(-24.0, sy, 0.56, 17.0, 3.6, 0.52, PAL.treeLeafB, PAL.treeLeafA, false);
    }

    // 2. GRAND PROJECTING WEST PORTE-COCHERE, TRAVERTINE STAIRS, BALUSTRADED BALCONY & BLUSH PORTICO (exact capitol_front.jpg!)
    // Grand ceremonial travertine steps climbing from forecourt driveway into porte-cochere
    for (let s = 0; s < 5; s++) {
      m.box(-27.8 + s * 0.92, 0, 0.24 + s * 0.22, 1.05, 13.8 - s * 0.2, 0.24, PAL.alabaster, PAL.pureWhite, false);
    }
    // Flanking white stone stair cheek balustrades with urn finials
    for (const sy of [-7.1, 7.1]) {
      m.box(-25.8, sy, 0.24, 5.2, 0.72, 1.35, PAL.pureWhite, PAL.alabaster, false);
      m.prism(-28.1, sy, 1.58, 0.32, 2.25, 0.20, 8, PAL.pureWhite, PAL.pureWhite, 0, false);
    }
    // Porte-cochere raised stone landing floor
    m.box(-17.8, 0, 0, 14.5, 17.6, 1.25, PAL.plinth, PAL.pureWhite);
    // Ground-level recessed ceremonial dark-glazed entry lobby behind the portico
    m.box(-9.4, 0, 1.25, 1.8, 12.8, 4.9, PAL.windowDark, PAL.windowDark, false);
    for (const my of [-4.2, -1.4, 1.4, 4.2]) {
      m.box(-10.35, my, 1.25, 0.36, 0.44, 4.9, PAL.pureWhite, PAL.pureWhite, false);
    }
    // FOUR MONUMENTAL WHITE FLUTED NEOCLASSICAL COLUMNS supporting the porte-cochere balcony (capitol_front.jpg!)
    for (const cy of [-6.4, -2.2, 2.2, 6.4]) {
      m.box(-22.8, cy, 1.25, 1.45, 1.45, 0.48, PAL.alabaster, PAL.pureWhite, false);
      m.prism(-22.8, cy, 1.73, 0.56, 6.15, 0.48, 12, PAL.pureWhite, null, 0, true);
      m.box(-22.8, cy, 6.08, 1.48, 1.48, 0.42, PAL.doveGrey, PAL.pureWhite, false);
    }
    // Side supporting porte-cochere columns (North & South drive-through arches!)
    for (const sy of [-6.4, 6.4]) {
      for (const cx of [-18.4, -14.0]) {
        m.box(cx, sy, 1.25, 1.38, 1.38, 0.45, PAL.alabaster, PAL.pureWhite, false);
        m.prism(cx, sy, 1.70, 0.52, 6.15, 0.46, 12, PAL.pureWhite, null, 0, true);
        m.box(cx, sy, 6.08, 1.40, 1.40, 0.40, PAL.doveGrey, PAL.pureWhite, false);
      }
    }
    // Projecting 2nd-floor balcony deck slab & crisp molded cornice
    m.box(-16.6, 0, 6.45, 15.2, 16.4, 0.72, PAL.pureWhite, PAL.alabaster);
    m.box(-16.6, 0, 6.98, 15.8, 17.0, 0.34, PAL.doveGrey, PAL.pureWhite, false);
    // ORNATE WHITE BALUSTRADED BALCONY PARAPET wrapping West, North & South terrace edges!
    m.box(-24.2, 0, 7.32, 0.42, 16.6, 0.22, PAL.pureWhite, PAL.pureWhite, false);
    m.box(-24.2, 0, 8.28, 0.48, 16.8, 0.24, PAL.pureWhite, PAL.pureWhite, false);
    for (let by = -7.6; by <= 7.6; by += 1.08) {
      m.box(-24.2, by, 7.52, 0.24, 0.26, 0.78, PAL.pureWhite, PAL.pureWhite, false);
    }
    for (const sy of [-8.2, 8.2]) {
      m.box(-16.8, sy, 7.32, 15.2, 0.42, 0.22, PAL.pureWhite, PAL.pureWhite, false);
      m.box(-16.8, sy, 8.28, 15.4, 0.48, 0.24, PAL.pureWhite, PAL.pureWhite, false);
      for (let bx = -23.0; bx <= -10.4; bx += 1.25) {
        m.box(bx, sy, 7.52, 0.26, 0.24, 0.78, PAL.pureWhite, PAL.pureWhite, false);
      }
    }
    // Central Official Seal of the Province of La Union + 2 flanking crests on balcony parapet (capitol_front.jpg!)
    m.box(-24.55, 0, 6.82, 0.26, 1.95, 1.95, PAL.civicNavy, PAL.civicNavy, false);
    m.box(-24.66, 0, 7.08, 0.16, 1.38, 1.38, PAL.templeGold, PAL.templeGold, false);
    m.box(-24.72, 0, 7.34, 0.12, 0.78, 0.78, PAL.crimsonDot, PAL.pureWhite, false);
    for (const sy of [-4.4, 4.4]) {
      m.box(-24.52, sy, 7.15, 0.22, 1.15, 1.15, PAL.templeGold, PAL.civicNavy, false);
    }

    // RECESSED 2ND-STORY UPPER PORTICO LOGGIA WITH AUTHENTIC PALE BLUSH-IVORY BACK WALL & 2 GIANT FLUTED COLUMNS (capitol_2.jpg!)
    m.box(-9.4, 0, 7.25, 1.6, 11.4, 6.2, PAL.capitolBlush, PAL.capitolBlush, false);
    m.box(-10.25, 0, 7.45, 0.45, 6.2, 4.6, PAL.windowDark, PAL.windowDark, false);
    for (const uy of [-3.6, 3.6]) {
      m.prism(-12.2, uy, 7.25, 0.56, 13.5, 0.48, 12, PAL.pureWhite, null, 0, true);
      m.box(-12.2, uy, 13.25, 1.48, 1.48, 0.42, PAL.doveGrey, PAL.pureWhite, false);
    }

    // 3. STEPPED CENTRAL PURE-WHITE ART-DECO / NEOCLASSICAL PAVILION & GOLD "LA UNION CAPITOL" CROWN
    m.box(3.5, 0, 1.25, 23.0, 26.5, 13.4, PAL.pureWhite, PAL.alabaster);
    // Flanking classical pilasters & tall corner windows on the West central pavilion face
    for (const py of [-11.8, -7.8, 7.8, 11.8]) {
      m.box(-8.2, py, 1.25, 0.95, 1.35, 13.4, PAL.pureWhite, PAL.doveGrey, false);
    }
    for (const wy of [-9.8, 9.8]) {
      m.box(-8.12, wy, 2.3, 0.45, 2.4, 3.4, PAL.windowDark, PAL.windowDark, false);
      m.box(-8.12, wy, 7.8, 0.45, 2.4, 4.4, PAL.windowDark, PAL.windowDark, false);
    }
    // Crisp horizontal classical molding belts & deep overhanging central cornice
    m.box(3.5, 0, 6.85, 23.8, 27.3, 0.48, PAL.doveGrey, PAL.pureWhite, false);
    m.box(3.5, 0, 13.65, 24.4, 27.9, 0.55, PAL.doveGrey, PAL.pureWhite, false);
    m.box(3.5, 0, 14.20, 25.0, 28.5, 0.85, PAL.pureWhite, PAL.alabaster);
    // Stepped Art-Deco central attic crown + GOLD "LA UNION CAPITOL" lettering bar!
    m.box(2.5, 0, 15.05, 16.5, 17.5, 1.65, PAL.pureWhite, PAL.alabaster);
    m.box(-3.8, 0, 16.70, 5.2, 11.4, 1.15, PAL.pureWhite, PAL.doveGrey);
    // Signature warm gold fascia letters ("LA UNION CAPITOL") & gilded pediment frieze across the upper West facade!
    m.box(-8.62, 0, 14.32, 0.42, 15.6, 0.74, PAL.mcGold, PAL.templeGold, false);
    m.box(-6.52, 0, 15.62, 0.38, 10.2, 0.74, PAL.mcGold, PAL.templeGold, false);
    m.box(-8.55, 0, 13.78, 0.28, 24.4, 0.28, PAL.templeGold, PAL.templeGold, false);
    // Central rooftop spire flagpole & rear East civic annex wing
    m.prism(-3.8, 0, 17.85, 0.14, 22.8, 0.08, 6, PAL.silverPanel, null, 0, false);
    m.box(16.0, 0, 1.25, 8.8, 21.0, 9.8, PAL.pureWhite, PAL.alabaster);
    m.rectFrustum(16.0, 0, 11.05, 9.6, 22.0, 13.4, 3.2, 14.0, PAL.campusGreen, PAL.campusGreen);

    // 4. TWIN SYMMETRICAL 2-STORY WHITE CONNECTING GALLERIES WITH FOREST-GREEN PITCHED ROOFS (exact H-shape!)
    for (const side of [-1, 1]) {
      const gy = side * 20.8;
      m.box(3.8, gy, 1.25, 14.2, 16.0, 9.6, PAL.pureWhite, PAL.alabaster);
      // Horizontal floor molding belt
      m.box(3.8, gy, 6.25, 14.8, 16.2, 0.42, PAL.doveGrey, PAL.pureWhite, false);
      // Multi-pane 1st & 2nd floor dark glass gallery windows on West & East elevations
      for (const wy of [gy - 4.4, gy, gy + 4.4]) {
        m.box(-3.38, wy, 2.35, 0.42, 2.5, 3.2, PAL.windowDark, PAL.windowDark, false);
        m.box(-3.38, wy, 7.15, 0.42, 2.5, 3.0, PAL.windowDark, PAL.windowDark, false);
        m.box(10.98, wy, 2.35, 0.42, 2.5, 3.2, PAL.windowDark, PAL.windowDark, false);
        m.box(10.98, wy, 7.15, 0.42, 2.5, 3.0, PAL.windowDark, PAL.windowDark, false);
      }
      // Crisp white roof cornice eaves + AUTHENTIC FOREST-GREEN PITCHED GALLERY ROOF!
      m.box(3.8, gy, 10.85, 15.8, 16.4, 0.55, PAL.pureWhite, PAL.doveGrey, false);
      m.gableY(3.8, gy, 11.4, 16.4, 17.6, 3.2, PAL.campusGreen, PAL.pureWhite);
    }

    // 5. TWIN SYMMETRICAL PROJECTING NORTH & SOUTH END PAVILIONS WITH FOREST-GREEN HIPPED ROOFS (83 m total span!)
    for (const side of [-1, 1]) {
      const ey = side * 34.5;
      m.box(2.0, ey, 1.25, 26.2, 14.2, 11.2, PAL.pureWhite, PAL.alabaster);
      m.box(2.0, ey, 6.55, 26.9, 14.9, 0.46, PAL.doveGrey, PAL.pureWhite, false);
      // Tall double-height classical window bays framed by crisp white pilasters on West, East & End faces!
      for (const wy of [ey - 3.6, ey, ey + 3.6]) {
        m.box(-11.18, wy, 2.35, 0.44, 2.2, 3.4, PAL.windowDark, PAL.windowDark, false);
        m.box(-11.18, wy, 7.45, 0.44, 2.2, 3.9, PAL.windowDark, PAL.windowDark, false);
        m.box(15.18, wy, 2.35, 0.44, 2.2, 3.4, PAL.windowDark, PAL.windowDark, false);
        m.box(15.18, wy, 7.45, 0.44, 2.2, 3.9, PAL.windowDark, PAL.windowDark, false);
      }
      for (const wx of [-6.5, 0, 6.5]) {
        m.box(wx, ey + side * 7.18, 2.35, 3.4, 0.44, 3.4, PAL.windowDark, PAL.windowDark, false);
        m.box(wx, ey + side * 7.18, 7.45, 3.4, 0.44, 3.9, PAL.windowDark, PAL.windowDark, false);
      }
      // Corner pilasters
      for (const sx of [-12.6, 14.6]) {
        m.box(sx, ey + side * 6.8, 1.25, 1.25, 1.25, 11.2, PAL.pureWhite, PAL.doveGrey, false);
      }
      // Crisp overhanging white eaves + AUTHENTIC FOREST-GREEN HIPPED PAVILION ROOF!
      m.box(2.0, ey, 12.45, 27.6, 15.6, 0.62, PAL.pureWhite, PAL.doveGrey, false);
      m.rectFrustum(2.0, ey, 13.07, 28.4, 16.4, 16.45, 15.2, 3.6, PAL.campusGreen, PAL.campusGreen);
      m.box(2.0, ey, 16.45, 15.4, 0.72, 0.35, PAL.pureWhite, PAL.pureWhite, false);
    }

    // 6. THREE TALL CIVIC FLAGPOLES, GREEN-ROOFED SECURITY GUARDHOUSE & CAPITOL HILL LANDSCAPING (exact capitol_front.jpg!)
    m.prism(-31.2, 0, 0.24, 0.14, 12.8, 0.09, 6, PAL.pureWhite, null, 0, false);
    m.box(-31.2, 0.72, 10.6, 0.12, 1.45, 1.05, PAL.civicNavy, PAL.crimsonDot, false);
    for (const fy of [-4.4, 4.4]) {
      m.prism(-31.2, fy, 0.24, 0.11, 10.4, 0.07, 6, PAL.pureWhite, null, 0, false);
      m.box(-31.2, fy + 0.65, 8.6, 0.10, 1.25, 0.90, PAL.pureWhite, PAL.templeGold, false);
    }
    // Iconic small white & forest-green hipped-roof Capitol Security Guardhouse on SW driveway approach
    m.box(-32.0, -14.8, 0.24, 4.6, 4.2, 3.0, PAL.pureWhite, PAL.alabaster);
    m.box(-32.0, -14.8, 1.2, 4.78, 2.8, 1.35, PAL.windowDark, PAL.windowDark, false);
    m.rectFrustum(-32.0, -14.8, 3.24, 6.2, 5.8, 4.85, 0.8, 0.8, PAL.campusGreen, PAL.campusGreen);
    // Ceremonial circular Capitol Hill reflection fountain & landscaped civic rotunda on West approach!
    m.prism(-36.2, 0, 0.24, 3.8, 0.72, 3.6, 14, PAL.pureWhite, PAL.smCyan, 0, false);
    m.prism(-36.2, 0, 0.72, 1.15, 1.75, 0.65, 10, PAL.alabaster, PAL.pureWhite, 0, false);
    m.prism(-36.2, 0, 1.75, 0.42, 2.45, 0.14, 8, PAL.smCyan, PAL.pureWhite, 0, false);
    // Official vehicles parked neatly beside the North forecourt wing
    for (let i = 0; i < 4; i++) {
      addParkedCar(m, -21.0 + i * 3.4, 24.5, 0.25, false, carPalette[i % carPalette.length]);
    }
    // Heritage Capitol Hill trees framing the flanks (leaving grand West colonnade 100% open!)
    const hillTrees = [
      [-28, -28, 1.15, PAL.treeLeafA], [-22, -38, 1.05, PAL.treeLeafC],
      [-28, 29, 1.12, PAL.treeLeafB], [-20, 41, 1.04, PAL.treeLeafA],
      [20, -24, 1.08, PAL.treeLeafC], [20, 24, 1.10, PAL.treeLeafB]
    ];
    for (const [tx, ty, ts, tc] of hillTrees) addScaleTree(m, tx, ty, ts, tc);
    addCoastalPalm(m, -33.5, -9.2, 0.96);
    addCoastalPalm(m, -33.5, 9.2, 0.96);
    return m;
  }

  /* =========================================================================
   * 8A2. ILOCOS TRAINING & REGIONAL MEDICAL CENTER (ITRMC) — Exact 12-vertex Parian Apex Hospital (138 × 98 m)
   * ========================================================================= */
  function buildITRMC(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    const carPalette = [PAL.carWhite, PAL.carSilver, PAL.carWhite, PAL.carRed, PAL.carNavy];
    // Hospital grounds concrete terrace apron
    m.box(-4, 0, 0, 128, 88, 0.35, PAL.plinth, PAL.warmCream, false);

    // 1. 5-STORY WHITE & TEAL-GLASS SPECIALTY REFERRAL TOWER (Main north-central spine!)
    m.box(-8, 16, 0.35, 74, 24, 16.8, PAL.pureWhite, PAL.alabaster);
    // Rhythmic horizontal hospital floor ribbons & reflective teal-glass ward bays
    for (const fz of [3.5, 6.7, 9.9, 13.1]) {
      m.box(-8, 16, fz, 75.2, 25.0, 0.48, PAL.alabaster, PAL.pureWhite, false);
      m.box(-8, 3.9, fz + 0.65, 66, 0.45, 1.95, PAL.tealGlass, PAL.tealGlass, false);
      m.box(-8, 28.1, fz + 0.65, 66, 0.45, 1.95, PAL.tealGlass, PAL.tealGlass, false);
    }
    // Crisp structural sun-breaker vertical fins & blue-teal top crown band
    for (let fx = -38; fx <= 22; fx += 7.5) {
      m.box(fx, 3.7, 0.35, 0.72, 0.95, 16.8, PAL.pureWhite, PAL.doveGrey, false);
      m.box(fx, 28.3, 0.35, 0.72, 0.95, 16.8, PAL.pureWhite, PAL.doveGrey, false);
    }
    m.box(-8, 16, 17.15, 75.4, 25.4, 1.15, PAL.csiBlue, PAL.slateRoof);
    // Prominent crimson medical cross beacons on BOTH the West (-x) & South (-y) main tower faces!
    m.box(-45.2, 16, 11.4, 0.55, 5.8, 5.8, PAL.pureWhite, PAL.pureWhite, false);
    m.box(-45.55, 16, 12.1, 0.35, 1.35, 4.4, PAL.medCrossRed, PAL.medCrossRed, false);
    m.box(-45.55, 16, 13.6, 0.35, 4.4, 1.35, PAL.medCrossRed, PAL.medCrossRed, false);
    m.box(-8, 3.7, 11.4, 5.8, 0.55, 5.8, PAL.pureWhite, PAL.pureWhite, false);
    m.box(-8, 3.35, 12.1, 1.35, 0.35, 4.4, PAL.medCrossRed, PAL.medCrossRed, false);
    m.box(-8, 3.35, 13.6, 4.4, 0.35, 1.35, PAL.medCrossRed, PAL.medCrossRed, false);

    // 2. FLANKING 3-STORY OPD & SURGICAL WARD WINGS matching the real 12-vertex campus footprint!
    // West OPD & Emergency Wing facing MacArthur Hwy
    m.box(-38, -16, 0.35, 46, 30, 10.8, PAL.pureWhite, PAL.slateRoof);
    for (const fz of [3.8, 7.2]) {
      m.box(-38, -16, fz, 46.8, 30.8, 0.42, PAL.doveGrey, PAL.pureWhite, false);
      m.box(-61.15, -16, fz + 0.6, 0.45, 24, 1.9, PAL.windowDark, PAL.windowDark, false);
      m.box(-38, -31.15, fz + 0.6, 38, 0.45, 1.9, PAL.windowDark, PAL.windowDark, false);
    }
    // Cantilevered Emergency Ambulance Porte-Cochere facing MacArthur Hwy (-x)
    m.box(-65.5, -16, 4.1, 9.5, 16.5, 1.05, PAL.csiBlue, PAL.pureWhite);
    m.box(-70.35, -16, 4.22, 0.35, 1.1, 0.95, PAL.medCrossRed, PAL.medCrossRed, false);
    for (const py of [-22.5, -16, -9.5]) {
      m.prism(-69.2, py, 0.35, 0.42, 4.1, 0.38, 8, PAL.pureWhite, null, 0, false);
    }

    // East Inpatient Pavilion & Rooftop Medical Helipad Wing
    m.box(34, -10, 0.35, 52, 44, 11.2, PAL.alabaster, PAL.slateRoof);
    for (const fz of [3.8, 7.4]) {
      m.box(34, -10, fz, 52.8, 44.8, 0.42, PAL.pureWhite, PAL.pureWhite, false);
      m.box(34, -32.15, fz + 0.6, 44, 0.45, 1.9, PAL.tealGlass, PAL.tealGlass, false);
      m.box(60.15, -10, fz + 0.6, 0.45, 36, 1.9, PAL.tealGlass, PAL.tealGlass, false);
    }
    // Covered glazed skybridges connecting the Specialty Tower, OPD Wing & East Pavilion
    m.box(-32, 1.5, 4.2, 8.5, 12.0, 3.6, PAL.tealGlassHi, PAL.pureWhite);
    m.box(24, 10.5, 4.2, 16.0, 7.5, 3.6, PAL.tealGlassHi, PAL.pureWhite);

    // 3. ROOFTOP CIRCULAR MEDICAL HELIPAD ("H") on the East Pavilion roof!
    m.prism(36, -10, 11.55, 10.8, 12.0, 10.6, 16, PAL.darkStone, PAL.smRoofChar, 0, false);
    m.prism(36, -10, 12.0, 8.6, 12.08, 8.6, 16, PAL.helipadYel, PAL.helipadYel, 0, false);
    m.prism(36, -10, 12.08, 7.4, 12.14, 7.4, 16, PAL.smRoofChar, PAL.smRoofChar, 0, false);
    // Crisp white "H" marking on helipad
    m.box(33.5, -10, 12.14, 1.35, 6.8, 0.08, PAL.pureWhite, PAL.pureWhite, false);
    m.box(38.5, -10, 12.14, 1.35, 6.8, 0.08, PAL.pureWhite, PAL.pureWhite, false);
    m.box(36.0, -10, 12.14, 5.0, 1.35, 0.08, PAL.pureWhite, PAL.pureWhite, false);

    // Rooftop chillers, courtyard shade trees & parked ambulances/cars
    m.box(-10, 16, 18.3, 18, 7, 1.8, PAL.silverPanel, PAL.doveGrey, false);
    for (let i = 0; i < 5; i++) {
      addParkedCar(m, -66 + i * 5.2, -34, 0.36, false, carPalette[i % carPalette.length]);
    }
    for (const [tx, ty] of [[-58, 22], [-58, 6], [-4, -18], [4, -26], [56, 20]]) {
      addScaleTree(m, tx, ty, 1.05, PAL.treeLeafA);
    }
    return m;
  }

  /* =========================================================================
   * 8A3. LORMA MEDICAL CENTER — Exact 18-vertex 4,387 m² Carlatan Hospital Complex (lorma.jpg!)
   *      Crisp white 3-story healthcare wings, emerald-green ribbed mansard window awnings & cornice,
   *      tall arched glass stairwell bay, cantilevered white LORMA porte-cochere & palm entry island!
   * ========================================================================= */
  function buildLormaMedical(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    const carPalette = [PAL.carWhite, PAL.carSilver, PAL.carRed, PAL.carNavy];
    // Exact 18-vertex footprint in local rotated ENU (rotDeg = +12.7°):
    // Central-West Main Block u=-36..+18, v=-35..+14; East Wing u=+16..+60, v=-35..-10; North Wing u=-10..+24, v=+12..+31

    // 1. MAIN 3-STORY CRISP WHITE HOSPITAL BLOCK (facing West toward MacArthur Hwy, exact lorma.jpg!)
    m.box(-9, -10.5, 0, 54, 49, 11.4, PAL.pureWhite, PAL.alabaster);
    // 2. EAST 3-STORY INPATIENT & SURGICAL WING (matching exact east hospital wing u=+16..+60, v=-35..-10!)
    m.box(38, -22.5, 0, 44, 25, 11.0, PAL.pureWhite, PAL.alabaster);
    // 3. NORTH 3-STORY MEDICAL ARTS & DIAGNOSTIC WING (matching exact north wing u=-10..+24, v=+12..+31!)
    m.box(7, 21.5, 0, 34, 19, 11.0, PAL.pureWhite, PAL.alabaster);

    // Horizontal recessed dark-glass hospital window bands & SIGNATURE DEEP EMERALD-GREEN RIBBED MANSARD AWNINGS (lorma.jpg!)
    for (const fz of [4.2, 7.6]) {
      // West Main Frontage (facing highway / camera!)
      m.box(-36.15, -10.5, fz, 0.45, 42, 1.85, PAL.windowDark, PAL.windowDark, false);
      m.rectFrustum(-36.65, -10.5, fz + 1.65, 1.45, 43.5, fz + 2.45, 0.55, 42.6, PAL.mannaGreen, PAL.campusGreen);
      // South Frontage (spanning Main Block + East Wing = 96 m!)
      m.box(12, -35.15, fz, 92, 0.45, 1.85, PAL.windowDark, PAL.windowDark, false);
      m.rectFrustum(12, -35.65, fz + 1.65, 93.5, 1.45, fz + 2.45, 92.6, 0.55, PAL.mannaGreen, PAL.campusGreen);
      // North Wing Frontage & East Wing End
      m.box(7, 31.15, fz, 28, 0.45, 1.85, PAL.windowDark, PAL.windowDark, false);
      m.box(60.15, -22.5, fz, 0.45, 19, 1.85, PAL.windowDark, PAL.windowDark, false);
    }
    // SIGNATURE OVERHANGING DEEP EMERALD-GREEN MANSARD ROOF CORNICE wrapping ALL 3 WINGS!
    m.rectFrustum(-9, -10.5, 11.2, 56.4, 51.4, 12.8, 52.0, 47.0, PAL.mannaGreen, PAL.slateRoof);
    m.rectFrustum(38, -22.5, 10.8, 46.2, 27.2, 12.3, 42.2, 23.2, PAL.mannaGreen, PAL.slateRoof);
    m.rectFrustum(7, 21.5, 10.8, 36.2, 21.2, 12.3, 32.2, 17.2, PAL.mannaGreen, PAL.slateRoof);
    // Crisp white rooftop mechanical housing & stairwell bulkhead
    m.box(-4, -8, 12.8, 16, 12, 1.8, PAL.pureWhite, PAL.doveGrey, false);
    // Vertical crisp white masonry pilasters dividing the West & South window bays
    for (const py of [-28, -20, -2, 8]) {
      m.box(-36.2, py, 0, 0.85, 0.85, 11.2, PAL.pureWhite, PAL.alabaster, false);
    }
    for (let px = -28; px <= 52; px += 10.0) {
      m.box(px, -35.2, 0, 0.85, 0.85, 11.2, PAL.pureWhite, PAL.alabaster, false);
    }

    // 4. SIGNATURE TALL ARCHED DARK-GLASS STAIRWELL BAY & CANTILEVERED WHITE "LORMA" CANOPY (exact OSM vertex u=-40, v=-11!)
    m.box(-36.8, -11.0, 0, 3.6, 8.6, 12.4, PAL.pureWhite, PAL.mannaGreen);
    m.box(-38.68, -11.0, 4.5, 0.42, 4.6, 6.6, PAL.tealGlass, PAL.tealGlass, false);
    m.box(-38.74, -11.0, 11.1, 0.36, 3.0, 0.95, PAL.tealGlass, PAL.tealGlass, false);
    // Bold cantilevered pure-white porte-cochere canopy with emerald-green trim & crimson medical cross!
    m.box(-42.0, -11.0, 3.8, 9.6, 14.5, 1.18, PAL.pureWhite, PAL.alabaster);
    m.box(-46.88, -11.0, 4.05, 0.35, 12.0, 0.56, PAL.mannaGreen, PAL.mannaGreen, false);
    // Crisp crimson medical cross on both West porte-cochere fascia & South upper parapet!
    m.box(-46.96, -11.0, 4.25, 0.28, 1.75, 1.75, PAL.pureWhite, PAL.pureWhite, false);
    m.box(-47.04, -11.0, 4.55, 0.20, 0.38, 1.15, PAL.medCrossRed, PAL.medCrossRed, false);
    m.box(-47.04, -11.0, 4.92, 0.20, 1.15, 0.38, PAL.medCrossRed, PAL.medCrossRed, false);
    m.box(10, -35.8, 11.0, 4.4, 0.45, 4.4, PAL.pureWhite, PAL.pureWhite, false);
    m.box(10, -36.05, 11.55, 1.0, 0.30, 3.3, PAL.medCrossRed, PAL.medCrossRed, false);
    m.box(10, -36.05, 12.7, 3.3, 0.30, 1.0, PAL.medCrossRed, PAL.medCrossRed, false);
    for (const py of [-17.2, -4.8]) {
      m.prism(-45.4, py, 0, 0.40, 3.85, 0.35, 8, PAL.pureWhite, null, 0, false);
    }

    // Landscaped entry palm island, courtyard garden & parked ambulances/cars
    m.box(-46.5, 2.5, 0.05, 6.2, 10.5, 0.34, PAL.plinth, PAL.treeLeafA, false);
    addCoastalPalm(m, -46.5, -0.5, 1.05);
    addCoastalPalm(m, -46.5, 5.5, 1.00);
    addScaleTree(m, 34, 4, 1.08, PAL.treeLeafA);
    addScaleTree(m, 48, 2, 1.02, PAL.treeLeafB);
    for (let i = 0; i < 4; i++) {
      addParkedCar(m, -44.0, -21.0 - i * 4.4, 0.12, true, carPalette[i % carPalette.length]);
    }
    return m;
  }

  /* =========================================================================
   * 8A4. BETHANY HOSPITAL — Downtown Main Hospital Block + Modern Bethany Cancer Center Wing
   * ========================================================================= */
  function buildBethanyHospital(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Main 4-story hospital building along Widdoes St (exact 44 × 24 m north block!)
    m.box(0, 14, 0, 42, 22, 13.0, PAL.pureWhite, PAL.alabaster);
    for (const fz of [3.4, 6.6, 9.8]) {
      m.box(0, 14, fz, 42.8, 22.8, 0.40, PAL.doveGrey, PAL.pureWhite, false);
      m.box(0, 2.88, fz + 0.55, 36, 0.42, 1.85, PAL.tealGlass, PAL.tealGlass, false);
      m.box(0, 25.12, fz + 0.55, 36, 0.42, 1.85, PAL.tealGlass, PAL.tealGlass, false);
      m.box(-21.12, 14, fz + 0.55, 0.42, 17, 1.85, PAL.tealGlass, PAL.tealGlass, false);
    }
    // Heritage coastal-teal hipped roof on main hospital block + rooftop mechanical box
    m.rectFrustum(0, 14, 13.0, 43.6, 23.6, 15.6, 30.0, 10.0, PAL.mannaGreen, PAL.slateRoof);
    // Connected South Wing / Modern Bethany Cancer Center (exact 26 × 22 m south block!)
    m.box(-3, -13, 0, 26, 22, 11.4, PAL.alabaster, PAL.slateRoof);
    m.box(-3, -13, 11.2, 26.8, 22.8, 0.85, PAL.pureWhite, PAL.slateRoof, false);
    // Modern corner glass curtain wall & teal accent trim
    m.box(-16.12, -13, 2.8, 0.45, 16, 7.6, PAL.tealGlassHi, PAL.tealGlassHi, false);
    m.box(-3, -24.12, 2.8, 18, 0.45, 7.6, PAL.tealGlass, PAL.tealGlass, false);
    m.box(-16.25, -13, 10.6, 0.55, 18, 1.15, PAL.mannaGreen, PAL.mannaGreen, false);
    // Covered clinical walkway bridge between Main Hospital & Cancer Center
    m.box(-4, 0.5, 3.6, 10.5, 7.5, 3.4, PAL.tealGlassHi, PAL.pureWhite);
    // Cantilevered emergency drop-off canopy facing Widdoes St (-x) with crimson medical cross!
    m.box(-23.8, 13.5, 3.7, 6.2, 11.5, 0.95, PAL.pureWhite, PAL.mannaGreen);
    m.box(-27.0, 13.5, 3.9, 0.28, 1.5, 1.5, PAL.pureWhite, PAL.pureWhite, false);
    m.box(-27.1, 13.5, 4.18, 0.18, 0.34, 0.96, PAL.medCrossRed, PAL.medCrossRed, false);
    m.box(-27.1, 13.5, 4.48, 0.18, 0.96, 0.34, PAL.medCrossRed, PAL.medCrossRed, false);
    for (const py of [9.0, 18.0]) {
      m.prism(-26.1, py, 0, 0.36, 3.7, 0.32, 8, PAL.pureWhite, null, 0, false);
    }
    addScaleTree(m, -23.5, -2.5, 0.92, PAL.treeLeafA);
    return m;
  }

  /* =========================================================================
   * 8A5. UNION CHRISTIAN COLLEGE (UCC) — Photo-verified Widdoes St Campus (ucc_real.jpg!)
   *      4-story butter-cream & ivory halls, crisp horizontal floor bands,
   *      rhythmic teal-tinted multi-pane classroom windows & overhanging forest-green hipped eaves!
   * ========================================================================= */
  function buildUCC(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // East 4-story Main Academic Hall along Widdoes St (30 × 14 m, exact ucc_real.jpg!)
    m.box(10, 1, 0, 29, 14, 13.0, PAL.slcCream, PAL.alabaster);
    // Connected West 4-story Academic Wing (17 × 27 m)
    m.box(-13, 3, 0, 17, 27, 13.0, PAL.slcCream, PAL.alabaster);
    // Crisp white horizontal concrete floor ledges & teal-tinted multi-pane classroom windows!
    for (const fz of [3.2, 6.4, 9.6]) {
      m.box(10, 1, fz, 29.8, 14.8, 0.44, PAL.pureWhite, PAL.alabaster, false);
      m.box(-13, 3, fz, 17.8, 27.8, 0.44, PAL.pureWhite, PAL.alabaster, false);
      // East wing windows (South & North elevations)
      m.box(10, -6.12, fz + 0.52, 25.5, 0.38, 2.05, PAL.tealGlass, PAL.tealGlass, false);
      m.box(10, 8.12, fz + 0.52, 25.5, 0.38, 2.05, PAL.tealGlass, PAL.tealGlass, false);
      // West wing windows (West & East elevations)
      m.box(-21.62, 3, fz + 0.52, 0.38, 23.0, 2.05, PAL.tealGlass, PAL.tealGlass, false);
      m.box(-4.38, 3, fz + 0.52, 0.38, 23.0, 2.05, PAL.tealGlass, PAL.tealGlass, false);
    }
    // Vertical cream masonry classroom piers
    for (let px = -2; px <= 22; px += 4.8) {
      m.box(px, -6.18, 0, 0.65, 0.55, 13.0, PAL.pureWhite, PAL.slcCream, false);
      m.box(px, 8.18, 0, 0.65, 0.55, 13.0, PAL.pureWhite, PAL.slcCream, false);
    }
    // SIGNATURE OVERHANGING DEEP FOREST-GREEN HIPPED ROOF EAVES (exact ucc_real.jpg!)
    m.rectFrustum(10, 1, 12.95, 31.6, 16.6, 15.6, 19.5, 3.8, PAL.campusGreen, PAL.campusGreen);
    m.rectFrustum(-13, 3, 12.95, 19.6, 29.6, 15.6, 5.2, 16.5, PAL.campusGreen, PAL.campusGreen);
    // Covered collegiate entrance canopy along South court
    m.box(6, -8.2, 3.4, 9.0, 3.6, 0.72, PAL.campusGreen, PAL.pureWhite);
    addScaleTree(m, 3, -12.5, 0.88, PAL.treeLeafB);
    return m;
  }

  /* =========================================================================
   * 8A6. LA UNION MEDICAL DIAGNOSTIC CENTER (LUMDC) & SAVEMORE MARKET DOWNTOWN
   * ========================================================================= */
  function buildLUMDC(spec) {
    const m = new MeshBuilder(spec.rotDeg);
    const w = spec.w || 27, d = spec.d || 22, h = spec.h || 13.6;
    // Crisp 4-story pure-white & royal-blue medical diagnostic tower
    m.box(0, 0, 0, w, d, h - 1.1, PAL.pureWhite, PAL.alabaster);
    for (const fz of [3.4, 6.6, 9.8]) {
      m.box(0, 0, fz, w + 0.75, d + 0.75, 0.42, PAL.alabaster, PAL.pureWhite, false);
      m.box(0, 0, fz + 0.55, w + 0.25, d * 0.72, 1.85, PAL.tealGlass, PAL.tealGlass, false);
      m.box(0, 0, fz + 0.55, w * 0.72, d + 0.25, 1.85, PAL.tealGlass, PAL.tealGlass, false);
    }
    // Vertical cobalt-blue corner glass curtain fin + royal-blue parapet crown
    m.box(-w * 0.5 + 1.4, -d * 0.5 + 1.4, 0.4, 3.6, 3.6, h - 0.8, PAL.csiBlue, PAL.tealGlassHi);
    m.box(0, 0, h - 1.1, w + 0.85, d + 0.85, 1.15, PAL.csiBlue, PAL.slateRoof);
    // Cantilevered white emergency canopy & crisp crimson medical cross!
    m.box(0, -d * 0.5 - 1.8, 3.5, 11.5, 3.8, 0.82, PAL.pureWhite, PAL.csiBlue);
    m.box(0, -d * 0.5 - 0.45, h - 0.9, 2.2, 0.42, 2.2, PAL.pureWhite, PAL.pureWhite, false);
    m.box(0, -d * 0.5 - 0.58, h - 0.62, 0.44, 0.24, 1.55, PAL.medCrossRed, PAL.medCrossRed, false);
    m.box(0, -d * 0.5 - 0.58, h - 0.06, 1.55, 0.24, 0.44, PAL.medCrossRed, PAL.medCrossRed, false);
    return m;
  }

  function buildNedaRegion1(spec) {
    const m = new MeshBuilder(spec.rotDeg);
    const w = spec.w || 27.0, d = spec.d || 22.0, h = spec.h || 11.2;
    // Dignified 3-story Philippine regional government office building right beside Capitol Hill
    m.box(0, 0, 0, w, d, h - 0.8, PAL.pureWhite, PAL.alabaster);
    for (const fz of [3.5, 6.9]) {
      m.box(0, 0, fz, w + 0.7, d + 0.7, 0.42, PAL.doveGrey, PAL.pureWhite, false);
      m.box(0, 0, fz + 0.55, w + 0.24, d * 0.74, 1.85, PAL.tealGlass, PAL.tealGlass, false);
      m.box(0, 0, fz + 0.55, w * 0.74, d + 0.24, 1.85, PAL.tealGlass, PAL.tealGlass, false);
    }
    // Classical civic facade pilasters, blue-and-gold government fascia & pitched hipped roof
    for (const px of [-w * 0.35, 0, w * 0.35]) {
      m.box(px, -d * 0.5 - 0.15, 0, 0.85, 0.65, h - 0.8, PAL.pureWhite, PAL.alabaster, false);
      m.box(px, d * 0.5 + 0.15, 0, 0.85, 0.65, h - 0.8, PAL.pureWhite, PAL.alabaster, false);
    }
    m.box(0, 0, h - 0.8, w + 0.9, d + 0.9, 0.9, PAL.civicNavy, PAL.pureWhite, false);
    m.rectFrustum(0, 0, h + 0.1, w + 1.4, d + 1.4, h + 2.6, w * 0.64, d * 0.46, PAL.slateRoof, PAL.doveGrey);
    // Shaded entry portico canopy & civic flagpole
    m.box(0, -d * 0.5 - 1.9, 3.6, 9.6, 3.8, 0.75, PAL.pureWhite, PAL.civicNavy);
    m.prism(-3.6, -d * 0.5 - 3.2, 0, 0.32, 3.6, 0.28, 8, PAL.pureWhite, null, 0, false);
    m.prism(3.6, -d * 0.5 - 3.2, 0, 0.32, 3.6, 0.28, 8, PAL.pureWhite, null, 0, false);
    m.prism(0, -d * 0.5 - 5.4, 0, 0.10, 8.8, 0.06, 6, PAL.silverPanel, null, 0, false);
    return m;
  }

  function buildSavemore(spec) {
    const m = new MeshBuilder(spec.rotDeg);
    const w = spec.w || 35, d = spec.d || 24, h = spec.h || 9.4;
    // Crisp pure-white SM Savemore Market retail flagship
    m.box(0, 0, 0, w, d, h - 2.0, PAL.pureWhite, PAL.slateRoof);
    // Recessed dark-glazed supermarket frontage & cantilevered silver canopy
    m.box(0, -d * 0.5 - 0.12, 0.25, w * 0.82, 0.45, 3.4, PAL.windowDark, PAL.windowDark, false);
    m.box(-w * 0.5 - 0.12, 0, 0.25, 0.45, d * 0.72, 3.4, PAL.windowDark, PAL.windowDark, false);
    m.box(0, -d * 0.5 - 1.55, 3.7, w * 0.78, 3.1, 0.65, PAL.silverPanel, PAL.pureWhite);
    // Signature Savemore Market crimson-red & golden-yellow entrance fascia crown!
    m.box(0, 0, h - 2.0, w + 0.8, d + 0.8, 1.45, PAL.jbRed, PAL.slateRoof);
    m.box(0, 0, h - 2.38, w + 0.65, d + 0.65, 0.42, PAL.mcGold, PAL.mcGold, false);
    m.box(0, -d * 0.5 - 0.35, h - 1.9, w * 0.54, 0.65, 2.35, PAL.jbRed, PAL.mcGold, false);
    m.box(0, -d * 0.5 - 0.62, h - 1.35, w * 0.36, 0.30, 0.95, PAL.mcGold, PAL.mcGold, false);
    m.box(0, 0, h - 0.55, w * 0.42, d * 0.38, 1.15, PAL.silverPanel, PAL.doveGrey, false);
    return m;
  }

  /* =========================================================================
   * 8B. MANNA MALL — Photo-verified Pagdaraoan landmark (manna_1.jpg & manna_2.jpg!)
   *     Exact 79 × 93.6 m footprint: Emerald-teal Puregold wings + Golden cylindrical corner rotunda dome!
   * ========================================================================= */
  function buildMannaMall(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Main emerald-teal commercial mall wings (exact manna_1.jpg Puregold La Union facade!)
    m.box(0, 0, 0, 76, 90, 9.6, PAL.mannaGreen, PAL.slateRoof);
    // Recessed ground-floor retail storefronts & crisp cantilevered silver corrugated entrance canopy
    m.box(-38.2, 0, 0.2, 0.6, 76, 3.6, PAL.windowDark, PAL.windowDark, false);
    m.box(0, -45.2, 0.2, 62, 0.6, 3.6, PAL.windowDark, PAL.windowDark, false);
    m.box(-39.6, 4, 3.8, 3.6, 54, 0.72, PAL.silverPanel, PAL.pureWhite);
    m.box(-8, -46.6, 3.8, 50, 3.4, 0.72, PAL.silverPanel, PAL.pureWhite);
    // Signature projecting white/silver horizontal decorative accent bars & Puregold upper highlight frame (manna_2.jpg!)
    for (const tz of [5.2, 6.6, 8.0]) {
      m.box(-38.4, 24, tz, 0.7, 3.2, 0.48, PAL.pureWhite, PAL.alabaster, false);
      m.box(-38.4, -2, tz, 0.7, 3.2, 0.48, PAL.pureWhite, PAL.alabaster, false);
    }
    m.box(-38.3, 11, 5.2, 0.5, 19.5, 3.6, PAL.treeLeafB, PAL.mannaGreen, false);
    // Top roof parapet & skylight strip
    m.box(4, 2, 9.6, 54, 66, 1.4, PAL.alabaster, PAL.doveGrey);
    m.gableY(4, 2, 11.0, 26, 54, 2.4, PAL.slateRoof, PAL.pureWhite);

    // ICONIC GOLDEN-YELLOW CYLINDRICAL CORNER ROTUNDA TOWER & RIBBED SILVER-BLUE DOME (manna_1.jpg!)
    const rx = -31.0, ry = -37.0;
    m.prism(rx, ry, 0, 12.2, 13.6, 12.2, 16, PAL.mannaGold, PAL.alabaster);
    // Recessed glass clerestory drum & bold yellow cornice crown
    m.prism(rx, ry, 4.0, 12.5, 5.6, 12.5, 16, PAL.tealGlass, null, 0, false);
    m.prism(rx, ry, 11.4, 12.5, 12.8, 12.5, 16, PAL.tealGlassHi, null, 0, false);
    m.prism(rx, ry, 13.6, 12.8, 14.5, 12.8, 16, PAL.mannaGold, PAL.pureWhite);
    // Ribbed curved silver-blue skylight dome capping the rotunda!
    m.dome(rx, ry, 14.5, 11.8, 4.4, 14, 5, PAL.slateRoof);
    return m;
  }

  /* =========================================================================
   * 8C. CSI CITY MALL LA UNION — Exact 96 × 140 m flagship retail hub in Brgy. Biday
   * ========================================================================= */
  function buildCSIMall(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Flagship warm-cream & crisp white 3-story mall massing enveloping real 94 × 138 m footprint
    m.box(0, 0, 0, 94, 138, 9.6, PAL.warmCream, PAL.alabaster);
    m.box(0, 0, 9.6, 96, 140, 1.3, PAL.pureWhite, PAL.doveGrey);
    // Shaded perimeter ground commercial colonnade along West & South highway frontages
    m.box(-47.2, 0, 0.2, 0.6, 124, 3.6, PAL.windowDark, PAL.windowDark, false);
    m.box(0, -69.2, 0.2, 82, 0.6, 3.6, PAL.windowDark, PAL.windowDark, false);
    for (let cy = -56; cy <= 56; cy += 11.2) {
      m.box(-47.5, cy, 0.2, 1.0, 1.2, 3.8, PAL.pureWhite, PAL.alabaster, false);
    }
    // SIGNATURE CSI ROYAL-BLUE & GOLDEN-YELLOW SWEEPING ENTRANCE FASCIA & GLAZED CENTRAL PORTICO!
    m.box(-48.6, 0, 0.4, 4.8, 36, 9.4, PAL.tealGlass, PAL.pureWhite);
    m.box(-50.5, 0, 8.8, 5.2, 46, 2.3, PAL.csiBlue, PAL.pureWhite);
    m.box(-50.9, 0, 11.1, 4.8, 42, 0.85, PAL.mcGold, PAL.mcGold, false);
    // Secondary south CSI entrance canopy
    m.box(-6, -70.6, 0.4, 32, 4.2, 8.4, PAL.tealGlass, PAL.pureWhite);
    m.box(-6, -71.8, 8.0, 38, 4.4, 2.1, PAL.csiBlue, PAL.mcGold);
    // Multi-bay pitched corrugated silver-slate supermarket roof halls with ventilation clerestories
    for (const cy of [-42, -14, 14, 42]) {
      m.gableX(4, cy, 10.9, 82, 24, 3.4, PAL.slateRoof, PAL.pureWhite);
      m.box(4, cy, 14.1, 68, 3.4, 1.0, PAL.windowDark, PAL.silverPanel, false);
    }
    return m;
  }

  /* =========================================================================
   * 8D. TASKUS LA UNION — Exact 25.9 × 22.9 m sleek 4-story tech/BPO hub (MacArthur Hwy, Sevilla)
   * ========================================================================= */
  function buildTaskUs(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Sleek dark charcoal-slate & crisp cool-white 4-story tech office massing
    m.box(0, 0, 0, 25.6, 22.4, 14.2, PAL.mcCharcoal, PAL.slateDark);
    // Full-height reflective blue-teal glass curtain walls across all 4 elevations with aluminum floor spandrels
    m.box(0, 0, 0.5, 25.9, 19.6, 12.6, PAL.tealGlassHi, PAL.tealGlass, false);
    m.box(0, 0, 0.5, 22.8, 22.7, 12.6, PAL.tealGlassHi, PAL.tealGlass, false);
    for (const fz of [3.5, 6.8, 10.1, 13.4]) {
      m.box(0, 0, fz, 26.4, 23.2, 0.52, PAL.pureWhite, PAL.silverPanel, false);
    }
    // Signature vertical TaskUs bold vibrant coral-magenta & cobalt architectural corner fin + cantilevered glass entry canopy!
    m.box(-13.3, -6.5, 0, 1.4, 3.6, 15.6, PAL.taskCoral, PAL.taskCoral);
    m.box(-13.3, -2.5, 0, 1.1, 1.8, 15.2, PAL.csiBlue, PAL.csiBlue, false);
    m.box(-14.6, 3.5, 3.5, 3.6, 9.6, 0.45, PAL.pureWhite, PAL.tealGlassHi);
    // Recessed rooftop lounge deck & sleek mechanical screen
    m.box(2.5, 1.5, 14.2, 13.0, 10.5, 1.7, PAL.silverPanel, PAL.slateRoof);
    return m;
  }

  /* =========================================================================
   * 8E. SAINT LOUIS COLLEGE (SLC) — Photo-verified Carlatan campus (slc.jpg!)
   *     Exact 86.5 × 70.2 m U-quadrangle + Butter-cream louver entrance gate + Parish Church + Arched Covered Gym
   * ========================================================================= */
  function buildSLC(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // 1. 3-STORY BUTTER-CREAM & WHITE U-SHAPED ACADEMIC QUADRANGLE enclosing lush treed central courtyard (86 × 70 m!)
    // North wing, East back wing, South wing (open West toward MacArthur Hwy & iconic entrance gate!)
    m.box(4, 27, 0, 74, 15.5, 10.2, PAL.slcCream, PAL.alabaster);
    m.box(34, 0, 0, 16.5, 68, 10.6, PAL.slcCream, PAL.alabaster);
    m.box(4, -27, 0, 74, 15.5, 10.2, PAL.slcCream, PAL.alabaster);
    // Horizontal white concrete corridor sun-ledges & shaded recessed classroom galleries across all 3 wings
    for (const fz of [3.4, 6.8]) {
      m.box(4, 27, fz, 74.8, 16.3, 0.48, PAL.pureWhite, PAL.alabaster, false);
      m.box(34, 0, fz, 17.3, 68.8, 0.48, PAL.pureWhite, PAL.alabaster, false);
      m.box(4, -27, fz, 74.8, 16.3, 0.48, PAL.pureWhite, PAL.alabaster, false);
      m.box(4, 27, fz + 0.6, 74.3, 15.8, 1.75, PAL.windowDark, PAL.windowDark, false);
      m.box(34, 0, fz + 0.6, 16.8, 68.3, 1.75, PAL.windowDark, PAL.windowDark, false);
      m.box(4, -27, fz + 0.6, 74.3, 15.8, 1.75, PAL.windowDark, PAL.windowDark, false);
    }
    // Pitched terracotta-maroon institutional campus roofs over all 3 quadrangle wings
    m.gableX(4, 27, 10.2, 75.5, 16.8, 3.0, PAL.slcMaroon, PAL.slcCream);
    m.gableY(34, 0, 10.6, 17.8, 69.5, 3.2, PAL.slcMaroon, PAL.slcCream);
    m.gableX(4, -27, 10.2, 75.5, 16.8, 3.0, PAL.slcMaroon, PAL.slcCream);

    // 2. ICONIC BUTTER-CREAM CONCRETE PERGOLA ENTRANCE GATE WITH WHITE ROOF-FIN LOUVERS (exact slc.jpg!)
    const gx = -38.5;
    m.box(gx, -11.5, 0, 3.4, 5.2, 6.2, PAL.slcCream, PAL.pureWhite);
    m.box(gx, 11.5, 0, 3.4, 5.2, 6.2, PAL.slcCream, PAL.pureWhite);
    m.box(gx, 0, 5.2, 3.6, 28.0, 1.65, PAL.slcCream, PAL.pureWhite);
    // Signature row of white angled concrete roof-fin louvers crowning the entrance gate (slc.jpg!)
    for (let ly = -12.0; ly <= 12.0; ly += 2.2) {
      m.box(gx, ly, 6.85, 4.8, 0.45, 0.85, PAL.pureWhite, PAL.alabaster, false);
    }

    // 3. SLC PARISH CHURCH (verified North footprint ~35 × 20 m at [120.312964, 16.637212] -> local [-25, +66])
    m.box(-25, 64, 0, 34, 19.5, 8.6, PAL.pureWhite, PAL.alabaster);
    m.gableX(-25, 64, 8.6, 35.2, 20.6, 4.4, PAL.slcMaroon, PAL.pureWhite);
    m.box(-41.5, 64, 0, 3.4, 5.2, 15.2, PAL.pureWhite, PAL.doveGrey);
    m.box(-41.5, 64, 15.2, 0.5, 0.5, 2.4, PAL.mcGold, PAL.mcGold, false);
    m.box(-41.5, 64, 16.4, 0.5, 1.8, 0.45, PAL.mcGold, PAL.mcGold, false);

    // 4. CURVED-ROOF COVERED GYMNASIUM / AUDITORIUM (verified South footprint 56.8 × 40.6 m -> local [-10, -66], seen in slc.jpg!)
    m.box(-10, -66, 0, 54, 38, 7.6, PAL.alabaster, PAL.doveGrey);
    m.archSpan(-10, -66, 7.4, 55, 39, 5.2, 0.75, 10, PAL.pureWhite);

    // 5. Lush campus courtyard trees
    for (const [tx, ty] of [[-12, 8], [-12, -8], [8, 10], [8, -10], [18, 0]]) {
      addScaleTree(m, tx, ty, 1.15, PAL.treeLeafA);
    }
    return m;
  }

  /* =========================================================================
   * 8F. DMMMSU – MID LA UNION CAMPUS — Photo-verified Catbangen campus (dmmmsu.jpg!)
   *     Iconic terracotta-brick & cream castellated gatehouse tower + sandstone academic halls & green/red roofs
   * ========================================================================= */
  function buildDMMMSU(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // 1. ICONIC TERRACOTTA-BRICK & CREAM CASTELLATED (BATTLEMENTED) GATEHOUSE TOWER along Quezon Ave (exact dmmmsu.jpg!)
    const gx = 20.0, gy = -4.0;
    m.box(gx, gy, 0, 6.2, 13.0, 4.4, PAL.dmmmsuBrick, PAL.slcCream);
    m.box(gx, gy, 0.2, 6.5, 4.2, 3.4, PAL.windowDark, PAL.windowDark, false);
    // Battlemented upper cream parapet & central notched gatehouse watchtower (dmmmsu.jpg!)
    m.box(gx, gy, 4.4, 6.6, 13.6, 0.85, PAL.slcCream, PAL.pureWhite);
    m.box(gx, gy, 5.25, 5.2, 6.6, 2.8, PAL.dmmmsuBrick, PAL.slcCream);
    m.box(gx, gy, 8.05, 5.6, 7.0, 0.75, PAL.slcCream, PAL.pureWhite);
    for (let my = -2.8; my <= 2.8; my += 1.4) {
      m.box(gx + 2.5, gy + my, 8.8, 0.5, 0.65, 0.6, PAL.slcCream, PAL.pureWhite, false);
      m.box(gx - 2.5, gy + my, 8.8, 0.5, 0.65, 0.6, PAL.slcCream, PAL.pureWhite, false);
    }

    // 2. NORTH ACADEMIC HALL (verified 34.3 × 14.4 m footprint -> local [0, +22])
    m.box(0, 22, 0, 34, 14.2, 10.0, PAL.warmCream, PAL.alabaster);
    for (const fz of [3.3, 6.6]) {
      m.box(0, 22, fz + 0.6, 34.3, 14.5, 1.65, PAL.windowDark, PAL.windowDark, false);
      m.box(0, 22, fz, 34.8, 15.0, 0.45, PAL.pureWhite, PAL.alabaster, false);
    }
    m.gableX(0, 22, 10.0, 35.2, 15.2, 2.9, PAL.campusGreen, PAL.warmCream);

    // 3. MAIN CENTRAL ACADEMIC / COLLEGE OF LAW COMPLEX (verified 33.2 × 29.3 m footprint -> local [-2, -2], seen in dmmmsu.jpg!)
    m.box(-4, -2, 0, 31, 26, 10.4, PAL.warmCream, PAL.alabaster);
    for (const fz of [3.4, 6.8]) {
      m.box(-4, -2, fz + 0.6, 31.3, 26.3, 1.7, PAL.windowDark, PAL.windowDark, false);
      m.box(-4, -2, fz, 31.8, 26.8, 0.48, PAL.pureWhite, PAL.alabaster, false);
    }
    // Classical sandstone front entrance portico facing gatehouse
    m.box(12.2, -2, 0, 3.6, 10.5, 10.6, PAL.slcCream, PAL.pureWhite);
    m.box(14.1, -2, 0.2, 0.5, 6.2, 3.4, PAL.windowDark, PAL.windowDark, false);
    m.rectFrustum(-4, -2, 10.4, 32.4, 27.4, 13.4, 18.0, 12.0, PAL.dmmmsuBrick, PAL.doveGrey);

    // 4. Campus trees along entrance plaza
    for (const [tx, ty] of [[16, 12], [16, -16], [-24, 12], [-24, -14]]) {
      addScaleTree(m, tx, ty, 1.15, PAL.treeLeafB);
    }
    return m;
  }

  function buildDMMMSUSouth(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // DMMMSU-MLUC South Main Administration & Engineering Wing (exact 68.9 × 17.8 m footprint at [120.315569, 16.606694])
    m.box(0, 0, 0, 68, 17.4, 10.4, PAL.warmCream, PAL.alabaster);
    for (const fz of [3.4, 6.8]) {
      m.box(0, 0, fz + 0.6, 68.3, 17.7, 1.75, PAL.windowDark, PAL.windowDark, false);
      m.box(0, 0, fz, 68.8, 18.2, 0.48, PAL.pureWhite, PAL.alabaster, false);
    }
    // Prominent central sandstone civic pediment entrance
    m.box(0, -9.2, 0, 14.5, 3.2, 11.2, PAL.slcCream, PAL.pureWhite);
    m.gableY(0, -9.2, 11.2, 15.2, 3.8, 2.2, PAL.campusGreen, PAL.slcCream);
    m.gableX(0, 0, 10.4, 69.2, 18.6, 3.4, PAL.campusGreen, PAL.warmCream);
    return m;
  }

  /* =========================================================================
   * 8G. LA UNION NATIONAL HIGH SCHOOL (LUNHS) — Heritage Gabaldon + DepEd Modern Campus (Catbangen)
   *     Exact footprints: 67.6 × 10.8 m Heritage Wing + 45.2 × 15 m East Hall + Covered Court
   * ========================================================================= */
  function buildLUNHS(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // 1. HERITAGE GABALDON-STYLE ELEVATED SCHOOL PAVILION (exact 67.6 × 10.8 m North wing -> local [-24, +19])
    // Coral-stone / masonry heritage ground plinth + tall bright white walls + rhythmic tall classroom windows!
    m.box(-22, 19, 0, 66, 10.6, 1.6, PAL.ruinStone, PAL.alabaster);
    m.box(-22, 19, 1.6, 65.5, 10.4, 4.8, PAL.pureWhite, PAL.alabaster);
    for (let wx = -50; wx <= 6; wx += 4.6) {
      m.box(wx, 19, 2.2, 2.6, 10.72, 3.0, PAL.windowDark, PAL.windowDark, false);
    }
    // Classical central Gabaldon pedimented front entrance portico
    m.box(-22, 13.0, 0, 11.5, 3.2, 6.6, PAL.pureWhite, PAL.alabaster);
    m.gableY(-22, 13.0, 6.6, 12.2, 3.8, 2.2, PAL.dmmmsuBrick, PAL.pureWhite);
    // High overhanging dark-terracotta heritage Gabaldon hipped roof!
    m.rectFrustum(-22, 19, 6.4, 68.5, 12.6, 9.8, 56.0, 1.6, PAL.dmmmsuBrick, PAL.dmmmsuBrick);

    // 2. 3-STORY DEPED CREAM & FOREST-GREEN ACADEMIC WING (exact 45.2 × 15.0 m East hall -> local [+36, -1])
    m.box(35, -1, 0, 14.6, 44.5, 10.2, PAL.slcCream, PAL.alabaster);
    for (const fz of [3.4, 6.8]) {
      m.box(35, -1, fz + 0.6, 14.9, 44.8, 1.75, PAL.windowDark, PAL.windowDark, false);
      m.box(35, -1, fz, 15.6, 45.4, 0.48, PAL.campusGreen, PAL.pureWhite, false);
    }
    m.gableY(35, -1, 10.2, 15.8, 45.8, 3.0, PAL.campusGreen, PAL.slcCream);

    // 3. CAMPUS COVERED COURT PAVILION (exact 26.3 × 19.3 m footprint -> local [-20, +46])
    m.box(-18, 44, 0, 25, 18.5, 5.4, PAL.alabaster, PAL.doveGrey);
    m.archSpan(-18, 44, 5.2, 26, 19.5, 3.4, 0.6, 8, PAL.campusGreen);

    // Heritage campus acacia shade trees framing the central quadrangle
    for (const [tx, ty] of [[-12, 4], [8, 4], [14, -14], [-34, 4]]) {
      addScaleTree(m, tx, ty, 1.25, PAL.treeLeafA);
    }
    return m;
  }

  /* =========================================================================
   * 8H. SIGNATURE COMMERCIAL FLAGSHIPS: MCDONALD'S, JOLLIBEE & MAJOR SAN FERNANDO BANKS
   * ========================================================================= */
  function buildMcDo(spec) {
    const m = new MeshBuilder(spec.rotDeg);
    const w = spec.w, d = spec.d, h = spec.h || 7.2;
    // Modern Philippine McDonald's architecture: warm cream-stone lower massing + charcoal-espresso parapet crown
    m.box(0, 0, 0, w, d, h - 1.5, PAL.warmCream, PAL.alabaster);
    m.box(0, 0, h - 1.5, w + 0.7, d + 0.7, 1.6, PAL.mcCharcoal, PAL.slateDark);
    // Wrap-around floor-to-ceiling tinted glass dining hall
    m.box(0, 0, 0.3, w + 0.25, d * 0.78, Math.min(3.6, h - 2.2), PAL.windowDark, PAL.windowDark, false);
    m.box(0, 0, 0.3, w * 0.78, d + 0.25, Math.min(3.6, h - 2.2), PAL.windowDark, PAL.windowDark, false);
    // Warm vertical timber-slat accent panel + cantilevered GOLDEN-YELLOW entrance portal canopy!
    m.box(-w * 0.16, -d * 0.5 - 0.18, 0.4, w * 0.34, 0.42, h - 1.4, PAL.mcWood, PAL.mcWood, false);
    m.box(w * 0.18, -d * 0.5 - 0.9, 3.4, w * 0.36, 2.2, 0.58, PAL.mcGold, PAL.mcGold);
    // Iconic sleek golden-yellow rooftop accent fin / beacon on the charcoal parapet
    m.box(w * 0.24, -d * 0.5 - 0.42, h - 1.1, 2.8, 0.35, 1.35, PAL.mcGold, PAL.mcGold, false);
    m.box(-w * 0.24, d * 0.5 + 0.42, h - 1.1, 2.8, 0.35, 1.35, PAL.mcGold, PAL.mcGold, false);
    if (h >= 7.5) {
      m.box(0, 0, 3.6, w + 0.5, d + 0.5, 0.42, PAL.mcCharcoal, PAL.alabaster, false);
      m.box(0, 0, 4.2, w + 0.22, d * 0.74, 1.8, PAL.windowDark, PAL.windowDark, false);
    }
    return m;
  }

  function buildJollibee(spec) {
    const m = new MeshBuilder(spec.rotDeg);
    const w = spec.w, d = spec.d, h = spec.h || 7.2;
    // Signature Philippine Jollibee flagship: crisp ivory-cream masonry + bold CRIMSON-RED wrap-around fascia crown!
    m.box(0, 0, 0, w, d, h - 1.8, PAL.pureWhite, PAL.alabaster);
    m.box(0, 0, h - 1.8, w + 0.8, d + 0.8, 1.9, PAL.jbRed, PAL.slateRoof);
    // Signature crisp golden-yellow horizontal stripe directly below the crimson fascia
    m.box(0, 0, h - 2.15, w + 0.6, d + 0.6, 0.36, PAL.mcGold, PAL.mcGold, false);
    // Stepped crimson corner entrance tower / signage parapet
    m.box(w * 0.24, -d * 0.22, h + 0.1, Math.min(7.5, w * 0.36), Math.min(6.0, d * 0.44), 1.45, PAL.jbRed, PAL.pureWhite);
    // Wrap-around glazed ground-floor dining frontage beneath a red-trimmed awning canopy
    m.box(0, 0, 0.25, w + 0.25, d * 0.78, Math.min(3.3, h - 2.5), PAL.windowDark, PAL.windowDark, false);
    m.box(0, 0, 0.25, w * 0.78, d + 0.25, Math.min(3.3, h - 2.5), PAL.windowDark, PAL.windowDark, false);
    m.box(0, -d * 0.5 - 0.8, 3.25, w * 0.66, 1.9, 0.48, PAL.jbRed, PAL.pureWhite);
    if (h >= 7.5) {
      m.box(0, 0, 3.7, w + 0.22, d * 0.72, 1.65, PAL.windowDark, PAL.windowDark, false);
    }
    return m;
  }

  function buildBankBranch(spec) {
    const m = new MeshBuilder(spec.rotDeg);
    const w = spec.w, d = spec.d, h = spec.h || 7.4;
    const accent = PAL[spec.accent] || PAL.bankNavy;
    const trim = PAL[spec.trim] || PAL.pureWhite;
    const body = PAL[spec.body] || PAL.alabaster;
    // Dignified Philippine commercial bank architecture: crisp stone-and-glass hall + corner pilasters + corporate fascia!
    m.box(0, 0, 0, w, d, h - 1.25, body, PAL.alabaster);
    // Recessed tinted glass banking hall & ATM vestibule across front & side facades
    m.box(0, 0, 0.35, w + 0.24, d * 0.72, 3.2, PAL.windowDark, PAL.windowDark, false);
    m.box(0, 0, 0.35, w * 0.72, d + 0.24, 3.2, PAL.windowDark, PAL.windowDark, false);
    // Upper floor ribbon glass + crisp structural floor ledge
    if (h >= 6.8) {
      m.box(0, 0, 3.55, w + 0.45, d + 0.45, 0.42, PAL.pureWhite, PAL.alabaster, false);
      m.box(0, 0, 4.15, w + 0.22, d * 0.74, Math.max(1.5, h - 5.65), PAL.tealGlass, PAL.tealGlass, false);
      m.box(0, 0, 4.15, w * 0.74, d + 0.22, Math.max(1.5, h - 5.65), PAL.tealGlass, PAL.tealGlass, false);
    }
    // Crisp classical/modern corner stone piers framing the banking hall
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      m.box(sx * (w * 0.5 - 0.8), sy * (d * 0.5 - 0.8), 0, 1.9, 1.9, h - 1.15, PAL.pureWhite, PAL.alabaster, false);
    }
    // Tasteful corporate bank header fascia crown + trim hairline & recessed rooftop HVAC penthouse
    m.box(0, 0, h - 1.25, w + 0.7, d + 0.7, 1.3, accent, PAL.slateRoof);
    m.box(0, 0, h - 1.52, w + 0.55, d + 0.55, 0.28, trim, trim, false);
    m.box(0, 0, h + 0.05, Math.min(8.5, w * 0.38), Math.min(6.0, d * 0.38), 1.2, PAL.silverPanel, PAL.doveGrey, false);
    return m;
  }

  const EXTRA_DOWNTOWN_MODELS = [
    { id: 'quezon-overpass', lng: 120.316590, lat: 16.615418, rotDeg: -7.5, kind: 'overpass', minZoom: 15.2 },
    { id: 'st-william-pastoral', lng: 120.317627, lat: 16.615477, rotDeg: -13.1, kind: 'pastoral', minZoom: 15.0, exclR: 20 },
    { id: 'dmmmsu-south-hall', lng: 120.315569, lat: 16.606694, rotDeg: 9.0, kind: 'dmmmsu_south', minZoom: 15.0, exclR: 24 },
    // McDonald's branches (exact OSM footprints!)
    { id: 'mcdo-rizal', lng: 120.316492, lat: 16.616405, rotDeg: -12.4, w: 26.0, d: 21.0, h: 8.2, kind: 'mcdo', minZoom: 15.0, exclR: 13 },
    { id: 'mcdo-catbangen', lng: 120.316722, lat: 16.609781, rotDeg: 0, w: 24.5, d: 21.5, h: 6.8, kind: 'mcdo', minZoom: 15.0, exclR: 14 },
    { id: 'mcdo-carlatan', lng: 120.312346, lat: 16.635549, rotDeg: 22.2, w: 30.5, d: 13.4, h: 6.8, kind: 'mcdo', minZoom: 15.0, exclR: 14 },
    // Jollibee branches (exact OSM footprints!)
    { id: 'jollibee-plaza', lng: 120.316357, lat: 16.615593, rotDeg: -8.1, w: 31.8, d: 11.8, h: 8.2, kind: 'jollibee', minZoom: 15.0, exclR: 12 },
    { id: 'jollibee-rizal', lng: 120.316998, lat: 16.617937, rotDeg: -13.9, w: 16.4, d: 14.8, h: 6.8, kind: 'jollibee', minZoom: 15.0, exclR: 10 },
    { id: 'jollibee-sevilla', lng: 120.318394, lat: 16.602088, rotDeg: 5.5, w: 17.6, d: 16.8, h: 6.8, kind: 'jollibee', minZoom: 15.0, exclR: 11 },
    { id: 'jollibee-carlatan', lng: 120.311907, lat: 16.636634, rotDeg: 20.7, w: 25.0, d: 15.4, h: 6.8, kind: 'jollibee', minZoom: 15.0, exclR: 12 },
    // Major San Fernando Banks (exact OSM footprints — Downtown Rizal/Quezon Ave & Bank Row!)
    { id: 'bank-bdo-plaza', lng: 120.316326, lat: 16.615495, rotDeg: -7.9, w: 32.2, d: 9.6, h: 7.4, accent: 'bankNavy', trim: 'mcGold', body: 'pureWhite', kind: 'bank', minZoom: 15.2, exclR: 10 },
    { id: 'bank-bdo-rizal', lng: 120.315190, lat: 16.616662, rotDeg: -14.9, w: 23.8, d: 15.0, h: 7.4, accent: 'bankNavy', trim: 'mcGold', body: 'pureWhite', kind: 'bank', minZoom: 15.2, exclR: 12 },
    { id: 'bank-pnb-rizal', lng: 120.316437, lat: 16.616188, rotDeg: -11.1, w: 18.4, d: 20.4, h: 7.6, accent: 'csiBlue', trim: 'mcGold', body: 'alabaster', kind: 'bank', minZoom: 15.2, exclR: 11 },
    { id: 'bank-bpi-rizal', lng: 120.316971, lat: 16.617793, rotDeg: -13.6, w: 10.4, d: 14.4, h: 7.2, accent: 'slcMaroon', trim: 'warmCream', body: 'warmCream', kind: 'bank', minZoom: 15.2, exclR: 9 },
    { id: 'bank-bpi-quezon', lng: 120.316424, lat: 16.612138, rotDeg: 4.7, w: 20.5, d: 16.8, h: 7.8, accent: 'slcMaroon', trim: 'warmCream', body: 'warmCream', kind: 'bank', minZoom: 15.2, exclR: 11 },
    { id: 'bank-rcbc-ortega', lng: 120.317416, lat: 16.617793, rotDeg: -19.5, w: 25.0, d: 9.6, h: 7.4, accent: 'bridgeBlue', trim: 'silverPanel', body: 'pureWhite', kind: 'bank', minZoom: 15.2, exclR: 10 },
    { id: 'bank-landbank-quezon', lng: 120.316688, lat: 16.613116, rotDeg: 3.3, w: 19.2, d: 13.5, h: 7.8, accent: 'campusGreen', trim: 'mcGold', body: 'alabaster', kind: 'bank', minZoom: 15.2, exclR: 10 },
    { id: 'bank-landbank-north', lng: 120.317078, lat: 16.620276, rotDeg: 14.6, w: 22.4, d: 14.4, h: 8.6, accent: 'campusGreen', trim: 'mcGold', body: 'alabaster', kind: 'bank', minZoom: 15.2, exclR: 11 },
    { id: 'bank-metrobank-quezon', lng: 120.316396, lat: 16.612313, rotDeg: 5.2, w: 18.8, d: 16.8, h: 7.8, accent: 'bankNavy', trim: 'silverPanel', body: 'pureWhite', kind: 'bank', minZoom: 15.2, exclR: 11 },
    { id: 'bank-metrobank-north', lng: 120.316700, lat: 16.619345, rotDeg: 8.5, w: 22.8, d: 11.4, h: 7.4, accent: 'bankNavy', trim: 'silverPanel', body: 'pureWhite', kind: 'bank', minZoom: 15.2, exclR: 10 },
    { id: 'bank-chinabank-north', lng: 120.316613, lat: 16.620052, rotDeg: 8.3, w: 23.2, d: 13.5, h: 7.8, accent: 'jbRed', trim: 'mcGold', body: 'warmCream', kind: 'bank', minZoom: 15.2, exclR: 11 },
    { id: 'bank-rangay-hq', lng: 120.316738, lat: 16.614166, rotDeg: -0.9, w: 32.0, d: 36.8, h: 8.4, accent: 'campusGreen', trim: 'slcCream', body: 'warmCream', kind: 'bank', minZoom: 15.2, exclR: 18 },
    { id: 'bank-security-quezon', lng: 120.316248, lat: 16.612897, rotDeg: 4.2, w: 30.2, d: 18.8, h: 8.0, accent: 'tealGlass', trim: 'silverPanel', body: 'pureWhite', kind: 'bank', minZoom: 15.2, exclR: 14 },
    { id: 'bank-eastwest-quezon', lng: 120.316247, lat: 16.612682, rotDeg: 5.6, w: 34.4, d: 16.8, h: 8.0, accent: 'smAccent', trim: 'silverPanel', body: 'pureWhite', kind: 'bank', minZoom: 15.2, exclR: 14 },
    // Key Downtown Medical, Civic & Retail Anchors (exact OSM footprints!)
    { id: 'lumdc-hospital', lng: 120.315692, lat: 16.614768, rotDeg: -4.6, w: 21.5, d: 14.4, h: 13.6, kind: 'lumdc', minZoom: 15.0, exclR: 13 },
    { id: 'savemore-downtown', lng: 120.314054, lat: 16.616936, rotDeg: -11.9, w: 30.5, d: 19.5, h: 9.4, kind: 'savemore', minZoom: 15.0, exclR: 16 },
    { id: 'neda-region1', lng: 120.318329, lat: 16.611917, rotDeg: -24.2, w: 27.0, d: 22.0, h: 11.2, kind: 'neda', minZoom: 15.0, exclR: 16 }
  ];

  // Footprint exclusion zones for city-buildings.js (suppresses generic box extrusion only; picking stays 100% intact!)
  const SCULPTED_FOOTPRINT_EXCLUSIONS = [
    // Provincial Capitol, Hospitals & UCC full envelopes
    { lng: 120.318360, lat: 16.612973, radiusM: 46 },
    { lng: 120.320359, lat: 16.588327, radiusM: 72 },
    { lng: 120.318050, lat: 16.631657, radiusM: 58 },
    { lng: 120.317680, lat: 16.614180, radiusM: 34 },
    { lng: 120.317380, lat: 16.614890, radiusM: 25 },
    // Campus sub-buildings covered by multi-wing SLC, DMMMSU & LUNHS models
    { lng: 120.313311, lat: 16.636644, radiusM: 52 },
    { lng: 120.312964, lat: 16.637212, radiusM: 22 },
    { lng: 120.313340, lat: 16.636045, radiusM: 32 },
    { lng: 120.314512, lat: 16.613814, radiusM: 28 },
    { lng: 120.314527, lat: 16.614020, radiusM: 18 },
    { lng: 120.314620, lat: 16.612580, radiusM: 32 },
    { lng: 120.315202, lat: 16.612399, radiusM: 24 },
    { lng: 120.314664, lat: 16.612831, radiusM: 18 },
    // Manna Mall, CSI City Mall, TaskUs, SM City & Robinsons full envelopes
    { lng: 120.319201, lat: 16.626851, radiusM: 48 },
    { lng: 120.322620, lat: 16.629299, radiusM: 70 },
    { lng: 120.317452, lat: 16.608144, radiusM: 16 },
    { lng: 120.322724, lat: 16.625585, radiusM: 95 },
    { lng: 120.321784, lat: 16.625702, radiusM: 88 },
    { lng: 120.319075, lat: 16.600128, radiusM: 86 },
    ...EXTRA_DOWNTOWN_MODELS.filter(m => m.exclR).map(m => ({ lng: m.lng, lat: m.lat, radiusM: m.exclR }))
  ];
  global.SCULPTED_FOOTPRINT_EXCLUSIONS = SCULPTED_FOOTPRINT_EXCLUSIONS;

  /* =========================================================================
   * 9. THUNDERBIRD RESORTS – PORO POINT — Iconic Santorini whitewashed walls & cobalt-blue domes!
   *    Exact 54 × 70 m verified OSM cliffside footprint
   * ========================================================================= */
  function buildThunderbird(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    // Stepped Mediterranean whitewashed cliffside podium enveloping the full 54 × 70 m L-footprint cleanly
    m.box(0, 0, 0, 56.0, 68.0, 5.3, PAL.pureWhite, PAL.alabaster);
    // Main symmetrical Santorini resort wings (bright pure white)
    m.box(-10, 0, 5.3, 26.0, 62.0, 4.6, PAL.pureWhite, PAL.alabaster);
    m.box(12, 2, 5.3, 24.0, 44.0, 5.6, PAL.pureWhite, PAL.alabaster);
    // Arched Mediterranean colonnade openings along the ocean-facing & courtyard terraces
    for (let ay = -26; ay <= 26; ay += 6.5) {
      m.box(-28.1, ay, 1.0, 0.5, 3.4, 4.0, PAL.windowDark, PAL.windowDark, false);
      m.box(-23.1, ay, 5.8, 0.5, 3.2, 3.2, PAL.windowDark, PAL.windowDark, false);
      m.box(24.1, ay * 0.65 + 2, 5.8, 0.5, 3.2, 3.6, PAL.windowDark, PAL.windowDark, false);
    }
    // ICONIC VIBRANT COBALT-BLUE SANTORINI DOMES (Signature landmark silhouette!)
    // Grand central pavilion dome
    m.prism(10, 2, 10.9, 7.8, 13.0, 7.6, 12, PAL.pureWhite, PAL.alabaster);
    m.dome(10, 2, 12.9, 7.7, 5.6, 12, 5, PAL.santoriniBl);
    m.prism(10, 2, 18.4, 0.6, 19.8, 0.15, 8, PAL.pureWhite, null, 0, false);
    // Flanking twin wing blue domes
    for (const dy of [-20, 20]) {
      m.prism(-10, dy, 9.9, 5.5, 11.6, 5.3, 10, PAL.pureWhite, PAL.alabaster);
      m.dome(-10, dy, 11.5, 5.4, 4.0, 10, 4, PAL.santoriniBl);
    }
    // Classic Cycladic white bell-arch parapet accent
    m.box(-12, 0, 9.9, 2.2, 7.8, 3.8, PAL.pureWhite, PAL.santoriniBl);
    m.box(-13.15, 0, 10.7, 0.3, 2.4, 2.2, PAL.windowDark, PAL.windowDark, false);
    return m;
  }

  /* =========================================================================
   * 10. CHRIST THE REDEEMER STATUE — Verified Reservoir Hill POI
   * ========================================================================= */
  function buildStatue(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    const p = Math.PI / 8;
    m.prism(0, 0, 0, 6.4, 1.5, 6.0, 8, PAL.plinth, PAL.pureWhite, p);
    m.prism(0, 0, 1.5, 4.4, 5.4, 3.5, 8, PAL.warmCream, PAL.pureWhite, p);
    // Recessed chapel/arch panels on pedestal
    m.box(0, 0, 2.1, 8.2, 1.6, 2.4, PAL.windowDark, PAL.windowDark, false);
    m.box(0, 0, 2.1, 1.6, 8.2, 2.4, PAL.windowDark, PAL.windowDark, false);
    // Draped figure & outstretched arms facing west over San Fernando Bay
    m.prism(0, 0, 5.4, 2.15, 13.8, 1.35, 8, PAL.pureWhite, PAL.pureWhite, p);
    m.box(0, 0, 11.7, 1.55, 10.2, 1.55, PAL.pureWhite, PAL.pureWhite);
    m.box(0, 0, 10.9, 1.2, 8.0, 0.9, PAL.alabaster, PAL.pureWhite, false);
    m.prism(0, 0, 13.8, 0.95, 15.6, 0.80, 8, PAL.pureWhite, PAL.pureWhite, p);
    m.dome(0, 0, 15.5, 0.80, 0.65, 8, 2, PAL.pureWhite);
    return m;
  }

  /* =========================================================================
   * 11. PINDANGAN RUINS — Verified 1764 Spanish coral-stone & brick church ruins
   * ========================================================================= */
  function buildRuins(rotDeg) {
    const m = new MeshBuilder(rotDeg);
    m.box(0, 0, 0, 24.4, 14.4, 0.5, PAL.plinth, PAL.ruinStone, false);
    m.box(-1, -6.2, 0.5, 21.0, 1.4, 4.6, PAL.ruinStone, PAL.ruinDark);
    m.box(1, 6.2, 0.5, 18.0, 1.4, 4.2, PAL.ruinStone, PAL.ruinDark);
    m.box(10.5, 0, 0.5, 1.6, 13.6, 5.0, PAL.ruinStone, PAL.ruinDark);
    // Fragmented historic arched coral-stone front facade
    m.box(-10.8, -4.4, 0.5, 1.8, 5.0, 6.5, PAL.ruinStone, PAL.ruinDark);
    m.box(-10.8, 4.4, 0.5, 1.8, 5.0, 6.0, PAL.ruinStone, PAL.ruinDark);
    m.box(-10.8, 0, 4.7, 1.8, 4.2, 1.6, PAL.ruinStone, PAL.ruinDark);
    for (const bx of [-7, -1, 5]) {
      m.box(bx, -7.5, 0.5, 1.7, 1.5, 3.8, PAL.ruinDark, PAL.ruinStone);
      m.box(bx, 7.5, 0.5, 1.7, 1.5, 3.6, PAL.ruinDark, PAL.ruinStone);
    }
    return m;
  }

  function buildLandmarkMesh(lm) {
    switch (lm.kind) {
      case 'cityhall': return buildCityHall(lm.rotDeg);
      case 'capitol': return buildProvincialCapitol(lm.rotDeg);
      case 'cathedral': return buildCathedral(lm.rotDeg);
      case 'plaza': return buildCityPlaza(lm.rotDeg);
      case 'macho': return buildMaChoTemple(lm.rotDeg);
      case 'pagoda': return buildPagoda(lm.rotDeg);
      case 'market': return buildMarket(lm.rotDeg);
      case 'oldmarket': return buildOldPublicMarket(lm.rotDeg);
      case 'plazahotel': return buildPlazaHotel(lm.rotDeg);
      case 'smmall': return buildSMCity(lm.rotDeg);
      case 'robinsons': return buildRobinsons(lm.rotDeg);
      case 'itrmc': return buildITRMC(lm.rotDeg);
      case 'lorma': return buildLormaMedical(lm.rotDeg);
      case 'bethany': return buildBethanyHospital(lm.rotDeg);
      case 'ucc': return buildUCC(lm.rotDeg);
      case 'lumdc': return buildLUMDC(lm);
      case 'savemore': return buildSavemore(lm);
      case 'neda': return buildNedaRegion1(lm);
      case 'manna': return buildMannaMall(lm.rotDeg);
      case 'csi': return buildCSIMall(lm.rotDeg);
      case 'taskus': return buildTaskUs(lm.rotDeg);
      case 'slc': return buildSLC(lm.rotDeg);
      case 'dmmmsu': return buildDMMMSU(lm.rotDeg);
      case 'dmmmsu_south': return buildDMMMSUSouth(lm.rotDeg);
      case 'lunhs': return buildLUNHS(lm.rotDeg);
      case 'mcdo': return buildMcDo(lm);
      case 'jollibee': return buildJollibee(lm);
      case 'bank': return buildBankBranch(lm);
      case 'thunderbird': return buildThunderbird(lm.rotDeg);
      case 'statue': return buildStatue(lm.rotDeg);
      case 'ruins': return buildRuins(lm.rotDeg);
      case 'overpass': return buildQuezonOverpass(lm.rotDeg);
      case 'pastoral': return buildPastoralCenter(lm.rotDeg);
      default: return new MeshBuilder(0);
    }
  }

  function mulMat4(a, b) {
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

  function makeModelMatrix(lng, lat, rotDeg) {
    const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
    const s = mc.meterInMercatorCoordinateUnits();
    const rad = (rotDeg || 0) * Math.PI / 180;
    const c = Math.cos(rad), sn = Math.sin(rad);
    return new Float64Array([
      c * s, -sn * s, 0, 0,
      -sn * s, -c * s, 0, 0,
      0, 0, s, 0,
      mc.x, mc.y, mc.z, 1
    ]);
  }

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('LOCUS 3D shader error:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('LOCUS 3D link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  function createLandmarkLayer(options = {}) {
    let solidProg = null, shadowProg = null;
    let solidLoc = null, shadowLoc = null;
    let items = [];
    let visible = options.visible !== false;
    let mapRef = null;

    const SOLID_VS = `
      attribute vec3 a_pos;
      attribute vec3 a_normal;
      attribute vec3 a_color;
      uniform mat4 u_mvp;
      varying vec3 v_pos;
      varying vec3 v_normal;
      varying vec3 v_color;
      void main() {
        gl_Position = u_mvp * vec4(a_pos, 1.0);
        v_pos = a_pos;
        v_normal = a_normal;
        v_color = a_color;
      }
    `;
    const SOLID_FS = `
      precision mediump float;
      varying vec3 v_pos;
      varying vec3 v_normal;
      varying vec3 v_color;
      uniform vec3 u_sun;
      uniform float u_warmth;
      uniform float u_night;
      void main() {
        vec3 n = normalize(v_normal);
        float ndl = max(dot(n, u_sun), 0.0);
        float bounce = max(dot(n, normalize(vec3(-u_sun.x, -u_sun.y, 0.36))), 0.0);
        vec3 sunKey = mix(vec3(1.13, 1.06, 0.94), vec3(1.22, 0.96, 0.74), u_warmth);
        vec3 shadeFill = mix(vec3(0.55, 0.61, 0.69), vec3(0.57, 0.59, 0.71), u_warmth);
        vec3 col;
        if (n.z > 0.45) {
          vec3 roofFill = mix(vec3(0.65, 0.69, 0.75), vec3(0.67, 0.67, 0.72), u_warmth);
          float slopeSpec = (1.0 - n.z) * 0.10 * ndl;
          vec3 roofLight = roofFill + sunKey * (0.40 * ndl + 0.05 + slopeSpec);
          col = v_color * roofLight;
        } else {
          vec3 wallLight = shadeFill + sunKey * (0.52 * ndl) + vec3(0.095, 0.105, 0.125) * bounce;
          float baseAO = mix(0.75, 1.0, smoothstep(0.0, 2.5, v_pos.z));
          float glassLum = dot(v_color, vec3(0.299, 0.587, 0.114));
          // Subtle coastal sky glint on landmark glass facades in daylight
          float skySheen = (glassLum < 0.48 && v_color.b >= v_color.r * 0.94 && v_pos.z > 0.5)
            ? (0.065 + 0.055 * sin(v_pos.x * 0.45 + v_pos.y * 0.45 + v_pos.z * 0.7)) * (0.4 + 0.6 * ndl)
            : 0.0;
          col = v_color * wallLight * baseAO + vec3(skySheen * 0.85, skySheen, skySheen * 1.15);
        }
        if (u_night > 0.001) {
          float moonDot = max(dot(n, normalize(vec3(-0.55, 0.45, 0.70))), 0.0);
          vec3 moonLight = (n.z > 0.45 ? vec3(0.24, 0.31, 0.44) : vec3(0.18, 0.24, 0.36))
                         + vec3(0.32, 0.42, 0.62) * (0.48 * moonDot + 0.06);
          vec3 nightCol = v_color * moonLight;
          float lum = dot(v_color, vec3(0.299, 0.587, 0.114));
          float sat = max(max(v_color.r, v_color.g), v_color.b) - min(min(v_color.r, v_color.g), v_color.b);
          // Warm glowing interior windows on dark glass/curtain walls
          if (n.z < 0.45 && lum < 0.48 && v_color.b >= v_color.r * 0.92 && v_pos.z > 0.35) {
            float run = abs(v_pos.x * n.y - v_pos.y * n.x);
            float paneX = smoothstep(0.08, 0.18, fract(run * 0.36)) * smoothstep(0.92, 0.82, fract(run * 0.36));
            float paneZ = smoothstep(0.10, 0.22, fract(v_pos.z * 0.32)) * smoothstep(0.90, 0.78, fract(v_pos.z * 0.32));
            float winSeed = fract(sin(floor(run * 0.36) * 127.1 + floor(v_pos.z * 0.32) * 311.7) * 43758.5453);
            float lit = step(0.24, winSeed) * paneX * paneZ;
            vec3 glowCol = mix(vec3(1.0, 0.80, 0.45), vec3(0.96, 0.90, 0.74), fract(winSeed * 3.7));
            nightCol = mix(nightCol, glowCol * 0.94, lit * 0.88);
            nightCol += vec3(0.22, 0.18, 0.10) * (1.0 - lit) * 0.45;
          }
          // Subtle architectural uplighting on bright cyan/teal shells, gold signs, skylights & landmark crowns
          if (sat > 0.24 && lum > 0.26) {
            nightCol += v_color * (0.48 + 0.18 * smoothstep(2.0, 12.0, v_pos.z));
          } else if (n.z > 0.6 && lum > 0.78 && v_pos.z > 10.6) {
            // Skylight domes & luminous civic lanterns glow warmly from within
            nightCol += vec3(0.32, 0.28, 0.19);
          }
          // Warm ground-level architectural wash on civic white facades
          if (n.z < 0.35 && lum > 0.72) {
            float uplight = smoothstep(10.0, 0.5, v_pos.z);
            nightCol += vec3(0.16, 0.14, 0.10) * uplight;
          }
          col = mix(col, nightCol, u_night);
        }
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `;
    let lightingMode = 'day';
    let lightingWarmth = 0.0;
    let nightFactor = 0.0;
    const SHADOW_VS = `
      attribute vec3 a_pos;
      uniform mat4 u_mvp;
      void main() {
        gl_Position = u_mvp * vec4(a_pos, 1.0);
      }
    `;
    const SHADOW_FS = `
      precision mediump float;
      uniform vec4 u_shadowColor;
      void main() {
        gl_FragColor = u_shadowColor;
      }
    `;

    return {
      id: options.id || 'locus-3d-landmarks',
      type: 'custom',
      renderingMode: '3d',

      pickLandmarkAtPoint(point) {
        if (!visible || !mapRef || mapRef.getZoom() < 15) return null;
        const canvas = mapRef.getCanvas();
        const px = point.x / canvas.clientWidth * 2 - 1;
        const py = 1 - point.y / canvas.clientHeight * 2;
        let closest = null, nearestDepth = Infinity;
        for (const item of items) {
          if (!item.mvp || !item.pickable) continue;
          const depth = options.meshHitDepth(px, py, item.mvp, item.positions);
          if (depth !== null && depth < nearestDepth) {
            closest = item.landmark;
            nearestDepth = depth;
          }
        }
        return closest;
      },

      setVisible(v) {
        visible = Boolean(v);
        if (mapRef) mapRef.triggerRepaint();
      },

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

      onAdd(map, gl) {
        mapRef = map;
        solidProg = createProgram(gl, SOLID_VS, SOLID_FS);
        shadowProg = createProgram(gl, SHADOW_VS, SHADOW_FS);
        if (!solidProg || !shadowProg) return;

        solidLoc = {
          pos: gl.getAttribLocation(solidProg, 'a_pos'),
          norm: gl.getAttribLocation(solidProg, 'a_normal'),
          col: gl.getAttribLocation(solidProg, 'a_color'),
          mvp: gl.getUniformLocation(solidProg, 'u_mvp'),
          sun: gl.getUniformLocation(solidProg, 'u_sun'),
          warmth: gl.getUniformLocation(solidProg, 'u_warmth'),
          night: gl.getUniformLocation(solidProg, 'u_night')
        };
        shadowLoc = {
          pos: gl.getAttribLocation(shadowProg, 'a_pos'),
          mvp: gl.getUniformLocation(shadowProg, 'u_mvp'),
          col: gl.getUniformLocation(shadowProg, 'u_shadowColor')
        };

        items = [];
        const allModels = [
          ...VERIFIED_LANDMARKS.map(lm => ({ lm, pickable: true, minZoom: 15 })),
          ...EXTRA_DOWNTOWN_MODELS.map(lm => ({ lm, pickable: false, minZoom: lm.minZoom || 15 }))
        ];
        for (const { lm, pickable, minZoom } of allModels) {
          const mesh = buildLandmarkMesh(lm);
          const solidBuf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, solidBuf);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.solid), gl.STATIC_DRAW);

          const shadowBuf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, shadowBuf);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.shadow), gl.STATIC_DRAW);

          let edgeBuf = null;
          if (mesh.edges.length) {
            edgeBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, edgeBuf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.edges), gl.STATIC_DRAW);
          }

          items.push({
            minZoom, pickable, landmark: lm,
            positions: pickable ? new Float32Array(mesh.solid.filter((_, i) => i % 9 < 3)) : null,
            model: makeModelMatrix(lm.lng, lm.lat, lm.rotDeg),
            solidBuf,
            solidCount: mesh.solid.length / 9,
            shadowBuf,
            shadowCount: mesh.shadow.length / 3,
            edgeBuf,
            edgeCount: mesh.edges.length / 3
          });
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
      },

      render(gl, rawMatrix) {
        if (!visible || !solidProg || !shadowProg || !solidLoc || !shadowLoc || !mapRef) return;
        const zoom = mapRef.getZoom();
        if (zoom < 13.0) return;

        const matrix = (rawMatrix && rawMatrix.defaultProjectionData)
          ? rawMatrix.defaultProjectionData.mainMatrix
          : rawMatrix;
        if (!matrix) return;

        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);

        // Pass 1: Restrained grounded contact shadows (non-stacking depth test)
        gl.useProgram(shadowProg);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);

        const w = lightingWarmth;
        const nf = nightFactor;
        gl.uniform4f(shadowLoc.col, 0.19 * (1 - nf * 0.5), 0.22 * (1 - nf * 0.5), 0.26 * (1 - nf * 0.4), (0.20 + 0.03 * w) * (1.0 - 0.60 * nf));
        gl.enableVertexAttribArray(shadowLoc.pos);

        for (const it of items) {
          if (zoom < it.minZoom || !it.shadowCount) continue;
          const mvp = mulMat4(matrix, it.model);
          it.mvp = mvp;
          gl.uniformMatrix4fv(shadowLoc.mvp, false, mvp);
          gl.bindBuffer(gl.ARRAY_BUFFER, it.shadowBuf);
          gl.vertexAttribPointer(shadowLoc.pos, 3, gl.FLOAT, false, 12, 0);
          gl.drawArrays(gl.TRIANGLES, 0, it.shadowCount);
        }
        gl.disableVertexAttribArray(shadowLoc.pos);

        // Pass 2: Sunlit architectural scale-model solids
        gl.useProgram(solidProg);
        gl.disable(gl.BLEND);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(true);

        const gs = [-0.844, 0.288, 0.453];
        const sx = SUN[0] + (gs[0] - SUN[0]) * w;
        const sy = SUN[1] + (gs[1] - SUN[1]) * w;
        const sz = SUN[2] + (gs[2] - SUN[2]) * w;
        const sl = Math.hypot(sx, sy, sz) || 1;
        gl.uniform3f(solidLoc.sun, sx / sl, sy / sl, sz / sl);
        gl.uniform1f(solidLoc.warmth, w);
        gl.uniform1f(solidLoc.night, nf);
        gl.enableVertexAttribArray(solidLoc.pos);
        gl.enableVertexAttribArray(solidLoc.norm);
        gl.enableVertexAttribArray(solidLoc.col);

        for (const it of items) {
          if (zoom < it.minZoom || !it.solidCount) continue;
          const mvp = it.mvp || mulMat4(matrix, it.model);
          it.mvp = mvp;
          gl.uniformMatrix4fv(solidLoc.mvp, false, mvp);
          gl.bindBuffer(gl.ARRAY_BUFFER, it.solidBuf);
          gl.vertexAttribPointer(solidLoc.pos, 3, gl.FLOAT, false, 36, 0);
          gl.vertexAttribPointer(solidLoc.norm, 3, gl.FLOAT, false, 36, 12);
          gl.vertexAttribPointer(solidLoc.col, 3, gl.FLOAT, false, 36, 24);
          gl.drawArrays(gl.TRIANGLES, 0, it.solidCount);
        }

        gl.disableVertexAttribArray(solidLoc.pos);
        gl.disableVertexAttribArray(solidLoc.norm);
        gl.disableVertexAttribArray(solidLoc.col);

        // Pass 3: Fine architectural roof & cornice edges (revealed smoothly at close zoom)
        const edgeAlpha = Math.max(0, Math.min(0.24, (zoom - 15.1) * 0.14));
        if (edgeAlpha > 0.02) {
          gl.useProgram(shadowProg);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthFunc(gl.LEQUAL);
          gl.depthMask(false);
          gl.uniform4f(shadowLoc.col, 0.24 + 0.26 * nf, 0.26 + 0.34 * nf, 0.29 + 0.44 * nf, edgeAlpha * (1.0 - 0.35 * nf));
          gl.enableVertexAttribArray(shadowLoc.pos);
          for (const it of items) {
            if (zoom < it.minZoom || !it.edgeBuf || !it.edgeCount) continue;
            gl.uniformMatrix4fv(shadowLoc.mvp, false, it.mvp || mulMat4(matrix, it.model));
            gl.bindBuffer(gl.ARRAY_BUFFER, it.edgeBuf);
            gl.vertexAttribPointer(shadowLoc.pos, 3, gl.FLOAT, false, 12, 0);
            gl.drawArrays(gl.LINES, 0, it.edgeCount);
          }
          gl.disableVertexAttribArray(shadowLoc.pos);
          gl.depthMask(true);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
      }
    };
  }

  global.VERIFIED_LANDMARKS = VERIFIED_LANDMARKS;
  global.createLandmarkLayer = createLandmarkLayer;
})(window);
