const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function acknowledgeCompliance(policy = window.SFC_APP_CONFIG?.policy || {}) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'tw-w-[min(520px,calc(100%-24px))] tw-max-h-[90vh] tw-overflow-auto tw-rounded-2xl tw-border tw-border-solid tw-border-line tw-bg-white tw-p-6 tw-text-ink tw-shadow-xl backdrop:tw-bg-ink/40 print:tw-hidden';
    dialog.setAttribute('aria-label', 'Investment Compliance Check');
    dialog.innerHTML = `<h2 class="tw-text-lg">Investment Compliance Check</h2><ul class="tw-my-5 tw-grid tw-list-none tw-gap-3 tw-p-0">${(policy.compliance || []).map(item => `<li class="tw-rounded-lg tw-bg-paper tw-p-3"><strong class="tw-text-xs">${esc(item.title)}</strong><p class="tw-mb-0 tw-mt-1 tw-text-xs">${esc(item.copy)}</p></li>`).join('')}</ul>${policy.ordinance_url ? `<a class="tw-mb-4 tw-inline-block tw-text-[11px] tw-font-semibold tw-text-amber" href="${esc(policy.ordinance_url)}" target="_blank" rel="noopener noreferrer">${esc(policy.ordinance_number)} · source ↗</a>` : ''}<label class="tw-flex tw-items-center tw-gap-3 tw-text-xs"><input type="checkbox" class="tw-h-4 tw-w-4 tw-accent-ink">I understand these requirements</label><div class="tw-mt-5 tw-flex tw-justify-end tw-gap-2"><button data-cancel type="button" class="tw-min-h-11 tw-rounded-lg tw-border tw-border-solid tw-border-line tw-bg-white tw-px-4 tw-text-xs">Cancel</button><button data-confirm type="button" disabled class="tw-min-h-11 tw-rounded-lg tw-border-0 tw-bg-ink tw-px-4 tw-text-xs tw-text-white disabled:tw-opacity-40">Continue to report</button></div>`;
    document.body.append(dialog);
    let accepted = false;
    const checkbox = dialog.querySelector('input');
    const confirm = dialog.querySelector('[data-confirm]');
    checkbox.addEventListener('change', () => confirm.disabled = !checkbox.checked);
    dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
    confirm.addEventListener('click', () => { if (checkbox.checked) { accepted = true; dialog.close(); } });
    dialog.addEventListener('close', () => { dialog.remove(); resolve(accepted); }, {once:true});
    dialog.showModal();
  });
}

let pending = false;
export async function printWithCompliance() {
  if (pending) return;
  pending = true;
  try { if (await acknowledgeCompliance()) window.print(); }
  finally { pending = false; }
}
