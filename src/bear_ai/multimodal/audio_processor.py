"""
Audio Processing and Analysis
Handle audio content, transcription, and analysis
"""

import asyncio
import logging
import tempfile
import wave
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)


@dataclass
class AudioTranscription:
    """Result from audio transcription"""
    text: str
    confidence: float
    language: Optional[str] = None
    segments: List[Dict[str, Any]] = field(default_factory=list)
    duration: Optional[float] = None
    
    def get_segments_with_timestamps(self) -> List[Dict[str, Any]]:
        """Get transcription segments with timestamps"""
        return self.segments


@dataclass
class AudioAnalysis:
    """Result from audio analysis"""
    transcript: str
    duration: float
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    format: Optional[str] = None
    
    # Content analysis
    language: Optional[str] = None
    confidence: float = 0.0
    speech_rate: Optional[float] = None  # words per minute
    silence_ratio: Optional[float] = None
    
    # Audio properties
    volume_stats: Dict[str, float] = field(default_factory=dict)
    frequency_analysis: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'transcript': self.transcript,
            'duration': self.duration,
            'sample_rate': self.sample_rate,
            'channels': self.channels,
            'format': self.format,
            'language': self.language,
            'confidence': self.confidence,
            'speech_rate': self.speech_rate,
            'silence_ratio': self.silence_ratio,
            'volume_stats': self.volume_stats,
            'frequency_analysis': self.frequency_analysis
        }


