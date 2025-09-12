/**
 * BEAR AI Apple-Grade Design Token System
 * 
 * A comprehensive design token system inspired by Apple's Human Interface Guidelines
 * and modern design principles. Provides semantic tokens for typography, colors,
 * spacing, shadows, and animations that ensure consistency across the application.
 */

export const DesignTokens = {
  /**
   * Typography System
   * Based on SF Pro Display/Text with semantic scales and optical sizing
   */
  typography: {
    fontFamilies: {
      system: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
      systemText: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
      mono: '"SF Mono", "Cascadia Code", "JetBrains Mono", "Fira Code", Consolas, monospace',
      serif: '"New York", "Times New Roman", Georgia, serif'
    },
    
    fontSizes: {
      // Display scale - for hero content and major headlines
      displayLarge: '57px',
      displayMedium: '45px', 
      displaySmall: '36px',
      
      // Headline scale - for section headers and page titles
      headlineLarge: '32px',
      headlineMedium: '28px',
      headlineSmall: '24px',
      
      // Title scale - for card headers and list items
      titleLarge: '22px',
      titleMedium: '16px',
      titleSmall: '14px',
      
      // Label scale - for UI elements and controls
      labelLarge: '14px',
      labelMedium: '12px',
      labelSmall: '11px',
      
      // Body scale - for content text
      bodyLarge: '16px',
      bodyMedium: '14px',
      bodySmall: '12px'
    },
    
    lineHeights: {
      // Tight for headlines and display text
      tight: 1.15,
      // Normal for UI elements
      normal: 1.4,
      // Relaxed for reading content
      relaxed: 1.6,
      // Loose for long-form content
      loose: 1.8
    },
    
    fontWeights: {
      thin: '100',
      extraLight: '200',
      light: '300',
      regular: '400',
      medium: '500',
      semiBold: '600',
      bold: '700',
      extraBold: '800',
      black: '900'
    },
    
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    }
  },

  /**
   * Color System
   * Semantic colors with support for light/dark themes and accessibility
   */
  colors: {
    // Primary brand colors
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main primary
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },
    
    // Secondary/accent colors
    accent: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981', // Main accent
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      950: '#022c22'
    },
    
    // Neutral colors for surfaces and text
    neutral: {
      0: '#ffffff',
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712'
    },
    
    // Semantic colors
    semantic: {
      success: {
        background: '#ecfdf5',
        foreground: '#065f46',
        border: '#a7f3d0'
      },
      warning: {
        background: '#fffbeb',
        foreground: '#92400e',
        border: '#fcd34d'
      },
      error: {
        background: '#fef2f2',
        foreground: '#991b1b',
        border: '#fca5a5'
      },
      info: {
        background: '#eff6ff',
        foreground: '#1e40af',
        border: '#93c5fd'
      }
    },
    
    // Surface colors for elevation levels
    surface: {
      background: 'var(--surface-background)',
      level0: 'var(--surface-level-0)',
      level1: 'var(--surface-level-1)',
      level2: 'var(--surface-level-2)',
      level3: 'var(--surface-level-3)',
      level4: 'var(--surface-level-4)'
    },
    
    // Text colors with hierarchy
    text: {
      primary: 'var(--text-primary)',
      secondary: 'var(--text-secondary)',
      tertiary: 'var(--text-tertiary)',
      disabled: 'var(--text-disabled)',
      inverse: 'var(--text-inverse)'
    }
  },

  /**
   * Spacing System
   * Based on 8px grid with golden ratio progressions for harmony
   */
  spacing: {
    // Base unit (8px)
    unit: '8px',
    
    // Micro spacing (within components)
    px: '1px',
    0.5: '2px',
    1: '4px',
    1.5: '6px',
    2: '8px',
    2.5: '10px',
    3: '12px',
    3.5: '14px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    
    // Component spacing
    9: '36px',
    10: '40px',
    11: '44px',
    12: '48px',
    14: '56px',
    16: '64px',
    20: '80px',
    24: '96px',
    28: '112px',
    32: '128px',
    
    // Layout spacing (golden ratio progression)
    36: '144px',
    40: '160px',
    44: '176px',
    48: '192px',
    52: '208px',
    56: '224px',
    60: '240px',
    64: '256px',
    72: '288px',
    80: '320px',
    96: '384px'
  },

  /**
   * Shadow System
   * Material design elevation with subtle, Apple-inspired shadows
   */
  shadows: {
    none: 'none',
    
    // Subtle shadows for cards and surfaces
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 8px 10px rgba(0, 0, 0, 0.04)',
    
    // Elevation shadows (Material Design inspired)
    elevation1: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    elevation2: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
    elevation3: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    elevation4: '0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)',
    elevation5: '0 19px 38px rgba(0, 0, 0, 0.30), 0 15px 12px rgba(0, 0, 0, 0.22)',
    
    // Special shadows
    focus: '0 0 0 3px rgba(59, 130, 246, 0.5)',
    error: '0 0 0 3px rgba(239, 68, 68, 0.5)',
    success: '0 0 0 3px rgba(16, 185, 129, 0.5)',
    
    // Inner shadows for pressed states
    inset: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
  },

  /**
   * Border Radius System
   * Consistent rounding system from subtle to prominent
   */
  borderRadius: {
    none: '0',
    xs: '2px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    '3xl': '24px',
    full: '9999px'
  },

  /**
   * Animation System
   * Spring-based animations with Apple-inspired easing curves
   */
  animations: {
    // Duration scales
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '750ms',
      slowest: '1000ms'
    },
    
    // Apple-inspired easing curves
    easing: {
      // Standard easing for most interactions
      standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      
      // Accelerated easing for elements leaving the screen
      accelerated: 'cubic-bezier(0.4, 0.0, 1, 1)',
      
      // Decelerated easing for elements entering the screen
      decelerated: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      
      // Apple's signature easing
      apple: 'cubic-bezier(0.32, 0.72, 0, 1)',
      
      // Spring-like easing
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      
      // Bounce easing for playful interactions
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    },
    
    // Spring physics configurations
    spring: {
      gentle: { tension: 120, friction: 14 },
      wobbly: { tension: 180, friction: 12 },
      stiff: { tension: 210, friction: 20 },
      slow: { tension: 280, friction: 60 }
    },
    
    // Common animation patterns
    patterns: {
      fadeIn: {
        from: { opacity: 0 },
        to: { opacity: 1 },
        duration: '300ms',
        easing: 'decelerated'
      },
      fadeOut: {
        from: { opacity: 1 },
        to: { opacity: 0 },
        duration: '150ms',
        easing: 'accelerated'
      },
      slideUp: {
        from: { opacity: 0, transform: 'translateY(10px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
        duration: '300ms',
        easing: 'decelerated'
      },
      slideDown: {
        from: { opacity: 1, transform: 'translateY(0)' },
        to: { opacity: 0, transform: 'translateY(10px)' },
        duration: '150ms',
        easing: 'accelerated'
      },
      scaleIn: {
        from: { opacity: 0, transform: 'scale(0.95)' },
        to: { opacity: 1, transform: 'scale(1)' },
        duration: '200ms',
        easing: 'decelerated'
      },
      scaleOut: {
        from: { opacity: 1, transform: 'scale(1)' },
        to: { opacity: 0, transform: 'scale(0.95)' },
        duration: '100ms',
        easing: 'accelerated'
      }
    }
  },

  /**
   * Breakpoints
   * Responsive design breakpoints with content-first approach
   */
  breakpoints: {
    xs: '320px',   // Small phones
    sm: '480px',   // Large phones
    md: '768px',   // Tablets
    lg: '1024px',  // Small laptops
    xl: '1280px',  // Large laptops
    '2xl': '1536px' // Desktop monitors
  },

  /**
   * Content Widths
   * Optimal reading widths based on typography research
   */
  contentWidth: {
    prose: '65ch',    // Optimal for reading (45-75 characters)
    narrow: '45ch',   // Narrow columns
    wide: '80ch',     // Wide content
    full: '100%'      // Full width
  },

  /**
   * Z-Index Scale
   * Consistent layering system
   */
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800
  }
} as const;

