import React from 'react';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
import { cn } from '../../utils/cn';

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

const Button = React.forwardRef<any, ButtonProps>(
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
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
      {
        'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
        'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
        'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
        'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
        'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
        'text-primary underline-offset-4 hover:underline': variant === 'link',
        'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
        'bg-green-600 text-white hover:bg-green-700': variant === 'success',
        'h-10 px-4 py-2': size === 'default',
        'h-9 rounded-md px-3': size === 'sm',
        'h-11 rounded-md px-8': size === 'lg',
        'h-10 w-10': size === 'icon',
        'h-8 rounded px-2 text-xs': size === 'xs',
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
        {loading && <span className="mr-2 h-4 w-4 animate-spin">⟳</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
