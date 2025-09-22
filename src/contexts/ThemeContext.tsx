import React, { createContext, useContext, useEffect, useState } from 'react';

// Theme types matching the UI guide specifications
export type Theme = 'modern' | 'professional' | 'simple';
export type ColorMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface ThemeConfig {
  theme: Theme;
  colorMode: ColorMode;
  colors: ThemeColors;
  fonts: {
    primary: string;
    secondary: string;
  };
  spacing: {
    unit: number;
    sidebar: {
      collapsed: string;
      expanded: string;
    };
  };
  animations: {
    duration: string;
    easing: string;
  };
}

// Professional theme (matching UI guide)
const professionalTheme: ThemeColors = {
  primary: '#1B365C', // Deep blue for trust
  secondary: '#6B7280', // Warm gray
  accent: '#059669', // Rich green for actions
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    muted: '#9CA3AF'
  },
  border: '#E5E7EB',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626'
};

// Modern theme (dark with vibrant accents)
const modernTheme: ThemeColors = {
  primary: '#1E293B',
  secondary: '#475569',
  accent: '#3B82F6',
  background: '#0F172A',
  surface: '#1E293B',
  text: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    muted: '#64748B'
  },
  border: '#334155',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444'
};

// Simple theme (clean minimalist)
const simpleTheme: ThemeColors = {
  primary: '#374151',
  secondary: '#6B7280',
  accent: '#2563EB',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: {
    primary: '#1F2937',
    secondary: '#4B5563',
    muted: '#9CA3AF'
  },
  border: '#E5E7EB',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626'
};

const defaultThemeConfig: ThemeConfig = {
  theme: 'professional',
  colorMode: 'light',
  colors: professionalTheme,
  fonts: {
    primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    secondary: 'Inter Tight, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  spacing: {
    unit: 8,
    sidebar: {
      collapsed: '4rem',
      expanded: '16rem'
    }
  },
  animations: {
    duration: '200ms',
    easing: 'ease-in-out'
  }
};

interface ThemeContextType {
  config: ThemeConfig;
  setTheme: (theme: Theme) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: Theme;
  initialColorMode?: ColorMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = 'professional',
  initialColorMode = 'light'
}) => {
  const [config, setConfig] = useState<ThemeConfig>(() => {
    // Try to load from localStorage
    const savedTheme = localStorage.getItem('bear-ai-theme');
    const savedColorMode = localStorage.getItem('bear-ai-color-mode');
    
    const theme = (savedTheme as Theme) || initialTheme;
    const colorMode = (savedColorMode as ColorMode) || initialColorMode;
    
    return {
      ...defaultThemeConfig,
      theme,
      colorMode,
      colors: getThemeColors(theme, colorMode)
    };
  });

  // Apply theme to document
  useEffect(() => {
    applyThemeToDocument(config);
  }, [config]);

  // Handle system color mode changes
  useEffect(() => {
    if (config.colorMode !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      setConfig(prev => ({
        ...prev,
        colors: getThemeColors(prev.theme, 'system')
      }));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [config.colorMode, config.theme]);

  const setTheme = (theme: Theme) => {
    localStorage.setItem('bear-ai-theme', theme);
    setConfig(prev => ({
      ...prev,
      theme,
      colors: getThemeColors(theme, prev.colorMode)
    }));
  };

  const setColorMode = (colorMode: ColorMode) => {
    localStorage.setItem('bear-ai-color-mode', colorMode);
    setConfig(prev => ({
      ...prev,
      colorMode,
      colors: getThemeColors(prev.theme, colorMode)
    }));
  };

  const toggleColorMode = () => {
    const modes: ColorMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(config.colorMode);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex] ?? 'system';
    setColorMode(nextMode);
  };

  const value: ThemeContextType = {
    config,
    setTheme,
    setColorMode,
    toggleColorMode
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

function getThemeColors(theme: Theme, colorMode: ColorMode): ThemeColors {
  let baseColors: ThemeColors;
  
  switch (theme) {
    case 'modern':
      baseColors = modernTheme;
      break;
    case 'simple':
      baseColors = simpleTheme;
      break;
    case 'professional':
    default:
      baseColors = professionalTheme;
      break;
  }

  // Handle color mode
  if (colorMode === 'dark' || (colorMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    if (theme === 'professional' || theme === 'simple') {
      // Convert light themes to dark
      return {
        ...baseColors,
        background: '#0F172A',
        surface: '#1E293B',
        text: {
          primary: '#F8FAFC',
          secondary: '#CBD5E1',
          muted: '#64748B'
        },
        border: '#334155'
      };
    }
  }

  return baseColors;
}

function applyThemeToDocument(config: ThemeConfig) {
  const root = document.documentElement;
  
  // Apply CSS custom properties
  root.style.setProperty('--color-primary', config.colors.primary);
  root.style.setProperty('--color-secondary', config.colors.secondary);
  root.style.setProperty('--color-accent', config.colors.accent);
  root.style.setProperty('--color-background', config.colors.background);
  root.style.setProperty('--color-surface', config.colors.surface);
  root.style.setProperty('--color-text-primary', config.colors.text.primary);
  root.style.setProperty('--color-text-secondary', config.colors.text.secondary);
  root.style.setProperty('--color-text-muted', config.colors.text.muted);
  root.style.setProperty('--color-border', config.colors.border);
  root.style.setProperty('--color-success', config.colors.success);
  root.style.setProperty('--color-warning', config.colors.warning);
  root.style.setProperty('--color-error', config.colors.error);
  
  root.style.setProperty('--font-primary', config.fonts.primary);
  root.style.setProperty('--font-secondary', config.fonts.secondary);
  
  root.style.setProperty('--sidebar-collapsed', config.spacing.sidebar.collapsed);
  root.style.setProperty('--sidebar-expanded', config.spacing.sidebar.expanded);
  
  root.style.setProperty('--animation-duration', config.animations.duration);
  root.style.setProperty('--animation-easing', config.animations.easing);
  
  // Apply theme class
  root.className = root.className.replace(/theme-\w+/g, '');
  root.classList.add(`theme-${config.theme}`);
  
  // Apply color mode class
  root.className = root.className.replace(/mode-\w+/g, '');
  const isDark = config.colorMode === 'dark' || 
    (config.colorMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.add(`mode-${isDark ? 'dark' : 'light'}`);
}