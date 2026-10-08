(() => {
  'use strict';
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  document.querySelectorAll('[data-broker-id-upload]').forEach(container => {
    const input = container.querySelector('input[type="file"]');
    const preview = container.querySelector('[data-broker-id-preview]');
    const status = container.querySelector('[data-broker-id-status]');
    const undo = container.querySelector('[data-broker-id-undo]');
    const error = document.getElementById(`${input.id}-error`);
    let objectUrl = '';
    let loadingImage = false;
    const clearObject = () => { if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = ''; };
    const report = message => {
      input.dataset.previewError = message;
      input.setCustomValidity(message);
      input.setAttribute('aria-invalid', String(Boolean(message)));
      if (error) { error.textContent = message; error.hidden = !message; }
    };
    const restorePreview = () => {
      clearObject();
      preview.onload = null;
      preview.onerror = null;
      const source = preview.dataset.existingSrc;
      if (source) preview.src = source; else preview.removeAttribute('src');
      preview.hidden = !source;
      undo.hidden = true;
      loadingImage = false;
    };
    input.addEventListener('change', () => {
      restorePreview();
      const file = input.files[0];
      if (!file) { report(''); status.textContent = input.dataset.existingDocument === 'true' ? 'Current image saved.' : 'Choose an image to preview it.'; return; }
      undo.hidden = false;
      if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0) {
        report('Choose a JPEG, PNG or WebP image up to 5 MB.');
        status.textContent = '';
        return;
      }
      report('Wait for the image preview, then submit again.');
      objectUrl = URL.createObjectURL(file);
      loadingImage = true;
      preview.onload = () => {
        loadingImage = false;
        preview.onload = null;
        preview.onerror = null;
        report('');
        status.textContent = `${file.name} selected. This image replaces the current image when saved.`;
      };
      preview.onerror = () => {
        preview.onload = null;
        preview.onerror = null;
        restorePreview();
        undo.hidden = false;
        report('This image could not be opened. Choose another JPEG, PNG or WebP image.');
        status.textContent = '';
      };
      preview.src = objectUrl;
      preview.hidden = false;
      undo.hidden = false;
    });
    undo.addEventListener('click', () => {
      input.value = '';
      restorePreview();
      report('');
      status.textContent = input.dataset.existingDocument === 'true' ? 'Current image retained.' : 'Choose an image to preview it.';
      input.focus();
    });
    input.form?.addEventListener('submit', event => {
      const submittingApplication = event.submitter?.value === 'submit_prc' || input.form.elements.mode?.value === 'signup';
      const missing = !input.files.length && input.dataset.existingDocument !== 'true';
      if (missing) report(submittingApplication ? 'Upload this side of your PRC ID before submitting your application.' : '');
      if (loadingImage) report('Wait for the image preview, then submit again.');
      if (!input.validity.valid) { event.preventDefault(); input.focus(); input.reportValidity(); }
    });
  });
  const statusCopy = {
    sent: 'Verification email sent. Check your inbox and spam folder.',
    pending: 'Verification email queued for delivery. Delivery has not yet been confirmed.',
    queued: 'Verification email queued for delivery. Delivery has not yet been confirmed.',
    sending: 'Email delivery is in progress and has not yet been confirmed.',
    failed: 'Verification email delivery failed. Try again later or contact support.',
    unconfigured: 'Email delivery is unavailable because the mail service is not configured. Contact support.',
    enqueue_failed: 'Your application is saved. Email delivery tracking is temporarily unavailable; contact support.',
    verified: 'Your email is already verified.'
  };
  const describeDelivery = payload => {
    const delivery = payload.delivery || payload.notification || {};
    const deliveryStatus = delivery.status || payload.deliveryStatus || payload.status;
    if (payload.verified) return statusCopy.verified;
    if (payload.message) return payload.message;
    if (delivery.kind && !['verification', 'application_received'].includes(delivery.kind)) {
      return ({ sent: 'Application notification sent. Verify your email separately to enable broker privileges.', pending: 'Application notification queued; delivery has not yet been confirmed.', sending: statusCopy.sending, failed: 'Application notification delivery failed. Your application decision remains saved.', unconfigured: statusCopy.unconfigured })[deliveryStatus] || 'Application notification delivery has not been confirmed.';
    }
    return statusCopy[deliveryStatus] || (payload.mailConfigured === false ? statusCopy.unconfigured : 'No verification email delivery has been recorded.');
  };
  const deliveryNode = document.querySelector('[data-email-delivery-status]');
  if (deliveryNode) {
    const config = window.SFC_APP_CONFIG || {};
    fetch(`${String(config.apiBase || 'api').replace(/\/$/, '')}/email-verification.php`, { credentials: 'same-origin' }).then(async response => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to check email delivery status.');
      deliveryNode.textContent = describeDelivery(payload);
    }).catch(error => { deliveryNode.textContent = error.message || 'Unable to check email delivery status.'; });
  }
  document.querySelectorAll('[data-resend-verification]').forEach(button => {
    button.addEventListener('click', async () => {
      const status = document.querySelector('[data-email-delivery-status]');
      const config = window.SFC_APP_CONFIG || {};
      button.disabled = true;
      status.textContent = 'Requesting verification email…';
      try {
        const response = await fetch(`${String(config.apiBase || 'api').replace(/\/$/, '')}/email-verification.php`, {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': config.csrfToken || '' },
          body: JSON.stringify({ action: 'resend' })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to request a verification email.');
        status.textContent = describeDelivery(payload);
      } catch (error) { status.textContent = error.message || 'Unable to request a verification email.'; }
      finally { button.disabled = false; }
    });
  });
})();
