const fs = require('fs');
const path = require('path');

const cssFile = path.join(__dirname, '../assets/css/property-wizard.css');
let css = fs.readFileSync(cssFile, 'utf8');

const econCss = `
/* ==========================================================================
   Step 3: Economic Viability 3-Section Assessment Component
   ========================================================================== */
.property-wizard .pw-econ-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 840px;
  margin: 0 auto 24px auto;
}

.property-wizard .pw-econ-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.property-wizard .pw-econ-heading-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.property-wizard .pw-econ-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}

.property-wizard .pw-econ-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* FROM PROPERTY DETAILS box matching screenshot */
.property-wizard .pw-econ-from-details {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-wizard .pw-econ-from-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 2px;
}

.property-wizard .pw-econ-from-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}

.property-wizard .pw-econ-from-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.property-wizard .pw-econ-from-label {
  font-size: 13.5px;
  color: #475569;
}

.property-wizard .pw-econ-from-val {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

/* Form items */
.property-wizard .pw-econ-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
}

.property-wizard .pw-econ-section-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.property-wizard .pw-econ-section-desc {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 4px 0;
}

.property-wizard .pw-econ-fields-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.property-wizard .pw-econ-field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.property-wizard .pw-econ-label {
  font-size: 13.5px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.property-wizard .pw-econ-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: #1e293b;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.property-wizard .pw-econ-select {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: #1e293b;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.property-wizard .pw-econ-input:focus,
.property-wizard .pw-econ-select:focus {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.property-wizard .pw-econ-hint-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.property-wizard .pw-badge-source-req {
  font-size: 11px;
  font-weight: 600;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 2px 8px;
}

.property-wizard .pw-econ-hint-text {
  font-size: 12px;
  color: #64748b;
}

/* Expandable supporting details */
.property-wizard .pw-econ-details {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fafafa;
  margin-top: 8px;
}

.property-wizard .pw-econ-details summary {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  user-select: none;
}

.property-wizard .pw-econ-details summary:hover {
  color: #0f172a;
}

.property-wizard .pw-econ-details-body {
  padding: 12px;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}

/* 3. Automatic Price Analysis Card matching screenshot */
.property-wizard .pw-econ-preview-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  margin-top: 8px;
}

.property-wizard .pw-econ-preview-header {
  margin-bottom: 14px;
}

.property-wizard .pw-econ-preview-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0;
}

.property-wizard .pw-econ-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.property-wizard .pw-econ-metric-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.property-wizard .pw-econ-metric-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.property-wizard .pw-econ-metric-val {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.property-wizard .pw-econ-breakdown-list {
  display: flex;
  flex-direction: column;
  margin-top: 6px;
}

.property-wizard .pw-econ-breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f8fafc;
}

.property-wizard .pw-econ-breakdown-title {
  font-size: 13.5px;
  color: #334155;
}

.property-wizard .pw-econ-breakdown-pts {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

/* Warning callout */
.property-wizard .pw-econ-warning {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12.5px;
  color: #92400e;
  margin: 12px 0;
  line-height: 1.45;
}

/* Callout with ⓘ info circle */
.property-wizard .pw-econ-callout {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #64748b;
  border-radius: 6px;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 14px 0 10px 0;
}

.property-wizard .pw-econ-callout .pw-info-icon {
  font-size: 14px;
  color: #64748b;
  flex-shrink: 0;
  margin-top: 1px;
}

.property-wizard .pw-econ-callout-text {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

/* Status row */
.property-wizard .pw-econ-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
  margin-top: 8px;
}

.property-wizard .pw-econ-status-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.property-wizard .pw-econ-status-note {
  font-size: 11.5px;
  color: #64748b;
}

.property-wizard .pw-econ-iai-val {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.property-wizard .pw-econ-actions {
  display: flex;
  justify-content: center;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
  margin-top: 10px;
}

@media (max-width: 640px) {
  .property-wizard .pw-econ-grid-2col {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
`;

if (!css.includes('.property-wizard .pw-econ-card')) {
  fs.appendFileSync(cssFile, econCss, 'utf8');
  console.log('Appended Economic Viability CSS successfully!');
} else {
  console.log('Economic Viability CSS already present.');
}
