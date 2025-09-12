"""
Legal Entity Recognizers for Enhanced PII Scrubbing

Provides specialized entity recognizers for legal profession-specific PII:
- Law firm names and legal organization identification
- Court case numbers, docket numbers, and legal citations
- Judge and attorney name protection with title recognition
- Client company and organization anonymization
- Legal precedent and citation scrubbing
- Bar numbers and professional license identification
- Opposing party name detection
- Confidential legal matter identification
- Attorney-client privilege markers and confidentiality tags

This module extends the existing PII scrubbing infrastructure with 
lawyer-specific privacy protection that exceeds current standards.
"""

import re
import logging
from typing import List, Optional, Dict, Set, Tuple
from dataclasses import dataclass, field

try:
    from presidio_analyzer import Pattern, PatternRecognizer, RecognizerResult
    from presidio_analyzer.nlp_engine import NlpArtifacts
    PRESIDIO_AVAILABLE = True
except ImportError:
    PRESIDIO_AVAILABLE = False
    # Mock classes for when Presidio is not available
    class Pattern:
        def __init__(self, name, regex, score):
            self.name = name
            self.regex = regex
            self.score = score
    
    class PatternRecognizer:
        def __init__(self, supported_entity, patterns, context, supported_language):
            pass
        
        def analyze(self, text, entities, nlp_artifacts=None):
            return []
    
    class RecognizerResult:
        def __init__(self):
            self.start = 0
            self.end = 0
            self.score = 0.0
            self.entity_type = ""

    class NlpArtifacts:
        def __init__(self):
            pass


@dataclass
class LegalContext:
    """Legal context information for enhanced entity recognition."""
    practice_areas: Set[str] = field(default_factory=set)
    jurisdiction_indicators: Set[str] = field(default_factory=set)
    document_type: Optional[str] = None
    confidentiality_level: str = "standard"


