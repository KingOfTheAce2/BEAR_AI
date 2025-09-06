#!/usr/bin/env python3
"""
BEAR AI Package Verification Script
Tests installation, imports, and console scripts functionality
"""

import subprocess
import sys
import os
import importlib
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


def test_basic_imports():
    """Test basic module imports"""
    print("🧪 Testing basic imports...")
    
    tests = [
        ("import bear_ai", "Core module import"),
        ("import bear_ai.gui", "GUI module import"),
        ("from bear_ai import __version__", "Version import"),
        ("print(bear_ai.__version__)", "Version display"),
    ]
    
    for test_code, description in tests:
        try:
            exec(test_code)
            print(f"  ✅ {description}")
        except Exception as e:
            print(f"  ❌ {description}: {e}")
            return False
    
    return True


def test_module_execution():
    """Test python -m execution"""
    print("\n🧪 Testing module execution...")
    
    tests = [
        ("python -m bear_ai --help", "Main module help"),
        ("python -c \"import bear_ai.gui; print('GUI module accessible')\"", "GUI module accessibility"),
    ]
    
    success = True
    for cmd, description in tests:
        ok, stdout, stderr = run_command(cmd)
        if ok:
            print(f"  ✅ {description}")
        else:
            print(f"  ❌ {description}: {stderr}")
            success = False
    
    return success


def test_console_scripts():
    """Test console script installation"""
    print("\n🧪 Testing console scripts...")
    
    scripts = [
        ("bear-ai", "Main CLI script"),
        ("bear-ai-gui", "GUI launcher script"),  
        ("bear-ai-chat", "Chat interface script"),
        ("bear-ai-scrub", "PII scrubbing script"),
        ("bear-ai-setup", "Setup script"),
    ]
    
    success = True
    for script, description in scripts:
        # Test if script exists and is executable
        ok, stdout, stderr = run_command(f"{script} --help", check=False)
        if ok:
            print(f"  ✅ {description} working")
        else:
            print(f"  ❌ {script} not found or not working")
            success = False
    
    return success


def test_package_installation():
    """Test package installation status"""
    print("\n🧪 Testing package installation...")
    
    ok, stdout, stderr = run_command("pip show bear-ai")
    if ok:
        print("  ✅ Package installed correctly")
        print(f"  📦 Package info:")
        for line in stdout.split('\n')[:5]:  # Show first 5 lines
            if line.strip():
                print(f"      {line}")
        return True
    else:
        print("  ❌ Package not found in pip")
        return False


def test_development_install():
    """Test development installation"""
    print("\n🧪 Testing development installation...")
    
    # Check if package is installed in development mode
    ok, stdout, stderr = run_command("pip list --editable")
    if "bear-ai" in stdout:
        print("  ✅ Development installation detected")
        return True
    else:
        print("  ⚠️  Not a development installation (may be ok)")
        return True  # Not necessarily an error


def test_gui_module_structure():
    """Test GUI module structure"""
    print("\n🧪 Testing GUI module structure...")
    
    try:
        import bear_ai.gui
        if hasattr(bear_ai.gui, 'main'):
            print("  ✅ GUI main function available")
        else:
            print("  ❌ GUI main function not found")
            return False
            
        if hasattr(bear_ai.gui, 'BearAIDesktopApp'):
            print("  ✅ Desktop app class available")
        else:
            print("  ⚠️  Desktop app class not found (may be ok)")
            
        return True
    except Exception as e:
        print(f"  ❌ GUI module structure test failed: {e}")
        return False


def test_file_structure():
    """Test file structure"""
    print("\n🧪 Testing file structure...")
    
    required_files = [
        "src/bear_ai/__init__.py",
        "src/bear_ai/__main__.py", 
        "src/bear_ai/gui/__init__.py",
        "setup.py",
    ]
    
    success = True
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"  ✅ {file_path} exists")
        else:
            print(f"  ❌ {file_path} missing")
            success = False
    
    return success


def run_smoke_tests():
    """Run all smoke tests"""
    print("🚀 Running BEAR AI Package Verification\n")
    
    tests = [
        ("File Structure", test_file_structure),
        ("Package Installation", test_package_installation),
        ("Development Install", test_development_install),
        ("Basic Imports", test_basic_imports),
        ("Module Execution", test_module_execution),
        ("Console Scripts", test_console_scripts),
        ("GUI Module Structure", test_gui_module_structure),
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"  💥 {test_name} crashed: {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "="*50)
    print("📊 VERIFICATION SUMMARY")
    print("="*50)
    
    passed = 0
    total = len(results)
    
    for test_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name:.<30} {status}")
        if success:
            passed += 1
    
    print(f"\nResult: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Package is ready to use.")
        return True
    else:
        print("⚠️  Some tests failed. Check output above.")
        return False


if __name__ == "__main__":
    success = run_smoke_tests()
    sys.exit(0 if success else 1)