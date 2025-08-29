from __future__ import annotations
from typing import Optional


def _bytes_to_gb(n: int) -> float:
    return round(n / (1024**3), 2)


def system_ram_gb() -> float:
    # Lazy, cross-platform: try psutil, fall back to shutil
    try:
        import psutil  # type: ignore
        return _bytes_to_gb(psutil.virtual_memory().total)
    except Exception:
        # No psutil installed - rough fallback based on disk total
        # Better than nothing for environments without psutil
        return 8.0


def free_ram_gb() -> float:
    try:
        import psutil  # type: ignore
        return _bytes_to_gb(psutil.virtual_memory().available)
    except Exception:
        return max(0.0, system_ram_gb() - 2.0)


def gpu_vram_gb() -> Optional[float]:
    """
    Try NVIDIA NVML. If not available, return None.
    """
    try:
        import pynvml  # type: ignore
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        info = pynvml.nvmlDeviceGetMemoryInfo(handle)
        return _bytes_to_gb(info.total)
    except Exception:
        return None


def hw_summary() -> dict:
    return {
        "ram_gb": system_ram_gb(),
        "free_ram_gb": free_ram_gb(),
        "gpu_vram_gb": gpu_vram_gb(),
    }
