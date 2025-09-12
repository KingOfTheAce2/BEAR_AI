"""
Model Discovery System
Auto-discover and recommend local models based on system capabilities
"""

import asyncio
import json
import logging
import platform
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse

import psutil
import requests
from huggingface_hub import HfApi, list_models

logger = logging.getLogger(__name__)


@dataclass
class SystemProfile:
    """System hardware profile"""
    os: str
    arch: str
    cpu_cores: int
    ram_gb: float
    gpu_info: List[Dict]
    storage_gb: float
    network_speed: str  # fast, medium, slow


@dataclass
class ModelRecommendation:
    """Model recommendation with reasoning"""
    model_id: str
    model_name: str
    size_gb: float
    format: str  # GGUF, MLX, PyTorch, etc.
    quantization: Optional[str]
    download_url: str
    reason: str
    compatibility_score: float
    estimated_speed: str  # tokens/sec estimate
    memory_usage: str  # RAM/VRAM usage estimate


class ModelDiscovery:
    """Discovers and recommends optimal local models"""
    
    def __init__(self, cache_dir: Optional[Path] = None):
        self.cache_dir = cache_dir or Path.home() / ".bear_ai" / "model_cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.hf_api = HfApi()
        self.system_profile = None
        
        # Model repositories and formats
        self.model_sources = {
            "huggingface": {
                "api": self.hf_api,
                "formats": ["GGUF", "MLX", "PyTorch", "ONNX", "TensorRT"]
            },
            "ollama": {
                "registry_url": "https://registry.ollama.ai/v2",
                "formats": ["GGUF", "Ollama"]
            },
            "lm_studio": {
                "catalog_url": "https://catalog.lmstudio.ai/api/models",
                "formats": ["GGUF", "MLX"]
            }
        }
        
        logger.info("ModelDiscovery initialized")
    
    async def profile_system(self) -> SystemProfile:
        """Profile current system capabilities"""
        
        if self.system_profile:
            return self.system_profile
        
        logger.info("Profiling system capabilities...")
        
        # Basic system info
        os_info = platform.system()
        arch = platform.machine()
        cpu_cores = psutil.cpu_count(logical=False)
        
        # Memory info
        memory = psutil.virtual_memory()
        ram_gb = memory.total / (1024**3)
        
        # Storage info
        disk = psutil.disk_usage('/')
        storage_gb = disk.free / (1024**3)
        
        # GPU detection
        gpu_info = await self._detect_gpus()
        
        # Network speed estimation
        network_speed = await self._estimate_network_speed()
        
        self.system_profile = SystemProfile(
            os=os_info,
            arch=arch,
            cpu_cores=cpu_cores,
            ram_gb=ram_gb,
            gpu_info=gpu_info,
            storage_gb=storage_gb,
            network_speed=network_speed
        )
        
        logger.info(f"System profile: {ram_gb:.1f}GB RAM, {len(gpu_info)} GPUs, {storage_gb:.1f}GB free")
        return self.system_profile
    
    async def _detect_gpus(self) -> List[Dict]:
        """Detect available GPUs"""
        gpu_info = []
        
        try:
            # Try NVIDIA GPUs first
            try:
                import nvidia_ml_py as nvml
                nvml.nvmlInit()
                device_count = nvml.nvmlDeviceGetCount()
                
                for i in range(device_count):
                    handle = nvml.nvmlDeviceGetHandleByIndex(i)
                    name = nvml.nvmlDeviceGetName(handle).decode()
                    memory_info = nvml.nvmlDeviceGetMemoryInfo(handle)
                    
                    gpu_info.append({
                        "type": "NVIDIA",
                        "name": name,
                        "memory_gb": memory_info.total / (1024**3),
                        "index": i,
                        "compute_capability": "unknown"
                    })
                    
            except ImportError:
                logger.debug("NVIDIA ML not available")
            except Exception as e:
                logger.debug(f"NVIDIA detection failed: {e}")
            
            # Try AMD GPUs
            try:
                result = subprocess.run(
                    ["rocm-smi", "--showproductname"], 
                    capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    for i, line in enumerate(lines[1:]):  # Skip header
                        if "GPU" in line:
                            gpu_info.append({
                                "type": "AMD",
                                "name": line.split()[-1],
                                "memory_gb": "unknown",
                                "index": i
                            })
            except (FileNotFoundError, subprocess.TimeoutExpired):
                logger.debug("AMD ROCm not available")
            
            # Try Apple Silicon
            if platform.system() == "Darwin" and platform.machine() == "arm64":
                try:
                    import mlx.core as mx
                    gpu_info.append({
                        "type": "Apple",
                        "name": "Apple Silicon GPU",
                        "memory_gb": "unified",  # Uses unified memory
                        "mlx_available": True
                    })
                except ImportError:
                    gpu_info.append({
                        "type": "Apple",
                        "name": "Apple Silicon GPU",
                        "memory_gb": "unified",
                        "mlx_available": False
                    })
            
            # Try Intel GPUs
            try:
                result = subprocess.run(
                    ["intel_gpu_top", "-l"], 
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0 and "GPU" in result.stdout:
                    gpu_info.append({
                        "type": "Intel",
                        "name": "Intel GPU",
                        "memory_gb": "unknown"
                    })
            except (FileNotFoundError, subprocess.TimeoutExpired):
                logger.debug("Intel GPU not detected")
                
        except Exception as e:
            logger.warning(f"GPU detection failed: {e}")
        
        return gpu_info
    
    async def _estimate_network_speed(self) -> str:
        """Estimate network download speed"""
        try:
            # Quick speed test with small file
            import time
            start_time = time.time()
            
            response = requests.get(
                "https://httpbin.org/bytes/1048576",  # 1MB
                timeout=10
            )
            
            duration = time.time() - start_time
            speed_mbps = (1 / duration) * 8  # Convert to Mbps
            
            if speed_mbps > 50:
                return "fast"
            elif speed_mbps > 10:
                return "medium"
            else:
                return "slow"
                
        except Exception:
            return "medium"  # Default assumption
    
    async def discover_models(self, task_type: str = "chat") -> List[ModelRecommendation]:
        """Discover and recommend models for system"""
        
        profile = await self.profile_system()
        
        logger.info(f"Discovering models for task: {task_type}")
        
        recommendations = []
        
        # Get models from different sources
        hf_models = await self._discover_huggingface_models(profile, task_type)
        recommendations.extend(hf_models)
        
        ollama_models = await self._discover_ollama_models(profile, task_type)
        recommendations.extend(ollama_models)
        
        lm_studio_models = await self._discover_lm_studio_models(profile, task_type)
        recommendations.extend(lm_studio_models)
        
        # Sort by compatibility score
        recommendations.sort(key=lambda x: x.compatibility_score, reverse=True)
        
        # Remove duplicates and limit to top 10
        seen = set()
        unique_recommendations = []
        
        for rec in recommendations:
            if rec.model_id not in seen:
                seen.add(rec.model_id)
                unique_recommendations.append(rec)
                if len(unique_recommendations) >= 10:
                    break
        
        logger.info(f"Found {len(unique_recommendations)} model recommendations")
        return unique_recommendations
    
    async def _discover_huggingface_models(
        self, 
        profile: SystemProfile, 
        task_type: str
    ) -> List[ModelRecommendation]:
        """Discover models from Hugging Face"""
        
        recommendations = []
        
        try:
            # Search for models with specific criteria
            task_filters = {
                "chat": ["text-generation", "conversational"],
                "code": ["text-generation", "code"],
                "embedding": ["sentence-similarity", "feature-extraction"],
                "multimodal": ["image-to-text", "text-to-image"]
            }
            
            tasks = task_filters.get(task_type, ["text-generation"])
            
            # Search for GGUF models (most compatible)
            gguf_models = list(self.hf_api.list_models(
                filter="gguf",
                task=tasks[0] if tasks else None,
                sort="downloads",
                direction=-1,
                limit=20
            ))
            
            for model in gguf_models:
                try:
                    compatibility = self._calculate_compatibility(model, profile, "GGUF")
                    if compatibility > 0.5:  # Only recommend if reasonably compatible
                        
                        # Estimate model size
                        size_gb = self._estimate_model_size(model)
                        
                        recommendations.append(ModelRecommendation(
                            model_id=model.modelId,
                            model_name=model.modelId.split('/')[-1],
                            size_gb=size_gb,
                            format="GGUF",
                            quantization=self._detect_quantization(model.modelId),
                            download_url=f"https://huggingface.co/{model.modelId}",
                            reason=self._generate_recommendation_reason(model, profile),
                            compatibility_score=compatibility,
                            estimated_speed=self._estimate_speed(size_gb, profile),
                            memory_usage=self._estimate_memory_usage(size_gb, profile)
                        ))
                        
                except Exception as e:
                    logger.debug(f"Error processing model {model.modelId}: {e}")
                    continue
            
        except Exception as e:
            logger.warning(f"Error discovering HuggingFace models: {e}")
        
        return recommendations
    
    async def _discover_ollama_models(
        self, 
        profile: SystemProfile, 
        task_type: str
    ) -> List[ModelRecommendation]:
        """Discover models from Ollama registry"""
        
        recommendations = []
        
        try:
            # Popular Ollama models
            popular_models = [
                ("llama2:7b", 3.8, "General chat"),
                ("llama2:13b", 7.3, "Better reasoning"),
                ("codellama:7b", 3.8, "Code generation"),
                ("mistral:7b", 4.1, "Fast and efficient"),
                ("gemma:7b", 5.0, "Google's Gemma"),
                ("qwen:7b", 4.2, "Multilingual support"),
                ("deepseek-coder:6.7b", 3.8, "Code specialist"),
                ("solar:10.7b", 6.1, "High performance")
            ]
            
            for model_id, size_gb, description in popular_models:
                compatibility = self._calculate_ollama_compatibility(model_id, profile)
                
                if compatibility > 0.3:
                    recommendations.append(ModelRecommendation(
                        model_id=f"ollama:{model_id}",
                        model_name=model_id,
                        size_gb=size_gb,
                        format="Ollama",
                        quantization="Q4_0",  # Ollama default
                        download_url=f"ollama pull {model_id}",
                        reason=f"{description} - Optimized for Ollama runtime",
                        compatibility_score=compatibility,
                        estimated_speed=self._estimate_speed(size_gb, profile),
                        memory_usage=self._estimate_memory_usage(size_gb, profile)
                    ))
                    
        except Exception as e:
            logger.warning(f"Error discovering Ollama models: {e}")
        
        return recommendations
    
    async def _discover_lm_studio_models(
        self, 
        profile: SystemProfile, 
        task_type: str
    ) -> List[ModelRecommendation]:
        """Discover models from LM Studio catalog"""
        
        recommendations = []
        
        try:
            # LM Studio compatible models
            lm_studio_models = [
                ("TheBloke/Llama-2-7b-Chat-GGUF", 3.9, "Q4_K_M"),
                ("TheBloke/CodeLlama-7B-Instruct-GGUF", 3.8, "Q4_K_M"),
                ("TheBloke/Mistral-7B-Instruct-v0.2-GGUF", 4.1, "Q4_K_M"),
                ("microsoft/DialoGPT-medium", 1.2, "Q8_0"),
                ("stabilityai/StableLM-3B-4E1T", 2.8, "Q4_K_S")
            ]
            
            for model_id, size_gb, quant in lm_studio_models:
                compatibility = self._calculate_compatibility_simple(size_gb, profile)
                
                if compatibility > 0.4:
                    recommendations.append(ModelRecommendation(
                        model_id=f"lmstudio:{model_id}",
                        model_name=model_id.split('/')[-1],
                        size_gb=size_gb,
                        format="GGUF",
                        quantization=quant,
                        download_url=f"https://huggingface.co/{model_id}",
                        reason="LM Studio optimized - drop-in OpenAI compatibility",
                        compatibility_score=compatibility,
                        estimated_speed=self._estimate_speed(size_gb, profile),
                        memory_usage=self._estimate_memory_usage(size_gb, profile)
                    ))
                    
        except Exception as e:
            logger.warning(f"Error discovering LM Studio models: {e}")
        
        return recommendations
    
    def _calculate_compatibility(self, model, profile: SystemProfile, format: str) -> float:
        """Calculate compatibility score for a model"""
        
        score = 0.0
        
        # Format compatibility
        if format == "GGUF":
            score += 0.3  # GGUF is most compatible
        elif format == "MLX" and profile.os == "Darwin":
            score += 0.4  # MLX great on Apple Silicon
        elif format == "PyTorch":
            score += 0.2
        else:
            score += 0.1
        
        # Size vs RAM compatibility
        estimated_size = self._estimate_model_size(model)
        if estimated_size < profile.ram_gb * 0.5:  # Model fits comfortably
            score += 0.4
        elif estimated_size < profile.ram_gb * 0.8:  # Model fits with some swap
            score += 0.2
        else:
            score -= 0.1  # May not fit
        
        # GPU compatibility
        if profile.gpu_info:
            for gpu in profile.gpu_info:
                if gpu["type"] == "NVIDIA":
                    score += 0.2
                elif gpu["type"] == "Apple":
                    score += 0.3 if format == "MLX" else 0.1
                elif gpu["type"] == "AMD":
                    score += 0.1
        
        # CPU compatibility
        if profile.cpu_cores >= 8:
            score += 0.1
        
        return min(score, 1.0)
    
    def _calculate_ollama_compatibility(self, model_id: str, profile: SystemProfile) -> float:
        """Calculate Ollama model compatibility"""
        
        # Extract size from model ID
        if ":7b" in model_id:
            size_gb = 4.0
        elif ":13b" in model_id:
            size_gb = 7.5
        elif ":34b" in model_id:
            size_gb = 19.0
        else:
            size_gb = 4.0  # Default assumption
        
        return self._calculate_compatibility_simple(size_gb, profile)
    
    def _calculate_compatibility_simple(self, size_gb: float, profile: SystemProfile) -> float:
        """Simple compatibility calculation based on size"""
        
        if size_gb < profile.ram_gb * 0.4:
            return 0.9
        elif size_gb < profile.ram_gb * 0.6:
            return 0.7
        elif size_gb < profile.ram_gb * 0.8:
            return 0.5
        else:
            return 0.2
    
    def _estimate_model_size(self, model) -> float:
        """Estimate model size from name/description"""
        
        model_id = model.modelId.lower()
        
        # Common size indicators
        if "7b" in model_id:
            return 4.0  # ~4GB for 7B model
        elif "13b" in model_id:
            return 7.5  # ~7.5GB for 13B model
        elif "34b" in model_id:
            return 19.0  # ~19GB for 34B model
        elif "70b" in model_id:
            return 39.0  # ~39GB for 70B model
        elif "3b" in model_id:
            return 2.0   # ~2GB for 3B model
        elif "1b" in model_id:
            return 1.0   # ~1GB for 1B model
        else:
            return 4.0   # Default assumption
    
    def _detect_quantization(self, model_id: str) -> Optional[str]:
        """Detect quantization level from model ID"""
        
        model_id = model_id.upper()
        
        quantizations = ["Q8_0", "Q6_K", "Q5_K_M", "Q4_K_M", "Q4_0", "Q3_K_M", "Q2_K"]
        
        for quant in quantizations:
            if quant in model_id:
                return quant
        
        return "Q4_K_M"  # Default for GGUF
    
    def _generate_recommendation_reason(self, model, profile: SystemProfile) -> str:
        """Generate human-readable recommendation reason"""
        
        reasons = []
        
        # Size appropriateness
        size = self._estimate_model_size(model)
        if size < profile.ram_gb * 0.3:
            reasons.append("Fits comfortably in RAM")
        elif size < profile.ram_gb * 0.7:
            reasons.append("Good RAM utilization")
        
        # GPU benefits
        if profile.gpu_info:
            gpu_names = [gpu["type"] for gpu in profile.gpu_info]
            if "NVIDIA" in gpu_names:
                reasons.append("CUDA acceleration available")
            elif "Apple" in gpu_names:
                reasons.append("Apple Silicon optimized")
        
        # Format benefits
        if "gguf" in model.modelId.lower():
            reasons.append("Efficient GGUF format")
        
        # Popularity/quality
        if hasattr(model, 'downloads') and model.downloads > 10000:
            reasons.append("Popular and well-tested")
        
        return "; ".join(reasons) if reasons else "Compatible with your system"
    
    def _estimate_speed(self, size_gb: float, profile: SystemProfile) -> str:
        """Estimate inference speed"""
        
        # Base speed estimate
        base_tokens_per_sec = 10
        
        # Adjust for model size
        if size_gb < 2:
            base_tokens_per_sec *= 3
        elif size_gb < 5:
            base_tokens_per_sec *= 2
        elif size_gb > 15:
            base_tokens_per_sec *= 0.5
        
        # Adjust for hardware
        if profile.gpu_info:
            for gpu in profile.gpu_info:
                if gpu["type"] == "NVIDIA":
                    base_tokens_per_sec *= 3
                elif gpu["type"] == "Apple":
                    base_tokens_per_sec *= 2
        
        # Adjust for CPU
        if profile.cpu_cores >= 12:
            base_tokens_per_sec *= 1.5
        elif profile.cpu_cores <= 4:
            base_tokens_per_sec *= 0.7
        
        return f"~{int(base_tokens_per_sec)} tokens/sec"
    
    def _estimate_memory_usage(self, size_gb: float, profile: SystemProfile) -> str:
        """Estimate memory usage"""
        
        # Model size + context + overhead
        estimated_ram = size_gb * 1.2  # 20% overhead
        estimated_vram = size_gb * 0.8 if profile.gpu_info else 0
        
        if estimated_vram > 0:
            return f"~{estimated_ram:.1f}GB RAM + {estimated_vram:.1f}GB VRAM"
        else:
            return f"~{estimated_ram:.1f}GB RAM"
    
    async def auto_install_best_model(self, task_type: str = "chat") -> Optional[str]:
        """Automatically install the best recommended model"""
        
        recommendations = await self.discover_models(task_type)
        
        if not recommendations:
            logger.error("No compatible models found")
            return None
        
        best_model = recommendations[0]
        logger.info(f"Auto-installing best model: {best_model.model_name}")
        
        try:
            # Download model based on format
            if best_model.format == "Ollama":
                model_name = best_model.model_id.replace("ollama:", "")
                result = subprocess.run(
                    ["ollama", "pull", model_name], 
                    capture_output=True, text=True
                )
                if result.returncode == 0:
                    logger.info(f"Successfully installed {model_name} via Ollama")
                    return model_name
            else:
                # Use HuggingFace Hub for other formats
                from huggingface_hub import snapshot_download
                
                model_path = snapshot_download(
                    repo_id=best_model.model_id.replace("lmstudio:", ""),
                    cache_dir=str(self.cache_dir),
                    local_files_only=False
                )
                
                logger.info(f"Successfully installed {best_model.model_name}")
                return str(model_path)
                
        except Exception as e:
            logger.error(f"Failed to install model: {e}")
            return None
    
    def get_installed_models(self) -> List[Dict]:
        """Get list of installed models"""
        
        installed = []
        
        # Check HuggingFace cache
        if self.cache_dir.exists():
            for model_dir in self.cache_dir.iterdir():
                if model_dir.is_dir():
                    installed.append({
                        "name": model_dir.name,
                        "path": str(model_dir),
                        "source": "huggingface",
                        "size_mb": sum(f.stat().st_size for f in model_dir.rglob('*') if f.is_file()) / 1024 / 1024
                    })
        
        # Check Ollama models
        try:
            result = subprocess.run(
                ["ollama", "list"], 
                capture_output=True, text=True
            )
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')[1:]  # Skip header
                for line in lines:
                    parts = line.split()
                    if len(parts) >= 3:
                        installed.append({
                            "name": parts[0],
                            "source": "ollama",
                            "size": parts[1]
                        })
        except FileNotFoundError:
            logger.debug("Ollama not installed")
        
        return installed


# Global discovery instance
_global_discovery: Optional[ModelDiscovery] = None

def get_model_discovery() -> ModelDiscovery:
    """Get global model discovery instance"""
    global _global_discovery
    if _global_discovery is None:
        _global_discovery = ModelDiscovery()
    return _global_discovery

async def discover_models(task_type: str = "chat") -> List[ModelRecommendation]:
    """Discover models for task type"""
    discovery = get_model_discovery()
    return await discovery.discover_models(task_type)

async def auto_install_best_model(task_type: str = "chat") -> Optional[str]:
    """Auto-install best model for task"""
    discovery = get_model_discovery()
    return await discovery.auto_install_best_model(task_type)