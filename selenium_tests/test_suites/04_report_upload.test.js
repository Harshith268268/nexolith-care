const { By, until } = require('selenium-webdriver');
const config = require('../config');
const { createSampleReportFile } = require('../helpers/sample_report_generator');

async function testReportUpload(driver) {
  const results = [];
  const startTime = Date.now();

  try {
    const filePath = createSampleReportFile();

    await driver.get(`${config.FRONTEND_URL}/reports/upload`);

    // Locate file input in DOM (even if visually hidden by CSS)
    const fileInput = await driver.wait(until.elementLocated(By.css('[data-testid="report-file-input"]')), config.DEFAULT_TIMEOUT);

    // Send file path to file input element
    await fileInput.sendKeys(filePath);

    // Allow React state to register file selection
    await driver.sleep(1000);

    // Locate start processing button
    const processBtn = await driver.wait(until.elementLocated(By.css('[data-testid="start-processing-btn"]')), config.DEFAULT_TIMEOUT);
    
    // Trigger click on start processing button
    await driver.executeScript('arguments[0].click();', processBtn);

    results.push({
      id: 'TC-05',
      suite: 'Report Upload & Processing Suite',
      name: 'Lab Report File Upload & Processing Dispatch',
      status: 'PASS',
      durationMs: Date.now() - startTime,
      target: '[data-testid="report-file-input"]',
      error: null
    });
  } catch (err) {
    results.push({
      id: 'TC-05',
      suite: 'Report Upload & Processing Suite',
      name: 'Lab Report File Upload & Processing Dispatch',
      status: 'FAIL',
      durationMs: Date.now() - startTime,
      target: '[data-testid="report-file-input"]',
      error: err.message
    });
  }

  return results;
}

module.exports = { testReportUpload };
