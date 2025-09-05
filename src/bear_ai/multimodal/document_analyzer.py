"""
Document Structure Analysis
Analyze document structure, layout, and extract insights
"""

import asyncio
import json
import logging
import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from ..multimodal.multimodal_processor import MediaType

logger = logging.getLogger(__name__)


@dataclass
class DocumentStructure:
    """Document structure analysis"""
    sections: List[Dict[str, Any]] = field(default_factory=list)
    headings: List[Dict[str, str]] = field(default_factory=list)
    tables: List[Dict[str, Any]] = field(default_factory=list)
    images: List[Dict[str, str]] = field(default_factory=list)
    links: List[Dict[str, str]] = field(default_factory=list)
    
    # Statistics
    page_count: int = 0
    word_count: int = 0
    paragraph_count: int = 0
    sentence_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'sections': self.sections,
            'headings': self.headings,
            'tables': len(self.tables),
            'images': len(self.images),
            'links': len(self.links),
            'page_count': self.page_count,
            'word_count': self.word_count,
            'paragraph_count': self.paragraph_count,
            'sentence_count': self.sentence_count
        }


@dataclass
class DocumentInsights:
    """Document content insights"""
    key_topics: List[str] = field(default_factory=list)
    entities: List[Dict[str, str]] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)
    language: Optional[str] = None
    readability_score: Optional[float] = None
    
    # Content characteristics
    document_type: Optional[str] = None
    formality_level: Optional[str] = None
    sentiment: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'key_topics': self.key_topics,
            'entities': self.entities,
            'keywords': self.keywords,
            'language': self.language,
            'readability_score': self.readability_score,
            'document_type': self.document_type,
            'formality_level': self.formality_level,
            'sentiment': self.sentiment
        }


