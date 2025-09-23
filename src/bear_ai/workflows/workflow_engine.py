"""
Agentic Workflow Engine
Orchestrates multi-step tasks with intelligent agents
"""

import asyncio
import json
import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional, Callable, Union, Awaitable

# Import secure condition evaluator
try:
    from .secure_workflow_engine import SecureConditionEvaluator, SecurityError
except ImportError:
    # Fallback if secure module not available
    class SecurityError(Exception):
        pass
    class SecureConditionEvaluator:
        def evaluate(self, expr, ctx):
            raise SecurityError("Secure evaluator not available")

logger = logging.getLogger(__name__)


class StepType(Enum):
    """Types of workflow steps"""
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    CONDITIONAL = "conditional"
    LOOP = "loop"
    BRANCH = "branch"
    MERGE = "merge"
    HUMAN_INPUT = "human_input"
    LLM_GENERATION = "llm_generation"
    TOOL_EXECUTION = "tool_execution"
    VALIDATION = "validation"
    DECISION = "decision"


class StepStatus(Enum):
    """Status of workflow steps"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    WAITING_INPUT = "waiting_input"
    CANCELLED = "cancelled"


class WorkflowStatus(Enum):
    """Status of entire workflow"""
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class WorkflowContext:
    """Shared context for workflow execution"""
    variables: Dict[str, Any] = field(default_factory=dict)
    intermediate_results: Dict[str, Any] = field(default_factory=dict)
    user_inputs: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def set_variable(self, key: str, value: Any):
        """Set a workflow variable"""
        self.variables[key] = value
    
    def get_variable(self, key: str, default=None):
        """Get a workflow variable"""
        return self.variables.get(key, default)
    
    def set_result(self, step_id: str, result: Any):
        """Store step result"""
        self.intermediate_results[step_id] = result
    
    def get_result(self, step_id: str, default=None):
        """Get step result"""
        return self.intermediate_results.get(step_id, default)


@dataclass
class WorkflowStep:
    """Individual step in a workflow"""
    id: str
    name: str
    step_type: StepType
    status: StepStatus = StepStatus.PENDING
    
    # Execution details
    executor: Optional[Callable] = None
    condition: Optional[Callable] = None
    dependencies: List[str] = field(default_factory=list)
    
    # Configuration
    config: Dict[str, Any] = field(default_factory=dict)
    retries: int = 0
    max_retries: int = 3
    timeout: Optional[int] = None
    
    # Runtime data
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    result: Any = None
    error: Optional[str] = None
    execution_log: List[str] = field(default_factory=list)
    
    def add_log(self, message: str):
        """Add to execution log"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        self.execution_log.append(f"[{timestamp}] {message}")
    
    def is_ready(self, context: WorkflowContext, completed_steps: set) -> bool:
        """Check if step is ready to execute"""
        if self.status != StepStatus.PENDING:
            return False
        
        # Check dependencies
        for dep_id in self.dependencies:
            if dep_id not in completed_steps:
                return False
        
        # Check condition if present
        if self.condition:
            try:
                return self.condition(context)
            except Exception as e:
                logger.error(f"Condition check failed for step {self.id}: {e}")
                return False
        
        return True


@dataclass
class Workflow:
    """Complete workflow definition"""
    id: str
    name: str
    description: str
    steps: List[WorkflowStep]
    status: WorkflowStatus = WorkflowStatus.CREATED
    
    # Execution context
    context: WorkflowContext = field(default_factory=WorkflowContext)
    
    # Runtime tracking
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    current_step: Optional[str] = None
    completed_steps: set = field(default_factory=set)
    failed_steps: set = field(default_factory=set)
    
    # Configuration
    max_parallel_steps: int = 3
    allow_partial_failure: bool = False
    auto_save: bool = True
    
    def get_step(self, step_id: str) -> Optional[WorkflowStep]:
        """Get step by ID"""
        return next((step for step in self.steps if step.id == step_id), None)
    
    def get_ready_steps(self) -> List[WorkflowStep]:
        """Get steps ready for execution"""
        return [
            step for step in self.steps 
            if step.is_ready(self.context, self.completed_steps)
        ]
    
    def is_complete(self) -> bool:
        """Check if workflow is complete"""
        return len(self.completed_steps) == len(self.steps)
    
    def get_progress(self) -> float:
        """Get completion progress (0-1)"""
        if not self.steps:
            return 1.0
        return len(self.completed_steps) / len(self.steps)


