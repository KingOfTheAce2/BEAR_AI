from unittest.mock import MagicMock

import bear_ai.gui as gui


def test_main_creates_window(monkeypatch):
    events: list[str] = []

    class DummyRoot:
        def __init__(self):
            self.tk = MagicMock()
            self._w = "."
        def title(self, *_):
            pass
        def mainloop(self):
            events.append("loop")

    class DummyApp:
        def __init__(self, root):
            events.append("app")

    monkeypatch.setattr(gui.tk, "Tk", DummyRoot)
    monkeypatch.setattr(gui, "DownloaderApp", DummyApp)
    gui.main()
    assert events == ["app", "loop"]
