"""
Advanced Context Window Management with Smart Compression
Handles context sliding, memory compression, and dynamic allocation
"""

import re
import json
import logging
import hashlib
from typing import List, Dict, Any, Optional, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import time
from pathlib import Path

logger = logging.getLogger(__name__)


class MessageRole(Enum):
    SYSTEM = "system"
    USER = "user" 
    ASSISTANT = "assistant"
    DOCUMENT = "document"
    SUMMARY = "summary"


class CompressionStrategy(Enum):
    NONE = "none"
    SIMPLE_TRUNCATE = "simple_truncate"  
    SLIDING_WINDOW = "sliding_window"
    SEMANTIC_SUMMARY = "semantic_summary"
    HYBRID = "hybrid"


@dataclass 
class Message:
    """Represents a conversation message"""
    role: MessageRole
    content: str
    timestamp: float = field(default_factory=time.time)
    tokens: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    compressed: bool = False
    importance_score: float = 1.0


@dataclass
class ContextSettings:
    """Context management settings"""
    max_context_tokens: int = 4096
    reserve_tokens: int = 512  # Reserve for response
    compression_strategy: CompressionStrategy = CompressionStrategy.HYBRID
    
    # Sliding window settings
    window_size: int = 20  # Number of messages to keep
    overlap_size: int = 5   # Messages to overlap when sliding
    
    # Summarization settings
    summary_ratio: float = 0.3  # How much to compress summaries
    min_messages_before_summary: int = 10
    
    # Dynamic allocation
    doc_context_ratio: float = 0.6  # How much context to allocate to documents
    chat_context_ratio: float = 0.4  # How much to allocate to chat
    
    # Quality settings
    preserve_recent_messages: int = 5  # Always keep recent messages
    preserve_system_messages: bool = True
    importance_threshold: float = 0.7  # Keep important messages


