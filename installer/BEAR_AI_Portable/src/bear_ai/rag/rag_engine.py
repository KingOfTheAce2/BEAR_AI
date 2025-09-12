"""
RAG Engine
Core Retrieval-Augmented Generation system
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union
import uuid

from .vector_store import VectorStore, VectorSearchResult, get_vector_store, get_embedding_model
from .document_processor import DocumentProcessor, ProcessedDocument, DocumentChunk, get_document_processor
from .retriever import BaseRetriever, VectorRetriever, get_retriever

logger = logging.getLogger(__name__)


@dataclass
class RAGConfig:
    """Configuration for RAG system"""
    # Retrieval settings
    max_results: int = 10
    similarity_threshold: float = 0.3
    chunk_size: int = 1000
    chunk_overlap: int = 200
    
    # Generation settings
    max_context_length: int = 4000
    context_window_ratio: float = 0.7  # Portion of context for retrieved docs
    
    # Vector store settings
    vector_store_type: str = "local"
    embedding_model: str = "all-MiniLM-L6-v2"
    
    # Retrieval strategy
    retrieval_strategy: str = "vector"  # "vector", "keyword", "hybrid"
    
    # Re-ranking
    enable_reranking: bool = False
    rerank_top_k: int = 20


@dataclass
class RAGResult:
    """Result from RAG query"""
    query: str
    answer: str
    retrieved_chunks: List[VectorSearchResult]
    context_used: str
    
    # Metadata
    retrieval_time: float = 0.0
    generation_time: float = 0.0
    total_time: float = 0.0
    model_used: Optional[str] = None
    
    # Statistics
    chunks_retrieved: int = 0
    total_context_chars: int = 0
    
    def get_sources(self) -> List[Dict[str, Any]]:
        """Get unique source documents"""
        sources = {}
        
        for chunk in self.retrieved_chunks:
            doc_id = chunk.metadata.get('document_id', 'unknown')
            if doc_id not in sources:
                sources[doc_id] = {
                    'document_id': doc_id,
                    'title': chunk.metadata.get('document_title', 'Unknown'),
                    'type': chunk.metadata.get('document_type', 'unknown'),
                    'chunks': []
                }
            
            sources[doc_id]['chunks'].append({
                'chunk_id': chunk.id,
                'chunk_index': chunk.metadata.get('chunk_index', 0),
                'score': chunk.score
            })
        
        return list(sources.values())


class RAGEngine:
    """Core RAG engine for document retrieval and generation"""
    
    def __init__(self, config: Optional[RAGConfig] = None):
        self.config = config or RAGConfig()
        
        # Initialize components
        self.vector_store = get_vector_store(self.config.vector_store_type)
        self.embedding_model = get_embedding_model(self.config.embedding_model)
        self.document_processor = get_document_processor()
        self.retriever = get_retriever(
            self.config.retrieval_strategy,
            vector_store=self.vector_store,
            embedding_model=self.embedding_model
        )
        
        # Document registry
        self.documents: Dict[str, ProcessedDocument] = {}
        
        logger.info("RAGEngine initialized")
    
    async def add_document(
        self,
        content: Union[str, ProcessedDocument],
        title: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **process_kwargs
    ) -> str:
        """Add a document to the RAG system"""
        
        start_time = time.time()
        
        try:
            # Process document if needed
            if isinstance(content, str):
                doc = await self.document_processor.process_document(
                    content=content,
                    title=title,
                    metadata=metadata,
                    chunk_size=self.config.chunk_size,
                    chunk_overlap=self.config.chunk_overlap,
                    **process_kwargs
                )
            elif isinstance(content, ProcessedDocument):
                doc = content
            else:
                raise ValueError("Content must be string or ProcessedDocument")
            
            # Store document
            self.documents[doc.id] = doc
            
            # Add chunks to vector store
            if doc.chunks:
                chunk_ids = [chunk.id for chunk in doc.chunks]
                chunk_contents = [chunk.content for chunk in doc.chunks]
                chunk_embeddings = self.embedding_model.encode(chunk_contents)
                chunk_metadata = [chunk.metadata for chunk in doc.chunks]
                
                success = await self.vector_store.add_vectors(
                    ids=chunk_ids,
                    embeddings=chunk_embeddings,
                    contents=chunk_contents,
                    metadata=chunk_metadata
                )
                
                if not success:
                    raise RuntimeError("Failed to add document chunks to vector store")
            
            processing_time = time.time() - start_time
            logger.info(f"Added document '{doc.title}' with {len(doc.chunks)} chunks in {processing_time:.2f}s")
            
            return doc.id
            
        except Exception as e:
            logger.error(f"Error adding document: {e}")
            raise
    
    async def query(
        self,
        query: str,
        max_results: Optional[int] = None,
        model_alias: Optional[str] = None,
        filter_metadata: Optional[Dict[str, Any]] = None,
        **generation_params
    ) -> RAGResult:
        """Query the RAG system"""
        
        start_time = time.time()
        max_results = max_results or self.config.max_results
        
        try:
            # Retrieve relevant chunks
            retrieval_start = time.time()
            
            retrieved_chunks = await self.retriever.retrieve(
                query=query,
                limit=max_results,
                threshold=self.config.similarity_threshold,
                filter_metadata=filter_metadata
            )
            
            retrieval_time = time.time() - retrieval_start
            
            # Re-rank if enabled
            if self.config.enable_reranking and len(retrieved_chunks) > self.config.rerank_top_k:
                retrieved_chunks = await self._rerank_chunks(query, retrieved_chunks)
            
            # Build context
            context = self._build_context(query, retrieved_chunks)
            
            # Generate response
            generation_start = time.time()
            answer = await self._generate_answer(query, context, model_alias, **generation_params)
            generation_time = time.time() - generation_start
            
            total_time = time.time() - start_time
            
            # Create result
            result = RAGResult(
                query=query,
                answer=answer,
                retrieved_chunks=retrieved_chunks,
                context_used=context,
                retrieval_time=retrieval_time,
                generation_time=generation_time,
                total_time=total_time,
                model_used=model_alias,
                chunks_retrieved=len(retrieved_chunks),
                total_context_chars=len(context)
            )
            
            logger.info(f"RAG query completed in {total_time:.2f}s "
                       f"(retrieval: {retrieval_time:.2f}s, generation: {generation_time:.2f}s)")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in RAG query: {e}")
            raise
    
    def _build_context(self, query: str, chunks: List[VectorSearchResult]) -> str:
        """Build context from retrieved chunks"""
        
        if not chunks:
            return ""
        
        context_parts = []
        current_length = 0
        max_context_chars = int(self.config.max_context_length * self.config.context_window_ratio)
        
        # Add query context
        context_parts.append(f"Query: {query}")
        context_parts.append("\nRelevant information:")
        
        for i, chunk in enumerate(chunks):
            chunk_text = f"\n[Source {i+1}] {chunk.content}"
            
            if current_length + len(chunk_text) > max_context_chars:
                break
            
            context_parts.append(chunk_text)
            current_length += len(chunk_text)
        
        return "".join(context_parts)
    
    async def _generate_answer(
        self,
        query: str,
        context: str,
        model_alias: Optional[str] = None,
        **generation_params
    ) -> str:
        """Generate answer using retrieved context"""
        
        try:
            from ..models import get_model_manager
            
            manager = get_model_manager()
            
            # Build prompt
            prompt = self._build_prompt(query, context)
            
            # Set default generation parameters
            default_params = {
                'max_tokens': 500,
                'temperature': 0.3,
                'top_p': 0.9
            }
            default_params.update(generation_params)
            
            # Generate response
            response = manager.generate_text(prompt, model_alias, **default_params)
            
            if not response:
                return "I couldn't generate a response based on the provided context."
            
            return response.strip()
            
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            return "I encountered an error while generating the response."
    
    def _build_prompt(self, query: str, context: str) -> str:
        """Build prompt for answer generation"""
        
        prompt_template = """Based on the following context, please answer the question. If the context doesn't contain enough information to answer the question, say so clearly.

