const fs = require('fs');
const path = require('path');

const cssFile = path.join(__dirname, '../assets/css/property-wizard.css');
let css = fs.readFileSync(cssFile, 'utf8');

const extraCss = `
/* Additional layout styles matching Infrastructure Readiness Mockup */
.property-wizard .pw-infra-score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.property-wizard .pw-infra-score-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.property-wizard .pw-badge-calculated {
  font-size: 11.5px;
  font-weight: 500;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 3px 8px;
}

.property-wizard .pw-infra-breakdown-list {
  display: flex;
  flex-direction: column;
  margin-top: 14px;
}

.property-wizard .pw-infra-breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.property-wizard .pw-infra-row-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.property-wizard .pw-infra-row-label strong {
  font-size: 13.5px;
  font-weight: 500;
  color: #1e293b;
}

.property-wizard .pw-infra-row-label small {
  font-size: 11.5px;
  color: #64748b;
}

.property-wizard .pw-infra-row-pts {
  font-size: 13.5px;
  color: #334155;
}

.property-wizard .pw-infra-row-pts strong {
  font-weight: 600;
  color: #0f172a;
}

.property-wizard .pw-infra-iai-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 10px 0;
  border-top: 1px solid #e2e8f0;
  margin-top: 10px;
}

.property-wizard .pw-infra-iai-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.property-wizard .pw-infra-iai-val {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.property-wizard .pw-infra-actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.property-wizard [data-infra-reset-example] {
  width: 100%;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 16px;
  font-size: 13.5px;
  font-weight: 500;
  color: #475569;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  transition: all 0.15s ease;
}

.property-wizard [data-infra-reset-example]:hover {
  background: #f8fafc;
  color: #0f172a;
  border-color: #94a3b8;
}
`;

if (!css.includes('.property-wizard .pw-infra-score-row')) {
  fs.appendFileSync(cssFile, extraCss, 'utf8');
  console.log('Appended extra infra CSS successfully!');
} else {
  console.log('Extra infra CSS already present.');
}
