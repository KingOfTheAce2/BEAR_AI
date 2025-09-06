#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Robust GUI Launcher with UTF-8 Encoding Support
Handles Unicode characters properly across different Windows configurations
"""

import sys
import os
import codecs
from pathlib import Path

def launch_gui_with_encoding(gui_file):
    """Launch a GUI file with proper UTF-8 encoding handling"""
    try:
        # Ensure we're in the correct directory
        root_dir = Path(__file__).parent.parent
        os.chdir(root_dir)
        
        # Check if the GUI file exists
        gui_path = Path(gui_file)
        if not gui_path.exists():
            print(f"Error: GUI file not found: {gui_file}")
            return False
        
        print(f"Launching {gui_file} with UTF-8 encoding support...")
        
        # Read the file with explicit UTF-8 encoding
        with codecs.open(gui_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Set up proper environment for GUI execution
        sys.path.insert(0, str(root_dir))
        sys.path.insert(0, str(root_dir / 'src'))
        
        # Execute the GUI with proper encoding context
        globals_dict = {
            '__file__': str(gui_path.absolute()),
            '__name__': '__main__',
        }
        
        exec(content, globals_dict)
        return True
        
    except UnicodeDecodeError as e:
        print(f"Unicode encoding error: {e}")
        print("The GUI file contains characters that cannot be decoded.")
        print("Please ensure the file is saved with UTF-8 encoding.")
        return False
    except Exception as e:
        print(f"Error launching GUI: {e}")
        return False

def main():
    """Main launcher function"""
    if len(sys.argv) != 2:
        print("Usage: python launch_gui.py <gui_file>")
        print("Available GUI files:")
        print("  - gui_launcher.py (Main launcher)")
        print("  - simple_gui.py (Basic interface)")
        print("  - modern_gui.py (Modern interface)")
        print("  - src/bear_ai/professional_gui.py (Professional interface)")
        return
    
    gui_file = sys.argv[1]
    success = launch_gui_with_encoding(gui_file)
    
    if not success:
        print("\nTroubleshooting steps:")
        print("1. Ensure the GUI file exists and is properly formatted")
        print("2. Check that the file is saved with UTF-8 encoding")
        print("3. Verify all dependencies are installed")
        print("4. Try running the GUI file directly with: python -X utf8 <gui_file>")

if __name__ == "__main__":
    main()