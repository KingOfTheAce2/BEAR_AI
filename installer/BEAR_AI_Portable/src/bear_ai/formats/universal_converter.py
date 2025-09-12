"""
Universal Model Format Converter
Convert between GGUF, MLX, PyTorch, ONNX, TensorRT, and other formats
"""

import logging
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

logger = logging.getLogger(__name__)


class UniversalModelConverter:
    """Converts models between different formats"""
    
    def __init__(self):
        self.supported_formats = {
            "gguf": {
                "extensions": [".gguf"],
                "description": "GGML Universal Format - optimized for CPU inference",
                "tools": ["llama.cpp"]
            },
            "mlx": {
                "extensions": [".npz", ".safetensors"],
                "description": "Apple MLX format - optimized for Apple Silicon",
                "tools": ["mlx"]
            },
            "pytorch": {
                "extensions": [".bin", ".pt", ".pth"],
                "description": "PyTorch format - flexible research format",
                "tools": ["torch", "transformers"]
            },
            "safetensors": {
                "extensions": [".safetensors"],
                "description": "Safe serialization format for ML models",
                "tools": ["safetensors"]
            },
            "onnx": {
                "extensions": [".onnx"],
                "description": "Open Neural Network Exchange - cross-platform",
                "tools": ["onnx", "onnxruntime"]
            },
            "tensorrt": {
                "extensions": [".trt", ".engine"],
                "description": "NVIDIA TensorRT - optimized for NVIDIA GPUs",
                "tools": ["tensorrt"]
            },
            "coreml": {
                "extensions": [".mlmodel"],
                "description": "Apple Core ML - iOS/macOS deployment",
                "tools": ["coremltools"]
            }
        }
        
        logger.info("UniversalModelConverter initialized")
    
    def detect_format(self, model_path: Union[str, Path]) -> Optional[str]:
        """Detect model format from file extension or directory structure"""
        
        model_path = Path(model_path)
        
        if model_path.is_file():
            # Check file extension
            suffix = model_path.suffix.lower()
            for format_name, info in self.supported_formats.items():
                if suffix in info["extensions"]:
                    return format_name
        
        elif model_path.is_dir():
            # Check directory contents
            files = list(model_path.iterdir())
            
            # Check for specific patterns
            if any(f.name == "config.json" for f in files):
                # Likely HuggingFace format
                if any(f.suffix == ".bin" for f in files):
                    return "pytorch"
                elif any(f.suffix == ".safetensors" for f in files):
                    return "safetensors"
            
            if any(f.suffix == ".gguf" for f in files):
                return "gguf"
                
            if any(f.suffix == ".npz" for f in files):
                return "mlx"
        
        return None
    
    def can_convert(self, source_format: str, target_format: str) -> bool:
        """Check if conversion between formats is supported"""
        
        # Define conversion matrix
        conversion_matrix = {
            "pytorch": ["gguf", "mlx", "onnx", "safetensors", "coreml"],
            "safetensors": ["gguf", "mlx", "onnx", "pytorch"],
            "gguf": ["mlx"],  # Limited reverse conversion
            "mlx": ["gguf"],  # Limited reverse conversion  
            "onnx": ["tensorrt", "coreml"],
        }
        
        if source_format not in conversion_matrix:
            return False
            
        return target_format in conversion_matrix[source_format]
    
    async def convert_model(\n        self,\n        source_path: Union[str, Path],\n        target_path: Union[str, Path],\n        target_format: str,\n        **kwargs\n    ) -> bool:\n        \"\"\"Convert model to target format\"\"\"\n        \n        source_path = Path(source_path)\n        target_path = Path(target_path)\n        \n        # Detect source format\n        source_format = self.detect_format(source_path)\n        if not source_format:\n            logger.error(f\"Could not detect format of {source_path}\")\n            return False\n        \n        logger.info(f\"Converting {source_format} -> {target_format}\")\n        \n        # Check if conversion is supported\n        if not self.can_convert(source_format, target_format):\n            logger.error(f\"Conversion from {source_format} to {target_format} not supported\")\n            return False\n        \n        # Perform conversion based on source/target formats\n        try:\n            if source_format == \"pytorch\" and target_format == \"gguf\":\n                return await self._convert_pytorch_to_gguf(source_path, target_path, **kwargs)\n                \n            elif source_format == \"pytorch\" and target_format == \"mlx\":\n                return await self._convert_pytorch_to_mlx(source_path, target_path, **kwargs)\n                \n            elif source_format == \"pytorch\" and target_format == \"onnx\":\n                return await self._convert_pytorch_to_onnx(source_path, target_path, **kwargs)\n                \n            elif source_format == \"onnx\" and target_format == \"tensorrt\":\n                return await self._convert_onnx_to_tensorrt(source_path, target_path, **kwargs)\n                \n            elif source_format == \"gguf\" and target_format == \"mlx\":\n                return await self._convert_gguf_to_mlx(source_path, target_path, **kwargs)\n                \n            else:\n                logger.error(f\"Conversion path {source_format} -> {target_format} not implemented\")\n                return False\n                \n        except Exception as e:\n            logger.error(f\"Conversion failed: {e}\")\n            return False\n    \n    async def _convert_pytorch_to_gguf(\n        self, \n        source_path: Path, \n        target_path: Path, \n        quantization: str = \"q4_k_m\",\n        **kwargs\n    ) -> bool:\n        \"\"\"Convert PyTorch model to GGUF format\"\"\"\n        \n        try:\n            # Check for llama.cpp conversion script\n            convert_script = shutil.which(\"convert-hf-to-gguf.py\")\n            if not convert_script:\n                logger.error(\"llama.cpp conversion tools not found\")\n                return False\n            \n            # Create output directory\n            target_path.parent.mkdir(parents=True, exist_ok=True)\n            \n            # Run conversion\n            cmd = [\n                \"python\", convert_script,\n                str(source_path),\n                \"--outtype\", quantization,\n                \"--outfile\", str(target_path)\n            ]\n            \n            result = subprocess.run(\n                cmd, \n                capture_output=True, \n                text=True, \n                timeout=3600  # 1 hour timeout\n            )\n            \n            if result.returncode == 0:\n                logger.info(f\"Successfully converted to GGUF: {target_path}\")\n                return True\n            else:\n                logger.error(f\"GGUF conversion failed: {result.stderr}\")\n                return False\n                \n        except Exception as e:\n            logger.error(f\"Error in PyTorch -> GGUF conversion: {e}\")\n            return False\n    \n    async def _convert_pytorch_to_mlx(\n        self, \n        source_path: Path, \n        target_path: Path,\n        quantize: bool = True,\n        **kwargs\n    ) -> bool:\n        \"\"\"Convert PyTorch model to MLX format\"\"\"\n        \n        try:\n            # Check if MLX is available\n            try:\n                import mlx.core as mx\n                from mlx_lm import convert\n            except ImportError:\n                logger.error(\"MLX not available - install with: pip install mlx-lm\")\n                return False\n            \n            # Create output directory\n            target_path.parent.mkdir(parents=True, exist_ok=True)\n            \n            # Convert using MLX\n            if quantize:\n                convert.convert(\n                    str(source_path),\n                    str(target_path),\n                    quantize=True,\n                    q_bits=4,\n                    q_group_size=64\n                )\n            else:\n                convert.convert(\n                    str(source_path),\n                    str(target_path)\n                )\n            \n            logger.info(f\"Successfully converted to MLX: {target_path}\")\n            return True\n            \n        except Exception as e:\n            logger.error(f\"Error in PyTorch -> MLX conversion: {e}\")\n            return False\n    \n    async def _convert_pytorch_to_onnx(\n        self, \n        source_path: Path, \n        target_path: Path,\n        opset_version: int = 11,\n        **kwargs\n    ) -> bool:\n        \"\"\"Convert PyTorch model to ONNX format\"\"\"\n        \n        try:\n            import torch\n            import onnx\n            from transformers import AutoModel, AutoTokenizer\n            \n            # Load model and tokenizer\n            model = AutoModel.from_pretrained(str(source_path))\n            tokenizer = AutoTokenizer.from_pretrained(str(source_path))\n            \n            # Create dummy input\n            dummy_text = \"This is a sample input for ONNX conversion\"\n            dummy_input = tokenizer(\n                dummy_text, \n                return_tensors=\"pt\",\n                padding=True,\n                truncation=True,\n                max_length=512\n            )\n            \n            # Create output directory\n            target_path.parent.mkdir(parents=True, exist_ok=True)\n            \n            # Export to ONNX\n            torch.onnx.export(\n                model,\n                tuple(dummy_input.values()),\n                str(target_path),\n                export_params=True,\n                opset_version=opset_version,\n                do_constant_folding=True,\n                input_names=[\"input_ids\", \"attention_mask\"],\n                output_names=[\"output\"],\n                dynamic_axes={\n                    \"input_ids\": {0: \"batch_size\", 1: \"sequence\"},\n                    \"attention_mask\": {0: \"batch_size\", 1: \"sequence\"},\n                    \"output\": {0: \"batch_size\", 1: \"sequence\"}\n                }\n            )\n            \n            logger.info(f\"Successfully converted to ONNX: {target_path}\")\n            return True\n            \n        except Exception as e:\n            logger.error(f\"Error in PyTorch -> ONNX conversion: {e}\")\n            return False\n    \n    async def _convert_onnx_to_tensorrt(\n        self, \n        source_path: Path, \n        target_path: Path,\n        max_batch_size: int = 1,\n        **kwargs\n    ) -> bool:\n        \"\"\"Convert ONNX model to TensorRT format\"\"\"\n        \n        try:\n            # Check for TensorRT\n            trtexec = shutil.which(\"trtexec\")\n            if not trtexec:\n                logger.error(\"TensorRT not found - install NVIDIA TensorRT\")\n                return False\n            \n            # Create output directory\n            target_path.parent.mkdir(parents=True, exist_ok=True)\n            \n            # Build TensorRT engine\n            cmd = [\n                trtexec,\n                f\"--onnx={source_path}\",\n                f\"--saveEngine={target_path}\",\n                f\"--maxBatch={max_batch_size}\",\n                \"--fp16\",  # Enable FP16 for better performance\n                \"--verbose\"\n            ]\n            \n            result = subprocess.run(\n                cmd,\n                capture_output=True,\n                text=True,\n                timeout=1800  # 30 minute timeout\n            )\n            \n            if result.returncode == 0:\n                logger.info(f\"Successfully converted to TensorRT: {target_path}\")\n                return True\n            else:\n                logger.error(f\"TensorRT conversion failed: {result.stderr}\")\n                return False\n                \n        except Exception as e:\n            logger.error(f\"Error in ONNX -> TensorRT conversion: {e}\")\n            return False\n    \n    async def _convert_gguf_to_mlx(\n        self, \n        source_path: Path, \n        target_path: Path,\n        **kwargs\n    ) -> bool:\n        \"\"\"Convert GGUF model to MLX format (limited support)\"\"\"\n        \n        try:\n            # This is a complex conversion that requires:\n            # 1. Converting GGUF back to PyTorch (if possible)\n            # 2. Then converting PyTorch to MLX\n            \n            logger.warning(\"GGUF -> MLX conversion is experimental\")\n            \n            # Check if we have conversion tools\n            try:\n                import mlx.core as mx\n                from mlx_lm import convert\n            except ImportError:\n                logger.error(\"MLX not available\")\n                return False\n            \n            # For now, return False as this needs more implementation\n            logger.error(\"GGUF -> MLX conversion not fully implemented\")\n            return False\n            \n        except Exception as e:\n            logger.error(f\"Error in GGUF -> MLX conversion: {e}\")\n            return False\n    \n    def get_conversion_options(self, source_format: str, target_format: str) -> Dict:\n        \"\"\"Get available options for a conversion\"\"\"\n        \n        options = {}\n        \n        if source_format == \"pytorch\" and target_format == \"gguf\":\n            options = {\n                \"quantization\": {\n                    \"type\": \"choice\",\n                    \"choices\": [\"q2_k\", \"q3_k_m\", \"q4_0\", \"q4_k_m\", \"q5_0\", \"q5_k_m\", \"q6_k\", \"q8_0\"],\n                    \"default\": \"q4_k_m\",\n                    \"description\": \"Quantization level (smaller = faster, less accurate)\"\n                }\n            }\n        \n        elif source_format == \"pytorch\" and target_format == \"mlx\":\n            options = {\n                \"quantize\": {\n                    \"type\": \"boolean\",\n                    \"default\": True,\n                    \"description\": \"Enable quantization for smaller size\"\n                },\n                \"q_bits\": {\n                    \"type\": \"integer\",\n                    \"choices\": [2, 4, 8],\n                    \"default\": 4,\n                    \"description\": \"Quantization bits\"\n                }\n            }\n        \n        elif source_format == \"pytorch\" and target_format == \"onnx\":\n            options = {\n                \"opset_version\": {\n                    \"type\": \"integer\",\n                    \"choices\": [9, 10, 11, 12, 13, 14, 15, 16],\n                    \"default\": 11,\n                    \"description\": \"ONNX opset version\"\n                }\n            }\n        \n        return options\n    \n    def estimate_conversion_time(self, source_path: Path, target_format: str) -> str:\n        \"\"\"Estimate conversion time\"\"\"\n        \n        try:\n            # Get model size\n            if source_path.is_file():\n                size_mb = source_path.stat().st_size / (1024 * 1024)\n            else:\n                size_mb = sum(\n                    f.stat().st_size for f in source_path.rglob(\"*\") if f.is_file()\n                ) / (1024 * 1024)\n            \n            # Rough estimates based on format and size\n            if target_format == \"gguf\":\n                # GGUF conversion is relatively fast\n                minutes = max(1, size_mb / 1000)  # ~1GB per minute\n            elif target_format == \"mlx\":\n                # MLX conversion is fast on Apple Silicon\n                minutes = max(1, size_mb / 2000)  # ~2GB per minute\n            elif target_format == \"onnx\":\n                # ONNX conversion varies by model complexity\n                minutes = max(2, size_mb / 500)   # ~500MB per minute\n            elif target_format == \"tensorrt\":\n                # TensorRT optimization takes time\n                minutes = max(5, size_mb / 200)   # ~200MB per minute\n            else:\n                minutes = max(1, size_mb / 1000)\n            \n            if minutes < 1:\n                return \"<1 minute\"\n            elif minutes < 60:\n                return f\"~{int(minutes)} minutes\"\n            else:\n                hours = minutes / 60\n                return f\"~{hours:.1f} hours\"\n                \n        except Exception:\n            return \"Unknown\"\n    \n    def list_supported_formats(self) -> Dict[str, Dict]:\n        \"\"\"List all supported formats with descriptions\"\"\"\n        return self.supported_formats.copy()\n\n\n# Global converter instance\n_global_converter: Optional[UniversalModelConverter] = None\n\ndef get_model_converter() -> UniversalModelConverter:\n    \"\"\"Get global model converter instance\"\"\"\n    global _global_converter\n    if _global_converter is None:\n        _global_converter = UniversalModelConverter()\n    return _global_converter\n\nasync def convert_model(\n    source_path: Union[str, Path],\n    target_path: Union[str, Path], \n    target_format: str,\n    **kwargs\n) -> bool:\n    \"\"\"Convert model to target format\"\"\"\n    converter = get_model_converter()\n    return await converter.convert_model(source_path, target_path, target_format, **kwargs)