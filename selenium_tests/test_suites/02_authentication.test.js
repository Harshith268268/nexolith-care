const { By, until } = require('selenium-webdriver');
const config = require('../config');

async function testAuthentication(driver) {
  const results = [];

  // TC-02: User Account Registration & Email OTP Verification
  let startTime = Date.now();
  try {
    await driver.get(`${config.FRONTEND_URL}/auth`);
    await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
    await driver.navigate().refresh();

    // Switch to Register Mode
    const toggleBtn = await driver.wait(until.elementLocated(By.css('[data-testid="toggle-auth-mode"]')), config.DEFAULT_TIMEOUT);
    await toggleBtn.click();

    const uniqueId = Math.floor(Math.random() * 90000) + 10000;
    const testUsername = `e2e_user_${uniqueId}`;
    const testEmail = `e2e_${uniqueId}@example.com`;

    // Fill registration form
    const userInput = await driver.wait(until.elementLocated(By.css('[data-testid="register-username"]')), config.DEFAULT_TIMEOUT);
    const emailInput = await driver.findElement(By.css('[data-testid="register-email"]'));
    const passInput = await driver.findElement(By.css('[data-testid="register-password"]'));
    const confirmInput = await driver.findElement(By.css('[data-testid="register-confirm-password"]'));
    const submitBtn = await driver.findElement(By.css('[data-testid="register-submit"]'));

    await userInput.clear();
    await userInput.sendKeys(testUsername);
    await emailInput.clear();
    await emailInput.sendKeys(testEmail);
    await passInput.clear();
    await passInput.sendKeys(config.TEST_PASS);
    await confirmInput.clear();
    await confirmInput.sendKeys(config.TEST_PASS);

    await submitBtn.click();

    // Wait for OTP input screen to appear
    await driver.wait(until.elementLocated(By.css('[data-testid="otp-input"]')), config.DEFAULT_TIMEOUT);

    results.push({
      id: 'TC-02',
      suite: 'Authentication Suite',
      name: 'User Account Registration & Email OTP Dispatch',
      status: 'PASS',
      durationMs: Date.now() - startTime,
      target: '[data-testid="register-submit"]',
      error: null
    });
  } catch (err) {
    results.push({
      id: 'TC-02',
      suite: 'Authentication Suite',
      name: 'User Account Registration & Email OTP Dispatch',
      status: 'FAIL',
      durationMs: Date.now() - startTime,
      target: '[data-testid="register-submit"]',
      error: err.message
    });
  }

  // TC-03: User Login & JWT Session Validation
  startTime = Date.now();
  try {
    // Clear storage & force page refresh to reset React auth mode to 'login'
    await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
    await driver.get(`${config.FRONTEND_URL}/auth`);
    await driver.navigate().refresh();

    // Find login form inputs
    const userInput = await driver.wait(until.elementLocated(By.css('[data-testid="login-username"]')), config.DEFAULT_TIMEOUT);
    const passInput = await driver.findElement(By.css('[data-testid="login-password"]'));
    const submitBtn = await driver.findElement(By.css('[data-testid="login-submit"]'));

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
      target: '[data-testid="login-username"]',
      error: null
    });
  } catch (err) {
    results.push({
      id: 'TC-03',
      suite: 'Authentication Suite',
      name: 'User Login & JWT Session Validation',
      status: 'FAIL',
      durationMs: Date.now() - startTime,
      target: '[data-testid="login-username"]',
      error: err.message
    });
  }

  return results;
}

module.exports = { testAuthentication };
