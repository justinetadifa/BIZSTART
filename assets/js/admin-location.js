(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  window.SFCAdminLocation = (form, { apiBase, dialog }) => {
    const canvas = form?.querySelector('[data-location-map]');
    if (!canvas || !window.L) return null;
    const input = form.querySelector('[data-location-search]');
    const search = form.querySelector('[data-location-search-button]');
    const results = form.querySelector('[data-location-results]');
    const status = form.querySelector('[data-location-status]');
    let map;
    let marker;
    let controller;
    let searchTimer;
    let searchRevision = 0;
    let options = [];
    const coordinate = () => {
      const lat = form.elements.lat.value, lng = form.elements.lng.value;
      return lat !== '' && lng !== '' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180 ? [Number(lat), Number(lng)] : null;
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
    function place(point) {
      const rawLat = point?.lat ?? (Array.isArray(point) ? point[0] : null);
      const rawLng = point?.lng ?? (Array.isArray(point) ? point[1] : null);
      if (rawLat == null || rawLng == null || rawLat === '' || rawLng === '') return;
      const latNum = Number(rawLat), lngNum = Number(rawLng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum) || Math.abs(latNum) > 90 || Math.abs(lngNum) > 180) return;
      form.elements.lat.value = latNum.toFixed(6);
      form.elements.lng.value = lngNum.toFixed(6);
      form.elements.lat.dispatchEvent(new Event('input', {bubbles:true}));
      form.elements.lng.dispatchEvent(new Event('input', {bubbles:true}));
      sync();
      status.textContent = `Pin updated (${latNum.toFixed(6)}, ${lngNum.toFixed(6)}). Confirm the location and barangay against the parcel records.`;
    }
    function sync(move = true) {
      if (!map) {
        map = L.map(canvas, {scrollWheelZoom:false}).setView([16.615,120.316],14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
        map.on('click', event => place(event.latlng));
      }
      requestAnimationFrame(() => map.invalidateSize());
      const point = coordinate();
      if (point) {
        if (!marker) {
          marker = L.marker(point, {draggable:true,title:'Property location'}).addTo(map);
          marker.on('dragend', () => place(marker.getLatLng()));
        } else marker.setLatLng(point);
        if (move) map.setView(point,Math.max(15,map.getZoom()));
      } else if (form.elements.lat.value === '' && form.elements.lng.value === '') {
        if (marker) { marker.remove(); marker = null; }
      }
    }
    function cancelSearch() {
      clearTimeout(searchTimer);
      controller?.abort();
      searchRevision++;
      search.disabled = false;
      results.removeAttribute('aria-busy');
    }
    function renderResults(matches) {
      options = matches.slice(0, 8);
      results.innerHTML = options.map((item,index) => `<button type="button" data-location-result="${index}" class="tw-min-h-11 tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-p-3 tw-text-left tw-text-xs hover:tw-bg-slate-50"><strong class="tw-block tw-break-words">${escape(item.label || item.name)}</strong><span class="tw-mt-1 tw-block tw-break-words tw-text-[10px] tw-text-slate-500">${escape(item.subtitle || item.district || 'San Fernando, La Union')} · ${item.kind === 'property' ? 'Existing property pin; confirm position' : 'Approximate area; place your property pin'}</span></button>`).join('');
    }
    async function find() {
      cancelSearch();
      const query = input.value.trim();
      if (query.length < 2) { status.textContent = 'Enter at least two characters to search.'; input.focus(); return; }
      const coords = parseCoordinates(query);
      if (coords) {
        place(coords);
        results.innerHTML = '';
        status.textContent = `Coordinates located: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}.`;
        return;
      }
      if (proceedToBarangay(query)) return;
      const matches = barangayMatches(query);
      if (matches.length) {
        renderResults(matches);
        status.textContent = 'Choose the matching barangay to view its approximate area.';
        return;
      }
      if (/^[\d+\-.,;()\[\]\s°'"]+$/.test(query)) {
        status.textContent = 'Those coordinates are invalid. Check latitude and longitude, then try again.';
        return;
      }
      const requestRevision = searchRevision;
      const requestController = new AbortController(); controller = requestController;
      search.disabled = true; renderResults([]); results.setAttribute('aria-busy','true'); status.textContent = 'Finding matching locations…';
      try {
        const response = await fetch(`${apiBase}/location-search.php?q=${encodeURIComponent(query)}`, {credentials:'same-origin',signal:requestController.signal,headers:{Accept:'application/json'}});
        const data = await response.json();
        if (requestRevision !== searchRevision) return;
        if (!response.ok) throw new Error(data.error || 'Location search is unavailable.');
        renderResults((data.search?.results || []).filter(item => item.lat != null && item.lng != null && item.lat !== '' && item.lng !== '' && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)) && Math.abs(Number(item.lat)) <= 90 && Math.abs(Number(item.lng)) <= 180));
        status.textContent = options.length ? 'Choose a result to view its area. Place the pin on the property.' : 'No matching location. Tap the map or enter the parcel coordinates.';
      } catch (error) { if (error.name !== 'AbortError' && requestRevision === searchRevision) status.textContent = `${error.message} You can still enter coordinates or use the map.`; }
      finally { if (requestRevision === searchRevision) {search.disabled = false; results.removeAttribute('aria-busy');} }
    }
    search.addEventListener('click', find);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {event.preventDefault();find();}
      else if (event.key === 'Escape') {event.preventDefault();cancelSearch();renderResults([]);}
      else if (event.key === 'ArrowDown') {event.preventDefault();results.querySelector('button')?.focus();}
    });
    input.addEventListener('input', () => {
      cancelSearch();
      const val = input.value.trim();
      const matches = barangayMatches(val);
      renderResults(matches);
      const exact = matches.find(item => item.rank === 0);
      if (exact) searchTimer = setTimeout(() => {navigateLocation(exact);renderResults([]);},220);
      else if (matches.length) status.textContent = 'Choose the matching barangay from the results.';
    });
    input.addEventListener('change', () => {
      cancelSearch();
      const coords = parseCoordinates(input.value);
      if (coords) { place(coords); results.innerHTML = ''; return; }
      if (!proceedToBarangay(input.value)) renderResults(barangayMatches(input.value));
    });
    input.addEventListener('paste', event => {
      const text = event.clipboardData?.getData('text');
      if (text) {
        const coords = parseCoordinates(text);
        if (coords) {
          event.preventDefault();cancelSearch();
          input.value = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
          place(coords);
          results.innerHTML = '';
        }
      }
    });
    results.addEventListener('click', event => {
      const button = event.target.closest('[data-location-result]');
      if (!button) return;
      const option = options[Number(button.dataset.locationResult)];
      if (!option) return;
      cancelSearch();
      if (option.kind === 'property') place({lat:Number(option.lat),lng:Number(option.lng)});
      else navigateLocation(option);
      input.value = option.label || option.name || '';
      renderResults([]);
    });
    const BARANGAY_COORDINATES = window.SFC_APP_CONFIG?.barangays || {};
    function normalizeBarangay(rawInput) {
      return String(rawInput || '').trim().split(/[·•]/)[0].toLowerCase()
        .replace(/(?:,\s*|\s+)(?:city of\s+)?san fernando(?:\s+city)?(?:[,\s]+la union)?(?:[,\s]+philippines)?$/i, '')
        .replace(/^(?:barangay|baranggay|brgy\.?|bgy\.?)\s+/i, '')
        .replace(/[-\s]+/g, ' ').trim().replace(/^[1-4]$/, number => ['I','II','III','IV'][Number(number)-1].toLowerCase());
    }
    function barangayMatches(rawInput) {
      const clean = normalizeBarangay(rawInput);
      if (!clean) return [];
      const configured = window.SFC_APP_CONFIG?.barangays;
      const list = configured && Object.keys(configured).length ? configured : BARANGAY_COORDINATES;
      return Object.entries(list).map(([name,info]) => ({
        name,label:name,barangay:name,kind:'barangay',lat:Number(info.lat),lng:Number(info.lng),
        district:info.district || '',approximate:true,source:'Local barangay reference',
        rank:normalizeBarangay(name) === clean ? 0 : normalizeBarangay(name).startsWith(clean) ? 1 : normalizeBarangay(name).includes(clean) ? 2 : 3,
      })).filter(item => item.rank < 3 && Number.isFinite(item.lat) && Number.isFinite(item.lng) && Math.abs(item.lat) <= 90 && Math.abs(item.lng) <= 180)
        .sort((a,b) => a.rank - b.rank || a.name.localeCompare(b.name));
    }
    function navigateLocation(item) {
      if (item.kind === 'barangay' && form.elements.barangay && document.activeElement !== form.elements.barangay) form.elements.barangay.value = item.barangay || item.name;
      sync(false);
      map.stop();
      map.invalidateSize();
      const bounds = item.bounds;
      if (Array.isArray(bounds) && bounds.length === 2 && bounds.every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(Number.isFinite))) {
        map.fitBounds(bounds,{padding:[30,30],maxZoom:16,animate:false});
      } else map.setView([Number(item.lat),Number(item.lng)],item.kind === 'barangay' ? 15 : 18,{animate:false});
      status.textContent = `${item.name || item.label || 'Selected area'} · approximate ${item.kind === 'barangay' ? 'barangay reference' : 'search location'}. ${coordinate() ? 'Your property pin is unchanged. ' : ''}Click the property on the map to set its location.`;
    }
    function proceedToBarangay(name) {
      const match = barangayMatches(name).find(item => item.rank === 0);
      if (!match) return false;
      navigateLocation(match);
      renderResults([]);
      return true;
    }
    if (form.elements.barangay) {
      form.elements.barangay.addEventListener('input', () => {
        cancelSearch();
        const val = form.elements.barangay.value.trim();
        const matches = barangayMatches(val);
        renderResults(matches);
        const exact = matches.find(item => item.rank === 0);
        if (exact) searchTimer = setTimeout(() => {navigateLocation(exact);renderResults([]);},220);
        else if (matches.length) status.textContent = 'Choose the matching barangay from the results.';
      });
      form.elements.barangay.addEventListener('change', () => {
        cancelSearch();
        if (!proceedToBarangay(form.elements.barangay.value)) renderResults(barangayMatches(form.elements.barangay.value));
      });
    }
    form.querySelector('[data-use-map-center]')?.addEventListener('click', () => {sync(false);place(map.getCenter());});
    [form.elements.lat,form.elements.lng].forEach(field => {
      field.addEventListener('input', () => {cancelSearch();sync(false);});
      field.addEventListener('change', () => {cancelSearch();sync();});
      field.addEventListener('paste', event => {
        const text = event.clipboardData?.getData('text');
        if (text) {
          const coords = parseCoordinates(text);
          if (coords) {
            event.preventDefault();cancelSearch();
            place(coords);
          }
        }
      });
    });
    dialog.addEventListener('close', () => {cancelSearch();renderResults([]);input.value='';status.textContent='Place the pin at the property’s location and check it against the parcel records.';});
    return {sync};
  };
})();
