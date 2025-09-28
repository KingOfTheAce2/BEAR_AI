import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {

  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'primary'
    | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs';
  loading?: boolean;
  fullWidth?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      loading = false,
      disabled,
      fullWidth = false,
      asChild = false,
      children,
      type = 'button',
      onClick,
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      'apple-button focus-ring-apple transform-gpu interactive-scale',
      {
        'apple-button-primary': variant === 'default' || variant === 'primary',
        'apple-button-secondary border-red-200 text-red-600 hover:bg-red-50': variant === 'destructive',
        'apple-button-secondary': variant === 'outline' || variant === 'secondary',
        'apple-button-ghost': variant === 'ghost',
        'apple-button-ghost text-blue-600 no-underline hover:no-underline': variant === 'link',
        'apple-button-primary bg-green-500 hover:bg-green-600': variant === 'success',
        'px-6 py-3 text-base': size === 'default',
        'px-4 py-2 text-sm': size === 'sm',
        'px-8 py-4 text-lg': size === 'lg',
        'w-10 h-10 p-0': size === 'icon',
        'px-3 py-1.5 text-xs': size === 'xs',
        'w-full': fullWidth,
      },
      className
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        className: cn(baseClasses, child.props.className),
        onClick,
        ref,
        'aria-disabled': disabled || loading || undefined,
        ...props,
      });
    }

    return (
      <button
        type={type}
        className={baseClasses}
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={disabled || loading}
        onClick={onClick}
        {...props}
      >
        {loading && (
          <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
