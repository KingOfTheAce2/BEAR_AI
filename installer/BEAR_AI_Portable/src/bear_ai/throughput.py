import time
import threading
import logging
from collections import deque
from typing import Dict, Optional, List, Tuple, Callable
from dataclasses import dataclass
from enum import Enum


class MetricType(Enum):
    """Types of performance metrics that can be tracked."""
    TOKENS_PER_SECOND = "tokens_per_second"
    LATENCY_MS = "latency_ms"
    MEMORY_USAGE_MB = "memory_usage_mb"
    GPU_UTILIZATION_PERCENT = "gpu_utilization_percent"
    MODEL_LOAD_TIME_S = "model_load_time_s"
    INFERENCE_TIME_MS = "inference_time_ms"


@dataclass
class PerformanceSnapshot:
    """Snapshot of performance metrics at a point in time."""
    timestamp: float
    tokens_per_second: float
    latency_ms: float
    memory_usage_mb: float
    gpu_utilization_percent: float
    batch_size: int
    sequence_length: int
    model_name: str


class ThroughputMeter:
    """
    Enhanced throughput meter with comprehensive performance tracking.
    Call on_tokens(n) as tokens arrive. Read tokens_per_sec() anytime.
    Uses a moving window for stability with additional metrics.
    """

    def __init__(self, window_s: float = 2.0, track_latency: bool = True):
        self.window_s = window_s
        self.track_latency = track_latency
        self.q = deque()  # each entry: (timestamp, tokens, latency_ms)
        self.total_in_window = 0
        self.latency_sum = 0.0
        self.latency_count = 0
        self._lock = threading.Lock()
        self._start_time = None
        
        # Performance history
        self.performance_history: List[PerformanceSnapshot] = []
        self.max_history_size = 1000
        
        # Callbacks for real-time monitoring
        self._callbacks: List[Callable[[Dict], None]] = []

    def add_callback(self, callback: Callable[[Dict], None]):
        """Add callback to be called on performance updates.
        
        Parameters
        ----------
        callback: Callable[[Dict], None]
            Function to call with performance metrics
        """
        self._callbacks.append(callback)

    def on_tokens(self, n: int, latency_ms: Optional[float] = None):
        """Record token generation event.
        
        Parameters
        ----------
        n: int
            Number of tokens generated
        latency_ms: Optional[float]
            Latency in milliseconds for this token batch
        """
        now = time.time()
        
        with self._lock:
            if self._start_time is None:
                self._start_time = now
            
            self.q.append((now, n, latency_ms or 0.0))
            self.total_in_window += n
            
            if latency_ms and self.track_latency:
                self.latency_sum += latency_ms
                self.latency_count += 1
            
            self._evict_old(now)
            
            # Notify callbacks
            if self._callbacks:
                metrics = self.get_comprehensive_metrics()
                for callback in self._callbacks:
                    try:
                        callback(metrics)
                    except Exception as e:
                        logging.getLogger(__name__).warning(f"Callback error: {e}")

    def tokens_per_sec(self) -> float:
        """Get current tokens per second rate.
        
        Returns
        -------
        float
            Current tokens per second
        """
        now = time.time()
        with self._lock:
            self._evict_old(now)
            if not self.q:
                return 0.0
            span = max(self.q[-1][0] - self.q[0][0], 1e-6)
            return self.total_in_window / span

    def average_latency_ms(self) -> float:
        """Get average latency in milliseconds.
        
        Returns
        -------
        float
            Average latency in milliseconds
        """
        with self._lock:
            if self.latency_count == 0:
                return 0.0
            return self.latency_sum / self.latency_count

    def get_comprehensive_metrics(self) -> Dict[str, float]:
        """Get comprehensive performance metrics.
        
        Returns
        -------
        Dict[str, float]
            Dictionary of performance metrics
        """
        now = time.time()
        with self._lock:
            self._evict_old(now)
            
            metrics = {
                "tokens_per_second": self.tokens_per_sec(),
                "average_latency_ms": self.average_latency_ms(),
                "total_tokens": sum(entry[1] for entry in self.q),
                "total_time_s": now - self._start_time if self._start_time else 0.0,
                "window_size_s": self.window_s,
                "active_measurements": len(self.q)
            }
            
            # Add percentile latencies if we have enough data
            if len(self.q) >= 10:
                latencies = [entry[2] for entry in self.q if entry[2] > 0]
                if latencies:
                    sorted_latencies = sorted(latencies)
                    n = len(sorted_latencies)
                    metrics["latency_p50_ms"] = sorted_latencies[n // 2]
                    metrics["latency_p90_ms"] = sorted_latencies[int(n * 0.9)]
                    metrics["latency_p99_ms"] = sorted_latencies[int(n * 0.99)]
            
            return metrics

    def create_performance_snapshot(
        self,
        model_name: str = "unknown",
        batch_size: int = 1,
        sequence_length: int = 0,
        memory_usage_mb: float = 0.0,
        gpu_utilization_percent: float = 0.0
    ) -> PerformanceSnapshot:
        """Create a performance snapshot with current metrics.
        
        Parameters
        ----------
        model_name: str
            Name of the model being benchmarked
        batch_size: int
            Current batch size
        sequence_length: int
            Current sequence length
        memory_usage_mb: float
            Current memory usage in MB
        gpu_utilization_percent: float
            Current GPU utilization percentage
            
        Returns
        -------
        PerformanceSnapshot
            Current performance snapshot
        """
        snapshot = PerformanceSnapshot(
            timestamp=time.time(),
            tokens_per_second=self.tokens_per_sec(),
            latency_ms=self.average_latency_ms(),
            memory_usage_mb=memory_usage_mb,
            gpu_utilization_percent=gpu_utilization_percent,
            batch_size=batch_size,
            sequence_length=sequence_length,
            model_name=model_name
        )
        
        # Add to history
        self.performance_history.append(snapshot)
        if len(self.performance_history) > self.max_history_size:
            self.performance_history.pop(0)
        
        return snapshot

    def get_performance_trends(self, window_minutes: int = 5) -> Dict[str, List[Tuple[float, float]]]:
        """Get performance trends over time.
        
        Parameters
        ----------
        window_minutes: int
            Time window in minutes to analyze
            
        Returns
        -------
        Dict[str, List[Tuple[float, float]]]
            Trends data as (timestamp, value) tuples for each metric
        """
        cutoff_time = time.time() - (window_minutes * 60)
        recent_snapshots = [
            snap for snap in self.performance_history 
            if snap.timestamp >= cutoff_time
        ]
        
        trends = {
            "tokens_per_second": [(s.timestamp, s.tokens_per_second) for s in recent_snapshots],
            "latency_ms": [(s.timestamp, s.latency_ms) for s in recent_snapshots],
            "memory_usage_mb": [(s.timestamp, s.memory_usage_mb) for s in recent_snapshots],
            "gpu_utilization_percent": [(s.timestamp, s.gpu_utilization_percent) for s in recent_snapshots]
        }
        
        return trends

    def reset(self):
        """Reset all metrics and history."""
        with self._lock:
            self.q.clear()
            self.total_in_window = 0
            self.latency_sum = 0.0
            self.latency_count = 0
            self._start_time = None
            self.performance_history.clear()

    def _evict_old(self, now: float):
        """Remove old entries outside the window."""
        while self.q and now - self.q[0][0] > self.window_s:
            _, n, latency = self.q.popleft()
            self.total_in_window -= n
            if latency > 0 and self.track_latency:
                self.latency_sum -= latency
                self.latency_count -= 1


class BenchmarkRunner:
    """Advanced benchmarking runner with automatic optimization detection."""
    
    def __init__(self):
        self.results: Dict[str, List[PerformanceSnapshot]] = {}
        self._logger = logging.getLogger(__name__)
    
    def run_benchmark(
        self,
        benchmark_name: str,
        model_name: str,
        test_function: Callable,
        duration_seconds: float = 30.0,
        warmup_seconds: float = 5.0
    ) -> Dict[str, float]:
        """Run a comprehensive benchmark.
        
        Parameters
        ----------
        benchmark_name: str
            Name identifier for this benchmark
        model_name: str
            Name of the model being tested
        test_function: Callable
            Function to run repeatedly for benchmarking
        duration_seconds: float
            How long to run the benchmark
        warmup_seconds: float
            Warmup period before measurements
            
        Returns
        -------
        Dict[str, float]
            Benchmark results summary
        """
        meter = ThroughputMeter(window_s=1.0)
        snapshots = []
        
        self._logger.info(f"Starting benchmark: {benchmark_name}")
        
        # Warmup phase
        self._logger.info(f"Warming up for {warmup_seconds}s...")
        warmup_end = time.time() + warmup_seconds
        while time.time() < warmup_end:
            try:
                start_time = time.time()
                result = test_function()
                end_time = time.time()
                
                tokens = getattr(result, 'tokens', 1)
                latency_ms = (end_time - start_time) * 1000
                meter.on_tokens(tokens, latency_ms)
            except Exception as e:
                self._logger.warning(f"Warmup iteration failed: {e}")
        
        # Reset meter after warmup
        meter.reset()
        
        # Actual benchmark
        self._logger.info(f"Running benchmark for {duration_seconds}s...")
        benchmark_end = time.time() + duration_seconds
        iteration = 0
        
        while time.time() < benchmark_end:
            try:
                start_time = time.time()
                result = test_function()
                end_time = time.time()
                
                tokens = getattr(result, 'tokens', 1)
                latency_ms = (end_time - start_time) * 1000
                meter.on_tokens(tokens, latency_ms)
                
                # Create snapshot every 5 seconds
                if iteration % 50 == 0:  # Assuming ~10 iterations per second
                    snapshot = meter.create_performance_snapshot(
                        model_name=model_name,
                        batch_size=getattr(result, 'batch_size', 1),
                        sequence_length=getattr(result, 'sequence_length', 0)
                    )
                    snapshots.append(snapshot)
                
                iteration += 1
                
            except Exception as e:
                self._logger.warning(f"Benchmark iteration {iteration} failed: {e}")
        
        # Store results
        self.results[benchmark_name] = snapshots
        
        # Calculate final metrics
        final_metrics = meter.get_comprehensive_metrics()
        final_metrics['iterations'] = iteration
        final_metrics['model_name'] = model_name
        final_metrics['benchmark_name'] = benchmark_name
        
        self._logger.info(f"Benchmark completed: {final_metrics['tokens_per_second']:.1f} tokens/sec")
        
        return final_metrics
    
    def get_benchmark_comparison(self) -> Dict[str, Dict[str, float]]:
        """Compare results across all benchmarks.
        
        Returns
        -------
        Dict[str, Dict[str, float]]
            Comparison of benchmark results
        """
        comparison = {}
        
        for name, snapshots in self.results.items():
            if not snapshots:
                continue
            
            tokens_per_sec = [s.tokens_per_second for s in snapshots]
            latencies = [s.latency_ms for s in snapshots if s.latency_ms > 0]
            
            comparison[name] = {
                'avg_tokens_per_sec': sum(tokens_per_sec) / len(tokens_per_sec),
                'max_tokens_per_sec': max(tokens_per_sec),
                'min_tokens_per_sec': min(tokens_per_sec),
                'avg_latency_ms': sum(latencies) / len(latencies) if latencies else 0,
                'total_snapshots': len(snapshots)
            }
        
        return comparison


# Global benchmark runner
_benchmark_runner = BenchmarkRunner()


def run_model_benchmark(
    model_name: str,
    test_function: Callable,
    duration_seconds: float = 30.0
) -> Dict[str, float]:
    """Run a standardized model benchmark.
    
    Parameters
    ----------
    model_name: str
        Name of the model to benchmark
    test_function: Callable
        Function that performs model inference
    duration_seconds: float
        How long to run the benchmark
        
    Returns
    -------
    Dict[str, float]
        Benchmark results
    """
    return _benchmark_runner.run_benchmark(
        benchmark_name=f"{model_name}_benchmark",
        model_name=model_name,
        test_function=test_function,
        duration_seconds=duration_seconds
    )


def get_all_benchmark_results() -> Dict[str, Dict[str, float]]:
    """Get comparison of all benchmark results.
    
    Returns
    -------
    Dict[str, Dict[str, float]]
        All benchmark comparisons
    """
    return _benchmark_runner.get_benchmark_comparison()
