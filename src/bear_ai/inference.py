class LocalInference:
    def __init__(self, model_path: str):
        raise NotImplementedError("Hook up llama.cpp or similar runtime")

    def generate(self, prompt: str):
        raise NotImplementedError
