/**
 * Unified BEAR AI GUI - Vitest Configuration
 * Test configuration for the comprehensive test suite
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Setup files
    setupFiles: [
      './setup.ts',
    ],
    
    // Global imports for convenience
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.stories.{ts,tsx}',
      ],
      exclude: [
        'node_modules/',
        'build/',
        'dist/',
        'coverage/',
        '**/*.config.{ts,js}',
        '**/mocks/**',
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
        // Specific thresholds for critical components
        'src/components/layout/': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
        'src/state/': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/integrations/': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
      },
    },
    
    // Test file patterns
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    
    // Test timeout
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Reporters
    reporter: [
      'default',
      'json',
      'html',
    ],
    
    // Output directory
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/test-results.html',
    },
    
    // Mock configuration
    deps: {
      inline: [
        // Inline dependencies that need to be transformed
        '@testing-library/jest-dom',
      ],
    },
    
    // Test environment options
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
    
    // Concurrent tests
    minThreads: 1,
    maxThreads: 4,
    
    // Watch options
    watch: {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
      ],
    },
    
    // Performance thresholds
    slowTestThreshold: 5000,
    
    // Retry configuration
    retry: 2,
    
    // Test categories for better organization
    pool: 'threads',
    
    // Custom matchers and utilities
    globalSetup: './global-setup.ts',
    
    // Environment variables for testing
    env: {
      NODE_ENV: 'test',
      BEAR_AI_ENV: 'test',
      BEAR_AI_DEBUG: 'false',
    },
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../../src'),
      '@components': path.resolve(__dirname, '../../../src/components'),
      '@utils': path.resolve(__dirname, '../../../src/utils'),
      '@hooks': path.resolve(__dirname, '../../../src/hooks'),
      '@types': path.resolve(__dirname, '../../../src/types'),
      '@state': path.resolve(__dirname, '../../../src/state'),
      '@integrations': path.resolve(__dirname, '../../../src/integrations'),
      '@services': path.resolve(__dirname, '../../../src/services'),
    },
  },
  
  // Build configuration for test environment
  build: {
    target: 'esnext',
    sourcemap: true,
  },
  
  // Define global constants
  define: {
    'process.env.NODE_ENV': '"test"',
    'import.meta.vitest': 'undefined',
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
    ],
  },
  
  // Server configuration for test environment
  server: {
    port: 3001,
    host: true,
  },
});