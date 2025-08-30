from __future__ import annotations
import argparse
import sys
from pathlib import Path

from .inference import LocalInference
from .throughput import ThroughputMeter
from .logging_utils import audit_log


def main():
    p = argparse.ArgumentParser("bear-chat", description="Chat with a local GGUF model (llama.cpp)")
    p.add_argument("--model", required=True, help="Path to GGUF model file, e.g. .\\models\\model.q4_0.gguf")
    p.add_argument("--prompt", help="Prompt text. If omitted, reads from stdin.")
    p.add_argument("--n-predict", type=int, default=256, help="Max new tokens")
    p.add_argument("--ctx-size", type=int, default=4096, help="Context size")
    p.add_argument("--n-gpu-layers", type=int, default=0, help="GPU layers (0=CPU; requires CUDA build)")
    p.add_argument("--temperature", type=float, default=0.7)
    p.add_argument("--top-p", type=float, default=0.95)
    p.add_argument("--mmap", action="store_true", help="Enable memory-mapped model loading")
    p.add_argument("--mlock", action="store_true", help="Lock model in RAM (if supported)")
    args = p.parse_args()

    model_path = Path(args.model)
    if not model_path.exists():
        print(f"Model file not found: {model_path}", file=sys.stderr)
        sys.exit(2)

    text = args.prompt if args.prompt is not None else sys.stdin.read()
    if not text:
        print("Provide --prompt or stdin text", file=sys.stderr)
        sys.exit(2)

    try:
        llm = LocalInference(
            str(model_path),
            n_ctx=args.ctx_size,
            n_gpu_layers=args.n_gpu_layers,
            mmap=args.mmap,
            mlock=args.mlock,
        )
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(3)

    meter = ThroughputMeter()
    total = 0
    try:
        for tok in llm.generate(text, n_predict=args.n_predict, temperature=args.temperature, top_p=args.top_p):
            total += len(tok)
            meter.on_tokens(len(tok))
            sys.stdout.write(tok)
            sys.stdout.flush()
    finally:
        sys.stdout.write("\n")
        audit_log(
            "chat_run",
            {
                "model": str(model_path),
                "n_predict": args.n_predict,
                "ctx": args.ctx_size,
                "gpu_layers": args.n_gpu_layers,
            },
        )


if __name__ == "__main__":
    main()