class WorkflowEngine:
    """Orchestrates workflow execution with intelligent agents"""
    # SECURITY WARNING: This class has been updated to remove eval() vulnerabilities
    # All condition evaluation now uses secure AST-based evaluation
    
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.workflows: Dict[str, Workflow] = {}
        self.running_workflows: Dict[str, asyncio.Task] = {}
        self.workflow_lock = Lock()
        
        # Storage
        self.storage_dir = Path.home() / ".bear_ai" / "workflows"
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"WorkflowEngine initialized with {max_workers} workers")
    
    def create_workflow(
        self, 
        name: str, 
        description: str = "",
        workflow_id: Optional[str] = None
    ) -> Workflow:
        """Create a new workflow"""
        if not workflow_id:
            workflow_id = str(uuid.uuid4())
        
        workflow = Workflow(
            id=workflow_id,
            name=name,
            description=description,
            steps=[]
        )
        
        with self.workflow_lock:
            self.workflows[workflow_id] = workflow
        
        logger.info(f"Created workflow '{name}' with ID: {workflow_id}")
        return workflow
    
    def add_step(
        self,
        workflow_id: str,
        step_name: str,
        step_type: StepType,
        executor: Optional[Callable] = None,
        **kwargs
    ) -> WorkflowStep:
        """Add a step to a workflow"""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        step_id = f"{workflow_id}_step_{len(workflow.steps)}"
        
        step = WorkflowStep(
            id=step_id,
            name=step_name,
            step_type=step_type,
            executor=executor,
            **kwargs
        )
        
        workflow.steps.append(step)
        logger.info(f"Added step '{step_name}' to workflow '{workflow.name}'")
        
        return step
    
    async def run_workflow(
        self, 
        workflow_id: str,
        input_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Run a workflow asynchronously"""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        if workflow.status == WorkflowStatus.RUNNING:
            raise ValueError(f"Workflow {workflow_id} is already running")
        
        # Initialize context with input data
        if input_data:
            workflow.context.variables.update(input_data)
        
        workflow.status = WorkflowStatus.RUNNING
        workflow.start_time = time.time()
        
        logger.info(f"Starting workflow '{workflow.name}' ({workflow_id})")
        
        try:
            result = await self._execute_workflow(workflow)
            workflow.status = WorkflowStatus.COMPLETED
            workflow.end_time = time.time()
            
            logger.info(f"Workflow '{workflow.name}' completed successfully")
            
            if workflow.auto_save:
                await self._save_workflow(workflow)
            
            return result
            
        except Exception as e:
            workflow.status = WorkflowStatus.FAILED
            workflow.end_time = time.time()
            
            logger.error(f"Workflow '{workflow.name}' failed: {e}")
            
            if workflow.auto_save:
                await self._save_workflow(workflow)
            
            raise
    
    async def _execute_workflow(self, workflow: Workflow) -> Dict[str, Any]:
        """Execute workflow steps"""
        loop = asyncio.get_event_loop()
        running_tasks = []
        
        while not workflow.is_complete() and workflow.status == WorkflowStatus.RUNNING:
            # Get ready steps
            ready_steps = workflow.get_ready_steps()
            
            if not ready_steps:
                if not running_tasks:
                    # No ready steps and no running tasks - workflow is stuck
                    pending_steps = [s for s in workflow.steps if s.status == StepStatus.PENDING]
                    if pending_steps:
                        raise RuntimeError(f"Workflow deadlock: steps {[s.id for s in pending_steps]} cannot proceed")
                    break
                
                # Wait for at least one running task to complete
                if running_tasks:
                    done, pending = await asyncio.wait(running_tasks, return_when=asyncio.FIRST_COMPLETED)
                    running_tasks = list(pending)
                    
                    # Process completed tasks
                    for task in done:
                        step_id, success, result, error = await task
                        await self._process_step_completion(workflow, step_id, success, result, error)
                
                continue
            
            # Start new tasks (respecting parallel limit)
            while (
                ready_steps and 
                len(running_tasks) < workflow.max_parallel_steps
            ):
                step = ready_steps.pop(0)
                task = loop.create_task(self._execute_step(workflow, step))
                running_tasks.append(task)
        
        # Wait for remaining tasks
        if running_tasks:
            await asyncio.gather(*running_tasks, return_exceptions=True)
        
        # Compile final results
        return {
            "status": workflow.status.value,
            "results": workflow.context.intermediate_results,
            "variables": workflow.context.variables,
            "execution_time": (workflow.end_time or time.time()) - workflow.start_time,
            "completed_steps": len(workflow.completed_steps),
            "failed_steps": len(workflow.failed_steps)
        }
    
    async def _execute_step(
        self, 
        workflow: Workflow, 
        step: WorkflowStep
    ) -> tuple[str, bool, Any, Optional[str]]:
        """Execute a single workflow step"""
        step.status = StepStatus.RUNNING
        step.start_time = time.time()
        step.add_log(f"Started execution of step '{step.name}'")
        
        workflow.current_step = step.id
        
        try:
            # Execute based on step type
            if step.step_type == StepType.LLM_GENERATION:
                result = await self._execute_llm_step(workflow, step)
            elif step.step_type == StepType.TOOL_EXECUTION:
                result = await self._execute_tool_step(workflow, step)
            elif step.step_type == StepType.HUMAN_INPUT:
                result = await self._execute_human_input_step(workflow, step)
            elif step.step_type == StepType.CONDITIONAL:
                result = await self._execute_conditional_step(workflow, step)
            elif step.executor:
                # Custom executor
                if asyncio.iscoroutinefunction(step.executor):
                    result = await step.executor(workflow.context, step.config)
                else:
                    loop = asyncio.get_event_loop()
                    result = await loop.run_in_executor(
                        self.executor, 
                        step.executor, 
                        workflow.context, 
                        step.config
                    )
            else:
                raise ValueError(f"No executor defined for step {step.id}")
            
            step.result = result
            step.status = StepStatus.COMPLETED
            step.end_time = time.time()
            step.add_log(f"Completed successfully")
            
            # Store result in context
            workflow.context.set_result(step.id, result)
            
            return step.id, True, result, None
            
        except Exception as e:
            error_msg = str(e)
            step.error = error_msg
            step.status = StepStatus.FAILED
            step.end_time = time.time()
            step.add_log(f"Failed with error: {error_msg}")
            
            # Retry logic
            if step.retries < step.max_retries:
                step.retries += 1
                step.status = StepStatus.PENDING
                step.add_log(f"Retrying ({step.retries}/{step.max_retries})")
                return await self._execute_step(workflow, step)
            
            return step.id, False, None, error_msg
    
    async def _execute_llm_step(self, workflow: Workflow, step: WorkflowStep) -> Any:
        """Execute LLM generation step"""
        from ..models import get_model_manager
        
        manager = get_model_manager()
        
        prompt = step.config.get('prompt', '')
        model = step.config.get('model')
        generation_params = step.config.get('params', {})
        
        # Replace placeholders in prompt
        for key, value in workflow.context.variables.items():
            prompt = prompt.replace(f"{{{key}}}", str(value))
        
        result = manager.generate_text(prompt, model, **generation_params)
        
        if not result:
            raise RuntimeError("LLM generation returned no result")
        
        return result
    
    async def _execute_tool_step(self, workflow: Workflow, step: WorkflowStep) -> Any:
        """Execute tool step"""
        from ..tools import get_tool_manager
        
        tool_manager = get_tool_manager()
        
        tool_name = step.config.get('tool')
        tool_params = step.config.get('params', {})
        
        if not tool_name:
            raise ValueError("Tool name not specified in step config")
        
        # Replace placeholders in parameters
        for key, value in tool_params.items():
            if isinstance(value, str):
                for var_key, var_value in workflow.context.variables.items():
                    value = value.replace(f"{{{var_key}}}", str(var_value))
                tool_params[key] = value
        
        result = await tool_manager.execute_tool(tool_name, **tool_params)
        return result
    
    async def _execute_human_input_step(self, workflow: Workflow, step: WorkflowStep) -> Any:
        """Execute human input step"""
        prompt = step.config.get('prompt', 'Please provide input:')
        input_type = step.config.get('type', 'text')
        
        step.status = StepStatus.WAITING_INPUT
        step.add_log(f"Waiting for human input: {prompt}")
        
        # Store input request
        workflow.context.metadata[f'input_request_{step.id}'] = {
            'prompt': prompt,
            'type': input_type,
            'step_id': step.id
        }
        
        # Wait for input (in real implementation, this would be handled differently)
        # For now, we'll check if input was pre-provided
        input_key = step.config.get('input_key', step.id)
        
        if input_key in workflow.context.user_inputs:
            return workflow.context.user_inputs[input_key]
        
        # Simulate waiting for input
        await asyncio.sleep(0.1)
        return workflow.context.user_inputs.get(input_key, "No input provided")
    
    async def _execute_conditional_step(self, workflow: Workflow, step: WorkflowStep) -> Any:
        """Execute conditional step"""
        condition = step.config.get('condition')
        true_action = step.config.get('true_action')
        false_action = step.config.get('false_action')
        
        if not condition:
            raise ValueError("Condition not specified for conditional step")
        
        # Evaluate condition securely
        if callable(condition):
            result = condition(workflow.context)
        else:
            # SECURITY FIX: Replaced eval() with secure evaluator
            # result = eval(condition, {"context": workflow.context, "vars": workflow.context.variables}) # DANGEROUS - REMOVED
            try:
                secure_evaluator = SecureConditionEvaluator()
                result = secure_evaluator.evaluate(condition, {
                    "context": workflow.context,
                    "vars": workflow.context.variables
                })
            except (SecurityError, NameError, ValueError) as e:
                raise ValueError(f"Condition evaluation failed: {e}")
        
        if result:
            return true_action(workflow.context) if callable(true_action) else true_action
        else:
            return false_action(workflow.context) if callable(false_action) else false_action
    
    async def _process_step_completion(
        self, 
        workflow: Workflow, 
        step_id: str, 
        success: bool, 
        result: Any, 
        error: Optional[str]
    ):
        """Process completed step"""
        if success:
            workflow.completed_steps.add(step_id)
            logger.debug(f"Step {step_id} completed successfully")
        else:
            workflow.failed_steps.add(step_id)
            logger.error(f"Step {step_id} failed: {error}")
            
            if not workflow.allow_partial_failure:
                workflow.status = WorkflowStatus.FAILED
    
    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get workflow status and progress"""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            return None
        
        return {
            "id": workflow.id,
            "name": workflow.name,
            "status": workflow.status.value,
            "progress": workflow.get_progress(),
            "current_step": workflow.current_step,
            "completed_steps": len(workflow.completed_steps),
            "failed_steps": len(workflow.failed_steps),
            "total_steps": len(workflow.steps),
            "start_time": workflow.start_time,
            "execution_time": (
                (workflow.end_time or time.time()) - workflow.start_time
            ) if workflow.start_time else None
        }
    
    def pause_workflow(self, workflow_id: str) -> bool:
        """Pause a running workflow"""
        workflow = self.workflows.get(workflow_id)
        if workflow and workflow.status == WorkflowStatus.RUNNING:
            workflow.status = WorkflowStatus.PAUSED
            logger.info(f"Paused workflow '{workflow.name}'")
            return True
        return False
    
    def resume_workflow(self, workflow_id: str) -> bool:
        """Resume a paused workflow"""
        workflow = self.workflows.get(workflow_id)
        if workflow and workflow.status == WorkflowStatus.PAUSED:
            workflow.status = WorkflowStatus.RUNNING
            logger.info(f"Resumed workflow '{workflow.name}'")
            return True
        return False
    
    def cancel_workflow(self, workflow_id: str) -> bool:
        """Cancel a workflow"""
        workflow = self.workflows.get(workflow_id)
        if workflow:
            workflow.status = WorkflowStatus.CANCELLED
            logger.info(f"Cancelled workflow '{workflow.name}'")
            return True
        return False
    
    async def _save_workflow(self, workflow: Workflow):
        """Save workflow state to disk"""
        workflow_file = self.storage_dir / f"{workflow.id}.json"
        
        workflow_data = {
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "status": workflow.status.value,
            "start_time": workflow.start_time,
            "end_time": workflow.end_time,
            "steps": [
                {
                    "id": step.id,
                    "name": step.name,
                    "step_type": step.step_type.value,
                    "status": step.status.value,
                    "start_time": step.start_time,
                    "end_time": step.end_time,
                    "result": step.result,
                    "error": step.error,
                    "retries": step.retries,
                    "execution_log": step.execution_log
                }
                for step in workflow.steps
            ],
            "context": {
                "variables": workflow.context.variables,
                "intermediate_results": workflow.context.intermediate_results,
                "metadata": workflow.context.metadata
            }
        }
        
        with open(workflow_file, 'w', encoding='utf-8') as f:
            json.dump(workflow_data, f, indent=2, ensure_ascii=False, default=str)
    
    def cleanup(self):
        """Cleanup resources"""
        self.executor.shutdown(wait=True)
        logger.info("WorkflowEngine cleaned up")


# Global workflow engine instance
_global_engine: Optional[WorkflowEngine] = None

def get_workflow_engine() -> WorkflowEngine:
    """Get the global workflow engine"""
    global _global_engine
    if _global_engine is None:
        _global_engine = WorkflowEngine()
    return _global_engine

def create_workflow(name: str, description: str = "") -> Workflow:
    """Create a new workflow"""
    return get_workflow_engine().create_workflow(name, description)

async def run_workflow(workflow_id: str, input_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Run a workflow"""
    return await get_workflow_engine().run_workflow(workflow_id, input_data)

def get_workflow_status(workflow_id: str) -> Optional[Dict[str, Any]]:
    """Get workflow status"""
    return get_workflow_engine().get_workflow_status(workflow_id)