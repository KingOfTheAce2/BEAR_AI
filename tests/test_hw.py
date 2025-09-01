import builtins
import sys

import bear_ai.hw as hw


def test_system_ram_no_psutil(monkeypatch):
    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "psutil":
            raise ImportError("no psutil")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)

    # Provide deterministic sysconf values
    import os

    def fake_sysconf(key):
        if key == "SC_PHYS_PAGES":
            return 1024
        if key == "SC_PAGE_SIZE":
            return 4096
        raise ValueError
    monkeypatch.setattr(os, "sysconf", fake_sysconf)

    gb = hw.system_ram_gb()
    assert gb == hw._bytes_to_gb(1024 * 4096)
