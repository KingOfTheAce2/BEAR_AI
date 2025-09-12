"""
BEAR AI Hardware Optimization
Dynamic optimization based on available hardware
"""

from .hardware_optimizer import (
    HardwareOptimizer,
    OptimizationProfile,
    HardwareCapabilities,
    get_hardware_optimizer,
    optimize_for_model
)

__all__ = [
    "HardwareOptimizer",
    "OptimizationProfile",
    "HardwareCapabilities",
    "get_hardware_optimizer",
    "optimize_for_model"
]