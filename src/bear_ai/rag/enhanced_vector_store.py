"""
Enhanced Vector Store Implementation with Advanced Indexing
High-performance vector storage and similarity search optimized for legal documents

Features:
- HNSW, IVF, and FAISS indexing support
- Concurrent access with read-write locks
- Advanced caching and memory management
- Real-time performance monitoring
- Batch operations for efficiency
- Document chunking and preprocessing

@version 3.0.0
@author BEAR AI Performance Team
"""

import json
import logging
import numpy as np
import pickle
import threading
import time
import uuid
import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from collections import deque, OrderedDict
import sqlite3

try:
    import hnswlib
    HNSWLIB_AVAILABLE = True
except ImportError:
    HNSWLIB_AVAILABLE = False

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class VectorSearchResult:
    """Enhanced result from vector similarity search"""
    id: str
    content: str
    metadata: Dict[str, Any]
    score: float
    embedding: Optional[List[float]] = None
    chunk_info: Optional[Dict[str, Any]] = None  # For document chunking
    relevance_explanation: Optional[str] = None


@dataclass
class IndexStats:
    """Statistics about vector index performance"""
    total_vectors: int
    index_size_mb: float
    search_time_ms: float
    memory_usage_mb: float
    cache_hit_rate: float
    last_rebuild_time: Optional[float] = None


