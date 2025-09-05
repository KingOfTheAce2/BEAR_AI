# BEAR AI Hardware Optimization Guide

> **Goal**: Get the best performance from your hardware while maintaining privacy

## 🚀 Quick Start by Hardware Type

### Got an NVIDIA GPU?
```powershell
# Install GPU-accelerated version
pip uninstall llama-cpp-python
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121

# Test with GPU acceleration
python -m bear_ai.chat --model model.gguf --n-gpu-layers 35
```

### CPU Only?
```powershell
# Optimize for your CPU cores
python -m bear_ai.chat --model model.gguf --threads 8  # Replace 8 with your core count

# Use CPU-optimized models
python -m bear_ai --suggest --cpu-only
```

### Limited RAM (8GB or less)?
```powershell
# Find models that fit your system
python -m bear_ai --suggest --max-ram 8

# Use smaller quantized models
python -m bear_ai TheBloke/Mistral-7B-Instruct-v0.2-GGUF mistral-7b-instruct-v0.2.Q4_0.gguf
```

---

## 💾 System Requirements by Use Case

### Legal Document Review (Recommended)
| Component | Specification | Why Important |
|-----------|---------------|---------------|
| **RAM** | 16-32GB | Large legal documents, multiple cases |
| **GPU** | NVIDIA RTX 3060+ (8GB VRAM) | Fast processing of long documents |
| **Storage** | 1TB SSD | Model storage, document cache |
| **CPU** | Intel i5/AMD Ryzen 5+ | Backup processing, multitasking |

### Privacy-Focused Personal Use (Minimum)
| Component | Specification | Why Important |
|-----------|---------------|---------------|
| **RAM** | 8-16GB | Basic model operation |
| **GPU** | Optional, any NVIDIA | Acceleration if available |
| **Storage** | 100GB SSD | Essential models only |
| **CPU** | Any modern dual-core | CPU-only fallback |

### Enterprise/Heavy Workload
| Component | Specification | Why Important |
|-----------|---------------|---------------|
| **RAM** | 64GB+ | Multiple large models, team usage |
| **GPU** | NVIDIA RTX 4090 (24GB VRAM) | Maximum performance |
| **Storage** | 2TB+ NVMe SSD | Model library, fast access |
| **CPU** | Intel i9/AMD Ryzen 9 | Parallel processing |

---

## 🖥️ Hardware Detection and Optimization

### Automatic System Assessment
```powershell
# Comprehensive hardware analysis
python -m bear_ai --suggest

# GPU-specific analysis
python -m bear_ai --gpu-info

# Memory analysis with recommendations
python -m bear_ai --memory-profile
```

### Manual Hardware Check
```powershell
# Check RAM
python -c "import psutil; print(f'Total RAM: {psutil.virtual_memory().total//1024**3}GB')"

# Check GPU (if NVIDIA)
nvidia-smi

# Check CPU cores
python -c "import os; print(f'CPU cores: {os.cpu_count()}')"

# Check disk space
python -c "import shutil; print(f'Free space: {shutil.disk_usage('.').free//1024**3}GB')"
```

---

## 🎮 GPU Acceleration Setup

### NVIDIA GPU (Recommended)

#### Step 1: Verify Hardware
```powershell
# Check if NVIDIA GPU is detected
nvidia-smi

# Should show GPU name, memory, driver version
```

