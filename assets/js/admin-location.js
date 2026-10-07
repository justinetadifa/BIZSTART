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
    let options = [];
    const coordinate = () => {
      const lat = form.elements.lat.value, lng = form.elements.lng.value;
      return lat !== '' && lng !== '' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180 ? [Number(lat), Number(lng)] : null;
    };
    function place(point) {
      form.elements.lat.value = point.lat.toFixed(6);
      form.elements.lng.value = point.lng.toFixed(6);
      form.elements.lat.dispatchEvent(new Event('input', {bubbles:true}));
      form.elements.lng.dispatchEvent(new Event('input', {bubbles:true}));
      sync();
      status.textContent = 'Pin updated. Confirm the location and barangay against the parcel records.';
    }
    function sync() {
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
        map.setView(point,Math.max(15,map.getZoom()));
      } else if (marker) { marker.remove(); marker = null; }
    }
    async function find() {
      const query = input.value.trim();
      if (query.length < 2) { status.textContent = 'Enter at least two characters to search.'; input.focus(); return; }
      controller?.abort(); controller = new AbortController();
      search.disabled = true; results.innerHTML = ''; status.textContent = 'Finding matching locations…';
      try {
        const response = await fetch(`${apiBase}/location-search.php?q=${encodeURIComponent(query)}`, {credentials:'same-origin',signal:controller.signal,headers:{Accept:'application/json'}});
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Location search is unavailable.');
        options = (data.search?.results || []).filter(item => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)) && item.lat != null && item.lng != null);
        results.innerHTML = options.map((item,index) => `<button type="button" data-location-result="${index}" class="tw-min-h-11 tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-p-3 tw-text-left tw-text-xs hover:tw-bg-slate-50"><strong class="tw-block tw-break-words">${escape(item.label)}</strong><span class="tw-mt-1 tw-block tw-break-words tw-text-[10px] tw-text-slate-500">${escape(item.subtitle)}</span></button>`).join('');
        status.textContent = options.length ? (data.search?.live ? 'Choose a match and confirm the parcel location.' : 'Matching existing listings. You can also place the pin on the map.') : 'No matching location. Tap the map or enter the parcel coordinates.';
      } catch (error) { if (error.name !== 'AbortError') status.textContent = `${error.message} You can still enter coordinates or use the map.`; }
      finally { search.disabled = false; }
    }
    search.addEventListener('click', find);
    input.addEventListener('keydown', event => { if (event.key === 'Enter') {event.preventDefault();find();} });
    results.addEventListener('click', event => { const button=event.target.closest('[data-location-result]');if (!button) return;const option=options[Number(button.dataset.locationResult)];place({lat:Number(option.lat),lng:Number(option.lng)});results.innerHTML=''; });
    form.querySelector('[data-use-map-center]').addEventListener('click', () => {sync();place(map.getCenter());});
    [form.elements.lat,form.elements.lng].forEach(field => field.addEventListener('change',sync));
    dialog.addEventListener('close', () => {controller?.abort();results.innerHTML='';input.value='';status.textContent='The pin is a location estimate. Verify it against the parcel records.';});
    return {sync};
  };
})();
