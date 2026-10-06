document.addEventListener('DOMContentLoaded', () => {
  const signInTab = document.getElementById('btnAdminSignInTab');
  const onboardTab = document.getElementById('btnAdminOnboardTab');
  const signInSection = document.getElementById('adminSignInSection');
  const onboardSection = document.getElementById('adminOnboardSection');
  if (!signInTab || !onboardTab || !signInSection || !onboardSection) return;
  const tabs = [signInTab, onboardTab];

  function switchTab(mode, focus = false) {
    const onboarding = mode === 'onboard';
    signInSection.hidden = onboarding;
    onboardSection.hidden = !onboarding;
    tabs.forEach((tab, index) => {
      const selected = index === (onboarding ? 1 : 0);
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    if (focus) tabs[onboarding ? 1 : 0].focus();
    const url = new URL(location.href);
    url.hash = onboarding ? 'onboard' : '';
    history.replaceState(null, '', url);
  }

  signInTab.addEventListener('click', () => switchTab('signin'));
  onboardTab.addEventListener('click', () => switchTab('onboard'));
  tabs.forEach(tab => tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : tab === signInTab ? 1 : 0;
    switchTab(next ? 'onboard' : 'signin', true);
  }));
  if (location.hash === '#onboard') switchTab('onboard');
  window.addEventListener('hashchange', () => switchTab(location.hash === '#onboard' ? 'onboard' : 'signin'));

  const form = document.getElementById('adminOnboardForm');
  const status = document.getElementById('adminOnboardStatus');
  const submit = document.getElementById('adminOnboardSubmitBtn');
  const password = form.elements.password;
  const confirmation = form.elements.confirm_password;
  const validateConfirmation = () => confirmation.setCustomValidity(confirmation.value && confirmation.value !== password.value ? 'Passwords do not match.' : '');
  password.addEventListener('input', validateConfirmation);
  confirmation.addEventListener('input', validateConfirmation);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    validateConfirmation();
    if (!form.reportValidity()) return;
    const config = window.SFC_APP_CONFIG || {};
    submit.disabled = true;
    submit.textContent = 'Activating…';
    status.hidden = true;
    status.className = 'admin-onboard-status';
    status.textContent = '';
    try {
      const response = await fetch(`${config.apiBase || 'api'}/staff-onboard.php`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'X-CSRF-Token': config.csrfToken || '' }, body: new FormData(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Account activation failed.');
      status.hidden = false;
      status.classList.add('is-success');
      status.textContent = 'Account activated.';
      window.location.href = data.redirect || `${config.basePath || ''}/admin-dashboard.php`;
    } catch (error) {
      status.hidden = false;
      status.classList.add('is-error');
      status.textContent = error.message || 'Unable to activate your account.';
      submit.disabled = false;
      submit.textContent = 'Activate account';
    }
  });
});
