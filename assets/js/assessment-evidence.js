const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function assessmentEvidenceMarkup(property, {open = false} = {}) {
  if (property.assessmentMode !== 'automatic') {
    const hasScores = Object.values(property.assessmentCriteria || {}).some(value => value != null);
    return hasScores ? '<p class="tw-text-[11px] tw-leading-relaxed tw-text-muted">Earlier departmental assessment · manually entered. These recorded scores are retained in the listing history.</p>' : '';
  }
  const details = Object.values(property.criteriaDetails || {});
  return `<details ${open ? 'open' : ''} class="tw-mt-4 tw-text-xs"><summary class="tw-cursor-pointer tw-font-semibold">System-generated assessment · source evidence</summary><div class="tw-mt-3 tw-grid tw-gap-3">${details.map(detail => `<article class="tw-min-w-0 tw-rounded-lg tw-bg-paper tw-p-3 print:tw-break-inside-avoid"><div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2"><strong class="tw-text-xs">${escape(detail.label)}</strong><span class="tw-text-[10px] tw-text-muted">${detail.score == null ? 'Awaiting source data' : `${Number(detail.score).toFixed(1)} / 100`} · ${escape(detail.weight)}% weight</span></div><p class="tw-mb-0 tw-mt-2 tw-break-words tw-text-[11px] tw-italic tw-leading-relaxed tw-text-muted">${escape(detail.justification)}</p>${detail.evidence?.length ? `<p class="tw-mb-0 tw-mt-2 tw-break-words tw-text-[10px] tw-leading-relaxed tw-text-muted">${escape(detail.evidence.map(item => [item.source, item.version, item.reference].filter(Boolean).join(' · ')).join('; '))}</p>` : ''}</article>`).join('')}</div></details>`;
}
