"""
Centralized Logger Utility for Selenium E2E Automation Framework.
"""

import os
import logging
import sys
from automation.config.config import Config

class AutomationLogger:
    _logger = None

    @classmethod
    def get_logger(cls) -> logging.Logger:
        if cls._logger is None:
            os.makedirs(Config.LOGS_DIR, exist_ok=True)
            log_file = os.path.join(Config.LOGS_DIR, "automation.log")

            logger = logging.getLogger("SeleniumFramework")
            logger.setLevel(logging.DEBUG)

            # Prevent duplicate handlers
            if not logger.handlers:
                # File Handler
                fh = logging.FileHandler(log_file, mode='a', encoding='utf-8')
                fh.setLevel(logging.DEBUG)
                file_formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s')
                fh.setFormatter(file_formatter)

                # Console Handler
                try:
                    if hasattr(sys.stdout, 'reconfigure'):
                        sys.stdout.reconfigure(encoding='utf-8')
                except Exception:
                    pass
                ch = logging.StreamHandler(sys.stdout)
                ch.setLevel(logging.INFO)
                console_formatter = logging.Formatter('[%(asctime)s] [%(levelname)s]: %(message)s')
                ch.setFormatter(console_formatter)

                logger.addHandler(fh)
                logger.addHandler(ch)


            cls._logger = logger

        return cls._logger
