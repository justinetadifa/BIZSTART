import { policyScore, potentialIncentive, priorityActivity } from './investment-policy.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const field = 'tw-mt-2 tw-block tw-w-full tw-rounded-lg tw-border tw-border-solid tw-border-line tw-bg-white tw-px-3 tw-py-3 tw-text-sm';
const button = 'tw-min-h-11 tw-rounded-lg tw-border-0 tw-bg-ink tw-px-5 tw-py-3 tw-text-xs tw-font-semibold tw-text-white disabled:tw-opacity-40';
const displayScore = value => value == null ? '—' : Number(value).toFixed(1);

export function evaluationMarkup(property, policy) {
  return `<section id="investmentEvaluationSection" class="tw-mb-5 tw-rounded-xl tw-border tw-border-solid tw-border-line tw-bg-white tw-p-5 sm:tw-p-7" aria-labelledby="evaluationTitle">
    <span class="tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-widest tw-text-amber">Your investment</span><h2 id="evaluationTitle" class="tw-mb-5 tw-mt-2 tw-text-xl">A clearer view of this site.</h2>
    <form id="investmentEvaluationForm"><div class="tw-grid tw-gap-4 sm:tw-grid-cols-2"><label class="tw-text-xs tw-font-semibold" for="evalBusinessType">Proposed Business Type<select id="evalBusinessType" class="${field}" required><option value="">Choose an activity</option>${(policy.business_types || []).map(activity => `<option value="${esc(activity.id)}">${esc(activity.label)}</option>`).join('')}</select></label><label class="tw-text-xs tw-font-semibold" for="evalCapital">Proposed Capitalization (PHP)<input id="evalCapital" class="${field}" type="number" inputmode="decimal" min="0" max="100000000000000" step="0.01" placeholder="e.g. 3,000,000" required></label></div>
    <div id="evalAlignmentCallout" class="tw-mt-4 tw-rounded-lg tw-bg-paper tw-p-3 tw-text-xs" aria-live="polite">Choose an activity to check its priority sector alignment.</div>
    <div class="tw-mt-4 tw-rounded-lg tw-border tw-border-solid tw-border-line tw-p-4"><span class="tw-block tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-muted">Potential incentive</span><span id="evalIncentiveBadge" class="tw-mt-2 tw-inline-block tw-rounded-md tw-bg-paper tw-px-2 tw-py-1 tw-text-xs tw-font-semibold">Enter capitalization</span><p id="evalIncentiveCopy" class="tw-mb-0 tw-mt-2 tw-text-xs" aria-live="polite">See the potential incentive for your proposed investment.</p><p class="tw-mb-0 tw-mt-2 tw-text-[10px]">For new, expanding or modernizing city projects. The specific activity and capitalization basis require LGU review. (§19)</p>${policy.ordinance_url ? `<a class="tw-mt-2 tw-inline-block tw-text-[10px] tw-font-semibold tw-text-amber" href="${esc(policy.ordinance_url)}" target="_blank" rel="noopener noreferrer">Read ${esc(policy.ordinance_number)} ↗</a>` : ''}</div>
    <div class="tw-mt-5 tw-flex tw-flex-wrap tw-items-center tw-gap-3"><button id="evalRunMceBtn" class="${button}" type="submit">Run MCE evaluation</button><span class="tw-text-[11px] tw-text-muted">Uses the city’s completed site assessment.</span></div></form>
    <div id="evalResult" class="tw-mt-5" hidden><div class="tw-grid tw-gap-2 sm:tw-grid-cols-3"><div class="tw-rounded-lg tw-bg-paper tw-p-3"><span class="tw-block tw-text-[10px] tw-text-muted">Base IAI</span><strong id="evalBaseIaiVal" class="tw-text-xl tw-tabular-nums"></strong></div><div class="tw-rounded-lg tw-bg-amber-50 tw-p-3"><span class="tw-block tw-text-[10px] tw-text-muted">Policy Priority Adjustment</span><strong id="evalAdjVal" class="tw-text-xl tw-tabular-nums"></strong><span id="evalAdjPts" class="tw-block tw-text-[10px]"></span></div><div class="tw-rounded-lg tw-bg-ink tw-p-3 tw-text-white"><span class="tw-block tw-text-[10px] tw-text-white/70">Final IAI</span><strong id="evalFinalIaiVal" class="tw-text-xl tw-tabular-nums"></strong></div></div><p id="evalRationaleText" class="tw-mb-0 tw-mt-3 tw-text-xs" aria-live="polite"></p><button id="evalGenerateReportBtn" class="${button} tw-mt-4" type="button">Generate report ↗</button></div>
    <dialog id="evalComplianceModal" class="tw-w-[min(520px,calc(100%-24px))] tw-max-h-[90vh] tw-overflow-auto tw-rounded-2xl tw-border tw-border-solid tw-border-line tw-bg-white tw-p-6 tw-text-ink tw-shadow-xl backdrop:tw-bg-ink/40" aria-labelledby="complianceTitle"><form method="dialog"><div class="tw-flex tw-items-center tw-justify-between tw-gap-3"><h2 id="complianceTitle" class="tw-m-0 tw-text-lg">Investment Compliance Check</h2><button class="tw-h-9 tw-w-9 tw-rounded-full tw-border tw-border-solid tw-border-line tw-bg-white" aria-label="Close compliance check">×</button></div></form><ul class="tw-my-5 tw-grid tw-list-none tw-gap-3 tw-p-0">${(policy.compliance || []).map(row => `<li class="tw-rounded-lg tw-bg-paper tw-p-3"><strong class="tw-block tw-text-xs">${esc(row.title)}</strong><p class="tw-mb-0 tw-mt-1 tw-text-xs">${esc(row.copy)}</p></li>`).join('')}</ul>${policy.ordinance_url ? `<a class="tw-text-[11px] tw-font-semibold tw-text-amber" href="${esc(policy.ordinance_url)}" target="_blank" rel="noopener noreferrer">${esc(policy.ordinance_number)} · source ↗</a>` : ''}<p class="tw-text-[11px]">Review applicable requirements with the LGU. Acknowledgment records understanding; it does not certify compliance.</p><label class="tw-flex tw-items-center tw-gap-3 tw-text-xs"><input id="complianceAgreeCheck" type="checkbox" class="tw-h-4 tw-w-4 tw-accent-ink">I understand these requirements</label><button id="confirmGenerateReportBtn" class="${button} tw-mt-5 tw-w-full" type="button" disabled>Generate report</button></dialog>
  </section>`;
}

