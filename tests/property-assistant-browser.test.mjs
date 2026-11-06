import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, '.ui-audit');
await mkdir(out, { recursive: true });
const base = (process.env.LOCUS_TEST_BASE_URL || 'http://localhost/sfcelerate-bizstart').replace(/\/$/, '');
if (!['localhost', '127.0.0.1', '::1'].includes(new URL(base).hostname)) throw new Error('Browser checks require a local server.');
const port = 9471;
const profile = await mkdtemp(path.join(tmpdir(), 'locus-assistant-'));
const results = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-component-update', '--disable-extensions',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let diagnostics = '';
chrome.stderr.on('data', data => { diagnostics += data.toString(); });
const keepAlive = setInterval(() => {}, 1000);

class CDP {
  constructor(url, target) {
    this.target = target; this.ws = new WebSocket(url); this.next = 0; this.pending = new Map(); this.listeners = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', ({ data }) => {
      const m = JSON.parse(data);
      if (m.id) {
        const pending = this.pending.get(m.id); this.pending.delete(m.id);
        if (m.error) pending?.reject(new Error(JSON.stringify(m.error))); else pending?.resolve(m.result);
      } else for (const listener of this.listeners.get(m.method) || []) listener(m.params);
    });
  }
  async send(method, params = {}) {
    await this.ready; const id = ++this.next;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 15000);
      this.pending.set(id, { resolve: x => { clearTimeout(timer); resolve(x); }, reject: e => { clearTimeout(timer); reject(e); } });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, listener) { const list = this.listeners.get(method) || []; list.push(listener); this.listeners.set(method, list); }
  async eval(expression) {
    const response = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  }
  async close() { await fetch(`http://127.0.0.1:${port}/json/close/${this.target}`).catch(() => {}); this.ws.close(); }
}
async function waitFor(cdp, expression, timeout = 20000) {
  let last; const start = Date.now();
  while (Date.now() - start < timeout) { try { last = await cdp.eval(expression); if (last) return last; } catch {} await delay(50); }
  throw new Error(`Timed out waiting for ${expression}; last=${JSON.stringify(last)}`);
}
async function createPage(width = 1440) {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = new CDP(target.webSocketDebuggerUrl, target.id);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => cdp.errors.push(exceptionDetails.exception?.description || exceptionDetails.text));
  await resize(cdp, width); return cdp;
}
async function resize(cdp, width, height = width > 850 ? 900 : 844) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await delay(450);
}
async function ready(cdp) {
  await waitFor(cdp, "document.readyState === 'complete' && document.querySelector('.city-nav') && document.querySelector('#cityMenuButton')");
  await cdp.eval('document.fonts.ready'); await delay(550);
}
async function click(cdp, selector) {
  const p = await cdp.eval(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p });
}
async function key(cdp, name) {
  const vk = { Tab: 9, Escape: 27, Enter: 13 }[name];
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: vk });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: vk });
}
async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path.join(out, name), Buffer.from(data, 'base64'));
}
async function test(name, action) {
  try { const detail = await action(); results.push({ name, status: 'PASS', detail }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'FAIL', error: error.stack }); console.log(`FAIL ${name}: ${error.message}`); }
}

