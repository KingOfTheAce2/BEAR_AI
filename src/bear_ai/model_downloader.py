"""Utilities for downloading LLM models.

This module contains a thin wrapper around `huggingface_hub` for fetching
GGUF and other model files. It is intentionally light-weight so it can run
on Windows without additional dependencies.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

try:
    from huggingface_hub import hf_hub_download
except ImportError:  # pragma: no cover - library may not be installed at test time
    hf_hub_download = None  # type: ignore


def download_model(model_id: str, filename: str, destination: Optional[Path] = None) -> Path:
    """Download a model file from the Hugging Face Hub.

    Parameters
    ----------
    model_id:
        Repository ID on the Hugging Face Hub.
    filename:
        Name of the file inside the repository to download (e.g. ``model.gguf``).
    destination:
        Optional directory where the file will be stored. Defaults to the current
        working directory.

    Returns
    -------
    Path
        Local path to the downloaded file.
    """
    if hf_hub_download is None:
        raise ImportError("huggingface_hub is required to download models")

    dest = Path(destination) if destination else Path.cwd()
    dest.mkdir(parents=True, exist_ok=True)

    return Path(hf_hub_download(model_id=model_id, filename=filename, cache_dir=dest))
