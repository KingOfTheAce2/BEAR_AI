"""
BEAR AI Plugin/Extension System
Extensible plugin architecture for custom functionality
"""

from .plugin_system import (
    PluginSystem,
    Plugin,
    PluginInfo,
    PluginStatus,
    PluginType,
    get_plugin_system,
    load_plugin,
    unload_plugin,
    list_plugins,
    install_plugin
)

from .plugin_interface import (
    BasePlugin,
    ToolPlugin,
    AgentPlugin,
    ModelPlugin,
    UIPlugin,
    PluginInterface
)

from .plugin_manager import (
    PluginManager,
    PluginRegistry,
    PluginLoader,
    get_plugin_manager
)

from .builtin_plugins import (
    BuiltinPlugins,
    FileManagerPlugin,
    WebSearchPlugin,
    CodeExecutorPlugin,
    DataVisualizationPlugin
)

__all__ = [
    'PluginSystem',
    'Plugin',
    'PluginInfo',
    'PluginStatus',
    'PluginType',
    'get_plugin_system',
    'load_plugin',
    'unload_plugin',
    'list_plugins',
    'install_plugin',
    'BasePlugin',
    'ToolPlugin',
    'AgentPlugin',
    'ModelPlugin',
    'UIPlugin',
    'PluginInterface',
    'PluginManager',
    'PluginRegistry',
    'PluginLoader',
    'get_plugin_manager',
    'BuiltinPlugins',
    'FileManagerPlugin',
    'WebSearchPlugin',
    'CodeExecutorPlugin',
    'DataVisualizationPlugin'
]