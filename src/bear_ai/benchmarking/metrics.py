"""
Metrics Calculation System
Advanced metrics for model performance evaluation
"""

import logging
import re
import statistics
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union
import math

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetrics:
    """Performance-related metrics"""
    avg_latency: float = 0.0
    min_latency: float = 0.0
    max_latency: float = 0.0
    p50_latency: float = 0.0
    p90_latency: float = 0.0
    p95_latency: float = 0.0
    p99_latency: float = 0.0
    
    throughput: float = 0.0  # requests per second
    tokens_per_second: float = 0.0
    
    memory_usage: float = 0.0  # MB
    cpu_usage: float = 0.0  # percentage
    
    success_rate: float = 1.0
    error_rate: float = 0.0


@dataclass
class QualityMetrics:
    """Quality-related metrics"""
    coherence_score: float = 0.0
    relevance_score: float = 0.0
    factuality_score: float = 0.0
    fluency_score: float = 0.0
    completeness_score: float = 0.0
    
    # Specific quality measures
    readability_score: float = 0.0
    sentiment_consistency: float = 0.0
    grammar_score: float = 0.0
    
    # Overall quality
    composite_quality: float = 0.0


@dataclass
class TokenMetrics:
    """Token-related metrics"""
    avg_input_tokens: float = 0.0
    avg_output_tokens: float = 0.0
    total_tokens: int = 0
    
    token_efficiency: float = 0.0  # meaningful tokens / total tokens
    compression_ratio: float = 0.0  # output tokens / input tokens
    
    # Cost estimation (if pricing available)
    estimated_cost: float = 0.0


@dataclass
class LatencyMetrics:
    """Detailed latency breakdown"""
    time_to_first_token: float = 0.0
    time_between_tokens: float = 0.0
    processing_time: float = 0.0
    network_overhead: float = 0.0
    
    # Distribution statistics
    latency_std_dev: float = 0.0
    latency_variance: float = 0.0
    latency_coefficient_variation: float = 0.0


