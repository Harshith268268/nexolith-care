const fs = require('fs');
const path = require('path');

function createSampleReportFile() {
  const filePath = path.join(__dirname, '..', 'scratch_sample_report.txt');
  const reportContent = `
METABOLIC & BLOOD LAB REPORT
Patient Name: Jane Doe
Date: 2026-08-22

TEST PARAMETERS:
Fasting Glucose: 112.5 mg/dL (Reference Range: 70.0 - 99.0)
Hemoglobin: 14.2 g/dL (Reference Range: 13.0 - 17.0)
Total Cholesterol: 215.0 mg/dL (Reference Range: 125.0 - 199.0)
  `;

  fs.writeFileSync(filePath, reportContent.trim(), 'utf8');
  return filePath;
}

module.exports = { createSampleReportFile };
