#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BEAR AI Simple GUI - Clean Minimal Interface
Moved from root simple_gui.py into proper package structure
"""

import sys
import os
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import subprocess
from pathlib import Path
from typing import Optional

# Import from bear_ai package
try:
    from bear_ai.core.chat import start_chat_interface
    from bear_ai.privacy.scrub import PIIScrubber
    from bear_ai.models.manager import get_model_manager
    BEAR_AI_IMPORTS = True
except ImportError:
    BEAR_AI_IMPORTS = False
    print("⚠️  Some BEAR AI modules not available - running in limited mode")


class SimpleBearAIGUI:
    """Simple, clean GUI interface for BEAR AI"""
    
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("BEAR AI - Privacy-First Local AI")
        self.root.geometry("800x600")
        self.root.resizable(True, True)
        
        # Set minimum size
        self.root.minsize(600, 400)
        
        # Center window
        self.center_window()
        
        # Initialize components
        self.pii_scrubber = None
        self.model_manager = None
        
        if BEAR_AI_IMPORTS:
            try:
                self.pii_scrubber = PIIScrubber()
                self.model_manager = get_model_manager()
            except Exception as e:
                print(f"Warning: Could not initialize components: {e}")
        
        # Create interface
        self.create_widgets()
        
    def center_window(self):
        """Center window on screen"""
        self.root.update_idletasks()
        
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        pos_x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        pos_y = (self.root.winfo_screenheight() // 2) - (height // 2)
        
        self.root.geometry(f"{width}x{height}+{pos_x}+{pos_y}")
        
    def create_widgets(self):
        """Create the main interface"""
        
        # Main container with padding
        main_frame = tk.Frame(self.root, padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Header section
        self.create_header(main_frame)
        
        # Status section
        self.create_status_section(main_frame)
        
        # Main action buttons
        self.create_action_buttons(main_frame)
        
        # Information display area
        self.create_info_display(main_frame)
        
        # Footer
        self.create_footer(main_frame)
        
    def create_header(self, parent):
        """Create header with title and description"""
        
        header_frame = tk.Frame(parent)
        header_frame.pack(fill=tk.X, pady=(0, 20))
        
        # Title
        title_label = tk.Label(
            header_frame, 
            text="🐻 BEAR AI", 
            font=("Arial", 24, "bold"),
            fg="#2E86AB"
        )
        title_label.pack()
        
        # Subtitle
        subtitle_label = tk.Label(
            header_frame, 
            text="Privacy-First Local AI Assistant", 
            font=("Arial", 14),
            fg="#666666"
        )
        subtitle_label.pack(pady=5)
        
    def create_status_section(self, parent):
        """Create status display section"""
        
        status_frame = tk.LabelFrame(parent, text="Status", padx=10, pady=10)
        status_frame.pack(fill=tk.X, pady=(0, 20))
        
        self.status_var = tk.StringVar(value="Ready - No AI models loaded")
        status_label = tk.Label(
            status_frame, 
            textvariable=self.status_var, 
            font=("Arial", 12),
            fg="#28A745"
        )
        status_label.pack()
        
        # Check system status on startup
        self.update_status()
        
    def create_action_buttons(self, parent):
        """Create main action buttons"""
        
        buttons_frame = tk.LabelFrame(parent, text="Actions", padx=15, pady=15)
        buttons_frame.pack(fill=tk.X, pady=(0, 20))
        
        # Configure grid columns to be responsive
        buttons_frame.grid_columnconfigure(0, weight=1)
        buttons_frame.grid_columnconfigure(1, weight=1)
        buttons_frame.grid_columnconfigure(2, weight=1)
        
        # Chat Interface button
        chat_btn = tk.Button(
            buttons_frame, 
            text="💬 Start Chat",
            command=self.launch_chat,
            width=15, 
            height=2,
            font=("Arial", 11, "bold"),
            bg="#28A745", 
            fg="white",
            relief=tk.RAISED,
            bd=2
        )
        chat_btn.grid(row=0, column=0, padx=10, pady=5, sticky="ew")
        
        # PII Scrubber button  
        scrub_btn = tk.Button(
            buttons_frame, 
            text="🛡️ Scrub Text",
            command=self.launch_scrubber,
            width=15, 
            height=2,
            font=("Arial", 11, "bold"),
            bg="#FD7E14", 
            fg="white",
            relief=tk.RAISED,
            bd=2
        )
        scrub_btn.grid(row=0, column=1, padx=10, pady=5, sticky="ew")
        
        # Model Manager button
        models_btn = tk.Button(
            buttons_frame, 
            text="🤖 Manage Models",
            command=self.launch_model_manager,
            width=15, 
            height=2,
            font=("Arial", 11, "bold"),
            bg="#6F42C1", 
            fg="white",
            relief=tk.RAISED,
            bd=2
        )
        models_btn.grid(row=0, column=2, padx=10, pady=5, sticky="ew")
        
        # Second row of buttons
        settings_btn = tk.Button(
            buttons_frame,
            text="⚙️ Settings", 
            command=self.show_settings,
            width=15,
            height=2,
            font=("Arial", 11, "bold"),
            bg="#6C757D",
            fg="white",
            relief=tk.RAISED,
            bd=2
        )
        settings_btn.grid(row=1, column=0, padx=10, pady=5, sticky="ew")
        
        help_btn = tk.Button(
            buttons_frame,
            text="❓ Help",
            command=self.show_help,
            width=15,
            height=2, 
            font=("Arial", 11, "bold"),
            bg="#17A2B8",
            fg="white",
            relief=tk.RAISED,
            bd=2
        )
        help_btn.grid(row=1, column=1, padx=10, pady=5, sticky="ew")
        
        exit_btn = tk.Button(
            buttons_frame,
            text="🚪 Exit",
            command=self.safe_exit,
            width=15,
            height=2,
            font=("Arial", 11, "bold"), 
            bg="#DC3545",
            fg="white",
            relief=tk.RAISED,
            bd=2
        )
        exit_btn.grid(row=1, column=2, padx=10, pady=5, sticky="ew")
        
    def create_info_display(self, parent):
        """Create information display area"""
        
        info_frame = tk.LabelFrame(parent, text="Information", padx=10, pady=10)
        info_frame.pack(fill=tk.BOTH, expand=True)
        
        # Create scrolled text widget for logs and information
        self.info_text = scrolledtext.ScrolledText(
            info_frame,
            height=10,
            font=("Consolas", 10),
            bg="#F8F9FA",
            fg="#333333",
            relief=tk.SUNKEN,
            bd=1
        )
        self.info_text.pack(fill=tk.BOTH, expand=True)
        
        # Add welcome message
        welcome_msg = """Welcome to BEAR AI - Privacy-First Local AI Assistant

