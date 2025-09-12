export const mockTauriInvoke = jest.fn();
export const mockTauriListen = jest.fn();
export const mockTauriEmit = jest.fn();

export const tauriMocks = {
  invoke: mockTauriInvoke,
  event: {
    listen: mockTauriListen,
    emit: mockTauriEmit,
  },
  fs: {
    readTextFile: jest.fn(),
    writeTextFile: jest.fn(),
    createDir: jest.fn(),
    exists: jest.fn(),
  },
  shell: {
    open: jest.fn(),
  },
  dialog: {
    open: jest.fn(),
    save: jest.fn(),
    message: jest.fn(),
  },
  window: {
    getCurrent: jest.fn(() => ({
      minimize: jest.fn(),
      maximize: jest.fn(),
      close: jest.fn(),
      setTitle: jest.fn(),
    })),
  },
};

export const setupTauriMocks = () => {
  (window as any).__TAURI__ = tauriMocks;
};

export const resetTauriMocks = () => {
  Object.values(tauriMocks).forEach(mock => {
    if (typeof mock === 'function') {
      mock.mockReset();
    } else if (typeof mock === 'object') {
      Object.values(mock).forEach(nestedMock => {
        if (typeof nestedMock === 'function') {
          nestedMock.mockReset();
        }
      });
    }
  });
};