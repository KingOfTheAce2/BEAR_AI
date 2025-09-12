#!/usr/bin/env python3
"""
Advanced BEAR AI Executable Installer Creator
Creates a self-extracting Windows executable using Python
"""

import os
import sys
import zipfile
import base64
import tempfile
from pathlib import Path
import shutil

def create_self_extracting_exe():
    """Create a self-extracting executable installer"""
    
    # Python script that will be embedded in the exe
    installer_python_code = '''
import os
import sys
import zipfile
import base64
import tempfile
import subprocess
import shutil
from pathlib import Path

# Embedded package data (will be replaced with actual data)
PACKAGE_DATA = """__PACKAGE_DATA_PLACEHOLDER__"""

def extract_and_install():
    """Extract embedded package and run installer"""
    
    print("=" * 60)
    print("    BEAR AI Legal Assistant - Windows Installer")
    print("=" * 60)
    print()
    
    try:
        # Decode embedded package
        print("🔄 Extracting BEAR AI package...")
        package_data = base64.b64decode(PACKAGE_DATA)
        
        # Create temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Write and extract zip file
            zip_file = temp_path / "bear_ai_package.zip"
            with open(zip_file, 'wb') as f:
                f.write(package_data)
            
            # Set installation directory
            install_dir = Path(os.environ['USERPROFILE']) / "BEAR_AI"
            print(f"📁 Installing to: {install_dir}")
            
            # Create installation directory
            if install_dir.exists():
                print("⚠️  BEAR AI installation found. Backing up...")
                backup_dir = install_dir.parent / f"BEAR_AI_backup_{int(os.time.time())}"
                shutil.move(str(install_dir), str(backup_dir))
                print(f"📦 Backup created: {backup_dir}")
            
            install_dir.mkdir(parents=True, exist_ok=True)
            
            # Extract package
            with zipfile.ZipFile(zip_file, 'r') as zip_ref:
                zip_ref.extractall(install_dir)
            
            print("✅ Files extracted successfully!")
            
            # Check Python installation
            print("🐍 Checking Python installation...")
            try:
                result = subprocess.run([sys.executable, "--version"], 
                                      capture_output=True, text=True)
                if result.returncode == 0:
                    print(f"✅ Found Python: {result.stdout.strip()}")
                else:
                    raise Exception("Python not found")
            except:
                print("❌ ERROR: Python not found or not working")
                print("Please install Python 3.8+ from https://python.org")
                input("Press Enter to exit...")
                return False
            
            # Install dependencies
            print("📦 Installing Python dependencies...")
            requirements_file = install_dir / "requirements.txt"
            if requirements_file.exists():
                try:
                    subprocess.run([
                        sys.executable, "-m", "pip", "install", 
                        "--user", "-r", str(requirements_file)
                    ], check=True)
                    print("✅ Dependencies installed!")
                except subprocess.CalledProcessError:
                    print("⚠️  Some dependencies may not have installed correctly")
            
            # Install Node.js dependencies if package.json exists
            package_json = install_dir / "package.json"
            if package_json.exists():
                print("📦 Installing Node.js dependencies...")
                try:
                    subprocess.run(["npm", "install"], 
                                 cwd=install_dir, check=True)
                    print("✅ Node.js dependencies installed!")
                except (subprocess.CalledProcessError, FileNotFoundError):
                    print("⚠️  Node.js not found or npm install failed")
                    print("   GUI features may not work. Install Node.js from https://nodejs.org")
            
            # Create shortcuts
            create_shortcuts(install_dir)
            
            # Offer to add to PATH
            add_to_path_option(install_dir)
            
            print()
            print("🎉 SUCCESS! BEAR AI installed successfully!")
            print()
            print("Quick start:")
            print(f"  • Double-click 'BEAR AI' on your Desktop")
            print(f"  • Or run: {install_dir / 'run_bear_ai.bat'}")
            print(f"  • For GUI: {install_dir / 'run_bear_ai_gui.bat'}")
            print(f"  • Help: python -m bear_ai --help")
            print()
            
            return True
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        print(f"   Type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return False

def create_shortcuts(install_dir):
    """Create desktop and start menu shortcuts"""
    try:
        print("🔗 Creating shortcuts...")
        
        # Desktop shortcut
        desktop = Path(os.environ['USERPROFILE']) / "Desktop"
        desktop_shortcut = desktop / "BEAR AI.bat"
        
        with open(desktop_shortcut, 'w') as f:
            f.write(f'''@echo off