export function setupInvestmentEvaluation(property, policy) {
  const form = document.getElementById('investmentEvaluationForm');
  if (!form) return;
  const business = document.getElementById('evalBusinessType');
  const capital = document.getElementById('evalCapital');
  const result = document.getElementById('evalResult');
  const dialog = document.getElementById('evalComplianceModal');
  const agree = document.getElementById('complianceAgreeCheck');
  const confirm = document.getElementById('confirmGenerateReportBtn');
  let evaluated = null;
  const activity = () => priorityActivity(policy, business.value);
  function refresh() {
    evaluated = null; result.hidden = true;
    const current = activity();
    const callout = document.getElementById('evalAlignmentCallout');
    callout.textContent = current?.sector ? `Priority Investment Alignment · ${current.sector}. This proposed activity aligns with a priority investment sector identified by the City of San Fernando.` : current ? 'This activity has no priority sector mapping. Base scores apply.' : 'Choose an activity to check its priority sector alignment.';
    callout.classList.toggle('tw-text-positive', Boolean(current?.sector));
    const incentive = potentialIncentive(capital.value, policy);
    document.getElementById('evalIncentiveBadge').textContent = incentive.badge;
    document.getElementById('evalIncentiveBadge').classList.toggle('tw-text-positive', incentive.eligible);
    document.getElementById('evalIncentiveCopy').textContent = incentive.copy;
  }
  business.addEventListener('change', refresh); capital.addEventListener('input', refresh);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    evaluated = policyScore(property.assessmentComplete ? property.iaiScore : null, activity(), policy);
    result.hidden = false;
    document.getElementById('evalBaseIaiVal').textContent = displayScore(evaluated.base);
    document.getElementById('evalAdjVal').textContent = evaluated.final == null ? '—' : `+${evaluated.percent}%`;
    document.getElementById('evalAdjPts').textContent = evaluated.final == null ? 'Awaiting assessment' : `+${evaluated.applied.toFixed(1)} pts applied`;
    document.getElementById('evalFinalIaiVal').textContent = displayScore(evaluated.final);
    document.getElementById('evalRationaleText').textContent = evaluated.final == null ? 'City assessment pending. All seven criteria are needed before MCE or IAI can be calculated.' : evaluated.percent ? `Policy adjustment: ${evaluated.percent}% of Base IAI, capped at 100. This separate policy modifier is not part of the original MCE methodology.` : 'The base departmental IAI is unchanged. A policy score modifier requires documented approval before it can be applied.';
    document.getElementById('evalGenerateReportBtn').disabled = evaluated.final == null;
  });
  document.getElementById('evalGenerateReportBtn').addEventListener('click', () => { if (evaluated?.final == null) return; agree.checked = false; confirm.disabled = true; dialog.showModal(); });
  agree.addEventListener('change', () => confirm.disabled = !agree.checked);
  confirm.addEventListener('click', () => {
    if (!agree.checked || evaluated?.final == null) return;
    const report = { propertyId: property.id, name: property.name, businessType: activity().label, sector: activity().sector || '', capitalization: Number(capital.value), mce: property.mceScore, score: evaluated, incentive: potentialIncentive(capital.value,policy), complianceAcknowledged: true, generatedAt: new Date().toISOString() };
    const config = window.SFC_APP_CONFIG || {};
    const key = `locus.investment-report:${config.basePath || ''}:${config.user?.id || 'guest'}`;
    try { sessionStorage.setItem(key,JSON.stringify(report)); }
    catch { document.getElementById('evalRationaleText').textContent = 'Unable to prepare this report. Enable session storage and try again.'; dialog.close(); return; }
    location.href = `${config.basePath || ''}/reports.php?investment=${property.id}`;
  });
  refresh();
}
