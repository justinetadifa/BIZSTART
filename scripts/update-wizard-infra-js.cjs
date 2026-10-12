const fs = require('fs');
const path = require('path');

const jsFile = path.join(__dirname, '../assets/js/property-wizard.js');
let js = fs.readFileSync(jsFile, 'utf8');

// 1. Insert evaluateInfrastructureReadinessClient and syncInfrastructureReadiness
const targetAfterSpatialReset = `    $('[data-spatial-reset-example]')?.addEventListener('click', () => {
      if (field('road_access')) field('road_access').value = 'frontage';
      if (field('road_surface_passability')) field('road_surface_passability').value = 'paved';
      if (field('carriageway_width')) field('carriageway_width').value = '';
      if (field('distance_to_major_road')) field('distance_to_major_road').value = '250';
      syncSpatialAccessibility();
      notify('Example conditions reset. Enter carriageway width to see the live calculated score.');
    });`;

const infraJsCode = `
    function evaluateInfrastructureReadinessClient(overrides) {
      const getVal = (name) => {
        if (overrides && Object.prototype.hasOwnProperty.call(overrides, name)) {
          return overrides[name] != null ? String(overrides[name]) : '';
        }
        return (typeof value === 'function' ? value(name) : '') || '';
      };

      // 1. Electricity (35%)
      const elecVal = (getVal('electricity_arrangement') || '').trim();
      let elecScore = null;
      let elecLabel = 'Incomplete';
      if (elecVal === 'grid_reliable') { elecScore = 100; elecLabel = '100/100'; }
      else if (elecVal === 'solar_battery') { elecScore = 90; elecLabel = '90/100'; }
      else if (elecVal === 'generator_only') { elecScore = 40; elecLabel = '40/100'; }
      else if (elecVal === 'grid_unconnected') { elecScore = 40; elecLabel = '40/100'; }
      else if (elecVal === 'no_supply') { elecScore = 0; elecLabel = '0/100'; }

      // 2. Water Supply (30%)
      const waterVal = (getVal('water_supply') || '').trim();
      let waterScore = null;
      let waterLabel = 'Incomplete';
      if (waterVal === 'piped_reliable') { waterScore = 100; waterLabel = '100/100'; }
      else if (waterVal === 'deepwell_tested' || waterVal === 'deep_well_tested') { waterScore = 90; waterLabel = '90/100'; }
      else if (waterVal === 'limited_intermittent') { waterScore = 60; waterLabel = '60/100'; }
      else if (waterVal === 'available_unconnected') { waterScore = 40; waterLabel = '40/100'; }
      else if (waterVal === 'unavailable') { waterScore = 0; waterLabel = '0/100'; }

      // 3. Internet & Telecommunications (20%)
      const netVal = (getVal('internet_telecom') || '').trim();
      let netScore = null;
      let netLabel = 'Incomplete';
      if (netVal === 'fiber_reliable') { netScore = 100; netLabel = '100/100'; }
      else if (netVal === 'fixed_wireless') { netScore = 85; netLabel = '85/100'; }
      else if (netVal === 'satellite_reliable') { netScore = 75; netLabel = '75/100'; }
      else if (netVal === 'mobile_data_stable') { netScore = 70; netLabel = '70/100'; }
      else if (netVal === 'available_uninstalled') { netScore = 40; netLabel = '40/100'; }
      else if (netVal === 'unavailable') { netScore = 0; netLabel = '0/100'; }

      // 4. Drainage (15%)
      const drainVal = (getVal('drainage_conditions') || '').trim();
      let drainScore = null;
      let drainLabel = 'Incomplete';
      if (drainVal === 'adequate_functional') { drainScore = 100; drainLabel = '100/100'; }
      else if (drainVal === 'minor_improvements') { drainScore = 70; drainLabel = '70/100'; }
      else if (drainVal === 'inadequate') { drainScore = 35; drainLabel = '35/100'; }
      else if (drainVal === 'unavailable') { drainScore = 0; drainLabel = '0/100'; }

      const isComplete = elecScore !== null && waterScore !== null && netScore !== null && drainScore !== null;
      const totalScore = isComplete
        ? Math.round(((elecScore * 0.35) + (waterScore * 0.30) + (netScore * 0.20) + (drainScore * 0.15)) * 10) / 10
        : null;
      const iaiContribution = isComplete ? Math.round((totalScore * 0.20) * 100) / 100 : null;

      const crossCriteria = {};
      if (elecVal === 'generator_only') {
        crossCriteria.economic_viability = {
          criterion_key: 'economic_viability',
          subcriterion: 'Operating Expenditures (OPEX)',
          note: 'Generator-only electricity implies continuous recurring fuel and maintenance expenditures; separately recorded for Economic Viability operating cost assessment without double-penalizing physical infrastructure.'
        };
        crossCriteria.environmental_safety = {
          criterion_key: 'environmental_safety',
          subcriterion: 'Emissions, Noise & Hazardous Storage',
          note: 'Generator-only operation entails combustion emissions, acoustic noise, and requires safe fuel containment/storage facilities on site; flagged for Environmental Safety evaluation without arbitrary score deductions.'
        };
      }

      return {
        electricity: { rawKey: elecVal, score: elecScore, label: elecLabel, weighted: elecScore !== null ? elecScore * 0.35 : null },
        water: { rawKey: waterVal, score: waterScore, label: waterLabel, weighted: waterScore !== null ? waterScore * 0.30 : null },
        internet: { rawKey: netVal, score: netScore, label: netLabel, weighted: netScore !== null ? netScore * 0.20 : null },
        drainage: { rawKey: drainVal, score: drainScore, label: drainLabel, weighted: drainScore !== null ? drainScore * 0.15 : null },
        subcategories: {
          electricity: { score: elecScore, label: elecLabel, weighted: elecScore !== null ? elecScore * 0.35 : null },
          water: { score: waterScore, label: waterLabel, weighted: waterScore !== null ? waterScore * 0.30 : null },
          internet: { score: netScore, label: netLabel, weighted: netScore !== null ? netScore * 0.20 : null },
          drainage: { score: drainScore, label: drainLabel, weighted: drainScore !== null ? drainScore * 0.15 : null },
        },
        cross_criteria: crossCriteria,
        isComplete,
        is_complete: isComplete,
        totalScore,
        score: totalScore,
        iaiContribution,
        iai_contribution: iaiContribution,
      };
    }
    function syncInfrastructureReadiness() {
      const res = evaluateInfrastructureReadinessClient();

      // Update Subcriteria Score Badges in item footers
      const elecBadge = $('[data-infra-sub-score="electricity"]');
      if (elecBadge) {
        elecBadge.textContent = res.electricity.score !== null ? \`\${res.electricity.weighted.toFixed(2)} pts\` : 'Incomplete';
        elecBadge.className = \`pw-sub-score \${res.electricity.score !== null ? 'is-complete' : 'is-incomplete'}\`;
      }
      const waterBadge = $('[data-infra-sub-score="water"]');
      if (waterBadge) {
        waterBadge.textContent = res.water.score !== null ? \`\${res.water.weighted.toFixed(2)} pts\` : 'Incomplete';
        waterBadge.className = \`pw-sub-score \${res.water.score !== null ? 'is-complete' : 'is-incomplete'}\`;
      }
      const netBadge = $('[data-infra-sub-score="internet"]');
      if (netBadge) {
        netBadge.textContent = res.internet.score !== null ? \`\${res.internet.weighted.toFixed(2)} pts\` : 'Incomplete';
        netBadge.className = \`pw-sub-score \${res.internet.score !== null ? 'is-complete' : 'is-incomplete'}\`;
      }
      const drainBadge = $('[data-infra-sub-score="drainage"]');
      if (drainBadge) {
        drainBadge.textContent = res.drainage.score !== null ? \`\${res.drainage.weighted.toFixed(2)} pts\` : 'Incomplete';
        drainBadge.className = \`pw-sub-score \${res.drainage.score !== null ? 'is-complete' : 'is-incomplete'}\`;
      }

      // Generator callout visibility
      const genCallout = $('[data-infra-generator-callout]');
      if (genCallout) {
        genCallout.hidden = res.electricity.rawKey !== 'generator_only';
      }

      // Update Preview Card State
      const incompleteBox = $('[data-infra-state-incomplete]');
      const completeBox = $('[data-infra-state-complete]');
      if (incompleteBox && completeBox) {
        if (!res.isComplete) {
          incompleteBox.hidden = false;
          completeBox.hidden = true;
        } else {
          incompleteBox.hidden = true;
          completeBox.hidden = false;

          setText('[data-infra-total-score]', res.totalScore.toFixed(1));
          setText('[data-infra-iai-contrib]', res.iaiContribution.toFixed(2));
          setText('[data-infra-pts-elec]', res.electricity.weighted.toFixed(2));
          setText('[data-infra-pts-water]', res.water.weighted.toFixed(2));
          setText('[data-infra-pts-internet]', res.internet.weighted.toFixed(2));
          setText('[data-infra-pts-drainage]', res.drainage.weighted.toFixed(2));

          const pBar = $('[data-infra-progress-bar]');
          if (pBar) {
            pBar.style.width = \`\${Math.min(100, Math.max(0, res.totalScore))}%\`;
          }
        }
      }
    }

    ['electricity_arrangement', 'water_supply', 'internet_telecom', 'drainage_conditions',
     'generator_fuel_type', 'generator_storage_notes', 'electricity_provider', 'electricity_capacity',
     'electricity_backup', 'water_provider', 'water_testing_notes', 'water_storage_notes',
     'internet_provider', 'download_speed_mbps', 'internet_backup_notes', 'drainage_type', 'drainage_outfall'].forEach(name => {
      const el = field(name);
      if (!el) return;
      el.addEventListener('input', () => { syncInfrastructureReadiness(); preview(); ready(); });
      el.addEventListener('change', () => { syncInfrastructureReadiness(); preview(); ready(); });
    });

    $('[data-infra-reset-example]')?.addEventListener('click', () => {
      if (field('electricity_arrangement')) field('electricity_arrangement').value = 'generator_only';
      if (field('water_supply')) field('water_supply').value = 'piped_reliable';
      if (field('internet_telecom')) field('internet_telecom').value = 'fiber_reliable';
      if (field('drainage_conditions')) field('drainage_conditions').value = 'adequate_functional';
      syncInfrastructureReadiness();
      notify('Reset to example conditions: Generator-only (40), Piped water (100), Fiber (100), Functional drainage (100) = 79.0 / 100.');
    });`;

