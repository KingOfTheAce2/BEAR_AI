from __future__ import annotations
from typing import Optional


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
