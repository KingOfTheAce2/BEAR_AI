"""
PII Audit System

Provides comprehensive audit logging for PII scrubbing operations with:
- SHA256 hashing for privacy-preserving audit trails
- JSONL format for efficient log processing
- Metadata tracking (timestamps, entities, confidence scores)
- No raw text storage for privacy compliance
- Append-only audit trail design
"""

import hashlib
import json
import os
import threading
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from .scrubber import PIIEntity


@dataclass
class AuditEntry:
    """Represents a single PII audit log entry."""
    
    # Unique identifier for this audit entry
    entry_id: str
    
    # Timestamp in ISO format (UTC)
    timestamp: str
    
    # SHA256 hash of original text (for correlation without storing raw text)
    text_hash: str
    
    # Direction of processing (inbound/outbound)
    direction: str
    
    # Number of PII entities found
    entities_found: int
    
    # List of detected entity types and their counts
    entity_summary: Dict[str, int]
    
    # Confidence score statistics
    min_confidence: float
    max_confidence: float
    avg_confidence: float
    
    # Policy configuration used (summary)
    policy_summary: Dict[str, Any]
    
    # Processing metadata
    processing_time_ms: Optional[float] = None
    scrubber_version: Optional[str] = None
    model_info: Optional[Dict[str, str]] = None