if (!js.includes('function evaluateInfrastructureReadinessClient')) {
  if (js.includes(targetAfterSpatialReset)) {
    js = js.replace(targetAfterSpatialReset, targetAfterSpatialReset + '\n' + infraJsCode);
    console.log('Inserted evaluateInfrastructureReadinessClient and syncInfrastructureReadiness!');
  } else {
    console.error('Target after spatial reset not found!');
    process.exit(1);
  }
}

// 2. Call syncInfrastructureReadiness in step navigation: if(next===2)syncSpatialAccessibility();
if (js.includes('if(next===2)syncSpatialAccessibility();')) {
  js = js.replace('if(next===2)syncSpatialAccessibility();', 'if(next===2){syncSpatialAccessibility();syncInfrastructureReadiness();}');
  console.log('Updated step 2 transition!');
}

// 3. Call syncInfrastructureReadiness in wizard init: syncSpatialAccessibility();
if (js.includes('syncSpatialAccessibility();\n        updateBoundary(true);')) {
  js = js.replace('syncSpatialAccessibility();\n        updateBoundary(true);', 'syncSpatialAccessibility();\n        syncInfrastructureReadiness();\n        updateBoundary(true);');
  console.log('Updated wizard init!');
}

// 4. Update buildSubmission to serialize infrastructure fields
const targetSubmission = `        data.set('road_frontage', value('road_access') === 'frontage' ? 'yes' : (value('road_access') === 'no_access' ? 'no' : 'not_verified'));
        data.set('road_surface', ['paved', 'gravel', 'unpaved'].includes(value('road_surface_passability')) ? value('road_surface_passability') : 'not_verified');`;

