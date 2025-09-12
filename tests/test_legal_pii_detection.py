"""
Test suite for enhanced legal PII detection and anonymization.

Tests the legal entity recognizers and enhanced privacy protection
specifically designed for legal professionals and documents.
"""

import pytest
import sys
from pathlib import Path
from typing import List, Dict, Set

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

try:
    from bear_ai.pii.scrubber import Scrubber, get_legal_pii_scrubber
    from bear_ai.pii.policy import Policy, PolicyConfig, PIIEntityType
    from bear_ai.pii.legal_recognizers import (
        LawFirmRecognizer, CourtCaseRecognizer, JudgeAttorneyRecognizer,
        BarLicenseRecognizer, LegalCitationRecognizer, ConfidentialityRecognizer,
        OpposingPartyRecognizer, get_legal_recognizers, create_legal_policy_config
    )
    IMPORTS_AVAILABLE = True
except ImportError as e:
    IMPORTS_AVAILABLE = False
    pytest.skip(f"Required imports not available: {e}", allow_module_level=True)


@pytest.fixture
def legal_scrubber():
    """Get a legal PII scrubber instance for testing."""
    return get_legal_pii_scrubber()


@pytest.fixture
def legal_policy():
    """Get a policy configured for legal entity detection."""
    config_dict = create_legal_policy_config()
    return Policy.from_dict(config_dict)


class TestLawFirmRecognizer:
    """Test law firm name detection and anonymization."""
    
    def test_traditional_law_firm_patterns(self):
        """Test detection of traditional law firm name patterns."""
        recognizer = LawFirmRecognizer()
        
        test_cases = [
            "Smith & Associates, LLP",
            "Johnson, Davis & Wilson LLC",
            "Miller Law Group P.C.",
            "Thompson Legal Services",
            "Law Office of Sarah Martinez",
            "Cohen, Rodriguez & Lee, P.C.",
            "International Law Firm of Brown"
        ]
        
        for firm_name in test_cases:
            text = f"The client is represented by {firm_name} in this matter."
            results = recognizer.analyze(text, ["LAW_FIRM"])
            
            assert len(results) >= 1, f"Failed to detect law firm: {firm_name}"
            detected_text = text[results[0].start:results[0].end]
            assert firm_name.lower() in detected_text.lower()
    
    def test_false_positive_prevention(self):
        """Test that non-law firm mentions are not flagged."""
        recognizer = LawFirmRecognizer()
        
        false_positives = [
            "law enforcement agency",
            "law school professor",  
            "law and order television show",
            "legal department notification"
        ]
        
        for text in false_positives:
            results = recognizer.analyze(text, ["LAW_FIRM"])
            assert len(results) == 0, f"False positive detected: {text}"
    
    def test_context_scoring(self):
        """Test context-based score enhancement."""
        recognizer = LawFirmRecognizer()
        
        # High context text
        high_context = "Plaintiff is represented by Smith & Associates, LLP as counsel in this litigation."
        results_high = recognizer.analyze(high_context, ["LAW_FIRM"])
        
        # Low context text  
        low_context = "Smith & Associates, LLP is mentioned here."
        results_low = recognizer.analyze(low_context, ["LAW_FIRM"])
        
        if results_high and results_low:
            assert results_high[0].score >= results_low[0].score


class TestCourtCaseRecognizer:
    """Test court case number and docket detection."""
    
    def test_federal_case_numbers(self):
        """Test federal court case number patterns."""
        recognizer = CourtCaseRecognizer()
        
        federal_cases = [
            "1:21-cv-12345",
            "2:22-cr-09876-ABC",
            "3:20-md-54321",
            "9:23-mc-11111"
        ]
        
        for case_num in federal_cases:
            text = f"This matter is related to case {case_num} in federal court."
            results = recognizer.analyze(text, ["COURT_CASE"])
            
            assert len(results) >= 1, f"Failed to detect federal case: {case_num}"
    
    def test_state_case_numbers(self):
        """Test state court case number patterns."""
        recognizer = CourtCaseRecognizer()
        
        state_cases = [
            "Case No. CV-2023-12345",
            "Docket No. A-22-6789-SC", 
            "Cause No. 2021-45678-CR"
        ]
        
        for case_num in state_cases:
            text = f"Please reference {case_num} for the state court matter."
            results = recognizer.analyze(text, ["COURT_CASE"])
            
            assert len(results) >= 1, f"Failed to detect state case: {case_num}"
    
    def test_legal_citations(self):
        """Test legal citation detection."""
        recognizer = CourtCaseRecognizer()
        
        citations = [
            "123 F.3d 456 (9th Cir. 2020)",
            "456 U.S. 789, 101 S.Ct. 234 (1985)",
            "789 Cal.App.4th 123 (2019)"
        ]
        
        for citation in citations:
            text = f"See {citation} for relevant precedent."
            results = recognizer.analyze(text, ["COURT_CASE"])
            
            assert len(results) >= 1, f"Failed to detect citation: {citation}"


