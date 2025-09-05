"""
Plugin Interface Definitions
Base classes and interfaces for plugin development
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Callable, Union

logger = logging.getLogger(__name__)


class PluginType(Enum):
    """Types of plugins"""
    TOOL = "tool"
    AGENT = "agent"  
    MODEL = "model"
    UI = "ui"
    EXTENSION = "extension"
    INTEGRATION = "integration"
    FILTER = "filter"
    PROCESSOR = "processor"


class PluginStatus(Enum):
    """Plugin status states"""
    UNLOADED = "unloaded"
    LOADING = "loading"
    LOADED = "loaded"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    DISABLED = "disabled"


@dataclass
class PluginCapability:
    """Capability provided by a plugin"""
    name: str
    description: str
    version: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    requirements: List[str] = field(default_factory=list)


@dataclass
class PluginMetadata:
    """Plugin metadata information"""
    name: str
    version: str
    description: str
    author: str
    
    # Plugin details
    plugin_type: PluginType
    capabilities: List[PluginCapability] = field(default_factory=list)
    
    # Dependencies
    dependencies: List[str] = field(default_factory=list)
    python_requires: str = ">=3.9"
    
    # Configuration
    config_schema: Dict[str, Any] = field(default_factory=dict)
    default_config: Dict[str, Any] = field(default_factory=dict)
    
    # Additional info
    homepage: Optional[str] = None
    repository: Optional[str] = None
    license: Optional[str] = None
    tags: List[str] = field(default_factory=list)


class PluginInterface(ABC):
    """Base interface for all plugins"""
    
    def __init__(self, metadata: PluginMetadata):
        self.metadata = metadata
        self.status = PluginStatus.UNLOADED
        self.config: Dict[str, Any] = {}
        self.runtime_data: Dict[str, Any] = {}
        self.error_message: Optional[str] = None
        
        logger.info(f"Initialized plugin interface: {metadata.name}")
    
    @abstractmethod
    async def initialize(self, config: Optional[Dict[str, Any]] = None) -> bool:
        """Initialize the plugin"""
        pass
    
    @abstractmethod
    async def cleanup(self) -> bool:
        """Cleanup plugin resources"""
        pass
    
    @abstractmethod
    def get_capabilities(self) -> List[PluginCapability]:
        """Get plugin capabilities"""
        pass
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate plugin configuration"""
        return True  # Default implementation
    
    def get_status(self) -> Dict[str, Any]:
        """Get plugin status information"""
        return {
            'name': self.metadata.name,
            'version': self.metadata.version,
            'status': self.status.value,
            'type': self.metadata.plugin_type.value,
            'error': self.error_message,
            'capabilities': len(self.metadata.capabilities)
        }


class BasePlugin(PluginInterface):
    """Base implementation for plugins"""
    
    async def initialize(self, config: Optional[Dict[str, Any]] = None) -> bool:
        """Initialize the plugin"""
        try:
            self.status = PluginStatus.LOADING
            
            # Merge configuration
            self.config = self.metadata.default_config.copy()
            if config:
                self.config.update(config)
            
            # Validate configuration
            if not self.validate_config(self.config):
                raise ValueError("Invalid plugin configuration")
            
            # Plugin-specific initialization
            if not await self._initialize_plugin():
                raise RuntimeError("Plugin initialization failed")
            
            self.status = PluginStatus.LOADED
            logger.info(f"Plugin {self.metadata.name} initialized successfully")
            return True
            
        except Exception as e:
            self.status = PluginStatus.ERROR
            self.error_message = str(e)
            logger.error(f"Failed to initialize plugin {self.metadata.name}: {e}")
            return False
    
    async def cleanup(self) -> bool:
        """Cleanup plugin resources"""
        try:
            await self._cleanup_plugin()
            self.status = PluginStatus.UNLOADED
            self.runtime_data.clear()
            logger.info(f"Plugin {self.metadata.name} cleaned up")
            return True
            
        except Exception as e:
            logger.error(f"Error cleaning up plugin {self.metadata.name}: {e}")
            return False
    
    async def _initialize_plugin(self) -> bool:
        """Plugin-specific initialization (override in subclasses)"""
        return True
    
    async def _cleanup_plugin(self):
        """Plugin-specific cleanup (override in subclasses)"""
        pass
    
    def get_capabilities(self) -> List[PluginCapability]:
        """Get plugin capabilities"""
        return self.metadata.capabilities


