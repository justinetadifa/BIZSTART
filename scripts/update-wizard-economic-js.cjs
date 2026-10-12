const fs = require('fs');
const path = require('path');

const jsFile = path.join(__dirname, '../assets/js/property-wizard.js');
let js = fs.readFileSync(jsFile, 'utf8');

// 1. Insert evaluateEconomicViabilityClient and syncEconomicViability after data-infra-reset-example
const targetAfterInfraReset = `    $('[data-infra-reset-example]')?.addEventListener('click', () => {
      if (field('electricity_arrangement')) field('electricity_arrangement').value = 'generator_only';
      if (field('water_supply')) field('water_supply').value = 'piped_reliable';
      if (field('internet_telecom')) field('internet_telecom').value = 'fiber_reliable';
      if (field('drainage_conditions')) field('drainage_conditions').value = 'adequate_functional';
      syncInfrastructureReadiness();
      notify('Reset to example conditions: Generator-only (40), Piped water (100), Fiber (100), Functional drainage (100) = 79.0 / 100.');
    });`;

const econJsCode = `
    function evaluateEconomicViabilityClient(overrides) {
      const getVal = (name) => {
        if (overrides && Object.prototype.hasOwnProperty.call(overrides, name)) {
          return overrides[name] != null ? String(overrides[name]) : '';
        }
        return (typeof value === 'function' ? value(name) : '') || '';
      };

      const purpose = (getVal('listing_purpose') || (typeof getListingPurpose === 'function' ? getListingPurpose() : '') || 'sale').toLowerCase();
      const saleMode = form.querySelector('[name="sale_price_mode"]:checked')?.value || 'amount';
      const leaseMode = form.querySelector('[name="lease_price_mode"]:checked')?.value || 'amount';

      const rawPrice = (getVal('price') || '').replace(/,/g, '').trim();
      const rawLease = (getVal('lease_price') || '').replace(/,/g, '').trim();
      const askingPrice = rawPrice !== '' && !isNaN(Number(rawPrice)) && Number(rawPrice) > 0 ? Number(rawPrice) : null;
      const leasePrice = rawLease !== '' && !isNaN(Number(rawLease)) && Number(rawLease) > 0 ? Number(rawLease) : null;

      const rawArea = overrides?.land_area != null ? Number(overrides.land_area) : (typeof enteredAreaSqm === 'function' ? enteredAreaSqm() : null);
      const landArea = rawArea && Number.isFinite(rawArea) && rawArea > 0 ? rawArea : null;

      const rawBir = (getVal('bir_zonal_value') || '').trim();
      const birZonal = rawBir !== '' && !isNaN(Number(rawBir)) && Number(rawBir) > 0 ? Number(rawBir) : null;

      const rawComp = (getVal('comparable_market_price') || '').trim();
      const compMarket = rawComp !== '' && !isNaN(Number(rawComp)) && Number(rawComp) > 0 ? Number(rawComp) : null;

      const lguType = getVal('lgu_valuation_type') || '';
      const rawLguAmt = (getVal('lgu_valuation_amount') || '').trim();
      const lguAmount = rawLguAmt !== '' && !isNaN(Number(rawLguAmt)) && Number(rawLguAmt) > 0 ? Number(rawLguAmt) : null;

      // Calculations
      const askingPricePerSqm = (askingPrice !== null && landArea !== null && saleMode === 'amount')
        ? Math.round(askingPrice / landArea)
        : null;

      const leasePricePerSqm = (leasePrice !== null && landArea !== null && leaseMode === 'amount')
        ? Math.round((leasePrice / landArea) * 100) / 100
        : null;

      const totalBir = (birZonal !== null && landArea !== null)
        ? Math.round(birZonal * landArea)
        : null;

      const birDiffPct = (askingPricePerSqm !== null && birZonal !== null && birZonal > 0)
        ? Math.round(((askingPricePerSqm - birZonal) / birZonal) * 1000) / 10
        : null;

      const marketDiffPct = (askingPricePerSqm !== null && compMarket !== null && compMarket > 0)
        ? Math.round(((askingPricePerSqm - compMarket) / compMarket) * 1000) / 10
        : null;

      // Area discrepancy check
      const isDiscrepancy = (landArea !== null && estimatedArea > 0) &&
        ((Math.abs(landArea - estimatedArea) / Math.max(landArea, estimatedArea)) * 100 > 25);

      // Methodological score evaluation:
      // Without verified comparable market benchmark or if area discrepancy is present, assessment is Incomplete
      let isComplete = false;
      let totalScore = null;
      let iaiContribution = null;
      let statusLabel = 'Assessment Incomplete';
      let statusNote = 'Methodological Baseline · Awaiting Verified Market Comparables';

      if (!isDiscrepancy && compMarket !== null && askingPricePerSqm !== null) {
        // When market comparables are supplied:
        const compPct = marketDiffPct ?? 0;
        if (compPct >= -5.0 && compPct <= 5.0) {
          totalScore = 100.0;
          statusNote = 'Within ±5% of market benchmark (highly competitive).';
        } else if (compPct > 5.0 && compPct <= 15.0) {
          totalScore = 85.0;
          statusNote = '5% to 15% premium over market benchmark.';
        } else if (compPct > 15.0 && compPct <= 30.0) {
          totalScore = 70.0;
          statusNote = '15% to 30% premium over market benchmark.';
        } else if (compPct > 30.0) {
          totalScore = 50.0;
          statusNote = 'Significantly elevated (>30% above market benchmark).';
        } else {
          totalScore = 75.0;
          statusNote = 'Discounted asking price relative to market benchmark.';
        }
        isComplete = true;
        iaiContribution = Math.round((totalScore * 0.20) * 100) / 100;
        statusLabel = 'Preliminary Calculated';
      }

      return {
        purpose,
        saleMode,
        leaseMode,
        askingPrice,
        leasePrice,
        landArea,
        birZonal,
        compMarket,
        lguType,
        lguAmount,
        askingPricePerSqm,
        leasePricePerSqm,
        totalBir,
        birDiffPct,
        marketDiffPct,
        isDiscrepancy,
        isComplete,
        is_complete: isComplete,
        totalScore,
        score: totalScore,
        iaiContribution,
        iai_contribution: iaiContribution,
        statusLabel,
        statusNote,
      };
    }

    function syncEconomicViability() {
      const res = evaluateEconomicViabilityClient();

      // 1. Update FROM PROPERTY DETAILS section
      const purposeNames = { sale: 'For Sale', lease: 'For Lease', sale_or_lease: 'For Sale or Lease' };
      setText('[data-econ-from-purpose]', purposeNames[res.purpose] || 'For Sale');

      let priceText = 'Price on request';
      if (res.purpose === 'lease') {
        priceText = res.leasePrice ? \`₱\${number(res.leasePrice)} / month\` : (res.leaseMode === 'request' ? 'Rate on request' : 'Not entered');
      } else if (res.purpose === 'sale_or_lease') {
        const s = res.askingPrice ? \`₱\${number(res.askingPrice)}\` : 'Sale: Request';
        const l = res.leasePrice ? \`₱\${number(res.leasePrice)}/mo\` : 'Lease: Request';
        priceText = \`\${s} · \${l}\`;
      } else {
        priceText = res.askingPrice ? \`₱\${number(res.askingPrice)}\` : (res.saleMode === 'request' ? 'Price on request' : 'Not entered');
      }
      setText('[data-econ-from-price]', priceText);
      setText('[data-econ-from-area]', res.landArea ? \`\${number(res.landArea)} m²\` : (estimatedArea ? \`\${number(estimatedArea)} m² (mapped)\` : 'Not specified'));

      // 2. Update AUTOMATIC PRICE ANALYSIS section
      // Asking price per m² label and value
      const rateLabelEl = $('[data-econ-rate-type-label]');
      if (rateLabelEl) {
        rateLabelEl.textContent = res.purpose === 'lease' ? 'Monthly lease rate per m²' : 'Asking price per m²';
      }
      let askingSqmText = '—';
      if (res.purpose === 'lease') {
        askingSqmText = res.leasePricePerSqm !== null ? \`₱\${number(res.leasePricePerSqm)}/m²\` : '—';
      } else {
        askingSqmText = res.askingPricePerSqm !== null ? \`₱\${number(res.askingPricePerSqm)}\` : '—';
      }
      setText('[data-econ-asking-sqm]', askingSqmText);
      setText('[data-econ-bir-sqm]', res.birZonal !== null ? \`₱\${number(res.birZonal)}/m²\` : '—');

      // Total BIR reference
      setText('[data-econ-total-bir]', res.totalBir !== null ? \`₱\${number(res.totalBir)}\` : '—');

      // Asking price relative to BIR reference
      let birDiffText = '—';
      if (res.birDiffPct !== null) {
        if (res.birDiffPct > 0) birDiffText = \`\${res.birDiffPct.toFixed(1)}% higher\`;
        else if (res.birDiffPct < 0) birDiffText = \`\${Math.abs(res.birDiffPct).toFixed(1)}% lower\`;
        else birDiffText = 'Equal to BIR reference';
      }
      setText('[data-econ-bir-diff]', birDiffText);

      // Comparable market row
      const marketRow = $('[data-econ-market-diff-row]');
      if (marketRow) {
        if (res.marketDiffPct !== null) {
          marketRow.hidden = false;
          let mText = res.marketDiffPct > 0
            ? \`\${res.marketDiffPct.toFixed(1)}% higher than market benchmark\`
            : res.marketDiffPct < 0
              ? \`\${Math.abs(res.marketDiffPct).toFixed(1)}% lower than market benchmark\`
              : 'Equal to market benchmark';
          setText('[data-econ-market-diff]', mText);
        } else {
          marketRow.hidden = true;
        }
      }

      // Dual Sale or Lease row for lease rate
      const leaseRow = $('[data-econ-lease-sqm-row]');
      if (leaseRow) {
        if (res.purpose === 'sale_or_lease' && res.leasePricePerSqm !== null) {
          leaseRow.hidden = false;
          setText('[data-econ-lease-sqm]', \`₱\${number(res.leasePricePerSqm)}/m² / month\`);
        } else {
          leaseRow.hidden = true;
        }
      }

      // Area discrepancy banner
      const discAlert = $('[data-econ-area-discrepancy]');
      if (discAlert) {
        discAlert.hidden = !res.isDiscrepancy;
      }

      // Status badge and note
      const badgeEl = $('[data-econ-status-badge]');
      if (badgeEl) {
        badgeEl.textContent = res.statusLabel;
        badgeEl.className = \`pw-badge \${res.isComplete ? 'pw-badge-calculated' : 'pw-badge-provisional'}\`;
      }
      setText('[data-econ-status-note]', res.statusNote);
      setText('[data-econ-iai-val]', res.iaiContribution !== null ? \`\${res.iaiContribution.toFixed(2)} pts\` : '—');
    }

    ['bir_zonal_value', 'comparable_market_price', 'lgu_valuation_type', 'lgu_valuation_amount',
     'bir_source', 'bir_date', 'assessed_market_value', 'comparable_source'].forEach(name => {
      const el = field(name);
      if (!el) return;
      el.addEventListener('input', () => { syncEconomicViability(); preview(); ready(); });
      el.addEventListener('change', () => { syncEconomicViability(); preview(); ready(); });
    });

    $('[data-econ-reset-example]')?.addEventListener('click', () => {
      all('[name="listing_purpose"]').forEach(r => { r.checked = r.value === 'sale'; });
      all('[name="sale_price_mode"]').forEach(r => { r.checked = r.value === 'amount'; });
      const pInp = $('#pwAskingPrice') || field('price');
      if (pInp) pInp.value = '9,000,000';
      const aInp = field('land_area');
      if (aInp) aInp.value = '1000';
      const uInp = field('land_area_unit');
      if (uInp) uInp.value = 'sqm';
      const bInp = field('bir_zonal_value');
      if (bInp) bInp.value = '7000';
      const cInp = field('comparable_market_price');
      if (cInp) cInp.value = '';

      syncPricing();
      syncAreaEquivalents();
      syncEconomicViability();
      preview();
      ready();
      notify('Reset to example: Asking ₱9,000,000 for 1,000 m² (₱9,000/m²), BIR zonal ₱7,000/m² (28.6% higher).');
    });`;

