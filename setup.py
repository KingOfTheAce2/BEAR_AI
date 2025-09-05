"""
BEAR AI Setup Script
Easy installation and configuration for non-technical users
"""

from setuptools import setup, find_packages
from pathlib import Path
import sys

# Read version from __init__.py
def get_version():
    init_file = Path(__file__).parent / "src" / "bear_ai" / "__init__.py"
    try:
        with open(init_file, 'r') as f:
            for line in f:
                if line.startswith('__version__'):
                    return line.split('=')[1].strip().strip('"\'')
    except FileNotFoundError:
        pass
    return "0.1.0-alpha"

# Read README for long description
def get_long_description():
    readme_file = Path(__file__).parent / "README.md"
    if readme_file.exists():
        with open(readme_file, 'r', encoding='utf-8') as f:
            return f.read()
    return ""

# Check Python version
if sys.version_info < (3, 9):
    print("ERROR: BEAR AI requires Python 3.9 or later")
    print(f"You are using Python {sys.version}")
    sys.exit(1)

# Define package requirements
install_requires = [
    "huggingface_hub>=0.24.0",
    "tqdm>=4.66.0",
    "Pillow>=10.0.0",
    "requests>=2.31.0",
    "numpy>=1.24.0",
    "click>=8.0.0",
    "rich>=13.0.0",
    "typer>=0.9.0",
]

# Optional dependencies for different features
extras_require = {
    # Basic AI inference
    "inference": [
        "llama-cpp-python>=0.2.66",
        "torch>=2.0.0",
        "transformers>=4.30.0",
    ],
    
    # Multi-modal support
    "multimodal": [
        "sentence-transformers>=2.2.0",
        "Pillow>=10.0.0",
        "opencv-python>=4.8.0",
        "pytesseract>=0.3.10",
        "whisper-openai>=20231117",
        "librosa>=0.10.0",
        "mutagen>=1.47.0",
        "pypdf>=3.0.0",
        "python-docx>=1.0.0",
        "beautifulsoup4>=4.12.0",
    ],
    
    # RAG and vector search
    "rag": [
        "chromadb>=0.4.0",
        "sentence-transformers>=2.2.0",
        "faiss-cpu>=1.7.0",
    ],
    
    # PII detection and privacy
    "privacy": [
        "presidio-analyzer>=2.2.0",
        "presidio-anonymizer>=2.2.0",
        "spacy>=3.6.0",
        "spacy-transformers>=1.2.0",
    ],
    
    # Hardware monitoring
    "hardware": [
        "psutil>=5.9.0",
        "nvidia-ml-py>=11.495.46",
        "GPUtil>=1.4.0",
    ],
    
    # Development tools
    "dev": [
        "pytest>=7.0.0",
        "pytest-asyncio>=0.21.0",
        "black>=23.0.0",
        "isort>=5.12.0",
        "flake8>=6.0.0",
        "mypy>=1.4.0",
        "pre-commit>=3.0.0",
    ],
    
    # GUI interface
    "gui": [
        "tkinter-tooltip>=2.0.0",
        "customtkinter>=5.2.0",
        "matplotlib>=3.7.0",
        "plotly>=5.15.0",
    ],
    
    # All features (excluding dev)
    "all": [
        # Combine all feature sets except dev
        "llama-cpp-python>=0.2.66",
        "torch>=2.0.0", 
        "transformers>=4.30.0",
        "sentence-transformers>=2.2.0",
        "opencv-python>=4.8.0",
        "pytesseract>=0.3.10",
        "whisper-openai>=20231117",
        "librosa>=0.10.0",
        "chromadb>=0.4.0",
        "presidio-analyzer>=2.2.0",
        "presidio-anonymizer>=2.2.0",
        "spacy>=3.6.0",
        "psutil>=5.9.0",
        "tkinter-tooltip>=2.0.0",
        "customtkinter>=5.2.0",
    ]
}

setup(
    name="bear-ai",
    version=get_version(),
    description="BEAR AI: Privacy-First, Local-Only AI - Bridge for Expertise, Audit and Research",
    long_description=get_long_description(),
    long_description_content_type="text/markdown",
    author="BEAR AI Contributors",
    author_email="contributors@bear-ai.org",
    url="https://github.com/bear-ai/bear-ai",
    project_urls={
        "Bug Reports": "https://github.com/bear-ai/bear-ai/issues",
        "Source": "https://github.com/bear-ai/bear-ai",
        "Documentation": "https://docs.bear-ai.org",
    },
    
    # Package configuration
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    include_package_data=True,
    
    # Requirements
    python_requires=">=3.9",
    install_requires=install_requires,
    extras_require=extras_require,
    
    # Entry points for CLI
    entry_points={
        "console_scripts": [
            "bear-ai=bear_ai.__main__:main",
            "bear-scrub=bear_ai.scrub:main",
            "bear-chat=bear_ai.chat:main",
            "bear-setup=bear_ai.setup:main",
            "bear-gui=bear_ai.gui:main",
        ],
    },
    
    # Package data
    package_data={
        "bear_ai": [
            "data/*",
            "templates/*",
            "models/*",
            "static/*",
            "config/*",
        ],
    },
    
    # Classifiers
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "Intended Audience :: End Users/Desktop",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Operating System :: OS Independent",
        "Environment :: Console",
        "Environment :: X11 Applications",
        "Environment :: Win32 (MS Windows)",
        "Environment :: MacOS X",
    ],
    
    # Keywords for discovery
    keywords=[
        "ai", "artificial-intelligence", "machine-learning", "llm", "local-ai",
        "privacy", "security", "nlp", "multimodal", "rag", "vector-search",
        "chat", "conversation", "assistant", "bear-ai"
    ],
    
    # Zip safe
    zip_safe=False,
    
    # Additional metadata
    license="MIT",
    platforms=["any"],
)

# Post-install hooks
def post_install():
    """Run post-installation setup"""
    try:
        import bear_ai.setup as setup_module
        setup_module.run_post_install()
    except ImportError:
        print("Warning: Could not run post-installation setup")
        print("Please run 'bear-setup' manually after installation")

if __name__ == "__main__":
    # Run setup
    setup()
    
    # Run post-install if this is an install command
    if "install" in sys.argv:
        post_install()