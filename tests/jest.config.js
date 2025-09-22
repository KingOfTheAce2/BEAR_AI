// Jest Configuration for BEAR AI Testing Suite
// Comprehensive testing setup with coverage reporting and multiple test environments

const path = require('path');

const reporters = ['default'];

const isCI = Boolean(process.env.CI);

const addReporterIfAvailable = (name, options) => {
  try {
    require.resolve(name);
    reporters.push(options ? [name, options] : name);
  } catch (error) {
    if (isCI) {
      // eslint-disable-next-line no-console
      console.warn(`Optional Jest reporter "${name}" is not installed. Skipping.`);
    }
  }
};

addReporterIfAvailable('jest-junit', {
  outputDirectory: 'test-results',
  outputName: 'junit.xml',
  ancestorSeparator: ' › ',
  uniqueOutputName: 'false',
  suiteNameTemplate: '{displayName} {filepath}',
  classNameTemplate: '{classname}',
  titleTemplate: '{title}'
});

addReporterIfAvailable('jest-html-reporters', {
  publicDir: 'test-results',
  filename: 'test-report.html',
  expand: true,
  hideIcon: false,
  pageTitle: 'BEAR AI Test Report'
});

module.exports = {
  // Root directory for the project
  rootDir: path.resolve(__dirname, '..'),
  // Test environment
  testEnvironment: 'jsdom',

  // Root directories for tests
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.{js,jsx,ts,tsx}',
    '**/__tests__/**/*.{js,jsx,ts,tsx}',
    '**/*.(test|spec).{js,jsx,ts,tsx}'
  ],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Module name mapping for aliases and mocks
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^components/(.*)$': '<rootDir>/src/components/$1',
    '^services/(.*)$': '<rootDir>/src/services/$1',
    '^utils/(.*)$': '<rootDir>/src/utils/$1',
    '^types/(.*)$': '<rootDir>/src/types/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/__mocks__/fileMock.js'
  },

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/test-setup.ts',
    '<rootDir>/tests/setup/jest-dom-setup.ts'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/setup/global-setup.ts',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/types/**',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    },
    './src/components/': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json',
    'cobertura'
  ],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Test timeout (30 seconds)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Reset modules between tests
  resetModules: true,

  // Projects for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.{ts,tsx,js,jsx}'],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.{ts,tsx,js,jsx}'],
      testEnvironment: 'node'
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.{ts,tsx,js,jsx}'],
      testEnvironment: 'node',
      testTimeout: 60000
    },
    {
      displayName: 'accessibility',
      testMatch: ['<rootDir>/tests/accessibility/**/*.test.{ts,tsx,js,jsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/test-setup.ts',
        '<rootDir>/tests/setup/jest-dom-setup.ts',
        '<rootDir>/tests/setup/jest-axe-setup.ts'
      ]
    }
  ],

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/',
    '\\.cache'
  ],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Error handling
  errorOnDeprecated: true,

  // Notification settings
  notify: true,
  notifyMode: 'failure-change',

  // Reporter configuration
  reporters,

  // Custom matchers and utilities
  snapshotSerializers: [
    'enzyme-to-json/serializer'
  ],

  // Performance and memory settings
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',

  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',

  // Globals for tests
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx'
      }
    },
    IS_TEST_ENV: true,
    TEST_API_BASE_URL: 'http://localhost:3001',
    TEST_TIMEOUT: 30000
  }
};