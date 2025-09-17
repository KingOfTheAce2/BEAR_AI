"""
BEAR AI Document Analysis System
Comprehensive local document processing with legal specialization

Features:
- Local PDF, DOCX, TXT parsing with OCR
- Legal document type classification
- Contract clause extraction and analysis
- Entity recognition for legal documents
- Risk assessment algorithms
- Citation and case law extraction
- Local LLM integration for Q&A
- Document encryption and security
- Audit trails and access controls
"""

from .document_processor import (
    DocumentProcessor,
    DocumentType,
    ProcessingResult,
    ProcessingConfig
)
from .legal_analyzer import (
    LegalDocumentAnalyzer,
    ContractAnalyzer,
    ClauseExtractor,
    RiskAssessment
)
from .entity_extractor import (
    LegalEntityExtractor,
    LegalEntity,
    EntityType
)
from .citation_extractor import (
    CitationExtractor,
    LegalCitation,
    CaseReference
)
from .document_qa import (
    DocumentQASystem,
    QAResult,
    QueryType
)
from .security_manager import (
    DocumentSecurityManager,
    EncryptionManager,
    AccessControl,
    AuditLogger
)
from .knowledge_base import (
    LocalKnowledgeBase,
    LegalResearchEngine
)

__all__ = [
    'DocumentProcessor',
    'DocumentType',
    'ProcessingResult',
    'ProcessingConfig',
    'LegalDocumentAnalyzer',
    'ContractAnalyzer',
    'ClauseExtractor',
    'RiskAssessment',
    'LegalEntityExtractor',
    'LegalEntity',
    'EntityType',
    'CitationExtractor',
    'LegalCitation',
    'CaseReference',
    'DocumentQASystem',
    'QAResult',
    'QueryType',
    'DocumentSecurityManager',
    'EncryptionManager',
    'AccessControl',
    'AuditLogger',
    'LocalKnowledgeBase',
    'LegalResearchEngine'
]

__version__ = '1.0.0'
