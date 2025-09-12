"""
Unified Local Inference Engine
Integration layer combining all optimization engines for maximum performance

Features:
- Unified API for all inference operations
- Automatic optimization and caching
- Multi-model coordination
- Real-time performance monitoring
- Dynamic scaling and resource management
- Fault tolerance and recovery

@file Unified inference engine for BEAR AI
@version 2.0.0
"""

import asyncio
import logging
import time
import threading
from typing import Dict, List, Optional, Any, AsyncGenerator, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import uuid

from .vllm_local_engine import VLLMLocalEngine, InferenceRequest, InferenceResponse, RequestPriority
from .streaming_engine import StreamingEngine, StreamType
from .optimization_engine import OptimizationEngine

logger = logging.getLogger(__name__)


class EngineMode(Enum):
    """Engine operation modes"""
    HIGH_PERFORMANCE = "high_performance"
    BALANCED = "balanced"
    MEMORY_OPTIMIZED = "memory_optimized"
    BATCH_OPTIMIZED = "batch_optimized"


class SystemStatus(Enum):
    """Overall system status"""
    INITIALIZING = "initializing"
    READY = "ready"
    BUSY = "busy"
    OVERLOADED = "overloaded"
    ERROR = "error"
    MAINTENANCE = "maintenance"
    SHUTDOWN = "shutdown"


@dataclass
class EngineConfig:
    """Configuration for the unified engine"""
    mode: EngineMode = EngineMode.BALANCED
    max_concurrent_models: int = 2
    max_batch_size: int = 8
    max_queue_size: int = 1000
    cache_size_mb: int = 2048
    memory_pool_mb: int = 1024
    kv_cache_mb: int = 1024
    enable_streaming: bool = True
    enable_caching: bool = True
    enable_optimization: bool = True
    auto_optimization: bool = True
    performance_monitoring: bool = True
    
    # Advanced settings
    queue_timeout_seconds: float = 30.0
    stream_timeout_seconds: float = 300.0
    cleanup_interval_seconds: float = 60.0
    metrics_update_interval: float = 10.0


@dataclass
class SystemMetrics:
    """Comprehensive system metrics"""
    timestamp: float = field(default_factory=time.time)
    
    # Performance metrics
    requests_per_second: float = 0.0
    tokens_per_second: float = 0.0
    average_latency_ms: float = 0.0
    queue_depth: int = 0
    cache_hit_rate: float = 0.0
    
    # Resource metrics
    memory_usage_mb: float = 0.0
    gpu_utilization_percent: float = 0.0
    cpu_utilization_percent: float = 0.0
    
    # Model metrics
    active_models: int = 0
    loaded_models: List[str] = field(default_factory=list)
    model_switch_count: int = 0
    
    # System health
    status: SystemStatus = SystemStatus.READY
    error_rate: float = 0.0
    uptime_seconds: float = 0.0


