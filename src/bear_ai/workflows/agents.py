"""
Workflow Agents
Specialized agents for workflow execution and coordination
"""

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Callable

from .workflow_engine import WorkflowContext, WorkflowStep, StepStatus

logger = logging.getLogger(__name__)


class AgentRole(Enum):
    """Types of workflow agents"""
    COORDINATOR = "coordinator"
    EXECUTOR = "executor"
    VALIDATOR = "validator"
    MONITOR = "monitor"
    SPECIALIST = "specialist"


@dataclass
class AgentCapability:
    """Capability that an agent possesses"""
    name: str
    description: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 1.0


class WorkflowAgent(ABC):
    """Base class for workflow agents"""
    
    def __init__(
        self,
        agent_id: str,
        name: str,
        role: AgentRole,
        capabilities: Optional[List[AgentCapability]] = None
    ):
        self.agent_id = agent_id
        self.name = name
        self.role = role
        self.capabilities = capabilities or []
        
        # State tracking
        self.is_active = False
        self.current_task = None
        self.task_history: List[Dict[str, Any]] = []
        
        # Performance metrics
        self.tasks_completed = 0
        self.tasks_failed = 0
        self.average_task_time = 0.0
        
        logger.info(f"Initialized {self.role.value} agent: {self.name}")
    
    @abstractmethod
    async def execute_task(
        self, 
        task: Dict[str, Any], 
        context: WorkflowContext
    ) -> Dict[str, Any]:
        """Execute a task assigned to this agent"""
        pass
    
    def can_handle_task(self, task: Dict[str, Any]) -> float:
        """Return confidence score (0-1) for handling this task"""
        task_type = task.get('type', '')
        
        # Check if any capability matches
        for capability in self.capabilities:
            if capability.name.lower() in task_type.lower():
                return capability.confidence
        
        return 0.0
    
    async def start_task(self, task: Dict[str, Any], context: WorkflowContext):
        """Start executing a task"""
        self.is_active = True
        self.current_task = task
        
        start_time = time.time()
        
        try:
            result = await self.execute_task(task, context)
            
            execution_time = time.time() - start_time
            
            # Update metrics
            self.tasks_completed += 1
            self._update_average_time(execution_time)
            
            # Log task completion
            self.task_history.append({
                'task_id': task.get('id'),
                'status': 'completed',
                'execution_time': execution_time,
                'result': result,
                'timestamp': time.time()
            })
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            
            # Update failure metrics
            self.tasks_failed += 1
            
            # Log task failure
            self.task_history.append({
                'task_id': task.get('id'),
                'status': 'failed',
                'execution_time': execution_time,
                'error': str(e),
                'timestamp': time.time()
            })
            
            raise
        
        finally:
            self.is_active = False
            self.current_task = None
    
    def _update_average_time(self, new_time: float):
        """Update average task execution time"""
        total_tasks = self.tasks_completed + self.tasks_failed
        if total_tasks == 1:
            self.average_task_time = new_time
        else:
            self.average_task_time = (
                (self.average_task_time * (total_tasks - 1) + new_time) / total_tasks
            )
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get agent performance metrics"""
        total_tasks = self.tasks_completed + self.tasks_failed
        success_rate = self.tasks_completed / total_tasks if total_tasks > 0 else 0
        
        return {
            'agent_id': self.agent_id,
            'name': self.name,
            'role': self.role.value,
            'is_active': self.is_active,
            'tasks_completed': self.tasks_completed,
            'tasks_failed': self.tasks_failed,
            'success_rate': success_rate,
            'average_task_time': self.average_task_time,
            'capabilities': [cap.name for cap in self.capabilities]
        }


class CoordinatorAgent(WorkflowAgent):
    """Agent that coordinates workflow execution and task delegation"""
    
    def __init__(self, agent_id: str = "coordinator", name: str = "Workflow Coordinator"):
        capabilities = [
            AgentCapability("task_delegation", "Delegate tasks to appropriate agents", confidence=1.0),
            AgentCapability("workflow_planning", "Plan and optimize workflow execution", confidence=0.9),
            AgentCapability("resource_management", "Manage agent resources and load balancing", confidence=0.8),
            AgentCapability("decision_making", "Make strategic workflow decisions", confidence=0.9)
        ]
        
        super().__init__(agent_id, name, AgentRole.COORDINATOR, capabilities)
        
        # Coordinator-specific attributes
        self.managed_agents: Dict[str, WorkflowAgent] = {}
        self.task_queue: List[Dict[str, Any]] = []
        self.delegation_strategy = "capability_based"  # or "load_balanced", "round_robin"
    
    async def execute_task(
        self, 
        task: Dict[str, Any], 
        context: WorkflowContext
    ) -> Dict[str, Any]:
        """Coordinate workflow execution"""
        task_type = task.get('type', 'coordinate')
        
        if task_type == 'coordinate':
            return await self._coordinate_workflow(task, context)
        elif task_type == 'delegate':
            return await self._delegate_task(task, context)
        elif task_type == 'monitor':
            return await self._monitor_progress(task, context)
        else:
            raise ValueError(f"Unknown coordinator task type: {task_type}")
    
    async def _coordinate_workflow(self, task: Dict[str, Any], context: WorkflowContext) -> Dict[str, Any]:
        """Coordinate overall workflow execution"""
        workflow_plan = task.get('workflow_plan', {})
        
        logger.info(f"Coordinating workflow with {len(workflow_plan.get('steps', []))} steps")
        
        # Analyze workflow and create execution plan
        execution_plan = self._create_execution_plan(workflow_plan)
        
        # Store plan in context
        context.set_variable('execution_plan', execution_plan)
        
        return {
            'status': 'plan_created',
            'execution_plan': execution_plan,
            'estimated_time': execution_plan.get('estimated_time', 0)
        }
    
    async def _delegate_task(self, task: Dict[str, Any], context: WorkflowContext) -> Dict[str, Any]:
        """Delegate task to most suitable agent"""
        subtasks = task.get('subtasks', [])
        
        delegation_results = []
        
        for subtask in subtasks:
            # Find best agent for this subtask
            best_agent = self._select_best_agent(subtask)
            
            if best_agent:
                logger.info(f"Delegating task {subtask.get('id')} to agent {best_agent.name}")
                
                try:
                    result = await best_agent.start_task(subtask, context)
                    delegation_results.append({
                        'task_id': subtask.get('id'),
                        'agent_id': best_agent.agent_id,
                        'status': 'completed',
                        'result': result
                    })
                except Exception as e:
                    delegation_results.append({
                        'task_id': subtask.get('id'),
                        'agent_id': best_agent.agent_id,
                        'status': 'failed',
                        'error': str(e)
                    })
            else:
                logger.warning(f"No suitable agent found for task {subtask.get('id')}")
                delegation_results.append({
                    'task_id': subtask.get('id'),
                    'status': 'no_agent',
                    'error': 'No suitable agent available'
                })
        
        return {
            'status': 'delegation_complete',
            'results': delegation_results,
            'total_tasks': len(subtasks),
            'completed_tasks': len([r for r in delegation_results if r['status'] == 'completed'])
        }
    
    async def _monitor_progress(self, task: Dict[str, Any], context: WorkflowContext) -> Dict[str, Any]:
        """Monitor workflow progress and agent status"""
        agent_statuses = {}
        
        for agent_id, agent in self.managed_agents.items():
            agent_statuses[agent_id] = agent.get_performance_metrics()
        
        return {
            'status': 'monitoring_complete',
            'agent_statuses': agent_statuses,
            'active_agents': len([a for a in self.managed_agents.values() if a.is_active]),
            'total_agents': len(self.managed_agents)
        }
    
    def _create_execution_plan(self, workflow_plan: Dict[str, Any]) -> Dict[str, Any]:
        """Create optimized execution plan"""
        steps = workflow_plan.get('steps', [])
        
        # Simple execution plan - in practice this would be more sophisticated
        plan = {
            'steps': steps,
            'estimated_time': len(steps) * 30,  # 30 seconds per step estimate
            'parallelizable_steps': [],
            'critical_path': [step['id'] for step in steps]
        }
        
        return plan
    
    def _select_best_agent(self, task: Dict[str, Any]) -> Optional[WorkflowAgent]:
        """Select the best agent for a task"""
        if not self.managed_agents:
            return None
        
        # Score agents based on capability and availability
        agent_scores = {}
        
        for agent_id, agent in self.managed_agents.items():
            if agent.is_active:
                continue  # Skip busy agents
            
            capability_score = agent.can_handle_task(task)
            
            if capability_score > 0:
                # Factor in performance metrics
                performance_bonus = agent.tasks_completed / max(agent.tasks_completed + agent.tasks_failed, 1)
                total_score = capability_score * 0.7 + performance_bonus * 0.3
                
                agent_scores[agent_id] = total_score
        
        if not agent_scores:
            return None
        
        # Return agent with highest score
        best_agent_id = max(agent_scores, key=agent_scores.get)
        return self.managed_agents[best_agent_id]
    
    def add_agent(self, agent: WorkflowAgent):
        """Add an agent to coordinate"""
        self.managed_agents[agent.agent_id] = agent
        logger.info(f"Added agent {agent.name} to coordinator")
    
    def remove_agent(self, agent_id: str):
        """Remove an agent from coordination"""
        if agent_id in self.managed_agents:
            del self.managed_agents[agent_id]
            logger.info(f"Removed agent {agent_id} from coordinator")


class ExecutorAgent(WorkflowAgent):
    """Agent that executes specific workflow steps"""
    
    def __init__(
        self, 
        agent_id: str = "executor", 
        name: str = "Task Executor",
        specializations: Optional[List[str]] = None
    ):
        capabilities = [
            AgentCapability("llm_generation", "Generate text using language models", confidence=0.9),
            AgentCapability("tool_execution", "Execute various tools and utilities", confidence=0.8),
            AgentCapability("data_processing", "Process and transform data", confidence=0.7),
            AgentCapability("file_operations", "Perform file system operations", confidence=0.8)
        ]
        
        # Add specialization capabilities
        if specializations:
            for spec in specializations:
                capabilities.append(
                    AgentCapability(spec, f"Specialized in {spec}", confidence=0.9)
                )
        
        super().__init__(agent_id, name, AgentRole.EXECUTOR, capabilities)
        self.specializations = specializations or []
    
    async def execute_task(
        self, 
        task: Dict[str, Any], 
        context: WorkflowContext
    ) -> Dict[str, Any]:
        """Execute a workflow step"""
        task_type = task.get('type', 'unknown')
        
        logger.info(f"Executing {task_type} task: {task.get('name', 'unnamed')}")
        
        if task_type == 'llm_generation':
            return await self._execute_llm_task(task, context)
        elif task_type == 'tool_execution':
            return await self._execute_tool_task(task, context)
        elif task_type == 'data_processing':
            return await self._execute_data_task(task, context)
        elif task_type == 'file_operations':
            return await self._execute_file_task(task, context)
        else:
            # Generic execution attempt
            return await self._execute_generic_task(task, context)
    
    async def _execute_llm_task(self, task: Dict[str, Any], context: WorkflowContext) -> Dict[str, Any]:
        """Execute LLM generation task"""
        from ..models import get_model_manager
        
        manager = get_model_manager()
        
        prompt = task.get('prompt', '')
        model = task.get('model')
        params = task.get('params', {})
        
        # Replace context variables in prompt
        for key, value in context.variables.items():
            prompt = prompt.replace(f"{{{key}}}", str(value))
        
        result = manager.generate_text(prompt, model, **params)
        
        return {
            'status': 'completed',
            'result': result,
            'task_type': 'llm_generation'
        }
    
    async def _execute_tool_task(self, task: Dict[str, Any], context: WorkflowContext) -> Dict[str, Any]:
        """Execute tool-based task"""
        tool_name = task.get('tool')
        tool_params = task.get('params', {})
        
        if not tool_name:
            raise ValueError("Tool name not specified")
        
        # In a real implementation, this would use a proper tool manager
        # For now, we'll simulate tool execution
        await asyncio.sleep(0.1)  # Simulate tool execution time
        
        return {
            'status': 'completed',
            'result': f"Executed {tool_name} with params {tool_params}",
            'task_type': 'tool_execution'
        }
    
    async def _execute_data_task(self, task: Dict[str, Any], context: WorkflowContext) -> Dict[str, Any]:
        """Execute data processing task"""
        operation = task.get('operation', 'process')
        data = task.get('data') or context.get_variable('data')
        
        if not data:
            raise ValueError("No data provided for processing")
        
        # Simulate data processing
        await asyncio.sleep(0.2)
        
        processed_data = f"Processed data using {operation} operation"
        
        return {
            'status': 'completed',
            'result': processed_data,
            'task_type': 'data_processing'
        }
    
    async def _execute_file_task(self, task: Dict[str, Any], context: WorkflowContext) -> Dict[str, Any]:
        """Execute file operations task"""
        operation = task.get('operation', 'read')
        file_path = task.get('file_path')
        
        if not file_path:
            raise ValueError("File path not specified")
        
        # Simulate file operation
        await asyncio.sleep(0.1)
        
        return {
            'status': 'completed',
            'result': f"Performed {operation} on {file_path}",
            'task_type': 'file_operations'
        }
    
    async def _execute_generic_task(self, task: Dict[str, Any], context: WorkflowContext) -> Dict[str, Any]:
        """Execute generic task"""
        logger.warning(f"Generic execution for unknown task type: {task.get('type')}")
        
        await asyncio.sleep(0.1)
        
        return {
            'status': 'completed',
            'result': f"Generic execution of task {task.get('name')}",
            'task_type': 'generic'
        }


class ValidatorAgent(WorkflowAgent):
    """Agent that validates workflow results and ensures quality"""
    
    def __init__(self, agent_id: str = "validator", name: str = "Quality Validator"):
        capabilities = [
            AgentCapability("result_validation", "Validate task results and outputs", confidence=0.9),
            AgentCapability("quality_assurance", "Ensure output quality standards", confidence=0.8),
            AgentCapability("compliance_check", "Check compliance with requirements", confidence=0.7),
            AgentCapability("error_detection", "Detect and report errors", confidence=0.9)
        ]
        
        super().__init__(agent_id, name, AgentRole.VALIDATOR, capabilities)
        
        # Validation rules and criteria
        self.validation_rules: List[Callable] = []
        self.quality_metrics: Dict[str, float] = {}
    
    async def execute_task(
        self, 
        task: Dict[str, Any], 
        context: WorkflowContext
    ) -> Dict[str, Any]:
        """Validate workflow results"""
        validation_type = task.get('type', 'validate')
        
        if validation_type == 'validate':
            return await self._validate_result(task, context)
        elif validation_type == 'quality_check':
            return await self._quality_check(task, context)
        elif validation_type == 'compliance_check':
            return await self._compliance_check(task, context)
        else:
            raise ValueError(f"Unknown validation task type: {validation_type}")
    
    async def _validate_result(self, task: Dict[str, Any], context: WorkflowContext) -> Dict[str, Any]:
        """Validate a task result"""
        step_id = task.get('step_id')
        validation_criteria = task.get('criteria', {})
        
        if not step_id:
            raise ValueError("Step ID not provided for validation")
        
        result = context.get_result(step_id)
        
        if result is None:
            return {
                'status': 'failed',
                'result': False,
                'reason': f'No result found for step {step_id}'
            }
        
        # Perform validation checks
        validation_results = []
        
        # Check basic criteria
        if validation_criteria.get('not_empty', False):
            is_valid = result and str(result).strip()
            validation_results.append({
                'check': 'not_empty',
                'passed': is_valid,
                'message': 'Result is not empty' if is_valid else 'Result is empty'
            })
        
        if validation_criteria.get('min_length'):
            min_len = validation_criteria['min_length']
            is_valid = len(str(result)) >= min_len
            validation_results.append({
                'check': 'min_length',
                'passed': is_valid,
                'message': f'Result meets minimum length of {min_len}' if is_valid else f'Result is shorter than {min_len} characters'
            })
        
        if validation_criteria.get('contains'):
            required_text = validation_criteria['contains']
            is_valid = required_text.lower() in str(result).lower()
            validation_results.append({
                'check': 'contains',
                'passed': is_valid,
                'message': f'Result contains required text' if is_valid else f'Result missing required text: {required_text}'
            })
        
        # Run custom validation rules
        for rule in self.validation_rules:
            try:
                rule_result = rule(result, context)
                validation_results.append(rule_result)
            except Exception as e:
                validation_results.append({
                    'check': 'custom_rule',
                    'passed': False,
                    'message': f'Custom rule failed: {e}'
                })
        
        # Determine overall validation result
        all_passed = all(check['passed'] for check in validation_results)
        
        return {
            'status': 'completed',
            'result': all_passed,
            'validation_results': validation_results,
            'step_id': step_id
        }
    
    async def _quality_check(self, task: Dict[str, Any], context: WorkflowContext) -> Dict[str, Any]:
        """Perform quality assurance check"""
        step_id = task.get('step_id')
        quality_standards = task.get('standards', {})
        
        result = context.get_result(step_id)
        
        # Calculate quality metrics
        quality_score = 0.0
        quality_checks = []
        
        # Completeness check
        if result:
            completeness = min(len(str(result)) / quality_standards.get('expected_length', 100), 1.0)
            quality_score += completeness * 0.3
            quality_checks.append({
                'metric': 'completeness',
                'score': completeness,
                'weight': 0.3
            })
        
        # Coherence check (simple heuristic)
        if isinstance(result, str):
            sentences = result.split('.')
            coherence = min(len(sentences) / max(len(sentences), 1), 1.0)
            quality_score += coherence * 0.2
            quality_checks.append({
                'metric': 'coherence',
                'score': coherence,
                'weight': 0.2
            })
        
        # Accuracy check (would need specialized validation)
        accuracy = 0.8  # Placeholder - would need domain-specific validation
        quality_score += accuracy * 0.5
        quality_checks.append({
            'metric': 'accuracy',
            'score': accuracy,
            'weight': 0.5
        })
        
        quality_passed = quality_score >= quality_standards.get('min_score', 0.7)
        
        return {
            'status': 'completed',
            'result': quality_passed,
            'quality_score': quality_score,
            'quality_checks': quality_checks,
            'step_id': step_id
        }
    
    async def _compliance_check(self, task: Dict[str, Any], context: WorkflowContext) -> Dict[str, Any]:
        """Check compliance with requirements"""
        requirements = task.get('requirements', [])
        step_id = task.get('step_id')
        
        result = context.get_result(step_id)
        compliance_results = []
        
        for req in requirements:
            req_type = req.get('type')
            req_value = req.get('value')
            
            if req_type == 'format':
                # Check format compliance
                is_compliant = True  # Placeholder - would implement specific format checks
                compliance_results.append({
                    'requirement': req_type,
                    'compliant': is_compliant,
                    'details': f'Format check for {req_value}'
                })
            
            elif req_type == 'length':
                # Check length requirements
                actual_length = len(str(result)) if result else 0
                is_compliant = actual_length >= req_value.get('min', 0) and actual_length <= req_value.get('max', float('inf'))
                compliance_results.append({
                    'requirement': req_type,
                    'compliant': is_compliant,
                    'details': f'Length: {actual_length}, Required: {req_value}'
                })
        
        all_compliant = all(check['compliant'] for check in compliance_results)
        
        return {
            'status': 'completed',
            'result': all_compliant,
            'compliance_results': compliance_results,
            'step_id': step_id
        }
    
    def add_validation_rule(self, rule: Callable):
        """Add custom validation rule"""
        self.validation_rules.append(rule)


# Agent factory and management
def create_agent(
    agent_type: str,
    agent_id: Optional[str] = None,
    name: Optional[str] = None,
    **kwargs
) -> WorkflowAgent:
    """Create an agent of the specified type"""
    
    if agent_type == "coordinator":
        return CoordinatorAgent(
            agent_id or "coordinator",
            name or "Workflow Coordinator"
        )
    
    elif agent_type == "executor":
        return ExecutorAgent(
            agent_id or f"executor_{int(time.time())}",
            name or "Task Executor",
            specializations=kwargs.get('specializations')
        )
    
    elif agent_type == "validator":
        return ValidatorAgent(
            agent_id or "validator",
            name or "Quality Validator"
        )
    
    else:
        raise ValueError(f"Unknown agent type: {agent_type}")


# Global agent registry
_agent_registry: Dict[str, WorkflowAgent] = {}

def register_agent(agent: WorkflowAgent):
    """Register an agent globally"""
    _agent_registry[agent.agent_id] = agent
    logger.info(f"Registered agent: {agent.name}")

def get_agent(agent_id: str) -> Optional[WorkflowAgent]:
    """Get agent by ID"""
    return _agent_registry.get(agent_id)

def list_agents() -> List[WorkflowAgent]:
    """List all registered agents"""
    return list(_agent_registry.values())