from __future__ import annotations
import os
import pathlib
from typing import Iterable, List, Optional
from huggingface_hub import HfApi, hf_hub_download
from tqdm import tqdm

def list_files(model_id: str) -> List[str]:
    api = HfApi()
    return api.list_repo_files(model_id)

def download_one(model_id: str, filename: str, dest_dir: str) -> str:
    dest = pathlib.Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    # Use hf_hub_download to leverage HF caching and etags
    local_path = hf_hub_download(repo_id=model_id, filename=filename, local_dir=str(dest))
    return local_path

def download_many(model_id: str, files: Iterable[str], dest_dir: str) -> List[str]:
    out = []
    files = list(files)
    for f in tqdm(files, desc=f"Downloading from {model_id}", unit="file"):
        out.append(download_one(model_id, f, dest_dir))
    return out

def resolve_selection(model_id: str, include: Optional[str] = None) -> List[str]:
    files = list_files(model_id)
    if include:
        # Simple contains filter, can later be upgraded to fnmatch
        files = [f for f in files if include in f]
    return files