function sessionFixture() {
  const raw = execFileSync('C:/xampp/php/php.exe', ['tests/investment-assistant-api.test.php', '--fixture-only', 'investor'], { cwd: root, encoding: 'utf8' });
  return JSON.parse(raw);
}
async function assistantReady(cdp) {
  await waitFor(cdp, "document.querySelector('[data-investment-assistant]') && document.querySelector('#iaWorkbench').getAttribute('aria-busy')==='false' && !document.querySelector('#iaSend').disabled", 30000);
  await cdp.eval('document.fonts.ready'); await delay(300);
}
async function submitMessage(cdp, text) {
  await cdp.eval(`document.querySelector('#iaMessage').value=${JSON.stringify(text)};document.querySelector('#iaMessageForm').requestSubmit()`);
  await waitFor(cdp, "document.querySelector('#iaWorkbench').getAttribute('aria-busy')==='false'", 30000);
  await delay(120);
}
async function apiState(cdp) {
  return cdp.eval(`fetch(${JSON.stringify(`${base}/api/investment-assistant.php`)},{credentials:'same-origin',cache:'no-store'}).then(r=>r.json())`);
}
async function resetAssistant(cdp) {
  await cdp.eval("document.querySelector('#iaReset').click()"); await assistantReady(cdp);
}
async function filters(cdp, patch) {
  const ids = { category: 'iaCategory', subcategory: 'iaSubcategory', purpose: 'iaPurpose', barangay: 'iaBarangay', budget: 'iaBudget', budgetBasis: 'iaBudgetBasis', minArea: 'iaMinArea', maxArea: 'iaMaxArea', activity: 'iaActivity' };
  await cdp.eval(`(() => {document.querySelector('#iaFilterDetails').open=true;const patch=${JSON.stringify(patch)},ids=${JSON.stringify(ids)};for(const[k,id]of Object.entries(ids)){const input=document.getElementById(id);input.value=patch[k]??'';if(k==='category')input.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#iaFilterForm').requestSubmit();})()`);
  await assistantReady(cdp); await delay(150);
}

