import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Add bundle analyzer
    mode === 'production' && visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize build configuration
    target: 'esnext',
    rollupOptions: {
      output: {
        // Manual chunks for better caching and loading
        manualChunks: {
          // Core React and dependencies
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI library
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-toast',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-popover'
          ],
          
          // Data fetching and state
          'data-vendor': ['@tanstack/react-query', '@supabase/supabase-js'],
          
          // Icons and utilities
          'utils-vendor': ['lucide-react', 'date-fns', 'clsx', 'class-variance-authority'],
          
          // Chart/visualization libraries
          'chart-vendor': ['recharts'],
          
          // Forms and validation
          'form-vendor': ['react-hook-form', 'zod']
        }
      }
    },
    // Increase chunk size warning limit since we're using manual chunks
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging (optional)
    sourcemap: true,
    // Optimize CSS
    cssCodeSplit: true,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production'
      }
    }
  },
}));
