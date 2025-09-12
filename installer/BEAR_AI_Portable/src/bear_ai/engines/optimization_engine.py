"""
Local Optimization and Caching Engine
Advanced optimization techniques for maximum local inference performance

Features:
- Intelligent caching with LRU and frequency-based eviction
- Model quantization and optimization
- Memory pool management
- KV cache optimization
- Batch optimization
- Hardware-specific optimizations
- Dynamic context length adjustment

@file Optimization engine for BEAR AI local inference
@version 2.0.0
"""

import os
import time
import logging
import pickle
import hashlib
import threading
import json
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, OrderedDict
from pathlib import Path
import gc
import psutil

logger = logging.getLogger(__name__)


class OptimizationType(Enum):
    """Types of optimizations available"""
    QUANTIZATION = "quantization"
    KV_CACHE = "kv_cache"
    CONTEXT_COMPRESSION = "context_compression"
    BATCH_OPTIMIZATION = "batch_optimization"
    MEMORY_POOLING = "memory_pooling"
    HARDWARE_SPECIFIC = "hardware_specific"


class CacheLevel(Enum):
    """Cache priority levels"""
    L1_HOT = 1      # Recently and frequently accessed
    L2_WARM = 2     # Moderately accessed
    L3_COLD = 3     # Infrequently accessed
    L4_ARCHIVE = 4  # Rarely accessed, candidates for eviction


@dataclass
class CacheEntry:
    """Cache entry with metadata"""
    key: str
    data: Any
    size_bytes: int
    access_count: int = 0
    last_access: float = field(default_factory=time.time)
    creation_time: float = field(default_factory=time.time)
    cache_level: CacheLevel = CacheLevel.L3_COLD
    expiry_time: Optional[float] = None
    tags: List[str] = field(default_factory=list)
    
    def mark_accessed(self):
        """Mark entry as accessed"""
        self.access_count += 1
        self.last_access = time.time()
        
        # Promote cache level based on access patterns
        if self.access_count > 10:
            self.cache_level = CacheLevel.L1_HOT
        elif self.access_count > 5:
            self.cache_level = CacheLevel.L2_WARM
        else:
            self.cache_level = CacheLevel.L3_COLD
    
    def is_expired(self) -> bool:
        """Check if entry has expired"""
        if self.expiry_time is None:
            return False
        return time.time() > self.expiry_time
    
    def age_seconds(self) -> float:
        """Get age of entry in seconds"""
        return time.time() - self.creation_time


class MemoryPool:
    """Memory pool for efficient allocation and deallocation"""
    
    def __init__(self, initial_size_mb: int = 1024):
        self.pools: Dict[int, List[memoryview]] = defaultdict(list)
        self.allocated_blocks: Dict[int, memoryview] = {}
        self.total_allocated = 0
        self.max_size_mb = initial_size_mb
        self._lock = threading.Lock()
        
    def allocate(self, size_bytes: int, block_id: Optional[int] = None) -> Tuple[int, memoryview]:
        """Allocate memory block"""
        with self._lock:
            # Round up to nearest power of 2 for efficient pooling
            pool_size = 1 << (size_bytes - 1).bit_length()
            
            if block_id is None:
                block_id = hash((time.time(), size_bytes)) % (2**31)
            
            # Try to reuse from pool
            if self.pools[pool_size]:
                block = self.pools[pool_size].pop()
                self.allocated_blocks[block_id] = block
                return block_id, block
            
            # Check memory limits
            size_mb = pool_size / (1024 * 1024)
            if self.total_allocated + size_mb > self.max_size_mb:
                self._cleanup_old_blocks()
                
                if self.total_allocated + size_mb > self.max_size_mb:
                    raise MemoryError(f"Memory pool exhausted: {self.total_allocated:.1f}MB")
            
            # Allocate new block
            block = memoryview(bytearray(pool_size))
            self.allocated_blocks[block_id] = block
            self.total_allocated += size_mb
            
            return block_id, block
    
    def deallocate(self, block_id: int):
        """Deallocate memory block"""
        with self._lock:
            if block_id in self.allocated_blocks:
                block = self.allocated_blocks.pop(block_id)
                pool_size = len(block)
                
                # Return to pool for reuse
                if len(self.pools[pool_size]) < 10:  # Limit pool size
                    self.pools[pool_size].append(block)
                else:
                    # Actually free memory
                    size_mb = pool_size / (1024 * 1024)
                    self.total_allocated -= size_mb
                    del block
    
    def _cleanup_old_blocks(self):
        """Clean up old unused blocks"""
        # In a real implementation, this would track block age and usage
        # For now, just clear some pools
        for pool_size, blocks in list(self.pools.items()):
            if len(blocks) > 5:
                removed = blocks[5:]
                self.pools[pool_size] = blocks[:5]
                size_mb = pool_size * len(removed) / (1024 * 1024)
                self.total_allocated -= size_mb
    
    def get_stats(self) -> Dict[str, Any]:
        """Get memory pool statistics"""
        with self._lock:
            pool_stats = {
                pool_size: len(blocks) 
                for pool_size, blocks in self.pools.items()
            }
            
            return {
                "total_allocated_mb": self.total_allocated,
                "max_size_mb": self.max_size_mb,
                "utilization_percent": (self.total_allocated / self.max_size_mb) * 100,
                "active_blocks": len(self.allocated_blocks),
                "pools": pool_stats
            }


