/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API listens on loopback only; Vite proxies /api during local development.
// The production (Vercel) build has no API and runs in cached-demo mode.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Needs a running FalkorDB; enabled by `npm run test:graph`.
    exclude: process.env.EZCON_GRAPH_TESTS ? [] : ['tests/graph-falkor.test.ts'],
  },
});
