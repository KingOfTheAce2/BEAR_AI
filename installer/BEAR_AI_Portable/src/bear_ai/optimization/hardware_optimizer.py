"""
Hardware Optimization System
Dynamic optimization based on available hardware
"""

import asyncio
import json
import logging
import platform
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import psutil

logger = logging.getLogger(__name__)


@dataclass
class OptimizationProfile:
    """Hardware optimization profile"""
    cpu_threads: int
    gpu_layers: int
    batch_size: int
    context_length: int
    memory_map: bool
    use_mlock: bool
    numa_nodes: Optional[List[int]]
    quantization: str
    backend: str  # cpu, cuda, metal, opencl, vulkan, rocm


@dataclass
class HardwareCapabilities:
    """System hardware capabilities"""
    cpu_info: Dict
    gpu_info: List[Dict]
    memory_info: Dict
    storage_info: Dict
    network_info: Dict
    platform_info: Dict


class HardwareOptimizer:
    """Optimizes model execution based on available hardware"""
    
    def __init__(self):
        self.capabilities = None
        self.optimization_cache = {}
        
        logger.info("HardwareOptimizer initialized")
    
    async def analyze_hardware(self) -> HardwareCapabilities:
        """Analyze system hardware capabilities"""
        
        if self.capabilities:
            return self.capabilities
        
        logger.info("Analyzing hardware capabilities...")
        
        # CPU analysis
        cpu_info = await self._analyze_cpu()
        
        # GPU analysis
        gpu_info = await self._analyze_gpus()
        
        # Memory analysis
        memory_info = await self._analyze_memory()
        
        # Storage analysis
        storage_info = await self._analyze_storage()
        
        # Network analysis
        network_info = await self._analyze_network()
        
        # Platform analysis
        platform_info = await self._analyze_platform()
        
        self.capabilities = HardwareCapabilities(
            cpu_info=cpu_info,
            gpu_info=gpu_info,
            memory_info=memory_info,
            storage_info=storage_info,
            network_info=network_info,
            platform_info=platform_info
        )
        
        logger.info(f"Hardware analysis complete: {len(gpu_info)} GPUs, {cpu_info['cores']} CPU cores")
        return self.capabilities
    
    async def _analyze_cpu(self) -> Dict:
        """Analyze CPU capabilities"""
        
        cpu_info = {
            "cores": psutil.cpu_count(logical=False),
            "threads": psutil.cpu_count(logical=True),
            "frequency": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else {},
            "brand": platform.processor(),
            "architecture": platform.machine(),
            "features": []
        }
        
        # Detect CPU features
        try:
            if platform.system() == "Linux":
                with open("/proc/cpuinfo", "r") as f:
                    cpuinfo = f.read()
                    
                # Check for important CPU features
                features = []
                if "avx2" in cpuinfo:
                    features.append("AVX2")
                if "avx512" in cpuinfo:
                    features.append("AVX512")
                if "fma" in cpuinfo:
                    features.append("FMA")
                if "sse4" in cpuinfo:
                    features.append("SSE4")
                    
                cpu_info["features"] = features
                
        except Exception as e:
            logger.debug(f"Error reading CPU features: {e}")
        
        # NUMA topology
        try:
            numa_nodes = []
            numa_dir = Path("/sys/devices/system/node")
            if numa_dir.exists():
                for node_dir in numa_dir.iterdir():
                    if node_dir.name.startswith("node"):
                        node_id = int(node_dir.name[4:])
                        numa_nodes.append(node_id)
            cpu_info["numa_nodes"] = numa_nodes
            
        except Exception as e:
            logger.debug(f"Error reading NUMA topology: {e}")
            cpu_info["numa_nodes"] = [0]  # Default single node
        
        return cpu_info
    
    async def _analyze_gpus(self) -> List[Dict]:
        """Analyze GPU capabilities"""
        
        gpus = []
        
        # NVIDIA GPUs
        try:
            import nvidia_ml_py as nvml
            nvml.nvmlInit()
            
            device_count = nvml.nvmlDeviceGetCount()
            for i in range(device_count):
                handle = nvml.nvmlDeviceGetHandleByIndex(i)
                
                name = nvml.nvmlDeviceGetName(handle).decode()
                memory_info = nvml.nvmlDeviceGetMemoryInfo(handle)
                
                # Get compute capability
                major, minor = nvml.nvmlDeviceGetCudaComputeCapability(handle)
                compute_capability = f"{major}.{minor}"
                
                # Get clock speeds
                try:
                    graphics_clock = nvml.nvmlDeviceGetClockInfo(handle, nvml.NVML_CLOCK_GRAPHICS)
                    memory_clock = nvml.nvmlDeviceGetClockInfo(handle, nvml.NVML_CLOCK_MEM)
                except:
                    graphics_clock = memory_clock = 0
                
                gpus.append({
                    "index": i,
                    "type": "NVIDIA",
                    "name": name,
                    "memory_total": memory_info.total,
                    "memory_free": memory_info.free,
                    "compute_capability": compute_capability,
                    "graphics_clock": graphics_clock,
                    "memory_clock": memory_clock,
                    "backend": "cuda"
                })
                
        except ImportError:
            logger.debug("NVIDIA ML not available")
        except Exception as e:
            logger.debug(f"NVIDIA GPU detection failed: {e}")
        
        # AMD GPUs
        try:
            result = subprocess.run(
                ["rocm-smi", "--showproductname", "--showmeminfo", "vram"],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                gpu_index = 0
                for line in lines[1:]:  # Skip header
                    if "GPU" in line:
                        parts = line.split()
                        name = " ".join(parts[2:])  # GPU name
                        
                        gpus.append({
                            "index": gpu_index,
                            "type": "AMD",
                            "name": name,
                            "backend": "rocm"
                        })
                        gpu_index += 1
                        
        except (FileNotFoundError, subprocess.TimeoutExpired):
            logger.debug("AMD ROCm not available")
        
        # Apple Silicon
        if platform.system() == "Darwin" and platform.machine() == "arm64":
            try:
                # Check for MLX availability
                mlx_available = False
                try:
                    import mlx.core as mx
                    mlx_available = True
                except ImportError:
                    pass
                
                # Get unified memory info
                memory = psutil.virtual_memory()
                
                gpus.append({
                    "index": 0,
                    "type": "Apple",
                    "name": "Apple Silicon GPU",
                    "memory_unified": memory.total,
                    "backend": "metal",
                    "mlx_available": mlx_available
                })
                
            except Exception as e:
                logger.debug(f"Apple Silicon detection failed: {e}")
        
        # Intel GPUs
        try:
            result = subprocess.run(
                ["intel_gpu_top", "-l"],
                capture_output=True, text=True, timeout=5
            )
            
            if result.returncode == 0 and "GPU" in result.stdout:
                gpus.append({
                    "index": len(gpus),
                    "type": "Intel",
                    "name": "Intel GPU",
                    "backend": "opencl"
                })
                
        except (FileNotFoundError, subprocess.TimeoutExpired):
            logger.debug("Intel GPU not detected")
        
        return gpus
    
    async def _analyze_memory(self) -> Dict:
        """Analyze memory capabilities"""
        
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        return {
            "total": memory.total,
            "available": memory.available,
            "used": memory.used,
            "free": memory.free,
            "percent": memory.percent,
            "swap_total": swap.total,
            "swap_used": swap.used,
            "swap_free": swap.free
        }
    
    async def _analyze_storage(self) -> Dict:
        """Analyze storage capabilities"""
        
        storage_info = {}
        
        # Analyze each mounted disk
        for disk in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(disk.mountpoint)
                io_counters = psutil.disk_io_counters(perdisk=True)
                
                device_name = disk.device.replace('\\', '').replace(':', '') if platform.system() == "Windows" else disk.device
                
                storage_info[device_name] = {
                    "mountpoint": disk.mountpoint,
                    "fstype": disk.fstype,
                    "total": usage.total,
                    "used": usage.used,
                    "free": usage.free,
                    "percent": (usage.used / usage.total) * 100,
                }
                
                # Add I/O counters if available
                if io_counters and device_name in io_counters:
                    counters = io_counters[device_name]
                    storage_info[device_name].update({
                        "read_bytes": counters.read_bytes,
                        "write_bytes": counters.write_bytes,
                        "read_time": counters.read_time,
                        "write_time": counters.write_time
                    })
                    
            except Exception as e:
                logger.debug(f"Error analyzing disk {disk.device}: {e}")
        
        return storage_info
    
    async def _analyze_network(self) -> Dict:
        """Analyze network capabilities"""
        
        network_info = {}
        
        try:
            # Get network interfaces
            interfaces = psutil.net_if_addrs()
            io_counters = psutil.net_io_counters(pernic=True)
            
            for interface, addresses in interfaces.items():
                interface_info = {
                    "addresses": [],
                    "is_up": interface in psutil.net_if_stats() and psutil.net_if_stats()[interface].isup
                }
                
                for addr in addresses:
                    interface_info["addresses"].append({
                        "family": addr.family.name,
                        "address": addr.address,
                        "netmask": addr.netmask,
                        "broadcast": addr.broadcast
                    })
                
                # Add I/O counters
                if interface in io_counters:
                    counters = io_counters[interface]
                    interface_info.update({
                        "bytes_sent": counters.bytes_sent,
                        "bytes_recv": counters.bytes_recv,
                        "packets_sent": counters.packets_sent,
                        "packets_recv": counters.packets_recv
                    })
                
                network_info[interface] = interface_info
                
        except Exception as e:
            logger.debug(f"Error analyzing network: {e}")
        
        return network_info
    
    async def _analyze_platform(self) -> Dict:
        """Analyze platform information"""
        
        return {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
            "python_implementation": platform.python_implementation()
        }
    
    async def optimize_for_model(
        self, 
        model_size_gb: float, 
        model_type: str = "llm",
        task_type: str = "inference"
    ) -> OptimizationProfile:
        """Generate optimization profile for specific model"""
        
        # Use cached result if available
        cache_key = f"{model_size_gb}_{model_type}_{task_type}"
        if cache_key in self.optimization_cache:
            return self.optimization_cache[cache_key]
        
        capabilities = await self.analyze_hardware()
        
        logger.info(f"Optimizing for {model_size_gb}GB {model_type} model")
        
        # Base optimization profile
        profile = OptimizationProfile(
            cpu_threads=capabilities.cpu_info["threads"],
            gpu_layers=0,
            batch_size=1,
            context_length=2048,
            memory_map=True,
            use_mlock=False,
            numa_nodes=capabilities.cpu_info.get("numa_nodes", [0]),
            quantization="Q4_K_M",
            backend="cpu"
        )
        
        # GPU optimization
        if capabilities.gpu_info:
            profile = await self._optimize_gpu(profile, model_size_gb, capabilities)
        
        # CPU optimization
        profile = await self._optimize_cpu(profile, model_size_gb, capabilities)
        
        # Memory optimization
        profile = await self._optimize_memory(profile, model_size_gb, capabilities)
        
        # Cache and return
        self.optimization_cache[cache_key] = profile
        logger.info(f"Optimization profile: {profile.backend} backend, {profile.gpu_layers} GPU layers")
        
        return profile
    
    async def _optimize_gpu(
        self, 
        profile: OptimizationProfile, 
        model_size_gb: float, 
        capabilities: HardwareCapabilities
    ) -> OptimizationProfile:
        """Optimize for GPU usage"""
        
        best_gpu = None
        best_score = 0
        
        for gpu in capabilities.gpu_info:
            score = 0
            
            # NVIDIA GPUs
            if gpu["type"] == "NVIDIA":
                score = 100
                
                # Prefer newer compute capabilities
                if "compute_capability" in gpu:
                    cc = float(gpu["compute_capability"])
                    if cc >= 8.0:  # Ampere and newer
                        score += 30
                    elif cc >= 7.0:  # Volta/Turing
                        score += 20
                    elif cc >= 6.0:  # Pascal
                        score += 10
                
                # Consider VRAM
                if "memory_total" in gpu:
                    vram_gb = gpu["memory_total"] / (1024**3)
                    if vram_gb >= model_size_gb * 1.2:  # Can fit model + overhead
                        score += 50
                    elif vram_gb >= model_size_gb * 0.8:  # Can partially fit
                        score += 25
                
                profile.backend = "cuda"
            
            # Apple Silicon
            elif gpu["type"] == "Apple":
                score = 80
                
                if gpu.get("mlx_available", False):
                    score += 20
                    profile.backend = "metal"
                
                # Apple Silicon uses unified memory
                unified_memory_gb = capabilities.memory_info["total"] / (1024**3)
                if unified_memory_gb >= model_size_gb * 1.5:
                    score += 30
            
            # AMD GPUs
            elif gpu["type"] == "AMD":
                score = 70
                profile.backend = "rocm"
            
            # Intel GPUs
            elif gpu["type"] == "Intel":
                score = 60
                profile.backend = "opencl"
            
            if score > best_score:
                best_score = score
                best_gpu = gpu
        
        if best_gpu:
            # Calculate optimal GPU layers
            if best_gpu["type"] == "NVIDIA" and "memory_total" in best_gpu:
                vram_gb = best_gpu["memory_total"] / (1024**3)
                # Rough estimation: each layer needs ~model_size/num_layers GB
                estimated_layers = min(99, int((vram_gb / model_size_gb) * 32))  # Assume 32 layers typical
                profile.gpu_layers = max(0, estimated_layers)
            
            elif best_gpu["type"] == "Apple":
                # Apple Silicon can use more layers due to unified memory
                profile.gpu_layers = 99  # Let MLX decide
            
            else:
                # Conservative for other GPUs
                profile.gpu_layers = 32
        
        return profile
    
    async def _optimize_cpu(
        self, 
        profile: OptimizationProfile, 
        model_size_gb: float, 
        capabilities: HardwareCapabilities
    ) -> OptimizationProfile:
        """Optimize CPU usage"""
        
        cpu_info = capabilities.cpu_info
        
        # Optimal thread count (leave some threads for OS)
        total_threads = cpu_info["threads"]
        if total_threads >= 16:
            profile.cpu_threads = total_threads - 2
        elif total_threads >= 8:
            profile.cpu_threads = total_threads - 1
        else:
            profile.cpu_threads = max(1, total_threads)
        
        # Adjust for model size
        if model_size_gb > 13:  # Large models
            profile.cpu_threads = min(profile.cpu_threads, total_threads // 2)
        
        # NUMA optimization
        numa_nodes = cpu_info.get("numa_nodes", [0])
        if len(numa_nodes) > 1 and model_size_gb > 7:
            # For large models, prefer single NUMA node
            profile.numa_nodes = [numa_nodes[0]]
        else:
            profile.numa_nodes = numa_nodes
        
        return profile
    
    async def _optimize_memory(
        self, 
        profile: OptimizationProfile, 
        model_size_gb: float, 
        capabilities: HardwareCapabilities
    ) -> OptimizationProfile:
        """Optimize memory usage"""
        
        memory_info = capabilities.memory_info
        available_gb = memory_info["available"] / (1024**3)
        total_gb = memory_info["total"] / (1024**3)
        
        # Memory mapping
        if model_size_gb > available_gb * 0.5:
            profile.memory_map = True
        else:
            profile.memory_map = False
        
        # Memory locking (only for smaller models)
        if model_size_gb < available_gb * 0.3 and total_gb >= 16:
            profile.use_mlock = True
        
        # Context length based on available memory
        if available_gb >= 32:
            profile.context_length = 8192
        elif available_gb >= 16:
            profile.context_length = 4096
        elif available_gb >= 8:
            profile.context_length = 2048
        else:
            profile.context_length = 1024
        
        # Quantization based on memory pressure
        memory_pressure = (memory_info["used"] / memory_info["total"]) * 100
        
        if memory_pressure > 80 or available_gb < model_size_gb * 1.5:
            profile.quantization = "Q3_K_M"  # Aggressive quantization
        elif memory_pressure > 60 or available_gb < model_size_gb * 2:
            profile.quantization = "Q4_K_M"  # Balanced quantization
        elif available_gb >= model_size_gb * 3:
            profile.quantization = "Q5_K_M"  # Better quality
        else:
            profile.quantization = "Q4_K_M"  # Default
        
        # Batch size based on available memory
        if available_gb >= 32:
            profile.batch_size = 8
        elif available_gb >= 16:
            profile.batch_size = 4
        elif available_gb >= 8:
            profile.batch_size = 2
        else:
            profile.batch_size = 1
        
        return profile
    
    async def benchmark_configuration(
        self, 
        profile: OptimizationProfile
    ) -> Dict[str, float]:
        """Benchmark a configuration profile"""
        
        # This would run actual benchmarks with the configuration
        # For now, return estimated performance
        
        capabilities = await self.analyze_hardware()
        
        # Estimate tokens per second based on configuration
        base_tps = 10.0
        
        # GPU acceleration
        if profile.backend in ["cuda", "metal", "rocm"]:
            if profile.gpu_layers > 0:
                base_tps *= min(5.0, 1 + (profile.gpu_layers / 32) * 4)
        
        # CPU thread scaling
        base_tps *= min(2.0, 1 + (profile.cpu_threads / capabilities.cpu_info["threads"]))
        
        # Quantization impact
        quant_multipliers = {
            "Q3_K_M": 1.8,
            "Q4_K_M": 1.5,
            "Q5_K_M": 1.2,
            "Q6_K": 1.0,
            "Q8_0": 0.8
        }
        base_tps *= quant_multipliers.get(profile.quantization, 1.0)
        
        # Memory pressure penalty
        memory_info = capabilities.memory_info
        memory_usage_percent = memory_info["percent"]
        if memory_usage_percent > 90:
            base_tps *= 0.5
        elif memory_usage_percent > 75:
            base_tps *= 0.8
        
        return {
            "tokens_per_second": base_tps,
            "memory_usage_mb": 1024,  # Placeholder
            "gpu_utilization": 85.0 if profile.gpu_layers > 0 else 0.0,
            "cpu_utilization": 60.0,
            "power_usage_watts": 150.0 if profile.gpu_layers > 0 else 65.0
        }
    
    def export_profile(self, profile: OptimizationProfile) -> Dict:
        """Export optimization profile to dictionary"""
        
        return {
            "cpu_threads": profile.cpu_threads,
            "gpu_layers": profile.gpu_layers,
            "batch_size": profile.batch_size,
            "context_length": profile.context_length,
            "memory_map": profile.memory_map,
            "use_mlock": profile.use_mlock,
            "numa_nodes": profile.numa_nodes,
            "quantization": profile.quantization,
            "backend": profile.backend
        }
    
    def import_profile(self, profile_dict: Dict) -> OptimizationProfile:
        """Import optimization profile from dictionary"""
        
        return OptimizationProfile(**profile_dict)


# Global optimizer instance
_global_optimizer: Optional[HardwareOptimizer] = None

def get_hardware_optimizer() -> HardwareOptimizer:
    """Get global hardware optimizer instance"""
    global _global_optimizer
    if _global_optimizer is None:
        _global_optimizer = HardwareOptimizer()
    return _global_optimizer

async def optimize_for_model(model_size_gb: float, model_type: str = "llm") -> OptimizationProfile:
    """Optimize hardware configuration for model"""
    optimizer = get_hardware_optimizer()
    return await optimizer.optimize_for_model(model_size_gb, model_type)