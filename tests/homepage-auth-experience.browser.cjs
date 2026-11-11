/* Local browser checks. Real sign-ins use demo accounts; no listings are written.
   PLAYWRIGHT_MODULE may point at an externally installed Playwright package. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LOCUS_TEST_URL || 'http://localhost/sfcelerate-bizstart';
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const artifacts = path.resolve(__dirname, '../.ui-audit');
fs.mkdirSync(artifacts, { recursive: true });
const reports = [];

async function homepage(page, mobile) {
  await page.goto(`${base}/index.php`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.documentElement.dataset.homeExperience === 'ready');
  assert(await page.locator('#heroTitle').isVisible());
  assert.equal(await page.locator('.ios-hero-location, [data-hero-replay]').count(), 0);
  assert(await page.locator('.home-journey').isHidden());
  await page.mouse.wheel(0, 360);
  await page.waitForFunction(() => parseFloat(document.getElementById('locus-react-hero').style.getPropertyValue('--home-hero-depth')) > 0);
  await page.locator('#at-a-glance').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.locator('.home-journey').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('.home-journey-current')?.textContent.includes('The city'));
  assert.match(await page.locator('.home-journey-current').innerText(), /The city/);
  assert.equal(await page.locator('.home-journey-steps [aria-current]').getAttribute('aria-label'), 'The city');
  assert(await page.locator('.home-reading-progress').evaluate(node => Number(node.style.getPropertyValue('--home-reading-progress')) > 0));
  await page.screenshot({ path: path.join(artifacts, `homepage-journey-${mobile ? 'mobile' : 'desktop'}.png`) });
  await page.locator('.home-journey-next').click();
  await page.waitForFunction(() => location.hash === '#incentive-recipients');
  await page.waitForFunction(() => document.getElementById('incentive-recipients').getBoundingClientRect().top < 150);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
  await page.waitForFunction(() => document.querySelector('.ios-hero')?.dataset.motionChoice === 'on');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'smooth');
  assert(await page.locator('.glance-city-photo').evaluate(node => parseFloat(getComputedStyle(node).scale) > 1), 'The explicit homepage choice retains city photo depth');
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.wheel(0, 240);
  await page.waitForFunction(() => parseFloat(document.getElementById('locus-react-hero').style.getPropertyValue('--home-hero-depth')) > 0);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  reports.push(`${mobile ? 'Mobile' : 'Desktop'} homepage: immediate hero, image depth, section navigation/progress, smooth anchors and explicit homepage motion retained under the reduced-motion preference.`);
}

async function login(page, mobile) {
  await page.goto(`${base}/investor-login.php`, { waitUntil: 'domcontentloaded' });
  const form = page.locator('[data-account-form]').first();
  const submit = form.locator('[type="submit"]');
  await submit.click();
  assert(await page.locator('[data-auth-flight]').isHidden(), 'Client validation does not start the gateway');
  assert(await form.locator('[aria-invalid="true"]').count() >= 2);
  await form.locator('#login-email').fill('investor@sfcelerate.local');
  await form.locator('#login-password').fill(mobile ? 'Investor123!' : 'WrongPassword!');
  let posts = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().endsWith('/investor-login.php')) posts++;
  });
  async function pending() {
    // Hold only the native navigation after the real application submit handler.
    // This lets Playwright inspect its outgoing UI before Chromium replaces the
    // execution context. Release sends the untouched form to the real server.
    await form.evaluate(node => {
      window.__heldAuthCount = 0;
      node.addEventListener('submit', event => {
        if (event.defaultPrevented) return;
        event.preventDefault();
        window.__heldAuthCount++;
      });
    });
    await submit.click({ noWaitAfter: true });
    await page.locator('[data-auth-flight]').waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-auth-flight-label]').innerText(), 'Signing in…');
    assert.equal(await form.getAttribute('aria-busy'), 'true');
    assert(await submit.isDisabled());
    await form.evaluate(node => node.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.waitForTimeout(170);
    assert.equal(await page.evaluate(() => window.__heldAuthCount), 1, 'Duplicate submit events cannot trigger another navigation');
    await page.screenshot({ path: path.join(artifacts, `login-gateway-${mobile ? 'mobile' : 'desktop'}.png`) });
    await form.evaluate(node => { setTimeout(() => HTMLFormElement.prototype.submit.call(node), 0); });
  }
  if (!mobile) {
    const response = page.waitForResponse(result => result.url().endsWith('/investor-login.php') && result.request().method() === 'POST');
    await pending();
    await response;
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#login-password-error').waitFor({ state: 'visible' });
    assert(await page.locator('[data-auth-flight]').isHidden());
    assert.equal(await page.locator('#login-email').inputValue(), 'investor@sfcelerate.local');
    assert.equal(await page.locator('[data-auth-arrival]').count(), 0, 'Rejected credentials never show successful arrival');
    await page.locator('#login-password').fill('Investor123!');
    posts = 0;
  }
  const navigation = page.waitForURL(/account-welcome\.php/);
  await pending();
  await navigation;
  await page.locator('[data-auth-arrival]').waitFor();
  assert.match(await page.locator('.auth-arrival-status').innerText(), /Signed in/);
  assert.match(await page.locator('#welcomeTitle').innerText(), /Welcome/);
  assert(await page.locator('.auth-arrival-content .account-submit').isVisible(), 'Continue is available during the animation');
  await page.screenshot({ path: path.join(artifacts, `login-arrival-${mobile ? 'mobile' : 'desktop'}.png`) });
  const skip = page.locator('[data-arrival-skip]');
  if (await skip.isVisible()) await skip.click();
  await page.waitForFunction(() => document.querySelector('[data-auth-arrival]')?.dataset.arrivalSettled === 'true');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.auth-arrival-art').evaluate(node => getComputedStyle(node).animationName), 'none');
  await page.locator('.auth-arrival-content .account-submit').click();
  await page.waitForURL(/investor-dashboard\.php/);
  assert.equal(posts, 1, 'The accepted sign-in sends one request');
  reports.push(`${mobile ? 'Mobile' : 'Desktop'} login: pending presentation, duplicate guard, real ${mobile ? '' : 'server error/email retention and '}successful sign-in, personal arrival/skip/continue, no overflow and reduced motion.`);
}

async function roleAccess(browser, role) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    const route = `${base}/${role}-login.php`;
    const credentials = role === 'admin' ? ['admin@sfcelerate.local', 'Admin123!'] : ['seller@sfcelerate.local', 'Seller123!'];
    await page.goto(route);
    await page.locator('#login-email').fill(credentials[0]);
    await page.locator('#login-password').fill(credentials[1]);
    const form = page.locator('[data-account-form]').first();
    await form.evaluate(node => node.addEventListener('submit', event => { if (!event.defaultPrevented) event.preventDefault(); }));
    await form.locator('[type="submit"]').click();
    const flight = page.locator('[data-auth-flight]');
    assert(await flight.isVisible());
    assert.equal(await flight.evaluate(node => getComputedStyle(node).animationName), 'none');
    assert.equal(await flight.locator('.auth-flight-ring-one').evaluate(node => getComputedStyle(node).animationName), 'none');
    assert.equal(await page.evaluate(() => document.querySelector('main').inert), true);
    await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    assert(await flight.isHidden());
    assert.equal(await page.evaluate(() => document.querySelector('main').inert), false);
    assert(!(await form.locator('[type="submit"]').isDisabled()));
    await page.goto(route);
    await page.locator('#login-email').fill(credentials[0]);
    await page.locator('#login-password').fill(credentials[1]);
    await Promise.all([
      page.waitForURL(role === 'admin' ? /admin-dashboard\.php/ : /account-welcome\.php/),
      page.locator('[data-account-form] [type="submit"]').first().click(),
    ]);
    assert.equal(await page.evaluate(() => window.SFC_APP_CONFIG.user.role), role);
    if (role === 'seller') {
      await page.waitForFunction(() => document.querySelector('[data-auth-arrival]')?.dataset.arrivalSettled === 'true');
      assert.match(await page.locator('.account-welcome-copy').innerText(), /workspace|PRC|review|application|verification/i);
      await page.screenshot({ path: path.join(artifacts, 'login-broker-reduced-mobile.png'), fullPage: true });
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    reports.push(`${role}: real mobile sign-in, correct destination/account state, reduced pending feedback and restored controls after simulated BFCache.`);
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    for (const mobile of process.argv.includes('--roles-only') ? [] : [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'no-preference' });
      await context.addInitScript(() => { sessionStorage.setItem('locus.privacy-preview', '1'); });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await homepage(page, mobile);
        if (!process.argv.includes('--homepage-only')) await login(page, mobile);
        assert.deepEqual(errors, [], 'No browser script errors');
      } finally { await context.close(); }
    }
    if (process.argv.includes('--roles') || process.argv.includes('--roles-only')) {
      await roleAccess(browser, 'seller');
      await roleAccess(browser, 'admin');
    }
  } finally { await browser.close(); }
  console.log(reports.join('\n'));
})().catch(error => { console.error(reports.join('\n')); console.error(error); process.exitCode = 1; });