const infraSubmission = `
        const infraRes = typeof evaluateInfrastructureReadinessClient === 'function' ? evaluateInfrastructureReadinessClient() : null;
        data.set('electricity_arrangement', value('electricity_arrangement') || 'unknown');
        data.set('water_supply', value('water_supply') || 'unknown');
        data.set('internet_telecom', value('internet_telecom') || 'unknown');
        data.set('drainage_conditions', value('drainage_conditions') || 'unknown');
        data.set('generator_fuel_type', value('generator_fuel_type') || '');
        data.set('generator_storage_notes', value('generator_storage_notes') || '');
        data.set('electricity_provider', value('electricity_provider') || '');
        data.set('electricity_capacity', value('electricity_capacity') || '');
        data.set('electricity_backup', value('electricity_backup') || '');
        data.set('water_provider', value('water_provider') || '');
        data.set('water_testing_notes', value('water_testing_notes') || '');
        data.set('water_storage_notes', value('water_storage_notes') || '');
        data.set('internet_provider', value('internet_provider') || '');
        data.set('internet_backup_notes', value('internet_backup_notes') || '');
        data.set('drainage_type', value('drainage_type') || '');
        data.set('drainage_outfall', value('drainage_outfall') || '');
        if (infraRes) {
          data.set('infrastructure_readiness_score', infraRes.isComplete ? String(infraRes.totalScore) : '');
          data.set('infrastructure_readiness_complete', infraRes.isComplete ? '1' : '0');
          data.set('infrastructure_iai_contribution', infraRes.isComplete ? String(infraRes.iaiContribution) : '');
        }`;

if (!js.includes("data.set('electricity_arrangement'")) {
  if (js.includes(targetSubmission)) {
    js = js.replace(targetSubmission, targetSubmission + '\n' + infraSubmission);
    console.log('Updated buildSubmission!');
  } else {
    console.error('Target submission not found!');
    process.exit(1);
  }
}

fs.writeFileSync(jsFile, js, 'utf8');
console.log('Successfully updated assets/js/property-wizard.js!');
