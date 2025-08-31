import PyInstaller.__main__
import sys
from pathlib import Path

ICON = str(Path(__file__).parent / "bear.ico")  # optional icon if present

def main():
    args = [
        "bear_ai/gui.py",
        "--name",
        "bear_ai",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--windowed",
        "--hidden-import=llama_cpp",
    ]
    if Path(ICON).exists():
        args += ["--icon", ICON]
    PyInstaller.__main__.run(args)

if __name__ == "__main__":
    try:
        main()
        print("Build complete: dist/bear_ai.exe")
    except SystemExit as e:
        sys.exit(e.code)
