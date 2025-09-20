export function cn(...inputs: any[]) {
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

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

// Responsive breakpoint helpers used across the legacy UI surface
export const responsive = {
  mobileOnly: 'max-sm',
  tablet: 'sm:max-lg',
  desktop: 'lg:max-2xl',
  widescreen: '2xl',
};

// Lightweight theme helpers to avoid optional chaining in callers
export const theme = {
  light: 'theme-light',
  dark: 'theme-dark',
  highContrast: 'theme-high-contrast',
};
