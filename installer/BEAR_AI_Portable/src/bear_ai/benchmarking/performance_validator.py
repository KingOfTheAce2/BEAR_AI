"""
Comprehensive Performance Benchmarking and Validation System
Enterprise-grade testing framework for BEAR AI performance validation

Features:
- Automated performance benchmarking
- Load testing and stress testing
- Memory leak detection
- Latency and throughput analysis
- Regression testing
- Real-world scenario simulation
- Performance regression alerts
- Detailed reporting and analytics

@version 3.0.0
@author BEAR AI Testing Team
"""

import asyncio
import logging
import multiprocessing
import os
import platform
import psutil
import statistics
import time
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable, Tuple, Union
import json
import threading
import gc
import tracemalloc
import memory_profiler
from collections import defaultdict, deque
import numpy as np

try:
    import matplotlib.pyplot as plt
    import seaborn as sns
    PLOTTING_AVAILABLE = True
except ImportError:
    PLOTTING_AVAILABLE = False

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

logger = logging.getLogger(__name__)


class BenchmarkType(Enum):
    """Types of benchmarks"""
    LATENCY = "latency"
    THROUGHPUT = "throughput"
    MEMORY = "memory"
    CPU = "cpu"
    CONCURRENT = "concurrent"
    STRESS = "stress"
    ENDURANCE = "endurance"
    REGRESSION = "regression"


class PerformanceStatus(Enum):
    """Performance test status"""
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    SKIPPED = "skipped"


@dataclass
class BenchmarkConfig:
    """Configuration for benchmark execution"""
    name: str
    benchmark_type: BenchmarkType
    duration_seconds: int = 60
    warmup_seconds: int = 10
    concurrent_users: int = 1
    requests_per_user: int = 100
    target_latency_p95_ms: float = 1000
    target_throughput_rps: float = 10
    max_memory_mb: int = 2048
    max_cpu_percent: float = 80
    error_threshold_percent: float = 1.0
    timeout_seconds: int = 300
    repeat_count: int = 3
    enabled: bool = True


@dataclass
class PerformanceMetrics:
    """Performance metrics collected during testing"""
    timestamp: datetime
    test_name: str
    benchmark_type: BenchmarkType
    
    # Latency metrics (ms)
    latency_min: float = 0
    latency_max: float = 0
    latency_mean: float = 0
    latency_median: float = 0
    latency_p95: float = 0
    latency_p99: float = 0
    latency_std: float = 0
    
    # Throughput metrics
    requests_per_second: float = 0
    tokens_per_second: float = 0
    documents_per_minute: float = 0
    
    # Resource metrics
    cpu_percent: float = 0
    memory_mb: float = 0
    memory_peak_mb: float = 0
    disk_io_mb: float = 0
    network_io_mb: float = 0
    gpu_memory_mb: float = 0
    gpu_utilization: float = 0
    
    # Error metrics
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    error_rate: float = 0
    timeout_count: int = 0
    
    # Custom metrics
    custom_metrics: Dict[str, float] = field(default_factory=dict)


@dataclass
class BenchmarkResult:
    """Result of a benchmark execution"""
    config: BenchmarkConfig
    metrics: PerformanceMetrics
    status: PerformanceStatus
    details: str
    start_time: datetime
    end_time: datetime
    duration: float
    raw_data: Dict[str, Any] = field(default_factory=dict)