class ToolPlugin(BasePlugin):
    """Base class for tool plugins"""
    
    def __init__(self, metadata: PluginMetadata):
        super().__init__(metadata)
        self.tools: Dict[str, Callable] = {}
    
    @abstractmethod
    async def execute_tool(
        self, 
        tool_name: str, 
        parameters: Dict[str, Any]
    ) -> Any:
        """Execute a tool provided by this plugin"""
        pass
    
    def register_tool(self, name: str, func: Callable, description: str = ""):
        """Register a tool function"""
        self.tools[name] = func
        
        # Add capability if not already present
        if not any(cap.name == name for cap in self.metadata.capabilities):
            self.metadata.capabilities.append(
                PluginCapability(
                    name=name,
                    description=description,
                    version=self.metadata.version
                )
            )
        
        logger.info(f"Registered tool '{name}' in plugin {self.metadata.name}")
    
    def get_available_tools(self) -> List[str]:
        """Get list of available tools"""
        return list(self.tools.keys())


class AgentPlugin(BasePlugin):
    """Base class for agent plugins"""
    
    def __init__(self, metadata: PluginMetadata):
        super().__init__(metadata)
        self.agent_types: Dict[str, type] = {}
    
    @abstractmethod
    async def create_agent(
        self, 
        agent_type: str, 
        config: Dict[str, Any]
    ) -> Any:
        """Create an agent instance"""
        pass
    
    def register_agent_type(self, name: str, agent_class: type, description: str = ""):
        """Register an agent type"""
        self.agent_types[name] = agent_class
        
        # Add capability
        if not any(cap.name == name for cap in self.metadata.capabilities):
            self.metadata.capabilities.append(
                PluginCapability(
                    name=name,
                    description=description,
                    version=self.metadata.version
                )
            )
        
        logger.info(f"Registered agent type '{name}' in plugin {self.metadata.name}")
    
    def get_available_agent_types(self) -> List[str]:
        """Get list of available agent types"""
        return list(self.agent_types.keys())


class ModelPlugin(BasePlugin):
    """Base class for model plugins"""
    
    def __init__(self, metadata: PluginMetadata):
        super().__init__(metadata)
        self.models: Dict[str, Any] = {}
    
    @abstractmethod
    async def load_model(
        self, 
        model_name: str, 
        config: Dict[str, Any]
    ) -> Any:
        """Load a model"""
        pass
    
    @abstractmethod
    async def generate(
        self, 
        model_name: str, 
        prompt: str, 
        parameters: Dict[str, Any]
    ) -> str:
        """Generate text using the model"""
        pass
    
    def register_model(self, name: str, model_info: Dict[str, Any]):
        """Register a model"""
        self.models[name] = model_info
        
        # Add capability
        if not any(cap.name == name for cap in self.metadata.capabilities):
            self.metadata.capabilities.append(
                PluginCapability(
                    name=name,
                    description=model_info.get('description', f'{name} model'),
                    version=self.metadata.version,
                    parameters=model_info.get('parameters', {})
                )
            )
        
        logger.info(f"Registered model '{name}' in plugin {self.metadata.name}")
    
    def get_available_models(self) -> List[str]:
        """Get list of available models"""
        return list(self.models.keys())


class UIPlugin(BasePlugin):
    """Base class for UI plugins"""
    
    def __init__(self, metadata: PluginMetadata):
        super().__init__(metadata)
        self.ui_components: Dict[str, Any] = {}
    
    @abstractmethod
    async def render_component(
        self, 
        component_name: str, 
        context: Dict[str, Any]
    ) -> str:
        """Render a UI component"""
        pass
    
    def register_ui_component(self, name: str, component: Any, description: str = ""):
        """Register a UI component"""
        self.ui_components[name] = component
        
        # Add capability
        if not any(cap.name == name for cap in self.metadata.capabilities):
            self.metadata.capabilities.append(
                PluginCapability(
                    name=name,
                    description=description,
                    version=self.metadata.version
                )
            )
        
        logger.info(f"Registered UI component '{name}' in plugin {self.metadata.name}")
    
    def get_available_components(self) -> List[str]:
        """Get list of available UI components"""
        return list(self.ui_components.keys())


