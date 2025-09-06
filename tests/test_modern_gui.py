#!/usr/bin/env python3
"""
Test the modern GUI with PII scrubbing integration
"""

import sys
import os

# Add src and parent directory to path for imports
parent_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, parent_dir)
sys.path.insert(0, os.path.join(parent_dir, 'src'))

def test_pii_scrubber():
    """Test PII scrubber functionality"""
    print("Testing PII Scrubber...")
    
    try:
        from modern_gui import PIIScrubber
        
        scrubber = PIIScrubber()
        
        # Test cases
        test_messages = [
            "My SSN is 123-45-6789 and email is john.doe@example.com",
            "Call me at (555) 123-4567 or visit 123 Main Street",
            "My credit card is 4532-1234-5678-9012",
            "Server IP is 192.168.1.100",
            "This is a clean message with no PII"
        ]
        
        print("\nTest Results:")
        for i, message in enumerate(test_messages, 1):
            # scrub_text returns tuple: (cleaned_text, has_pii, detected_types)
            cleaned_text, has_pii, detected_types = scrubber.scrub_text(message)
            print(f"\n{i}. Original: {message}")
            print(f"   Scrubbed: {cleaned_text}")
            print(f"   Clean: {not has_pii}")
            if detected_types:
                print(f"   Detected: {', '.join(detected_types)}")
                
        print("\nPII Scrubber test completed successfully!")
        return True
        
    except Exception as e:
        print(f"PII Scrubber test failed: {e}")
        return False

def test_gui_import():
    """Test GUI import and basic functionality"""
    print("\nTesting GUI Import...")
    
    try:
        from modern_gui import ModernBEARAI
        print("Modern GUI imported successfully")
        
        # Test customtkinter availability
        try:
            import customtkinter
            print("CustomTkinter available - Modern styling enabled")
        except ImportError:
            print("CustomTkinter not available - Fallback to standard tkinter")
        
        print("GUI ready to launch")
        return True
        
    except Exception as e:
        print(f"GUI import failed: {e}")
        return False

def main():
    """Run all tests"""
    print("BEAR AI Modern GUI Test Suite")
    print("=" * 40)
    
    # Test PII scrubber
    pii_ok = test_pii_scrubber()
    
    # Test GUI import
    gui_ok = test_gui_import()
    
    print("\n" + "=" * 40)
    if pii_ok and gui_ok:
        print("All tests passed! Modern GUI is ready.")
        print("\nTo launch the modern GUI:")
        print("   - Double-click: run.bat")
        print("   - Or run: python modern_gui.py")
    else:
        print("Some tests failed. Check the errors above.")
    
    print("\nPrivacy Features:")
    print("   - Automatic PII detection and scrubbing")
    print("   - Real-time privacy protection warnings")
    print("   - Toggle controls for privacy settings")
    print("   - No separate PII tool needed - built-in!")
    
    return pii_ok and gui_ok

if __name__ == "__main__":
    main()