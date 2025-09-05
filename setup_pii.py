"""
Setup script for PII package dependencies

This script installs the required dependencies for the PII package
and downloads the necessary spaCy models for Dutch language support.
"""

import subprocess
import sys
import os

def run_command(command, description=""):
    """Run a command and handle errors."""
    print(f"\n{'='*50}")
    print(f"Running: {description if description else command}")
    print(f"{'='*50}")
    
    try:
        result = subprocess.run(command, shell=True, check=True, 
                              capture_output=True, text=True)
        if result.stdout:
            print("STDOUT:", result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        print(f"SUCCESS: {description if description else 'Command completed'}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: {e}")
        if e.stdout:
            print("STDOUT:", e.stdout)
        if e.stderr:
            print("STDERR:", e.stderr)
        return False

def main():
    """Main setup function."""
    print("Setting up PII package dependencies for BEAR AI")
    
    # Check Python version
    python_version = sys.version_info
    print(f"Python version: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    if python_version < (3, 8):
        print("Error: Python 3.8 or higher is required for Presidio")
        return False
    
    # Install core PII dependencies
    dependencies = [
        "presidio-analyzer>=2.2.33",
        "presidio-anonymizer>=2.2.33", 
        "spacy>=3.4.0",
        "transformers>=4.21.0"
    ]
    
    success = True
    
    for dep in dependencies:
        if not run_command(f"pip install {dep}", f"Installing {dep}"):
            success = False
            print(f"Warning: Failed to install {dep}, continuing with others...")
    
    if not success:
        print("\nSome dependencies failed to install. The PII system may not work properly.")
        print("You can try installing them manually:")
        for dep in dependencies:
            print(f"  pip install {dep}")
    
    # Try to download Dutch spaCy model
    print(f"\n{'='*50}")
    print("Downloading Dutch spaCy model...")
    print(f"{'='*50}")
    
    # Try different approaches for spaCy model installation
    spacy_commands = [
        "python -m spacy download nl_core_news_lg",
        "python -m spacy download nl_core_news_md",  # Fallback to medium model
        "python -m spacy download nl_core_news_sm"   # Fallback to small model
    ]
    
    spacy_installed = False
    for cmd in spacy_commands:
        if run_command(cmd, f"Downloading spaCy model: {cmd}"):
            spacy_installed = True
            break
    
    if not spacy_installed:
        print("\nWarning: Could not install Dutch spaCy models automatically.")
        print("You can install them manually after spaCy is working:")
        print("  python -m spacy download nl_core_news_lg")
        print("  python -m spacy download nl_core_news_md")
    
    # Test installation
    print(f"\n{'='*50}")
    print("Testing installation...")
    print(f"{'='*50}")
    
    test_script = """
import sys
try:
    import presidio_analyzer
    print(f"OK presidio_analyzer: {presidio_analyzer.__version__}")
except Exception as e:
    print(f"ERROR presidio_analyzer: {e}")

try:
    import presidio_anonymizer
    print(f"OK presidio_anonymizer: {presidio_anonymizer.__version__}")
except Exception as e:
    print(f"ERROR presidio_anonymizer: {e}")

try:
    import spacy
    print(f"OK spacy: {spacy.__version__}")
    
    # Try to load Dutch model
    try:
        nlp = spacy.load("nl_core_news_lg")
        print("OK Dutch large model loaded successfully")
    except OSError:
        try:
            nlp = spacy.load("nl_core_news_md")
            print("OK Dutch medium model loaded successfully")
        except OSError:
            try:
                nlp = spacy.load("nl_core_news_sm")
                print("OK Dutch small model loaded successfully")
            except OSError:
                print("Warning: No Dutch models available")
except Exception as e:
    print(f"ERROR spacy: {e}")

try:
    from src.bear_ai.pii import Scrubber, Policy, Audit
    scrubber = Scrubber()
    if scrubber.is_available():
        print("OK BEAR AI PII system ready")
    else:
        print("Warning: BEAR AI PII system available but Presidio not working")
except Exception as e:
    print(f"ERROR BEAR AI PII system: {e}")
"""
    
    with open("test_pii_installation.py", "w") as f:
        f.write(test_script)
    
    run_command("python test_pii_installation.py", "Testing PII installation")
    
    # Cleanup test file
    try:
        os.remove("test_pii_installation.py")
    except:
        pass
    
    print(f"\n{'='*50}")
    print("Setup Complete!")
    print(f"{'='*50}")
    
    print("\nTo enable PII processing, set these environment variables:")
    print("  PII_ENABLE=true")
    print("  PII_AUDIT=true") 
    print("  PII_SALT=your_random_salt_here")
    print("  PII_AUDIT_DIR=./logs/pii/")
    
    print("\nThe PII system will fallback gracefully if dependencies are missing.")
    
    return True

if __name__ == "__main__":
    main()