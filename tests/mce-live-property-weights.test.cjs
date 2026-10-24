'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const model = require('../assets/js/mce-active-weights.js');
const source = fs.readFileSync('assets/js/property-wizard.js', 'utf8');
const state = model.create({weights:model.baseline,version:'baseline-fixture'});
const context = vm.createContext({mceModel:state,mceWeight:key=>state.weight(key)});
for (const name of ['calculateWizardCompositeMce','evaluateSpatialAccessibilityClient','evaluateInfrastructureReadinessClient']) {
  const start = source.indexOf(`    function ${name}(`), end = source.indexOf('\n    }', start) + 6;
  assert(start > 0 && end > start);
  vm.runInContext(source.slice(start, end), context);
}
const ratings = {spatial_accessibility:100,infrastructure_readiness:50,property_cost_market_competitiveness:80,nearby_businesses:40,risk_constraints:60,zoning_compatibility:100};
assert.equal(context.calculateWizardCompositeMce(ratings).iaiScore, 68.5);
const custom = {spatial_accessibility:40,infrastructure_readiness:20,property_cost_market_competitiveness:15,nearby_businesses:10,risk_constraints:15};
assert(state.update({weights:custom,version:'custom-fixture'}));
const revised = context.calculateWizardCompositeMce(ratings);
assert.equal(revised.iaiScore, 75, 'Already-open calculator uses the new configuration immediately');
assert.equal(revised.breakdown.spatial_accessibility.contribution, 40);
assert.equal(revised.breakdown.zoning_compatibility.weight, 0);
assert.equal(state.weight('economic_viability'),15,'Legacy cost label resolves to the active canonical weight');
assert.equal(context.evaluateSpatialAccessibilityClient({road_access:'frontage',road_surface_passability:'paved',carriageway_width:6,distance_to_major_road:100}).iaiContribution,40);
assert.equal(context.evaluateInfrastructureReadinessClient({electricity_arrangement:'grid_reliable',water_supply:'piped_reliable',internet_telecom:'fiber_reliable',drainage_conditions:'adequate_functional'}).iaiContribution,20);
for (const invalid of [{...custom,spatial_accessibility:40.01},{...custom,spatial_accessibility:Infinity},
  {...custom,spatial_accessibility:'40'},{...custom,nearby_businesses:0,spatial_accessibility:50},
  {...custom,zoning_compatibility:15},{}]) {
  assert.equal(state.update({weights:invalid,version:'invalid'}),false);
  assert.equal(state.version,'custom-fixture','Invalid updates retain the last confirmed model');
  assert.equal(context.calculateWizardCompositeMce(ratings).iaiScore,75);
}
assert.equal(context.calculateWizardCompositeMce({...ratings,risk_constraints:null}).iaiScore,null,'Missing criteria never redistribute weight');
assert.equal(context.calculateWizardCompositeMce({...ratings,_zoningProhibited:true}).iaiScore,null);
assert.equal(context.calculateWizardCompositeMce({...ratings,_riskCritical:true}).iaiScore,null);
assert(state.update({weights:{spatial_accessibility:33.33,infrastructure_readiness:26.67,property_cost_market_competitiveness:20,nearby_businesses:10,risk_constraints:10},version:'decimal-fixture'}));
assert.equal(context.calculateWizardCompositeMce({...ratings,infrastructure_readiness:100,property_cost_market_competitiveness:100,nearby_businesses:100,risk_constraints:100}).iaiScore,100);
console.log('Live MCE/property regression checks passed: changed allocations, exact totals, aliases, contributions and eligibility holds.');
