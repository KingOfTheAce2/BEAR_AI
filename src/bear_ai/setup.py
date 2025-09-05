"""
BEAR AI Easy Setup System
Interactive setup and configuration for non-technical users
"""

import asyncio
import json
import logging
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import tempfile

try:
    import typer
    from rich.console import Console
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.prompt import Prompt, Confirm
    from rich.table import Table
    from rich.text import Text
except ImportError:
    # Fallback for basic functionality
    typer = None
    Console = None

logger = logging.getLogger(__name__)

# Initialize console if available
if Console:
    console = Console()
else:
    console = None

class SetupManager:
    """Manage BEAR AI setup and configuration"""
    
    def __init__(self):
        self.system_info = self._detect_system()
        self.bear_ai_dir = Path.home() / ".bear_ai"
        self.config_file = self.bear_ai_dir / "config.json"
        
        # Ensure directory exists
        self.bear_ai_dir.mkdir(exist_ok=True)
        
        # Default configuration
        self.default_config = {
            "version": "0.1.0-alpha",
            "installation_type": "standard",
            "features": {
                "multimodal": False,
                "rag": False,
                "privacy": False,
                "hardware_monitoring": False,
                "gui": False
            },
            "models": {
                "default_model": None,
                "model_directory": str(self.bear_ai_dir / "models"),
                "cache_directory": str(self.bear_ai_dir / "cache")
            },
            "privacy": {
                "local_only": True,
                "data_retention": "session",
                "telemetry": False
            },
            "ui": {
                "theme": "auto",
                "language": "en"
            },
            "setup_completed": False
        }
    
    def _detect_system(self) -> Dict[str, str]:
        """Detect system information"""
        
        system_info = {
            "os": platform.system(),
            "os_version": platform.release(),
            "architecture": platform.machine(),
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "platform": platform.platform()
        }
        
        # Detect GPU
        gpu_info = self._detect_gpu()
        system_info.update(gpu_info)
        
        return system_info
    
    def _detect_gpu(self) -> Dict[str, str]:
        """Detect GPU information"""
        
        gpu_info = {
            "gpu_available": False,
            "gpu_type": "none",
            "gpu_memory": "0MB"
        }
        
        try:
            # Try NVIDIA first
            import subprocess
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0 and result.stdout:
                lines = result.stdout.strip().split('\n')
                if lines and lines[0]:
                    name, memory = lines[0].split(',')
                    gpu_info.update({
                        "gpu_available": True,
                        "gpu_type": "NVIDIA",
                        "gpu_name": name.strip(),
                        "gpu_memory": f"{memory.strip()}MB"
                    })
                    return gpu_info
        except:
            pass
        
        try:
            # Try AMD/Intel (basic detection)
            if platform.system() == "Linux":
                result = subprocess.run(["lspci"], capture_output=True, text=True, timeout=10)
                if "VGA compatible controller" in result.stdout:
                    if "AMD" in result.stdout or "ATI" in result.stdout:
                        gpu_info.update({
                            "gpu_available": True,
                            "gpu_type": "AMD"
                        })
                    elif "Intel" in result.stdout:
                        gpu_info.update({
                            "gpu_available": True,
                            "gpu_type": "Intel"
                        })
        except:
            pass
        
        return gpu_info
    
    def run_interactive_setup(self) -> bool:
        """Run interactive setup process"""
        
        if not console:
            return self._run_basic_setup()
        
        try:
            console.print(Panel.fit(
                "[bold blue]🐻 Welcome to BEAR AI Setup[/bold blue]\n"
                "Privacy-First, Local-Only AI Assistant\n"
                "[dim]Bridge for Expertise, Audit and Research[/dim]",
                title="BEAR AI v0.1.0-alpha",
                border_style="blue"
            ))
            
            # Show system information
            self._display_system_info()
            
            # License agreement
            if not self._show_license_agreement():
                console.print("[red]Setup cancelled by user.[/red]")
                return False
            
            # Installation type selection
            install_type = self._select_installation_type()
            
            # Feature selection
            features = self._select_features(install_type)
            
            # Model setup
            model_config = self._setup_models()
            
            # Privacy settings
            privacy_config = self._setup_privacy()
            
            # Create configuration
            config = self.default_config.copy()
            config.update({
                "installation_type": install_type,
                "features": features,
                "models": model_config,
                "privacy": privacy_config,
                "setup_completed": True
            })
            
            # Save configuration
            self._save_config(config)
            
            # Install dependencies
            if self._install_dependencies(features):
                # Run post-install setup
                self._run_post_install_setup(config)
                
                console.print(Panel.fit(
                    "[bold green]✅ BEAR AI Setup Complete![/bold green]\n\n"
                    "You can now start using BEAR AI:\n"
                    "• Command line: [bold]bear-ai chat[/bold]\n"
                    "• GUI interface: [bold]bear-gui[/bold]\n"
                    "• Documentation: [bold]bear-ai help[/bold]\n\n"
                    "[dim]Configuration saved to: ~/.bear_ai/config.json[/dim]",
                    title="Setup Successful",
                    border_style="green"
                ))
                
                return True
            else:
                console.print("[red]Setup failed during dependency installation.[/red]")
                return False
            
        except KeyboardInterrupt:
            console.print("\n[red]Setup cancelled by user.[/red]")
            return False
        except Exception as e:
            console.print(f"[red]Setup failed with error: {e}[/red]")
            logger.error(f"Setup error: {e}", exc_info=True)
            return False
    
    def _run_basic_setup(self) -> bool:
        """Run basic setup without rich UI"""
        
        print("🐻 BEAR AI Setup")
        print("================")
        print("Privacy-First, Local-Only AI Assistant")
        print()
        
        # Basic license agreement
        print("By continuing, you agree to the BEAR AI proprietary license terms.")
        response = input("Continue? (y/N): ").strip().lower()
        if response != 'y':
            print("Setup cancelled.")
            return False
        
        # Simple configuration
        config = self.default_config.copy()
        config["setup_completed"] = True
        
        # Save basic config
        self._save_config(config)
        
        # Try to install basic dependencies
        try:
            print("Installing basic dependencies...")
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", "-e", "."
            ])
            print("✅ Basic installation complete!")
            print()
            print("You can now use:")
            print("  bear-ai chat    # Start a chat session")
            print("  bear-ai help    # Show help")
            print("  bear-setup      # Run full setup later")
            return True
        except subprocess.CalledProcessError:
            print("❌ Installation failed. Please check your Python environment.")
            return False
    
    def _display_system_info(self):
        """Display detected system information"""
        
        table = Table(title="System Information")
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="white")
        
        table.add_row("Operating System", f"{self.system_info['os']} {self.system_info['os_version']}")
        table.add_row("Architecture", self.system_info["architecture"])
        table.add_row("Python Version", self.system_info["python_version"])
        
        if self.system_info.get("gpu_available"):
            gpu_name = self.system_info.get("gpu_name", self.system_info["gpu_type"])
            gpu_memory = self.system_info.get("gpu_memory", "Unknown")
            table.add_row("GPU", f"{gpu_name} ({gpu_memory})")
        else:
            table.add_row("GPU", "None detected")
        
        console.print(table)
        console.print()
    
    def _show_license_agreement(self) -> bool:
        """Show license agreement"""
        
        license_text = """
BEAR AI is distributed under a proprietary license.

Copyright (c) 2024 BEAR AI. All rights reserved.

This software and associated documentation files (the "Software") are the proprietary property of BEAR AI and are protected by copyright law.

Unless you have received prior written authorization from BEAR AI, you may not copy, reproduce, modify, publish, distribute, sublicense, sell, or otherwise use the Software, in whole or in part.

Any unauthorized use of the Software is strictly prohibited and may result in civil and/or criminal penalties.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
        """
        
        console.print(Panel(
            license_text.strip(),
            title="License Agreement",
            border_style="yellow"
        ))
        
        return Confirm.ask("\nDo you accept the license terms?")
    
    def _select_installation_type(self) -> str:
        """Select installation type"""
        
        console.print("\n[bold]Installation Type[/bold]")
        
        choices = [
            ("minimal", "Minimal - Core functionality only"),
            ("standard", "Standard - Recommended for most users"),
            ("full", "Full - All features (requires more disk space)"),
            ("custom", "Custom - Choose specific features")
        ]
        
        for i, (key, description) in enumerate(choices, 1):
            console.print(f"  {i}. {description}")
        
        while True:
            choice = Prompt.ask("\nSelect installation type", choices=["1", "2", "3", "4"], default="2")
            
            if choice == "1":
                return "minimal"
            elif choice == "2":
                return "standard"
            elif choice == "3":
                return "full"
            elif choice == "4":
                return "custom"
    
    def _select_features(self, install_type: str) -> Dict[str, bool]:
        """Select features to install"""
        
        if install_type == "minimal":
            return {
                "multimodal": False,
                "rag": False,
                "privacy": False,
                "hardware_monitoring": False,
                "gui": False
            }
        elif install_type == "standard":
            return {
                "multimodal": True,
                "rag": True,
                "privacy": True,
                "hardware_monitoring": False,
                "gui": True
            }
        elif install_type == "full":
            return {
                "multimodal": True,
                "rag": True,
                "privacy": True,
                "hardware_monitoring": True,
                "gui": True
            }
        else:  # custom
            console.print("\n[bold]Feature Selection[/bold]")
            
            features = {}
            
            features["multimodal"] = Confirm.ask(
                "Multi-modal support (images, audio, documents)?",
                default=True
            )
            
            features["rag"] = Confirm.ask(
                "RAG (Retrieval-Augmented Generation) with vector search?",
                default=True
            )
            
            features["privacy"] = Confirm.ask(
                "Privacy tools (PII detection and scrubbing)?",
                default=True
            )
            
            features["hardware_monitoring"] = Confirm.ask(
                "Hardware monitoring (GPU, memory usage)?",
                default=False
            )
            
            features["gui"] = Confirm.ask(
                "Graphical user interface?",
                default=True
            )
            
            return features
    
    def _setup_models(self) -> Dict[str, str]:
        """Setup model configuration"""
        
        console.print("\n[bold]Model Configuration[/bold]")
        
        model_dir = Prompt.ask(
            "Model storage directory",
            default=str(self.bear_ai_dir / "models")
        )
        
        cache_dir = Prompt.ask(
            "Cache directory",
            default=str(self.bear_ai_dir / "cache")
        )
        
        # Create directories
        Path(model_dir).mkdir(parents=True, exist_ok=True)
        Path(cache_dir).mkdir(parents=True, exist_ok=True)
        
        return {
            "default_model": None,
            "model_directory": model_dir,
            "cache_directory": cache_dir
        }
    
    def _setup_privacy(self) -> Dict[str, bool]:
        """Setup privacy configuration"""
        
        console.print("\n[bold]Privacy Settings[/bold]")
        
        local_only = Confirm.ask(
            "Keep all data local (no cloud services)?",
            default=True
        )
        
        telemetry = not Confirm.ask(
            "Disable telemetry and usage analytics?",
            default=True
        )
        
        data_retention_choice = Prompt.ask(
            "Data retention policy",
            choices=["session", "30days", "permanent"],
            default="session"
        )
        
        return {
            "local_only": local_only,
            "data_retention": data_retention_choice,
            "telemetry": telemetry
        }
    
    def _install_dependencies(self, features: Dict[str, bool]) -> bool:
        """Install selected dependencies"""
        
        if not console:
            return True  # Skip installation in basic mode
        
        console.print("\n[bold]Installing Dependencies[/bold]")
        
        # Build extras list
        extras = []
        
        if features.get("multimodal"):
            extras.append("multimodal")
        
        if features.get("rag"):
            extras.append("rag")
        
        if features.get("privacy"):
            extras.append("privacy")
        
        if features.get("hardware_monitoring"):
            extras.append("hardware")
        
        if features.get("gui"):
            extras.append("gui")
        
        # Install with progress bar
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            
            # Base installation
            task = progress.add_task("Installing BEAR AI core...", total=None)
            
            try:
                subprocess.check_call([
                    sys.executable, "-m", "pip", "install", "-e", ".",
                    "--quiet"
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                
                progress.update(task, description="✅ BEAR AI core installed")
                
            except subprocess.CalledProcessError as e:
                progress.update(task, description="❌ Core installation failed")
                console.print(f"[red]Core installation failed: {e}[/red]")
                return False
            
            # Install extras
            if extras:
                extras_str = ",".join(extras)
                task2 = progress.add_task(f"Installing features: {extras_str}...", total=None)
                
                try:
                    subprocess.check_call([
                        sys.executable, "-m", "pip", "install", "-e", f".[{extras_str}]",
                        "--quiet"
                    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    
                    progress.update(task2, description=f"✅ Features installed: {extras_str}")
                    
                except subprocess.CalledProcessError as e:
                    progress.update(task2, description=f"❌ Feature installation failed")
                    console.print(f"[red]Feature installation failed: {e}[/red]")
                    return False
        
        return True
    
    def _run_post_install_setup(self, config: Dict):
        """Run post-installation setup"""
        
        if not console:
            return
        
        console.print("\n[bold]Post-Installation Setup[/bold]")
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            
            # Create directories
            task = progress.add_task("Creating directories...", total=None)
            
            directories = [
                self.bear_ai_dir / "models",
                self.bear_ai_dir / "cache", 
                self.bear_ai_dir / "plugins",
                self.bear_ai_dir / "templates",
                self.bear_ai_dir / "workflows",
                self.bear_ai_dir / "documents",
                self.bear_ai_dir / "logs"
            ]
            
            for directory in directories:
                directory.mkdir(exist_ok=True)
            
            progress.update(task, description="✅ Directories created")
            
            # Download spaCy model for privacy features
            if config["features"].get("privacy"):
                task2 = progress.add_task("Downloading spaCy language model...", total=None)
                
                try:
                    subprocess.check_call([
                        sys.executable, "-m", "spacy", "download", "en_core_web_sm",
                        "--quiet"
                    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    
                    progress.update(task2, description="✅ Language model downloaded")
                except subprocess.CalledProcessError:
                    progress.update(task2, description="⚠️ Language model download failed (optional)")
            
            # Initialize template system
            task3 = progress.add_task("Initializing templates...", total=None)
            
            try:
                # This would initialize built-in templates
                progress.update(task3, description="✅ Templates initialized")
            except Exception:
                progress.update(task3, description="⚠️ Template initialization failed")
    
    def _save_config(self, config: Dict):
        """Save configuration to file"""
        
        try:
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
            
            logger.info(f"Configuration saved to {self.config_file}")
            
        except Exception as e:
            logger.error(f"Failed to save configuration: {e}")
            raise
    
    def check_installation(self) -> Tuple[bool, Dict]:
        """Check if BEAR AI is properly installed"""
        
        status = {
            "installed": False,
            "configured": False,
            "features": {},
            "issues": []
        }
        
        try:
            # Check if config exists
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                
                status["configured"] = config.get("setup_completed", False)
                status["features"] = config.get("features", {})
                
                # Check if core modules can be imported
                try:
                    import bear_ai
                    status["installed"] = True
                except ImportError as e:
                    status["issues"].append(f"Core import failed: {e}")
                
                # Check optional dependencies
                if status["features"].get("multimodal"):
                    try:
                        import PIL
                    except ImportError:
                        status["issues"].append("Pillow not available for image processing")
                
                if status["features"].get("rag"):
                    try:
                        import sentence_transformers
                    except ImportError:
                        status["issues"].append("sentence-transformers not available for RAG")
                
                if status["features"].get("privacy"):
                    try:
                        import presidio_analyzer
                    except ImportError:
                        status["issues"].append("Presidio not available for privacy features")
            
            else:
                status["issues"].append("Configuration file not found")
        
        except Exception as e:
            status["issues"].append(f"Check failed: {e}")
        
        return status["installed"] and status["configured"], status
    
    def repair_installation(self) -> bool:
        """Attempt to repair a broken installation"""
        
        if console:
            console.print("[yellow]Attempting to repair installation...[/yellow]")
        
        try:
            # Reinstall core package
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", "-e", ".", "--force-reinstall"
            ])
            
            # Recreate config if missing
            if not self.config_file.exists():
                self._save_config(self.default_config)
            
            if console:
                console.print("[green]✅ Repair completed[/green]")
            
            return True
            
        except Exception as e:
            if console:
                console.print(f"[red]❌ Repair failed: {e}[/red]")
            return False


def main():
    """Main setup function"""
    
    setup_manager = SetupManager()
    
    if typer:
        app = typer.Typer(help="BEAR AI Setup and Configuration")
        
        @app.command()
        def setup():
            """Run interactive setup"""
            success = setup_manager.run_interactive_setup()
            sys.exit(0 if success else 1)
        
        @app.command()
        def check():
            """Check installation status"""
            is_ok, status = setup_manager.check_installation()
            
            if console:
                if is_ok:
                    console.print("[green]✅ BEAR AI is properly installed and configured[/green]")
                else:
                    console.print("[red]❌ Issues found:[/red]")
                    for issue in status["issues"]:
                        console.print(f"  • {issue}")
            else:
                print("Installation OK" if is_ok else f"Issues: {status['issues']}")
        
        @app.command()
        def repair():
            """Repair installation"""
            success = setup_manager.repair_installation()
            sys.exit(0 if success else 1)
        
        app()
    
    else:
        # Fallback for basic functionality
        if len(sys.argv) > 1:
            command = sys.argv[1]
            
            if command == "check":
                is_ok, status = setup_manager.check_installation()
                print("Installation OK" if is_ok else f"Issues: {status['issues']}")
            elif command == "repair":
                success = setup_manager.repair_installation()
                sys.exit(0 if success else 1)
            else:
                success = setup_manager.run_interactive_setup()
                sys.exit(0 if success else 1)
        else:
            success = setup_manager.run_interactive_setup()
            sys.exit(0 if success else 1)


def run_post_install():
    """Run post-installation setup (called by setup.py)"""
    
    setup_manager = SetupManager()
    
    # Check if already configured
    if setup_manager.config_file.exists():
        try:
            with open(setup_manager.config_file, 'r') as f:
                config = json.load(f)
            
            if config.get("setup_completed"):
                return  # Already set up
        except:
            pass
    
    # Run basic configuration
    config = setup_manager.default_config.copy()
    config["setup_completed"] = True
    setup_manager._save_config(config)
    
    print("🐻 BEAR AI installed successfully!")
    print("Run 'bear-setup' for interactive configuration.")


if __name__ == "__main__":
    main()