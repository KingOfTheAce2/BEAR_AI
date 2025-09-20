import { StreamingOptions, StreamingMessage } from '../types/streaming';
import { streamingService, createStreamingService } from './streamingService';

// Integration with existing chat service
export class ChatStreamingIntegration {
  private streamingService = streamingService;

  async sendStreamingMessage(
    prompt: string,
    options: Partial<StreamingOptions> = {}
  ): Promise<StreamingMessage> {
    try {
      // Ensure connection
      if (this.streamingService.getConnectionState().status !== 'connected') {
        await this.streamingService.connect();
      }

      const content = await this.streamingService.streamMessage(prompt, {
        stream: true,
        ...options
      });

      return {
        id: this.generateId(),
        content,
        timestamp: new Date(),
        isComplete: true,
        type: 'assistant',
        metadata: {
          model: options.model,
          tokenCount: content.length, // Rough estimation
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Streaming failed: ${message}`);
    }
  }

  async sendBatchMessages(
    prompts: string[],
    options: Partial<StreamingOptions> = {}
  ): Promise<StreamingMessage[]> {
    const results = await Promise.allSettled(
      prompts.map(prompt => this.sendStreamingMessage(prompt, options))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<StreamingMessage> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  setupStreamingForModel(modelConfig: {
    endpoint: string;
    headers?: Record<string, string>;
    method?: 'SSE' | 'WebSocket';
  }) {
    this.streamingService = createStreamingService({
      endpoint: modelConfig.endpoint,
      method: modelConfig.method || 'SSE',
      headers: modelConfig.headers,
      reconnectAttempts: 3,
      reconnectDelay: 1000,
      timeout: 30000
    });
  }

  getConnectionStatus() {
    return this.streamingService.getConnectionState();
  }

  getMetrics() {
    return this.streamingService.getMetrics();
  }

  async disconnect() {
    await this.streamingService.disconnect();
  }

  private generateId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const chatStreamingIntegration = new ChatStreamingIntegration();