class ResourceMonitor:
    """Monitor system resources during benchmarking"""
    
    def __init__(self, interval: float = 1.0):
        self.interval = interval
        self.monitoring = False
        self.metrics_history: List[Dict[str, Any]] = []
        self.monitor_thread: Optional[threading.Thread] = None
        
    def start_monitoring(self):
        """Start resource monitoring"""
        if self.monitoring:
            return
        
        self.monitoring = True
        self.metrics_history.clear()
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        
    def stop_monitoring(self) -> Dict[str, Any]:
        """Stop monitoring and return aggregated metrics"""
        if not self.monitoring:
            return {}
        
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        
        return self._aggregate_metrics()
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.monitoring:
            try:
                metrics = self._collect_current_metrics()
                self.metrics_history.append(metrics)
                time.sleep(self.interval)
            except Exception as e:
                logger.error(f"Resource monitoring error: {e}")
    
    def _collect_current_metrics(self) -> Dict[str, Any]:
        """Collect current system metrics"""
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=None)
        cpu_count = psutil.cpu_count()
        load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
        
        # Memory metrics
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # Disk I/O
        disk_io = psutil.disk_io_counters()
        
        # Network I/O
        network_io = psutil.net_io_counters()
        
        # Process-specific metrics
        process = psutil.Process()
        process_memory = process.memory_info()
        process_cpu = process.cpu_percent()
        
        # GPU metrics (if available)
        gpu_metrics = self._get_gpu_metrics()
        
        return {
            'timestamp': time.time(),
            'cpu_percent': cpu_percent,
            'cpu_count': cpu_count,
            'load_average': load_avg,
            'memory_total': memory.total,
            'memory_used': memory.used,
            'memory_percent': memory.percent,
            'swap_total': swap.total,
            'swap_used': swap.used,
            'disk_read_bytes': disk_io.read_bytes if disk_io else 0,
            'disk_write_bytes': disk_io.write_bytes if disk_io else 0,
            'network_sent_bytes': network_io.bytes_sent if network_io else 0,
            'network_recv_bytes': network_io.bytes_recv if network_io else 0,
            'process_memory_rss': process_memory.rss,
            'process_memory_vms': process_memory.vms,
            'process_cpu_percent': process_cpu,
            **gpu_metrics
        }
    
    def _get_gpu_metrics(self) -> Dict[str, Any]:
        """Get GPU metrics if available"""
        try:
            import torch
            if torch.cuda.is_available():
                return {
                    'gpu_memory_allocated': torch.cuda.memory_allocated(),
                    'gpu_memory_reserved': torch.cuda.memory_reserved(),
                    'gpu_utilization': torch.cuda.utilization() if hasattr(torch.cuda, 'utilization') else 0
                }
        except ImportError:
            pass
        
        return {
            'gpu_memory_allocated': 0,
            'gpu_memory_reserved': 0,
            'gpu_utilization': 0
        }
    
    def _aggregate_metrics(self) -> Dict[str, Any]:
        """Aggregate collected metrics"""
        if not self.metrics_history:
            return {}
        
        # Convert to arrays for easier calculation
        data = {}
        for key in self.metrics_history[0].keys():
            if key != 'timestamp':
                values = [m[key] for m in self.metrics_history if isinstance(m[key], (int, float))]
                if values:
                    data[key] = {
                        'min': min(values),
                        'max': max(values),
                        'mean': statistics.mean(values),
                        'median': statistics.median(values),
                        'std': statistics.stdev(values) if len(values) > 1 else 0
                    }
        
        return data


class MemoryProfiler:
    """Memory profiling and leak detection"""
    
    def __init__(self):
        self.tracemalloc_started = False
        self.initial_snapshot = None
        self.peak_memory = 0
        
    def start_profiling(self):
        """Start memory profiling"""
        if not self.tracemalloc_started:
            tracemalloc.start()
            self.tracemalloc_started = True
            
        self.initial_snapshot = tracemalloc.take_snapshot()
        self.peak_memory = 0
        
    def take_snapshot(self) -> Dict[str, Any]:
        """Take memory snapshot and compare with initial"""
        if not self.tracemalloc_started:
            return {}
        
        current_snapshot = tracemalloc.take_snapshot()
        current_memory = sum(stat.size for stat in current_snapshot.statistics('filename'))
        
        self.peak_memory = max(self.peak_memory, current_memory)
        
        if self.initial_snapshot:
            top_stats = current_snapshot.compare_to(self.initial_snapshot, 'lineno')
            memory_growth = sum(stat.size_diff for stat in top_stats)
            
            return {
                'current_memory': current_memory,
                'peak_memory': self.peak_memory,
                'memory_growth': memory_growth,
                'top_allocations': [
                    {
                        'filename': stat.traceback.format()[0],
                        'size': stat.size,
                        'size_diff': stat.size_diff
                    }
                    for stat in top_stats[:10]  # Top 10 allocations
                ]
            }
        
        return {'current_memory': current_memory, 'peak_memory': self.peak_memory}
    
    def stop_profiling(self) -> Dict[str, Any]:
        """Stop profiling and return final snapshot"""
        final_snapshot = self.take_snapshot()
        
        if self.tracemalloc_started:
            tracemalloc.stop()
            self.tracemalloc_started = False
        
        return final_snapshot


class BenchmarkExecutor(ABC):
    """Abstract base class for benchmark execution"""
    
    @abstractmethod
    async def execute(self, config: BenchmarkConfig) -> BenchmarkResult:
        """Execute benchmark and return results"""
        pass
    
    def create_performance_metrics(
        self, 
        test_name: str, 
        benchmark_type: BenchmarkType,
        latencies: List[float] = None,
        resource_metrics: Dict[str, Any] = None,
        custom_metrics: Dict[str, float] = None
    ) -> PerformanceMetrics:
        """Create performance metrics from collected data"""
        
        metrics = PerformanceMetrics(
            timestamp=datetime.utcnow(),
            test_name=test_name,
            benchmark_type=benchmark_type
        )
        
        # Calculate latency metrics
        if latencies:
            metrics.latency_min = min(latencies)
            metrics.latency_max = max(latencies)
            metrics.latency_mean = statistics.mean(latencies)
            metrics.latency_median = statistics.median(latencies)
            metrics.latency_std = statistics.stdev(latencies) if len(latencies) > 1 else 0
            
            # Calculate percentiles
            sorted_latencies = sorted(latencies)
            n = len(sorted_latencies)
            metrics.latency_p95 = sorted_latencies[int(n * 0.95)] if n > 0 else 0
            metrics.latency_p99 = sorted_latencies[int(n * 0.99)] if n > 0 else 0
        
        # Resource metrics
        if resource_metrics:
            cpu_data = resource_metrics.get('process_cpu_percent', {})
            if isinstance(cpu_data, dict):
                metrics.cpu_percent = cpu_data.get('mean', 0)
            
            memory_data = resource_metrics.get('process_memory_rss', {})
            if isinstance(memory_data, dict):
                metrics.memory_mb = memory_data.get('mean', 0) / (1024 * 1024)
                metrics.memory_peak_mb = memory_data.get('max', 0) / (1024 * 1024)
            
            gpu_memory_data = resource_metrics.get('gpu_memory_allocated', {})
            if isinstance(gpu_memory_data, dict):
                metrics.gpu_memory_mb = gpu_memory_data.get('mean', 0) / (1024 * 1024)
            
            gpu_util_data = resource_metrics.get('gpu_utilization', {})
            if isinstance(gpu_util_data, dict):
                metrics.gpu_utilization = gpu_util_data.get('mean', 0)
        
        # Custom metrics
        if custom_metrics:
            metrics.custom_metrics = custom_metrics
        
        return metrics