🔒 Your privacy is our priority - all processing happens locally
🚀 Get started by downloading a model or starting a chat session
📊 Monitor system resources and model performance
🛡️ Built-in PII scrubbing for maximum data protection

Click any button above to begin, or check the status for system information.
"""
        self.info_text.insert(tk.END, welcome_msg)
        self.info_text.config(state=tk.DISABLED)  # Make read-only
        
    def create_footer(self, parent):
        """Create footer with additional info"""
        
        footer_frame = tk.Frame(parent)
        footer_frame.pack(fill=tk.X, pady=(10, 0))
        
        # Version and status info
        version_label = tk.Label(
            footer_frame,
            text="BEAR AI v0.1.0-alpha | Privacy-First • Local-Only • Open Source",
            font=("Arial", 9),
            fg="#666666"
        )
        version_label.pack()
        
    def log_message(self, message: str, level: str = "INFO"):
        """Add message to info display"""
        
        self.info_text.config(state=tk.NORMAL)
        
        timestamp = tk.datetime.now().strftime("%H:%M:%S")
        formatted_msg = f"[{timestamp}] {level}: {message}\\n"
        
        self.info_text.insert(tk.END, formatted_msg)
        self.info_text.see(tk.END)  # Scroll to bottom
        self.info_text.config(state=tk.DISABLED)
        
        # Update status bar
        self.status_var.set(f"Last: {message}")
        
    def update_status(self):
        """Update system status"""
        
        try:
            if self.model_manager:
                models = self.model_manager.list_models()
                if models:
                    self.status_var.set(f"Ready - {len(models)} models available")
                else:
                    self.status_var.set("Ready - No models installed")
            else:
                self.status_var.set("Ready - Model manager not available")
                
        except Exception as e:
            self.status_var.set(f"Warning: {str(e)}")
            
    def launch_chat(self):
        """Launch chat interface"""
        
        self.log_message("Starting chat interface...")
        
        if BEAR_AI_IMPORTS:
            try:
                # Launch chat in separate process to avoid blocking GUI
                subprocess.Popen([
                    sys.executable, "-m", "bear_ai.core.chat"
                ])
                self.log_message("Chat interface launched successfully")
            except Exception as e:
                self.log_message(f"Error launching chat: {e}", "ERROR")
                messagebox.showerror("Error", f"Could not launch chat interface:\\n{e}")
        else:
            self.log_message("Chat interface not available - missing dependencies", "WARNING")
            messagebox.showwarning(
                "Feature Unavailable",
                "Chat interface requires full BEAR AI installation.\\nPlease run: pip install bear-ai[inference]"
            )
            
    def launch_scrubber(self):
        """Launch PII scrubber"""
        
        self.log_message("Starting PII scrubber...")
        
        if BEAR_AI_IMPORTS and self.pii_scrubber:
            try:
                # Launch scrubber in separate process
                subprocess.Popen([
                    sys.executable, "-m", "bear_ai.privacy.scrub", "--gui"
                ])
                self.log_message("PII scrubber launched successfully")
            except Exception as e:
                self.log_message(f"Error launching scrubber: {e}", "ERROR")
                messagebox.showerror("Error", f"Could not launch PII scrubber:\\n{e}")
        else:
            self.log_message("PII scrubber not available - missing dependencies", "WARNING")
            messagebox.showwarning(
                "Feature Unavailable", 
                "PII scrubber requires full BEAR AI installation.\\nPlease run: pip install bear-ai[privacy]"
            )
            
    def launch_model_manager(self):
        """Launch model manager"""
        
        self.log_message("Starting model manager...")
        
        try:
            subprocess.Popen([
                sys.executable, "-m", "bear_ai.models.manager", "--gui"
            ])
            self.log_message("Model manager launched successfully")
        except Exception as e:
            self.log_message(f"Error launching model manager: {e}", "ERROR")
            messagebox.showerror("Error", f"Could not launch model manager:\\n{e}")
            
    def show_settings(self):
        """Show settings dialog"""
        
        self.log_message("Opening settings...")
        messagebox.showinfo("Settings", "Settings interface coming soon!\\n\\nFor now, configuration can be done via:\\n- Configuration files\\n- Command line options")
        
    def show_help(self):
        """Show help information"""
        
        self.log_message("Showing help information...")
        
        help_text = """BEAR AI - Privacy-First Local AI Assistant

