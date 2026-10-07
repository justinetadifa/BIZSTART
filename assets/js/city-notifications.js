(() => {
  const button = document.getElementById('cityUpdatesButton');
  const dialog = document.getElementById('cityUpdatesDialog');
  if (!button || !dialog) return;

  const config = window.SFC_APP_CONFIG || {};
  const list = document.getElementById('cityUpdatesList');
  const count = document.getElementById('cityUpdatesCount');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

  let notifications = [];

  function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const trimmed = String(dateString).trim();
    const isoStr = trimmed.replace(' ', 'T') + (trimmed.includes('Z') || trimmed.includes('+') ? '' : 'Z');
    let date = new Date(isoStr);
    if (isNaN(date.getTime())) {
      date = new Date(trimmed.replace(' ', 'T'));
    }
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `${diffDay}d ago`;
    const diffMo = Math.floor(diffDay / 30);
    if (diffMo < 12) return `${diffMo}mo ago`;
    return `${Math.floor(diffMo / 12)}y ago`;
  }

  function getNotificationVisuals(item) {
    const kind = String(item.kind || '').toLowerCase();
    const icon = String(item.icon || '').toLowerCase();
    const title = String(item.title || '').toLowerCase();
    const tone = String(item.tone || '').toLowerCase();

    // 1. Clock / Time / Listing awaiting review
    if (kind === 'listing_submitted' || title.includes('awaiting review') || title.includes('pending') || icon === 'time' || icon === 'clock') {
      return {
        theme: 'blue',
        iconBoxClass: 'city-update-icon-blue',
        dotClass: 'city-update-dot-blue',
        buttonClass: 'city-update-btn-navy',
        defaultAction: 'Review',
        iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
      };
    }

    // 2. Market Heat / Analytics / Trend / Bar Chart
    if (kind === 'market_heat' || icon === 'trend' || icon === 'pulse' || title.includes('market heat') || tone === 'trend') {
      return {
        theme: 'rose',
        iconBoxClass: 'city-update-icon-rose',
        dotClass: 'city-update-dot-red',
        buttonClass: 'city-update-btn-burgundy',
        defaultAction: 'Open voting',
        iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`
      };
    }

    // 3. Document / Broker application / Registration / Due Diligence / File
    if (kind === 'seller_application' || kind === 'broker_application' || title.includes('broker') || title.includes('application') || icon === 'file' || kind === 'due_diligence_request') {
      return {
        theme: 'red',
        iconBoxClass: 'city-update-icon-red',
        dotClass: 'city-update-dot-red',
        buttonClass: 'city-update-btn-burgundy',
        defaultAction: 'View details',
        iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
      };
    }

    // 4. Messages / Inquiries / Chat
    if (kind === 'new_inquiry' || kind === 'seller_reply' || kind === 'investor_followup' || icon === 'chat') {
      return {
        theme: 'blue',
        iconBoxClass: 'city-update-icon-blue',
        dotClass: 'city-update-dot-blue',
        buttonClass: 'city-update-btn-burgundy',
        defaultAction: 'View inquiry',
        iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`
      };
    }

    // 5. Site visit / Location
    if (kind.includes('site_visit') || icon === 'site') {
      return {
        theme: 'blue',
        iconBoxClass: 'city-update-icon-blue',
        dotClass: 'city-update-dot-blue',
        buttonClass: 'city-update-btn-navy',
        defaultAction: 'Review checklist',
        iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`
      };
    }

    // 6. Default / Fallback
    return {
      theme: 'red',
      iconBoxClass: 'city-update-icon-red',
      dotClass: 'city-update-dot-red',
      buttonClass: 'city-update-btn-burgundy',
      defaultAction: 'View details',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
    };
  }

  function getActionLabel(item, defaultLabel) {
    const raw = String(item.actionLabel || '').trim();
    if (!raw) return defaultLabel || 'View details';
    const lower = raw.toLowerCase();
    if (lower === 'review seller' || lower === 'view') return 'View details';
    if (lower === 'open voting') return 'Open voting';
    if (lower === 'review') return 'Review';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

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
    if (!route) return null;
    if (!route.startsWith('/') && !/^https?:\/\//i.test(route)) {
      route = '/' + route;
    }
    if (!/^\/(?!\/)/.test(route)) return null;
    return `${config.basePath || ''}${route}`;
  }

  function render() {
    if (!notifications.length) {
      list.innerHTML = `
        <div class="city-updates-empty">
          <div class="city-updates-empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <h4>All caught up!</h4>
          <p>No new updates or alerts right now.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = notifications.map(item => {
      const visuals = getNotificationVisuals(item);
      const actionText = getActionLabel(item, visuals.defaultAction);
      const href = destination(item);
      const relativeTime = formatRelativeTime(item.createdAt) || 'Recent';

      return `
        <article class="city-update-card${item.isRead ? ' is-read' : ' is-unread'}">
          <div class="city-update-icon-box ${visuals.iconBoxClass}">
            ${visuals.iconSvg}
          </div>
          <div class="city-update-content">
            <div class="city-update-header">
              <div class="city-update-title-wrap">
                ${!item.isRead ? `<span class="city-update-dot ${visuals.dotClass}"></span>` : ''}
                <h3 class="city-update-title">${escape(item.title)}</h3>
              </div>
              <time class="city-update-time" datetime="${escape(item.createdAt)}">${escape(relativeTime)}</time>
            </div>
            <p class="city-update-body">${escape(item.body)}</p>
            ${href ? `
              <a class="city-update-action-btn ${visuals.buttonClass}" href="${escape(href)}" data-update-id="${Number(item.id)}">
                <span>${escape(actionText)}</span>
                <span class="city-update-arrow" aria-hidden="true">&rarr;</span>
              </a>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');
  }

  async function load() {
    list.innerHTML = `
      <div class="city-updates-loading">
        <div class="city-updates-spinner"></div>
        <span>Checking updates...</span>
      </div>
    `;
    try {
      const payload = await request();
      notifications = payload.notifications || [];
      render();
    } catch (error) {
      list.innerHTML = `<div class="city-error" style="padding:14px;border-radius:10px;font-size:13px;">${escape(error.message)}</div>`;
    }
  }

  button.addEventListener('click', () => {
    dialog.showModal();
    load();
  });

  const closeButton = document.getElementById('cityUpdatesClose');
  if (closeButton) {
    closeButton.addEventListener('click', () => dialog.close());
  }

  // Allow clicking on backdrop to close dialog
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  const readButton = document.getElementById('cityUpdatesRead');
  if (readButton) {
    readButton.addEventListener('click', async event => {
      readButton.disabled = true;
      try {
        await request({ action: 'markAllRead' });
        notifications.forEach(item => item.isRead = true);
        render();
      } catch (error) {
        list.innerHTML = `<div class="city-error" style="padding:14px;border-radius:10px;font-size:13px;">${escape(error.message)}</div>`;
      } finally {
        readButton.disabled = false;
      }
    });
  }

  list.addEventListener('click', async event => {
    const link = event.target.closest('[data-update-id]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    try {
      await request({ action: 'markRead', notificationId: Number(link.dataset.updateId) });
    } catch {
      /* Opening a workflow remains available if marking read fails. */
    }
    dialog.close();
    location.href = link.href;
  });

  load();
})();
