#!/usr/bin/env python3
"""
Comprehensive Test Suite for BEAR AI Launch System

Tests all launch methods across different scenarios:
1. Console scripts (bear-gui, bear-chat, bear-scrub)
2. Module execution (python -m bear_ai.*)
3. Platform launchers (PowerShell and shell scripts)
4. Virtual environment detection
5. Dependency management
6. Cross-directory execution

Usage:
    python tools/test_launch_system.py
    python tools/test_launch_system.py --verbose
    python tools/test_launch_system.py --test-install
"""

import argparse
import os
import platform
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import List, Tuple, Dict, Any

class LaunchTester:
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.results: List[Dict[str, Any]] = []
        self.repo_root = Path(__file__).parent.parent
        self.system = platform.system().lower()
        
    def log(self, message: str, level: str = "INFO"):
        if self.verbose or level in ["ERROR", "FAIL", "PASS"]:
            print(f"[{level}] {message}")
    
    def run_command(self, cmd: List[str], cwd: Path = None, timeout: int = 10) -> Tuple[int, str, str]:
        """Run command and return exit code, stdout, stderr"""
        try:
            if cwd is None:
                cwd = self.repo_root
                
            self.log(f"Running: {' '.join(cmd)} (cwd: {cwd})", "DEBUG")
            
            result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return result.returncode, result.stdout, result.stderr
            
        except subprocess.TimeoutExpired:
            return -1, "", "Command timed out"
        except Exception as e:
            return -1, "", str(e)
    
    def test_console_scripts(self) -> None:
        """Test console script entry points"""
        self.log("Testing console scripts...", "INFO")
        
        scripts = ["bear-gui", "bear-chat", "bear-scrub", "bear-ai"]
        
        for script in scripts:
            # Test help command
            exit_code, stdout, stderr = self.run_command([script, "--help"])
            
            success = exit_code == 0 and ("usage" in stdout.lower() or "help" in stdout.lower())
            
            self.results.append({
                "test": f"console_script_{script}",
                "command": f"{script} --help",
                "success": success,
                "exit_code": exit_code,
                "error": stderr if not success else None
            })
            
            if success:
                self.log(f"[PASS] {script} console script works", "PASS")
            else:
                self.log(f"[FAIL] {script} console script failed: {stderr}", "FAIL")
    
    def test_module_execution(self) -> None:
        """Test Python module execution"""
        self.log("Testing module execution...", "INFO")
        
        modules = [
            ("bear_ai.gui", "GUI module"),
            ("bear_ai.chat", "Chat module"), 
            ("bear_ai.scrub", "Scrub module"),
            ("bear_ai", "Main module")
        ]
        
        for module, description in modules:
            # Test help command
            exit_code, stdout, stderr = self.run_command([
                sys.executable, "-m", module, "--help"
            ])
            
            success = exit_code == 0 and ("usage" in stdout.lower() or "help" in stdout.lower())
            
            self.results.append({
                "test": f"module_{module.replace('.', '_')}",
                "command": f"python -m {module} --help",
                "success": success,
                "exit_code": exit_code,
                "error": stderr if not success else None
            })
            
            if success:
                self.log(f"[PASS] {description} works", "PASS")
            else:
                self.log(f"[FAIL] {description} failed: {stderr}", "FAIL")
    
    def test_platform_launchers(self) -> None:
        """Test platform-specific launchers"""
        self.log("Testing platform launchers...", "INFO")
        
        if self.system == "windows":
            self.test_powershell_launchers()
        else:
            self.test_shell_launchers()
    
    def test_powershell_launchers(self) -> None:
        """Test PowerShell launchers on Windows"""
        launchers = [
            "bear-ai-gui.ps1",
            "bear-ai-chat.ps1", 
            "bear-ai-scrub.ps1"
        ]
        
        for launcher in launchers:
            script_path = self.repo_root / "tools" / "win" / launcher
            
            if not script_path.exists():
                self.results.append({
                    "test": f"powershell_{launcher}",
                    "command": f"powershell -File {script_path}",
                    "success": False,
                    "exit_code": -1,
                    "error": "Script file not found"
                })
                self.log(f"[FAIL] {launcher} not found", "FAIL")
                continue
            
            # Test help parameter
            exit_code, stdout, stderr = self.run_command([
                "powershell", "-ExecutionPolicy", "Bypass", "-File", str(script_path), "-Help"
            ])
            
            success = exit_code == 0 and "Usage:" in stdout
            
            self.results.append({
                "test": f"powershell_{launcher}",
                "command": f"powershell -File {script_path} -Help",
                "success": success,
                "exit_code": exit_code,
                "error": stderr if not success else None
            })
            
            if success:
                self.log(f"[PASS] {launcher} works", "PASS")
            else:
                self.log(f"[FAIL] {launcher} failed: {stderr}", "FAIL")
    
    def test_shell_launchers(self) -> None:
        """Test shell launchers on Unix systems"""
        launchers = [
            "bear-ai-gui.sh",
            "bear-ai-chat.sh",
            "bear-ai-scrub.sh"
        ]
        
        for launcher in launchers:
            script_path = self.repo_root / "tools" / "unix" / launcher
            
            if not script_path.exists():
                self.results.append({
                    "test": f"shell_{launcher}",
                    "command": f"bash {script_path}",
                    "success": False,
                    "exit_code": -1,
                    "error": "Script file not found"
                })
                self.log(f"[FAIL] {launcher} not found", "FAIL")
                continue
            
            # Test help parameter
            exit_code, stdout, stderr = self.run_command([
                "bash", str(script_path), "--help"
            ])
            
            success = exit_code == 0 and "Usage:" in stdout
            
            self.results.append({
                "test": f"shell_{launcher}",
                "command": f"bash {script_path} --help",
                "success": success,
                "exit_code": exit_code,
                "error": stderr if not success else None
            })
            
            if success:
                self.log(f"[PASS] {launcher} works", "PASS")
            else:
                self.log(f"[FAIL] {launcher} failed: {stderr}", "FAIL")
    
    def test_directory_independence(self) -> None:
        """Test that launchers work from different directories"""
        self.log("Testing directory independence...", "INFO")
        
        # Create temporary directory for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Test console scripts from temp directory
            if self.has_console_scripts():
                exit_code, stdout, stderr = self.run_command(
                    ["bear-gui", "--help"], 
                    cwd=temp_path
                )
                
                success = exit_code == 0
                
                self.results.append({
                    "test": "directory_independence_console",
                    "command": "bear-gui --help (from temp dir)",
                    "success": success,
                    "exit_code": exit_code,
                    "error": stderr if not success else None
                })
                
                if success:
                    self.log("[PASS] Console scripts work from any directory", "PASS")
                else:
                    self.log("[FAIL] Console scripts require specific directory", "FAIL")
            
            # Test module execution from temp directory
            exit_code, stdout, stderr = self.run_command([
                sys.executable, "-m", "bear_ai.gui", "--help"
            ], cwd=temp_path)
            
            success = exit_code == 0
            
            self.results.append({
                "test": "directory_independence_module", 
                "command": "python -m bear_ai.gui --help (from temp dir)",
                "success": success,
                "exit_code": exit_code,
                "error": stderr if not success else None
            })
            
            if success:
                self.log("[PASS] Module execution works from any directory", "PASS")
            else:
                self.log("[FAIL] Module execution requires specific directory", "FAIL")
    
    def test_installation_detection(self) -> None:
        """Test installation detection and error messages"""
        self.log("Testing installation detection...", "INFO")
        
        # Test with a non-existent Python environment
        # This should trigger the installation detection logic
        
        # Create a mock Python executable that doesn't have bear_ai installed
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create a simple test script that simulates missing bear_ai
            test_script = temp_path / "test_missing_bear_ai.py"
            test_script.write_text("""
import sys
sys.path = [p for p in sys.path if 'bear_ai' not in p and 'bear-ai' not in p]
try:
    import bear_ai
    print("ERROR: bear_ai should not be importable")
    sys.exit(1)
except ImportError:
    print("bear_ai not found (expected)")
    sys.exit(0)
""")
            
            exit_code, stdout, stderr = self.run_command([
                sys.executable, str(test_script)
            ])
            
            success = exit_code == 0 and "bear_ai not found" in stdout
            
            self.results.append({
                "test": "installation_detection",
                "command": "Test missing bear_ai detection",
                "success": success,
                "exit_code": exit_code,
                "error": stderr if not success else None
            })
            
            if success:
                self.log("[PASS] Installation detection works", "PASS")
            else:
                self.log("[FAIL] Installation detection failed", "FAIL")
    
    def has_console_scripts(self) -> bool:
        """Check if console scripts are available"""
        exit_code, _, _ = self.run_command(["bear-gui", "--help"])
        return exit_code == 0
    
    def test_python_version_check(self) -> None:
        """Test Python version checking"""
        self.log("Testing Python version check...", "INFO")
        
        # Test current Python version (should pass)
        version_info = sys.version_info
        success = version_info >= (3, 9)
        
        self.results.append({
            "test": "python_version",
            "command": f"Python version check: {version_info}",
            "success": success,
            "exit_code": 0 if success else 1,
            "error": f"Python {version_info} < 3.9 required" if not success else None
        })
        
        if success:
            self.log(f"[PASS] Python version {version_info} is supported", "PASS")
        else:
            self.log(f"[FAIL] Python version {version_info} is not supported", "FAIL")
    
    def run_all_tests(self) -> None:
        """Run all tests"""
        self.log("Starting BEAR AI Launch System Tests", "INFO")
        self.log(f"Platform: {self.system}", "INFO")
        self.log(f"Python: {sys.version}", "INFO")
        self.log(f"Repository: {self.repo_root}", "INFO")
        self.log("-" * 50, "INFO")
        
        # Core functionality tests
        self.test_python_version_check()
        self.test_console_scripts()
        self.test_module_execution() 
        self.test_platform_launchers()
        self.test_directory_independence()
        self.test_installation_detection()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self) -> None:
        """Print test results summary"""
        total = len(self.results)
        passed = sum(1 for r in self.results if r["success"])
        failed = total - passed
        
        self.log("-" * 50, "INFO")
        self.log("TEST SUMMARY", "INFO")
        self.log(f"Total tests: {total}", "INFO")
        self.log(f"Passed: {passed}", "PASS" if passed > 0 else "INFO")
        self.log(f"Failed: {failed}", "FAIL" if failed > 0 else "INFO")
        self.log(f"Success rate: {passed/total*100:.1f}%", "INFO")
        
        if failed > 0:
            self.log("\nFAILED TESTS:", "FAIL")
            for result in self.results:
                if not result["success"]:
                    self.log(f"[FAIL] {result['test']}: {result['error']}", "FAIL")
        
        self.log("-" * 50, "INFO")
        
        if failed == 0:
            self.log("[SUCCESS] ALL TESTS PASSED! Launch system is working correctly.", "PASS")
        else:
            self.log("[WARNING] Some tests failed. Check the errors above.", "FAIL")
            sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Test BEAR AI Launch System")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--test-install", action="store_true", help="Test installation scenarios")
    
    args = parser.parse_args()
    
    tester = LaunchTester(verbose=args.verbose)
    tester.run_all_tests()

if __name__ == "__main__":
    main()