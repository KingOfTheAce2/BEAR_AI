"""
BEAR AI Desktop GUI Application
Beautiful, user-friendly interface that surpasses LM Studio
"""

import asyncio
import json
import logging
import threading
from pathlib import Path
from tkinter import ttk
import tkinter as tk
from typing import Dict, List, Optional

import customtkinter as ctk
from PIL import Image, ImageTk

from ..discovery.model_discovery import get_model_discovery
from ..models.multi_model_manager import get_model_manager
from ..server.openai_server import get_openai_server
from ..optimization.hardware_optimizer import get_hardware_optimizer

logger = logging.getLogger(__name__)

# Set appearance mode and color theme
ctk.set_appearance_mode("dark")  # Modes: system (default), light, dark
ctk.set_default_color_theme("blue")  # Themes: blue (default), dark-blue, green


class ModelCard(ctk.CTkFrame):
    """Card widget for displaying model information"""
    
    def __init__(self, parent, model_info: Dict, on_install=None, on_load=None):
        super().__init__(parent)
        
        self.model_info = model_info
        self.on_install = on_install
        self.on_load = on_load
        
        self._setup_ui()
    
    def _setup_ui(self):
        """Setup model card UI"""
        
        # Model name
        name_label = ctk.CTkLabel(
            self, 
            text=self.model_info["name"], 
            font=ctk.CTkFont(size=16, weight="bold")
        )
        name_label.pack(anchor="w", padx=10, pady=(10, 5))
        
        # Model details
        details = f"Size: {self.model_info['size_gb']:.1f}GB • Format: {self.model_info['format']}"
        if self.model_info.get("quantization"):
            details += f" • {self.model_info['quantization']}"
        
        details_label = ctk.CTkLabel(
            self, 
            text=details, 
            font=ctk.CTkFont(size=12),
            text_color="gray70"
        )
        details_label.pack(anchor="w", padx=10)
        
        # Compatibility score
        score = self.model_info.get("compatibility_score", 0.0)
        score_color = "green" if score > 0.7 else "orange" if score > 0.4 else "red"
        
        score_label = ctk.CTkLabel(
            self, 
            text=f"Compatibility: {score:.0%}", 
            font=ctk.CTkFont(size=12),
            text_color=score_color
        )
        score_label.pack(anchor="w", padx=10)
        
        # Performance estimates
        perf_text = f"Speed: {self.model_info.get('estimated_speed', 'Unknown')} • RAM: {self.model_info.get('memory_usage', 'Unknown')}"
        perf_label = ctk.CTkLabel(
            self, 
            text=perf_text, 
            font=ctk.CTkFont(size=11),
            text_color="gray60"
        )
        perf_label.pack(anchor="w", padx=10)
        
        # Reason
        reason_label = ctk.CTkLabel(
            self, 
            text=self.model_info.get("reason", ""), 
            font=ctk.CTkFont(size=11),
            text_color="gray50",
            wraplength=300
        )
        reason_label.pack(anchor="w", padx=10, pady=(0, 5))
        
        # Buttons
        button_frame = ctk.CTkFrame(self)
        button_frame.pack(fill="x", padx=10, pady=(0, 10))
        
        install_btn = ctk.CTkButton(
            button_frame, 
            text="Install", 
            width=80,
            height=30,
            command=self._on_install_clicked
        )
        install_btn.pack(side="right", padx=(5, 0))
        
        load_btn = ctk.CTkButton(
            button_frame, 
            text="Load", 
            width=60,
            height=30,
            command=self._on_load_clicked
        )
        load_btn.pack(side="right")
    
    def _on_install_clicked(self):
        if self.on_install:
            self.on_install(self.model_info)
    
    def _on_load_clicked(self):
        if self.on_load:
            self.on_load(self.model_info)


