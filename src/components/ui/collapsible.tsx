import React, { useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '../../utils/cn';

interface CollapsibleContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

const isReactElement = (child: React.ReactNode): child is React.ReactElement =>
  typeof child === 'object' && child !== null && 'props' in child;

const cloneWithProps = (child: React.ReactNode, props: Record<string, unknown>) => {
  const clone = (React as any).cloneElement;
  if (typeof clone === 'function' && isReactElement(child)) {
    return clone(child, props);
  }
  if (isReactElement(child)) {
    return child;
  }
  return (
    <span {...props}>
      {child}
    </span>
  );
};

export interface CollapsibleProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [open, onOpenChange]
  );

  const contextValue = useMemo<CollapsibleContextValue>(
    () => ({ open: open ?? internalOpen, setOpen }),
    [open, internalOpen, setOpen]
  );

  return (
    <CollapsibleContext.Provider value={contextValue}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  );
};

export interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ className, asChild, children, ...props }, ref) => {
    const context = useContext(CollapsibleContext);
    if (!context) {
      throw new Error('CollapsibleTrigger must be used within Collapsible');
    }

    const handleClick = (event: any) => {
      context.setOpen(!context.open);
      props.onClick?.(event);
    };

    const sharedProps = {
      ref,
      onClick: handleClick,
      'aria-expanded': context.open,
      className: cn('flex w-full items-center justify-between text-left', className),
    };

    if (asChild) {
      return cloneWithProps(children, sharedProps);
    }

    return (
      <button type="button" {...props} {...sharedProps}>
        {children}
      </button>
    );
  }
);
CollapsibleTrigger.displayName = 'CollapsibleTrigger';

export interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = useContext(CollapsibleContext);
    if (!context) {
      throw new Error('CollapsibleContent must be used within Collapsible');
    }

    return context.open ? (
      <div
        ref={ref}
        className={cn('mt-2 space-y-2', className)}
        {...props}
      >
        {children}
      </div>
    ) : null;
  }
);
CollapsibleContent.displayName = 'CollapsibleContent';

export default Collapsible;