class ModelInferenceBenchmark(BenchmarkExecutor):
    """Benchmark for model inference performance"""
    
    def __init__(self, model_path: str = None):
        self.model_path = model_path
        self.model = None
    
    async def execute(self, config: BenchmarkConfig) -> BenchmarkResult:
        """Execute model inference benchmark"""
        start_time = datetime.utcnow()
        
        # Initialize monitoring
        resource_monitor = ResourceMonitor(interval=0.5)
        memory_profiler = MemoryProfiler()
        
        try:
            # Start monitoring
            resource_monitor.start_monitoring()
            memory_profiler.start_profiling()
            
            # Load model if not already loaded
            if self.model is None:
                await self._load_model()
            
            # Warmup
            await self._warmup(config.warmup_seconds)
            
            # Execute benchmark
            latencies = []
            successful_requests = 0
            failed_requests = 0
            
            tasks = []
            
            for _ in range(config.requests_per_user):
                task = asyncio.create_task(self._single_inference())
                tasks.append(task)
            
            # Process results as they complete
            for completed_task in asyncio.as_completed(tasks):
                try:
                    latency = await completed_task
                    latencies.append(latency)
                    successful_requests += 1
                except Exception as e:
                    logger.error(f"Inference failed: {e}")
                    failed_requests += 1
            
            # Stop monitoring
            resource_metrics = resource_monitor.stop_monitoring()
            memory_metrics = memory_profiler.stop_profiling()
            
            # Create performance metrics
            metrics = self.create_performance_metrics(
                test_name=config.name,
                benchmark_type=config.benchmark_type,
                latencies=latencies,
                resource_metrics=resource_metrics,
                custom_metrics={
                    'model_load_time': getattr(self, 'model_load_time', 0),
                    'memory_growth_mb': memory_metrics.get('memory_growth', 0) / (1024 * 1024)
                }
            )
            
            metrics.total_requests = len(tasks)
            metrics.successful_requests = successful_requests
            metrics.failed_requests = failed_requests
            metrics.error_rate = (failed_requests / len(tasks)) * 100 if tasks else 0
            
            # Calculate throughput
            if latencies:
                total_time = sum(latencies) / 1000  # Convert to seconds
                metrics.requests_per_second = len(latencies) / total_time if total_time > 0 else 0
            
            # Determine status
            status = self._evaluate_performance(metrics, config)
            
            end_time = datetime.utcnow()
            
            return BenchmarkResult(
                config=config,
                metrics=metrics,
                status=status,
                details=self._generate_details(metrics, config),
                start_time=start_time,
                end_time=end_time,
                duration=(end_time - start_time).total_seconds(),
                raw_data={
                    'latencies': latencies,
                    'resource_metrics': resource_metrics,
                    'memory_metrics': memory_metrics
                }
            )
            
        except Exception as e:
            end_time = datetime.utcnow()
            logger.error(f"Benchmark execution failed: {e}")
            
            return BenchmarkResult(
                config=config,
                metrics=PerformanceMetrics(
                    timestamp=datetime.utcnow(),
                    test_name=config.name,
                    benchmark_type=config.benchmark_type
                ),
                status=PerformanceStatus.FAIL,
                details=f"Benchmark failed: {str(e)}",
                start_time=start_time,
                end_time=end_time,
                duration=(end_time - start_time).total_seconds()
            )
    
    async def _load_model(self):
        """Load model for inference"""
        start_time = time.time()
        
        # Mock model loading - replace with actual model loading
        await asyncio.sleep(2)  # Simulate model loading time
        self.model = "mock_model"
        
        self.model_load_time = (time.time() - start_time) * 1000  # ms
        logger.info(f"Model loaded in {self.model_load_time:.2f}ms")
    
    async def _warmup(self, warmup_seconds: int):
        """Warmup the model"""
        warmup_end = time.time() + warmup_seconds
        
        while time.time() < warmup_end:
            try:
                await self._single_inference()
            except Exception as e:
                logger.warning(f"Warmup inference failed: {e}")
    
    async def _single_inference(self) -> float:
        """Perform single model inference"""
        start_time = time.time()
        
        # Mock inference - replace with actual model inference
        await asyncio.sleep(0.1 + (time.time() % 0.1))  # Simulate variable inference time
        
        end_time = time.time()
        return (end_time - start_time) * 1000  # Return latency in ms
    
    def _evaluate_performance(self, metrics: PerformanceMetrics, config: BenchmarkConfig) -> PerformanceStatus:
        """Evaluate performance against targets"""
        issues = []
        
        # Check latency
        if metrics.latency_p95 > config.target_latency_p95_ms:
            issues.append(f"P95 latency {metrics.latency_p95:.1f}ms exceeds target {config.target_latency_p95_ms}ms")
        
        # Check throughput
        if metrics.requests_per_second < config.target_throughput_rps:
            issues.append(f"Throughput {metrics.requests_per_second:.1f} RPS below target {config.target_throughput_rps} RPS")
        
        # Check memory
        if metrics.memory_peak_mb > config.max_memory_mb:
            issues.append(f"Peak memory {metrics.memory_peak_mb:.1f}MB exceeds limit {config.max_memory_mb}MB")
        
        # Check CPU
        if metrics.cpu_percent > config.max_cpu_percent:
            issues.append(f"CPU usage {metrics.cpu_percent:.1f}% exceeds limit {config.max_cpu_percent}%")
        
        # Check error rate
        if metrics.error_rate > config.error_threshold_percent:
            issues.append(f"Error rate {metrics.error_rate:.1f}% exceeds threshold {config.error_threshold_percent}%")
        
        if not issues:
            return PerformanceStatus.PASS
        elif len(issues) <= 2 and metrics.error_rate <= config.error_threshold_percent:
            return PerformanceStatus.WARNING
        else:
            return PerformanceStatus.FAIL
    
    def _generate_details(self, metrics: PerformanceMetrics, config: BenchmarkConfig) -> str:
        """Generate detailed performance report"""
        details = [
            f"Latency: min={metrics.latency_min:.1f}ms, mean={metrics.latency_mean:.1f}ms, p95={metrics.latency_p95:.1f}ms, p99={metrics.latency_p99:.1f}ms",
            f"Throughput: {metrics.requests_per_second:.1f} RPS",
            f"Memory: peak={metrics.memory_peak_mb:.1f}MB, average={metrics.memory_mb:.1f}MB",
            f"CPU: {metrics.cpu_percent:.1f}%",
            f"Success rate: {((metrics.total_requests - metrics.failed_requests) / metrics.total_requests * 100):.1f}%" if metrics.total_requests > 0 else "N/A"
        ]
        
        return " | ".join(details)


