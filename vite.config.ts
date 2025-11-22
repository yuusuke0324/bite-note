import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    build: {
      target: 'esnext',
      // E2Eテスト時はminifyを無効化（副作用を保持）
      minify: (isProduction && process.env.VITE_E2E_TEST !== 'true') ? 'terser' : false,
      sourcemap: !isProduction,
      rollupOptions: {
        // Tree Shaking設定: E2Eテスト時は無効化（副作用を保持）
        treeshake: process.env.VITE_E2E_TEST === 'true' ? false : true,
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            database: ['dexie', 'dexie-react-hooks'],
            forms: ['react-hook-form', '@hookform/resolvers/zod', 'zod'],
            state: ['zustand', 'immer'],
            routing: ['react-router-dom'],
            utils: ['uuid']
          },
          // Optimize asset file names for caching
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: ({ name }) => {
            if (/\.(gif|jpe?g|png|svg)$/.test(name ?? '')) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/\.css$/.test(name ?? '')) {
              return 'assets/css/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      reportCompressedSize: false, // Faster builds
      // Terser options for production
      terserOptions: isProduction ? {
        compress: {
          // E2Eテスト時はconsoleを残す（Tree Shaking回避のため）
          drop_console: process.env.VITE_E2E_TEST === 'true' ? false : true,
          drop_debugger: true,
        },
      } : undefined,
      // Copy public files (including sw.js and offline.html)
      copyPublicDir: true,
    },
    // Public directory configuration for PWA files
    publicDir: 'public',
    server: {
      port: 3000,
      host: true,
      open: !process.env.CI,
    },
    preview: {
      port: 4173,
      host: true,
    },
    // Environment variables
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
      'import.meta.env.VITE_BUILD_DATE': JSON.stringify(new Date().toISOString()),
      // E2Eテスト用フラグ（環境変数またはenvファイルから読み込み）
      'import.meta.env.VITE_E2E_TEST': JSON.stringify(process.env.VITE_E2E_TEST || env.VITE_E2E_TEST || ''),
    },
    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'dexie',
        'dexie-react-hooks',
        'zustand',
        'react-hook-form',
        '@hookform/resolvers/zod',
        'zod',
        'uuid',
        'immer'
      ],
      exclude: [
        'playwright',
        'playwright-core',
        '@playwright/test',
        'chromium-bidi',
        'fsevents'
      ],
      // Force optimization of these dependencies
      force: isProduction,
    },
    // CSS configuration
    css: {
      devSourcemap: !isProduction,
      modules: {
        localsConvention: 'camelCase',
      },
    },
    // Worker configuration for service worker
    worker: {
      format: 'es',
    },
  };
});