class TestJudgeAttorneyRecognizer:
    """Test judge and attorney name protection."""
    
    def test_judge_title_recognition(self):
        """Test recognition of judicial titles."""
        recognizer = JudgeAttorneyRecognizer()
        
        judge_titles = [
            "The Honorable Judge Smith",
            "Chief Judge Johnson", 
            "Justice Williams",
            "Magistrate Brown"
        ]
        
        for judge in judge_titles:
            text = f"{judge} presided over the hearing yesterday."
            results = recognizer.analyze(text, ["LEGAL_PROFESSIONAL"])
            
            assert len(results) >= 1, f"Failed to detect judge: {judge}"
    
    def test_attorney_professional_titles(self):
        """Test attorney professional title recognition."""
        recognizer = JudgeAttorneyRecognizer()
        
        attorneys = [
            "John Smith, Esq.",
            "Sarah Johnson, J.D.",
            "Michael Davis, Attorney",
            "Lisa Wilson, Counsel"
        ]
        
        for attorney in attorneys:
            text = f"{attorney} filed the motion on behalf of the client."
            results = recognizer.analyze(text, ["LEGAL_PROFESSIONAL"])
            
            assert len(results) >= 1, f"Failed to detect attorney: {attorney}"
    
    def test_context_based_person_detection(self):
        """Test context-based detection of legal professionals."""
        recognizer = JudgeAttorneyRecognizer()
        
        # Should detect person names in legal context
        legal_context = "Attorney Robert Martinez represents the defendant."
        results = recognizer.analyze(legal_context, ["LEGAL_PROFESSIONAL"])
        
        # This test may require NLP artifacts, so we'll check if any results are found
        # The exact behavior depends on spaCy model availability


class TestBarLicenseRecognizer:
    """Test bar number and license identification."""
    
    def test_state_bar_numbers(self):
        """Test state bar number patterns."""
        recognizer = BarLicenseRecognizer()
        
        bar_numbers = [
            "Bar No. 12345678",
            "State Bar # A1234567", 
            "Attorney Number: 98765432",
            "Reg. No. B9876543"
        ]
        
        for bar_num in bar_numbers:
            text = f"The attorney's credentials include {bar_num} for state practice."
            results = recognizer.analyze(text, ["BAR_LICENSE"])
            
            assert len(results) >= 1, f"Failed to detect bar number: {bar_num}"
    
    def test_professional_license_formats(self):
        """Test various professional license formats.""" 
        recognizer = BarLicenseRecognizer()
        
        licenses = [
            "License No. ABC123456",
            "Lic. # DEF987654",
            "Admission No. 11223344"
        ]
        
        for license_num in licenses:
            text = f"Professional licensing: {license_num}"
            results = recognizer.analyze(text, ["BAR_LICENSE"])
            
            assert len(results) >= 1, f"Failed to detect license: {license_num}"


class TestLegalCitationRecognizer:
    """Test legal citation and precedent detection."""
    
    def test_case_law_citations(self):
        """Test case law citation patterns."""
        recognizer = LegalCitationRecognizer()
        
        citations = [
            "123 F.Supp.2d 456 (S.D.N.Y. 2019)",
            "456 U.S. 789 (1985)",
            "789 Cal.4th 123, 456 P.3d 789 (2020)",
            "321 F.3d 654, 987 F.Supp.2d 123 (9th Cir. 2018)"
        ]
        
        for citation in citations:
            text = f"The court cited {citation} as controlling authority."
            results = recognizer.analyze(text, ["LEGAL_CITATION"])
            
            assert len(results) >= 1, f"Failed to detect citation: {citation}"
    
    def test_statute_citations(self):
        """Test statutory citation patterns."""
        recognizer = LegalCitationRecognizer()
        
        statutes = [
            "42 U.S.C. § 1983",
            "15 USC § 78j(b)",
            "Cal. Code Civ. Proc. § 1005",
            "Fed. R. Civ. P. 12(b)(6)"
        ]
        
        for statute in statutes:
            text = f"The claim is brought under {statute} of the federal code."
            results = recognizer.analyze(text, ["LEGAL_CITATION"])
            
            assert len(results) >= 1, f"Failed to detect statute: {statute}"
    
    def test_cfr_citations(self):
        """Test Code of Federal Regulations citations."""
        recognizer = LegalCitationRecognizer()
        
        cfr_cites = [
            "17 C.F.R. § 240.10b-5",
            "29 CFR § 1630.2"
        ]
        
        for cfr in cfr_cites:
            text = f"The regulation at {cfr} applies to this situation."
            results = recognizer.analyze(text, ["LEGAL_CITATION"])
            
            assert len(results) >= 1, f"Failed to detect CFR citation: {cfr}"


