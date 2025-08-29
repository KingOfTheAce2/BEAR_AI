import argparse
import sys
from .download import list_files, resolve_selection, download_many
from .logging_utils import audit_log


def main():
    p = argparse.ArgumentParser("bear_ai")
    p.add_argument("model_id", help="Hugging Face repo id, for example TheBloke/Mistral-7B-Instruct-v0.2-GGUF")
    p.add_argument("filename", nargs="?", help="Specific filename to download. Omit to use --include or interactive list.")
    p.add_argument("--list", action="store_true", help="List available files and exit")
    p.add_argument("--dest", default="models", help="Download directory")
    p.add_argument("--include", help="Substring to match multiple files")
    args = p.parse_args()

    if args.list:
        for f in list_files(args.model_id):
            print(f)
        return

    if args.filename:
        selection = [args.filename]
    else:
        selection = resolve_selection(args.model_id, include=args.include)
        if not selection:
            print("No files matched. Use --list to inspect available files.", file=sys.stderr)
            sys.exit(2)

    paths = download_many(args.model_id, selection, args.dest)
    for pth in paths:
        print(pth)

    audit_log(event="download", details={"model_id": args.model_id, "count": len(paths), "dest": args.dest})

if __name__ == "__main__":
    main()
