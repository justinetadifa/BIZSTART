/* Real homepage interactions, without authentication or database writes.
   Set PLAYWRIGHT_MODULE when Playwright is installed outside the repository. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LOCUS_TEST_URL || 'http://localhost/sfcelerate-bizstart';
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const artifacts = path.resolve(__dirname, '../.ui-audit');
fs.mkdirSync(artifacts, { recursive: true });
const reports = [];

async function noOverflow(page, where) {
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert(dimensions.document <= dimensions.viewport + 1, `${where}: horizontal overflow ${JSON.stringify(dimensions)}`);
}

async function atSection(page, id) {
  await page.locator(`#${id}`).evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForFunction(value => document.querySelector('.home-journey-steps [aria-current]')?.hash === `#${value}`, id);
  await page.locator('.home-journey').waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
}

async function anchor(page, selector, target) {
  const before = await page.evaluate(() => scrollY);
  await page.evaluate(() => {
    window.__homeAnchorSamples = [];
    const until = performance.now() + 1400;
    function sample() {
      window.__homeAnchorSamples.push(scrollY);
      if (performance.now() < until) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.locator(selector).click();
  await page.waitForFunction(id => location.hash === `#${id}`, target);
  // Sample actual browser motion instead of treating the CSS declaration as proof.
  await page.waitForFunction(id => Math.abs(document.getElementById(id).getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)) <= 6, target);
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => scrollY);
  const samples = await page.evaluate(() => window.__homeAnchorSamples);
  assert(Math.abs(after - before) > 100, `The ${target} anchor changes the actual viewport`);
  assert(samples.some(position => Math.abs(position - before) > 3 && Math.abs(position - after) > 3), `The ${target} anchor visibly travels through intermediate positions: ${JSON.stringify({before,after,samples})}`);
  await noOverflow(page, `${target} anchor`);
}

async function focusVisible(page, locator) {
  await locator.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  const focus = await locator.evaluate(node => {
    const style = getComputedStyle(node);
    return { visible: node.matches(':focus-visible'), width: parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  assert(focus.visible && focus.width >= 2 && focus.style !== 'none', `A keyboard focus ring is visible: ${JSON.stringify(focus)}`);
}

async function hoverCard(page, selector, name) {
  const card = page.locator(selector).first();
  await card.scrollIntoViewIfNeeded();
  await page.mouse.move(4, 150);
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(650);
  const baseline = await card.boundingBox();
  await page.mouse.move(baseline.x + baseline.width * .3, baseline.y + Math.min(75, baseline.height * .3));
  await page.waitForTimeout(350);
  assert(await card.evaluate(node => node.classList.contains('is-home-hover')), `${name} receives fine-pointer feedback`);
  const lit = await card.boundingBox();
  assert(Math.abs(lit.y - baseline.y + 4) <= .65, `${name} lift remains 4px, without stacking: ${lit.y - baseline.y}px`);
  const firstLight = await card.evaluate(node => [node.style.getPropertyValue('--home-glow-x'), node.style.getPropertyValue('--home-glow-y')]);
  await page.mouse.move(lit.x + lit.width * .7, lit.y + Math.min(105, lit.height * .5));
  await page.waitForTimeout(50);
  const secondLight = await card.evaluate(node => [node.style.getPropertyValue('--home-glow-x'), node.style.getPropertyValue('--home-glow-y')]);
  assert(firstLight.every(Boolean) && secondLight.every(Boolean) && firstLight[0] !== secondLight[0], `${name} light follows the pointer`);
  const glow = await card.locator('.home-card-glow').evaluate(node => ({ opacity: Number(getComputedStyle(node).opacity), pointer: getComputedStyle(node).pointerEvents }));
  assert(glow.opacity > 0 && glow.pointer === 'none', `${name} light is visible and cannot intercept input`);
  await page.mouse.move(4, 150);
  await page.waitForTimeout(350);
  assert.equal(await card.evaluate(node => node.classList.contains('is-home-hover')), false, `${name} resets after pointer leave`);
  assert(Math.abs((await card.boundingBox()).y - baseline.y) <= .65, `${name} returns to its baseline`);
}

async function run(browser, width, reducedMotion) {
  const mobile = width < 600;
  const label = `${width}-${reducedMotion}`;
  const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion });
  // Consent itself is exercised by homepage-arrival.browser.cjs. This suite
  // isolates card and wayfinding input after the visitor has dismissed it.
  await context.addInitScript(() => {
    sessionStorage.setItem('locus.privacy-preview', '1');
    window.__cancelledHomeScroll = [];
    for (const type of ['wheel', 'touchmove', 'keydown']) {
      addEventListener(type, event => setTimeout(() => {
        if (event.defaultPrevented && (type !== 'keydown' || ['PageDown', 'ArrowDown'].includes(event.key))) window.__cancelledHomeScroll.push(type);
      }), { passive: true });
    }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`${base}/index.php`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.homeExperience === 'ready');
    assert(await page.locator('#heroTitle').isVisible(), 'Hero is immediately visible');
    assert.equal(await page.locator('.ios-hero-location, [data-hero-replay]').count(), 0, 'Removed caption and control stay removed');
    assert.equal(await page.locator('html').getAttribute('data-home-motion'), 'on');
    assert(await page.locator('.home-journey').isHidden());
    await noOverflow(page, `${label} hero`);

    await atSection(page, 'at-a-glance');
    for (const selector of ['.home-journey-prev', '.home-journey-next']) {
      const box = await page.locator(selector).boundingBox();
      assert(box.width >= 44 && box.height >= 44, `${selector} has at least a 44px target at ${width}px`);
    }
    const nav = await page.locator('.home-journey').boundingBox();
    assert(nav.x >= 8 && nav.x + nav.width <= width - 8, `Navigator remains fully inside ${width}px viewport`);
    const help = page.locator('.locus-floating-help-btn');
    if (await help.isVisible()) {
      await page.waitForTimeout(350);
      const bubble = await help.boundingBox();
      assert(bubble.x + bubble.width <= nav.x || bubble.x >= nav.x + nav.width || bubble.y + bubble.height <= nav.y || bubble.y >= nav.y + nav.height, 'Floating help and journey controls do not overlap');
    }
    assert.match(await page.locator('.home-journey-current').innerText(), /The city/);
    await focusVisible(page, page.locator('.home-journey-prev'));
    await page.evaluate(() => document.activeElement.blur());
    await anchor(page, '.home-journey-next', 'incentive-recipients');
    assert.match(await page.locator('.home-journey-prev').getAttribute('aria-label'), /Previous: The city/);
    await anchor(page, '.home-journey-prev', 'at-a-glance');
    await help.click();
    await page.locator('#locusHelpDialog').waitFor({ state: 'visible' });
    await page.locator('.home-journey').waitFor({ state: 'hidden' });
    await page.locator('#locusHelpCloseBtn').click();
    await page.locator('#locusHelpDialog').waitFor({ state: 'hidden' });
    await page.locator('.home-journey').waitFor({ state: 'visible' });
    assert.equal(await help.evaluate(node => document.activeElement === node), true, 'Closing Help restores its trigger focus');
    if (mobile) {
      await page.locator('#cityMenuButton').click();
      await page.waitForFunction(() => document.body.classList.contains('city-mobile-nav-open'));
      await page.locator('.home-journey').waitFor({ state: 'hidden' });
      await page.locator('#cityMenuButton').click();
      await page.waitForFunction(() => !document.body.classList.contains('city-mobile-nav-open'));
      await page.locator('.home-journey').waitFor({ state: 'visible' });
    }
    const progressBefore = await page.locator('.home-journey-current').evaluate(node => Number(node.style.getPropertyValue('--home-section-progress')));
    const scrollBefore = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 140);
    await page.waitForFunction(y => scrollY > y + 40, scrollBefore);
    const progressAfter = await page.locator('.home-journey-current').evaluate(node => Number(node.style.getPropertyValue('--home-section-progress')));
    assert(progressAfter > progressBefore, 'Section progress tracks native wheel scrolling');
    await page.evaluate(() => document.activeElement?.blur());
    const keyBefore = await page.evaluate(() => scrollY);
    await page.keyboard.press('PageDown');
    await page.waitForFunction(y => scrollY > y + 80, keyBefore);

    await atSection(page, 'why-invest');
    const whyButton = page.locator('.city-why-card [data-why-toggle]').first();
    await whyButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(650);
    await whyButton.click();
    assert.equal(await whyButton.getAttribute('aria-expanded'), 'true', 'Spotlight leaves disclosure controls clickable');
    await whyButton.click();
    assert.equal(await whyButton.getAttribute('aria-expanded'), 'false');
    await focusVisible(page, whyButton);
    await page.evaluate(() => document.activeElement.blur());

    await page.locator('#properties [data-home-card]').first().waitFor();
    const decorations = await page.locator('[data-home-card]').evaluateAll(nodes => nodes.map(node => ({ count: node.querySelectorAll(':scope > .home-card-glow').length, hidden: node.querySelector(':scope > .home-card-glow')?.getAttribute('aria-hidden') })));
    assert(decorations.length >= 10 && decorations.every(item => item.count === 1 && item.hidden === 'true'), 'Server and asynchronous property cards have one decorative, accessible light layer');

    if (!mobile) {
      await hoverCard(page, '.city-why-card', 'Why invest');
      await hoverCard(page, '#properties [data-home-card]', 'Property');
      await hoverCard(page, '.city-concierge-card', 'Concierge');
      await page.locator('.city-why-card').first().scrollIntoViewIfNeeded();
      await page.locator('.city-why-card').first().hover();
      await page.waitForTimeout(50);
      await page.mouse.wheel(0, 40);
      await page.waitForTimeout(100);
      assert.equal(await page.locator('.is-home-hover').count(), 0, 'Native scrolling clears a stale pointer light');
    } else {
      await whyButton.scrollIntoViewIfNeeded();
      const box = await whyButton.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(300);
      assert.equal(await page.locator('.is-home-hover').count(), 0, 'Touch devices do not acquire desktop pointer hover');
      const beforeTouch = await page.evaluate(() => scrollY);
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width / 2, y: 650, id: 0 }] });
      for (let step = 1; step <= 8; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width / 2, y: 650 - step * 35, id: 0 }] });
        await page.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForFunction(y => scrollY > y + 80, beforeTouch);
      await cdp.detach();
    }
    await noOverflow(page, `${label} interactions`);
    assert.deepEqual(await page.evaluate(() => window.__cancelledHomeScroll), [], 'Wheel, touch and scrolling keys keep their native events');
    assert.deepEqual(errors, [], 'No browser script errors');
    await atSection(page, 'why-invest');
    await page.locator('.home-journey-next').focus();
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(100);
    assert(await page.locator('.home-journey').isVisible(), 'A focused navigator remains usable at the footer');
    await page.evaluate(() => document.activeElement.blur());
    await page.locator('.home-journey').waitFor({ state: 'hidden' });
    await atSection(page, 'why-invest');
    await page.screenshot({ path: path.join(artifacts, `homepage-refinements-${label}.png`) });
    reports.push({ width, reducedMotion, cards: decorations.length, checks: 'native smooth anchors; previous/next and progress; visible keyboard focus; working disclosures; bounded pointer light or native touch; help/menu visibility and footer focus; no overlap/overflow/errors' });
  } finally { await context.close(); }
}

(async () => {
  // This Windows host disables native smooth scrolling globally. Enable the
  // browser capability to verify native anchor interpolation, without replacing
  // scroll handlers or changing the page's reduced-motion preference.
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--enable-smooth-scrolling'] });
  try {
    for (const width of [1440, 390, 320]) {
      for (const reducedMotion of ['no-preference', 'reduce']) await run(browser, width, reducedMotion);
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(artifacts, 'homepage-refinements.json'), JSON.stringify(reports, null, 2));
  console.log(JSON.stringify(reports, null, 2));
})().catch(error => { console.error(JSON.stringify(reports, null, 2)); console.error(error); process.exitCode = 1; });
