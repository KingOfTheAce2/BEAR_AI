import argparse
import sys
from .download import list_files, resolve_selection, download_many, list_files_with_sizes
from .logging_utils import audit_log
from .hw import hw_summary
from .model_compat import combined_fit


def _gb(nbytes: int) -> float:
    return round(nbytes / (1024**3), 2)


def do_assess(model_id: str):
    hw = hw_summary()
    files = list_files_with_sizes(model_id)
    if not files:
        print("No files found to assess")
        return
    print(
        f"Hardware: RAM {hw['free_ram_gb']}/{hw['ram_gb']} GB free/total, VRAM {hw['gpu_vram_gb'] or 'None'} GB"
    )
    print(f"{'File':60} {'Size(GB)':>10} {'Fit':>10} {'Path':>12}")
    for f in files:
        size_gb = _gb(f["size_bytes"])
        fit, hint = combined_fit(size_gb, hw["free_ram_gb"], hw["gpu_vram_gb"], f["name"])
        print(f"{f['name'][:60]:60} {size_gb:10.2f} {fit:>10} {hint:>12}")


def main():
    p = argparse.ArgumentParser("bear_ai")
    p.add_argument(
        "model_id",
        nargs="?",
        help="Hugging Face repo id, for example TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
    )
    p.add_argument(
        "filename",
        nargs="?",
        help="Specific filename to download. Omit to use --include or interactive list.",
    )
    p.add_argument("--list", action="store_true", help="List available files and exit")
    p.add_argument("--assess", action="store_true", help="Assess model files vs your RAM and VRAM")
    p.add_argument("--suggest", action="store_true", help="Suggest models that fit your hardware")
    p.add_argument("--dest", default="models", help="Download directory")
    p.add_argument("--include", help="Substring to match multiple files")
    args = p.parse_args()

    if args.suggest:
        from .model_suggest import suggest_models

        for spec in suggest_models():
            print(
                f"{spec['id']:60} {spec['size_gb']:>6.2f}GB {spec['fit']:>10} {spec['hint']:>12}"
            )
        return

    if not args.model_id:
        p.error("model_id required unless using --suggest")

    if args.list:
        for f in list_files(args.model_id):
            print(f)
        return

    if args.assess:
        do_assess(args.model_id)
        return

    if args.filename:
        selection = [args.filename]
    else:
        selection = resolve_selection(args.model_id, include=args.include)
        if not selection:
            print("No files matched. Use --list or --assess first.", file=sys.stderr)
            sys.exit(2)

    paths = download_many(args.model_id, selection, args.dest)
    for pth in paths:
        print(pth)

    audit_log(event="download", details={"model_id": args.model_id, "count": len(paths), "dest": args.dest})


if __name__ == "__main__":
    main()
