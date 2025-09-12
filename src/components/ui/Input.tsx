import React from 'react'
import { cn } from '../../utils/cn'
import { ComponentProps } from '../../types'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, ComponentProps {
  variant?: 'default' | 'filled' | 'underlined'
  error?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  helperText?: string
  errorText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant = 'default',
    type = 'text',
    error = false,
    disabled = false,
    leftIcon,
    rightIcon,
    helperText,
    errorText,
    ...props 
  }, ref) => {
    const variants = {
      default: 'border border-input bg-background hover:border-accent/50 focus:border-accent',
      filled: 'border-0 bg-muted hover:bg-muted/80 focus:bg-background focus:ring-2 focus:ring-accent',
      underlined: 'border-0 border-b-2 border-input bg-transparent rounded-none hover:border-accent/50 focus:border-accent',
    }

    const inputElement = (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
          variants[variant],
          error && 'border-destructive focus:border-destructive focus:ring-destructive',
          leftIcon && 'pl-10',
          rightIcon && 'pr-10',
          className
        )}
        disabled={disabled}
        ref={ref}
        {...props}
      />
    )

    if (leftIcon || rightIcon || helperText || errorText) {
      return (
        <div className=\"w-full\">
          <div className=\"relative\">
            {leftIcon && (
              <div className=\"absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground\">
                {leftIcon}
              </div>
            )}
            {inputElement}
            {rightIcon && (
              <div className=\"absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground\">
                {rightIcon}
              </div>
            )}
          </div>
          {(helperText || errorText) && (
            <p className={cn(
              'mt-1 text-xs',
              error || errorText ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {error && errorText ? errorText : helperText}
            </p>
          )}
        </div>
      )
    }

    return inputElement
  }
)

Input.displayName = 'Input'

export { Input }