from __future__ import annotations
from typing import List, Dict, Optional

from .hw import hw_summary
from .model_compat import combined_fit

# A tiny curated list of popular models with approximate file sizes in GB.
CURATED_MODELS: List[Dict[str, object]] = [
    {
        "id": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        "size_gb": 1.1,
        "description": "Fast 1B chat model",
    },
    {
        "id": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
        "size_gb": 4.1,
        "description": "7B instruct model (q4_0)",
    },
]


def suggest_models(hw: Optional[Dict[str, float]] = None) -> List[Dict[str, object]]:
    """Return curated models that fit the current hardware.

    Parameters
    ----------
    hw: Optional[Dict[str, float]]
        Precomputed hardware summary. If omitted, :func:`hw_summary` is used.

    Returns
    -------
    List[Dict[str, object]]
        List of models with fit information.
    """
    hw = hw or hw_summary()
    out: List[Dict[str, object]] = []
    for spec in CURATED_MODELS:
        fit, hint = combined_fit(
            spec["size_gb"], hw["free_ram_gb"], hw["gpu_vram_gb"], spec["id"]
        )
        if fit in {"OK", "Borderline"}:
            item = dict(spec)
            item.update({"fit": fit, "hint": hint})
            out.append(item)
    return out
