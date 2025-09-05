"""
Template Management System
Manage conversation templates and presets
"""

import json
import logging
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)


class TemplateCategory(Enum):
    """Categories of conversation templates"""
    GENERAL = "general"
    LEGAL = "legal"
    BUSINESS = "business"
    ACADEMIC = "academic"
    CREATIVE = "creative"
    TECHNICAL = "technical"
    MEDICAL = "medical"
    EDUCATIONAL = "educational"
    RESEARCH = "research"
    PERSONAL = "personal"
    CODING = "coding"
    ANALYSIS = "analysis"
    WRITING = "writing"
    BRAINSTORMING = "brainstorming"
    PROBLEM_SOLVING = "problem_solving"


class TemplateType(Enum):
    """Types of templates"""
    CONVERSATION_STARTER = "conversation_starter"
    SYSTEM_PROMPT = "system_prompt"
    FOLLOW_UP = "follow_up"
    WORKFLOW = "workflow"
    ROLE_PLAY = "role_play"
    INSTRUCTION = "instruction"
    QUERY = "query"
    ANALYSIS = "analysis"


@dataclass
class TemplateVariable:
    """Variable definition for templates"""
    name: str
    description: str
    type: str = "text"  # text, number, boolean, choice, list
    required: bool = True
    default_value: Optional[Any] = None
    choices: List[str] = field(default_factory=list)
    validation: Optional[str] = None  # regex pattern
    placeholder: Optional[str] = None


@dataclass
class ConversationTemplate:
    """Conversation template definition"""
    id: str
    name: str
    description: str
    category: TemplateCategory
    template_type: TemplateType
    
    # Template content
    content: str
    system_prompt: Optional[str] = None
    follow_ups: List[str] = field(default_factory=list)
    
    # Variables
    variables: List[TemplateVariable] = field(default_factory=list)
    
    # Configuration
    model_preferences: Dict[str, Any] = field(default_factory=dict)
    generation_params: Dict[str, Any] = field(default_factory=dict)
    
    # Metadata
    author: str = ""
    version: str = "1.0"
    tags: List[str] = field(default_factory=list)
    created_at: float = field(default_factory=lambda: datetime.now().timestamp())
    updated_at: float = field(default_factory=lambda: datetime.now().timestamp())
    usage_count: int = 0
    rating: float = 0.0
    
    # Validation
    is_builtin: bool = False
    is_validated: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category.value,
            'template_type': self.template_type.value,
            'content': self.content,
            'system_prompt': self.system_prompt,
            'follow_ups': self.follow_ups,
            'variables': [asdict(var) for var in self.variables],
            'model_preferences': self.model_preferences,
            'generation_params': self.generation_params,
            'author': self.author,
            'version': self.version,
            'tags': self.tags,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'usage_count': self.usage_count,
            'rating': self.rating,
            'is_builtin': self.is_builtin,
            'is_validated': self.is_validated
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConversationTemplate':
        """Create from dictionary"""
        variables = [
            TemplateVariable(**var_data) 
            for var_data in data.get('variables', [])
        ]
        
        return cls(
            id=data['id'],
            name=data['name'],
            description=data['description'],
            category=TemplateCategory(data['category']),
            template_type=TemplateType(data['template_type']),
            content=data['content'],
            system_prompt=data.get('system_prompt'),
            follow_ups=data.get('follow_ups', []),
            variables=variables,
            model_preferences=data.get('model_preferences', {}),
            generation_params=data.get('generation_params', {}),
            author=data.get('author', ''),
            version=data.get('version', '1.0'),
            tags=data.get('tags', []),
            created_at=data.get('created_at', datetime.now().timestamp()),
            updated_at=data.get('updated_at', datetime.now().timestamp()),
            usage_count=data.get('usage_count', 0),
            rating=data.get('rating', 0.0),
            is_builtin=data.get('is_builtin', False),
            is_validated=data.get('is_validated', False)
        )
    
    def get_required_variables(self) -> List[TemplateVariable]:
        """Get required variables"""
        return [var for var in self.variables if var.required]
    
    def get_variable_names(self) -> List[str]:
        """Get variable names"""
        return [var.name for var in self.variables]
    
    def increment_usage(self):
        """Increment usage count"""
        self.usage_count += 1
        self.updated_at = datetime.now().timestamp()
    
    def update_rating(self, new_rating: float):
        """Update rating (simple average for now)"""
        if self.usage_count == 0:
            self.rating = new_rating
        else:
            self.rating = (self.rating + new_rating) / 2
        self.updated_at = datetime.now().timestamp()


