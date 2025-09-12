# BEAR AI Local API Documentation

## 🏠 100% Localhost-Only Operation

This API has been completely redesigned to operate **exclusively on localhost** with **zero external dependencies**. All operations use Tauri commands and local WebSocket connections, ensuring complete privacy and security for legal work.

## 🔒 Security & Privacy Features

- **No External HTTP Requests**: All API calls use Tauri's invoke system
- **Local Authentication**: User sessions managed locally without cloud services  
- **Attorney-Client Privilege**: Complete confidentiality - no data leaves your device
- **Local Data Storage**: SQLite database and local file system
- **Offline Operation**: Works without internet connection
- **Rate Limiting**: Built-in protection against abuse
- **Session Management**: Secure local session handling

## 🏗️ Architecture Overview

### Backend (Rust/Tauri)
```
src-tauri/src/
├── main.rs           # Main application with Tauri command handlers
├── local_api.rs      # Complete local API implementation
└── Cargo.toml        # Dependencies (NO external HTTP libraries)
```

### Frontend (TypeScript)
```
src/api/
├── localClient.ts         # Tauri invoke client (replaces HTTP client)
├── localServer.ts         # Local WebSocket server
├── localApiRegistry.ts    # Central API registry
├── routes/
│   ├── localAuth.ts       # Local authentication service
│   ├── localChat.ts       # Local chat service  
│   ├── localDocuments.ts  # Local document management
│   ├── localResearch.ts   # Local legal research
│   └── localAnalysis.ts   # Local document analysis
├── docs/
│   └── localApiDocs.ts    # API documentation generator
└── testing/
    └── localApiTester.ts  # Comprehensive test suite
```

## 🚀 Quick Start

### 1. Initialize the API
```typescript
import { api } from '@/api/localApiRegistry';

// Initialize all local services
await api.initialize();
```

### 2. Authenticate
```typescript
// Local authentication (no external auth servers)
const response = await api.auth.login('admin', 'admin123');
if (response.success) {
  console.log('Authenticated locally!');
}
```

### 3. Use Services
```typescript
// All operations are local
const health = await api.health();
const docs = await api.documents.list();
const session = await api.chat.createSession('Legal Research', 'research');
```

## 📡 Real-Time Communication

### Local WebSocket Server
- **URL**: `ws://127.0.0.1:8080`
- **Purpose**: Real-time updates without external dependencies
- **Security**: Localhost-only binding

```typescript
import { localApiServer } from '@/api/localServer';

// Server status
const status = localApiServer.getStatus();
console.log(`WebSocket server: ${status.running ? 'Running' : 'Stopped'}`);
```

## 🔐 Authentication System

### Local User Management
```typescript
// Built-in test accounts (customize for production)
const credentials = [
  { username: 'admin', password: 'admin123' },
  { username: 'user', password: 'user123' },
  { username: 'demo', password: 'demo123' }
];
```

### Session Management
```typescript
// Check authentication status
const isAuth = api.auth.isAuthenticated();

// Validate current session
const isValid = await api.auth.verify();

// Refresh session
const refreshed = await api.auth.refresh();

// Logout
await api.auth.logout();
```

## 💬 Chat Service

### AI Assistant (Local Processing)
```typescript
// Create chat session
const session = await api.chat.createSession({
  title: 'Contract Analysis',
  category: 'analysis'
});

// Send message (local AI response generation)
const response = await api.chat.sendMessage(session.data.id, {
  content: 'Analyze this contract for potential risks',
  type: 'analysis'
});

console.log('AI Response:', response.data.aiResponse.content);
```

## 📄 Document Management

### Local File Operations
```typescript
// Upload document (stored locally)
const document = await api.documents.upload(file, {
  category: 'contract',
  tags: ['confidential', 'review-required']
});

// List documents with filters
const docs = await api.documents.list({
  category: 'contract',
  limit: 20
});

// Search documents locally
const results = await api.documents.search('liability clause');
```

## 🔍 Legal Research

### Local Legal Database
```typescript
// Search local legal database
const results = await api.research.search({
  query: 'contract formation elements',
  filters: {
    type: ['case', 'statute'],
    jurisdiction: 'federal'
  }
});

// Get case law suggestions
const cases = await api.research.getCaseLaw('Miranda rights');

// Format legal citations
const citation = await api.research.formatCitation('case', {
  plaintiff: 'Smith',
  defendant: 'Jones',
  volume: '123',
  reporter: 'F.3d',
  page: '456',
  court: '2d Cir.',
  year: '2020'
});
```

## 📊 Document Analysis

### Local AI Analysis
```typescript
// Analyze document locally (no cloud AI services)
const analysis = await api.analysis.analyze({
  document_id: 'doc_123',
  analysis_type: 'risk_assessment',
  options: {
    include_recommendations: true
  }
});

console.log('Risk Score:', analysis.data.result.overall_risk_score);
console.log('Local Processing:', analysis.data.local_processing); // Always true
```

