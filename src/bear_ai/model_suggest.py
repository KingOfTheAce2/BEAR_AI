from __future__ import annotations
from typing import List, Dict, Optional

from .hw import hw_summary
from .model_compat import combined_fit

# A tiny curated list of popular models with approximate file sizes in GB.
CURATED_MODELS: List[Dict[str, object]] = [
    # 4 GB RAM tier
    {
        "id": "nlpaueb/legal-bert-small-uncased",
        "size_gb": 0.1,
        "description": "LEGAL-BERT-SMALL for embeddings and classification",
    },
    {
        "id": "law-ai/InCaseLawBERT",
        "size_gb": 0.45,
        "description": "InCaseLawBERT for legal reasoning and sentence tagging",
    },
    {
        "id": "Muhammad2003/Llama3-LegalLM",
        "size_gb": 2.0,
        "description": "Llama3-LegalLM for legal document generation",
    },
    # 8 GB RAM tier
    {
        "id": "AdaptLLM/law-LLM",
        "size_gb": 4.0,
        "description": "AdaptLLM Law-LLM (7B) for richer legal drafting",
    },
    {
        "id": "Equall/Saul-7B-Base",
        "size_gb": 4.0,
        "description": "SaulLM-7B trained on legal text",
    },
    {
        "id": "lexlms/legal-roberta-large",
        "size_gb": 1.4,
        "description": "LexLM Large for deep legal inference",
    },
    # 16 GB RAM tier
    {
        "id": "Equall/SaulLM-54B",
        "size_gb": 27.0,
        "description": "SaulLM-54B for high-performance legal reasoning",
    },
    {
        "id": "bigscience/bloom",
        "size_gb": 352.0,
        "description": "BLOOM multilingual 176B model",
    },
    {
        "id": "microsoft/Phi-3-small-4k-instruct",
        "size_gb": 7.5,
        "description": "Phi-3 small instruct model",
    },
    # Existing general-purpose suggestions
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
