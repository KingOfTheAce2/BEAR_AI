"""Hardware profiles and configuration management for BEAR_AI.

This module provides hardware profile management, automatic configuration,
and performance optimization based on detected hardware capabilities.
"""

from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Union, Any
from dataclasses import dataclass, asdict
from enum import Enum

from .hw import HardwareTier, hw_summary, get_hardware_profile
from .security import detect_gpu_capabilities, GPUInfo


class ProfileType(Enum):
    """Types of hardware profiles."""
    MINIMAL = "minimal"          # Basic CPU-only configuration
    BALANCED = "balanced"        # Balanced CPU/GPU configuration
    PERFORMANCE = "performance"  # High-performance configuration
    MEMORY_OPTIMIZED = "memory_optimized"  # Optimized for memory efficiency
    CUSTOM = "custom"           # User-defined configuration


@dataclass
class HardwareProfile:
    """Complete hardware profile with optimization settings."""
    name: str
    profile_type: ProfileType
    hardware_tier: HardwareTier
    
    # Hardware specifications
    ram_gb: float
    free_ram_gb: float
    gpu_vram_gb: Optional[float]
    gpu_info: Optional[GPUInfo]
    
    # Model recommendations
    max_model_size_gb: float
    recommended_models: List[str]
    
    # Performance settings
    batch_size: int
    context_window: int
    max_tokens: int
    temperature: float
    
    # Optimization flags
    use_gpu: bool
    use_quantization: bool
    use_mmap: bool
    use_flash_attention: bool
    
    # Environment variables
    env_vars: Dict[str, str]
    
    # Custom settings
    custom_settings: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert profile to dictionary."""
        data = asdict(self)
        # Convert enums to strings
        data['profile_type'] = self.profile_type.value
        data['hardware_tier'] = self.hardware_tier.value
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> HardwareProfile:
        """Create profile from dictionary."""
        # Convert string enums back
        data['profile_type'] = ProfileType(data['profile_type'])
        data['hardware_tier'] = HardwareTier(data['hardware_tier'])
        
        # Handle GPU info
        if data.get('gpu_info'):
            data['gpu_info'] = GPUInfo(**data['gpu_info'])
        
        return cls(**data)


class ProfileManager:
    """Manages hardware profiles and automatic configuration."""
    
    def __init__(self, config_dir: Optional[Path] = None):
        self.config_dir = config_dir or Path.home() / ".bear_ai" / "profiles"
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.logger = logging.getLogger(__name__)
        self._profiles: Dict[str, HardwareProfile] = {}
        self._load_default_profiles()

    def _load_default_profiles(self):
        """Load default hardware profiles."""
        # Detect current hardware
        hw = hw_summary()
        hw_tier = get_hardware_profile(hw)
        gpus = detect_gpu_capabilities()
        gpu_info = gpus.get('nvidia')
        
        # Create profiles based on common hardware configurations
        profiles = [
            self._create_minimal_profile(hw, hw_tier),
            self._create_balanced_profile(hw, hw_tier, gpu_info),
            self._create_performance_profile(hw, hw_tier, gpu_info),
            self._create_memory_optimized_profile(hw, hw_tier, gpu_info)
        ]
        
        for profile in profiles:
            self._profiles[profile.name] = profile

    def _create_minimal_profile(self, hw: Dict, hw_tier: HardwareTier) -> HardwareProfile:
        """Create minimal CPU-only profile."""
        return HardwareProfile(
            name="minimal",
            profile_type=ProfileType.MINIMAL,
            hardware_tier=hw_tier,
            ram_gb=hw["ram_gb"],
            free_ram_gb=hw["free_ram_gb"],
            gpu_vram_gb=None,
            gpu_info=None,
            max_model_size_gb=min(2.0, hw["free_ram_gb"] * 0.5),
            recommended_models=[
                "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
                "nlpaueb/legal-bert-small-uncased"
            ],
            batch_size=1,
            context_window=2048,
            max_tokens=512,
            temperature=0.7,
            use_gpu=False,
            use_quantization=True,
            use_mmap=True,
            use_flash_attention=False,
            env_vars={
                "LLAMA_CPP_USE_CUDA": "0",
                "LLAMA_CPP_USE_METAL": "0",
                "LLAMA_CPP_USE_MMAP": "1"
            },
            custom_settings={}
        )

    def _create_balanced_profile(self, hw: Dict, hw_tier: HardwareTier, gpu_info: Optional[GPUInfo]) -> HardwareProfile:
        """Create balanced CPU/GPU profile."""
        use_gpu = gpu_info is not None and gpu_info.memory_gb >= 4
        max_model_size = min(8.0, hw["free_ram_gb"] * 0.7)
        
        if use_gpu and gpu_info:
            max_model_size = min(max_model_size, gpu_info.memory_gb * 0.8)

        env_vars = {
            "LLAMA_CPP_USE_MMAP": "1",
            "LLAMA_CPP_CUDA_F16": "1" if use_gpu else "0"
        }
        
        if use_gpu:
            env_vars["LLAMA_CPP_USE_CUDA"] = "1"
            if gpu_info and gpu_info.memory_gb >= 8:
                env_vars["LLAMA_CPP_CUDA_GRAPHS"] = "1"
        else:
            env_vars["LLAMA_CPP_USE_CUDA"] = "0"

        return HardwareProfile(
            name="balanced",
            profile_type=ProfileType.BALANCED,
            hardware_tier=hw_tier,
            ram_gb=hw["ram_gb"],
            free_ram_gb=hw["free_ram_gb"],
            gpu_vram_gb=gpu_info.memory_gb if gpu_info else None,
            gpu_info=gpu_info,
            max_model_size_gb=max_model_size,
            recommended_models=[
                "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
                "AdaptLLM/law-LLM",
                "Equall/Saul-7B-Base"
            ],
            batch_size=2 if use_gpu else 1,
            context_window=4096,
            max_tokens=1024,
            temperature=0.7,
            use_gpu=use_gpu,
            use_quantization=True,
            use_mmap=True,
            use_flash_attention=use_gpu and gpu_info and gpu_info.compute_capability and float(gpu_info.compute_capability.split('.')[0]) >= 8.0,
            env_vars=env_vars,
            custom_settings={}
        )

    def _create_performance_profile(self, hw: Dict, hw_tier: HardwareTier, gpu_info: Optional[GPUInfo]) -> HardwareProfile:
        """Create high-performance profile."""
        use_gpu = gpu_info is not None and gpu_info.memory_gb >= 8
        max_model_size = min(32.0, hw["free_ram_gb"] * 0.8)
        
        if use_gpu and gpu_info:
            max_model_size = min(max_model_size, gpu_info.memory_gb * 0.9)

        env_vars = {
            "LLAMA_CPP_USE_MMAP": "1",
            "LLAMA_CPP_CUDA_F16": "1" if use_gpu else "0"
        }
        
        if use_gpu and gpu_info:
            env_vars.update({
                "LLAMA_CPP_USE_CUDA": "1",
                "LLAMA_CPP_CUDA_GRAPHS": "1",
                "LLAMA_CPP_CUDA_FORCE_DMMV": "1",
                "LLAMA_CPP_CUDA_PEER_MAX_TX_COUNT": "4"
            })
            
            # Advanced optimizations for newer GPUs
            if gpu_info.compute_capability and float(gpu_info.compute_capability.split('.')[0]) >= 8.0:
                env_vars["LLAMA_CPP_CUDA_MMVQ"] = "1"
        else:
            env_vars["LLAMA_CPP_USE_CUDA"] = "0"

        return HardwareProfile(
            name="performance",
            profile_type=ProfileType.PERFORMANCE,
            hardware_tier=hw_tier,
            ram_gb=hw["ram_gb"],
            free_ram_gb=hw["free_ram_gb"],
            gpu_vram_gb=gpu_info.memory_gb if gpu_info else None,
            gpu_info=gpu_info,
            max_model_size_gb=max_model_size,
            recommended_models=[
                "Equall/SaulLM-54B",
                "microsoft/Phi-3-small-4k-instruct",
                "bigscience/bloom"
            ],
            batch_size=4 if use_gpu else 2,
            context_window=8192,
            max_tokens=2048,
            temperature=0.7,
            use_gpu=use_gpu,
            use_quantization=False,  # No quantization for performance
            use_mmap=True,
            use_flash_attention=use_gpu and gpu_info and gpu_info.compute_capability and float(gpu_info.compute_capability.split('.')[0]) >= 8.0,
            env_vars=env_vars,
            custom_settings={"aggressive_optimization": True}
        )

    def _create_memory_optimized_profile(self, hw: Dict, hw_tier: HardwareTier, gpu_info: Optional[GPUInfo]) -> HardwareProfile:
        """Create memory-optimized profile."""
        use_gpu = gpu_info is not None and gpu_info.memory_gb >= 4
        max_model_size = min(4.0, hw["free_ram_gb"] * 0.4)  # Conservative memory usage
        
        if use_gpu and gpu_info:
            max_model_size = min(max_model_size, gpu_info.memory_gb * 0.6)

        env_vars = {
            "LLAMA_CPP_USE_MMAP": "1",
            "LLAMA_CPP_CUDA_F16": "0",  # Use FP32 to save memory
        }
        
        if use_gpu:
            env_vars.update({
                "LLAMA_CPP_USE_CUDA": "1",
                "LLAMA_CPP_CUDA_PEER_MAX_TX_COUNT": "1"
            })
        else:
            env_vars["LLAMA_CPP_USE_CUDA"] = "0"

        return HardwareProfile(
            name="memory_optimized",
            profile_type=ProfileType.MEMORY_OPTIMIZED,
            hardware_tier=hw_tier,
            ram_gb=hw["ram_gb"],
            free_ram_gb=hw["free_ram_gb"],
            gpu_vram_gb=gpu_info.memory_gb if gpu_info else None,
            gpu_info=gpu_info,
            max_model_size_gb=max_model_size,
            recommended_models=[
                "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
                "nlpaueb/legal-bert-small-uncased",
                "law-ai/InCaseLawBERT"
            ],
            batch_size=1,
            context_window=2048,
            max_tokens=512,
            temperature=0.7,
            use_gpu=use_gpu,
            use_quantization=True,
            use_mmap=True,
            use_flash_attention=False,
            env_vars=env_vars,
            custom_settings={"memory_conservative": True}
        )

    def get_profile(self, name: str) -> Optional[HardwareProfile]:
        """Get profile by name."""
        return self._profiles.get(name)

    def get_optimal_profile(self) -> HardwareProfile:
        """Get the optimal profile for current hardware."""
        hw = hw_summary()
        hw_tier = get_hardware_profile(hw)
        
        # Select optimal profile based on hardware tier
        if hw_tier == HardwareTier.WORKSTATION:
            return self._profiles.get("performance", self._profiles["balanced"])
        elif hw_tier == HardwareTier.HIGH_END:
            return self._profiles.get("balanced", self._profiles["minimal"])
        elif hw_tier == HardwareTier.MID_RANGE:
            return self._profiles.get("balanced", self._profiles["minimal"])
        else:  # LOW_END
            return self._profiles.get("memory_optimized", self._profiles["minimal"])

    def list_profiles(self) -> List[str]:
        """List all available profiles."""
        return list(self._profiles.keys())

    def save_profile(self, profile: HardwareProfile, filename: Optional[str] = None):
        """Save profile to disk."""
        if not filename:
            filename = f"{profile.name}.json"
        
        filepath = self.config_dir / filename
        
        try:
            with open(filepath, 'w') as f:
                json.dump(profile.to_dict(), f, indent=2, default=str)
            self.logger.info(f"Saved profile '{profile.name}' to {filepath}")
        except Exception as e:
            self.logger.error(f"Failed to save profile '{profile.name}': {e}")

    def load_profile(self, filename: str) -> Optional[HardwareProfile]:
        """Load profile from disk."""
        filepath = self.config_dir / filename
        
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            profile = HardwareProfile.from_dict(data)
            self._profiles[profile.name] = profile
            self.logger.info(f"Loaded profile '{profile.name}' from {filepath}")
            return profile
            
        except Exception as e:
            self.logger.error(f"Failed to load profile from '{filename}': {e}")
            return None

    def create_custom_profile(
        self,
        name: str,
        base_profile: str = "balanced",
        **overrides
    ) -> HardwareProfile:
        """Create a custom profile based on an existing one."""
        base = self._profiles.get(base_profile)
        if not base:
            raise ValueError(f"Base profile '{base_profile}' not found")
        
        # Create a copy and apply overrides
        profile_data = base.to_dict()
        profile_data.update(overrides)
        profile_data["name"] = name
        profile_data["profile_type"] = ProfileType.CUSTOM
        
        custom_profile = HardwareProfile.from_dict(profile_data)
        self._profiles[name] = custom_profile
        
        self.logger.info(f"Created custom profile '{name}' based on '{base_profile}'")
        return custom_profile

    def apply_profile(self, profile: Union[str, HardwareProfile]) -> Dict[str, str]:
        """Apply a profile's environment variables."""
        if isinstance(profile, str):
            profile = self._profiles.get(profile)
            if not profile:
                raise ValueError(f"Profile '{profile}' not found")
        
        applied_vars = {}
        for key, value in profile.env_vars.items():
            import os
            os.environ.setdefault(key, value)
            applied_vars[key] = value
        
        self.logger.info(f"Applied profile '{profile.name}' with {len(applied_vars)} environment variables")
        return applied_vars

    def get_profile_recommendations(self, use_case: str = "general") -> List[str]:
        """Get profile recommendations based on use case."""
        hw = hw_summary()
        hw_tier = get_hardware_profile(hw)
        
        recommendations = []
        
        if use_case == "legal":
            if hw_tier in [HardwareTier.HIGH_END, HardwareTier.WORKSTATION]:
                recommendations = ["performance", "balanced"]
            else:
                recommendations = ["balanced", "memory_optimized"]
        elif use_case == "chat":
            if hw_tier in [HardwareTier.HIGH_END, HardwareTier.WORKSTATION]:
                recommendations = ["performance", "balanced"]
            else:
                recommendations = ["balanced", "minimal"]
        elif use_case == "embedding":
            recommendations = ["memory_optimized", "minimal"]
        else:  # general
            recommendations = ["balanced", "performance", "memory_optimized", "minimal"]
        
        # Filter to only include profiles that exist
        return [p for p in recommendations if p in self._profiles]


# Global profile manager
_profile_manager = ProfileManager()


def get_profile_manager() -> ProfileManager:
    """Get the global profile manager instance."""
    return _profile_manager


def get_optimal_profile() -> HardwareProfile:
    """Get the optimal hardware profile for current system."""
    return _profile_manager.get_optimal_profile()


def apply_optimal_profile() -> Dict[str, str]:
    """Apply the optimal hardware profile to environment."""
    profile = get_optimal_profile()
    return _profile_manager.apply_profile(profile)


def list_available_profiles() -> List[str]:
    """List all available hardware profiles."""
    return _profile_manager.list_profiles()


def get_profile_info(name: str) -> Optional[Dict[str, Any]]:
    """Get detailed information about a profile."""
    profile = _profile_manager.get_profile(name)
    return profile.to_dict() if profile else None