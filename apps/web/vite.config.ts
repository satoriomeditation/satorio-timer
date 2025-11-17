import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // two levels up from apps/web to reach /packages/core
      '@core': path.resolve(__dirname, '../../packages/core'),
    },
  },
  server: {
    fs: {
      // Allow Vite to serve files from BOTH the web app AND the shared packages
      allow: [
        path.resolve(__dirname),                      // apps/web (this project root)
        path.resolve(__dirname, '../../packages'),    // packages/*
      ],
    },
  },
})
