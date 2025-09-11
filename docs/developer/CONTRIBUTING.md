# Contributing to BEAR AI Legal Assistant

Thank you for your interest in contributing to BEAR AI! This guide will help you get started with development and understand our contribution process.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Architecture Overview](#architecture-overview)
5. [Contribution Guidelines](#contribution-guidelines)
6. [Testing Requirements](#testing-requirements)
7. [Documentation Standards](#documentation-standards)
8. [Pull Request Process](#pull-request-process)
9. [Release Process](#release-process)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of background, experience level, or personal characteristics.

### Expected Behavior

- **Be respectful**: Treat all community members with respect and kindness
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Help newcomers learn and contribute effectively
- **Be professional**: Maintain professional standards in all communications

### Unacceptable Behavior

- Harassment, discrimination, or personal attacks
- Spam, trolling, or disruptive behavior
- Sharing others' private information without permission
- Any conduct that would be inappropriate in a professional setting

## Getting Started

### Prerequisites

Before contributing, ensure you have:

```bash
# Required tools
node >= 18.0.0
npm >= 8.0.0
rust >= 1.70.0
git >= 2.30.0

# Platform-specific dependencies
# See INSTALLATION_GUIDE.md for details
```

### Development Environment

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/BEAR_AI.git
   cd BEAR_AI
   ```

2. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/KingOfTheAce2/BEAR_AI.git
   ```

3. **Install Dependencies**
   ```bash
   npm install
   cd src-tauri && cargo build
   ```

4. **Verify Setup**
   ```bash
   npm run test
   npm run typecheck
   npm run lint
   ```

## Development Setup

### Repository Structure

```
BEAR_AI/
├── src/                     # React frontend source
│   ├── components/          # React components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Business logic and APIs
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── src-tauri/              # Tauri backend (Rust)
│   ├── src/                # Rust source code
│   ├── icons/              # Application icons
│   └── Cargo.toml          # Rust dependencies
├── docs/                   # Documentation
├── tests/                  # Test files
├── scripts/                # Build and utility scripts
└── public/                 # Static assets
```

### Development Scripts

```bash
# Development
npm run dev                 # Start development server
npm run tauri dev          # Start with Tauri backend

# Building
npm run build              # Build for production
npm run tauri build        # Build Tauri application

# Testing
npm run test               # Run unit tests
npm run test:coverage      # Run tests with coverage
npm run test:e2e          # Run end-to-end tests

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix          # Fix linting issues
npm run typecheck         # TypeScript type checking
npm run format            # Format code with Prettier

# Documentation
npm run docs:build        # Build documentation
npm run docs:serve        # Serve documentation locally
```

### Environment Configuration

Create `.env.local` for development:

```env
# Development settings
REACT_APP_ENV=development
REACT_APP_LOG_LEVEL=debug

# API configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001

# Feature flags
REACT_APP_ENABLE_EXPERIMENTAL=true
REACT_APP_DEBUG_MODE=true

# Testing
REACT_APP_MOCK_API=false
REACT_APP_E2E_MODE=false
```

## Architecture Overview

### Frontend Architecture (React + TypeScript)

#### Component Structure
```typescript
// Component organization pattern
src/components/
├── ui/                     # Reusable UI components
│   ├── Button/
│   ├── Input/
│   └── Modal/
├── layout/                 # Layout components
│   ├── Header/
│   ├── Sidebar/
│   └── Footer/
├── pages/                  # Page components
│   ├── Dashboard/
│   ├── Documents/
│   └── Settings/
└── features/               # Feature-specific components
    ├── chat/
    ├── analysis/
    └── search/
```

#### State Management
```typescript
// Context-based state management
src/contexts/
├── AuthContext.tsx        # Authentication state
├── ThemeContext.tsx       # UI theme state
├── AppContext.tsx         # Global application state
└── MemoryContext.tsx      # Memory monitoring state
```

#### Service Layer
```typescript
// Business logic separation
src/services/
├── api/                   # API communication
├── auth/                  # Authentication logic
├── storage/               # Local storage management
├── models/                # AI model management
└── security/              # Security utilities
```

### Backend Architecture (Tauri + Rust)

#### Command Structure
```rust
// Tauri command organization
src-tauri/src/
├── commands/              # Tauri commands (API endpoints)
│   ├── auth.rs
│   ├── documents.rs
│   ├── models.rs
│   └── security.rs
├── services/              # Business logic services
│   ├── document_service.rs
│   ├── model_service.rs
│   └── security_service.rs
├── utils/                 # Utility functions
└── main.rs               # Application entry point
```

#### Memory Management
```rust
// Memory-safe operations
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::services::MemoryMonitor;

// Shared state with memory monitoring
pub struct AppState {
    memory_monitor: Arc<RwLock<MemoryMonitor>>,
    document_cache: Arc<RwLock<DocumentCache>>,
    model_manager: Arc<RwLock<ModelManager>>,
}
```

## Contribution Guidelines

### Code Style

#### TypeScript/React

```typescript
// Use functional components with hooks
const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  document, 
  onAnalyze 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();
  
  // Use proper typing
  const handleAnalyze = useCallback(async (options: AnalysisOptions) => {
    setIsLoading(true);
    try {
      const result = await analyzeDocument(document.id, options);
      onAnalyze?.(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [document.id, onAnalyze]);

  return (
    <div className={cn('document-viewer', theme)}>
      {/* Component JSX */}
    </div>
  );
};
```

#### Rust

```rust
// Use idiomatic Rust patterns
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentAnalysis {
    id: String,
    confidence: f64,
    findings: Vec<Finding>,
}

#[command]
pub async fn analyze_document(
    app_handle: tauri::AppHandle,
    document_id: String,
    options: AnalysisOptions,
) -> Result<DocumentAnalysis, String> {
    let state = app_handle.state::<AppState>();
    
    state
        .document_service
        .analyze(&document_id, &options)
        .await
        .map_err(|e| e.to_string())
}
```

### Naming Conventions

#### Files and Directories
```bash
# Components: PascalCase
src/components/DocumentViewer/
src/components/ChatInterface/

# Hooks: camelCase with "use" prefix
src/hooks/useDocumentAnalysis.ts
src/hooks/useMemoryMonitor.ts

# Services: camelCase
src/services/documentService.ts
src/services/modelManager.ts

# Types: PascalCase
src/types/DocumentTypes.ts
src/types/UserTypes.ts
```

#### Variables and Functions
```typescript
// Variables: camelCase
const documentAnalysis = await analyzeDocument();
const memoryUsage = getMemoryUsage();

// Functions: camelCase, descriptive names
const handleDocumentUpload = async (file: File) => { /* */ };
const validateDocumentFormat = (format: string) => { /* */ };

// Constants: SCREAMING_SNAKE_CASE
const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_ANALYSIS_TIMEOUT = 30000; // 30 seconds
```

### Git Workflow

#### Branch Naming
```bash
# Feature branches
feature/chat-streaming-support
feature/document-version-control

# Bug fixes
fix/memory-leak-in-analysis
fix/authentication-token-refresh

# Documentation
docs/api-documentation-update
docs/contribution-guidelines

# Refactoring
refactor/component-architecture
refactor/state-management
```

#### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: type(scope): description

feat(chat): add streaming response support
fix(memory): resolve memory leak in document processing
docs(api): update authentication documentation
test(components): add tests for document viewer
refactor(services): simplify model loading logic
perf(analysis): optimize document parsing performance
```

#### Examples
```bash
# Good commit messages
feat(streaming): implement real-time AI response streaming
fix(security): resolve PII detection false positives
docs(installation): add macOS installation instructions
test(api): add comprehensive API endpoint tests

# Bad commit messages
fix bug
update code
add feature
change stuff
```

## Testing Requirements

### Unit Testing

```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentViewer } from '../DocumentViewer';

describe('DocumentViewer', () => {
  const mockDocument = {
    id: '1',
    name: 'test.pdf',
    type: 'pdf' as const,
    size: 1024,
    uploadDate: new Date(),
    status: 'ready' as const,
    tags: ['contract'],
    category: 'contract' as const,
    versions: []
  };

  test('renders document information correctly', () => {
    render(<DocumentViewer document={mockDocument} />);
    
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    expect(screen.getByText('1 KB')).toBeInTheDocument();
  });

  test('calls onAnalyze when analyze button is clicked', async () => {
    const mockOnAnalyze = jest.fn();
    render(
      <DocumentViewer 
        document={mockDocument} 
        onAnalyze={mockOnAnalyze} 
      />
    );
    
    fireEvent.click(screen.getByText('Analyze'));
    
    await waitFor(() => {
      expect(mockOnAnalyze).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: '1'
        })
      );
    });
  });
});
```

### Integration Testing

```typescript
// API integration tests
import { renderHook, act } from '@testing-library/react-hooks';
import { useDocumentAPI } from '../hooks/useDocumentAPI';

describe('Document API Integration', () => {
  test('should upload and analyze document', async () => {
    const { result } = renderHook(() => useDocumentAPI());
    
    const file = new File(['content'], 'test.pdf', {
      type: 'application/pdf'
    });

    let uploadedDocument;
    await act(async () => {
      uploadedDocument = await result.current.upload(file);
    });

    expect(uploadedDocument.status).toBe('ready');

    let analysisResult;
    await act(async () => {
      analysisResult = await result.current.analyze(
        uploadedDocument.id,
        { type: 'legal_terms' }
      );
    });

    expect(analysisResult.findings).toBeDefined();
    expect(analysisResult.confidence).toBeGreaterThan(0);
  });
});
```

### End-to-End Testing

```typescript
// E2E tests with Playwright
import { test, expect } from '@playwright/test';

test.describe('Document Analysis Workflow', () => {
  test('complete document upload and analysis', async ({ page }) => {
    // Navigate to application
    await page.goto('/');
    
    // Login
    await page.fill('[data-testid=email-input]', 'test@example.com');
    await page.fill('[data-testid=password-input]', 'password');
    await page.click('[data-testid=login-button]');
    
    // Upload document
    await page.click('[data-testid=upload-button]');
    await page.setInputFiles('[data-testid=file-input]', './test-document.pdf');
    
    // Wait for upload completion
    await expect(page.locator('[data-testid=upload-success]')).toBeVisible();
    
    // Start analysis
    await page.click('[data-testid=analyze-button]');
    
    // Wait for analysis completion
    await expect(page.locator('[data-testid=analysis-results]')).toBeVisible({
      timeout: 60000
    });
    
    // Verify results
    const results = await page.locator('[data-testid=analysis-findings]');
    await expect(results).toContainText('Legal terms identified');
  });
});
```

### Test Coverage Requirements

- **Minimum Coverage**: 80% for all new code
- **Component Tests**: All React components must have unit tests
- **Hook Tests**: All custom hooks must be tested
- **API Tests**: All service functions must have integration tests
- **E2E Tests**: Critical user paths must have end-to-end tests

## Documentation Standards

### Code Documentation

#### TypeScript/React

```typescript
/**
 * Document viewer component for displaying and analyzing legal documents
 * 
 * @param document - The document to display
 * @param onAnalyze - Callback fired when analysis is requested
 * @param readonly - Whether the document is read-only
 * 
 * @example
 * ```tsx
 * <DocumentViewer
 *   document={myDocument}
 *   onAnalyze={(result) => console.log(result)}
 *   readonly={false}
 * />
 * ```
 */
export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onAnalyze,
  readonly = false
}) => {
  // Component implementation
};

