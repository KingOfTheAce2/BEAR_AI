import os
import re
from typing import Pattern


def enable_cuda() -> bool:
    """Detect an NVIDIA GPU and enable CUDA acceleration.

    Returns ``True`` if CUDA support was enabled. Detection relies on
    ``pynvml`` which is an optional dependency. When a GPU is found the
    ``LLAMA_CPP_USE_CUDA`` environment variable is set so that
    ``llama-cpp-python`` will offload layers to the GPU.

    The helper is intentionally light‑weight – failures simply result in
    returning ``False`` without raising.
    """

    try:
        import pynvml  # type: ignore
    except Exception:
        return False

    try:
        pynvml.nvmlInit()
        has_gpu = pynvml.nvmlDeviceGetCount() > 0
    except Exception:
        return False
    finally:
        try:  # pragma: no cover - best effort shutdown
            pynvml.nvmlShutdown()
        except Exception:
            pass

    if not has_gpu:
        return False

    os.environ.setdefault("LLAMA_CPP_USE_CUDA", "1")
    return True


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
