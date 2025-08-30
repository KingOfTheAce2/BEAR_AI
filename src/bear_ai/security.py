import re
from typing import Pattern


def enable_cuda():
    """
    Future: detect and enable CUDA for local inference runtimes.
    Options:
      - llama.cpp CUDA build flags
      - PyTorch + bitsandbytes
    """
    raise NotImplementedError


_RE_PATTERNS: dict[str, Pattern[str]] = {
    # Basic, conservative regexes for common PII. These are intentionally simple
    # and not exhaustive; they minimize false positives while providing value.
    # They can be replaced by advanced pipelines (e.g., Presidio) later.
    "EMAIL": re.compile(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}\b"),
    # North American phone numbers in various formats: (123) 456-7890, 123-456-7890, 123.456.7890
    "PHONE": re.compile(r"(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}"),
    # US SSN: 123-45-6789 (very specific to reduce false positives)
    "SSN": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    # Credit card (basic Luhn-like length patterns; conservative separators)
    "CARD": re.compile(r"\b(?:\d[ -]?){13,19}\b"),
    # IPv4 address
    "IP": re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b"),
}


def scrub_pii(text: str) -> str:
    """
    Best-effort local PII redaction without external dependencies.
    Replaces common PII with bracketed tags: [EMAIL], [PHONE], [SSN], [CARD], [IP].

    This is a pragmatic baseline. For GDPR-grade workflows, integrate with
    advanced pipelines (e.g., Microsoft Presidio) later while keeping this
    fallback for offline minimal environments.
    """
    out = text
    # Replace longest/most specific first to avoid overlapping oddities
    order = ["EMAIL", "SSN", "PHONE", "CARD", "IP"]
    for key in order:
        out = _RE_PATTERNS[key].sub(f"[{key}]", out)
    return out
