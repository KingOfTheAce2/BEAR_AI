# BEAR AI Model Selection and Hardware Optimization Guide

This guide helps you choose the right AI models for your hardware and optimize performance for the best experience with BEAR AI.

---

## 🎯 Quick Model Recommendation

Get instant recommendations based on your current hardware:

```powershell
python -m bear_ai --suggest
```

This command automatically:
- ✅ Detects your CPU, RAM, and GPU
- ✅ Recommends compatible models
- ✅ Shows expected performance metrics
- ✅ Warns about potential limitations

---

## 🖥️ Hardware Detection and Compatibility

### Automatic Hardware Assessment

BEAR AI automatically detects your system specifications:

```powershell
# View detailed hardware information
python -m bear_ai --hardware-info
```

**Detection includes:**
- **CPU**: Cores, architecture, features
- **RAM**: Total and available memory
- **GPU**: NVIDIA/AMD cards, VRAM
- **Storage**: Available disk space
- **OS**: Version and capabilities

### Hardware Compatibility Matrix

| Hardware Tier | CPU | RAM | GPU | Recommended Models | Performance |
|---------------|-----|-----|-----|-------------------|-------------|
| **Entry** | 4-core | 8GB | Integrated | 7B Q4_0 | 2-4 tokens/sec |
| **Mid-Range** | 8-core | 16GB | GTX 1660/RTX 3060 | 7B-13B Q4_0/Q5_1 | 10-25 tokens/sec |
| **High-End** | 12-core+ | 32GB+ | RTX 3080/4070+ | 13B-30B Q5_1/Q8_0 | 30-60 tokens/sec |
| **Enthusiast** | 16-core+ | 64GB+ | RTX 4090/A6000 | 30B-70B+ | 60-100+ tokens/sec |

---

## 🧠 Model Categories and Use Cases

### By Model Size

#### 7B Models (Recommended for Most Users)
**Best for**: General chat, basic reasoning, most consumer hardware

| Model | Specialization | RAM Required | Performance |
|-------|---------------|--------------|-------------|
| `TheBloke/Mistral-7B-Instruct-v0.2-GGUF` | General purpose | 6-8GB | ⭐⭐⭐⭐⭐ |
| `TheBloke/CodeLlama-7B-Instruct-GGUF` | Code generation | 6-8GB | ⭐⭐⭐⭐ |
| `TheBloke/Llama-2-7B-Chat-GGUF` | Conversational | 6-8GB | ⭐⭐⭐⭐ |

#### 13B Models (Power Users)
**Best for**: Complex reasoning, professional work, better accuracy

| Model | Specialization | RAM Required | Performance |
|-------|---------------|--------------|-------------|
| `TheBloke/Llama-2-13B-Chat-GGUF` | Advanced chat | 12-16GB | ⭐⭐⭐⭐⭐ |
| `TheBloke/CodeLlama-13B-Instruct-GGUF` | Software development | 12-16GB | ⭐⭐⭐⭐⭐ |
| `TheBloke/vicuna-13b-v1.5-GGUF` | Research/analysis | 12-16GB | ⭐⭐⭐⭐⭐ |

#### 30B+ Models (High-End Systems)
**Best for**: Professional applications, research, maximum quality

| Model | Specialization | RAM Required | Performance |
|-------|---------------|--------------|-------------|
| `TheBloke/Llama-2-70B-Chat-GGUF` | Enterprise-grade | 48-64GB | ⭐⭐⭐⭐⭐ |
| `TheBloke/CodeLlama-34B-Instruct-GGUF` | Professional coding | 24-32GB | ⭐⭐⭐⭐⭐ |

### By Use Case

#### Legal and Professional Work
| Model | Best For | Why Recommended |
|-------|----------|-----------------|
| `TheBloke/Llama-2-13B-Chat-GGUF` | Contract analysis, legal research | Strong reasoning capabilities |
| `TheBloke/vicuna-13b-v1.5-GGUF` | Document summarization | Excellent at extracting key points |
| `TheBloke/Mistral-7B-Instruct-v0.2-GGUF` | Quick legal queries | Fast, reliable responses |

#### Software Development
| Model | Best For | Why Recommended |
|-------|----------|-----------------|
| `TheBloke/CodeLlama-13B-Instruct-GGUF` | Code generation, debugging | Purpose-built for programming |
| `TheBloke/DeepSeek-Coder-6.7B-Instruct-GGUF` | Multiple languages | Broad language support |
| `TheBloke/Magicoder-S-DS-6.7B-GGUF` | Code completion | Optimized for IDE integration |

#### Research and Analysis
| Model | Best For | Why Recommended |
|-------|----------|-----------------|
| `TheBloke/OpenHermes-2.5-Mistral-7B-GGUF` | Data analysis | Strong analytical capabilities |
| `TheBloke/dolphin-2.6-mixtral-8x7b-GGUF` | Complex research | Multiple expert models in one |
| `TheBloke/Llama-2-70B-Chat-GGUF` | Academic research | Highest quality responses |

---

## ⚡ Performance Optimization Guide

### Quantization Levels Explained

| Quantization | File Size | Quality | Speed | Best For |
|-------------|-----------|---------|-------|----------|
| **Q2_K** | Smallest | Lower | Fastest | Resource-constrained |
| **Q4_0** | Small | Good | Fast | General use (recommended) |
| **Q4_K_M** | Medium | Better | Medium | Balanced performance |
| **Q5_1** | Large | High | Slower | Quality priority |
| **Q8_0** | Largest | Highest | Slowest | Maximum accuracy |

**Recommendation**: Start with Q4_0 for best balance of size, speed, and quality.

### GPU Acceleration Settings

#### NVIDIA GPU Optimization

```powershell
# Automatically use all GPU layers
bear-chat --model model.gguf --n-gpu-layers -1

# Manually specify GPU layers (for memory management)
bear-chat --model model.gguf --n-gpu-layers 35

# Check GPU utilization
nvidia-smi
```

#### Memory Management

```powershell
# Low memory systems (8GB)
bear-chat --model model.gguf --n-ctx 2048 --n-batch 512

# High memory systems (32GB+)
bear-chat --model model.gguf --n-ctx 4096 --n-batch 1024

# Optimize for specific use case
bear-chat --model model.gguf --mlock --numa
```

### CPU Optimization

```powershell
# Match thread count to CPU cores
bear-chat --model model.gguf --n-threads 8

# For AMD CPUs, may benefit from
bear-chat --model model.gguf --n-threads 16 --n-threads-batch 8

# Enable CPU-specific optimizations
bear-chat --model model.gguf --instruct --ctx-size 4096
```

---

## 🎛️ Advanced Model Configuration

### Custom Model Assessment

```powershell
# Detailed model analysis
python -m bear_ai --assess TheBloke/Mistral-7B-Instruct-v0.2-GGUF

# Benchmark specific model
python -m bear_ai --benchmark model.q4_0.gguf

# Compare multiple models
python -m bear_ai --compare model1.gguf model2.gguf model3.gguf
```

### Performance Benchmarking

```powershell
# Quick performance test
bear-chat --benchmark --model model.gguf

# Detailed benchmark with metrics
bear-chat --benchmark --verbose --model model.gguf --n-predict 100

# Test different configurations
bear-chat --benchmark --model model.gguf --n-gpu-layers 0,20,35,-1
```

---

## 📊 Model Selection Decision Tree

```
Start Here: What's your primary use case?
│
├─ Legal/Professional Work
│  ├─ Budget system (8GB RAM) → Mistral-7B-Instruct Q4_0
│  ├─ Standard system (16GB RAM) → Llama-2-13B-Chat Q4_0
│  └─ High-end system (32GB+ RAM) → Llama-2-70B-Chat Q5_1
│
├─ Software Development
│  ├─ Learning/Hobby → CodeLlama-7B-Instruct Q4_0
│  ├─ Professional → CodeLlama-13B-Instruct Q4_K_M
│  └─ Enterprise → CodeLlama-34B-Instruct Q5_1
│
├─ Research/Analysis
│  ├─ Basic queries → Mistral-7B-Instruct Q4_0
│  ├─ Complex analysis → vicuna-13b-v1.5 Q4_K_M
│  └─ Academic research → Llama-2-70B-Chat Q8_0
│
└─ General Chat/Assistance
   ├─ Casual use → Mistral-7B-Instruct Q4_0
   ├─ Regular use → Llama-2-13B-Chat Q4_K_M
   └─ Power user → dolphin-2.6-mixtral-8x7b Q5_1
```

---

## 🔧 Hardware-Specific Optimizations

### Intel Systems
- **Best Models**: Well-optimized for all model types
- **CPU Threading**: Use all available cores
- **Memory**: Ensure adequate RAM for model + OS
- **Recommendations**: Q4_K_M quantization for best performance

### AMD Systems
- **CPU Optimization**: May benefit from specific thread configurations
- **GPU Support**: Limited; use CPU mode for reliability
- **Memory**: AMD systems often have good memory bandwidth
- **Recommendations**: Focus on CPU-optimized settings

### Apple Silicon (M1/M2/M3)
- **Native Performance**: Excellent for 7B-13B models
- **Memory Efficiency**: Unified memory architecture helps
- **GPU Acceleration**: Limited support; CPU mode recommended
- **Recommendations**: Use Metal-optimized builds when available

