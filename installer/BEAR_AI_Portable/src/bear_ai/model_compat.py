from __future__ import annotations
from typing import Literal, Tuple

Fit = Literal["OK", "Borderline", "Not OK"]

_QUANT_HINTS = {
    # very rough heuristics - safe side for corporate laptops
    # filename contains -> typical working floor RAM overhead multiplier
    "q2": 1.4,
    "q3": 1.35,
    "q4": 1.3,
    "q5": 1.25,
    "q6": 1.2,
    "q8": 1.15,
    "k_m": 1.25,  # K_M/K_S families tend to need a bit more headroom
    "k_s": 1.2,
}

def _quant_multiplier(name: str) -> float:
    n = name.lower()
    for key, mult in _QUANT_HINTS.items():
        if key in n:
            return mult
    return 1.3

def assess_cpu_fit(file_size_gb: float, free_ram_gb: float, name: str) -> Fit:
    mult = _quant_multiplier(name)
    need = file_size_gb * mult + 0.8  # add extra buffer for KV cache and runtime
    if free_ram_gb >= need:
        return "OK"
    if free_ram_gb >= need * 0.8:
        return "Borderline"
    return "Not OK"

def assess_gpu_fit(file_size_gb: float, vram_gb: float, name: str) -> Fit:
    # Very rough: assume VRAM requirement ~ model file size for GPU loading,
    # plus small headroom. Adjust by quant multiplier.
    mult = max(1.05, _quant_multiplier(name) - 0.1)
    need = file_size_gb * mult + 0.5
    if vram_gb >= need:
        return "OK"
    if vram_gb >= need * 0.85:
        return "Borderline"
    return "Not OK"

def combined_fit(file_size_gb: float, free_ram_gb: float, vram_gb: float | None, name: str) -> Tuple[Fit, str]:
    cpu = assess_cpu_fit(file_size_gb, free_ram_gb, name)
    if vram_gb is None:
        return cpu, "CPU only"
    gpu = assess_gpu_fit(file_size_gb, vram_gb, name)
    # Prefer GPU fit if it is at least as good as CPU
    rank = {"OK": 2, "Borderline": 1, "Not OK": 0}
    if rank[gpu] >= rank[cpu]:
        return gpu, "GPU preferred"
    return cpu, "CPU preferred"
