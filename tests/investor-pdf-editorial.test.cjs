const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');

(async () => {
  const source = readFileSync('assets/js/property-details-view.js', 'utf8')
    .replace('./utils.js', pathToFileURL(resolve('assets/js/utils.js')).href)
    .replace('./business-opportunities.js', pathToFileURL(resolve('assets/js/business-opportunities.js')).href);
  const { investorBriefReportMarkup: brief, assessmentCalculation } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const fixture = JSON.parse(execFileSync(process.env.PHP_BINARY || 'C:/xampp/php/php.exe', ['tests/locus-v3-pipeline.test.php', '--json'], { encoding: 'utf8', windowsHide: true }));
  const base = { id: 127, name: 'Sevilla development lot', area: .27, price: 40000000,
    parcel: { surveyAreaSqm: 2699, areaMethod: 'declared' }, lat: 16.601144, lng: 120.320479,
    assessmentComplete: false, iaiScore: 40, assessmentCriteria: { spatial_accessibility: 100, infrastructure_readiness: 100 } };
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };
  const partial = brief(base);
  check(partial.includes('data-brief-iai-score>Pending') && !partial.includes('40.0 / 100'), 'Two rated criteria must never produce a composite 40/100.');
  check(partial.includes('2,699 m²') && partial.includes('0.2699 ha') && partial.includes('PHP 14,820.3'), 'Exact parcel square metres drive the sale unit price, despite rounded legacy hectares.');
  check(!partial.includes('Verified Listing') && !partial.includes('Commercial Zone 1'), 'No invented approval or zoning.');
  check(!partial.includes('5.4 km') && !partial.includes('alluvial terrace') && partial.includes('6 indicators remain unassessed'), 'Missing hazard evidence produces no invented exposure finding.');
  check(partial.includes('t=k') && partial.includes('16.601144,120.320479'), 'Map link uses actual coordinates and satellite display.');
  check(!brief({ ...base, lat: null }).includes('brief-map-link'), 'No misleading map link for an unknown location.');
  const yearly = brief({ ...base, listingPurpose: 'lease', leasePrice: 125, leasePriceUnit: 'sqm', leasePeriod: 'year', offeredAreaSqm: 120 });
  check(yearly.includes('PHP 15,000') && yearly.includes('Per year · 120 m² offered area'), 'Rent uses offered area and preserves the annual billing period.');
  check(!yearly.includes('PHP 40,000,000') && !yearly.includes('/ mo'), 'A lease-only brief must not leak a stale sale price or assume monthly rent.');
  const unknownArea = brief({ ...base, listingPurpose: 'lease', category: 'Land', leasePrice: 125, leasePriceUnit: 'sqm', offeredSpaceScope: 'portion_of_land' });
  check(unknownArea.includes('Not Available') && !unknownArea.includes('PHP 337,375'), 'A parcel area cannot be silently substituted for an unmeasured offered portion.');
  const both = brief({ ...base, listingPurpose: 'sale_or_lease', leasePrice: 25000, leasePeriod: 'month', leasePriceUnit: 'total' });
  check(both.includes('For sale or lease') && both.includes('PHP 25,000 / month') && both.includes('PHP 40,000,000'), 'Both sale and lease quotes retain their distinct financial basis.');
  const unpriced = brief({ ...base, salePrice: null });
  check(unpriced.includes('Price on request') && !unpriced.includes('PHP 40,000,000') && !unpriced.includes('PHP 0'), 'Explicit inquiry pricing never falls back to an old asking amount.');
  const near = brief({ ...base, nearbyBusinesses: [{ name: 'Unmeasured', distanceMeters: null }, { name: 'Far place', distanceMeters: 800 }, { name: 'Nearest', distanceMeters: 0 }] });
  check(near.includes('Nearest') && !near.includes('Unmeasured') && !near.includes('Far place'), 'Unknown distances cannot masquerade as zero-distance neighbours.');
  const hostile = brief({ ...base, name: '<script>alert(1)</script>', description: 'A & B <test>', imageUrl: 'image.jpg" onload="alert(1)' });
  check(hostile.includes('&lt;script&gt;') && hostile.includes('A &amp; B &lt;test&gt;') && !hostile.includes('src="image.jpg" onload='), 'Listing strings are escaped in PDF markup and attributes.');
  const photo = brief({ ...base, imageUrl: 'assets/images/Property10.png' });
  check(photo.includes('class="brief-hero has-photo"') && photo.includes('photo-unavailable'), 'Loaded and broken image states have explicit, mutually exclusive layouts.');
  const complete = brief(fixture.complete);
  check(complete.includes('IAI: 94.8 / 100') && complete.includes('= 94.8 / 100'), 'Complete report and calculation agree with the shared protocol.');
  for (const key of ['held', 'incomplete', 'historical', 'discrepancy']) {
    check(brief(fixture[key]).includes('data-brief-released-iai>Pending review'), `${key}: official release stays pending.`);
  }
  const changed = structuredClone(fixture.complete); changed.criteriaBreakdown[0].weighted_score = 99;
  check(assessmentCalculation(changed).iai === null && brief(changed).includes('data-brief-iai-score>Pending'), 'Conflicting contributions prevent a numeric headline.');
  const appendix = brief(fixture.complete, { includeAppendix: true });
  check(appendix.includes('locusBriefPage5') && appendix.includes('SHA-256:') && appendix.includes(fixture.complete.comparison_key), 'Optional evidence appendix retains source hashes and comparison cohort.');
  const css = readFileSync('assets/css/property-details.css', 'utf8');
  check(css.includes('counter(pages)') && css.includes('overflow: visible !important'), 'Pagination follows actual page count and never clips long evidence.');
  console.log(`Investor PDF editorial: ${checks} pricing, evidence, content and pagination checks passed.`);
})().catch(error => { console.error(String(error.stack || error).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '[view module]')); process.exit(1); });