cd /d "{install_dir}"
python -m bear_ai %*
pause
''')
        
        # GUI shortcut
        desktop_gui_shortcut = desktop / "BEAR AI GUI.bat"
        with open(desktop_gui_shortcut, 'w') as f:
            f.write(f'''@echo off
echo Starting BEAR AI Web Interface...
cd /d "{install_dir}"
start http://localhost:3000
npm start
''')
        
        # Start menu shortcuts
        start_menu = Path(os.environ['APPDATA']) / "Microsoft" / "Windows" / "Start Menu" / "Programs"
        bear_ai_menu = start_menu / "BEAR AI"
        bear_ai_menu.mkdir(exist_ok=True)
        
        # CLI shortcut in start menu
        start_cli = bear_ai_menu / "BEAR AI.bat"
        with open(start_cli, 'w') as f:
            f.write(f'''@echo off
cd /d "{install_dir}"
python -m bear_ai %*
pause
''')
        
        # GUI shortcut in start menu
        start_gui = bear_ai_menu / "BEAR AI GUI.bat"
        with open(start_gui, 'w') as f:
            f.write(f'''@echo off
echo Starting BEAR AI Web Interface...
cd /d "{install_dir}"
start http://localhost:3000
npm start
''')
        
        # Local run scripts
        local_run = install_dir / "run_bear_ai.bat"
        with open(local_run, 'w') as f:
            f.write('''@echo off
python -m bear_ai %*
''')
        
        local_gui = install_dir / "run_bear_ai_gui.bat"
        with open(local_gui, 'w') as f:
            f.write('''@echo off
echo Starting BEAR AI Web Interface...
start http://localhost:3000
npm start
''')
        
        print("✅ Shortcuts created!")
        
    except Exception as e:
        print(f"⚠️  Could not create all shortcuts: {e}")

def add_to_path_option(install_dir):
    """Offer to add BEAR AI to system PATH"""
    try:
        print()
        response = input("Add BEAR AI to system PATH? (y/N): ").lower()
        if response == 'y':
            # Create a wrapper script
            wrapper_script = install_dir / "bear-ai.bat"
            with open(wrapper_script, 'w') as f:
                f.write(f'''@echo off
