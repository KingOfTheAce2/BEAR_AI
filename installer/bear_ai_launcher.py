#!/usr/bin/env python3
"""
BEAR AI Legal Assistant - Production Launcher
Clean Python launcher with no build dependencies
"""
import sys
import os
import subprocess
import json
from pathlib import Path
import platform
import webbrowser
from typing import Optional

# Fix Windows console encoding
if sys.platform.startswith('win'):
    try:
        # Try to set UTF-8 encoding for Windows console
        os.system('chcp 65001 >nul 2>&1')
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except:
        # Fallback: disable Unicode characters
        pass

# Version info
VERSION = "2.0.0-production"
APP_NAME = "BEAR AI Legal Assistant"

# Safe print function for Windows console
def safe_print(*args, **kwargs):
    """Print with fallback for encoding issues"""
    try:
        print(*args, **kwargs)
    except UnicodeEncodeError:
        # Replace Unicode characters with ASCII equivalents
        safe_args = []
        for arg in args:
            if isinstance(arg, str):
                # Replace common Unicode characters
                safe_arg = arg.replace('🐻', '[BEAR]').replace('✅', '[OK]').replace('❌', '[ERROR]')
                safe_arg = safe_arg.replace('🌐', '[WEB]').replace('🚀', '[LAUNCH]').replace('💬', '[CHAT]')
                safe_arg = safe_arg.replace('⚠️', '[WARNING]').replace('🔧', '[TOOLS]').replace('👋', '[BYE]')
                safe_arg = safe_arg.replace('🖥️', '[GUI]').replace('🗑️', '[DELETE]')
                safe_args.append(safe_arg)
            else:
                safe_args.append(arg)
        print(*safe_args, **kwargs)

def show_banner():
    """Show startup banner"""
    safe_print("=" * 70)
    safe_print(f" [BEAR]  {APP_NAME} v{VERSION}")
    safe_print("    Privacy-First, Local-Only Legal AI Assistant")
    safe_print("    Production Release - No Build Dependencies")
    safe_print("=" * 70)
    safe_print()

def check_python_version():
    """Ensure Python version compatibility"""
    if sys.version_info < (3, 9):
        safe_print("[ERROR] Error: Python 3.9+ required")
        safe_print(f"   Current version: {sys.version}")
        safe_print("   Please install Python 3.9 or newer from https://python.org")
        return False
    
    safe_print(f"[OK] Python {sys.version.split()[0]} - Compatible")
    return True

def get_app_dir() -> Path:
    """Get application directory"""
    return Path(__file__).parent.parent.absolute()

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        "pydantic",
        "fastapi", 
        "uvicorn",
        "rich",
        "click",
        "customtkinter"
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing.append(package)
    
    if missing:
        safe_print(f"[ERROR] Missing dependencies: {', '.join(missing)}")
        safe_print("   Run: python -m pip install -r installer/requirements-clean.txt")
        return False
    
    safe_print("[OK] All core dependencies available")
    return True

def start_web_interface(port: int = 3000):
    """Start the web interface"""
    app_dir = get_app_dir()
    
    # Check if Node.js project exists
    package_json = app_dir / "package.json"
    if package_json.exists():
        safe_print(f"[WEB] Starting web interface on port {port}...")
        
        try:
            # Try npm start
            subprocess.Popen([
                "npm", "start"
            ], cwd=str(app_dir), creationflags=subprocess.CREATE_NEW_CONSOLE)
            
            safe_print(f"[OK] Web interface starting...")
            safe_print(f"   Opening: http://localhost:{port}")
            
            # Open browser after delay
            import threading
            import time
            
            def open_browser():
                time.sleep(3)
                webbrowser.open(f"http://localhost:{port}")
            
            threading.Thread(target=open_browser, daemon=True).start()
            return True
            
        except FileNotFoundError:
            safe_print("[ERROR] Node.js not found. Please install Node.js from https://nodejs.org")
            return False
        except Exception as e:
            safe_print(f"[ERROR] Failed to start web interface: {e}")
            return False
    else:
        safe_print("[ERROR] Web interface not found. Please check installation.")
        return False

def start_api_server(host: str = "127.0.0.1", port: int = 8000):
    """Start the API server"""
    safe_print(f"[LAUNCH] Starting API server on {host}:{port}...")
    
    try:
        import uvicorn
        from src.api.app import app
        
        uvicorn.run(
            "src.api.app:app",
            host=host,
            port=port,
            reload=False,
            access_log=False
        )
    except ImportError as e:
        safe_print(f"[ERROR] Failed to start API server: Missing dependency {e}")
        safe_print("   Run: python -m pip install -r installer/requirements-clean.txt")
        return False
    except Exception as e:
        safe_print(f"[ERROR] Failed to start API server: {e}")
        return False

def start_gui():
    """Start the desktop GUI"""
    safe_print("[GUI] Starting desktop GUI...")
    
    try:
        import customtkinter
        # Create basic GUI launcher
        create_simple_gui()
    except ImportError:
        safe_print("[ERROR] GUI dependencies not available")
        safe_print("   Run: python -m pip install customtkinter")
        return False

