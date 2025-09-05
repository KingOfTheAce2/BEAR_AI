"""
Multi-Modal Media Processor
Main processor for handling different types of media content
"""

import asyncio
import base64
import logging
import mimetypes
import tempfile
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import uuid

logger = logging.getLogger(__name__)


class MediaType(Enum):
    """Types of media content"""
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"
    TEXT = "text"
    SPREADSHEET = "spreadsheet"
    PRESENTATION = "presentation"
    UNKNOWN = "unknown"


@dataclass
class MediaMetadata:
    """Metadata for media content"""
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    dimensions: Optional[tuple] = None  # (width, height) for images/videos
    duration: Optional[float] = None  # seconds for audio/video
    format: Optional[str] = None
    created_at: Optional[float] = None
    modified_at: Optional[float] = None
    
    # Content metadata
    language: Optional[str] = None
    encoding: Optional[str] = None
    pages: Optional[int] = None  # for documents
    
    # Technical metadata
    bit_rate: Optional[int] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    color_space: Optional[str] = None
    compression: Optional[str] = None


@dataclass
class ProcessedMedia:
    """Processed media content with extracted information"""
    id: str
    media_type: MediaType
    content: Union[str, bytes]
    metadata: MediaMetadata
    
    # Extracted content
    extracted_text: str = ""
    description: str = ""
    analysis: Dict[str, Any] = field(default_factory=dict)
    
    # Processing info
    processing_time: float = 0.0
    processed_at: float = field(default_factory=lambda: __import__('time').time())
    processing_errors: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'id': self.id,
            'media_type': self.media_type.value,
            'metadata': {
                'file_name': self.metadata.file_name,
                'file_size': self.metadata.file_size,
                'mime_type': self.metadata.mime_type,
                'dimensions': self.metadata.dimensions,
                'duration': self.metadata.duration,
                'format': self.metadata.format,
                'language': self.metadata.language,
                'pages': self.metadata.pages
            },
            'extracted_text': self.extracted_text,
            'description': self.description,
            'analysis': self.analysis,
            'processing_time': self.processing_time,
            'processed_at': self.processed_at,
            'processing_errors': self.processing_errors
        }


