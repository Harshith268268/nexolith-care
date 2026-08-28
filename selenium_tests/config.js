/**
 * Selenium E2E Test Suite Configuration
 */

module.exports = {
  FRONTEND_URL: process.env.VITE_API_FRONTEND_URL || 'http://localhost:5173',
  BACKEND_URL: process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  HEALTH_URL: 'http://127.0.0.1:8000/api/health/',
  
  TEST_USER: 'testfamily',
  TEST_PASS: 'Password123!',

  DEFAULT_TIMEOUT: 15000,
  HEADLESS: process.env.HEADLESS !== 'false', // Default to true unless explicitly overridden
};