#### Step 2: Install CUDA Toolkit
1. **Download** from [NVIDIA CUDA Downloads](https://developer.nvidia.com/cuda-downloads)
2. **Choose** CUDA 11.8 or 12.1 (most compatible)
3. **Install** with default settings
4. **Verify**: `nvcc --version`

#### Step 3: Install GPU-Accelerated llama-cpp-python
```powershell
# Remove CPU-only version
pip uninstall llama-cpp-python

# Install CUDA version
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121

# Test installation
python -c "from llama_cpp import Llama; print('GPU support available')"
```

#### Step 4: Optimize GPU Usage
```powershell
# Start with most layers on GPU
python -m bear_ai.chat --model model.gguf --n-gpu-layers -1  # All layers

# If you get VRAM errors, reduce layers
python -m bear_ai.chat --model model.gguf --n-gpu-layers 25  # Partial GPU
```

### GPU Performance Tips
- **Monitor VRAM usage** with `nvidia-smi` during inference
- **Start high and reduce** layer count if you get memory errors
- **Close other GPU applications** (games, video editing, etc.)
- **Use latest NVIDIA drivers** for best compatibility

### AMD GPU (Experimental)
AMD GPU support is limited. For best results:
1. **Use CPU-only version** for stability
2. **Try ROCm** builds if available (Linux only)
3. **Consider Intel Arc** GPUs for better compatibility

---

## 🧠 Memory Optimization

### RAM Management

#### Check Current Usage
```powershell
# Monitor memory during model loading
python -c "
import psutil
import time
while True:
    mem = psutil.virtual_memory()
    print(f'RAM: {mem.used//1024**3}GB/{mem.total//1024**3}GB ({mem.percent:.1f}%)')
    time.sleep(1)
"
```

#### Optimize for Low RAM Systems
```powershell
# Use smaller models
python -m bear_ai --suggest --max-ram 8  # 8GB systems

# Reduce context window
python -m bear_ai.chat --model model.gguf --n-ctx 1024  # Smaller context

# Enable memory mapping (slower but uses less RAM)
python -m bear_ai.chat --model model.gguf --mmap True
```

### Virtual Memory (Swap) Setup
**Windows**:
1. System Properties → Performance → Settings → Advanced
2. Virtual memory → Change
3. Set to **1.5x your RAM size** (e.g., 24GB for 16GB RAM)
4. Restart computer

**Benefits**: Allows larger models on limited RAM systems
**Drawbacks**: Much slower when swap is used

---

## 💿 Storage Optimization

### SSD vs HDD Performance Impact
| Storage Type | Model Load Time | Inference Speed | Recommendation |
|--------------|----------------|-----------------|----------------|
| **NVMe SSD** | 5-10 seconds | No impact | Best choice |
| **SATA SSD** | 10-20 seconds | No impact | Good choice |
| **HDD** | 60+ seconds | No impact | Avoid if possible |

### Model Storage Strategy
```powershell
# Check model sizes
python -m bear_ai --list-models --show-sizes

# Organize by frequency of use
models/
├── daily/     # Your most-used models
├── backup/    # Less frequent models
└── archive/   # Rarely used models
```

### Disk Space Management
```powershell
# Clear download cache
python -m bear_ai --clear-cache

# Remove unused models
python -m bear_ai --cleanup-models

# Compress unused models (if available)
python -m bear_ai --compress-models
```

---

## ⚡ CPU Optimization

### CPU-Only Performance Tuning

#### Thread Optimization
```powershell
# Use all CPU cores
python -m bear_ai.chat --model model.gguf --threads $(nproc)  # Linux
python -m bear_ai.chat --model model.gguf --threads %NUMBER_OF_PROCESSORS%  # Windows

# For hyperthreaded CPUs, use physical cores only
python -m bear_ai.chat --model model.gguf --threads 8  # If you have 8 physical cores
```

#### CPU-Specific Builds
```powershell
# For Intel CPUs with AVX2/AVX512
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu-intel

# For Apple Silicon (M1/M2)
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/metal
```

### Performance Monitoring
```powershell
# Monitor CPU usage during inference
python -c "
import psutil
import time
while True:
    cpu_percent = psutil.cpu_percent(interval=1)
    print(f'CPU: {cpu_percent:.1f}%')
"
```

---

## 📊 Model Selection by Hardware

### 7B Models (Entry Level)
**Hardware Requirements**: 6GB RAM, any modern CPU
**Recommended Models**:
- `mistral-7b-instruct-v0.2.Q4_0.gguf` (3.5GB)
- `llama-2-7b-chat.Q4_0.gguf` (3.8GB)

**Performance**: Good for basic tasks, fast responses

### 13B Models (Balanced)
**Hardware Requirements**: 10GB RAM, 6GB VRAM (GPU)
**Recommended Models**:
- `llama-2-13b-chat.Q4_0.gguf` (7.3GB)
- `mistral-7b-instruct-v0.2.Q5_0.gguf` (4.8GB)

**Performance**: Better reasoning, moderate speed

### 30B+ Models (Professional)
**Hardware Requirements**: 20GB+ RAM, 16GB+ VRAM
**Recommended Models**:
- `llama-2-30b-chat.Q4_0.gguf` (17GB)
- `codellama-34b-instruct.Q4_0.gguf` (19GB)

**Performance**: Excellent quality, slower responses

### Quantization Guide
| Quantization | File Size | Quality | Speed | Best For |
|--------------|-----------|---------|-------|----------|
| **Q2_K** | Smallest | Lower | Fastest | Testing |
| **Q4_0** | Small | Good | Fast | **Recommended** |
| **Q5_0** | Medium | Better | Medium | Quality focus |
| **Q8_0** | Large | Best | Slow | Maximum quality |

---

## 🔧 Performance Benchmarking

### Built-in Benchmarks
```powershell
# Speed test with current model
python -m bear_ai.chat --model model.gguf --benchmark

# Compare different settings
python -m bear_ai --benchmark-suite model.gguf
```

### Custom Performance Testing
```powershell
# Time model loading
python -c "
import time
start = time.time()
# Your model loading code here
print(f'Load time: {time.time() - start:.2f}s')
"

# Measure tokens per second
python -m bear_ai.chat --model model.gguf --show-speed --n-predict 100
```

### Expected Performance Targets
| Hardware | Tokens/Second | Load Time |
|----------|---------------|-----------|
| RTX 4090 + 7B model | 100-150 t/s | 5-10s |
| RTX 3060 + 7B model | 50-80 t/s | 10-15s |
| CPU i7 + 7B model | 5-15 t/s | 30-60s |
| CPU i5 + 7B model | 3-8 t/s | 60-120s |

---

## 🛠️ Troubleshooting Hardware Issues

### GPU Not Detected
```powershell
# Check GPU visibility
python -c "
try:
    from llama_cpp import Llama
    print('GPU support compiled in')
except:
    print('No GPU support - reinstall with CUDA version')
"

# NVIDIA-specific checks
nvidia-smi
nvcc --version
```

### Memory Issues
```powershell
# Monitor memory usage
python -c "
import psutil
mem = psutil.virtual_memory()
print(f'Available: {mem.available//1024**3}GB')
print(f'Used: {mem.used//1024**3}GB')
print(f'Total: {mem.total//1024**3}GB')
"
```

### Performance Problems
```powershell
# Check for thermal throttling
python -c "
import psutil
temps = psutil.sensors_temperatures()
for name, entries in temps.items():
    for entry in entries:
        print(f'{name}: {entry.current}°C')
"

# Check background processes
tasklist /fi "memusage gt 500000"  # Processes using >500MB
```

---

## 📈 Optimization Checklist

### Before First Use
- [ ] **Install GPU drivers** (NVIDIA/AMD latest)
- [ ] **Set up CUDA** (if using NVIDIA GPU)
- [ ] **Configure virtual memory** (1.5x RAM size)
- [ ] **Install on SSD** (not HDD)
- [ ] **Close unnecessary applications**

### Model Selection
- [ ] **Run hardware assessment**: `python -m bear_ai --suggest`
- [ ] **Start with Q4_0 quantization** for speed/quality balance
- [ ] **Choose 7B models** for systems with 8-16GB RAM
- [ ] **Test before committing** to large downloads

### Performance Tuning
- [ ] **Enable GPU acceleration** (if available)
- [ ] **Set optimal thread count** (= CPU cores)
- [ ] **Monitor system resources** during inference
- [ ] **Benchmark different settings** to find optimal

### Maintenance
- [ ] **Keep GPU drivers updated**
- [ ] **Clear cache periodically**: `python -m bear_ai --clear-cache`
- [ ] **Monitor disk space** (models can be large)
- [ ] **Restart system** after driver updates

---

## 🏆 Hardware Recommendations by Budget

### Budget Setup ($0 additional hardware)
- **Use existing CPU**
- **8GB RAM minimum**
- **Install on SSD if available**
- **Expected**: 3-8 tokens/second with 7B models

### Mid-Range Setup ($300-600)
- **NVIDIA RTX 3060 (8GB VRAM)**
- **16GB RAM**
- **1TB SSD**
- **Expected**: 50-80 tokens/second with 7B models

### High-End Setup ($1000-1500)
- **NVIDIA RTX 4070/4080 (12-16GB VRAM)**
- **32GB RAM**
- **2TB NVMe SSD**
- **Expected**: 80-120 tokens/second, larger models supported

### Enterprise Setup ($2000+)
- **NVIDIA RTX 4090 (24GB VRAM)**
- **64GB RAM**
- **4TB NVMe SSD**
- **Expected**: 100-150 tokens/second, any model size

---

*Need more help? Check our [Installation Guide](INSTALLATION_GUIDE.md) or [Troubleshooting Guide](TROUBLESHOOTING.md)!*