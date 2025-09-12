"""
SQLite FTS5 Database Schema for Court Cases Search
Optimized for full-text search with relevance ranking and performance
"""

import sqlite3
from typing import Optional, Dict, Any
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class SearchDatabase:
    """Database manager for FTS5 court cases search system"""
    
    def __init__(self, db_path: str = "data/court_cases.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
    
    def _init_database(self):
        """Initialize database with optimized schema"""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript(self._get_schema_sql())
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.execute("PRAGMA cache_size=10000")
            conn.execute("PRAGMA temp_store=memory")
            conn.commit()
        logger.info(f"Database initialized at {self.db_path}")
    
    def _get_schema_sql(self) -> str:
        """Get complete database schema SQL"""
        return """
        -- Main cases table with metadata and performance indexes
        CREATE TABLE IF NOT EXISTS cases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_number TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            court TEXT NOT NULL,
            date_filed DATE,
            case_type TEXT,
            status TEXT,
            parties TEXT,
            summary TEXT,
            full_text TEXT,
            jurisdiction TEXT,
            judge TEXT,
            attorney TEXT,
            outcome TEXT,
            importance_score REAL DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Performance indexes on frequently queried fields
        CREATE INDEX IF NOT EXISTS idx_cases_court ON cases(court);
        CREATE INDEX IF NOT EXISTS idx_cases_date_filed ON cases(date_filed);
        CREATE INDEX IF NOT EXISTS idx_cases_case_type ON cases(case_type);
        CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
        CREATE INDEX IF NOT EXISTS idx_cases_jurisdiction ON cases(jurisdiction);
        CREATE INDEX IF NOT EXISTS idx_cases_judge ON cases(judge);
        CREATE INDEX IF NOT EXISTS idx_cases_importance ON cases(importance_score DESC);
        CREATE INDEX IF NOT EXISTS idx_cases_updated ON cases(updated_at DESC);
        
        -- Composite indexes for common query patterns
        CREATE INDEX IF NOT EXISTS idx_cases_court_date ON cases(court, date_filed DESC);
        CREATE INDEX IF NOT EXISTS idx_cases_type_status ON cases(case_type, status);
        
        -- FTS5 virtual table for full-text search with BM25 ranking
        CREATE VIRTUAL TABLE IF NOT EXISTS cases_fts USING fts5(
            case_number,
            title,
            court,
            parties,
            summary,
            full_text,
            jurisdiction,
            judge,
            attorney,
            outcome,
            content_rowid=id,
            content='cases',
            tokenize='porter ascii'
        );
        
        -- Triggers to keep FTS5 table synchronized
        CREATE TRIGGER IF NOT EXISTS cases_fts_insert AFTER INSERT ON cases BEGIN
            INSERT INTO cases_fts(rowid, case_number, title, court, parties, summary, 
                                  full_text, jurisdiction, judge, attorney, outcome)
            VALUES (new.id, new.case_number, new.title, new.court, new.parties, 
                   new.summary, new.full_text, new.jurisdiction, new.judge, 
                   new.attorney, new.outcome);
        END;
        
        CREATE TRIGGER IF NOT EXISTS cases_fts_delete AFTER DELETE ON cases BEGIN
            DELETE FROM cases_fts WHERE rowid = old.id;
        END;
        
        CREATE TRIGGER IF NOT EXISTS cases_fts_update AFTER UPDATE ON cases BEGIN
            DELETE FROM cases_fts WHERE rowid = old.id;
            INSERT INTO cases_fts(rowid, case_number, title, court, parties, summary,
                                  full_text, jurisdiction, judge, attorney, outcome)
            VALUES (new.id, new.case_number, new.title, new.court, new.parties,
                   new.summary, new.full_text, new.jurisdiction, new.judge,
                   new.attorney, new.outcome);
        END;
        
        -- Search analytics table for performance monitoring
        CREATE TABLE IF NOT EXISTS search_analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query_text TEXT NOT NULL,
            filter_params TEXT,
            result_count INTEGER,
            execution_time_ms REAL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp 
        ON search_analytics(timestamp DESC);
        
        -- Search suggestions table for autocomplete
        CREATE TABLE IF NOT EXISTS search_suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            term TEXT UNIQUE NOT NULL,
            frequency INTEGER DEFAULT 1,
            last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_suggestions_term ON search_suggestions(term);
        CREATE INDEX IF NOT EXISTS idx_suggestions_frequency 
        ON search_suggestions(frequency DESC);
        
        -- Future vectorization support table
        CREATE TABLE IF NOT EXISTS case_embeddings (
            case_id INTEGER PRIMARY KEY,
            embedding_model TEXT NOT NULL,
            embedding_vector BLOB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_embeddings_model ON case_embeddings(embedding_model);
        """
    
    def get_connection(self) -> sqlite3.Connection:
        """Get database connection with optimized settings"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        return conn
    
    def optimize_database(self):
        """Run database optimization commands"""
        with self.get_connection() as conn:
            logger.info("Starting database optimization...")
            
            # Rebuild FTS5 index for optimal performance
            conn.execute("INSERT INTO cases_fts(cases_fts) VALUES('rebuild')")
            
            # Update table statistics
            conn.execute("ANALYZE")
            
            # Optimize FTS5 index structure
            conn.execute("INSERT INTO cases_fts(cases_fts) VALUES('optimize')")
            
            # Vacuum to reclaim space
            conn.execute("VACUUM")
            
            conn.commit()
            logger.info("Database optimization completed")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        with self.get_connection() as conn:
            stats = {}
            
            # Basic counts
            stats['total_cases'] = conn.execute("SELECT COUNT(*) FROM cases").fetchone()[0]
            stats['fts_rows'] = conn.execute("SELECT COUNT(*) FROM cases_fts").fetchone()[0]
            
            # Recent activity
            stats['recent_searches'] = conn.execute(
                "SELECT COUNT(*) FROM search_analytics WHERE timestamp > datetime('now', '-1 day')"
            ).fetchone()[0]
            
            # Database size info
            page_count = conn.execute("PRAGMA page_count").fetchone()[0]
            page_size = conn.execute("PRAGMA page_size").fetchone()[0]
            stats['db_size_mb'] = (page_count * page_size) / (1024 * 1024)
            
            return stats