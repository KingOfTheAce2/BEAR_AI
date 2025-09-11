"""
PII Policy Management

Provides configurable policies for PII scrubbing with different rules for
inbound (user input) and outbound (model output) text processing.

The policy system supports:
- Selective entity type scrubbing
- Stable tokenization with salted hashes for consistent anonymization
- Environment-based configuration
- Confidence threshold management
"""

import os
import hashlib
import secrets
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from enum import Enum


class PIIEntityType(Enum):
    """Supported PII entity types for policy configuration."""
    PERSON = "PERSON"
    ORGANIZATION = "ORGANIZATION"  
    EMAIL_ADDRESS = "EMAIL_ADDRESS"
    PHONE_NUMBER = "PHONE_NUMBER"
    CREDIT_CARD = "CREDIT_CARD"
    IP_ADDRESS = "IP_ADDRESS"
    IBAN_CODE = "IBAN_CODE"
    NRP = "NRP"  # National Registration Number
    BSN = "BSN"  # Dutch Burgerservicenummer
    RSIN = "RSIN"  # Dutch RSIN
    DATE_TIME = "DATE_TIME"
    LOCATION = "LOCATION"
    URL = "URL"
    
    # Legal entity types for enhanced lawyer privacy protection
    LAW_FIRM = "LAW_FIRM"
    COURT_CASE = "COURT_CASE"
    LEGAL_PROFESSIONAL = "LEGAL_PROFESSIONAL"
    BAR_LICENSE = "BAR_LICENSE"
    LEGAL_CITATION = "LEGAL_CITATION"
    CONFIDENTIAL_LEGAL = "CONFIDENTIAL_LEGAL"
    OPPOSING_PARTY = "OPPOSING_PARTY"
    
    # Add more types as needed
    @classmethod
    def all_types(cls) -> Set[str]:
        """Get all available entity type values."""
        return {item.value for item in cls}


@dataclass
class PolicyConfig:
    """Configuration for PII scrubbing policies."""
    
    # Entity types to scrub for inbound text (user input)
    inbound_entities: Set[str] = field(default_factory=lambda: {
        PIIEntityType.EMAIL_ADDRESS.value,
        PIIEntityType.PHONE_NUMBER.value,
        PIIEntityType.CREDIT_CARD.value,
        PIIEntityType.BSN.value,
        PIIEntityType.RSIN.value,
        PIIEntityType.IBAN_CODE.value,
        # Legal entities for lawyer privacy protection
        PIIEntityType.LAW_FIRM.value,
        PIIEntityType.COURT_CASE.value,
        PIIEntityType.BAR_LICENSE.value,
        PIIEntityType.CONFIDENTIAL_LEGAL.value,
    })
    
    # Entity types to scrub for outbound text (model output)
    outbound_entities: Set[str] = field(default_factory=lambda: {
        PIIEntityType.EMAIL_ADDRESS.value,
        PIIEntityType.PHONE_NUMBER.value,
        PIIEntityType.CREDIT_CARD.value,
        PIIEntityType.BSN.value,
        PIIEntityType.RSIN.value,
        PIIEntityType.IBAN_CODE.value,
        PIIEntityType.PERSON.value,
        PIIEntityType.ORGANIZATION.value,
        # Enhanced legal entities for comprehensive lawyer privacy
        PIIEntityType.LAW_FIRM.value,
        PIIEntityType.COURT_CASE.value,
        PIIEntityType.LEGAL_PROFESSIONAL.value,
        PIIEntityType.BAR_LICENSE.value,
        PIIEntityType.LEGAL_CITATION.value,
        PIIEntityType.CONFIDENTIAL_LEGAL.value,
        PIIEntityType.OPPOSING_PARTY.value,
    })
    
    # Minimum confidence threshold for entity detection (0.0 to 1.0)
    confidence_threshold: float = 0.8
    
    # Whether to require scrubbing for inbound text
    require_inbound: bool = True
    
    # Whether to require scrubbing for outbound text  
    require_outbound: bool = True
    
    # Whether to use stable tokenization (consistent tokens for same entities)
    stable_tokenization: bool = True
    
    # Salt for stable tokenization (auto-generated if not provided)
    tokenization_salt: Optional[str] = None
    
    # Custom replacement patterns for specific entity types
    custom_replacements: Dict[str, str] = field(default_factory=dict)


