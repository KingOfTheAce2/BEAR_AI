"""
BEAR AI Conversation Templates and Presets
Pre-configured conversation starters and workflow templates
"""

from .template_manager import (
    TemplateManager,
    ConversationTemplate,
    TemplateCategory,
    TemplateType,
    get_template_manager,
    create_template,
    load_template,
    list_templates
)

from .preset_library import (
    PresetLibrary,
    ConversationPreset,
    PresetCategory,
    get_preset_library,
    get_preset,
    create_preset,
    list_presets
)

from .template_engine import (
    TemplateEngine,
    TemplateVariable,
    TemplateContext,
    get_template_engine,
    render_template,
    validate_template
)

from .builtin_templates import (
    BuiltinTemplates,
    get_builtin_templates,
    register_builtin_templates
)

__all__ = [
    'TemplateManager',
    'ConversationTemplate',
    'TemplateCategory',
    'TemplateType',
    'get_template_manager',
    'create_template',
    'load_template',
    'list_templates',
    'PresetLibrary',
    'ConversationPreset',
    'PresetCategory',
    'get_preset_library',
    'get_preset',
    'create_preset',
    'list_presets',
    'TemplateEngine',
    'TemplateVariable',
    'TemplateContext',
    'get_template_engine',
    'render_template',
    'validate_template',
    'BuiltinTemplates',
    'get_builtin_templates',
    'register_builtin_templates'
]