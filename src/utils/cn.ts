import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// Animation utility classes
export const animations = {
  slideIn: 'animate-in slide-in-from-right-full fade-in',
  slideOut: 'animate-out slide-out-to-right-full fade-out',
  fadeIn: 'animate-in fade-in',
  fadeOut: 'animate-out fade-out',
  scaleIn: 'animate-in zoom-in-95 fade-in',
  scaleOut: 'animate-out zoom-out-95 fade-out',
  slideUp: 'animate-in slide-in-from-bottom fade-in',
  slideDown: 'animate-out slide-out-to-bottom fade-out',
};
