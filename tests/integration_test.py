"""Integration test for RAG system with legal_chat.py."""

import tempfile
import os
from pathlib import Path
from unittest.mock import patch, Mock

def test_rag_legal_chat_integration():
    """Test that RAG system integrates properly with legal_chat.py"""
    
    # Test imports
    from bear_ai.rag import RAGPipeline, create_case_docs_structure
    from bear_ai.local_store import DATA_DIR
    
    # Create temporary test environment
    with tempfile.TemporaryDirectory() as tmpdir:
        case_id = "integration_test_case"
        
        # Create case documents structure
        docs_dir = create_case_docs_structure(case_id, tmpdir)
        
        # Add test documents
        (docs_dir / "contract.txt").write_text(
            "This is a test legal contract. The parties agree to terms and conditions. "
            "Payment shall be made within 30 days. Liability is limited as specified."
        )
        
        (docs_dir / "memo.md").write_text(
            "# Legal Memorandum\n\n"
            "## Analysis\n"
            "The contract terms require careful review. "
            "**Key points:** liability, payment terms, termination clauses."
        )
        
        # Test RAG pipeline creation and querying
        rag = RAGPipeline.from_case_docs(case_id, tmpdir)
        
        # Test basic functionality
        assert rag.case_id == case_id
        assert rag.index is not None
        
        # Test document stats
        stats = rag.get_document_stats()
        assert stats['indexed'] is True
        assert stats['total_documents'] >= 2
        assert stats['total_chunks'] >= 2
        
        # Test querying
        results = rag.query("contract terms payment")
        assert len(results) > 0
        
        # Check that results contain expected content
        contract_found = any("contract" in r.text.lower() for r in results)
        assert contract_found, "Contract document should be found in results"
        
        # Test that scoring works
        scores = [r.score for r in results]
        assert all(s > 0 for s in scores), "All results should have positive scores"
        assert scores == sorted(scores, reverse=True), "Results should be sorted by score"
        
        print("✓ RAG system integration test passed!")


def test_legal_chat_rag_workflow():
    """Test the workflow that legal_chat.py would use."""
    
    from bear_ai.rag import RAGPipeline
    
    # Simulate the workflow from legal_chat.py _send_message method
    with tempfile.TemporaryDirectory() as tmpdir:
        case_id = "workflow_test"
        user_query = "What are the payment terms in the contract?"
        
        # Create documents (simulating uploaded files)
        docs_dir = Path(tmpdir) / "docs" / case_id
        docs_dir.mkdir(parents=True)
        
        (docs_dir / "agreement.txt").write_text(
            "PAYMENT TERMS: All payments shall be made within thirty (30) days "
            "of invoice date. Late payments incur 1.5% monthly interest. "
            "Payment methods include wire transfer and certified check."
        )
        
        (docs_dir / "policy.txt").write_text(
            "Company policy requires all contracts to specify payment terms clearly. "
            "Standard payment period is 30 days. Extensions require approval."
        )
        
        # Create RAG pipeline (as done in legal_chat.py)
        rag = RAGPipeline.from_case_docs(case_id, tmpdir)
        
        # Query for relevant snippets (as done in legal_chat.py)
        rag_snippets = rag.query(user_query, top_k=3)
        
        # Verify results are useful
        assert len(rag_snippets) > 0
        
        # Check that payment-related content is found
        payment_content = [s for s in rag_snippets if "payment" in s.text.lower()]
        assert len(payment_content) > 0, "Should find payment-related content"
        
        # Build context string (as done in legal_chat.py)
        snip_block = "\n\nRelevant excerpts:\n" + "\n".join(
            f"- {s.file}: {s.text}" for s in rag_snippets
        )
        
        # Verify context is properly formatted
        assert "Relevant excerpts:" in snip_block
        assert "thirty (30) days" in snip_block or "30 days" in snip_block
        
        print("✓ Legal chat RAG workflow test passed!")


def test_document_management_workflow():
    """Test document management features."""
    
    from bear_ai.rag import RAGPipeline, create_case_docs_structure
    
    with tempfile.TemporaryDirectory() as tmpdir:
        case_id = "doc_mgmt_test"
        
        # Create initial document
        docs_dir = create_case_docs_structure(case_id, tmpdir)
        (docs_dir / "initial.txt").write_text("Initial document content for testing.")
        
        # Create RAG pipeline
        rag = RAGPipeline.from_case_docs(case_id, tmpdir)
        
        initial_stats = rag.get_document_stats()
        assert initial_stats['total_documents'] == 1
        
        # Add more documents (simulating file uploads)
        (docs_dir / "added.txt").write_text("Additional document with more content.")
        (docs_dir / "contract.md").write_text("# Contract\n\nContract terms and conditions.")
        
        # Update index (incremental)
        rag.update_documents()
        
        updated_stats = rag.get_document_stats()
        assert updated_stats['total_documents'] == 3
        assert updated_stats['total_chunks'] >= 3
        
        # Test that file types are tracked
        assert 'txt' in updated_stats['file_types']
        assert 'markdown' in updated_stats['file_types']
        
        # Test that all documents are searchable
        results = rag.query("contract terms")
        assert len(results) > 0
        
        # Test force rebuild
        rag.update_documents(force_rebuild=True)
        rebuild_stats = rag.get_document_stats()
        assert rebuild_stats['total_documents'] == updated_stats['total_documents']
        
        print("✓ Document management workflow test passed!")


if __name__ == "__main__":
    test_rag_legal_chat_integration()
    test_legal_chat_rag_workflow()
    test_document_management_workflow()
    print("\n🎉 All integration tests passed!")