"""
BEAR AI Model Discovery System
Zero-click model discovery and intelligent recommendations
"""

from .model_discovery import (
    ModelDiscovery,
    ModelRecommendation,
    SystemProfile,
    discover_models,
    auto_install_best_model,
    get_model_discovery
)

__all__ = [
    "ModelDiscovery",
    "ModelRecommendation", 
    "SystemProfile",
    "discover_models",
    "auto_install_best_model",
    "get_model_discovery"
]