### Laptop Considerations
- **Thermal Throttling**: Monitor temperatures during long sessions
- **Battery Life**: GPU acceleration significantly impacts battery
- **Performance Modes**: Use "High Performance" power plan
- **Recommendations**: Smaller models (7B) for mobile use

---

## 📱 Model Management

### Download Optimization

```powershell
# Download with resume capability
python -m bear_ai TheBloke/Mistral-7B-Instruct-v0.2-GGUF model.q4_0.gguf --resume

# Download multiple quantizations
python -m bear_ai TheBloke/Mistral-7B-Instruct-v0.2-GGUF --download-all

# Check download integrity
python -m bear_ai --verify model.q4_0.gguf
```

### Storage Management

```powershell
# View model storage usage
python -m bear_ai --storage-info

# Clean up unused models
python -m bear_ai --cleanup

# Move models to different location
python -m bear_ai --move-models /path/to/new/location
```

### Model Switching

```powershell
# Hot-swap models in GUI
# File → Switch Model → Select new model

# Command line model switching
bear-chat --model model1.gguf  # Start with first model
# Ctrl+C to stop, then:
bear-chat --model model2.gguf  # Switch to second model
```

---

## 🎨 UI Customization for Model Selection

### GUI Enhancements

The BEAR AI GUI provides intelligent model selection:

1. **Hardware Detection**: Automatically shows compatible models
2. **Performance Indicators**: Visual performance predictions
3. **Size Warnings**: Alerts for models that may not fit
4. **Download Progress**: Real-time download status with speed
5. **Model Comparison**: Side-by-side model comparisons

### Custom Model Lists

Create custom model recommendations:

```yaml
# ~/.bear_ai/config/models.yaml
custom_recommendations:
  legal_work:
    - model: "TheBloke/Llama-2-13B-Chat-GGUF"
      files: ["llama-2-13b-chat.q4_0.gguf"]
      description: "Best for legal analysis and document review"
    
  programming:
    - model: "TheBloke/CodeLlama-13B-Instruct-GGUF" 
      files: ["codellama-13b-instruct.q4_k_m.gguf"]
      description: "Optimized for code generation and debugging"
```

---

## 📈 Performance Monitoring

### Real-Time Metrics

```powershell
# Monitor performance during inference
bear-chat --model model.gguf --show-speed --show-memory

# Detailed performance logging
bear-chat --model model.gguf --performance-log performance.json
```

### Optimization Tools

```powershell
# Analyze model performance
python -m bear_ai --analyze-performance model.gguf

# Suggest optimizations
python -m bear_ai --optimize-config model.gguf

# Generate performance report
python -m bear_ai --performance-report
```

---

## 🔍 Troubleshooting Model Issues

### Common Problems and Solutions

| Problem | Symptoms | Solution |
|---------|----------|----------|
| **Model too large** | Out of memory errors | Use smaller model or Q4_0 quantization |
| **Slow performance** | < 1 token/second | Enable GPU acceleration, reduce model size |
| **Poor quality** | Nonsensical responses | Try larger model or better quantization |
| **Won't load** | Loading errors | Verify model file integrity, check format |
| **GPU not used** | Same speed as CPU | Check CUDA installation, enable GPU layers |

### Model Validation

```powershell
# Validate model file
python -m bear_ai --validate model.gguf

# Test model functionality
bear-chat --model model.gguf --test

# Check compatibility
python -m bear_ai --compatibility-check model.gguf
```

---

## 🎯 Recommended Starter Configurations

### For New Users

```powershell
# Download recommended starter model
python -m bear_ai TheBloke/Mistral-7B-Instruct-v0.2-GGUF mistral-7b-instruct-v0.2.q4_0.gguf

# Start with basic settings
bear-chat --model mistral-7b-instruct-v0.2.q4_0.gguf --simple-mode
```

### For Power Users

```powershell
# Download high-performance model
python -m bear_ai TheBloke/Llama-2-13B-Chat-GGUF llama-2-13b-chat.q4_k_m.gguf

# Use optimized settings
bear-chat --model llama-2-13b-chat.q4_k_m.gguf --n-gpu-layers -1 --n-ctx 4096
```

### For Developers

```powershell
# Download coding-specific model
python -m bear_ai TheBloke/CodeLlama-13B-Instruct-GGUF codellama-13b-instruct.q4_k_m.gguf

# Configure for development
bear-chat --model codellama-13b-instruct.q4_k_m.gguf --instruct --temperature 0.3
```

---

**🎉 Ready to choose your model?** Use `python -m bear_ai --suggest` to get personalized recommendations based on your hardware!

*For additional help with model selection, see the [Installation Guide](INSTALLATION.md) or [Troubleshooting Guide](TROUBLESHOOTING.md).*
