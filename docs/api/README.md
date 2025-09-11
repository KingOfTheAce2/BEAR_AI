# BEAR AI API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Core APIs](#core-apis)
3. [Service APIs](#service-apis)
4. [Component APIs](#component-apis)
5. [Tauri APIs](#tauri-apis)
6. [Examples](#examples)

## Overview

BEAR AI provides a comprehensive API layer that bridges the React frontend with the Tauri backend, offering secure and efficient access to all system capabilities.

## Core APIs

### Authentication API

```typescript
interface AuthAPI {
  login(credentials: LoginCredentials): Promise<User>;
  logout(): Promise<void>;
  validateSession(): Promise<boolean>;
  refreshToken(): Promise<string>;
}

// Usage Example
const auth = useAuth();
await auth.login({
  email: 'user@lawfirm.com',
  password: 'secure_password',
  mfa: '123456'
});
```

### Document API

```typescript
interface DocumentAPI {
  upload(file: File): Promise<Document>;
  analyze(documentId: string, options: AnalysisOptions): Promise<AnalysisResult>;
  search(query: SearchQuery): Promise<SearchResult[]>;
  export(documentId: string, format: ExportFormat): Promise<Blob>;
}

// Usage Example
const docAPI = useDocumentAPI();
const document = await docAPI.upload(selectedFile);
const analysis = await docAPI.analyze(document.id, {
  type: 'legal_terms',
  scrubPII: true,
  extractCitations: true
});
```

### Memory Management API

```typescript
interface MemoryAPI {
  getStatus(): Promise<MemoryStatus>;
  optimize(): Promise<void>;
  setThreshold(threshold: number): Promise<void>;
  monitor(callback: (status: MemoryStatus) => void): void;
}

// Usage Example
const memory = useMemory();
const status = await memory.getStatus();
if (status.usage > 0.8) {
  await memory.optimize();
}
```

## Service APIs

### Model Manager Service

```typescript
interface ModelManagerService {
  listModels(): Promise<Model[]>;
  loadModel(modelId: string): Promise<void>;
  unloadModel(modelId: string): Promise<void>;
  getRecommendations(): Promise<ModelRecommendation[]>;
  downloadModel(modelUrl: string): Promise<void>;
}

// Usage Example
const modelManager = useModelManager();
const models = await modelManager.listModels();
const recommendations = await modelManager.getRecommendations();
await modelManager.loadModel(recommendations[0].id);
```

### Streaming Service

```typescript
interface StreamingService {
  startStream(config: StreamConfig): Promise<StreamSession>;
  sendMessage(sessionId: string, message: string): AsyncIterator<StreamChunk>;
  stopStream(sessionId: string): Promise<void>;
  getStreamStatus(sessionId: string): Promise<StreamStatus>;
}

// Usage Example
const streaming = useStreaming();
const session = await streaming.startStream({
  model: 'llama-7b',
  temperature: 0.7,
  maxTokens: 2048
});

for await (const chunk of streaming.sendMessage(session.id, "Analyze this contract")) {
  console.log(chunk.content);
}
```

## Component APIs

### Chat Component

```typescript
interface ChatComponentProps {
  sessionId?: string;
  initialMessages?: Message[];
  onMessageSent?: (message: Message) => void;
  onTyping?: (isTyping: boolean) => void;
  modelConfig?: ModelConfig;
  streamingEnabled?: boolean;
}

// Usage Example
<ChatComponent
  sessionId="legal-consultation-1"
  onMessageSent={(msg) => console.log('Message sent:', msg)}
  streamingEnabled={true}
  modelConfig={{
    temperature: 0.3,
    maxTokens: 1024,
    systemPrompt: "You are a legal assistant..."
  }}
/>
```

### Document Viewer Component

```typescript
interface DocumentViewerProps {
  document: Document;
  annotations?: Annotation[];
  onAnnotationCreate?: (annotation: Annotation) => void;
  highlightTerms?: string[];
  readonly?: boolean;
}

// Usage Example
<DocumentViewer
  document={selectedDocument}
  annotations={legalAnnotations}
  highlightTerms={['contract', 'liability', 'indemnification']}
  onAnnotationCreate={handleNewAnnotation}
/>
```

## Tauri APIs

### File System Integration

```typescript
// Tauri commands for secure file operations
import { invoke } from '@tauri-apps/api/tauri';

// Read document securely
const content = await invoke('read_document', {
  path: documentPath,
  permissions: ['read']
});

// Save analysis results
await invoke('save_analysis', {
  data: analysisResults,
  path: outputPath,
  encrypt: true
});
```

### System Integration

```typescript
// System tray and notifications
import { sendNotification } from '@tauri-apps/api/notification';
import { appWindow } from '@tauri-apps/api/window';

// Show completion notification
await sendNotification({
  title: 'Analysis Complete',
  body: 'Document analysis has finished successfully',
  icon: 'icons/success.png'
});

// Window management
await appWindow.minimize();
await appWindow.setAlwaysOnTop(true);
```

## Examples

### Complete Document Analysis Workflow

```typescript
import { useDocumentAPI, useModelManager, useStreaming } from '@/hooks';

const DocumentAnalysisWorkflow = () => {
  const docAPI = useDocumentAPI();
  const modelManager = useModelManager();
  const streaming = useStreaming();

  const analyzeDocument = async (file: File) => {
    try {
      // 1. Upload document
      const document = await docAPI.upload(file);
      
      // 2. Ensure appropriate model is loaded
      const recommendations = await modelManager.getRecommendations();
      const legalModel = recommendations.find(m => m.type === 'legal');
      if (legalModel) {
        await modelManager.loadModel(legalModel.id);
      }
      
      // 3. Start streaming analysis
      const session = await streaming.startStream({
        model: legalModel?.id || 'default',
        temperature: 0.3
      });
      
      // 4. Process document with streaming
      const analysisPrompt = `Analyze this legal document for:
        - Key terms and clauses
        - Potential risks
        - Missing provisions
        - Compliance issues`;
        
      for await (const chunk of streaming.sendMessage(session.id, analysisPrompt)) {
        // Update UI with streaming results
        updateAnalysisResults(chunk);
      }
      
      // 5. Save results
      await docAPI.saveAnalysis(document.id, analysisResults);
      
    } catch (error) {
      console.error('Analysis failed:', error);
      // Handle error gracefully
    }
  };
};
```

### Memory-Safe Large Document Processing

```typescript
import { useMemory, useDocumentAPI } from '@/hooks';

const LargeDocumentProcessor = () => {
  const memory = useMemory();
  const docAPI = useDocumentAPI();

  const processLargeDocument = async (document: Document) => {
    // Monitor memory during processing
    memory.monitor((status) => {
      if (status.usage > 0.85) {
        // Pause processing if memory usage is high
        pauseProcessing();
      }
    });

    try {
      // Process document in chunks
      const chunks = await docAPI.chunkDocument(document.id, {
        chunkSize: 1024,
        overlap: 100
      });

      const results = [];
      for (const chunk of chunks) {
        // Check memory before each chunk
        const memStatus = await memory.getStatus();
        if (memStatus.usage > 0.8) {
          await memory.optimize();
        }

        const chunkResult = await docAPI.analyzeChunk(chunk);
        results.push(chunkResult);
      }

      // Combine results
      return await docAPI.combineResults(results);
    } catch (error) {
      console.error('Large document processing failed:', error);
      throw error;
    }
  };
};
```

### Plugin Development Example

```typescript
// Creating a custom legal citation plugin
import { createPlugin } from '@/extensions/plugin-architecture';

const CitationPlugin = createPlugin({
  name: 'legal-citations',
  version: '1.0.0',
  description: 'Extract and format legal citations',

  hooks: {
    beforeAnalysis: async (document) => {
      // Pre-process document for citation extraction
      return await preprocessForCitations(document);
    },

    afterAnalysis: async (results) => {
      // Post-process to format citations
      return await formatCitations(results);
    }
  },

  commands: {
    extractCitations: async (text: string) => {
      const citations = await extractLegalCitations(text);
      return formatAsBluebook(citations);
    },

    validateCitations: async (citations: Citation[]) => {
      return await validateAgainstDatabase(citations);
    }
  }
});

// Register plugin
registerPlugin(CitationPlugin);
```

## Error Handling

### API Error Responses

```typescript
interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId: string;
}

// Common error codes
enum ErrorCodes {
  UNAUTHORIZED = 'AUTH_001',
  INVALID_DOCUMENT = 'DOC_001',
  MODEL_NOT_LOADED = 'MODEL_001',
  MEMORY_LIMIT_EXCEEDED = 'MEM_001',
  PROCESSING_FAILED = 'PROC_001'
}

// Error handling example
try {
  const result = await docAPI.analyze(documentId, options);
} catch (error: APIError) {
  switch (error.code) {
    case ErrorCodes.MODEL_NOT_LOADED:
      await modelManager.loadDefaultModel();
      // Retry operation
      break;
    case ErrorCodes.MEMORY_LIMIT_EXCEEDED:
      await memory.optimize();
      // Retry with reduced options
      break;
    default:
      showErrorNotification(error.message);
  }
}
```

## API Testing

### Unit Testing APIs

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useDocumentAPI } from '@/hooks';

describe('DocumentAPI', () => {
  test('should upload document successfully', async () => {
    const { result } = renderHook(() => useDocumentAPI());
    
    const mockFile = new File(['content'], 'test.pdf', {
      type: 'application/pdf'
    });

    await act(async () => {
      const document = await result.current.upload(mockFile);
      expect(document.id).toBeDefined();
      expect(document.status).toBe('ready');
    });
  });

  test('should handle upload errors gracefully', async () => {
    const { result } = renderHook(() => useDocumentAPI());
    
    const invalidFile = new File([''], 'empty.txt', {
      type: 'text/plain'
    });

    await act(async () => {
      await expect(result.current.upload(invalidFile))
        .rejects.toThrow('Invalid document format');
    });
  });
});
```

For more detailed examples and advanced usage patterns, see the [Implementation Guide](../implementation/IMPLEMENTATION_GUIDE.md).