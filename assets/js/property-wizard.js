(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number = value => new Intl.NumberFormat('en-PH', {maximumFractionDigits: 2}).format(value);
  const areaNumber = value => new Intl.NumberFormat('en-PH', {maximumFractionDigits: value > 0 && value < 1 ? 8 : 2}).format(value);
  const actions = {
    spatial_accessibility: ['Confirm road frontage and access evidence.', 'Confirm', 'spatial_accessibility'],
    infrastructure_readiness: ['Confirm electricity, water, and internet.', 'Confirm', 'infrastructure_readiness'],
    economic_viability: ['Add a dated BIR zonal reference.', 'Add reference', 'economic_viability'],
    nearby_businesses: ['Run the radar and check inventory coverage.', 'Run radar', 'nearby_businesses'],
    zoning_compatibility: ['Add the parcel zoning and CLUP source.', 'Add evidence', 'zoning_compatibility'],
    risk_constraints: ['Review hazard layers and parcel coverage.', 'Review', 'risk_constraints'],
  };
  const labels = {spatial_accessibility:'Spatial accessibility',infrastructure_readiness:'Infrastructure readiness',economic_viability:'Economic viability',nearby_businesses:'Nearby businesses',zoning_compatibility:'Zoning compatibility',risk_constraints:'Risk constraints'};
  const businessRoles = {
    cafe: {
      direct: ['cafe','coffee_shop','coffee','bakery','pastry','tea','tea_house','bistro','ice_cream','dessert','donut','bagel'],
      related: ['restaurant','fast_food','food_court','canteen','pub','bar','diner','eatery','food','beverages'],
      complementary: ['office','coworking','school','college','university','retail','supermarket','convenience','hotel','hospital','clinic','bank','library','commercial','department_store','mall','shop','pharmacy']
    },
    retail: {
      direct: ['retail','convenience','supermarket','shop','department_store','mall','general','grocery','variety_store','clothes','shoes','electronics','hardware','marketplace'],
      related: ['wholesale','warehouse_club','showroom','specialty_store','market_stall'],
      complementary: ['office','coworking','school','college','university','cafe','restaurant','fast_food','hotel','residential','bank','pharmacy','hospital','parking']
    },
    office: {
      direct: ['office','coworking','commercial','business_centre','corporate','company'],
      related: ['shared_workspace','conference_centre','studio','agency','lawyer','accountant','consultant'],
      complementary: ['cafe','coffee_shop','restaurant','fast_food','retail','convenience','bank','atm','transport','hotel','parking','pharmacy','post_office']
    },
    hospitality: {
      direct: ['hotel','hospitality','lodging','motel','guest_house','hostel','resort','inn'],
      related: ['bed_and_breakfast','serviced_apartment','vacation_rental','dormitory'],
      complementary: ['restaurant','cafe','bar','pub','retail','tourism','transport','fast_food','supermarket','convenience','attraction','souvenir','bank','taxi']
    },
    industrial: {
      direct: ['industrial','manufacturing','warehouse','factory','depot','logistics_hub'],
      related: ['workshop','repair_shop','storage_facility','distribution_center'],
      complementary: ['logistics','transport','supplier','fuel','commercial','repair','hardware','construction']
    },
  };
  Object.values(businessRoles).forEach(b => { if (!b.competitors) b.competitors = b.direct; });

  const PropertyDraftStorage = (() => {
    const DB_NAME = 'sfc_property_drafts';
    const DB_VERSION = 1;
    const STORE_NAME = 'draft_media';

    function isAvailable() {
      try {
        return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined' && window.indexedDB !== null;
      } catch {
        return false;
      }
    }

    function openDb() {
      if (!isAvailable()) return Promise.resolve(null);
      return new Promise((resolve) => {
        try {
          const req = window.indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = (event) => {
            const db = req.result || event?.target?.result;
            if (db && !db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
          req.onblocked = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    function createFile(blob, name, options) {
      try {
        if (typeof File !== 'undefined') {
          return new File([blob], name, options);
        }
      } catch {}
      try {
        blob.name = name;
        blob.lastModified = options?.lastModified || Date.now();
      } catch {}
      return blob;
    }

    async function saveMedia(key, { files = [], existingMedia = [], evidenceFiles = [], authorityFiles = [] } = {}) {
      if (!key || !isAvailable()) return false;
      try {
        const db = await openDb();
        if (!db) return false;

        const serializedFiles = files.map((file) => ({
          name: file.name,
          type: file.type || 'image/jpeg',
          lastModified: file.lastModified || Date.now(),
          size: file.size,
          blob: file
        }));

        const serializedEvidence = (evidenceFiles || []).map((file) => ({
          name: file.name,
          type: file.type || 'application/octet-stream',
          lastModified: file.lastModified || Date.now(),
          size: file.size,
          blob: file
        }));
        const serializedAuthority = authorityFiles.map(file => ({name:file.name,type:file.type,lastModified:file.lastModified,blob:file}));

        const cleanExisting = (existingMedia || []).map((m) => ({
          id: m.id || null,
          source: m.source || '',
          isRemoved: Boolean(m.isRemoved)
        }));

        return new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put({
              key,
              savedAt: Date.now(),
              files: serializedFiles,
              existingMedia: cleanExisting,
              evidenceFiles: serializedEvidence,
              authorityFiles: serializedAuthority
            });
            tx.oncomplete = () => { try { db.close(); } catch {} resolve(true); };
            tx.onerror = () => { try { db.close(); } catch {} resolve(false); };
            tx.onabort = () => { try { db.close(); } catch {} resolve(false); };
          } catch {
            try { db.close(); } catch {}
            resolve(false);
          }
        });
      } catch {
        return false;
      }
    }

    async function getMedia(key) {
      if (!key || !isAvailable()) return null;
      try {
        const db = await openDb();
        if (!db) return null;

        return new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => {
              try { db.close(); } catch {}
              const record = req.result;
              if (!record) return resolve(null);

              const restoredFiles = (record.files || []).map((item) => {
                const blob = item.blob instanceof Blob ? item.blob : new Blob([item.blob], { type: item.type });
                return createFile(blob, item.name, {
                  type: item.type,
                  lastModified: item.lastModified
                });
              });

              const restoredEvidence = (record.evidenceFiles || []).map((item) => {
                const blob = item.blob instanceof Blob ? item.blob : new Blob([item.blob], { type: item.type });
                return createFile(blob, item.name, {
                  type: item.type,
                  lastModified: item.lastModified
                });
              });

              resolve({
                files: restoredFiles,
                existingMedia: record.existingMedia || [],
                evidenceFiles: restoredEvidence,
                authorityFiles: (record.authorityFiles || []).map(item => createFile(item.blob, item.name, {type:item.type,lastModified:item.lastModified}))
              });
            };
            req.onerror = () => {
              try { db.close(); } catch {}
              resolve(null);
            };
          } catch {
            try { db.close(); } catch {}
            resolve(null);
          }
        });
      } catch {
        return null;
      }
    }

    async function deleteMedia(key) {
      if (!key || !isAvailable()) return false;
      try {
        const db = await openDb();
        if (!db) return false;
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.delete(key);
            tx.oncomplete = () => { try { db.close(); } catch {} resolve(true); };
            tx.onerror = () => { try { db.close(); } catch {} resolve(false); };
            tx.onabort = () => { try { db.close(); } catch {} resolve(false); };
          } catch {
            try { db.close(); } catch {}
            resolve(false);
          }
        });
      } catch {
        return false;
      }
    }

    return {
      saveMedia,
      getMedia,
      deleteMedia
    };
  })();

  // Both selectors, restored drafts and submission use the server's catalog.
  function normalizeClassification(catalog, category, primary, additional = []) {
    const key = text => String(text ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
    const lookup = (map, label) => Object.entries(map || {}).find(([name]) => key(name) === key(label))?.[1];
    const original = String(category || 'Land');
    const canonical = Object.keys(catalog.categories || {}).find(name => key(name) === key(original)) || lookup(catalog.categoryAliases, original) || 'Land';
    const allowed = catalog.categories?.[canonical] || [];
    const contextual = lookup(catalog.legacySubcategoryAliases, original) || {};
    const resolve = label => {
      const candidate = lookup(contextual, label) || label;
      return allowed.find(name => key(name) === key(candidate)) || lookup(catalog.subcategoryAliases?.[canonical], candidate) || null;
    };
    const split = items => (Array.isArray(items) ? items : [items]).flatMap(item => String(item ?? '').split(',')).map(item => item.trim()).filter(Boolean);
    const parts = split(primary);
    const chosen = resolve(parts[0] || '') || '';
    const extras = [...new Set([...parts.slice(1), ...split(additional)].map(resolve).filter(item => item && allowed.includes(item) && item !== chosen))];
    return { category: canonical, primary: chosen, additional: extras };
  }

  window.SFCPropertyWizard = (form, {apiBase, dialog, assessment}) => {
    if (!form || !dialog?.classList.contains('property-wizard')) return null;
    const $ = selector => form.querySelector(selector);
    const all = selector => [...form.querySelectorAll(selector)];
    const field = name => form.elements[name];
    const value = name => field(name)?.value || '';
    const setText = (selector, text) => all(selector).forEach(node => { node.textContent = text; });

    let isLegacyZeroSale = false;
    let isLegacyZeroLease = false;
    let propertyApprovalState = 'draft';

    const getListingPurpose = () => form.querySelector('[name="listing_purpose"]:checked')?.value || value('listing_purpose') || 'sale';
    const purposeLabel = () => ({sale:'For Sale',lease:'For Lease',sale_or_lease:'For Sale or Lease'})[getListingPurpose()] || 'For Sale';

    function validatePricingFields() {
      const purpose = getListingPurpose();
      const saleMode = form.querySelector('[name="sale_price_mode"]:checked')?.value || 'amount';
      const leaseMode = form.querySelector('[name="lease_price_mode"]:checked')?.value || 'amount';
      const pInp = $('#pwAskingPrice');
      const lpInp = $('#pwLeasePrice');

      if (pInp) {
        if (purpose !== 'lease' && saleMode === 'amount') {
          const raw = pInp.value.replace(/,/g, '').trim();
          if (raw !== '' && (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) <= 0)) {
            pInp.setCustomValidity('Enter a valid positive asking price, or choose Price on request.');
          } else {
            pInp.setCustomValidity('');
          }
        } else {
          pInp.setCustomValidity('');
        }
      }

      if (lpInp) {
        if (purpose !== 'sale' && leaseMode === 'amount') {
          const raw = lpInp.value.replace(/,/g, '').trim();
          if (raw !== '' && (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) <= 0)) {
            lpInp.setCustomValidity('Enter a valid positive rental asking price, or choose Price on request.');
          } else {
            lpInp.setCustomValidity('');
          }
        } else {
          lpInp.setCustomValidity('');
        }
      }
    }

    function syncPricing() {
      if (typeof syncEconomicViability === "function") syncEconomicViability();
      const purpose = getListingPurpose();
      const saleShown = purpose !== 'lease';
      const leaseShown = purpose !== 'sale';

      all('[data-sale-price-fields]').forEach(group => {
        group.hidden = !saleShown;
        group.querySelectorAll('input:not([data-photo-file]), select').forEach(input => { input.disabled = !saleShown; });
      });
      all('[data-lease-price-fields]').forEach(group => {
        group.hidden = !leaseShown;
        group.querySelectorAll('input:not([data-photo-file]), select').forEach(input => { input.disabled = !leaseShown; });
      });

      // Highlight purpose cards
      all('[data-purpose-card]').forEach(card => {
        const radio = card.querySelector('input[type="radio"]');
        card.classList.toggle('is-active', radio?.checked || radio?.value === purpose);
      });

      // Sync sale price mode
      const saleMode = form.querySelector('[name="sale_price_mode"]:checked')?.value || 'amount';
      all('[data-sale-mode-card]').forEach(card => {
        const radio = card.querySelector('input[type="radio"]');
        card.classList.toggle('is-active', radio?.checked || radio?.value === saleMode);
      });
      const saleInputWrap = $('[data-sale-price-input-wrap]');
      if (saleInputWrap) {
        saleInputWrap.hidden = saleMode !== 'amount';
        const pInp = $('#pwAskingPrice');
        if (pInp) { pInp.disabled = !saleShown || saleMode !== 'amount'; pInp.required = !pInp.disabled; }
      }

      // Sync lease price mode
      const leaseMode = form.querySelector('[name="lease_price_mode"]:checked')?.value || 'amount';
      all('[data-lease-mode-card]').forEach(card => {
        const radio = card.querySelector('input[type="radio"]');
        card.classList.toggle('is-active', radio?.checked || radio?.value === leaseMode);
      });
      const leaseInputWrap = $('[data-lease-price-input-wrap]');
      if (leaseInputWrap) {
        leaseInputWrap.hidden = leaseMode !== 'amount';
        const lpInp = $('#pwLeasePrice');
        if (lpInp) { lpInp.disabled = !leaseShown || leaseMode !== 'amount'; lpInp.required = !lpInp.disabled; }
      }

      // Legacy zero notices
      const saleZeroNotice = $('[data-legacy-zero-sale-notice]');
      if (saleZeroNotice) saleZeroNotice.hidden = !isLegacyZeroSale || !saleShown || saleMode === 'request';
      const leaseZeroNotice = $('[data-legacy-zero-lease-notice]');
      if (leaseZeroNotice) leaseZeroNotice.hidden = !isLegacyZeroLease || !leaseShown || leaseMode === 'request';

      validatePricingFields();
    }

    function formatPriceInput(input) {
      if (!input) return;
      const original = input.value;
      const cursorPos = input.selectionStart || 0;
      const raw = original.replace(/,/g, '').trim();
      if (!/^\d*$/.test(raw)) return;
      if (!raw) { input.value = ''; return; }
      const formatted = raw.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      input.value = formatted;
      let newCursorPos = 0, digitsFound = 0;
      const digitsBeforeCursor = original.slice(0, cursorPos).replace(/\D/g, '').length;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) digitsFound++;
        if (digitsFound === digitsBeforeCursor) { newCursorPos = i + 1; break; }
      }
      if (input.setSelectionRange) input.setSelectionRange(newCursorPos, newCursorPos);
    }

    function askingPriceSummary() {
      const purpose = getListingPurpose();

      function formatSaleSummary() {
        const saleRadio = form.querySelector('[name="sale_price_mode"]:checked');
        if (!saleRadio) return 'Price not provided';
        if (saleRadio.value === 'request') return 'Price on request';
        if (isLegacyZeroSale) return 'Ambiguous price (PHP 0)';
        const raw = value('price').replace(/,/g, '').trim();
        if (/^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) && Number(raw) > 0) {
          return `PHP ${number(Number(raw))}`;
        }
        return 'Price not provided';
      }

      function formatLeaseSummary() {
        const leaseRadio = form.querySelector('[name="lease_price_mode"]:checked');
        if (!leaseRadio) return 'Price not provided';
        if (leaseRadio.value === 'request') return 'Price on request';
        if (isLegacyZeroLease) return 'Ambiguous price (PHP 0)';
        const raw = value('lease_price').replace(/,/g, '').trim();
        if (/^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) && Number(raw) > 0) {
          const period = value('lease_period') || 'month';
          const unit = value('lease_price_unit') === 'sqm' ? 'm² / ' : '';
          return `PHP ${number(Number(raw))} / ${unit}${period}`;
        }
        return 'Price not provided';
      }

      if (purpose === 'sale') return formatSaleSummary();
      if (purpose === 'lease') return formatLeaseSummary();
      if (purpose === 'sale_or_lease') {
        const saleText = formatSaleSummary();
        const leaseText = formatLeaseSummary();
        if (saleText === 'Price not provided' && leaseText === 'Price not provided') return 'Price not provided';
        if (saleText === 'Price on request' && leaseText === 'Price on request') return 'Price on request';
        return `Sale: ${saleText} · Lease: ${leaseText}`;
      }
      return formatSaleSummary();
    }

    all('[name="listing_purpose"]').forEach(r => r.addEventListener('change', () => { syncPricing(); preview(); }));
    all('[name="sale_price_mode"]').forEach(r => r.addEventListener('change', () => {
      if (r.value === 'request') isLegacyZeroSale = false;
      syncPricing(); preview();
    }));
    all('[name="lease_price_mode"]').forEach(r => r.addEventListener('change', () => {
      if (r.value === 'request') isLegacyZeroLease = false;
      syncPricing(); preview();
    }));

    $('#pwAskingPrice')?.addEventListener('input', event => {
      formatPriceInput(event.target);
      if (isLegacyZeroSale) { isLegacyZeroSale = false; }
      syncPricing();
      preview();
    });
    $('#pwLeasePrice')?.addEventListener('input', event => {
      formatPriceInput(event.target);
      if (isLegacyZeroLease) { isLegacyZeroLease = false; }
      syncPricing();
      preview();
    });
    $('[data-sale-negotiable]')?.addEventListener('change', () => { preview(); queueAutosave(); });
    $('[data-lease-negotiable]')?.addEventListener('change', () => { preview(); queueAutosave(); });
    function syncUtilities() {
      for (const util of ['electricity', 'water', 'internet']) {
        const radio = form.querySelector(`[name="${util}"]:checked`);
        const isAvailable = radio?.value === 'available';
        const reveal = form.querySelector(`[data-utility-reveal="${util}"]`);
        if (reveal) {
          reveal.hidden = !isAvailable;
          reveal.querySelectorAll('input,select,textarea').forEach(control => {
            control.disabled = !isAvailable;
            if (!isAvailable && control.name) clearFieldError(control.name);
          });
        }
      }
    }
    function restoreUtilities(utils = {}, observations = {}) {
      for (const util of ['electricity','water','internet']) {
        const record = utils[util] && typeof utils[util] === 'object' ? utils[util] : {};
        const raw = record.status || record.connection_status || (typeof utils[util] === 'string' ? utils[util] : '') || observations[util] || 'not_verified';
        const status = ['available','connected'].includes(raw) ? 'available' : ['unavailable','not_connected'].includes(raw) ? 'unavailable' : 'not_verified';
        all(`[name="${util}"]`).forEach(radio => {radio.checked = radio.value === status;});
        const lists = util === 'internet' ? {internet_providers:'providers',internet_types:'connection_types'} : {[`${util}_sources`]:'sources'};
        for (const [name,key] of Object.entries(lists)) {
          const values = record[key] ?? utils[name] ?? [];
          all(`[name="${name}[]"]`).forEach(control => {control.checked = Array.isArray(values) && values.includes(control.value);});
        }
        const textFields = util === 'electricity' ? {electricity_primary_supply:'primary_supply',electricity_provider:'provider',electricity_backup:'backup_supply',electricity_capacity:'capacity'} : util === 'water' ? {water_source:'source',water_provider:'provider',water_capacity:'capacity_reliability'} : {internet_technology:'technology',download_speed_mbps:'download_speed_mbps'};
        for (const [name,key] of Object.entries(textFields)) {
          if (field(name)) field(name).value = record[key] ?? utils[name] ?? observations[name] ?? '';
        }
      }
      const rawQuality = String(utils.internet?.quality ?? utils.internet_quality ?? 'not_verified').toLowerCase().replace(/\s+/g,'_');
      const quality = ['strong','moderate','weak'].includes(rawQuality) ? rawQuality : 'not_verified';
      all('[name="internet_quality"]').forEach(radio => {radio.checked = radio.value === quality;});
      for (const [name,key] of Object.entries({drainage_service:'drainage',wastewater_service:'wastewater',waste_collection_service:'waste_collection'})) {
        if (field(name)) field(name).value = utils.additional_services?.[key] ?? utils[name] ?? observations[name] ?? '';
      }
      syncUtilities();
    }
    all('[data-utility-radio]').forEach(radio => radio.addEventListener('change', syncUtilities));
    let classificationCatalog = {categories: {}};
    try { classificationCatalog = JSON.parse($('[data-classification-catalog]')?.textContent || '{}'); } catch {}
    const subtypeCatalog = classificationCatalog.categories || {};
    const categoryTooltips = {
      'Land': 'Vacant or developable raw parcels, commercial lots, subdivisions and greenfield sites.',
      'Building': 'Constructed physical structures, commercial spaces, warehouses, office blocks and towers.'
    };

    function syncCategoryTooltip() {
      const catSelect = $('[data-property-category-select]');
      if (!catSelect) return;
      const cat = catSelect.value || 'Land';
      const tip = categoryTooltips[cat] || catSelect.selectedOptions?.[0]?.dataset?.tooltip || '';
      const tipText = $('[data-category-tip-text]');
      if (tipText) tipText.textContent = tip;
      const tipIcon = $('[data-category-tip-icon]');
      if (tipIcon) tipIcon.title = tip;
    }

    function syncSubtypeOptions(preset = null) {
      const catSelect = $('[data-property-category-select]');
      const subSelect = $('[data-property-subtype-select]');
      if (!catSelect || !subSelect) return;
      const cat = catSelect.value || 'Land';
      const options = subtypeCatalog[cat] || [];
      const current = preset !== null ? preset : subSelect.value;

      subSelect.innerHTML = `<option value="">Select ${cat.toLowerCase()} classification...</option>` +
        options.map(item => `<option value="${escape(item)}"${item === current ? ' selected' : ''}>${escape(item)}</option>`).join('');

      if (current && options.includes(current)) {
        subSelect.value = current;
      }
    }

    function getClassification() {
      return normalizeClassification(classificationCatalog, value('category'), value('subcategory'), value('additional_subcategories'));
    }
    function classificationChanged() { form.dispatchEvent(new CustomEvent('classificationchange')); }
    function setAdditionalSubcategories(values) {
      const state = normalizeClassification(classificationCatalog, value('category'), value('subcategory'), values);
      if (field('additional_subcategories')) field('additional_subcategories').value = state.additional.join(', ');
      classificationChanged();
    }
    function restoreClassification(category, primary, additional = []) {
      const state = normalizeClassification(classificationCatalog, category, primary, additional);
      if (field('category')) field('category').value = state.category;
      syncCategoryTooltip();
      syncSubtypeOptions(state.primary);
      if (field('additional_subcategories')) field('additional_subcategories').value = state.additional.join(', ');
      classificationChanged();
      return state;
    }
    function syncClassification() { return restoreClassification(value('category'), value('subcategory'), value('additional_subcategories')); }

    $('[data-property-category-select]')?.addEventListener('change', () => {
      syncCategoryTooltip();
      syncClassification();
      clearFieldError('subcategory');
      preview();
    });
    $('[data-property-subtype-select]')?.addEventListener('change', () => {
      setAdditionalSubcategories(value('additional_subcategories'));
      clearFieldError('subcategory');
      preview();
    });
    syncSubtypeOptions();
    syncCategoryTooltip();
    const authInput = $('[data-authority-file]');
    authInput?.addEventListener('change', () => {
      const file = authInput.files?.[0];
      const preview = $('[data-authority-preview]');
      const nameElem = $('[data-authority-staged-name]');
      if (file) {
        if (nameElem) nameElem.textContent = file.name;
        if (preview) preview.hidden = false;
      }
    });
    const config = window.SFC_APP_CONFIG || {};
    const emptyPhoto = $('[data-photo-preview]')?.innerHTML || '';
    let boundaryMap, radarMap, parcelLayer, locationMarker, radarMarker, radiusLayer, radarParcel;
    let concentricRings = [], hoverVectorLayer = null, radarLayerItems = new Map(), radarMapFilter = 'all', radarSearchQuery = '';
    let boundary = null, estimatedArea = 0, history = [], context = null, nearbyEditor = null, savedAttachments = [], propertyId = null;
    let hazardLayers = [], radarLayers = [], radarTab = 'competitors', step = 0;
    let placingReference = false, dirtyReference = false, imageObjectUrl = null, existingImage = '', locationMethod = 'pin';
    let locationCapture = null, searchTimer = null, searchRevision = 0, locationRevision = 0, deviceAccuracyLayer = null, deviceRequest = 0;
    let selectedPhotoFiles = [], existingPhotoMedia = [], coverPhoto = null, photoDisplayOrder = [];
    let controller, searchController, matchController, revision = 0, matchRevision = 0, draftKey = '', selectedMatches = [], lastAssessment = null;
    let autosaveTimer = null, submitted = false, draftGeneration = 0, mediaRevision = 0;
    let mediaDirty = false;
    const submittedGenerations = new Set();
    let radarState = 'idle', radarError = null, radarData = null, radarController = null, radarRevision = 0, radarDebounceTimer = null;
    let radarGroups = {competitors:[],related:[],complementary:[],unclassified:[],roads:[]};
    const point = (latName = 'lat', lngName = 'lng') => {
      const lat = value(latName), lng = value(lngName);
      return lat !== '' && lng !== '' && Number.isFinite(+lat) && Number.isFinite(+lng) && Math.abs(+lat) <= 90 && Math.abs(+lng) <= 180 ? [+lat,+lng] : null;
    };
    const parseCoordinates = (str) => {
      if (typeof str !== 'string') return null;
      const clean = str.trim().replace(/^\((.*)\)$|^\[(.*)\]$/, (_, round, square) => round ?? square).trim();
      if (!clean) return null;
      const decMatch = clean.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))[,;\s]+([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/);
      if (decMatch) {
        let lat = parseFloat(decMatch[1]);
        let lng = parseFloat(decMatch[2]);
        if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
          const tmp = lat; lat = lng; lng = tmp;
        }
        if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return { lat, lng };
        }
      }
      const dmsPattern = /([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*°?\s*(?:(\d+(?:\.\d+)?)\s*['′]\s*)?(?:(\d+(?:\.\d+)?)\s*["″]\s*)?([NSEW])/gi;
      const matches = [...clean.matchAll(dmsPattern)];
      if (matches.length === 2 && clean.replace(dmsPattern, '').replace(/[,;\s]/g, '') === '') {
        let lat = null, lng = null;
        for (const m of matches) {
          const deg = Number(m[1]);
          const min = Number(m[2] || 0);
          const sec = Number(m[3] || 0);
          const dir = m[4].toUpperCase();
          if (min >= 60 || sec >= 60 || (m[3] && !m[2]) || (deg < 0 && (dir === 'N' || dir === 'E'))) return null;
          const val = (Math.abs(deg) + min / 60 + sec / 3600) * (dir === 'S' || dir === 'W' ? -1 : 1);
          if (dir === 'N' || dir === 'S') { if (lat !== null) return null; lat = val; }
          else { if (lng !== null) return null; lng = val; }
        }
        if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return { lat, lng };
        }
      }
      return null;
    };
    const coordinateLabel = p => `${Math.abs(p[0]).toFixed(6)}° ${p[0] < 0 ? 'S' : 'N'}, ${Math.abs(p[1]).toFixed(6)}° ${p[1] < 0 ? 'W' : 'E'}`;
    function updateCoordinateDetailsSummary() {
      const p = point();
      const textEl = $('[data-coordinate-summary-text]') || $('.pw-coordinate-details summary span');
      if (textEl) {
        textEl.textContent = p ? coordinateLabel(p) : 'Enter property coordinates';
      }
      const accuracy = $('[data-location-precision]');
      if (accuracy) {
        accuracy.textContent = !p ? 'No property pin yet. Search an area, then click the property on the map or enter its coordinates.' : locationCapture?.kind === 'device' ? `Device location · estimated accuracy ±${Math.round(locationCapture.accuracy)} m. Check the pin against the property and adjust if needed.` : 'Property pin provided. Check its position against your survey or property records.';
        accuracy.parentElement.classList.toggle('is-confirmed', Boolean(p));
      }
      const recenter = $('[data-recenter-location]'); if (recenter) recenter.disabled = !p;
      const clear = $('[data-clear-location]'); if (clear) clear.disabled = value('lat') === '' && value('lng') === '';
    }
    const notify = (text, isError = false) => {
      const target = $('[data-editor-message]');
      if (!target) return;
      target.textContent = text;
      target.classList.toggle('is-error', Boolean(isError));
      target.setAttribute('role', isError ? 'alert' : 'status');
      if (isError) requestAnimationFrame(() => { if (dialog.open) target.scrollIntoView({block:'nearest'}); });
    };
    function clearFieldError(name) {
      const control = field(name);
      if (!control?.setAttribute) return;
      control.removeAttribute('aria-invalid');
      const message = all('[data-field-error]').find(node => node.dataset.fieldError === name);
      if (message) { message.textContent = ''; message.hidden = true; }
      const summary = $('[data-editor-message]');
      if (summary?.classList.contains('is-error') && !all('[data-field-error]').some(node=>!node.hidden && node.textContent)) notify('');
    }
    function showFieldError(control, message) {
      if (!control?.setAttribute) return;
      control.setAttribute('aria-invalid','true');
      let error = all('[data-field-error]').find(node => node.dataset.fieldError === control.name);
      if (!error) {
        error = document.createElement('small');
        error.className = 'pw-field-error';
        error.dataset.fieldError = control.name;
        error.id = `pw-error-${control.name.replace(/[^a-z0-9]/gi,'-')}`;
        const container = control.closest('.pw-field, .pw-coordinate-input, .pw-coordinate-fields') || control.parentElement;
        container.append(error);
        control.setAttribute('aria-describedby', [control.getAttribute('aria-describedby'),error.id].filter(Boolean).join(' '));
      }
      error.hidden = false; error.textContent = message;
    }
    function focusIssue(control) {
      requestAnimationFrame(() => {
        if (!dialog.open || !control) return;
        const editorPanel = control.closest('[data-editor-panel]');
        if (editorPanel && editorPanel.dataset.editorPanel !== String(step)) {
          all('[data-editor-step]').find(node => node.dataset.editorStep === editorPanel.dataset.editorPanel)?.click();
        }
        for (let parent = control.parentElement; parent && parent !== form; parent = parent.parentElement) {
          if (parent.tagName === 'DETAILS') parent.open = true;
        }
        const evidencePanel = control.closest('[data-evidence-panel]');
        if (evidencePanel) selectEvidenceCriterion(evidencePanel.dataset.evidencePanel);
        const utilityPanel = control.closest('[data-util-pane]');
        if (utilityPanel) tabs('data-util-tab','data-util-pane',utilityPanel.dataset.utilPane);
        control.focus({preventScroll:true});
        control.scrollIntoView({behavior:'smooth', block:'center'});
        control.classList.add('pw-field-error-glow');
        setTimeout(() => control.classList.remove('pw-field-error-glow'), 4000);
      });
    }
    function validateBasics() {
      syncPricing();
      const classification = getClassification();
      if (!classification.primary) {
        const message = `Choose a primary ${classification.category.toLowerCase()} classification.`;
        showFieldError(field('subcategory'),message); notify(message,true); focusIssue(field('subcategory')); return false;
      }
      const bgyVal = value('barangay');
      const bgyMatch = typeof findExactOfficialBarangay === 'function' ? findExactOfficialBarangay(bgyVal) : (typeof lookupExactBarangay === 'function' ? lookupExactBarangay(bgyVal) : null);
      if (!bgyVal || !bgyMatch) {
        const bgyInput = $('#pwBarangayTextInput');
        const message = 'Select a valid barangay within San Fernando City.';
        showFieldError(bgyInput || field('barangay'), message);
        notify(message, true);
        focusIssue(bgyInput || field('barangay'));
        return false;
      }
      const invalid = all('[data-editor-panel="0"] input, [data-editor-panel="0"] select, [data-editor-panel="0"] textarea').find(control => !control.disabled && !control.checkValidity());
      if (invalid) { showFieldError(invalid,invalid.validationMessage); notify('Check the highlighted field to continue.',true); focusIssue(invalid); return false; }
      return true;
    }
    function showSubmissionError(error) {
      const text = error?.message || 'The property could not be saved. Your changes are still here. Try again.';
      const mappings = [
        [/subcategory|classification|category/i, 'subcategory', 0],
        [/lease.*price|rental.*price/i, 'lease_price', 0],
        [/price|asking/i, 'price', 0],
        [/property.*name|name.*required/i, 'property_name', 0],
        [/latitude|longitude|coordinate|location/i, 'lat', 1],
        [/land.*area|survey.*area|area.*positive|boundary|polygon/i, 'land_area', 1],
        [/email/i, 'owner_email', 0],
        [/authority.*sell|proof.*authority/i, 'authority_to_sell_file', 0],
        [/offered.*area|leasable.*area|saleable.*area/i, 'offered_area_sqm', 2],
        [/security.*deposit/i, 'security_deposit_months', 2],
        [/advance.*rent/i, 'advance_rent_months', 2],
        [/additional.*purchase|closing.*cost/i, 'additional_purchase_costs', 2],
        [/comparable.*lease|lease.*benchmark|rental.*price.*per.*m/i, 'comparable_lease_price', 2],
        [/comparable.*market|market.*price.*per.*m/i, 'comparable_market_price', 2],
        [/lgu.*valuation|valuation.*amount|lgu.*amount/i, 'lgu_valuation_amount', 2],
        [/bir.*zonal|zonal.*value/i, 'bir_zonal_value', 2],
        [/carriageway|road.*width/i, 'carriageway_width', 2],
        [/distance.*road/i, 'distance_to_major_road', 2],
        [/download.*speed|internet.*speed/i, 'download_speed_mbps', 2],
        [/zoning|clup/i, 'zoning_classification', 2],
        [/hazard|flood|fault|landslide|liquefaction|storm.*surge|tsunami/i, 'hazard_evidence_source', 2],
        [/cover photo|property photo|retained photo|uploaded.*image/i, 'image_files[]', 0],
        [/evidence.*file|attachment/i, 'evidence_files[]', 2],
      ];
      const matched = mappings.find(([pattern]) => pattern.test(text));
      notify(text,true);
      if (!matched) return null;
      const [,name,targetStep] = matched;
      const control = field(name) || (name === 'carriageway_width' ? field('carriageway_width_m') : null);
      if (control) {
        showFieldError(control,text); focusIssue(control);
      }
      return {step:targetStep,field:name};
    }
    form.addEventListener('invalid', event => { showFieldError(event.target,event.target.validationMessage); }, true);
    for (const eventName of ['input','change']) form.addEventListener(eventName,event => { if(event.target.name)clearFieldError(event.target.name); });
    async function get(endpoint, signal) {
      const response = await fetch(`${apiBase}/${endpoint}`, {credentials:'same-origin',headers:{Accept:'application/json'},signal});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'This information is unavailable.');
      return payload;
    }
    const enteredAreaSqm = () => {
      const entered = Number(value('land_area'));
      const unit = value('land_area_unit');
      let factor = 1;
      if (unit === 'hectares') factor = 10000;
      else if (unit === 'sqft') factor = 0.09290304;
      else if (unit === 'acres') factor = 4046.8564224;
      else if (unit === 'sqkm') factor = 1000000;
      const sqm = entered * factor;
      return Number.isFinite(sqm) && sqm > 0 ? sqm : null;
    };
    function syncAreaLimits() {
      const control = field('land_area'); if (!control) return;
      const unit = value('land_area_unit');
      if (unit === 'hectares') {
        control.min = '0.00005';
        control.max = '99999999.9999';
      } else if (unit === 'sqkm') {
        control.min = '0.0000005';
        control.max = '999999.999999';
      } else if (unit === 'acres') {
        control.min = '0.0001';
        control.max = '99999999.9999';
      } else if (unit === 'sqft') {
        control.min = '5';
        control.max = '9999999999999';
      } else {
        control.min = '0.5';
        control.max = '999999999999';
      }
    }
    let currentAreaUnit = value('land_area_unit') || 'sqm';
    function getAreaUnitFactor(u) {
      if (u === 'hectares') return 10000;
      if (u === 'sqft') return 0.09290304;
      if (u === 'acres') return 4046.8564224;
      if (u === 'sqkm') return 1000000;
      return 1;
    }
    function formatSensibleAreaNumber(num) {
      if (!Number.isFinite(num) || num <= 0) return '';
      return Number(num.toFixed(6)).toString();
    }
    field('land_area_unit')?.addEventListener('change', () => {
      const newUnit = value('land_area_unit');
      const inputEl = field('land_area');
      const currentVal = Number(inputEl?.value);
      if (Number.isFinite(currentVal) && currentVal > 0) {
        const currentSqm = currentVal * getAreaUnitFactor(currentAreaUnit);
        const newVal = currentSqm / getAreaUnitFactor(newUnit);
        if (inputEl) inputEl.value = formatSensibleAreaNumber(newVal);
      }
      currentAreaUnit = newUnit;
      syncAreaLimits();
      syncAreaEquivalents();
      preview();
      ready();
    });
    field('land_area')?.addEventListener('input', () => {
      syncAreaEquivalents();
      preview();
      ready();
    });
    function syncAreaEquivalents() {
      if (typeof syncEconomicViability === "function") syncEconomicViability();
      const sqm = enteredAreaSqm();
      const equivDisplay = $('[data-area-equiv-display]');
      if (equivDisplay) {
        if (sqm && sqm > 0) {
          const ha = sqm / 10000;
          const sqft = sqm / 0.09290304;
          const acres = sqm / 4046.8564224;
          const haFormatted = ha >= 1 ? ha.toLocaleString('en-PH', { maximumFractionDigits: 3 }) : ha.toLocaleString('en-PH', { maximumFractionDigits: 4 });
          const sqmFormatted = sqm.toLocaleString('en-PH', { maximumFractionDigits: 2 });
          equivDisplay.textContent = `${sqmFormatted} m² = ${haFormatted} ha (${Math.round(sqft).toLocaleString('en-PH')} sq ft · ${acres.toFixed(2)} ac)`;
        } else {
          equivDisplay.textContent = '5,900 m² = 0.59 ha';
        }
      }

      // Check discrepancy between recorded measurement and map boundary estimate
      const discrepancyCard = $('[data-area-discrepancy-card]');
      const headline = $('[data-discrepancy-headline]');
      const message = $('[data-discrepancy-message]');
      const revDiscrepancy = $('[data-review-area-discrepancy]');
      const revDiscrepancyMsg = $('[data-review-discrepancy-message]');
      const revChecksClean = $('[data-review-checks-clean]');

      if (sqm && estimatedArea > 0) {
        const diff = Math.abs(sqm - estimatedArea);
        const pct = (diff / Math.max(sqm, estimatedArea)) * 100;
        if (pct > 10) {
          if (discrepancyCard && headline && message) {
            discrepancyCard.hidden = false;
            discrepancyCard.className = 'pw-discrepancy-banner pw-discrepancy-warning';
            headline.textContent = `Area Discrepancy Flagged (${Math.round(pct)}% difference)`;
            message.textContent = `Recorded measurement (${sqm.toLocaleString('en-PH', {maximumFractionDigits: 1})} m²) differs significantly from the map boundary estimate (${Math.round(estimatedArea).toLocaleString('en-PH')} m²). Please verify the drawn boundary or survey records.`;
          }
          if (revDiscrepancy) {
            revDiscrepancy.hidden = false;
            if (revDiscrepancyMsg) {
              revDiscrepancyMsg.textContent = `Declared measurement (${sqm.toLocaleString('en-PH', {maximumFractionDigits: 1})} m²) differs from drawn boundary estimate (${Math.round(estimatedArea).toLocaleString('en-PH')} m²) by ${Math.round(pct)}%. Review boundary or survey measurement to ensure accurate valuation.`;
            }
          }
          if (revChecksClean) revChecksClean.hidden = true;
        } else {
          if (discrepancyCard && headline && message) {
            discrepancyCard.hidden = false;
            discrepancyCard.className = 'pw-discrepancy-banner pw-discrepancy-match';
            headline.textContent = `Area Aligned (within ${Math.round(pct)}%)`;
            message.textContent = `Recorded measurement (${sqm.toLocaleString('en-PH', {maximumFractionDigits: 1})} m²) and drawn boundary estimate (${Math.round(estimatedArea).toLocaleString('en-PH')} m²) are consistent.`;
          }
          if (revDiscrepancy) revDiscrepancy.hidden = true;
          if (revChecksClean) revChecksClean.hidden = false;
        }
      } else {
        if (discrepancyCard) discrepancyCard.hidden = true;
        if (revDiscrepancy) revDiscrepancy.hidden = true;
        if (revChecksClean) revChecksClean.hidden = false;
      }

      // Suspicious recorded area reconciliation check (0.5 m²)
      const suspiciousAreaCard = $('[data-suspicious-area-banner]');
      if (suspiciousAreaCard) {
        const aVal = Number(value('land_area'));
        const uVal = value('land_area_unit') || 'sqm';
        const isSuspicious = (uVal === 'sqm' && aVal > 0 && aVal <= 0.5) || (uVal === 'ha' && aVal > 0 && aVal <= 0.00005);
        suspiciousAreaCard.hidden = !isSuspicious;
      }
    }
    function haversineDistanceKm(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }
    function syncBarangayContext() {
      const bgy = value('barangay')?.trim() || '';
      const display = $('[data-reused-barangay-display]');
      if (display) {
        display.textContent = bgy || 'Not set';
      }
      syncBarangayConflict();
    }
    function syncBarangayConflict() {
      const alertBox = $('[data-bgy-conflict-alert]');
      const alertText = $('[data-bgy-conflict-text]');
      const revBgyAlert = $('[data-review-bgy-conflict]');
      const revBgyText = $('[data-review-bgy-conflict-text]');
      if (!alertBox || !alertText) return;

      const bgyName = value('barangay')?.trim();
      const pt = point();
      if (!bgyName || !pt) {
        alertBox.hidden = true;
        if (revBgyAlert) revBgyAlert.hidden = true;
        return;
      }

      const list = getAllOfficialBarangays();
      const selectedBgy = findExactOfficialBarangay(bgyName);
      if (!selectedBgy || !selectedBgy.lat || !selectedBgy.lng) {
        alertBox.hidden = true;
        if (revBgyAlert) revBgyAlert.hidden = true;
        return;
      }

      const distToSelected = haversineDistanceKm(pt[0], pt[1], Number(selectedBgy.lat), Number(selectedBgy.lng));

      let closestBgy = null, minDist = Infinity;
      for (const b of list) {
        if (b.lat && b.lng) {
          const d = haversineDistanceKm(pt[0], pt[1], Number(b.lat), Number(b.lng));
          if (d < minDist) {
            minDist = d;
            closestBgy = b;
          }
        }
      }

      if (closestBgy && closestBgy.name !== selectedBgy.name && distToSelected > 2.5 && minDist < 1.5) {
        const msg = `Location conflict: Pin is ~${minDist.toFixed(1)} km from ${closestBgy.name}, but Step 1 has "${selectedBgy.name}" selected (~${distToSelected.toFixed(1)} km away). Please verify the location.`;
        alertBox.hidden = false;
        alertText.textContent = msg;
        if (revBgyAlert) {
          revBgyAlert.hidden = false;
          if (revBgyText) revBgyText.textContent = msg;
        }

        // Wire 1-click reconcile button in both Step 2 and Review
        all('[data-bgy-reconcile-btn]').forEach(btn => {
          btn.onclick = (e) => {
            e.preventDefault();
            selectBarangayOption(closestBgy.name, false);
            syncBarangayContext();
            preview();
          };
        });
      } else {
        alertBox.hidden = true;
        if (revBgyAlert) revBgyAlert.hidden = true;
      }
    }
    function evaluateSpatialAccessibilityClient(overrides) {
      const getVal = (name) => {
        if (overrides && Object.prototype.hasOwnProperty.call(overrides, name)) {
          return overrides[name] != null ? String(overrides[name]) : '';
        }
        return (typeof value === 'function' ? value(name) : '') || '';
      };

      // 1. Road Access (30%)
      const accessVal = (getVal('road_access') || '').trim();
      let accessScore = null;
      let accessLabel = 'Incomplete';
      if (accessVal === 'frontage') { accessScore = 100; accessLabel = '100/100'; }
      else if (accessVal === 'right_of_way') { accessScore = 80; accessLabel = '80/100'; }
      else if (accessVal === 'no_access') { accessScore = 0; accessLabel = '0/100'; }

      // 2. Road Surface & Passability (25%)
      const surfaceVal = (getVal('road_surface_passability') || '').trim();
      let surfaceScore = null;
      let surfaceLabel = 'Incomplete';
      if (surfaceVal === 'paved') { surfaceScore = 100; surfaceLabel = '100/100'; }
      else if (surfaceVal === 'gravel') { surfaceScore = 75; surfaceLabel = '75/100'; }
      else if (surfaceVal === 'unpaved') { surfaceScore = 40; surfaceLabel = '40/100'; }
      else if (surfaceVal === 'impassable') { surfaceScore = 0; surfaceLabel = '0/100'; }

      // 3. Usable Carriageway Width (25%)
      const widthRaw = (getVal('carriageway_width') || '').trim();
      let widthScore = null;
      let widthLabel = 'Incomplete';
      if (widthRaw !== '' && !isNaN(Number(widthRaw))) {
        const w = Number(widthRaw);
        if (w >= 6.0) { widthScore = 100; widthLabel = '100/100'; }
        else if (w >= 4.0) { widthScore = 80; widthLabel = '80/100'; }
        else if (w >= 2.0) { widthScore = 50; widthLabel = '50/100'; }
        else if (w > 0.0) { widthScore = 20; widthLabel = '20/100'; }
      }

      // 4. Major Road Proximity (20%)
      const distRaw = (getVal('distance_to_major_road') || '').trim();
      let distScore = null;
      let distLabel = 'Incomplete';
      if (distRaw !== '' && !isNaN(Number(distRaw))) {
        const d = Number(distRaw);
        if (d <= 200.0) { distScore = 100; distLabel = '100/100'; }
        else if (d <= 500.0) { distScore = 85; distLabel = '85/100'; }
        else if (d <= 1000.0) { distScore = 65; distLabel = '65/100'; }
        else if (d > 1000.0) { distScore = 40; distLabel = '40/100'; }
      }

      const isComplete = accessScore !== null && surfaceScore !== null && widthScore !== null && distScore !== null;
      const totalScore = isComplete
        ? Math.round(((accessScore * 0.30) + (surfaceScore * 0.25) + (widthScore * 0.25) + (distScore * 0.20)) * 10) / 10
        : null;
      const iaiContribution = isComplete ? Math.round((totalScore * 0.20) * 100) / 100 : null;

      return {
        access: { score: accessScore, label: accessLabel, weighted: accessScore !== null ? accessScore * 0.30 : null },
        surface: { score: surfaceScore, label: surfaceLabel, weighted: surfaceScore !== null ? surfaceScore * 0.25 : null },
        width: { score: widthScore, label: widthLabel, weighted: widthScore !== null ? widthScore * 0.25 : null },
        distance: { score: distScore, label: distLabel, weighted: distScore !== null ? distScore * 0.20 : null },
        subcriteria: {
          road_access: { score: accessScore, label: accessLabel, weighted: accessScore !== null ? accessScore * 0.30 : null },
          road_surface_passability: { score: surfaceScore, label: surfaceLabel, weighted: surfaceScore !== null ? surfaceScore * 0.25 : null },
          carriageway_width: { score: widthScore, label: widthLabel, weighted: widthScore !== null ? widthScore * 0.25 : null },
          distance_to_major_road: { score: distScore, label: distLabel, weighted: distScore !== null ? distScore * 0.20 : null },
        },
        isComplete,
        is_complete: isComplete,
        totalScore,
        score: totalScore,
        iaiContribution,
        iai_contribution: iaiContribution,
      };
    }
    function syncSpatialAccessibility() {
      // 1. Reused Location Context Banner
      const pt = point();
      const bgy = value('barangay')?.trim() || 'Not set';
      const area = value('land_area')?.trim() || '';
      const unit = value('land_area_unit') || 'sqm';
      const unitLabels = { sqm: 'm²', hectares: 'ha', sqft: 'sq ft', acres: 'ac', sqkm: 'km²' };

      const coordsEl = $('[data-reused-coords]');
      if (coordsEl) {
        coordsEl.textContent = pt ? `${pt[0].toFixed(4)}° N, ${pt[1].toFixed(4)}° E` : 'Not pinned';
      }
      const bgyEl = $('[data-reused-barangay]');
      if (bgyEl) {
        bgyEl.textContent = bgy || 'San Fernando';
      }
      const areaEl = $('[data-reused-area]');
      if (areaEl) {
        areaEl.textContent = area ? `${Number(area).toLocaleString('en-PH')} ${unitLabels[unit] || 'm²'}` : 'Not recorded';
      }

      // 2. Evaluate subcriteria
      const res = evaluateSpatialAccessibilityClient();

      // Update Subcriteria Score Badges
      const accessBadge = $('[data-spatial-sub-score="road_access"]');
      if (accessBadge) {
        accessBadge.textContent = res.access.label;
        accessBadge.className = `pw-sub-score ${res.access.score !== null ? 'is-complete' : 'is-incomplete'}`;
      }
      const surfaceBadge = $('[data-spatial-sub-score="road_surface_passability"]');
      if (surfaceBadge) {
        surfaceBadge.textContent = res.surface.label;
        surfaceBadge.className = `pw-sub-score ${res.surface.score !== null ? 'is-complete' : 'is-incomplete'}`;
      }
      const widthBadge = $('[data-spatial-sub-score="carriageway_width"]');
      if (widthBadge) {
        widthBadge.textContent = res.width.label;
        widthBadge.className = `pw-sub-score ${res.width.score !== null ? 'is-complete' : 'is-incomplete'}`;
      }
      const distBadge = $('[data-spatial-sub-score="distance_to_major_road"]');
      if (distBadge) {
        distBadge.textContent = res.distance.label;
        distBadge.className = `pw-sub-score ${res.distance.score !== null ? 'is-complete' : 'is-incomplete'}`;
      }

      // 3. Update Preview Card State
      const incompleteBox = $('[data-spatial-state-incomplete]');
      const completeBox = $('[data-spatial-state-complete]');
      if (incompleteBox && completeBox) {
        if (!res.isComplete) {
          incompleteBox.hidden = false;
          completeBox.hidden = true;
        } else {
          incompleteBox.hidden = true;
          completeBox.hidden = false;
          setText('[data-spatial-total-score]', res.totalScore.toFixed(1));
          setText('[data-spatial-iai-contrib]', res.iaiContribution.toFixed(1));
          setText('[data-spatial-p-access]', `${res.access.weighted.toFixed(1)} pts`);
          setText('[data-spatial-p-surface]', `${res.surface.weighted.toFixed(1)} pts`);
          setText('[data-spatial-p-width]', `${res.width.weighted.toFixed(1)} pts`);
          setText('[data-spatial-p-dist]', `${res.distance.weighted.toFixed(1)} pts`);
        }
      }

      // 4. Unmapped road badge
      const unmappedBadge = $('[data-spatial-road-unmapped-badge]');
      if (unmappedBadge) {
        const hasWidth = res.width.score !== null;
        const hasSurface = res.surface.score !== null;
        unmappedBadge.hidden = Boolean(hasWidth && hasSurface);
      }
    }

    ['road_access', 'road_surface_passability', 'carriageway_width', 'carriageway_width_m', 'distance_to_major_road'].forEach(name => {
      const el = field(name);
      if (!el) return;
      el.addEventListener('input', () => { syncSpatialAccessibility(); preview(); ready(); });
      el.addEventListener('change', () => { syncSpatialAccessibility(); preview(); ready(); });
    });

    $('[data-spatial-reset-example]')?.addEventListener('click', () => {
      if (field('road_access')) field('road_access').value = 'frontage';
      if (field('road_surface_passability')) field('road_surface_passability').value = 'paved';
      if (field('carriageway_width')) field('carriageway_width').value = '';
      if (field('distance_to_major_road')) field('distance_to_major_road').value = '250';
      syncSpatialAccessibility();
      notify('Example conditions reset. Enter carriageway width to see the live calculated score.');
    });

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
          subcriterion: 'Emissions & Acoustics',
          note: 'Generator exhaust emissions and acoustic footprint are evaluated under environmental review.'
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
        elecBadge.textContent = res.electricity.score !== null ? `${res.electricity.weighted.toFixed(2)} pts` : 'Incomplete';
        elecBadge.className = `pw-sub-score ${res.electricity.score !== null ? 'is-complete' : 'is-incomplete'}`;
      }
      const waterBadge = $('[data-infra-sub-score="water"]');
      if (waterBadge) {
        waterBadge.textContent = res.water.score !== null ? `${res.water.weighted.toFixed(2)} pts` : 'Incomplete';
        waterBadge.className = `pw-sub-score ${res.water.score !== null ? 'is-complete' : 'is-incomplete'}`;
      }
      const netBadge = $('[data-infra-sub-score="internet"]');
      if (netBadge) {
        netBadge.textContent = res.internet.score !== null ? `${res.internet.weighted.toFixed(2)} pts` : 'Incomplete';
        netBadge.className = `pw-sub-score ${res.internet.score !== null ? 'is-complete' : 'is-incomplete'}`;
      }
      const drainBadge = $('[data-infra-sub-score="drainage"]');
      if (drainBadge) {
        drainBadge.textContent = res.drainage.score !== null ? `${res.drainage.weighted.toFixed(2)} pts` : 'Incomplete';
        drainBadge.className = `pw-sub-score ${res.drainage.score !== null ? 'is-complete' : 'is-incomplete'}`;
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
            pBar.style.width = `${Math.min(100, Math.max(0, res.totalScore))}%`;
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
    });

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

      // Section 1: Space Offered Scope & Relevant Area
      const rawOfferedScope = (getVal('offered_space_scope') || '').trim();
      const rawOfferedArea = (getVal('offered_area_sqm') || '').replace(/,/g, '').trim();
      const hasOfferedArea = rawOfferedArea !== '' && !isNaN(Number(rawOfferedArea)) && Number(rawOfferedArea) > 0;
      const offeredArea = hasOfferedArea ? Number(rawOfferedArea) : null;

      let offeredScope = 'entire_land';
      let effectiveArea = landArea;

      if (rawOfferedScope === 'entire_land') {
        offeredScope = 'entire_land';
        effectiveArea = landArea;
      } else if (rawOfferedScope === 'entire_building' || rawOfferedScope === 'part_property') {
        offeredScope = rawOfferedScope;
        effectiveArea = (offeredArea !== null && offeredArea > 0) ? offeredArea : null;
      } else if (offeredArea !== null && offeredArea > 0) {
        offeredScope = 'part_property';
        effectiveArea = offeredArea;
      } else {
        offeredScope = 'entire_land';
        effectiveArea = landArea;
      }

      // Section 2: Additional Costs & Terms
      const rawDeposit = (getVal('security_deposit_months') || '').trim();
      const depositMonths = rawDeposit !== '' && !isNaN(Number(rawDeposit)) && Number(rawDeposit) >= 0 ? Number(rawDeposit) : 0;

      const rawAdvance = (getVal('advance_rent_months') || '').trim();
      const advanceMonths = rawAdvance !== '' && !isNaN(Number(rawAdvance)) && Number(rawAdvance) >= 0 ? Number(rawAdvance) : 0;

      const utilitiesIncluded = (getVal('utilities_included') || '').trim() === 'included';

      const rawAddCosts = (getVal('additional_purchase_costs') || '').replace(/,/g, '').trim();
      const additionalCosts = rawAddCosts !== '' && !isNaN(Number(rawAddCosts)) && Number(rawAddCosts) >= 0 ? Number(rawAddCosts) : 0;

      let knownUpfrontCosts = 0;
      if (purpose === 'lease') {
        if (leasePrice !== null && (depositMonths > 0 || advanceMonths > 0)) {
          knownUpfrontCosts = Math.round((depositMonths + advanceMonths) * leasePrice);
        }
      } else if (purpose === 'sale') {
        if (additionalCosts > 0) {
          knownUpfrontCosts = Math.round(additionalCosts);
        }
      } else if (purpose === 'sale_or_lease') {
        let leaseUpfront = 0;
        if (leasePrice !== null && (depositMonths > 0 || advanceMonths > 0)) {
          leaseUpfront = Math.round((depositMonths + advanceMonths) * leasePrice);
        }
        knownUpfrontCosts = leaseUpfront + (additionalCosts > 0 ? Math.round(additionalCosts) : 0);
      }

      // Section 3: Official References and Verified Comparables
      const rawBir = (getVal('bir_zonal_value') || '').trim();
      const birZonal = rawBir !== '' && !isNaN(Number(rawBir)) && Number(rawBir) > 0 ? Number(rawBir) : null;

      const rawComp = (getVal('comparable_market_price') || '').trim();
      const compMarket = rawComp !== '' && !isNaN(Number(rawComp)) && Number(rawComp) > 0 ? Number(rawComp) : null;

      const rawCompLease = (getVal('comparable_lease_price') || '').trim();
      const compLease = rawCompLease !== '' && !isNaN(Number(rawCompLease)) && Number(rawCompLease) > 0 ? Number(rawCompLease) : null;

      const compSource = (getVal('comparable_source') || '').trim();

      const lguType = getVal('lgu_valuation_type') || '';
      const rawLguAmt = (getVal('lgu_valuation_amount') || '').trim();
      const lguAmount = rawLguAmt !== '' && !isNaN(Number(rawLguAmt)) && Number(rawLguAmt) > 0 ? Number(rawLguAmt) : null;

      // Calculations:
      // For Sale: asking price per m² (using effective area)
      const askingPricePerSqm = (askingPrice !== null && effectiveArea !== null && effectiveArea > 0 && saleMode === 'amount')
        ? Math.round(askingPrice / effectiveArea)
        : null;

      // For Lease: monthly rent per m² (using actual leasable area, not automatically total land area)
      const leasePricePerSqm = (leasePrice !== null && effectiveArea !== null && effectiveArea > 0 && leaseMode === 'amount')
        ? Math.round((leasePrice / effectiveArea) * 100) / 100
        : null;

      // Total BIR reference: statutory conveyance baseline (always computed against land area)
      const totalBir = (birZonal !== null && landArea !== null)
        ? Math.round(birZonal * landArea)
        : null;

      // Do not compare monthly rent directly with BIR zonal values as though they were the same economic measurement
      const birDiffPct = (purpose !== 'lease' && askingPricePerSqm !== null && birZonal !== null && birZonal > 0)
        ? Math.round(((askingPricePerSqm - birZonal) / birZonal) * 1000) / 10
        : null;

      const marketDiffPct = (askingPricePerSqm !== null && compMarket !== null && compMarket > 0)
        ? Math.round(((askingPricePerSqm - compMarket) / compMarket) * 10000) / 100
        : null;

      const leaseDiffPct = (leasePricePerSqm !== null && compLease !== null && compLease > 0)
        ? Math.round(((leasePricePerSqm - compLease) / compLease) * 10000) / 100
        : null;

      // Active comparable metric resolution
      let activeBenchmark = null;
      let activeBenchmarkType = null;
      let activeDiffPct = null;
      let compRatio = null;
      let compTier = null;

      if (purpose === 'lease') {
        if (compLease !== null) {
          activeBenchmark = compLease;
          activeBenchmarkType = 'lease';
          activeDiffPct = leaseDiffPct;
          if (leasePricePerSqm !== null && compLease > 0) {
            compRatio = Math.round((leasePricePerSqm / compLease) * 10000) / 10000;
          }
        }
      } else {
        if (compMarket !== null) {
          activeBenchmark = compMarket;
          activeBenchmarkType = 'market';
          activeDiffPct = marketDiffPct;
          if (askingPricePerSqm !== null && compMarket > 0) {
            compRatio = Math.round((askingPricePerSqm / compMarket) * 10000) / 10000;
          }
        } else if (purpose === 'sale_or_lease' && compLease !== null) {
          activeBenchmark = compLease;
          activeBenchmarkType = 'lease';
          activeDiffPct = leaseDiffPct;
          if (leasePricePerSqm !== null && compLease > 0) {
            compRatio = Math.round((leasePricePerSqm / compLease) * 10000) / 10000;
          }
        }
      }

      if (activeDiffPct !== null) {
        if (activeDiffPct >= -5.0 && activeDiffPct <= 5.0) {
          compTier = 'Highly Competitive (aligned within ±5%)';
        } else if (activeDiffPct > 5.0 && activeDiffPct <= 15.0) {
          compTier = 'Moderate Premium (+5% to +15%)';
        } else if (activeDiffPct > 15.0 && activeDiffPct <= 30.0) {
          compTier = 'Substantial Premium (+15% to +30%)';
        } else if (activeDiffPct > 30.0) {
          compTier = 'Elevated Asking Rate (>+30%)';
        } else {
          compTier = 'Discounted Rate (review recommended)';
        }
      }

      // Area discrepancy check (>25% difference between recorded land area and drawn boundary)
      const isDiscrepancy = (landArea !== null && estimatedArea > 0) &&
        ((Math.abs(landArea - estimatedArea) / Math.max(landArea, estimatedArea)) * 100 > 25);

      // Area validity & reasonableness check
      let isReasonablenessWarning = false;
      let reasonablenessMessage = '';
      const fmtNum = (n) => typeof number === 'function' ? number(n) : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (landArea !== null && (landArea <= 0 || landArea < 0.5)) {
        isReasonablenessWarning = true;
        reasonablenessMessage = `Recorded property area is unusually small (${landArea} m²). Please verify the entered land area.`;
      } else if (offeredScope !== 'entire_land' && offeredArea !== null && (offeredArea <= 0 || offeredArea < 0.5)) {
        isReasonablenessWarning = true;
        reasonablenessMessage = `Offered space area (${offeredArea} m²) is unusually small. Please verify the entered floor/leasable area.`;
      } else if (offeredScope === 'part_property' && landArea !== null && offeredArea !== null && offeredArea > landArea) {
        isReasonablenessWarning = true;
        reasonablenessMessage = `Leasable floor unit area (${fmtNum(offeredArea)} m²) exceeds total recorded land area (${fmtNum(landArea)} m²). If the building has multiple floors, select 'Entire Building' or adjust leasable space.`;
      } else if ((rawPrice !== '' && !isNaN(Number(rawPrice)) && Number(rawPrice) <= 0) || (rawLease !== '' && !isNaN(Number(rawLease)) && Number(rawLease) <= 0)) {
        isReasonablenessWarning = true;
        reasonablenessMessage = 'Property pricing cannot be zero or negative. Please enter a valid asking amount.';
      } else if (landArea !== null && ((purpose === 'lease' && leasePrice !== null && leasePrice < 1000 && landArea < 5) || (purpose === 'sale' && askingPrice !== null && askingPrice < 10000 && landArea < 5))) {
        isReasonablenessWarning = true;
        reasonablenessMessage = `Unusually low pricing detected relative to recorded area (${landArea} m²). Please verify the entered pricing.`;
      }

      // Methodological score evaluation:
      // Without verified comparable market/lease benchmark or if area discrepancy/unreasonable inputs present, assessment is Incomplete
      let isComplete = false;
      let totalScore = null;
      let iaiContribution = null;
      let statusLabel = 'Assessment Incomplete';
      let statusNote = isReasonablenessWarning
        ? 'Reasonableness Verification Needed · Property area or pricing requires confirmation.'
        : 'Methodological Baseline · Awaiting Verified Market Comparables';

      const hasComparableBenchmark = (purpose === 'lease' && compLease !== null && leasePricePerSqm !== null) ||
        (purpose !== 'lease' && compMarket !== null && askingPricePerSqm !== null);

      if (!hasComparableBenchmark) {
        statusLabel = 'Market comparison unavailable';
        statusNote = 'Methodological Baseline · Awaiting Verified Market Comparables';
      }

      if (!isDiscrepancy && !isReasonablenessWarning && hasComparableBenchmark) {
        const compPct = activeDiffPct ?? 0;
        if (compPct >= -5.0 && compPct <= 5.0) {
          totalScore = 100.0;
          statusNote = purpose === 'lease'
            ? 'Within ±5% of comparable lease benchmark (highly competitive).'
            : 'Within ±5% of market benchmark (highly competitive).';
        } else if (compPct > 5.0 && compPct <= 15.0) {
          totalScore = 85.0;
          statusNote = purpose === 'lease'
            ? '5% to 15% premium over comparable lease benchmark.'
            : '5% to 15% premium over market benchmark.';
        } else if (compPct > 15.0 && compPct <= 30.0) {
          totalScore = 70.0;
          statusNote = purpose === 'lease'
            ? '15% to 30% premium over comparable lease benchmark.'
            : '15% to 30% premium over market benchmark.';
        } else if (compPct > 30.0) {
          totalScore = 50.0;
          statusNote = purpose === 'lease'
            ? 'Significantly elevated (>30% above comparable lease benchmark).'
            : 'Significantly elevated (>30% above market benchmark).';
        } else {
          totalScore = 75.0;
          statusNote = purpose === 'lease'
            ? 'Discounted lease rate relative to comparable lease benchmark.'
            : 'Discounted asking price relative to market benchmark.';
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
        offeredScope,
        offeredArea,
        effectiveArea,
        depositMonths,
        advanceMonths,
        utilitiesIncluded,
        additionalCosts,
        knownUpfrontCosts,
        birZonal,
        compMarket,
        compLease,
        compSource,
        activeBenchmark,
        activeBenchmarkType,
        activeDiffPct,
        compRatio,
        compTier,
        lguType,
        lguAmount,
        askingPricePerSqm,
        leasePricePerSqm,
        totalBir,
        birDiffPct,
        marketDiffPct,
        leaseDiffPct,
        isDiscrepancy,
        isReasonablenessWarning,
        reasonablenessMessage,
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

      // 1. Update AUTO-RETRIEVED FROM STEPS 1–2 section
      const purposeNames = { sale: 'For Sale', lease: 'For Lease', sale_or_lease: 'For Sale or Lease' };
      setText('[data-econ-from-purpose]', purposeNames[res.purpose] || 'For Sale');

      let priceText = 'Price on request';
      if (res.purpose === 'lease') {
        priceText = res.leasePrice ? `₱${number(res.leasePrice)} / month` : (res.leaseMode === 'request' ? 'Rate on request' : 'Not entered');
      } else if (res.purpose === 'sale_or_lease') {
        const s = res.askingPrice ? `₱${number(res.askingPrice)}` : 'Sale: Request';
        const l = res.leasePrice ? `₱${number(res.leasePrice)}/mo` : 'Lease: Request';
        priceText = `${s} · ${l}`;
      } else {
        priceText = res.askingPrice ? `₱${number(res.askingPrice)}` : (res.saleMode === 'request' ? 'Price on request' : 'Not entered');
      }
      setText('[data-econ-from-price]', priceText);

      const classification = typeof getClassification === 'function' ? getClassification() : null;
      const propTypeLabel = classification?.primary || value('subcategory') || value('category') || 'Commercial Space';
      setText('[data-econ-from-type]', propTypeLabel);

      setText('[data-econ-from-area]', res.landArea ? `${number(res.landArea)} m²` : (estimatedArea ? `${number(estimatedArea)} m² (mapped)` : 'Not specified'));

      // Scope selection handling:
      // If Entire Land Parcel is selected: automatically use recorded parcel area, show auto note, hide secondary area input
      const autoAreaNote = $('[data-econ-auto-area-note]');
      const offAreaInp = field('offered_area_sqm');
      const offAreaLabel = $('[data-econ-offered-area-label]');
      const offAreaHint = $('[data-econ-offered-area-hint]');

      if (res.offeredScope === 'entire_land') {
        if (autoAreaNote) {
          autoAreaNote.hidden = false;
          setText('[data-econ-auto-land-area]', res.landArea ? `${number(res.landArea)} m²` : 'recorded parcel land area');
        }
        if (offAreaInp) {
          offAreaInp.style.display = 'none';
        }
        if (offAreaHint) {
          offAreaHint.textContent = 'Applies to the entire parcel. Automatically using recorded parcel land area.';
        }
      } else {
        if (autoAreaNote) {
          autoAreaNote.hidden = true;
        }
        if (offAreaInp) {
          offAreaInp.style.display = '';
        }
        if (offAreaLabel) {
          offAreaLabel.textContent = res.offeredScope === 'entire_building'
            ? 'Building floor / leasable area (m²)'
            : 'Offered leasable / unit floor area (m²)';
        }
        if (offAreaHint) {
          offAreaHint.textContent = 'Actual usable floor/space area. Clearly separate from total parcel land area.';
        }
      }

      // 2. Section 1 Unit Rates Cards
      const saleRateCard = $('[data-econ-sale-rate-card]');
      if (saleRateCard) {
        saleRateCard.hidden = res.purpose === 'lease';
        const sVal = res.askingPricePerSqm !== null ? `₱${number(res.askingPricePerSqm)}/m²` : (res.saleMode === 'request' ? 'Price on request' : '—');
        setText('[data-econ-asking-sqm]', sVal);
        setText('[data-econ-sale-basis]', res.offeredScope === 'entire_land'
          ? 'based on recorded parcel land area'
          : (res.offeredArea ? `based on offered floor area (${number(res.offeredArea)} m²)` : 'floor area needed'));
      }

      const leaseRateCard = $('[data-econ-lease-rate-card]');
      if (leaseRateCard) {
        leaseRateCard.hidden = res.purpose === 'sale';
        const lVal = res.leasePricePerSqm !== null ? `₱${number(res.leasePricePerSqm)}/m²/mo` : (res.leaseMode === 'request' ? 'Rate on request' : '—');
        setText('[data-econ-lease-sqm]', lVal);
        setText('[data-econ-lease-basis]', res.offeredScope === 'entire_land'
          ? 'based on recorded parcel land area'
          : (res.offeredArea ? `based on actual leasable area (${number(res.offeredArea)} m²)` : 'leasable area needed'));
      }

      // 3. Section 2 Additional Costs Wrappers
      const leaseCostsWrap = $('[data-econ-lease-costs-wrap]');
      if (leaseCostsWrap) {
        leaseCostsWrap.hidden = res.purpose === 'sale';
      }
      const saleCostsWrap = $('[data-econ-sale-costs-wrap]');
      if (saleCostsWrap) {
        saleCostsWrap.hidden = res.purpose === 'lease';
      }

      // Known Upfront Outlay Card
      const upfrontValEl = $('[data-econ-upfront-val]');
      const upfrontNoteEl = $('[data-econ-upfront-note]');
      if (upfrontValEl) {
        if (res.knownUpfrontCosts > 0) {
          upfrontValEl.textContent = `₱${number(res.knownUpfrontCosts)}`;
          let noteParts = [];
          if (res.purpose !== 'sale') {
            if (res.depositMonths > 0) noteParts.push(`${res.depositMonths} mo. deposit`);
            if (res.advanceMonths > 0) noteParts.push(`${res.advanceMonths} mo. advance`);
            if (res.utilitiesIncluded) noteParts.push('utilities included');
          }
          if (res.purpose !== 'lease' && res.additionalCosts > 0) {
            noteParts.push(`₱${number(res.additionalCosts)} closing/improvements`);
          }
          if (upfrontNoteEl) upfrontNoteEl.textContent = `(${noteParts.join(' + ')})`;
        } else {
          upfrontValEl.textContent = 'None recorded';
          if (upfrontNoteEl) upfrontNoteEl.textContent = '(deposit, advance rent, or closing expenses)';
        }
      }

      // 4. Section 3 Local Comparables Wrappers
      const leaseCompWrap = $('[data-econ-lease-comp-wrap]');
      if (leaseCompWrap) {
        leaseCompWrap.hidden = res.purpose === 'sale';
      }
      const saleCompWrap = $('[data-econ-sale-comp-wrap]');
      if (saleCompWrap) {
        saleCompWrap.hidden = res.purpose === 'lease';
      }

      // 5. Section 4 LIVE PRICING & MARKET COMPETITIVENESS SUMMARY
      const rateLabelEl = $('[data-econ-rate-type-label]');
      if (rateLabelEl) {
        rateLabelEl.textContent = res.purpose === 'lease'
          ? 'Monthly rent per m²'
          : (res.purpose === 'sale_or_lease' ? 'Sale rate per m²' : 'Asking price per m²');
      }
      const benchLabelEl = $('[data-econ-benchmark-label]');
      if (benchLabelEl) {
        benchLabelEl.textContent = res.purpose === 'lease' ? 'Comparable lease benchmark' : 'Local market benchmark';
      }
      setText('[data-econ-benchmark-sqm]', res.activeBenchmark !== null ? `₱${number(res.activeBenchmark)}/m²${res.purpose === 'lease' ? '/mo' : ''}` : '—');

      // Price difference row
      const marketRow = $('[data-econ-market-diff-row]');
      if (marketRow) {
        if (res.activeDiffPct !== null) {
          marketRow.hidden = false;
          let diffStr = '';
          if (res.activeDiffPct < 0) {
            diffStr = `${Math.abs(res.activeDiffPct).toFixed(2)}% below comparable benchmark`;
          } else if (res.activeDiffPct > 0) {
            diffStr = `+${res.activeDiffPct.toFixed(2)}% above comparable benchmark`;
          } else {
            diffStr = 'Aligned with comparable benchmark (0.00%)';
          }
          setText('[data-econ-market-diff]', diffStr);
        } else {
          setText('[data-econ-market-diff]', '—');
        }
      }

      // Price competitiveness ratio row
      const compRatioRow = $('[data-econ-competitiveness-row]');
      if (compRatioRow) {
        if (res.compRatio !== null) {
          setText('[data-econ-competitiveness-ratio]', `${res.compRatio.toFixed(4)}${res.compTier ? ' · ' + res.compTier : ''}`);
        } else {
          setText('[data-econ-competitiveness-ratio]', '—');
        }
      }

      // Known upfront outlay summary row
      setText('[data-econ-upfront-summary]', res.knownUpfrontCosts > 0 ? `₱${number(res.knownUpfrontCosts)}` : 'None recorded');

      // Dual Sale or Lease row for lease rate
      const leaseRow = $('[data-econ-lease-sqm-row]');
      if (leaseRow) {
        if (res.purpose === 'sale_or_lease' && res.leasePricePerSqm !== null) {
          leaseRow.hidden = false;
          setText('[data-econ-lease-sqm]', `₱${number(res.leasePricePerSqm)}/m² / month`);
        } else {
          leaseRow.hidden = true;
        }
      }

      // Total BIR reference & BIR diff
      setText('[data-econ-total-bir]', res.totalBir !== null ? `₱${number(res.totalBir)}` : '—');
      setText('[data-econ-bir-sqm]', res.birZonal !== null ? `₱${number(res.birZonal)}/m²` : '—');

      let birDiffText = '—';
      if (res.purpose === 'lease') {
        birDiffText = 'N/A for lease (BIR zonal value applies to conveyance taxes, not monthly rent)';
      } else if (res.birDiffPct !== null) {
        if (res.birDiffPct > 0) birDiffText = `${res.birDiffPct.toFixed(1)}% higher`;
        else if (res.birDiffPct < 0) birDiffText = `${Math.abs(res.birDiffPct).toFixed(1)}% lower`;
        else birDiffText = 'Equal to BIR reference';
      }
      setText('[data-econ-bir-diff]', birDiffText);

      // Area discrepancy banner
      const discAlert = $('[data-econ-area-discrepancy]');
      if (discAlert) {
        discAlert.hidden = !res.isDiscrepancy;
      }

      // Reasonableness warning banner
      const reasonWarn = $('[data-econ-reasonableness-warning]');
      if (reasonWarn) {
        reasonWarn.hidden = !res.isReasonablenessWarning;
        if (res.isReasonablenessWarning) {
          setText('[data-econ-reasonableness-text]', res.reasonablenessMessage);
        }
      }

      // Status badge and note
      const badgeEl = $('[data-econ-status-badge]');
      if (badgeEl) {
        badgeEl.textContent = res.statusLabel;
        badgeEl.className = `pw-badge ${res.isComplete ? 'pw-badge-calculated' : 'pw-badge-provisional'}`;
      }
      setText('[data-econ-status-note]', res.statusNote);
      setText('[data-econ-iai-val]', res.isComplete && res.totalScore !== null
        ? `${res.totalScore} / 100 · ${res.iaiContribution.toFixed(2)} pts`
        : '—');
    }

    function validateEconomicViabilityFields() {
      const scopeVal = value('offered_space_scope') || 'entire_land';
      const offArea = field('offered_area_sqm');
      const landAreaVal = enteredAreaSqm();
      const purpose = (typeof getListingPurpose === 'function' ? getListingPurpose() : value('listing_purpose')) || 'sale';

      // Check asking price (for sale or sale_or_lease)
      if (purpose !== 'lease') {
        const saleMode = form.querySelector('[name="sale_price_mode"]:checked')?.value || 'amount';
        if (saleMode === 'amount') {
          const rawPrice = (value('price') || '').replace(/,/g, '').trim();
          if (rawPrice !== '') {
            const numPrice = Number(rawPrice);
            if (isNaN(numPrice) || numPrice <= 0) {
              const pInp = $('#pwAskingPrice') || field('price');
              if (pInp) {
                showFieldError(pInp, 'Asking price must be greater than zero, or select Price on request.');
                notify('Asking price must be greater than zero.', true);
                focusIssue(pInp);
                return false;
              }
            }
          }
        }
      }

      // Check monthly lease price (for lease or sale_or_lease)
      if (purpose !== 'sale') {
        const leaseMode = form.querySelector('[name="lease_price_mode"]:checked')?.value || 'amount';
        if (leaseMode === 'amount') {
          const rawLease = (value('lease_price') || '').replace(/,/g, '').trim();
          if (rawLease !== '') {
            const numLease = Number(rawLease);
            if (isNaN(numLease) || numLease <= 0) {
              const lpInp = $('#pwLeasePrice') || field('lease_price');
              if (lpInp) {
                showFieldError(lpInp, 'Monthly lease price must be greater than zero, or select Rate on request.');
                notify('Monthly lease price must be greater than zero.', true);
                focusIssue(lpInp);
                return false;
              }
            }
          }
        }
      }

      // Check suspicious recorded land area (< 0.5 m²)
      if (landAreaVal !== null && landAreaVal !== undefined && landAreaVal < 0.5) {
        const aInp = field('land_area');
        if (aInp) {
          showFieldError(aInp, 'Recorded property area is unusually small (must be at least 0.5 m²).');
          notify('Recorded parcel area must be at least 0.5 m².', true);
          focusIssue(aInp);
          return false;
        }
      }

      if (scopeVal !== 'entire_land') {
        if (offArea && offArea.value.trim() !== '') {
          const val = Number(offArea.value.replace(/,/g, ''));
          if (isNaN(val) || val <= 0 || val < 0.5) {
            showFieldError(offArea, 'Offered floor/space area must be at least 0.5 m².');
            notify('Offered floor area must be at least 0.5 m².', true);
            focusIssue(offArea);
            return false;
          }
          if (scopeVal === 'part_property' && landAreaVal && val > landAreaVal) {
            showFieldError(offArea, 'Leasable unit area cannot exceed total recorded property area for a partial property lease. Choose Entire Building if multi-floor or adjust area.');
            notify('Leasable unit area cannot exceed total recorded parcel area for partial property.', true);
            focusIssue(offArea);
            return false;
          }
        }
      }

      const compM = field('comparable_market_price');
      if (compM && compM.value.trim() !== '') {
        const val = Number(compM.value.replace(/,/g, ''));
        if (isNaN(val) || val <= 0) {
          showFieldError(compM, 'Comparable sale price must be greater than zero.');
          notify('Comparable sale price must be greater than zero.', true);
          focusIssue(compM);
          return false;
        }
      }

      const compL = field('comparable_lease_price');
      if (compL && compL.value.trim() !== '') {
        const val = Number(compL.value.replace(/,/g, ''));
        if (isNaN(val) || val <= 0) {
          showFieldError(compL, 'Comparable lease rate must be greater than zero.');
          notify('Comparable lease rate must be greater than zero.', true);
          focusIssue(compL);
          return false;
        }
      }

      const secDep = field('security_deposit_months');
      if (secDep && secDep.value.trim() !== '') {
        const val = Number(secDep.value);
        if (isNaN(val) || val < 0) {
          showFieldError(secDep, 'Security deposit months cannot be negative.');
          notify('Security deposit months cannot be negative.', true);
          focusIssue(secDep);
          return false;
        }
      }

      const advRent = field('advance_rent_months');
      if (advRent && advRent.value.trim() !== '') {
        const val = Number(advRent.value);
        if (isNaN(val) || val < 0) {
          showFieldError(advRent, 'Advance rent months cannot be negative.');
          notify('Advance rent months cannot be negative.', true);
          focusIssue(advRent);
          return false;
        }
      }

      const addCosts = field('additional_purchase_costs');
      if (addCosts && addCosts.value.trim() !== '') {
        const val = Number(addCosts.value.replace(/,/g, ''));
        if (isNaN(val) || val < 0) {
          showFieldError(addCosts, 'Additional purchase costs cannot be negative.');
          notify('Additional purchase costs cannot be negative.', true);
          focusIssue(addCosts);
          return false;
        }
      }

      const birZ = field('bir_zonal_value');
      if (birZ && birZ.value.trim() !== '') {
        const val = Number(birZ.value.replace(/,/g, ''));
        if (isNaN(val) || val <= 0) {
          showFieldError(birZ, 'BIR zonal value must be greater than zero.');
          notify('BIR zonal value must be greater than zero.', true);
          focusIssue(birZ);
          return false;
        }
      }

      const lguVal = field('lgu_valuation_amount');
      if (lguVal && lguVal.value.trim() !== '') {
        const val = Number(lguVal.value.replace(/,/g, ''));
        if (isNaN(val) || val <= 0) {
          showFieldError(lguVal, 'LGU valuation amount must be greater than zero.');
          notify('LGU valuation amount must be greater than zero.', true);
          focusIssue(lguVal);
          return false;
        }
      }

      return true;
    }

    ['offered_space_scope', 'offered_area_sqm', 'security_deposit_months', 'advance_rent_months',
     'utilities_included', 'additional_purchase_costs', 'bir_zonal_value', 'comparable_market_price',
     'comparable_lease_price', 'lgu_valuation_type', 'lgu_valuation_amount', 'bir_source',
     'bir_date', 'assessed_market_value', 'comparable_source'].forEach(name => {
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
      const scopeInp = field('offered_space_scope');
      if (scopeInp) scopeInp.value = 'entire_land';
      const offAreaInp = field('offered_area_sqm');
      if (offAreaInp) offAreaInp.value = '';
      const bInp = field('bir_zonal_value');
      if (bInp) bInp.value = '7000';
      const cInp = field('comparable_market_price');
      if (cInp) cInp.value = '';
      const clInp = field('comparable_lease_price');
      if (clInp) clInp.value = '';
      const depInp = field('security_deposit_months');
      if (depInp) depInp.value = '';
      const advInp = field('advance_rent_months');
      if (advInp) advInp.value = '';
      const addInp = field('additional_purchase_costs');
      if (addInp) addInp.value = '';
      const utilInp = field('utilities_included');
      if (utilInp) utilInp.value = 'excluded';

      syncPricing();
      syncAreaEquivalents();
      syncEconomicViability();
      preview();
      ready();
      notify('Reset to example: Asking ₱9,000,000 for 1,000 m² (₱9,000/m²), BIR zonal ₱7,000/m² (28.6% higher).');
    });

    // ==========================================
    // CRITERION 5: ZONING COMPATIBILITY (CLUP) ENGINE
    // ==========================================
    let zoningEngineDataCache = null;
    function getZoningEngineData() {
      if (zoningEngineDataCache) return zoningEngineDataCache;
      try {
        const el = document.getElementById('pwZoningEngineData');
        if (el) zoningEngineDataCache = JSON.parse(el.textContent || '{}');
      } catch (err) {
        console.warn('Could not parse pwZoningEngineData', err);
      }
      return zoningEngineDataCache || {};
    }

    function evaluateZoningCompatibilityClient() {
      const zoneRaw = value('zoning_classification').trim();
      const activityRaw = value('proposed_activity').trim();
      const categoryRaw = value('zoning_category').trim();

      const conditions = {
        scale: Boolean($('[data-zoning-cond="scale"]')?.checked),
        height: Boolean($('[data-zoning-cond="height"]')?.checked),
        setback: Boolean($('[data-zoning-cond="setback"]')?.checked),
        pollution: Boolean($('[data-zoning-cond="pollution"]')?.checked),
      };

      if (!zoneRaw || !activityRaw) {
        return {
          isComplete: false,
          status: 'undetermined',
          statusLabel: 'Awaiting Selection',
          score: null,
          isEligible: false,
          suitability: 'incomplete',
          iaiContribution: null,
          weight: 15.0,
          zoneCode: zoneRaw || null,
          useCode: activityRaw || null,
          ruleSource: 'San Fernando City Zoning Ordinance No. 2018-06',
          ordinanceSection: 'City Ordinance 2018-06',
          sourcePriority: 1,
          isOfficialCityRule: true,
          conditions: [],
          restrictions: [],
          reason: 'Zoning district and specific proposed activity must be selected for official CLUP evaluation.',
          explanation: 'Select an official San Fernando City zoning district and proposed activity to automatically evaluate zoning compliance.',
          rulesVersion: 'sfc-zo-2018-06-v2.1',
        };
      }

      // Try embedded precomputed rules first
      const data = getZoningEngineData();
      let rule = data.rules?.[zoneRaw]?.[activityRaw];

      // If exact zone code key wasn't found directly (e.g. prefix match or description), normalize zone code
      if (!rule && data.rules) {
        const normZone = zoneRaw.split('—')[0].split(':')[0].trim();
        rule = data.rules[normZone]?.[activityRaw];
      }

      if (rule) {
        let status = rule.status;
        let score = rule.score;
        let isEligible = rule.is_eligible;
        let suitability = rule.suitability;
        let iaiContribution = rule.iai_contribution;
        const unmetConditions = [];

        // Check if conditional use has unmet client conditions
        if (status === 'conditional') {
          if (!conditions.scale && rule.restrictions?.some(r => r.toLowerCase().includes('scale') || r.toLowerCase().includes('area') || r.toLowerCase().includes('m²'))) {
            unmetConditions.push('District maximum activity scale exceeded');
          }
          if (!conditions.height && rule.restrictions?.some(r => r.toLowerCase().includes('height') || r.toLowerCase().includes('storey'))) {
            unmetConditions.push('District maximum building height exceeded');
          }
          if (!conditions.setback) {
            unmetConditions.push('Mandated yard setbacks and buffer zones not observed');
          }
          if (!conditions.pollution && rule.restrictions?.some(r => r.toLowerCase().includes('ecc') || r.toLowerCase().includes('denr') || r.toLowerCase().includes('pollut'))) {
            unmetConditions.push('DENR Environmental Compliance Certificate (ECC) / pollution control required');
          }
        }

        return {
          isComplete: true,
          status,
          statusLabel: rule.status_label || (status === 'permitted' ? 'Permitted Use' : status === 'conditional' ? 'Conditional Use' : 'Prohibited Use'),
          score,
          isEligible,
          suitability,
          iaiContribution,
          weight: 15.0,
          zoneCode: rule.zone_code || zoneRaw,
          zoneName: rule.zone_name || zoneRaw,
          useCode: activityRaw,
          useLabel: rule.use_label || activityRaw,
          ruleSource: rule.rule_source || 'City Ordinance 2018-06',
          ordinanceSection: rule.ordinance_section || 'City Ordinance 2018-06',
          sourcePriority: rule.source_priority || 1,
          isOfficialCityRule: rule.is_official_city_rule ?? true,
          conditions: rule.conditions || [],
          unmetConditions,
          restrictions: rule.restrictions || [],
          reason: rule.reason,
          explanation: rule.explanation,
          rulesVersion: rule.rules_version || 'sfc-zo-2018-06-v2.1',
        };
      }

      // Local fallback evaluation matching ZoningRulesEngine
      return fallbackZoningEvaluation(zoneRaw, activityRaw, conditions);
    }

    function fallbackZoningEvaluation(zone, act, cond) {
      const z = zone.toUpperCase();
      let status = 'undetermined';
      let score = null;
      let isEligible = false;
      let suitability = 'incomplete';
      let iaiContrib = null;
      let label = 'Assessment Incomplete';
      let section = 'City Ordinance 2018-06';
      let conditionsList = [];
      let restrictionsList = [];
      let expl = 'Zoning evaluation pending official ordinance rules ingestion.';

      if (z.startsWith('C-') || z.includes('COMMERCIAL')) {
        section = 'City Ordinance 2018-06, Sec. 10.B';
        if (act.startsWith('retail') || act.startsWith('food') || act.startsWith('office') || act.startsWith('tour')) {
          status = 'permitted';
          score = 100.0;
          isEligible = true;
          suitability = 'suitable';
          iaiContrib = 15.00;
          label = 'Permitted Use';
          expl = 'Proposed activity is permitted by right under San Fernando Commercial Zone regulations.';
        } else if (act.startsWith('res') || act.startsWith('log') || act.startsWith('inst')) {
          status = 'conditional';
          score = 70.0;
          isEligible = true;
          suitability = 'conditional';
          iaiContrib = 10.50;
          label = 'Conditional Use';
          conditionsList = ['Locational clearance from CPDO required', 'Traffic impact assessment for large footprints'];
          expl = 'Conditional use: allowable subject to locational clearance and development controls.';
        } else if (act === 'ind_heavy_manufacturing' || act.startsWith('agri_livestock')) {
          status = 'prohibited';
          score = 0.0;
          isEligible = false;
          suitability = 'not_suitable';
          label = 'Prohibited Use (Not Suitable)';
          expl = 'Heavy manufacturing and livestock are strictly prohibited in Commercial Districts.';
        }
      } else if (z.startsWith('R-') || z.includes('RESIDENTIAL')) {
        section = 'City Ordinance 2018-06, Sec. 10.A';
        if (act.startsWith('res')) {
          status = 'permitted';
          score = 100.0;
          isEligible = true;
          suitability = 'suitable';
          iaiContrib = 15.00;
          label = 'Permitted Use';
          expl = 'Residential use is permitted by right in Residential Districts.';
        } else if (act === 'retail_convenience' || act === 'food_cafe' || act === 'office_professional') {
          status = 'conditional';
          score = 70.0;
          isEligible = true;
          suitability = 'conditional';
          iaiContrib = 10.50;
          label = 'Conditional Use';
          restrictionsList = ['Floor area <= 50m²', 'Barangay clearance required', 'No outdoor flashing signage'];
          expl = 'Neighborhood commercial services allowed as conditional home occupations.';
        } else if (act.startsWith('ind') || act.startsWith('agri_livestock') || act.startsWith('log')) {
          status = 'prohibited';
          score = 0.0;
          isEligible = false;
          suitability = 'not_suitable';
          label = 'Prohibited Use (Not Suitable)';
          expl = 'Industrial, logistics, and livestock uses are prohibited in Residential Districts.';
        }
      } else if (z.startsWith('I-') || z.includes('INDUSTRIAL')) {
        section = 'City Ordinance 2018-06, Sec. 10.D';
        if (act.startsWith('ind') || act.startsWith('log')) {
          status = (act === 'ind_heavy_manufacturing' && z.startsWith('I-1')) ? 'conditional' : 'permitted';
          score = status === 'permitted' ? 100.0 : 70.0;
          isEligible = true;
          suitability = status === 'permitted' ? 'suitable' : 'conditional';
          iaiContrib = status === 'permitted' ? 15.00 : 10.50;
          label = status === 'permitted' ? 'Permitted Use' : 'Conditional Use';
          expl = status === 'permitted' ? 'Industrial and logistics operations are permitted by right.' : 'Heavy operations in Light Industrial require DENR ECC and specialized treatment.';
        } else if (act.startsWith('res_detached') || act.startsWith('res_apartments')) {
          status = 'prohibited';
          score = 0.0;
          isEligible = false;
          suitability = 'not_suitable';
          label = 'Prohibited Use (Not Suitable)';
          expl = 'Residential subdivisions are prohibited within industrial zones for health and safety.';
        }
      } else if (z.startsWith('AGR-') || z === 'AIZ' || z.includes('AGRICULTURAL')) {
        section = 'City Ordinance 2018-06, Sec. 10.E';
        if (act.startsWith('agri')) {
          status = 'permitted';
          score = 100.0;
          isEligible = true;
          suitability = 'suitable';
          iaiContrib = 15.00;
          label = 'Permitted Use';
          expl = 'Agricultural production and processing are permitted by right.';
        }
      } else if (z === 'TZ' || z.includes('TOURISM')) {
        section = 'City Ordinance 2018-06, Sec. 10.F';
        if (act.startsWith('tour') || act === 'retail_convenience' || act === 'food_restaurant' || act === 'food_cafe') {
          status = 'permitted';
          score = 100.0;
          isEligible = true;
          suitability = 'suitable';
          iaiContrib = 15.00;
          label = 'Permitted Use';
          expl = 'Tourism, hospitality, and dining establishments are permitted by right in Tourism Zones.';
        }
      } else if (z === 'MRZ' || z === 'FRZ') {
        section = 'City Ordinance 2018-06, Sec. 10.G';
        status = 'prohibited';
        score = 0.0;
        isEligible = false;
        suitability = 'not_suitable';
        label = 'Prohibited Use (Not Suitable)';
        expl = 'Strict environmental conservation and sanctuary zone: urban development is prohibited.';
      } else if (z === 'FEZ') {
        section = 'Poro Point Special Economic Zone Masterplan';
        if (act.startsWith('tour') || act.startsWith('office') || act.startsWith('log') || act.startsWith('retail')) {
          status = 'permitted';
          score = 100.0;
          isEligible = true;
          suitability = 'suitable';
          iaiContrib = 15.00;
          label = 'Permitted Use';
          expl = 'Commercial, tourism, and IT/logistics activities are permitted under Freeport Masterplan.';
        }
      }

      return {
        isComplete: status !== 'undetermined',
        status,
        statusLabel: label,
        score,
        isEligible,
        suitability,
        iaiContribution: iaiContrib,
        weight: 15.0,
        zoneCode: zone,
        zoneName: zone,
        useCode: act,
        useLabel: act,
        ruleSource: section,
        ordinanceSection: section,
        sourcePriority: 1,
        isOfficialCityRule: true,
        conditions: conditionsList,
        unmetConditions: [],
        restrictions: restrictionsList,
        reason: status === 'prohibited' ? expl : null,
        explanation: expl,
        rulesVersion: 'sfc-zo-2018-06-v2.1',
      };
    }

    function syncZoningCompatibility() {
      const res = evaluateZoningCompatibilityClient();

      // 1. Status badge
      const badge = $('[data-zoning-status-badge]');
      if (badge) {
        badge.textContent = res.statusLabel;
        if (res.status === 'permitted') {
          badge.className = 'pw-badge pw-badge-teal';
        } else if (res.status === 'conditional') {
          badge.className = 'pw-badge pw-badge-amber';
        } else if (res.status === 'prohibited') {
          badge.className = 'pw-badge pw-badge-rose';
        } else {
          badge.className = 'pw-badge pw-badge-sky';
        }
      }

      // 2. Scores & metrics
      const scoreDisplay = $('[data-zoning-score-display]');
      if (scoreDisplay) {
        scoreDisplay.textContent = res.score !== null ? `${res.score} / 100` : '—';
      }

      const mceContrib = $('[data-zoning-mce-contrib]');
      if (mceContrib) {
        if (res.status === 'permitted') {
          mceContrib.textContent = '15.00 pts';
        } else if (res.status === 'conditional') {
          mceContrib.textContent = '10.50 pts';
        } else if (res.status === 'prohibited') {
          mceContrib.textContent = 'Withheld (0 pts)';
        } else {
          mceContrib.textContent = '—';
        }
      }

      const gateDisplay = $('[data-zoning-gate-display]');
      if (gateDisplay) {
        if (res.status === 'permitted') {
          gateDisplay.textContent = 'Eligible (Score: 100)';
          gateDisplay.style.color = '#065F46';
        } else if (res.status === 'conditional') {
          gateDisplay.textContent = 'Provisional (Score: 70)';
          gateDisplay.style.color = '#92400E';
        } else if (res.status === 'prohibited') {
          gateDisplay.textContent = 'Disqualified (Site Not Eligible)';
          gateDisplay.style.color = '#991B1B';
        } else {
          gateDisplay.textContent = 'Assessment Incomplete';
          gateDisplay.style.color = '#64748B';
        }
      }

      // 3. Explanation
      const explEl = $('[data-zoning-explanation]');
      if (explEl) {
        explEl.textContent = res.explanation || res.reason || 'Select a zoning district and proposed activity.';
      }
      const explBox = $('[data-zoning-explanation-box]');
      if (explBox) {
        if (res.status === 'permitted') {
          explBox.style.borderLeftColor = '#059669';
          explBox.style.background = '#F0FDF4';
        } else if (res.status === 'conditional') {
          explBox.style.borderLeftColor = '#D97706';
          explBox.style.background = '#FFFBEB';
        } else if (res.status === 'prohibited') {
          explBox.style.borderLeftColor = '#DC2626';
          explBox.style.background = '#FEF2F2';
        } else {
          explBox.style.borderLeftColor = '#CBD5E1';
          explBox.style.background = '#F8FAFC';
        }
      }

      // 4. Conditions & Restrictions
      const condDisc = $('[data-zoning-conditions-disclosure]');
      const condList = $('[data-zoning-conditions-list]');
      if (condDisc && condList) {
        const items = [...(res.restrictions || []), ...(res.conditions || [])];
        if (res.unmetConditions?.length) {
          items.unshift(...res.unmetConditions.map(u => `⚠ Unmet condition: ${u}`));
        }
        if (items.length && res.status !== 'undetermined') {
          condDisc.hidden = false;
          condList.innerHTML = items.map(item => `<li>${escape(item)}</li>`).join('');
        } else {
          condDisc.hidden = true;
          condList.innerHTML = '';
        }
      }

      // 5. Ordinance section & version
      const ordEl = $('[data-zoning-ordinance-section]');
      if (ordEl) ordEl.textContent = res.ordinanceSection || 'City Ordinance 2018-06';
      const verEl = $('[data-zoning-engine-version]');
      if (verEl) verEl.textContent = res.rulesVersion || 'sfc-zo-2018-06-v2.1';
    }

    function renderZoningAllowedAndConditionalUses(savedAllowedUses = null) {
      const zoneSelect = $('#pwZoningClassification');
      if (!zoneSelect) return;
      const rawZone = zoneSelect.value.trim();
      const allowedContainer = $('#pwAllowedUsesContainer');
      const condContainer = $('#pwConditionalUsesContainer');
      const allowedBadge = $('[data-allowed-uses-count]');
      const condBadge = $('[data-conditional-uses-count]');
      if (!allowedContainer || !condContainer) return;

      if (!rawZone) {
        allowedContainer.innerHTML = '<p class="pw-small pw-muted" style="padding: 10px; margin: 0; text-align: center;">Select an Official Zoning District above to view permitted land uses.</p>';
        condContainer.innerHTML = '<p class="pw-small pw-muted" style="padding: 10px; margin: 0; text-align: center;">Select an Official Zoning District above to view conditional activities.</p>';
        if (allowedBadge) allowedBadge.textContent = '0 activities permitted';
        if (condBadge) condBadge.textContent = '0 conditional uses';
        return;
      }

      const normZone = rawZone.split('—')[0].split(':')[0].trim();
      const engineData = getZoningEngineData();
      const zoneRules = engineData.rules?.[normZone] || engineData.rules?.[rawZone] || {};
      const catalog = engineData.catalog || {};

      const previouslyChecked = new Set();
      if (Array.isArray(savedAllowedUses)) {
        savedAllowedUses.forEach(u => previouslyChecked.add(u));
      } else {
        allowedContainer.querySelectorAll('input:checked').forEach(el => previouslyChecked.add(el.value));
      }

      const permittedList = [];
      const conditionalList = [];

      Object.entries(zoneRules).forEach(([actCode, rule]) => {
        let actLabel = rule.use_label || actCode;
        let catLabel = '';
        if (catalog) {
          for (const [cKey, cVal] of Object.entries(catalog)) {
            if (cVal.activities && cVal.activities[actCode]) {
              actLabel = cVal.activities[actCode].label || actLabel;
              catLabel = cVal.label || cKey;
              break;
            }
          }
        }
        if (rule.status === 'permitted') {
          permittedList.push({ code: actCode, label: actLabel, cat: catLabel, rule });
        } else if (rule.status === 'conditional') {
          conditionalList.push({ code: actCode, label: actLabel, cat: catLabel, rule });
        }
      });

      if (permittedList.length === 0) {
        allowedContainer.innerHTML = '<p class="pw-small pw-muted" style="padding: 10px; margin: 0;">No activities permitted by right under this zoning district.</p>';
      } else {
        const isFresh = previouslyChecked.size === 0 && !Array.isArray(savedAllowedUses);
        allowedContainer.innerHTML = permittedList.map(item => {
          const isChecked = isFresh ? true : previouslyChecked.has(item.code);
          return `<label class="pw-chip-checkbox" data-act-text="${escape((item.label + ' ' + item.cat).toLowerCase())}" style="display: flex; align-items: flex-start; gap: 8px; padding: 6px 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 12px; cursor: pointer; margin-bottom: 4px;">
            <input type="checkbox" name="clup_allowed_uses[]" value="${escape(item.code)}" ${isChecked ? 'checked' : ''} style="margin-top: 2px;">
            <span><strong>${escape(item.label)}</strong> <small class="pw-muted" style="color: #64748B;">(${escape(item.cat || 'Standard')})</small></span>
          </label>`;
        }).join('');
      }
      if (allowedBadge) allowedBadge.textContent = `${permittedList.length} activities permitted`;

      if (conditionalList.length === 0) {
        condContainer.innerHTML = '<p class="pw-small pw-muted" style="padding: 10px; margin: 0;">No conditional activities specified for this district.</p>';
      } else {
        condContainer.innerHTML = conditionalList.map(item => {
          const conds = item.rule.conditions?.length ? item.rule.conditions.join('; ') : (item.rule.restrictions?.length ? item.rule.restrictions.join('; ') : 'Requires locational clearance / mitigation');
          return `<div style="display: flex; align-items: flex-start; gap: 8px; padding: 6px 10px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; font-size: 12px; margin-bottom: 4px;">
            <span style="color: #D97706; font-weight: 700; margin-top: 1px;">⚠</span>
            <div><strong>${escape(item.label)}</strong> <small class="pw-muted" style="color: #92400E; display: block;">${escape(conds)}</small></div>
          </div>`;
        }).join('');
      }
      if (condBadge) condBadge.textContent = `${conditionalList.length} conditional uses`;

      applyAllowedUsesFilter();
    }

    function applyAllowedUsesFilter() {
      const searchInput = $('#pwAllowedUsesSearch');
      const allowedContainer = $('#pwAllowedUsesContainer');
      if (!searchInput || !allowedContainer) return;
      const q = searchInput.value.trim().toLowerCase();
      allowedContainer.querySelectorAll('[data-act-text]').forEach(el => {
        el.style.display = (!q || el.dataset.actText.includes(q)) ? 'flex' : 'none';
      });
    }

    function filterZoningActivitiesByCategory(category) {
      const activitySelect = $('#pwZoningActivity');
      if (!activitySelect) return;
      const optgroups = activitySelect.querySelectorAll('optgroup[data-category-group]');
      let firstMatchingValue = '';
      optgroups.forEach(group => {
        const matches = !category || group.dataset.categoryGroup === category;
        group.hidden = !matches;
        group.querySelectorAll('option').forEach(opt => {
          opt.hidden = !matches;
          if (matches && !firstMatchingValue) firstMatchingValue = opt.value;
        });
      });
      if (category && activitySelect.value) {
        const currentOpt = activitySelect.querySelector(`option[value="${activitySelect.value}"]`);
        if (currentOpt && currentOpt.dataset.category !== category && firstMatchingValue) {
          activitySelect.value = firstMatchingValue;
        }
      }
    }

    const zoningClassSelect = $('#pwZoningClassification');
    const zoningCatSelect = $('#pwZoningCategory');
    const zoningActSelect = $('#pwZoningActivity');
    if (zoningClassSelect) {
      zoningClassSelect.addEventListener('change', () => {
        renderZoningAllowedAndConditionalUses();
        syncZoningCompatibility();
        preview();
        ready();
      });
    }
    const allowedSearchInput = $('#pwAllowedUsesSearch');
    if (allowedSearchInput) {
      allowedSearchInput.addEventListener('input', applyAllowedUsesFilter);
    }
    const allowedContainerEl = $('#pwAllowedUsesContainer');
    if (allowedContainerEl) {
      allowedContainerEl.addEventListener('change', () => {
        preview();
        ready();
      });
    }
    if (zoningCatSelect) {
      zoningCatSelect.addEventListener('change', () => {
        filterZoningActivitiesByCategory(zoningCatSelect.value);
        syncZoningCompatibility();
        preview();
        ready();
      });
    }
    if (zoningActSelect) {
      zoningActSelect.addEventListener('change', () => { syncZoningCompatibility(); preview(); ready(); });
    }
    all('[data-zoning-cond]').forEach(cb => {
      cb.addEventListener('change', () => { syncZoningCompatibility(); preview(); ready(); });
    });
    const existLandUseInp = field('existing_land_use');
    if (existLandUseInp) {
      existLandUseInp.addEventListener('input', () => { preview(); ready(); });
      existLandUseInp.addEventListener('change', () => { preview(); ready(); });
    }

    function selectLocationMethod(method, sync = true) {
      locationMethod = ['area','pin','draw'].includes(method) ? method : 'pin';
      all('[data-location-method]').forEach(button => {
        const active = button.dataset.locationMethod === locationMethod;
        button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));
      });
      const mapCard = $('[data-location-map-card]');
      if (mapCard) mapCard.hidden = false;
      const pinBtn = $('[data-map-tool="pin"]');
      const drawBtn = $('[data-boundary-action="draw"]');
      if (locationMethod === 'draw') {
        drawBtn?.classList.add('is-active');
        pinBtn?.classList.remove('is-active');
      } else {
        pinBtn?.classList.add('is-active');
        drawBtn?.classList.remove('is-active');
      }
      $('[data-editor-panel="1"]')?.classList.remove('pw-area-only');
      setText('[data-location-heading]',locationMethod === 'draw' ? 'Outline the plot' : 'Pinpoint the property');
      setText('[data-location-help]',locationMethod === 'draw' ? 'Find the area, then outline each corner of the plot. Your mapped estimate stays separate from a recorded measurement.' : 'Find a barangay or address, then click the property to place its pin. You can also paste coordinates.');
      boundaryMap?.pm?.disableDraw();parcelLayer?.pm?.disable();
      if (sync) {syncLocation();renderLayers();}
    }
    all('[data-location-method]').forEach(button => button.addEventListener('click',()=>selectLocationMethod(button.dataset.locationMethod)));
    function tabs(buttonAttribute, panelAttribute, selected) {
      all(`[${buttonAttribute}]`).forEach(button => {
        const active = button.getAttribute(buttonAttribute) === selected;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      });
      all(`[${panelAttribute}]`).forEach(panel => { panel.hidden = panel.getAttribute(panelAttribute) !== selected; });
    }
    function bindTabs(attribute, select) {
      const buttons = all(`[${attribute}]`);
      buttons.forEach((button, index) => {
        button.addEventListener('click', () => select(button.getAttribute(attribute)));
        button.addEventListener('keydown', event => {
          if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next].click(); buttons[next].focus();
        });
      });
    }
    function selectEvidenceCriterion(selected) {
      if (step === 2) { const editor = $('[data-evidence-editor]'); if (editor) editor.open = true; }
      tabs('data-evidence-tab', 'data-evidence-panel', selected);
      const mobileSelect = $('[data-criteria-mobile-select]');
      if (mobileSelect && mobileSelect.value !== selected) {
        mobileSelect.value = selected;
      }
      all('[data-criteria-pill]').forEach(pill => {
        pill.classList.toggle('is-active', pill.dataset.criteriaPill === selected);
      });
      updateCriteriaStatus();
      if (selected === 'nearby_businesses') {
        if (!radarMap && $('[data-radar-map]')) {
          syncRadar();
        } else if (radarMap) {
          requestAnimationFrame(() => {
            radarMap.invalidateSize();
            if (radiusLayer) radarMap.fitBounds(radiusLayer.getBounds(), { padding: [25, 25] });
          });
        }
      }
    }
    bindTabs('data-evidence-tab', selectEvidenceCriterion);
    all('[data-criteria-pill]').forEach(pill => {
      pill.addEventListener('click', () => {
        const criterion = pill.dataset.criteriaPill;
        if (criterion) selectEvidenceCriterion(criterion);
      });
    });
    bindTabs('data-util-tab', selected => tabs('data-util-tab', 'data-util-pane', selected));
    $('[data-criteria-mobile-select]')?.addEventListener('change', event => {
      selectEvidenceCriterion(event.target.value);
    });
    bindTabs('data-review-tab', selected => tabs('data-review-tab','data-review-panel',selected));
    bindTabs('data-radar-tab', selected => { radarTab = selected; tabs('data-radar-tab','data-radar-unused-panel',selected); renderRadarList(); });
    function updateCriteriaStatus() {
      const hasObservation = name => {
        const answer = form.querySelector(`[name="${name}"]:checked`)?.value;
        return Boolean(answer && !['unknown', 'not_verified'].includes(answer));
      };
      const statusMap = {
        spatial_accessibility: Boolean(
          hasObservation('road_frontage') ||
          (value('road_surface') && !['unknown', 'not_verified'].includes(value('road_surface'))) ||
          value('carriageway_width') ||
          value('carriageway_width_m') ||
          value('distance_to_major_road') ||
          value('access_route_condition') ||
          value('spatial_evidence_source')
        ),
        infrastructure_readiness: Boolean(
          hasObservation('electricity') ||
          hasObservation('water') ||
          hasObservation('internet') ||
          hasObservation('drainage') ||
          value('utility_evidence_source')
        ),
        economic_viability: Boolean(
          +value('bir_zonal_value') > 0 ||
          +value('comparable_market_price') > 0 ||
          +value('comparable_lease_price') > 0 ||
          +value('lgu_valuation_amount') > 0 ||
          value('assessed_market_value') ||
          value('economic_evidence_source')
        ),
        nearby_businesses: Boolean(
          value('nearby_analysis_origin') ||
          value('commercial_corridor') ||
          all('[name="assessmentTags[]"]:checked').length ||
          value('nearby_evidence_source')
        ),
        zoning_compatibility: Boolean(
          value('zoning_classification') && (
            value('existing_land_use') ||
            all('[name="clup_allowed_uses[]"]:checked').length ||
            value('clup_conditional_uses')
          )
        ),
        risk_constraints: Boolean(
          value('hazard_evidence_source') ||
          value('hazard_evidence_reference') ||
          value('readiness_notes')
        ),
      };

      Object.entries(statusMap).forEach(([critKey, isComplete]) => {
        const tabBtn = form.querySelector(`[data-evidence-tab="${critKey}"]`);
        if (tabBtn) {
          tabBtn.classList.toggle('is-complete', isComplete);
          tabBtn.classList.toggle('is-incomplete', !isComplete);
        }
      });

      const mobileSelect = $('[data-criteria-mobile-select]');
      if (mobileSelect) {
        Array.from(mobileSelect.options).forEach(opt => {
          const key = opt.value;
          if (statusMap[key] !== undefined) {
            const baseText = opt.dataset.baseText || opt.textContent.replace(/ [✓•]/g, '').trim();
            opt.dataset.baseText = baseText;
            opt.textContent = `${baseText} ${statusMap[key] ? '✓' : '•'}`;
          }
        });
      }
    }

    function calculateWizardCompositeMce(criteriaScores) {
      const weights = {
        spatial_accessibility: 20,
        infrastructure_readiness: 20,
        economic_viability: 20,
        nearby_businesses: 10,
        risk_constraints: 15,
        zoning_compatibility: 15
      };
      let total = 0;
      let completedCount = 0;
      const breakdown = {};
      for (const [key, weight] of Object.entries(weights)) {
        const val = criteriaScores ? criteriaScores[key] : null;
        const isNum = val !== null && val !== undefined && Number.isFinite(Number(val));
        if (isNum) {
          completedCount++;
          total += (Number(val) * weight) / 100;
          breakdown[key] = { score: Number(val), weight, contribution: (Number(val) * weight) / 100 };
        } else {
          breakdown[key] = { score: null, weight, contribution: null };
        }
      }
      const allComplete = completedCount === 6;
      return {
        isComplete: allComplete,
        completedCount,
        totalCount: 6,
        iaiScore: allComplete ? Math.round(total * 10) / 10 : null,
        mceScore: allComplete ? Math.round(total * 10) / 10 : null,
        breakdown,
      };
    }
    if (typeof window !== 'undefined') {
      window.calculateWizardCompositeMce = calculateWizardCompositeMce;
    }

    function updateReviewStatus(located, entered) {
      updateCriteriaStatus();
      const validInputs = ['property_name','category','subcategory','price','lease_price','land_area'].every(name => field(name)?.disabled || field(name)?.validity?.valid !== false);
      const hasBasics = Boolean(value('property_name').trim() && getClassification().primary && (entered || estimatedArea > 0 || located) && validInputs);
      const submitBadge = $('[data-submit-readiness-badge]');
      if (submitBadge) {
        submitBadge.textContent = hasBasics ? 'Ready to submit' : 'Essentials needed';
        submitBadge.className = `pw-badge ${hasBasics ? 'pw-badge-teal' : 'pw-badge-amber'}`;
      }
      let count = 0;
      const hasObservation = name => {const answer=form.querySelector(`[name="${name}"]:checked`)?.value;return Boolean(answer && !['unknown','not_verified'].includes(answer));};
      if (hasObservation('road_frontage') || (value('road_surface') && !['unknown','not_verified'].includes(value('road_surface'))) || value('access_route_condition') || value('spatial_evidence_source')) count++;
      if (hasObservation('electricity') || hasObservation('water') || hasObservation('internet') || value('utility_evidence_source')) count++;
      if (+value('bir_zonal_value') > 0 || value('assessed_market_value') || value('economic_evidence_source')) count++;
      if (value('nearby_analysis_origin') || value('commercial_corridor') || all('[name="assessmentTags[]"]:checked').length || value('nearby_evidence_source')) count++;
      if (value('zoning_classification') && (value('existing_land_use') || all('[name="clup_allowed_uses[]"]:checked').length || value('clup_conditional_uses'))) count++;
      if (value('hazard_evidence_source') || value('hazard_evidence_reference') || value('readiness_notes')) count++;
      setText('[data-completeness-count]', `${count} of 6`);
      const compBadge = $('[data-completeness-badge]');
      if (compBadge) {
        compBadge.textContent = `${count}/6 criteria`;
        compBadge.className = `pw-badge ${count >= 6 ? 'pw-badge-teal' : count >= 3 ? 'pw-badge-sky' : 'pw-badge-amber'}`;
      }

      // Update Tier 3 Assessment Readiness in Step 4 Review
      const spatialRes = typeof evaluateSpatialAccessibilityClient === 'function' ? evaluateSpatialAccessibilityClient() : null;
      const infraRes = typeof evaluateInfrastructureReadinessClient === 'function' ? evaluateInfrastructureReadinessClient() : null;
      const econRes = typeof evaluateEconomicViabilityClient === 'function' ? evaluateEconomicViabilityClient() : null;
      const zoningRes = typeof evaluateZoningCompatibilityClient === 'function' ? evaluateZoningCompatibilityClient() : null;

      const nearbyTags = all('[name="assessmentTags[]"]:checked').length;
      const nearbyScore = (lastAssessment?.assessmentCriteria?.nearby_businesses != null && Number.isFinite(Number(lastAssessment.assessmentCriteria.nearby_businesses)))
        ? Number(lastAssessment.assessmentCriteria.nearby_businesses)
        : (nearbyTags > 0 ? Math.min(100, 50 + nearbyTags * 10) : null);

      const riskScoreText = $('[data-risk-total-score]')?.textContent;
      const riskScore = (riskScoreText && riskScoreText !== '—' && !isNaN(Number(riskScoreText)))
        ? Number(riskScoreText)
        : ((lastAssessment?.assessmentCriteria?.risk_constraints != null && Number.isFinite(Number(lastAssessment.assessmentCriteria.risk_constraints))) ? Number(lastAssessment.assessmentCriteria.risk_constraints) : null);

      const criteriaScores = {
        spatial_accessibility: spatialRes?.score ?? null,
        infrastructure_readiness: infraRes?.score ?? null,
        economic_viability: econRes?.score ?? null,
        nearby_businesses: nearbyScore,
        risk_constraints: riskScore,
        zoning_compatibility: zoningRes?.score ?? null
      };

      const updateCritRow = (key, score, isDone) => {
        const scoreEl = $(`[data-review-crit-score="${key}"]`);
        const badgeEl = $(`[data-review-crit-badge="${key}"]`);
        if (scoreEl) {
          scoreEl.textContent = (score !== null && score !== undefined && Number.isFinite(Number(score))) ? `${Number(score).toFixed(1)}/100` : '—';
        }
        if (badgeEl) {
          if (score !== null && score !== undefined && isDone) {
            badgeEl.textContent = 'Complete';
            badgeEl.className = 'pw-badge pw-badge-teal';
          } else if (isDone) {
            badgeEl.textContent = 'Provisional';
            badgeEl.className = 'pw-badge pw-badge-sky';
          } else {
            badgeEl.textContent = 'Pending';
            badgeEl.className = 'pw-badge pw-badge-amber';
          }
        }
      };

      updateCritRow('spatial_accessibility', criteriaScores.spatial_accessibility, Boolean(spatialRes?.isComplete));
      updateCritRow('infrastructure_readiness', criteriaScores.infrastructure_readiness, Boolean(infraRes?.isComplete));
      updateCritRow('economic_viability', criteriaScores.economic_viability, Boolean(econRes?.isComplete));
      updateCritRow('nearby_businesses', criteriaScores.nearby_businesses, Boolean(criteriaScores.nearby_businesses !== null));
      updateCritRow('risk_constraints', criteriaScores.risk_constraints, Boolean(criteriaScores.risk_constraints !== null));
      updateCritRow('zoning_compatibility', criteriaScores.zoning_compatibility, Boolean(zoningRes?.isComplete));

      const composite = calculateWizardCompositeMce(criteriaScores);
      const compositeIaiEl = $('[data-review-composite-iai]');
      const compositeStatusEl = $('[data-review-composite-status]');
      const compositeDescEl = $('[data-review-composite-desc]');

      if (composite.isComplete) {
        if (compositeIaiEl) compositeIaiEl.innerHTML = `${composite.iaiScore.toFixed(1)} <small>/ 100</small>`;
        if (compositeStatusEl) {
          compositeStatusEl.textContent = 'Assessment Ready';
          compositeStatusEl.className = 'pw-badge pw-badge-teal';
        }
        if (compositeDescEl) {
          compositeDescEl.textContent = `All six criteria verified and computed. Composite IAI = Σ(score × weight ÷ 100) = ${composite.iaiScore.toFixed(1)}/100.`;
        }
      } else {
        if (compositeIaiEl) compositeIaiEl.innerHTML = '— <small>/ 100</small>';
        if (compositeStatusEl) {
          compositeStatusEl.textContent = 'Provisional Baseline';
          compositeStatusEl.className = 'pw-badge pw-badge-amber';
        }
        if (compositeDescEl) {
          compositeDescEl.textContent = `Preliminary score based on intake facts (${composite.completedCount}/6 criteria complete). Official composite IAI requires complete validated evidence across all six criteria. Missing criteria are never defaulted.`;
        }
      }
    }
    form.addEventListener('click', async event => {
      const prevCriterionBtn = event.target.closest('[data-criterion-prev]');
      if (prevCriterionBtn) {
        const target = prevCriterionBtn.dataset.criterionPrev;
        const footer = prevCriterionBtn.closest('.pw-criterion-nav-footer');
        const hint = footer?.querySelector('.pw-criterion-nav-hint');
        if (hint) {
          hint.innerHTML = '<svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg> <span>Saving draft...</span>';
        }
        await saveDraft(false);
        if (hint) {
          hint.innerHTML = '<svg class="pw-icon" style="color:#10b981;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg> <span style="color:#10b981;font-weight:600;">Draft saved</span>';
        }
        if (target === 'step1') {
          all('[data-editor-step]').find(node => node.dataset.editorStep === '1')?.click();
        } else {
          selectEvidenceCriterion(target);
          const panel = form.querySelector(`[data-evidence-panel="${target}"]`);
          if (panel) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        updateCriteriaStatus();
        return;
      }

      const nextCriterionBtn = event.target.closest('[data-criterion-next]');
      if (nextCriterionBtn) {
        const activeTab = form.querySelector('.pw-evidence-tab.is-active')?.dataset.evidenceTab;
        if (activeTab === 'economic_viability') {
          if (typeof validateEconomicViabilityFields === 'function' && !validateEconomicViabilityFields()) {
            return;
          }
        }
        const target = nextCriterionBtn.dataset.criterionNext;
        const footer = nextCriterionBtn.closest('.pw-criterion-nav-footer');
        const hint = footer?.querySelector('.pw-criterion-nav-hint');
        if (hint) {
          hint.innerHTML = '<svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg> <span>Saving draft...</span>';
        }
        await saveDraft(false);
        if (hint) {
          hint.innerHTML = '<svg class="pw-icon" style="color:#10b981;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg> <span style="color:#10b981;font-weight:600;">Draft saved</span>';
        }
        if (target === 'step3') {
          all('[data-editor-step]').find(node => node.dataset.editorStep === '3')?.click();
        } else {
          selectEvidenceCriterion(target);
          const panel = form.querySelector(`[data-evidence-panel="${target}"]`);
          if (panel) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        updateCriteriaStatus();
        return;
      }

      const edit = event.target.closest('[data-review-edit]');
      if (edit) $('[data-editor-step="' + edit.dataset.reviewEdit + '"]')?.click();
      if (event.target.closest('[data-trigger-hazard-evidence]')) {
        const inp = field('hazard_evidence_source');
        if (inp) { inp.focus(); inp.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      }
    });
    function preview() {
      syncPricing();
      setText('[data-preview-name]', value('property_name').trim() || 'Your new property');
      const subnameVal = value('property_subname').trim();
      const subElem = $('[data-preview-subname]');
      if (subElem) {
        subElem.textContent = subnameVal;
        subElem.hidden = !subnameVal;
      }
      setText('[data-preview-purpose]', purposeLabel());
      setText('[data-preview-price]', askingPriceSummary());
      const catVal = value('category') || 'Land';
      const subVal = value('subcategory');
      const categoryBadgeText = subVal ? `${catVal} · ${subVal.split(',')[0].trim()}` : catVal;
      for (const [selector, text] of [['[data-preview-category]', categoryBadgeText], ['[data-preview-status]', value('status') || 'Available']]) {
        const badge = $(selector); if (badge) (badge.querySelector('span') || badge).textContent = text;
      }
      const currentBgy = value('barangay')?.trim() || '';
      const previewLocBadge = $('[data-preview-location-badge]');
      const previewBgyDisplay = $('[data-preview-barangay-display]');
      if (previewLocBadge && previewBgyDisplay) {
        if (currentBgy) {
          previewBgyDisplay.textContent = `${currentBgy}, San Fernando City`;
          previewLocBadge.hidden = false;
        } else {
          previewLocBadge.hidden = true;
        }
      }

      const purpose = getListingPurpose();
      const isSaleNeg = Boolean($('[data-sale-negotiable]')?.checked);
      const isLeaseNeg = Boolean($('[data-lease-negotiable]')?.checked);
      const showNegBadge = (purpose !== 'lease' && isSaleNeg) || (purpose !== 'sale' && isLeaseNeg);
      const negBadge = $('[data-preview-negotiable-badge]');
      if (negBadge) negBadge.hidden = !showNegBadge;
      const entered = enteredAreaSqm(), located = point();
      const areaText = entered ? `${areaNumber(entered)} m² ${value('area_method') === 'survey' ? 'recorded area' : 'declared area'}` : estimatedArea ? `${areaNumber(estimatedArea)} m² plot estimate` : located ? 'Location provided · Area not specified' : 'Add an area size or location in the next step.';
      setText('[data-preview-area]', areaText);
      const areaValText = entered ? `${areaNumber(entered)} m²` : estimatedArea ? `${areaNumber(estimatedArea)} m²` : '—';
      setText('[data-preview-area-val]', areaValText);
      setText('.pw-preview-area-caption', entered ? value('area_method') === 'survey' ? 'Recorded area' : 'Declared area' : estimatedArea ? 'Drawn estimate' : 'Area not added');
      setText('[data-location-summary]',entered || estimatedArea || located ? `${entered ? `${number(entered)} m² entered` : estimatedArea ? `${number(estimatedArea)} m² estimated` : 'Area not specified'} · ${located ? 'Property pin provided' : 'Location can be added later'}` : 'Add an area or a property pin to continue.');
      $('[data-location-summary]')?.classList.toggle('is-ready',Boolean(entered || estimatedArea || located));
      if ($('[data-boundary-estimate]')) $('[data-boundary-estimate]').hidden = !estimatedArea;

      // Approval state & mobile summary
      const approvalBadge = $('[data-preview-approval-state]');
      const mobileMeta = $('[data-preview-toggle-meta]');
      const stateLabels = {
        approved: 'Published',
        pending_review: 'Pending city review',
        corrections_requested: 'Corrections requested',
        archived: 'Archived',
        draft: 'Draft · Not published'
      };
      const stateText = stateLabels[propertyApprovalState] || 'Draft · Not published';
      const stateClass = propertyApprovalState === 'approved' ? 'pw-badge-teal' : propertyApprovalState === 'pending_review' ? 'pw-badge-sky' : propertyApprovalState === 'corrections_requested' ? 'pw-badge-rose' : 'pw-badge-amber';
      if (approvalBadge) {
        approvalBadge.className = `pw-badge ${stateClass}`;
        const span = approvalBadge.querySelector('span') || approvalBadge;
        span.textContent = `• ${stateText}`;
      }
      if (mobileMeta) mobileMeta.textContent = `${stateText} · ${value('status') || 'Available'}`;

      const image = $('[data-photo-preview]');
      if (image) {
        const isRemoved = $('[data-remove-image]')?.value === '1';
        const source = isRemoved ? '' : getCoverPhotoSource();
        if (image.tagName === 'IMG') { image.hidden = !source; if (source) image.src = source; else image.removeAttribute('src'); }
        else { image.innerHTML = source ? `<img src="${escape(source)}" alt="Property photo">` : emptyPhoto; }
      }
      const propTitle = escape(value('property_name') || 'New property');
      const propSubTitle = escape(value('property_subname') || '');
      const reviewHeader = propSubTitle ? `${propTitle} <small class="pw-muted" style="font-weight:400;font-size:0.85em;">(${propSubTitle})</small>` : propTitle;
      const propertyReview = $('[data-review-property]');
      if (propertyReview) propertyReview.innerHTML = `<strong>${reviewHeader}</strong><span>${escape(value('category'))}${value('barangay') ? ` · ${escape(value('barangay'))}` : ''} · ${escape(value('status'))}</span><span>${escape(purposeLabel())} · ${escape(askingPriceSummary())}</span><span>${escape(areaText)}${located ? ` · ${coordinateLabel(located)}` : ''}</span>`;
      const summary = $('[data-review-summary]');
      if (summary) summary.innerHTML = `<div><span class="pw-eyebrow">YOUR LISTING</span><h3>${reviewHeader}</h3><p>${escape([value('category'),getClassification().primary,value('barangay'),value('status')].filter(Boolean).join(' · '))}</p><p>${escape(purposeLabel())} · ${escape(askingPriceSummary())}</p><button type="button" class="pw-text-button" data-review-edit="0">Edit listing details</button></div><div><strong>${escape(areaText)}</strong><p>${located ? `Location: ${located[0].toFixed(6)}, ${located[1].toFixed(6)}` : 'Location not yet specified'}</p>${estimatedArea && entered ? `<p class="pw-small pw-muted">Drawn estimate: ${areaNumber(estimatedArea)} m²</p>` : ''}<button type="button" class="pw-text-button" data-review-edit="1">Edit area &amp; location</button></div>`;

      // Populate 4-tier Review screen
      setText('[data-review-prop-title]', propTitle + (propSubTitle ? ` (${propSubTitle})` : ''));
      setText('[data-review-prop-category]', `${value('category') || 'Land'}${getClassification().primary ? ` · ${getClassification().primary}` : ''}`);
      setText('[data-review-prop-purpose]', purposeLabel());
      setText('[data-review-prop-price]', askingPriceSummary());
      setText('[data-review-prop-location]', currentBgy ? `${currentBgy}, San Fernando City` : 'San Fernando City');
      setText('[data-review-prop-area]', areaValText);

      const photos = getActivePhotos();
      const coverPhotoSrc = getCoverPhotoSource();
      const coverEl = $('[data-review-photo-cover]');
      if (coverEl) {
        coverEl.innerHTML = coverPhotoSrc ? `<img src="${escape(coverPhotoSrc)}" alt="Property cover" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : `<svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 5 5 3-3 4 4"/></svg>`;
      }
      setText('[data-review-photos-count]', `${photos.length} photo${photos.length === 1 ? '' : 's'} attached`);

      setText('[data-review-coords-display]', located ? `${located[0].toFixed(6)}, ${located[1].toFixed(6)}` : 'Coordinates pending');

      // Role-specific compliance presentation in Tier 4
      const dialogRole = dialog?.dataset.userRole || '';
      const isBrokerUser = dialogRole === 'seller' || dialogRole === 'broker';
      const complianceTitle = $('[data-review-compliance-title]');
      const complianceDesc = $('[data-review-compliance-desc]');
      const complianceBadge = $('[data-review-compliance-badge]');
      if (complianceTitle && complianceDesc && complianceBadge) {
        if (!isBrokerUser) {
          complianceTitle.textContent = 'City Departmental Submission';
          complianceDesc.textContent = 'Authorized CAO / LEBDO departmental submission. Authority to Sell (ATS) requirement is exempt for municipal catalog listings.';
          complianceBadge.textContent = 'Exempt';
          complianceBadge.className = 'pw-badge pw-badge-teal';
        } else {
          const authInput = $('[data-authority-file]');
          const hasFile = (authInput?.files && authInput.files.length > 0) || Boolean(existingProperty?.authorityToSell);
          complianceTitle.textContent = 'Broker Representation & Authority to Sell';
          complianceDesc.textContent = hasFile
            ? 'Authority to Sell (ATS) file staged and queued for city verification prior to public cataloging.'
            : 'Broker submission. Please ensure Authority to Sell (ATS) is uploaded in Step 1 or provided to CAO.';
          complianceBadge.textContent = hasFile ? 'Staged' : 'Pending Upload';
          complianceBadge.className = `pw-badge ${hasFile ? 'pw-badge-teal' : 'pw-badge-amber'}`;
        }
      }

      // Wire Review Actions
      all('[data-jump-review-boundary], [data-review-jump-boundary]').forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          all('[data-editor-step]').find(node => node.dataset.editorStep === '1')?.click();
          const mapCard = $('[data-location-map-card]');
          if (mapCard) mapCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const landAreaInput = field('land_area');
          if (landAreaInput) landAreaInput.focus();
        };
      });

      const revSubmitBtn = $('[data-review-submit-btn]');
      if (revSubmitBtn && !revSubmitBtn._hasListener) {
        revSubmitBtn._hasListener = true;
        revSubmitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.click();
          } else {
            form.requestSubmit();
          }
        });
      }

      // Sync reused data into Step 3 evidence banners
      setText('[data-reused-coords]', located ? coordinateLabel(located) : 'Location not yet specified');
      setText('[data-reused-barangay]', value('barangay') || 'Not specified');
      setText('[data-reused-area]', entered ? `${areaNumber(entered)} m²` : (estimatedArea ? `${areaNumber(estimatedArea)} m² (estimated)` : 'Not specified'));
      setText('[data-reused-area-econ]', entered ? `${number(entered)} m²` : (estimatedArea ? `${number(estimatedArea)} m²` : 'Not specified'));
      setText('[data-reused-price]', askingPriceSummary());
      setText('[data-reused-purpose]', purposeLabel());
      setText('[data-reused-category]', value('category') || 'Land');

      updateReviewStatus(located, entered);
    }

    function getActivePhotos() {
      const activeExisting = existingPhotoMedia.filter(m => !m.isRemoved);
      const activeNew = selectedPhotoFiles.map((file, idx) => ({
        isNew: true,
        file,
        source: file._objectUrl || (file._objectUrl = URL.createObjectURL(file)),
        name: file.name,
      }));
      let photos = [...activeExisting, ...activeNew];
      const customOrder = (typeof photoDisplayOrder !== 'undefined' && Array.isArray(photoDisplayOrder)) ? photoDisplayOrder : null;
      if (customOrder && customOrder.length > 0) {
        const keyOf = (p) => {
          if (p.isNew) {
            if (!p.file._wizardKey) p.file._wizardKey = 'new:' + Math.random().toString(36).slice(2) + ':' + p.file.name;
            return p.file._wizardKey;
          }
          return p.id != null ? 'id:' + p.id : 'src:' + p.source;
        };
        const map = new Map();
        photos.forEach(p => map.set(keyOf(p), p));
        const ordered = [];
        customOrder.forEach(k => {
          if (map.has(k)) {
            ordered.push(map.get(k));
            map.delete(k);
          }
        });
        map.forEach(p => ordered.push(p));
        photos = ordered;
      }
      const coverIndex = coverPhoto?.kind === 'new' ? photos.findIndex(item=>item.file === coverPhoto.file) : coverPhoto?.kind === 'existing' ? photos.findIndex(item=>item === coverPhoto.media) : -1;
      if (coverIndex > 0) photos.unshift(photos.splice(coverIndex,1)[0]);
      return photos;
    }

    function getCoverPhotoSource() {
      const isRemoved = $('[data-remove-image]')?.value === '1';
      if (isRemoved) return '';
      const photos = getActivePhotos();
      return photos.length > 0 ? photos[0].source : (existingImage || '');
    }

    function syncPhotoUI() {
      mediaRevision++; mediaDirty=true;
      const isRemoved = $('[data-remove-image]')?.value === '1';
      const photos = isRemoved ? [] : getActivePhotos();
      const activeBox = $('[data-photo-active-box]');
      const dropBox = $('[data-photo-drop]');
      const grid = $('[data-photo-gallery-grid]');
      const removalBadge = $('[data-photo-removal-badge]');
      const countText = $('[data-photo-count-text]');

      if (photos.length > 0) {
        if (activeBox) activeBox.hidden = false;
        if (dropBox) dropBox.hidden = true;
        if (removalBadge) removalBadge.hidden = true;
        if (countText) countText.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} added`;

        if (grid) {
          grid.innerHTML = photos.map((item, idx) => `
            <div class="pw-gallery-card ${idx === 0 ? 'is-cover' : ''}" data-gallery-idx="${idx}" draggable="true">
              <img src="${escape(item.source)}" alt="${idx === 0 ? 'Cover photo' : `Photo ${idx + 1}`}">
              <span class="pw-gallery-card-badge">${idx === 0 ? '★ Cover' : `#${idx + 1}`}</span>
              <button type="button" class="pw-gallery-card-remove" data-gallery-remove="${idx}" title="Remove photo" aria-label="Remove photo">×</button>
              <div class="pw-gallery-card-controls">
                <button type="button" class="pw-gallery-reorder-btn" data-gallery-move-left="${idx}" title="Move left" aria-label="Move left" ${idx === 0 ? 'disabled' : ''}>←</button>
                ${idx > 0 ? `<button type="button" class="pw-gallery-cover-action-btn" data-gallery-make-cover="${idx}" title="Set as cover photo">Set Cover</button>` : '<span style="flex:1;"></span>'}
                <button type="button" class="pw-gallery-reorder-btn" data-gallery-move-right="${idx}" title="Move right" aria-label="Move right" ${idx === photos.length - 1 ? 'disabled' : ''}>→</button>
              </div>
            </div>
          `).join('');

          grid.querySelectorAll('[data-gallery-remove]').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const idx = Number(btn.dataset.galleryRemove);
              removePhotoAt(idx);
            });
          });

          grid.querySelectorAll('[data-gallery-make-cover]').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const idx = Number(btn.dataset.galleryMakeCover);
              makePhotoCover(idx);
            });
          });

          grid.querySelectorAll('[data-gallery-move-left]').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const idx = Number(btn.dataset.galleryMoveLeft);
              if (idx > 0) movePhoto(idx, idx - 1);
            });
          });

          grid.querySelectorAll('[data-gallery-move-right]').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const idx = Number(btn.dataset.galleryMoveRight);
              if (idx < photos.length - 1) movePhoto(idx, idx + 1);
            });
          });

          grid.querySelectorAll('.pw-gallery-card').forEach(card => {
            const idx = Number(card.dataset.galleryIdx);
            card.addEventListener('dragstart', (e) => {
              e.dataTransfer.setData('text/plain', String(idx));
              card.classList.add('is-dragging');
            });
            card.addEventListener('dragend', () => {
              card.classList.remove('is-dragging');
              grid.querySelectorAll('.pw-gallery-card').forEach(c => c.classList.remove('is-dragover'));
            });
            card.addEventListener('dragover', (e) => {
              e.preventDefault();
              card.classList.add('is-dragover');
            });
            card.addEventListener('dragleave', () => {
              card.classList.remove('is-dragover');
            });
            card.addEventListener('drop', (e) => {
              e.preventDefault();
              card.classList.remove('is-dragover');
              const fromIdx = Number(e.dataTransfer.getData('text/plain'));
              if (!Number.isNaN(fromIdx) && fromIdx !== idx) {
                movePhoto(fromIdx, idx);
              }
            });
          });
        }
      } else {
        if (activeBox) activeBox.hidden = !isRemoved;
        if (dropBox) dropBox.hidden = isRemoved;
        if (removalBadge) removalBadge.hidden = !isRemoved;
        if (grid) grid.innerHTML = '';
        if (countText) countText.textContent = '0 photos';
      }
    }

    function removePhotoAt(idx) {
      const selected = getActivePhotos()[idx]; if (!selected) return;
      if (!selected.isNew) selected.isRemoved = true;
      else {
        const newIdx = selectedPhotoFiles.indexOf(selected.file);
        const removed = selectedPhotoFiles.splice(newIdx, 1)[0];
        if (removed?._objectUrl) {
          URL.revokeObjectURL(removed._objectUrl);
        }
      }
      if (selected === coverPhoto?.media || selected.file && selected.file === coverPhoto?.file) coverPhoto=null;
      const remaining = getActivePhotos();
      if (remaining.length === 0) {
        const removeInput = $('[data-remove-image]');
        if (removeInput) removeInput.value = '1';
      }
      syncPhotoUI();
      preview();
      queueAutosave();
    }

    function makePhotoCover(idx) {
      const selected = getActivePhotos()[idx]; if (!selected) return;
      coverPhoto = selected.isNew ? {kind:'new',file:selected.file} : {kind:'existing',media:selected};
      syncPhotoUI();
      preview();
      queueAutosave();
    }

    function movePhoto(fromIdx, toIdx) {
      const photos = getActivePhotos();
      if (fromIdx < 0 || fromIdx >= photos.length || toIdx < 0 || toIdx >= photos.length || fromIdx === toIdx) return;
      if (toIdx === 0) {
        makePhotoCover(fromIdx);
        return;
      }
      if (fromIdx === 0) {
        makePhotoCover(toIdx);
        return;
      }
      const keyOf = (p) => {
        if (p.isNew) {
          if (!p.file._wizardKey) p.file._wizardKey = 'new:' + Math.random().toString(36).slice(2) + ':' + p.file.name;
          return p.file._wizardKey;
        }
        return p.id != null ? 'id:' + p.id : 'src:' + p.source;
      };
      const keys = photos.map(keyOf);
      const moved = keys.splice(fromIdx, 1)[0];
      keys.splice(toIdx, 0, moved);
      if (typeof photoDisplayOrder !== 'undefined') {
        photoDisplayOrder = keys;
      }
      syncPhotoUI();
      preview();
      queueAutosave();
    }

    function handlePhotoFiles(files) {
      const list = Array.from(files || []);
      let added = 0;
      for (const file of list) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          notify(`"${file.name}" is not a valid JPG, PNG, or WEBP image.`, true);
          continue;
        }
        if (file.size > 8 * 1024 * 1024) {
          notify(`"${file.name}" exceeds 8 MB limit.`, true);
          continue;
        }
        selectedPhotoFiles.push(file);
        added++;
      }
      if (added > 0) {
        const removeInput = $('[data-remove-image]');
        if (removeInput) removeInput.value = '0';
      }
      syncPhotoUI();
      preview();
      if (added > 0) queueAutosave();
    }

    const photoInput = field('image_files[]') || field('image_file');
    photoInput?.addEventListener('change', event => handlePhotoFiles(event.target.files));

    $('[data-photo-add-more]')?.addEventListener('click', () => {
      (field('image_files[]') || field('image_file'))?.click();
    });

    $('[data-photo-remove-all]')?.addEventListener('click', () => {
      selectedPhotoFiles.forEach(f => { if (f._objectUrl) URL.revokeObjectURL(f._objectUrl); });
      selectedPhotoFiles = [];
      coverPhoto = null;
      existingPhotoMedia.forEach(m => { m.isRemoved = true; });
      const removeInput = $('[data-remove-image]');
      if (removeInput) removeInput.value = '1';
      syncPhotoUI();
      preview();
    });

    const drop = $('[data-photo-drop]');
    drop?.addEventListener('click', event => {
      const input = field('image_files[]') || field('image_file');
      if (input && event.target !== input) {
        input.click();
      }
    });
    drop?.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        (field('image_files[]') || field('image_file'))?.click();
      }
    });
    drop?.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('is-dragover'); });
    drop?.addEventListener('dragleave', () => drop.classList.remove('is-dragover'));
    drop?.addEventListener('drop', event => {
      event.preventDefault();
      drop.classList.remove('is-dragover');
      handlePhotoFiles(event.dataTransfer.files);
    });
    const evidenceFiles = $('[data-evidence-files]');
    function showEvidenceFiles() {
      const list=$('[data-evidence-file-list]');if(!list)return;
      const picked=[...(evidenceFiles?.files || [])];
      list.innerHTML=savedAttachments.map(file=>`<a href="${escape(apiBase)}/property-evidence.php?propertyId=${encodeURIComponent(propertyId)}&attachmentId=${encodeURIComponent(file.id)}" target="_blank" rel="noopener noreferrer">${escape(file.label)} · Saved evidence ↗</a>`).join('') + picked.map(file=>`<span>${escape(file.name)} · ${(file.size/1024).toLocaleString('en-PH',{maximumFractionDigits:0})} KB · Ready to upload</span>`).join('');
      const clear=$('[data-clear-evidence]');if(clear)clear.hidden=!picked.length;
    }
    function checkEvidenceFiles() {
      const picked=[...(evidenceFiles?.files || [])];
      if(picked.length+savedAttachments.length>4 || picked.some(file=>file.size>5*1024*1024 || file.size<1 || !['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))){
        evidenceFiles.value='';notify('Choose JPG, PNG, WEBP, or PDF evidence, up to four files total and 5 MB each.',true);
      }
      showEvidenceFiles();
    }
    evidenceFiles?.addEventListener('change',checkEvidenceFiles);
    $('[data-clear-evidence]')?.addEventListener('click',()=>{evidenceFiles.value='';showEvidenceFiles();});
    const evidenceDrop=$('[data-evidence-drop]');
    evidenceDrop?.addEventListener('dragover',event=>{event.preventDefault();evidenceDrop.classList.add('is-dragover');});
    evidenceDrop?.addEventListener('dragleave',()=>evidenceDrop.classList.remove('is-dragover'));
    evidenceDrop?.addEventListener('drop',event=>{
      event.preventDefault();evidenceDrop.classList.remove('is-dragover');
      const transfer=new DataTransfer();for(const file of event.dataTransfer.files)transfer.items.add(file);evidenceFiles.files=transfer.files;checkEvidenceFiles();
    });
    function tileMap(canvas) {
      const map = L.map(canvas, {scrollWheelZoom:false,zoomControl:false,maxZoom:19}).setView(point() || [16.615,120.316],15);
      if (window.L && L.control && L.control.zoom) {
        L.control.zoom({position: 'bottomright'}).addTo(map);
      }
      const kind = canvas.matches('[data-radar-map]') ? 'radar' : 'location';
      const feedback = $(`[data-map-feedback="${kind}"]`);
      let styleSelect = $(`[data-map-style="${kind}"]`);
      const options = {maxZoom:19,detectRetina:false,pmIgnore:true};
      const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        ...options,maxNativeZoom:19,
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
      // San Fernando imagery is available through level 18. Advertised cache levels
      // are not a coverage guarantee; higher map zooms scale the existing imagery.
      // blankTile=false turns Esri's HTTP 200 "not yet available" image into a
      // detectable 404 so missing coverage can fall back to a usable street map.
      const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?blankTile=false', {
        ...options,maxNativeZoom:18,
        attribution:'<a href="https://www.esri.com/">Esri</a>, Vantor, Earthstar Geographics, GIS User Community'
      });
      const alternateStreets = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}?blankTile=false', {
        ...options,maxNativeZoom:18,
        attribution:'<a href="https://www.esri.com/">Esri</a>, HERE, Garmin, USGS, Intermap, increment P, NRCan, Esri Japan, METI, Esri China, OpenStreetMap contributors, GIS User Community'
      });
      let activeLayer, activeStyle = 'streets', failedTiles = 0, fallbackMessage = '', failureTimer;
      const showFeedback = (text = '', state = 'ready') => {
        canvas.dataset.mapStatus = state;
        if (feedback) {feedback.textContent=text;feedback.hidden=!text;}
      };
      const updateFeedback = () => showFeedback(fallbackMessage || (activeStyle === 'satellite' && map.getZoom() > 18 ? 'Satellite imagery is enlarged from the closest available detail.' : ''));
      function useLayer(layer, style, message = '') {
        clearTimeout(failureTimer);
        activeLayer=layer;activeStyle=style;failedTiles=0;fallbackMessage=message;
        for (const candidate of [streets,satellite,alternateStreets]) if (candidate !== layer && map.hasLayer(candidate)) map.removeLayer(candidate);
        canvas.dataset.mapStyle=style;
        canvas.dataset.mapProvider=layer===streets ? 'openstreetmap' : layer===satellite ? 'esri-imagery' : 'esri-streets';
        if (styleSelect) styleSelect.value=style;
        updateFeedback();
        if (!map.hasLayer(layer)) layer.addTo(map);
      }
      function recover(layer) {
        if (layer !== activeLayer || !failedTiles) return;
        if (layer === satellite) useLayer(streets,'streets','Satellite imagery is unavailable here. Showing the street map instead.');
        else if (layer === streets) useLayer(alternateStreets,'streets','Showing an alternate street map while the usual map is unavailable.');
        else showFeedback('The map background is unavailable. You can still enter coordinates or an area size. Choose a map view to retry.','unavailable');
      }
      function queueRecovery(layer, delay = 0) {
        clearTimeout(failureTimer);
        // Defer layer removal until Leaflet has finished its tile event callback.
        failureTimer=setTimeout(() => recover(layer),delay);
      }
      for (const layer of [streets,satellite,alternateStreets]) {
        layer.on('loading',() => {if (layer===activeLayer) failedTiles=0;});
        layer.on('tileerror',() => {
          if (layer!==activeLayer) return;
          failedTiles++;
          queueRecovery(layer,failedTiles>=3 ? 0 : 1200);
        });
        layer.on('load',() => {
          if (layer!==activeLayer) return;
          if (failedTiles) queueRecovery(layer);
          else updateFeedback();
        });
      }
      if (!styleSelect) {
        const control=L.control({position:'topright'});
        control.onAdd=() => {
          const root=L.DomUtil.create('label','leaflet-bar pw-map-style-native');
          root.textContent='Map view ';
          styleSelect=L.DomUtil.create('select','',root);
          styleSelect.setAttribute('aria-label','Map view');
          styleSelect.innerHTML='<option value="streets">Streets</option><option value="satellite">Satellite</option>';
          L.DomEvent.disableClickPropagation(root);L.DomEvent.disableScrollPropagation(root);
          return root;
        };
        control.addTo(map);
      }
      styleSelect.addEventListener('change',() => useLayer(styleSelect.value==='satellite' ? satellite : streets,styleSelect.value==='satellite' ? 'satellite' : 'streets'));
      map.on('zoomend',() => {if (canvas.dataset.mapStatus!=='unavailable') updateFeedback();});
      map.on('unload',() => clearTimeout(failureTimer));
      useLayer(streets,'streets');
      L.control.zoom({position:'topright'}).addTo(map);
      return map;
    }
    const referenceIcon = () => L.divIcon({className:'pw-reference-pin',iconSize:[27,35],iconAnchor:[13,34],html:'<svg viewBox="0 0 27 35" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M13.5 34S1 21 1 13.5a12.5 12.5 0 0 1 25 0C26 21 13.5 34 13.5 34Z" fill="#132650" stroke="#fff" stroke-width="2"/><circle cx="13.5" cy="13" r="4.5" fill="#fff"/></svg>'});
    function locationStatus(text) { setText('[data-location-status]',text); }
    function place(pointValue, move = true, capture = {kind:'pin'}) {
      const rawLat = pointValue?.lat ?? (Array.isArray(pointValue) ? pointValue[0] : null);
      const rawLng = pointValue?.lng ?? (Array.isArray(pointValue) ? pointValue[1] : null);
      if (rawLat == null || rawLng == null || rawLat === '' || rawLng === '') return;
      const latNum = Number(rawLat), lngNum = Number(rawLng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum) || Math.abs(latNum) > 90 || Math.abs(lngNum) > 180) return;
      cancelSearch();$('[data-location-results]')?.replaceChildren();
      locationRevision++;
      locationCapture = capture;
      if (capture.kind !== 'device') {deviceAccuracyLayer?.remove();deviceAccuracyLayer=null;}
      if (field('lat')) field('lat').value = latNum.toFixed(6);
      if (field('lng')) field('lng').value = lngNum.toFixed(6);
      const errBox = $('[data-coordinate-error]'); if (errBox) { errBox.hidden = true; errBox.textContent = ''; }
      if (locationMethod === 'area' || ['coordinates','device','listing'].includes(capture.kind)) {
        selectLocationMethod('pin', false);
      }
      syncLocation(move, 'pin');
      if (typeof syncBarangayConflict === 'function') syncBarangayConflict();
      if (typeof syncSpatialAccessibility === 'function') syncSpatialAccessibility();
      assessHazards();
      preview();
      ready();
      updateCoordinateDetailsSummary();
      locationStatus(`Location updated (${latNum.toFixed(6)}, ${lngNum.toFixed(6)}).`);
    }
    function syncLocation(move = true, focus = 'auto') {
      if (!window.L) {locationStatus('The map could not load. Enter an area size or exact coordinates to continue.');return;}
      if (!boundaryMap) {
        boundaryMap = tileMap($('[data-location-map]'));
        boundaryMap.on('click', event => {if (!boundaryMap.pm?.globalDrawModeEnabled() && !parcelLayer?.pm?.enabled()) place(event.latlng,false);});
        boundaryMap.on('pm:create', event => {
          if (event.shape !== 'Polygon') {event.layer.remove();return;}
          history.push(boundary ? JSON.stringify(boundary) : null);
          attachBoundary(event.layer);updateBoundary();
          if (!point()) {const center=event.layer.getBounds().getCenter();place(center,false);}
          locationStatus('Boundary saved in this form. Use Edit Boundary to adjust vertices.');
        });
        boundaryMap.on('pm:drawstart', event => {
          $('[data-boundary-action="draw"]')?.classList.add('is-active');
          $('[data-map-tool="pin"]')?.classList.remove('is-active');
          event.workingLayer.on('pm:vertexadded', () => { const button=$('[data-boundary-action="undo"]');if(button)button.disabled=false; });
        });
        boundaryMap.on('pm:drawend', () => { $('[data-boundary-action="draw"]')?.classList.remove('is-active');const button=$('[data-boundary-action="undo"]');if(button)button.disabled=!history.length; });
      }
      requestAnimationFrame(() => boundaryMap.invalidateSize({pan:false}));
      const coordinates = point();
      if (coordinates) {
        if (!locationMarker) {
          locationMarker=L.marker(coordinates,{draggable:true,pmIgnore:true,title:'Property location',icon:referenceIcon()}).addTo(boundaryMap);
          locationMarker.on('drag', () => {
            const p = locationMarker.getLatLng();
            if (field('lat')) field('lat').value = p.lat.toFixed(6);
            if (field('lng')) field('lng').value = p.lng.toFixed(6);
            if (typeof syncBarangayConflict === 'function') syncBarangayConflict();
            if (typeof syncSpatialAccessibility === 'function') syncSpatialAccessibility();
          });
          locationMarker.on('dragend', () => place(locationMarker.getLatLng(),false));
        } else locationMarker.setLatLng(coordinates);
      } else {
        if (locationMarker) {locationMarker.remove();locationMarker=null;}
      }
      if (boundary && !parcelLayer) loadBoundary(boundary);
      if (move) {
        // A coordinate action owns the camera. A previously drawn plot must not
        // immediately pull it back to its old bounds.
        boundaryMap.stop();
        boundaryMap.invalidateSize({pan:false});
        const framePlot = parcelLayer && (focus === 'boundary' || (focus === 'auto' && (locationMethod === 'draw' || !coordinates)));
        if (framePlot) boundaryMap.fitBounds(parcelLayer.getBounds(),{padding:[45,45],maxZoom:18,animate:false});
        else if (coordinates) boundaryMap.setView(coordinates,Math.max(17,boundaryMap.getZoom()),{animate:false});
      }
      setTimeout(() => {
        if (boundaryMap) {
          boundaryMap.invalidateSize({pan:false});
        }
      }, 60);
    }
    function attachBoundary(layer) {
      parcelLayer?.remove();parcelLayer=layer;
      layer.setStyle({color:'#11224d',weight:2,fillColor:'#fbbf24',fillOpacity:.3});
      layer.on('pm:edit', updateBoundary);
      layer.on('pm:dragend', updateBoundary);
      layer.on('pm:markerdragstart', () => history.push(boundary ? JSON.stringify(boundary) : null));
      layer.on('pm:vertexadded', updateBoundary);
      layer.on('pm:vertexremoved', updateBoundary);
    }
    function loadBoundary(geojson) {
      if (!boundaryMap || !window.L) return;
      const layer = L.geoJSON(geojson).getLayers()[0];
      if (layer) {layer.addTo(boundaryMap);attachBoundary(layer);}
    }
    function updateBoundary(preserve = false) {
      if (parcelLayer) boundary = parcelLayer.toGeoJSON();
      else if (preserve !== true) boundary = null;
      estimatedArea = boundary && window.turf ? turf.area(boundary) : 0;
      if (field('boundary')) field('boundary').value = boundary ? JSON.stringify(boundary) : '';
      if (field('calculated_area_sqm')) {field('calculated_area_sqm').value=estimatedArea ? String(estimatedArea) : '';field('calculated_area_sqm').dispatchEvent(new Event('input',{bubbles:true}));}
      if(value('reference_label')==='center' && boundary)setReference(point());
      setText('[data-calculated-area]',estimatedArea ? Math.round(estimatedArea).toLocaleString('en-PH') : '—');
      setText('[data-calculated-hectares]',estimatedArea ? (estimatedArea/10000).toLocaleString('en-PH',{maximumFractionDigits:4}) : '—');
      all('[data-boundary-action="edit"],[data-boundary-action="reset"]').forEach(button => {button.disabled=!boundary;});
      const undo = $('[data-boundary-action="undo"]');if (undo) undo.disabled=!history.length;
      syncAreaEquivalents();
      preview();assessHazards();ready();
    }
    $('[data-map-tool="pin"]')?.addEventListener('click', () => {
      selectLocationMethod('pin', false);
      boundaryMap?.pm?.disableDraw();
      parcelLayer?.pm?.disable();
      $('[data-map-tool="pin"]')?.classList.add('is-active');
      $('[data-boundary-action="draw"]')?.classList.remove('is-active');
      $('[data-boundary-action="edit"]')?.classList.remove('is-active');
      locationStatus('Place Pin active: click anywhere on the map or enter coordinates to set the property marker.');
    });
    all('[data-boundary-action]').forEach(button => button.addEventListener('click', () => {
      syncLocation(false);
      if (!boundaryMap?.pm || !window.turf) {locationStatus('Drawing tools could not load. Enter an area size or exact coordinates to continue.');return;}
      const action=button.dataset.boundaryAction;
      if (action === 'draw') {
        $('[data-map-tool="pin"]')?.classList.remove('is-active');
        $('[data-boundary-action="draw"]')?.classList.add('is-active');
        $('[data-boundary-action="edit"]')?.classList.remove('is-active');
        parcelLayer?.pm.disable();boundaryMap.pm.enableDraw('Polygon',{allowSelfIntersection:false,snappable:true,pathOptions:{color:'#11224d',fillColor:'#fbbf24',fillOpacity:.3}});
        locationStatus('Click each corner of the parcel. Click the first point again to close the boundary.');
      } else if (action === 'edit' && parcelLayer) {
        boundaryMap.pm.disableDraw();
        if (parcelLayer.pm.enabled()) {parcelLayer.pm.disable();button.classList.remove('is-active');locationStatus('Boundary updated.');}
        else {history.push(JSON.stringify(boundary));parcelLayer.pm.enable({allowSelfIntersection:false});button.classList.add('is-active');locationStatus('Drag the boundary points to match the parcel. Click Edit Boundary again when finished.');}
      } else if (action === 'undo') {
        if (boundaryMap.pm.globalDrawModeEnabled()) {boundaryMap.pm.Draw.Polygon?._removeLastVertex?.();return;}
        const previous=history.pop();parcelLayer?.remove();parcelLayer=null;boundary=previous ? JSON.parse(previous) : null;if (boundary) loadBoundary(boundary);updateBoundary();
      } else if (action === 'reset') {
        boundaryMap.pm.disableDraw();history.push(boundary ? JSON.stringify(boundary) : null);parcelLayer?.remove();parcelLayer=null;updateBoundary();
        $('[data-map-tool="pin"]')?.classList.add('is-active');
        $('[data-boundary-action="draw"]')?.classList.remove('is-active');
        $('[data-boundary-action="edit"]')?.classList.remove('is-active');
        locationStatus('Boundary cleared. Draw the property outline again or place a pin.');
      } else if (action === 'coords-view') {
        toggleVertexDrawer();
      }
    }));
    function toggleVertexDrawer() {
      const drawer = $('[data-vertex-drawer]');
      if (!drawer) return;
      drawer.hidden = !drawer.hidden;
      if (!drawer.hidden) renderVertexDrawer();
    }
    $('[data-close-vertex-drawer]')?.addEventListener('click', () => {
      const drawer = $('[data-vertex-drawer]'); if (drawer) drawer.hidden = true;
    });
    function renderVertexDrawer() {
      const listEl = $('[data-vertex-list]');
      if (!listEl) return;
      listEl.innerHTML = '';
      const coords = boundary?.geometry?.coordinates?.[0] || [];
      if (!coords.length) {
        listEl.innerHTML = '<p class="pw-small pw-muted">No polygon boundary drawn yet. Click "Draw Boundary" on the map first.</p>';
        return;
      }
      const uniquePoints = coords.slice(0, -1);
      uniquePoints.forEach((pt, idx) => {
        const row = document.createElement('div');
        row.className = 'pw-vertex-row';
        row.innerHTML = `<span>#${idx + 1}</span><label class="pw-sr-only" for="v_lat_${idx}">Vertex ${idx + 1} Latitude</label><input id="v_lat_${idx}" type="number" step="any" data-v-lat value="${pt[1].toFixed(6)}" placeholder="Lat"><label class="pw-sr-only" for="v_lng_${idx}">Vertex ${idx + 1} Longitude</label><input id="v_lng_${idx}" type="number" step="any" data-v-lng value="${pt[0].toFixed(6)}" placeholder="Lng">`;
        listEl.append(row);
      });
    }
    $('[data-apply-vertices]')?.addEventListener('click', () => {
      const lats = all('[data-v-lat]').map(el => Number(el.value));
      const lngs = all('[data-v-lng]').map(el => Number(el.value));
      if (lats.length < 3 || lats.some(v => !Number.isFinite(v) || Math.abs(v) > 90) || lngs.some(v => !Number.isFinite(v) || Math.abs(v) > 180)) {
        notify('Polygon requires at least 3 valid coordinate pairs.', true);
        return;
      }
      const ring = lats.map((lat, idx) => [lngs[idx], lat]);
      ring.push(ring[0].slice());
      const newGeojson = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] } };
      parcelLayer?.remove(); parcelLayer = null;
      loadBoundary(newGeojson);
      updateBoundary();
      boundaryMap?.fitBounds(parcelLayer.getBounds(), { padding: [30, 30] });
      const drawer = $('[data-vertex-drawer]'); if (drawer) drawer.hidden = true;
      notify('Polygon boundary updated from coordinates.');
    });
    const BARANGAY_COORDINATES = {
      "Barangay I": { "lat": 16.6162, "lng": 120.3172, "district": "Poblacion" },
      "Barangay II": { "lat": 16.6151, "lng": 120.3181, "district": "Poblacion" },
      "Barangay III": { "lat": 16.6170, "lng": 120.3160, "district": "Poblacion" },
      "Barangay IV": { "lat": 16.6143, "lng": 120.3165, "district": "Poblacion" },
      "Ilocanos Sur": { "lat": 16.6135, "lng": 120.3190, "district": "Downtown Core" },
      "Ilocanos Norte": { "lat": 16.6185, "lng": 120.3150, "district": "Downtown Core" },
      "Pagdaraoan": { "lat": 16.6232, "lng": 120.3198, "district": "North Urban" },
      "Catbangen": { "lat": 16.6155, "lng": 120.3135, "district": "Downtown West" },
      "Parian": { "lat": 16.6128, "lng": 120.3176, "district": "South Downtown" },
      "Madaydegdeg": { "lat": 16.5935, "lng": 120.3145, "district": "South Coastal" },
      "Canaoay": { "lat": 16.5936, "lng": 120.3023, "district": "South Coastal" },
      "Poro": { "lat": 16.6067, "lng": 120.3048, "district": "Poro Point Special Economic Zone" },
      "San Agustin": { "lat": 16.5980, "lng": 120.3270, "district": "South Urban" },
      "San Francisco": { "lat": 16.601558, "lng": 120.304946, "district": "Port Zone" },
      "Carlatan": { "lat": 16.6385, "lng": 120.3160, "district": "North Corridor" },
      "Dalumpinas Este": { "lat": 16.647289, "lng": 120.326179, "district": "North Corridor" },
      "Dalumpinas Oeste": { "lat": 16.650753, "lng": 120.315648, "district": "North Coastal" },
      "Lingsat": { "lat": 16.6290, "lng": 120.3168, "district": "North Urban" },
      "Abut": { "lat": 16.6432, "lng": 120.3541, "district": "Northeast Rural" },
      "Bangcusay": { "lat": 16.6480, "lng": 120.3195, "district": "North Industrial" },
      "Bato": { "lat": 16.6535, "lng": 120.3340, "district": "North Rural" },
      "Biday": { "lat": 16.6340, "lng": 120.3250, "district": "Commercial North" },
      "Mameltac": { "lat": 16.636780, "lng": 120.339418, "district": "Northeast Urban" },
      "Namtutan": { "lat": 16.622679, "lng": 120.352228, "district": "East Upland" },
      "Saoay": { "lat": 16.637580, "lng": 120.351397, "district": "Northeast Upland" },
      "Pagdalagan": { "lat": 16.578966, "lng": 120.321938, "district": "South Highway" },
      "Pagudpud": { "lat": 16.6090, "lng": 120.3305, "district": "East Urban" },
      "San Vicente": { "lat": 16.587286, "lng": 120.310375, "district": "South Coastal" },
      "Sevilla": { "lat": 16.6010, "lng": 120.3220, "district": "Commercial South / Robinsons Hub" },
      "Birunget": { "lat": 16.585732, "lng": 120.351443, "district": "Southeast Rural" },
      "Bungro": { "lat": 16.577902, "lng": 120.332847, "district": "South Highway" },
      "Narra Este": { "lat": 16.586982, "lng": 120.343877, "district": "Southeast Rural" },
      "Narra Oeste": { "lat": 16.590241, "lng": 120.338802, "district": "South Rural" },
      "Sagayad": { "lat": 16.5985, "lng": 120.3305, "district": "East Foothills" },
      "Sibuan-Otong": { "lat": 16.573832, "lng": 120.346712, "district": "Southeast Rural" },
      "Tanquigan": { "lat": 16.577578, "lng": 120.342450, "district": "Southeast Rural" },
      "Cabaroan": { "lat": 16.6255, "lng": 120.3330, "district": "East Residential" },
      "Dallangayan Oeste": { "lat": 16.623902, "lng": 120.335840, "district": "East Central" },
      "Santiago Sur": { "lat": 16.609653, "lng": 120.331109, "district": "Central East" },
      "Tanqui": { "lat": 16.6205, "lng": 120.3215, "district": "Commercial East" },
      "Cadaclan": { "lat": 16.606388, "lng": 120.353085, "district": "East Upland" },
      "Camansi": { "lat": 16.613339, "lng": 120.347770, "district": "East Upland" },
      "Dallangayan Este": { "lat": 16.622252, "lng": 120.343227, "district": "East Central" },
      "Langcuas": { "lat": 16.611334, "lng": 120.344115, "district": "East Upland" },
      "Pias": { "lat": 16.615508, "lng": 120.354351, "district": "East Upland" },
      "Santiago Norte": { "lat": 16.616521, "lng": 120.336977, "district": "Central East" },
      "Cabarsican": { "lat": 16.582706, "lng": 120.382212, "district": "Southeast Mountains" },
      "Masicong": { "lat": 16.566880, "lng": 120.378499, "district": "Southeast Mountains" },
      "Nagyubuyuban": { "lat": 16.637196, "lng": 120.421833, "district": "Eastern Highlands" },
      "Pacpaco": { "lat": 16.614559, "lng": 120.416951, "district": "Eastern Highlands" },
      "Pao Norte": { "lat": 16.603691, "lng": 120.392275, "district": "Eastern Highlands" },
      "Pao Sur": { "lat": 16.591312, "lng": 120.385473, "district": "Eastern Highlands" },
      "Sacyud": { "lat": 16.584731, "lng": 120.392940, "district": "Eastern Highlands" },
      "Apaleng": { "lat": 16.596525, "lng": 120.375109, "district": "Eastern Foothills" },
      "Bacsil": { "lat": 16.617142, "lng": 120.376012, "district": "East Rural" },
      "Bangbangolan": { "lat": 16.627448, "lng": 120.382975, "district": "East Upland" },
      "Baraoas": { "lat": 16.628271, "lng": 120.397658, "district": "Eastern Highlands" },
      "Calabugao": { "lat": 16.6215, "lng": 120.3892, "district": "East Upland" },
      "Puspus": { "lat": 16.633026, "lng": 120.371244, "district": "East Upland" }
    };

    function normalizeBarangay(rawInput) {
      return String(rawInput || '').trim().split(/[·•]/)[0].toLowerCase()
        .replace(/(?:,\s*|\s+)(?:city of\s+)?san fernando(?:\s+city)?(?:[,\s]+la union)?(?:[,\s]+philippines)?$/i, '')
        .replace(/^(?:barangay|baranggay|brgy\.?|bgy\.?)\s+/i, '')
        .replace(/[-\s]+/g, ' ').trim().replace(/^[1-4]$/, number => ['I','II','III','IV'][Number(number)-1].toLowerCase());
    }
    function barangayMatches(rawInput) {
      const clean = normalizeBarangay(rawInput);
      if (!clean) return [];
      const list = config.barangays && Object.keys(config.barangays).length ? config.barangays : BARANGAY_COORDINATES;
      return Object.entries(list).map(([name, info]) => {
        const norm = normalizeBarangay(name);
        const aliases = (info.aliases || []).map(a => ({ raw: a, norm: normalizeBarangay(a) }));
        const matchedAlias = aliases.find(a => a.norm === clean);
        let rank = norm === clean ? 0 : matchedAlias ? 0 : norm.startsWith(clean) || aliases.some(a => a.norm.startsWith(clean)) ? 1 : norm.includes(clean) || aliases.some(a => a.norm.includes(clean)) ? 2 : 3;
        const resName = (rank === 0 && matchedAlias) ? matchedAlias.raw : name;
        return {
          name: resName, label: resName, barangay: resName, kind: 'barangay',
          psgc: info.psgc || '', psgc10: info.psgc10 || '',
          lat: Number(info.lat), lng: Number(info.lng),
          district: info.district || '', approximate: true, source: 'Local barangay reference',
          rank
        };
      }).filter(item => item.rank < 3 && Number.isFinite(item.lat) && Number.isFinite(item.lng) && Math.abs(item.lat) <= 90 && Math.abs(item.lng) <= 180)
        .sort((a,b) => a.rank - b.rank || a.name.localeCompare(b.name));
    }
    function lookupExactBarangay(rawInput) {
      return barangayMatches(rawInput).find(item => item.rank === 0) || null;
    }
    function cancelSearch() {
      clearTimeout(searchTimer);
      searchController?.abort();
      searchRevision++;
      const button=$('[data-location-search-button]');
      if (button) {button.disabled=false;button.textContent='Search';}
      $('[data-location-results]')?.removeAttribute('aria-busy');
    }
    function navigateLocation(item, notifyUser = true) {
      locationRevision++;
      if (locationMethod === 'area') selectLocationMethod('pin', false);
      if (item.kind === 'barangay' && field('barangay') && document.activeElement !== field('barangay')) field('barangay').value=item.barangay || item.name;
      syncLocation(false);
      if (boundaryMap) {
        boundaryMap.stop();
        boundaryMap.invalidateSize();
        const bounds = item.bounds;
        if (Array.isArray(bounds) && bounds.length === 2 && bounds.every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(Number.isFinite))) {
          boundaryMap.fitBounds(bounds,{padding:[30,30],maxZoom:16,animate:false});
        } else boundaryMap.setView([+item.lat,+item.lng],item.kind === 'barangay' ? 15 : 18,{animate:false});
      }
      const name=item.name || item.label || 'Selected area';
      locationStatus(`${name} · approximate ${item.kind === 'barangay' ? 'barangay reference' : 'search location'}. ${point() ? 'Your property pin is unchanged. ' : ''}Click the property on the map to set its location.`);
      if (notifyUser) notify(`${name} is in view. Place the pin on the property when ready.`);
      updateCoordinateDetailsSummary();preview();ready();
    }
    function proceedToBarangay(name, notifyUser = true) {
      const match = lookupExactBarangay(name);
      if (!match) return false;
      navigateLocation(match,notifyUser);
      return true;
    }
    function renderLocationResults(matches) {
      const list=$('[data-location-results]');
      if (!list) return;
      list.replaceChildren();
      matches.slice(0,8).forEach(item => {
        const result=document.createElement('button');
        result.type='button';result.className='pw-search-result';
        const source = item.source || (item.kind === 'barangay' ? 'Local barangay reference' : 'Location search');
        result.innerHTML=`<strong>${escape(item.label || item.name)}</strong><small>${escape(item.subtitle || item.district || 'San Fernando, La Union')}</small><span class="pw-location-result-meta">${escape(item.kind === 'property' ? 'Existing property pin · confirm position' : 'Approximate area · place your property pin')}${source ? ` · ${escape(source)}` : ''}</span>`;
        result.addEventListener('click', () => {
          cancelSearch();
          if (item.kind === 'property') place({lat:+item.lat,lng:+item.lng},true,{kind:'listing'});
          else navigateLocation(item);
          list.replaceChildren();
          if (searchInput) searchInput.value=item.label || item.name;
        });
        list.append(result);
      });
    }
    field('barangay')?.addEventListener('input', () => {
      cancelSearch();
      const match=lookupExactBarangay(value('barangay'));
      if (match) searchTimer=setTimeout(() => navigateLocation(match,false),200);
    });
    field('barangay')?.addEventListener('change', () => {
      cancelSearch();
      if (!proceedToBarangay(value('barangay'))) {
        const matches=barangayMatches(value('barangay'));
        if (matches.length) {renderLocationResults(matches);locationStatus('Choose the matching barangay from the results.');}
      }
    });

    // =========================================================================
    // STEP 1: SEARCHABLE BARANGAY COMBOBOX CONTROLLER (59 SFC BARANGAYS)
    // =========================================================================
    const OFFICIAL_SFC_BARANGAYS = [
      { name: "Abut", psgc: "013314001", district: "Northeast Rural" },
      { name: "Apaleng", psgc: "013314002", district: "Eastern Foothills" },
      { name: "Bacsil", psgc: "013314003", district: "East Rural" },
      { name: "Bangbangolan", psgc: "013314004", district: "East Upland" },
      { name: "Bangcusay", psgc: "013314005", district: "North Industrial" },
      { name: "Barangay I", psgc: "013314006", district: "Poblacion" },
      { name: "Barangay II", psgc: "013314007", district: "Poblacion" },
      { name: "Barangay III", psgc: "013314008", district: "Poblacion" },
      { name: "Barangay IV", psgc: "013314009", district: "Poblacion" },
      { name: "Baraoas", psgc: "013314010", district: "Eastern Highlands" },
      { name: "Bato", psgc: "013314011", district: "North Rural" },
      { name: "Biday", psgc: "013314012", district: "Commercial North" },
      { name: "Birunget", psgc: "013314013", district: "Southeast Rural" },
      { name: "Bungro", psgc: "013314014", district: "South Highway" },
      { name: "Cabaroan", psgc: "013314015", district: "East Residential" },
      { name: "Cabarsican", psgc: "013314016", district: "Southeast Mountains" },
      { name: "Cadaclan", psgc: "013314017", district: "East Upland" },
      { name: "Calabugao", psgc: "013314018", district: "East Upland" },
      { name: "Camansi", psgc: "013314019", district: "East Upland" },
      { name: "Canaoay", psgc: "013314020", district: "South Coastal" },
      { name: "Carlatan", psgc: "013314021", district: "North Corridor" },
      { name: "Catbangen", psgc: "013314022", district: "Downtown West" },
      { name: "Dallangayan Este", psgc: "013314023", district: "East Central" },
      { name: "Dallangayan Oeste", psgc: "013314024", district: "East Central" },
      { name: "Dalumpinas Este", psgc: "013314025", district: "North Corridor" },
      { name: "Dalumpinas Oeste", psgc: "013314026", district: "North Coastal" },
      { name: "Ilocanos Norte", psgc: "013314027", district: "Downtown Core" },
      { name: "Ilocanos Sur", psgc: "013314028", district: "Downtown Core" },
      { name: "Langcuas", psgc: "013314029", district: "East Upland" },
      { name: "Lingsat", psgc: "013314030", district: "North Urban" },
      { name: "Madayegdeg", psgc: "013314031", district: "South Coastal", aliases: ["Madaydegdeg"] },
      { name: "Mameltac", psgc: "013314032", district: "Northeast Urban" },
      { name: "Masicong", psgc: "013314033", district: "Southeast Mountains" },
      { name: "Nagyubuyuban", psgc: "013314034", district: "Eastern Highlands" },
      { name: "Namtutan", psgc: "013314035", district: "East Upland" },
      { name: "Narra Este", psgc: "013314036", district: "Southeast Rural" },
      { name: "Narra Oeste", psgc: "013314037", district: "South Rural" },
      { name: "Pacpaco", psgc: "013314038", district: "Eastern Highlands" },
      { name: "Pagdalagan", psgc: "013314039", district: "South Highway" },
      { name: "Pagdaraoan", psgc: "013314040", district: "North Urban" },
      { name: "Pagudpud", psgc: "013314041", district: "East Urban" },
      { name: "Pao Norte", psgc: "013314042", district: "Eastern Highlands" },
      { name: "Pao Sur", psgc: "013314043", district: "Eastern Highlands" },
      { name: "Parian", psgc: "013314044", district: "South Downtown" },
      { name: "Pias", psgc: "013314045", district: "East Upland" },
      { name: "Poro", psgc: "013314046", district: "Poro Point Special Economic Zone" },
      { name: "Puspus", psgc: "013314047", district: "East Upland" },
      { name: "Sacyud", psgc: "013314048", district: "Eastern Highlands" },
      { name: "Sagayad", psgc: "013314049", district: "East Foothills" },
      { name: "San Agustin", psgc: "013314050", district: "South Urban" },
      { name: "San Francisco", psgc: "013314051", district: "Port Zone" },
      { name: "San Vicente", psgc: "013314052", district: "South Coastal" },
      { name: "Santiago Norte", psgc: "013314053", district: "Central East" },
      { name: "Santiago Sur", psgc: "013314054", district: "Central East" },
      { name: "Saoay", psgc: "013314055", district: "Northeast Upland" },
      { name: "Sevilla", psgc: "013314056", district: "Commercial South / Robinsons Hub" },
      { name: "Siboan-Otong", psgc: "013314057", district: "Southeast Rural", aliases: ["Sibuan-Otong"] },
      { name: "Tanqui", psgc: "013314058", district: "Commercial East" },
      { name: "Tanquigan", psgc: "013314059", district: "Southeast Rural" }
    ];

    function getAllOfficialBarangays() {
      const cfg = config.barangays;
      if (cfg && typeof cfg === 'object' && Object.keys(cfg).length > 0) {
        return OFFICIAL_SFC_BARANGAYS.map(b => {
          const remote = cfg[b.name];
          return remote ? { ...b, ...remote, name: b.name } : b;
        });
      }
      return OFFICIAL_SFC_BARANGAYS;
    }

    function findExactOfficialBarangay(input) {
      const raw = String(input || '').trim();
      if (!raw) return null;
      const clean = normalizeBarangay(raw);
      const list = getAllOfficialBarangays();
      return list.find(item => {
        if (normalizeBarangay(item.name) === clean) return true;
        if (item.name.toLowerCase() === raw.toLowerCase()) return true;
        if ((item.aliases || []).some(a => normalizeBarangay(a) === clean || a.toLowerCase() === raw.toLowerCase())) return true;
        if (item.psgc === raw || item.psgc10 === raw) return true;
        return false;
      }) || null;
    }

    function filterOfficialBarangays(query) {
      const list = getAllOfficialBarangays();
      const raw = String(query || '').trim();
      if (!raw) return list;
      const clean = normalizeBarangay(raw);
      const lower = raw.toLowerCase();
      return list.filter(item => {
        const itemNorm = normalizeBarangay(item.name);
        const itemNameLower = item.name.toLowerCase();
        const districtLower = (item.district || '').toLowerCase();
        const aliasMatch = (item.aliases || []).some(a => normalizeBarangay(a).includes(clean) || a.toLowerCase().includes(lower));
        const psgcMatch = item.psgc && item.psgc.includes(raw);
        return itemNorm.includes(clean) || itemNameLower.includes(lower) || districtLower.includes(lower) || aliasMatch || psgcMatch;
      });
    }

    const RECENT_BARANGAYS_KEY = 'sfc_recent_barangays';
    function getRecentBarangayList() {
      try {
        const stored = localStorage.getItem(RECENT_BARANGAYS_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(name => findExactOfficialBarangay(name) !== null).slice(0, 5);
      } catch {
        return [];
      }
    }

    function recordRecentBarangay(name) {
      try {
        const exact = findExactOfficialBarangay(name);
        if (!exact) return;
        const current = getRecentBarangayList().filter(n => n !== exact.name);
        current.unshift(exact.name);
        localStorage.setItem(RECENT_BARANGAYS_KEY, JSON.stringify(current.slice(0, 5)));
      } catch {}
    }

    const bgyCombobox = $('[data-barangay-combobox]');
    const bgyTextInput = $('#pwBarangayTextInput');
    const bgyHiddenInput = $('#pwBarangayHidden');
    const bgyPsgcHiddenInput = $('#pwBarangayPsgcHidden');
    const bgyClearBtn = $('[data-barangay-clear-btn]');
    const bgyToggleBtn = $('[data-barangay-toggle-btn]');
    const bgyDropdown = $('#pwBarangayDropdown');
    const bgyRecentsWrap = $('[data-barangay-recents-wrap]');
    const bgyRecentsPills = $('[data-barangay-recent-pills]');
    const bgyScrollList = $('[data-barangay-scroll-list]');
    const bgyCountLabel = $('[data-barangay-menu-count]');
    const bgyNoResults = $('[data-barangay-no-results]');
    const bgyPsgcTag = $('[data-barangay-psgc-tag]');
    const step2SyncInput = $('[data-location-barangay-sync]');

    let activeBgyHighlightIndex = -1;
    let bgyBlurTimeout = null;

    function highlightMatchText(text, query) {
      if (!query || !query.trim()) return escape(text);
      const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = text.split(new RegExp(`(${q})`, 'gi'));
      return parts.map(part => part.toLowerCase() === query.trim().toLowerCase() ? `<mark class="pw-highlight">${escape(part)}</mark>` : escape(part)).join('');
    }

    function renderBarangayDropdown(query = '') {
      if (!bgyDropdown || !bgyScrollList) return;
      const cleanQ = String(query || '').trim();
      activeBgyHighlightIndex = -1;

      const recents = getRecentBarangayList();
      if (!cleanQ && recents.length > 0 && bgyRecentsWrap && bgyRecentsPills) {
        bgyRecentsWrap.hidden = false;
        bgyRecentsPills.innerHTML = recents.map(name => `
          <button type="button" class="pw-barangay-recent-chip" data-bgy-recent="${escape(name)}">
            <span class="pw-chip-pin">📍</span> ${escape(name)}
          </button>
        `).join('');
        bgyRecentsPills.querySelectorAll('[data-bgy-recent]').forEach(chip => {
          chip.addEventListener('mousedown', e => {
            e.preventDefault();
            selectBarangayOption(chip.dataset.bgyRecent, true);
          });
        });
      } else if (bgyRecentsWrap) {
        bgyRecentsWrap.hidden = true;
      }

      const matches = filterOfficialBarangays(cleanQ);
      const currentSelected = bgyHiddenInput?.value || '';

      if (matches.length > 0) {
        if (bgyNoResults) bgyNoResults.hidden = true;
        bgyScrollList.hidden = false;
        if (bgyCountLabel) {
          bgyCountLabel.textContent = cleanQ ? `Matching (${matches.length})` : 'San Fernando City (59 Barangays)';
        }

        bgyScrollList.innerHTML = matches.map((item, idx) => {
          const isSelected = item.name === currentSelected;
          return `
            <div class="pw-barangay-item ${isSelected ? 'is-selected' : ''}" role="option" aria-selected="${isSelected}" data-bgy-idx="${idx}" data-bgy-name="${escape(item.name)}">
              <div class="pw-barangay-item-main">
                <span class="pw-barangay-item-name">${highlightMatchText(item.name, cleanQ)}</span>
                <span class="pw-barangay-item-district">${escape(item.district || 'San Fernando City')}</span>
              </div>
              <span class="pw-barangay-psgc-tag">PSGC ${escape(item.psgc)}</span>
            </div>
          `;
        }).join('');

        bgyScrollList.querySelectorAll('.pw-barangay-item').forEach(item => {
          item.addEventListener('mousedown', e => {
            e.preventDefault();
            selectBarangayOption(item.dataset.bgyName, true);
          });
        });
      } else {
        bgyScrollList.hidden = true;
        if (bgyNoResults) bgyNoResults.hidden = false;
        if (bgyCountLabel) bgyCountLabel.textContent = 'No matching barangay';
      }
    }

    function openBarangayDropdown() {
      if (!bgyDropdown) return;
      bgyDropdown.hidden = false;
      bgyTextInput?.setAttribute('aria-expanded', 'true');
      renderBarangayDropdown(bgyTextInput?.value === bgyHiddenInput?.value ? '' : (bgyTextInput?.value || ''));
      bgyCombobox?.classList.add('is-open');
    }

    function closeBarangayDropdown() {
      if (!bgyDropdown) return;
      bgyDropdown.hidden = true;
      bgyTextInput?.setAttribute('aria-expanded', 'false');
      bgyCombobox?.classList.remove('is-open');
      activeBgyHighlightIndex = -1;
    }

    function selectBarangayOption(nameOrItem, moveMap = true) {
      const match = typeof nameOrItem === 'object' && nameOrItem !== null ? nameOrItem : findExactOfficialBarangay(nameOrItem);
      if (!match) return false;

      if (bgyHiddenInput) {
        bgyHiddenInput.value = match.name;
        bgyHiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
        bgyHiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (bgyPsgcHiddenInput) bgyPsgcHiddenInput.value = match.psgc;
      if (bgyTextInput) {
        bgyTextInput.value = match.name;
        bgyTextInput.setAttribute('aria-invalid', 'false');
      }
      if (bgyClearBtn) bgyClearBtn.hidden = false;
      if (bgyPsgcTag) {
        bgyPsgcTag.textContent = `PSGC: ${match.psgc}`;
        bgyPsgcTag.hidden = false;
      }
      if (step2SyncInput) step2SyncInput.value = match.name;

      recordRecentBarangay(match.name);
      clearFieldError('barangay');
      closeBarangayDropdown();

      if (moveMap) proceedToBarangay(match.name, false);

      preview();
      queueAutosave();
      return true;
    }

    function clearBarangaySelection() {
      if (bgyHiddenInput) {
        bgyHiddenInput.value = '';
        bgyHiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
        bgyHiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (bgyPsgcHiddenInput) bgyPsgcHiddenInput.value = '';
      if (bgyTextInput) bgyTextInput.value = '';
      if (bgyClearBtn) bgyClearBtn.hidden = true;
      if (bgyPsgcTag) bgyPsgcTag.hidden = true;
      if (step2SyncInput) step2SyncInput.value = '';

      closeBarangayDropdown();
      preview();
      queueAutosave();
    }

    function syncBarangayFromHidden() {
      const val = bgyHiddenInput?.value || '';
      if (val) {
        const match = findExactOfficialBarangay(val);
        if (match) {
          if (bgyTextInput) bgyTextInput.value = match.name;
          if (bgyPsgcHiddenInput) bgyPsgcHiddenInput.value = match.psgc;
          if (bgyClearBtn) bgyClearBtn.hidden = false;
          if (bgyPsgcTag) {
            bgyPsgcTag.textContent = `PSGC: ${match.psgc}`;
            bgyPsgcTag.hidden = false;
          }
          if (step2SyncInput) step2SyncInput.value = match.name;
          return;
        }
      }
      if (bgyTextInput) bgyTextInput.value = '';
      if (bgyClearBtn) bgyClearBtn.hidden = true;
      if (bgyPsgcTag) bgyPsgcTag.hidden = true;
      if (step2SyncInput) step2SyncInput.value = '';
    }

    if (bgyTextInput) {
      bgyTextInput.addEventListener('focus', () => {
        clearTimeout(bgyBlurTimeout);
        openBarangayDropdown();
      });

      bgyTextInput.addEventListener('input', () => {
        clearTimeout(bgyBlurTimeout);
        openBarangayDropdown();
        renderBarangayDropdown(bgyTextInput.value);
        if (bgyClearBtn) bgyClearBtn.hidden = !bgyTextInput.value;
      });

      bgyTextInput.addEventListener('blur', () => {
        bgyBlurTimeout = setTimeout(() => {
          const typed = bgyTextInput.value.trim();
          if (typed) {
            const exact = findExactOfficialBarangay(typed);
            if (exact) {
              selectBarangayOption(exact, false);
            } else if (bgyHiddenInput?.value) {
              bgyTextInput.value = bgyHiddenInput.value;
            } else {
              clearBarangaySelection();
            }
          } else {
            clearBarangaySelection();
          }
          closeBarangayDropdown();
        }, 180);
      });

      bgyTextInput.addEventListener('keydown', e => {
        if (!bgyDropdown || bgyDropdown.hidden) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openBarangayDropdown();
            return;
          }
        }
        const items = bgyScrollList ? [...bgyScrollList.querySelectorAll('.pw-barangay-item')] : [];
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (items.length === 0) return;
          activeBgyHighlightIndex = (activeBgyHighlightIndex + 1) % items.length;
          items.forEach((item, idx) => {
            item.classList.toggle('is-highlighted', idx === activeBgyHighlightIndex);
            if (idx === activeBgyHighlightIndex) item.scrollIntoView({ block: 'nearest' });
          });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (items.length === 0) return;
          activeBgyHighlightIndex = (activeBgyHighlightIndex - 1 + items.length) % items.length;
          items.forEach((item, idx) => {
            item.classList.toggle('is-highlighted', idx === activeBgyHighlightIndex);
            if (idx === activeBgyHighlightIndex) item.scrollIntoView({ block: 'nearest' });
          });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (activeBgyHighlightIndex >= 0 && items[activeBgyHighlightIndex]) {
            selectBarangayOption(items[activeBgyHighlightIndex].dataset.bgyName, true);
          } else {
            const exact = findExactOfficialBarangay(bgyTextInput.value);
            if (exact) {
              selectBarangayOption(exact, true);
            } else if (items.length === 1) {
              selectBarangayOption(items[0].dataset.bgyName, true);
            }
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeBarangayDropdown();
        }
      });
    }

    bgyClearBtn?.addEventListener('click', e => {
      e.stopPropagation();
      clearBarangaySelection();
      bgyTextInput?.focus();
    });

    bgyToggleBtn?.addEventListener('click', e => {
      e.stopPropagation();
      if (bgyDropdown && !bgyDropdown.hidden) {
        closeBarangayDropdown();
      } else {
        bgyTextInput?.focus();
        openBarangayDropdown();
      }
    });

    document.addEventListener('click', e => {
      if (bgyCombobox && !bgyCombobox.contains(e.target)) {
        closeBarangayDropdown();
      }
    });

    step2SyncInput?.addEventListener('input', () => {
      const match = findExactOfficialBarangay(step2SyncInput.value);
      if (match) {
        selectBarangayOption(match, false);
      }
    });
    step2SyncInput?.addEventListener('change', () => {
      const match = findExactOfficialBarangay(step2SyncInput.value);
      if (match) {
        selectBarangayOption(match, false);
      }
    });
    const searchInput = $('[data-location-search]');
    searchInput?.addEventListener('input', () => {
      cancelSearch();
      const query=searchInput.value.trim(), matches=barangayMatches(query);
      renderLocationResults(matches);
      if (!query) return;
      const exact=matches.find(item=>item.rank===0);
      if (exact) searchTimer=setTimeout(() => {navigateLocation(exact,false);$('[data-location-results]')?.replaceChildren();},220);
      else if (matches.length) locationStatus(`${matches.length} matching barangays. Choose an area to view.`);
    });
    searchInput?.addEventListener('paste', event => {
      const coordinates=parseCoordinates(event.clipboardData?.getData('text'));
      if (!coordinates) return;
      event.preventDefault();cancelSearch();
      searchInput.value=`${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
      place(coordinates,true,{kind:'coordinates'});
      $('[data-location-results]')?.replaceChildren();
    });
    $('[data-use-map-center]')?.addEventListener('click', () => {syncLocation(false);if(boundaryMap)place(boundaryMap.getCenter(),false);});
    $('[data-recenter-location]')?.addEventListener('click', () => {if(point())syncLocation(true,'pin');});
    function clearLocation() {
      locationRevision++;locationCapture=null;deviceAccuracyLayer?.remove();deviceAccuracyLayer=null;
      if (field('lat')) field('lat').value='';
      if (field('lng')) field('lng').value='';
      const pair=$('[data-coordinate-pair]');if(pair){pair.value='';pair.removeAttribute('aria-invalid');}
      if (!dirtyReference) {field('reference_lat').value='';field('reference_lng').value='';}
      syncLocation(false);updateCoordinateDetailsSummary();assessHazards();preview();ready();
      locationStatus('Property pin cleared. You can still continue with a recorded area or drawn plot.');
    }
    $('[data-clear-location]')?.addEventListener('click',clearLocation);
    function applyCoordinates(revealMap = true) {
      const pair=$('[data-coordinate-pair]');
      const raw=pair?.value.trim();
      const parsed=raw ? parseCoordinates(raw) : null;
      if (raw && !parsed) {
        pair.setAttribute('aria-invalid','true');
        locationStatus('Enter valid coordinates, for example 16.615852, 120.316482. DMS and N/S/E/W formats are also accepted.');
        pair.focus();return false;
      }
      pair?.removeAttribute('aria-invalid');
      const current=point();
      if (!parsed && !current) {
        if (value('lat') === '' && value('lng') === '' && !raw) {clearLocation();return true;}
        locationStatus('Provide both coordinates: latitude from −90 to 90 and longitude from −180 to 180.');
        updateCoordinateDetailsSummary();ready();return false;
      }
      place(parsed || {lat:current[0],lng:current[1]},true,{kind:'coordinates'});
      if (revealMap) requestAnimationFrame(() => {
        if (dialog.open && step === 1) $('[data-location-map]')?.scrollIntoView({block:'center',behavior:'auto'});
      });
      notify(`Coordinates applied: ${coordinateLabel(point())}. Continue when the pin matches the property.`);
      return true;
    }
    $('[data-coordinate-apply]')?.addEventListener('click',() => applyCoordinates());
    $('[data-coordinate-pair]')?.addEventListener('keydown',event => {if(event.key==='Enter'){event.preventDefault();applyCoordinates();}});
    function handleCoordinateInput() {
      cancelSearch();$('[data-location-results]')?.replaceChildren();
      locationRevision++;locationCapture={kind:'coordinates'};
      deviceAccuracyLayer?.remove();deviceAccuracyLayer=null;
      const latVal = (value('lat') || '').trim();
      const lngVal = (value('lng') || '').trim();
      const errBox = $('[data-coordinate-error]');
      if (!latVal && !lngVal) {
        if (errBox) { errBox.hidden = true; errBox.textContent = ''; }
        if (locationMarker) { locationMarker.remove(); locationMarker = null; }
        syncLocation(false);
        if (typeof syncBarangayConflict === 'function') syncBarangayConflict();
        updateCoordinateDetailsSummary();
        assessHazards();
        preview();
        ready();
        return;
      }
      const latNum = Number(latVal);
      const lngNum = Number(lngVal);
      let hasError = false;
      if (latVal !== '') {
        if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
          if (errBox) { errBox.hidden = false; errBox.textContent = 'Invalid Latitude: must be a decimal degree between −90 and 90.'; }
          hasError = true;
        }
      }
      if (lngVal !== '' && !hasError) {
        if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
          if (errBox) { errBox.hidden = false; errBox.textContent = 'Invalid Longitude: must be a decimal degree between −180 and 180.'; }
          hasError = true;
        }
      }
      if (latVal !== '' && lngVal !== '' && !hasError) {
        if (errBox) { errBox.hidden = true; errBox.textContent = ''; }
        place({lat: latNum, lng: lngNum}, true, {kind: 'coordinates'});
      } else {
        if (!hasError && (latVal === '' || lngVal === '')) {
          if (errBox) { errBox.hidden = false; errBox.textContent = 'Provide both Latitude and Longitude to position the property on the map.'; }
        }
        syncLocation(false);
        if (typeof syncBarangayConflict === 'function') syncBarangayConflict();
        updateCoordinateDetailsSummary();
        assessHazards();
        preview();
        ready();
      }
    }
    ['lat','lng'].forEach(name => {
      const el=field(name);if(!el)return;
      el.addEventListener('input',handleCoordinateInput);
      el.addEventListener('change',handleCoordinateInput);
      el.addEventListener('paste', event => {
        const text = event.clipboardData?.getData('text') || '';
        const coordinates=parseCoordinates(text);
        if(!coordinates)return;
        event.preventDefault();
        if (field('lat')) field('lat').value = coordinates.lat.toFixed(6);
        if (field('lng')) field('lng').value = coordinates.lng.toFixed(6);
        place(coordinates,true,{kind:'coordinates'});
      });
    });
    const deviceButton=$('[data-use-device-location]');
    deviceButton?.addEventListener('click', () => {
      if (!navigator.geolocation) {locationStatus('Device location is unavailable. Place a pin or enter coordinates.');return;}
      const requestRevision=++locationRevision;
      const requestId=++deviceRequest;
      deviceButton.disabled=true;deviceButton.setAttribute('aria-busy','true');
      locationStatus('Locating this device. Allow location access when your browser asks.');
      const finish=() => {if(requestId===deviceRequest){deviceButton.disabled=false;deviceButton.removeAttribute('aria-busy');}};
      navigator.geolocation.getCurrentPosition(position => {
        finish();
        if(requestRevision!==locationRevision || !dialog.open)return;
        const accuracy=position.coords.accuracy;
        place({lat:position.coords.latitude,lng:position.coords.longitude},true,{kind:'device',accuracy});
        if(boundaryMap && Number.isFinite(accuracy) && accuracy>0) {
          deviceAccuracyLayer?.remove();
          deviceAccuracyLayer=L.circle(point(),{radius:accuracy,color:'#257f76',weight:1,fillOpacity:.08,interactive:false,pmIgnore:true}).addTo(boundaryMap);
        }
        locationStatus(`Device location found · estimated accuracy ±${Math.round(accuracy)} m. Check that the pin marks the property, then adjust if needed.`);
      },error => {
        finish();if(requestRevision!==locationRevision || !dialog.open)return;
        locationStatus(error.code===1 ? 'Location access was declined. Place a pin or enter coordinates.' : error.code===3 ? 'Device location timed out. Try again, or place a pin on the map.' : 'This device could not determine its location. Place a pin or enter coordinates.');
      },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
    });
    async function search() {
      cancelSearch();
      const query=searchInput?.value.trim() || '';
      if(query.length<2){locationStatus('Enter at least two characters to search.');searchInput?.focus();return;}
      const coordinates=parseCoordinates(query);
      if(coordinates){place(coordinates,true,{kind:'coordinates'});$('[data-location-results]')?.replaceChildren();return;}
      if(/^[\d+\-.,;()\[\]\s°'"]+$/.test(query)){locationStatus('Those coordinates are invalid. Check latitude and longitude, then try again.');return;}
      const matches=barangayMatches(query), exact=matches.find(item=>item.rank===0);
      if(exact){navigateLocation(exact);$('[data-location-results]')?.replaceChildren();return;}
      if(matches.length){renderLocationResults(matches);locationStatus('Choose the matching barangay to view its approximate area.');return;}
      const requestRevision=searchRevision;
      const requestController=new AbortController();searchController=requestController;
      const button=$('[data-location-search-button]');if(button){button.disabled=true;button.textContent='Searching…';}
      $('[data-location-results]')?.setAttribute('aria-busy','true');
      renderLocationResults([]);locationStatus('Finding matching places…');
      try {
        const payload=await get(`location-search.php?q=${encodeURIComponent(query)}`,requestController.signal);
        if(requestRevision!==searchRevision)return;
        const results=(payload.search?.results || []).filter(item=>item.lat!=null && item.lng!=null && Number.isFinite(+item.lat) && Number.isFinite(+item.lng) && Math.abs(+item.lat)<=90 && Math.abs(+item.lng)<=180);
        renderLocationResults(results);
        locationStatus(results.length ? 'Choose a result to view the area. Place your pin on the property.' : 'No matching place was found. Try a barangay name, place a pin, or enter coordinates.');
      } catch(error){if(error.name!=='AbortError' && requestRevision===searchRevision)locationStatus(`${error.message} You can still place a pin or enter coordinates.`);}
      finally{if(requestRevision===searchRevision){if(button){button.disabled=false;button.textContent='Search';}$('[data-location-results]')?.removeAttribute('aria-busy');}}
    }
    $('[data-location-search-button]')?.addEventListener('click',search);
    searchInput?.addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();search();}
      else if(event.key==='Escape'){event.preventDefault();cancelSearch();$('[data-location-results]')?.replaceChildren();}
      else if(event.key==='ArrowDown'){$('[data-location-results] button')?.focus();event.preventDefault();}
    });
    const HAZARD_CONFIG = [
      { key: 'flood', label: 'Flood Susceptibility', weight: 25, agency: 'DENR-MGB', pillAttr: 'data-hazard-flood-pill', scoreAttr: 'data-hazard-flood-score', descAttr: 'data-hazard-flood-desc', ptsAttr: 'data-risk-pts-flood' },
      { key: 'faults', label: 'Active Fault / Ground Rupture', weight: 25, agency: 'DOST-PHIVOLCS', pillAttr: 'data-hazard-fault-pill', scoreAttr: 'data-hazard-fault-score', descAttr: 'data-hazard-fault-desc', ptsAttr: 'data-risk-pts-fault' },
      { key: 'landslide', label: 'Landslide Susceptibility', weight: 15, agency: 'DENR-MGB', pillAttr: 'data-hazard-landslide-pill', scoreAttr: 'data-hazard-landslide-score', descAttr: 'data-hazard-landslide-desc', ptsAttr: 'data-risk-pts-landslide' },
      { key: 'storm_surge', label: 'Storm Surge Exposure', weight: 15, agency: 'DOST-PAGASA', pillAttr: 'data-hazard-storm-surge-pill', scoreAttr: 'data-hazard-storm-surge-score', descAttr: 'data-hazard-storm-surge-desc', ptsAttr: 'data-risk-pts-surge' },
      { key: 'liquefaction', label: 'Liquefaction Susceptibility', weight: 10, agency: 'DOST-PHIVOLCS', pillAttr: 'data-hazard-liquefaction-pill', scoreAttr: 'data-hazard-liquefaction-score', descAttr: 'data-hazard-liquefaction-desc', ptsAttr: 'data-risk-pts-liquefaction' },
      { key: 'tsunami', label: 'Tsunami Exposure', weight: 10, agency: 'DOST-PHIVOLCS', pillAttr: 'data-hazard-tsunami-pill', scoreAttr: 'data-hazard-tsunami-score', descAttr: 'data-hazard-tsunami-desc', ptsAttr: 'data-risk-pts-tsunami' },
    ];

    function hazardResult(key, title, layer, intersects, failure, noLocation, distKm = null) {
      const available = !noLocation && layer?.status === 'Available' && !failure;
      const assessed = available && layer.complete === true;
      let status = 'NOT ASSESSED';
      let color = 'gray';
      let text = 'Enter coordinates or click map to screen against hazard layers.';

      if (noLocation) {
        status = 'NOT ASSESSED';
        color = 'gray';
        text = 'Enter coordinates or click map to screen against hazard layers.';
      } else if (key === 'faults') {
        if (intersects) {
          status = 'HIGH';
          color = 'red';
          text = distKm != null ? `${distKm.toFixed(1)} km from nearest mapped fault (within buffer corridor).` : 'Property falls within active-fault buffer corridor.';
        } else if (distKm != null) {
          status = distKm <= 5.0 ? 'MODERATE' : 'LOW';
          color = distKm <= 5.0 ? 'amber' : 'green';
          text = `${distKm.toFixed(1)} km from nearest mapped fault.`;
        } else if (assessed) {
          status = 'LOW';
          color = 'green';
          text = 'No mapped fault identified within the configured screening area.';
        } else {
          status = 'NOT ASSESSED';
          color = 'gray';
          text = 'Coverage incomplete or awaiting layer verification.';
        }
      } else {
        if (intersects) {
          status = 'HIGH';
          color = 'red';
          text = 'Property intersects a mapped high-susceptibility zone.';
        } else if (assessed) {
          status = 'LOW';
          color = 'green';
          text = 'No mapped hazard overlap in official spatial dataset.';
        } else {
          status = 'NOT ASSESSED';
          color = 'gray';
          text = 'Coverage incomplete or awaiting layer verification.';
        }
      }

      return `<article class="pw-hazard ${color === 'red' ? 'pw-hazard--warning' : ''}"><span class="pw-hazard-icon" aria-hidden="true">${color === 'red' ? '⚠' : (status === 'LOW' ? '✓' : 'i')}</span><div><strong>${escape(title)}</strong><span class="pw-pill pw-pill--${color}">${status}</span><p>${escape(text)}${point() && !boundary ? ' This result covers the location pin only.' : ''}</p>${layer?.source ? `<small>${escape(layer.source)}${layer.date ? ` · ${escape(layer.date)}` : ''}</small>` : ''}${key === 'faults' && layer?.bufferMeters ? `<small>Verified review buffer: ${number(layer.bufferMeters)} meters</small>` : ''}<button type="button" class="pw-text-button" data-show-hazard-source="${key}">Review hazard evidence →</button></div></article>`;
    }

    function assessHazards() {
      const pt = point();
      const testGeom = boundary || (pt && window.turf ? turf.point([pt[1], pt[0]]) : null);
      const criticalBanner = $('[data-risk-critical-banner]');
      const warningsBox = $('[data-risk-warnings-box]');
      const warningsList = $('[data-risk-warnings-list]');

      if (!window.turf || !testGeom) {
        HAZARD_CONFIG.forEach(item => {
          const pill = $(`[${item.pillAttr}]`);
          const scoreEl = $(`[${item.scoreAttr}]`);
          const descEl = $(`[${item.descAttr}]`);
          const ptsEl = $(`[${item.ptsAttr}]`);
          if (pill) { pill.textContent = 'Not assessed'; pill.className = 'pw-pill pw-pill--gray'; }
          if (scoreEl) scoreEl.textContent = '—';
          if (descEl) descEl.textContent = `Provide location coordinates in Step 2 to screen against ${item.agency} layer.`;
          if (ptsEl) ptsEl.textContent = '—';
        });
        if (criticalBanner) criticalBanner.hidden = true;
        if (warningsBox) warningsBox.hidden = true;
        setText('[data-risk-total-score]', '—');
        setText('[data-risk-iai-pts]', '—');
        const badge = $('[data-risk-status-badge]');
        if (badge) { badge.textContent = 'Pending Location'; badge.className = 'pw-badge pw-badge-amber'; }
        const bar = $('[data-risk-progress-bar]');
        if (bar) { bar.style.width = '0%'; bar.style.background = '#64748b'; }
        setText('[data-hazard-status]', 'NOT ASSESSED');
        return;
      }

      let allAssessed = true;
      let anyOverlap = false;
      let hasCriticalFault = false;
      let weightedSum = 0;
      const warnings = [];

      HAZARD_CONFIG.forEach(item => {
        const layer = context?.[item.key];
        let overlap = false;
        let minFaultDist = null;
        let score = null;
        let statusText = 'Not assessed';
        let statusColor = 'gray';
        let descText = `Authoritative ${item.agency} layer pending verification.`;

        if (layer?.status === 'Available') {
          for (const feature of layer.geojson?.features || []) {
            let geometry = feature;
            if (item.key === 'faults') {
              const bufferDist = (layer.bufferMeters && layer.bufferMeters > 0) ? layer.bufferMeters : 5;
              try {
                const buffered = turf.buffer(feature, bufferDist, { units: 'meters' });
                if (buffered) geometry = buffered;
              } catch {}
            }
            if (geometry) {
              try {
                if (boundary && turf.booleanIntersects(boundary, geometry)) overlap = true;
                else if (!boundary && testGeom) {
                  const gType = geometry.geometry?.type;
                  if (gType === 'Polygon' || gType === 'MultiPolygon') {
                    if (turf.booleanPointInPolygon(testGeom, geometry)) overlap = true;
                  }
                }
              } catch {}
            }
            if (item.key === 'faults' && feature && testGeom) {
              try {
                const d = typeof turf.pointToLineDistance === 'function' ? turf.pointToLineDistance(testGeom, feature, { units: 'kilometers' }) : null;
                if (d !== null && (minFaultDist === null || d < minFaultDist)) {
                  minFaultDist = d;
                }
              } catch {}
            }
          }

          if (item.key === 'faults') {
            if (overlap || (minFaultDist !== null && minFaultDist <= 0.005)) {
              hasCriticalFault = true;
              overlap = true;
              score = 0.0;
              statusText = 'Critical: 0';
              statusColor = 'red';
              descText = 'Direct intersection with active fault trace or mandated 5m exclusion corridor.';
              warnings.push('Active Fault / Ground Rupture: Direct conflict with active fault buffer corridor (Score: 0).');
            } else if (minFaultDist !== null) {
              if (minFaultDist <= 0.5) {
                score = 25.0;
                statusText = 'High proximity: 25';
                statusColor = 'red';
                descText = `${(minFaultDist * 1000).toFixed(0)}m from mapped active fault trace (<500m high-proximity zone).`;
                warnings.push(`Active Fault Proximity: Within 500m of active fault trace (${(minFaultDist * 1000).toFixed(0)}m).`);
              } else if (minFaultDist <= 5.0) {
                score = 60.0;
                statusText = 'Moderate: 60';
                statusColor = 'amber';
                descText = `${minFaultDist.toFixed(1)} km from nearest active fault trace (500m–5km corridor).`;
              } else {
                score = 85.0;
                statusText = 'Low: 85';
                statusColor = 'green';
                descText = `${minFaultDist.toFixed(1)} km from nearest mapped active fault (>5km setback).`;
              }
            } else if (layer.complete === true) {
              score = 85.0;
              statusText = 'Low: 85';
              statusColor = 'green';
              descText = 'No mapped active fault identified in authoritative coverage area.';
            } else {
              score = null;
              statusText = 'Awaiting review';
              statusColor = 'gray';
              descText = 'Fault review buffer or regional trace verification required.';
            }
          } else {
            // General hazards: flood, landslide, storm_surge, liquefaction, tsunami
            if (overlap) {
              score = 25.0;
              statusText = 'High: 25';
              statusColor = 'red';
              descText = `Parcel intersects mapped high-susceptibility zone (${item.agency}).`;
              warnings.push(`${item.label}: Elevated susceptibility zone overlap (${item.agency}).`);
            } else if (layer.complete === true) {
              score = 85.0;
              statusText = 'Low: 85';
              statusColor = 'green';
              descText = `No mapped hazard overlap within official ${item.agency} coverage.`;
            } else {
              score = null;
              statusText = 'Not assessed';
              statusColor = 'gray';
              descText = `Official ${item.agency} layer coverage pending verification.`;
            }
          }
        }

        if (score === null) {
          allAssessed = false;
        } else {
          weightedSum += (score * item.weight) / 100;
        }
        anyOverlap ||= overlap;

        const pill = $(`[${item.pillAttr}]`);
        const scoreEl = $(`[${item.scoreAttr}]`);
        const descEl = $(`[${item.descAttr}]`);
        const ptsEl = $(`[${item.ptsAttr}]`);

        if (pill) { pill.textContent = statusText; pill.className = `pw-pill pw-pill--${statusColor}`; }
        if (scoreEl) scoreEl.textContent = score !== null ? `${score.toFixed(0)}` : '—';
        if (descEl) descEl.textContent = descText;
        if (ptsEl) ptsEl.textContent = score !== null ? `${((score * item.weight) / 100).toFixed(2)}` : '—';
      });

      // Update Critical Banner
      if (criticalBanner) criticalBanner.hidden = !hasCriticalFault;

      // Update Warnings Box
      if (warningsBox && warningsList) {
        if (warnings.length > 0) {
          warningsList.innerHTML = warnings.map(w => `<li>${escape(w)}</li>`).join('');
          warningsBox.hidden = false;
        } else {
          warningsBox.hidden = true;
          warningsList.innerHTML = '';
        }
      }

      // Live Assessment Card
      const compositeScore = allAssessed ? Math.max(0, Math.min(100, Math.round(weightedSum * 10) / 10)) : null;
      const iaiPts = compositeScore !== null ? Math.round(compositeScore * 0.15 * 100) / 100 : null;

      setText('[data-risk-total-score]', compositeScore !== null ? compositeScore.toFixed(1) : '—');
      setText('[data-risk-iai-pts]', iaiPts !== null ? iaiPts.toFixed(2) : '—');

      const badge = $('[data-risk-status-badge]');
      if (badge) {
        if (hasCriticalFault) {
          badge.textContent = 'Critical Site Constraint';
          badge.className = 'pw-badge pw-badge-rose';
        } else if (allAssessed) {
          badge.textContent = 'Calculated';
          badge.className = 'pw-badge pw-badge-teal';
        } else {
          badge.textContent = 'Screening Incomplete';
          badge.className = 'pw-badge pw-badge-amber';
        }
      }

      const bar = $('[data-risk-progress-bar]');
      if (bar) {
        bar.style.width = `${compositeScore || 0}%`;
        bar.style.background = hasCriticalFault ? '#b91c1c' : (compositeScore >= 75 ? '#0d9488' : compositeScore >= 50 ? '#d97706' : '#dc2626');
      }

      setText('[data-hazard-status]', anyOverlap ? 'HIGH' : allAssessed ? 'LOW' : 'NOT ASSESSED');
    }
    form.addEventListener('click',event=>{
      const button=event.target.closest('[data-show-hazard-source]');
      if(!button)return;
      const details=$('[data-map-layers]');if(details){details.open=true;details.scrollIntoView({block:'nearest',behavior:'smooth'});}
    });
    function renderLayers() {
      hazardLayers.forEach(layer=>layer.remove());hazardLayers=[];
      if(!boundaryMap || !context)return;
      const hazardColors = {
        flood: '#38a5e5',
        faults: '#ef4444',
        landslide: '#d97706',
        storm_surge: '#0284c7',
        liquefaction: '#8b5cf6',
        tsunami: '#06b6d4',
      };
      for(const key of ['flood','faults','landslide','storm_surge','liquefaction','tsunami']){
        const layer=context[key];if(layer?.status!=='Available' || $(`[data-layer-toggle="${key==='faults'?'fault':key}"]`)?.checked===false)continue;
        let data=layer.geojson;
        if(key==='faults' && layer.bufferMeters>0 && window.turf){try{data=turf.featureCollection(data.features.map(feature=>turf.buffer(feature,layer.bufferMeters,{units:'meters'})).filter(Boolean));}catch{continue;}}
        const color = hazardColors[key] || '#ef4444';
        const overlay=L.geoJSON(data,{pmIgnore:true,interactive:false,style:{color:color,weight:1,fillOpacity:.15,dashArray:key==='faults'?'6 5':null}}).addTo(boundaryMap);hazardLayers.push(overlay);overlay.bringToBack();
      }
    }
    all('[data-layer-toggle]').forEach(toggle=>toggle.addEventListener('change',()=>{
      if(toggle.dataset.layerToggle==='boundary' && parcelLayer){
        if(!toggle.checked)parcelLayer.pm?.disable();
        parcelLayer.setStyle({opacity:toggle.checked?1:0,fillOpacity:toggle.checked?0.3:0});
      }else renderLayers();
    }));
    async function loadContext() {
      controller?.abort();controller=new AbortController();const current=++revision;
      const results=await Promise.allSettled([get('parcel-context.php',controller.signal)]);
      if(current!==revision || !dialog.open)return;
      context=results[0].status==='fulfilled' ? results[0].value.context : null;
      const details=$('[data-map-layers]');
      if(details){const body=details.querySelector('[data-layer-sources]');if(body)body.innerHTML=['flood','faults','roads'].map(key=>{const layer=context?.[key];return `<p><strong>${key==='faults'?'Active faults':key==='flood'?'Flood zones':'Road inventory'}</strong><br>${escape(layer?.source || 'No authoritative source configured')}${layer?.date?` · ${escape(layer.date)}`:''}<br><span>${escape(layer?.status || 'Not assessed')}</span></p>`;}).join('');}
      assessHazards();renderLayers();if(step===2)syncRadar();ready();
    }
    function setReference(coordinates) {
      if(value('reference_label')==='center' && boundary && window.turf){const center=turf.centerOfMass(boundary).geometry.coordinates;coordinates=[center[1],center[0]];}
      if(!coordinates)return;
      field('reference_lat').value=coordinates[0].toFixed(6);field('reference_lng').value=coordinates[1].toFixed(6);
      if(radarMarker)radarMarker.setLatLng(coordinates);
    }
    function classify(feature) {
      const properties = feature.properties || {};
      const selected = value('radar_business_type') || 'cafe';
      const roleOverride = properties.roles?.[selected];
      if (roleOverride) {
        if (roleOverride === 'competitors' || roleOverride === 'direct') return 'competitors';
        if (roleOverride === 'related') return 'related';
        if (roleOverride === 'complementary' || roleOverride === 'commercial_anchor') return 'complementary';
        if (roleOverride === 'unclassified' || roleOverride === 'other') return 'unclassified';
      }
      // If the backend already identified this as a commercial anchor or assigned classification
      if (properties.classification === 'commercial_anchor' || (properties.isAnchor && selected !== 'mall' && selected !== 'shopping_mall')) {
        return 'complementary';
      }
      if (properties.classification === 'competitor') return 'competitors';
      if (properties.classification === 'related') return 'related';
      if (properties.classification === 'complementary') return 'complementary';

      // Regional commercial anchors (SM City, Robinsons, Manna Mall, etc.) should not be treated as direct competitors for standard cafes/retail unless proposing a mall
      const name = String(properties.name || '').toLowerCase();
      const rawCat = String(properties.category || properties.businessType || '').toLowerCase();
      const isRegionalMall = /sm\s*(city|la union|prime)|manna\s*mall|robinsons|csi\s*city/i.test(name)
        || rawCat.includes('mall') || rawCat.includes('commercial complex');
      if (isRegionalMall && selected !== 'mall' && selected !== 'shopping_mall') {
        return 'complementary';
      }

      let tags = [properties.businessType, properties.category, properties.type, properties.amenity, properties.shop, properties.tourism, properties.office, properties.commercial, properties.industrial, ...(Array.isArray(properties.tags) ? properties.tags : [])].filter(Boolean).map(tag => String(tag).toLowerCase().replace(/[ -]/g, '_'));
      if (!tags.length && /^(jollibee|mcdonald|kfc|pizza hut|mister donut|chowking|mang inasal|greenwich)/i.test(properties.name || '')) tags = ['fast_food'];
      const profile = businessRoles[selected] || businessRoles.cafe;
      const directTags = profile.direct || profile.competitors || [];
      const relatedTags = profile.related || [];
      const compTags = profile.complementary || [];
      if (tags.some(tag => directTags.includes(tag))) return 'competitors';
      if (tags.some(tag => relatedTags.includes(tag))) return 'related';
      if (tags.some(tag => compTags.includes(tag))) return 'complementary';
      return 'unclassified';
    }
    function syncRadar() {
      // Location/center modes follow the current property; only an entrance is independently placed.
      if (value('reference_label') === 'location' && point()) { dirtyReference=false; setReference(point()); }
      else if (value('reference_label') === 'center' && boundary && window.turf) setReference(point());
      if (!point('reference_lat','reference_lng') && point() && !placingReference) {
        field('reference_label').value = boundary ? 'center' : 'location';setReference(point());
      }
      if(!window.L || !window.turf){setText('[data-radar-coverage]','The map tools are unavailable. Reload to run geographic distance checks.');return;}
      if(!radarMap){
        radarMap=tileMap($('[data-radar-map]'));
        radarMap.on('click',event=>{
          if(placingReference || !point('reference_lat','reference_lng')){
            dirtyReference=true;placingReference=false;$('[data-place-reference]')?.classList.remove('is-active');
            setReference([event.latlng.lat,event.latlng.lng]);
            notify('Reference point saved. Drag the pin if you need to adjust its position.');
            syncRadar();
          }
        });
      }
      requestAnimationFrame(()=>radarMap.invalidateSize());

      const reference=point('reference_lat','reference_lng');

      radarLayers.forEach(layer=>layer.remove());radarLayers=[];radarParcel?.remove();
      if(hoverVectorLayer){hoverVectorLayer.remove();hoverVectorLayer=null;}
      if(boundary)radarParcel=L.geoJSON(boundary,{interactive:false,pmIgnore:true,style:{color:'#11224d',weight:2,fillOpacity:.12}}).addTo(radarMap);

      const clearRings=()=>{
        concentricRings.forEach(c=>c.remove());concentricRings=[];radiusLayer=null;
        if(hoverVectorLayer){hoverVectorLayer.remove();hoverVectorLayer=null;}
      };

      if(!reference){
        radarState='idle';
        clearRings();
        if(radarMarker){radarMarker.remove();radarMarker=null;}
        if(boundary)radarMap.fitBounds(radarParcel.getBounds(),{padding:[40,40]});
        else{const parcelPt=point();radarMap.setView(parcelPt || [16.6159,120.3209],15);}
        renderRadarUI();
        return;
      }

      if(!$('[data-radar-toggle]')?.checked){
        radarState='disabled';
        clearRings();
        if(!radarMarker){
          radarMarker=L.marker(reference,{draggable:true,title:'Radar reference point',icon:referenceIcon()}).addTo(radarMap);
          attachRadarDrag();
        } else {
          radarMarker.setLatLng(reference);
          if(!radarMap.hasLayer(radarMarker))radarMarker.addTo(radarMap);
        }
        renderRadarUI();
        return;
      }

      if(!radarMarker){
        radarMarker=L.marker(reference,{draggable:true,title:'Radar reference point',icon:referenceIcon()}).addTo(radarMap);
        attachRadarDrag();
      } else {
        radarMarker.setLatLng(reference);
        if(!radarMap.hasLayer(radarMarker))radarMarker.addTo(radarMap);
      }

      if(!radiusLayer){
        concentricRings=[
          L.circle(reference,{radius:500,color:'#2563eb',weight:2,dashArray:'6 5',fillColor:'#3b82f6',fillOpacity:.09,interactive:false,pmIgnore:true}).addTo(radarMap),
          L.circle(reference,{radius:250,color:'#3b82f6',weight:1.5,dashArray:'4 4',fillColor:'#60a5fa',fillOpacity:.05,interactive:false,pmIgnore:true}).addTo(radarMap),
          L.circle(reference,{radius:100,color:'#60a5fa',weight:1.2,dashArray:'3 3',fillColor:'#93c5fd',fillOpacity:.03,interactive:false,pmIgnore:true}).addTo(radarMap)
        ];
        radiusLayer=concentricRings[0];
      } else {
        concentricRings.forEach(c=>{
          c.setLatLng(reference);
          if(!radarMap.hasLayer(c))c.addTo(radarMap);
        });
      }

      radarMap.fitBounds(radiusLayer.getBounds(),{padding:[25,25]});
      fetchRadar(reference,value('radar_business_type') || 'cafe');
    }
    function attachRadarDrag() {
      if(!radarMarker)return;
      radarMarker.on('drag',()=>{
        const p=radarMarker.getLatLng();
        concentricRings.forEach(c=>c.setLatLng(p));
        if(hoverVectorLayer){hoverVectorLayer.remove();hoverVectorLayer=null;}
      });
      radarMarker.on('dragend',()=>{
        field('reference_label').value='entrance';dirtyReference=true;const p=radarMarker.getLatLng();
        setReference([p.lat,p.lng]);concentricRings.forEach(c=>c.setLatLng([p.lat,p.lng]));
        clearTimeout(radarDebounceTimer);
        radarDebounceTimer=setTimeout(()=>{fetchRadar([p.lat,p.lng],value('radar_business_type') || 'cafe');},200);
      });
    }
    function getBrandBadge(name, category, role) {
      const n = String(name || '').toLowerCase();
      const basePath = (config.basePath || '').replace(/\/$/, '');
      if (/pig\s*out/i.test(n)) {
        return `<img class="pw-radar-brand-img" src="${basePath}/assets/images/brands/pigout.svg" alt="Pig Out" width="32" height="32">`;
      }
      if (/halo[\s-]*halo/i.test(n) || /iloko/i.test(n)) {
        return `<img class="pw-radar-brand-img" src="${basePath}/assets/images/brands/halohalo.svg" alt="Halo-Halo de Iloko" width="32" height="32">`;
      }
      if (/f4\s*kainan/i.test(n)) {
        return `<img class="pw-radar-brand-img" src="${basePath}/assets/images/brands/f4kainan.svg" alt="F4 Kainan" width="32" height="32">`;
      }
      if (/sm\s*(city|la union|prime)/i.test(n)) {
        return `<img class="pw-radar-brand-img" src="${basePath}/assets/images/brands/smcity.svg" alt="SM City" width="32" height="32">`;
      }
      if (/jollibee/i.test(n)) {
        return `<img class="pw-radar-brand-img" src="${basePath}/assets/images/brands/jollibee.svg" alt="Jollibee" width="32" height="32">`;
      }
      if (/mcdonald/i.test(n)) {
        return `<img class="pw-radar-brand-img" src="${basePath}/assets/images/brands/mcdonalds.svg" alt="McDonald's" width="32" height="32">`;
      }
      if (/starbucks/i.test(n)) {
        return `<img class="pw-radar-brand-img" src="${basePath}/assets/images/brands/starbucks.svg" alt="Starbucks" width="32" height="32">`;
      }
      if (/7[\s-]*eleven|seven[\s-]*eleven/i.test(n)) {
        return `<img class="pw-radar-brand-img" src="${basePath}/assets/images/brands/seveneleven.svg" alt="7-Eleven" width="32" height="32">`;
      }
      const isRoad = role === 'roads';
      const isComp = role === 'competitors';
      const isRelated = role === 'related';
      const isCompl = role === 'complementary';
      const iconClass = isRoad ? 'is-road' : isComp ? 'is-competitor' : isRelated ? 'is-related' : isCompl ? 'is-complementary' : 'is-unclassified';
      const iconChar = isRoad ? '↗' : isComp ? '🏪' : isRelated ? '🍽️' : isCompl ? '🏬' : '📍';
      return `<span class="pw-radar-place-icon ${iconClass}" aria-hidden="true">${iconChar}</span>`;
    }
    function walkingEstimate() { return ''; }
    function createRadarPopup(p, role, distM, isRoad, featId) {
      const isAnchor = p.classification === 'commercial_anchor' || p.isAnchor;
      const roleLabel = isRoad ? 'Road Segment' : (isAnchor ? 'Commercial Activity Anchor' : (role === 'competitors' ? 'Direct Competitor' : (role === 'related' ? 'Related Business' : (role === 'complementary' ? 'Complementary Place' : 'Mapped Establishment'))));
      const roleClass = isRoad ? 'is-road' : (isAnchor ? 'is-complementary' : (role === 'competitors' ? 'is-competitor' : (role === 'related' ? 'is-related' : (role === 'complementary' ? 'is-complementary' : 'is-unclassified'))));
      const name = escape(p.name || (isRoad ? 'Unnamed road segment' : 'Mapped establishment'));
      const cat = escape(p.category || p.businessType || p.amenity || p.shop || (isRoad ? (p.highway || 'Road') : 'Establishment'));
      const walkTxt = walkingEstimate(distM);
      const status = escape(p.status || (isRoad ? 'Active road network' : 'Unknown / unverified'));
      const srcUrl = p.locationSource && /^https:\/\//.test(p.locationSource) ? p.locationSource : null;
      const srcName = escape(p.source || 'OpenStreetMap');
      const checkedOn = p.checkedOn ? ` · ${escape(p.checkedOn)}` : '';
      const badge = getBrandBadge(p.name, p.category, isRoad ? 'roads' : role);
      return `<div class="pw-map-popup"><div class="pw-map-popup-head"><span class="pw-map-popup-tag ${roleClass}">${escape(roleLabel)}</span><span class="pw-muted" style="font-size:8.5px">${distM!=null?`${distM} m`:''}</span></div><div style="display:flex;align-items:center;gap:8px;margin:5px 0">${badge}<div><div class="pw-map-popup-name">${name}</div><div class="pw-map-popup-sub" style="margin-bottom:0">${cat}</div></div></div><div class="pw-map-popup-metrics"><span>Dist: <strong>${distM!=null?`${distM} m`:'Within 500m'}</strong></span>${walkTxt?`<span>Walk: <strong>${walkTxt}</strong></span>`:''}</div><div class="pw-map-popup-sub" style="margin-top:4px">Status: <strong>${status}</strong></div><div class="pw-map-popup-footer"><span>${srcUrl?`<a href="${escape(srcUrl)}" target="_blank" rel="noopener noreferrer">${srcName} ↗</a>`:srcName}${checkedOn}</span><button type="button" class="pw-map-popup-focus" data-focus-radar-row="${featId}">View in list ↓</button></div></div>`;
    }
    function applyRadarMapFilter() {
      radarLayerItems.forEach(({layer,role,isRoad})=>{
        let visible=true;
        if(radarMapFilter==='competitors')visible=role==='competitors';
        else if(radarMapFilter==='related')visible=role==='related';
        else if(radarMapFilter==='complementary')visible=role==='complementary';
        else if(radarMapFilter==='roads')visible=isRoad;
        if(visible){
          if(!radarMap.hasLayer(layer))layer.addTo(radarMap);
        } else {
          if(radarMap.hasLayer(layer))layer.remove();
        }
      });
    }
    function focusRadarRow(featId) {
      all('.pw-radar-row').forEach(r=>r.classList.remove('is-active-target'));
      const row=$(`[data-radar-row-id="${featId}"]`);
      if(row){
        row.classList.add('is-active-target');
        row.scrollIntoView({behavior:'smooth',block:'nearest'});
      }
    }
    async function fetchRadar(reference,businessType,forceRetry=false) {
      radarController?.abort();radarController=new AbortController();const currentRev=++radarRevision;
      radarState='loading';radarError=null;renderRadarUI();
      try {
        const url=`competitors.php?lat=${reference[0].toFixed(6)}&lng=${reference[1].toFixed(6)}&radius=500&type=${encodeURIComponent(businessType || 'cafe')}`;
        const payload=await get(url,radarController.signal);
        if(currentRev!==radarRevision || !dialog.open)return;
        radarData={
          features:Array.isArray(payload.features)?payload.features:[],
          roads:payload.roads && Array.isArray(payload.roads.geojson?.features)?payload.roads.geojson:{type:'FeatureCollection',features:[]},
          roadStatus:payload.roads?.status || 'Available',
          meta:{
            source:payload.source || 'OpenStreetMap & local repository',
            retrievalDate:payload.retrievalDate || payload.date || new Date().toISOString().slice(0,10),
            cached:Boolean(payload.cached),
            stale:Boolean(payload.stale),
            coverage:payload.coverage || 'unknown',
            coverageNote:payload.coverageNote || '',
          }
        };
        radarData.metrics = payload.metrics || null;
        radarState='success';processRadarData(reference);
      } catch(err) {
        if(currentRev!==radarRevision)return;
        if(err.name==='AbortError')return;
        radarState='error';radarError=err.message || 'Unable to load nearby data.';renderRadarUI();
      }
    }
    function processRadarData(reference) {
      if(!window.turf || !radarMap)return;
      const center=turf.point([reference[1],reference[0]]);
      const searchArea=turf.circle(center,.5,{steps:64,units:'kilometers'});
      radarLayers.forEach(l=>l.remove());radarLayers=[];
      if(hoverVectorLayer){hoverVectorLayer.remove();hoverVectorLayer=null;}
      radarLayerItems=new Map();
      radarGroups={competitors:[],related:[],complementary:[],unclassified:[],roads:[]};

      const features=radarData?.features || [];
      const seen=new Set();
      for(let i=0; i<features.length; i++){
        const feature=features[i];
        const p=feature.properties || {},coords=feature.geometry?.coordinates;
        const id=feature.id || p.id || `${p.name}:${JSON.stringify(coords)}`;
        if(seen.has(id))continue;seen.add(id);

        let pt = null;
        let footprintGeom = null;
        if (feature.geometry?.type === 'Point' && Array.isArray(coords) && coords.length >= 2 && coords.every(Number.isFinite) && Math.abs(coords[0]) <= 180 && Math.abs(coords[1]) <= 90) {
          pt = [coords[0], coords[1]];
        } else if (feature.geometry?.type === 'Polygon' && Array.isArray(coords) && coords[0]?.length) {
          footprintGeom = feature.geometry;
          let sumX = 0, sumY = 0, cnt = 0;
          coords[0].forEach(c => { if (Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])) { sumX += c[0]; sumY += c[1]; cnt++; } });
          if (cnt > 0) pt = [sumX / cnt, sumY / cnt];
        }
        if (p.footprint && p.footprint.type === 'Polygon') {
          footprintGeom = p.footprint;
        }
        if (!pt) continue;

        const distance = Number.isFinite(Number(p.distanceMeters))
          ? Number(p.distanceMeters)
          : turf.distance(center, turf.point(pt), {units:'kilometers'}) * 1000;
        if(distance > 500 + 1e-6) continue;
        const role = classify(feature);
        const featId = `est_${i}_${String(id).replace(/[^a-zA-Z0-9_-]/g,'')}`;
        if(['competitors','related','complementary','unclassified'].includes(role)){
          radarGroups[role].push({feature,distance,id:featId});
        }
        const isComp = role === 'competitors', isRelated = role === 'related', isCompl = role === 'complementary';
        const isAnchor = p.classification === 'commercial_anchor' || p.isAnchor;
        const fillColor = isComp ? '#ef4444' : (isAnchor ? '#8b5cf6' : (isRelated ? '#f59e0b' : (isCompl ? '#0d9488' : '#64748b')));
        const radius = isAnchor ? 8 : (role === 'unclassified' ? 5 : (isRelated ? 6 : 7));

        if (footprintGeom && typeof L.geoJSON === 'function') {
          const polyLayer = L.geoJSON(footprintGeom, {
            style: {
              color: isAnchor ? '#7c3aed' : fillColor,
              weight: 2,
              dashArray: '3 3',
              fillColor: isAnchor ? '#a78bfa' : fillColor,
              fillOpacity: 0.15
            },
            interactive: false
          }).addTo(radarMap);
          radarLayers.push(polyLayer);
        }

        const marker=L.circleMarker([pt[1],pt[0]],{radius,color:isAnchor ? '#7c3aed' : '#ffffff',weight:isAnchor ? 2.5 : 2,fillColor,fillOpacity:.95}).addTo(radarMap);
        const distM=Math.round(distance);
        const roleLabel=isAnchor ? 'Commercial Activity Anchor' : (isComp ? 'Direct Competitor' : isRelated ? 'Related Business' : isCompl ? 'Complementary Place' : 'Mapped Establishment');
        const catLabel=p.category || p.businessType || p.amenity || p.shop || 'Place';
        const srcText=p.source?`${escape(p.source)}${p.checkedOn?` · ${escape(p.checkedOn)}`:''}`:'OpenStreetMap';
        marker.bindTooltip(`<strong>${escape(p.name || 'Mapped establishment')}</strong><br><small>${escape(roleLabel)} (${escape(catLabel)}) · ${distM} m</small><br><small>Operating status: ${escape(p.status || 'Unknown / unverified')}</small><br><small>Source: ${srcText}</small>`);
        marker.bindPopup(createRadarPopup(p,role,distM,false,featId),{className:'pw-map-popup',maxWidth:260});
        marker.on('click',()=>{
          const targetTab=role==='unclassified'?'all':role;
          if(radarTab!==targetTab){
            radarTab=targetTab;
            tabs('data-radar-tab','data-radar-unused-panel',targetTab);
            renderRadarList();
          }
          focusRadarRow(featId);
        });
        radarLayerItems.set(featId,{layer:marker,feature,role,distance,coords:[pt[1],pt[0]],isRoad:false,origRadius:radius,origColor:fillColor});
        radarLayers.push(marker);
      }

      const roadFeatures=radarData?.roads?.features || [];
      const seenRoads=new Set();
      for(let i=0; i<roadFeatures.length; i++){
        const road=roadFeatures[i];
        if(!['LineString','MultiLineString'].includes(road.geometry?.type))continue;
        const rid=road.id || road.properties?.id || JSON.stringify(road.geometry);
        if(seenRoads.has(rid))continue;seenRoads.add(rid);
        let minDist=Infinity;
        let closestPt=null;
        const coords=road.geometry.type==='LineString'?road.geometry.coordinates:road.geometry.coordinates.flat(1);
        if (!Array.isArray(coords) || coords.length < 2 || coords.some(pt => !Array.isArray(pt) || pt.length < 2 || !pt.every(Number.isFinite) || Math.abs(pt[0]) > 180 || Math.abs(pt[1]) > 90)) continue;
        for(const pt of coords){
          const d=turf.distance(center,turf.point(pt),{units:'kilometers'})*1000;
          if(d<minDist){minDist=d;closestPt=[pt[1],pt[0]];}
        }
        try{
          const lines = road.geometry.type === 'LineString' ? [road.geometry.coordinates] : road.geometry.coordinates;
          minDist = Math.min(...lines.map(line => turf.pointToLineDistance(center,turf.lineString(line),{units:'kilometers'})*1000));
          if(turf.booleanIntersects(road,searchArea) || minDist<=500){
            const roadId=`road_${i}_${String(rid).replace(/[^a-zA-Z0-9_-]/g,'')}`;
            radarGroups.roads.push({feature:road,distance:minDist,id:roadId});
            const roadLayer=L.geoJSON(road,{style:{color:'#64748b',weight:3,opacity:.8},interactive:true}).addTo(radarMap);
            const rName=road.properties?.name || 'Unnamed road segment';
            const rType=road.properties?.highway?`Highway (${road.properties.highway})`:'Road segment';
            const distM=Math.round(minDist);
            roadLayer.bindTooltip(`<strong>${escape(rName)}</strong><br><small>${escape(rType)} · ${distM} m away</small>`);
            roadLayer.bindPopup(createRadarPopup(road.properties || {},'roads',distM,true,roadId),{className:'pw-map-popup',maxWidth:260});
            roadLayer.on('click',()=>{
              if(radarTab!=='roads'){
                radarTab='roads';
                tabs('data-radar-tab','data-radar-unused-panel','roads');
                renderRadarList();
              }
              focusRadarRow(roadId);
            });
            radarLayerItems.set(roadId,{layer:roadLayer,feature:road,role:'roads',distance:minDist,coords:closestPt || [reference[0],reference[1]],isRoad:true,origWeight:3,origColor:'#64748b'});
            radarLayers.push(roadLayer);
          }
        }catch{/* Exclude invalid geometry */}
      }

      for(const key of ['competitors','related','complementary','unclassified','roads']){
        radarGroups[key]?.sort((a,b)=>a.distance-b.distance);
      }
      renderRadarUI();
      applyRadarMapFilter();
    }
    function renderRadarUI() {
      const totalPlaces = (radarGroups.competitors?.length || 0) + (radarGroups.related?.length || 0) + (radarGroups.complementary?.length || 0) + (radarGroups.unclassified?.length || 0);
      const available = radarState === 'success';
      const metrics = radarData?.metrics;
      const density = Number(metrics?.observedBusinessesPerSqKm);
      const isRoadAvailable = radarData?.roadStatus !== 'Unavailable' && radarData?.roadStatus !== 'unavailable' && radarData?.roadStatus !== 'Failed';

      // 3 clean metric cards matching user mockup
      setText('[data-nearby-stat="total"]', available ? String(totalPlaces) : '—');
      setText('[data-nearby-stat="competitors"]', available ? String(radarGroups.competitors?.length || 0) : '—');
      setText('[data-nearby-stat="complementary"]', available ? String(radarGroups.complementary?.length || 0) : '—');

      setText('[data-density-count]', available ? String(metrics?.observedBusinessCount ?? totalPlaces) : '—');
      setText('[data-density-label]', metrics?.observedBusinessCount != null ? 'Mapped businesses' : 'Mapped places');
      setText('[data-density-value]', available && metrics?.observedBusinessesPerSqKm != null && Number.isFinite(density) ? number(density) : '—');
      setText('[data-density-note]', available ? `Observed records within a 500 m radius (0.7854 km²). ${radarData?.meta?.coverageNote || 'Mapping coverage is incomplete; the true business count is unknown.'}` : radarState === 'loading' ? 'Checking nearby records…' : 'Confirm a property pin to check nearby business density.');

      all('[data-radar-count]').forEach(node => {
        const key = node.dataset.radarCount;
        if (key === 'roads') {
          if (['loading','error','disabled','idle'].includes(radarState)) {
            node.textContent = '—';
          } else if (!isRoadAvailable) {
            node.textContent = 'Road data unavailable';
          } else {
            node.textContent = String(radarGroups.roads?.length || 0);
          }
        } else {
          if (['loading','error','disabled','idle'].includes(radarState)) node.textContent = '—';
          else node.textContent = String(radarGroups[key]?.length || 0);
        }
      });

      const roadBadge = $('[data-radar-road-badge]');
      if (roadBadge) {
        if (!isRoadAvailable && available) {
          roadBadge.textContent = 'Road data unavailable';
        }
      }

      const badge = $('[data-radar-badge]');
      const badgeText = $('[data-radar-badge-text]');
      if (badge && badgeText) {
        if (radarState === 'idle' || radarState === 'disabled') {
          badge.hidden = true;
        } else if (radarState === 'loading') {
          badge.hidden = false;
          badgeText.textContent = 'Scanning 500 m perimeter…';
        } else if (radarState === 'error') {
          badge.hidden = false;
          badgeText.textContent = 'Radar scan incomplete';
        } else {
          badge.hidden = false;
          badgeText.textContent = `${totalPlaces} places · 500 m radar active`;
        }
      }

      renderRadarList();

      const notices = $('[data-radar-notices]');
      if (notices) {
        if (radarState === 'error') {
          notices.innerHTML = `<div class="pw-notice pw-notice--amber"><strong>Nearby data unavailable.</strong> ${escape(radarError || 'Could not retrieve nearby records.')} Click Retry to check again.</div>`;
        } else if (radarState === 'loading') {
          notices.innerHTML = `<div class="pw-notice pw-notice-neutral"><strong>Loading nearby records…</strong> Querying OSM nodes, ways, and road network within 500 meters.</div>`;
        } else if (radarState === 'disabled') {
          notices.innerHTML = `<div class="pw-notice pw-notice-neutral"><strong>Radar is off.</strong> Turn on 500 m radar to assess nearby establishments and road access.</div>`;
        } else if (radarState === 'idle') {
          notices.innerHTML = `<div class="pw-notice pw-notice-neutral"><strong>Review proximity in context.</strong> Nearby places do not establish customer demand. Mapped roads do not confirm legal road access.</div>`;
        } else if (totalPlaces === 0) {
          notices.innerHTML = `<div class="pw-notice pw-notice-amber"><strong>No mapped establishments in official registry for this 500m radius.</strong> Missing mapped coverage does not imply an absence of commercial activity. Field survey or BPLO records may be required.</div>`;
        } else {
          notices.innerHTML = '<p class="pw-small pw-muted">Distances are straight-line measurements. Mapped roads need a separate access check.</p>';
        }
      }

      if (radarState === 'error') setText('[data-radar-coverage]', 'Unable to load nearby data. Check network connection and click Retry.');
      else if (radarState === 'loading') setText('[data-radar-coverage]', 'Querying OpenStreetMap and local records within 500 meters straight-line distance…');
      else if (radarState === 'disabled') setText('[data-radar-coverage]', 'Radar is off. Turn it on to check the 500-meter straight-line radius.');
      else if (radarState === 'idle') setText('[data-radar-coverage]', 'Choose or place a reference point on the map to run geographic distance checks within 500 meters.');
      else {
        const meta = radarData?.meta || {};
        const cacheNote = meta.stale ? ' (Offline fallback)' : meta.cached ? ' (Cached)' : ' (Live)';
        const retDate = meta.retrievedDate || meta.retrievalDate || 'Recent';
        const unclass = radarGroups.unclassified.length;
        const related = radarGroups.related.length;
        setText('[data-radar-coverage]', `Data sourced from ${meta.source || 'OpenStreetMap & local repository'}${cacheNote} · Retrieved ${retDate}.${related ? ` ${related} related establishments.` : ''}${unclass ? ` ${unclass} other nearby places visible on map.`:''} Straight-line distance from reference point.`);
      }

      syncNearbyAssessment();
    }
    function syncNearbyAssessment() {
      const hasVerifiedBenchmarks = Boolean(radarData?.benchmarks?.isComplete);
      const badge = $('[data-nearby-assessment-badge]');
      const expl = $('[data-nearby-assessment-explanation]');
      const contrib = $('[data-nearby-mce-contrib]');
      const formula = $('[data-nearby-mce-formula]');

      if (hasVerifiedBenchmarks && radarData?.benchmarks?.scores) {
        const scores = radarData.benchmarks.scores;
        const commScore = Number(scores.commercial_activity ?? 0);
        const complScore = Number(scores.complementary_businesses ?? 0);
        const compPScore = Number(scores.competitive_pressure ?? 0);
        const anchorScore = Number(scores.activity_anchors ?? 0);
        const total = Math.round((commScore * 0.25 + complScore * 0.30 + compPScore * 0.30 + anchorScore * 0.15) * 100) / 100;
        const iaiContrib = Math.round((total * 0.10) * 100) / 100;

        if (badge) {
          badge.textContent = `${total.toFixed(1)} / 100 pts`;
          badge.className = 'pw-badge pw-badge-teal';
        }
        if (expl) {
          expl.textContent = `Commercial environment score evaluated against certified BPLO benchmarks for ${value('radar_business_type') || 'the selected business'}.`;
        }
        setText('[data-subcrit-score="commercial_activity"]', `${commScore.toFixed(1)} pts`);
        $('[data-subcrit-bar="commercial_activity"]')?.style.setProperty('width', `${Math.min(100, commScore)}%`);

        setText('[data-subcrit-score="complementary_businesses"]', `${complScore.toFixed(1)} pts`);
        $('[data-subcrit-bar="complementary_businesses"]')?.style.setProperty('width', `${Math.min(100, complScore)}%`);

        setText('[data-subcrit-score="competitive_pressure"]', `${compPScore.toFixed(1)} pts`);
        $('[data-subcrit-bar="competitive_pressure"]')?.style.setProperty('width', `${Math.min(100, compPScore)}%`);

        setText('[data-subcrit-score="activity_anchors"]', `${anchorScore.toFixed(1)} pts`);
        $('[data-subcrit-bar="activity_anchors"]')?.style.setProperty('width', `${Math.min(100, anchorScore)}%`);

        if (contrib) contrib.textContent = `${iaiContrib.toFixed(2)} pts (10% of MCE)`;
        if (formula) formula.textContent = `Formula: ${total.toFixed(2)} × 0.10 = ${iaiContrib.toFixed(2)} pts toward overall MCE.`;
      } else {
        if (badge) {
          badge.textContent = 'Assessment Incomplete';
          badge.className = 'pw-badge pw-badge-amber';
        }
        const mappedCount = (radarGroups.competitors?.length || 0) + (radarGroups.related?.length || 0) + (radarGroups.complementary?.length || 0) + (radarGroups.unclassified?.length || 0);
        if (expl) {
          expl.textContent = mappedCount > 0
            ? `${mappedCount} establishments mapped in 500m radius (${radarGroups.competitors?.length || 0} competitors, ${radarGroups.related?.length || 0} related, ${radarGroups.complementary?.length || 0} complementary). Score is pending certified BPLO benchmarks for ${value('radar_business_type') || 'selected business'}.`
            : 'Scan 500m perimeter from entrance or pin to check commercial density, competitors, and complementary clusters.';
        }
        ['commercial_activity', 'complementary_businesses', 'competitive_pressure', 'activity_anchors'].forEach(k => {
          setText(`[data-subcrit-score="${k}"]`, mappedCount > 0 ? 'Pending BPLO benchmarks' : 'Scan needed');
          $(`[data-subcrit-bar="${k}"]`)?.style.setProperty('width', '0%');
        });
        if (contrib) contrib.textContent = 'Pending verified benchmarks (10% weight)';
        if (formula) formula.textContent = 'Formula: Nearby Businesses Score × 0.10. Missing source data is never defaulted.';
      }
    }
    function renderRadarList() {
      const list=$('[data-radar-results]');if(!list)return;
      const countEl=$('[data-radar-filter-count]');
      if(radarState==='idle'){
        if(countEl)countEl.textContent='';
        list.innerHTML=`<div class="pw-empty"><svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg><strong>Choose a reference point</strong><p>Locate the entrance on the map or select Parcel center to check nearby mapped places.</p></div>`;
        return;
      }
      if(radarState==='disabled'){
        if(countEl)countEl.textContent='';
        list.innerHTML='<p class="pw-empty-state">Turn on the 500 m radar to check nearby places.</p>';
        return;
      }
      if(radarState==='loading'){
        if(countEl)countEl.textContent='';
        list.innerHTML='<div class="pw-radar-loading"><div class="pw-radar-spinner"></div><strong>Loading nearby data…</strong><p>Checking mapped places and road records within 500 meters.</p></div>';
        return;
      }
      if(radarState==='error'){
        if(countEl)countEl.textContent='';
        list.innerHTML=`<div class="pw-radar-error"><svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><strong>Unable to load nearby data</strong><p>${escape(radarError || 'The mapping service could not be reached.')}</p><button type="button" class="pw-button pw-button-light pw-button-small" data-radar-retry>Retry</button></div>`;
        return;
      }
      let rows;
      if (radarTab === 'all') {
        rows = [...(radarGroups.competitors || []), ...(radarGroups.related || []), ...(radarGroups.complementary || []), ...(radarGroups.unclassified || [])].sort((a,b) => a.distance - b.distance);
      } else {
        rows = radarGroups[radarTab] || [];
      }
      const totalInTab=rows.length;
      if(radarSearchQuery){
        rows=rows.filter(({feature})=>{
          const p=feature.properties || {};
          const name=(p.name || '').toLowerCase();
          const cat=(p.category || p.businessType || p.amenity || p.shop || p.highway || '').toLowerCase();
          const note=(p.note || p.status || p.source || '').toLowerCase();
          return name.includes(radarSearchQuery) || cat.includes(radarSearchQuery) || note.includes(radarSearchQuery);
        });
      }
      if(countEl){
        countEl.textContent=radarSearchQuery?`${rows.length} of ${totalInTab}`:'';
      }
      if(!rows.length){
        list.innerHTML=radarSearchQuery?`<p class="pw-empty-state">No matching places found for "${escape(radarSearchQuery)}".</p>`:'<p class="pw-empty-state">No matching records found in this dataset.</p>';
        return;
      }
      list.innerHTML=rows.map(({feature,distance,id})=>{
        const p=feature.properties || {};
        const isRoad=radarTab==='roads';
        const name=escape(p.name || (isRoad?'Mapped road segment':'Mapped establishment'));
        const sub=escape(p.note || p.category || (isRoad?(p.highway || 'Road'):(p.status || 'Mapped record')));
        const src=p.locationSource && /^https:\/\//.test(p.locationSource)?`<a href="${escape(p.locationSource)}" target="_blank" rel="noopener noreferrer">Source${p.checkedOn?` · ${escape(p.checkedOn)}`:''} ↗</a>`:(p.source?`<span class="pw-muted">${escape(p.source)}</span>`:'');
        const distM=distance!=null?Math.round(distance):null;
        const walkTxt=walkingEstimate(distM);
        const badge=getBrandBadge(p.name, p.category, radarTab);
        return `<article class="pw-radar-row" data-radar-row-id="${id || ''}">${badge}<div><strong>${name}</strong><small>${sub}</small>${src?`<small>${src}</small>`:''}</div><div class="pw-radar-dist-col">${distM!=null?`<b>${distM} m</b>${walkTxt?`<small>${walkTxt}</small>`:''}`:''}</div></article>`;
      }).join('');
    }
    const radarResultsEl=$('[data-radar-results]');
    if(radarResultsEl){
      radarResultsEl.addEventListener('mouseover',event=>{
        const row=event.target.closest('.pw-radar-row');if(!row)return;
        const rowId=row.dataset.radarRowId;if(!rowId)return;
        const item=radarLayerItems.get(rowId);if(!item)return;
        row.classList.add('is-hovered');
        const ref=point('reference_lat','reference_lng');
        if(ref && item.coords && radarMap){
          if(hoverVectorLayer){hoverVectorLayer.remove();hoverVectorLayer=null;}
          hoverVectorLayer=L.polyline([ref,item.coords],{color:'#2563eb',weight:2.5,dashArray:'5 5',opacity:.95}).addTo(radarMap);
          const distM=Math.round(item.distance);
          hoverVectorLayer.bindTooltip(`${distM} m`,{permanent:true,direction:'center',className:'pw-vector-tooltip'}).openTooltip();
        }
        if(item.layer.setRadius){
          item.layer.setRadius(item.origRadius+3);
          item.layer.setStyle({weight:3.5,color:'#1d4ed8'});
        } else if(item.layer.setStyle){
          item.layer.setStyle({weight:5.5,color:'#1d4ed8'});
        }
      });
      radarResultsEl.addEventListener('mouseout',event=>{
        const row=event.target.closest('.pw-radar-row');if(!row)return;
        row.classList.remove('is-hovered');
        if(hoverVectorLayer){hoverVectorLayer.remove();hoverVectorLayer=null;}
        const rowId=row.dataset.radarRowId;if(!rowId)return;
        const item=radarLayerItems.get(rowId);if(!item)return;
        if(item.layer.setRadius){
          item.layer.setRadius(item.origRadius);
          item.layer.setStyle({weight:2,color:'#ffffff'});
        } else if(item.layer.setStyle){
          item.layer.setStyle({weight:item.origWeight || 3,color:item.origColor || '#64748b'});
        }
      });
      radarResultsEl.addEventListener('click',event=>{
        if(event.target.closest('a'))return;
        const row=event.target.closest('.pw-radar-row');if(!row)return;
        const rowId=row.dataset.radarRowId;if(!rowId)return;
        const item=radarLayerItems.get(rowId);if(!item)return;
        all('.pw-radar-row').forEach(r=>r.classList.remove('is-active-target'));
        row.classList.add('is-active-target');
        if(item.coords && radarMap){
          radarMap.panTo(item.coords,{animate:true,duration:.35});
          item.layer.openPopup();
        }
      });
    }
    all('[data-radar-map-filter]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        all('[data-radar-map-filter]').forEach(b=>b.classList.remove('is-active'));
        btn.classList.add('is-active');
        radarMapFilter=btn.dataset.radarMapFilter || 'all';
        applyRadarMapFilter();
      });
    });
    $('[data-radar-search]')?.addEventListener('input',event=>{
      radarSearchQuery=event.target.value.trim().toLowerCase();
      renderRadarList();
    });
    field('radar_business_type')?.addEventListener('change',()=>{if(point('reference_lat','reference_lng'))syncRadar();});
    field('reference_label')?.addEventListener('change',()=>{
      if(value('reference_label')==='location'){
        setReference(point());placingReference=false;syncRadar();
      } else if(value('reference_label')==='center'){
        if(boundary && window.turf){
          const center=turf.centerOfMass(boundary).geometry.coordinates;
          setReference([center[1],center[0]]);dirtyReference=true;placingReference=false;$('[data-place-reference]')?.classList.remove('is-active');
          notify('Reference point set to the parcel center of mass.');
          syncRadar();
        } else {
          notify('Draw the parcel boundary in Step 2 to use the parcel center.');
          field('reference_label').value='entrance';
        }
      } else {
        field('reference_label').value='entrance';dirtyReference=false;placingReference=true;$('[data-place-reference]')?.classList.add('is-active');
        notify('Click the surroundings map or drag its pin to locate the property entrance.');
      }
    });
    $('[data-radar-toggle]')?.addEventListener('change',syncRadar);
    $('[data-place-reference]')?.addEventListener('click',()=>{
      field('reference_label').value='entrance';dirtyReference=false;placingReference=true;
      $('[data-place-reference]').classList.add('is-active');
      notify('Click anywhere on the map to set the property entrance reference point.');
    });
    function ready(assessmentValue) {
      if(assessmentValue !== undefined)lastAssessment=assessmentValue;
      assessmentValue=lastAssessment;
      const root=$('[data-assessment-readiness]');if(!root)return;
      root.innerHTML=Object.entries(actions).map(([key,[action,button,target]])=>{
        const scored=assessmentValue?.assessmentCriteria?.[key]!=null;
        return `<article class="pw-readiness-row"><span class="pw-readiness-icon" aria-hidden="true">${{spatial_accessibility:'⌖',infrastructure_readiness:'⚙',economic_viability:'▥',nearby_businesses:'▦',zoning_compatibility:'▤',risk_constraints:'△'}[key]}</span><div><strong>${labels[key]}</strong><small>${scored?'Source evidence available.':action}</small></div><button type="button" class="pw-readiness-action ${scored?'is-ready':''}" data-readiness-target="${target}">${scored?'View':button}</button></article>`;
      }).join('');
      setText('[data-readiness-title]',assessmentValue?.assessmentComplete?'Assessment ready':'IAI not ready');
      setText('[data-readiness-summary]',assessmentValue?.assessmentComplete?'All six criteria have source evidence. Review the calculated assessment.':'Record the facts and confirm source evidence with the reviewing office.');
      const assessBadge = $('[data-assessment-readiness-badge]');
      if (assessBadge) {
        assessBadge.textContent = assessmentValue?.assessmentComplete ? 'Assessment ready' : 'IAI pending';
        assessBadge.className = `pw-badge ${assessmentValue?.assessmentComplete ? 'pw-badge-teal' : 'pw-badge-amber'}`;
      }
      updateCriteriaStatus();
      updateReviewStatus(point(), enteredAreaSqm());
    }
    form.addEventListener('sfc:assessment',event=>ready(event.detail));
    form.addEventListener('click',event=>{
      if(event.target.closest('[data-radar-retry]')){
        const ref=point('reference_lat','reference_lng');
        if(ref)fetchRadar(ref,value('radar_business_type') || 'cafe',true);
        return;
      }
      const focusBtn=event.target.closest('[data-focus-radar-row]');
      if(focusBtn){
        const rowId=focusBtn.dataset.focusRadarRow;
        if(rowId){
          const item=radarLayerItems.get(rowId);
          if(item){
            const targetTab=item.role==='unclassified'?'competitors':item.role;
            if(radarTab!==targetTab){
              radarTab=targetTab;
              tabs('data-radar-tab','data-radar-unused-panel',targetTab);
              renderRadarList();
            }
            focusRadarRow(rowId);
          }
        }
        return;
      }
      if(event.target.closest('[data-view-assessment]')){
        all('[data-editor-step]').find(node=>node.dataset.editorStep==='3')?.click();
        tabs('data-review-tab','data-review-panel','assessment');return;
      }
      const button=event.target.closest('[data-readiness-target]');if(!button)return;
      const target=button.dataset.readinessTarget;
      if(target==='boundary')all('[data-editor-step]').find(node=>node.dataset.editorStep==='1')?.click();
      else if(target==='radar' || actions[target] || ['spatial_accessibility','infrastructure_readiness','economic_viability','nearby_businesses','zoning_compatibility','risk_constraints'].includes(target)){
        all('[data-editor-step]').find(node=>node.dataset.editorStep==='2')?.click();
        selectEvidenceCriterion(target==='radar'?'nearby_businesses':target);
        $(`[data-evidence-tab="${target==='radar'?'nearby_businesses':target}"]`)?.focus();
      } else {
        selectEvidenceCriterion(target);
        $(`[data-evidence-tab="${target}"]`)?.focus();
      }
    });
    function assessmentInputs() {
      const survey=+value('land_area');
      const areaVal = survey > 0 ? value('land_area') : (estimatedArea > 0 ? String(estimatedArea) : '');
      const unitVal = survey > 0 ? value('land_area_unit') : 'sqm';
      return {lat:value('lat'),lng:value('lng'),category:value('category'),subcategory:value('subcategory'),land_area:areaVal,land_area_unit:unitVal};
    }
    async function matches() {
      matchController?.abort();matchController=new AbortController();
      const current=++matchRevision;
      const container=$('[data-business-matches]');if(!container)return;
      if (!point()) {
        clearMatchDetails();container.innerHTML='<div class="pw-match-pending"><span class="pw-pill">Location pending</span><h3>Listing ready for city review</h3><p>Add an exact location later to check spatial evidence and potential business matches.</p></div>';return;
      }
      container.innerHTML='<p class="pw-empty-state">Checking assessment evidence and approved business profiles…</p>';
      clearMatchDetails();
      try{
        const payload=await get(`property-business-preview.php?${new URLSearchParams(assessmentInputs())}`,matchController.signal);
        if(current!==matchRevision || !dialog.open)return;
        selectedMatches=payload.matches || [];
        if(!selectedMatches.length){
          container.innerHTML=`<div class="pw-match-pending"><span class="pw-pill">Assessment pending</span><h3>Business matches need supporting evidence</h3><p>${escape(payload.message || 'Complete the six criteria and approved business profiles to compare eligible options.')}</p></div>`;
          const breakdown=$('[data-match-breakdown]');if(breakdown)breakdown.innerHTML=`<h3>Six criteria, one documented method</h3>${Object.entries(payload.weights || {}).map(([key,weight])=>`<div class="pw-weight-row"><span>${escape(labels[key] || key)}</span><strong>${weight}%</strong></div>`).join('')}<p class="pw-muted">Ratings and weighted totals appear when the evidence and approved method are ready.</p>`;
          const reasons=$('[data-match-reasons]');if(reasons)reasons.innerHTML=`<h3>What still needs checking</h3><ol class="pw-concerns">${(payload.missingCriteria || Object.entries(actions).map(([key,[nextAction]])=>({label:labels[key],nextAction}))).map(item=>`<li><strong>${escape(item.label)}</strong><span>${escape(item.nextAction)}</span></li>`).join('')}</ol><p class="pw-muted">Business-specific scoring profiles require approval against the manuscript before ranking.</p>`;
        } else{
          container.innerHTML=selectedMatches.slice(0,3).map((match,index)=>`<button type="button" class="pw-business-match ${index===0?'is-active':''}" data-select-match="${index}"><span class="pw-match-rank">${index+1}</span><span><strong>${escape(match.label)}</strong><small>Business fit ${number(match.score)} / 100</small></span><span class="pw-match-radio" aria-hidden="true"></span></button>`).join('');renderMatch(0);
        }
      }catch(error){if(current===matchRevision && error.name!=='AbortError'){clearMatchDetails();container.innerHTML=`<p class="pw-empty-state">${escape(error.message)} Business matches are pending. You can save the property for review.</p>`;}}
    }
    function clearMatchDetails(){
      selectedMatches=[];
      const breakdown=$('[data-match-breakdown]'),reasons=$('[data-match-reasons]');
      if(breakdown)breakdown.innerHTML='<h3>Score breakdown</h3><p class="pw-empty-state">Ratings require current evidence and approved business profiles.</p>';
      if(reasons)reasons.innerHTML='<h3>Supporting reasons and concerns</h3><p class="pw-empty-state">Review the current assessment evidence before comparing eligible businesses.</p>';
    }
    ['lat','lng','category','subcategory','land_area','land_area_unit','calculated_area_sqm'].forEach(name=>{
      field(name)?.addEventListener(field(name).tagName==='SELECT'?'change':'input',()=>{matchController?.abort();matchRevision++;clearMatchDetails();if(step===3)$('[data-business-matches]').innerHTML='<p class="pw-empty-state">Property inputs changed. Return to Review to refresh the business matches.</p>';});
    });
    function renderMatch(index) {
      const match=selectedMatches[index];if(!match)return;
      all('[data-select-match]').forEach(button=>{const active=+button.dataset.selectMatch===index;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
      $('[data-match-breakdown]').innerHTML=`<h3>${escape(match.label)}: score breakdown</h3><p class="pw-muted">Approved business profile · Weighted criteria</p>${match.criteria.map(item=>`<div class="pw-rating-row"><span>${escape(item.label)}</span><span class="pw-rating-track"><i style="width:${Math.max(0,Math.min(100,item.rating))}%"></i></span><b>${number(item.rating)}/100</b><small>${item.weight}%</small></div>`).join('')}<div class="pw-weight-total"><span>Weighted business fit score</span><strong>${number(match.score)} / 100</strong></div>`;
      $('[data-match-reasons]').innerHTML=`<h3>Why this business matches</h3><ol class="pw-concerns">${(match.reasons || []).map(reason=>`<li><span>${escape(reason)}</span></li>`).join('')}</ol><h3>What still needs checking</h3><ol class="pw-concerns">${(match.concerns || []).map(reason=>`<li><span>${escape(reason)}</span></li>`).join('')}</ol>`;
    }
    form.addEventListener('click',event=>{const button=event.target.closest('[data-select-match]');if(button)renderMatch(+button.dataset.selectMatch);});
    function draft() {
      const values={};
      for(const element of form.elements){
        if(!element.name || element.type==='file' || ['submit','button'].includes(element.type) || element.name==='id')continue;
        if(element.type==='checkbox'){values[element.name] ||= [];if(element.checked)values[element.name].push(element.value);}
        else if(element.type==='radio'){if(element.checked)values[element.name]=element.value;}
        else values[element.name]=element.value;
      }
      const nearbyData=new FormData();nearbyEditor?.append(nearbyData);
      const activeCount = selectedPhotoFiles.length + existingPhotoMedia.filter(m => !m.isRemoved).length;
      return {
        values,
        step,
        locationMethod,
        locationCapture,
        savedAt: new Date().toISOString(),
        hasPhoto: Boolean(activeCount > 0 || field('image_file')?.files?.length || evidenceFiles?.files?.length || [...nearbyData.keys()].some(key=>key.startsWith('nearby_photo_'))),
        photoCount: activeCount,
        coverPhoto: coverPhoto?.kind === 'new' ? {kind:'new',index:selectedPhotoFiles.indexOf(coverPhoto.file)} : coverPhoto?.kind === 'existing' ? {kind:'existing',id:coverPhoto.media.id,source:coverPhoto.media.source} : null,
        photoDisplayOrder: (typeof photoDisplayOrder !== 'undefined' && Array.isArray(photoDisplayOrder)) ? photoDisplayOrder : [],
        hasEvidenceFiles: Boolean(evidenceFiles?.files?.length),
        nearby: JSON.parse(nearbyData.get('nearbyProperties') || '[]'),
        radarEnabled: $('[data-radar-toggle]')?.checked,
        referenceConfirmed: dirtyReference
      };
    }
    function setDraftStatus(text, saved = false) {
      const status = $('[data-device-draft-status]');
      if (!status) return;
      ($('[data-device-draft-text]') || status).textContent = text;
      status.classList.toggle('is-saved', saved);
    }
    function flashDraftSaved() { setDraftStatus('Saved on this device', true); }
    function saveDraftValues() {
      if (!draftKey || submitted) return false;
      localStorage.setItem(draftKey, JSON.stringify(draft()));
      return true;
    }
    function queueAutosave(event) {
      if (event?.target?.type === 'file') {mediaRevision++;mediaDirty=true;}
      if (!dialog.open || !draftKey || submitted) return;
      clearTimeout(autosaveTimer);
      setDraftStatus('Unsaved changes');
      const generation = draftGeneration;
      autosaveTimer = setTimeout(async () => {
        if (submitted || generation !== draftGeneration) return;
        try {
          if (!saveDraftValues()) return;
          const mediaSaved = !mediaDirty || await persistDraftMedia(draftKey,generation);
          if (submitted || generation !== draftGeneration) return;
          setDraftStatus(mediaSaved ? 'Saved on this device' : 'Details saved · files not saved',mediaSaved);
        }
        catch { setDraftStatus('Draft not saved'); }
      }, 650);
    }
    async function persistDraftMedia(key, generation) {
      const revisionAtSave = mediaRevision;
      const saved = await PropertyDraftStorage.saveMedia(key, {
        files:selectedPhotoFiles, existingMedia:existingPhotoMedia,
        evidenceFiles:Array.from(evidenceFiles?.files || []),
        authorityFiles:Array.from(authInput?.files || [])
      });
      if (submittedGenerations.has(generation)) { await PropertyDraftStorage.deleteMedia(key); return false; }
      if (saved && generation === draftGeneration && revisionAtSave === mediaRevision) mediaDirty=false;
      return saved || (selectedPhotoFiles.length === 0 && existingPhotoMedia.length === 0 && !evidenceFiles?.files?.length && !authInput?.files?.length);
    }
    async function saveDraft(andClose = false) {
      clearTimeout(autosaveTimer);
      const generation = draftGeneration;
      const key = draftKey;
      try {
        setDraftStatus('Saving draft…');
        if (!saveDraftValues()) return;
        const mediaSaved = await persistDraftMedia(key,generation);
        if (generation !== draftGeneration || submitted) return;
        const hasNewFiles = selectedPhotoFiles.length > 0 || evidenceFiles?.files?.length > 0 || authInput?.files?.length > 0;
        if (!mediaSaved && hasNewFiles) {
          setDraftStatus('Details saved · check files');
          notify('Your details are saved. Some selected files could not be stored on this device. Keep the form open to submit them, or choose them again when you return.', true);
          return;
        }
        flashDraftSaved();
        const count = selectedPhotoFiles.length + existingPhotoMedia.filter(m => !m.isRemoved).length;
        if (andClose) {
          dialog.close();
          const workspace = document.querySelector('[data-workspace-status]');
          if (workspace) {
            workspace.textContent = `Draft saved on this device${count > 0 ? ` (${count} photo${count === 1 ? '' : 's'} preserved)` : ''}. Open the property form to resume.`;
          }
        } else {
          notify(`Draft saved on this device${count > 0 ? ` with ${count} photo${count === 1 ? '' : 's'}` : ''}.`);
        }
      } catch {
        setDraftStatus('Draft not saved');
        notify('The browser could not store this draft. Your changes are still here. Keep the form open and submit the property, or try saving again.', true);
      }
    }
    all('[data-save-draft]').forEach(btn => btn.addEventListener('click', () => saveDraft(false)));
    all('[data-save-exit]').forEach(btn => btn.addEventListener('click', () => saveDraft(true)));
    dialog.addEventListener('close', () => {
      clearTimeout(autosaveTimer);
      cancelSearch();locationRevision++;deviceRequest++;
      if(deviceButton){deviceButton.disabled=false;deviceButton.removeAttribute('aria-busy');}
      controller?.abort();
      radarController?.abort();
      searchController?.abort();
      matchController?.abort();
      revision++;
      radarRevision++;
      matchRevision++;
      boundaryMap?.pm?.disableDraw();
      parcelLayer?.pm?.disable();
      placingReference = false;
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
        imageObjectUrl = null;
      }
      if (!submitted && draftKey && (value('property_name') || selectedPhotoFiles.length > 0)) {
        try {
          localStorage.setItem(draftKey, JSON.stringify(draft()));
          persistDraftMedia(draftKey,draftGeneration);
        } catch {}
      }
    });
    form.addEventListener('input',preview);form.addEventListener('change',preview);
    form.addEventListener('input',queueAutosave);form.addEventListener('change',queueAutosave);
    form.addEventListener('classificationchange',queueAutosave);
    form.addEventListener('click',event => { if(event.target.closest('[data-gallery-remove],[data-gallery-make-cover],[data-photo-remove-all],[data-boundary-action]'))queueAutosave(); });
    window.addEventListener('resize', () => {
      if (dialog?.open) {
        if (boundaryMap) boundaryMap.invalidateSize({ pan: false });
        if (radarMap) radarMap.invalidateSize({ pan: false });
      }
    });
    ready();
    return {
      getClassification,
      setAdditionalSubcategories,
      syncClassification,
      validateBasics,
      showSubmissionError,
      sync:syncLocation,
      inputs:assessmentInputs,
      setNearby(editor){nearbyEditor=editor;},
      validateBoundary(){
        if($('[data-coordinate-pair]')?.value.trim() && !applyCoordinates(false))return false;
        syncAreaLimits();
        if (!enteredAreaSqm() && estimatedArea > 0 && estimatedArea < 0.5) {
          selectLocationMethod('draw');notify('The drawn plot is smaller than the supported 0.5 m² minimum. Adjust or clear the boundary, or add a recorded area.',true);return false;
        }
        if (value('land_area') !== '' && !field('land_area').checkValidity()) {
          const message = 'Enter an area of at least 0.5 m² (0.00005 ha), within the supported range, or leave it blank and use a property pin.';
          showFieldError(field('land_area'),message); notify(message,true); focusIssue(field('land_area')); return false;
        }
        if ((value('lat') !== '' || value('lng') !== '') && !point()) {
          selectLocationMethod('pin');notify('Provide both valid latitude and longitude, or clear both fields and enter an area size.',true);
          const target=field(value('lat') === '' || !Number.isFinite(+value('lat')) || Math.abs(+value('lat'))>90 ? 'lat' : 'lng');
          showFieldError(target,'Provide a valid coordinate pair. Latitude is −90 to 90; longitude is −180 to 180.');
          target?.focus({preventScroll:true});
          return false;
        }
        if (!(estimatedArea > 0) && !enteredAreaSqm() && !point()) {
          notify('Enter an area size, pin the property location, or draw a plot to continue.',true);
          field('lat')?.focus();return false;
        }
        return true;
      },
      validateSurroundings(){
        if (typeof validateEconomicViabilityFields === 'function' && !validateEconomicViabilityFields()) {
          return false;
        }
        return true;
      },
      onStep(next){
        step=next;
        const nextButton = form.querySelector('[data-editor-next]');
        const nextLabel = nextButton?.querySelector('[data-editor-next-label]') || nextButton;
        if (nextLabel) {
          nextLabel.textContent = next === 0 ? 'Continue to location' : (next === 1 ? 'Continue to Site Evidence' : (next === 2 ? 'Continue to Review' : 'Save property'));
        }
        if(next===1 && locationMethod==='area' && (point() || boundary)){
          selectLocationMethod(boundary ? 'draw' : 'pin', false);
        }
        preview();
        if(next===1){
          syncBarangayContext();
          syncAreaEquivalents();
          syncLocation(true);
          renderLayers();
          if(value('barangay') && !point() && !boundary)proceedToBarangay(value('barangay'),false);
          requestAnimationFrame(() => {
            if (boundaryMap) {
              boundaryMap.invalidateSize({pan:false});
              const coords = point();
              if (coords) boundaryMap.setView(coords, Math.max(17, boundaryMap.getZoom()), {animate:false});
              else if (value('barangay')) proceedToBarangay(value('barangay'), false);
            }
          });
          setTimeout(() => {
            if (boundaryMap) {
              boundaryMap.invalidateSize({pan:false});
              const coords = point();
              if (coords) boundaryMap.setView(coords, Math.max(17, boundaryMap.getZoom()), {animate:false});
            }
          }, 120);
        }
        if(next===2){
          const evidenceEditor = $('[data-evidence-editor]');
          if (evidenceEditor) evidenceEditor.open = true;
          syncSpatialAccessibility();
          syncInfrastructureReadiness();
          syncEconomicViability();
          syncZoningCompatibility();
          assessHazards();
          syncNearbyAssessment();
          requestAnimationFrame(() => {
            if (radarMap) {
              radarMap.invalidateSize();
              if (radiusLayer) radarMap.fitBounds(radiusLayer.getBounds(), { padding: [25, 25] });
            }
          });
          setTimeout(() => {
            if (radarMap) {
              radarMap.invalidateSize();
              if (radiusLayer) radarMap.fitBounds(radiusLayer.getBounds(), { padding: [25, 25] });
            }
          }, 100);
        }
        if(next===3){assessment?.refresh();matches();}
        if(next!==1){boundaryMap?.pm?.disableDraw();parcelLayer?.pm?.disable();}
        if (!submitted && dialog.open && next > 0) {
          try {
            localStorage.setItem(draftKey, JSON.stringify(draft()));
            flashDraftSaved();
            const generation = draftGeneration;
            persistDraftMedia(draftKey,generation).then(saved => {
              if (!saved && !submitted && generation === draftGeneration) setDraftStatus('Details saved · files not saved');
            });
          } catch {
            /* Submission still works when browser storage is unavailable. */
          }
        }
      },
      setProperty(property){
        clearTimeout(autosaveTimer); submitted=false; draftGeneration++; mediaRevision++;
        step=0;
        setDraftStatus('Not saved yet');
        all('[data-field-error]').forEach(node => {node.hidden=true;node.textContent='';});
        all('[aria-invalid="true"]').forEach(node => node.removeAttribute('aria-invalid'));
        cancelSearch();locationRevision++;deviceRequest++;locationCapture=null;
        deviceAccuracyLayer?.remove();deviceAccuracyLayer=null;
        if(deviceButton){deviceButton.disabled=false;deviceButton.removeAttribute('aria-busy');}
        const coordinatePair=$('[data-coordinate-pair]');if(coordinatePair){coordinatePair.value='';coordinatePair.removeAttribute('aria-invalid');}
        all('.pw-coordinate-details,.pw-readiness-disclosure,.pw-hazard-disclosure,.pw-details,.pw-evidence-editor,.pw-assessment-details,[data-map-layers]').forEach(details => {details.open=false;});
        const historicalStatus = field('status')?.querySelector('[value="Availed"]');
        if (historicalStatus) { historicalStatus.hidden = property?.status !== 'Availed'; historicalStatus.disabled = property?.status !== 'Availed'; }
        controller?.abort();radarController?.abort();searchController?.abort();matchController?.abort();revision++;radarRevision++;matchRevision++;lastAssessment=null;clearMatchDetails();
        parcelLayer?.remove();parcelLayer=null;locationMarker?.remove();locationMarker=null;
        radarMarker?.remove();radarMarker=null;radarLayers.forEach(layer=>layer.remove());radarLayers=[];radiusLayer?.remove();radarParcel?.remove();
        history=[];boundary=property?.parcel?.boundary || null;estimatedArea=0;context=null;radarData=null;radarState='idle';radarError=null;selectedMatches=[];dirtyReference=Boolean(property?.parcel?.referencePoint?.lat!=null);placingReference=false;
        if(imageObjectUrl)URL.revokeObjectURL(imageObjectUrl);imageObjectUrl=null;
        selectedPhotoFiles.forEach(f => { if (f._objectUrl) URL.revokeObjectURL(f._objectUrl); });
        selectedPhotoFiles = [];
        existingPhotoMedia = [];
        coverPhoto = null;
        existingImage=property?.imageUrl ? (/^https?:\/\//.test(property.imageUrl)?property.imageUrl:`${config.basePath || ''}/${property.imageUrl.replace(/^\//,'')}`) : '';
        if (Array.isArray(property?.media) && property.media.length > 0) {
          existingPhotoMedia = property.media.map(m => {
            const raw = m.source || m.url || '';
            const src = /^https?:\/\//.test(raw) ? raw : `${config.basePath || ''}/${raw.replace(/^\//, '')}`;
            return { id: m.id || null, source: src, isRemoved: false };
          });
        } else if (existingImage) {
          existingPhotoMedia = [{ id: null, source: existingImage, isRemoved: false }];
        }
        const parcel=property?.parcel;
        if(field('area_method'))field('area_method').value=parcel?.areaMethod || (property?.area>0?'survey':'declared');
        propertyId=property?.id || null;savedAttachments=parcel?.attachments || [];showEvidenceFiles();
        if(field('property_subname')) field('property_subname').value = property?.subname || property?.propertySubname || '';
        if(parcel?.boundary || parcel?.surveyAreaSqm>0){field('land_area').value=parcel.surveyAreaSqm>0?parcel.surveyAreaSqm:'';field('land_area_unit').value='sqm';}
        for(const [name,val] of Object.entries(parcel?.observations || {})){if(field(name))field(name).value=val ?? '';}
        const restoredZoning = property?.clupProfile?.zoningClassification || property?.zoningClassification || property?.zoning_classification || '';
        const restoredActivity = property?.clupProfile?.proposedActivity || property?.proposedActivity || property?.proposed_activity || '';
        const restoredExistingLandUse = property?.clupProfile?.existingLandUse || property?.existingLandUse || property?.existing_land_use || '';
        if (field('zoning_classification') && restoredZoning) field('zoning_classification').value = restoredZoning;
        if (field('proposed_activity') && restoredActivity) field('proposed_activity').value = restoredActivity;
        if (field('existing_land_use') && restoredExistingLandUse) field('existing_land_use').value = restoredExistingLandUse;
        const initialLat = property?.lat ?? property?.latitude ?? parcel?.lat ?? null;
        const initialLng = property?.lng ?? property?.longitude ?? parcel?.lng ?? null;
        if (initialLat != null && initialLng != null && Number.isFinite(+initialLat) && Number.isFinite(+initialLng)) {
          if (field('lat')) field('lat').value = Number(initialLat).toFixed(6);
          if (field('lng')) field('lng').value = Number(initialLng).toFixed(6);
        } else {
          if (field('lat')) field('lat').value = '';
          if (field('lng')) field('lng').value = '';
        }
        restoreClassification(property?.category || 'Land', property?.subcategory || '');

        propertyApprovalState = property?.approvalState || property?.approval_state || 'draft';
        const removeInput = $('[data-remove-image]');
        if (removeInput) removeInput.value = '0';
        const removalBadge = $('[data-photo-removal-badge]');
        if (removalBadge) removalBadge.hidden = true;
        const thumb = $('[data-photo-thumb]');
        if (thumb) thumb.classList.remove('is-staged-removed');

        // Preserved availability and publication status
        if (field('status') && property?.status) {
          field('status').value = property.status;
        }

        // Listing purpose radio
        const propPurpose = property?.listingPurpose || property?.listing_purpose || 'sale';
        const purpRadio = form.querySelector(`[name="listing_purpose"][value="${propPurpose}"]`);
        if (purpRadio) purpRadio.checked = true;

        // Legacy zero prices detection
        isLegacyZeroSale = (property?.price === 0 || property?.salePrice === 0 || property?.price === '0') && property?.price !== null && property?.price !== '';
        isLegacyZeroLease = (property?.leasePrice === 0 || property?.lease_price === 0 || property?.leasePrice === '0') && property?.leasePrice !== null && property?.leasePrice !== '';

        // Mode radios
        const obs = property?.parcel?.observations || {};
        const saleMode = obs.sale_price_mode || (isLegacyZeroSale ? 'amount' : ((property?.price != null && property?.price !== '') ? 'amount' : ((property?.id && property?.price == null) ? 'request' : 'amount')));
        const sModeRadio = form.querySelector(`[name="sale_price_mode"][value="${saleMode}"]`);
        if (sModeRadio) sModeRadio.checked = true;

        const leaseMode = obs.lease_price_mode || (isLegacyZeroLease ? 'amount' : ((property?.leasePrice != null && property?.leasePrice !== '') ? 'amount' : ((property?.id && property?.leasePrice == null) ? 'request' : 'amount')));
        const lModeRadio = form.querySelector(`[name="lease_price_mode"][value="${leaseMode}"]`);
        if (lModeRadio) lModeRadio.checked = true;

        if (field('price') && property?.price != null && property?.price !== '') {
          field('price').value = String(property.price);
          formatPriceInput(field('price'));
        }
        if (field('lease_price') && property?.leasePrice != null && property?.leasePrice !== '') {
          field('lease_price').value = String(property.leasePrice);
          formatPriceInput(field('lease_price'));
        }
        if (field('lease_period') && property?.leasePeriod) {
          field('lease_period').value = property.leasePeriod;
        }
        if (field('lease_price_unit') && property?.leasePriceUnit) {
          field('lease_price_unit').value = property.leasePriceUnit;
        }

        photoDisplayOrder = [];
        const isNeg = Boolean(property?.is_negotiable ?? property?.isNegotiable ?? obs.is_negotiable);
        const saleNegCb = $('[data-sale-negotiable]');
        if (saleNegCb) saleNegCb.checked = isNeg;

        const isLeaseNeg = Boolean(property?.lease_negotiable ?? property?.leaseNegotiable ?? obs.lease_negotiable);
        const leaseNegCb = $('[data-lease-negotiable]');
        if (leaseNegCb) leaseNegCb.checked = isLeaseNeg;

        if (property?.barangay) {
          selectBarangayOption(property.barangay, false);
        } else {
          syncBarangayFromHidden();
        }

        syncPhotoUI();
        syncPricing();

        restoreUtilities(property?.utilities || parcel?.utilities || {}, parcel?.observations || {});

        const clupAllowed = property?.clupAllowedUses || property?.clup_allowed_uses || [];
        renderZoningAllowedAndConditionalUses(Array.isArray(clupAllowed) ? clupAllowed : null);
        if (field('clup_conditional_uses')) {
          const rawCond = property?.clupConditionalUses || property?.clup_conditional_uses || '';
          field('clup_conditional_uses').value = Array.isArray(rawCond) ? rawCond.join('\n') : rawCond;
        }

        const authDoc = property?.authorityToSell;
        const authPreview = $('[data-authority-preview]');
        const authBadge = $('[data-authority-badge]');
        const authName = $('[data-authority-staged-name]');
        if (authDoc && authDoc.originalName) {
          if (authName) authName.textContent = authDoc.originalName;
          if (authPreview) authPreview.hidden = false;
          if (authBadge) {
            authBadge.textContent = authDoc.status === 'validated' ? 'Validated' : authDoc.status === 'rejected' ? 'Rejected' : 'Pending city validation';
            authBadge.className = `pw-badge ${authDoc.status === 'validated' ? 'pw-badge-teal' : authDoc.status === 'rejected' ? 'pw-badge-rose' : 'pw-badge-amber'}`;
          }
        } else {
          if (authPreview) authPreview.hidden = true;
          if (authBadge) {
            authBadge.textContent = 'Pending city validation';
            authBadge.className = 'pw-badge pw-badge-amber';
          }
        }
        if(parcel?.referencePoint?.lat!=null && parcel?.referencePoint?.lng!=null){
          field('reference_lat').value=parcel.referencePoint.lat;
          field('reference_lng').value=parcel.referencePoint.lng;
          field('reference_label').value=parcel.referencePoint.label || 'entrance';
          dirtyReference=true;
        } else {
          field('reference_lat').value='';
          field('reference_lng').value='';
          field('reference_label').value='entrance';
          dirtyReference=false;
        }
        draftKey = `locus:property-draft:${config.user?.id || 'staff'}:${property?.id || 'new'}`;
        let restored = null;
        try {
          const saved = localStorage.getItem(draftKey);
          if (saved) {
            restored = JSON.parse(saved);
            for (const [name, val] of Object.entries(restored.values || {})) {
              if (['category','subcategory','additional_subcategories'].includes(name)) continue;
              const controls = [...form.elements].filter(element => element.name === name && element.type !== 'file');
              for (const control of controls) {
                if (control.type === 'checkbox') control.checked = Array.isArray(val) && val.includes(control.value);
                else if (control.type === 'radio') control.checked = control.value === val;
                else control.value = val;
              }
            }
            restoreClassification(restored.values?.category || value('category'), restored.values?.subcategory || '', restored.values?.additional_subcategories || []);
            if ($('[data-radar-toggle]')) $('[data-radar-toggle]').checked = restored.radarEnabled !== false;
            boundary = value('boundary') ? JSON.parse(value('boundary')) : null;
            dirtyReference = restored.referenceConfirmed === true;
            formatPriceInput(field('price'));
            formatPriceInput(field('lease_price'));
            if (Array.isArray(restored?.photoDisplayOrder)) photoDisplayOrder = restored.photoDisplayOrder;
            syncBarangayFromHidden();
            notify('Draft restored from this device.', false);
            flashDraftSaved();
          }
        } catch {
          notify('The saved draft could not be restored. Enter the property details again.', true);
        }
        syncPricing();
        syncUtilities();
        syncAreaLimits();

        const currentDraftKey = draftKey;
        const restoreGeneration = draftGeneration, restoreMediaRevision = mediaRevision;
        PropertyDraftStorage.getMedia(currentDraftKey).then(media => {
          if (!restored || !media || draftKey !== currentDraftKey || submitted || restoreGeneration !== draftGeneration || restoreMediaRevision !== mediaRevision) return;
          let hasRestoredPhotos = false;
          if (Array.isArray(media.files) && media.files.length > 0) {
            selectedPhotoFiles.forEach(f => { if (f._objectUrl) URL.revokeObjectURL(f._objectUrl); });
            selectedPhotoFiles = media.files;
            hasRestoredPhotos = true;
          }
          if (Array.isArray(media.existingMedia) && media.existingMedia.length > 0) {
            existingPhotoMedia = media.existingMedia;
            hasRestoredPhotos = true;
          }
          if (restored?.coverPhoto?.kind === 'new' && selectedPhotoFiles[restored.coverPhoto.index]) coverPhoto={kind:'new',file:selectedPhotoFiles[restored.coverPhoto.index]};
          else if (restored?.coverPhoto?.kind === 'existing') {
            const match = existingPhotoMedia.find(item=>item.id === restored.coverPhoto.id && item.source === restored.coverPhoto.source && !item.isRemoved);
            if (match) coverPhoto={kind:'existing',media:match};
          }
          if (Array.isArray(media.evidenceFiles) && media.evidenceFiles.length > 0 && evidenceFiles) {
            try {
              const dt = new DataTransfer();
              media.evidenceFiles.forEach(f => dt.items.add(f));
              evidenceFiles.files = dt.files;
              showEvidenceFiles();
            } catch {}
          }
          if (media.authorityFiles?.length && authInput) {
            try {
              const dt = new DataTransfer();media.authorityFiles.forEach(file=>dt.items.add(file));authInput.files=dt.files;
              authInput.dispatchEvent(new Event('change',{bubbles:true}));
            } catch {}
          }
          if (hasRestoredPhotos) {
            const removeInput = $('[data-remove-image]');
            if (removeInput) removeInput.value = '0';
            syncPhotoUI();
            preview();
            const totalPhotos = selectedPhotoFiles.length + existingPhotoMedia.filter(m => !m.isRemoved).length;
            notify(`Draft restored with ${totalPhotos} photo${totalPhotos === 1 ? '' : 's'}. You can continue editing where you left off.`, false);
          }
        }).catch(() => {});
        if(boundary && window.turf)estimatedArea=turf.area(boundary);
        locationCapture=point() ? (restored?.locationCapture || {kind:'record'}) : null;
        selectLocationMethod(restored?.locationMethod || (boundary?'draw':point()?'pin':enteredAreaSqm()?'area':'pin'),false);
        if(boundaryMap && boundary)loadBoundary(boundary);
        if(point() && locationMethod !== 'area')syncLocation(false);
        updateCoordinateDetailsSummary();
        syncBarangayContext();
        syncAreaEquivalents();
        syncSpatialAccessibility();
        syncInfrastructureReadiness();
        syncEconomicViability();
        syncZoningCompatibility();
        assessHazards();
        syncNearbyAssessment();
        updateBoundary(true);preview();ready();selectEvidenceCriterion('spatial_accessibility');tabs('data-util-tab','data-util-pane','electricity');tabs('data-review-tab','data-review-panel','assessment');radarTab='competitors';tabs('data-radar-tab','data-radar-unused-panel','competitors');
        setText('[data-photo-file-name]','JPG, PNG or WEBP. Photos are optional.');
        setText('[data-location-status]','Pin the exact property location, enter coordinates, or draw an optional boundary.');
        const searchResults=$('[data-location-results]');if(searchResults)searchResults.innerHTML='';
        const searchInput=$('[data-location-search]');if(searchInput)searchInput.value='';
        setTimeout(loadContext,0);
        return restored;
      },
      append(data){
        const ref=point('reference_lat','reference_lng');
        if(ref){
          data.set('reference_lat',value('reference_lat'));
          data.set('reference_lng',value('reference_lng'));
          data.set('reference_label',value('reference_label') || 'entrance');
        } else if (point()) {
          data.set('reference_lat', value('lat'));
          data.set('reference_lng', value('lng'));
          data.set('reference_label', 'location');
        } else {
          data.delete('reference_lat');
          data.delete('reference_lng');
          data.delete('reference_label');
        }
        data.set('boundary',boundary?JSON.stringify(boundary):'');
        data.set('calculated_area_sqm',String(estimatedArea));
      },
      buildSubmission(data) {
        data.delete('id');
        data.set('subname', value('property_subname').trim());
        data.set('property_subname', value('property_subname').trim());
        data.set('land_area',value('land_area'));
        data.set('land_area_unit',value('land_area_unit') || 'sqm');
        const classification = getClassification();
        const cat = classification.category;
        data.set('category', cat);
        const legacyTypes = {
          'Land': 'commercial',
          'Building': 'commercial',
          'Vacant Land': 'commercial',
          'Commercial': 'commercial',
          'Office': 'bpo',
          'Industrial / Warehouse': 'manufacturing',
          'Residential': 'residential',
          'Hospitality / Tourism': 'hotel',
          'Mixed-Use': 'commercial',
          'Special Purpose': 'special_purpose'
        };
        data.set('property_type', legacyTypes[cat] || 'commercial');
        data.set('subcategory', [classification.primary, ...classification.additional].filter(Boolean).join(', '));
        data.delete('additional_subcategories');
        const purpose = getListingPurpose();
        data.set('listing_purpose', purpose);

        const saleMode = form.querySelector('[name="sale_price_mode"]:checked')?.value || 'amount';
        const leaseMode = form.querySelector('[name="lease_price_mode"]:checked')?.value || 'amount';
        data.set('sale_price_mode', saleMode);
        data.set('lease_price_mode', leaseMode);

        if (purpose === 'lease' || saleMode === 'request') {
          data.set('price', '');
        } else {
          data.set('price', value('price').replace(/,/g,'').trim());
        }

        if (purpose === 'sale' || leaseMode === 'request') {
          data.set('lease_price', '');
        } else {
          data.set('lease_price', value('lease_price').replace(/,/g,'').trim());
        }

        data.set('lease_period', value('lease_period') || 'month');
        data.set('lease_price_unit', value('lease_price_unit') || 'total');

        data.delete('image_file');
        data.delete('image_files[]');
        selectedPhotoFiles.forEach(f => {
          data.append('image_files[]', f);
        });
        if (selectedPhotoFiles.length > 0) {
          data.append('image_file', selectedPhotoFiles[0]);
        }
        const retainedIds = existingPhotoMedia.filter(m => !m.isRemoved).map(m => m.id).filter(Boolean);
        data.set('retained_media_ids', JSON.stringify(retainedIds));
        data.delete('cover_media_id');data.delete('cover_upload_index');
        if (coverPhoto?.kind === 'existing' && coverPhoto.media.id && !coverPhoto.media.isRemoved) data.set('cover_media_id',String(coverPhoto.media.id));
        else if (coverPhoto?.kind === 'new' && selectedPhotoFiles.includes(coverPhoto.file)) data.set('cover_upload_index',String(selectedPhotoFiles.indexOf(coverPhoto.file)));

        const removeVal = $('[data-remove-image]')?.value;
        if (removeVal === '1' || (selectedPhotoFiles.length === 0 && retainedIds.length === 0 && existingPhotoMedia.length > 0)) {
          data.set('remove_image', '1');
          data.delete('image_file');
          data.delete('image_files[]');
        }

        data.set('contactMode', value('contactBrokerUserId') ? 'broker' : 'open_listing');
        data.set('recalculate_assessment', 'true');
        data.set('assessmentTags', JSON.stringify(all('[name="assessmentTags[]"]:checked').map(element=>element.value)));

        const clupUses = all('[name="clup_allowed_uses[]"]:checked').map(el => el.value);
        data.set('clup_allowed_uses', JSON.stringify(clupUses));

        data.set('electricity', form.querySelector('[name="electricity"]:checked')?.value || 'not_verified');
        data.set('water', form.querySelector('[name="water"]:checked')?.value || 'not_verified');
        data.set('internet', form.querySelector('[name="internet"]:checked')?.value || 'not_verified');
        data.set('electricity_status', form.querySelector('[name="electricity"]:checked')?.value || 'not_verified');
        data.set('water_status', form.querySelector('[name="water"]:checked')?.value || 'not_verified');
        data.set('internet_status', form.querySelector('[name="internet"]:checked')?.value || 'not_verified');
        for (const name of ['electricity_sources','water_sources','internet_providers','internet_types']) {
          data.set(name, JSON.stringify(all(`[name="${name}[]"]:checked`).filter(el => !el.disabled).map(el => el.value)));
        }
        const internetAvailable = data.get('internet') === 'available';
        data.set('internet_quality', internetAvailable ? form.querySelector('[name="internet_quality"]:checked')?.value || 'not_verified' : 'not_verified');
        data.set('download_speed_mbps', internetAvailable ? value('download_speed_mbps') || '' : '');

        data.set('road_access', value('road_access') || 'unknown');
        data.set('road_surface_passability', value('road_surface_passability') || 'unknown');
        data.set('carriageway_width', value('carriageway_width') || '');
        data.set('distance_to_major_road', value('distance_to_major_road') || '');
        data.set('road_frontage', value('road_access') === 'frontage' ? 'yes' : (value('road_access') === 'no_access' ? 'no' : 'not_verified'));
        data.set('road_surface', ['paved', 'gravel', 'unpaved'].includes(value('road_surface_passability')) ? value('road_surface_passability') : 'not_verified');

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
        data.set('offered_space_scope', value('offered_space_scope') || 'entire_land');
        data.set('offered_area_sqm', value('offered_area_sqm') || '');
        data.set('security_deposit_months', value('security_deposit_months') || '');
        data.set('advance_rent_months', value('advance_rent_months') || '');
        data.set('utilities_included', value('utilities_included') || 'excluded');
        data.set('additional_purchase_costs', value('additional_purchase_costs') || '');
        data.set('bir_zonal_value', value('bir_zonal_value') || '');
        data.set('comparable_market_price', value('comparable_market_price') || '');
        data.set('comparable_lease_price', value('comparable_lease_price') || '');
        data.set('lgu_valuation_type', value('lgu_valuation_type') || '');
        data.set('lgu_valuation_amount', value('lgu_valuation_amount') || '');
        data.set('bir_source', value('bir_source') || '');
        data.set('bir_date', value('bir_date') || '');
        data.set('assessed_market_value', value('assessed_market_value') || '');
        data.set('comparable_source', value('comparable_source') || '');
        data.set('radar_business_type', value('radar_business_type') || 'cafe');
        data.set('nearby_evidence_source', value('nearby_evidence_source') || '');
        data.set('nearby_evidence_date', value('nearby_evidence_date') || '');
        data.set('nearby_evidence_reference', value('nearby_evidence_reference') || '');
        data.set('commercial_corridor', value('commercial_corridor') || '');
        data.set('nearby_analysis_origin', value('nearby_analysis_origin') || '');
        if (infraRes) {
          data.set('infrastructure_readiness_score', infraRes.isComplete ? String(infraRes.totalScore) : '');
          data.set('infrastructure_readiness_complete', infraRes.isComplete ? '1' : '0');
          data.set('infrastructure_iai_contribution', infraRes.isComplete ? String(infraRes.iaiContribution) : '');
        }

        const econRes = typeof evaluateEconomicViabilityClient === 'function' ? evaluateEconomicViabilityClient() : null;
        if (econRes) {
          data.set('economic_viability_score', econRes.isComplete && econRes.totalScore !== null ? String(econRes.totalScore) : '');
          data.set('economic_viability_complete', econRes.isComplete ? '1' : '0');
          data.set('economic_iai_contribution', econRes.isComplete && econRes.iaiContribution !== null ? String(econRes.iaiContribution) : '');
        }

        const zoningClassVal = value('zoning_classification') || '';
        if (zoningClassVal) {
          data.set('zoning_classification', zoningClassVal);
          data.set('existing_land_use', value('existing_land_use') || '');
          const clupUses = all('[name="clup_allowed_uses[]"]:checked').map(el => el.value);
          data.set('clup_allowed_uses', JSON.stringify(clupUses));
          if (field('clup_conditional_uses')) {
            data.set('clup_conditional_uses', value('clup_conditional_uses') || '');
          }
          if (value('proposed_activity')) {
            data.set('proposed_activity', value('proposed_activity'));
          }
        }

        if (!data.get('authority_to_sell_file')?.size) data.delete('authority_to_sell_file');
        return data;
      },
      saved() {
        submittedGenerations.add(draftGeneration);
        submitted = true; clearTimeout(autosaveTimer); draftGeneration++;
        try {
          localStorage.removeItem(draftKey);
          PropertyDraftStorage.deleteMedia(draftKey);
        } catch {
          /* Property already saved on the server. */
        }
      },
    };
  };
})();
