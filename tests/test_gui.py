import types

from bear_ai import gui


class DummyVar:
    def __init__(self, value=""):
        self._v = value

    def get(self):
        return self._v

    def set(self, v):
        self._v = v


class DummyTable:
    def __init__(self, items, selected=None):
        self._items = items
        self._selected = selected or []

    def selection(self):
        return self._selected

    def get_children(self):
        return list(range(len(self._items)))

    def item(self, idx, field):
        if field == "values":
            return self._items[idx]
        raise KeyError


def _make_app(table):
    return types.SimpleNamespace(
        model_var=DummyVar("model"),
        dest_var=DummyVar("/tmp"),
        include_var=DummyVar(""),
        table=table,
        set_busy=lambda x: None,
        after=lambda *a, **k: (a[1]() if len(a) > 1 else a[0]()),
    )


def test_on_download_all(monkeypatch):
    captured = {}

    def fake_download_many(model, files, dest):
        captured["files"] = list(files)
        return []

    monkeypatch.setattr(gui, "download_many", fake_download_many)
    monkeypatch.setattr(gui, "audit_log", lambda *a, **k: None)
    monkeypatch.setattr(gui, "messagebox", types.SimpleNamespace(showerror=lambda *a, **k: None, showinfo=lambda *a, **k: None))

    class DummyThread:
        def __init__(self, target, daemon=True):
            self.target = target

        def start(self):
            self.target()

    monkeypatch.setattr(gui.threading, "Thread", DummyThread)

    table = DummyTable([("a",), ("b",)])
    app = _make_app(table)

    gui.App.on_download(app)
    assert captured["files"] == ["a", "b"]


def test_on_download_selected(monkeypatch):
    captured = {}

    def fake_download_many(model, files, dest):
        captured["files"] = list(files)
        return []

    monkeypatch.setattr(gui, "download_many", fake_download_many)
    monkeypatch.setattr(gui, "audit_log", lambda *a, **k: None)
    monkeypatch.setattr(gui, "messagebox", types.SimpleNamespace(showerror=lambda *a, **k: None, showinfo=lambda *a, **k: None))

    class DummyThread:
        def __init__(self, target, daemon=True):
            self.target = target

        def start(self):
            self.target()

    monkeypatch.setattr(gui.threading, "Thread", DummyThread)

    table = DummyTable([("a",), ("b",)], selected=[1])
    app = _make_app(table)

    gui.App.on_download(app)
    assert captured["files"] == ["b"]


def test_icon_embedded():
    assert hasattr(gui, "BEAR_ICON_PNG")
    assert gui.BEAR_ICON_PNG.strip()
