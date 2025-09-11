# BEAR AI Developer Guide

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Testing Strategies](#testing-strategies)
5. [Code Quality and Standards](#code-quality-and-standards)
6. [Debugging and Profiling](#debugging-and-profiling)
7. [Performance Optimization](#performance-optimization)
8. [Security Development](#security-development)
9. [Plugin Development](#plugin-development)
10. [Deployment and Packaging](#deployment-and-packaging)

## Development Environment Setup

### Prerequisites

- **Python 3.9+** (3.11 recommended for best performance)
- **Git 2.30+**
- **Node.js 18+** (for web interfaces and tooling)
- **Visual Studio Code** (recommended IDE)
- **Docker 20.10+** (optional, for containerized development)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/KingOfTheAce2/BEAR_AI.git
cd BEAR_AI

# Create and activate virtual environment
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate

# Upgrade pip and install build tools
python -m pip install --upgrade pip setuptools wheel

# Install development dependencies
pip install -e ".[dev,all]"

# Install pre-commit hooks
pre-commit install

# Verify installation
python -c "import bear_ai; print('✅ Installation successful')"
```

### IDE Configuration

#### Visual Studio Code Settings

Create `.vscode/settings.json`:

```json
{
    "python.defaultInterpreterPath": "./.venv/bin/python",
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": false,
    "python.linting.flake8Enabled": true,
    "python.linting.mypyEnabled": true,
    "python.formatting.provider": "black",
    "python.sortImports.args": ["--profile", "black"],
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.organizeImports": true
    },
    "files.exclude": {
        "**/__pycache__": true,
        "**/.pytest_cache": true,
        "**/*.pyc": true,
        "**/.mypy_cache": true
    },
    "python.testing.pytestEnabled": true,
    "python.testing.pytestArgs": [
        "tests/",
        "-v",
        "--tb=short"
    ]
}
```

#### VS Code Extensions

Essential extensions for BEAR AI development:

```json
{
    "recommendations": [
        "ms-python.python",
        "ms-python.black-formatter",
        "ms-python.isort",
        "ms-python.mypy-type-checker",
        "ms-python.pylint",
        "ms-toolsai.jupyter",
        "redhat.vscode-yaml",
        "ms-vscode.vscode-json",
        "GitHub.copilot",
        "ms-vscode.test-adapter-converter",
        "hbenl.vscode-test-explorer"
    ]
}
```

### Environment Variables

Create `.env` file for development:

```bash
# Development environment configuration
BEAR_AI_ENV=development
BEAR_AI_DEBUG=true
BEAR_AI_LOG_LEVEL=DEBUG

# Model configuration
BEAR_AI_MODEL_PATH=./models
BEAR_AI_DEFAULT_MODEL=mistral-7b-instruct-q4

# Hardware settings
BEAR_AI_ENABLE_GPU=true
BEAR_AI_MAX_MEMORY=16GB

# Security settings
BEAR_AI_ENABLE_PII_DETECTION=true
BEAR_AI_AUDIT_LOGGING=true

# Database settings (for development)
BEAR_AI_DB_PATH=./dev.db
BEAR_AI_VECTOR_DB_PATH=./vector_dev.db

# API settings
BEAR_AI_API_PORT=8000
BEAR_AI_API_HOST=127.0.0.1
BEAR_AI_CORS_ENABLED=true
```

## Project Structure

### Directory Layout

```
BEAR_AI/
├── .github/                    # GitHub workflows and templates
├── .vscode/                    # VS Code configuration
├── docs/                       # Documentation
│   ├── architecture/          # Architecture documentation
│   ├── developer/             # Developer guides
│   ├── implementation/        # Implementation guides
│   └── user/                  # User documentation
├── src/bear_ai/               # Main source code
│   ├── __init__.py
│   ├── __main__.py           # CLI entry point
│   ├── benchmarking/         # Performance benchmarking
│   ├── context/              # Context management
│   ├── discovery/            # Model discovery
│   ├── formats/              # Format converters
│   ├── gui/                  # GUI interfaces
│   ├── models/               # Model management
│   ├── multimodal/          # Multimodal processing
│   ├── optimization/        # Hardware optimization
│   ├── pii/                 # PII detection and scrubbing
│   ├── plugins/             # Plugin system
│   ├── rag/                 # RAG implementation
│   ├── server/              # API server
│   ├── templates/           # Template system
│   └── workflows/           # Workflow engine and agents
├── tests/                     # Test suite
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   ├── performance/          # Performance tests
│   └── fixtures/             # Test fixtures
├── scripts/                   # Development and build scripts
├── packaging/                 # Packaging configurations
├── models/                    # Downloaded AI models (gitignored)
├── .env                       # Environment variables
├── .gitignore
├── pyproject.toml            # Project configuration
├── requirements.txt          # Production dependencies
├── requirements-dev.txt      # Development dependencies
└── README.md
```

### Key Source Modules

#### Core Modules

- **`bear_ai/__init__.py`**: Package initialization and version info
- **`bear_ai/__main__.py`**: CLI entry point and command routing
- **`bear_ai/chat.py`**: Interactive chat interface
- **`bear_ai/gui.py`**: GUI application launcher
- **`bear_ai/inference.py`**: AI model inference engine
- **`bear_ai/download.py`**: Model download and management
- **`bear_ai/scrub.py`**: PII detection and scrubbing
- **`bear_ai/security.py`**: Security and privacy features

#### Advanced Modules

- **`workflows/`**: Multi-agent workflow system
- **`models/`**: Advanced model management and optimization
- **`rag/`**: Retrieval-Augmented Generation
- **`plugins/`**: Plugin architecture and management
- **`multimodal/`**: Multi-modal processing (text, image, audio)
- **`benchmarking/`**: Performance testing and optimization

## Development Workflow

### Git Workflow

We follow a structured Git workflow for collaborative development:

#### Branch Strategy

```bash
# Main branches
main           # Production-ready code
develop        # Integration branch for features

# Feature branches
feature/*      # New features
bugfix/*       # Bug fixes
hotfix/*       # Critical production fixes
release/*      # Release preparation
```

#### Development Process

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/new-agent-system

# 2. Make changes and commit
git add .
git commit -m "feat: implement new agent coordination system

- Add CoordinatorAgent with task delegation
- Implement dynamic load balancing
- Add performance metrics tracking
- Update tests for new agent system"

# 3. Push and create pull request
git push origin feature/new-agent-system

# 4. After review and approval, merge to develop
git checkout develop
git pull origin develop
git merge --no-ff feature/new-agent-system
git branch -d feature/new-agent-system
```

#### Commit Message Standards

We use Conventional Commits format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```bash
feat(agents): add collaborative processing pattern
fix(security): resolve PII detection edge case
docs(api): update workflow API documentation
test(rag): add integration tests for document processing
```

### Code Review Process

#### Pre-Review Checklist

Before creating a pull request:

- [ ] All tests pass locally (`pytest tests/`)
- [ ] Code formatted with Black (`black src/ tests/`)
- [ ] Imports organized with isort (`isort src/ tests/`)
- [ ] Type hints added and mypy passes (`mypy src/`)
- [ ] Documentation updated for new features
- [ ] Performance impact assessed
- [ ] Security implications reviewed

#### Review Guidelines

**For Authors:**
- Write clear PR descriptions with context and testing instructions
- Keep PRs focused and reasonably sized (< 500 lines when possible)
- Respond promptly to reviewer feedback
- Update tests and documentation as needed

**For Reviewers:**
- Focus on correctness, security, performance, and maintainability
- Provide constructive feedback with suggestions
- Test complex changes locally
- Approve only when confident in the changes

### Development Tasks

#### Common Development Tasks

```bash
# Run tests
pytest tests/                          # All tests
pytest tests/unit/                     # Unit tests only
pytest tests/integration/              # Integration tests
pytest tests/ -k "test_workflow"       # Specific test pattern
pytest tests/ --cov=src/bear_ai       # With coverage

# Code quality checks
black src/ tests/                      # Format code
isort src/ tests/                      # Sort imports
mypy src/                              # Type checking
flake8 src/ tests/                     # Linting
bandit -r src/                         # Security scan

# Pre-commit hooks (run automatically)
pre-commit run --all-files             # Run all hooks manually

# Documentation
mkdocs serve                           # Local documentation server
sphinx-build docs/ docs/_build/        # Build documentation

# Performance testing
python -m bear_ai.benchmarking        # Run benchmarks
python -m pytest tests/performance/   # Performance tests
```

#### Development Scripts

Create useful development scripts in `scripts/`:

```bash
# scripts/dev-setup.sh - Development environment setup
#!/bin/bash
set -e

echo "Setting up BEAR AI development environment..."

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev,all]"

# Install pre-commit hooks
pre-commit install

# Download test models
python scripts/download-test-models.py

# Run initial tests
pytest tests/unit/ -v

echo "✅ Development environment ready!"
```

```python
# scripts/download-test-models.py - Download models for testing
"""Download test models for development"""

from bear_ai.download import ModelDownloader
from bear_ai.hardware_profiles import get_recommended_models

def download_test_models():
    """Download small models for testing"""
    
    downloader = ModelDownloader()
    
    # Small test models
    test_models = [
        {
            'name': 'test-small-7b',
            'hf_id': 'microsoft/DialoGPT-small',
            'size': '500MB'
        },
        {
            'name': 'test-embedding',
            'hf_id': 'sentence-transformers/all-MiniLM-L6-v2',
            'size': '90MB'
        }
    ]
    
    for model in test_models:
        print(f"Downloading {model['name']}...")
        success = downloader.download_model(
            model_id=model['hf_id'],
            save_path=f"./models/test/{model['name']}.gguf"
        )
        
        if success:
            print(f"✅ Downloaded {model['name']}")
        else:
            print(f"❌ Failed to download {model['name']}")

if __name__ == "__main__":
    download_test_models()
```

## Testing Strategies

### Test Structure

```
tests/
├── conftest.py                # Pytest configuration and fixtures
├── unit/                      # Unit tests
│   ├── test_agents.py
│   ├── test_workflows.py
│   ├── test_models.py
│   └── test_security.py
├── integration/               # Integration tests
│   ├── test_workflow_execution.py
│   ├── test_model_integration.py
│   └── test_plugin_system.py
├── performance/               # Performance tests
│   ├── test_inference_speed.py
│   ├── test_memory_usage.py
│   └── test_concurrent_agents.py
├── e2e/                      # End-to-end tests
│   ├── test_complete_workflows.py
│   └── test_gui_interactions.py
└── fixtures/                 # Test data and fixtures
    ├── test_documents/
    ├── test_models/
    └── test_configurations/
```

### Unit Testing

```python
# tests/unit/test_agents.py
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch

from bear_ai.workflows.agents import CoordinatorAgent, ExecutorAgent, ValidatorAgent
from bear_ai.workflows import WorkflowContext

class TestCoordinatorAgent:
    """Test suite for CoordinatorAgent"""
    
    @pytest.fixture
    def coordinator(self):
        """Create coordinator agent for testing"""
        return CoordinatorAgent("test-coordinator", "Test Coordinator")
    
    @pytest.fixture
    def mock_executor(self):
        """Create mock executor agent"""
        executor = Mock(spec=ExecutorAgent)
        executor.agent_id = "test-executor"
        executor.is_active = False
        executor.can_handle_task.return_value = 0.8
        executor.start_task = AsyncMock(return_value={"status": "completed"})
        return executor
    
    def test_coordinator_initialization(self, coordinator):
        """Test coordinator initialization"""
        assert coordinator.agent_id == "test-coordinator"
        assert coordinator.name == "Test Coordinator"
        assert len(coordinator.managed_agents) == 0
        assert coordinator.delegation_strategy == "capability_based"
    
    def test_add_agent(self, coordinator, mock_executor):
        """Test adding agents to coordinator"""
        coordinator.add_agent(mock_executor)
        
        assert "test-executor" in coordinator.managed_agents
        assert coordinator.managed_agents["test-executor"] is mock_executor
    
    @pytest.mark.asyncio
    async def test_delegate_task(self, coordinator, mock_executor):
        """Test task delegation"""
        coordinator.add_agent(mock_executor)
        
        task = {
            "type": "delegate",
            "subtasks": [
                {"id": "subtask-1", "type": "test_task"}
            ]
        }
        
        context = WorkflowContext()
        result = await coordinator.execute_task(task, context)
        
        assert result["status"] == "delegation_complete"
        assert result["total_tasks"] == 1
        assert result["completed_tasks"] == 1
        
        # Verify executor was called
        mock_executor.start_task.assert_called_once()
    
    def test_select_best_agent_no_agents(self, coordinator):
        """Test agent selection with no available agents"""
        task = {"type": "test_task"}
        best_agent = coordinator._select_best_agent(task)
        
        assert best_agent is None
    
    def test_select_best_agent_capability_based(self, coordinator):
        """Test capability-based agent selection"""
        # Create mock agents with different capabilities
        agent1 = Mock(spec=ExecutorAgent)
        agent1.agent_id = "agent1"
        agent1.is_active = False
        agent1.can_handle_task.return_value = 0.6
        agent1.tasks_completed = 10
        agent1.tasks_failed = 2
        
        agent2 = Mock(spec=ExecutorAgent)
        agent2.agent_id = "agent2"
        agent2.is_active = False
        agent2.can_handle_task.return_value = 0.9
        agent2.tasks_completed = 5
        agent2.tasks_failed = 0
        
        coordinator.add_agent(agent1)
        coordinator.add_agent(agent2)
        
        task = {"type": "test_task"}
        best_agent = coordinator._select_best_agent(task)
        
        # Should select agent2 due to higher capability score
        assert best_agent is agent2

class TestExecutorAgent:
    """Test suite for ExecutorAgent"""
    
    @pytest.fixture
    def executor(self):
        """Create executor agent for testing"""
        return ExecutorAgent("test-executor", "Test Executor")
    
    @pytest.mark.asyncio
    async def test_llm_generation_task(self, executor):
        """Test LLM generation task execution"""
        with patch('bear_ai.models.get_model_manager') as mock_manager:
            mock_manager.return_value.generate_text.return_value = "Generated text"
            
            task = {
                "type": "llm_generation",
                "prompt": "Test prompt",
                "model": "test-model"
            }
            context = WorkflowContext()
            
            result = await executor.execute_task(task, context)
            
            assert result["status"] == "completed"
            assert result["result"] == "Generated text"
            assert result["task_type"] == "llm_generation"
    
    @pytest.mark.asyncio
    async def test_tool_execution_task(self, executor):
        """Test tool execution task"""
        task = {
            "type": "tool_execution",
            "tool": "test_tool",
            "params": {"param1": "value1"}
        }
        context = WorkflowContext()
        
        result = await executor.execute_task(task, context)
        
        assert result["status"] == "completed"
        assert "test_tool" in result["result"]
        assert result["task_type"] == "tool_execution"
    
    def test_specialization_capabilities(self):
        """Test executor with specializations"""
        specializations = ["legal_analysis", "contract_review"]
        executor = ExecutorAgent(
            "specialized-executor",
            "Specialized Executor",
            specializations=specializations
        )
        
        assert executor.specializations == specializations
        
        # Check that specialization capabilities were added
        capability_names = [cap.name for cap in executor.capabilities]
        assert "legal_analysis" in capability_names
        assert "contract_review" in capability_names

class TestValidatorAgent:
    """Test suite for ValidatorAgent"""
    
    @pytest.fixture
    def validator(self):
        """Create validator agent for testing"""
        return ValidatorAgent("test-validator", "Test Validator")
    
    @pytest.mark.asyncio
    async def test_validate_result_success(self, validator):
        """Test successful result validation"""
        context = WorkflowContext()
        context.set_result("test-step", "This is a valid result with sufficient content")
        
        task = {
            "type": "validate",
            "step_id": "test-step",
            "criteria": {
                "not_empty": True,
                "min_length": 10,
                "contains": "valid"
            }
        }
        
        result = await validator.execute_task(task, context)
        
        assert result["status"] == "completed"
        assert result["result"] is True
        assert len(result["validation_results"]) == 3
        assert all(check["passed"] for check in result["validation_results"])
    
    @pytest.mark.asyncio
    async def test_validate_result_failure(self, validator):
        """Test failed result validation"""
        context = WorkflowContext()
        context.set_result("test-step", "Short")
        
        task = {
            "type": "validate",
            "step_id": "test-step",
            "criteria": {
                "not_empty": True,
                "min_length": 20,
                "contains": "missing_text"
            }
        }
        
        result = await validator.execute_task(task, context)
        
        assert result["status"] == "completed"
        assert result["result"] is False
        
        # Check individual validation results
        validation_results = result["validation_results"]
        assert validation_results[0]["passed"] is True  # not_empty
        assert validation_results[1]["passed"] is False # min_length
        assert validation_results[2]["passed"] is False # contains
    
    @pytest.mark.asyncio
    async def test_quality_check(self, validator):
        """Test quality checking functionality"""
        context = WorkflowContext()
        context.set_result("test-step", "This is a well-structured response with good content.")
        
        task = {
            "type": "quality_check",
            "step_id": "test-step",
            "standards": {
                "min_score": 0.7,
                "expected_length": 50
            }
        }
        
        result = await validator.execute_task(task, context)
        
        assert result["status"] == "completed"
        assert "quality_score" in result
        assert "quality_checks" in result
        assert result["quality_score"] >= 0.0

# Pytest fixtures for common test data
@pytest.fixture
def sample_workflow():
    """Sample workflow for testing"""
    return {
        "name": "test_workflow",
        "description": "Test workflow for unit testing",
        "steps": [
            {
                "id": "step1",
                "type": "llm_generation",
                "prompt": "Generate test content",
                "agent": "executor"
            },
            {
                "id": "step2", 
                "type": "validate",
                "step_id": "step1",
                "criteria": {"not_empty": True},
                "agent": "validator"
            }
        ]
    }

@pytest.fixture
def workflow_context():
    """Workflow context for testing"""
    context = WorkflowContext()
    context.set_variable("test_var", "test_value")
    return context
```

### Integration Testing

```python
# tests/integration/test_workflow_execution.py
import pytest
import asyncio
import tempfile
from pathlib import Path

from bear_ai.workflows import WorkflowEngine
from bear_ai.workflows.agents import create_agent
from bear_ai.models import ModelManager

@pytest.mark.integration
class TestWorkflowIntegration:
    """Integration tests for complete workflow execution"""
    
    @pytest.fixture
    async def workflow_engine(self):
        """Create workflow engine with real agents"""
        engine = WorkflowEngine()
        
        # Create and register agents
        coordinator = create_agent("coordinator")
        executor = create_agent("executor")
        validator = create_agent("validator")
        
        engine.register_agent(coordinator)
        engine.register_agent(executor)
        engine.register_agent(validator)
        
        # Add agents to coordinator
        coordinator.add_agent(executor)
        coordinator.add_agent(validator)
        
        return engine
    
    @pytest.fixture
    def sample_document(self):
        """Create temporary document for testing"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("This is a test document with important information.")
            return Path(f.name)
    
    @pytest.mark.asyncio
    async def test_document_processing_workflow(self, workflow_engine, sample_document):
        """Test complete document processing workflow"""
        
        workflow = {
            "name": "document_processing_test",
            "steps": [
                {
                    "id": "read_document",
                    "type": "file_operations",
                    "operation": "read",
                    "file_path": str(sample_document),
                    "agent": "executor"
                },
                {
                    "id": "analyze_content",
                    "type": "llm_generation",
                    "prompt": "Analyze this document: {document_content}",
                    "depends_on": ["read_document"],
                    "agent": "executor"
                },
                {
                    "id": "validate_analysis",
                    "type": "validate",
                    "step_id": "analyze_content",
                    "criteria": {
                        "not_empty": True,
                        "min_length": 20
                    },
                    "depends_on": ["analyze_content"],
                    "agent": "validator"
                }
            ]
        }
        
        result = await workflow_engine.execute_workflow(workflow)
        
        assert result["status"] == "completed"
        assert "read_document" in result["results"]
        assert "analyze_content" in result["results"]
        assert "validate_analysis" in result["results"]
        
        # Cleanup
        sample_document.unlink()
    
    @pytest.mark.asyncio
    async def test_parallel_task_execution(self, workflow_engine):
        """Test parallel execution of independent tasks"""
        
        workflow = {
            "name": "parallel_execution_test",
            "steps": [
                {
                    "id": "task1",
                    "type": "llm_generation", 
                    "prompt": "Generate content about topic A",
                    "agent": "executor",
                    "parallel": True
                },
                {
                    "id": "task2",
                    "type": "llm_generation",
                    "prompt": "Generate content about topic B", 
                    "agent": "executor",
                    "parallel": True
                },
                {
                    "id": "combine_results",
                    "type": "llm_generation",
                    "prompt": "Combine these results: {task1_result} and {task2_result}",
                    "depends_on": ["task1", "task2"],
                    "agent": "executor"
                }
            ]
        }
        
        start_time = asyncio.get_event_loop().time()
        result = await workflow_engine.execute_workflow(workflow)
        end_time = asyncio.get_event_loop().time()
        
        assert result["status"] == "completed"
        
        # Parallel execution should be faster than sequential
        execution_time = end_time - start_time
        assert execution_time < 10  # Should complete quickly with mocked models
    
    @pytest.mark.asyncio
    async def test_error_handling_and_recovery(self, workflow_engine):
        """Test workflow error handling and recovery mechanisms"""
        
        workflow = {
            "name": "error_handling_test",
            "steps": [
                {
                    "id": "failing_step",
                    "type": "tool_execution",
                    "tool": "nonexistent_tool",
                    "agent": "executor"
                },
                {
                    "id": "recovery_step",
                    "type": "llm_generation",
                    "prompt": "Handle the error from previous step",
                    "agent": "executor",
                    "on_error": "continue"
                }
            ]
        }
        
        result = await workflow_engine.execute_workflow(workflow)
        
        # Workflow should handle errors gracefully
        assert result["status"] in ["partial", "failed"]
        assert "failing_step" in result["results"]
        
        # Check error information is preserved
        failing_result = result["results"]["failing_step"]
        assert failing_result["status"] == "failed"
        assert "error" in failing_result

@pytest.mark.integration
class TestModelIntegration:
    """Integration tests for model management"""
    
    @pytest.fixture
    def model_manager(self):
        """Create model manager for testing"""
        return ModelManager()
    
    @pytest.mark.slow
    def test_model_loading_and_inference(self, model_manager):
        """Test model loading and basic inference"""
        # This test requires actual models - mark as slow
        models = model_manager.list_available_models()
        
        if not models:
            pytest.skip("No models available for testing")
        
        model_path = models[0]
        success = model_manager.load_model(model_path)
        assert success, f"Failed to load model: {model_path}"
        
        # Test inference
        response = model_manager.generate_text(
            "Hello, this is a test.",
            max_tokens=50,
            temperature=0.7
        )
        
        assert response is not None
        assert isinstance(response, str)
        assert len(response.strip()) > 0
    
    def test_model_discovery(self, model_manager):
        """Test model discovery functionality"""
        models = model_manager.discover_models("./models")
        
        # Should return list (may be empty in test environment)
        assert isinstance(models, list)
        
        for model in models:
            assert "path" in model
            assert "name" in model
            assert Path(model["path"]).exists()
```

### Performance Testing

```python
# tests/performance/test_inference_speed.py
import pytest
import time
import asyncio
import statistics
from concurrent.futures import ThreadPoolExecutor

from bear_ai.models import ModelManager
from bear_ai.workflows import WorkflowEngine
from bear_ai.benchmarking import BenchmarkEngine

@pytest.mark.performance
class TestInferencePerformance:
    """Performance tests for model inference"""
    
    @pytest.fixture
    def benchmark_engine(self):
        """Create benchmark engine"""
        return BenchmarkEngine()
    
    @pytest.fixture 
    def model_manager(self):
        """Create model manager for testing"""
        return ModelManager()
    
    @pytest.mark.slow
    def test_inference_latency(self, model_manager):
        """Test model inference latency"""
        models = model_manager.list_available_models()
        if not models:
            pytest.skip("No models available for performance testing")
        
        model_path = models[0]
        model_manager.load_model(model_path)
        
        # Warm-up inference
        model_manager.generate_text("Warm-up prompt", max_tokens=10)
        
        # Measure latency over multiple runs
        latencies = []
        test_prompts = [
            "Summarize this document.",
            "Extract key information.",
            "Analyze the content.",
            "Provide recommendations.",
            "Generate a report."
        ]
        
        for prompt in test_prompts:
            start_time = time.time()
            response = model_manager.generate_text(prompt, max_tokens=100)
            end_time = time.time()
            
            if response:  # Only measure successful inferences
                latency = end_time - start_time
                latencies.append(latency)
        
        if latencies:
            avg_latency = statistics.mean(latencies)
            p95_latency = statistics.quantiles(latencies, n=20)[18]  # 95th percentile
            
            print(f"Average latency: {avg_latency:.2f}s")
            print(f"95th percentile latency: {p95_latency:.2f}s")
            
            # Performance assertions (adjust based on hardware)
            assert avg_latency < 30.0, f"Average latency too high: {avg_latency}s"
            assert p95_latency < 60.0, f"95th percentile latency too high: {p95_latency}s"
    
    @pytest.mark.slow
    def test_throughput(self, model_manager):
        """Test model throughput with concurrent requests"""
        models = model_manager.list_available_models()
        if not models:
            pytest.skip("No models available for throughput testing")
        
        model_path = models[0]
        model_manager.load_model(model_path)
        
        def generate_text_task(prompt):
            """Single text generation task"""
            return model_manager.generate_text(prompt, max_tokens=50)
        
        # Test concurrent throughput
        test_prompts = [f"Test prompt {i}" for i in range(20)]
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(generate_text_task, test_prompts))
        
        end_time = time.time()
        
        successful_generations = [r for r in results if r and r.strip()]
        total_time = end_time - start_time
        throughput = len(successful_generations) / total_time
        
        print(f"Throughput: {throughput:.2f} generations/second")
        print(f"Success rate: {len(successful_generations)}/{len(test_prompts)}")
        
        # Performance assertions
        assert throughput > 0.1, f"Throughput too low: {throughput} gen/s"
        assert len(successful_generations) >= len(test_prompts) * 0.8, "Too many failed generations"

@pytest.mark.performance
class TestWorkflowPerformance:
    """Performance tests for workflow execution"""
    
    @pytest.fixture
    async def workflow_engine(self):
        """Create workflow engine for performance testing"""
        engine = WorkflowEngine()
        
        # Create multiple agents for load testing
        agents = []
        for i in range(5):
            executor = create_agent("executor", f"executor-{i}")
            engine.register_agent(executor)
            agents.append(executor)
        
        coordinator = create_agent("coordinator")
        engine.register_agent(coordinator)
        
        for agent in agents:
            coordinator.add_agent(agent)
        
        return engine
    
    @pytest.mark.asyncio
    async def test_workflow_scaling(self, workflow_engine):
        """Test workflow performance with increasing complexity"""
        
        # Test workflows of different sizes
        workflow_sizes = [5, 10, 20]
        performance_results = {}
        
        for size in workflow_sizes:
            # Create workflow with specified number of steps
            workflow = {
                "name": f"scaling_test_{size}",
                "steps": [
                    {
                        "id": f"step_{i}",
                        "type": "llm_generation",
                        "prompt": f"Generate content for step {i}",
                        "agent": "executor"
                    }
                    for i in range(size)
                ]
            }
            
            start_time = time.time()
            result = await workflow_engine.execute_workflow(workflow)
            end_time = time.time()
            
            execution_time = end_time - start_time
            performance_results[size] = {
                "execution_time": execution_time,
                "steps_per_second": size / execution_time if execution_time > 0 else 0,
                "success": result["status"] == "completed"
            }
            
            print(f"Workflow size {size}: {execution_time:.2f}s ({size/execution_time:.2f} steps/s)")
        
        # Performance should scale reasonably
        for size, metrics in performance_results.items():
            assert metrics["success"], f"Workflow size {size} failed"
            assert metrics["steps_per_second"] > 0.1, f"Too slow for size {size}"
    
    @pytest.mark.asyncio
    async def test_concurrent_workflow_execution(self, workflow_engine):
        """Test concurrent execution of multiple workflows"""
        
        async def run_test_workflow(workflow_id):
            """Run a single test workflow"""
            workflow = {
                "name": f"concurrent_test_{workflow_id}",
                "steps": [
                    {
                        "id": "step1",
                        "type": "llm_generation",
                        "prompt": f"Generate content for workflow {workflow_id}",
                        "agent": "executor"
                    }
                ]
            }
            
            start_time = time.time()
            result = await workflow_engine.execute_workflow(workflow)
            end_time = time.time()
            
            return {
                "workflow_id": workflow_id,
                "execution_time": end_time - start_time,
                "success": result["status"] == "completed"
            }
        
        # Run multiple workflows concurrently
        num_workflows = 10
        
        start_time = time.time()
        results = await asyncio.gather(*[
            run_test_workflow(i) for i in range(num_workflows)
        ])
        end_time = time.time()
        
        total_time = end_time - start_time
        successful_workflows = [r for r in results if r["success"]]
        
        print(f"Concurrent execution: {total_time:.2f}s")
        print(f"Success rate: {len(successful_workflows)}/{num_workflows}")
        print(f"Workflows per second: {len(successful_workflows)/total_time:.2f}")
        
        # Performance assertions
        assert len(successful_workflows) >= num_workflows * 0.8, "Too many failed workflows"
        assert total_time < 60, f"Concurrent execution took too long: {total_time}s"

# Performance test configuration
@pytest.fixture(scope="session")
def performance_config():
    """Configuration for performance tests"""
    return {
        "max_latency": 30.0,  # seconds
        "min_throughput": 0.1,  # generations/second
        "max_workflow_time": 60.0,  # seconds
        "min_success_rate": 0.8  # 80%
    }
```

This developer guide provides comprehensive information for setting up, developing, testing, and maintaining BEAR AI. The testing strategies ensure code quality and performance while the development workflow promotes collaborative development and maintainable code.