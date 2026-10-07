(() => {
  'use strict';
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const fieldClass = 'tw-mt-2 tw-block tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-2.5 tw-text-sm tw-text-[#11224d] focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-amber-200';
  window.SFCNearby = (container) => {
    if (!container) return { set() {}, append() {} };
    const list = container.querySelector('[data-nearby-list]');
    const add = container.querySelector('[data-add-nearby]');
    let entries = [];
    const photoSource = (entry) => entry.previewUrl || (/^https:\/\//i.test(entry.imageUrl || '') ? entry.imageUrl : entry.imageUrl ? `${window.SFC_APP_CONFIG?.basePath || ''}/${entry.imageUrl}` : '');
    const releasePhoto = (entry) => { if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl); };
    const render = () => {
      list.innerHTML = entries.length ? entries.map((entry, index) => `<div class="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4" data-nearby-row="${index}">
        <div class="tw-mb-3 tw-flex tw-items-center tw-justify-between tw-gap-3"><strong class="tw-text-sm tw-font-semibold">Nearby place ${index + 1}</strong><button type="button" data-remove-nearby="${index}" class="tw-rounded-md tw-border-0 tw-bg-transparent tw-p-1 tw-text-xs tw-text-slate-500 hover:tw-text-red-800" aria-label="Remove nearby place ${index + 1}">Remove</button></div>
        <div class="tw-grid tw-gap-4 sm:tw-grid-cols-2"><label class="tw-text-xs tw-font-medium"><span>Property or business name</span><input data-nearby-field="name" class="${fieldClass}" value="${escape(entry.name)}" required maxlength="180" placeholder="e.g. Public market"></label><label class="tw-text-xs tw-font-medium"><span>Type <span class="tw-font-normal tw-text-slate-500">(optional)</span></span><input data-nearby-field="type" class="${fieldClass}" value="${escape(entry.type)}" maxlength="100" placeholder="e.g. Retail, school, hotel"></label><label class="tw-text-xs tw-font-medium"><span>Distance (km) <span class="tw-font-normal tw-text-slate-500">(optional)</span></span><input data-nearby-field="distanceKm" class="${fieldClass}" value="${escape(entry.distanceKm)}" type="number" min="0" max="100" step="0.01" placeholder="0.5"></label><label class="tw-text-xs tw-font-medium"><span>Photo <span class="tw-font-normal tw-text-slate-500">(optional)</span></span><input data-nearby-file type="file" class="${fieldClass}" accept="image/jpeg,image/png,image/webp"></label></div>
        <img data-nearby-preview class="tw-mt-3 tw-h-20 tw-w-28 tw-rounded-lg tw-object-cover" ${photoSource(entry) ? `src="${escape(photoSource(entry))}"` : 'hidden'} alt="Nearby place photo preview">${entry.imageUrl ? `<p class="tw-mb-0 tw-mt-3 tw-text-xs tw-text-slate-500">Existing photo kept unless replaced.</p>` : ''}<p data-nearby-file-label class="tw-mb-0 tw-mt-2 tw-text-xs tw-text-slate-500" hidden></p>
      </div>`).join('') : '<p class="tw-m-0 tw-rounded-xl tw-border tw-border-dashed tw-border-slate-200 tw-p-5 tw-text-center tw-text-sm tw-text-slate-500">Add surrounding properties or businesses that help describe the site.</p>';
      add.disabled = entries.length >= 6;
      list.querySelectorAll('[data-nearby-row]').forEach((row) => {
        const entry = entries[Number(row.dataset.nearbyRow)];
        row.querySelectorAll('[data-nearby-field]').forEach((field) => field.addEventListener('input', () => { entry[field.dataset.nearbyField] = field.value; }));
        const fileLabel = row.querySelector('[data-nearby-file-label]');
        if (entry.file) { fileLabel.hidden = false; fileLabel.textContent = `Selected: ${entry.file.name}`; }
        row.querySelector('[data-nearby-file]').addEventListener('change', (event) => {
          releasePhoto(entry);
          entry.file = event.target.files?.[0] || null;
          entry.previewUrl = entry.file ? URL.createObjectURL(entry.file) : '';
          const preview = row.querySelector('[data-nearby-preview]');
          preview.hidden = !photoSource(entry);
          if (photoSource(entry)) preview.src = photoSource(entry);
          else preview.removeAttribute('src');
          fileLabel.hidden = !entry.file;
          fileLabel.textContent = entry.file ? `Selected: ${entry.file.name}` : '';
        });
      });
    };
    add.addEventListener('click', () => { if (entries.length < 6) { entries.push({ name: '', type: '', distanceKm: '', imageUrl: '' }); render(); list.lastElementChild?.querySelector('input')?.focus(); } });
    list.addEventListener('click', (event) => { const button = event.target.closest('[data-remove-nearby]'); if (button) { const index = Number(button.dataset.removeNearby); releasePhoto(entries[index]); entries.splice(index, 1); render(); add.focus(); } });
    return {
      set(items = []) { entries.forEach(releasePhoto); entries = items.map((item) => ({ ...item, distanceKm: item.distanceKm ?? '', file: null, previewUrl: '' })); render(); },
      append(data) { data.set('nearbyProperties', JSON.stringify(entries.map(({ file, previewUrl, ...entry }) => entry))); entries.forEach((entry, index) => { if (entry.file) data.set(`nearby_photo_${index}`, entry.file); }); },
    };
  };
})();
