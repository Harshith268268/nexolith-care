"""
Screenshot Utility for capturing browser screenshots on test failure or verification checkpoints.
"""

import os
from datetime import datetime
from selenium import webdriver
from automation.config.config import Config
from automation.utils.logger import AutomationLogger

logger = AutomationLogger.get_logger()

class ScreenshotUtil:
    @staticmethod
    def capture_screenshot(driver: webdriver.Chrome, test_id: str, suffix: str = "failed") -> str:
        """
        Captures full browser screenshot and saves it in Config.SCREENSHOTS_DIR.
        Returns the absolute file path of the saved screenshot.
        """
        os.makedirs(Config.SCREENSHOTS_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        clean_test_id = test_id.replace("-", "_").replace(" ", "_")
        filename = f"{clean_test_id}_{suffix}_{timestamp}.png"
        filepath = os.path.join(Config.SCREENSHOTS_DIR, filename)

        try:
            if driver:
                driver.save_screenshot(filepath)
                logger.info(f"Captured screenshot for {test_id}: {filepath}")
                return filepath
        except Exception as e:
            logger.error(f"Failed to capture screenshot for {test_id}: {e}")

        return ""