class LawFirmRecognizer(PatternRecognizer):
    """
    Recognizer for law firm names and legal organization entities.
    
    Detects various patterns of law firm names including:
    - Traditional partnership structures (Smith & Associates, LLC)
    - Professional corporations and LLPs
    - Solo practitioners with legal titles
    - International law firm formats
    """
    
    PATTERNS = [
        # Traditional law firm patterns with legal entity suffixes
        Pattern(
            name="law_firm_traditional",
            regex=r"\b(?:[A-Z][a-z]+(?:\s+&\s+[A-Z][a-z]+)*)\s+(?:Law\s+(?:Firm|Group|Office|Associates|Partners)|Attorneys?(?:\s+at\s+Law)?|Legal\s+(?:Services|Group)|P\.?C\.?|L\.?L\.?P\.?|L\.?L\.?C\.?)\b",
            score=0.9
        ),
        # Professional legal titles with names
        Pattern(
            name="attorney_law_office",
            regex=r"\b(?:Law\s+Office|Legal\s+Office)\s+of\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b",
            score=0.85
        ),
        # Large firm patterns (multiple surnames)
        Pattern(
            name="large_law_firm",
            regex=r"\b[A-Z][a-z]+(?:,\s+[A-Z][a-z]+){2,}\s+(?:&\s+[A-Z][a-z]+\s+)?(?:LLP|LLC|P\.C\.)\b",
            score=0.9
        ),
        # Solo practitioner patterns
        Pattern(
            name="solo_practitioner",
            regex=r"\b[A-Z][a-z]+\s+[A-Z][a-z]+,\s+(?:Esq\.?|Attorney(?:\s+at\s+Law)?|Counselor(?:\s+at\s+Law)?)\b",
            score=0.8
        ),
        # International law firm patterns
        Pattern(
            name="international_law_firm",
            regex=r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:International|Global)\s+Law\s+(?:Firm|Group)\b",
            score=0.85
        )
    ]
    
    CONTEXT_KEYWORDS = [
        "law firm", "legal counsel", "attorneys", "lawyers", "legal representation",
        "counsel", "legal services", "bar association", "practice", "litigation",
        "legal advice", "attorney", "esquire", "counselor"
    ]
    
    def __init__(self):
        super().__init__(
            supported_entity="LAW_FIRM",
            patterns=self.PATTERNS,
            context=self.CONTEXT_KEYWORDS,
            supported_language="en"
        )
        self.logger = logging.getLogger(__name__)
    
    def analyze(self, text: str, entities: List[str], nlp_artifacts=None) -> List[RecognizerResult]:
        """Enhanced analysis with legal context awareness."""
        results = []
        if "LAW_FIRM" not in entities:
            return results
        
        # Use parent class pattern matching
        pattern_results = super().analyze(text, entities, nlp_artifacts)
        
        for result in pattern_results:
            matched_text = text[result.start:result.end]
            
            # Validate law firm pattern
            if self._is_valid_law_firm_name(matched_text):
                # Enhance with context scoring
                context_score = self._calculate_legal_context_score(text, result.start, result.end)
                result.score = min(1.0, result.score + context_score)
                results.append(result)
        
        return results
    
    def _is_valid_law_firm_name(self, text: str) -> bool:
        """Validate that the matched text represents a legitimate law firm name."""
        # Basic validation rules
        if len(text) < 5:
            return False
        
        # Must contain at least one uppercase letter (proper noun)
        if not any(c.isupper() for c in text):
            return False
        
        # Check for common false positives
        false_positives = {
            "law enforcement", "law school", "law and order", "legal department",
            "legal notice", "law library", "law enforcement agency"
        }
        
        return text.lower() not in false_positives
    
    def _calculate_legal_context_score(self, text: str, start: int, end: int) -> float:
        """Calculate context-based score enhancement."""
        context_window = 100  # characters before and after
        context_start = max(0, start - context_window)
        context_end = min(len(text), end + context_window)
        context = text[context_start:context_end].lower()
        
        score_boost = 0.0
        
        # Professional legal indicators
        legal_indicators = ["represented by", "counsel for", "attorney for", "law firm of"]
        for indicator in legal_indicators:
            if indicator in context:
                score_boost += 0.1
                break
        
        # Document type indicators
        legal_documents = ["brief", "motion", "complaint", "answer", "deposition"]
        for doc_type in legal_documents:
            if doc_type in context:
                score_boost += 0.05
                break
        
        return min(0.2, score_boost)


class CourtCaseRecognizer(PatternRecognizer):
    """
    Recognizer for court case numbers, docket numbers, and case citations.
    
    Detects various formats of legal case identifiers:
    - Federal court case numbers
    - State court case numbers  
    - Docket numbers and filing identifiers
    - Legal citations and case references
    """
    
    PATTERNS = [
        # Federal court case numbers (e.g., 1:21-cv-12345)
        Pattern(
            name="federal_case_number",
            regex=r"\b\d+:\d{2}-(?:cv|cr|md|mc|mj)-\d{4,6}(?:-[A-Z]{2,3})?\b",
            score=0.95
        ),
        # State court case numbers (various formats)
        Pattern(
            name="state_case_number", 
            regex=r"\b(?:Case\s+No\.?\s*|No\.?\s+|Cause\s+No\.?\s*|Docket\s+No\.?\s*)?[A-Z]{1,3}-?\d{2,4}-\d{4,8}(?:-[A-Z]{1,3})?\b",
            score=0.85
        ),
        # Generic docket numbers
        Pattern(
            name="docket_number",
            regex=r"\b(?:Docket|Case)\s+(?:No\.?|Number|#)\s*:?\s*[A-Z0-9-]{5,15}\b",
            score=0.8
        ),
        # Legal citations (case law)
        Pattern(
            name="case_citation",
            regex=r"\b\d+\s+[A-Z][a-z]*\.?\s+(?:2d|3d)?\s*\d+(?:,\s*\d+)?\s+\([A-Z][a-z.]*\s+\d{4}\)\b",
            score=0.9
        ),
        # Court filing numbers
        Pattern(
            name="filing_number",
            regex=r"\b(?:Filing|Document)\s+(?:No\.?|#)\s*:?\s*\d{1,4}(?:-\d{1,3})?\b",
            score=0.75
        )
    ]
    
    CONTEXT_KEYWORDS = [
        "case number", "docket", "filing", "court", "litigation", "lawsuit",
        "proceeding", "cause", "matter", "civil action", "criminal case",
        "citation", "reported", "unreported"
    ]
    
    def __init__(self):
        super().__init__(
            supported_entity="COURT_CASE",
            patterns=self.PATTERNS,
            context=self.CONTEXT_KEYWORDS,
            supported_language="en"
        )


