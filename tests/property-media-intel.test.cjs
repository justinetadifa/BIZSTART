const assert = require('node:assert/strict');

(async () => {
  const {
    propertyMediaDockMarkup, investorScenarioMarkup,
    derivePropertyBusinessRecommendations, derivePropertyBusinessRecommendation,
  } = await import('../assets/js/property-details-view.js');

  const matches = [
    { id: 'convenience_store', label: 'Convenience Retail Store', zoningOutcome: 'permitted',
      zoningOutcomeLabel: 'Permitted by Right', areaStatus: '373 sqm recorded',
      supportingPlaces: [{ name: 'Biday Health Center', distanceMeters: 120 }],
      missingEvidence: ['Utility connections unconfirmed'], ruleSource: 'Recorded screening rules' },
    { id: 'grocery', label: 'Neighborhood Grocery & Mart', zoningOutcome: 'conditional',
      zoningOutcomeLabel: 'Conditional Use', supportingPlaces: [{ name: 'Community Market', distanceMeters: 250 }] },
    { id: 'cafe', label: 'Café & Beverage Specialty', zoningOutcome: 'unverified',
      zoningOutcomeLabel: 'Unverified Zoning Clearance', supportingPlaces: [{ name: 'Biday School', distanceMeters: 300 }] },
  ];
  const property = { id: 126, name: 'Biday Land', barangay: 'Biday', lat: 16.63, lng: 120.32,
    zoningClassification: 'C-1', proposedActivity: 'gym',
    businessOpportunities: { status: 'supported', supportedMatches: matches } };
  const media = p => propertyMediaDockMarkup(p, () => '/site.jpg', p => p);
  const picks = html => [...html.matchAll(/data-recommendation-id="([^"]+)" data-scenario-quick-pick="([^"]+)"/g)]
    .map(([, id, activity]) => [id, activity]);

  const expected = [['convenience_store', 'retail_convenience'], ['grocery', 'retail_supermarket'], ['cafe', 'food_cafe']];
  assert.deepEqual(picks(media(property)), expected);
  assert.deepEqual(picks(investorScenarioMarkup(property)), expected, 'Both sections preserve assessment order and activity codes');
  assert.deepEqual(derivePropertyBusinessRecommendations(property).map(m => m.label), matches.map(m => m.label));
  assert.equal(derivePropertyBusinessRecommendation(property).id, 'convenience_store', 'A proposed gym never overrides supported results');
  for (const match of matches) {
    const escapedLabel = match.label.replaceAll('&', '&amp;');
    assert(media(property).includes(`<span>${escapedLabel}</span>`));
    assert(investorScenarioMarkup(property).includes(`<span>${escapedLabel}</span>`), 'Labels stay identical across sections');
  }
  assert(media(property).includes('Biday Health Center (120 m)'));
  assert(media(property).includes('373 sqm recorded'));
  assert(media(property).includes('Permitted by Right'));
  assert(investorScenarioMarkup(property).includes('Utility connections unconfirmed'));
  assert(investorScenarioMarkup(property).includes('Conditional Use'));
  assert(investorScenarioMarkup(property).includes('Unverified Zoning Clearance'));
  assert(investorScenarioMarkup(property).includes('Recorded screening rules'));
  assert(!media(property).includes('>GYM<'));

  // An explicit empty server result stays empty even when a client fallback could find candidates.
  const pending = { ...property, zoningClassification: 'Commercial',
    nearbyBusinesses: [{ name: 'Nearby Office', lat: 16.6301, lng: 120.32, categoryKey: 'office' }],
    businessOpportunities: { status: 'no_candidates', supportedMatches: [], unavailableReason: 'No supported business activity at this site.' } };
  assert.equal(derivePropertyBusinessRecommendation(pending), null);
  assert.deepEqual(picks(media(pending)), []);
  assert.deepEqual(picks(investorScenarioMarkup(pending)), []);
  assert(media(pending).includes('Assessment pending'));
  assert(media(pending).includes(pending.businessOpportunities.unavailableReason));
  assert(investorScenarioMarkup(pending).includes(pending.businessOpportunities.unavailableReason));

  for (const zoningClassification of ['C-1', 'C-3', 'R-1', 'I-1', '']) {
    const unassessed = { name: 'Zambrano', zoningClassification, proposedActivity: 'gym', lat: 16.63, lng: 120.32 };
    assert.equal(derivePropertyBusinessRecommendation(unassessed), null, 'Name, proposal and zoning alone cannot invent recommendations');
  }
  for (const coordinates of [{ lat: null }, { lng: '' }, { lat: 91 }, { lat: 0, lng: 0 }]) {
    assert.deepEqual(derivePropertyBusinessRecommendations({ ...property, ...coordinates }), [], 'A missing or invalid origin withholds recommendations');
  }
  const partial = { ...property, businessOpportunities: { supportedMatches: [matches[1]] } };
  assert.equal(picks(media(partial)).length, 1, 'Fewer supported matches must never be padded');
  assert.deepEqual(picks(media(partial)), picks(investorScenarioMarkup(partial)));
  const prohibited = { ...property, businessOpportunities: { supportedMatches: [{ ...matches[0], zoningOutcome: 'prohibited' }] } };
  assert.deepEqual(picks(media(prohibited)), [], 'Prohibited activities cannot appear as recommendations');

  const unsafe = { ...property, businessOpportunities: { supportedMatches: [{ ...matches[0], label: '<img onerror=alert(1)>',
    supportingPlaces: [{ name: '<script>alert(1)</script>', distanceMeters: 40 }], missingEvidence: ['<unsafe>'] }] } };
  for (const html of [media(unsafe), investorScenarioMarkup(unsafe)]) {
    assert(!html.includes('<script>') && !html.includes('<img onerror='));
    assert(html.includes('&lt;script&gt;') && html.includes('&lt;img onerror='));
  }

  // Pages without a server payload still use the evidence-based evaluator.
  const client = { ...pending, businessOpportunities: undefined };
  assert(derivePropertyBusinessRecommendations(client).length > 0);
  assert.deepEqual(picks(media(client)), picks(investorScenarioMarkup(client)));
  console.log('Property recommendation consistency, evidence, pending states and escaping passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
