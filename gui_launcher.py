#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BEAR AI - GUI Interface Launcher
A visual launcher to select between different BEAR AI interfaces
"""

import os
import sys
import subprocess
import tkinter as tk
from tkinter import ttk, messagebox
from pathlib import Path

class BearAILauncher:
    def __init__(self, root):
        self.root = root
        self.root.title("BEAR AI - Interface Launcher")
        self.root.geometry("600x500")
        self.root.resizable(False, False)
        
        # Set window icon if available
        try:
            if os.path.exists("assets/bear_icon.ico"):
                self.root.iconbitmap("assets/bear_icon.ico")
        except:
            pass
            
        # Center the window
        self.center_window()
        
        # Check if we're in the right directory
        if not Path("src/bear_ai").exists():
            messagebox.showerror(
                "Directory Error",
                "This launcher must be run from the BEAR AI root directory.\n\n"
                f"Expected: src/bear_ai/\n"
                f"Current: {os.getcwd()}"
            )
            sys.exit(1)
            
        # Create the interface
        self.create_interface()
        
        # Check available interfaces
        self.check_interfaces()
    
    def center_window(self):
        """Center the window on the screen"""
        self.root.update_idletasks()
        x = (self.root.winfo_screenwidth() // 2) - (600 // 2)
        y = (self.root.winfo_screenheight() // 2) - (500 // 2)
        self.root.geometry(f"600x500+{x}+{y}")
    
    def create_interface(self):
        """Create the main interface"""
        # Header
        header_frame = ttk.Frame(self.root)
        header_frame.pack(fill="x", padx=20, pady=20)
        
        title_label = ttk.Label(
            header_frame, 
            text="🐻 BEAR AI", 
            font=("Arial", 24, "bold")
        )
        title_label.pack()
        
        subtitle_label = ttk.Label(
            header_frame, 
            text="Privacy-First Local AI Assistant", 
            font=("Arial", 12)
        )
        subtitle_label.pack()
        
        # Interface selection frame
        selection_frame = ttk.LabelFrame(self.root, text="Choose Interface", padding=20)
        selection_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        # Modern GUI option
        self.create_interface_option(
            selection_frame,
            "🎨 Modern GUI",
            "Enhanced dark theme with modern styling",
            "CustomTkinter-based interface with modern design",
            self.launch_modern,
            row=0
        )
        
        # Professional GUI option
        self.create_interface_option(
            selection_frame,
            "💼 Professional GUI", 
            "Advanced interface with extra features",
            "PyQt6-based interface for power users",
            self.launch_professional,
            row=1
        )
        
        # Simple GUI option
        self.create_interface_option(
            selection_frame,
            "📱 Simple GUI",
            "Basic interface for maximum compatibility", 
            "Standard Tkinter interface, lightweight",
            self.launch_simple,
            row=2
        )
        
        # Auto-detect option
        self.create_interface_option(
            selection_frame,
            "🔍 Auto-Detect",
            "Let BEAR AI choose the best interface",
            "Automatically selects the best available interface",
            self.launch_auto,
            row=3
        )
        
        # Status frame
        status_frame = ttk.Frame(self.root)
        status_frame.pack(fill="x", padx=20, pady=10)
        
        self.status_label = ttk.Label(
            status_frame, 
            text="Ready to launch BEAR AI...",
            font=("Arial", 10)
        )
        self.status_label.pack()
        
        # Footer
        footer_frame = ttk.Frame(self.root)
        footer_frame.pack(fill="x", padx=20, pady=10)
        
        footer_label = ttk.Label(
            footer_frame,
            text="🛡️ All data stays on your device - 100% private",
            font=("Arial", 9),
            foreground="gray"
        )
        footer_label.pack()
    
    def create_interface_option(self, parent, title, subtitle, description, command, row):
        """Create an interface option button with details"""
        option_frame = ttk.Frame(parent)
        option_frame.grid(row=row, column=0, sticky="ew", pady=5)
        parent.grid_columnconfigure(0, weight=1)
        
        # Button
        btn = ttk.Button(
            option_frame,
            text=title,
            command=command,
            width=20
        )
        btn.grid(row=0, column=0, padx=(0, 15), sticky="w")
        
        # Details
        details_frame = ttk.Frame(option_frame)
        details_frame.grid(row=0, column=1, sticky="ew")
        option_frame.grid_columnconfigure(1, weight=1)
        
        subtitle_label = ttk.Label(
            details_frame,
            text=subtitle,
            font=("Arial", 10, "bold")
        )
        subtitle_label.pack(anchor="w")
        
        desc_label = ttk.Label(
            details_frame,
            text=description,
            font=("Arial", 9),
            foreground="gray"
        )
        desc_label.pack(anchor="w")
        
        return btn
    
    def check_interfaces(self):
        """Check which interfaces are available"""
        try:
            # Check for virtual environment
            venv_paths = [".venv/Scripts/python.exe", ".venv312/Scripts/python.exe"]
            python_exe = None
            
            for path in venv_paths:
                if Path(path).exists():
                    python_exe = path
                    break
            
            if not python_exe:
                self.status_label.config(
                    text="⚠️ No virtual environment found - run INSTALL.bat first",
                    foreground="orange"
                )
                return
            
            # Check available GUI libraries
            status_parts = []
            
            # Check CustomTkinter
            try:
                subprocess.run([python_exe, "-c", "import customtkinter"], 
                             check=True, capture_output=True)
                status_parts.append("✅ Modern")
            except:
                status_parts.append("❌ Modern")
            
            # Check PyQt6
            try:
                subprocess.run([python_exe, "-c", "import PyQt6"], 
                             check=True, capture_output=True)
                status_parts.append("✅ Professional")
            except:
                status_parts.append("❌ Professional")
            
            # Tkinter should always be available
            status_parts.append("✅ Simple")
            
            self.status_label.config(
                text=f"Interface status: {' | '.join(status_parts)}",
                foreground="black"
            )
            
        except Exception as e:
            self.status_label.config(
                text=f"Error checking interfaces: {str(e)}",
                foreground="red"
            )
    
    def launch_interface(self, script_name, interface_name):
        """Launch a specific interface"""
        try:
            self.status_label.config(
                text=f"Launching {interface_name}...",
                foreground="blue"
            )
            self.root.update()
            
            if Path(script_name).exists():
                # Use the dedicated launch script
                subprocess.Popen([script_name], shell=True)
            else:
                # Fallback to direct execution
                venv_paths = [".venv/Scripts/python.exe", ".venv312/Scripts/python.exe"]
                python_exe = None
                
                for path in venv_paths:
                    if Path(path).exists():
                        python_exe = path
                        break
                
                if not python_exe:
                    raise Exception("No virtual environment found")
                
                gui_file = script_name.replace("launch_", "").replace(".bat", ".py")
                if Path(gui_file).exists():
                    subprocess.Popen([python_exe, gui_file])
                else:
                    raise Exception(f"Interface file not found: {gui_file}")
            
            # Close the launcher
            self.root.after(2000, self.root.destroy)
            
        except Exception as e:
            messagebox.showerror(
                "Launch Error",
                f"Failed to launch {interface_name}:\n{str(e)}\n\n"
                "Try running INSTALL.bat to fix dependencies."
            )
            self.status_label.config(
                text="❌ Launch failed - check installation",
                foreground="red"
            )
    
    def launch_modern(self):
        """Launch the modern GUI"""
        self.launch_interface("launch_modern.bat", "Modern GUI")
    
    def launch_professional(self):
        """Launch the professional GUI"""
        self.launch_interface("launch_professional.bat", "Professional GUI")
    
    def launch_simple(self):
        """Launch the simple GUI"""
        self.launch_interface("launch_simple.bat", "Simple GUI")
    
    def launch_auto(self):
        """Auto-detect and launch the best interface"""
        try:
            self.status_label.config(
                text="Auto-detecting best interface...",
                foreground="blue"
            )
            self.root.update()
            
            venv_paths = [".venv/Scripts/python.exe", ".venv312/Scripts/python.exe"]
            python_exe = None
            
            for path in venv_paths:
                if Path(path).exists():
                    python_exe = path
                    break
            
            if not python_exe:
                raise Exception("No virtual environment found")
            
            # Try Modern first
            try:
                subprocess.run([python_exe, "-c", "import customtkinter"], 
                             check=True, capture_output=True)
                if Path("modern_gui.py").exists():
                    self.launch_modern()
                    return
            except:
                pass
            
            # Try Professional
            try:
                subprocess.run([python_exe, "-c", "import PyQt6"], 
                             check=True, capture_output=True)
                if Path("professional_gui.py").exists():
                    self.launch_professional()
                    return
            except:
                pass
            
            # Fall back to Simple
            if Path("simple_gui.py").exists():
                self.launch_simple()
            else:
                raise Exception("No GUI interface found")
                
        except Exception as e:
            messagebox.showerror(
                "Auto-Detection Error",
                f"Failed to auto-detect interface:\n{str(e)}\n\n"
                "Try running INSTALL.bat to fix dependencies."
            )
            self.status_label.config(
                text="❌ Auto-detection failed",
                foreground="red"
            )

def main():
    """Main entry point"""
    root = tk.Tk()
    app = BearAILauncher(root)
    root.mainloop()

if __name__ == "__main__":
    main()