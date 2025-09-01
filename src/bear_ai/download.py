from __future__ import annotations
import pathlib
from typing import Iterable, List, Optional
from huggingface_hub import HfApi, hf_hub_download, repo_info
from tqdm import tqdm

def list_files(model_id: str) -> List[str]:
    api = HfApi()
    try:
        return api.list_repo_files(model_id)
    except Exception as e:
        raise RuntimeError(f"Failed to list files for {model_id}: {e}") from e

def download_one(model_id: str, filename: str, dest_dir: str) -> str:
    dest = pathlib.Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    # Use hf_hub_download to leverage HF caching and etags
    try:
        local_path = hf_hub_download(repo_id=model_id, filename=filename, local_dir=str(dest))
    except Exception as e:
        raise RuntimeError(f"Failed to download {filename} from {model_id}: {e}") from e
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


def list_files_with_sizes(model_id: str):
    """
    Return list of dicts: {name, size_bytes}
    """
    try:
        info = repo_info(model_id, files_metadata=True)
    except Exception as e:
        raise RuntimeError(f"Failed to fetch repo info for {model_id}: {e}") from e
    out = []
    for f in info.siblings:
        # skip directories
        if getattr(f, "size", None) is None:
            continue
        out.append({"name": f.rfilename, "size_bytes": f.size})
    return out