### Available Analysis Types
- **Summary**: Document summarization
- **Risk Assessment**: Legal risk identification
- **Clause Extraction**: Important clause identification
- **Compliance Check**: Regulatory compliance verification
- **Citation Analysis**: Legal citation verification
- **Redaction Review**: Sensitive information identification

## 🧪 Testing

### Run Complete Test Suite
```typescript
import { runLocalApiTests } from '@/api/testing/localApiTester';

// Run all tests
const results = await runLocalApiTests();
console.log(`Tests: ${results.passed}/${results.totalTests} passed`);
```

### Test Categories
- **Authentication Tests**: Login, logout, session management
- **Chat Tests**: Message sending, AI responses, session management
- **Document Tests**: Upload, retrieve, search, delete
- **Research Tests**: Legal database search, citation formatting
- **Analysis Tests**: Document analysis, risk assessment
- **Performance Tests**: Response times, concurrent operations
- **Security Tests**: Authentication requirements, rate limiting

## 📖 API Documentation

### Generate Documentation
```typescript
import { localApiDocGenerator } from '@/api/docs/localApiDocs';

// Generate OpenAPI 3.0 documentation
const apiDoc = localApiDocGenerator.generateDocumentation();

// Generate HTML documentation
const htmlDocs = localApiDocGenerator.generateHtmlDocs();

// Generate Markdown documentation
const markdownDocs = localApiDocGenerator.generateMarkdownDocs();
```

## 🔧 Configuration

### Environment Setup
```bash
# No external services to configure!
# All configuration is local

# Tauri development
npm run tauri dev

# Build for production
npm run tauri build
```

### Local Storage Paths
```typescript
// Documents: ~/Documents/BEAR_AI/
// Database: ~/.bear_ai/database.sqlite
// Logs: ~/.bear_ai/logs/
// Cache: ~/.bear_ai/cache/
```

## 🚨 Migration from HTTP API

### Replaced Components
| Old (HTTP) | New (Local) | Purpose |
|------------|-------------|---------|
| `fetch()` calls | `invoke()` calls | API requests |
| Express server | Tauri commands | Backend logic |
| External auth | Local auth | User management |
| Cloud storage | Local storage | Data persistence |
| External AI | Local AI | Document analysis |
| HTTP WebSocket | Local WebSocket | Real-time updates |

### Code Migration Example
```typescript
// OLD (HTTP-based)
const response = await fetch('/api/documents', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
const docs = await response.json();

// NEW (Local Tauri-based)  
const docs = await api.documents.list();
```

## 📈 Performance Benefits

- **Faster Response Times**: No network latency
- **Offline Operation**: No internet dependency
- **Better Privacy**: No data transmission
- **Lower Bandwidth**: No external API calls
- **Higher Availability**: No external service downtime

## 🔒 Security Considerations

### What's Secure
- ✅ All data stays on device
- ✅ No external network communication
- ✅ Local authentication system
- ✅ Rate limiting protection
- ✅ Session timeout management

### Production Recommendations
- 🔧 Implement stronger password hashing
- 🔧 Add user role management
- 🔧 Configure appropriate session timeouts
- 🔧 Set up local database encryption
- 🔧 Implement audit logging

## 🛠️ Development

### Adding New Endpoints
1. **Add Tauri Command** (Rust):
```rust
#[tauri::command]
async fn my_new_command(param: String) -> Result<String, String> {
    // Local processing logic
    Ok(format!("Processed: {}", param))
}
```

2. **Register Command**:
```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    my_new_command
])
```

3. **Add Client Method** (TypeScript):
```typescript
async myNewMethod(param: string): Promise<string> {
  return await invoke('my_new_command', { param });
}
```

### Testing New Features
```typescript
// Add test to localApiTester.ts
await this.runTest('My New Feature', async () => {
  const result = await api.myNewMethod('test');
  if (!result) throw new Error('Should return result');
  return result;
});
```

## 📞 Support

### Troubleshooting
- **API not initializing**: Check Tauri is properly set up
- **Commands not found**: Verify command registration in main.rs
- **WebSocket errors**: Ensure port 8080 is available
- **Auth failures**: Check local credential configuration

### Debug Mode
```typescript
// Enable debug logging
localStorage.setItem('BEAR_AI_DEBUG', 'true');

// Check system status
const health = await api.health();
console.log('System Status:', health);
```

---

## 🎉 Summary

This localhost-only API implementation provides:
- **Complete Privacy**: No external data transmission
- **High Performance**: No network latency
- **Full Features**: All original API functionality maintained
- **Easy Migration**: Drop-in replacement for HTTP API
- **Comprehensive Testing**: Full test suite included
- **Complete Documentation**: OpenAPI 3.0 compliant

**Zero External Dependencies. Maximum Privacy. Full Functionality.**