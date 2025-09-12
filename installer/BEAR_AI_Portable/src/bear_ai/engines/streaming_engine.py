"""
Enhanced Streaming Response System with Async Patterns
Optimized for high-performance local inference with real-time streaming

Features:
- WebSocket-based streaming
- Server-Sent Events (SSE) support
- Async queue management
- Backpressure handling
- Connection pooling
- Real-time metrics

@file Streaming engine for BEAR AI local inference
@version 2.0.0
"""

import asyncio
import json
import time
import logging
import weakref
from typing import Dict, List, Optional, AsyncGenerator, Any, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import uuid
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class StreamType(Enum):
    """Types of streaming connections"""
    WEBSOCKET = "websocket"
    SSE = "sse"
    HTTP_CHUNK = "http_chunk"
    INTERNAL = "internal"


class ConnectionStatus(Enum):
    """Connection status states"""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    STREAMING = "streaming"
    PAUSED = "paused"
    ERROR = "error"
    DISCONNECTED = "disconnected"


@dataclass
class StreamToken:
    """Individual token in a stream"""
    token: str
    timestamp: float = field(default_factory=time.time)
    token_id: int = 0
    logprob: Optional[float] = None
    is_special: bool = False
    finish_reason: Optional[str] = None


@dataclass
class StreamMetadata:
    """Metadata for a streaming session"""
    stream_id: str
    request_id: str
    model_id: str
    start_time: float
    total_tokens: int = 0
    tokens_per_second: float = 0.0
    latency_ms: float = 0.0
    client_info: Dict[str, Any] = field(default_factory=dict)


class StreamConnection(ABC):
    """Abstract base class for streaming connections"""
    
    def __init__(self, connection_id: str, stream_type: StreamType):
        self.connection_id = connection_id
        self.stream_type = stream_type
        self.status = ConnectionStatus.CONNECTING
        self.created_at = time.time()
        self.last_activity = time.time()
        self.metadata: Dict[str, Any] = {}
        
    @abstractmethod
    async def send_token(self, token: StreamToken) -> bool:
        """Send a token to the client"""
        pass
    
    @abstractmethod
    async def send_metadata(self, metadata: StreamMetadata) -> bool:
        """Send metadata to the client"""
        pass
    
    @abstractmethod
    async def close(self, reason: str = "normal"):
        """Close the connection"""
        pass
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = time.time()


class WebSocketConnection(StreamConnection):
    """WebSocket streaming connection"""
    
    def __init__(self, connection_id: str, websocket):
        super().__init__(connection_id, StreamType.WEBSOCKET)
        self.websocket = websocket
        self.send_queue = asyncio.Queue(maxsize=1000)
        self.send_task: Optional[asyncio.Task] = None
        self._start_sender()
    
    def _start_sender(self):
        """Start background sender task"""
        self.send_task = asyncio.create_task(self._sender_loop())
    
    async def _sender_loop(self):
        """Background loop to send queued messages"""
        try:
            while True:
                message = await self.send_queue.get()
                if message is None:  # Shutdown signal
                    break
                
                await self.websocket.send_text(json.dumps(message))
                self.update_activity()
                
        except Exception as e:
            logger.error(f"WebSocket sender error: {e}")
            self.status = ConnectionStatus.ERROR
    
    async def send_token(self, token: StreamToken) -> bool:
        """Send token via WebSocket"""
        try:
            message = {
                "type": "token",
                "data": {
                    "token": token.token,
                    "timestamp": token.timestamp,
                    "token_id": token.token_id,
                    "logprob": token.logprob,
                    "is_special": token.is_special,
                    "finish_reason": token.finish_reason
                }
            }
            
            if self.send_queue.full():
                logger.warning(f"Send queue full for connection {self.connection_id}")
                return False
            
            await self.send_queue.put(message)
            return True
            
        except Exception as e:
            logger.error(f"Failed to send token: {e}")
            return False
    
    async def send_metadata(self, metadata: StreamMetadata) -> bool:
        """Send metadata via WebSocket"""
        try:
            message = {
                "type": "metadata",
                "data": {
                    "stream_id": metadata.stream_id,
                    "request_id": metadata.request_id,
                    "model_id": metadata.model_id,
                    "total_tokens": metadata.total_tokens,
                    "tokens_per_second": metadata.tokens_per_second,
                    "latency_ms": metadata.latency_ms
                }
            }
            
            await self.send_queue.put(message)
            return True
            
        except Exception as e:
            logger.error(f"Failed to send metadata: {e}")
            return False
    
    async def close(self, reason: str = "normal"):
        """Close WebSocket connection"""
        try:
            if self.send_task:
                await self.send_queue.put(None)  # Shutdown signal
                await self.send_task
            
            await self.websocket.close(reason=reason)
            self.status = ConnectionStatus.DISCONNECTED
            
        except Exception as e:
            logger.error(f"Error closing WebSocket: {e}")


