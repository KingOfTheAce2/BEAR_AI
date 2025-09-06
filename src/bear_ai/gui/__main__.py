#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BEAR AI GUI Launcher - Module Execution Entry Point
Provides GUI selection and direct interface launching
"""

import sys
import argparse
import tkinter as tk
from tkinter import ttk, messagebox
from typing import Optional
import importlib.util


def show_gui_selector():
    """Show GUI interface selector dialog"""
    
    class GUISelector:
        def __init__(self):
            self.root = tk.Tk()
            self.root.title("BEAR AI - Select Interface")
            self.root.geometry("500x400")
            self.root.resizable(False, False)
            
            # Center window
            self.root.update_idletasks()
            x = (self.root.winfo_screenwidth() // 2) - (500 // 2)
            y = (self.root.winfo_screenheight() // 2) - (400 // 2)
            self.root.geometry(f"500x400+{x}+{y}")
            
            self.selected_interface = None
            self.create_widgets()
            
        def create_widgets(self):
            # Header
            header_frame = tk.Frame(self.root)
            header_frame.pack(pady=20)
            
            title_label = tk.Label(
                header_frame, 
                text="🐻 BEAR AI",
                font=("Arial", 20, "bold"),
                fg="#2E86AB"
            )
            title_label.pack()
            
            subtitle_label = tk.Label(
                header_frame,
                text="Choose Your Interface",
                font=("Arial", 12),
                fg="#666666"
            )
            subtitle_label.pack(pady=(5, 0))
            
            # Interface options
            options_frame = tk.Frame(self.root)
            options_frame.pack(pady=20, padx=40, fill="both", expand=True)
            
            interfaces = [
                {
                    "name": "Simple GUI",
                    "description": "Clean, minimal interface\\nBest for basic usage",
                    "module": "simple",
                    "recommended": False
                },
                {
                    "name": "Modern GUI", 
                    "description": "Feature-rich with dark theme\\nModel browser and downloads",
                    "module": "modern",
                    "recommended": True
                },
                {
                    "name": "Professional GUI",
                    "description": "Advanced interface\\nWorkflow management and plugins", 
                    "module": "professional",
                    "recommended": False
                }
            ]
            
            for i, interface in enumerate(interfaces):
                self.create_interface_option(options_frame, interface, i)
            
            # Buttons
            button_frame = tk.Frame(self.root)
            button_frame.pack(pady=20)
            
            launch_btn = tk.Button(
                button_frame,
                text="Launch Selected",
                command=self.launch_selected,
                bg="#28A745",
                fg="white",
                font=("Arial", 11, "bold"),
                padx=20,
                pady=8
            )
            launch_btn.pack(side=tk.LEFT, padx=10)
            
            cancel_btn = tk.Button(
                button_frame,
                text="Cancel",
                command=self.root.quit,
                bg="#6C757D",
                fg="white", 
                font=("Arial", 11),
                padx=20,
                pady=8
            )
            cancel_btn.pack(side=tk.LEFT, padx=10)
            
        def create_interface_option(self, parent, interface, index):
            frame = tk.LabelFrame(
                parent,
                text=interface["name"],
                font=("Arial", 10, "bold"),
                padx=10,
                pady=8
            )
            frame.pack(fill="x", pady=5)
            
            # Add recommended badge
            if interface.get("recommended"):
                badge = tk.Label(
                    frame,
                    text="⭐ RECOMMENDED",
                    font=("Arial", 8, "bold"),
                    fg="#FF6B35",
                    anchor="e"
                )
                badge.pack(anchor="ne")
            
            desc_label = tk.Label(
                frame,
                text=interface["description"],
                font=("Arial", 9),
                fg="#666666",
                justify="left"
            )
            desc_label.pack(anchor="w", pady=(0, 5))
            
            select_btn = tk.Button(
                frame,
                text=f"Select {interface['name']}",
                command=lambda m=interface['module']: self.select_interface(m),
                bg="#007BFF",
                fg="white",
                font=("Arial", 9),
                padx=15,
                pady=4
            )
            select_btn.pack(anchor="w")
            
        def select_interface(self, module):
            self.selected_interface = module
            self.launch_selected()
            
        def launch_selected(self):
            if not self.selected_interface:
                messagebox.showwarning(
                    "No Selection",
                    "Please select an interface to launch."
                )
                return
                
            self.root.quit()
            launch_interface(self.selected_interface)
            
    selector = GUISelector()
    selector.root.mainloop()


def launch_interface(interface_name: str):
    """Launch specific GUI interface"""
    
    interface_modules = {
        'simple': 'bear_ai.gui.simple',
        'modern': 'bear_ai.gui.modern', 
        'professional': 'bear_ai.gui.professional',
        'desktop': 'bear_ai.gui.desktop_app'  # Alias for main GUI
    }
    
    module_name = interface_modules.get(interface_name.lower())
    
    if not module_name:
        print(f"❌ Unknown interface: {interface_name}")
        print(f"Available interfaces: {', '.join(interface_modules.keys())}")
        sys.exit(1)
        
    try:
        print(f"🚀 Launching {interface_name.title()} GUI...")
        
        # Import and run the interface
        module = importlib.import_module(module_name)
        
        if hasattr(module, 'main'):
            module.main()
        else:
            print(f"❌ Interface module {module_name} has no main() function")
            sys.exit(1)
            
    except ImportError as e:
        print(f"❌ Could not import {module_name}: {e}")
        print("Make sure all GUI dependencies are installed:")
        print("  pip install bear-ai[gui]")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error launching {interface_name} interface: {e}")
        sys.exit(1)


def main(argv: Optional[list] = None):
    """Main entry point for GUI launcher"""
    
    parser = argparse.ArgumentParser(
        prog="bear-ai-gui",
        description="BEAR AI GUI Launcher - Launch graphical interfaces"
    )
    
    parser.add_argument(
        "interface",
        nargs="?",
        choices=["simple", "modern", "professional", "desktop", "selector"],
        default="selector",
        help="Interface to launch (default: selector)"
    )
    
    parser.add_argument(
        "--list",
        action="store_true", 
        help="List available GUI interfaces"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version=f"bear-ai-gui {get_version()}"
    )
    
    args = parser.parse_args(argv)
    
    if args.list:
        print("Available BEAR AI GUI interfaces:")
        print("  simple       - Clean, minimal interface")
        print("  modern       - Feature-rich with dark theme (recommended)")
        print("  professional - Advanced interface with workflows")  
        print("  desktop      - Alias for modern interface")
        print("  selector     - Show interface selection dialog (default)")
        return
        
    if args.interface == "selector":
        show_gui_selector()
    else:
        launch_interface(args.interface)


def get_version():
    """Get BEAR AI version"""
    try:
        from bear_ai import __version__
        return __version__
    except ImportError:
        return "0.1.0-alpha"


if __name__ == "__main__":
    main()