"""
Legal Document Analysis Engine for BEAR AI
Specialized analysis for legal documents including contracts, briefs, and case law

Features:
- Legal document type classification
- Contract clause extraction and analysis
- Risk assessment algorithms
- Legal terminology recognition
- Obligation and deadline extraction
- Compliance checking
"""

import asyncio
import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid

logger = logging.getLogger(__name__)


class LegalDocumentType(Enum):
    """Legal document type classification"""
    CONTRACT = "contract"
    AGREEMENT = "agreement"
    LEGAL_BRIEF = "legal_brief"
    COURT_FILING = "court_filing"
    MEMORANDUM = "memorandum"
    REGULATION = "regulation"
    STATUTE = "statute"
    CASE_LAW = "case_law"
    CORRESPONDENCE = "correspondence"
    COMPLIANCE = "compliance"
    PATENT = "patent"
    TRADEMARK = "trademark"
    EMPLOYMENT = "employment"
    REAL_ESTATE = "real_estate"
    FINANCIAL = "financial"
    UNKNOWN = "unknown"


class ClauseType(Enum):
    """Types of legal clauses"""
    TERMINATION = "termination"
    LIABILITY = "liability"
    INDEMNIFICATION = "indemnification"
    CONFIDENTIALITY = "confidentiality"
    INTELLECTUAL_PROPERTY = "intellectual_property"
    PAYMENT = "payment"
    WARRANTY = "warranty"
    FORCE_MAJEURE = "force_majeure"
    GOVERNING_LAW = "governing_law"
    DISPUTE_RESOLUTION = "dispute_resolution"
    NON_COMPETE = "non_compete"
    NON_DISCLOSURE = "non_disclosure"
    LIMITATION_LIABILITY = "limitation_liability"
    ASSIGNMENT = "assignment"
    AMENDMENT = "amendment"
    ENTIRE_AGREEMENT = "entire_agreement"
    SEVERABILITY = "severability"
    NOTICE = "notice"
    PERFORMANCE = "performance"
    OBLIGATIONS = "obligations"


