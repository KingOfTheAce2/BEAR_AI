#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple BEAR AI GUI Launcher
Works around import issues by providing a basic interface
"""

import sys
import os
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import subprocess
from pathlib import Path

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

class SimpleBearAIGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("BEAR AI - Privacy-First Local AI")
        self.root.geometry("800x600")
        
        # Create main interface
        self.create_widgets()
        
    def create_widgets(self):
        # Title
        title_label = tk.Label(self.root, text="🐻 BEAR AI", font=("Arial", 24, "bold"))
        title_label.pack(pady=10)
        
        subtitle_label = tk.Label(self.root, text="Privacy-First Local AI Assistant", font=("Arial", 14))
        subtitle_label.pack(pady=5)
        
        # Status
        self.status_var = tk.StringVar(value="Ready")
        status_label = tk.Label(self.root, textvariable=self.status_var, font=("Arial", 12))
        status_label.pack(pady=10)
        
        # Buttons frame
        buttons_frame = tk.Frame(self.root)
        buttons_frame.pack(pady=20)
        
        # Launch Chat button
        chat_btn = tk.Button(buttons_frame, text="Launch Chat Interface", 
                            command=self.launch_chat, width=20, height=2,
                            font=("Arial", 12), bg="#4CAF50", fg="white")
        chat_btn.pack(side=tk.LEFT, padx=10)
        
        # Launch Scrubber button  
        scrub_btn = tk.Button(buttons_frame, text="PII Scrubber Tool", 
                             command=self.launch_scrubber, width=20, height=2,
                             font=("Arial", 12), bg="#2196F3", fg="white")
        scrub_btn.pack(side=tk.LEFT, padx=10)
        
        # Info section
        info_frame = tk.LabelFrame(self.root, text="BEAR AI Information", font=("Arial", 12, "bold"))
        info_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        info_text = scrolledtext.ScrolledText(info_frame, wrap=tk.WORD, height=15)
        info_text.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        info_content = """
🐻 BEAR AI - Bridge for Expertise, Audit and Research
Privacy-First, Local-Only AI Assistant

✅ KEY FEATURES:
• Zero Network Calls - All processing happens locally
• No Telemetry - Your data never leaves your device  
• GDPR Compliant - Built for privacy regulations
• PII Detection & Scrubbing - Automatic sensitive data protection
• Multi-format Support - PDF, DOCX, TXT and more
• Hardware Adaptive - Optimizes for your system

🚀 QUICK START:
1. Click "Launch Chat Interface" to start chatting with AI
2. Click "PII Scrubber Tool" to clean sensitive documents  
3. All processing happens on your device - completely private!

📚 DOCUMENTATION:
• README.md - Quick start guide
• docs/SPEC.md - Technical specifications
• docs/TROUBLESHOOTING.md - Common solutions
• RELEASE_NOTES.md - Current version features

🛡️ PRIVACY GUARANTEE:
Your conversations and data are 100% private and secure.
Nothing is ever sent to external servers or tracked.

Status: BEAR AI is installed and ready to use!
"""
        info_text.insert(tk.END, info_content)
        info_text.config(state=tk.DISABLED)
        
    def launch_chat(self):
        """Launch the chat interface"""
        try:
            self.status_var.set("Launching Chat Interface...")
            self.root.update()
            
            # Try to import and run chat
            import bear_ai.chat
            
            # Launch in subprocess to avoid blocking GUI
            script_path = Path(__file__).parent / "scripts" / "run_chat.bat"
            if script_path.exists():
                subprocess.Popen([str(script_path)], shell=True)
                self.status_var.set("Chat Interface Launched!")
            else:
                # Fallback to direct Python call
                python_exe = Path(__file__).parent / ".venv" / "Scripts" / "python.exe"
                subprocess.Popen([str(python_exe), "-m", "bear_ai.chat"], 
                               cwd=Path(__file__).parent)
                self.status_var.set("Chat Interface Launched!")
                
        except Exception as e:
            messagebox.showerror("Error", f"Could not launch chat interface:\n{e}")
            self.status_var.set("Error launching chat")
    
    def launch_scrubber(self):
        """Launch the PII scrubber tool"""
        try:
            self.status_var.set("Launching PII Scrubber...")
            self.root.update()
            
            # Try to import and run scrubber
            import bear_ai.scrub
            
            # Launch in subprocess
            script_path = Path(__file__).parent / "scripts" / "run_scrub.bat"  
            if script_path.exists():
                subprocess.Popen([str(script_path)], shell=True)
                self.status_var.set("PII Scrubber Launched!")
            else:
                # Fallback to direct Python call
                python_exe = Path(__file__).parent / ".venv" / "Scripts" / "python.exe"
                subprocess.Popen([str(python_exe), "-m", "bear_ai.scrub"],
                               cwd=Path(__file__).parent)
                self.status_var.set("PII Scrubber Launched!")
                
        except Exception as e:
            messagebox.showerror("Error", f"Could not launch PII scrubber:\n{e}")
            self.status_var.set("Error launching scrubber")
    
    def run(self):
        """Start the GUI"""
        self.root.mainloop()

def main():
    """Main entry point"""
    try:
        app = SimpleBearAIGUI()
        app.run()
    except Exception as e:
        messagebox.showerror("BEAR AI Error", f"Could not start BEAR AI GUI:\n{e}")

if __name__ == "__main__":
    main()