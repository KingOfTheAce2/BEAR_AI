# BEAR AI Troubleshooting Guide

This comprehensive guide addresses the most common issues users encounter with BEAR AI. Solutions are organized by category for quick resolution.

---

## 🚀 Quick Fixes

### Before You Start
1. **Try the easy installer first**: `scripts\setup_gui.bat`
2. **Check system requirements**: 8GB+ RAM, Windows 10+
3. **Close other applications**: Free up memory and resources
4. **Run as Administrator**: Fixes most permission issues

---

## 💻 Installation Issues

### "Python not found" or "pip not recognized"

**Symptoms:**
- Error messages about Python not being installed
- Commands like `pip install` don't work
- "python is not recognized as an internal or external command"

**Solutions:**
1. **Use the automated installer** (Recommended):
   ```batch
   # Double-click this file - it handles Python for you
   scripts\setup_gui.bat
   ```

2. **Manual Python installation**:
   - Download Python 3.8+ from [python.org](https://python.org)
   - ✅ **Check "Add Python to PATH"** during installation
   - Restart your terminal after installation

3. **Verify installation**:
   ```powershell
   python --version
   pip --version
   ```

### Permission Denied Errors

**Symptoms:**
- "Access denied" when installing packages
- "Permission denied" when creating files
- Installation fails silently

**Solutions:**
1. **Run as Administrator**:
   - Right-click PowerShell → "Run as administrator"
   - Try installation again

2. **Use virtual environment**:
   ```powershell
   python -m venv bear_env
   bear_env\Scripts\activate
   pip install -e .[inference]
   ```

3. **Alternative: User installation**:
   ```powershell
   pip install --user -e .[inference]
   ```

### Network/Download Issues

**Symptoms:**
- "Connection timeout" during model downloads
- Slow download speeds
- "SSL certificate verify failed"

**Solutions:**
1. **Check internet connection**: Models are 4-20GB files
2. **Use alternative download**:
   ```powershell
   # Resume broken downloads
   python -m bear_ai TheBloke/Mistral-7B-Instruct-v0.2-GGUF model.q4_0.gguf --resume
   ```
3. **Corporate networks**: May need proxy configuration
4. **Manual download**: Download directly from Hugging Face website

---

## 🔧 Hardware-Specific Problems

### NVIDIA GPU Not Detected

**Symptoms:**
- GPU shows 0% usage during inference
- Slower than expected performance
- "CUDA not available" messages

**Diagnostics:**
```powershell
# Check if NVIDIA drivers are installed
nvidia-smi

# Check CUDA availability
python -c "import torch; print(torch.cuda.is_available())"
```

**Solutions:**
1. **Update NVIDIA drivers**:
   - Download latest drivers from NVIDIA website
   - Use GeForce Experience for automatic updates

2. **Install CUDA-enabled llama-cpp-python**:
   ```powershell
   pip uninstall llama-cpp-python
   pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu118
   ```

3. **Enable GPU layers**:
   ```powershell
   bear-chat --model model.gguf --n-gpu-layers 35
   ```

4. **Check VRAM usage**:
   - Use `nvidia-smi` to monitor memory
   - Reduce model size if VRAM is full

### AMD GPU Issues

**Symptoms:**
- AMD card not utilized for inference
- Performance same as CPU-only

**Current Status:**
- AMD GPU acceleration is experimental
- OpenCL support planned for v1.1.0

**Workarounds:**
1. **Use CPU mode**: Performance is still acceptable
2. **ROCm installation** (Advanced users only):
   ```powershell
   pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/rocm
   ```

### Memory Issues (RAM/VRAM)

**Symptoms:**
- "Out of memory" errors
- System becomes unresponsive
- Model loading fails

**Solutions:**
1. **Use smaller models**:
   - 7B instead of 13B models
   - Q4_0 quantization instead of Q8_0

2. **Free system memory**:
   - Close browsers, games, other applications
   - Use Task Manager to identify memory hogs

3. **Adjust GPU layers**:
   ```powershell
   # Reduce GPU usage if VRAM is limited
   bear-chat --model model.gguf --n-gpu-layers 20
   ```

4. **Model recommendations by RAM**:
   | Available RAM | Recommended Model Size | Quantization |
   |---------------|------------------------|--------------|
   | 8GB | 7B | Q4_0 |
   | 16GB | 13B | Q4_0 |
   | 32GB+ | 30B+ | Q5_1 |

---

## 🤖 Model-Related Issues

### Model Won't Load

**Symptoms:**
- "Failed to load model" errors
- GUI shows model as loaded but doesn't respond
- Immediate crashes when starting chat

**Diagnostics:**
```powershell
# Test model file integrity
python -m bear_ai --validate model.gguf

# Check model format
file model.gguf  # Should show "GGUF" format
```

**Solutions:**
1. **Verify file integrity**:
   - Re-download if file is corrupted
   - Check file size matches expected size

2. **Check model format**:
   - Only GGUF format is supported
   - Convert from other formats if needed

3. **Test with different model**:
   ```powershell
   # Try a known-good small model
   python -m bear_ai microsoft/DialoGPT-small --list
   ```

### Poor Response Quality

**Symptoms:**
- Repetitive or nonsensical responses
- Model seems "dumber" than expected
- Responses don't match context

**Solutions:**
1. **Try different models**:
   - Some models excel at specific tasks
   - Larger models generally perform better

2. **Adjust parameters**:
   ```powershell
   bear-chat --temperature 0.7 --top-p 0.9 --top-k 40
   ```

3. **Better prompting**:
   - Be specific and clear in your requests
   - Provide context and examples
   - Use system prompts for behavior

4. **Model recommendations**:
   | Use Case | Recommended Models |
   |----------|-------------------|
   | **Legal Analysis** | `TheBloke/Llama-2-13B-Chat-GGUF` |
   | **Code Generation** | `TheBloke/CodeLlama-13B-Instruct-GGUF` |
   | **General Chat** | `TheBloke/Mistral-7B-Instruct-v0.2-GGUF` |
   | **Research** | `TheBloke/vicuna-13b-v1.5-GGUF` |

### Slow Performance

**Symptoms:**
- Very slow token generation (< 1 token/second)
- Long delays between responses
- System feels sluggish during inference

**Diagnostics:**
```powershell
# Run built-in benchmark
bear-chat --benchmark

# Monitor system resources
# Use Task Manager or Resource Monitor on Windows
```

**Solutions:**
1. **Enable GPU acceleration**:
   ```powershell
   bear-chat --n-gpu-layers -1  # Use all GPU layers
   ```

2. **Optimize CPU usage**:
   ```powershell
   bear-chat --n-threads 8  # Match your CPU core count
   ```

3. **Use faster models**:
   - Smaller models (7B vs 13B)
   - Higher quantization (Q4_0 vs Q8_0)

4. **Performance tuning**:
   | Setting | Description | Impact |
   |---------|-------------|---------|
   | `--n-gpu-layers` | GPU offloading | High |
   | `--n-threads` | CPU parallelism | Medium |
   | `--n-batch` | Processing batch size | Medium |
   | `--n-ctx` | Context window size | Low |

---

## 🖥️ GUI Problems

### GUI Won't Start

**Symptoms:**
- "No module named tkinter" errors
- GUI window doesn't appear
- Python errors about missing modules

**Solutions:**
1. **Install tkinter** (Linux users):
   ```bash
   sudo apt-get install python3-tk
   ```

2. **For Windows**: tkinter is included with Python

3. **Verify GUI modules**:
   ```powershell
   python -c "import tkinter; print('GUI support available')"
   ```

4. **Use alternative startup**:
   ```powershell
   python -m bear_ai.gui --debug  # Shows detailed error messages
   ```

### GUI Freezes or Crashes

**Symptoms:**
- GUI becomes unresponsive
- Window closes unexpectedly
- "Not responding" in Task Manager

**Solutions:**
1. **Increase timeout values**:
   - Edit `bear_ai/gui.py` to increase response timeouts
   
2. **Run in debug mode**:
   ```powershell
   python -m bear_ai.gui --debug --verbose
   ```

3. **Check log files**:
   - Look at `bear_ai.log` for error messages
   - Enable verbose logging for more details

4. **Memory management**:
   - Close other applications
   - Use smaller models
   - Restart GUI periodically for long sessions

### Display Issues

**Symptoms:**
- Text appears cut off or overlapping
- Buttons not clickable
- Weird fonts or sizing

**Solutions:**
1. **Adjust display scaling**:
   - Windows: Settings → Display → Scale
   - Try 100% scaling if using higher values

2. **Update graphics drivers**:
   - Essential for proper GUI rendering

3. **Font issues**:
   ```powershell
   # Reset to default system fonts
   python -m bear_ai.gui --default-fonts
   ```

---

## 📄 Document Processing Issues

### PDF/DOCX Won't Load

**Symptoms:**
- "Unsupported file format" errors
- Documents appear empty in chat
- File upload fails silently

**Solutions:**
1. **Install document parsers**:
   ```powershell
   pip install pypdf python-docx
   ```

2. **Check file permissions**:
   - Ensure files aren't password-protected
   - Try copying files to a different location

3. **Convert to supported format**:
   - Save as plain text (.txt)
   - Try different PDF/DOCX files to isolate the issue

4. **Supported formats**:
   | Format | Status | Requirements |
   |--------|--------|--------------|
   | `.txt` | ✅ Built-in | None |
   | `.md` | ✅ Built-in | None |
   | `.pdf` | ✅ Optional | `pip install pypdf` |
   | `.docx` | ✅ Optional | `pip install python-docx` |
   | `.doc` | ❌ Not supported | Convert to .docx |

### RAG/Document Chat Issues

**Symptoms:**
- Chat doesn't use document context
- "No relevant documents found" messages
- Responses ignore uploaded documents

**Solutions:**
1. **Verify document location**:
   ```powershell
   # Documents should be in:
   ~/.bear_ai/data/docs/<case_id>/
   ```

2. **Check indexing**:
   ```powershell
   python -m bear_ai --reindex-docs
   ```

3. **Improve document quality**:
   - Use clear, well-formatted documents
   - Remove excessive formatting
   - Break up very large documents

---

## 🔐 Privacy & Security Issues

### PII Scrubbing Not Working

**Symptoms:**
- Personal information appears in responses
- Audit logs show unscrubbed data
- Privacy warnings ignored

**Solutions:**
1. **Enable PII protection**:
   ```powershell
   # Check PII settings in GUI
   # Or use environment variable:
   set PII_ENABLED=1
   ```

2. **Install PII dependencies**:
   ```powershell
   pip install presidio-analyzer presidio-anonymizer
   python -m spacy download en_core_web_lg
   ```

3. **Test PII detection**:
   ```powershell
   bear-scrub --test "John Doe's email is john@example.com"
   # Should output: "[PERSON]'s email is [EMAIL]"
   ```

4. **Custom PII patterns**:
   - Edit PII configuration for domain-specific patterns
   - Add custom regex patterns for specialized data

### Audit Log Issues

**Symptoms:**
- Log files not created
- Missing audit entries
- Corrupted log files

**Solutions:**
1. **Enable audit logging**:
   ```powershell
   set PII_AUDIT=1
   ```

2. **Check log permissions**:
   - Ensure write permissions to log directory
   - Try different log location

3. **Verify log format**:
   - Logs are in JSONL format with SHA256 hashes
   - Use log validation tools

---

## 🏗️ Build and Packaging Issues

### PyInstaller Build Failures

**Symptoms:**
- "Module not found" errors during build
- Built executable won't run
- Missing dependencies in .exe

**Solutions:**
1. **Clean environment**:
   ```powershell
   # Use fresh virtual environment for building
   python -m venv build_env
   build_env\Scripts\activate
   pip install -e .[inference]
   pip install pyinstaller
   ```

2. **Use provided spec files**:
   ```powershell
   pyinstaller packaging/pyinstaller/bear-ai.spec
   ```

3. **Manual dependency inclusion**:
   ```powershell
   # Add missing modules to spec file
   # Check hiddenimports= section
   ```

### Executable Won't Run

**Symptoms:**
- .exe file starts and immediately closes
- "Failed to execute script" errors
- Antivirus blocking execution

**Solutions:**
1. **Run from command line** to see errors:
   ```cmd
   dist\bear_ai.exe --debug
   ```

2. **Antivirus exclusions**:
   - Add executable to antivirus whitelist
   - Use signed executables in production

3. **Dependency issues**:
   - Verify all required DLLs are included
   - Check for missing Visual C++ redistributables

---

## 🌐 Network and Connectivity Issues

### Hugging Face Hub Access

**Symptoms:**
- "Connection refused" when downloading models
- Authentication errors
- Rate limiting messages

**Solutions:**
1. **Check internet connectivity**:
   ```powershell
   ping huggingface.co
   ```

2. **Corporate firewall**:
   - Check proxy settings
   - Whitelist huggingface.co domain

3. **Rate limiting**:
   - Wait and retry later
   - Use authenticated requests for higher limits

4. **Authentication** (for private models):
   ```powershell
   # Set Hugging Face token
   set HUGGINGFACE_HUB_TOKEN=your_token_here
   ```

### Proxy Configuration

**Symptoms:**
- Downloads fail in corporate environments
- "Unable to connect" errors
- Timeouts during model download

**Solutions:**
1. **Set proxy environment variables**:
   ```powershell
   set HTTP_PROXY=http://proxy.company.com:8080
   set HTTPS_PROXY=http://proxy.company.com:8080
   ```

2. **Configure pip for proxy**:
   ```powershell
   pip install --proxy http://proxy.company.com:8080 -e .[inference]
   ```

3. **Test proxy connection**:
   ```powershell
   curl --proxy http://proxy.company.com:8080 https://huggingface.co
   ```

---

## 🐛 Debugging and Logging

### Enable Detailed Logging

```powershell
# Set debug environment variables
set BEAR_AI_DEBUG=1
set BEAR_AI_LOG_LEVEL=DEBUG

# Run with verbose output
python -m bear_ai.gui --debug --verbose
```

### Log File Locations

- **Windows**: `%APPDATA%\bear_ai\logs\`
- **macOS**: `~/Library/Logs/bear_ai/`
- **Linux**: `~/.local/share/bear_ai/logs/`

### Common Log Messages

| Log Message | Meaning | Action |
|-------------|---------|--------|
| "Model loaded successfully" | ✅ Normal operation | None |
| "CUDA not available" | ⚠️ GPU not accessible | Check GPU setup |
| "Out of memory" | ❌ Insufficient RAM/VRAM | Use smaller model |
| "File not found" | ❌ Missing model file | Verify file path |

---

## 🆘 Getting Additional Help

### Before Reporting Issues

1. **Check existing issues**: [GitHub Issues](https://github.com/KingOfTheAce2/BEAR_AI/issues)
2. **Search this guide**: Use Ctrl+F to find specific errors
3. **Try basic troubleshooting**: Restart, update drivers, clean install

### Reporting Bugs

**Include this information:**
- **Operating System**: Windows 10/11, version
- **Hardware**: CPU, RAM, GPU details
- **Python Version**: `python --version`
- **BEAR AI Version**: Found in GUI About dialog
- **Full Error Message**: Copy exact text
- **Steps to Reproduce**: What you were doing when it failed

**Example bug report:**
```
**Environment:**
- OS: Windows 11 22H2
- Hardware: Intel i7-10700K, 32GB RAM, RTX 3080
- Python: 3.11.0
- BEAR AI: v1.0.0

**Issue:**
Model loading fails with "CUDA out of memory" error

**Steps to Reproduce:**
1. Start GUI
2. Select "TheBloke/Llama-2-13B-Chat-GGUF"
3. Set n-gpu-layers to -1
4. Error occurs during model load

**Error Message:**
[Paste exact error text here]
```

### Community Support

- **GitHub Discussions**: General questions and community help
- **Discord Server**: Real-time community support (link in repository)
- **Documentation**: This guide and other docs in `/docs` folder

### Professional Support

For enterprise deployments or mission-critical issues:
- **Priority Support**: Available for commercial users
- **Custom Configurations**: Professional setup and optimization
- **Security Audits**: Third-party security assessments

---

## ✅ System Health Check

Run this comprehensive check to verify your installation:

```powershell
# BEAR AI Health Check Script
python -m bear_ai --health-check
```

This command will verify:
- ✅ Python installation and version
- ✅ Required dependencies installed
- ✅ GPU detection and CUDA availability
- ✅ Model directory structure
- ✅ GUI components functional
- ✅ Network connectivity to Hugging Face
- ✅ File permissions and directory access
- ✅ Memory and disk space availability

---

*Last updated: January 15, 2025*
*For the latest troubleshooting tips, check the [GitHub repository](https://github.com/KingOfTheAce2/BEAR_AI).*