class UnifiedInferenceEngine:
    """Unified inference engine combining all optimization components"""
    
    def __init__(self, config: EngineConfig = None):
        self.config = config or EngineConfig()
        self.status = SystemStatus.INITIALIZING
        self.start_time = time.time()
        
        # Core engines
        self.vllm_engine: Optional[VLLMLocalEngine] = None
        self.streaming_engine: Optional[StreamingEngine] = None
        self.optimization_engine: Optional[OptimizationEngine] = None
        
        # System state
        self.active_requests: Dict[str, InferenceRequest] = {}
        self.request_history: List[Dict[str, Any]] = []
        self.error_count = 0
        self.total_requests = 0
        
        # Background tasks
        self.background_tasks: List[asyncio.Task] = []
        self.running = False
        
        # Callbacks
        self.request_callbacks: List[Callable] = []
        self.metrics_callbacks: List[Callable] = []
        
        logger.info(f"Unified engine initialized with mode: {self.config.mode.value}")
    
    async def initialize(self):
        """Initialize all engine components"""
        try:
            self.status = SystemStatus.INITIALIZING
            logger.info("Initializing unified inference engine...")
            
            # Initialize optimization engine first
            if self.config.enable_optimization:
                opt_config = {
                    "memory_pool_mb": self.config.memory_pool_mb,
                    "cache_size_mb": self.config.cache_size_mb,
                    "kv_cache_mb": self.config.kv_cache_mb
                }
                self.optimization_engine = OptimizationEngine(opt_config)
                logger.info("Optimization engine initialized")
            
            # Initialize VLLM engine
            vllm_config = {
                "max_concurrent_models": self.config.max_concurrent_models,
                "max_batch_size": self.config.max_batch_size,
                "max_queue_size": self.config.max_queue_size,
                "enable_caching": self.config.enable_caching,
                "cache_size": self.config.cache_size_mb
            }
            self.vllm_engine = VLLMLocalEngine(**vllm_config)
            await self.vllm_engine.initialize()
            logger.info("VLLM engine initialized")
            
            # Initialize streaming engine
            if self.config.enable_streaming:
                streaming_config = {
                    "max_concurrent_streams": self.config.max_queue_size
                }
                self.streaming_engine = StreamingEngine(**streaming_config)
                logger.info("Streaming engine initialized")
            
            # Apply mode-specific optimizations
            await self._apply_mode_optimizations()
            
            # Start background tasks
            self.running = True
            await self._start_background_tasks()
            
            self.status = SystemStatus.READY
            logger.info("Unified inference engine ready")
            
        except Exception as e:
            self.status = SystemStatus.ERROR
            logger.error(f"Failed to initialize unified engine: {e}")
            raise
    
    async def _apply_mode_optimizations(self):
        """Apply optimizations based on engine mode"""
        if not self.optimization_engine:
            return
        
        mode = self.config.mode
        
        if mode == EngineMode.HIGH_PERFORMANCE:
            # Optimize for maximum throughput
            self.config.max_batch_size = min(16, self.config.max_batch_size * 2)
            logger.info("Applied high-performance optimizations")
            
        elif mode == EngineMode.MEMORY_OPTIMIZED:
            # Optimize for low memory usage
            self.config.max_concurrent_models = 1
            self.config.cache_size_mb = int(self.config.cache_size_mb * 0.5)
            logger.info("Applied memory-optimized settings")
            
        elif mode == EngineMode.BATCH_OPTIMIZED:
            # Optimize for batch processing
            self.config.max_batch_size = min(32, self.config.max_batch_size * 4)
            self.config.queue_timeout_seconds = 60.0
            logger.info("Applied batch-optimized settings")
    
    async def _start_background_tasks(self):
        """Start background monitoring and optimization tasks"""
        if self.config.performance_monitoring:
            self.background_tasks.append(
                asyncio.create_task(self._metrics_collection_loop())
            )
        
        if self.config.auto_optimization:
            self.background_tasks.append(
                asyncio.create_task(self._auto_optimization_loop())
            )
        
        self.background_tasks.append(
            asyncio.create_task(self._cleanup_loop())
        )
        
        logger.info(f"Started {len(self.background_tasks)} background tasks")
    
    async def _metrics_collection_loop(self):
        """Background metrics collection"""
        while self.running:
            try:
                metrics = await self._collect_system_metrics()
                
                # Call metrics callbacks
                for callback in self.metrics_callbacks:
                    try:
                        await callback(metrics)
                    except Exception as e:
                        logger.warning(f"Metrics callback error: {e}")
                
                await asyncio.sleep(self.config.metrics_update_interval)
                
            except Exception as e:
                logger.error(f"Metrics collection error: {e}")
                await asyncio.sleep(10)
    
    async def _auto_optimization_loop(self):
        """Background auto-optimization"""
        while self.running:
            try:
                await self._run_auto_optimizations()
                await asyncio.sleep(self.config.cleanup_interval_seconds)
                
            except Exception as e:
                logger.error(f"Auto-optimization error: {e}")
                await asyncio.sleep(30)
    
    async def _cleanup_loop(self):
        """Background cleanup tasks"""
        while self.running:
            try:
                # Clean up completed requests
                await self._cleanup_completed_requests()
                
                # Clean up expired cache entries
                if self.optimization_engine:
                    self.optimization_engine.cache.cleanup_expired()
                
                await asyncio.sleep(self.config.cleanup_interval_seconds)
                
            except Exception as e:
                logger.error(f"Cleanup loop error: {e}")
                await asyncio.sleep(10)
    
    async def register_model(self, model_id: str, model_path: str, **config) -> bool:
        """Register a model for inference"""
        if not self.vllm_engine:
            raise RuntimeError("Engine not initialized")
        
        # Apply optimizations to model config
        if self.optimization_engine:
            optimized_config = self.optimization_engine.optimize_request({
                "model_id": model_id,
                "max_tokens": config.get("max_tokens", 512),
                "batch_size": 1
            })
            
            # Merge optimization recommendations
            config.update(optimized_config.get("threading", {}))
            config.update(optimized_config.get("memory_allocation", {}))
        
        success = await self.vllm_engine.register_model(model_id, model_path, **config)
        
        if success:
            logger.info(f"Model '{model_id}' registered successfully")
        
        return success
    
    async def load_model(self, model_id: str, preload: bool = True) -> bool:
        """Load a model into memory"""
        if not self.vllm_engine:
            raise RuntimeError("Engine not initialized")
        
        success = await self.vllm_engine.load_model(model_id, preload)
        
        if success:
            logger.info(f"Model '{model_id}' loaded successfully")
        
        return success
    
    async def generate(self, prompt: str, model_id: Optional[str] = None, 
                      **kwargs) -> InferenceResponse:
        """Generate text response"""
        request_id = str(uuid.uuid4())
        
        # Create inference request
        request = InferenceRequest(
            request_id=request_id,
            prompt=prompt,
            model_id=model_id,
            max_tokens=kwargs.get("max_tokens", 256),
            temperature=kwargs.get("temperature", 0.7),
            top_p=kwargs.get("top_p", 0.95),
            top_k=kwargs.get("top_k", 50),
            stop_sequences=kwargs.get("stop_sequences", []),
            priority=kwargs.get("priority", RequestPriority.NORMAL)
        )
        
        # Add to active requests
        self.active_requests[request_id] = request
        self.total_requests += 1
        
        try:
            # Check cache first
            cache_key = self._generate_cache_key(request)
            if self.optimization_engine and self.config.enable_caching:
                cached_response = self.optimization_engine.get_cached_result(cache_key)
                if cached_response:
                    logger.debug(f"Cache hit for request {request_id}")
                    cached_response.request_id = request_id
                    return cached_response
            
            # Generate response
            response = await self.vllm_engine.generate_async(request)
            
            # Cache response
            if self.optimization_engine and self.config.enable_caching:
                self.optimization_engine.cache_result(cache_key, response, ttl_seconds=3600)
            
            # Record metrics
            self._record_request_completion(request, response)
            
            return response
            
        except Exception as e:
            self.error_count += 1
            logger.error(f"Generation failed for request {request_id}: {e}")
            raise
        finally:
            # Remove from active requests
            if request_id in self.active_requests:
                del self.active_requests[request_id]
    
    async def generate_stream(self, prompt: str, model_id: Optional[str] = None,
                            stream_type: str = "internal", **kwargs) -> AsyncGenerator[str, None]:
        """Generate streaming text response"""
        if not self.config.enable_streaming or not self.streaming_engine:
            raise RuntimeError("Streaming not enabled")
        
        request_id = str(uuid.uuid4())
        
        # Create inference request
        request = InferenceRequest(
            request_id=request_id,
            prompt=prompt,
            model_id=model_id,
            stream=True,
            max_tokens=kwargs.get("max_tokens", 256),
            temperature=kwargs.get("temperature", 0.7),
            top_p=kwargs.get("top_p", 0.95),
            top_k=kwargs.get("top_k", 50),
            stop_sequences=kwargs.get("stop_sequences", []),
            priority=kwargs.get("priority", RequestPriority.NORMAL)
        )
        
        # Create streaming connection
        if stream_type == "internal":
            connection_id = await self.streaming_engine.create_internal_stream()
        else:
            raise ValueError(f"Unsupported stream type: {stream_type}")
        
        self.active_requests[request_id] = request
        self.total_requests += 1
        
        try:
            # Start streaming in background
            stream_task = asyncio.create_task(
                self._handle_streaming_request(request, connection_id)
            )
            
            # Yield tokens from stream
            async for token in self.streaming_engine.get_internal_stream(connection_id):
                if token and token.token:
                    yield token.token
            
            # Wait for streaming to complete
            await stream_task
            
        except Exception as e:
            self.error_count += 1
            logger.error(f"Streaming failed for request {request_id}: {e}")
            raise
        finally:
            # Cleanup
            if request_id in self.active_requests:
                del self.active_requests[request_id]
            
            await self.streaming_engine.close_stream(connection_id)
    
    async def _handle_streaming_request(self, request: InferenceRequest, connection_id: str):
        """Handle streaming request processing"""
        try:
            # Generate streaming response
            stream = self.vllm_engine.generate_stream(request)
            
            # Stream to connection
            await self.streaming_engine.stream_tokens(
                connection_id, stream, request.request_id, 
                request.model_id or "default"
            )
            
        except Exception as e:
            logger.error(f"Streaming request handling failed: {e}")
            raise
    
    def _generate_cache_key(self, request: InferenceRequest) -> str:
        """Generate cache key for request"""
        key_data = {
            "prompt": request.prompt,
            "model_id": request.model_id,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "top_p": request.top_p,
            "top_k": request.top_k
        }
        
        import hashlib
        import json
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def _record_request_completion(self, request: InferenceRequest, response: InferenceResponse):
        """Record request completion for metrics"""
        completion_data = {
            "request_id": request.request_id,
            "timestamp": time.time(),
            "processing_time_ms": response.processing_time_ms,
            "queue_time_ms": response.queue_time_ms,
            "tokens_generated": response.tokens_generated,
            "model_id": response.model_id,
            "cache_hit": response.cache_hit
        }
        
        self.request_history.append(completion_data)
        
        # Keep only recent history
        if len(self.request_history) > 1000:
            self.request_history = self.request_history[-500:]
    
    async def _collect_system_metrics(self) -> SystemMetrics:
        """Collect comprehensive system metrics"""
        current_time = time.time()
        uptime = current_time - self.start_time
        
        # Calculate request metrics
        recent_requests = [
            req for req in self.request_history
            if current_time - req["timestamp"] < 60  # Last minute
        ]
        
        rps = len(recent_requests) / 60 if recent_requests else 0
        avg_latency = (
            sum(req["processing_time_ms"] for req in recent_requests) / len(recent_requests)
            if recent_requests else 0
        )
        
        cache_hits = sum(1 for req in recent_requests if req.get("cache_hit", False))
        cache_hit_rate = cache_hits / len(recent_requests) if recent_requests else 0
        
        # Get engine stats
        vllm_stats = self.vllm_engine.get_engine_stats() if self.vllm_engine else {}
        streaming_stats = self.streaming_engine.get_stream_stats() if self.streaming_engine else {}
        opt_stats = self.optimization_engine.get_comprehensive_stats() if self.optimization_engine else {}
        
        return SystemMetrics(
            timestamp=current_time,
            requests_per_second=rps,
            tokens_per_second=streaming_stats.get("tokens_per_second_avg", 0),
            average_latency_ms=avg_latency,
            queue_depth=len(self.active_requests),
            cache_hit_rate=cache_hit_rate,
            memory_usage_mb=opt_stats.get("memory_pool", {}).get("total_allocated_mb", 0),
            gpu_utilization_percent=vllm_stats.get("gpu", {}).get("utilization_percent", 0),
            active_models=len(vllm_stats.get("loaded_models", {})),
            loaded_models=list(vllm_stats.get("loaded_models", {}).keys()),
            status=self.status,
            error_rate=self.error_count / self.total_requests if self.total_requests > 0 else 0,
            uptime_seconds=uptime
        )
    
    async def _run_auto_optimizations(self):
        """Run automatic optimizations based on current metrics"""
        if not self.optimization_engine:
            return
        
        metrics = await self._collect_system_metrics()
        
        # Optimize based on queue depth
        if metrics.queue_depth > self.config.max_batch_size * 2:
            logger.info("High queue depth detected, considering batch size increase")
            # Could implement dynamic batch size adjustment here
        
        # Optimize based on cache hit rate
        if metrics.cache_hit_rate < 0.1 and len(self.request_history) > 100:
            logger.info("Low cache hit rate, considering cache size increase")
            # Could implement dynamic cache size adjustment here
        
        # Optimize based on error rate
        if metrics.error_rate > 0.05:  # 5% error rate
            logger.warning(f"High error rate detected: {metrics.error_rate:.2%}")
            # Could implement error recovery mechanisms here
    
    async def _cleanup_completed_requests(self):
        """Clean up completed request data"""
        current_time = time.time()
        
        # Remove old request history
        cutoff_time = current_time - 3600  # Keep 1 hour of history
        self.request_history = [
            req for req in self.request_history
            if req["timestamp"] > cutoff_time
        ]
    
    def add_request_callback(self, callback: Callable):
        """Add callback for request events"""
        self.request_callbacks.append(callback)
    
    def add_metrics_callback(self, callback: Callable):
        """Add callback for metrics updates"""
        self.metrics_callbacks.append(callback)
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        metrics = await self._collect_system_metrics()
        
        status = {
            "status": self.status.value,
            "uptime_seconds": time.time() - self.start_time,
            "config": {
                "mode": self.config.mode.value,
                "max_concurrent_models": self.config.max_concurrent_models,
                "max_batch_size": self.config.max_batch_size,
                "enable_caching": self.config.enable_caching,
                "enable_streaming": self.config.enable_streaming
            },
            "metrics": {
                "requests_per_second": metrics.requests_per_second,
                "tokens_per_second": metrics.tokens_per_second,
                "average_latency_ms": metrics.average_latency_ms,
                "queue_depth": metrics.queue_depth,
                "cache_hit_rate": metrics.cache_hit_rate,
                "error_rate": metrics.error_rate
            },
            "resources": {
                "memory_usage_mb": metrics.memory_usage_mb,
                "gpu_utilization_percent": metrics.gpu_utilization_percent,
                "active_models": metrics.active_models,
                "loaded_models": metrics.loaded_models
            }
        }
        
        # Add engine-specific stats
        if self.vllm_engine:
            status["vllm_engine"] = self.vllm_engine.get_engine_stats()
        
        if self.streaming_engine:
            status["streaming_engine"] = self.streaming_engine.get_stream_stats()
        
        if self.optimization_engine:
            status["optimization_engine"] = self.optimization_engine.get_comprehensive_stats()
        
        return status
    
    async def shutdown(self):
        """Shutdown the unified engine gracefully"""
        logger.info("Shutting down unified inference engine...")
        
        self.status = SystemStatus.SHUTDOWN
        self.running = False
        
        # Cancel background tasks
        for task in self.background_tasks:
            task.cancel()
        
        if self.background_tasks:
            await asyncio.gather(*self.background_tasks, return_exceptions=True)
        
        # Shutdown engines
        if self.vllm_engine:
            await self.vllm_engine.shutdown()
        
        if self.streaming_engine:
            await self.streaming_engine.shutdown()
        
        if self.optimization_engine:
            self.optimization_engine.shutdown()
        
        logger.info("Unified inference engine shutdown complete")


