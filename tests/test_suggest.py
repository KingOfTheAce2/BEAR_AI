from bear_ai.model_suggest import suggest_models


def test_suggest_models_filters_by_ram():
    hw = {"ram_gb": 16.0, "free_ram_gb": 4.0, "gpu_vram_gb": None}
    suggestions = suggest_models(hw)
    ids = {m["id"] for m in suggestions}
    assert "TinyLlama/TinyLlama-1.1B-Chat-v1.0" in ids
    assert "TheBloke/Mistral-7B-Instruct-v0.2-GGUF" not in ids