const pages = [];
const layoutOnly = process.argv.includes('--layout-only');
const filtersOnly = process.argv.includes('--filters-only');
const mobileOnly = process.argv.includes('--mobile-only');
let cdp;
let fixture;
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {} await delay(100); }
  fixture = sessionFixture();
  cdp = await createPage(); pages.push(cdp);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCookie', { name: fixture.cookie.split('=')[0], value: fixture.id, url: `${base}/`, path: '/', httpOnly: true, sameSite: 'Lax' });
  await cdp.send('Page.navigate', { url: `${base}/investor-dashboard.php` }); await assistantReady(cdp);
  await test('Property Assistant labels, description, published cards and deterministic mode', async () => {
    const data = await apiState(cdp);
    assert.equal(data.mode, 'rules'); assert.ok(data.total > 0);
    assert.equal(await cdp.eval("document.querySelector('#investmentAssistantTitle').textContent.trim()"), 'Property Assistant');
    assert.equal(await cdp.eval("document.querySelector('.ia-description').textContent.trim()"), 'Explore published properties through guided search.');
    assert.equal(await cdp.eval("document.querySelector('#iaGuidance').hidden"), true);
    assert.equal(await cdp.eval("document.querySelectorAll('[data-ia-property]').length"), data.results.length);
    assert.equal(await cdp.eval("document.querySelectorAll('#cityPropertyGrid').length"), 0);
    return { published: data.total };
  });
  for (const width of [1920, 1536, 1440, 1280, 1024, 900, 760, 390, 320]) {
    await resize(cdp, width); await cdp.eval('window.scrollTo({top:0,behavior:"instant"})'); await delay(180);
    await test(`Split layout and visible composer at ${width}px`, async () => {
      const report = await cdp.eval(`(() => {const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};return {width:innerWidth,docWidth:document.documentElement.scrollWidth,composer:box(document.querySelector('.ia-compose-wrap')),conversation:box(document.querySelector('.ia-conversation')),results:box(document.querySelector('#iaResults')),duplicates:document.querySelectorAll('#iaResults').length};})()`);
      assert.ok(report.docWidth <= width + 1, JSON.stringify(report)); assert.equal(report.duplicates, 1);
      assert.ok(report.composer.left >= -1 && report.composer.right <= width + 1, JSON.stringify(report));
      assert.ok(report.composer.bottom <= (width > 850 ? 900 : 844) + 1, JSON.stringify(report));
      const alignment = await cdp.eval("(() => {const a=document.querySelector('.ia-shell').getBoundingClientRect(),b=document.querySelector('.city-nav').getBoundingClientRect();return {left:a.left,right:a.right,navLeft:b.left,navRight:b.right};})()");
      assert.ok(Math.abs(alignment.left-alignment.navLeft)<=1 && Math.abs(alignment.right-alignment.navRight)<=1, JSON.stringify(alignment));
      assert.ok(await cdp.eval("!document.querySelector('#iaConversationTitle').textContent.includes('foryour')"));
      if (width <= 760) {
        const help = await cdp.eval("(() => {const help=document.querySelector('.locus-floating-help-btn'),composer=document.querySelector('.ia-compose-wrap');if(!help)return null;const a=help.getBoundingClientRect(),b=composer.getBoundingClientRect();return {bottom:a.bottom,composerTop:b.top};})()");
        if (help) assert.ok(help.bottom <= help.composerTop, JSON.stringify(help));
      }
      if (width > 760) assert.ok(report.conversation.right <= report.results.left + 1, JSON.stringify(report));
      if ([1920, 1536, 1440, 390, 320].includes(width)) await shot(cdp, `property-assistant-${width}.png`);
      return report;
    });
  }
  if (mobileOnly) {
    for (const [width,height] of [[390,844],[360,740],[320,568],[430,932],[844,390]]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height});
      await cdp.send('Emulation.setTouchEmulationEnabled', {enabled:true});
      await delay(350);
      await cdp.eval('window.scrollTo({top:0,behavior:"instant"})'); await delay(150);
      await test(`Mobile menu stays compact and hides page controls at ${width}x${height}`, async () => {
        await cdp.eval("document.querySelector('#cityMenuButton').click()"); await delay(250);
        const report=await cdp.eval(`(() => {const menu=document.querySelector('#cityNavigation'),r=menu.getBoundingClientRect(),v=visualViewport,composer=document.querySelector('.ia-compose-wrap'),help=document.querySelector('.locus-floating-help-btn');return {left:r.left,right:r.right,bottom:r.bottom,height:r.height,viewportBottom:v.offsetTop+v.height,links:menu.querySelectorAll('nav a').length,open:document.body.classList.contains('city-mobile-nav-open'),locked:document.documentElement.style.overflow,composerVisible:getComputedStyle(composer).visibility,composerInert:composer.inert,assistantInert:document.querySelector('[data-investment-assistant]').inert,helpVisible:help?getComputedStyle(help).visibility:null};})()`);
        assert.ok(report.open && report.locked==='hidden',JSON.stringify(report));
        assert.equal(report.links,6); assert.ok(report.left>=0&&report.right<=width+1,JSON.stringify(report));
        assert.ok(report.bottom<=report.viewportBottom-6,JSON.stringify(report));
        if(height>=568)assert.ok(report.height<=335,JSON.stringify(report));
        assert.equal(report.composerVisible,'hidden'); assert.equal(report.assistantInert,true);
        if(width<=760)assert.equal(report.composerInert,true);
        assert.ok(report.helpVisible===null||report.helpVisible==='hidden');
        if([390,320].includes(width))await shot(cdp,`property-assistant-mobile-menu-${width}.png`);
        await cdp.eval("document.querySelector('.city-signout-link').focus({preventScroll:true})");
        await key(cdp,'Tab'); assert.equal(await cdp.eval('document.activeElement.id'),'cityMenuButton');
        await key(cdp,'Escape'); await delay(100);
        assert.equal(await cdp.eval("document.body.classList.contains('city-mobile-nav-open')"),false);
        assert.equal(await cdp.eval("document.querySelector('[data-investment-assistant]').inert"),false);
        assert.equal(await cdp.eval('document.activeElement.id'),'cityMenuButton');
        return report;
      });
      if(await cdp.eval("document.querySelector('#cityMenuButton').getAttribute('aria-expanded')==='true'"))await cdp.eval("document.querySelector('#cityMenuButton').click()");
    }
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true,screenWidth:390,screenHeight:844});await delay(300);
    await test('Composer stops at footer and returns while browsing properties',async()=>{
      await cdp.eval('window.scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');await delay(350);
      const footerReport=await cdp.eval("({visibility:getComputedStyle(document.querySelector('.ia-compose-wrap')).visibility,footer:document.querySelector('.city-footer').getBoundingClientRect().top,rootBottom:document.querySelector('[data-investment-assistant]').getBoundingClientRect().bottom,viewport:visualViewport.offsetTop+visualViewport.height,scrollY,locked:document.documentElement.style.overflow})");
      assert.equal(footerReport.visibility,'hidden',JSON.stringify(footerReport));
      assert.equal(await cdp.eval("document.querySelector('.ia-compose-wrap').inert"),true);
      await shot(cdp,'property-assistant-mobile-footer.png');
      const scrollBefore=await cdp.eval('scrollY');
      await cdp.eval("document.querySelector('#cityMenuButton').click()");await delay(150);
      assert.equal(await cdp.eval("getComputedStyle(document.querySelector('.ia-compose-wrap')).visibility"),'hidden');
      await cdp.eval("document.querySelector('.city-footer').click()");await delay(150);
      assert.equal(await cdp.eval("document.body.classList.contains('city-mobile-nav-open')"),false);
      assert.ok(Math.abs((await cdp.eval('scrollY'))-scrollBefore)<=1);
      await cdp.eval("document.querySelector('#iaResultList').scrollIntoView({block:'start',behavior:'instant'})");await delay(350);
      assert.equal(await cdp.eval("getComputedStyle(document.querySelector('.ia-compose-wrap')).visibility"),'visible');
      await shot(cdp,'property-assistant-mobile-properties.png');
    });
    await test('Phone chat scrolls new responses into its conversation',async()=>{
      await cdp.eval('window.scrollTo({top:0,behavior:"instant"})');
      for(const message of ['Find a commercial lot','Only in Biday','No budget limit'])await submitMessage(cdp,message);
      await delay(500);
      const report=await cdp.eval("(() => {const b=document.querySelector('#iaConversationBody');return {top:b.scrollTop,height:b.clientHeight,total:b.scrollHeight};})()");
      assert.ok(report.total-report.height-report.top<=4,JSON.stringify(report));
      await shot(cdp,'property-assistant-mobile-chat.png');
    });
    await test('Filter swipe row and editor remain usable on a phone',async()=>{
      await cdp.eval("document.querySelector('#iaQuickBudget').scrollIntoView({block:'center',inline:'center',behavior:'instant'});document.querySelector('#iaQuickBudget').click()");await delay(400);
      const report=await cdp.eval("(() => {const a=document.querySelector('#iaApplyFilters').getBoundingClientRect(),c=document.querySelector('.ia-compose-wrap').getBoundingClientRect();return {bottom:a.bottom,dockTop:c.top,width:document.documentElement.scrollWidth};})()");
      assert.ok(report.width<=390&&report.bottom<=report.dockTop,JSON.stringify(report));
      await cdp.eval("document.querySelector('#iaCloseFilters').click()");
    });
    await test('Mobile interaction has no runtime exceptions',async()=>assert.deepEqual(cdp.errors,[]));
  }
  if (filtersOnly) {
    await resize(cdp, 1440);
    await test('Empty search hides selected tags and Clear all', async () => {
      assert.equal(await cdp.eval("document.querySelector('#iaFilterSummary').hidden"), true);
      assert.equal(await cdp.eval("document.querySelector('#iaClearFilters').hidden"), true);
      assert.ok(await cdp.eval("!document.querySelector('.ia-search-tools').textContent.includes('select a chip')"));
    });
    await test('Budget opens its own fields and Cancel restores unapplied edits', async () => {
      await cdp.eval("document.querySelector('#iaQuickBudget').click()");
      assert.equal(await cdp.eval("document.activeElement.id"), 'iaBudget');
      assert.equal(await cdp.eval("document.querySelector('#iaQuickBudget').getAttribute('aria-expanded')"), 'true');
      assert.deepEqual(await cdp.eval("[...document.querySelectorAll('[data-ia-group]')].filter(e=>!e.hidden).map(e=>e.dataset.iaGroup)"), ['budget','budget']);
      await cdp.eval("document.querySelector('#iaBudget').value='123456';document.querySelector('#iaCloseFilters').click()");
      assert.equal(await cdp.eval("document.querySelector('#iaBudget').value"), '');
      assert.equal(await cdp.eval("document.activeElement.id"), 'iaQuickBudget');
    });
    await test('Escape returns focus and All filters exposes every field', async () => {
      await cdp.eval("document.querySelector('#iaQuickBarangay').click()");
      await key(cdp, 'Escape');
      assert.equal(await cdp.eval("document.querySelector('#iaFilterDetails').open"), false);
      assert.equal(await cdp.eval("document.activeElement.id"), 'iaQuickBarangay');
      await cdp.eval("document.querySelector('#iaEditFilters').click()");
      assert.equal(await cdp.eval("document.querySelectorAll('[data-ia-group]:not([hidden])').length"), 10);
      await cdp.eval("document.querySelector('#iaDismissFilters').click()");
    });
    await test('Contextual sale and barangay choices preserve each other', async () => {
      await cdp.eval("document.querySelector('#iaQuickPurpose').click();document.querySelector('#iaPurpose').value='sale';document.querySelector('#iaFilterForm').requestSubmit()"); await assistantReady(cdp);
      await cdp.eval("document.querySelector('#iaQuickBarangay').click();document.querySelector('#iaBarangay').value='Biday';document.querySelector('#iaFilterForm').requestSubmit()"); await assistantReady(cdp);
      const data = await apiState(cdp); assert.equal(data.state.criteria.purpose, 'sale'); assert.equal(data.state.criteria.barangay, 'Biday');
      assert.equal(await cdp.eval("document.querySelector('#iaQuickPurpose .ia-filter-value').textContent"), 'For sale');
      assert.equal(await cdp.eval("document.querySelector('#iaQuickBarangay .ia-filter-value').textContent"), 'Biday');
      assert.equal(await cdp.eval("document.querySelector('#iaClearFilters').hidden"), false);
    });
    await test('Budget units and land range are visible on selected controls', async () => {
      await cdp.eval("document.querySelector('#iaQuickArea').click();document.querySelector('#iaMinArea').value='300';document.querySelector('#iaMaxArea').value='800';document.querySelector('#iaFilterForm').requestSubmit()"); await assistantReady(cdp);
      await cdp.eval("document.querySelector('#iaQuickBudget').click();document.querySelector('#iaBudget').value='1000000000';document.querySelector('#iaBudgetBasis').value='sale_total';document.querySelector('#iaFilterForm').requestSubmit()"); await assistantReady(cdp);
      assert.ok(await cdp.eval("document.querySelector('#iaQuickArea .ia-filter-value').textContent.includes('300–800 m²')"));
      assert.ok(await cdp.eval("document.querySelector('#iaQuickBudget .ia-filter-secondary').textContent.includes('total sale price')"));
      assert.equal(await cdp.eval("document.querySelectorAll('#iaChips .ia-chip').length"), 4);
      await cdp.eval('window.scrollTo({top:0,behavior:"instant"})'); await shot(cdp, 'property-assistant-refined-selected-1440.png');
    });
    await test('Filter surface and contextual editor fit mobile without obscuring Apply', async () => {
      await resize(cdp, 390); await cdp.eval("document.querySelector('#iaQuickBudget').click()"); await delay(400);
      const report=await cdp.eval("(() => {const p=document.querySelector('#iaFilterDetails').getBoundingClientRect(),a=document.querySelector('#iaApplyFilters').getBoundingClientRect(),c=document.querySelector('.ia-compose-wrap').getBoundingClientRect();return {width:document.documentElement.scrollWidth,left:p.left,right:p.right,applyBottom:a.bottom,composerTop:c.top};})()");
      assert.ok(report.width <=390 && report.left>=0 && report.right<=390, JSON.stringify(report));
      assert.ok(report.applyBottom <= report.composerTop, JSON.stringify(report));
      await shot(cdp, 'property-assistant-refined-editor-390.png');
      await cdp.eval("document.querySelector('#iaCloseFilters').click()");
    });
    await test('Clear all returns controls to neutral values', async () => {
      await cdp.eval("document.querySelector('#iaClearFilters').click()"); await assistantReady(cdp);
      assert.ok(Object.values((await apiState(cdp)).state.criteria).every(value=>value===null));
      assert.equal(await cdp.eval("document.querySelector('#iaFilterSummary').hidden"), true);
      assert.equal(await cdp.eval("document.querySelectorAll('.ia-filter-trigger.is-selected').length"), 0);
    });
    await test('Refined interface has no runtime exceptions', async () => assert.deepEqual(cdp.errors, []));
  }
  if (!layoutOnly && !filtersOnly && !mobileOnly) {
  await resize(cdp, 1440);
  await test('Clickable guidance and typed follow-up preserve criteria', async () => {
    await cdp.eval("document.querySelector('[data-ia-prompt=\"Buy a property\"]').click()"); await assistantReady(cdp);
    await submitMessage(cdp, 'Find a commercial lot in Biday');
    await submitMessage(cdp, 'PHP 5000000');
    const data = await apiState(cdp);
    assert.equal(data.state.criteria.purpose, 'sale'); assert.equal(data.state.criteria.subcategory, 'Commercial Lot');
    assert.equal(data.state.criteria.barangay, 'Biday'); assert.equal(data.state.criteria.budget, 5000000); assert.equal(data.state.criteria.budgetBasis, 'sale_total');
    assert.ok(await cdp.eval("document.querySelector('#iaChips').textContent.includes('Biday')"));
  });
  await test('Ambiguous request asks instead of changing the search', async () => {
    const before = await apiState(cdp); await submitMessage(cdp, 'commercial or residential lot'); const after = await apiState(cdp);
    assert.deepEqual(after.state.criteria, before.state.criteria); assert.ok(after.question);
  });
  await test('Unsupported question keeps filters and displays supported replies', async () => {
    const before = await apiState(cdp); await submitMessage(cdp, 'Guarantee my investment returns'); const after = await apiState(cdp);
    assert.deepEqual(after.state.criteria, before.state.criteria); assert.ok(after.guidance.length);
    assert.ok(await cdp.eval("document.querySelector('#iaGuidance').textContent.length>0"));
  });
  await test('Land area, rental period and budget filters submit the actual API', async () => {
    await filters(cdp, { purpose: 'lease', budget: 50000, budgetBasis: 'lease_month_total', minArea: 100 });
    const data = await apiState(cdp); assert.equal(data.state.criteria.minArea, 100); assert.equal(data.state.criteria.budgetBasis, 'lease_month_total');
    assert.ok(data.results.every(card => ['lease', 'sale_or_lease'].includes(card.purpose)));
  });
  await test('Zero results show exact text and explicit adjustment choices', async () => {
    await filters(cdp, { purpose: 'sale', budget: 1, budgetBasis: 'sale_total' }); const data = await apiState(cdp);
    assert.equal(data.total, 0); assert.ok(data.message.includes('No published properties match your current filters.'));
    assert.ok(await cdp.eval("document.querySelector('#iaResultList').textContent.includes('No published properties match your current filters.')"));
    assert.ok(await cdp.eval("document.querySelectorAll('[data-ia-suggestion]').length>0"));
    await cdp.eval("document.querySelector('[data-ia-suggestion]').click()"); await assistantReady(cdp);
    assert.ok((await apiState(cdp)).total > 0);
  });
  await resetAssistant(cdp);
  await test('Recorded details and missing values render without hiding available facts', async () => {
    const data = await apiState(cdp);
    const card = data.results.find(card => Object.values(card.details || {}).includes('This information is not available in the current listing.'));
    assert.ok(card);
    const field = Object.keys(card.details).find(key => card.details[key] === 'This information is not available in the current listing.');
    await submitMessage(cdp, `${field} for property ${card.id}`);
    const after = await apiState(cdp); assert.ok(after.message.includes('This information is not available in the current listing.')); assert.ok(after.message.includes(card.name));
    assert.ok(await cdp.eval("document.querySelector('#iaMessages').textContent.includes('This information is not available in the current listing.')"));
    assert.equal(after.results.length, data.results.length);
  });
  await test('Property details links and comparison use displayed IDs', async () => {
    const data = await apiState(cdp);
    const href = await cdp.eval("document.querySelector('[data-ia-property] h3 a').href"); assert.ok(href.includes(`property-details.php?id=${data.results[0].id}`));
    await cdp.eval("[...document.querySelectorAll('[data-ia-compare]')].slice(0,2).forEach(b=>b.click())");
    assert.ok(await cdp.eval("document.querySelector('#iaCompareLink').href.includes('compare-decision.php')"));
  });
  await test('Map uses actual listing coordinates and can return to list', async () => {
    await cdp.eval("document.querySelector('#iaMapView').click()");
    await waitFor(cdp, "!document.querySelector('#iaMapPanel').hidden && document.querySelector('#iaMapStatus').textContent.length>0", 20000);
    assert.equal(await cdp.eval("document.querySelector('#iaMapView').getAttribute('aria-pressed')"), 'true');
    await cdp.eval("document.querySelector('#iaListView').click()");
    assert.equal(await cdp.eval("document.querySelector('#iaMapPanel').hidden"), true);
  });
  await test('Map clears markers when filters remove every result', async () => {
    await cdp.eval("document.querySelector('#iaMapView').click()");
    await waitFor(cdp, "document.querySelector('#iaPropertyMap .leaflet-marker-icon')");
    await filters(cdp, { purpose: 'sale', budget: 1, budgetBasis: 'sale_total' });
    assert.equal(await cdp.eval("document.querySelectorAll('#iaPropertyMap .leaflet-marker-icon').length"), 0);
    assert.ok(await cdp.eval("document.querySelector('#iaMapStatus').textContent.includes('No published properties match your current filters.')"));
    await resetAssistant(cdp);
    await cdp.eval("document.querySelector('#iaListView').click()");
  });
  await test('Loading disables duplicate submissions', async () => {
    await cdp.eval("window.__paFetch=window.fetch;window.fetch=(input,options)=>String(input).includes('/investment-assistant.php')?new Promise(resolve=>setTimeout(()=>resolve(window.__paFetch(input,options)),600)):window.__paFetch(input,options);document.querySelector('#iaMessage').value='Only in Biday';document.querySelector('#iaMessageForm').requestSubmit()");
    assert.equal(await cdp.eval("document.querySelector('#iaWorkbench').getAttribute('aria-busy')"), 'true');
    assert.equal(await cdp.eval("document.querySelector('#iaSend').disabled"), true);
    await assistantReady(cdp); await cdp.eval('window.fetch=window.__paFetch');
  });
  await test('Connection error and retry preserve last successful filters', async () => {
    const before = await apiState(cdp);
    await cdp.eval("window.__paFetch=window.fetch;window.__paFail=true;window.fetch=(input,options)=>String(input).includes('/investment-assistant.php')&&window.__paFail?(window.__paFail=false,Promise.reject(new TypeError('QA disconnect'))):window.__paFetch(input,options)");
    await submitMessage(cdp, 'Find land'); assert.equal(await cdp.eval("document.querySelector('#iaError').hidden"), false);
    assert.deepEqual((await apiState(cdp)).state.criteria, before.state.criteria);
    await cdp.eval("document.querySelector('#iaRetry').click()"); await assistantReady(cdp);
    assert.equal(await cdp.eval("document.querySelector('#iaError').hidden"), true); await cdp.eval('window.fetch=window.__paFetch');
  });
  await test('Database error is separate from missing listing details', async () => {
    const before = await apiState(cdp);
    await cdp.eval("window.__paFetch=window.fetch;window.__paFail=true;window.fetch=(input,options)=>String(input).includes('/investment-assistant.php')&&window.__paFail?(window.__paFail=false,Promise.resolve(new Response(JSON.stringify({error:'Published properties could not be loaded. Please try again. Your last successful filters are preserved.',code:'database_unavailable'}),{status:503,headers:{'Content-Type':'application/json'}}))):window.__paFetch(input,options)");
    await submitMessage(cdp, 'Only in Poro');
    assert.equal(await cdp.eval("document.querySelector('#iaError').hidden"), false);
    assert.ok(await cdp.eval("!document.querySelector('#iaErrorMessage').textContent.includes('This information is not available in the current listing.')"));
    assert.deepEqual((await apiState(cdp)).state.criteria, before.state.criteria);
    await cdp.eval('window.fetch=window.__paFetch');
  });
  await test('Conversation persists after reload', async () => {
    const before = await apiState(cdp); await cdp.send('Page.reload'); await assistantReady(cdp); const after = await apiState(cdp);
    assert.deepEqual(after.state.criteria, before.state.criteria); assert.deepEqual(after.state.messages, before.state.messages);
  });
  await test('Listing and conversation text cannot execute HTML or active image URLs', async () => {
    await cdp.eval(`(() => {window.__paFetch=window.fetch;window.fetch=(input,options)=>{if(!String(input).includes('/investment-assistant.php'))return window.__paFetch(input,options);return window.__paFetch(input,options).then(async response=>{const data=await response.json();if(data.results[0]){data.results[0].name='<img src=x onerror="window.__paInjected=true">';data.results[0].image='javascript:window.__paInjected=true';data.results[0].reasons=['<script>window.__paInjected=true</script>'];}data.state.messages=[{role:'assistant',content:'<img src=x onerror="window.__paInjected=true">'}];return new Response(JSON.stringify(data),{status:response.status,headers:{'Content-Type':'application/json'}});});};})()`);
    await resetAssistant(cdp);
    assert.equal(await cdp.eval('window.__paInjected===true'), false);
    assert.ok(await cdp.eval("document.querySelector('#iaMessages').textContent.includes('<img')"));
    assert.ok(await cdp.eval("document.querySelector('#iaResultList').textContent.includes('<script>')"));
    assert.equal(await cdp.eval("document.querySelectorAll('#iaResultList script,#iaResultList img[src^=\"javascript:\"]').length"), 0);
    await cdp.eval('window.fetch=window.__paFetch');
    await cdp.send('Page.reload'); await assistantReady(cdp);
  });
  await test('Find Agent loads and preserves investor navigation', async () => {
    await cdp.send('Page.navigate', { url: `${base}/investor-dashboard.php?view=agents` });
    await waitFor(cdp, "document.querySelector('#agentDirectoryTitle')?.textContent==='Find Agent'");
    assert.equal(await cdp.eval("document.querySelectorAll('[data-investment-assistant],#cityPropertyGrid').length"), 0);
    assert.ok(await cdp.eval("document.querySelector('.agent-directory').textContent.includes('published')"));
    await shot(cdp, 'property-assistant-find-agent.png');
    return { cards: await cdp.eval("document.querySelectorAll('.agent-directory-card').length") };
  });
  await test('Catalogue remains reachable as the existing separate view', async () => {
    await cdp.send('Page.navigate', { url: `${base}/investor-dashboard.php?view=catalogue` });
    await waitFor(cdp, "document.querySelector('#cityPropertyGrid')");
    assert.equal(await cdp.eval("document.querySelectorAll('[data-investment-assistant]').length"), 0);
  });
  await test('No page runtime exceptions', async () => assert.deepEqual(pages.flatMap(page => page.errors), []));
  }
} catch (error) {
  results.push({ name: 'Harness execution', status: 'FAIL', error: error.stack }); console.error(error.message);
} finally {
  await writeFile(path.join(out, layoutOnly ? 'property-assistant-layout-results.json' : filtersOnly ? 'property-assistant-filter-results.json' : mobileOnly ? 'property-assistant-mobile-results.json' : 'property-assistant-browser-results.json'), JSON.stringify(results, null, 2));
  await Promise.all(pages.map(page => page.close())); chrome.kill(); clearInterval(keepAlive);
  if (fixture) execFileSync('C:/xampp/php/php.exe', ['tests/investment-assistant-api.test.php', '--cleanup-fixture', fixture.id], { cwd: root, stdio: 'ignore' });
}
console.log(JSON.stringify({ passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length }));
if (results.some(r => r.status === 'FAIL')) process.exitCode = 1;
