from pathlib import Path
from unittest.mock import patch

import pytest

from bear_ai.model_downloader import download_model


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