class AudioProcessor:
    """Process and analyze audio content"""
    
    def __init__(self):
        self.whisper_available = False
        self.audio_processing_available = False
        
        # Try to initialize Whisper for transcription
        try:
            import whisper
            self.whisper_model = None  # Load on demand
            self.whisper_available = True
            logger.info("Whisper available for audio transcription")
        except ImportError:
            logger.info("Whisper not available for audio transcription")
        
        # Try to initialize audio processing libraries
        try:
            import librosa
            self.audio_processing_available = True
            logger.info("Librosa available for audio analysis")
        except ImportError:
            logger.info("Librosa not available for audio analysis")
        
        logger.info("AudioProcessor initialized")
    
    async def transcribe_audio(
        self,
        content: Union[bytes, Path],
        file_path: Optional[Path] = None
    ) -> Dict[str, Any]:
        """Transcribe audio content to text"""
        
        try:
            # Ensure we have a file path for processing
            temp_file = None
            if isinstance(content, bytes):
                temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
                temp_file.write(content)
                temp_file.close()
                audio_path = Path(temp_file.name)
            else:
                audio_path = content if isinstance(content, Path) else file_path
            
            if not audio_path or not audio_path.exists():
                return {
                    'transcript': '',
                    'description': 'Audio file not found',
                    'analysis': {'error': 'File not accessible'}
                }
            
            # Perform transcription
            transcription = await self._transcribe_with_whisper(audio_path)
            
            # Perform audio analysis
            audio_analysis = await self._analyze_audio_properties(audio_path)
            
            # Combine results
            analysis_result = AudioAnalysis(
                transcript=transcription.text if transcription else '',
                duration=audio_analysis.get('duration', 0.0),
                sample_rate=audio_analysis.get('sample_rate'),
                channels=audio_analysis.get('channels'),
                format=audio_analysis.get('format'),
                language=transcription.language if transcription else None,
                confidence=transcription.confidence if transcription else 0.0,
                speech_rate=audio_analysis.get('speech_rate'),
                silence_ratio=audio_analysis.get('silence_ratio'),
                volume_stats=audio_analysis.get('volume_stats', {}),
                frequency_analysis=audio_analysis.get('frequency_analysis', {})
            )
            
            # Generate description
            description = self._generate_audio_description(analysis_result)
            
            # Cleanup temp file
            if temp_file:
                try:
                    Path(temp_file.name).unlink()
                except:
                    pass
            
            return {
                'transcript': analysis_result.transcript,
                'description': description,
                'analysis': analysis_result.to_dict()
            }
            
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            return {
                'transcript': '',
                'description': f'Error processing audio: {e}',
                'analysis': {'error': str(e)}
            }
    
    async def _transcribe_with_whisper(self, audio_path: Path) -> Optional[AudioTranscription]:
        """Transcribe audio using Whisper"""
        
        if not self.whisper_available:
            return None
        
        try:
            import whisper
            
            # Load model if not already loaded
            if self.whisper_model is None:
                logger.info("Loading Whisper model...")
                self.whisper_model = whisper.load_model("base")  # Use base model for balance of speed/accuracy
            
            # Transcribe
            result = self.whisper_model.transcribe(
                str(audio_path),
                verbose=False,
                language=None  # Auto-detect language
            )
            
            # Extract segments
            segments = []
            if 'segments' in result:
                for segment in result['segments']:
                    segments.append({
                        'start': segment.get('start', 0.0),
                        'end': segment.get('end', 0.0),
                        'text': segment.get('text', '').strip(),
                        'confidence': segment.get('avg_logprob', 0.0)
                    })
            
            # Calculate average confidence
            if segments:
                avg_confidence = sum(seg['confidence'] for seg in segments) / len(segments)
                # Convert log probability to confidence (rough approximation)
                avg_confidence = max(0.0, min(1.0, (avg_confidence + 1.0) / 2.0))
            else:
                avg_confidence = 0.5
            
            return AudioTranscription(
                text=result['text'].strip(),
                confidence=avg_confidence,
                language=result.get('language'),
                segments=segments,
                duration=result.get('duration')
            )
            
        except Exception as e:
            logger.warning(f"Whisper transcription failed: {e}")
            return None
    
    async def _analyze_audio_properties(self, audio_path: Path) -> Dict[str, Any]:
        """Analyze audio properties"""
        
        analysis = {
            'duration': 0.0,
            'sample_rate': None,
            'channels': None,
            'format': None
        }
        
        try:
            # Try basic audio info first
            analysis.update(await self._get_basic_audio_info(audio_path))
            
            # Advanced analysis if librosa is available
            if self.audio_processing_available:
                advanced_analysis = await self._advanced_audio_analysis(audio_path)
                analysis.update(advanced_analysis)
            
        except Exception as e:
            logger.warning(f"Audio analysis failed: {e}")
            analysis['error'] = str(e)
        
        return analysis
    
    async def _get_basic_audio_info(self, audio_path: Path) -> Dict[str, Any]:
        """Get basic audio file information"""
        
        info = {}
        
        try:
            # Try with wave module for WAV files
            if audio_path.suffix.lower() == '.wav':
                with wave.open(str(audio_path), 'rb') as wav_file:
                    info.update({
                        'sample_rate': wav_file.getframerate(),
                        'channels': wav_file.getnchannels(),
                        'duration': wav_file.getnframes() / wav_file.getframerate(),
                        'format': 'WAV'
                    })
            
            # Try with other libraries if available
            else:
                try:
                    import mutagen
                    audio_file = mutagen.File(audio_path)
                    if audio_file:
                        info.update({
                            'duration': audio_file.info.length,
                            'sample_rate': getattr(audio_file.info, 'sample_rate', None),
                            'channels': getattr(audio_file.info, 'channels', None),
                            'format': audio_file.mime[0].split('/')[-1].upper() if audio_file.mime else None
                        })
                except ImportError:
                    logger.debug("Mutagen not available for audio metadata")
                
        except Exception as e:
            logger.debug(f"Basic audio analysis failed: {e}")
        
        return info
    
    async def _advanced_audio_analysis(self, audio_path: Path) -> Dict[str, Any]:
        """Perform advanced audio analysis with librosa"""
        
        if not self.audio_processing_available:
            return {}
        
        try:
            import librosa
            import numpy as np
            
            # Load audio
            y, sr = librosa.load(str(audio_path))
            
            analysis = {}
            
            # Basic properties
            duration = len(y) / sr
            analysis['duration'] = duration
            analysis['sample_rate'] = sr
            
            # Volume analysis
            rms = librosa.feature.rms(y=y)[0]
            analysis['volume_stats'] = {
                'mean_rms': float(np.mean(rms)),
                'max_rms': float(np.max(rms)),
                'min_rms': float(np.min(rms)),
                'std_rms': float(np.std(rms))
            }
            
            # Silence detection
            silent_frames = np.sum(rms < np.mean(rms) * 0.1)
            analysis['silence_ratio'] = float(silent_frames / len(rms))
            
            # Spectral analysis
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
            
            analysis['frequency_analysis'] = {
                'mean_spectral_centroid': float(np.mean(spectral_centroids)),
                'mean_spectral_rolloff': float(np.mean(spectral_rolloff)),
                'spectral_bandwidth': float(np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]))
            }
            
            # Tempo analysis
            try:
                tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
                analysis['tempo'] = float(tempo)
                analysis['beat_count'] = len(beats)
            except:
                analysis['tempo'] = None
            
            return analysis
            
        except Exception as e:
            logger.debug(f"Advanced audio analysis failed: {e}")
            return {}
    
    def _generate_audio_description(self, analysis: AudioAnalysis) -> str:
        """Generate human-readable description of audio"""
        
        description_parts = []
        
        # Basic info
        if analysis.duration:
            minutes = int(analysis.duration // 60)
            seconds = int(analysis.duration % 60)
            if minutes > 0:
                description_parts.append(f"Audio file ({minutes}m {seconds}s)")
            else:
                description_parts.append(f"Audio file ({seconds}s)")
        else:
            description_parts.append("Audio file")
        
        # Audio quality info
        quality_parts = []
        if analysis.sample_rate:
            quality_parts.append(f"{analysis.sample_rate}Hz")
        if analysis.channels:
            if analysis.channels == 1:
                quality_parts.append("mono")
            elif analysis.channels == 2:
                quality_parts.append("stereo")
            else:
                quality_parts.append(f"{analysis.channels}-channel")
        
        if quality_parts:
            description_parts.append(f"({', '.join(quality_parts)})")
        
        # Content description
        if analysis.transcript:
            word_count = len(analysis.transcript.split())
            if word_count > 0:
                description_parts.append(f"containing {word_count} words of transcribed speech")
            
            if analysis.language:
                description_parts.append(f"in {analysis.language}")
        else:
            description_parts.append("with no detectable speech")
        
        # Speech rate
        if analysis.speech_rate:
            if analysis.speech_rate > 180:
                description_parts.append("(fast speech)")
            elif analysis.speech_rate < 120:
                description_parts.append("(slow speech)")
        
        # Audio characteristics
        if analysis.silence_ratio and analysis.silence_ratio > 0.5:
            description_parts.append("with significant silence")
        
        return " ".join(description_parts)
    
    async def analyze_audio(
        self,
        content: Union[bytes, Path],
        file_path: Optional[Path] = None
    ) -> AudioAnalysis:
        """Analyze audio and return structured result"""
        
        result = await self.transcribe_audio(content, file_path)
        analysis_dict = result.get('analysis', {})
        
        return AudioAnalysis(
            transcript=result.get('transcript', ''),
            duration=analysis_dict.get('duration', 0.0),
            sample_rate=analysis_dict.get('sample_rate'),
            channels=analysis_dict.get('channels'),
            format=analysis_dict.get('format'),
            language=analysis_dict.get('language'),
            confidence=analysis_dict.get('confidence', 0.0),
            speech_rate=analysis_dict.get('speech_rate'),
            silence_ratio=analysis_dict.get('silence_ratio'),
            volume_stats=analysis_dict.get('volume_stats', {}),
            frequency_analysis=analysis_dict.get('frequency_analysis', {})
        )


# Global audio processor instance
_global_processor: Optional[AudioProcessor] = None

def get_audio_processor() -> AudioProcessor:
    """Get the global audio processor"""
    global _global_processor
    if _global_processor is None:
        _global_processor = AudioProcessor()
    return _global_processor

async def transcribe_audio(content: Union[bytes, Path]) -> str:
    """Transcribe audio to text"""
    processor = get_audio_processor()
    result = await processor.transcribe_audio(content)
    return result.get('transcript', '')

async def analyze_audio(content: Union[bytes, Path]) -> AudioAnalysis:
    """Analyze audio content"""
    processor = get_audio_processor()
    return await processor.analyze_audio(content)