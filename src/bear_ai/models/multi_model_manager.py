"""
Multi-Model Session Management System
Allows loading multiple models simultaneously and hot-swapping between them
"""

import asyncio
import threading
import time
import logging
from pathlib import Path
from typing import Dict, Optional, List, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import json

logger = logging.getLogger(__name__)


class ModelStatus(Enum):
    UNLOADED = "unloaded"
    LOADING = "loading"
    LOADED = "loaded"
    ERROR = "error"
    UNLOADING = "unloading"


@dataclass
class ModelInfo:
    """Information about a loaded model"""
    alias: str
    path: Path
    status: ModelStatus = ModelStatus.UNLOADED
    model_instance: Optional[Any] = None
    load_time: Optional[float] = None
    memory_usage: Optional[int] = None  # MB
    context_size: int = 4096
    quantization: Optional[str] = None
    error_message: Optional[str] = None
    last_used: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    performance_stats: Dict[str, float] = field(default_factory=dict)


class MultiModelManager:
    """Manages multiple GGUF models simultaneously with hot-swapping capabilities"""
    
    def __init__(self, max_concurrent_models: int = 3):
        self.max_concurrent_models = max_concurrent_models
        self.models: Dict[str, ModelInfo] = {}
        self.active_model: Optional[str] = None
        self.loading_lock = threading.Lock()
        self.model_cache_dir = Path.home() / ".bear_ai" / "model_cache"
        self.model_cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Background loading queue
        self.load_queue: List[str] = []
        self.background_loader = threading.Thread(target=self._background_loader, daemon=True)
        self.background_loader.start()
        
        # Stats tracking
        self.total_swaps = 0
        self.total_load_time = 0.0
        
        logger.info(f"MultiModelManager initialized with max {max_concurrent_models} concurrent models")
    
    def register_model(self, alias: str, model_path: str, **metadata) -> bool:
        """Register a model for loading without actually loading it"""
        try:
            path = Path(model_path)
            if not path.exists():
                logger.error(f"Model file not found: {model_path}")
                return False
            
            if alias in self.models:
                logger.warning(f"Model alias '{alias}' already registered, updating...")
            
            self.models[alias] = ModelInfo(
                alias=alias,
                path=path,
                metadata=metadata
            )
            
            logger.info(f"Registered model '{alias}' -> {model_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to register model '{alias}': {e}")
            return False
    
    def load_model_background(self, alias: str) -> bool:
        """Queue a model for background loading"""
        if alias not in self.models:
            logger.error(f"Model '{alias}' not registered")
            return False
        
        if self.models[alias].status in [ModelStatus.LOADED, ModelStatus.LOADING]:
            logger.info(f"Model '{alias}' already loaded/loading")
            return True
        
        with self.loading_lock:
            if alias not in self.load_queue:
                self.load_queue.append(alias)
                logger.info(f"Queued model '{alias}' for background loading")
        
        return True
    
    def load_model_sync(self, alias: str, **load_params) -> bool:
        """Load a model synchronously"""
        if alias not in self.models:
            logger.error(f"Model '{alias}' not registered")
            return False
        
        model_info = self.models[alias]
        
        if model_info.status == ModelStatus.LOADED:
            logger.info(f"Model '{alias}' already loaded")
            return True
        
        # Check if we need to unload a model first
        if len([m for m in self.models.values() if m.status == ModelStatus.LOADED]) >= self.max_concurrent_models:
            self._unload_least_recently_used()
        
        model_info.status = ModelStatus.LOADING
        logger.info(f"Loading model '{alias}' from {model_info.path}")
        
        try:
            start_time = time.time()
            
            # Import llama_cpp here to avoid dependency issues
            try:
                from llama_cpp import Llama
            except ImportError:
                logger.error("llama-cpp-python not installed. Install with: pip install llama-cpp-python")
                model_info.status = ModelStatus.ERROR
                model_info.error_message = "llama-cpp-python not installed"
                return False
            
            # Load the model
            model_instance = Llama(
                model_path=str(model_info.path),
                n_ctx=load_params.get('n_ctx', 4096),
                n_gpu_layers=load_params.get('n_gpu_layers', 0),
                n_batch=load_params.get('n_batch', 512),
                verbose=load_params.get('verbose', False)
            )
            
            load_time = time.time() - start_time
            
            # Update model info
            model_info.model_instance = model_instance
            model_info.load_time = load_time
            model_info.status = ModelStatus.LOADED
            model_info.last_used = time.time()
            model_info.context_size = load_params.get('n_ctx', 4096)
            
            # Estimate memory usage (rough calculation)
            model_info.memory_usage = self._estimate_memory_usage(model_info.path)
            
            self.total_load_time += load_time
            
            logger.info(f"Model '{alias}' loaded successfully in {load_time:.2f}s")
            return True
            
        except Exception as e:
            model_info.status = ModelStatus.ERROR
            model_info.error_message = str(e)
            logger.error(f"Failed to load model '{alias}': {e}")
            return False
    
    def hot_swap_model(self, alias: str) -> bool:
        """Switch active model instantly"""
        if alias not in self.models:
            logger.error(f"Model '{alias}' not registered")
            return False
        
        model_info = self.models[alias]
        
        if model_info.status != ModelStatus.LOADED:
            logger.warning(f"Model '{alias}' not loaded, attempting to load...")
            if not self.load_model_sync(alias):
                return False
        
        old_model = self.active_model
        self.active_model = alias
        model_info.last_used = time.time()
        
        self.total_swaps += 1
        
        logger.info(f"Hot-swapped from '{old_model}' to '{alias}'")
        return True
    
    def generate_text(self, prompt: str, model_alias: Optional[str] = None, **generate_params) -> Optional[str]:
        """Generate text using the active model or specified model"""
        target_model = model_alias or self.active_model
        
        if not target_model:
            logger.error("No active model set")
            return None
        
        if target_model not in self.models:
            logger.error(f"Model '{target_model}' not registered")
            return None
        
        model_info = self.models[target_model]
        
        if model_info.status != ModelStatus.LOADED:
            logger.warning(f"Model '{target_model}' not loaded, attempting to load...")
            if not self.load_model_sync(target_model):
                return None
        
        try:
            start_time = time.time()
            
            response = model_info.model_instance(
                prompt,
                max_tokens=generate_params.get('max_tokens', 128),
                temperature=generate_params.get('temperature', 0.7),
                top_p=generate_params.get('top_p', 0.9),
                echo=generate_params.get('echo', False),
                stop=generate_params.get('stop', [])
            )
            
            generation_time = time.time() - start_time
            
            # Update performance stats
            if 'generation_times' not in model_info.performance_stats:
                model_info.performance_stats['generation_times'] = []
            
            model_info.performance_stats['generation_times'].append(generation_time)
            model_info.last_used = time.time()
            
            if isinstance(response, dict) and 'choices' in response:
                return response['choices'][0]['text']
            else:
                return str(response)
            
        except Exception as e:
            logger.error(f"Generation failed with model '{target_model}': {e}")
            return None
    
    def unload_model(self, alias: str) -> bool:
        """Unload a specific model"""
        if alias not in self.models:
            logger.error(f"Model '{alias}' not registered")
            return False
        
        model_info = self.models[alias]
        
        if model_info.status != ModelStatus.LOADED:
            logger.info(f"Model '{alias}' not loaded")
            return True
        
        try:
            model_info.status = ModelStatus.UNLOADING
            
            # Clear the model instance
            if model_info.model_instance:
                del model_info.model_instance
                model_info.model_instance = None
            
            model_info.status = ModelStatus.UNLOADED
            
            # If this was the active model, clear it
            if self.active_model == alias:
                self.active_model = None
            
            logger.info(f"Model '{alias}' unloaded successfully")
            return True
            
        except Exception as e:
            model_info.status = ModelStatus.ERROR
            model_info.error_message = str(e)
            logger.error(f"Failed to unload model '{alias}': {e}")
            return False
    
    def get_model_status(self, alias: Optional[str] = None) -> Dict[str, Any]:
        """Get status information for models"""
        if alias:
            if alias not in self.models:
                return {"error": f"Model '{alias}' not registered"}
            return self._model_info_to_dict(self.models[alias])
        
        # Return all models
        return {
            "active_model": self.active_model,
            "models": {alias: self._model_info_to_dict(info) for alias, info in self.models.items()},
            "stats": {
                "total_swaps": self.total_swaps,
                "total_load_time": self.total_load_time,
                "loaded_models": len([m for m in self.models.values() if m.status == ModelStatus.LOADED])
            }
        }
    
    def get_loaded_models(self) -> List[str]:
        """Get list of currently loaded model aliases"""
        return [alias for alias, info in self.models.items() if info.status == ModelStatus.LOADED]
    
    def cleanup(self):
        """Cleanup all loaded models"""
        logger.info("Cleaning up MultiModelManager...")
        
        for alias in list(self.models.keys()):
            self.unload_model(alias)
        
        self.models.clear()
        self.active_model = None
    
    def _background_loader(self):
        """Background thread for loading models"""
        while True:
            try:
                if self.load_queue:
                    with self.loading_lock:
                        if self.load_queue:
                            alias = self.load_queue.pop(0)
                        else:
                            time.sleep(0.1)
                            continue
                    
                    if alias in self.models and self.models[alias].status == ModelStatus.UNLOADED:
                        logger.info(f"Background loading model '{alias}'")
                        self.load_model_sync(alias)
                else:
                    time.sleep(0.5)
                    
            except Exception as e:
                logger.error(f"Background loader error: {e}")
                time.sleep(1)
    
    def _unload_least_recently_used(self):
        """Unload the least recently used model"""
        loaded_models = [(alias, info) for alias, info in self.models.items() 
                        if info.status == ModelStatus.LOADED]
        
        if not loaded_models:
            return
        
        # Find LRU model (excluding active model)
        lru_alias = None
        lru_time = float('inf')
        
        for alias, info in loaded_models:
            if alias != self.active_model and (info.last_used or 0) < lru_time:
                lru_time = info.last_used or 0
                lru_alias = alias
        
        if lru_alias:
            logger.info(f"Unloading LRU model '{lru_alias}' to make space")
            self.unload_model(lru_alias)
    
    def _estimate_memory_usage(self, model_path: Path) -> int:
        """Estimate memory usage of a GGUF model in MB"""
        try:
            file_size_mb = model_path.stat().st_size / (1024 * 1024)
            # Rough estimate: model size + ~20% overhead
            return int(file_size_mb * 1.2)
        except:
            return 0
    
    def _model_info_to_dict(self, model_info: ModelInfo) -> Dict[str, Any]:
        """Convert ModelInfo to dictionary for JSON serialization"""
        return {
            "alias": model_info.alias,
            "path": str(model_info.path),
            "status": model_info.status.value,
            "load_time": model_info.load_time,
            "memory_usage": model_info.memory_usage,
            "context_size": model_info.context_size,
            "quantization": model_info.quantization,
            "error_message": model_info.error_message,
            "last_used": model_info.last_used,
            "metadata": model_info.metadata,
            "performance_stats": {
                k: v for k, v in model_info.performance_stats.items() 
                if k != 'generation_times'  # Don't serialize large arrays
            }
        }
    
    def save_session(self, session_file: Path):
        """Save current session to file"""
        session_data = {
            "active_model": self.active_model,
            "models": {
                alias: {
                    "path": str(info.path),
                    "metadata": info.metadata,
                    "context_size": info.context_size
                }
                for alias, info in self.models.items()
            }
        }
        
        with open(session_file, 'w') as f:
            json.dump(session_data, f, indent=2)
        
        logger.info(f"Session saved to {session_file}")
    
    def load_session(self, session_file: Path) -> bool:
        """Load session from file"""
        try:
            with open(session_file, 'r') as f:
                session_data = json.load(f)
            
            # Register models
            for alias, model_data in session_data.get("models", {}).items():
                self.register_model(
                    alias=alias,
                    model_path=model_data["path"],
                    **model_data.get("metadata", {})
                )
                
                # Set context size
                if alias in self.models:
                    self.models[alias].context_size = model_data.get("context_size", 4096)
            
            # Set active model if it exists
            active_model = session_data.get("active_model")
            if active_model and active_model in self.models:
                self.active_model = active_model
            
            logger.info(f"Session loaded from {session_file}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load session: {e}")
            return False


# Convenience functions
_global_manager: Optional[MultiModelManager] = None

def get_model_manager() -> MultiModelManager:
    """Get the global model manager instance"""
    global _global_manager
    if _global_manager is None:
        _global_manager = MultiModelManager()
    return _global_manager

def register_model(alias: str, model_path: str, **metadata) -> bool:
    """Register a model with the global manager"""
    return get_model_manager().register_model(alias, model_path, **metadata)

def load_model(alias: str, background: bool = True, **load_params) -> bool:
    """Load a model with the global manager"""
    manager = get_model_manager()
    if background:
        return manager.load_model_background(alias)
    else:
        return manager.load_model_sync(alias, **load_params)

def switch_model(alias: str) -> bool:
    """Switch to a different model"""
    return get_model_manager().hot_swap_model(alias)

def generate(prompt: str, model: Optional[str] = None, **params) -> Optional[str]:
    """Generate text using the global manager"""
    return get_model_manager().generate_text(prompt, model, **params)

def cleanup_models():
    """Cleanup all models"""
    global _global_manager
    if _global_manager:
        _global_manager.cleanup()
        _global_manager = None