
/* eslint-disable */
// This file contains ESLint overrides for common patterns in BEAR AI

// Disable specific rules for generated or complex files
module.exports = {
  overrides: [
    {
      files: ['**/*.tsx', '**/*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }],
        'react-hooks/exhaustive-deps': 'warn',
        'no-restricted-globals': ['error', {
          name: 'confirm',
          message: 'Use window.confirm() instead'
        }, {
          name: 'alert',
          message: 'Use window.alert() instead'
        }],
        'import/first': 'warn',
        'import/no-anonymous-default-export': 'warn'
      }
    },
    {
      files: ['**/types/**/*.ts', '**/types/**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-redeclare': 'off'
      }
    },
    {
      files: ['**/examples/**/*.ts', '**/examples/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
        'react-hooks/exhaustive-deps': 'off'
      }
    }
  ]
};
