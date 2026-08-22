require('chromedriver');
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const edge = require('selenium-webdriver/edge');
const config = require('../config');

/**
 * WebDriver Factory initializing headless browser instance.
 */
async function createWebDriver() {
  const chromeOptions = new chrome.Options();
  
  if (config.HEADLESS) {
    chromeOptions.addArguments('--headless=new');
  }
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--disable-gpu');
  chromeOptions.addArguments('--window-size=1920,1080');

  try {
    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();

    await driver.manage().setTimeouts({ implicit: config.DEFAULT_TIMEOUT });
    return driver;
  } catch (err) {
    console.log(`[WebDriverFactory] Chrome initialization failed: ${err.message}. Trying Edge fallback...`);
    
    const edgeOptions = new edge.Options();
    if (config.HEADLESS) {
      edgeOptions.addArguments('--headless');
    }
    edgeOptions.addArguments('--window-size=1920,1080');

    const driver = await new Builder()
      .forBrowser('MicrosoftEdge')
      .setEdgeOptions(edgeOptions)
      .build();

    await driver.manage().setTimeouts({ implicit: config.DEFAULT_TIMEOUT });
    return driver;
  }
}

module.exports = { createWebDriver };
