(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number = value => new Intl.NumberFormat('en-PH', {maximumFractionDigits: 2}).format(value);
  const actions = {
    spatial_accessibility: ['Confirm road frontage and access evidence.', 'Confirm', 'access'],
    infrastructure_readiness: ['Confirm electricity, water, and internet.', 'Confirm', 'access'],
    economic_viability: ['Add a dated BIR zonal reference.', 'Add reference', 'valuation'],
    nearby_businesses: ['Run the radar and check inventory coverage.', 'Run radar', 'radar'],
    zoning_compatibility: ['Add the parcel zoning and CLUP source.', 'Add evidence', 'landuse'],
    risk_constraints: ['Review hazard layers and parcel coverage.', 'Review', 'boundary'],
    environmental_safety: ['Add environmental classification evidence.', 'Add evidence', 'landuse'],
  };
  const labels = {spatial_accessibility:'Spatial accessibility',infrastructure_readiness:'Infrastructure readiness',economic_viability:'Economic viability',nearby_businesses:'Nearby businesses',zoning_compatibility:'Zoning compatibility',risk_constraints:'Risk constraints',environmental_safety:'Environmental safety'};
  const businessRoles = {
    cafe: {
      competitors: ['cafe','coffee_shop','bakery','restaurant','fast_food','food_court','ice_cream','pastry','beverages','tea','bistro','coffee'],
      complementary: ['office','coworking','school','college','university','retail','supermarket','convenience','hotel','hospital','clinic','bank','library','commercial','department_store','mall','shop','pharmacy']
    },
    retail: {
      competitors: ['retail','convenience','supermarket','shop','department_store','mall','general','grocery','clothes','shoes','electronics','variety_store','hardware','marketplace'],
      complementary: ['office','coworking','school','college','university','cafe','restaurant','fast_food','hotel','residential','bank','pharmacy','hospital','parking']
    },
    office: {
      competitors: ['office','coworking','commercial','business_centre','corporate','company'],
      complementary: ['cafe','coffee_shop','restaurant','fast_food','retail','convenience','bank','atm','transport','hotel','parking','pharmacy','post_office']
    },
    hospitality: {
      competitors: ['hotel','hospitality','lodging','motel','guest_house','hostel','resort','inn'],
      complementary: ['restaurant','cafe','bar','pub','retail','tourism','transport','fast_food','supermarket','convenience','attraction','souvenir','bank','taxi']
    },
    industrial: {
      competitors: ['industrial','manufacturing','warehouse','factory','depot','logistics_hub'],
      complementary: ['logistics','transport','supplier','fuel','commercial','repair','hardware','construction']
    },
  };
  window.SFCPropertyWizard = (form, {apiBase, dialog, assessment}) => {
    if (!form || !dialog?.classList.contains('property-wizard')) return null;
    const $ = selector => form.querySelector(selector);
    const all = selector => [...form.querySelectorAll(selector)];
    const field = name => form.elements[name];
    const value = name => field(name)?.value || '';
    const purposeLabel = () => ({sale:'For Sale',lease:'For Lease',sale_or_lease:'For Sale or Lease'})[value('listing_purpose')] || 'For Sale';
    function syncPricing() {
      const purpose = value('listing_purpose') || 'sale';
      for (const [selector, shown] of [['[data-sale-price-fields]',purpose !== 'lease'],['[data-lease-price-fields]',purpose !== 'sale']]) {
        all(selector).forEach(group => {
          group.hidden = !shown;
          group.querySelectorAll('input, select').forEach(input => { input.disabled = !shown; });
        });
      }
    }
    function askingPriceSummary() {
      const amount = name => {
        const raw = value(name).replace(/,/g,'').trim();
        return raw !== '' && Number.isFinite(Number(raw)) ? `PHP ${number(Number(raw))}` : 'Price on request';
      };
      const sale = amount('price');
      const lease = `${amount('lease_price')} / ${value('lease_price_unit') === 'sqm' ? 'm² / ' : ''}${value('lease_period') || 'month'}`;
      return value('listing_purpose') === 'lease' ? lease : value('listing_purpose') === 'sale_or_lease' ? `Sale: ${sale} · Lease: ${lease}` : sale;
    }
    field('listing_purpose')?.addEventListener('change', syncPricing);
    const config = window.SFC_APP_CONFIG || {};
    const emptyPhoto = $('[data-photo-preview]')?.innerHTML || '';
    let boundaryMap, radarMap, parcelLayer, locationMarker, radarMarker, radiusLayer, radarParcel;
    let concentricRings = [], hoverVectorLayer = null, radarLayerItems = new Map(), radarMapFilter = 'all', radarSearchQuery = '';
    let boundary = null, estimatedArea = 0, history = [], context = null, nearbyEditor = null, savedAttachments = [], propertyId = null;
    let hazardLayers = [], radarLayers = [], radarTab = 'competitors', step = 0;
    let placingReference = false, dirtyReference = false, imageObjectUrl = null, existingImage = '', locationMethod = 'area';
    let controller, searchController, matchController, revision = 0, matchRevision = 0, draftKey = '', selectedMatches = [], lastAssessment = null;
    let radarState = 'idle', radarError = null, radarData = null, radarController = null, radarRevision = 0, radarDebounceTimer = null;
    let radarGroups = {competitors:[],complementary:[],unclassified:[],roads:[]};
    const point = (latName = 'lat', lngName = 'lng') => {
      const lat = value(latName), lng = value(lngName);
      return lat !== '' && lng !== '' && Number.isFinite(+lat) && Number.isFinite(+lng) && Math.abs(+lat) <= 90 && Math.abs(+lng) <= 180 ? [+lat,+lng] : null;
    };
    const notify = text => { const target = $('[data-editor-message]'); if (target) { target.textContent = text; target.classList.remove('is-error'); } };
    async function get(endpoint, signal) {
      const response = await fetch(`${apiBase}/${endpoint}`, {credentials:'same-origin',headers:{Accept:'application/json'},signal});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'This information is unavailable.');
      return payload;
    }
    const setText = (selector, text) => all(selector).forEach(node => { node.textContent = text; });
    const enteredAreaSqm = () => +value('land_area') > 0 ? +value('land_area') * (value('land_area_unit') === 'hectares' ? 10000 : 1) : null;
    function selectLocationMethod(method, sync = true) {
      locationMethod = ['area','pin','draw'].includes(method) ? method : 'area';
      all('[data-location-method]').forEach(button => {
        const active = button.dataset.locationMethod === locationMethod;
        button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));
      });
      $('[data-location-map-card]').hidden = locationMethod === 'area';
      $('[data-drawing-tools]').hidden = locationMethod !== 'draw';
      $('[data-editor-panel="1"]').classList.toggle('pw-area-only',locationMethod === 'area');
      setText('[data-location-heading]',locationMethod === 'draw' ? 'Outline the plot' : 'Pinpoint the property');
      setText('[data-location-help]',locationMethod === 'draw' ? 'Draw a closed boundary to estimate area. You can also continue with a known area or a location pin.' : 'Search for the site, then click its exact position or enter coordinates below.');
      boundaryMap?.pm?.disableDraw();parcelLayer?.pm?.disable();
      if (sync && locationMethod !== 'area') {syncLocation();renderLayers();}
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
    bindTabs('data-evidence-tab', selected => tabs('data-evidence-tab','data-evidence-panel',selected));
    bindTabs('data-review-tab', selected => tabs('data-review-tab','data-review-panel',selected));
    bindTabs('data-radar-tab', selected => { radarTab = selected; tabs('data-radar-tab','data-radar-unused-panel',selected); renderRadarList(); });
    function preview() {
      syncPricing();
      setText('[data-preview-name]', value('property_name').trim() || 'Your new property');
      setText('[data-preview-purpose]', purposeLabel());
      setText('[data-preview-price]', askingPriceSummary());
      for (const [selector, text] of [['[data-preview-category]', value('category')==='Land'?'Vacant land':value('category') || 'Land'], ['[data-preview-status]', value('status') || 'Available']]) {
        const badge = $(selector); if (badge) (badge.querySelector('span') || badge).textContent = text;
      }
      const entered = enteredAreaSqm(), located = point();
      const areaText = entered ? `${number(entered)} m² ${value('area_method') === 'survey' ? 'recorded area' : 'declared area'}` : estimatedArea ? `${number(estimatedArea)} m² plot estimate` : located ? 'Exact location provided · Area not specified' : 'Add an area size or exact location in the next step.';
      setText('[data-preview-area]',areaText);
      setText('[data-location-summary]',entered || estimatedArea || located ? `${entered ? `${number(entered)} m² entered` : estimatedArea ? `${number(estimatedArea)} m² estimated` : 'Area not specified'} · ${located ? 'Exact location provided' : 'Location can be added later'}` : 'Add an area or an exact location to continue.');
      $('[data-location-summary]')?.classList.toggle('is-ready',Boolean(entered || estimatedArea || located));
      if ($('[data-boundary-estimate]')) $('[data-boundary-estimate]').hidden = !estimatedArea;
      const image = $('[data-photo-preview]');
      if (image) {
        const source = imageObjectUrl || existingImage;
        if (image.tagName === 'IMG') { image.hidden = !source; if (source) image.src = source; else image.removeAttribute('src'); }
        else { image.innerHTML = source ? `<img src="${escape(source)}" alt="Property photo">` : emptyPhoto; }
      }
      const propertyReview = $('[data-review-property]');
      if (propertyReview) propertyReview.innerHTML = `<strong>${escape(value('property_name') || 'New property')}</strong><span>${escape(value('category'))}${value('barangay') ? ` · ${escape(value('barangay'))}` : ''} · ${escape(value('status'))}</span><span>${escape(purposeLabel())} · ${escape(askingPriceSummary())}</span><span>${escape(areaText)}${located ? ` · ${number(located[0])}, ${number(located[1])}` : ''}</span>`;
      const summary = $('[data-review-summary]');
      if (summary) summary.innerHTML = `<div><span class="pw-eyebrow">READY FOR REVIEW</span><h3>${escape(value('property_name') || 'New property')}</h3><p>${escape(value('category'))}${value('barangay') ? ` · ${escape(value('barangay'))}` : ''} · ${escape(value('status'))}</p><p>${escape(purposeLabel())} · ${escape(askingPriceSummary())}</p></div><div><strong>${escape(areaText)}</strong><p>${located ? `Location: ${located[0].toFixed(6)}, ${located[1].toFixed(6)}` : 'Exact location not yet specified'}</p></div>`;
    }
    function photo(file) {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
      imageObjectUrl = null;
      if (file) {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { field('image_file').value = ''; notify('Choose a JPG, PNG, or WEBP property photo.'); preview(); return; }
        if (file.size > 8 * 1024 * 1024) { field('image_file').value = ''; notify('Choose a photo smaller than 8 MB.'); preview(); return; }
        imageObjectUrl = URL.createObjectURL(file);
      }
      setText('[data-photo-file-name]', file?.name || 'JPG, PNG or WEBP. Photos are optional.');
      preview();
    }
    field('image_file')?.addEventListener('change', event => photo(event.target.files[0]));
    const drop = $('[data-photo-drop]');
    drop?.addEventListener('dragover', event => {event.preventDefault();drop.classList.add('is-dragover');});
    drop?.addEventListener('dragleave', () => drop.classList.remove('is-dragover'));
    drop?.addEventListener('drop', event => {
      event.preventDefault();drop.classList.remove('is-dragover');
      const file = event.dataTransfer.files[0];
      if (file) {const transfer = new DataTransfer();transfer.items.add(file);field('image_file').files=transfer.files;photo(file);}
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
        evidenceFiles.value='';notify('Choose JPG, PNG, WEBP, or PDF evidence, up to four files total and 5 MB each.');
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
    function place(pointValue, move = true) {
      field('lat').value = pointValue.lat.toFixed(6);field('lng').value = pointValue.lng.toFixed(6);
      field('lat').dispatchEvent(new Event('input',{bubbles:true}));field('lng').dispatchEvent(new Event('input',{bubbles:true}));
      syncLocation(move);
      locationStatus('Location updated. Confirm the parcel and barangay against the property records.');
    }
    function syncLocation(move = true) {
      if (!window.L) {locationStatus('The map could not load. Enter an area size or exact coordinates to continue.');return;}
      if (!boundaryMap) {
        boundaryMap = tileMap($('[data-location-map]'));
        boundaryMap.on('click', event => {if (!boundaryMap.pm?.globalDrawModeEnabled() && !parcelLayer?.pm?.enabled()) place(event.latlng,false);});
        boundaryMap.on('pm:create', event => {
          if (event.shape !== 'Polygon') {event.layer.remove();return;}
          history.push(boundary ? JSON.stringify(boundary) : null);
          attachBoundary(event.layer);updateBoundary();
          if (!point()) {const center=event.layer.getBounds().getCenter();place(center,false);}
          locationStatus('Boundary saved in this form. Use Edit to adjust its vertices.');
        });
        boundaryMap.on('pm:drawstart', event => {
          $('[data-boundary-action="draw"]')?.classList.add('is-active');
          event.workingLayer.on('pm:vertexadded', () => { const button=$('[data-boundary-action="undo"]');if(button)button.disabled=false; });
        });
        boundaryMap.on('pm:drawend', () => { $('[data-boundary-action="draw"]')?.classList.remove('is-active');const button=$('[data-boundary-action="undo"]');if(button)button.disabled=!history.length; });
      }
      requestAnimationFrame(() => boundaryMap.invalidateSize());
      const coordinates = point();
      if (coordinates) {
        if (!locationMarker) {
          locationMarker=L.marker(coordinates,{draggable:true,pmIgnore:true,title:'Property location',icon:referenceIcon()}).addTo(boundaryMap);
          locationMarker.on('dragend', () => place(locationMarker.getLatLng(),false));
        } else locationMarker.setLatLng(coordinates);
        if (move) boundaryMap.setView(coordinates,Math.max(16,boundaryMap.getZoom()));
      } else if (locationMarker) {locationMarker.remove();locationMarker=null;}
      if (boundary && !parcelLayer) loadBoundary(boundary);
      if (parcelLayer && move) boundaryMap.fitBounds(parcelLayer.getBounds(),{padding:[45,45],maxZoom:18});
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
      setText('[data-calculated-area]',estimatedArea ? number(estimatedArea) : '—');
      setText('[data-calculated-hectares]',estimatedArea ? (estimatedArea/10000).toLocaleString('en-PH',{maximumFractionDigits:4}) : '—');
      all('[data-boundary-action="edit"],[data-boundary-action="reset"]').forEach(button => {button.disabled=!boundary;});
      const undo = $('[data-boundary-action="undo"]');if (undo) undo.disabled=!history.length;
      preview();assessHazards();ready();
    }
    all('[data-boundary-action]').forEach(button => button.addEventListener('click', () => {
      syncLocation(false);
      if (!boundaryMap?.pm || !window.turf) {locationStatus('Drawing tools could not load. Enter an area size or exact coordinates to continue.');return;}
      const action=button.dataset.boundaryAction;
      if (action === 'draw') {
        parcelLayer?.pm.disable();boundaryMap.pm.enableDraw('Polygon',{allowSelfIntersection:false,snappable:true,pathOptions:{color:'#11224d',fillColor:'#fbbf24',fillOpacity:.3}});
        locationStatus('Click each corner of the parcel. Click the first point again to close the boundary.');
      } else if (action === 'edit' && parcelLayer) {
        boundaryMap.pm.disableDraw();
        if (parcelLayer.pm.enabled()) {parcelLayer.pm.disable();button.classList.remove('is-active');locationStatus('Boundary updated.');}
        else {history.push(JSON.stringify(boundary));parcelLayer.pm.enable({allowSelfIntersection:false});button.classList.add('is-active');locationStatus('Drag the boundary points to match the parcel. Click Edit again when finished.');}
      } else if (action === 'undo') {
        if (boundaryMap.pm.globalDrawModeEnabled()) {boundaryMap.pm.Draw.Polygon?._removeLastVertex?.();return;}
        const previous=history.pop();parcelLayer?.remove();parcelLayer=null;boundary=previous ? JSON.parse(previous) : null;if (boundary) loadBoundary(boundary);updateBoundary();
      } else if (action === 'reset') {
        boundaryMap.pm.disableDraw();history.push(boundary ? JSON.stringify(boundary) : null);parcelLayer?.remove();parcelLayer=null;updateBoundary();locationStatus('Boundary cleared. Draw the property outline again.');
      }
    }));
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

    function lookupBarangay(rawInput) {
      if (!rawInput) return null;
      const clean = String(rawInput).trim().toLowerCase().replace(/^barangay\s+/i, '');
      const list = config.barangays && Object.keys(config.barangays).length ? config.barangays : BARANGAY_COORDINATES;
      for (const [name, info] of Object.entries(list)) {
        const normalized = name.toLowerCase().replace(/^barangay\s+/i, '');
        if (normalized === clean || name.toLowerCase() === clean) {
          return { name, lat: Number(info.lat), lng: Number(info.lng), district: info.district || '' };
        }
      }
      if (clean.length >= 3) {
        for (const [name, info] of Object.entries(list)) {
          const normalized = name.toLowerCase().replace(/^barangay\s+/i, '');
          if (normalized.includes(clean) || clean.includes(normalized)) {
            return { name, lat: Number(info.lat), lng: Number(info.lng), district: info.district || '' };
          }
        }
      }
      return null;
    }

    function proceedToBarangay(name, notifyUser = true) {
      const match = lookupBarangay(name);
      if (!match) return false;
      if (field('barangay') && field('barangay').value !== match.name && document.activeElement !== field('barangay')) {
        field('barangay').value = match.name;
      }
      place({ lat: match.lat, lng: match.lng }, true);
      if (locationMethod === 'area') {
        selectLocationMethod('pin', false);
      }
      if (boundaryMap) {
        boundaryMap.flyTo([match.lat, match.lng], 16, {
          animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
          duration: 1.2,
          easeLinearity: 0.25
        });
      }
      if (notifyUser) {
        locationStatus(`Proceeded to Barangay ${match.name} (${match.lat.toFixed(4)}, ${match.lng.toFixed(4)}). Pin placed on official center. Adjust to exact lot.`);
        notify(`Proceeded to Barangay ${match.name}. Exact coordinates set.`);
      }
      preview();
      ready();
      return true;
    }

    field('barangay')?.addEventListener('input', () => {
      const val = value('barangay').trim();
      const match = lookupBarangay(val);
      if (match && (val.toLowerCase() === match.name.toLowerCase() || val.toLowerCase() === match.name.toLowerCase().replace(/^barangay\s+/i, ''))) {
        proceedToBarangay(val, false);
      }
    });
    field('barangay')?.addEventListener('change', () => {
      proceedToBarangay(value('barangay'), true);
    });

    $('[data-use-map-center]')?.addEventListener('click', () => {syncLocation(false);if(boundaryMap)place(boundaryMap.getCenter(),false);});
    ['lat','lng'].forEach(name => field(name)?.addEventListener('change', () => {syncLocation();ready();}));
    async function search() {
      const query=$('[data-location-search]').value.trim();
      if(query.length<2){locationStatus('Enter at least two characters to search.');return;}
      searchController?.abort();searchController=new AbortController();
      const button=$('[data-location-search-button]');button.disabled=true;
      locationStatus('Finding matching places…');
      try {
        const localBgy = lookupBarangay(query);
        const payload=await get(`location-search.php?q=${encodeURIComponent(query)}`,searchController.signal);
        let matches=(payload.search?.results || []).filter(item=>item.lat!=null && item.lng!=null && Number.isFinite(+item.lat) && Number.isFinite(+item.lng));
        if (localBgy && !matches.some(m => m.barangay === localBgy.name || m.label === ('Barangay ' + localBgy.name))) {
          matches.unshift({
            kind: 'barangay',
            label: 'Barangay ' + localBgy.name,
            subtitle: 'San Fernando City, La Union · ' + (localBgy.district || 'Official Barangay Center'),
            lat: localBgy.lat,
            lng: localBgy.lng,
            barangay: localBgy.name
          });
        }
        const list=$('[data-location-results]');list.innerHTML='';
        matches.slice(0,6).forEach(item=>{
          const result=document.createElement('button');result.type='button';result.className='pw-search-result';
          result.innerHTML=`<strong class="tw-block">${escape(item.label)}</strong>${item.subtitle ? `<span class="tw-block tw-text-xs tw-text-slate-500">${escape(item.subtitle)}</span>` : ''}`;
          result.addEventListener('click',()=>{
            if (item.barangay || item.kind === 'barangay') {
              if (field('barangay')) field('barangay').value = item.barangay || item.label.replace(/^Barangay\s+/i, '');
              proceedToBarangay(item.barangay || item.label, true);
            } else {
              place({lat:+item.lat,lng:+item.lng});
            }
            list.innerHTML='';
          });
          list.append(result);
        });
        locationStatus(matches.length?'Choose a place, then adjust the pin to the exact property location.':'No matching places. Use the map or enter the coordinates.');
      } catch(error){if(error.name!=='AbortError')locationStatus(`${error.message} You can use the map or enter coordinates.`);}
      finally{button.disabled=false;}
    }
    $('[data-location-search-button]')?.addEventListener('click',search);
    $('[data-location-search]')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();search();}});
    function hazardResult(key, title, layer, intersects, failure, noLocation) {
      const available=!noLocation && layer?.status==='Available' && !failure;
      const assessed=available && layer.complete === true;
      const status=intersects ? 'Requires review' : assessed ? 'No mapped overlap' : 'Not assessed';
      const text=intersects
        ? (key==='flood'?'Property intersects a mapped riverine flood hazard zone. Review MGB elevation and drainage evidence.':'Property falls within active-fault buffer corridor. Confirm fault trace clearance with PHIVOLCS.')
        : noLocation
        ? 'Enter coordinates or click map to screen against hazard layers.'
        : !assessed
        ? 'Verified data and complete coverage are required.'
        : (key==='flood'?'No overlap found with the mapped flood zones in the available source.':'No overlap found with the mapped active-fault review buffers in the available source.');
      return `<article class="pw-hazard ${intersects?'pw-hazard--warning':''}"><span class="pw-hazard-icon" aria-hidden="true">${intersects?'⚠':assessed?'✓':'i'}</span><div><strong>${escape(title)}</strong><span class="pw-pill ${intersects?'pw-pill--amber':''}">${status}</span><p>${escape(text)}${point() && !boundary ? ' This result covers the location pin only.' : ''}</p>${layer?.source ? `<small>${escape(layer.source)}${layer.date?` · ${escape(layer.date)}`:''}</small>`:''}${key==='faults' && layer?.bufferMeters ? `<small>Verified review buffer: ${number(layer.bufferMeters)} meters</small>`:''}<button type="button" class="pw-text-button" data-show-hazard-source="${key}">Review ${key==='flood'?'flood':'fault'} evidence →</button></div></article>`;
    }
    function assessHazards() {
      const pt = point();
      const testGeom = boundary || (pt && window.turf ? turf.point([pt[1], pt[0]]) : null);
      if(!window.turf || !testGeom){$('[data-hazard-results]').innerHTML=hazardResult('flood','Flood screening',context?.flood,false,false,true)+hazardResult('faults','Active-fault screening',context?.faults,false,false,true);setText('[data-hazard-status]','Not assessed');return;}
      let html='', anyOverlap=false, allAssessed=true;
      for(const key of ['flood','faults']){
        const layer=context?.[key];let overlap=false,failure=false;
        try{
          if(layer?.status==='Available')for(const feature of layer.geojson?.features || []){
            const geometry=key==='faults'? (layer.bufferMeters>0?turf.buffer(feature,layer.bufferMeters,{units:'meters'}):null):feature;
            if(geometry){
              if(boundary && turf.booleanIntersects(boundary,geometry))overlap=true;
              else if(!boundary && testGeom){
                if(geometry.geometry?.type==='Polygon' || geometry.geometry?.type==='MultiPolygon'){
                  if(turf.booleanPointInPolygon(testGeom,geometry))overlap=true;
                }
              }
            }
          }
          if(key==='faults' && !(layer?.bufferMeters>0))failure=true;
          if(layer?.coverage){
            if(boundary && !turf.booleanWithin(boundary,layer.coverage))failure=true;
            else if(!boundary && testGeom && !turf.booleanPointInPolygon(testGeom,layer.coverage))failure=true;
          }
        }catch{failure=true;}
        anyOverlap ||= overlap;
        allAssessed &&= layer?.status==='Available' && layer.complete===true && !failure;
        html+=hazardResult(key,key==='flood'?'Flood screening':'Active-fault screening',layer,overlap,failure,false);
      }
      $('[data-hazard-results]').innerHTML=html;
      setText('[data-hazard-status]',anyOverlap?'Requires review':allAssessed?'No mapped overlap':'Not assessed');
    }
    form.addEventListener('click',event=>{
      const button=event.target.closest('[data-show-hazard-source]');
      if(!button)return;
      const details=$('[data-map-layers]');if(details){details.open=true;details.scrollIntoView({block:'nearest',behavior:'smooth'});}
    });
    function renderLayers() {
      hazardLayers.forEach(layer=>layer.remove());hazardLayers=[];
      if(!boundaryMap || !context)return;
      for(const key of ['flood','faults']){
        const layer=context[key];if(layer?.status!=='Available' || $(`[data-layer-toggle="${key==='faults'?'fault':key}"]`)?.checked===false)continue;
        let data=layer.geojson;
        if(key==='faults' && layer.bufferMeters>0 && window.turf){try{data=turf.featureCollection(data.features.map(feature=>turf.buffer(feature,layer.bufferMeters,{units:'meters'})).filter(Boolean));}catch{continue;}}
        const overlay=L.geoJSON(data,{pmIgnore:true,interactive:false,style:{color:key==='flood'?'#38a5e5':'#ef4444',weight:1,fillOpacity:.15,dashArray:key==='faults'?'6 5':null}}).addTo(boundaryMap);hazardLayers.push(overlay);overlay.bringToBack();
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
      assessHazards();renderLayers();if(step===3)syncRadar();ready();
    }
    function setReference(coordinates) {
      if(value('reference_label')==='center' && boundary && window.turf){const center=turf.centerOfMass(boundary).geometry.coordinates;coordinates=[center[1],center[0]];}
      if(!coordinates)return;
      field('reference_lat').value=coordinates[0].toFixed(6);field('reference_lng').value=coordinates[1].toFixed(6);
      if(radarMarker)radarMarker.setLatLng(coordinates);
    }
    function classify(feature) {
      const properties=feature.properties || {};
      const selected=value('radar_business_type') || 'cafe';
      if(properties.roles?.[selected] && ['competitors','complementary'].includes(properties.roles[selected]))return properties.roles[selected];
      let tags=[properties.businessType,properties.category,properties.type,properties.amenity,properties.shop,properties.tourism,properties.office,properties.commercial,properties.industrial,...(Array.isArray(properties.tags)?properties.tags:[])].filter(Boolean).map(tag=>String(tag).toLowerCase().replace(/[ -]/g,'_'));
      if(!tags.length && /^(jollibee|mcdonald|kfc|pizza hut|mister donut|chowking|mang inasal|greenwich)/i.test(properties.name || ''))tags=['fast_food'];
      const profile=businessRoles[selected] || businessRoles.cafe;
      if(tags.some(tag=>profile.competitors.includes(tag)))return 'competitors';
      if(tags.some(tag=>profile.complementary.includes(tag)))return 'complementary';
      return 'unclassified';
    }
    function syncRadar() {
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
      const iconClass = isRoad ? 'is-road' : isComp ? 'is-competitor' : 'is-complementary';
      const iconChar = isRoad ? '↗' : isComp ? '🏪' : '🏬';
      return `<span class="pw-radar-place-icon ${iconClass}" aria-hidden="true">${iconChar}</span>`;
    }
    function walkingEstimate(distMeters) {
      if(distMeters==null || !Number.isFinite(+distMeters))return '';
      const mins=Math.max(1,Math.round(+distMeters/80));
      return `~${mins} min walk`;
    }
    function createRadarPopup(p, role, distM, isRoad, featId) {
      const roleLabel=isRoad?'Road Segment':role==='competitors'?'Potential Competitor':role==='complementary'?'Complementary Place':'Mapped Establishment';
      const roleClass=isRoad?'is-road':role==='competitors'?'is-competitor':role==='complementary'?'is-complementary':'is-unclassified';
      const name=escape(p.name || (isRoad?'Unnamed road segment':'Mapped establishment'));
      const cat=escape(p.category || p.businessType || p.amenity || p.shop || (isRoad?(p.highway || 'Road'):'Establishment'));
      const walkTxt=walkingEstimate(distM);
      const status=escape(p.status || (isRoad?'Active road network':'Unknown / unverified'));
      const srcUrl=p.locationSource && /^https:\/\//.test(p.locationSource)?p.locationSource:null;
      const srcName=escape(p.source || 'OpenStreetMap');
      const checkedOn=p.checkedOn?` · ${escape(p.checkedOn)}`:'';
      const badge=getBrandBadge(p.name, p.category, isRoad?'roads':role);
      return `<div class="pw-map-popup"><div class="pw-map-popup-head"><span class="pw-map-popup-tag ${roleClass}">${escape(roleLabel)}</span><span class="pw-muted" style="font-size:8.5px">${distM!=null?`${distM} m`:''}</span></div><div style="display:flex;align-items:center;gap:8px;margin:5px 0">${badge}<div><div class="pw-map-popup-name">${name}</div><div class="pw-map-popup-sub" style="margin-bottom:0">${cat}</div></div></div><div class="pw-map-popup-metrics"><span>Dist: <strong>${distM!=null?`${distM} m`:'Within 500m'}</strong></span>${walkTxt?`<span>Walk: <strong>${walkTxt}</strong></span>`:''}</div><div class="pw-map-popup-sub" style="margin-top:4px">Status: <strong>${status}</strong></div><div class="pw-map-popup-footer"><span>${srcUrl?`<a href="${escape(srcUrl)}" target="_blank" rel="noopener noreferrer">${srcName} ↗</a>`:srcName}${checkedOn}</span><button type="button" class="pw-map-popup-focus" data-focus-radar-row="${featId}">View in list ↓</button></div></div>`;
    }
    function applyRadarMapFilter() {
      radarLayerItems.forEach(({layer,role,isRoad})=>{
        let visible=true;
        if(radarMapFilter==='competitors')visible=role==='competitors';
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
            coverage:payload.coverage || 'complete',
          }
        };
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
      radarGroups={competitors:[],complementary:[],unclassified:[],roads:[]};

      const features=radarData?.features || [];
      const seen=new Set();
      for(let i=0; i<features.length; i++){
        const feature=features[i];
        const p=feature.properties || {},coords=feature.geometry?.coordinates;
        const id=feature.id || p.id || `${p.name}:${JSON.stringify(coords)}`;
        if(seen.has(id))continue;seen.add(id);
        if(feature.geometry?.type!=='Point' || !Array.isArray(coords) || coords.length<2 || !coords.every(Number.isFinite) || Math.abs(coords[0])>180 || Math.abs(coords[1])>90)continue;
        const distance=turf.distance(center,feature,{units:'kilometers'})*1000;
        if(distance>500+1e-6)continue;
        const role=classify(feature);
        const featId=`est_${i}_${String(id).replace(/[^a-zA-Z0-9_-]/g,'')}`;
        if(['competitors','complementary','unclassified'].includes(role)){
          radarGroups[role].push({feature,distance,id:featId});
        }
        const isComp=role==='competitors',isCompl=role==='complementary';
        const fillColor=isComp?'#ef4444':isCompl?'#0d9488':'#64748b';
        const radius=role==='unclassified'?5:7;
        const marker=L.circleMarker([coords[1],coords[0]],{radius,color:'#ffffff',weight:2,fillColor,fillOpacity:.95}).addTo(radarMap);
        const distM=Math.round(distance);
        const roleLabel=isComp?'Potential Competitor':isCompl?'Complementary Place':'Mapped Establishment';
        const catLabel=p.category || p.businessType || p.amenity || p.shop || 'Place';
        const srcText=p.source?`${escape(p.source)}${p.checkedOn?` · ${escape(p.checkedOn)}`:''}`:'OpenStreetMap';
        marker.bindTooltip(`<strong>${escape(p.name || 'Mapped establishment')}</strong><br><small>${escape(roleLabel)} (${escape(catLabel)}) · ${distM} m · ${walkingEstimate(distM)}</small><br><small>Operating status: ${escape(p.status || 'Unknown / unverified')}</small><br><small>Source: ${srcText}</small>`);
        marker.bindPopup(createRadarPopup(p,role,distM,false,featId),{className:'pw-map-popup',maxWidth:260});
        marker.on('click',()=>{
          const targetTab=role==='unclassified'?'competitors':role;
          if(radarTab!==targetTab){
            radarTab=targetTab;
            tabs('data-radar-tab','data-radar-unused-panel',targetTab);
            renderRadarList();
          }
          focusRadarRow(featId);
        });
        radarLayerItems.set(featId,{layer:marker,feature,role,distance,coords:[coords[1],coords[0]],isRoad:false,origRadius:radius,origColor:fillColor});
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
        for(const pt of coords){
          const d=turf.distance(center,turf.point(pt),{units:'kilometers'})*1000;
          if(d<minDist){minDist=d;closestPt=[pt[1],pt[0]];}
        }
        try{
          if(turf.booleanIntersects(road,searchArea) || minDist<=500){
            const roadId=`road_${i}_${String(rid).replace(/[^a-zA-Z0-9_-]/g,'')}`;
            radarGroups.roads.push({feature:road,distance:minDist,id:roadId});
            const roadLayer=L.geoJSON(road,{style:{color:'#64748b',weight:3,opacity:.8},interactive:true}).addTo(radarMap);
            const rName=road.properties?.name || 'Unnamed road segment';
            const rType=road.properties?.highway?`Highway (${road.properties.highway})`:'Road segment';
            const distM=Math.round(minDist);
            roadLayer.bindTooltip(`<strong>${escape(rName)}</strong><br><small>${escape(rType)} · ${distM} m away · ${walkingEstimate(distM)}</small>`);
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

      for(const key of ['competitors','complementary','unclassified','roads']){
        radarGroups[key].sort((a,b)=>a.distance-b.distance);
      }
      renderRadarUI();
      applyRadarMapFilter();
    }
    function renderRadarUI() {
      all('[data-radar-count]').forEach(node=>{
        const key=node.dataset.radarCount;
        if(['loading','error','disabled','idle'].includes(radarState))node.textContent='—';
        else node.textContent=String(radarGroups[key]?.length || 0);
      });
      const badge=$('[data-radar-badge]');
      const badgeText=$('[data-radar-badge-text]');
      if(badge && badgeText){
        if(radarState==='idle' || radarState==='disabled'){
          badge.hidden=true;
        } else if(radarState==='loading'){
          badge.hidden=false;
          badgeText.textContent='Scanning 500 m perimeter…';
        } else if(radarState==='error'){
          badge.hidden=false;
          badgeText.textContent='Radar scan incomplete';
        } else {
          badge.hidden=false;
          const totalEst=(radarGroups.competitors.length)+(radarGroups.complementary.length)+(radarGroups.unclassified.length);
          badgeText.textContent=`${totalEst} places · 500 m radar active`;
        }
      }
      renderRadarList();
      const notices=$('[data-radar-notices]');
      if(notices){
        if(radarState==='error'){
          notices.innerHTML=`<div class="pw-notice pw-notice--amber"><strong>Nearby data unavailable.</strong> ${escape(radarError || 'Could not retrieve nearby records.')} Click Retry to check again.</div>`;
        } else if(radarState==='loading'){
          notices.innerHTML=`<div class="pw-notice pw-notice-neutral"><strong>Loading nearby records…</strong> Querying OSM nodes, ways, and road network within 500 meters.</div>`;
        } else if(radarState==='disabled'){
          notices.innerHTML=`<div class="pw-notice pw-notice-neutral"><strong>Radar is off.</strong> Turn on 500 m radar to assess nearby establishments and road access.</div>`;
        } else if(radarState==='idle'){
          notices.innerHTML=`<div class="pw-notice pw-notice-neutral"><strong>Review proximity in context.</strong> Nearby places do not establish customer demand. Mapped roads do not confirm legal road access.</div>`;
        } else {
          const compCount=radarGroups.competitors.length;
          const complCount=radarGroups.complementary.length;
          const unclassCount=radarGroups.unclassified.length;
          const roadCount=radarGroups.roads?.length || radarData?.roads?.features?.length || 0;
          notices.innerHTML=`<div class="pw-evidence-card"><div class="pw-evidence-header"><span style="font-size:13px">📍</span><strong>Surroundings Evidence (500 m)</strong></div><div class="pw-evidence-grid"><div class="pw-evidence-stat"><span class="pw-radar-place-icon is-competitor" style="width:13px;height:13px;font-size:8px;padding:1px;display:inline-flex;border-radius:3px"></span><strong>${compCount}</strong> competitors</div><div class="pw-evidence-stat"><span class="pw-radar-place-icon is-complementary" style="width:13px;height:13px;font-size:8px;padding:1px;display:inline-flex;border-radius:3px"></span><strong>${complCount}</strong> complementary</div><div class="pw-evidence-stat"><span class="pw-radar-place-icon is-road" style="width:13px;height:13px;font-size:8px;padding:1px;display:inline-flex;border-radius:3px"></span><strong>${roadCount}</strong> roads</div></div><div class="pw-evidence-footer">Mapped local commercial inventory within 500m radius of reference point.</div></div>`;
        }
      }
      if(radarState==='error')setText('[data-radar-coverage]','Unable to load nearby data. Check network connection and click Retry.');
      else if(radarState==='loading')setText('[data-radar-coverage]','Querying OpenStreetMap and local records within 500 meters straight-line distance…');
      else if(radarState==='disabled')setText('[data-radar-coverage]','Radar is off. Turn it on to check the 500-meter straight-line radius.');
      else if(radarState==='idle')setText('[data-radar-coverage]','Choose or place a reference point on the map to run geographic distance checks within 500 meters.');
      else {
        const meta=radarData?.meta || {};
        const cacheNote=meta.stale?' (Offline fallback)':meta.cached?' (Cached)':' (Live)';
        const retDate=meta.retrievedDate || meta.retrievalDate || 'Recent';
        const unclass=radarGroups.unclassified.length;
        setText('[data-radar-coverage]',`Data sourced from ${meta.source || 'OpenStreetMap & local repository'}${cacheNote} · Retrieved ${retDate}.${unclass?` ${unclass} other nearby places visible on map.`:''} Straight-line distance from reference point. Road segments intersect the 500 m radius.`);
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
        list.innerHTML='<div class="pw-radar-loading"><div class="pw-radar-spinner"></div><strong>Loading nearby data…</strong><p>Querying verified establishments and road network within 500 meters.</p></div>';
        return;
      }
      if(radarState==='error'){
        if(countEl)countEl.textContent='';
        list.innerHTML=`<div class="pw-radar-error"><svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><strong>Unable to load nearby data</strong><p>${escape(radarError || 'The mapping service could not be reached.')}</p><button type="button" class="pw-button pw-button-light pw-button-small" data-radar-retry>Retry</button></div>`;
        return;
      }
      let rows=radarGroups[radarTab] || [];
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
          hoverVectorLayer.bindTooltip(`${distM} m · ${walkingEstimate(distM)}`,{permanent:true,direction:'center',className:'pw-vector-tooltip'}).openTooltip();
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
        return `<article class="pw-readiness-row"><span class="pw-readiness-icon" aria-hidden="true">${{spatial_accessibility:'⌖',infrastructure_readiness:'⚙',economic_viability:'▥',nearby_businesses:'▦',zoning_compatibility:'▤',risk_constraints:'△',environmental_safety:'♧'}[key]}</span><div><strong>${labels[key]}</strong><small>${scored?'Source evidence available.':action}</small></div><button type="button" class="pw-readiness-action ${scored?'is-ready':''}" data-readiness-target="${target}">${scored?'View':button}</button></article>`;
      }).join('');
      setText('[data-readiness-title]',assessmentValue?.assessmentComplete?'Assessment ready':'IAI not ready');
      setText('[data-readiness-summary]',assessmentValue?.assessmentComplete?'All seven criteria have source evidence. Review the calculated assessment.':'Record the facts and confirm source evidence with the reviewing office.');
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
        all('[data-editor-step]').find(node=>node.dataset.editorStep==='4')?.click();
        tabs('data-review-tab','data-review-panel','assessment');return;
      }
      const button=event.target.closest('[data-readiness-target]');if(!button)return;
      const target=button.dataset.readinessTarget;
      if(target==='radar' || target==='boundary')all('[data-editor-step]').find(node=>node.dataset.editorStep===(target==='radar'?'3':'1'))?.click();
      else{tabs('data-evidence-tab','data-evidence-panel',target);$(`[data-evidence-tab="${target}"]`)?.focus();}
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
          container.innerHTML=`<div class="pw-match-pending"><span class="pw-pill">Assessment pending</span><h3>Business matches need supporting evidence</h3><p>${escape(payload.message || 'Complete the seven criteria and approved business profiles to compare eligible options.')}</p></div>`;
          const breakdown=$('[data-match-breakdown]');if(breakdown)breakdown.innerHTML=`<h3>Seven criteria, one documented method</h3>${Object.entries(payload.weights || {}).map(([key,weight])=>`<div class="pw-weight-row"><span>${escape(labels[key] || key)}</span><strong>${weight}%</strong></div>`).join('')}<p class="pw-muted">Ratings and weighted totals appear when the evidence and approved method are ready.</p>`;
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
      field(name)?.addEventListener(field(name).tagName==='SELECT'?'change':'input',()=>{matchController?.abort();matchRevision++;clearMatchDetails();if(step===4)$('[data-business-matches]').innerHTML='<p class="pw-empty-state">Property inputs changed. Return to Review to refresh the business matches.</p>';});
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
      return {values,step,locationMethod,savedAt:new Date().toISOString(),hasPhoto:Boolean(field('image_file')?.files.length || evidenceFiles?.files.length) || [...nearbyData.keys()].some(key=>key.startsWith('nearby_photo_')),nearby:JSON.parse(nearbyData.get('nearbyProperties') || '[]'),radarEnabled:$('[data-radar-toggle]')?.checked,referenceConfirmed:dirtyReference};
    }
    $('[data-save-exit]')?.addEventListener('click',()=>{
      try{localStorage.setItem(draftKey,JSON.stringify(draft()));dialog.close();const workspace=document.querySelector('[data-workspace-status]');if(workspace)workspace.textContent='Draft saved on this device. Open the property form to resume.';}
      catch{notify('The browser could not store this draft. Keep the form open and save the property for review.');}
    });
    dialog.addEventListener('close',()=>{controller?.abort();radarController?.abort();searchController?.abort();matchController?.abort();revision++;radarRevision++;matchRevision++;boundaryMap?.pm?.disableDraw();parcelLayer?.pm?.disable();placingReference=false;if(imageObjectUrl){URL.revokeObjectURL(imageObjectUrl);imageObjectUrl=null;}});
    form.addEventListener('input',preview);form.addEventListener('change',preview);
    ready();
    return {
      sync:syncLocation,
      inputs:assessmentInputs,
      setNearby(editor){nearbyEditor=editor;},
      validateBoundary(){
        if ((value('lat') !== '' || value('lng') !== '') && !point()) {
          selectLocationMethod('pin');notify('Provide both valid latitude and longitude, or clear both fields and enter an area size.');
          const target=field(value('lat') === '' || !Number.isFinite(+value('lat')) || Math.abs(+value('lat'))>90 ? 'lat' : 'lng');
          const coordinates=target?.closest('details');if (coordinates) coordinates.open=true;
          // The controller restores Step 2 after validation. Focus after that
          // change so its scroll reset cannot leave the coordinate error hidden.
          requestAnimationFrame(() => {if (dialog.open) {target?.focus({preventScroll:true});target?.scrollIntoView({block:'center'});}});
          return false;
        }
        if (!(estimatedArea > 0) && !enteredAreaSqm() && !point()) {
          notify('Enter an area size, pin the exact location, or draw a plot to continue.');
          selectLocationMethod('area');field('land_area')?.focus();return false;
        }
        return true;
      },
      validateSurroundings(){
        return true;
      },
      onStep(next){
        step=next;
        if(next===1 && value('barangay') && !point()){
          proceedToBarangay(value('barangay'), false);
        }
        preview();
        if(next===1 && locationMethod!=='area'){syncLocation();renderLayers();}
        if(next===3)syncRadar();
        if(next===4){assessment?.refresh();matches();}
        if(next!==1){boundaryMap?.pm?.disableDraw();parcelLayer?.pm?.disable();}
        if(dialog.open && next>0){try{localStorage.setItem(draftKey,JSON.stringify(draft()));}catch{/* Submission still works when browser storage is unavailable. */}}
      },
      setProperty(property){
        all('.pw-coordinate-details,.pw-readiness-disclosure,.pw-hazard-disclosure,.pw-details,[data-map-layers]').forEach(details => {details.open=false;});
        const historicalStatus = field('status')?.querySelector('[value="Availed"]');
        if (historicalStatus) { historicalStatus.hidden = property?.status !== 'Availed'; historicalStatus.disabled = property?.status !== 'Availed'; }
        controller?.abort();radarController?.abort();searchController?.abort();matchController?.abort();revision++;radarRevision++;matchRevision++;lastAssessment=null;clearMatchDetails();
        parcelLayer?.remove();parcelLayer=null;locationMarker?.remove();locationMarker=null;
        radarMarker?.remove();radarMarker=null;radarLayers.forEach(layer=>layer.remove());radarLayers=[];radiusLayer?.remove();radarParcel?.remove();
        history=[];boundary=property?.parcel?.boundary || null;estimatedArea=0;context=null;radarData=null;radarState='idle';radarError=null;selectedMatches=[];dirtyReference=Boolean(property?.parcel?.referencePoint?.lat!=null);placingReference=false;
        if(imageObjectUrl)URL.revokeObjectURL(imageObjectUrl);imageObjectUrl=null;
        existingImage=property?.imageUrl ? (/^https?:\/\//.test(property.imageUrl)?property.imageUrl:`${config.basePath || ''}/${property.imageUrl.replace(/^\//,'')}`) : '';
        const parcel=property?.parcel;
        if(field('area_method'))field('area_method').value=parcel?.areaMethod || (property?.area>0?'survey':'declared');
        propertyId=property?.id || null;savedAttachments=parcel?.attachments || [];showEvidenceFiles();
        if(parcel?.boundary || parcel?.surveyAreaSqm>0){field('land_area').value=parcel.surveyAreaSqm>0?parcel.surveyAreaSqm:'';field('land_area_unit').value='sqm';}
        for(const [name,val] of Object.entries(parcel?.observations || {})){if(field(name))field(name).value=val ?? '';}
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
        draftKey=`locus:property-draft:${config.user?.id || 'staff'}:${property?.id || 'new'}`;
        let restored=null;
        try{const saved=localStorage.getItem(draftKey);if(saved){restored=JSON.parse(saved);for(const [name,val] of Object.entries(restored.values || {})){const controls=[...form.elements].filter(element=>element.name===name && element.type!=='file');for(const control of controls){if(control.type==='checkbox')control.checked=Array.isArray(val) && val.includes(control.value);else if(control.type==='radio')control.checked=control.value===val;else control.value=val;}}if($('[data-radar-toggle]'))$('[data-radar-toggle]').checked=restored.radarEnabled!==false;boundary=value('boundary')?JSON.parse(value('boundary')):null;dirtyReference=restored.referenceConfirmed===true;notify(`Draft restored from this device.${restored.hasPhoto?' Choose photos and evidence files again before saving.':''}`);}}
        catch{notify('The saved draft could not be restored. Enter the property details again.');}
        if(boundary && window.turf)estimatedArea=turf.area(boundary);
        selectLocationMethod(restored?.locationMethod || (boundary?'draw':point()?'pin':'area'),false);
        if(boundaryMap && boundary)loadBoundary(boundary);
        updateBoundary(true);preview();ready();tabs('data-evidence-tab','data-evidence-panel','access');tabs('data-review-tab','data-review-panel','assessment');radarTab='competitors';tabs('data-radar-tab','data-radar-unused-panel','competitors');
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
        } else {
          data.delete('reference_lat');
          data.delete('reference_lng');
          data.delete('reference_label');
        }
        data.set('boundary',boundary?JSON.stringify(boundary):'');
        data.set('calculated_area_sqm',String(estimatedArea));
      },
      buildSubmission(data, subcategories = []) {
        data.delete('id');
        data.set('land_area',value('land_area'));
        data.set('land_area_unit',value('land_area_unit') || 'sqm');
        data.set('property_type',({Industrial:'manufacturing',Hospitality:'hotel',Office:'bpo'})[value('category')] || 'commercial');
        data.set('subcategory',Array.from(subcategories).join(', '));
        const purpose = value('listing_purpose') || 'sale';
        data.set('listing_purpose',purpose);
        data.set('price',purpose === 'lease' ? '' : value('price').replace(/,/g,'').trim());
        data.set('lease_price',purpose === 'sale' ? '' : value('lease_price').replace(/,/g,'').trim());
        data.set('lease_period',value('lease_period') || 'month');
        data.set('lease_price_unit',value('lease_price_unit') || 'total');
        data.set('contactMode',value('contactBrokerUserId')?'broker':'open_listing');
        data.set('recalculate_assessment','true');
        data.set('assessmentTags',JSON.stringify(all('[name="assessmentTags[]"]:checked').map(element=>element.value)));
        if (!data.get('image_file')?.size) data.delete('image_file');
        return data;
      },
      saved(){try{localStorage.removeItem(draftKey);}catch{/* Property already saved on the server. */}},
    };
  };
})();
