/* Real scrolling checks; no account or database writes. Set PLAYWRIGHT_MODULE
   when Playwright is installed outside the repository. Screenshots are ignored. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LOCUS_TEST_URL || 'http://localhost/sfcelerate-bizstart';
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const artifacts = path.resolve(__dirname, '../.ui-audit');
fs.mkdirSync(artifacts, { recursive: true });

async function installProbe(context) {
  await context.addInitScript(() => {
    try { sessionStorage.setItem('locus.privacy-preview', '1'); } catch {}
    const identities = new WeakMap();
    let nextIdentity = 0;
    window.__scrollReveals = [];
    window.__cancelledScrollInputs = [];
    document.addEventListener('animationstart', event => {
      if (!event.animationName.startsWith('locus-enter')) return;
      const node = event.target;
      if (!identities.has(node)) identities.set(node, ++nextIdentity);
      const box = node.getBoundingClientRect();
      const animation = node.getAnimations().find(item => item.animationName === event.animationName);
      const timing = animation?.effect?.getComputedTiming();
      const sample = {
        identity: identities.get(node), name: node.id || node.className,
        startedAt: performance.now(),
        top: box.top, viewport: innerHeight, duration: timing?.duration,
        frames: animation?.effect?.getKeyframes().map(({ opacity, translate }) => ({ opacity, translate })),
      };
      window.__scrollReveals.push(sample);
      setTimeout(() => {
        if (!node.isConnected) return;
        const style = getComputedStyle(node);
        sample.midpoint = { opacity: Number(style.opacity), translate: style.translate };
      }, 70);
    }, true);
    for (const type of ['wheel', 'touchmove', 'keydown']) {
      window.addEventListener(type, event => {
        setTimeout(() => { if (event.defaultPrevented) window.__cancelledScrollInputs.push(type); });
      }, { passive: true });
    }
  });
}

async function scrollThrough(page, mobile) {
  const amount = mobile ? 280 : 360;
  let captured = false;
  await page.mouse.move(mobile ? 180 : 700, 250);
  let endCount = 0;
  for (let index = 0; index < 160; index++) {
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, amount);
    await page.waitForTimeout(85);
    if (!captured && await page.evaluate(() => window.__scrollReveals.some(item =>
      item.duration >= 400 && performance.now() - item.startedAt < 240
      && item.top > 0 && item.top < innerHeight * .94
      && item.midpoint?.opacity > 0 && item.midpoint.opacity < 1))) {
      await page.screenshot({ path: path.join(artifacts, `scroll-experience-${mobile ? 'mobile' : 'desktop'}-entering.png`) });
      captured = true;
    }
    const atEnd = await page.evaluate(previous => innerHeight + scrollY >= document.documentElement.scrollHeight - 8 || scrollY === previous, before);
    endCount = atEnd ? endCount + 1 : 0;
    if (endCount >= 3) break;
  }
}

async function assertNativeInput(page, context, mobile) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.keyboard.press('PageDown');
  await page.waitForFunction(() => scrollY > 100);
  if (mobile) {
    const cdp = await context.newCDPSession(page);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 680, id: 0 }] });
    for (let index = 1; index <= 10; index++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 680 - index * 40, id: 0 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => scrollY > 100);
    await cdp.detach();
  }
}

async function check(context, mobile) {
  const label = mobile ? 'mobile' : 'desktop';
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/index.php`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.documentElement.dataset.locusMotionReady === 'true');
  assert(await page.locator('#heroTitle').isVisible(), 'Hero is visible immediately');
  assert.equal(await page.locator('#heroTitle').evaluate(node => getComputedStyle(node).opacity), '1');
  await page.waitForTimeout(150);
  await scrollThrough(page, mobile);
  await page.waitForTimeout(650);
  const reveals = await page.evaluate(() => window.__scrollReveals);
  const visibleReveals = reveals.filter(item => item.top > 0 && item.top < item.viewport * .94 && item.duration >= 400);
  assert(visibleReveals.length >= 3, `Expected visible, longer section reveals; got ${JSON.stringify(reveals)}`);
  assert(visibleReveals.some(item => item.frames?.some(frame => parseFloat(frame.opacity) < .1)), 'Sections fade in visibly');
  assert(visibleReveals.some(item => item.frames?.some(frame => /[1-9]/.test(frame.translate || ''))), 'Sections visibly rise');
  assert(visibleReveals.some(item => item.midpoint?.opacity > 0 && item.midpoint.opacity < 1), 'The opacity is between endpoints during scrolling');
  const seen = new Set();
  for (const item of reveals) { assert(!seen.has(item.identity), 'Each content unit reveals once'); seen.add(item.identity); }

  await assertNativeInput(page, context, mobile);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('.ios-hero-cta').click();
  await page.waitForFunction(() => location.hash === '#properties');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'smooth');
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => window.__scrollReveals);
  const repeated = after.filter((item, index) => after.findIndex(other => other.identity === item.identity) !== index);
  assert.equal(repeated.length, 0, 'Returning through sections does not replay their entrance');
  assert.deepEqual(await page.evaluate(() => window.__cancelledScrollInputs), [], 'Page scroll input is not cancelled');
  await page.screenshot({ path: path.join(artifacts, `scroll-experience-${label}.png`), fullPage: false });

  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.documentElement.dataset.locusMotionReady === 'true');
  assert(await page.locator('[data-locus-motion-kind="section"][data-locus-motion="pending"]').count() > 0,
    'Refreshing the page at the top prepares the new scroll effects again');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/index.php`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.documentElement.dataset.locusMotionReady === 'true');
  assert(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'The regression exercises an actual reduced-motion browser');
  assert.equal(await page.locator('html').getAttribute('data-home-motion'), 'on');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'smooth');
  assert(await page.locator('[data-locus-motion-kind="section"][data-locus-motion="pending"]').count() > 0,
    'The explicit homepage choice prepares section entrances even with reduced motion enabled');
  await scrollThrough(page, mobile);
  await page.waitForTimeout(650);
  const reducedReveals = await page.evaluate(() => window.__scrollReveals);
  const reducedVisible = reducedReveals.filter(item => item.top > 0 && item.top < item.viewport * .94 && item.duration >= 400);
  assert(reducedVisible.length >= 3, `The homepage override visibly reveals sections: ${JSON.stringify(reducedReveals)}`);
  assert(reducedVisible.some(item => item.midpoint?.opacity > 0 && item.midpoint.opacity < 1), 'Homepage entrances actually animate despite the browser preference');
  assert.equal(new Set(reducedReveals.map(item => item.identity)).size, reducedReveals.length, 'The override still reveals each content unit only once');
  await assertNativeInput(page, context, mobile);
  assert.deepEqual(await page.evaluate(() => window.__cancelledScrollInputs), [], 'The homepage override preserves native inputs');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'The homepage override does not add horizontal overflow');
  assert(await page.locator('#heroTitle').isVisible());
  assert.equal(errors.length, 0, `Browser errors: ${errors.join('; ')}`);
  console.log(`PASS ${label}: ${reveals.length} once-only reveals (${reducedReveals.length} with reduced-motion preference), ${visibleReveals.length}/${reducedVisible.length} visible section entrances, native wheel/keyboard${mobile ? '/touch' : ''}, smooth anchors and immediate hero.`);
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'no-preference' });
      await installProbe(context);
      try { await check(context, mobile); } finally { await context.close(); }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