class JudgeAttorneyRecognizer(PatternRecognizer):
    """
    Recognizer for judge and attorney names with legal title recognition.
    
    Provides enhanced protection for judicial and legal professional names,
    with context-aware detection of titles and roles.
    """
    
    PATTERNS = [
        # Judges with formal titles
        Pattern(
            name="judge_formal_title",
            regex=r"\b(?:The\s+)?(?:Honorable\s+)?(?:Judge|Justice|Magistrate|Chief\s+Judge)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b",
            score=0.95
        ),
        # Attorneys with professional titles
        Pattern(
            name="attorney_professional_title",
            regex=r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s+(?:Esq\.?|J\.D\.?|Attorney|Counsel|Counselor)\b",
            score=0.9
        ),
        # Court personnel titles
        Pattern(
            name="court_personnel",
            regex=r"\b(?:Clerk|Bailiff|Court\s+Reporter|Stenographer)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b",
            score=0.85
        ),
        # Legal professionals in signature blocks
        Pattern(
            name="signature_block_attorney",
            regex=r"\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*\n\s*(?:Attorney\s+for|Counsel\s+for|Representing)\b",
            score=0.9
        )
    ]
    
    LEGAL_TITLES = {
        "judge", "justice", "magistrate", "chief judge", "associate justice",
        "presiding judge", "administrative judge", "referee", "hearing officer",
        "attorney", "lawyer", "counsel", "counselor", "advocate", "barrister",
        "solicitor", "esquire", "j.d.", "juris doctor", "paralegal",
        "law clerk", "legal assistant"
    }
    
    def __init__(self):
        super().__init__(
            supported_entity="LEGAL_PROFESSIONAL",
            patterns=self.PATTERNS,
            context=list(self.LEGAL_TITLES),
            supported_language="en"
        )
    
    def analyze(self, text: str, entities: List[str], nlp_artifacts=None) -> List[RecognizerResult]:
        """Enhanced analysis with legal title validation."""
        results = []
        if "LEGAL_PROFESSIONAL" not in entities:
            return results
        
        # Use parent class pattern matching
        pattern_results = super().analyze(text, entities, nlp_artifacts)
        
        # Also use NLP for person detection with legal context
        if nlp_artifacts and hasattr(nlp_artifacts, 'entities'):
            for entity in nlp_artifacts.entities:
                if entity.label_ == "PERSON":
                    person_text = text[entity.start_char:entity.end_char]
                    if self._has_legal_context(text, entity.start_char, entity.end_char):
                        result = RecognizerResult()
                        result.entity_type = "LEGAL_PROFESSIONAL"
                        result.start = entity.start_char
                        result.end = entity.end_char
                        result.score = 0.8
                        pattern_results.append(result)
        
        for result in pattern_results:
            matched_text = text[result.start:result.end]
            
            # Validate legal professional name
            if self._is_valid_legal_professional(matched_text, text, result.start, result.end):
                context_score = self._calculate_professional_context_score(text, result.start, result.end)
                result.score = min(1.0, result.score + context_score)
                results.append(result)
        
        return results
    
    def _has_legal_context(self, text: str, start: int, end: int) -> bool:
        """Check if a person name appears in a legal context."""
        context_window = 50
        context_start = max(0, start - context_window)
        context_end = min(len(text), end + context_window)
        context = text[context_start:context_end].lower()
        
        legal_context_indicators = [
            "attorney", "lawyer", "counsel", "judge", "justice", "esq",
            "court", "bar", "legal", "law", "representing", "counsel for"
        ]
        
        return any(indicator in context for indicator in legal_context_indicators)
    
    def _is_valid_legal_professional(self, matched_text: str, full_text: str, start: int, end: int) -> bool:
        """Validate that the matched text represents a legal professional."""
        # Check minimum length
        if len(matched_text.strip()) < 3:
            return False
        
        # Must contain proper noun format
        words = matched_text.split()
        if not any(word[0].isupper() for word in words if word):
            return False
        
        return True
    
    def _calculate_professional_context_score(self, text: str, start: int, end: int) -> float:
        """Calculate context score based on legal professional indicators."""
        context_window = 75
        context_start = max(0, start - context_window)
        context_end = min(len(text), end + context_window)
        context = text[context_start:context_end].lower()
        
        score_boost = 0.0
        
        # High-confidence professional indicators
        high_confidence = ["honorable", "your honor", "counsel", "attorney for"]
        for indicator in high_confidence:
            if indicator in context:
                score_boost += 0.15
                break
        
        # Medium-confidence indicators
        medium_confidence = ["represents", "law firm", "legal", "court"]
        for indicator in medium_confidence:
            if indicator in context:
                score_boost += 0.1
                break
        
        return min(0.25, score_boost)


