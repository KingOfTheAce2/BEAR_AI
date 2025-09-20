import React from 'react';
export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
import { cn } from '../../utils/cn';

  value?: number;
  onValueChange?: (value: number) => void;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, defaultValue, min = 0, max = 100, step = 1, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const numericValue = Number(event.target.value);
      onValueChange?.(numericValue);
      onChange?.(event);
    };

    return (
      <input
        ref={ref}
        type="range"
        value={value}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step}
        onChange={handleChange}
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          className
        )}
        {...props}
      />
    );
  }
);
Slider.displayName = 'Slider';

export default Slider;
