import React from 'react'
import { cn } from '@utils/index'
import { Loader2 } from 'lucide-react'
import type { BaseComponentProps } from '@types/index'

interface ButtonProps extends BaseComponentProps, React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
      secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 focus-visible:ring-secondary-500',
      outline: 'border border-secondary-300 bg-white text-secondary-900 hover:bg-secondary-50 focus-visible:ring-secondary-500',
      ghost: 'text-secondary-700 hover:bg-secondary-100 focus-visible:ring-secondary-500',
      danger: 'bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-danger-500',
    }

    const sizes = {
      sm: 'h-8 px-3 text-sm rounded-md',
      md: 'h-10 px-4 text-sm rounded-md',
      lg: 'h-12 px-6 text-base rounded-lg',
    }

    const isDisabled = disabled || isLoading

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {isLoading && (
          <Loader2 className={cn('animate-spin', {
            'mr-2 h-4 w-4': size === 'md',
            'mr-1.5 h-3.5 w-3.5': size === 'sm',
            'mr-2 h-5 w-5': size === 'lg',
          })} />
        )}
        
        {!isLoading && leftIcon && (
          <span className={cn({
            'mr-2': size === 'md',
            'mr-1.5': size === 'sm',
            'mr-2': size === 'lg',
          })}>
            {leftIcon}
          </span>
        )}

        {children}

        {!isLoading && rightIcon && (
          <span className={cn({
            'ml-2': size === 'md',
            'ml-1.5': size === 'sm',
            'ml-2': size === 'lg',
          })}>
            {rightIcon}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }