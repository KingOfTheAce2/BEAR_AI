"""
Custom Dutch PII recognizers for Presidio

Provides specialized entity recognizers for Dutch PII types:
- BSN (Burgerservicenummer): Dutch social security number
- RSIN (Rechtspersonen en Samenwerkingsverbanden Informatienummer): Dutch business ID

These recognizers integrate validation logic from the existing security module
to minimize false positives through the 11-test checksum algorithm.
"""

from typing import List, Optional
import re

try:
    from presidio_analyzer import Pattern, PatternRecognizer, RecognizerResult
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


class DutchBSNRecognizer(PatternRecognizer):
    """
    Recognizer for Dutch BSN (Burgerservicenummer) numbers.
    
    BSN is a 9-digit personal identification number used in the Netherlands.
    This recognizer validates BSN numbers using the 11-test checksum algorithm
    to minimize false positives.
    """
    
    PATTERNS = [
        Pattern(
            name="bsn_with_separators",
            regex=r"\b\d{3}[-.\s]\d{3}[-.\s]\d{3}\b",
            score=0.9,
        ),
        Pattern(
            name="bsn_without_separators", 
            regex=r"\b\d{9}\b",
            score=0.7,  # Lower score due to higher chance of false positives
        ),
    ]
    
    CONTEXT = [
        "bsn", "burgerservicenummer", "burger service nummer",
        "persoonsnummer", "sofinummer", "sofi", "social security",
        "identificatienummer", "burger", "persoon"
    ]
    
    def __init__(self):
        super().__init__(
            supported_entity="BSN",
            patterns=self.PATTERNS,
            context=self.CONTEXT,
            supported_language="nl"
        )
    
    def validate_result(self, pattern_text: str, pattern_result: PatternRecognizer) -> bool:
        """
        Validate BSN using the 11-test checksum algorithm.
        
        Args:
            pattern_text: The matched text
            pattern_result: Pattern recognition result
            
        Returns:
            True if BSN passes validation
        """
        return self._is_valid_bsn(pattern_text)
    
    def _is_valid_bsn(self, number: str) -> bool:
        """
        Validate Dutch BSN using the 11-test checksum algorithm.
        
        Args:
            number: BSN number as string, may contain separators
            
        Returns:
            True if the BSN is valid according to the 11-test algorithm
        """
        # Import validation from existing security module
        try:
            from ..security import is_valid_bsn
            return is_valid_bsn(number)
        except ImportError:
            # Fallback implementation if security module not available
            return self._validate_bsn_fallback(number)
    
    def _validate_bsn_fallback(self, number: str) -> bool:
        """
        Fallback BSN validation implementation.
        
        Args:
            number: BSN number as string, may contain separators
            
        Returns:
            True if the BSN is valid
        """
        # Remove separators and whitespace
        clean_number = re.sub(r'[-.\s]', '', number.strip())
        
        # Must be exactly 9 digits
        if not clean_number.isdigit() or len(clean_number) != 9:
            return False
        
        # Convert to list of integers
        digits = [int(d) for d in clean_number]
        
        # BSN cannot start with 0
        if digits[0] == 0:
            return False
        
        # Apply 11-test algorithm
        # Multiply first 8 digits by weights 9,8,7,6,5,4,3,2
        checksum = sum(digits[i] * (9 - i) for i in range(8))
        
        # Add the 9th digit (check digit) with weight -1
        checksum += digits[8] * -1
        
        # Valid if checksum is divisible by 11
        return checksum % 11 == 0

    def analyze(self, text: str, entities: List[str], nlp_artifacts=None) -> List[RecognizerResult]:
        """
        Analyze text for BSN numbers with validation.
        
        Args:
            text: Text to analyze
            entities: List of entity types to look for
            nlp_artifacts: NLP artifacts from spaCy processing
            
        Returns:
            List of recognized BSN entities
        """
        results = []
        if "BSN" not in entities:
            return results
        
        # Use parent class pattern matching
        pattern_results = super().analyze(text, entities, nlp_artifacts)
        
        # Validate each match
        for result in pattern_results:
            matched_text = text[result.start:result.end]
            if self._is_valid_bsn(matched_text):
                # Add context-based score adjustment
                context_score = self._get_context_score(text, result.start, result.end)
                result.score = min(1.0, result.score + context_score)
                results.append(result)
        
        return results
    
    def _get_context_score(self, text: str, start: int, end: int) -> float:
        """
        Calculate context-based score adjustment.
        
        Args:
            text: Full text
            start: Start position of match
            end: End position of match
            
        Returns:
            Score adjustment (0.0 to 0.3)
        """
        # Check surrounding context (50 characters before and after)
        context_start = max(0, start - 50)
        context_end = min(len(text), end + 50)
        context = text[context_start:context_end].lower()
        
        score_boost = 0.0
        
        # Look for BSN-related keywords in context
        bsn_keywords = ["bsn", "burgerservicenummer", "sofinummer", "persoonsnummer"]
        for keyword in bsn_keywords:
            if keyword in context:
                score_boost += 0.1
                break
        
        # Look for personal context indicators
        personal_keywords = ["naam", "persoon", "burger", "geboorte", "identificatie"]
        for keyword in personal_keywords:
            if keyword in context:
                score_boost += 0.05
                break
        
        # Penalize business context
        business_keywords = ["bedrijf", "kvk", "rsin", "rechtspersoon"]
        for keyword in business_keywords:
            if keyword in context:
                score_boost -= 0.1
                break
        
        return max(0.0, min(0.3, score_boost))


