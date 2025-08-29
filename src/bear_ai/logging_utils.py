import json
import logging
import pathlib
from logging.handlers import RotatingFileHandler
from datetime import datetime

LOG_PATH = pathlib.Path("bear_ai.log")

def _ensure_logger() -> logging.Logger:
    logger = logging.getLogger("bear_ai")
    if not logger.handlers:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        handler = RotatingFileHandler(LOG_PATH, maxBytes=2_000_000, backupCount=3, encoding="utf-8")
        fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
        handler.setFormatter(fmt)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger

def audit_log(event: str, details: dict):
    logger = _ensure_logger()
    payload = {"event": event, "ts": datetime.utcnow().isoformat() + "Z", **details}
    logger.info("AUDIT %s", json.dumps(payload, ensure_ascii=False))