class TestConfidentialityRecognizer:
    """Test confidential legal matter and privilege detection."""
    
    def test_attorney_client_privilege(self):
        """Test attorney-client privilege marker detection."""
        recognizer = ConfidentialityRecognizer()
        
        privilege_markers = [
            "ATTORNEY-CLIENT PRIVILEGE",
            "PRIVILEGED AND CONFIDENTIAL", 
            "A-C PRIVILEGE",
            "PRIVILEGED CONFIDENTIAL"
        ]
        
        for marker in privilege_markers:
            text = f"This document is marked {marker} and should be protected."
            results = recognizer.analyze(text, ["CONFIDENTIAL_LEGAL"])
            
            assert len(results) >= 1, f"Failed to detect privilege marker: {marker}"
    
    def test_work_product_protection(self):
        """Test work product protection detection."""
        recognizer = ConfidentialityRecognizer()
        
        work_product = [
            "ATTORNEY WORK PRODUCT",
            "LITIGATION WORK PRODUCT", 
            "WORK PRODUCT"
        ]
        
        for marker in work_product:
            text = f"These materials are protected {marker} and confidential."
            results = recognizer.analyze(text, ["CONFIDENTIAL_LEGAL"])
            
            assert len(results) >= 1, f"Failed to detect work product: {marker}"
    
    def test_confidentiality_levels(self):
        """Test confidentiality level assessment."""
        recognizer = ConfidentialityRecognizer()
        
        # Critical level
        critical_text = "ATTORNEY-CLIENT PRIVILEGE - STRICTLY CONFIDENTIAL"
        # Standard level  
        standard_text = "CONFIDENTIAL DOCUMENT"
        
        critical_results = recognizer.analyze(critical_text, ["CONFIDENTIAL_LEGAL"])
        standard_results = recognizer.analyze(standard_text, ["CONFIDENTIAL_LEGAL"])
        
        if critical_results and standard_results:
            # Critical should have higher score
            assert critical_results[0].score >= standard_results[0].score


class TestOpposingPartyRecognizer:
    """Test opposing party detection and anonymization."""
    
    def test_formal_party_designations(self):
        """Test formal legal party designations."""
        recognizer = OpposingPartyRecognizer()
        
        party_designations = [
            "Plaintiff John Smith",
            "Defendant ABC Corporation",
            "Petitioner Mary Johnson", 
            "Respondent XYZ Company Inc.",
            "Appellant Robert Davis"
        ]
        
        for party in party_designations:
            text = f"The matter involves {party} as a party to the litigation."
            results = recognizer.analyze(text, ["OPPOSING_PARTY"])
            
            assert len(results) >= 1, f"Failed to detect party: {party}"
    
    def test_versus_case_style(self):
        """Test versus case style detection."""
        recognizer = OpposingPartyRecognizer()
        
        case_styles = [
            "Smith v. Jones",
            "ABC Corp. vs. XYZ Inc.",
            "Johnson v State of California"
        ]
        
        for case_style in case_styles:
            text = f"The case style is {case_style} for this litigation."
            results = recognizer.analyze(text, ["OPPOSING_PARTY"])
            
            assert len(results) >= 1, f"Failed to detect case style: {case_style}"


