module.exports = {
  // Jest is not used since we're using Vitest
  // This file exists to prevent conflicts if Jest is accidentally referenced
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {},
  testMatch: [],
  collectCoverage: false,
  setupFilesAfterEnv: [],
  moduleNameMapping: {},
  // Redirect to use Vitest instead
  globalSetup: './vitest-redirect.js'
}