if (!js.includes('function evaluateEconomicViabilityClient')) {
  if (js.includes(targetAfterInfraReset)) {
    js = js.replace(targetAfterInfraReset, targetAfterInfraReset + '\n' + econJsCode);
    console.log('Inserted evaluateEconomicViabilityClient and syncEconomicViability!');
  } else {
    console.error('Target after infra reset not found!');
    process.exit(1);
  }
}

// 2. Call syncEconomicViability in syncPricing and syncAreaEquivalents
if (js.includes('function syncPricing() {')) {
  js = js.replace('function syncPricing() {', 'function syncPricing() {\n      if (typeof syncEconomicViability === "function") syncEconomicViability();');
  console.log('Updated syncPricing!');
}

if (js.includes('function syncAreaEquivalents() {')) {
  js = js.replace('function syncAreaEquivalents() {', 'function syncAreaEquivalents() {\n      if (typeof syncEconomicViability === "function") syncEconomicViability();');
  console.log('Updated syncAreaEquivalents!');
}

// 3. Call syncEconomicViability in step 2 transition
if (js.includes('if(next===2){syncSpatialAccessibility();syncInfrastructureReadiness();}')) {
  js = js.replace('if(next===2){syncSpatialAccessibility();syncInfrastructureReadiness();}', 'if(next===2){syncSpatialAccessibility();syncInfrastructureReadiness();syncEconomicViability();}');
  console.log('Updated step 2 transition for economic!');
}