class BarLicenseRecognizer(PatternRecognizer):
    """
    Recognizer for bar numbers and professional license identifiers.
    
    Detects various formats of legal professional licensing:
    - State bar numbers
    - Attorney registration numbers
    - Professional license numbers
    - Court admission numbers
    """
    
    PATTERNS = [
        # State bar numbers (various formats)
        Pattern(
            name="state_bar_number",
            regex=r"\b(?:Bar\s+(?:No\.?|Number)|State\s+Bar\s+#|Attorney\s+(?:No\.?|Number)|Reg\.?\s+No\.?)\s*:?\s*[A-Z]?\d{4,8}\b",
            score=0.9
        ),
        # Professional license numbers
        Pattern(
            name="professional_license",
            regex=r"\b(?:License\s+(?:No\.?|Number)|Lic\.?\s+#)\s*:?\s*[A-Z]{1,3}\d{4,8}\b",
            score=0.85
        ),
        # Court admission numbers
        Pattern(
            name="court_admission",
            regex=r"\b(?:Admitted|Admission)\s+(?:No\.?|Number)\s*:?\s*\d{4,8}\b",
            score=0.8
        ),
        # Generic professional ID patterns
        Pattern(
            name="professional_id",
            regex=r"\b(?:ID|Identification)\s+(?:No\.?|Number)\s*:?\s*[A-Z]{2,4}\d{4,8}\b",
            score=0.7
        )
    ]
    
    CONTEXT_KEYWORDS = [
        "bar number", "license", "admission", "attorney number", "registration",
        "professional", "certified", "authorized", "qualified", "admitted"
    ]
    
    def __init__(self):
        super().__init__(
            supported_entity="BAR_LICENSE",
            patterns=self.PATTERNS,
            context=self.CONTEXT_KEYWORDS,
            supported_language="en"
        )