class ChatInterface(ctk.CTkFrame):
    """Chat interface component"""
    
    def __init__(self, parent):
        super().__init__(parent)
        
        self.conversation_history = []
        self.current_model = None
        
        self._setup_ui()
    
    def _setup_ui(self):
        """Setup chat interface UI"""
        
        # Chat history
        self.chat_frame = ctk.CTkScrollableFrame(self, height=400)
        self.chat_frame.pack(fill="both", expand=True, padx=10, pady=(10, 5))
        
        # Input frame
        input_frame = ctk.CTkFrame(self)
        input_frame.pack(fill="x", padx=10, pady=(5, 10))
        
        # Message input
        self.message_entry = ctk.CTkEntry(
            input_frame, 
            placeholder_text="Type your message here...",
            height=40
        )
        self.message_entry.pack(side="left", fill="x", expand=True, padx=(0, 10))
        self.message_entry.bind("<Return>", self._on_send_message)
        
        # Send button
        send_btn = ctk.CTkButton(
            input_frame, 
            text="Send", 
            width=80,
            height=40,
            command=self._on_send_message
        )
        send_btn.pack(side="right")
        
        # Add welcome message
        self._add_message("assistant", "Welcome to BEAR AI! Select a model and start chatting.")
    
    def _add_message(self, role: str, content: str):
        """Add message to chat history"""
        
        # Message frame
        msg_frame = ctk.CTkFrame(self.chat_frame)
        msg_frame.pack(fill="x", pady=5)
        
        # Role label
        role_color = "#4CAF50" if role == "assistant" else "#2196F3"
        role_text = "🤖 BEAR AI" if role == "assistant" else "👤 You"
        
        role_label = ctk.CTkLabel(
            msg_frame,
            text=role_text,
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=role_color
        )
        role_label.pack(anchor="w", padx=10, pady=(5, 0))
        
        # Message content
        content_label = ctk.CTkLabel(
            msg_frame,
            text=content,
            font=ctk.CTkFont(size=12),
            wraplength=500,
            justify="left"
        )
        content_label.pack(anchor="w", padx=10, pady=(0, 10))
        
        # Scroll to bottom
        self.chat_frame.update_idletasks()
        self.chat_frame._parent_canvas.yview_moveto(1.0)
    
    def _on_send_message(self, event=None):
        """Handle send message"""
        
        message = self.message_entry.get().strip()
        if not message:
            return
        
        # Add user message
        self._add_message("user", message)
        self.message_entry.delete(0, tk.END)
        
        # Generate response (placeholder)
        if not self.current_model:
            self._add_message("assistant", "Please select and load a model first.")
        else:
            # This would connect to the actual model manager
            response = f"Echo from {self.current_model}: {message}"
            self._add_message("assistant", response)
    
    def set_model(self, model_name: str):
        """Set current model"""
        self.current_model = model_name
        self._add_message("assistant", f"Switched to model: {model_name}")


