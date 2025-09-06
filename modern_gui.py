#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BEAR AI - Ultra Modern GUI with Model Management
Sleek dark theme with HuggingFace model browser and download functionality
"""

import sys
import os
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, filedialog
import threading
import time
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

try:
    from bear_ai.model_manager import get_model_manager, ModelInfo, HardwareDetector
    MODEL_MANAGER_AVAILABLE = True
except ImportError:
    MODEL_MANAGER_AVAILABLE = False

try:
    import customtkinter as ctk
    CTK_AVAILABLE = True
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("blue")
except ImportError:
    CTK_AVAILABLE = False

class PIIScrubber:
    """Advanced PII detection and scrubbing for maximum privacy"""
    
    def __init__(self):
        self.patterns = {
            'ssn': re.compile(r'\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b'),
            'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'phone': re.compile(r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b'),
            'credit_card': re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
            'ip_address': re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'),
            'address': re.compile(r'\b\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b', re.IGNORECASE),
        }
        
        self.replacements = {
            'ssn': '[SSN-REDACTED]',
            'email': '[EMAIL-REDACTED]',
            'phone': '[PHONE-REDACTED]',
            'credit_card': '[CARD-REDACTED]',
            'ip_address': '[IP-REDACTED]',
            'address': '[ADDRESS-REDACTED]',
        }
    
    def detect_pii(self, text: str) -> Dict[str, List[str]]:
        """Detect all PII in text and return matches"""
        detected = {}
        for pii_type, pattern in self.patterns.items():
            matches = pattern.findall(text)
            if matches:
                detected[pii_type] = matches
        return detected
    
    def scrub_text(self, text: str) -> tuple[str, bool, List[str]]:
        """Scrub PII from text. Returns (cleaned_text, has_pii, detected_types)"""
        detected_types = []
        cleaned_text = text
        
        for pii_type, pattern in self.patterns.items():
            if pattern.search(cleaned_text):
                detected_types.append(pii_type)
                cleaned_text = pattern.sub(self.replacements[pii_type], cleaned_text)
        
        return cleaned_text, len(detected_types) > 0, detected_types

class ModernBEARAI:
    """Ultra Modern BEAR AI Interface with Advanced Model Management"""
    
    def __init__(self):
        self.pii_scrubber = PIIScrubber()
        self.pii_protection_enabled = True
        self.selected_model = None
        self.download_progress = {}
        
        # Initialize hardware detector
        if MODEL_MANAGER_AVAILABLE:
            self.model_manager = get_model_manager()
            self.hardware = HardwareDetector()
        else:
            self.model_manager = None
            self.hardware = None
        
        self.setup_gui()
        self.load_models()
    
    def setup_gui(self):
        """Setup the ultra-modern GUI"""
        if CTK_AVAILABLE:
            self.setup_ctk_gui()
        else:
            self.setup_tkinter_gui()
    
    def setup_ctk_gui(self):
        """Setup CustomTkinter modern GUI"""
        # Main window
        self.root = ctk.CTk()
        self.root.title("BEAR AI - Privacy-First Local AI Assistant")
        self.root.geometry("1200x800")
        self.root.minsize(1000, 600)
        
        # Configure grid
        self.root.grid_columnconfigure(0, weight=1)
        self.root.grid_rowconfigure(0, weight=1)
        
        # Main container with modern styling
        self.main_frame = ctk.CTkFrame(self.root, corner_radius=15, fg_color=("gray95", "gray10"))
        self.main_frame.grid(row=0, column=0, sticky="nsew", padx=20, pady=20)
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(1, weight=1)
        
        # Header with gradient-like effect
        self.setup_header()
        
        # Tabbed interface
        self.setup_tabs()
        
        # Status bar
        self.setup_status_bar()
    
    def setup_header(self):
        """Setup modern header with branding"""
        header_frame = ctk.CTkFrame(self.main_frame, height=80, corner_radius=12, 
                                   fg_color=("gray90", "gray15"))
        header_frame.grid(row=0, column=0, sticky="ew", padx=15, pady=(15, 10))
        header_frame.grid_propagate(False)
        header_frame.grid_columnconfigure(1, weight=1)
        
        # Logo/Icon placeholder
        logo_label = ctk.CTkLabel(header_frame, text="🐻", font=("Arial", 32))
        logo_label.grid(row=0, column=0, padx=20, pady=20)
        
        # Title and subtitle
        title_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        title_frame.grid(row=0, column=1, sticky="w", padx=10)
        
        title_label = ctk.CTkLabel(title_frame, text="BEAR AI", 
                                  font=ctk.CTkFont(size=28, weight="bold"),
                                  text_color=("gray10", "white"))
        title_label.grid(row=0, column=0, sticky="w")
        
        subtitle_label = ctk.CTkLabel(title_frame, text="Privacy-First Local AI Assistant", 
                                     font=ctk.CTkFont(size=14),
                                     text_color=("gray40", "gray70"))
        subtitle_label.grid(row=1, column=0, sticky="w")
        
        # Privacy indicator
        privacy_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        privacy_frame.grid(row=0, column=2, padx=20)
        
        self.privacy_indicator = ctk.CTkLabel(privacy_frame, text="🛡️ PII Protection: ON", 
                                            font=ctk.CTkFont(size=12, weight="bold"),
                                            text_color=("green", "lightgreen"))
        self.privacy_indicator.grid(row=0, column=0)
        
        self.privacy_toggle = ctk.CTkSwitch(privacy_frame, text="Privacy Shield",
                                          command=self.toggle_privacy_protection,
                                          font=ctk.CTkFont(size=11))
        self.privacy_toggle.grid(row=1, column=0, pady=5)
        self.privacy_toggle.select()
    
    def setup_tabs(self):
        """Setup modern tabbed interface"""
        self.tabview = ctk.CTkTabview(self.main_frame, corner_radius=12,
                                     segmented_button_fg_color=("gray80", "gray20"),
                                     segmented_button_selected_color=("blue", "blue"))
        self.tabview.grid(row=1, column=0, sticky="nsew", padx=15, pady=5)
        
        # Create tabs
        self.chat_tab = self.tabview.add("💬 Chat")
        self.models_tab = self.tabview.add("🤖 Models") 
        self.hardware_tab = self.tabview.add("💻 Hardware")
        self.privacy_tab = self.tabview.add("🛡️ Privacy")
        
        self.setup_chat_tab()
        self.setup_models_tab()
        self.setup_hardware_tab()
        self.setup_privacy_tab()
    
    def setup_chat_tab(self):
        """Setup the chat interface"""
        self.chat_tab.grid_columnconfigure(0, weight=1)
        self.chat_tab.grid_rowconfigure(0, weight=1)
        
        # Chat display area
        self.chat_display = ctk.CTkTextbox(self.chat_tab, 
                                          corner_radius=10,
                                          font=ctk.CTkFont(size=12),
                                          wrap="word")
        self.chat_display.grid(row=0, column=0, columnspan=2, sticky="nsew", padx=10, pady=(10, 5))
        
        # Input area
        input_frame = ctk.CTkFrame(self.chat_tab, fg_color="transparent")
        input_frame.grid(row=1, column=0, columnspan=2, sticky="ew", padx=10, pady=5)
        input_frame.grid_columnconfigure(0, weight=1)
        
        self.input_text = ctk.CTkTextbox(input_frame, height=80, corner_radius=8,
                                        font=ctk.CTkFont(size=12))
        self.input_text.grid(row=0, column=0, sticky="ew", padx=(0, 10))
        self.input_text.bind("<Return>", self.send_message)
        
        # Send button with modern styling
        self.send_button = ctk.CTkButton(input_frame, text="Send", width=100, height=80,
                                        corner_radius=8, font=ctk.CTkFont(size=14, weight="bold"),
                                        command=self.send_message)
        self.send_button.grid(row=0, column=1)
        
        # Model selection info
        model_info_frame = ctk.CTkFrame(self.chat_tab, height=40, corner_radius=8)
        model_info_frame.grid(row=2, column=0, columnspan=2, sticky="ew", padx=10, pady=5)
        model_info_frame.grid_propagate(False)
        
        self.model_status_label = ctk.CTkLabel(model_info_frame, 
                                              text="No model selected - Go to Models tab to select and download",
                                              font=ctk.CTkFont(size=11),
                                              text_color=("orange", "orange"))
        self.model_status_label.pack(pady=10)
    
    def setup_models_tab(self):
        """Setup the advanced model management interface"""
        self.models_tab.grid_columnconfigure(0, weight=1)
        self.models_tab.grid_rowconfigure(1, weight=1)
        
        # Model controls header
        controls_frame = ctk.CTkFrame(self.models_tab, height=60, corner_radius=10)
        controls_frame.grid(row=0, column=0, sticky="ew", padx=10, pady=10)
        controls_frame.grid_propagate(False)
        controls_frame.grid_columnconfigure(2, weight=1)
        
        ctk.CTkLabel(controls_frame, text="AI Model Management", 
                    font=ctk.CTkFont(size=18, weight="bold")).grid(row=0, column=0, padx=20, pady=15)
        
        self.refresh_models_btn = ctk.CTkButton(controls_frame, text="🔄 Refresh", width=100,
                                              command=self.load_models)
        self.refresh_models_btn.grid(row=0, column=1, padx=10, pady=15)
        
        # Hardware compatibility filter
        self.compat_var = ctk.StringVar(value="all")
        compat_menu = ctk.CTkOptionMenu(controls_frame, values=["all", "compatible", "installed"],
                                       variable=self.compat_var, width=120,
                                       command=self.filter_models)
        compat_menu.grid(row=0, column=3, padx=10, pady=15)
        
        # Model list with modern scrollable frame
        self.models_frame = ctk.CTkScrollableFrame(self.models_tab, corner_radius=10,
                                                  label_text="Available AI Models")
        self.models_frame.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 10))
        self.models_frame.grid_columnconfigure(0, weight=1)
    
    def setup_hardware_tab(self):
        """Setup hardware information display"""
        self.hardware_tab.grid_columnconfigure(0, weight=1)
        self.hardware_tab.grid_rowconfigure(0, weight=1)
        
        # Hardware info display
        hw_frame = ctk.CTkScrollableFrame(self.hardware_tab, corner_radius=10,
                                         label_text="System Hardware Information")
        hw_frame.grid(row=0, column=0, sticky="nsew", padx=10, pady=10)
        
        self.hardware_display = ctk.CTkTextbox(hw_frame, height=400, corner_radius=8,
                                             font=ctk.CTkFont(family="Consolas", size=11))
        self.hardware_display.grid(row=0, column=0, sticky="nsew", padx=10, pady=10)
        
        self.load_hardware_info()
    
    def setup_privacy_tab(self):
        """Setup privacy controls and information"""
        self.privacy_tab.grid_columnconfigure(0, weight=1)
        self.privacy_tab.grid_rowconfigure(1, weight=1)
        
        # Privacy controls
        controls_frame = ctk.CTkFrame(self.privacy_tab, height=100, corner_radius=10)
        controls_frame.grid(row=0, column=0, sticky="ew", padx=10, pady=10)
        controls_frame.grid_propagate(False)
        
        ctk.CTkLabel(controls_frame, text="Privacy Protection Settings", 
                    font=ctk.CTkFont(size=18, weight="bold")).grid(row=0, column=0, padx=20, pady=10)
        
        # PII test area
        test_frame = ctk.CTkFrame(self.privacy_tab, corner_radius=10)
        test_frame.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 10))
        test_frame.grid_columnconfigure(0, weight=1)
        test_frame.grid_rowconfigure(1, weight=1)
        
        ctk.CTkLabel(test_frame, text="Test PII Detection", 
                    font=ctk.CTkFont(size=16, weight="bold")).grid(row=0, column=0, pady=10)
        
        self.pii_test_input = ctk.CTkTextbox(test_frame, height=100, corner_radius=8)
        self.pii_test_input.grid(row=1, column=0, sticky="ew", padx=10, pady=5)
        self.pii_test_input.insert("1.0", "Test PII detection: john@example.com, 555-123-4567, 123-45-6789")
        
        test_btn = ctk.CTkButton(test_frame, text="Test PII Detection", command=self.test_pii_detection)
        test_btn.grid(row=2, column=0, pady=10)
        
        self.pii_test_output = ctk.CTkTextbox(test_frame, height=200, corner_radius=8)
        self.pii_test_output.grid(row=3, column=0, sticky="ew", padx=10, pady=5)
    
    def setup_status_bar(self):
        """Setup modern status bar"""
        self.status_frame = ctk.CTkFrame(self.main_frame, height=30, corner_radius=8,
                                        fg_color=("gray85", "gray20"))
        self.status_frame.grid(row=2, column=0, sticky="ew", padx=15, pady=(5, 15))
        self.status_frame.grid_propagate(False)
        
        self.status_label = ctk.CTkLabel(self.status_frame, text="Ready - Privacy Protection Enabled",
                                        font=ctk.CTkFont(size=10))
        self.status_label.pack(side="left", padx=10, pady=5)
        
        # Connection status
        self.connection_label = ctk.CTkLabel(self.status_frame, text="Local Mode - 100% Private",
                                           font=ctk.CTkFont(size=10),
                                           text_color=("green", "lightgreen"))
        self.connection_label.pack(side="right", padx=10, pady=5)
    
    def setup_tkinter_gui(self):
        """Fallback to enhanced tkinter if CustomTkinter not available"""
        self.root = tk.Tk()
        self.root.title("BEAR AI - Privacy-First Local AI Assistant")
        self.root.geometry("1000x700")
        self.root.configure(bg="#1e1e1e")
        
        # Configure ttk styling for dark theme
        style = ttk.Style()
        style.theme_use('clam')
        
        # Dark theme colors
        style.configure('TNotebook', background='#2d2d2d', borderwidth=0)
        style.configure('TNotebook.Tab', background='#3d3d3d', foreground='white', 
                       padding=[10, 5], borderwidth=0)
        style.map('TNotebook.Tab', background=[('selected', '#4d4d4d')])
        
        # Main notebook for tabs
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Create tab frames
        self.chat_frame = tk.Frame(self.notebook, bg="#1e1e1e")
        self.models_frame = tk.Frame(self.notebook, bg="#1e1e1e") 
        self.hardware_frame = tk.Frame(self.notebook, bg="#1e1e1e")
        self.privacy_frame = tk.Frame(self.notebook, bg="#1e1e1e")
        
        self.notebook.add(self.chat_frame, text="💬 Chat")
        self.notebook.add(self.models_frame, text="🤖 Models")
        self.notebook.add(self.hardware_frame, text="💻 Hardware")
        self.notebook.add(self.privacy_frame, text="🛡️ Privacy")
        
        self.setup_tkinter_tabs()
    
    def setup_tkinter_tabs(self):
        """Setup tabs for tkinter fallback"""
        # Chat tab
        self.chat_display = scrolledtext.ScrolledText(self.chat_frame, bg="#2d2d2d", fg="white", 
                                                     font=("Consolas", 10), wrap="word")
        self.chat_display.pack(fill="both", expand=True, padx=10, pady=10)
        
        input_frame = tk.Frame(self.chat_frame, bg="#1e1e1e")
        input_frame.pack(fill="x", padx=10, pady=(0, 10))
        
        self.input_text = tk.Text(input_frame, height=3, bg="#2d2d2d", fg="white", 
                                 font=("Consolas", 10), wrap="word")
        self.input_text.pack(side="left", fill="both", expand=True, padx=(0, 10))
        
        self.send_button = tk.Button(input_frame, text="Send", command=self.send_message,
                                    bg="#4d4d4d", fg="white", font=("Arial", 10, "bold"))
        self.send_button.pack(side="right")
        
        # Models tab - simplified for tkinter
        models_label = tk.Label(self.models_frame, text="Model Management Available in CustomTkinter Mode",
                               bg="#1e1e1e", fg="white", font=("Arial", 14))
        models_label.pack(pady=50)
        
        # Hardware tab
        self.hardware_display = scrolledtext.ScrolledText(self.hardware_frame, bg="#2d2d2d", fg="white",
                                                         font=("Consolas", 9), wrap="word")
        self.hardware_display.pack(fill="both", expand=True, padx=10, pady=10)
        self.load_hardware_info()
        
        # Privacy tab
        privacy_label = tk.Label(self.privacy_frame, text="Privacy Protection is Always Active",
                                bg="#1e1e1e", fg="white", font=("Arial", 14))
        privacy_label.pack(pady=50)
    
    def load_models(self):
        """Load and display available models"""
        if not MODEL_MANAGER_AVAILABLE or not CTK_AVAILABLE:
            return
        
        # Clear existing model widgets
        for widget in self.models_frame.winfo_children():
            widget.destroy()
        
        compatible_models = self.model_manager.get_compatible_models()
        installed_models = self.model_manager.get_installed_models()
        
        for i, model in enumerate(compatible_models):
            self.create_model_card(model, i, model.filename in installed_models)
    
    def create_model_card(self, model: 'ModelInfo', index: int, is_installed: bool):
        """Create a beautiful model card widget"""
        # Model card frame with modern styling
        card_frame = ctk.CTkFrame(self.models_frame, corner_radius=12, 
                                 fg_color=("gray90", "gray15"), height=150)
        card_frame.grid(row=index, column=0, sticky="ew", padx=10, pady=8)
        card_frame.grid_propagate(False)
        card_frame.grid_columnconfigure(1, weight=1)
        
        # Model icon/status
        status_color = ("green", "lightgreen") if is_installed else ("blue", "lightblue")
        status_text = "✅ Installed" if is_installed else "⬇️ Available"
        
        status_frame = ctk.CTkFrame(card_frame, width=100, corner_radius=8, 
                                   fg_color=status_color)
        status_frame.grid(row=0, column=0, rowspan=3, sticky="ns", padx=15, pady=15)
        status_frame.grid_propagate(False)
        
        ctk.CTkLabel(status_frame, text="🤖", font=("Arial", 24)).pack(pady=(10, 5))
        ctk.CTkLabel(status_frame, text=status_text, font=ctk.CTkFont(size=10, weight="bold"),
                    text_color="white").pack()
        
        # Model info
        info_frame = ctk.CTkFrame(card_frame, fg_color="transparent")
        info_frame.grid(row=0, column=1, sticky="ew", padx=10, pady=10)
        info_frame.grid_columnconfigure(0, weight=1)
        
        # Model name and size
        name_label = ctk.CTkLabel(info_frame, text=model.name, 
                                 font=ctk.CTkFont(size=14, weight="bold"),
                                 anchor="w")
        name_label.grid(row=0, column=0, sticky="ew")
        
        size_label = ctk.CTkLabel(info_frame, text=f"{model.size} • {model.file_size_gb:.1f} GB",
                                 font=ctk.CTkFont(size=11),
                                 text_color=("gray40", "gray70"), anchor="w")
        size_label.grid(row=1, column=0, sticky="ew")
        
        desc_label = ctk.CTkLabel(info_frame, text=model.description,
                                 font=ctk.CTkFont(size=10), wraplength=400,
                                 text_color=("gray30", "gray80"), anchor="w")
        desc_label.grid(row=2, column=0, sticky="ew", pady=(5, 0))
        
        # Requirements and ratings
        specs_frame = ctk.CTkFrame(info_frame, fg_color="transparent")
        specs_frame.grid(row=3, column=0, sticky="ew", pady=(10, 0))
        specs_frame.grid_columnconfigure(3, weight=1)
        
        ctk.CTkLabel(specs_frame, text=f"RAM: {model.ram_required_gb}GB",
                    font=ctk.CTkFont(size=9), 
                    text_color=("gray40", "gray70")).grid(row=0, column=0, padx=(0, 15))
        
        ctk.CTkLabel(specs_frame, text=f"VRAM: {model.vram_recommended_gb}GB",
                    font=ctk.CTkFont(size=9),
                    text_color=("gray40", "gray70")).grid(row=0, column=1, padx=(0, 15))
        
        # Rating stars
        speed_stars = "⭐" * model.speed_rating + "☆" * (5 - model.speed_rating)
        quality_stars = "⭐" * model.quality_rating + "☆" * (5 - model.quality_rating)
        
        ctk.CTkLabel(specs_frame, text=f"Speed: {speed_stars}",
                    font=ctk.CTkFont(size=9)).grid(row=0, column=2, padx=(0, 15))
        
        # Action buttons
        button_frame = ctk.CTkFrame(card_frame, fg_color="transparent")
        button_frame.grid(row=0, column=2, rowspan=3, padx=15, pady=15)
        
        if is_installed:
            select_btn = ctk.CTkButton(button_frame, text="Select Model", width=120, height=35,
                                      command=lambda m=model: self.select_model(m))
            select_btn.pack(pady=5)
            
            delete_btn = ctk.CTkButton(button_frame, text="Delete", width=120, height=30,
                                      fg_color=("red", "darkred"),
                                      command=lambda m=model: self.delete_model(m))
            delete_btn.pack(pady=2)
        else:
            download_btn = ctk.CTkButton(button_frame, text="Download", width=120, height=35,
                                        command=lambda m=model: self.download_model(m))
            download_btn.pack(pady=5)
            
            # Compatibility indicator
            compat_color = ("green", "lightgreen") if self.is_model_compatible(model) else ("orange", "orange")
            compat_text = "Compatible" if self.is_model_compatible(model) else "May be slow"
            
            compat_label = ctk.CTkLabel(button_frame, text=compat_text, 
                                       font=ctk.CTkFont(size=9),
                                       text_color=compat_color)
            compat_label.pack(pady=2)
    
    def is_model_compatible(self, model: 'ModelInfo') -> bool:
        """Check if model is compatible with current hardware"""
        if not self.hardware:
            return True
        
        # Check RAM requirements
        if model.ram_required_gb > self.hardware.ram_gb:
            return False
        
        # Check GPU requirements
        if model.vram_recommended_gb > 0:
            if not self.hardware.gpu_info["has_nvidia"]:
                return "cpu" in model.compatibility
            return model.vram_recommended_gb <= self.hardware.gpu_info["vram_gb"]
        
        return True
    
    def download_model(self, model: 'ModelInfo'):
        """Download a model with progress tracking"""
        if not MODEL_MANAGER_AVAILABLE:
            messagebox.showerror("Error", "Model manager not available")
            return
        
        def download_thread():
            try:
                def progress_callback(progress):
                    self.root.after(0, lambda: self.update_download_progress(model, progress))
                
                self.model_manager.download_model(model, progress_callback)
                self.root.after(0, lambda: self.download_complete(model))
                
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Download Error", str(e)))
        
        # Start download in background thread
        self.download_progress[model.filename] = 0
        threading.Thread(target=download_thread, daemon=True).start()
        
        messagebox.showinfo("Download Started", f"Downloading {model.name}...")
    
    def update_download_progress(self, model: 'ModelInfo', progress: float):
        """Update download progress"""
        self.download_progress[model.filename] = progress
        # Could add progress bar to model card here
        
    def download_complete(self, model: 'ModelInfo'):
        """Handle download completion"""
        del self.download_progress[model.filename]
        messagebox.showinfo("Download Complete", f"{model.name} downloaded successfully!")
        self.load_models()  # Refresh model list
    
    def select_model(self, model: 'ModelInfo'):
        """Select a model for use"""
        self.selected_model = model
        if hasattr(self, 'model_status_label'):
            self.model_status_label.configure(text=f"Selected: {model.name}",
                                            text_color=("green", "lightgreen"))
        messagebox.showinfo("Model Selected", f"Selected {model.name} for conversations")
    
    def delete_model(self, model: 'ModelInfo'):
        """Delete an installed model"""
        if messagebox.askyesno("Confirm Delete", f"Delete {model.name}?\n\nThis will free up {model.file_size_gb:.1f} GB of space."):
            try:
                if MODEL_MANAGER_AVAILABLE:
                    self.model_manager.delete_model(model)
                    messagebox.showinfo("Model Deleted", f"{model.name} has been deleted")
                    self.load_models()  # Refresh model list
                    
                    # Clear selection if deleted model was selected
                    if self.selected_model and self.selected_model.filename == model.filename:
                        self.selected_model = None
                        if hasattr(self, 'model_status_label'):
                            self.model_status_label.configure(text="No model selected",
                                                            text_color=("orange", "orange"))
            except Exception as e:
                messagebox.showerror("Delete Error", str(e))
    
    def filter_models(self, filter_type: str):
        """Filter models by type"""
        self.load_models()  # Simple reload for now, could be optimized
    
    def load_hardware_info(self):
        """Load and display hardware information"""
        if MODEL_MANAGER_AVAILABLE:
            hw_info = self.model_manager.get_hardware_info()
            info_text = self.format_hardware_info(hw_info)
        else:
            info_text = "Hardware detection not available - install required dependencies"
        
        if CTK_AVAILABLE and hasattr(self, 'hardware_display'):
            self.hardware_display.delete("1.0", "end")
            self.hardware_display.insert("1.0", info_text)
        elif hasattr(self, 'hardware_display'):
            self.hardware_display.delete("1.0", "end")
            self.hardware_display.insert("1.0", info_text)
    
    def format_hardware_info(self, hw_info: Dict) -> str:
        """Format hardware info for display"""
        lines = [
            "🖥️  SYSTEM HARDWARE SPECIFICATIONS",
            "=" * 50,
            "",
            f"CPU Cores (Physical): {hw_info['cpu_cores']}",
            f"CPU Threads (Logical): {hw_info['cpu_threads']}", 
            f"System RAM: {hw_info['ram_gb']} GB",
            "",
            "🎮 GPU INFORMATION:",
            f"NVIDIA GPU: {'✅ Detected' if hw_info['gpu_info']['has_nvidia'] else '❌ Not found'}",
            f"AMD GPU: {'✅ Detected' if hw_info['gpu_info']['has_amd'] else '❌ Not found'}",
            f"VRAM: {hw_info['gpu_info']['vram_gb']:.1f} GB" if hw_info['gpu_info']['vram_gb'] > 0 else "VRAM: Not available",
            "",
            "🎯 RECOMMENDATION TIER:",
            f"Hardware Class: {hw_info['recommendation_tier'].replace('_', ' ').title()}",
            "",
            "💻 PLATFORM:",
            f"Operating System: {hw_info['platform']['system']}",
            f"Architecture: {hw_info['platform']['architecture']}",
            f"Machine Type: {hw_info['platform']['machine']}",
            "",
            "🎛️ OPTIMAL MODEL RECOMMENDATIONS:",
        ]
        
        # Add model recommendations based on hardware tier
        tier = hw_info['recommendation_tier']
        if 'high_end_gpu' in tier:
            lines.append("• Llama 3.1 70B (Excellent performance)")
            lines.append("• Llama 3.1 8B (Very fast)")
            lines.append("• Any model will work great!")
        elif 'mid_range_gpu' in tier:
            lines.append("• Llama 3.1 8B (Recommended)")
            lines.append("• Mistral 7B (Good balance)")
            lines.append("• Phi-3 Mini (Very fast)")
        elif 'low_end_gpu' in tier:
            lines.append("• Phi-3 Mini (Recommended)")
            lines.append("• Small models work best")
        elif 'high_end_cpu' in tier:
            lines.append("• Llama 3.1 8B (CPU mode)")
            lines.append("• Mistral 7B (Good performance)")
        else:
            lines.append("• Phi-3 Mini (Recommended)")
            lines.append("• Small, efficient models")
        
        return "\\n".join(lines)
    
    def test_pii_detection(self):
        """Test PII detection on user input"""
        if not CTK_AVAILABLE:
            return
        
        test_text = self.pii_test_input.get("1.0", "end-1c")
        scrubbed, has_pii, detected_types = self.pii_scrubber.scrub_text(test_text)
        
        result_text = f"Original Text:\\n{test_text}\\n\\n"
        result_text += f"Scrubbed Text:\\n{scrubbed}\\n\\n"
        result_text += f"PII Detected: {'Yes' if has_pii else 'No'}\\n"
        if detected_types:
            result_text += f"Types Found: {', '.join(detected_types)}\\n"
        
        self.pii_test_output.delete("1.0", "end")
        self.pii_test_output.insert("1.0", result_text)
    
    def toggle_privacy_protection(self):
        """Toggle PII protection on/off"""
        self.pii_protection_enabled = not self.pii_protection_enabled
        status = "ON" if self.pii_protection_enabled else "OFF"
        color = ("green", "lightgreen") if self.pii_protection_enabled else ("red", "red")
        
        if hasattr(self, 'privacy_indicator'):
            self.privacy_indicator.configure(text=f"🛡️ PII Protection: {status}",
                                           text_color=color)
    
    def send_message(self, event=None):
        """Send user message (placeholder for actual AI integration)"""
        if CTK_AVAILABLE:
            user_input = self.input_text.get("1.0", "end-1c").strip()
            if not user_input:
                return
            
            # Apply PII protection if enabled
            if self.pii_protection_enabled:
                scrubbed_input, has_pii, detected_types = self.pii_scrubber.scrub_text(user_input)
                if has_pii:
                    warning = f"⚠️ PII detected and scrubbed: {', '.join(detected_types)}\\n"
                    self.chat_display.insert("end", warning)
            else:
                scrubbed_input = user_input
            
            # Display user message
            timestamp = datetime.now().strftime("%H:%M")
            self.chat_display.insert("end", f"\\n[{timestamp}] You: {user_input}\\n")
            
            # Clear input
            self.input_text.delete("1.0", "end")
            
            # Placeholder AI response
            if self.selected_model:
                self.chat_display.insert("end", f"[{timestamp}] BEAR AI ({self.selected_model.name}): This is a placeholder response. AI integration coming soon!\\n")
            else:
                self.chat_display.insert("end", f"[{timestamp}] BEAR AI: Please select a model first in the Models tab.\\n")
            
            # Scroll to bottom
            self.chat_display.see("end")
        
        return "break"  # Prevent default behavior
    
    def run(self):
        """Start the GUI application"""
        try:
            self.root.mainloop()
        except KeyboardInterrupt:
            self.root.quit()

def main():
    """Main entry point"""
    print("BEAR AI - Ultra Modern GUI Starting...")
    
    if CTK_AVAILABLE:
        print("CustomTkinter detected - Using modern styling")
    else:
        print("CustomTkinter not found - Using enhanced tkinter fallback")
        print("   Install with: pip install customtkinter")
    
    if MODEL_MANAGER_AVAILABLE:
        print("Model Manager available - Full functionality enabled")
    else:
        print("Model Manager not available - Limited functionality")
        print("   Some features may not work without proper installation")
    
    print("Launching BEAR AI...")
    
    app = ModernBEARAI()
    app.run()

if __name__ == "__main__":
    main()