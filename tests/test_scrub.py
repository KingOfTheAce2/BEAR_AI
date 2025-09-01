import os
import subprocess
import sys
from pathlib import Path

from bear_ai.security import scrub_pii


def test_scrub_basic_patterns():
    s = (
        "Email: alice@example.com, Phone: (415) 555-1234, SSN: 123-45-6789, "
        "Card: 4111 1111 1111 1111, IP: 192.168.1.10"
    )
    out = scrub_pii(s)
    assert "[EMAIL]" in out
    assert "[PHONE]" in out
    assert "[SSN]" in out
    assert "[CARD]" in out
    assert "[IP]" in out


def test_scrub_cli_help():
    env = os.environ.copy()
    env["PYTHONPATH"] = str(Path(__file__).resolve().parents[1] / "src")
    proc = subprocess.run(
        [sys.executable, "-m", "bear_ai.scrub", "--help"], env=env, capture_output=True, text=True
    )
    assert proc.returncode == 0
    assert "Redact" in proc.stdout