class SystemMonitor(ctk.CTkFrame):
    """System monitoring widget"""
    
    def __init__(self, parent):
        super().__init__(parent)
        
        self._setup_ui()
        self._start_monitoring()
    
    def _setup_ui(self):
        """Setup monitoring UI"""
        
        title = ctk.CTkLabel(
            self, 
            text="System Monitor", 
            font=ctk.CTkFont(size=14, weight="bold")
        )
        title.pack(pady=(10, 5))
        
        # CPU usage
        self.cpu_label = ctk.CTkLabel(self, text="CPU: ---%")
        self.cpu_label.pack(anchor="w", padx=10, pady=2)
        
        self.cpu_progress = ctk.CTkProgressBar(self)
        self.cpu_progress.pack(fill="x", padx=10, pady=(0, 5))
        
        # Memory usage
        self.memory_label = ctk.CTkLabel(self, text="Memory: ---%")
        self.memory_label.pack(anchor="w", padx=10, pady=2)
        
        self.memory_progress = ctk.CTkProgressBar(self)
        self.memory_progress.pack(fill="x", padx=10, pady=(0, 5))
        
        # GPU usage (if available)
        self.gpu_label = ctk.CTkLabel(self, text="GPU: ---%")
        self.gpu_label.pack(anchor="w", padx=10, pady=2)
        
        self.gpu_progress = ctk.CTkProgressBar(self)
        self.gpu_progress.pack(fill="x", padx=10, pady=(0, 10))
    
    def _start_monitoring(self):
        """Start system monitoring"""
        
        def update_stats():
            try:
                import psutil
                
                # CPU
                cpu_percent = psutil.cpu_percent(interval=1)
                self.cpu_label.configure(text=f"CPU: {cpu_percent:.1f}%")
                self.cpu_progress.set(cpu_percent / 100)
                
                # Memory
                memory = psutil.virtual_memory()
                self.memory_label.configure(text=f"Memory: {memory.percent:.1f}%")
                self.memory_progress.set(memory.percent / 100)
                
                # GPU (placeholder)
                self.gpu_label.configure(text="GPU: N/A")
                self.gpu_progress.set(0.0)
                
            except Exception as e:
                logger.debug(f"Error updating system stats: {e}")
            
            # Schedule next update
            self.after(2000, update_stats)
        
        # Start monitoring
        self.after(1000, update_stats)


