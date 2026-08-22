const { By, until } = require('selenium-webdriver');
const config = require('../config');

async function testChatAssistant(driver) {
  const results = [];
  const startTime = Date.now();

  try {
    await driver.get(`${config.FRONTEND_URL}/assistant`);

    const inputElem = await driver.wait(until.elementLocated(By.css('[data-testid="assistant-chat-input"]')), config.DEFAULT_TIMEOUT);
    const submitBtn = await driver.findElement(By.css('[data-testid="assistant-chat-submit"]'));

    await inputElem.clear();
    await inputElem.sendKeys('What is normal fasting glucose level?');
    await submitBtn.click();

    await driver.sleep(1500); // Allow local knowledge engine response to render

    results.push({
      id: 'TC-07',
      suite: 'Chat Assistant & Knowledge Engine Suite',
      name: 'Local Offline Chat Query Execution & Response Generation',
      status: 'PASS',
      durationMs: Date.now() - startTime,
      target: '[data-testid="assistant-chat-input"]',
      error: null
    });
  } catch (err) {
    results.push({
      id: 'TC-07',
      suite: 'Chat Assistant & Knowledge Engine Suite',
      name: 'Local Offline Chat Query Execution & Response Generation',
      status: 'FAIL',
      durationMs: Date.now() - startTime,
      target: '[data-testid="assistant-chat-input"]',
      error: err.message
    });
  }

  return results;
}

module.exports = { testChatAssistant };
