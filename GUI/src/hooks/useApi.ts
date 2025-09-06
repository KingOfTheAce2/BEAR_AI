import { useState, useCallback } from 'react'
import type { ApiError } from '@types/index'

interface UseApiState<T> {
  data: T | null
  isLoading: boolean
  error: ApiError | null
}

interface UseApiOptions {
  onSuccess?: (data: unknown) => void
  onError?: (error: ApiError) => void
}

export function useApi<T = unknown>(
  apiFunction: (...args: unknown[]) => Promise<T>,
  options: UseApiOptions = {}
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
  })

  const execute = useCallback(
    async (...args: unknown[]) => {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }))

      try {
        const result = await apiFunction(...args)
        
        setState({
          data: result,
          isLoading: false,
          error: null,
        })

        options.onSuccess?.(result)
        return result
      } catch (error) {
        const apiError = error as ApiError
        
        setState({
          data: null,
          isLoading: false,
          error: apiError,
        })

        options.onError?.(apiError)
        throw apiError
      }
    },
    [apiFunction, options]
  )

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
    })
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}

// Hook for paginated API calls
interface UsePaginatedApiState<T> extends UseApiState<T[]> {
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export function usePaginatedApi<T>(
  apiFunction: (params: {
    page: number
    limit: number
    [key: string]: unknown
  }) => Promise<{
    data: T[]
    total: number
    page: number
    limit: number
    hasNext: boolean
    hasPrev: boolean
  }>,
  initialLimit = 10
) {
  const [state, setState] = useState<UsePaginatedApiState<T>>({
    data: null,
    total: 0,
    page: 1,
    limit: initialLimit,
    hasNext: false,
    hasPrev: false,
    isLoading: false,
    error: null,
  })

  const execute = useCallback(
    async (params: { page?: number; limit?: number; [key: string]: unknown } = {}) => {
      const queryParams = {
        page: state.page,
        limit: state.limit,
        ...params,
      }

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }))

      try {
        const result = await apiFunction(queryParams)
        
        setState({
          ...result,
          data: result.data,
          isLoading: false,
          error: null,
        })

        return result
      } catch (error) {
        const apiError = error as ApiError
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: apiError,
        }))

        throw apiError
      }
    },
    [apiFunction, state.page, state.limit]
  )

  const nextPage = useCallback(() => {
    if (state.hasNext) {
      execute({ page: state.page + 1 })
    }
  }, [execute, state.hasNext, state.page])

  const prevPage = useCallback(() => {
    if (state.hasPrev) {
      execute({ page: state.page - 1 })
    }
  }, [execute, state.hasPrev, state.page])

  const goToPage = useCallback(
    (page: number) => {
      execute({ page })
    },
    [execute]
  )

  const changeLimit = useCallback(
    (limit: number) => {
      execute({ page: 1, limit })
    },
    [execute]
  )

  const refresh = useCallback(() => {
    execute()
  }, [execute])

  return {
    ...state,
    execute,
    nextPage,
    prevPage,
    goToPage,
    changeLimit,
    refresh,
  }
}