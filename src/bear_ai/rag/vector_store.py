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
    """Enhanced local file-based vector store with advanced indexing and optimization"""
    
    def __init__(self, storage_path: Optional[Union[Path, str]] = None, index_type: str = "hnsw"):
        if storage_path is None:
            self.storage_path = Path.home() / ".bear_ai" / "vector_store"
        else:
            self.storage_path = Path(storage_path) if isinstance(storage_path, str) else storage_path
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        self.db_path = self.storage_path / "vectors.db"
        self.embeddings_path = self.storage_path / "embeddings.npy"
        self.index_path = self.storage_path / f"index_{index_type}.idx"
        
        # Enhanced indexing
        self.index_type = index_type
        self.index = None
        self.embedding_dimension = 384  # Default
        
        # Performance optimizations
        self._embedding_cache = {}
        self._search_cache = {}
        self._cache_size = 1000
        
        # Concurrent access support
        self._lock = threading.RLock()
        self._read_write_lock = threading.RLock()
        
        self._init_database()
        self._load_embeddings()
        self._init_index()
        
        logger.info(f"Enhanced LocalVectorStore initialized at {self.storage_path} with {index_type} index")
    
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


class LanceVectorStore(VectorStore):
    """LanceDB-based vector store for offline-only vector storage"""
    
    def __init__(self, table_name: str = "bear_ai_docs", persist_directory: Optional[str] = None):
        self.table_name = table_name
        self.persist_directory = persist_directory or str(Path.home() / ".bear_ai" / "lance")
        
        self.db = None
        self.table = None
        
        self._init_lance()
    
    def _init_lance(self):
        """Initialize LanceDB"""
        try:
            import lancedb
            import pyarrow as pa
            
            # Ensure directory exists
            Path(self.persist_directory).mkdir(parents=True, exist_ok=True)
            
            # Connect to LanceDB
            self.db = lancedb.connect(self.persist_directory)
            
            # Define schema for the table
            self.schema = pa.schema([
                pa.field("id", pa.string()),
                pa.field("content", pa.string()),
                pa.field("metadata", pa.string()),  # JSON string
                pa.field("vector", pa.list_(pa.float32())),
                pa.field("created_at", pa.timestamp('s')),
                pa.field("updated_at", pa.timestamp('s'))
            ])
            
            # Try to open existing table or create new one
            try:
                self.table = self.db.open_table(self.table_name)
                logger.info(f"Opened existing LanceDB table '{self.table_name}'")
            except FileNotFoundError:
                # Create empty table with schema
                import pandas as pd
                
                empty_df = pd.DataFrame({
                    'id': pd.Series(dtype='str'),
                    'content': pd.Series(dtype='str'),
                    'metadata': pd.Series(dtype='str'),
                    'vector': pd.Series(dtype='object'),
                    'created_at': pd.Series(dtype='datetime64[s]'),
                    'updated_at': pd.Series(dtype='datetime64[s]')
                })
                
                self.table = self.db.create_table(self.table_name, empty_df, mode="overwrite")
                logger.info(f"Created new LanceDB table '{self.table_name}'")
            
        except ImportError as e:
            logger.error("LanceDB not available. Install with: pip install lancedb pyarrow")
            raise ImportError(f"LanceDB dependencies missing: {e}")
        except Exception as e:
            logger.error(f"Error initializing LanceDB: {e}")
            raise
    
    async def add_vectors(
        self, 
        ids: List[str],
        embeddings: List[List[float]],
        contents: List[str],
        metadata: List[Dict[str, Any]]
    ) -> bool:
        """Add vectors to LanceDB"""
        
        try:
            import pandas as pd
            
            if len(ids) != len(embeddings) != len(contents) != len(metadata):
                raise ValueError("All input lists must have the same length")
            
            # Prepare data for insertion
            current_time = pd.Timestamp.now()
            data = []
            
            for id_, embedding, content, meta in zip(ids, embeddings, contents, metadata):
                data.append({
                    'id': id_,
                    'content': content,
                    'metadata': json.dumps(meta),
                    'vector': embedding,
                    'created_at': current_time,
                    'updated_at': current_time
                })
            
            df = pd.DataFrame(data)
            
            # Add to table (using merge mode to handle duplicates)
            self.table.add(df, mode="append")
            
            logger.info(f"Added {len(ids)} vectors to LanceDB")
            return True
            
        except Exception as e:
            logger.error(f"Error adding vectors to LanceDB: {e}")
            return False
    
    async def search(
        self,
        query_embedding: List[float],
        limit: int = 10,
        threshold: float = 0.0,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """Search LanceDB for similar vectors using cosine similarity"""
        
        try:
            # Build query
            query = self.table.search(query_embedding).limit(limit)
            
            # Apply metadata filters if provided
            if filter_metadata:
                for key, value in filter_metadata.items():
                    # LanceDB uses SQL-like syntax for filtering
                    if isinstance(value, str):
                        query = query.where(f"json_extract(metadata, '$.{key}') = '{value}'")
                    else:
                        query = query.where(f"json_extract(metadata, '$.{key}') = {value}")
            
            # Execute search
            results = query.to_pandas()
            
            search_results = []
            
            for _, row in results.iterrows():
                # LanceDB returns distance (lower is better), convert to similarity
                distance = row.get('_distance', 0.0)
                similarity = 1.0 / (1.0 + distance)  # Convert distance to similarity score
                
                if similarity < threshold:
                    continue
                
                # Parse metadata
                try:
                    metadata_dict = json.loads(row['metadata']) if row['metadata'] else {}
                except (json.JSONDecodeError, TypeError):
                    metadata_dict = {}
                
                search_results.append(VectorSearchResult(
                    id=row['id'],
                    content=row['content'],
                    metadata=metadata_dict,
                    score=similarity,
                    embedding=row['vector'] if isinstance(row['vector'], list) else row['vector'].tolist()
                ))
            
            return search_results
            
        except Exception as e:
            logger.error(f"Error searching LanceDB: {e}")
            return []
    
    async def delete_vectors(self, ids: List[str]) -> bool:
        """Delete vectors from LanceDB"""
        
        try:
            # Build delete condition
            id_list = "', '".join(ids)
            condition = f"id IN ('{id_list}')"
            
            self.table.delete(condition)
            
            logger.info(f"Deleted {len(ids)} vectors from LanceDB")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting vectors from LanceDB: {e}")
            return False
    
    async def get_vector(self, id: str) -> Optional[VectorSearchResult]:
        """Get a specific vector from LanceDB"""
        
        try:
            # Query for specific ID
            results = self.table.search().where(f"id = '{id}'").limit(1).to_pandas()
            
            if results.empty:
                return None
            
            row = results.iloc[0]
            
            # Parse metadata
            try:
                metadata_dict = json.loads(row['metadata']) if row['metadata'] else {}
            except (json.JSONDecodeError, TypeError):
                metadata_dict = {}
            
            return VectorSearchResult(
                id=row['id'],
                content=row['content'],
                metadata=metadata_dict,
                score=1.0,  # Perfect match for exact retrieval
                embedding=row['vector'] if isinstance(row['vector'], list) else row['vector'].tolist()
            )
            
        except Exception as e:
            logger.error(f"Error getting vector {id} from LanceDB: {e}")
            return None
    
    async def list_vectors(self, limit: int = 100) -> List[VectorSearchResult]:
        """List vectors in LanceDB"""
        
        try:
            # Get recent vectors (ordered by updated_at)
            results = self.table.search().limit(limit).to_pandas()
            
            search_results = []
            
            for _, row in results.iterrows():
                # Parse metadata
                try:
                    metadata_dict = json.loads(row['metadata']) if row['metadata'] else {}
                except (json.JSONDecodeError, TypeError):
                    metadata_dict = {}
                
                search_results.append(VectorSearchResult(
                    id=row['id'],
                    content=row['content'],
                    metadata=metadata_dict,
                    score=0.0,
                    embedding=row['vector'] if isinstance(row['vector'], list) else row['vector'].tolist()
                ))
            
            return search_results
            
        except Exception as e:
            logger.error(f"Error listing vectors from LanceDB: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """Get LanceDB vector store statistics"""
        try:
            # Get table statistics
            count_result = self.table.count_rows()
            total_count = count_result if isinstance(count_result, int) else 0
            
            # Get sample vector to determine dimension
            sample = self.table.search().limit(1).to_pandas()
            embedding_dim = len(sample.iloc[0]['vector']) if not sample.empty and 'vector' in sample.columns else 0
            
            # Calculate approximate storage size
            table_path = Path(self.persist_directory) / f"{self.table_name}.lance"
            storage_size_mb = 0
            if table_path.exists():
                for file_path in table_path.rglob('*'):
                    if file_path.is_file():
                        storage_size_mb += file_path.stat().st_size
                storage_size_mb = storage_size_mb / (1024 * 1024)
            
            return {
                'total_vectors': total_count,
                'embedding_dimension': embedding_dim,
                'storage_size_mb': storage_size_mb
            }
        except Exception as e:
            logger.error(f"Error getting LanceDB stats: {e}")
            return {}


# Global vector store instance
_global_store: Optional[VectorStore] = None
_global_embedding_model: Optional[EmbeddingModel] = None

def get_vector_store(store_type: str = "local", **kwargs) -> VectorStore:
    """Get vector store instance"""
    global _global_store
    
    if _global_store is None:
        if store_type == "local":
            _global_store = LocalVectorStore(**kwargs)
        elif store_type == "lance":
            _global_store = LanceVectorStore(**kwargs)
        else:
            raise ValueError(f"Unknown vector store type: {store_type}. Available types: 'local', 'lance'")
    
    return _global_store

def get_embedding_model(model_name: str = "all-MiniLM-L6-v2") -> EmbeddingModel:
    """Get embedding model instance"""
    global _global_embedding_model
    
    if _global_embedding_model is None:
        _global_embedding_model = EmbeddingModel(model_name)
    
    return _global_embedding_model