const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

// Execute the production browser functions and compare their numbers with PHP.
// No database, network access, or generated scoring evidence is used.
const source = fs.readFileSync(path.join(__dirname, '../assets/js/property-wizard.js'), 'utf8');
function evaluate(name, input, mappedArea = 0) {
  const start = source.indexOf(`    function ${name}(`);
  const end = source.indexOf('\n    }', start + 1) + 6;
  assert(start >= 0 && end > start, `Find production function ${name}`);
  const context = {
    value: key => input[key] == null ? '' : String(input[key]),
    getListingPurpose: () => input.listing_purpose || 'sale',
    enteredAreaSqm: () => input.land_area ?? null,
    estimatedArea: mappedArea,
    number: String,
    form: {querySelector: () => null},
  };
  vm.createContext(context);
  return vm.runInContext(`(${source.slice(start, end).trim()})(${JSON.stringify(input)})`, context);
}
const servicePath = path.resolve(__dirname, '../app/Support/PropertyAssessmentService.php').replaceAll('\\', '/');
const phpCode = `require_once '${servicePath}'; $v=json_decode(stream_get_contents(STDIN), true); echo json_encode(App\\Support\\PropertyAssessmentService::evaluateEconomicViability($v, ['is_verified'=>true]), JSON_THROW_ON_ERROR);`;
const server = input => JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', ['-r', phpCode], {
  input: JSON.stringify(input), encoding: 'utf8', windowsHide: true,
}));
const base = {listing_purpose: 'sale', land_area: 100, offered_space_scope: 'entire_land', price: 1000000,
  comparable_market_price: 10000, comparable_unit: 'PHP/m2', comparable_source: 'Synthetic parity fixture', comparables_suitable: true};
const cases = [
  ['exact small parcel', {...base, land_area: 1.49, price: 1490}],
  ['just above 5% boundary', {...base, price: 1050001}],
  ['exact 5% boundary', {...base, price: 1050000}],
  ['just above 15% boundary', {...base, price: 1150001}],
  ['just above 30% boundary', {...base, price: 1300001}],
  ['non-finite market benchmark', {...base,comparable_market_price:'Infinity'}],
  ['negative market benchmark', {...base,comparable_market_price:-1}],
  ['missing offered floor area', {...base, offered_space_scope: 'part_property'}],
  ['sale on inquiry ignores retained draft price', {...base, sale_price_mode: 'request'}],
  ['monthly total rent', {...base, listing_purpose: 'lease', lease_price: 25000, lease_period: 'month',
    comparable_lease_price: 300, comparable_unit: 'PHP/m2/month', security_deposit_months: 2, advance_rent_months: 1}],
  ['annual total rent', {...base, listing_purpose: 'lease', lease_price: 300000, lease_period: 'year',
    comparable_lease_price: 300, comparable_unit: 'PHP/m2/month', security_deposit_months: 2, advance_rent_months: 1}],
  ['annual rent per square meter', {...base, listing_purpose: 'lease', lease_price: 3000, lease_price_unit: 'sqm', lease_period: 'year',
    comparable_lease_price: 300, comparable_unit: 'PHP/m2/month', security_deposit_months: 2, advance_rent_months: 1}],
  ['daily rent has no assumed monthly basis', {...base, listing_purpose: 'lease', lease_price: 1000, lease_period: 'day',
    comparable_lease_price: 300, comparable_unit: 'PHP/m2/month', security_deposit_months: 2}],
  ['lease on inquiry ignores retained draft price', {...base, listing_purpose: 'lease', lease_price: 25000, lease_price_mode: 'request'}],
  ['sale or lease are alternative outlays', {...base, listing_purpose: 'sale_or_lease', lease_price: 25000,
    security_deposit_months: 2, advance_rent_months: 1, additional_purchase_costs: 150000}],
  ['dual offer can use lease comparable', {...base, listing_purpose:'sale_or_lease', lease_price:25000,
    comparable_market_price:null, comparable_lease_price:300, comparable_unit:'PHP/m2/month'}],
  ['dual offer preserves lease threshold precision', {...base, listing_purpose:'sale_or_lease', lease_price:31500.01,
    comparable_market_price:null, comparable_lease_price:300, comparable_unit:'PHP/m2/month'}],
  ['dual offer on sale inquiry can still compare lease', {...base, listing_purpose:'sale_or_lease', sale_price_mode:'request',
    lease_price:25000, comparable_lease_price:300, comparable_unit:'PHP/m2/month'}],
];
let checks = 0;
for (const [label, input] of cases) {
  const client = evaluate('evaluateEconomicViabilityClient', input);
  const backend = server(input);
  const p = backend.pricing_analysis;
  for (const [browserKey, serverKey] of [['askingPricePerSqm', 'asking_price_per_sqm'], ['leasePricePerSqm', 'lease_price_per_sqm'],
    ['knownUpfrontCosts', 'known_upfront_costs'], ['saleAdditionalCosts', 'sale_additional_costs'], ['leaseUpfrontCosts', 'lease_upfront_costs']]) {
    const a = client[browserKey], b = p[serverKey];
    assert(a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-8), `${label}: ${browserKey}: browser ${a}, PHP ${b}`);
    checks++;
  }
  assert.equal(client.score, backend.score, `${label}: preliminary arithmetic agrees with the verified test fixture`);
  checks++;
}
const spatial = {road_access: 'frontage', road_surface_passability: 'paved', carriageway_width: 6, distance_to_major_road: 100};
const lease = {listing_purpose:'lease', lease_price:500, lease_price_unit:'sqm', lease_period:'month',
  land_area:1498, offered_space_scope:'entire_land', comparable_lease_price:300};
