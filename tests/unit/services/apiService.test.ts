import { ApiService } from '../../../src/services/apiService';
import { mockApiService } from '../../mocks/apiMocks';

// Mock fetch globally
global.fetch = jest.fn();

describe('ApiService', () => {
  let apiService: ApiService;

  beforeEach(() => {
    apiService = new ApiService('http://localhost:3000');
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await apiService.get('/test');

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockData);
    });

    it('should handle GET request with query parameters', async () => {
      const mockData = { results: [] };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      await apiService.get('/search', { q: 'test', limit: 10 });

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/search?q=test&limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should throw error on failed GET request', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(apiService.get('/nonexistent')).rejects.toThrow('HTTP error! status: 404');
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const postData = { name: 'New Item' };
      const responseData = { id: 1, ...postData };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => responseData,
      });

      const result = await apiService.post('/items', postData);

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      expect(result).toEqual(responseData);
    });

    it('should handle POST request with FormData', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await apiService.post('/upload', formData);

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      });
    });
  });

  describe('PUT requests', () => {
    it('should make successful PUT request', async () => {
      const updateData = { id: 1, name: 'Updated Item' };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => updateData,
      });

      const result = await apiService.put('/items/1', updateData);

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/items/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      expect(result).toEqual(updateData);
    });
  });

  describe('DELETE requests', () => {
    it('should make successful DELETE request', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      });

      await apiService.delete('/items/1');

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/items/1', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.get('/test')).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      (fetch as jest.Mock).mockImplementationOnce(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(apiService.get('/test')).rejects.toThrow('Timeout');
    });

    it('should handle invalid JSON responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(apiService.get('/test')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('Authentication', () => {
    it('should include authorization header when token is set', async () => {
      apiService.setAuthToken('test-token');
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiService.get('/protected');

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/protected', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      });
    });

    it('should remove authorization header when token is cleared', async () => {
      apiService.setAuthToken('test-token');
      apiService.clearAuthToken();
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiService.get('/test');

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('Request interceptors', () => {
    it('should apply request interceptors', async () => {
      const interceptor = jest.fn((config) => ({
        ...config,
        headers: { ...config.headers, 'X-Custom': 'value' },
      }));
      
      apiService.addRequestInterceptor(interceptor);
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiService.get('/test');

      expect(interceptor).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'value',
        },
      });
    });
  });

  describe('Response interceptors', () => {
    it('should apply response interceptors', async () => {
      const interceptor = jest.fn((response) => ({
        ...response,
        processed: true,
      }));
      
      apiService.addResponseInterceptor(interceptor);
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      const result = await apiService.get('/test');

      expect(interceptor).toHaveBeenCalled();
      expect(result).toHaveProperty('processed', true);
    });
  });
});