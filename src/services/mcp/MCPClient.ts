/**
 * Model Context Protocol (MCP) Client
 * Client-side implementation similar to ruv.io/mcp
 * Handles AI model coordination, context management, and tool calling
 */

import { EventEmitter } from 'events';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any) => Promise<any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  content?: string | Buffer;
}

export interface MCPContext {
  resources: MCPResource[];
  tools: MCPTool[];
  prompts: MCPPrompt[];
  memory: MCPMemory;
  metadata: Record<string, any>;
}

export interface MCPPrompt {
  name: string;
  description: string;
  template: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export interface MCPMemory {
  shortTerm: Map<string, any>;
  longTerm: Map<string, any>;
  episodic: Array<MCPEpisode>;
}

export interface MCPEpisode {
  id: string;
  timestamp: Date;
  input: string;
  output: string;
  context: any;
  tools: string[];
  success: boolean;
}

export interface MCPMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: MCPToolCall[];
  toolCallId?: string;
  metadata?: Record<string, any>;
}

export interface MCPToolCall {
  id: string;
  name: string;
  arguments: any;
  result?: any;
  error?: string;
}

export interface MCPSession {
  id: string;
  model: string;
  messages: MCPMessage[];
  context: MCPContext;
  activeTools: Set<string>;
  createdAt: Date;
  lastActivity: Date;
}

export interface MCPModelConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  systemPrompt?: string;
}

/**
 * MCP Client - Manages AI model interactions with context and tools
 */
export class MCPClient extends EventEmitter {
  private static instance: MCPClient;
  private sessions: Map<string, MCPSession> = new Map();
  private tools: Map<string, MCPTool> = new Map();
  private resources: Map<string, MCPResource> = new Map();
  private prompts: Map<string, MCPPrompt> = new Map();
  private globalMemory: MCPMemory;
  private currentSession: MCPSession | null = null;

