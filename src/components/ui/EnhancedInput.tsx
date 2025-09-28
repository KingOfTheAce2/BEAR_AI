import React from 'react';
import { cn } from '../../utils/cn';

export interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'search' | 'floating';
  fullWidth?: boolean;
}

export const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({
    className,
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    variant = 'default',
    fullWidth = true,
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    React.useEffect(() => {
      if (props.value !== undefined) {
        setHasValue(String(props.value).length > 0);
      }
    }, [props.value]);

    return (
      <div className={cn('space-y-2', fullWidth && 'w-full', className)}>
        {/* Standard label for default variant */}
        {label && variant !== 'floating' && (
          <label
            htmlFor={inputId}
            className="apple-callout font-medium block"
            style={{ color: 'var(--apple-label-primary)' }}
          >
            {label}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Floating label */}
          {label && variant === 'floating' && (
            <label
              htmlFor={inputId}
              className={cn(
                'absolute left-3 transition-all duration-200 pointer-events-none apple-callout',
                (isFocused || hasValue)
                  ? 'top-2 text-xs'
                  : 'top-1/2 -translate-y-1/2',
                isFocused
                  ? 'text-blue-600'
                  : 'text-gray-500'
              )}
              style={{
                color: isFocused
                  ? 'var(--apple-system-blue)'
                  : 'var(--apple-label-tertiary)'
              }}
            >
              {label}
            </label>
          )}

          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <div
                className="w-5 h-5 flex items-center justify-center"
                style={{ color: isFocused ? 'var(--apple-system-blue)' : 'var(--apple-label-tertiary)' }}
              >
                {leftIcon}
              </div>
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            className={cn(
              'apple-input focus-ring-apple transition-all duration-200',
              {
                // Padding adjustments for icons and floating labels
                'pl-10': leftIcon,
                'pr-10': rightIcon,
                'pt-6 pb-2': variant === 'floating' && (isFocused || hasValue),
                'py-3': variant !== 'floating' || (!isFocused && !hasValue),
              },
              // Error state
              error && 'border-red-300 focus:border-red-500 focus:ring-red-500/20',
              // Search variant styling
              variant === 'search' && 'rounded-full pl-10',
              className
            )}
            style={{
              borderColor: error
                ? 'var(--apple-system-red)'
                : isFocused
                  ? 'var(--apple-system-blue)'
                  : 'var(--apple-separator)',
              ...(isFocused && !error && {
                boxShadow: '0 0 0 3px rgba(0, 122, 255, 0.1)'
              })
            }}
            {...props}
          />

          {/* Right icon */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <div
                className="w-5 h-5 flex items-center justify-center"
                style={{ color: isFocused ? 'var(--apple-system-blue)' : 'var(--apple-label-tertiary)' }}
              >
                {rightIcon}
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            className="apple-footnote flex items-center space-x-1"
            style={{ color: 'var(--apple-system-red)' }}
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p
            className="apple-footnote"
            style={{ color: 'var(--apple-label-tertiary)' }}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

EnhancedInput.displayName = 'EnhancedInput';