class ExtensionPlugin(BasePlugin):
    """Base class for extension plugins"""
    
    def __init__(self, metadata: PluginMetadata):
        super().__init__(metadata)
        self.extensions: Dict[str, Callable] = {}
        self.hooks: Dict[str, List[Callable]] = {}
    
    @abstractmethod
    async def extend_functionality(
        self, 
        extension_point: str, 
        context: Dict[str, Any]
    ) -> Any:
        """Extend functionality at a specific extension point"""
        pass
    
    def register_extension(self, name: str, func: Callable, description: str = ""):
        """Register an extension function"""
        self.extensions[name] = func
        
        # Add capability
        if not any(cap.name == name for cap in self.metadata.capabilities):
            self.metadata.capabilities.append(
                PluginCapability(
                    name=name,
                    description=description,
                    version=self.metadata.version
                )
            )
        
        logger.info(f"Registered extension '{name}' in plugin {self.metadata.name}")
    
    def register_hook(self, hook_name: str, func: Callable):
        """Register a hook function"""
        if hook_name not in self.hooks:
            self.hooks[hook_name] = []
        
        self.hooks[hook_name].append(func)
        logger.info(f"Registered hook '{hook_name}' in plugin {self.metadata.name}")
    
    async def execute_hooks(self, hook_name: str, context: Dict[str, Any]) -> List[Any]:
        """Execute all hooks for a given hook name"""
        results = []
        
        if hook_name in self.hooks:
            for hook_func in self.hooks[hook_name]:
                try:
                    if asyncio.iscoroutinefunction(hook_func):
                        result = await hook_func(context)
                    else:
                        result = hook_func(context)
                    results.append(result)
                except Exception as e:
                    logger.error(f"Hook {hook_name} failed: {e}")
        
        return results


class FilterPlugin(BasePlugin):
    """Base class for filter plugins"""
    
    def __init__(self, metadata: PluginMetadata):
        super().__init__(metadata)
        self.filters: Dict[str, Callable] = {}
    
    @abstractmethod
    async def apply_filter(
        self, 
        filter_name: str, 
        data: Any, 
        parameters: Dict[str, Any]
    ) -> Any:
        """Apply a filter to data"""
        pass
    
    def register_filter(self, name: str, func: Callable, description: str = ""):
        """Register a filter function"""
        self.filters[name] = func
        
        # Add capability
        if not any(cap.name == name for cap in self.metadata.capabilities):
            self.metadata.capabilities.append(
                PluginCapability(
                    name=name,
                    description=description,
                    version=self.metadata.version
                )
            )
        
        logger.info(f"Registered filter '{name}' in plugin {self.metadata.name}")
    
    def get_available_filters(self) -> List[str]:
        """Get list of available filters"""
        return list(self.filters.keys())


class ProcessorPlugin(BasePlugin):
    """Base class for processor plugins"""
    
    def __init__(self, metadata: PluginMetadata):
        super().__init__(metadata)
        self.processors: Dict[str, Callable] = {}
    
    @abstractmethod
    async def process_data(
        self, 
        processor_name: str, 
        data: Any, 
        parameters: Dict[str, Any]
    ) -> Any:
        """Process data using the specified processor"""
        pass
    
    def register_processor(self, name: str, func: Callable, description: str = ""):
        """Register a processor function"""
        self.processors[name] = func
        
        # Add capability
        if not any(cap.name == name for cap in self.metadata.capabilities):
            self.metadata.capabilities.append(
                PluginCapability(
                    name=name,
                    description=description,
                    version=self.metadata.version
                )
            )
        
        logger.info(f"Registered processor '{name}' in plugin {self.metadata.name}")
    
    def get_available_processors(self) -> List[str]:
        """Get list of available processors"""
        return list(self.processors.keys())


# Plugin validation utilities
def validate_plugin_metadata(metadata: dict) -> bool:
    """Validate plugin metadata structure"""
    required_fields = ['name', 'version', 'description', 'author', 'plugin_type']
    
    for field in required_fields:
        if field not in metadata:
            logger.error(f"Missing required field in plugin metadata: {field}")
            return False
    
    # Validate plugin type
    try:
        PluginType(metadata['plugin_type'])
    except ValueError:
        logger.error(f"Invalid plugin type: {metadata['plugin_type']}")
        return False
    
    return True


def create_plugin_metadata(
    name: str,
    version: str,
    description: str,
    author: str,
    plugin_type: Union[PluginType, str],
    **kwargs
) -> PluginMetadata:
    """Create plugin metadata with validation"""
    
    if isinstance(plugin_type, str):
        plugin_type = PluginType(plugin_type)
    
    return PluginMetadata(
        name=name,
        version=version,
        description=description,
        author=author,
        plugin_type=plugin_type,
        **kwargs
    )