import React, { useContext, useMemo, useState } from 'react';
import { cn } from '../../utils/cn';

interface TooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

export interface TooltipProviderProps {
  children: React.ReactNode;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => <>{children}</>;

export interface TooltipProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const value = useMemo<TooltipContextValue>(() => ({ open, setOpen }), [open]);

  return (
    <TooltipContext.Provider value={value}>
      <div className="relative inline-flex">{children}</div>
    </TooltipContext.Provider>
  );
};

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children, asChild = false, ...props }) => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('TooltipTrigger must be used within Tooltip');
  }

  const triggerProps = {
    onMouseEnter: () => context.setOpen(true),
    onMouseLeave: () => context.setOpen(false),
    onFocus: () => context.setOpen(true),
    onBlur: () => context.setOpen(false),
    ...props,
  };

  const clone = (React as any).cloneElement;
  const isElement = typeof children === 'object' && children !== null && 'props' in (children as any);

  if (asChild && typeof clone === 'function' && isElement) {
    return clone(children, triggerProps);
  }

  if (typeof clone === 'function' && isElement) {
    return clone(children, triggerProps);
  }

  return <span {...triggerProps}>{children}</span>;
};

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, style, children, ...props }, ref) => {
    const context = useContext(TooltipContext);
    if (!context || !context.open) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="tooltip"
        className={cn(
          'z-50 mt-2 w-max max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md',
          className
        )}
        style={{ position: 'absolute', ...style }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TooltipContent.displayName = 'TooltipContent';

export default Tooltip;
