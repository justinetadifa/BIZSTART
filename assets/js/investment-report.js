import { investorBriefReportMarkup, setupPropertyDetailsPrint } from './property-details-view.js';
import { potentialIncentive } from './investment-policy.js';

const config = window.SFC_APP_CONFIG || {};
const root = document.getElementById('investmentReportRoot');
const printButton = document.getElementById('printDecisionReport');
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
printButton.disabled = true;

async function render() {
  const id = Number(new URLSearchParams(location.search).get('investment'));
  let draft;
  try { draft = JSON.parse(sessionStorage.getItem(`locus.investment-report:${config.basePath || ''}:${config.user?.id || 'guest'}`) || 'null'); } catch {}
  if (!draft || draft.propertyId !== id || !draft.complianceAcknowledged || !draft.activityId
    || !Number.isFinite(draft.capitalization) || draft.capitalization < 0) {
    throw new Error('Run an investment assessment with an explicitly selected activity before preparing this report.');
  }
  const read = async url => {
    const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Property assessment is unavailable.');
    return payload;
  };
  const property = (await read(`${config.apiBase}/property.php?id=${id}`)).property;
  const assessment = (await read(`${config.apiBase}/property-assessment.php?id=${id}&activity=${encodeURIComponent(draft.activityId)}`)).assessment;
  const incentive = potentialIncentive(draft.capitalization, config.policy || {});
  // Re-read the authorized server result. A saved draft never supplies scores or permissions.
  root.innerHTML = investorBriefReportMarkup(property, {
    scenarioAssessment: assessment,
    investmentContext: `Proposed capitalization: PHP ${new Intl.NumberFormat('en-PH').format(draft.capitalization)}. Potential incentive: ${incentive.badge}. ${incentive.copy} Policy incentives do not modify IAI.`,
  });
  setupPropertyDetailsPrint(root, property);
  printButton.disabled = false;
  printButton.addEventListener('click', () => window.print());
}
render().catch(error => {
  root.innerHTML = `<p role="alert">${esc(error.message)}</p>`;
});