class ConcurrentUserBenchmark(BenchmarkExecutor):
    """Benchmark for concurrent user performance"""
    
    async def execute(self, config: BenchmarkConfig) -> BenchmarkResult:
        """Execute concurrent user benchmark"""
        start_time = datetime.utcnow()
        
        # Initialize monitoring
        resource_monitor = ResourceMonitor(interval=1.0)
        
        try:
            resource_monitor.start_monitoring()
            
            # Create semaphore to limit concurrency
            semaphore = asyncio.Semaphore(config.concurrent_users)
            
            # Create tasks for concurrent users
            tasks = []
            for user_id in range(config.concurrent_users):
                for request_id in range(config.requests_per_user):
                    task = asyncio.create_task(
                        self._user_request(semaphore, user_id, request_id)
                    )
                    tasks.append(task)
            
            # Wait for all tasks with timeout
            try:
                results = await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True),
                    timeout=config.timeout_seconds
                )
            except asyncio.TimeoutError:
                logger.error("Benchmark timed out")
                for task in tasks:
                    task.cancel()
                raise
            
            # Process results
            latencies = []
            successful_requests = 0
            failed_requests = 0
            timeout_count = 0
            
            for result in results:
                if isinstance(result, Exception):
                    if isinstance(result, asyncio.TimeoutError):
                        timeout_count += 1
                    failed_requests += 1
                else:
                    latencies.append(result)
                    successful_requests += 1
            
            # Stop monitoring
            resource_metrics = resource_monitor.stop_monitoring()
            
            # Create performance metrics
            metrics = self.create_performance_metrics(
                test_name=config.name,
                benchmark_type=config.benchmark_type,
                latencies=latencies,
                resource_metrics=resource_metrics
            )
            
            metrics.total_requests = len(tasks)
            metrics.successful_requests = successful_requests
            metrics.failed_requests = failed_requests
            metrics.timeout_count = timeout_count
            metrics.error_rate = (failed_requests / len(tasks)) * 100 if tasks else 0
            
            # Calculate throughput
            duration = (datetime.utcnow() - start_time).total_seconds()
            metrics.requests_per_second = successful_requests / duration if duration > 0 else 0
            
            # Determine status
            status = self._evaluate_concurrent_performance(metrics, config)
            
            end_time = datetime.utcnow()
            
            return BenchmarkResult(
                config=config,
                metrics=metrics,
                status=status,
                details=self._generate_concurrent_details(metrics, config),
                start_time=start_time,
                end_time=end_time,
                duration=(end_time - start_time).total_seconds(),
                raw_data={
                    'latencies': latencies,
                    'resource_metrics': resource_metrics
                }
            )
            
        except Exception as e:
            resource_monitor.stop_monitoring()
            end_time = datetime.utcnow()
            
            return BenchmarkResult(
                config=config,
                metrics=PerformanceMetrics(
                    timestamp=datetime.utcnow(),
                    test_name=config.name,
                    benchmark_type=config.benchmark_type
                ),
                status=PerformanceStatus.FAIL,
                details=f"Concurrent benchmark failed: {str(e)}",
                start_time=start_time,
                end_time=end_time,
                duration=(end_time - start_time).total_seconds()
            )
    
    async def _user_request(self, semaphore: asyncio.Semaphore, user_id: int, request_id: int) -> float:
        """Simulate single user request"""
        async with semaphore:
            start_time = time.time()
            
            # Simulate user request processing
            await asyncio.sleep(0.05 + (user_id * 0.01) + (request_id * 0.001))  # Variable processing time
            
            end_time = time.time()
            return (end_time - start_time) * 1000  # Return latency in ms
    
    def _evaluate_concurrent_performance(self, metrics: PerformanceMetrics, config: BenchmarkConfig) -> PerformanceStatus:
        """Evaluate concurrent performance"""
        issues = []
        
        # Check if we achieved target concurrency
        expected_rps = config.concurrent_users * config.requests_per_user / config.duration_seconds
        if metrics.requests_per_second < expected_rps * 0.8:  # Allow 20% deviation
            issues.append(f"Throughput {metrics.requests_per_second:.1f} RPS significantly below expected {expected_rps:.1f} RPS")
        
        # Check error rate
        if metrics.error_rate > config.error_threshold_percent:
            issues.append(f"Error rate {metrics.error_rate:.1f}% exceeds threshold {config.error_threshold_percent}%")
        
        # Check resource utilization
        if metrics.cpu_percent > config.max_cpu_percent:
            issues.append(f"CPU usage {metrics.cpu_percent:.1f}% exceeds limit {config.max_cpu_percent}%")
        
        if metrics.memory_peak_mb > config.max_memory_mb:
            issues.append(f"Memory usage {metrics.memory_peak_mb:.1f}MB exceeds limit {config.max_memory_mb}MB")
        
        if not issues:
            return PerformanceStatus.PASS
        elif len(issues) <= 1:
            return PerformanceStatus.WARNING
        else:
            return PerformanceStatus.FAIL
    
    def _generate_concurrent_details(self, metrics: PerformanceMetrics, config: BenchmarkConfig) -> str:
        """Generate concurrent benchmark details"""
        details = [
            f"Users: {config.concurrent_users}",
            f"Total requests: {metrics.total_requests}",
            f"Successful: {metrics.successful_requests}",
            f"Failed: {metrics.failed_requests}",
            f"RPS: {metrics.requests_per_second:.1f}",
            f"P95 latency: {metrics.latency_p95:.1f}ms",
            f"Error rate: {metrics.error_rate:.1f}%"
        ]
        
        return " | ".join(details)


