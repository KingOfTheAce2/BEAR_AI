"""
BEAR AI: Bridge for Expertise, Audit and Research
Privacy-First, Local-Only AI Assistant for Legal Professionals and Privacy Advocates
"""

__version__ = "0.1.0-alpha"
__author__ = "BEAR AI Contributors"
__email__ = "contributors@bear-ai.org"
__description__ = "BEAR AI: Privacy-First, Local-Only AI - Bridge for Expertise, Audit and Research"

from .logging_utils import _ensure_logger

_ensure_logger()

# Core modules
try:
    from . import chat, gui, scrub, download, inference
except ImportError:
    # Some modules may not be available depending on installation
    pass

# Make key components available at package level
__all__ = [
    "chat", 
    "gui", 
    "scrub", 
    "download", 
    "inference",
    "__version__",
    "__author__",
    "__email__",
    "__description__"
]
