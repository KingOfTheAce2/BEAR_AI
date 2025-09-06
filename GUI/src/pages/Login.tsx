import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { Button, Input } from '@components/ui'
import { useAuthStore } from '@store/index'
import { cn } from '@utils/index'

export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  })

  const { login, isAuthenticated, isLoading, error } = useAuthStore()

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(formData.email, formData.password)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">BA</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-secondary-900">
            Sign in to BEAR AI
          </h2>
          <p className="mt-2 text-sm text-secondary-600">
            Your intelligent legal assistant
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              name="email"
              type="email"
              label="Email address"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              leftIcon={<Mail className="h-4 w-4" />}
              required
            />

            <Input
              name="password"
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-secondary-400 hover:text-secondary-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              required
            />
          </div>

          {/* Remember me and Forgot password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember"
                type="checkbox"
                checked={formData.remember}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            Sign in
          </Button>

          {/* Register link */}
          <div className="text-center">
            <p className="text-sm text-secondary-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <p className="text-sm text-primary-700 font-medium mb-2">Demo Credentials:</p>
          <div className="text-sm text-primary-600 space-y-1">
            <p>Email: demo@bearai.com</p>
            <p>Password: demo123</p>
          </div>
        </div>
      </div>
    </div>
  )
}