# Factory functions
def create_engine(mode: EngineMode = EngineMode.BALANCED, **kwargs) -> UnifiedInferenceEngine:
    """Create unified inference engine with specified mode"""
    config = EngineConfig(mode=mode, **kwargs)
    return UnifiedInferenceEngine(config)


def create_high_performance_engine(**kwargs) -> UnifiedInferenceEngine:
    """Create engine optimized for high performance"""
    return create_engine(EngineMode.HIGH_PERFORMANCE, **kwargs)


def create_memory_optimized_engine(**kwargs) -> UnifiedInferenceEngine:
    """Create engine optimized for memory usage"""
    return create_engine(EngineMode.MEMORY_OPTIMIZED, **kwargs)


def create_batch_optimized_engine(**kwargs) -> UnifiedInferenceEngine:
    """Create engine optimized for batch processing"""
    return create_engine(EngineMode.BATCH_OPTIMIZED, **kwargs)


# Global engine instance
_global_unified_engine: Optional[UnifiedInferenceEngine] = None

async def get_global_engine(**kwargs) -> UnifiedInferenceEngine:
    """Get or create global unified engine"""
    global _global_unified_engine
    if _global_unified_engine is None:
        _global_unified_engine = create_engine(**kwargs)
        await _global_unified_engine.initialize()
    return _global_unified_engine