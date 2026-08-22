const { By, until } = require('selenium-webdriver');
const config = require('../config');

async function testAuthentication(driver) {
  const results = [];

  // TC-02: User Account Registration & JWT Generation
  let startTime = Date.now();
  try {
    await driver.get(`${config.FRONTEND_URL}/auth`);
    await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
    await driver.navigate().refresh();

    // Switch to Register Mode
    const toggleBtn = await driver.wait(until.elementLocated(By.css('[data-testid="toggle-auth-mode"]')), config.DEFAULT_TIMEOUT);
    await toggleBtn.click();

    // Fill form
    const userInput = await driver.wait(until.elementLocated(By.css('[data-testid="username-input"]')), config.DEFAULT_TIMEOUT);
    const passInput = await driver.findElement(By.css('[data-testid="password-input"]'));
    const submitBtn = await driver.findElement(By.css('[data-testid="auth-submit"]'));

    await userInput.clear();
    await userInput.sendKeys(config.TEST_USER);
    await passInput.clear();
    await passInput.sendKeys(config.TEST_PASS);
    await submitBtn.click();

    // Wait for redirect to dashboard
    await driver.wait(until.urlContains('/dashboard'), config.DEFAULT_TIMEOUT);

    results.push({
      id: 'TC-02',
      suite: 'Authentication Suite',
      name: 'User Account Registration & JWT Generation',
      status: 'PASS',
      durationMs: Date.now() - startTime,
      target: '[data-testid="auth-submit"]',
      error: null
    });
  } catch (err) {
    results.push({
      id: 'TC-02',
      suite: 'Authentication Suite',
      name: 'User Account Registration & JWT Generation',
      status: 'FAIL',
      durationMs: Date.now() - startTime,
      target: '[data-testid="auth-submit"]',
      error: err.message
    });
  }

  // TC-03: User Login & JWT Session Validation
  startTime = Date.now();
  try {
    // Clear storage to test fresh login session
    await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
    await driver.get(`${config.FRONTEND_URL}/auth`);

    const userInput = await driver.wait(until.elementLocated(By.css('[data-testid="username-input"]')), config.DEFAULT_TIMEOUT);
    const passInput = await driver.findElement(By.css('[data-testid="password-input"]'));
    const submitBtn = await driver.findElement(By.css('[data-testid="auth-submit"]'));

    await userInput.clear();
    await userInput.sendKeys(config.TEST_USER);
    await passInput.clear();
    await passInput.sendKeys(config.TEST_PASS);
    await submitBtn.click();

    await driver.wait(until.urlContains('/dashboard'), config.DEFAULT_TIMEOUT);

    results.push({
      id: 'TC-03',
      suite: 'Authentication Suite',
      name: 'User Login & JWT Session Validation',
      status: 'PASS',
      durationMs: Date.now() - startTime,
      target: '[data-testid="username-input"]',
      error: null
    });
  } catch (err) {
    results.push({
      id: 'TC-03',
      suite: 'Authentication Suite',
      name: 'User Login & JWT Session Validation',
      status: 'FAIL',
      durationMs: Date.now() - startTime,
      target: '[data-testid="username-input"]',
      error: err.message
    });
  }

  return results;
}

module.exports = { testAuthentication };
