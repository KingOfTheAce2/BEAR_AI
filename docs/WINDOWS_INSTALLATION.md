# Windows Installation Guide for BEAR AI

## Problem: llama-cpp-python Build Failures

The main BEAR AI dependency issue on Windows is `llama-cpp-python`, which requires:
- CMake
- Visual Studio Build Tools or Visual Studio Community
- C++ compiler toolchain

**Error you might see:**
```
CMake Error: CMAKE_C_COMPILER not set, after EnableLanguage
CMake Error: CMAKE_CXX_COMPILER not set, after EnableLanguage
```

## Quick Solutions

### Option 1: Windows-Safe Installation (Recommended)

Use the Windows-safe requirements that avoid build tools entirely:

```bash
# Install with API-based inference (no local models)
pip install -e .[windows-safe]

# Or install from Windows-safe requirements
pip install -r requirements-windows-safe.txt
```

This gives you:
- ✅ Full BEAR AI functionality
- ✅ GUI interface
- ✅ Document processing
- ✅ Cloud API integration (OpenAI, Anthropic)
- ✅ No build tools required

### Option 2: Cloud APIs Only

If you want to use BEAR AI with cloud APIs instead of local models:

```bash
pip install -e .[cloud]
```

Configure with your API keys:
```bash
# Set environment variables
set OPENAI_API_KEY=your_openai_key
set ANTHROPIC_API_KEY=your_anthropic_key

# Or create .env file
echo OPENAI_API_KEY=your_openai_key > .env
echo ANTHROPIC_API_KEY=your_anthropic_key >> .env
```

### Option 3: Pre-compiled Wheels (If Available)

Sometimes pre-compiled wheels are available:

```bash
# Try to install with pre-compiled wheel
pip install llama-cpp-python --only-binary=all

# If that works, then install BEAR AI
pip install -e .[inference]
```

### Option 4: Install Build Tools (Full Local Support)

If you need local model support and want to install build tools:

1. **Install Visual Studio Build Tools:**
   - Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - Install "C++ build tools" workload
   - Include CMake tools

2. **Install CMake:**
   ```bash
   winget install Kitware.CMake
   ```

3. **Install BEAR AI with local inference:**
   ```bash
   pip install -e .[inference-cpp]
   ```

## Alternative Model Backends

### ONNX Runtime (Microsoft Optimized)
```bash
pip install onnxruntime
# Download ONNX models from HuggingFace
# Use with transformers library
```

### Transformers + PyTorch
```bash
pip install torch transformers
# Uses HuggingFace models directly
# Has pre-compiled Windows wheels
```

### Ollama Integration
```bash
# Install Ollama separately from: https://ollama.ai
# Then use BEAR AI with Ollama backend
pip install requests  # For API calls to Ollama
```

## Testing Your Installation

### Test Core Functionality
```bash
python -c "import bear_ai; print('BEAR AI imported successfully')"
```

### Test GUI
```bash
bear-gui
```

### Test API Server
```bash
bear-serve --host 0.0.0.0 --port 8000
```

### Test with Cloud APIs
```python
import os
from bear_ai.engines import OpenAIEngine

# Set your API key
os.environ['OPENAI_API_KEY'] = 'your_key_here'

# Test inference
engine = OpenAIEngine()
response = engine.generate("Hello, how are you?")
print(response)
```

## Dependency Analysis

### ✅ Windows-Safe Dependencies
These work without build tools:
- `pydantic`, `fastapi`, `uvicorn` - Pure Python
- `customtkinter`, `Pillow` - GUI, pre-compiled wheels
- `huggingface_hub`, `transformers` - AI libraries with wheels
- `pypdf`, `python-docx` - Document processing, pure Python
- `psutil` - System monitoring, has Windows wheels
- `numpy`, `pandas` - Data science, pre-compiled wheels

### ⚠️ Potentially Problematic
May require additional setup:
- `llama-cpp-python` - **Main problem**, needs CMake/Visual Studio
- `opencv-python` - Large but usually has wheels
- `librosa` - Audio processing, may need codecs
- `spacy` - NLP, needs language models: `python -m spacy download en_core_web_sm`

### ❌ Avoid on Windows (Without Build Tools)
- `llama-cpp-python` - Requires compilation
- `lancedb` - May require Rust compilation
- Some audio/video processing libraries

## Configuration Examples

### Using OpenAI API
```python
# bear_ai/config.py or .env file
INFERENCE_ENGINE = "openai"
OPENAI_API_KEY = "your_key"
OPENAI_MODEL = "gpt-4"
```

### Using ONNX Runtime
```python
INFERENCE_ENGINE = "onnx"
ONNX_MODEL_PATH = "./models/model.onnx"
```

### Using Transformers
```python
INFERENCE_ENGINE = "transformers"
TRANSFORMERS_MODEL = "microsoft/DialoGPT-medium"
```

## Troubleshooting

### ImportError: No module named 'llama_cpp'
- Use `pip install -e .[windows-safe]` instead
- Or configure BEAR AI to use API-based inference

### CMake not found
- Install build tools (Option 4 above)
- Or use Windows-safe installation (Option 1)

### Visual Studio errors
- Use cloud APIs instead of local models
- Or install Visual Studio Build Tools

### Permission errors
- Run command prompt as Administrator
- Use virtual environment: `python -m venv bear_ai_env`

## Performance Notes

### Cloud APIs vs Local Models
- **Cloud APIs**: No setup issues, fast inference, requires internet
- **Local Models**: More setup, runs offline, requires more system resources

### Memory Usage
- Windows-safe installation: ~200MB
- With transformers: ~2-4GB (depending on model size)
- With llama.cpp: ~1-8GB (depending on model size)

## Next Steps

After successful installation:

1. **Configure your inference engine** in `bear_ai/config.py`
2. **Test basic functionality** with the examples above
3. **Set up your preferred AI provider** (OpenAI, Anthropic, or local)
4. **Explore the GUI** with `bear-gui`
5. **Try document processing** features

## Support

If you encounter issues:

1. **Check Python version**: BEAR AI requires Python 3.9+
2. **Use virtual environment**: `python -m venv bear_ai_env`
3. **Update pip**: `python -m pip install --upgrade pip`
4. **Try Windows-safe installation first**
5. **Check firewall/antivirus** if network issues occur

For persistent issues, consider using BEAR AI with cloud APIs rather than local models on Windows.