class SSEConnection(StreamConnection):
    """Server-Sent Events streaming connection"""
    
    def __init__(self, connection_id: str, response_writer):
        super().__init__(connection_id, StreamType.SSE)
        self.response_writer = response_writer
        self.is_closed = False
    
    async def send_token(self, token: StreamToken) -> bool:
        """Send token via SSE"""
        if self.is_closed:
            return False
        
        try:
            data = {
                "token": token.token,
                "timestamp": token.timestamp,
                "token_id": token.token_id,
                "logprob": token.logprob,
                "is_special": token.is_special,
                "finish_reason": token.finish_reason
            }
            
            sse_data = f"event: token\ndata: {json.dumps(data)}\n\n"
            await self.response_writer.write(sse_data.encode())
            await self.response_writer.drain()
            
            self.update_activity()
            return True
            
        except Exception as e:
            logger.error(f"Failed to send SSE token: {e}")
            self.is_closed = True
            return False
    
    async def send_metadata(self, metadata: StreamMetadata) -> bool:
        """Send metadata via SSE"""
        if self.is_closed:
            return False
        
        try:
            data = {
                "stream_id": metadata.stream_id,
                "request_id": metadata.request_id,
                "model_id": metadata.model_id,
                "total_tokens": metadata.total_tokens,
                "tokens_per_second": metadata.tokens_per_second,
                "latency_ms": metadata.latency_ms
            }
            
            sse_data = f"event: metadata\ndata: {json.dumps(data)}\n\n"
            await self.response_writer.write(sse_data.encode())
            await self.response_writer.drain()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send SSE metadata: {e}")
            self.is_closed = True
            return False
    
    async def close(self, reason: str = "normal"):
        """Close SSE connection"""
        if not self.is_closed:
            try:
                close_data = f"event: close\ndata: {json.dumps({'reason': reason})}\n\n"
                await self.response_writer.write(close_data.encode())
                await self.response_writer.drain()
                
            except Exception as e:
                logger.error(f"Error closing SSE: {e}")
            finally:
                self.is_closed = True
                self.status = ConnectionStatus.DISCONNECTED


