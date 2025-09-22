/**
 * BEAR AI Unified Configuration System
 * Single source of truth for all application configurations
 */

import { resolve } from 'path';

// Consolidated build configuration
export const buildConfig = {
  // Vite configuration
  vite: {
    plugins: ['@vitejs/plugin-react'],
    server: {
      port: 1420,
      strictPort: true,
      watch: {
        ignored: ['**/src-tauri/**', '**/node_modules/**', '**/dist/**', '**/build/**']
      }
    },
    build: {
      target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
      minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
      sourcemap: !!process.env.TAURI_DEBUG,
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@heroicons/react', 'lucide-react'],
            utils: ['clsx', 'tailwind-merge']
          }
        }
      }
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __ENVIRONMENT__: JSON.stringify(process.env.NODE_ENV || 'development')
    }
  },

  // TypeScript configuration
  typescript: {
    compilerOptions: {
      target: 'ES2020',
      lib: ['dom', 'dom.iterable', 'ES6'],
      allowJs: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noFallthroughCasesInSwitch: true,
      module: 'esnext',
      moduleResolution: 'node',
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      baseUrl: '.',
      paths: {
        '@/*': ['src/*'],
        '@/components/*': ['src/components/*'],
        '@/types/*': ['src/types/*'],
        '@/utils/*': ['src/utils/*'],
        '@/hooks/*': ['src/hooks/*'],
        '@/contexts/*': ['src/contexts/*'],
        '@/services/*': ['src/services/*'],
        '@/styles/*': ['src/styles/*'],
        '@/config/*': ['config/*']
      }
    },
    include: ['src/**/*', 'tests/**/*', 'config/**/*'],
    exclude: ['node_modules', 'build', 'dist', '**/*.js']
  },

  // Testing configuration
  testing: {
    vitest: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      coverage: {
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          'src/reportWebVitals.ts',
          'src-tauri/',
          'dist/',
          'build/',
        ],
        thresholds: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
          }
        }
      },
      deps: {
        inline: ['@tauri-apps/api']
      }
    },

    playwright: {
      testDir: './tests/e2e',
      fullyParallel: true,
      forbidOnly: !!process.env.CI,
      retries: process.env.CI ? 2 : 0,
      workers: process.env.CI ? 1 : undefined,
      reporter: 'html',
      use: {
        baseURL: 'http://localhost:1420',
        trace: 'on-first-retry'
      },
      projects: [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] }
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] }
        }
      ]
    }
  }
};

// Path resolution utilities
export const paths = {
  root: resolve(__dirname, '..'),
  src: resolve(__dirname, '../src'),
  build: resolve(__dirname, '../build'),
  dist: resolve(__dirname, '../dist'),
  public: resolve(__dirname, '../public'),
  tests: resolve(__dirname, '../tests'),
  config: resolve(__dirname, '.'),
  
  // Alias resolution
  alias: {
    '@': resolve(__dirname, '../src'),
    '@components': resolve(__dirname, '../src/components'),
    '@types': resolve(__dirname, '../src/types'),
    '@utils': resolve(__dirname, '../src/utils'),
    '@hooks': resolve(__dirname, '../src/hooks'),
    '@contexts': resolve(__dirname, '../src/contexts'),
    '@services': resolve(__dirname, '../src/services'),
    '@styles': resolve(__dirname, '../src/styles'),
    '@config': resolve(__dirname, '.')
  }
};

// Application configuration
export const appConfig = {
  name: 'BEAR AI',
  version: process.env.npm_package_version || '1.0.0',
  description: 'Legal AI Assistant with comprehensive document analysis and AI-powered assistance',
  
  // Environment detection
  environment: (process.env.NODE_ENV || process.env.BEAR_AI_ENV || 'development') as 'development' | 'production' | 'test',
  
  // Debug settings
  debug: {
    enabled: process.env.NODE_ENV !== 'production',
    verbose: process.env.DEBUG_VERBOSE === 'true',
    performance: process.env.DEBUG_PERFORMANCE === 'true'
  },

  // Feature flags
  features: {
    streaming: true,
    fileUpload: true,
    voiceChat: process.env.NODE_ENV === 'production',
    gpu: true,
    tauri: process.env.TAURI_PLATFORM !== undefined,
    telemetry: process.env.NODE_ENV === 'production'
  },

  // API configuration
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // Performance thresholds
  performance: {
    bundleSize: {
      warning: 500000, // 500KB
      error: 1000000   // 1MB
    },
    render: {
      warning: 100,    // 100ms
      error: 250       // 250ms
    },
    memory: {
      warning: 50,     // 50MB
      error: 100       // 100MB
    }
  }
};

// Theme configuration
export const themeConfig = {
  colors: {
    'bear-navy': {
      DEFAULT: '#1B365C',
      light: '#2A4A73',
      dark: '#0F1F3A',
    },
    'bear-green': {
      DEFAULT: '#059669',
      light: '#10B981',
      dark: '#047857',
    },
    'bear-red': {
      DEFAULT: '#DC2626',
      light: '#EF4444',
      dark: '#B91C1C',
    },
    'bear-gray': {
      DEFAULT: '#6B7280',
      light: '#9CA3AF',
      dark: '#4B5563',
    }
  },
  
  fontFamily: {
    inter: ['Inter', 'system-ui', 'sans-serif'],
    'inter-tight': ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
    primary: ['Inter', 'system-ui', 'sans-serif'],
    secondary: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif']
  },
  
  spacing: {
    '18': '4.5rem',
    '88': '22rem',
  },
  
  animation: {
    'fade-in': 'fadeIn 0.2s ease-in-out',
    'slide-up': 'slideUp 0.3s ease-out',
    'bounce-gentle': 'bounceGentle 2s infinite',
  },
  
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    slideUp: {
      '0%': { transform: 'translateY(10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    bounceGentle: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-5px)' },
    },
  },
  
  boxShadow: {
    'legal': '0 4px 6px -1px rgba(27, 54, 92, 0.1), 0 2px 4px -1px rgba(27, 54, 92, 0.06)',
    'legal-lg': '0 10px 15px -3px rgba(27, 54, 92, 0.1), 0 4px 6px -2px rgba(27, 54, 92, 0.05)',
  },
  
  backgroundImage: {
    'gradient-legal': 'linear-gradient(135deg, #1B365C 0%, #059669 100%)',
    'gradient-legal-light': 'linear-gradient(135deg, #2A4A73 0%, #10B981 100%)',
  }
};

// Export unified configuration
export default {
  build: buildConfig,
  paths,
  app: appConfig,
  theme: themeConfig
};