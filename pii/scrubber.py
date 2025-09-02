import hashlib
from typing import Tuple, List

try:
    from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
    from presidio_anonymizer import AnonymizerEngine
    from presidio_anonymizer.entities import AnonymizerConfig
except Exception as _e:  # Graceful import error for offline/no-deps scenario
    AnalyzerEngine = None  # type: ignore
    RecognizerRegistry = None  # type: ignore
    AnonymizerEngine = None  # type: ignore
    AnonymizerConfig = None  # type: ignore

from .config import DEFAULTS, get_salt
from .custom_nl_ids import BSNRecognizer, RSINRecognizer


class Scrubber:
    def __init__(self, cfg: dict | None = None):
        self.cfg = cfg or DEFAULTS
        if AnalyzerEngine is None:
            raise RuntimeError(
                "Presidio dependencies not available. Install: pip install presidio-analyzer presidio-anonymizer spacy"
            )
        registry = RecognizerRegistry()
        registry.load_predefined_recognizers()
        registry.add_recognizer(BSNRecognizer())
        registry.add_recognizer(RSINRecognizer())
        self.analyzer = AnalyzerEngine(registry=registry)
        self.anonymizer = AnonymizerEngine()
        self.salt = get_salt()

    def _stable_id(self, raw: str) -> str:
        return hashlib.sha256((self.salt + raw).encode()).hexdigest()[:8]

    def _build_configs(self, text: str, results):
        mapping = self.cfg["anonymization_map"]
        conf: dict[str, AnonymizerConfig] = {}
        for r in results:
            ent = r.entity_type
            if ent in ["PERSON", "ORGANIZATION"]:
                token = mapping[ent].format(stable_id=self._stable_id(text[r.start : r.end]))
                conf[ent] = AnonymizerConfig("replace", {"new_value": token})
            elif ent in mapping:
                conf[ent] = AnonymizerConfig("replace", {"new_value": mapping[ent]})
        return conf

    def analyze(self, text: str, language: str) -> List:
        language = language if language in self.cfg["languages"] else self.cfg["language_default"]
        return self.analyzer.analyze(text=text, language=language, entities=self.cfg["entities_enabled"])  # type: ignore[arg-type]

    def anonymize(self, text: str, language: str | None = None) -> Tuple[str, list]:
        language = language or self.cfg["language_default"]
        results = self.analyze(text, language)
        results = [r for r in results if r.score >= self.cfg["min_confidence"]]
        configs = self._build_configs(text, results)
        anonymized = self.anonymizer.anonymize(  # type: ignore[union-attr]
            text=text, analyzer_results=results, anonymizers_config=configs
        ).text
        transforms = [{"type": r.entity_type, "start": r.start, "end": r.end} for r in results]
        return anonymized, transforms

