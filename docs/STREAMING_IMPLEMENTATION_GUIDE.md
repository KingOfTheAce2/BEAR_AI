# BEAR AI Streaming Implementation Guide

## Overview

This document provides a comprehensive guide to the streaming response capabilities implemented in BEAR AI, including Server-Sent Events (SSE), WebSocket support, and robust error recovery mechanisms.

## Architecture

### Core Components

1. **StreamingService** - Core service handling SSE and WebSocket connections
2. **StreamingManager** - Manages multiple streaming services and configurations
3. **Error Recovery System** - Automatic fallback and reconnection strategies
4. **React Components** - UI components for streaming chat interfaces
5. **React Hooks** - Custom hooks for streaming state management

### File Structure

```
src/
├── types/
│   └── streaming.ts              # Type definitions
├── services/
│   ├── streamingService.ts       # Core streaming service
│   ├── streamingManager.ts       # Service management
│   ├── errorRecovery.ts          # Error recovery strategies
│   └── chatIntegration.ts        # Chat service integration
├── hooks/
│   ├── useStreaming.ts           # Basic streaming hook
│   └── useStreamingRecovery.ts   # Recovery-enabled hook
├── components/streaming/
│   ├── StreamingMessage.tsx      # Message component with typewriter effect
│   ├── ConnectionStatus.tsx      # Connection status indicators
│   ├── StreamingChat.tsx         # Complete chat interface
│   └── index.ts                  # Component exports
└── utils/
    └── streamingConfig.ts        # Configuration utilities
```

## Quick Start

### 1. Basic Streaming Hook

```typescript
import { useStreaming } from '../hooks/useStreaming';

function ChatComponent() {
  const {
    isConnected,
    isStreaming,
    currentMessage,
    streamMessage,
    connect,
    error
  } = useStreaming({ autoConnect: true });

  const handleSendMessage = async (prompt: string) => {
    try {
      const response = await streamMessage(prompt);
      console.log('Complete response:', response);
    } catch (error) {
      console.error('Streaming failed:', error);
    }
  };

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {isStreaming && <div>Current: {currentMessage}</div>}
      <button onClick={() => handleSendMessage('Hello AI!')}>
        Send Message
      </button>
    </div>
  );
}
```

### 2. Complete Streaming Chat

```typescript
import { StreamingChat } from '../components/streaming';

function App() {
  return (
    <StreamingChat
      autoConnect={true}
      showConnectionStatus={true}
      showMetrics={true}
      onMessageSent={(message) => console.log('Sent:', message)}
      onMessageReceived={(message) => console.log('Received:', message)}
    />
  );
}
```

### 3. Service Manager Setup

```typescript
import { streamingManager, setupStreaming } from '../services/streamingManager';

// Setup for development environment
await setupStreaming('development');

// Setup for specific model
await streamingManager.setupForModel({
  name: 'openai-gpt4',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: 'your-api-key',
  method: 'SSE'
});
```

## Configuration

### Environment Configurations

The system supports multiple predefined configurations:

```typescript
// Development (WebSocket)
const devConfig = getStreamingConfig('development');

// Production (SSE)
const prodConfig = getStreamingConfig('production');

// OpenAI Compatible
const openaiConfig = getStreamingConfig('openai');

// Local AI Models
const localConfig = getStreamingConfig('local');
```

### Custom Configuration

```typescript
import { createStreamingService } from '../services/streamingService';

const customService = createStreamingService({
  endpoint: 'wss://your-endpoint.com/stream',
  method: 'WebSocket',
  reconnectAttempts: 5,
  reconnectDelay: 2000,
  timeout: 60000,
  headers: {
    'Authorization': 'Bearer your-token',
    'Custom-Header': 'value'
  }
});
```

## Error Recovery

### Automatic Recovery Strategies

The system includes built-in recovery strategies:

1. **Reconnection** - Automatic reconnection with exponential backoff
2. **Endpoint Fallback** - Switch to HTTP when streaming fails
3. **Method Switching** - Fall back from WebSocket to SSE or vice versa
4. **Cache Clearing** - Clear browser caches on parse errors
5. **Page Refresh** - Last resort for persistent connection issues

### Using Recovery Hook

