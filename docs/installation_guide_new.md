# BEAR AI Installation Guide - New Package Structure

## Quick Start (Recommended)

### 1. Install BEAR AI
```bash
# Basic installation
pip install bear-ai

# Or with specific features
pip install bear-ai[gui,privacy,inference]

# Or full installation (all features)
pip install bear-ai[full]
```

### 2. Launch GUI
```bash
# Launch GUI selector
bear-ai-gui

# Or launch specific interface directly
bear-ai-gui simple    # Clean minimal interface
bear-ai-gui modern    # Feature-rich dark theme (recommended)
bear-ai-gui professional  # Advanced workflow interface
```

### 3. Use Command Line Tools
```bash
# Main CLI interface
bear-ai --help

# Interactive chat
bear-ai-chat

# PII scrubbing
bear-ai-scrub "Remove sensitive data from this text"

# Start API server
bear-ai-serve
```

## Installation Options

### Feature-Specific Installation

**Basic AI Inference:**
```bash
pip install bear-ai[inference]
```
- Includes: llama-cpp-python, torch, transformers
- Use for: Chat, model inference, basic AI features

**Privacy & PII Tools:**
```bash
pip install bear-ai[privacy]
```
- Includes: presidio, spacy, specialized PII models
- Use for: Data scrubbing, privacy compliance, legal workflows

**GUI Interfaces:**
```bash
pip install bear-ai[gui]
```
- Includes: customtkinter, matplotlib, plotly
- Use for: Desktop applications, visual interfaces

**RAG & Document Processing:**
```bash
pip install bear-ai[rag]
```
- Includes: chromadb, sentence-transformers, document processors
- Use for: Document search, knowledge bases, Q&A systems

**Server & API:**
```bash
pip install bear-ai[server]
```
- Includes: fastapi, uvicorn, OpenAI compatibility layer
- Use for: API services, web interfaces, integrations

**Complete Installation:**
```bash
pip install bear-ai[full]
```
- Includes all features except development tools
- Recommended for full BEAR AI experience

## Entry Points Overview

### Console Scripts (Available After Installation)

| Command | Purpose | Module Path |
|---------|---------|-------------|
| `bear-ai` | Main CLI interface | `bear_ai.__main__:main` |
| `bear-ai-gui` | GUI launcher with selector | `bear_ai.gui.__main__:main` |
| `bear-ai-chat` | Interactive chat interface | `bear_ai.core.chat:main` |
| `bear-ai-scrub` | PII scrubbing tool | `bear_ai.privacy.scrub:main` |
| `bear-ai-serve` | OpenAI-compatible API server | `bear_ai.server.openai_server:main` |
| `bear-ai-setup` | Initial setup wizard | `bear_ai.setup:main` |
| `bear-ai-models` | Model management CLI | `bear_ai.models.manager:main` |

### Python Module Execution

All interfaces can also be run via `python -m`:

```bash
# Main CLI
python -m bear_ai

# GUI interfaces
python -m bear_ai.gui                    # GUI selector
python -m bear_ai.gui.simple            # Simple GUI directly  
python -m bear_ai.gui.modern            # Modern GUI directly
python -m bear_ai.gui.professional      # Professional GUI directly

# Privacy tools
python -m bear_ai.privacy               # Privacy CLI
python -m bear_ai.privacy.scrub         # PII scrubber

# Core tools
python -m bear_ai.core.chat            # Chat interface
python -m bear_ai.models               # Model management
```

## Development Installation

### For Contributors

```bash
# Clone repository
git clone https://github.com/bear-ai/bear-ai.git
cd bear-ai

# Install in editable mode with development tools
pip install -e .[dev,full]

# Install pre-commit hooks
pre-commit install

# Run tests
pytest
```

### Development Dependencies
- pytest, pytest-asyncio, pytest-cov
- black, isort, flake8, mypy
- pre-commit, sphinx

## Platform-Specific Instructions

### Windows

**Prerequisites:**
```cmd
# Install Python 3.9+ from python.org
# Install Microsoft C++ Build Tools (for some packages)
```

**Installation:**
```cmd
# Use pip as normal
pip install bear-ai[full]

# Console scripts create .exe wrappers automatically
bear-ai-gui.exe
```

