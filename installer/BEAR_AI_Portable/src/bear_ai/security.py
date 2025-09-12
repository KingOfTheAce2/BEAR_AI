import os
import re
import logging
from typing import Pattern, Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class GPUInfo:
    """Information about detected GPU."""
    name: str
    memory_gb: float
    compute_capability: Optional[str]
    driver_version: Optional[str]
    cuda_version: Optional[str]
    available: bool = True


def detect_gpu_capabilities() -> Dict[str, GPUInfo]:
    """Detect all available GPUs and their capabilities.
    
    Returns
    -------
    Dict[str, GPUInfo]
        Dictionary mapping GPU vendor to GPU information
    """
    gpus = {}
    logger = logging.getLogger(__name__)
    
    # Try NVIDIA first
    nvidia_info = _detect_nvidia_gpu()
    if nvidia_info:
        gpus['nvidia'] = nvidia_info
        logger.info(f"Detected NVIDIA GPU: {nvidia_info.name}")
    
    # Try AMD ROCm
    amd_info = _detect_amd_gpu()
    if amd_info:
        gpus['amd'] = amd_info
        logger.info(f"Detected AMD GPU: {amd_info.name}")
    
    # Try Intel GPU
    intel_info = _detect_intel_gpu()
    if intel_info:
        gpus['intel'] = intel_info
        logger.info(f"Detected Intel GPU: {intel_info.name}")
    
    return gpus


def _detect_nvidia_gpu() -> Optional[GPUInfo]:
    """Detect NVIDIA GPU using NVML."""
    try:
        import pynvml
        pynvml.nvmlInit()
        
        if pynvml.nvmlDeviceGetCount() == 0:
            return None
        
        # Get info for first GPU
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        
        name = pynvml.nvmlDeviceGetName(handle).decode('utf-8')
        
        # Memory info
        mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
        memory_gb = round(mem_info.total / (1024**3), 2)
        
        # Compute capability
        try:
            major, minor = pynvml.nvmlDeviceGetCudaComputeCapability(handle)
            compute_capability = f"{major}.{minor}"
        except Exception:
            compute_capability = None
        
        # Driver version
        try:
            driver_version = pynvml.nvmlSystemGetDriverVersion().decode('utf-8')
        except Exception:
            driver_version = None
        
        # CUDA version
        try:
            cuda_version = pynvml.nvmlSystemGetCudaDriverVersion()
            cuda_major = cuda_version // 1000
            cuda_minor = (cuda_version % 1000) // 10
            cuda_version = f"{cuda_major}.{cuda_minor}"
        except Exception:
            cuda_version = None
        
        return GPUInfo(
            name=name,
            memory_gb=memory_gb,
            compute_capability=compute_capability,
            driver_version=driver_version,
            cuda_version=cuda_version
        )
        
    except Exception as e:
        logging.getLogger(__name__).debug(f"NVIDIA GPU detection failed: {e}")
        return None
    finally:
        try:
            pynvml.nvmlShutdown()
        except Exception:
            pass


def _detect_amd_gpu() -> Optional[GPUInfo]:
    """Detect AMD GPU using ROCm (placeholder for future implementation)."""
    # Placeholder for AMD GPU detection
    # This would use ROCm libraries when available
    try:
        # Future implementation for AMD GPU detection
        pass
    except Exception:
        pass
    return None


def _detect_intel_gpu() -> Optional[GPUInfo]:
    """Detect Intel GPU (placeholder for future implementation)."""
    # Placeholder for Intel GPU detection
    # This would use Intel GPU libraries when available
    try:
        # Future implementation for Intel GPU detection
        pass
    except Exception:
        pass
    return None


