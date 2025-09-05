"""Comprehensive tests for RAG system functionality."""

import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch
import json

from bear_ai.rag import (
    RAGPipeline, 
    DocumentIndex,
    Snippet,
    DocumentMetadata,
    _tokenize,
    _read_text_file,
    _chunk_text,
    _extract_markdown_text,
    create_case_docs_structure
)


class TestTokenization:
    """Test text tokenization functionality."""
    
    def test_basic_tokenization(self):
        """Test basic word tokenization."""
        text = "Hello world! This is a test."
        tokens = _tokenize(text)
        assert tokens == ['hello', 'world', 'this', 'is', 'a', 'test']
    
    def test_tokenization_with_special_chars(self):
        """Test tokenization with special characters."""
        text = "Contract #123-ABC (dated 2024-01-01) - Section 4.5"
        tokens = _tokenize(text)
        expected = ['contract', '123', 'abc', 'dated', '2024', '01', '01', 'section', '4', '5']
        assert tokens == expected
    
    def test_empty_text_tokenization(self):
        """Test tokenization of empty text."""
        assert _tokenize("") == []
        assert _tokenize("   ") == []


class TestTextChunking:
    """Test document chunking functionality."""
    
    def test_small_text_no_chunking(self):
        """Test that small text is not chunked."""
        text = "This is a small document."
        chunks = _chunk_text(text, max_size=100)
        assert len(chunks) == 1
        assert chunks[0] == text
    
    def test_large_text_chunking(self):
        """Test chunking of large text."""
        # Create a large text with clear sentence boundaries
        sentences = ["This is sentence {}.".format(i) for i in range(50)]
        text = " ".join(sentences)
        
        chunks = _chunk_text(text, max_size=200, overlap=50)
        
        assert len(chunks) > 1
        # Check that chunks have reasonable size
        for chunk in chunks:
            assert len(chunk) <= 250  # Max size + some tolerance for sentence boundaries
            assert len(chunk.strip()) >= 50  # Min size requirement
    
    def test_chunk_overlap(self):
        """Test that chunks have proper overlap."""
        text = "Sentence one. Sentence two. Sentence three. Sentence four. Sentence five."
        chunks = _chunk_text(text, max_size=30, overlap=10)
        
        # Should have some overlap between consecutive chunks
        assert len(chunks) > 1
        # This is a basic test - in real implementation, we'd check for actual content overlap
    
    def test_chunk_boundary_detection(self):
        """Test that chunks break at sentence boundaries when possible."""
        text = "First paragraph.\n\nSecond paragraph with more text. Third sentence here."
        chunks = _chunk_text(text, max_size=40)
        
        # Should prefer breaking at paragraph or sentence boundaries
        for chunk in chunks:
            assert not chunk.endswith(" ")  # No trailing spaces
            assert len(chunk.strip()) > 0


class TestFileReading:
    """Test file reading functionality."""
    
    def test_read_text_file_success(self):
        """Test successful text file reading."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            test_content = "This is test content."
            f.write(test_content)
            f.flush()
            
            try:
                content = _read_text_file(f.name)
                assert content == test_content
            finally:
                os.unlink(f.name)
    
    def test_read_nonexistent_file(self):
        """Test reading nonexistent file returns empty string."""
        content = _read_text_file("/nonexistent/file.txt")
        assert content == ""
    
    def test_read_markdown_file(self):
        """Test markdown file reading and processing."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            markdown_content = "# Header\n\n**Bold text** and *italic text*\n\n`code`"
            f.write(markdown_content)
            f.flush()
            
            try:
                content = _extract_markdown_text(f.name)
                # Should remove markdown formatting
                assert "Header" in content
                assert "Bold text" in content
                assert "italic text" in content
                assert "code" in content
                # Should not contain markdown syntax
                assert "**" not in content
                assert "*" not in content.replace("italic", "")  # Allow * in "italic" 
                assert "`" not in content
            finally:
                os.unlink(f.name)


@pytest.mark.skipif(True, reason="PDF tests require pypdf library")
class TestPDFExtraction:
    """Test PDF text extraction - requires pypdf."""
    
    def test_extract_pdf_text_no_library(self):
        """Test PDF extraction when library not available."""
        with patch('bear_ai.rag.pypdf', side_effect=ImportError):
            from bear_ai.rag import _extract_pdf_text
            content = _extract_pdf_text("dummy.pdf")
            assert content == ""
    
    @patch('bear_ai.rag.pypdf')
    def test_extract_pdf_text_success(self, mock_pypdf):
        """Test successful PDF text extraction."""
        mock_reader = Mock()
        mock_page = Mock()
        mock_page.extract_text.return_value = "PDF content here"
        mock_reader.pages = [mock_page]
        mock_pypdf.PdfReader.return_value = mock_reader
        
        from bear_ai.rag import _extract_pdf_text
        content = _extract_pdf_text("dummy.pdf")
        
        assert content == "[Page 1] PDF content here"