**GUI Launchers:**
- Console scripts work directly: `bear-ai-gui`
- Create desktop shortcuts to `bear-ai-gui.exe`
- Can still use `python -m bear_ai.gui` if preferred

### Linux

**Prerequisites:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip python3-venv

# For GUI support
sudo apt install python3-tk

# For advanced features
sudo apt install build-essential
```

**Installation:**
```bash
# Use virtual environment (recommended)
python3 -m venv bear_ai_env
source bear_ai_env/bin/activate

pip install bear-ai[full]

# Console scripts available in PATH
bear-ai-gui
```

### macOS

**Prerequisites:**
```bash
# Install Python via Homebrew (recommended)
brew install python

# Or use pyenv for version management
brew install pyenv
pyenv install 3.11
```

**Installation:**
```bash
# Use virtual environment
python3 -m venv bear_ai_env
source bear_ai_env/bin/activate

pip install bear-ai[full]

# Console scripts work directly
bear-ai-gui
```

## Virtual Environment Setup

### Recommended Approach

```bash
# Create virtual environment
python -m venv bear_ai_env

# Activate (Linux/Mac)
source bear_ai_env/bin/activate

# Activate (Windows)
bear_ai_env\Scripts\activate

# Install BEAR AI
pip install bear-ai[full]

# Verify installation
bear-ai --version
bear-ai-gui --list
```

### Using conda

```bash
# Create conda environment
conda create -n bear_ai python=3.11
conda activate bear_ai

# Install BEAR AI
pip install bear-ai[full]
```

## Verification

### Test Installation

```bash
# Test main CLI
bear-ai --version
bear-ai --help

# Test GUI launcher
bear-ai-gui --list

# Test module execution
python -m bear_ai --version
python -m bear_ai.gui --help

# Test specific tools
bear-ai-chat --help
bear-ai-scrub --help
```

### Test GUI Interfaces

```bash
# Launch GUI selector
bear-ai-gui

# Test each interface
bear-ai-gui simple
bear-ai-gui modern  
bear-ai-gui professional
```

## Troubleshooting

### Common Issues

**"Command not found: bear-ai"**
- Solution: Ensure pip installation directory is in PATH
- Windows: Check Scripts directory in PATH
- Linux/Mac: Check ~/.local/bin in PATH

**Import errors for specific features**
- Solution: Install feature-specific dependencies
- Example: `pip install bear-ai[gui,privacy]`

**GUI won't start**
- Check tkinter installation: `python -c "import tkinter"`
- Install system GUI libraries (Linux): `sudo apt install python3-tk`
- For CustomTkinter: `pip install customtkinter`

**Permission errors during installation**
- Use virtual environment (recommended)
- Or use `--user` flag: `pip install --user bear-ai[full]`

**Slow model downloads**
- Use `--cache-dir` to specify download location
- Check available disk space
- Consider using `bear-ai-models` for better progress tracking

### Getting Help

**Documentation:**
- Online docs: https://docs.bear-ai.org
- Built-in help: `bear-ai --help`, `bear-ai-gui --help`

**Support:**
- GitHub Issues: https://github.com/bear-ai/bear-ai/issues
- Discussions: https://github.com/bear-ai/bear-ai/discussions

**Command Help:**
```bash
# Get help for any command
bear-ai --help
bear-ai-gui --help
bear-ai-chat --help
bear-ai-scrub --help

# Module help
python -m bear_ai --help
python -m bear_ai.gui --help
```

## Migration from Previous Versions

### If Upgrading from Legacy Installation

**Old approach:**
```bash
# This no longer works
python simple_gui.py
python modern_gui.py
```

**New approach:**
```bash
# Use console scripts
bear-ai-gui simple
bear-ai-gui modern

# Or module execution
python -m bear_ai.gui.simple
python -m bear_ai.gui.modern
```

**Update batch files:**
Replace direct Python script calls with console scripts in any custom batch/shell files.

## Next Steps

After installation:

1. **Download Models:** `bear-ai-models` or use the GUI
2. **Configure Privacy:** Set up PII policies if needed
3. **Explore Features:** Try different GUI interfaces
4. **Read Documentation:** Check online docs for advanced features
5. **Join Community:** Participate in GitHub discussions