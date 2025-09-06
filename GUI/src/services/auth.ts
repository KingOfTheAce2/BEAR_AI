import { api } from './api'
import type { User, LoginForm, RegisterForm } from '@types/index'

export interface LoginResponse {
  user: User
  token: string
  refreshToken: string
  expiresIn: number
}

export interface RefreshTokenResponse {
  token: string
  refreshToken: string
  expiresIn: number
}

export const authService = {
  // Login user
  login: async (credentials: LoginForm): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials)
    
    // Store tokens in localStorage
    localStorage.setItem('bear_ai_token', response.token)
    localStorage.setItem('bear_ai_refresh_token', response.refreshToken)
    
    return response
  },

  // Register user
  register: async (userData: RegisterForm): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/register', userData)
    
    // Store tokens in localStorage
    localStorage.setItem('bear_ai_token', response.token)
    localStorage.setItem('bear_ai_refresh_token', response.refreshToken)
    
    return response
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error)
    } finally {
      // Always clear tokens
      localStorage.removeItem('bear_ai_token')
      localStorage.removeItem('bear_ai_refresh_token')
    }
  },

  // Refresh token
  refreshToken: async (): Promise<RefreshTokenResponse> => {
    const refreshToken = localStorage.getItem('bear_ai_refresh_token')
    
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken,
    })

    // Update stored tokens
    localStorage.setItem('bear_ai_token', response.token)
    localStorage.setItem('bear_ai_refresh_token', response.refreshToken)

    return response
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    return api.get<User>('/auth/me')
  },

  // Update user profile
  updateProfile: async (updates: Partial<User>): Promise<User> => {
    return api.patch<User>('/auth/profile', updates)
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    })
  },

  // Request password reset
  requestPasswordReset: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email })
  },

  // Reset password with token
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await api.post('/auth/reset-password', {
      token,
      newPassword,
    })
  },

  // Verify email
  verifyEmail: async (token: string): Promise<void> => {
    await api.post('/auth/verify-email', { token })
  },

  // Resend verification email
  resendVerification: async (): Promise<void> => {
    await api.post('/auth/resend-verification')
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('bear_ai_token')
    return !!token
  },

  // Get stored token
  getToken: (): string | null => {
    return localStorage.getItem('bear_ai_token')
  },

  // Get stored refresh token
  getRefreshToken: (): string | null => {
    return localStorage.getItem('bear_ai_refresh_token')
  },
}