"""
PII Scrubber using Microsoft Presidio

Provides advanced PII detection and anonymization using Presidio with:
- Custom Dutch entity recognizers (BSN, RSIN)
- Integration with existing security module patterns
- Multi-language support with Dutch NLP models
- Policy-based entity filtering
- Audit trail integration
"""

import logging
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

try:
    from presidio_analyzer import AnalyzerEngine
    from presidio_anonymizer import AnonymizerEngine
    from presidio_analyzer.nlp_engine import NlpEngineProvider
    from presidio_analyzer import RecognizerResult
    PRESIDIO_AVAILABLE = True
except ImportError:
    PRESIDIO_AVAILABLE = False
    AnalyzerEngine = None
    AnonymizerEngine = None
    NlpEngineProvider = None
    RecognizerResult = None

from .dutch_recognizers import DutchBSNRecognizer, DutchRSINRecognizer
from .policy import Policy


@dataclass
class PIIEntity:
    """Represents a detected PII entity."""
    entity_type: str
    start: int
    end: int
    score: float
    text: str
    anonymized_text: str


class Scrubber:
    """
    Advanced PII scrubber using Microsoft Presidio.
    
    Provides comprehensive PII detection and anonymization with support for:
    - Multiple languages (English, Dutch)
    - Custom entity recognizers
    - Policy-based filtering
    - Audit logging integration
    """
    
    def __init__(self, enable_audit: bool = None):
        """
        Initialize the PII scrubber.
        
        Args:
            enable_audit: Whether to enable audit logging. If None, uses PII_AUDIT env var.
        """
        self.logger = logging.getLogger(__name__)
        
        if not PRESIDIO_AVAILABLE:
            self.logger.warning(
                "Presidio not available. Install with: pip install presidio-analyzer presidio-anonymizer"
            )
            self._analyzer = None
            self._anonymizer = None
            return
        
        # Initialize Presidio engines
        self._analyzer = self._create_analyzer()
        self._anonymizer = AnonymizerEngine()
        
        # Audit configuration
        if enable_audit is None:
            enable_audit = os.getenv("PII_AUDIT", "false").lower() == "true"
        
        self._audit = None
        if enable_audit:
            try:
                from .audit import Audit
                self._audit = Audit()
            except Exception as e:
                self.logger.warning(f"Failed to initialize audit: {e}")
    
    def _create_analyzer(self) -> Optional[AnalyzerEngine]:
        """Create and configure the Presidio analyzer engine."""
        if not PRESIDIO_AVAILABLE:
            return None
        
        try:
            # Configure NLP engine with Dutch support
            nlp_configuration = {
                "nlp_engine_name": "spacy",
                "models": [
                    {"lang_code": "en", "model_name": "en_core_web_lg"},
                    {"lang_code": "nl", "model_name": "nl_core_news_lg"}
                ]
            }
            
            # Try to create NLP engine provider
            try:
                provider = NlpEngineProvider(nlp_configuration=nlp_configuration)
                nlp_engine = provider.create_engine()
            except Exception as e:
                self.logger.warning(f"Failed to load Dutch model: {e}. Falling back to English only.")
                # Fallback to English only
                nlp_configuration = {
                    "nlp_engine_name": "spacy", 
                    "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}]
                }
                provider = NlpEngineProvider(nlp_configuration=nlp_configuration)
                nlp_engine = provider.create_engine()
            
            # Create analyzer with custom recognizers
            analyzer = AnalyzerEngine(nlp_engine=nlp_engine)
            
            # Add Dutch custom recognizers
            dutch_bsn = DutchBSNRecognizer()
            dutch_rsin = DutchRSINRecognizer()
            
            analyzer.registry.add_recognizer(dutch_bsn)
            analyzer.registry.add_recognizer(dutch_rsin)
            
            self.logger.info("Presidio analyzer initialized with Dutch support")
            return analyzer
            
        except Exception as e:
            self.logger.error(f"Failed to create Presidio analyzer: {e}")
            return None
    
    def is_available(self) -> bool:
        """Check if Presidio is available and properly configured."""
        return PRESIDIO_AVAILABLE and self._analyzer is not None
    
    def scrub(self, text: str, policy: Policy, direction: str = "inbound") -> str:
        """
        Scrub PII from text according to policy.
        
        Args:
            text: Text to scrub
            policy: PII policy configuration
            direction: Either 'inbound' or 'outbound'
            
        Returns:
            Text with PII replaced according to policy
        """
        if not self.is_available():
            # Fall back to original regex-based scrubbing
            return self._fallback_scrub(text)
        
        # Check if scrubbing is required for this direction
        if direction == "inbound" and not policy.should_scrub_inbound():
            return text
        elif direction == "outbound" and not policy.should_scrub_outbound():
            return text
        
        try:
            # Get entities to detect for this direction
            entities_to_detect = list(policy.get_entities_for_direction(direction))
            
            if not entities_to_detect:
                return text
            
            # Analyze text for PII
            analysis_results = self._analyzer.analyze(
                text=text,
                entities=entities_to_detect,
                language="nl",  # Primary language
                score_threshold=policy.get_confidence_threshold()
            )
            
            # Convert analysis results to PIIEntity objects
            pii_entities = []
            for result in analysis_results:
                entity_text = text[result.start:result.end]
                replacement = policy.get_replacement_token(result.entity_type, entity_text)
                
                pii_entities.append(PIIEntity(
                    entity_type=result.entity_type,
                    start=result.start,
                    end=result.end,
                    score=result.score,
                    text=entity_text,
                    anonymized_text=replacement
                ))
            
            # Apply anonymization
            anonymized_text = self._apply_anonymization(text, pii_entities)
            
            # Log to audit if enabled
            if self._audit:
                self._audit.log_scrubbing_event(
                    original_hash=self._audit.hash_text(text),
                    entities_found=pii_entities,
                    direction=direction,
                    policy_config=policy.to_dict()
                )
            
            return anonymized_text
            
        except Exception as e:
            self.logger.error(f"Error during PII scrubbing: {e}")
            # Fall back to regex-based scrubbing on error
            return self._fallback_scrub(text)
    
    def _apply_anonymization(self, text: str, entities: List[PIIEntity]) -> str:
        """
        Apply anonymization by replacing detected entities with tokens.
        
        Args:
            text: Original text
            entities: List of detected PII entities
            
        Returns:
            Text with entities replaced
        """
        if not entities:
            return text
        
        # Sort entities by start position in reverse order
        # This allows us to replace from end to beginning, avoiding index shifts
        sorted_entities = sorted(entities, key=lambda e: e.start, reverse=True)
        
        result = text
        for entity in sorted_entities:
            result = (
                result[:entity.start] + 
                entity.anonymized_text + 
                result[entity.end:]
            )
        
        return result
    
    def _fallback_scrub(self, text: str) -> str:
        """
        Fallback to original regex-based scrubbing when Presidio is not available.
        
        Args:
            text: Text to scrub
            
        Returns:
            Text with PII replaced using regex patterns
        """
        try:
            from ..security import scrub_pii
            return scrub_pii(text)
        except ImportError:
            self.logger.warning("Neither Presidio nor security module available for PII scrubbing")
            return text
    
    def analyze_only(self, text: str, entities: List[str] = None, 
                    language: str = "nl") -> List[PIIEntity]:
        """
        Analyze text for PII without anonymization.
        
        Args:
            text: Text to analyze
            entities: List of entity types to detect. If None, detects all.
            language: Language for analysis
            
        Returns:
            List of detected PII entities
        """
        if not self.is_available():
            return []
        
        try:
            # Use all available entities if not specified
            if entities is None:
                entities = [
                    "PERSON", "ORGANIZATION", "EMAIL_ADDRESS", "PHONE_NUMBER", 
                    "CREDIT_CARD", "IP_ADDRESS", "BSN", "RSIN", "DATE_TIME",
                    "LOCATION", "URL", "IBAN_CODE"
                ]
            
            # Analyze text
            analysis_results = self._analyzer.analyze(
                text=text,
                entities=entities,
                language=language,
                score_threshold=0.3  # Lower threshold for analysis-only mode
            )
            
            # Convert to PIIEntity objects
            pii_entities = []
            for result in analysis_results:
                entity_text = text[result.start:result.end]
                
                pii_entities.append(PIIEntity(
                    entity_type=result.entity_type,
                    start=result.start,
                    end=result.end,
                    score=result.score,
                    text=entity_text,
                    anonymized_text=f"[{result.entity_type}]"  # Default replacement
                ))
            
            return pii_entities
            
        except Exception as e:
            self.logger.error(f"Error during PII analysis: {e}")
            return []
    
    def get_supported_entities(self) -> List[str]:
        """
        Get list of supported PII entity types.
        
        Returns:
            List of supported entity type names
        """
        if not self.is_available():
            return []
        
        try:
            # Get supported entities from analyzer
            return list(self._analyzer.get_supported_entities())
        except Exception:
            # Return common entities as fallback
            return [
                "PERSON", "ORGANIZATION", "EMAIL_ADDRESS", "PHONE_NUMBER",
                "CREDIT_CARD", "IP_ADDRESS", "BSN", "RSIN", "DATE_TIME",
                "LOCATION", "URL", "IBAN_CODE", "NRP"
            ]
    
    def validate_dutch_number(self, number: str, number_type: str) -> bool:
        """
        Validate Dutch BSN or RSIN number.
        
        Args:
            number: Number to validate
            number_type: Either "BSN" or "RSIN"
            
        Returns:
            True if number is valid
        """
        try:
            if number_type == "BSN":
                recognizer = DutchBSNRecognizer()
                return recognizer._is_valid_bsn(number)
            elif number_type == "RSIN":
                recognizer = DutchRSINRecognizer()
                return recognizer._is_valid_rsin(number)
            else:
                return False
        except Exception:
            return False