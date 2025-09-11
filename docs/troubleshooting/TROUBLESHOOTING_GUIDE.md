# BEAR AI Troubleshooting Guide

## Table of Contents

1. [Quick Diagnostic Tools](#quick-diagnostic-tools)
2. [Installation Issues](#installation-issues)
3. [Performance Problems](#performance-problems)
4. [Model and Inference Issues](#model-and-inference-issues)
5. [Agent and Workflow Problems](#agent-and-workflow-problems)
6. [GUI and Interface Issues](#gui-and-interface-issues)
7. [Security and PII Issues](#security-and-pii-issues)
8. [Network and API Problems](#network-and-api-problems)
9. [System Resource Issues](#system-resource-issues)
10. [Advanced Troubleshooting](#advanced-troubleshooting)

## Quick Diagnostic Tools

### System Health Check

Run comprehensive system diagnostics:

```bash
# Quick health check
bear-ai --health-check

BEAR AI System Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

System Information:
├── Version: BEAR AI v2.0.0 ✅
├── Python: 3.11.5 ✅
├── OS: Windows 11 Pro 22H2 ✅
├── Architecture: x64 ✅
└── Installation: Complete ✅

Core Services Status:
├── Main Application: ✅ Running
├── Workflow Engine: ✅ Active
├── Agent Manager: ✅ Active
├── Model Manager: ✅ Active
├── Security Manager: ✅ Active
└── API Server: ✅ Running (Port 8000)

Resource Status:
├── CPU Usage: 23% ✅ Normal
├── Memory: 8.2GB/32GB (26%) ✅ Normal
├── Disk Space: 127GB free ✅ Adequate
├── GPU: NVIDIA RTX 4070 ✅ Available
└── Network: Localhost only ✅ Secure

Dependencies:
├── llama-cpp-python: v0.2.11 ✅
├── torch: v2.0.1+cu118 ✅
├── transformers: v4.30.2 ✅
├── tiktoken: v0.4.0 ✅
└── All requirements: Satisfied ✅

Recent Issues:
├── Errors (24h): 0 ✅
├── Warnings (24h): 2 ⚠️
├── Performance issues: None ✅
└── Security alerts: None ✅

Overall Health: ✅ EXCELLENT
```

### Log Analysis Tool

Analyze system logs for issues:

```bash
# Analyze recent logs for problems
bear-ai --analyze-logs --last 24h

Log Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analysis Period: Last 24 hours
Log Files Analyzed: 5
Total Entries: 15,247

Issue Summary:
├── Critical Errors: 0 ✅
├── Errors: 0 ✅
├── Warnings: 2 ⚠️
├── Info Messages: 15,245
└── Debug Messages: 0 (debug mode off)

Warnings Found:
⚠️ [2024-01-15 14:25:22] Model cache near capacity (85% full)
   Location: bear_ai.models.cache_manager
   Recommendation: Clear unused model cache or increase cache size

⚠️ [2024-01-15 16:45:18] Workflow timeout extended for complex task
   Location: bear_ai.workflows.coordinator
   Recommendation: Consider optimizing workflow or increasing default timeout

Performance Indicators:
├── Average Response Time: 2.3s ✅ Good
├── Memory Leaks: None detected ✅
├── GPU Utilization: 65% ✅ Optimal
└── Error Rate: 0% ✅ Excellent

Recommendations:
• Clear model cache to free up space
• Monitor workflow performance for optimization opportunities
• System operating normally overall
```

## Installation Issues

### Common Installation Problems

#### Python Version Compatibility

**Issue**: Incompatible Python version
```bash
Error: BEAR AI requires Python 3.9+ but found Python 3.8.10
```

**Solution**:
```bash
# Check current Python version
python --version

# Install Python 3.11 (recommended)
# Windows: Download from python.org
# Ubuntu: sudo apt install python3.11
# macOS: brew install python@3.11

# Verify installation
python3.11 --version

# Create virtual environment with correct Python
python3.11 -m venv bear_ai_venv
source bear_ai_venv/bin/activate  # Linux/Mac
# bear_ai_venv\Scripts\activate   # Windows

# Install BEAR AI
pip install -e ".[all]"
```

#### Dependency Conflicts

**Issue**: Package dependency conflicts
```bash
ERROR: pip's dependency resolver does not currently have a necessary feature
```

**Solution**:
```bash
# Clear pip cache
pip cache purge

# Upgrade pip
python -m pip install --upgrade pip

# Install with no dependencies first
pip install --no-deps bear-ai

# Install dependencies separately
pip install -r requirements.txt

# Or use conda for better dependency management
conda env create -f environment.yml
conda activate bear-ai
```

#### Permission Issues

**Issue**: Permission denied during installation
```bash
Permission denied: '/usr/local/lib/python3.11/site-packages/'
```

**Solution**:
```bash
# Use virtual environment (recommended)
python -m venv ~/.bear_ai_env
source ~/.bear_ai_env/bin/activate
pip install bear-ai

# Or install for user only
pip install --user bear-ai

# On Windows, run as Administrator if necessary
```

#### GPU Installation Issues

**Issue**: CUDA/GPU support not working
```bash
CUDA not available, falling back to CPU
```

**Diagnostic**:
```bash
# Check CUDA installation
nvidia-smi

# Check PyTorch CUDA support
python -c "import torch; print(torch.cuda.is_available())"

# Check llama-cpp-python GPU support
python -c "from llama_cpp import Llama; print('GPU support available')"
```

**Solution**:
```bash
# Reinstall with CUDA support
pip uninstall llama-cpp-python
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121

# Verify CUDA toolkit version matches
nvcc --version

# Update GPU drivers if necessary
# NVIDIA: Download from nvidia.com/drivers
```

### Installation Validation

```bash
# Comprehensive installation validation
bear-ai --validate-install

Installation Validation Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Environment Validation:
├── Python Version: 3.11.5 ✅ Compatible
├── Virtual Environment: Active ✅ Isolated
├── Package Installation: Complete ✅
├── GPU Support: Available ✅ CUDA 11.8
└── Dependencies: All satisfied ✅

Core Functionality:
├── Import bear_ai: ✅ Success
├── Configuration loading: ✅ Success  
├── Model manager: ✅ Initialized
├── Agent system: ✅ Ready
├── GUI components: ✅ Available
└── API server: ✅ Can start

Performance Test:
├── Model loading: ✅ 12.3s (acceptable)
├── Text generation: ✅ 24.5 tokens/s
├── Memory usage: ✅ 4.2GB allocated
├── GPU utilization: ✅ 78%
└── Response time: ✅ 2.1s average

Installation Status: ✅ COMPLETE AND VERIFIED
Ready for use: ✅ YES
```

## Performance Problems

### Slow Response Times

**Symptoms**:
- Queries taking too long to process
- GUI interface sluggish
- Timeout errors

**Diagnostic**:
```bash
# Performance profiling
bear-ai --profile --duration 300

Performance Profile (5-minute sample)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bottleneck Analysis:
├── Model Loading: 45% of time ⚠️ Slow
├── Text Generation: 35% of time ✅ Normal
├── Post-processing: 15% of time ✅ Fast
├── I/O Operations: 5% of time ✅ Fast
└── Other: <1% ✅ Minimal

Resource Utilization:
├── CPU: 85% average ⚠️ High
├── Memory: 28.5GB/32GB ⚠️ High
├── GPU: 45% ⚠️ Underutilized
├── Disk I/O: 45 MB/s ✅ Normal
└── Network: Local only ✅

Performance Issues Detected:
⚠️ Model loading from slow storage
⚠️ CPU-bound operations limiting GPU usage
⚠️ Memory near capacity affecting performance

Recommendations:
• Move models to faster SSD storage
• Enable GPU acceleration for more operations
• Increase system memory or use smaller models
• Consider model quantization for speed
```

**Solutions**:

1. **Storage Optimization**:
```bash
# Move models to SSD
mkdir /fast_ssd/bear_ai_models
mv ~/.bear_ai/models/* /fast_ssd/bear_ai_models/

# Update configuration
bear-ai --config --set models.model_directory /fast_ssd/bear_ai_models
```

2. **Model Optimization**:
```bash
# Use quantized models for speed
bear-ai --model-download mistral-7b-instruct-q4  # 4-bit quantization
bear-ai --model-download mistral-7b-instruct-q8  # 8-bit quantization

# Enable GPU acceleration
bear-ai --config --set models.gpu_acceleration true
bear-ai --config --set models.gpu_layers 35
```

3. **Resource Allocation**:
```bash
# Adjust memory limits
bear-ai --config --set core.max_memory_usage "24GB"

# Optimize thread usage
bear-ai --config --set models.cpu_threads 8
bear-ai --config --set models.batch_threads 4

# Enable caching
bear-ai --config --set performance.enable_response_cache true
```

### High Memory Usage

**Symptoms**:
- System running out of memory
- Slow performance
- Application crashes

**Diagnostic**:
```bash
# Memory usage analysis
bear-ai --memory-analysis

Memory Usage Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

System Memory: 32GB total
Available: 2.1GB (7%) ⚠️ Critical

Memory Allocation:
├── BEAR AI Application: 18.5GB (58%) ⚠️
│   ├── Loaded Models: 12.2GB
│   ├── Agent Memory: 3.8GB
│   ├── Document Cache: 1.8GB
│   ├── Vector Store: 0.5GB
│   └── Other: 0.2GB
├── Operating System: 8.2GB (26%)
├── Other Applications: 3.1GB (10%)
└── Available: 2.2GB (7%) ⚠️ Low

Largest Memory Consumers:
├── mistral-7b-instruct: 8.2GB
├── sentence-transformers: 2.8GB
├── Agent coordination: 1.2GB
├── Document processing: 0.9GB
└── GUI interface: 0.4GB

Memory Leaks Detected:
⚠️ Agent memory growing over time
⚠️ Document cache not releasing old files

Recommendations:
• Unload unused models
• Clear document cache
• Restart agents periodically
• Use model quantization
• Increase virtual memory
```

**Solutions**:

1. **Model Memory Management**:
```bash
# Unload unused models
bear-ai --model-unload mistral-70b-instruct
bear-ai --model-unload all-unused

# Use smaller or quantized models
bear-ai --model-download mistral-7b-instruct-q4  # Uses ~4GB vs 14GB
```

2. **Cache Management**:
```bash
# Clear document cache
bear-ai --cache-clear --documents

# Configure cache limits
bear-ai --config --set performance.cache_size "1GB"
bear-ai --config --set performance.max_cached_documents 100
```

3. **Agent Memory Management**:
```bash
# Restart agents periodically
bear-ai --agents-restart --all

# Reduce concurrent agents
bear-ai --config --set workflows.max_concurrent_agents 4
```

## Model and Inference Issues

### Model Loading Problems

**Issue**: Models fail to load
```bash
Error: Failed to load model: mistral-7b-instruct.gguf
FileNotFoundError: Model file not found
```

**Diagnostic**:
```bash
# Check model status
bear-ai --model-status

Model Status Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Model Directory: /home/user/.bear_ai/models
Directory Exists: ✅ Yes
Directory Permissions: ✅ Read/Write

Available Models:
├── mistral-7b-instruct-q4.gguf
│   ├── Size: 4.2GB ✅
│   ├── Checksum: Valid ✅
│   ├── Format: GGUF v3 ✅
│   └── Status: Ready to load ✅
├── sentence-transformers-384.gguf
│   ├── Size: 250MB ✅
│   ├── Status: Ready ✅
└── [No other models found]

Issues Detected:
❌ mistral-7b-instruct.gguf - File not found
❌ Default model path configured incorrectly

Configuration:
├── Default Model: mistral-7b-instruct.gguf ❌ Not found
├── Model Directory: ~/.bear_ai/models ✅ Correct
└── Auto Download: Disabled ⚠️

Recommendations:
• Download missing model or update configuration
• Enable auto-download for missing models
• Verify model file naming conventions
```

**Solutions**:

1. **Download Missing Models**:
```bash
# Download model automatically
bear-ai --model-download mistral-7b-instruct

# Or manually specify model ID
bear-ai --model-download microsoft/DialoGPT-medium --save-as mistral-7b-instruct.gguf
```

2. **Fix Configuration**:
```bash
# Update default model to available model
bear-ai --config --set models.default_model mistral-7b-instruct-q4

# Enable auto-download
bear-ai --config --set models.auto_download true
```

3. **Model Path Issues**:
```bash
# Check and fix model paths
bear-ai --model-verify --fix-paths

# Manually set model directory
bear-ai --config --set models.model_directory "/path/to/models"
```

### Inference Quality Issues

**Issue**: Poor quality responses or hallucinations

**Diagnostic**:
```bash
# Test model quality
bear-ai --model-test --comprehensive

Model Quality Assessment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Model: mistral-7b-instruct-q4
Test Suite: Legal Domain

Coherence Tests:
├── Factual Accuracy: 87% ✅ Good
├── Legal Reasoning: 82% ✅ Good  
├── Consistency: 79% ⚠️ Fair
├── Relevance: 91% ✅ Excellent
└── Hallucination Rate: 8% ⚠️ Acceptable

Performance Metrics:
├── Response Quality: 8.2/10 ✅
├── Domain Knowledge: 7.8/10 ✅
├── Instruction Following: 8.9/10 ✅
└── Overall Score: 8.1/10 ✅

Issues Identified:
⚠️ Occasional inconsistent legal citations
⚠️ Some hallucinated case references
⚠️ Temperature setting may be too high for legal work

Current Settings:
├── Temperature: 0.8 ⚠️ High for legal
├── Top-p: 0.9 ✅ Appropriate
├── Max Tokens: 2000 ✅ Suitable
└── Repetition Penalty: 1.1 ✅ Good

Recommendations:
• Lower temperature to 0.3-0.4 for legal work
• Add legal-specific stop sequences
• Consider fine-tuned legal model
• Enable fact-checking validation
```

**Solutions**:

1. **Parameter Tuning**:
```bash
# Adjust generation parameters for better quality
bear-ai --config --set models.generation.temperature 0.3
bear-ai --config --set models.generation.top_p 0.8
bear-ai --config --set models.generation.repeat_penalty 1.15

# Add legal-specific stop sequences
bear-ai --config --set models.generation.stop_sequences '["[END]", "DISCLAIMER:", "Note:"]'
```

2. **Model Selection**:
```bash
# Use higher-quality model
bear-ai --model-download mistral-7b-instruct-q8  # Higher precision
bear-ai --model-download llama-2-7b-chat  # Alternative model

# Enable model comparison
bear-ai --config --set models.enable_model_comparison true
```

3. **Validation Enhancement**:
```bash
# Enable response validation
bear-ai --config --set workflows.enable_validation true
bear-ai --config --set workflows.validation_threshold 0.8

# Add fact-checking agent
bear-ai --agent-create fact_checker --type validator --specialization legal_facts
```

## Agent and Workflow Problems

### Agent Communication Issues

**Issue**: Agents not coordinating properly
```bash
Warning: Agent coordination timeout
Error: No response from executor agent
```

**Diagnostic**:
```bash
# Agent communication diagnostic
bear-ai --agent-diagnostic --communication

Agent Communication Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Active Agents: 5
Coordinator Agents: 1
Executor Agents: 3  
Validator Agents: 1

Communication Matrix:
├── Coordinator → Executor_1: ✅ Healthy (2.3ms latency)
├── Coordinator → Executor_2: ⚠️ Slow (15.7ms latency)
├── Coordinator → Executor_3: ❌ Failed (timeout)
├── Coordinator → Validator: ✅ Healthy (1.8ms latency)
└── Inter-agent messages: 247 sent, 244 received ⚠️

Issues Detected:
❌ Executor_3 not responding to coordination messages
⚠️ Executor_2 experiencing high latency
⚠️ 3 messages lost or delayed

Agent Status:
├── legal_coordinator: ✅ Active, load: 45%
├── document_processor: ✅ Active, load: 23%
├── legal_analyzer: ⚠️ High load: 89%
├── risk_assessor: ❌ Unresponsive
└── quality_validator: ✅ Active, load: 12%

Recommendations:
• Restart unresponsive agents
• Reduce load on high-utilization agents
• Check network/IPC configuration
• Increase coordination timeouts
```

**Solutions**:

1. **Restart Problem Agents**:
```bash
# Restart specific agent
bear-ai --agent-restart risk_assessor

# Restart all agents
bear-ai --agent-restart --all

# Check agent health after restart
bear-ai --agent-health-check
```

2. **Load Balancing**:
```bash
# Distribute load more evenly
bear-ai --config --set workflows.load_balancing true

# Add additional executor agents
bear-ai --agent-create legal_analyzer_2 --type executor --copy-from legal_analyzer

# Reduce max concurrent tasks per agent
bear-ai --config --set agents.max_concurrent_tasks 3
```

3. **Timeout Configuration**:
```bash
# Increase coordination timeouts
bear-ai --config --set workflows.coordination_timeout 600
bear-ai --config --set agents.response_timeout 120

# Enable retry mechanisms
bear-ai --config --set workflows.retry_attempts 5
```

### Workflow Execution Failures

**Issue**: Workflows failing or hanging

**Diagnostic**:
```bash
# Workflow execution analysis
bear-ai --workflow-diagnostic --execution-analysis

Workflow Execution Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recent Workflows (24h): 45
Completed Successfully: 38 (84%) ✅
Failed: 5 (11%) ⚠️
Still Running: 2 (4%) ⚠️

Failure Analysis:
├── Agent timeouts: 3 failures
├── Resource exhaustion: 1 failure
├── Configuration errors: 1 failure
└── Unknown errors: 0

Long-Running Workflows:
├── "Complex Contract Analysis" - Running 45 minutes ⚠️
│   ├── Status: Step 4 of 7
│   ├── Current Agent: legal_analyzer
│   └── Progress: 57%
├── "Document Batch Processing" - Running 32 minutes ⚠️
    ├── Status: Step 8 of 12
    ├── Current Agent: document_processor
    └── Progress: 67%

Common Failure Patterns:
⚠️ Large documents causing memory issues
⚠️ Complex legal analysis taking too long
⚠️ Agent coordination failures under load

Recommendations:
• Increase workflow timeouts for complex tasks
• Split large documents into chunks
• Add memory management to workflows
• Implement progress checkpointing
```

**Solutions**:

1. **Workflow Optimization**:
```bash
# Increase timeouts for complex workflows
bear-ai --workflow-template-update legal_document_review --timeout 1800

# Enable workflow checkpointing
bear-ai --config --set workflows.enable_checkpointing true

# Split large tasks into smaller chunks
bear-ai --config --set workflows.max_task_size "10MB"
```

2. **Resource Management**:
```bash
# Set resource limits per workflow
bear-ai --config --set workflows.memory_limit_per_workflow "4GB"
bear-ai --config --set workflows.max_execution_time 3600

# Enable automatic cleanup
bear-ai --config --set workflows.auto_cleanup_failed true
```

3. **Error Recovery**:
```bash
# Enable automatic retry with backoff
bear-ai --config --set workflows.retry_strategy "exponential_backoff"

# Add failure notification
bear-ai --config --set workflows.notify_on_failure true

# Configure graceful degradation
bear-ai --config --set workflows.allow_partial_completion true
```

## GUI and Interface Issues

### GUI Not Starting

**Issue**: GUI fails to launch or crashes immediately

**Diagnostic**:
```bash
# GUI diagnostic
bear-ai --gui-diagnostic

GUI System Diagnostic
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Display System:
├── Display Available: ✅ Yes
├── Display Server: X11 ✅ Running
├── Screen Resolution: 1920x1080 ✅
├── Color Depth: 24-bit ✅
└── Graphics Driver: NVIDIA 525.60.11 ✅

GUI Framework Status:
├── tkinter: ✅ Available
├── customtkinter: ✅ Installed (v5.2.0)
├── PIL (Pillow): ✅ Available (v9.5.0)
├── matplotlib: ✅ Available (v3.7.1)
└── PyQt6: ⚠️ Not installed (optional)

Font System:
├── System Fonts: ✅ Available
├── Font Cache: ✅ Valid
├── Unicode Support: ✅ Complete
└── Font Rendering: ✅ Normal

Window Manager:
├── Window Manager: GNOME Shell ✅
├── Compositing: ✅ Enabled
├── Acceleration: ✅ Hardware
└── Multi-monitor: Single display ✅

Issues Detected:
⚠️ Missing optional PyQt6 for advanced interface
✅ All required components available

Recommendations:
• GUI should work with current setup
• Install PyQt6 for enhanced interface options
• Check for specific error messages in logs
```

**Solutions**:

1. **Install Missing Dependencies**:
```bash
# Install GUI dependencies
pip install tkinter  # Usually included with Python
pip install customtkinter pillow matplotlib

# Optional advanced GUI
pip install PyQt6

# Verify GUI libraries
python -c "import tkinter; print('tkinter OK')"
python -c "import customtkinter; print('customtkinter OK')"
```

2. **Display Issues**:
```bash
# Linux: Fix display connection
export DISPLAY=:0.0
xhost +local:

# Check if running in SSH
if [ -n "$SSH_CONNECTION" ]; then
    echo "Running via SSH - enable X11 forwarding"
    echo "ssh -X user@host"
fi

# WSL: Install X11 server
# Download and install VcXsrv or Xming
export DISPLAY=:0
```

3. **Launch Alternative Interfaces**:
```bash
# Try different GUI modes
bear-ai --gui simple          # Simple tkinter interface
bear-ai --gui modern          # CustomTkinter interface
bear-ai --gui web            # Web-based interface
bear-ai --gui --debug        # Debug mode with verbose output
```

### Interface Performance Issues

**Issue**: GUI slow or unresponsive

**Solutions**:
```bash
# Reduce GUI resource usage
bear-ai --config --set gui.theme light        # Light theme uses less resources
bear-ai --config --set gui.animations false   # Disable animations
bear-ai --config --set gui.refresh_rate 30    # Lower refresh rate

# Enable hardware acceleration
bear-ai --config --set gui.hardware_acceleration true

# Limit concurrent operations in GUI
bear-ai --config --set gui.max_concurrent_operations 3
```

## Security and PII Issues

### PII Detection Problems

**Issue**: PII not being detected or incorrectly flagged

**Diagnostic**:
```bash
# PII detection diagnostic
bear-ai --pii-diagnostic --test-patterns

PII Detection System Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detection Engine: presidio-analyzer v2.2.33 ✅
Model Status: All models loaded ✅

Built-in Patterns:
├── Names: ✅ Active (confidence: 0.85)
├── SSN: ✅ Active (confidence: 0.95)  
├── Email: ✅ Active (confidence: 0.90)
├── Phone: ✅ Active (confidence: 0.85)
├── Credit Cards: ✅ Active (confidence: 0.90)
├── Addresses: ✅ Active (confidence: 0.80)
└── Custom Patterns: 3 loaded ✅

Test Results:
├── "John Doe": ✅ Detected as PERSON (confidence: 0.95)
├── "john@email.com": ✅ Detected as EMAIL (confidence: 1.0)
├── "123-45-6789": ✅ Detected as SSN (confidence: 0.98)
├── "555-123-4567": ✅ Detected as PHONE (confidence: 0.92)
├── "Case No. 2024-001": ⚠️ Not detected (custom pattern needed)

Issues Identified:
⚠️ Legal case numbers not detected
⚠️ Attorney bar numbers not recognized  
⚠️ Client ID patterns not configured

Custom Pattern Status:
├── Legal case numbers: ❌ Not configured
├── Attorney bar numbers: ❌ Not configured
├── Court file numbers: ❌ Not configured
└── Client matter codes: ❌ Not configured

Recommendations:
• Add custom patterns for legal-specific PII
• Adjust confidence thresholds as needed
• Test with sample legal documents
• Enable context-aware detection
```

**Solutions**:

1. **Add Custom PII Patterns**:
```bash
# Add legal-specific PII patterns
bear-ai --pii-add-pattern \
  --name "case_number" \
  --pattern "Case\s+No\.?\s+(\d{4}-\d{3,6})" \
  --confidence 0.9

bear-ai --pii-add-pattern \
  --name "attorney_bar" \
  --pattern "Bar\s+#?\s*(\d{5,8})" \
  --confidence 0.95

bear-ai --pii-add-pattern \
  --name "client_id" \
  --pattern "Client\s+ID:?\s+([A-Z]{2,3}\d{4,6})" \
  --confidence 0.9
```

2. **Adjust Detection Sensitivity**:
```bash
# Lower thresholds for better detection
bear-ai --config --set security.pii_detection.min_confidence 0.7

# Enable context-aware detection
bear-ai --config --set security.pii_detection.use_context true

# Adjust specific pattern thresholds
bear-ai --pii-config --pattern email --confidence 0.85
```

3. **Test and Validate**:
```bash
# Test PII detection with sample text
bear-ai --pii-test --text "Attorney John Smith (Bar #123456) represents client ABC123 in Case No. 2024-001234"

# Batch test with documents
bear-ai --pii-test --batch --directory ./test_documents/

# Generate PII detection report
bear-ai --pii-report --accuracy-analysis
```

### Security Access Issues

**Issue**: Authentication or authorization problems

**Solutions**:
```bash
# Reset security configuration
bear-ai --security-reset --preserve-data

# Check access permissions
bear-ai --security-check --user-permissions

# Update access control policies
bear-ai --security-update --policy access_control.yaml

# Generate new security tokens
bear-ai --security-token --generate --expires 7d
```

## Network and API Problems

### API Connection Issues

**Issue**: Cannot connect to BEAR AI API

**Diagnostic**:
```bash
# API connectivity diagnostic
bear-ai --api-diagnostic

API System Diagnostic
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API Server Status:
├── Server Running: ✅ Yes
├── Port: 8000 ✅ Open
├── Protocol: HTTP/1.1 ✅
├── Binding: 127.0.0.1:8000 ✅ Localhost only
└── SSL/TLS: ❌ Disabled (local only)

Connectivity Tests:
├── Localhost (127.0.0.1): ✅ Reachable
├── Health endpoint: ✅ Responding (200 OK)
├── Auth endpoint: ✅ Available
├── Workflows endpoint: ✅ Available
└── Models endpoint: ✅ Available

Network Configuration:
├── Firewall: ✅ Allowing localhost
├── Port conflicts: ❌ None detected
├── Network interfaces: ✅ Loopback active
└── DNS resolution: ✅ Working

Client Tools:
├── curl available: ✅ Yes
├── Python requests: ✅ Available
├── API client libraries: ✅ Installed
└── Authentication tokens: ✅ Valid

Performance Metrics:
├── Response time: 45ms ✅ Fast
├── Throughput: 450 req/min ✅ Good
├── Concurrent connections: 12/100 ✅ Normal
└── Memory usage: 256MB ✅ Low

Issues Detected: None ✅
API Status: ✅ FULLY OPERATIONAL
```

**Solutions**:

1. **Start API Server**:
```bash
# Start API server manually
bear-ai --api-server --start --port 8000

# Start with custom configuration
bear-ai --api-server --config api_config.yaml

# Enable debug mode
bear-ai --api-server --debug --verbose
```

2. **Port Configuration**:
```bash
# Check port availability
netstat -an | grep 8000

# Use different port if needed
bear-ai --api-server --port 8001

# Configure port in settings
bear-ai --config --set api.port 8001
```

3. **Network Troubleshooting**:
```bash
# Test API connectivity
curl -X GET http://127.0.0.1:8000/api/v1/health

# Test with authentication
curl -X POST http://127.0.0.1:8000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}'

# Check firewall rules (Linux)
sudo iptables -L | grep 8000

# Windows: Check Windows Firewall settings
```

### Rate Limiting Issues

**Issue**: API requests being rate limited

**Solutions**:
```bash
# Adjust rate limits
bear-ai --config --set api.rate_limit.requests_per_minute 1000
bear-ai --config --set api.rate_limit.burst_size 100

# Disable rate limiting (development only)
bear-ai --config --set api.rate_limit.enabled false

# Check current rate limit status
bear-ai --api-status --rate-limits
```

## System Resource Issues

### Disk Space Problems

**Issue**: Running out of disk space

**Diagnostic**:
```bash
# Disk usage analysis
bear-ai --disk-analysis

Disk Usage Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

System Disk Usage:
├── Total Capacity: 500GB
├── Available Space: 15GB (3%) ⚠️ Critical
├── Used Space: 485GB (97%)
└── Warning Threshold: 10% (50GB)

BEAR AI Storage Usage:
├── Models: 45.2GB (90% of BEAR AI data)
│   ├── mistral-7b-instruct: 8.2GB
│   ├── llama-2-13b-chat: 12.8GB  
│   ├── gpt4all-13b: 7.9GB
│   ├── sentence-transformers: 2.1GB
│   └── Other models: 14.2GB
├── Documents: 3.8GB
├── Cache: 2.4GB
├── Logs: 0.8GB
├── Vector Database: 1.2GB
└── Other: 0.6GB

Cleanup Opportunities:
├── Unused models: 18.3GB ✅ Can remove
├── Old document cache: 1.2GB ✅ Can clear
├── Temporary files: 0.9GB ✅ Can delete
├── Old log files: 0.6GB ✅ Can archive
└── Orphaned files: 0.3GB ✅ Can remove

Recommendations:
• Remove unused models immediately
• Clear document and response caches
• Set up automatic cleanup policies
• Consider moving models to external storage
• Archive old logs and audit trails
```

**Solutions**:

1. **Emergency Cleanup**:
```bash
# Quick cleanup to free space
bear-ai --cleanup --emergency

Emergency Cleanup Process
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cleanup Actions:
[1/6] Removing unused models... ✅ 18.3GB freed
[2/6] Clearing document cache... ✅ 1.2GB freed  
[3/6] Deleting temporary files... ✅ 0.9GB freed
[4/6] Archiving old logs... ✅ 0.6GB freed
[5/6] Removing orphaned files... ✅ 0.3GB freed
[6/6] Optimizing database... ✅ 0.4GB freed

Total Space Freed: 21.7GB
Available Space: 36.7GB (7.3%)
Status: ✅ CRITICAL LEVEL RESOLVED
```

2. **Configure Automatic Cleanup**:
```bash
# Enable automatic cleanup
bear-ai --config --set storage.auto_cleanup true
bear-ai --config --set storage.cleanup_interval "daily"
bear-ai --config --set storage.keep_unused_models false

# Set storage limits
bear-ai --config --set storage.max_total_size "100GB"
bear-ai --config --set storage.max_cache_size "5GB"
bear-ai --config --set storage.max_log_size "1GB"
```

3. **Move Data to External Storage**:
```bash
# Move models to external drive
mkdir /external_drive/bear_ai_models
bear-ai --migrate-storage --models --to /external_drive/bear_ai_models

# Update configuration
bear-ai --config --set models.model_directory /external_drive/bear_ai_models

# Verify new configuration
bear-ai --verify-storage --all
```

### Memory Leaks

**Issue**: Memory usage continuously growing

**Diagnostic**:
```bash
# Memory leak detection
bear-ai --memory-leak-detection --duration 1800

Memory Leak Detection (30-minute monitoring)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Memory Growth Analysis:
├── Start Memory: 8.2GB
├── End Memory: 12.7GB
├── Growth Rate: +4.5GB over 30min ⚠️ Leak detected
├── Peak Memory: 13.1GB
└── Average Growth: +150MB/min ⚠️ Significant

Leak Sources Identified:
├── Agent Memory: +2.1GB ⚠️ Major leak
│   ├── Task history accumulation
│   ├── Context memory not cleared
│   └── Inter-agent message queues growing
├── Model Memory: +1.2GB ⚠️ Moderate leak  
│   ├── KV cache not releasing
│   └── Tokenizer memory growing
├── Document Processing: +0.8GB ⚠️ Minor leak
│   ├── Temporary files not cleaned
│   └── OCR memory not released
└── Other Components: +0.4GB ⚠️ Minor

Memory Hotspots:
├── legal_analyzer agent: 3.2GB (+800MB/hr)
├── document_processor: 2.1GB (+400MB/hr)
├── coordinator agent: 1.8GB (+200MB/hr)
└── Model cache: 4.8GB (+600MB/hr)

Recommendations:
• Implement memory cleanup in agent lifecycles
• Clear model KV cache periodically
• Add memory limits to prevent excessive growth
• Restart long-running agents periodically
```

**Solutions**:

1. **Immediate Memory Recovery**:
```bash
# Force garbage collection
bear-ai --memory-cleanup --force-gc

# Restart memory-heavy components
bear-ai --restart-agents --high-memory-only
bear-ai --restart-models --reload-fresh

# Clear all caches
bear-ai --clear-cache --all
```

2. **Prevent Future Leaks**:
```bash
# Configure memory limits
bear-ai --config --set agents.memory_limit_per_agent "2GB"
bear-ai --config --set agents.restart_on_memory_limit true

# Enable periodic cleanup
bear-ai --config --set memory.periodic_cleanup true
bear-ai --config --set memory.cleanup_interval 3600  # 1 hour

# Limit context memory
bear-ai --config --set agents.max_context_history 100
bear-ai --config --set models.max_kv_cache_size "1GB"
```

3. **Monitor Memory Usage**:
```bash
# Enable memory monitoring
bear-ai --config --set monitoring.memory_tracking true
bear-ai --config --set monitoring.memory_alert_threshold "80%"

# Set up memory alerts
bear-ai --alerts --setup memory_usage --email admin@company.com
```

## Advanced Troubleshooting

### Debug Mode and Logging

Enable detailed debugging for complex issues:

```bash
# Enable comprehensive debugging
bear-ai --debug --verbose --log-level DEBUG

# Enable component-specific debugging
bear-ai --debug --components agents,workflows,models

# Trace specific operations
bear-ai --trace --operation workflow_execution --workflow-id wf_12345

# Generate debug report
bear-ai --debug-report --include-logs --include-configs --compress
```

### Performance Profiling

Deep performance analysis:

```bash
# CPU profiling
bear-ai --profile cpu --duration 300 --output cpu_profile.prof

# Memory profiling
bear-ai --profile memory --track-allocations --output memory_profile.prof

# I/O profiling
bear-ai --profile io --track-disk --track-network --output io_profile.prof

# Combined profiling
bear-ai --profile all --comprehensive --output full_profile.prof
```

### System Integration Issues

**Issue**: BEAR AI not integrating properly with system

**Solutions**:
```bash
# System integration diagnostic
bear-ai --system-integration --diagnose

# Fix common integration issues
bear-ai --system-integration --fix-permissions
bear-ai --system-integration --update-paths
bear-ai --system-integration --register-protocols

# Validate system integration
bear-ai --system-integration --validate-all
```

### Recovery Procedures

For severe system failures:

```bash
# Safe mode startup
bear-ai --safe-mode --minimal-config

# Recovery mode with diagnostics
bear-ai --recovery --full-diagnostic --repair-config

# Reset to factory defaults (preserves user data)
bear-ai --factory-reset --preserve-data --confirm

# Complete system restoration from backup
bear-ai --restore --from-backup backup_20240115.tar.gz --full-restore
```

This troubleshooting guide provides comprehensive solutions for common and complex BEAR AI issues. For additional support, use the built-in diagnostic tools and consult the community forums or professional support channels.