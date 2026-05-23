import logging
import sys
from datetime import datetime

# Create logger
logger = logging.getLogger("eduvy")
logger.setLevel(logging.DEBUG)

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.DEBUG)

# Formatter
formatter = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
console_handler.setFormatter(formatter)

# Add handler to logger
logger.addHandler(console_handler)


def log_info(message: str):
    """Log info message."""
    logger.info(message)


def log_error(message: str, exc: Exception = None):
    """Log error message."""
    if exc:
        logger.error(f"{message}: {str(exc)}")
    else:
        logger.error(message)


def log_warning(message: str):
    """Log warning message."""
    logger.warning(message)


def log_debug(message: str):
    """Log debug message."""
    logger.debug(message)
