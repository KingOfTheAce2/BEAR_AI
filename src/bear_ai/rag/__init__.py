"""
BEAR AI Advanced RAG System
Retrieval-Augmented Generation with Vector Search
"""

from .rag_engine import (
    RAGEngine,
    RAGConfig,
    RAGResult,
    DocumentChunk,
    get_rag_engine,
    query_documents,
    add_document,
    create_knowledge_base
)

from .vector_store import (
    VectorStore,
    VectorSearchResult,
    EmbeddingModel,
    LocalVectorStore,
    ChromaVectorStore,
    get_vector_store
)

from .document_processor import (
    DocumentProcessor,
    DocumentType,
    ProcessedDocument,
    TextSplitter,
    get_document_processor,
    process_document,
    extract_text
)

from .retriever import (
    BaseRetriever,
    VectorRetriever,
    HybridRetriever,
    KeywordRetriever,
    get_retriever
)

from .knowledge_base import (
    KnowledgeBase,
    KnowledgeGraph,
    EntityExtractor,
    get_knowledge_base
)

__all__ = [
    'RAGEngine',
    'RAGConfig', 
    'RAGResult',
    'DocumentChunk',
    'get_rag_engine',
    'query_documents',
    'add_document',
    'create_knowledge_base',
    'VectorStore',
    'VectorSearchResult',
    'EmbeddingModel',
    'LocalVectorStore',
    'ChromaVectorStore',
    'get_vector_store',
    'DocumentProcessor',
    'DocumentType',
    'ProcessedDocument',
    'TextSplitter',
    'get_document_processor',
    'process_document',
    'extract_text',
    'BaseRetriever',
    'VectorRetriever',
    'HybridRetriever',
    'KeywordRetriever',
    'get_retriever',
    'KnowledgeBase',
    'KnowledgeGraph',
    'EntityExtractor',
    'get_knowledge_base'
]