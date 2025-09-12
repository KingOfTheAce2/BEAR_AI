"""
BEAR AI PII (Personally Identifiable Information) Package

This package provides comprehensive PII detection, scrubbing, and auditing capabilities
using Microsoft Presidio with custom Dutch language support and policy-based management.

Key Components:
- Scrubber: PII detection and anonymization using Presidio
- Policy: Configurable inbound/outbound scrubbing rules
- Audit: SHA256-based audit logging with JSONL format
- Dutch Support: Custom BSN/RSIN validation and Dutch NLP models

Environment Variables:
- PII_ENABLE: Enable/disable PII processing (default: false)
- PII_AUDIT: Enable audit logging (default: false)
- PII_SALT: Salt for stable tokenization (generates random if not set)
- PII_AUDIT_DIR: Directory for audit logs (default: ./logs/pii/)
- PII_CONFIDENCE_THRESHOLD: Minimum confidence for entity detection (default: 0.8)
"""

from .scrubber import Scrubber, PIIEntity
from .policy import Policy, PolicyConfig
from .audit import Audit, AuditEntry
from .dutch_recognizers import DutchBSNRecognizer, DutchRSINRecognizer

__version__ = "1.0.0"
__all__ = [
    "Scrubber",
    "PIIEntity", 
    "Policy",
    "PolicyConfig",
    "Audit",
    "AuditEntry",
    "DutchBSNRecognizer",
    "DutchRSINRecognizer"
]

# Backward compatibility with existing scrub_pii function
def scrub_pii(text: str) -> str:
    """
    Backward compatibility wrapper for the original scrub_pii function.
    
    Uses the new PII system if enabled via environment variables,
    otherwise falls back to the original regex-based approach.
    
    Args:
        text: Text to scrub for PII
        
    Returns:
        Text with PII replaced by anonymized tokens
    """
    import os
    
    # Check if new PII system is enabled
    if os.getenv("PII_ENABLE", "false").lower() == "true":
        try:
            # Use new Presidio-based system
            scrubber = Scrubber()
            policy = Policy()  # Use default policy
            return scrubber.scrub(text, policy)
        except Exception:
            # Fall back to original implementation on any error
            pass
    
    # Fall back to original regex-based implementation
    from ..security import scrub_pii as original_scrub_pii
    return original_scrub_pii(text)