"""Build a standalone Windows executable for the BEAR AI GUI.

This script wraps a simple ``pyinstaller`` invocation so contributors can
create a distributable ``bear-ai.exe`` without remembering all the flags.
Run it on Windows after installing ``pyinstaller``::

    pip install pyinstaller
    python scripts/build_exe.py
"""
from __future__ import annotations

import subprocess
from pathlib import Path


def build() -> None:
    root = Path(__file__).resolve().parents[1]
    subprocess.run(
        [
            "pyinstaller",
            "--name",
            "bear-ai",
            "--onefile",
            "--windowed",
            "-m",
            "bear_ai.gui",
        ],
        cwd=root,
        check=True,
    )


if __name__ == "__main__":  # pragma: no cover - manual build script
    build()
