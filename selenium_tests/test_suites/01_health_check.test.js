const axios = require('axios');
const config = require('../config');

async function testHealthCheck() {
  const startTime = Date.now();
  try {
    const res = await axios.get(config.HEALTH_URL, { timeout: 5000 });
    const duration = Date.now() - startTime;

    if (res.status === 200 && res.data.status === 'healthy') {
      return {
        id: 'TC-01',
        suite: 'System & Health Check',
        name: 'Backend API & ML Model Health Verification',
        status: 'PASS',
        durationMs: duration,
        target: '/api/health/',
        healthData: res.data,
        error: null
      };
    } else {
      return {
        id: 'TC-01',
        suite: 'System & Health Check',
        name: 'Backend API & ML Model Health Verification',
        status: 'FAIL',
        durationMs: duration,
        target: '/api/health/',
        healthData: res.data,
        error: `Unexpected health response: ${JSON.stringify(res.data)}`
      };
    }
  } catch (err) {
    return {
      id: 'TC-01',
      suite: 'System & Health Check',
      name: 'Backend API & ML Model Health Verification',
      status: 'FAIL',
      durationMs: Date.now() - startTime,
      target: '/api/health/',
      healthData: {},
      error: `Health check request failed: ${err.message}`
    };
  }
}

module.exports = { testHealthCheck };
