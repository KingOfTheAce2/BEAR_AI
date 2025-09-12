"""
Plugin System Core
Main plugin system for managing plugin lifecycle
"""

import asyncio
import importlib
import importlib.util
import json
import logging
import shutil
import sys
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Type, Union
import uuid

from .plugin_interface import (
    PluginInterface, PluginMetadata, PluginStatus, PluginType,
    BasePlugin, validate_plugin_metadata
)

logger = logging.getLogger(__name__)


@dataclass
class PluginInfo:
    """Information about a plugin"""
    metadata: PluginMetadata
    plugin_path: Path
    status: PluginStatus = PluginStatus.UNLOADED
    instance: Optional[PluginInterface] = None
    error_message: Optional[str] = None
    load_time: Optional[float] = None
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass  
class Plugin:
    """Plugin wrapper with runtime information"""
    info: PluginInfo
    
    @property
    def name(self) -> str:
        return self.info.metadata.name
    
    @property
    def version(self) -> str:
        return self.info.metadata.version
    
    @property
    def status(self) -> PluginStatus:
        return self.info.status
    
    @property
    def instance(self) -> Optional[PluginInterface]:
        return self.info.instance


class PluginSystem:
    """Core plugin system for managing plugins"""
    
    def __init__(self):
        # Plugin directories
        self.plugin_dir = Path.home() / ".bear_ai" / "plugins"
        self.plugin_dir.mkdir(parents=True, exist_ok=True)
        
        self.builtin_plugin_dir = Path(__file__).parent / "builtin"
        self.user_plugin_dir = self.plugin_dir / "user"
        self.user_plugin_dir.mkdir(exist_ok=True)
        
        # Plugin registry
        self.plugins: Dict[str, Plugin] = {}
        self.plugin_types: Dict[PluginType, List[str]] = {}
        
        # Configuration
        self.auto_load = True
        self.safe_mode = False
        
        # Plugin loading state
        self.loading_plugins: set = set()
        
        logger.info(f"PluginSystem initialized, plugin directory: {self.plugin_dir}")
        
        # Load built-in plugins
        asyncio.create_task(self._load_builtin_plugins())
    
    async def load_plugin(
        self, 
        plugin_path: Union[str, Path],
        config: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Load a plugin from path"""
        
        plugin_path = Path(plugin_path)
        
        if not plugin_path.exists():
            logger.error(f"Plugin path not found: {plugin_path}")
            return False
        
        try:
            # Prevent concurrent loading of same plugin
            plugin_key = str(plugin_path.resolve())
            if plugin_key in self.loading_plugins:
                logger.warning(f"Plugin already being loaded: {plugin_path}")
                return False
            
            self.loading_plugins.add(plugin_key)
            
            # Load plugin metadata
            metadata = await self._load_plugin_metadata(plugin_path)
            if not metadata:
                return False
            
            # Check if plugin is already loaded
            if metadata.name in self.plugins:
                logger.warning(f"Plugin '{metadata.name}' is already loaded")
                return False
            
            # Load and instantiate plugin
            plugin_class = await self._load_plugin_class(plugin_path, metadata)
            if not plugin_class:
                return False
            
            plugin_instance = plugin_class(metadata)
            
            # Create plugin info
            plugin_info = PluginInfo(
                metadata=metadata,
                plugin_path=plugin_path,
                status=PluginStatus.LOADING,
                instance=plugin_instance,
                config=config or {}
            )
            
            # Initialize plugin
            if await plugin_instance.initialize(config):
                plugin_info.status = PluginStatus.LOADED
                plugin = Plugin(info=plugin_info)
                
                # Register plugin
                self.plugins[metadata.name] = plugin
                self._register_plugin_type(metadata.name, metadata.plugin_type)
                
                logger.info(f"Plugin '{metadata.name}' loaded successfully")
                
                # Trigger post-load hooks
                await self._trigger_plugin_hooks('plugin_loaded', {
                    'plugin_name': metadata.name,
                    'plugin': plugin
                })
                
                return True
            else:
                plugin_info.status = PluginStatus.ERROR
                plugin_info.error_message = plugin_instance.error_message
                logger.error(f"Failed to initialize plugin '{metadata.name}'")
                return False
                
        except Exception as e:
            logger.error(f"Error loading plugin from {plugin_path}: {e}")
            return False
        
        finally:
            self.loading_plugins.discard(plugin_key)
    
    async def unload_plugin(self, plugin_name: str) -> bool:
        """Unload a plugin"""
        
        if plugin_name not in self.plugins:
            logger.warning(f"Plugin '{plugin_name}' not found")
            return False
        
        try:
            plugin = self.plugins[plugin_name]
            
            # Trigger pre-unload hooks
            await self._trigger_plugin_hooks('plugin_unloading', {
                'plugin_name': plugin_name,
                'plugin': plugin
            })
            
            # Cleanup plugin
            if plugin.instance:
                await plugin.instance.cleanup()
            
            # Remove from registry
            del self.plugins[plugin_name]
            self._unregister_plugin_type(plugin_name, plugin.info.metadata.plugin_type)
            
            logger.info(f"Plugin '{plugin_name}' unloaded successfully")
            
            # Trigger post-unload hooks
            await self._trigger_plugin_hooks('plugin_unloaded', {
                'plugin_name': plugin_name
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Error unloading plugin '{plugin_name}': {e}")
            return False
    
    async def reload_plugin(self, plugin_name: str) -> bool:
        """Reload a plugin"""
        
        if plugin_name not in self.plugins:
            logger.warning(f"Plugin '{plugin_name}' not found")
            return False
        
        plugin = self.plugins[plugin_name]
        plugin_path = plugin.info.plugin_path
        config = plugin.info.config
        
        # Unload and reload
        if await self.unload_plugin(plugin_name):
            return await self.load_plugin(plugin_path, config)
        
        return False
    
    def get_plugin(self, plugin_name: str) -> Optional[Plugin]:
        """Get a plugin by name"""
        return self.plugins.get(plugin_name)
    
    def list_plugins(
        self, 
        plugin_type: Optional[PluginType] = None,
        status: Optional[PluginStatus] = None
    ) -> List[Plugin]:
        """List plugins with optional filtering"""
        
        plugins = list(self.plugins.values())
        
        if plugin_type:
            plugins = [p for p in plugins if p.info.metadata.plugin_type == plugin_type]
        
        if status:
            plugins = [p for p in plugins if p.info.status == status]
        
        return plugins
    
    def get_plugins_by_type(self, plugin_type: PluginType) -> List[Plugin]:
        """Get all plugins of a specific type"""
        plugin_names = self.plugin_types.get(plugin_type, [])
        return [self.plugins[name] for name in plugin_names if name in self.plugins]
    
    async def install_plugin(
        self, 
        plugin_source: Union[str, Path],
        plugin_name: Optional[str] = None
    ) -> bool:
        """Install a plugin from source"""
        
        try:
            plugin_source = Path(plugin_source)
            
            # Determine installation method
            if plugin_source.suffix == '.zip':
                return await self._install_from_zip(plugin_source, plugin_name)
            elif plugin_source.is_dir():
                return await self._install_from_directory(plugin_source, plugin_name)
            elif plugin_source.suffix == '.py':
                return await self._install_from_file(plugin_source, plugin_name)
            else:
                logger.error(f"Unsupported plugin source format: {plugin_source}")
                return False
                
        except Exception as e:
            logger.error(f"Error installing plugin from {plugin_source}: {e}")
            return False
    
    async def uninstall_plugin(self, plugin_name: str) -> bool:
        """Uninstall a plugin"""
        
        if plugin_name not in self.plugins:
            logger.warning(f"Plugin '{plugin_name}' not found")
            return False
        
        try:
            # Unload plugin first
            await self.unload_plugin(plugin_name)
            
            # Remove plugin files
            plugin_path = self.user_plugin_dir / plugin_name
            if plugin_path.exists():
                shutil.rmtree(plugin_path)
            
            logger.info(f"Plugin '{plugin_name}' uninstalled successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error uninstalling plugin '{plugin_name}': {e}")
            return False
    
    async def discover_plugins(self) -> List[Path]:
        """Discover available plugins in plugin directories"""
        
        plugin_paths = []
        
        # Discover in user plugin directory
        for plugin_dir in self.user_plugin_dir.iterdir():
            if plugin_dir.is_dir():
                manifest_file = plugin_dir / "plugin.json"
                if manifest_file.exists():
                    plugin_paths.append(plugin_dir)
        
        # Discover in builtin plugin directory
        if self.builtin_plugin_dir.exists():
            for plugin_file in self.builtin_plugin_dir.glob("*.py"):
                if plugin_file.name != "__init__.py":
                    plugin_paths.append(plugin_file)
        
        return plugin_paths
    
    async def auto_load_plugins(self) -> int:
        """Auto-load all discovered plugins"""
        
        if not self.auto_load:
            return 0
        
        plugin_paths = await self.discover_plugins()
        loaded_count = 0
        
        for plugin_path in plugin_paths:
            try:
                if await self.load_plugin(plugin_path):
                    loaded_count += 1
            except Exception as e:
                logger.warning(f"Failed to auto-load plugin {plugin_path}: {e}")
        
        logger.info(f"Auto-loaded {loaded_count} plugins")
        return loaded_count
    
    async def _load_plugin_metadata(self, plugin_path: Path) -> Optional[PluginMetadata]:
        """Load plugin metadata"""
        
        try:
            if plugin_path.is_file() and plugin_path.suffix == '.py':
                # Load metadata from Python file
                return await self._load_metadata_from_python(plugin_path)
            elif plugin_path.is_dir():
                # Load metadata from plugin.json
                manifest_file = plugin_path / "plugin.json"
                if manifest_file.exists():
                    return await self._load_metadata_from_json(manifest_file)
        
        except Exception as e:
            logger.error(f"Error loading plugin metadata from {plugin_path}: {e}")
        
        return None
    
    async def _load_metadata_from_json(self, manifest_file: Path) -> Optional[PluginMetadata]:
        """Load metadata from JSON manifest"""
        
        try:
            with open(manifest_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not validate_plugin_metadata(data):
                return None
            
            return PluginMetadata(
                name=data['name'],
                version=data['version'],
                description=data['description'],
                author=data['author'],
                plugin_type=PluginType(data['plugin_type']),
                dependencies=data.get('dependencies', []),
                python_requires=data.get('python_requires', '>=3.9'),
                config_schema=data.get('config_schema', {}),
                default_config=data.get('default_config', {}),
                homepage=data.get('homepage'),
                repository=data.get('repository'),
                license=data.get('license'),
                tags=data.get('tags', [])
            )
            
        except Exception as e:
            logger.error(f"Error parsing plugin manifest {manifest_file}: {e}")
            return None
    
    async def _load_metadata_from_python(self, plugin_file: Path) -> Optional[PluginMetadata]:
        """Load metadata from Python file docstring or __plugin__ variable"""
        
        try:
            # Load module to extract metadata
            spec = importlib.util.spec_from_file_location(
                f"temp_plugin_{uuid.uuid4().hex}", plugin_file
            )
            if not spec or not spec.loader:
                return None
            
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Check for __plugin__ metadata
            if hasattr(module, '__plugin__'):
                data = module.__plugin__
                if validate_plugin_metadata(data):
                    return PluginMetadata(
                        name=data['name'],
                        version=data['version'],
                        description=data['description'],
                        author=data['author'],
                        plugin_type=PluginType(data['plugin_type']),
                        dependencies=data.get('dependencies', []),
                        python_requires=data.get('python_requires', '>=3.9'),
                        config_schema=data.get('config_schema', {}),
                        default_config=data.get('default_config', {}),
                        homepage=data.get('homepage'),
                        repository=data.get('repository'),
                        license=data.get('license'),
                        tags=data.get('tags', [])
                    )
            
        except Exception as e:
            logger.error(f"Error extracting metadata from {plugin_file}: {e}")
        
        return None
    
    async def _load_plugin_class(
        self, 
        plugin_path: Path, 
        metadata: PluginMetadata
    ) -> Optional[Type[PluginInterface]]:
        """Load plugin class from path"""
        
        try:
            if plugin_path.is_file() and plugin_path.suffix == '.py':
                # Load from Python file
                spec = importlib.util.spec_from_file_location(
                    f"plugin_{metadata.name}", plugin_path
                )
                if not spec or not spec.loader:
                    return None
                
                module = importlib.util.module_from_spec(spec)
                sys.modules[f"plugin_{metadata.name}"] = module
                spec.loader.exec_module(module)
                
                # Look for plugin class
                plugin_class = getattr(module, f"{metadata.name.title()}Plugin", None)
                if not plugin_class:
                    plugin_class = getattr(module, "Plugin", None)
                
                if plugin_class and issubclass(plugin_class, PluginInterface):
                    return plugin_class
                
            elif plugin_path.is_dir():
                # Load from package
                init_file = plugin_path / "__init__.py"
                if init_file.exists():
                    spec = importlib.util.spec_from_file_location(
                        f"plugin_{metadata.name}", init_file
                    )
                    if spec and spec.loader:
                        module = importlib.util.module_from_spec(spec)
                        sys.modules[f"plugin_{metadata.name}"] = module
                        spec.loader.exec_module(module)
                        
                        # Look for plugin class
                        plugin_class = getattr(module, f"{metadata.name.title()}Plugin", None)
                        if not plugin_class:
                            plugin_class = getattr(module, "Plugin", None)
                        
                        if plugin_class and issubclass(plugin_class, PluginInterface):
                            return plugin_class
        
        except Exception as e:
            logger.error(f"Error loading plugin class from {plugin_path}: {e}")
        
        return None
    
    async def _install_from_zip(self, zip_path: Path, plugin_name: Optional[str]) -> bool:
        """Install plugin from ZIP file"""
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_file:
                # Extract to temporary directory first
                temp_dir = self.plugin_dir / "temp" / f"install_{uuid.uuid4().hex}"
                temp_dir.mkdir(parents=True)
                
                zip_file.extractall(temp_dir)
                
                # Find plugin manifest
                manifest_file = None
                for root, dirs, files in temp_dir.rglob("plugin.json"):
                    manifest_file = root / "plugin.json"
                    break
                
                if not manifest_file:
                    shutil.rmtree(temp_dir)
                    logger.error("No plugin.json found in ZIP file")
                    return False
                
                # Load metadata
                metadata = await self._load_metadata_from_json(manifest_file)
                if not metadata:
                    shutil.rmtree(temp_dir)
                    return False
                
                # Move to final location
                final_dir = self.user_plugin_dir / (plugin_name or metadata.name)
                if final_dir.exists():
                    shutil.rmtree(final_dir)
                
                shutil.move(str(manifest_file.parent), str(final_dir))
                shutil.rmtree(temp_dir)
                
                logger.info(f"Plugin installed to {final_dir}")
                
                # Auto-load if enabled
                if self.auto_load:
                    await self.load_plugin(final_dir)
                
                return True
                
        except Exception as e:
            logger.error(f"Error installing plugin from ZIP {zip_path}: {e}")
            return False
    
    async def _install_from_directory(self, source_dir: Path, plugin_name: Optional[str]) -> bool:
        """Install plugin from directory"""
        
        try:
            # Check for plugin manifest
            manifest_file = source_dir / "plugin.json"
            if not manifest_file.exists():
                logger.error(f"No plugin.json found in {source_dir}")
                return False
            
            # Load metadata
            metadata = await self._load_metadata_from_json(manifest_file)
            if not metadata:
                return False
            
            # Copy to plugin directory
            final_dir = self.user_plugin_dir / (plugin_name or metadata.name)
            if final_dir.exists():
                shutil.rmtree(final_dir)
            
            shutil.copytree(source_dir, final_dir)
            
            logger.info(f"Plugin installed to {final_dir}")
            
            # Auto-load if enabled
            if self.auto_load:
                await self.load_plugin(final_dir)
            
            return True
            
        except Exception as e:
            logger.error(f"Error installing plugin from directory {source_dir}: {e}")
            return False
    
    async def _install_from_file(self, source_file: Path, plugin_name: Optional[str]) -> bool:
        """Install plugin from single Python file"""
        
        try:
            # Load metadata from file
            metadata = await self._load_metadata_from_python(source_file)
            if not metadata:
                logger.error(f"No valid plugin metadata found in {source_file}")
                return False
            
            # Create plugin directory
            final_dir = self.user_plugin_dir / (plugin_name or metadata.name)
            final_dir.mkdir(exist_ok=True)
            
            # Copy plugin file
            shutil.copy2(source_file, final_dir / "__init__.py")
            
            # Create manifest
            manifest_data = {
                'name': metadata.name,
                'version': metadata.version,
                'description': metadata.description,
                'author': metadata.author,
                'plugin_type': metadata.plugin_type.value,
                'dependencies': metadata.dependencies,
                'python_requires': metadata.python_requires
            }
            
            with open(final_dir / "plugin.json", 'w', encoding='utf-8') as f:
                json.dump(manifest_data, f, indent=2)
            
            logger.info(f"Plugin installed to {final_dir}")
            
            # Auto-load if enabled
            if self.auto_load:
                await self.load_plugin(final_dir)
            
            return True
            
        except Exception as e:
            logger.error(f"Error installing plugin from file {source_file}: {e}")
            return False
    
    async def _load_builtin_plugins(self):
        """Load built-in plugins"""
        
        if not self.builtin_plugin_dir.exists():
            return
        
        logger.info("Loading built-in plugins")
        
        builtin_count = 0
        for plugin_file in self.builtin_plugin_dir.glob("*.py"):
            if plugin_file.name != "__init__.py":
                try:
                    if await self.load_plugin(plugin_file):
                        builtin_count += 1
                except Exception as e:
                    logger.warning(f"Failed to load built-in plugin {plugin_file}: {e}")
        
        logger.info(f"Loaded {builtin_count} built-in plugins")
    
    def _register_plugin_type(self, plugin_name: str, plugin_type: PluginType):
        """Register plugin in type index"""
        if plugin_type not in self.plugin_types:
            self.plugin_types[plugin_type] = []
        
        if plugin_name not in self.plugin_types[plugin_type]:
            self.plugin_types[plugin_type].append(plugin_name)
    
    def _unregister_plugin_type(self, plugin_name: str, plugin_type: PluginType):
        """Unregister plugin from type index"""
        if plugin_type in self.plugin_types:
            if plugin_name in self.plugin_types[plugin_type]:
                self.plugin_types[plugin_type].remove(plugin_name)
    
    async def _trigger_plugin_hooks(self, hook_name: str, context: Dict[str, Any]):
        """Trigger plugin hooks"""
        
        for plugin in self.plugins.values():
            if plugin.instance and hasattr(plugin.instance, 'execute_hooks'):
                try:
                    await plugin.instance.execute_hooks(hook_name, context)
                except Exception as e:
                    logger.warning(f"Plugin hook {hook_name} failed for {plugin.name}: {e}")
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get plugin system status"""
        
        status_counts = {}
        for status in PluginStatus:
            status_counts[status.value] = len([
                p for p in self.plugins.values() if p.status == status
            ])
        
        type_counts = {}
        for plugin_type, plugin_names in self.plugin_types.items():
            type_counts[plugin_type.value] = len(plugin_names)
        
        return {
            'total_plugins': len(self.plugins),
            'status_counts': status_counts,
            'type_counts': type_counts,
            'plugin_directory': str(self.plugin_dir),
            'auto_load': self.auto_load,
            'safe_mode': self.safe_mode
        }
    
    async def cleanup(self):
        """Cleanup plugin system"""
        
        logger.info("Cleaning up plugin system")
        
        # Unload all plugins
        plugin_names = list(self.plugins.keys())
        for plugin_name in plugin_names:
            await self.unload_plugin(plugin_name)
        
        logger.info("Plugin system cleanup complete")


# Global plugin system instance
_global_system: Optional[PluginSystem] = None

def get_plugin_system() -> PluginSystem:
    """Get the global plugin system"""
    global _global_system
    if _global_system is None:
        _global_system = PluginSystem()
    return _global_system

async def load_plugin(plugin_path: Union[str, Path], config: Optional[Dict[str, Any]] = None) -> bool:
    """Load a plugin"""
    return await get_plugin_system().load_plugin(plugin_path, config)

async def unload_plugin(plugin_name: str) -> bool:
    """Unload a plugin"""
    return await get_plugin_system().unload_plugin(plugin_name)

def list_plugins(plugin_type: Optional[PluginType] = None, status: Optional[PluginStatus] = None) -> List[Plugin]:
    """List plugins"""
    return get_plugin_system().list_plugins(plugin_type, status)

async def install_plugin(plugin_source: Union[str, Path], plugin_name: Optional[str] = None) -> bool:
    """Install a plugin"""
    return await get_plugin_system().install_plugin(plugin_source, plugin_name)