/**
 * Custom hook for managing document operations
 * 
 * @returns Object containing document operations and state
 * 
 * @example
 * ```typescript
 * const { upload, analyze, documents, loading } = useDocumentAPI();
 * const result = await analyze(documentId, { type: 'legal_terms' });
 * ```
 */
export const useDocumentAPI = () => {
  // Hook implementation
};
```

#### Rust

```rust
/// Analyzes a legal document for key terms, risks, and compliance issues
/// 
/// # Arguments
/// 
/// * `document_id` - Unique identifier of the document to analyze
/// * `options` - Analysis configuration options
/// 
/// # Returns
/// 
/// * `Result<DocumentAnalysis, AnalysisError>` - Analysis results or error
/// 
/// # Examples
/// 
/// ```rust
/// let options = AnalysisOptions {
///     extract_terms: true,
///     identify_risks: true,
///     check_compliance: true,
/// };
/// 
/// let analysis = analyze_document("doc-123", options).await?;
/// println!("Found {} legal terms", analysis.terms.len());
/// ```
/// 
/// # Errors
/// 
/// This function will return an error if:
/// - Document ID is not found
/// - Document format is not supported
/// - Analysis model is not loaded
/// - Insufficient memory for analysis
#[command]
pub async fn analyze_document(
    document_id: String,
    options: AnalysisOptions,
) -> Result<DocumentAnalysis, AnalysisError> {
    // Implementation
}
```

### README Files

Each major component should include a README:

```markdown
# Component Name

