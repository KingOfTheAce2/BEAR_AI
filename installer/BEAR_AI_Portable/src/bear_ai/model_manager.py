#!/usr/bin/env python3
"""
BEAR AI Model Manager
Handles model selection, download, and compatibility checking
"""

import os
import json
import psutil
import platform
import subprocess
import requests
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import hashlib

@dataclass
class ModelInfo:
    """Information about an AI model"""
    name: str
    size: str
    file_size_gb: float
    ram_required_gb: int
    vram_recommended_gb: int
    description: str
    url: str
    filename: str
    quantization: str
    speed_rating: int  # 1-5 stars
    quality_rating: int  # 1-5 stars
    compatibility: List[str]  # ["cpu", "gpu", "apple_silicon"]

class HardwareDetector:
    """Detect system hardware specifications"""
    
    def __init__(self):
        self.cpu_count = psutil.cpu_count(logical=False)
        self.cpu_count_logical = psutil.cpu_count(logical=True)
        self.ram_gb = round(psutil.virtual_memory().total / (1024**3))
        self.gpu_info = self._detect_gpu()
        self.platform_info = self._get_platform_info()
    
    def _detect_gpu(self) -> Dict:
        """Detect GPU information"""
        gpu_info = {
            "has_nvidia": False,
            "has_amd": False,
            "vram_gb": 0,
            "gpu_names": []
        }
        
        try:
            # Try nvidia-ml-py for NVIDIA GPUs
            import pynvml
            pynvml.nvmlInit()
            device_count = pynvml.nvmlDeviceGetCount()
            
            for i in range(device_count):
                handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                name = pynvml.nvmlDeviceGetName(handle).decode('utf-8')
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                vram_gb = mem_info.total / (1024**3)
                
                gpu_info["has_nvidia"] = True
                gpu_info["gpu_names"].append(name)
                gpu_info["vram_gb"] = max(gpu_info["vram_gb"], vram_gb)
                
        except ImportError:
            pass
        except Exception:
            pass
        
        # Try Windows wmic for basic GPU detection
        if not gpu_info["has_nvidia"] and platform.system() == "Windows":
            try:
                result = subprocess.run([
                    "wmic", "path", "win32_VideoController", 
                    "get", "name,AdapterRAM", "/format:csv"
                ], capture_output=True, text=True, timeout=10)
                
                for line in result.stdout.split('\n'):
                    if 'NVIDIA' in line.upper():
                        gpu_info["has_nvidia"] = True
                        gpu_info["gpu_names"].append("NVIDIA GPU (detected)")
                    elif 'AMD' in line.upper() or 'RADEON' in line.upper():
                        gpu_info["has_amd"] = True
                        gpu_info["gpu_names"].append("AMD GPU (detected)")
            except Exception:
                pass
        
        return gpu_info
    
    def _get_platform_info(self) -> Dict:
        """Get platform information"""
        return {
            "system": platform.system(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "architecture": platform.architecture()[0]
        }
    
    def get_recommendation_tier(self) -> str:
        """Get hardware tier for model recommendations"""
        if self.gpu_info["has_nvidia"] and self.gpu_info["vram_gb"] >= 16:
            return "high_end_gpu"
        elif self.gpu_info["has_nvidia"] and self.gpu_info["vram_gb"] >= 8:
            return "mid_range_gpu"
        elif self.gpu_info["has_nvidia"] and self.gpu_info["vram_gb"] >= 4:
            return "low_end_gpu"
        elif self.ram_gb >= 32:
            return "high_end_cpu"
        elif self.ram_gb >= 16:
            return "mid_range_cpu"
        else:
            return "low_end_cpu"

class ModelManager:
    """Manage AI models for BEAR AI"""
    
    def __init__(self, models_dir: str = "models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        self.hardware = HardwareDetector()
        self.available_models = self._load_model_catalog()
    
    def _load_model_catalog(self) -> List[ModelInfo]:
        """Load available models catalog"""
        return [
            # Small models (good for low-end systems)
            ModelInfo(
                name="Llama 3.2 3B Instruct (Q4)",
                size="3B parameters",
                file_size_gb=2.0,
                ram_required_gb=4,
                vram_recommended_gb=2,
                description="Fast, lightweight model perfect for basic conversations. Ideal for older computers.",
                url="https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf",
                filename="phi-3-mini-4k-instruct-q4.gguf",
                quantization="Q4_K_M",
                speed_rating=5,
                quality_rating=3,
                compatibility=["cpu", "gpu"]
            ),
            
            ModelInfo(
                name="Phi-3 Mini 3.8B (Q4)",
                size="3.8B parameters",
                file_size_gb=2.3,
                ram_required_gb=6,
                vram_recommended_gb=3,
                description="Microsoft's efficient small model with good reasoning capabilities.",
                url="https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf",
                filename="phi-3-mini-4k-instruct-q4.gguf",
                quantization="Q4_K_M",
                speed_rating=5,
                quality_rating=4,
                compatibility=["cpu", "gpu"]
            ),
            
            # Medium models (balanced performance)
            ModelInfo(
                name="Llama 3.1 8B Instruct (Q4)",
                size="8B parameters",
                file_size_gb=4.7,
                ram_required_gb=8,
                vram_recommended_gb=6,
                description="Excellent balance of speed and quality. Great for most use cases.",
                url="https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf",
                filename="Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf",
                quantization="Q4_K_M",
                speed_rating=4,
                quality_rating=4,
                compatibility=["cpu", "gpu"]
            ),
            
            ModelInfo(
                name="Mistral 7B Instruct (Q4)",
                size="7B parameters",
                file_size_gb=4.1,
                ram_required_gb=8,
                vram_recommended_gb=5,
                description="High-quality French model with excellent instruction following.",
                url="https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf",
                filename="mistral-7b-instruct-v0.2.Q4_K_M.gguf",
                quantization="Q4_K_M",
                speed_rating=4,
                quality_rating=5,
                compatibility=["cpu", "gpu"]
            ),
            
            # Large models (high-end systems)
            ModelInfo(
                name="Llama 3.1 70B Instruct (Q4)",
                size="70B parameters",
                file_size_gb=40.0,
                ram_required_gb=48,
                vram_recommended_gb=32,
                description="Top-tier model with exceptional capabilities. Requires powerful hardware.",
                url="https://huggingface.co/bartowski/Meta-Llama-3.1-70B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-70B-Instruct-Q4_K_M.gguf",
                filename="Meta-Llama-3.1-70B-Instruct-Q4_K_M.gguf",
                quantization="Q4_K_M",
                speed_rating=2,
                quality_rating=5,
                compatibility=["gpu"]
            ),
            
            # Specialized models
            ModelInfo(
                name="CodeLlama 7B Python (Q4)",
                size="7B parameters",
                file_size_gb=3.8,
                ram_required_gb=8,
                vram_recommended_gb=5,
                description="Specialized for code generation and programming assistance.",
                url="https://huggingface.co/TheBloke/CodeLlama-7B-Python-GGUF/resolve/main/codellama-7b-python.Q4_K_M.gguf",
                filename="codellama-7b-python.Q4_K_M.gguf",
                quantization="Q4_K_M",
                speed_rating=4,
                quality_rating=4,
                compatibility=["cpu", "gpu"]
            )
        ]
    
    def get_compatible_models(self) -> List[ModelInfo]:
        """Get models compatible with current hardware"""
        tier = self.hardware.get_recommendation_tier()
        compatible = []
        
        for model in self.available_models:
            # Check RAM requirements
            if model.ram_required_gb > self.hardware.ram_gb:
                continue
            
            # Check GPU requirements
            if model.vram_recommended_gb > 0:
                if not self.hardware.gpu_info["has_nvidia"]:
                    # Can still run on CPU if it supports it
                    if "cpu" not in model.compatibility:
                        continue
                elif model.vram_recommended_gb > self.hardware.gpu_info["vram_gb"]:
                    # GPU model but not enough VRAM, check if CPU compatible
                    if "cpu" not in model.compatibility:
                        continue
            
            compatible.append(model)
        
        # Sort by recommendation score
        def recommendation_score(model):
            score = 0
            # Prefer models that fit well in available resources
            if model.ram_required_gb <= self.hardware.ram_gb * 0.8:
                score += 2
            if model.vram_recommended_gb <= self.hardware.gpu_info["vram_gb"]:
                score += 2
            # Balance speed and quality
            score += model.speed_rating + model.quality_rating
            return score
        
        compatible.sort(key=recommendation_score, reverse=True)
        return compatible
    
    def get_installed_models(self) -> List[str]:
        """Get list of installed model files"""
        installed = []
        for model_file in self.models_dir.glob("*.gguf"):
            installed.append(model_file.name)
        return installed
    
    def is_model_installed(self, model: ModelInfo) -> bool:
        """Check if a model is already installed"""
        return (self.models_dir / model.filename).exists()
    
    def get_model_download_progress(self, model: ModelInfo) -> Optional[float]:
        """Get download progress for a model (0.0 to 1.0)"""
        temp_file = self.models_dir / f"{model.filename}.tmp"
        if temp_file.exists():
            current_size = temp_file.stat().st_size
            expected_size = model.file_size_gb * 1024 * 1024 * 1024
            return min(current_size / expected_size, 1.0)
        return None
    
    def download_model(self, model: ModelInfo, progress_callback=None) -> bool:
        """Download a model with progress tracking"""
        try:
            temp_file = self.models_dir / f"{model.filename}.tmp"
            final_file = self.models_dir / model.filename
            
            # Check if already downloading
            if temp_file.exists():
                return False
            
            # Start download
            response = requests.get(model.url, stream=True)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            downloaded_size = 0
            
            with open(temp_file, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded_size += len(chunk)
                        
                        if progress_callback and total_size > 0:
                            progress = downloaded_size / total_size
                            progress_callback(progress)
            
            # Move to final location
            temp_file.rename(final_file)
            return True
            
        except Exception as e:
            # Clean up temp file on error
            if temp_file.exists():
                temp_file.unlink()
            raise e
    
    def delete_model(self, model: ModelInfo) -> bool:
        """Delete an installed model"""
        model_file = self.models_dir / model.filename
        if model_file.exists():
            model_file.unlink()
            return True
        return False
    
    def get_hardware_info(self) -> Dict:
        """Get detailed hardware information"""
        return {
            "cpu_cores": self.hardware.cpu_count,
            "cpu_threads": self.hardware.cpu_count_logical,
            "ram_gb": self.hardware.ram_gb,
            "gpu_info": self.hardware.gpu_info,
            "platform": self.hardware.platform_info,
            "recommendation_tier": self.hardware.get_recommendation_tier()
        }

# Global model manager instance
_global_model_manager: Optional[ModelManager] = None

def get_model_manager() -> ModelManager:
    """Get global model manager instance"""
    global _global_model_manager
    if _global_model_manager is None:
        _global_model_manager = ModelManager()
    return _global_model_manager