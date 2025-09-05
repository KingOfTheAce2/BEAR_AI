"""
Image Processing and Analysis
Handle image content, OCR, object detection, and description
"""

import asyncio
import base64
import io
import logging
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

logger = logging.getLogger(__name__)


@dataclass
class OCRResult:
    """Result from OCR processing"""
    text: str
    confidence: float
    bounding_boxes: List[Dict[str, Any]] = field(default_factory=list)
    language: Optional[str] = None
    
    def get_text_blocks(self) -> List[Dict[str, Any]]:
        """Get structured text blocks with positions"""
        return self.bounding_boxes


@dataclass
class ImageAnalysis:
    """Result from image analysis"""
    description: str
    objects: List[Dict[str, Any]] = field(default_factory=list)
    faces: List[Dict[str, Any]] = field(default_factory=list)
    text: str = ""
    colors: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    confidence: float = 0.0
    
    # Technical details
    dimensions: Optional[Tuple[int, int]] = None
    format: Optional[str] = None
    file_size: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'description': self.description,
            'objects_count': len(self.objects),
            'faces_count': len(self.faces),
            'text': self.text,
            'colors': self.colors[:5],  # Limit colors
            'tags': self.tags,
            'confidence': self.confidence,
            'dimensions': self.dimensions,
            'format': self.format,
            'file_size': self.file_size
        }


