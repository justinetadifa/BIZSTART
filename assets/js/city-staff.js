// City Staff Directory, Filtering & Provisioning Controller
document.addEventListener('DOMContentLoaded', () => {
  // Department filter buttons
  const filterButtons = document.querySelectorAll('.city-staff-filter-btn');
  const tableRows = document.querySelectorAll('#cityStaffList tr');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const deptFilter = (btn.dataset.filter || 'all').toLowerCase();

      document.querySelectorAll('#cityStaffList tr').forEach(row => {
        if (deptFilter === 'all') {
          row.style.display = '';
        } else {
          const pill = row.querySelector('.city-pill');
          if (pill && pill.classList.contains(deptFilter)) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        }
      });
    });
  });

  // Department selector card toggle in provisioning form
  const deptRadioCards = document.querySelectorAll('.city-dept-radio-card');
  deptRadioCards.forEach(card => {
    card.addEventListener('click', () => {
      deptRadioCards.forEach(c => c.classList.remove('is-selected'));
      card.classList.add('is-selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // Provisioning form submit
  const form = document.getElementById('cityStaffForm');
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const config = window.SFC_APP_CONFIG;
    const status = document.getElementById('cityStaffStatus');
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = 'Provisioning department account…';
    status.classList.remove('is-error', 'is-success');

    try {
      const response = await fetch(`${config.apiBase}/staff.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': config.csrfToken },
        body: new FormData(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to create account.');

      form.reset();
      // Reset radio card selection to default
      deptRadioCards.forEach((c, idx) => {
        if (idx === 0) {
          c.classList.add('is-selected');
          const r = c.querySelector('input[type="radio"]');
          if (r) r.checked = true;
        } else {
          c.classList.remove('is-selected');
        }
      });

      status.textContent = `✓ ${payload.user.department} account successfully provisioned for ${payload.user.name}.`;
      status.classList.add('is-success');

      // Update stat count
      const deptLower = String(payload.user.department || '').toLowerCase();
      const countEl = document.querySelector(`.city-staff-stat-card.${deptLower} .stat-count`);
      if (countEl) {
        countEl.textContent = `${parseInt(countEl.textContent || '0', 10) + 1} Active Personnel`;
      }

      // Prepend to table
      const list = document.getElementById('cityStaffList');
      if (list && payload.user) {
        const tr = document.createElement('tr');
        const safeName = String(payload.user.name || '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const dept = String(payload.user.department || 'CICTO');
        tr.innerHTML = `<td><strong>${safeName}</strong></td><td><span class="city-pill ${dept.toLowerCase()}">${dept}</span></td><td>${String(payload.user.email || '')}</td><td><span class="city-pill approved">Active</span></td>`;
        list.prepend(tr);
      }
    } catch (error) {
      status.textContent = error.message;
      status.classList.add('is-error');
    } finally {
      button.disabled = false;
    }
  });
});
