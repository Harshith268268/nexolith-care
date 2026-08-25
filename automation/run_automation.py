"""
Convenience launcher for the Selenium E2E Automation Framework.
"""

import sys
import os

# Ensure root workspace directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from automation.tests.test_runner import SeleniumTestRunner

if __name__ == "__main__":
    runner = SeleniumTestRunner()
    code = runner.run_all_tests()
    sys.exit(code)