class DocumentAnalyzer:
    """Analyze document structure and content"""
    
    def __init__(self):
        self.nlp_available = False
        
        # Try to initialize NLP capabilities
        try:
            import spacy
            self.nlp_available = True
            self.nlp_model = None  # Load on demand
            logger.info("spaCy available for document analysis")
        except ImportError:
            logger.info("spaCy not available for advanced document analysis")
        
        # Legal document patterns
        self.legal_patterns = {
            'contract_indicators': [
                r'\b(agreement|contract|terms and conditions|whereas)\b',
                r'\b(party|parties)\b.*\b(agrees?|consent)\b',
                r'\b(liability|indemnif|warrant)',
                r'\b(governing law|jurisdiction)\b'
            ],
            'clause_patterns': [
                r'\b(section|clause|article|paragraph)\s+\d+',
                r'\b\d+\.\s*[A-Z]',
                r'\([a-z]\)',
                r'\b(shall|will|must|may not)\b'
            ],
            'legal_entities': [
                r'\b[A-Z][a-z]+ (Inc\.|LLC|Corp\.|Company|Corporation)\b',
                r'\b(Plaintiff|Defendant|Respondent|Appellant)\b'
            ]
        }
        
        logger.info("DocumentAnalyzer initialized")
    
    async def analyze_document(
        self,
        content: Union[bytes, str],
        file_path: Optional[Path] = None,
        media_type: MediaType = MediaType.DOCUMENT
    ) -> Dict[str, Any]:
        """Analyze document structure and content"""
        
        try:
            # Convert content to text if needed
            if isinstance(content, bytes):
                try:
                    text_content = content.decode('utf-8')
                except UnicodeDecodeError:
                    text_content = content.decode('utf-8', errors='ignore')
            else:
                text_content = str(content)
            
            if not text_content.strip():
                return {
                    'text': '',
                    'description': 'Empty document',
                    'analysis': {'error': 'No content found'}
                }
            
            # Analyze structure
            structure = await self._analyze_structure(text_content, media_type)
            
            # Extract insights
            insights = await self._extract_insights(text_content)
            
            # Generate description
            description = self._generate_document_description(structure, insights, text_content)
            
            # Combine analysis
            combined_analysis = {
                'structure': structure.to_dict(),
                'insights': insights.to_dict(),
                'content_length': len(text_content),
                'media_type': media_type.value
            }
            
            return {
                'text': text_content,
                'description': description,
                'analysis': combined_analysis
            }
            
        except Exception as e:
            logger.error(f"Error analyzing document: {e}")
            return {
                'text': '',
                'description': f'Error analyzing document: {e}',
                'analysis': {'error': str(e)}
            }
    
    async def _analyze_structure(self, text: str, media_type: MediaType) -> DocumentStructure:
        """Analyze document structure"""
        
        structure = DocumentStructure()
        
        try:
            # Basic statistics
            structure.word_count = len(text.split())
            structure.paragraph_count = len([p for p in text.split('\n\n') if p.strip()])
            structure.sentence_count = len(re.findall(r'[.!?]+', text))
            
            # Detect headings
            structure.headings = self._extract_headings(text)
            
            # Detect sections
            structure.sections = self._extract_sections(text, structure.headings)
            
            # Detect tables (simple detection)
            structure.tables = self._detect_tables(text)
            
            # Detect links
            structure.links = self._extract_links(text)
            
            # Detect images (references)
            structure.images = self._detect_image_references(text)
            
            # Estimate page count (rough)
            words_per_page = 250  # Approximate
            structure.page_count = max(1, structure.word_count // words_per_page)
            
        except Exception as e:
            logger.warning(f"Structure analysis failed: {e}")
        
        return structure
    
    def _extract_headings(self, text: str) -> List[Dict[str, str]]:
        """Extract headings from text"""
        
        headings = []
        
        # Markdown-style headings
        markdown_headings = re.findall(r'^(#{1,6})\s+(.+)$', text, re.MULTILINE)
        for level_markers, heading_text in markdown_headings:
            headings.append({
                'text': heading_text.strip(),
                'level': len(level_markers),
                'type': 'markdown'
            })
        
        # Numbered headings
        numbered_headings = re.findall(r'^(\d+(?:\.\d+)*)\s+([A-Z][^.!?]*[.!?]?)$', text, re.MULTILINE)
        for number, heading_text in numbered_headings:
            level = number.count('.') + 1
            headings.append({
                'text': heading_text.strip(),
                'level': level,
                'type': 'numbered'
            })
        
        # All caps headings (likely headings)
        caps_headings = re.findall(r'^([A-Z][A-Z\s]{10,})$', text, re.MULTILINE)
        for heading_text in caps_headings:
            if len(heading_text.split()) >= 2:  # At least 2 words
                headings.append({
                    'text': heading_text.strip(),
                    'level': 1,
                    'type': 'caps'
                })
        
        return headings
    
    def _extract_sections(self, text: str, headings: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Extract document sections based on headings"""
        
        if not headings:
            return [{'title': 'Document Content', 'content': text[:500] + '...' if len(text) > 500 else text}]
        
        sections = []
        lines = text.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            
            # Check if this line is a heading
            is_heading = False
            for heading in headings:
                if heading['text'] in line:
                    # Finish previous section
                    if current_section:
                        sections.append(current_section)
                    
                    # Start new section
                    current_section = {
                        'title': heading['text'],
                        'level': heading['level'],
                        'content': ''
                    }
                    is_heading = True
                    break
            
            if not is_heading and current_section:
                current_section['content'] += line + ' '
        
        # Add final section
        if current_section:
            sections.append(current_section)
        
        # Trim content
        for section in sections:
            content = section['content'].strip()
            if len(content) > 300:
                section['content'] = content[:297] + '...'
            else:
                section['content'] = content
        
        return sections
    
    def _detect_tables(self, text: str) -> List[Dict[str, Any]]:
        """Detect table-like structures in text"""
        
        tables = []
        
        # Look for pipe-separated tables (Markdown style)
        lines = text.split('\n')
        in_table = False
        current_table = []
        
        for line in lines:
            line = line.strip()
            
            # Check if line looks like a table row
            if '|' in line and line.count('|') >= 2:
                if not in_table:
                    in_table = True
                    current_table = []
                
                # Parse row
                cells = [cell.strip() for cell in line.split('|') if cell.strip()]
                if cells:
                    current_table.append(cells)
            
            else:
                if in_table and current_table:
                    # End of table
                    tables.append({
                        'rows': len(current_table),
                        'columns': len(current_table[0]) if current_table else 0,
                        'preview': current_table[:2]  # First 2 rows
                    })
                    current_table = []
                in_table = False
        
        # Add final table if exists
        if in_table and current_table:
            tables.append({
                'rows': len(current_table),
                'columns': len(current_table[0]) if current_table else 0,
                'preview': current_table[:2]
            })
        
        # Also detect tab/space-separated tables
        tab_separated_lines = [line for line in lines if '\t' in line or '  ' in line]
        if len(tab_separated_lines) >= 3:  # Likely a table
            tables.append({
                'rows': len(tab_separated_lines),
                'columns': 'variable',
                'type': 'space_separated'
            })
        
        return tables
    
    def _extract_links(self, text: str) -> List[Dict[str, str]]:
        """Extract links from text"""
        
        links = []
        
        # URLs
        url_pattern = r'https?://[^\s<>"{}|\\^`[\]]+[^\s<>"{}|\\^`[\].,;:!?]'
        urls = re.findall(url_pattern, text)
        for url in urls[:10]:  # Limit to first 10
            links.append({
                'type': 'url',
                'target': url
            })
        
        # Markdown links
        markdown_links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', text)
        for link_text, link_url in markdown_links[:10]:
            links.append({
                'type': 'markdown',
                'text': link_text,
                'target': link_url
            })
        
        return links
    
    def _detect_image_references(self, text: str) -> List[Dict[str, str]]:
        """Detect image references in text"""
        
        images = []
        
        # Markdown images
        markdown_images = re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', text)
        for alt_text, image_url in markdown_images:
            images.append({
                'type': 'markdown',
                'alt_text': alt_text,
                'source': image_url
            })
        
        # HTML images
        html_images = re.findall(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', text)
        for image_src in html_images:
            images.append({
                'type': 'html',
                'source': image_src
            })
        
        # References to figures/diagrams
        figure_refs = re.findall(r'(Figure|Fig\.|Diagram|Chart|Image)\s+\d+', text, re.IGNORECASE)
        for figure_ref in figure_refs:
            images.append({
                'type': 'reference',
                'reference': figure_ref
            })
        
        return images
    
    async def _extract_insights(self, text: str) -> DocumentInsights:
        """Extract content insights from text"""
        
        insights = DocumentInsights()
        
        try:
            # Language detection (simple heuristic)
            insights.language = self._detect_language(text)
            
            # Extract keywords
            insights.keywords = self._extract_keywords(text)
            
            # Document type classification
            insights.document_type = self._classify_document_type(text)
            
            # Readability analysis
            insights.readability_score = self._calculate_readability(text)
            
            # Formality analysis
            insights.formality_level = self._analyze_formality(text)
            
            # Sentiment analysis (basic)
            insights.sentiment = self._analyze_sentiment(text)
            
            # Extract key topics
            insights.key_topics = self._extract_key_topics(text, insights.keywords)
            
            # Named entity extraction (if NLP available)
            if self.nlp_available:
                insights.entities = await self._extract_entities_nlp(text)
            else:
                insights.entities = self._extract_entities_basic(text)
            
        except Exception as e:
            logger.warning(f"Insight extraction failed: {e}")
        
        return insights
    
    def _detect_language(self, text: str) -> str:
        """Simple language detection"""
        
        # Very basic language detection based on common words
        english_words = ['the', 'and', 'to', 'of', 'a', 'in', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'i']
        
        word_counts = Counter(text.lower().split())
        english_count = sum(word_counts.get(word, 0) for word in english_words)
        
        total_words = sum(word_counts.values())
        if total_words == 0:
            return 'unknown'
        
        english_ratio = english_count / total_words
        
        if english_ratio > 0.1:  # Threshold for English
            return 'en'
        else:
            return 'unknown'
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text"""
        
        # Simple keyword extraction
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        
        # Remove common stop words
        stop_words = {
            'this', 'that', 'with', 'have', 'will', 'from', 'they', 'know', 'want', 'been', 
            'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like',
            'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'work'
        }
        
        words = [word for word in words if word not in stop_words]
        
        # Count frequencies
        word_counts = Counter(words)
        
        # Return top keywords
        return [word for word, count in word_counts.most_common(10)]
    
    def _classify_document_type(self, text: str) -> str:
        """Classify document type based on content"""
        
        text_lower = text.lower()
        
        # Legal document indicators
        legal_score = 0
        for pattern_list in self.legal_patterns.values():
            for pattern in pattern_list:
                legal_score += len(re.findall(pattern, text_lower, re.IGNORECASE))
        
        if legal_score > 5:
            return 'legal'
        
        # Academic paper indicators
        academic_indicators = ['abstract', 'introduction', 'methodology', 'conclusion', 'references', 'bibliography']
        academic_score = sum(1 for indicator in academic_indicators if indicator in text_lower)
        
        if academic_score >= 3:
            return 'academic'
        
        # Technical documentation
        tech_indicators = ['function', 'parameter', 'example', 'usage', 'implementation', 'algorithm']
        tech_score = sum(1 for indicator in tech_indicators if indicator in text_lower)
        
        if tech_score >= 3:
            return 'technical'
        
        # Business document
        business_indicators = ['company', 'business', 'revenue', 'profit', 'market', 'customer']
        business_score = sum(1 for indicator in business_indicators if indicator in text_lower)
        
        if business_score >= 3:
            return 'business'
        
        return 'general'
    
    def _calculate_readability(self, text: str) -> float:
        """Calculate simple readability score"""
        
        sentences = len(re.findall(r'[.!?]+', text))
        words = len(text.split())
        
        if sentences == 0 or words == 0:
            return 0.0
        
        # Simple average sentence length
        avg_sentence_length = words / sentences
        
        # Readability score (inverse relationship - shorter sentences = higher readability)
        # Normalize to 0-1 scale
        score = max(0.0, min(1.0, (30 - avg_sentence_length) / 30))
        
        return score
    
    def _analyze_formality(self, text: str) -> str:
        """Analyze formality level of text"""
        
        formal_indicators = ['therefore', 'however', 'furthermore', 'nevertheless', 'consequently', 'regarding', 'concerning']
        informal_indicators = ["don't", "can't", "won't", "it's", "that's", 'yeah', 'okay', 'stuff', 'things']
        
        text_lower = text.lower()
        
        formal_count = sum(1 for indicator in formal_indicators if indicator in text_lower)
        informal_count = sum(1 for indicator in informal_indicators if indicator in text_lower)
        
        if formal_count > informal_count * 1.5:
            return 'formal'
        elif informal_count > formal_count * 1.5:
            return 'informal'
        else:
            return 'neutral'
    
    def _analyze_sentiment(self, text: str) -> str:
        """Basic sentiment analysis"""
        
        positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive', 'success', 'beneficial']
        negative_words = ['bad', 'terrible', 'awful', 'horrible', 'negative', 'problem', 'issue', 'failure', 'difficult']
        
        text_lower = text.lower()
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count * 1.2:
            return 'positive'
        elif negative_count > positive_count * 1.2:
            return 'negative'
        else:
            return 'neutral'
    
    def _extract_key_topics(self, text: str, keywords: List[str]) -> List[str]:
        """Extract key topics from keywords and context"""
        
        # Group related keywords into topics
        topics = []
        
        # Technology-related topics
        tech_keywords = [kw for kw in keywords if any(tech in kw for tech in ['tech', 'computer', 'software', 'system', 'data', 'algorithm'])]
        if tech_keywords:
            topics.append('Technology')
        
        # Business-related topics
        business_keywords = [kw for kw in keywords if any(biz in kw for biz in ['business', 'company', 'market', 'sales', 'revenue'])]
        if business_keywords:
            topics.append('Business')
        
        # Legal-related topics
        legal_keywords = [kw for kw in keywords if any(legal in kw for legal in ['legal', 'contract', 'agreement', 'clause', 'liability'])]
        if legal_keywords:
            topics.append('Legal')
        
        # If no specific topics found, use most common keywords as topics
        if not topics:
            topics = keywords[:3]
        
        return topics
    
    def _extract_entities_basic(self, text: str) -> List[Dict[str, str]]:
        """Basic named entity extraction without NLP libraries"""
        
        entities = []
        
        # Extract organizations (simple patterns)
        org_patterns = [
            r'\b[A-Z][a-z]+ (?:Inc\.|LLC|Corp\.|Company|Corporation)\b',
            r'\b[A-Z][A-Z]+ [A-Z][a-z]+\b'  # Acronyms followed by words
        ]
        
        for pattern in org_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                entities.append({
                    'text': match,
                    'type': 'organization'
                })
        
        # Extract dates (simple patterns)
        date_patterns = [
            r'\b\d{1,2}/\d{1,2}/\d{4}\b',
            r'\b\d{4}-\d{2}-\d{2}\b',
            r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b'
        ]
        
        for pattern in date_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                entities.append({
                    'text': match,
                    'type': 'date'
                })
        
        # Extract monetary amounts
        money_pattern = r'\$[\d,]+(?:\.\d{2})?'
        money_matches = re.findall(money_pattern, text)
        for match in money_matches:
            entities.append({
                'text': match,
                'type': 'money'
            })
        
        return entities[:20]  # Limit to first 20 entities
    
    async def _extract_entities_nlp(self, text: str) -> List[Dict[str, str]]:
        """Extract entities using NLP library"""
        
        if not self.nlp_available:
            return self._extract_entities_basic(text)
        
        try:
            import spacy
            
            # Load model if not already loaded
            if self.nlp_model is None:
                try:
                    self.nlp_model = spacy.load('en_core_web_sm')
                except OSError:
                    logger.warning("spaCy English model not found, falling back to basic extraction")
                    return self._extract_entities_basic(text)
            
            # Process text (limit length to avoid memory issues)
            doc = self.nlp_model(text[:10000])
            
            entities = []
            for ent in doc.ents:
                entities.append({
                    'text': ent.text,
                    'type': ent.label_.lower(),
                    'start': ent.start_char,
                    'end': ent.end_char
                })
            
            return entities[:20]  # Limit to first 20 entities
            
        except Exception as e:
            logger.warning(f"NLP entity extraction failed: {e}")
            return self._extract_entities_basic(text)
    
    def _generate_document_description(
        self,
        structure: DocumentStructure,
        insights: DocumentInsights,
        text: str
    ) -> str:
        """Generate human-readable description of document"""
        
        description_parts = []
        
        # Document type and length
        doc_type = insights.document_type or 'document'
        if structure.page_count > 1:
            description_parts.append(f"{doc_type.title()} ({structure.page_count} pages, {structure.word_count} words)")
        else:
            description_parts.append(f"{doc_type.title()} ({structure.word_count} words)")
        
        # Structure information
        structure_info = []
        if structure.headings:
            structure_info.append(f"{len(structure.headings)} headings")
        if structure.tables:
            structure_info.append(f"{len(structure.tables)} tables")
        if structure.links:
            structure_info.append(f"{len(structure.links)} links")
        
        if structure_info:
            description_parts.append(f"with {', '.join(structure_info)}")
        
        # Key topics
        if insights.key_topics:
            topics_str = ', '.join(insights.key_topics[:3])
            description_parts.append(f"covering topics: {topics_str}")
        
        # Language and formality
        lang_info = []
        if insights.language and insights.language != 'unknown':
            lang_info.append(insights.language.upper())
        if insights.formality_level and insights.formality_level != 'neutral':
            lang_info.append(f"{insights.formality_level} tone")
        
        if lang_info:
            description_parts.append(f"({', '.join(lang_info)})")
        
        # Readability
        if insights.readability_score:
            if insights.readability_score > 0.7:
                description_parts.append("with high readability")
            elif insights.readability_score < 0.3:
                description_parts.append("with complex language")
        
        return " ".join(description_parts)


# Global document analyzer instance
_global_analyzer: Optional[DocumentAnalyzer] = None

def get_document_analyzer() -> DocumentAnalyzer:
    """Get the global document analyzer"""
    global _global_analyzer
    if _global_analyzer is None:
        _global_analyzer = DocumentAnalyzer()
    return _global_analyzer

async def analyze_document_structure(content: Union[bytes, str]) -> DocumentStructure:
    """Analyze document structure"""
    analyzer = get_document_analyzer()
    result = await analyzer.analyze_document(content)
    return DocumentStructure(**result.get('analysis', {}).get('structure', {}))

async def extract_document_insights(content: Union[bytes, str]) -> DocumentInsights:
    """Extract document insights"""
    analyzer = get_document_analyzer()
    result = await analyzer.analyze_document(content)
    return DocumentInsights(**result.get('analysis', {}).get('insights', {}))