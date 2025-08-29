from bear_ai import model_compat


def test_combined_fit_orders():
    # 4 GB model, 6 GB free RAM, 4 GB VRAM
    fit, hint = model_compat.combined_fit(4.0, 6.0, 4.0, "model.q4_0.gguf")
    assert fit in {"OK", "Borderline"}
    assert hint in {"GPU preferred", "CPU preferred", "CPU only"}