class LegalCitationRecognizer(PatternRecognizer):
    """
    Recognizer for legal precedents and citations.
    
    Detects and protects legal citations including:
    - Case law citations
    - Statute citations
    - Regulation references
    - Legal treatise citations
    """
    
    PATTERNS = [
        # Case law citations (volume reporter page year)
        Pattern(
            name="case_law_citation",
            regex=r"\b\d{1,4}\s+[A-Z][a-z.]*\s*(?:2d|3d)?\s+\d{1,4}(?:,\s*\d{1,4})?\s*\([A-Z][a-z.\s]*\d{4}\)\b",
            score=0.95
        ),
        # Federal statute citations
        Pattern(
            name="federal_statute",
            regex=r"\b\d{1,2}\s+U\.?S\.?C\.?\s+§?\s*\d{1,4}(?:\([a-z]\)\(\d+\))?\b",
            score=0.9
        ),
        # Code of Federal Regulations
        Pattern(
            name="cfr_citation",
            regex=r"\b\d{1,2}\s+C\.?F\.?R\.?\s+§?\s*\d{1,4}\.\d{1,4}\b",
            score=0.9
        ),
        # State statute citations
        Pattern(
            name="state_statute",
            regex=r"\b[A-Z]{2,4}\s+(?:Code|Stat\.?|Rev\.?\s+Stat\.?)\s+§?\s*\d{1,4}(?:-\d{1,4})?(?:\([a-z]\))?\b",
            score=0.85
        ),
        # Court rules citations
        Pattern(
            name="court_rules",
            regex=r"\b(?:Fed\.?\s+R\.?\s+(?:Civ\.?\s+P\.?|Crim\.?\s+P\.?|Evid\.?|App\.?\s+P\.?)|Rule)\s+\d{1,3}(?:\([a-z]\)\(\d+\))?\b",
            score=0.9
        )
    ]
    
    def __init__(self):
        super().__init__(
            supported_entity="LEGAL_CITATION",
            patterns=self.PATTERNS,
            context=["cited", "see", "citing", "reference", "authority"],
            supported_language="en"
        )


class ConfidentialityRecognizer(PatternRecognizer):
    """
    Recognizer for confidential legal matter identification and privilege markers.
    
    Detects confidentiality indicators including:
    - Attorney-client privilege markers
    - Work product protection indicators
    - Confidentiality notices
    - Privileged communication markers
    """
    
    PATTERNS = [
        # Attorney-client privilege markers
        Pattern(
            name="attorney_client_privilege",
            regex=r"\b(?:ATTORNEY(?:-|\s+)CLIENT\s+PRIVILEGE|PRIVILEGED\s+(?:AND\s+)?CONFIDENTIAL|A-C\s+PRIVILEGE)\b",
            score=0.95
        ),
        # Work product protection
        Pattern(
            name="work_product",
            regex=r"\b(?:WORK\s+PRODUCT|ATTORNEY\s+WORK\s+PRODUCT|LITIGATION\s+WORK\s+PRODUCT)\b",
            score=0.9
        ),
        # Confidentiality notices
        Pattern(
            name="confidential_notice",
            regex=r"\b(?:CONFIDENTIAL|STRICTLY\s+CONFIDENTIAL|CONFIDENTIAL\s+(?:AND\s+)?PRIVILEGED)\b",
            score=0.85
        ),
        # Settlement negotiation protection
        Pattern(
            name="settlement_privilege",
            regex=r"\b(?:SETTLEMENT\s+NEGOTIATIONS?|MEDIATION\s+CONFIDENTIAL|WITHOUT\s+PREJUDICE)\b",
            score=0.8
        ),
        # Document confidentiality markers
        Pattern(
            name="document_confidential",
            regex=r"\b(?:FOR\s+COUNSEL\s+ONLY|EYES\s+ONLY|INTERNAL\s+USE\s+ONLY|PRIVILEGED\s+MATERIAL)\b",
            score=0.85
        )
    ]
    
    CONTEXT_KEYWORDS = [
        "privileged", "confidential", "protected", "work product", "attorney-client",
        "settlement", "mediation", "private", "restricted", "sensitive"
    ]
    
    def __init__(self):
        super().__init__(
            supported_entity="CONFIDENTIAL_LEGAL",
            patterns=self.PATTERNS,
            context=self.CONTEXT_KEYWORDS,
            supported_language="en"
        )
    
    def analyze(self, text: str, entities: List[str], nlp_artifacts=None) -> List[RecognizerResult]:
        """Enhanced analysis with confidentiality level assessment."""
        results = []
        if "CONFIDENTIAL_LEGAL" not in entities:
            return results
        
        pattern_results = super().analyze(text, entities, nlp_artifacts)
        
        for result in pattern_results:
            matched_text = text[result.start:result.end]
            
            # Assess confidentiality level and adjust score
            confidentiality_level = self._assess_confidentiality_level(matched_text)
            if confidentiality_level == "high":
                result.score = min(1.0, result.score + 0.1)
            elif confidentiality_level == "critical":
                result.score = 1.0
            
            results.append(result)
        
        return results
    
    def _assess_confidentiality_level(self, text: str) -> str:
        """Assess the level of confidentiality based on markers."""
        text_upper = text.upper()
        
        critical_markers = [
            "ATTORNEY-CLIENT PRIVILEGE", "WORK PRODUCT", "EYES ONLY",
            "STRICTLY CONFIDENTIAL"
        ]
        
        high_markers = [
            "PRIVILEGED", "CONFIDENTIAL", "SETTLEMENT NEGOTIATIONS",
            "MEDIATION CONFIDENTIAL"
        ]
        
        if any(marker in text_upper for marker in critical_markers):
            return "critical"
        elif any(marker in text_upper for marker in high_markers):
            return "high"
        else:
            return "standard"


