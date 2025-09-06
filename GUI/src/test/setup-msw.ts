import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

// Setup MSW server
export const server = setupServer(...handlers)

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers()
})

// Cleanup after all tests
afterAll(() => {
  server.close()
})