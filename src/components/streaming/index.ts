// Streaming components exports
export { StreamingMessage, StreamingLoader, StreamingProgress, TypingIndicator } from './StreamingMessage';
export { ConnectionStatus, CompactConnectionStatus } from './ConnectionStatus';
export { StreamingChat, CompactStreamingChat } from './StreamingChat';

// Re-export types for convenience
export type {
  StreamingMessage as IStreamingMessage,
  StreamingChunk,
  StreamingConfig,
  ConnectionState,
  StreamingError,
  StreamingOptions,
  StreamingMetrics,
  StreamingEvent
} from '../../types/streaming';

// Re-export hooks
export { useStreaming, useMultipleStreams } from '../../hooks/useStreaming';
export { useStreamingRecovery, useRecoveryMonitor } from '../../hooks/useStreamingRecovery';

// Re-export service
export { streamingService, createStreamingService, StreamingService } from '../../services/streamingService';
