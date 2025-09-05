"""
Vector Store Implementation
High-performance vector storage and similarity search
"""

import json
import logging
import numpy as np
import pickle
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import sqlite3
import time
import uuid

logger = logging.getLogger(__name__)


@dataclass
class VectorSearchResult:
    """Result from vector similarity search"""
    id: str
    content: str
    metadata: Dict[str, Any]
    score: float
    embedding: Optional[List[float]] = None


class EmbeddingModel:
    """Embedding model interface"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the embedding model"""
        try:
            # Try to use sentence-transformers if available
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"Loaded SentenceTransformer model: {self.model_name}")
        except ImportError:
            logger.warning("sentence-transformers not available, using mock embeddings")
            self.model = None
    
    def encode(self, texts: Union[str, List[str]]) -> Union[List[float], List[List[float]]]:
        """Encode text(s) to embeddings"""
        if self.model:
            return self.model.encode(texts).tolist()
        else:
            # Mock embeddings for testing
            if isinstance(texts, str):
                return [hash(texts) % 1000 / 1000.0] * 384  # Mock 384-dim embedding
            else:
                return [[hash(text) % 1000 / 1000.0] * 384 for text in texts]
    
    def get_embedding_dim(self) -> int:
        """Get embedding dimension"""
        if self.model:
            return self.model.get_sentence_embedding_dimension()
        else:
            return 384  # Mock dimension


