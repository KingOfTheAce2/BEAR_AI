import hashlib
import json
import os
import time


class Audit:
    def __init__(
        self,
        path: str = "logs/audit.jsonl",
        enabled: bool = False,
        detector_version: str = "presidio-local-1",
        policy_version: str = "local-1",
    ):
        self.path = path
        self.enabled = enabled
        self.detector_version = detector_version
        self.policy_version = policy_version
        if enabled:
            os.makedirs(os.path.dirname(path), exist_ok=True)

    def _h(self, s: str) -> str:
        return hashlib.sha256(s.encode()).hexdigest()

    def record(self, direction: str, before: str, after: str, entities: list, language: str = "en"):
        if not self.enabled:
            return
        entry = {
            "ts": int(time.time()),
            "direction": direction,
            "language": language,
            "hash_before": self._h(before or ""),
            "hash_after": self._h(after or ""),
            "entities": entities,
            "detector_version": self.detector_version,
            "policy_version": self.policy_version,
        }
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