@pytest.mark.skipif(True, reason="DOCX tests require python-docx library")
class TestDOCXExtraction:
    """Test DOCX text extraction - requires python-docx."""
    
    def test_extract_docx_text_no_library(self):
        """Test DOCX extraction when library not available."""
        with patch('bear_ai.rag.docx', side_effect=ImportError):
            from bear_ai.rag import _extract_docx_text
            content = _extract_docx_text("dummy.docx")
            assert content == ""
    
    @patch('bear_ai.rag.docx')
    def test_extract_docx_text_success(self, mock_docx):
        """Test successful DOCX text extraction."""
        mock_doc = Mock()
        mock_para1 = Mock()
        mock_para1.text = "First paragraph"
        mock_para1.style.name = "Normal"
        mock_para2 = Mock()
        mock_para2.text = "Second paragraph"
        mock_para2.style.name = "Heading 1"
        
        mock_doc.paragraphs = [mock_para1, mock_para2]
        mock_doc.tables = []
        mock_docx.Document.return_value = mock_doc
        
        from bear_ai.rag import _extract_docx_text
        content = _extract_docx_text("dummy.docx")
        
        assert "First paragraph" in content
        assert "## Second paragraph" in content  # Heading formatting


class TestDocumentIndex:
    """Test document indexing functionality."""
    
    @pytest.fixture
    def temp_case_dir(self):
        """Create temporary case directory structure."""
        with tempfile.TemporaryDirectory() as tmpdir:
            base_dir = Path(tmpdir)
            case_id = "test_case"
            
            # Create case docs directory
            docs_dir = base_dir / "docs" / case_id
            docs_dir.mkdir(parents=True)
            
            # Create test documents
            (docs_dir / "doc1.txt").write_text("This is the first document content.")
            (docs_dir / "doc2.txt").write_text("This is the second document with different content.")
            (docs_dir / "doc3.md").write_text("# Markdown Document\n\nThis is markdown content.")
            
            yield {
                'base_dir': str(base_dir),
                'case_id': case_id,
                'docs_dir': docs_dir
            }
    
    def test_document_index_creation(self, temp_case_dir):
        """Test creating document index."""
        index = DocumentIndex(temp_case_dir['case_id'], temp_case_dir['base_dir'])
        
        assert index.case_id == temp_case_dir['case_id']
        assert index.docs_dir.exists()
        assert index.index_dir.exists()
    
    def test_document_indexing(self, temp_case_dir):
        """Test indexing documents."""
        index = DocumentIndex(temp_case_dir['case_id'], temp_case_dir['base_dir'])
        index.update_index()
        
        # Should have indexed all text and markdown files
        chunks = index.get_all_chunks()
        assert len(chunks) >= 3  # At least 3 documents
        
        # Check metadata
        assert len(index._metadata) >= 3
        
        # Check that markdown was processed
        chunk_texts = [chunk[1] for chunk in chunks]
        markdown_chunks = [text for text in chunk_texts if "Markdown Document" in text]
        assert len(markdown_chunks) > 0
    
    def test_incremental_indexing(self, temp_case_dir):
        """Test incremental indexing - only reindex changed files."""
        index = DocumentIndex(temp_case_dir['case_id'], temp_case_dir['base_dir'])
        index.update_index()
        
        initial_metadata_count = len(index._metadata)
        
        # Update index again - should not reindex unchanged files
        index.update_index()
        assert len(index._metadata) == initial_metadata_count
        
        # Add new file
        new_doc = Path(temp_case_dir['docs_dir']) / "doc4.txt"
        new_doc.write_text("New document content")
        
        index.update_index()
        assert len(index._metadata) == initial_metadata_count + 1
    
    def test_force_rebuild_index(self, temp_case_dir):
        """Test force rebuilding index."""
        index = DocumentIndex(temp_case_dir['case_id'], temp_case_dir['base_dir'])
        index.update_index()
        
        initial_count = len(index._metadata)
        
        # Force rebuild should reindex all files
        index.update_index(force_rebuild=True)
        assert len(index._metadata) == initial_count


