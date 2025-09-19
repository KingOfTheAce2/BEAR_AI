import React from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps {
  className?: string;
  rows?: number;
  value?: string;
  defaultValue?: string | number;
  onChange?: (event: any) => void;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  id?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export default Textarea;
