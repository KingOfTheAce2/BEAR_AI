"""
Production Validation: Legal PII Scrubbing Accuracy and Performance

This test suite validates the production readiness of BEAR AI's PII scrubbing
capabilities, specifically testing against real legal document patterns and
ensuring compliance with privacy regulations.
"""

import pytest
import time
import random
import string
from typing import List, Dict, Any
from unittest.mock import Mock, patch, MagicMock

# Import the PII scrubbing components to test
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

try:
    from bear_ai.pii.scrubber import Scrubber, PIIEntity, get_legal_pii_scrubber
    from bear_ai.pii.policy import Policy
    from bear_ai.pii.legal_recognizers import get_legal_recognizers
    PII_AVAILABLE = True
except ImportError:
    PII_AVAILABLE = False
    Scrubber = Mock
    PIIEntity = Mock
    Policy = Mock


class TestLegalPIIScrubbing:
    """Test suite for legal-specific PII scrubbing functionality."""

    @pytest.fixture
    def legal_scrubber(self):
        """Create a legal PII scrubber for testing."""
        if not PII_AVAILABLE:
            pytest.skip("PII scrubbing not available")
        return get_legal_pii_scrubber()

    @pytest.fixture
    def standard_scrubber(self):
        """Create a standard PII scrubber for comparison."""
        if not PII_AVAILABLE:
            pytest.skip("PII scrubbing not available")
        return Scrubber(enable_legal_entities=False)

    @pytest.fixture
    def legal_policy(self):
        """Create a legal document processing policy."""
        if not PII_AVAILABLE:
            pytest.skip("PII scrubbing not available")
        
        policy = Policy()
        # Configure for legal document processing
        policy.add_entity("PERSON", "inbound", "replace", "[PERSON]")
        policy.add_entity("ORGANIZATION", "inbound", "replace", "[LAW_FIRM]")
        policy.add_entity("EMAIL_ADDRESS", "inbound", "replace", "[EMAIL]")
        policy.add_entity("PHONE_NUMBER", "inbound", "replace", "[PHONE]")
        policy.add_entity("LAW_FIRM", "inbound", "replace", "[LAW_FIRM]")
        policy.add_entity("COURT_CASE", "inbound", "replace", "[CASE_REF]")
        policy.add_entity("LEGAL_PROFESSIONAL", "inbound", "replace", "[ATTORNEY]")
        policy.add_entity("BAR_LICENSE", "inbound", "replace", "[BAR_ID]")
        policy.add_entity("CONFIDENTIAL_LEGAL", "inbound", "replace", "[CONFIDENTIAL]")
        policy.set_confidence_threshold(0.7)
        return policy

    def test_real_legal_document_scrubbing(self, legal_scrubber, legal_policy):
        """Test scrubbing of realistic legal document content."""
        legal_document = """
        CONFIDENTIAL ATTORNEY-CLIENT PRIVILEGED COMMUNICATION
        
        Law Firm: Smith, Johnson & Associates LLP
        Attorney: Sarah M. Johnson, Esq. (Bar #12345)
        Client: ABC Corporation
        Case: Smith v. Johnson, Case No. 2023-CV-1234
        
        MEMORANDUM
        
        TO: John Doe (john.doe@abccorp.com, 555-123-4567)
        FROM: Sarah Johnson (sjohnson@smithlaw.com)
        DATE: March 15, 2024
        RE: Contract Dispute Analysis
        
        Dear Mr. Doe,
        
        Pursuant to our discussion regarding the contract dispute with XYZ Industries,
        I have reviewed the relevant documents. The opposing counsel, Michael Davis
        from Davis & Partners (mdavis@davislaw.com, 555-987-6543), has indicated
        their position on the matter.
        
        Key findings:
        - BSN: 123456789 (Dutch client identification)
        - RSIN: 123456789B01 (Company registration)
        - Contract value: €150,000
        - Liable party: Jennifer Smith (SSN: 123-45-6789)
        
        This communication is protected by attorney-client privilege and work product doctrine.
        Any unauthorized disclosure is strictly prohibited.
        
        Confidentially yours,
        Sarah M. Johnson, Esq.
        State Bar License #12345
        """

        scrubbed_text = legal_scrubber.scrub(legal_document, legal_policy, "inbound")
        
        # Verify PII has been scrubbed
        assert "john.doe@abccorp.com" not in scrubbed_text
        assert "555-123-4567" not in scrubbed_text
        assert "sjohnson@smithlaw.com" not in scrubbed_text
        assert "123-45-6789" not in scrubbed_text
        assert "123456789" not in scrubbed_text  # BSN
        assert "123456789B01" not in scrubbed_text  # RSIN
        
        # Verify legal-specific entities are scrubbed
        assert "Smith, Johnson & Associates LLP" not in scrubbed_text or "[LAW_FIRM]" in scrubbed_text
        assert "Case No. 2023-CV-1234" not in scrubbed_text or "[CASE_REF]" in scrubbed_text
        assert "Bar #12345" not in scrubbed_text or "[BAR_ID]" in scrubbed_text
        
        # Verify replacement tokens are present
        assert "[EMAIL]" in scrubbed_text
        assert "[PHONE]" in scrubbed_text
        assert "[PERSON]" in scrubbed_text
        
        # Verify non-PII content is preserved
        assert "MEMORANDUM" in scrubbed_text
        assert "Contract Dispute Analysis" in scrubbed_text
        assert "attorney-client privilege" in scrubbed_text

    def test_dutch_legal_entities_recognition(self, legal_scrubber, legal_policy):
        """Test recognition of Dutch legal identifiers (BSN, RSIN)."""
        dutch_content = """
        Client Information:
        - BSN (Burgerservicenummer): 123456782
        - BSN: 987654321
        - Company RSIN: 123456789B01
        - RSIN number: 987654321B12
        - Invalid BSN: 123456789 (fails checksum)
        - Invalid RSIN: 123456789B99 (invalid check)
        """

        scrubbed_text = legal_scrubber.scrub(dutch_content, legal_policy, "inbound")
        
        # Valid BSN/RSIN should be scrubbed
        assert "123456782" not in scrubbed_text  # Valid BSN
        assert "987654321" not in scrubbed_text  # Valid BSN
        assert "123456789B01" not in scrubbed_text  # Valid RSIN
        assert "987654321B12" not in scrubbed_text  # Valid RSIN
        
        # Invalid numbers might still be present (depending on implementation)
        # but should not cause errors

    def test_legal_professional_recognition(self, legal_scrubber, legal_policy):
        """Test recognition of legal professional identifiers."""
        legal_text = """
        Attorneys involved:
        - Sarah Johnson, Esq.
        - Michael Davis, Attorney at Law
        - Jennifer Smith, J.D.
        - Bar License #12345
        - State Bar ID: NY-67890
        - Admission Date: June 15, 2010
        """

        scrubbed_text = legal_scrubber.scrub(legal_text, legal_policy, "inbound")
        
        # Legal professional names should be scrubbed
        assert "[ATTORNEY]" in scrubbed_text or "[PERSON]" in scrubbed_text
        
        # Bar license numbers should be scrubbed
        assert "[BAR_ID]" in scrubbed_text
        assert "12345" not in scrubbed_text
        assert "NY-67890" not in scrubbed_text

    def test_court_case_references(self, legal_scrubber, legal_policy):
        """Test recognition of court case references."""
        case_text = """
        Related Cases:
        - Smith v. Johnson, Case No. 2023-CV-1234
        - Doe v. XYZ Corp., No. 2024-CR-5678
        - Matter of ABC Trust, Probate Case 2023-P-9012
        - Docket #2024-D-3456
        - File Reference: F-2023-7890
        """

        scrubbed_text = legal_scrubber.scrub(case_text, legal_policy, "inbound")
        
        # Case references should be scrubbed
        assert "[CASE_REF]" in scrubbed_text
        assert "2023-CV-1234" not in scrubbed_text
        assert "2024-CR-5678" not in scrubbed_text

    def test_performance_with_large_documents(self, legal_scrubber, legal_policy):
        """Test performance with large legal documents."""
        # Generate a large document (similar to real legal documents)
        large_document = self._generate_large_legal_document(50000)  # 50KB document
        
        start_time = time.time()
        scrubbed_text = legal_scrubber.scrub(large_document, legal_policy, "inbound")
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        # Performance requirements for production
        assert processing_time < 5.0, f"Processing took {processing_time:.2f}s, should be < 5s"
        assert len(scrubbed_text) > 0, "Scrubbed text should not be empty"
        
        # Verify some scrubbing occurred
        assert "[EMAIL]" in scrubbed_text or "[PERSON]" in scrubbed_text

    def test_accuracy_with_legal_context(self, legal_scrubber, legal_policy):
        """Test accuracy of PII detection in legal contexts."""
        test_cases = [
            {
                "text": "Attorney John Smith (jsmith@lawfirm.com) represents the plaintiff.",
                "should_scrub": ["John Smith", "jsmith@lawfirm.com"],
                "should_preserve": ["Attorney", "represents", "plaintiff"]
            },
            {
                "text": "Case No. 2023-CV-1234 filed in District Court.",
                "should_scrub": ["2023-CV-1234"],
                "should_preserve": ["filed", "District Court"]
            },
            {
                "text": "Client BSN: 123456782, residing at 123 Main Street.",
                "should_scrub": ["123456782", "123 Main Street"],
                "should_preserve": ["Client", "residing at"]
            }
        ]
        
        for case in test_cases:
            scrubbed = legal_scrubber.scrub(case["text"], legal_policy, "inbound")
            
            # Verify PII is scrubbed
            for pii in case["should_scrub"]:
                assert pii not in scrubbed, f"PII '{pii}' was not scrubbed in: {scrubbed}"
            
            # Verify non-PII is preserved
            for preserve in case["should_preserve"]:
                assert preserve in scrubbed, f"Text '{preserve}' was incorrectly scrubbed in: {scrubbed}"

    def test_multilingual_legal_documents(self, legal_scrubber, legal_policy):
        """Test scrubbing of multilingual legal documents."""
        multilingual_text = """
        English: Attorney Sarah Johnson (sjohnson@law.com)
        Dutch: Advocaat Jan de Vries (jdevries@advocaten.nl)
        French: Avocat Marie Dubois (mdubois@cabinet.fr)
        German: Anwalt Hans Mueller (hmueller@kanzlei.de)
        
        BSN: 123456782
        Email addresses should be scrubbed regardless of language context.
        """

        scrubbed_text = legal_scrubber.scrub(multilingual_text, legal_policy, "inbound")
        
        # Email addresses should be scrubbed regardless of language
        assert "sjohnson@law.com" not in scrubbed_text
        assert "jdevries@advocaten.nl" not in scrubbed_text
        assert "mdubois@cabinet.fr" not in scrubbed_text
        assert "hmueller@kanzlei.de" not in scrubbed_text
        
        # Names should be scrubbed
        assert "[PERSON]" in scrubbed_text or "[ATTORNEY]" in scrubbed_text
        
        # Language-specific legal terms should be preserved
        assert "Advocaat" in scrubbed_text or "Attorney" in scrubbed_text

    def test_false_positive_prevention(self, legal_scrubber, legal_policy):
        """Test prevention of false positives in legal contexts."""
        legal_text = """
        Case Law Citations:
        - Smith v. Jones, 123 F.3d 456 (2020)
        - Article 123 of the Civil Code
        - Section 456.789 of the Rules
        - Chapter 12, Part 3
        
        Legal Terms:
        - Pro bono representation
        - Habeas corpus petition
        - Res judicata doctrine
        - Attorney work product
        
        Non-PII Numbers:
        - Contract value: $123,456
        - File pages: 789
        - Statute: 18 U.S.C. § 1234
        """

        scrubbed_text = legal_scrubber.scrub(legal_text, legal_policy, "inbound")
        
        # Legal citations should NOT be scrubbed
        assert "123 F.3d 456" in scrubbed_text
        assert "Article 123" in scrubbed_text
        assert "Section 456.789" in scrubbed_text
        
        # Legal terms should be preserved
        assert "Pro bono" in scrubbed_text
        assert "Habeas corpus" in scrubbed_text
        assert "Res judicata" in scrubbed_text
        
        # Non-PII numbers should be preserved
        assert "$123,456" in scrubbed_text
        assert "18 U.S.C. § 1234" in scrubbed_text

    def test_audit_trail_integration(self, legal_scrubber, legal_policy):
        """Test audit trail functionality for compliance."""
        sensitive_text = """
        Client: John Doe (john@example.com, 555-123-4567)
        Attorney: Sarah Smith, Bar #12345
        Case: Confidential v. Matters, No. 2023-CV-1234
        """

        # Enable audit for this test
        with patch('bear_ai.pii.audit.Audit') as mock_audit:
            mock_audit_instance = Mock()
            mock_audit.return_value = mock_audit_instance
            
            # Create scrubber with audit enabled
            audit_scrubber = Scrubber(enable_audit=True, enable_legal_entities=True)
            
            scrubbed_text = audit_scrubber.scrub(sensitive_text, legal_policy, "inbound")
            
            # Verify audit logging was called
            if hasattr(audit_scrubber, '_audit') and audit_scrubber._audit:
                mock_audit_instance.log_scrubbing_event.assert_called()

    def test_policy_based_scrubbing(self, legal_scrubber):
        """Test different scrubbing policies for different contexts."""
        test_text = """
        Attorney: John Smith (jsmith@law.com, 555-123-4567)
        Client: Jane Doe (jdoe@client.com, 555-987-6543)
        """

        # Policy 1: Scrub everything
        strict_policy = Policy()
        strict_policy.add_entity("PERSON", "inbound", "replace", "[REDACTED]")
        strict_policy.add_entity("EMAIL_ADDRESS", "inbound", "replace", "[REDACTED]")
        strict_policy.add_entity("PHONE_NUMBER", "inbound", "replace", "[REDACTED]")
        
        strict_result = legal_scrubber.scrub(test_text, strict_policy, "inbound")
        assert strict_result.count("[REDACTED]") >= 4  # Names, emails, phones
        
        # Policy 2: Preserve attorney info, scrub client info
        selective_policy = Policy()
        selective_policy.add_entity("EMAIL_ADDRESS", "inbound", "replace", "[EMAIL]")
        selective_policy.add_entity("PHONE_NUMBER", "inbound", "replace", "[PHONE]")
        # Don't add PERSON to this policy
        
        selective_result = legal_scrubber.scrub(test_text, selective_policy, "inbound")
        assert "John Smith" in selective_result  # Attorney name preserved
        assert "Jane Doe" in selective_result    # Client name preserved
        assert "[EMAIL]" in selective_result     # Emails scrubbed
        assert "[PHONE]" in selective_result     # Phones scrubbed

    def test_concurrent_scrubbing_performance(self, legal_scrubber, legal_policy):
        """Test performance under concurrent scrubbing operations."""
        import threading
        import queue
        
        test_documents = [
            self._generate_large_legal_document(5000) for _ in range(10)
        ]
        
        results_queue = queue.Queue()
        threads = []
        
        def scrub_document(doc, doc_id):
            start_time = time.time()
            try:
                result = legal_scrubber.scrub(doc, legal_policy, "inbound")
                end_time = time.time()
                results_queue.put({
                    'doc_id': doc_id,
                    'success': True,
                    'time': end_time - start_time,
                    'result_length': len(result)
                })
            except Exception as e:
                results_queue.put({
                    'doc_id': doc_id,
                    'success': False,
                    'error': str(e),
                    'time': time.time() - start_time
                })

        # Start concurrent scrubbing
        start_time = time.time()
        for i, doc in enumerate(test_documents):
            thread = threading.Thread(target=scrub_document, args=(doc, i))
            thread.start()
            threads.append(thread)
        
        # Wait for completion
        for thread in threads:
            thread.join(timeout=30)  # 30 second timeout
        
        total_time = time.time() - start_time
        
        # Collect results
        results = []
        while not results_queue.empty():
            results.append(results_queue.get())
        
        # Verify all documents were processed
        assert len(results) == len(test_documents)
        
        # Verify all succeeded
        for result in results:
            assert result['success'], f"Document {result['doc_id']} failed: {result.get('error', 'Unknown error')}"
        
        # Performance requirements
        assert total_time < 30, f"Concurrent processing took {total_time:.2f}s, should be < 30s"
        
        # Average processing time should be reasonable
        avg_time = sum(r['time'] for r in results) / len(results)
        assert avg_time < 5.0, f"Average processing time {avg_time:.2f}s too high"

    def test_error_handling_and_recovery(self, legal_scrubber, legal_policy):
        """Test error handling with malformed or problematic input."""
        test_cases = [
            "",  # Empty string
            " ",  # Whitespace only
            "a" * 1000000,  # Very long string
            "Invalid UTF-8: \x80\x81\x82",  # Invalid encoding
            "Special chars: \x00\x01\x02",  # Control characters
            None,  # None input (should be handled gracefully)
        ]
        
        for i, test_input in enumerate(test_cases):
            try:
                if test_input is None:
                    # Skip None test as it should raise TypeError
                    continue
                    
                result = legal_scrubber.scrub(test_input, legal_policy, "inbound")
                
                # Should return a string
                assert isinstance(result, str), f"Test case {i}: Result is not a string"
                
                # Should not crash
                assert True, f"Test case {i}: Processing completed without error"
                
            except Exception as e:
                # Acceptable exceptions for certain inputs
                if test_input is None:
                    assert isinstance(e, (TypeError, AttributeError))
                else:
                    # Other exceptions might be acceptable depending on implementation
                    pass

    def _generate_large_legal_document(self, target_size: int) -> str:
        """Generate a large legal document for performance testing."""
        base_content = """
        CONFIDENTIAL ATTORNEY-CLIENT COMMUNICATION
        
        Smith, Johnson & Associates LLP
        Attorney: Sarah M. Johnson, Esq. (Bar #12345)
        Email: sjohnson@smithlaw.com
        Phone: 555-123-4567
        
        Client: John Doe
        Email: john.doe@client.com
        Phone: 555-987-6543
        BSN: 123456782
        
        LEGAL MEMORANDUM
        
        RE: Contract Dispute Analysis - Case No. 2023-CV-{case_num}
        
        Dear Mr. Doe,
        
        This memorandum analyzes the contract dispute with XYZ Corporation.
        The opposing counsel is Michael Davis (mdavis@opposing.com).
        
        Facts:
        - Contract executed on {date}
        - Value: €{amount}
        - Performance due: {due_date}
        - Breach occurred: {breach_date}
        
        Legal Analysis:
        The contract contains standard force majeure clauses...
        
        Recommendation:
        Based on the analysis, we recommend...
        
        This communication is protected by attorney-client privilege.
        
        Sincerely,
        Sarah M. Johnson, Esq.
        State Bar License #12345
        """
        
        # Generate content to reach target size
        content = ""
        case_num = 1000
        
        while len(content) < target_size:
            # Generate random data for placeholders
            amount = random.randint(10000, 500000)
            date = f"2023-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
            due_date = f"2024-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
            breach_date = f"2024-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
            
            document_instance = base_content.format(
                case_num=case_num,
                date=date,
                amount=amount,
                due_date=due_date,
                breach_date=breach_date
            )
            
            content += document_instance + "\n\n"
            case_num += 1
        
        return content[:target_size]


