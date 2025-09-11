"""
BEAR AI Enhanced Local Inference Engine
Based on vLLM patterns with focus on high-performance offline processing

Architecture Features:
- Batch processing for concurrent requests
- Local GPU acceleration with memory optimization
- Request queue and scheduling system
- Streaming responses with async patterns
- Performance profiling and metrics
- Multi-model support with dynamic switching
- Local optimization and caching

@file vLLM-inspired local inference engine for BEAR AI
@version 2.0.0
"""

import asyncio
import threading
import time
import logging
import json
from concurrent.futures import ThreadPoolExecutor, Future
from typing import Dict, List, Optional, AsyncGenerator, Any, Callable, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
from pathlib import Path
import gc
import psutil
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class RequestPriority(Enum):
    """Request priority levels for scheduling"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


class EngineStatus(Enum):
    """Engine status states"""
    INITIALIZING = "initializing"
    READY = "ready"
    BUSY = "busy"
    ERROR = "error"
    SHUTDOWN = "shutdown"


@dataclass
class InferenceRequest:
    """Individual inference request"""
    request_id: str
    prompt: str
    max_tokens: int = 256
    temperature: float = 0.7
    top_p: float = 0.95
    top_k: int = 50
    stop_sequences: List[str] = field(default_factory=list)
    stream: bool = False
    priority: RequestPriority = RequestPriority.NORMAL
    model_id: Optional[str] = None
    timestamp: float = field(default_factory=time.time)
    context_data: Dict[str, Any] = field(default_factory=dict)
    
    # Performance tracking
    batch_id: Optional[str] = None
    queue_time: Optional[float] = None
    processing_start: Optional[float] = None
    processing_end: Optional[float] = None


@dataclass
class InferenceResponse:
    """Inference response with metadata"""
    request_id: str
    text: str
    tokens_generated: int
    finish_reason: str
    processing_time_ms: float
    queue_time_ms: float
    model_id: str
    batch_size: int = 1
    cache_hit: bool = False
    memory_usage_mb: float = 0.0


@dataclass
class BatchRequest:
    """Batch of requests for processing"""
    batch_id: str
    requests: List[InferenceRequest]
    priority: RequestPriority
    timestamp: float = field(default_factory=time.time)
    max_batch_size: int = 8
    timeout_seconds: float = 30.0


class ModelCacheEntry:
    """Cached model entry with metadata"""
    def __init__(self, model_id: str, model_instance: Any, load_time: float):
        self.model_id = model_id
        self.model_instance = model_instance
        self.load_time = load_time
        self.last_used = time.time()
        self.usage_count = 0
        self.memory_usage_mb = 0.0
        
    def mark_used(self):
        self.last_used = time.time()
        self.usage_count += 1


class GPUMemoryManager:
    """GPU memory optimization and management"""
    
    def __init__(self):
        self.gpu_available = False
        self.total_memory_mb = 0
        self.used_memory_mb = 0
        self.reserved_memory_mb = 0
        self._detect_gpu()
    
    def _detect_gpu(self):
        """Detect GPU capabilities"""
        try:
            import torch
            if torch.cuda.is_available():
                self.gpu_available = True
                self.total_memory_mb = torch.cuda.get_device_properties(0).total_memory / (1024**2)
                logger.info(f"GPU detected: {self.total_memory_mb:.0f}MB total memory")
            else:
                logger.info("No GPU detected, using CPU fallback")
        except ImportError:
            logger.info("PyTorch not available, using CPU fallback")
    
    def get_memory_stats(self) -> Dict[str, float]:
        """Get current memory statistics"""
        if not self.gpu_available:
            return {"gpu_available": False}
        
        try:
            import torch
            allocated = torch.cuda.memory_allocated() / (1024**2)
            cached = torch.cuda.memory_reserved() / (1024**2)
            
            return {
                "gpu_available": True,
                "total_mb": self.total_memory_mb,
                "allocated_mb": allocated,
                "cached_mb": cached,
                "free_mb": self.total_memory_mb - allocated,
                "utilization_percent": (allocated / self.total_memory_mb) * 100
            }
        except Exception as e:
            logger.warning(f"Failed to get GPU memory stats: {e}")
            return {"gpu_available": False, "error": str(e)}
    
    def optimize_memory(self):
        """Optimize GPU memory usage"""
        if not self.gpu_available:
            return
        
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
                logger.debug("GPU memory cache cleared")
        except Exception as e:
            logger.warning(f"Failed to optimize GPU memory: {e}")
    
    def can_load_model(self, estimated_size_mb: float) -> bool:
        """Check if we can load a model of given size"""
        if not self.gpu_available:
            return True  # CPU fallback
        
        stats = self.get_memory_stats()
        free_memory = stats.get("free_mb", 0)
        safety_margin = 500  # MB
        
        return free_memory > (estimated_size_mb + safety_margin)


class RequestQueue:
    """Priority-based request queue with batching"""
    
    def __init__(self, max_queue_size: int = 1000):
        self.max_queue_size = max_queue_size
        self._queues = {priority: deque() for priority in RequestPriority}
        self._pending_requests: Dict[str, InferenceRequest] = {}
        self._lock = threading.Lock()
        
    def enqueue(self, request: InferenceRequest) -> bool:
        """Add request to queue"""
        with self._lock:
            if len(self._pending_requests) >= self.max_queue_size:
                logger.warning("Request queue full, rejecting request")
                return False
            
            request.queue_time = time.time()
            self._queues[request.priority].append(request)
            self._pending_requests[request.request_id] = request
            return True
    
    def dequeue_batch(self, max_batch_size: int = 8) -> Optional[BatchRequest]:
        """Dequeue requests for batching"""
        with self._lock:
            batch_requests = []
            batch_priority = RequestPriority.LOW
            
            # Process by priority (highest first)
            for priority in sorted(RequestPriority, key=lambda x: x.value, reverse=True):
                queue = self._queues[priority]
                
                while queue and len(batch_requests) < max_batch_size:
                    request = queue.popleft()
                    if request.request_id in self._pending_requests:
                        batch_requests.append(request)
                        batch_priority = max(batch_priority, priority, key=lambda x: x.value)
                        del self._pending_requests[request.request_id]
                
                if batch_requests:
                    break
            
            if not batch_requests:
                return None
            
            batch_id = f"batch_{int(time.time() * 1000)}_{len(batch_requests)}"
            return BatchRequest(
                batch_id=batch_id,
                requests=batch_requests,
                priority=batch_priority,
                max_batch_size=max_batch_size
            )
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        with self._lock:
            stats = {
                "total_pending": len(self._pending_requests),
                "by_priority": {}
            }
            
            for priority, queue in self._queues.items():
                stats["by_priority"][priority.name] = len(queue)
            
            return stats


class ResponseCache:
    """Intelligent response caching system"""
    
    def __init__(self, max_cache_size: int = 1000):
        self.max_cache_size = max_cache_size
        self._cache: Dict[str, Tuple[InferenceResponse, float]] = {}
        self._access_times: Dict[str, float] = {}
        self._lock = threading.Lock()
    
    def _generate_cache_key(self, request: InferenceRequest) -> str:
        """Generate cache key from request"""
        key_data = {
            "prompt": request.prompt,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "top_p": request.top_p,
            "top_k": request.top_k,
            "model_id": request.model_id
        }
        return f"cache_{hash(json.dumps(key_data, sort_keys=True))}"
    
    def get(self, request: InferenceRequest) -> Optional[InferenceResponse]:
        """Get cached response if available"""
        cache_key = self._generate_cache_key(request)
        
        with self._lock:
            if cache_key in self._cache:
                response, timestamp = self._cache[cache_key]
                self._access_times[cache_key] = time.time()
                
                # Clone response with new request_id
                cached_response = InferenceResponse(
                    request_id=request.request_id,
                    text=response.text,
                    tokens_generated=response.tokens_generated,
                    finish_reason=response.finish_reason,
                    processing_time_ms=0.1,  # Cache hit is very fast
                    queue_time_ms=0.0,
                    model_id=response.model_id,
                    cache_hit=True
                )
                
                logger.debug(f"Cache hit for request {request.request_id}")
                return cached_response
        
        return None
    
    def put(self, request: InferenceRequest, response: InferenceResponse):
        """Cache response"""
        cache_key = self._generate_cache_key(request)
        
        with self._lock:
            # Remove oldest entries if cache is full
            while len(self._cache) >= self.max_cache_size:
                oldest_key = min(self._access_times.keys(), key=self._access_times.get)
                del self._cache[oldest_key]
                del self._access_times[oldest_key]
            
            self._cache[cache_key] = (response, time.time())
            self._access_times[cache_key] = time.time()
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            return {
                "cache_size": len(self._cache),
                "max_cache_size": self.max_cache_size,
                "cache_utilization": len(self._cache) / self.max_cache_size
            }


class PerformanceMonitor:
    """Real-time performance monitoring and profiling"""
    
    def __init__(self):
        self.metrics = defaultdict(list)
        self.start_time = time.time()
        self._lock = threading.Lock()
        self.max_history = 1000
    
    def record_request(self, request: InferenceRequest, response: InferenceResponse):
        """Record request metrics"""
        with self._lock:
            timestamp = time.time()
            
            metrics = {
                "timestamp": timestamp,
                "request_id": request.request_id,
                "processing_time_ms": response.processing_time_ms,
                "queue_time_ms": response.queue_time_ms,
                "tokens_generated": response.tokens_generated,
                "tokens_per_second": response.tokens_generated / (response.processing_time_ms / 1000) if response.processing_time_ms > 0 else 0,
                "model_id": response.model_id,
                "batch_size": response.batch_size,
                "cache_hit": response.cache_hit,
                "memory_usage_mb": response.memory_usage_mb
            }
            
            for key, value in metrics.items():
                self.metrics[key].append(value)
                if len(self.metrics[key]) > self.max_history:
                    self.metrics[key].pop(0)
    
    def get_performance_summary(self, window_minutes: int = 5) -> Dict[str, Any]:
        """Get performance summary for recent window"""
        with self._lock:
            cutoff_time = time.time() - (window_minutes * 60)
            
            recent_timestamps = [t for t in self.metrics["timestamp"] if t >= cutoff_time]
            if not recent_timestamps:
                return {"no_data": True}
            
            # Calculate metrics for recent window
            recent_indices = [i for i, t in enumerate(self.metrics["timestamp"]) if t >= cutoff_time]
            
            processing_times = [self.metrics["processing_time_ms"][i] for i in recent_indices]
            queue_times = [self.metrics["queue_time_ms"][i] for i in recent_indices]
            tokens_per_sec = [self.metrics["tokens_per_second"][i] for i in recent_indices if self.metrics["tokens_per_second"][i] > 0]
            cache_hits = [self.metrics["cache_hit"][i] for i in recent_indices]
            
            summary = {
                "window_minutes": window_minutes,
                "total_requests": len(recent_indices),
                "avg_processing_time_ms": sum(processing_times) / len(processing_times) if processing_times else 0,
                "avg_queue_time_ms": sum(queue_times) / len(queue_times) if queue_times else 0,
                "avg_tokens_per_second": sum(tokens_per_sec) / len(tokens_per_sec) if tokens_per_sec else 0,
                "cache_hit_rate": sum(cache_hits) / len(cache_hits) if cache_hits else 0,
                "requests_per_minute": len(recent_indices) / window_minutes if window_minutes > 0 else 0
            }
            
            if processing_times:
                sorted_times = sorted(processing_times)
                n = len(sorted_times)
                summary.update({
                    "p50_processing_time_ms": sorted_times[n // 2],
                    "p90_processing_time_ms": sorted_times[int(n * 0.9)],
                    "p99_processing_time_ms": sorted_times[int(n * 0.99)]
                })
            
            return summary


class VLLMLocalEngine:
    """Enhanced local inference engine based on vLLM patterns"""
    
    def __init__(self, 
                 max_concurrent_models: int = 2,
                 max_batch_size: int = 8,
                 max_queue_size: int = 1000,
                 enable_caching: bool = True,
                 cache_size: int = 1000):
        
        self.max_concurrent_models = max_concurrent_models
        self.max_batch_size = max_batch_size
        self.enable_caching = enable_caching
        
        # Core components
        self.gpu_manager = GPUMemoryManager()
        self.request_queue = RequestQueue(max_queue_size)
        self.response_cache = ResponseCache(cache_size) if enable_caching else None
        self.performance_monitor = PerformanceMonitor()
        
        # Model management
        self.loaded_models: Dict[str, ModelCacheEntry] = {}
        self.model_configs: Dict[str, Dict[str, Any]] = {}
        self.active_model_id: Optional[str] = None
        
        # Async processing
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.processing_thread: Optional[threading.Thread] = None
        self.running = False
        self.status = EngineStatus.INITIALIZING
        
        # Streaming support
        self.active_streams: Dict[str, asyncio.Queue] = {}
        
        logger.info(f"VLLMLocalEngine initialized with max_batch_size={max_batch_size}")
    
    async def initialize(self):
        """Initialize the engine"""
        try:
            self.status = EngineStatus.INITIALIZING
            
            # Start background processing
            self.running = True
            self.processing_thread = threading.Thread(target=self._process_requests_loop, daemon=True)
            self.processing_thread.start()
            
            self.status = EngineStatus.READY
            logger.info("VLLMLocalEngine initialized successfully")
            
        except Exception as e:
            self.status = EngineStatus.ERROR
            logger.error(f"Failed to initialize engine: {e}")
            raise
    
    async def register_model(self, model_id: str, model_path: str, **config) -> bool:
        """Register a model for use"""
        try:
            model_config = {
                "model_path": model_path,
                "n_ctx": config.get("n_ctx", 4096),
                "n_gpu_layers": config.get("n_gpu_layers", -1 if self.gpu_manager.gpu_available else 0),
                "n_batch": config.get("n_batch", 512),
                "temperature": config.get("temperature", 0.7),
                "top_p": config.get("top_p", 0.95),
                "top_k": config.get("top_k", 50),
                **config
            }
            
            # Validate model file exists
            if not Path(model_path).exists():
                logger.error(f"Model file not found: {model_path}")
                return False
            
            self.model_configs[model_id] = model_config
            logger.info(f"Registered model '{model_id}' from {model_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to register model '{model_id}': {e}")
            return False
    
    async def load_model(self, model_id: str, preload: bool = True) -> bool:
        """Load a model into memory"""
        if model_id not in self.model_configs:
            logger.error(f"Model '{model_id}' not registered")
            return False
        
        if model_id in self.loaded_models:
            logger.info(f"Model '{model_id}' already loaded")
            self.loaded_models[model_id].mark_used()
            return True
        
        # Check memory constraints
        config = self.model_configs[model_id]
        estimated_size = self._estimate_model_size(config["model_path"])
        
        if not self.gpu_manager.can_load_model(estimated_size):
            # Try to free up memory
            self._unload_least_used_model()
            if not self.gpu_manager.can_load_model(estimated_size):
                logger.error(f"Insufficient memory to load model '{model_id}'")
                return False
        
        try:
            start_time = time.time()
            
            # Load model using llama-cpp-python
            from llama_cpp import Llama
            
            model_instance = Llama(
                model_path=config["model_path"],
                n_ctx=config["n_ctx"],
                n_gpu_layers=config["n_gpu_layers"],
                n_batch=config["n_batch"],
                verbose=False
            )
            
            load_time = time.time() - start_time
            
            # Create cache entry
            cache_entry = ModelCacheEntry(model_id, model_instance, load_time)
            cache_entry.memory_usage_mb = estimated_size
            self.loaded_models[model_id] = cache_entry
            
            # Set as active if no active model
            if not self.active_model_id:
                self.active_model_id = model_id
            
            logger.info(f"Model '{model_id}' loaded in {load_time:.2f}s")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load model '{model_id}': {e}")
            return False
    
    async def generate_async(self, request: InferenceRequest) -> InferenceResponse:
        """Generate response asynchronously"""
        # Check cache first
        if self.response_cache:
            cached_response = self.response_cache.get(request)
            if cached_response:
                self.performance_monitor.record_request(request, cached_response)
                return cached_response
        
        # Queue request
        if not self.request_queue.enqueue(request):
            raise Exception("Request queue full")
        
        # Wait for response (in production, use proper async coordination)
        future = Future()
        request.context_data["future"] = future
        
        try:
            response = future.result(timeout=30.0)
            
            # Cache response
            if self.response_cache and not response.cache_hit:
                self.response_cache.put(request, response)
            
            self.performance_monitor.record_request(request, response)
            return response
            
        except Exception as e:
            logger.error(f"Request {request.request_id} failed: {e}")
            raise
    
    async def generate_stream(self, request: InferenceRequest) -> AsyncGenerator[str, None]:
        """Generate streaming response"""
        request.stream = True
        
        # Create stream queue
        stream_queue = asyncio.Queue()
        self.active_streams[request.request_id] = stream_queue
        
        try:
            # Queue request
            if not self.request_queue.enqueue(request):
                raise Exception("Request queue full")
            
            # Yield tokens as they arrive
            while True:
                try:
                    token = await asyncio.wait_for(stream_queue.get(), timeout=1.0)
                    if token is None:  # End of stream marker
                        break
                    yield token
                except asyncio.TimeoutError:
                    continue
                    
        finally:
            # Cleanup
            if request.request_id in self.active_streams:
                del self.active_streams[request.request_id]
    
    def _process_requests_loop(self):
        """Background request processing loop"""
        while self.running:
            try:
                # Get batch of requests
                batch = self.request_queue.dequeue_batch(self.max_batch_size)
                if not batch:
                    time.sleep(0.01)  # Small sleep to prevent busy waiting
                    continue
                
                # Process batch
                self._process_batch(batch)
                
            except Exception as e:
                logger.error(f"Error in processing loop: {e}")
                time.sleep(0.1)
    
    def _process_batch(self, batch: BatchRequest):
        """Process a batch of requests"""
        start_time = time.time()
        
        # Ensure model is loaded
        model_id = batch.requests[0].model_id or self.active_model_id
        if not model_id or model_id not in self.loaded_models:
            # Load default model or handle error
            logger.error(f"No model available for batch {batch.batch_id}")
            return
        
        model_entry = self.loaded_models[model_id]
        model_instance = model_entry.model_instance
        
        try:
            # Process each request in the batch
            for request in batch.requests:
                self._process_single_request(request, model_entry, start_time)
                
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
    
    def _process_single_request(self, request: InferenceRequest, model_entry: ModelCacheEntry, batch_start_time: float):
        """Process individual request"""
        try:
            request.processing_start = time.time()
            queue_time_ms = (request.processing_start - request.queue_time) * 1000 if request.queue_time else 0
            
            # Generate response
            if request.stream:
                self._process_streaming_request(request, model_entry)
            else:
                self._process_regular_request(request, model_entry, queue_time_ms)
                
        except Exception as e:
            logger.error(f"Request {request.request_id} processing failed: {e}")
    
    def _process_regular_request(self, request: InferenceRequest, model_entry: ModelCacheEntry, queue_time_ms: float):
        """Process non-streaming request"""
        try:
            # Generate text
            response_data = model_entry.model_instance(
                request.prompt,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                top_k=request.top_k,
                stop=request.stop_sequences,
                echo=False
            )
            
            processing_end = time.time()
            processing_time_ms = (processing_end - request.processing_start) * 1000
            
            # Extract response text
            if isinstance(response_data, dict) and "choices" in response_data:
                text = response_data["choices"][0]["text"]
                finish_reason = response_data["choices"][0].get("finish_reason", "stop")
                tokens_generated = response_data.get("usage", {}).get("completion_tokens", len(text.split()))
            else:
                text = str(response_data)
                finish_reason = "stop"
                tokens_generated = len(text.split())
            
            # Create response
            response = InferenceResponse(
                request_id=request.request_id,
                text=text,
                tokens_generated=tokens_generated,
                finish_reason=finish_reason,
                processing_time_ms=processing_time_ms,
                queue_time_ms=queue_time_ms,
                model_id=model_entry.model_id,
                memory_usage_mb=model_entry.memory_usage_mb
            )
            
            # Return response via future if available
            future = request.context_data.get("future")
            if future:
                future.set_result(response)
            
            model_entry.mark_used()
            
        except Exception as e:
            logger.error(f"Regular request processing failed: {e}")
            future = request.context_data.get("future")
            if future:
                future.set_exception(e)
    
    def _process_streaming_request(self, request: InferenceRequest, model_entry: ModelCacheEntry):
        """Process streaming request"""
        try:
            stream_queue = self.active_streams.get(request.request_id)
            if not stream_queue:
                return
            
            # Generate streaming response
            stream = model_entry.model_instance(
                request.prompt,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                top_k=request.top_k,
                stop=request.stop_sequences,
                stream=True
            )
            
            for chunk in stream:
                if isinstance(chunk, dict) and "choices" in chunk:
                    delta = chunk["choices"][0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        asyncio.create_task(stream_queue.put(content))
            
            # End of stream
            asyncio.create_task(stream_queue.put(None))
            model_entry.mark_used()
            
        except Exception as e:
            logger.error(f"Streaming request processing failed: {e}")
    
    def _estimate_model_size(self, model_path: str) -> float:
        """Estimate model memory usage in MB"""
        try:
            file_size = Path(model_path).stat().st_size
            # Rough estimate: file size + 20% overhead
            return (file_size / (1024**2)) * 1.2
        except:
            return 1000  # Default estimate
    
    def _unload_least_used_model(self):
        """Unload the least recently used model"""
        if not self.loaded_models:
            return
        
        # Find LRU model (excluding active model)
        lru_model_id = None
        lru_time = float('inf')
        
        for model_id, entry in self.loaded_models.items():
            if model_id != self.active_model_id and entry.last_used < lru_time:
                lru_time = entry.last_used
                lru_model_id = model_id
        
        if lru_model_id:
            logger.info(f"Unloading LRU model: {lru_model_id}")
            del self.loaded_models[lru_model_id]
            self.gpu_manager.optimize_memory()
    
    def get_engine_stats(self) -> Dict[str, Any]:
        """Get comprehensive engine statistics"""
        queue_stats = self.request_queue.get_queue_stats()
        gpu_stats = self.gpu_manager.get_memory_stats()
        performance_stats = self.performance_monitor.get_performance_summary()
        
        loaded_models_info = {
            model_id: {
                "last_used": entry.last_used,
                "usage_count": entry.usage_count,
                "memory_usage_mb": entry.memory_usage_mb,
                "load_time": entry.load_time
            }
            for model_id, entry in self.loaded_models.items()
        }
        
        stats = {
            "status": self.status.value,
            "active_model": self.active_model_id,
            "loaded_models": loaded_models_info,
            "queue": queue_stats,
            "gpu": gpu_stats,
            "performance": performance_stats,
            "engine": {
                "max_batch_size": self.max_batch_size,
                "max_concurrent_models": self.max_concurrent_models,
                "caching_enabled": self.enable_caching
            }
        }
        
        if self.response_cache:
            stats["cache"] = self.response_cache.get_cache_stats()
        
        return stats
    
    async def shutdown(self):
        """Shutdown the engine gracefully"""
        logger.info("Shutting down VLLMLocalEngine...")
        
        self.status = EngineStatus.SHUTDOWN
        self.running = False
        
        if self.processing_thread:
            self.processing_thread.join(timeout=5.0)
        
        # Cleanup models
        for model_id in list(self.loaded_models.keys()):
            del self.loaded_models[model_id]
        
        self.gpu_manager.optimize_memory()
        
        if self.executor:
            self.executor.shutdown(wait=True)
        
        logger.info("VLLMLocalEngine shutdown complete")


# Factory function for easy instantiation
def create_local_engine(**kwargs) -> VLLMLocalEngine:
    """Create and initialize a local inference engine"""
    engine = VLLMLocalEngine(**kwargs)
    return engine


# Global engine instance for convenience
_global_engine: Optional[VLLMLocalEngine] = None

async def get_global_engine(**kwargs) -> VLLMLocalEngine:
    """Get or create global engine instance"""
    global _global_engine
    if _global_engine is None:
        _global_engine = create_local_engine(**kwargs)
        await _global_engine.initialize()
    return _global_engine