class Policy:
    """
    PII scrubbing policy manager.
    
    Handles configuration for when and how PII should be scrubbed,
    with support for different policies for inbound vs outbound text.
    """
    
    def __init__(self, config: Optional[PolicyConfig] = None):
        """
        Initialize policy with configuration.
        
        Args:
            config: Policy configuration. If None, loads from environment variables.
        """
        self.config = config or self._load_from_environment()
        
        # Initialize salt for stable tokenization
        if self.config.stable_tokenization and not self.config.tokenization_salt:
            self.config.tokenization_salt = self._get_or_generate_salt()
    
    def _load_from_environment(self) -> PolicyConfig:
        """Load policy configuration from environment variables."""
        config = PolicyConfig()
        
        # Load confidence threshold
        try:
            threshold = float(os.getenv("PII_CONFIDENCE_THRESHOLD", "0.8"))
            config.confidence_threshold = max(0.0, min(1.0, threshold))
        except ValueError:
            pass  # Use default
        
        # Load entity type configurations
        inbound_env = os.getenv("PII_INBOUND_ENTITIES")
        if inbound_env:
            config.inbound_entities = set(inbound_env.split(","))
        
        outbound_env = os.getenv("PII_OUTBOUND_ENTITIES") 
        if outbound_env:
            config.outbound_entities = set(outbound_env.split(","))
        
        # Load policy flags
        config.require_inbound = os.getenv("PII_REQUIRE_INBOUND", "true").lower() == "true"
        config.require_outbound = os.getenv("PII_REQUIRE_OUTBOUND", "true").lower() == "true"
        config.stable_tokenization = os.getenv("PII_STABLE_TOKENS", "true").lower() == "true"
        
        return config
    
    def _get_or_generate_salt(self) -> str:
        """Get salt from environment or generate a new one."""
        salt = os.getenv("PII_SALT")
        if not salt:
            # Generate a random salt and warn user
            salt = secrets.token_hex(16)
            import logging
            logging.getLogger(__name__).warning(
                f"PII_SALT not set, generated random salt: {salt}. "
                "Set PII_SALT environment variable for consistent tokenization across sessions."
            )
        return salt
    
    def should_scrub_inbound(self) -> bool:
        """Check if inbound text should be scrubbed."""
        return self.config.require_inbound and bool(self.config.inbound_entities)
    
    def should_scrub_outbound(self) -> bool:
        """Check if outbound text should be scrubbed."""
        return self.config.require_outbound and bool(self.config.outbound_entities)
    
    def get_entities_for_direction(self, direction: str) -> Set[str]:
        """
        Get entity types to scrub for a specific direction.
        
        Args:
            direction: Either 'inbound' or 'outbound'
            
        Returns:
            Set of entity type names to scrub
        """
        if direction == "inbound":
            return self.config.inbound_entities.copy()
        elif direction == "outbound":
            return self.config.outbound_entities.copy()
        else:
            raise ValueError(f"Invalid direction: {direction}")
    
    def get_replacement_token(self, entity_type: str, original_text: str) -> str:
        """
        Get replacement token for an entity.
        
        Args:
            entity_type: The type of PII entity
            original_text: The original text that was detected
            
        Returns:
            Replacement token string
        """
        # Check for custom replacement patterns first
        if entity_type in self.config.custom_replacements:
            return self.config.custom_replacements[entity_type]
        
        # Use stable tokenization for certain entity types
        if (self.config.stable_tokenization and 
            entity_type in {PIIEntityType.PERSON.value, PIIEntityType.ORGANIZATION.value}):
            return self._generate_stable_token(entity_type, original_text)
        
        # Default bracketed replacement
        return f"[{entity_type}]"
    
    def _generate_stable_token(self, entity_type: str, original_text: str) -> str:
        """
        Generate a stable, deterministic token for an entity.
        
        Uses SHA256 with salt to create consistent but anonymized tokens.
        
        Args:
            entity_type: Type of entity
            original_text: Original text to tokenize
            
        Returns:
            Stable token string
        """
        if not self.config.tokenization_salt:
            return f"[{entity_type}]"
        
        # Create hash of original text + salt
        hash_input = f"{entity_type}:{original_text.lower()}:{self.config.tokenization_salt}"
        hash_digest = hashlib.sha256(hash_input.encode()).hexdigest()[:8]
        
        return f"[{entity_type}_{hash_digest.upper()}]"
    
    def get_confidence_threshold(self) -> float:
        """Get the minimum confidence threshold for entity detection."""
        return self.config.confidence_threshold
    
    def add_custom_replacement(self, entity_type: str, replacement: str):
        """
        Add or update custom replacement pattern for an entity type.
        
        Args:
            entity_type: PII entity type
            replacement: Custom replacement string
        """
        self.config.custom_replacements[entity_type] = replacement
    
    def update_entities(self, direction: str, entities: Set[str]):
        """
        Update entity types for a specific direction.
        
        Args:
            direction: Either 'inbound' or 'outbound'
            entities: Set of entity type names
        """
        if direction == "inbound":
            self.config.inbound_entities = entities.copy()
        elif direction == "outbound":  
            self.config.outbound_entities = entities.copy()
        else:
            raise ValueError(f"Invalid direction: {direction}")
    
    def to_dict(self) -> Dict:
        """Export policy configuration as dictionary."""
        return {
            "inbound_entities": list(self.config.inbound_entities),
            "outbound_entities": list(self.config.outbound_entities),
            "confidence_threshold": self.config.confidence_threshold,
            "require_inbound": self.config.require_inbound,
            "require_outbound": self.config.require_outbound,
            "stable_tokenization": self.config.stable_tokenization,
            "custom_replacements": self.config.custom_replacements.copy()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "Policy":
        """Create policy from dictionary configuration."""
        config = PolicyConfig(
            inbound_entities=set(data.get("inbound_entities", [])),
            outbound_entities=set(data.get("outbound_entities", [])),
            confidence_threshold=data.get("confidence_threshold", 0.8),
            require_inbound=data.get("require_inbound", True),
            require_outbound=data.get("require_outbound", True),
            stable_tokenization=data.get("stable_tokenization", True),
            custom_replacements=data.get("custom_replacements", {})
        )
        return cls(config)