class RiskLevel(Enum):
    """Risk assessment levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ClauseExtraction:
    """Extracted legal clause"""
    id: str
    clause_type: ClauseType
    text: str
    confidence: float
    start_position: int
    end_position: int
    risk_level: RiskLevel
    key_terms: List[str] = field(default_factory=list)
    obligations: List[str] = field(default_factory=list)
    deadlines: List[str] = field(default_factory=list)
    parties: List[str] = field(default_factory=list)
    cross_references: List[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())


@dataclass
class RiskAssessment:
    """Risk assessment for legal document"""
    overall_risk: RiskLevel
    risk_factors: List[Dict[str, Any]]
    compliance_issues: List[str]
    missing_clauses: List[ClauseType]
    problematic_clauses: List[ClauseExtraction]
    recommendations: List[str]
    confidence_score: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            'overall_risk': self.overall_risk.value,
            'risk_factors': self.risk_factors,
            'compliance_issues': self.compliance_issues,
            'missing_clauses': [c.value for c in self.missing_clauses],
            'problematic_clauses': [
                {
                    'type': c.clause_type.value,
                    'text': c.text[:200] + "..." if len(c.text) > 200 else c.text,
                    'risk_level': c.risk_level.value
                }
                for c in self.problematic_clauses
            ],
            'recommendations': self.recommendations,
            'confidence_score': self.confidence_score
        }


class LegalDocumentClassifier:
    """Classify legal document types"""

    def __init__(self):
        # Document type patterns with scoring weights
        self.document_patterns = {
            LegalDocumentType.CONTRACT: {
                'keywords': [
                    'agreement', 'contract', 'party', 'parties', 'consideration',
                    'whereas', 'witnesseth', 'covenant', 'breach', 'termination',
                    'performance', 'obligations', 'terms and conditions'
                ],
                'phrases': [
                    'this agreement', 'the parties agree', 'in consideration of',
                    'subject to the terms', 'breach of this agreement'
                ],
                'weight': 1.0
            },
            LegalDocumentType.LEGAL_BRIEF: {
                'keywords': [
                    'brief', 'memorandum', 'court', 'honorable', 'plaintiff',
                    'defendant', 'motion', 'argument', 'precedent', 'jurisdiction',
                    'statute', 'case law', 'holding', 'ruling'
                ],
                'phrases': [
                    'to the honorable', 'comes now', 'statement of facts',
                    'legal argument', 'respectfully submitted'
                ],
                'weight': 1.0
            },
            LegalDocumentType.COURT_FILING: {
                'keywords': [
                    'motion', 'petition', 'complaint', 'answer', 'discovery',
                    'subpoena', 'deposition', 'filing', 'docket', 'case number',
                    'civil action', 'cause of action'
                ],
                'phrases': [
                    'civil action number', 'comes now plaintiff', 'filed this',
                    'jury trial demanded', 'wherefore plaintiff prays'
                ],
                'weight': 1.0
            },
            LegalDocumentType.REGULATION: {
                'keywords': [
                    'regulation', 'rule', 'cfr', 'federal register', 'compliance',
                    'regulatory', 'administrative', 'agency', 'enforcement',
                    'violation', 'penalty'
                ],
                'phrases': [
                    'code of federal regulations', 'pursuant to', 'regulatory authority',
                    'compliance with', 'violation of this'
                ],
                'weight': 1.0
            },
            LegalDocumentType.STATUTE: {
                'keywords': [
                    'statute', 'code', 'section', 'subsection', 'enacted',
                    'legislation', 'law', 'public law', 'usc', 'chapter'
                ],
                'phrases': [
                    'united states code', 'public law', 'be it enacted',
                    'section', 'subsection'
                ],
                'weight': 1.0
            }
        }

    def classify_document(self, text: str, title: str = "") -> Tuple[LegalDocumentType, float]:
        """Classify legal document type with confidence score"""
        text_lower = text.lower()
        title_lower = title.lower()
        scores = {}

        for doc_type, patterns in self.document_patterns.items():
            score = 0.0

            # Score keywords
            for keyword in patterns['keywords']:
                score += text_lower.count(keyword) * 1.0
                score += title_lower.count(keyword) * 3.0  # Title matches weighted higher

            # Score phrases
            for phrase in patterns['phrases']:
                score += text_lower.count(phrase) * 2.0
                score += title_lower.count(phrase) * 5.0

            # Normalize by text length
            if len(text) > 0:
                score = score / len(text.split()) * 1000

            scores[doc_type] = score * patterns['weight']

        # Find best match
        if not scores or max(scores.values()) < 0.1:
            return LegalDocumentType.UNKNOWN, 0.0

        best_type = max(scores, key=scores.get)
        confidence = min(scores[best_type], 1.0)

        return best_type, confidence


class ContractClauseExtractor:
    """Extract and analyze contract clauses"""

    def __init__(self):
        # Clause identification patterns
        self.clause_patterns = {
            ClauseType.TERMINATION: {
                'keywords': [
                    'termination', 'terminate', 'expiry', 'expire', 'end',
                    'dissolution', 'cancel', 'cancellation'
                ],
                'phrases': [
                    'this agreement shall terminate',
                    'either party may terminate',
                    'terminate this agreement',
                    'upon termination',
                    'effective date of termination'
                ],
                'risk_indicators': [
                    'immediate termination', 'without notice', 'at will',
                    'sole discretion', 'any reason'
                ]
            },
            ClauseType.LIABILITY: {
                'keywords': [
                    'liability', 'liable', 'damages', 'loss', 'injury',
                    'harm', 'responsible', 'responsibility'
                ],
                'phrases': [
                    'shall be liable', 'not liable for', 'limited liability',
                    'joint and several liability', 'strict liability'
                ],
                'risk_indicators': [
                    'unlimited liability', 'personal liability', 'joint liability',
                    'several liability', 'strict liability'
                ]
            },
            ClauseType.INDEMNIFICATION: {
                'keywords': [
                    'indemnify', 'indemnification', 'defend', 'hold harmless'
                ],
                'phrases': [
                    'agrees to indemnify', 'hold harmless and defend',
                    'indemnify and hold harmless', 'defend against'
                ],
                'risk_indicators': [
                    'broad indemnification', 'unlimited indemnification',
                    'third party claims', 'including attorneys fees'
                ]
            },
            ClauseType.CONFIDENTIALITY: {
                'keywords': [
                    'confidential', 'confidentiality', 'proprietary',
                    'non-disclosure', 'trade secret', 'disclosure'
                ],
                'phrases': [
                    'confidential information', 'proprietary information',
                    'agrees not to disclose', 'maintain confidentiality'
                ],
                'risk_indicators': [
                    'perpetual confidentiality', 'broad definition',
                    'no exceptions', 'employee obligations'
                ]
            },
            ClauseType.PAYMENT: {
                'keywords': [
                    'payment', 'pay', 'compensation', 'fee', 'amount',
                    'invoice', 'billing', 'cost'
                ],
                'phrases': [
                    'shall pay', 'payment terms', 'due and payable',
                    'late payment', 'payment schedule'
                ],
                'risk_indicators': [
                    'payment in advance', 'non-refundable', 'late fees',
                    'acceleration clause', 'no right to offset'
                ]
            },
            ClauseType.INTELLECTUAL_PROPERTY: {
                'keywords': [
                    'intellectual property', 'copyright', 'patent',
                    'trademark', 'trade secret', 'proprietary'
                ],
                'phrases': [
                    'intellectual property rights', 'ownership of',
                    'work for hire', 'assigns all rights'
                ],
                'risk_indicators': [
                    'broad assignment', 'all improvements', 'future inventions',
                    'moral rights waiver'
                ]
            }
        }

    async def extract_clauses(self, text: str) -> List[ClauseExtraction]:
        """Extract clauses from contract text"""
        clauses = []
        sentences = self._split_sentences(text)

        for i, sentence in enumerate(sentences):
            clause_matches = self._identify_clause_types(sentence)

            for clause_type, confidence in clause_matches:
                if confidence > 0.3:  # Minimum confidence threshold
                    start_pos = text.find(sentence)
                    end_pos = start_pos + len(sentence)

                    # Analyze risk level
                    risk_level = self._assess_clause_risk(sentence, clause_type)

                    # Extract key information
                    key_terms = self._extract_key_terms(sentence, clause_type)
                    obligations = self._extract_obligations(sentence)
                    deadlines = self._extract_deadlines(sentence)
                    parties = self._extract_parties(sentence)

                    clause = ClauseExtraction(
                        id=str(uuid.uuid4()),
                        clause_type=clause_type,
                        text=sentence,
                        confidence=confidence,
                        start_position=start_pos,
                        end_position=end_pos,
                        risk_level=risk_level,
                        key_terms=key_terms,
                        obligations=obligations,
                        deadlines=deadlines,
                        parties=parties
                    )

                    clauses.append(clause)

        return clauses

    def _identify_clause_types(self, text: str) -> List[Tuple[ClauseType, float]]:
        """Identify clause types in text with confidence scores"""
        text_lower = text.lower()
        matches = []

        for clause_type, patterns in self.clause_patterns.items():
            score = 0.0

            # Score keywords
            for keyword in patterns['keywords']:
                if keyword in text_lower:
                    score += 1.0

            # Score phrases (weighted higher)
            for phrase in patterns['phrases']:
                if phrase in text_lower:
                    score += 2.0

            # Normalize score
            max_possible_score = len(patterns['keywords']) + len(patterns['phrases']) * 2
            confidence = score / max_possible_score if max_possible_score > 0 else 0.0

            if confidence > 0:
                matches.append((clause_type, confidence))

        return sorted(matches, key=lambda x: x[1], reverse=True)

    def _assess_clause_risk(self, text: str, clause_type: ClauseType) -> RiskLevel:
        """Assess risk level of a clause"""
        text_lower = text.lower()
        patterns = self.clause_patterns.get(clause_type, {})
        risk_indicators = patterns.get('risk_indicators', [])

        risk_score = 0
        for indicator in risk_indicators:
            if indicator in text_lower:
                risk_score += 1

        # Risk assessment based on indicators and clause type
        if risk_score >= 3:
            return RiskLevel.CRITICAL
        elif risk_score >= 2:
            return RiskLevel.HIGH
        elif risk_score >= 1:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def _extract_key_terms(self, text: str, clause_type: ClauseType) -> List[str]:
        """Extract key terms from clause"""
        # Legal term patterns
        legal_patterns = [
            r'\b(?:shall|will|must|may|may not|cannot)\b',
            r'\b(?:liable|responsible|obligation|duty|right)\b',
            r'\b(?:breach|default|violation|non-compliance)\b',
            r'\$[\d,]+(?:\.\d{2})?',  # Money amounts
            r'\b\d+\s*(?:days?|months?|years?)\b',  # Time periods
        ]

        key_terms = []
        for pattern in legal_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            key_terms.extend(matches)

        return list(set(key_terms))

    def _extract_obligations(self, text: str) -> List[str]:
        """Extract obligations from clause text"""
        obligation_patterns = [
            r'(?:shall|will|must|agrees? to|required to|obligated to)\s+([^.;]+)',
            r'(?:responsible for|liable for|duty to)\s+([^.;]+)',
        ]

        obligations = []
        for pattern in obligation_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            obligations.extend([match.strip() for match in matches])

        return obligations

    def _extract_deadlines(self, text: str) -> List[str]:
        """Extract deadlines and time-sensitive terms"""
        deadline_patterns = [
            r'within\s+(\d+\s*(?:days?|months?|years?))',
            r'(?:by|before|on or before)\s+([^.;,]+)',
            r'no later than\s+([^.;,]+)',
            r'(\d+\s*(?:days?|months?|years?))\s+(?:after|from|before)',
        ]

        deadlines = []
        for pattern in deadline_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            deadlines.extend([match.strip() for match in matches])

        return deadlines

    def _extract_parties(self, text: str) -> List[str]:
        """Extract party references from clause"""
        party_patterns = [
            r'\b(?:Company|Corporation|LLC|Inc|Ltd|Contractor|Client|Customer|Vendor|Supplier)\b',
            r'\b(?:Party|Parties|Licensor|Licensee|Buyer|Seller|Tenant|Landlord)\b',
            r'\b(?:Employee|Employer|Provider|Recipient)\b'
        ]

        parties = []
        for pattern in party_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            parties.extend(matches)

        return list(set(parties))

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences for clause analysis"""
        # Enhanced sentence splitting for legal text
        sentence_boundaries = r'(?<!\b(?:Inc|Corp|LLC|Ltd|Co|Esq|Jr|Sr|v|vs|No|Sec|Art|Ch)\.)(?<=[.!?])\s+'
        sentences = re.split(sentence_boundaries, text)
        return [s.strip() for s in sentences if s.strip()]