def create_simple_gui():
    """Create a simple GUI launcher"""
    import customtkinter as ctk
    import tkinter.messagebox as msgbox
    
    ctk.set_appearance_mode("system")
    ctk.set_default_color_theme("blue")
    
    class BearAILauncher:
        def __init__(self):
            self.root = ctk.CTk()
            self.root.title(f"{APP_NAME} v{VERSION}")
            self.root.geometry("600x400")
            self.root.resizable(True, True)
            
            # Center window
            self.root.update_idletasks()
            x = (self.root.winfo_screenwidth() // 2) - (600 // 2)
            y = (self.root.winfo_screenheight() // 2) - (400 // 2)
            self.root.geometry(f"600x400+{x}+{y}")
            
            self.create_widgets()
        
        def create_widgets(self):
            # Main frame
            main_frame = ctk.CTkFrame(self.root)
            main_frame.pack(fill="both", expand=True, padx=20, pady=20)
            
            # Title
            title = ctk.CTkLabel(
                main_frame, 
                text="[BEAR] BEAR AI Legal Assistant",
                font=ctk.CTkFont(size=28, weight="bold")
            )
            title.pack(pady=20)
            
            # Subtitle
            subtitle = ctk.CTkLabel(
                main_frame,
                text="Privacy-First, Local-Only Legal AI",
                font=ctk.CTkFont(size=16)
            )
            subtitle.pack(pady=(0, 30))
            
            # Buttons frame
            buttons_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
            buttons_frame.pack(fill="both", expand=True)
            
            # Web Interface button
            web_btn = ctk.CTkButton(
                buttons_frame,
                text="[WEB] Launch Web Interface",
                command=self.launch_web,
                height=50,
                font=ctk.CTkFont(size=16, weight="bold")
            )
            web_btn.pack(pady=10, padx=20, fill="x")
            
            # API Server button
            api_btn = ctk.CTkButton(
                buttons_frame,
                text="[LAUNCH] Start API Server",
                command=self.start_api,
                height=50,
                font=ctk.CTkFont(size=16, weight="bold")
            )
            api_btn.pack(pady=10, padx=20, fill="x")
            
            # Chat button
            chat_btn = ctk.CTkButton(
                buttons_frame,
                text="[CHAT] Terminal Chat",
                command=self.start_chat,
                height=50,
                font=ctk.CTkFont(size=16, weight="bold")
            )
            chat_btn.pack(pady=10, padx=20, fill="x")
            
            # Status label
            self.status_label = ctk.CTkLabel(
                buttons_frame,
                text="Ready to launch BEAR AI Legal Assistant",
                font=ctk.CTkFont(size=12)
            )
            self.status_label.pack(pady=20)
        
        def launch_web(self):
            self.status_label.configure(text="Starting web interface...")
            self.root.update()
            if start_web_interface():
                self.status_label.configure(text="Web interface started successfully!")
            else:
                self.status_label.configure(text="Failed to start web interface")
        
        def start_api(self):
            self.status_label.configure(text="Starting API server...")
            self.root.update()
            msgbox.showinfo("API Server", "API server will start in terminal window")
            start_api_server()
        
        def start_chat(self):
            self.status_label.configure(text="Starting terminal chat...")
            self.root.update()
            msgbox.showinfo("Terminal Chat", "Chat interface will open in terminal window")
            # Start chat in new terminal
            subprocess.Popen([
                sys.executable, "-m", "src.bear_ai", "chat"
            ], cwd=str(get_app_dir()), creationflags=subprocess.CREATE_NEW_CONSOLE)
        
        def run(self):
            self.root.mainloop()
    
    app = BearAILauncher()
    app.run()

def main():
    """Main launcher function"""
    show_banner()
    
    if not check_python_version():
        input("Press Enter to exit...")
        return 1
    
    if not check_dependencies():
        safe_print()
        safe_print("[TOOLS] Installing dependencies...")
        app_dir = get_app_dir()
        requirements_file = app_dir / "installer" / "requirements-clean.txt"
        
        install_cmd = [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)]
        result = subprocess.run(install_cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            safe_print("[ERROR] Failed to install dependencies")
            safe_print(f"Error: {result.stderr}")
            input("Press Enter to exit...")
            return 1
        
        safe_print("[OK] Dependencies installed successfully")
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "web":
            return 0 if start_web_interface() else 1
        elif command == "api":
            start_api_server()
            return 0
        elif command == "gui":
            start_gui()
            return 0
        elif command == "chat":
            # Start chat interface
            try:
                from src.bear_ai.chat import main as chat_main
                chat_main()
                return 0
            except ImportError:
                safe_print("[ERROR] Chat interface not available")
                return 1
        else:
            safe_print(f"[ERROR] Unknown command: {command}")
            safe_print("Available commands: web, api, gui, chat")
            return 1
    else:
        # Default: start GUI launcher
        start_gui()
        return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        safe_print()
        safe_print("[BYE] Goodbye!")
        sys.exit(0)
    except Exception as e:
        safe_print()
        safe_print(f"[ERROR] Unexpected error: {e}")
        safe_print("Please report this issue on GitHub")
        input("Press Enter to exit...")
        sys.exit(1)