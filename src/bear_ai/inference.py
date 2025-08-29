class LocalInference:
    def __init__(self, model_path: str):
        raise NotImplementedError("Hook up llama.cpp or similar runtime")

    def generate(self, prompt: str):
        raise NotImplementedError

# Example integration:
# meter = ThroughputMeter()
# for token in generate_tokens(...):
#     meter.on_tokens(1)
#     gui.speed_var.set(f"Speed: {meter.tokens_per_sec():.1f} tok/s")
