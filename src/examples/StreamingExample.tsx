import React, { useState } from 'react';

import { StreamingChat, CompactStreamingChat, ConnectionStatus, useStreaming, useStreamingRecovery, StreamingMessage, TypingIndicator } from '../components/streaming';
import { streamingManager, setupStreaming } from '../services/streamingManager';

// Example 1: Basic Streaming Hook Usage
export const BasicStreamingExample: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const {
    isConnected,
    isStreaming,
    currentMessage,
    streamMessage,
    connect,
    disconnect,
    error,
    clearError,
    metrics
  } = useStreaming({ autoConnect: true });

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    try {
      const response = await streamMessage(input, {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000
      });
      
      setMessages(prev => [...prev, `You: ${input}`, `AI: ${response}`]);
      setInput('');
    } catch (error) {
      console.error('Streaming failed:', error);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Basic Streaming Example</h2>
      
      {/* Connection Status */}
      <div className="mb-4">
        <ConnectionStatus
          connectionState={{ 
            status: isConnected ? 'connected' : 'disconnected',
            reconnectAttempts: 0
          }}
          error={error}
          onReconnect={connect}
          onDismissError={clearError}
        />
      </div>

      {/* Messages */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-64 overflow-y-auto mb-4">
        {messages.map((message, index) => (
          <div key={index} className="mb-2">{message}</div>
        ))}
        
        {isStreaming && (
          <div className="flex items-center space-x-2">
            <TypingIndicator show={true} userName="AI" />
            <div className="text-gray-600">{currentMessage}</div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type your message..."
          disabled={!isConnected || isStreaming}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim() || !isConnected || isStreaming}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isStreaming ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Metrics */}
      <div className="mt-4 text-sm text-gray-500 grid grid-cols-4 gap-4">
        <div>Messages: {metrics.messagesStreamed}</div>
        <div>Tokens: {metrics.totalTokens}</div>
        <div>Avg Latency: {Math.round(metrics.averageLatency)}ms</div>
        <div>Errors: {metrics.errorCount}</div>
      </div>
    </div>
  );
};

// Example 2: Complete Streaming Chat
export const CompleteStreamingChatExample: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Complete Streaming Chat</h2>
      
      {/* Model Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select Model:</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="gpt-4">GPT-4</option>
          <option value="local-llama">Local Llama</option>
        </select>
      </div>

      {/* Complete Chat Interface */}
      <div className="border border-gray-300 rounded-lg h-96">
        <StreamingChat
          autoConnect={true}
          showConnectionStatus={true}
          showMetrics={true}
          maxMessages={50}
          streamingOptions={{
            model: selectedModel,
            temperature: 0.7,
            maxTokens: 2000
          }}
          onMessageSent={(message) => console.log('Message sent:', message)}
          onMessageReceived={(message) => console.log('Message received:', message)}
        />
      </div>
    </div>
  );
};

