(() => {
  const controls = new Map();
  let nextId = 0;
  const eye = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path data-password-slash d="m4 4 16 16"/></svg>';

  const setVisible = (input, visible) => {
    const control = controls.get(input);
    if (!control) return;
    const { button, label } = control;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const direction = input.selectionDirection;
    input.type = visible ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} ${label}`);
    button.title = button.getAttribute('aria-label');
    button.querySelector('[data-password-slash]').style.display = visible ? '' : 'none';
    if (start !== null && end !== null) input.setSelectionRange(start, end, direction || 'none');
  };

  const hideWithin = (container) => {
    controls.forEach((control, input) => {
      if (container.contains(input)) setVisible(input, false);
    });
  };

  const enhance = (input) => {
    if (controls.has(input) || input.closest('.sfc-password-field')) return;
    if (!input.id) {
      let id;
      do { id = `sfc-password-${++nextId}`; } while (document.getElementById(id));
      input.id = id;
    }
    const labelText = input.labels?.[0]?.textContent.trim() || 'password';
    const label = /confirm/i.test(input.name + ' ' + labelText) ? 'confirm password'
      : /current/i.test(input.name + ' ' + labelText) ? 'current password'
      : /new/i.test(input.name + ' ' + labelText) ? 'new password'
      : /passkey|activation/i.test(input.name + ' ' + labelText) ? 'activation code'
      : 'password';
    const wrapper = document.createElement('span');
    wrapper.className = 'sfc-password-field';
    input.before(wrapper);
    wrapper.append(input);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sfc-password-toggle';
    button.setAttribute('aria-controls', input.id);
    button.innerHTML = eye;
    wrapper.append(button);
    controls.set(input, { button, label });
    setVisible(input, false);
    button.addEventListener('click', (event) => {
      // Prevent a surrounding field label from forwarding this click to the input.
      event.preventDefault();
      setVisible(input, input.type === 'password');
    });
  };

  const scan = (container) => {
    if (container.matches?.('input[type="password"]')) enhance(container);
    container.querySelectorAll?.('input[type="password"]').forEach(enhance);
  };

  scan(document);
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === 'childList') record.addedNodes.forEach(scan);
      else if (record.target.hidden || (record.target.matches('details,dialog') && !record.target.open)) hideWithin(record.target);
    });
    controls.forEach((control, input) => { if (!input.isConnected) controls.delete(input); });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'open'] });
  document.addEventListener('reset', (event) => hideWithin(event.target), true);
  document.addEventListener('submit', (event) => hideWithin(event.target), true);
  document.addEventListener('close', (event) => hideWithin(event.target), true);
  window.addEventListener('pagehide', () => hideWithin(document));
  window.addEventListener('pageshow', () => hideWithin(document));
})();
