"""
Template Engine
Render templates with variables and context
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .template_manager import ConversationTemplate, TemplateVariable

logger = logging.getLogger(__name__)


@dataclass
class TemplateContext:
    """Context for template rendering"""
    variables: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def set_variable(self, name: str, value: Any):
        """Set a template variable"""
        self.variables[name] = value
    
    def get_variable(self, name: str, default: Any = None) -> Any:
        """Get a template variable"""
        return self.variables.get(name, default)
    
    def update_variables(self, variables: Dict[str, Any]):
        """Update multiple variables"""
        self.variables.update(variables)
    
    def has_variable(self, name: str) -> bool:
        """Check if variable exists"""
        return name in self.variables


class TemplateEngine:
    """Engine for rendering conversation templates"""
    
    def __init__(self):
        # Template variable pattern: {variable_name}
        self.variable_pattern = re.compile(r'\{([^}]+)\}')
        
        # Conditional pattern: {{if condition}}content{{endif}}
        self.conditional_pattern = re.compile(r'\{\{if\s+([^}]+)\}\}(.*?)\{\{endif\}\}', re.DOTALL)
        
        # Loop pattern: {{for item in list}}content{{endfor}}
        self.loop_pattern = re.compile(r'\{\{for\s+(\w+)\s+in\s+(\w+)\}\}(.*?)\{\{endfor\}\}', re.DOTALL)
        
        logger.info("TemplateEngine initialized")
    
    def render_template(
        self,
        template: ConversationTemplate,
        context: TemplateContext
    ) -> Dict[str, str]:
        """Render a template with the given context"""
        
        try:
            # Validate required variables
            missing_vars = self._validate_required_variables(template, context)
            if missing_vars:
                raise ValueError(f"Missing required variables: {', '.join(missing_vars)}")
            
            # Render main content
            rendered_content = self._render_text(template.content, context)
            
            # Render system prompt if present
            rendered_system_prompt = None
            if template.system_prompt:
                rendered_system_prompt = self._render_text(template.system_prompt, context)
            
            # Render follow-ups
            rendered_follow_ups = []
            for follow_up in template.follow_ups:
                rendered_follow_up = self._render_text(follow_up, context)
                rendered_follow_ups.append(rendered_follow_up)
            
            # Update template usage
            template.increment_usage()
            
            return {
                'content': rendered_content,
                'system_prompt': rendered_system_prompt,
                'follow_ups': rendered_follow_ups,
                'template_id': template.id,
                'template_name': template.name
            }
            
        except Exception as e:
            logger.error(f"Error rendering template '{template.name}': {e}")
            raise
    
    def render_text(self, text: str, context: TemplateContext) -> str:
        """Render text with template variables"""
        return self._render_text(text, context)
    
    def _render_text(self, text: str, context: TemplateContext) -> str:
        """Internal method to render text with variables and logic"""
        
        if not text:
            return ""
        
        # Process conditionals first
        text = self._process_conditionals(text, context)
        
        # Process loops
        text = self._process_loops(text, context)
        
        # Process simple variables
        text = self._process_variables(text, context)
        
        return text
    
    def _process_variables(self, text: str, context: TemplateContext) -> str:
        """Process simple variable substitutions"""
        
        def replace_variable(match):
            var_name = match.group(1).strip()
            value = context.get_variable(var_name)
            
            if value is None:
                logger.warning(f"Variable '{var_name}' not found in context")
                return f"{{{var_name}}}"  # Keep original placeholder
            
            return str(value)
        
        return self.variable_pattern.sub(replace_variable, text)
    
    def _process_conditionals(self, text: str, context: TemplateContext) -> str:
        """Process conditional blocks"""
        
        def replace_conditional(match):
            condition = match.group(1).strip()
            content = match.group(2)
            
            if self._evaluate_condition(condition, context):
                return self._render_text(content, context)
            else:
                return ""
        
        return self.conditional_pattern.sub(replace_conditional, text)
    
    def _process_loops(self, text: str, context: TemplateContext) -> str:
        """Process loop blocks"""
        
        def replace_loop(match):
            item_var = match.group(1).strip()
            list_var = match.group(2).strip()
            content = match.group(3)
            
            list_value = context.get_variable(list_var)
            if not isinstance(list_value, list):
                logger.warning(f"Variable '{list_var}' is not a list")
                return ""
            
            rendered_items = []
            for item in list_value:
                # Create temporary context with loop variable
                loop_context = TemplateContext()
                loop_context.variables = context.variables.copy()
                loop_context.set_variable(item_var, item)
                
                rendered_item = self._render_text(content, loop_context)
                rendered_items.append(rendered_item)
            
            return "".join(rendered_items)
        
        return self.loop_pattern.sub(replace_loop, text)
    
    def _evaluate_condition(self, condition: str, context: TemplateContext) -> bool:
        """Evaluate a condition expression"""
        
        try:
            # Simple condition evaluation
            # Supports: variable, !variable, variable == value, variable != value
            
            condition = condition.strip()
            
            # Negation
            if condition.startswith('!'):
                var_name = condition[1:].strip()
                value = context.get_variable(var_name)
                return not self._is_truthy(value)
            
            # Equality check
            if '==' in condition:
                parts = condition.split('==', 1)
                var_name = parts[0].strip()
                expected_value = parts[1].strip().strip('"\'')
                
                actual_value = str(context.get_variable(var_name, ''))
                return actual_value == expected_value
            
            # Inequality check
            if '!=' in condition:
                parts = condition.split('!=', 1)
                var_name = parts[0].strip()
                expected_value = parts[1].strip().strip('"\'')
                
                actual_value = str(context.get_variable(var_name, ''))
                return actual_value != expected_value
            
            # Simple variable truthiness
            value = context.get_variable(condition)
            return self._is_truthy(value)
            
        except Exception as e:
            logger.warning(f"Error evaluating condition '{condition}': {e}")
            return False
    
    def _is_truthy(self, value: Any) -> bool:
        """Determine if a value is truthy"""
        
        if value is None:
            return False
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return value != 0
        if isinstance(value, str):
            return value.strip() != ""
        if isinstance(value, (list, dict)):
            return len(value) > 0
        
        return bool(value)
    
    def _validate_required_variables(
        self,
        template: ConversationTemplate,
        context: TemplateContext
    ) -> List[str]:
        """Validate that all required variables are present"""
        
        missing_vars = []
        
        for variable in template.variables:
            if variable.required and not context.has_variable(variable.name):
                # Check if variable has a default value
                if variable.default_value is not None:
                    context.set_variable(variable.name, variable.default_value)
                else:
                    missing_vars.append(variable.name)
        
        return missing_vars
    
    def validate_template(self, template: ConversationTemplate) -> Dict[str, Any]:
        """Validate template syntax and structure"""
        
        validation_result = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'variables_found': set(),
            'variables_declared': set(var.name for var in template.variables)
        }
        
        try:
            # Find all variables used in template content
            content_vars = set(self.variable_pattern.findall(template.content))
            validation_result['variables_found'].update(content_vars)
            
            if template.system_prompt:
                system_vars = set(self.variable_pattern.findall(template.system_prompt))
                validation_result['variables_found'].update(system_vars)
            
            for follow_up in template.follow_ups:
                follow_up_vars = set(self.variable_pattern.findall(follow_up))
                validation_result['variables_found'].update(follow_up_vars)
            
            # Check for undeclared variables
            undeclared_vars = validation_result['variables_found'] - validation_result['variables_declared']
            for var in undeclared_vars:
                validation_result['warnings'].append(f"Variable '{var}' used but not declared")
            
            # Check for unused declared variables
            unused_vars = validation_result['variables_declared'] - validation_result['variables_found']
            for var in unused_vars:
                validation_result['warnings'].append(f"Variable '{var}' declared but not used")
            
            # Validate conditional syntax
            conditionals = self.conditional_pattern.findall(template.content)
            for condition, _ in conditionals:
                if not self._validate_condition_syntax(condition):
                    validation_result['errors'].append(f"Invalid condition syntax: '{condition}'")
            
            # Validate loop syntax
            loops = self.loop_pattern.findall(template.content)
            for item_var, list_var, _ in loops:
                if not item_var.isidentifier():
                    validation_result['errors'].append(f"Invalid loop variable name: '{item_var}'")
                if not list_var.isidentifier():
                    validation_result['errors'].append(f"Invalid list variable name: '{list_var}'")
            
            # Check if template has any content
            if not template.content.strip():
                validation_result['errors'].append("Template content is empty")
            
            # Validate variables
            for variable in template.variables:
                if not variable.name.isidentifier():
                    validation_result['errors'].append(f"Invalid variable name: '{variable.name}'")
                
                if variable.type == 'choice' and not variable.choices:
                    validation_result['errors'].append(f"Choice variable '{variable.name}' has no choices defined")
            
            validation_result['valid'] = len(validation_result['errors']) == 0
            
        except Exception as e:
            validation_result['valid'] = False
            validation_result['errors'].append(f"Validation error: {e}")
        
        return validation_result
    
    def _validate_condition_syntax(self, condition: str) -> bool:
        """Validate condition syntax"""
        
        condition = condition.strip()
        
        # Allow simple patterns
        patterns = [
            r'^\w+$',  # Simple variable
            r'^!\w+$',  # Negated variable
            r'^\w+\s*==\s*.+$',  # Equality
            r'^\w+\s*!=\s*.+$'   # Inequality
        ]
        
        return any(re.match(pattern, condition) for pattern in patterns)
    
    def get_template_preview(
        self,
        template: ConversationTemplate,
        sample_context: Optional[TemplateContext] = None
    ) -> str:
        """Generate a preview of the rendered template"""
        
        if not sample_context:
            # Create sample context with placeholder values
            sample_context = TemplateContext()
            
            for variable in template.variables:
                if variable.default_value is not None:
                    sample_context.set_variable(variable.name, variable.default_value)
                elif variable.type == 'choice' and variable.choices:
                    sample_context.set_variable(variable.name, variable.choices[0])
                else:
                    sample_context.set_variable(variable.name, f"[{variable.name}]")
        
        try:
            rendered = self.render_template(template, sample_context)
            return rendered['content']
        except Exception as e:
            return f"Preview error: {e}"


# Global template engine instance
_global_engine: Optional[TemplateEngine] = None

def get_template_engine() -> TemplateEngine:
    """Get the global template engine"""
    global _global_engine
    if _global_engine is None:
        _global_engine = TemplateEngine()
    return _global_engine

def render_template(template: ConversationTemplate, variables: Dict[str, Any]) -> Dict[str, str]:
    """Render a template with variables"""
    engine = get_template_engine()
    context = TemplateContext()
    context.update_variables(variables)
    return engine.render_template(template, context)

def validate_template(template: ConversationTemplate) -> Dict[str, Any]:
    """Validate a template"""
    engine = get_template_engine()
    return engine.validate_template(template)