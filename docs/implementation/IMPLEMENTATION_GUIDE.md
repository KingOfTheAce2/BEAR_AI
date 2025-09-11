# BEAR AI Implementation Guide

## Table of Contents

1. [Overview](#overview)
2. [System Prerequisites](#system-prerequisites)
3. [Step-by-Step Integration](#step-by-step-integration)
4. [Configuration Files](#configuration-files)
5. [Code Examples](#code-examples)
6. [Migration Roadmap](#migration-roadmap)
7. [Integration Testing](#integration-testing)
8. [Deployment Strategies](#deployment-strategies)

## Overview

This guide provides comprehensive instructions for implementing and integrating BEAR AI into existing systems and workflows. BEAR AI is designed as a privacy-first, local-only AI assistant with advanced workflow orchestration capabilities.

### Key Implementation Features

- **Multi-Agent Workflow System**: Coordinate multiple AI agents for complex tasks
- **Privacy-First Architecture**: All processing happens locally
- **Modular Plugin System**: Extensible architecture for custom functionality
- **Multi-Modal Processing**: Support for text, images, audio, and documents
- **RAG Integration**: Advanced document retrieval and analysis
- **Hardware Optimization**: Automatic performance tuning

## System Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended | Enterprise |
|-----------|---------|-------------|------------|
| **CPU** | Quad-core 2.5GHz | 8-core 3.0GHz+ | 16-core 3.5GHz+ |
| **RAM** | 16GB | 32GB | 64GB+ |
| **Storage** | 50GB SSD | 200GB NVMe | 1TB NVMe |
| **GPU** | None (CPU mode) | NVIDIA RTX 4060 | NVIDIA RTX 4090 |

### Software Prerequisites

```bash
# Required software
Python 3.9+
Node.js 18+ (for web interfaces)
Git 2.30+
Docker 20.10+ (optional)

# Operating System Support
Windows 10/11 (Primary)
macOS 10.15+ (Supported)
Ubuntu 20.04+ (Supported)
```

## Step-by-Step Integration

### Phase 1: Environment Setup

#### 1.1 Clone and Initial Setup

```bash
# Clone the repository
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# Create isolated environment
python -m venv .venv

# Activate environment
# Windows
.\.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

# Verify Python version
python --version  # Should be 3.9+
```

#### 1.2 Install Core Dependencies

```bash
# Install base package
pip install -e .

# Install with all features
pip install -e ".[all]"

# Verify installation
python -c "import bear_ai; print('✅ BEAR AI installed successfully')"
```

#### 1.3 Hardware Detection and Optimization

```bash
# Run hardware assessment
python -m bear_ai.hw --assess

# Generate hardware profile
python -m bear_ai.hw --suggest > hardware_profile.json

# Apply optimizations
python -m bear_ai.hw --optimize
```

### Phase 2: Configuration

#### 2.1 Create Configuration Structure

```bash
# Create configuration directory
mkdir -p ~/.bear_ai/{config,models,logs,plugins,workflows}

# Set permissions (Unix-like systems)
chmod 755 ~/.bear_ai
chmod 600 ~/.bear_ai/config/*
```

#### 2.2 Base Configuration File

Create `~/.bear_ai/config/bear_ai.yaml`:

```yaml
# BEAR AI Configuration
version: "2.0"
environment: "production"  # development, staging, production

# Core settings
core:
  privacy_mode: true
  audit_logging: true
  local_only: true
  max_memory_usage: "16GB"

# Model settings
models:
  default_model: "mistral-7b-instruct"
  model_directory: "~/.bear_ai/models"
  auto_download: false
  gpu_acceleration: true
  quantization: "q4_0"

# Workflow settings
workflows:
  max_concurrent_agents: 8
  coordination_timeout: 300
  retry_attempts: 3
  agent_memory_limit: "2GB"

# Security settings
security:
  pii_detection: true
  data_encryption: true
  secure_deletion: true
  access_logging: true

# API settings
api:
  enable_server: true
  host: "127.0.0.1"
  port: 8000
  cors_enabled: false
  rate_limiting: true

# Plugin settings
plugins:
  enabled: true
  auto_load: true
  plugin_directory: "~/.bear_ai/plugins"
  security_scan: true
```

### Phase 3: Model Setup

#### 3.1 Download and Configure Models

```python
# model_setup.py
from bear_ai.download import ModelDownloader
from bear_ai.hardware_profiles import get_recommended_models

def setup_models():
    """Download and configure recommended models"""
    
    # Get hardware-optimized recommendations
    recommendations = get_recommended_models()
    
    downloader = ModelDownloader()
    
    for model in recommendations['recommended']:
        print(f"Downloading {model['name']}...")
        
        success = downloader.download_model(
            model_id=model['hf_id'],
            save_path=f"~/.bear_ai/models/{model['name']}.gguf",
            quantization=model.get('quantization', 'q4_0')
        )
        
        if success:
            print(f"✅ Successfully downloaded {model['name']}")
        else:
            print(f"❌ Failed to download {model['name']}")

if __name__ == "__main__":
    setup_models()
```

#### 3.2 Model Validation and Testing

```python
# test_models.py
from bear_ai.inference import InferenceEngine
from bear_ai.model_manager import ModelManager

def validate_models():
    """Validate downloaded models"""
    
    manager = ModelManager()
    engine = InferenceEngine()
    
    models = manager.list_available_models()
    
    for model_path in models:
        print(f"Testing {model_path}...")
        
        try:
            # Load model
            engine.load_model(model_path)
            
            # Simple test generation
            response = engine.generate(
                prompt="Hello, this is a test.",
                max_tokens=50
            )
            
            if response and len(response.strip()) > 0:
                print(f"✅ {model_path} working correctly")
            else:
                print(f"⚠️  {model_path} generated empty response")
                
        except Exception as e:
            print(f"❌ {model_path} failed: {e}")

if __name__ == "__main__":
    validate_models()
```

### Phase 4: Workflow Integration

#### 4.1 Basic Workflow Setup

```python
# workflow_setup.py
from bear_ai.workflows import WorkflowEngine, WorkflowTemplate
from bear_ai.workflows.agents import create_agent

def setup_basic_workflow():
    """Setup a basic multi-agent workflow"""
    
    # Initialize workflow engine
    engine = WorkflowEngine()
    
    # Create agents
    coordinator = create_agent("coordinator", name="Main Coordinator")
    executor = create_agent("executor", name="Task Executor")
    validator = create_agent("validator", name="Quality Validator")
    
    # Register agents
    engine.register_agent(coordinator)
    engine.register_agent(executor)
    engine.register_agent(validator)
    
    # Create workflow template
    template = WorkflowTemplate(
        name="document_analysis",
        description="Analyze documents with quality validation",
        steps=[
            {
                "id": "extract_text",
                "type": "tool_execution",
                "tool": "document_parser",
                "agent": "executor"
            },
            {
                "id": "analyze_content",
                "type": "llm_generation",
                "prompt": "Analyze this document: {extracted_text}",
                "agent": "executor"
            },
            {
                "id": "validate_analysis",
                "type": "validate",
                "criteria": {
                    "not_empty": True,
                    "min_length": 100,
                    "contains": "analysis"
                },
                "agent": "validator"
            }
        ]
    )
    
    # Register template
    engine.register_template(template)
    
    return engine

if __name__ == "__main__":
    engine = setup_basic_workflow()
    print("✅ Basic workflow setup complete")
```

#### 4.2 Advanced Workflow Example

```python
# advanced_workflow.py
import asyncio
from bear_ai.workflows import WorkflowEngine
from bear_ai.workflows.agents import CoordinatorAgent, ExecutorAgent, ValidatorAgent

async def legal_document_workflow():
    """Advanced workflow for legal document processing"""
    
    engine = WorkflowEngine()
    
    # Create specialized agents
    coordinator = CoordinatorAgent("legal_coordinator", "Legal Workflow Coordinator")
    
    # Create specialized executors
    text_extractor = ExecutorAgent(
        "text_extractor", 
        "Text Extraction Specialist",
        specializations=["pdf_processing", "ocr", "text_extraction"]
    )
    
    legal_analyzer = ExecutorAgent(
        "legal_analyzer",
        "Legal Analysis Specialist", 
        specializations=["legal_analysis", "contract_review", "clause_extraction"]
    )
    
    privacy_scrubber = ExecutorAgent(
        "privacy_scrubber",
        "Privacy Protection Specialist",
        specializations=["pii_detection", "data_scrubbing", "privacy_compliance"]
    )
    
    quality_validator = ValidatorAgent("quality_validator", "Quality Assurance")
    
    # Register all agents
    for agent in [coordinator, text_extractor, legal_analyzer, privacy_scrubber, quality_validator]:
        engine.register_agent(agent)
        coordinator.add_agent(agent)
    
    # Define complex workflow
    workflow_definition = {
        "name": "legal_document_processing",
        "description": "Comprehensive legal document analysis with privacy protection",
        "steps": [
            {
                "id": "extract_text",
                "type": "file_operations",
                "operation": "extract_text",
                "agent_id": "text_extractor",
                "parallel": False
            },
            {
                "id": "scrub_pii",
                "type": "data_processing",
                "operation": "scrub_pii", 
                "depends_on": ["extract_text"],
                "agent_id": "privacy_scrubber",
                "parallel": True
            },
            {
                "id": "analyze_legal_content",
                "type": "llm_generation",
                "prompt": """
                Analyze this legal document for:
                1. Key contractual terms
                2. Potential risks
                3. Compliance requirements
                4. Recommendations
                
                Document content: {scrubbed_text}
                """,
                "depends_on": ["scrub_pii"],
                "agent_id": "legal_analyzer",
                "parallel": True
            },
            {
                "id": "validate_analysis",
                "type": "validate",
                "step_id": "analyze_legal_content",
                "criteria": {
                    "not_empty": True,
                    "min_length": 500,
                    "contains": ["terms", "risks", "recommendations"]
                },
                "agent_id": "quality_validator",
                "depends_on": ["analyze_legal_content"],
                "parallel": False
            }
        ]
    }
    
    # Execute workflow
    try:
        result = await engine.execute_workflow(workflow_definition)
        
        if result["status"] == "completed":
            print("✅ Legal document workflow completed successfully")
            return result["results"]
        else:
            print(f"❌ Workflow failed: {result['error']}")
            return None
            
    except Exception as e:
        print(f"❌ Workflow execution error: {e}")
        return None

# Run the workflow
if __name__ == "__main__":
    result = asyncio.run(legal_document_workflow())
    if result:
        print("Workflow Results:")
        for step_id, step_result in result.items():
            print(f"  {step_id}: {step_result['status']}")
```

### Phase 5: Plugin Development

#### 5.1 Create Custom Plugin

```python
# custom_plugin.py
from bear_ai.plugins import Plugin, PluginInterface
from bear_ai.workflows.agents import WorkflowAgent
from typing import Dict, Any, Optional

class CustomLegalPlugin(Plugin):
    """Custom plugin for legal document processing"""
    
    def __init__(self):
        super().__init__(
            name="legal_processor",
            version="1.0.0",
            description="Advanced legal document processing capabilities"
        )
    
    def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize the plugin"""
        try:
            self.legal_templates = config.get("legal_templates", {})
            self.compliance_rules = config.get("compliance_rules", [])
            
            # Register plugin-specific agents
            self._register_legal_agents()
            
            return True
        except Exception as e:
            self.logger.error(f"Failed to initialize legal plugin: {e}")
            return False
    
    def _register_legal_agents(self):
        """Register specialized legal agents"""
        from bear_ai.workflows.agents import ExecutorAgent, register_agent
        
        # Contract analysis agent
        contract_agent = ExecutorAgent(
            "contract_analyzer",
            "Contract Analysis Specialist",
            specializations=["contract_analysis", "legal_terms", "risk_assessment"]
        )
        
        # Compliance checker agent
        compliance_agent = ExecutorAgent(
            "compliance_checker", 
            "Legal Compliance Specialist",
            specializations=["regulatory_compliance", "legal_standards", "audit_preparation"]
        )
        
        register_agent(contract_agent)
        register_agent(compliance_agent)
    
    def process_legal_document(self, document_path: str, analysis_type: str = "comprehensive") -> Dict[str, Any]:
        """Process legal document with specialized analysis"""
        
        results = {
            "document_path": document_path,
            "analysis_type": analysis_type,
            "processed_at": time.time(),
            "results": {}
        }
        
        try:
            if analysis_type == "comprehensive":
                results["results"] = self._comprehensive_analysis(document_path)
            elif analysis_type == "compliance":
                results["results"] = self._compliance_analysis(document_path)
            elif analysis_type == "risk_assessment":
                results["results"] = self._risk_analysis(document_path)
            else:
                raise ValueError(f"Unknown analysis type: {analysis_type}")
                
            results["status"] = "success"
            
        except Exception as e:
            results["status"] = "error"
            results["error"] = str(e)
        
        return results
    
    def _comprehensive_analysis(self, document_path: str) -> Dict[str, Any]:
        """Perform comprehensive legal analysis"""
        # Implementation would include:
        # - Contract term extraction
        # - Risk identification
        # - Compliance verification
        # - Recommendation generation
        
        return {
            "terms_extracted": 25,
            "risks_identified": 3,
            "compliance_status": "compliant",
            "recommendations": [
                "Review liability clauses",
                "Update termination procedures",
                "Add data protection addendum"
            ]
        }
    
    def get_available_operations(self) -> List[str]:
        """Return list of available operations"""
        return [
            "process_legal_document",
            "extract_contract_terms", 
            "assess_legal_risks",
            "check_compliance",
            "generate_legal_summary"
        ]

# Plugin registration
def create_plugin() -> PluginInterface:
    """Factory function to create plugin instance"""
    return CustomLegalPlugin()
```

#### 5.2 Plugin Configuration

Create `~/.bear_ai/plugins/legal_processor/config.yaml`:

```yaml
# Legal Processor Plugin Configuration
name: "legal_processor"
version: "1.0.0"
enabled: true

# Plugin-specific settings
settings:
  analysis_depth: "comprehensive"
  risk_threshold: 0.7
  compliance_standards:
    - "GDPR"
    - "CCPA"  
    - "HIPAA"

# Legal document templates
legal_templates:
  contract:
    required_sections:
      - "parties"
      - "terms"
      - "termination"
      - "liability"
    optional_sections:
      - "amendments"
      - "dispute_resolution"

  nda:
    required_sections:
      - "confidentiality_definition"
      - "obligations"
      - "duration"
      - "remedies"

# Compliance rules
compliance_rules:
  - name: "personal_data_handling"
    type: "privacy"
    pattern: "personal.{0,10}(data|information)"
    severity: "high"
    
  - name: "liability_limitation" 
    type: "contract"
    pattern: "limit.{0,20}liability"
    severity: "medium"
```

## Configuration Files

### Main Configuration Templates

#### Development Environment

```yaml
# ~/.bear_ai/config/development.yaml
version: "2.0"
environment: "development"

core:
  privacy_mode: true
  audit_logging: true
  local_only: true
  max_memory_usage: "8GB"
  debug_mode: true

models:
  default_model: "mistral-7b-instruct-q4"
  model_directory: "./models"
  auto_download: true
  gpu_acceleration: false  # CPU-only for development
  
workflows:
  max_concurrent_agents: 4
  coordination_timeout: 60
  retry_attempts: 1

logging:
  level: "DEBUG"
  file: "~/.bear_ai/logs/bear_ai_dev.log"
  console: true
```

#### Production Environment

```yaml
# ~/.bear_ai/config/production.yaml
version: "2.0"
environment: "production"

core:
  privacy_mode: true
  audit_logging: true
  local_only: true
  max_memory_usage: "32GB"
  debug_mode: false

models:
  default_model: "mistral-7b-instruct-q4"
  model_directory: "/opt/bear_ai/models"
  auto_download: false
  gpu_acceleration: true
  
workflows:
  max_concurrent_agents: 16
  coordination_timeout: 300
  retry_attempts: 3

security:
  pii_detection: true
  data_encryption: true
  secure_deletion: true
  access_logging: true
  
logging:
  level: "INFO"
  file: "/var/log/bear_ai/bear_ai.log"
  console: false
  rotation: "daily"
  retention: "30d"
```

## Migration Roadmap

### Timeline and Phases

#### Phase 1: Foundation (Weeks 1-2)
- [ ] Install and configure basic system
- [ ] Set up development environment
- [ ] Download and test core models
- [ ] Verify hardware optimization
- [ ] Complete basic integration testing

#### Phase 2: Core Features (Weeks 3-4) 
- [ ] Implement workflow system
- [ ] Configure multi-agent coordination
- [ ] Set up RAG document processing
- [ ] Enable PII detection and scrubbing
- [ ] Deploy basic GUI interfaces

#### Phase 3: Advanced Features (Weeks 5-6)
- [ ] Develop custom plugins
- [ ] Implement specialized workflows
- [ ] Configure advanced security features
- [ ] Set up monitoring and logging
- [ ] Performance optimization

#### Phase 4: Production Deployment (Weeks 7-8)
- [ ] Production environment setup
- [ ] Load testing and optimization
- [ ] Security audit and compliance
- [ ] User training and documentation
- [ ] Go-live and monitoring

### Migration Checklist

#### Pre-Migration
- [ ] Hardware assessment completed
- [ ] Current system backup created
- [ ] Dependencies verified
- [ ] Network and security policies reviewed
- [ ] Stakeholder training scheduled

#### During Migration
- [ ] Install BEAR AI components
- [ ] Configure environment settings
- [ ] Migrate existing workflows
- [ ] Test all integrations
- [ ] Validate security measures

#### Post-Migration
- [ ] Monitor system performance
- [ ] Verify data integrity
- [ ] Conduct user acceptance testing
- [ ] Update documentation
- [ ] Plan ongoing maintenance

## Integration Testing

### Automated Testing Suite

```python
# integration_test.py
import unittest
import asyncio
from pathlib import Path

from bear_ai.workflows import WorkflowEngine
from bear_ai.models import ModelManager
from bear_ai.plugins import PluginManager

class BearAIIntegrationTest(unittest.TestCase):
    """Comprehensive integration test suite"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test environment"""
        cls.engine = WorkflowEngine()
        cls.model_manager = ModelManager()
        cls.plugin_manager = PluginManager()
        
    def test_model_loading(self):
        """Test model loading and inference"""
        models = self.model_manager.list_available_models()
        self.assertGreater(len(models), 0, "No models available")
        
        # Test loading first available model
        model_path = models[0]
        success = self.model_manager.load_model(model_path)
        self.assertTrue(success, f"Failed to load model: {model_path}")
        
        # Test inference
        response = self.model_manager.generate_text(
            "Hello, this is a test.",
            max_tokens=50
        )
        self.assertIsNotNone(response, "Model generated no response")
        self.assertGreater(len(response.strip()), 0, "Model generated empty response")
    
    def test_workflow_execution(self):
        """Test basic workflow execution"""
        workflow = {
            "name": "test_workflow",
            "steps": [
                {
                    "id": "test_step",
                    "type": "llm_generation",
                    "prompt": "Generate a test response.",
                    "agent": "executor"
                }
            ]
        }
        
        result = asyncio.run(self.engine.execute_workflow(workflow))
        self.assertEqual(result["status"], "completed")
        self.assertIn("test_step", result["results"])
    
    def test_plugin_loading(self):
        """Test plugin system"""
        plugins = self.plugin_manager.discover_plugins()
        self.assertGreaterEqual(len(plugins), 0, "Plugin discovery failed")
        
        # Test loading built-in plugins
        builtin_plugins = self.plugin_manager.load_builtin_plugins()
        self.assertGreater(len(builtin_plugins), 0, "No built-in plugins loaded")
    
    def test_pii_detection(self):
        """Test PII detection and scrubbing"""
        from bear_ai.scrub import PIIScrubber
        
        scrubber = PIIScrubber()
        test_text = "John Doe's SSN is 123-45-6789 and email is john@example.com"
        
        result = scrubber.scrub_text(test_text)
        
        # Should not contain original PII
        self.assertNotIn("123-45-6789", result)
        self.assertNotIn("john@example.com", result)
        
        # Should contain placeholders
        self.assertIn("[SSN]", result)
        self.assertIn("[EMAIL]", result)
    
    def test_document_processing(self):
        """Test document processing capabilities"""
        from bear_ai.rag import DocumentProcessor
        
        processor = DocumentProcessor()
        
        # Test text processing
        test_doc = "This is a test document with important information."
        
        chunks = processor.chunk_document(test_doc)
        self.assertGreater(len(chunks), 0, "Document chunking failed")
        
        embeddings = processor.generate_embeddings(chunks)
        self.assertEqual(len(embeddings), len(chunks), "Embedding generation failed")

def run_integration_tests():
    """Run all integration tests"""
    unittest.main(verbosity=2)

if __name__ == "__main__":
    run_integration_tests()
```

### Performance Testing

```python
# performance_test.py
import time
import asyncio
import psutil
from bear_ai.benchmarking import BenchmarkEngine
from bear_ai.workflows import WorkflowEngine

async def performance_benchmark():
    """Run performance benchmarks"""
    
    benchmark = BenchmarkEngine()
    engine = WorkflowEngine()
    
    # Test inference performance
    inference_results = benchmark.benchmark_inference(
        model_name="mistral-7b-instruct", 
        test_prompts=["Analyze this text.", "Generate a summary.", "Extract key points."],
        iterations=10
    )
    
    print("Inference Benchmark Results:")
    print(f"  Average Time: {inference_results['avg_time']:.2f}s")
    print(f"  Tokens/Second: {inference_results['tokens_per_second']:.1f}")
    print(f"  Memory Usage: {inference_results['memory_usage']:.1f}MB")
    
    # Test workflow performance
    workflow_results = benchmark.benchmark_workflow(
        workflow_name="document_analysis",
        test_documents=["test1.pdf", "test2.docx", "test3.txt"],
        iterations=5
    )
    
    print("Workflow Benchmark Results:")
    print(f"  Average Time: {workflow_results['avg_time']:.2f}s")
    print(f"  Throughput: {workflow_results['documents_per_minute']:.1f} docs/min")
    print(f"  Success Rate: {workflow_results['success_rate']:.1f}%")

if __name__ == "__main__":
    asyncio.run(performance_benchmark())
```

## Deployment Strategies

### Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY pyproject.toml .
COPY README.md .

# Install BEAR AI
RUN pip install -e .

# Create directories
RUN mkdir -p /app/models /app/logs /app/plugins

# Set environment variables
ENV BEAR_AI_CONFIG_PATH=/app/config
ENV BEAR_AI_MODEL_PATH=/app/models
ENV BEAR_AI_LOG_PATH=/app/logs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import bear_ai; print('healthy')" || exit 1

# Run application
CMD ["python", "-m", "bear_ai.server", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  bear-ai:
    build: .
    container_name: bear-ai-app
    ports:
      - "8000:8000"
    volumes:
      - ./config:/app/config:ro
      - ./models:/app/models:rw
      - ./logs:/app/logs:rw
      - ./plugins:/app/plugins:ro
    environment:
      - BEAR_AI_ENV=production
      - BEAR_AI_CONFIG_FILE=/app/config/production.yaml
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '8.0'
          memory: 32G
        reservations:
          cpus: '4.0'
          memory: 16G
    healthcheck:
      test: ["CMD", "python", "-c", "import bear_ai; print('healthy')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bear-ai-deployment
  labels:
    app: bear-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bear-ai
  template:
    metadata:
      labels:
        app: bear-ai
    spec:
      containers:
      - name: bear-ai
        image: bear-ai:latest
        ports:
        - containerPort: 8000
        env:
        - name: BEAR_AI_ENV
          value: "production"
        - name: BEAR_AI_CONFIG_FILE
          value: "/app/config/production.yaml"
        resources:
          requests:
            memory: "16Gi"
            cpu: "4"
          limits:
            memory: "32Gi"
            cpu: "8"
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
        - name: models-volume
          mountPath: /app/models
        - name: logs-volume
          mountPath: /app/logs
      volumes:
      - name: config-volume
        configMap:
          name: bear-ai-config
      - name: models-volume
        persistentVolumeClaim:
          claimName: bear-ai-models-pvc
      - name: logs-volume
        persistentVolumeClaim:
          claimName: bear-ai-logs-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: bear-ai-service
spec:
  selector:
    app: bear-ai
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8000
  type: ClusterIP
```

This implementation guide provides a comprehensive foundation for integrating BEAR AI into existing systems. The modular architecture and extensive configuration options allow for flexible deployment scenarios while maintaining the privacy-first principles that are core to BEAR AI.