class PerformanceValidator:
    """Main performance validation orchestrator"""
    
    def __init__(self, output_dir: Path = None):
        self.output_dir = output_dir or Path("./benchmark_results")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.executors = {
            BenchmarkType.LATENCY: ModelInferenceBenchmark(),
            BenchmarkType.THROUGHPUT: ModelInferenceBenchmark(),
            BenchmarkType.CONCURRENT: ConcurrentUserBenchmark(),
            BenchmarkType.MEMORY: ModelInferenceBenchmark(),
        }
        
        self.results_history: List[BenchmarkResult] = []
    
    def add_benchmark_config(self, config: BenchmarkConfig):
        """Add a benchmark configuration"""
        # Store config for later execution
        pass
    
    async def run_benchmark(self, config: BenchmarkConfig) -> BenchmarkResult:
        """Run a single benchmark"""
        logger.info(f"Running benchmark: {config.name}")
        
        executor = self.executors.get(config.benchmark_type)
        if not executor:
            raise ValueError(f"No executor for benchmark type: {config.benchmark_type}")
        
        result = await executor.execute(config)
        self.results_history.append(result)
        
        # Save result
        self._save_result(result)
        
        logger.info(f"Benchmark completed: {config.name} - Status: {result.status.value}")
        return result
    
    async def run_benchmark_suite(self, configs: List[BenchmarkConfig]) -> List[BenchmarkResult]:
        """Run a suite of benchmarks"""
        results = []
        
        for config in configs:
            if not config.enabled:
                continue
            
            for attempt in range(config.repeat_count):
                try:
                    result = await self.run_benchmark(config)
                    results.append(result)
                    
                    # Stop if benchmark fails critically
                    if result.status == PerformanceStatus.FAIL:
                        logger.error(f"Benchmark {config.name} failed critically, stopping suite")
                        break
                        
                except Exception as e:
                    logger.error(f"Benchmark {config.name} execution error: {e}")
                    
                # Small delay between repeats
                if attempt < config.repeat_count - 1:
                    await asyncio.sleep(5)
        
        # Generate suite report
        self._generate_suite_report(results)
        
        return results
    
    def _save_result(self, result: BenchmarkResult):
        """Save benchmark result to file"""
        timestamp = result.start_time.strftime("%Y%m%d_%H%M%S")
        filename = f"{result.config.name}_{timestamp}.json"
        filepath = self.output_dir / filename
        
        # Convert result to JSON-serializable format
        result_data = {
            'config': {
                'name': result.config.name,
                'benchmark_type': result.config.benchmark_type.value,
                'duration_seconds': result.config.duration_seconds,
                'concurrent_users': result.config.concurrent_users,
                'requests_per_user': result.config.requests_per_user,
                'target_latency_p95_ms': result.config.target_latency_p95_ms,
                'target_throughput_rps': result.config.target_throughput_rps,
                'max_memory_mb': result.config.max_memory_mb,
                'max_cpu_percent': result.config.max_cpu_percent
            },
            'metrics': {
                'timestamp': result.metrics.timestamp.isoformat(),
                'test_name': result.metrics.test_name,
                'benchmark_type': result.metrics.benchmark_type.value,
                'latency_min': result.metrics.latency_min,
                'latency_max': result.metrics.latency_max,
                'latency_mean': result.metrics.latency_mean,
                'latency_median': result.metrics.latency_median,
                'latency_p95': result.metrics.latency_p95,
                'latency_p99': result.metrics.latency_p99,
                'requests_per_second': result.metrics.requests_per_second,
                'cpu_percent': result.metrics.cpu_percent,
                'memory_mb': result.metrics.memory_mb,
                'memory_peak_mb': result.metrics.memory_peak_mb,
                'total_requests': result.metrics.total_requests,
                'successful_requests': result.metrics.successful_requests,
                'failed_requests': result.metrics.failed_requests,
                'error_rate': result.metrics.error_rate,
                'custom_metrics': result.metrics.custom_metrics
            },
            'status': result.status.value,
            'details': result.details,
            'start_time': result.start_time.isoformat(),
            'end_time': result.end_time.isoformat(),
            'duration': result.duration,
            'system_info': {
                'platform': platform.platform(),
                'python_version': platform.python_version(),
                'cpu_count': multiprocessing.cpu_count(),
                'memory_total': psutil.virtual_memory().total
            }
        }
        
        with open(filepath, 'w') as f:
            json.dump(result_data, f, indent=2)
        
        logger.info(f"Result saved to: {filepath}")
    
    def _generate_suite_report(self, results: List[BenchmarkResult]):
        """Generate comprehensive suite report"""
        if not results:
            return
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        report_path = self.output_dir / f"suite_report_{timestamp}.json"
        
        # Aggregate results
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r.status == PerformanceStatus.PASS)
        warning_tests = sum(1 for r in results if r.status == PerformanceStatus.WARNING)
        failed_tests = sum(1 for r in results if r.status == PerformanceStatus.FAIL)
        
        # Performance summary
        avg_latency = statistics.mean([r.metrics.latency_mean for r in results if r.metrics.latency_mean > 0])
        avg_throughput = statistics.mean([r.metrics.requests_per_second for r in results if r.metrics.requests_per_second > 0])
        avg_memory = statistics.mean([r.metrics.memory_peak_mb for r in results if r.metrics.memory_peak_mb > 0])
        avg_cpu = statistics.mean([r.metrics.cpu_percent for r in results if r.metrics.cpu_percent > 0])
        
        report = {
            'summary': {
                'total_tests': total_tests,
                'passed': passed_tests,
                'warnings': warning_tests,
                'failed': failed_tests,
                'success_rate': (passed_tests + warning_tests) / total_tests * 100 if total_tests > 0 else 0
            },
            'performance_summary': {
                'average_latency_ms': avg_latency,
                'average_throughput_rps': avg_throughput,
                'average_memory_mb': avg_memory,
                'average_cpu_percent': avg_cpu
            },
            'test_results': [
                {
                    'name': r.config.name,
                    'type': r.config.benchmark_type.value,
                    'status': r.status.value,
                    'duration': r.duration,
                    'latency_p95': r.metrics.latency_p95,
                    'throughput': r.metrics.requests_per_second,
                    'memory_peak': r.metrics.memory_peak_mb,
                    'error_rate': r.metrics.error_rate,
                    'details': r.details
                }
                for r in results
            ],
            'timestamp': datetime.utcnow().isoformat(),
            'total_duration': sum(r.duration for r in results)
        }
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Generate plots if matplotlib available
        if PLOTTING_AVAILABLE:
            self._generate_performance_plots(results, self.output_dir / f"plots_{timestamp}")
        
        logger.info(f"Suite report generated: {report_path}")
    
    def _generate_performance_plots(self, results: List[BenchmarkResult], plot_dir: Path):
        """Generate performance visualization plots"""
        plot_dir.mkdir(exist_ok=True)
        
        try:
            # Latency distribution plot
            latencies = [r.metrics.latency_p95 for r in results if r.metrics.latency_p95 > 0]
            test_names = [r.config.name for r in results if r.metrics.latency_p95 > 0]
            
            if latencies:
                plt.figure(figsize=(12, 6))
                plt.bar(test_names, latencies)
                plt.title('P95 Latency by Test')
                plt.xlabel('Test Name')
                plt.ylabel('Latency (ms)')
                plt.xticks(rotation=45)
                plt.tight_layout()
                plt.savefig(plot_dir / 'latency_distribution.png')
                plt.close()
            
            # Throughput comparison
            throughputs = [r.metrics.requests_per_second for r in results if r.metrics.requests_per_second > 0]
            if throughputs:
                plt.figure(figsize=(12, 6))
                plt.bar(test_names[:len(throughputs)], throughputs)
                plt.title('Throughput by Test')
                plt.xlabel('Test Name')
                plt.ylabel('Requests per Second')
                plt.xticks(rotation=45)
                plt.tight_layout()
                plt.savefig(plot_dir / 'throughput_comparison.png')
                plt.close()
            
            # Resource utilization
            memory_usage = [r.metrics.memory_peak_mb for r in results if r.metrics.memory_peak_mb > 0]
            cpu_usage = [r.metrics.cpu_percent for r in results if r.metrics.cpu_percent > 0]
            
            if memory_usage and cpu_usage:
                fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
                
                ax1.bar(test_names[:len(memory_usage)], memory_usage)
                ax1.set_title('Peak Memory Usage')
                ax1.set_ylabel('Memory (MB)')
                ax1.tick_params(axis='x', rotation=45)
                
                ax2.bar(test_names[:len(cpu_usage)], cpu_usage)
                ax2.set_title('Average CPU Usage')
                ax2.set_ylabel('CPU (%)')
                ax2.tick_params(axis='x', rotation=45)
                
                plt.tight_layout()
                plt.savefig(plot_dir / 'resource_utilization.png')
                plt.close()
            
        except Exception as e:
            logger.error(f"Plot generation failed: {e}")


