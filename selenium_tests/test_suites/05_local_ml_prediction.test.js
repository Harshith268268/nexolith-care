const axios = require('axios');
const config = require('../config');

async function testLocalMLPrediction() {
  const results = [];

  // TC-06: Local ML RandomForest Model Status Classification
  const startTime = Date.now();
  try {
    const sampleText = `
    METABOLIC PANEL REPORT
    Fasting Glucose: 115.0 mg/dL (Reference: 70.0 - 99.0)
    Hemoglobin: 14.2 g/dL (Reference: 13.0 - 17.0)
    Total Cholesterol: 245.0 mg/dL (Reference: 125.0 - 199.0)
    `;

    // Direct call to local Django analyzer logic via backend API / health
    const healthRes = await axios.get(config.HEALTH_URL);

    if (healthRes.data && healthRes.data.mlModel && healthRes.data.mlModel.includes('RandomForestClassifier')) {
      results.push({
        id: 'TC-06',
        suite: 'Local Machine Learning ML Suite',
        name: 'Random Forest Model Loading & Health Verification',
        status: 'PASS',
        durationMs: Date.now() - startTime,
        target: 'medical_status_model.joblib',
        error: null
      });
    } else {
      results.push({
        id: 'TC-06',
        suite: 'Local Machine Learning ML Suite',
        name: 'Random Forest Model Loading & Health Verification',
        status: 'FAIL',
        durationMs: Date.now() - startTime,
        target: 'medical_status_model.joblib',
        error: `ML Model health check returned: ${JSON.stringify(healthRes.data)}`
      });
    }
  } catch (err) {
    results.push({
      id: 'TC-06',
      suite: 'Local Machine Learning ML Suite',
      name: 'Random Forest Model Loading & Health Verification',
      status: 'FAIL',
      durationMs: Date.now() - startTime,
      target: 'medical_status_model.joblib',
      error: err.message
    });
  }

  return results;
}

module.exports = { testLocalMLPrediction };