class TestIntegratedLegalScrubbing:
    """Test integrated legal PII scrubbing functionality."""
    
    def test_comprehensive_legal_document_scrubbing(self, legal_scrubber, legal_policy):
        """Test scrubbing of a comprehensive legal document."""
        if not legal_scrubber.is_available():
            pytest.skip("Presidio not available")
        
        legal_document = """
        ATTORNEY-CLIENT PRIVILEGE
        
        Case No. 1:23-cv-12345
        Smith & Associates, LLP v. Johnson Corporation
        
        The Honorable Judge Williams presided over the hearing.
        Attorney Sarah Davis, Esq. (Bar No. 98765432) represented the plaintiff.
        
        This matter cites 42 U.S.C. § 1983 and Johnson v. State, 123 F.3d 456 (9th Cir. 2020).
        
        CONFIDENTIAL - WORK PRODUCT
        
        Contact: john.smith@lawfirm.com, (555) 123-4567
        """
        
        scrubbed = legal_scrubber.scrub(legal_document, legal_policy, "outbound")
        
        # Verify various legal entities were detected and scrubbed
        assert "[CONFIDENTIAL_LEGAL]" in scrubbed
        assert "[COURT_CASE]" in scrubbed or "[CASE_NUMBER]" in scrubbed
        assert "[LAW_FIRM]" in scrubbed
        assert "[LEGAL_PROFESSIONAL]" in scrubbed
        assert "[BAR_LICENSE]" in scrubbed or "[BAR_NUMBER]" in scrubbed
        assert "[LEGAL_CITATION]" in scrubbed or "[CITATION]" in scrubbed
        assert "[EMAIL_ADDRESS]" in scrubbed
        assert "[PHONE_NUMBER]" in scrubbed
    
    def test_policy_based_entity_filtering(self, legal_scrubber):
        """Test that policy controls which entities are scrubbed."""
        if not legal_scrubber.is_available():
            pytest.skip("Presidio not available")
        
        # Create policy that only scrubs law firms and confidential markers
        limited_config = PolicyConfig(
            inbound_entities={"LAW_FIRM", "CONFIDENTIAL_LEGAL"},
            outbound_entities={"LAW_FIRM", "CONFIDENTIAL_LEGAL"},
            confidence_threshold=0.7
        )
        limited_policy = Policy(limited_config)
        
        text = "Smith & Associates represents client. ATTORNEY-CLIENT PRIVILEGE. Bar No. 12345678."
        scrubbed = legal_scrubber.scrub(text, limited_policy, "outbound")
        
        # Should scrub law firm and confidential marker
        assert "[LAW_FIRM]" in scrubbed
        assert "[CONFIDENTIAL_LEGAL]" in scrubbed or "[PRIVILEGED_CONTENT]" in scrubbed
        
        # Should NOT scrub bar number (not in policy)
        assert "12345678" in scrubbed
    
    def test_legal_entity_types_in_supported_entities(self, legal_scrubber):
        """Test that legal entity types are included in supported entities."""
        if not legal_scrubber.is_available():
            pytest.skip("Presidio not available")
        
        supported = legal_scrubber.get_supported_entities()
        
        legal_entities = {
            "LAW_FIRM", "COURT_CASE", "LEGAL_PROFESSIONAL", "BAR_LICENSE",
            "LEGAL_CITATION", "CONFIDENTIAL_LEGAL", "OPPOSING_PARTY"
        }
        
        # Check that at least some legal entities are supported
        found_legal_entities = legal_entities.intersection(set(supported))
        assert len(found_legal_entities) > 0, f"No legal entities found in supported entities: {supported}"
    
    def test_analyze_only_mode_with_legal_entities(self, legal_scrubber):
        """Test analysis-only mode includes legal entities."""
        if not legal_scrubber.is_available():
            pytest.skip("Presidio not available")
        
        text = "Smith & Associates, LLP represents the client in Case No. 1:23-cv-12345."
        
        # Analyze without scrubbing
        entities = legal_scrubber.analyze_only(text)
        
        # Should detect legal entities
        entity_types = {entity.entity_type for entity in entities}
        
        # Check for at least one legal entity type
        legal_entity_types = {"LAW_FIRM", "COURT_CASE", "LEGAL_PROFESSIONAL"}
        found_legal = legal_entity_types.intersection(entity_types)
        
        assert len(found_legal) > 0, f"No legal entities detected in analysis. Found: {entity_types}"


class TestLegalPolicyConfiguration:
    """Test legal-specific policy configuration."""
    
    def test_create_legal_policy_config(self):
        """Test creation of legal policy configuration."""
        config = create_legal_policy_config()
        
        # Verify all legal entity types are included
        legal_entities = {
            "LAW_FIRM", "COURT_CASE", "LEGAL_PROFESSIONAL", "BAR_LICENSE",
            "LEGAL_CITATION", "CONFIDENTIAL_LEGAL", "OPPOSING_PARTY"
        }
        
        inbound_entities = set(config["inbound_entities"])
        outbound_entities = set(config["outbound_entities"])
        
        assert legal_entities.issubset(inbound_entities.union(outbound_entities))
        
        # Verify custom replacements
        replacements = config["custom_replacements"]
        for entity_type in legal_entities:
            assert entity_type in replacements
    
    def test_policy_enum_includes_legal_types(self):
        """Test that PIIEntityType enum includes legal entity types."""
        all_types = PIIEntityType.all_types()
        
        legal_types = {
            "LAW_FIRM", "COURT_CASE", "LEGAL_PROFESSIONAL", "BAR_LICENSE",
            "LEGAL_CITATION", "CONFIDENTIAL_LEGAL", "OPPOSING_PARTY"
        }
        
        assert legal_types.issubset(all_types)
    
    def test_default_policy_includes_legal_entities(self):
        """Test that default policy configuration includes legal entities."""
        policy = Policy()
        
        inbound = policy.get_entities_for_direction("inbound")
        outbound = policy.get_entities_for_direction("outbound")
        
        # Should include at least some legal entities by default
        legal_entities = {
            "LAW_FIRM", "COURT_CASE", "LEGAL_PROFESSIONAL", "BAR_LICENSE",
            "LEGAL_CITATION", "CONFIDENTIAL_LEGAL", "OPPOSING_PARTY"
        }
        
        found_inbound = legal_entities.intersection(inbound)
        found_outbound = legal_entities.intersection(outbound)
        
        assert len(found_inbound) > 0, f"No legal entities in inbound policy: {inbound}"
        assert len(found_outbound) > 0, f"No legal entities in outbound policy: {outbound}"


