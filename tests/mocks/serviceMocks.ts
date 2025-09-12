export const mockMemoryService = {
  store: jest.fn(() => Promise.resolve()),
  retrieve: jest.fn(() => Promise.resolve(null)),
  delete: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  list: jest.fn(() => Promise.resolve([])),
  search: jest.fn(() => Promise.resolve([])),
};

export const mockAgentService = {
  createAgent: jest.fn(),
  getAgent: jest.fn(),
  updateAgent: jest.fn(),
  deleteAgent: jest.fn(),
  listAgents: jest.fn(() => Promise.resolve([])),
  executeTask: jest.fn(),
  getTaskStatus: jest.fn(),
  cancelTask: jest.fn(),
};

export const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  getCurrentUser: jest.fn(),
  refreshToken: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
};

export const mockFileService = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  deleteFile: jest.fn(),
  listFiles: jest.fn(() => Promise.resolve([])),
  createDirectory: jest.fn(),
  exists: jest.fn(() => Promise.resolve(false)),
  getMetadata: jest.fn(),
};

export const mockSearchService = {
  search: jest.fn(() => Promise.resolve({ results: [], total: 0 })),
  index: jest.fn(),
  reindex: jest.fn(),
  deleteIndex: jest.fn(),
  getIndexStatus: jest.fn(),
};

export const mockIntegrationService = {
  connectJan: jest.fn(),
  disconnectJan: jest.fn(),
  getJanStatus: jest.fn(() => Promise.resolve({ connected: false })),
  syncModels: jest.fn(),
  importConfiguration: jest.fn(),
  exportConfiguration: jest.fn(),
};

export const mockPerformanceService = {
  startProfiling: jest.fn(),
  stopProfiling: jest.fn(),
  getMetrics: jest.fn(() => Promise.resolve({
    memory: { used: 100, total: 1000 },
    cpu: { usage: 50 },
    network: { requests: 10, errors: 0 },
  })),
  benchmark: jest.fn(),
  optimize: jest.fn(),
};

export const mockNotificationService = {
  show: jest.fn(),
  hide: jest.fn(),
  clear: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};