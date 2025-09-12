import argparse
import asyncio
import sys
from .download import (
    list_files,
    resolve_selection,
    download_many,
    list_files_with_sizes,
    get_context_length,
)
from .logging_utils import audit_log
from .hw import hw_summary
from .model_compat import combined_fit
from .discovery.model_discovery import get_model_discovery
from .server.openai_server import start_openai_server
# GUI module removed - use React web interface instead


def _gb(nbytes: int) -> float:
    return round(nbytes / (1024**3), 2)


def do_assess(model_id: str):
    hw = hw_summary()
    files = list_files_with_sizes(model_id)
    if not files:
        print("No files found to assess")
        return
    ctx = get_context_length(model_id)
    if ctx:
        print(f"Context window: {ctx} tokens")
    print(
        f"Hardware: RAM {hw['free_ram_gb']}/{hw['ram_gb']} GB free/total, VRAM {hw['gpu_vram_gb'] or 'None'} GB"
    )
    print(f"{'File':60} {'Size(GB)':>10} {'Fit':>10} {'Path':>12}")
    for f in files:
        size_gb = _gb(f["size_bytes"])
        fit, hint = combined_fit(size_gb, hw["free_ram_gb"], hw["gpu_vram_gb"], f["name"])
        print(f"{f['name'][:60]:60} {size_gb:10.2f} {fit:>10} {hint:>12}")


def main():
    p = argparse.ArgumentParser(
        "bear_ai",
        description="BEAR AI: Privacy-First, Local-Only AI - Bridge for Expertise, Audit and Research"
    )
    
    # Add subcommands
    subparsers = p.add_subparsers(dest='command', help='Available commands')
    
    # Legacy download command (default)
    download_parser = subparsers.add_parser('download', help='Download models from HuggingFace')
    download_parser.add_argument(
        "model_id",
        nargs="?",
        help="Hugging Face repo id, for example TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
    )
    download_parser.add_argument(
        "filename",
        nargs="?",
        help="Specific filename to download. Omit to use --include or download all matching files.",
    )
    download_parser.add_argument("--list", action="store_true", help="List available files and exit")
    download_parser.add_argument("--assess", action="store_true", help="Assess model files vs your RAM and VRAM")
    download_parser.add_argument("--suggest", action="store_true", help="Suggest models that fit your hardware")
    download_parser.add_argument("--dest", default="models", help="Download directory")
    download_parser.add_argument("--include", help="Substring to match multiple files")
    
    # New discover command
    discover_parser = subparsers.add_parser('discover', help='Smart model discovery and recommendations')
    discover_parser.add_argument('--task', default='chat', choices=['chat', 'code', 'embedding', 'multimodal'], help='Task type')
    discover_parser.add_argument('--auto-install', action='store_true', help='Auto-install best model')
    
    # Server command
    server_parser = subparsers.add_parser('serve', help='Start OpenAI-compatible API server')
    server_parser.add_argument('--host', default='127.0.0.1', help='Server host')
    server_parser.add_argument('--port', type=int, default=8000, help='Server port')
    
    # GUI command
    gui_parser = subparsers.add_parser('gui', help='Launch desktop GUI application')
    
    # Chat command
    chat_parser = subparsers.add_parser('chat', help='Interactive chat interface')
    chat_parser.add_argument('--model', help='Model to use for chat')
    
    # Legacy arguments for backward compatibility
    p.add_argument(
        "model_id",
        nargs="?",
        help="Hugging Face repo id (legacy, use 'download' subcommand instead)",
    )
    p.add_argument(
        "filename",
        nargs="?",
        help="Specific filename (legacy, use 'download' subcommand instead)",
    )
    p.add_argument("--list", action="store_true", help="List available files (legacy)")
    p.add_argument("--assess", action="store_true", help="Assess model files (legacy)")
    p.add_argument("--suggest", action="store_true", help="Suggest models (legacy)")
    p.add_argument("--dest", default="models", help="Download directory (legacy)")
    p.add_argument("--include", help="Substring to match multiple files (legacy)")
    p.add_argument("--gui", action="store_true", help="Launch GUI (legacy)")
    p.add_argument("--serve", action="store_true", help="Start server (legacy)")
    args = p.parse_args()
    
    # Handle new subcommands
    if args.command == 'discover':
        asyncio.run(handle_discover_command(args))
        return
    elif args.command == 'serve':
        print(f"🚀 Starting OpenAI-compatible server on {args.host}:{args.port}")
        start_openai_server(args.host, args.port)
        return
    elif args.command == 'gui':
        print("GUI module removed. Please use the React web interface by running: npm start")
        return
    elif args.command == 'chat':
        from .chat import main as chat_main
        chat_main(args.model)
        return
    elif args.command == 'download':
        # Handle download subcommand
        handle_download_command(args)
        return
    
    # Handle legacy flags
    if args.gui:
        print("GUI module removed. Please use the React web interface by running: npm start")
        return
    
    if args.serve:
        print("🚀 Starting OpenAI-compatible server on 127.0.0.1:8000")
        start_openai_server()
        return

    if args.suggest:
        from .model_suggest import suggest_models

        for spec in suggest_models():
            print(
                f"{spec['id']:60} {spec['size_gb']:>6.2f}GB {spec['fit']:>10} {spec['hint']:>12}"
            )
        return

    # Legacy download handling
    if not args.model_id:
        # If no model_id and no command, show help and suggest GUI
        print("🐻 Welcome to BEAR AI - Privacy-First, Local-Only AI\n")
        print("Quick start:")
        print("  npm start            # Launch React web interface")
        print("  bear-ai discover     # Find compatible models")
        print("  bear-ai serve        # Start OpenAI-compatible server\n")
        p.print_help()
        return

    handle_download_command(args)


async def handle_discover_command(args):
    """Handle model discovery command"""
    
    print(f"🔍 Discovering {args.task} models for your system...")
    
    discovery = get_model_discovery()
    models = await discovery.discover_models(args.task)
    
    if not models:
        print("❌ No compatible models found")
        return
    
    print(f"✅ Found {len(models)} compatible models:\n")
    
    for i, model in enumerate(models[:5], 1):  # Show top 5
        print(f"{i}. {model.model_name}")
        print(f"   Size: {model.size_gb:.1f}GB | Format: {model.format}")
        print(f"   Compatibility: {model.compatibility_score:.0%}")
        print(f"   Speed: {model.estimated_speed} | RAM: {model.memory_usage}")
        print(f"   Reason: {model.reason}")
        print()
    
    if args.auto_install and models:
        print(f"🚀 Auto-installing best model: {models[0].model_name}")
        
        model_path = await discovery.auto_install_best_model(args.task)
        
        if model_path:
            print(f"✅ Successfully installed to: {model_path}")
        else:
            print("❌ Installation failed")


def handle_download_command(args):
    """Handle legacy download command"""
    
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
