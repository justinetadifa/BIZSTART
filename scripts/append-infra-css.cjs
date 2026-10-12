const fs = require('fs');
const path = require('path');

const cssFile = path.join(__dirname, '../assets/css/property-wizard.css');
let css = fs.readFileSync(cssFile, 'utf8');

const infraCss = `
/* ==========================================================================
   Step 3: Infrastructure Readiness 4-Subcategories Assessment Component
   ========================================================================== */
.property-wizard .pw-infra-intro-hint {
  font-size: 13.5px;
  color: #475569;
  margin: 0 0 16px 0;
  text-align: left;
}

.property-wizard .pw-infra-card {
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

.property-wizard .pw-infra-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.property-wizard .pw-infra-heading-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.property-wizard .pw-infra-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}

.property-wizard .pw-infra-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.property-wizard .pw-infra-header-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.property-wizard .pw-infra-form-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.property-wizard .pw-infra-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.property-wizard .pw-infra-label {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.property-wizard .pw-infra-select {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: #1e293b;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
}

.property-wizard .pw-infra-select:focus,
.property-wizard .pw-infra-input:focus {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.property-wizard .pw-infra-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  color: #1e293b;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.property-wizard .pw-infra-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #64748b;
  padding: 0 2px;
}

.property-wizard .pw-infra-item-footer .pw-sub-score {
  font-weight: 600;
  color: #0f172a;
}

/* Generator callout */
.property-wizard .pw-infra-generator-callout {
  margin-top: 10px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-left: 4px solid #0284c7;
  border-radius: 8px;
}

.property-wizard .pw-infra-generator-callout .pw-callout-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #0f172a;
  margin-bottom: 6px;
}

.property-wizard .pw-infra-generator-callout .pw-info-icon {
  font-size: 15px;
  color: #0284c7;
}

.property-wizard .pw-infra-generator-callout .pw-callout-text {
  font-size: 12px;
  color: #475569;
  line-height: 1.5;
  margin: 0;
}

/* Factual details disclosure */
.property-wizard .pw-infra-details {
  margin-top: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fafafa;
}

.property-wizard .pw-infra-details summary {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  user-select: none;
}

.property-wizard .pw-infra-details summary:hover {
  color: #0f172a;
}

.property-wizard .pw-infra-details-body {
  padding: 10px 12px;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}

/* Preview Card */
.property-wizard .pw-infra-preview-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  max-width: 840px;
  margin: 0 auto;
}

.property-wizard .pw-infra-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.property-wizard .pw-infra-preview-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0;
}

.property-wizard .pw-infra-badge-calc {
  font-size: 11.5px;
  font-weight: 500;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 2px 8px;
}

.property-wizard .pw-infra-score-display {
  margin-bottom: 16px;
}

.property-wizard .pw-infra-score-num {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.property-wizard .pw-infra-progress-track {
  width: 100%;
  height: 8px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
  margin-top: 12px;
}

.property-wizard .pw-infra-progress-bar {
  height: 100%;
  background-color: #8b1e2d; /* Burgundy bar matching mockup */
  border-radius: 9999px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

/* Breakdown rows */
.property-wizard .pw-infra-breakdown-table {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #f1f5f9;
  margin-top: 16px;
}

.property-wizard .pw-infra-breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f8fafc;
}

.property-wizard .pw-infra-breakdown-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.property-wizard .pw-infra-breakdown-title {
  font-size: 13.5px;
  font-weight: 500;
  color: #1e293b;
}

.property-wizard .pw-infra-breakdown-weight {
  font-size: 11.5px;
  color: #64748b;
}

.property-wizard .pw-infra-breakdown-pts {
  font-size: 13.5px;
  font-weight: 500;
  color: #334155;
}

/* IAI box */
.property-wizard .pw-infra-iai-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 12px 0;
  border-top: 1px solid #e2e8f0;
  margin-top: 8px;
}

.property-wizard .pw-infra-iai-label {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.property-wizard .pw-infra-iai-val {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.property-wizard .pw-infra-disclaimer {
  font-size: 12px;
  color: #64748b;
  margin: 8px 0 16px 0;
  line-height: 1.5;
}

.property-wizard .pw-infra-preview-footer {
  display: flex;
  justify-content: center;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

.property-wizard .pw-btn-reset-demo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 16px;
  font-size: 13.5px;
  font-weight: 500;
  color: #475569;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.property-wizard .pw-btn-reset-demo:hover {
  background: #f8fafc;
  color: #0f172a;
  border-color: #94a3b8;
}

/* Incomplete state */
.property-wizard .pw-infra-state-incomplete {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 8px;
  margin: 12px 0;
}

.property-wizard .pw-infra-state-incomplete .pw-infra-state-title {
  font-size: 14px;
  font-weight: 600;
  color: #b45309;
}

.property-wizard .pw-infra-state-incomplete .pw-infra-state-msg {
  font-size: 12.5px;
  color: #92400e;
  margin: 0;
}

@media (max-width: 640px) {
  .property-wizard .pw-infra-breakdown-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .property-wizard .pw-infra-breakdown-pts {
    align-self: flex-end;
  }
}
`;

if (!css.includes('.property-wizard .pw-infra-card')) {
  fs.appendFileSync(cssFile, infraCss, 'utf8');
  console.log('Appended infra CSS successfully!');
} else {
  console.log('Infra CSS already present.');
}
