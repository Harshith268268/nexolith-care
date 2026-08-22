const { By, until } = require('selenium-webdriver');
const config = require('../config');

async function testDashboard(driver) {
  const results = [];
  const startTime = Date.now();

  try {
    await driver.get(`${config.FRONTEND_URL}/dashboard`);

    // Verify main container
    const container = await driver.wait(until.elementLocated(By.css('[data-testid="dashboard-container"]')), config.DEFAULT_TIMEOUT);
    const isDisplayed = await container.isDisplayed();

    // Verify upload action link
    const uploadLink = await driver.findElement(By.css('[data-testid="upload-report-link"]'));
    const isLinkDisplayed = await uploadLink.isDisplayed();

    if (isDisplayed && isLinkDisplayed) {
      results.push({
        id: 'TC-04',
        suite: 'Dashboard & Navigation Suite',
        name: 'Dashboard UI Container & Action Controls Verification',
        status: 'PASS',
        durationMs: Date.now() - startTime,
        target: '[data-testid="dashboard-container"]',
        error: null
      });
    } else {
      results.push({
        id: 'TC-04',
        suite: 'Dashboard & Navigation Suite',
        name: 'Dashboard UI Container & Action Controls Verification',
        status: 'FAIL',
        durationMs: Date.now() - startTime,
        target: '[data-testid="dashboard-container"]',
        error: 'Dashboard elements were located but not visually displayed'
      });
    }
  } catch (err) {
    results.push({
      id: 'TC-04',
      suite: 'Dashboard & Navigation Suite',
      name: 'Dashboard UI Container & Action Controls Verification',
      status: 'FAIL',
      durationMs: Date.now() - startTime,
      target: '[data-testid="dashboard-container"]',
      error: err.message
    });
  }

  return results;
}

module.exports = { testDashboard };
