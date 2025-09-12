#!/usr/bin/env python3
"""
BEAR AI Windows Installer Setup
Creates a Windows executable installer for BEAR AI Legal Assistant
"""

from setuptools import setup, find_packages
import os
import sys
from pathlib import Path

# Read requirements
def read_requirements():
    req_path = Path(__file__).parent.parent / "requirements.txt"
    with open(req_path, 'r') as f:
        return [line.strip() for line in f if line.strip() and not line.startswith('#')]

# Read version from package
def get_version():
    version_file = Path(__file__).parent.parent / "src" / "bear_ai" / "__init__.py"
    if version_file.exists():
        with open(version_file, 'r') as f:
            for line in f:
                if line.startswith('__version__'):
                    return line.split('=')[1].strip().strip('"\'')
    return "1.0.0"

setup(
    name="bear-ai-installer",
    version=get_version(),
    description="BEAR AI Legal Assistant - Windows Installer",
    long_description="Privacy-First, Local-Only AI Legal Assistant with comprehensive document analysis capabilities",
    author="BEAR AI Team",
    license="PROPRIETARY",
    
    # Package configuration
    packages=find_packages(where="../src"),
    package_dir={"": "../src"},
    
    # Dependencies
    install_requires=read_requirements(),
    
    # Entry points
    entry_points={
        'console_scripts': [
            'bear-ai=bear_ai.__main__:main',
        ],
    },
    
    # Data files to include
    package_data={
        'bear_ai': [
            'templates/*.py',
            'templates/*.json', 
            'config/*.json',
            'config/*.yaml',
        ],
    },
    
    # Additional data files
    data_files=[
        ('config', ['../config/default.json'] if os.path.exists('../config/default.json') else []),
        ('docs', ['../README.md'] if os.path.exists('../README.md') else []),
    ],
    
    # Classifiers
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Legal Industry",
        "License :: Other/Proprietary License",
        "Operating System :: Microsoft :: Windows",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Office/Business :: Financial :: Accounting",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    
    # Python version requirement
    python_requires=">=3.8",
    
    # Additional options for PyInstaller
    options={
        'build_exe': {
            'packages': ['bear_ai'],
            'include_files': [
                ('../src', 'src'),
                ('../config', 'config') if os.path.exists('../config') else None,
                ('../requirements.txt', 'requirements.txt'),
            ],
            'excludes': ['tkinter', 'matplotlib', 'jupyter'],
            'optimize': 2,
        }
    }
)