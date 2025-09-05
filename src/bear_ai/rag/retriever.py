"""
Retrieval Strategies
Different approaches for retrieving relevant documents
"""

import asyncio
import logging
import re
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from collections import Counter

from .vector_store import VectorStore, VectorSearchResult, EmbeddingModel

logger = logging.getLogger(__name__)


class BaseRetriever(ABC):
    """Abstract base class for retrievers"""
    
    @abstractmethod
    async def retrieve(
        self,
        query: str,
        limit: int = 10,
        threshold: float = 0.3,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """Retrieve relevant documents for a query"""
        pass


class VectorRetriever(BaseRetriever):
    """Retriever using vector similarity search"""
    
    def __init__(self, vector_store: VectorStore, embedding_model: EmbeddingModel):
        self.vector_store = vector_store
        self.embedding_model = embedding_model
        
        logger.info("VectorRetriever initialized")
    
    async def retrieve(
        self,
        query: str,
        limit: int = 10,
        threshold: float = 0.3,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """Retrieve documents using vector similarity"""
        
        try:
            # Encode query
            query_embedding = self.embedding_model.encode(query)
            
            # Search vector store
            results = await self.vector_store.search(
                query_embedding=query_embedding,
                limit=limit,
                threshold=threshold,
                filter_metadata=filter_metadata
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Error in vector retrieval: {e}")
            return []


class KeywordRetriever(BaseRetriever):
    """Retriever using keyword/lexical matching"""
    
    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        
        # Simple stop words list
        self.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
        }
        
        logger.info("KeywordRetriever initialized")
    
    async def retrieve(
        self,
        query: str,
        limit: int = 10,
        threshold: float = 0.3,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """Retrieve documents using keyword matching"""
        
        try:
            # Get all vectors from store
            all_vectors = await self.vector_store.list_vectors(limit=1000)  # Adjust as needed
            
            if not all_vectors:
                return []
            
            # Extract query keywords
            query_keywords = self._extract_keywords(query)
            
            if not query_keywords:
                return []
            
            # Score documents based on keyword matching
            scored_results = []
            
            for vector in all_vectors:
                # Apply metadata filter if provided
                if filter_metadata:
                    if not all(vector.metadata.get(k) == v for k, v in filter_metadata.items()):
                        continue
                
                score = self._calculate_keyword_score(query_keywords, vector.content)
                
                if score >= threshold:
                    # Update the score
                    vector.score = score
                    scored_results.append(vector)
            
            # Sort by score and limit results
            scored_results.sort(key=lambda x: x.score, reverse=True)
            return scored_results[:limit]
            
        except Exception as e:
            logger.error(f"Error in keyword retrieval: {e}")
            return []
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text"""
        # Convert to lowercase and split into words
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Remove stop words and short words
        keywords = [word for word in words if word not in self.stop_words and len(word) > 2]
        
        return keywords
    
    def _calculate_keyword_score(self, query_keywords: List[str], content: str) -> float:
        """Calculate keyword matching score"""
        if not query_keywords:
            return 0.0
        
        # Extract content keywords
        content_keywords = self._extract_keywords(content)
        
        if not content_keywords:
            return 0.0
        
        # Count keyword frequencies
        content_counter = Counter(content_keywords)
        query_counter = Counter(query_keywords)
        
        # Calculate TF-IDF-like score
        score = 0.0
        total_query_terms = len(query_keywords)
        
        for keyword in query_keywords:
            if keyword in content_counter:
                # Term frequency in content
                tf = content_counter[keyword] / len(content_keywords)
                
                # Simple inverse document frequency approximation
                # (in a real implementation, you'd calculate this from the corpus)
                idf = 1.0  
                
                score += tf * idf
        
        # Normalize by query length
        return score / total_query_terms if total_query_terms > 0 else 0.0


class HybridRetriever(BaseRetriever):
    """Retriever combining vector and keyword approaches"""
    
    def __init__(
        self, 
        vector_store: VectorStore, 
        embedding_model: EmbeddingModel,
        vector_weight: float = 0.7,
        keyword_weight: float = 0.3
    ):
        self.vector_retriever = VectorRetriever(vector_store, embedding_model)
        self.keyword_retriever = KeywordRetriever(vector_store)
        
        self.vector_weight = vector_weight
        self.keyword_weight = keyword_weight
        
        # Normalize weights
        total_weight = vector_weight + keyword_weight
        self.vector_weight /= total_weight
        self.keyword_weight /= total_weight
        
        logger.info(f"HybridRetriever initialized (vector: {self.vector_weight:.2f}, keyword: {self.keyword_weight:.2f})")
    
    async def retrieve(
        self,
        query: str,
        limit: int = 10,
        threshold: float = 0.3,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """Retrieve documents using hybrid approach"""
        
        try:
            # Run both retrievers in parallel
            vector_results, keyword_results = await asyncio.gather(
                self.vector_retriever.retrieve(query, limit * 2, 0.0, filter_metadata),
                self.keyword_retriever.retrieve(query, limit * 2, 0.0, filter_metadata)
            )
            
            # Combine and re-score results
            combined_results = self._combine_results(vector_results, keyword_results)
            
            # Filter by threshold and limit
            filtered_results = [r for r in combined_results if r.score >= threshold]
            return filtered_results[:limit]
            
        except Exception as e:
            logger.error(f"Error in hybrid retrieval: {e}")
            return []
    
    def _combine_results(
        self, 
        vector_results: List[VectorSearchResult], 
        keyword_results: List[VectorSearchResult]
    ) -> List[VectorSearchResult]:
        """Combine and re-score results from both retrievers"""
        
        # Create lookup for vector scores
        vector_scores = {result.id: result.score for result in vector_results}
        keyword_scores = {result.id: result.score for result in keyword_results}
        
        # Get all unique document IDs
        all_ids = set(vector_scores.keys()) | set(keyword_scores.keys())
        
        # Create combined results
        combined_results = []
        
        # Create lookup for full result objects
        all_results = {}
        for result in vector_results + keyword_results:
            all_results[result.id] = result
        
        for doc_id in all_ids:
            if doc_id not in all_results:
                continue
            
            vector_score = vector_scores.get(doc_id, 0.0)
            keyword_score = keyword_scores.get(doc_id, 0.0)
            
            # Calculate combined score
            combined_score = (
                vector_score * self.vector_weight + 
                keyword_score * self.keyword_weight
            )
            
            # Create result with combined score
            result = all_results[doc_id]
            result.score = combined_score
            combined_results.append(result)
        
        # Sort by combined score
        combined_results.sort(key=lambda x: x.score, reverse=True)
        return combined_results


class SemanticRetriever(BaseRetriever):
    """Advanced semantic retriever with query expansion"""
    
    def __init__(self, vector_store: VectorStore, embedding_model: EmbeddingModel):
        self.vector_store = vector_store
        self.embedding_model = embedding_model
        
        # Query expansion terms
        self.synonyms = {
            'ai': ['artificial intelligence', 'machine learning', 'ml'],
            'ml': ['machine learning', 'artificial intelligence', 'ai'],
            'llm': ['large language model', 'language model'],
            'nlp': ['natural language processing', 'text processing'],
            'cv': ['computer vision', 'image processing'],
            'dl': ['deep learning', 'neural networks']
        }
        
        logger.info("SemanticRetriever initialized")
    
    async def retrieve(
        self,
        query: str,
        limit: int = 10,
        threshold: float = 0.3,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """Retrieve documents with semantic understanding and query expansion"""
        
        try:
            # Expand query with synonyms
            expanded_queries = self._expand_query(query)
            
            # Retrieve for each expanded query
            all_results = []
            
            for expanded_query in expanded_queries:
                query_embedding = self.embedding_model.encode(expanded_query)
                
                results = await self.vector_store.search(
                    query_embedding=query_embedding,
                    limit=limit,
                    threshold=threshold * 0.8,  # Lower threshold for expansion
                    filter_metadata=filter_metadata
                )
                
                all_results.extend(results)
            
            # Deduplicate and re-score
            return self._deduplicate_and_score(all_results, limit, threshold)
            
        except Exception as e:
            logger.error(f"Error in semantic retrieval: {e}")
            return []
    
    def _expand_query(self, query: str) -> List[str]:
        """Expand query with synonyms and related terms"""
        expanded = [query]  # Always include original query
        
        words = query.lower().split()
        
        for word in words:
            if word in self.synonyms:
                # Create expanded queries by replacing the word with synonyms
                for synonym in self.synonyms[word]:
                    expanded_query = query.lower().replace(word, synonym)
                    expanded.append(expanded_query)
        
        return expanded
    
    def _deduplicate_and_score(
        self, 
        results: List[VectorSearchResult], 
        limit: int, 
        threshold: float
    ) -> List[VectorSearchResult]:
        """Remove duplicates and combine scores"""
        
        # Group results by document ID
        doc_groups = {}
        
        for result in results:
            if result.id not in doc_groups:
                doc_groups[result.id] = []
            doc_groups[result.id].append(result)
        
        # Combine scores for duplicates
        final_results = []
        
        for doc_id, group in doc_groups.items():
            # Use the highest score among duplicates
            best_result = max(group, key=lambda x: x.score)
            
            # Optionally boost score based on multiple matches
            if len(group) > 1:
                boost = min(0.1 * (len(group) - 1), 0.3)  # Max 30% boost
                best_result.score = min(1.0, best_result.score + boost)
            
            if best_result.score >= threshold:
                final_results.append(best_result)
        
        # Sort and limit
        final_results.sort(key=lambda x: x.score, reverse=True)
        return final_results[:limit]


# Retriever factory
def get_retriever(
    strategy: str,
    vector_store: VectorStore,
    embedding_model: EmbeddingModel,
    **kwargs
) -> BaseRetriever:
    """Create a retriever based on strategy"""
    
    if strategy == "vector":
        return VectorRetriever(vector_store, embedding_model)
    
    elif strategy == "keyword":
        return KeywordRetriever(vector_store)
    
    elif strategy == "hybrid":
        vector_weight = kwargs.get('vector_weight', 0.7)
        keyword_weight = kwargs.get('keyword_weight', 0.3)
        return HybridRetriever(vector_store, embedding_model, vector_weight, keyword_weight)
    
    elif strategy == "semantic":
        return SemanticRetriever(vector_store, embedding_model)
    
    else:
        raise ValueError(f"Unknown retrieval strategy: {strategy}")


# Global retriever instances
_global_retrievers: Dict[str, BaseRetriever] = {}

def get_cached_retriever(
    strategy: str,
    vector_store: VectorStore,
    embedding_model: EmbeddingModel,
    **kwargs
) -> BaseRetriever:
    """Get cached retriever instance"""
    
    cache_key = f"{strategy}_{id(vector_store)}_{id(embedding_model)}"
    
    if cache_key not in _global_retrievers:
        _global_retrievers[cache_key] = get_retriever(
            strategy, vector_store, embedding_model, **kwargs
        )
    
    return _global_retrievers[cache_key]