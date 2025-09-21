// Jest DOM Testing Setup
// Extended DOM testing utilities and custom matchers

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { configure as configureUserEvent } from '@testing-library/user-event';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true,
});

// Configure user-event
configureUserEvent({
  advanceTimers: jest.advanceTimersByTime,
  delay: null,
});

// Custom Jest matchers for BEAR AI specific testing
expect.extend({
  toHavePIIDetected(received: any, expectedPII: string[]) {
    const detectedPII = received.detectedPII || [];
    const pass = expectedPII.every(pii =>
      detectedPII.some((detected: any) =>
        detected.value === pii || detected.text === pii
      )
    );

    if (pass) {
      return {
        message: () => `Expected not to detect PII ${expectedPII.join(', ')}`,
        pass: true,
      };
    } else {
      const missing = expectedPII.filter(pii =>
        !detectedPII.some((detected: any) =>
          detected.value === pii || detected.text === pii
        )
      );
      return {
        message: () => `Expected to detect PII: ${missing.join(', ')}`,
        pass: false,
      };
    }
  },

  toHaveDocumentClassification(received: any, expectedType: string) {
    const classification = received.classification || received.documentType;
    const pass = classification === expectedType;

    if (pass) {
      return {
        message: () => `Expected document not to be classified as ${expectedType}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected document to be classified as ${expectedType}, but got ${classification}`,
        pass: false,
      };
    }
  },

  toHaveConfidenceScore(received: any, minScore: number) {
    const score = received.confidence || received.confidenceScore;
    const pass = typeof score === 'number' && score >= minScore;

    if (pass) {
      return {
        message: () => `Expected confidence score to be less than ${minScore}, but got ${score}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected confidence score to be at least ${minScore}, but got ${score}`,
        pass: false,
      };
    }
  },

  toHaveValidApiResponse(received: any) {
    const hasSuccess = 'success' in received;
    const hasData = received.success ? 'data' in received : 'error' in received;
    const hasTimestamp = 'timestamp' in received;

    const pass = hasSuccess && hasData && hasTimestamp;

    if (pass) {
      return {
        message: () => 'Expected invalid API response structure',
        pass: true,
      };
    } else {
      const missing = [];
      if (!hasSuccess) missing.push('success');
      if (!hasData) missing.push(received.success ? 'data' : 'error');
      if (!hasTimestamp) missing.push('timestamp');

      return {
        message: () => `Expected valid API response, missing: ${missing.join(', ')}`,
        pass: false,
      };
    }
  },

  toHaveLoadedWithinTime(received: any, maxTimeMs: number) {
    const loadTime = received.loadTime || received.duration || received.responseTime;
    const pass = typeof loadTime === 'number' && loadTime <= maxTimeMs;

    if (pass) {
      return {
        message: () => `Expected load time to exceed ${maxTimeMs}ms, but got ${loadTime}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected load time to be within ${maxTimeMs}ms, but got ${loadTime}ms`,
        pass: false,
      };
    }
  },

  toBeAccessible(received: HTMLElement) {
    // Basic accessibility checks
    const hasAriaLabel = received.hasAttribute('aria-label') || received.hasAttribute('aria-labelledby');
    const hasRole = received.hasAttribute('role');
    const isButton = received.tagName.toLowerCase() === 'button';
    const isInput = received.tagName.toLowerCase() === 'input';

    let pass = true;
    const issues = [];

    // Check for missing labels on interactive elements
    if ((isButton || isInput) && !hasAriaLabel && !received.textContent?.trim()) {
      pass = false;
      issues.push('missing accessible label');
    }

    // Check for proper semantic markup
    if (received.onclick && !isButton && !hasRole) {
      pass = false;
      issues.push('clickable element without proper role');
    }

    if (pass) {
      return {
        message: () => 'Expected element to have accessibility issues',
        pass: true,
      };
    } else {
      return {
        message: () => `Expected element to be accessible, but found: ${issues.join(', ')}`,
        pass: false,
      };
    }
  }
});

// Extend Jest matchers type definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toHavePIIDetected(expectedPII: string[]): R;
      toHaveDocumentClassification(expectedType: string): R;
      toHaveConfidenceScore(minScore: number): R;
      toHaveValidApiResponse(): R;
      toHaveLoadedWithinTime(maxTimeMs: number): R;
      toBeAccessible(): R;
    }
  }
}

// Mock DOM APIs that might not be available in jsdom
if (typeof window !== 'undefined') {
  // Mock getComputedStyle for more detailed style testing
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = (element: Element, pseudoElement?: string | null) => {
    const style = originalGetComputedStyle(element, pseudoElement);

    // Add commonly needed style properties
    return {
      ...style,
      getPropertyValue: (property: string) => {
        switch (property) {
          case 'display':
            return element.getAttribute('style')?.includes('display: none') ? 'none' : 'block';
          case 'visibility':
            return element.getAttribute('style')?.includes('visibility: hidden') ? 'hidden' : 'visible';
          case 'opacity':
            return element.getAttribute('style')?.includes('opacity: 0') ? '0' : '1';
          default:
            return style.getPropertyValue(property);
        }
      }
    } as CSSStyleDeclaration;
  };

  // Mock getBoundingClientRect for layout testing
  Element.prototype.getBoundingClientRect = jest.fn(() => ({
    width: 100,
    height: 100,
    top: 0,
    left: 0,
    bottom: 100,
    right: 100,
    x: 0,
    y: 0,
    toJSON: jest.fn(),
  }));

  // Mock offsetWidth and offsetHeight
  Object.defineProperties(HTMLElement.prototype, {
    offsetWidth: {
      get() { return 100; }
    },
    offsetHeight: {
      get() { return 100; }
    },
    scrollWidth: {
      get() { return 100; }
    },
    scrollHeight: {
      get() { return 100; }
    }
  });
}

// Global cleanup function for tests
afterEach(() => {
  // Clean up any side effects from tests
  document.body.innerHTML = '';

  // Clear all mocks
  jest.clearAllMocks();

  // Reset fetch mock
  if (global.fetch && jest.isMockFunction(global.fetch)) {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockClear();
  }

  // Clear timers
  jest.clearAllTimers();
  jest.useRealTimers();
});

export {};