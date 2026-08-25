"""
Configuration module for Selenium E2E Automation Framework.
All target URLs, timeouts, headless parameters, and base URLs are configured here.
"""

import os

class Config:
    # BASE_URL must point to the LIVE deployed application.
    # Never default to localhost or local dev servers.
    DEFAULT_LIVE_URL = "https://Harshith268268.github.io/nexolith-care/"
    BASE_URL = os.environ.get("BASE_URL", DEFAULT_LIVE_URL).rstrip("/") + "/"

    # WebDriver Settings
    HEADLESS = os.environ.get("HEADLESS", "true").lower() in ("true", "1", "yes")
    BROWSER = os.environ.get("BROWSER", "chrome").lower()
    IMPLICIT_WAIT = int(os.environ.get("IMPLICIT_WAIT", "10"))
    EXPLICIT_WAIT = int(os.environ.get("EXPLICIT_WAIT", "15"))
    PAGE_LOAD_TIMEOUT = int(os.environ.get("PAGE_LOAD_TIMEOUT", "30"))

    # Pass / Fail threshold criteria (Pass Rate >= 95%)
    REQUIRED_PASS_PERCENTAGE = float(os.environ.get("REQUIRED_PASS_PERCENTAGE", "95.0"))
    MAX_CRITICAL_FAILURE_PERCENTAGE = float(os.environ.get("MAX_CRITICAL_FAILURE_PERCENTAGE", "5.0"))

    # Paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    REPORTS_DIR = os.path.join(os.path.dirname(BASE_DIR), "Test Results")
    EXCEL_REPORTS_DIR = os.path.join(REPORTS_DIR, "Excel")
    HTML_REPORTS_DIR = os.path.join(REPORTS_DIR, "HTML")
    SCREENSHOTS_DIR = os.path.join(REPORTS_DIR, "Screenshots")
    LOGS_DIR = os.path.join(REPORTS_DIR, "Logs")
    JSON_REPORTS_DIR = os.path.join(REPORTS_DIR, "JSON")
    SUMMARY_REPORTS_DIR = os.path.join(REPORTS_DIR, "Summary")

    @classmethod
    def get_route_url(cls, route: str = "") -> str:
        """Returns full URL for a given app route."""
        clean_route = route.lstrip("/")
        return f"{cls.BASE_URL}#{clean_route}" if clean_route else cls.BASE_URL
