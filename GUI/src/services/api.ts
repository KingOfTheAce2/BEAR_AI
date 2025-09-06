import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiError, PaginatedResponse } from '@types/index'

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    const token = localStorage.getItem('bear_ai_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    const apiError: ApiError = {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      status: 500,
    }

    if (error.response) {
      // Server responded with error status
      apiError.status = error.response.status
      apiError.message = (error.response.data as { message?: string })?.message || error.message
      apiError.code = (error.response.data as { code?: string })?.code || 'SERVER_ERROR'
      apiError.details = error.response.data

      // Handle specific status codes
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('bear_ai_token')
          localStorage.removeItem('bear_ai_refresh_token')
          window.location.href = '/login'
          break
        case 403:
          apiError.message = 'Access denied. You do not have permission to perform this action.'
          break
        case 404:
          apiError.message = 'The requested resource was not found.'
          break
        case 422:
          apiError.message = 'Validation error. Please check your input.'
          break
        case 429:
          apiError.message = 'Too many requests. Please try again later.'
          break
        case 500:
          apiError.message = 'Internal server error. Please try again later.'
          break
      }
    } else if (error.request) {
      // Request made but no response received
      apiError.message = 'Network error. Please check your connection.'
      apiError.code = 'NETWORK_ERROR'
    } else {
      // Something happened in setting up the request
      apiError.message = error.message
      apiError.code = 'REQUEST_ERROR'
    }

    return Promise.reject(apiError)
  }
)

// Generic API methods
export const api = {
  // GET request
  get: async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
    const response = await apiClient.get<T>(url, { params })
    return response.data
  },

  // POST request
  post: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await apiClient.post<T>(url, data)
    return response.data
  },

  // PUT request
  put: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await apiClient.put<T>(url, data)
    return response.data
  },

  // PATCH request
  patch: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await apiClient.patch<T>(url, data)
    return response.data
  },

  // DELETE request
  delete: async <T>(url: string): Promise<T> => {
    const response = await apiClient.delete<T>(url)
    return response.data
  },

  // Upload file
  upload: async <T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(progress)
        }
      },
    })

    return response.data
  },
}

// Paginated request helper
export const getPaginated = async <T>(
  endpoint: string,
  params: {
    page?: number
    limit?: number
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    [key: string]: unknown
  } = {}
): Promise<PaginatedResponse<T>> => {
  const queryParams = {
    page: 1,
    limit: 10,
    ...params,
  }

  return api.get<PaginatedResponse<T>>(endpoint, queryParams)
}

// Export the axios instance for advanced usage
export { apiClient }
export default api