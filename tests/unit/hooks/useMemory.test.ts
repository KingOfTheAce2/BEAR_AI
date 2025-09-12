import { renderHook, act } from '@testing-library/react';
import { useMemory } from '../../../src/hooks/useMemory';
import { mockMemoryService } from '../../mocks/serviceMocks';

// Mock the memory service
jest.mock('../../../src/services/memoryService', () => ({
  memoryService: mockMemoryService,
}));

describe('useMemory Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useMemory());

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should store data successfully', async () => {
    mockMemoryService.store.mockResolvedValueOnce(undefined);
    
    const { result } = renderHook(() => useMemory());

    await act(async () => {
      await result.current.store('test-key', { message: 'test data' });
    });

    expect(mockMemoryService.store).toHaveBeenCalledWith('test-key', { message: 'test data' });
    expect(result.current.error).toBeNull();
  });

  it('should retrieve data successfully', async () => {
    const testData = { message: 'retrieved data' };
    mockMemoryService.retrieve.mockResolvedValueOnce(testData);
    
    const { result } = renderHook(() => useMemory());

    await act(async () => {
      await result.current.retrieve('test-key');
    });

    expect(mockMemoryService.retrieve).toHaveBeenCalledWith('test-key');
    expect(result.current.data).toEqual(testData);
  });

  it('should handle loading states correctly', async () => {
    mockMemoryService.retrieve.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(null), 100))
    );
    
    const { result } = renderHook(() => useMemory());

    act(() => {
      result.current.retrieve('test-key');
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.loading).toBe(false);
  });

  it('should handle errors correctly', async () => {
    const testError = new Error('Memory service error');
    mockMemoryService.retrieve.mockRejectedValueOnce(testError);
    
    const { result } = renderHook(() => useMemory());

    await act(async () => {
      await result.current.retrieve('test-key');
    });

    expect(result.current.error).toEqual(testError);
    expect(result.current.data).toBeNull();
  });

  it('should delete data successfully', async () => {
    mockMemoryService.delete.mockResolvedValueOnce(undefined);
    
    const { result } = renderHook(() => useMemory());

    await act(async () => {
      await result.current.delete('test-key');
    });

    expect(mockMemoryService.delete).toHaveBeenCalledWith('test-key');
    expect(result.current.error).toBeNull();
  });

  it('should clear all data successfully', async () => {
    mockMemoryService.clear.mockResolvedValueOnce(undefined);
    
    const { result } = renderHook(() => useMemory());

    await act(async () => {
      await result.current.clear();
    });

    expect(mockMemoryService.clear).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should list stored keys successfully', async () => {
    const testKeys = ['key1', 'key2', 'key3'];
    mockMemoryService.list.mockResolvedValueOnce(testKeys);
    
    const { result } = renderHook(() => useMemory());

    await act(async () => {
      await result.current.list();
    });

    expect(mockMemoryService.list).toHaveBeenCalled();
    expect(result.current.data).toEqual(testKeys);
  });

  it('should search data successfully', async () => {
    const searchResults = [
      { key: 'key1', value: { message: 'test' } },
      { key: 'key2', value: { message: 'another test' } },
    ];
    mockMemoryService.search.mockResolvedValueOnce(searchResults);
    
    const { result } = renderHook(() => useMemory());

    await act(async () => {
      await result.current.search('test');
    });

    expect(mockMemoryService.search).toHaveBeenCalledWith('test');
    expect(result.current.data).toEqual(searchResults);
  });

  it('should handle concurrent operations correctly', async () => {
    mockMemoryService.store.mockResolvedValueOnce(undefined);
    mockMemoryService.retrieve.mockResolvedValueOnce({ data: 'test' });
    
    const { result } = renderHook(() => useMemory());

    await act(async () => {
      await Promise.all([
        result.current.store('key1', { data: 'value1' }),
        result.current.retrieve('key2'),
      ]);
    });

    expect(mockMemoryService.store).toHaveBeenCalledWith('key1', { data: 'value1' });
    expect(mockMemoryService.retrieve).toHaveBeenCalledWith('key2');
  });

  it('should reset error state on successful operations', async () => {
    const testError = new Error('Test error');
    mockMemoryService.retrieve.mockRejectedValueOnce(testError);
    mockMemoryService.store.mockResolvedValueOnce(undefined);
    
    const { result } = renderHook(() => useMemory());

    // First operation fails
    await act(async () => {
      await result.current.retrieve('test-key');
    });
    expect(result.current.error).toEqual(testError);

    // Second operation succeeds
    await act(async () => {
      await result.current.store('test-key', { data: 'test' });
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle memory key patterns', async () => {
    const testData = { namespace: 'test', data: 'value' };
    mockMemoryService.store.mockResolvedValueOnce(undefined);
    
    const { result } = renderHook(() => useMemory());

    await act(async () => {
      await result.current.store('namespace/key', testData);
    });

    expect(mockMemoryService.store).toHaveBeenCalledWith('namespace/key', testData);
  });

  it('should support memory key namespacing', async () => {
    const keys = ['ns1/key1', 'ns1/key2', 'ns2/key1'];
    mockMemoryService.list.mockResolvedValueOnce(keys);
    
    const { result } = renderHook(() => useMemory());

    await act(async () => {
      await result.current.list('ns1/');
    });

    expect(mockMemoryService.list).toHaveBeenCalledWith('ns1/');
  });
});