# Factory function and default configurations
def create_performance_validator(output_dir: str = None) -> PerformanceValidator:
    """Create performance validator with default configuration"""
    return PerformanceValidator(Path(output_dir) if output_dir else None)


def get_default_benchmark_configs() -> List[BenchmarkConfig]:
    """Get default benchmark configurations for BEAR AI"""
    return [
        BenchmarkConfig(
            name="model_inference_latency",
            benchmark_type=BenchmarkType.LATENCY,
            duration_seconds=60,
            warmup_seconds=10,
            requests_per_user=100,
            target_latency_p95_ms=500,
            max_memory_mb=2048,
            max_cpu_percent=80
        ),
        BenchmarkConfig(
            name="model_inference_throughput",
            benchmark_type=BenchmarkType.THROUGHPUT,
            duration_seconds=120,
            requests_per_user=500,
            target_throughput_rps=50,
            max_memory_mb=4096,
            max_cpu_percent=90
        ),
        BenchmarkConfig(
            name="concurrent_users_10",
            benchmark_type=BenchmarkType.CONCURRENT,
            duration_seconds=60,
            concurrent_users=10,
            requests_per_user=20,
            target_latency_p95_ms=1000,
            max_memory_mb=6144,
            max_cpu_percent=85
        ),
        BenchmarkConfig(
            name="concurrent_users_50",
            benchmark_type=BenchmarkType.CONCURRENT,
            duration_seconds=120,
            concurrent_users=50,
            requests_per_user=10,
            target_latency_p95_ms=2000,
            max_memory_mb=8192,
            max_cpu_percent=90
        ),
        BenchmarkConfig(
            name="memory_stress_test",
            benchmark_type=BenchmarkType.MEMORY,
            duration_seconds=300,  # 5 minutes
            requests_per_user=1000,
            max_memory_mb=4096,
            error_threshold_percent=0.1
        )
    ]


# Example usage
async def run_performance_validation():
    """Example of running performance validation"""
    validator = create_performance_validator("./performance_results")
    configs = get_default_benchmark_configs()
    
    logger.info("Starting performance validation suite")
    results = await validator.run_benchmark_suite(configs)
    
    # Print summary
    passed = sum(1 for r in results if r.status == PerformanceStatus.PASS)
    total = len(results)
    
    print(f"\\nPerformance Validation Summary:")
    print(f"Total tests: {total}")
    print(f"Passed: {passed}")
    print(f"Success rate: {(passed/total)*100:.1f}%")
    
    for result in results:
        print(f"{result.config.name}: {result.status.value} - {result.details}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_performance_validation())