def enable_cuda(force: bool = False) -> Tuple[bool, Optional[GPUInfo]]:
    """Detect an NVIDIA GPU and enable CUDA acceleration with enhanced detection.

    Parameters
    ----------
    force: bool
        Force CUDA enablement even without GPU detection
        
    Returns
    -------
    Tuple[bool, Optional[GPUInfo]]
        (success, gpu_info) - True if CUDA was enabled, GPU info if detected
    """
    logger = logging.getLogger(__name__)
    
    # First try comprehensive GPU detection
    gpus = detect_gpu_capabilities()
    nvidia_gpu = gpus.get('nvidia')
    
    if not nvidia_gpu and not force:
        logger.info("No NVIDIA GPU detected, CUDA not enabled")
        return False, None
    
    if force and not nvidia_gpu:
        logger.warning("Forcing CUDA enablement without GPU detection")
        nvidia_gpu = GPUInfo(
            name="Unknown (Forced)",
            memory_gb=0.0,
            compute_capability=None,
            driver_version=None,
            cuda_version=None,
            available=True
        )
    
    # Set environment variables for CUDA acceleration
    os.environ.setdefault("LLAMA_CPP_USE_CUDA", "1")
    
    # Additional optimization flags
    if nvidia_gpu and nvidia_gpu.compute_capability:
        # Enable optimizations based on compute capability
        major_version = float(nvidia_gpu.compute_capability.split('.')[0])
        
        if major_version >= 7.0:  # Volta and newer
            os.environ.setdefault("LLAMA_CPP_CUDA_GRAPHS", "1")
            
        if major_version >= 8.0:  # Ampere and newer
            os.environ.setdefault("LLAMA_CPP_CUDA_PEER_MAX_TX_COUNT", "2")
    
    # Memory optimization flags
    if nvidia_gpu and nvidia_gpu.memory_gb > 0:
        if nvidia_gpu.memory_gb >= 16:
            os.environ.setdefault("LLAMA_CPP_CUDA_FORCE_DMMV", "1")
        elif nvidia_gpu.memory_gb < 8:
            os.environ.setdefault("LLAMA_CPP_CUDA_F16", "0")  # Use FP32 for lower memory
    
    logger.info(f"CUDA enabled for GPU: {nvidia_gpu.name if nvidia_gpu else 'Unknown'}")
    return True, nvidia_gpu


def enable_cuda_legacy() -> bool:
    """Detect an NVIDIA GPU and enable CUDA acceleration.

    Returns ``True`` if CUDA support was enabled. Detection relies on
    ``pynvml`` which is an optional dependency. When a GPU is found the
    ``LLAMA_CPP_USE_CUDA`` environment variable is set so that
    ``llama-cpp-python`` will offload layers to the GPU.

    The helper is intentionally light‑weight – failures simply result in
    returning ``False`` without raising.
    """

    try:
        import pynvml  # type: ignore
    except Exception:
        return False

    try:
        pynvml.nvmlInit()
        has_gpu = pynvml.nvmlDeviceGetCount() > 0
    except Exception:
        return False
    finally:
        try:  # pragma: no cover - best effort shutdown
            pynvml.nvmlShutdown()
        except Exception:
            pass

    if not has_gpu:
        return False

    os.environ.setdefault("LLAMA_CPP_USE_CUDA", "1")
    return True