class BearAIDesktopApp:
    """Main BEAR AI Desktop Application"""
    
    def __init__(self):
        self.root = ctk.CTk()
        self.root.title("BEAR AI - Privacy-First Local AI")
        self.root.geometry("1200x800")
        
        # Initialize components
        self.model_discovery = get_model_discovery()
        self.model_manager = get_model_manager()
        self.hardware_optimizer = get_hardware_optimizer()
        self.openai_server = None
        
        self.discovered_models = []
        self.loaded_models = []
        
        self._setup_ui()
        self._load_initial_data()
    
    def _setup_ui(self):
        """Setup main application UI"""
        
        # Main container
        main_frame = ctk.CTkFrame(self.root)
        main_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Create notebook for tabs
        self.notebook = ctk.CTkTabview(main_frame)
        self.notebook.pack(fill="both", expand=True)
        
        # Create tabs
        self._setup_chat_tab()
        self._setup_models_tab()
        self._setup_server_tab()
        self._setup_settings_tab()
    
    def _setup_chat_tab(self):
        """Setup chat tab"""
        
        chat_tab = self.notebook.add("Chat")
        
        # Main chat layout
        chat_container = ctk.CTkFrame(chat_tab)
        chat_container.pack(fill="both", expand=True, padx=5, pady=5)
        
        # Sidebar
        sidebar = ctk.CTkFrame(chat_container, width=250)
        sidebar.pack(side="left", fill="y", padx=(0, 5))
        
        # Model selector in sidebar
        model_label = ctk.CTkLabel(
            sidebar, 
            text="Active Model", 
            font=ctk.CTkFont(size=14, weight="bold")
        )
        model_label.pack(pady=(10, 5))
        
        self.model_selector = ctk.CTkOptionMenu(
            sidebar, 
            values=["No models loaded"],
            command=self._on_model_selected
        )
        self.model_selector.pack(padx=10, pady=5, fill="x")
        
        # System monitor in sidebar
        self.system_monitor = SystemMonitor(sidebar)
        self.system_monitor.pack(fill="x", padx=5, pady=10)
        
        # Chat interface
        self.chat_interface = ChatInterface(chat_container)
        self.chat_interface.pack(side="right", fill="both", expand=True)
    
    def _setup_models_tab(self):
        """Setup models tab"""
        
        models_tab = self.notebook.add("Models")
        
        # Top controls
        controls_frame = ctk.CTkFrame(models_tab)
        controls_frame.pack(fill="x", padx=5, pady=5)
        
        discover_btn = ctk.CTkButton(
            controls_frame, 
            text="🔍 Discover Models", 
            command=self._on_discover_models
        )
        discover_btn.pack(side="left", padx=5, pady=5)
        
        auto_install_btn = ctk.CTkButton(
            controls_frame, 
            text="🚀 Auto-Install Best", 
            command=self._on_auto_install_best
        )
        auto_install_btn.pack(side="left", padx=5, pady=5)
        
        refresh_btn = ctk.CTkButton(
            controls_frame, 
            text="🔄 Refresh", 
            command=self._on_refresh_models
        )
        refresh_btn.pack(side="left", padx=5, pady=5)
        
        # Status label
        self.status_label = ctk.CTkLabel(
            controls_frame, 
            text="Ready to discover models",
            text_color="gray70"
        )
        self.status_label.pack(side="right", padx=10, pady=5)
        
        # Models list
        self.models_frame = ctk.CTkScrollableFrame(models_tab)
        self.models_frame.pack(fill="both", expand=True, padx=5, pady=(0, 5))
    
    def _setup_server_tab(self):
        """Setup server tab"""
        
        server_tab = self.notebook.add("API Server")
        
        # Server controls
        controls_frame = ctk.CTkFrame(server_tab)
        controls_frame.pack(fill="x", padx=5, pady=5)
        
        self.server_btn = ctk.CTkButton(
            controls_frame, 
            text="🚀 Start OpenAI Server", 
            command=self._on_toggle_server
        )
        self.server_btn.pack(side="left", padx=5, pady=5)
        
        # Server configuration
        config_frame = ctk.CTkFrame(server_tab)
        config_frame.pack(fill="x", padx=5, pady=5)
        
        # Host
        host_label = ctk.CTkLabel(config_frame, text="Host:")
        host_label.pack(side="left", padx=5, pady=5)
        
        self.host_entry = ctk.CTkEntry(config_frame, width=120)
        self.host_entry.insert(0, "127.0.0.1")
        self.host_entry.pack(side="left", padx=5, pady=5)
        
        # Port
        port_label = ctk.CTkLabel(config_frame, text="Port:")
        port_label.pack(side="left", padx=5, pady=5)
        
        self.port_entry = ctk.CTkEntry(config_frame, width=80)
        self.port_entry.insert(0, "8000")
        self.port_entry.pack(side="left", padx=5, pady=5)
        
        # Server info
        info_frame = ctk.CTkFrame(server_tab)
        info_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        info_text = """
OpenAI-Compatible API Server

This server provides drop-in compatibility with OpenAI's API:
• Chat completions (/v1/chat/completions)
• Text completions (/v1/completions) 
• Embeddings (/v1/embeddings)
• Models list (/v1/models)

Use this endpoint in your applications instead of OpenAI's API
to keep everything local and private.

Example usage:
import openai
openai.api_base = "http://127.0.0.1:8000/v1"
openai.api_key = "not-needed"
"""
        
        info_label = ctk.CTkLabel(
            info_frame, 
            text=info_text,
            justify="left",
            font=ctk.CTkFont(size=12)
        )
        info_label.pack(padx=20, pady=20, anchor="nw")
    
    def _setup_settings_tab(self):
        """Setup settings tab"""
        
        settings_tab = self.notebook.add("Settings")
        
        # Appearance settings
        appearance_frame = ctk.CTkFrame(settings_tab)
        appearance_frame.pack(fill="x", padx=5, pady=5)
        
        appearance_label = ctk.CTkLabel(
            appearance_frame, 
            text="Appearance", 
            font=ctk.CTkFont(size=14, weight="bold")
        )
        appearance_label.pack(pady=(10, 5))
        
        # Theme selector
        theme_label = ctk.CTkLabel(appearance_frame, text="Theme:")
        theme_label.pack(anchor="w", padx=10, pady=(5, 0))
        
        theme_selector = ctk.CTkOptionMenu(
            appearance_frame,
            values=["System", "Light", "Dark"],
            command=self._on_theme_changed
        )
        theme_selector.pack(anchor="w", padx=10, pady=(0, 10))
        theme_selector.set("Dark")
        
        # Privacy settings
        privacy_frame = ctk.CTkFrame(settings_tab)
        privacy_frame.pack(fill="x", padx=5, pady=5)
        
        privacy_label = ctk.CTkLabel(
            privacy_frame, 
            text="Privacy", 
            font=ctk.CTkFont(size=14, weight="bold")
        )
        privacy_label.pack(pady=(10, 5))
        
        self.pii_scrubbing_var = ctk.BooleanVar(value=True)
        pii_checkbox = ctk.CTkCheckBox(
            privacy_frame,
            text="Enable PII scrubbing",
            variable=self.pii_scrubbing_var
        )
        pii_checkbox.pack(anchor="w", padx=10, pady=5)
        
        # Performance settings
        performance_frame = ctk.CTkFrame(settings_tab)
        performance_frame.pack(fill="x", padx=5, pady=5)
        
        performance_label = ctk.CTkLabel(
            performance_frame, 
            text="Performance", 
            font=ctk.CTkFont(size=14, weight="bold")
        )
        performance_label.pack(pady=(10, 5))
        
        # Max concurrent models
        models_label = ctk.CTkLabel(performance_frame, text="Max concurrent models:")
        models_label.pack(anchor="w", padx=10, pady=(5, 0))
        
        self.max_models_slider = ctk.CTkSlider(
            performance_frame,
            from_=1,
            to=5,
            number_of_steps=4
        )
        self.max_models_slider.pack(anchor="w", padx=10, pady=(0, 10))
        self.max_models_slider.set(3)
    
    def _load_initial_data(self):
        """Load initial data"""
        
        # Start discovery in background
        threading.Thread(
            target=self._discover_models_background, 
            daemon=True
        ).start()
    
    def _discover_models_background(self):
        """Discover models in background thread"""
        
        try:
            # Update status
            self.root.after(0, lambda: self.status_label.configure(text="Discovering models..."))
            
            # Run discovery
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            models = loop.run_until_complete(
                self.model_discovery.discover_models("chat")
            )
            
            self.discovered_models = models
            
            # Update UI on main thread
            self.root.after(0, self._update_models_display)
            self.root.after(0, lambda: self.status_label.configure(
                text=f"Found {len(models)} compatible models"
            ))
            
        except Exception as e:
            logger.error(f"Error discovering models: {e}")
            self.root.after(0, lambda: self.status_label.configure(
                text=f"Discovery failed: {str(e)}"
            ))
    
    def _update_models_display(self):
        """Update models display"""
        
        # Clear existing model cards
        for widget in self.models_frame.winfo_children():
            widget.destroy()
        
        # Add model cards
        for model in self.discovered_models:
            card = ModelCard(
                self.models_frame,
                {
                    "name": model.model_name,
                    "size_gb": model.size_gb,
                    "format": model.format,
                    "quantization": model.quantization,
                    "compatibility_score": model.compatibility_score,
                    "estimated_speed": model.estimated_speed,
                    "memory_usage": model.memory_usage,
                    "reason": model.reason,
                    "model_id": model.model_id
                },
                on_install=self._on_install_model,
                on_load=self._on_load_model
            )
            card.pack(fill="x", padx=5, pady=5)
    
    def _on_discover_models(self):
        """Handle discover models button"""
        
        threading.Thread(
            target=self._discover_models_background, 
            daemon=True
        ).start()
    
    def _on_auto_install_best(self):
        """Handle auto-install best model"""
        
        def install_best():
            try:
                self.root.after(0, lambda: self.status_label.configure(
                    text="Auto-installing best model..."
                ))
                
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                model_path = loop.run_until_complete(
                    self.model_discovery.auto_install_best_model("chat")
                )
                
                if model_path:
                    self.root.after(0, lambda: self.status_label.configure(
                        text="Best model installed successfully"
                    ))
                else:
                    self.root.after(0, lambda: self.status_label.configure(
                        text="Auto-install failed"
                    ))
                    
            except Exception as e:
                logger.error(f"Error auto-installing: {e}")
                self.root.after(0, lambda: self.status_label.configure(
                    text=f"Auto-install failed: {str(e)}"
                ))
        
        threading.Thread(target=install_best, daemon=True).start()
    
    def _on_refresh_models(self):
        """Handle refresh models"""
        
        self._discover_models_background()
    
    def _on_install_model(self, model_info: Dict):
        """Handle install model"""
        
        def install_model():
            try:
                self.root.after(0, lambda: self.status_label.configure(
                    text=f"Installing {model_info['name']}..."
                ))
                
                # Placeholder installation logic
                import time
                time.sleep(2)  # Simulate installation
                
                self.root.after(0, lambda: self.status_label.configure(
                    text=f"Installed {model_info['name']}"
                ))
                
            except Exception as e:
                logger.error(f"Error installing model: {e}")
                self.root.after(0, lambda: self.status_label.configure(
                    text=f"Install failed: {str(e)}"
                ))
        
        threading.Thread(target=install_model, daemon=True).start()
    
    def _on_load_model(self, model_info: Dict):
        """Handle load model"""
        
        def load_model():
            try:
                self.root.after(0, lambda: self.status_label.configure(
                    text=f"Loading {model_info['name']}..."
                ))
                
                # Placeholder loading logic
                import time
                time.sleep(1)  # Simulate loading
                
                # Update model selector
                self.loaded_models.append(model_info['name'])
                self.root.after(0, lambda: self.model_selector.configure(
                    values=self.loaded_models
                ))
                self.root.after(0, lambda: self.model_selector.set(model_info['name']))
                
                # Update chat interface
                self.root.after(0, lambda: self.chat_interface.set_model(model_info['name']))
                
                self.root.after(0, lambda: self.status_label.configure(
                    text=f"Loaded {model_info['name']}"
                ))
                
            except Exception as e:
                logger.error(f"Error loading model: {e}")
                self.root.after(0, lambda: self.status_label.configure(
                    text=f"Load failed: {str(e)}"
                ))
        
        threading.Thread(target=load_model, daemon=True).start()
    
    def _on_model_selected(self, model_name: str):
        """Handle model selection"""
        
        if model_name != "No models loaded":
            self.chat_interface.set_model(model_name)
    
    def _on_toggle_server(self):
        """Handle toggle server"""
        
        if self.openai_server is None:
            # Start server
            def start_server():
                try:
                    host = self.host_entry.get()
                    port = int(self.port_entry.get())
                    
                    self.openai_server = get_openai_server(host, port)
                    
                    # This would start the server in background
                    # For now, just simulate
                    import time
                    time.sleep(1)
                    
                    self.root.after(0, lambda: self.server_btn.configure(
                        text="🛑 Stop OpenAI Server"
                    ))
                    
                except Exception as e:
                    logger.error(f"Error starting server: {e}")
                    self.openai_server = None
            
            threading.Thread(target=start_server, daemon=True).start()
        else:
            # Stop server
            self.openai_server = None
            self.server_btn.configure(text="🚀 Start OpenAI Server")
    
    def _on_theme_changed(self, theme: str):
        """Handle theme change"""
        
        if theme == "System":
            ctk.set_appearance_mode("system")
        elif theme == "Light":
            ctk.set_appearance_mode("light")
        elif theme == "Dark":
            ctk.set_appearance_mode("dark")
    
    def run(self):
        """Run the application"""
        
        logger.info("Starting BEAR AI Desktop Application")
        self.root.mainloop()


def main():
    """Main entry point for desktop app"""
    
    app = BearAIDesktopApp()
    app.run()

if __name__ == "__main__":
    main()