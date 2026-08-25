"""
WebDriver Factory initializing Headless Chrome with robust options for CI/CD environments.
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from webdriver_manager.chrome import ChromeDriverManager
from automation.config.config import Config
from automation.utils.logger import AutomationLogger

logger = AutomationLogger.get_logger()

class DriverFactory:
    @staticmethod
    def create_driver() -> webdriver.Chrome:
        """
        Creates and returns a configured Selenium Chrome WebDriver instance.
        """
        options = ChromeOptions()
        if Config.HEADLESS:
            options.add_argument("--headless=new")
        
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--ignore-certificate-errors")
        options.add_argument("--allow-running-insecure-content")
        options.add_argument("--disable-extensions")
        options.add_argument("--remote-debugging-port=9222")
        options.set_capability("goog:loggingPrefs", {"browser": "ALL"})

        try:
            service = ChromeService(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=options)
        except Exception as e:
            logger.warning(f"ChromeDriverManager failed ({e}), attempting default Chrome Service initialization...")
            driver = webdriver.Chrome(options=options)

        driver.implicitly_wait(Config.IMPLICIT_WAIT)
        driver.set_page_load_timeout(Config.PAGE_LOAD_TIMEOUT)
        logger.info(f"WebDriver initialized successfully. Target BASE_URL: {Config.BASE_URL}")
        return driver
