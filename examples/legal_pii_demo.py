#!/usr/bin/env python3
"""
Legal PII Scrubbing Demonstration

This script demonstrates the enhanced legal entity detection and anonymization
capabilities designed for lawyer-specific privacy protection that exceeds
current standards.

Run this script to see how the enhanced PII scrubber handles various types
of legal documents and sensitive information commonly found in legal practice.
"""

import sys
from pathlib import Path
import logging

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

try:
    from bear_ai.pii.scrubber import get_legal_pii_scrubber
    from bear_ai.pii.policy import Policy
    from bear_ai.pii.legal_recognizers import create_legal_policy_config
except ImportError as e:
    print(f"Error importing required modules: {e}")
    print("Please ensure the BEAR_AI PII modules are properly installed.")
    sys.exit(1)

def setup_logging():
    """Setup basic logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

def demonstrate_legal_document_scrubbing():
    """Demonstrate scrubbing of a comprehensive legal document."""
    print("=" * 80)
    print("LEGAL DOCUMENT PII SCRUBBING DEMONSTRATION")
    print("=" * 80)
    
    # Create legal PII scrubber
    scrubber = get_legal_pii_scrubber()
    
    # Create legal policy
    legal_config = create_legal_policy_config()
    policy = Policy.from_dict(legal_config)
    
    # Check if scrubber is available
    if not scrubber.is_available():
        print("WARNING: Presidio is not available. Install with:")
        print("pip install presidio-analyzer presidio-anonymizer spacy")
        print("python -m spacy download en_core_web_sm")
        print("\nFalling back to basic regex-based scrubbing...")
        print()
    
    # Sample legal documents
    legal_documents = {
        "Law Firm Correspondence": """
        ATTORNEY-CLIENT PRIVILEGE - CONFIDENTIAL
        
        Smith, Johnson & Associates, LLP
        1234 Legal Avenue, Suite 567
        New York, NY 10001
        Phone: (555) 123-4567
        Email: partners@sjlaw.com
        
        January 15, 2024
        
        RE: ABC Corporation v. XYZ Industries, Inc.
        Case No. 1:23-cv-12345 (S.D.N.Y.)
        
        Dear Client,
        
        The Honorable Judge Williams has scheduled a hearing for next month.
        Attorney Sarah Davis, Esq. (Bar No. 98765432) will represent you.
        
        This matter involves claims under 42 U.S.C. § 1983 and reference to
        Johnson v. State, 123 F.3d 456 (9th Cir. 2020) as controlling precedent.
        
        WORK PRODUCT - FOR COUNSEL ONLY
        
        Confidentially yours,
        Michael Thompson, J.D.
        Senior Partner
        Bar No. AB123456
        """,
        
        "Court Filing": """
        UNITED STATES DISTRICT COURT
        SOUTHERN DISTRICT OF NEW YORK
        
        Plaintiff Technology Corp.,
        
        v.                                     Case No. 1:24-cv-00789
        
        Defendant Software LLC,
        
        MOTION TO DISMISS
        
        TO THE HONORABLE COURT:
        
        Defendant Software LLC, by and through undersigned counsel,
        respectfully moves this Court to dismiss the complaint pursuant
        to Fed. R. Civ. P. 12(b)(6).
        
        ATTORNEY-CLIENT PRIVILEGE CLAIMED
        
        Respectfully submitted,
        
        /s/ Jennifer Martinez
        Jennifer Martinez, Esq.
        Attorney for Defendant
        State Bar No. CA987654
        Law Office of Martinez & Associates
        456 Court Street
        Los Angeles, CA 90210
        Phone: (310) 555-7890
        Email: j.martinez@lawoffice.net
        """,
        
        "Settlement Communication": """
        WITHOUT PREJUDICE - SETTLEMENT NEGOTIATIONS
        
        RE: Smith v. ABC Insurance Company
        Claim No. INS-2024-5678
        
        Dear Counsel,
        
        Our client, represented by Davis & Wilson LLP, is prepared to
        discuss resolution of this matter. The case involves claims
        totaling $250,000 based on the incident of March 15, 2023.
        
        Please contact Attorney Robert Chen, Esq. (Bar No. NY556677)
        at (212) 555-3456 or r.chen@daviswilson.com to schedule
        mediation with Magistrate Johnson.
        
        This communication is CONFIDENTIAL AND PRIVILEGED and made
        pursuant to Fed. R. Evid. 408.
        
        Very truly yours,
        
        Lisa Park, J.D.
        Senior Associate
        Davis & Wilson LLP
        """
    }
    
    # Process each document
    for doc_type, content in legal_documents.items():
        print(f"\n{'-' * 60}")
        print(f"DOCUMENT TYPE: {doc_type}")
        print(f"{'-' * 60}")
        
        print("\nORIGINAL DOCUMENT:")
        print("-" * 20)
        print(content.strip())
        
        # Scrub the document
        scrubbed = scrubber.scrub(content, policy, "outbound")
        
        print("\nSCRUBBED DOCUMENT:")
        print("-" * 20)
        print(scrubbed.strip())
        
        # Analyze entities found
        if scrubber.is_available():
            entities = scrubber.analyze_only(content)
            if entities:
                print(f"\nDETECTED ENTITIES:")
                print("-" * 20)
                entity_types = {}
                for entity in entities:
                    if entity.entity_type not in entity_types:
                        entity_types[entity.entity_type] = []
                    entity_types[entity.entity_type].append(entity.text)
                
                for entity_type, instances in entity_types.items():
                    print(f"{entity_type}: {len(instances)} instance(s)")
                    for instance in instances[:3]:  # Show first 3 instances
                        print(f"  - {instance}")
                    if len(instances) > 3:
                        print(f"  ... and {len(instances) - 3} more")
        
        print("\n")

def demonstrate_policy_customization():
    """Demonstrate policy customization for different legal contexts."""
    print("=" * 80)
    print("LEGAL POLICY CUSTOMIZATION DEMONSTRATION")
    print("=" * 80)
    
    scrubber = get_legal_pii_scrubber()
    
    sample_text = """
    This case involves Smith & Associates, LLP representing the plaintiff
    in matter 1:23-cv-12345. Attorney John Doe, Esq. (Bar No. 12345678) filed
    the motion. The matter is ATTORNEY-CLIENT PRIVILEGE. Contact: lawyer@firm.com
    """
    
    print("SAMPLE TEXT:")
    print("-" * 20)
    print(sample_text.strip())
    
    # Different policy configurations
    policies = {
        "Minimal Legal Scrubbing": {
            "inbound_entities": ["LAW_FIRM", "CONFIDENTIAL_LEGAL"],
            "outbound_entities": ["LAW_FIRM", "CONFIDENTIAL_LEGAL"],
            "confidence_threshold": 0.8
        },
        "Standard Legal Scrubbing": create_legal_policy_config(),
        "Maximum Privacy Protection": {
            "inbound_entities": [
                "LAW_FIRM", "COURT_CASE", "LEGAL_PROFESSIONAL", "BAR_LICENSE",
                "LEGAL_CITATION", "CONFIDENTIAL_LEGAL", "OPPOSING_PARTY",
                "PERSON", "ORGANIZATION", "EMAIL_ADDRESS", "PHONE_NUMBER",
                "CREDIT_CARD", "IP_ADDRESS", "BSN", "RSIN", "IBAN_CODE"
            ],
            "outbound_entities": [
                "LAW_FIRM", "COURT_CASE", "LEGAL_PROFESSIONAL", "BAR_LICENSE", 
                "LEGAL_CITATION", "CONFIDENTIAL_LEGAL", "OPPOSING_PARTY",
                "PERSON", "ORGANIZATION", "EMAIL_ADDRESS", "PHONE_NUMBER",
                "CREDIT_CARD", "IP_ADDRESS", "BSN", "RSIN", "IBAN_CODE"
            ],
            "confidence_threshold": 0.6
        }
    }
    
    for policy_name, config in policies.items():
        print(f"\n{'-' * 40}")
        print(f"POLICY: {policy_name}")
        print(f"{'-' * 40}")
        
        policy = Policy.from_dict(config)
        scrubbed = scrubber.scrub(sample_text, policy, "outbound")
        
        print("SCRUBBED TEXT:")
        print(scrubbed.strip())
        print()

def demonstrate_supported_entities():
    """Show all supported legal entity types."""
    print("=" * 80)
    print("SUPPORTED LEGAL ENTITY TYPES")
    print("=" * 80)
    
    scrubber = get_legal_pii_scrubber()
    
    if scrubber.is_available():
        supported = scrubber.get_supported_entities()
        
        # Categorize entities
        legal_entities = []
        standard_entities = []
        
        for entity in supported:
            if entity in {"LAW_FIRM", "COURT_CASE", "LEGAL_PROFESSIONAL", 
                         "BAR_LICENSE", "LEGAL_CITATION", "CONFIDENTIAL_LEGAL", 
                         "OPPOSING_PARTY"}:
                legal_entities.append(entity)
            else:
                standard_entities.append(entity)
        
        print("LEGAL-SPECIFIC ENTITIES:")
        print("-" * 30)
        for entity in sorted(legal_entities):
            print(f"  - {entity}")
        
        print("\nSTANDARD PII ENTITIES:")
        print("-" * 30)
        for entity in sorted(standard_entities):
            print(f"  - {entity}")
        
        print(f"\nTOTAL SUPPORTED ENTITIES: {len(supported)}")
    else:
        print("Presidio not available - showing expected legal entities:")
        expected_legal = [
            "LAW_FIRM", "COURT_CASE", "LEGAL_PROFESSIONAL", "BAR_LICENSE",
            "LEGAL_CITATION", "CONFIDENTIAL_LEGAL", "OPPOSING_PARTY"
        ]
        for entity in expected_legal:
            print(f"  - {entity}")

def main():
    """Main demonstration function."""
    setup_logging()
    
    print("ENHANCED LEGAL PII SCRUBBING DEMO")
    print("Advanced privacy protection for legal professionals")
    print()
    
    try:
        # Run demonstrations
        demonstrate_legal_document_scrubbing()
        demonstrate_policy_customization()
        demonstrate_supported_entities()
        
        print("=" * 80)
        print("DEMONSTRATION COMPLETE")
        print("=" * 80)
        print()
        print("This enhanced PII scrubbing system provides:")
        print("✓ Law firm name detection and anonymization")
        print("✓ Court case numbers and docket identification")
        print("✓ Judge and attorney name protection") 
        print("✓ Client company and organization anonymization")
        print("✓ Legal precedent and citation scrubbing")
        print("✓ Bar number and license identification")
        print("✓ Opposing party name detection")
        print("✓ Confidential legal matter identification")
        print("✓ Attorney-client privilege and confidentiality protection")
        print()
        print("The system exceeds current standards by providing specialized")
        print("recognition patterns for legal profession-specific PII with")
        print("context-aware detection and policy-based customization.")
        
    except Exception as e:
        print(f"Error during demonstration: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()