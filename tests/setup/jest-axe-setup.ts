// Jest Accessibility Testing Setup with jest-axe

import { configureAxe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers to include accessibility testing
expect.extend(toHaveNoViolations);

// Configure axe-core for comprehensive accessibility testing
const axe = configureAxe({
  // Configure which rules to run
  rules: {
    // Color contrast
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: true },

    // Keyboard navigation
    'keyboard': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'tabindex': { enabled: true },

    // Screen reader support
    'label': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-valid-attr': { enabled: true },

    // Semantic HTML
    'heading-order': { enabled: true },
    'landmark-unique': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },

    // Images and media
    'image-alt': { enabled: true },
    'audio-caption': { enabled: true },
    'video-caption': { enabled: true },

    // Forms
    'form-field-multiple-labels': { enabled: true },
    'label-title-only': { enabled: true },
    'select-name': { enabled: true },

    // Links
    'link-name': { enabled: true },
    'link-in-text-block': { enabled: true },

    // Page structure
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    'skip-link': { enabled: true },

    // Disable some rules that might be too strict for testing
    'bypass': { enabled: false },
    'page-has-heading-one': { enabled: false }
  },

  // Configure tags to include
  tags: [
    'wcag2a',
    'wcag2aa',
    'wcag21aa',
    'section508',
    'best-practice'
  ],

  // Disable rules that don't apply to components in isolation
  disableOtherRules: false,

  // Timeout for accessibility tests
  timeout: 10000
});

// Helper function to test accessibility of React components
export const testAccessibility = async (element: HTMLElement, options = {}) => {
  const results = await axe(element, {
    // Default options
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21aa']
    },

    // Override with custom options
    ...options
  });

  return results;
};

// Helper function to test keyboard navigation
export const testKeyboardNavigation = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const issues = [];

  focusableElements.forEach((el, index) => {
    const htmlEl = el as HTMLElement;

    // Check if element is focusable
    htmlEl.focus();
    if (document.activeElement !== htmlEl) {
      issues.push(`Element at index ${index} is not focusable: ${el.tagName}`);
    }

    // Check for visible focus indicator
    const styles = window.getComputedStyle(htmlEl, ':focus');
    const hasOutline = styles.outline !== 'none' && styles.outline !== '';
    const hasFocusStyles = styles.boxShadow !== 'none' || styles.border !== 'none';

    if (!hasOutline && !hasFocusStyles) {
      issues.push(`Element at index ${index} lacks visible focus indicator: ${el.tagName}`);
    }
  });

  return {
    passed: issues.length === 0,
    issues,
    focusableCount: focusableElements.length
  };
};

// Helper function to test screen reader compatibility
export const testScreenReaderSupport = (element: HTMLElement) => {
  const issues = [];

  // Check for proper heading hierarchy
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;

  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1));
    if (level > lastLevel + 1) {
      issues.push(`Heading level skips from h${lastLevel} to h${level}`);
    }
    lastLevel = level;
  });

  // Check for alt text on images
  const images = element.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.getAttribute('alt') && !img.getAttribute('aria-label')) {
      issues.push(`Image at index ${index} missing alt text`);
    }
  });

  // Check for form labels
  const inputs = element.querySelectorAll('input, select, textarea');
  inputs.forEach((input, index) => {
    const hasLabel = input.getAttribute('aria-label') ||
                    input.getAttribute('aria-labelledby') ||
                    element.querySelector(`label[for="${input.id}"]`);

    if (!hasLabel) {
      issues.push(`Form input at index ${index} missing label`);
    }
  });

  // Check for button text
  const buttons = element.querySelectorAll('button');
  buttons.forEach((button, index) => {
    const hasText = button.textContent?.trim() ||
                   button.getAttribute('aria-label') ||
                   button.getAttribute('title');

    if (!hasText) {
      issues.push(`Button at index ${index} missing accessible text`);
    }
  });

  return {
    passed: issues.length === 0,
    issues
  };
};

// Custom accessibility testing utilities
export const accessibilityUtils = {
  // Test color contrast
  testColorContrast: async (element: HTMLElement) => {
    const results = await axe(element, {
      runOnly: {
        type: 'rule',
        values: ['color-contrast', 'color-contrast-enhanced']
      }
    });
    return results;
  },

  // Test keyboard only navigation
  testKeyboardOnly: (element: HTMLElement) => testKeyboardNavigation(element),

  // Test screen reader compatibility
  testScreenReader: (element: HTMLElement) => testScreenReaderSupport(element),

  // Test mobile accessibility
  testMobileAccessibility: async (element: HTMLElement) => {
    const results = await axe(element, {
      runOnly: {
        type: 'tag',
        values: ['wcag2aa', 'best-practice']
      }
    });

    // Additional mobile-specific checks
    const touchTargets = element.querySelectorAll('button, a, input, select, textarea');
    const smallTargets = Array.from(touchTargets).filter(target => {
      const rect = target.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44; // WCAG 2.1 minimum touch target size
    });

    if (smallTargets.length > 0) {
      results.violations.push({
        id: 'mobile-touch-target',
        description: 'Touch targets should be at least 44x44 pixels',
        impact: 'serious',
        nodes: smallTargets.map(target => ({
          html: target.outerHTML,
          target: [target]
        }))
      } as any);
    }

    return results;
  }
};

// Global accessibility test helper
global.testA11y = testAccessibility;
global.a11yUtils = accessibilityUtils;

// Type definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }

  var testA11y: typeof testAccessibility;
  var a11yUtils: typeof accessibilityUtils;
}

export { axe, testAccessibility, accessibilityUtils };