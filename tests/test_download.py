
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


def test_get_context_length(monkeypatch, tmp_path):
    cfg = tmp_path / "config.json"
    cfg.write_text("{\"max_position_embeddings\": 2048}")

    def fake_download(repo_id, filename):
        assert filename == "config.json"
        return str(cfg)

    monkeypatch.setattr(download, "hf_hub_download", fake_download)
    assert download.get_context_length("repo/model") == 2048


def test_get_context_length_missing(monkeypatch):
    def bad_download(**kwargs):
        raise OSError("no config")

    monkeypatch.setattr(download, "hf_hub_download", bad_download)
    assert download.get_context_length("repo/model") is None
