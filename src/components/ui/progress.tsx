import React from 'react';
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
import { cn } from '../../utils/cn';

  value?: number;
  max?: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, children, ...props }, ref) => {
    const safeMax = max <= 0 ? 100 : max;
    const clamped = Math.min(Math.max(value, 0), safeMax);
    const percentage = (clamped / safeMax) * 100;

    return (
      <div
        ref={ref}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        {...props}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
        {children}
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export default Progress;
