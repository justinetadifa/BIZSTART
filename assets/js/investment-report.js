import { policyScore, priorityActivity, potentialIncentive } from './investment-policy.js';

const config = window.SFC_APP_CONFIG || {};
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number = value => new Intl.NumberFormat('en-PH', {maximumFractionDigits:1}).format(value);
const root = document.getElementById('investmentReportRoot');
const print = document.getElementById('printDecisionReport');
print.disabled = true;
async function render() {
  const id = Number(new URLSearchParams(location.search).get('investment'));
  let draft;
  try { draft = JSON.parse(sessionStorage.getItem(`locus.investment-report:${config.basePath || ''}:${config.user?.id || 'guest'}`) || 'null'); } catch {}
  if (!draft || draft.propertyId !== id || !draft.complianceAcknowledged) throw new Error('Choose a property, run its investment evaluation and review compliance to prepare a report.');
  const response = await fetch(`${config.apiBase}/property.php?id=${id}`, {credentials:'same-origin',headers:{Accept:'application/json'}});
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Property is unavailable.');
  const property = payload.property;
  const policy = config.policy || {};
  const activity = (policy.business_types || []).find(item => item.label === draft.businessType);
  if (!activity || !Number.isFinite(draft.capitalization) || draft.capitalization < 0 || !property.assessmentComplete) throw new Error('A complete city assessment and valid investment inputs are required. Revisit the property to update this report.');
  // Recompute from current authorized property data and current policy; never trust stored scores.
  const score = policyScore(property.iaiScore, priorityActivity(policy, activity.id), policy);
  const incentive = potentialIncentive(draft.capitalization, policy);
  root.innerHTML = `<article class="tw-rounded-xl tw-border tw-border-solid tw-border-line tw-bg-white tw-p-5 sm:tw-p-8 print:tw-border-0 print:tw-p-0"><div class="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3"><div><span class="tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-widest tw-text-amber">Investment evaluation</span><h2 class="tw-mb-1 tw-mt-2 tw-text-2xl">${esc(property.name)}</h2><p class="tw-text-xs">${esc(property.barangay || property.city)}</p></div><span class="tw-text-[11px] tw-text-muted">${new Date().toLocaleDateString('en-PH', {timeZone:'Asia/Manila',dateStyle:'medium'})}</span></div><dl class="tw-mb-6 tw-grid tw-gap-4 sm:tw-grid-cols-2"><div><dt class="tw-text-[10px] tw-text-muted">Proposed business</dt><dd class="tw-m-0 tw-mt-1 tw-text-sm tw-font-semibold">${esc(activity.label)}</dd></div><div><dt class="tw-text-[10px] tw-text-muted">Proposed capitalization</dt><dd class="tw-m-0 tw-mt-1 tw-text-sm tw-font-semibold">₱${number(draft.capitalization)}</dd></div></dl><div class="tw-grid tw-gap-2 sm:tw-grid-cols-3"><div class="tw-rounded-lg tw-bg-paper tw-p-4"><span class="tw-block tw-text-[10px] tw-text-muted">Base IAI</span><strong class="tw-text-2xl">${number(score.base)}</strong></div><div class="tw-rounded-lg tw-bg-amber-50 tw-p-4"><span class="tw-block tw-text-[10px] tw-text-muted">Policy Priority Adjustment</span><strong class="tw-text-2xl">+${number(score.percent)}%</strong><span class="tw-block tw-text-[10px]">+${number(score.applied)} pts applied</span></div><div class="tw-rounded-lg tw-bg-ink tw-p-4 tw-text-white"><span class="tw-block tw-text-[10px] tw-text-white/70">Final IAI</span><strong class="tw-text-2xl">${number(score.final)}</strong><span class="tw-text-xs"> / 100</span></div></div><p class="tw-mt-3 tw-text-xs">MCE: ${number(property.mceScore)} / 100. ${score.percent ? 'The policy adjustment is a separate approved modifier, capped at 100.' : 'No policy score modifier is applied.'}</p><details open class="tw-mt-5"><summary class="tw-text-xs tw-font-semibold">Assessment method</summary><p class="tw-mt-2 tw-text-xs">${esc(property.assessmentMethod)}</p></details><div class="tw-mt-5 tw-border-t tw-border-solid tw-border-line tw-pt-5"><h3 class="tw-text-sm">Priority Investment Alignment</h3><p class="tw-text-xs">${activity.sector ? esc(activity.sector) : 'No priority sector mapped for this activity.'}</p><h3 class="tw-text-sm">Potential incentive · ${esc(incentive.badge)}</h3><p class="tw-text-xs">${esc(incentive.copy)}</p><p class="tw-text-[11px]">For new, expanding or modernizing city projects. The specific activity and capitalization basis require LGU review. (§19)</p>${policy.ordinance_url ? `<a class="tw-text-[11px] tw-font-semibold tw-text-amber" href="${esc(policy.ordinance_url)}" target="_blank" rel="noopener noreferrer">${esc(policy.ordinance_number)} · source ↗</a>` : ''}</div><div class="tw-mt-5 tw-border-t tw-border-solid tw-border-line tw-pt-5"><h3 class="tw-text-sm">Compliance requirements acknowledged</h3><ul class="tw-grid tw-list-none tw-gap-2 tw-p-0">${(policy.compliance || []).map(item=>`<li class="tw-text-xs"><strong>${esc(item.title)}</strong> · ${esc(item.copy)}</li>`).join('')}</ul><p class="tw-mb-0 tw-text-[11px]">Acknowledgment records understanding and does not certify eligibility or zoning approval.</p></div></article>`;
  print.disabled = false;
  // Compliance was reviewed before this draft was generated; no extra step on export.
  print.addEventListener('click', () => window.print());
}
render().catch(error => { root.innerHTML = `<p role="alert" class="tw-rounded-xl tw-border tw-border-solid tw-border-line tw-bg-white tw-p-5 tw-text-sm">${esc(error.message)} <a class="tw-font-semibold tw-text-amber" href="${config.basePath || ''}/property-explorer.php">Choose a site ↗</a></p>`; });
