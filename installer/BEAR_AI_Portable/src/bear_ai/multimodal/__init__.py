"""
BEAR AI Multi-Modal Support
Handle images, audio, documents, and other media types
"""

from .multimodal_processor import (
    MultiModalProcessor,
    MediaType,
    ProcessedMedia,
    MediaMetadata,
    get_multimodal_processor,
    process_media,
    extract_media_content
)

from .image_processor import (
    ImageProcessor,
    ImageAnalysis,
    OCRResult,
    get_image_processor,
    analyze_image,
    extract_text_from_image,
    describe_image
)

from .audio_processor import (
    AudioProcessor,
    AudioTranscription,
    AudioAnalysis,
    get_audio_processor,
    transcribe_audio,
    analyze_audio
)

from .document_analyzer import (
    DocumentAnalyzer,
    DocumentStructure,
    DocumentInsights,
    get_document_analyzer,
    analyze_document_structure,
    extract_document_insights
)

from .vision_models import (
    VisionModel,
    VisionCapability,
    LocalVisionModel,
    get_vision_model,
    describe_visual_content
)

__all__ = [
    'MultiModalProcessor',
    'MediaType',
    'ProcessedMedia',
    'MediaMetadata',
    'get_multimodal_processor',
    'process_media',
    'extract_media_content',
    'ImageProcessor',
    'ImageAnalysis',
    'OCRResult',
    'get_image_processor',
    'analyze_image',
    'extract_text_from_image',
    'describe_image',
    'AudioProcessor',
    'AudioTranscription',
    'AudioAnalysis',
    'get_audio_processor',
    'transcribe_audio',
    'analyze_audio',
    'DocumentAnalyzer',
    'DocumentStructure',
    'DocumentInsights',
    'get_document_analyzer',
    'analyze_document_structure',
    'extract_document_insights',
    'VisionModel',
    'VisionCapability',
    'LocalVisionModel',
    'get_vision_model',
    'describe_visual_content'
]