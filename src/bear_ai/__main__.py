"""Command line interface for BEAR AI model downloads."""

from __future__ import annotations

import argparse
from pathlib import Path

from .model_downloader import download_model, list_model_files


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Download LLM models for BEAR AI")
    parser.add_argument("model", help="Hugging Face model repository ID")
    parser.add_argument(
        "filename",
        nargs="?",
        help="File name within the model repository",
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=Path("models"),
        help="Destination directory for the download (default: ./models)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available files for the given model and exit",
    )
    args = parser.parse_args(argv)

    if args.list:
        files = list_model_files(args.model)
        for name in files:
            print(name)
        return

    if not args.filename:
        parser.error("filename is required unless --list is specified")

    path = download_model(args.model, args.filename, destination=args.dest)
    print(f"Model downloaded to {path}")


if __name__ == "__main__":  # pragma: no cover - entrypoint
    main()