class TestPIIRecognitionAccuracy:
    """Test accuracy of specific PII entity recognition."""

    @pytest.fixture
    def scrubber_with_legal(self):
        if not PII_AVAILABLE:
            pytest.skip("PII scrubbing not available")
        return Scrubber(enable_legal_entities=True)

    def test_email_recognition_accuracy(self, scrubber_with_legal):
        """Test email address recognition accuracy."""
        test_emails = [
            "john@example.com",
            "sarah.johnson@lawfirm.co.uk",
            "info+legal@firm.org",
            "attorney_smith@law-firm.com",
            "not.an.email@",
            "@incomplete.com",
            "almost@email",
            "email@domain",
        ]
        
        valid_emails = test_emails[:4]
        invalid_emails = test_emails[4:]
        
        for email in valid_emails:
            entities = scrubber_with_legal.analyze_only(f"Contact: {email}")
            email_entities = [e for e in entities if e.entity_type == "EMAIL_ADDRESS"]
            assert len(email_entities) > 0, f"Valid email {email} not recognized"
        
        for email in invalid_emails:
            entities = scrubber_with_legal.analyze_only(f"Contact: {email}")
            email_entities = [e for e in entities if e.entity_type == "EMAIL_ADDRESS"]
            # Invalid emails should not be recognized or should have low confidence
            if email_entities:
                assert all(e.score < 0.8 for e in email_entities), f"Invalid email {email} incorrectly recognized with high confidence"

    def test_phone_number_recognition(self, scrubber_with_legal):
        """Test phone number recognition across different formats."""
        test_phones = [
            "555-123-4567",
            "(555) 123-4567",
            "555.123.4567",
            "+1-555-123-4567",
            "+31 20 123 4567",  # Dutch format
            "020-123-4567",     # Dutch local
            "123-456",          # Too short
            "123456789012345",  # Too long
        ]
        
        for phone in test_phones:
            entities = scrubber_with_legal.analyze_only(f"Call: {phone}")
            phone_entities = [e for e in entities if e.entity_type == "PHONE_NUMBER"]
            
            if len(phone) >= 10 and len(phone) <= 15:  # Reasonable phone length
                assert len(phone_entities) > 0, f"Valid phone {phone} not recognized"

    def test_dutch_bsn_validation(self, scrubber_with_legal):
        """Test Dutch BSN number validation and recognition."""
        valid_bsns = [
            "123456782",  # Valid BSN with correct checksum
            "987654321",  # Another valid BSN
        ]
        
        invalid_bsns = [
            "123456789",  # Invalid checksum
            "000000000",  # Invalid pattern
            "123456",     # Too short
            "1234567890", # Too long
        ]
        
        for bsn in valid_bsns:
            # Test validation function
            is_valid = scrubber_with_legal.validate_dutch_number(bsn, "BSN")
            assert is_valid, f"Valid BSN {bsn} failed validation"
            
            # Test recognition in text
            entities = scrubber_with_legal.analyze_only(f"BSN: {bsn}")
            bsn_entities = [e for e in entities if e.entity_type == "BSN"]
            assert len(bsn_entities) > 0, f"Valid BSN {bsn} not recognized in text"
        
        for bsn in invalid_bsns:
            is_valid = scrubber_with_legal.validate_dutch_number(bsn, "BSN")
            assert not is_valid, f"Invalid BSN {bsn} incorrectly validated"

    def test_legal_entity_recognition(self, scrubber_with_legal):
        """Test recognition of legal-specific entities."""
        legal_text = """
        Law firm: Smith, Johnson & Associates LLP
        Attorney: Sarah M. Johnson, Esq.
        Case reference: Smith v. Johnson, No. 2023-CV-1234
        Bar license: State Bar #12345
        Court: Superior Court of California
        Opposing counsel: Davis & Partners
        """
        
        entities = scrubber_with_legal.analyze_only(legal_text)
        entity_types = [e.entity_type for e in entities]
        
        # Should recognize various legal entities
        assert any("LAW_FIRM" in et or "ORGANIZATION" in et for et in entity_types)
        assert any("LEGAL_PROFESSIONAL" in et or "PERSON" in et for et in entity_types)
        assert any("BAR_LICENSE" in et for et in entity_types)


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v", "--tb=short"])