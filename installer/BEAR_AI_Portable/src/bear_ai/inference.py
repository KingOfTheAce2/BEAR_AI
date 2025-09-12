from __future__ import annotations
from typing import Generator, Optional
import os


class LocalInference:
    """
    Minimal llama.cpp-based inference wrapper using llama-cpp-python.

    Install optional extra: pip install -e .[inference]
    """

    def __init__(
        self,
        model_path: str,
        n_ctx: int = 4096,
        n_threads: Optional[int] = None,
        n_gpu_layers: int = 0,
        mmap: bool = True,
        mlock: bool = False,
    ):
        try:
            from llama_cpp import Llama  # type: ignore
        except Exception as e:
            raise RuntimeError(
                "llama-cpp-python is not installed. Install with: pip install -e .[inference]"
            ) from e

        if n_threads is None:
            try:
                n_threads = max(1, os.cpu_count() or 1)
            except Exception:
                n_threads = 4

        # Initialize llama
        self._n_ctx = n_ctx
        self._llm = Llama(
            model_path=model_path,
            n_ctx=n_ctx,
            n_threads=n_threads,
            n_gpu_layers=n_gpu_layers,
            use_mmap=mmap,
            use_mlock=mlock,
        )

    def generate(
        self,
        prompt: str,
        n_predict: int = 256,
        temperature: float = 0.7,
        top_p: float = 0.95,
        stop: Optional[list[str]] = None,
    ) -> Generator[str, None, None]:
        """
        Stream tokens from the model as they are produced.
        """
        stop = stop or ["</s>"]

        # create_completion with stream=True yields chunks containing 'choices'[0]['text']
        it = self._llm.create_completion(
            prompt=prompt,
            max_tokens=n_predict,
            temperature=temperature,
            top_p=top_p,
            stop=stop,
            stream=True,
        )
        for chunk in it:
            try:
                text = chunk["choices"][0]["text"]
            except Exception:
                text = ""
            if text:
                yield text

    def tokenize_count(self, text: str) -> int:
        try:
            # llama_cpp expects bytes; do not add BOS here
            toks = self._llm.tokenize(text.encode("utf-8"), add_bos=False)
            return len(toks)
        except Exception:
            # Fallback to character length if tokenizer not available
            return len(text)

    def context_limit(self) -> int:
        return int(self._n_ctx)