class IntelligentCache:
    """Advanced caching system with multiple eviction strategies"""
    
    def __init__(self, max_size_mb: int = 2048):
        self.max_size_mb = max_size_mb
        self.current_size_mb = 0.0
        self.entries: Dict[str, CacheEntry] = {}
        self.access_order = OrderedDict()  # For LRU
        self.frequency_counter: Dict[str, int] = defaultdict(int)
        self._lock = threading.Lock()
        
        # Performance tracking
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        
    def _calculate_size_mb(self, data: Any) -> float:
        """Calculate size of data in MB"""
        try:
            if hasattr(data, '__sizeof__'):
                return data.__sizeof__() / (1024 * 1024)
            else:
                # Fallback: use pickle to estimate size
                return len(pickle.dumps(data)) / (1024 * 1024)
        except:
            return 1.0  # Default estimate
    
    def _generate_key(self, **kwargs) -> str:
        """Generate cache key from parameters"""
        key_data = json.dumps(kwargs, sort_keys=True)
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def put(self, key: str, data: Any, ttl_seconds: Optional[float] = None, 
            tags: List[str] = None) -> bool:
        """Put data in cache"""
        with self._lock:
            size_mb = self._calculate_size_mb(data)
            
            # Check if we need to evict
            while (self.current_size_mb + size_mb > self.max_size_mb and 
                   len(self.entries) > 0):
                self._evict_entry()
            
            # Create cache entry
            expiry_time = time.time() + ttl_seconds if ttl_seconds else None
            entry = CacheEntry(
                key=key,
                data=data,
                size_bytes=int(size_mb * 1024 * 1024),
                expiry_time=expiry_time,
                tags=tags or []
            )
            
            # Remove existing entry if present
            if key in self.entries:
                old_entry = self.entries[key]
                self.current_size_mb -= old_entry.size_bytes / (1024 * 1024)
            
            # Add new entry
            self.entries[key] = entry
            self.access_order[key] = time.time()
            self.current_size_mb += size_mb
            
            return True
    
    def get(self, key: str) -> Optional[Any]:
        """Get data from cache"""
        with self._lock:
            if key not in self.entries:
                self.misses += 1
                return None
            
            entry = self.entries[key]
            
            # Check expiry
            if entry.is_expired():
                self._remove_entry(key)
                self.misses += 1
                return None
            
            # Update access patterns
            entry.mark_accessed()
            self.access_order.move_to_end(key)
            self.frequency_counter[key] += 1
            self.hits += 1
            
            return entry.data
    
    def invalidate(self, key: str) -> bool:
        """Invalidate specific cache entry"""
        with self._lock:
            if key in self.entries:
                self._remove_entry(key)
                return True
            return False
    
    def invalidate_by_tags(self, tags: List[str]) -> int:
        """Invalidate entries by tags"""
        with self._lock:
            keys_to_remove = []
            
            for key, entry in self.entries.items():
                if any(tag in entry.tags for tag in tags):
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                self._remove_entry(key)
            
            return len(keys_to_remove)
    
    def _evict_entry(self):
        """Evict entry using hybrid strategy"""
        if not self.entries:
            return
        
        # Strategy 1: Remove expired entries first
        current_time = time.time()
        for key, entry in list(self.entries.items()):
            if entry.is_expired():
                self._remove_entry(key)
                return
        
        # Strategy 2: LFU + Age for cold cache levels
        cold_entries = [
            (key, entry) for key, entry in self.entries.items()
            if entry.cache_level in [CacheLevel.L3_COLD, CacheLevel.L4_ARCHIVE]
        ]
        
        if cold_entries:
            # Sort by access count (ascending) and age (descending)
            cold_entries.sort(key=lambda x: (x[1].access_count, -x[1].age_seconds()))
            key_to_evict = cold_entries[0][0]
        else:
            # Strategy 3: LRU fallback
            key_to_evict = next(iter(self.access_order))
        
        self._remove_entry(key_to_evict)
        self.evictions += 1
    
    def _remove_entry(self, key: str):
        """Remove entry from all data structures"""
        if key in self.entries:
            entry = self.entries.pop(key)
            self.current_size_mb -= entry.size_bytes / (1024 * 1024)
            
        if key in self.access_order:
            del self.access_order[key]
            
        if key in self.frequency_counter:
            del self.frequency_counter[key]
    
    def cleanup_expired(self) -> int:
        """Clean up expired entries"""
        with self._lock:
            expired_keys = [
                key for key, entry in self.entries.items()
                if entry.is_expired()
            ]
            
            for key in expired_keys:
                self._remove_entry(key)
            
            return len(expired_keys)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            total_requests = self.hits + self.misses
            hit_rate = self.hits / total_requests if total_requests > 0 else 0
            
            level_distribution = defaultdict(int)
            for entry in self.entries.values():
                level_distribution[entry.cache_level.name] += 1
            
            return {
                "size_mb": self.current_size_mb,
                "max_size_mb": self.max_size_mb,
                "utilization_percent": (self.current_size_mb / self.max_size_mb) * 100,
                "entries": len(self.entries),
                "hits": self.hits,
                "misses": self.misses,
                "evictions": self.evictions,
                "hit_rate": hit_rate,
                "level_distribution": dict(level_distribution)
            }