class VectorStore(ABC):
    """Abstract base class for vector stores"""
    
    @abstractmethod
    async def add_vectors(
        self, 
        ids: List[str],
        embeddings: List[List[float]],
        contents: List[str],
        metadata: List[Dict[str, Any]]
    ) -> bool:
        """Add vectors to the store"""
        pass
    
    @abstractmethod
    async def search(
        self,
        query_embedding: List[float],
        limit: int = 10,
        threshold: float = 0.0,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """Search for similar vectors"""
        pass
    
    @abstractmethod
    async def delete_vectors(self, ids: List[str]) -> bool:
        """Delete vectors by IDs"""
        pass
    
    @abstractmethod
    async def get_vector(self, id: str) -> Optional[VectorSearchResult]:
        """Get a specific vector by ID"""
        pass
    
    @abstractmethod
    async def list_vectors(self, limit: int = 100) -> List[VectorSearchResult]:
        """List vectors in the store"""
        pass


class LocalVectorStore(VectorStore):
    """Local file-based vector store using SQLite and numpy"""
    
    def __init__(self, storage_path: Optional[Path] = None):
        self.storage_path = storage_path or Path.home() / ".bear_ai" / "vector_store"
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        self.db_path = self.storage_path / "vectors.db"
        self.embeddings_path = self.storage_path / "embeddings.npy"
        
        self._init_database()
        self._load_embeddings()
        
        logger.info(f"LocalVectorStore initialized at {self.storage_path}")
    
    def _init_database(self):
        """Initialize SQLite database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS vectors (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    metadata TEXT,
                    embedding_index INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_vectors_created_at ON vectors(created_at)
            """)
            
            conn.commit()
    
    def _load_embeddings(self):
        """Load embeddings from file"""
        try:
            if self.embeddings_path.exists():
                self.embeddings = np.load(self.embeddings_path).tolist()
                logger.info(f"Loaded {len(self.embeddings)} embeddings")
            else:
                self.embeddings = []
        except Exception as e:
            logger.warning(f"Failed to load embeddings: {e}")
            self.embeddings = []
    
    def _save_embeddings(self):
        """Save embeddings to file"""
        try:
            if self.embeddings:
                np.save(self.embeddings_path, np.array(self.embeddings))
        except Exception as e:
            logger.error(f"Failed to save embeddings: {e}")
    
    async def add_vectors(
        self, 
        ids: List[str],
        embeddings: List[List[float]],
        contents: List[str],
        metadata: List[Dict[str, Any]]
    ) -> bool:
        """Add vectors to the store"""
        
        try:
            if len(ids) != len(embeddings) != len(contents) != len(metadata):
                raise ValueError("All input lists must have the same length")
            
            with sqlite3.connect(self.db_path) as conn:
                for i, (id_, embedding, content, meta) in enumerate(zip(ids, embeddings, contents, metadata)):
                    # Add embedding to numpy array
                    embedding_index = len(self.embeddings)
                    self.embeddings.append(embedding)
                    
                    # Insert into database
                    conn.execute("""
                        INSERT OR REPLACE INTO vectors 
                        (id, content, metadata, embedding_index, updated_at)
                        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """, (id_, content, json.dumps(meta), embedding_index))
                
                conn.commit()
            
            # Save embeddings to file
            self._save_embeddings()
            
            logger.info(f"Added {len(ids)} vectors to store")
            return True
            
        except Exception as e:
            logger.error(f"Error adding vectors: {e}")
            return False
    
    async def search(
        self,
        query_embedding: List[float],
        limit: int = 10,
        threshold: float = 0.0,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """Search for similar vectors using cosine similarity"""
        
        try:
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
            top_indices = np.argsort(similarities)[::-1][:limit * 2]  # Get more than needed for filtering
            
            results = []
            
            with sqlite3.connect(self.db_path) as conn:
                for idx in top_indices:
                    if len(results) >= limit:
                        break
                    
                    similarity = float(similarities[idx])
                    if similarity < threshold:
                        continue
                    
                    # Get vector info from database
                    cursor = conn.execute("""
                        SELECT id, content, metadata 
                        FROM vectors 
                        WHERE embedding_index = ?
                    """, (int(idx),))
                    
                    row = cursor.fetchone()
                    if not row:
                        continue
                    
                    id_, content, metadata_json = row
                    metadata = json.loads(metadata_json) if metadata_json else {}
                    
                    # Apply metadata filter if provided
                    if filter_metadata:
                        if not all(metadata.get(k) == v for k, v in filter_metadata.items()):
                            continue
                    
                    results.append(VectorSearchResult(
                        id=id_,
                        content=content,
                        metadata=metadata,
                        score=similarity,
                        embedding=self.embeddings[idx]
                    ))
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching vectors: {e}")
            return []
    
    async def delete_vectors(self, ids: List[str]) -> bool:
        """Delete vectors by IDs"""
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Get embedding indices to remove
                placeholders = ','.join('?' * len(ids))
                cursor = conn.execute(f"""
                    SELECT embedding_index FROM vectors 
                    WHERE id IN ({placeholders})
                """, ids)
                
                indices_to_remove = [row[0] for row in cursor.fetchall()]
                
                # Remove from database
                conn.execute(f"""
                    DELETE FROM vectors WHERE id IN ({placeholders})
                """, ids)
                
                conn.commit()
            
            # Remove embeddings (this is inefficient for large stores)
            # In production, consider using a more sophisticated indexing system
            for idx in sorted(indices_to_remove, reverse=True):
                if 0 <= idx < len(self.embeddings):
                    del self.embeddings[idx]
            
            # Update embedding indices in database
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("SELECT id, embedding_index FROM vectors ORDER BY embedding_index")
                updates = []
                
                for i, (id_, old_index) in enumerate(cursor.fetchall()):
                    updates.append((i, id_))
                
                for new_index, id_ in updates:
                    conn.execute("UPDATE vectors SET embedding_index = ? WHERE id = ?", (new_index, id_))
                
                conn.commit()
            
            self._save_embeddings()
            
            logger.info(f"Deleted {len(ids)} vectors")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting vectors: {e}")
            return False
    
    async def get_vector(self, id: str) -> Optional[VectorSearchResult]:
        """Get a specific vector by ID"""
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    SELECT id, content, metadata, embedding_index 
                    FROM vectors 
                    WHERE id = ?
                """, (id,))
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                id_, content, metadata_json, embedding_index = row
                metadata = json.loads(metadata_json) if metadata_json else {}
                
                if 0 <= embedding_index < len(self.embeddings):
                    embedding = self.embeddings[embedding_index]
                else:
                    embedding = []
                
                return VectorSearchResult(
                    id=id_,
                    content=content,
                    metadata=metadata,
                    score=1.0,  # Perfect match for exact retrieval
                    embedding=embedding
                )
                
        except Exception as e:
            logger.error(f"Error getting vector {id}: {e}")
            return None
    
    async def list_vectors(self, limit: int = 100) -> List[VectorSearchResult]:
        """List vectors in the store"""
        
        try:
            results = []
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    SELECT id, content, metadata, embedding_index 
                    FROM vectors 
                    ORDER BY created_at DESC 
                    LIMIT ?
                """, (limit,))
                
                for row in cursor.fetchall():
                    id_, content, metadata_json, embedding_index = row
                    metadata = json.loads(metadata_json) if metadata_json else {}
                    
                    if 0 <= embedding_index < len(self.embeddings):
                        embedding = self.embeddings[embedding_index]
                    else:
                        embedding = []
                    
                    results.append(VectorSearchResult(
                        id=id_,
                        content=content,
                        metadata=metadata,
                        score=0.0,
                        embedding=embedding
                    ))
            
            return results
            
        except Exception as e:
            logger.error(f"Error listing vectors: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """Get vector store statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("SELECT COUNT(*) FROM vectors")
                total_count = cursor.fetchone()[0]
            
            return {
                'total_vectors': total_count,
                'embedding_dimension': len(self.embeddings[0]) if self.embeddings else 0,
                'storage_size_mb': self.db_path.stat().st_size / (1024 * 1024) if self.db_path.exists() else 0
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}


class ChromaVectorStore(VectorStore):
    """ChromaDB-based vector store"""
    
    def __init__(self, collection_name: str = "bear_ai_docs", persist_directory: Optional[str] = None):
        self.collection_name = collection_name
        self.persist_directory = persist_directory or str(Path.home() / ".bear_ai" / "chroma")
        
        self.client = None
        self.collection = None
        
        self._init_chroma()
    
    def _init_chroma(self):
        """Initialize ChromaDB"""
        try:
            import chromadb
            from chromadb.config import Settings
            
            # Create persistent client
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(anonymized_telemetry=False)
            )
            
            # Get or create collection
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            
            logger.info(f"ChromaVectorStore initialized with collection '{self.collection_name}'")
            
        except ImportError:
            logger.error("ChromaDB not available. Install with: pip install chromadb")
            raise
        except Exception as e:
            logger.error(f"Error initializing ChromaDB: {e}")
            raise
    
    async def add_vectors(
        self, 
        ids: List[str],
        embeddings: List[List[float]],
        contents: List[str],
        metadata: List[Dict[str, Any]]
    ) -> bool:
        """Add vectors to ChromaDB"""
        
        try:
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=contents,
                metadatas=metadata
            )
            
            logger.info(f"Added {len(ids)} vectors to ChromaDB")
            return True
            
        except Exception as e:
            logger.error(f"Error adding vectors to ChromaDB: {e}")
            return False
    
    async def search(
        self,
        query_embedding: List[float],
        limit: int = 10,
        threshold: float = 0.0,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """Search ChromaDB for similar vectors"""
        
        try:
            where = filter_metadata if filter_metadata else None
            
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=limit,
                where=where
            )
            
            search_results = []
            
            if results and results['ids'] and results['ids'][0]:
                for i, id_ in enumerate(results['ids'][0]):
                    distance = results['distances'][0][i]
                    similarity = 1 - distance  # Convert distance to similarity
                    
                    if similarity < threshold:
                        continue
                    
                    search_results.append(VectorSearchResult(
                        id=id_,
                        content=results['documents'][0][i],
                        metadata=results['metadatas'][0][i] or {},
                        score=similarity,
                        embedding=results.get('embeddings', [None])[0]
                    ))
            
            return search_results
            
        except Exception as e:
            logger.error(f"Error searching ChromaDB: {e}")
            return []
    
    async def delete_vectors(self, ids: List[str]) -> bool:
        """Delete vectors from ChromaDB"""
        
        try:
            self.collection.delete(ids=ids)
            logger.info(f"Deleted {len(ids)} vectors from ChromaDB")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting vectors from ChromaDB: {e}")
            return False
    
    async def get_vector(self, id: str) -> Optional[VectorSearchResult]:
        """Get a specific vector from ChromaDB"""
        
        try:
            results = self.collection.get(ids=[id], include=['documents', 'metadatas', 'embeddings'])
            
            if results and results['ids']:
                return VectorSearchResult(
                    id=results['ids'][0],
                    content=results['documents'][0],
                    metadata=results['metadatas'][0] or {},
                    score=1.0,
                    embedding=results['embeddings'][0] if results['embeddings'] else None
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting vector {id} from ChromaDB: {e}")
            return None
    
    async def list_vectors(self, limit: int = 100) -> List[VectorSearchResult]:
        """List vectors in ChromaDB"""
        
        try:
            results = self.collection.get(limit=limit, include=['documents', 'metadatas'])
            
            search_results = []
            
            if results and results['ids']:
                for i, id_ in enumerate(results['ids']):
                    search_results.append(VectorSearchResult(
                        id=id_,
                        content=results['documents'][i],
                        metadata=results['metadatas'][i] or {},
                        score=0.0,
                        embedding=None
                    ))
            
            return search_results
            
        except Exception as e:
            logger.error(f"Error listing vectors from ChromaDB: {e}")
            return []


# Global vector store instance
_global_store: Optional[VectorStore] = None
_global_embedding_model: Optional[EmbeddingModel] = None

def get_vector_store(store_type: str = "local", **kwargs) -> VectorStore:
    """Get vector store instance"""
    global _global_store
    
    if _global_store is None:
        if store_type == "local":
            _global_store = LocalVectorStore(**kwargs)
        elif store_type == "chroma":
            _global_store = ChromaVectorStore(**kwargs)
        else:
            raise ValueError(f"Unknown vector store type: {store_type}")
    
    return _global_store

def get_embedding_model(model_name: str = "all-MiniLM-L6-v2") -> EmbeddingModel:
    """Get embedding model instance"""
    global _global_embedding_model
    
    if _global_embedding_model is None:
        _global_embedding_model = EmbeddingModel(model_name)
    
    return _global_embedding_model