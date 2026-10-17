(() => {
  'use strict';
  window.SFCPropertyIntakeControls = (form) => {
    const $ = selector => form.querySelector(selector);
    const field = name => form.elements[name];
    const native = $('[data-property-subtype-select]');
    const make = (tag, className, text) => { const el=document.createElement(tag); if(className)el.className=className; if(text)el.textContent=text; return el; };
    const subtypeDescriptions = {
      'Commercial Lot':'Land described for commercial purposes', 'Residential Lot':'Land described for residential purposes',
      'Industrial Lot':'Land described for industrial purposes', 'Agricultural':'Land used or described for agriculture',
      'Raw Land':'Undeveloped land', 'Farm / Agribusiness':'Farm or agricultural business property',
      'Office':'Office premises', 'Industrial / Warehouse':'Industrial premises or warehouse',
      'Hospitality / Tourism':'Accommodation or visitor facilities', 'Mixed-Use':'More than one recorded use',
    };
    let picker, trigger, search, list;
    function closePicker(focus=false) { if(!picker)return; picker.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus(); }
    function renderSubtype() {
      if(!native || !list)return;
      const selected=native.value, query=search.value.trim().toLowerCase();
      trigger.querySelector('span').textContent=selected || `Choose ${field('category')?.value === 'Land' ? 'land' : 'building'} subtype`;
      trigger.classList.toggle('has-value',Boolean(selected));
      list.replaceChildren();
      for(const option of native.options) {
        if(!option.value || !option.text.toLowerCase().includes(query))continue;
        const row=make('button','pw-subtype-option');row.type='button';row.role='option';
        row.setAttribute('aria-selected',String(option.value===selected));row.dataset.subtypeValue=option.value;
        row.append(make('strong','',option.text));
        if(subtypeDescriptions[option.value])row.append(make('small','',subtypeDescriptions[option.value]));
        row.addEventListener('click',()=>{native.value=option.value;native.dispatchEvent(new Event('change',{bubbles:true}));renderSubtype();closePicker(true);});
        list.append(row);
      }
      if(!list.children.length)list.append(make('p','pw-muted','No matching subtype. Try another word.'));
    }
    if(native) {
      const root=make('div','pw-subtype-picker');native.after(root);
      trigger=make('button','pw-subtype-trigger');trigger.type='button';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-labelledby','pwSubtypeLabel pwSubtypeValue');
      const title=make('span');title.id='pwSubtypeValue';trigger.append(title,make('span','pw-picker-chevron','⌄'));
      picker=make('div','pw-subtype-menu');picker.hidden=true;
      search=make('input','pw-subtype-search');search.type='search';search.placeholder='Find a subtype…';search.setAttribute('aria-label','Find a primary subtype');
      list=make('div','pw-subtype-options');list.id='pwSubtypeOptions';list.role='listbox';list.setAttribute('aria-labelledby','pwSubtypeLabel');trigger.setAttribute('aria-controls',list.id);
      picker.append(search,list,make('p','pw-subtype-note','Describes the listing. Official zoning is assessed separately.'));root.append(trigger,picker);
      native.classList.add('pw-native-subtype');native.tabIndex=-1;native.setAttribute('aria-hidden','true');
      native.addEventListener('focus',()=>trigger.focus());
      trigger.addEventListener('click',()=>{if(!picker.hidden){closePicker();return;}picker.hidden=false;trigger.setAttribute('aria-expanded','true');search.value='';renderSubtype();search.focus({preventScroll:true});requestAnimationFrame(()=>picker.scrollIntoView({block:'nearest',inline:'nearest'}));});
      trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();trigger.click();}});
      search.addEventListener('input',renderSubtype);
      root.addEventListener('keydown',event=>{
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closePicker(true);return;}
        const rows=[...list.querySelectorAll('button')];const i=rows.indexOf(document.activeElement);
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const next=i<0?(event.key==='ArrowDown'?0:rows.length-1):(i+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length;rows[next]?.focus();}
        if(event.key==='Home'||event.key==='End'){event.preventDefault();rows[event.key==='Home'?0:rows.length-1]?.focus();}
        if(event.key==='Tab')closePicker();
      });
      document.addEventListener('click',event=>{if(!root.contains(event.target))closePicker();});
      native.addEventListener('change',renderSubtype);
      form.addEventListener('classificationchange',()=>queueMicrotask(renderSubtype));
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
      renderSubtype();closePicker();
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
