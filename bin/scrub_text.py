#!/usr/bin/env python3
import sys
import argparse

from pii.scrubber import Scrubber


def main():
    ap = argparse.ArgumentParser(description="Scrub PII from text via Microsoft Presidio (local)")
    ap.add_argument("--lang", default="en", help="Language code: en or nl")
    ap.add_argument("--infile", default="-", help="Input file or - for stdin")
    args = ap.parse_args()

    text = sys.stdin.read() if args.infile == "-" else open(args.infile, "r", encoding="utf-8").read()
    scrubbed, _ = Scrubber().anonymize(text, args.lang)
    sys.stdout.write(scrubbed)


if __name__ == "__main__":
    main()

