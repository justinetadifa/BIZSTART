/* Run against local demo data. Install Playwright separately, or set PLAYWRIGHT_MODULE.
   Final property POSTs are intercepted: this suite never creates a listing. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LOCUS_TEST_URL || 'http://localhost/sfcelerate-bizstart';
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const reports = [];

async function login(page, role) {
  await page.goto(`${base}/${role}-login.php`);
  await page.locator('#login-email').fill(role === 'admin' ? 'admin@sfcelerate.local' : 'investor@sfcelerate.local');
  await page.locator('#login-password').fill(role === 'admin' ? 'Admin123!' : 'Investor123!');
  await Promise.all([
    page.waitForURL(/account-welcome|dashboard/),
    page.locator('.account-submit').first().click(),
  ]);
}

async function settled(page) {
  await page.waitForTimeout(350);
}

async function motion(page, mobile) {
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LOCUS_MOTION && document.documentElement.dataset.locusMotionReady);
  assert(await page.locator('#heroTitle').isVisible(), 'Hero is immediately visible');
  const hero = await page.locator('#heroTitle').evaluate(node => ({ opacity: getComputedStyle(node).opacity, animations: node.getAnimations({ subtree: true }).filter(a => !a.effect.target.closest('svg') && a.effect.getKeyframes().some(k => k.opacity === '0')).length }));
  assert.equal(hero.opacity, '1');
  assert.equal(hero.animations, 0, 'Hero title must not disappear during hydration');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--locus-motion-distance').trim()), '8px');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--locus-motion-duration').trim()), '240ms');
  await page.evaluate(() => {
    window.__reveals = [];
    document.addEventListener('animationstart', event => {
      if (event.animationName === 'locus-enter') window.__reveals.push({ target: event.target, duration: getComputedStyle(event.target).animationDuration });
    });
  });
  const target = page.locator('[data-locus-motion="pending"]:not([data-locus-motion-kind="section"])').first();
  assert(await target.count(), 'Below-fold content is observed');
  const handle = await target.elementHandle();
  await handle.evaluate(node => node.scrollIntoView({ behavior: 'instant', block: 'center' }));
  await page.waitForFunction(node => window.__reveals.some(item => item.target === node), handle);
  assert.equal(await page.evaluate(node => window.__reveals.find(item => item.target === node).duration, handle), '0.24s');
  await page.waitForTimeout(300);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await handle.evaluate(node => node.scrollIntoView({ behavior: 'instant', block: 'center' }));
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(node => window.__reveals.filter(item => item.target === node).length, handle), 1, 'Content reveals only once');
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo({ top: 0, behavior: 'instant' }); });
  await page.keyboard.press('PageDown');
  await page.waitForFunction(() => scrollY > 100);
  const y = await page.evaluate(() => scrollY);
  await page.mouse.move(mobile ? 180 : 600, 200);
  await page.mouse.wheel(0, 550);
  await page.waitForFunction(before => scrollY > before + 100, y);
  if (mobile) {
    const cdp = await page.context().newCDPSession(page);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 650, id: 0 }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 650 - i * 35, id: 0 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => scrollY > 200);
  }
  reports.push(`${mobile ? 'Mobile' : 'Desktop'}: immediate hero, 240ms/8px once-only reveal, native PageDown and wheel`);
}

async function browsing(page, mobile) {
  await login(page, 'investor');
  await page.goto(`${base}/investor-dashboard.php?view=catalogue`);
  await page.locator('.city-property-card').first().waitFor();
  await page.locator('#cityCategory').selectOption('Land');
  await page.locator('#citySort').selectOption('price');
  await page.locator('#citySearch').fill('Biday');
  await settled(page);
  const links = page.locator('.city-property-card a[href*="property-details.php"]');
  assert(await links.count() > 0, 'Filtered properties exist');
  const link = links.first();
  await link.scrollIntoViewIfNeeded();
  await settled(page);
  const y = await page.evaluate(() => scrollY);
  await Promise.all([page.waitForURL(/property-details.php/), link.click()]);
  await page.goBack();
  await page.locator('.city-property-card').first().waitFor();
  await page.waitForFunction(saved => Math.abs(scrollY - saved) < 8, y);
  assert.equal(await page.locator('#cityCategory').inputValue(), 'Land');
  assert.equal(await page.locator('#citySort').inputValue(), 'price');
  assert.equal(await page.locator('#citySearch').inputValue(), 'Biday');
  await page.reload();
  await page.locator('.city-property-card').first().waitFor();
  await page.waitForFunction(saved => Math.abs(scrollY - saved) < 8, y);
  assert.equal(await page.locator('#citySearch').inputValue(), 'Biday');
  reports.push(`${mobile ? 'Mobile' : 'Desktop'}: filtered details/back and reload restore controls and scroll`);

  await page.goto(`${base}/investor-dashboard.php`);
  await page.waitForFunction(() => !document.querySelector('#iaEditFilters')?.disabled);
  await page.locator('#iaEditFilters').click();
  assert(await page.locator('#iaFilterDetails').evaluate(node => node.open), 'Filter panel opens');
  assert.equal(await page.locator('#iaFilterDetails').getAttribute('data-locus-disclosure'), '');
  await page.keyboard.press('Tab');
  await page.locator('#iaDismissFilters').focus();
  const focus = await page.locator('#iaDismissFilters').evaluate(node => ({ visible: node.matches(':focus-visible'), style: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth) }));
  assert(focus.visible && focus.style !== 'none' && focus.width >= 2, 'Keyboard focus is clearly outlined');
  const button = page.locator('#iaDismissFilters');
  const buttonBox = await button.boundingBox();
  await page.mouse.move(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(150);
  const press = await button.evaluate(node => ({ duration: getComputedStyle(node).transitionDuration, scale: getComputedStyle(node).scale }));
  assert.equal(press.duration, '0.12s', 'Press feedback lasts 120ms');
  assert(Number(press.scale) < 1 && Number(press.scale) > .97, 'Press response is subtle');
  await page.mouse.up();
  reports.push(`${mobile ? 'Mobile' : 'Desktop'}: native filter disclosure and visible keyboard focus`);
}

async function assistantBack(page, mobile) {
  await page.goto(`${base}/investor-dashboard.php`);
  await page.waitForFunction(() => !document.querySelector('#iaEditFilters')?.disabled);
  await page.locator('#iaEditFilters').click();
  await page.locator('#iaCategory').selectOption('Land');
  await page.locator('#iaApplyFilters').click();
  const link = page.locator('.ia-property-card a[href*="property-details.php"]').first();
  await link.waitFor();
  await page.locator('#iaMessage').fill('Keep this unsent property question');
  await page.locator('#iaEditFilters').click();
  await page.locator('#iaBudget').fill('15000000');
  await link.scrollIntoViewIfNeeded();
  await settled(page);
  const y = await page.evaluate(() => scrollY);
  await Promise.all([page.waitForURL(/property-details.php/), link.click()]);
  await page.goBack();
  await page.locator('.ia-property-card').first().waitFor();
  await page.waitForFunction(saved => Math.abs(scrollY - saved) < 8, y);
  assert.equal(await page.locator('#iaCategory').inputValue(), 'Land');
  assert.equal(await page.locator('#iaMessage').inputValue(), 'Keep this unsent property question');
  assert.equal(await page.locator('#iaBudget').inputValue(), '15000000');
  assert(await page.locator('#iaFilterDetails').evaluate(node => node.open), 'Open filter editor is restored');
  reports.push(`${mobile ? 'Mobile' : 'Desktop'}: Property Assistant back restores applied filters, unsent message, editor draft/open state and scroll`);
}

async function mapGestures(page, mobile) {
  await page.goto(`${base}/property-explorer.php`);
  const map = page.locator('#cityPropertyMap');
  await map.locator('.leaflet-map-pane').waitFor({ state: 'attached' });
  await map.scrollIntoViewIfNeeded();
  await settled(page);
  const box = await map.boundingBox();
  const pane = map.locator('.leaflet-map-pane');
  const before = await pane.evaluate(node => node.style.transform);
  const x = box.x + box.width * .45, y = box.y + box.height * .45;
  if (mobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 10, y: y + i * 3, id: 0 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + 90, y + 35, { steps: 10 }); await page.mouse.up();
  }
  await page.waitForFunction(({ selector, transform }) => document.querySelector(selector).style.transform !== transform, { selector: '#cityPropertyMap .leaflet-map-pane', transform: before });
  const tiles = () => map.locator('.leaflet-tile-container').evaluateAll(nodes => nodes.map(node => node.style.transform).join('|'));
  const zoomBefore = await tiles();
  if (mobile) {
    const cdp = await page.context().newCDPSession(page);
    const pinch = distance => [{ x: x - distance, y, id: 0 }, { x: x + distance, y, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pinch(30) });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pinch(30 + i * 7) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.dblclick(x, y);
  }
  await page.waitForTimeout(1000);
  assert.notEqual(await tiles(), zoomBefore, 'Map zoom gesture changes tile transforms');
  reports.push(`${mobile ? 'Mobile touch pan/pinch' : 'Desktop map drag/double-click zoom'} preserved`);
}

async function submission(page, mobile) {
  await login(page, 'admin');
  await page.goto(`${base}/admin-properties.php`);
  await page.locator('[data-add-listing]').click();
  const dialog = page.locator('#cityPropertyEditor');
  const form = dialog.locator('[data-property-form]');
  assert(await dialog.isVisible(), 'Add Property dialog opens');
  assert.equal(await dialog.getAttribute('data-locus-dialog'), '');
  await form.locator('[data-editor-next]').click();
  await form.locator('[aria-invalid="true"]').first().waitFor();
  assert(await form.locator('[data-field-error]:visible').count() > 0, 'Validation is inline');
  await form.locator('[name=property_name]').fill('Interaction verification — no record created');
  await form.locator('[name=category]').selectOption('Land');
  await form.locator('[name=subcategory]').selectOption('Commercial Lot');
  await form.locator('[name=sale_price_mode]').selectOption('request');
  await form.locator('[name=declared_area_sqm]').fill('100');
  await form.locator('[data-editor-step="3"]').click();
  const submit = form.locator('[type=submit]');
  await submit.waitFor({ state: 'visible' });
  let posts = 0, release;
  await page.route('**/api/properties.php', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    posts++;
    await new Promise(resolve => { release = resolve; });
    await route.fulfill({ status: posts === 1 ? 503 : 200, contentType: 'application/json', body: JSON.stringify(posts === 1 ? { error: 'Temporary service interruption. Please try again.' } : { property: { id: 987654321, approvalState: 'approved', status: 'Available' } }) });
  });
  await submit.click();
  await page.waitForFunction(() => document.querySelector('#cityPropertyEditor [data-property-form]').getAttribute('aria-busy') === 'true');
  assert.equal(await submit.innerText(), 'Submitting…');
  assert(await submit.isDisabled());
  assert.equal(await form.locator('[name=property_name]').inputValue(), 'Interaction verification — no record created');
  await form.evaluate(node => { node.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); node.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await settled(page);
  assert.equal(posts, 1, 'Pending submission ignores duplicate submit events');
  release();
  const retry = form.locator('[data-editor-retry]');
  await retry.waitFor({ state: 'visible' });
  assert.equal(await form.locator('[name=property_name]').inputValue(), 'Interaction verification — no record created');
  assert.equal(await form.locator('[name=declared_area_sqm]').inputValue(), '100');
  assert(await dialog.isVisible(), 'Entered data remains in the editor after failure');
  await retry.click();
  await page.waitForFunction(() => document.querySelector('#cityPropertyEditor [data-property-form]').getAttribute('aria-busy') === 'true');
  await settled(page);
  assert.equal(posts, 2, 'Retry sends exactly one new request');
  release();
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => /Status: Approved/.test(document.querySelector('[data-workspace-status]').textContent));
  assert.match(await page.locator('[data-workspace-status]').innerText(), /Availability: Available/);
  await page.unroute('**/api/properties.php');
  reports.push(`${mobile ? 'Mobile' : 'Desktop'}: inline validation; pending feedback/duplicate guard; failure preserves values; retry displays actual Approved/Available response (POSTs mocked)`);
}