// Example 3: Recovery-Enabled Streaming
export const RecoveryStreamingExample: React.FC = () => {
  const [connectionHistory, setConnectionHistory] = useState<string[]>([]);

  const {
    isConnected,
    isStreaming,
    streamMessage,
    error,
    isRecovering,
    recoveryState,
    attemptRecovery,
    getRecoveryStats,
    resetRecoveryState
  } = useStreamingRecovery({
    autoRecover: true,
    maxRecoveryAttempts: 5,
    onRecoveryStart: (error) => {
      setConnectionHistory(prev => [...prev, `Recovery started for: ${error.message}`]);
    },
    onRecoverySuccess: (error) => {
      setConnectionHistory(prev => [...prev, `Recovery successful for: ${error.message}`]);
    },
    onRecoveryFailed: (error) => {
      setConnectionHistory(prev => [...prev, `Recovery failed for: ${error.message}`]);
    }
  });

  const recoveryStats = getRecoveryStats();

  const testConnection = async () => {
    try {
      await streamMessage('Test message for connection reliability');
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Recovery-Enabled Streaming</h2>
      
      {/* Status Dashboard */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Connection Status</h3>
          <div className="space-y-1 text-sm">
            <div>Connected: {isConnected ? '✅' : '❌'}</div>
            <div>Streaming: {isStreaming ? '🔄' : '⏸️'}</div>
            <div>Recovering: {isRecovering ? '🔧' : '✅'}</div>
            <div>Recovery Attempts: {recoveryState.recoveryAttempts}</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Recovery Stats</h3>
          <div className="space-y-1 text-sm">
            <div>Total Attempts: {recoveryStats.totalAttempts}</div>
            <div>Successful: {recoveryStats.successfulRecoveries}</div>
            <div>Success Rate: {recoveryStats.successRate.toFixed(1)}%</div>
            <div>Current Attempts: {recoveryStats.currentAttempts}</div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-red-800 dark:text-red-200">Current Error</h4>
          <p className="text-red-700 dark:text-red-300">{error.message}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Type: {error.type} | Recoverable: {error.recoverable ? 'Yes' : 'No'}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={testConnection}
          disabled={isStreaming}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          Test Connection
        </button>
        <button
          onClick={() => attemptRecovery()}
          disabled={isRecovering}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          Manual Recovery
        </button>
        <button
          onClick={resetRecoveryState}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset Stats
        </button>
      </div>

      {/* Connection History */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-40 overflow-y-auto">
        <h4 className="font-semibold mb-2">Connection History</h4>
        {connectionHistory.length === 0 ? (
          <p className="text-gray-500">No connection events yet</p>
        ) : (
          connectionHistory.map((event, index) => (
            <div key={index} className="text-sm mb-1 text-gray-600 dark:text-gray-400">
              {new Date().toLocaleTimeString()}: {event}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Example 4: Multiple Service Management
export const MultiServiceExample: React.FC = () => {
  const [services, setServices] = useState<Record<string, any>>({});
  const [selectedService, setSelectedService] = useState('default');

  const loadServiceStatus = async () => {
    const connectionStates = streamingManager.getConnectionStates();
    const metrics = streamingManager.getAllMetrics();
    const healthStatus = await streamingManager.healthCheck();
    
    setServices({
      connections: connectionStates,
      metrics,
      health: healthStatus
    });
  };

  const setupDemoServices = async () => {
    try {
      // Setup multiple services for demo
      await streamingManager.setupForModel({
        name: 'openai-gpt4',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        method: 'SSE'
      });
      
      await streamingManager.setupForModel({
        name: 'local-llama',
        endpoint: 'http://localhost:11434/api/chat',
        method: 'WebSocket'
      });
      
      await loadServiceStatus();
    } catch (error) {
      console.error('Failed to setup demo services:', error);
    }
  };

  React.useEffect(() => {
    loadServiceStatus();
    const interval = setInterval(loadServiceStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Multiple Service Management</h2>
      
      <div className="flex space-x-2 mb-4">
        <button
          onClick={setupDemoServices}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Setup Demo Services
        </button>
        <button
          onClick={loadServiceStatus}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Refresh Status
        </button>
      </div>

      {/* Service Overview */}
      {services.connections && Object.keys(services.connections).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Object.entries(services.connections).map(([name, state]: [string, any]) => (
            <div key={name} className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">{name}</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    state.status === 'connected' ? 'bg-green-100 text-green-800' :
                    state.status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {state.status}
                  </span>
                </div>
                {state.latency && (
                  <div className="flex justify-between">
                    <span>Latency:</span>
                    <span>{state.latency}ms</span>
                  </div>
                )}
                {services.health?.[name] && (
                  <div className="flex justify-between">
                    <span>Health:</span>
                    <span>{services.health[name].healthy ? '✅' : '❌'}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compact Chat Interface */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
        <h3 className="font-semibold mb-4">Quick Chat Test</h3>
        <CompactStreamingChat
          onMessage={(message) => console.log('Quick message:', message)}
        />
      </div>
    </div>
  );
};

// Main Example Component
export const StreamingExamples: React.FC = () => {
  const [activeExample, setActiveExample] = useState('basic');

  const examples = [
    { id: 'basic', name: 'Basic Streaming', component: BasicStreamingExample },
    { id: 'complete', name: 'Complete Chat', component: CompleteStreamingChatExample },
    { id: 'recovery', name: 'Error Recovery', component: RecoveryStreamingExample },
    { id: 'multi', name: 'Multi-Service', component: MultiServiceExample }
  ];

  const ActiveComponent = examples.find(ex => ex.id === activeExample)?.component || BasicStreamingExample;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">BEAR AI Streaming Examples</h1>
          <div className="flex space-x-2">
            {examples.map((example) => (
              <button
                key={example.id}
                onClick={() => setActiveExample(example.id)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeExample === example.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto py-8">
        <ActiveComponent />
      </main>
    </div>
  );
};
