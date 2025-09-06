# BEAR AI Legal Assistant GUI

A modern, professional React + TypeScript GUI for the BEAR AI Legal Assistant, built with comprehensive testing infrastructure.

## 🧪 Testing Infrastructure

This project includes a complete testing setup with unit tests, integration tests, and end-to-end tests.

### Test Stack

- **Unit/Integration Tests**: [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)
- **E2E Tests**: [Playwright](https://playwright.dev/)
- **Mocking**: [MSW (Mock Service Worker)](https://mswjs.io/)
- **Coverage**: V8 Coverage Provider

### Running Tests

```bash
# Unit and integration tests
npm test                    # Run tests in watch mode
npm run test:ui            # Run tests with Vitest UI
npm run test:watch         # Run tests in watch mode explicitly

# E2E tests
npm run test:e2e           # Run all E2E tests
npm run test:e2e:ui        # Run E2E tests with Playwright UI
npm run test:e2e:debug     # Debug E2E tests

# Coverage
npm run coverage           # Generate coverage report

# Smoke tests
npm run smoke              # Run critical smoke tests
```

### Test Structure

```
/src
  /test
    /utils
      test-utils.tsx       # Custom render functions and utilities
    /mocks
      stores.ts           # Store mocks
      services.ts         # Service mocks
      handlers.ts         # MSW request handlers
    setup.ts             # Test setup and global mocks
    setup-msw.ts         # MSW server configuration

/tests
  /e2e
    auth.test.ts          # Authentication flows
    chat.test.ts          # Chat functionality
    smoke.test.ts         # Critical smoke tests (@smoke tag)
    global-setup.ts       # E2E test setup
    global-teardown.ts    # E2E test cleanup
    /.auth                # Playwright auth states
```

## 📊 Coverage Reports

Coverage thresholds are enforced:

- **Global**: 75% branches, 80% functions/lines/statements
- **UI Components**: 85% branches, 90% functions
- **Services**: 85% branches, 90% functions
- **Stores**: 80% branches, 85% functions

Coverage reports are generated in multiple formats:
- HTML report: `coverage/index.html`
- LCOV: `coverage/lcov.info`
- JSON: `coverage/coverage.json`

## 🎯 Test Categories

### Unit Tests
- **Components**: `/src/components/**/*.test.tsx`
- **Stores**: `/src/store/**/*.test.ts`
- **Services**: `/src/services/**/*.test.ts`
- **Utilities**: `/src/utils/**/*.test.ts`

### Integration Tests
- **Page Components**: `/src/pages/**/*.test.tsx`
- **Complex Workflows**: Multi-component interactions

### E2E Tests
- **Authentication**: Login/logout flows
- **Core Features**: Chat, search, document management
- **Smoke Tests**: Critical functionality (`@smoke` tag)
- **Accessibility**: A11y compliance (`@accessibility` tag)

## 🛠️ Test Utilities

### Custom Render Function
```typescript
import { render, screen } from '@test/utils/test-utils'

// Includes router wrapper and user event setup
const { user } = render(<MyComponent />)
```

### Mock Factories
```typescript
import { createMockUser, createMockConversation } from '@test/utils/test-utils'
import { createMockChatStore, createMockServices } from '@test/mocks'

const mockUser = createMockUser({ name: 'Test User' })
const mockStore = createMockChatStore({ isLoading: true })
```

### MSW Handlers
API responses are mocked using MSW for consistent, realistic testing:
```typescript
// Automatically handles /api/* requests with realistic responses
// Custom handlers in /src/test/mocks/handlers.ts
```

## 🚀 Continuous Integration

GitHub Actions workflow includes:
- **Unit Tests**: Multiple Node.js versions
- **E2E Tests**: Cross-browser testing (Chromium, Firefox, WebKit)
- **Smoke Tests**: Critical functionality validation
- **Accessibility Tests**: A11y compliance
- **Coverage Reports**: Codecov integration

## 📋 Best Practices

### Writing Tests
1. **Arrange-Act-Assert** pattern
2. **User-centric queries** (`getByRole`, `getByLabelText`)
3. **Descriptive test names** (what and why)
4. **Isolated tests** (no interdependencies)
5. **Mock external dependencies**

### Test Data
```typescript
// Use factories for consistent test data
const mockConversation = createMockConversation({
  title: 'Contract Discussion',
  messages: [createMockMessage({ content: 'Test message' })]
})
```

### Performance
```typescript
// Performance testing utilities
import { measureRenderTime } from '@test/utils/test-utils'

const renderTime = await measureRenderTime(() => render(<Component />))
expect(renderTime).toBeLessThan(100) // 100ms threshold
```

## 🔧 Configuration

### Vitest Config
- **Environment**: jsdom for DOM testing
- **Setup Files**: Global mocks and utilities
- **Coverage**: V8 provider with detailed thresholds
- **Timeouts**: 10s test, 5s teardown

### Playwright Config
- **Browsers**: Chromium, Firefox, WebKit, Mobile
- **Reports**: HTML, JSON, JUnit
- **Screenshots/Videos**: On failure
- **Traces**: On retry

## 🐛 Debugging Tests

### Unit Tests
```bash
# Debug with VS Code
# Set breakpoints and run "Debug Test" in command palette

# Debug in browser
npm run test:ui
```

### E2E Tests
```bash
# Debug mode with browser
npm run test:e2e:debug

# UI mode
npm run test:e2e:ui

# Specific test file
npx playwright test auth.test.ts --debug
```

## 📈 Test Metrics

The testing infrastructure provides comprehensive metrics:
- **Code Coverage**: Line, branch, function, statement coverage
- **Test Performance**: Individual test timing and optimization suggestions
- **E2E Reports**: Screenshots, videos, traces for failed tests
- **Accessibility**: WCAG compliance validation

## 🎨 Mock Strategy

### API Mocking
- **MSW**: Intercepts network requests at service worker level
- **Realistic Responses**: Based on actual API contracts
- **Error Scenarios**: Network failures, validation errors, timeouts

### Store Mocking
- **Zustand Stores**: Full mock implementations with spy functions
- **State Management**: Predictable state for testing different scenarios
- **Action Testing**: Verify store actions are called correctly

### Component Mocking
- **Strategic Mocking**: Only mock complex child components
- **Preserve Integration**: Keep important component interactions
- **Consistent Interface**: Maintain component API contracts

---

This comprehensive testing setup ensures high-quality, maintainable code with confidence in deployments and refactoring.