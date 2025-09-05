from __future__ import annotations
from typing import List, Dict, Optional, Tuple, Union
import logging
import time

from .hw import hw_summary, get_hardware_profile, estimate_model_performance
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


def suggest_models(
    hw: Optional[Dict[str, Union[float, str]]] = None,
    use_performance_prediction: bool = True,
    min_performance_score: float = 0.3
) -> List[Dict[str, object]]:
    """Return curated models that fit the current hardware with performance predictions.

    Parameters
    ----------
    hw: Optional[Dict[str, Union[float, str]]]
        Precomputed hardware summary. If omitted, :func:`hw_summary` is used.
    use_performance_prediction: bool
        Whether to include performance estimates for models.
    min_performance_score: float
        Minimum performance score (0.0-1.0) to include models.

    Returns
    -------
    List[Dict[str, object]]
        List of models with fit information, performance predictions, and hardware recommendations.
    """
    hw = hw or hw_summary()
    profile = get_hardware_profile(hw)
    
    out: List[Dict[str, object]] = []
    
    for spec in CURATED_MODELS:
        fit, hint = combined_fit(
            spec["size_gb"], hw["free_ram_gb"], hw["gpu_vram_gb"], spec["id"]
        )
        
        if fit in {"OK", "Borderline"}:
            item = dict(spec)
            item.update({"fit": fit, "hint": hint, "profile": profile})
            
            # Add performance prediction
            if use_performance_prediction:
                perf_data = estimate_model_performance(spec, hw)
                item.update(perf_data)
                
                # Filter by minimum performance score
                if perf_data.get("performance_score", 1.0) < min_performance_score:
                    continue
            
            out.append(item)
    
    # Sort by performance score (descending) if available, otherwise by size
    if use_performance_prediction:
        out.sort(key=lambda x: x.get("performance_score", 0.0), reverse=True)
    else:
        out.sort(key=lambda x: x["size_gb"])
        
    return out


def get_recommended_models_by_use_case(
    use_case: str,
    hw: Optional[Dict[str, Union[float, str]]] = None
) -> List[Dict[str, object]]:
    """Get model recommendations tailored to specific use cases.
    
    Parameters
    ----------
    use_case: str
        The intended use case: 'legal', 'chat', 'embedding', 'generation', 'analysis'
    hw: Optional[Dict[str, Union[float, str]]]
        Hardware constraints
        
    Returns
    -------
    List[Dict[str, object]]
        Filtered and ranked models for the use case
    """
    all_models = suggest_models(hw)
    
    use_case_keywords = {
        'legal': ['legal', 'law', 'bert', 'saul'],
        'chat': ['chat', 'instruct', 'llama', 'mistral'],
        'embedding': ['bert', 'embed'],
        'generation': ['llm', 'generate', 'bloom'],
        'analysis': ['large', 'bert', 'roberta']
    }
    
    keywords = use_case_keywords.get(use_case.lower(), [])
    if not keywords:
        return all_models
    
    # Score models based on use case relevance
    for model in all_models:
        relevance_score = 0
        model_text = (model['id'] + ' ' + model['description']).lower()
        
        for keyword in keywords:
            if keyword in model_text:
                relevance_score += 1
        
        model['use_case_relevance'] = relevance_score / len(keywords)
    
    # Filter and sort by relevance
    relevant_models = [m for m in all_models if m['use_case_relevance'] > 0]
    relevant_models.sort(key=lambda x: x['use_case_relevance'], reverse=True)
    
    return relevant_models


def get_hardware_recommendations(
    target_model: str,
    current_hw: Optional[Dict[str, Union[float, str]]] = None
) -> Dict[str, object]:
    """Get hardware upgrade recommendations for running a specific model optimally.
    
    Parameters
    ----------
    target_model: str
        Model ID to get recommendations for
    current_hw: Optional[Dict[str, Union[float, str]]]
        Current hardware configuration
        
    Returns
    -------
    Dict[str, object]
        Hardware recommendations and upgrade suggestions
    """
    current_hw = current_hw or hw_summary()
    
    # Find the target model in curated list
    target_spec = None
    for spec in CURATED_MODELS:
        if spec['id'] == target_model:
            target_spec = spec
            break
    
    if not target_spec:
        return {"error": f"Model {target_model} not found in curated list"}
    
    recommendations = {
        "model": target_model,
        "current_fit": combined_fit(
            target_spec["size_gb"], 
            current_hw["free_ram_gb"], 
            current_hw.get("gpu_vram_gb", 0) or 0,
            target_model
        ),
        "recommended_ram_gb": max(16, target_spec["size_gb"] * 2),
        "recommended_vram_gb": max(8, target_spec["size_gb"] * 1.5) if target_spec["size_gb"] > 4 else None,
        "upgrade_priority": []
    }
    
    # Determine upgrade priorities
    if current_hw["free_ram_gb"] < recommendations["recommended_ram_gb"]:
        recommendations["upgrade_priority"].append({
            "component": "RAM",
            "current_gb": current_hw["ram_gb"],
            "recommended_gb": recommendations["recommended_ram_gb"],
            "priority": "high" if current_hw["free_ram_gb"] < target_spec["size_gb"] else "medium"
        })
    
    if (recommendations["recommended_vram_gb"] and 
        (current_hw.get("gpu_vram_gb") or 0) < recommendations["recommended_vram_gb"]):
        recommendations["upgrade_priority"].append({
            "component": "GPU",
            "current_vram_gb": current_hw.get("gpu_vram_gb", 0),
            "recommended_vram_gb": recommendations["recommended_vram_gb"],
            "priority": "medium"
        })
    
    return recommendations