/**
 * Type definitions for design tokens
 * Provides TypeScript support for all token values
 */
export type DesignTokens = typeof DesignTokens;

export type FontSize = keyof typeof DesignTokens.typography.fontSizes;
export type FontWeight = keyof typeof DesignTokens.typography.fontWeights;
export type LineHeight = keyof typeof DesignTokens.typography.lineHeights;
export type Spacing = keyof typeof DesignTokens.spacing;
export type Shadow = keyof typeof DesignTokens.shadows;
export type BorderRadius = keyof typeof DesignTokens.borderRadius;
export type AnimationDuration = keyof typeof DesignTokens.animations.duration;
export type AnimationEasing = keyof typeof DesignTokens.animations.easing;
export type Breakpoint = keyof typeof DesignTokens.breakpoints;

/**
 * Utility functions for working with design tokens
 */
export const getToken = {
  fontSize: (size: FontSize) => DesignTokens.typography.fontSizes[size],
  spacing: (space: Spacing) => DesignTokens.spacing[space],
  shadow: (shadow: Shadow) => DesignTokens.shadows[shadow],
  radius: (radius: BorderRadius) => DesignTokens.borderRadius[radius],
  duration: (duration: AnimationDuration) => DesignTokens.animations.duration[duration],
  easing: (easing: AnimationEasing) => DesignTokens.animations.easing[easing]
};

export default DesignTokens;