class TemplateManager:
    """Manage conversation templates"""
    
    def __init__(self):
        self.templates_dir = Path.home() / ".bear_ai" / "templates"
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        
        self.templates: Dict[str, ConversationTemplate] = {}
        self.categories: Dict[TemplateCategory, List[str]] = {}
        
        # Load existing templates
        self._load_templates()
        
        # Register built-in templates
        self._register_builtin_templates()
        
        logger.info(f"TemplateManager initialized with {len(self.templates)} templates")
    
    def create_template(
        self,
        name: str,
        description: str,
        category: Union[TemplateCategory, str],
        template_type: Union[TemplateType, str],
        content: str,
        **kwargs
    ) -> ConversationTemplate:
        """Create a new template"""
        
        if isinstance(category, str):
            category = TemplateCategory(category)
        if isinstance(template_type, str):
            template_type = TemplateType(template_type)
        
        template_id = kwargs.get('id', str(uuid.uuid4()))
        
        template = ConversationTemplate(
            id=template_id,
            name=name,
            description=description,
            category=category,
            template_type=template_type,
            content=content,
            **{k: v for k, v in kwargs.items() if k != 'id'}
        )
        
        self.templates[template_id] = template
        self._update_category_index(template)
        
        # Save to disk
        self._save_template(template)
        
        logger.info(f"Created template '{name}' ({template_id})")
        return template
    
    def get_template(self, template_id: str) -> Optional[ConversationTemplate]:
        """Get template by ID"""
        return self.templates.get(template_id)
    
    def get_templates_by_category(self, category: TemplateCategory) -> List[ConversationTemplate]:
        """Get all templates in a category"""
        template_ids = self.categories.get(category, [])
        return [self.templates[tid] for tid in template_ids if tid in self.templates]
    
    def get_templates_by_type(self, template_type: TemplateType) -> List[ConversationTemplate]:
        """Get all templates of a specific type"""
        return [t for t in self.templates.values() if t.template_type == template_type]
    
    def search_templates(
        self,
        query: Optional[str] = None,
        category: Optional[TemplateCategory] = None,
        template_type: Optional[TemplateType] = None,
        tags: Optional[List[str]] = None
    ) -> List[ConversationTemplate]:
        """Search templates"""
        
        results = list(self.templates.values())
        
        # Filter by category
        if category:
            results = [t for t in results if t.category == category]
        
        # Filter by type
        if template_type:
            results = [t for t in results if t.template_type == template_type]
        
        # Filter by tags
        if tags:
            results = [
                t for t in results 
                if any(tag in t.tags for tag in tags)
            ]
        
        # Filter by query
        if query:
            query_lower = query.lower()
            results = [
                t for t in results
                if (query_lower in t.name.lower() or 
                    query_lower in t.description.lower() or
                    query_lower in t.content.lower())
            ]
        
        # Sort by usage count and rating
        results.sort(key=lambda t: (t.usage_count, t.rating), reverse=True)
        
        return results
    
    def get_popular_templates(self, limit: int = 10) -> List[ConversationTemplate]:
        """Get most popular templates"""
        templates = sorted(
            self.templates.values(),
            key=lambda t: (t.usage_count, t.rating),
            reverse=True
        )
        return templates[:limit]
    
    def get_recent_templates(self, limit: int = 10) -> List[ConversationTemplate]:
        """Get recently created templates"""
        templates = sorted(
            self.templates.values(),
            key=lambda t: t.created_at,
            reverse=True
        )
        return templates[:limit]
    
    def update_template(self, template_id: str, **updates) -> bool:
        """Update template"""
        
        if template_id not in self.templates:
            return False
        
        template = self.templates[template_id]
        
        # Update fields
        for key, value in updates.items():
            if hasattr(template, key):
                setattr(template, key, value)
        
        template.updated_at = datetime.now().timestamp()
        
        # Update category index if category changed
        if 'category' in updates:
            self._update_category_index(template)
        
        # Save changes
        self._save_template(template)
        
        logger.info(f"Updated template '{template.name}' ({template_id})")
        return True
    
    def delete_template(self, template_id: str) -> bool:
        """Delete template"""
        
        if template_id not in self.templates:
            return False
        
        template = self.templates[template_id]
        
        # Don't delete built-in templates
        if template.is_builtin:
            logger.warning(f"Cannot delete built-in template: {template.name}")
            return False
        
        # Remove from memory
        del self.templates[template_id]
        
        # Remove from category index
        if template.category in self.categories:
            if template_id in self.categories[template.category]:
                self.categories[template.category].remove(template_id)
        
        # Delete file
        template_file = self.templates_dir / f"{template_id}.json"
        if template_file.exists():
            template_file.unlink()
        
        logger.info(f"Deleted template '{template.name}' ({template_id})")
        return True
    
    def clone_template(self, template_id: str, new_name: Optional[str] = None) -> Optional[ConversationTemplate]:
        """Clone an existing template"""
        
        original = self.get_template(template_id)
        if not original:
            return None
        
        # Create new template with same content but new ID
        new_id = str(uuid.uuid4())
        cloned_data = original.to_dict()
        
        cloned_data.update({
            'id': new_id,
            'name': new_name or f"{original.name} (Copy)",
            'created_at': datetime.now().timestamp(),
            'updated_at': datetime.now().timestamp(),
            'usage_count': 0,
            'rating': 0.0,
            'is_builtin': False,
            'author': 'User Clone'
        })
        
        cloned_template = ConversationTemplate.from_dict(cloned_data)
        
        self.templates[new_id] = cloned_template
        self._update_category_index(cloned_template)
        self._save_template(cloned_template)
        
        logger.info(f"Cloned template '{original.name}' -> '{cloned_template.name}'")
        return cloned_template
    
    def export_template(self, template_id: str, export_path: Path) -> bool:
        """Export template to file"""
        
        template = self.get_template(template_id)
        if not template:
            return False
        
        try:
            with open(export_path, 'w', encoding='utf-8') as f:
                json.dump(template.to_dict(), f, indent=2, ensure_ascii=False)
            
            logger.info(f"Exported template '{template.name}' to {export_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to export template: {e}")
            return False
    
    def import_template(self, import_path: Path) -> Optional[ConversationTemplate]:
        """Import template from file"""
        
        try:
            with open(import_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Generate new ID to avoid conflicts
            data['id'] = str(uuid.uuid4())
            data['is_builtin'] = False
            data['created_at'] = datetime.now().timestamp()
            data['updated_at'] = datetime.now().timestamp()
            
            template = ConversationTemplate.from_dict(data)
            
            self.templates[template.id] = template
            self._update_category_index(template)
            self._save_template(template)
            
            logger.info(f"Imported template '{template.name}' from {import_path}")
            return template
            
        except Exception as e:
            logger.error(f"Failed to import template: {e}")
            return None
    
    def get_template_stats(self) -> Dict[str, Any]:
        """Get template statistics"""
        
        category_counts = {}
        for category in TemplateCategory:
            category_counts[category.value] = len(self.categories.get(category, []))
        
        type_counts = {}
        for template_type in TemplateType:
            count = len([t for t in self.templates.values() if t.template_type == template_type])
            type_counts[template_type.value] = count
        
        total_usage = sum(t.usage_count for t in self.templates.values())
        avg_rating = sum(t.rating for t in self.templates.values()) / len(self.templates) if self.templates else 0
        
        return {
            'total_templates': len(self.templates),
            'category_counts': category_counts,
            'type_counts': type_counts,
            'builtin_templates': len([t for t in self.templates.values() if t.is_builtin]),
            'user_templates': len([t for t in self.templates.values() if not t.is_builtin]),
            'total_usage': total_usage,
            'average_rating': avg_rating
        }
    
    def _load_templates(self):
        """Load templates from disk"""
        
        if not self.templates_dir.exists():
            return
        
        for template_file in self.templates_dir.glob("*.json"):
            try:
                with open(template_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                template = ConversationTemplate.from_dict(data)
                self.templates[template.id] = template
                self._update_category_index(template)
                
            except Exception as e:
                logger.warning(f"Failed to load template {template_file}: {e}")
    
    def _save_template(self, template: ConversationTemplate):
        """Save template to disk"""
        
        template_file = self.templates_dir / f"{template.id}.json"
        
        try:
            with open(template_file, 'w', encoding='utf-8') as f:
                json.dump(template.to_dict(), f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            logger.error(f"Failed to save template {template.name}: {e}")
    
    def _update_category_index(self, template: ConversationTemplate):
        """Update category index"""
        
        # Remove from old category if it exists
        for category, template_ids in self.categories.items():
            if template.id in template_ids and category != template.category:
                template_ids.remove(template.id)
        
        # Add to new category
        if template.category not in self.categories:
            self.categories[template.category] = []
        
        if template.id not in self.categories[template.category]:
            self.categories[template.category].append(template.id)
    
    def _register_builtin_templates(self):
        """Register built-in templates"""
        
        from .builtin_templates import get_builtin_templates
        
        builtin_templates = get_builtin_templates()
        
        for template in builtin_templates:
            template.is_builtin = True
            self.templates[template.id] = template
            self._update_category_index(template)
        
        logger.info(f"Registered {len(builtin_templates)} built-in templates")


# Global template manager instance
_global_manager: Optional[TemplateManager] = None

def get_template_manager() -> TemplateManager:
    """Get the global template manager"""
    global _global_manager
    if _global_manager is None:
        _global_manager = TemplateManager()
    return _global_manager

def create_template(
    name: str,
    description: str,
    category: Union[TemplateCategory, str],
    template_type: Union[TemplateType, str],
    content: str,
    **kwargs
) -> ConversationTemplate:
    """Create a new template"""
    manager = get_template_manager()
    return manager.create_template(name, description, category, template_type, content, **kwargs)

def load_template(template_id: str) -> Optional[ConversationTemplate]:
    """Load a template by ID"""
    manager = get_template_manager()
    return manager.get_template(template_id)

def list_templates(
    category: Optional[TemplateCategory] = None,
    template_type: Optional[TemplateType] = None
) -> List[ConversationTemplate]:
    """List templates"""
    manager = get_template_manager()
    
    if category:
        return manager.get_templates_by_category(category)
    elif template_type:
        return manager.get_templates_by_type(template_type)
    else:
        return list(manager.templates.values())