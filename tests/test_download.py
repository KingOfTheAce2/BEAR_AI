import pytest
from bear_ai import download

import pytest
from bear_ai import download


class FakeApi:
    def __init__(self, files):
        self._files = files

    def list_repo_files(self, model_id):
        return list(self._files)


def test_resolve_selection(monkeypatch):
    monkeypatch.setattr(download, "HfApi", lambda: FakeApi(["a.gguf", "b.bin", "c.gguf"]))
    files = download.resolve_selection("repo/model", include=".gguf")
    assert files == ["a.gguf", "c.gguf"]


def test_list_files_error(monkeypatch):
    class BadApi:
        def list_repo_files(self, model_id):
            raise OSError("boom")

    monkeypatch.setattr(download, "HfApi", lambda: BadApi())
    with pytest.raises(RuntimeError, match="Failed to list files"):
        download.list_files("repo/model")


def test_download_one_error(monkeypatch, tmp_path):
    def bad_download(**kwargs):
        raise OSError("network down")

    monkeypatch.setattr(download, "hf_hub_download", bad_download)
    with pytest.raises(RuntimeError, match="Failed to download"):
        download.download_one("repo/model", "file.gguf", tmp_path)