class KVCacheOptimizer:
    """Key-Value cache optimization for transformer models"""
    
    def __init__(self, max_cache_size_mb: int = 1024):
        self.max_cache_size_mb = max_cache_size_mb
        self.kv_caches: Dict[str, Dict[str, Any]] = {}
        self.cache_stats: Dict[str, Dict[str, float]] = defaultdict(dict)
        self._lock = threading.Lock()
    
    def optimize_kv_cache(self, model_id: str, sequence_length: int, 
                         batch_size: int) -> Dict[str, Any]:
        """Optimize KV cache parameters for given configuration"""
        with self._lock:
            cache_key = f"{model_id}_{sequence_length}_{batch_size}"
            
            if cache_key in self.kv_caches:
                return self.kv_caches[cache_key]
            
            # Calculate optimal cache configuration
            estimated_size_mb = self._estimate_kv_cache_size(
                sequence_length, batch_size
            )
            
            if estimated_size_mb > self.max_cache_size_mb:
                # Implement compression or chunking
                compression_ratio = self.max_cache_size_mb / estimated_size_mb
                optimized_config = {
                    "enable_compression": True,
                    "compression_ratio": compression_ratio,
                    "chunked_attention": True,
                    "chunk_size": min(512, sequence_length // 4)
                }
            else:
                optimized_config = {
                    "enable_compression": False,
                    "full_cache": True,
                    "cache_size_mb": estimated_size_mb
                }
            
            self.kv_caches[cache_key] = optimized_config
            return optimized_config
    
    def _estimate_kv_cache_size(self, sequence_length: int, batch_size: int) -> float:
        """Estimate KV cache memory requirements"""
        # Rough estimation for transformer models
        # Actual implementation would depend on model architecture
        
        # Assume 16-bit precision, typical model dimensions
        hidden_size = 4096  # Typical hidden size
        num_heads = 32      # Typical attention heads
        num_layers = 32     # Typical layer count
        
        # K and V cache for each layer
        kv_size_per_token = 2 * hidden_size * 2  # K + V, 16-bit
        total_size_bytes = (
            kv_size_per_token * sequence_length * batch_size * num_layers
        )
        
        return total_size_bytes / (1024 * 1024)  # Convert to MB
    
    def get_cache_recommendations(self, system_memory_mb: float) -> Dict[str, Any]:
        """Get cache size recommendations based on system memory"""
        available_memory = system_memory_mb * 0.6  # Use 60% of available memory
        
        recommendations = {
            "conservative": available_memory * 0.3,
            "balanced": available_memory * 0.5,
            "aggressive": available_memory * 0.7
        }
        
        return {
            "recommendations_mb": recommendations,
            "current_limit_mb": self.max_cache_size_mb,
            "system_memory_mb": system_memory_mb
        }


class BatchOptimizer:
    """Optimize batch processing for maximum throughput"""
    
    def __init__(self):
        self.optimization_history: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.optimal_configs: Dict[str, Dict[str, Any]] = {}
    
    def find_optimal_batch_size(self, model_id: str, sequence_length: int,
                               available_memory_mb: float) -> int:
        """Find optimal batch size for given constraints"""
        config_key = f"{model_id}_{sequence_length}"
        
        if config_key in self.optimal_configs:
            return self.optimal_configs[config_key]["batch_size"]
        
        # Estimate memory per sample
        memory_per_sample = self._estimate_memory_per_sample(model_id, sequence_length)
        
        # Calculate maximum possible batch size
        max_batch_size = int(available_memory_mb / memory_per_sample)
        
        # Find optimal batch size considering hardware efficiency
        optimal_batch_size = self._find_hardware_optimal_batch_size(max_batch_size)
        
        self.optimal_configs[config_key] = {
            "batch_size": optimal_batch_size,
            "memory_per_sample": memory_per_sample,
            "max_possible": max_batch_size
        }
        
        return optimal_batch_size
    
    def _estimate_memory_per_sample(self, model_id: str, sequence_length: int) -> float:
        """Estimate memory usage per sample"""
        # Base model memory (rough estimates)
        model_sizes = {
            "7b": 14000,   # MB for 7B model
            "13b": 26000,  # MB for 13B model
            "30b": 60000,  # MB for 30B model
        }
        
        # Extract model size from ID
        base_memory = 14000  # Default to 7B
        for size, memory in model_sizes.items():
            if size in model_id.lower():
                base_memory = memory
                break
        
        # Additional memory per token
        memory_per_token = 4  # MB per token (rough estimate)
        sequence_memory = sequence_length * memory_per_token
        
        return sequence_memory  # Memory per sample (excluding model weights)
    
    def _find_hardware_optimal_batch_size(self, max_batch_size: int) -> int:
        """Find batch size optimal for hardware utilization"""
        # Prefer powers of 2 or multiples of 8 for better GPU utilization
        optimal_sizes = []
        
        # Powers of 2
        power = 1
        while power <= max_batch_size:
            optimal_sizes.append(power)
            power *= 2
        
        # Multiples of 8
        multiple = 8
        while multiple <= max_batch_size:
            if multiple not in optimal_sizes:
                optimal_sizes.append(multiple)
            multiple += 8
        
        # Return largest optimal size
        return max(optimal_sizes) if optimal_sizes else 1
    
    def record_performance(self, model_id: str, sequence_length: int,
                          batch_size: int, throughput: float, latency: float):
        """Record performance metrics for optimization learning"""
        config_key = f"{model_id}_{sequence_length}"
        
        performance_data = {
            "batch_size": batch_size,
            "throughput": throughput,
            "latency": latency,
            "timestamp": time.time(),
            "efficiency": throughput / batch_size  # Throughput per batch item
        }
        
        self.optimization_history[config_key].append(performance_data)
        
        # Keep only recent history
        if len(self.optimization_history[config_key]) > 100:
            self.optimization_history[config_key] = (
                self.optimization_history[config_key][-50:]
            )


class HardwareOptimizer:
    """Hardware-specific optimizations"""
    
    def __init__(self):
        self.cpu_info = self._detect_cpu_features()
        self.gpu_info = self._detect_gpu_features()
        self.memory_info = self._get_memory_info()
    
    def _detect_cpu_features(self) -> Dict[str, Any]:
        """Detect CPU features and capabilities"""
        try:
            cpu_count = os.cpu_count()
            
            # Try to detect CPU features
            features = {
                "cores": cpu_count,
                "threads": cpu_count,  # Simplified
                "avx2": False,
                "avx512": False,
                "architecture": "unknown"
            }
            
            # Check for AVX support (simplified detection)
            try:
                import cpuinfo
                info = cpuinfo.get_cpu_info()
                features.update({
                    "architecture": info.get("arch", "unknown"),
                    "brand": info.get("brand_raw", "unknown"),
                    "avx2": "avx2" in info.get("flags", []),
                    "avx512": any("avx512" in flag for flag in info.get("flags", []))
                })
            except ImportError:
                pass
            
            return features
            
        except Exception as e:
            logger.warning(f"Failed to detect CPU features: {e}")
            return {"cores": 4, "threads": 4}  # Fallback
    
    def _detect_gpu_features(self) -> Dict[str, Any]:
        """Detect GPU features and capabilities"""
        gpu_info = {"available": False}
        
        try:
            import torch
            if torch.cuda.is_available():
                device_props = torch.cuda.get_device_properties(0)
                gpu_info.update({
                    "available": True,
                    "name": device_props.name,
                    "total_memory": device_props.total_memory,
                    "multiprocessors": device_props.multi_processor_count,
                    "compute_capability": (device_props.major, device_props.minor),
                    "supports_fp16": device_props.major >= 6,  # Rough estimate
                    "supports_int8": device_props.major >= 6
                })
        except ImportError:
            pass
        
        return gpu_info
    
    def _get_memory_info(self) -> Dict[str, Any]:
        """Get system memory information"""
        try:
            memory = psutil.virtual_memory()
            return {
                "total_mb": memory.total / (1024 * 1024),
                "available_mb": memory.available / (1024 * 1024),
                "percent_used": memory.percent
            }
        except:
            return {"total_mb": 16384, "available_mb": 8192}  # Fallback
    
    def get_optimal_threading(self, workload_type: str = "inference") -> Dict[str, int]:
        """Get optimal threading configuration"""
        cpu_cores = self.cpu_info.get("cores", 4)
        
        if workload_type == "inference":
            # For inference, leave some cores free for system
            return {
                "inference_threads": max(1, cpu_cores - 1),
                "io_threads": 2,
                "background_threads": 1
            }
        elif workload_type == "batch":
            # For batch processing, use more cores
            return {
                "inference_threads": cpu_cores,
                "io_threads": min(4, cpu_cores // 2),
                "background_threads": 1
            }
        else:
            return {
                "inference_threads": cpu_cores // 2,
                "io_threads": 2,
                "background_threads": 1
            }
    
    def get_memory_recommendations(self) -> Dict[str, float]:
        """Get memory allocation recommendations"""
        total_memory = self.memory_info.get("total_mb", 16384)
        
        return {
            "model_cache_mb": total_memory * 0.4,
            "inference_cache_mb": total_memory * 0.2,
            "kv_cache_mb": total_memory * 0.2,
            "system_reserve_mb": total_memory * 0.2
        }


class OptimizationEngine:
    """Main optimization engine coordinating all optimization components"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        
        # Initialize components
        memory_pool_size = self.config.get("memory_pool_mb", 1024)
        cache_size = self.config.get("cache_size_mb", 2048)
        kv_cache_size = self.config.get("kv_cache_mb", 1024)
        
        self.memory_pool = MemoryPool(memory_pool_size)
        self.cache = IntelligentCache(cache_size)
        self.kv_optimizer = KVCacheOptimizer(kv_cache_size)
        self.batch_optimizer = BatchOptimizer()
        self.hardware_optimizer = HardwareOptimizer()
        
        # Start background optimization tasks
        self.running = True
        self.optimization_thread = threading.Thread(target=self._optimization_loop, daemon=True)
        self.optimization_thread.start()
    
    def _optimization_loop(self):
        """Background optimization tasks"""
        while self.running:
            try:
                # Clean up expired cache entries
                self.cache.cleanup_expired()
                
                # Optimize memory pools
                gc.collect()  # Force garbage collection
                
                # Sleep before next optimization cycle
                time.sleep(60)  # Run every minute
                
            except Exception as e:
                logger.error(f"Optimization loop error: {e}")
                time.sleep(10)
    
    def optimize_request(self, request_params: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize parameters for a specific request"""
        model_id = request_params.get("model_id", "default")
        sequence_length = request_params.get("max_tokens", 512)
        batch_size = request_params.get("batch_size", 1)
        
        # Get hardware recommendations
        memory_recs = self.hardware_optimizer.get_memory_recommendations()
        threading_config = self.hardware_optimizer.get_optimal_threading("inference")
        
        # Optimize batch size
        available_memory = memory_recs["inference_cache_mb"]
        optimal_batch_size = self.batch_optimizer.find_optimal_batch_size(
            model_id, sequence_length, available_memory
        )
        
        # Optimize KV cache
        kv_config = self.kv_optimizer.optimize_kv_cache(
            model_id, sequence_length, batch_size
        )
        
        return {
            "batch_size": min(optimal_batch_size, batch_size),
            "threading": threading_config,
            "kv_cache": kv_config,
            "memory_allocation": memory_recs
        }
    
    def cache_result(self, key: str, result: Any, ttl_seconds: Optional[float] = None,
                    tags: List[str] = None) -> bool:
        """Cache computation result"""
        return self.cache.put(key, result, ttl_seconds, tags)
    
    def get_cached_result(self, key: str) -> Optional[Any]:
        """Get cached computation result"""
        return self.cache.get(key)
    
    def invalidate_cache(self, tags: List[str] = None, key: str = None) -> int:
        """Invalidate cache entries"""
        if key:
            return 1 if self.cache.invalidate(key) else 0
        elif tags:
            return self.cache.invalidate_by_tags(tags)
        else:
            return 0
    
    def get_comprehensive_stats(self) -> Dict[str, Any]:
        """Get comprehensive optimization statistics"""
        return {
            "memory_pool": self.memory_pool.get_stats(),
            "cache": self.cache.get_stats(),
            "kv_cache": self.kv_optimizer.get_cache_recommendations(
                self.hardware_optimizer.memory_info.get("total_mb", 16384)
            ),
            "hardware": {
                "cpu": self.hardware_optimizer.cpu_info,
                "gpu": self.hardware_optimizer.gpu_info,
                "memory": self.hardware_optimizer.memory_info
            }
        }
    
    def shutdown(self):
        """Shutdown optimization engine"""
        logger.info("Shutting down optimization engine...")
        self.running = False
        
        if hasattr(self, 'optimization_thread'):
            self.optimization_thread.join(timeout=5.0)
        
        logger.info("Optimization engine shutdown complete")


# Global optimization engine instance
_global_optimization_engine: Optional[OptimizationEngine] = None

def get_optimization_engine(**kwargs) -> OptimizationEngine:
    """Get or create global optimization engine"""
    global _global_optimization_engine
    if _global_optimization_engine is None:
        _global_optimization_engine = OptimizationEngine(**kwargs)
    return _global_optimization_engine


# Convenience functions
def optimize_request(request_params: Dict[str, Any]) -> Dict[str, Any]:
    """Optimize request parameters"""
    engine = get_optimization_engine()
    return engine.optimize_request(request_params)


def cache_computation(key: str, result: Any, ttl_seconds: Optional[float] = None) -> bool:
    """Cache computation result"""
    engine = get_optimization_engine()
    return engine.cache_result(key, result, ttl_seconds)


def get_cached_computation(key: str) -> Optional[Any]:
    """Get cached computation result"""
    engine = get_optimization_engine()
    return engine.get_cached_result(key)