// City staff directory and explicit broker review authorization.
document.addEventListener('DOMContentLoaded', () => {
  const config = window.SFC_APP_CONFIG || {};
  const status = document.getElementById('cityStaffStatus');
  const form = document.getElementById('cityStaffForm');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mayReview = department => ['ASSESSOR', 'CAO', 'LEBDO'].includes(String(department).toUpperCase());
  const displayStatus = (message, error = false) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', error);
    status.classList.toggle('is-success', !error);
  };
  const request = async (method, body) => {
    const multipart = body instanceof FormData;
    const response = await fetch(`${String(config.apiBase || 'api').replace(/\/$/, '')}/staff.php`, {
      method, credentials: 'same-origin',
      headers: { 'X-CSRF-Token': config.csrfToken || '', ...(multipart ? {} : { 'Content-Type': 'application/json' }) },
      body: multipart ? body : JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to update the city account.');
    return payload;
  };
  const filterButtons = document.querySelectorAll('.city-staff-filter-btn[data-filter]');
  filterButtons.forEach(button => button.addEventListener('click', () => {
    filterButtons.forEach(item => item.classList.toggle('is-active', item === button));
    const filter = (button.dataset.filter || 'all').toLowerCase();
    document.querySelectorAll('#cityStaffList tr').forEach(row => {
      row.hidden = filter !== 'all' && !row.querySelector(`.city-pill.${filter}`);
    });
  }));
  const cards = [...document.querySelectorAll('.city-dept-radio-card')];
  const reviewer = document.getElementById('staffBrokerReviewer');
  const syncDepartment = () => {
    const department = form?.querySelector('[name="department"]:checked')?.value;
    cards.forEach(card => card.classList.toggle('is-selected', card.querySelector('input')?.checked));
    if (reviewer) {
      reviewer.disabled = !mayReview(department);
      if (reviewer.disabled) reviewer.checked = false;
    }
  };
  form?.addEventListener('change', event => { if (event.target.name === 'department') syncDepartment(); });
  syncDepartment();
  document.getElementById('cityStaffList')?.addEventListener('change', async event => {
    const checkbox = event.target.closest('[data-broker-review-permission]');
    if (!checkbox) return;
    const requested = checkbox.checked;
    checkbox.disabled = true;
    displayStatus('Saving broker review authorization…');
    try {
      const payload = await request('PATCH', { userId: Number(checkbox.dataset.brokerReviewPermission), brokerReviewAuthorized: requested });
      const saved = payload.user?.brokerReviewAuthorized;
      if (typeof saved === 'boolean') checkbox.checked = saved;
      displayStatus(`Broker review authorization ${checkbox.checked ? 'granted' : 'revoked'}.`);
    } catch (error) { checkbox.checked = !requested; displayStatus(error.message, true); }
    finally { checkbox.disabled = false; }
  });
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    displayStatus('Creating department account…');
    try {
      const payload = await request('POST', new FormData(form));
      const staff = payload.user;
      const department = String(staff.department || 'CICTO').toUpperCase();
      form.reset();
      syncDepartment();
      displayStatus(`${department} account created for ${staff.name}.`);
      const list = document.getElementById('cityStaffList');
      if (list) {
        const row = document.createElement('tr');
        const initials = String(staff.name || '').trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0] || '').join('').toUpperCase() || 'ST';
        const role = department === 'ASSESSOR' || department === 'CAO' ? 'City Assessor’s Office' : department === 'LEBDO' ? 'Local Economic Development' : 'Technical administration';
        row.innerHTML = `<td><div class="city-staff-user-cell"><span class="city-staff-avatar ${escape(department.toLowerCase())}">${escape(initials)}</span><div class="city-staff-user-meta"><strong>${escape(staff.name)}</strong><small>${escape(role)}</small></div></div></td><td><span class="city-pill ${escape(department.toLowerCase())}">${escape(department)}</span></td><td><span class="city-staff-email">${escape(staff.email)}</span></td><td><span class="city-pill approved">Active</span></td><td>${mayReview(department) ? `<label class="broker-staff-permission"><input type="checkbox" data-broker-review-permission="${Number(staff.id)}" ${staff.brokerReviewAuthorized ? 'checked' : ''} aria-label="Authorize ${escape(staff.name)} to review broker applications"><span>Authorized reviewer</span></label>` : '<span>Technical administration</span>'}</td>`;
        list.prepend(row);
        document.querySelector('.city-staff-filter-btn[data-filter].is-active')?.click();
      }
    } catch (error) { displayStatus(error.message, true); }
    finally { button.disabled = false; }
  });
});