class DutchRSINRecognizer(PatternRecognizer):
    """
    Recognizer for Dutch RSIN (Rechtspersonen en Samenwerkingsverbanden Informatienummer).
    
    RSIN is a 9-digit identification number for legal entities in the Netherlands.
    Uses the same 11-test validation algorithm as BSN.
    """
    
    PATTERNS = [
        Pattern(
            name="rsin_with_separators",
            regex=r"\b\d{3}[-.\s]\d{3}[-.\s]\d{3}\b", 
            score=0.8,
        ),
        Pattern(
            name="rsin_without_separators",
            regex=r"\b\d{9}\b",
            score=0.6,  # Lower score due to overlap with BSN pattern
        ),
    ]
    
    CONTEXT = [
        "rsin", "rechtspersonen", "samenwerkingsverbanden", 
        "informatienummer", "kvk", "bedrijf", "organisatie",
        "rechtspersoon", "chamber of commerce", "company"
    ]
    
    def __init__(self):
        super().__init__(
            supported_entity="RSIN",
            patterns=self.PATTERNS,
            context=self.CONTEXT,
            supported_language="nl"
        )
    
    def _is_valid_rsin(self, number: str) -> bool:
        """
        Validate Dutch RSIN using the same algorithm as BSN.
        
        Args:
            number: RSIN number as string, may contain separators
            
        Returns:
            True if the RSIN is valid
        """
        try:
            from ..security import is_valid_rsin
            return is_valid_rsin(number)
        except ImportError:
            # Use BSN validation since RSIN uses same algorithm
            bsn_recognizer = DutchBSNRecognizer()
            return bsn_recognizer._validate_bsn_fallback(number)

    def analyze(self, text: str, entities: List[str], nlp_artifacts=None) -> List[RecognizerResult]:
        """
        Analyze text for RSIN numbers with validation.
        
        Args:
            text: Text to analyze
            entities: List of entity types to look for  
            nlp_artifacts: NLP artifacts from spaCy processing
            
        Returns:
            List of recognized RSIN entities
        """
        results = []
        if "RSIN" not in entities:
            return results
        
        # Use parent class pattern matching
        pattern_results = super().analyze(text, entities, nlp_artifacts)
        
        # Validate each match
        for result in pattern_results:
            matched_text = text[result.start:result.end]
            if self._is_valid_rsin(matched_text):
                # Add context-based score adjustment
                context_score = self._get_context_score(text, result.start, result.end)
                result.score = min(1.0, result.score + context_score)
                results.append(result)
        
        return results
    
    def _get_context_score(self, text: str, start: int, end: int) -> float:
        """
        Calculate context-based score adjustment for RSIN.
        
        Args:
            text: Full text
            start: Start position of match
            end: End position of match
            
        Returns:
            Score adjustment (0.0 to 0.3)
        """
        # Check surrounding context (50 characters before and after)
        context_start = max(0, start - 50)
        context_end = min(len(text), end + 50)
        context = text[context_start:context_end].lower()
        
        score_boost = 0.0
        
        # Look for RSIN-related keywords in context
        rsin_keywords = ["rsin", "rechtspersonen", "kvk", "bedrijf"]
        for keyword in rsin_keywords:
            if keyword in context:
                score_boost += 0.1
                break
        
        # Look for business context indicators
        business_keywords = ["organisatie", "rechtspersoon", "company", "chamber"]
        for keyword in business_keywords:
            if keyword in context:
                score_boost += 0.05
                break
        
        # Penalize personal context
        personal_keywords = ["persoon", "burger", "bsn", "sofinummer"]
        for keyword in personal_keywords:
            if keyword in context:
                score_boost -= 0.1
                break
        
        return max(0.0, min(0.3, score_boost))