import { caoReportMarkup, setupCaoReportPrint } from './property-details-view.js';

const config = window.SFC_APP_CONFIG || {};
const root = document.getElementById('caoReportRoot');
const printButton = document.getElementById('printCaoReport');
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

if (printButton) printButton.disabled = true;

async function render() {
  const urlParams = new URLSearchParams(location.search);
  const id = Number(urlParams.get('cao') || urlParams.get('id') || urlParams.get('property'));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('Please select a valid candidate property to generate its CAO Property Assessment & Valuation Dossier.');
  }

  const read = async url => {
    const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Property assessment data is unavailable.');
    return payload;
  };

  const propertyData = await read(`${config.apiBase}/property.php?id=${id}`);
  const property = propertyData.property;
  if (!property) throw new Error('Property records could not be found.');

  // Fetch assessment scenario (or baseline assessment)
  let assessment = null;
  const activity = property.proposedActivity || property.clupProfile?.proposedActivity || 'retail_convenience';
  try {
    const assessmentData = await read(`${config.apiBase}/property-assessment.php?id=${id}&activity=${encodeURIComponent(activity)}`);
    assessment = assessmentData.assessment;
  } catch (err) {
    console.warn('Scenario assessment fallback:', err);
  }

  root.innerHTML = caoReportMarkup(property, { scenarioAssessment: assessment });
  setupCaoReportPrint(root, property);

  if (printButton) {
    printButton.disabled = false;
    printButton.addEventListener('click', () => window.print());
  }
}

render().catch(error => {
  if (root) {
    root.innerHTML = `
      <div style="background:#fef2f2;border:1px solid #fecaca;padding:24px;border-radius:12px;color:#991b1b;max-width:600px;margin:40px auto;text-align:center;">
        <h2 style="font-size:18px;margin:0 0 8px;">Unable to Load CAO Appraisal Dossier</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#7f1d1d;">${esc(error.message)}</p>
        <a href="${esc(config.basePath || '')}/reports.php" style="display:inline-block;padding:8px 16px;background:#991b1b;color:#fff;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">← Return to Reports</a>
      </div>
    `;
  }
});
