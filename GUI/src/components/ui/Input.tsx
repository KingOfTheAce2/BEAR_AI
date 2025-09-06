import React from 'react'
import { cn } from '@utils/index'
import type { BaseComponentProps } from '@types/index'

interface InputProps extends BaseComponentProps, React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = React.useId()
    const errorId = React.useId()
    const helperId = React.useId()

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-secondary-700"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <div className="h-5 w-5 text-secondary-400">
                {leftIcon}
              </div>
            </div>
          )}
          
          <input
            id={inputId}
            ref={ref}
            type={type}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={cn(
              error && errorId,
              helperText && helperId
            )}
            className={cn(
              'flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 placeholder:text-secondary-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-danger-300 focus:border-danger-500 focus:ring-danger-500',
              className
            )}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <div className="h-5 w-5 text-secondary-400">
                {rightIcon}
              </div>
            </div>
          )}
        </div>
        
        {error && (
          <p id={errorId} className="text-sm text-danger-600">
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p id={helperId} className="text-sm text-secondary-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }