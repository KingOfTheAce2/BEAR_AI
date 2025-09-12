"""
BEAR AI Data Cleaning Pipeline for Court Cases CSV Processing.

This module provides comprehensive data cleaning utilities for legal document CSV files,
with focus on UTF-8 encoding normalization, control character removal, and data standardization.
"""

from .core_cleaner import CourtCasesCSVCleaner
from .encoding_utils import EncodingNormalizer
from .text_sanitizer import TextSanitizer
from .data_standardizer import DataStandardizer
from .batch_processor import BatchProcessor
from .cleaning_report import CleaningReport

__all__ = [
    'CourtCasesCSVCleaner',
    'EncodingNormalizer', 
    'TextSanitizer',
    'DataStandardizer',
    'BatchProcessor',
    'CleaningReport'
]

__version__ = '1.0.0'