class LegalRiskAnalyzer:
    """Analyze legal risks in documents"""

    def __init__(self):
        self.critical_risk_patterns = [
            'unlimited liability',
            'personal guarantee',
            'joint and several liability',
            'liquidated damages',
            'no limitation of liability',
            'broad indemnification',
            'assignment of all rights',
            'perpetual obligations',
            'no termination right',
            'automatic renewal',
            'no right to cure',
            'immediate termination'
        ]

        self.compliance_requirements = {
            'data_protection': [
                'gdpr', 'personal data', 'data processing', 'privacy policy',
                'data subject rights', 'data controller', 'data processor'
            ],
            'employment': [
                'equal opportunity', 'discrimination', 'harassment',
                'wage and hour', 'overtime', 'break periods'
            ],
            'financial': [
                'anti-money laundering', 'know your customer', 'sox compliance',
                'financial reporting', 'audit requirements'
            ]
        }

    async def analyze_risks(
        self,
        text: str,
        clauses: List[ClauseExtraction],
        document_type: LegalDocumentType
    ) -> RiskAssessment:
        """Perform comprehensive risk analysis"""

        risk_factors = []
        compliance_issues = []
        missing_clauses = []
        problematic_clauses = []
        recommendations = []

        # Analyze individual clauses
        for clause in clauses:
            if clause.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                problematic_clauses.append(clause)
                risk_factors.append({
                    'type': 'clause_risk',
                    'clause_type': clause.clause_type.value,
                    'risk_level': clause.risk_level.value,
                    'description': f"High-risk {clause.clause_type.value} clause detected"
                })

        # Check for critical risk patterns
        text_lower = text.lower()
        for pattern in self.critical_risk_patterns:
            if pattern in text_lower:
                risk_factors.append({
                    'type': 'critical_pattern',
                    'pattern': pattern,
                    'risk_level': 'critical',
                    'description': f"Critical risk pattern detected: {pattern}"
                })

        # Check compliance requirements
        for compliance_area, keywords in self.compliance_requirements.items():
            for keyword in keywords:
                if keyword in text_lower:
                    compliance_issues.append(f"Potential {compliance_area} compliance requirement: {keyword}")

        # Check for missing essential clauses
        if document_type == LegalDocumentType.CONTRACT:
            essential_clauses = [
                ClauseType.TERMINATION,
                ClauseType.LIABILITY,
                ClauseType.PAYMENT,
                ClauseType.GOVERNING_LAW
            ]

            present_clause_types = {clause.clause_type for clause in clauses}
            missing_clauses = [ct for ct in essential_clauses if ct not in present_clause_types]

        # Generate recommendations
        if missing_clauses:
            recommendations.append("Consider adding missing essential clauses")

        if problematic_clauses:
            recommendations.append("Review high-risk clauses and consider modifications")

        if compliance_issues:
            recommendations.append("Ensure compliance with relevant regulations")

        # Calculate overall risk
        overall_risk = self._calculate_overall_risk(risk_factors, problematic_clauses, missing_clauses)

        # Calculate confidence score
        confidence_score = self._calculate_confidence(clauses, risk_factors)

        return RiskAssessment(
            overall_risk=overall_risk,
            risk_factors=risk_factors,
            compliance_issues=compliance_issues,
            missing_clauses=missing_clauses,
            problematic_clauses=problematic_clauses,
            recommendations=recommendations,
            confidence_score=confidence_score
        )

    def _calculate_overall_risk(
        self,
        risk_factors: List[Dict[str, Any]],
        problematic_clauses: List[ClauseExtraction],
        missing_clauses: List[ClauseType]
    ) -> RiskLevel:
        """Calculate overall risk level"""

        # Count critical factors
        critical_count = sum(1 for rf in risk_factors if rf.get('risk_level') == 'critical')
        high_risk_clauses = len([c for c in problematic_clauses if c.risk_level == RiskLevel.CRITICAL])
        missing_essential = len(missing_clauses)

        if critical_count > 0 or high_risk_clauses > 2:
            return RiskLevel.CRITICAL
        elif high_risk_clauses > 0 or missing_essential > 2:
            return RiskLevel.HIGH
        elif len(risk_factors) > 3 or missing_essential > 0:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def _calculate_confidence(
        self,
        clauses: List[ClauseExtraction],
        risk_factors: List[Dict[str, Any]]
    ) -> float:
        """Calculate confidence score for risk assessment"""

        if not clauses:
            return 0.0

        # Average clause confidence
        avg_clause_confidence = sum(c.confidence for c in clauses) / len(clauses)

        # Factor in number of risk factors found
        risk_factor_confidence = min(len(risk_factors) / 10, 1.0)

        return (avg_clause_confidence + risk_factor_confidence) / 2