async function reduced(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/`);
  await page.waitForFunction(() => document.querySelector('.ios-hero')?.dataset.motionChoice === 'on');
  assert.equal(await page.locator('html').getAttribute('data-home-motion'), 'on');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'smooth');
  await page.goto(`${base}/admin-properties.php`);
  await page.locator('[data-add-listing]').click();
  assert.equal(await page.locator('#cityPropertyEditor').evaluate(node => getComputedStyle(node).transitionDuration), '0s');
  await page.locator('#cityPropertyEditor [data-editor-next]').click();
  assert(await page.locator('#cityPropertyEditor [data-field-error]:visible').count() > 0);
  reports.push('Explicit homepage motion remains on; property workspace reduced motion keeps dialogs immediate and inline status available');
}

async function nativeHistoryAndNoScript() {
  const browser = await chromium.launch({ headless: true, executablePath, ignoreDefaultArgs: ['--disable-back-forward-cache'] });
  try {
    const noScript = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await noScript.newPage();
    await staticPage.goto(`${base}/`);
    assert(await staticPage.locator('#heroTitle').isVisible());
    assert.equal(await staticPage.locator('#heroTitle').evaluate(node => getComputedStyle(node).opacity), '1');
    reports.push('Hero remains visible with JavaScript disabled');
    await noScript.close();

    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => { window.__historyShows = []; addEventListener('pageshow', event => window.__historyShows.push(event.persisted)); });
    const page = await context.newPage();
    await page.goto(`${base}/index.php`);
    await page.locator('#cityPrivacyGuest').click();
    await page.evaluate(() => { window.__sameDocument = true; });
    await page.locator('.ios-hero-cta').click();
    await page.waitForFunction(() => location.hash === '#properties');
    assert(new URL(page.url()).pathname.endsWith('/index.php'));
    assert.equal(await page.evaluate(() => window.__sameDocument), true, 'Fragment links must not reload through the shared base URL');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'smooth');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.civic-canvas')?.dataset.artMotion === 'on' && document.querySelector('.ios-hero')?.dataset.motionChoice === 'on');
    assert(!(await page.locator('.civic-switch').isDisabled()));
    assert.equal(await page.locator('.civic-switch').getAttribute('aria-checked'), 'true');
    reports.push('Native fragment links stay in the current document; the explicit homepage motion choice keeps React hero and civic effects enabled');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await login(page, 'investor');
    await page.goto(`${base}/investor-dashboard.php?view=catalogue`);
    await page.locator('.city-property-card').first().waitFor();
    await page.locator('#citySearch').fill('Biday');
    await settled(page);
    const link = page.locator('.city-property-card a[href*="property-details.php"]').first();
    await link.scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => scrollY);
    await Promise.all([page.waitForURL(/property-details.php/), link.click()]);
    await page.goBack();
    await page.locator('.city-property-card').first().waitFor();
    await page.waitForFunction(saved => Math.abs(scrollY - saved) < 8, y);
    assert.equal(await page.locator('#citySearch').inputValue(), 'Biday');
    reports.push(`Native browser Back restores controls/scroll; BFCache ${await page.evaluate(() => window.__historyShows.includes(true)) ? 'used' : 'unavailable in this run'}`);
    await context.close();
  } finally { await browser.close(); }
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-features=BackForwardCache'] });
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => console.error('Browser error:', error.message));
      await motion(page, mobile);
      await browsing(page, mobile);
      await assistantBack(page, mobile);
      await mapGestures(page, mobile);
      await submission(page, mobile);
      if (mobile) await reduced(page);
      await context.close();
    }
  } finally { await browser.close(); }
  await nativeHistoryAndNoScript();
  console.log(reports.join('\n'));
})().catch(error => { console.error(reports.join('\n')); console.error(error); process.exitCode = 1; });
