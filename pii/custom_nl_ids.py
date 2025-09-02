import re
from presidio_analyzer import Pattern, PatternRecognizer

_BSN_RE = re.compile(r"(?<!\d)(\d{8,9})(?!\d)")
_RSIN_RE = re.compile(r"(?<!\d)(\d{9})(?!\d)")


def _elfproef_bsn(value: str) -> bool:
    # BSN 9 digits. If 8 digits, prepend 0 then test.
    v = value if len(value) == 9 else ("0" + value if len(value) == 8 else None)
    if not v or not v.isdigit():
        return False
    weights = [9, 8, 7, 6, 5, 4, 3, 2, -1]
    s = sum(int(d) * w for d, w in zip(v, weights))
    return s % 11 == 0


def _elfproef_rsin(value: str) -> bool:
    # RSIN 9 digits. Standard 11-test with positive weights.
    if len(value) != 9 or not value.isdigit():
        return False
    weights = [9, 8, 7, 6, 5, 4, 3, 2, 1]
    s = sum(int(d) * w for d, w in zip(value, weights))
    return s % 11 == 0


class BSNRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [Pattern("bsn_generic", r"(?<!\\d)\\d{8,9}(?!\\d)", 0.1)]
        super().__init__(
            supported_entity="BSN",
            patterns=patterns,
            context=["bsn", "burgerservicenummer", "bsn-nummer", "bsn nummer", "sofinummer"],
        )

    def analyze(self, text, entities, nlp_artifacts=None):
        results = super().analyze(text, entities, nlp_artifacts)
        filtered = []
        for r in results:
            candidate = text[r.start : r.end]
            if _elfproef_bsn(candidate):
                r.score = max(r.score, 0.85)
                filtered.append(r)
        return filtered


class RSINRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [Pattern("rsin_generic", r"(?<!\\d)\\d{9}(?!\\d)", 0.1)]
        super().__init__(
            supported_entity="RSIN",
            patterns=patterns,
            context=[
                "rsin",
                "rechtspersonen",
                "rechtspersonen en samenwerkingsverbanden",
                "fiscaal nummer",
            ],
        )

    def analyze(self, text, entities, nlp_artifacts=None):
        results = super().analyze(text, entities, nlp_artifacts)
        filtered = []
        for r in results:
            candidate = text[r.start : r.end]
            if _elfproef_rsin(candidate):
                r.score = max(r.score, 0.85)
                filtered.append(r)
        return filtered