class LegalDocumentAnalyzer:
    """Main legal document analyzer"""

    def __init__(self):
        self.classifier = LegalDocumentClassifier()
        self.clause_extractor = ContractClauseExtractor()
        self.risk_analyzer = LegalRiskAnalyzer()

    async def analyze_document(
        self,
        text: str,
        title: str = "",
        perform_risk_analysis: bool = True
    ) -> Dict[str, Any]:
        """Perform comprehensive legal document analysis"""

        try:
            # Classify document type
            doc_type, classification_confidence = self.classifier.classify_document(text, title)

            # Extract clauses
            clauses = await self.clause_extractor.extract_clauses(text)

            # Perform risk analysis if requested
            risk_assessment = None
            if perform_risk_analysis:
                risk_assessment = await self.risk_analyzer.analyze_risks(text, clauses, doc_type)

            # Compile results
            results = {
                'document_type': doc_type.value,
                'classification_confidence': classification_confidence,
                'clause_count': len(clauses),
                'clauses': [
                    {
                        'id': clause.id,
                        'type': clause.clause_type.value,
                        'text': clause.text[:200] + "..." if len(clause.text) > 200 else clause.text,
                        'confidence': clause.confidence,
                        'risk_level': clause.risk_level.value,
                        'key_terms': clause.key_terms,
                        'obligations': clause.obligations,
                        'deadlines': clause.deadlines,
                        'parties': clause.parties
                    }
                    for clause in clauses
                ],
                'risk_assessment': risk_assessment.to_dict() if risk_assessment else None
            }

            return results

        except Exception as e:
            logger.error(f"Legal document analysis failed: {e}")
            return {
                'error': str(e),
                'document_type': 'unknown',
                'classification_confidence': 0.0,
                'clause_count': 0,
                'clauses': [],
                'risk_assessment': None
            }


# Factory function
def create_legal_analyzer() -> LegalDocumentAnalyzer:
    """Create legal document analyzer"""
    return LegalDocumentAnalyzer()