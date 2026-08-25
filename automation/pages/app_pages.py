"""
Page Object Model implementations for all Nexolith Care application views.
"""

from selenium.webdriver.common.by import By
from automation.pages.base_page import BasePage

class LoginPage(BasePage):
    EMAIL_INPUT = (By.CSS_SELECTOR, "input[type='email'], input[name='email']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password'], input[name='password']")
    SUBMIT_BTN = (By.CSS_SELECTOR, "button[type='submit']")
    REGISTER_LINK = (By.XPATH, "//a[contains(text(), 'Register') or contains(text(), 'Sign up')]")
    FORGOT_PASSWORD_LINK = (By.XPATH, "//a[contains(text(), 'Forgot')]")
    ERROR_MESSAGE = (By.CSS_SELECTOR, ".text-red-500, .error-msg, .alert-danger")

    def login(self, email: str, password: str):
        if self.is_displayed(self.EMAIL_INPUT, timeout=3):
            self.send_keys(self.EMAIL_INPUT, email)
            self.send_keys(self.PASSWORD_INPUT, password)
            self.click(self.SUBMIT_BTN)


class DashboardPage(BasePage):
    HEADER_TITLE = (By.XPATH, "//h1[contains(text(), 'Dashboard') or contains(text(), 'Overview') or contains(text(), 'Nexolith Care')]")
    METRIC_CARDS = (By.CSS_SELECTOR, ".grid > div, .card, .stat-card")
    FAMILY_MEMBER_LIST = (By.CSS_SELECTOR, "a[href*='family'], button[aria-label*='member']")
    UPLOAD_REPORT_BTN = (By.XPATH, "//a[contains(@href, 'upload') or contains(text(), 'Upload')]")
    ASSISTANT_BTN = (By.XPATH, "//a[contains(@href, 'assistant') or contains(text(), 'Assistant')]")
    NAV_FAMILY = (By.XPATH, "//a[contains(@href, 'family')]")
    NAV_REPORTS = (By.XPATH, "//a[contains(@href, 'reports')]")
    NAV_ANALYTICS = (By.XPATH, "//a[contains(@href, 'analytics')]")
    NAV_SETTINGS = (By.XPATH, "//a[contains(@href, 'settings')]")

    def is_dashboard_loaded(self) -> bool:
        return self.is_displayed(self.HEADER_TITLE, timeout=5) or self.is_displayed(self.NAV_FAMILY, timeout=5)


class FamilyPage(BasePage):
    ADD_MEMBER_BTN = (By.XPATH, "//button[contains(text(), 'Add') or contains(text(), 'Member')]")
    MEMBER_CARDS = (By.CSS_SELECTOR, ".family-card, .grid > div")
    MEMBER_NAME_INPUT = (By.CSS_SELECTOR, "input[name='name'], input[placeholder*='Name']")
    MEMBER_AGE_INPUT = (By.CSS_SELECTOR, "input[name='age'], input[type='number']")
    RELATION_SELECT = (By.CSS_SELECTOR, "select[name='relation']")
    SAVE_MEMBER_BTN = (By.CSS_SELECTOR, "button[type='submit']")

    def open_family_page(self):
        self.open_url("/family")


class UploadPage(BasePage):
    FILE_INPUT = (By.CSS_SELECTOR, "input[type='file']")
    UPLOAD_ZONE = (By.CSS_SELECTOR, "div[class*='border-dashed'], label[for*='file']")
    SUBMIT_UPLOAD_BTN = (By.XPATH, "//button[contains(text(), 'Process') or contains(text(), 'Upload')]")
    SUCCESS_ALERT = (By.XPATH, "//*[contains(text(), 'Success') or contains(text(), 'uploaded')]")

    def open_upload_page(self):
        self.open_url("/upload")


class ReportsPage(BasePage):
    REPORT_SEARCH_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Search']")
    REPORT_ITEMS = (By.CSS_SELECTOR, "div[class*='border'], .report-card")
    ABNORMALITY_FILTER = (By.CSS_SELECTOR, "select[name*='filter'], button[class*='filter']")
    DELETE_REPORT_BTN = (By.XPATH, "//button[contains(text(), 'Delete') or contains(text(), 'Remove')]")

    def open_reports_page(self):
        self.open_url("/reports")


class AssistantPage(BasePage):
    CHAT_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Ask'], textarea[placeholder*='Ask']")
    SEND_BTN = (By.CSS_SELECTOR, "button[type='submit'], button[aria-label*='Send']")
    MESSAGE_BUBBLES = (By.CSS_SELECTOR, ".chat-message, div[class*='rounded']")

    def open_assistant_page(self):
        self.open_url("/assistant")

    def ask_question(self, query: str):
        self.send_keys(self.CHAT_INPUT, query)
        self.click(self.SEND_BTN)


class AnalyticsPage(BasePage):
    INSIGHTS_CARDS = (By.CSS_SELECTOR, ".grid > div")
    PREDICTION_SCORE = (By.XPATH, "//*[contains(text(), 'Score') or contains(text(), 'Risk')]")

    def open_analytics_page(self):
        self.open_url("/analytics")


class SettingsPage(BasePage):
    SECURITY_TAB = (By.XPATH, "//button[contains(text(), 'Security')]")
    NOTIFICATIONS_TAB = (By.XPATH, "//button[contains(text(), 'Notification')]")
    SYSTEM_INFO_TAB = (By.XPATH, "//button[contains(text(), 'About') or contains(text(), 'System')]")
    SAVE_SETTINGS_BTN = (By.XPATH, "//button[contains(text(), 'Save')]")

    def open_settings_page(self):
        self.open_url("/settings")
