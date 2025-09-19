/**
 * Enhanced Button Component
 * 
 * Apple-grade button component with sophisticated interactions, micro-animations,
 * and accessibility features. Supports spring physics, ripple effects, and
 * contextual feedback.
 */

import React, { useRef, useCallback, useState } from 'react';
import { cn } from '../../utils/cn';
import { AnimationUtils, MicroInteractions, useAnimation } from '../../design/animation-system';

export interface EnhancedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  ripple?: boolean;
  hapticFeedback?: boolean;
  children: React.ReactNode;
  className?: string;
}

const buttonVariants = {
  primary: {
    base: 'btn-primary text-white shadow-sm',
    hover: 'hover:shadow-md hover:-translate-y-0.5',
    active: 'active:translate-y-0 active:scale-95',
    focus: 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
  },
  secondary: {
    base: 'btn-secondary bg-surface-level-1 text-text-primary border border-border-medium shadow-xs',
    hover: 'hover:bg-surface-level-2 hover:border-border-strong hover:shadow-sm hover:-translate-y-0.5',
    active: 'active:bg-surface-level-1 active:translate-y-0 active:scale-95',
    focus: 'focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
  },
  outline: {
    base: 'btn-outline bg-transparent border-2 border-primary-500 text-primary-500',
    hover: 'hover:bg-primary-500 hover:text-white hover:-translate-y-0.5',
    active: 'active:translate-y-0 active:scale-95',
    focus: 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
  },
  ghost: {
    base: 'btn-ghost bg-transparent text-text-secondary',
    hover: 'hover:bg-surface-level-1 hover:text-text-primary',
    active: 'active:bg-surface-level-2 active:scale-95',
    focus: 'focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
  },
  danger: {
    base: 'btn-danger bg-red-500 text-white shadow-sm',
    hover: 'hover:bg-red-600 hover:shadow-md hover:-translate-y-0.5',
    active: 'active:bg-red-700 active:translate-y-0 active:scale-95',
    focus: 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
  }
};

const buttonSizes = {
  sm: 'btn-sm px-3 py-1.5 text-label-medium h-8',
  md: 'btn-md px-4 py-2 text-label-large h-10',
  lg: 'btn-lg px-6 py-3 text-title-small h-12',
  xl: 'btn-xl px-8 py-4 text-title-medium h-14'
};

