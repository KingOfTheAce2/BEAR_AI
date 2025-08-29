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
