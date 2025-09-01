import sys

import bear_ai.chat as chat


def test_show_speed_invokes_meter(monkeypatch):
    calls = {"count": 0}

    def fake_tokens_per_sec(self):
        calls["count"] += 1
        return 123.0

    monkeypatch.setattr(chat.ThroughputMeter, "tokens_per_sec", fake_tokens_per_sec)

    class DummyLLM:
        def __init__(self, *args, **kwargs):
            pass

        def generate(self, text, n_predict, temperature, top_p):
            yield "a"
            yield "b"

    monkeypatch.setattr(chat, "LocalInference", lambda *a, **k: DummyLLM())
    monkeypatch.setattr(chat.Path, "exists", lambda self: True)

    monkeypatch.setattr(sys, "argv", [
        "bear-chat",
        "--model",
        "m.gguf",
        "--prompt",
        "hi",
        "--show-speed",
    ])

    chat.main()
    assert calls["count"] > 0