export const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled = false,
    icon,
    iconPosition = 'left',
    ripple = true,
    hapticFeedback = true,
    children,
    className,
    onClick,
    onMouseDown,
    onMouseUp,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    ...props
  }, ref) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    // Use the forwarded ref or create our own
    const resolveRef = (
      targetRef: React.ForwardedRef<HTMLButtonElement>,
      fallback: React.MutableRefObject<HTMLButtonElement | null>
    ): React.MutableRefObject<HTMLButtonElement | null> => {
      if (targetRef && typeof targetRef !== 'function') {
        return targetRef as React.MutableRefObject<HTMLButtonElement | null>;
      }
      return fallback;
    };

    const internalRef = resolveRef(ref, buttonRef);
    
    const { transitionTo, applySpring } = useAnimation(internalRef);
    
    const variantStyles = buttonVariants[variant];
    const sizeStyles = buttonSizes[size];
    
    const isDisabled = disabled || loading;
    
    // Handle click with ripple effect and haptic feedback
    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;
      
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Create ripple effect
      if (ripple) {
        AnimationUtils.ripple(button, event.clientX, event.clientY);
      }
      
      // Haptic feedback (if supported)
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(1);
      }
      
      // Spring animation for press feedback
      applySpring?.('scale', 0.96);
      setTimeout(() => applySpring?.('scale', 1), 150);
      
      onClick?.(event);
    }, [isDisabled, ripple, hapticFeedback, applySpring, onClick]);
    
    // Handle mouse interactions
    const handleMouseDown = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;
      
      setIsPressed(true);
      transitionTo?.('pressed', MicroInteractions.button.press);
      onMouseDown?.(event);
    }, [isDisabled, transitionTo, onMouseDown]);
    
    const handleMouseUp = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;
      
      setIsPressed(false);
      transitionTo?.('release', MicroInteractions.button.release);
      onMouseUp?.(event);
    }, [isDisabled, transitionTo, onMouseUp]);
    
    const handleMouseEnter = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;
      
      setIsHovered(true);
      transitionTo?.('hover', MicroInteractions.button.hover);
      onMouseEnter?.(event);
    }, [isDisabled, transitionTo, onMouseEnter]);
    
    const handleMouseLeave = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;
      
      setIsHovered(false);
      setIsPressed(false);
      transitionTo?.('idle', {
        transform: { scale: 1, y: 0 },
        duration: 200,
        easing: 'cubic-bezier(0.32, 0.72, 0, 1)'
      });
      onMouseLeave?.(event);
    }, [isDisabled, transitionTo, onMouseLeave]);
    
    // Handle focus interactions
    const handleFocus = useCallback((event: React.FocusEvent<HTMLButtonElement>) => {
      setIsFocused(true);
      onFocus?.(event);
    }, [onFocus]);
    
    const handleBlur = useCallback((event: React.FocusEvent<HTMLButtonElement>) => {
      setIsFocused(false);
      onBlur?.(event);
    }, [onBlur]);
    
    // Loading spinner component
    const LoadingSpinner = () => (
      <svg
        className="animate-spin -ml-1 mr-2 h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
    
    return (
      <button
        {...props}
        ref={internalRef}
        type="button"
        disabled={isDisabled}
        className={cn(
          // Base styles
          'btn-base inline-flex items-center justify-center font-medium transition-all duration-200 ease-out',
          'relative overflow-hidden select-none touch-manipulation',
          'focus:outline-none focus-visible:outline-none',
          'transform-gpu will-change-transform',
          
          // Variant styles
          variantStyles.base,
          !isDisabled && variantStyles.hover,
          !isDisabled && variantStyles.active,
          variantStyles.focus,
          variantStyles.disabled,
          
          // Size styles
          sizeStyles,
          
          // Width styles
          fullWidth && 'w-full',
          
          // State-based styles
          isPressed && !isDisabled && 'scale-95 translate-y-0',
          isHovered && !isDisabled && '-translate-y-0.5 shadow-lg',
          isFocused && 'ring-2 ring-offset-2',
          
          // Custom className
          className
        )}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-pressed={isPressed}
        aria-busy={loading}
      >
        {/* Ripple container */}
        {ripple && (
          <span className="absolute inset-0 overflow-hidden rounded-inherit pointer-events-none">
            {/* Ripple effects will be dynamically added here */}
          </span>
        )}
        
        {/* Button content */}
        <span className="relative flex items-center justify-center">
          {loading && <LoadingSpinner />}
          
          {icon && iconPosition === 'left' && !loading && (
            <span className={cn('flex items-center', children && 'mr-2')}>
              {icon}
            </span>
          )}
          
          {children && (
            <span className={loading ? 'opacity-70' : undefined}>
              {children}
            </span>
          )}
          
          {icon && iconPosition === 'right' && !loading && (
            <span className={cn('flex items-center', children && 'ml-2')}>
              {icon}
            </span>
          )}
        </span>
        
        {/* Shine effect for primary buttons */}
        {variant === 'primary' && !isDisabled && (
          <span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 
                       group-hover:opacity-10 transition-opacity duration-500 -skew-x-12 transform 
                       translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"
            aria-hidden="true"
          />
        )}
      </button>
    );
  }
);

EnhancedButton.displayName = 'EnhancedButton';

// Styled button variants for common use cases
export const PrimaryButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton {...props} ref={ref} variant="primary">Primary Button</EnhancedButton>
);

export const SecondaryButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton {...props} ref={ref} variant="secondary">Secondary Button</EnhancedButton>
);

export const OutlineButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton {...props} ref={ref} variant="outline">Outline Button</EnhancedButton>
);

export const GhostButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton {...props} ref={ref} variant="ghost">Ghost Button</EnhancedButton>
);

export const DangerButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>(
  (props, ref) => <EnhancedButton {...props} ref={ref} variant="danger">Danger Button</EnhancedButton>
);

PrimaryButton.displayName = 'PrimaryButton';
SecondaryButton.displayName = 'SecondaryButton';
OutlineButton.displayName = 'OutlineButton';
GhostButton.displayName = 'GhostButton';
DangerButton.displayName = 'DangerButton';

export default EnhancedButton;