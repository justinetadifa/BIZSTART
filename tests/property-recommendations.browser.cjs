// Read-only browser audit against local supported and pending property assessments.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LOCUS_TEST_URL || 'http://localhost/sfcelerate-bizstart';
const artifacts = path.resolve(__dirname, '../.ui-audit');
fs.mkdirSync(artifacts, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => sessionStorage.setItem('locus.privacy-preview', '1'));
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const propertyResponse = page.waitForResponse(response => response.url().includes('/api/property.php?id='));
    await page.goto(`${base}/property-details.php?id=${process.env.LOCUS_SUPPORTED_PROPERTY || 125}`, { waitUntil: 'domcontentloaded' });
    const { property } = await (await propertyResponse).json();
    const expected = property.businessOpportunities.supportedMatches.map(match => ({ id: match.id, label: match.label }));
    assert(expected.length > 0, 'The supported fixture needs at least one assessed recommendation');
    const media = page.locator('.property-media-intel-bar');
    await media.waitFor({ state: 'visible' });
    const mediaPills = media.locator('[data-recommendation-id]');
    const scenarioPills = page.locator('#propertyScenarioSection [data-recommendation-id]');
    const records = locator => locator.evaluateAll(nodes => nodes.map(node => ({ id: node.dataset.recommendationId, label: node.textContent.trim() })));
    assert.deepEqual(await records(mediaPills), expected, 'Photo recommendations match the actual assessment');
    assert.deepEqual(await records(scenarioPills), expected, 'Simulation recommendations match the actual assessment');

    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await media.scrollIntoViewIfNeeded();
      const dimensions = await media.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth,
        right: node.getBoundingClientRect().right, viewport: innerWidth }));
      assert(dimensions.scroll <= dimensions.client + 1 && dimensions.right <= width + 1,
        `${width}px: recommendations fit their panel: ${JSON.stringify(dimensions)}`);
      if (width <= 768) {
        const gridWidth = await page.locator('.property-intel-grid').evaluate(node => node.clientWidth);
        const recommendationsWidth = await page.locator('.property-intel-recommendations').evaluate(node => node.clientWidth);
        assert(Math.abs(gridWidth - recommendationsWidth) <= 1, `${width}px: mobile recommendations use the full panel width`);
      }
      await media.screenshot({ path: path.join(artifacts, `property-recommendations-${width}.png`) });
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    const selectedActivity = await mediaPills.first().getAttribute('data-scenario-quick-pick');
    const selectedCapital = await mediaPills.first().getAttribute('data-quick-capital');
    const assessmentResponse = page.waitForResponse(response => response.url().includes('/api/property-assessment.php?'));
    await mediaPills.first().click();
    assert((await assessmentResponse).ok(), 'Selecting a photo recommendation requests its server assessment');
    assert.equal(await page.locator('#investorProposedActivitySelect').inputValue(), selectedActivity);
    assert.equal((await page.locator('#investorProposedCapitalInput').inputValue()).replace(/\D/g, ''), selectedCapital);
    assert.equal(await page.locator('html').getAttribute('data-investor-view'), 'advanced');
    assert(await page.locator('#investorProposedActivitySelect').isVisible());
    assert(await mediaPills.first().getAttribute('aria-pressed') === 'true');
    assert(await scenarioPills.first().getAttribute('aria-pressed') === 'true');

    await page.locator('#investorProposedCapitalInput').fill('3,210,000');
    await scenarioPills.last().click();
    assert.equal(await page.locator('#investorProposedCapitalInput').inputValue(), '3,210,000', 'A selected business preserves user-entered capital');
    assert.equal(await mediaPills.last().getAttribute('aria-pressed'), 'true', 'Simulation selection updates the photo pills');
    await page.locator('[data-scenario-reset]').click();
    assert.equal(await page.locator('[data-scenario-quick-pick][aria-pressed="true"]').count(), 0, 'Reset clears both surfaces');

    await page.evaluate(() => {
      document.querySelector('.site-scenario-disclosure').open = false;
      window.SFCInvestorView.set('basic');
    });
    await page.locator('#propertyQuickMoreBizBtn').click();
    const basis = page.locator('#propertyRecommendationBasis');
    assert(await basis.isVisible());
    assert.equal(await basis.getAttribute('open'), '');
    assert.equal(await page.locator('#propertyRecommendationBasis > summary').evaluate(node => node === document.activeElement), true);
    assert((await basis.innerText()).includes(property.businessOpportunities.supportedMatches[0].supportingPlaces[0].name), 'View basis exposes the actual named supporting place');

    await page.goto(`${base}/property-details.php?id=${process.env.LOCUS_PENDING_PROPERTY || 126}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.property-media-intel-bar').waitFor();
    assert.equal(await page.locator('[data-recommendation-id]').count(), 0, 'A pending assessment never invents quick-picks');
    assert(await page.locator('.property-media-intel-bar').innerText().then(text => text.includes('Assessment pending')));
    await page.locator('#propertyQuickMoreBizBtn').click();
    assert((await page.locator('#propertyRecommendationBasis').innerText()).includes('Recommendations unavailable'));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.property-media-intel-bar').screenshot({ path: path.join(artifacts, 'property-recommendations-pending.png') });
    assert.deepEqual(errors, [], 'Property interactions produce no uncaught browser errors');
    console.log('Live assessment parity, desktop/mobile layouts, simulation selection, reset and basis navigation passed.');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