Brief description of the component's purpose.

## Features

- Feature 1
- Feature 2
- Feature 3

## Usage

```typescript
import { ComponentName } from './ComponentName';

const MyComponent = () => {
  return (
    <ComponentName
      prop1="value1"
      prop2={value2}
      onEvent={handleEvent}
    />
  );
};
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| prop1 | string | - | Description of prop1 |
| prop2 | number | 0 | Description of prop2 |

## Examples

### Basic Usage

```typescript
<ComponentName prop1="basic" />
```

### Advanced Usage

```typescript
<ComponentName
  prop1="advanced"
  prop2={42}
  onEvent={(data) => console.log(data)}
/>
```
```

## Pull Request Process

### Before Submitting

1. **Sync with Upstream**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   git push origin main
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Write code following style guidelines
   - Add comprehensive tests
   - Update documentation
   - Ensure all tests pass

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): description of changes"
   ```

5. **Push Branch**
   ```bash
   git push origin feature/your-feature-name
   ```

### Pull Request Template

When creating a pull request, include:

```markdown
## Description

Brief description of changes and motivation.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] End-to-end tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] All tests pass
- [ ] Breaking changes documented

## Screenshots (if applicable)

Add screenshots for UI changes.

## Additional Notes

Any additional information or context.
```

### Review Process

1. **Automated Checks**
   - All CI/CD tests must pass
   - Code coverage must meet requirements
   - No security vulnerabilities detected

2. **Code Review**
   - At least one core maintainer review required
   - Address all review comments
   - Make requested changes

3. **Final Approval**
   - All checks passed
   - All review comments resolved
   - Ready for merge

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (1.X.0): New features, backward compatible
- **PATCH** (1.0.X): Bug fixes, backward compatible

### Release Checklist

#### Pre-Release

- [ ] All planned features implemented
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version numbers updated
- [ ] Security audit completed

#### Release

```bash
# Create release branch
git checkout -b release/v2.1.0

