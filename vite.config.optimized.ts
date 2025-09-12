/**
 * Optimized Vite Configuration for BEAR AI
 * Enhanced build performance, bundle optimization, and development experience
 */

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { buildConfig, paths } from "./config/unified.config";

// Performance optimization plugins
import { analyzer } from 'rollup-plugin-analyzer';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const isTauri = env.TAURI_PLATFORM !== undefined;

  return {
    plugins: [
      react({
        // Optimize React for production
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: isProduction ? [
            ['babel-plugin-styled-components', {
              displayName: false,
              fileName: false
            }]
          ] : []
        }
      }),
      
      // Bundle analyzer for optimization insights
      ...(isProduction ? [
        analyzer({ summaryOnly: true }),
        visualizer({
          filename: 'dist/stats.html',
          open: false,
          gzipSize: true
        })
      ] : [])
    ],

    // Server configuration
    server: {
      port: buildConfig.vite.server.port,
      strictPort: buildConfig.vite.server.strictPort,
      watch: {
        ...buildConfig.vite.server.watch,
        // Optimize watch patterns
        usePolling: false,
        interval: 100
      },
      // Enable CORS for API calls
      cors: true,
      // Proxy API calls in development
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },

    // Build optimization
    build: {
      target: isTauri 
        ? (env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13")
        : ['es2020', 'chrome88', 'safari13'],
      
      // Minification strategy
      minify: isProduction ? 'terser' : false,
      
      // Source maps
      sourcemap: !isProduction || env.BUILD_SOURCEMAP === 'true',
      
      // Output directory
      outDir: paths.dist,
      
      // Rollup options for optimal bundling
      rollupOptions: {
        input: {
          main: resolve(paths.root, "index.html")
        },
        
        output: {
          // Optimize chunk splitting
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('react-router')) {
                return 'router-vendor';
              }
              if (id.includes('@heroicons') || id.includes('lucide-react')) {
                return 'icons-vendor';
              }
              if (id.includes('tailwind') || id.includes('clsx')) {
                return 'styles-vendor';
              }
              return 'vendor';
            }
            
            // App chunks by feature
            if (id.includes('/components/chat/')) {
              return 'chat-feature';
            }
            if (id.includes('/components/legal/')) {
              return 'legal-feature';
            }
            if (id.includes('/components/monitoring/')) {
              return 'monitoring-feature';
            }
            if (id.includes('/services/')) {
              return 'services';
            }
            if (id.includes('/utils/')) {
              return 'utils';
            }
          },
          
          // Optimize chunk names
          chunkFileNames: isProduction
            ? 'assets/js/[name]-[hash].js'
            : 'assets/js/[name].js',
          entryFileNames: isProduction
            ? 'assets/js/[name]-[hash].js'
            : 'assets/js/[name].js',
          assetFileNames: isProduction
            ? 'assets/[ext]/[name]-[hash].[ext]'
            : 'assets/[ext]/[name].[ext]'
        },
        
        // External dependencies (for library builds)
        external: isTauri ? [] : []
      },

      // Terser configuration for production
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug']
        },
        mangle: {
          safari10: true
        },
        format: {
          safari10: true
        }
      } : undefined,

      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Polyfill configuration
      polyfillModulePreload: true
    },

    // Path resolution
    resolve: {
      alias: paths.alias,
      // Optimize resolution
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
      // Reduce resolution overhead
      dedupe: ['react', 'react-dom']
    },

    // CSS configuration
    css: {
      // PostCSS configuration
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer'),
          ...(isProduction ? [
            require('cssnano')({
              preset: ['default', {
                discardComments: { removeAll: true },
                normalizeWhitespace: true
              }]
            })
          ] : [])
        ]
      },
      
      // CSS modules configuration
      modules: {
        generateScopedName: isProduction
          ? '[hash:base64:5]'
          : '[name]__[local]__[hash:base64:5]'
      },
      
      // Preprocessor options
      preprocessorOptions: {
        scss: {
          additionalData: '@import "@/styles/variables.scss";'
        }
      }
    },

    // Define global constants
    define: {
      ...buildConfig.vite.define,
      __DEV__: !isProduction,
      __PROD__: isProduction,
      __TAURI__: isTauri,
      global: 'globalThis'
    },

    // Optimization configuration
    optimizeDeps: {
      // Pre-bundle dependencies
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@heroicons/react/24/outline',
        '@heroicons/react/24/solid',
        'lucide-react',
        'clsx',
        'tailwind-merge'
      ],
      
      // Exclude problematic dependencies
      exclude: [
        '@tauri-apps/api'
      ],
      
      // ESBuild options for dependency optimization
      esbuildOptions: {
        target: 'es2020',
        supported: {
          'top-level-await': true
        }
      }
    },

    // ESBuild configuration
    esbuild: {
      target: 'es2020',
      // Remove console logs in production
      drop: isProduction ? ['console', 'debugger'] : [],
      // Legal comments
      legalComments: 'none'
    },

    // JSON handling
    json: {
      namedExports: true,
      stringify: false
    },

    // Worker configuration
    worker: {
      format: 'es',
      plugins: [react()]
    },

    // Preview configuration
    preview: {
      port: 4173,
      strictPort: true,
      cors: true
    },

    // Environment variables
    envPrefix: ['VITE_', 'BEAR_', 'REACT_APP_'],

    // Logging level
    logLevel: isProduction ? 'warn' : 'info',

    // Clear screen
    clearScreen: !isTauri
  };
});