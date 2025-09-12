module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/api'],
  testMatch: [
    '**/tests/api/**/*.test.(ts|js)',
    '**/tests/api/**/*.(test|spec).(ts|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/api/**/*.{ts,js}',
    '!src/api/**/*.d.ts',
    '!src/api/server.ts',
    '!src/api/docs/**/*'
  ],
  coverageDirectory: 'coverage/api',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/api/setup.ts'],
  testTimeout: 10000,
  verbose: true
};