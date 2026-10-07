(() => {
  'use strict';

  const input = document.getElementById('profilePhotoInput');
  const dialog = document.getElementById('profilePhotoDialog');
  if (!input || !dialog) return;
  const form = document.getElementById('profileForm');
  form.addEventListener('invalid', (event) => {
    const section = event.target.closest('details');
    if (section) section.open = true;
  }, true);
  if (typeof dialog.showModal !== 'function' || typeof DataTransfer !== 'function') {
    document.getElementById('profilePhotoHint').textContent = 'JPG, PNG or WEBP. Up to 2 MB and 4 megapixels.';
    return;
  }

  const canvas = document.getElementById('profileCropCanvas');
  const preview = document.getElementById('profileCropPreview');
  const context = canvas.getContext('2d');
  const previewContext = preview.getContext('2d');
  if (!context || !previewContext) return;

  const zoomInput = document.getElementById('profileCropZoom');
  const zoomValue = document.getElementById('profileCropZoomValue');
  const applyButton = document.getElementById('profileCropApply');
  const error = document.getElementById('profileCropError');
  const status = document.getElementById('profilePhotoStatus');
  const avatar = document.getElementById('profileAvatarPhoto');
  const initial = document.getElementById('profileAvatarInitial');
  const remove = document.getElementById('profilePhotoRemove');
  const undo = document.getElementById('profilePhotoUndo');
  const originalAvatar = avatar.getAttribute('src') || '';
  let image = null;
  let sourceUrl = null;
  let avatarUrl = null;
  let selectedFile = null;
  let zoom = 1;
  let offsetX = 0;
  let offsetY = 0;
  let pointer = null;
  let applying = false;
  let loading = false;
  let selectionId = 0;

  const restoreFile = () => {
    const transfer = new DataTransfer();
    if (selectedFile) transfer.items.add(selectedFile);
    input.files = transfer.files;
  };

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle('tw-text-[#9E1B22]', isError);
    status.classList.toggle('tw-text-[#2A603B]', !isError);
  };

  const updateAvatar = () => {
    const url = remove?.checked ? '' : (avatarUrl || originalAvatar);
    if (url) avatar.src = url;
    else avatar.removeAttribute('src');
    avatar.hidden = !url;
    initial.hidden = Boolean(url);
  };

  const scale = () => Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * zoom;

  const render = () => {
    if (!image) return;
    const ratio = scale();
    const width = image.naturalWidth * ratio;
    const height = image.naturalHeight * ratio;
    offsetX = Math.max(-(width - canvas.width) / 2, Math.min((width - canvas.width) / 2, offsetX));
    offsetY = Math.max(-(height - canvas.height) / 2, Math.min((height - canvas.height) / 2, offsetY));
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, (canvas.width - width) / 2 + offsetX, (canvas.height - height) / 2 + offsetY, width, height);
    previewContext.clearRect(0, 0, preview.width, preview.height);
    previewContext.drawImage(canvas, 0, 0, preview.width, preview.height);
    zoomValue.value = `${Math.round(zoom * 100)}%`;
  };

  const reset = () => {
    zoom = 1;
    offsetX = 0;
    offsetY = 0;
    zoomInput.value = '1';
    render();
  };

  const releaseSource = () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = null;
    image = null;
    pointer = null;
  };

  const cancel = () => {
    if (applying) return;
    selectionId += 1;
    restoreFile();
    dialog.close();
  };

  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const request = ++selectionId;
    loading = false;
    restoreFile();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatus('Choose a JPG, PNG or WEBP photo.', true);
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setStatus('Choose a photo smaller than 12 MB.', true);
      return;
    }
    setStatus('Opening your photo…');
    loading = true;
    const pendingUrl = URL.createObjectURL(file);
    try {
      const decoded = new Image();
      decoded.src = pendingUrl;
      await decoded.decode();
      if (request !== selectionId) {
        URL.revokeObjectURL(pendingUrl);
        return;
      }
      if (!decoded.naturalWidth || !decoded.naturalHeight || decoded.naturalWidth * decoded.naturalHeight > 40000000) {
        throw new Error('Choose a photo smaller than 40 megapixels.');
      }
      releaseSource();
      image = decoded;
      sourceUrl = pendingUrl;
      error.hidden = true;
      error.textContent = '';
      reset();
      dialog.showModal();
      canvas.focus();
      setStatus(selectedFile ? 'Photo ready. Save your profile to apply it.' : '');
    } catch (exception) {
      URL.revokeObjectURL(pendingUrl);
      if (request === selectionId) setStatus(exception.message.includes('megapixels') ? exception.message : 'That photo could not be opened. Try another image.', true);
    } finally {
      if (request === selectionId) loading = false;
    }
  });

  zoomInput.addEventListener('input', () => {
    const nextZoom = Number(zoomInput.value);
    offsetX *= nextZoom / zoom;
    offsetY *= nextZoom / zoom;
    zoom = nextZoom;
    render();
  });
  document.getElementById('profileCropReset').addEventListener('click', reset);

  canvas.addEventListener('pointerdown', (event) => {
    if (!image || applying || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.replace('tw-cursor-grab', 'tw-cursor-grabbing');
    canvas.focus({ preventScroll: true });
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const rect = canvas.getBoundingClientRect();
    offsetX += (event.clientX - pointer.x) * canvas.width / rect.width;
    offsetY += (event.clientY - pointer.y) * canvas.height / rect.height;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    render();
  });
  const stopDragging = () => {
    pointer = null;
    canvas.classList.replace('tw-cursor-grabbing', 'tw-cursor-grab');
  };
  canvas.addEventListener('pointerup', stopDragging);
  canvas.addEventListener('pointercancel', stopDragging);
  canvas.addEventListener('lostpointercapture', stopDragging);
  canvas.addEventListener('keydown', (event) => {
    if (!image || applying) return;
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (!direction) return;
    const step = event.shiftKey ? 32 : 8;
    offsetX += direction[0] * step;
    offsetY += direction[1] * step;
    render();
    event.preventDefault();
  });

  applyButton.addEventListener('click', async () => {
    if (!image || applying) return;
    applying = true;
    applyButton.disabled = true;
    applyButton.textContent = 'Preparing…';
    zoomInput.disabled = true;
    error.hidden = true;
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('The photo could not be prepared. Try another image.');
      const croppedFile = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg', lastModified: Date.now() });
      const transfer = new DataTransfer();
      transfer.items.add(croppedFile);
      input.files = transfer.files;
      selectedFile = croppedFile;
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
      avatarUrl = URL.createObjectURL(blob);
      if (remove) remove.checked = false;
      updateAvatar();
      undo.hidden = false;
      setStatus('Photo ready. Save your profile to apply it.');
      dialog.close();
    } catch (exception) {
      error.textContent = exception.message;
      error.hidden = false;
    } finally {
      applying = false;
      applyButton.disabled = false;
      applyButton.textContent = 'Use photo';
      zoomInput.disabled = false;
    }
  });

  document.getElementById('profilePhotoClose').addEventListener('click', cancel);
  document.getElementById('profileCropCancel').addEventListener('click', cancel);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    cancel();
  });
  dialog.addEventListener('close', () => {
    releaseSource();
    input.focus({ preventScroll: true });
  });
  remove?.addEventListener('change', () => {
    if (remove.checked) {
      selectedFile = null;
      restoreFile();
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
      avatarUrl = null;
      undo.hidden = false;
      setStatus('Photo will be removed when you save.');
    } else {
      undo.hidden = true;
      setStatus('');
    }
    updateAvatar();
  });
  undo.addEventListener('click', () => {
    selectedFile = null;
    restoreFile();
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    avatarUrl = null;
    if (remove) remove.checked = false;
    undo.hidden = true;
    setStatus('');
    updateAvatar();
  });
  form.addEventListener('submit', (event) => {
    if (dialog.open || loading) {
      event.preventDefault();
      setStatus('Finish adjusting your photo before saving.', true);
      canvas.focus();
    }
  });
  if (remove?.checked) {
    updateAvatar();
    undo.hidden = false;
    setStatus('Photo will be removed when you save.');
  }
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    releaseSource();
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
  });
})();