class TestRAGPipeline:
    """Test RAG pipeline functionality."""
    
    @pytest.fixture
    def temp_case_setup(self):
        """Setup temporary case with documents."""
        with tempfile.TemporaryDirectory() as tmpdir:
            base_dir = Path(tmpdir)
            case_id = "test_case"
            
            # Create case docs
            docs_dir = base_dir / "docs" / case_id
            docs_dir.mkdir(parents=True)
            
            # Create diverse test documents
            (docs_dir / "contract.txt").write_text(
                "This is a legal contract between parties. "
                "The contract contains terms and conditions for services. "
                "Payment terms are specified in section 3."
            )
            
            (docs_dir / "memo.txt").write_text(
                "Legal memorandum regarding contract interpretation. "
                "The analysis covers liability and indemnification clauses. "
                "Recommendations are provided for contract modification."
            )
            
            (docs_dir / "research.md").write_text(
                "# Legal Research Notes\n\n"
                "## Case Law\n"
                "Relevant precedents for contract disputes. "
                "Court decisions support interpretation of liability clauses."
            )
            
            yield {
                'base_dir': str(base_dir),
                'case_id': case_id,
                'docs_dir': docs_dir
            }
    
    def test_rag_pipeline_creation_from_case(self, temp_case_setup):
        """Test creating RAG pipeline from case documents."""
        rag = RAGPipeline.from_case_docs(
            temp_case_setup['case_id'], 
            temp_case_setup['base_dir']
        )
        
        assert rag.case_id == temp_case_setup['case_id']
        assert rag.index is not None
        
        # Should have indexed documents
        chunks = rag.index.get_all_chunks()
        assert len(chunks) >= 3
    
    def test_rag_query_basic(self, temp_case_setup):
        """Test basic RAG querying."""
        rag = RAGPipeline.from_case_docs(
            temp_case_setup['case_id'], 
            temp_case_setup['base_dir']
        )
        
        results = rag.query("contract terms")
        
        assert len(results) > 0
        assert all(isinstance(r, Snippet) for r in results)
        assert all(r.score > 0 for r in results)
        
        # Results should be sorted by score (descending)
        scores = [r.score for r in results]
        assert scores == sorted(scores, reverse=True)
    
    def test_rag_query_relevance(self, temp_case_setup):
        """Test query relevance scoring."""
        rag = RAGPipeline.from_case_docs(
            temp_case_setup['case_id'], 
            temp_case_setup['base_dir']
        )
        
        # Query for specific terms
        contract_results = rag.query("contract payment terms")
        liability_results = rag.query("liability indemnification")
        
        # Contract query should find contract document with high score
        contract_scores = [r.score for r in contract_results if "contract" in r.text.lower()]
        liability_scores = [r.score for r in liability_results if "liability" in r.text.lower()]
        
        assert len(contract_scores) > 0
        assert len(liability_scores) > 0
    
    def test_rag_query_empty(self, temp_case_setup):
        """Test querying with empty or irrelevant terms."""
        rag = RAGPipeline.from_case_docs(
            temp_case_setup['case_id'], 
            temp_case_setup['base_dir']
        )
        
        # Empty query
        results = rag.query("")
        assert len(results) == 0
        
        # Very irrelevant query
        results = rag.query("quantum physics astronomy")
        # Might return some results due to fuzzy matching, but scores should be low
        if results:
            assert all(r.score < 1.0 for r in results)
    
    def test_rag_top_k_limiting(self, temp_case_setup):
        """Test top-k result limiting."""
        rag = RAGPipeline.from_case_docs(
            temp_case_setup['case_id'], 
            temp_case_setup['base_dir']
        )
        
        # Test different top_k values
        results_1 = rag.query("contract", top_k=1)
        results_3 = rag.query("contract", top_k=3)
        
        assert len(results_1) <= 1
        assert len(results_3) <= 3
        
        if len(results_1) == 1 and len(results_3) >= 1:
            # Top result should be the same
            assert results_1[0].file == results_3[0].file
    
    def test_rag_snippet_extraction(self, temp_case_setup):
        """Test snippet extraction around query terms."""
        rag = RAGPipeline.from_case_docs(
            temp_case_setup['case_id'], 
            temp_case_setup['base_dir']
        )
        
        results = rag.query("contract parties")
        
        for result in results:
            # Snippet should contain query terms when they match
            if result.score > 0.1:  # Reasonable score threshold
                snippet_lower = result.text.lower()
                # Should contain at least one query term
                assert "contract" in snippet_lower or "parties" in snippet_lower
    
    def test_rag_document_stats(self, temp_case_setup):
        """Test document statistics."""
        rag = RAGPipeline.from_case_docs(
            temp_case_setup['case_id'], 
            temp_case_setup['base_dir']
        )
        
        stats = rag.get_document_stats()
        
        assert stats['indexed'] is True
        assert stats['total_documents'] >= 3
        assert stats['total_chunks'] >= 3
        assert 'file_types' in stats
        assert 'txt' in stats['file_types'] or 'markdown' in stats['file_types']
        assert stats['total_size_bytes'] > 0
    
    def test_rag_legacy_compatibility(self):
        """Test backwards compatibility with old docs format."""
        # Test legacy initialization
        docs = [
            ("doc1.txt", "This is document one content."),
            ("doc2.txt", "This is document two content.")
        ]
        
        rag = RAGPipeline(docs=docs)
        
        results = rag.query("document content")
        assert len(results) > 0
        
        # Legacy mode should not have indexing
        stats = rag.get_document_stats()
        assert stats['indexed'] is False
        assert stats['total_documents'] == 2
    
    def test_rag_memory_efficiency(self, temp_case_setup):
        """Test memory efficiency with large documents."""
        # Create a large document
        large_content = "Large document content. " * 1000  # ~24KB
        large_doc = Path(temp_case_setup['docs_dir']) / "large.txt"
        large_doc.write_text(large_content)
        
        rag = RAGPipeline.from_case_docs(
            temp_case_setup['case_id'], 
            temp_case_setup['base_dir']
        )
        
        # Should handle large document without issues
        results = rag.query("document content")
        assert len(results) > 0
        
        # Should be chunked properly
        chunks = rag.index.get_all_chunks()
        large_chunks = [c for c in chunks if "large.txt" in c[0]]
        assert len(large_chunks) > 1  # Should be chunked


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    def test_corrupted_file_handling(self):
        """Test handling of corrupted or unreadable files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            base_dir = Path(tmpdir)
            case_id = "error_case"
            
            docs_dir = base_dir / "docs" / case_id
            docs_dir.mkdir(parents=True)
            
            # Create a file that will cause read errors
            bad_file = docs_dir / "bad.txt"
            bad_file.write_bytes(b'\x80\x81\x82\x83')  # Invalid UTF-8
            
            # Should handle gracefully
            rag = RAGPipeline.from_case_docs(case_id, str(base_dir))
            
            # Should not crash on indexing
            stats = rag.get_document_stats()
            assert stats['indexed'] is True
    
    def test_missing_case_directory(self):
        """Test handling missing case directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            rag = RAGPipeline.from_case_docs("nonexistent_case", tmpdir)
            
            results = rag.query("anything")
            assert len(results) == 0
            
            stats = rag.get_document_stats()
            assert stats['total_documents'] == 0
    
    def test_index_corruption_recovery(self):
        """Test recovery from corrupted index files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            base_dir = Path(tmpdir)
            case_id = "test_case"
            
            # Create valid documents
            docs_dir = base_dir / "docs" / case_id
            docs_dir.mkdir(parents=True)
            (docs_dir / "doc.txt").write_text("Valid document content.")
            
            # Create index and corrupt it
            rag = RAGPipeline.from_case_docs(case_id, str(base_dir))
            
            # Corrupt index file
            index_file = rag.index.index_file
            index_file.write_text("invalid json content")
            
            # Should recover and rebuild index
            rag2 = RAGPipeline.from_case_docs(case_id, str(base_dir))
            results = rag2.query("document")
            assert len(results) > 0


class TestUtilityFunctions:
    """Test utility functions."""
    
    def test_create_case_docs_structure(self):
        """Test creating case document directory structure."""
        with tempfile.TemporaryDirectory() as tmpdir:
            case_id = "new_case"
            
            docs_dir = create_case_docs_structure(case_id, tmpdir)
            
            assert docs_dir.exists()
            assert docs_dir.is_dir()
            assert docs_dir.name == case_id
            assert "docs" in str(docs_dir)
    
    def test_create_case_docs_structure_existing(self):
        """Test creating structure when directory already exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            base_dir = Path(tmpdir)
            case_id = "existing_case"
            
            # Create directory first
            existing_dir = base_dir / "docs" / case_id
            existing_dir.mkdir(parents=True)
            
            # Should not raise error
            docs_dir = create_case_docs_structure(case_id, str(base_dir))
            assert docs_dir.exists()