"""Command line interface for BEAR AI model downloads."""

from __future__ import annotations

import argparse
from pathlib import Path

from .model_downloader import download_model


def main() -> None:
    parser = argparse.ArgumentParser(description="Download LLM models for BEAR AI")
    parser.add_argument("model", help="Hugging Face model repository ID")
    parser.add_argument("filename", help="File name within the model repository")
    parser.add_argument(
        "--dest",
        type=Path,
        default=Path("models"),
        help="Destination directory for the download (default: ./models)",
    )
    args = parser.parse_args()

    path = download_model(args.model, args.filename, destination=args.dest)
    print(f"Model downloaded to {path}")


if __name__ == "__main__":  # pragma: no cover - entrypoint
    main()