  // Built-in tools
  private readonly BUILTIN_TOOLS: MCPTool[] = [
    {
      name: 'search_documents',
      description: 'Search through available documents',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', description: 'Maximum results' }
        },
        required: ['query']
      },
      handler: async (args) => this.searchDocuments(args)
    },
    {
      name: 'extract_text',
      description: 'Extract text from a document',
      inputSchema: {
        type: 'object',
        properties: {
          uri: { type: 'string', description: 'Document URI' },
          page: { type: 'number', description: 'Page number (optional)' }
        },
        required: ['uri']
      },
      handler: async (args) => this.extractText(args)
    },
    {
      name: 'analyze_content',
      description: 'Analyze content for specific information',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Content to analyze' },
          analysis_type: {
            type: 'string',
            enum: ['summary', 'entities', 'sentiment', 'key_points'],
            description: 'Type of analysis'
          }
        },
        required: ['content', 'analysis_type']
      },
      handler: async (args) => this.analyzeContent(args)
    },
    {
      name: 'store_memory',
      description: 'Store information in memory',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Memory key' },
          value: { type: 'any', description: 'Value to store' },
          type: {
            type: 'string',
            enum: ['short', 'long'],
            description: 'Memory type'
          }
        },
        required: ['key', 'value']
      },
      handler: async (args) => this.storeMemory(args)
    },
    {
      name: 'retrieve_memory',
      description: 'Retrieve information from memory',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Memory key' },
          type: {
            type: 'string',
            enum: ['short', 'long', 'episodic'],
            description: 'Memory type'
          }
        },
        required: ['key']
      },
      handler: async (args) => this.retrieveMemory(args)
    }
  ];

  private constructor() {
    super();
    this.globalMemory = {
      shortTerm: new Map(),
      longTerm: new Map(),
      episodic: []
    };
    this.initializeBuiltinTools();
  }

  public static getInstance(): MCPClient {
    if (!MCPClient.instance) {
      MCPClient.instance = new MCPClient();
    }
    return MCPClient.instance;
  }

  /**
   * Initialize built-in tools
   */
  private initializeBuiltinTools(): void {
    this.BUILTIN_TOOLS.forEach(tool => {
      this.registerTool(tool);
    });
  }

  /**
   * Create a new MCP session
   */
  public createSession(config: MCPModelConfig): MCPSession {
    const session: MCPSession = {
      id: this.generateSessionId(),
      model: config.model,
      messages: [],
      context: {
        resources: Array.from(this.resources.values()),
        tools: Array.from(this.tools.values()),
        prompts: Array.from(this.prompts.values()),
        memory: {
          shortTerm: new Map(this.globalMemory.shortTerm),
          longTerm: new Map(this.globalMemory.longTerm),
          episodic: [...this.globalMemory.episodic]
        },
        metadata: {
          config
        }
      },
      activeTools: new Set(this.tools.keys()),
      createdAt: new Date(),
      lastActivity: new Date()
    };

    // Add system prompt if provided
    if (config.systemPrompt) {
      session.messages.push({
        role: 'system',
        content: config.systemPrompt
      });
    }

    this.sessions.set(session.id, session);
    this.currentSession = session;
    this.emit('session:created', session);

    return session;
  }

  /**
   * Send a message in the current session
   */
  public async sendMessage(
    content: string,
    sessionId?: string
  ): Promise<MCPMessage> {
    const session = sessionId ?
      this.sessions.get(sessionId) :
      this.currentSession;

    if (!session) {
      throw new Error('No active session');
    }

    // Add user message
    const userMessage: MCPMessage = {
      role: 'user',
      content,
      metadata: {
        timestamp: new Date()
      }
    };
    session.messages.push(userMessage);

    // Process with AI model
    const response = await this.processWithModel(session, content);

    // Handle tool calls if any
    if (response.toolCalls && response.toolCalls.length > 0) {
      await this.executeToolCalls(session, response.toolCalls);
    }

    // Update session
    session.lastActivity = new Date();
    this.emit('message:sent', { session, message: response });

    return response;
  }

  /**
   * Register a tool
   */
  public registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    this.emit('tool:registered', tool);
  }

  /**
   * Register a resource
   */
  public registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
    this.emit('resource:registered', resource);
  }

  /**
   * Register a prompt template
   */
  public registerPrompt(prompt: MCPPrompt): void {
    this.prompts.set(prompt.name, prompt);
    this.emit('prompt:registered', prompt);
  }

  /**
   * Execute tool calls
   */
  private async executeToolCalls(
    session: MCPSession,
    toolCalls: MCPToolCall[]
  ): Promise<void> {
    for (const call of toolCalls) {
      const tool = this.tools.get(call.name);

      if (!tool) {
        call.error = `Tool ${call.name} not found`;
        continue;
      }

      try {
        // Validate arguments against schema
        this.validateToolArguments(tool, call.arguments);

        // Execute tool
        call.result = await tool.handler(call.arguments);

        // Add tool result message
        session.messages.push({
          role: 'tool',
          content: JSON.stringify(call.result),
          toolCallId: call.id
        });

        this.emit('tool:executed', { tool: call.name, result: call.result });
      } catch (error) {
        call.error = error instanceof Error ? error.message : String(error);

        session.messages.push({
          role: 'tool',
          content: `Error: ${call.error}`,
          toolCallId: call.id
        });

        this.emit('tool:error', { tool: call.name, error: call.error });
      }
    }
  }

  /**
   * Process message with AI model
   */
  private async processWithModel(
    session: MCPSession,
    content: string
  ): Promise<MCPMessage> {
    // Build context for model
    const context = this.buildContext(session);

    // Prepare messages for API
    const messages = this.prepareMessages(session);

    try {
      // This would call your actual AI model API
      // For now, using a mock implementation
      const response = await this.callModelAPI(session.model, messages, context);

      // Parse response for tool calls
      const toolCalls = this.parseToolCalls(response);

      const assistantMessage: MCPMessage = {
        role: 'assistant',
        content: response.content || '',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      };

      session.messages.push(assistantMessage);

      // Record episode
      this.recordEpisode(session, content, assistantMessage.content, toolCalls);

      return assistantMessage;
    } catch (error) {
      throw new Error(`Model API error: ${error}`);
    }
  }

  /**
   * Build context for model
   */
  private buildContext(session: MCPSession): string {
    const parts: string[] = [];

    // Add available tools
    if (session.activeTools.size > 0) {
      const tools = Array.from(session.activeTools)
        .map(name => this.tools.get(name))
        .filter(tool => tool !== undefined)
        .map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }));

      parts.push(`Available tools:\n${JSON.stringify(tools, null, 2)}`);
    }

    // Add resources
    if (session.context.resources.length > 0) {
      const resources = session.context.resources.map(r => ({
        uri: r.uri,
        name: r.name,
        description: r.description
      }));

      parts.push(`Available resources:\n${JSON.stringify(resources, null, 2)}`);
    }

    // Add relevant memory
    const memory = this.getRelevantMemory(session);
    if (memory) {
      parts.push(`Relevant context:\n${memory}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Prepare messages for API
   */
  private prepareMessages(session: MCPSession): any[] {
    return session.messages.map(msg => {
      const prepared: any = {
        role: msg.role,
        content: msg.content
      };

      if (msg.toolCalls) {
        prepared.tool_calls = msg.toolCalls;
      }

      if (msg.toolCallId) {
        prepared.tool_call_id = msg.toolCallId;
      }

      return prepared;
    });
  }

  /**
   * Parse tool calls from model response
   */
  private parseToolCalls(response: any): MCPToolCall[] {
    const toolCalls: MCPToolCall[] = [];

    // Check if response contains tool calls
    if (response.tool_calls) {
      response.tool_calls.forEach((call: any) => {
        toolCalls.push({
          id: call.id || this.generateToolCallId(),
          name: call.function.name,
          arguments: JSON.parse(call.function.arguments)
        });
      });
    }

    return toolCalls;
  }

  /**
   * Validate tool arguments against schema
   */
  private validateToolArguments(tool: MCPTool, args: any): void {
    const schema = tool.inputSchema;

    // Check required properties
    if (schema.required) {
      for (const prop of schema.required) {
        if (!(prop in args)) {
          throw new Error(`Missing required argument: ${prop}`);
        }
      }
    }

    // Validate property types
    for (const [key, value] of Object.entries(args)) {
      if (key in schema.properties) {
        const propSchema = schema.properties[key];

        // Basic type validation
        if (propSchema.type && typeof value !== propSchema.type) {
          throw new Error(`Invalid type for ${key}: expected ${propSchema.type}`);
        }

        // Enum validation
        if (propSchema.enum && !propSchema.enum.includes(value)) {
          throw new Error(`Invalid value for ${key}: must be one of ${propSchema.enum}`);
        }
      }
    }
  }

  /**
   * Record episode in memory
   */
  private recordEpisode(
    session: MCPSession,
    input: string,
    output: string,
    toolCalls: MCPToolCall[]
  ): void {
    const episode: MCPEpisode = {
      id: this.generateEpisodeId(),
      timestamp: new Date(),
      input,
      output,
      context: {
        sessionId: session.id,
        model: session.model
      },
      tools: toolCalls.map(tc => tc.name),
      success: !toolCalls.some(tc => tc.error)
    };

    this.globalMemory.episodic.push(episode);
    session.context.memory.episodic.push(episode);

    // Keep only last 100 episodes
    if (this.globalMemory.episodic.length > 100) {
      this.globalMemory.episodic = this.globalMemory.episodic.slice(-100);
    }
  }

  /**
   * Get relevant memory for context
   */
  private getRelevantMemory(session: MCPSession): string | null {
    const relevantItems: string[] = [];

    // Get recent short-term memory
    const shortTermItems = Array.from(session.context.memory.shortTerm.entries())
      .slice(-5)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);

    if (shortTermItems.length > 0) {
      relevantItems.push(`Recent context:\n${shortTermItems.join('\n')}`);
    }

    // Get similar episodes
    const recentEpisodes = session.context.memory.episodic
      .slice(-3)
      .map(e => `[${e.timestamp.toISOString()}] Q: ${e.input}\nA: ${e.output}`);

    if (recentEpisodes.length > 0) {
      relevantItems.push(`Previous interactions:\n${recentEpisodes.join('\n\n')}`);
    }

    return relevantItems.length > 0 ? relevantItems.join('\n\n') : null;
  }

  /**
   * Built-in tool implementations
   */

  private async searchDocuments(args: any): Promise<any> {
    const results: any[] = [];

    for (const [uri, resource] of this.resources) {
      if (resource.content &&
          resource.content.toString().toLowerCase()
            .includes(args.query.toLowerCase())) {
        results.push({
          uri: resource.uri,
          name: resource.name,
          snippet: this.extractSnippet(resource.content.toString(), args.query)
        });

        if (results.length >= (args.limit || 10)) break;
      }
    }

    return results;
  }

  private async extractText(args: any): Promise<string> {
    const resource = this.resources.get(args.uri);

    if (!resource) {
      throw new Error(`Resource not found: ${args.uri}`);
    }

    if (!resource.content) {
      throw new Error(`Resource has no content: ${args.uri}`);
    }

    return resource.content.toString();
  }

  private async analyzeContent(args: any): Promise<any> {
    // This would call actual analysis APIs
    // For now, return mock analysis
    switch (args.analysis_type) {
      case 'summary':
        return {
          summary: args.content.substring(0, 200) + '...',
          word_count: args.content.split(/\s+/).length
        };

      case 'entities':
        return {
          entities: [
            { type: 'PERSON', text: 'John Doe' },
            { type: 'ORG', text: 'Example Corp' }
          ]
        };

      case 'sentiment':
        return {
          sentiment: 'neutral',
          score: 0.5
        };

      case 'key_points':
        return {
          key_points: [
            'Main topic discussed',
            'Important conclusion',
            'Action items'
          ]
        };

      default:
        throw new Error(`Unknown analysis type: ${args.analysis_type}`);
    }
  }

  private async storeMemory(args: any): Promise<void> {
    const memoryType = args.type || 'short';

    if (memoryType === 'short') {
      this.globalMemory.shortTerm.set(args.key, args.value);
      if (this.currentSession) {
        this.currentSession.context.memory.shortTerm.set(args.key, args.value);
      }
    } else {
      this.globalMemory.longTerm.set(args.key, args.value);
      if (this.currentSession) {
        this.currentSession.context.memory.longTerm.set(args.key, args.value);
      }
    }

    return { stored: true, type: memoryType, key: args.key };
  }

  private async retrieveMemory(args: any): Promise<any> {
    const memoryType = args.type || 'short';

    if (memoryType === 'episodic') {
      return this.globalMemory.episodic
        .filter(e => e.input.includes(args.key) || e.output.includes(args.key))
        .slice(-5);
    }

    const memory = memoryType === 'short' ?
      this.globalMemory.shortTerm :
      this.globalMemory.longTerm;

    return memory.get(args.key) || null;
  }

  /**
   * Call actual model API
   */
  private async callModelAPI(
    model: string,
    messages: any[],
    context: string
  ): Promise<any> {
    // This is where you'd integrate with your actual AI model
    // For now, returning a mock response

    // Check if tools should be called based on the last message
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content.toLowerCase();

    // Simulate tool calling
    if (content.includes('search')) {
      return {
        content: 'I\'ll search for that information.',
        tool_calls: [{
          id: this.generateToolCallId(),
          function: {
            name: 'search_documents',
            arguments: JSON.stringify({ query: content, limit: 5 })
          }
        }]
      };
    }

    // Regular response
    return {
      content: `I understand your request about: ${content}. Based on the context provided, here's my response...`
    };
  }

  /**
   * Helper methods
   */

  private extractSnippet(text: string, query: string, contextLength: number = 100): string {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text.substring(0, 200);

    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + query.length + contextLength);

    return '...' + text.substring(start, end) + '...';
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateToolCallId(): string {
    return `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEpisodeId(): string {
    return `episode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public utility methods
   */

  public getSession(sessionId: string): MCPSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getCurrentSession(): MCPSession | null {
    return this.currentSession;
  }

  public setCurrentSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.currentSession = session;
    }
  }

  public listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  public listResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  public listPrompts(): MCPPrompt[] {
    return Array.from(this.prompts.values());
  }

  public clearMemory(type?: 'short' | 'long' | 'episodic'): void {
    if (!type || type === 'short') {
      this.globalMemory.shortTerm.clear();
    }
    if (!type || type === 'long') {
      this.globalMemory.longTerm.clear();
    }
    if (!type || type === 'episodic') {
      this.globalMemory.episodic = [];
    }
  }
}

// Export singleton instance
export const mcpClient = MCPClient.getInstance();