Quick Start:
1. Click 'Manage Models' to download AI models
2. Click 'Start Chat' to begin conversing with AI
3. Use 'Scrub Text' to remove sensitive information

Features:
• 100% local processing - no data leaves your device
• Built-in PII detection and scrubbing
• Support for multiple AI models
• Cross-platform compatibility

For more help, visit: https://docs.bear-ai.org"""
        
        messagebox.showinfo("BEAR AI Help", help_text)
        
    def safe_exit(self):
        """Safely exit the application"""
        
        self.log_message("Shutting down...")
        
        if messagebox.askokcancel("Exit", "Are you sure you want to exit BEAR AI?"):
            self.root.quit()
            self.root.destroy()
            
    def run(self):
        """Start the GUI event loop"""
        
        try:
            self.log_message("BEAR AI Simple GUI started")
            self.root.mainloop()
        except KeyboardInterrupt:
            self.log_message("Interrupted by user")
        except Exception as e:
            self.log_message(f"Unexpected error: {e}", "ERROR")
            messagebox.showerror("Error", f"An unexpected error occurred:\\n{e}")
        finally:
            self.log_message("GUI shutting down...")


def main():
    """Main entry point for simple GUI"""
    
    print("🐻 Starting BEAR AI Simple GUI...")
    
    try:
        app = SimpleBearAIGUI()
        app.run()
    except Exception as e:
        print(f"❌ Error starting GUI: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()