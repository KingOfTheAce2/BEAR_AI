from pathlib import Path
from unittest.mock import patch

import pytest

from bear_ai.model_downloader import download_model, list_model_files


@patch("bear_ai.model_downloader.hf_hub_download")
def test_download_model_uses_huggingface(mock_download, tmp_path: Path):
    mock_download.return_value = tmp_path / "model.gguf"

    result = download_model("owner/repo", "model.gguf", destination=tmp_path)

    mock_download.assert_called_once_with(
        model_id="owner/repo", filename="model.gguf", cache_dir=tmp_path
    )
    assert result == tmp_path / "model.gguf"


def test_missing_dependency(monkeypatch):
    monkeypatch.setattr("bear_ai.model_downloader.hf_hub_download", None)
    with pytest.raises(ImportError):
        download_model("owner/repo", "model.gguf")


@patch("bear_ai.model_downloader.list_repo_files")
def test_list_model_files_uses_huggingface(mock_list):
    mock_list.return_value = ["a.gguf", "b.gguf"]

    result = list_model_files("owner/repo")

    mock_list.assert_called_once_with(model_id="owner/repo")
    assert result == ["a.gguf", "b.gguf"]


def test_list_model_files_missing_dependency(monkeypatch):
    monkeypatch.setattr("bear_ai.model_downloader.list_repo_files", None)
    with pytest.raises(ImportError):
        list_model_files("owner/repo")