_RE_PATTERNS: dict[str, Pattern[str]] = {
    # Basic, conservative regexes for common PII. These are intentionally simple
    # and not exhaustive; they minimize false positives while providing value.
    # They can be replaced by advanced pipelines (e.g., Presidio) later.
    "EMAIL": re.compile(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}\b"),
    # North American phone numbers in various formats: (123) 456-7890, 123-456-7890, 123.456.7890
    "PHONE": re.compile(r"(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}"),
    # US SSN: 123-45-6789 (very specific to reduce false positives)
    "SSN": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    # Credit card (basic Luhn-like length patterns; conservative separators)
    "CARD": re.compile(r"\b(?:\d[ -]?){13,19}\b"),
    # IPv4 address
    "IP": re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b"),
    # Dutch BSN (Burgerservicenummer): 9 digits with optional separators
    "BSN": re.compile(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{3}\b|\b\d{9}\b"),
    # Dutch RSIN (Rechtspersonen en Samenwerkingsverbanden Informatienummer): 9 digits
    "RSIN": re.compile(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{3}\b|\b\d{9}\b"),
}


def is_valid_bsn(number: str) -> bool:
    """
    Validate Dutch BSN (Burgerservicenummer) using the 11-test checksum algorithm.
    
    BSN is a 9-digit number where the first 8 digits are multiplied by weights
    9,8,7,6,5,4,3,2 respectively, and the 9th digit is the check digit.
    The sum must be divisible by 11, and the result must not be divisible by 11
    when excluding the check digit calculation.
    
    Args:
        number: BSN number as string, may contain separators
        
    Returns:
        True if the BSN is valid according to the 11-test algorithm
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


def is_valid_rsin(number: str) -> bool:
    """
    Validate Dutch RSIN (Rechtspersonen en Samenwerkingsverbanden Informatienummer).
    
    RSIN uses the same validation algorithm as BSN (11-test) but is used for
    legal entities instead of individuals.
    
    Args:
        number: RSIN number as string, may contain separators
        
    Returns:
        True if the RSIN is valid according to the 11-test algorithm
    """
    # RSIN uses the same validation as BSN
    return is_valid_bsn(number)


def _is_likely_valid_dutch_number(text: str, number_type: str) -> bool:
    """
    Helper function to validate Dutch numbers before replacement.
    
    Args:
        text: The matched text
        number_type: Either "BSN" or "RSIN"
        
    Returns:
        True if the number passes validation
    """
    if number_type == "BSN":
        return is_valid_bsn(text)
    elif number_type == "RSIN":
        return is_valid_rsin(text)
    return False


def scrub_pii(text: str) -> str:
    """
    Best-effort local PII redaction without external dependencies.
    Replaces common PII with bracketed tags: [EMAIL], [PHONE], [SSN], [CARD], [IP], [BSN], [RSIN].

    This is a pragmatic baseline. For GDPR-grade workflows, integrate with
    advanced pipelines (e.g., Microsoft Presidio) later while keeping this
    fallback for offline minimal environments.
    
    Dutch BSN and RSIN numbers are validated using the 11-test checksum algorithm
    before replacement to minimize false positives.
    """
    out = text
    # Replace longest/most specific first to avoid overlapping oddities
    order = ["EMAIL", "SSN", "PHONE", "CARD", "IP"]
    
    # Process standard patterns without validation
    for key in order:
        out = _RE_PATTERNS[key].sub(f"[{key}]", out)
    
    # Process Dutch numbers with validation to reduce false positives
    # Since BSN and RSIN have identical patterns, we need to handle them together
    # and use context clues to determine the most appropriate label
    dutch_pattern = _RE_PATTERNS["BSN"]  # Same as RSIN pattern
    
    def replace_dutch_number(match):
        matched_text = match.group(0)
        if not _is_likely_valid_dutch_number(matched_text, "BSN"):
            return matched_text
        
        # Look for immediate context (just the current line) to determine if BSN or RSIN
        start, end = match.span()
        
        # Find the line containing this match
        line_start = out.rfind('\n', 0, start) + 1
        line_end = out.find('\n', end)
        if line_end == -1:
            line_end = len(out)
        
        current_line = out[line_start:line_end].upper()
        
        # Look for explicit labels in the same line
        if "RSIN" in current_line and "BSN" not in current_line:
            return "[RSIN]"
        elif "BSN" in current_line and "RSIN" not in current_line:
            return "[BSN]"
        else:
            # Look for broader context clues in a smaller window (immediate vicinity)
            context_before = out[max(0, start-10):start].upper()
            context_after = out[end:min(len(out), end+10)].upper()
            immediate_context = context_before + context_after
            
            # RSIN context indicators (business-related)
            if any(keyword in immediate_context for keyword in ["KVK", "BEDRIJF", "COMPANY", "RECHTSPERSOON"]):
                return "[RSIN]"
            # BSN context indicators (personal)
            elif any(keyword in immediate_context for keyword in ["BURGER", "PERSOON", "CITIZEN", "PERSONAL"]):
                return "[BSN]"
            else:
                # Default to BSN (most common use case for personal data)
                return "[BSN]"
    
    out = dutch_pattern.sub(replace_dutch_number, out)
    
    return out