class MetricCalculator:
    """Calculates various metrics from benchmark results"""
    
    def __init__(self):
        # Weights for composite scores
        self.quality_weights = {
            'coherence': 0.25,
            'relevance': 0.25,
            'factuality': 0.20,
            'fluency': 0.15,
            'completeness': 0.15
        }
        
        # Token pricing (example rates - would be configurable)
        self.token_pricing = {
            'input': 0.0001,  # per 1000 tokens
            'output': 0.0002  # per 1000 tokens
        }
        
        logger.info("MetricCalculator initialized")
    
    def calculate_performance_metrics(
        self,
        latencies: List[float],
        token_counts: List[int],
        error_count: int = 0
    ) -> PerformanceMetrics:
        """Calculate performance metrics from raw data"""
        
        if not latencies:
            return PerformanceMetrics()
        
        # Basic latency statistics
        sorted_latencies = sorted(latencies)
        n = len(sorted_latencies)
        
        metrics = PerformanceMetrics(
            avg_latency=statistics.mean(latencies),
            min_latency=min(latencies),
            max_latency=max(latencies),
            p50_latency=self._percentile(sorted_latencies, 0.50),
            p90_latency=self._percentile(sorted_latencies, 0.90),
            p95_latency=self._percentile(sorted_latencies, 0.95),
            p99_latency=self._percentile(sorted_latencies, 0.99)
        )
        
        # Throughput calculation
        total_time = sum(latencies)
        if total_time > 0:
            metrics.throughput = len(latencies) / total_time
        
        # Tokens per second
        if token_counts and total_time > 0:
            total_tokens = sum(token_counts)
            metrics.tokens_per_second = total_tokens / total_time
        
        # Error rates
        total_requests = len(latencies) + error_count
        if total_requests > 0:
            metrics.success_rate = len(latencies) / total_requests
            metrics.error_rate = error_count / total_requests
        
        return metrics
    
    def calculate_quality_metrics(
        self,
        prompts: List[str],
        responses: List[str],
        reference_responses: Optional[List[str]] = None
    ) -> QualityMetrics:
        """Calculate quality metrics for responses"""
        
        if not responses:
            return QualityMetrics()
        
        coherence_scores = []
        relevance_scores = []
        factuality_scores = []
        fluency_scores = []
        completeness_scores = []
        
        for i, response in enumerate(responses):
            if not response:
                # Empty response gets zero scores
                coherence_scores.append(0.0)
                relevance_scores.append(0.0)
                factuality_scores.append(0.0)
                fluency_scores.append(0.0)
                completeness_scores.append(0.0)
                continue
            
            # Calculate individual quality scores
            prompt = prompts[i] if i < len(prompts) else ""
            reference = reference_responses[i] if reference_responses and i < len(reference_responses) else None
            
            coherence_scores.append(self._calculate_coherence(response))
            relevance_scores.append(self._calculate_relevance(prompt, response))
            factuality_scores.append(self._calculate_factuality(response))
            fluency_scores.append(self._calculate_fluency(response))
            completeness_scores.append(self._calculate_completeness(prompt, response, reference))
        
        # Calculate average scores
        metrics = QualityMetrics(
            coherence_score=statistics.mean(coherence_scores) if coherence_scores else 0.0,
            relevance_score=statistics.mean(relevance_scores) if relevance_scores else 0.0,
            factuality_score=statistics.mean(factuality_scores) if factuality_scores else 0.0,
            fluency_score=statistics.mean(fluency_scores) if fluency_scores else 0.0,
            completeness_score=statistics.mean(completeness_scores) if completeness_scores else 0.0
        )
        
        # Additional quality metrics
        metrics.readability_score = self._calculate_readability(responses)
        metrics.grammar_score = self._calculate_grammar_quality(responses)
        
        # Composite quality score
        metrics.composite_quality = (
            metrics.coherence_score * self.quality_weights['coherence'] +
            metrics.relevance_score * self.quality_weights['relevance'] +
            metrics.factuality_score * self.quality_weights['factuality'] +
            metrics.fluency_score * self.quality_weights['fluency'] +
            metrics.completeness_score * self.quality_weights['completeness']
        )
        
        return metrics
    
    def calculate_token_metrics(
        self,
        input_tokens: List[int],
        output_tokens: List[int]
    ) -> TokenMetrics:
        """Calculate token-related metrics"""
        
        if not input_tokens or not output_tokens:
            return TokenMetrics()
        
        metrics = TokenMetrics(
            avg_input_tokens=statistics.mean(input_tokens),
            avg_output_tokens=statistics.mean(output_tokens),
            total_tokens=sum(input_tokens) + sum(output_tokens)
        )
        
        # Token efficiency (placeholder - would need more sophisticated analysis)
        metrics.token_efficiency = 0.8  # Assume 80% efficiency for now
        
        # Compression ratio
        if metrics.avg_input_tokens > 0:
            metrics.compression_ratio = metrics.avg_output_tokens / metrics.avg_input_tokens
        
        # Cost estimation
        total_input_tokens = sum(input_tokens)
        total_output_tokens = sum(output_tokens)
        
        input_cost = (total_input_tokens / 1000) * self.token_pricing['input']
        output_cost = (total_output_tokens / 1000) * self.token_pricing['output']
        
        metrics.estimated_cost = input_cost + output_cost
        
        return metrics
    
    def calculate_latency_metrics(self, latencies: List[float]) -> LatencyMetrics:
        """Calculate detailed latency metrics"""
        
        if not latencies:
            return LatencyMetrics()
        
        # Basic statistics
        mean_latency = statistics.mean(latencies)
        
        metrics = LatencyMetrics()
        
        if len(latencies) > 1:
            metrics.latency_std_dev = statistics.stdev(latencies)
            metrics.latency_variance = statistics.variance(latencies)
            
            if mean_latency > 0:
                metrics.latency_coefficient_variation = metrics.latency_std_dev / mean_latency
        
        # Placeholder for more detailed latency breakdown
        # In practice, this would require instrumentation of the generation process
        metrics.processing_time = mean_latency * 0.8  # Assume 80% is processing
        metrics.network_overhead = mean_latency * 0.2  # Assume 20% is network
        
        return metrics
    
    def _percentile(self, sorted_values: List[float], percentile: float) -> float:
        """Calculate percentile from sorted values"""
        if not sorted_values:
            return 0.0
        
        k = (len(sorted_values) - 1) * percentile
        f = math.floor(k)
        c = math.ceil(k)
        
        if f == c:
            return sorted_values[int(k)]
        
        d0 = sorted_values[int(f)] * (c - k)
        d1 = sorted_values[int(c)] * (k - f)
        
        return d0 + d1
    
    def _calculate_coherence(self, response: str) -> float:
        """Calculate coherence score for a response"""
        if not response or len(response.strip()) < 10:
            return 0.0
        
        # Simple coherence heuristics
        score = 0.5  # Base score
        
        # Sentence structure check
        sentences = re.split(r'[.!?]+', response)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if len(sentences) >= 2:
            score += 0.2
        
        # Paragraph structure
        paragraphs = response.split('\n\n')
        if len(paragraphs) > 1:
            score += 0.1
        
        # Check for logical connectors
        connectors = ['therefore', 'however', 'moreover', 'furthermore', 'consequently', 
                     'additionally', 'similarly', 'in contrast', 'for example']
        
        connector_count = sum(1 for conn in connectors if conn in response.lower())
        score += min(connector_count * 0.05, 0.2)
        
        return min(score, 1.0)
    
    def _calculate_relevance(self, prompt: str, response: str) -> float:
        """Calculate relevance score between prompt and response"""
        if not prompt or not response:
            return 0.0
        
        prompt_words = set(prompt.lower().split())
        response_words = set(response.lower().split())
        
        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'}
        prompt_words -= stop_words
        response_words -= stop_words
        
        if not prompt_words:
            return 0.5
        
        # Calculate word overlap
        overlap = len(prompt_words.intersection(response_words))
        relevance = overlap / len(prompt_words)
        
        return min(relevance * 2, 1.0)  # Scale up since word overlap tends to be low
    
    def _calculate_factuality(self, response: str) -> float:
        """Calculate factuality score (simplified)"""
        if not response:
            return 0.0
        
        # This would ideally use fact-checking APIs or knowledge bases
        # For now, use simple heuristics
        
        score = 0.5  # Neutral baseline
        
        # Penalize uncertain language
        uncertainty_words = ['maybe', 'perhaps', 'might', 'could be', 'possibly', 'allegedly']
        uncertainty_count = sum(1 for word in uncertainty_words if word in response.lower())
        score -= min(uncertainty_count * 0.1, 0.2)
        
        # Bonus for specific facts (numbers, dates, proper nouns)
        specific_facts = len(re.findall(r'\b\d+\b|\b[A-Z][a-z]+\b|\b\d{4}\b', response))
        score += min(specific_facts * 0.05, 0.3)
        
        return max(min(score, 1.0), 0.0)
    
    def _calculate_fluency(self, response: str) -> float:
        """Calculate fluency score"""
        if not response:
            return 0.0
        
        score = 0.5
        
        # Grammar check (very basic)
        sentences = re.split(r'[.!?]+', response)
        well_formed = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            # Check basic grammar rules
            if sentence[0].isupper() and len(sentence.split()) >= 3:
                well_formed += 1
        
        if sentences:
            grammar_score = well_formed / len([s for s in sentences if s.strip()])
            score += grammar_score * 0.3
        
        # Check for repeated words
        words = response.lower().split()
        if len(words) > 0:
            unique_ratio = len(set(words)) / len(words)
            score += unique_ratio * 0.2
        
        return min(score, 1.0)
    
    def _calculate_completeness(self, prompt: str, response: str, reference: Optional[str] = None) -> float:
        """Calculate completeness score"""
        if not response:
            return 0.0
        
        # Base completeness on response length relative to expectation
        expected_length = max(len(prompt) * 2, 100)  # Expect response to be at least 2x prompt length
        actual_length = len(response)
        
        length_score = min(actual_length / expected_length, 1.0)
        
        # If reference available, compare coverage
        if reference:
            reference_words = set(reference.lower().split())
            response_words = set(response.lower().split())
            
            if reference_words:
                coverage = len(reference_words.intersection(response_words)) / len(reference_words)
                return (length_score * 0.5) + (coverage * 0.5)
        
        return length_score
    
    def _calculate_readability(self, responses: List[str]) -> float:
        """Calculate average readability score"""
        if not responses:
            return 0.0
        
        readability_scores = []
        
        for response in responses:
            if not response:
                readability_scores.append(0.0)
                continue
            
            # Simple readability heuristic based on sentence and word length
            sentences = re.split(r'[.!?]+', response)
            sentences = [s.strip() for s in sentences if s.strip()]
            
            if not sentences:
                readability_scores.append(0.0)
                continue
            
            # Average sentence length
            total_words = len(response.split())
            avg_sentence_length = total_words / len(sentences) if sentences else 0
            
            # Average word length
            words = response.split()
            avg_word_length = sum(len(word) for word in words) / len(words) if words else 0
            
            # Simple readability score (lower sentence/word length = higher readability)
            sentence_factor = max(1.0 - (avg_sentence_length - 15) * 0.02, 0.0)
            word_factor = max(1.0 - (avg_word_length - 5) * 0.1, 0.0)
            
            readability = (sentence_factor + word_factor) / 2
            readability_scores.append(readability)
        
        return statistics.mean(readability_scores)
    
    def _calculate_grammar_quality(self, responses: List[str]) -> float:
        """Calculate average grammar quality score"""
        if not responses:
            return 0.0
        
        grammar_scores = []
        
        for response in responses:
            if not response:
                grammar_scores.append(0.0)
                continue
            
            score = 0.5  # Base score
            
            # Check capitalization
            sentences = re.split(r'[.!?]+', response)
            properly_capitalized = sum(1 for s in sentences if s.strip() and s.strip()[0].isupper())
            
            if sentences:
                cap_ratio = properly_capitalized / len([s for s in sentences if s.strip()])
                score += cap_ratio * 0.2
            
            # Check punctuation
            if response.endswith('.') or response.endswith('!') or response.endswith('?'):
                score += 0.1
            
            # Check for basic sentence structure
            words = response.split()
            if len(words) >= 3:  # Minimum viable sentence
                score += 0.2
            
            grammar_scores.append(min(score, 1.0))
        
        return statistics.mean(grammar_scores)


# Global metric calculator instance
_global_calculator: Optional[MetricCalculator] = None

def get_metric_calculator() -> MetricCalculator:
    """Get the global metric calculator"""
    global _global_calculator
    if _global_calculator is None:
        _global_calculator = MetricCalculator()
    return _global_calculator