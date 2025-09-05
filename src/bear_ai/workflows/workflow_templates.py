"""
Workflow Templates System
Pre-built workflows for common tasks
"""

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable

from .workflow_engine import Workflow, WorkflowStep, StepType, get_workflow_engine

logger = logging.getLogger(__name__)


@dataclass
class WorkflowTemplate:
    """Template for creating workflows"""
    name: str
    description: str
    category: str
    version: str = "1.0.0"
    
    # Template structure
    steps: List[Dict[str, Any]] = field(default_factory=list)
    input_schema: Dict[str, Any] = field(default_factory=dict)
    output_schema: Dict[str, Any] = field(default_factory=dict)
    
    # Configuration
    default_config: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    
    def create_workflow(
        self, 
        workflow_name: Optional[str] = None,
        config_overrides: Optional[Dict[str, Any]] = None
    ) -> Workflow:
        """Create a workflow instance from this template"""
        engine = get_workflow_engine()
        
        # Create base workflow
        workflow = engine.create_workflow(
            name=workflow_name or self.name,
            description=self.description
        )
        
        # Merge configuration
        config = self.default_config.copy()
        if config_overrides:
            config.update(config_overrides)
        
        # Add steps
        for step_def in self.steps:
            step_config = step_def.get('config', {})
            step_config.update(config.get(step_def['id'], {}))
            
            engine.add_step(
                workflow_id=workflow.id,
                step_name=step_def['name'],
                step_type=StepType(step_def['type']),
                config=step_config,
                dependencies=step_def.get('dependencies', []),
                max_retries=step_def.get('max_retries', 3),
                timeout=step_def.get('timeout')
            )
        
        return workflow


