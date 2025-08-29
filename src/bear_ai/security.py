"""Security utilities for BEAR AI.

This module will eventually integrate with tools like Presidio and NeMo to
provide privacy-preserving features and GPU acceleration helpers."""


def enable_cuda() -> None:
    """Enable CUDA acceleration if available."""
    raise NotImplementedError("CUDA enabling not implemented")


def scrub_pii(text: str) -> str:
    """Remove personally identifiable information from *text*.

    Future implementations may leverage Microsoft Presidio or NVIDIA NeMo to
    perform entity detection and redaction.
    """
    raise NotImplementedError("PII scrubbing not implemented")