class ImageProcessor:
    """Process and analyze images"""
    
    def __init__(self):
        self.ocr_available = False
        self.vision_available = False
        
        # Try to initialize OCR
        try:
            import pytesseract
            self.ocr_available = True
            logger.info("Tesseract OCR available")
        except ImportError:
            logger.info("Tesseract OCR not available")
        
        # Try to initialize computer vision
        try:
            import cv2
            self.vision_available = True
            logger.info("OpenCV available for computer vision")
        except ImportError:
            logger.info("OpenCV not available")
        
        logger.info("ImageProcessor initialized")
    
    async def analyze_image(
        self,
        content: Union[bytes, Path],
        file_path: Optional[Path] = None
    ) -> Dict[str, Any]:
        """Analyze image content comprehensively"""
        
        try:
            # Load image
            image_data, image_obj = await self._load_image(content, file_path)
            
            if image_obj is None:
                return {
                    'text': '',
                    'description': 'Failed to load image',
                    'analysis': {'error': 'Could not load image'}
                }
            
            # Perform OCR
            ocr_result = await self._extract_text_ocr(image_obj)
            
            # Perform visual analysis
            visual_analysis = await self._analyze_visual_content(image_obj, image_data)
            
            # Generate description
            description = await self._generate_description(visual_analysis, ocr_result)
            
            # Combine results
            analysis = ImageAnalysis(
                description=description,
                objects=visual_analysis.get('objects', []),
                faces=visual_analysis.get('faces', []),
                text=ocr_result.text if ocr_result else '',
                colors=visual_analysis.get('colors', []),
                tags=visual_analysis.get('tags', []),
                confidence=visual_analysis.get('confidence', 0.0),
                dimensions=visual_analysis.get('dimensions'),
                format=visual_analysis.get('format'),
                file_size=len(image_data) if isinstance(image_data, bytes) else None
            )
            
            return {
                'text': analysis.text,
                'description': analysis.description,
                'analysis': analysis.to_dict()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing image: {e}")
            return {
                'text': '',
                'description': f'Error analyzing image: {e}',
                'analysis': {'error': str(e)}
            }
    
    async def _load_image(
        self,
        content: Union[bytes, Path],
        file_path: Optional[Path] = None
    ) -> Tuple[Union[bytes, Path], Optional[Any]]:
        """Load image from various sources"""
        
        try:
            from PIL import Image
            
            if isinstance(content, bytes):
                image_obj = Image.open(io.BytesIO(content))
                return content, image_obj
            
            elif isinstance(content, Path) or file_path:
                path = content if isinstance(content, Path) else file_path
                image_obj = Image.open(path)
                return path, image_obj
            
            else:
                return content, None
                
        except ImportError:
            logger.warning("PIL not available for image processing")
            return content, None
        except Exception as e:
            logger.error(f"Error loading image: {e}")
            return content, None
    
    async def _extract_text_ocr(self, image_obj: Any) -> Optional[OCRResult]:
        """Extract text using OCR"""
        
        if not self.ocr_available or not image_obj:
            return None
        
        try:
            import pytesseract
            from PIL import Image
            
            # Convert to RGB if needed
            if image_obj.mode != 'RGB':
                image_obj = image_obj.convert('RGB')
            
            # Extract text with confidence
            ocr_data = pytesseract.image_to_data(
                image_obj, 
                output_type=pytesseract.Output.DICT
            )
            
            # Filter out low-confidence results
            confidences = [int(conf) for conf in ocr_data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # Extract text blocks
            text_blocks = []
            texts = []
            
            for i, conf in enumerate(ocr_data['conf']):
                if int(conf) > 30:  # Confidence threshold
                    text = ocr_data['text'][i].strip()
                    if text:
                        texts.append(text)
                        text_blocks.append({
                            'text': text,
                            'confidence': int(conf),
                            'bbox': {
                                'x': ocr_data['left'][i],
                                'y': ocr_data['top'][i],
                                'width': ocr_data['width'][i],
                                'height': ocr_data['height'][i]
                            }
                        })
            
            full_text = ' '.join(texts)
            
            return OCRResult(
                text=full_text,
                confidence=avg_confidence / 100.0,  # Normalize to 0-1
                bounding_boxes=text_blocks
            )
            
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
            return None
    
    async def _analyze_visual_content(
        self,
        image_obj: Any,
        image_data: Union[bytes, Path]
    ) -> Dict[str, Any]:
        """Analyze visual content of image"""
        
        analysis = {
            'objects': [],
            'faces': [],
            'colors': [],
            'tags': [],
            'confidence': 0.0
        }
        
        try:
            # Get basic image info
            if hasattr(image_obj, 'size'):
                analysis['dimensions'] = image_obj.size
            if hasattr(image_obj, 'format'):
                analysis['format'] = image_obj.format
            
            # Analyze colors
            colors = await self._analyze_colors(image_obj)
            analysis['colors'] = colors
            
            # Detect faces (basic)
            if self.vision_available:
                faces = await self._detect_faces(image_obj)
                analysis['faces'] = faces
            
            # Generate tags based on available analysis
            tags = await self._generate_tags(analysis)
            analysis['tags'] = tags
            
            # Estimate confidence based on available analysis
            confidence = 0.5  # Base confidence
            if analysis['colors']:
                confidence += 0.2
            if analysis['faces']:
                confidence += 0.2
            if tags:
                confidence += 0.1
            
            analysis['confidence'] = min(confidence, 1.0)
            
        except Exception as e:
            logger.error(f"Error in visual analysis: {e}")
            analysis['error'] = str(e)
        
        return analysis
    
    async def _analyze_colors(self, image_obj: Any) -> List[str]:
        """Analyze dominant colors in image"""
        
        try:
            from PIL import Image
            import colorsys
            
            # Resize for faster processing
            small_image = image_obj.resize((100, 100))
            
            # Convert to RGB
            rgb_image = small_image.convert('RGB')
            
            # Get pixel data
            pixels = list(rgb_image.getdata())
            
            # Count color frequencies
            color_counts = {}
            for r, g, b in pixels:
                # Group similar colors
                r_group = (r // 32) * 32
                g_group = (g // 32) * 32
                b_group = (b // 32) * 32
                
                color_key = (r_group, g_group, b_group)
                color_counts[color_key] = color_counts.get(color_key, 0) + 1
            
            # Get top colors
            top_colors = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            
            # Convert to color names/descriptions
            color_names = []
            for (r, g, b), count in top_colors:
                # Convert to HSV for better color naming
                h, s, v = colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)
                color_name = self._rgb_to_color_name(r, g, b, h, s, v)
                color_names.append(color_name)
            
            return color_names
            
        except Exception as e:
            logger.debug(f"Color analysis failed: {e}")
            return []
    
    def _rgb_to_color_name(self, r: int, g: int, b: int, h: float, s: float, v: float) -> str:
        """Convert RGB values to approximate color name"""
        
        # Simple color naming based on HSV
        if v < 0.3:
            return "dark"
        elif v > 0.9 and s < 0.1:
            return "white"
        elif s < 0.1:
            return "gray"
        
        # Hue-based color names
        if h < 0.05 or h > 0.95:
            return "red"
        elif h < 0.15:
            return "orange"
        elif h < 0.25:
            return "yellow"
        elif h < 0.45:
            return "green"
        elif h < 0.65:
            return "blue"
        elif h < 0.8:
            return "purple"
        else:
            return "pink"
    
    async def _detect_faces(self, image_obj: Any) -> List[Dict[str, Any]]:
        """Detect faces in image"""
        
        if not self.vision_available:
            return []
        
        try:
            import cv2
            import numpy as np
            from PIL import Image
            
            # Convert PIL to OpenCV format
            opencv_image = cv2.cvtColor(np.array(image_obj), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
            
            # Use Haar cascade for face detection
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            
            face_list = []
            for (x, y, w, h) in faces:
                face_list.append({
                    'bbox': {
                        'x': int(x),
                        'y': int(y),
                        'width': int(w),
                        'height': int(h)
                    },
                    'confidence': 0.8  # Haar cascades don't provide confidence
                })
            
            return face_list
            
        except Exception as e:
            logger.debug(f"Face detection failed: {e}")
            return []
    
    async def _generate_tags(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate descriptive tags based on analysis"""
        
        tags = []
        
        # Add color tags
        if analysis.get('colors'):
            tags.extend([f"{color}_colored" for color in analysis['colors'][:3]])
        
        # Add face tags
        if analysis.get('faces'):
            face_count = len(analysis['faces'])
            if face_count == 1:
                tags.append("portrait")
            elif face_count > 1:
                tags.append("group_photo")
            tags.append("people")
        
        # Add dimension tags
        if analysis.get('dimensions'):
            width, height = analysis['dimensions']
            if width > height:
                tags.append("landscape")
            elif height > width:
                tags.append("portrait_orientation")
            else:
                tags.append("square")
        
        # Add format tags
        if analysis.get('format'):
            tags.append(f"format_{analysis['format'].lower()}")
        
        return tags
    
    async def _generate_description(
        self,
        visual_analysis: Dict[str, Any],
        ocr_result: Optional[OCRResult]
    ) -> str:
        """Generate human-readable description"""
        
        description_parts = []
        
        # Describe dimensions
        if visual_analysis.get('dimensions'):
            width, height = visual_analysis['dimensions']
            description_parts.append(f"Image ({width}×{height} pixels)")
        else:
            description_parts.append("Image")
        
        # Describe faces
        faces = visual_analysis.get('faces', [])
        if faces:
            if len(faces) == 1:
                description_parts.append("containing 1 person")
            else:
                description_parts.append(f"containing {len(faces)} people")
        
        # Describe colors
        colors = visual_analysis.get('colors', [])
        if colors:
            if len(colors) == 1:
                description_parts.append(f"with predominantly {colors[0]} coloring")
            else:
                description_parts.append(f"with {', '.join(colors[:3])} colors")
        
        # Describe text
        if ocr_result and ocr_result.text.strip():
            text_length = len(ocr_result.text.strip())
            if text_length < 50:
                description_parts.append(f"containing text: '{ocr_result.text.strip()}'")
            else:
                description_parts.append(f"containing {text_length} characters of text")
        
        # Format tags
        tags = visual_analysis.get('tags', [])
        relevant_tags = [tag for tag in tags if not tag.startswith('format_') and not tag.endswith('_colored')]
        if relevant_tags:
            description_parts.append(f"tagged as: {', '.join(relevant_tags[:3])}")
        
        if not description_parts:
            return "Image content"
        
        # Join parts naturally
        if len(description_parts) == 1:
            return description_parts[0]
        elif len(description_parts) == 2:
            return f"{description_parts[0]} {description_parts[1]}"
        else:
            return f"{description_parts[0]} {', '.join(description_parts[1:-1])}, and {description_parts[-1]}"
    
    async def extract_text_from_image(self, content: Union[bytes, Path]) -> str:
        """Extract only text from image"""
        
        result = await self.analyze_image(content)
        return result.get('text', '')
    
    async def describe_image(self, content: Union[bytes, Path]) -> str:
        """Get only description of image"""
        
        result = await self.analyze_image(content)
        return result.get('description', 'Unable to describe image')


# Global image processor instance
_global_processor: Optional[ImageProcessor] = None

def get_image_processor() -> ImageProcessor:
    """Get the global image processor"""
    global _global_processor
    if _global_processor is None:
        _global_processor = ImageProcessor()
    return _global_processor

async def analyze_image(content: Union[bytes, Path]) -> Dict[str, Any]:
    """Analyze an image"""
    processor = get_image_processor()
    return await processor.analyze_image(content)

async def extract_text_from_image(content: Union[bytes, Path]) -> str:
    """Extract text from image using OCR"""
    processor = get_image_processor()
    return await processor.extract_text_from_image(content)

async def describe_image(content: Union[bytes, Path]) -> str:
    """Describe image content"""
    processor = get_image_processor()
    return await processor.describe_image(content)