class OpposingPartyRecognizer(PatternRecognizer):
    """
    Recognizer for opposing party names and entities in legal documents.
    
    Uses contextual analysis to identify parties in legal proceedings
    who may need anonymization for confidentiality.
    """
    
    PATTERNS = [
        # Formal party designations
        Pattern(
            name="formal_party_designation",
            regex=r"\b(?:Plaintiff|Defendant|Petitioner|Respondent|Appellant|Appellee)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc\.?|LLC|Corp\.?|Ltd\.?))?",
            score=0.9
        ),
        # vs./v. case style
        Pattern(
            name="versus_case_style",
            regex=r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:v\.?|vs\.?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*",
            score=0.85
        ),
        # Party references in pleadings
        Pattern(
            name="party_reference",
            regex=r"\b(?:The\s+)?(?:above-named\s+|aforesaid\s+)?(?:Plaintiff|Defendant|Party|Parties?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*",
            score=0.8
        )
    ]
    
    def __init__(self):
        super().__init__(
            supported_entity="OPPOSING_PARTY",
            patterns=self.PATTERNS,
            context=["plaintiff", "defendant", "party", "versus", "litigation"],
            supported_language="en"
        )


# Factory function to get all legal recognizers
def get_legal_recognizers() -> List[PatternRecognizer]:
    """
    Get all legal entity recognizers for enhanced PII scrubbing.
    
    Returns:
        List of configured legal entity recognizers
    """
    return [
        LawFirmRecognizer(),
        CourtCaseRecognizer(),
        JudgeAttorneyRecognizer(),
        BarLicenseRecognizer(),
        LegalCitationRecognizer(),
        ConfidentialityRecognizer(),
        OpposingPartyRecognizer()
    ]


def create_legal_policy_config() -> Dict:
    """
    Create enhanced policy configuration for legal entity recognition.
    
    Returns:
        Policy configuration dictionary with legal entity types
    """
    legal_entities = {
        "LAW_FIRM", "COURT_CASE", "LEGAL_PROFESSIONAL", "BAR_LICENSE",
        "LEGAL_CITATION", "CONFIDENTIAL_LEGAL", "OPPOSING_PARTY"
    }
    
    # Standard PII entities
    standard_entities = {
        "PERSON", "ORGANIZATION", "EMAIL_ADDRESS", "PHONE_NUMBER",
        "CREDIT_CARD", "IP_ADDRESS", "BSN", "RSIN", "IBAN_CODE"
    }
    
    return {
        "inbound_entities": list(standard_entities.union(legal_entities)),
        "outbound_entities": list(standard_entities.union(legal_entities)),
        "confidence_threshold": 0.7,  # Lower for legal context sensitivity
        "require_inbound": True,
        "require_outbound": True,
        "stable_tokenization": True,
        "custom_replacements": {
            "LAW_FIRM": "[LAW_FIRM]",
            "COURT_CASE": "[CASE_NUMBER]",
            "LEGAL_PROFESSIONAL": "[LEGAL_PROFESSIONAL]",
            "BAR_LICENSE": "[BAR_NUMBER]",
            "LEGAL_CITATION": "[CITATION]",
            "CONFIDENTIAL_LEGAL": "[PRIVILEGED_CONTENT]",
            "OPPOSING_PARTY": "[OPPOSING_PARTY]"
        }
    }