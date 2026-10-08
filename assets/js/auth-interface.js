(() => {
  const forms = [...document.querySelectorAll('[data-account-form]')];
  const summary = document.querySelector('[data-validation-summary]');
  const setError = (field, message) => {
    const error = document.getElementById(`${field.id}-error`);
    field.setAttribute('aria-invalid', String(Boolean(message)));
    field.setCustomValidity(message);
    if (error) { error.textContent = message; error.hidden = !message; }
  };
  const messageFor = (field, form) => {
    const value = field.value;
    if (field.required && (field.type === 'checkbox' ? !field.checked : !value.trim())) {
      if (field.name === 'privacy_consent') return 'Please agree to the Privacy Notice.';
      if (field.name === 'adult_confirmation') return 'Please confirm that you are 18 years old or above.';
      return 'This field is required.';
    }
    if (!value && field.type !== 'checkbox') return '';
    if (field.type === 'email' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || value.trim().length > 190)) return 'Enter a valid email address.';
    if (field.name === 'password' && form.elements.mode.value !== 'login') {
      if ([...value].length < 8) return 'Password must be at least 8 characters.';
      if (new TextEncoder().encode(value).length > 72) return 'Password must be at most 72 bytes.';
    }
    if (field.name === 'confirm_password' && value !== form.elements.password.value) return 'Passwords do not match.';
    if (field.name === 'last_name' && [...((form.elements.first_name?.value || '').trim() + ' ' + value.trim())].length > 140) return 'Your full name must be at most 140 characters.';
    if (field.name === 'phone' && value.trim() && (!/^[+()0-9 .-]{7,30}$/.test(value.trim()) || value.replace(/\D/g, '').length < 7)) return 'Enter a valid contact number.';
    if (field.name === 'prc_registration_no' && !/^[0-9]{1,20}$/.test(value.trim())) return 'Enter a valid PRC registration number.';
    if (field.name === 'prc_valid_until') {
      const date = new Date(`${value}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return 'Enter a valid PRC validity date.';
      if (value < field.min) return 'PRC registration has expired.';
    }
    if (field.name === 'department' && !['CICTO', 'ASSESSOR', 'LEBDO'].includes(value)) return 'Choose CICTO, City Assessor, or LEBDO.';
    if (field.maxLength > 0 && [...value.trim()].length > field.maxLength) return `Enter no more than ${field.maxLength} characters.`;
    return '';
  };
  forms.forEach(form => {
    const fields = [...form.querySelectorAll('input:not([type="hidden"]),select')];
    fields.forEach(field => {
      field.addEventListener('blur', () => { setError(field, messageFor(field, form)); });
      field.addEventListener(field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'input', () => {
        if (field.getAttribute('aria-invalid') === 'true') setError(field, messageFor(field, form));
        if (field.name === 'password') {
          const confirmation = form.elements.confirm_password;
          if (confirmation?.value) setError(confirmation, messageFor(confirmation, form));
        }
      });
    });
    form.addEventListener('submit', event => {
      if (form.dataset.submitting === 'true') { event.preventDefault(); return; }
      const invalid = [];
      fields.forEach(field => { const message = messageFor(field, form); setError(field, message); if (message) invalid.push(field); });
      if (invalid.length) {
        event.preventDefault();
        if (summary) summary.textContent = `Please check ${invalid.length === 1 ? 'the highlighted field' : 'the highlighted fields'}.`;
        invalid[0].focus();
        return;
      }
      if (summary) summary.textContent = '';
      form.dataset.submitting = 'true';
      form.setAttribute('aria-busy', 'true');
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      button.classList.add('is-loading');
      const label = button.querySelector('[data-submit-label]');
      if (label) { label.dataset.original = label.textContent; label.textContent = button.dataset.loadingLabel; }
    });
  });
  // Reset loading state when the browser restores a form from its back cache.
  window.addEventListener('pageshow', () => forms.forEach(form => {
    delete form.dataset.submitting;
    form.removeAttribute('aria-busy');
    const button = form.querySelector('[type="submit"]');
    button.disabled = false;
    button.classList.remove('is-loading');
    const label = button.querySelector('[data-submit-label]');
    if (label?.dataset.original) label.textContent = label.dataset.original;
  }));
  const tabs = [document.getElementById('btnAdminSignInTab'), document.getElementById('btnAdminOnboardTab')];
  if (tabs.every(Boolean)) {
    const panels = [document.getElementById('adminSignInSection'), document.getElementById('adminOnboardSection')];
    const switchTab = (index, focus = false, updateUrl = true) => {
      tabs.forEach((tab, i) => { tab.classList.toggle('is-active', i === index); tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; panels[i].hidden = i !== index; });
      document.querySelector('.account-shell')?.classList.toggle('is-registering', index === 1);
      if (focus) tabs[index].focus();
      if (updateUrl) { const url = new URL(location.href); url.hash = index ? 'onboard' : ''; url.searchParams.delete('mode'); history.replaceState(null, '', url); }
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => switchTab(index));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        switchTab(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index, true);
      });
    });
    if (location.hash === '#onboard') switchTab(1, false, false);
    window.addEventListener('hashchange', () => switchTab(location.hash === '#onboard' ? 1 : 0, false, false));
  }
  const visibleInvalid = document.querySelector('[aria-invalid="true"]:not([type="hidden"])');
  if (visibleInvalid && visibleInvalid.getClientRects().length) visibleInvalid.focus({ preventScroll: true });
})();
