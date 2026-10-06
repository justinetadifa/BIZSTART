(() => {
  const button = document.getElementById('cityUpdatesButton');
  const dialog = document.getElementById('cityUpdatesDialog');
  if (!button || !dialog) return;
  const config = window.SFC_APP_CONFIG || {};
  const list = document.getElementById('cityUpdatesList');
  const count = document.getElementById('cityUpdatesCount');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  let notifications = [];
  async function request(body) {
    const response = await fetch(`${config.apiBase}/notifications.php?limit=30`, {
      credentials: 'same-origin',
      ...(body ? { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': config.csrfToken }, body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Updates unavailable.');
    count.textContent = payload.unreadCount > 99 ? '99+' : String(payload.unreadCount || 0);
    count.hidden = !payload.unreadCount;
    button.setAttribute('aria-label', `Updates${payload.unreadCount ? `, ${payload.unreadCount} unread` : ''}`);
    return payload;
  }
  function destination(item) {
    // Existing notifications retain their data while opening current workspaces.
    const propertyId = Number(item.propertyId);
    const workflow = ['new_inquiry', 'investor_followup', 'seller_reply'].includes(item.kind) ? 'messages'
      : ['due_diligence_request', 'due_diligence_status'].includes(item.kind) || (item.kind === 'site_visit_reminder' && item.documentRequestId) ? 'documents'
      : ['site_visit_reminder', 'site_visit_proposed', 'site_visit_counter', 'site_visit_confirmed', 'site_visit_completed', 'field_audit_submitted'].includes(item.kind) ? 'visits' : null;
    let route = item.actionUrl;
    if (workflow && propertyId > 0) {
      if (config.role === 'seller') {
        const query = new URLSearchParams({ propertyId });
        if (workflow === 'documents' && item.documentRequestId) query.set('documentRequestId', item.documentRequestId);
        else if (item.threadId) query.set('threadId', item.threadId);
        route = `/seller-dashboard.php?${query}#${workflow === 'documents' ? 'brokerDocumentsDetails' : 'brokerMessagesDetails'}`;
      } else if (config.role === 'investor') {
        route = `/property-details.php?id=${propertyId}#${workflow === 'documents' ? 'cityDocumentsPanel' : workflow === 'visits' ? 'cityVisitPanel' : 'cityInquiryPanel'}`;
      } else if (config.role === 'admin') {
        route = workflow === 'documents' ? `/admin-properties.php?documentRequestId=${Number(item.documentRequestId) || 0}&propertyId=${propertyId}#cityDocumentRequests` : `/admin-properties.php?edit=${propertyId}`;
      }
    }
    if (!route || !/^\/(?!\/)/.test(route)) return null;
    return `${config.basePath || ''}${route}`;
  }
  function render() {
    list.innerHTML = notifications.length ? notifications.map(item => {
      const href = destination(item);
      return `<article class="city-update${item.isRead ? '' : ' is-unread'}"><strong>${escape(item.title)}</strong><p>${escape(item.body)}</p>${href ? `<a class="city-link" href="${escape(href)}" data-update-id="${Number(item.id)}">${escape(item.actionLabel || 'View')}</a>` : ''}</article>`;
    }).join('') : '<p>No updates yet.</p>';
  }
  async function load() {
    try { const payload = await request(); notifications = payload.notifications || []; render(); }
    catch (error) { list.textContent = error.message; }
  }
  button.addEventListener('click', () => { dialog.showModal(); load(); });
  document.getElementById('cityUpdatesClose').addEventListener('click', () => dialog.close());
  document.getElementById('cityUpdatesRead').addEventListener('click', async event => {
    event.target.disabled = true;
    try { await request({ action: 'markAllRead' }); notifications.forEach(item => item.isRead = true); render(); }
    catch (error) { list.textContent = error.message; }
    finally { event.target.disabled = false; }
  });
  list.addEventListener('click', async event => {
    const link = event.target.closest('[data-update-id]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    try { await request({ action: 'markRead', notificationId: Number(link.dataset.updateId) }); }
    catch { /* Opening a workflow remains available if marking read fails. */ }
    dialog.close();
    location.href = link.href;
  });
  load();
})();
