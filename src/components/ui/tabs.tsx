import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cn } from '../../utils/cn';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

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

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');

  useEffect(() => {
    if (defaultValue !== undefined) {
      setInternalValue(defaultValue);
    }
  }, [defaultValue]);

  const handleChange = useCallback(
    (next: string) => {
      if (value === undefined) {
        setInternalValue(next);
      }
      onValueChange?.(next);
    },
    [value, onValueChange]
  );

  const contextValue = useMemo<TabsContextValue>(
    () => ({ value: value ?? internalValue, setValue: handleChange }),
    [value, internalValue, handleChange]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className)}
      role="tablist"
      {...props}
    />
  )
);
TabsList.displayName = 'TabsList';

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  asChild?: boolean;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, asChild, disabled, children, ...props }, ref) => {
    const context = useContext(TabsContext);
    if (!context) {
      throw new Error('TabsTrigger must be used within Tabs');
    }

    const isActive = context.value === value;

    const sharedProps = {
      role: 'tab',
      'aria-selected': isActive,
      'aria-controls': `${value}-content`,
      tabIndex: isActive ? 0 : -1,
      id: value,
      className: cn(
        'inline-flex min-w-[100px] items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-background text-foreground shadow'
          : 'text-muted-foreground hover:text-foreground',
        className
      ),
      onClick: (event: any) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        context.setValue(value);
        props.onClick?.(event);
      },
    };

    if (asChild) {
      return cloneWithProps(children, sharedProps);
    }

    return (
      <button ref={ref} disabled={disabled} {...props} {...sharedProps}>
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = useContext(TabsContext);
    if (!context) {
      throw new Error('TabsContent must be used within Tabs');
    }

    if (context.value !== value) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`${value}-content`}
        aria-labelledby={value}
        className={cn('mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = 'TabsContent';

export default Tabs;