{context}

Question: {query}

Answer:"""
        
        return prompt_template.format(context=context, query=query)
    
    async def _rerank_chunks(self, query: str, chunks: List[VectorSearchResult]) -> List[VectorSearchResult]:
        """Re-rank chunks for better relevance (placeholder implementation)"""
        
        # This is a simplified re-ranking based on query term overlap
        # In production, you might use a dedicated re-ranking model
        
        query_terms = set(query.lower().split())
        
        def rerank_score(chunk: VectorSearchResult) -> float:
            content_terms = set(chunk.content.lower().split())
            overlap = len(query_terms.intersection(content_terms))
            return (overlap / len(query_terms)) * 0.3 + chunk.score * 0.7
        
        # Re-score and sort
        for chunk in chunks:
            chunk.score = rerank_score(chunk)
        
        return sorted(chunks, key=lambda x: x.score, reverse=True)[:self.config.max_results]
    
    async def remove_document(self, document_id: str) -> bool:
        """Remove a document and its chunks"""
        
        try:
            if document_id not in self.documents:
                logger.warning(f"Document {document_id} not found")
                return False
            
            doc = self.documents[document_id]
            
            # Remove chunks from vector store
            if doc.chunks:
                chunk_ids = [chunk.id for chunk in doc.chunks]
                await self.vector_store.delete_vectors(chunk_ids)
            
            # Remove from registry
            del self.documents[document_id]
            
            logger.info(f"Removed document '{doc.title}' ({document_id})")
            return True
            
        except Exception as e:
            logger.error(f"Error removing document {document_id}: {e}")
            return False
    
    async def update_document(
        self,
        document_id: str,
        content: Union[str, ProcessedDocument],
        **kwargs
    ) -> bool:
        """Update an existing document"""
        
        try:
            # Remove old document
            await self.remove_document(document_id)
            
            # Add updated document
            new_doc_id = await self.add_document(content, **kwargs)
            
            # Update the document ID mapping if needed
            if new_doc_id != document_id and document_id in self.documents:
                self.documents[document_id] = self.documents.pop(new_doc_id)
                self.documents[document_id].id = document_id
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating document {document_id}: {e}")
            return False
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """List all documents in the system"""
        
        documents = []
        
        for doc in self.documents.values():
            documents.append({
                'id': doc.id,
                'title': doc.title,
                'type': doc.doc_type.value,
                'chunks': len(doc.chunks),
                'content_length': len(doc.content),
                'processed_at': doc.processed_at,
                'source_path': doc.source_path,
                'metadata': doc.metadata
            })
        
        return sorted(documents, key=lambda x: x['processed_at'], reverse=True)
    
    async def get_document_chunks(self, document_id: str) -> List[DocumentChunk]:
        """Get chunks for a specific document"""
        
        if document_id not in self.documents:
            return []
        
        return self.documents[document_id].chunks
    
    async def search_similar(
        self,
        text: str,
        limit: int = 10,
        threshold: float = 0.3,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """Search for similar text chunks"""
        
        return await self.retriever.retrieve(
            query=text,
            limit=limit,
            threshold=threshold,
            filter_metadata=filter_metadata
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics"""
        
        total_chunks = sum(len(doc.chunks) for doc in self.documents.values())
        total_content_chars = sum(len(doc.content) for doc in self.documents.values())
        
        return {
            'total_documents': len(self.documents),
            'total_chunks': total_chunks,
            'total_content_chars': total_content_chars,
            'avg_chunks_per_doc': total_chunks / len(self.documents) if self.documents else 0,
            'config': {
                'chunk_size': self.config.chunk_size,
                'chunk_overlap': self.config.chunk_overlap,
                'max_results': self.config.max_results,
                'similarity_threshold': self.config.similarity_threshold,
                'retrieval_strategy': self.config.retrieval_strategy
            }
        }


# Global RAG engine instance
_global_engine: Optional[RAGEngine] = None

def get_rag_engine(config: Optional[RAGConfig] = None) -> RAGEngine:
    """Get the global RAG engine"""
    global _global_engine
    if _global_engine is None:
        _global_engine = RAGEngine(config)
    return _global_engine

async def query_documents(
    query: str,
    max_results: Optional[int] = None,
    model_alias: Optional[str] = None,
    **kwargs
) -> RAGResult:
    """Query documents using RAG"""
    engine = get_rag_engine()
    return await engine.query(query, max_results, model_alias, **kwargs)

async def add_document(
    content: Union[str, ProcessedDocument],
    title: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    **kwargs
) -> str:
    """Add a document to the RAG system"""
    engine = get_rag_engine()
    return await engine.add_document(content, title, metadata, **kwargs)

def create_knowledge_base(config: Optional[RAGConfig] = None) -> RAGEngine:
    """Create a new knowledge base (RAG engine)"""
    return RAGEngine(config)