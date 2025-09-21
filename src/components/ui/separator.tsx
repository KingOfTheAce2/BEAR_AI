import React from 'react';
import { cn } from '../../utils/cn';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { className, orientation = 'horizontal', decorative = false, role, ...props },
    ref
  ) => (
    <div
      ref={ref}
      role={decorative ? 'presentation' : role ?? 'separator'}
      aria-orientation={orientation}
      className={cn(
        'bg-border',
        orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full',
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = 'Separator';

export default Separator;
