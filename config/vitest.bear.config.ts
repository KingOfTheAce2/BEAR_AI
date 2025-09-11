/**
 * BEAR AI Vitest Configuration
 * Testing setup for jan-dev integration components
 * 
 * @file Vitest configuration for BEAR AI testing
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react'
    })
  ],
  
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,ts,tsx}',
      'tests/**/*.{test,spec}.{js,ts,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      'src-tauri',
      'cypress',
      'playwright-report'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/integrations/**/*',
        'src/extensions/**/*',
        'src/state/**/*',
        'src/utils/**/*',
        'src/services/**/*'
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**/*',
        'src/**/*.d.ts',
        'src/assets/**/*',
        'src/build/**/*'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Critical components require higher coverage
        'src/integrations/llm-engine.ts': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/integrations/memory-optimization.ts': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        'src/extensions/plugin-architecture.ts': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        'src/state/bear-store.ts': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    
    // Test timeout configuration
    testTimeout: 10000,
    hookTimeout: 5000,
    
    // Mocking configuration
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Parallel execution
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    
    // Reporter configuration
    reporters: ['default', 'verbose', 'json'],
    outputFile: {
      json: './test-results/results.json'
    },
    
    // Watch mode settings
    watch: true,
    watchExclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**'
    ]
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@integrations': resolve(__dirname, './src/integrations'),
      '@extensions': resolve(__dirname, './src/extensions'),
      '@state': resolve(__dirname, './src/state'),
      '@utils': resolve(__dirname, './src/utils'),
      '@assets': resolve(__dirname, './src/assets'),
      '@types': resolve(__dirname, './src/types'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@services': resolve(__dirname, './src/services'),
      '@workers': resolve(__dirname, './src/workers'),
      '@build': resolve(__dirname, './src/build')
    }
  },
  
  define: {
    // Test environment variables
    __IS_TEST__: true,
    __BEAR_AI_VERSION__: JSON.stringify('1.0.0-test'),
    __IS_TAURI__: false,
    __IS_DEV__: true
  },
  
  // Optimize dependency handling for tests
  optimizeDeps: {
    include: [
      'zustand',
      'immer',
      '@emotion/react',
      '@testing-library/react',
      '@testing-library/user-event',
      '@testing-library/jest-dom'
    ]
  },
  
  // Server configuration for test environment
  server: {
    fs: {
      allow: ['..']
    }
  }
})