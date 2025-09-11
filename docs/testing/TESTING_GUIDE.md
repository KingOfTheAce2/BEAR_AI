# BEAR AI Testing Guide

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Quality Assurance Procedures](#quality-assurance-procedures)
9. [Automated Testing Pipeline](#automated-testing-pipeline)
10. [Manual Testing Procedures](#manual-testing-procedures)

## Testing Overview

BEAR AI employs a comprehensive testing strategy to ensure reliability, security, and performance across all system components. The testing framework covers multiple levels from unit tests to end-to-end system validation.

### Testing Philosophy

- **Privacy-First Testing**: All tests run locally without external dependencies
- **Security by Design**: Security testing integrated at every level
- **Performance Validation**: Continuous performance monitoring and testing
- **User-Centric Testing**: Focus on real-world usage scenarios
- **Comprehensive Coverage**: Multi-layer testing approach

### Testing Pyramid

```
                    ┌─────────────────────┐
                    │   E2E Tests (5%)    │  ← Real user scenarios
                    └─────────────────────┘
                ┌─────────────────────────────┐
                │  Integration Tests (25%)    │  ← Component interactions
                └─────────────────────────────┘
        ┌───────────────────────────────────────────┐
        │         Unit Tests (70%)                  │  ← Individual components
        └───────────────────────────────────────────┘
```

### Test Categories

| Category | Purpose | Coverage | Tools |
|----------|---------|----------|-------|
| Unit Tests | Component functionality | 85%+ | pytest, unittest |
| Integration Tests | Component interaction | 80%+ | pytest, testcontainers |
| E2E Tests | User workflows | 90%+ | playwright, selenium |
| Performance Tests | Speed/resource usage | Key paths | pytest-benchmark |
| Security Tests | Vulnerability scanning | Critical paths | bandit, safety |
| Load Tests | Scalability validation | Core features | locust, artillery |

## Test Environment Setup

### Development Test Environment

```bash
# Create isolated test environment
python -m venv test_env
source test_env/bin/activate  # Linux/Mac
# test_env\Scripts\activate   # Windows

# Install test dependencies
pip install -e ".[test,dev]"

# Install additional testing tools
pip install pytest pytest-cov pytest-mock pytest-asyncio
pip install playwright locust bandit safety

# Setup test configuration
cp config/test_config.yaml.template config/test_config.yaml

# Initialize test database
bear-ai-test --setup --init-test-db

# Verify test environment
bear-ai-test --verify-setup
```

### Test Configuration

```yaml
# config/test_config.yaml
testing:
  environment: "test"
  debug_mode: true
  log_level: "DEBUG"
  
  # Test data directories
  test_data_dir: "./tests/fixtures"
  temp_dir: "./tests/temp"
  
  # Test database configuration
  database:
    type: "sqlite"
    path: ":memory:"  # In-memory for speed
    reset_between_tests: true
  
  # Mock configurations
  external_services:
    mock_enabled: true
    record_interactions: false
  
  # Performance test settings
  performance:
    timeout_factor: 2.0  # Longer timeouts for testing
    resource_limits:
      memory: "4GB"
      cpu_cores: 4
  
  # Security test settings  
  security:
    enable_vulnerability_scanning: true
    pii_test_data: "./tests/fixtures/pii_samples.txt"
    
  # Coverage settings
  coverage:
    minimum_threshold: 80
    fail_under: 75
    exclude_patterns:
      - "*/tests/*"
      - "*/test_*"
      - "*/__pycache__/*"
```

### Test Data Management

```python
# tests/conftest.py - Shared test fixtures
import pytest
import tempfile
import shutil
from pathlib import Path

from bear_ai import BearAI
from bear_ai.workflows import WorkflowEngine
from bear_ai.models import ModelManager

@pytest.fixture(scope="session")
def test_config():
    """Load test configuration"""
    return {
        "environment": "test",
        "models": {
            "model_directory": "./tests/fixtures/models",
            "default_model": "test-model-small"
        },
        "security": {
            "pii_detection": True,
            "audit_logging": False  # Disable for tests
        }
    }

@pytest.fixture(scope="session")
def temp_directory():
    """Create temporary directory for test files"""
    temp_dir = tempfile.mkdtemp(prefix="bear_ai_test_")
    yield Path(temp_dir)
    shutil.rmtree(temp_dir)

@pytest.fixture
def sample_documents():
    """Sample documents for testing"""
    return {
        "contract": "tests/fixtures/documents/sample_contract.pdf",
        "legal_brief": "tests/fixtures/documents/legal_brief.docx",
        "text_document": "tests/fixtures/documents/sample_text.txt",
        "pii_document": "tests/fixtures/documents/pii_sample.txt"
    }

@pytest.fixture
def mock_model_manager():
    """Mock model manager for testing"""
    class MockModelManager:
        def load_model(self, model_path):
            return True
            
        def generate_text(self, prompt, **kwargs):
            return f"Test response for: {prompt[:50]}..."
            
        def list_available_models(self):
            return ["test-model-small", "test-model-medium"]
    
    return MockModelManager()

@pytest.fixture
async def workflow_engine():
    """Workflow engine for testing"""
    engine = WorkflowEngine()
    
    # Add test agents
    from bear_ai.workflows.agents import create_agent
    test_executor = create_agent("executor", "test-executor")
    test_validator = create_agent("validator", "test-validator")
    
    engine.register_agent(test_executor)
    engine.register_agent(test_validator)
    
    yield engine
    
    # Cleanup
    await engine.shutdown()

@pytest.fixture
def pii_test_samples():
    """Sample PII data for testing detection"""
    return {
        "names": ["John Smith", "Jane Doe", "Michael Johnson"],
        "ssns": ["123-45-6789", "987-65-4321"],
        "emails": ["john@email.com", "jane.doe@company.org"],
        "phones": ["(555) 123-4567", "555-987-6543"],
        "addresses": ["123 Main St, New York, NY 10001"],
        "legal_ids": ["Case No. 2024-001234", "Bar #123456"]
    }
```

## Unit Testing

### Core Component Tests

#### Model Management Tests

```python
# tests/unit/test_models.py
import pytest
from unittest.mock import Mock, patch, MagicMock
from bear_ai.models import ModelManager, ModelDownloader
from bear_ai.models.multi_model_manager import MultiModelManager

class TestModelManager:
    """Test suite for model management functionality"""
    
    @pytest.fixture
    def model_manager(self, test_config):
        """Create model manager instance for testing"""
        return ModelManager(config=test_config["models"])
    
    def test_model_manager_initialization(self, model_manager):
        """Test model manager initializes correctly"""
        assert model_manager is not None
        assert hasattr(model_manager, 'model_directory')
        assert hasattr(model_manager, 'loaded_models')
    
    def test_list_available_models(self, model_manager, temp_directory):
        """Test listing available models"""
        # Create mock model files
        model_dir = temp_directory / "models"
        model_dir.mkdir()
        
        (model_dir / "test-model-1.gguf").touch()
        (model_dir / "test-model-2.gguf").touch()
        (model_dir / "invalid.txt").touch()  # Should be ignored
        
        model_manager.model_directory = str(model_dir)
        models = model_manager.list_available_models()
        
        assert len(models) == 2
        assert any("test-model-1" in model for model in models)
        assert any("test-model-2" in model for model in models)
        assert not any("invalid.txt" in model for model in models)
    
    @patch('bear_ai.models.model_manager.Llama')
    def test_load_model_success(self, mock_llama, model_manager, temp_directory):
        """Test successful model loading"""
        # Setup mock
        mock_llama.return_value = MagicMock()
        
        # Create mock model file
        model_file = temp_directory / "test-model.gguf"
        model_file.touch()
        
        # Test loading
        success = model_manager.load_model(str(model_file))
        
        assert success is True
        assert str(model_file) in model_manager.loaded_models
        mock_llama.assert_called_once()
    
    def test_load_model_file_not_found(self, model_manager):
        """Test loading non-existent model file"""
        success = model_manager.load_model("nonexistent_model.gguf")
        
        assert success is False
        assert len(model_manager.loaded_models) == 0
    
    @patch('bear_ai.models.model_manager.Llama')
    def test_generate_text(self, mock_llama, model_manager, temp_directory):
        """Test text generation functionality"""
        # Setup mock model
        mock_model = MagicMock()
        mock_model.return_value = {
            'choices': [{'text': 'Generated response text'}]
        }
        mock_llama.return_value = mock_model
        
        # Load model
        model_file = temp_directory / "test-model.gguf"
        model_file.touch()
        model_manager.load_model(str(model_file))
        
        # Generate text
        response = model_manager.generate_text(
            "Test prompt",
            max_tokens=100,
            temperature=0.7
        )
        
        assert response == "Generated response text"
        mock_model.assert_called_once()
    
    def test_unload_model(self, model_manager):
        """Test model unloading"""
        # Mock a loaded model
        model_manager.loaded_models["test-model"] = MagicMock()
        
        success = model_manager.unload_model("test-model")
        
        assert success is True
        assert "test-model" not in model_manager.loaded_models
    
    def test_get_model_info(self, model_manager, temp_directory):
        """Test getting model information"""
        model_file = temp_directory / "test-model.gguf"
        model_file.write_bytes(b"0" * 1000000)  # 1MB mock file
        
        info = model_manager.get_model_info(str(model_file))
        
        assert info is not None
        assert info["size"] == 1000000
        assert info["format"] == "gguf"
        assert "path" in info

class TestModelDownloader:
    """Test suite for model downloading functionality"""
    
    @pytest.fixture
    def downloader(self):
        """Create model downloader for testing"""
        return ModelDownloader()
    
    @patch('bear_ai.models.downloader.requests.get')
    def test_download_model_success(self, mock_get, downloader, temp_directory):
        """Test successful model download"""
        # Mock successful HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {'content-length': '1000'}
        mock_response.iter_content = lambda chunk_size: [b"test data"]
        mock_get.return_value = mock_response
        
        download_path = temp_directory / "downloaded_model.gguf"
        
        success = downloader.download_model(
            "test/model",
            str(download_path)
        )
        
        assert success is True
        assert download_path.exists()
        mock_get.assert_called_once()
    
    @patch('bear_ai.models.downloader.requests.get')
    def test_download_model_failure(self, mock_get, downloader, temp_directory):
        """Test failed model download"""
        # Mock failed HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        download_path = temp_directory / "failed_model.gguf"
        
        success = downloader.download_model(
            "test/nonexistent-model",
            str(download_path)
        )
        
        assert success is False
        assert not download_path.exists()
```

#### Agent System Tests

```python
# tests/unit/test_agents.py
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch

from bear_ai.workflows.agents import (
    WorkflowAgent, CoordinatorAgent, ExecutorAgent, ValidatorAgent,
    create_agent, register_agent, get_agent
)
from bear_ai.workflows import WorkflowContext

class TestWorkflowAgent:
    """Test base WorkflowAgent functionality"""
    
    class MockAgent(WorkflowAgent):
        """Mock agent for testing abstract base class"""
        async def execute_task(self, task, context):
            return {"status": "completed", "result": "mock result"}
    
    @pytest.fixture
    def mock_agent(self):
        """Create mock agent instance"""
        return self.MockAgent(
            "test-agent",
            "Test Agent",
            role="executor",
            capabilities=[]
        )
    
    def test_agent_initialization(self, mock_agent):
        """Test agent initialization"""
        assert mock_agent.agent_id == "test-agent"
        assert mock_agent.name == "Test Agent"
        assert mock_agent.role.value == "executor"
        assert mock_agent.is_active is False
        assert mock_agent.tasks_completed == 0
        assert mock_agent.tasks_failed == 0
    
    def test_can_handle_task(self, mock_agent):
        """Test task capability assessment"""
        # Add capabilities
        from bear_ai.workflows.agents import AgentCapability
        mock_agent.capabilities.append(
            AgentCapability("text_processing", "Process text", confidence=0.9)
        )
        
        # Test matching task
        task = {"type": "text_processing_analysis"}
        confidence = mock_agent.can_handle_task(task)
        assert confidence == 0.9
        
        # Test non-matching task
        task = {"type": "image_processing"}
        confidence = mock_agent.can_handle_task(task)
        assert confidence == 0.0
    
    @pytest.mark.asyncio
    async def test_start_task_success(self, mock_agent):
        """Test successful task execution"""
        task = {"id": "test-task", "type": "test"}
        context = WorkflowContext()
        
        result = await mock_agent.start_task(task, context)
        
        assert result["status"] == "completed"
        assert mock_agent.tasks_completed == 1
        assert mock_agent.tasks_failed == 0
        assert len(mock_agent.task_history) == 1
    
    @pytest.mark.asyncio
    async def test_start_task_failure(self, mock_agent):
        """Test task execution failure"""
        # Override execute_task to raise exception
        async def failing_execute_task(task, context):
            raise ValueError("Test error")
        
        mock_agent.execute_task = failing_execute_task
        
        task = {"id": "test-task", "type": "test"}
        context = WorkflowContext()
        
        with pytest.raises(ValueError):
            await mock_agent.start_task(task, context)
        
        assert mock_agent.tasks_completed == 0
        assert mock_agent.tasks_failed == 1
        assert len(mock_agent.task_history) == 1
        assert mock_agent.task_history[0]["status"] == "failed"
    
    def test_get_performance_metrics(self, mock_agent):
        """Test performance metrics calculation"""
        # Simulate some completed and failed tasks
        mock_agent.tasks_completed = 8
        mock_agent.tasks_failed = 2
        mock_agent.average_task_time = 5.5
        
        metrics = mock_agent.get_performance_metrics()
        
        assert metrics["tasks_completed"] == 8
        assert metrics["tasks_failed"] == 2
        assert metrics["success_rate"] == 0.8
        assert metrics["average_task_time"] == 5.5

class TestCoordinatorAgent:
    """Test CoordinatorAgent functionality"""
    
    @pytest.fixture
    def coordinator(self):
        """Create coordinator agent for testing"""
        return CoordinatorAgent("test-coordinator", "Test Coordinator")
    
    @pytest.fixture
    def mock_executor(self):
        """Create mock executor agent"""
        executor = Mock()
        executor.agent_id = "test-executor"
        executor.is_active = False
        executor.can_handle_task.return_value = 0.8
        executor.start_task = AsyncMock(return_value={"status": "completed"})
        executor.tasks_completed = 5
        executor.tasks_failed = 1
        return executor
    
    def test_coordinator_initialization(self, coordinator):
        """Test coordinator initialization"""
        assert coordinator.role.value == "coordinator"
        assert len(coordinator.managed_agents) == 0
        assert coordinator.delegation_strategy == "capability_based"
    
    def test_add_agent(self, coordinator, mock_executor):
        """Test adding agents to coordinator"""
        coordinator.add_agent(mock_executor)
        
        assert "test-executor" in coordinator.managed_agents
        assert coordinator.managed_agents["test-executor"] is mock_executor
    
    @pytest.mark.asyncio
    async def test_delegate_task_success(self, coordinator, mock_executor):
        """Test successful task delegation"""
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
    
    def test_select_best_agent_by_capability(self, coordinator):
        """Test capability-based agent selection"""
        # Create agents with different capabilities
        agent1 = Mock()
        agent1.agent_id = "agent1"
        agent1.is_active = False
        agent1.can_handle_task.return_value = 0.6
        agent1.tasks_completed = 10
        agent1.tasks_failed = 2
        
        agent2 = Mock()
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
    """Test ExecutorAgent functionality"""
    
    @pytest.fixture
    def executor(self):
        """Create executor agent for testing"""
        return ExecutorAgent("test-executor", "Test Executor")
    
    @pytest.mark.asyncio
    async def test_llm_generation_task(self, executor):
        """Test LLM generation task execution"""
        with patch('bear_ai.models.get_model_manager') as mock_get_manager:
            mock_manager = Mock()
            mock_manager.generate_text.return_value = "Generated text response"
            mock_get_manager.return_value = mock_manager
            
            task = {
                "type": "llm_generation",
                "prompt": "Test prompt",
                "model": "test-model",
                "params": {"temperature": 0.7}
            }
            context = WorkflowContext()
            
            result = await executor.execute_task(task, context)
            
            assert result["status"] == "completed"
            assert result["result"] == "Generated text response"
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
    
    @pytest.mark.asyncio
    async def test_data_processing_task(self, executor):
        """Test data processing task"""
        context = WorkflowContext()
        context.set_variable("data", "test data input")
        
        task = {
            "type": "data_processing",
            "operation": "analyze"
        }
        
        result = await executor.execute_task(task, context)
        
        assert result["status"] == "completed"
        assert result["task_type"] == "data_processing"
    
    def test_executor_specializations(self):
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
    """Test ValidatorAgent functionality"""
    
    @pytest.fixture
    def validator(self):
        """Create validator agent for testing"""
        return ValidatorAgent("test-validator", "Test Validator")
    
    @pytest.mark.asyncio
    async def test_validate_result_success(self, validator):
        """Test successful result validation"""
        context = WorkflowContext()
        context.set_result("test-step", "This is a valid result with sufficient content and required keywords")
        
        task = {
            "type": "validate",
            "step_id": "test-step",
            "criteria": {
                "not_empty": True,
                "min_length": 20,
                "contains": "required"
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
        context.set_result("test-step", "Short text")
        
        task = {
            "type": "validate",
            "step_id": "test-step",
            "criteria": {
                "not_empty": True,
                "min_length": 50,
                "contains": "missing_keyword"
            }
        }
        
        result = await validator.execute_task(task, context)
        
        assert result["status"] == "completed"
        assert result["result"] is False
        
        # Check individual validation results
        validation_results = result["validation_results"]
        not_empty_check = next(check for check in validation_results if check["check"] == "not_empty")
        length_check = next(check for check in validation_results if check["check"] == "min_length")
        contains_check = next(check for check in validation_results if check["check"] == "contains")
        
        assert not_empty_check["passed"] is True
        assert length_check["passed"] is False
        assert contains_check["passed"] is False
```

#### Security and PII Tests

```python
# tests/unit/test_security.py
import pytest
from unittest.mock import Mock, patch

from bear_ai.security import SecurityManager, PIIScrubber
from bear_ai.pii import PIIDetector, PIIPolicy

class TestPIIDetector:
    """Test PII detection functionality"""
    
    @pytest.fixture
    def pii_detector(self):
        """Create PII detector for testing"""
        return PIIDetector()
    
    def test_detect_names(self, pii_detector):
        """Test name detection"""
        text = "John Smith is a client of our firm."
        
        results = pii_detector.detect_pii(text)
        
        name_detections = [r for r in results if r["type"] == "person_name"]
        assert len(name_detections) == 1
        assert name_detections[0]["value"] == "John Smith"
        assert name_detections[0]["confidence"] > 0.8
    
    def test_detect_ssn(self, pii_detector):
        """Test SSN detection"""
        text = "Patient SSN: 123-45-6789"
        
        results = pii_detector.detect_pii(text)
        
        ssn_detections = [r for r in results if r["type"] == "ssn"]
        assert len(ssn_detections) == 1
        assert ssn_detections[0]["value"] == "123-45-6789"
        assert ssn_detections[0]["confidence"] > 0.9
    
    def test_detect_email(self, pii_detector):
        """Test email detection"""
        text = "Contact: john.doe@company.com"
        
        results = pii_detector.detect_pii(text)
        
        email_detections = [r for r in results if r["type"] == "email_address"]
        assert len(email_detections) == 1
        assert email_detections[0]["value"] == "john.doe@company.com"
        assert email_detections[0]["confidence"] > 0.9
    
    def test_detect_phone(self, pii_detector):
        """Test phone number detection"""
        text = "Call us at (555) 123-4567 for more information."
        
        results = pii_detector.detect_pii(text)
        
        phone_detections = [r for r in results if r["type"] == "phone_number"]
        assert len(phone_detections) == 1
        assert phone_detections[0]["value"] == "(555) 123-4567"
        assert phone_detections[0]["confidence"] > 0.8
    
    def test_custom_pattern_detection(self, pii_detector):
        """Test custom PII pattern detection"""
        # Add custom pattern for case numbers
        pii_detector.add_custom_pattern(
            name="case_number",
            pattern=r"Case\s+No\.?\s+(\d{4}-\d{6})",
            confidence=0.95
        )
        
        text = "This relates to Case No. 2024-123456."
        
        results = pii_detector.detect_pii(text)
        
        case_detections = [r for r in results if r["type"] == "case_number"]
        assert len(case_detections) == 1
        assert case_detections[0]["value"] == "Case No. 2024-123456"
        assert case_detections[0]["confidence"] == 0.95
    
    def test_context_preservation(self, pii_detector):
        """Test that context around PII is preserved"""
        text = "The plaintiff John Smith filed the motion yesterday."
        
        results = pii_detector.detect_pii(text, include_context=True)
        
        name_detection = next(r for r in results if r["type"] == "person_name")
        assert "context" in name_detection
        assert "plaintiff" in name_detection["context"].lower()
        assert "filed" in name_detection["context"].lower()

class TestPIIScrubber:
    """Test PII scrubbing functionality"""
    
    @pytest.fixture
    def pii_scrubber(self):
        """Create PII scrubber for testing"""
        return PIIScrubber()
    
    def test_scrub_with_tokens(self, pii_scrubber):
        """Test PII scrubbing with token replacement"""
        text = "Contact John Smith at john@email.com or 555-123-4567."
        
        result = pii_scrubber.scrub_text(
            text,
            strategy="replace_with_tokens"
        )
        
        assert "[PERSON_NAME]" in result["scrubbed_text"]
        assert "[EMAIL_ADDRESS]" in result["scrubbed_text"]
        assert "[PHONE_NUMBER]" in result["scrubbed_text"]
        assert "John Smith" not in result["scrubbed_text"]
        assert "john@email.com" not in result["scrubbed_text"]
        assert "555-123-4567" not in result["scrubbed_text"]
    
    def test_scrub_with_hashing(self, pii_scrubber):
        """Test PII scrubbing with hash replacement"""
        text = "SSN: 123-45-6789"
        
        result = pii_scrubber.scrub_text(
            text,
            strategy="hash",
            hash_algorithm="sha256"
        )
        
        # Should contain hash instead of original SSN
        assert "123-45-6789" not in result["scrubbed_text"]
        assert len(result["scrubbed_text"]) > len(text)  # Hash is longer
        assert result["items_scrubbed"] == 1
    
    def test_scrub_with_redaction(self, pii_scrubber):
        """Test PII scrubbing with redaction"""
        text = "Email: john.doe@company.com"
        
        result = pii_scrubber.scrub_text(
            text,
            strategy="redact"
        )
        
        # Should contain redaction marks
        assert "[REDACTED]" in result["scrubbed_text"]
        assert "john.doe@company.com" not in result["scrubbed_text"]
        assert result["items_scrubbed"] == 1
    
    def test_preserve_structure(self, pii_scrubber):
        """Test that document structure is preserved during scrubbing"""
        text = """
        CONFIDENTIAL DOCUMENT
        
        Client: John Smith
        SSN: 123-45-6789
        Email: john@email.com
        
        Case Details:
        - Filed: 2024-01-15
        - Status: Active
        """
        
        result = pii_scrubber.scrub_text(
            text,
            strategy="replace_with_tokens",
            preserve_structure=True
        )
        
        # Structure should be preserved
        assert "CONFIDENTIAL DOCUMENT" in result["scrubbed_text"]
        assert "Case Details:" in result["scrubbed_text"]
        assert "- Filed: 2024-01-15" in result["scrubbed_text"]
        assert "- Status: Active" in result["scrubbed_text"]
        
        # PII should be scrubbed
        assert "[PERSON_NAME]" in result["scrubbed_text"]
        assert "[SSN]" in result["scrubbed_text"]
        assert "[EMAIL_ADDRESS]" in result["scrubbed_text"]
    
    def test_reverse_mapping(self, pii_scrubber):
        """Test reverse mapping for PII restoration"""
        text = "Contact John Smith at john@email.com"
        
        result = pii_scrubber.scrub_text(
            text,
            strategy="replace_with_tokens",
            create_reverse_mapping=True
        )
        
        assert "reverse_mapping" in result
        assert result["reverse_mapping"]["enabled"] is True
        assert "mapping_id" in result["reverse_mapping"]
        
        # Test restoration
        restored = pii_scrubber.restore_text(
            result["scrubbed_text"],
            result["reverse_mapping"]["mapping_id"]
        )
        
        assert restored["restored_text"] == text

class TestSecurityManager:
    """Test overall security manager functionality"""
    
    @pytest.fixture
    def security_manager(self):
        """Create security manager for testing"""
        return SecurityManager()
    
    def test_security_scan_document(self, security_manager):
        """Test document security scanning"""
        document_content = """
        LEGAL DOCUMENT
        
        Client Information:
        Name: John Smith
        SSN: 123-45-6789  
        Email: john@firm.com
        Phone: 555-123-4567
        
        This document contains confidential information.
        """
        
        scan_result = security_manager.scan_document(document_content)
        
        assert scan_result["pii_detected"] > 0
        assert scan_result["risk_level"] in ["low", "medium", "high"]
        assert "scan_details" in scan_result
        assert len(scan_result["pii_items"]) >= 4  # Name, SSN, email, phone
    
    def test_security_policy_enforcement(self, security_manager):
        """Test security policy enforcement"""
        # Set strict security policy
        policy = {
            "pii_detection": {
                "enabled": True,
                "min_confidence": 0.8,
                "required_scrubbing": True
            },
            "access_control": {
                "enabled": True,
                "require_authorization": True
            }
        }
        
        security_manager.set_policy(policy)
        
        # Test policy enforcement
        result = security_manager.enforce_policy({
            "operation": "document_processing",
            "user": "test_user",
            "content": "Test content with PII: john@email.com"
        })
        
        assert result["policy_compliant"] is not None
        assert "required_actions" in result
    
    def test_audit_logging(self, security_manager):
        """Test security audit logging"""
        # Enable audit logging
        security_manager.enable_audit_logging()
        
        # Perform security operation
        security_manager.log_security_event(
            event_type="pii_detection",
            details={
                "document_id": "test-doc-123",
                "pii_types": ["email", "phone"],
                "user": "test_user"
            }
        )
        
        # Check audit log
        logs = security_manager.get_audit_logs(limit=1)
        assert len(logs) == 1
        assert logs[0]["event_type"] == "pii_detection"
        assert "test-doc-123" in logs[0]["details"]["document_id"]
```

This comprehensive testing guide provides the foundation for ensuring BEAR AI's reliability, security, and performance through systematic testing approaches. The examples demonstrate best practices for testing each component while maintaining the system's privacy-first principles.