class Audit:
    """
    PII audit system for privacy-compliant logging.
    
    Maintains an append-only audit trail of PII scrubbing operations
    using SHA256 hashes and metadata to enable compliance reporting
    without storing sensitive raw text data.
    """
    
    def __init__(self, audit_dir: Optional[str] = None):
        """
        Initialize the audit system.
        
        Args:
            audit_dir: Directory for audit logs. If None, uses PII_AUDIT_DIR env var
                      or defaults to ./logs/pii/
        """
        if audit_dir is None:
            audit_dir = os.getenv("PII_AUDIT_DIR", "./logs/pii/")
        
        self.audit_dir = Path(audit_dir)
        self.audit_dir.mkdir(parents=True, exist_ok=True)
        
        # Thread lock for safe concurrent logging
        self._lock = threading.Lock()
        
        # Current log file
        self._current_log_file = self._get_current_log_file()
        
        # Salt for text hashing (should be consistent across sessions)
        self._hash_salt = self._get_hash_salt()
    
    def _get_current_log_file(self) -> Path:
        """Get the current log file path (date-based rotation)."""
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return self.audit_dir / f"pii_audit_{date_str}.jsonl"
    
    def _get_hash_salt(self) -> str:
        """Get or generate salt for text hashing."""
        salt_file = self.audit_dir / "audit_salt.txt"
        
        try:
            if salt_file.exists():
                return salt_file.read_text().strip()
            else:
                # Generate new salt
                import secrets
                salt = secrets.token_hex(32)
                salt_file.write_text(salt)
                return salt
        except Exception:
            # Fallback to environment variable or default
            return os.getenv("PII_AUDIT_SALT", "default_audit_salt_change_me")
    
    def hash_text(self, text: str) -> str:
        """
        Generate SHA256 hash of text for audit purposes.
        
        Args:
            text: Text to hash
            
        Returns:
            SHA256 hash as hexadecimal string
        """
        hash_input = f"{self._hash_salt}:{text}".encode('utf-8')
        return hashlib.sha256(hash_input).hexdigest()
    
    def log_scrubbing_event(self, 
                           original_hash: str,
                           entities_found: List["PIIEntity"],
                           direction: str,
                           policy_config: Dict[str, Any],
                           processing_time_ms: Optional[float] = None) -> str:
        """
        Log a PII scrubbing event to the audit trail.
        
        Args:
            original_hash: SHA256 hash of original text
            entities_found: List of detected PII entities
            direction: Processing direction ('inbound' or 'outbound')
            policy_config: Policy configuration used
            processing_time_ms: Processing time in milliseconds
            
        Returns:
            Entry ID of the logged event
        """
        import uuid
        
        # Generate unique entry ID
        entry_id = str(uuid.uuid4())
        
        # Calculate entity statistics
        entity_summary = {}
        confidences = []
        
        for entity in entities_found:
            entity_type = entity.entity_type
            entity_summary[entity_type] = entity_summary.get(entity_type, 0) + 1
            confidences.append(entity.score)
        
        # Calculate confidence statistics
        if confidences:
            min_confidence = min(confidences)
            max_confidence = max(confidences)
            avg_confidence = sum(confidences) / len(confidences)
        else:
            min_confidence = max_confidence = avg_confidence = 0.0
        
        # Create audit entry
        entry = AuditEntry(
            entry_id=entry_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            text_hash=original_hash,
            direction=direction,
            entities_found=len(entities_found),
            entity_summary=entity_summary,
            min_confidence=min_confidence,
            max_confidence=max_confidence,
            avg_confidence=avg_confidence,
            policy_summary=self._summarize_policy(policy_config),
            processing_time_ms=processing_time_ms,
            scrubber_version=self._get_scrubber_version(),
            model_info=self._get_model_info()
        )
        
        # Write to log file
        self._write_audit_entry(entry)
        
        return entry_id
    
    def _summarize_policy(self, policy_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a summary of policy configuration for audit purposes.
        
        Args:
            policy_config: Full policy configuration
            
        Returns:
            Summarized policy information
        """
        return {
            "confidence_threshold": policy_config.get("confidence_threshold"),
            "stable_tokenization": policy_config.get("stable_tokenization"),
            "inbound_entity_count": len(policy_config.get("inbound_entities", [])),
            "outbound_entity_count": len(policy_config.get("outbound_entities", [])),
            "custom_replacements_count": len(policy_config.get("custom_replacements", {}))
        }
    
    def _get_scrubber_version(self) -> str:
        """Get scrubber version information."""
        try:
            from .. import __version__
            return __version__
        except ImportError:
            return "unknown"
    
    def _get_model_info(self) -> Dict[str, str]:
        """Get NLP model information."""
        # This would be populated with actual model info in a real implementation
        return {
            "primary_language": "nl",
            "fallback_language": "en"
        }
    
    def _write_audit_entry(self, entry: AuditEntry):
        """
        Write audit entry to log file in JSONL format.
        
        Args:
            entry: Audit entry to write
        """
        with self._lock:
            try:
                # Check if we need to rotate to a new log file
                current_file = self._get_current_log_file()
                if current_file != self._current_log_file:
                    self._current_log_file = current_file
                
                # Write entry as JSON line
                with open(self._current_log_file, 'a', encoding='utf-8') as f:
                    json.dump(asdict(entry), f, ensure_ascii=False)
                    f.write('\n')
                    
            except Exception as e:
                # Log error but don't fail the scrubbing operation
                import logging
                logging.getLogger(__name__).error(f"Failed to write audit entry: {e}")
    
    def query_audit_entries(self, 
                           start_date: Optional[datetime] = None,
                           end_date: Optional[datetime] = None,
                           direction: Optional[str] = None,
                           entity_types: Optional[List[str]] = None,
                           min_entities: Optional[int] = None,
                           limit: Optional[int] = None) -> List[AuditEntry]:
        """
        Query audit entries with optional filtering.
        
        Args:
            start_date: Filter entries after this date
            end_date: Filter entries before this date  
            direction: Filter by direction ('inbound' or 'outbound')
            entity_types: Filter entries containing these entity types
            min_entities: Filter entries with at least this many entities
            limit: Maximum number of entries to return
            
        Returns:
            List of matching audit entries
        """
        entries = []
        
        # Find all log files in date range
        log_files = []
        for log_file in self.audit_dir.glob("pii_audit_*.jsonl"):
            log_files.append(log_file)
        
        log_files.sort()
        
        # Read and filter entries
        for log_file in log_files:
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        
                        try:
                            entry_data = json.loads(line)
                            entry = AuditEntry(**entry_data)
                            
                            # Apply filters
                            if start_date and datetime.fromisoformat(entry.timestamp.replace('Z', '+00:00')) < start_date:
                                continue
                            
                            if end_date and datetime.fromisoformat(entry.timestamp.replace('Z', '+00:00')) > end_date:
                                continue
                            
                            if direction and entry.direction != direction:
                                continue
                            
                            if entity_types and not any(et in entry.entity_summary for et in entity_types):
                                continue
                            
                            if min_entities and entry.entities_found < min_entities:
                                continue
                            
                            entries.append(entry)
                            
                            if limit and len(entries) >= limit:
                                return entries
                                
                        except Exception as e:
                            import logging
                            logging.getLogger(__name__).warning(f"Error parsing audit entry: {e}")
                            continue
                            
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Error reading audit file {log_file}: {e}")
                continue
        
        return entries
    
    def get_audit_statistics(self, days: int = 30) -> Dict[str, Any]:
        """
        Get audit statistics for the specified time period.
        
        Args:
            days: Number of days to include in statistics
            
        Returns:
            Dictionary with audit statistics
        """
        end_date = datetime.now(timezone.utc)
        start_date = end_date.replace(days=end_date.day - days)
        
        entries = self.query_audit_entries(start_date=start_date, end_date=end_date)
        
        if not entries:
            return {"total_events": 0, "date_range": {"start": start_date.isoformat(), "end": end_date.isoformat()}}
        
        # Calculate statistics
        total_events = len(entries)
        total_entities_found = sum(entry.entities_found for entry in entries)
        
        # Direction breakdown
        inbound_events = sum(1 for entry in entries if entry.direction == "inbound")
        outbound_events = sum(1 for entry in entries if entry.direction == "outbound")
        
        # Entity type breakdown
        entity_type_counts = {}
        for entry in entries:
            for entity_type, count in entry.entity_summary.items():
                entity_type_counts[entity_type] = entity_type_counts.get(entity_type, 0) + count
        
        # Confidence statistics
        all_confidences = []
        for entry in entries:
            if entry.avg_confidence > 0:
                all_confidences.append(entry.avg_confidence)
        
        confidence_stats = {}
        if all_confidences:
            confidence_stats = {
                "min": min(all_confidences),
                "max": max(all_confidences),
                "avg": sum(all_confidences) / len(all_confidences)
            }
        
        return {
            "total_events": total_events,
            "total_entities_found": total_entities_found,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "direction_breakdown": {
                "inbound": inbound_events,
                "outbound": outbound_events
            },
            "entity_type_counts": entity_type_counts,
            "confidence_statistics": confidence_stats,
            "avg_entities_per_event": total_entities_found / total_events if total_events > 0 else 0
        }
    
    def export_audit_report(self, 
                           output_path: str,
                           start_date: Optional[datetime] = None,
                           end_date: Optional[datetime] = None,
                           format: str = "json") -> str:
        """
        Export audit report to file.
        
        Args:
            output_path: Path for output file
            start_date: Start date for report
            end_date: End date for report
            format: Output format ('json' or 'csv')
            
        Returns:
            Path to generated report file
        """
        entries = self.query_audit_entries(start_date=start_date, end_date=end_date)
        
        if format == "json":
            report_data = {
                "metadata": {
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "total_entries": len(entries),
                    "date_range": {
                        "start": start_date.isoformat() if start_date else None,
                        "end": end_date.isoformat() if end_date else None
                    }
                },
                "statistics": self.get_audit_statistics(),
                "entries": [asdict(entry) for entry in entries]
            }
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        elif format == "csv":
            import csv
            
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                if entries:
                    writer = csv.DictWriter(f, fieldnames=list(asdict(entries[0]).keys()))
                    writer.writeheader()
                    for entry in entries:
                        row = asdict(entry)
                        # Flatten complex fields for CSV
                        row['entity_summary'] = json.dumps(row['entity_summary'])
                        row['policy_summary'] = json.dumps(row['policy_summary'])
                        row['model_info'] = json.dumps(row['model_info'])
                        writer.writerow(row)
        
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        return output_path