// 4. Call syncEconomicViability in wizard init
if (js.includes('syncSpatialAccessibility();\n        syncInfrastructureReadiness();\n        updateBoundary(true);')) {
  js = js.replace('syncSpatialAccessibility();\n        syncInfrastructureReadiness();\n        updateBoundary(true);', 'syncSpatialAccessibility();\n        syncInfrastructureReadiness();\n        syncEconomicViability();\n        updateBoundary(true);');
  console.log('Updated wizard init for economic!');
}

// 5. Update buildSubmission to serialize economic fields
const targetSubSubmission = `        data.set('drainage_outfall', value('drainage_outfall') || '');`;

const econSubmission = `        data.set('bir_zonal_value', value('bir_zonal_value') || '');
        data.set('comparable_market_price', value('comparable_market_price') || '');
        data.set('lgu_valuation_type', value('lgu_valuation_type') || '');
        data.set('lgu_valuation_amount', value('lgu_valuation_amount') || '');
        data.set('bir_source', value('bir_source') || '');
        data.set('bir_date', value('bir_date') || '');
        data.set('assessed_market_value', value('assessed_market_value') || '');
        data.set('comparable_source', value('comparable_source') || '');`;

if (!js.includes("data.set('comparable_market_price'")) {
  if (js.includes(targetSubSubmission)) {
    js = js.replace(targetSubSubmission, targetSubSubmission + '\n' + econSubmission);
    console.log('Updated buildSubmission with economic fields!');
  } else {
    console.error('Target sub submission not found!');
    process.exit(1);
  }
}

fs.writeFileSync(jsFile, js, 'utf8');
console.log('Successfully updated assets/js/property-wizard.js with economic viability logic!');
