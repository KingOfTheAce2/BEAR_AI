import React from 'react';
export interface LabelProps {
import { cn } from '../../utils/cn';

  className?: string;
  htmlFor?: string;
  id?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
      {...props}
    />
  )
);
Label.displayName = 'Label';

export default Label;
