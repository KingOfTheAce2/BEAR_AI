#!/usr/bin/env python3
"""
BEAR AI GUI Launcher Encoding Fix
Fixes the UTF-8 encoding issue in gui_launcher.py
"""

import sys
import codecs

def main():
    """Launch gui_launcher.py with proper UTF-8 encoding"""
    try:
        print("🔧 BEAR AI GUI Launcher - UTF-8 Fix")
        print("Launching gui_launcher.py with proper encoding...")
        
        # Read and execute gui_launcher.py with UTF-8 encoding
        with codecs.open('gui_launcher.py', 'r', 'utf-8') as f:
            gui_code = f.read()
        
        # Execute the GUI launcher code
        exec(gui_code)
        
    except FileNotFoundError:
        print("❌ Error: gui_launcher.py not found in current directory")
        print("💡 Make sure you're running this from the BEAR AI root directory")
        input("Press Enter to exit...")
        sys.exit(1)
        
    except Exception as e:
        print(f"❌ Error launching GUI: {e}")
        print("💡 Try running one of these alternatives:")
        print("   - python simple_gui.py")
        print("   - run.bat")
        input("Press Enter to exit...")
        sys.exit(1)

if __name__ == "__main__":
    main()