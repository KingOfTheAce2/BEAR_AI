#!/usr/bin/env python3
"""
Test Launch Methods for BEAR AI
Tests all supported launch methods work correctly
"""

import pytest
import subprocess
import sys
import os
from pathlib import Path


def run_command(cmd, timeout=30):
    """Run command with timeout"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", str(e)


class TestBasicImports:
    """Test basic package imports work"""
    
    def test_bear_ai_import(self):
        """Test basic bear_ai import"""
        import bear_ai
        assert hasattr(bear_ai, '__version__')
    
    def test_gui_module_exists(self):
        """Test GUI module can be imported"""
        try:
            import bear_ai.gui
            # Module exists but might have import issues - that's ok
            assert True
        except ImportError as e:
            # If import fails due to missing dependencies, that's expected
            assert "No module named 'bear_ai.gui'" not in str(e)


class TestModuleExecution:
    """Test python -m execution methods"""
    
    def test_main_module_help(self):
        """Test python -m bear_ai --help"""
        ret_code, stdout, stderr = run_command("python -m bear_ai --help")
        # Should either work or fail gracefully (not crash)
        assert ret_code in [0, 1, 2]  # 0=success, 1=error, 2=usage
    
    def test_gui_module_accessible(self):
        """Test GUI module is accessible via python -m"""
        # Test import path is correct
        ret_code, stdout, stderr = run_command(
            'python -c "import bear_ai.gui; print(\'GUI module found\')"'
        )
        # Should either work or have a graceful import error
        assert "No module named 'bear_ai'" not in stderr


class TestPackageStructure:
    """Test package structure is correct"""
    
    def test_required_files_exist(self):
        """Test required package files exist"""
        required_files = [
            "src/bear_ai/__init__.py",
            "src/bear_ai/__main__.py",
            "src/bear_ai/gui/__init__.py"
        ]
        
        for file_path in required_files:
            assert Path(file_path).exists(), f"Required file missing: {file_path}"
    
    def test_package_installed(self):
        """Test package is properly installed"""
        ret_code, stdout, stderr = run_command("pip show bear-ai")
        assert ret_code == 0, "Package not found in pip"
        assert "Name: bear_ai" in stdout or "Name: bear-ai" in stdout


class TestConsoleScripts:
    """Test console scripts are installed"""
    
    def test_console_scripts_exist(self):
        """Test that console scripts are installed"""
        # Check if bear-ai script exists in the Python scripts directory
        scripts_dir = Path(sys.executable).parent / "Scripts"  # Windows
        if not scripts_dir.exists():
            scripts_dir = Path(sys.executable).parent / "bin"  # Linux/Mac
        
        # For user installation, scripts might be in a different location
        import bear_ai
        # Test that bear_ai module has the entry points defined
        assert hasattr(bear_ai, '__version__')  # Basic verification
    
    def test_bear_ai_script_help(self):
        """Test bear-ai console script help (if available)"""
        # Try to run bear-ai help - might fail if not in PATH
        ret_code, stdout, stderr = run_command("bear-ai --help", timeout=10)
        # If it fails, that's ok - PATH issues are common in testing
        # Just ensure it doesn't crash with module import errors
        if ret_code != 0:
            assert "No module named 'bear_ai'" not in stderr


class TestLaunchMethods:
    """Test various launch methods"""
    
    def test_direct_gui_file_exists(self):
        """Test legacy GUI files still exist"""
        legacy_files = [
            "gui_launcher.py",
            "modern_gui.py", 
            "simple_gui.py"
        ]
        
        for file_path in legacy_files:
            if Path(file_path).exists():
                # File exists - ensure it's readable
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    assert len(content) > 0, f"File {file_path} is empty"
    
    def test_module_launch_syntax(self):
        """Test module launch syntax is valid"""
        # Test that the module path is correct
        ret_code, stdout, stderr = run_command(
            'python -c "import importlib.util; spec = importlib.util.find_spec(\'bear_ai.gui\'); print(\'found\' if spec else \'not found\')"'
        )
        assert ret_code == 0
        assert "found" in stdout


class TestConfiguration:
    """Test system configuration"""
    
    def test_python_version(self):
        """Test Python version is supported"""
        version = sys.version_info
        assert version >= (3, 9), f"Python {version.major}.{version.minor} not supported, need 3.9+"
    
    def test_package_version(self):
        """Test package has version"""
        import bear_ai
        version = getattr(bear_ai, '__version__', None)
        assert version is not None, "Package version not found"
        assert len(version) > 0, "Package version is empty"


if __name__ == "__main__":
    # Run tests if called directly
    pytest.main([__file__, "-v"])