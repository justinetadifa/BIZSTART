/* Normal first-visit and cached-reload checks. No request interception,
   consent-storage setup, account sign-in, or database writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LOCUS_TEST_URL || 'http://localhost/sfcelerate-bizstart';
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const artifacts = path.resolve(__dirname, '../.ui-audit');
fs.mkdirSync(artifacts, { recursive: true });
const reports = [];

async function visibleArrival(page, name) {
  const photo = page.locator('.ios-hero-photo-reveal');
  await photo.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const photo = document.querySelector('.ios-hero-photo-reveal');
    return photo?.getAnimations().some(animation => animation.animationName === 'locus-hero-photo-arrival'
      && animation.playState === 'running' && animation.effect.getComputedTiming().progress < .95);
  });
  const sample = await photo.evaluate(node => {
    const animation = node.getAnimations().find(animation => animation.animationName === 'locus-hero-photo-arrival');
    const timing = animation.effect.getComputedTiming();
    const style = getComputedStyle(node);
    const matrix = new DOMMatrix(style.transform);
    const bounds = node.getBoundingClientRect();
    return { duration: timing.duration, progress: timing.progress, transform: style.transform,
      scale: matrix.a, opacity: Number(style.opacity), visibleHeight: Math.min(innerHeight, bounds.bottom) - Math.max(0, bounds.top) };
  });
  assert(sample.duration >= 1200, 'The arrival lasts long enough to see on a fast connection');
  assert(sample.progress < .95, 'The normal visible page still has an active arrival');
  assert(sample.visibleHeight > 250 && sample.opacity >= .7, 'The photo is visibly animated inside the viewport');
  assert(await page.locator('#heroTitle').isVisible());
  assert.equal(await page.locator('#heroTitle').evaluate(node => getComputedStyle(node).opacity), '1');
  assert(await page.locator('.ios-hero-cta').isVisible());
  assert.equal(await page.locator('dialog[open]').count(), 0, 'No dialog obscures the measured entrance');
  await page.waitForTimeout(180);
  const movingScale = await photo.evaluate(node => new DOMMatrix(getComputedStyle(node).transform).a);
  assert(movingScale < sample.scale, 'The image visibly changes scale while the visitor can see it');
  await page.screenshot({ path: path.join(artifacts, `${name}-during.png`) });
  await page.waitForTimeout(2100);
  assert(await page.locator('#heroTitle').isVisible());
  assert.equal(await photo.evaluate(node => getComputedStyle(node).opacity), '1');
  assert(await photo.evaluate(node => Math.abs(new DOMMatrix(getComputedStyle(node).transform).a - 1) < .001), 'The camera move settles at its final scale');
  await page.screenshot({ path: path.join(artifacts, `${name}-settled.png`) });
  return sample;
}

async function check(browser, mobile, reducedMotion) {
  const label = `${mobile ? 'mobile' : 'desktop'}-${reducedMotion}`;
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion,
    recordVideo: { dir: path.join(artifacts, 'homepage-arrival-video'), size: mobile ? { width: 390, height: 844 } : { width: 1280, height: 890 } } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  const versions = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (/assets\/(css\/home-hero\.css|js\/home-hero\.js)/.test(response.url())) {
      versions.push({ url: response.url(), status: response.status() });
    }
  });
  try {
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), reducedMotion === 'reduce', 'Exercise the actual browser motion preference from the first visit');
    assert.equal(await page.locator('html').getAttribute('data-home-motion'), 'on', 'The explicit homepage motion choice is available before hydration');
    assert(await page.locator('#heroTitle').isVisible(), 'The first headline never waits for JavaScript');
    assert.equal(await page.locator('.ios-hero-location, [data-hero-replay]').count(), 0, 'Removed hero caption and motion control are absent');
    // Exercise the real first-visit consent flow rather than seeding sessionStorage.
    const privacy = page.locator('#cityPrivacyDialog');
    await privacy.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('.ios-hero')?.dataset.heroObscured === 'true');
    await page.locator('#cityPrivacyGuest').click();
    await privacy.waitFor({ state: 'hidden' });
    const first = await visibleArrival(page, `homepage-arrival-${label}-first`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'The first visit has no horizontal overflow');
    await page.locator('.ios-hero-cta').click();
    await page.waitForFunction(() => location.hash === '#properties');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'smooth');
    await page.evaluate(() => {
      history.replaceState(history.state, '', location.pathname);
      scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const reload = await visibleArrival(page, `homepage-arrival-${label}-cached`);
    assert(await privacy.isHidden(), 'A normal cached reload retains the visitor’s dismissal');
    assert(versions.length >= 4 && versions.every(item => [200, 304].includes(item.status) && /\?v=/.test(item.url)),
      `Fresh and cached visits use versioned current assets: ${JSON.stringify(versions)}`);
    assert.equal(new Set(versions.filter(item => item.url.includes('/css/')).map(item => item.url)).size, 1, 'Reload serves the same current CSS version');
    await page.emulateMedia({ reducedMotion: reducedMotion === 'reduce' ? 'no-preference' : 'reduce' });
    await page.waitForFunction(() => document.querySelector('.ios-hero')?.dataset.motionChoice === 'on');
    assert.match(await page.locator('.ios-hero-photo-reveal').evaluate(node => getComputedStyle(node).animationName), /locus-hero-photo-arrival/);
    assert.equal(await page.locator('.ios-hero-location, [data-hero-replay]').count(), 0);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'smooth');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Cached visits and preference changes have no horizontal overflow');
    assert(await page.locator('#heroTitle').isVisible());
    assert.deepEqual(errors, [], 'No hydration or browser errors');
    reports.push(`${label}: real first visit and cached arrival visible (${first.duration}ms; progress ${first.progress.toFixed(2)} / ${reload.progress.toFixed(2)}), removed caption/control, smooth hero links and homepage motion retained after preference changes.`);
    fs.writeFileSync(path.join(artifacts, `homepage-arrival-${label}-evidence.json`), JSON.stringify({ reducedMotion, first, reload, versions }, null, 2));
  } finally {
    const video = page.video();
    await context.close();
    if (video) await video.saveAs(path.join(artifacts, `homepage-arrival-${label}.webm`));
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    for (const reducedMotion of ['reduce', 'no-preference']) {
      for (const mobile of [false, true]) await check(browser, mobile, reducedMotion);
      const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion });
      const page = await context.newPage();
      try {
        await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
        assert(await page.locator('#heroTitle').isVisible());
        assert(await page.locator('.ios-hero-cta').isVisible());
        assert.equal(await page.locator('.ios-hero-location, [data-hero-replay]').count(), 0);
        assert.match(await page.locator('.ios-hero-photo-reveal').evaluate(node => getComputedStyle(node).animationName), /locus-hero-photo-arrival/);
        reports.push(`No JavaScript, ${reducedMotion}: server-rendered headline/actions stay visible and CSS photo arrival runs.`);
      } finally { await context.close(); }
    }
    const reducedContext = await browser.newContext({ reducedMotion: 'reduce' });
    const login = await reducedContext.newPage();
    try {
      await login.goto(`${base}/investor-login.php`, { waitUntil: 'domcontentloaded' });
      assert.equal(await login.locator('html').getAttribute('data-home-motion'), null, 'The homepage choice does not affect account pages');
      assert.equal(await login.locator('.auth-flight-ring-one').evaluate(node => getComputedStyle(node).animationName), 'none', 'Account animations still honor reduced motion');
      assert.equal(await login.locator('[data-account-form] [type="submit"]').first().evaluate(node => getComputedStyle(node).transitionDuration), '0s');
      reports.push('Account page: reduced-motion animations and transitions remain immediate. No sign-in requests were sent.');
    } finally { await reducedContext.close(); }
  } finally { await browser.close(); }
  console.log(reports.join('\n'));
})().catch(error => { console.error(reports.join('\n')); console.error(error); process.exitCode = 1; });
