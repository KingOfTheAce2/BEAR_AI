"""
Built-in Plugins
Default plugins that ship with BEAR AI
"""

import asyncio
import json
import logging
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from .plugin_interface import (
    ToolPlugin, PluginMetadata, PluginType, PluginCapability,
    create_plugin_metadata
)

logger = logging.getLogger(__name__)


class FileManagerPlugin(ToolPlugin):
    """File management operations plugin"""
    
    def __init__(self, metadata: Optional[PluginMetadata] = None):
        if not metadata:
            metadata = create_plugin_metadata(
                name="file_manager",
                version="1.0.0",
                description="File system operations and management",
                author="BEAR AI Team",
                plugin_type=PluginType.TOOL,
                capabilities=[
                    PluginCapability(
                        name="read_file",
                        description="Read text files",
                        parameters={"file_path": "str"}
                    ),
                    PluginCapability(
                        name="write_file",
                        description="Write text to files",
                        parameters={"file_path": "str", "content": "str"}
                    ),
                    PluginCapability(
                        name="list_directory",
                        description="List directory contents",
                        parameters={"directory": "str"}
                    ),
                    PluginCapability(
                        name="create_directory",
                        description="Create directories",
                        parameters={"directory": "str"}
                    ),
                    PluginCapability(
                        name="delete_file",
                        description="Delete files",
                        parameters={"file_path": "str"}
                    )
                ]
            )
        
        super().__init__(metadata)
    
    async def _initialize_plugin(self) -> bool:
        """Initialize file manager plugin"""
        
        # Register tools
        self.register_tool("read_file", self.read_file, "Read content from a text file")
        self.register_tool("write_file", self.write_file, "Write content to a text file")
        self.register_tool("list_directory", self.list_directory, "List directory contents")
        self.register_tool("create_directory", self.create_directory, "Create a new directory")
        self.register_tool("delete_file", self.delete_file, "Delete a file")
        self.register_tool("copy_file", self.copy_file, "Copy a file")
        self.register_tool("move_file", self.move_file, "Move/rename a file")
        self.register_tool("get_file_info", self.get_file_info, "Get file information")
        
        logger.info("FileManagerPlugin initialized")
        return True
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Any:
        """Execute a file management tool"""
        
        if tool_name not in self.tools:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        return await self.tools[tool_name](**parameters)
    
    async def read_file(self, file_path: str, encoding: str = "utf-8") -> str:
        """Read content from a text file"""
        try:
            path = Path(file_path)
            if not path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            with open(path, 'r', encoding=encoding) as f:
                content = f.read()
            
            return content
            
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")
            raise
    
    async def write_file(self, file_path: str, content: str, encoding: str = "utf-8") -> bool:
        """Write content to a text file"""
        try:
            path = Path(file_path)
            
            # Create parent directories if they don't exist
            path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(path, 'w', encoding=encoding) as f:
                f.write(content)
            
            return True
            
        except Exception as e:
            logger.error(f"Error writing file {file_path}: {e}")
            raise
    
    async def list_directory(self, directory: str, include_hidden: bool = False) -> List[Dict[str, Any]]:
        """List directory contents"""
        try:
            path = Path(directory)
            if not path.exists():
                raise FileNotFoundError(f"Directory not found: {directory}")
            
            if not path.is_dir():
                raise ValueError(f"Path is not a directory: {directory}")
            
            items = []
            for item in path.iterdir():
                if not include_hidden and item.name.startswith('.'):
                    continue
                
                items.append({
                    'name': item.name,
                    'path': str(item),
                    'type': 'directory' if item.is_dir() else 'file',
                    'size': item.stat().st_size if item.is_file() else None,
                    'modified': item.stat().st_mtime
                })
            
            return items
            
        except Exception as e:
            logger.error(f"Error listing directory {directory}: {e}")
            raise
    
    async def create_directory(self, directory: str) -> bool:
        """Create a new directory"""
        try:
            path = Path(directory)
            path.mkdir(parents=True, exist_ok=True)
            return True
            
        except Exception as e:
            logger.error(f"Error creating directory {directory}: {e}")
            raise
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete a file"""
        try:
            path = Path(file_path)
            if not path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            if path.is_file():
                path.unlink()
            elif path.is_dir():
                import shutil
                shutil.rmtree(path)
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}")
            raise
    
    async def copy_file(self, source: str, destination: str) -> bool:
        """Copy a file"""
        try:
            import shutil
            
            source_path = Path(source)
            dest_path = Path(destination)
            
            if not source_path.exists():
                raise FileNotFoundError(f"Source file not found: {source}")
            
            # Create parent directory if needed
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            
            shutil.copy2(source_path, dest_path)
            return True
            
        except Exception as e:
            logger.error(f"Error copying file {source} to {destination}: {e}")
            raise
    
    async def move_file(self, source: str, destination: str) -> bool:
        """Move/rename a file"""
        try:
            import shutil
            
            source_path = Path(source)
            dest_path = Path(destination)
            
            if not source_path.exists():
                raise FileNotFoundError(f"Source file not found: {source}")
            
            # Create parent directory if needed
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            
            shutil.move(source_path, dest_path)
            return True
            
        except Exception as e:
            logger.error(f"Error moving file {source} to {destination}: {e}")
            raise
    
    async def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Get detailed file information"""
        try:
            path = Path(file_path)
            if not path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            stat = path.stat()
            
            return {
                'name': path.name,
                'path': str(path.resolve()),
                'type': 'directory' if path.is_dir() else 'file',
                'size': stat.st_size,
                'created': stat.st_ctime,
                'modified': stat.st_mtime,
                'accessed': stat.st_atime,
                'permissions': oct(stat.st_mode)[-3:],
                'is_readable': os.access(path, os.R_OK),
                'is_writable': os.access(path, os.W_OK),
                'is_executable': os.access(path, os.X_OK)
            }
            
        except Exception as e:
            logger.error(f"Error getting file info for {file_path}: {e}")
            raise


