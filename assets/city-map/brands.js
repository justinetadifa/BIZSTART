/* LOCUS SF — Verified Fast-Food & Convenience Brand Logos + Live Status Audit (2026-11-21)
 *
 * - Draws crisp @2x retina procedural miniature brand logo badges offline via HTML5 Canvas.
 * - Tracks per-branch operating status audited on 2026-11-21 against official PH store
 *   locators & active delivery directories (never fabricating closures or openings).
 * - Uncorroborated or potentially duplicate OSM pins are explicitly marked for field check.
 */

(function (global) {
  const AUDIT_DATE = '2026-11-21';

  const BRAND_DEFS = {
    mcdonalds:  { label: "McDonald's",            bg: '#da291c', accent: '#ffc72c', canopyRgb: [0.85, 0.17, 0.12] },
    jollibee:   { label: 'Jollibee',              bg: '#e31837', accent: '#ffd100', canopyRgb: [0.86, 0.13, 0.22] },
    manginasal: { label: 'Mang Inasal',           bg: '#007a3d', accent: '#ffd100', canopyRgb: [0.06, 0.49, 0.25] },
    '7eleven':  { label: '7-Eleven',              bg: '#ffffff', accent: '#008061', canopyRgb: [0.92, 0.46, 0.14] },
    chowking:   { label: 'Chowking',              bg: '#d71920', accent: '#ffc72c', canopyRgb: [0.82, 0.15, 0.16] },
    dunkin:     { label: "Dunkin'",               bg: '#ffffff', accent: '#ff671f', canopyRgb: [0.94, 0.42, 0.16] },
    kfc:        { label: 'KFC',                   bg: '#e4002b', accent: '#ffffff', canopyRgb: [0.84, 0.12, 0.18] },
    greenwich:  { label: 'Greenwich',             bg: '#006838', accent: '#f5b800', canopyRgb: [0.08, 0.44, 0.24] },
    burgerking: { label: 'Burger King',           bg: '#f5a623', accent: '#d62300', canopyRgb: [0.84, 0.48, 0.16] },
    starbucks:  { label: 'Starbucks',             bg: '#00704a', accent: '#ffffff', canopyRgb: [0.05, 0.44, 0.30] },
    goldilocks: { label: 'Goldilocks',            bg: '#f9c80e', accent: '#6d3b14', canopyRgb: [0.88, 0.68, 0.14] },
    redribbon:  { label: 'Red Ribbon',            bg: '#c8102e', accent: '#ffffff', canopyRgb: [0.76, 0.14, 0.22] },
    shakeys:    { label: "Shakey's",              bg: '#b81d24', accent: '#f5c518', canopyRgb: [0.72, 0.16, 0.18] },
    maxs:       { label: "Max's Restaurant",      bg: '#c8102e', accent: '#fff4dc', canopyRgb: [0.74, 0.18, 0.22] },
    wendys:     { label: "Wendy's",               bg: '#e2231a', accent: '#0081c6', canopyRgb: [0.82, 0.20, 0.18] },
    krispykreme:{ label: 'Krispy Kreme',          bg: '#006f44', accent: '#d22630', canopyRgb: [0.08, 0.45, 0.28] },
    bonchon:    { label: 'Bonchon',               bg: '#cc1c24', accent: '#ffffff', canopyRgb: [0.76, 0.16, 0.18] },
    tokyotokyo: { label: 'Tokyo Tokyo',           bg: '#d91e2a', accent: '#1e2733', canopyRgb: [0.78, 0.18, 0.20] },
    kennyrogers:{ label: 'Kenny Rogers Roasters', bg: '#b8242a', accent: '#f4c542', canopyRgb: [0.72, 0.18, 0.20] }
  };

  /* Per-OSM-index branch verification audit (checked 2026-11-21)
   * status:
   *   'verified_open'   -> Confirmed active via official PH store locator / active delivery directory
   *   'stale_candidate' -> Not listed on official locator (possible relocated/closed/duplicate OSM pin)
   *   'field_check'     -> Not individually corroborated online; field verification recommended
   */
  const BRANCH_AUDIT = {
    // McDonald's (4 OSM entries)
    576: { brand: 'mcdonalds', status: 'verified_open',   source: 'McDonald’s SLC Lingsat (24-hr directory / GrabFood)', note: 'Active 24-hour branch along MacArthur Hwy, Brgy. Lingsat (near SLC).' },
    577: { brand: 'mcdonalds', status: 'verified_open',   source: 'GrabFood / Foodpanda / Wanderlog (Rizal Ave)',         note: 'Active downtown branch along Rizal Ave near City Hall & Plaza.' },
    578: { brand: 'mcdonalds', status: 'verified_open',   source: 'McDonald’s Catbangen (MacArthur Hwy directory)',       note: 'Active highway branch in Brgy. Catbangen.' },
    579: { brand: 'mcdonalds', status: 'verified_open',   source: 'CSI Mall La Union / ClickTheCity',                     note: 'Active mall branch at CSI Mall, Diversion Rd, Brgy. Biday.' },

    // Jollibee (6 OSM entries)
    437: { brand: 'jollibee',  status: 'verified_open',   source: 'Jollibee Lingsat (MacArthur Hwy directory)',           note: 'Active branch along MacArthur Hwy, Brgy. Lingsat.' },
    438: { brand: 'jollibee',  status: 'verified_open',   source: 'Jollibee La Union SFE (Urisa Bldg., Quezon Ave)',      note: 'Active downtown branch near San Fernando Plaza.' },
    439: { brand: 'jollibee',  status: 'verified_open',   source: 'Jollibee La Union 2 (Quezon Ave cor. P. Burgos)',      note: 'Active downtown corner branch along Quezon Ave.' },
    440: { brand: 'jollibee',  status: 'verified_open',   source: 'Jollibee San Fernando 3 (Sevilla Hwy)',                note: 'Active highway branch in Brgy. Sevilla.' },
    441: { brand: 'jollibee',  status: 'verified_open',   source: 'Robinsons Malls official directory (Level 1)',         note: 'Active branch inside Robinsons Place La Union.' },
    442: { brand: 'jollibee',  status: 'verified_open',   source: 'Foodpanda / SM City La Union directory',               note: 'Active branch inside SM City La Union, Brgy. Biday.' },

    // Mang Inasal (3 OSM entries — official manginasal.ph lists only 1 downtown branch + SM City!)
    556: { brand: 'manginasal', status: 'verified_open',   source: 'manginasal.ph official locator + Foodpanda',          note: 'Confirmed active branch: Osmeña St cor. Quezon Ave (9 AM – 10 PM).' },
    555: { brand: 'manginasal', status: 'stale_candidate', source: 'manginasal.ph locator check (not listed)',            note: 'Not listed on official manginasal.ph locator (only Osmeña cor. Quezon Ave & SM City La Union are listed). Possible closed/relocated OSM pin — field check required.' },
    557: { brand: 'manginasal', status: 'stale_candidate', source: 'manginasal.ph locator check (70 m from #556)',        note: 'Likely duplicate/shifted OSM pin of the active Osmeña St cor. Quezon Ave branch — field check required.' },

    // 7-Eleven (9 OSM entries)
    3:   { brand: '7eleven', status: 'field_check',    source: 'Public 7-Eleven list (Poro not individually confirmed)',  note: 'Not individually corroborated on public 7-Eleven branch lists — field check recommended.' },
    4:   { brand: '7eleven', status: 'verified_open',  source: '7-Eleven Lingsat (Yabes Bldg., near SLC)',                note: 'Confirmed active branch along MacArthur Hwy, Brgy. Lingsat.' },
    5:   { brand: '7eleven', status: 'verified_open',  source: 'Waze / 7-Eleven Gen. Luna St (24/7)',                     note: 'Confirmed active 24/7 branch on Gen. Luna St near Public Market.' },
    6:   { brand: '7eleven', status: 'field_check',    source: 'Public 7-Eleven list (Pagdaraoan not individually listed)', note: 'Not individually corroborated on public 7-Eleven branch lists — field check recommended.' },
    7:   { brand: '7eleven', status: 'verified_open',  source: '7-eleven.com.ph (Plaza Hotel / La Union 1)',              note: 'Confirmed active 24/7 branch at Plaza Hotel / Rizal Ave.' },
    8:   { brand: '7eleven', status: 'verified_open',  source: '7-Eleven Carlatan (near Lorma Medical)',                  note: 'Confirmed active branch in Brgy. Carlatan near Lorma Medical Center.' },
    9:   { brand: '7eleven', status: 'verified_open',  source: '7-eleven.com.ph (Catbangen, Pennsylvania St)',            note: 'Confirmed active branch in Brgy. Catbangen.' },
    10:  { brand: '7eleven', status: 'verified_open',  source: '7-Eleven Tanqui (PJC Bldg., F. Ortega Hwy)',              note: 'Confirmed active branch along F. Ortega Hwy, Brgy. Tanqui.' },
    11:  { brand: '7eleven', status: 'verified_open',  source: '7-Eleven ITRMC / Regional Hospital (Sevilla-Parian)',     note: 'Confirmed active 24/7 branch near ITRMC along MacArthur Hwy.' },

    // Chowking
    181: { brand: 'chowking', status: 'verified_open', source: 'Chowking Gov. Luna (65 Gov. Luna St, Bayan)',            note: 'Confirmed active downtown branch near Rang-ay Bank.' },
    182: { brand: 'chowking', status: 'field_check',   source: 'Not listed separately from Gov. Luna Bayan branch',       note: 'South Quezon Ave pin not separately corroborated online — field check recommended.' },
    183: { brand: 'chowking', status: 'verified_open', source: 'Chowking Sevilla Drive-Thru (across ITRMC)',              note: 'Confirmed active highway drive-thru branch across ITRMC.' },
    184: { brand: 'chowking', status: 'verified_open', source: 'smsupermalls.com + Foodpanda (SM City La Union)',         note: 'Confirmed active branch inside SM City La Union.' },

    // Dunkin'
    283: { brand: 'dunkin',   status: 'verified_open', source: 'Dunkin’ Downtown / P. Burgos (Waze)',                    note: 'Confirmed active downtown branch near City Plaza / Ortega Hwy.' },
    284: { brand: 'dunkin',   status: 'field_check',   source: 'Robinsons Place La Union (not confirmed online)',         note: 'Verify current kiosk/store operation inside Robinsons Place La Union.' },
    285: { brand: 'dunkin',   status: 'verified_open', source: 'Dunkin’ San Fernando Market / P. Burgos',                 note: 'Confirmed active branch near Old Public Market / P. Burgos St.' },

    // KFC
    450: { brand: 'kfc',      status: 'field_check',   source: 'kfc.com.ph lists Robinsons & CSI (not standalone Hwy)',   note: 'Close to Robinsons Place KFC — verify whether standalone pin is still active or duplicate.' },
    451: { brand: 'kfc',      status: 'verified_open', source: 'kfc.com.ph official locator (Robinsons Place Level 1)',   note: 'Confirmed active branch inside Robinsons Place La Union.' },
    452: { brand: 'kfc',      status: 'verified_open', source: 'Foodpanda / SM City La Union',                            note: 'Confirmed active branch inside SM City La Union.' },

    // Greenwich
    362: { brand: 'greenwich', status: 'verified_open', source: 'Greenwich P. Burgos St directory',                       note: 'Confirmed active downtown branch on P. Burgos / Quezon Ave.' },
    363: { brand: 'greenwich', status: 'verified_open', source: 'Foodpanda (SM City La Union)',                           note: 'Confirmed active branch inside SM City La Union.' },

    // Burger King & Starbucks
    128: { brand: 'burgerking', status: 'verified_open', source: 'burgerking.com.ph official locator (Catbangen)',        note: 'Confirmed active drive-thru & dine-in branch along MacArthur Hwy.' },
    919: { brand: 'starbucks',  status: 'verified_open', source: 'starbucks.ph official locator (Drive-Thru)',            note: 'Confirmed active Drive-Thru branch at MacArthur Hwy cor. Guerrero St.' },
    920: { brand: 'starbucks',  status: 'verified_open', source: 'starbucks.ph official locator (SM City La Union)',      note: 'Confirmed active branch inside SM City La Union.' },

    // Shakey's, Max's, Kenny Rogers & other mall chains
    881: { brand: 'shakeys',    status: 'verified_open', source: 'smsupermalls.com (SM City La Union)',                   note: 'Confirmed active branch inside SM City La Union.' },
    880: { brand: 'shakeys',    status: 'field_check',   source: 'CSI Mall (not corroborated on current locator)',        note: 'Field check recommended to confirm current CSI Mall tenancy.' },
    882: { brand: 'shakeys',    status: 'field_check',   source: 'Parian / ITRMC area (not corroborated online)',         note: 'Field check recommended to confirm current highway branch status.' },
    574: { brand: 'maxs',       status: 'verified_open', source: 'Foodpanda (SM City La Union)',                          note: 'Confirmed active branch inside SM City La Union.' },
    573: { brand: 'maxs',       status: 'field_check',   source: 'Parian highway (not confirmed active online)',          note: 'Field check recommended to confirm if standalone highway branch remains open.' },
    465: { brand: 'kennyrogers',status: 'verified_open', source: 'kennyrogersdelivery.com.ph (SM City La Union)',         note: 'Confirmed active branch at SM City La Union.' },
    114: { brand: 'bonchon',    status: 'field_check',   source: 'Not listed on primary smsupermalls.com directory',      note: 'Mapped in OSM at SM City La Union; confirm active opening status on-site.' },
    474: { brand: 'krispykreme',status: 'field_check',   source: 'Not listed on primary smsupermalls.com directory',      note: 'Mapped in OSM at SM City La Union; confirm active kiosk status on-site.' },
    1025:{ brand: 'wendys',     status: 'field_check',   source: 'Not listed on primary smsupermalls.com directory',      note: 'Mapped in OSM at SM City La Union; confirm active tenancy on-site.' },
    979: { brand: 'tokyotokyo', status: 'field_check',   source: 'CSI Mall (not individually confirmed online)',          note: 'Field check recommended.' },
    980: { brand: 'tokyotokyo', status: 'field_check',   source: 'Not listed on primary smsupermalls.com directory',      note: 'Field check recommended.' },
    350: { brand: 'goldilocks', status: 'field_check',   source: 'Downtown Plaza area (field check recommended)',         note: 'Verify current ground-floor tenancy along Quezon Ave / Plaza.' },
    351: { brand: 'goldilocks', status: 'field_check',   source: 'CSI Mall area (field check recommended)',               note: 'Verify current branch operation.' },
    352: { brand: 'goldilocks', status: 'field_check',   source: 'SM City La Union (duplicate/kiosk check)',              note: 'Verify active stall inside SM City La Union.' },
    353: { brand: 'goldilocks', status: 'field_check',   source: 'SM City La Union (duplicate/kiosk check)',              note: 'Verify active stall inside SM City La Union.' },
    793: { brand: 'redribbon',  status: 'field_check',   source: 'Downtown Plaza area (field check recommended)',         note: 'Verify current Quezon Ave / Plaza operation.' },
    794: { brand: 'redribbon',  status: 'field_check',   source: 'Manna Mall / Pagdaraoan (field check recommended)',     note: 'Verify current Manna Mall tenancy.' }
  };

  function detectBrandKey(name) {
    if (!name) return null;
    const s = String(name).toLowerCase();
    if (s.includes('mcdonald')) return 'mcdonalds';
    if (s.includes('jollibee')) return 'jollibee';
    if (s.includes('mang inasal')) return 'manginasal';
    if (s.includes('7-eleven') || s.includes('7/11')) return '7eleven';
    if (s.includes('chowking')) return 'chowking';
    if (s.includes('dunkin')) return 'dunkin';
    if (s === 'kfc' || s.startsWith('kfc ')) return 'kfc';
    if (s.includes('greenwich')) return 'greenwich';
    if (s.includes('burger king')) return 'burgerking';
    if (s.includes('starbucks')) return 'starbucks';
    if (s.includes('goldilocks')) return 'goldilocks';
    if (s.includes('red ribbon')) return 'redribbon';
    if (s.includes("shakey")) return 'shakeys';
    if (s.includes("max's restaurant") && !s.includes('parking')) return 'maxs';
    if (s.includes("wendy's")) return 'wendys';
    if (s.includes('krispy kreme')) return 'krispykreme';
    if (s.includes('bonchon')) return 'bonchon';
    if (s.includes('tokyo tokyo')) return 'tokyotokyo';
    if (s.includes('kenny rogers')) return 'kennyrogers';
    return null;
  }

  function getBrandInfo(osmIndex, name) {
    const audit = BRANCH_AUDIT[osmIndex];
    const brandKey = (audit && audit.brand) || detectBrandKey(name);
    if (!brandKey || !BRAND_DEFS[brandKey]) return null;
    const def = BRAND_DEFS[brandKey];
    const status = audit ? audit.status : 'field_check';
    const isVerified = status === 'verified_open';
    return {
      brandKey,
      brandLabel: def.label,
      canopyRgb: def.canopyRgb,
      iconId: isVerified ? `brand-${brandKey}` : `brand-${brandKey}-check`,
      status,
      statusLabel: status === 'verified_open'
        ? `Verified active (${AUDIT_DATE})`
        : status === 'stale_candidate'
          ? `Unlisted on official locator (${AUDIT_DATE}) · Check`
          : `Unconfirmed online (${AUDIT_DATE}) · Field check`,
      auditDate: AUDIT_DATE,
      auditSource: audit ? audit.source : 'OpenStreetMap snapshot (not corroborated online)',
      auditNote: audit ? audit.note : 'Verify current store status in the field.'
    };
  }

  /* Procedural Retina @2x Canvas Logo Renderer (96x96 px, zero external assets) */
  function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBrandEmblem(ctx, brandKey, cx, cy, r) {
    switch (brandKey) {
      case 'mcdonalds': {
        // Iconic Golden Arches "M"
        ctx.strokeStyle = '#ffc72c';
        ctx.lineWidth = 6.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 17, cy + 13);
        ctx.quadraticCurveTo(cx - 11, cy - 22, cx, cy + 7);
        ctx.quadraticCurveTo(cx + 11, cy - 22, cx + 17, cy + 13);
        ctx.stroke();
        break;
      }
      case 'jollibee': {
        // Stylized cheerful red bee silhouette + white chef toque + golden smile
        // White chef hat
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 7, cy - 12, 6, 0, Math.PI * 2);
        ctx.arc(cx, cy - 15, 7, 0, Math.PI * 2);
        ctx.arc(cx + 7, cy - 12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 11, cy - 11, 22, 6);
        // Cute face oval
        ctx.fillStyle = '#ffe3b3';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, 13.5, 11.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes & big happy smile
        ctx.fillStyle = '#1d1d1f';
        ctx.beginPath();
        ctx.arc(cx - 4.8, cy + 1.5, 2.1, 0, Math.PI * 2);
        ctx.arc(cx + 4.8, cy + 1.5, 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c8102e';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy + 4.5, 6.5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        // Golden collar stripe
        ctx.fillStyle = '#ffd100';
        ctx.fillRect(cx - 9, cy + 14.5, 18, 3.8);
        break;
      }
      case 'manginasal': {
        // Vibrant green badge with golden grilled flame-leaf crest & crisp "MI"
        ctx.fillStyle = '#ffd100';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 21);
        ctx.lineTo(cx + 21, cy);
        ctx.lineTo(cx, cy + 21);
        ctx.lineTo(cx - 21, cy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#006834';
        ctx.font = '900 19px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('MI', cx, cy + 1);
        // Little red-orange grill flame dot at top
        ctx.fillStyle = '#e63926';
        ctx.beginPath();
        ctx.arc(cx, cy - 14.5, 3.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case '7eleven': {
        // Classic 7-Eleven tri-color stripes (orange top, green middle band, red bottom) + bold "7"
        ctx.fillStyle = '#f47920';
        ctx.fillRect(cx - 22, cy - 19, 44, 5.5);
        ctx.fillStyle = '#008061';
        ctx.fillRect(cx - 22, cy - 13.5, 44, 4.5);
        ctx.fillStyle = '#ee2526';
        ctx.fillRect(cx - 22, cy + 13.5, 44, 5.5);
        // Bold iconic "7"
        ctx.fillStyle = '#ee2526';
        ctx.font = '900 30px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('7', cx - 1, cy + 1);
        // Signature green "ELEVEN" crossbar ribbon
        ctx.fillStyle = '#008061';
        ctx.fillRect(cx - 17, cy - 3.5, 34, 7.2);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 6.5px system-ui, sans-serif';
        ctx.fillText('ELEVEN', cx, cy + 0.5);
        break;
      }
      case 'chowking': {
        // Golden noodle bowl + "CK"
        ctx.fillStyle = '#ffc72c';
        ctx.beginPath();
        ctx.arc(cx, cy + 3, 14, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 18px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CK', cx, cy - 5);
        break;
      }
      case 'dunkin': {
        // Bright orange & magenta "DD" + coffee cup bar
        ctx.fillStyle = '#ff671f';
        ctx.font = '900 22px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('D', cx + 1, cy + 1);
        ctx.fillStyle = '#da1884';
        ctx.textAlign = 'left';
        ctx.fillText('D', cx + 1, cy + 1);
        ctx.fillStyle = '#ff671f';
        ctx.fillRect(cx - 14, cy + 13, 14, 3.5);
        ctx.fillStyle = '#da1884';
        ctx.fillRect(cx, cy + 13, 14, 3.5);
        break;
      }
      case 'kfc': {
        // Iconic red-and-white vertical stripes + crisp "KFC" plaque
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 14, cy - 22, 9, 44);
        ctx.fillRect(cx + 5, cy - 22, 9, 44);
        ctx.fillStyle = '#1f2329';
        drawRoundedRect(ctx, cx - 21, cy - 10, 42, 20, 5);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14.5px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('KFC', cx, cy + 1);
        break;
      }
      case 'greenwich': {
        // Golden pizza wedge + "GW"
        ctx.fillStyle = '#f5b800';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 19);
        ctx.lineTo(cx + 16, cy + 14);
        ctx.lineTo(cx - 16, cy + 14);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#00562e';
        ctx.font = '900 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GW', cx, cy + 5);
        break;
      }
      case 'burgerking': {
        // Classic bun halves + bold red "BK"
        ctx.fillStyle = '#e58e1a';
        ctx.beginPath();
        ctx.arc(cx, cy - 5, 16, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(cx - 16, cy + 9, 32, 6.5);
        ctx.fillStyle = '#c8102e';
        ctx.font = '900 17px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BK', cx, cy + 2);
        break;
      }
      case 'starbucks': {
        // Double white ring + crisp 5-point star crest
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(cx, cy, 16.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const ang = -Math.PI / 2 + (i * Math.PI) / 5;
          const rad = i % 2 === 0 ? 11.5 : 4.8;
          const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      default: {
        // Clean high-contrast monogram for remaining chains (Goldilocks, Red Ribbon, Shakey's, Max's, etc.)
        const monoMap = {
          goldilocks: 'G', redribbon: 'RR', shakeys: 'S', maxs: "M's",
          wendys: 'W', krispykreme: 'KK', bonchon: 'BC', tokyotokyo: 'TT', kennyrogers: 'KR'
        };
        const txt = monoMap[brandKey] || '?';
        ctx.fillStyle = BRAND_DEFS[brandKey].accent;
        ctx.font = `900 ${txt.length > 2 ? 15 : 20}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, cx, cy + 1);
      }
    }
  }

  function renderBrandCanvas(brandKey, needsCheck) {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const def = BRAND_DEFS[brandKey];
    const cx = size / 2, cy = size / 2 - 2;

    if (needsCheck) ctx.globalAlpha = 0.84;

    // Subtle studio drop shadow
    ctx.save();
    ctx.fillStyle = 'rgba(20, 44, 64, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 31, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Pointer tail beneath badge
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy + 20);
    ctx.lineTo(cx + 9, cy + 20);
    ctx.lineTo(cx, cy + 31);
    ctx.closePath();
    ctx.fill();

    // Outer white architectural sticker bezel
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, cx - 28, cy - 28, 56, 56, 15);
    ctx.fill();
    ctx.strokeStyle = needsCheck ? '#c98a1c' : '#1b476e';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Inner clipped brand tile
    ctx.save();
    drawRoundedRect(ctx, cx - 24, cy - 24, 48, 48, 11.5);
    ctx.clip();
    ctx.fillStyle = def.bg;
    ctx.fillRect(cx - 24, cy - 24, 48, 48);
    drawBrandEmblem(ctx, brandKey, cx, cy, 24);
    ctx.restore();

    // Subtle amber verification corner dot if uncorroborated / possible stale OSM pin
    if (needsCheck) {
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#e09316';
      ctx.beginPath();
      ctx.arc(cx + 22, cy - 22, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx + 22, cy - 21.5);
    }

    return ctx.getImageData(0, 0, size, size);
  }

  function registerBrandIcons(map) {
    for (const key of Object.keys(BRAND_DEFS)) {
      const idActive = `brand-${key}`;
      const idCheck = `brand-${key}-check`;
      if (!map.hasImage(idActive)) {
        map.addImage(idActive, renderBrandCanvas(key, false), { pixelRatio: 2 });
      }
      if (!map.hasImage(idCheck)) {
        map.addImage(idCheck, renderBrandCanvas(key, true), { pixelRatio: 2 });
      }
    }
  }

  function getAuditSummary(dir) {
    let total = 0, verified = 0, stale = 0, fieldCheck = 0;
    (dir || []).forEach((d, i) => {
      const info = getBrandInfo(i, d[0]);
      if (!info) return;
      total++;
      if (info.status === 'verified_open') verified++;
      else if (info.status === 'stale_candidate') stale++;
      else fieldCheck++;
    });
    return { auditDate: AUDIT_DATE, total, verified, stale, fieldCheck };
  }

  global.LocusBrands = {
    AUDIT_DATE,
    BRAND_DEFS,
    BRANCH_AUDIT,
    detectBrandKey,
    getBrandInfo,
    registerBrandIcons,
    getAuditSummary
  };
})(window);
