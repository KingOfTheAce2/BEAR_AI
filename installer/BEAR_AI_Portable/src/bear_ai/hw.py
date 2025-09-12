from __future__ import annotations
from typing import Optional, Dict, Union, List, Tuple
import time
import logging
import threading
from dataclasses import dataclass
from enum import Enum


def _bytes_to_gb(n: int) -> float:
    return round(n / (1024**3), 2)


def system_ram_gb() -> float:
    """Return total system RAM in GB.

    Attempts to use :mod:`psutil` if available. When unavailable, fall back to
    standard library mechanisms: ``os.sysconf`` on Unix-like platforms or, as a
    last resort, a rough estimate based on total disk size.
    """

    try:
        import psutil  # type: ignore

        return _bytes_to_gb(psutil.virtual_memory().total)
    except Exception:
        # psutil not installed or failed; try using os.sysconf (Unix)
        try:
            import os

            pages = os.sysconf("SC_PHYS_PAGES")
            page_size = os.sysconf("SC_PAGE_SIZE")
            return _bytes_to_gb(pages * page_size)
        except Exception:
            # Final fallback: approximate from total disk size
            import shutil

            total, _, _ = shutil.disk_usage("/")
            # Heuristic: assume RAM ~25% of disk capacity
            return _bytes_to_gb(total // 4)


def free_ram_gb() -> float:
    """Get available system RAM in GB with improved accuracy.
    
    Returns
    -------
    float
        Available RAM in GB
    """
    try:
        import psutil
        # Use available memory which accounts for cached/buffered memory
        return _bytes_to_gb(psutil.virtual_memory().available)
    except Exception:
        # Fallback: assume 2GB is used by system
        return max(0.0, system_ram_gb() - 2.0)


def gpu_vram_gb() -> Optional[float]:
    """
    Get total GPU VRAM in GB. Try NVIDIA NVML first, fallback to other methods.
    
    Returns
    -------
    Optional[float]
        Total GPU VRAM in GB or None if not available
    """
    # Try NVIDIA NVML first
    try:
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        info = pynvml.nvmlDeviceGetMemoryInfo(handle)
        return _bytes_to_gb(info.total)
    except Exception:
        pass
    
    # Try AMD ROCm (future support)
    try:
        # Placeholder for AMD GPU support
        pass
    except Exception:
        pass
    
    # Try Intel GPU support (future)
    try:
        # Placeholder for Intel GPU support
        pass
    except Exception:
        pass
    
    return None


def get_free_vram_gb() -> Optional[float]:
    """Get available GPU VRAM in GB.
    
    Returns
    -------
    Optional[float]
        Available GPU VRAM in GB or None if not available
    """
    try:
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        info = pynvml.nvmlDeviceGetMemoryInfo(handle)
        return _bytes_to_gb(info.free)
    except Exception:
        return None


class HardwareTier(Enum):
    """Hardware performance tiers for model recommendations."""
    LOW_END = "low_end"       # < 8GB RAM, no dedicated GPU
    MID_RANGE = "mid_range"   # 8-16GB RAM, basic GPU
    HIGH_END = "high_end"     # 16-32GB RAM, good GPU
    WORKSTATION = "workstation"  # 32+ GB RAM, high-end GPU


@dataclass
class HardwareMetrics:
    """Real-time hardware performance metrics."""
    timestamp: float
    ram_usage_percent: float
    vram_usage_percent: float
    cpu_usage_percent: float
    gpu_utilization_percent: float
    temperature_celsius: float
    power_usage_watts: float


class HardwareMonitor:
    """Real-time hardware monitoring with graceful degradation."""
    
    def __init__(self, update_interval: float = 1.0):
        self.update_interval = update_interval
        self._running = False
        self._thread = None
        self._latest_metrics = None
        self._lock = threading.Lock()
        self._logger = logging.getLogger(__name__)
    
    def start(self) -> bool:
        """Start hardware monitoring in background thread.
        
        Returns
        -------
        bool
            True if monitoring started successfully
        """
        if self._running:
            return True
            
        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()
        return True
    
    def stop(self):
        """Stop hardware monitoring."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
    
    def get_metrics(self) -> Optional[HardwareMetrics]:
        """Get latest hardware metrics.
        
        Returns
        -------
        Optional[HardwareMetrics]
            Latest metrics or None if monitoring not started
        """
        with self._lock:
            return self._latest_metrics
    
    def _monitor_loop(self):
        """Background monitoring loop."""
        while self._running:
            try:
                metrics = self._collect_metrics()
                with self._lock:
                    self._latest_metrics = metrics
            except Exception as e:
                self._logger.warning(f"Hardware monitoring error: {e}")
            
            time.sleep(self.update_interval)
    
    def _collect_metrics(self) -> HardwareMetrics:
        """Collect current hardware metrics."""
        timestamp = time.time()
        
        # RAM metrics
        ram_usage = 0.0
        try:
            import psutil
            ram_usage = psutil.virtual_memory().percent
        except Exception:
            pass
        
        # GPU metrics
        vram_usage = 0.0
        gpu_util = 0.0
        gpu_temp = 0.0
        gpu_power = 0.0
        
        try:
            import pynvml
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            
            # VRAM usage
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            vram_usage = (mem_info.used / mem_info.total) * 100
            
            # GPU utilization
            util = pynvml.nvmlDeviceGetUtilizationRates(handle)
            gpu_util = util.gpu
            
            # Temperature
            try:
                gpu_temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
            except Exception:
                pass
            
            # Power usage
            try:
                gpu_power = pynvml.nvmlDeviceGetPowerUsage(handle) / 1000.0  # Convert mW to W
            except Exception:
                pass
                
        except Exception:
            pass
        
        # CPU usage
        cpu_usage = 0.0
        try:
            import psutil
            cpu_usage = psutil.cpu_percent(interval=0.1)
        except Exception:
            pass
        
        return HardwareMetrics(
            timestamp=timestamp,
            ram_usage_percent=ram_usage,
            vram_usage_percent=vram_usage,
            cpu_usage_percent=cpu_usage,
            gpu_utilization_percent=gpu_util,
            temperature_celsius=gpu_temp,
            power_usage_watts=gpu_power
        )


# Global monitor instance
_hardware_monitor = HardwareMonitor()


def start_hardware_monitoring(update_interval: float = 1.0) -> bool:
    """Start global hardware monitoring.
    
    Parameters
    ----------
    update_interval: float
        Update frequency in seconds
        
    Returns
    -------
    bool
        True if monitoring started successfully
    """
    global _hardware_monitor
    _hardware_monitor = HardwareMonitor(update_interval)
    return _hardware_monitor.start()


def stop_hardware_monitoring():
    """Stop global hardware monitoring."""
    global _hardware_monitor
    _hardware_monitor.stop()


def get_current_metrics() -> Optional[HardwareMetrics]:
    """Get current hardware metrics from global monitor.
    
    Returns
    -------
    Optional[HardwareMetrics]
        Current metrics or None if monitoring not active
    """
    return _hardware_monitor.get_metrics()


def get_gpu_compute_capability() -> Optional[Tuple[int, int]]:
    """Get GPU compute capability version.
    
    Returns
    -------
    Optional[Tuple[int, int]]
        (major, minor) compute capability or None if not available
    """
    try:
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        major, minor = pynvml.nvmlDeviceGetCudaComputeCapability(handle)
        return (major, minor)
    except Exception:
        return None


def get_gpu_info() -> Dict[str, Union[str, int, float]]:
    """Get detailed GPU information.
    
    Returns
    -------
    Dict[str, Union[str, int, float]]
        GPU information including name, memory, compute capability
    """
    info = {"available": False}
    
    try:
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        
        # Basic info
        info["available"] = True
        info["name"] = pynvml.nvmlDeviceGetName(handle).decode('utf-8')
        
        # Memory
        mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
        info["total_memory_gb"] = _bytes_to_gb(mem_info.total)
        info["free_memory_gb"] = _bytes_to_gb(mem_info.free)
        info["used_memory_gb"] = _bytes_to_gb(mem_info.used)
        
        # Compute capability
        compute_cap = get_gpu_compute_capability()
        if compute_cap:
            info["compute_capability"] = f"{compute_cap[0]}.{compute_cap[1]}"
            info["cuda_cores"] = _estimate_cuda_cores(compute_cap[0], compute_cap[1])
        
        # Clock speeds
        try:
            info["graphics_clock_mhz"] = pynvml.nvmlDeviceGetClockInfo(handle, pynvml.NVML_CLOCK_GRAPHICS)
            info["memory_clock_mhz"] = pynvml.nvmlDeviceGetClockInfo(handle, pynvml.NVML_CLOCK_MEM)
        except Exception:
            pass
        
    except Exception as e:
        logging.getLogger(__name__).debug(f"GPU info collection failed: {e}")
    
    return info


def _estimate_cuda_cores(major: int, minor: int) -> int:
    """Estimate CUDA cores based on compute capability.
    
    This is an approximation based on known architectures.
    """
    # Mapping compute capability to cores per SM
    cores_per_sm = {
        (3, 0): 192,  # Kepler
        (3, 5): 192,
        (5, 0): 128,  # Maxwell
        (5, 2): 128,
        (6, 0): 64,   # Pascal
        (6, 1): 128,
        (7, 0): 64,   # Volta
        (7, 5): 64,   # Turing
        (8, 0): 64,   # Ampere
        (8, 6): 128,
        (8, 9): 128,  # Ada Lovelace
    }
    
    return cores_per_sm.get((major, minor), 64)


def get_hardware_profile(hw: Optional[Dict[str, Union[float, str]]] = None) -> HardwareTier:
    """Determine hardware performance tier.
    
    Parameters
    ----------
    hw: Optional[Dict[str, Union[float, str]]]
        Hardware summary, uses hw_summary() if None
        
    Returns
    -------
    HardwareTier
        Hardware performance classification
    """
    hw = hw or hw_summary()
    ram_gb = hw.get("ram_gb", 0)
    gpu_vram = hw.get("gpu_vram_gb", 0) or 0
    
    if ram_gb >= 32 and gpu_vram >= 16:
        return HardwareTier.WORKSTATION
    elif ram_gb >= 16 and gpu_vram >= 8:
        return HardwareTier.HIGH_END
    elif ram_gb >= 8 and gpu_vram >= 4:
        return HardwareTier.MID_RANGE
    else:
        return HardwareTier.LOW_END


def estimate_model_performance(
    model_spec: Dict[str, Union[str, float]], 
    hw: Optional[Dict[str, Union[float, str]]] = None
) -> Dict[str, Union[float, str]]:
    """Estimate model performance on current hardware.
    
    Parameters
    ----------
    model_spec: Dict[str, Union[str, float]]
        Model specification with size_gb
    hw: Optional[Dict[str, Union[float, str]]]
        Hardware configuration
        
    Returns
    -------
    Dict[str, Union[float, str]]
        Performance estimates including tokens/sec, memory efficiency
    """
    hw = hw or hw_summary()
    model_size_gb = model_spec.get("size_gb", 0)
    ram_gb = hw.get("ram_gb", 0)
    free_ram_gb = hw.get("free_ram_gb", 0)
    gpu_vram_gb = hw.get("gpu_vram_gb", 0) or 0
    
    # Performance scoring (0.0 - 1.0)
    memory_ratio = min(free_ram_gb / max(model_size_gb, 1), 1.0)
    gpu_boost = min(gpu_vram_gb / max(model_size_gb, 1), 1.0) * 0.3 if gpu_vram_gb > 0 else 0
    
    performance_score = min(memory_ratio + gpu_boost, 1.0)
    
    # Estimate tokens per second (very rough approximation)
    base_tokens_per_sec = 10.0  # Conservative baseline
    if gpu_vram_gb >= model_size_gb:
        estimated_tokens_per_sec = base_tokens_per_sec * 3.0 * performance_score
    else:
        estimated_tokens_per_sec = base_tokens_per_sec * performance_score
    
    # Memory efficiency
    memory_efficiency = "high" if memory_ratio > 0.8 else "medium" if memory_ratio > 0.5 else "low"
    
    # Expected load time
    base_load_time = model_size_gb * 2  # 2 seconds per GB baseline
    if gpu_vram_gb >= model_size_gb:
        load_time_sec = base_load_time * 0.7  # GPU loading is faster
    else:
        load_time_sec = base_load_time
    
    return {
        "performance_score": round(performance_score, 2),
        "estimated_tokens_per_sec": round(estimated_tokens_per_sec, 1),
        "memory_efficiency": memory_efficiency,
        "estimated_load_time_sec": round(load_time_sec, 1),
        "gpu_accelerated": gpu_vram_gb >= model_size_gb,
        "memory_pressure": "high" if memory_ratio < 0.3 else "medium" if memory_ratio < 0.7 else "low"
    }


def hw_summary() -> Dict[str, Union[float, str]]:
    """Enhanced hardware summary with additional metrics.
    
    Returns
    -------
    Dict[str, Union[float, str]]
        Comprehensive hardware information
    """
    summary = {
        "ram_gb": system_ram_gb(),
        "free_ram_gb": free_ram_gb(),
        "gpu_vram_gb": gpu_vram_gb(),
    }
    
    # Add GPU information
    gpu_info = get_gpu_info()
    if gpu_info["available"]:
        summary["gpu_name"] = gpu_info["name"]
        summary["gpu_compute_capability"] = gpu_info.get("compute_capability")
        
    # Add hardware tier
    summary["hardware_tier"] = get_hardware_profile(summary).value
    
    # Add current metrics if monitoring is active
    metrics = get_current_metrics()
    if metrics:
        summary["ram_usage_percent"] = metrics.ram_usage_percent
        summary["gpu_utilization_percent"] = metrics.gpu_utilization_percent
        summary["gpu_temperature_c"] = metrics.temperature_celsius
    
    return summary


def check_memory_pressure() -> Dict[str, Union[bool, float, str]]:
    """Check current memory pressure and recommendations.
    
    Returns
    -------
    Dict[str, Union[bool, float, str]]
        Memory pressure analysis and recommendations
    """
    hw = hw_summary()
    metrics = get_current_metrics()
    
    free_ram_gb = hw["free_ram_gb"]
    ram_usage = metrics.ram_usage_percent if metrics else 0.0
    
    # Memory pressure thresholds
    high_pressure = free_ram_gb < 2.0 or ram_usage > 85
    medium_pressure = free_ram_gb < 4.0 or ram_usage > 70
    
    recommendations = []
    if high_pressure:
        recommendations.extend([
            "Close unnecessary applications",
            "Consider using smaller models",
            "Enable model quantization if available"
        ])
    elif medium_pressure:
        recommendations.extend([
            "Monitor memory usage during inference",
            "Consider model optimization settings"
        ])
    
    return {
        "high_pressure": high_pressure,
        "medium_pressure": medium_pressure,
        "free_ram_gb": free_ram_gb,
        "ram_usage_percent": ram_usage,
        "recommendations": recommendations,
        "status": "critical" if high_pressure else "warning" if medium_pressure else "ok"
    }