class InternalConnection(StreamConnection):
    """Internal async generator connection"""
    
    def __init__(self, connection_id: str):
        super().__init__(connection_id, StreamType.INTERNAL)
        self.token_queue = asyncio.Queue(maxsize=1000)
        self.metadata_queue = asyncio.Queue(maxsize=100)
        self.closed = False
    
    async def send_token(self, token: StreamToken) -> bool:
        """Send token to internal queue"""
        if self.closed:
            return False
        
        try:
            if self.token_queue.full():
                logger.warning(f"Token queue full for internal connection {self.connection_id}")
                return False
            
            await self.token_queue.put(token)
            self.update_activity()
            return True
            
        except Exception as e:
            logger.error(f"Failed to queue token: {e}")
            return False
    
    async def send_metadata(self, metadata: StreamMetadata) -> bool:
        """Send metadata to internal queue"""
        if self.closed:
            return False
        
        try:
            await self.metadata_queue.put(metadata)
            return True
            
        except Exception as e:
            logger.error(f"Failed to queue metadata: {e}")
            return False
    
    async def get_token(self) -> Optional[StreamToken]:
        """Get next token from queue"""
        try:
            return await asyncio.wait_for(self.token_queue.get(), timeout=1.0)
        except asyncio.TimeoutError:
            return None
    
    async def get_metadata(self) -> Optional[StreamMetadata]:
        """Get next metadata from queue"""
        try:
            return self.metadata_queue.get_nowait()
        except asyncio.QueueEmpty:
            return None
    
    async def close(self, reason: str = "normal"):
        """Close internal connection"""
        self.closed = True
        self.status = ConnectionStatus.DISCONNECTED
        
        # Signal end of stream
        await self.token_queue.put(None)


class BackpressureManager:
    """Manages backpressure for streaming connections"""
    
    def __init__(self, max_queue_size: int = 1000, slow_client_threshold: float = 10.0):
        self.max_queue_size = max_queue_size
        self.slow_client_threshold = slow_client_threshold  # seconds
        self.connection_stats: Dict[str, Dict[str, Any]] = {}
    
    def should_throttle(self, connection: StreamConnection) -> bool:
        """Check if connection should be throttled"""
        # Check queue size for WebSocket connections
        if hasattr(connection, 'send_queue'):
            queue_size = connection.send_queue.qsize()
            if queue_size > self.max_queue_size * 0.8:
                return True
        
        # Check for slow clients
        connection_id = connection.connection_id
        if connection_id in self.connection_stats:
            stats = self.connection_stats[connection_id]
            avg_send_time = stats.get('avg_send_time', 0)
            if avg_send_time > self.slow_client_threshold:
                return True
        
        return False
    
    def record_send_time(self, connection_id: str, send_time: float):
        """Record send time for backpressure calculation"""
        if connection_id not in self.connection_stats:
            self.connection_stats[connection_id] = {
                'send_times': [],
                'avg_send_time': 0.0
            }
        
        stats = self.connection_stats[connection_id]
        stats['send_times'].append(send_time)
        
        # Keep only recent measurements
        if len(stats['send_times']) > 10:
            stats['send_times'] = stats['send_times'][-10:]
        
        # Update average
        stats['avg_send_time'] = sum(stats['send_times']) / len(stats['send_times'])


