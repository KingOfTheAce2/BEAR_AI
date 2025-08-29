"""BEAR AI package initialization and logging utilities."""
from __future__ import annotations

import logging
from pathlib import Path

# Configure package level logging to a dedicated file
LOG_FILE = Path(__file__).resolve().with_name("bear_ai.log")
logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("bear_ai")


def audit_log(message: str) -> None:
    """Record an audit message with a timestamp."""
    logger.info(message)


from .model_downloader import download_model, list_model_files

__all__ = ["download_model", "list_model_files", "audit_log"]