# Update version in package.json
npm version minor

# Update Cargo.toml version
sed -i 's/version = "2.0.0"/version = "2.1.0"/' src-tauri/Cargo.toml

# Build and test
npm run build
npm run test:full

# Create release commit
git add .
git commit -m "chore(release): v2.1.0"

# Create tag
git tag v2.1.0

# Push release
git push origin release/v2.1.0
git push origin v2.1.0
```

#### Post-Release

- [ ] GitHub release created
- [ ] Binaries uploaded
- [ ] Documentation deployed
- [ ] Announcement published
- [ ] Issues closed
- [ ] Next milestone planned

### Release Notes Template

```markdown
# BEAR AI v2.1.0

## 🚀 New Features

- **Feature Name**: Description of new feature
- **Another Feature**: Description of another feature

## 🐛 Bug Fixes

- **Fix Description**: Details about what was fixed
- **Another Fix**: Details about another fix

## 📚 Documentation

- Updated installation guide
- Added new API documentation
- Improved troubleshooting guide

## 🔧 Technical Changes

- Performance improvements
- Code refactoring
- Dependency updates

## 📦 Downloads

- [Windows Installer](link-to-windows-installer)
- [macOS DMG](link-to-macos-dmg)
- [Linux AppImage](link-to-linux-appimage)

## 🙏 Contributors

Thanks to all contributors who made this release possible!

## 📋 Full Changelog

See the full changelog at: [v2.0.0...v2.1.0](link-to-changelog)
```

## Getting Help

### Community Support

- **GitHub Discussions**: General questions and community support
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time community chat
- **Documentation**: Comprehensive guides and references

### Maintainer Contact

For complex contributions or architectural discussions:

- Create a GitHub issue with the "discussion" label
- Join our monthly contributor meetings
- Reach out to maintainers directly for mentoring

### Resources

- [Architecture Documentation](ARCHITECTURE.md)
- [API Documentation](../api/README.md)
- [Testing Guide](../testing/TESTING_GUIDE.md)
- [Security Guidelines](SECURITY.md)

Thank you for contributing to BEAR AI! Your efforts help make legal AI more accessible and powerful for professionals worldwide. 🐻⚖️