const blockedLease = evaluate('evaluateEconomicViabilityClient', lease, 22584.58);
assert.equal(blockedLease.score,null);
assert.equal(blockedLease.blockers[0].code,'area_discrepancy');
assert.equal(blockedLease.blockers[0].label,'Check area');
assert.equal(blockedLease.blockers[0].focus,'land_area');
assert.match(blockedLease.blockers[0].message,/1,498 m².*22,584.58 m².*93.4%.*25%/);
checks += 5;
const reconciled = evaluate('evaluateEconomicViabilityClient',lease,1498);
assert.equal(reconciled.score,50);
assert.equal(reconciled.iaiContribution,10);
assert.deepEqual(Array.from(reconciled.blockers),[]);
checks += 3;
for(const [input,code,focus] of [
  [{...lease,comparable_lease_price:null},'missing_comparable','comparable_lease_price'],
  [{...lease,offered_space_scope:'entire_building',offered_area_sqm:null},'missing_area','offered_area_sqm'],
  [{...lease,lease_price_mode:'request'},'missing_price','lease_price_mode'],
  [{...lease,lease_period:'day'},'rent_period','lease_period'],
]) {
  const result=evaluate('evaluateEconomicViabilityClient',input);
  assert.equal(result.score,null);assert.equal(result.blockers[0].code,code);assert.equal(result.blockers[0].focus,focus);checks+=3;
}
for (const invalid of [-1, 'Infinity', '-Infinity', 'NaN']) {
  assert.equal(evaluate('evaluateSpatialAccessibilityClient', {...spatial, distance_to_major_road: invalid}).score, null);
  assert.equal(evaluate('evaluateSpatialAccessibilityClient', {...spatial, carriageway_width: invalid}).score, null);
  checks += 2;
}
const composite = input => evaluate('calculateWizardCompositeMce', input);
// The aggregate function accepts arithmetic inputs only; the intake UI withholds publication.
const valid = {spatial_accessibility: 100, infrastructure_readiness: 100, economic_viability: 85, nearby_businesses: 85, risk_constraints: 100, zoning_compatibility: 85};
assert.equal(composite(valid).iaiScore, 94.8); checks++;
for (const invalid of ['', '100', true, 101, -1, null]) {
  assert.equal(composite({...valid, nearby_businesses: invalid}).iaiScore, null); checks++;
}
for (const invalid of ['', '100', true, 101, -1, null, 0, Infinity, NaN]) {
  assert.equal(composite({...valid, zoning_compatibility:invalid}).iaiScore,null);
  checks++;
}
assert.equal(composite({...valid,_riskCritical:true}).iaiScore,null); checks++;
console.log(`Property wizard computation parity: ${checks} checks passed across browser/PHP pricing, threshold precision, rent units, invalid measurements and aggregate validity.`);