class SmartContextManager:
    """Advanced context window management with intelligent compression"""
    
    def __init__(self, settings: Optional[ContextSettings] = None):
        self.settings = settings or ContextSettings()
        self.messages: List[Message] = []
        self.document_context: List[Message] = []
        self.summary_cache: Dict[str, str] = {}
        
        # Token counting (approximate)
        self.approx_tokens_per_char = 0.25  # Rough estimate
        
        # Compression statistics
        self.compression_stats = {
            'total_compressions': 0,
            'tokens_saved': 0,
            'summaries_created': 0
        }
        
        logger.info(f"SmartContextManager initialized with {self.settings.max_context_tokens} max tokens")
    
    def add_message(self, role: MessageRole, content: str, **metadata) -> Message:
        """Add a new message to the context"""
        message = Message(
            role=role,
            content=content,
            tokens=self.estimate_tokens(content),
            metadata=metadata
        )
        
        # Calculate importance score
        message.importance_score = self._calculate_importance(message)
        
        if role == MessageRole.DOCUMENT:
            self.document_context.append(message)
        else:
            self.messages.append(message)
        
        # Trigger compression if needed
        if self._needs_compression():
            self._compress_context()
        
        logger.debug(f"Added {role.value} message with {message.tokens} tokens")
        return message
    
    def get_context_for_prompt(self, include_documents: bool = True) -> str:
        """Get the current context formatted for the model"""
        context_parts = []
        
        # System messages first
        system_messages = [m for m in self.messages if m.role == MessageRole.SYSTEM]
        for msg in system_messages:
            context_parts.append(f"System: {msg.content}")
        
        # Document context (if requested and available)
        if include_documents and self.document_context:
            doc_tokens = sum(msg.tokens or 0 for msg in self.document_context)
            allocated_doc_tokens = int(self.settings.max_context_tokens * self.settings.doc_context_ratio)
            
            if doc_tokens > allocated_doc_tokens:
                # Compress document context
                compressed_docs = self._compress_documents(allocated_doc_tokens)
                context_parts.append(f"Relevant Documents:\n{compressed_docs}")
            else:
                doc_text = "\n\n".join(msg.content for msg in self.document_context)
                context_parts.append(f"Relevant Documents:\n{doc_text}")
        
        # Conversation history
        allocated_chat_tokens = int(self.settings.max_context_tokens * self.settings.chat_context_ratio)
        
        non_system_messages = [m for m in self.messages if m.role != MessageRole.SYSTEM]
        chat_context = self._get_chat_context(non_system_messages, allocated_chat_tokens)
        
        for msg in chat_context:
            role_name = msg.role.value.title()
            context_parts.append(f"{role_name}: {msg.content}")
        
        return "\n\n".join(context_parts)
    
    def get_context_stats(self) -> Dict[str, Any]:
        """Get statistics about the current context"""
        total_messages = len(self.messages)
        total_tokens = sum(msg.tokens or 0 for msg in self.messages)
        doc_tokens = sum(msg.tokens or 0 for msg in self.document_context)
        
        return {
            'total_messages': total_messages,
            'total_tokens': total_tokens,
            'document_tokens': doc_tokens,
            'max_tokens': self.settings.max_context_tokens,
            'utilization': min(1.0, total_tokens / self.settings.max_context_tokens),
            'compression_stats': self.compression_stats.copy(),
            'strategy': self.settings.compression_strategy.value
        }
    
    def clear_context(self, keep_system: bool = True):
        """Clear conversation context"""
        if keep_system:
            system_messages = [m for m in self.messages if m.role == MessageRole.SYSTEM]
            self.messages = system_messages
        else:
            self.messages = []
        
        logger.info("Context cleared")
    
    def clear_documents(self):
        """Clear document context"""
        self.document_context = []
        logger.info("Document context cleared")
    
    def export_context(self, file_path: Path):
        """Export context to file"""
        context_data = {
            'messages': [
                {
                    'role': msg.role.value,
                    'content': msg.content,
                    'timestamp': msg.timestamp,
                    'tokens': msg.tokens,
                    'metadata': msg.metadata,
                    'importance_score': msg.importance_score
                }
                for msg in self.messages
            ],
            'document_context': [
                {
                    'role': msg.role.value,
                    'content': msg.content,
                    'timestamp': msg.timestamp,
                    'tokens': msg.tokens,
                    'metadata': msg.metadata
                }
                for msg in self.document_context
            ],
            'settings': {
                'max_context_tokens': self.settings.max_context_tokens,
                'compression_strategy': self.settings.compression_strategy.value,
                'doc_context_ratio': self.settings.doc_context_ratio,
                'chat_context_ratio': self.settings.chat_context_ratio
            },
            'stats': self.compression_stats.copy()
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(context_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Context exported to {file_path}")
    
    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for text"""
        # Simple estimation based on character count and word boundaries
        char_count = len(text)
        word_count = len(text.split())
        
        # Use a heuristic: average of char-based and word-based estimates
        char_estimate = char_count * self.approx_tokens_per_char
        word_estimate = word_count * 1.3  # Average word is ~1.3 tokens
        
        return int((char_estimate + word_estimate) / 2)
    
    def _needs_compression(self) -> bool:
        """Check if context needs compression"""
        total_tokens = sum(msg.tokens or 0 for msg in self.messages)
        doc_tokens = sum(msg.tokens or 0 for msg in self.document_context) 
        
        return (total_tokens + doc_tokens) > (self.settings.max_context_tokens - self.settings.reserve_tokens)
    
    def _compress_context(self):
        """Compress context using the configured strategy"""
        logger.info(f"Compressing context using {self.settings.compression_strategy.value} strategy")
        
        if self.settings.compression_strategy == CompressionStrategy.SIMPLE_TRUNCATE:
            self._simple_truncate()
        elif self.settings.compression_strategy == CompressionStrategy.SLIDING_WINDOW:
            self._sliding_window_compress()
        elif self.settings.compression_strategy == CompressionStrategy.SEMANTIC_SUMMARY:
            self._semantic_summary_compress()
        elif self.settings.compression_strategy == CompressionStrategy.HYBRID:
            self._hybrid_compress()
        
        self.compression_stats['total_compressions'] += 1
    
    def _simple_truncate(self):
        """Simple truncation - remove oldest messages"""
        target_tokens = self.settings.max_context_tokens - self.settings.reserve_tokens
        
        # Preserve system and recent messages
        system_messages = [m for m in self.messages if m.role == MessageRole.SYSTEM]
        recent_messages = self.messages[-self.settings.preserve_recent_messages:]
        
        # Keep messages until we reach token limit
        kept_messages = system_messages.copy()
        current_tokens = sum(msg.tokens or 0 for msg in kept_messages)
        
        # Add messages from most recent backwards
        for msg in reversed(self.messages):
            if msg in kept_messages:
                continue
            
            if current_tokens + (msg.tokens or 0) <= target_tokens:
                kept_messages.append(msg)
                current_tokens += msg.tokens or 0
            else:
                self.compression_stats['tokens_saved'] += msg.tokens or 0
        
        # Sort by timestamp to maintain order
        self.messages = sorted(kept_messages, key=lambda m: m.timestamp)
    
    def _sliding_window_compress(self):
        """Sliding window compression with overlap"""
        if len(self.messages) <= self.settings.window_size:
            return
        
        # Preserve system messages
        system_messages = [m for m in self.messages if m.role == MessageRole.SYSTEM]
        non_system = [m for m in self.messages if m.role != MessageRole.SYSTEM]
        
        # Keep most recent messages with overlap
        start_idx = len(non_system) - self.settings.window_size
        if start_idx > self.settings.overlap_size:
            start_idx -= self.settings.overlap_size
        
        kept_messages = system_messages + non_system[start_idx:]
        
        # Count saved tokens
        removed_messages = non_system[:start_idx]
        self.compression_stats['tokens_saved'] += sum(msg.tokens or 0 for msg in removed_messages)
        
        self.messages = kept_messages
    
    def _semantic_summary_compress(self):
        """Create summaries of old conversation chunks"""
        if len(self.messages) < self.settings.min_messages_before_summary:
            return
        
        # Find messages to summarize (exclude system and recent)
        system_messages = [m for m in self.messages if m.role == MessageRole.SYSTEM]
        recent_messages = self.messages[-self.settings.preserve_recent_messages:]
        
        messages_to_summarize = []
        for msg in self.messages:
            if msg not in system_messages and msg not in recent_messages:
                messages_to_summarize.append(msg)
        
        if len(messages_to_summarize) < 5:
            return  # Not enough to summarize
        
        # Create summary
        summary_content = self._create_summary(messages_to_summarize)
        
        if summary_content:
            summary_msg = Message(
                role=MessageRole.SUMMARY,
                content=summary_content,
                tokens=self.estimate_tokens(summary_content),
                compressed=True,
                metadata={'original_messages': len(messages_to_summarize)}
            )
            
            # Replace old messages with summary
            self.messages = system_messages + [summary_msg] + recent_messages
            
            # Update stats
            original_tokens = sum(msg.tokens or 0 for msg in messages_to_summarize)
            self.compression_stats['tokens_saved'] += original_tokens - summary_msg.tokens
            self.compression_stats['summaries_created'] += 1
    
    def _hybrid_compress(self):
        """Hybrid compression - combines multiple strategies"""
        # First, try semantic summarization
        self._semantic_summary_compress()
        
        # If still too long, apply sliding window
        if self._needs_compression():
            self._sliding_window_compress()
        
        # If still too long, do simple truncation
        if self._needs_compression():
            self._simple_truncate()
    
    def _create_summary(self, messages: List[Message]) -> str:
        """Create a summary of messages (simple extractive approach)"""
        # Group messages by conversation turns
        conversations = []
        current_turn = []
        
        for msg in messages:
            if msg.role == MessageRole.USER and current_turn:
                conversations.append(current_turn)
                current_turn = [msg]
            else:
                current_turn.append(msg)
        
        if current_turn:
            conversations.append(current_turn)
        
        # Extract key points from conversations
        key_points = []
        for turn in conversations:
            user_msg = next((m for m in turn if m.role == MessageRole.USER), None)
            assistant_msg = next((m for m in turn if m.role == MessageRole.ASSISTANT), None)
            
            if user_msg and assistant_msg:
                # Extract first sentence or main topic
                user_summary = self._extract_main_point(user_msg.content)
                assistant_summary = self._extract_main_point(assistant_msg.content)
                
                key_points.append(f"User asked: {user_summary}\nAssistant: {assistant_summary}")
        
        if key_points:
            summary = "Previous conversation summary:\n" + "\n\n".join(key_points)
            return summary
        
        return ""
    
    def _extract_main_point(self, text: str) -> str:
        """Extract the main point from a message"""
        # Simple extraction - first sentence or first 100 chars
        sentences = re.split(r'[.!?]+', text)
        first_sentence = sentences[0].strip() if sentences else text
        
        if len(first_sentence) > 100:
            return first_sentence[:97] + "..."
        
        return first_sentence
    
    def _calculate_importance(self, message: Message) -> float:
        """Calculate importance score for a message"""
        score = 1.0
        content = message.content.lower()
        
        # System messages are always important
        if message.role == MessageRole.SYSTEM:
            return 2.0
        
        # Questions are important
        if '?' in message.content:
            score += 0.3
        
        # Code blocks are important
        if '```' in message.content or 'def ' in content or 'class ' in content:
            score += 0.4
        
        # Legal terms boost importance
        legal_terms = ['contract', 'clause', 'liability', 'jurisdiction', 'compliance', 
                      'regulation', 'statute', 'precedent', 'case law']
        for term in legal_terms:
            if term in content:
                score += 0.2
                break
        
        # Longer messages might be more important
        if len(message.content) > 200:
            score += 0.2
        
        # Metadata can influence importance
        if message.metadata.get('priority') == 'high':
            score += 0.5
        
        return min(score, 2.0)  # Cap at 2.0
    
    def _get_chat_context(self, messages: List[Message], max_tokens: int) -> List[Message]:
        """Get chat context within token limit"""
        # Sort by importance and recency
        scored_messages = []
        for i, msg in enumerate(messages):
            recency_score = i / max(len(messages) - 1, 1)  # 0 to 1
            combined_score = msg.importance_score * 0.7 + recency_score * 0.3
            scored_messages.append((combined_score, msg))
        
        # Sort by combined score (descending)
        scored_messages.sort(reverse=True)
        
        # Select messages within token limit
        selected_messages = []
        current_tokens = 0
        
        for score, msg in scored_messages:
            if current_tokens + (msg.tokens or 0) <= max_tokens:
                selected_messages.append(msg)
                current_tokens += msg.tokens or 0
        
        # Sort selected messages by timestamp to maintain conversation flow
        return sorted(selected_messages, key=lambda m: m.timestamp)
    
    def _compress_documents(self, max_tokens: int) -> str:
        """Compress document context to fit within token limit"""
        total_doc_tokens = sum(msg.tokens or 0 for msg in self.document_context)
        
        if total_doc_tokens <= max_tokens:
            return "\n\n".join(msg.content for msg in self.document_context)
        
        # Calculate compression ratio
        compression_ratio = max_tokens / total_doc_tokens
        
        compressed_docs = []
        for msg in self.document_context:
            if msg.tokens:
                target_length = int(len(msg.content) * compression_ratio)
                compressed_content = self._compress_text(msg.content, target_length)
                compressed_docs.append(compressed_content)
            else:
                compressed_docs.append(msg.content)
        
        return "\n\n".join(compressed_docs)
    
    def _compress_text(self, text: str, target_length: int) -> str:
        """Compress text to approximately target length"""
        if len(text) <= target_length:
            return text
        
        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        
        if len(sentences) <= 1:
            # Single sentence - truncate
            return text[:target_length-3] + "..."
        
        # Select most important sentences
        selected_sentences = []
        current_length = 0
        
        # Prioritize first and last sentences
        important_indices = [0, len(sentences)-1] + list(range(1, len(sentences)-1))
        
        for idx in important_indices:
            if idx < len(sentences):
                sentence = sentences[idx].strip()
                if sentence and current_length + len(sentence) <= target_length:
                    selected_sentences.append((idx, sentence))
                    current_length += len(sentence)
        
        # Sort by original order and join
        selected_sentences.sort(key=lambda x: x[0])
        return '. '.join(s[1] for s in selected_sentences) + '.'


# Global context manager instance
_global_context: Optional[SmartContextManager] = None

def get_context_manager() -> SmartContextManager:
    """Get the global context manager"""
    global _global_context
    if _global_context is None:
        _global_context = SmartContextManager()
    return _global_context

def add_message(role: Union[MessageRole, str], content: str, **metadata) -> Message:
    """Add a message to the global context"""
    if isinstance(role, str):
        role = MessageRole(role.lower())
    return get_context_manager().add_message(role, content, **metadata)

def get_context(include_documents: bool = True) -> str:
    """Get formatted context from global manager"""
    return get_context_manager().get_context_for_prompt(include_documents)

def clear_context(keep_system: bool = True):
    """Clear global context"""
    get_context_manager().clear_context(keep_system)

def get_stats() -> Dict[str, Any]:
    """Get context statistics"""
    return get_context_manager().get_context_stats()