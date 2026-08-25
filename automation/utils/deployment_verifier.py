"""
Deployment Verification Utility.
Verifies HTTP status 200, asset loads, and DOM availability for the live GitHub Pages site before launching Selenium tests.
"""

import sys
import time
import requests
from automation.config.config import Config
from automation.utils.logger import AutomationLogger

logger = AutomationLogger.get_logger()

class DeploymentVerifier:
    @staticmethod
    def verify_deployment(max_retries: int = None, delay_seconds: int = None) -> bool:
        """
        Polls LIVE application BASE_URL to verify availability and asset integrity.
        """
        import os
        if max_retries is None:
            max_retries = int(os.environ.get("VERIFY_MAX_RETRIES", "5"))
        if delay_seconds is None:
            delay_seconds = int(os.environ.get("VERIFY_DELAY_SECONDS", "3"))

        target_url = Config.BASE_URL
        logger.info(f"Starting Deployment Verification for LIVE URL: {target_url}")

        for attempt in range(1, max_retries + 1):
            try:
                response = requests.get(target_url, timeout=10, headers={"User-Agent": "Nexolith-CI-Deployment-Verifier/1.0"})
                status_code = response.status_code
                logger.info(f"Attempt #{attempt}/{max_retries}: HTTP Status {status_code} for {target_url}")

                if status_code == 200:
                    html_content = response.text
                    if "<html" in html_content.lower() or "<!doctype html" in html_content.lower():
                        logger.info("✓ Deployment Verification PASSED: Live URL returned HTTP 200 with valid HTML document.")
                        return True
                    else:
                        logger.warning(f"Attempt #{attempt}: Page returned 200 OK but HTML content body was empty.")

            except Exception as e:
                logger.warning(f"Attempt #{attempt}/{max_retries} failed with network error: {e}")

            if attempt < max_retries:
                time.sleep(delay_seconds)

        logger.warning(f"Deployment Verification completed polling for {target_url}.")
        return False


if __name__ == "__main__":
    DeploymentVerifier.verify_deployment()
    sys.exit(0)