```typescript
import { useStreamingRecovery } from '../hooks/useStreamingRecovery';

function RecoveryEnabledChat() {
  const {
    streamMessage,
    isRecovering,
    recoveryState,
    attemptRecovery,
    getRecoveryStats
  } = useStreamingRecovery({
    autoRecover: true,
    maxRecoveryAttempts: 3,
    onRecoverySuccess: (error) => console.log('Recovered from:', error),
    onRecoveryFailed: (error) => console.log('Recovery failed:', error)
  });

  const stats = getRecoveryStats();
  
  return (
    <div>
      {isRecovering && <div>Attempting to recover connection...</div>}
      <div>Recovery Success Rate: {stats.successRate}%</div>
      <button onClick={() => attemptRecovery()}>Manual Recovery</button>
    </div>
  );
}
```

## Component Reference

### StreamingMessage

Displays individual messages with typewriter effect:

```typescript
<StreamingMessage
  message={messageObject}
  isStreaming={true}
  showTimestamp={true}
  onComplete={() => console.log('Message complete')}
/>
```

### ConnectionStatus

Shows connection state and error information:

```typescript
<ConnectionStatus
  connectionState={connectionState}
  error={error}
  onReconnect={connect}
  onDismissError={clearError}
  showDetails={true}
/>
```

### StreamingChat

Complete chat interface with all features:

```typescript
<StreamingChat
  autoConnect={true}
  showConnectionStatus={true}
  showMetrics={true}
  maxMessages={100}
  streamingOptions={{
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000
  }}
/>
```

## Integration Examples

### Integration with Existing Chat Service

```typescript
import { chatStreamingIntegration } from '../services/chatIntegration';

// Send streaming message
const response = await chatStreamingIntegration.sendStreamingMessage(
  'Hello, how are you?',
  { model: 'gpt-4', temperature: 0.7 }
);

// Send multiple messages
const responses = await chatStreamingIntegration.sendBatchMessages([
  'What is AI?',
  'How does machine learning work?',
  'Explain neural networks'
]);
```

### Multiple Concurrent Streams

```typescript
import { useMultipleStreams } from '../hooks/useStreaming';

function MultiStreamChat() {
  const {
    streams,
    activeStreamCount,
    startStream,
    removeStream
  } = useMultipleStreams(3); // Max 3 concurrent streams

  const handleMultipleQuestions = async () => {
    await startStream('q1', 'What is the weather?');
    await startStream('q2', 'What is the time?');
    await startStream('q3', 'What is AI?');
  };

  return (
    <div>
      <div>Active Streams: {activeStreamCount}</div>
      {Array.from(streams.values()).map(stream => (
        <div key={stream.id}>
          <strong>{stream.prompt}</strong>
          <div>{stream.response}</div>
          {stream.isComplete && <span>✓</span>}
        </div>
      ))}
    </div>
  );
}
```

## Performance Optimization

### Performance Profiles

```typescript
import { applyPerformanceProfile } from '../utils/streamingConfig';

// High throughput (low latency, fewer retries)
const fastConfig = applyPerformanceProfile(baseConfig, 'highThroughput');

// Reliable (more retries, higher timeout)
const reliableConfig = applyPerformanceProfile(baseConfig, 'reliable');

// Balanced (default)
const balancedConfig = applyPerformanceProfile(baseConfig, 'balanced');
```

### Health Monitoring

```typescript
import { streamingManager } from '../services/streamingManager';

// Check health of all services
const healthStatus = await streamingManager.healthCheck();

// Get performance metrics
const metrics = streamingManager.getAllMetrics();

// Find optimal service
const bestService = streamingManager.getOptimalService();
```

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check endpoint URL and network connectivity
   - Verify CORS settings for cross-origin requests
   - Ensure proper authentication headers

2. **Parsing Errors**
   - Validate server response format
   - Check for malformed JSON in streaming data
   - Clear browser cache if needed

3. **High Latency**
   - Switch to faster endpoint or method
   - Reduce message size or token limits
   - Use performance profiles

### Debug Mode

Enable detailed logging:

```typescript
// Add to your app initialization
if (process.env.NODE_ENV === 'development') {
  streamingService.on('chunk', (chunk) => console.log('Chunk:', chunk));
  streamingService.on('error', (error) => console.error('Error:', error));
  streamingService.on('connect', () => console.log('Connected'));
}
```

## Best Practices

1. **Always handle errors gracefully**
2. **Use appropriate performance profiles for your use case**
3. **Implement proper loading states and user feedback**
4. **Monitor connection health and metrics**
5. **Test fallback mechanisms thoroughly**
6. **Use recovery hooks for mission-critical applications**
7. **Implement proper cleanup in useEffect hooks**

## API Reference

For detailed API documentation, see:
- [StreamingService API](../src/services/streamingService.ts)
- [Hooks API](../src/hooks/useStreaming.ts)
- [Components API](../src/components/streaming/)
- [Configuration API](../src/utils/streamingConfig.ts)