class MultiModalProcessor:
    """Main processor for handling multi-modal content"""
    
    def __init__(self):
        self.processors = {}
        self._initialize_processors()
        
        # Media type detection
        self.type_mapping = {
            # Images
            'image/jpeg': MediaType.IMAGE,
            'image/jpg': MediaType.IMAGE,
            'image/png': MediaType.IMAGE,
            'image/gif': MediaType.IMAGE,
            'image/bmp': MediaType.IMAGE,
            'image/tiff': MediaType.IMAGE,
            'image/webp': MediaType.IMAGE,
            'image/svg+xml': MediaType.IMAGE,
            
            # Audio
            'audio/mpeg': MediaType.AUDIO,
            'audio/mp3': MediaType.AUDIO,
            'audio/wav': MediaType.AUDIO,
            'audio/flac': MediaType.AUDIO,
            'audio/ogg': MediaType.AUDIO,
            'audio/aac': MediaType.AUDIO,
            'audio/m4a': MediaType.AUDIO,
            'audio/webm': MediaType.AUDIO,
            
            # Video
            'video/mp4': MediaType.VIDEO,
            'video/avi': MediaType.VIDEO,
            'video/mov': MediaType.VIDEO,
            'video/wmv': MediaType.VIDEO,
            'video/flv': MediaType.VIDEO,
            'video/webm': MediaType.VIDEO,
            'video/mkv': MediaType.VIDEO,
            
            # Documents
            'application/pdf': MediaType.DOCUMENT,
            'application/msword': MediaType.DOCUMENT,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': MediaType.DOCUMENT,
            'text/plain': MediaType.TEXT,
            'text/html': MediaType.TEXT,
            'text/markdown': MediaType.TEXT,
            'application/rtf': MediaType.DOCUMENT,
            
            # Spreadsheets
            'application/vnd.ms-excel': MediaType.SPREADSHEET,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': MediaType.SPREADSHEET,
            'text/csv': MediaType.SPREADSHEET,
            
            # Presentations
            'application/vnd.ms-powerpoint': MediaType.PRESENTATION,
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': MediaType.PRESENTATION
        }
        
        logger.info("MultiModalProcessor initialized")
    
    def _initialize_processors(self):
        """Initialize specialized processors"""
        try:
            from .image_processor import ImageProcessor
            self.processors[MediaType.IMAGE] = ImageProcessor()
        except ImportError:
            logger.warning("Image processor not available")
        
        try:
            from .audio_processor import AudioProcessor
            self.processors[MediaType.AUDIO] = AudioProcessor()
        except ImportError:
            logger.warning("Audio processor not available")
        
        try:
            from .document_analyzer import DocumentAnalyzer
            self.processors[MediaType.DOCUMENT] = DocumentAnalyzer()
            self.processors[MediaType.TEXT] = DocumentAnalyzer()
            self.processors[MediaType.SPREADSHEET] = DocumentAnalyzer()
            self.processors[MediaType.PRESENTATION] = DocumentAnalyzer()
        except ImportError:
            logger.warning("Document analyzer not available")
    
    async def process_media(
        self,
        content: Union[str, bytes, Path],
        media_type: Optional[MediaType] = None,
        metadata: Optional[MediaMetadata] = None
    ) -> ProcessedMedia:
        """Process media content and extract information"""
        
        start_time = __import__('time').time()
        media_id = str(uuid.uuid4())
        
        try:
            # Load content and detect type
            file_path = None
            if isinstance(content, (str, Path)):
                file_path = Path(content)
                if file_path.exists():
                    with open(file_path, 'rb') as f:
                        content_bytes = f.read()
                    
                    # Detect MIME type
                    mime_type, _ = mimetypes.guess_type(str(file_path))
                    detected_type = self._detect_media_type(mime_type)
                    
                    # Create metadata
                    if not metadata:
                        metadata = self._extract_file_metadata(file_path, mime_type)
                else:
                    file_path = None
                    content_bytes = content.encode() if isinstance(content, str) else content
                    detected_type = media_type or MediaType.TEXT
            else:
                content_bytes = content
                detected_type = media_type or MediaType.UNKNOWN
            
            media_type = media_type or detected_type
            metadata = metadata or MediaMetadata()
            
            # Create base processed media object
            processed_media = ProcessedMedia(
                id=media_id,
                media_type=media_type,
                content=content_bytes,
                metadata=metadata
            )
            
            # Process with appropriate specialized processor
            if media_type in self.processors:
                try:
                    await self._process_with_specialist(processed_media, content_bytes, file_path)
                except Exception as e:
                    error_msg = f"Specialist processing failed: {e}"
                    processed_media.processing_errors.append(error_msg)
                    logger.warning(error_msg)
            else:
                # Fallback processing
                await self._fallback_processing(processed_media, content_bytes)
            
            processing_time = __import__('time').time() - start_time
            processed_media.processing_time = processing_time
            
            logger.info(f"Processed {media_type.value} media in {processing_time:.2f}s")
            return processed_media
            
        except Exception as e:
            logger.error(f"Error processing media: {e}")
            
            # Return minimal processed media with error
            processing_time = __import__('time').time() - start_time
            return ProcessedMedia(
                id=media_id,
                media_type=media_type or MediaType.UNKNOWN,
                content=b"",
                metadata=metadata or MediaMetadata(),
                processing_time=processing_time,
                processing_errors=[str(e)]
            )
    
    def _detect_media_type(self, mime_type: Optional[str]) -> MediaType:
        """Detect media type from MIME type"""
        if not mime_type:
            return MediaType.UNKNOWN
        
        return self.type_mapping.get(mime_type, MediaType.UNKNOWN)
    
    def _extract_file_metadata(self, file_path: Path, mime_type: Optional[str]) -> MediaMetadata:
        """Extract metadata from file"""
        try:
            stat = file_path.stat()
            
            metadata = MediaMetadata(
                file_name=file_path.name,
                file_size=stat.st_size,
                mime_type=mime_type,
                created_at=stat.st_ctime,
                modified_at=stat.st_mtime
            )
            
            # Extract additional metadata based on file type
            if mime_type and mime_type.startswith('image/'):
                try:
                    from PIL import Image
                    with Image.open(file_path) as img:
                        metadata.dimensions = img.size
                        metadata.format = img.format
                        metadata.color_space = img.mode
                except ImportError:
                    pass
                except Exception as e:
                    logger.debug(f"Could not extract image metadata: {e}")
            
            elif mime_type and mime_type.startswith('audio/'):
                # Placeholder for audio metadata extraction
                # Would use libraries like mutagen or librosa
                pass
            
            return metadata
            
        except Exception as e:
            logger.warning(f"Error extracting file metadata: {e}")
            return MediaMetadata(file_name=file_path.name if file_path else None)
    
    async def _process_with_specialist(
        self,
        processed_media: ProcessedMedia,
        content_bytes: bytes,
        file_path: Optional[Path]
    ):
        """Process with specialized processor"""
        
        processor = self.processors[processed_media.media_type]
        
        if processed_media.media_type == MediaType.IMAGE:
            result = await processor.analyze_image(content_bytes, file_path)
            processed_media.extracted_text = result.get('text', '')
            processed_media.description = result.get('description', '')
            processed_media.analysis = result.get('analysis', {})
            
        elif processed_media.media_type == MediaType.AUDIO:
            result = await processor.transcribe_audio(content_bytes, file_path)
            processed_media.extracted_text = result.get('transcript', '')
            processed_media.description = result.get('description', '')
            processed_media.analysis = result.get('analysis', {})
            
        elif processed_media.media_type in [MediaType.DOCUMENT, MediaType.TEXT, MediaType.SPREADSHEET, MediaType.PRESENTATION]:
            result = await processor.analyze_document(content_bytes, file_path, processed_media.media_type)
            processed_media.extracted_text = result.get('text', '')
            processed_media.description = result.get('description', '')
            processed_media.analysis = result.get('analysis', {})
    
    async def _fallback_processing(self, processed_media: ProcessedMedia, content_bytes: bytes):
        """Fallback processing for unsupported media types"""
        
        if processed_media.media_type == MediaType.TEXT:
            # Try to decode as text
            try:
                text_content = content_bytes.decode('utf-8')
                processed_media.extracted_text = text_content
                processed_media.description = f"Text content ({len(text_content)} characters)"
                processed_media.analysis = {
                    'character_count': len(text_content),
                    'word_count': len(text_content.split()),
                    'line_count': text_content.count('\n') + 1
                }
            except UnicodeDecodeError:
                processed_media.processing_errors.append("Could not decode as UTF-8 text")
        
        else:
            processed_media.description = f"Unsupported media type: {processed_media.media_type.value}"
            processed_media.analysis = {
                'size_bytes': len(content_bytes),
                'supported': False
            }
    
    async def extract_media_content(
        self,
        media: ProcessedMedia,
        content_type: str = "text"
    ) -> str:
        """Extract specific type of content from processed media"""
        
        if content_type == "text":
            return media.extracted_text
        
        elif content_type == "description":
            return media.description
        
        elif content_type == "summary":
            # Create a summary combining text and description
            parts = []
            
            if media.description:
                parts.append(f"Description: {media.description}")
            
            if media.extracted_text:
                # Truncate text if too long
                text = media.extracted_text
                if len(text) > 500:
                    text = text[:497] + "..."
                parts.append(f"Content: {text}")
            
            if media.analysis:
                analysis_summary = self._summarize_analysis(media.analysis)
                if analysis_summary:
                    parts.append(f"Analysis: {analysis_summary}")
            
            return " | ".join(parts) if parts else "No content extracted"
        
        elif content_type == "metadata":
            return self._format_metadata(media.metadata)
        
        else:
            return media.extracted_text  # Default to text
    
    def _summarize_analysis(self, analysis: Dict[str, Any]) -> str:
        """Create a summary of analysis results"""
        summary_parts = []
        
        # Common analysis fields
        if 'confidence' in analysis:
            summary_parts.append(f"confidence: {analysis['confidence']:.2f}")
        
        if 'objects_detected' in analysis:
            summary_parts.append(f"objects: {len(analysis['objects_detected'])}")
        
        if 'faces_detected' in analysis:
            summary_parts.append(f"faces: {analysis['faces_detected']}")
        
        if 'text_blocks' in analysis:
            summary_parts.append(f"text blocks: {len(analysis['text_blocks'])}")
        
        if 'language' in analysis:
            summary_parts.append(f"language: {analysis['language']}")
        
        if 'duration' in analysis:
            summary_parts.append(f"duration: {analysis['duration']:.1f}s")
        
        if 'pages' in analysis:
            summary_parts.append(f"pages: {analysis['pages']}")
        
        return ", ".join(summary_parts)
    
    def _format_metadata(self, metadata: MediaMetadata) -> str:
        """Format metadata as readable string"""
        parts = []
        
        if metadata.file_name:
            parts.append(f"File: {metadata.file_name}")
        
        if metadata.file_size:
            size_mb = metadata.file_size / (1024 * 1024)
            parts.append(f"Size: {size_mb:.1f} MB")
        
        if metadata.dimensions:
            parts.append(f"Dimensions: {metadata.dimensions[0]}x{metadata.dimensions[1]}")
        
        if metadata.duration:
            parts.append(f"Duration: {metadata.duration:.1f}s")
        
        if metadata.pages:
            parts.append(f"Pages: {metadata.pages}")
        
        if metadata.language:
            parts.append(f"Language: {metadata.language}")
        
        return " | ".join(parts) if parts else "No metadata available"
    
    def get_supported_types(self) -> List[MediaType]:
        """Get list of supported media types"""
        return list(self.processors.keys())
    
    def is_type_supported(self, media_type: MediaType) -> bool:
        """Check if media type is supported"""
        return media_type in self.processors


# Global multimodal processor instance
_global_processor: Optional[MultiModalProcessor] = None

def get_multimodal_processor() -> MultiModalProcessor:
    """Get the global multimodal processor"""
    global _global_processor
    if _global_processor is None:
        _global_processor = MultiModalProcessor()
    return _global_processor

async def process_media(
    content: Union[str, bytes, Path],
    media_type: Optional[MediaType] = None,
    metadata: Optional[MediaMetadata] = None
) -> ProcessedMedia:
    """Process media content"""
    processor = get_multimodal_processor()
    return await processor.process_media(content, media_type, metadata)

async def extract_media_content(
    media: ProcessedMedia,
    content_type: str = "text"
) -> str:
    """Extract content from processed media"""
    processor = get_multimodal_processor()
    return await processor.extract_media_content(media, content_type)