class StreamingEngine:
    """Enhanced streaming engine with async patterns"""
    
    def __init__(self, max_concurrent_streams: int = 100):
        self.max_concurrent_streams = max_concurrent_streams
        self.active_connections: Dict[str, StreamConnection] = {}
        self.stream_metadata: Dict[str, StreamMetadata] = {}
        self.backpressure_manager = BackpressureManager()
        
        # Performance tracking
        self.total_streams = 0
        self.total_tokens_streamed = 0
        self.start_time = time.time()
        
        # Cleanup task
        self.cleanup_task: Optional[asyncio.Task] = None
        self._start_cleanup_task()
    
    def _start_cleanup_task(self):
        """Start background cleanup task"""
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
    
    async def _cleanup_loop(self):
        """Background cleanup for inactive connections"""
        while True:
            try:
                await asyncio.sleep(30)  # Run every 30 seconds
                await self._cleanup_inactive_connections()
                
            except Exception as e:
                logger.error(f"Cleanup loop error: {e}")
    
    async def _cleanup_inactive_connections(self):
        """Clean up inactive connections"""
        current_time = time.time()
        inactive_threshold = 300  # 5 minutes
        
        inactive_connections = [
            conn_id for conn_id, conn in self.active_connections.items()
            if current_time - conn.last_activity > inactive_threshold
        ]
        
        for conn_id in inactive_connections:
            logger.info(f"Cleaning up inactive connection: {conn_id}")
            await self.close_stream(conn_id, "inactive")
    
    async def create_websocket_stream(self, websocket, metadata: Dict[str, Any] = None) -> str:
        """Create a new WebSocket streaming connection"""
        if len(self.active_connections) >= self.max_concurrent_streams:
            raise Exception("Maximum concurrent streams reached")
        
        connection_id = str(uuid.uuid4())
        connection = WebSocketConnection(connection_id, websocket)
        connection.metadata = metadata or {}
        connection.status = ConnectionStatus.CONNECTED
        
        self.active_connections[connection_id] = connection
        self.total_streams += 1
        
        logger.info(f"Created WebSocket stream: {connection_id}")
        return connection_id
    
    async def create_sse_stream(self, response_writer, metadata: Dict[str, Any] = None) -> str:
        """Create a new SSE streaming connection"""
        if len(self.active_connections) >= self.max_concurrent_streams:
            raise Exception("Maximum concurrent streams reached")
        
        connection_id = str(uuid.uuid4())
        connection = SSEConnection(connection_id, response_writer)
        connection.metadata = metadata or {}
        connection.status = ConnectionStatus.CONNECTED
        
        self.active_connections[connection_id] = connection
        self.total_streams += 1
        
        logger.info(f"Created SSE stream: {connection_id}")
        return connection_id
    
    async def create_internal_stream(self, metadata: Dict[str, Any] = None) -> str:
        """Create a new internal async generator stream"""
        connection_id = str(uuid.uuid4())
        connection = InternalConnection(connection_id)
        connection.metadata = metadata or {}
        connection.status = ConnectionStatus.CONNECTED
        
        self.active_connections[connection_id] = connection
        self.total_streams += 1
        
        logger.info(f"Created internal stream: {connection_id}")
        return connection_id
    
    async def stream_tokens(self, connection_id: str, tokens: AsyncGenerator[str, None], 
                          request_id: str, model_id: str) -> StreamMetadata:
        """Stream tokens to a connection"""
        connection = self.active_connections.get(connection_id)
        if not connection:
            raise Exception(f"Connection {connection_id} not found")
        
        # Create stream metadata
        metadata = StreamMetadata(
            stream_id=connection_id,
            request_id=request_id,
            model_id=model_id,
            start_time=time.time()
        )
        
        self.stream_metadata[connection_id] = metadata
        connection.status = ConnectionStatus.STREAMING
        
        try:
            token_id = 0
            start_time = time.time()
            
            async for token_text in tokens:
                # Check for backpressure
                if self.backpressure_manager.should_throttle(connection):
                    await asyncio.sleep(0.01)  # Small delay for backpressure
                
                # Create token
                token = StreamToken(
                    token=token_text,
                    token_id=token_id,
                    timestamp=time.time()
                )
                
                # Send token
                send_start = time.time()
                success = await connection.send_token(token)
                send_time = time.time() - send_start
                
                if not success:
                    logger.warning(f"Failed to send token to {connection_id}")
                    break
                
                # Record backpressure metrics
                self.backpressure_manager.record_send_time(connection_id, send_time)
                
                # Update metadata
                token_id += 1
                metadata.total_tokens += 1
                
                # Send periodic metadata updates
                if token_id % 10 == 0:
                    current_time = time.time()
                    elapsed = current_time - start_time
                    metadata.tokens_per_second = metadata.total_tokens / elapsed if elapsed > 0 else 0
                    metadata.latency_ms = send_time * 1000
                    
                    await connection.send_metadata(metadata)
                
                self.total_tokens_streamed += 1
            
            # Send final metadata
            final_time = time.time()
            elapsed = final_time - start_time
            metadata.tokens_per_second = metadata.total_tokens / elapsed if elapsed > 0 else 0
            await connection.send_metadata(metadata)
            
            # Send completion token
            completion_token = StreamToken(
                token="",
                token_id=token_id,
                finish_reason="stop",
                timestamp=final_time
            )
            await connection.send_token(completion_token)
            
            connection.status = ConnectionStatus.CONNECTED
            logger.info(f"Stream {connection_id} completed: {metadata.total_tokens} tokens in {elapsed:.2f}s")
            
            return metadata
            
        except Exception as e:
            logger.error(f"Streaming error for {connection_id}: {e}")
            connection.status = ConnectionStatus.ERROR
            raise
    
    async def get_internal_stream(self, connection_id: str) -> AsyncGenerator[StreamToken, None]:
        """Get async generator for internal connection"""
        connection = self.active_connections.get(connection_id)
        if not connection or not isinstance(connection, InternalConnection):
            raise Exception(f"Internal connection {connection_id} not found")
        
        try:
            while True:
                token = await connection.get_token()
                if token is None:  # End of stream
                    break
                yield token
                
        except Exception as e:
            logger.error(f"Internal stream error: {e}")
            raise
    
    async def close_stream(self, connection_id: str, reason: str = "normal"):
        """Close a streaming connection"""
        connection = self.active_connections.get(connection_id)
        if not connection:
            return
        
        try:
            await connection.close(reason)
            del self.active_connections[connection_id]
            
            if connection_id in self.stream_metadata:
                del self.stream_metadata[connection_id]
            
            logger.info(f"Closed stream {connection_id}: {reason}")
            
        except Exception as e:
            logger.error(f"Error closing stream {connection_id}: {e}")
    
    def get_stream_stats(self) -> Dict[str, Any]:
        """Get streaming statistics"""
        current_time = time.time()
        uptime = current_time - self.start_time
        
        connection_stats = {}
        for conn_id, conn in self.active_connections.items():
            connection_stats[conn_id] = {
                "type": conn.stream_type.value,
                "status": conn.status.value,
                "created_at": conn.created_at,
                "last_activity": conn.last_activity,
                "idle_time": current_time - conn.last_activity
            }
        
        return {
            "total_streams_created": self.total_streams,
            "active_connections": len(self.active_connections),
            "total_tokens_streamed": self.total_tokens_streamed,
            "uptime_seconds": uptime,
            "tokens_per_second_avg": self.total_tokens_streamed / uptime if uptime > 0 else 0,
            "connections": connection_stats
        }
    
    async def shutdown(self):
        """Shutdown streaming engine"""
        logger.info("Shutting down streaming engine...")
        
        # Close all active connections
        for connection_id in list(self.active_connections.keys()):
            await self.close_stream(connection_id, "shutdown")
        
        # Cancel cleanup task
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Streaming engine shutdown complete")


# Global streaming engine instance
_global_streaming_engine: Optional[StreamingEngine] = None

def get_streaming_engine(**kwargs) -> StreamingEngine:
    """Get or create global streaming engine"""
    global _global_streaming_engine
    if _global_streaming_engine is None:
        _global_streaming_engine = StreamingEngine(**kwargs)
    return _global_streaming_engine


# Convenience functions
async def create_stream(stream_type: str, **kwargs) -> str:
    """Create a new stream of specified type"""
    engine = get_streaming_engine()
    
    if stream_type == "websocket":
        return await engine.create_websocket_stream(**kwargs)
    elif stream_type == "sse":
        return await engine.create_sse_stream(**kwargs)
    elif stream_type == "internal":
        return await engine.create_internal_stream(**kwargs)
    else:
        raise ValueError(f"Unknown stream type: {stream_type}")


async def stream_response(connection_id: str, tokens: AsyncGenerator[str, None], 
                         request_id: str, model_id: str) -> StreamMetadata:
    """Stream response tokens to connection"""
    engine = get_streaming_engine()
    return await engine.stream_tokens(connection_id, tokens, request_id, model_id)