cd /d "{install_dir}"
python -m bear_ai %*
''')
            
            # Add to user PATH
            import winreg
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER, 
                "Environment", 
                0, 
                winreg.KEY_ALL_ACCESS
            )
            
            try:
                current_path, _ = winreg.QueryValueEx(key, "PATH")
            except FileNotFoundError:
                current_path = ""
            
            if str(install_dir) not in current_path:
                new_path = f"{current_path};{install_dir}" if current_path else str(install_dir)
                winreg.SetValueEx(key, "PATH", 0, winreg.REG_EXPAND_SZ, new_path)
                print("✅ Added to PATH! Restart command prompt to use 'bear-ai' command")
            else:
                print("✅ Already in PATH!")
                
            winreg.CloseKey(key)
    except Exception as e:
        print(f"⚠️  Could not add to PATH: {e}")

if __name__ == "__main__":
    print("🐻 BEAR AI Legal Assistant Installer")
    success = extract_and_install()
    
    if success:
        print("\\n🎊 Installation complete! Enjoy using BEAR AI!")
    else:
        print("\\n💥 Installation failed. Please try manual installation.")
    
    input("\\nPress Enter to exit...")
    sys.exit(0 if success else 1)
'''
    
    # Build the package
    base_dir = Path(__file__).parent.parent
    installer_dir = Path(__file__).parent
    
    print("🔨 Creating self-extracting BEAR AI installer...")
    
    # Create package zip in memory
    from io import BytesIO
    zip_buffer = BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add source files
        src_dir = base_dir / "src"
        for root, dirs, files in os.walk(src_dir):
            for file in files:
                if file.endswith('.py'):
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(base_dir)
                    zipf.write(file_path, arcname)
        
        # Add requirements and package.json
        zipf.write(base_dir / "requirements.txt", "requirements.txt")
        if (base_dir / "package.json").exists():
            zipf.write(base_dir / "package.json", "package.json")
        
        # Add config files if they exist
        config_dir = base_dir / "config"
        if config_dir.exists():
            for config_file in config_dir.rglob("*.json"):
                arcname = config_file.relative_to(base_dir)
                zipf.write(config_file, arcname)
    
    # Encode package data
    zip_buffer.seek(0)
    package_data = base64.b64encode(zip_buffer.getvalue()).decode('ascii')
    
    # Replace placeholder in installer code
    final_installer_code = installer_python_code.replace(
        '__PACKAGE_DATA_PLACEHOLDER__', 
        package_data
    )
    
    # Write final installer Python file
    installer_py = installer_dir / "BEAR_AI_SelfExtractor.py"
    with open(installer_py, 'w') as f:
        f.write(final_installer_code)
    
    print(f"✅ Self-extracting installer created: {installer_py}")
    print(f"📊 Package size: {len(package_data) / 1024 / 1024:.2f} MB")
    
    return installer_py

def create_exe_from_python():
    """Convert Python installer to executable"""
    installer_dir = Path(__file__).parent
    installer_py = installer_dir / "BEAR_AI_SelfExtractor.py"
    
    if not installer_py.exists():
        print("❌ Self-extractor Python file not found!")
        return False
    
    try:
        print("🏗️ Converting to executable...")
        
        # Use PyInstaller to create exe
        cmd = [
            "pyinstaller",
            "--onefile",
            "--console", 
            "--name", "BEAR_AI_Windows_Installer",
            "--distpath", str(installer_dir),
            "--workpath", str(installer_dir / "build"),
            "--specpath", str(installer_dir),
            str(installer_py)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            exe_file = installer_dir / "BEAR_AI_Windows_Installer.exe"
            if exe_file.exists():
                print(f"🎉 SUCCESS! Executable created: {exe_file}")
                print(f"📊 Executable size: {exe_file.stat().st_size / 1024 / 1024:.2f} MB")
                return True
            else:
                print("❌ Executable not found after build")
                return False
        else:
            print(f"❌ PyInstaller failed:")
            print(result.stderr)
            return False
            
    except FileNotFoundError:
        print("❌ PyInstaller not found. Install with: pip install pyinstaller")
        return False
    except Exception as e:
        print(f"❌ Error creating executable: {e}")
        return False

def main():
    """Main function"""
    print("🐻 BEAR AI Advanced Executable Installer Creator")
    print("=" * 60)
    
    try:
        # Step 1: Create self-extracting Python installer
        installer_py = create_self_extracting_exe()
        
        # Step 2: Convert to executable
        if create_exe_from_python():
            print("\\n🎊 Complete! Your BEAR AI installer is ready!")
            print("\\nFiles created:")
            print("  • BEAR_AI_Windows_Installer.exe - Main installer")
            print("  • BEAR_AI_SelfExtractor.py - Python source")
            print("\\n📬 Distribution:")
            print("  Share the .exe file with users")
            print("  No additional files needed!")
            return True
        else:
            print("\\n⚠️  Executable creation failed, but Python installer available")
            print(f"  Users can run: python BEAR_AI_SelfExtractor.py")
            return True
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import subprocess
    success = main()
    input(f"\\nPress Enter to exit... {'(Success)' if success else '(Failed)'}")