class DocumentChunker:
    """Advanced document chunking for optimal vector storage"""
    
    def __init__(self, chunk_size: int = 512, overlap: int = 50, min_chunk_size: int = 100):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.min_chunk_size = min_chunk_size
    
    def chunk_document(self, text: str, metadata: Dict[str, Any] = None) -> List[Tuple[str, Dict[str, Any]]]:
        """Chunk document into optimal pieces for vector storage"""
        if not text or len(text) < self.min_chunk_size:
            return [(text, metadata or {})]
        
        chunks = []
        sentences = self._split_sentences(text)
        
        current_chunk = []
        current_size = 0
        
        for sentence in sentences:
            sentence_size = len(sentence.split())
            
            if current_size + sentence_size > self.chunk_size and current_chunk:
                # Create chunk
                chunk_text = ' '.join(current_chunk)
                chunk_metadata = (metadata or {}).copy()
                chunk_metadata.update({
                    'chunk_index': len(chunks),
                    'chunk_size': len(chunk_text),
                    'word_count': len(chunk_text.split())
                })
                chunks.append((chunk_text, chunk_metadata))
                
                # Start new chunk with overlap
                overlap_sentences = current_chunk[-self.overlap:] if len(current_chunk) > self.overlap else current_chunk
                current_chunk = overlap_sentences + [sentence]
                current_size = sum(len(s.split()) for s in current_chunk)
            else:
                current_chunk.append(sentence)
                current_size += sentence_size
        
        # Add final chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunk_metadata = (metadata or {}).copy()
            chunk_metadata.update({
                'chunk_index': len(chunks),
                'chunk_size': len(chunk_text),
                'word_count': len(chunk_text.split())
            })
            chunks.append((chunk_text, chunk_metadata))
        
        return chunks
    
    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences with legal document awareness"""
        # Simple sentence splitting for now
        # In production, use more sophisticated legal text parsing
        import re
        
        # Split on sentence endings but preserve legal citations
        sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\!|\?)\s+', text)
        return [s.strip() for s in sentences if s.strip()]


class EnhancedEmbeddingModel:
    """Enhanced embedding model with caching and batch processing"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", cache_size: int = 1000):
        self.model_name = model_name
        self.model = None
        self.cache_size = cache_size
        self.embedding_cache = OrderedDict()
        self.batch_cache = {}
        self._lock = threading.RLock()
        
        self._load_model()
    
    def _load_model(self):
        """Load the embedding model with optimizations"""
        try:
            if SENTENCE_TRANSFORMERS_AVAILABLE:
                self.model = SentenceTransformer(self.model_name)
                # Optimize for legal documents
                if hasattr(self.model, 'max_seq_length'):
                    self.model.max_seq_length = 512  # Optimal for legal chunks
                logger.info(f"Loaded enhanced SentenceTransformer model: {self.model_name}")
            else:
                logger.warning("sentence-transformers not available, using mock embeddings")
                self.model = None
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self.model = None
    
    def encode(self, texts: Union[str, List[str]], show_progress: bool = False) -> Union[List[float], List[List[float]]]:
        """Encode text(s) to embeddings with caching"""
        with self._lock:
            if isinstance(texts, str):
                return self._encode_single(texts)
            else:
                return self._encode_batch(texts, show_progress)
    
    def _encode_single(self, text: str) -> List[float]:
        """Encode single text with caching"""
        # Create cache key
        cache_key = hashlib.md5(text.encode()).hexdigest()
        
        # Check cache
        if cache_key in self.embedding_cache:
            # Move to end (LRU)
            self.embedding_cache.move_to_end(cache_key)
            return self.embedding_cache[cache_key]
        
        # Generate embedding
        if self.model:
            embedding = self.model.encode(text).tolist()
        else:
            # Mock embedding
            embedding = [hash(text) % 1000 / 1000.0] * 384
        
        # Cache result
        self.embedding_cache[cache_key] = embedding
        
        # Maintain cache size
        if len(self.embedding_cache) > self.cache_size:
            self.embedding_cache.popitem(last=False)
        
        return embedding
    
    def _encode_batch(self, texts: List[str], show_progress: bool = False) -> List[List[float]]:
        """Encode batch of texts with caching and optimization"""
        embeddings = []
        uncached_texts = []
        uncached_indices = []
        
        # Check cache for each text
        for i, text in enumerate(texts):
            cache_key = hashlib.md5(text.encode()).hexdigest()
            if cache_key in self.embedding_cache:
                # Move to end (LRU)
                self.embedding_cache.move_to_end(cache_key)
                embeddings.append(self.embedding_cache[cache_key])
            else:
                embeddings.append(None)  # Placeholder
                uncached_texts.append(text)
                uncached_indices.append(i)
        
        # Process uncached texts in batch
        if uncached_texts:
            if self.model:
                batch_embeddings = self.model.encode(uncached_texts, show_progress_bar=show_progress)
                batch_embeddings = batch_embeddings.tolist()
            else:
                # Mock embeddings
                batch_embeddings = [[hash(text) % 1000 / 1000.0] * 384 for text in uncached_texts]
            
            # Update cache and results
            for i, embedding in enumerate(batch_embeddings):
                idx = uncached_indices[i]
                text = uncached_texts[i]
                cache_key = hashlib.md5(text.encode()).hexdigest()
                
                embeddings[idx] = embedding
                self.embedding_cache[cache_key] = embedding
                
                # Maintain cache size
                if len(self.embedding_cache) > self.cache_size:
                    self.embedding_cache.popitem(last=False)
        
        return embeddings
    
    def get_embedding_dim(self) -> int:
        """Get embedding dimension"""
        if self.model:
            return self.model.get_sentence_embedding_dimension()
        else:
            return 384  # Mock dimension
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get caching statistics"""
        with self._lock:
            return {
                'cache_size': len(self.embedding_cache),
                'max_cache_size': self.cache_size,
                'hit_rate': len(self.embedding_cache) / max(1, self.cache_size) * 100
            }


class EnhancedVectorStore:
    """Enhanced vector store with advanced indexing and optimizations"""
    
    def __init__(
        self,
        storage_path: Optional[Union[Path, str]] = None,
        index_type: str = "hnsw",
        embedding_model: str = "all-MiniLM-L6-v2"
    ):
        if storage_path is None:
            self.storage_path = Path.home() / ".bear_ai" / "enhanced_vector_store"
        else:
            self.storage_path = Path(storage_path) if isinstance(storage_path, str) else storage_path
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        # Storage paths
        self.db_path = self.storage_path / "vectors.db"
        self.embeddings_path = self.storage_path / "embeddings.npy"
        self.index_path = self.storage_path / f"index_{index_type}.idx"
        self.metadata_path = self.storage_path / "metadata.json"
        
        # Enhanced components
        self.index_type = index_type
        self.index = None
        self.embedding_model = EnhancedEmbeddingModel(embedding_model)
        self.document_chunker = DocumentChunker()\
        
        # Performance optimizations
        self.search_cache = OrderedDict()
        self.search_cache_size = 500
        self.batch_size = 100
        
        # Concurrent access support
        self._read_write_lock = threading.RLock()
        self._search_lock = threading.RLock()
        
        # Performance tracking
        self.search_times = deque(maxlen=100)
        self.index_stats = IndexStats(0, 0.0, 0.0, 0.0, 0.0)
        
        # Initialize components
        self._init_database()
        self._load_embeddings()
        self._init_index()
        self._load_metadata()
        
        logger.info(f"Enhanced VectorStore initialized with {index_type} index and {embedding_model} embeddings")
    
    def _init_database(self):
        """Initialize SQLite database with advanced schema"""
        with sqlite3.connect(self.db_path) as conn:
            # Main vectors table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS vectors (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    metadata TEXT,
                    embedding_index INTEGER,
                    document_id TEXT,
                    chunk_index INTEGER,
                    content_hash TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Performance indexes
            conn.execute("CREATE INDEX IF NOT EXISTS idx_vectors_document_id ON vectors(document_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_vectors_chunk_index ON vectors(chunk_index)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_vectors_content_hash ON vectors(content_hash)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_vectors_created_at ON vectors(created_at)")
            
            # Statistics table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS vector_stats (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
    
    def _load_embeddings(self):
        """Load embeddings from file with error recovery"""
        with self._read_write_lock:
            try:
                if self.embeddings_path.exists():
                    self.embeddings = np.load(self.embeddings_path).tolist()
                    logger.info(f"Loaded {len(self.embeddings)} embeddings")
                else:
                    self.embeddings = []
            except Exception as e:
                logger.warning(f"Failed to load embeddings: {e}")
                self.embeddings = []
                
                # Try to recover from backup
                backup_path = self.embeddings_path.with_suffix('.bak')
                if backup_path.exists():
                    try:
                        self.embeddings = np.load(backup_path).tolist()
                        logger.info(f"Recovered {len(self.embeddings)} embeddings from backup")
                    except Exception as backup_error:
                        logger.error(f"Backup recovery failed: {backup_error}")
    
    def _save_embeddings(self):
        """Save embeddings with backup"""
        with self._read_write_lock:
            try:
                if self.embeddings:
                    # Create backup
                    if self.embeddings_path.exists():
                        backup_path = self.embeddings_path.with_suffix('.bak')
                        self.embeddings_path.rename(backup_path)
                    
                    # Save current
                    np.save(self.embeddings_path, np.array(self.embeddings))
                    
                    # Update statistics
                    self._update_stats()
                    
            except Exception as e:
                logger.error(f"Failed to save embeddings: {e}")
    
    def _init_index(self):
        """Initialize vector index based on type"""
        if self.index_type == "hnsw" and HNSWLIB_AVAILABLE:
            self._init_hnsw_index()
        elif self.index_type == "ivf" and FAISS_AVAILABLE:
            self._init_faiss_index()
        else:
            self._init_numpy_index()
    
    def _init_hnsw_index(self):
        """Initialize HNSW index for fast approximate search"""
        try:
            embedding_dim = self.embedding_model.get_embedding_dim()
            
            if self.embeddings:
                self.index = hnswlib.Index(space='cosine', dim=embedding_dim)
                
                if self.index_path.exists():
                    # Load existing index
                    self.index.load_index(str(self.index_path))
                    self.index.set_ef(50)  # Search parameter
                    logger.info(f"Loaded HNSW index with {self.index.get_current_count()} vectors")
                else:
                    # Create new index
                    max_elements = max(10000, len(self.embeddings) * 2)
                    self.index.init_index(max_elements=max_elements, ef_construction=200, M=16)
                    
                    # Add existing embeddings
                    if self.embeddings:
                        embeddings_array = np.array(self.embeddings).astype(np.float32)
                        labels = list(range(len(self.embeddings)))
                        self.index.add_items(embeddings_array, labels)
                        self.index.save_index(str(self.index_path))
                    
                    self.index.set_ef(50)
                    logger.info(f"Created HNSW index with {len(self.embeddings)} vectors")
            else:
                # Empty index
                self.index = hnswlib.Index(space='cosine', dim=embedding_dim)
                self.index.init_index(max_elements=10000, ef_construction=200, M=16)
                self.index.set_ef(50)
                
        except Exception as e:
            logger.error(f"HNSW index initialization failed: {e}")
            self._init_numpy_index()
    
    def _init_faiss_index(self):
        """Initialize FAISS index for scalable search"""
        try:
            embedding_dim = self.embedding_model.get_embedding_dim()
            
            if self.embeddings and len(self.embeddings) > 100:
                # Use IVF for large collections
                nlist = min(4096, max(1, len(self.embeddings) // 39))
                self.index = faiss.IndexIVFFlat(
                    faiss.IndexFlatL2(embedding_dim),
                    embedding_dim,
                    nlist
                )
                
                if self.index_path.exists():
                    self.index = faiss.read_index(str(self.index_path))
                    logger.info(f"Loaded FAISS IVF index with {self.index.ntotal} vectors")
                else:
                    # Train and build index
                    embeddings_array = np.array(self.embeddings).astype(np.float32)
                    self.index.train(embeddings_array)
                    self.index.add(embeddings_array)
                    faiss.write_index(self.index, str(self.index_path))
                    logger.info(f"Created FAISS IVF index with {len(self.embeddings)} vectors")
                
                self.index.nprobe = min(50, max(1, nlist // 4))
            else:
                # Use flat index for small collections
                self.index = faiss.IndexFlatL2(embedding_dim)
                if self.embeddings:
                    embeddings_array = np.array(self.embeddings).astype(np.float32)
                    self.index.add(embeddings_array)
                    logger.info(f"Created FAISS flat index with {len(self.embeddings)} vectors")
                    
        except Exception as e:
            logger.error(f"FAISS index initialization failed: {e}")
            self._init_numpy_index()
    
    def _init_numpy_index(self):
        """Initialize numpy-based index as fallback"""
        self.index = "numpy"
        logger.info("Using NumPy-based similarity search")
    
    def _load_metadata(self):
        """Load store metadata"""
        try:
            if self.metadata_path.exists():
                with open(self.metadata_path, 'r') as f:
                    metadata = json.load(f)
                    self.index_stats = IndexStats(**metadata.get('index_stats', {}))
            else:
                self._save_metadata()
        except Exception as e:
            logger.warning(f"Failed to load metadata: {e}")
    
    def _save_metadata(self):
        """Save store metadata"""
        try:
            metadata = {
                'index_stats': {
                    'total_vectors': len(self.embeddings),
                    'index_size_mb': self._calculate_index_size(),
                    'search_time_ms': np.mean(self.search_times) if self.search_times else 0.0,
                    'memory_usage_mb': self._calculate_memory_usage(),
                    'cache_hit_rate': self._calculate_cache_hit_rate(),
                    'last_rebuild_time': time.time()
                },
                'created_at': time.time(),
                'updated_at': time.time()
            }
            
            with open(self.metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to save metadata: {e}")
    
    async def add_document(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any] = None
    ) -> List[str]:
        """Add a document with automatic chunking"""
        chunks = self.document_chunker.chunk_document(content, metadata)
        
        chunk_ids = []
        embeddings_to_add = []
        contents_to_add = []
        metadatas_to_add = []
        
        for i, (chunk_content, chunk_metadata) in enumerate(chunks):
            chunk_id = f"{document_id}:chunk_{i}"
            chunk_ids.append(chunk_id)
            
            # Generate embedding
            embedding = self.embedding_model.encode(chunk_content)
            embeddings_to_add.append(embedding)
            contents_to_add.append(chunk_content)
            
            # Enhanced metadata
            enhanced_metadata = (metadata or {}).copy()
            enhanced_metadata.update(chunk_metadata)
            enhanced_metadata.update({
                'document_id': document_id,
                'chunk_id': chunk_id,
                'total_chunks': len(chunks)
            })
            metadatas_to_add.append(enhanced_metadata)
        
        # Batch add to store
        success = await self.add_vectors(chunk_ids, embeddings_to_add, contents_to_add, metadatas_to_add)
        
        return chunk_ids if success else []
    
    async def add_vectors(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        contents: List[str],
        metadata: List[Dict[str, Any]]
    ) -> bool:
        """Add vectors with enhanced indexing and caching"""
        try:
            if len(ids) != len(embeddings) != len(contents) != len(metadata):
                raise ValueError("All input lists must have the same length")
            
            with self._read_write_lock:
                # Add to database and embeddings
                with sqlite3.connect(self.db_path) as conn:
                    for id_, embedding, content, meta in zip(ids, embeddings, contents, metadata):
                        embedding_index = len(self.embeddings)
                        self.embeddings.append(embedding)
                        
                        # Calculate content hash for deduplication
                        content_hash = hashlib.md5(content.encode()).hexdigest()
                        
                        conn.execute("""
                            INSERT OR REPLACE INTO vectors 
                            (id, content, metadata, embedding_index, document_id, chunk_index, content_hash, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        """, (
                            id_,
                            content,
                            json.dumps(meta),
                            embedding_index,
                            meta.get('document_id'),
                            meta.get('chunk_index'),
                            content_hash
                        ))
                    
                    conn.commit()
                
                # Update index
                await self._update_index(embeddings)
                
                # Save embeddings
                self._save_embeddings()
                
                # Clear search cache
                self.search_cache.clear()
                
                logger.info(f"Added {len(ids)} vectors to enhanced store")
                return True
                
        except Exception as e:
            logger.error(f"Error adding vectors: {e}")
            return False
    
    async def _update_index(self, new_embeddings: List[List[float]]):
        """Update vector index with new embeddings"""
        if not new_embeddings:
            return
        
        try:
            if self.index_type == "hnsw" and hasattr(self.index, 'add_items'):
                embeddings_array = np.array(new_embeddings).astype(np.float32)
                start_id = len(self.embeddings) - len(new_embeddings)
                labels = list(range(start_id, len(self.embeddings)))
                
                # Check if index needs resizing
                if self.index.get_current_count() + len(new_embeddings) > self.index.get_max_elements():
                    new_max = max(self.index.get_max_elements() * 2, len(self.embeddings) * 2)
                    self.index.resize_index(new_max)
                
                self.index.add_items(embeddings_array, labels)
                self.index.save_index(str(self.index_path))
                
            elif self.index_type == "ivf" and hasattr(self.index, 'add'):
                embeddings_array = np.array(new_embeddings).astype(np.float32)
                self.index.add(embeddings_array)
                faiss.write_index(self.index, str(self.index_path))
                
        except Exception as e:
            logger.error(f"Index update failed: {e}")
    
    async def search(
        self,
        query_text: str,
        limit: int = 10,
        threshold: float = 0.0,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """Enhanced search with caching and performance tracking"""
        start_time = time.time()
        
        # Create cache key
        cache_key = hashlib.md5(f"{query_text}:{limit}:{threshold}:{filter_metadata}".encode()).hexdigest()
        
        # Check cache
        with self._search_lock:
            if cache_key in self.search_cache:
                self.search_cache.move_to_end(cache_key)
                cached_result = self.search_cache[cache_key]
                
                # Update performance tracking
                search_time = (time.time() - start_time) * 1000
                self.search_times.append(search_time)
                
                return cached_result
        
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode(query_text)
            
            # Perform search based on index type
            if self.index_type == "hnsw" and hasattr(self.index, 'knn_query'):
                results = await self._search_hnsw(query_embedding, limit, threshold, filter_metadata)
            elif self.index_type == "ivf" and hasattr(self.index, 'search'):
                results = await self._search_faiss(query_embedding, limit, threshold, filter_metadata)
            else:
                results = await self._search_numpy(query_embedding, limit, threshold, filter_metadata)
            
            # Cache results
            with self._search_lock:
                self.search_cache[cache_key] = results
                if len(self.search_cache) > self.search_cache_size:
                    self.search_cache.popitem(last=False)
            
            # Update performance tracking
            search_time = (time.time() - start_time) * 1000
            self.search_times.append(search_time)
            
            return results
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []
    
    async def _search_hnsw(
        self,
        query_embedding: List[float],
        limit: int,
        threshold: float,
        filter_metadata: Optional[Dict[str, Any]]
    ) -> List[VectorSearchResult]:
        """Search using HNSW index"""
        if not self.embeddings:
            return []
        
        query_array = np.array([query_embedding]).astype(np.float32)
        
        # Search with larger limit for filtering
        search_limit = min(limit * 10, len(self.embeddings))
        labels, distances = self.index.knn_query(query_array, k=search_limit)
        
        results = []
        
        with sqlite3.connect(self.db_path) as conn:
            for label, distance in zip(labels[0], distances[0]):
                # Convert distance to similarity score
                similarity = 1.0 - distance
                
                if similarity < threshold:
                    continue
                
                # Get vector info
                cursor = conn.execute("""
                    SELECT id, content, metadata, document_id, chunk_index
                    FROM vectors 
                    WHERE embedding_index = ?
                """, (int(label),))
                
                row = cursor.fetchone()
                if not row:
                    continue
                
                id_, content, metadata_json, document_id, chunk_index = row
                metadata = json.loads(metadata_json) if metadata_json else {}
                
                # Apply metadata filter
                if filter_metadata and not self._match_metadata_filter(metadata, filter_metadata):
                    continue
                
                # Add chunk info
                chunk_info = {
                    'document_id': document_id,
                    'chunk_index': chunk_index
                } if document_id else None
                
                results.append(VectorSearchResult(
                    id=id_,
                    content=content,
                    metadata=metadata,
                    score=similarity,
                    embedding=self.embeddings[label],
                    chunk_info=chunk_info
                ))
                
                if len(results) >= limit:
                    break
        
        return results
    
    async def _search_faiss(
        self,
        query_embedding: List[float],
        limit: int,
        threshold: float,
        filter_metadata: Optional[Dict[str, Any]]
    ) -> List[VectorSearchResult]:
        """Search using FAISS index"""
        if not self.embeddings:
            return []
        
        query_array = np.array([query_embedding]).astype(np.float32)
        
        # Search with larger limit for filtering
        search_limit = min(limit * 5, len(self.embeddings))
        distances, indices = self.index.search(query_array, search_limit)
        
        results = []
        
        with sqlite3.connect(self.db_path) as conn:
            for idx, distance in zip(indices[0], distances[0]):
                if idx == -1:  # FAISS uses -1 for invalid results
                    continue
                
                # Convert L2 distance to similarity (approximate)
                similarity = 1.0 / (1.0 + distance)
                
                if similarity < threshold:
                    continue
                
                # Get vector info
                cursor = conn.execute("""
                    SELECT id, content, metadata, document_id, chunk_index
                    FROM vectors 
                    WHERE embedding_index = ?
                """, (int(idx),))
                
                row = cursor.fetchone()
                if not row:
                    continue
                
                id_, content, metadata_json, document_id, chunk_index = row
                metadata = json.loads(metadata_json) if metadata_json else {}
                
                # Apply metadata filter
                if filter_metadata and not self._match_metadata_filter(metadata, filter_metadata):
                    continue
                
                # Add chunk info
                chunk_info = {
                    'document_id': document_id,
                    'chunk_index': chunk_index
                } if document_id else None
                
                results.append(VectorSearchResult(
                    id=id_,
                    content=content,
                    metadata=metadata,
                    score=similarity,
                    embedding=self.embeddings[idx],
                    chunk_info=chunk_info
                ))
                
                if len(results) >= limit:
                    break
        
        return results
    
    async def _search_numpy(
        self,
        query_embedding: List[float],
        limit: int,
        threshold: float,
        filter_metadata: Optional[Dict[str, Any]]
    ) -> List[VectorSearchResult]:
        """Search using NumPy (fallback)"""
        if not self.embeddings:
            return []
        
        # Calculate cosine similarities
        query_vec = np.array(query_embedding)
        embeddings_array = np.array(self.embeddings)
        
        # Normalize vectors
        query_norm = query_vec / np.linalg.norm(query_vec)
        embeddings_norm = embeddings_array / np.linalg.norm(embeddings_array, axis=1, keepdims=True)
        
        # Calculate similarities
        similarities = np.dot(embeddings_norm, query_norm)
        
        # Get top results
        top_indices = np.argsort(similarities)[::-1][:limit * 5]  # Get extra for filtering
        
        results = []
        
        with sqlite3.connect(self.db_path) as conn:
            for idx in top_indices:
                similarity = float(similarities[idx])
                
                if similarity < threshold:
                    continue
                
                # Get vector info
                cursor = conn.execute("""
                    SELECT id, content, metadata, document_id, chunk_index
                    FROM vectors 
                    WHERE embedding_index = ?
                """, (int(idx),))
                
                row = cursor.fetchone()
                if not row:
                    continue
                
                id_, content, metadata_json, document_id, chunk_index = row
                metadata = json.loads(metadata_json) if metadata_json else {}
                
                # Apply metadata filter
                if filter_metadata and not self._match_metadata_filter(metadata, filter_metadata):
                    continue
                
                # Add chunk info
                chunk_info = {
                    'document_id': document_id,
                    'chunk_index': chunk_index
                } if document_id else None
                
                results.append(VectorSearchResult(
                    id=id_,
                    content=content,
                    metadata=metadata,
                    score=similarity,
                    embedding=self.embeddings[idx],
                    chunk_info=chunk_info
                ))
                
                if len(results) >= limit:
                    break
        
        return results
    
    def _match_metadata_filter(self, metadata: Dict[str, Any], filter_metadata: Dict[str, Any]) -> bool:
        """Check if metadata matches filter criteria"""
        for key, value in filter_metadata.items():
            if key not in metadata or metadata[key] != value:
                return False
        return True
    
    async def delete_vectors(self, ids: List[str]) -> bool:
        """Delete vectors with index maintenance"""
        try:
            with self._read_write_lock:
                with sqlite3.connect(self.db_path) as conn:
                    # Get embedding indices
                    placeholders = ','.join('?' * len(ids))
                    cursor = conn.execute(f"""
                        SELECT embedding_index FROM vectors 
                        WHERE id IN ({placeholders})
                    """, ids)
                    
                    indices_to_remove = sorted([row[0] for row in cursor.fetchall()], reverse=True)
                    
                    # Remove from database
                    conn.execute(f"""
                        DELETE FROM vectors WHERE id IN ({placeholders})
                    """, ids)
                    conn.commit()
                
                # Remove embeddings and update indices
                for idx in indices_to_remove:
                    if 0 <= idx < len(self.embeddings):
                        del self.embeddings[idx]
                
                # Rebuild index for consistency
                await self._rebuild_index()
                
                # Clear caches
                self.search_cache.clear()
                
                logger.info(f"Deleted {len(ids)} vectors")
                return True
                
        except Exception as e:
            logger.error(f"Error deleting vectors: {e}")
            return False
    
    async def _rebuild_index(self):
        """Rebuild vector index from scratch"""
        try:
            if self.index_path.exists():
                self.index_path.unlink()
            
            self._init_index()
            
            if self.embeddings:
                await self._update_index(self.embeddings)
            
            self._save_metadata()
            logger.info("Index rebuilt successfully")
            
        except Exception as e:
            logger.error(f"Index rebuild failed: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive store statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("SELECT COUNT(*) FROM vectors")
                total_count = cursor.fetchone()[0]
                
                # Document statistics
                cursor = conn.execute("SELECT COUNT(DISTINCT document_id) FROM vectors WHERE document_id IS NOT NULL")
                unique_documents = cursor.fetchone()[0]
            
            # Performance statistics
            avg_search_time = np.mean(self.search_times) if self.search_times else 0.0
            
            return {
                'total_vectors': total_count,
                'unique_documents': unique_documents,
                'embedding_dimension': self.embedding_model.get_embedding_dim(),
                'index_type': self.index_type,
                'storage_size_mb': self._calculate_storage_size(),
                'index_size_mb': self._calculate_index_size(),
                'memory_usage_mb': self._calculate_memory_usage(),
                'avg_search_time_ms': avg_search_time,
                'cache_hit_rate': self._calculate_cache_hit_rate(),
                'embedding_cache_stats': self.embedding_model.get_cache_stats()
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}
    
    def _calculate_storage_size(self) -> float:
        """Calculate total storage size in MB"""
        size = 0
        for path in [self.db_path, self.embeddings_path, self.index_path, self.metadata_path]:
            if path.exists():
                size += path.stat().st_size
        return size / (1024 * 1024)
    
    def _calculate_index_size(self) -> float:
        """Calculate index size in MB"""
        if self.index_path.exists():
            return self.index_path.stat().st_size / (1024 * 1024)
        return 0.0
    
    def _calculate_memory_usage(self) -> float:
        """Estimate memory usage in MB"""
        embeddings_size = len(self.embeddings) * self.embedding_model.get_embedding_dim() * 4  # float32
        cache_size = len(self.search_cache) * 1000  # Rough estimate
        return (embeddings_size + cache_size) / (1024 * 1024)
    
    def _calculate_cache_hit_rate(self) -> float:
        """Calculate cache hit rate"""
        if not self.search_cache:
            return 0.0
        return (len(self.search_cache) / self.search_cache_size) * 100
    
    def _update_stats(self):
        """Update performance statistics"""
        self.index_stats = IndexStats(
            total_vectors=len(self.embeddings),
            index_size_mb=self._calculate_index_size(),
            search_time_ms=np.mean(self.search_times) if self.search_times else 0.0,
            memory_usage_mb=self._calculate_memory_usage(),
            cache_hit_rate=self._calculate_cache_hit_rate(),
            last_rebuild_time=time.time()
        )


# Factory function
def create_enhanced_vector_store(
    storage_path: Optional[str] = None,
    index_type: str = "hnsw",
    embedding_model: str = "all-MiniLM-L6-v2"
) -> EnhancedVectorStore:
    """Create enhanced vector store with optimal configuration"""
    
    # Auto-select best index type based on available libraries
    if index_type == "auto":
        if HNSWLIB_AVAILABLE:
            index_type = "hnsw"
        elif FAISS_AVAILABLE:
            index_type = "ivf"
        else:
            index_type = "numpy"
    
    return EnhancedVectorStore(
        storage_path=storage_path,
        index_type=index_type,
        embedding_model=embedding_model
    )


# Global instance
_global_enhanced_store: Optional[EnhancedVectorStore] = None

def get_enhanced_vector_store(**kwargs) -> EnhancedVectorStore:
    """Get or create global enhanced vector store"""
    global _global_enhanced_store
    if _global_enhanced_store is None:
        _global_enhanced_store = create_enhanced_vector_store(**kwargs)
    return _global_enhanced_store