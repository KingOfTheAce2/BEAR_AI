import subprocess
import sys


def test_help_text_no_interactive_list():
    proc = subprocess.run([sys.executable, "-m", "bear_ai", "--help"], capture_output=True, text=True)
    assert "interactive list" not in proc.stdout