class TemplateRegistry:
    """Registry for workflow templates"""
    
    def __init__(self):
        self.templates: Dict[str, WorkflowTemplate] = {}
        self.categories: Dict[str, List[str]] = {}
        
        # Storage
        self.template_dir = Path.home() / ".bear_ai" / "workflow_templates"
        self.template_dir.mkdir(parents=True, exist_ok=True)
        
        # Load built-in templates
        self._register_builtin_templates()
        
        logger.info("TemplateRegistry initialized")
    
    def register_template(self, template: WorkflowTemplate):
        """Register a new template"""
        self.templates[template.name] = template
        
        # Update category index
        category = template.category
        if category not in self.categories:
            self.categories[category] = []
        
        if template.name not in self.categories[category]:
            self.categories[category].append(template.name)
        
        logger.info(f"Registered template '{template.name}' in category '{category}'")
    
    def get_template(self, name: str) -> Optional[WorkflowTemplate]:
        """Get template by name"""
        return self.templates.get(name)
    
    def list_templates(self, category: Optional[str] = None) -> List[WorkflowTemplate]:
        """List available templates"""
        if category:
            template_names = self.categories.get(category, [])
            return [self.templates[name] for name in template_names]
        
        return list(self.templates.values())
    
    def get_categories(self) -> List[str]:
        """Get all template categories"""
        return list(self.categories.keys())
    
    def search_templates(self, query: str) -> List[WorkflowTemplate]:
        """Search templates by name, description, or tags"""
        query_lower = query.lower()
        results = []
        
        for template in self.templates.values():
            if (
                query_lower in template.name.lower() or
                query_lower in template.description.lower() or
                any(query_lower in tag.lower() for tag in template.tags)
            ):
                results.append(template)
        
        return results
    
    def _register_builtin_templates(self):
        """Register built-in workflow templates"""
        
        # Document Analysis Template
        doc_analysis = WorkflowTemplate(
            name="document_analysis",
            description="Analyze and summarize documents with key insights",
            category="document_processing",
            tags=["analysis", "summary", "document", "text"],
            steps=[
                {
                    "id": "load_document",
                    "name": "Load Document",
                    "type": "tool_execution",
                    "config": {
                        "tool": "file_reader",
                        "params": {"file_path": "{input_file}"}
                    }
                },
                {
                    "id": "extract_text",
                    "name": "Extract Text Content",
                    "type": "tool_execution",
                    "dependencies": ["load_document"],
                    "config": {
                        "tool": "text_extractor",
                        "params": {"content": "{load_document.result}"}
                    }
                },
                {
                    "id": "analyze_content",
                    "name": "Analyze Content",
                    "type": "llm_generation",
                    "dependencies": ["extract_text"],
                    "config": {
                        "prompt": "Analyze the following document and provide key insights, main themes, and a summary:\\n\\n{extract_text.result}",
                        "params": {
                            "max_tokens": 1000,
                            "temperature": 0.3
                        }
                    }
                },
                {
                    "id": "generate_summary",
                    "name": "Generate Executive Summary",
                    "type": "llm_generation",
                    "dependencies": ["analyze_content"],
                    "config": {
                        "prompt": "Based on this analysis:\\n{analyze_content.result}\\n\\nCreate a concise executive summary highlighting the most important points:",
                        "params": {
                            "max_tokens": 500,
                            "temperature": 0.2
                        }
                    }
                }
            ],
            input_schema={
                "input_file": {"type": "string", "description": "Path to document file"}
            }
        )
        
        # Code Review Template
        code_review = WorkflowTemplate(
            name="code_review",
            description="Comprehensive code review with security and performance analysis",
            category="development",
            tags=["code", "review", "security", "performance"],
            steps=[
                {
                    "id": "load_code",
                    "name": "Load Code Files",
                    "type": "tool_execution",
                    "config": {
                        "tool": "git_operations",
                        "params": {"action": "diff", "target": "{git_ref}"}
                    }
                },
                {
                    "id": "syntax_check",
                    "name": "Syntax and Style Check",
                    "type": "llm_generation",
                    "dependencies": ["load_code"],
                    "config": {
                        "prompt": "Review this code for syntax errors, style issues, and best practices:\\n\\n{load_code.result}",
                        "params": {"max_tokens": 800}
                    }
                },
                {
                    "id": "security_analysis",
                    "name": "Security Analysis",
                    "type": "llm_generation",
                    "dependencies": ["load_code"],
                    "config": {
                        "prompt": "Analyze this code for security vulnerabilities and potential risks:\\n\\n{load_code.result}",
                        "params": {"max_tokens": 800}
                    }
                },
                {
                    "id": "performance_review",
                    "name": "Performance Review",
                    "type": "llm_generation",
                    "dependencies": ["load_code"],
                    "config": {
                        "prompt": "Review this code for performance issues and optimization opportunities:\\n\\n{load_code.result}",
                        "params": {"max_tokens": 800}
                    }
                },
                {
                    "id": "compile_report",
                    "name": "Compile Review Report",
                    "type": "llm_generation",
                    "dependencies": ["syntax_check", "security_analysis", "performance_review"],
                    "config": {
                        "prompt": "Compile a comprehensive code review report based on:\\n\\nStyle: {syntax_check.result}\\n\\nSecurity: {security_analysis.result}\\n\\nPerformance: {performance_review.result}",
                        "params": {"max_tokens": 1200}
                    }
                }
            ],
            input_schema={
                "git_ref": {"type": "string", "description": "Git reference (branch, commit, etc.)"}
            }
        )
        
        # Research Template
        research_workflow = WorkflowTemplate(
            name="research_and_synthesis",
            description="Research a topic and synthesize findings into a comprehensive report",
            category="research",
            tags=["research", "web_search", "synthesis", "report"],
            steps=[
                {
                    "id": "initial_search",
                    "name": "Initial Web Search",
                    "type": "tool_execution",
                    "config": {
                        "tool": "web_search",
                        "params": {"query": "{research_topic}", "max_results": 10}
                    }
                },
                {
                    "id": "analyze_sources",
                    "name": "Analyze Search Results",
                    "type": "llm_generation",
                    "dependencies": ["initial_search"],
                    "config": {
                        "prompt": "Analyze these search results and identify the most relevant and credible sources for research on '{research_topic}':\\n\\n{initial_search.result}",
                        "params": {"max_tokens": 800}
                    }
                },
                {
                    "id": "deep_dive_search",
                    "name": "Targeted Deep Search",
                    "type": "tool_execution",
                    "dependencies": ["analyze_sources"],
                    "config": {
                        "tool": "web_search",
                        "params": {"query": "{research_topic} detailed analysis", "max_results": 15}
                    }
                },
                {
                    "id": "synthesize_findings",
                    "name": "Synthesize Research Findings",
                    "type": "llm_generation",
                    "dependencies": ["deep_dive_search"],
                    "config": {
                        "prompt": "Synthesize the following research findings into a coherent analysis of '{research_topic}':\\n\\n{deep_dive_search.result}",
                        "params": {"max_tokens": 1500}
                    }
                },
                {
                    "id": "generate_report",
                    "name": "Generate Research Report",
                    "type": "llm_generation",
                    "dependencies": ["synthesize_findings"],
                    "config": {
                        "prompt": "Create a comprehensive research report on '{research_topic}' based on this synthesis:\\n\\n{synthesize_findings.result}\\n\\nInclude introduction, key findings, analysis, and conclusions.",
                        "params": {"max_tokens": 2000}
                    }
                }
            ],
            input_schema={
                "research_topic": {"type": "string", "description": "Topic to research"}
            }
        )
        
        # Data Processing Template
        data_processing = WorkflowTemplate(
            name="data_processing_pipeline",
            description="Process and analyze data files with validation and reporting",
            category="data_analysis",
            tags=["data", "processing", "analysis", "validation"],
            steps=[
                {
                    "id": "load_data",
                    "name": "Load Data File",
                    "type": "tool_execution",
                    "config": {
                        "tool": "file_reader",
                        "params": {"file_path": "{data_file}"}
                    }
                },
                {
                    "id": "validate_data",
                    "name": "Validate Data Structure",
                    "type": "llm_generation",
                    "dependencies": ["load_data"],
                    "config": {
                        "prompt": "Validate this data structure and identify any issues or inconsistencies:\\n\\n{load_data.result}",
                        "params": {"max_tokens": 600}
                    }
                },
                {
                    "id": "process_data",
                    "name": "Process and Clean Data",
                    "type": "conditional",
                    "dependencies": ["validate_data"],
                    "config": {
                        "condition": "lambda context: 'valid' in context.get_result('validate_data', '').lower()",
                        "true_action": "Continue processing",
                        "false_action": "Flag for manual review"
                    }
                },
                {
                    "id": "analyze_data",
                    "name": "Analyze Data Patterns",
                    "type": "llm_generation",
                    "dependencies": ["process_data"],
                    "config": {
                        "prompt": "Analyze the following data for patterns, trends, and insights:\\n\\n{load_data.result}",
                        "params": {"max_tokens": 1000}
                    }
                },
                {
                    "id": "generate_report",
                    "name": "Generate Data Report",
                    "type": "llm_generation",
                    "dependencies": ["analyze_data"],
                    "config": {
                        "prompt": "Create a comprehensive data analysis report based on:\\n\\nValidation: {validate_data.result}\\n\\nAnalysis: {analyze_data.result}",
                        "params": {"max_tokens": 1200}
                    }
                }
            ],
            input_schema={
                "data_file": {"type": "string", "description": "Path to data file"}
            }
        )
        
        # Content Creation Template
        content_creation = WorkflowTemplate(
            name="content_creation",
            description="Create comprehensive content with research, writing, and editing phases",
            category="content",
            tags=["writing", "content", "creation", "editing"],
            steps=[
                {
                    "id": "research_topic",
                    "name": "Research Content Topic",
                    "type": "tool_execution",
                    "config": {
                        "tool": "web_search",
                        "params": {"query": "{content_topic}", "max_results": 8}
                    }
                },
                {
                    "id": "create_outline",
                    "name": "Create Content Outline",
                    "type": "llm_generation",
                    "dependencies": ["research_topic"],
                    "config": {
                        "prompt": "Based on this research about '{content_topic}', create a detailed content outline:\\n\\n{research_topic.result}",
                        "params": {"max_tokens": 600}
                    }
                },
                {
                    "id": "write_draft",
                    "name": "Write Content Draft",
                    "type": "llm_generation",
                    "dependencies": ["create_outline"],
                    "config": {
                        "prompt": "Write a comprehensive article about '{content_topic}' following this outline:\\n\\n{create_outline.result}",
                        "params": {"max_tokens": 2000}
                    }
                },
                {
                    "id": "edit_content",
                    "name": "Edit and Refine",
                    "type": "llm_generation",
                    "dependencies": ["write_draft"],
                    "config": {
                        "prompt": "Edit and improve this content for clarity, flow, and engagement:\\n\\n{write_draft.result}",
                        "params": {"max_tokens": 2000}
                    }
                },
                {
                    "id": "fact_check",
                    "name": "Fact Check Content",
                    "type": "llm_generation",
                    "dependencies": ["edit_content"],
                    "config": {
                        "prompt": "Review this content for factual accuracy and suggest any corrections:\\n\\n{edit_content.result}",
                        "params": {"max_tokens": 800}
                    }
                }
            ],
            input_schema={
                "content_topic": {"type": "string", "description": "Topic for content creation"}
            }
        )
        
        # Register all built-in templates
        for template in [doc_analysis, code_review, research_workflow, data_processing, content_creation]:
            self.register_template(template)
    
    def save_template(self, template: WorkflowTemplate):
        """Save template to disk"""
        template_file = self.template_dir / f"{template.name}.json"
        
        template_data = {
            "name": template.name,
            "description": template.description,
            "category": template.category,
            "version": template.version,
            "steps": template.steps,
            "input_schema": template.input_schema,
            "output_schema": template.output_schema,
            "default_config": template.default_config,
            "tags": template.tags
        }
        
        with open(template_file, 'w', encoding='utf-8') as f:
            json.dump(template_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved template '{template.name}' to {template_file}")
    
    def load_template(self, template_file: Path) -> WorkflowTemplate:
        """Load template from file"""
        with open(template_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        template = WorkflowTemplate(**data)
        self.register_template(template)
        
        return template


# Global template registry
_global_registry: Optional[TemplateRegistry] = None

def get_template_registry() -> TemplateRegistry:
    """Get the global template registry"""
    global _global_registry
    if _global_registry is None:
        _global_registry = TemplateRegistry()
    return _global_registry

def register_template(template: WorkflowTemplate):
    """Register a template"""
    get_template_registry().register_template(template)

def create_from_template(
    template_name: str,
    workflow_name: Optional[str] = None,
    config_overrides: Optional[Dict[str, Any]] = None
) -> Optional[Workflow]:
    """Create workflow from template"""
    registry = get_template_registry()
    template = registry.get_template(template_name)
    
    if not template:
        logger.error(f"Template '{template_name}' not found")
        return None
    
    return template.create_workflow(workflow_name, config_overrides)