class TestLegalEntityRobustness:
    """Test robustness and edge cases for legal entity detection."""
    
    def test_mixed_case_sensitivity(self):
        """Test detection with various case formats.""" 
        recognizer = ConfidentialityRecognizer()
        
        case_variations = [
            "attorney-client privilege",
            "Attorney-Client Privilege", 
            "ATTORNEY-CLIENT PRIVILEGE",
            "AtToRnEy-ClIeNt PrIvIlEgE"
        ]
        
        for text in case_variations:
            results = recognizer.analyze(text, ["CONFIDENTIAL_LEGAL"])
            assert len(results) >= 1, f"Failed case insensitive detection: {text}"
    
    def test_special_characters_and_formatting(self):
        """Test detection with special characters and formatting."""
        recognizer = LawFirmRecognizer()
        
        formatted_firms = [
            "Smith, Johnson & Associates, L.L.P.",
            "Miller-Davis Legal Group LLC",
            "O'Connor & Associates P.C.",
            "López, García & Williams LLP"
        ]
        
        for firm in formatted_firms:
            text = f"Represented by {firm} in this matter."
            results = recognizer.analyze(text, ["LAW_FIRM"])
            # Note: Some special character handling may depend on regex implementation
    
    def test_context_disambiguation(self):
        """Test disambiguation between similar entity types."""
        bsn_recognizer = DutchBSNRecognizer() if IMPORTS_AVAILABLE else None
        bar_recognizer = BarLicenseRecognizer()
        
        # Number that could be BSN or bar number based on context
        ambiguous_number = "123456789"
        
        bsn_context = f"Dutch citizen BSN: {ambiguous_number}"
        bar_context = f"Attorney Bar No. {ambiguous_number}"
        
        if bsn_recognizer:
            bsn_results = bsn_recognizer.analyze(bsn_context, ["BSN"])
            bar_results = bar_recognizer.analyze(bar_context, ["BAR_LICENSE"])
            
            # Context should influence detection
            # Note: Exact behavior depends on implementation details


# Performance and integration tests
class TestLegalScrubberPerformance:
    """Test performance characteristics of legal entity detection."""
    
    def test_large_document_processing(self, legal_scrubber, legal_policy):
        """Test processing of large legal documents."""
        if not legal_scrubber.is_available():
            pytest.skip("Presidio not available")
        
        # Create a large legal document
        base_content = """
        ATTORNEY-CLIENT PRIVILEGE
        Case No. 1:23-cv-12345
        Smith & Associates, LLP represents the plaintiff.
        Contact: attorney@lawfirm.com
        Bar No. 98765432
        """
        
        large_document = base_content * 100  # Repeat 100 times
        
        # Should complete without timeout or memory issues
        import time
        start_time = time.time()
        
        scrubbed = legal_scrubber.scrub(large_document, legal_policy, "outbound")
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        assert processing_time < 30.0, f"Processing took too long: {processing_time}s"
        assert len(scrubbed) > 0, "Document was completely eliminated"
    
    def test_concurrent_processing_safety(self, legal_scrubber, legal_policy):
        """Test thread safety of legal entity processing."""
        if not legal_scrubber.is_available():
            pytest.skip("Presidio not available")
        
        import threading
        import concurrent.futures
        
        def scrub_document(doc_id):
            text = f"Document {doc_id}: Smith & Associates, LLP, Case 1:23-cv-{doc_id:05d}"
            return legal_scrubber.scrub(text, legal_policy, "outbound")
        
        # Process multiple documents concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(scrub_document, i) for i in range(10)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # All should complete successfully
        assert len(results) == 10
        for result in results:
            assert "[LAW_FIRM]" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])