from __future__ import annotations
import argparse
import sys
from pathlib import Path

from .logging_utils import audit_log
from .security import scrub_pii


def _read_text(path: str | None) -> str:
    if not path or path == "-":
        return sys.stdin.read()
    return Path(path).read_text(encoding="utf-8", errors="replace")


def _write_text(path: str | None, data: str) -> None:
    if not path or path == "-":
        sys.stdout.write(data)
        return
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(data, encoding="utf-8")


def main():
    p = argparse.ArgumentParser("bear-scrub", description="Redact common PII from text")
    p.add_argument("--in", dest="inp", default="-", help="Input file or '-' for stdin")
    p.add_argument("--out", dest="out", default="-", help="Output file or '-' for stdout")
    args = p.parse_args()

    raw = _read_text(args.inp)
    redacted = scrub_pii(raw)
    _write_text(args.out, redacted)
    audit_log("scrub_pii", {"in": args.inp, "out": args.out, "bytes": len(raw)})


if __name__ == "__main__":
    main()

