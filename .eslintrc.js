// ESLint configuration for BEAR AI Legal Assistant
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    'react-hooks'
  ],
  extends: [],
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'no-console': 'off',
    'no-debugger': 'warn',
    'no-alert': 'off',
    'prefer-const': 'off',
    'no-var': 'off',
    'object-shorthand': 'off',
    'prefer-template': 'off',
    'eqeqeq': 'off',
    'curly': 'off',
    'brace-style': 'off',
    'comma-dangle': 'off',
    'semi': 'off',
    'quotes': 'off',
    'indent': 'off',
    'max-len': 'off',
    'no-unused-vars': 'off',
    'react-hooks/exhaustive-deps': 'off'
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        browser: true,
        node: true
      },
      globals: {
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly'
      },
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: ['**/examples/**/*.ts', '**/examples/**/*.tsx'],
      rules: {
        'no-console': 'off'
      }
    }
  ],
  ignorePatterns: [
    'build/',
    'dist/',
    'node_modules/',
    'src-tauri/',
    '*.config.js',
    '*.config.ts',
    'public/'
  ]
};