class WebSearchPlugin(ToolPlugin):
    """Web search functionality plugin"""
    
    def __init__(self, metadata: Optional[PluginMetadata] = None):
        if not metadata:
            metadata = create_plugin_metadata(
                name="web_search",
                version="1.0.0",
                description="Web search and information retrieval",
                author="BEAR AI Team",
                plugin_type=PluginType.TOOL,
                capabilities=[
                    PluginCapability(
                        name="search_web",
                        description="Search the web for information",
                        parameters={"query": "str", "max_results": "int"}
                    ),
                    PluginCapability(
                        name="fetch_url",
                        description="Fetch content from a URL",
                        parameters={"url": "str"}
                    )
                ]
            )
        
        super().__init__(metadata)
    
    async def _initialize_plugin(self) -> bool:
        """Initialize web search plugin"""
        
        # Register tools
        self.register_tool("search_web", self.search_web, "Search the web for information")
        self.register_tool("fetch_url", self.fetch_url, "Fetch content from a URL")
        self.register_tool("search_news", self.search_news, "Search for news articles")
        
        logger.info("WebSearchPlugin initialized")
        return True
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Any:
        """Execute a web search tool"""
        
        if tool_name not in self.tools:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        return await self.tools[tool_name](**parameters)
    
    async def search_web(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Search the web for information"""
        try:
            # This is a mock implementation
            # In practice, you would integrate with search APIs like:
            # - DuckDuckGo Instant Answer API
            # - Bing Web Search API
            # - Google Custom Search API
            
            await asyncio.sleep(0.5)  # Simulate API call
            
            # Mock search results
            results = [
                {
                    'title': f'Result {i+1} for "{query}"',
                    'url': f'https://example.com/result_{i+1}',
                    'snippet': f'This is a mock search result for the query "{query}". It contains relevant information about the topic.',
                    'source': 'example.com',
                    'timestamp': '2024-01-01T00:00:00Z'
                }
                for i in range(min(max_results, 5))
            ]
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching web for '{query}': {e}")
            raise
    
    async def fetch_url(self, url: str, timeout: int = 30) -> Dict[str, Any]:
        """Fetch content from a URL"""
        try:
            # Mock implementation - in practice you would use httpx or requests
            await asyncio.sleep(0.2)  # Simulate network call
            
            return {
                'url': url,
                'title': 'Mock Page Title',
                'content': f'This is mock content fetched from {url}. In a real implementation, this would contain the actual page content.',
                'status_code': 200,
                'content_type': 'text/html',
                'length': 1024
            }
            
        except Exception as e:
            logger.error(f"Error fetching URL {url}: {e}")
            raise
    
    async def search_news(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Search for news articles"""
        try:
            # Mock news search
            await asyncio.sleep(0.3)
            
            results = [
                {
                    'title': f'News Article {i+1}: {query}',
                    'url': f'https://news.example.com/article_{i+1}',
                    'snippet': f'Breaking news about {query}. This article provides the latest updates on this topic.',
                    'source': f'News Source {i+1}',
                    'published_date': '2024-01-01T00:00:00Z',
                    'category': 'general'
                }
                for i in range(min(max_results, 3))
            ]
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching news for '{query}': {e}")
            raise


class CodeExecutorPlugin(ToolPlugin):
    """Code execution plugin"""
    
    def __init__(self, metadata: Optional[PluginMetadata] = None):
        if not metadata:
            metadata = create_plugin_metadata(
                name="code_executor",
                version="1.0.0",
                description="Execute code in various languages",
                author="BEAR AI Team",
                plugin_type=PluginType.TOOL,
                capabilities=[
                    PluginCapability(
                        name="execute_python",
                        description="Execute Python code",
                        parameters={"code": "str", "timeout": "int"}
                    ),
                    PluginCapability(
                        name="execute_shell",
                        description="Execute shell commands",
                        parameters={"command": "str", "timeout": "int"}
                    )
                ]
            )
        
        super().__init__(metadata)
    
    async def _initialize_plugin(self) -> bool:
        """Initialize code executor plugin"""
        
        # Register tools
        self.register_tool("execute_python", self.execute_python, "Execute Python code safely")
        self.register_tool("execute_shell", self.execute_shell, "Execute shell commands")
        self.register_tool("validate_python", self.validate_python, "Validate Python syntax")
        
        logger.info("CodeExecutorPlugin initialized")
        return True
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Any:
        """Execute a code execution tool"""
        
        if tool_name not in self.tools:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        return await self.tools[tool_name](**parameters)
    
    async def execute_python(self, code: str, timeout: int = 30) -> Dict[str, Any]:
        """Execute Python code safely"""
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            try:
                # Execute with timeout
                process = await asyncio.create_subprocess_exec(
                    'python', temp_file,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )
                
                return {
                    'success': process.returncode == 0,
                    'stdout': stdout.decode('utf-8') if stdout else '',
                    'stderr': stderr.decode('utf-8') if stderr else '',
                    'return_code': process.returncode
                }
                
            finally:
                # Cleanup temp file
                Path(temp_file).unlink(missing_ok=True)
                
        except asyncio.TimeoutError:
            return {
                'success': False,
                'stdout': '',
                'stderr': f'Execution timed out after {timeout} seconds',
                'return_code': -1
            }
        except Exception as e:
            return {
                'success': False,
                'stdout': '',
                'stderr': str(e),
                'return_code': -1
            }
    
    async def execute_shell(self, command: str, timeout: int = 30) -> Dict[str, Any]:
        """Execute shell command"""
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            return {
                'success': process.returncode == 0,
                'stdout': stdout.decode('utf-8') if stdout else '',
                'stderr': stderr.decode('utf-8') if stderr else '',
                'return_code': process.returncode
            }
            
        except asyncio.TimeoutError:
            return {
                'success': False,
                'stdout': '',
                'stderr': f'Command timed out after {timeout} seconds',
                'return_code': -1
            }
        except Exception as e:
            return {
                'success': False,
                'stdout': '',
                'stderr': str(e),
                'return_code': -1
            }
    
    async def validate_python(self, code: str) -> Dict[str, Any]:
        """Validate Python syntax"""
        try:
            compile(code, '<string>', 'exec')
            return {
                'valid': True,
                'error': None
            }
        except SyntaxError as e:
            return {
                'valid': False,
                'error': f'Syntax error at line {e.lineno}: {e.msg}'
            }
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }


class DataVisualizationPlugin(ToolPlugin):
    """Data visualization and analysis plugin"""
    
    def __init__(self, metadata: Optional[PluginMetadata] = None):
        if not metadata:
            metadata = create_plugin_metadata(
                name="data_visualization",
                version="1.0.0",
                description="Data visualization and basic analysis",
                author="BEAR AI Team",
                plugin_type=PluginType.TOOL,
                capabilities=[
                    PluginCapability(
                        name="create_chart",
                        description="Create charts from data",
                        parameters={"data": "dict", "chart_type": "str"}
                    ),
                    PluginCapability(
                        name="analyze_data",
                        description="Perform basic data analysis",
                        parameters={"data": "list"}
                    )
                ]
            )
        
        super().__init__(metadata)
    
    async def _initialize_plugin(self) -> bool:
        """Initialize data visualization plugin"""
        
        # Register tools
        self.register_tool("create_chart", self.create_chart, "Create charts from data")
        self.register_tool("analyze_data", self.analyze_data, "Perform basic statistical analysis")
        self.register_tool("format_table", self.format_table, "Format data as a table")
        
        logger.info("DataVisualizationPlugin initialized")
        return True
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Any:
        """Execute a data visualization tool"""
        
        if tool_name not in self.tools:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        return await self.tools[tool_name](**parameters)
    
    async def create_chart(self, data: Dict[str, List], chart_type: str = "bar") -> Dict[str, Any]:
        """Create a chart from data (returns chart description)"""
        try:
            # In a real implementation, this would generate actual charts
            # using libraries like matplotlib, plotly, or similar
            
            chart_info = {
                'chart_type': chart_type,
                'data_points': sum(len(values) for values in data.values()),
                'series_count': len(data),
                'series_names': list(data.keys()),
                'description': f'{chart_type.title()} chart with {len(data)} data series'
            }
            
            # Mock chart generation
            await asyncio.sleep(0.1)
            
            return chart_info
            
        except Exception as e:
            logger.error(f"Error creating chart: {e}")
            raise
    
    async def analyze_data(self, data: List[float]) -> Dict[str, Any]:
        """Perform basic statistical analysis"""
        try:
            if not data:
                return {
                    'count': 0,
                    'mean': None,
                    'median': None,
                    'std_dev': None,
                    'min': None,
                    'max': None
                }
            
            import statistics
            
            analysis = {
                'count': len(data),
                'mean': statistics.mean(data),
                'median': statistics.median(data),
                'min': min(data),
                'max': max(data),
                'sum': sum(data)
            }
            
            if len(data) > 1:
                analysis['std_dev'] = statistics.stdev(data)
                analysis['variance'] = statistics.variance(data)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing data: {e}")
            raise
    
    async def format_table(self, data: List[Dict[str, Any]], max_rows: int = 100) -> str:
        """Format data as a readable table"""
        try:
            if not data:
                return "No data to display"
            
            # Get column headers
            headers = list(data[0].keys()) if data else []
            
            # Calculate column widths
            col_widths = {}
            for header in headers:
                col_widths[header] = len(str(header))
                for row in data[:max_rows]:
                    col_widths[header] = max(col_widths[header], len(str(row.get(header, ''))))
            
            # Build table
            table_lines = []
            
            # Header row
            header_line = "| " + " | ".join(h.ljust(col_widths[h]) for h in headers) + " |"
            table_lines.append(header_line)
            
            # Separator row
            separator = "|-" + "-|-".join("-" * col_widths[h] for h in headers) + "-|"
            table_lines.append(separator)
            
            # Data rows
            for row in data[:max_rows]:
                row_line = "| " + " | ".join(str(row.get(h, '')).ljust(col_widths[h]) for h in headers) + " |"
                table_lines.append(row_line)
            
            if len(data) > max_rows:
                table_lines.append(f"... and {len(data) - max_rows} more rows")
            
            return "\n".join(table_lines)
            
        except Exception as e:
            logger.error(f"Error formatting table: {e}")
            raise


class BuiltinPlugins:
    """Factory for creating built-in plugins"""
    
    @staticmethod
    def get_all_builtin_plugins() -> List[ToolPlugin]:
        """Get all built-in plugins"""
        return [
            FileManagerPlugin(),
            WebSearchPlugin(),
            CodeExecutorPlugin(),
            DataVisualizationPlugin()
        ]
    
    @staticmethod
    def get_plugin_by_name(name: str) -> Optional[ToolPlugin]:
        """Get a built-in plugin by name"""
        plugins = {
            'file_manager': FileManagerPlugin,
            'web_search': WebSearchPlugin,
            'code_executor': CodeExecutorPlugin,
            'data_visualization': DataVisualizationPlugin
        }
        
        plugin_class = plugins.get(name)
        return plugin_class() if plugin_class else None


# Plugin metadata for built-in plugins (for discovery)
__plugin__ = {
    'name': 'builtin_plugins',
    'version': '1.0.0',
    'description': 'Built-in plugins for BEAR AI',
    'author': 'BEAR AI Team',
    'plugin_type': 'extension'
}