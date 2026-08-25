"""
BasePage Object Model parent class providing explicit wait helpers and common page interactions.
"""

from typing import Tuple, List, Optional
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from automation.config.config import Config
from automation.utils.logger import AutomationLogger

logger = AutomationLogger.get_logger()

class BasePage:
    def __init__(self, driver: WebDriver):
        self.driver = driver
        self.wait = WebDriverWait(driver, Config.EXPLICIT_WAIT)

    def open_url(self, route: str = ""):
        target_url = Config.get_route_url(route)
        logger.info(f"Navigating to URL: {target_url}")
        self.driver.get(target_url)

    def find_element(self, locator: Tuple[str, str]) -> WebElement:
        return self.wait.until(EC.presence_of_element_located(locator))

    def find_visible_element(self, locator: Tuple[str, str]) -> WebElement:
        return self.wait.until(EC.visibility_of_element_located(locator))

    def find_elements(self, locator: Tuple[str, str]) -> List[WebElement]:
        return self.driver.find_elements(*locator)

    def click(self, locator: Tuple[str, str]):
        elem = self.wait.until(EC.element_to_be_clickable(locator))
        elem.click()

    def send_keys(self, locator: Tuple[str, str], text: str):
        elem = self.find_visible_element(locator)
        elem.clear()
        elem.send_keys(text)

    def get_text(self, locator: Tuple[str, str]) -> str:
        elem = self.find_visible_element(locator)
        return elem.text.strip()

    def is_displayed(self, locator: Tuple[str, str], timeout: int = 5) -> bool:
        try:
            w = WebDriverWait(self.driver, timeout)
            return w.until(EC.visibility_of_element_located(locator)).is_displayed()
        except Exception:
            return False

    def get_page_title(self) -> str:
        return self.driver.title

    def get_current_url(self) -> str:
        return self.driver.current_url
