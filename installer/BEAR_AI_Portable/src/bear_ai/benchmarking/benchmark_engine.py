"""
Benchmark Engine
Core benchmarking system for model performance evaluation
"""

import asyncio
import json
import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union, Callable
import statistics

logger = logging.getLogger(__name__)


class BenchmarkStatus(Enum):
    """Status of benchmark execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BenchmarkType(Enum):
    """Types of benchmarks"""
    PERFORMANCE = "performance"
    QUALITY = "quality"
    ACCURACY = "accuracy"
    LATENCY = "latency"
    THROUGHPUT = "throughput"
    MEMORY = "memory"
    CUSTOM = "custom"


@dataclass
class BenchmarkConfig:
    """Configuration for benchmark execution"""
    name: str
    benchmark_type: BenchmarkType
    iterations: int = 10
    warmup_iterations: int = 2
    timeout: Optional[int] = None
    parallel_requests: int = 1
    
    # Model configuration
    models_to_test: List[str] = field(default_factory=list)
    generation_params: Dict[str, Any] = field(default_factory=dict)
    
    # Test configuration
    test_prompts: List[str] = field(default_factory=list)
    expected_outputs: List[Optional[str]] = field(default_factory=list)
    evaluation_criteria: Dict[str, Any] = field(default_factory=dict)
    
    # Output configuration
    save_results: bool = True
    detailed_logging: bool = False


@dataclass
class BenchmarkResult:
    """Results from a benchmark execution"""
    benchmark_id: str
    config: BenchmarkConfig
    model_alias: str
    status: BenchmarkStatus
    
    # Timing metrics
    start_time: float
    end_time: float
    total_duration: float
    
    # Performance metrics
    avg_latency: float = 0.0
    min_latency: float = 0.0
    max_latency: float = 0.0
    p95_latency: float = 0.0
    p99_latency: float = 0.0
    
    throughput: float = 0.0  # requests per second
    tokens_per_second: float = 0.0
    
    # Quality metrics
    avg_quality_score: float = 0.0
    accuracy_score: float = 0.0
    coherence_score: float = 0.0
    relevance_score: float = 0.0
    
    # Resource usage
    peak_memory_usage: float = 0.0  # MB
    avg_cpu_usage: float = 0.0
    
    # Detailed results
    individual_results: List[Dict[str, Any]] = field(default_factory=list)
    error_count: int = 0
    errors: List[str] = field(default_factory=list)
    
    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Benchmark:
    """Individual benchmark definition"""
    id: str
    name: str
    description: str
    benchmark_type: BenchmarkType
    
    # Test definition
    test_function: Optional[Callable] = None
    test_prompts: List[str] = field(default_factory=list)
    evaluation_function: Optional[Callable] = None
    
    # Configuration
    default_config: BenchmarkConfig = None
    
    def __post_init__(self):
        if self.default_config is None:
            self.default_config = BenchmarkConfig(
                name=self.name,
                benchmark_type=self.benchmark_type
            )


@dataclass
class BenchmarkSuite:
    """Collection of related benchmarks"""
    name: str
    description: str
    benchmarks: List[Benchmark] = field(default_factory=list)
    suite_config: Dict[str, Any] = field(default_factory=dict)
    
    def add_benchmark(self, benchmark: Benchmark):
        """Add a benchmark to the suite"""
        self.benchmarks.append(benchmark)
    
    def get_benchmark(self, benchmark_id: str) -> Optional[Benchmark]:
        """Get benchmark by ID"""
        return next((b for b in self.benchmarks if b.id == benchmark_id), None)


class BenchmarkEngine:
    """Engine for running model benchmarks"""
    
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        
        # Storage
        self.results_dir = Path.home() / ".bear_ai" / "benchmark_results"
        self.results_dir.mkdir(parents=True, exist_ok=True)
        
        # Benchmark registry
        self.benchmarks: Dict[str, Benchmark] = {}
        self.suites: Dict[str, BenchmarkSuite] = {}
        
        # Running benchmarks
        self.running_benchmarks: Dict[str, asyncio.Task] = {}
        
        # Initialize built-in benchmarks
        self._register_builtin_benchmarks()
        
        logger.info(f"BenchmarkEngine initialized with {max_workers} workers")
    
    def register_benchmark(self, benchmark: Benchmark):
        """Register a benchmark"""
        self.benchmarks[benchmark.id] = benchmark
        logger.info(f"Registered benchmark: {benchmark.name}")
    
    def register_suite(self, suite: BenchmarkSuite):
        """Register a benchmark suite"""
        self.suites[suite.name] = suite
        
        # Also register individual benchmarks
        for benchmark in suite.benchmarks:
            self.register_benchmark(benchmark)
        
        logger.info(f"Registered benchmark suite: {suite.name} with {len(suite.benchmarks)} benchmarks")
    
    async def run_benchmark(
        self,
        benchmark_id: str,
        models: List[str],
        config_overrides: Optional[Dict[str, Any]] = None
    ) -> Dict[str, BenchmarkResult]:
        """Run a benchmark on multiple models"""
        
        benchmark = self.benchmarks.get(benchmark_id)
        if not benchmark:
            raise ValueError(f"Benchmark {benchmark_id} not found")
        
        # Create configuration
        config = benchmark.default_config
        if config_overrides:
            # Apply overrides
            for key, value in config_overrides.items():
                setattr(config, key, value)
        
        config.models_to_test = models
        
        logger.info(f"Running benchmark '{benchmark.name}' on {len(models)} models")
        
        # Run benchmark for each model
        results = {}
        
        for model_alias in models:
            try:
                result = await self._run_single_model_benchmark(benchmark, model_alias, config)
                results[model_alias] = result
                
                if config.save_results:
                    await self._save_result(result)
                    
            except Exception as e:
                logger.error(f"Benchmark failed for model {model_alias}: {e}")
                
                # Create failed result
                failed_result = BenchmarkResult(
                    benchmark_id=str(uuid.uuid4()),
                    config=config,
                    model_alias=model_alias,
                    status=BenchmarkStatus.FAILED,
                    start_time=time.time(),
                    end_time=time.time(),
                    total_duration=0.0,
                    errors=[str(e)]
                )
                results[model_alias] = failed_result
        
        return results
    
    async def _run_single_model_benchmark(
        self,
        benchmark: Benchmark,
        model_alias: str,
        config: BenchmarkConfig
    ) -> BenchmarkResult:
        """Run benchmark on a single model"""
        
        benchmark_id = str(uuid.uuid4())
        start_time = time.time()
        
        result = BenchmarkResult(
            benchmark_id=benchmark_id,
            config=config,
            model_alias=model_alias,
            status=BenchmarkStatus.RUNNING,
            start_time=start_time,
            end_time=0.0,
            total_duration=0.0
        )
        
        try:
            from ..models import get_model_manager
            manager = get_model_manager()
            
            # Warmup iterations
            logger.info(f"Running {config.warmup_iterations} warmup iterations for {model_alias}")
            for _ in range(config.warmup_iterations):
                if config.test_prompts:
                    prompt = config.test_prompts[0]
                    manager.generate_text(prompt, model_alias, **config.generation_params)
            
            # Actual benchmark iterations
            logger.info(f"Running {config.iterations} benchmark iterations for {model_alias}")
            
            latencies = []
            token_counts = []
            quality_scores = []
            individual_results = []
            
            test_prompts = config.test_prompts or benchmark.test_prompts
            
            for i in range(config.iterations):
                # Select prompt for this iteration
                prompt_idx = i % len(test_prompts) if test_prompts else 0
                prompt = test_prompts[prompt_idx] if test_prompts else "Hello, how are you?"
                
                # Run generation
                iteration_start = time.time()
                
                try:
                    response = manager.generate_text(
                        prompt, 
                        model_alias, 
                        **config.generation_params
                    )
                    
                    iteration_end = time.time()
                    iteration_latency = iteration_end - iteration_start
                    
                    latencies.append(iteration_latency)
                    
                    # Estimate token count
                    token_count = len(response.split()) if response else 0
                    token_counts.append(token_count)
                    
                    # Evaluate quality if evaluator available
                    quality_score = 0.5  # Default neutral score
                    
                    if benchmark.evaluation_function:
                        try:
                            quality_score = benchmark.evaluation_function(prompt, response)
                        except Exception as e:
                            logger.warning(f"Quality evaluation failed: {e}")
                    
                    quality_scores.append(quality_score)
                    
                    individual_results.append({
                        'iteration': i,
                        'prompt': prompt,
                        'response': response,
                        'latency': iteration_latency,
                        'tokens': token_count,
                        'quality_score': quality_score
                    })
                    
                except Exception as e:
                    result.error_count += 1
                    result.errors.append(f"Iteration {i}: {str(e)}")
                    
                    individual_results.append({
                        'iteration': i,
                        'prompt': prompt,
                        'response': None,
                        'latency': 0.0,
                        'tokens': 0,
                        'quality_score': 0.0,
                        'error': str(e)
                    })
            
            # Calculate metrics
            if latencies:
                result.avg_latency = statistics.mean(latencies)
                result.min_latency = min(latencies)
                result.max_latency = max(latencies)
                
                sorted_latencies = sorted(latencies)
                n = len(sorted_latencies)
                result.p95_latency = sorted_latencies[int(n * 0.95)] if n > 0 else 0.0
                result.p99_latency = sorted_latencies[int(n * 0.99)] if n > 0 else 0.0
                
                # Calculate throughput
                total_time = sum(latencies)
                result.throughput = len(latencies) / total_time if total_time > 0 else 0.0
            
            if token_counts:
                total_tokens = sum(token_counts)
                total_time = sum(latencies) if latencies else 1.0
                result.tokens_per_second = total_tokens / total_time
            
            if quality_scores:
                result.avg_quality_score = statistics.mean(quality_scores)
            
            result.individual_results = individual_results
            result.status = BenchmarkStatus.COMPLETED
            
            end_time = time.time()
            result.end_time = end_time
            result.total_duration = end_time - start_time
            
            logger.info(f"Benchmark completed for {model_alias}: "
                       f"avg_latency={result.avg_latency:.3f}s, "
                       f"throughput={result.throughput:.2f}req/s, "
                       f"quality={result.avg_quality_score:.3f}")
            
            return result
            
        except Exception as e:
            result.status = BenchmarkStatus.FAILED
            result.errors.append(str(e))
            result.end_time = time.time()
            result.total_duration = result.end_time - result.start_time
            
            logger.error(f"Benchmark failed for {model_alias}: {e}")
            raise
    
    async def run_suite(
        self,
        suite_name: str,
        models: List[str],
        config_overrides: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Dict[str, BenchmarkResult]]:
        """Run all benchmarks in a suite"""
        
        suite = self.suites.get(suite_name)
        if not suite:
            raise ValueError(f"Benchmark suite {suite_name} not found")
        
        logger.info(f"Running benchmark suite '{suite_name}' with {len(suite.benchmarks)} benchmarks")
        
        suite_results = {}
        
        for benchmark in suite.benchmarks:
            try:
                benchmark_results = await self.run_benchmark(
                    benchmark.id,
                    models,
                    config_overrides
                )
                suite_results[benchmark.id] = benchmark_results
                
            except Exception as e:
                logger.error(f"Suite benchmark {benchmark.id} failed: {e}")
                suite_results[benchmark.id] = {}
        
        return suite_results
    
    def compare_models(
        self,
        results: Dict[str, BenchmarkResult],
        metrics: List[str] = None
    ) -> Dict[str, Any]:
        """Compare model performance across multiple metrics"""
        
        if not results:
            return {}
        
        default_metrics = ['avg_latency', 'throughput', 'avg_quality_score', 'tokens_per_second']
        metrics = metrics or default_metrics
        
        comparison = {
            'models': list(results.keys()),
            'metrics': {},
            'rankings': {},
            'summary': {}
        }
        
        # Extract metrics for each model
        for metric in metrics:
            comparison['metrics'][metric] = {}
            metric_values = []
            
            for model_name, result in results.items():
                value = getattr(result, metric, 0.0)
                comparison['metrics'][metric][model_name] = value
                metric_values.append((model_name, value))
            
            # Create rankings (higher is better for most metrics except latency)
            if 'latency' in metric.lower():
                # Lower is better for latency
                ranked = sorted(metric_values, key=lambda x: x[1])
            else:
                # Higher is better for other metrics
                ranked = sorted(metric_values, key=lambda x: x[1], reverse=True)
            
            comparison['rankings'][metric] = [model for model, _ in ranked]
        
        # Calculate overall summary
        model_scores = {model: 0 for model in results.keys()}
        
        for metric, rankings in comparison['rankings'].items():
            for i, model in enumerate(rankings):
                # Award points based on ranking (first place gets most points)
                points = len(rankings) - i
                model_scores[model] += points
        
        # Overall ranking
        overall_ranking = sorted(model_scores.items(), key=lambda x: x[1], reverse=True)
        comparison['summary']['overall_ranking'] = [model for model, _ in overall_ranking]
        comparison['summary']['model_scores'] = model_scores
        
        return comparison
    
    def _register_builtin_benchmarks(self):
        """Register built-in benchmarks"""
        
        # Latency benchmark
        latency_benchmark = Benchmark(
            id="latency_test",
            name="Latency Benchmark",
            description="Measures response latency for simple prompts",
            benchmark_type=BenchmarkType.LATENCY,
            test_prompts=[
                "Hello, how are you?",
                "What is 2 + 2?",
                "Tell me a joke.",
                "Explain photosynthesis briefly.",
                "What's the capital of France?"
            ]
        )
        
        latency_benchmark.default_config = BenchmarkConfig(
            name="Latency Benchmark",
            benchmark_type=BenchmarkType.LATENCY,
            iterations=20,
            warmup_iterations=5,
            generation_params={"max_tokens": 100, "temperature": 0.7}
        )
        
        # Throughput benchmark  
        throughput_benchmark = Benchmark(
            id="throughput_test",
            name="Throughput Benchmark",
            description="Measures request throughput and tokens per second",
            benchmark_type=BenchmarkType.THROUGHPUT,
            test_prompts=[
                "Write a short paragraph about artificial intelligence.",
                "Describe the water cycle in 3-4 sentences.",
                "Explain machine learning to a beginner.",
                "What are the benefits of renewable energy?",
                "Summarize the main themes of climate change."
            ]
        )
        
        throughput_benchmark.default_config = BenchmarkConfig(
            name="Throughput Benchmark",
            benchmark_type=BenchmarkType.THROUGHPUT,
            iterations=15,
            warmup_iterations=3,
            parallel_requests=1,
            generation_params={"max_tokens": 200, "temperature": 0.5}
        )
        
        # Quality benchmark
        quality_benchmark = Benchmark(
            id="quality_test",
            name="Quality Benchmark",
            description="Evaluates response quality and coherence",
            benchmark_type=BenchmarkType.QUALITY,
            test_prompts=[
                "Explain the concept of machine learning in simple terms.",
                "What are the main causes of climate change?",
                "Describe the process of photosynthesis.",
                "What is the significance of the Renaissance period?",
                "How does the human immune system work?"
            ],
            evaluation_function=self._basic_quality_evaluator
        )
        
        quality_benchmark.default_config = BenchmarkConfig(
            name="Quality Benchmark",
            benchmark_type=BenchmarkType.QUALITY,
            iterations=10,
            warmup_iterations=2,
            generation_params={"max_tokens": 300, "temperature": 0.3}
        )
        
        # Register benchmarks
        self.register_benchmark(latency_benchmark)
        self.register_benchmark(throughput_benchmark)
        self.register_benchmark(quality_benchmark)
        
        # Create standard suite
        standard_suite = BenchmarkSuite(
            name="standard",
            description="Standard benchmark suite covering latency, throughput, and quality",
            benchmarks=[latency_benchmark, throughput_benchmark, quality_benchmark]
        )
        
        self.register_suite(standard_suite)
    
    def _basic_quality_evaluator(self, prompt: str, response: str) -> float:
        """Basic quality evaluation function"""
        if not response or not response.strip():
            return 0.0
        
        score = 0.5  # Base score
        
        # Length check
        if len(response) > 20:
            score += 0.1
        
        # Contains relevant words from prompt
        prompt_words = set(prompt.lower().split())
        response_words = set(response.lower().split())
        
        overlap = len(prompt_words.intersection(response_words))
        if overlap > 0:
            score += min(overlap * 0.05, 0.2)
        
        # Coherence check (simple heuristic)
        sentences = response.split('.')
        if len(sentences) > 1:
            score += 0.1
        
        # Grammar check (very basic)
        if response[0].isupper() and response.endswith('.'):
            score += 0.1
        
        return min(score, 1.0)
    
    async def _save_result(self, result: BenchmarkResult):
        """Save benchmark result to disk"""
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{result.model_alias}_{result.config.name}_{timestamp}.json"
        filepath = self.results_dir / filename
        
        result_data = {
            'benchmark_id': result.benchmark_id,
            'model_alias': result.model_alias,
            'config': {
                'name': result.config.name,
                'benchmark_type': result.config.benchmark_type.value,
                'iterations': result.config.iterations,
                'generation_params': result.config.generation_params
            },
            'status': result.status.value,
            'timing': {
                'start_time': result.start_time,
                'end_time': result.end_time,
                'total_duration': result.total_duration
            },
            'performance': {
                'avg_latency': result.avg_latency,
                'min_latency': result.min_latency,
                'max_latency': result.max_latency,
                'p95_latency': result.p95_latency,
                'p99_latency': result.p99_latency,
                'throughput': result.throughput,
                'tokens_per_second': result.tokens_per_second
            },
            'quality': {
                'avg_quality_score': result.avg_quality_score,
                'accuracy_score': result.accuracy_score,
                'coherence_score': result.coherence_score,
                'relevance_score': result.relevance_score
            },
            'errors': {
                'error_count': result.error_count,
                'errors': result.errors
            },
            'individual_results': result.individual_results
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, indent=2, ensure_ascii=False, default=str)
        
        logger.info(f"Saved benchmark result to {filepath}")
    
    def list_benchmarks(self) -> List[Dict[str, Any]]:
        """List available benchmarks"""
        return [
            {
                'id': benchmark.id,
                'name': benchmark.name,
                'description': benchmark.description,
                'type': benchmark.benchmark_type.value
            }
            for benchmark in self.benchmarks.values()
        ]
    
    def list_suites(self) -> List[Dict[str, Any]]:
        """List available benchmark suites"""
        return [
            {
                'name': suite.name,
                'description': suite.description,
                'benchmark_count': len(suite.benchmarks)
            }
            for suite in self.suites.values()
        ]
    
    def cleanup(self):
        """Cleanup resources"""
        self.executor.shutdown(wait=True)
        logger.info("BenchmarkEngine cleaned up")


# Global benchmark engine instance
_global_engine: Optional[BenchmarkEngine] = None

def get_benchmark_engine() -> BenchmarkEngine:
    """Get the global benchmark engine"""
    global _global_engine
    if _global_engine is None:
        _global_engine = BenchmarkEngine()
    return _global_engine

async def run_benchmark(
    benchmark_id: str,
    models: List[str],
    config_overrides: Optional[Dict[str, Any]] = None
) -> Dict[str, BenchmarkResult]:
    """Run a benchmark"""
    return await get_benchmark_engine().run_benchmark(benchmark_id, models, config_overrides)

def compare_models(
    results: Dict[str, BenchmarkResult],
    metrics: List[str] = None
) -> Dict[str, Any]:
    """Compare model performance"""
    return get_benchmark_engine().compare_models(results, metrics)