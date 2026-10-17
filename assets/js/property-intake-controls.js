(() => {
  'use strict';
  window.SFCPropertyIntakeControls = (form) => {
    const $ = selector => form.querySelector(selector);
    const field = name => form.elements[name];
    const native = $('[data-property-subtype-select]');
    const make = (tag, className, text) => { const el=document.createElement(tag); if(className)el.className=className; if(text)el.textContent=text; return el; };
    let classificationRoot;
    function renderSubtype() {
      if (!native || !classificationRoot) return;
      const extra = (field('additional_subcategories')?.value || '').split(',').map(v => v.trim()).filter(Boolean);
      const chosen = new Set([native.value, ...extra].filter(Boolean));
      classificationRoot.replaceChildren();
      for (const option of native.options) {
        if (!option.value) continue;
        const row = make('label', 'pw-classification-choice');
        const checkbox = make('input'); checkbox.type = 'checkbox'; checkbox.value = option.value;
        checkbox.checked = chosen.has(option.value); checkbox.dataset.classificationChoice = '';
        const label = make('span', '', option.text);
        row.append(checkbox, label);
        checkbox.addEventListener('change', () => {
          const selected = [...classificationRoot.querySelectorAll('input:checked')].map(n => n.value);
          // Retain the existing primary while it remains checked, for API compatibility.
          const primary = selected.includes(native.value) ? native.value : selected[0] || '';
          native.value = primary;
          field('additional_subcategories').value = selected.filter(v => v !== primary).join(', ');
          native.dispatchEvent(new Event('change', {bubbles:true}));
        });
        classificationRoot.append(row);
      }
    }
    if (native) {
      const root = make('div', 'pw-classification-picker');
      classificationRoot = make('div', 'pw-classification-choices');
      classificationRoot.setAttribute('role', 'group'); classificationRoot.setAttribute('aria-labelledby', 'pwSubtypeLabel');
      root.append(classificationRoot, make('p', 'pw-muted pw-small', 'Choose all that apply. Agricultural includes farms and agribusiness. These describe the property; zoning permission is checked separately.'));
      native.after(root); native.classList.add('pw-native-subtype'); native.tabIndex = -1;
      native.setAttribute('aria-hidden','true');
      native.addEventListener('focus', () => classificationRoot.querySelector('input')?.focus());
      native.addEventListener('change', () => queueMicrotask(renderSubtype));
      form.addEventListener('classificationchange', () => queueMicrotask(renderSubtype));
      const additional = $('[data-subcategory-wrapper]'); if (additional) additional.hidden = true;
      renderSubtype();
    }
    const filter=$('[data-classification-search]');
    function filterAdditional() {
      const query=filter?.value.trim().toLowerCase() || '';
      $('[data-subcategory-grid]')?.querySelectorAll('label').forEach(row=>{row.hidden=Boolean(query&&!row.textContent.toLowerCase().includes(query));});
    }
    filter?.addEventListener('input',filterAdditional);
    form.addEventListener('classificationchange',()=>queueMicrotask(filterAdditional));

    const phoneRoot=$('[data-contact-phone-rows]'), socialRoot=$('[data-contact-social-rows]');
    function storeChannels() {
      [...phoneRoot.children].forEach((row,index)=>{row.querySelector('.pw-field > span').textContent=`Phone ${index+2}`;row.querySelector('button').setAttribute('aria-label',`Remove phone ${index+2}`);});
      if(field('owner_additional_phones'))field('owner_additional_phones').value=JSON.stringify([...phoneRoot.querySelectorAll('input')].map(n=>n.value));
      if(field('owner_social_links'))field('owner_social_links').value=JSON.stringify([...socialRoot.children].map(row=>({label:row.querySelector('[data-social-label]').value,url:row.querySelector('[data-social-url]').value})));
      field('owner_additional_phones')?.dispatchEvent(new Event('input',{bubbles:true}));
      $('[data-add-contact-phone]').disabled=phoneRoot.children.length>=4;
      $('[data-add-contact-social]').disabled=socialRoot.children.length>=4;
    }
    function addRow(type, data={}, focus=true) {
      const root=type==='phone'?phoneRoot:socialRoot;if(!root||root.children.length>=4)return;
      const row=make('div',`pw-contact-channel-row pw-contact-channel-${type}`);
      const wrap=make('label','pw-field');const input=make('input');
      if(type==='phone') {wrap.append(make('span','',`Phone ${root.children.length+2}`));input.type='tel';input.maxLength=40;input.placeholder='+63 917 123 4567';input.autocomplete='tel';input.value=String(data||'');}
      else {wrap.append(make('span','','Account or website'));input.type='text';input.maxLength=60;input.placeholder='e.g. Facebook page';input.dataset.socialLabel='';input.value=data.label||'';}
      wrap.append(input);row.append(wrap);
      if(type==='social') {const urlWrap=make('label','pw-field');urlWrap.append(make('span','','Link'));const url=make('input');url.type='url';url.maxLength=500;url.placeholder='https://…';url.dataset.socialUrl='';url.value=data.url||'';urlWrap.append(url);row.append(urlWrap);}
      const remove=make('button','pw-channel-remove','×');remove.type='button';remove.setAttribute('aria-label',`Remove ${type==='phone'?'phone number':'social link'}`);remove.addEventListener('click',()=>{row.remove();storeChannels();$(`[data-add-contact-${type}]`).focus();});row.append(remove);
      row.addEventListener('input',()=>{for(const control of row.querySelectorAll('input'))control.setCustomValidity('');storeChannels();});root.append(row);if(focus)input.focus();
    }
    $('[data-add-contact-phone]')?.addEventListener('click',()=>{addRow('phone','');storeChannels();});
    $('[data-add-contact-social]')?.addEventListener('click',()=>{addRow('social');storeChannels();});
    const parse = name => {try{const v=JSON.parse(field(name)?.value||'[]');return Array.isArray(v)?v:[];}catch{return [];}};
    function refresh() {
      renderSubtype();
      if(filter){filter.value='';filterAdditional();}
      if(!phoneRoot||!socialRoot)return;
      phoneRoot.replaceChildren();socialRoot.replaceChildren();
      parse('owner_additional_phones').slice(0,4).forEach(v=>addRow('phone',v,false));
      parse('owner_social_links').slice(0,4).forEach(v=>addRow('social',v,false));
      $('[data-add-contact-phone]').disabled=phoneRoot.children.length>=4;
      $('[data-add-contact-social]').disabled=socialRoot.children.length>=4;
    }
    function validate() {
      for(const input of phoneRoot?.querySelectorAll('input')||[]) {
        const text=input.value.trim(),digits=text.replace(/\D/g,'');
        input.setCustomValidity(text && (!/^\+?[0-9() .-]+$/.test(text)||digits.length<7||digits.length>15) ? 'Enter 7 to 15 digits, including the country or area code.' : '');
        if(!input.checkValidity())return input;
      }
      for(const row of socialRoot?.children||[]) {
        const input=row.querySelector('[data-social-url]'),label=row.querySelector('[data-social-label]');let valid=!input.value&&!label.value;
        try{const url=new URL(input.value);valid=['http:','https:'].includes(url.protocol)&&Boolean(url.hostname)&&!url.username&&!url.password;}catch{}
        input.setCustomValidity(valid?'':'Paste a complete http or https account link.');if(!input.checkValidity())return input;
      }
      return null;
    }
    refresh();return {refresh,validate,restore(contact={}) {
      if(field('owner_additional_phones'))field('owner_additional_phones').value=JSON.stringify(contact?.additionalPhones||[]);
      if(field('owner_social_links'))field('owner_social_links').value=JSON.stringify(contact?.socialLinks||[]);
      refresh();
    }};
  };
})();
