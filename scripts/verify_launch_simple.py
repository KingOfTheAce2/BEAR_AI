#!/usr/bin/env python3
"""
Simple BEAR AI Launch Verification Script
Tests basic functionality without Unicode characters (Windows CP1252 compatible)
"""

import subprocess
import sys
import os
from pathlib import Path


def run_command(cmd, check=True, capture_output=True):
    """Run a command and return result"""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            check=check, 
            capture_output=capture_output, 
            text=True
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.CalledProcessError as e:
        return False, e.stdout, e.stderr


def test_basic_import():
    """Test basic bear_ai import"""
    print("Testing basic import...")
    try:
        import bear_ai
        print(f"  PASS - bear_ai imported successfully")
        print(f"  Version: {getattr(bear_ai, '__version__', 'unknown')}")
        return True
    except Exception as e:
        print(f"  FAIL - bear_ai import failed: {e}")
        return False


def test_package_installation():
    """Test pip installation status"""
    print("\nTesting package installation...")
    
    ok, stdout, stderr = run_command("pip show bear-ai")
    if ok:
        print("  PASS - Package found in pip")
        for line in stdout.split('\n')[:6]:  # Show key info
            if line.strip() and any(key in line for key in ['Name:', 'Version:', 'Location:']):
                print(f"    {line}")
        return True
    else:
        print("  FAIL - Package not found")
        return False


def test_module_structure():
    """Test module structure without importing problematic modules"""
    print("\nTesting module structure...")
    
    files_to_check = [
        "src/bear_ai/__init__.py",
        "src/bear_ai/__main__.py",
        "src/bear_ai/gui/__init__.py",
        "setup.py"
    ]
    
    success = True
    for file_path in files_to_check:
        if Path(file_path).exists():
            print(f"  PASS - {file_path}")
        else:
            print(f"  FAIL - {file_path} missing")
            success = False
    
    return success


def test_console_scripts_installation():
    """Test if console scripts were installed"""
    print("\nTesting console script installation...")
    
    # Check if scripts directory exists
    import bear_ai
    import pkg_resources
    
    try:
        dist = pkg_resources.get_distribution('bear-ai')
        print(f"  Package location: {dist.location}")
        
        # Try to find entry points
        entry_points = dist.get_entry_map().get('console_scripts', {})
        if entry_points:
            print("  Console scripts found:")
            for name in entry_points:
                print(f"    - {name}")
        else:
            print("  No console scripts found")
        
        return True
    except Exception as e:
        print(f"  Could not check entry points: {e}")
        return False


def test_basic_functionality():
    """Test basic functionality without full imports"""
    print("\nTesting basic functionality...")
    
    # Test version access
    try:
        import bear_ai
        version = getattr(bear_ai, '__version__', None)
        if version:
            print(f"  PASS - Version accessible: {version}")
        else:
            print("  WARN - Version not found")
        return True
    except Exception as e:
        print(f"  FAIL - Basic functionality test: {e}")
        return False


def main():
    """Run verification tests"""
    print("=" * 60)
    print("BEAR AI Launch Verification (Simple)")
    print("=" * 60)
    
    tests = [
        ("Package Installation", test_package_installation),
        ("Module Structure", test_module_structure),
        ("Basic Import", test_basic_import),
        ("Console Scripts", test_console_scripts_installation),
        ("Basic Functionality", test_basic_functionality)
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"  ERROR - {test_name} crashed: {e}")
            results[test_name] = False
    
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, success in results.items():
        status = "PASS" if success else "FAIL"
        print(f"{test_name:.<40} {status}")
        if success:
            passed += 1
    
    print(f"\nResult: {passed}/{total} tests passed")
    
    if passed == total:
        print("SUCCESS: All basic tests passed!")
        print("\nNext steps:")
        print("1. Try: python -c \"import bear_ai\"")
        print("2. Try: python -m bear_ai --help")
        print("3. Check console scripts are on PATH")
    else:
        print("WARNING: Some tests failed")
        print("This may indicate import or configuration issues")
    
    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)