import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// ---------------------------------------------------------------------------
// Vite configuration — replaces Create React App (react-scripts)
//
// CRA was deprecated in 2023. This config provides equivalent behaviour:
//   • React JSX fast-refresh in dev
//   • Same public folder convention (files served from /public)
//   • Proxy to the Express backend on port 3001 (mirrors CRA "proxy" in package.json)
//   • Output goes to /build (same as CRA) so deployment scripts are unchanged
//   • DOES NOT need --openssl-legacy-provider; Vite uses esbuild internally
//     and is fully compatible with Node 20+
// ---------------------------------------------------------------------------

export default defineConfig({
  plugins: [
    react()
  ],

  // Some legacy CRA files contain JSX inside .js — tell esbuild to parse them as JSX.
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' }
    }
  },

  // Mirror CRA's public folder — static files served at root
  publicDir: 'public',

  // Output to /build to match CRA's default
  build: {
    outDir: 'build',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Chunk splitting: keep vendor libs separate for better caching
        manualChunks: {
          react: ['react', 'react-dom'],
          pdfjs: ['pdfjs-dist'],
          router: ['react-router-dom']
        }
      }
    }
  },

  // Resolve @ alias (common CRA pattern — add if needed)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },

  server: {
    port: 3000,
    // Proxy API calls to the Express server — same as CRA's "proxy" field
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },

  // Vite uses index.html at root (not inside /public). The migration step below
  // copies public/index.html → index.html and replaces %PUBLIC_URL% with ''.
  // See the "vite:migrate" script in package.json.
});
